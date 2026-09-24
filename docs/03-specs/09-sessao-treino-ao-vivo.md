# Spec Técnica 09 — Sessão de Treino ao Vivo
**Metodologia:** SDD · **Status:** Rascunho v9 · **Data:** 22/09/2026
**Cobre:** RF17 (ampliado — ver seção 2) · **Relaciona-se com:** RF19 (fonte de dado futura para o dashboard, não implementada nesta spec) · **Depende de:** Spec 05 (`WorkoutPlan`/`WorkoutExercise`, incluindo `restSeconds`, `notes`, `technique`), Spec 06 (substitui a implementação de RF17 feita na Tela 21/Etapa 3 — remoção confirmada, ver seção 4), Architecture Doc v3
**Substitui:** a tela "Progressão de treino" (Spec 06, Tela 21) e o modelo `WorkoutExecutionLog` — ver seção 4

---

## 1. Objetivo

Transformar o registro de treino de um formulário preenchido depois do fato (Spec 06, RF17 original) em um companheiro de treino ao vivo: o usuário abre o produto na academia, inicia uma sessão vinculada a um dia do treino gerado (Spec 05), vê todos os exercícios daquele dia já abertos com a carga/repetições da última vez (ou a sugestão do plano, na primeira vez) e as orientações da IA para cada exercício, registra série a série enquanto treina — com o produto controlando também o descanso entre séries sem travar a navegação pelos outros exercícios — e contabiliza o tempo real da sessão. O objetivo de negócio é dar um motivo diário/quase-diário de abrir o app — hoje o check-in semanal (RF16) sozinho é fraco demais para sustentar esse hábito.

## 2. Por que essa spec existe (e por que substitui, não complementa, a Spec 06/Tela 21)

A Spec 06 implementou RF17 conforme a redação original do PRD: "usuário registra manualmente o resultado do treino executado **fora do produto**" — ou seja, um formulário de preenchimento posterior, um exercício por vez, escolhido numa lista. Isso foi implementado e testado, mas o uso real mostrou duas limitações estruturais, não de polimento visual:

- A lista de exercícios pra escolher, exercício por exercício, é uma experiência ruim justamente no momento em que o produto mais precisa ser útil (durante o treino, na academia)
- Registrar depois, sem o produto acompanhar o treino em tempo real, não gera o hábito de abrir o app que o negócio precisa (RF16 sozinho, seção 8 do PRD, já reconhece a "taxa de check-in semanal" como um indicador frágil de retenção)

Esta spec assume que o treino pode acontecer **dentro** do produto — o app vira a ferramenta usada durante a sessão, não só o registro posterior dela. Isso amplia a redação original do RF17 do PRD (que assumia execução fora do produto); recomenda-se atualizar o texto do PRD numa próxima revisão para refletir essa opção adicional, sem remover a possibilidade de registro posterior/simplificado que a Spec 06 também cobre para quem prefere treinar em outro app.

## 3. Escopo desta spec

**Cobre:**
- Início de uma sessão de treino vinculada a um dia do `WorkoutPlan` ativo (Spec 05), ou sessão livre sem dia específico
- Pré-visualização somente-leitura dos exercícios do dia escolhido, antes de criar a sessão, com um botão explícito "Iniciar treino" — ver seção 5.7
- Exibição de todos os exercícios do dia escolhido abertos simultaneamente, com séries pré-preenchidas (sugestão do plano na primeira vez; último registro real a partir da segunda)
- Exibição das orientações da IA para cada exercício (`WorkoutExercise.technique`/`notes`, já existentes na Spec 05) junto ao nome do exercício — ver seção 5.6
- Registro série a série (peso, repetições, marcação de concluída) com salvamento progressivo (não só ao final)
- Timer de descanso entre séries, disparado ao marcar uma série como concluída, usando o `restSeconds` sugerido pela IA (Spec 05), exibido como barra persistente não-bloqueante — ver seção 5.5
- Adição de série extra além do que o plano sugere, e adição de exercício avulso em texto livre dentro da sessão (mesmo espírito do `exerciseNameFreeText` da Spec 06)
- Cronômetro de duração da sessão, com início/fim persistidos como dado real (não só exibição visual)
- Retomada de uma sessão iniciada e não finalizada (uma sessão em aberto por vez)
- Descarte de uma sessão em andamento, com confirmação explícita — ver seção 5.9
- Finalização da sessão, calculando e persistindo a duração total, seguida de uma tela de resumo — ver seção 5.8
- Gráfico de progressão do dia (Volume/Repetições/Duração) exibido dentro da pré-visualização, agregando sessões anteriores do mesmo dia — ver seção 5.10 (novo, 22/09/2026, origem: benchmark Hevy, `claude/10-benchmark-hevy-oportunidades.md`)

