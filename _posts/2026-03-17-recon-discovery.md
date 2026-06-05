---
title: "Recon & Discovery: encontrando a superfície de ataque"
description: "Do recon passivo ao ativo: subdomínios, probing com httpx, URLs históricas, análise de JavaScript, fuzzing e dorks — como mapear tudo que um alvo expõe antes de testar a primeira falha."
author: matheus
date: 2026-03-17 13:17:00 -0300
categories: [Bug Bounty, Fundamentos]
tags: ["recon", "subdomain enumeration", "httpx", "gau", "ffuf", "katana", "nuclei", "JS analysis", "google dorks", "bug bounty", "web security"]
image: /assets/img/covers/recon-discovery.png
pin: false
comments: true
---

## A falha que mais paga nasce no recon, não no payload

Tem um mito de iniciante que diz que bug bounty é decorar payload. Não é. O caçador experiente sabe que **80% do resultado vem de onde quase ninguém olha**: aquele subdomínio esquecido de homologação, o endpoint de API que só aparece num arquivo JavaScript minificado, o `.env` que vazou num commit de três anos atrás. (Endpoint = um endereço/rota específico da aplicação que recebe requisições, tipo `/api/v1/users`. Mais no [Glossário](/posts/fundamentos-web-hacking/).) O payload é o último 20% — e ele só funciona se você **achou a porta certa primeiro**.

Existe um relato recorrente nesse mundo: o caçador que ganhou **cinco dígitos** num único bounty não usou nenhum exploit mirabolante. Ele integrou uma fonte de dados que poucos conheciam à sua ferramenta de enumeração de subdomínios, encontrou um host que **nenhuma outra ferramenta pegou**, mapeou um fluxo que a maioria ignorava e chegou num **Account Takeover**. Resumindo a lição dele: *"não precisa de exploit avançado, precisa saber onde olhar"*.

Recon (de *reconnaissance*, reconhecimento) é exatamente isso: o trabalho metódico de **mapear a superfície de ataque** — tudo que o alvo expõe pra internet — antes de testar uma única falha. Neste post a gente vai do básico (o que é passivo vs. ativo) até o avançado (construir paths manualmente a partir do JS), apresentando cada ferramenta: o que ela é, como instalar e quais flags importam.

## O que é "superfície de ataque" (e por que mapear)

**Analogia:** imagine que o alvo é um prédio grande e você é um auditor de segurança contratado. Antes de testar uma fechadura, você dá a volta no quarteirão inteiro e anota **cada porta, janela, saída de incêndio, entrada de garagem e duto de ventilação**. Esse mapa completo é a superfície de ataque. O ladrão amador vai direto na porta da frente (o domínio principal, `alvo.com`, que está blindado). O profissional encontra a janela do porão que ninguém lembrava que existia (`old-api.staging.alvo.com`).

**Superfície de ataque** é o conjunto de todos os pontos onde um atacante pode interagir com o sistema: domínios, subdomínios, IPs, portas, endpoints de API, parâmetros, arquivos estáticos, repositórios públicos. **Recon é o ato de descobrir e catalogar esses pontos.**

A primeira grande divisão que você precisa entender:

| Tipo | O que faz | Toca o alvo? | Exemplo |
|---|---|---|---|
| **Passivo** | Coleta dados de **fontes de terceiros** (Google, logs de certificado, arquivos web archive) | **Não** — você nunca manda pacote pro alvo | `crt.sh`, `gau`, `subfinder` (com APIs) |
| **Ativo** | Manda requisições **direto pro alvo** pra confirmar, resolver e descobrir | **Sim** | `httpx`, `ffuf`, `katana`, brute-force de subdomínio |

> 💡 **Por que a ordem importa:** sempre comece **passivo**. Ele é silencioso, não dispara WAF (*Web Application Firewall* — o "porteiro" que filtra tráfego malicioso e pode te bloquear; mais no [Glossário](/posts/fundamentos-web-hacking/)), não consome rate limit e te dá uma lista enorme de candidatos de graça. Só depois você parte pro **ativo** pra confirmar o que está vivo. Inverter a ordem é gastar ruído (e risco de block) com alvos que talvez nem existam.

## Por que isso importa (e quanto paga)

O recon não é uma vulnerabilidade — é o que **destrava** todas as outras. Mas em muitos programas, achados de recon **já pagam sozinhos**:

- **Subdomain takeover** — um subdomínio aponta (registro DNS `CNAME`, o apelido que diz "este nome é, na verdade, aquele outro endereço") pra um serviço que foi desprovisionado (bucket S3 órfão, app Heroku não reclamado). Você recria o recurso e passa a servir conteúdo arbitrário sob o domínio confiável do alvo. Em programas reais, esse padrão paga na faixa de **R$750 a alguns milhares**, dependendo do impacto (phishing, roubo de sessão).
- **Information disclosure** — um arquivo de backup (`index.php.save`), um painel de debug, um endpoint de telemetria que vaza versões de software. Achados simples assim pagam de **R$500** pra cima.
- **Segredos vazados** — credenciais de produção hardcoded num `app.js` exposto no GitHub. Isso é **crítico** e paga muito (faixa de **R$5.000+**) porque dá acesso direto à aplicação.

E o efeito multiplicador: o subdomínio esquecido que você só achou no recon é onde mora o IDOR, o SQLi, o painel admin sem auth. **O recon define o tamanho do seu campo de jogo.**

