# Benchmark Hevy — Oportunidades para o Body Healthy

**Metodologia:** Análise de benchmark (SDD) · **Status:** Rascunho v1 · **Data:** 22/09/2026

## 1. Fonte

Walkthrough de 54 páginas feito pelo Fernando no app Hevy (conta própria, dados reais) cobrindo: feed social / "Descobrir", aba Treino com Rotinas organizadas em pastas, execução ao vivo de um treino (timer de descanso como notificação nativa, prefill "Anterior" inline por série), fluxo de conclusão (Salvar treino → carrossel de cards "Mandou bem!"), e aba Perfil (configurações, notificações granulares, painel de estatísticas). Complementado por um vídeo de 2min12s do fluxo de criação de rotina do zero (busca de exercício, filtro por grupo muscular/equipamento, configuração de descanso por exercício, notas de rotina).

## 2. Princípio orientador

O Hevy é um diário de treino manual com camada social pública — o usuário monta tudo (rotina, exercícios, cargas) e o produto gira em torno de compartilhar isso. O Body Healthy parte de um lugar diferente: o plano nasce do exame, é gerado pela IA, e lida com dado de saúde sensível. Isso muda o que vale copiar direto, o que vale adaptar, e o que não deveríamos copiar de jeito nenhum — em especial tudo que empurra comparação de carga bruta ou exposição pública de progresso ligado a um plano de saúde.

## 3. Oportunidades por área

### 3.1 Execução ao vivo

- **Prefill "Anterior" inline por série** — já coberto pela Spec 09 (§5.2/§5.7). Confirmado como o padrão certo pelo benchmark.
- **Notas de coaching por exercício** ("Joelhos semiflexionados. Alongamento máximo.") — no Hevy é texto livre digitado pelo usuário na criação da rotina. No Body Healthy, como a IA já gera a prescrição, essa nota poderia ser **gerada automaticamente pela IA** a partir da técnica do exercício (cue de execução), sem exigir que o usuário digite nada. *Recomendação: adaptar — novo item de backlog, não bloqueia Spec 09.*
- **Filtro de catálogo por grupo muscular + equipamento** na busca de exercício (com silhueta do corpo clicável) — hoje o fluxo de "exercício avulso" da sessão ao vivo provavelmente é texto livre. Se vocês já têm um catálogo de exercícios por trás da prescrição da IA, dá pra reaproveitar esse catálogo com os mesmos filtros na hora de adicionar um exercício avulso, em vez de só um campo de texto. *Recomendação: adaptar, prioridade baixa — só faz sentido se o catálogo já existir no backend.*

### 3.2 Notificação de descanso

- **Ações rápidas direto na notificação** (Concluir série / Pular / -15s / +15s), sem precisar abrir o app — Fernando confirmou interesse em evoluir pra esse nível. *Recomendação: adotar como próxima evolução, mas só depois de fechar o bug de som/vibração ainda em aberto — a base (notificação disparando de forma confiável) precisa estar sólida antes de adicionar interatividade a ela.*

### 3.3 Pré-visualização e progressão

- **Gráfico de tendência (Volume/Repetições/Duração) antes de iniciar** — no Hevy isso vive na tela da rotina reutilizável. Mesmo sem "rotinas" no sentido do Hevy, o conceito de dia ("Leg B", "Pull B") se repete entre versões do plano gerado pela IA — então dá pra aplicar esse gráfico na pré-visualização do dia (§5.7 da Spec 09), agregando por nome/tipo de dia ao longo do histórico de sessões. *Recomendação: adaptar — bom candidato para uma v2 da pré-visualização, não bloqueia o que já está especificado.*

### 3.4 Conclusão de treino e conquistas

- O Hevy gera um carrossel rico de cards (PR por exercício, frequência semanal, "peso total = ônibus", radar de grupo muscular) pensados pra serem compartilhados publicamente.
- *Recomendação: adaptar com cautela.* Faz sentido manter uma versão **privada e simples** disso (ex.: card de frequência semanal — "treinou X de Y dias planejados" — e talvez um selo de recorde pessoal), porque reforça adesão ao plano. Mas comparação de carga bruta ("levantou um ônibus") e ranking de PR não parecem ideais pra um app que nasce de um exame clínico — o usuário pode ter restrições que tornam "forçar mais peso" uma mensagem errada. Melhor gamificar **adesão ao plano prescrito pela IA** do que **volume absoluto levantado**.

### 3.5 Camada social

Aqui está minha resposta à sua pergunta direta. Acho que dá pra ganhar algo com uma camada social, mas replicar o modelo do Hevy (feed público, seguidores, "Descobrir" com estranhos) não combina com um app que carrega dado de exame — mesmo que o compartilhamento em si não exponha o exame, a associação "essa pessoa usa um app de plano de treino baseado em exame de sangue" já é uma informação sensível por tabela.

O caminho que eu seguiria é mais perto do que você já sugeriu — grupos fechados, não rede social aberta:

- **Grupos privados por convite** (família, personal trainer, grupo de amigos da academia) em vez de seguidores/feed público. Sem "Descobrir" de estranhos.
- **Compartilhamento é opt-in por treino**, não automático — e o card gerado nunca carrega dado derivado do exame (só duração, dias treinados, selo de consistência).
- **Gamificação ligada a adesão, não a carga**: sequência de dias treinados, "bateu a meta da semana", progressão dentro da faixa seguraprescrita pela IA — não ranking de quem levanta mais peso.
- Isso também abre espaço pra algo que o Hevy não tem: **incentivo mútuo dentro do grupo** sem comparação direta de números (ex.: notificação "Fulano completou o treino de hoje" pro grupo, sem mostrar carga) — mais alinhado com adesão a tratamento/plano de saúde do que com performance esportiva.

*Recomendação: linha de produto separada, fora do escopo da Spec 09. Vale um brainstorm dedicado antes de virar spec.*

### 3.6 Rotinas reutilizáveis

Confirmado por você: como a IA gera o plano, o conceito de "rotina reutilizável montada à mão" não se aplica — a fricção que isso resolve no Hevy (montar do zero toda vez) já não existe no Body Healthy. *Recomendação: não adotar.*

## 4. Próximos passos sugeridos

1. ~~Fechar o bug de som/vibração da notificação de descanso~~ — **próximo passo, agora que a documentação abaixo está feita.**
2. **Feito (22/09/2026):** notas de coaching por exercício já estavam cobertas pela Spec 09 §5.6 (nenhuma mudança necessária). Gráfico de progressão na pré-visualização documentado na Spec 09 v9, §5.10, com mockup novo na tela 30. Notificação com ações rápidas documentada na Spec 09 v9, §5.11, como evolução futura explicitamente bloqueada até o bug de som/vibração ser resolvido.
3. **Feito (22/09/2026):** camada social/grupos tratada como iniciativa própria — ver `claude/11-grupos-e-incentivo-social.md` (rascunho v1, conceitual, com pontos de produto ainda em aberto antes de virar spec de implementação).
