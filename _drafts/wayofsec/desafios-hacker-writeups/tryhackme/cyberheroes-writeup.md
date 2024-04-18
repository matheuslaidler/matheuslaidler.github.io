---
title: CyberHeroes - Desafio hacker [TryHackMe]
description: 'Resolvendo Máquina do TryHackMe em português'
author: matheus
tags: ["tryhackme", "WriteUps"]
categories: ["SecLab", "Hacking"]
pin: false
comments: true
---

# 🏆 CyberHeroes — Writeup em Português
### Resolução desafio hacker fácil do TryHackMe
> Want to be a part of the elite club of CyberHeroes? Prove your merit by finding a way to log in!
> Quer fazer parte do clube de elite dos CyberHeroes? Prove seu mérito encontrando uma maneira de fazer login!


Assim que a máquina é iniciada e me fornece o IP necessário para a atividade, começo executando um NMAP. No entanto, confesso que acabei não utilizando, pois enquanto esperava o scan verificar todas as portas, já estava investigando por conta própria. No final, não foi útil.

IP alvo gerado para mim => 10.10.32.251

```shell-session
sudo nmap -sS -sV -p- 10.10.32.251
```

<figure><img src="/../../_drafts/.gitbook/assets/image (20).png" alt=""><figcaption></figcaption></figure>

Então, enquanto o scan estava em execução, já fui testar no navegador e descobri que era um serviço web.

http://10.10.32.251

Cheguei a pensar em deixar um bruteforce de diretório rodando enquanto explorava o site, mas decidi dar uma olhada no código fonte da página primeiro.

<figure><img src="/../../_drafts/.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

<figure><img src="/../../_drafts/.gitbook/assets/image (22).png" alt=""><figcaption></figcaption></figure>

Ao ver os arquivos .css, decidi abrir em uma nova página e testar os diretórios anteriores, mais especificamente o 'assets', que parecia ser usado para armazenar tudo. Para minha surpresa, era acessível, nos dando inclusive os diretórios presentes ali dentro e a versão do Apache. Não foi tão útil assim nesse caso, mas foi interessante pela oportunidade de conseguir investigar alguns arquivos.

<figure><img src="../../_drafts/.gitbook/assets/image (23).png" alt="" width="375"><figcaption></figcaption></figure>

Há muitas coisas que eles fazem nesses CTFs para desviar sua atenção e essa parecia ser uma delas, por isso desisti de ficar investigando isso. Mas, caso eu não encontrasse nada nos próximos passos, eu com certeza voltaria aqui por ter deixado algo passar.

Assim, decidi voltar para a página inicial e continuar a investigar as funcionalidades do site. Me deparei com a aba de login do site. É um 'login.html'. 

> Confesso que ser um `.html` chamou minha atenção.

Tentei algumas opções padrões, como `admin:admin` e até SQL injection com o padrão `'or1=1 --`, até que comecei a pensar em usar minha proxy para depois, talvez, fazer um bruteforce com Hydra.

No entanto, antes disso, decidi olhar primeiro através da ferramenta de desenvolvedor, na aba **network**, para testar o login e, para minha surpresa, não capturava **nada**.

<figure><img src="../../_drafts/.gitbook/assets/image (24).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../_drafts/.gitbook/assets/image (27).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../_drafts/.gitbook/assets/image (25).png" alt=""><figcaption></figcaption></figure>

Isso me fez pensar que era uma autenticação local. Fui até o código fonte e encontrei no JavaScript o login, porém com a senha invertida de trás para frente. Reverti a string via terminal mesmo com o comando `rev`:

```bash
echo "54321@terceSrepuS" | rev
```

Isso resultou na senha: _SuperSecret@12345_

<figure><img src="../../_drafts/.gitbook/assets/image (28).png" alt=""><figcaption></figcaption></figure>

Credenciais **h3ck3rBoi:SuperSecret@12345**
Ao tentar logar...
Pronto!
Ao fazer o login, temos a resposta... super fácil!!
> até achei, por um segundo, que era pegadinha e que poderia ser uma flag falsa... rs

<figure><img src="../../_drafts/.gitbook/assets/image (29).png" alt=""><figcaption></figcaption></figure>

flag{edb0be532c540b1a150c3a7e85d2466e}

Até quis continuar investigando mais, para ver outras formas de concluir, mas minha VM acabou travando e eu desisti.

> Meu perfil na plataforma: https://tryhackme.com/p/laidler