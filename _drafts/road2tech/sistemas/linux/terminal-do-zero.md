---
description: >-
  Documento criado como auxílio aos estudantes e entusiastas a começar ou
  relembrar sobre linux e seus comandos
---

# Terminal do ZERO

### Linux: Dominando linha de comando <a href="#linux-dominando-linha-de-comando" id="linux-dominando-linha-de-comando"></a>

```
Dominando linha de comando UNIX
Conteúdo perfeito para quem quer conhecer, aprender e/ou masterizar
```

**Pensando em como o material ficaria muito extenso, decidi organizar e separar em algumas etapas, sendo elas:**

**Resumo dos Tópicos**:

1. Introdução a linhas de comando UNIX;
2. Apresentando estrutura do terminal;
3. Os comandos mais importantes do básico para seu dia-a-dia;
4. Dominando terminal - Comandos de filtragem e macetes;
5.  Listagem geral de comandos - _resumão_ de boa parte dos comandos conhecidos;

    _(Os títulos de cada tópico são diferentes de como estão acima)_

> Nota’: Antes de finalizar o primeiro tópico, um pequeno tutorial para quem precisa aprender o terminal, porém só usa Windows.
>
> Nota’’: Finalizando o primeiro tópico, um texto complementar para desmistificar a ideia de linux ser difícil e para usuários avançados / que dominam comandos, o ideal é aprender pelos motivos certos e não por achar que precisa dominar para testar linux. Este texto pode ser pulado.
>
> Nota’’’: Material criado focado nos comandos usados e testados em distribuições baseadas no Debian como o Ubuntu. Mesmo que algumas outras tenham suas pequenas variações, em geral são a mesma coisa. Alguns comandos podem, eventualmente, necessitar de instalação.

### Contextualização e Introdução <a href="#contextualizacao-e-introducao" id="contextualizacao-e-introducao"></a>

Para começar de uma boa maneira, gostaria de contextualizar um pouco sobre o que é cada coisa que abordaremos, para evitar que fique perdido. Um comando nada mais é que uma _instrução/palavra especial_ que pode representar uma ou mais ações. Um interpretador de comandos, mais conhecido como shell ou modo texto, é o responsável por interpretar tais instruções - enviadas pelo usuário e seus programas - para o kernel, que é o núcleo do sistema operacional com a função de fazer a ligação entre o hardware e o software. O shell é o mecanismo por trás dos programas conhecidos como _simuladores de terminal_, que são os tipos de programas que usamos para usar o interpretador de comandos.

> terminal era uma antiga máquina composta basicamente por monitor e teclado. Usada apenas através de linha de comando por não ter uma interface gráfica como hoje.
>
> _Infelizmente, ainda existem pessoas que só veem ‘Linux’ desta maneira…_

Em distribuições Linux você poderá ter vários interpretadores de comandos de sua escolha, entre eles temos o _bash, zsh (ou zshell), tesh, sh, csh e ash_. O mais utilizado e conhecido é o _Bash_, normalmente ele vem como padrão. Existem diversos programas com a função de te entregar um interpretador funcional, o mais conhecido é chamado de _Terminal_. Isso traz mais liberdade de escolha para o conforto do usuário. Tendo em vista que esses programas têm o mesmo propósito, no final das contas eles geralmente acabam sendo a mesma coisa, mesmo que alguns sejam mais customizáveis que outros.

> _Linux_ nada mais é que o nome do _kernel_ desenvolvido em código aberto por Linus Torvalds. _Sistema operacional_ em si são o que chamamos de _‘distribuições’_, sendo elas Ubuntu, Fedora, Linux Mint, Kali, Pop OS!, entre outros. Como muitos confundem e misturam as coisas, alguns nem se dão conta de que o _Android_ também é _Linux_.
>
> O Kernel faz parte do sistema operacional e trabalha em baixo nível por ser o núcleo do sistema. É nele onde trabalham os drivers, por exemplo. Pode-se dizer que, para um sistema operativo, o Kernel é tal qual o que o motor é para um carro. Portanto, falar “o sistema operacional Linux” está tecnicamente errado. A generalização com Linux pode ser feita para facilitar o entendimento da mensagem, o problema vem quando começa a cobrança de alguns para com “o linux”.

\~Aprenda pelo **Windows**;

Antes de mais nada, acho importante falar sobre os _usuários de Windows_. Muitos querem aprender a usar o terminal linux, mas continuam “presas na janela”, e isso **não é um problema**, necessariamente. Mesmo que não possa formatar o pc, você ainda tem três opções que podem quebrar seu galho:

* Dual boot : Sistema Linux e Windows juntos na mesma máquina.
* Máquina Virtual : Linux rodando dentro do seu windows por uma máquina virtual, como virtualbox.
* **WSL** - Subsistema do Linux para Windows : Terminal Ubuntu em Windows. O atual WSL2, por mais que não seja a mesma coisa, pode se tornar um excelente quebra galho para quem não quer se desfazer do seu sistema e costume pessoal de uso, principalmente por motivos profissionais.

Aqui vai um rápido guia para utilizar este terminal no seu windows:

* Apertar “_Win+r_”
* Digitar “_optionalfeatures_”
* Ativar / Marcar a caixinha “_Subsistema do Windows para Linux_”
* Reiniciar
*   Baixar e abrir o terminal linux na loja de apps da microsoft pelo nome da distribuição, como por exemplo o _Ubuntu_.

    \~Caso não dê certo, aparecendo uma mensagem de erro no terminal, não se assuste!

    Tente, então, abrir o _powershell_ como _administrador_ e cole cada comando abaixo, seguido de _reinicialização da máquina_:

```
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
```

