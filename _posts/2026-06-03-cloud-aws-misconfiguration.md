---
title: "Cloud & AWS Misconfiguration: S3, IAM, metadata e chaves vazadas"
description: "Como mapear e explorar a superfície de nuvem em bug bounty — buckets S3 públicos, chaves AKIA vazadas, metadata via SSRF (IMDSv1/v2), takeover de recursos cloud e visão geral de escalada IAM — sem nunca exfiltrar dado real."
author: matheus
date: 2026-06-03 23:36:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["cloud security", "AWS", "S3", "IAM", "IMDSv2", "leaked keys", "SSRF", "Cognito", "OWASP", "bug bounty", "web security", "ScoutSuite", "Pacu"]
pin: false
comments: true
---

## A chave que abre o cofre da empresa inteira

Você está fuçando um arquivo JavaScript de `app.exemplo.com` e, no meio do código de build, aparece isso:

```
AKIAIOSFODNN7EXAMPLE   ...   wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Vinte caracteres começando com `AKIA`, seguidos de uma string de 40. Quem nunca viu sabe que é só "mais um texto". Quem mexe com segurança reconhece na hora: **é uma chave de acesso da AWS** — o login programático que um sistema usa pra conversar com a nuvem da empresa. Dependendo das permissões dela, essa string pode listar bancos de dados, ler buckets de backup, criar máquinas... ou, no pior dos mundos, dar **controle total da conta AWS**.

Cloud misconfiguration é uma das fronteiras mais lucrativas do bug bounty moderno porque **quase toda empresa hoje roda na nuvem** (AWS, Google Cloud/GCP, Azure) e a configuração dela é complexa, distribuída e fácil de errar. Este post foca em **AWS** (o provedor mais comum), com paralelos pra GCP e Azure, e cobre as cinco frentes que mais aparecem: **buckets S3**, **chaves/segredos vazados**, **metadata via SSRF**, **takeover de recursos cloud** e uma visão geral de **escalada de privilégio no IAM**.

> ⚠️ **O aviso mais importante do post, logo no começo:** na nuvem, a fronteira entre "provar a falha" e "cometer crime / quebrar o escopo" é fininha. Confirmar que uma chave é válida é OK. **Sair lendo dados, baixando bancos ou criando recursos NÃO é** — vira acesso não autorizado a infraestrutura de terceiros. A gente volta nisso, mas já vá com esse filtro ligado.

## O que é "cloud misconfiguration"?

> 💡 **Cloud (computação em nuvem):** em vez de ter servidores físicos, a empresa aluga recursos (armazenamento, máquinas, banco) de um provedor como AWS/GCP/Azure, configurando tudo por painel/API.

**Cloud misconfiguration** é quando algum desses recursos foi configurado de um jeito inseguro: um armazenamento que ficou público, uma permissão larga demais, uma credencial que vazou. Não é um bug no código da AWS — a AWS funciona como projetado; **quem configurou errou**.

> **Analogia:** a nuvem é um prédio de cofres alugados. A AWS te dá o cofre trancado e seguro por padrão. Misconfiguration é o cliente que deixou a porta do cofre encostada (bucket público), colou a senha num post-it no saguão (chave vazada no JS) ou deu cópia da chave-mestra pro estagiário (IAM permissivo demais). O prédio é seguro; o uso que se fez dele, não.

Isso cai dentro do [OWASP A05:2021 — Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/) (e tem ligação direta com [Security Misconfiguration & CVE Hunting](/posts/security-misconfiguration-cve-hunting/)). Os termos-chave que você vai encontrar o tempo todo:

| Termo | O que é (1 linha) |
|---|---|
| **S3** | Serviço de armazenamento de arquivos da AWS, organizado em "buckets" (pastas/baldes). |
| **IAM** | *Identity and Access Management*: quem (usuários/roles) pode fazer o quê na conta AWS. |
| **IMDS / metadata** | Serviço interno que entrega dados e **credenciais temporárias** pra uma máquina EC2. |
| **EC2** | Máquina virtual (servidor) que você aluga na AWS. |
| **STS** | *Security Token Service*: emite credenciais **temporárias** (prefixo `ASIA`). |

## Por que isso importa (e quanto paga)

O impacto varia de "informativo" a "comprometimento total da empresa":

- **Bucket S3 legível público** → vazamento de backups, documentos internos, PII (dado pessoal: nome, CPF, e-mail) de clientes em massa.
- **Bucket S3 gravável público** → o atacante substitui arquivos servidos pelo site (defacement, [XSS](/posts/xss-html-injection/) armazenado, distribuição de malware).
- **Chave AKIA válida** → acesso programático à conta; o impacto depende das permissões da chave (de "lista um bucket" a "admin da conta").
- **Credenciais via metadata (SSRF→IMDS)** → token temporário da role da máquina; muitas vezes leva a escalada.
- **Takeover de recurso cloud (S3/CloudFront)** → servir conteúdo malicioso sob um subdomínio legítimo (veja [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/)).

Na prática, falhas dessa família costumam pagar de **algumas centenas de reais** (um bucket listável com dado pouco sensível, ou um takeover classificado como informativo) até **dezenas de milhares** (chave com acesso a dados de produção, SSRF→credenciais→pivot interno). O valor segue a regra de sempre: **impacto = sensibilidade do dado × escala × o que dá pra fazer com aquilo**.

Pra falar a língua do triador, leve um **CVSS** junto — o **v3.1** (ainda o mais usado pelos programas) e o **v4.0** ao lado (que separa o impacto no **sistema vulnerável** `VC/VI/VA` do **sistema subsequente** `SC/SI/SA` — útil aqui pra distinguir "vazou só o bucket" de "a credencial roubada compromete a conta toda"). Âncoras dos cenários mais comuns:

| Cenário | CVSS v3.1 | CVSS v4.0 |
|---|---|---|
| **Bucket S3 legível público** (vaza dados) | **7.5 — Alto**<br>`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` | **8.7 — Alto**<br>`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` |
| **Bucket S3 gravável público** (sobrescreve arquivos) | **9.1 — Crítico**<br>`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` | **9.3 — Crítico**<br>`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N` |
| **Chave AKIA válida exposta** (confidencialidade da credencial) | **7.5 — Alto**<br>`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` | **8.7 — Alto**<br>`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` |
| **SSRF→IMDS rouba credencial IAM** (base do SSRF autenticado) | **8.5 — Alto**<br>`AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N` | **8.3 — Alto**<br>`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:H/SI:N/SA:N` |

> 💡 O score-**base** trava a maioria desses cenários em **Alto**; é o **chaining** (a credencial roubada vira *takeover* da conta AWS, o bucket gravável vira [XSS armazenado](/posts/xss-html-injection/)) que empurra o risco real pro topo do **Crítico**. Reporte a base honesta e descreva o impacto encadeado em texto — **não infle o número**. Decimais conferidos na [calculadora FIRST v3.1](https://www.first.org/cvss/calculator/3.1) / [v4.0](https://www.first.org/cvss/calculator/4.0) (a escala do v4.0 não é linear; sempre rode o vetor). Ajuste `PR` (`N` se o recurso for **público/não autenticado**) conforme o alvo.

> ⚠️ **Escopo cloud é traiçoeiro.** Muitos programas dizem explicitamente: "ativos AWS são *nossos*, mas a conta AWS em si está fora de escopo — só reporte a *exposição*". Ou seja: **achar e confirmar** a chave entra; **usar a chave pra navegar na conta** sai. Leia as regras antes.

## Como funciona por trás (o modelo mental da AWS)

Três peças que você precisa entender pra não se perder:

**1. Tudo é uma API.** O painel bonitinho da AWS é só uma casca; por baixo, tudo é uma chamada HTTP assinada. A ferramenta `aws` (a **AWS CLI**) faz essas chamadas pra você.

> 💡 **AWS CLI:** a ferramenta de linha de comando oficial da AWS (`aws <serviço> <ação>`). É como você fala com a nuvem fora do painel. [Saiba mais](https://docs.aws.amazon.com/cli/latest/reference/).

**2. Credenciais.** Pra chamar a API autenticado, você precisa de uma **Access Key** (par de duas strings):

| Prefixo | Tipo | Estrutura |
|---|---|---|
| **AKIA…** | Longo prazo (de um usuário IAM) — não expira até alguém revogar | `AccessKeyId` (20 chars) + `SecretAccessKey` (40 chars) |
| **ASIA…** | **Temporário** (emitido pelo STS) — expira em minutos/horas | `AccessKeyId` + `SecretAccessKey` + `SessionToken` |

É por isso que `AKIA…` num arquivo público é tão perigoso: é uma senha permanente. Já `ASIA…` é uma senha que se autodestrói — ainda útil, mas com prazo. (Confirmado na [AWS — Managing access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html) e no [Hacking the Cloud — Using Stolen IAM Credentials](https://hackingthe.cloud/aws/general-knowledge/using_stolen_iam_credentials/).)

**3. Roles e o IMDS.** Uma máquina EC2 raramente carrega uma chave `AKIA` no disco. Em vez disso, ela "veste" uma **role** (papel) e pega credenciais **temporárias** (`ASIA…`) de um serviço interno chamado **IMDS** (*Instance Metadata Service*), acessível só de dentro da máquina, no IP mágico `169.254.169.254`. Guarde esse IP — ele é o coração da seção de SSRF.

## Tipos e variações da superfície cloud

1. **S3 público** — bucket listável, legível e/ou **gravável** por qualquer um.
2. **Chave/segredo vazado** — `AKIA…` ou outro segredo em JS, repositório Git, APK ou resposta de API.
3. **Metadata via SSRF** — uma falha de [SSRF](/posts/ssrf/) na aplicação que alcança o `169.254.169.254` e rouba as credenciais da role.
4. **Takeover de recurso cloud** — DNS apontando pra um bucket S3 / distribuição CloudFront que não existe mais.
5. **Outros** — snapshots EBS públicos, funções Lambda / API Gateway expostas, **Cognito** com atributo auto-editável, e **escalada de privilégio no IAM**.

## 1. S3 buckets: achar, enumerar e testar permissões

> 💡 **Bucket S3:** um "balde" de armazenamento na AWS, identificado por um nome global único. Acessível por URL tipo `https://NOME.s3.amazonaws.com` ou `https://s3.amazonaws.com/NOME`.

