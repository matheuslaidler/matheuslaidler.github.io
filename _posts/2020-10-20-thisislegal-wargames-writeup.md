---
title: Wargames e CTFs - Resolvendo desafios do ThisIsLegal
description: 'Introdução prática a CTFs e wargames com writeups completos dos desafios do ThisIsLegal'
author: matheus
tags: ["ctf", "wargames", "hacking", "writeup", "thisislegal", "segurança", "web security", "challenges"]
categories: ["WayOfSec"]
pin: false
comments: true
---

## O que diabos é um Wargame?

Se você tá entrando agora no mundo de segurança, provavelmente já ouviu falar de CTF ou wargame e ficou tipo "que?" - então deixa eu explicar.

Wargames são basicamente sites ou plataformas com desafios de hacking pra você resolver. Não, você não vai invadir nada real. São ambientes controlados, feitos especificamente pra você praticar técnicas de segurança de forma legal. Daí o nome de um dos sites mais clássicos: **ThisIsLegal** - isso é legal (no sentido de permitido, não de "dahora" kk).

A ideia é simples: você tem um desafio, precisa achar a flag ou a senha ou completar algum objetivo usando técnicas de hacking. Pode ser desde olhar o código fonte de uma página até fazer SQL Injection, quebrar criptografia, engenharia reversa... depende do desafio.

## E o tal do CTF?

CTF significa Capture The Flag - Capture a Bandeira. É basicamente a mesma ideia dos wargames, mas geralmente em formato de competição. Tem times (nem sempre), geralmente tem pontuação, tem VPN para acesso a máquina, tem tempo limite. Muitas vezes é quase um campeonato de hacking, mas ainda não chega a ser a mesma coisa... muitos usam CTFs para treinar para os campeonatos de verdade.

Nesse sentido, geralmente temos dois formatos principais:

**Jeopardy:** Você tem várias categorias (web, crypto, forensics, pwn, misc...) e cada categoria tem desafios valendo pontos. Resolve o desafio, ganha os pontos. Quem tem mais pontos no final ganha.

**Attack-Defense:** Cada time tem uma infraestrutura pra defender e precisa atacar a dos outros. Mais complexo, mais caótico, mais divertido.

Pra quem tá começando, o formato Jeopardy é mais acessível. E wargames como o ThisIsLegal são perfeitos pra treinar antes de entrar em CTFs de verdade.

## Por que fazer isso?

Olha, eu poderia falar que é pra aprender, pra treinar, pra ficar bom em segurança... e é tudo isso mesmo. Mas vou ser honesto: é divertido pra caramba. Aquela sensação de ficar travado num desafio por horas e finalmente conseguir resolver é viciante.

Além disso, essas plataformas te ensinam a pensar como atacante e te força a entender mais a aplicação, a falha, a exploração... Você começa a olhar pra sistemas de um jeito diferente, procurando onde pode ter a brecha necessária para concluir o objetivo. E isso é exatamente o que você precisa tanto pra atacar quanto pra defender.

## ThisIsLegal

O ThisIsLegal é um wargame clássico com vários tipos de desafios. Tem challenges básicos pra quem tá começando, challenges "realistas" que simulam cenários mais próximos do mundo real, desafios de programação, SQL, criptografia, engenharia reversa de aplicações... é bem completo.

Vou mostrar como resolver os desafios que eu fiz até agora. Se você quer treinar, recomendo tentar resolver sozinho primeiro antes de olhar as soluções. A graça tá na jornada, não só no destino.

**Aviso:** Se você só copiar as respostas sem entender o que tá fazendo, você não vai aprender nada. Tenta resolver, quebra a cabeça, pesquisa. Só olha a solução quando realmente travar.

---

## Parte 1: Basic Challenges

Esses são os desafios de entrada. Se você nunca fez nada de hacking web, começa por aqui. Parece fácil (e alguns são), mas os conceitos que você aprende aqui aparecem em tudo que vem depois.

### Challenge 1 - View Source

O desafio pede pra encontrar a senha na página. Primeira coisa que você faz quando quer entender uma página web: olha o código fonte.

Clica com botão direito na página e vai em "Ver código fonte" ou "Inspecionar elemento". Também dá pra usar Ctrl+U na maioria dos navegadores. Procurando no HTML você acha a senha ali, de bobeira.

