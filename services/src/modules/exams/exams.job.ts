import type { FastifyBaseLogger } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import type { PrismaClient } from "../../generated/prisma/client";
import { getObject } from "../../lib/s3";
import { extractLabMarkers } from "./extraction.service";

// Job assíncrono in-process (Spec 01, seção 4 passos 2-4) — fire-and-forget,
// sem fila dedicada (decisão registrada no planejamento desta tarefa: MVP de
// baixo volume; revisitar com fila real se isso virar gargalo). Limitação
// conhecida: se o processo cair no meio da extração, o exame fica preso em
// "processing" — não há worker externo para retomar.
export async function runExtractionJob(
  prisma: PrismaClient,
  s3: S3Client,
  bucket: string,
  examId: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    await prisma.labExam.update({ where: { id: examId }, data: { status: "processing" } });

    const exam = await prisma.labExam.findUniqueOrThrow({ where: { id: examId } });
    const file = await getObject(s3, bucket, exam.fileUrl);
    const result = await extractLabMarkers(file);

    if (!result.isLabExam) {
      await prisma.labExam.update({ where: { id: examId }, data: { status: "failed" } });
      return;
    }

    await prisma.$transaction([
      ...result.markers.map((marker) =>
        prisma.labMarker.create({
          data: {
            labExamId: examId,
            name: marker.name,
            value: marker.value,
            unit: marker.unit,
            referenceMin: marker.referenceMin,
            referenceMax: marker.referenceMax,
            rawExtracted: marker,
            userCorrected: false,
          },
        }),
      ),
      prisma.labExam.update({
        where: { id: examId },
        data: {
          status: "pending_confirmation",
          examDate: result.examDate ? new Date(result.examDate) : null,
        },
      }),
    ]);
  } catch (err) {
    logger.error({ err, examId }, "Falha na extração de exame laboratorial");
    await prisma.labExam.update({ where: { id: examId }, data: { status: "failed" } }).catch((updateErr) => {
      logger.error({ err: updateErr, examId }, "Falha ao marcar exame como failed");
    });
  }
}