### 1.1 Achar buckets

Buckets ligados ao alvo costumam aparecer com nomes previsíveis: `alvo`, `alvo-assets`, `alvo-backups`, `alvo-prod`, `alvo-staging`, `alvo-dev`, `alvo-uploads`. Onde olhar:

- **No HTML/JS e nas respostas da app** — URLs `*.s3.amazonaws.com`, `s3.<região>.amazonaws.com/<bucket>` ou `*.cloudfront.net` apontando pra origem S3. (Use as ferramentas de recon do post [Recon & Discovery](/posts/recon-discovery/): `gau`, `katana`, `httpx`.)
- **Google dorks:**

```text
site:s3.amazonaws.com alvo
site:amazonaws.com inurl:alvo
```

- **Geração + força bruta de nomes** com ferramentas específicas (`s3scanner`, abaixo).

### 1.2 As três permissões que importam

Quando você acha um bucket, teste — **na ordem do menos pro mais grave**:

| Permissão | O que significa | Gravidade |
|---|---|---|
| **List** | Dá pra listar os arquivos do bucket | Média (revela o que existe) |
| **Read** | Dá pra **baixar** os arquivos | Alta (vaza dados) |
| **Write** | Dá pra **subir/sobrescrever** arquivos | Crítica (defacement, malware, XSS) |

