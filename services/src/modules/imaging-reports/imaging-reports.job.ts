import type { FastifyBaseLogger } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import type { PrismaClient } from "../../generated/prisma/client";
import { getObject } from "../../lib/s3";
import { summarizeImagingReport } from "./summary.service";

// Job assíncrono in-process (Spec 02, seção 5 passos 2-4), mesmo mecanismo
// fire-and-forget da Spec 01 (sem fila dedicada). Mesma limitação conhecida:
// se o processo cair no meio, o laudo fica preso em "processing".
export async function runSummaryJob(
  prisma: PrismaClient,
  s3: S3Client,
  bucket: string,
  reportId: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    await prisma.imagingReport.update({ where: { id: reportId }, data: { status: "processing" } });

    const report = await prisma.imagingReport.findUniqueOrThrow({ where: { id: reportId } });
    const file = await getObject(s3, bucket, report.fileUrl);
    const result = await summarizeImagingReport(file);

    if (!result.isImagingReport) {
      await prisma.imagingReport.update({ where: { id: reportId }, data: { status: "failed" } });
      return;
    }

    await prisma.imagingReport.update({
      where: { id: reportId },
      data: {
        aiSummary: result.summary,
        rawFindings: result.findings,
        examDate: result.examDate ? new Date(result.examDate) : null,
        status: "pending_review",
      },
    });
  } catch (err) {
    logger.error({ err, reportId }, "Falha ao gerar resumo de laudo de imagem");
    await prisma.imagingReport.update({ where: { id: reportId }, data: { status: "failed" } }).catch((updateErr) => {
      logger.error({ err: updateErr, reportId }, "Falha ao marcar laudo como failed");
    });
  }
}
