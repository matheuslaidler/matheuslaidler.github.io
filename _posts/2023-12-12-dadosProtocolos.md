---
title: Comunicação de dados e Protocolos de Rede
description: 'Resumão geral da matéria com resolução de exercício'
author: matheus
tags: ["Redes", "WiFi", "Protocolos", "TCP", "UDP"]
categories: ["Road2Tech", "Redes de Computadores"]
pin: false
comments: true
---

# Comunicação de dados e Protocolos

Esse resumão foi feito com base em questões de prova da faculdade, então além de servir como material de estudo, tem as respostas das questões no final. Achei interessante compartilhar porque acaba cobrindo bastante coisa sobre protocolos de rede de forma prática.

## Redes de Computadores: Visão Geral

Quando falamos de redes de computadores, precisamos entender que tudo funciona em camadas - tanto no modelo OSI (7 camadas) quanto no TCP/IP (4 camadas). Cada camada oferece um "serviço" pra camada de cima, como se fosse uma linha de montagem onde cada estação faz seu trabalho sem precisar saber como a anterior ou a próxima funcionam.

## Os dois reis da camada de transporte: TCP e UDP

Na camada de transporte, dois protocolos dominam o jogo: TCP e UDP. A escolha entre eles depende do que você precisa.

**Quando usar TCP:** Se você precisa de confiabilidade - que os dados cheguem completos, na ordem certa, sem perda. Navegação web, email, download de arquivos... tudo isso usa TCP.

**Quando usar UDP:** Se você precisa de velocidade e aceita perder um pacote ou outro. Jogos online, streaming, videochamadas... o UDP é a escolha certa.

O TCP tem mecanismos bem interessantes pra garantir que tudo funcione:

**Flow Control** é tipo um controle de velocidade. O receptor diz pro emissor "calma aí, tô sobrecarregado" através de uma janela deslizante. Assim ninguém "afoga" o outro com dados demais.

**Congestion Control** é parecido, mas olha pra rede como um todo. O TCP começa mandando poucos dados (Slow Start), vai aumentando exponencialmente até detectar congestionamento, depois cresce de forma linear (Congestion Avoidance). Se perder pacote, reduz a velocidade drasticamente.

### Protocolos que usam TCP

Vou listar os principais porque é bom ter essa referência na cabeça:

**FTP** - Transferência de arquivos. Quando você faz upload/download via FTP, precisa que o arquivo chegue inteiro, então faz total sentido usar TCP.

**SMTP** - Envio de emails. Seu email precisa chegar no servidor, não pode se perder no meio do caminho.

**DNS** - Resolução de nomes. Na real, DNS usa os dois - UDP pra consultas rápidas (a maioria) e TCP pra transferências de zona entre servidores.

**SSH** - Acesso remoto seguro. Seus comandos precisam chegar na ordem certa, imagina o caos se não chegassem.

**HTTPS** - Web segura. Igual ao HTTP, mas com TLS/SSL por cima criptografando tudo.

**POP3** - Download de emails. Precisa da confiabilidade do TCP pra garantir que seus emails cheguem inteiros.

### Protocolos que usam UDP

**DNS** - Já mencionei, mas pra consultas simples o UDP resolve mais rápido.

**DHCP** - Quando você conecta numa rede e recebe um IP automaticamente. Precisa ser rápido, e se perder um pacote, o dispositivo pede de novo.

**TFTP** - Transferência de arquivos simplificada. Menos recursos que o FTP, usado em situações específicas como boot de rede.

**NTP** - Sincronização de relógios. Se um pacote se perder, o próximo corrige de qualquer forma.

**VoIP** - Chamadas de voz. Se perder um pedacinho da voz, é menos pior que ter delay. Por isso UDP com sua baixa latência ganha aqui.

**Syslog** - Logs de sistema. Se perder um log, paciência - o importante é não atrasar o sistema gerando logs.

Vale lembrar que, embora o UDP seja mais leve que o TCP, ele não oferece garantias de entrega ou ordenação de pacotes, sendo mais adequado para casos em que a perda ocasional de pacotes é **aceitável**.

## Protocolos Modernos e Evoluções

### QUIC (Quick UDP Internet Connections)

**QUIC** representa uma evolução significativa baseada em UDP mas com características avançadas:

- **Multiplexing sem bloqueio**: Múltiplas streams independentes
- **Criptografia integrada**: TLS 1.3 por padrão
- **Conexão rápida**: 0-RTT para reconexões
- **Migração de conexão**: Sobrevive a mudanças de rede