**Não cobre:**
- Renderização de histórico de sessões (gráfico de volume, frequência semanal) — candidato natural à Spec 07 (Dashboard), a definir quando essa spec for detalhada
- Estimativa de gasto calórico da sessão, tanto na tela de resumo (seção 5.8) quanto como entrada de meta semanal de tempo de treino — decisão confirmada do Fernando (10/09/2026): fica de fora desta versão; ideia futura, não descartada, só não faz parte desta spec
- Uso do dado desta spec na regra de agregação de adesão do próximo ciclo (Spec 06, seção 6) — hoje essa regra usa só `WeeklyCheckIn.workoutAdherence` (autodeclarado); cruzar com sessões reais é uma evolução futura, não desta spec
- Qualquer edição do `WorkoutPlan` gerado (isso continua sendo função da tela de edição de treino, Spec 05) — a sessão consome o plano, não o edita
- Qualquer edição do `restSeconds`, `technique` ou `notes` sugeridos pela IA durante a sessão — a sessão só exibe/consome esses valores, não permite editá-los (edição continua sendo função da tela de edição de treino, Spec 05)
- Ações rápidas embutidas na notificação de descanso (concluir série/pular/ajustar tempo sem abrir o app) — direção confirmada para uma versão futura, documentada na seção 5.11, mas bloqueada até a resolução do bug de som/vibração ainda em aberto (seção 5.5); não faz parte do que esta versão da spec pede para implementar

## 4. Modelo de dados (proposta Prisma)

```prisma
model WorkoutSession {
  id              String    @id @default(cuid())
  userId          String
  healthCycleId   String?   // ciclo ativo no início da sessão, se houver
  dayLabel        String?   // ex.: "Dia A — Peito e Tríceps", copiado do WorkoutPlan ao iniciar; null = sessão livre, sem dia vinculado
  startedAt       DateTime  @default(now())
  finishedAt      DateTime? // null enquanto a sessão está em andamento
  durationSeconds Int?      // calculado (finishedAt - startedAt) e persistido só ao finalizar; nunca recalculado depois

  setLogs         WorkoutSetLog[]

  @@index([userId, startedAt])
}

model WorkoutSetLog {
  id                    String   @id @default(cuid())
  workoutSessionId      String
  workoutExerciseId     String?  // referência ao exercício gerado (Spec 05), quando vinculado ao plano
  exerciseNameFreeText  String?  // usado quando o exercício não está no plano gerado (mesmo padrão da Spec 06)
  exerciseOrderIndex    Int      // ordem do exercício dentro da sessão (mantém o agrupamento visual)
  setNumber             Int      // ordem da série dentro do exercício, dentro desta sessão
  weightKg              Float?
  repsCompleted         String?  // texto livre, mesmo padrão já usado (ex.: "8", "8-10")
  completed             Boolean  @default(false) // marcado quando o usuário confirma a série feita
  notes                 String?  // observação por exercício (não por série — ver seção 6)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  workoutSession        WorkoutSession @relation(fields: [workoutSessionId], references: [id])

  @@index([workoutSessionId, exerciseOrderIndex, setNumber])
}
```

**Nota sobre `WorkoutExecutionLog` (Spec 06) — decisão confirmada:** o Fernando confirmou a remoção. Este modelo e a tela antiga (Tela 21/Etapa 3, formulário de registro posterior por exercício) devem ser removidos, não mantidos em paralelo com a sessão ao vivo. Como o produto ainda não tem usuário real em produção (só dado de teste), não há dado de produção a migrar.

**Nota sobre o timer de descanso:** não exige nenhum campo novo persistido. Ele consome `WorkoutExercise.restSeconds` (Spec 05, já existente) só como leitura, e sua contagem regressiva é inteiramente client-side/efêmera (não grava nada em `WorkoutSetLog` nem em nenhuma outra tabela) — ver seção 5.5.

**Nota sobre as orientações da IA por exercício:** também não exige campo novo — `WorkoutExercise.technique` e `WorkoutExercise.notes` (Spec 05) já existem no modelo de dados e já são gerados pela IA (ex.: "Foque em volume", "Pegada supinada", "drop-set"); o que faltava era exibi-los na tela de sessão. Ver seção 5.6.

**Nota sobre a pré-visualização e a tela de resumo (seções 5.7 e 5.8):** também não exigem campo novo. A pré-visualização só lê `WorkoutExercise` do dia escolhido (sem criar `WorkoutSession`). O resumo pós-treino é inteiramente derivado do que já está na sessão finalizada (`durationSeconds`, contagem e soma sobre `WorkoutSetLog`) — calculado no cliente, sem endpoint dedicado, mesmo padrão já adotado para o resumo "há N dias treinado" da tela de início (seção 5.7).

## 5. Regras de comportamento

