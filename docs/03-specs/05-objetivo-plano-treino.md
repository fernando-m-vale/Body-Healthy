# Spec Técnica 05 — Declaração de Objetivo, Plano de Ação e Treino Personalizado
**Metodologia:** SDD · **Status:** Rascunho v2 · **Data:** 27/08/2026
**Cobre:** RF10, RF11, RF12, RF13 (PRD Fase 1) · **Depende de:** Specs 01-04 (fontes de dado), Architecture Doc v3

---

## 1. Objetivo

Permitir que o usuário declare um objetivo para o ciclo atual e receba, a partir desse objetivo combinado com os dados de saúde disponíveis e confirmados (exame, laudo de imagem, bioimpedância, prescrições como contexto), um plano de ação em linguagem simples e um treino personalizado estruturado, exibido no app e exportável para uso em qualquer aplicativo de acompanhamento de treino de escolha do usuário — sem dependência de um app específico.

## 2. Por que essa spec é diferente de todas as anteriores

As Specs 01-04 tratam de **ingestão** de dado — cada uma isolada. Esta spec é a primeira que **consome** os dados de todas elas ao mesmo tempo para gerar algo novo (plano + treino). Isso traz duas responsabilidades que nenhuma spec anterior tinha:

- **Agregação disciplinada de contexto** — só dado já confirmado/revisado entra no prompt da IA (nunca um `LabExam` em `pending_confirmation`, nunca um `ImagingReport` em `pending_review`)
- **Reforço ativo das restrições das Specs 01-04 no momento da geração** — em especial a restrição da Spec 04 (RF09): prescrições entram como contexto histórico, nunca como sugestão de causa/efeito ou ajuste de dose

## 3. Escopo desta spec

**Cobre:**
- Formulário de declaração de objetivo (RF10)
- Agregação do dado disponível e confirmado do usuário como contexto
- Geração via IA do plano de ação em linguagem simples (RF11), com degradação graciosa (RF04a)
- Geração via IA do treino estruturado (RF12)
- Revisão/edição do treino pelo usuário antes de considerar o ciclo "pronto"
- Caixa de feedback/crítica para o usuário debater o plano e o treino, disparando regeneração ajustada
- Exibição em tela do treino completo e exportação em formato genérico (RF13), independente de app de terceiros

**Não cobre:**
- Ajuste do próximo plano com base em adesão/check-in semanal (RF16-19) — spec de engajamento entre ciclos, ainda a fazer
- Renderização visual do plano/treino no app (spec de produto/design, se necessário)
- Acompanhamento nativo de treino dentro do próprio produto (candidato a fase futura — ver seção 7)

## 4. Modelo de dados (proposta Prisma)

```prisma
model HealthCycle {
  id                  String   @id @default(cuid())
  userId              String
  objectiveText       String   // texto livre do objetivo — único campo obrigatório desta spec
  objectiveCategory    String?  // "massa_magra" | "perda_gordura" | "manutencao" | "outro"
  status              String   // "objective_set" | "generating" | "generated" | "failed"
  actionPlanText      String?  // plano de ação gerado (nutrição, treino, sono) em linguagem simples
  contextSnapshot     Json?    // snapshot do contexto agregado usado na geração (auditoria/debug —
                                 // nunca inclui nameEncrypted/notesEncrypted em texto plano das
                                 // prescrições, só a versão decifrada momentânea usada no prompt)
  createdAt           DateTime @default(now())
  generatedAt         DateTime?

  workoutPlan         WorkoutPlan?
  feedbackEntries     CycleFeedback[]

  @@index([userId, createdAt])
}

model CycleFeedback {
  id            String   @id @default(cuid())
  healthCycleId String
  feedbackText  String   // texto livre do usuário criticando/ajustando o plano ou treino
  createdAt     DateTime @default(now())
  triggeredRegeneration Boolean @default(false) // true se esse feedback disparou nova geração

  healthCycle   HealthCycle @relation(fields: [healthCycleId], references: [id])

  @@index([healthCycleId, createdAt])
}

model WorkoutPlan {
  id            String   @id @default(cuid())
  healthCycleId String   @unique
  userEdited    Boolean  @default(false)

  healthCycle   HealthCycle @relation(fields: [healthCycleId], references: [id])
  exercises     WorkoutExercise[]
}

model WorkoutExercise {
  id            String   @id @default(cuid())
  workoutPlanId String
  dayLabel      String   // ex.: "Dia A — Peito/Tríceps"
  orderIndex    Int
  exerciseName  String
  sets          Int
  reps          String   // texto livre, ex.: "8-12" ou "até a falha"
  restSeconds   Int?
  notes         String?  // ex.: nota de progressão

  workoutPlan   WorkoutPlan @relation(fields: [workoutPlanId], references: [id])

  @@index([workoutPlanId, dayLabel, orderIndex])
}
```

