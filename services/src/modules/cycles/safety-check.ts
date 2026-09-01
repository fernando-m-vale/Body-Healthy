// Checagem automática simples contra padrões de ajuste de dose/medicação no
// texto gerado (Spec 05, seção 9) — se detectado, o texto é rejeitado antes
// de chegar ao usuário, sinalizando para nova geração (cycles.job.ts). A
// partir da v5 também cobre os campos de CyclePhase (title/focusText), não
// só o actionPlanText — por isso a função opera sobre um array de textos.
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

// Seção 9 (v5): "nome de categoria de medicação combinado com termos de
// ajuste" — heurística de co-ocorrência (não vocabulário fechado) para
// pegar frases indiretas de periodização/macro que conectem fase a
// prescrição sem usar um verbo de ajuste de dose explícito (ex.: "nesta
// fase, a medicação está mais ativa"). Checada por FRASE, não pelo campo
// inteiro — um texto de várias frases (actionPlanText) quase sempre contém
// a categoria (ex.: "suplemento") e um termo solto em frases totalmente
// não relacionadas (ex.: "nível de atividade moderado"), o que gerou falso
// positivo real em teste manual; termos de efeito também precisam ser
// específicos o bastante para não casar com palavras comuns como
// "atividade física".
const MEDICATION_CATEGORY_TERM = /medica[cç][aã]o|medicamento|horm[oô]nio|hormonal|suplemento/i;
const EFFECT_OR_ADJUSTMENT_TERM =
  /mais\s+ativ|menos\s+ativ|ativa[cç][aã]o|efic[aá]cia|absor[cç][aã]o|apetite|interage|interfer|potencializa|estimula/i;

function containsMedicationCategoryEffectCoOccurrence(text: string): boolean {
  const sentences = text.split(/(?<=[.!?\n])\s*/);
  return sentences.some(
    (sentence) => MEDICATION_CATEGORY_TERM.test(sentence) && EFFECT_OR_ADJUSTMENT_TERM.test(sentence),
  );
}

function textContainsForbiddenLanguage(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text)) || containsMedicationCategoryEffectCoOccurrence(text);
}

export function containsMedicationAdjustmentLanguage(texts: string[]): boolean {
  return texts.some((text) => textContainsForbiddenLanguage(text));
}
