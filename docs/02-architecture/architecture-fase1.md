# Architecture Doc — Fase 1 (MVP) — Body Healthy
**Metodologia:** BMAD (fase Architect) · **Status:** Rascunho v3 (decisões fechadas) · **Data:** 25/08/2026
**Baseado em:** PRD Fase 1 v2

---

## 1. Princípios de arquitetura

- Dado de saúde é sensível por padrão — toda decisão técnica parte de "como isolar e proteger isso", não de "como adicionar segurança depois"
- Reaproveitar o que já é dominado (stack do SuperSeller IA) onde fizer sentido, para reduzir risco de execução de um fundador solo — mas sem forçar reuso onde o caso de uso for realmente diferente
- Extração de exame via IA precisa de confirmação humana no loop (RNF03 do PRD) — arquitetura deve refletir isso como etapa obrigatória, não best-effort

## 2. Stack proposto (para sua validação)

**Revisão importante:** diferente do SuperSeller (aplicação web), este produto precisa nascer como app mobile nativo em iOS e Android — o padrão de uso (consultar exame, registrar bioimpedância, fazer check-in semanal) é essencialmente mobile-first. Isso muda a camada de frontend; a camada de backend pode seguir reaproveitando o que já é dominado.

Além disso, o **AWS App Runner não é mais opção para projeto novo**: a AWS fechou o serviço para novos clientes a partir de 30/04/2026 (clientes existentes, como o SuperSeller, continuam normalmente). A própria AWS recomenda o Amazon ECS Express Mode como substituto, que preserva a simplicidade do App Runner dentro do ecossistema ECS — mantém você no mesmo provedor, sem reaprender infraestrutura do zero.

| Camada | Proposta | Racional |
|---|---|---|
| App mobile (iOS + Android) | React Native (via Expo) | Reaproveita seu conhecimento de React/TypeScript do Next.js; um único código-base pra ambas as plataformas — viável para fundador solo |
| Backend/API | Fastify | Mesmo do SuperSeller |
| Banco relacional | PostgreSQL (RDS) | Mesmo do SuperSeller; suporta bem dado estruturado + JSON para marcadores variáveis de exame |
| ORM | Prisma | Mesmo do SuperSeller |
| Hosting do backend | Amazon ECS Express Mode | Substituto oficial do App Runner recomendado pela própria AWS; mesma simplicidade operacional |
| Armazenamento de arquivo (PDFs/fotos de exame) | S3 com bucket privado, URLs assinadas de curta duração | Nunca expor arquivo de exame publicamente, nem por URL previsível |
| Extração de dado do exame (IA) | API da Anthropic (Claude), com suporte nativo a PDF/imagem | Evita treinar/manter modelo próprio; qualidade de extração de texto médico é alta; mesmo ecossistema que você já usa no fluxo manual atual |
| Autenticação | A decidir — ver seção 5 | Depende do nível de garantia exigido para dado sensível |

**Nota:** publicar em loja (App Store + Google Play) adiciona um processo de revisão e prazos que não existiam no SuperSeller (produto web). Vale considerar isso no cronograma quando formos planejar o lançamento, não é uma decisão de arquitetura, mas afeta o plano.

**Decidido:** infraestrutura em conta AWS nova, separada da conta do SuperSeller — isolamento de custo e de superfície de risco entre os dois produtos (dado de saúde não deve compartilhar ambiente com o e-commerce).

## 3. Modelagem de dado sensível

- Tabelas com dado de saúde (exames, laudos, bioimpedância, prescrições) fisicamente separadas das tabelas de conta/autenticação — nunca no mesmo schema lógico que dado de identificação direta sem necessidade
- Campo de prescrição (medicação/hormônio) tratado com criptografia em nível de campo, não só de disco — é o dado mais sensível do produto
- Toda leitura de dado de saúde passa por log de auditoria (quem acessou, quando, o quê) — necessário tanto para LGPD quanto para credibilidade caso haja auditoria futura
- Exclusão de conta implica exclusão real (não soft-delete) do dado de saúde, respeitando prazo mínimo legal se aplicável

## 4. Pipeline de extração (exame/laudo → dado estruturado)

1. Upload do arquivo → armazenado no S3 privado
2. Job assíncrono envia o arquivo para a API da Anthropic com prompt estruturado pedindo extração de marcadores (nome, valor, unidade, faixa de referência) em formato estruturado
3. Resultado é apresentado ao usuário para confirmação/correção (RNF03) — nada é gravado como "dado confirmado" sem esse passo
4. Após confirmação, dado estruturado é persistido e vinculado à linha do tempo do usuário

**Decisão em aberto:** validar taxa de acerto da extração com uma amostra real de exames (Fleury, Dasa, Hermes Pardini) antes de fechar o prompt de extração — isso é mais um passo de validação do que uma decisão de arquitetura, mas deveria acontecer antes de codar a tela de confirmação.

## 5. Autenticação e controle de acesso

- Autenticação de usuário: e-mail/senha + opção social login (a definir provedor)
- Nenhum dado de saúde acessível sem sessão autenticada válida — sem exceção, inclusive em ambiente de desenvolvimento/staging
- **Decidido:** 2FA disponível e incentivado desde o MVP, mas não obrigatório — evita fricção na ativação numa fase em que validar retorno do usuário é prioridade. Compensado com verificação de e-mail obrigatória, alerta de login em novo dispositivo e rate limiting contra força bruta. Reavaliar tornar 2FA obrigatório quando a base de usuários estiver estabelecida.

## 6. Fora de escopo desta versão do documento

- Escala/performance além do necessário para validar o MVP com uma base pequena de usuários
- Decisão final de provedor de autenticação (a resolver na primeira sessão de implementação)
- Arquitetura de billing/assinatura (entra quando o modelo de monetização for validado)

## 7. Riscos técnicos

| Risco | Nota |
|---|---|
| Qualidade de extração variar muito entre labs diferentes | Mitigar com validação humana obrigatória (já no PRD) e ajuste iterativo do prompt |
| Custo de API de IA escalar com volume de upload | Modelo de negócio precisa considerar custo variável por extração, não só custo fixo de infra |
| AWS App Runner ser adequado para dado de saúde | **Resolvido nesta revisão:** App Runner não é mais opção para projeto novo (fechado a novos clientes desde 30/04/2026); documento já reflete ECS Express Mode como hosting. Validar na revisão jurídica/regulatória se há exigência de localização de dado ou certificação específica |

## 8. Próximos passos

1. Revisão jurídica leve (já prevista no PRD) informa se há restrição técnica adicional (ex.: localização de dado no Brasil)
2. Com isso resolvido, o documento vira input direto para o Claude Code começar a implementação, seguindo SDD: cada funcionalidade do PRD vira uma spec técnica antes do código

---
*Este documento cobre exclusivamente a Fase 1. Todas as perguntas em aberto da v1 foram decididas nesta v3.*
