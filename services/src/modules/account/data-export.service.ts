import type { PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { decryptField } from "../../lib/field-encryption";
import { logAccess } from "../../lib/audit-log";

export function createExportRequest(prisma: PrismaClient, userId: string) {
  return prisma.dataExportRequest.create({ data: { userId, status: "requested" } });
}

export function getExportRequest(prisma: PrismaClient, userId: string, requestId: string) {
  return prisma.dataExportRequest.findFirst({ where: { id: requestId, userId } });
}

// Chave determinística — permite recalcular sem precisar guardar um campo
// extra, e reaproveitada pela exclusão de conta (Spec 08, seção 6) pra achar
// o arquivo depois.
export function exportFileKey(userId: string, requestId: string): string {
  return `data-exports/${userId}/${requestId}.json`;
}

// Agregação de TODAS as fontes (Spec 08, seção 5) — mesmas regras de status
// já estabelecidas em cada spec de origem (exame confirmado, laudo revisado,
// ciclo gerado); bioimpedância/prescrição/check-ins/logs sem filtro, como já
// documentado nas specs de origem. Prescrição decifrada só aqui, com log de
// auditoria único.
export async function aggregateExportData(prisma: PrismaClient, keyProvider: KeyProvider, userId: string, requestId: string) {
  const [profile, labExams, imagingReports, bioimpedance, prescriptions, healthCycles, checkIns, workoutLogs, calorieLogs] =
    await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.labExam.findMany({ where: { userId, status: "confirmed" }, include: { markers: true } }),
      prisma.imagingReport.findMany({ where: { userId, status: "reviewed", userFlagged: false } }),
      prisma.bioimpedanceEntry.findMany({ where: { userId } }),
      prisma.prescriptionEntry.findMany({ where: { userId } }),
      prisma.healthCycle.findMany({
        where: { userId, status: "generated" },
        include: { workoutPlan: { include: { exercises: true } }, feedbackEntries: true, phases: true },
      }),
      prisma.weeklyCheckIn.findMany({ where: { userId } }),
      prisma.workoutExecutionLog.findMany({ where: { userId } }),
      prisma.dailyCalorieLog.findMany({ where: { userId } }),
    ]);

  if (prescriptions.length > 0) {
    await logAccess(prisma, { userId, accessedBy: userId, resource: `PrescriptionEntry:data-export:${requestId}` });
  }

  const decryptedPrescriptions = await Promise.all(
    prescriptions.map(async (p) => ({
      id: p.id,
      name: await decryptField(p.nameEncrypted, keyProvider),
      category: p.category,
      startDate: p.startDate,
      endDate: p.endDate,
      notes: p.notesEncrypted ? await decryptField(p.notesEncrypted, keyProvider) : null,
    })),
  );

  return {
    exportedAt: new Date().toISOString(),
    profile,
    labExams: labExams.map((exam) => ({
      id: exam.id,
      examDate: exam.examDate,
      labSource: exam.labSource,
      fileUrl: exam.fileUrl,
      markers: exam.markers,
    })),
    imagingReports: imagingReports.map((report) => ({
      id: report.id,
      examDate: report.examDate,
      reportType: report.reportType,
      fileUrl: report.fileUrl,
      aiSummary: report.aiSummary,
    })),
    bioimpedanceEntries: bioimpedance,
    prescriptions: decryptedPrescriptions,
    healthCycles,
    weeklyCheckIns: checkIns,
    workoutExecutionLogs: workoutLogs,
    dailyCalorieLogs: calorieLogs,
  };
}
