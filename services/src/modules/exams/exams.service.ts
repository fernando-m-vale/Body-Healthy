import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { createUploadUrl as signUploadUrl } from "../../lib/s3";
import { calculateTrend } from "../../lib/trend";
import type { RegisterExamBody, ConfirmExamBody } from "./exams.schemas";

export class ExamNotFoundError extends Error {}
export class ExamNotPendingConfirmationError extends Error {}
export class MarkerListMismatchError extends Error {}
export class ExamNotDiscardableError extends Error {}

const DISCARDABLE_STATUSES = ["pending_confirmation", "failed"];

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function createExamUploadUrl(bucket: string, userId: string, fileType: string, contentType: string) {
  const extension = CONTENT_TYPE_EXTENSION[contentType] ?? "bin";
  const fileKey = `lab-exams/${userId}/${randomUUID()}.${extension}`;
  const uploadUrl = await signUploadUrl(bucket, fileKey, contentType);
  return { uploadUrl, fileKey };
}

export function registerExam(prisma: PrismaClient, userId: string, body: RegisterExamBody) {
  return prisma.labExam.create({
    data: {
      userId,
      fileUrl: body.fileKey,
      fileType: body.fileType,
      labSource: body.labSource ?? null,
      status: "uploaded",
    },
  });
}

export function getExam(prisma: PrismaClient, userId: string, examId: string) {
  return prisma.labExam.findFirst({
    where: { id: examId, userId },
    include: { markers: true },
  });
}

export function listExams(prisma: PrismaClient, userId: string) {
  return prisma.labExam.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function confirmExam(
  prisma: PrismaClient,
  userId: string,
  examId: string,
  body: ConfirmExamBody,
) {
  const exam = await prisma.labExam.findFirst({
    where: { id: examId, userId },
    include: { markers: true },
  });

  if (!exam) {
    throw new ExamNotFoundError();
  }
  if (exam.status !== "pending_confirmation") {
    throw new ExamNotPendingConfirmationError();
  }

  const existingIds = new Set(exam.markers.map((m) => m.id));
  const submittedIds = new Set(body.markers.map((m) => m.id));
  if (existingIds.size !== submittedIds.size || [...existingIds].some((id) => !submittedIds.has(id))) {
    throw new MarkerListMismatchError();
  }

  // Exame confirmado anterior mais recente do mesmo usuário (RF07) — comparação por
  // nome exato de marcador, calculada após a confirmação (spec v3, seção 4 passo 7).
  const previousExam = await prisma.labExam.findFirst({
    where: { userId, status: "confirmed", id: { not: examId } },
    orderBy: { confirmedAt: "desc" },
    include: { markers: true },
  });
  const previousByName = new Map(previousExam?.markers.map((m) => [m.name, m]) ?? []);

  const markersById = new Map(exam.markers.map((m) => [m.id, m]));

  await prisma.$transaction([
    ...body.markers.map((submitted) => {
      const original = markersById.get(submitted.id)!;
      const userCorrected =
        submitted.value !== original.value ||
        submitted.unit !== original.unit ||
        submitted.referenceMin !== original.referenceMin ||
        submitted.referenceMax !== original.referenceMax;

      // Regra de segurança obrigatória (spec v3, seção 4 passo 7 / seção 6): nome igual
      // mas unidade diferente nunca compara valor bruto — trend fica null. Não converter.
      const previousMarker = previousByName.get(original.name);
      const trend =
        previousMarker && previousMarker.unit === submitted.unit
          ? calculateTrend(submitted.value, previousMarker.value)
          : null;

      return prisma.labMarker.update({
        where: { id: submitted.id },
        data: {
          value: submitted.value,
          unit: submitted.unit,
          referenceMin: submitted.referenceMin,
          referenceMax: submitted.referenceMax,
          userCorrected,
          trend,
        },
      });
    }),
    prisma.labExam.update({
      where: { id: examId },
      data: { status: "confirmed", confirmedAt: new Date() },
    }),
  ]);

  return getExam(prisma, userId, examId);
}

// Descarte (spec v4, seção 4 passo 7): alternativa à confirmação a partir de
// "pending_confirmation" ou "failed" — abandonar uma tentativa já feita
// (extração muito errada, documento errado enviado), diferente de
// simplesmente não subir nada (RF04a já cobre isso antes de chegar aqui).
// Nunca a partir de "confirmed" (seção 6) — uma vez confirmado, só sai via
// exclusão de conta (Spec 08). Sem campo de comentário, diferente da Spec 02.
export async function discardExam(prisma: PrismaClient, userId: string, examId: string) {
  const exam = await prisma.labExam.findFirst({ where: { id: examId, userId } });
  if (!exam) {
    throw new ExamNotFoundError();
  }
  if (!DISCARDABLE_STATUSES.includes(exam.status)) {
    throw new ExamNotDiscardableError();
  }

  return prisma.labExam.update({
    where: { id: examId },
    data: { status: "discarded" },
  });
}