> ⚠️ **Sempre confira o escopo primeiro.** Cada programa define o que está dentro do alvo (in-scope) — às vezes só `*.alvo.com`, às vezes domínios específicos. Testar fora do escopo não paga e pode te tirar do programa. Recon amplo é bom; testar fora do escopo é proibido.

## Como funciona por trás: as fontes de dados do recon passivo

O recon passivo parece mágica ("como você achou 800 subdomínios sem tocar no alvo?"), mas é só saber **quais bancos de dados públicos** registram a infraestrutura de todo mundo. Os três pilares:

1. **Certificate Transparency (CT) logs.** Toda vez que uma Autoridade Certificadora emite um certificado TLS (o cadeado HTTPS), ela é **obrigada a registrar isso num log público e auditável**. Esses logs incluem o nome do domínio do certificado. Como `meu-subdominio-secreto.alvo.com` precisa de certificado pra ter HTTPS, o nome dele **vaza no CT log**. O `crt.sh` é a interface de busca desses logs.

2. **Web archives (Wayback Machine, Common Crawl, etc.).** Crawlers vasculham a internet há mais de uma década e guardam **toda URL que já viram**. Ferramentas como `gau` e `waybackurls` consultam esses arquivos e te devolvem URLs históricas — inclusive endpoints que foram removidos do site atual mas que **ainda existem no backend**.

3. **Agregadores de DNS/inteligência (OTX, VirusTotal, SecurityTrails...).** Serviços que mapeiam DNS passivamente. O `subfinder` consulta dezenas dessas fontes de uma vez via API.

A ideia central: **você não precisa fazer barulho pra descobrir o que já está registrado em algum lugar público.**

## As etapas do recon (o pipeline mental)

Não decore comandos soltos — entenda o fluxo. Cada etapa alimenta a próxima:

```text
1. Enumerar subdomínios   (subfinder, amass, crt.sh)        -> lista de hosts
2. Resolver / probing     (httpx)                            -> hosts VIVOS + tech
3. Coletar URLs           (gau, waybackurls, katana)         -> endpoints/params
4. Analisar JavaScript    (ler + linkfinder)                 -> rotas escondidas
5. Fuzzing                (ffuf, paramspider)                -> conteúdo/params novos
6. Dorks                  (Google, GitHub)                   -> docs, segredos
7. Scan por templates     (nuclei)                           -> CVEs, exposições
```

Vamos detalhar cada uma, apresentando as ferramentas.

### Etapa 1 — Enumeração de subdomínios

**subfinder** — o cavalo de batalha do recon passivo. É um enumerador que consulta **dezenas de fontes públicas** (CT logs, agregadores de DNS, motores de busca) de uma vez e te entrega a lista de subdomínios. É *passivo*: ele pergunta pras fontes, não bombardeia o alvo.

```bash
# Instalar (precisa de Go recente — 1.24+ — pra evitar erro de build)
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Uso básico: -d = domínio, -all usa TODAS as fontes, -silent só imprime os subdomínios
subfinder -d alvo.com -all -silent -o subs.txt
```

- `-d alvo.com` → o domínio-raiz a enumerar.
- `-all` → ativa todas as fontes (sem isso, usa só as gratuitas mais rápidas). **Aqui mora ouro**: o relato do bounty de cinco dígitos veio justamente de uma fonte extra. Você adiciona suas próprias chaves de API no arquivo `$HOME/.config/subfinder/provider-config.yaml` (flag `-pc`) — isso desbloqueia fontes (SecurityTrails, Censys, etc.) que pegam subdomínios que ninguém mais pega.
- `-silent` → suprime o banner e logs, deixando só os subdomínios na saída (essencial pra encadear com `|`).
- `-o subs.txt` → salva o resultado.

**crt.sh** — a consulta direta aos CT logs, sem instalar nada. Ele tem uma API JSON que você consome com `curl` + `jq`:

```bash
# %.alvo.com = "qualquer coisa".alvo.com (o % é o coringa do SQL que o crt.sh usa)
# (comentários em linha própria: um "# ..." depois da "\" quebra a continuação da linha)
curl -s "https://crt.sh/?q=%.alvo.com&output=json" \
  | jq -r '.[].name_value' \
  | sed 's/\*\.//g' \
  | sort -u
```

Cada peça: `curl -s` baixa o JSON em modo silencioso; `jq -r '.[].name_value'` percorre o array (`.[]`) e imprime o campo `name_value` (o nome do certificado) sem aspas (`-r` = raw); o `sed` limpa entradas wildcard tipo `*.alvo.com`; `sort -u` deduplica. Resultado: lista limpa de subdomínios, **100% passiva**.

**amass** — o enumerador mais completo (e mais pesado) da OWASP. A diferença pro subfinder é que o amass faz **enumeração ativa** opcional (resolução DNS, brute-force, varredura de blocos de IP), além da passiva.

```bash
go install -v github.com/owasp-amass/amass/v4/...@master

# Passivo: só consulta fontes públicas, NÃO toca no alvo
amass enum -passive -d alvo.com -o amass-passive.txt

# Ativo: resolve DNS e faz brute-force de nomes (FAZ barulho no alvo)
amass enum -active -brute -d alvo.com -o amass-active.txt
```

- `enum` → o subcomando de enumeração.
- `-passive` → modo silencioso, só fontes de terceiros (comece sempre por aqui).
- `-active` → resolve os nomes e confirma o que existe de verdade.
- `-brute` → testa nomes de uma wordlist (`dev`, `api`, `staging`...) contra o DNS do alvo — **isso é ativo e gera tráfego**, use com consciência de escopo.

