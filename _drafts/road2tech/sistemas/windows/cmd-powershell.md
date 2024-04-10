---
description: Apresentando linhas de comando do Windows
---

# CMD / Powershell

### Comece entendendo as linhas de comando

O CMD e o PowerShell são duas interfaces de linha de comando do Windows, que permitem que os usuários executem comandos e automatizem tarefas em seus sistemas operacionais. Ambas as interfaces suportam a criação de scripts para executar tarefas complexas ou rotineiras.

#### Prompt de comando

Para criar um script no _CMD,_ é necessário abrir o _Bloco de Notas_ ou outro editor de texto simples e salvar o arquivo com a extensão _**".bat"**_. O código dentro do arquivo deve ser escrito em um formato de **comandos do CMD**, como:

```bash
@echo off
echo Hello, World!
pause
```

O comando `echo` imprime uma mensagem na tela, enquanto o comando `pause` mantém a janela do _CMD_ aberta até que o usuário pressione uma tecla. O `@echo off` no início do script **desativa** a exibição dos comandos enquanto eles são executados.

#### Windows PowerShell

Já para criar um script no _PowerShell,_ é necessário abrir o _PowerShell ISE (Integrated Scripting Environment)_ ou outro editor de texto simples e salvar o arquivo com a extensão _**".ps1"**_. O código dentro do arquivo deve ser escrito em um formato de **comandos do PowerShell**, como:

```mathematica
Write-Host "Hello, World!"
Pause
```

O comando `Write-Host` imprime uma mensagem na tela, enquanto o comando `Pause` mantém a janela do _PowerShell_ aberta até que o usuário pressione uma tecla.

O PowerShell é mais poderoso que o CMD, permitindo que os usuários usem comandos mais complexos e até mesmo chamem funções e módulos externos em seus scripts. Além disso, o PowerShell é mais fácil de automatizar, permitindo a execução de scripts com base em eventos do sistema ou horários programados.

#### Conclusão de Introdução

Em resumo, o CMD e o PowerShell são _**duas interfaces de linha de comando no Windows**_ que permitem a **criação de scripts** para automatizar tarefas e executar comandos complexos. O **CMD é mais simples** e tem menos recursos do que o **PowerShell**, que **é mais poderoso e fácil de automatizar**. _Ambas as interfaces são valiosas para usuários avançados do Windows_ _que desejam aproveitar ao máximo o sistema operacional._

> &#x20;~~Extra-_**powershell**_>~~ **Get-Command** pode te ser muito útil se você não souber o nome do comando que está procurando.&#x20;
>
> \
> Quando estamos buscando por comandos no Windows, é importante lembrar que existe uma maneira específica de escrevê-los, que é chamada de sintaxe.&#x20;
>
> Essa sintaxe segue um padrão VERBO-SUBSTANTIVO, onde os verbos são palavras como “Get”, “Set”, “Add”, “Clear”, “Write”, “Read” e os substantivos são os itens que queremos acessar, como arquivos, servidores ou outros elementos em nossa rede ou aplicativos.&#x20;
>
>
>
> ~~_Extra-**cmd**>_~~ **HELP** pode ser um comando útil que te disponibilizará uma lista de comandos que lhe ajudará a pegar ou relembrar determinados comandos
