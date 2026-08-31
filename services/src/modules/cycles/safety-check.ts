// Checagem automática simples contra padrões de ajuste de dose/medicação no
// texto gerado (Spec 05, seção 9) — se detectado, o texto é rejeitado antes
// de chegar ao usuário, sinalizando para nova geração (cycles.job.ts).
const FORBIDDEN_PATTERNS: RegExp[] = [
  /aumente?\s+a\s+dose/i,
  /diminu[ai]\s+a\s+dose/i,
  /reduz[ai]\s+a\s+dose/i,
  /ajuste?\s+a\s+dose/i,
  /pare\s+de\s+tomar/i,
  /interromp[ae]\s+(o\s+uso|a\s+medica[cç][aã]o|o\s+tratamento)/i,
  /suspend[ae]\s+(o\s+uso|a\s+medica[cç][aã]o)/i,
  /come[cç]e?\s+a\s+tomar/i,
  /inicie?\s+o\s+uso\s+de/i,
  /mude?\s+a\s+dosagem/i,
  /troque?\s+(de\s+)?medica[cç][aã]o/i,
];

export function containsMedicationAdjustmentLanguage(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}