A senha é `easy321` - e sim, foi fácil mesmo. Esse desafio existe pra te ensinar que muita informação sensível fica exposta no client-side. Desenvolvedores às vezes deixam senhas, chaves de API, comentários com informações internas... tudo visível pra quem souber olhar.

### Challenge 2 - JavaScript Authentication

Mais um de olhar o código fonte, mas dessa vez tem um pouco de JavaScript envolvido. Abrindo o código você encontra algo assim:

```javascript
if (form.username.value=="admin" && form.password.value=="iamgod") {
```

Pronto. Login é `admin`, senha é `iamgod`. 

Lição aqui: nunca, jamais, em hipótese alguma faça validação de login no client-side. JavaScript roda no navegador do usuário. O usuário pode ver tudo. Se a verificação de senha tá no JavaScript, a senha tá exposta.

### Challenge 3 - Local File Inclusion (LFI)

Esse é mais interessante. Você tem uma URL tipo `index.php?file=home` e um arquivo `c_99.txt` que você precisa acessar.

Percebe o parâmetro `file=home` na URL? Isso tá dizendo pro PHP qual arquivo carregar. E se a gente mudar esse parâmetro? É exatamente isso que a gente faz.

Troca o `home` pela URL completa do arquivo que você quer acessar:

```
https://thisislegal.com/challenge3/index.php?file=https://thisislegal.com/challenge3/c_99.txt
```

Isso é uma vulnerabilidade chamada LFI (Local File Inclusion) ou nesse caso RFI (Remote File Inclusion). Quando uma aplicação inclui arquivos baseado em input do usuário sem validar direito, você pode fazer ela carregar arquivos que não deveria.

### Challenge 4 - Cookie Manipulation

Abre as ferramentas de desenvolvedor (F12), vai em Application (ou Storage no Firefox) e depois em Cookies. Procura o cookie do site e você vai ver um chamado `ALLOWED_ACCESS` com valor `NO`.

Muda pra `YES`. Atualiza a página. Pronto.

Cookies são armazenados no navegador do usuário. Qualquer coisa que você guarda em cookie pode ser modificada pelo usuário. Nunca confie em cookies pra controle de acesso sem validação no servidor.

### Challenge 5 - Form Manipulation

Tem um formulário de "esqueci minha senha" que manda a senha pra um email. O email tá no HTML como um campo hidden.

Inspeciona o elemento, acha o campo com `noreply@thisislegal.com` e troca pelo seu email. Clica em enviar. Vai lá checar seu email.

A senha é `email422`.

Mesma lição: campos hidden não são seguros. O usuário pode modificar qualquer coisa que tá no HTML. Se você precisa que um valor não seja alterado, ele tem que ser validado no servidor.

### Challenge 6 - Robots.txt

Esse é clássico. O arquivo `robots.txt` é usado pra dizer pros buscadores (Google, Bing, etc.) quais páginas não devem ser indexadas. O problema é que ele é público. Qualquer um pode acessar.

Vai em `https://thisislegal.com/robots.txt` e você encontra URLs que o site não quer que apareçam no Google. Geralmente são áreas administrativas, páginas de teste, coisas assim.

No caso, o arquivo mostra a URL da flag: `https://thisislegal.com/challenge/robotspage`

Sempre verifica o robots.txt quando tá fazendo reconhecimento em um site. Às vezes tem informação boa lá.

### Challenge 7 - FrontPage Exploitation

Esse é mais elaborado. A página foi feita com Microsoft FrontPage, um editor de sites antigo e descontinuado. A dica menciona "Vermeer Technologies Inc" - a empresa que criou o FrontPage antes da Microsoft comprar.

Pesquisando sobre vulnerabilidades do FrontPage, você descobre que ele armazena senhas em arquivos `.pwd` dentro de diretórios como `_vti_pvt`. É uma falha de configuração bem conhecida.

Acessando `https://thisislegal.com/public/challenge7/_vti_pvt/` você encontra o arquivo `administrators.pwd`. Dentro dele tem o hash da senha do admin.

Agora precisa quebrar esse hash. Pode usar John The Ripper, Hashcat, ou até sites online. O login é `admin` e a senha é `a1b2c3`.

### Challenge 8 - Reverse Engineering

Baixa o `app.zip` que contém um executável Windows feito em Visual Basic. O objetivo é descobrir a senha que o programa aceita.

