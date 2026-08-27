# Spec Técnica 04 — Linha do Tempo de Prescrições
**Metodologia:** SDD · **Status:** Rascunho v2 · **Data:** 27/08/2026
**Cobre:** RF04, RF04a, RF09 (parcial — contexto de correlação) (PRD Fase 1) · **Depende de:** Architecture Doc v3 seção 3

---

## 1. Objetivo

Permitir que o usuário registre uma linha do tempo de prescrições (medicação, hormônio, suplemento) como **contexto de correlação histórica**, nunca como base para sugestão de dose, ajuste, início ou fim de tratamento — isso permanece decisão exclusiva do médico.

## 2. Por que essa spec é diferente de todas as anteriores

Esta é a categoria de dado mais sensível do produto (Architecture Doc, seção 3): nome de medicação/hormônio revela condição de saúde de forma direta. Duas exigências que não existiam nas Specs 01-03 entram em vigor aqui com força total:

- **Criptografia em nível de campo** — não basta criptografia de disco/banco. O campo `name` (e qualquer nota livre) precisa estar cifrado antes de chegar ao banco, de forma que nem um dump direto do banco exponha o dado em texto plano.
- **Log de auditoria obrigatório em toda leitura** — cada vez que este dado é lido (não só escrito), fica registrado quem acessou, quando e o quê, sem exceção — já estabelecido como regra geral no Architecture Doc, mas nenhuma spec anterior tocou dado sensível o suficiente para esse requisito ser testado de verdade.

## 3. Escopo desta spec

**Cobre:**
- Registro manual de item na linha do tempo (nome, categoria, data de início, data de término opcional)
- Edição e exclusão de um item
- Listagem da linha do tempo do usuário, decifrada apenas para o próprio usuário autenticado
- Criptografia em nível de campo e log de auditoria de leitura

**Não cobre:**
- Qualquer sugestão de dose, ajuste, início ou fim de medicação (fora de escopo do produto inteiro, PRD seção 6 — não é uma omissão desta spec, é proibição permanente)
- Correlação visual na linha do tempo cruzada com exames/bioimpedância (RF09 na camada de dashboard) — spec de dashboard consome este dado já decifrado, não decide como ele é exibido

## 4. Modelo de dados (proposta Prisma)

```prisma
model PrescriptionEntry {
  id              String   @id @default(cuid())
  userId          String
  nameEncrypted   Bytes    // nome do item, cifrado em nível de aplicação antes de persistir
  category        String   // "medicacao" | "hormonio" | "suplemento" — não cifrado,
                            // é uma categoria genérica, não identifica o item específico
  startDate       DateTime
  endDate         DateTime?
  notesEncrypted  Bytes?   // campo livre opcional, também cifrado
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, startDate])
}

model HealthDataAccessLog {
  id          String   @id @default(cuid())
  userId      String   // dono do dado
  accessedBy  String   // quem acessou (normalmente o próprio userId, mas registrado
                        // explicitamente para cobrir qualquer acesso administrativo futuro)
  resource    String   // ex.: "PrescriptionEntry:list", "PrescriptionEntry:{id}"
  accessedAt  DateTime @default(now())

  @@index([userId, accessedAt])
}
```

**Nota sobre `category` não cifrado:** a categoria (medicação/hormônio/suplemento) sozinha não identifica o item específico nem a condição tratada — é o `nameEncrypted` que carrega a informação sensível de verdade. Manter `category` em texto plano permite filtro/agrupamento no dashboard sem decifrar cada registro.

### 4.1 Comunicação ao usuário no momento da coleta

Esta é a tela onde o texto precisa ser mais explícito, dado o nível de sensibilidade do dado:
- **Por que pedimos:** registrar sua linha do tempo de medicação/hormônio ajuda a contextualizar sua evolução ao longo do tempo (ex.: cruzar com mudanças em exames ou bioimpedância) e a personalizar seu plano de ação
- **O que não fazemos:** não sugerimos, ajustamos ou avaliamos dose, início ou fim de nenhum item — isso é decisão exclusiva do seu médico. Este dado é usado apenas como contexto histórico, nunca como recomendação clínica

## 5. Criptografia em nível de campo — abordagem proposta

