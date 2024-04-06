---
layout: post
title: Desvendando os perigos em uma WiFi
description: Compreenda os principais riscos e perigos ocultos de uma rede WiFi
tags: ["Redes", "WiFi", "Hacking"]
categories: ["WayOfSecurity"]
pin: true
draft: false
date: 2021-05-12T15:29:11+02:00
author: matheus
---
# Além do Sinal: Conhecendo os principais perigos de uma rede wireless
 As 'Ameaças Invisíveis' que te farão compreender os principais riscos das redes sem fio (wireless). Será apresentado alguns dos "Perigos Ocultos" ignorados pela maioria da população. 

 É comum ouvirmos coisas que soam como:

 _"Aah, qual o problema de usar wifis alheias e compartilhar minha rede com qualquer pessoa? Essa galerinha de segurança complicam tudo... cheios de regrinha chata!"_


 Por isso acho importante uma publicação como esta, que mostrará alguns riscos de segurança que podem estar presente em diversas situações 'banais' do dia-a-dia. Entretando, nesta publicação ainda não terá algo prático, apenas em outras publicações e vídeos.


### Sobre o que será apresentado

Você já se perguntou como é fácil invadir uma rede wireless? Você sabe quais são os riscos de usar uma rede wifi de terceiros ou então o perigo de ter credenciais fracas na sua própria rede? 
Quer saber como funciona a proteção e a invasão em redes WEP e WPA-PSK, e quais são os perigos que você pode enfrentar se alguém conseguir acesso à sua rede sem a sua permissão? 
Quer ver algumas dicas de como se proteger e evitar que seus dados sejam roubados ou manipulados por hackers mal-intencionados?

Nesta postagem falaremos exatamente sobre isso. Você sairá compreendendo os Perigos das Redes Wireless. 

>Lembrando que conteúdos mais técnicos e/ou práticos de wifi hacking estarão em outra publicação

## Breve explicação sobre a segurança e os protocolos

As redes wireless usam diferentes protocolos de segurança para criptografar os dados que são transmitidos entre os dispositivos e o roteador. Os mais comuns são o WEP (Wired Equivalent Privacy) e o WPA-PSK (Wi-Fi Protected Access Pre-Shared Key). O WEP é um protocolo antigo e muito vulnerável, que pode ser facilmente quebrado por programas que capturam os pacotes de dados e descobrem a chave de criptografia. O WPA - WPA2 ou WPA3 - é um protocolo mais moderno e seguro, que usa um algoritmo mais complexo para gerar a chave de criptografia, que muda a cada conexão. No entanto, também pode ser invadido se o usuário escolher uma senha padrão ou fraca, já que pode ser descoberta por programas que testam milhares de combinações possíveis até encontrar a correta. Esse método é chamado de brute force (força bruta) e o arquivo que armazena as senhas geralmente é chamado de wordlist. Inclusive, foi assim que invadi a rede WiFi de uma vizinha utilizando o pacote aircrack e gerando uma wordlist com crunch. 

### Minha primeira invasão a uma WIFI

Entre 2019 e 2020 eu percebi um possível padrão nas credenciais que vinham com o modem roteador de uma operadora grande e isso me fez criar um script para testar essa minha teoria. Assim, sempre que alguém próximo utilizava uma rede com as credenciais padrões desta operadora, eu verificava se a senha estava dentro do resultado da wordlist provinda do script q fiz para força bruta. O padrão era real, sempre me retornava uma wordlist que uma das opções era certeira na credencial da rede com padrão de fábrica. Em outras palavras, quando a análise combinatória era feita de acordo com o padrão que eu detectei, entre os resultados gerados sempre estaria a senha correta da rede e isso acarretava em um ataque eficaz ao usar o arquivo com aircrack, ao testar todas as possibilidades presentes no arquivo. Fui publicar com finalidade acadêmica e meu script precisou ser tirado do ar pós recebimento de uma notificação para retirada do repositório do github - eu também acabei vacilando por ter deixado o nome da empresa sair junto. Hoje ela não utiliza mais o mesmo padrão, mas ainda temos muitos usuários que estão utilizando esta configuração antiga e minha vizinha é um exemplo - Até por isso que precisei retirar meu script do ar (fiz um vídeo específico e um post sobre isso. O vídeo será postado futuramente e a postagem em revisão). 

>Para saber mais sobre toda a parte prática por trás, acesse a postagem> [SecLab: Hackeando rede wireless](../hackeando-wifi)

## Sendo rede é local não é preciso se preocupar?