## 5. Agregação de contexto — regras obrigatórias

Antes de qualquer chamada à IA, o backend monta um `contextSnapshot` seguindo estas regras, sem exceção:

- `LabExam`: somente registros com `status: "confirmed"`, usando o valor final (já com correções do usuário), incluindo `trend` quando disponível
- `ImagingReport`: somente registros com `status: "reviewed"` e `userFlagged: false` (um resumo sinalizado como incorreto não entra no contexto até ser resolvido — ver Spec 02, seção 6)
- `BioimpedanceEntry`: todos os registros do usuário, com tendência calculada dinamicamente (Spec 03)
- `PrescriptionEntry`: linha do tempo decifrada **apenas em memória, no momento da chamada**, nunca persistida em texto plano fora do `contextSnapshot` — e mesmo ali, o prompt para a IA deve instruir explicitamente que este dado é contexto histórico, nunca base para sugestão de ajuste
- Ausência de qualquer uma dessas fontes **não bloqueia a geração** (RF04a) — o prompt deve ser construído de forma que funcione com contexto mínimo (só `objectiveText`) até contexto completo

## 6. Fluxo técnico

1. **Declaração de objetivo (RF10)** — usuário preenche `objectiveText` (livre) e opcionalmente escolhe `objectiveCategory` sugerida; cria `HealthCycle` com `status: "objective_set"`
2. **Agregação** — backend monta `contextSnapshot` seguindo as regras da seção 5
3. **Geração (job assíncrono)** — `status: "generating"`; job envia `objectiveText` + `contextSnapshot` para a API da Anthropic em duas partes do mesmo prompt estruturado: (a) plano de ação em linguagem simples, (b) treino estruturado em JSON (dias, exercícios, séries, repetições, progressão)
4. **Resultado** — `actionPlanText` e `WorkoutPlan`/`WorkoutExercise` são persistidos; `status: "generated"`; usuário notificado (RNF04)
5. **Revisão do treino** — usuário pode editar qualquer exercício gerado (nome, séries, reps, ordem) antes de exportar; qualquer edição marca `WorkoutPlan.userEdited: true`. O plano de ação em texto (nutrição/sono) não tem edição estruturada nesta spec — é conteúdo de leitura
6. **Feedback e regeneração** — a qualquer momento após a geração, usuário pode escrever uma crítica ou pedido de ajuste livre (ex.: "não consigo fazer agachamento, tenho problema no joelho" ou "quero incluir treino de natação"). Isso cria um `CycleFeedback`; o sistema reenvia à IA o `objectiveText`, o `contextSnapshot` original, o `actionPlanText`/treino atuais e o texto do feedback, pedindo uma versão ajustada. O resultado **substitui** o plano e treino atuais (não há histórico de versões nesta spec, só o log de feedback em `CycleFeedback`); `triggeredRegeneration: true` é marcado nesse registro
7. **Exibição e exportação (RF13)** — usuário vê o treino completo em tela (dias, exercícios, séries, repetições) e pode exportar em formato estruturado genérico, para uso manual em qualquer app de treino de sua escolha (ver seção 7)

## 7. Exibição e exportação do treino — formato

O treino gerado deve estar sempre visível de forma completa dentro do próprio app (tela de detalhe do ciclo) — a exportação é um complemento, não a única forma de acesso ao treino. Nenhuma parte desta spec assume um app de terceiros específico (nem Hevy, nem qualquer outro).

