---
title: Desvendando a Forense Digital
description: Conhecendo a computação forense
tags: ["Forense digital", "Análise Forense", "Esteganografia", "Criptografia", "Ferramentas Forense"]
categories: ["Forensic Trail"]
pin: false
date: 2023-08-20 18:29:10 +02:00
author: matheus
comments: true
---

# Computação Forense à primeira vista
Introdução geral para a área tecnológica de forense computacional.

# Conhecendo a área

A computação forense é uma área da ciência da computação que se dedica a investigar e analisar dados digitais com o objetivo de encontrar evidências ou informações relevantes para casos judiciais, criminais ou administrativos. A computação forense envolve diversas etapas, desde a aquisição de imagem dos dispositivos de armazenamento até a recuperação de arquivos apagados ou ocultos. Neste texto, vamos explicar um pouco mais sobre cada uma dessas etapas e como elas podem ajudar a solucionar crimes ou problemas envolvendo dados digitais.

# Tópcicos e etapas importantes

Vamos passar um pente fino para clarear e apresentar sobre alguns tópicos importantes desta área da tecnologia investigativa

## Aquisição de imagem

A primeira etapa da computação forense é a aquisição de imagem, que consiste em copiar os dados de um dispositivo de armazenamento, como um HD ou um SSD, para outro meio, como um pendrive ou um CD. Essa cópia deve ser feita de forma fiel e íntegra, preservando todas as características e propriedades dos dados originais. Para isso, são usadas ferramentas específicas que garantem a autenticidade e a integridade da imagem, como o uso de hashing de arquivos.

## Hashing de arquivos

O hashing de arquivos é uma técnica que permite gerar um código único para cada arquivo, chamado de hash ou resumo criptográfico. Esse código é uma sequência de caracteres que representa o conteúdo do arquivo e que muda completamente se qualquer alteração for feita no arquivo. 

Por exemplo, se um arquivo tem o hash 1234567890abcdef, e uma letra for mudada no arquivo, o hash será outro, como 0987654321fedcba. Assim, o hashing permite verificar se um arquivo foi modificado ou não, comparando os hashes antes e depois da cópia. 

Nesse sentido, o `hashing` também pode ser usado para identificar arquivos duplicados ou maliciosos. 

>Outra ocasião que utiliza-se de hashing é em armazenamento de senhas em banco de dados. 
>Não seria prudente armazenas dados sensíveis de forma aberta e sem proteção.
>Para criar exemplos práticos de hash, você pode ir até a minha ferramenta `Cryptool` e gerar a hash de qualquer coisa que escrever, podendo escolher entre os tipos MD5, SHA-1, SHA-256 e SHA3-256.

## Análise de arquivos

A análise de arquivos é a etapa em que os dados copiados são examinados para encontrar informações relevantes para a investigação. Essa análise pode ser feita de forma manual ou automatizada, usando ferramentas que permitem visualizar, filtrar, classificar e extrair dados dos arquivos. A análise pode envolver diferentes aspectos dos arquivos, como:

- O tipo do arquivo: se é um documento, uma imagem, um vídeo, um áudio, etc.
- O formato do arquivo: se é um PDF, um JPG, um MP4, um MP3, etc.
- O conteúdo do arquivo: o texto, a imagem, o som, etc.
- Os metadados do arquivo: as informações adicionais sobre o arquivo, como o autor, a data de criação, a localização geográfica, etc.

## Recuperação de arquivos

A recuperação de arquivos é a etapa em que se tenta recuperar dados que foram apagados ou corrompidos nos dispositivos de armazenamento. 

Essa recuperação é possível porque quando um arquivo é apagado ou corrompido, **ele não é realmente eliminado do disco**, mas apenas marcado como espaço livre para ser sobrescrito por novos dados. Enquanto isso não acontece, o arquivo ainda pode ser recuperado usando ferramentas que conseguem ler os dados marcados como livres. 

A recuperação depende do tipo de dispositivo de armazenamento e do sistema operacional usado.