"Matheus, mas para alguém entrar na minha rede ela precisa estar em uma determinada distância. Acho besteira e exagero se bitolar". Imagino que se você mora em uma casa mais isolada e grande, precisando estar dentro do seu terreno para ter acesso a rede, até pode ser mais tranquilo sim, mas ainda é importante se atentar a segurança o mínimo possível. Agora, uma realidade diferente e bem comum e se você mora em um prédio no centro de uma cidade - geralmente lugares que pessoas gostam por poderem ir andando para qualquer lugar que precisarem. Estes lugares não apenas estão com diversas redes residenciais como também corporativas por perto, estando cheio de ambientes que podem ter a distância necessária - mesmo sendo vizinhos de apartamento. Se um cara malicioso está com seu notebook em um café e consegue detectar sua rede, você pode sim sofrer ataques - como desconexão ou ter a senha descoberta -, e por isso é super necessário se preocupar com segurança e talvez nem compartilhar sua senha de wifi para qualquer visitante passageiro. 

Afinal, o que de ruim pode mesmo acontecer se alguém entrar na sua rede privada? 

## Possíveis ataques do invasor e seus riscos

Bom... se um invasor conseguir se conectar à sua rede wireless, ele pode fazer várias coisas maliciosas, como:

 - Fazer um ataque de DNS Spoofing/Poisonning, que consiste em alterar o endereço IP (Internet Protocol) associado a um nome de domínio no DNS (Domain Name System) local da rede, fazendo com que os dispositivos da rede acessem um site falso em vez do verdadeiro. Por exemplo, ele pode fazer com que você acesse um site falso do seu banco, que tem a mesma aparência do original, mas que na verdade é uma armadilha para capturar seus dados bancários com phishing (pois é, neste caso não adianta saber que é o link original).
	
 - Fazer um ataque de MITM (Man In The Middle), que consiste em interceptar os dados que você envia e recebe pela rede, podendo ler, modificar ou bloquear as informações. Por exemplo, ele pode ver quais sites você visita, quais senhas você digita, quais mensagens você envia ou recebe, quais arquivos você baixa ou compartilha, etc (tá aí a importância da criptografia).
	
 - Fazer um ataque de ARP Spoofing/Poisonning, que consiste em enganar os dispositivos da rede sobre qual é o endereço físico / MAC (Media Access Control) do roteador, fazendo com que eles enviem os dados para o invasor em vez do roteador. Assim, ele pode controlar todo o tráfego da rede e fazer o mesmo que no ataque de MITM.
	
 - Fazer um SSL Stripping, que se resume no invasor removendo a criptografia SSL/TLS do tráfego da vítima, permitindo que ele leia e manipule o tráfego.
	
 - Fazer um Rogue Access Point, que se resume no invasor criar um ponto de acesso Wi-Fi falso para interceptar o tráfego dos usuários.
	
 . Um bônus que podemos falar sobre ataques é de um em que não necessariamente o atacante estará já com acesso garantido em sua rede, mas apenas alcance a mesma. Este ataque é chamado de DeAuth e neste caso se resume em te derrubar da rede, fazendo sua conexão cair e te forçando a reconectar, mas pode ser feito de forma que você não de reconecte por muito tempo. Este ataque pode ser uma etapa importante para um wifi hacking, que para poder capturar o que chamamos de handshake é preciso esperar alguém se conectar ou forçando uma vítima a cair e voltar rapidamente com desautenticação. As explicações mais técnicas estarão em outra publicação, mas resumidamente este ataque fica enviando pacotes de dissociação/desautenticação para desconectar dispositivos da rede wireless.
 
### Resumindo a ópera dos riscos em poucas palavras
 Fazendo um resumo sobre os principais riscos comentado de forma simples.
 
Uma vez que se conecta com o roteador, os dispositivos da rede atualizam uma tabela ARP, que associa endereços IP a endereços MAC. Um ataque comum em redes wireless é o ARP Spoofing, onde o invasor envia pacotes falsos para alterar essa associação, fazendo com que seu dispositivo se comunique com ele em vez do roteador. Assim, ele pode monitorar ou bloquear seu acesso à rede. Além disso, o invasor pode alterar o DNS local da sua rede para redirecioná-lo para um site falso quando você digita o nome de um site verdadeiro, uma tática conhecida como phishing. Por exemplo, ao digitar www.instagram.com, você pode ser levado a um site que se parece com o Instagram, mas que é uma armadilha para roubar seus dados. Esses são só alguns exemplos do que pode ser feito pelo invasor.
 
Mas então, sabendo disso tudo, como ter menos riscos? como estar menos vulnerável?

## Medidas de segurança

Como você pode ver, esses ataques podem causar sérios danos à sua privacidade, à sua segurança e até mesmo à sua conta bancária. Por isso, é muito importante tomar algumas medidas para se proteger e evitar que sua rede wireless seja invadida. Algumas delas são:

* Evite dar acesso a sua rede para qualquer um, isso também pode ser um problema. Ainda mais se sua rede tiver um alcance até a rua ou estabelecimentos, por exemplo. (Se possível ter uma rede separada para visitantes)
	
* Usar um protocolo de segurança adequado para sua rede wireless. Evite usar o WEP, que é muito fraco e fácil de quebrar sem precisar de wordlist. Prefira usar o WPA2-PSK, que é mais forte e difícil de invadir. Se possível, use a WPA3, que é a versão mais recente e avançada da criptografia wireless.
	
