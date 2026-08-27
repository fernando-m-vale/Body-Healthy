# Spec Técnica 00 — Cadastro, Consentimento e Perfil do Usuário
**Metodologia:** SDD · **Status:** Rascunho v2 · **Data:** 27/08/2026
**Cobre:** RF20, RF23, RF24 (PRD Fase 1) · **Depende de:** Architecture Doc v4 (autenticação, seção 5)

---

## 1. Objetivo

Cobrir o onboarding completo: criação de conta (e-mail/senha ou Google), captura de consentimento explícito para tratamento de dado de saúde antes de qualquer coleta, e coleta de perfil básico (altura, data de nascimento, sexo biológico, nível de atividade) necessário para o cálculo de meta calórica (Spec 05).

## 2. Por que essa spec existe (e por que ela cresceu)

Na v1, esta spec cobria só o perfil físico — cadastro e consentimento estavam marcados como "fora de escopo", assumindo que ficariam em specs próprias. Na prática, os três acontecem na mesma sessão de onboarding e compartilham o mesmo fluxo técnico (criar conta → consentir → preencher perfil), então faz mais sentido tratá-los numa spec só, na ordem em que acontecem.

## 3. Escopo desta spec

**Cobre:**
- Criação de conta via e-mail/senha (RF23)
- Criação de conta via Google OAuth (RF23)
- Captura de consentimento explícito e granular para tratamento de dado de saúde, antes de qualquer coleta (RF24)
- Coleta de perfil básico (altura, data de nascimento, sexo biológico para cálculo, nível de atividade) (RF20)
- Edição do perfil a qualquer momento

**Não cobre:**
- 2FA (já decidido como opcional, não obrigatório — Architecture Doc, seção 5)
- Verificação de e-mail (mecanismo específico de compensação de segurança, decisão de implementação)
- Qualquer cálculo derivado do perfil (fica na Spec 05)
- Texto jurídico final dos termos de consentimento (depende da revisão jurídica/regulatória ainda em andamento — ver seção 6)

## 4. Modelo de dados (proposta Prisma)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  authProvider    String   // "email_password" | "google"
  googleSub       String?  // identificador único do Google, se authProvider = "google"
  passwordHash    String?  // null se authProvider = "google" (sem senha própria)
  emailVerified   Boolean  @default(false)
  createdAt       DateTime @default(now())

  consent         HealthDataConsent?
  profile         UserProfile?

  @@index([email])
}

model HealthDataConsent {
  id            String   @id @default(cuid())
  userId        String   @unique
  consentedAt   DateTime // momento exato do aceite — evidência para LGPD
  consentVersion String  // versão do texto de consentimento aceito (rastreabilidade se o texto mudar)
  revokedAt     DateTime? // se o usuário revogar consentimento depois (ver seção 8)

  user          User     @relation(fields: [userId], references: [id])
}