Para entender melhor vamos dar um breve resumo sobre os discos rígidos de armazenamento.

### Ferramentas de recuperação

Algumas das ferramentas mais conhecidas e utilizadas na computação forense para recuperação de arquivos:

 - **R-STUDIO**: É uma das melhores ferramentas no mercado para recuperação de dados e possui duas versões, a paga e a gratuita, sendo compatível com três sistemas operacionais: Windows, Mac e Linux. Além disso, suporta Desktops, IOS e mantém suporte a dispositivos baseados na web.

 - **DMDE**: É mais uma ferramenta de recuperação de dados em discos, mas que possui recursos como editor de disco, gerenciador de partição, cria imagens e clone de discos, recupera arquivos de painel atual, além de fazer a reconstrução de RAID.

 - **Imã Forense**: É uma ferramenta que oferece a organizações dos setores público e privado uma forma criativa e inovadora de recuperação de dados forenses para combater os crimes atuais.

 - **Wondershare Recuperar**: É uma ferramenta confiável que pode ajudá-lo a realizar a recuperação de dados forenses com facilidade.

 - **AccessData**: É uma ferramenta amplamente utilizada em tribunais, governos, exércitos e outros locais altamente confidenciais.

 - **X-Ways**: É um programa que oferece uma grande variedade de ferramentas que ajudam no processo de recuperação de dados forenses.

 - **Tecnologias BlackBag**: É uma ferramenta confiável que pode ajudá-lo a realizar a recuperação de dados forenses com facilidade.

 - **Cellebrite**: É uma ferramenta confiável que pode ajudá-lo a realizar a recuperação de dados forenses com facilidade.

 - **CERT**: É uma 'Ferramentas de Triagem' confiável que pode ajudá-lo a realizar a recuperação de dados forenses com facilidade.

 - **SIFT**: É um programa que oferece uma grande variedade de ferramentas, incluindo _log2timeline_ para gerar uma linha do tempo a partir de logs do sistema, _Scalpel_ para a criação de arquivos de dados, _Rifiuti_ para examinar a lixeira e muito mais.

 >**Atenção**: Tentativas excessivas de recuperação e/ou uso incorreto de ferramentas para recuperação de dados dos discos rígidos, sistemas RAID, pendrives e várias outras mídias de armazenamento de dados, podem agravar o problema nas mídias físicas. 
 >Portanto, o **conhecimento de cada ferramenta** para um determinado trabalho e cenário **é crucial para evitar danos adicionais aos dispositivos de armazenamento durante a recuperação de dados**.

### Sobre HD e SSD

Um HD (hard disk) é um dispositivo de armazenamento que usa discos magnéticos para gravar os dados (mais próximo de uma vitróla). 
Um SSD (solid state drive) é um dispositivo de armazenamento que usa chips de memória flash para gravar os dados (mais próximo de um pendrive). 

A funcionalidade da escrita e leitura de dados desses dois tipos de armazenamento têm diferenças importantes no seu funcionamento, como em termos de _velocidade_ e _durabilidade_.

- O **HD**, ou `disco rígido`, é uma memória não volátil que usa discos magnéticos para guardar as informações. Esses discos giram em alta velocidade e são lidos por um braço mecânico que se move sobre eles (assim como em uma vitróla com agulha sobre o disco, e por isso a fragilidade o qual qualquer pancada tem risco de corromper e comprometer dados). 
  O **processo de escrita e leitura** é feito por meio da alteração ou detecção da magnetização dos pontos na superfície dos discos.

