# PRD — Fase 1 (MVP) — Body Healthy
**Metodologia:** BMAD (fase PM) · **Status:** Rascunho v2 · **Data:** 25/08/2026
**Baseado em:** Project Brief v2

---

## 1. Objetivo do MVP

Automatizar, num único produto, o fluxo que hoje o usuário-referência (fundador) faz manualmente: reunir exames laboratoriais, ultrassom, bioimpedância e prescrições de um ciclo de acompanhamento de saúde, interpretar essa informação de forma cruzada e histórica, e gerar um plano de treino personalizado exportável — sem emitir diagnóstico ou sugestão de dosagem médica.

## 2. Persona primária

Adulto 28-50 anos, classe A/B, engajado com saúde/fitness, em acompanhamento médico periódico (nutrólogo, endocrinologista ou similar) com exames recorrentes, que hoje monta manualmente a ponte entre "resultado de exame" e "o que fazer no treino/dieta".

## 3. Requisitos funcionais

### 3.1 Ingestão de dados
- **RF01** — Usuário faz upload de PDF ou foto de exame laboratorial (labs brasileiros: Fleury, Dasa, Hermes Pardini e formatos genéricos)
- **RF02** — Usuário faz upload de laudo de imagem (ex.: ultrassom de abdômen) em PDF/foto
- **RF03** — Usuário registra manualmente (ou importa, se houver fonte) dados de bioimpedância: peso, % gordura, massa magra, e demais métricas do aparelho usado
- **RF04** — Usuário registra linha do tempo de prescrições (nome do item, categoria — medicação/hormônio/suplemento —, data de início, e opcionalmente data de término)
- **RF04a — Nenhum campo de ingestão é obrigatório.** Todos os dados acima (exame, laudo de imagem, bioimpedância, prescrições) são opcionais. O usuário deve conseguir chegar a um plano de ação e treino mesmo sem fornecer nenhum deles — a qualidade e especificidade da recomendação escala com a quantidade de dado disponível, mas a ausência de dado nunca bloqueia o fluxo. O sistema deve comunicar claramente ao usuário, de forma não alarmista, que mais dado gera recomendação mais precisa.

### 3.2 Extração e interpretação
- **RF05** — Sistema extrai automaticamente via IA os marcadores do exame laboratorial (nome, valor, unidade, faixa de referência do próprio laudo)
- **RF06** — Sistema extrai e resume via IA os achados relevantes do laudo de imagem em linguagem simples
- **RF07** — Sistema compara cada marcador novo com o histórico do mesmo usuário (quando existir exame anterior) e sinaliza tendência (subindo/descendo/estável)
- **RF08** — Sistema apresenta bioimpedância como série temporal (gráfico de evolução)
- **RF09** — Sistema correlaciona, na mesma linha do tempo visual, exames + bioimpedância + início/fim de prescrições — **apenas como contexto de correlação, nunca como sugestão de causa/efeito clínica**

### 3.3 Plano de ação e treino
- **RF10** — Usuário declara objetivo para o ciclo atual (texto livre + categorias sugeridas: ganho de massa magra, perda de gordura, manutenção, outro)
- **RF11** — Sistema gera plano de ação em linguagem simples (nutrição, treino, sono) a partir do objetivo + dados disponíveis (exames, bioimpedância). Deve funcionar de forma graciosamente degradada: com objetivo apenas, gera plano genérico de qualidade; com mais dados, refina e personaliza
- **RF12** — Sistema gera treino personalizado estruturado (divisão, exercícios, séries/repetições, progressão)
- **RF13** — Usuário pode exportar o treino gerado em formato compatível para importação manual no Hevy (não é integração via API na Fase 1, é exportação estruturada)

### 3.4 Engajamento entre ciclos (fechamento do loop)
- **RF16** — Sistema oferece check-in semanal leve (peso, adesão ao treino da semana — completo/parcial/não realizado —, energia/sono em escala simples), levando menos de 1 minuto
- **RF17** — Usuário pode registrar manualmente o resultado do treino executado fora do produto (ex.: no Hevy): carga, séries/repetições realizadas por exercício, ou apenas nível de adesão simplificado, à sua escolha de detalhamento
- **RF18** — Sistema usa os dados de adesão e progressão (RF16/RF17) para ajustar o próximo plano gerado — ex.: se adesão foi baixa, o próximo plano considera isso
- **RF19** — Dashboard mostra progressão do treino e adesão semana a semana, além da contagem regressiva até o próximo ciclo de exames

