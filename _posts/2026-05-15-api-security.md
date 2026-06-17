---
title: "Segurança de APIs: o OWASP API Security Top 10 na prática (REST e GraphQL)"
description: "Por que as APIs concentram a maioria dos bugs hoje — e como achar, explorar e corrigir as 10 classes do OWASP API Security Top 10 2023, com exemplos práticos em REST e GraphQL."
author: matheus
date: 2026-05-15 19:23:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["API security", "OWASP API Top 10", "BOLA", "mass assignment", "excessive data exposure", "GraphQL", "JWT", "bug bounty", "web security"]
image: /assets/img/covers/api-security.png
pin: false
comments: true
---

## A tela mente, a resposta não

Você abre o painel de uma plataforma financeira. Na tela aparece o seu nome, o seu saldo, três faturas. Bonitinho. Mas a tela é só o **rosto**. Quem trabalha de verdade é a API por baixo, e o que ela devolve quase nunca é exatamente o que a tela mostra. Muita vez ela devolve **mais**: o CPF que o front escondeu, um campo `role` que o JavaScript ignorou, um `internalNotes` que ninguém deveria ler.

Hoje, **a maior parte da superfície de ataque de qualquer produto é API**. App de celular? Conversa com API. SPA em React? Conversa com API. Integração com parceiro? API de novo. Cada tela virou um amontoado de chamadas `fetch`/GraphQL, e cada chamada é uma porta. Por isso a OWASP mantém um Top 10 **só de API**, separado do [OWASP Top 10](https://owasp.org/Top10/) clássico: os erros de API têm cara própria.

Neste post a gente percorre o **[OWASP API Security Top 10 — edição 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)** inteiro, com um exemplo prático de cada classe, uma seção dedicada a **GraphQL** (que tem armadilhas exclusivas) e a metodologia de como **achar e testar** uma API do zero. Vários posts da série já tocaram pedaços disso. Aqui a gente costura tudo na visão "API first".

> 💡 A **API** (Application Programming Interface) é o "contrato" pelo qual dois sistemas conversam, geralmente HTTP devolvendo JSON. É o back-end falando direto, sem a maquiagem do front. Mais no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

## O que muda quando o bug é "de API"

**Analogia:** um site tradicional é um restaurante onde o garçom (servidor) monta o prato e te entrega pronto. Uma API é um **balcão de self-service**: o servidor te entrega os ingredientes crus e confia que você vai montar o prato "do jeito certo". O atacante não monta o prato certo: ele pega ingredientes que não são dele, adiciona temperos proibidos (`isAdmin:true`) e enche o prato até a cozinha pegar fogo.

Três características fazem o bug de API ser diferente:

1. **Não tem "tela" pra te frear.** No front, o botão de admin some pra você. Na API, o endpoint `/admin/...` continua lá, respondendo. Só faltou alguém checar se você podia.
2. **A resposta é crua.** O JSON traz tudo que o back-end serializou. Se o dev mandou o objeto inteiro, você vê o objeto inteiro, campos sensíveis incluídos.
3. **É feita pra automação.** API existe pra ser chamada em loop, em escala. O que é "uma tela por vez" no browser vira "10.000 requisições por minuto" no Burp Intruder.

> 💡 **Serializar** é transformar um objeto interno (um registro do banco, por exemplo) em JSON pra mandar na resposta. O perigo é serializar o objeto **inteiro** em vez de escolher campo a campo. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

## O Top 10 de API, em uma tabela

Esta é a edição **2023** (a vigente). Decore as siglas: elas viram o vocabulário do report.

| ID | Nome oficial | Em uma frase |
|---|---|---|
| **API1** | Broken Object Level Authorization (BOLA) | IDOR em API: acesso a **objeto** de outro usuário |
| **API2** | Broken Authentication | Login/token frágil (JWT mal validado, sem expiração) |
| **API3** | Broken Object **Property** Level Authorization | **Mass Assignment** + **Excessive Data Exposure** (campos a mais) |
| **API4** | Unrestricted Resource Consumption | Sem rate limit / paginação → DoS e custo |
| **API5** | Broken Function Level Authorization (BFLA) | Acesso a **função** de outro perfil (ex.: ação de admin) |
| **API6** | Unrestricted Access to Sensitive Business Flows | Automatizar um **fluxo de negócio** sensível (bots, scalping) |
| **API7** | Server Side Request Forgery (SSRF) | Fazer a API requisitar uma URL que você controla |
| **API8** | Security Misconfiguration | CORS frouxo, debug ligado, headers faltando, defaults |
| **API9** | Improper Inventory Management | APIs antigas/shadow, `/v1` esquecida, swagger exposto |
| **API10** | Unsafe Consumption of APIs | Confiar cegamente no dado que **outra** API te devolve |

Repare em uma coisa: **três das dez são controle de acesso** (API1, API3, API5). Não é coincidência: é onde está o dinheiro. Já cobrimos a base de controle de acesso em [10-broken-access-control-idor-bola-bfla.md](/posts/broken-access-control-idor-bola-bfla/); aqui a gente recapitula no contexto de API e aprofunda o resto.

---

## API1: Broken Object Level Authorization (BOLA)

É o **IDOR**, com nome de API. É o item **número 1** do ranking e, na prática, a falha que mais aparece e mais paga.

> 💡 No **IDOR** (Insecure Direct Object Reference) você troca um identificador na requisição (`id=1` por `id=2`) e acessa o dado de outra pessoa porque o servidor não checou se aquele objeto era seu. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

A raiz é sempre a mesma: o servidor recebe um identificador de objeto do cliente e **não checa se aquele objeto é seu**.

```http
GET /api/v1/Usuario/usera HTTP/2
Host: alvo.com
Authorization: Bearer <seu_token>
```

Troca `usera` por `userb` no Repeater e, se voltar o dado do `userb`, é BOLA confirmado. O identificador nem sempre é um `id` numérico óbvio: vi muito caso com `cpf`, `idProduto`, `chargeId`, `NroConta`. Exemplo de IDOR no corpo de um POST:

```http
POST /api/v1/Monetario/detalhe HTTP/2
Host: alvo.com
Authorization: Bearer <seu_token>
Content-Type: application/json

{"tipoProduto":1,"idProduto":2}   # <- troca o idProduto e lê o seguro de outra pessoa
```

> ⚠️ **A tela pode dizer "não", o back-end dizer "sim".** Em muitos casos o front mostra "Usuário não encontrado", mas a API responde `HTTP 200` com `true` e executa a operação no banco. **Sempre olhe a resposta crua**, não a tela.

> 📊 **Severidade (BOLA lendo PII em escala):** quando dá pra enumerar e vazar dado pessoal de **qualquer** cliente autenticado (leitura, sem alterar nada), uma base típica fica em **CVSS v3.1 6.5 (Médio)** (`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`) e **CVSS v4.0 7.1 (Alto)** (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`). O **v4.0 pune mais** o vazamento de confidencialidade, e a escala (todas as contas) costuma empurrar a classificação do programa pra cima. Score é ponto de partida: argumente o **impacto** (PII + escala + LGPD).

A teoria completa de IDOR/BOLA (enumeração, IDs mascarados, troca de token) está no post dedicado: **[10-broken-access-control-idor-bola-bfla.md](/posts/broken-access-control-idor-bola-bfla/)**.

## API2: Broken Authentication

Aqui o problema é o **mecanismo que prova quem você é**: login, recuperação de senha, e principalmente **token**. Os clássicos:

- **Endpoint de senha sem autenticação.** Existe `POST /autenticacao/api/v1/resetar-senha` que troca a senha de **qualquer** usuário sem exigir sessão válida nem código real. Crítico, ATO direto. Em **CVSS v3.1** isso é **9.1 (Crítico)** (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`); o vetor equivalente em **CVSS v4.0** é `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`, também faixa **Crítico**.

> 💡 No **ATO** (Account Takeover, tomada de conta) você consegue assumir o controle da conta de outra pessoa. É o tipo de impacto que mais paga em bug bounty. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

- **Sem rate limit no login** → brute force de credencial ou de OTP.

> 💡 O **OTP** (One-Time Password) é um código de uso único e curta validade enviado por SMS/app (o "código de verificação"). Sem rate limit, dá pra adivinhá-lo na força bruta.
- **JWT mal validado.** Esse merece um zoom.

> 💡 O **JWT** (JSON Web Token) é um token no formato `header.payload.signature`, cada parte em Base64URL. O `payload` carrega claims (ex.: `{"sub":"123","role":"user"}`) e a `signature` garante que ninguém adulterou. Detalhe no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

O `payload` de um JWT é **só Base64, não é criptografia**: qualquer um decodifica e lê. A segurança está na **assinatura**. Os erros campeões:

```bash
# Decodificar o payload de um JWT (a "parte do meio") — é só base64url, não tem segredo nenhum
echo 'eyJzdWIiOiIxMjMiLCJyb2xlIjoidXNlciJ9' | base64 -d
# -> {"sub":"123","role":"user"}
```

| Falha no JWT | Ataque |
|---|---|
| `"alg":"none"` aceito | Remover a assinatura e o servidor aceita o token sem verificar nada |
| Confusão de algoritmo (RS256 → HS256) | Assinar com a **chave pública** (que é conhecida) tratando-a como segredo HMAC |
| Segredo fraco em HS256 | Quebrar o segredo offline (`hashcat -m 16500`) e forjar qualquer token |
| Sem checar expiração / sem revogação | Token vazado vale pra sempre |

Forjar/abusar de JWT e o passo a passo de Account Takeover ficam no post **[12-account-takeover.md](/posts/account-takeover/)**.

## API3: Broken Object Property Level Authorization

Esse é o mais subestimado e provavelmente o que vai te render report fácil. O nome assusta, mas é simples: enquanto o **API1 (BOLA)** é sobre acessar o **objeto inteiro** errado, o **API3** é sobre acessar a **propriedade (campo) errada** do objeto, de leitura **ou** de escrita. Daí ele junta dois irmãos:

### 3a) Mass Assignment: escrever campo que não era pra você

> 💡 **Mass Assignment** é quando o framework "pega tudo" do JSON da requisição e joga direto nos atributos do objeto/modelo, sem filtrar. Se você adicionar um campo a mais, ele cola. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

A ideia é mandar **mais campos do que o formulário envia**. O dev fez um endpoint de atualizar perfil esperando `nome` e `telefone`. Mas o modelo `User` também tem `role` e `isAdmin`. Se o back-end faz algo como `user.update(request.body)` sem allowlist, você escala:

```http
PATCH /api/v1/users/me HTTP/2
Host: alvo.com
Authorization: Bearer <token_usuario_comum>
Content-Type: application/json

{
  "nome": "Fulano",
  "telefone": "11999999999",
  "role": "admin",          # <- campo que a tela NUNCA mostra
  "isAdmin": true           # <- chuta nomes prováveis e veja se cola
}
```

**Como descobrir os nomes dos campos?** Olhe a **resposta** de um `GET` do mesmo objeto: ela costuma listar todas as propriedades (`role`, `isAdmin`, `verified`, `balance`, `accountStatus`). Os campos que aparecem na leitura são candidatos pra escrita. A própria [PortSwigger recomenda](https://portswigger.net/web-security/api-testing) o ciclo: (1) identificar campos ocultos na resposta, (2) adicioná-los na request, (3) testar com valor inválido pra ver se o servidor "reage" (sinal de que ele lê o campo), (4) explorar com valor válido.

Variações que rendem report: `"price": 0` num carrinho, `"verified": true` num cadastro, `"discount": 99` num pedido, `"userId": <de_outro>` numa criação de recurso.

### 3b) Excessive Data Exposure: ler campo que não era pra você

Aqui o atacante não faz nada de especial: a API simplesmente **devolve mais do que a tela usa**. O front pega o JSON, mostra três campos e descarta o resto. Mas o resto **veio na resposta** e está no seu Burp.

```http
GET /api/v1/users/1001 HTTP/2
Host: alvo.com
```
```http
HTTP/2 200 OK
Content-Type: application/json

{
  "id": 1001,
  "name": "Cliente A",
  "email": "a@exemplo.com",     # a tela mostra
  "passwordHash": "$2y$10$...", # <- a tela NÃO mostra, mas veio!
  "cpf": "000.000.000-00",      # <- PII vazando
  "internalRiskScore": 870,     # <- dado interno
  "isAdmin": false
}
```

> ⚠️ **Regra de ouro do API3:** o atacante não usa o navegador, usa o **JSON cru**. "Esconder no front" não esconde nada. Sempre compare *o que a tela mostra* × *o que a resposta traz*.

> 💡 **PII** (Personally Identifiable Information) é dado pessoal que identifica alguém: CPF, e-mail, telefone, endereço. Vazar PII costuma elevar a severidade do report. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

A causa, segundo a [OWASP](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/), é o dev usar **serialização genérica** ("manda o objeto inteiro") em vez de escolher campo a campo ("cherry-pick"). Combine `excessive data exposure` com um BOLA e você tem vazamento de PII em massa.

## API4: Unrestricted Resource Consumption

A API não limita o quanto você pode consumir: sem **rate limit**, sem **paginação**, sem teto de tamanho de upload, sem limite em operações em lote. Resultado: **DoS** e, pior, **custo**, porque cada chamada pode disparar SMS, e-mail ou uma API paga de terceiro.

> 💡 **DoS** (Denial of Service, negação de serviço) é sobrecarregar ou travar o sistema a ponto de ele parar de atender usuários legítimos. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

> 💡 **Rate limit** é o teto de quantas requisições uma origem (IP/usuário/token) pode fazer num intervalo. Sem ele, um loop seu vira uma enxurrada. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

Exemplo direto da [OWASP](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/): um endpoint de reset que manda SMS a cada chamada, a US$ 0,05 a mensagem. Automatize e a conta do alvo explode em minutos. Outro padrão clássico, de baixo impacto mas ainda pagável, é login sem rate limit:

```http
POST /api/v1/login HTTP/2
Host: alvo.com
Content-Type: application/json

{"usuario":"vitima","senha":"errada"}   # <- repita no Intruder: brute force OU bloqueio em massa
```

Falta de rate limit também habilita **DoS por bloqueio**: se 3 tentativas erradas bloqueiam a conta e não há rate limit, dá pra **bloquear contas em massa** de usuários válidos. Esse e os ataques de exaustão (recursos, paginação infinita, ReDoS) estão detalhados em **[22-denial-of-service-aplicacao.md](/posts/denial-of-service-aplicacao/)**.

> ⚠️ Rate limit costuma ser tratado como "baixo impacto", mas **é reportável** quando não está fora de escopo, principalmente se viabiliza brute force, bloqueio em massa ou custo. Argumente o impacto e linke precedentes pagos.

## API5: Broken Function Level Authorization (BFLA)

Enquanto BOLA é sobre **objeto**, BFLA é sobre **função**. A função privilegiada existe, o endpoint responde. Só faltou checar se o **seu perfil** podia chamá-la.

```http
POST /api/admin/store/block HTTP/2
Host: alvo.com
Authorization: Bearer <token_usuario_comum>   # <- perfil SEM permissão de admin
Content-Type: application/json

{"storeId": 77}
```

Resposta `200` / ação executada = BFLA. O padrão mais lucrativo que existe no mundo real é o **BFLA em massa via troca de JWT**: pegar uma credencial de **admin**, anotar **todas** as funções/endpoints que só o admin enxerga e, em cada uma, **trocar o token** pelo de um perfil sem permissão (basta seu perfil conseguir gerar/gerenciar outros perfis, não precisa achar o token no JS). Quando não há validação de autorização por função no servidor, um único alvo pode render **dezenas** de reports de uma vez.

> 📊 **Severidade (BFLA executando ação privilegiada):** uma ação de admin disparada por perfil comum (alterar/bloquear recurso de outro, impacto de **integridade**, sem leitura sensível) costuma sair em **CVSS v3.1 6.5 (Médio)** (`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`) e **CVSS v4.0 7.1 (Alto)** (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N/SC:N/SI:N/SA:N`). Se a função der ATO ou apagar/expor dado de terceiros, sobe.

Metodologia completa de BFLA (mapear ações de admin, matriz de autorização, Autorize/AuthMatrix) também no post **[10-broken-access-control-idor-bola-bfla.md](/posts/broken-access-control-idor-bola-bfla/)**.

## API6: Unrestricted Access to Sensitive Business Flows

Aqui não tem "bug técnico". O endpoint funciona como projetado. O problema é deixar **automatizar um fluxo de negócio sensível** sem fricção. A [OWASP](https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/) define como abusar de uso **legítimo, porém excessivo**.

Exemplos do mundo real:
- **Scalping:** bot compra todo o estoque de um produto limitado por vários IPs e revende caro.
- **Companhia aérea:** reservar 90% dos assentos, cancelar perto da data pra forçar queda de preço, comprar barato.
- **Programa de indicação:** automatizar cadastros pra acumular créditos de referral.

A diferença pro **API4** é importante: API4 é "muitas requisições" (frequência); **API6 é "muita ação de negócio"** mesmo que cada requisição seja lenta e humana-parecida. A defesa não é só rate limit. Entram fingerprint de dispositivo, CAPTCHA, detecção de padrão não-humano. Isso é **lógica de negócio**, tema do post **[20-business-logic.md](/posts/business-logic/)**.

## API7: Server-Side Request Forgery (SSRF)

Quando a API aceita uma **URL** sua e vai buscá-la no servidor (webhook, "importar de URL", gerar thumbnail de imagem remota, enriquecer dado). Você aponta pra dentro:

```http
POST /api/v1/import HTTP/2
Host: alvo.com
Content-Type: application/json

{"sourceUrl": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}
# <- metadata da cloud: pode vazar credenciais da infra
```

SSRF é um post inteiro: bypasses de filtro, metadata da AWS/GCP, SSRF cego com Collaborator. Tudo em **[16-ssrf.md](/posts/ssrf/)**.

## API8: Security Misconfiguration

Configuração frouxa: **CORS** permissivo (`Access-Control-Allow-Origin` refletindo qualquer origem com credenciais), modo **debug/stacktrace** ligado, headers de segurança faltando, métodos HTTP a mais habilitados, defaults nunca trocados, painéis e actuators expostos.

> 💡 O **CORS** (Cross-Origin Resource Sharing) é o conjunto de headers que diz **quais sites de origem** podem ler a resposta da sua API via JavaScript. Mal configurado (`Allow-Origin` refletido + `Allow-Credentials: true`), deixa um site malicioso ler dados autenticados da vítima. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

Exemplo de CORS perigoso, com o servidor ecoando a origem do atacante:

```http
GET /api/v1/me HTTP/2
Host: alvo.com
Origin: https://malicioso.exemplo.com
```
```http
HTTP/2 200 OK
Access-Control-Allow-Origin: https://malicioso.exemplo.com  # <- reflete QUALQUER origem
Access-Control-Allow-Credentials: true                       # <- com cookies/credenciais
```

Misconfiguration cobre um universo (Spring Boot Actuator/`heapdump` exposto, `.git`, defaults de CMS, CVEs de versão desatualizada). Tudo isso no post **[11-security-misconfiguration-cve-hunting.md](/posts/security-misconfiguration-cve-hunting/)**.

## API9: Improper Inventory Management

A empresa **perdeu a conta** das próprias APIs. Sobrou uma `/v1` antiga rodando ao lado da `/v2` nova. Só que a `/v1` não recebeu os patches nem o rate limit. Ou existe uma **shadow API** (host de beta/staging) com a mesma funcionalidade e **sem as proteções** da produção.

> 💡 **Shadow API** é um endpoint/host que existe e funciona, mas não está no inventário oficial nem na documentação: staging, beta, versão legada. Some da vista de quem defende, não da de quem ataca. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

O exemplo da [OWASP](https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/) é exatamente esse: um host de **beta** com a mesma função da produção, mas **sem rate limit**, permitindo brute force de token de reset que na produção era bloqueado.

Como caçar:
- **Dorks** pra documentação e versões antigas:

```text
site:alvo.com inurl:api | inurl:v1 | inurl:v2 | inurl:v3
inurl:apidocs | inurl:api-docs | inurl:swagger | inurl:api-explorer site:alvo.com
```

- **Troque a versão** num endpoint conhecido: se `/api/v2/users` é bem protegido, teste `/api/v1/users` e `/api/v3/users`.
- **Documentação exposta** (swagger/OpenAPI) muitas vezes lista endpoints que o app nem usa mais: ouro pra enumerar.

> 💡 **Swagger / OpenAPI** é a especificação que descreve toda a API (rotas, parâmetros, modelos) em JSON/YAML. Ótimo pra dev, e mapa do tesouro pro atacante quando fica público. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

Recon de subdomínios e hosts esquecidos: **[01-recon-discovery.md](/posts/recon-discovery/)** e **[23-subdomain-takeover-broken-link-hijacking.md](/posts/subdomain-takeover-broken-link-hijacking/)**.

## API10: Unsafe Consumption of APIs

A virada de chave: até agora você era o atacante **da** API. Aqui a API alvo é a **vítima** porque ela **confia cegamente** no dado que recebe de **outra** API (terceiro/parceiro). Devs tendem a tratar dado de API parceira como "seguro", aplicando menos validação do que aplicariam a input do usuário.

Exemplo da [OWASP](https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/): a API alvo enriquece endereços via um serviço de terceiro. O atacante **planta um payload de SQL Injection** nesse serviço de terceiro; quando o alvo busca o dado enriquecido e o salva no próprio banco **sem validar**, o SQLi executa em casa. Mesma lógica vale pra seguir redirects de terceiros (vira SSRF) ou confiar em status/preços vindos de fora.

A defesa é simples de enunciar: **dado de terceiro é input não confiável igual a input de usuário**. Valide, sanitize, não siga redirect cego, use TLS. Injection em si está em **[14-sql-injection.md](/posts/sql-injection/)** e **[15-rce-command-injection-ssti.md](/posts/rce-command-injection-ssti/)**.

---

## Seção dedicada: GraphQL

GraphQL é um "balcão único": em vez de vários endpoints REST, existe **um endpoint** (geralmente `/graphql`) e o cliente descreve exatamente o que quer. Isso é poderoso, e abre armadilhas que REST não tem. Tudo aqui está conforme a **[OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)** e o **[PortSwigger — GraphQL](https://portswigger.net/web-security/graphql)**.

### Achar o endpoint

> 💡 O **CSRF** (Cross-Site Request Forgery) força o navegador da vítima a enviar uma requisição autenticada sem ela saber. XSS pode encadear com CSRF.
{: .prompt-tip }

Caminhos comuns: `/graphql`, `/api`, `/api/graphql`, `/graphql/api`, `/graphql/graphql`. O **probe universal**: qualquer endpoint GraphQL responde a isto:

```json
{"query": "{__typename}"}
```
Se voltar algo como `{"data": {"__typename": "Query"}}` (o nome do root type pode variar, ex.: `RootQuery`), achou um GraphQL. Vale testar métodos diferentes: `POST application/json`, `GET` e `POST x-www-form-urlencoded`, porque alguns aceitam alternativas (e isso também abre CSRF).

> 💡 A **Introspection** é o recurso do GraphQL que permite **perguntar ao próprio servidor** qual é o schema completo (tipos, queries, mutations, campos). Ótimo em dev, perigoso em produção. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

### Introspection: baixar o schema inteiro

Primeiro, um probe curto pra ver se introspection está ligada:

```json
{"query": "{__schema{queryType{name}}}"}
```

Se responder, dá pra rodar a **full introspection query** e mapear todos os tipos, queries e mutations:

```graphql
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      fields { name }
    }
  }
}
```

Com o schema na mão, você lê o "mapa" inteiro da API: que mutations existem (`createUser`, `resetPassword`), que campos um `User` tem (`role`, `isAdmin`), etc. Ferramenta: **GraphQL Voyager** desenha o schema; o **InQL** (extensão do Burp) gera as queries automaticamente.

### Field suggestions: vazamento mesmo com introspection desligada

Se introspection está bloqueada, ainda dá pra reconstruir o schema. O Apollo (servidor comum) tem **field suggestions**: ao errar um nome de campo, ele "ajuda" com mensagens tipo *"Did you mean `email` instead?"*. A ferramenta **Clairvoyance** automatiza isso e remonta o schema a partir das sugestões.

> ⚠️ Quando introspection parece bloqueada, tente inserir caracteres especiais (espaço, newline, vírgula) logo depois de `__schema`: regex de filtro mal-feito não pega. E tente trocar o método HTTP (de POST pra GET).

### Aliases e batching: brute force em uma só request

Esse é o pulo do gato exclusivo de GraphQL. Um **alias** deixa você chamar o **mesmo** campo várias vezes na mesma requisição, com nomes diferentes. Resultado: você faz 100 tentativas dentro de **1 requisição HTTP**, e o rate limit que conta "requisições HTTP" **não percebe**. Exemplo (validar códigos de desconto, do PortSwigger):

```graphql
query isValidDiscount($code: Int) {
  isValidDiscount(code: $code) { valid }
  isValidDiscount2: isValidDiscount(code: $code) { valid }
  isValidDiscount3: isValidDiscount(code: $code) { valid }
}
```

**Batching** é a mesma ideia por outra via: mandar um **array** de queries num único POST. Os dois servem pra burlar rate limit e fazer brute force de OTP/cupom/credencial. A própria OWASP avisa: *rate limit de rede não enxerga esses ataques*. A defesa precisa ser **por objeto/operação**, no código.

### Injection no GraphQL

> 💡 **NoSQLi** (NoSQL Injection) é injeção em bancos não-SQL (ex.: MongoDB) via operadores como {$ne: null}. Mesmos riscos do SQLi, sintaxe diferente.
{: .prompt-tip }

GraphQL **não é imune a injection**. Os argumentos das queries/mutations chegam ao banco igual a qualquer input. Se o resolver concatena na query, é SQLi/NoSQLi normal:

> 💡 O **Resolver** é a função no back-end que "resolve" cada campo da query GraphQL: é ela que vai ao banco buscar o dado. Se concatena seu input na consulta, abre injection. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

```graphql
query {
  user(filter: "1' OR '1'='1") { id name email }
}
```

Defesa: queries parametrizadas e ORM correto (igual REST). Veja **[14-sql-injection.md](/posts/sql-injection/)**.

### Deep / nested query: DoS por aninhamento

Schemas com relações circulares (um `Post` tem `Author`, que tem `Posts`, que têm `Author`...) permitem queries **profundamente aninhadas** que explodem o custo de processamento:

```graphql
query {
  posts {
    author {
      posts {
        author {
          posts { title }   # <- aninhe N níveis: 1 request derruba o servidor
        }
      }
    }
  }
}
```

A OWASP recomenda **depth limiting** (limitar profundidade, via `graphql-depth-limit`), **amount limiting** (limitar quantos objetos uma query pede) e **query cost analysis** (dar um "preço" a cada campo e recusar queries caras, via `graphql-cost-analysis`). É um vetor de DoS, ligado ao post **[22-denial-of-service-aplicacao.md](/posts/denial-of-service-aplicacao/)**.

| Armadilha GraphQL | Vira | Defesa principal |
|---|---|---|
| Introspection ligada em prod | Schema vazado | Desligar introspection/GraphiQL em prod |
| Field suggestions | Schema remontado (Clairvoyance) | Desligar sugestões |
| Aliases / batching | Brute force burlando rate limit | Rate limit por objeto + limitar batching |
| Deep nested query | DoS | Depth + amount + cost analysis |
| Argumento sem sanitização | SQLi/NoSQLi/etc. | Query parametrizada / ORM |

---

> 💣 **GraphQL "bombs" (aliasing + upload).** Outra amplificação de DoS: combine a feature de **upload de arquivo** com **aliasing** pra referenciar o **mesmo** arquivo dezenas/centenas de vezes numa única query: um request de < 2 MB força o servidor a processar ~1 GB em memória. O mesmo abuso de aliasing serve pra **brute-force de login num único request** (cada alias = uma tentativa), furando rate-limit que conta por request. (Técnica documentada pela [HAKAI Security](https://hakaisecurity.io/avoiding-unrestricted-file-upload-straight-to-the-source/insights-blog/).) Defesa: limitar nº de aliases/batching além de profundidade e custo (query cost analysis).

## Como testar uma API do zero (metodologia)

Não dá pra atacar o que você não mapeou. O fluxo, alinhado à **[metodologia da PortSwigger](https://portswigger.net/web-security/api-testing)**:

**1. Achar os endpoints.**
- **Documentação:** teste caminhos comuns como `/api`, `/api/docs`, `/swagger/index.html`, `/swagger.json`, `/openapi.json`, `/api-docs`. Se achar uma spec OpenAPI/Swagger, você ganhou o mapa inteiro.
- **Arquivos JS:** o front é um SPA, então os paths e parâmetros estão nos `.js`. Extraia com a extensão **JS Link Finder** (Burp) ou com `katana`/`gau` (apresentados no [01-recon-discovery.md](/posts/recon-discovery/)).
- **App mobile:** o `.apk` é um zip. Descompacte e procure URLs, tokens e endpoints. Muitas vezes a API do app é **menos protegida** que a web e expõe rotas que o site nem usa.

```bash
# Mobile: extrair strings de URL/endpoint de um APK (alvo autorizado)
unzip -o app.apk -d app_out >/dev/null
grep -rEoh 'https?://[a-zA-Z0-9./_-]+' app_out/ | sort -u | grep -i 'api\|v1\|graphql'
# (jadx -d app_out app.apk descompila pra um código mais legível)
```

**2. Interagir e enumerar.** Jogue o tráfego no **Burp** ou **Postman**. Pra cada endpoint:
- Teste **todos os métodos**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` (um pode ser checado e o outro não).
- Teste **content-types** diferentes.
- Procure **parâmetros ocultos** com o **Param Miner** (testa até 65.536 nomes por request) ou Intruder com wordlist.

