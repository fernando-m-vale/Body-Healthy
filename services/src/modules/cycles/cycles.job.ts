import type { FastifyBaseLogger } from "fastify";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { aggregateContext } from "./cycles.service";
import { generatePlan, regeneratePlan } from "./generation.service";
import { containsMedicationAdjustmentLanguage } from "./safety-check";
import type { GenerationResult } from "./generation.schema";

// Limite de tentativas da checagem de segurança e de aderência a
// weeklyTrainingDays (Spec 05, seção 9 / v6 seção 5) — decisão registrada
// no planejamento desta tarefa: 2 tentativas, para não entrar em loop
// infinito se a IA insistir em linguagem de ajuste de medicação ou não
// respeitar o número de dias pedido.
const MAX_SAFETY_ATTEMPTS = 2;

function textsToCheck(result: GenerationResult): string[] {
  const phaseTexts = (result.phases ?? []).flatMap((phase) => [phase.title, phase.focusText]);
  return [result.actionPlanText, ...phaseTexts];
}

function countDistinctDayLabels(result: GenerationResult): number {
  return new Set(result.workoutDays.map((day) => day.dayLabel)).size;
}

function matchesRequestedTrainingDays(result: GenerationResult, weeklyTrainingDays: number | null): boolean {
  return weeklyTrainingDays == null || countDistinctDayLabels(result) === weeklyTrainingDays;
}

async function generateWithValidation(
  attempt: (attemptNumber: number) => Promise<GenerationResult>,
  weeklyTrainingDays: number | null,
  logger: FastifyBaseLogger,
  cycleId: string,
): Promise<GenerationResult | null> {
  for (let i = 1; i <= MAX_SAFETY_ATTEMPTS; i++) {
    const result = await attempt(i);
    const safetyOk = !containsMedicationAdjustmentLanguage(textsToCheck(result));
    const dayCountOk = matchesRequestedTrainingDays(result, weeklyTrainingDays);

    if (safetyOk && dayCountOk) {
      return result;
    }
    if (!safetyOk) {
      logger.warn(
        { cycleId, attempt: i },
        "Texto gerado contém linguagem de ajuste de medicação — descartado, tentando novamente",
      );
    }
    if (!dayCountOk) {
      logger.warn(
        { cycleId, attempt: i, weeklyTrainingDays, got: countDistinctDayLabels(result) },
        "Número de dias gerados não bate com weeklyTrainingDays — descartado, tentando novamente",
      );
    }
  }
  return null;
}

interface PersistGoals {
  dailyCalorieGoal: number | null;
  proteinGramsGoal: number | null;
  carbGramsGoal: number | null;
  fatGramsGoal: number | null;
}

async function persistResult(
  prisma: PrismaClient,
  cycleId: string,
  result: GenerationResult,
  goals: PersistGoals,
  contextSnapshot: Record<string, unknown>,
  previousExerciseNames: Set<string> | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.workoutExercise.deleteMany({ where: { workoutPlan: { healthCycleId: cycleId } } });
    await tx.workoutPlan.deleteMany({ where: { healthCycleId: cycleId } });
    await tx.cyclePhase.deleteMany({ where: { healthCycleId: cycleId } });

    await tx.workoutPlan.create({
      data: {
        healthCycleId: cycleId,
        userEdited: false,
        exercises: {
          create: result.workoutDays.flatMap((day) =>
            day.exercises.map((exercise) => ({
              dayLabel: day.dayLabel,
              orderIndex: exercise.orderIndex,
              exerciseName: exercise.exerciseName,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds,
              notes: exercise.notes,
              technique: exercise.technique,
              // isNew (Spec 05, seção 5.4) — SEMPRE calculado em código, nunca
              // pela IA. Sem ciclo anterior gerado (previousExerciseNames ===
              // null), nunca true.
              isNew: previousExerciseNames != null && !previousExerciseNames.has(exercise.exerciseName),
            })),
          ),
        },
      },
    });

    if (result.phases && result.phases.length > 0) {
      await tx.cyclePhase.createMany({
        data: result.phases.map((phase) => ({
          healthCycleId: cycleId,
          orderIndex: phase.orderIndex,
          phaseLabel: phase.phaseLabel,
          title: phase.title,
          focusText: phase.focusText,
        })),
      });
    }

    await tx.healthCycle.update({
      where: { id: cycleId },
      data: {
        status: "generated",
        actionPlanText: result.actionPlanText,
        dailyCalorieGoal: goals.dailyCalorieGoal,
        proteinGramsGoal: goals.proteinGramsGoal,
        carbGramsGoal: goals.carbGramsGoal,
        fatGramsGoal: goals.fatGramsGoal,
        contextSnapshot: contextSnapshot as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
    });
  });
}

