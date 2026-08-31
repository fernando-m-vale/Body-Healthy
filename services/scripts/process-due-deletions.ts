import "dotenv/config";
import type { FastifyBaseLogger } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createS3Client } from "../src/lib/s3";
import { processExpiredDeletionRequests } from "../src/modules/account/deletion-execution";

// Script de desenvolvimento (Spec 08) — dispara manualmente a checagem de
// pedidos de exclusão vencidos, sem esperar os 7 dias reais de carência.
// Em produção, o mesmo processExpiredDeletionRequests() seria chamado por um
// scheduler de verdade (cron/AWS EventBridge), não por execução manual.
// Uso: npx tsx scripts/process-due-deletions.ts
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;

  if (!bucket) {
    throw new Error("S3_BUCKET não configurado no ambiente");
  }

  const logger = {
    error: (...args: unknown[]) => console.error(...args),
  } as unknown as FastifyBaseLogger;

  const processedCount = await processExpiredDeletionRequests(prisma, s3, bucket, logger);
  console.log(`Pedidos de exclusão processados: ${processedCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