> **Por que rodar subfinder *e* amass *e* crt.sh?** Porque cada um cobre fontes diferentes. A regra é: **junte tudo e deduplique.** `cat subs.txt amass-*.txt crtsh.txt | sort -u > all-subs.txt`. O subdomínio que vale o bounty pode ser justamente o que só uma das três achou.

### Etapa 2 — Probing e resolução com httpx

Você tem uma lista de **centenas de nomes** — mas quais estão **vivos**? Quais respondem HTTP? Em qual porta? Que tecnologia rodam? É aqui que entra o `httpx`.

**httpx (apresentando a ferramenta):** é um cliente HTTP rápido e multi-thread da ProjectDiscovery, feito pra **provar (probing) uma lista grande de hosts** e extrair metadados de cada um. Não confunda com a biblioteca Python `httpx` — aqui é o binário em Go. Ele responde: *"deste monte de nomes, quais são servidores web reais, e o que cada um é?"*

```bash
# Instalar
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Probing: lê a lista do stdin, filtra os vivos (200) e detecta título + tecnologia
cat all-subs.txt | httpx -mc 200 -title -tech-detect
```

Decifrando as flags (todas verificadas na doc oficial):

- `-mc 200` (*match-code*) → só mostra hosts que retornam status **200 OK**. Você pode passar vários: `-mc 200,302,401` (um `401` revela uma área autenticada interessante!).
- `-title` → imprime o `<title>` da página. Útil pra bater o olho: "Painel Admin", "Grafana", "Login Interno".
- `-tech-detect` (atalho `-td`) → identifica a stack (nginx, WordPress, Spring Boot, React...). Saber a tecnologia direciona seus testes.

Outras flags que você vai usar muito:

```bash
cat all-subs.txt | httpx -sc -ct -server -ip -location -td -title
```

- `-sc` (*status-code*) → mostra o código HTTP.
- `-ct` (*content-type*) → o tipo de conteúdo (`application/json`, `text/html`...).
- `-server` (*web-server*) → o header `Server` (versão de servidor às vezes vaza aqui).
- `-ip` → resolve e mostra o IP.
- `-location` → mostra o destino de redirecionamentos.

E uma trick real e elegante, vinda de um programa de governo (o padrão se aplica a qualquer alvo no escopo): caçar **erros expostos** direto no probing.

```bash
# -path adiciona um caminho a cada host; -ms procura uma string no corpo da resposta
cat all-subs.txt | httpx -title -ms 'Server Error' -path '/:;:;'
```

Aqui `-path '/:;:;'` injeta um caminho propositalmente malformado em cada host, e `-ms 'Server Error'` (*match-string*) filtra só os que devolvem uma página de erro de servidor — que muitas vezes **vaza stack trace, caminho de arquivos ou configuração interna** (information disclosure, reportável).

> **Analogia:** subfinder/amass/crt.sh são o **carteiro coletando todos os endereços** de uma rua. O httpx é você **tocando a campainha de cada um** pra ver quem mora ali, quem atende e como é a casa por dentro — tudo de uma vez.

### Etapa 3 — URLs históricas com gau e waybackurls

Agora você tem os hosts vivos. Mas e os **endpoints**? O site atual mostra 10 links; o backend pode ter centenas de rotas antigas ainda funcionando. Pra isso, consultamos os arquivos web.

**gau (apresentando a ferramenta):** *getallurls*. Ele busca **URLs conhecidas** de um domínio a partir de quatro fontes de arquivo: **Wayback Machine, Common Crawl, AlienVault OTX e URLScan**. É 100% passivo — ele não rastreia o alvo, só pergunta pros arquivos "que URLs desse domínio vocês já viram?".

```bash
go install github.com/lc/gau/v2/cmd/gau@latest

# Domínio via argumento ou stdin; --subs inclui subdomínios; --o salva
gau alvo.com --subs --o urls-historicas.txt
```

- `--subs` → inclui URLs de subdomínios, não só do domínio-raiz.
- `--providers wayback,commoncrawl,otx,urlscan` → escolhe as fontes (por padrão usa todas).
- `--threads 5` → número de workers.
- `--blacklist png,jpg,css` → ignora extensões inúteis (imagens, estáticos).

**waybackurls (apresentando a ferramenta):** o irmão mais simples e clássico, do tomnomnom. Faz **só a Wayback Machine**, mas é rápido e confiável. Recebe domínios por stdin:

```bash
go install github.com/tomnomnom/waybackurls@latest
cat all-subs.txt | waybackurls > wayback.txt
```

> 💡 **LFI** (Local File Inclusion): ler arquivos do servidor (ex.: /etc/passwd) por parâmetros como ?file=../../etc/passwd.
{: .prompt-tip }

> 💡 **Por que isso é poderoso:** essas URLs vêm carregadas de **parâmetros antigos** (`?id=`, `?file=`, `?redirect=`) e de **endpoints removidos da UI mas vivos no servidor**. Um parâmetro que o frontend não usa mais é um parâmetro que **ninguém testa** — terreno fértil pra IDOR, LFI e open redirect.

### Etapa 4 — Análise de JavaScript (a melhor fonte de informação)

Se eu tivesse que escolher **uma única** etapa de recon pra dominar, seria essa. Num relato real de um bug **crítico** (acesso a +200 páginas com milhares de dados sensíveis de usuários e admins), a lição número 1 do caçador foi literal:

> *"Arquivos JavaScript são a melhor fonte de informação sobre qualquer aplicação. Gaste o tempo necessário olhando CADA detalhe do JS — não apenas extraia paths com ferramentas."*