### 3.5 Dashboard
- **RF14** — Dashboard único mostra evolução do usuário ao longo do tempo: exames, bioimpedância, prescrições e treinos gerados, todos na mesma linha do tempo
- **RF15** — Usuário pode ver o histórico completo de um marcador específico isoladamente (ex.: evolução da glicose em jejum nos últimos 2 anos)

## 4. Requisitos não-funcionais

- **RNF01 — Dado sensível:** todo dado de saúde tratado como categoria sensível sob LGPD; criptografia em repouso e trânsito; consentimento explícito e granular no onboarding
- **RNF02 — Disclaimer clínico:** toda tela de interpretação/plano exibe aviso de que o conteúdo é informativo, não substitui acompanhamento médico
- **RNF03 — Precisão de extração:** taxa de erro de extração de marcadores numéricos deve ser validável por revisão humana antes do lançamento (não é aceitável extração silenciosa sem checagem do usuário)
- **RNF04 — Disponibilidade:** sistema deve funcionar de forma assíncrona para uploads (processamento pode levar minutos, usuário é notificado)
- **RNF05 — Portabilidade de dado:** usuário pode exportar todos os seus dados a qualquer momento (direito LGPD)

## 5. Fluxo principal (happy path)

1. Usuário faz onboarding, aceita termos e consentimento de dado sensível
2. Usuário sobe exame laboratorial → sistema extrai e mostra marcadores para confirmação/correção
3. Usuário sobe laudo de imagem (se houver) → sistema resume achados
4. Usuário registra bioimpedância do ciclo
5. Usuário registra/atualiza linha do tempo de prescrições
6. Usuário declara objetivo do ciclo
7. Sistema gera plano de ação + treino personalizado
8. Usuário revisa, ajusta se necessário, exporta treino para o Hevy
9. **Entre ciclos:** usuário faz check-in semanal (adesão, peso, energia/sono) e opcionalmente registra progressão detalhada do treino executado
10. Dashboard consolida tudo, mostrando progressão semanal e contagem regressiva até o próximo ciclo de exames
11. No próximo acompanhamento médico (ex.: 3 meses depois), o ciclo se repete com histórico mais rico

## 6. Fora de escopo (Fase 1)

- Foto de refeição / contagem de calorias (Fase 2)
- Foto corporal para comparação visual (Fase 2)
- Integração via API direta com Hevy ou outros apps de treino, tanto para exportar quanto para importar resultado automaticamente — na Fase 1 tudo é manual (exportar treino, registrar progressão/adesão). Extração automática via API é candidata a reavaliação futura, condicionada à disponibilidade de API do app usado
- Qualquer sugestão de dosagem, ajuste ou início/fim de medicação — decisão exclusivamente médica
- Telemedicina, chat com profissional, ou coaching humano
- B2B2C (empresas, planos de saúde, labs)

## 7. Riscos e mitigação

| Risco | Mitigação proposta |
|---|---|
| Extração de exame incorreta gera confiança falsa | Sempre exigir confirmação humana da extração antes de usar o dado |
| Plano gerado ser interpretado como prescrição médica | Disclaimer visível + linguagem consistentemente não-prescritiva |
| Dado de prescrição (hormônio/medicação) vazar ou ser mal tratado | Criptografia + minimização de dado + revisão jurídica antes do lançamento |
| Baixo volume de exames para dar sinal de tendência (usuário novo sem histórico) | Produto deve entregar valor mesmo no primeiro upload, sem depender de histórico |

## 8. Métricas de sucesso do MVP

- Taxa de usuários que fazem um **segundo upload de exame** (prova de retenção real, ciclo a ciclo)
- Taxa de conclusão do fluxo completo (upload → plano gerado → exportação de treino)
- Tempo entre upload e entrega do plano de ação (proxy de qualidade de processamento)
- Taxa de check-in semanal (adesão ao ritual de uso entre ciclos — indicador direto de viabilidade da assinatura mensal)

## 9. Próximos passos

1. Validar RNF01-RNF03 com uma revisão jurídica/regulatória leve antes de detalhar arquitetura
2. Architecture Doc (fase Architect do BMAD): stack, modelagem de dado sensível, pipeline de extração via IA, decisão de build vs. usar API de IA existente para extração de PDF

---
*Este PRD cobre exclusivamente a Fase 1. A Fase 2 (foto de refeição, foto corporal) terá PRD próprio quando a Fase 1 estiver validada.*
