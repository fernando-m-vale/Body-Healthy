import { z } from "zod";

export const categorySchema = z.enum(["medicacao", "hormonio", "suplemento"]);

// name é obrigatório dentro de um item (spec, seção 8) — diferente da
// bioimpedância, onde tudo é opcional. O item inteiro continua opcional
// (RF04a): o usuário pode simplesmente não ter nenhum item registrado.
export const prescriptionEntryBodySchema = z
  .object({
    name: z.string().min(1),
    category: categorySchema,
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
    message: "endDate não pode ser anterior a startDate",
    path: ["endDate"],
  });
export type PrescriptionEntryBody = z.infer<typeof prescriptionEntryBodySchema>;

export const prescriptionEntryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const prescriptionIdParamsSchema = z.object({
  id: z.string(),
});
