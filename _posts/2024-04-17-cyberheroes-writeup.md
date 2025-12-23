---
title: CyberHeroes - Desafio hacker [TryHackMe]
description: 'Resolvendo Máquina do TryHackMe em português'
author: matheus
tags: ["tryhackme", "WriteUps"]
categories: ["SecLab", "WayOfSec", "Hacking", "Write Ups"]
pin: false
comments: true
---

# CyberHeroes — Writeup em Português

### Resolução desafio hacker fácil do TryHackMe

> Want to be a part of the elite club of CyberHeroes? Prove your merit by finding a way to log in!
> Quer fazer parte do clube de elite dos CyberHeroes? Prove seu mérito encontrando uma maneira de fazer login!

Assim que a máquina é iniciada e me fornece o IP necessário para a atividade, começo executando um Nmap. No entanto, confesso que acabei não utilizando o resultado, pois enquanto esperava o scan verificar todas as portas, já estava investigando por conta própria e acabei resolvendo antes mesmo dele terminar.

IP alvo gerado para mim => 10.10.32.251

## Scan

```shell-session
sudo nmap -sS -sV -p- 10.10.32.251
```

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FGEMaUxr5d98f23TVKLyd%2Fimage.png?alt=media&token=1bb229fa-0172-45c5-87c7-deeba569ec17){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Então, enquanto o scan estava em execução, já fui testar no navegador e descobri que era um serviço web rodando na porta 80.

http://10.10.32.251

Cheguei a pensar em deixar um bruteforce de diretório rodando enquanto explorava o site, mas decidi dar uma olhada no código fonte da página primeiro - e ainda bem que fiz isso.

## Investigação

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2F0jQgUybhwmrKuKZDrKq0%2Fimage.png?alt=media&token=696a3053-34c7-4392-962c-6f4c59f74a78){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FPPyM08wirBDXgkiZbNBL%2Fimage.png?alt=media&token=2cf929ab-e76d-4f53-9590-c10cd6a766e2){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Ao ver os arquivos .css sendo carregados, decidi abrir em uma nova aba e testar os diretórios anteriores, mais especificamente o `/assets/`, que parecia ser usado para armazenar os recursos do site. Para minha surpresa, o directory listing estava habilitado, mostrando inclusive os diretórios presentes ali dentro e a versão do Apache. Não foi tão útil assim nesse caso, mas foi interessante ter essa possibilidade de investigar os arquivos.

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2F8KKZpyEMvx0R2mRk9KHK%2Fimage.png?alt=media&token=022798df-8776-4049-a0b2-aec8abc9b7be2){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Há muitas coisas que eles fazem nesses CTFs para desviar sua atenção e essa parecia ser uma delas, então desisti de ficar investigando isso. Mas caso eu não encontrasse nada nos próximos passos, com certeza voltaria aqui achando que tinha deixado algo passar.

Voltei para a página inicial e continuei investigando as funcionalidades do site. Me deparei com a aba de login. É um `login.html`.

> Confesso que ser um `.html` chamou minha atenção - geralmente logins são processados no backend com PHP ou algo do tipo.

## Tela de Login

Tentei algumas opções padrões, como `admin:admin` e até SQL injection básico com `' or 1=1 --`. Comecei a pensar em usar o Burp para interceptar a requisição e depois fazer um bruteforce com Hydra.

No entanto, antes de partir pra isso, decidi dar uma olhada na aba **Network** das ferramentas de desenvolvedor enquanto tentava fazer login. E para minha surpresa, não capturava **nada**... nenhuma requisição era feita pro servidor.

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2Fl44Ccp5ng7NoSUcNkEHG%2Fimage.png?alt=media&token=7b606ed5-453f-41bd-ae62-07da550cfce8){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FQ5H8N5e7j9nggXEUZU9D%2Fimage.png?alt=media&token=a0fc7f55-1736-4d39-8684-c955ff118d40){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2Fe5eUZ7f5PgwQZk9egQk1%2Fimage.png?alt=media&token=e3a32b8d-f680-4b93-b569-52e7e07636f6){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Isso me fez pensar que poderia se tratar de uma autenticação feita totalmente no client-side (ou seja, no JavaScript do navegador). Fui até o código fonte e bingo - encontrei no JavaScript a lógica de autenticação, incluindo a senha! Porém ela estava invertida de trás pra frente como uma tentativa básica de ofuscação.

Para reverter a string, usei o comando `rev` no terminal:

```bash
echo "54321@terceSrepuS" | rev
```

Isso resultou em: **SuperSecret@12345**

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FhW5h5uKjtL9qp2NO9KMa%2Fimage.png?alt=media&token=01873c5e-7689-46c5-8251-c91c4ac6de61){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FBZphJxtTE7JfGyb9lCAi%2Fimage.png?alt=media&token=534373e4-8cff-4ca4-b57f-bb6c34543927){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Credenciais encontradas: **h3ck3rBoi:SuperSecret@12345**

Ao fazer o login com essas credenciais...

Pronto! Temos a flag!

> Até achei, por um segundo, que era pegadinha e que poderia ser uma flag falsa... rs

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FEfkLtaDXSVmkaATehNQD%2Fimage.png?alt=media&token=59219c29-5047-4d86-aebc-68a32bd7c024){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

```txt
flag{edb0be532c540b1a150c3a7e85d2466e}
```

---

## Considerações Finais

Esse CTF foi bem simples, mas serviu pra reforçar algumas coisas importantes.

A principal lição aqui é: **sempre olhe o código fonte e monitore as requisições de rede**. Nesse caso, o fato de não haver nenhuma requisição HTTP ao tentar fazer login já era um sinal claro de que a autenticação estava sendo feita no client-side - o que é uma péssima prática de segurança, mas que aparece bastante em CTFs iniciantes.

Outra coisa que vale mencionar é sobre ofuscação básica. Strings invertidas, Base64, ROT13... esse tipo de "proteção" não protege nada de verdade. Se está no código do cliente, está exposto. Para testar rapidamente essas transformações, o [CyberChef](https://gchq.github.io/CyberChef/) é uma mão na roda - é tipo um canivete suíço pra decodificar qualquer coisa.

E por fim, mesmo que o Nmap não tenha sido útil nesse caso específico, é sempre bom deixar rodando enquanto você faz a investigação manual. Às vezes você resolve antes dele terminar (como aconteceu aqui), mas outras vezes ele vai te mostrar portas e serviços que você não teria descoberto de outra forma.

> Meu perfil na plataforma: https://tryhackme.com/p/laidler