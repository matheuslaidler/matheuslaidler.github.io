---
title: CyberHeroes - Desafio hacker [TryHackMe]
author: matheus
tags:
  - tryhackme
  - WriteUps
categories:
  - SecLab
  - Hacking
pin: false
comments: true
description: 'TryHackMe WriteUp: Super Heroes Machine'
---

# 🏆 CyberHeroes — Writeup

Uma vez que a máquina é iniciada e me manda o IP necessário para brincar, já começo rodando um NMAP, mas confesso que acabei nem usando pq enquanto eu esperava o scan ir em todas as portas eu ja ia investigando por fora. No final das contas não me foi útil.

Meu IP gerado foi> 10.10.32.251

```shell-session
sudo nmap -sS -sV -p- 10.10.32.251
```

<figure><img src="../../../.gitbook/assets/image (20).png" alt=""><figcaption></figcaption></figure>

Então, enquanto o scan rodava eu já fui testar no navegador e vimos ser um serviço web

http://10.10.32.251\
\
\
\
Eu até pensei em deixar um bruteforce de diretório rodando enquanto eu explorava o site, eu só iria dar uma olhada no código fonte da página primeiro.\


<figure><img src="../../../.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (22).png" alt=""><figcaption></figcaption></figure>

Ao ver os arquivos .css decidi abrir em nova página e testar os diretórios anteriores, mas especificamente o 'assets' que parecia ser usado para armazenar tudo.  Para minha surpresa, era acessível nos dando inclusive os diretórios presentes ali dentro e a versão do apache. Não foi tão útil assim nesse caso, mas foi interessante, deu para dar uma investigada em alguns arquivos.\


<figure><img src="../../../.gitbook/assets/image (23).png" alt="" width="375"><figcaption></figcaption></figure>

Tem muita coisa q eles fazem nesses ctfs para tirar sua atenção e essa parecia ser uma dessas coisas, mas caso eu n achasse nada eu com certeza voltaria aqui.&#x20;

Resolvi voltar para a página inicial para voltar a investigar as funcionalidades do site e vi a aba de login do site. É um 'login.html'. Confesso que ser um login.html me chamou um pouco a atenção. \
\
Fui tentando algumas opções padrões, como admin:admin e até sql injection ('or1=1 --)... comecei a pensar em usar minha proxy para dps talvez fazer um bruteforce com hydra ou algo do tipo.\
\
Porém, antes disso eu decidi olhar primeiro através da ferramenta de desenvolvedor, na aba **network**, para testar o login e, para minha surpresa, não capturava nada. \


<figure><img src="../../../.gitbook/assets/image (24).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (27).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (25).png" alt=""><figcaption></figcaption></figure>

O que me fez pensar em ser uma autenticação local. Fui até o código fonte e achei no javascript o login, porém com a senha invertida de trás para frente. Reverti a string via terminal mesmo com o comando \`rev\`.



<figure><img src="../../../.gitbook/assets/image (32).png" alt=""><figcaption></figcaption></figure>

```bash
echo "54321@terceSrepuS" | rev
```

Resultando na senha: _SuperSecret@12345_

<figure><img src="../../../.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

Login> **h3ck3rBoi:SuperSecret@12345**\
Pronto!

Ao fazer o login, temos a resposta.. super fácil, até achei q era pegadinha e que poderia ser uma flag falsa... rs

<figure><img src="../../../.gitbook/assets/image (29).png" alt=""><figcaption></figcaption></figure>

flag{edb0be532c540b1a150c3a7e85d2466e}\
\
Até quis continuar investigando mais, para ver outras formas de concluir, mas minha VM acabou crashando e eu desisti.\
\
