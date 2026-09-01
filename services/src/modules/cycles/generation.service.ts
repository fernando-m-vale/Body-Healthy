import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "../../lib/ai-document";
import { generationResultSchema, type GenerationResult } from "./generation.schema";
import type { AIContext } from "./context.types";

const GENERATION_MODEL = "claude-opus-5";

const SYSTEM_INSTRUCTIONS = `Você gera DUAS saídas obrigatórias e igualmente importantes a partir do objetivo declarado pelo usuário e do contexto de saúde disponível:
1. actionPlanText: um plano de ação de saúde (nutrição, treino, sono) em linguagem simples.
2. workoutDays: o MESMO treino mencionado no actionPlanText, mas como dado estruturado — dias, exercícios, séries, repetições. Isso NÃO é um resumo nem um adendo opcional: é a contraparte estruturada de tudo que o actionPlanText descreve sobre o treino. Se o actionPlanText menciona "4 sessões, dias A/B/C/D", o workoutDays precisa ter exatamente esses dias, cada um com sua lista real de exercícios (nome, séries, repetições, descanso). Nunca deixe workoutDays vazio ou incompleto enquanto o actionPlanText descreve treino em prosa — as duas saídas têm que contar a mesma história, uma em texto, outra estruturada.

Regras obrigatórias, sem exceção:
- Você NUNCA sugere, ajusta, recomenda início ou fim de dose de medicação, hormônio ou suplemento. Qualquer prescrição no contexto é APENAS histórico de correlação — nunca use isso para recomendar mudança de dose, início ou fim de tratamento. Isso é decisão exclusiva do médico do usuário.
- Você não emite diagnóstico nem análise médica. O plano é informativo, não substitui acompanhamento médico.
- Funcione com qualquer nível de contexto — se só houver o objetivo declarado, gere um plano genérico de boa qualidade mesmo assim, incluindo workoutDays estruturado. Nunca recuse por "dado insuficiente".
- Se dado de bioimpedância ou exame estiver disponível, use tendências (subindo/descendo/estável) para personalizar o plano quando fizer sentido.
- Se a meta calórica foi calculada com base biológica ambígua (sexo "prefiro_nao_informar"), mencione no plano que a estimativa calórica é menos precisa nesse caso.
- Se \`adherenceRate\` (taxa de adesão ao treino do ciclo anterior, 0 a 1) estiver presente no contexto, use-a APENAS para calibrar volume/intensidade do novo treino (ex.: adesão baixa → considere um plano mais simples/curto desta vez). Nunca trate isso como julgamento sobre o usuário, nunca mencione a taxa como cobrança ou crítica — é só um ajuste técnico de dificuldade.
- Cada exercício pode opcionalmente ter um campo \`technique\` (texto livre, ex.: "drop-set", "rest-pause", "superset", "bi-set") quando uma técnica específica de execução fizer sentido para aquele exercício — deixe null na maioria dos casos.
- \`phases\` é OPCIONAL: só inclua uma periodização do treino em fases progressivas quando isso fizer sentido para o ciclo. REGRA NÃO NEGOCIÁVEL: cada fase (phaseLabel, title, focusText) é definida EXCLUSIVAMENTE em relação ao tempo do próprio ciclo de treino (ex.: "Semanas 1-4") — NUNCA em relação a início, fim, duração ou efeito de qualquer prescrição, medicação, hormônio ou suplemento, mesmo que o contexto agregado contenha prescrições. Nunca escreva frases como "nesta fase, a medicação X está mais ativa" ou "encerrando o uso de Y". Se não houver como descrever uma fase sem tocar em prescrição, omita \`phases\` inteiramente.
- REGRA NÃO NEGOCIÁVEL sobre frequência semanal: se o contexto trouxer \`weeklyTrainingDays\` preenchido (número), o \`workoutDays\` TEM que ter exatamente esse número de dias distintos (valores distintos de \`dayLabel\`) — nem mais, nem menos. Se \`weeklyTrainingDays\` for \`null\`, decida você mesmo um número razoável de dias (normalmente entre 2 e 6) com base em \`objectiveCategory\` e no \`activityLevel\` do perfil — nunca deixe de gerar o treino ou pergunte de volta ao usuário por causa disso.`;

function formatContext(context: AIContext): string {
  return JSON.stringify(context, null, 2);
}

function buildGenerationPrompt(objectiveText: string, context: AIContext): string {
  return `Objetivo declarado pelo usuário para este ciclo: "${objectiveText}"

Contexto de saúde disponível (JSON):
${formatContext(context)}

Gere o plano de ação e o treino estruturado.`;
}

function buildRegenerationPrompt(
  objectiveText: string,
  context: AIContext,
  currentActionPlanText: string,
  currentWorkoutDays: GenerationResult["workoutDays"],
  currentPhases: GenerationResult["phases"],
  feedbackText: string,
): string {
  const currentPhasesBlock =
    currentPhases && currentPhases.length > 0
      ? `\n\nFases atuais (JSON):\n${JSON.stringify(currentPhases, null, 2)}`
      : "";

  return `Objetivo declarado pelo usuário para este ciclo: "${objectiveText}"

Contexto de saúde disponível (JSON):
${formatContext(context)}

Plano de ação atual:
${currentActionPlanText}

Treino atual (JSON):
${JSON.stringify(currentWorkoutDays, null, 2)}${currentPhasesBlock}

O usuário enviou o seguinte feedback/crítica sobre o plano e/ou treino atuais:
"${feedbackText}"

Gere uma versão ajustada do plano de ação e do treino (e das fases, se houver), mantendo o que já funcionava e ajustando especificamente o que o feedback aponta. Se o feedback não der sinal suficiente para uma mudança clara, é aceitável que o resultado fique parecido com o atual.`;
}

async function callGeneration(userPrompt: string): Promise<GenerationResult> {
  const response = await getAnthropicClient().messages.parse({
    model: GENERATION_MODEL,
    max_tokens: 16000,
    system: SYSTEM_INSTRUCTIONS,
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(generationResultSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Falha ao interpretar a resposta estruturada da IA");
  }

  return response.parsed_output;
}

export function generatePlan(objectiveText: string, context: AIContext): Promise<GenerationResult> {
  return callGeneration(buildGenerationPrompt(objectiveText, context));
}

export function regeneratePlan(
  objectiveText: string,
  context: AIContext,
  currentActionPlanText: string,
  currentWorkoutDays: GenerationResult["workoutDays"],
  currentPhases: GenerationResult["phases"],
  feedbackText: string,
): Promise<GenerationResult> {
  return callGeneration(
    buildRegenerationPrompt(
      objectiveText,
      context,
      currentActionPlanText,
      currentWorkoutDays,
      currentPhases,
      feedbackText,
    ),
  );
}
