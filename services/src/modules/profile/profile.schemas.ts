import { z } from "zod";

const MIN_HEIGHT_CM = 50;
const MAX_HEIGHT_CM = 250;
const MIN_AGE_YEARS = 13;
const MAX_AGE_YEARS = 120;

function isPlausibleBirthDate(value: Date): boolean {
  const now = new Date();
  if (value.getTime() > now.getTime()) return false;

  const age = (now.getTime() - value.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age >= MIN_AGE_YEARS && age <= MAX_AGE_YEARS;
}

export const biologicalSexForCalcSchema = z.enum(["masculino", "feminino", "prefiro_nao_informar"]);
export const activityLevelSchema = z.enum([
  "sedentario",
  "leve",
  "moderado",
  "intenso",
  "muito_intenso",
]);

// RF20 — todos os campos opcionais (Spec 00, seção 9: "todos campos de perfil vazios" é caso aceito).
export const upsertProfileBodySchema = z.object({
  heightCm: z.number().min(MIN_HEIGHT_CM).max(MAX_HEIGHT_CM).nullable().optional(),
  birthDate: z
    .string()
    .datetime()
    .refine((value) => isPlausibleBirthDate(new Date(value)), {
      message: `Data de nascimento fora de faixa plausível (${MIN_AGE_YEARS}-${MAX_AGE_YEARS} anos, não pode ser no futuro)`,
    })
    .nullable()
    .optional(),
  biologicalSexForCalc: biologicalSexForCalcSchema.nullable().optional(),
  activityLevel: activityLevelSchema.nullable().optional(),
});
export type UpsertProfileBody = z.infer<typeof upsertProfileBodySchema>;

export const profileResponseSchema = z.object({
  heightCm: z.number().nullable(),
  birthDate: z.date().nullable(),
  biologicalSexForCalc: z.string().nullable(),
  activityLevel: z.string().nullable(),
});