```
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Pronto! Já tendo baixado o terminal na microsoft store, agora é só abrir, configurar o usuário e utilizar o terminal pelo windows como se tivesse no Ubuntu.

Claro, lembre-se que usar o WSL é apenas um quebra galho e tem suas limitações, fique atento quanto a isso.

Para funcionar o WSL e as máquinas virtuais junto, antes de reiniciar, aproveite o powershell/cmd já aberto como administrador e cole: bcdedit /set hypervisorlaunchtype off

> Aviso: Normalmente, para funcionar é recomendado que esteja com o sistema atualizado, pelo menos até a build 16215.0, e necessariamente precisa ser um sistema com arquitetura de 64 bits. Fique atualizado aos requisitos e modo de instalação estando de olho no site da Microsoft. Este guia foi apenas o que eu testei a um tempo e deu certo, então - por não ser um guia oficial - é recomendado seguir o tutorial oficial e qualquer problema deve ser resolvido com o suporte deles.

**Tá, ok… tudo certo até agora, mas…**

**… antes de irmos direto aos comandos e explicações, vamos tentar desmistificar algumas coisas…**

_É comum a propagação da ideia de que “Linux é para usuários avançados” e/ou “para programadores”, além do “precisar saber e dominar linhas de comando”. Essas coisas assustam muitos usuários alheios sem necessidade, como se fosse difícil e obrigatório. Até porque, a maioria dos tutoriais disponíveis na internet são feitos via terminal, o que gera essa falsa sensação, para leigos, que para fazer as coisas sozinho precisaria ser ‘expert’. Claro que eles estão passando de uma forma que dificilmente dá errado e que é o rápido e prático copiar e colar, mas isso acaba alimentando um pouco essa problemática e faz com que certos leigos passam longe da ideia de usar ou testar o ‘pinguim’ - pelo menos até que se torne realmente necessário usar e aprender, ainda podendo vir um certo nervosismo de aprender para quem não quer sair da zona de conforto. O fato é que não é obrigatório e nem necessário saber sobre linhas de comando para utilizar o sistema no seu dia a dia, principalmente quando se trata de um usuário comum, já que tudo de necessário poderá ser feito via interface gráfica, assim como no Windows, Mac e Android. Para simplificar ainda mais, os novos usuários linux não precisam ir pro ubuntu direto, o ideal seria escolher uma distribuição agradável e fácil de mexer, como Zorin OS e Linux Mint, excelentes para quem quer um sistema bom, leve, baseada em ubuntu e com visual mais próximo do que já está acostumado com o windows. Ainda que não seja necessário dominar linhas de comando, particularmente ainda acho interessante ter alguma noção para saber o que está rodando ao ‘copiar e colar’ os comandos de tutoriais alheios, por exemplo, e isso também deve ser considerado com prompt de comando do windows. Não é nada difícil, a maior parte dos comandos chegam a ser intuitivos e fáceis de memorizar por serem abreviações de palavras, autoexplicativos ou de fácil memorização._ _Mesmo assim, reforço mais uma vez que para “usar linux” não é necessário ser um usuário avançado e aprender comandos. Já para usuários mais avançados e estudantes de alguma área da computação, saber e dominar o terminal pode se tornar algo fundamental, até porque o terminal se torna uma ferramenta muito útil - inclusive para saber algum erro de alguma aplicação rodada através dele. Por isso aq ajudo vocês a dominarem essa ferramenta, listei uma série de comandos para que seja possível fazer diversas coisas do seu dia a dia direto pelo terminal, e por isso que é um material bastante extenso, mas bem completo._

### Terminal à primeira vista <a href="#terminal-a-primeira-vista" id="terminal-a-primeira-vista"></a>

```
Tópico voltado a quem ainda não conhece direito o terminal, mostrando o que é cada coisa de sua estrutura.
```

Ao abrir o terminal podemos notar que existe uma formatação padrão inicial, exemplo; **Matheus@Ubuntu:\~$** ==> **‘Usuário’ @ ‘PC’ : ‘diretório’ ‘modo de usuário’**

* _**Usuário**_ é o nome da conta da atual sessão, mostra qual conta está sendo usada no terminal atualmente, começando com a que está usando o sistema. Você verá como poderá criar novos perfis, configurar e alternar entre eles pelo próprio terminal.
* _**PC**_ é o nome dado para sua máquina, normalmente dado ao instalar o sistema.
* _**Diretório**_ é a pasta em que se encontra no momento, ou seja, mostra em qual diretório está acessando pelo terminal. Por padrão vem na pasta _home_ do usuário, indicado como **\~**, diretório o qual contém os documentos, downloads, etc.
* \_**Modo de usuário** é o modo do usuário dessa sessão. Normalmente a simbologia do privilégio de usuário comum é dado como **$**. Existe o modo de superusuário e certos comandos o exigem para serem feitos. Ao mudar o tipo de usuário de comum para o de privilégio elevado, o símbolo pode passar a ser representado por **#** se não for alterado o privilégio apenas para comandos isolados.

_Mas e então, como usar outros usuários? Como obter o privilégio de superusuário? Veremos isso nos próximos tópicos._

### Principais comandos para se virar no terminal <a href="#principais-comandos-para-se-virar-no-terminal" id="principais-comandos-para-se-virar-no-terminal"></a>

> Aprimorando conhecimento.

### Dominando os principais comandos <a href="#dominando-os-principais-comandos" id="dominando-os-principais-comandos"></a>

É importante saber primeiro dos comandos **man** e **help** de algum comando específico, pois te auxiliarão a aprender praticamente qualquer comando. Com eles você aprenderá como usar e o que eles fazem.

```
man < comando > ;
< comando > -h  ;   
< comando > --help ;
< comando > --h ;
help < comando >
```

**Usuários e Privilégios**

_Comandos básicos para administrar os usuários e seus privilégios_

_**Usar comandos que requerem privilégio**_ ~~(parte 1)~~ Certos comandos só serão executados se o usuário tiver um privilégio elevado.

Para usarmos comandos específicos como um superusuário podemos usar o comando **sudo**.

> _Pode ser lido como Superuser DO_ ao usá-lo antes de algum comando. Fica mais fácil de lembrar. Se para executar o comando _x_ é necessário privilégio de superusuário, escrevemos “superusuário faça _x_”, ficando “super user do _x_”, resultando em “_sudo x_” abreviadamente.
>
> _Explicação bem detalhada e importante sobre como funciona o sudo no final deste sub-tópico_, ou seja, na parte 2 do **Usar comandos que requerem privilégio**.
>
> _**ps**: Somente usuários do grupo **sudo** podem usar este comando. O padrão do sistema já vem neste grupo._

_**Criação de usuários**_

> Comandos: _**adduser**_ ; _**useradd**_

O _useradd_ cria um novo usuário mas sem criar uma pasta home para o mesmo, apenas adiciona um novo usuário ao arquivo /etc/passwd, diferentemente do comando _adduser_. Porém, ambos precisam de permissão para serem executadas.

```
Exemplo;
Para criar o usuário banana;
sudo useradd banana  (sem pasta home própria)
sudo adduser banana  (com pasta home própria)
```

_Normalmente, em sistemas como Ubuntu e outros, o comando adduser tende a criar o usuário completo, com senha predefinida, nome completo, informações extras etc (sendo opcional não colocar elas), pasta home, etc. Já em algumas outras ainda precisam add alguma dessas coisas por outros comandos, como a criação da senha, que veremos no próximo tópico._

> Num geral, o comando adduser também pode conseguir adicionar usuários a um grupo, como no grupo ‘sudo’ para executar comandos que exijam privilégio: **sudo adduser **_**banana**_** sudo**

Para moderar os usuários existe o comando `usermod`, tendo algumas funções bem interessantes:

_Criar nova pasta home; alterar possível data de expiração; alterar grupos; alterar nomes; alterar shell; etc_

> Num geral, o comando usermod também pode adicionar um usuário ao grupo sudo:
>
> **sudo usermod -aG sudo banana**
>
> * main example: usermod -aG
> * \-a = Anexar (attach)
> * \-G = Grupo (group)

_**Manipulação da senha de usuários**_

Com o comando **passwd** adicionaremos, tiramos ou alteramos a senha de algum determinado usuário

Bastando digitar o nome do mesmo (Exemplo 1);

Para retirar a senha dele basta usar o **-d** (Exemplo 2);

Para trocar ou adicionar senha do root não precisa necessariamente especificar seu nome, o passwd reconhece o root se caso nenhum usuário seja especificado. Acaba bastando usar o sudo (para privilégio) e o passwd juntos para alterar ou adicionar a senha. (Exemplo 3);

```
Exemplo 1; Mudança de senha>
banana@pc:~$ passwd banana
Changing password for banana.
Current password:
New password:
Retype new password:
passwd: password updated successfully

Exemplo 2; Retirando senha>
banana@pc:~$ sudo passwd -d banana
[sudo] password for banana:
passwd: password expiry information changed.
			
ou
			
sudo passwd -d banana
[sudo] senha para banana: 
Removendo senha para o usuário banana.
passwd: Sucesso