### 5.1 Início de sessão
- Sessão vinculada a um dia (`dayLabel`) exige um `HealthCycle` ativo com `WorkoutPlan` gerado — a tela lista os dias disponíveis (Dia A, B, C...) do plano ativo
- Ao tocar num dia (fora sessão livre), o produto **não cria a `WorkoutSession` imediatamente** — antes, abre a pré-visualização somente-leitura dos exercícios daquele dia (seção 5.7). A sessão só é criada quando o usuário toca em "Iniciar treino" dentro dessa pré-visualização
- Sessão livre (sem dia vinculado) sempre disponível, mesmo sem ciclo ativo — usuário monta a sessão só com exercícios em texto livre; por não ter exercícios de um dia pra mostrar, pula a pré-visualização e cria a sessão direto
- Só uma sessão em aberto (`finishedAt: null`) por usuário por vez. Ao tentar iniciar uma nova com uma já em aberto, o produto oferece retomar a existente em vez de criar outra
- Retomar uma sessão em aberto (a partir do card "Sessão em andamento") também pula a pré-visualização — vai direto pra tela ao vivo, já que a sessão já existe

### 5.2 Pré-preenchimento de série
- Primeira vez que um exercício do plano é treinado em qualquer sessão: séries/repetições sugeridas vêm do `WorkoutExercise.sets`/`reps` (Spec 05); carga fica vazia (o plano não propõe carga)
- Da segunda vez em diante: cada série é pré-preenchida com o `WorkoutSetLog` de mesmo `setNumber` da sessão mais recente para aquele mesmo exercício (mesmo `workoutExerciseId` ou mesmo `exerciseNameFreeText` exato). Se a sessão anterior teve menos séries que a atual, séries extras ficam vazias (sem dado anterior pra puxar)
- Exercício em texto livre sem nenhum registro anterior: nenhuma sugestão, campos vazios

### 5.3 Salvamento
- Cada série marcada como concluída (`completed: true`) dispara upsert imediato daquele `WorkoutSetLog` — a sessão não depende de um "salvar tudo no final" pra não perder progresso se o app fechar no meio do treino
- Editar peso/repetições **sem** marcar a série como concluída não persiste nada — é só estado local da tela enquanto o usuário ajusta o valor antes de confirmar. Isso é intencional (evita salvar rascunho parcial toda hora), mas é um ponto de confusão real confirmado em teste em dispositivo físico (10/09/2026): o usuário editou valores sem marcar a série como concluída, achou que tinha salvo, e não persistiu — comportamento correto pela regra acima, mas confuso na prática. **Decisão confirmada:** os campos de peso/repetições recebem um indicador visual (destaque de borda) quando o valor foi editado mas a série ainda não foi marcada como concluída, deixando claro que falta confirmar
- "Concluir treino" marca `finishedAt` e calcula `durationSeconds`; sessão sem nenhuma série marcada como concluída ainda pode ser finalizada (treino curto/interrompido não é erro)

### 5.4 Retomada
- Ao abrir a tela de treino, o produto verifica se há sessão em aberto do usuário; se houver, oferece continuar de onde parou (séries já registradas aparecem marcadas)
- Sessão em aberto de um dia anterior (ex.: esquecida aberta) continua retomável — não expira automaticamente. Se o usuário preferir descartar, a tela deve oferecer opção explícita de finalizar (ou descartar) a sessão antiga antes de iniciar uma nova

### 5.5 Timer de descanso entre séries
- Ao marcar uma série de um exercício do plano como concluída, se esse exercício tiver `restSeconds` preenchido (Spec 05), o produto inicia automaticamente uma contagem regressiva de descanso com esse valor
- **Apresentação: barra persistente não-bloqueante** (decisão confirmada, substitui a ideia inicial de bottom sheet bloqueante) — ancorada na parte inferior da tela da sessão, mostrando tempo restante, próxima série e um botão "Pular", sem cobrir nem travar o restante da tela. O usuário continua vendo e rolando a lista de exercícios (inclusive abrindo/editando outro exercício) enquanto o descanso corre — não é obrigado a esperar parado numa tela de bloqueio pra ver o que vem a seguir no treino. A barra pode ser expandida (toque no indicador de expandir) pra uma versão maior com mais detalhe, mas seu estado padrão é compacto e não-modal
- Ao chegar a zero, o produto emite um sinal sonoro e/ou vibração (respeitando as configurações de som/vibração do aparelho) avisando que o descanso acabou. **Decisão confirmada (10/09/2026):** a barra não fica travada em `00:00` esperando o usuário — some automaticamente pouco depois do sinal (poucos segundos, tempo suficiente pra confirmar visualmente que o descanso acabou), sem exigir toque em "Pular" nem em nenhum outro botão para desaparecer. "Pular" continua servindo só pra encerrar a contagem antes do fim, não depois
- O usuário pode pular o descanso a qualquer momento da contagem, tocando em "Pular" na barra — isso encerra o timer imediatamente
- **Notificação local do sistema operacional (confirmado como requisito, não mais ponto em aberto):** como o app pode ir para segundo plano durante o descanso (usuário troca de app, tela bloqueia), o aviso sonoro/vibração ao final da contagem depende de uma notificação local agendada pelo sistema operacional no momento em que o timer inicia (não pode depender só de o app estar em primeiro plano). A viabilidade exata de agendamento (iOS/Android) é responsabilidade de implementação, mas o requisito de produto é: o aviso tem que chegar mesmo com o app em segundo plano. **Ainda não validado de fato em dispositivo físico** — ver acompanhamento fora desta spec (mensagem ao Claude Code de 10/09/2026)
- Exercício em texto livre (`exerciseNameFreeText`, sem vínculo com um `WorkoutExercise` do plano) não tem `restSeconds` disponível — para esses, nenhum timer é iniciado automaticamente; o usuário segue direto pra próxima série sem interrupção
- Séries extras além das sugeridas pelo plano (seção 3) usam o mesmo `restSeconds` do exercício ao qual pertencem
- O timer é inteiramente local à sessão em andamento: não é persistido, não pausa nem afeta o cronômetro de duração total da sessão (`startedAt`/`finishedAt` seguem contando durante o descanso, já que descanso faz parte do tempo real de treino)

