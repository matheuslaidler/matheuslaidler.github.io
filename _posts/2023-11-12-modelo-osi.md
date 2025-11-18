---
title: Conhecendo o Modelo OSI
description: 'Resumo introdutório sobre o modelo OSI'
author: matheus
tags: ["Redes"]
categories: ["Road2Tech", "Redes de Computadores"]
pin: false
comments: true
---

# 🥞 Redes: Modelo OSI à primeira vista

### Modelo de interconexão de sistemas abertos

###### Introdução

O modelo OSI (Open Systems Interconnection) é uma estrutura teórica que **define** uma arquitetura de rede de computadores em camadas. Criado pela International Organization for Standardization (ISO), o modelo OSI é usado para **padronizar** a comunicação de dados entre diferentes sistemas de computadores. 

Esse modelo é dividido em sete camadas, cada uma com funções específicas e independentes, desde a camada física até a camada de aplicação. Cada camada é responsável por tratar de uma parte específica da comunicação de dados, tornando a troca de informações mais eficiente.

<img title="" src="../assets/img/content/modeloOSI.png" alt="modeloOSI.png" data-align="center" width="466">

O modelo OSI é importante porque fornece uma base conceitual para o projeto e implementação de redes de computadores. Ele ajuda a identificar as funções e responsabilidades de cada camada, permitindo que os desenvolvedores possam criar soluções mais eficientes e compatíveis com diferentes sistemas.

Por exemplo, a **camada física** lida com as características elétricas e físicas da comunicação de dados, enquanto a **camada de aplicação** lida com a interação do usuário com os aplicativos que utilizam a rede.

Apesar de ser amplamente utilizado em treinamentos e certificações na área de redes de computadores, é importante ressaltar que **nem sempre as redes seguem o modelo OSI estritamente na prática**. Muitas vezes, são usados modelos híbridos, com camadas diferentes ou combinações de protocolos, dependendo das necessidades específicas da rede.

Mesmo com as adaptações, o **modelo OSI continua sendo uma referência** importante para o desenvolvimento de redes de computadores. Compreender sua estrutura e suas camadas pode ajudar a entender o funcionamento de redes e sistemas de comunicação de dados.

Por exemplo, a **camada física** lida com as características elétricas e físicas da comunicação de dados, enquanto a **camada de aplicação** lida com a interação do usuário com os aplicativos que utilizam a rede.

Apesar de ser amplamente utilizado em treinamentos e certificações na área de redes de computadores, é importante ressaltar que **nem sempre as redes seguem o modelo OSI estritamente na prática**. Muitas vezes, são usados modelos híbridos, com camadas diferentes ou combinações de protocolos, dependendo das necessidades específicas da rede.

Mesmo com as adaptações, o **modelo OSI continua sendo uma referência** importante para o desenvolvimento de redes de computadores. Compreender sua estrutura e suas camadas pode ajudar a entender o funcionamento de redes e sistemas de comunicação de dados.

## As 7 Camadas do Modelo OSI

### Camada 7 - Aplicação (Application Layer)

**Função:** Interface direta com o usuário final, fornecendo serviços de rede para aplicações.

**Características:**
- Camada mais próxima do usuário
- Define protocolos para aplicações específicas
- Gerencia sessões de aplicação e formatação de dados

**Protocolos comuns:**
- **HTTP/HTTPS**: Navegação web
- **FTP**: Transferência de arquivos
- **SMTP**: Envio de emails
- **POP3/IMAP**: Recebimento de emails
- **DNS**: Resolução de nomes
- **DHCP**: Configuração automática de rede
- **SSH**: Acesso remoto seguro

**Exemplo prático:** Quando você acessa um site, o navegador usa HTTP para comunicar com o servidor web.

### Camada 6 - Apresentação (Presentation Layer)

**Função:** Formatação, criptografia e compressão dos dados.

**Características:**
- Tradução de dados entre formatos
- Criptografia e descriptografia
- Compressão e descompressão
- Conversão de caracteres (ASCII, Unicode)

**Exemplos de implementação:**
- **SSL/TLS**: Criptografia para HTTPS
- **JPEG, GIF, PNG**: Formatos de imagem
- **MP3, MP4**: Formatos de mídia
- **ZIP, RAR**: Compressão de arquivos

**Exemplo prático:** Quando você acessa um site HTTPS, esta camada criptografa/descriptografa os dados.

### Camada 5 - Sessão (Session Layer)

**Função:** Estabelecimento, gerenciamento e término de sessões de comunicação.

**Características:**
- Controle de diálogo (full-duplex ou half-duplex)
- Sincronização de dados
- Recuperação de sessão em caso de falhas
- Controle de pontos de verificação

**Protocolos e tecnologias:**
- **NetBIOS**: Serviços de rede Windows
- **RPC**: Chamadas de procedimento remoto
- **SQL Sessions**: Sessões de banco de dados
- **Zoom/Teams**: Gerenciamento de videoconferências

**Exemplo prático:** Quando você faz login em um sistema, uma sessão é estabelecida e mantida até o logout.

### Camada 4 - Transporte (Transport Layer)

**Função:** Entrega confiável de dados entre dispositivos finais.

**Características:**
- Controle de fluxo
- Correção de erros
- Segmentação e remontagem de dados
- Multiplexação de conexões

