# Spec Técnica 00 — Perfil do Usuário e Onboarding
**Metodologia:** SDD · **Status:** Rascunho v1 · **Data:** 27/08/2026
**Cobre:** RF20 (PRD Fase 1) · **Depende de:** Architecture Doc v3 (autenticação, seção 5)

---

## 1. Objetivo

Coletar, no onboarding, os dados básicos de perfil do usuário (altura, data de nascimento, sexo biológico, nível de atividade física) necessários para o cálculo de meta calórica (Spec 05) — sem bloquear o uso do produto caso o usuário não queira informar.

## 2. Por que essa spec existe

Nenhuma spec anterior capturava dado de perfil físico básico — todas tratavam de dado de saúde (exame, bioimpedância, prescrição) ou de geração (objetivo, plano, treino). A necessidade de calcular meta calórica diária (RF21, Spec 05) expôs essa lacuna: a fórmula padrão de estimativa de gasto energético exige altura, idade, sexo biológico e nível de atividade, que não tinham lar em nenhum modelo existente.

## 3. Escopo desta spec

**Cobre:**
- Coleta de perfil básico no onboarding (altura, data de nascimento, sexo biológico para cálculo, nível de atividade)
- Edição do perfil a qualquer momento (não é só onboarding, é dado que pode mudar)

**Não cobre:**
- Autenticação em si (login, cadastro de conta) — já coberta no Architecture Doc, seção 5
- Consentimento de dado sensível (LGPD, RNF01) — parte do onboarding mas é fluxo de aceite de termos, não dado de perfil; tratar como spec própria se necessário

## 4. Modelo de dados (proposta Prisma)

```prisma
model UserProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  heightCm              Float?
  birthDate             DateTime?
  biologicalSexForCalc  String?  // "masculino" | "feminino" | "prefiro_nao_informar" | null
  activityLevel         String?  // "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso"
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**Nota sobre `biologicalSexForCalc`:** este campo existe exclusivamente para alimentar a fórmula de estimativa de gasto calórico (Mifflin-St Jeor, Spec 05), que usa constantes diferentes para corpos com características biológicas diferentes — não é um campo de identidade de gênero, e a tela deve deixar isso explícito no texto de apoio (mesmo princípio da "comunicação no momento da coleta" já usado nas Specs 01-04). Se o usuário preferir não informar, o cálculo de meta calórica usa a média das duas fórmulas (Spec 05 detalha), sinalizando ao usuário que a estimativa fica menos precisa nesse caso — nunca bloqueando o fluxo.

## 5. Fluxo técnico

1. **Onboarding** — após criar conta (Architecture Doc, seção 5), usuário passa por tela de perfil básico; todos os campos são preenchíveis ou puláveis
2. **Persistência** — backend cria/atualiza `UserProfile` (upsert por `userId`) — não há pipeline assíncrono, é escrita síncrona
3. **Edição posterior** — usuário pode editar o perfil a qualquer momento (ex.: altura mudou, quer corrigir data de nascimento)

## 6. Comunicação ao usuário no momento da coleta

- **Por que pedimos:** esses dados ajudam a estimar sua meta calórica diária, personalizada ao seu objetivo — sem eles, o produto funciona normalmente, só não calcula essa meta
- **Sobre o campo de sexo biológico:** usado apenas na fórmula de estimativa calórica, não para nenhuma outra finalidade
- **O que não fazemos:** não emitimos avaliação médica ou nutricional a partir desses dados — é uma estimativa informativa (reforço do disclaimer clínico, RNF02)

## 7. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/profile` | GET | Retorna o perfil do usuário autenticado |
| `/profile` | PUT | Cria ou atualiza o perfil (upsert) |

## 8. Tratamento de erros e casos de borda

- **Todos os campos vazios** — aceito; perfil existe com todos os campos `null`, produto funciona normalmente, só sem meta calórica
- **Altura ou data de nascimento fora de faixa plausível** (ex.: altura de 0cm, data de nascimento no futuro) — validação de sanidade, rejeita com mensagem clara
- **Usuário muda de ideia depois de pular** — pode preencher o perfil a qualquer momento via edição; não precisa refazer onboarding

## 9. Critérios de aceite

- [ ] Usuário consegue concluir onboarding sem preencher nenhum campo de perfil
- [ ] Usuário consegue editar o perfil a qualquer momento após o onboarding
- [ ] Texto de "por que pedimos" e a nota sobre o campo de sexo biológico aparecem na tela de coleta
- [ ] Perfil incompleto não gera erro em nenhuma outra parte do produto — apenas a meta calórica (RF21) fica indisponível

## 10. Fora de escopo desta spec

- Fluxo de consentimento LGPD/aceite de termos
- Autenticação (login, cadastro, 2FA)
- Qualquer cálculo derivado do perfil (fica na Spec 05)

---
*Esta spec é pré-requisito funcional da Spec 05 (RF21 — cálculo de meta calórica).*