* Evite redes wireless públicas. Não use redes wifi públicas sem proteção, se você precisar usar uma rede wifi pública, como em um café, em um hotel ou em um aeroporto, ao menos use uma VPN (Virtual Private Network) para criptografar seus dados e impedir que eles sejam interceptados por terceiros - ProtonVPN tem versão gratuita. Também evite acessar sites sensíveis ou fazer transações financeiras nessas redes.
	
* Ative o filtro de endereços MAC no seu roteador. O MAC é um código único que identifica cada dispositivo que se conecta à rede wireless. Com o filtro ativado, você pode permitir ou bloquear o acesso de determinados dispositivos à sua rede, aumentando o controle e a segurança.
	
* Para ficar mais tranquilo, pode tentar verificar a tabela ARP para verificar se os IP's e os endereços MACs estão certos e não com algum duplicado, como um endereço físico para 2 IPs diferentes.
	
* Desative o WPS no seu roteador. O WPS é uma função que facilita a conexão de dispositivos à rede wireless sem a necessidade de digitar a senha. Porém, essa função também pode ser explorada por hackers para invadir sua rede, pois usa um código PIN de 8 dígitos que pode ser descoberto por força bruta.
	
* Mantenha o firmware do seu roteador atualizado. O firmware é o software que controla o funcionamento do seu roteador. Ele pode conter falhas ou vulnerabilidades que podem ser exploradas por hackers para invadir sua rede. Por isso, é importante verificar se há atualizações disponíveis e instalá-las periodicamente.
	
* Escolher uma senha forte para sua rede wireless. Não use senhas padrão ou óbvias, como o nome do roteador, o seu nome, a sua data de nascimento, etc. Use senhas longas e complexas, isto é, que misturem letras maiúsculas e minúsculas, números e símbolos, além de possuir ao menos um comprimento mínimo de 8 e recomendado de 16 caracteres. Em caso de empresas ou de qualquer conta importante, também pode ser uma boa que passe a mudar a senha periodicamente e não a compartilhe com estranhos ou blocos de notas alheios.
	
* Ter um antivírus atualizado e firewall no seu dispositivo. Esses programas podem detectar e bloquear tentativas de invasão ou de infecção por vírus ou malwares. Mantenha-os sempre atualizado, inclusive seu sistema operacional, e faça varreduras periódicas para eliminar possíveis ameaças.
	
* Usar autenticação de dois fatores. Ao configurar a autenticação de dois fatores em contas on-line, é mais difícil para os invasores obter acesso a essas contas, mesmo se eles conseguirem obter senhas.
	
* Verificar se o site que você está acessando é seguro. Observe se há um cadeado ou um https na barra de endereço e se o nome do site está correto. Desconfie de sites que pedem informações sensíveis ou que oferecem ofertas muito vantajosas.


### Resumindo a ópera das medidas de segurança

A segurança da rede wireless é crucial. Evite dar acesso irrestrito à sua rede, especialmente se ela alcança áreas públicas. Use protocolos de segurança robustos como WPA2-PSK ou WPA3 e evite redes públicas desprotegidas. Se necessário, use uma VPN para criptografar seus dados em redes públicas.

Ative o filtro de endereços MAC no roteador para controlar o acesso à rede e verifique regularmente a tabela ARP para evitar duplicações. Desative o WPS, que pode ser explorado por hackers, e mantenha o firmware do roteador atualizado para corrigir possíveis vulnerabilidades.

Escolha senhas fortes e complexas para sua rede wireless e mude-as periodicamente. Mantenha um antivírus atualizado e um firewall ativo no seu dispositivo e use a autenticação de dois fatores sempre que possível.

Por fim, verifique a segurança dos sites que você acessa, procurando por um cadeado ou “https” na barra de endereço. Desconfie de sites que solicitam informações sensíveis ou oferecem ofertas muito boas para serem verdadeiras. A segurança online é uma prática contínua e requer vigilância constante.


## Considerações finais

Seguindo essas dicas, você pode aumentar a sua segurança e a da sua rede wireless, e evitar que seus dados sejam expostos ou roubados por hackers. Lembre-se que a internet é um lugar maravilhoso, mas também perigoso, e que você deve estar sempre atento e protegido. As últimas dicas colocadas servem para outros cenários, não apenas para redes wireless corporativas e/ou residensiais. Talvez algumas coisas possam parecer um exagero dependendo da sua realidade, porém em muitos casos a coisa não pode ser vista assim - principalmente se estivermos falando de uma empresa - e cabe a você decidir isso agora que sabe de muitos dos riscos. Nesses casos empresariais, colocar uma rede de visitante separado de qualquer sistema interno é super importante, não é recomendado compartilhar a mesma rede usada pelos funcionários para os clientes. 

Espero que este post, com essas dicas, tenha sido útil e esclarecedor para você e sua empresa. Então, caso tenha gostado deste conteúdo, compartilhe com seus amigos nas redes sociais e deixe seu comentário abaixo.


Atenciosamente,
Matheus Laidler.