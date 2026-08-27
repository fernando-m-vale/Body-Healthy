# Spec Técnica 02 — Upload e Resumo de Laudo de Imagem
**Metodologia:** SDD · **Status:** Rascunho v3 · **Data:** 27/08/2026
**Cobre:** RF02, RF06 (PRD Fase 1) · **Depende de:** Architecture Doc v3, Spec 01 (padrão de upload reaproveitado)

---

## 1. Objetivo

Permitir que o usuário suba um laudo de imagem (ex.: ultrassom de abdômen) e receba um resumo em linguagem simples dos achados relevantes, revisável antes de entrar na linha do tempo de saúde.

## 2. Diferença em relação à Spec 01

O exame laboratorial (Spec 01) tem marcadores numéricos discretos (valor, unidade, faixa de referência) — extração é estruturada. O laudo de imagem é texto médico livre (parágrafos descritivos, "achados", "impressão diagnóstica") — extração aqui é **resumo interpretativo em linguagem simples**, não parsing de campos. O pipeline de upload é o mesmo (reaproveita o padrão S3 + job assíncrono da Spec 01); a diferença está no que a IA produz e como o usuário revisa.

## 3. Escopo desta spec

**Cobre:**
- Upload do arquivo (PDF/foto de laudo de imagem)
- Pipeline assíncrono de resumo via API da Anthropic
- Tela/endpoint de revisão do resumo pelo usuário
- Persistência do laudo + resumo, vinculado à linha do tempo do usuário

**Não cobre:**
- Comparação estruturada entre laudos de imagem ao longo do tempo (achados em texto livre não são diretamente comparáveis como marcador numérico — fica como risco documentado, não como requisito desta spec)
- Correlação visual na linha do tempo (RF09) — spec separada do dashboard consome este dado, não o gera

## 4. Modelo de dados (proposta Prisma)

```prisma
model ImagingReport {
  id            String   @id @default(cuid())
  userId        String
  fileUrl       String   // referência ao objeto no S3 privado
  fileType      String   // "pdf" | "image"
  reportType    String?  // ex.: "ultrassom_abdome" — livre, sem enum fechado no MVP
  examDate      DateTime? // data do laudo (extraída ou informada pelo usuário)
  status        String   // "uploaded" | "processing" | "pending_review" | "reviewed" | "failed"
  aiSummary     String?  // resumo em linguagem simples gerado pela IA
  rawFindings   Json?    // achados brutos extraídos, para auditoria/debug
  userFlagged   Boolean  @default(false) // true se usuário sinalizar que o resumo não reflete o laudo
  reviewedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([userId, examDate])
}
```

**Nota de segurança:** mesma regra da Spec 01 — tabela no schema de dado sensível, `fileUrl` sempre referência a objeto privado, nunca URL pública direta.

### 4.1 Comunicação ao usuário no momento da coleta

- **Por que pedimos:** o resumo do laudo de imagem entra no seu histórico de saúde e ajuda a contextualizar sua evolução junto com exames e bioimpedância, alimentando seu plano de ação (treino, nutrição e sono)
- **O que não fazemos:** o resumo é informativo, em linguagem simples — não é interpretação médica nem substitui a leitura do seu médico sobre o laudo original (mesmo reforço do disclaimer clínico, RNF02)

## 5. Fluxo técnico

1. **Upload** — mesmo padrão da Spec 01: URL assinada → upload direto ao S3 → confirmação ao backend
2. **Registro** — backend cria `ImagingReport` com `status: "uploaded"`, enfileira job assíncrono
3. **Resumo (job assíncrono)** — job busca o arquivo do S3, envia para a API da Anthropic com prompt estruturado pedindo: (a) resumo em linguagem simples dos achados relevantes, (b) identificação de qualquer achado fora do padrão de referência mencionado no próprio laudo, (c) data do exame se identificável
4. **Resultado** — job grava `aiSummary` e `rawFindings`, atualiza `status: "pending_review"`, dispara notificação (RNF04)
5. **Revisão humana** — usuário abre o resumo, lê o texto gerado. Diferente da Spec 01, não há edição de campo estruturado (é texto), mas o usuário pode: (a) aceitar o resumo como está, ou (b) marcar `userFlagged: true` com um comentário livre se sentir que o resumo não reflete o laudo original
6. **Ação após sinalização** — quando o usuário sinaliza um resumo como incorreto, o sistema oferece três opções explícitas, nenhuma delas automática:
   - **Tentar reprocessar** — reenvia o mesmo arquivo (já no S3) para um novo job de resumo; `status` volta para `"processing"`, `aiSummary`/`rawFindings` anteriores são preservados em histórico até o reprocessamento concluir, para não perder o dado caso o usuário desista no meio
   - **Enviar outro arquivo** — usuário sobe um novo arquivo; o `ImagingReport` sinalizado é marcado `status: "discarded"` e um novo registro é criado seguindo o fluxo normal (passo 1)
   - **Não subir agora** — usuário opta por não prosseguir; `status: "discarded"`, arquivo permanece no S3 (não é excluído automaticamente, respeitando RNF05 de portabilidade), mas não aparece na linha do tempo