model UserProfile {
  id                    String   @id @default(cuid())
  userId                String   @unique
  heightCm              Float?
  birthDate             DateTime?
  biologicalSexForCalc  String?  // "masculino" | "feminino" | "prefiro_nao_informar" | null
  activityLevel         String?  // "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso"
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user                  User     @relation(fields: [userId], references: [id])
}
```

**Nota sobre `biologicalSexForCalc`:** este campo existe exclusivamente para alimentar a fórmula de estimativa de gasto calórico (Mifflin-St Jeor, Spec 05), que usa constantes diferentes para corpos com características biológicas diferentes — não é um campo de identidade de gênero, e a tela deve deixar isso explícito no texto de apoio (mesmo princípio da "comunicação no momento da coleta" já usado nas Specs 01-04). Se o usuário preferir não informar, o cálculo de meta calórica usa a média das duas fórmulas (Spec 05 detalha), sinalizando ao usuário que a estimativa fica menos precisa nesse caso — nunca bloqueando o fluxo.

**Nota sobre `HealthDataConsent`:** separado de `User` propositalmente — é o registro que prova, para fins de LGPD, que o consentimento foi capturado, quando, e para qual versão do texto. Nunca é apagado (mesmo em exclusão de conta, deve virar registro anonimizado de auditoria conforme prazo legal mínimo, mesmo princípio já usado para dado de saúde no Architecture Doc, seção 3).

## 5. Fluxo técnico

1. **Criação de conta (RF23)** — usuário escolhe e-mail/senha ou Google:
   - **E-mail/senha:** informa e-mail e senha, `User` criado com `authProvider: "email_password"`, `passwordHash` gerado (nunca a senha em texto plano), e-mail de verificação disparado (não bloqueia o fluxo, mas fica pendente até confirmação)
   - **Google:** fluxo OAuth padrão, `User` criado com `authProvider: "google"`, `googleSub` armazenado, `emailVerified: true` automaticamente (Google já verifica)
2. **Consentimento de dado de saúde (RF24)** — **antes de qualquer tela de coleta de dado de saúde** (exame, laudo, bioimpedância, prescrição), usuário vê o texto de consentimento específico para essa categoria de dado (não é o aceite geral de termos de uso, que pode ser uma tela separada) e precisa aceitar explicitamente para prosseguir; `HealthDataConsent` é criado com `consentedAt` e `consentVersion`
3. **Perfil básico (RF20)** — usuário passa por tela de perfil (altura, data de nascimento, sexo biológico para cálculo, nível de atividade); todos os campos são preenchíveis ou puláveis; `UserProfile` criado/atualizado (upsert por `userId`)
4. **Edição posterior** — usuário pode editar o perfil a qualquer momento (ex.: altura mudou); consentimento também pode ser revisto/revogado a qualquer momento (ver seção 8)

## 6. Comunicação ao usuário no momento da coleta

**Tela de consentimento (RF24):** diferente das outras telas de "por que pedimos" (que são informativas), esta é uma tela de aceite formal — texto deve ser claro sobre o que é tratado (dado de saúde, categoria sensível sob LGPD), para qual finalidade (gerar plano de ação personalizado), e que o usuário pode revogar a qualquer momento. **O texto jurídico final depende da revisão regulatória que está em andamento por fora desta documentação** — esta spec define o mecanismo técnico (quando aparece, o que fica registrado), não o texto em si.

**Tela de perfil (RF20):**
- **Por que pedimos:** esses dados ajudam a estimar sua meta calórica diária, personalizada ao seu objetivo — sem eles, o produto funciona normalmente, só não calcula essa meta
- **Sobre o campo de sexo biológico:** usado apenas na fórmula de estimativa calórica, não para nenhuma outra finalidade
- **O que não fazemos:** não emitimos avaliação médica ou nutricional a partir desses dados — é uma estimativa informativa (reforço do disclaimer clínico, RNF02)

## 7. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/auth/signup` | POST | Cria conta via e-mail/senha |
| `/auth/google` | POST | Cria ou autentica conta via Google OAuth |
| `/consent/health-data` | POST | Registra o aceite do consentimento de dado de saúde |
| `/consent/health-data` | GET | Retorna status atual do consentimento (aceito, versão, data) |
| `/consent/health-data` | DELETE | Revoga o consentimento (ver seção 8) |
| `/profile` | GET | Retorna o perfil do usuário autenticado |
| `/profile` | PUT | Cria ou atualiza o perfil (upsert) |

## 8. Revogação de consentimento — o que acontece

Se o usuário revoga `HealthDataConsent` (`revokedAt` preenchido), o sistema deve impedir novo acesso de escrita a qualquer dado de saúde (exame, laudo, bioimpedância, prescrição, ciclo) até um novo consentimento ser dado. Isso não apaga dado já existente automaticamente — exclusão de dado é um fluxo separado (RNF05, portabilidade/exclusão), já coberto no Architecture Doc. Revogar consentimento e excluir conta são ações diferentes.

## 9. Tratamento de erros e casos de borda

- **E-mail já cadastrado** — rejeita cadastro com mensagem clara, sugere login
- **Usuário tenta acessar tela de coleta de dado de saúde sem `HealthDataConsent` ativo** — bloqueado, redirecionado para a tela de consentimento; esta é a **única** tela de coleta em todo o produto que pode bloquear o fluxo, porque sem base legal (LGPD) não há como tratar o dado
- **Google OAuth falha ou é cancelado pelo usuário** — retorna ao fluxo de criação de conta, sem estado parcial de `User` criado
- **Todos os campos de perfil vazios** — aceito; perfil existe com todos os campos `null`, produto funciona normalmente, só sem meta calórica
- **Altura ou data de nascimento fora de faixa plausível** — validação de sanidade, rejeita com mensagem clara

## 10. Critérios de aceite

- [ ] Usuário consegue criar conta por e-mail/senha ou por Google
- [ ] Nenhuma tela de coleta de dado de saúde é acessível antes do consentimento explícito (RF24)
- [ ] Consentimento registra data exata e versão do texto aceito
- [ ] Usuário consegue revogar consentimento, e isso bloqueia nova escrita de dado de saúde sem apagar dado existente
- [ ] Usuário consegue concluir onboarding sem preencher nenhum campo de perfil (perfil continua opcional, diferente do consentimento)
- [ ] Usuário consegue editar o perfil a qualquer momento após o onboarding
- [ ] Perfil incompleto não gera erro em nenhuma outra parte do produto — apenas a meta calórica (RF21) fica indisponível

## 11. Fora de escopo desta spec

- 2FA (Architecture Doc já decidiu: disponível, não obrigatório)
- Texto jurídico final do consentimento (depende de revisão regulatória externa)
- Qualquer cálculo derivado do perfil (fica na Spec 05)
- Fluxo completo de exclusão de conta/dado (RNF05, já mencionado no Architecture Doc, spec própria se necessário)

---
*Esta spec é pré-requisito de todas as demais: consentimento bloqueia acesso a qualquer tela de dado de saúde (Specs 01-06), e o perfil é pré-requisito da Spec 05 (RF21 — cálculo de meta calórica).*