### HTTP/3 e gRPC

**HTTP/3**: Nova versão do HTTP baseada em QUIC
- Melhor performance em redes instáveis
- Menor latência de conexão
- Resistência a head-of-line blocking

**gRPC**: Framework de RPC moderno
- Baseado em HTTP/2
- Protocol Buffers para serialização
- Suporte a streaming bidirecional
- Ideal para microserviços

### Protocolos de Segurança

**TLS (Transport Layer Security)**:
- Substituto do SSL
- Criptografia em nível de transporte
- Autenticação de servidores
- Integridade dos dados

**IPSec (Internet Protocol Security)**:
- Segurança em nível de rede
- VPNs corporativas
- Autenticação e criptografia
- Modos tunnel e transport

### QoS (Quality of Service)

**Conceitos fundamentais**:
- **Bandwidth**: Largura de banda garantida
- **Latency**: Atraso máximo tolerado
- **Jitter**: Variação na latência
- **Packet Loss**: Taxa máxima de perda aceitável

**Técnicas de QoS**:
- **Traffic Shaping**: Controle de taxa de tráfego
- **Packet Prioritization**: Priorização de pacotes
- **DSCP Marking**: Marcação de pacotes para classificação
- **Queue Management**: Gerenciamento de filas

**Aplicações práticas**:
- Videoconferências requerem baixa latência
- Streaming precisa de bandwidth consistente
- Jogos online necessitam baixo jitter
- Aplicações críticas precisam de prioridade alta

## Impactos na Escolha do Protocolo de Transporte

#### Idealizando cenário #1> HTTP sobre UDP

Suponha que o HTTP utilizasse o UDP como protocolo de transporte em vez do TCP. Isso resultaria em desafios consideráveis, pois o HTTP não é idealmente adequado para operar sobre o UDP. Dois impactos esperados seriam:

1. **Probabilidade Aumentada de Perda de Pacotes:**
   - O UDP não garante a entrega confiável de pacotes, aumentando a chance de perda durante a transmissão.
   - Experiência do usuário insatisfatória, com lentidão no carregamento ou falhas completas em páginas da web.
2. **Menor Controle sobre Fluxo e Congestionamento:**
   - O UDP não possui mecanismos para gerenciar fluxo e congestionamento.
   - Impacto negativo no desempenho da aplicação, contribuindo para uma experiência desfavorável ao usuário.

**Exemplo:** Funcionamento em plataformas de vídeo, como o _YouTube_, seria afetado pela perda de pacotes e falta de controle sobre o fluxo e congestionamento.

#### Idealizando cenário #2> Um aluno na faculdade

No cenário em que um usuário leva seu notebook à faculdade para conectar-se à rede sem fio, vários protocolos são acionados:

1. **Wi-Fi (Protocolo de Acesso à Rede sem Fio):**
   - Estabelece conexão sem fio entre o notebook e o ponto de acesso Wi-Fi da faculdade.
   - Camada TCP/IP: Enlace
   - Dispositivos: Notebook, ponto de acesso Wi-Fi via roteador.
2. **ARP (Protocolo de Resolução de Endereços) - Parte do Protocolo Wi-Fi:**
   - Mapeia endereços IP para endereços MAC na camada de enlace.
   - Camada TCP/IP: Enlace
3. **DHCP (Protocolo de Configuração Dinâmica de Host):**
   - Fornece ao notebook um endereço IP válido dentro da rede sem fio.
   - Camada TCP/IP: Rede
   - Dispositivo: Servidor DHCP da faculdade.
4. **DNS (Protocolo de Resolução de Endereços):**
   - Converte o URL da página em um endereço IP.
   - Camada TCP/IP: Aplicação
   - Dispositivo: Servidor DNS.
5. **HTTP (Protocolo de Transferência de Hipertexto):**
   - Permite solicitação e transferência de recursos entre notebook e servidor web.
   - Camada TCP/IP: Aplicação
   - Dispositivo: Servidor web.
6. **TCP (Protocolo de Controle de Transmissão):**
   - Fornece conexão confiável entre notebook e servidor web.
   - Camada TCP/IP: Transporte
   - Dispositivos: Notebook e servidor web.

Esses protocolos desempenham papéis essenciais, proporcionando uma experiência de conectividade fluida ao usuário. O ARP, embora não seja explicitamente mencionado, é relevante no contexto do protocolo Wi-Fi para garantir a comunicação eficiente na rede sem fio.

