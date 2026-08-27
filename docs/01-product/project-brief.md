# Project Brief — Body Healthy
**Metodologia:** BMAD (fase Analyst) · **Status:** Rascunho v2 · **Data:** 24/08/2026

---

## 1. Problema

Brasileiros fazem exames de sangue de rotina (via plano de saúde, empresa, ou particular) 1-2x ao ano, mas recebem os resultados como um PDF cheio de números e faixas de referência, sem tradução prática para "o que eu faço com isso". Não existe hoje um produto brasileiro que faça a ponte entre exame laboratorial de rotina e um plano de ação de saúde, estilo Levels — que nos EUA resolve isso, mas via CGM (caro, hardware, nicho).

## 2. Hipótese central

Existe demanda represada por interpretação acionável de exames de sangue comuns (não CGM), entregue via IA, em português, com preço de entrada muito abaixo de qualquer coaching humano — e essa demanda é maior e mais barata de atender do que a de monitoramento contínuo de glicose.

## 3. Público-alvo (hipótese inicial)

- Perfil primário: adultos 28-50 anos, classe A/B, já engajados com saúde/fitness (usam app de treino, se exercitam), que fazem checkup anual e querem entender/otimizar biomarcadores — não pacientes com diagnóstico já fechado.
- Perfil secundário (B2B2C, fase 2): empresas com programa de wellness corporativo (78% das grandes empresas no Brasil já têm) e planos de saúde/labs buscando diferencial digital.

## 4. Proposta de valor

"Suba seu exame, entenda o que ele significa, saiba exatamente o que ajustar" — sem precisar de hardware, sem esperar consulta, com histórico acumulado ao longo do tempo (o exame de hoje comparado ao de 6 meses atrás).

## 5. Contexto de mercado (resumo)

- Mercado de saúde/bem-estar no Brasil: R$ 82,3 bi (2024) → projeção R$ 209,5 bi (2033), CAGR ~11%.
- Saúde mental já é disputada no Brasil (Zenklub, Vitat etc.); **biomarcadores/longevidade ainda é espaço vazio**.
- Benchmark direto (Levels, EUA): app + CGM + labs + concierge, US$199/ano (app) até US$199/mês (tier completo). Ponto fraco deles: dependem de hardware de terceiros (Abbott/Dexcom) que hoje vendem direto ao consumidor — a margem real do Levels está na camada de software/interpretação, não no sensor.
- Lição para nós: **não competir em hardware.** Começar 100% software, em cima de exame que a pessoa já tem.

## 6. Jornada real do fundador (validação de problema)

Fernando hoje faz acompanhamento trimestral com nutróloga (Dra. Mariana Maia), que solicita exames laboratoriais, ultrassom de abdômen e bioimpedância, e prescreve medicação/hormônios conforme necessário. O fluxo atual, manual:

1. Recebe resultados (exames, ultrassom, bioimpedância) em PDFs separados
2. Define objetivo para o próximo ciclo (ex.: ganhar massa magra, perder X de gordura)
3. Cola tudo manualmente no Claude e pede um treino personalizado
4. Leva o treino pro Hevy pra registrar progressive overload
5. Monta a dieta sozinho, sem ferramenta dedicada

Esse workaround manual **é o problema do MVP validado na própria pele do fundador** — o produto deve automatizar exatamente esses passos, sem competir com ferramentas que já fazem bem uma parte do trabalho (ex.: Hevy).

## 7. Escopo em fases

### Fase 1 — Núcleo diferenciado (MVP)
O que hoje ninguém faz bem no Brasil: unir e interpretar os dados de saúde que a pessoa já gera, ao longo do tempo.

- Upload de PDF/foto de exame laboratorial (labs brasileiros: Fleury, Dasa, Hermes Pardini etc.)
- Upload de laudo de imagem (ex.: ultrassom de abdômen) — parser de texto, diferente do exame numérico
- Registro de bioimpedância (massa magra, % gordura) como série temporal
- Linha do tempo de prescrições (medicação/hormônios) como **contexto de correlação**, nunca como sugestão de dose ou ajuste — isso permanece decisão exclusiva do médico
- Extração automática dos marcadores via IA + interpretação contextualizada (faixa de referência + tendência histórica)
- Plano de ação em linguagem simples (nutrição, treino, sono) — não diagnóstico médico
- Geração de treino personalizado a partir do objetivo declarado + dados de exame/bioimpedância, com **exportação para o Hevy** em vez de recriar o tracking de treino
- Dashboard de evolução (exames, bioimpedância, prescrições, treino gerado — tudo cruzado na mesma linha do tempo)

### Fase 2 — Camada de uso diário
Só depois do núcleo validado, porque são categorias já disputadas por apps grandes e o risco é diluir o diferencial.

- Foto de refeição com IA pra estimar calorias e macros + teto diário (padrão Levels/MyFitnessPal)
- Foto corporal periódica para comparação visual de evolução, cruzada com a curva de bioimpedância

## 8. Fora de escopo (indefinidamente)

- CGM / hardware próprio
- Qualquer sugestão de dosagem, ajuste ou prescrição médica — isso é ato médico, o produto só correlaciona e apresenta
- Telemedicina / coaching humano ao vivo
- B2B2C com empresas e planos de saúde
- Tracking de treino do zero (usar exportação pro Hevy em vez de reconstruir)

## 9. Riscos principais

- **Regulatório:** LGPD trata dado de saúde como categoria sensível — exige base legal e tratamento reforçados. Isso fica mais crítico com a linha do tempo de prescrições (medicação/hormônios) incluída na Fase 1. Precisa avaliar se a interpretação de exame se aproxima de "ato médico" (CFM) e onde está a linha segura entre "informação educacional/correlação" e "diagnóstico ou recomendação clínica".
- **Confiança:** produto de saúde exige credibilidade — validação por profissional (nutricionista/médico consultor) provavelmente necessária desde o MVP, mesmo que não como parte obrigatória do fluxo.
- **Aquisição:** CAC em saúde/wellness tende a ser alto; canal mais barato provável é conteúdo educacional (like Levels fez) + parceria com labs.
- **Escopo:** risco de a Fase 2 (foto de refeição/caloria) competir diretamente com apps consolidados (MyFitnessPal, Cronometer) sem diferencial claro — reavaliar antes de construir, não só documentar.

## 10. Modelo de negócio (hipótese inicial)

Assinatura mensal/anual em torno do que o brasileiro já paga por apps de wellness (referência: ticket bem abaixo dos US$199/ano do Levels, em R$, dado o poder de compra local) + camada gratuita limitada para aquisição.

## 11. Métricas de sucesso do MVP

- A definir no PRD — mas hipótese inicial: taxa de retorno para segundo upload de exame (prova de valor percebido), não apenas cadastro.

## 12. Próximos passos

1. Validar hipótese de público (conversas/pesquisa antes de codar)
2. PRD detalhado do MVP
3. Architecture Doc (stack, decisões técnicas, tratamento de dado sensível)

---
*Este documento é a base para o PRD. Decisões aqui marcadas como "hipótese" devem ser confirmadas ou revisadas antes de avançar.*