Exemplo 3; Adicionando e/ou alterando a senha do root>
banana@pc:~$ sudo passwd
[sudo] password for banana:
New Password:
Retype new password:
passwd: password updated successfully
(pediu a senha do user banana para alterar a do root - explicação sobre isso na parte dois do tópico de privilégio sudo)
```

Para saber outras opções do comando, digite: _passwd -h_

_**Exclusão de usuário**_

Para deletar o usuário ‘banana’ que criamos, podemos usar

_Com o **deluser** Também podemos retirar o usuário de algum grupo. Podemos retirar o banan do sudo_

_**Troca de usuário**_

**su** é o comando que se dá para a troca de usuários, vem do inglês _“substitute user”_ - também podendo ser lido como _Switch User_. Caso ele seja utilizado solto, ou seja, sem especificar qual usuário deseja, ele assumirá que quer trocar para o superusuário do sistema, normalmente chamado de root. Logo, o _su_ e _su root_ são a mesma coisa - sendo assim, pode memorizar o comando _su_ sozinho como _Super User_.

> su -> Switch user su -> Super User

A diferença entre o **su -** e o **su** é que, o “**-**” específica para o comando simular um _login real/direto_, já o **su** indica apenas uma _“troca de usuário aqui”_. Ou seja, o comando _su ‘username’_ troca de usuário se mantendo no diretório atual, diferentemente de quando usa _su - ‘username’_, que já troca de usuário direto pra própria ‘home’ do usuário logado.

> Lembrando: Pasta ‘home’ é a pasta principal de cada usuário, onde fica os Documentos, Downloads, Desktop, etc

```
Trocando para o novo usuário chamado banana
|-----------------------------|
|  Exemplo 1; 				 ~ Troca de usuário normal
| matheus@pc:~$ su banana     
| Password:
| banana@pc:/home/matheus$ 
|-----------------------------|
| Exemplo 2;				 ~ Troca de usuário simulando um login direto
| matheus@pc:~$ su - banana
| Password:
| banana@pc:~$
|-----------------------------|
```

> Dica
>
> O comando _**exit**_ pode ser usado tanto para sair da conta do usuário logado pelo terminal, quanto para fechar o terminal ao ser usado no seu usuário padrão.

_**Grupos para usuários**_

Já falamos por cima de alguns comandos em relação a grupos anteriormente, mas aqui estão os comandos para tal ação:

Criando grupos:

```
sudo addgroup groupname
sudo groupadd newgroup
```

Deletando grupos:

```
sudo groupdel groupname
sudo delgroup groupname
```

Moderando grupos:

```
sudo groupmod -h
sudo modgroup -h	
```

> Com este comando podemos fazer algumas coisas, como alterar o nome dos grupos: sudo groupmod -n novo\_nome

Adicionando um usuário a um grupo;

```
usermod -aG group username
adduser username group
```

_**Usar comandos que requerem privilégio**_ ~~(parte 2)~~

**Entenda melhor o comando SUDO**

Ele funciona para dar permissões de outros usuários - _em geral do superusuário_ - para o atual, bastando apenas digitar a senha do mesmo. Porém, isso só funciona pois ele foi adicionado no _grupo sudo_, as distros normalmente já deixam o primeiro usuário com _privilégios sudo_ e por isso o comando funciona sem problemas.

​ O superusuário não precisa usar o comando sudo por já ter todas as permissões de forma padrão e pré-configuradas no arquivo _sudoers_. É neste arquivo, _localizado em /etc/_, que a configuração do comando sudo é dada. Ou seja, é nele que é dado ao _grupo sudo_ a capacidade de executar qualquer comando, assim como também é dado o privilégio do usuário root.

Basicamente, um novo usuário **não** poderá usar _sudo_ até que seja adicionado ao grupo _sudo_, que já está configurado no arquivo sudoers por padrão. Sabendo disso, podemos mostrar que _para usar qualquer comando com privilégio_ basta digitar `sudo su`

> lembrando que o “su” sozinho reconhece como uma troca para o superusuário, mas para isso precisa ter privilégios de superusuário, que é garantido pelo “sudo”. Assim você troca pro superusuário com apenas a sua senha. Será melhor explicado abaixo:

O comando `sudo`, como vimos, nos permite usar privilégios de outros usuários. Para isso é necessário estar dentro do grupo de usuários chamado _sudo_. Na primeira vez que digitamos o comando na sessão é necessário digitar a senha do usuário para confirmar que quer usar comando de privilégio mesmo, pois estamos pegando emprestado o privilégio de root para que possamos fazer um comando como se fossemos ele. Então, `sudo` nos permite fazer tudo que um root faz só que usando a própria senha, sem precisar saber a senha do root em si. O comando `su`, sem especificação de usuário, entende que o usuário ‘especificado’ é o próprio root, e por isso pede a senha do mesmo. Se você pode usar o comando `sudo` para executar **qualquer comando de superusuário** com a **sua senha**, logo você poderá usar o comando para entrar como root usando a sua senha. Por isso a junção `sudo su` entra no root pela senha do seu usuário, tal qual entraria em outro usuário com a senha do atual, como por exemplo o `sudo su banana`. Por isso é possível adicionar e mudar a senha do root sendo pedido apenas a senha do seu usuário (“sudo passwd root”). Em outras palavras, quem está no grupo sudo também é um root, a diferença é que o root fica com esse privilégio direto, um usuário normal no grupo sudo só tem esse privilégio ao usar o comando, o que acaba sendo um pouco mais seguro, já que ter privilégios elevados também indica que você tem o poder de rodar comandos que podem eventualmente quebrar o sistema ou aplicação de algum modo, se é necessário desbloquear como sudo então você vai saber o que está fazendo (é o que se espera) e ficará por sua própria conta e risco.

#### Comandos de sistema <a href="#comandos-de-sistema" id="comandos-de-sistema"></a>

* _**Advanced Packaging Tool**_** (apt)**

Em sistemas baseados em Debian, como Ubuntu, utilizam o `apt` como gerenciador de pacote como padrão.

> comando antigo: apt-get; foi abreviado para somente apt, ainda podendo utilizar os dois)

_Existem outros gerenciadores de pacotes também, como o dnf / yum que é usado no Fedora.; o pacman no Arch; apk no Alpine, etc. Mas não abordaremos outros gerenciadores por aqui. Normalmente seguem um padrão parecido, mas fique ligado na documentação da sua distro e saiba dos comandos apropriados para ela._

> Os comandos podem pedir privilégio, então deve-se usar junto do comando `sudo` .

**Instalar e reinstalar programas**

`apt install` < nome do programa >

`apt reinstall` < nome do programa >

> também pode reinstalar fazendo um purge no programa e instalar dnv, o comando para isso será mostrado em breve

​ Extra:

Seu sistema tendo suporte a flatpak, snap,ou outros pacotes ‘universais’ do mundo linux, sua gama de apps podem aumentar e ter, assim, novas formas de instalar programas tbm, podendo ser usado por interface gráfica (ou pela distro, ou por sites doss catálogos; como snapd e flathub) ou pelos comandos;

`sudo snap install` < nomedoprograma > `sudo flatpak install` < nomedoprograma >

Podemos instalar o flatpak e snap pelos comandos

`sudo apt install snapd`

`sudo apt install flatpak`

> pacotes snaps e flatpaks são universais para serem usados em qualquer distribuição linux, eles vem com as suas dependências juntas e compactadas em um único pacote; também temos os arquivos AppImage com a finalidade de compatibilidade geral dos programas para diferentes plataformas Linux

Caso precise **adicionar o repositório** do flatpak:

`sudo add-apt-repository ppa:alexlarsson/flatpak`

> O comando `add-apt-repository ppa:` é para adicionar o repositório de um programa para que ele seja add ao sistema, assim você pode instalar e atualizar este programa. Sempre depois de add um PPA faça um update, que veremos no próximo bloco;

**Atualizar sistema**

`apt update` (Baixar pacotes)

​ _**seguindo de**_

`apt upgrade` (Instalar os pacotes) ; `apt full-upgrade` ou `apt dist-upgrade` (instalando os pacotes baixados e desinstalando outros pacotes se necessário para concluir certas instalações)

Para mudar de release, nova versão do seu sistema - como do ubuntu 19.10 pro 20, deve rodar este comando **após** o _upgrade_:

`apt do-release-upgrade`

Em caso de alguns erros, o comando dpkg, que é de gerenciamento de pacote, pode te ajudar: `sudo dpkg --configure -a`

**Remoção**

Remover programas; antigas dependências; etc

`apt purge` < nome > - remover programa junto com os arquivos de configuração ou dados do pacote. _(Não removerá os arquivos de configuração caso esteja dentro da pasta inicial / home do usuário)_

`apt remove` < nome > - remover um programa sem mexer nos arquivos de configuração ou dados do pacote.

`apt autoremove` - remover pacotes que não são necessários; muitos pacotes são instalados como dependência para outros e que depois deixam de ser úteis.

**Verificação**

Gerar relatório sobre o total de pacotes disponíveis : `apt-cache stats`

Para verificar dependências quebradas : `apt-get check` < nome >

Para procurar por programas : `apt search` < nome >

Ver detalhes do pacote : `apt show` < nome >

Listar pacotes : `apt list` < nome > Listar pacotes com certa nomenclatura ou todos os pacotes deixando em branco

* **Outras funcionalidades**

shutdown -> desligar o pc \[ podendo usar para programar o desligamento em segundos: shutdown -t 9800 (tempo em segundo) e dps -c para cancelar ]

reboot -> reiniciar o pc

kill -> matar algum processo / fechar algum programa

mount -> montar algum dispositivo como HD

ping -> Enviar pacotes para um serviço; pingando um site para testar a conexão vendo o tempo de resposta e IP, por exemplo.

* _**Informação**_

date -> data e hora

pwd -> diretório atual

uname -> informação geral e kernel

ifconfig -> interface de rede

whoami -> usuário atual

route -> tabela de roteamento (IP Routing tables)

free -h -> ver uso de memória

arch -> arquitetura da CPU

ps -> listar processos em execução

top -> listar esses processos e uso de hardware (resumo)

nohup -> ignorar sinais de interrupção; rodar comando em segundo plano mesmo no logout

vmstat -> tabela de status da memória virtual do sistema

free -> Uso de memória ram _\[-h mostra em mega ou em giga]_

lscpu -> Descobrir informações sobre a CPU

lshw -> listar hardwares

#### Utilidades no terminal <a href="#utilidades-no-terminal" id="utilidades-no-terminal"></a>

* **Manual de comandos, histórico e limpeza**

```
man <comando>  ex: man bash
apropos <algo> -> (pesquisar algo no manual do sistema)
history -> histórico dos últimos comandos usados
clear / {Ctrl + L} -> limpar a tela do terminal
```

* **Listagem de conteúdos do diretório**

```
ls -> comando de listagem
ls -a : para tbm os itens ocultos
ls -l : para mais informações de cada arquivo, como as informações de permissões	ls -la : listar tudo com informações
tree -> listar em formato árvore
```

* **Caminhando entre pastas/diretórios**

Comando: `cd` = _change directory_

```
Exemplos;
cd /    = ir para a raiz do sistema
cd /etc = ir para a pasta etc
cd ..   = voltar uma pasta, voltando pra raiz
cd ~    = indo pra home do seu usuário
etc
```

> Aviso: Pode não funcionar da melhor maneira dentro de scripts de shell

> WSL: Para quem usa o terminal no w10 - poder ser bacana trabalhar dentro da pasta que você também usa direto pelo windows, como o seu desktop. Pra isso pode usar `cd /mnt/c/users/username/desktop` mudando o ‘username’ pelo seu usuário.

* **Leitura e exibição de arquivos**

```
less - ler arquivos com paginação (podendo avançar e retroceder) e salvar saída desejada;
less <nome_do_arquivo>

more - ler arquivos
more <nome_do_arquivo>

cat - mostrar conteúdo do arquivo
cat <nome_do_arquivo>
```

* **Criando arquivos**

```
touch - criar arquivo em branco
touch nome_do_arquivo  

nano - editor de texto padrão (serve para programação)
nano nome_do_arquivo (nome do arquivo que quer editar ou criar)

echo - Apresentar um texto. Podemos criar um arquivo com escrita dentro (também pode ser usado pra add uma escrita em um arquivo existente, ou alterar todo o texto do arquivo)
echo mensagem > nome_do_arquivo
```

* **Criando pastas e removendo pastas**

```
mkdir (make directory) -> criar pasta  / diretório
mkdir <nome_da_pasta>
```

```
rmdir (remove directory) -> remover APENAS diretórios vazios
rmdir <nome_da_pasta>
```

```
rm -d (remove) -> diretórios vazios
rm -rf -> diretórios cheios
rm -rf <nome_da_pasta>

.Para remover um arquivo com que inicie o nome com -
rm ./-<nome>
rm -- -<nome> 
```

_nota: Aqui teve mais aprofundamento do comando rm, mas também será falado nos comandos de manipulação de arquivo_

* **Criando atalhos/links**

```
ln -> fazer link entre arquivos - Criar atalhos
ln <nome_do_arquivo> <nome_do_atalho>
---------------------------------------------
exemplo prático:
echo a > a.txt  		
ln a.txt atalho.txt 	
cat atalho.txt 
a
---------------------------------------------
```

* **Localizar programas, comandos e arquivos**

```
locate - localizar arquivos
locate <nome>

which - localizar um comando - diretório
which <comando>

whereis - localizar arquivos binários, o seu código-fonte e a página de manual
whereis <arquivo/comando> 

 find - procurar arquivos de um diretório ou até um específico
 find /home/nomedeusuario/Documentos -> listando todos os arquivos de docs
 find / -name nome.txt -> achar o caminho exato do arquivo tal (precisa saber o nome e a extensão certa para achar o arquivo e mostrar o diretório correto)
 o / é para procurar em toda a raíz, podendo colocar um diretório específico
 o -name é para especificar que vai procurar pelo nome que será escrito logo depois.
Pode ser usado com filtros para uma saída melhor e achar algum arquivo específico sem saber ao certo a extensão ou apenas sabendo a extensão e não o próprio nome (veremos logo a frente)
```

* **Manipulando arquivos**

```
rm (remove) -> remover arquivos e diretórios
rm <nome-do-arquivo>

mv (move) -> mover ou renomear arquivos
mv <arquivo> <novo_lugar> 
mv <arquivo> <novo_nome>

cp (copy/copia) -> copiar arquivo
cp <arquivo> <novo_lugar>

file -> informação do arquivo
file <arquivo>