_Lembrando que a conexão em uma rede wifi pública não é segura, isso porque é fácil envenenar a tabela ARP de forma que o atacante consiga se passar por outro dispositivo para coleta e leitura de pacotes, ficando entre a conexão dos dois dispositivos como um espião. Simplificando em outras palavras, o atacante pode se passar pelo roteador para o alvo e ele passar os dados do alvo ao roteador como se fosse o mesmo, porém tendo acesso a todos os pacotes nessa comunicação. Deixarei esta parte para ser melhor explorada em outro artigo focado em cibersegurança._

## Referências

- ***Tanenbaum, A. S.; Wetherall, D. J. (2011). Redes de computadores. 5ª edição. Pearson.*** *(1)*
- ***Kurose, J. F.; Ross, K. W. (2021). Redes de computadores e a Internet: uma abordagem top-down. 8ª edição. Grupo A.** (2)*

#### *Questões*

*PS: texto acima responde as questões e é um ótimo resumo de tudo, isso porque foi feito com base nelas, porém também colocarei minha resposta junto da questão para deixar mais didático.*;

**Questão 1**:

Suponha que o protocolo HTTP (HyperText Transfer Protocol) tivesse sido projetado para usar o UDP como protocolo de transporte em vez do TCP. Cite e explique 2 impactos esperados pela utilização do UDP como protocolo de transporte subjacente ao HTTP._

**Resposta:**

Se o protocolo HTTP fosse implementado no protocolo de transporte UDP em vez do TCP, enfrentaríamos desafios consideráveis, uma vez que o HTTP não é idealmente adequado para operar sobre o UDP. Isso poderia acarretar em impactos problemáticos, incluindo uma probabilidade aumentada de perda de pacotes, por exemplo, impactando adversamente a experiência do usuário.

Como mencionado anteriormente, o primeiro impacto negativo seria um aumento na probabilidade de perda de pacotes, uma vez que o UDP não garante a entrega confiável de pacotes. Isso poderia resultar em uma experiência insatisfatória para o usuário, com páginas da web apresentando lentidão no carregamento ou, em casos mais graves, falhando em carregar completamente.

Um segundo impacto que pode ser apresentado está relacionado à diminuição no controle sobre o fluxo e congestionamento, pois o UDP carece de mecanismos para gerenciar congestionamentos. Isso poderia levar a congestionamentos na rede e atrasos na transmissão de pacotes, prejudicando o desempenho da aplicação e contribuindo para uma experiência desfavorável ao usuário.

Em última análise, o usuário sempre sofreria devido à falta de controle e resolução, acarretando em um serviço que não funcionaria de maneira adequada e previsível. Um exemplo que pode ser apresentado para representar as problemáticas é o funcionamento em plataformas de vídeo, como Youtube. A perda de pacotes e a falta de controle sobre o fluxo e congestionamento poderiam resultar em lentidão no carregamento dos vídeos e uma experiência insatisfatória para o usuário.

**Questão 2:**

Imagine um cenário no qual um usuário leva o seu notebook à faculdade com a intenção de ligá-lo à rede sem fio da escola e acessar uma determinada página na Internet. Agora,_

- *Identifique cinco possíveis protocolos de redes (estudados nesta UC) que são acionados desde o instante em que o notebook é ligado no raio de cobertura da rede sem fio da faculdade até o momento em que a página solicitada é aberta pelo navegador;*
- *Explique a função de cada protocolo no cenário proposto;*
- *Indique a camada do modelo TCP/IP à qual cada protocolo pertence;*
- *Identifique os tipos de dispositivos envolvidos no uso de cada protocolo.*

**Resposta:**

No cenário proposto, os cinco possíveis protocolos de redes que podem ser acionados desde o instante em que o notebook é ligado no raio de cobertura da rede sem fio da faculdade até o momento em que a página solicitada é aberta pelo navegador são:

- **Wi-Fi | Protocolo de Acesso à Rede sem Fio || ARP | Protocolo de Resolução de Endereços**

**Função>** Estabelece a conexão sem fio entre o notebook e o ponto de acesso da rede sem fio da faculdade;

**Camada TCP/IP>** Camada de Enlace; . Dispositivo envolvido> Notebook e ponto de acesso Wi-Fi via roteador;

**ARP>** Protocolo ARP é mencionado aqui como parte do protocolo de acesso à rede sem fio, por ser responsável por mapear endereços IP para endereços MAC na camada de enlace, permitindo que os dispositivos se comuniquem dentro da rede LAN. Portanto, achei apropriado incluir o ARP nesse contexto já que estamos tratando de um acesso a uma local inicialmente.