- **Formato de exportação:** arquivo estruturado genérico (CSV com colunas comuns o suficiente para servir de referência manual em qualquer app de treino: dia, ordem, exercício, séries, repetições, descanso, observações) — não é formatado para importação automática em nenhum app específico
- **Alternativa em texto/PDF:** já que a maioria dos usuários provavelmente vai digitar manualmente o treino no app que já usa (como você faz hoje ao levar o treino gerado pro Hevy), vale considerar também uma exportação em texto corrido ou PDF, mais fácil de ler enquanto se digita em outro app do que um CSV cru — decisão de implementação, não bloqueia esta spec
- **Fase futura (fora de escopo desta spec e do PRD atual):** acompanhamento nativo de treino dentro do próprio produto, eliminando a necessidade de exportar para qualquer app de terceiros — mencionado aqui apenas para registrar a ideia, não é compromisso de roadmap

## 8. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/cycles` | POST | Cria novo `HealthCycle` com objetivo declarado, enfileira geração |
| `/cycles/:id` | GET | Retorna status, plano de ação e treino gerado |
| `/cycles/:id/workout/exercises/:exerciseId` | PUT | Edita um exercício do treino gerado |
| `/cycles/:id/feedback` | POST | Registra feedback/crítica do usuário e dispara regeneração ajustada |
| `/cycles/:id/export` | GET | Gera e retorna o arquivo estruturado genérico (CSV/PDF) do treino, para uso manual em qualquer app |
| `/cycles` | GET | Lista ciclos do usuário (histórico) |

## 9. Tratamento de erros e casos de borda

- **Geração falha** — `status: "failed"`, usuário notificado, opção de tentar novamente
- **Usuário sem nenhum dado além do objetivo** — plano genérico de qualidade ainda deve ser gerado (RF11); nunca retornar erro por "dado insuficiente"
- **Prescrição vazando como sugestão no texto gerado** — se o `actionPlanText` gerado mencionar ajuste/dose/início/fim de medicação, isso é falha de prompt, não comportamento aceitável; validar com checagem automática simples (busca por padrões como "aumente a dose", "pare de tomar") antes de apresentar ao usuário, sinalizando para nova geração se detectado
- **Feedback vago ou contraditório** (ex.: "não gostei") — sistema ainda envia à IA, mas o prompt de regeneração deve instruir a IA a manter o que funcionava e ajustar apenas o que o feedback aponta; se o feedback não der sinal suficiente, resultado pode vir pouco diferente do anterior — isso é aceitável, não é erro de sistema
- **Usuário envia múltiplos feedbacks em sequência rápida** — cada regeneração deve concluir (ou falhar) antes da próxima ser aceita; `status: "generating"` bloqueia novo `POST /cycles/:id/feedback` até resolver

## 10. Critérios de aceite

- [ ] Usuário consegue gerar plano e treino preenchendo apenas o objetivo, sem nenhum outro dado
- [ ] Plano gerado reflete dado disponível quando existe (ex.: menção a tendência de bioimpedância, se houver)
- [ ] Nenhum trecho do plano gerado sugere ajuste, dose, início ou fim de medicação/hormônio
- [ ] Usuário consegue editar o treino gerado antes de exportar
- [ ] Usuário consegue enviar feedback livre sobre o plano/treino e receber uma versão ajustada
- [ ] Treino completo está sempre visível em tela, independente de o usuário exportar ou não
- [ ] Exportação gera arquivo genérico, sem qualquer referência a um app de treino específico

## 11. Fora de escopo desta spec

- Prompt final de geração (plano + treino) — validado iterativamente na implementação
- Ajuste do próximo ciclo com base em adesão (RF18) — depende da spec de check-in semanal, ainda não feita
- Histórico de versões do plano/treino (cada regeneração por feedback substitui a anterior; só o texto do feedback fica registrado em `CycleFeedback`)
- Acompanhamento nativo de treino dentro do produto (mencionado na seção 7 como ideia futura, não é requisito desta spec)

---
*Próxima spec sugerida: 06 — Check-in semanal e fechamento do loop de engajamento (RF16-19), que fecha a lacuna de retenção entre ciclos de 3 meses.*
