# Spec Técnica 06 — Check-in Semanal e Fechamento do Loop de Engajamento
**Metodologia:** SDD · **Status:** Rascunho v2 · **Data:** 27/08/2026
**Cobre:** RF16, RF17, RF18, RF19, RF22 (PRD Fase 1) · **Depende de:** Spec 05 v3 (ciclo/plano/treino/meta calórica), Architecture Doc v3

---

## 1. Objetivo

Dar ao usuário um motivo real de voltar ao produto entre ciclos de exame (tipicamente a cada 3 meses), através de um check-in semanal leve, registro de progressão de treino executado fora do produto, e uso desses dados para ajustar o próximo ciclo — resolvendo o risco de retenção identificado para uma assinatura mensal.

## 2. Por que essa spec existe

As Specs 01-05 cobrem o "pico" de valor (upload de exame → plano gerado). Sozinho, esse fluxo só entrega valor a cada 3 meses — incompatível com cobrança mensal. Esta spec cobre o "vale" entre ciclos: o que faz o usuário abrir o app na semana 3 de um ciclo de 12.

## 3. Escopo desta spec

**Cobre:**
- Check-in semanal leve (peso, adesão ao treino, energia/sono) — RF16
- Registro de progressão de treino executado fora do produto, em nível de detalhe à escolha do usuário — RF17
- Agregação de adesão/progressão para uso como contexto no próximo ciclo — RF18 (a lógica de geração em si já está na Spec 05; esta spec define o dado que alimenta aquela lógica)
- Contagem regressiva até o próximo ciclo de exames — RF19 (cálculo; a renderização visual é da spec de dashboard)
- Registro manual diário de calorias consumidas, comparado à meta calórica do ciclo — RF22

**Não cobre:**
- Renderização visual do dashboard (spec de produto/design separada)
- Notificação/lembrete push para o usuário fazer o check-in — mencionado como necessário para o ritual funcionar, mas fica como decisão de implementação (canal de notificação já é responsabilidade de RNF04 nas specs anteriores, não desta spec)
- Reconhecimento de refeição por foto ou detalhamento de macronutrientes (fora de escopo do PRD inteiro, Fase 2) — este é registro manual do total, nada além disso

## 4. Modelo de dados (proposta Prisma)

```prisma
model WeeklyCheckIn {
  id                String   @id @default(cuid())
  userId            String
  healthCycleId     String?  // ciclo ativo no momento do check-in, se houver (RF04a — pode ser null)
  weekStartDate     DateTime // início da semana de referência (ex.: sempre a segunda-feira da semana)
  weightKg          Float?
  workoutAdherence  String?  // "completo" | "parcial" | "nao_realizado" | null
  energyLevel       Int?     // escala simples 1-5
  sleepQuality      Int?     // escala simples 1-5
  createdAt         DateTime @default(now())

  @@unique([userId, weekStartDate])
  @@index([userId, weekStartDate])
}

model WorkoutExecutionLog {
  id                  String   @id @default(cuid())
  userId              String
  workoutExerciseId   String?  // referência ao exercício gerado na Spec 05, se o log for vinculado a ele
  exerciseNameFreeText String? // usado quando o usuário loga algo fora do treino gerado
  performedAt         DateTime
  setsCompleted       Int?
  repsCompleted       String?
  weightUsedKg        Float?
  notes               String?
  createdAt           DateTime @default(now())

  @@index([userId, performedAt])
}

model DailyCalorieLog {
  id                String   @id @default(cuid())
  userId            String
  healthCycleId     String?  // ciclo ativo no momento do registro, se houver
  logDate           DateTime // dia a que o registro se refere
  caloriesConsumed  Int?
  notes             String?  // observação livre opcional (ex.: "dia de evento social")
  createdAt         DateTime @default(now())

  @@unique([userId, logDate])
  @@index([userId, logDate])
}
```

**Nota:** todos os campos de `WeeklyCheckIn` além de `weekStartDate` são opcionais — consistente com RF04a, ausência de check-in numa semana não é erro nem bloqueia nada, apenas significa que aquela semana fica sem dado. O mesmo vale para `DailyCalorieLog`: um dia sem registro não é erro, apenas um dia sem dado — nunca há reconhecimento de refeição por foto ou detalhamento de macro/alimento individual nesta spec, só o total diário informado pelo próprio usuário.

## 5. Extensão ao modelo da Spec 05 (já aplicada na v3)

Esta spec depende de campos que foram adicionados ao model `HealthCycle` na Spec 05 v3:

- `nextCycleExpectedDate: DateTime?` — data esperada do próximo acompanhamento médico, informada pelo usuário (opcional; sem ela, RF19 não tem o que contar regressivamente, e a tela deve tratar isso como "não informado", não como erro)
- `dailyCalorieGoal: Int?` — meta calórica calculada pela Spec 05 (seção 5.1), consumida por RF22 nesta spec como referência de comparação

## 6. Regra de agregação de adesão para o próximo ciclo (RF18)

Ao gerar um novo `HealthCycle` (Spec 05, seção 6, passo 2 — "Agregação"), o `contextSnapshot` passa a incluir também:

- Taxa de adesão do ciclo anterior: proporção de `WeeklyCheckIn.workoutAdherence` marcados como `"completo"` entre todas as semanas do ciclo anterior que tiveram check-in preenchido
- Semanas sem check-in não contam nem a favor nem contra a taxa (dado ausente não é o mesmo que adesão zero)
- Se o ciclo anterior teve menos de 2 check-ins preenchidos, a taxa de adesão **não** entra no contexto — dado insuficiente para significar algo, evita a IA tirar conclusão de amostra pequena
- O prompt de geração (Spec 05) deve ser instruído a usar essa taxa apenas para calibrar volume/intensidade do novo treino (ex.: adesão baixa → considerar plano mais simples/curto no próximo ciclo), nunca como julgamento sobre o usuário

