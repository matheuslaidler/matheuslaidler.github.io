---
title: "Subdomain Takeover e Broken Link Hijacking: herdando o que ficou pra trás"
description: "Como achar DNS 'dangling' apontando pra recursos abandonados (S3, GitHub Pages, Heroku, Azure) e links/handles quebrados — confirmar com dig, fingerprintar com nuclei/subjack e provar o takeover com uma página inofensiva."
author: matheus
date: 2026-05-08 09:49:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["subdomain takeover", "broken link hijacking", "dangling DNS", "CNAME", "DNS", "recon", "bug bounty", "web security", "nuclei", "subjack"]
image: /assets/img/covers/subdomain-takeover-broken-link-hijacking.png
pin: false
comments: true
---

## A casa que você não trancou (mas alguém ainda tem a chave)

Imagina que sua empresa contratou um serviço de hospedagem três anos atrás, criou um subdomínio `promo.alvo.com` apontando pra lá, rodou uma campanha, e depois **cancelou o serviço** — mas esqueceu de apagar a placa que dizia "a entrega da `promo.alvo.com` é naquele endereço". A loja fechou, o ponto está vago. Aí chega você: aluga **aquele mesmo endereço vago**, pendura sua própria placa, e agora **tudo que o carteiro entregaria pra `promo.alvo.com` cai na sua mão**. Você não invadiu nada — só ocupou um espaço que a empresa deixou reservado e abandonou.

Isso é **Subdomain Takeover**: um registro de DNS "pendurado" (*dangling*) que aponta pra um recurso de terceiro que **ninguém reivindicou de volta**. E tem um primo mais simples, o **Broken Link Hijacking**: a empresa **linka** na própria página um recurso externo (um perfil de rede social, um domínio de parceiro) que **expirou ou foi apagado** — e você registra esse recurso pra falar em nome dela.

Os dois exploram a mesma falha humana: **alguém criou uma referência pra um recurso externo e nunca a removeu quando o recurso morreu.** Neste post a gente vai do "o que é DNS dangling" até provar um takeover de verdade com uma PoC segura, passando por recon, fingerprinting e defesa. Sem saltos.

> 💡 **PoC** (*Proof of Concept*): a prova mínima de que a falha existe — aqui, servir uma página inofensiva sob o domínio da vítima. Detalhe no [Glossário](/posts/fundamentos-web-hacking/).

## O que é (e a diferença entre os dois)

Antes de tudo, dois conceitos de DNS que você **precisa** dominar, porque a falha toda mora aqui.

- **Registro A** — diz "este nome aponta pra **este IP**". Ex.: `app.alvo.com → 203.0.113.10`.
- **Registro CNAME** — diz "este nome é um **apelido** de outro nome". Ex.: `promo.alvo.com → alvo-promo.s3.amazonaws.com`. Quem resolve `promo.alvo.com` é mandado pro nome canônico (a "loja" da Amazon).

> **Analogia do CNAME:** o CNAME é um **encaminhamento de correspondência**. A casa `promo.alvo.com` colocou um aviso nos Correios: "minha correspondência, encaminhem pra `alvo-promo.s3.amazonaws.com`". Enquanto essa caixa postal da Amazon existir e for da empresa, tudo certo. O problema é quando a empresa **fecha a caixa postal** mas **não cancela o encaminhamento**. A correspondência continua chegando num endereço que agora qualquer um pode alugar.

Com isso, as duas falhas ficam claras:

| Falha | O que está "pendurado" | O que o atacante faz |
|---|---|---|
| **Subdomain Takeover** | Um **registro DNS** (geralmente CNAME) de um subdomínio do alvo apontando pra um recurso de terceiro **não reivindicado** | Reivindica esse recurso (cria o bucket S3, o app Heroku, a página GitHub) e passa a **servir conteúdo no domínio da vítima** |
| **Broken Link Hijacking (BLH)** | Um **link/referência na página** do alvo apontando pra um domínio expirado ou handle de rede social abandonado | Registra esse domínio/handle e passa a **falar em nome do alvo** pra quem clica no link |

A diferença em uma frase: **Subdomain Takeover é sequestrar um nome que aponta pro vazio; Broken Link Hijacking é sequestrar um destino pro qual o alvo aponta.** No primeiro o controle é do **subdomínio** (você responde por `*.alvo.com`); no segundo é de um **recurso externo** que o alvo recomenda.

