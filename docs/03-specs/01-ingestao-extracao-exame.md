# Spec Técnica 01 — Ingestão e Extração de Exame Laboratorial via IA
**Metodologia:** SDD · **Status:** Rascunho v3 · **Data:** 27/08/2026
**Cobre:** RF01, RF04a, RF05, RF07, RNF03 (PRD Fase 1) · **Depende de:** Architecture Doc v3

---

## 1. Objetivo

Permitir que o usuário suba um exame laboratorial (PDF ou foto) e receba, após confirmação humana, os marcadores extraídos e estruturados, comparados ao histórico anterior do mesmo usuário quando existir.

## 2. Escopo desta spec

**Cobre:**
- Upload do arquivo (PDF/foto de exame laboratorial)
- Pipeline assíncrono de extração via API da Anthropic
- Tela/endpoint de confirmação humana dos marcadores extraídos
- Persistência do dado confirmado
- Comparação com exame anterior do mesmo usuário (tendência)

**Não cobre (specs futuras):**
- Upload de laudo de imagem (ultrassom) — spec separada, parser é diferente (texto livre, não marcador numérico)
- Geração de plano de ação/treino a partir do exame — spec separada
- Exportação de dado (RNF05)

## 3. Modelo de dados (proposta Prisma)

```prisma
model LabExam {
  id            String   @id @default(cuid())
  userId        String
  fileUrl       String   // referência ao objeto no S3, não o arquivo em si
  fileType      String   // "pdf" | "image"
  labSource     String?  // "fleury" | "dasa" | "hermes_pardini" | "generic" | null
  status        String   // "uploaded" | "processing" | "pending_confirmation" | "confirmed" | "failed"
  examDate      DateTime? // data do exame (extraída ou informada pelo usuário)
  createdAt     DateTime @default(now())
  confirmedAt   DateTime?

  markers       LabMarker[]

  @@index([userId, examDate])
}

model LabMarker {
  id            String   @id @default(cuid())
  labExamId     String
  name          String   // nome do marcador (ex.: "Glicose em jejum")
  value         Float
  unit          String   // ex.: "mg/dL"
  referenceMin  Float?
  referenceMax  Float?
  rawExtracted  Json     // payload bruto retornado pela IA, para auditoria/debug
  userCorrected Boolean  @default(false) // true se o usuário editou o valor extraído
  trend         String?  // "up" | "down" | "stable" | null (calculado, não vem da IA)

  labExam       LabExam  @relation(fields: [labExamId], references: [id])

  @@index([labExamId])
}
```

**Nota de segurança (RNF01):** esta tabela fica no schema de dado sensível, fisicamente separada de `User`/`Account`, conforme Architecture Doc seção 3. `fileUrl` nunca é uma URL pública — sempre uma referência a objeto S3 privado, resolvida em URL assinada de curta duração no momento do uso.

### 3.1 Comunicação ao usuário no momento da coleta

Antes ou durante o upload, a tela deve comunicar de forma breve e não alarmista:
- **Por que pedimos:** seus marcadores de exame ajudam a personalizar seu plano de ação (treino, nutrição e sono) e a acompanhar sua evolução ao longo do tempo, comparando com exames anteriores
- **O que não fazemos:** não emitimos diagnóstico nem análise médica — a leitura clínica dos seus resultados continua sendo do seu médico. Este texto reforça, no momento da coleta, o mesmo disclaimer clínico já exigido em toda tela de interpretação (RNF02 do PRD)

## 4. Fluxo técnico

