# Guia de Design — Body Healthy
**Status:** Rascunho v8 · **Data:** 10/09/2026
**Cobre:** sistema visual completo (cor, tipografia, componentes) e inventário de telas da Fase 1
**Depende de:** PRD Fase 1, Specs 00-09 · **Referência viva:** `mockups.html` (neste mesmo diretório)

---

## 1. Objetivo

Este documento é a fonte da verdade do sistema visual do Body Healthy — mesmo princípio de imutabilidade das specs técnicas. Qualquer tela implementada no app deve seguir o que está aqui; qualquer desvio precisa ser debatido e documentado antes, não decidido durante a implementação.

## 2. Princípio de direção

Equilíbrio deliberado entre duas referências: **vital/energético** (fitness, movimento, cor viva) e **disciplina visual de fintech brasileira** (Nubank/Inter — números grandes e confiantes, muito espaço em branco, sem excesso decorativo). A energia mora na cor; a disciplina mora no layout.

Isso significa, na prática:
- Cards sem `box-shadow` pesada — separados por espaço ou divisor fino, não por sombra genérica de SaaS
- Um accent de cor por vez em cada tela — nunca Vital e Pulse competindo no mesmo elemento
- Números como herói nas telas de dado (meta calórica, contagem regressiva, macros) — tipografia grande, não ícone decorativo
- Nada de emoji ou ilustração fofa — isso é um produto de saúde, a seriedade do dado precisa transparecer mesmo com cor viva

## 3. Cor

| Token | Hex | Uso |
|---|---|---|
| `--ink` | `#12181F` | Texto principal — quase-preto com leve calor azulado, nunca preto puro |
| `--base` | `#FFFFFF` | Fundo padrão |
| `--vital` | `#0EA97A` | Accent primário — ação principal, sinal de saúde positivo |
| `--vital-dark` | `#085041` | Variante escura do Vital, para texto sobre fundo claro (ex.: número em mini-card) |
| `--pulse` | `#FF5D3A` | Accent secundário — energia, calorias, atenção/destaque |
| `--pulse-dark` | `#8A2E17` | Variante escura do Pulse, para texto/badge sobre fundo claro |
| `--mist` | `#F1F5F3` | Superfície de card — sutil, sem sombra |
| `--line` | `#DDE3E0` | Divisores, bordas |
| `--muted` | `#6B7570` | Texto secundário |

**Regra semântica não-negociável** (foi um ajuste deliberado após a primeira rodada de mockups, onde Vital sozinho ficou "sóbrio demais"):

- **Vital (verde)** = ação primária (botões principais) e sinal de saúde/progresso positivo (adesão, tendência dentro da faixa, item confirmado na linha do tempo)
- **Pulse (coral)** = energia e calorias (todo o fluxo de registro calórico é predominantemente coral), atenção/destaque (marcador fora da faixa, badge "novo" em exercício trocado, ação de sinalizar erro, contagem regressiva de descanso entre séries — Spec 09), e a "zona de risco" em configurações (excluir conta). Também usado para agrupar categorias de sensibilidade clínica mais alta (ex.: badge de Medicação e Hormônio na linha do tempo de prescrições, Spec 04) — enquanto Suplemento, de menor sensibilidade, fica na cor padrão (Vital)
- Nunca usar os dois como accent competindo no mesmo componente. Um decide o tom da tela; o outro aparece pontual, se aparecer

**Regra adicional para valor de marcador de exame (nunca usar Vital/verde aqui):** classificar um valor numérico como "bom"/"favorável" — não apenas "dentro ou fora da faixa de referência" — é julgamento clínico, que o produto não faz (RNF02). Por isso, o indicador de cor num marcador de exame (bolinha, badge) usa apenas duas cores: `dot-pulse` (coral) quando o valor está fora da faixa de referência do próprio laudo, e `dot-mid` (cinza neutro) em qualquer outro caso — dentro da faixa, ou faixa desconhecida. Vital/verde nunca aparece como indicador de valor de marcador, em nenhuma tela.

## 4. Tipografia

- **Space Grotesk** (peso 500-700) — display: títulos, números grandes (meta calórica, contagem regressiva, macros, cronômetro de sessão e de descanso — Spec 09), wordmark
- **Inter** (peso 400-600) — corpo: parágrafo, label, dado denso (marcador de exame, listas). Usa números tabulares (`font-variant-numeric: tabular-nums`) em qualquer valor numérico que apareça em lista, para não "dançar" quando os dígitos mudam de largura

