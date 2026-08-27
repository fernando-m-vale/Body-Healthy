# Spec Técnica 03 — Registro de Bioimpedância (Série Temporal)
**Metodologia:** SDD · **Status:** Rascunho v3 · **Data:** 27/08/2026
**Cobre:** RF03, RF04a, RF08 (PRD Fase 1) · **Depende de:** Architecture Doc v3

---

## 1. Objetivo

Permitir que o usuário registre manualmente os resultados de bioimpedância de cada ciclo (peso, % gordura, massa magra, e demais métricas do aparelho usado), formando uma série temporal consultável.

## 2. Diferença em relação às Specs 01 e 02

Não há upload de arquivo nem extração via IA aqui — é entrada manual de dado numérico estruturado. É a spec mais simples das três funcionalidades de ingestão, mas ainda assim dado de saúde sensível (mesmas regras de isolamento e criptografia do Architecture Doc se aplicam).

## 3. Escopo desta spec

**Cobre:**
- Registro manual de uma medição de bioimpedância (formulário estruturado)
- Edição e exclusão de uma medição já registrada
- Listagem da série temporal de medições do usuário

**Não cobre:**
- Renderização do gráfico de evolução (RF08 na camada visual) — spec de dashboard consome este dado, não o gera
- Importação automática de dado de aparelho de bioimpedância (nenhum aparelho tem integração na Fase 1 — ver seção 8)
- Correlação visual com exames/prescrições na mesma linha do tempo (RF09) — spec de dashboard

## 4. Modelo de dados (proposta Prisma)

```prisma
model BioimpedanceEntry {
  id              String   @id @default(cuid())
  userId          String
  measuredAt      DateTime // data da medição, informada pelo usuário
  weightKg        Float?
  bodyFatPercent  Float?
  leanMassKg      Float?
  extraMetrics    Json?    // demais métricas do aparelho usado (ex.: gordura visceral,
                            // água corporal, taxa metabólica basal) — schema livre,
                            // já que varia por fabricante de aparelho
  deviceName      String?  // ex.: "InBody 270" — informativo, sem validação de formato
  notes           String?  // campo livre opcional
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, measuredAt])
}
```

**Nota:** todos os campos numéricos são opcionais (RF04a — nada bloqueia o registro). Na prática, o formulário deve orientar o usuário a preencher ao menos peso e % de gordura para o dado ter utilidade mínima, mas o backend não deve rejeitar um registro parcial.

**Nota de segurança:** mesma regra das Specs 01/02 — tabela no schema de dado sensível, mesmas políticas de acesso e auditoria do Architecture Doc seção 3.

### 4.1 Comunicação ao usuário no momento da coleta

- **Por que pedimos:** sua composição corporal ajuda a personalizar seu objetivo de treino (ganho de massa magra, perda de gordura, manutenção) e a acompanhar sua evolução ao longo do tempo
- **O que não fazemos:** não fazemos diagnóstico nem análise médica a partir desse dado — é usado apenas para personalizar seu plano de ação (mesmo reforço do disclaimer clínico, RNF02)

## 5. Fluxo técnico

1. Usuário abre formulário de novo registro de bioimpedância, preenche os campos que tiver disponíveis (nenhum obrigatório além da data da medição)
2. Backend persiste o registro imediatamente — **não há pipeline assíncrono nesta spec**, é escrita síncrona (sem IA envolvida)
3. Usuário pode editar ou excluir um registro já feito, a qualquer momento
4. Ao listar a série temporal, backend retorna os registros ordenados por `measuredAt`, cada um acompanhado do **cálculo de tendência** (ver seção 6.1), pronto para consumo pela camada de dashboard (spec futura)

### 5.1 Cálculo de tendência

Diferente do exame laboratorial (Spec 01, onde a tendência é calculada e persistida no momento da confirmação), a tendência de bioimpedância é **calculada dinamicamente na leitura**, não armazenada no registro — porque registros de bioimpedância podem ser editados ou excluídos livremente (seção 3), e uma tendência gravada ficaria desatualizada. Regras:

- Calculada por métrica (`weightKg`, `bodyFatPercent`, `leanMassKg`) comparando o registro mais recente com o imediatamente anterior, ordenados por `measuredAt`
- Mesma tolerância usada na Spec 01: variação absoluta menor que 5% do valor anterior = `"stable"`; acima disso, `"up"` ou `"down"` conforme o sentido
- Se algum dos dois registros comparados não tiver a métrica preenchida (campo opcional, RF04a), a tendência dessa métrica retorna `null` — nunca inventa comparação com dado ausente
- Sem registro anterior (primeira medição do usuário), tendência de todas as métricas retorna `null`

## 6. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/bioimpedance` | POST | Cria um novo registro de bioimpedância |
| `/bioimpedance/:id` | PUT | Edita um registro existente |
| `/bioimpedance/:id` | DELETE | Exclui um registro existente |
| `/bioimpedance` | GET | Lista os registros do usuário, ordenados por data, cada um com `trend` calculado por métrica (`weightKg`, `bodyFatPercent`, `leanMassKg`: `"up"` \| `"down"` \| `"stable"` \| `null`) |

## 7. Tratamento de erros e casos de borda

- **Registro com todos os campos numéricos vazios** — aceito (RF04a), mas backend deve exigir ao menos `measuredAt` preenchido, já que um registro sem data não tem utilidade em série temporal
- **Valor numérico fora de faixa plausível** (ex.: peso negativo, % gordura > 100) — validação de sanidade no backend, rejeita com mensagem clara, sem tentar "corrigir" o valor
- **Duas medições no mesmo dia** — permitido; não há regra de unicidade por data, o usuário pode ter medido em momentos diferentes ou corrigido um registro duplicado manualmente
- **Edição ou exclusão de um registro que estava sendo usado como base de comparação** — como a tendência é calculada dinamicamente (não persistida), isso se resolve sozinho na próxima leitura; não requer lógica de recálculo em cascata

## 7.1 Critérios de aceite

- [ ] Usuário consegue registrar bioimpedância preenchendo só alguns campos, sem bloqueio
- [ ] Segunda medição em diante mostra tendência (`up`/`down`/`stable`) por métrica, comparada à medição anterior
- [ ] Métrica ausente em um dos dois registros comparados retorna tendência `null`, nunca um valor inventado
- [ ] Editar ou excluir um registro antigo reflete corretamente na tendência calculada nas próximas leituras, sem exigir ação manual do usuário
- [ ] Tela de registro exibe o texto de "por que pedimos esse dado" e o reforço de que não há diagnóstico/análise médica

## 8. Fora de escopo desta spec

- Integração com aparelhos de bioimpedância (ex.: importação via Bluetooth/API do fabricante) — nenhum aparelho específico foi validado nem priorizado; candidato a reavaliação futura, mesmo princípio da exportação/importação do Hevy no PRD (RF17)
- Renderização gráfica

---
*Próxima spec sugerida: 04 — Linha do tempo de prescrições (medicação/hormônios).*