Você precisa de um debugger ou disassembler. No Windows, o OllyDbg que eles sugerem funciona bem. No Linux dá pra usar Radare2, Ghidra, ou outros.

A ideia é analisar o binário e procurar onde ele compara a senha digitada com a senha correta. Procura por funções de comparação de string (tipo `vbaStrCmp` no caso de VB). Nos argumentos dessa comparação você vai encontrar a senha hardcoded.

A senha é `crackedapp175`.

### Challenge 9 - Cipher Cracking

Agora entramos em criptografia. Você recebe um texto cifrado:

```
zjii hfxj tfs mwkj qlwqejh nv vmj ywddzflh nd xfzvmjijwhjl :)
```

Precisa descobrir que tipo de cifra é e decifrá-la. Olhando o padrão, parece ser uma cifra de substituição - cada letra foi trocada por outra.

Você pode fazer análise de frequência (contar quais letras aparecem mais e comparar com a frequência normal do inglês), usar ferramentas online, ou ir na tentativa e erro educada.

Usando ferramentas como dcode.fr ou cryptii.com, testando diferentes tipos de cifra de substituição, você chega em:

```
WELL DONE YOU HAVE CRACKED IT THE PASSWORD IS NOWTHELEADER :)
```

A senha é `nowtheleader`.

Esse tipo de cifra é quebrada facilmente com análise de frequência porque a estrutura estatística da língua original se mantém. Cifras de substituição simples não são seguras pra nada sério.

### Challenge 10 - Flash Decompilation

Você baixa um arquivo `.swf` (Flash) e precisa encontrar a senha dentro dele.

Flash tá morto hoje em dia (ainda bem), mas o conceito se aplica a qualquer aplicação client-side: se roda no computador do usuário, o usuário pode analisar.

Usa um decompilador de Flash (JPEXS Free Flash Decompiler é uma boa opção) ou serviços web que fazem isso. No código decompilado você encontra:

```actionscript
if (password == "flashking") {
    txt3var = "Correct! enter into password box";
}
```

A senha é `flashking`.

---

## Parte 2: Realistic Challenges

Agora as coisas ficam mais interessantes. Esses desafios simulam cenários mais próximos do mundo real, com múltiplas etapas e diferentes técnicas combinadas.

### Realistic 1 - E-commerce Price Manipulation

Você entra numa loja online e precisa "comprar" algo, mas não tem dinheiro suficiente. O truque é manipular o preço.

Na página de compra (`buy.php`), antes de finalizar, inspeciona o HTML. Tem campos hidden com os valores dos produtos, incluindo um chamado `amount` com valor `100`.

Muda esse valor pra `0.01` (ou qualquer valor baixo) e submete o formulário. Compra realizada.

Isso acontece quando a loja confia nos valores que vêm do formulário HTML em vez de buscar o preço real no banco de dados. Nunca confie em dados vindos do cliente.

### Realistic 2 - SQL Injection + Hash Cracking

Esse combina várias técnicas. Primeiro você precisa entrar no sistema.

Na tela de login, testa SQL Injection básico:
- Login: `' or 1=1--`
- Senha: `' or 1=1--`

Funciona. Você entra como admin, mas é uma conta limitada. Explorando o painel, você consegue fazer backup do banco de dados e encontra um usuário `SuperAdmin` com a hash da senha.

A hash é MD5: `8cc4ba204dd44cc92d7646ad035b7647`

Quebrando essa hash (pode usar CrackStation, HashKiller, ou ferramentas locais), você descobre que a senha é `lmon12`.

Agora loga como SuperAdmin com essa senha e você tem acesso total. Vai no gerenciador de arquivos, encontra as pastas `logs` e `targets` em lugares suspeitos, e deleta elas pra completar o objetivo.

### Realistic 3 - XSS com Bypass

Esse site tem uma funcionalidade de submeter links que precisam ser aprovados pelo admin. Mas dá pra bypassar isso.

Inspecionando o formulário, você encontra um campo hidden chamado `LinkView` com valor `1`. Muda pra `0`. Agora quando você submete um link, ele aparece imediatamente sem precisar de aprovação.

Beleza, mas o objetivo é mais do que isso. Você precisa executar JavaScript. Tenta um XSS básico no campo de link:

```html
<script>alert(1)</script>
```

Se executar, você completou. Dependendo dos filtros do site, pode precisar de variações como `<img src=x onerror=alert(1)>` ou usar encoding.