- **Envelope encryption**: cada valor sensível (`nameEncrypted`, `notesEncrypted`) é cifrado com uma chave de dados (DEK), e a DEK é cifrada por uma chave mestra (KEK) mantida em serviço de gerenciamento de chaves da AWS (KMS) — assim a aplicação nunca manipula a chave mestra diretamente
- Cifragem acontece na camada de backend, **antes** do dado tocar o Prisma/Postgres — o banco nunca vê texto plano
- Decifragem só acontece no momento de servir o dado ao próprio usuário autenticado, dentro do handler da requisição — nunca em log, nunca em cache persistente
- **Decisão em aberto:** rotação de chave (KEK) — política de rotação (ex.: anual) fica como decisão de implementação, não bloqueia esta spec, mas deve ser definida antes do lançamento

## 6. Fluxo técnico

1. Usuário registra item na linha do tempo (nome, categoria, data de início; data de término opcional)
2. Backend cifra `name` (e `notes`, se preenchido) via envelope encryption, persiste `PrescriptionEntry`
3. Ao listar a linha do tempo, backend decifra cada item **apenas** para retornar ao usuário dono do dado, e grava uma entrada em `HealthDataAccessLog` para essa leitura
4. Edição/exclusão seguem o mesmo padrão de cifragem na escrita e log na leitura prévia (buscar o item pra editar já conta como acesso)

## 7. Contrato de API (alto nível)

| Endpoint | Método | Descrição |
|---|---|---|
| `/prescriptions` | POST | Cria um novo item na linha do tempo (cifra antes de persistir) |
| `/prescriptions/:id` | PUT | Edita um item existente |
| `/prescriptions/:id` | DELETE | Exclui um item existente |
| `/prescriptions` | GET | Lista a linha do tempo do usuário (decifrada), registra log de auditoria |

## 8. Tratamento de erros e casos de borda

- **Nome vazio** — diferente dos campos de bioimpedância, `name` é obrigatório dentro de um item de prescrição (não faz sentido um item sem nome), mas o item inteiro continua opcional (RF04a — usuário pode simplesmente não ter nenhum item)
- **`endDate` anterior a `startDate`** — validação de sanidade, rejeita com mensagem clara
- **Falha na cifragem (ex.: KMS indisponível)** — requisição de escrita deve falhar explicitamente, nunca persistir dado sensível em texto plano como fallback
- **Item com uso contínuo (sem data de término)** — permitido; `endDate: null` significa "em uso até hoje", dashboard trata isso como intervalo aberto

## 9. Critérios de aceite

- [ ] Nome do item nunca aparece em texto plano num dump direto do banco (verificável inspecionando a tabela)
- [ ] Toda leitura da linha do tempo gera uma entrada em `HealthDataAccessLog`
- [ ] Usuário consegue registrar item sem data de término (uso contínuo)
- [ ] Ausência total de itens não bloqueia nenhum outro fluxo do produto (RF04a)
- [ ] Nenhuma tela ou resposta de API gerada a partir deste dado sugere causa/efeito clínico — apenas apresenta o item na linha do tempo como contexto (RF09)
- [ ] Tela de registro exibe o texto de "por que pedimos esse dado" e o reforço explícito de que não há sugestão de dose/ajuste/início/fim — decisão exclusiva do médico

## 10. Fora de escopo desta spec

- Política de rotação de chave (KEK) — decisão de implementação a fechar antes do lançamento
- Qualquer lógica de correlação automática (ex.: "esse marcador mudou depois que você começou X") — mesmo como sugestão textual, isso se aproxima perigosamente de sugestão clínica; se algum dia for considerado, precisa de revisão jurídica específica antes, não é uma decisão técnica
- Acesso administrativo/suporte a este dado (o campo `accessedBy` no log já previne isso arquiteturalmente, mas nenhum fluxo de acesso administrativo é definido nesta spec)

---
*Com as Specs 01-04, toda a camada de ingestão de dado da Fase 1 está coberta. Próxima spec sugerida: 05 — Declaração de objetivo e geração de plano de ação + treino (RF10-RF13), que é o primeiro momento em que os dados ingeridos alimentam algo além de histórico.*
