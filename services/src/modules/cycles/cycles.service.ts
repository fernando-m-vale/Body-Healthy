import type { PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { decryptField } from "../../lib/field-encryption";
import { logAccess } from "../../lib/audit-log";
import {
  calculateDailyCalorieGoal,
  calculateMacroGoals,
  calculateAgeYears,
  type ActivityLevel,
  type BiologicalSexForCalc,
  type ObjectiveCategory,
} from "../../lib/calorie";
import { listEntriesWithTrend } from "../bioimpedance/bioimpedance.service";
import { calculateAdherenceRate } from "../check-ins/adherence";
import type { CreateCycleBody, UpdateExerciseBody } from "./cycles.schemas";
import type { AIContext } from "./context.types";

export class CycleNotFoundError extends Error {}
export class ExerciseNotFoundError extends Error {}
export class CycleGeneratingError extends Error {}

export function createCycle(prisma: PrismaClient, userId: string, body: CreateCycleBody) {
  return prisma.healthCycle.create({
    data: {
      userId,
      objectiveText: body.objectiveText,
      objectiveCategory: body.objectiveCategory ?? null,
      weeklyTrainingDays: body.weeklyTrainingDays ?? null,
      nextCycleExpectedDate: body.nextCycleExpectedDate ? new Date(body.nextCycleExpectedDate) : null,
      status: "objective_set",
    },
  });
}

export function getCycle(prisma: PrismaClient, userId: string, cycleId: string) {
  return prisma.healthCycle.findFirst({
    where: { id: cycleId, userId },
    include: {
      workoutPlan: { include: { exercises: { orderBy: [{ dayLabel: "asc" }, { orderIndex: "asc" }] } } },
      phases: { orderBy: { orderIndex: "asc" } },
    },
  });
}

export function listCycles(prisma: PrismaClient, userId: string) {
  return prisma.healthCycle.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

// "Ciclo ativo" (Spec 06, usado por check-ins/calorie-logs para preencher
// healthCycleId no momento do registro): o HealthCycle mais recente do
// usuário já concluído com sucesso — um ciclo ainda "generating" ou que
// falhou não conta como ativo pro usuário (decisão registrada no
// planejamento da Spec 06).
export function getActiveCycleId(prisma: PrismaClient, userId: string): Promise<string | null> {
  return prisma.healthCycle
    .findFirst({ where: { userId, status: "generated" }, orderBy: { createdAt: "desc" }, select: { id: true } })
    .then((cycle) => cycle?.id ?? null);
}

export async function updateNextCycleDate(
  prisma: PrismaClient,
  userId: string,
  cycleId: string,
  nextCycleExpectedDate: string | null,
) {
  const cycle = await prisma.healthCycle.findFirst({ where: { id: cycleId, userId } });
  if (!cycle) {
    throw new CycleNotFoundError();
  }

  return prisma.healthCycle.update({
    where: { id: cycleId },
    data: { nextCycleExpectedDate: nextCycleExpectedDate ? new Date(nextCycleExpectedDate) : null },
  });
}

interface AggregatedContext {
  aiContext: AIContext;
  redactedSnapshot: Record<string, unknown>;
  dailyCalorieGoal: number | null;
  proteinGramsGoal: number | null;
  carbGramsGoal: number | null;
  fatGramsGoal: number | null;
  // Nomes de exercício do ciclo gerado anterior, pra calcular isNew (seção
  // 5.4) em código, nunca pela IA. null = não existe ciclo anterior gerado
  // (isNew sempre false); Set (mesmo vazio) = existe ciclo anterior.
  previousExerciseNames: Set<string> | null;
}

// Agregação de contexto (Spec 05, seção 5) — só dado confirmado/revisado
// entra; prescrições decifradas só nesta estrutura em memória (AIContext),
// nunca no redactedSnapshot que é persistido.
export async function aggregateContext(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  objectiveCategory: string | null,
  weeklyTrainingDays: number | null,
  cycleId: string,
): Promise<AggregatedContext> {
  const [labExams, imagingReports, bioimpedance, prescriptions, profile, previousCycle] = await Promise.all([
    prisma.labExam.findMany({ where: { userId, status: "confirmed" }, include: { markers: true } }),
    prisma.imagingReport.findMany({ where: { userId, status: "reviewed", userFlagged: false } }),
    listEntriesWithTrend(prisma, userId),
    prisma.prescriptionEntry.findMany({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.healthCycle.findFirst({
      where: { userId, status: "generated", id: { not: cycleId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, workoutPlan: { select: { exercises: { select: { exerciseName: true } } } } },
    }),
  ]);

  const previousExerciseNames: Set<string> | null = previousCycle
    ? new Set(previousCycle.workoutPlan?.exercises.map((e) => e.exerciseName) ?? [])
    : null;

  // Taxa de adesão do ciclo anterior (Spec 06, seção 6 — RF18). Ignora
  // semanas sem check-in preenchido; exige 2+ check-ins pra entrar no
  // contexto. Não precisa de redação como a prescrição: é só um número,
  // não identifica nada sensível.
  const adherenceRate = await calculateAdherenceRate(prisma, userId, previousCycle?.id ?? null);

  // Leitura de prescrição também gera log de auditoria (regra geral estabelecida
  // na Spec 04) — fail-closed: se o log não gravar, a agregação (e a geração)
  // não prossegue.
  if (prescriptions.length > 0) {
    await logAccess(prisma, { userId, accessedBy: userId, resource: `PrescriptionEntry:cycle-context:${cycleId}` });
  }

  const decryptedPrescriptions = await Promise.all(
    prescriptions.map(async (p) => ({
      name: await decryptField(p.nameEncrypted, keyProvider),
      category: p.category,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate ? p.endDate.toISOString() : null,
      notes: p.notesEncrypted ? await decryptField(p.notesEncrypted, keyProvider) : null,
    })),
  );

  // Meta calórica (seção 5.1) — usa o registro de bioimpedância mais recente
  // que tenha peso preenchido.
  const mostRecentWeightEntry = [...bioimpedance].reverse().find((b) => b.weightKg !== null);

  let dailyCalorieGoal: number | null = null;
  let proteinGramsGoal: number | null = null;
  let carbGramsGoal: number | null = null;
  let fatGramsGoal: number | null = null;
  let ageYears: number | null = null;

  if (profile?.birthDate) {
    ageYears = calculateAgeYears(profile.birthDate);
  }

  if (
    profile?.heightCm != null &&
    profile.birthDate != null &&
    profile.activityLevel != null &&
    mostRecentWeightEntry?.weightKg != null
  ) {
    dailyCalorieGoal = calculateDailyCalorieGoal({
      weightKg: mostRecentWeightEntry.weightKg,
      heightCm: profile.heightCm,
      birthDate: profile.birthDate,
      biologicalSexForCalc: (profile.biologicalSexForCalc as BiologicalSexForCalc) ?? "prefiro_nao_informar",
      activityLevel: profile.activityLevel as ActivityLevel,
      objectiveCategory: objectiveCategory as ObjectiveCategory | null,
    });

    const macros = calculateMacroGoals(
      dailyCalorieGoal,
      mostRecentWeightEntry.weightKg,
      objectiveCategory as ObjectiveCategory | null,
    );
    proteinGramsGoal = macros.proteinGramsGoal;
    carbGramsGoal = macros.carbGramsGoal;
    fatGramsGoal = macros.fatGramsGoal;
  }

  const aiContext: AIContext = {
    labExams: labExams.map((exam) => ({
      examDate: exam.examDate ? exam.examDate.toISOString() : null,
      markers: exam.markers.map((m) => ({
        name: m.name,
        value: m.value,
        unit: m.unit,
        referenceMin: m.referenceMin,
        referenceMax: m.referenceMax,
        trend: m.trend,
      })),
    })),
    imagingReports: imagingReports.map((r) => ({
      examDate: r.examDate ? r.examDate.toISOString() : null,
      reportType: r.reportType,
      summary: r.aiSummary ?? "",
    })),
    bioimpedance: bioimpedance.map((b) => ({
      measuredAt: b.measuredAt.toISOString(),
      weightKg: b.weightKg,
      bodyFatPercent: b.bodyFatPercent,
      leanMassKg: b.leanMassKg,
      trend: b.trend,
    })),
    prescriptions: decryptedPrescriptions,
    profile: profile
      ? {
          heightCm: profile.heightCm,
          ageYears,
          biologicalSexForCalc: profile.biologicalSexForCalc,
          activityLevel: profile.activityLevel,
        }
      : null,
    dailyCalorieGoal,
    proteinGramsGoal,
    carbGramsGoal,
    fatGramsGoal,
    weeklyTrainingDays,
    adherenceRate,
  };

  const redactedSnapshot: Record<string, unknown> = {
    labExams: aiContext.labExams,
    imagingReports: aiContext.imagingReports,
    bioimpedance: aiContext.bioimpedance,
    prescriptionsRedacted:
      prescriptions.length > 0
        ? `${prescriptions.length} prescrição(ões) incluída(s) como contexto histórico — conteúdo não persistido por segurança`
        : "nenhuma prescrição no contexto",
    profile: aiContext.profile,
    dailyCalorieGoal,
    proteinGramsGoal,
    carbGramsGoal,
    fatGramsGoal,
    weeklyTrainingDays,
    adherenceRate,
  };

  return {
    aiContext,
    redactedSnapshot,
    dailyCalorieGoal,
    proteinGramsGoal,
    carbGramsGoal,
    fatGramsGoal,
    previousExerciseNames,
  };
}

export async function updateExercise(
  prisma: PrismaClient,
  userId: string,
  cycleId: string,
  exerciseId: string,
  body: UpdateExerciseBody,
) {
  const exercise = await prisma.workoutExercise.findFirst({
    where: { id: exerciseId, workoutPlan: { healthCycleId: cycleId, healthCycle: { userId } } },
  });
  if (!exercise) {
    throw new ExerciseNotFoundError();
  }

  const [updated] = await prisma.$transaction([
    prisma.workoutExercise.update({
      where: { id: exerciseId },
      data: {
        ...(body.dayLabel !== undefined && { dayLabel: body.dayLabel }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
        ...(body.exerciseName !== undefined && { exerciseName: body.exerciseName }),
        ...(body.sets !== undefined && { sets: body.sets }),
        ...(body.reps !== undefined && { reps: body.reps }),
        ...(body.restSeconds !== undefined && { restSeconds: body.restSeconds }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.technique !== undefined && { technique: body.technique }),
      },
    }),
    prisma.workoutPlan.update({
      where: { healthCycleId: cycleId },
      data: { userEdited: true },
    }),
  ]);

  return updated;
}

export async function createFeedback(
  prisma: PrismaClient,
  userId: string,
  cycleId: string,
  feedbackText: string,
) {
  const cycle = await prisma.healthCycle.findFirst({ where: { id: cycleId, userId } });
  if (!cycle) {
    throw new CycleNotFoundError();
  }
  if (cycle.status === "generating") {
    throw new CycleGeneratingError();
  }

  const [feedback] = await prisma.$transaction([
    prisma.cycleFeedback.create({
      data: { healthCycleId: cycleId, feedbackText, triggeredRegeneration: true },
    }),
    prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "generating" } }),
  ]);

  return feedback;
}