**Piso mínimo de tamanho de fonte (adicionado v4, 03/09/2026):** nenhum texto do produto usa menos que **13px**, em nenhuma tela — inclui rodapé, disclaimer, badge de categoria, texto secundário/`--muted`. O `mockups.html` original tem vários valores abaixo disso (badges em 10.5px, disclaimers e notas em 11-12px), copiados de um preview de desktop onde liam bem; testado em dispositivo físico real, ficaram difíceis de ler. Ao implementar qualquer tela cujo mockup especifique um `font-size` abaixo de 13px, usar 13px em vez do valor do mockup — isso vale tanto pra telas novas quanto pra revisão das já implementadas.

## 5. Componentes

| Componente | Regra |
|---|---|
| Botão primário | Pílula (`border-radius: 100px`), fundo Vital, texto branco, peso 600 |
| Botão secundário | Pílula, fundo branco, borda `--line` |
| Botão de texto/link | Sem fundo, cor `--muted` (ação neutra) ou `--pulse-dark` (ação de atenção, ex.: sinalizar erro) |
| Elemento tocável somente-ícone (regra geral, v4) | Qualquer elemento interativo cujo conteúdo visível é só um ícone (sem texto ao lado) — botão de voltar, FAB de adicionar, engrenagem de configurações, "x" de fechar, etc. — usa área de toque mínima de **44×44** (padrão iOS HIG / Material Design), mesmo que o ícone visual dentro dela seja menor. O `mockups.html` original tem exemplos abaixo disso (ex.: `add-fab` em 34×34) — ao implementar, usar 44×44 de área de toque independente do valor do mockup |
| Botão de voltar (header) | Caso específico da regra acima. Ícone de seta 24×24, dentro da área de toque mínima de 44×44. Cor `--ink`, sem fundo. Componente único (`BackButton`), reaproveitado em todo header com navegação de volta — nunca recriado por tela |
| Toggle (interruptor) | Pílula 42×24, bolinha 18×18, estado ativo = fundo Vital (mesma cor de estado ativo dos outros controles de seleção). Usado pra decisão binária simples dentro de um formulário (ex.: "Em uso contínuo" na tela de Nova prescrição, Spec 04). Implementado em `apps/src/components/Toggle.tsx` — reaproveitar em toda tela nova com decisão binária, não recriar por tela |
| ScaleDots (escala por pontos) | **Pendente de espelhar aqui:** componente já implementado e aprovado (check-in semanal, Spec 06 — energia e sono) em `apps/src/components/ScaleDots.tsx`, mas a linha de regra exata (medidas, espaçamento, estado ativo) enviada por quem implementou ainda não foi repassada nesta cópia do guia. Pedir o texto exato antes de reaproveitar o componente numa tela nova, pra não redigir uma regra divergente da implementação real |
| Chip (seleção única/múltipla) | Pílula pequena, estado ativo = fundo Vital + texto branco |
| Segmented control | Retângulo dividido, sem gap entre opções, estado ativo = fundo Vital |
| Card de superfície | Fundo `--mist`, `border-radius: 14-20px`, sem sombra |
| Card hero (número grande) | Fundo `--ink` (escuro) ou `--pulse` (quando o conteúdo é calórico), número em destaque |
| Linha de lista | Divisor `--line` embaixo, sem fundo próprio, padding vertical generoso |
| Badge de categoria | Pílula pequena, fundo tonal claro (`#E4F5EE` p/ Vital, `#FFEAE3` p/ Pulse), texto na variante escura correspondente, mínimo 13px (ver piso de fonte, seção 4) |
| Bottom sheet | Usado para decisões contextuais de poucas opções (ex.: as 3 opções pós-sinalização de laudo) — nunca para formulário longo, isso é tela cheia. **Não usado** para o descanso entre séries da Spec 09 — ver "Barra de descanso" abaixo |
| Dropzone de upload | Borda tracejada `--line`, ícone circular Vital, sem preview de imagem decorativa |
| Tab bar | 4 itens no máximo, ícone + label, item ativo em Vital |
| Campo de data | Mesmo visual do campo de texto padrão, mas sempre abre um seletor nativo (diálogo no Android, picker inline com "Concluir" no iOS) — nunca digitação livre de data. Mostra a data já formatada no lugar do placeholder, curta (`13/12/1984`, ex.: Nascimento) ou longa (`30 de novembro de 2026`, ex.: Próximo exame previsto), conforme o mockup de cada tela. Implementado em `apps/src/components/DateField.tsx` — reaproveitar em toda tela nova com campo de data, não recriar por tela |
| Action sheet (seleção de origem de arquivo) | Mesmo componente de Bottom sheet acima, especializado pra escolher entre poucas fontes de um arquivo (ex.: "Tirar foto" / "Escolher arquivo" na dropzone de upload de exame) — sempre 2-3 opções, nunca formulário. Implementado em `apps/src/components/ActionSheet.tsx` — reaproveitar em toda tela nova com upload de arquivo (ex.: laudo de imagem, Spec 02), não recriar por tela |
| Cronômetro de sessão (Spec 09) | Número grande (Space Grotesk display), formato `mm:ss`, cor branca sobre barra superior escura (`--ink`) fixa no topo da tela de sessão ao vivo. Conta o tempo desde `WorkoutSession.startedAt`, continua contando durante o descanso entre séries (não pausa) |
| Linha de série editável (Spec 09) | Dentro de cada card de exercício da sessão ao vivo: número da série + dois campos numéricos (peso em kg, repetições) + toggle circular de conclusão. Círculo desenhado em 32×32 visualmente (mesmo precedente do `add-fab`), área de toque mínima 44×44 (ver regra geral acima). Estado concluído = fundo Vital com marca de check |
| Selo de técnica do exercício (Spec 09) | Selo curto (pílula pequena) inline, logo ao lado do nome do exercício no card da sessão ao vivo, exibindo `WorkoutExercise.technique` (Spec 05) quando preenchido — ex.: "Drop-set", "Rest-pause", "Bi-set". Mesmo estilo tonal da Badge de categoria (fundo `#E4F5EE`, texto `--vital-dark`) — é identificação neutra, nunca Pulse. Sem `technique` preenchido, o selo não aparece |
| Nota de orientação do exercício (Spec 09) | Linha de texto (`--muted`, 12.5px) logo abaixo do nome do exercício (e do selo de técnica, se houver), dentro do card, exibindo `WorkoutExercise.notes` (Spec 05) quando preenchido — sempre visível, nunca atrás de um toque extra. Sem `notes` preenchido, a linha não aparece. Pode coexistir com o selo de técnica (um exercício pode ter os dois, só um, ou nenhum) |
| Barra de descanso — persistente, não-bloqueante (Spec 09) | **Substitui a ideia inicial de bottom sheet bloqueante** (decisão do Fernando, 08/09/2026: durante o descanso o usuário deve poder continuar vendo/rolando os outros exercícios). Card ancorado na base da tela da sessão ao vivo (não cobre a tela, não esmaece o fundo): contagem em destaque (Space Grotesk, cor `--pulse`) à esquerda, label "Descanso" + próxima série ao centro, indicador de expandir e botão "Pular" (Vital) à direita. Fundo `--ink`, cantos arredondados, flutua sobre o conteúdo com sombra leve. Nunca navega pra tela nova nem impede toque nos elementos por trás |
| Pré-visualização do dia antes de iniciar (Spec 09) | **Decisão do Fernando, 10/09/2026:** tocar num dia (fora sessão livre) na tela "Iniciar sessão de treino" não cria a sessão direto — abre antes uma lista somente-leitura dos exercícios daquele dia, reaproveitando a linha de exercício já usada na tela "Treino gerado" (nome, descanso, `sets × reps` sugeridos), com o selo de técnica e a nota de orientação quando houver, mas sem cronômetro nem campos de série editáveis. Botão "Iniciar treino" (largura total, fixo no rodapé) é o único gatilho que de fato cria a `WorkoutSession` e entra na sessão ao vivo. Sessão livre pula essa pré-visualização (não há exercícios de um dia pra mostrar) |
| Resumo de sessão concluída (Spec 09) | **Decisão do Fernando, 10/09/2026:** ao tocar "Concluir" na sessão ao vivo, tela de resumo com o mesmo selo de confirmação (`check-badge`) da tela de exportação de dados pronta, título "Sessão concluída", dia (ou "Sessão livre"), e três indicadores lado a lado no mesmo componente de card usado nos macros do plano de ação: duração total, número de séries concluídas e peso total levantado. Peso total = soma de peso × repetições das séries concluídas cujas repetições sejam um número inteiro; série com repetição em texto livre (ex.: "8-10") ou vazia conta para o número de séries mas não entra nesse total, pra não estimar em cima de dado ambíguo. **Sem estimativa de calorias** — mantém a exclusão já registrada na seção 10 da Spec 09 |