rename -> renomear arquivo
rename <arquivo> <novo_nome>

tar - zip - 7za - rar - bz2 - gzip .. -> compactar e descompactar arquivos
(pro rar: sudo apt-get install rar unrar)
	Compactar arquivos:
	7za a arquivo.7z pasta-arquivos_compactar (caso tenha o 7z instalado)
	tar -zcf nome_arq.tar nome_do_diretrio__do_arquivo_ou_dos_arquivos
	Pode compactar em tar.gz agora, dps do tar: gzip -9 nomedessearquivo.tar
	Ou até em tar.bz2 com: bzip2 nome_arq.tar
	Compactar direto em tar.gz:  tar -cz arquivo > novonome.tar.gz
	tar -cz Pasta > arquivo.tar.gz (pasta inteira)
	Mesmo comando tbm serve para bz2: tar -cz arquivo > nome.tar.bz2
	gzip document.txt
	gzip -c document.txt> new_name.gz
	bzip2 document.txt
	bzip2 -c document.txt> name.bz2
	rar a compactada.rar pasta/
	rar a compactada.rar pasta/ -p senha
	zip nome.zip arquivo
	xz arquivodesejado (para .xz)
	tar -cz Pasta/Arquivo > arquivo.tar.xz
	
	
	Descompactar arquivos:
	7za e arquivo.7z ;
	unzip arquivo.zip ;
	unrar x nomedoarquivo.rar ;
	unxz  arquivo.xz  (unxz is equivalent to xz –decompress);
	unzip arquivo.zip linux64/* -d /pasta/ ;
	tar -xvf nomedoarquivo.tar ;
	tar -vzxf nomedoarquivo.tar.gz ;
	bunzip nomedoarquivo.bz2 ;
	tar -jxvf nomedoarquivo.tar.bz2 ;
	gzip -d pacote.tar.gz ;
	bunzip2 pacote.tar.bz2 ;
	tar -xz Pasta < Arquivo.tar.gz
	tar -vxf Backup.tar.gz
	gunzip documento.gz
	tar -xjvf arquivo.tar.bz2 -C /pasta/
	tar -xvf arquivo.tar.xz
	uncompress arquivo.Z


dpkg - rpm -> gerenciador de pacotes de software

chmod -> privilégio de arquivo
chmod +x <arquivo>

stat - fornecer status/informações sobre arquivos e diretórios

source - executar um arquivo no shell
	O comando source é um comando interno do shell sendo usado. Para saber mais sobre ele podemos usar o help => help source

```

* **Comparar arquivos**

```
diff - "differ" - Compara diretórios e arquivos linha por linha
diff <nome_do_arquivo_1> <nome_do_arquivo_2>
diff <nome_da_pasta_1> <nome_da_pasta_2>
A saída da comparação dos arquivos pode parecer confusa. Podemos melhorar o comando pra saídas que queremos pra cada situação.
diff -n (saida normal) ; diff -s (reportar qnd os arquivos são os mesmos) ; 
diff -q (reportar qnd os arquivos forem diferentes) ; diff -y (comparação em duas colunas) ; etc

cmp - "compare" - Comparar arquivos - ver se dois arquivos são iguais (em caso de diferença, não sairá nenhum resultado)

sdiff - comparar dois arquivos e tabelar com informações
	Se as linhas forem idênticas, são mostradas em cada lado da tabela, separadas apenas por espaços.
	Se uma linha existe apenas no primeiro arquivo, um sinal < é mostrado no final da linha da tabela.
```

```
dominando o terminal com atalhos, múltiplos comandos, separadores, filtros, etc.
```

**Comandos simultâneos**: aprendendo a usar separadores, sequências de comandos e atributos especiais

Podemos fazer mais de um comando em uma mesma linha, como por exemplo colocar a atualização do sistema (o apt update e upgrade) para funcionarem automaticamente escrevendo apenas uma linha: `sudo apt update && sudo apt upgrade` Explicarei resumidamente a funcionalidade das caracteres especiais `&&` , `;` , `&` , `||` , `|` , elas podem se mostrar úteis para determinadas situações. Estas não possuem o mesmo significado.

O **`&&`** significa um “and” **(`e`)**, funciona de forma a executar o segundo comando apenas, e somente apenas, se o primeiro der um status existente de 0 (sucesso de execução). Em outras palavras, serve para chamar um comando caso o outro não retorne erro, assim o bash emite um sinal de 0 e o operador && chama o próximo comando. Para funcionar em script, as duas precisam ser verdadeiras, como { 1>0 && 0==0 } para que os comandos dentro deste if sejam utilizados.

Já o **`&`** Executa o segundo comando independentemente do resultado do comando anterior. Porém, a sua principal função é executar o comando posterior a ele em background em uma subshell e não esperar o comando finalizar, sempre retornando um status 0 (por isso um cd antes do & não funciona direito). Sendo assim, pode ser usado no final de um comando, o que significa que você quer executar aquele comando e já liberar o terminal para outros, sem aguardar o resultado do último.

O **`;`** significa o fim da linha do tal comando, como um delimitador, fazendo o bash pular pro próximo - como comandos independentes - funcionando de forma a ser indiferente se algum está dando erro ou não. Acaba sendo mais usado para os scripts.

O **`||`** significa um “or” **(`ou`)** e também depende do resultado do último comando, assim como o _&&_ ele também é um operador de comparação. Em outras palavras, eles servem para testar se duas ou mais expressões são verdadeiras ou não. Mas o `||` Funciona de forma a usar um comando mesmo em caso de que um dê erro, ou seja, retorna verdadeiro se pelo menos UMA das expressões fornecidas for verdadeira, diferentemente do && que necessita que as suas sejam verdadeiras.

Já o **pipe** (`|`) acaba sendo usada mais para filtros que tornam os comandos mais práticos. A sua função nada mais é que fazer uma comunicação entre processos. A exibição de um comando vai variar dependendo do comando dado após o pipe, como um filtro. Se eu estiver nos “meus documentos” e botar um `ls`, mostrará tudo que tem lá. Se eu só quiser a listagem de arquivos que tenham “_aula_” no nome, colocaria `ls | grep aula` e pronto! listou apenas os arquivos e documentos que tinham aula no nome. Ou seja, jogou a saída do primeiro comando pro segundo para executar este segundo em cima da saída do anterior, e por aí vai.

Outro exemplo prático (da net):

```
 ls | grep b | sort -r | tee arquivo.out | wc -l
```

* O comando “ls”, como bem sabemos, lista o conteúdo do diretório, porém devido ao pipe ele não envia o resultado para tela e sim ao comando “grep b”.
* O comando “grep b” por sua vez filtra os nomes de arquivos que contém a letra “b”. Devido ao segundo pipe a saída do comando “grep b” é enviada para “sort -r”, que classifica os nomes em ordem crescente.
* A saída do “sort -r “ é então passada para o comando “tee”, que divide os dados em dois, como se fosse uma conexão em t, fazendo com que as informações processadas pelo comando “sort -r” sejam escritas no arquivo “arquivo.out”.
* Então o comando “wc -l” conta as linhas do arquivo “arquivo.out”. Assim obtemos como resultado a quantidade de arquivos que contém a letra “b” impresso na tela e o nome desses arquivos em “arquivo.out”.

_Recapitulando em resumo básico>_

```
pipe '|' -> tem a função de redirecionar a saída de dados de um comando. Acabada, então, sendo muito utilizado para rodar algum comando de complemento e/ou filtragem de saída.

; -> delimitar / marcar o final da linha
& -> chamar próximo comando
&& -> *E (and)* -> chamar o próximo comando apenas após a execução do primeiro e se for necessariamente verdadeira (comando bem sucedido)

|| -> *OU (or)* -> Operador de comparação (tal qual &&), retorna verdadeiro se pelo menos uma das expressões fornecidas for verdadeira
```

**Comandos de filtragem e manipulação de texto**

```
aprendendo a usar comandos de filtragem e manipulação para um domínio de terminal, organização e escolha de saída para poupar tempo
```

Primeiramente falaremos do comando de filtragem GREP pois já mostramos ele antes, mas vale mais uma explicação e seu manual. A função dele é procurar por trechos de texto (strings) dentro de diretórios e arquivos, retornando para você em quais arquivos a string foi encontrada.

Podemos usar o comando find (procurar) com ele e especificar o nome do arquivo ou a sua extensão.

```
find /home/matheus | grep exemplo   -> achar o arquivo com nome exemplo (qualquer extensão) 
find /home/matheus/Documentos | grep .psd  -> achar arquivos com psd, podendo ser a própria extensão (qualquer nome com asp ou com extensão psd será mostrada) 
  - em casos de extensão comum, mais prático usar o grep com o nome do arquivo somente

Agora estamos filtrando toda a saída do find para mostrar só o que tem algo que está especificado com o grep.
```

Estamos vendo agora, nessa parte complementar, a maior parte dos comandos que eu chamo de utilitários. É onde realmente começa esse tópico de filtragens.

Será mostrado o comando, o que ele faz, como usar e uma exemplificação - tudo seguindo o próprio manual, fontes de resumo da net e de meus próprios testes em alguns complementos.

É importante frisar que alguns dos comandos podem já terem sido comentados anteriormente também. _Inclusive,como já dito, começaremos pelo próprio grep_

**grep**

Uso:

grep \[OPÇÃO]… PADRÃO \[ARQUIVO]… Busca por PADRÃO em cada ARQUIVO. Exemplo: grep -i “olá, mundo” menu.h main.c

```
Seleção e interpretação de padrão:
  -E, --extended-regexp     PADRÃO é uma expressão regular estendida
  -F, --fixed-strings       PADRÃO são textos separados por nova linha
  -G, --basic-regexp        PADRÃO é uma expressão regular básica (por padrão)
  -P, --perl-regexp         PADRÃO é uma expressão regular de sintaxe Perl
  -e, --regexp=PADRÃO       usa PADRÃO como uma expressão regular
  -f, --file=ARQUIVO        obtém PADRÃO do ARQUIVO
  -i, --ignore-case         ignora diferenças entre maiúsculas/minúsculas
  -w, --word-regexp         força PADRÃO a coincidir só com palavras inteiras
  -x, --line-regexp         força PADRÃO a coincidir só com linhas inteiras
  -z, --null-data           uma linha de dados termina com byte 0, e não com
```

```
Miscelânea:
  -s, --no-messages         suprime mensagens de erro
  -v, --invert-match        seleciona somente linhas não coincidentes
  -V, --version             mostra informações sobre versão e sai
      --help                exibe esta ajuda e sai
```

```
Controle de saída:
  -m, --max-count=NÚM       interrompe depois de NÚM ocorrências
  -b, --byte-offset         emite a posição em bytes nas linhas de saída
  -n, --line-number         emite o número da linha nas linhas de saída
      --line-buffered       libera a saída a cada linha
  -H, --with-filename       emite o nome do arquivo nas linhas de saída
  -h, --no-filename         inibe o nome de arquivo na saída
      --label=RÓTULO        usa RÓTULO como nome de arquivo para entrada padrão
  -o, --only-matching       mostra apenas a parte da linha que coincide com
                              o PADRÃO
  -q, --quiet, --silent     inibe todas as mensagens normais de saída
      --binary-files=TIPO   assume que arquivos binários são TIPO
                             TIPO pode ser \"binary\" (binário), \"text\" (texto),
                             ou \"without-match\" (nunca coincide)
  -a, --text                equivalente a --binary-files=text
  -I                        equivalente a --binary-files=without-match
  -d, --directories=AÇÃO    como tratar diretórios;
                             AÇÃO pode ser \"read\" (ler), \"recurse\" (recursivo),
                             ou \"skip\" (ignorar)
  -D, --devices=AÇÃO        como tratar dispositivos, FIFOs e soquetes;
                             AÇÃO pode ser \"read\" (ler) ou \"skip\" (ignorar)
  -r, --recursive           equivalente a --directories=recurse
  -R, --dereference-recursive  similar, mas segue todas as ligações simbólicas
      --include=PADRÃO_ARQ  busca apenas em arquivos que casam com PADRÃO_ARQ
      --exclude=PADRÃO_ARQ  ignora arquivos e diretórios que casam com
                              PADRÃO_ARQ
      --exclude-from=ARQUI  ignora arquivos que casam com algum padrão escrito
                              em ARQUIvo
      --exclude-dir=PADRÃO  diretórios que casam com PADRÃO serão ignorados
  -L, --files-without-match emite apenas os nomes dos ARQUIVOs sem linhas
                              selecionadas
  -l, --files-with-matches  emite apenas os nomes dos ARQUIVOs com linhas
                              selecionadas
  -c, --count               emite apenas a contagem de linhas selecionadas
                              por ARQUIVO
  -T, --initial-tab         alinha por tabulação (se necessário)
  -Z, --null                emite byte 0 depois do nome do ARQUIVO
```

```
Controle de contexto:
  -B, --before-context=NÚM  emite NÚM linhas de contexto anteriores
  -A, --after-context=NÚM   emite NÚM linhas de contexto posteriores
  -C, --context=NÚM         emite NÚM linhas de contexto de saída
  -NÚM                      o mesmo que --context=NÚM
      --color[=QUANDO],
      --colour[=QUANDO]     usa marcadores para destacar os textos coincidentes;
                              QUANDO pode ser "always" (sempre), "never"
                              (nunca) ou "auto" (automático).
  -U, --binary              não exclui caracteres CR no fim de linha (MSDOS/Windows)
```

Quando ARQUIVO é “-“, lê da entrada padrão. Se o ARQUIVO não é informado, lê “.” se recursivo, senão lê “-“. Se há menos que dois ARQUIVOs, assume-se -h. O estado de saída é 0 se alguma linha é selecionada; 1 em caso contrário; se ocorrer algum erro e -q não é especificado, o estado de saída é 2.

**tail**

Uso:

tail \[OPÇÃO]… \[ARQUIVO]…

Mostra as 10 últimas linhas de cada ARQUIVO na saída padrão. Se especificados vários ARQUIVOs, mostra o nome de cada um antes de suas respectivas linhas.

Se ARQUIVO não for especificado ou for -, lê a entrada padrão.

```
Argumentos obrigatórios para opções longas também o são para opções curtas.
  -c, --bytes=[+]NÚM       emite os últimos NÚM bytes; ou usa -c +NÚM para
                             emitir iniciando com byte NÚM de cada arquivo
  -f, --follow[={name|descriptor}]
                           emite os dados anexados ao arquivo à medida que ele
                             cresce; na ausência de argumento, usa "descriptor"
  -F                       o mesmo que --follow=name --retry
  -n, --lines=[+]NÚM       emite as últimas NÚM linhas, em vez das 10 últimas;
                             ou use -n +NÚM para emitir linhas a partir de NÚM
      --max-unchanged-stats=N
                           com --follow=name, reabre o ARQUIVO que não teve o
                             tamanho alterado após N (padrão: 5) iterações
                             para ver se ele foi removido ou renomeado
                             (uma situação comum para arquivos de log rotativo);
                             com inotify, essa opção raramente é útil
      --pid=PID            com -f, termina depois do processo de PID morrer
  -q, --quiet, --silent    nunca emite cabeçalhos com os nomes dos ARQUIVOs
      --retry              continua tentando abrir um arquivo, se inacessível
  -s, --sleep-interval=N   com -f, suspende por aproximadamente N segundos
                             (padrão: 1.0) entre as iterações; com inotify
                             e --pid=P, verifica o processo P pelo menos uma
                             vez a cada N segundos
  -v, --verbose            sempre emite cabeçalhos com os nomes dos ARQUIVOs
  -z, --zero-terminated     delimitador de é NULO, e não com nova linha
      --help     mostra esta ajuda e sai
      --version  informa a versão e sai
```

NÚM pode ter um sufixo multiplicador: b 512, kB 1000, K 1024, MB 1000_1000, M 1024_1024, GB 1000_1000_1000, G 1024_1024_1024, e assim por diante com T, P, E, Z, Y.

Com –follow (-f), tail segue o descritor de arquivo, o que significa que mesmo se um arquivo for renomeado durante rastreamento do tail, ele vai continuar a rastreá-lo. Este comportamento padrão não é desejável quando você quer rastrear pelo nome verdadeiro do arquivo, e não o descritor de arquivo (por exemplo, a rotação de um log). Use –follow=name nesse caso. Isso faz com que tail rastreie o arquivo reabrindo-o periodicamente para ver se ele foi removido e recriado por algum outro programa.

exemplos: tail -5 /etc/mtools.conf ;

```
tail -2 /home/matheus/Documentos/exemplo.txt ;
```

**tee**

Uso:

tee arquivo.txt

tee exibe a saída de um programa e escreve-a em um arquivo, simultaneamente.

```
Sintaxe: tee [opções] arquivo
    -a :: concatena o arquivo em vez de sobrescrevê-lo
    -i :: ignora interrupções 
```

Listou os diretórios e arquivos do local, gravou a saída em ‘Do’ e pediu para filtrar esse arquivo mostrando apenas a string ‘Do’.

Saída:

```
$>ls | tee exemplo.txt | grep 'Do'
Documentos
Downloads
------
$>ls
'Área de Trabalho'   Downloads     Imagens   npm-debug.log   snap        Vídeos
 Documentos          **exemplo.txt**   Música    Público         Templates

$>cat exemplo.txt
	Área de Trabalho
	Documentos
	Downloads
	Imagens
	Música
	npm-debug.log
	Público
	snap
	Templates
	Vídeos

```

**Diff**

diff exibe, na tela, as diferenças entre dois arquivos texto ou todos os arquivos com o mesmo nome, em dois diretórios.

```
Sintaxe: diff [opções] arquivo1 arquivo2
    -a :: considera todos os arquivos do tipo texto
    -b :: ignora sequências de espaços e caracteres de tabulação
    -d :: tenta localizar um conjunto menor de modificações (isso torna o diff mais lento)
    -i :: não distingue maiúsculas de minúsculas
    -r :: processa também os subdiretórios, quando diretórios são comparados
    -s :: informa quando dois arquivos são na verdade o mesmo arquivo
    -N :: trata arquivos ausentes como vazios 
```

Exemplo (exibe as diferenças entre os arquivos “spc1.txt” e “spc2.txt”): diff -f /operftp/tmp1/spc1.txt /operftp/tmp2/spc2.txt

**xargs**

xargs constrói e executa comandos a partir da entrada padrão.

```
Sintaxe: xargs [opções] comando [argumentos]
    -p :: modo interativo, pede confirmação antes de executar cada linha de comando
    -t :: modo detalhado, exibe a linha de comando na tela antes de executá-la 
```

Exemplo: find / -empty | xargs ls -l | less

**cat**

Uso:

Quando as opções aparecem entre chaves, elas são opcionais mesmo.

O comando cat concatena arquivos, imprime seu conteúdo de tela e ainda pode receber texto digitado pelo teclado para um arquivo.

Vejamos como criar um arquivo com apenas algumas linhas de texto:

Agora você pode digitar qualquer texto. Quando terminar, pressione Ctrl d em uma linha vazia para finalizar a entrada de dados e salvar o arquivo teste.txt.

Para ver o conteúdo do arquivo recém-criado:

O cat também pode servir para concatenar arquivos.

```
$ cat texto1.txt > texto.txt
```

Observe que neste exemplo o conteúdo do arquivo texto.txt é substituído pelo texto1.txt.

Para adicionar o conteúdo do texto1.txt no final arquivo texto.txt o correto seria:

```
$ cat texto1.txt >> texto.txt
```

**cut**

Uso:

O comando cut traduzido ao pé da letra significa cortar. Ele lê o conteúdo de um ou mais arquivos e tem como saída uma coluna vertical.

Suas opções mais frequentes são:

```
-b número: Imprime uma lista vertical com o byte número (da esquerda para direita);
-c número: Imprime uma lista vertical com o caractere número (da esquerda para direita);
-d delimitador: Configura o delimitador que separa uma coluna da outra. O padrão é o Tab;
-f número: Imprime a coluna número.
```

Exemplos:

```
$ cut –d : -f 1 /etc/passwd

$ cut –b 1 /etc/passwd

$ cat /etc/hosts | cut –f 2
```

**expand**

Uso:

```
$ expand [opções] arquivo
```

O comando expand troca o Tab (tabulação) dentro dos textos para o número de espaços correspondentes. É útil para tornar um texto que faz uso das tabulações mais atrativas para determinados dispositivos, como vídeo, impressora, arquivos, etc.

As opções frequentemente utilizadas são:

```
-t número: Especifica o número de espaços que o tab contém. O padrão é 8;
-i: Converte somente no início das linhas.
```

Exemplo:

**unexpand**

Uso:

```
$ unexpand [opções] arquivo
```

O comando unexpand troca o espaço simples por TAB (tabulação) dentro dos textos, no início das linhas. É o inverso do comando expand.

As opções frequentemente utilizadas são:

```
-t número: Especifica o número de espaços que o tab contém. O padrão é 8;
-a: Converte todos os espaços ao invés dos espaços no início das linhas.
```

Exemplo:

**fmt**

Uso:

O comando fmt (format) formata um texto com uma largura específica. Ele pode remover espaços ou adicionar espaços conforme a largura desejada. O padrão são 75 caracteres.

A opção frequentemente utilizada é:

```
-w número: Configura a largura desejada para o texto.
```

Exemplo:

**head**

Uso:

O comando head (cabeçalho) mostra as primeiras 10 linhas do início do texto.

A opção frequentemente utilizada é:

```
-n número: Configura o número de linhas que o head irá mostrar.
```

Exemplo:

**Join**

Uso:

```
$ join [opções] arquivo1 arquivo2
```

O comando join (juntar) une as linhas de ambos os arquivos que tenham um índice comum. O comando join poderá ser utilizado como um banco de dados simples.

As opções frequentemente utilizadas são:

```
-j1 número: Escolhe o campo número como índice para o arquivo1.
-j2 número: Escolhe o campo número como índice para o arquivo2.
-j número: Escolhe o campo número como índice para ambos os arquivos.
```

Exemplo:

Suponha que o primeiro arquivo contenha o seguinte conteúdo:

```
1      SXY-2469

2      KOE-2608

3      OIE-3645
```

E o segundo arquivo tenha o seguinte conteúdo:

```
1      Monza

2      Audi A3

3      Fiat Uno Mille Smart
```

Depois do comando:

```
$ join –j 1 arquivo1 arquivo2
```

A saída será a seguinte:

```
1      SXY-2469 Monza

2      KOE-2608 Audi A3

3      OIE-3645 Fiat Uno Mille Smart
```

TABELA 5 – Símbolos para diferenciar cabeçalho e rodapé

Símbolo Descrição ::: Símbolo utilizado para iniciar o cabeçalho do texto :: Símbolo utilizado para iniciar o corpo do texto : Símbolo utilizado para iniciar o rodapé do texto

Veja que o comando join necessita que ambos os arquivos contenham um índice, como no exemplo.

**nl**

Uso:

O comando nl (numerar linhas) é utilizado para numerar as linhas de um arquivo. O comando considera condições especiais para o cabeçalho e o rodapé do arquivo.

As opções frequentemente utilizadas são:

```
-h subopção: Utilizada para formatar o cabeçalho do texto. O padrão é não numerar o cabeçalho;
-b subopção: Utilizada para formatar o corpo do texto. O padrão é numerar somente as linhas não vazias;
-f subopção: Utilizada para formatar o rodapé do texto. O padrão é não numerar o rodapé.
```

As subopções são:

```
A: Numerar todas as linhas;
t: Numerar somente as preenchidas;
n: Não numerar as linhas.
```

Exemplo:

Suponha que o arquivo.txt tenha o seguinte conteúdo:

```
\:\:\:

Relatório de Notas e Frequência dos alunos de Engenharia de Software

——————————————————————————————————————————————————————————————————

Nome   			Nota          Freq.         Resultado

——————————————————————————————————————————————————————————————————

\:\:

Carlos Torres          8,5           80%        	   Aprovado

José Antônio          10,0           100%         	   Aprovado

Maria de Lourdes      10,0     	     100%        	   Aprovado

Mário Cabral           9,5           100%         	   Aprovado

\:

——————————————————————————————————————————————————————————————————
```

E usarmos o comando nl:

O resultado será:

```
     Relatório de Notas e Frequência dos alunos de Engenharia de Software
       
       ——————————————————————————————————————————————————————————————————

			Nome   	    Nota          Freq.         Resultado
       
       ——————————————————————————————————————————————————————————————————
           
         1	Carlos Torres       8,5            80%      	   Aprovado
           
         2	José Antônio        10,0           100%      	   Aprovado
         		
         4	Maria de Lourdes    10,0           100%      	   Aprovado
           
         5	Mário Cabral         9,5           100%      	   Aprovado

        ——————————————————————————————————————————————————————————————————

```

**od**

Uso:

O comando od (Octal e Demais formatos) é utilizado para visualizarmos o conteúdo de um arquivo nos formatos hexadecimal, octal, ASCII e nome dos caracteres.

A opção frequentemente utilizada é:

```
-t tipo: Especifica o tipo de saída que o comando od deve gerar.
```

Os tipos possíveis são:

```
a: Nome do caractere;
c: ASCII;
o: Octal;
x: Hexadecimal.
```

Exemplo:

```
$ cat > arquivo.txt

Certificação Linux

Ctrl d

$ od –t x arquivo.txt

0000000 74726543 63696669 6fe3e761 6e694c20

0000020 00007875

0000022
```

**paste**

Uso:

```
$ paste [opções] arquivo1 arquivo2
```

O comando paste (colar) é utilizado para concatenar as linhas de diversos arquivos em colunas verticais.

As opções frequentemente utilizadas são:

```
-d’s’: Separa as colunas com o símbolo s dentro das aspas simples;
-s: concatena todo o conteúdo de um arquivo com uma linha para cada arquivo.
```

Exemplo:

Suponha que o arquivo1 tenha o seguinte conteúdo:

```
ntkonoha

lsilveira

ralencar
```

E o arquivo2 tenha o seguinte conteúdo:

```
provedor.com.br

outroprovedor.com.br

provedorEZ.com.br
```

Ao utilizarmos o comando paste, o resultado será o seguinte:

```
$ paste –d’@’ arquivo1 arquivo2

ntkonoha@provedor.com.br

lsilveira@outroprovedor.com.br

ralencar@provedorEZ.com.br
```

**pr**

Uso:

O comando pr (printing) formata um arquivo texto para uma saída paginada com cabeçalho, margens e largura definidos. É útil para formatar textos crus para impressão. O cabeçalho consiste em data, hora, nome do arquivo e número da página.

As opções frequentemente utilizadas são:

```
-d: Especifica espaçamento duplo;
-l número: Especifica o número de caracteres de largura da página. O padrão são 66 caracteres;
-o número: Especifica o número de espaços da margem esquerda.
```

Exemplo: $ pr –l 75 –o 5 arquivo.txt

**split**

Uso:

```
$ split [opções] arquivo_entrada arquivo_saida
```

O comando split (dividir) é usado para dividir grandes arquivos em n-arquivos menores. Os arquivos de saída são gerados de acordo com o número de linhas do arquivo de entrada.

O padrão é dividir o arquivo a cada 1000 linhas. Os nomes dos arquivos de saída seguem o padrão arquivosaidaaa arquivosaidaab arquivosaidaac, assim por diante.

A opção mais frequente é:

```
-n: Onde n é o número de linhas que irão dividir o arquivo de entrada.
```

Exemplo:

```
$ split -20 arquivo1.txt arquivosaida.txt
```

**tail**

Uso:

O comando tail (cauda) visualiza as últimas 10 linhas de um arquivo. Funciona como o oposto do comando head.

As opções mais frequentes são:

```
-n número: Especifica o número de linhas finais que o tail irá mostrar de um arquivo;
-f: Mostra as últimas linhas finais de um arquivo continuamente enquanto outro processo grava mais linhas. Muito útil para visualizarmos arquivos de LOG.
```

Exemplo:

```
$ tail –n 50 /var/log/messages

$ tail –f /var/log/messagens
```

**tr**

Uso:

```
$ tr [opções] variável_busca variável_troca
```

O comando tr faz a troca de uma variável por outra especificada. Este comando não trabalha diretamente com arquivos, portanto deve ser utilizado com a saída padrão de outro comando.

As opções mais frequentes são:

```
-d: Apaga as ocorrências da variável de busca;
-s: Suprime as ocorrências repetidas da variável de busca.
```

Exemplo:

```
$ cat arquivo1 | tr a-z A-Z
```

Neste exemplo o comando tr troca todas as letras de a a z para maiúsculas.

Neste exemplo o comando tr apaga a letra a.

Neste exemplo o comando tr suprime as ocorrências repetidas do número 1.

O comando tr pode fazer a troca de caracteres da variável de busca pela variável de troca, mas o número de caracteres precisa ser o mesmo em ambas.

**wc**

Uso:

O comando wc conta as linhas, palavras e caracteres de um ou mais arquivos. Se mais de um arquivo for passado como argumento, ele irá apresentar as estatísticas de cada arquivo e também o total.

As opções mais frequentes são:

```
-c: Conta o número de caracteres de um ou mais arquivos;
-l: Conta o número de linhas de um ou mais arquivos;
-L: Conta o número de caracteres da maior linha do arquivo;
-w: Conta as palavras de um ou mais arquivos.
```

Exemplo:

**sort**

Uso:

```
$ sort [-b] [-d] [-f] [-i] [-m] [-M] [-n] [-r] [-u] arquivo [-o arquivo_ saída]
```

O comando sort ordena as linhas de um arquivo texto.

Suas opções são:

```
-b: Ignora espaços no início da linha;
-d: Coloca as linhas em ordem alfabética e ignora a pontuação;
-f: Ignora a diferença entre maiúsculas e minúsculas;
-I: Ignora caracteres de controle;
-m: Mescla dois ou mais arquivos em um arquivo ordenado de saída;
-M: Trata as três primeiras letras das linhas como mês (ex: JAN);
-n: Ordena pelos números no início das linhas;
-r: Ordena em ordem inversa;
-u: Se a linha for duplicada, mostra somente a primeira;
-o: Envia a saída do comando para o arquivo.
```

Ex.:

**Uniq**

Uso:

```
$ uniq [Opções]… [Arquivo Entrada [Arquivo Saída]]
```

O comando uniq remove as linhas duplicadas de um arquivo ordenado.

Exemplo: uniq operadores.txt | sort -c

As opções mais comuns são:

```
-c: Indica no início das linhas o número de ocorrências;
-d: Imprime somente as linhas duplicadas;
-i: Ignora a diferença entre maiúsculas e minúsculas;
-u: Imprime somente as linhas únicas, que não têm duplicatas.
```

**sed**

Uso:

$ sed \[Opções] {script} arquivo

O comando sed é um poderoso editor de strings para filtrar ou editar sequências de texto.

As opções mais comuns são:

```
-e: Adiciona um script aos comandos a serem executados;
-f arquivo: Adiciona o conteúdo de um arquivo como script a ser executado;
-r: Usa expressões regulares no script.
```

Exemplos:

Para substituir expressões por outras, utilizamos o “s”, com os delimitadores “/”, de forma que a primeira ocorrência é o texto a ser procurado, e a segunda o texto que será substituído. Observe que o sed somente irá trocar a primeira ocorrência de cada linha, e é sensível a maiúsculas e minúsculas. A saída padrão do sed será o terminal.

```
$ cat arquivo

Hoje fará calor de noite. A Noite é bela.

$ sed s/noite/dia/ arquivo

Hoje fará calor de dia. A Noite é bela.
```

**Echo**

Uso:

_echo \[opções] \[argumentos]_

Este comando mostra texto na saída padrão seguido por uma nova linha.

```
-n : não adiciona uma nova linha após mostrar os argumentos.

-e : habilita interpretação dos códigos de escape após barra invetida.

-E : suprime explicitamente a interpretação de códigos de escape após barra invertida.
	São exemplos de códigos de escape
\a : alerta (Sino); \b : retroceder; \c : suprime próxima saída; \e : caractere de escape; \f : alimentação de página (FF); \n : nova linha (NL); \r : retorno de carro (CR); \t : tabulação horizontal; \v : tabulação vertical.
```

Exemplos;

*   O comando

    `echo teste`

    apenas mostra a palavra “teste” na saída padrão, enquanto o comando

    echo

    mostra uma linha em branco.
*   Este comando pode ser usado para exibir todos os nomes de arquivos de um diretório em ordem alfabética. Por exemplo,

    `echo /*`

    lista o conteúdo do diretório **raiz**.
*   O comando

    `echo -e /etc/* “\n” /*`

    mostra o conteúdo do diretório **/etc**, define uma nova linha com o código de escape **“\n”** e, em seguida, mostra o conteúdo diretório **raiz**.
