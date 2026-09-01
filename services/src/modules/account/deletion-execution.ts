import type { FastifyBaseLogger } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import type { PrismaClient } from "../../generated/prisma/client";
import { deleteObject } from "../../lib/s3";
import { exportFileKey } from "./data-export.service";

// Núcleo puro de exclusão real de conta (Spec 08, seção 6) — compartilhado
// entre o script de dev (services/scripts/process-due-deletions.ts) e,
// futuramente, um scheduler de produção de verdade (cron/EventBridge). Não é
// chamado por nenhum endpoint HTTP autenticado do próprio usuário — deixar
// o usuário forçar sua própria exclusão anularia o propósito da carência.
export async function processExpiredDeletionRequests(
  prisma: PrismaClient,
  s3: S3Client,
  bucket: string,
  logger: FastifyBaseLogger,
): Promise<number> {
  const due = await prisma.accountDeletionRequest.findMany({
    where: { status: "grace_period", scheduledDeletionAt: { lte: new Date() } },
  });

  for (const request of due) {
    try {
      await executeAccountDeletion(prisma, s3, bucket, request.userId, request.id, logger);
    } catch (err) {
      logger.error({ err, requestId: request.id, userId: request.userId }, "Falha ao executar exclusão de conta");
    }
  }

  return due.length;
}

async function executeAccountDeletion(
  prisma: PrismaClient,
  s3: S3Client,
  bucket: string,
  userId: string,
  deletionRequestId: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  // Captura as referências de arquivo ANTES de apagar as linhas do banco —
  // depois de apagadas, não há mais como recuperar as chaves (spec, seção 6;
  // decisão de escopo desta tarefa: arquivos de exame/laudo/exportação
  // também são apagados do S3, não só os registros do banco).
  const [labExams, imagingReports, exportRequests] = await Promise.all([
    prisma.labExam.findMany({ where: { userId }, select: { fileUrl: true } }),
    prisma.imagingReport.findMany({ where: { userId }, select: { fileUrl: true } }),
    prisma.dataExportRequest.findMany({ where: { userId }, select: { id: true } }),
  ]);

  const s3KeysToDelete = [
    ...labExams.map((e) => e.fileUrl),
    ...imagingReports.map((r) => r.fileUrl),
    ...exportRequests.map((r) => exportFileKey(userId, r.id)),
  ];

  await prisma.$transaction([
    // Consentimento revogado antes da exclusão dos dados que ele autorizava
    // (spec, seção 6 passo 3) — nunca apagado, só atualizado.
    prisma.healthDataConsent.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),

    prisma.labMarker.deleteMany({ where: { labExam: { userId } } }),
    prisma.labExam.deleteMany({ where: { userId } }),
    prisma.imagingReport.deleteMany({ where: { userId } }),
    prisma.bioimpedanceEntry.deleteMany({ where: { userId } }),
    prisma.prescriptionEntry.deleteMany({ where: { userId } }),
    prisma.workoutExercise.deleteMany({ where: { workoutPlan: { healthCycle: { userId } } } }),
    prisma.workoutPlan.deleteMany({ where: { healthCycle: { userId } } }),
    prisma.cycleFeedback.deleteMany({ where: { healthCycle: { userId } } }),
    prisma.cyclePhase.deleteMany({ where: { healthCycle: { userId } } }),
    prisma.healthCycle.deleteMany({ where: { userId } }),
    prisma.weeklyCheckIn.deleteMany({ where: { userId } }),
    prisma.workoutExecutionLog.deleteMany({ where: { userId } }),
    prisma.dailyCalorieLog.deleteMany({ where: { userId } }),
    prisma.userProfile.deleteMany({ where: { userId } }),
    prisma.dataExportRequest.deleteMany({ where: { userId } }),

    // User não é hard-deleted — id persiste para as referências de auditoria
    // (HealthDataAccessLog, AccountDeletionRequest). Email/credenciais
    // anonimizados: login não deve mais funcionar (extensão do princípio de
    // exclusão real, além do que a spec pede literalmente pra email).
    prisma.user.update({
      where: { id: userId },
      data: { email: `deleted-${userId}@deleted.invalid`, passwordHash: null, googleSub: null },
    }),

    prisma.accountDeletionRequest.update({
      where: { id: deletionRequestId },
      data: { status: "completed", completedAt: new Date() },
    }),
  ]);

  // Limpeza do S3 é best-effort, depois que a exclusão no banco (o requisito
  // legal principal) já foi concluída com sucesso — uma falha aqui não deve
  // deixar o pedido de exclusão travado.
  await Promise.all(
    s3KeysToDelete.map((key) =>
      deleteObject(s3, bucket, key).catch((err) => {
        // Erro de limpeza de arquivo órfão não deve reverter nem travar a
        // exclusão já concluída no banco — apenas registrado no log do job.
        logger.error({ err, key, userId }, "Falha ao apagar arquivo S3 durante exclusão de conta");
      }),
    ),
  );
}