// Job assíncrono in-process (mesmo padrão fire-and-forget das Specs 01/02) —
// geração inicial do ciclo.
export async function runGenerationJob(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  cycleId: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    const cycle = await prisma.healthCycle.findUniqueOrThrow({ where: { id: cycleId } });
    await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "generating" } });

    const { aiContext, redactedSnapshot, dailyCalorieGoal, proteinGramsGoal, carbGramsGoal, fatGramsGoal, previousExerciseNames } =
      await aggregateContext(
        prisma,
        keyProvider,
        userId,
        cycle.objectiveCategory,
        cycle.weeklyTrainingDays,
        cycleId,
      );

    const result = await generateWithValidation(
      () => generatePlan(cycle.objectiveText, aiContext),
      cycle.weeklyTrainingDays,
      logger,
      cycleId,
    );

    if (!result) {
      await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } });
      return;
    }

    await persistResult(
      prisma,
      cycleId,
      result,
      { dailyCalorieGoal, proteinGramsGoal, carbGramsGoal, fatGramsGoal },
      redactedSnapshot,
      previousExerciseNames,
    );
  } catch (err) {
    logger.error({ err, cycleId }, "Falha na geração de plano/treino");
    await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } }).catch((updateErr) => {
      logger.error({ err: updateErr, cycleId }, "Falha ao marcar ciclo como failed");
    });
  }
}

// Regeneração por feedback (Spec 05, seção 6 passo 6). O contexto é
// reagregado (não lido do contextSnapshot persistido, que tem prescrições
// redigidas por segurança) — funcionalmente "o mesmo contexto original",
// decidido durante a implementação desta tarefa: reler o snapshot persistido
// perderia o texto de prescrição que a IA precisa ver.
export async function runRegenerationJob(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  cycleId: string,
  feedbackText: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    const cycle = await prisma.healthCycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { workoutPlan: { include: { exercises: true } }, phases: { orderBy: { orderIndex: "asc" } } },
    });

    const { aiContext, redactedSnapshot, dailyCalorieGoal, proteinGramsGoal, carbGramsGoal, fatGramsGoal, previousExerciseNames } =
      await aggregateContext(
        prisma,
        keyProvider,
        userId,
        cycle.objectiveCategory,
        cycle.weeklyTrainingDays,
        cycleId,
      );

    const currentWorkoutDays: GenerationResult["workoutDays"] = [];
    for (const exercise of cycle.workoutPlan?.exercises ?? []) {
      let day = currentWorkoutDays.find((d) => d.dayLabel === exercise.dayLabel);
      if (!day) {
        day = { dayLabel: exercise.dayLabel, exercises: [] };
        currentWorkoutDays.push(day);
      }
      day.exercises.push({
        orderIndex: exercise.orderIndex,
        exerciseName: exercise.exerciseName,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
        technique: exercise.technique,
      });
    }

    const currentPhases: GenerationResult["phases"] = cycle.phases.map((phase) => ({
      orderIndex: phase.orderIndex,
      phaseLabel: phase.phaseLabel,
      title: phase.title,
      focusText: phase.focusText,
    }));

    const result = await generateWithValidation(
      () =>
        regeneratePlan(
          cycle.objectiveText,
          aiContext,
          cycle.actionPlanText ?? "",
          currentWorkoutDays,
          currentPhases,
          feedbackText,
        ),
      cycle.weeklyTrainingDays,
      logger,
      cycleId,
    );

    if (!result) {
      await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } });
      return;
    }

    await persistResult(
      prisma,
      cycleId,
      result,
      { dailyCalorieGoal, proteinGramsGoal, carbGramsGoal, fatGramsGoal },
      redactedSnapshot,
      previousExerciseNames,
    );
  } catch (err) {
    logger.error({ err, cycleId }, "Falha na regeneração de plano/treino");
    await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } }).catch((updateErr) => {
      logger.error({ err: updateErr, cycleId }, "Falha ao marcar ciclo como failed");
    });
  }
}