**Por que o JS é ouro?** Porque numa aplicação moderna (React, Vue, Angular), **toda a lógica de quais rotas e endpoints de API existem está no JavaScript que roda no seu navegador**. O frontend precisa saber pra onde mandar as requisições — então os paths de API, nomes de parâmetros, rotas de admin e às vezes até chaves estão **escritos no JS**, mesmo que escondidos atrás de minificação. É o mapa da aplicação entregue na sua mão.

Primeiro, ache os arquivos `.js` (esta é a trick clássica que combina três ferramentas):

```bash
# 1. gau coleta URLs  2. grep filtra só as .js  3. httpx confirma quais estão vivas e são JS
echo alvo.com | gau | grep '\.js$' | httpx -sc -mc 200 -ct | grep -iE 'text/javascript|application/javascript'
```

Passo a passo: `echo alvo.com | gau` lista as URLs históricas; `grep '\.js$'` mantém só as que terminam em `.js`; `httpx -sc -mc 200 -ct` mantém as que respondem **200** e mostra o content-type; o `grep` final garante que é JS de verdade (e não um 404 disfarçado). Filtramos **`text/javascript` e `application/javascript`** porque servidores usam um ou outro — pela RFC 9239, `text/javascript` é o tipo padrão hoje, mas `application/javascript` (agora obsoleto) ainda aparece muito; pegar só um deles faz você perder arquivos JS válidos.

Agora vem a parte que separa o amador do profissional. Você tem duas abordagens, e o ideal é **as duas**:

**(a) Extração automática com LinkFinder.** O LinkFinder usa regex pra varrer um arquivo JS e extrair todos os endpoints/paths que parecem URLs:

```bash
git clone https://github.com/GerbenJavado/LinkFinder
cd LinkFinder && pip install -r requirements.txt
# -i = input (arquivo ou URL);  -o cli = saída no terminal
python3 linkfinder.py -i https://alvo.com/static/app.min.js -o cli
```

Ferramentas como o LinkFinder, a extensão **FindSomething** (Chrome) ou o modo `-jsl` (jsluice) do katana fazem essa primeira passada automática rapidíssimo.

**(b) Leitura manual — o pulo do gato.** Ferramenta automática extrai o que está escrito de forma óbvia. Mas o achado crítico daquele relato **não foi encontrado por fuzzing nem por gau nem por recon comum** — foi preciso *entender o PADRÃO de paths da aplicação e construir manualmente um path coerente* a partir das referências no JS.

**Analogia:** o LinkFinder te dá as palavras soltas que ele reconheceu num texto. A leitura manual é você **entender a gramática** e formar frases novas que fazem sentido. Se você vê no JS:

```javascript
// trechos que você acha lendo o app.js manualmente:
const API = "/api/v2/users/{id}/documents";
const ADMIN_BASE = "/internal/admin";
fetch(`${ADMIN_BASE}/reports/${reportId}/export`);
```

Você acabou de descobrir o **padrão** `/internal/admin/<recurso>/<id>/<ação>`. Aí você **constrói** rotas que o JS não cita explicitamente, por analogia: `/internal/admin/users/1001/export`, `/internal/admin/invoices/...`. Foi exatamente assim que se chegou às +200 páginas com dados sensíveis.

Detalhe avançado do mesmo caso: nem sempre a rota responde de cara. No bug real, a rota identificada no JS **não retornava 200** no contexto normal — foi preciso um **bypass com o caractere `;`** numa parte específica do path pra acessá-la (técnica de path confusion que veremos em posts futuros). Lição: *não desista se um path não responde 200 de primeira; persista se a intuição apontar.*

> ⚠️ **Cuidado com falso-positivo de segredo.** Achar uma "secret key" do Vue/React no JS **quase sempre não vale nada** — são variáveis públicas de build (`VUE_APP_*`), sitekeys de reCAPTCHA, public keys do Stripe (`pk_live_`...). O que importa é identificar um **token/credencial realmente sensível** (um `PERSONAL_ACCESS_TOKEN`, um JWT de serviço — token em 3 partes `header.payload.signature`; detalhe no [Glossário](/posts/fundamentos-web-hacking/)). Valide o que achou antes de comemorar.

### Etapa 5 — Fuzzing de conteúdo e parâmetros

Fuzzing = **adivinhação inteligente em massa**. Você pega uma wordlist (lista de nomes comuns: `admin`, `backup`, `api`, `.git`, `config.php`...) e testa cada um contra o alvo pra descobrir conteúdo que não está linkado em lugar nenhum.

**ffuf (apresentando a ferramenta):** *Fuzz Faster U Fool*. O fuzzer web mais usado. Você marca o ponto de injeção com a palavra-chave `FUZZ` na URL, e o ffuf substitui pela cada linha da wordlist.

```bash
go install github.com/ffuf/ffuf/v2@latest

# Descobrir diretórios/arquivos escondidos
ffuf -w wordlist.txt -u https://alvo.com/FUZZ -mc 200,301,302,401,403 -t 10
```

Decifrando:

- `-w wordlist.txt` → a wordlist (cada linha vira uma tentativa no lugar de `FUZZ`). Boas wordlists: as do projeto **SecLists**.
- `-u https://alvo.com/FUZZ` → a URL; `FUZZ` é onde entra cada palavra.
- `-mc 200,301,302,401,403` → quais status considerar "achado". Por padrão o ffuf já casa `200-299,301,302,307,401,403,405,500`.
- `-t 10` → **threads (concorrência). ESTA é a flag-chave pra rate limit.** O default é **40 threads** (rápido, mas barulhento). Em programa que limita requisições, baixe pra `-t 10` ou menos. Existe também `-rate` (requisições/segundo) e `-p` (delay entre requisições) pra controle fino.

