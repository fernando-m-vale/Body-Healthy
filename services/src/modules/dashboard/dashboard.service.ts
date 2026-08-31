import type { PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { decryptField } from "../../lib/field-encryption";
import { logAccess } from "../../lib/audit-log";
import { listEntriesWithTrend } from "../bioimpedance/bioimpedance.service";
import { listCalorieLogs } from "../calorie-logs/calorie-logs.service";
import { listCheckIns } from "../check-ins/check-ins.service";
import { calculateAdherenceRate } from "../check-ins/adherence";
import { getActiveCycleId } from "../cycles/cycles.service";
import type { TimelineQuery } from "./dashboard.schemas";

interface TimelineItem {
  type:
    | "lab_exam"
    | "imaging_report"
    | "bioimpedance"
    | "prescription"
    | "health_cycle"
    | "weekly_checkin"
    | "daily_calorie_log";
  date: string;
  data: unknown;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Linha do tempo consolidada (Spec 07, seção 4) — agregação de leitura pura.
// REGRA CRÍTICA (RF09): nunca gera texto interpretativo conectando um item a
// outro. Cada fonte vira um item independente, ordenado cronologicamente;
// qualquer leitura de causa/efeito é do usuário olhando a lista, não do
// código. Filtro por período e paginação acontecem sobre a lista já mesclada
// (decisão registrada no planejamento desta tarefa).
export async function buildTimeline(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  accessedBy: string,
  query: TimelineQuery,
): Promise<{ items: TimelineItem[]; total: number }> {
  const [labExams, imagingReports, bioimpedance, prescriptions, healthCycles, checkIns, calorieLogs] =
    await Promise.all([
      prisma.labExam.findMany({ where: { userId, status: "confirmed" }, include: { markers: true } }),
      prisma.imagingReport.findMany({ where: { userId, status: "reviewed", userFlagged: false } }),
      listEntriesWithTrend(prisma, userId),
      prisma.prescriptionEntry.findMany({ where: { userId } }),
      prisma.healthCycle.findMany({ where: { userId, status: "generated" } }),
      listCheckIns(prisma, userId),
      listCalorieLogs(prisma, userId),
    ]);

  // Log de auditoria único para a timeline inteira (não um por prescrição) —
  // decisão registrada no planejamento desta tarefa.
  if (prescriptions.length > 0) {
    await logAccess(prisma, { userId, accessedBy, resource: "PrescriptionEntry:dashboard-timeline" });
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

  const items: TimelineItem[] = [
    ...labExams.map((exam) => ({
      type: "lab_exam" as const,
      date: (exam.examDate ?? exam.createdAt).toISOString(),
      data: {
        id: exam.id,
        examDate: exam.examDate,
        labSource: exam.labSource,
        markers: exam.markers.map((m) => ({
          name: m.name,
          value: m.value,
          unit: m.unit,
          referenceMin: m.referenceMin,
          referenceMax: m.referenceMax,
          trend: m.trend,
        })),
      },
    })),
    ...imagingReports.map((report) => ({
      type: "imaging_report" as const,
      date: (report.examDate ?? report.createdAt).toISOString(),
      data: {
        id: report.id,
        examDate: report.examDate,
        reportType: report.reportType,
        aiSummary: report.aiSummary,
      },
    })),
    ...bioimpedance.map((entry) => ({
      type: "bioimpedance" as const,
      date: entry.measuredAt.toISOString(),
      data: {
        id: entry.id,
        measuredAt: entry.measuredAt,
        weightKg: entry.weightKg,
        bodyFatPercent: entry.bodyFatPercent,
        leanMassKg: entry.leanMassKg,
        trend: entry.trend,
      },
    })),
    ...decryptedPrescriptions.map((p) => ({
      type: "prescription" as const,
      date: p.startDate.toISOString(),
      data: p,
    })),
    ...healthCycles.map((cycle) => ({
      type: "health_cycle" as const,
      date: (cycle.generatedAt ?? cycle.createdAt).toISOString(),
      data: {
        id: cycle.id,
        objectiveText: cycle.objectiveText,
        objectiveCategory: cycle.objectiveCategory,
        dailyCalorieGoal: cycle.dailyCalorieGoal,
        generatedAt: cycle.generatedAt,
      },
    })),
    ...checkIns.map((checkIn) => ({
      type: "weekly_checkin" as const,
      date: checkIn.weekStartDate.toISOString(),
      data: checkIn,
    })),
    ...calorieLogs.map((log) => ({
      type: "daily_calorie_log" as const,
      date: log.logDate.toISOString(),
      data: log,
    })),
  ];

  items.sort((a, b) => a.date.localeCompare(b.date));

  const fromTime = query.from ? new Date(query.from).getTime() : null;
  const toTime = query.to ? new Date(query.to).getTime() : null;
  const filtered = items.filter((item) => {
    const t = new Date(item.date).getTime();
    if (fromTime !== null && t < fromTime) return false;
    if (toTime !== null && t > toTime) return false;
    return true;
  });

  return { items: filtered.slice(query.offset, query.offset + query.limit), total: filtered.length };
}

// Histórico de marcador isolado (RF15) — correspondência exata de nome, sem
// normalização (risco documentado na Spec 01). Tendência já vem calculada da
// Spec 01, nunca recalculada aqui.
export function getMarkerHistory(prisma: PrismaClient, userId: string, markerName: string) {
  return prisma.labMarker.findMany({
    where: { name: markerName, labExam: { userId, status: "confirmed" } },
    include: { labExam: { select: { examDate: true } } },
    orderBy: { labExam: { examDate: "asc" } },
  });
}

export async function getCurrentCycleSummary(prisma: PrismaClient, userId: string) {
  const cycleId = await getActiveCycleId(prisma, userId);

  if (!cycleId) {
    return {
      cycleId: null,
      status: null,
      dailyCalorieGoal: null,
      nextCycleExpectedDate: null,
      daysUntilNextCycle: null,
      adherenceRate: null,
    };
  }

  const cycle = await prisma.healthCycle.findUniqueOrThrow({ where: { id: cycleId } });
  const adherenceRate = await calculateAdherenceRate(prisma, userId, cycleId);

  const daysUntilNextCycle = cycle.nextCycleExpectedDate
    ? Math.ceil((cycle.nextCycleExpectedDate.getTime() - Date.now()) / MS_PER_DAY)
    : null;

  return {
    cycleId: cycle.id,
    status: cycle.status,
    dailyCalorieGoal: cycle.dailyCalorieGoal,
    nextCycleExpectedDate: cycle.nextCycleExpectedDate,
    daysUntilNextCycle,
    adherenceRate,
  };
}