1. **Upload** — cliente (app mobile) solicita URL assinada de upload ao backend → sobe o arquivo direto pro S3 privado → confirma ao backend que o upload terminou
2. **Registro** — backend cria `LabExam` com `status: "uploaded"`, enfileira job assíncrono
3. **Extração (job assíncrono)** — job busca o arquivo do S3, envia para a API da Anthropic com prompt estruturado pedindo extração de marcadores em JSON (nome, valor, unidade, faixa de referência min/max, data do exame se identificável no documento)
4. **Resultado** — job grava os `LabMarker` extraídos com `userCorrected: false`, atualiza `LabExam.status: "pending_confirmation"`, dispara notificação ao usuário (RNF04 — processamento assíncrono)
5. **Confirmação humana (RNF03 — obrigatória)** — usuário abre a tela de revisão, vê cada marcador extraído, pode editar valor/unidade/faixa antes de confirmar. Nenhum marcador é usado em plano de ação, dashboard ou correlação enquanto `LabExam.status != "confirmed"`
6. **Confirmação** — ao confirmar, `LabExam.status: "confirmed"`, `confirmedAt` preenchido, qualquer marcador editado marcado com `userCorrected: true`
7. **Cálculo de tendência (RF07)** — após confirmação, sistema busca o `LabMarker` de mesmo `name` **e mesma `unit`** no `LabExam` confirmado anterior do mesmo usuário (se existir) e calcula `trend` (up/down/stable, com margem de tolerância a definir — sugestão inicial: variação <5% = stable). **Regra de segurança obrigatória:** se o marcador de mesmo nome existir no exame anterior mas com `unit` diferente (ex.: "pg/mL" vs. "ng/dL"), o sistema **não deve comparar os valores numéricos brutos** — trata como se não houvesse exame anterior comparável e retorna `trend: null`. Nunca inferir ou converter unidade automaticamente nesta spec (ver seção 8); comparar valores em unidades diferentes sem conversão pode produzir uma tendência **invertida e enganosa**, o que é pior do que não ter tendência nenhuma.

## 5. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/exams/upload-url` | POST | Retorna URL assinada do S3 para upload direto do cliente |
| `/exams` | POST | Registra o `LabExam` após upload concluído, enfileira extração |
| `/exams/:id` | GET | Retorna status e, se disponível, marcadores extraídos para revisão |
| `/exams/:id/confirm` | POST | Recebe marcadores confirmados/editados pelo usuário, persiste como confirmado |
| `/exams` | GET | Lista exames do usuário (histórico) |

## 6. Tratamento de erros e casos de borda

- **Extração falha ou retorna vazio** — `LabExam.status: "failed"`, usuário notificado, opção de tentar novamente ou inserir manualmente
- **Arquivo ilegível/não é exame de sangue** — IA deve retornar sinalização explícita de "não identificado como exame laboratorial" em vez de inventar marcadores; `status: "failed"` com mensagem clara
- **Usuário sem exame anterior** — `trend: null`, RF07 não bloqueia o fluxo (consistente com RF04a — dado ausente não trava o produto)
- **Mesmo marcador (nome idêntico) com unidade diferente entre exames** (ex.: DHT em "pg/mL" num exame e "ng/dL" no outro, mesmo laboratório ou não) — `trend: null`, nunca comparação numérica direta. Risco real e confirmado: dois laboratórios podem usar o mesmo nome de marcador com unidades diferentes, e a diferença de escala pode inverter a leitura de tendência se comparada sem conversão
- **Mesmo marcador com nomes diferentes entre labs** (ex.: "Glicose" vs. "Glicose em jejum") — fora de escopo desta spec definir normalização; anotar como risco técnico para spec de comparação histórica

## 7. Critérios de aceite

- [ ] Usuário consegue subir PDF ou foto e ver status mudar de "uploaded" → "processing" → "pending_confirmation"
- [ ] Nenhum marcador aparece em outra tela do produto antes de `status: "confirmed"`
- [ ] Usuário consegue editar qualquer valor extraído antes de confirmar
- [ ] Ao confirmar um segundo exame, marcadores em comum com o primeiro mostram tendência
- [ ] Marcador de mesmo nome mas unidade diferente entre exames retorna `trend: null`, nunca uma comparação numérica direta entre unidades incompatíveis
- [ ] Falha de extração não deixa o usuário travado — sempre há caminho de retry ou entrada manual
- [ ] Tela de upload exibe o texto de "por que pedimos esse dado" e o reforço de que não há diagnóstico/análise médica, antes do usuário concluir o envio

## 8. Fora de escopo desta spec

- Definição final do prompt de extração (fica como tarefa de implementação, validada com amostra real de exames conforme Architecture Doc seção 4)
- Normalização de nomes de marcadores entre labs diferentes
- **Conversão automática de unidade entre marcadores equivalentes** (ex.: converter "ng/dL" para "pg/mL" automaticamente para viabilizar comparação) — quando a unidade diverge, a regra desta spec é `trend: null` (seção 4, passo 7), nunca converter e comparar. Conversão automática é candidata a spec futura, mas exige tabela de equivalência validada por revisão de qualidade, não é decisão trivial de código
- UI/UX detalhada da tela de confirmação (spec de produto/design separada, se necessário)

---
*Próxima spec sugerida: 02 — Upload e resumo de laudo de imagem (ultrassom).*
