import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { createUploadUrl as signUploadUrl } from "../../lib/s3";
import type { RegisterReportBody, ReviewReportBody } from "./imaging-reports.schemas";

export class ReportNotFoundError extends Error {}
export class InvalidReportStateError extends Error {}

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const RETRYABLE_STATUSES = ["pending_review", "failed"];
const DISCARDABLE_STATUSES = ["pending_review", "failed"];

export async function createReportUploadUrl(bucket: string, userId: string, fileType: string, contentType: string) {
  const extension = CONTENT_TYPE_EXTENSION[contentType] ?? "bin";
  const fileKey = `imaging-reports/${userId}/${randomUUID()}.${extension}`;
  const uploadUrl = await signUploadUrl(bucket, fileKey, contentType);
  return { uploadUrl, fileKey };
}

export function registerReport(prisma: PrismaClient, userId: string, body: RegisterReportBody) {
  return prisma.imagingReport.create({
    data: {
      userId,
      fileUrl: body.fileKey,
      fileType: body.fileType,
      reportType: body.reportType ?? null,
      status: "uploaded",
    },
  });
}

export function getReport(prisma: PrismaClient, userId: string, reportId: string) {
  return prisma.imagingReport.findFirst({ where: { id: reportId, userId } });
}

export function listReports(prisma: PrismaClient, userId: string) {
  return prisma.imagingReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Revisão (Spec 02, seção 5 passo 5). Sinalizar (userFlagged: true) NÃO muda o
// status — permanece "pending_review" até o usuário escolher retry/discard
// (seção 7: fechar o app no meio não perde o estado de sinalização).
export async function reviewReport(
  prisma: PrismaClient,
  userId: string,
  reportId: string,
  body: ReviewReportBody,
) {
  const report = await prisma.imagingReport.findFirst({ where: { id: reportId, userId } });
  if (!report) {
    throw new ReportNotFoundError();
  }
  if (report.status !== "pending_review") {
    throw new InvalidReportStateError();
  }

  if (body.userFlagged) {
    return prisma.imagingReport.update({
      where: { id: reportId },
      data: { userFlagged: true, flagComment: body.comment ?? null },
    });
  }

  return prisma.imagingReport.update({
    where: { id: reportId },
    data: { status: "reviewed", reviewedAt: new Date(), userFlagged: false, flagComment: null },
  });
}

// Reprocessar (seção 5 passo 6, opção 1): válido a partir de "pending_review"
// (tipicamente após sinalização) ou "failed" (seção 7 — retry após falha de
// job). aiSummary/rawFindings anteriores NÃO são apagados aqui — só são
// sobrescritos quando o novo job concluir (exams.job.ts equivalente).
export async function markReportForRetry(prisma: PrismaClient, userId: string, reportId: string) {
  const report = await prisma.imagingReport.findFirst({ where: { id: reportId, userId } });
  if (!report) {
    throw new ReportNotFoundError();
  }
  if (!RETRYABLE_STATUSES.includes(report.status)) {
    throw new InvalidReportStateError();
  }

  return prisma.imagingReport.update({
    where: { id: reportId },
    data: { status: "processing", userFlagged: false, flagComment: null },
  });
}

// Descartar (seção 5 passo 6, opções 2 e 3): arquivo permanece no S3 (RNF05),
// só o registro para de aparecer como pendente/ativo na linha do tempo.
export async function discardReport(prisma: PrismaClient, userId: string, reportId: string) {
  const report = await prisma.imagingReport.findFirst({ where: { id: reportId, userId } });
  if (!report) {
    throw new ReportNotFoundError();
  }
  if (!DISCARDABLE_STATUSES.includes(report.status)) {
    throw new InvalidReportStateError();
  }

  return prisma.imagingReport.update({
    where: { id: reportId },
    data: { status: "discarded" },
  });
}
