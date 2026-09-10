import type { PrismaClient } from "../../generated/prisma/client";
import { getActiveCycleId } from "../cycles/cycles.service";
import type { UpsertSetBody } from "./workout-sessions.schemas";

export class SessionNotFoundError extends Error {}
export class SessionFinishedError extends Error {}
export class ActiveSessionExistsError extends Error {
  constructor(public activeSessionId: string) {
    super("Já existe uma sessão de treino em andamento");
  }
}

export function getActiveSession(prisma: PrismaClient, userId: string) {
  return prisma.workoutSession.findFirst({
    where: { userId, finishedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

// Início de sessão (Spec 09, seção 5.1) — só uma sessão em aberto por vez;
// tentar iniciar outra com uma já em aberto não cria duplicata, devolve a
// existente pro cliente oferecer retomar (guarda de servidor além da
// verificação que o app já faz antes de listar os dias).
export async function startSession(prisma: PrismaClient, userId: string, dayLabel: string | null) {
  const active = await getActiveSession(prisma, userId);
  if (active) {
    throw new ActiveSessionExistsError(active.id);
  }

  const healthCycleId = await getActiveCycleId(prisma, userId);

  return prisma.workoutSession.create({
    data: { userId, healthCycleId, dayLabel },
  });
}

async function findSessionOrThrow(prisma: PrismaClient, userId: string, sessionId: string) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) {
    throw new SessionNotFoundError();
  }
  return session;
}

// Exercícios do dia (technique/notes/restSeconds/sets/reps já vindos do
// WorkoutExercise, Spec 05) — usa o healthCycleId capturado na própria
// sessão ao iniciar, não o ciclo "atual" do usuário (pode ter mudado desde
// então), pra manter a sessão consistente com o plano que ela referenciava.
async function findExercisesForSession(
  prisma: PrismaClient,
  healthCycleId: string | null,
  dayLabel: string | null,
) {
  if (!healthCycleId || !dayLabel) return [];

  const workoutPlan = await prisma.workoutPlan.findUnique({
    where: { healthCycleId },
    include: { exercises: { where: { dayLabel }, orderBy: { orderIndex: "asc" } } },
  });

  return workoutPlan?.exercises ?? [];
}

export async function getSessionDetail(prisma: PrismaClient, userId: string, sessionId: string) {
  const session = await findSessionOrThrow(prisma, userId, sessionId);
  const [exercises, setLogs] = await Promise.all([
    findExercisesForSession(prisma, session.healthCycleId, session.dayLabel),
    prisma.workoutSetLog.findMany({
      where: { workoutSessionId: sessionId },
      orderBy: [{ exerciseOrderIndex: "asc" }, { setNumber: "asc" }],
    }),
  ]);

  return { ...session, exercises, setLogs };
}

export function listSessions(prisma: PrismaClient, userId: string) {
  return prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: { setLogs: { orderBy: [{ exerciseOrderIndex: "asc" }, { setNumber: "asc" }] } },
  });
}

// Upsert de série (Spec 09, seção 5.3) — chave natural é
// (workoutSessionId, exerciseOrderIndex, setNumber); cada marcação de
// "concluída" dispara isso imediatamente, não só no fim da sessão.
export async function upsertSet(prisma: PrismaClient, userId: string, sessionId: string, body: UpsertSetBody) {
  const session = await findSessionOrThrow(prisma, userId, sessionId);
  if (session.finishedAt) {
    throw new SessionFinishedError();
  }

  const data = {
    workoutExerciseId: body.workoutExerciseId ?? null,
    exerciseNameFreeText: body.exerciseNameFreeText ?? null,
    weightKg: body.weightKg ?? null,
    repsCompleted: body.repsCompleted ?? null,
    completed: body.completed ?? false,
    notes: body.notes ?? null,
  };

  return prisma.workoutSetLog.upsert({
    where: {
      workoutSessionId_exerciseOrderIndex_setNumber: {
        workoutSessionId: sessionId,
        exerciseOrderIndex: body.exerciseOrderIndex,
        setNumber: body.setNumber,
      },
    },
    create: {
      workoutSessionId: sessionId,
      exerciseOrderIndex: body.exerciseOrderIndex,
      setNumber: body.setNumber,
      ...data,
    },
    update: data,
  });
}

// Finalização (Spec 09, seção 5.3) — calcula durationSeconds a partir do
// startedAt real, nunca recalculado depois. Sessão sem nenhuma série
// concluída ainda pode ser finalizada (treino curto/interrompido não é
// erro).
export async function finishSession(prisma: PrismaClient, userId: string, sessionId: string) {
  const session = await findSessionOrThrow(prisma, userId, sessionId);
  if (session.finishedAt) {
    throw new SessionFinishedError();
  }

  const finishedAt = new Date();
  const durationSeconds = Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000);

  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { finishedAt, durationSeconds },
  });
}