### 1.3 Testando com a AWS CLI

A flag mágica aqui é `--no-sign-request`: ela diz pra CLI **não assinar** a requisição, ou seja, fazer o pedido como um anônimo (sem credencial). É exatamente assim que você testa o que está exposto ao mundo. (Confirmado no [Hacking the Cloud / S3Scanner docs](https://github.com/sa7mon/S3Scanner).)

> 💡 **`--no-sign-request`:** faz a AWS CLI pedir como usuário anônimo (sem credencial). Se funcionar, qualquer pessoa na internet consegue o mesmo.

```bash
# LIST — o bucket deixa listar o conteúdo anonimamente?
aws s3 ls s3://alvo-backups --no-sign-request
# Se listar arquivos => List público (em vez de "AccessDenied")
```

```bash
# READ — dá pra baixar um arquivo específico?
aws s3 cp s3://alvo-backups/listing.txt ./prova.txt --no-sign-request
# (no bug bounty: baixe só 1 arquivo INÓCUO de prova, ex.: um index.html — nunca os dados reais)
```

```bash
# WRITE — dá pra subir um arquivo? (o achado mais grave)
echo "poc-autorizada" > poc.txt
aws s3 cp poc.txt s3://alvo-uploads/poc-$(date +%s).txt --no-sign-request
# Se subir => Write público. Apague depois e documente.
```

> ⚠️ **No teste de Write, suba um arquivo neutro e único** (ex.: `poc-<timestamp>.txt` com um texto inofensivo), tire o print, e **apague**. Nunca sobrescreva arquivos legítimos do alvo — isso é destruir/adulterar dado, não "provar bug".

### 1.4 ACL mal configurada (a causa raiz)

> 💡 **ACL (Access Control List):** lista de permissões granulares de um bucket/objeto S3 ("quem pode ler/escrever").

O erro clássico é dar permissão pro **grupo `AllUsers`** (literalmente "qualquer pessoa na internet") ou pro **`AuthenticatedUsers`** (qualquer pessoa com **uma conta AWS** — note: **não** "seus usuários", e sim *qualquer um dos milhões de clientes da AWS*, o que efetivamente é público). Dá pra ler a ACL anonimamente quando o bucket permite:

```bash
aws s3api get-bucket-acl --bucket alvo-backups --no-sign-request
```

Se aparecer um *Grantee* do tipo `Group` com a URI `http://acs.amazonaws.com/groups/global/AllUsers` e permissão `READ`/`WRITE`/`FULL_CONTROL`, você confirmou a misconfiguration na fonte.

### 1.5 Ferramenta: s3scanner

[**s3scanner**](https://github.com/sa7mon/S3Scanner) varre buckets (e equivalentes em outros provedores) e classifica as permissões automaticamente — sem precisar testar uma a uma na mão.

```bash
# Checar um bucket específico (só permissões, comportamento padrão)
s3scanner -bucket alvo-backups

# Vários nomes de uma lista
s3scanner -bucket-file possiveis-buckets.txt

# -enumerate lista os OBJETOS dos buckets abertos (use com cautela e dentro do escopo)
s3scanner -bucket alvo-backups -enumerate
```

> 💡 **Sintaxe:** a versão atual do s3scanner (reescrita em Go) usa flags de traço único (`-bucket`, `-bucket-file`, `-enumerate`, `-provider`). A versão antiga em Python usava `scan`/`dump` como subcomandos — se você encontrar exemplos com `scan --bucket`, são daquele tempo.

> 💡 **Paralelo GCP/Azure:** o equivalente do S3 é o **Google Cloud Storage** (`storage.googleapis.com/<bucket>`) e o **Azure Blob Storage** (`<conta>.blob.core.windows.net/<container>`). A lógica de "container público" é a mesma; o `s3scanner` suporta vários provedores.

## 2. Chaves e segredos vazados

### 2.1 Onde as chaves aparecem

- **Arquivos JS** servidos pelo front (variáveis de build esquecidas).
- **Repositórios Git** públicos/expostos (`.git/` acessível, histórico de commits).
- **Apps mobile (APK/IPA)** — descompile com `jadx` e vasculhe strings (veja [Mobile Bug Bounty](/posts/mobile-bug-bounty/)).
- **Respostas de API**, mensagens de erro, arquivos de config esquecidos (`.env`, `taskDefinition.json`, `wp-config.php.save`).

### 2.2 Achando com trufflehog

> 💡 **trufflehog:** ferramenta que vasculha código/repos/arquivos por segredos (chaves, tokens) e, pra muitos tipos, **verifica se ainda estão ativos**.

```bash
# Varrer um repositório Git inteiro (incluindo histórico)
trufflehog git https://github.com/exemplo/repo --only-verified

# Varrer um diretório local (ex.: APK descompilado, dump de JS)
trufflehog filesystem ./app-descompilado --only-verified
```

A flag `--only-verified` faz o trufflehog **só mostrar segredos confirmados como vivos** — economiza horas filtrando falso-positivo.

### 2.3 Validando uma chave AWS (o jeito certo e ético)

Achou um par `AKIA…` + secret. **Confirmar identidade ≠ acessar dados.** A maneira correta e mínima de provar que a chave é válida é a chamada `sts:GetCallerIdentity` — ela **não toca em nenhum dado**, só responde "quem é o dono dessa credencial". Detalhe que ajuda: segundo a [doc da AWS](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html), **nenhuma permissão é exigida** pra essa chamada (funciona até se a identidade tiver um *deny* explícito), então ela sempre devolve quem é o dono de uma chave válida sem você precisar adivinhar permissões. (Confirmado também no [Hacking the Cloud](https://hackingthe.cloud/aws/general-knowledge/using_stolen_iam_credentials/) e na referência [KeyHacks](https://github.com/streaak/keyhacks).)

```bash
# Configure as credenciais SÓ no ambiente (não suje seu ~/.aws com chave de terceiro)
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=us-east-1

# A ÚNICA chamada que você precisa pra provar que vale:
aws sts get-caller-identity
```

Resposta de uma chave válida:

```json
{
    "UserId": "AIDAEXAMPLEEXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/build-deploy"
}
```

O `Arn` já conta uma história: `user/build-deploy` é um usuário de pipeline — provavelmente com permissões largas. **Pare aqui.** Você tem tudo pra um report: a chave é válida, pertence à conta `123456789012` e ao usuário `build-deploy`.

> ⚠️ **`get-caller-identity` é a linha que você NÃO cruza pra dentro.** Qualquer comando além disso (`s3 ls`, `iam list-users`, etc.) usando a chave de terceiro é acesso não autorizado e gera log no **CloudTrail** (a auditoria da AWS) com o seu IP. Não vale a pena, não é ético, e não acrescenta nada ao report.

> 💡 **KeyHacks:** repositório que mostra como **validar** dezenas de tipos de chave/token vazados (não só AWS — Slack, Stripe, GitHub, etc.). [streaak/keyhacks](https://github.com/streaak/keyhacks).

### 2.4 Nem todo "segredo" é segredo

Cuidado pra não reportar lixo: muita coisa que *parece* chave é **pública por design** e não vale nada — `pk_live_…` do Stripe (publishable key), `VUE_APP_*` / `REACT_APP_*` (variáveis de build expostas de propósito), sitekey do reCAPTCHA, client IDs de SDK. O que importa é distinguir isso de um segredo **realmente sensível** (`AKIA…`, `sk_live_…`, *personal access token*, JWT de serviço). Na dúvida, valide com o KeyHacks antes de escrever o report — senão vira duplicado ou "informativo".

## 3. Metadata e IMDS via SSRF (a joia da coroa)

Aqui é onde uma falha "comum" de aplicação vira comprometimento de infra. Se você ainda não leu, o pré-requisito é [SSRF: fazendo o servidor bater na porta de dentro](/posts/ssrf/).

> 💡 **SSRF (Server-Side Request Forgery):** você engana o servidor pra ele fazer uma requisição que **você** escolhe — inclusive pra endereços internos que você não alcançaria de fora.

### 3.1 Por que o `169.254.169.254` é ouro

Toda EC2 tem acesso, de dentro, a um serviço web em `http://169.254.169.254/` — o **IMDS**. Ele entrega dados da máquina e, crucialmente, as **credenciais temporárias** (`ASIA…`) da role que a máquina veste. Se você tem um SSRF que alcança esse IP, você consegue **as credenciais da aplicação**.

### 3.2 IMDSv1 — o jeito antigo e vulnerável

> 💡 **IMDSv1:** versão original do metadata, que responde a um **GET simples**, sem autenticação nenhuma. É justamente o que faz SSRF ser tão devastador nela.

O caminho até as credenciais:

```http
GET /latest/meta-data/iam/security-credentials/ HTTP/1.1
Host: 169.254.169.254
```

Isso devolve o **nome da role** (ex.: `ec2-app-role`). Aí você pede as credenciais dela:

```http
GET /latest/meta-data/iam/security-credentials/ec2-app-role HTTP/1.1
Host: 169.254.169.254
```

Resposta (estrutura confirmada na [doc oficial de IAM roles for EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html#instance-metadata-security-credentials)):

```json
{
  "Code": "Success",
  "AccessKeyId": "ASIA...EXAMPLE",
  "SecretAccessKey": "...EXAMPLE...",
  "Token": "IQoJb3JpZ2lu...EXAMPLE...",
  "Expiration": "2026-05-31T18:00:00Z"
}
```

Note o `ASIA` e o `Token` (= `SessionToken`): são credenciais temporárias. No bug bounty, mostrar que você **conseguiu obtê-las via SSRF** já é a prova — não saia usando.

Quando o SSRF é num cabeçalho `Host`/URL controlada, a requisição da aplicação fica tipo:

```http
GET /api/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ HTTP/2
Host: app.exemplo.com
Authorization: Bearer <seu_token>
```

### 3.3 IMDSv2 — por que ele mata o ataque

> 💡 **IMDSv2:** versão "session-oriented": antes de ler qualquer coisa, você faz um **PUT** pra pegar um token e depois manda esse token num header em cada GET.

O fluxo correto (confirmado na [doc oficial do IMDS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)):

```bash
# Passo 1 — PUT pra obter o token de sessão (TTL máx. 6h = 21600s)
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`

# Passo 2 — usar o token no header de CADA GET
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

Três detalhes técnicos explicam por que isso **derruba a maioria dos SSRF** (todos da doc oficial AWS):

1. **Exige um PUT primeiro.** A maioria dos SSRF só consegue disparar `GET` — não dá pra fazer o PUT inicial.
2. **Exige um header customizado** (`X-aws-ec2-metadata-token`) no GET seguinte. Muitos SSRF não deixam você setar headers arbitrários na requisição forjada.
3. **Hop limit = 1 por padrão.** A resposta do PUT tem TTL de rede `1` no nível do IP — ela não "atravessa" um proxy reverso ou container intermediário. Além disso, **PUTs com header `X-Forwarded-For` são rejeitados**, fechando a porta pros SSRF que passam por proxies.

Por isso a defesa #1 é **exigir IMDSv2** (`HttpTokens: required`). Em alvos modernos você vai bater no IMDSv2; reporte a falha de SSRF em si e teste se a metadata ainda é alcançável — às vezes a instância ainda aceita v1 por compatibilidade.

> 💡 **Paralelo GCP/Azure:** o conceito de metadata interno é o mesmo. No GCP/Azure o endpoint é `http://169.254.169.254/` ou `http://metadata.google.internal/` e **exige o header `Metadata-Flavor: Google`** (GCP) / `Metadata: true` (Azure) — um detalhe que, como o token do IMDSv2, bloqueia SSRF que não setam headers.

## 4. Takeover de recurso cloud (S3/CloudFront)

Esse é primo direto do [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/), então vou resumir aqui e mandar você pra lá pra fundo.

> 💡 **Subdomain takeover:** quando um DNS (ex.: `staging-assets.alvo.com`) aponta pra um recurso cloud que **não existe mais** — e você recria esse recurso, passando a controlar o que é servido naquele subdomínio.

O caso clássico em S3: `staging-assets.alvo.com` é um CNAME pra um bucket que foi deletado. Ao acessar, a AWS responde com um XML de erro `NoSuchBucket` ("The specified bucket does not exist"). Esse erro é a **assinatura** do takeover possível: você cria um bucket S3 com **exatamente aquele nome**, sobe um `test.html` inofensivo, e ele passa a ser servido pelo subdomínio legítimo do alvo. Daí dá pra fazer phishing, defacement ou [XSS](/posts/xss-html-injection/) "de subdomínio". Com **CloudFront**, a lógica é parecida (distribuição/origem órfã).

> ⚠️ **PoC mínima e ética:** suba **só** uma página estática neutra (ex.: o texto "PoC autorizada") pra comprovar o controle. Nada de coletar credenciais de visitantes ou hospedar conteúdo malicioso real. E saiba: alguns programas classificam takeover de staging como **informativo** — confira o escopo.

## 5. Outros vetores (visão geral)

### Snapshots EBS públicos

> 💡 **EBS:** os "discos" (volumes) das máquinas EC2. Um **snapshot** é uma foto do disco — que pode acidentalmente ser marcada como **pública**.

Snapshots públicos podem conter o disco inteiro de um servidor (código, configs, credenciais). Com uma chave válida da conta, dá pra listar os públicos:

```bash
aws ec2 describe-snapshots --restorable-by-user-ids all --region us-east-1 \
  --filters "Name=description,Values=*alvo*"
```

(A flag certa é **`--restorable-by-user-ids all`**: lista os snapshots que **qualquer** conta pode restaurar, ou seja, os **públicos**. Cuidado: `--owner-ids` só aceita IDs de conta, `self` ou `amazon` — **não** existe `--owner-ids all`; pra restringir a um dono específico, some `--owner-ids <ID-da-conta>`. Confirmado na [doc da CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-snapshots.html) e no [Hacking the Cloud](https://hackingthe.cloud/aws/enumeration/loot_public_ebs_snapshots/).) Em bug bounty: confirme a existência/exposição; **não** monte o disco pra ler dado real de produção.

### Lambda / API Gateway expostos

> 💡 **Lambda:** funções que rodam "sem servidor" (você sobe só o código). **API Gateway:** o front que expõe essas funções como endpoints HTTP.

Endpoints `*.execute-api.<região>.amazonaws.com` ou URLs de função Lambda às vezes ficam abertos sem autenticação, ou refletem parâmetros de forma insegura — caçáveis com a metodologia de [API Security](/posts/api-security/): enumerar stages (`/dev`, `/prod`), métodos, e testar autorização.

### Cognito mal configurado (atributo de usuário auto-editável)

> 💡 **Amazon Cognito:** o serviço de "login pronto" da AWS — gerencia cadastro, autenticação e atributos (e-mail, telefone, nome) dos usuários da aplicação. Quando o front fala direto com o Cognito, o navegador carrega um **access token** do usuário logado.

O erro clássico aqui é a app deixar o usuário **editar atributos sensíveis dele mesmo** direto na API do Cognito, sem validação no backend. A ação `cognito-idp update-user-attributes` exige **só o access token do próprio usuário** (escopo `aws.cognito.signin.user.admin`) — então, se você consegue esse token (ele costuma estar no `localStorage`/numa request da app), dá pra trocar o seu e-mail por **um endereço que já pertence a outra conta**, ou setar um valor arbitrário:

```bash
# Pega o access-token do usuário logado (no DevTools: localStorage / request da app)
# e troca o atributo de e-mail. NÃO precisa de chave AKIA — é o token do próprio usuário.
aws cognito-idp update-user-attributes \
  --region us-east-1 \
  --access-token <ACCESS_TOKEN_DA_SUA_CONTA> \
  --user-attributes 'Name=email,Value=email-ja-existente@exemplo.com'
```

> 💡 **`--no-verify-ssl`:** em alvos atrás de proxy de inspeção (Burp), você verá esse flag em PoCs pra ignorar erro de certificado. **Não** é parte da falha — é só pra a CLI conversar pelo proxy. Em uso normal, omita.

Dois impactos reais já vistos nesse padrão (anonimizados):

1. **DoS / sequestro de conta:** ao apontar seu e-mail pro endereço da vítima, você "ocupa" aquele e-mail na base do Cognito. A vítima deixa de receber e-mail de **reset de senha**/verificação (a entrega quebra ou vai pra conta errada), inutilizando a recuperação dela. Segundo a [doc da AWS](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html), trocar o e-mail por `update-user-attributes` marca `email_verified` como **não verificado** e dispara um código — mas o **estrago no cadastro já aconteceu**.
2. **MFA / login confusion:** com dois cadastros colidindo no mesmo e-mail, o fluxo de MFA e de login fica ambíguo.

Pontuação típica: **Médio a Crítico** conforme o que dá pra fazer — DoS de conta isolado tende a **Médio**; quando vira sequestro efetivo (a vítima perde acesso e você assume), sobe. Use o `UI:N`/`PR:L` (você precisa de uma conta logada): algo como **CVSS v3.1 `6.5` / Médio** (`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`) pro caso de DoS por alteração de atributo, calibrando pra cima se demonstrar takeover. (Comportamento confirmado na [doc do Cognito — UpdateUserAttributes](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html) e na [doc de atributos de usuário](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html); cruza com [Account Takeover](/posts/account-takeover/).)

> ⚠️ **Linha ética:** prove com **suas próprias contas de teste** (Conta A e Conta B que você criou). Nunca aponte um atributo pro e-mail real de um terceiro — isso indisponibiliza a conta de uma pessoa real.

### Escalada de privilégio no IAM (visão geral)

Quando você (legitimamente, num pentest/lab) tem credenciais de baixo privilégio, certas combinações de permissões IAM permitem **virar admin**. Exemplos clássicos: `iam:CreatePolicyVersion` (criar uma nova versão de policy dando tudo a si mesmo), `iam:PassRole` + `lambda:CreateFunction` (rodar código vestindo uma role mais poderosa), `iam:CreateAccessKey` em outro usuário. São dezenas de caminhos — o [Pacu](https://github.com/RhinoSecurityLabs/pacu) tem módulos que mapeiam isso automaticamente, e a [Rhino Security Labs documentou 21 métodos de privesc no IAM](https://rhinosecuritylabs.com/aws/aws-privilege-escalation-methods-mitigation/). Em bug bounty isso quase sempre está **fora de escopo** (é "usar a conta") — relevante mais pra entender o impacto e pra pentest contratado.

## Caso real-fictício: chave AKIA no JS → report

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você está testando `app.exemplo.com`. No recon, baixa os arquivos JS e roda o trufflehog:

```bash
echo "https://app.exemplo.com" | gau | grep '\.js$' | sort -u > js.txt
# baixa os JS pra uma pasta e:
trufflehog filesystem ./js-baixados --only-verified
```

**Passo 1 — Achado.** O trufflehog reporta um `AWS` verificado dentro de `main.a1b2c3.js`:

```
✅ Found verified result 🐷🔑
Detector Type: AWS
Decoder Type: PLAIN
Raw result: AKIAIOSFODNN7EXAMPLE
File: ./js-baixados/main.a1b2c3.js
```

**Passo 2 — Confirmar identidade (e SÓ isso).**

```bash
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=<secret_encontrado_no_mesmo_arquivo>
export AWS_DEFAULT_REGION=us-east-1
aws sts get-caller-identity
```

```json
{
  "UserId": "AIDAEXAMPLEEXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/frontend-deploy"
}
```

Chave **válida**, conta `123456789012`, usuário `frontend-deploy`. **Você para aqui** — não lista buckets, não toca em nada.

**O que a tela mostraria:** o DevTools/editor com a linha do `main.a1b2c3.js` contendo o `AKIA…` destacada, e o terminal com o JSON do `get-caller-identity` provando que a credencial é ativa (com o `SecretAccessKey` borrado no print).

**Passo 3 — Report.** Título `[Sensitive Data Exposure] Chave de acesso AWS (AKIA) válida exposta em main.*.js`. Resumo focado no risco: *"qualquer pessoa consegue uma credencial programática ativa da conta AWS 123456789012; o impacto depende das permissões da chave, mas chaves de pipeline costumam ter acesso amplo a S3/ECR/deploy"*. Inclua: o arquivo, a chave parcialmente mascarada (`AKIAIOSF…MPLE`), e o output do `get-caller-identity` **sem** o secret. Recomende rotação imediata. Severidade: **Alta a Crítica** conforme as permissões.

CVSS (chave válida, exposta publicamente, **antes** de demonstrar o que ela faz — ou seja, confidencialidade da própria credencial):
- **CVSS v3.1:** `7.5 — Alto` · `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` (rede, sem autenticação, sem interação; vaza um segredo de alto valor).
- **CVSS v4.0:** `8.7 — Alto` · `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`.

Se você **comprovar** (em escopo) que a chave tem permissões de escrita/admin, o score sobe pra **Crítico** porque entram integridade e disponibilidade — pontue o que **provou**, não o teórico, e descreva o pior caso em texto. Os decimais foram conferidos na [calculadora oficial do FIRST](https://www.first.org/cvss/calculator/3.1) ([v4.0 aqui](https://www.first.org/cvss/calculator/4.0)). (Como estruturar: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/) e [Severidade & Triagem](/posts/severidade-impacto-triagem/).)

## Defesa em camadas

A correção real é na configuração da nuvem, e em camadas que se reforçam.

**1. S3 — Block Public Access (a trava mestra):**
Ative as **quatro** opções do [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), de preferência no **nível da conta inteira** (não só por bucket):

| Setting | O que faz |
|---|---|
| `BlockPublicAcls` | Rejeita tentativas de aplicar ACL pública |
| `IgnorePublicAcls` | **Ignora** qualquer ACL pública já existente |
| `BlockPublicPolicy` | Rejeita bucket policy que permita acesso público |
| `RestrictPublicBuckets` | Limita buckets públicos só ao dono e a serviços AWS |

```bash
aws s3api put-public-access-block --bucket alvo-backups \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

**2. IAM — privilégio mínimo (*least privilege*):** cada usuário/role recebe **só** as permissões que precisa, nada de `*:*`. Use roles temporárias em vez de chaves `AKIA` de longo prazo sempre que der.

**3. IMDSv2 obrigatório:** force `HttpTokens: required` em toda EC2 (mata a maioria dos SSRF→metadata):

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-0123456789abcdef0 \
  --http-tokens required --http-endpoint enabled --http-put-response-hop-limit 1
```

**4. Segredos — nunca no código:** use **AWS Secrets Manager** / **Parameter Store**; injete via variável de ambiente em runtime; **rotacione** credenciais periodicamente; e bote um **secret scanner no CI** (trufflehog, gitleaks) pra barrar commit de chave. Se vazou, **rotacione já** — assuma que está comprometida.

**5. Auditoria contínua:** rode **ScoutSuite** / **Prowler** pra mapear misconfig na sua própria conta, ligue o **CloudTrail** (auditoria) e alerte em chamadas anômalas (ex.: `GetCallerIdentity` de uma identidade que nunca fez isso).

> ❌ **O que NÃO basta:** tornar o nome do bucket "difícil de adivinhar" (segurança por obscuridade), confiar só na ACL por objeto sem o Block Public Access, deixar IMDSv1 ligado "por compatibilidade" sem revisar, ou guardar segredo em `.env` commitado no repositório.

## Ferramentas + labs legais

- **[AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/)** — a base de tudo (`s3`, `sts`, `ec2`, `iam`).
- **[s3scanner](https://github.com/sa7mon/S3Scanner)** — enumerar/classificar buckets (multi-provedor).
- **[trufflehog](https://github.com/trufflesecurity/trufflehog)** — achar e **verificar** segredos em repos/arquivos/APKs.
- **[KeyHacks](https://github.com/streaak/keyhacks)** — validar chaves/tokens de dezenas de serviços.
- **[ScoutSuite](https://github.com/nccgroup/ScoutSuite)** — auditoria de postura (AWS/GCP/Azure), gera relatório do que está exposto.
- **[Pacu](https://github.com/RhinoSecurityLabs/pacu)** — framework de exploração AWS (pós-acesso; **só em ambiente autorizado/seu**).
- **Labs autorizados:** [flaws.cloud](http://flaws.cloud/) e [flaws2.cloud](http://flaws2.cloud/) (o clássico pra treinar S3/IAM/metadata legalmente), [CloudGoat](https://github.com/RhinoSecurityLabs/cloudgoat) (cenários vulneráveis "de propósito" da Rhino), [AWS free tier](https://aws.amazon.com/free/) (sua própria conta de testes).

## Checklist do caçador

- [ ] Mapeei nomes de bucket prováveis (`alvo-backups`, `-assets`, `-prod`, `-dev`, `-uploads`) e os achei no JS/respostas.
- [ ] Testei **List / Read / Write** com `--no-sign-request` (e li a ACL com `get-bucket-acl`).
- [ ] No Write, subi só PoC neutra e **apaguei** depois.
- [ ] Rodei `trufflehog --only-verified` em JS, repos e APKs.
- [ ] Distingui segredo real (`AKIA`, `sk_live_`) de chave pública (`pk_live_`, `VUE_APP_*`).
- [ ] Validei chave AWS **só** com `aws sts get-caller-identity` — **nada além disso**.
- [ ] Em falha de SSRF, testei alcançar `169.254.169.254` e a metadata (IMDSv1 vs v2).
- [ ] Procurei DNS apontando pra bucket/CloudFront órfão (`NoSuchBucket`) — takeover.
- [ ] Se a app usa **Cognito**, testei editar atributo sensível (e-mail) com o **meu** access token (`update-user-attributes`) — só com contas de teste minhas.
- [ ] Conferi que o ativo cloud **está no escopo** e que a ação que fiz não cruzou a linha "usar a conta".

## Pegadinhas / o que NÃO funciona

- **"Achei AKIA, vou listar tudo pra mostrar impacto."** Não. `get-caller-identity` já prova. O resto é acesso não autorizado + log no CloudTrail com seu IP.
- **`pk_live_…` / `VUE_APP_*` não são bug.** São públicas por design. Reportar isso vira "informativo"/duplicado.
- **IMDSv2 ligado ≠ SSRF inútil.** O SSRF ainda pode atingir outros alvos internos; só não pega a metadata facilmente. Reporte o SSRF mesmo assim.
- **Bucket com nome aleatório não é "seguro".** Obscuridade não é controle; se a permissão está pública, alguém acha.
- **Takeover de staging pode ser informativo.** Cheque o escopo antes de comemorar.

## O que você precisa lembrar

- A nuvem é segura por padrão; o que vaza é **configuração** — bucket público, chave esquecida, permissão larga.
- **Confirmar ≠ acessar.** Em chave AWS, a linha que você não cruza é `aws sts get-caller-identity`.
- O impacto segue **sensibilidade do dado × escala × o que dá pra fazer** — um SSRF→IMDS pode valer dez buckets listáveis.

> 💡 **Dica de ouro:** no recon, todo `AKIA…` (20 chars) é uma parada obrigatória, e todo SSRF deve **sempre** apontar pra `169.254.169.254/latest/meta-data/iam/security-credentials/`. Esses dois reflexos — reconhecer a chave e mirar a metadata — separam quem "achou um info" de quem **transforma uma falha de app em comprometimento de infra** (e reporta com responsabilidade).

## Nota ética

Cloud é o terreno onde "passar do ponto" deixa de ser deselegante e vira **crime / quebra de contrato**. As regras são simples e inegociáveis: só ative-se em **ativos no escopo**; **confirme** a falha com o mínimo necessário (uma página de PoC, um `get-caller-identity`, um arquivo neutro) e **pare**; **nunca exfiltre dado real**, nunca apague/sobrescreva nada legítimo, nunca pivote pra dentro da conta de terceiro. Tudo que for "explorar de verdade" (Pacu, listar recursos, montar snapshot) faça **só na sua conta ou em labs legais** como flaws.cloud e CloudGoat. Reportar bem e parar na hora certa é o que separa pesquisador de invasor.

## Referências

- [OWASP A05:2021 — Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [AWS — Use the Instance Metadata Service (IMDSv1/IMDSv2)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [AWS — IAM roles for EC2 / instance metadata credentials](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)
- [AWS — S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS — Managing access keys (AKIA)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [AWS — STS GetCallerIdentity (sem permissão exigida)](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html)
- [AWS — describe-snapshots (`--restorable-by-user-ids all` p/ snapshots públicos)](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-snapshots.html)
- [AWS — Cognito UpdateUserAttributes (access token do próprio usuário)](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html)
- [Hacking the Cloud — Using Stolen IAM Credentials](https://hackingthe.cloud/aws/general-knowledge/using_stolen_iam_credentials/) e [Loot Public EBS Snapshots](https://hackingthe.cloud/aws/enumeration/loot_public_ebs_snapshots/)
- [HackTricks Cloud — AWS Security](https://cloud.hacktricks.wiki/en/pentesting-cloud/aws-security/index.html)
- [streaak/keyhacks](https://github.com/streaak/keyhacks) · [sa7mon/S3Scanner](https://github.com/sa7mon/S3Scanner) · [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) · [nccgroup/ScoutSuite](https://github.com/nccgroup/ScoutSuite) · [RhinoSecurityLabs/pacu](https://github.com/RhinoSecurityLabs/pacu)
- [Rhino Security Labs — AWS IAM Privilege Escalation (21 métodos)](https://rhinosecuritylabs.com/aws/aws-privilege-escalation-methods-mitigation/)
- Labs: [flaws.cloud](http://flaws.cloud/) · [flaws2.cloud](http://flaws2.cloud/) · [CloudGoat](https://github.com/RhinoSecurityLabs/cloudgoat)

---
*Relacionado na série: [SSRF](/posts/ssrf/) · [Subdomain Takeover & Broken Link Hijacking](/posts/subdomain-takeover-broken-link-hijacking/) · [Security Misconfiguration & CVE Hunting](/posts/security-misconfiguration-cve-hunting/) · [API Security](/posts/api-security/) · [Mobile Bug Bounty](/posts/mobile-bug-bounty/) · [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*