### 5.6 Orientações da IA por exercício — composição confirmada
- Quando `WorkoutExercise.technique` estiver preenchido (ex.: "drop-set", "rest-pause", "bi-set"), exibir como um **selo curto (badge) inline, ao lado do nome do exercício**, no mesmo estilo tonal já usado pra badge de categoria no `sistema-visual.md` (fundo `#E4F5EE`, texto `--vital-dark`) — é uma etiqueta curta de identificação da técnica, não um aviso, por isso a mesma cor tonal de Vital usada em badges neutras (ex.: badge "Suplemento" na linha do tempo de prescrições), nunca Pulse (reservado pra atenção/energia/calorias, ver seção 3 do `sistema-visual.md`)
- Quando `WorkoutExercise.notes` estiver preenchido (ex.: "Foque na fase excêntrica — desça em 3s antes de empurrar"), exibir como uma **linha de texto corrido logo abaixo do nome/badge**, cor `--muted`, 12.5px — é explicação mais longa, não cabe em selo
- Os dois podem aparecer juntos no mesmo card (badge de `technique` ao lado do nome + linha de `notes` abaixo); qualquer um pode aparecer sozinho, dependendo do que a IA gerou pra aquele exercício
- Exercício sem `technique` nem `notes` preenchidos: nem selo nem linha aparecem, o card fica só com nome + descanso, como já é hoje
- Exercício avulso em texto livre (`exerciseNameFreeText`) nunca tem essas orientações, por não ter `WorkoutExercise` associado
- Já refletido no mockup (`mockups.html`, telas 28/29): o exercício "Supino reto — barra" mostra o selo "Drop-set" ao lado do nome + a linha de nota abaixo, como referência de composição

### 5.7 Pré-visualização do dia antes de iniciar (novo, 10/09/2026 — regra de paridade adicionada em 21/09/2026)
- Motivação: em teste real, iniciar a sessão (e o cronômetro) no mesmo toque que escolhe o dia impede o usuário de simplesmente conferir quais exercícios o treino daquele dia tem, sem se comprometer a treinar naquele momento
- Ao tocar num dia (fora sessão livre) na tela "Iniciar sessão de treino", o produto abre uma tela somente-leitura listando os exercícios daquele dia: nome, selo de `technique` e nota de `notes` quando houver (mesma composição da seção 5.6), descanso sugerido, e `sets × reps` sugeridos — sem campos de peso/repetição editáveis, sem toggle de conclusão, sem cronômetro rodando. Nenhuma `WorkoutSession` é criada nesse momento
- **Regra de paridade (confirmada em teste real, 21/09/2026 — corrige lacuna do v7):** a lista de exercícios exibida na pré-visualização tem que ser exatamente a mesma que a sessão ao vivo vai carregar ao tocar "Iniciar treino" — usando a mesma função/consulta de resolução de exercícios da seção 5.2 (que já considera a sessão de referência mais recente pra decidir quantas séries mostrar por exercício do plano) e incluindo também qualquer exercício avulso (`exerciseNameFreeText`) que tenha sido adicionado na sessão de referência mais recente daquele dia. Antes dessa correção, a pré-visualização usava só a lista crua do `WorkoutPlan`, então exercícios avulsos adicionados numa sessão anterior apareciam na sessão ao vivo mas não na pré-visualização — inconsistência que confundia o usuário sobre o que o treino "realmente" tinha. Implementação recomendada: reaproveitar a mesma função que monta a lista de exercícios da sessão ao vivo, não duas versões separadas
- Um botão fixo "Iniciar treino" no rodapé da pré-visualização é o único gatilho que cria de fato a `WorkoutSession` (mesmo fluxo já descrito na seção 5.1) e leva para a tela de sessão ao vivo
- Voltar da pré-visualização sem tocar em "Iniciar treino" não tem efeito nenhum — nada foi criado
- Sessão livre não passa por essa pré-visualização (não há um dia com exercícios pré-definidos pra mostrar) — o botão de sessão livre continua criando a sessão direto, como já era
- Retomar uma sessão em aberto (card "Sessão em andamento") também pula essa pré-visualização, indo direto para a tela ao vivo

