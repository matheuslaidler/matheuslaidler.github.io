---
title: Comunicação de dados e Protocolos de Rede
description: 'Resumão geral da matéria com resolução de exercício'
author: matheus
tags: ["Redes", "WiFi"]
categories: ["Road2Tech", "Redes de Computadores"]
pin: false
comments: true
---

# 💬 Comunicação de dados e Protocolos

## Redes de Computadores: Uma Visão Geral

As redes de computadores desempenham um papel crucial na conectividade e comunicação modernas. Uma arquitetura comumente utilizada é o modelo em camadas, como nos modelos OSI e TCP/IP, que organiza as funcionalidades em diferentes camadas. Serviços são essenciais nesse contexto, sendo conjuntos de operações oferecidos por uma camada à camada superior, sem revelar os detalhes de implementação. Um serviço atua como uma interface entre camadas, onde a inferior é o provedor e a superior é a usuária. *(1)*

## Protocolos de Transporte na Internet: TCP e UDP

A camada de transporte na Internet desempenha um papel vital no transporte de mensagens entre aplicações cliente e servidor. Dois protocolos principais, TCP e UDP, são fundamentais nesse contexto. 

### Fatores de escolha entre TCP e UDP:

**Latência**: UDP tem menor latência por não precisar estabelecer conexão
**Confiabilidade**: TCP garante entrega e ordem, UDP não
**Overhead**: TCP tem maior overhead devido aos controles
**Tempo real**: UDP é preferível para aplicações que precisam de resposta imediata

O TCP oferece serviços orientados à conexão, garantindo a entrega de mensagens e controle de fluxo. Em contraste, o UDP é não orientado à conexão, sendo mais econômico, mas sem garantias de confiabilidade ou controle de fluxo. *(2)*

### Controles avançados do TCP:

**Flow Control**: Mecanismo que impede que o remetente sobrecarregue o receptor
- Usa janela deslizante (sliding window)
- Receptor anuncia tamanho da janela disponível
- Remetente ajusta velocidade de envio

**Congestion Control**: Evita congestionamento na rede
- Slow Start: Começa devagar e aumenta exponencialmente
- Congestion Avoidance: Crescimento linear após limite
- Fast Recovery: Recuperação rápida de perdas

Tendo em mente o que falamos, como o UDP ser "mais rápido" que o TCP, mas sem confiabilidade de entrega, veremos como / onde esses protocolos são utilizados;

### TCP (Transmission Control Protocol)

Alguns exemplos adicionais de protocolos de rede que operam sobre tcp:

1. **FTP (File Transfer Protocol)**
   - **Uso:** Transferência de arquivos entre um cliente e um servidor.
   - **Descrição:** O FTP é comumente usado para upload e download de arquivos entre dispositivos em uma rede. Ele utiliza o TCP para garantir uma transferência confiável de dados.
2. **SMTP (Simple Mail Transfer Protocol)**
   - **Uso:** Envio de e-mails entre servidores de e-mail.
   - **Descrição:** O SMTP é usado para enviar e-mails através da Internet. Ele utiliza o TCP para garantir a entrega confiável de mensagens entre servidores de e-mail.
3. **DNS (Domain Name System)**
   - **Uso:** Resolução de nomes de domínio para endereços IP.
   - **Descrição:** O DNS converte nomes de domínio legíveis por humanos em endereços IP. Ele pode operar sobre UDP para consultas simples e sobre TCP para transações mais longas ou zonas de transferência.
4. **SSH (Secure Shell)**
   - **Uso:** Acesso remoto seguro a dispositivos.
   - **Descrição:** O SSH fornece uma maneira segura de acessar dispositivos remotos. Ele utiliza o TCP para estabelecer uma conexão segura e criptografada para comandos e transferência de arquivos.
5. **HTTPS (Hypertext Transfer Protocol Secure)**
   - **Uso:** Transferência segura de dados na web.
   - **Descrição:** O HTTPS é uma 'versão segura' do HTTP e é usado para transmitir dados de maneira segura pela web. Ele utiliza o TCP para estabelecer uma conexão segura, geralmente usando o TLS/SSL para criptografar os dados transmitidos.
6. **POP3 (Post Office Protocol 3)**
   - **Uso:** Recuperação de e-mails do servidor.
   - **Descrição:** O POP3 é usado por clientes de e-mail para recuperar mensagens do servidor. Opera sobre o TCP para garantir a confiabilidade na transferência de dados.
7. **SNMP (Simple Network Management Protocol)**
   - **Uso:** Gerenciamento e monitoramento de dispositivos de rede.
   - **Descrição:** O SNMP é usado para coletar informações e gerenciar dispositivos de rede. Pode operar sobre UDP para consultas simples e sobre TCP para operações mais complexas.

### UDP (User Datagram Protocol)

Alguns exemplos adicionais de protocolos de rede que operam sobre udp:

1. **DNS (Domain Name System)**
   - **Uso:** Resolução de nomes de domínio para endereços IP.
   - **Descrição:** O DNS pode operar sobre UDP para consultas rápidas e simples. As consultas DNS são geralmente pequenas e podem se beneficiar da natureza não orientada à conexão do UDP.
2. **DHCP (Dynamic Host Configuration Protocol)**
   - **Uso:** Atribuição dinâmica de configuração de rede a dispositivos.
   - **Descrição:** O DHCP utiliza o UDP para fornecer automaticamente configurações de IP e outras informações de rede a dispositivos quando se conectam a uma rede.
3. **TFTP (Trivial File Transfer Protocol)**
   - **Uso:** Transferência de arquivos simples.
   - **Descrição:** O TFTP é um protocolo simples de transferência de arquivos usado para transferir arquivos entre um cliente e um servidor. Ele opera sobre o UDP devido à sua simplicidade e baixo overhead.
4. **SNMP (Simple Network Management Protocol)**
   - **Uso:** Gerenciamento e monitoramento de dispositivos de rede.
   - **Descrição:** O SNMP pode operar sobre UDP para operações de consulta mais simples. A natureza sem conexão do UDP é adequada para consultas rápidas de informações de gerenciamento.
5. **NTP (Network Time Protocol)**
   - **Uso:** Sincronização de relógios em uma rede.
   - **Descrição:** O NTP é usado para sincronizar relógios em dispositivos de uma rede. Ele utiliza o UDP para transmitir informações de tempo de maneira eficiente.
6. **VoIP (Voice over Internet Protocol)**
   - **Uso:** Transmissão de voz em chamadas pela Internet.
   - **Descrição:** Muitas implementações de VoIP, como o protocolo SIP (Session Initiation Protocol), usam o UDP devido à sua baixa latência e à tolerância a pequenas perdas de pacotes, que são mais aceitáveis em serviços de voz em tempo real.
7. **Syslog**
   - **Uso:** Envio de mensagens de log em uma rede.
   - **Descrição:** O Syslog é usado para enviar mensagens de log de dispositivos de rede para um servidor de log. A natureza sem conexão do UDP permite um envio rápido de mensagens, embora não garanta a entrega.

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