### Realistic 4 - LFI + ROT13 + htpasswd Cracking

Esse é mais complexo. Explorando o site, você encontra uma página de testimonials com URL tipo `?customer=algumacoisa`.

Testando colocar outros valores, você percebe que os nomes são transformados. Se você coloca `toto`, dá erro com `gbgb`. Se coloca `index.php`, aparece `vaqrk.cuc`.

Isso é ROT13 - uma "criptografia" que troca cada letra pela que tá 13 posições à frente no alfabeto. A aplicação tá aplicando ROT13 no nome do arquivo.

Então pra acessar um arquivo, você precisa passar o nome dele em ROT13. O arquivo `.htpasswd` vira `.ugcnffjq`.

Acessando `?customer=../frpher/.ugcnffjq` (que é `../secure/.htpasswd` em ROT13), você consegue o conteúdo do arquivo com usuário e hash da senha: `admin:adzN92vpWgSP6`

Quebra esse hash e a senha é `vimto`. Agora você consegue acessar o diretório `/secure` com essas credenciais.

### Realistic 5 - Parameter Tampering + Null Byte Injection

Explorando o site, você acha um diretório `/adm` com tela de login. SQL Injection mostra uma mensagem interessante: "Details supplied do not match information in login.pwd file."

Então tem um arquivo `login.pwd` em algum lugar. Olhando a página de produtos, você vê que as imagens são carregadas via `i.php?img=images/server`. Isso pode ser um LFI.

Testando `i.php?img=adm/login.pwd` dá erro. Mas adicionando um null byte (`%00`) no final, você consegue bypassar a verificação de extensão:

```
i.php?img=adm/login.pwd%00
```

O null byte faz a aplicação ignorar qualquer coisa depois dele, permitindo acessar arquivos sem a extensão esperada.

No arquivo você encontra as credenciais. A senha tá em Base64: `aWFta2luZzMyMQ==`, que decodifica pra `iamking321`.

Login `admin`, senha `iamking321`.

---

## O que eu aprendi com tudo isso

Fazendo esses desafios, algumas coisas ficam bem claras:

**Nunca confie no client-side.** HTML, JavaScript, cookies, campos de formulário - tudo isso pode ser manipulado. Qualquer validação de segurança precisa acontecer no servidor.

**Sempre olhe o código fonte.** É impressionante a quantidade de informação sensível que desenvolvedores deixam em comentários, variáveis JavaScript, campos hidden. Antes de tentar qualquer coisa elaborada, olha o source.

**Arquivos de configuração são alvos.** robots.txt, .htaccess, .htpasswd, web.config, arquivos .pwd... esses arquivos frequentemente contêm informações úteis ou credenciais.

**Input do usuário é perigoso.** SQL Injection, LFI, XSS - todas essas vulnerabilidades existem porque a aplicação não valida ou sanitiza corretamente o que o usuário manda.

**Hashes não são criptografia.** Se você consegue o hash de uma senha, você pode tentar quebrá-lo. Senhas fracas caem rápido. Por isso a importância de senhas fortes e algoritmos de hash adequados (bcrypt, Argon2, não MD5).

---

## E agora?

Se você conseguiu acompanhar até aqui, parabéns. Você já tem uma base boa de hacking web. Os próximos passos:

**Pratica mais.** ThisIsLegal tem mais desafios que eu não cobri aqui - programação, SQL puro, criptografia mais pesada, engenharia reversa de aplicações. Tenta resolver o resto.

**Outros wargames.** Existem vários outros sites pra praticar: OverTheWire (especialmente Bandit e Natas), HackTheBox, TryHackMe, PicoCTF, Root-Me... cada um tem seu estilo.

**Participa de CTFs.** Quando se sentir pronto, entra em competições de verdade. CTFTime.org lista competições que tão acontecendo. A maioria é online e gratuita.

**Estuda as técnicas.** Eu expliquei o básico aqui, mas cada vulnerabilidade tem muito mais profundidade. OWASP é uma boa fonte pra entender melhor cada tipo de falha.

O importante é não parar. Quanto mais você pratica, mais natural fica. E quando você menos esperar, vai tá resolvendo desafios que antes pareciam impossíveis.

> Plataformas como TryHackMe seriam de ÓTIMA escolha, assim como hack the box (inclusive o academy), portswigger academy, hack this site e outros.
