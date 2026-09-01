// Cálculo de meta calórica diária (Spec 05, seção 5.1) — fórmula de
// Mifflin-St Jeor. Pré-requisitos (heightCm, birthDate, activityLevel,
// weightKg) são checados pelo chamador; esta função assume todos presentes.

export type BiologicalSexForCalc = "masculino" | "feminino" | "prefiro_nao_informar";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";
export type ObjectiveCategory = "massa_magra" | "perda_gordura" | "manutencao" | "outro";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

export function calculateAgeYears(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayYet =
    referenceDate.getMonth() < birthDate.getMonth() ||
    (referenceDate.getMonth() === birthDate.getMonth() && referenceDate.getDate() < birthDate.getDate());
  if (hasNotHadBirthdayYet) {
    age -= 1;
  }
  return age;
}

function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  biologicalSexForCalc: BiologicalSexForCalc,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (biologicalSexForCalc === "masculino") {
    return base + 5;
  }
  if (biologicalSexForCalc === "feminino") {
    return base - 161;
  }
  // "prefiro_nao_informar" — média das duas fórmulas (spec, seção 5.1)
  return ((base + 5) + (base - 161)) / 2;
}

export interface CalorieGoalInput {
  weightKg: number;
  heightCm: number;
  birthDate: Date;
  biologicalSexForCalc: BiologicalSexForCalc;
  activityLevel: ActivityLevel;
  objectiveCategory: ObjectiveCategory | null;
  referenceDate?: Date;
}

export function calculateDailyCalorieGoal(input: CalorieGoalInput): number {
  const age = calculateAgeYears(input.birthDate, input.referenceDate ?? new Date());
  const bmr = calculateBMR(input.weightKg, input.heightCm, age, input.biologicalSexForCalc);
  const tdee = bmr * ACTIVITY_FACTORS[input.activityLevel];

  if (input.objectiveCategory === "perda_gordura") {
    return Math.round(tdee - 500);
  }
  if (input.objectiveCategory === "massa_magra") {
    return Math.round(tdee + 350);
  }
  return Math.round(tdee);
}

const PROTEIN_FACTOR_G_PER_KG: Record<ObjectiveCategory, number> = {
  perda_gordura: 2.2,
  massa_magra: 2.0,
  manutencao: 1.8,
  outro: 1.8,
};

const FAT_CALORIE_SHARE = 0.25;
const KCAL_PER_GRAM_FAT = 9;
const KCAL_PER_GRAM_PROTEIN = 4;
const KCAL_PER_GRAM_CARB = 4;

export interface MacroGoals {
  proteinGramsGoal: number;
  carbGramsGoal: number;
  fatGramsGoal: number;
}

// Quebra de macronutrientes (Spec 05, seção 5.2) — calculada junto com
// dailyCalorieGoal, mesmos pré-requisitos (checados pelo chamador). Derivada
// exclusivamente de objectiveCategory + peso + dailyCalorieGoal — nunca de
// PrescriptionEntry (regra de segurança da seção 5.2).
export function calculateMacroGoals(
  dailyCalorieGoal: number,
  weightKg: number,
  objectiveCategory: ObjectiveCategory | null,
): MacroGoals {
  const proteinFactor = PROTEIN_FACTOR_G_PER_KG[objectiveCategory ?? "outro"];
  const proteinGramsGoal = Math.round(weightKg * proteinFactor);

  const fatCalories = dailyCalorieGoal * FAT_CALORIE_SHARE;
  const fatGramsGoal = Math.round(fatCalories / KCAL_PER_GRAM_FAT);

  const proteinCalories = proteinGramsGoal * KCAL_PER_GRAM_PROTEIN;
  const remainingCalories = dailyCalorieGoal - proteinCalories - fatCalories;
  const carbGramsGoal = Math.round(remainingCalories / KCAL_PER_GRAM_CARB);

  return { proteinGramsGoal, carbGramsGoal, fatGramsGoal };
}
