import type { FastifyBaseLogger } from "fastify";
import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { aggregateContext } from "./cycles.service";
import { generatePlan, regeneratePlan } from "./generation.service";
import { containsMedicationAdjustmentLanguage } from "./safety-check";
import type { GenerationResult } from "./generation.schema";

// Limite de tentativas da checagem de segurança (Spec 05, seção 9) — decisão
// registrada no planejamento desta tarefa: 2 tentativas, para não entrar em
// loop infinito se a IA insistir em linguagem de ajuste de medicação.
const MAX_SAFETY_ATTEMPTS = 2;

async function generateWithSafetyCheck(
  attempt: (attemptNumber: number) => Promise<GenerationResult>,
  logger: FastifyBaseLogger,
  cycleId: string,
): Promise<GenerationResult | null> {
  for (let i = 1; i <= MAX_SAFETY_ATTEMPTS; i++) {
    const result = await attempt(i);
    if (!containsMedicationAdjustmentLanguage(result.actionPlanText)) {
      return result;
    }
    logger.warn(
      { cycleId, attempt: i },
      "Texto gerado contém linguagem de ajuste de medicação — descartado, tentando novamente",
    );
  }
  return null;
}

async function persistResult(
  prisma: PrismaClient,
  cycleId: string,
  result: GenerationResult,
  dailyCalorieGoal: number | null,
  contextSnapshot: Record<string, unknown>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.workoutExercise.deleteMany({ where: { workoutPlan: { healthCycleId: cycleId } } });
    await tx.workoutPlan.deleteMany({ where: { healthCycleId: cycleId } });

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
            })),
          ),
        },
      },
    });

    await tx.healthCycle.update({
      where: { id: cycleId },
      data: {
        status: "generated",
        actionPlanText: result.actionPlanText,
        dailyCalorieGoal,
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

    const { aiContext, redactedSnapshot, dailyCalorieGoal } = await aggregateContext(
      prisma,
      keyProvider,
      userId,
      cycle.objectiveCategory,
      cycleId,
    );

    const result = await generateWithSafetyCheck(
      () => generatePlan(cycle.objectiveText, aiContext),
      logger,
      cycleId,
    );

    if (!result) {
      await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } });
      return;
    }

    await persistResult(prisma, cycleId, result, dailyCalorieGoal, redactedSnapshot);
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
      include: { workoutPlan: { include: { exercises: true } } },
    });

    const { aiContext, redactedSnapshot, dailyCalorieGoal } = await aggregateContext(
      prisma,
      keyProvider,
      userId,
      cycle.objectiveCategory,
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
      });
    }

    const result = await generateWithSafetyCheck(
      () =>
        regeneratePlan(
          cycle.objectiveText,
          aiContext,
          cycle.actionPlanText ?? "",
          currentWorkoutDays,
          feedbackText,
        ),
      logger,
      cycleId,
    );

    if (!result) {
      await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } });
      return;
    }

    await persistResult(prisma, cycleId, result, dailyCalorieGoal, redactedSnapshot);
  } catch (err) {
    logger.error({ err, cycleId }, "Falha na regeneração de plano/treino");
    await prisma.healthCycle.update({ where: { id: cycleId }, data: { status: "failed" } }).catch((updateErr) => {
      logger.error({ err: updateErr, cycleId }, "Falha ao marcar ciclo como failed");
    });
  }
}
