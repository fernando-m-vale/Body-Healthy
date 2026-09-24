# Spec Técnica 11 — Grupos e Incentivo Social (rascunho conceitual)
**Metodologia:** SDD · **Status:** Rascunho v1 — conceitual, não pronto para implementação · **Data:** 22/09/2026
**Cobre:** direção de produto nova, ainda sem RF numerado no PRD Fase 1 · **Relaciona-se com:** Spec 09 (fonte de dado de sessão concluída), Spec 06 (check-in/adesão), `sistema-visual.md` · **Depende de:** decisões de produto ainda não tomadas — marcadas ao longo deste documento · **Origem:** benchmark Hevy, `claude/10-benchmark-hevy-oportunidades.md` (seção 3.5)

---

## 1. Objetivo

Explorar uma camada de incentivo social — grupos fechados por convite — como alavanca de adesão ao plano de treino gerado pela IA, sem replicar o modelo de rede social pública do Hevy (feed, seguidores, "Descobrir"). Motivada pela pergunta do Fernando sobre gamificação (22/09/2026): "a pessoa pode ao menos compartilhar o que fez com seu grupo social apenas. Ou criar grupo de treinos para um incentivar outro." O Body Healthy lida com dado de exame e de saúde — mais sensível do que o diário de treino do Hevy — então o desenho aqui precisa ser deliberadamente diferente, não uma cópia adaptada.

## 2. Por que é uma spec separada, não extensão da Spec 09

As demais adições desta rodada de documentação (seções 5.10 e 5.11 da Spec 09) estendem a sessão de treino ao vivo, que já existe. Esta é uma frente de produto nova: mexe em identidade de grupo, convite, visibilidade entre usuários diferentes, e possivelmente notificação entre pessoas — implicações de modelagem, permissão e privacidade que vão além do escopo de uma sessão individual. Merece decisão e desenho próprios antes de entrar em qualquer spec existente, e não deve bloquear o que já está pronto para seguir (Spec 09 v9).

## 3. Escopo (rascunho conceitual)

**Direção já confirmada (22/09/2026):**
- Grupos fechados, por convite — nunca um feed público nem descoberta de estranhos (o "Descobrir" do Hevy fica de fora)
- Participação em grupo é opt-in — tanto entrar num grupo quanto compartilhar qualquer coisa dentro dele
- O que é compartilhado num grupo **nunca** inclui dado derivado do exame — nenhum marcador, nenhuma prescrição, nenhuma meta calórica/macro. Só sinais de adesão à rotina de treino (ex.: "completou o treino de hoje", sequência de dias treinados)
- Gamificação gira em torno de **adesão ao plano prescrito pela IA** (consistência, sequência de dias treinados, meta da semana batida) — não em torno de carga levantada ou comparação de performance física entre usuários, diferente do modelo de PR/ranking do Hevy

**Explicitamente fora de escopo — decisão já tomada a partir do benchmark, não revisitar sem motivo novo:**
- Feed público de treinos
- "Descobrir" / exploração de conteúdo de usuários estranhos entre si
- Seguidores/seguindo no modelo de rede social aberta
- Ranking ou comparação de carga levantada (PR) entre usuários
- Cards de compartilhamento com dado numérico de treino pensados para redes sociais externas (Instagram etc.) — pode ser revisitado no futuro, sem prioridade agora

**Ainda não decidido — precisa de discussão dedicada antes de qualquer implementação:**
- Composição típica de um grupo: família? um personal trainer com seus alunos? um grupo de amigos da academia? Isso muda o desenho de convite e de notificação
- Existe um papel diferenciado (ex.: personal trainer acompanhando a adesão de vários alunos) ou só grupos entre pares, sem hierarquia?
- Mecanismo de convite (link, código, busca por contato?) — busca por contato implicaria acesso a dados de terceiros, com uma questão de privacidade própria, separada de tudo isso
- Um usuário pode estar em mais de um grupo? Como isso aparece na navegação do produto?
- Formato exato do incentivo/gamificação — pontos, sequência de dias, selo visual, notificação de grupo — nenhuma decisão de UI ainda
- Como sair de um grupo, e o que acontece com o histórico de adesão já compartilhado quando alguém sai

## 4. Modelo de dados — esboço de hipótese, não uma proposta fechada

```prisma
// ESBOÇO — não implementar sem revisão; nomes e campos sujeitos a mudar
// depois que os pontos em aberto da seção 3 forem decididos

model TrainingGroup {
  id        String   @id @default(cuid())
  name      String
  createdBy String   // userId
  createdAt DateTime @default(now())

  members   TrainingGroupMember[]
}

model TrainingGroupMember {
  id              String   @id @default(cuid())
  trainingGroupId String
  userId          String
  joinedAt        DateTime @default(now())
  // papel (admin/membro/personal) e mecanismo de convite: em aberto, seção 3

  trainingGroup   TrainingGroup @relation(fields: [trainingGroupId], references: [id])
}

model AdherenceShareEvent {
  id               String   @id @default(cuid())
  trainingGroupId  String
  userId           String
  workoutSessionId String   // referência à WorkoutSession (Spec 09) que originou o evento
  sharedAt         DateTime @default(now())
  // nenhum dado de carga ou de exame armazenado aqui — só a referência de que uma
  // sessão foi concluída, para renderizar algo como "Fulano treinou hoje" no grupo

  trainingGroup    TrainingGroup @relation(fields: [trainingGroupId], references: [id])
}
```

Este esboço existe só para tornar a conversa concreta — não é um contrato pronto para o Claude Code implementar, e não deve ser tratado como tal.

## 5. Próximo passo

Antes de qualquer linha de código ou mockup de alta fidelidade: uma sessão de brainstorm dedicada para fechar os pontos da seção 3 ("ainda não decidido"). Só depois disso esta spec evolui para uma v2 no mesmo nível de detalhe da Spec 09 — regras de comportamento por seção, fluxo técnico, contrato de API, tratamento de erros, critérios de aceite.

## 6. Fora de escopo desta versão

- Qualquer mockup de alta fidelidade — não existe ainda no `mockups.html` nem componente correspondente no `sistema-visual.md`
- Qualquer contrato de API — o esboço da seção 4 não é uma proposta de endpoint
- Implementação — esta versão é só a direção de produto documentada, não está pronta para virar pedido ao Claude Code

---
*Rascunho v1 — primeira versão, registrando a direção de produto confirmada em conversa (22/09/2026) a partir do benchmark Hevy (`claude/10-benchmark-hevy-oportunidades.md`, seção 3.5). Conceitual — várias decisões de produto ainda em aberto (seção 3). Não iniciar implementação a partir deste documento sem antes fechar essas decisões e evoluir para uma v2 no mesmo padrão de detalhe das demais specs.*
