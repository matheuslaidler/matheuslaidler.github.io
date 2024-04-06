---
layout: post
title: Invadindo rede wifi na prática
description: Mostrando como invadi a rede wifi de uma vizinha da minha mãe
tags: ["Wifi Hacking", "Shell Script", "Brute Force"]
categories: ["SecLab"]
pin: true
draft: true
date: 2023-08-25T08:19:12+02:00
author: Matheus Laidler
---

# Hackeando redes sem fio na prática

Neste artigo vou mostrar para vocês como funciona na prática a invasão de uma rede wireless, e como foi minhas primeiras experiências hackeando redes wifi reais.

Será considerado que você já sabe do básico de redes wireless, como funcionam os protocolos e conceitos, pois eles não serão explicados aprofundadamente nesta publicação. Para isso, teremos uma postagem específica que correrá por toda essa base de forma detalhada.

### O que esperar desta publicação

Nesta postagem será esperado algumas explicações mais _técnicas_ - mas não aprofundadas - dos passos e ferramentas utilizadas no processo, pois o foco é mostrar a prática de uma **invasão em redes wireless** alheias utilizando pacote **Aircrakc-ng**, e *como foi a minha experiência descobrindo uma falha nas credenciais padrões de roteadores de uma grande operadora*, que me permitia **descobrir e ter acesso a qualquer rede que não tivesse alterado as credencias padrões**.

>
>*Vale já esclarecer que o intuito deste tópico é totalmente educativo e não me responsabilizo por nenhum ato de terceiro.* 

>*Deixo* claro *também que, apesar dos pesares, nenhum ato de intenção malígna foi feito e a* operadora *em questão já atualizou sua forma de padronização de credenciais. Por este motivo resolvi repostar sobre esta falha protocolar, visto que muitos usuários ainda podem estar utilizando e ficando vulneráveis e precisam se atentar a isso.*
>

## Como invadi a rede da minha vizinha
Ambientificação de wifi hacking na prática. 

--talvez falar resumidamente e rapidamente sobre alguns conceitos -não aprofundados- de rede wireless, como a forma que funciona a conexão, o que é handshake, etc - e deixando claro que outro material será dedicado para explicar tudo de forma mais aprofundada - podendo ter um CallToAction para a publicação futuramente.

### Contextualização
falando sobre as ferramentas, em quais redes foram testadas e introduzindo tudo, explicando todo o contexto até a parte em que a rede da vizinha também era vulnerável. Falar sobre a claro ter pedido para tirar do ar o script.

### Etapa de Reconhecimento
falar sobre reconhecimento da padronização das credenciais da rede e a vulnerabilidade. Falar sobre reconhecimento das redes que podem estar utilizando esses padrões - com o monitoramento de rede.

### Etapa de Testes de Invasão
falar sobre os testes que são feitos para criação da wordlist até a parte para conseguir handshake.

### Etapa de Exploração
Uma vez conseguindo o que for necessário, fazer a parte final com aircrack de testar a wordlist na rede para a quebra e descoberta da senha.

### Etapa de pós-exploração de uma situação real (alerta de perígo)
nessa parte que temos os perigos de invasão... pode ser comentado sobre possíveis ataques de DNS, MITM, etc. lembrando: tudo apenas para mostrar os perigos de ter um invasor na mesma rede, sem mostrar nada prático nessa parte.

# Finalização 
Falando mais sobre redes wireless vulneráveis, mudança das credenciais padrão e os vários motivos para isso, além dos possiveis problemas q isso pode gerar, tendo um CallToAction para a publicação 'perigos da wifi'.