## 6. Padrões de conteúdo (copy)

- **"Por que pedimos"**: toda tela de coleta de dado de saúde tem essa explicação em caixa `--mist`, antes do usuário concluir a ação — nunca depois. Tom direto, sem jargão médico
- **Disclaimer clínico (RNF02)**: texto pequeno (`--muted`), presente em toda tela que exibe dado interpretado ou gerado por IA (marcador, resumo de laudo, plano, meta calórica/macro) — nunca omitido, nunca escondido atrás de "saiba mais"
- **Tom de voz geral**: direto, sem alarme, sem diminutivo. Nunca "clique aqui" — sempre o verbo da ação ("Confirmar", "Salvar", "Exportar")
- **Nunca**: emoji em texto de produto, exclamação, linguagem de urgência artificial

## 7. Inventário de telas — Fase 1

As 31 telas abaixo cobrem o inventário da Fase 1 (26 das Specs 00-08 + 5 novas da Spec 09). 30 têm mockup de alta fidelidade próprio em `mockups.html`; a tela 7 (upload de laudo de imagem) reaproveita o mockup da tela 4, com copy diferente. Status refere-se ao design, não à implementação em código.

| # | Tela | Spec de origem | Status |
|---|---|---|---|
| 1 | Boas-vindas / cadastro | Spec 00 | Desenhada |
| 2 | Consentimento LGPD | Spec 00 | Desenhada |
| 3 | Perfil básico | Spec 00 | Desenhada |
| 4 | Upload de exame | Spec 01 | Desenhada |
| 5 | Status de processamento | Spec 01 (reaproveitada por Spec 02) | Desenhada |
| 6 | Confirmação de marcadores | Spec 01 | Desenhada |
| 7 | Upload de laudo de imagem | Spec 02 | Reaproveita tela 4, copy diferente |
| 8 | Revisão de resumo de laudo | Spec 02 | Desenhada |
| 9 | Sinalização — 3 opções | Spec 02 | Desenhada |
| 10 | Registro de bioimpedância | Spec 03 | Desenhada |
| 11 | Nova prescrição | Spec 04 | Desenhada |
| 12 | Linha do tempo de prescrições | Spec 04 | Desenhada |
| 13 | Declaração de objetivo | Spec 05 | Desenhada |
| 14 | Plano de ação gerado | Spec 05 | Desenhada |
| 15 | Treino gerado | Spec 05 | Desenhada |
| 16 | Feedback do plano | Spec 05 | Desenhada |
| 17 | Exportação do treino | Spec 05 | Desenhada |
| 18 | Check-in semanal | Spec 06 | Desenhada |
| 19 | Progressão de treino | Spec 06 | Desenhada (substituída em uso por Spec 09 — ver linhas 27-31; `WorkoutExecutionLog` e esta tela serão removidos, decisão confirmada) |
| 20 | Registro de calorias | Spec 06 | Desenhada |
| 21 | Dashboard consolidado | Spec 07 | Desenhada |
| 22 | Histórico de marcador isolado | Spec 07 | Desenhada |
| 23 | Configurações / conta | Spec 08 | Desenhada |
| 24 | Confirmar exclusão de conta | Spec 08 | Desenhada |
| 25 | Carência ativa (cancelamento) | Spec 08 | Desenhada |
| 26 | Exportação de dados pronta | Spec 08 | Desenhada |
| 27 | Iniciar sessão de treino | Spec 09 | Desenhada |
| 28 | Sessão de treino ao vivo | Spec 09 | Desenhada — cards de exercício mostram selo de técnica ao lado do nome e nota de orientação abaixo, quando preenchidos (ex.: "Supino reto — barra" com selo "Drop-set") |
| 29 | Descanso entre séries | Spec 09 | Desenhada — barra persistente não-bloqueante (decisão confirmada pelo Fernando em 08/09/2026; substitui a versão anterior em bottom sheet bloqueante) |
| 30 | Pré-visualização do dia (antes de iniciar) | Spec 09 | Desenhada — nova (10/09/2026): tocar num dia na tela 27 abre esta lista somente-leitura dos exercícios antes de criar a sessão; botão "Iniciar treino" no rodapé é quem de fato inicia |
| 31 | Sessão concluída (resumo pós-treino) | Spec 09 | Desenhada — nova (10/09/2026): duração, dia, séries concluídas e peso total levantado; sem estimativa de calorias |