**3. Atacar com o Top 10 como checklist.** Pra cada endpoint, passe a lista: dá pra trocar ID (BOLA)? Mandar campo extra (mass assignment)? A resposta traz campo a mais (excessive data)? Tem rate limit? A função aceita meu perfil (BFLA)?

> 💡 Um **Deeplink** é um link que abre direto uma tela específica do app (`app://pagamento?valor=...`). No mobile, deeplinks expostos às vezes pulam telas de autorização. Vale testar como uma "rota escondida" do app. [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

## Defesa em camadas

Nenhuma das dez classes se resolve com uma única linha. A defesa de API é **em camadas**, e cada camada cobre uma fatia do Top 10. O resumo que vale colar na revisão de qualquer endpoint:

| Camada | O que faz | Cobre |
|---|---|---|
| **Autenticação forte** | Validar token sempre: assinatura, `alg` fixo no servidor, `exp`, e revogação | API2 |
| **Autorização por objeto e por função** | Checar **dono** (BOLA) e **perfil** (BFLA) em **toda** rota, nunca confiar no ID/role do cliente | API1, API3, API5 |
| **Allowlist de campos (input)** | Aceitar só os campos que aquele endpoint deve receber; bloqueia mass assignment | API3 |
| **Allowlist de campos (output / DTO)** | Serializar campo a campo, nunca o objeto inteiro; bloqueia excessive data exposure | API3 |
| **Rate limit + cotas** | Teto por usuário/token/IP; limites em batch, paginação e uploads | API4, API6 |
| **Validação de input** | Tratar **todo** input (inclusive de API parceira (API10) e URL de webhook (API7)) como não confiável | API7, API10 |
| **Config endurecida** | CORS restrito, debug off, headers de segurança, inventário e versões controlados | API8, API9 |

O ponto mais importante e mais errado: **autorização nunca pode confiar em nada que veio do cliente**. O dono do objeto e o perfil do usuário saem da **sessão do servidor**, jamais do `id`/`role` que o cliente mandou.

```javascript
// Node/Express — o trio que mata BOLA + Mass Assignment + Excessive Data Exposure de uma vez
app.patch('/api/v1/users/me', auth, async (req, res) => {
  // 1) Dono vem da SESSÃO (req.user.id), nunca de um id do corpo  -> mata BOLA
  const userId = req.user.id;

  // 2) Allowlist de ENTRADA: só estes campos são aceitos        -> mata Mass Assignment
  const { nome, telefone } = req.body;          // 'role' e 'isAdmin' são ignorados de propósito
  await User.update({ nome, telefone }, { where: { id: userId } });

  // 3) Allowlist de SAÍDA: monte o DTO campo a campo            -> mata Excessive Data Exposure
  const u = await User.findByPk(userId);
  return res.json({ id: u.id, nome: u.nome, telefone: u.telefone, email: u.email });
  // NUNCA: return res.json(u)  -> vazaria passwordHash, cpf, internalRiskScore...
});
```

```php
// PHP/Laravel — allowlist de entrada com $fillable + DTO de saída via API Resource
class User extends Model {
    // Só estes campos podem ser preenchidos em massa -> mata Mass Assignment
    protected $fillable = ['nome', 'telefone'];
    // E esconda explicitamente o que nunca deve sair na serialização
    protected $hidden = ['password', 'cpf', 'internal_risk_score', 'is_admin'];
}

// No controller: autorização por objeto antes de tudo -> mata BOLA/BFLA
public function update(Request $request, Charge $charge) {
    $this->authorize('update', $charge);   // Policy checa o DONO/perfil na sessão
    $charge->update($request->only(['nome', 'telefone']));
    return new ChargeResource($charge);    // Resource expõe só os campos permitidos
}
```

> ⚠️ **O que NÃO basta:** esconder o campo/botão no front, usar UUID "imprevisível" como única defesa, ou validar só no `GET`. Nada disso checa **dono** nem **perfil**, e é exatamente isso que o atacante explora. Verificação de autorização por objeto e por função, no servidor, em toda rota, é inegociável.

Defesas específicas de cada classe estão nos posts dedicados (links ao longo do texto). No GraphQL, some a isto a tabela de defesas da seção própria (introspection off em prod, rate limit por objeto, depth/amount/cost limiting).

## Ferramentas + labs legais

- **Burp Suite**: Repeater (trocar campos), Intruder (enumerar/escala), extensões **InQL** (GraphQL), **JS Link Finder**, **Param Miner**, **Autorize**/**AuthMatrix** (testar autorização entre contas).
- **Postman / Insomnia**: montar e versionar coleções de requisições de API.
- **Clairvoyance**: remontar schema GraphQL via suggestions; **GraphQL Voyager** visualiza o schema.
- **jadx / apktool**: descompilar APK pra achar endpoints mobile.
- **ffuf / katana / gau**: descoberta de conteúdo e endpoints (vide [01-recon-discovery.md](/posts/recon-discovery/)).
- **Labs autorizados:** [PortSwigger Web Security Academy — API testing](https://portswigger.net/web-security/api-testing) e [GraphQL](https://portswigger.net/web-security/graphql) (gratuitos e excelentes), [crAPI](https://github.com/OWASP/crAPI) (lab oficial OWASP focado em API), [DVGA](https://github.com/dolevf/Damn-Vulnerable-GraphQL-Application) (GraphQL vulnerável), TryHackMe e HackTheBox.

## Checklist do caçador

- [ ] Mapeei a documentação (`/api/docs`, `/swagger/index.html`, `/swagger.json`, `/openapi.json`, `/api-docs`) e os arquivos JS / o APK.
- [ ] **BOLA:** troquei identificadores (`id`, `cpf`, `idProduto`) em GET/POST/PUT/DELETE, com 2 contas.
- [ ] **Mass Assignment:** mandei campos extras (`role`, `isAdmin`, `price`, `verified`) achados na resposta do GET.
- [ ] **Excessive Data Exposure:** comparei *tela* × *JSON cru*. Campo sensível a mais na resposta?
- [ ] **BFLA:** anotei ações de admin e refiz cada uma com token de perfil comum.
- [ ] **API4/DoS:** testei rate limit em login, reset e endpoints que disparam SMS/e-mail.
- [ ] **API9:** troquei `/v2` por `/v1`/`/v3`, cacei swagger e hosts de staging/beta.
- [ ] **GraphQL:** rodei `{__typename}`, tentei introspection, testei suggestions, aliases/batching, nested query.
- [ ] Conferi que a classe **está no escopo** do programa.

## Pegadinhas / o que NÃO funciona

- **Confiar na tela.** O front esconder um campo ou um botão **não** protege a API. Olhe sempre a resposta crua.
- **Testar só `GET`.** A autorização pode estar só no `GET` e faltar no `PUT`/`DELETE`. Varra todos os métodos.
- **Achar que introspection desligada = GraphQL seguro.** Suggestions + Clairvoyance remontam o schema; aliases burlam rate limit independentemente disso.
- **UUID como "defesa".** ID imprevisível dificulta enumeração, mas **não substitui** checagem de dono (BOLA continua se o ID vazar em outra resposta).
- **Mass assignment "só com campo que existe na tela".** O ponto é justamente mandar o campo que a tela **não** mostra: chute nomes prováveis.

## O que você precisa lembrar

- **A API é a superfície de ataque real**, e devolve mais do que a tela mostra. Olhe o **JSON cru**, sempre.
- **Três dos dez são controle de acesso** (BOLA, BFLA, e o "property level" do API3). É onde está a maior parte do dinheiro.
- **API3 é sobre campos.** Ler campo a mais (excessive data) ou escrever campo a mais (mass assignment): barato de achar, alto impacto.
- **GraphQL tem armadilhas próprias:** introspection, suggestions, aliases/batching (brute force sem disparar rate limit) e nested query (DoS).

> 💡 **Dica de ouro:** em toda resposta de API, faça duas perguntas. *"Esse JSON tem algum campo que a tela não usa?"* (excessive data exposure) e *"o que acontece se eu mandar de volta um campo a mais?"* (mass assignment). Essas duas perguntas, sozinhas, já renderam muito report. E no GraphQL: se você consegue chamar o mesmo campo 100x numa request via alias, o rate limit do alvo provavelmente é cego.

## Nota ética

Tudo aqui é pra **alvos autorizados**: bug bounty dentro do escopo, pentests contratados e labs legais (crAPI, DVGA, PortSwigger Academy). Enumerar IDs, forçar campos ou rodar introspection em sistemas de terceiros sem permissão é crime, e desnecessário, dado o tanto de lab bom pra treinar. Aprenda pra **defender** e reporte com responsabilidade.

## Referências

- [OWASP API Security Top 10 — 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [API3:2023 — Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)
- [API4:2023 — Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [API6:2023 — Unrestricted Access to Sensitive Business Flows](https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/)
- [API9:2023 — Improper Inventory Management](https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/)
- [API10:2023 — Unsafe Consumption of APIs](https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/)
- [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [PortSwigger — API testing](https://portswigger.net/web-security/api-testing)
- [PortSwigger — GraphQL API vulnerabilities](https://portswigger.net/web-security/graphql)
- [OWASP crAPI](https://github.com/OWASP/crAPI) · [Damn Vulnerable GraphQL Application (DVGA)](https://github.com/dolevf/Damn-Vulnerable-GraphQL-Application)

---
*Relacionado na série: [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) · [Account Takeover](/posts/account-takeover/) · [Business Logic](/posts/business-logic/) · [SSRF](/posts/ssrf/) · [Security Misconfiguration](/posts/security-misconfiguration-cve-hunting/) · [Denial of Service](/posts/denial-of-service-aplicacao/) · [Recon & Discovery](/posts/recon-discovery/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)**: o índice da série, do básico ao avançado.*