### 5.8 Tela de conclusão da sessão (novo, 10/09/2026)
- Ao tocar em "Concluir" na tela de sessão ao vivo (finalização já descrita na seção 5.3), em vez de simplesmente fechar a tela, o produto exibe uma tela de resumo da sessão que acabou de terminar
- Conteúdo do resumo: dia (`dayLabel`, ou "Sessão livre" quando não houver), duração total (`durationSeconds`, formatada), número de séries marcadas como concluídas nessa sessão, e peso total levantado
- **Cálculo do peso total levantado (regra confirmada):** soma de `weightKg × repsCompleted` de cada `WorkoutSetLog` concluído dessa sessão, somando apenas quando `repsCompleted` for um número inteiro simples (ex.: "8", "10") e `weightKg` estiver preenchido. Série concluída com `repsCompleted` em formato não-numérico (ex.: "8-10") ou vazio, ou sem `weightKg`, conta para o número de séries concluídas mas não entra nessa soma — evita estimar peso em cima de um dado ambíguo
- **Sem estimativa de calorias** (decisão confirmada do Fernando, 10/09/2026) — mantém alinhado com a exclusão já registrada na seção 3/10 desta spec. Pode ser revisitado como evolução futura, com uma fórmula e fonte de dado definidas com calma, mas não faz parte desta versão
- Todo o cálculo é feito no cliente, a partir dos dados que a sessão já tem localmente ao finalizar (mesmo padrão do resumo "há N dias" da tela de início, seção 7) — não exige endpoint dedicado, só que a resposta do `PUT /workout-sessions/:id/finish` (seção 7) retorne (ou o cliente já tenha em memória) os `WorkoutSetLog` da sessão finalizada
- Um botão ("Voltar ao início") encerra o fluxo, voltando à tela inicial do produto

### 5.9 Descartar sessão em andamento (novo, 10/09/2026)
- Motivação: relatado em teste real — o usuário pode iniciar uma sessão sem querer, ou querer parar no meio e não guardar aquele treino (ex.: começou errado, mudou de ideia, testou o produto). Hoje a única saída é "Concluir", que sempre soma aquele tempo/série ao histórico
- Botão "Descartar treino" fica visível na tela de sessão ao vivo, junto com "Concluir" — ação secundária (não é o botão de destaque da tela), mas nunca escondida atrás de menu adicional
- Ao tocar, exige confirmação explícita antes de descartar de fato (diálogo simples: "Descartar este treino? As séries registradas nele serão perdidas." com as opções "Cancelar" e "Descartar") — evita descarte acidental
- Ao confirmar, a `WorkoutSession` (e seus `WorkoutSetLog`) deixam de existir para qualquer efeito prático do produto: não contam como referência de pré-preenchimento (seção 5.2) de sessões futuras, não aparecem em nenhum histórico, e não bloqueiam início de nova sessão (a regra de "só uma sessão em aberto", seção 5.1, passa a valer normalmente de novo). Fica a critério da implementação decidir entre exclusão definitiva do registro ou uma marcação de "descartada" que a UI e as consultas ignoram — não é uma escolha que muda o comportamento visível do produto
- Sessão descartada não passa pela tela de resumo (seção 5.8) — volta direto pra tela inicial, já que não foi uma sessão concluída
- Diferente de "Concluir": não calcula nem persiste `finishedAt`/`durationSeconds`

### 5.10 Gráfico de progressão do dia na pré-visualização (novo, 22/09/2026 — origem: benchmark Hevy)
- Motivação: o benchmark do app Hevy (`claude/10-benchmark-hevy-oportunidades.md`, seção 3.3) mostrou que exibir a evolução histórica do dia (volume, repetições, duração) antes mesmo de iniciar o treino ajuda o usuário a decidir e a se situar — mesmo sem o conceito de "rotina reutilizável" do Hevy, o dia gerado pela IA (`dayLabel`, ex.: "Leg B") se repete entre sessões e entre versões do plano, então o mesmo padrão se aplica
- Na tela de pré-visualização (seção 5.7), acima da lista de exercícios, exibir um componente de gráfico com um seletor de três métricas — **Volume**, **Repetições**, **Duração** — mostrando a tendência ao longo das sessões concluídas anteriores que compartilham o mesmo `dayLabel` deste dia
- Cálculo de cada métrica, por sessão concluída considerada:
  - **Volume**: soma de `weightKg × repsCompleted` de todos os `WorkoutSetLog` concluídos da sessão, mesma regra de "peso total" já usada na tela de resumo (seção 5.8) — só soma quando `repsCompleted` for um inteiro simples
  - **Repetições**: contagem de `WorkoutSetLog` concluídos da sessão (mesmo dado de "séries concluídas" da seção 5.8)
  - **Duração**: `durationSeconds` da sessão
