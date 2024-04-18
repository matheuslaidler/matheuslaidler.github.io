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

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FGEMaUxr5d98f23TVKLyd%2Fimage.png?alt=media&token=1bb229fa-0172-45c5-87c7-deeba569ec17){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Então, enquanto o scan estava em execução, já fui testar no navegador e descobri que era um serviço web.

http://10.10.32.251

Cheguei a pensar em deixar um bruteforce de diretório rodando enquanto explorava o site, mas decidi dar uma olhada no código fonte da página primeiro.

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2F0jQgUybhwmrKuKZDrKq0%2Fimage.png?alt=media&token=696a3053-34c7-4392-962c-6f4c59f74a78){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FPPyM08wirBDXgkiZbNBL%2Fimage.png?alt=media&token=2cf929ab-e76d-4f53-9590-c10cd6a766e2){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Ao ver os arquivos .css, decidi abrir em uma nova página e testar os diretórios anteriores, mais especificamente o 'assets', que parecia ser usado para armazenar tudo. Para minha surpresa, era acessível, nos dando inclusive os diretórios presentes ali dentro e a versão do Apache. Não foi tão útil assim nesse caso, mas foi interessante pela oportunidade de conseguir investigar alguns arquivos.

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2F8KKZpyEMvx0R2mRk9KHK%2Fimage.png?alt=media&token=022798df-8776-4049-a0b2-aec8abc9b7be2){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Há muitas coisas que eles fazem nesses CTFs para desviar sua atenção e essa parecia ser uma delas, por isso desisti de ficar investigando isso. Mas, caso eu não encontrasse nada nos próximos passos, eu com certeza voltaria aqui por ter deixado algo passar.

Assim, decidi voltar para a página inicial e continuar a investigar as funcionalidades do site. Me deparei com a aba de login do site. É um 'login.html'. 

> Confesso que ser um `.html` chamou minha atenção.

Tentei algumas opções padrões, como `admin:admin` e até SQL injection com o padrão `'or1=1 --`, até que comecei a pensar em usar minha proxy para depois, talvez, fazer um bruteforce com Hydra.

No entanto, antes disso, decidi olhar primeiro através da ferramenta de desenvolvedor, na aba **network**, para testar o login e, para minha surpresa, não capturava **nada**.

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2Fl44Ccp5ng7NoSUcNkEHG%2Fimage.png?alt=media&token=7b606ed5-453f-41bd-ae62-07da550cfce8){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FQ5H8N5e7j9nggXEUZU9D%2Fimage.png?alt=media&token=a0fc7f55-1736-4d39-8684-c955ff118d40){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2Fe5eUZ7f5PgwQZk9egQk1%2Fimage.png?alt=media&token=e3a32b8d-f680-4b93-b569-52e7e07636f6){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Isso me fez pensar que era uma autenticação local. Fui até o código fonte e encontrei no JavaScript o login, porém com a senha invertida de trás para frente. Reverti a string via terminal mesmo com o comando `rev`.

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FhW5h5uKjtL9qp2NO9KMa%2Fimage.png?alt=media&token=01873c5e-7689-46c5-8251-c91c4ac6de61){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

```bash
echo "54321@terceSrepuS" | rev
```

Isso resultou na senha: _SuperSecret@12345_

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FBZphJxtTE7JfGyb9lCAi%2Fimage.png?alt=media&token=534373e4-8cff-4ca4-b57f-bb6c34543927){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Credenciais **h3ck3rBoi:SuperSecret@12345**
Ao tentar logar...
Pronto!
Ao fazer o login, temos a resposta... super fácil!!
> até achei, por um segundo, que era pegadinha e que poderia ser uma flag falsa... rs

![Desktop View](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FEfkLtaDXSVmkaATehNQD%2Fimage.png?alt=media&token=59219c29-5047-4d86-aebc-68a32bd7c024){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

flag{edb0be532c540b1a150c3a7e85d2466e}

Até quis continuar investigando mais, para ver outras formas de concluir, mas minha VM acabou travando e eu desisti.

> Meu perfil na plataforma: https://tryhackme.com/p/laidler