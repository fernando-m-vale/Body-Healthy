// Estrutura efêmera de contexto usada SÓ para montar o prompt da IA (Spec 05,
// seção 5). Nunca é persistida como está — em especial `prescriptions`, que
// carrega texto decifrado em memória e nunca deve tocar o banco desta forma.
// O que é persistido em HealthCycle.contextSnapshot é uma versão derivada
// desta, com prescriptions substituído por um placeholder redigido.
export interface AIContext {
  labExams: Array<{
    examDate: string | null;
    markers: Array<{
      name: string;
      value: number;
      unit: string;
      referenceMin: number | null;
      referenceMax: number | null;
      trend: string | null;
    }>;
  }>;
  imagingReports: Array<{
    examDate: string | null;
    reportType: string | null;
    summary: string;
  }>;
  bioimpedance: Array<{
    measuredAt: string;
    weightKg: number | null;
    bodyFatPercent: number | null;
    leanMassKg: number | null;
    trend: { weightKg: string | null; bodyFatPercent: string | null; leanMassKg: string | null };
  }>;
  // Texto decifrado, só em memória — nunca persistir esta estrutura como está.
  prescriptions: Array<{
    name: string;
    category: string;
    startDate: string;
    endDate: string | null;
    notes: string | null;
  }>;
  profile: {
    heightCm: number | null;
    ageYears: number | null;
    biologicalSexForCalc: string | null;
    activityLevel: string | null;
  } | null;
  dailyCalorieGoal: number | null;
  // Quebra de macronutrientes (Spec 05, seção 5.2) — mesmos pré-requisitos e
  // mesma condição de null que dailyCalorieGoal.
  proteinGramsGoal: number | null;
  carbGramsGoal: number | null;
  fatGramsGoal: number | null;
  // Taxa de adesão do ciclo anterior (Spec 06, seção 6 — RF18), 0-1, ou null
  // se não houver ciclo anterior ou dado insuficiente (<2 check-ins).
  adherenceRate: number | null;
}