- Estado vazio: quando não houver nenhuma sessão concluída anterior com esse `dayLabel`, o componente mostra um estado "Ainda sem dados" no lugar do gráfico, sem tratar isso como erro — é o caso normal na primeira vez que um dia é treinado
- **Ponto em aberto, a confirmar com arquitetura antes de implementar:** hoje o `dayLabel` é copiado como texto simples do `WorkoutPlan` para a `WorkoutSession` no momento em que a sessão é criada (seção 4). Ele só serve como chave de agregação estável entre sessões enquanto o texto não mudar. Se a IA regenerar o plano após um novo exame e renomear ou reordenar os dias (ex.: "Leg B" vira outro texto, ou passa a ser o terceiro dia em vez do segundo), a agregação por correspondência exata de texto passa a subestimar o histórico real daquele "tipo de dia". Antes de implementar esta seção, confirmar se `dayLabel` é estável entre regerações do plano ou se é necessário introduzir um identificador mais estável (ex.: um slug/índice de "tipo de dia" independente do texto exibido). Enquanto não confirmado, a implementação assume correspondência exata de texto em `dayLabel` como aproximação aceitável
- Componente somente-leitura, no mesmo espírito da pré-visualização (seção 5.7) — não interfere no botão "Iniciar treino" nem atrasa o carregamento da lista de exercícios; pode carregar de forma assíncrona/separada
- Sessão livre não tem `dayLabel` — não mostra esse componente, mesma exceção já aplicada ao restante da pré-visualização (seção 5.7)

### 5.11 Notificação de descanso com ações rápidas — evolução futura, não implementada nesta versão (novo, 22/09/2026 — origem: benchmark Hevy)
- Direção confirmada pelo Fernando (22/09/2026) a partir do benchmark do Hevy (`claude/10-benchmark-hevy-oportunidades.md`, seção 3.2): evoluir a notificação local de descanso (seção 5.5) para incluir ações diretas na própria notificação, sem exigir abrir o app — "Concluir série" (marca a próxima série pendente da sessão como concluída), "Pular" (encerra o timer de descanso), e ajuste de tempo (`-15s`/`+15s`) no meio da contagem
- **Pré-requisito explícito, não negociável:** esta evolução só deve começar a ser implementada depois que o comportamento atual de som/vibração da notificação (seção 5.5) estiver confirmado funcionando em todos os cenários de app (primeiro plano, minimizado, bloqueado) — hoje ainda em aberto (ver acompanhamento fora desta spec). Adicionar interatividade em cima de uma notificação cujo disparo básico ainda falha só aumentaria a superfície do bug atual
- Registrada aqui como direção de produto confirmada para quando o bug de som/vibração for resolvido — **fora do escopo de implementação desta versão da spec** (ver também seção 3, "Não cobre", e seção 10)
- Sem mockup de alta fidelidade ainda — a notificação nativa do sistema operacional não é uma tela do produto no sentido do `mockups.html`; o comportamento alvo está descrito em texto aqui, a ser refinado quando a implementação for de fato priorizada

## 6. Fluxo técnico

1. Usuário abre a tela de treino → produto verifica sessão em aberto (retomar, direto pra tela ao vivo) ou lista os dias do plano ativo + opção de sessão livre
2. Ao escolher um dia, abre a pré-visualização somente-leitura dos exercícios daquele dia (seção 5.7) — nenhuma sessão é criada ainda. Sessão livre pula essa etapa
3. Ao tocar em "Iniciar treino" (na pré-visualização, ou direto para sessão livre), cria `WorkoutSession` (`startedAt: now()`, `dayLabel` copiado do plano quando houver) e monta a lista de exercícios, cada um com séries pré-preenchidas (seção 5.2) e orientações da IA visíveis (seção 5.6)
4. Cronômetro visível conta o tempo desde `startedAt`
5. Usuário registra séries (marca concluída, ajusta peso/reps) — cada marcação dispara upsert (seção 5.3) e, se o exercício tiver `restSeconds`, inicia o timer de descanso em barra persistente (seção 5.5); pode adicionar série extra ou exercício avulso em texto livre a qualquer momento, inclusive com o timer de descanso rodando
6. "Concluir treino" finaliza a sessão (`finishedAt`, `durationSeconds`) e exibe a tela de resumo (seção 5.8), calculada a partir dos dados da sessão recém-finalizada. Alternativamente, "Descartar treino" (seção 5.9), após confirmação, encerra a sessão sem finalizá-la e sem exibir o resumo