- **DHCP | Protocolo de Configuração Dinâmica de Host**

**Função>** Fornece ao notebook um endereço IP válido dentro da rede sem fio da faculdade, junto com outras configurações de rede necessárias;

**Camada TCP/IP>** Camada de Rede;

**Dispositivo envolvido>** Servidor DHCP da faculdade.

- **DNS | Protocolo de Resolução de Endereços**

**Função>** Converte o URL da página solicitada em um endereço IP correspondente, permitindo que o notebook encontre o servidor correto na Internet;

**Camada TCP/IP>** Camada de Aplicação

**Dispositivo envolvido>** Servidor DNS.

- **HTTP | Protocolo de Transferência de Hipertexto**

**Função>** Permite a solicitação e transferência de recursos (página web) entre o notebook e o servidor web;

**Camada TCP/IP>** Camada de Aplicação;

**Dispositivo envolvido>** Servidor web.

- **TCP | Protocolo de Controle de Transmissão**

**Função>** Fornece uma conexão confiável e orientada a fluxo entre o notebook e o servidor web, garantindo a entrega ordenada e sem perda dos pacotes;

**Camada TCP/IP>** Camada de Transporte;

**Dispositivo envolvido>** Notebook e servidor web.

_**Textos motivadores e referenciais:**_\

*Em uma arquitetura de redes em camadas (como nos modelos OSI e TCP/IP), um serviço consiste em um conjunto de primitivas (operações) que uma camada oferece à camada situada acima dela. O serviço define as operações que a camada está preparada para executar em nome de seus usuários, mas não revela absolutamente nada sobre como essas operações são implementadas. Um serviço está relacionado a uma interface entre duas camadas, sendo a camada inferior o provedor do serviço e a camada superior o usuário do serviço.*

*TANENBAUM, A. S.; WETHERALL, D. J. Redes de computadores. 5. ed. São Paulo, SP: Pearson, 2011. Acesso em: 27 ago. 2023.*

*“A camada de transporte da Internet carrega mensagens da camada de aplicação entre os lados do cliente e servidor de uma aplicação. Há dois protocolos de transporte na Internet: TCP e UDP (do inglês User Datagram Protocol — Protocolo de Datagrama de Usuário), e qualquer um pode levar mensagens da camada de aplicação. O TCP provê serviços orientados à conexão para suas aplicações. Alguns desses serviços são a entrega garantida de mensagens da camada de aplicação ao destino e controle de fluxo (i.e., adequação das velocidades do remetente e do receptor). O TCP provê mecanismo de controle de congestionamento, de modo que uma origem reduz sua velocidade de transmissão quando a rede está congestionada. O protocolo UDP provê serviço não orientado à conexão para suas aplicações. É um serviço econômico que não oferece confiabilidade, nem controle de fluxo ou de congestionamento.”*

*KUROSE, J. F.; ROSS, K. W. Redes de computadores e a Internet: uma abordagem top-down. 8. ed. São Paulo: Grupo A, 2021. p. 35. Acesso em: 27 ago. 2023.*

*“Todas as atividades na Internet que envolvem duas ou mais entidades remotas comunicantes são governadas por um protocolo. Por exemplo, protocolos executados no hardware de dois computadores conectados fisicamente controlam o fluxo de bits no cabo entre as duas placas de interface de rede; protocolos de controle de congestionamento em sistemas finais controlam a taxa com que os pacotes são transmitidos entre a origem e o destino; protocolos em roteadores determinam o caminho de um pacote da origem ao destino. Eles estão em execução por toda a Internet [...]” (KUROSE; ROSS, 2014, p. 6).*

*KUROSE, J. F.; ROSS, K. W. Redes de computadores e a Internet: uma abordagem top-down. 6. ed. São Paulo: Pearson Addison Wesley, 2014.*

*A Internet e as redes de computadores, em geral, fazem uso intenso de protocolos para realizar diferentes tarefas de comunicação. Como exemplo, imaginemos o que acontece quando fazemos uma simples requisição a um servidor web, isto é, quando um usuário digita o URL de uma página web no navegador. O servidor receberá, na verdade, várias mensagens de requisição e retornará os objetos (página-base em HTML, imagens, vídeos, scripts, etc.) que compõem a página requisitada. O navegador se encarregará de formatar e apresentar a página ao usuário. Contudo, para que isso aconteça, inúmeros dispositivos e protocolos devem interagir (de acordo com a lógica do modelo em camadas), em um processo que se mostra muito mais complexo do que parece ser. (Ulife)*