7. **Confirmação** — ao revisar e aceitar (sem sinalizar), `status: "reviewed"`, `reviewedAt` preenchido, resumo passa a aparecer na linha do tempo (RF09, consumido por spec de dashboard)

## 6. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/imaging-reports/upload-url` | POST | Retorna URL assinada do S3 (reaproveita mesmo endpoint padrão da Spec 01, com parâmetro de tipo) |
| `/imaging-reports` | POST | Registra o `ImagingReport` após upload concluído, enfileira resumo |
| `/imaging-reports/:id` | GET | Retorna status e, se disponível, resumo para revisão |
| `/imaging-reports/:id/review` | POST | Marca como revisado — aceito (`status: "reviewed"`) ou sinalizado (`userFlagged: true`), com comentário opcional |
| `/imaging-reports/:id/retry` | POST | Reprocessa o mesmo arquivo (após sinalização) — reenfileira job de resumo |
| `/imaging-reports/:id/discard` | POST | Marca como descartado (`status: "discarded"`) — usado tanto para "enviar outro arquivo" quanto "não subir agora" |
| `/imaging-reports` | GET | Lista laudos de imagem do usuário (histórico) |

## 7. Tratamento de erros e casos de borda

- **Resumo falha ou retorna vazio** — `status: "failed"`, usuário notificado, opção de tentar novamente
- **Arquivo não é laudo de imagem médico** — IA deve sinalizar explicitamente "não identificado como laudo de imagem" em vez de forçar um resumo; `status: "failed"` com mensagem clara
- **Laudo com achado que soa grave** — resumo deve manter linguagem informativa, nunca alarmista, e sempre reforçar o disclaimer clínico (RNF02) de que não substitui avaliação médica
- **Usuário sinaliza resumo incorreto (`userFlagged: true`)** — sistema apresenta as três opções da seção 5 (passo 6); dado sinalizado não entra na linha do tempo até nova revisão bem-sucedida
- **Usuário sinaliza mas fecha o app sem escolher uma opção** — `ImagingReport` permanece com `userFlagged: true` e `status: "pending_review"`; ao reabrir, sistema retoma a mesma tela de opções (não perde o estado)

## 8. Critérios de aceite

- [ ] Usuário consegue subir PDF ou foto de laudo de imagem e ver status mudar de "uploaded" → "processing" → "pending_review"
- [ ] Resumo gerado usa linguagem simples, não jargão médico não explicado
- [ ] Toda tela de resumo exibe o disclaimer clínico (RNF02)
- [ ] Usuário consegue sinalizar um resumo como incorreto sem que isso quebre o fluxo
- [ ] Ao sinalizar, usuário vê claramente as três opções (reprocessar, enviar outro arquivo, não subir agora) e o sistema executa a escolhida
- [ ] Falha de geração de resumo não deixa o usuário travado — sempre há caminho de retry
- [ ] Tela de upload exibe o texto de "por que pedimos esse dado" e o reforço de que não há diagnóstico/análise médica, antes do usuário concluir o envio

## 9. Fora de escopo desta spec

- Prompt final de resumo (validar com amostra real de laudos, mesmo princípio da Spec 01)
- Estrutura de dado comparável entre laudos de imagem ao longo do tempo
- Limite de tentativas de reprocessamento (ex.: quantas vezes o usuário pode tentar antes de o sistema sugerir contato com suporte) — fica como decisão de produto a definir na implementação

---
*Próxima spec sugerida: 03 — Registro de bioimpedância (série temporal).*