*   Este comando pode também ser utilizado na programação shell

    para escrever mensagens na saída padrão. Por exemplo,

    `echo ‘erro de execução’`

    mostra a mensagem definida entre aspas simples no terminal do usuário.
*   Para verificar o conteúdo da _variável de ambiente_ PATH, basta digitar na linha de comando

    `echo “$PATH”`
*   O comando também pode ser usado para add um texto a um arquivo, criar um arquivo com texto dentro ou alterar todo o arquivo por uma nova mensagem;

    Sobrescrever todo arquivo pela palavra teste / ou criar um arquivo com a palavra teste: `echo "teste" > /path/arquivo`

    Acrescentar ao final do arquivo a palavra teste `echo "teste" >> /path/arquivo`

    > caso queira adicionar uma frase em uma linha específica de um arquivo, use o comando SED, mostrado acima. Exemplo:
    >
    > `sed '15s/.*/Adoro esse site/' < nome do arquivo >`
    >
    > `sed '15c\Adoro esse site' < nome do arquivo >`
    >
    > Sendo _15_ a numeração da linha e o _Adoro esse site_ o texto a ser inserido.
    >
    > _ps: de nada adianta colocar alguma palavra na linha 10 em um arquivo que tem 4 linhas…_

**Organização e velocidade** É legal falar que podemos também aprender algumas teclas de atalho para ter facilidade em trabalhar no terminal. Segue algumas teclas de atalhos que geralmente são padrões e podem ser bastante úteis para seu workflow. Alguns programas podem utilizar teclas diferentes e outros podem permitir a alteração para as teclas de sua escolha.

