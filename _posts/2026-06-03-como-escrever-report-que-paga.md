---
title: "Como Escrever um Report que Paga: do título à defesa do impacto"
description: "A estrutura de report que não gera questionamento na triagem — título, resumo de negócio, passos reproduzíveis, impacto em PII e como defender o bounty quando o triador contesta."
author: matheus
date: 2026-06-03 23:56:00 -0300
categories: [Bug Bounty, Fundamentos]
tags: ["report writing", "bug bounty", "triagem", "impacto", "CVSS", "HackerOne", "Bugcrowd", "web security"]
image: /assets/img/covers/como-escrever-report-que-paga.png
pin: false
comments: true
---

## Achar o bug é metade do trabalho

Você passou a madrugada no Burp, trocou um `id`, viu a fatura de outro cliente aparecer na tela e o coração disparou: **IDOR confirmado**. Aí você abre a plataforma, escreve três linhas — *"dá pra ver dados de outro usuário trocando o id"* — anexa um print borrado e manda. Duas semanas depois volta um `Need More Info` ou, pior, um `Informative`. Zero bounty.

> 💡 **IDOR**: falha de autorização em que você troca um identificador (ex.: `id`) e acessa o objeto de outro usuário. Detalhe no [Glossário](/posts/fundamentos-web-hacking/).

Acontece o tempo todo. O bug era real, mas o **report** não estava. Bug bounty é um jogo de comunicação tanto quanto de técnica: do outro lado tem um **triador** que recebe dezenas de reports por dia, não conhece a sua aplicação tão bem quanto o time de produto, e precisa **reproduzir, validar e classificar** o seu achado no menor tempo possível. Se ele não conseguir reproduzir em poucos minutos, ou não entender o impacto no negócio, o seu report perde prioridade — ou cai pra `Informative`.

> **Analogia:** achar o bug é como pescar um peixe enorme. O report é como você apresenta o peixe na balança. Se chegar com o peixe escondido num saco molhado e disser "confia, é grande", ninguém paga. Você precisa pôr na balança, fotografar e mostrar o número.

Este post é o manual do "peixe na balança": a estrutura que faz um report ser **aceito de primeira**, o que separa report pago de report rejeitado, e — a parte que ninguém ensina — **como defender o impacto** quando o triador questiona. No fim tem um exemplo completo, anonimizado, que você pode usar de molde.

## O que é um "bom report" (e por que isso importa)

Um report é o documento que **transfere a sua certeza para a cabeça do triador**. Você tem 100% de certeza que o bug existe — você viu. O triador tem 0%. O report é a ponte. Se a ponte tiver buracos (passo faltando, print ilegível, impacto vago), a certeza não atravessa.