## 7. Registro diário de calorias (RF22)

- Usuário registra, dia a dia, o total de calorias consumidas — um número, sem detalhamento de alimento ou macro, sem foto
- Comparação com `HealthCycle.dailyCalorieGoal` (Spec 05) acontece na leitura, não na escrita — mesmo princípio da tendência de bioimpedância (Spec 03): calculado dinamicamente, nunca persistido, para não ficar desatualizado se o usuário editar um registro
- Se o ciclo ativo não tem `dailyCalorieGoal` calculado (perfil ou peso ausentes — Spec 05, seção 5.1), o registro de calorias ainda é aceito normalmente, só não há meta pra comparar naquele momento
- Toda tela que exibe a comparação reforça que é uma estimativa informativa, não orientação nutricional individualizada (RNF02)

## 8. Fluxo técnico

1. **Check-in semanal (RF16)** — usuário abre tela leve (peso, adesão, energia, sono), preenche o que quiser, submete; `WeeklyCheckIn` é criado/atualizado (upsert por `userId` + `weekStartDate`, já que pode haver correção na mesma semana)
2. **Registro de progressão detalhada (RF17, opcional)** — usuário pode, a qualquer momento, registrar `WorkoutExecutionLog` vinculado a um exercício do treino gerado (Spec 05) ou como texto livre, no nível de detalhe que quiser (de "fiz o treino de hoje" até carga/série/repetição por exercício)
3. **Registro diário de calorias (RF22, opcional)** — usuário pode, a qualquer momento, registrar `DailyCalorieLog` com o total do dia; upsert por `userId` + `logDate` (permite correção)
4. **Consulta de progresso** — endpoint retorna a série de check-ins, logs de execução e logs de calorias (com comparação à meta) do ciclo atual, para consumo do dashboard (spec futura)
5. **Ao iniciar novo ciclo (Spec 05)** — agregação de adesão (seção 6 desta spec) é aplicada automaticamente, sem ação extra do usuário

## 9. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/check-ins` | POST | Cria ou atualiza o check-in da semana atual (upsert) |
| `/check-ins` | GET | Lista check-ins do usuário, com filtro opcional por ciclo |
| `/workout-logs` | POST | Registra um log de execução de treino (vinculado a exercício ou livre) |
| `/workout-logs` | GET | Lista logs de execução do usuário, com filtro opcional por período |
| `/calorie-logs` | POST | Cria ou atualiza o registro de calorias do dia (upsert) |
| `/calorie-logs` | GET | Lista registros de calorias do usuário, cada um com a comparação à `dailyCalorieGoal` do ciclo vigente na data, quando existir |
| `/cycles/:id/next-cycle-date` | PUT | Define/atualiza `nextCycleExpectedDate` do ciclo ativo |

## 10. Tratamento de erros e casos de borda

- **Check-in duplicado na mesma semana** — não é erro; segundo envio atualiza o primeiro (upsert), permitindo correção
- **`weekStartDate` fora do padrão esperado** (ex.: usuário tenta registrar check-in de uma semana muito no passado ou futuro) — aceito sem bloqueio; não há regra de janela de tempo nesta spec, mas pode ser considerado na UI (não bloqueante)
- **Log de execução sem `workoutExerciseId` nem `exerciseNameFreeText`** — rejeitado; precisa de ao menos um identificador do que foi executado
- **`nextCycleExpectedDate` não informada** — RF19 exibe estado neutro ("data não informada"), nunca um erro ou contagem incorreta
- **Registro de calorias sem meta calórica disponível no ciclo** — aceito normalmente; comparação simplesmente não é exibida
- **Valor de calorias implausível** (ex.: número negativo, ou extremamente alto/baixo) — validação de sanidade básica, rejeita com mensagem clara, sem tentar "corrigir" o valor

## 11. Critérios de aceite

- [ ] Usuário consegue fazer check-in em menos de 1 minuto, preenchendo só o que quiser
- [ ] Usuário consegue corrigir o check-in da semana atual sem criar duplicata
- [ ] Usuário consegue registrar progressão de treino em qualquer nível de detalhe, do simples ao granular
- [ ] Ciclo anterior com poucos check-ins (menos de 2) não influencia a geração do próximo ciclo
- [ ] Taxa de adesão calculada corretamente ignora semanas sem check-in (não trata ausência como zero)
- [ ] Ausência de `nextCycleExpectedDate` não gera erro, apenas estado "não informado"
- [ ] Usuário consegue registrar calorias do dia sem foto ou detalhamento de alimento
- [ ] Comparação com a meta calórica aparece apenas quando `dailyCalorieGoal` existe, sem erro quando não existe
- [ ] Toda exibição de comparação de calorias reforça que é estimativa informativa

## 12. Fora de escopo desta spec

- Notificação/lembrete para o usuário fazer o check-in
- Renderização do dashboard e da contagem regressiva visual
- Qualquer forma de "gamificação" (streak, pontuação) — não há requisito do PRD pedindo isso
- Reconhecimento de refeição por foto, contagem de macronutrientes, ou banco de alimentos (Fase 2, fora do PRD atual)

---
*Com as Specs 00, 01-06, o núcleo completo da Fase 1 está especificado: perfil, ingestão, geração de plano/treino/meta calórica, e o loop de retenção entre ciclos.*