**Pequena lista de atalhos básicos:**

* _Ctrl + Alt + T_ - abrir o terminal
* _Ctrl + Shift + C_ - copiar um texto selecionado;
* _Ctrl + Shift + V_ - colar um texto copiado;
* _Ctrl + C_ - cancelar o comando em funcionamento;
* _Ctrl + L_ - limpar o terminal, similar ao comando clear;
* _Ctrl + D_ - fazer logout da sessão atual, similar ao comando exit;
* _Ctrl + W_ - apagar uma palavra na linha atual;
* _Ctrl + U_ - apagar a linha inteira;
* _Ctrl + R_ - mostrar um comando recente;
* _↑_ - teclando pra cima pode retornar os últimos comandos usados pelo usuário;
* _!!_ - repetir o último comando
* _Tab_ - completar palavra, como o nome de um arquivo ou pasta, para não precisar escrever tudo
* _entre outros…_

> Com o programa Terminator, e outros parecidos, você pode abrir mais de um terminal na mesma janela de forma simples e organizada, além de poder customizar as teclas de atalho da forma que quiser. É uma das excelentes alternativas para quem busca trabalhar de forma mais efetiva e rápida com as linhas de comando.

### Lista de comandos gerais <a href="#lista-de-comandos-gerais" id="lista-de-comandos-gerais"></a>