## 7. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/workout-sessions/active` | GET | Retorna a sessão em aberto do usuário, se houver |
| `/workout-sessions` | POST | Inicia uma nova sessão (`dayLabel` opcional) — chamado só ao tocar "Iniciar treino" (seções 5.1/5.7), nunca ao só abrir a pré-visualização |
| `/workout-sessions/:id/sets` | PUT | Upsert de uma série (`exerciseOrderIndex` + `setNumber` como chave dentro da sessão) |
| `/workout-sessions/:id/finish` | PUT | Marca `finishedAt`, calcula `durationSeconds`. O cliente já tem em memória (ou recebe de volta nessa resposta) os `WorkoutSetLog` da sessão pra montar a tela de resumo (seção 5.8) sem chamada extra |
| `/workout-sessions/:id` | GET | Retorna estado atual da sessão (pra retomar) — inclui `technique`/`notes`/`restSeconds` de cada exercício, já vindos do `WorkoutExercise` |
| `/workout-sessions` | GET | Lista sessões do usuário (histórico bruto — consumo futuro pela Spec 07); também usado pelo cliente pra calcular "há N dias"/"ainda não treinado" na tela de início (seção 5.1), sem endpoint dedicado |

O timer de descanso não tem endpoint próprio — `restSeconds` já vem no payload do exercício (seção 5.5), e a contagem/sinalização (incluindo o agendamento da notificação local) é resolvida inteiramente no cliente. As orientações da IA (seção 5.6), a pré-visualização (seção 5.7) e o resumo pós-treino (seção 5.8) também não têm endpoint próprio — usam dado já disponível no payload de exercício ou na própria sessão.

## 8. Tratamento de erros e casos de borda

- **Nenhum ciclo ativo / sem plano gerado** — sessão vinculada a dia não é oferecida; sessão livre continua disponível
- **Usuário tenta iniciar sessão com uma já em aberto** — não cria duplicata; oferece retomar a existente (seção 5.1)
- **Série sem peso nem repetições preenchidos, só marcada como concluída** — aceito; nível de detalhe é escolha do usuário, mesmo princípio da Spec 06
- **Sessão finalizada sem nenhuma série registrada** — aceito, duração ainda é salva (o usuário pode ter feito um treino sem registrar nada em detalhe, só quis contar o tempo); a tela de resumo (seção 5.8) mostra 0 séries e 0 kg de peso total nesse caso
- **App fechado/encerrado no meio de uma sessão** — nenhuma perda de dado além da série que estava sendo digitada e não foi marcada como concluída (salvamento é por série, seção 5.3); sessão continua em aberto pra retomada
- **Exercício sem `restSeconds` (não preenchido pela IA na geração, ou exercício avulso em texto livre)** — nenhum timer é iniciado; usuário segue direto pra próxima série (seção 5.5)
- **Usuário marca outra série como concluída enquanto o timer de descanso anterior ainda está contando** — a barra sendo não-bloqueante, isso é possível (o usuário pode adiantar outro exercício durante o descanso); o timer mais recente substitui o anterior na barra, não empilha
- **App em segundo plano durante o descanso** — o aviso sonoro/vibração deve chegar mesmo assim, via notificação local agendada (seção 5.5); é requisito de produto, não um "seria bom ter" — pendente de confirmação real em dispositivo (ver seção 5.5)
- **Usuário sai da pré-visualização (seção 5.7) sem tocar em "Iniciar treino"** — nenhum efeito; nenhuma `WorkoutSession` foi criada, nada pra desfazer

## 9. Critérios de aceite

