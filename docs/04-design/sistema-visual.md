# Guia de Design — Body Healthy
**Status:** Rascunho v2 · **Data:** 31/08/2026
**Cobre:** sistema visual completo (cor, tipografia, componentes) e inventário de telas da Fase 1
**Depende de:** PRD Fase 1, Specs 00-08 · **Referência viva:** `mockups.html` (neste mesmo diretório)

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
- **Pulse (coral)** = energia e calorias (todo o fluxo de registro calórico é predominantemente coral), atenção/destaque (marcador fora da faixa, badge "novo" em exercício trocado, ação de sinalizar erro), e a "zona de risco" em configurações (excluir conta)
- Nunca usar os dois como accent competindo no mesmo componente. Um decide o tom da tela; o outro aparece pontual, se aparecer

**Regra adicional para valor de marcador de exame (nunca usar Vital/verde aqui):** classificar um valor numérico como "bom"/"favorável" — não apenas "dentro ou fora da faixa de referência" — é julgamento clínico, que o produto não faz (RNF02). Por isso, o indicador de cor num marcador de exame (bolinha, badge) usa apenas duas cores: `dot-pulse` (coral) quando o valor está fora da faixa de referência do próprio laudo, e `dot-mid` (cinza neutro) em qualquer outro caso — dentro da faixa, ou faixa desconhecida. Vital/verde nunca aparece como indicador de valor de marcador, em nenhuma tela.

## 4. Tipografia

- **Space Grotesk** (peso 500-700) — display: títulos, números grandes (meta calórica, contagem regressiva, macros), wordmark
- **Inter** (peso 400-600) — corpo: parágrafo, label, dado denso (marcador de exame, listas). Usa números tabulares (`font-variant-numeric: tabular-nums`) em qualquer valor numérico que apareça em lista, para não "dançar" quando os dígitos mudam de largura

## 5. Componentes

| Componente | Regra |
|---|---|
| Botão primário | Pílula (`border-radius: 100px`), fundo Vital, texto branco, peso 600 |
| Botão secundário | Pílula, fundo branco, borda `--line` |
| Botão de texto/link | Sem fundo, cor `--muted` (ação neutra) ou `--pulse-dark` (ação de atenção, ex.: sinalizar erro) |
| Chip (seleção única/múltipla) | Pílula pequena, estado ativo = fundo Vital + texto branco |
| Segmented control | Retângulo dividido, sem gap entre opções, estado ativo = fundo Vital |
| Card de superfície | Fundo `--mist`, `border-radius: 14-20px`, sem sombra |
| Card hero (número grande) | Fundo `--ink` (escuro) ou `--pulse` (quando o conteúdo é calórico), número em destaque |
| Linha de lista | Divisor `--line` embaixo, sem fundo próprio, padding vertical generoso |
| Badge de categoria | Pílula pequena, fundo tonal claro (`#E4F5EE` p/ Vital, `#FFEAE3` p/ Pulse), texto na variante escura correspondente |
| Bottom sheet | Usado para decisões contextuais de poucas opções (ex.: as 3 opções pós-sinalização de laudo) — nunca para formulário longo, isso é tela cheia |
| Dropzone de upload | Borda tracejada `--line`, ícone circular Vital, sem preview de imagem decorativa |
| Tab bar | 4 itens no máximo, ícone + label, item ativo em Vital |
| Campo de data | Mesmo visual do campo de texto padrão, mas sempre abre um seletor nativo (diálogo no Android, picker inline com "Concluir" no iOS) — nunca digitação livre de data. Mostra a data já formatada no lugar do placeholder, curta (`13/12/1984`, ex.: Nascimento) ou longa (`30 de novembro de 2026`, ex.: Próximo exame previsto), conforme o mockup de cada tela. Implementado em `apps/src/components/DateField.tsx` — reaproveitar em toda tela nova com campo de data, não recriar por tela |
| Action sheet (seleção de origem de arquivo) | Mesmo componente de Bottom sheet acima, especializado pra escolher entre poucas fontes de um arquivo (ex.: "Tirar foto" / "Escolher arquivo" na dropzone de upload de exame) — sempre 2-3 opções, nunca formulário. Implementado em `apps/src/components/ActionSheet.tsx` — reaproveitar em toda tela nova com upload de arquivo (ex.: laudo de imagem, Spec 02), não recriar por tela |

## 6. Padrões de conteúdo (copy)

- **"Por que pedimos"**: toda tela de coleta de dado de saúde tem essa explicação em caixa `--mist`, antes do usuário concluir a ação — nunca depois. Tom direto, sem jargão médico
- **Disclaimer clínico (RNF02)**: texto pequeno (`--muted`), presente em toda tela que exibe dado interpretado ou gerado por IA (marcador, resumo de laudo, plano, meta calórica/macro) — nunca omitido, nunca escondido atrás de "saiba mais"
- **Tom de voz geral**: direto, sem alarme, sem diminutivo. Nunca "clique aqui" — sempre o verbo da ação ("Confirmar", "Salvar", "Exportar")
- **Nunca**: emoji em texto de produto, exclamação, linguagem de urgência artificial

## 7. Inventário de telas — Fase 1

As 26 telas abaixo cobrem o inventário da Fase 1. 25 têm mockup de alta fidelidade próprio em `mockups.html`; a tela 7 (upload de laudo de imagem) reaproveita o mockup da tela 4, com copy diferente. Status refere-se ao design, não à implementação em código.

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
| 19 | Progressão de treino | Spec 06 | Desenhada |
| 20 | Registro de calorias | Spec 06 | Desenhada |
| 21 | Dashboard consolidado | Spec 07 | Desenhada |
| 22 | Histórico de marcador isolado | Spec 07 | Desenhada |
| 23 | Configurações / conta | Spec 08 | Desenhada |
| 24 | Confirmar exclusão de conta | Spec 08 | Desenhada |
| 25 | Carência ativa (cancelamento) | Spec 08 | Desenhada |
| 26 | Exportação de dados pronta | Spec 08 | Desenhada |

**Inventário completo.** Todas as telas da Fase 1 têm mockup de alta fidelidade.

## 8. Fora de escopo deste documento

- Implementação em React Native/Expo (componente por componente) — fica para a fase de código
- Ícones finais (os mockups usam formas simples/texto como placeholder — biblioteca de ícone real a definir)
- Animação e transição entre telas

---
*Este guia é vivo: ao adicionar uma tela nova, adicione a linha correspondente na tabela da seção 7 e, se necessário, um componente novo na seção 5 — nunca introduza um padrão visual fora deste sistema sem atualizar este documento primeiro.*
