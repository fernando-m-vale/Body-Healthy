# Spec Técnica 08 — Portabilidade de Dado e Exclusão de Conta
**Metodologia:** SDD · **Status:** Rascunho v1 · **Data:** 27/08/2026
**Cobre:** RNF05 (PRD Fase 1) · **Depende de:** Specs 00-07 (todas as fontes de dado), Architecture Doc v4 seção 3

---

## 1. Objetivo

Garantir dois direitos LGPD do usuário: exportar todos os seus dados a qualquer momento (portabilidade) e excluir sua conta com exclusão real (não soft-delete) do dado de saúde, respeitando qualquer prazo mínimo legal aplicável.

## 2. Por que essa spec existe

O Architecture Doc já estabelece o princípio ("exclusão de conta implica exclusão real... respeitando prazo mínimo legal se aplicável") e o PRD já lista RNF05 como requisito desde a v1. Mas nenhuma spec técnica até aqui define como isso funciona na prática — cada spec de ingestão (01-04) e a Spec 06 têm seus próprios modelos de dado, e esta spec é a primeira que precisa tocar todos eles de uma vez para exportar ou apagar.

## 3. Escopo desta spec

**Cobre:**
- Exportação de todos os dados do usuário, sob demanda, em formato legível
- Exclusão de conta com exclusão real de dado de saúde, com período de carência para cancelamento
- Revogação automática de consentimento (Spec 00) como parte do processo de exclusão

**Não cobre:**
- Definição do prazo mínimo legal de retenção pós-exclusão (depende da revisão jurídica/regulatória ainda em andamento — ver seção 8)
- Exportação automática/agendada (é sempre sob demanda do usuário nesta spec)
- Exclusão parcial de um único item de dado (isso já existe em cada spec individual — ex.: excluir um registro de bioimpedância é a Spec 03; esta spec trata da conta inteira)

## 4. Modelo de dados (proposta Prisma)

```prisma
model DataExportRequest {
  id            String   @id @default(cuid())
  userId        String
  status        String   // "requested" | "processing" | "ready" | "expired" | "failed"
  downloadUrl   String?  // URL assinada de curta duração no S3, gerada quando status = "ready"
  requestedAt   DateTime @default(now())
  readyAt       DateTime?
  expiresAt     DateTime? // URL assinada expira; usuário precisa solicitar de novo depois disso

  @@index([userId, requestedAt])
}

model AccountDeletionRequest {
  id                  String   @id @default(cuid())
  userId              String
  status              String   // "requested" | "grace_period" | "cancelled" | "completed"
  requestedAt         DateTime @default(now())
  scheduledDeletionAt DateTime // requestedAt + período de carência (ver seção 6)
  cancelledAt         DateTime?
  completedAt         DateTime?

  @@index([userId, requestedAt])
}
```

## 5. Exportação de dado (portabilidade)

1. Usuário solicita exportação → `DataExportRequest` criado com `status: "requested"`
2. Job assíncrono agrega, de todas as fontes, os dados do usuário:
   - Perfil (Spec 00), decifrado normalmente (não é campo cifrado)
   - Exames confirmados e seus marcadores (Spec 01)
   - Laudos de imagem revisados (Spec 02)
   - Bioimpedância (Spec 03)
   - Linha do tempo de prescrições (Spec 04) — **decifrada apenas neste momento**, para entrar no arquivo de exportação; a geração do arquivo em si conta como leitura e gera entrada em `HealthDataAccessLog` (mesma regra da Spec 04)
   - Ciclos gerados, planos de ação, treinos (Spec 05)
   - Check-ins, logs de execução, logs de calorias (Spec 06)
3. Dados são compilados em formato estruturado legível (ex.: um JSON por categoria, ou um único JSON consolidado — decisão de implementação) e salvos como arquivo no S3 privado
4. `DataExportRequest.status: "ready"`, `downloadUrl` gerada como URL assinada de curta duração, usuário notificado (RNF04)
5. Após `expiresAt`, a URL deixa de funcionar; usuário pode solicitar nova exportação a qualquer momento (não há limite de solicitações nesta spec)