**Principais protocolos:**

**TCP (Transmission Control Protocol):**
- Confiável, orientado à conexão
- Controle de erro e fluxo
- Ideal para: navegação web, emails, transferência de arquivos

**UDP (User Datagram Protocol):**
- Rápido, sem conexão
- Sem garantia de entrega
- Ideal para: jogos online, streaming, DNS

**Exemplo prático:** TCP garante que uma página web seja carregada completamente; UDP permite streaming de vídeo em tempo real.

### Camada 3 - Rede (Network Layer)

**Função:** Roteamento de pacotes entre diferentes redes.

**Características:**
- Endereçamento lógico (IP)
- Determinação do melhor caminho
- Fragmentação e remontagem de pacotes
- Controle de congestionamento

**Principais protocolos:**
- **IPv4/IPv6**: Protocolo de internet
- **ICMP**: Mensagens de controle (ping)
- **OSPF, BGP**: Protocolos de roteamento
- **IPSec**: Segurança na camada de rede

**Dispositivos típicos:**
- Roteadores
- Switches Layer 3

**Exemplo prático:** Quando você envia um email para alguém em outro país, roteadores usam esta camada para encontrar o melhor caminho.

### Camada 2 - Enlace de Dados (Data Link Layer)

**Função:** Comunicação confiável entre dispositivos na mesma rede física.

**Características:**
- Endereçamento físico (MAC)
- Controle de acesso ao meio
- Detecção e correção de erros
- Controle de fluxo local

**Subdivisões:**
- **LLC** (Logical Link Control): Interface com camada de rede
- **MAC** (Medium Access Control): Acesso ao meio físico

**Protocolos e tecnologias:**
- **Ethernet**: Redes cabeadas
- **Wi-Fi (802.11)**: Redes wireless
- **PPP**: Conexões ponto a ponto
- **Frame Relay**: Redes WAN

**Dispositivos típicos:**
- Switches
- Bridges
- Pontos de acesso WiFi

**Exemplo prático:** Quando dois computadores na mesma rede local se comunicam, usam endereços MAC para identificação.

### Camada 1 - Física (Physical Layer)

**Função:** Transmissão de bits brutos através do meio físico.

**Características:**
- Especificações elétricas e mecânicas
- Codificação de sinais
- Sincronização de bits
- Topologia física

**Meios de transmissão:**
- **Cabeado**: Fibra óptica, cabo coaxial, par trançado
- **Wireless**: Radiofrequência, microondas, infravermelho
- **Outros**: Satélite, laser

**Características técnicas:**
- Voltagem e corrente
- Frequências utilizadas
- Conectores e cabos
- Taxa de transmissão (bandwidth)

**Dispositivos típicos:**
- Hubs
- Repetidores
- Cabos e conectores
- Antenas

**Exemplo prático:** O cabo Ethernet que conecta seu computador ao roteador opera nesta camada.

## PDUs - Unidades de Dados de Protocolo

Cada camada trabalha com uma unidade específica de dados:

| Camada | PDU | Descrição |
|--------|-----|-----------|
| 7-5 | **Dados** | Informação pura da aplicação |
| 4 | **Segmentos** (TCP) / **Datagramas** (UDP) | Dados + cabeçalho de transporte |
| 3 | **Pacotes** | Segmentos + cabeçalho IP |
| 2 | **Quadros** | Pacotes + cabeçalho Ethernet |
| 1 | **Bits** | Representação elétrica/óptica |

## Modelo OSI vs Modelo TCP/IP

### Comparação das camadas:

| OSI | TCP/IP | Função Principal |
|-----|--------|------------------|
| 7. Aplicação | Aplicação | Interface com usuário |
| 6. Apresentação | Aplicação | Formatação de dados |
| 5. Sessão | Aplicação | Controle de sessão |
| 4. Transporte | Transporte | Entrega fim-a-fim |
| 3. Rede | Internet | Roteamento |
| 2. Enlace | Acesso à Rede | Comunicação local |
| 1. Física | Acesso à Rede | Transmissão física |

### Diferenças práticas:

**Modelo OSI:**
- ✅ Teórico e educacional
- ✅ Separação clara de funções
- ❌ Mais complexo na implementação

**Modelo TCP/IP:**
- ✅ Prático e amplamente usado
- ✅ Simplicidade
- ❌ Menor granularidade

## Exemplo Prático: Navegação Web

Vamos acompanhar uma requisição HTTP através das camadas:

### No dispositivo de origem:
1. **Aplicação**: Navegador cria requisição HTTP
2. **Apresentação**: Dados são criptografados (HTTPS)
3. **Sessão**: Estabelece sessão TCP
4. **Transporte**: TCP adiciona porta de origem/destino
5. **Rede**: IP adiciona endereços origem/destino
6. **Enlace**: Ethernet adiciona endereços MAC
7. **Física**: Converte em sinais elétricos

### No dispositivo de destino:
1. **Física**: Recebe sinais elétricos
2. **Enlace**: Verifica endereço MAC e remove cabeçalho
3. **Rede**: Verifica endereço IP e remove cabeçalho
4. **Transporte**: Verifica porta e reconstitui dados
5. **Sessão**: Gerencia a sessão estabelecida
6. **Apresentação**: Descriptografa dados
7. **Aplicação**: Servidor web processa a requisição