## Por que isso importa (e quanto paga)

O estrago vem de uma coisa só: **confiança herdada**. O navegador, o cookie e o usuário confiam em `alvo.com` — e tudo que está sob `*.alvo.com` herda essa confiança.

- **Servir conteúdo arbitrário sob o domínio legítimo:** HTML/JS controlado por você sendo entregue por `promo.alvo.com`. Defacement (desfiguração da página oficial), phishing convincente ("é o domínio real da empresa, deve ser seguro").
- **Roubo de cookie / sessão:** se a aplicação setou cookies com `Domain=.alvo.com` (escopo de domínio inteiro, não de host), o subdomínio sequestrado **lê esses cookies**. Daí pode sair ATO (*Account Takeover*, sequestro de conta). (Falamos de roubo de sessão no post [Account Takeover](/posts/account-takeover/).)
- **Bypass de listas de origem confiáveis:** CORS e CSP (regras do navegador que dizem quais origens podem ler dados ou carregar scripts — ex.: `script-src *.alvo.com`), allowlists de redirect — tudo que confia em "qualquer subdomínio nosso" passa a confiar **em você**. (Mais no [Glossário](/posts/fundamentos-web-hacking/).)
- **BLH:** se passar pela marca em redes sociais, capturar tráfego de quem clica em links oficiais antigos, phishing direcionado.

Em programas reais, essa família costuma pagar de **algumas centenas** (takeover sem dado sensível, classificado como informativo/baixo) a **alguns milhares de reais** (subdomínio usado em fluxo de auth, cookies de escopo de domínio, marca grande). Faixa típica: **R$500 a R$5.000**, dependendo do impacto que você **demonstrar**.

> ⚠️ **Realidade da triagem:** muitos programas classificam takeover como **baixo/informativo** se você não mostrar impacto concreto (roubo de cookie, uso em auth). "Consegui servir uma página" às vezes não basta. Pense no **impacto** desde o começo — é o que vimos em [Severidade & Triagem](/posts/severidade-impacto-triagem/).

### Como isso pontua (CVSS v3.1 e v4.0)

O score conta a mesma história do mercado: **médio quando é só defacement, alto/crítico quando o subdomínio entra num fluxo de confiança** (cookie de escopo de domínio, CSP/CORS, auth). A peça que segura o número em "Médio" é o **escopo alterado** (`S:C` no v3.1) — o dano não fica no recurso de terceiro, ele atinge o **domínio da vítima e seus usuários**. Leve os dois números no report:

| Cenário | CVSS v3.1 | CVSS v4.0 | Leitura |
|---|---|---|---|
| **Takeover servindo conteúdo (defacement / phishing)** | **6.1 — Médio**<br>`AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` | **~5.3 — Médio**<br>`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:N/VI:L/VA:N/SC:N/SI:L/SA:N` | Você controla conteúdo sob o domínio legítimo, mas a vítima precisa **visitar/clicar** (`UI:R` / `UI:P`). O `S:C` (escopo alterado) e o `SI:L` (integridade no sistema **subsequente** — os usuários do domínio) é o que sustenta o Médio. |
| **Takeover em fluxo de confiança (cookie `Domain=.alvo.com`, CSP `*.alvo.com`, auth) → ATO** | **9.3 — Crítico**<br>`AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N` | **~8.6 — Alto/Crítico**<br>`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N` | O impacto **não é do takeover em si** — é da conta/sessão tomada por roubo de cookie ou XSS de origem confiável. Pontue o **resultado da chain**, não o gadget. |