**Nota de numeração:** os números desta tabela são um inventário próprio, independente dos nomes de classe CSS internos do `mockups.html` (que já não seguem 1:1 desde antes — ex.: `.s9` no arquivo é a tela 18 "Check-in semanal" desta tabela). As telas 27-29 aqui correspondem às classes `.s26`, `.s27` e `.s28` no `mockups.html`. A tela 30 (pré-visualização) reaproveita os componentes de linha de exercício da tela "Treino gerado" (`.ex-row`, `.ex-list`) sem uma classe de tela própria; a tela 31 (sessão concluída) reaproveita a classe `.s25` e o componente `.macro-card` da tela "Plano de ação gerado".

**Inventário completo.** Todas as telas da Fase 1 (incluindo Spec 09) têm mockup de alta fidelidade.

## 8. Fora de escopo deste documento

- Implementação em React Native/Expo (componente por componente) — fica para a fase de código
- Ícones finais (os mockups usam formas simples/texto como placeholder — biblioteca de ícone real a definir)
- Animação e transição entre telas

---
*Este guia é vivo: ao adicionar uma tela nova, adicione a linha correspondente na tabela da seção 7 e, se necessário, um componente novo na seção 5 — nunca introduza um padrão visual fora deste sistema sem atualizar este documento primeiro.*