A própria [HackerOne descreve um report de qualidade](https://docs.hackerone.com/en/articles/8475116-quality-reports) como aquele que tem **título claro e conciso**, **passos detalhados de reprodução** com screenshots ou trechos de código, e que **explica por que o problema importa**. A [Bugcrowd recomenda](https://docs.bugcrowd.com/researchers/reporting-managing-submissions/reporting-a-bug/) organizar a descrição em quatro blocos: **Overview** (resumo), **Walkthrough and POC** (como reproduzir), **Vulnerability Evidence** (evidências) e **Demonstrated Impact** (risco e impacto). É o mesmo esqueleto em todas as plataformas.

> **Analogia:** pense no report como uma **receita de bolo**. Se a receita diz "misture os ingredientes e asse", ninguém replica. Se diz "150g de farinha, 2 ovos, 180°C por 40 minutos", qualquer um faz o mesmo bolo. O triador precisa fazer o **seu** bolo seguindo a **sua** receita — sem adivinhar nenhuma quantidade.

## Por que um report bom paga mais (e mais rápido)

Não é só sobre "ser aceito" — a qualidade do report mexe direto no bolso:

- **Triagem mais rápida = menos chance de duplicado.** Em programas movimentados, o primeiro report **válido e reproduzível** de um bug leva o bounty; os seguintes viram `Duplicate`. Um report confuso fica parado em `Need More Info` enquanto outro pesquisador manda o mesmo bug bem-feito e leva a grana.
- **Impacto bem demonstrado puxa a severidade pra cima.** O mesmo IDOR pode ser classificado como `Médio` ("dá pra ver um dado de outro usuário") ou `Crítico` ("vaza PII de toda a base, violando a LGPD"). *(PII = dado pessoal identificável: nome, CPF, e-mail, telefone — ver [Glossário](/posts/fundamentos-web-hacking/).)* A diferença entre esses dois é **quase só o report** — quem mostra escala e nomeia o dado sensível recebe a faixa de cima.
- **Boa reputação destrava convites privados.** Reports limpos elevam seu *signal* na plataforma; signal alto traz convites pra programas privados, que pagam mais e têm menos concorrência.

Na prática, falhas como IDOR/Broken Access Control pagam de algumas **centenas** (impacto baixo, dado pouco sensível) a **dezenas de milhares** (PII em escala, ação crítica). E aqui vai a regra de ouro do dinheiro:

> 💡 **O bounty segue o impacto, e o report é quem prova o impacto.** Dois pesquisadores acham o mesmo bug; quem **provou** o impacto maior leva mais.

## Como funciona por trás: o caminho do report na triagem

Entender o que o triador faz com o seu report ajuda a escrevê-lo. O fluxo típico é:

```text
Você envia  →  Triador lê o TÍTULO        (decide prioridade inicial)
            →  lê o RESUMO                (entende o risco ao negócio)
            →  segue os PASSOS            (tenta REPRODUZIR — passo crítico)
            →  confere as EVIDÊNCIAS       (bate com o que ele viu?)
            →  avalia o IMPACTO            (define a SEVERIDADE / bounty)
            →  classifica: Triaged / Need More Info / Informative / Duplicate / N/A
```

O **ponto de falha mais comum** é o "tenta reproduzir". Se nesse passo faltar uma informação (um header, qual conta usar, o valor exato do parâmetro), o triador **não consegue reproduzir** e devolve `Need More Info` — e cada ida e volta atrasa dias e esfria o report. Por isso a parte de passos é a mais importante de todas: ela tem que ser à prova de ambiguidade.

## A estrutura do report "que não gera questionamento"

Esta é a estrutura testada — derivada de dezenas de reports aceitos e dos guias oficiais. Cada plataforma tem campos diferentes, mas **estes blocos nunca podem faltar**.

### 1. Título — `[Classe] - Nome curto e direto`

O título é a primeira (e às vezes única) coisa que o triador lê antes de priorizar. Fórmula:

```text
[Classe] - O que dá pra fazer + onde

Exemplos:
[IDOR] - Exposição de faturas e NFS-e (PII) via troca de chargeId
[BFLA] - Usuário comum bloqueia loja de terceiros no /api/admin/store/block
[SQLi] - Injeção time-based no parâmetro `search` do /api/v1/produtos
```

- **Classe entre colchetes**: IDOR, XSS, SSRF, RCE, BFLA... ajuda o triador a rotear. *(BFLA = abuso de função restrita — ex.: usuário comum executa ação de admin; ver [Glossário](/posts/fundamentos-web-hacking/).)*
- **Concreto, não genérico**: "Exposição de faturas (PII)" é melhor que "Falha de segurança grave". O [guia da Bugcrowd](https://www.bugcrowd.com/resources/levelup/how-to-write-excellent-reports-techniques-that-save-triagers-time-and-mistakes-that-should-be-avoided-in-reports/) pede título **descritivo e conciso**, identificando tipo, local e impacto.

### 2. Resumo — o risco **para o negócio** (não a parte técnica)

Este é o erro nº 1 dos iniciantes: o resumo descreve a *mecânica* ("o endpoint não valida o dono do objeto") em vez do *risco* ("qualquer cliente autenticado lê os dados pessoais de todos os outros clientes"). O triador — e o gestor do programa que decide o bounty — pensa em **negócio**: dado vazado, dinheiro, reputação, conformidade legal.

```text
RUIM:  "O endpoint charge-details aceita um chargeId arbitrário sem checar
        a sessão." (isso é mecânica, não impacto)

BOM:   "Qualquer cliente autenticado consegue ler faturas e notas fiscais
        — com nome completo, CPF e valores — de TODOS os outros clientes da
        plataforma, sem autorização. Vazamento de PII em massa, com violação
        direta da LGPD."
```

> **Analogia:** o resumo é a **manchete** do jornal. "Cano furou no porão" não vende. "Vazamento alaga 200 apartamentos do prédio" vende. Mesma água, manchete diferente.

### 3. Plataforma / Alvo e 4. Contexto

Diga **onde** (programa, domínio, app — ex.: `app.exemplo.com`) e **qual módulo/funcionalidade** é afetado e por quê. Contexto curto orienta o triador: *"Módulo Financeiro → Faturas, acessível a qualquer conta de cliente após login."*

### 5. Criticidade / Severidade — justificada, não chutada

> 💡 **CVSS** (Common Vulnerability Scoring System): escala de 0–10 que quantifica o risco; vem com um vetor que descreve a falha (calculadora em first.org).
{: .prompt-tip }

Não escreva só "Crítico". **Justifique** com um framework reconhecido, porque é isso que o programa usa pra calibrar bounty:

| Ferramenta | Pra que serve | Link |
|---|---|---|
| **CVSS v3.1** | Score numérico (0–10) + vetor que descreve a falha | [first.org/cvss/calculator/3.1](https://www.first.org/cvss/calculator/3.1) |
| **CWE** | Classifica o *tipo* de fraqueza (ex.: CWE-639 = IDOR) | [cwe.mitre.org](https://cwe.mitre.org/data/definitions/639.html) |
| **VRT (Bugcrowd)** | Taxonomia que mapeia a classe → severidade que os programas usam | [bugcrowd.com/vulnerability-rating-taxonomy](https://bugcrowd.com/vulnerability-rating-taxonomy) |
| **OWASP Risk Rating** | Severidade = Probabilidade × Impacto, focado em appsec | [owasp.org/.../OWASP_Risk_Rating_Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology) |

Para o IDOR que expõe PII em massa, o vetor CVSS costuma ficar assim:

```text
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N  →  6.5 (Médio)
# AV:N rede | AC:L fácil | PR:L precisa de login | C:H confidencialidade alta
# Se também ALTERA dado de terceiros, I:H sobe o score pra 8.1 (Alto).
# Se o vazamento cruza a fronteira de outra conta/tenant, dá pra argumentar S:C
# (Scope Changed) — o que também eleva o número.
```

> ⚠️ **Não infle.** Marcar tudo como `Crítico` queima sua credibilidade. Use o framework, mostre o vetor, deixe o número falar. Se ele der `Médio`, defenda o `Médio` — e **argumente** o que poderia subir (escala, dado sensível) na seção de impacto.

### 6. Como reproduzir — **a parte mais importante**

Passos numerados, escritos para que **qualquer pessoa** reproduza sem adivinhar nada. As regras:

1. **Comece do zero**: "criar 2 contas (A e B)", "logar com a Conta B", etc. Não assuma estado.
2. **Referencie a imagem dentro de cada passo** (`PRINT1`, `PRINT2`...). O triador lê o passo e olha o print correspondente — não um amontoado de prints no fim.
3. **Inclua o comando/request exato**, com o valor real usado (anonimizado no post, mas concreto no report). Marque o ponto da manipulação.

```text
1. Logar como Conta B (cliente comum) e ir em Financeiro > Faturas (PRINT1).
2. Abrir uma fatura própria e interceptar a request no Burp (PRINT2):
   GET /api/billing/statement/charge-details?chargeId=10051002
3. Enviar ao Repeater e trocar o chargeId pelo de outro cliente (PRINT3):
   chargeId=10051002  ->  chargeId=10051001   # <- único valor alterado
4. A resposta retorna a fatura de OUTRO cliente: nome, CPF e link da NFS-e (PRINT4).
```

> **Analogia:** passos são o **GPS turn-by-turn**, não o mapa inteiro jogado na mesa. "Vire à direita em 200m" — não "se vira aí".

### 7. Evidências (PoC) — prints e/ou vídeo, sempre legíveis

A [Bugcrowd recomenda fortemente](https://docs.bugcrowd.com/researchers/reporting-managing-submissions/reporting-a-bug/) evidência ilustrativa, de preferência **vídeo de PoC**, ou screenshots no mínimo. Regras de print que paga:

- **Seja explícito no que cada print mostra** — legenda do tipo *"resposta exibindo CPF de cliente que NÃO é a conta logada"*.
- **Circule/destaque** o ponto crítico (o `chargeId` trocado, o CPF que vazou).
- **Mostre o contexto** que prova que o dado não é seu: a conta logada no canto, o nome diferente na resposta.
- Para enumeração/escala, um **print do Burp Intruder** com várias respostas `200` de clientes distintos vale mais que mil palavras.

### 8. Impacto — nomeie o dado e mostre a escala

Repita o risco de negócio do resumo, agora **detalhado**: que dado exatamente vaza (sempre destaque **PII** — CPF, e-mail, telefone, endereço, dados financeiros), **quantas** contas dá pra afetar (escala), e o que um atacante consegue fazer com isso (fraude, engenharia social, ATO — *Account Takeover*, tomada de conta da vítima). É a seção que **define a faixa de bounty**.

## Aceito vs. Rejeitado: a tabela que importa

| O que faz ACEITAR | O que faz REJEITAR |
|---|---|
| Título `[Classe]` concreto | Título genérico ("vulnerabilidade encontrada") |
| Resumo em termos de **negócio/PII** | Resumo só técnico, sem impacto |
| Passos do zero, reproduzíveis | "É só trocar o id" sem dizer qual conta/valor |
| Request/comando exato + ponto marcado | Print único, borrado, sem contexto |
| Impacto com dado nomeado + escala | "Pode ser perigoso" (sem provar nada) |
| Severidade justificada (CVSS/CWE/VRT) | "Crítico" sem justificativa, ou inflado |
| **Certeza** total antes de enviar | Enviar "na dúvida, vai que cola" |
| Respeito ao **escopo** do programa | Reportar algo fora de escopo |

A lição mais repetida por quem vive de triagem: **relatório bem feito + certeza absoluta da vulnerabilidade = aprovação rápida.** Tenha certeza antes de reportar; report no chute queima reputação.

## Como DEFENDER o impacto quando o triador questiona

Vai acontecer: você manda um report sólido e o triador responde *"impacto baixo"*, *"não vemos risco real"* ou rebaixa a severidade. Isso **não é o fim** — é uma negociação, e tem um roteiro que já reverteu downgrade:

1. **Confirme que NÃO está fora de escopo.** Releia a policy. Defender algo fora de escopo é perder tempo (e signal). Se está no escopo, siga.
2. **Escreva um argumento detalhado do impacto.** Não responda "discordo". Explique, em termos de negócio, o pior cenário realista: *"Com enumeração de IDs sequenciais, um atacante baixa a base inteira de PII; isso é vazamento de dados pessoais sob a LGPD, com risco de multa e dano reputacional."*
3. **Mostre que a falha é aceita/paga por outras empresas.** Diga que essa classe é reconhecida e recompensada em vários programas — não é um caso de borda.
4. **Linke reports públicos da mesma classe já pagos (precedente).** Esse é o golpe de misericórdia. Repositórios como o [reddelexc/hackerone-reports](https://github.com/reddelexc/hackerone-reports) reúnem reports públicos por tipo de bug. Um link de um IDOR/PII pago num programa parecido tira o "é só teoria" da mesa.

> **Analogia:** é como contestar uma multa. Não adianta dizer "achei injusto". Você junta a foto, o artigo da lei e um caso anterior em que a mesma multa foi cancelada. **Evidência + precedente** ganha a discussão.

Dois aprendizados práticos sobre triagem que mudam o jogo:

- **`Informative` não é necessariamente o fim.** Há casos de **bônus pago meses depois** por persistência — vale manter o report aberto e acompanhar com educação. Falhas tidas como "fracas" (rate limit, por exemplo) já renderam bounty quando bem argumentadas e dentro do escopo.
- **Não junte achados distintos.** Um XSS em dois campos diferentes da mesma página = **dois reports**. Juntar pode fazer o programa pagar por um só. Já o mesmo bug em vários subdomínios = **um report** (juntar evita auto-duplicação).

## Erros comuns que derrubam reports

1. **Resumo técnico em vez de risco de negócio** — o erro nº 1 (já cobrimos).
2. **Passos com buracos** — "logue e troque o id" sem dizer com qual conta nem qual valor.
3. **Print único e ilegível** — sem destacar o ponto, sem mostrar que o dado é de outra pessoa.
4. **Não provar escala** — mostrar 1 caso quando dava pra mostrar que afeta a base inteira (a escala é o que vira `Crítico`).
5. **Severidade inflada** — marcar `Crítico` sem vetor CVSS coerente queima credibilidade.
6. **Reportar sem ler o template/CVE** — nem todo achado de scanner é bug. Ferramentas como o Nuclei apontam coisas que, ao ler o que o template realmente faz, não têm impacto. **Entenda a CVE antes de reportar.**
7. **Reportar no chute** — sem ter 100% de certeza de que é reproduzível.
8. **Ignorar o escopo** — reportar ativo/classe fora de escopo, ou usar técnica proibida (ex.: automação pesada onde a policy proíbe).

## Exemplo completo de report (fictício-realista, anonimizado)

> Cenário **fictício, baseado em padrões reais** de bug bounty. Domínios, IDs e dados são placeholders.

---

**Título:** `[IDOR] - Exposição de faturas e NFS-e (PII) via troca de chargeId no Financeiro`

**Plataforma / Alvo:** HackerOne · `app.exemplo.com`

**Resumo (risco ao negócio):**
Qualquer cliente autenticado consegue ler as faturas e notas fiscais (NFS-e) de **todos** os outros clientes da plataforma — incluindo **nome completo, CPF e valores** — apenas trocando o parâmetro `chargeId` na request. Como os IDs são **sequenciais**, é possível enumerar e extrair a base inteira de PII. Vazamento de dados pessoais em massa, com violação direta da LGPD e risco de fraude/engenharia social contra os clientes.

**Contexto:** Módulo *Financeiro → Faturas*, disponível a qualquer conta de cliente após o login. O endpoint que carrega o detalhe da cobrança não valida se o `chargeId` solicitado pertence ao usuário da sessão.

**Criticidade:** **Alto → Crítico**
- **CWE-639** — Authorization Bypass Through User-Controlled Key.
- **CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N → 6.5 (Médio)** é o piso pela leitura de um único objeto. Como o acesso cruza a fronteira de **outras contas** (autorização de um componente expõe dado de outro), o vetor sobe pra **CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N → 7.7 (Alto)** com **S:C** (*Scope Changed*).
- **Argumento de severidade:** somando a **escala** (base inteira via IDs sequenciais) e a **sensibilidade do dado** (CPF + financeiro, sob LGPD), o impacto de negócio é tratado como **Crítico** pela maioria dos programas — é o número que defendo na seção de impacto.
- VRT (Bugcrowd): *Broken Access Control → IDOR → Sensitive Data Disclosure*.

**Como reproduzir:**

1. Criar/usar 2 contas de cliente comum (**Conta A** = vítima; **Conta B** = atacante). Logar como **Conta B** e ir em *Financeiro → Faturas* (**PRINT1**).
2. Abrir uma fatura própria e interceptar a request no Burp (**PRINT2**):

   ```http
   GET /api/billing/statement/charge-details?chargeId=10051002 HTTP/2
   Host: app.exemplo.com
   Authorization: Bearer <token_da_Conta_B>
   ```

3. Enviar ao **Repeater** e trocar **apenas** o `chargeId` pelo de uma cobrança da Conta A (**PRINT3**):

   ```http
   GET /api/billing/statement/charge-details?chargeId=10051001 HTTP/2   # <- único valor alterado
   Host: app.exemplo.com
   Authorization: Bearer <token_da_Conta_B>
   ```

4. A resposta retorna a fatura da **Conta A**, com PII (**PRINT4**):

   ```http
   HTTP/2 200 OK
   Content-Type: application/json

   {"chargeId":10051001,"customerName":"<nome da Conta A>","cpf":"000.000.000-00",
    "invoiceUrl":"/files/nfse/10051001.pdf","amount":299.50}
   ```

5. **Provar escala:** no **Burp Intruder**, posição `Sniper` no `chargeId`, payload numérico `10050000–10052000`. Centenas de respostas `200 OK` com clientes distintos confirmam o **vazamento em massa** (**PRINT5**).

**Evidências (PoC):**
- **PRINT1**: tela de Faturas logado como Conta B.
- **PRINT2/PRINT3**: Repeater com o `chargeId` original e o trocado (destacado em vermelho).
- **PRINT4**: resposta exibindo `customerName`/`cpf` que **não** são da conta logada.
- **PRINT5**: Intruder com múltiplos `200` de clientes diferentes (prova de escala).

**Impacto:**
Leitura não autorizada de faturas e NFS-e de **toda a base de clientes**: nome completo, **CPF**, valores e link de nota fiscal. Como o `chargeId` é sequencial, o vazamento é **automatizável e em massa**. Habilita fraude, engenharia social direcionada e configura tratamento irregular de dados pessoais sob a **LGPD**.

**Severidade sugerida:** Crítico. **Correção:** validar, no servidor, que o `chargeId` solicitado pertence ao usuário da sessão (autorização *object-level*).

---

## Defesa em camadas (pro report ficar redondo — e pra você saber o que recomendar)

Um report bom também **aponta a correção**. A raiz do exemplo é falta de checagem de propriedade no servidor:

```php
// ERRADO — confia no chargeId que veio do cliente, sem checar o dono
$fatura = Fatura::find($_GET['chargeId']);
return response()->json($fatura);   // entrega pra qualquer um autenticado

// CORRETO — só devolve se a cobrança for do usuário logado (object-level)
$fatura = Fatura::where('id', $request->chargeId)
                ->where('cliente_id', auth()->id())   // <- a checagem que faltava
                ->firstOrFail();                       // 404 se não for dono
```

```javascript
// Node/Express — autorização por dono do objeto
const fatura = await Fatura.findOne({ _id: req.query.chargeId, clienteId: req.user.id });
if (!fatura) return res.sendStatus(404);   // não vaza nem a existência do recurso
```

Princípios que matam a classe inteira: **deny by default**, **nunca confiar em identificador vindo do cliente** pra decidir autorização, **IDs imprevisíveis** (UUID v4) como reforço — mas que **não substituem** a checagem de dono — e **teste de autorização no CI** ("Conta B não acessa objeto de Conta A"). (A fundo no post de [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/).)

## Ferramentas que ajudam a montar o report

- **Burp Suite** — Repeater (mostrar a troca), Intruder (provar escala), e o próprio histórico pra extrair a request exata.
- **CVSS Calculator (FIRST.org)** — gera o vetor e o score pra justificar a severidade: [first.org/cvss/calculator/3.1](https://www.first.org/cvss/calculator/3.1).
- **VRT da Bugcrowd** — mapeia a classe → severidade esperada: [bugcrowd.com/vulnerability-rating-taxonomy](https://bugcrowd.com/vulnerability-rating-taxonomy).
- **Gravador de tela** (OBS, asciinema pra CLI) — vídeo de PoC é o que mais convence em casos complexos.
- **Editor de imagem** (Flameshot, Greenshot) — pra circular/anotar prints. Print sem destaque é metade do print.

## Checklist do report que paga

- [ ] Título `[Classe] - o que dá pra fazer + onde`, concreto.
- [ ] Resumo em termos de **negócio/PII**, não de mecânica.
- [ ] Plataforma, alvo e **contexto** (módulo afetado) ditos.
- [ ] Severidade **justificada** com CVSS + CWE (+ VRT).
- [ ] Passos numerados, **do zero**, qualquer um reproduz.
- [ ] **Request/comando exato** com o ponto da manipulação marcado.
- [ ] Cada passo **referencia o print** correspondente (PRINT1, PRINT2...).
- [ ] Prints **legíveis, destacados** e que provam que o dado é de outra pessoa.
- [ ] **Escala** demonstrada (Intruder / enumeração) quando aplicável.
- [ ] Impacto com **dado nomeado** (PII) e o que o atacante faz.
- [ ] Sugestão de **correção** incluída.
- [ ] Conferi o **escopo** e tenho **certeza** de que reproduz.

## O que você precisa lembrar

- O report **transfere a sua certeza** pro triador — sem buracos, ele reproduz e paga.
- **Resumo = risco ao negócio** (PII, dinheiro, LGPD); mecânica fica nos passos.
- **Passos reproduzíveis do zero + prints destacados** é o que mais derruba ou aprova report.
- **Impacto + escala** definem o bounty; nomeie o dado e mostre quantas contas afeta.
- Triador questionou? **Escopo → argumento → "é pago por outras empresas" → link de precedente.**

> 💡 **Dica de ouro:** escreva o report pensando *"um pesquisador que nunca viu essa aplicação consegue reproduzir só com o que está escrito aqui?"*. Se a resposta é sim, o triador também consegue — e report que reproduz de primeira é report que paga.

## Nota ética

Tudo aqui é pra **testes autorizados** — programas de bug bounty dentro do escopo, pentests contratados e labs legais. Ao reportar, **respeite a policy**, não exfiltre mais dado do que o necessário pra provar o bug (em PoC de PII, mascare CPF/dados nos prints) e pratique **disclosure responsável**: dê tempo pro programa corrigir antes de tornar público. Report existe pra proteger quem usa o sistema, não pra exibir acesso indevido.

## Referências

- [HackerOne — Quality Reports](https://docs.hackerone.com/en/articles/8475116-quality-reports)
- [HackerOne — Report Templates](https://docs.hackerone.com/en/articles/8496338-report-templates)
- [Bugcrowd Docs — Reporting a Bug](https://docs.bugcrowd.com/researchers/reporting-managing-submissions/reporting-a-bug/)
- [Bugcrowd — How to write excellent reports (LevelUp)](https://www.bugcrowd.com/resources/levelup/how-to-write-excellent-reports-techniques-that-save-triagers-time-and-mistakes-that-should-be-avoided-in-reports/)
- [Bugcrowd — Vulnerability Rating Taxonomy (VRT)](https://bugcrowd.com/vulnerability-rating-taxonomy)
- [FIRST.org — CVSS v3.1 Calculator](https://www.first.org/cvss/calculator/3.1)
- [MITRE — CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- [OWASP — Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
- [reddelexc/hackerone-reports — reports públicos por tipo de bug](https://github.com/reddelexc/hackerone-reports)

---
*Próximo na série: aplique este modelo no post de [Broken Access Control — IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) · base: [Recon & Discovery](/posts/recon-discovery/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
