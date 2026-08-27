# Spec Técnica 07 — Dashboard Consolidado
**Metodologia:** SDD · **Status:** Rascunho v1 · **Data:** 27/08/2026
**Cobre:** RF14, RF15 (PRD Fase 1) · **Depende de:** Specs 00, 01-06 (todas as fontes de dado)

---

## 1. Objetivo

Consolidar, numa única visão, a evolução do usuário ao longo do tempo — exames, bioimpedância, prescrições, ciclos gerados, adesão e calorias — e permitir o histórico isolado de um marcador específico.

## 2. Por que essa spec é diferente de todas as anteriores

Esta spec **não introduz nenhum dado novo** — é a primeira que só **lê e organiza** o que as Specs 00-06 já produzem. Não há model novo além de DTOs de resposta (estruturas de retorno de API); a complexidade aqui é de agregação e regras de exibição, não de armazenamento.

## 3. Escopo desta spec

**Cobre:**
- Linha do tempo consolidada (RF14): exames confirmados, laudos revisados, bioimpedância, prescrições, ciclos gerados — todos numa mesma visão cronológica
- Histórico isolado de um marcador específico (RF15)
- Reaplicação das mesmas regras de "só dado confirmado/revisado aparece" já estabelecidas nas Specs 01-04

**Não cobre:**
- Renderização visual (gráficos, layout) — spec de produto/design
- Qualquer cálculo novo (tendência, meta calórica, adesão) — todos já calculados nas specs de origem; esta spec só consulta

## 4. Regras de composição da linha do tempo (RF14)

A linha do tempo é uma **agregação de leitura**, montada a partir das fontes já existentes, respeitando as mesmas regras de status de cada uma:

| Fonte | Regra de inclusão |
|---|---|
| `LabExam` (Spec 01) | Somente `status: "confirmed"` |
| `ImagingReport` (Spec 02) | Somente `status: "reviewed"` e `userFlagged: false` |
| `BioimpedanceEntry` (Spec 03) | Todos os registros |
| `PrescriptionEntry` (Spec 04) | Todos os registros — decifrados apenas no momento da resposta, com log de auditoria (mesma regra da Spec 04, seção 5) |
| `HealthCycle` (Spec 05) | Somente `status: "generated"` (ciclo com plano/treino prontos) |
| `WeeklyCheckIn` / `DailyCalorieLog` (Spec 06) | Todos os registros, agrupados por semana/dia na exibição |

**Regra crítica (reforço de RF09):** a linha do tempo apresenta os itens lado a lado, cronologicamente — nunca gera texto interpretativo conectando um item a outro (ex.: nunca "seu colesterol caiu depois que você começou X medicação"). Qualquer leitura de causa/efeito é do usuário, olhando a linha do tempo, não do sistema.

## 5. Histórico de marcador isolado (RF15)

- Usuário seleciona um marcador pelo nome (ex.: "Glicose em jejum")
- Sistema retorna todos os `LabMarker` (Spec 01) com esse `name`, de todos os `LabExam` confirmados do usuário, ordenados cronologicamente, com o `trend` já calculado de cada um
- **Risco já documentado (Spec 01, seção 6):** nomes diferentes entre labs para o mesmo marcador (ex.: "Glicose" vs. "Glicose em jejum") não são normalizados nesta spec nem em nenhuma anterior — a busca é por correspondência exata de nome. Se isso gerar problema real de uso, é uma spec de normalização a ser criada depois, não um ajuste implícito aqui

## 6. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/dashboard/timeline` | GET | Retorna a linha do tempo consolidada (todas as fontes da seção 4), com paginação/filtro por período |
| `/dashboard/markers/:markerName` | GET | Retorna o histórico completo de um marcador específico |
| `/dashboard/current-cycle` | GET | Retorna resumo do ciclo ativo: `dailyCalorieGoal`, `nextCycleExpectedDate` e contagem regressiva calculada (RF19), adesão do ciclo em andamento |

## 7. Tratamento de erros e casos de borda

- **Usuário sem nenhum dado em nenhuma fonte** — retorna linha do tempo vazia, não erro; tela deve orientar para o primeiro upload/registro
- **Marcador pesquisado nunca apareceu em nenhum exame do usuário** — retorna lista vazia, não erro
- **Ciclo ativo sem `dailyCalorieGoal` ou `nextCycleExpectedDate`** — `current-cycle` retorna esses campos como `null`, sem quebrar o restante da resposta

## 8. Critérios de aceite

- [ ] Linha do tempo mostra apenas dado confirmado/revisado, nunca pendente (mesma regra da Spec 05, seção 5)
- [ ] Linha do tempo nunca inclui texto gerado conectando prescrição a mudança de marcador
- [ ] Histórico de marcador isolado retorna tendência já calculada, sem recalcular nesta spec
- [ ] Resposta de `current-cycle` funciona corretamente mesmo com meta calórica ou data de próximo ciclo ausentes

## 9. Fora de escopo desta spec

- Normalização de nomes de marcador entre labs diferentes (risco documentado desde a Spec 01)
- Renderização gráfica/visual
- Qualquer novo cálculo — esta spec é puramente de leitura e composição

---
*Com as Specs 00, 01-07, a Fase 1 está funcionalmente completa em documentação técnica: cadastro/consentimento/perfil, ingestão, geração de plano/treino/meta calórica, engajamento entre ciclos, e a visão consolidada de tudo isso.*
