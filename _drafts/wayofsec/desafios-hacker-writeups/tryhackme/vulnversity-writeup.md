# 🏆 Vulnversity Writeup

\-- documentações ainda em revisão -- faltando partes - video ja gravado\
\


## Vulnversity

> ### Não vou conseguir lembrar a data certinha da primeira vez que fiz, mas estou recomeçando no tryhackme e este é o writeup q eu gostaria de trazer primeiro.

\


> #### --Vou pular as primeiras tasks que são sobre estar conectado a VPN, ter um sistema com NMAP instalado, estar conectado na máquina do desafio e também pularemos as perguntas que não precisam de resposta.

### Escaneando

#### Scan the box with nmap -sV < machines ip >

```shell
nmap -sV 10.10.84.129
```

![image](https://i.imgur.com/gZqOO8D.png)

O nmap é uma ferramenta gratuita, de código aberto e poderosa usada para descobrir hosts e serviços em uma rede de computadores. Utilizamos o nmap para escanear esta máquina para identificar todos os serviços que estão sendo executados em uma porta específica, mas podemos fazer o uso do programa de algumas formas, como:

#### nmap flag Description

| Nmap flag      | City                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| `-sV`          | `Attempts to determine the version of the services running`                            |
| `-p<x> or -p-` | `Port scan for port <x> or scan all ports`                                             |
| `Pn`           | `Disable host discovery and just scan for open ports`                                  |
| `-A`           | `Enables OS and version detection, executes in-build scripts for further enumeration.` |
| `-sC`          | `Scan with the default nmap scripts`                                                   |
| `-v`           | `Verbose mode`                                                                         |
| `-sU`          | `UDP port scan`                                                                        |
| `-sS`          | `TCP SYN port scan`                                                                    |

```yml
 nmap -sV -Pn 10.10.84.129
```

Podemos utilizar o HELP do shell para saber mais parâmetros e até ajudar a responder algumas questões.

Algumas coisas que gostaria de add aqui para utilizarmos, poderia ser o seguinte:

Usar o mais comum em TODAS as portas / entre as portas especificadas (NO EXEMPLO SÃO TODAS POR TERMOS POSTO AS 65535 PORTAS)

```shell
nmap -sS -p1-65535 10.10.84.129
```

Podemos utilizar uma forma de agilizar os pacotes com o -T4 (cuidado ao usar o -T5 por ter risco de se derrubar).

Podemos, também utilizar uma força maior no 'verbose' para mostrar tudo na tela de forma mais detalhada o q está acontecendo, nesse caso podemos por -vv

```shell
sudo nmap -sS -p1-65535 10.10.84.129 -T4 -vv
```

### Quantas portas estão abertas?

Eu fiz o exercício com o comando:

```shell
sudo nmap -sV -Pn 10.10.84.129
```

A saída sairia - resumidamente e objetivamente - mais ou menos como no exemplo abaixo;

```yaml
┌──(laidler㉿kali)-[~/Documents/seclab]
└─$ nmap -sV -Pn 10.10.84.129
PORT     STATE
21/tcp   open
22/tcp   open
139/tcp  open
445/tcp  open
3128/tcp open
3333/tcp open
```

Podemos ver que temos 6 portas abertas detectadas, o que responde a questão. Resposta>

```yaml
 6
```

### Versão do squid proxy?

No `nmap -sV -Pn 10.10.84.129` mostrado acima, ele não apenas mostra na saída qual a porta e seu estado (aberto), mas também mostra o serviço e qual a versão do mesmo.

Logo, a resposta fica clara na saída deste comando também:

```yaml
┌──(laidler㉿kali)-[~/Documents/seclab]
└─$ nmap -sV -Pn 10.10.84.129
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 7.2p2 Ubuntu 4ubuntu2.7 (Ubuntu Linux; protocol 2.0)
3128/tcp open  http-proxy  Squid http proxy **3.5.12**
3333/tcp open  http        Apache httpd 2.4.18 ((Ubuntu))
```

`Squid http proxy **3.5.12**`

`Resposta>`

```yaml
 3.5.12
```

### NMap escanearia quantas portas com o parâmetro -p-400?

De acordo com o que foi explicado anteriormente, daria para responder numa boa, né? haha.

`Resposta>`

```yaml
 400
```

### Já o parâmetro -n, o que o nmap não irá resolver?

Usando a flag -n no nmap, ele não resolverá os nomes de domínio DNS. Isso significa que o nmap não tentará converter endereços IP em nomes de host. Isso pode ser útil para acelerar as varreduras. Podemos achar essa resposta se usarmos o `HELP` para ver o que cada parâmetro/flag faz.

`Resposta>`

```yaml
 DNS
```

### Qual sistema operacional provavelmente está sendo rodado? Qual porta está rodando o web server?

Ainda usando a mesma saída de `nmap -sV -Pn 10.10.84.129` podemos ver que estamos falando do Ubuntu, com web server na porta 3333, ou seja, temos um site em `http://10.10.84.129:3333`.

> Salvo engano, temos como detectar com o parãmetro -A

`Respostas>`

```yaml
 Ubuntu
```

```yaml
 3333
```

> ## GoBuster - DirBruteforce

GoBuster é uma ferramenta usada para forçar bruscamente URIs (diretórios e arquivos), subdomínios DNS e nomes de host virtual. Para esta máquina, vamos nos concentrar em usá-lo para forçar bruscamente os diretórios. Eu geralmente uso outras ferramentas, como o `dirb` ou `dirsearch`, mas esse é bem legal também.

Qualquer coisa só rodar o `sudo apt-get install gobuster`

Se também tiver no `Kali Linux`, tu vai achar umas wordlists em `/usr/share/wordlists`.

```shell
gobuster dir -u http://<ip>:3333 -w < word list location and/or name >
```

Vamos utilizar para encontrar um diretório que pode ser usado para fazer o upload de um shell.

#### Usando o GoBuster

Utilizei com uma wordlist baixada que se encontra no mesmo diretório.

```shell
gobuster dir -u http://10.10.84.129:3333 -w common.txt
```

> Você pode pesquisar pela wordlist 'directory-list-2.3-medium.txt' que resolverá o desafio.

Parâmetros do GoBuster;

| GoBuster Flag       | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `-e`                | `Print the full URLs in your console`                          |
| `-u`                | `The target URL`                                               |
| `-w`                | `Path to your wordlist` `E.g: /usr/share/wordlists/dirbuster/` |
| `-U and -P`         | `Username and Password for Basic Auth`                         |
| `-p <x>`            | `Proxy to use for requests`                                    |
| `-c <http cookies>` | `Specify a cookie for simulating your auth`                    |

### Qual diretório é uma aba de upload?

Com o comando e uma saída mais ou menos como:

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

podemos perceber que desses diretórios, o único que parece ter algo é o 'internal', então se abrirmos a página `http://10.10.84.129:3333/internal/` iremos perceber que nela temos uma página de upload.

`Resposta>`

```yaml
 /internal/
```

> ## Comprometer o webserver - Exploração da falha