- [ ] Usuário consegue iniciar uma sessão vinculada a um dia do plano ativo e ver todos os exercícios daquele dia abertos ao mesmo tempo
- [ ] Ao tocar num dia (fora sessão livre), aparece a pré-visualização somente-leitura dos exercícios antes de qualquer `WorkoutSession` ser criada; a sessão só começa de fato ao tocar em "Iniciar treino" (seção 5.7)
- [ ] A pré-visualização mostra exatamente os mesmos exercícios (inclusive avulsos adicionados numa sessão anterior) e a mesma quantidade de séries por exercício que a sessão ao vivo vai de fato carregar — sem divergência entre as duas telas (seção 5.7)
- [ ] A pré-visualização mostra um gráfico de progressão do dia (Volume/Repetições/Duração, com seletor entre as três) agregando sessões concluídas anteriores do mesmo `dayLabel`, com estado "Ainda sem dados" quando não houver histórico; sessão livre não mostra esse componente (seção 5.10)
- [ ] Séries vêm pré-preenchidas com a sugestão do plano (primeira vez) ou o último registro real (demais vezes), série a série
- [ ] Orientações da IA aparecem visíveis junto ao exercício: `technique` como selo ao lado do nome, `notes` como linha de texto abaixo (seção 5.6), sem exigir toque extra
- [ ] Usuário consegue registrar peso/repetições e marcar série como concluída, com salvamento imediato (não só ao final)
- [ ] Usuário consegue adicionar série extra e exercício avulso em texto livre durante a sessão
- [ ] Ao marcar uma série de um exercício com `restSeconds` como concluída, uma barra de descanso não-bloqueante aparece com o tempo restante e a próxima série, sinaliza (som/vibração, inclusive com o app em segundo plano) ao chegar a zero, pode ser pulada a qualquer momento, e não impede o usuário de continuar vendo/rolando os outros exercícios da sessão enquanto ela está ativa
- [ ] Exercício sem `restSeconds` (ou avulso em texto livre) não dispara timer de descanso
- [ ] Duração real da sessão é calculada e persistida ao finalizar, contando o tempo de descanso como parte do treino
- [ ] Ao concluir a sessão, aparece uma tela de resumo com dia, duração, número de séries concluídas e peso total levantado (seção 5.8), sem estimativa de calorias
- [ ] Usuário consegue descartar uma sessão em andamento, com confirmação explícita antes do descarte; a sessão descartada não conta como referência de pré-preenchimento nem bloqueia iniciar uma nova (seção 5.9)
- [ ] A barra de descanso desaparece sozinha pouco depois de chegar a zero, sem depender de toque em "Pular" pra sumir (seção 5.5)
- [ ] Só existe uma sessão em aberto por usuário; abrir a tela com uma sessão em aberto oferece retomar em vez de duplicar
- [ ] Sessão sem nenhum ciclo ativo ainda permite treino livre em texto livre
- [ ] Fechar o app no meio da sessão não perde séries já marcadas como concluídas

## 10. Fora de escopo desta spec

- Ações rápidas embutidas na notificação de descanso (concluir série/pular/ajustar tempo sem abrir o app) — direção confirmada (seção 5.11), bloqueada até a resolução do bug de som/vibração ainda em aberto; não é pedida nesta versão
- Histórico visual de sessões (gráfico, frequência) fora do contexto do dia específico na pré-visualização — isso continua sendo candidato à Spec 07 (Dashboard); o gráfico da seção 5.10 é escopado ao dia sendo pré-visualizado, não um histórico geral
- Estimativa de gasto calórico da sessão, seja na tela de resumo (seção 5.8) seja como entrada de meta de tempo semanal — ideia futura, decisão confirmada de deixar fora desta versão (10/09/2026)
- Cruzamento de sessões reais com a regra de adesão do próximo ciclo (Spec 06, seção 6) — hoje baseada só em check-in autodeclarado
- Configuração de um `restSeconds`, `technique` ou `notes` customizado pelo usuário, diferente do sugerido pela IA
- **Mockup de alta fidelidade:** as telas 27 ("Iniciar sessão de treino"), 28 ("Sessão de treino ao vivo"), 29 ("Descanso entre séries — barra persistente"), 30 ("Pré-visualização do dia antes de iniciar") e 31 ("Sessão concluída — resumo pós-treino") já estão em `mockups.html`, seguindo os componentes e regras do `sistema-visual.md`. A versão com bottom sheet bloqueante do descanso foi descartada e substituída pela barra persistente (seção 5.5); os cards de exercício já mostram a composição confirmada de orientação da IA (selo de `technique` + linha de `notes`, seção 5.6), com "Supino reto — barra" como exemplo (selo "Drop-set"). O gráfico de progressão do dia (seção 5.10) já tem mockup na tela 30, adicionado nesta versão. O `sistema-visual.md` já foi atualizado com o inventário e os componentes dessas telas.

---
*Rascunho v9 — adiciona duas seções a partir do benchmark do app Hevy (22/09/2026, `claude/10-benchmark-hevy-oportunidades.md`): gráfico de progressão do dia na pré-visualização (seção 5.10, com mockup novo na tela 30 e um ponto em aberto sobre estabilidade de `dayLabel` entre regerações de plano, a confirmar com arquitetura antes de implementar) e notificação de descanso com ações rápidas como evolução futura, explicitamente bloqueada até o bug de som/vibração ser resolvido (seção 5.11, fora do escopo de implementação desta versão). Mantém do v8: pré-visualização usando a mesma resolução de exercícios da sessão ao vivo, incluindo avulsos (seção 5.7). Mantém do v7: descarte de sessão em andamento (seção 5.9), barra de descanso desaparecendo sozinha ao chegar a zero (seção 5.5). Mantém do v6: indicador visual de série editada-mas-não-confirmada (seção 5.3). Mantém do v5: tela de conclusão/resumo pós-treino (seção 5.8), sem estimativa de calorias. Notificação visual confirmada funcionando em todos os cenários (primeiro plano, minimizado, bloqueado) em teste real (21/09/2026); som/vibração ainda não confirmados funcionando em nenhum cenário — retomado logo após esta rodada de documentação. A detalhar conforme a implementação avançar, como combinado.*