- O **SSD**, ou ´unidade de estado sólido`, é uma memória não volátil que usa 'células' de memória flash para armazenar os dados. Essas células são acessadas eletronicamente por um controlador de memória que executa as funções do drive. 
  O **processo de escrita e leitura** é feito por meio da aplicação ou verificação de uma carga elétrica nas células.

Os dois dispositivos têm vantagens e desvantagens em relação à **recuperação de dados**.

- Um HD geralmente tem mais capacidade de armazenamento e é mais barato que um SSD. No entanto, ele é **mais lento e mais suscetível a danos físicos**. 
  Além disso, ele usa uma técnica chamada `fragmentação` para otimizar o espaço no disco. A fragmentação consiste em dividir os arquivos em pedaços menores e distribuí-los pelo disco, podendo apenas **dificultar** a recuperação dos arquivos apagados ou corrompidos.
- Um SSD geralmente tem menos capacidade de armazenamento e é mais caro que um HD. No entanto, ele é **mais rápido e mais resistente a danos físicos**. 
  Além disso, ele usa uma técnica chamada `trim` para otimizar o desempenho do dispositivo, que consiste em **apagar** os dados marcados como livres de forma definitiva e **isso pode impedir a recuperação dos arquivos apagados ou corrompidos**.

Então, resumidamente, a principal diferença entre o HD e o SSD é que o primeiro tem partes móveis e mecânicas, enquanto o segundo é todo formado por circuitos integrados. Por isso o SSD acaba sendo mais rápido, silencioso e resistente do que o HD, e também geralmente mais caro (atualmente deu uma boa melhorada).
Na hora de escolher entre um HD e um SSD, é preciso levar em conta as suas necessidades e preferências. Se você busca mais desempenho (não estamos falando de ganho de FPS), agilidade e segurança, o SSD pode ser uma boa opção. Se você precisa de mais espaço, economia e compatibilidade, o HD pode ser mais adequado.
A recomendação é uso de SSD sempre que possível.

### Sobre Windows e Linux

Windows e Linux são dois sistemas operacionais que podem ser usados nos dispositivos de armazenamento, os quais também têm vantagens e desvantagens em relação à recuperação de dados.

- O **Windows** é o sistema operacional mais popular e mais fácil de usar. No entanto, ele usa um sistema de arquivos chamado `NTFS`, que é mais complexo e menos flexível que outros sistemas. 
  O NTFS usa uma estrutura chamada `MFT` (master file table), que armazena as informações sobre os arquivos, como o nome, o tamanho, a localização, etc. Se a MFT for danificada, a recuperação dos arquivos pode ser impossível.
- O **Linux** é um kernel de uma *distribuição*, que este sim é um sistema operacional - geralmente gratuito - e bem usado por profissionais e especialistas. No entanto, como estamos falando sobre diversos tipos de sistemas operacionais que operam com o linux, acaba que vários sistemas de arquivos podem ser utilizados, como o `EXT4`, o `XFS`, o `BTRFS` e etc. 
  Em geral, esses sistemas são mais simples e mais flexíveis que o NTFS, já que utilizam uma estrutura chamada `inode`, que armazena as informações sobre os arquivos, como o tipo, o dono, as permissões, etc. Se o inode for danificado, a recuperação dos arquivos pode ser possível usando ferramentas que conseguem reconstruir a estrutura.

>Ambos os sistemas possuem ferramentas e opções de criptografia geral do disco, precisando de uma senha para poder bootar e utilizar o disco, ainda podendo precisar da senha de usuário para entrar no sistema - caso assim esteja configurado.

## Queima de arquivo

O `apagamento seguro` é uma técnica que permite eliminar os dados de forma definitiva e irreversível dos dispositivos de armazenamento. 

Essa técnica consiste em **sobrescrever** os dados várias vezes com padrões aleatórios ou zeros, impedindo que eles sejam recuperados por qualquer ferramenta. O apagamento seguro pode ser feito usando programas específicos ou comandos do sistema operacional.

Outra técnica utilizada é a queima e/ou destruição do dispositivo de armazenamento, assim realmente não teria forma de recuperar os dados.

## Auditoria de sistema

A `auditoria de sistema` é a etapa em que se verifica as configurações e as atividades realizadas no sistema operacional do dispositivo de armazenamento. 

Essa auditoria pode revelar informações importantes para a investigação, como:

- Os **usuários** cadastrados no sistema e seus perfis
- Os **programas** instalados e executados no sistema
- Os **arquivos** acessados, modificados ou excluídos no sistema
- Os **registros** de eventos do sistema (logs)
- As **conexões** de rede do sistema
- As **senhas** salvas no sistema

Para realizar a auditoria, são usadas ferramentas que permitem acessar e analisar tais informações, como o _Regedit_, o _Event Viewer_, o _Netstat_, o _Nirsoft_, entre outros.

## Criptoanálise

Primeiro vamos falar brevemente sobre o que é `criptografia`.

A criptografia é uma técnica que permite transformar os dados em um código incompreensível para quem não tem a chave ou a senha para 'descriptografá-los'. 
Nesse sentido, ela pode ser usada para proteger os dados de acessos não autorizados ou para ocultar informações sensíveis ou ilícitas.

Já a criptoanálise é uma etapa em que se tenta decifrar ou quebrar os dados que foram criptografados ou protegidos por algum método de segurança. 

Existem vários tipos de criptografia, como:

- A **criptografia simétrica**: usa a mesma chave para criptografar e descriptografar os dados. _Exemplos: AES, DES e RC4._
- A **criptografia assimétrica**: usa uma chave pública para criptografar e uma chave privada para descriptografar os dados. _Exemplos: RSA, ECC, DSA._
- A **criptografia híbrida**: usa uma combinação dos dois tipos anteriores. _Exemplo: SSL/TLS._

Para realizar a criptoanálise, são usadas ferramentas que permitem tentar descobrir ou forçar as chaves ou as senhas usadas na criptografia, como o John the Ripper, o Hashcat (e até o Wireshark), entre outros.

## Análise de esteganografia

Para falar sobre como é a sua análise, precisamos primeiro falar sobre o que de fato ela é.

A `Esteganografia` é uma técnica que permite esconder informações dentro de outras informações aparentemente inocentes ou irrelevantes, e pode ser usada para evitar a detecção ou a interceptação dos dados por quem não tem a chave correta ou o conhecimento necessário para decifrar a informação escondida. Ela é frequentemente usada para comunicações seguras, proteção de dados e várias outras aplicações onde a privacidade e a segurança são importantes, além de poder ser utilizada ao arrepido da lei em determinadas situações.

Já a `Análise de Esteganografia` é uma técnica de computação forense que visa detectar e extrair informações ocultas em arquivos digitais, como imagens, áudios, vídeos ou textos, isto é, uma etapa importante de uma investigação forense em que se tenta detectar ou extrair os dados que foram escondidos dentro de outros dados usando algum método de ocultação. Essas informações podem ser usadas para fins maliciosos, como espionagem, sabotagem, fraude ou terrorismo. Por isso, é importante conhecer os métodos e ferramentas que permitem realizar essa análise e revelar os segredos escondidos.

### Métodos de esteganografia
  
 - Um dos métodos mais comuns de esteganografia é a **inserção de bits de informação em uma imagem**, alterando levemente sua cor ou brilho. 
   Essa alteração é imperceptível ao olho humano, mas pode ser detectada por um programa de computador que analisa o espectograma da imagem, ou seja, a representação gráfica das frequências e intensidades dos pixels. Um exemplo de ferramenta que faz essa análise é o Stegsolve, que permite visualizar diferentes camadas da imagem e identificar possíveis padrões ou mensagens ocultas.

 - Outro método é usar um editor hexadecimal para modificar diretamente os dados binários de uma imagem, inserindo um texto codificado em uma área específica do arquivo. 
   Um editor hexadecimal é um programa que permite visualizar e editar os dados em formato hexadecimal, que é uma forma de representar números binários usando 16 símbolos (0 a 9 e A a F). 
   _(Um exemplo de editor hexadecimal é o HxD, que permite abrir qualquer tipo de arquivo e alterar seus bytes livremente)_

Existem também programas específicos para esconder informações em arquivos, como o OpenPuff e o Quick Stego. 
 - O `Quick Stego` é um software mais simples, que permite esconder apenas textos em imagens, usando um método chamado LSB (Least Significant Bit), que consiste em substituir o bit menos significativo de cada pixel pelo bit correspondente do texto.
 - Já o `OpenPuff` é um software que usa técnicas avançadas de criptografia e compressão para ocultar vários tipos de arquivos em imagens, áudios ou vídeos. Ele também permite escolher um nível de segurança e uma senha para proteger os dados. 

Uma outra forma de esconder *informações* em *imagens* é usar QR Code.
 - **Códigos QR** (Quick Response) são códigos de barras bidimensionais que podem armazenar dados alfanuméricos. Este pode ser gerado por um site ou aplicativo, como o QR Code Generator, e inserido em uma imagem usando um editor gráfico, como o Photoshop. Para ler o código, basta usar um leitor específico, como o QR Code Reader, que pode ser instalado em um smartphone ou tablet.

Um método mais *sofisticado* de esteganografia é **usar textos em spam** para ocultar mensagens. 
 - Esse método **SpamText** consiste em gerar textos aleatórios ou sem sentido, usando palavras-chave relacionadas a um assunto específico, como medicamentos, viagens ou negócios. Esses textos são enviados por e-mail ou publicados em sites ou redes sociais, com o objetivo de despistar os filtros anti-spam e atrair a atenção dos destinatários. No entanto, esses textos podem conter informações codificadas, que podem ser decifradas por quem conhece o algoritmo usado para gerá-los. Um exemplo de ferramenta que faz isso é o Spam Mimic, que permite escrever e decodificar mensagens usando vários tipos de spam.

Além disso tudo, existe uma forma muito simples de esteganografia que qualquer usuário normal de windows pode fazer para esconder arquivos em imagens. 
 - Esse método consistem em usar o **WinRAR**. Como já devem conhecer, é um programa que permite compactar e descompactar arquivos em vários formatos, como ZIP ou RAR. Para esconder um arquivo em uma imagem, basta selecionar os dois arquivos no Windows Explorer, clicar com o botão direito do mouse e escolher a opção "Adicionar ao arquivo...". Na janela que se abre, escolher o formato RAR e marcar a opção "Criar arquivo SFX". Isso vai gerar um arquivo executável com a extensão .exe e o ícone da imagem original. Para extrair o arquivo oculto, basta executar o arquivo .exe e escolher a pasta de destino.

Como se pode ver, existem vários métodos e ferramentas para realizar a análise de esteganografia, uma técnica essencial para a computação forense. Essa análise pode revelar informações valiosas para a investigação e solução de crimes cibernéticos, bem como para a proteção da segurança e da privacidade dos usuários. 
Por isso, é importante estar atento aos sinais de que uma imagem pode conter algo mais do que aparenta, e usar os recursos adequados para desvendar os mistérios da esteganografia.

## Lista de Ferramentas Forense

Segue algumas ferramentas comuns, algumas podendo ser facilmente achadas em distribuições linux com foco em área de segurança ou forense, como Kali.

 - **Volatility**: Este Framework é uma coleção de ferramentas, de código livre e gratuita, para análise de memória RAM. Normalmente utilizada em ambientes Linux, e já presente em algumas distribuições, como o Kali Linux.

 - **FTK Imager**: É uma ferramenta de visualização e geração de imagens de dados que permite examinar arquivos e pastas em discos rígidos locais, unidades de rede, CDs/DVDs e revisar o conteúdo de imagens forenses ou despejos de memória.

 - **CAINE**: Computer Aided Investigative Environment é o Live CD do Linux que contém uma grande quantidade de ferramentas forenses digitais.

 - **HxD**: É um editor hexadecimal de fácil utilização que permite realizar edição e modificação de baixo nível de um disco bruto ou da memória principal (RAM).

 - **ExifTool**: É um aplicativo de linha de comando usado para ler, gravar ou editar informações de metadados de arquivos.

 - **Sistema IPED**: É um programa computacional forense desenvolvido no Brasil, por peritos federais, para a investigação na Operação Lava Jato.

 - **Binwalk**: É uma ótima ferramenta quando temos uma imagem binária e temos que extrair arquivos embutidos e códigos executáveis deles.

 - **p0f**: É uma ferramenta que pode identificar o sistema operacional de um host de destino simplesmente examinando os pacotes capturados.

 - **pdf-parser**: É uma ferramenta que analisa um documento PDF para identificar os elementos fundamentais usados ​​no arquivo PDF analisado.

 - **Dumpzilla**: É uma ferramenta para extrair todas as informações interessantes e descobrir o máximo de dados forenses possíveis do armazenamento do Mozilla Firefox, Google Chrome e Internet Explorer.

#### Links referenciais sobre ferramentas forense

Alguns links interessantes para ter de referências sobre as ferramentas.
 - [10 ferramentas gratuitas de um perito Forense Digital - Medium: Forense Digital Brasil](https://medium.com/@forensedigitalbrasil/10-ferramentas-que-um-perito-forense-nunca-pode-esquecer-6668ce3f02d5)
 - [Principais ferramentas de recuperação - Academia Forense Digital](https://academiadeforensedigital.com.br/recuperacao-de-dados-conheca-as-principais-ferramentas/)
 - [KALI LINUX - FERRAMENTAS FORENSES](https://acervolima.com/kali-linux-ferramentas-forenses/)
 - [Kali Linux Ferramentas Forense - Tutorial](https://isolution.pro/pt/t/kali-linux/kali-linux-forensics-tools/kali-linux-ferramentas-forenses)
 - [LMelhores ferramentas do Kali Linux](https://tecnologia.blackpilado.com.br/2024/01/lista-das-melhores-ferramentas-do-kali.html)
 - [21 Ferramentas de penetração importantes do Kali](https://pt.moyens.net/linux/21-ferramentas-de-penetracao-importantes-no-kali-linux/)

#### Recomendação de conteúdo

Para começar a estudar forense, você pode estudar através de diversos conteúdos gratuitos e pagos pela internet, ou até matérias específicas e/ou cursos de extensõies de uma faculdade. 
Nunca pare de estudar, sempre busque por mais conhecimento. Talvez você queira até estudar para concurso e trabalhar para a polícia federal como investigador forense digital, isso demandaria bastante estudo não apenas dos conteúdos derivados deste post, mas dos conteúdos do concurso. Um futuro difícil e promissor que pode ser traçado por você, mas calma... um passo de cada vez, sem pular etapas. 

Eu tenho três recomendações de conteúdos para quem não sabe nada e quer começar: 
 - Primeiro: O livro "Desvendando a Computação Forense" da Novatec é um bom livro até para quem não sabe nada de computação, pois ele passa pelo básico de computação e explica muito bem sobre forense digital, tendo sido escrito por profissionais da área. Boa porta de entrada.
 - Segundo: Vídeos do youtube. Existe diversos vídeos super bons em conteúdo e gratuitos, também sendo ótimo como porta de entrada. Um canal que eu recomendo é o "Fábrica de Noobs", ele possui diversos vídeos sobre o básico de forense geral, esteganografia e criptografia (com pdf).
 - Terceiro: Aulas disponibilizadas ao público. Esta é basicamente parte da segunda dica. Diversos professores universitários decidem postar suas aulas gratuitas em canais do youtube, desde gringos a brasileiros. Quando eu estudava na UFRJ e fiz a matéria de segurança, meu professor gravava a aula e postava em seu canal do youtube (infelizmente so gravava pela tela do pc, então não tinha ele apontando no quadro sobre o que fala e o audio nunca ficava distante, mas já era algo). Dessa forma quem precisava faltar tinha o conteúdo, além de poder ficar para qualquer entusiasta. Nesta matéria havia a parte de forense e talvez ainda seja possível achar no youtube, seu nome é Claudio Miceli e qualquer conteúdo dele será super recomendado por mim. 

 Espero que tenham gostado desta publicação. Não sou focado na área de forense e ainda tenho muito que aprender, basicamente tentei escrever o pouco que sei de forma introdutória. Se tiver uma forma melhor de introdução ou até se eu tiver esquecido algo, favor me deixe sabendo. Tente comentar, mandar e-mail ou direct, tanto faz. Abração!