> ⚠️ **Lição real de campo:** programas (visto na **Intigriti**, por exemplo) muitas vezes **especificam o limite de requisições permitido nas regras**. Estourar isso pode te derrubar do programa. Threads menores deixam o scan mais lento, mas é o preço de não tomar block. **Leia as regras antes de soltar 40 threads.**

Fuzzing de conteúdo acha coisas valiosas: aquele report real de **PHP Source Disclosure** veio de um `ffuf` com wordlist comum que encontrou `index.php.save` (arquivo de backup) — e dentro dele estavam **variáveis de ambiente com senhas internas**. Bounty pago. Sempre fuzze por `.bak`, `.save`, `.old`, `.git`, `~`.

**katana (apresentando a ferramenta):** um **crawler** (rastreador) da ProjectDiscovery. Enquanto o ffuf adivinha, o katana **navega** o site como um robô, seguindo links, e — crucialmente — **parseia o JavaScript** pra extrair endpoints. É a ponte entre a Etapa 4 e o fuzzing.

```bash
CGO_ENABLED=1 go install github.com/projectdiscovery/katana/cmd/katana@latest

# -jc = rastrear endpoints dentro de arquivos JS;  -d = profundidade;  -rl = rate limit
katana -u https://alvo.com -jc -d 3 -rl 10 -o katana-urls.txt
```

- `-u` → a URL inicial (ou `-list arquivo.txt`).
- `-jc` (*js-crawl*) → **liga o parsing de JavaScript** — pega endpoints que estão dentro dos `.js`. Use sempre.
- `-d 3` (*depth*) → profundidade do rastreamento (quantos cliques de distância). Default é 3.
- `-rl 10` (*rate-limit*) → **requisições por segundo** (default 150 — muito alto pra programa sensível). Abaixe pra ser educado.
- `-kf` (*known-files*) → também busca `robots.txt` e `sitemap.xml`.
- `-jsl` (*jsluice*) → parsing de JS ainda mais agressivo.

**paramspider (apresentando a ferramenta):** especialista em **descobrir parâmetros**. Ele minera os web archives (Wayback) atrás de URLs que tiveram parâmetros e te devolve elas com um placeholder, prontas pra fuzzar valores.

```bash
git clone https://github.com/devanshbatham/paramspider
cd paramspider && pip install .

# -d = domínio;  -s mostra no terminal;  -p define o placeholder do valor
paramspider -d alvo.com
```

- `-d alvo.com` → domínio alvo (ou `-l lista.txt` pra vários).
- `-s` → faz stream do resultado no terminal.
- `-p FUZZ` (*placeholder*) → o valor que ele coloca em cada parâmetro (default `FUZZ`), pronto pra encadear com outras ferramentas.

> **Katana + ParamSpider = "fuzzing passivo".** Uma metodologia testada na prática: pra ser mais educado com o alvo, faça **fuzzing passivo** (katana rastreando + paramspider minerando archives) **antes** do fuzzing ativo agressivo. Você descobre muita coisa sem o barulho de uma wordlist gigante batendo no servidor. Depois complementa autenticado (logado na aplicação) pra ver as rotas internas.

### Etapa 6 — Google dorks e GitHub dorks

**Dork** é uma busca avançada usando operadores (`site:`, `inurl:`, `filename:`) pra encontrar exatamente o que você quer nos índices do Google ou do GitHub. É recon passivo puro — você consulta o índice de outra pessoa.

**Google dorks** — pra achar documentação de API, painéis e arquivos expostos:

```text
# Documentação de API (onde IDs, endpoints e exemplos aparecem de bandeja)
site:alvo.com inurl:apidocs | inurl:api-docs | inurl:swagger | inurl:api-explorer

# Endpoints de API e versões
site:alvo.com inurl:api | inurl:/rest | inurl:/v1 | inurl:/v2 | inurl:/v3
```

O `site:` restringe ao domínio; o `inurl:` casa uma string na URL; o `|` é o operador OR. Um Swagger exposto é um presente: ele **lista todos os endpoints, parâmetros e modelos da API** num só lugar.

E o clássico que extrapola o domínio do alvo — vazamento em SaaS de terceiros indexado pelo Google. Houve um achado real onde um simples `site:trello.com "alvo.com"` revelou um **quadro Trello público** com dados de acesso e referência a um Jira interno da empresa, indexado pelo Google. Generalize: `site:trello.com`, `site:pastebin.com`, `site:s3.amazonaws.com` + o nome/domínio do alvo.

**GitHub dorks** — pra achar **segredos vazados em código**. Devs commitam `.env`, chaves e senhas sem querer o tempo todo. Você busca no GitHub:

```text
# Variáveis de ambiente com chave de API
filename:.env "API_KEY"
filename:.env DB_PASSWORD

# Credenciais e tokens no código, restritos à organização do alvo
org:NomeDaEmpresa password
"alvo.com" api_key
"alvo.com" PERSONAL_ACCESS_TOKEN
```

Esse é o caminho do achado **crítico** real: usuário e senha de **produção** hardcoded num `app.js` exposto no GitHub, dando acesso direto à aplicação (bounty de cinco dígitos). Padrões valiosos: `password`, `client_secret`, `api_token`, `DB_PASSWORD`, `AWS_SECRET`, arquivos `.env`, `config.php`, `.npmrc`, `.s3cfg`.