> 💡 **Por que dois scores?** O **v3.1** ainda é o que a maioria dos programas usa; o **v4.0** ([FIRST, 2023](https://www.first.org/cvss/v4.0/specification-document)) aposentou o `S` (Scope) e separou impacto **no sistema vulnerável** (`VC/VI/VA`) de impacto **subsequente** (`SC/SI/SA`) — o que **descreve melhor um takeover**, em que o dano explode num *outro* lugar (os usuários e a sessão da vítima), não no bucket órfão. Os valores de v4.0 acima são **aproximados** (o v4.0 calcula por tabela de macrovetor, não por fórmula simples — confira no [calculador oficial](https://www.first.org/cvss/calculator/4.0)). Calibre o número conforme o que você **provou**, não o teórico — detalhe em [Severidade & Triagem](/posts/severidade-impacto-triagem/).

## Como funciona por trás

O fluxo de um Subdomain Takeover tem **três peças** que precisam estar alinhadas:

```
1. alvo.com tem um CNAME:  promo.alvo.com  ->  alvo-promo.s3.amazonaws.com
2. O recurso de destino NÃO EXISTE MAIS (bucket deletado, app deprovisionado)
3. O serviço de terceiro permite QUALQUER UM reivindicar aquele nome de volta
```

Quando as três acontecem juntas, está vulnerável. Vamos ver as peças:

**Peça 1 — o CNAME pendurado.** Você consulta o DNS e vê pra onde o subdomínio aponta:

```bash
dig CNAME promo.alvo.com +short
# alvo-promo.s3.amazonaws.com.   <- o CNAME ainda existe, apontando pra Amazon
```

**Peça 2 — o destino morreu.** Você acessa o subdomínio e o **serviço de terceiro** te responde com uma mensagem de "esse recurso não existe aqui":

```http
GET / HTTP/1.1
Host: promo.alvo.com

HTTP/1.1 404 Not Found
Server: AmazonS3

<Error>
  <Code>NoSuchBucket</Code>
  <Message>The specified bucket does not exist</Message>   <!-- <- FINGERPRINT: bucket órfão -->
</Error>
```

Essa mensagem é a **fingerprint** (assinatura) — a prova de que o destino está vago **e** de que esse serviço permite reivindicação. Cada serviço tem a sua (tabela mais abaixo).

**Peça 3 — você reivindica.** Cria o bucket `alvo-promo` na **sua** conta AWS. Como o CNAME já manda o tráfego pra lá, agora o seu bucket responde por `promo.alvo.com`. Sobe um arquivo:

```http
GET /poc.html HTTP/1.1
Host: promo.alvo.com

HTTP/1.1 200 OK
Server: AmazonS3

<h1>PoC - controlado pelo pesquisador</h1>   <!-- <- servido pelo domínio da vítima -->
```

**Por que o terceiro deixa isso acontecer?** Porque serviços como S3 distribuem recursos por **nome global** ("primeiro que pedir, leva") e **não verificam** se você é dono do domínio `alvo.com` que aponta pra eles. A AWS só te pergunta "esse nome de bucket está livre?", não "você manda em `alvo.com`?". É exatamente esse buraco que o GitHub Pages **fechou** com domínio verificado (veremos na defesa). (O ecossistema S3/AWS — buckets públicos, ACLs, chaves vazadas — tem post próprio: [Cloud & AWS Misconfiguration](/posts/cloud-aws-misconfiguration/).)

## Tipos e variações

A condição muda conforme o serviço de destino. Direto do projeto de referência da comunidade, **[Can I take over XYZ?](https://github.com/EdOverflow/can-i-take-over-xyz)** (o catálogo de fingerprints mantido pelo EdOverflow). As fingerprints abaixo são as que ele lista:

| Serviço | Fingerprint (texto na resposta) | Status |
|---|---|---|
| **AWS S3** | `The specified bucket does not exist` (`NoSuchBucket`) | Vulnerável |
| **GitHub Pages** | `There isn't a GitHub Pages site here.` | Edge case (depende de domínio verificado) |
| **Heroku** | `No such app` / página `There's nothing here, yet.` | Edge case |
| **Microsoft Azure** | resolve, mas dá `NXDOMAIN` no destino (resposta DNS de "esse nome não existe") | Vulnerável |
| **Bitbucket** | `Repository not found` | Vulnerável |
| **Shopify** | `Sorry, this shop is currently unavailable.` | Edge case (condições específicas) |
| **Fastly** | `Fastly error: unknown domain:` | **NÃO** vulnerável (Fastly bloqueia reivindicação não autorizada) |

> ⚠️ **"Edge case" e "Not vulnerable" não são detalhe — são o jogo.** Achar a fingerprint do Fastly e reportar como takeover é **falso positivo**: a Fastly implementa proteção contra reivindicação. O catálogo "Can I take over XYZ" existe justamente pra você **saber se aquele serviço é mesmo reivindicável** antes de gastar tempo (e antes de queixar credibilidade no report). Sempre confira o status lá.

Outras variações além do CNAME clássico:

1. **Subdomain Takeover por NS** — o subdomínio delega DNS (`NS`) pra uma zona em provedor onde a zona foi deletada; quem recriar a zona controla **tudo** abaixo do subdomínio.
2. **Registro A pendurado** — A record apontando pra IP de uma instância/cloud que foi liberado e pode ser realocado pra você (mais raro, depende do provedor reciclar IPs).
3. **Host hardcoded em app/binário** — o subdomínio órfão não está nem no DNS público, está **cravado num APK/JS**. (No nosso material, um caso real-fictício veio de um `*.herokuapp.com` hardcoded num APK aberto com `jadx`.)
4. **Broken Link Hijacking (domínio expirado)** — a página do alvo carrega um `<script src="https://lib-parceiro.com/widget.js">` e `lib-parceiro.com` **expirou**. Você registra o domínio e agora serve **JavaScript** que roda no contexto da página do alvo (vira quase um XSS persistente).
5. **Broken Link Hijacking (handle social)** — o rodapé linka `instagram.com/marca_oficial` e a conta foi deletada. Você registra o handle e se passa pela marca.

## Recon — como encontrar

O takeover é **filho do recon**. Quanto mais subdomínios você enumera, mais "casas abandonadas" encontra. (O pipeline completo de enumeração está no post [Recon & Discovery](/posts/recon-discovery/) — aqui só recapitulo o necessário e foco no que é específico de takeover.)

### Passo 1 — Enumerar subdomínios (recapitulando)

```bash
# subfinder: enumerador passivo, consulta dezenas de fontes (CT logs, agregadores DNS)
subfinder -d alvo.com -all -silent -o subs.txt

# some o crt.sh (Certificate Transparency) pra não perder nada e deduplique
curl -s "https://crt.sh/?q=%25.alvo.com&output=json" | jq -r '.[].name_value' \
  | sed 's/\*\.//g' | sort -u >> subs.txt
sort -u subs.txt -o subs.txt
```

> 💡 **Por que CT logs ajudam tanto aqui:** todo certificado HTTPS emitido fica registrado em **Certificate Transparency**. Subdomínios de campanhas antigas (`promo`, `staging`, `legacy`, `2019-evento`) costumam ter emitido um cert um dia — e o registro **fica pra sempre**, mesmo que o serviço tenha morrido. CT log é um cemitério de subdomínios esquecidos. Perfeito pra caçar takeover.

### Passo 2 — Olhar o CNAME de cada subdomínio (o sinal de ouro)

O coração do recon de takeover: ver **pra onde cada subdomínio aponta**. Subdomínio que resolve pra um **serviço de terceiro** (S3, Heroku, Azure, GitHub) é candidato.

```bash
# dig em massa: pra cada subdomínio, mostra o CNAME (se houver)
while read sub; do
  cname=$(dig +short CNAME "$sub" | head -1)
  [ -n "$cname" ] && echo "$sub -> $cname"
done < subs.txt | tee cnames.txt
```

**`dig`** (*Domain Information Groper*) é o canivete do DNS. `dig +short CNAME nome` te devolve só o destino do apelido — limpo, sem ruído. Procure destinos como `*.s3.amazonaws.com`, `*.herokudns.com`, `*.github.io`, `*.azurewebsites.net`, `*.cloudfront.net`.

```text
# o que você quer ver em cnames.txt — subdomínios apontando pra terceiros:
promo.alvo.com    -> alvo-promo.s3.amazonaws.com.
legacy.alvo.com   -> alvo-legacy.herokudns.com.
docs.alvo.com     -> alvo.github.io.
```

### Passo 3 — Fingerprintar (automatizar a checagem das 3 peças)

Você não vai abrir 800 subdomínios na mão. Duas ferramentas resolvem:

**`nuclei`** — scanner baseado em templates da ProjectDiscovery. Tem uma coleção de templates de takeover que batem a resposta de cada host contra as fingerprints do "Can I take over XYZ".

```bash
# instalar
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
nuclei -update-templates   # baixa/atualiza a base de templates

# rodar SÓ os templates de takeover na sua lista de hosts vivos
nuclei -list subs.txt -tags takeover -o takeover-hits.txt
```

**`subjack`** — scanner dedicado a takeover, escrito em Go pelo haccer. Lê a lista, checa CNAME + fingerprint e marca os vulneráveis.

```bash
# instalar
go install github.com/haccer/subjack@latest

# rodar (exemplo do README do projeto)
subjack -w subs.txt -t 100 -timeout 30 -o results.txt -ssl
```

Flags do subjack que importam:

| Flag | O que faz |
|---|---|
| `-w` | wordlist/lista de subdomínios a checar |
| `-t` | threads concorrentes (default 10; `100` acelera muito) |
| `-timeout` | timeout de conexão em segundos |
| `-ssl` | força HTTPS nas checagens |
| `-o` | arquivo de saída (use `.json` pra sair em JSON) |
| `-a` | checa **todas** as URLs, não só as com CNAME identificado |
| `-m` | sinaliza CNAMEs "mortos" mesmo sem estarem registrados (bom pra varrer candidatos) |
| `-v` | verbose (mostra também os não vulneráveis) |

> 💡 **Regra de ouro:** ferramenta **acha candidato**, você **confirma na mão**. Tanto nuclei quanto subjack dão **falso positivo** (fingerprint genérica, serviço que não é reivindicável, cache de CDN). Antes de reportar, rode o `dig` e o acesso HTTP você mesmo, e confira o **status no "Can I take over XYZ"**. (É a mesma lição do [Misconfiguration & CVE hunting](/posts/security-misconfiguration-cve-hunting/): "nem todo achado de scanner é vulnerabilidade — leia o que o template faz".)

### Recon de Broken Link Hijacking

Aqui você não olha DNS — olha o **HTML/JS** das páginas do alvo atrás de links externos que dão 404 / domínio expirado.

```bash
# colete todas as URLs históricas e atuais (gau = URLs do Wayback/Common Crawl)
echo alvo.com | gau --subs > urls.txt

# extraia destinos EXTERNOS referenciados nas páginas (src/href pra outros domínios)
# e cheque quais respondem erro / não resolvem
katana -u https://alvo.com -jc -d 2 -silent \
  | grep -oE 'https?://[^"]+' | sort -u > links-externos.txt

httpx -l links-externos.txt -status-code -title -silent | grep -E ' \[40[34]\]| \[5'
```

- **`gau`** coleta URLs históricas (já apareceu no [Recon](/posts/recon-discovery/)). **`katana`** rastreia a página e extrai links/`src`. **`httpx`** prova quais respondem erro.
- Para **handles de rede social**: leia o rodapé/contato do site, anote os perfis linkados, e cheque se cada um **ainda existe**. Handle que dá 404 e está **livre pra registro** = BLH.

## Exploração passo a passo (do básico ao avançado)

### Nível 1 — Confirmar o CNAME pendurado

```bash
dig CNAME promo.alvo.com +short
# alvo-promo.s3.amazonaws.com.    <- aponta pra S3

curl -s https://promo.alvo.com/
# <Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>
```

CNAME existe **e** o destino dá fingerprint de órfão. As peças 1 e 2 confirmadas.

### Nível 2 — Conferir se o serviço é reivindicável

Antes de mexer: abra o **[Can I take over XYZ](https://github.com/EdOverflow/can-i-take-over-xyz)** e confira o status do serviço. S3 = **Vulnerável**. Fastly = **Não**. GitHub Pages = **edge case** (depende de domínio verificado). Esse passo te salva de reportar falso positivo.

### Nível 3 — Reivindicar o recurso (PoC SEGURA)

A regra de ouro da PoC: **prove o controle com o conteúdo mais inofensivo possível.** Nada de JS, nada de roubar nada — só um HTML estático que diz "isto está sob controle do pesquisador".

**Exemplo S3:** o nome do bucket é o que estava no CNAME (`alvo-promo`). Crie na **sua** conta:

```bash
# cria o bucket com o MESMO nome do destino do CNAME (na sua conta AWS)
aws s3api create-bucket --bucket alvo-promo --region us-east-1

# habilita hospedagem de site estático
aws s3 website s3://alvo-promo/ --index-document index.html

# sobe uma página inofensiva de prova
printf '<h1>PoC subdomain takeover - %s - pesquisador autorizado</h1>' "$(date -u +%FT%TZ)" > index.html
aws s3 cp index.html s3://alvo-promo/index.html
```

```bash
# valida que o domínio da VÍTIMA serve o seu conteúdo
curl -s https://promo.alvo.com/
# <h1>PoC subdomain takeover - 2026-05-31T... - pesquisador autorizado</h1>   <- takeover provado
```

**Exemplo GitHub Pages (edge case):** se `docs.alvo.com → alvo.github.io` der `There isn't a GitHub Pages site here.` **e** o domínio não estiver verificado, cria um repo, sobe um `index.html` e um arquivo `CNAME` com o conteúdo `docs.alvo.com`, e ativa Pages apontando pra ele. O GitHub passa a servir seu repo em `docs.alvo.com`.

> ⚠️ **PoC mínima e datada.** Use um path único (`/poc-<seudata>.html`), conteúdo neutro, e **remova** logo após documentar. Não capture tráfego real, não sirva JS, não colete cookie de ninguém. O objetivo é **provar controle**, não causar dano. Isso é o que separa pesquisa de crime — e o triador percebe a diferença.

### Nível 4 — Broken Link Hijacking

Achou no rodapé do alvo: `<a href="https://blog-parceiro-antigo.com">Nosso blog</a>` e o domínio **expirou** (status "disponível para registro" no registrar).

1. Registre `blog-parceiro-antigo.com` (custo baixo, é o "aluguel da loja vaga").
2. Suba uma página inofensiva de PoC identificando o pesquisador.
3. Documente: o link **na página do alvo** apontando pra um domínio que **agora é seu**.

Para handle social: registre o `@marca_oficial` que estava 404, ponha um aviso de PoC no perfil, e documente o link oficial do alvo apontando pra ele.

### Nível 5 — Escalando o impacto (sem sair da PoC segura)

Você **não precisa** explorar de verdade pra **argumentar** o impacto no report — basta provar a condição e explicar a cadeia:

- **Cookie de escopo de domínio:** cheque se a app seta `Set-Cookie: ...; Domain=.alvo.com`. Se sim, **explique** que o subdomínio sequestrado leria esses cookies (não precisa roubar de ninguém — descreva o vetor).
- **Uso em CSP/CORS:** se `alvo.com` tem `Content-Security-Policy: script-src *.alvo.com`, seu subdomínio sequestrado serve JS **dentro da política** — argumente o XSS de origem confiável.
- **BLH com JS:** se o link quebrado era um `<script src>`, o JavaScript que você serve **executa na página do alvo**. Aí o impacto é o de um XSS persistente — descreva, mas mantenha a PoC um `console.log`/`alert` neutro.

## Caso real-fictício: S3 órfão em `staging-assets.alvo.com`

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você está no recon de `alvo.com`. O `subfinder` + `crt.sh` cospem ~600 subdomínios. Roda o `dig` em massa e um chama atenção:

```text
staging-assets.alvo.com -> alvo-staging-assets.s3.amazonaws.com.
```

**Passo 1 — Confirmar a fingerprint.** Acessa direto:

```http
GET / HTTP/1.1
Host: staging-assets.alvo.com

HTTP/1.1 404 Not Found
Server: AmazonS3
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>NoSuchBucket</Code>                                  <!-- <- bucket órfão -->
  <Message>The specified bucket does not exist</Message>
  <BucketName>alvo-staging-assets</BucketName>
  <RequestId>8XCYKHFCCCD1JRRK</RequestId>
</Error>
```

`NoSuchBucket` + S3 no "Can I take over XYZ" = **Vulnerável**. As três peças batem.

**Passo 2 — Reivindicar (PoC segura).** Cria o bucket `alvo-staging-assets` na sua conta, marca como público, sobe um `test.html` com o texto `PoC Done - pesquisador`.

**Passo 3 — Provar.** Acessa pelo domínio da vítima:

```http
GET /test.html HTTP/1.1
Host: staging-assets.alvo.com

HTTP/1.1 200 OK
Server: AmazonS3

PoC Done - pesquisador           <!-- <- conteúdo seu, servido por staging-assets.alvo.com -->
```

**O que a tela do Burp/navegador mostraria:** a barra de endereço com `https://staging-assets.alvo.com/test.html` (cadeado, domínio legítimo da empresa) renderizando a sua página de PoC. Lado a lado: o XML `NoSuchBucket` (antes) e o `200 OK` com seu conteúdo (depois), com o `Host` destacado.

**Passo 4 — Report.** Título `[Subdomain Takeover] - Bucket S3 órfão em staging-assets.alvo.com serve conteúdo arbitrário`. Severidade **Média** (CVSS **v3.1 6.1** / **v4.0 ~5.3**) se for só defacement/phishing; sobe pra **Alta/Crítica** (CVSS **v3.1 9.3** / **v4.0 ~8.6**) se você demonstrar cookie de escopo de domínio (`Domain=.alvo.com`) ou uso em auth/CSP — aí o impacto é o da chain. Resumo focado no negócio: *"qualquer pessoa pode servir conteúdo (phishing, JS) sob um subdomínio legítimo da empresa, herdando a confiança do domínio"*. Passos numerados + prints do `dig`, do XML e do `200`. (Como estruturar isso: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

## Defesa em camadas

A correção é **operacional + arquitetural**, não um patch de código. A regra mestra: **a ordem de desligamento importa.**

**1. Ordem correta ao decomissionar (a defesa nº 1):**

> Sempre **remova o registro DNS ANTES** de liberar o recurso de terceiro. Se você deletar o bucket/app primeiro e deixar o CNAME, abre a janela de takeover. A OWASP WSTG é direta: *"o registro DNS vulnerável deve ser removido da zona DNS"*.

```text
ERRADO:                          CORRETO:
1. deletar bucket S3             1. remover CNAME do DNS  <- primeiro
2. (CNAME fica pendurado) X      2. depois liberar o bucket S3
```

**2. Verificação de domínio no provedor (quando existe):** use os mecanismos que matam a peça 3 da falha. No **GitHub Pages**, *domínio verificado* faz com que **só repositórios da sua organização** possam publicar naquele domínio e subdomínios — atacante não consegue reivindicar. Habilite onde o serviço oferecer.

**3. Nada de wildcard solto:** evite `*.alvo.com` apontando genericamente pra um provedor — é risco imediato de takeover de qualquer host inventado, mesmo com domínio verificado.

**4. Inventário e monitoramento contínuo (IaC + varredura agendada):** trate registros DNS como código, com dono e ciclo de vida. E **rode o scanner contra você mesmo**, periodicamente:

```yaml
# .github/workflows/dns-hygiene.yml — varredura agendada do seu PRÓPRIO DNS
name: dns-hygiene
on:
  schedule: [{ cron: "0 6 * * *" }]   # todo dia 06:00 UTC
jobs:
  takeover-scan:
    runs-on: ubuntu-latest
    steps:
      - run: go install github.com/haccer/subjack@latest
      - run: subjack -w meus-subdominios.txt -t 100 -timeout 30 -ssl -o report.txt
      - run: test ! -s report.txt   # falha o build se achar candidato a takeover
```

**5. Processo de offboarding:** quando um time desliga um serviço, um checklist obriga remover os DNS associados **antes** de cancelar o contrato. Sem processo, o `staging-assets` de 2019 fica pendurado pra sempre.

> ❌ **O que NÃO basta:** apagar o conteúdo do bucket (o nome continua reivindicável); confiar que "ninguém vai achar esse subdomínio" (CT logs acham tudo); deletar o recurso de terceiro deixando o CNAME; e — pra BLH — só remover o link da página atual sem checar páginas antigas/cacheadas que ainda apontam pra lá.

## Ferramentas + labs legais

- **`dig`** — consulta de DNS (CNAME/A/NS). O ponto de partida pra confirmar manualmente.
- **`subfinder` / `amass` / `crt.sh`** — enumeração de subdomínios (ver [Recon](/posts/recon-discovery/)).
- **`nuclei` (`-tags takeover`)** e **`subjack`** — fingerprinting automático de takeover.
- **`gau` / `katana` / `httpx`** — coleta e probing de links externos pra Broken Link Hijacking.
- **[Can I take over XYZ?](https://github.com/EdOverflow/can-i-take-over-xyz)** — catálogo de fingerprints e status (Vulnerável / edge case / Não). **Consulta obrigatória.**
- **Labs / leitura autorizada:** [OWASP WSTG — Test for Subdomain Takeover](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/10-Test_for_Subdomain_Takeover), [PortSwigger Web Security Academy](https://portswigger.net/web-security/all-topics) (fundamentos web), TryHackMe e HackTheBox (máquinas com takeover). Para praticar **de verdade**, registre subdomínios **da sua própria conta** apontando pra um S3/Heroku seu e treine o ciclo.

## Checklist do caçador

- [ ] Enumerei subdomínios com `subfinder` + `crt.sh` + `amass` e dedupliquei.
- [ ] Rodei `dig +short CNAME` em todos e separei os que apontam pra **terceiros** (S3, Heroku, GitHub, Azure...).
- [ ] Acessei cada candidato e identifiquei a **fingerprint** (`NoSuchBucket`, `No such app`, etc.).
- [ ] Confirmei no **"Can I take over XYZ"** que o serviço é **reivindicável** (e não um Fastly da vida).
- [ ] Provei o controle com **PoC mínima e inofensiva** (HTML neutro, datado, removido depois).
- [ ] Verifiquei impacto: cookie `Domain=.alvo.com`? subdomínio em CSP/CORS/auth?
- [ ] (BLH) Varri links/`src` externos e handles sociais que dão 404 e estão livres pra registro.
- [ ] Conferi que takeover **está no escopo** do programa.

## Pegadinhas / o que NÃO funciona

- **Fingerprint ≠ takeover.** `Fastly error: unknown domain:` parece vulnerável, mas a Fastly **bloqueia** reivindicação não autorizada. Sempre cheque o status.
- **Cache de CDN engana.** Um `404` cacheado pode sumir ao revalidar. Cheque o DNS ao vivo (`dig`), não só o HTTP.
- **NXDOMAIN puro nem sempre é takeover.** Subdomínio que não resolve nada pode ser só lixo — o que importa é o **CNAME apontando pra serviço reivindicável**.
- **GitHub Pages com domínio verificado não cai.** Se a org verificou o domínio, a fingerprint aparece mas você **não** consegue reivindicar. Edge case = teste, não assuma.
- **Reivindicar e "deixar lá" é antiético e arriscado.** Faça a PoC, documente e **devolva** (remova o recurso). Segurar o subdomínio da vítima é abuso.

## O que você precisa lembrar

- **Subdomain Takeover** = CNAME (ou NS/A) **pendurado** apontando pra recurso de terceiro **não reivindicado**. Você reivindica e passa a servir conteúdo sob o domínio da vítima.
- **Broken Link Hijacking** = link/handle externo **expirado** que o alvo ainda recomenda; você registra e fala em nome dele.
- O ciclo é sempre: **enumerar → `dig` CNAME → fingerprint → conferir status no "Can I take over XYZ" → PoC segura**.
- A defesa nº 1 é **remover o DNS antes de liberar o recurso** + verificação de domínio + monitoramento.

> 💡 **Dica de ouro:** o melhor lugar pra achar takeover é o **passado** do alvo. Subdomínios de campanhas mortas (`promo-2019`, `staging-x`, `legacy`) vivem nos **CT logs** muito depois de o serviço morrer. Enumere o histórico, rode `dig` em tudo, e procure a "loja vaga com a placa ainda pendurada".

## Nota ética

Tudo aqui é pra **testes autorizados** — bug bounty dentro do escopo, pentests contratados e seus próprios recursos. Reivindicar um subdomínio de terceiro **sem autorização** é abuso, mesmo "só pra provar". Faça a PoC **mínima** (HTML neutro), **documente** e **devolva o recurso** imediatamente; nunca capture tráfego, cookie ou dado de usuário real. O objetivo é proteger e reportar com responsabilidade — não ocupar o que não é seu.

## Referências

- [EdOverflow — Can I take over XYZ?](https://github.com/EdOverflow/can-i-take-over-xyz) (catálogo de fingerprints e status por serviço)
- [OWASP WSTG — Test for Subdomain Takeover](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/10-Test_for_Subdomain_Takeover)
- [Microsoft — Prevent dangling DNS entries and avoid subdomain takeover](https://learn.microsoft.com/en-us/azure/security/fundamentals/subdomain-takeover)
- [GitHub Docs — Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) (domínio verificado)
- [haccer/subjack — Subdomain Takeover tool](https://github.com/haccer/subjack)
- [ProjectDiscovery — Nuclei](https://github.com/projectdiscovery/nuclei) (templates `-tags takeover`)

---
*Próximo/relacionado na série: [Security Misconfiguration & CVE Hunting](/posts/security-misconfiguration-cve-hunting/) · nuvem/S3: [Cloud & AWS Misconfiguration](/posts/cloud-aws-misconfiguration/) · base: [Recon & Discovery](/posts/recon-discovery/) · impacto: [Account Takeover](/posts/account-takeover/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