```
Guia resumido de diversos comandos. Uma pequena lista de comandos para quem quer apenas checar, conhecer e/ou revisar.
```

Nesta parte listei diversos comandos com suas funcionalidades principais, sem aprofundamento geral de como usar. _**Lista resumida de comandos para o terminal:**_

Obs: alguns comandos podem precisar serem instalados para funcionar em algumas distribuições

> * man / help : manual para algum comando; _help, -h, –help_ se quer ajuda sobre usar tal comando
> * _whatis_ - mostra um resumo sobre comandos.
> * _whoami_ - comando que mostra quem é você - usuário.
> * _whereis_ - buscar e listar a localização de arquivos binários, fontes e documentação.
> * _shutdown_ - desligar, reinicializar ou suspender.
> * _logout_ - Finalizar sessão
> * _reboot_, _shutdown -r now_ - Reiniciar o sistema
> * _halt_, _telnit 0_, _init 0_, _shutdown -h now_ - Desligar o sistema
> * _ifconfig_ - Mostrar e configurar interface de rede.
> * _date_ - exibir ou modificar a data e a hora do sistema .
> * _cal_ - calendário .
> * _pwd_ - diretório atual.
> * _cd_ - navegar entre as pastas .
> * _file_ - informações de um arquivo - identifica o tipo de arquivo.
> * _cat_ - ver conteúdo de algum arquivo .
> * _less_ e _more_ - ler conteúdo de texto com paginação, com esses você pode ‘folhear’ um arquivo de texto. Com o more apenas será possível descer pelo arquivo, já o less te permite subir/voltar se quiser. O less também te permite salvar todo o resultado canalizado de um comando usado com ele.
> * _mkdir_ - criar diretórios.
> * _rmdir_ - remover diretórios vazios.
> * _rm_ - remover arquivos (ou diretórios cheios seguido do parâmetro _recursive_ e _force_ > rm -rf).
> * _mv_ - mover ou renomear arquivo ou diretório.
> * _rename_ - renomear arquivos ou diretórios.
> * _cp_ - copiar / duplicar arquivo.
> * _uptime_ - mostra há quanto tempo o pc está ligado.
> * _touch_ - criação de arquivo em branco. Podemos, também, alterar a data e a hora do último acesso e/ou data de modificação de um arquivo.
> * _nano_, _vi_, _vim_, _visudo_, _vipw_, etc - editores de texto - criação de arquivo - _visudo_ é o recomendado para editar o arquivo _sudores_ - _vipw_ para editar os arquivos _/etc/passwd_ e _/etc/shadow_.
> * _clear_ - limpa a tela do terminal (ou CTRL + L).
> * _exit_ - este comando executa o término de um processo, seja fechando o terminal ou sair do usuário que você logou via terminal, por exemplo.
> * _route_ - visualizar e manipular o IP _routing_ table - tabela de roteamento IP
> * _free_ - conferir o uso de memória ram _(por padrão em kilobytes, já com o valor \*-h_ mostra em mega ou em giga)\* .
> * _apt_ - _advanced package tool_: pacote de comandos usados para instalar e buscar programas, atualizar sistema, entre outros. _(obs: alguns sistemas não trabalham com apt, mas sim com outros comandos, como o comando dnf pelo fedora)_.
> * _uname_ - informações do sistema. ( \* -m para saber a arquitetura do sistema (x86 ou x64); -r sobre kernel; -a mostrar tudo que ele pega\* ).
> * _find_ - encontrar arquivos - pesquisa em uma hierarquia de diretórios.
> * _strings_ - localizar e imprimir cadeias de texto embutidos em arquivos binários.
> * _mount_ - montar sistemas de arquivo. _(unmount para desmontar & \*fuser_ para forçar a remoção de um dispositivo ocupado)\*.
> * _sudo_ - usar privilégio de outro usuário para aqueles que estão em _sudoers_ - pode ser lido como _super user do_.
> * _dpkg_ - instalador de pacotes.
> * _grep_ - filtro para uma saída mais específica.
> * _arch_ - informar a arquitetura do sistema / o tipo de hardware.
> * _at_ - agendar tarefa \[listar as tarefas com _atq_; deletar tarefas com _atrm_].
> * _chgrp_ - alterar nome do grupo de arquivos.
> * _chmod_ - alterar as permissões de arquivos.
> * _chsh_ - alterar o shell padrão (normalmente o padrão é o bash).
> * _cut_ - filtro para selecionar partes de um arquivo e exibir o resultado.
> * _echo_ - Apresentar um texto. Mostrar texto na saída padrão seguido por uma nova linha. Pode ser usado pra criar um arquivo com texto dentro, pra add um texto em uma linha ou modificar todo o texto pelo que quiser.
> * _fdisk_ - gerenciar partições de disco.
> * _fg_ - mover processos de segundo para primeiro plano.
> * _finger_ - exibir informações do usuário.
> * _fsck_ - verificar e até reparar sistemas de arquivos.
> * _fuser_ - identificar processos que usam um determinado arquivo.
> * _gcc_ - compilar linguagem c e c++ \[ _gdb_ - um debugger para depuração de programas C e C++ ].
> * _getcap_- informar as capacidades dos arquivos.
> * _gpasswd_ - administrar o arquivo /etc/group.
> * _passwd_ - administrar senhas de usuários
> * _groupmod_ - modificar grupo de usuários do sistema.
> * _head_ - mostrar as primeiras linhas de um arquivo de texto.
> * _history_ - mostrar os últimos comandos utilizados pelo usuário.
> * _hwinfo_ - pegar e mostrar a maior quantidade possível de informações sobre o hardware da máquina. - _info_ - pegar a documentação de informação sobre um comando, pode ser mais amigável que o _man_.
> * _apropos_ - pesquisar por determinada expressão nas páginas do manual do sistema.
> * _xman_ - Navegador para as páginas on-line.
> * _kill_ - enviar um sinal para um processo, normalmente para encerrar. Para ver a lista de sinais usar _kill -l_.
> * _killall_ - envia um determinado sinal a um conjunto de processos de mesmo nome.
> * _ps_, _pstree_ e _top_ - mostrar informações sobre os processos em execução. O pstree lista em modo de organização árvore.
> * _lscpu_ - informações de arquitetura da CPU.
> * _lshw_ - informações sobre hardware.
> * _lsmod_ - listar módulos do kernel carregados na memória.
> * _insmod_ - inserir um módulo no kernel Linux.
> * _lsof_ - listar arquivos em uso dos processos (_list open files_).
> * _lsusb_ - informações de dispositivos USB (_Universal Serial Bus_).
> * _make_ - simplificar e agilizar a compilação de programas; compilando; verificando arquivos que precisam ser compilados e criando aplicações.
> * _mkswap_ - configurar swap, área de troca.
> * _more_ - paginação de arquivos ou da entrada padrão.
> * _netstat_ - informações sobre as conexões de rede, tabelas de roteamento e estatísticas da utilização da interface na rede.
> * _nice_ - definir valor de ajuste da prioridade.
> * _nl_ - exibir o conteúdo de um arquivo com linhas enumeradas.
> * _nohup_ - deixar qualquer comando rodando mesmo desconectado do sistema.
> * _oclock_ - relógio analógico com a hora atual do sistema.
> * _diff_ - comparar dois arquivos linha a linha.
> * _patch_ - atualizar o arquivo de acordo com as diferenças mostradas pelo _diff_.
> * _ping_ - normalmente usado para testar a conectividade (_usa o datagrama \_Echo Request\_ \_(ping)\_ do protocolo ICMP_).
> * _ps_ - mostrar informações dos processos ativos.
> * _quota_ - informações sobre o sistema de cotas de disco.
> * _renice_ - alterar o valor _nice_ para calcular a prioridade de um processo normal.
> * _RPM_ - gerenciador de pacotes.
> * _setcap_ - setar, deletar e alterar a capacidade de um arquivo.
> * _slabtop_ - exibir em tempo real informações da memória cache.
> * _sort_ - mostrar saída de um arquivo texto mais organizado, como em ordem crescente por exemplo _(espaços, números, letra maiúsculas \[A-Z] e letras minúsculas \[a-z])_.
> * _source_ - executar um arquivo no shell _(interpretador de comandos do linux)_.
> * _ssh_ - acessar e executar comandos em uma máquina remotamente.
> * _stat_ - mostrar informações sobre um arquivo.
> * _tac_ - mostrar conteúdos de arquivos de forma inversa.
> * _tail_ - exibir ultimas linhas de um arquivo de texto.
> * _tee_ - lê a entrada padrão e a salva em um ou mais arquivos.
> * _tree_ - listar, assim como o ls, mas em formato árvore.
> * _unset_ - apagar uma variável de ambiente.
> * _users_, _who_, _w_ - listar/mostrar usuários logados/conectados. _w_ também mostra o que estão executando.
> * _vmstat_ - mostrar estatísticas sobre a memória virtual.
> * _wc_ - contar linhas, palavras e caracteres.
> * _wget_ - baixar arquivos da internet (_usa os protocolos HTTP, HTTPS e FTP_).
> * _curl_ - “Client URL” - verificar a conectividade da URL & transferência de dados
> * _ar_, _tar_, _gzip_, _compress_, _bzip2_, _zip_ - compactar/agrupar e descompactar arquivos. _(com o tar tbm pode exibir o conteúdo do arquivo e até ser usado para backups)_
> * _unzip_, _bunzip2_ - descompactar arquivos
> * _ln_ - criar links (atalhos).
> * _which_- indica o caminho completo para o comando dado.
> * _du_ - indicar o espaço usado em disco pelos arquivos ou diretórios dados.
> * _df_ - dar informações sobre os sistemas de arquivos disponíveis na máquina e sua ocupação em disco.
> * _printenv SHELL_ - saber qual interpretador de comandos seu usuário utilizar.
> * _locate_ - encontrar todas as instâncias de um arquivo.
> * _finger_ - informações do usuário.
> * _bg_ - listar, e fazer continuar, trabalhos parados e em segundo plano.
> * _change_ - ver, definir e modificar um limite de tempo para contas de usuário.
> * _newgrp_ - criar novo grupo para alterar o grupo padrão dos arquivos recém-criados.
> * _grpck_ - checar a sintaxe correta de ‘/ etc/grupo’ e a existência de grupos.
> * _pwck_ - checar a sintaxe correta de ‘/ etc/passwd’ e a existência de usuários.
> * _chattr_ - definir certos atributos de um arquivo.
> * _lsattr_ - exibe os atributos de um arquivo.
> * _ecode_ - conversão de formatos de arquivos.
> * _badblocks_ - verificar se tem blocos defeituosos do disco.
> * _ext2_, _e2fsck_ - verificar e reparar a integridade do sistema de arquivo ext2.
> * _ext3_, _e2fsck_ - verificar e reparar a integridade do sistema de arquivo ext3.
> * _vfat_ - verificar e reparar a integridade do arquivo sistema disco fat.
> * _msdos_, _dosfsck_ - verificar e reparar a integridade de um arquivo a partir do sistema disco DOS.
> * _unix2dos_ - conversão de um formato de arquivo de texto do MSDOS para UNIX, e _dos2unix_ de UNIX para MSDOS.
> * _dump_ - ferramenta de backup de bloco de disco. - Tal qual o _tar_, mas mais eficiente e seguro.
> * _rsync_ - sincronizar diretórios.
> * _restore_ - restaurar um save.
> *   _xrandr_ - ver e fazer configuraçes de monitor(es)
>
>     ….entre outros…

Não conseguirei postar todos os comandos que existem, mas tentei colocar uma boa parte deles para que fique um material bem completo. Mas pelo menos agora, das coisas do dia-a-dia, podemos fazer praticamente tudo e mais um pouco. Manterei a lista atualizada em caso de algum equívoco e falta de qualquer comando importante e/ou básico para ser apresentado.

Acredito que o material já esteja de bom tamanho e que tenha ficado um excelente compilado para quem quer aprender sobre. Certamente, por meio deste material, compensa começar a estudar e a se aperfeiçoar, principalmente se precisar lembrar algo que tenha esquecido em momento de aperto.

Claro, não parem por aqui. A internet está recheada de conteúdos excelentes para aprender cada vez mais!

Se aventure neste mundo! Divirta-se!

```
Se puder ajudar compartilhando o material com amigos que buscam aprender, seria de grande ajuda. Lembrando que meu trabalho aqui é apenas como um divulgador e estudante, sem fins lucrativos.
```

​ _Obrigado para todos que curtiram e compartilharam o material, muito obrigado mesmo._ ​ _Feito de_ **coração** _de_ **estudante** para **estudante**.