> 💡 **Automatize a vigilância de segredos:** ferramentas como **trufflehog** e **gitleaks** varrem repositórios inteiros (e o histórico de commits, onde os segredos costumam sobreviver mesmo depois de "removidos") atrás de credenciais com alta confiança.

### Etapa 7 — Varredura por templates com nuclei

Você já tem a lista de hosts vivos do `httpx`. O **nuclei** (também da ProjectDiscovery) fecha o ciclo do recon: é um scanner que dispara **templates** (regras em YAML, mantidas pela comunidade) contra cada host pra detectar **CVEs conhecidas, misconfigurations, painéis expostos, arquivos sensíveis e exposições padrão**. Ele não substitui o teste manual — é a primeira peneira automática que separa "host comum" de "host com algo errado de cara".

```bash
# Instalar
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# -l = lista de hosts vivos;  -severity filtra o ruído;  -rl = rate limit;  -o salva
nuclei -l hosts-vivos.txt -severity medium,high,critical -rl 10 -o nuclei-out.txt
```

- `-l hosts-vivos.txt` → a lista (use a saída do `httpx`; pra um só alvo, `-u https://alvo.com`).
- `-t http/cves/` (*templates*) → roda só uma pasta/template específico (sem isso, usa o conjunto padrão). `-tags exposure,config` filtra por tag.
- `-severity medium,high,critical` → ignora os `info`/`low` e foca no que tende a virar report.
- `-rl 10` (*rate-limit*) → **requisições por segundo** (default **150**, alto demais pra programa sensível). Abaixe.
- `-o nuclei-out.txt` → salva os achados.

> ⚠️ **Nem todo achado do nuclei é vulnerabilidade.** O template aponta um *padrão*, não confirma impacto. Antes de reportar, **leia o que o template faz** e entenda a CVE — muita coisa marcada como `info` (ou até uma CVE com PoC) só "exibe uma tela" sem dano real. Validar o impacto manualmente é o que separa um report aceito de um "informativo" (ou de um falso-positivo que queima sua reputação). Aprofundamos isso em [Security Misconfiguration & CVE hunting](/posts/security-misconfiguration-cve-hunting/).

## Proxies, rotação e o cuidado com rate limit

Recon ativo manda **muitas** requisições. Duas consequências: (1) o WAF/servidor pode **te bloquear por IP**; (2) você pode **prejudicar o alvo** (e violar as regras do programa). A defesa do caçador:

1. **Respeite o rate limit nativo das ferramentas** — já vimos: `-t` no ffuf, `-rl` no katana/httpx/subfinder. **Essa é a primeira linha.** Se as regras dizem "máx. 20 req/s", configure pra isso.

2. **Proxychains pra rotacionar saída.** Quando você *precisa* de mais throughput sem queimar seu IP, roteia o tráfego por uma lista de proxies:

```bash
# /etc/proxychains4.conf (caminho no Kali/Debian; o upstream usa /etc/proxychains.conf)
# -> adicione suas proxies no fim, em [ProxyList]:
#   http  198.51.100.10  8080
#   socks5 203.0.113.5   1080

# Roda qualquer ferramenta através da cadeia de proxies
proxychains4 ffuf -w wordlist.txt -u https://alvo.com/FUZZ -t 10
```

O `proxychains4` intercepta as conexões da ferramenta e as força pela `[ProxyList]`. Na config você escolhe `dynamic_chain` (pula proxies offline) ou `random_chain` (rotaciona aleatoriamente).

3. **Rotação de proxies pra scan pesado.** Pra rodar com muitas threads sem tomar block, monte uma **rotação**: pegue proxies grátis da internet + um verificador que cheque quais estão online (free, mais trabalhoso), ou use um serviço pago por GB (modelo comum no mercado). Passe a lista resultante pro proxychains.

> ⚠️ **Ética e proporção:** proxy não é pra "burlar regra de escopo" — é pra **distribuir carga e não derrubar o alvo nem seu próprio IP**. Se o programa proíbe scan automatizado pesado, proxy não te autoriza a fazer mesmo assim. Recon agressivo demais já tirou gente de programa.

## Como achar programas pra caçar

Recon não serve de nada sem um alvo **autorizado**. Onde encontrar:

- **Plataformas com programas públicos** — qualquer um pode participar:
  - [HackerOne](https://hackerone.com/directory/programs) — o maior diretório.
  - [Bugcrowd](https://bugcrowd.com/engagements) — programas e VDPs.
  - [Intigriti](https://www.intigriti.com/programs) — forte na Europa (e que detalha limites de request nas regras).
  - [YesWeHack](https://yeswehack.com/programs) — bom volume de programas EU/global.
- **VDP (Vulnerability Disclosure Program)** — programas que **não pagam** bounty, mas autorizam o teste e aceitam o report (às vezes com Hall of Fame). São o **melhor lugar pra começar**: você treina recon em alvo real e legal, constrói reputação e **reputação destrava convites privados**.
- **Programas privados (onde está o dinheiro melhor)** — você não escolhe entrar; você é **convidado**. O critério é histórico: reports válidos, sinal-ruído alto, bom comportamento. A escada é: comece em **VDPs e programas públicos** → reporte com qualidade → receba **convites privados** (menos concorrência, alvos menos "raspados", bounties melhores).

> 💡 **Dica de carreira:** o caminho clássico é "VDP pra aprender → público pra ganhar os primeiros → privado pra crescer". Recon impecável é o que te diferencia no público lotado e o que chama atenção pra você ser convidado pro privado.

## Caso real-fictício: do nada a um endpoint admin

> Cenário **fictício, baseado em padrões reais** de bug bounty (anonimizado). Alvo no escopo: `*.alvo.com`.

**Passo 1 — Passivo.** Junto três fontes:

```bash
subfinder -d alvo.com -all -silent -o s.txt
amass enum -passive -d alvo.com -o a.txt
curl -s "https://crt.sh/?q=%.alvo.com&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' > c.txt
cat s.txt a.txt c.txt | sort -u > all-subs.txt   # 812 nomes únicos
```

**Passo 2 — Probing.** Confirmo o que está vivo:

```bash
cat all-subs.txt | httpx -mc 200,401 -title -tech-detect
```

```text
https://app.alvo.com        [200] [Portal do Cliente] [React]
https://api.alvo.com        [200] [—] [nginx]
https://old-panel.alvo.com  [401] [Internal Ops] [Spring Boot]   # <- 401 num painel "Internal Ops": cheiro de coisa esquecida
```

O `old-panel` com **401** e título "Internal Ops" é o alvo. Painel interno, autenticado, mas **público na internet**.

**Passo 3 — JS + construção de path.** Coleto e leio o JS do `app.alvo.com`:

```bash
echo app.alvo.com | gau | grep '\.js$' | httpx -mc 200 -ct | grep javascript
python3 linkfinder.py -i https://app.alvo.com/static/main.js -o cli
```

No `main.js`, lendo manualmente, acho o padrão:

```javascript
const OPS = "https://old-panel.alvo.com/internal/v1";
fetch(`${OPS}/reports/${id}/export`);   // <- padrão: /internal/v1/<recurso>/<id>/<ação>
```

**Passo 4 — Validar.** O endpoint de export, por analogia ao padrão, aceita requisição sem o cookie de admin (falha de autorização). Confirmo no Burp Repeater que `GET /internal/v1/reports/1001/export` devolve um relatório com PII (*Personally Identifiable Information* — dados pessoais como nome, CPF, e-mail; mais no [Glossário](/posts/fundamentos-web-hacking/)). **A partir daqui vira um caso de Broken Access Control** — veja [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/).

**O que a tela mostraria:** o terminal do httpx com o `old-panel` destacado em `401`; o Burp Repeater com a request `/internal/v1/reports/1001/export` à esquerda e, à direita, um `200 OK` devolvendo JSON com dados que não deveriam ser acessíveis sem privilégio.

A moral: **nenhuma etapa sozinha** entregou o bug. Foi subdomínio (recon) + título suspeito (probing) + padrão no JS (análise) + construção manual de path. Recon encadeado.

## Defesa em camadas (para o time azul)

Recon explora o que você **expõe sem querer**. A defesa é reduzir e monitorar essa superfície.

**1. Não exponha o que não precisa estar público.** Painéis internos, homologação e APIs administrativas atrás de **VPN / mTLS / IP allowlist** — não na internet aberta.

```nginx
# nginx: restringe o painel interno a uma faixa de IP confiável
location /internal/ {
    allow 10.0.0.0/8;       # rede interna
    deny  all;              # <- todo o resto é negado (deny by default)
}
```

**2. Monitore CT logs ativamente.** Se subdomínio vaza por certificado, **vigie seus próprios certificados**. Ferramentas/serviços de *certificate transparency monitoring* te alertam quando um novo `*.suaempresa.com` é emitido — você descobre o `staging-novo.alvo.com` antes do atacante.

**3. Mate subdomain takeover na raiz.** Tenha um processo: ao desprovisionar um serviço (bucket S3, app Heroku, Azure), **remova o registro DNS (`CNAME`) junto**. Um job que checa registros apontando pra recursos inexistentes:

```bash
# pseudo-rotina de auditoria: para cada CNAME, checar se o destino ainda existe
dig +short staging-assets.alvo.com    # se aponta pra bucket S3 que retorna NoSuchBucket -> takeover possível
```

**4. Não deixe segredo entrar no repositório.** Scan de segredos no **CI/CD** (pre-commit hook + pipeline) com `gitleaks`/`trufflehog`. Se um segredo *já* vazou, **rotacione a credencial** — remover o arquivo não basta, ele sobrevive no histórico do git.

**5. Higiene de arquivos no deploy.** Pipeline que **impede** subir `.env`, `*.save`, `*.bak`, `.git/` pra produção. Configure o servidor pra negar esses padrões.

```nginx
# nginx: nega backups e VCS expostos
location ~ /\.(git|env)|\.(bak|save|old)$ { deny all; return 404; }
```

> ❌ **O que NÃO basta:** "esconder" o subdomínio sem linkar (CT log expõe), confiar que um endpoint não documentado é seguro (o JS documenta), apagar o segredo só do último commit (o histórico guarda), ou bloquear só o `GET` de um painel e deixar a API por trás aberta.

## Ferramentas + labs legais

| Ferramenta | Pra quê |
|---|---|
| **subfinder / amass** | Enumeração de subdomínios (passiva e ativa) |
| **httpx** | Probing: hosts vivos, status, título, tech |
| **gau / waybackurls** | URLs históricas dos web archives |
| **katana** | Crawler com parsing de JS |
| **ffuf** | Fuzzing de conteúdo e parâmetros |
| **paramspider** | Descoberta de parâmetros via archives |
| **LinkFinder / FindSomething** | Extração de endpoints de arquivos JS |
| **nuclei** | Scanner por templates (CVEs, misconfig, exposições) sobre os hosts vivos |
| **gitleaks / trufflehog** | Caça a segredos em repositórios |
| **proxychains** | Rotação de proxy / controle de saída |

**Pratique de forma legal:**
- [PortSwigger Web Security Academy — Information disclosure](https://portswigger.net/web-security/information-disclosure) (recon e análise; tem o "mystery lab" pra treinar achar do zero).
- [TryHackMe](https://tryhackme.com/) e [Hack The Box](https://www.hackthebox.com/) — trilhas inteiras de recon em ambiente autorizado.
- Monte um alvo seu (uma app de teste, um VPS próprio) pra rodar o pipeline sem tocar em terceiros.

## Checklist do caçador

- [ ] Conferi o **escopo** e os **limites de request** do programa antes de qualquer coisa.
- [ ] Rodei recon **passivo primeiro** (subfinder + amass passivo + crt.sh) e **deduppliquei** tudo.
- [ ] Probing com `httpx` (`-mc`, `-title`, `-tech-detect`); anotei `401`s e títulos suspeitos.
- [ ] Coletei URLs históricas (`gau`, `waybackurls`) e cravei os **parâmetros antigos**.
- [ ] Achei os `.js`, rodei LinkFinder **e** li manualmente atrás de **padrões de path**.
- [ ] Tentei **construir rotas** por analogia ao padrão do JS (não só as que a ferramenta extraiu).
- [ ] Fuzzing com `ffuf` controlando **threads (`-t`)**; busquei `.bak/.save/.git/.env`.
- [ ] Crawler `katana -jc` + `paramspider` pra fuzzing passivo antes do agressivo.
- [ ] Google dorks (swagger/api-docs) e GitHub dorks (segredos/`.env`).
- [ ] Rodei `nuclei` (`-severity medium,high,critical`) nos hosts vivos e **validei cada achado** antes de reportar.
- [ ] Configurei rate limit / proxychains pra **não derrubar o alvo nem meu IP**.

## Pegadinhas / o que NÃO funciona

- **Pular o passivo e ir direto no scan barulhento** → block na primeira hora, alvos mortos testados à toa.
- **Confiar só em ferramenta de extração** → o achado crítico estava num **path construído manualmente** a partir do padrão do JS, não no output do LinkFinder.
- **Desistir no primeiro 403/404** → rota legítima às vezes precisa de bypass (ex.: caractere `;`) ou de estar autenticado.
- **Comemorar toda "secret" do JS** → `VUE_APP_*`, `pk_live_`, sitekeys são **públicas**. Valide se é credencial sensível de verdade.
- **Achar que recon é só rodar ferramenta** → relato real: o diferencial foi **uma fonte de API** que poucos integram ao subfinder e a **leitura humana** do JS. Tooling todo mundo tem; método e atenção, não.
- **Reportar achado do nuclei sem validar** → o template aponta um padrão, não confirma impacto. Leia o template, entenda a CVE, prove o dano — senão vira "informativo" (ou falso-positivo que queima sua reputação).
- **Estourar o rate limit "porque é rápido"** → te tira do programa. `-t` baixo é educação e sobrevivência.

## O que você precisa lembrar

- **Recon vence payload.** Você acha bug onde os outros não olharam — subdomínio esquecido, endpoint no JS, segredo no GitHub.
- **Passivo antes de ativo.** Colete de graça e em silêncio; só depois confirme no alvo.
- **JS é a melhor fonte.** Leia cada detalhe e **construa paths** a partir do padrão, não só extraia.
- **Junte e deduplique** várias fontes — o host que vale o bounty pode ser o que só uma achou.
- **Respeite o rate limit.** Ferramenta rápida demais = block e expulsão.

> 💡 **Dica de ouro:** o recon não termina quando você acha o subdomínio — ele termina quando você **entende a aplicação**. A diferença entre quem fatura cinco dígitos e quem fatura zero raramente é o exploit; é **quem leu o JavaScript inteiro e construiu a rota que ninguém mais viu**.

## Nota ética

Tudo aqui é pra **alvos autorizados**: programas de bug bounty dentro do escopo, VDPs, pentests contratados e labs legais. Enumerar e fuzzar sistemas de terceiros sem autorização é crime — e desnecessário, porque sobra ambiente legal pra treinar. Recon agressivo pode **derrubar** um serviço: controle suas threads, respeite os limites do programa e, ao achar dado sensível, **pare, não exfiltre, e reporte com responsabilidade**.

## Referências

- [ProjectDiscovery — subfinder](https://github.com/projectdiscovery/subfinder), [httpx](https://github.com/projectdiscovery/httpx), [katana](https://github.com/projectdiscovery/katana) e [nuclei](https://github.com/projectdiscovery/nuclei)
- [OWASP Amass](https://github.com/owasp-amass/amass)
- [tomnomnom/waybackurls](https://github.com/tomnomnom/waybackurls) e [lc/gau](https://github.com/lc/gau)
- [ffuf](https://github.com/ffuf/ffuf) · [ParamSpider](https://github.com/devanshbatham/ParamSpider) · [GerbenJavado/LinkFinder](https://github.com/GerbenJavado/LinkFinder)
- [crt.sh — Certificate Transparency logs](https://crt.sh/)
- [PortSwigger — Information disclosure](https://portswigger.net/web-security/information-disclosure)
- [daffainfo/AllAboutBugBounty — Reconnaissance & GitHub Dorks](https://github.com/daffainfo/AllAboutBugBounty/blob/master/Reconnaissance/Github%20Dorks.md)
- [Google Hacking Database (Exploit-DB)](https://www.exploit-db.com/google-hacking-database)

---
*Próximo na série: [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) — onde os subdomínios e endpoints que você achou aqui viram bug de verdade.*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