## 6. Exclusão de conta

1. Usuário solicita exclusão → `AccountDeletionRequest` criado com `status: "requested"`, `scheduledDeletionAt` definido como `requestedAt + 7 dias` (período de carência para permitir arrependimento — decisão de produto, não é exigência legal, mas é prática comum e reduz exclusão por impulso)
2. Durante o período de carência (`status: "grace_period"`), a conta permanece ativa normalmente; usuário pode cancelar o pedido a qualquer momento (`status: "cancelled"`)
3. Se o usuário não cancelar até `scheduledDeletionAt`, um job executa a exclusão real:
   - Todo dado de saúde (exames, laudos, bioimpedância, prescrições, ciclos, check-ins, logs) é **apagado de fato**, não soft-delete
   - `HealthDataConsent` (Spec 00) é marcado como revogado antes da exclusão dos dados que ele autorizava
   - `HealthDataAccessLog` (Spec 04) e o próprio `AccountDeletionRequest` **não são apagados** — viram registro de auditoria mínimo (quem, quando, que a conta existiu e foi excluída), respeitando o prazo mínimo legal de retenção **a definir na revisão jurídica** (seção 8)
   - `User.email` é anonimizado (não pode continuar identificando a pessoa), mas o `id` pode persistir internamente para as referências de auditoria acima
4. `AccountDeletionRequest.status: "completed"`, `completedAt` preenchido

## 7. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/data-export` | POST | Solicita nova exportação de dados |
| `/data-export/:id` | GET | Retorna status e, quando pronta, a URL de download |
| `/account/deletion` | POST | Solicita exclusão de conta (inicia período de carência) |
| `/account/deletion` | DELETE | Cancela um pedido de exclusão em período de carência |
| `/account/deletion` | GET | Retorna status do pedido de exclusão, se houver um ativo |

## 8. Tratamento de erros e casos de borda

- **Exportação falha (ex.: erro ao compilar algum dos módulos)** — `status: "failed"`, usuário notificado, pode solicitar novamente
- **Usuário solicita exclusão com pedido de exportação em andamento** — ambos prosseguem independentemente; se a exportação terminar depois da exclusão, o job de exportação deve falhar graciosamente ao não encontrar mais o dado (não é erro crítico, é ordem de operação esperada)
- **Usuário tenta login durante o período de carência** — permitido normalmente; a conta só deixa de existir após `scheduledDeletionAt`
- **Prazo mínimo legal de retenção ainda não definido** — esta spec assume, como placeholder, que `HealthDataAccessLog` e `AccountDeletionRequest` persistem indefinidamente até a revisão jurídica definir um prazo; **isso é uma decisão em aberto, não uma decisão final**

## 9. Critérios de aceite

- [ ] Usuário consegue exportar todos os seus dados em formato legível, incluindo prescrições decifradas apenas no momento da exportação
- [ ] Exportação de prescrições gera entrada em `HealthDataAccessLog`
- [ ] Usuário consegue solicitar exclusão de conta e cancelá-la durante o período de carência
- [ ] Após o período de carência, todo dado de saúde é removido de fato (verificável por inspeção direta do banco, não só ausência na interface)
- [ ] Consentimento de dado de saúde é revogado como parte da exclusão
- [ ] Registro mínimo de auditoria sobrevive à exclusão, sem conter dado de saúde identificável

## 10. Fora de escopo desta spec

- Prazo exato de retenção do registro de auditoria pós-exclusão — depende da revisão jurídica/regulatória externa; esta spec só define que o mecanismo técnico existe e é ajustável
- Formato exato do arquivo de exportação (JSON consolidado vs. por categoria) — decisão de implementação
- Duração do período de carência (7 dias é proposta inicial, não decisão fechada)

---
*Com as Specs 00-08, a Fase 1 está funcionalmente completa em documentação técnica.*
