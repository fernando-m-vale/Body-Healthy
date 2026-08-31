import type { FastifyBaseLogger } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import type { PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { putObject, createDownloadUrl } from "../../lib/s3";
import { aggregateExportData, exportFileKey } from "./data-export.service";

const DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;

// Job assíncrono fire-and-forget (mesmo padrão de sempre) — agrega, compila
// em JSON, salva no S3 privado, gera URL assinada.
export async function runExportJob(
  prisma: PrismaClient,
  s3: S3Client,
  bucket: string,
  keyProvider: KeyProvider,
  userId: string,
  requestId: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    await prisma.dataExportRequest.update({ where: { id: requestId }, data: { status: "processing" } });

    const data = await aggregateExportData(prisma, keyProvider, userId, requestId);
    const key = exportFileKey(userId, requestId);
    await putObject(s3, bucket, key, Buffer.from(JSON.stringify(data, null, 2), "utf8"), "application/json");

    const downloadUrl = await createDownloadUrl(s3, bucket, key);
    const readyAt = new Date();

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: "ready",
        downloadUrl,
        readyAt,
        expiresAt: new Date(readyAt.getTime() + DOWNLOAD_URL_TTL_MS),
      },
    });
  } catch (err) {
    logger.error({ err, requestId }, "Falha na exportação de dados");
    await prisma.dataExportRequest.update({ where: { id: requestId }, data: { status: "failed" } }).catch((updateErr) => {
      logger.error({ err: updateErr, requestId }, "Falha ao marcar exportação como failed");
    });
  }
}
