---
title: Desenvolvimento Web na Prática
description: 'Guia do zero ao deploy com HTML, CSS, JavaScript, PHP, MySQL e segurança básica'
author: matheus
tags: ["web development", "html", "css", "javascript", "php", "mysql", "backend", "frontend", "programação", "xampp", "RCE", "sql injection", "XSS", "session hijacking", "CSRF"]
categories: ["Road2Tech", "Development", "Programação", "WayOfSec"]
pin: false
comments: true
---

## O que você vai aprender aqui

Se você quer entrar no mundo da programação, desenvolvimento web é provavelmente o caminho mais acessível pra começar. Você não precisa de um ambiente de desenvolvimento super complexo, não precisa compilar nada, e consegue ver o resultado do seu trabalho instantaneamente no navegador.

Nesse guia eu vou te mostrar como funciona desenvolvimento web de verdade - não só a teoria, mas a prática. No final você vai ter criado uma aplicação funcional com sistema de login, formulário de contato, banco de dados MySQL e tudo mais. E o mais importante: vai entender o que tá acontecendo em cada etapa.

A ideia é ir construindo aos poucos. Primeiro a gente entende como a web funciona, depois passa pelo front-end (HTML, CSS, JavaScript), depois pelo back-end com PHP, aí entra banco de dados, e por fim junta tudo num projeto real que você vai poder rodar na sua máquina.

---

## Como a web funciona

Antes de sair escrevendo código, precisa entender o básico de como a web funciona. E é mais simples do que parece.

Quando você digita uma URL no navegador e aperta Enter, seu navegador faz uma requisição HTTP pra um servidor. Esse servidor processa a requisição e manda uma resposta de volta - geralmente HTML, CSS e JavaScript. O navegador recebe isso e renderiza a página na sua tela.

Se a página é só HTML, CSS e JS estático, o servidor basicamente manda os arquivos como estão. Não tem processamento nenhum no servidor, ele só entrega os arquivos. É o que a gente chama de site estático.

Agora quando tem PHP (ou Python, ou Node.js, ou qualquer outra linguagem de back-end), o servidor executa esse código primeiro. O PHP pode pegar dados de um banco de dados, processar um formulário, verificar se o usuário tá logado, gerar HTML dinamicamente baseado em alguma lógica... e aí sim manda o resultado pro navegador. O navegador nunca vê o código PHP - só vê o HTML que o PHP gerou. Por isso a gente diz que PHP é uma linguagem server-side.

Essa distinção é fundamental: **front-end** é tudo que roda no navegador do usuário (HTML, CSS, JavaScript). **Back-end** é tudo que roda no servidor (PHP, banco de dados, autenticação, etc.). Quando você inspeciona o código fonte de uma página pelo navegador, você tá vendo o front-end. O back-end você não vê - só vê os efeitos dele.

---

## Front-end: HTML, CSS e JavaScript

Front-end é a parte visual e interativa do site. É o que o usuário vê, clica, preenche. Pra fazer front-end você precisa de três tecnologias que trabalham juntas: HTML pra estrutura, CSS pra aparência, e JavaScript pra interatividade.

### HTML - A estrutura da página

HTML significa HyperText Markup Language. Não é linguagem de programação - é linguagem de marcação. A diferença é que HTML não tem lógica, não tem variáveis, não faz cálculos. Ele só descreve a estrutura do conteúdo usando tags.

Uma tag HTML é basicamente uma etiqueta que diz "isso aqui é um parágrafo", "isso aqui é um título", "isso aqui é uma imagem". O navegador lê essas tags e sabe como exibir cada elemento.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minha Primeira Página</title>
</head>
<body>
    <h1>Olá, Mundo!</h1>
    <p>Este é um parágrafo de texto.</p>
    <a href="https://google.com">Link pro Google</a>
</body>
</html>
```

Vou explicar o que cada parte faz:

O `<!DOCTYPE html>` no começo diz pro navegador que é HTML5 (a versão atual). A tag `<html>` é a raiz, tudo fica dentro dela. Dentro do `<head>` ficam metadados - informações sobre a página que não aparecem visualmente, como o título que aparece na aba do navegador, o charset (codificação de caracteres), e links pra arquivos CSS. O `<body>` é onde fica o conteúdo visível.

`<h1>` até `<h6>` são títulos, sendo h1 o maior e mais importante. `<p>` é parágrafo. `<a>` é link (anchor), e o `href` é pra onde o link aponta.

Salva esse código num arquivo chamado `index.html` e abre no navegador. Pronto, você fez sua primeira página web. Simples assim.

Outras tags que você vai usar muito: `<div>` é um container genérico pra agrupar elementos. `<header>`, `<nav>`, `<main>`, `<footer>` são containers semânticos (dizem o que aquela seção representa). `<ul>` e `<ol>` são listas (não ordenada e ordenada), com `<li>` pra cada item. `<img>` é imagem. `<form>`, `<input>`, `<textarea>`, `<button>` são pra formulários. `<table>`, `<tr>`, `<th>`, `<td>` são pra tabelas.

A dica com HTML é usar tags semânticas sempre que possível. Em vez de colocar `<div>` pra tudo, usa `<header>` pro cabeçalho, `<nav>` pro menu, `<main>` pro conteúdo principal. Isso ajuda na acessibilidade (leitores de tela entendem melhor) e no SEO (Google entende melhor a estrutura da página).

### CSS - A aparência visual

CSS significa Cascading Style Sheets. É o que controla cores, fontes, tamanhos, espaçamentos, posicionamento, animações... tudo que é visual.

Você pode colocar CSS de três formas. Inline é direto no elemento: `<p style="color: red;">Texto</p>`. Internal é dentro de uma tag `<style>` no head. External é num arquivo separado `.css` linkado no head com `<link rel="stylesheet" href="style.css">`. A forma externa é a mais usada porque separa estrutura (HTML) de estilo (CSS).

A sintaxe é: seletor { propriedade: valor; }

```css
/* Seleciona todos os parágrafos */
p {
    color: #333;
    font-size: 16px;
    line-height: 1.6;
}

/* Seleciona elementos com classe "destaque" */
.destaque {
    background-color: yellow;
    padding: 10px;
}

/* Seleciona o elemento com ID "cabecalho" */
#cabecalho {
    background: #1a1a2e;
    padding: 20px;
}

/* Seleciona links quando passa o mouse */
a:hover {
    color: red;
}
```

As propriedades que você vai usar o tempo todo: `color` pra cor do texto, `background` ou `background-color` pra cor de fundo, `font-family` pra fonte, `font-size` pra tamanho, `margin` pra espaço fora do elemento, `padding` pra espaço dentro, `border` pra borda, `width` e `height` pra dimensões.

Pra posicionamento, o Flexbox é seu melhor amigo. Você define `display: flex` num container e controla como os elementos dentro se organizam. `justify-content` controla o eixo horizontal, `align-items` o vertical, `flex-direction` define se é em linha ou coluna, `gap` é o espaço entre elementos. Flexbox resolve 90% dos problemas de layout que você vai ter.

Não vou me aprofundar muito em CSS aqui porque daria um guia só sobre isso. A dica é: usa muito o DevTools do navegador (F12) pra inspecionar elementos e testar estilos em tempo real. É a melhor forma de aprender.

### JavaScript - A interatividade

JavaScript é a linguagem de programação do front-end. Diferente do HTML e CSS, JavaScript TEM lógica - variáveis, condicionais, loops, funções, objetos. Com JavaScript você pode validar formulários, reagir a cliques, fazer animações, carregar conteúdo sem recarregar a página, manipular o DOM...


```javascript
// Variáveis
let nome = "Matheus"; // let cria uma variável que pode mudar depois
const PI = 3.14;       // const cria uma constante, não pode mudar

// Condicionais
if (idade >= 18) {
    console.log("Maior de idade"); // Se idade for 18 ou mais, mostra isso
} else {
    console.log("Menor de idade"); // Se não, mostra isso
}

// Loops
for (let i = 0; i < 5; i++) {
    console.log(i); // Repete 5 vezes, de 0 a 4
}

// Funções
function somar(a, b) {
    return a + b; // Recebe dois valores e retorna a soma
}

// Arrow functions (forma moderna)
const multiplicar = (a, b) => a * b; // Outra forma de criar função
```

Repare que em JavaScript, variáveis podem ser criadas com `let` (pode mudar depois) ou `const` (não pode mudar). Condicionais usam `if` e `else` para decidir o que fazer dependendo do valor de uma variável. Loops como o `for` servem para repetir um bloco de código várias vezes. Funções são blocos de código que você pode reaproveitar, e podem ser escritas de formas diferentes (tradicional ou arrow function).

O DOM (Document Object Model) é a representação da página que o JavaScript consegue manipular. Você pode selecionar elementos, mudar conteúdo, adicionar ou remover classes, criar elementos novos, reagir a eventos...

```javascript
// Selecionando elementos
let titulo = document.getElementById('titulo');
let botoes = document.querySelectorAll('.botao');

// Mudando conteúdo
titulo.textContent = "Novo título";

// Mudando estilos
titulo.style.color = "red";

// Adicionando evento de clique
let botao = document.getElementById('meuBotao');
botao.addEventListener('click', function() {
    alert('Você clicou!');
});
```

JavaScript no front-end serve principalmente pra melhorar a experiência do usuário - validar formulários antes de enviar, mostrar/esconder elementos, fazer requisições assíncronas (AJAX). Mas a validação de verdade tem que ser no back-end também, porque o usuário pode desabilitar JavaScript ou manipular o código.

---

## Back-end com PHP

Beleza, front-end é o que o usuário vê. Mas e quando você precisa salvar dados no servidor? Verificar login e senha? Acessar um banco de dados? Processar um pagamento? Aí entra o back-end.

PHP é uma das linguagens mais usadas pra web. Roda em praticamente qualquer hospedagem, tem documentação vasta, e é relativamente fácil de aprender. O código PHP é executado no servidor e o resultado (geralmente HTML) é enviado pro navegador.

### Configurando o ambiente

Pra rodar PHP na sua máquina você precisa de um servidor web. A forma mais fácil é instalar o XAMPP - é um pacote que já vem com Apache (servidor web), MySQL (banco de dados), PHP e phpMyAdmin (interface pra gerenciar o banco).

Baixa o XAMPP em apachefriends.org, instala, abre o XAMPP Control Panel e clica em Start no Apache e no MySQL. Pronto, você tem um servidor rodando.

Seus arquivos PHP vão na pasta `htdocs` do XAMPP (geralmente `C:\xampp\htdocs` no Windows). Cria uma pasta pro seu projeto lá dentro, tipo `C:\xampp\htdocs\meusite`. Aí você acessa pelo navegador em `http://localhost/meusite`.

Se você só tem PHP instalado sem XAMPP, pode usar o servidor embutido. Abre o terminal na pasta do projeto e roda `php -S localhost:8000`. Mas pra usar banco de dados o XAMPP é mais prático.

### Sintaxe básica

Código PHP fica entre `<?php` e `?>`. Pode ser misturado com HTML no mesmo arquivo:

```php
<!DOCTYPE html>
<html>
<head>
    <title>Página com PHP</title>
</head>
<body>
    <h1><?php echo "Olá, mundo!"; ?></h1>
    
    <?php
    $nome = "Matheus";
    $idade = 25;
    echo "<p>Meu nome é $nome e tenho $idade anos.</p>";
    ?>
</body>
</html>
```


Variáveis em PHP sempre começam com `$`. Não precisa declarar tipo - PHP é flexível nesse ponto. Strings podem usar aspas duplas (interpola variáveis) ou simples (literal).

```php
<?php
// Tipos de dados
$texto = "uma string"; // texto
$numero = 42;          // número inteiro
$decimal = 3.14;       // número decimal
$booleano = true;      // booleano (verdadeiro ou falso)
$lista = ["um", "dois", "três"]; // array comum (lista)
$associativo = ["nome" => "João", "idade" => 30]; // array associativo (chave => valor)

// Condicionais
if ($idade >= 18) {
    echo "Maior de idade"; // Se idade for 18 ou mais
} elseif ($idade >= 16) {
    echo "Pode votar";     // Se idade for 16 ou 17
} else {
    echo "Menor de idade"; // Se for menor que 16
}

// Loops
for ($i = 0; $i < 5; $i++) {
    echo $i; // Repete 5 vezes, de 0 a 4
}

// Percorrendo uma lista comum
foreach ($lista as $item) {
    echo $item; // Mostra cada item da lista
}

// Percorrendo um array associativo
foreach ($associativo as $chave => $valor) {
    echo "$chave: $valor"; // Mostra a chave e o valor
}

// Funções
function saudacao($nome) {
    return "Olá, $nome!"; // Recebe um nome e retorna uma saudação
}

echo saudacao("Matheus"); // Chama a função e mostra o resultado
?>
```

No PHP, arrays associativos são como "dicionários": você acessa valores por uma chave, não só por número. O `foreach` é muito usado para percorrer listas e arrays associativos, mostrando cada item ou cada par chave/valor. Funções permitem reaproveitar código e deixar o programa mais organizado.

### Processando formulários

Uma das coisas mais comuns em PHP é processar formulários. Quando um formulário HTML é enviado, os dados chegam no PHP via GET ou POST.

GET manda os dados na URL: `pagina.php?nome=joao&email=joao@email.com`. É visível, tem limite de tamanho, fica no histórico. Usa pra buscas, filtros, coisas que podem ser compartilhadas via link.

POST manda os dados no corpo da requisição, não aparece na URL. Usa pra formulários de cadastro, login, qualquer coisa com dados sensíveis.

```html
<!-- formulario.html -->
<form action="processa.php" method="POST">
    <input type="text" name="nome" placeholder="Nome">
    <input type="email" name="email" placeholder="Email">
    <button type="submit">Enviar</button>
</form>
```

```php
<?php
// processa.php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nome = $_POST["nome"];
    $email = $_POST["email"];
    
    echo "Nome: $nome<br>";
    echo "Email: $email";
}
?>
```

`$_POST` e `$_GET` são arrays superglobais que contêm os dados enviados. `$_SERVER` tem informações sobre a requisição.

### Validação e segurança

Regra número um do back-end: nunca confie em dados vindos do usuário. Sempre valide e sanitize.

Sanitizar é limpar os dados - remover caracteres perigosos, tags HTML, espaços extras. Validar é verificar se os dados estão no formato correto.

```php
<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Sanitiza - remove tags HTML e espaços
    $nome = trim(htmlspecialchars($_POST["nome"]));
    $email = trim(htmlspecialchars($_POST["email"]));
    
    // Valida
    $erros = [];
    
    if (empty($nome)) {
        $erros[] = "Nome é obrigatório";
    } elseif (strlen($nome) < 3) {
        $erros[] = "Nome muito curto";
    }
    
    if (empty($email)) {
        $erros[] = "Email é obrigatório";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erros[] = "Email inválido";
    }
    
    if (empty($erros)) {
        // Dados válidos, pode processar
        echo "Sucesso!";
    } else {
        foreach ($erros as $erro) {
            echo "<p style='color:red'>$erro</p>";
        }
    }
}
?>
```

`htmlspecialchars()` converte caracteres especiais em entidades HTML - isso previne XSS (Cross-Site Scripting), onde alguém tenta injetar JavaScript malicioso. `filter_var()` com FILTER_VALIDATE_EMAIL verifica se é um email válido. `trim()` remove espaços do início e fim.

---

## Banco de Dados MySQL

Até agora a gente viu como processar dados, mas não como armazená-los de forma persistente. Pra isso a gente usa banco de dados.

MySQL é um dos bancos de dados mais usados na web. É relacional, ou seja, os dados ficam organizados em tabelas com linhas e colunas, e você pode relacionar tabelas entre si.

### O que é um banco de dados relacional

Imagina uma planilha do Excel. Cada aba é uma tabela, cada linha é um registro, cada coluna é um campo. Banco de dados relacional é isso, só que com muito mais poder: você pode fazer buscas complexas, relacionar dados de tabelas diferentes, garantir integridade dos dados, etc.

Por exemplo, um sistema de blog poderia ter uma tabela `usuarios` (id, nome, email, senha) e uma tabela `posts` (id, titulo, conteudo, usuario_id). O `usuario_id` na tabela de posts referencia o `id` da tabela de usuários - isso é um relacionamento.

### phpMyAdmin

O XAMPP vem com o phpMyAdmin, uma interface web pra gerenciar o MySQL. Acessa em `http://localhost/phpmyadmin`.

Lá você pode criar bancos de dados, criar tabelas, adicionar/editar/deletar dados, executar queries SQL, importar/exportar dados... é bem visual e intuitivo.

Pra criar um banco de dados novo: clica em "Novo" na barra lateral, dá um nome (tipo `meusite`), escolhe o collation `utf8mb4_general_ci` (suporta acentos e emojis) e clica em Criar.

Pra criar uma tabela: seleciona o banco, clica em "Nova", dá um nome, define as colunas. Cada coluna tem nome, tipo (INT pra números, VARCHAR pra texto curto, TEXT pra texto longo, DATE pra data...), e pode ter atributos como AUTO_INCREMENT (incrementa automaticamente), NOT NULL (não pode ser vazio), etc.

### SQL básico

SQL (Structured Query Language) é a linguagem pra interagir com bancos relacionais. Os comandos principais são:

```sql
-- Criar tabela
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados
INSERT INTO usuarios (nome, email, senha) VALUES ('João', 'joao@email.com', 'hash_da_senha');

-- Buscar dados
SELECT * FROM usuarios;                          -- todos os campos, todos os registros
SELECT nome, email FROM usuarios;                -- só nome e email
SELECT * FROM usuarios WHERE id = 1;             -- registro específico
SELECT * FROM usuarios WHERE email LIKE '%@gmail%';  -- busca parcial

-- Atualizar dados
UPDATE usuarios SET nome = 'João Silva' WHERE id = 1;

-- Deletar dados
DELETE FROM usuarios WHERE id = 1;
```

Você pode executar esses comandos direto no phpMyAdmin na aba SQL. Mas no dia a dia você vai executar pelo PHP.

### PHP + MySQL

Pra conectar PHP com MySQL, a forma moderna é usar PDO (PHP Data Objects). É mais seguro e funciona com vários bancos diferentes.

```php
<?php
// Configuração do banco
$host = 'localhost';
$dbname = 'meusite';
$username = 'root';      // usuário padrão do XAMPP
$password = '';          // senha vazia no XAMPP

try {
    // Cria a conexão
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    
    // Configura pra lançar exceções em caso de erro
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Conectado!";
} catch (PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}
?>
```

Pra fazer consultas de forma segura, usa prepared statements. Isso previne SQL Injection - um dos ataques mais comuns em aplicações web.

```php
<?php
// ERRADO - vulnerável a SQL Injection
$email = $_POST['email'];
$query = "SELECT * FROM usuarios WHERE email = '$email'";  // NUNCA faça isso!

// CERTO - prepared statement
$email = $_POST['email'];
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

// Ou com parâmetros nomeados
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email");
$stmt->execute(['email' => $email]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);
```

Com prepared statements, os valores são tratados separadamente da query. Mesmo que alguém tente injetar SQL malicioso, vai ser tratado como texto, não como código.

Inserindo dados:

```php
<?php
$nome = trim(htmlspecialchars($_POST['nome']));
$email = trim(htmlspecialchars($_POST['email']));
$senha = password_hash($_POST['senha'], PASSWORD_DEFAULT);  // SEMPRE hash a senha!

$stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)");
$stmt->execute([$nome, $email, $senha]);

$id = $pdo->lastInsertId();  // pega o ID do registro inserido
echo "Usuário criado com ID: $id";
?>
```

Pra senhas, SEMPRE usa `password_hash()` pra criar o hash e `password_verify()` pra verificar. Nunca armazena senha em texto puro.

---

## Sessões e Autenticação

Pra fazer um sistema de login, você precisa entender sessões. HTTP é stateless - cada requisição é independente, o servidor não "lembra" das anteriores. Sessões resolvem isso.

Quando você chama `session_start()`, o PHP cria um identificador único pra aquele usuário e armazena dados associados a ele no servidor (geralmente em arquivos temporários). Um cookie com esse identificador é enviado pro navegador, então nas próximas requisições o PHP sabe quem é.

```php
<?php
session_start();  // SEMPRE no início do arquivo, antes de qualquer output HTML

// Guardando dados na sessão
$_SESSION['usuario_id'] = 123;
$_SESSION['usuario_nome'] = 'João';

// Lendo dados da sessão
echo $_SESSION['usuario_nome'];

// Verificando se existe
if (isset($_SESSION['usuario_id'])) {
    echo "Usuário logado!";
}

// Pra fazer logout corretamente:
$_SESSION = [];  // Limpa o array
session_destroy();  // Destrói a sessão
?>
```

Um detalhe importante: o `session_start()` tem que vir antes de qualquer output (HTML, echo, espaço em branco antes do `<?php`). Se você ver um erro "headers already sent", provavelmente é isso.

### Sistema de login básico

Vou mostrar como fazer um login simples mas seguro:

```php
<?php
// login.php
session_start();
require_once 'conexao.php';  // arquivo com a conexão PDO

$erro = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = trim($_POST['email']);
    $senha = $_POST['senha'];
    
    // Busca o usuário pelo email
    $stmt = $pdo->prepare("SELECT id, nome, senha FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Verifica se encontrou e se a senha bate
    if ($usuario && password_verify($senha, $usuario['senha'])) {
        // Login OK! Guarda na sessão
        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['usuario_nome'] = $usuario['nome'];
        
        header('Location: painel.php');
        exit;
    } else {
        $erro = 'Email ou senha incorretos';
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
</head>
<body>
    <h1>Login</h1>
    
    <?php if ($erro): ?>
        <p style="color: red;"><?php echo $erro; ?></p>
    <?php endif; ?>
    
    <form method="POST">
        <input type="email" name="email" placeholder="Email" required><br>
        <input type="password" name="senha" placeholder="Senha" required><br>
        <button type="submit">Entrar</button>
    </form>
    
    <p>Não tem conta? <a href="cadastro.php">Cadastre-se</a></p>
</body>
</html>
```

```php
<?php
// cadastro.php
session_start();
require_once 'conexao.php';

$erro = '';
$sucesso = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nome = trim(htmlspecialchars($_POST['nome']));
    $email = trim(htmlspecialchars($_POST['email']));
    $senha = $_POST['senha'];
    $confirma = $_POST['confirma_senha'];
    
    // Validações
    if (strlen($nome) < 3) {
        $erro = 'Nome muito curto';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erro = 'Email inválido';
    } elseif (strlen($senha) < 6) {
        $erro = 'Senha deve ter pelo menos 6 caracteres';
    } elseif ($senha !== $confirma) {
        $erro = 'Senhas não conferem';
    } else {
        // Verifica se email já existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            $erro = 'Email já cadastrado';
        } else {
            // Cria o usuário
            $hash = password_hash($senha, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)");
            $stmt->execute([$nome, $email, $hash]);
            
            $sucesso = 'Conta criada! Faça login.';
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Cadastro</title>
</head>
<body>
    <h1>Cadastro</h1>
    
    <?php if ($erro): ?>
        <p style="color: red;"><?php echo $erro; ?></p>
    <?php endif; ?>
    
    <?php if ($sucesso): ?>
        <p style="color: green;"><?php echo $sucesso; ?></p>
    <?php endif; ?>
    
    <form method="POST">
        <input type="text" name="nome" placeholder="Nome" required><br>
        <input type="email" name="email" placeholder="Email" required><br>
        <input type="password" name="senha" placeholder="Senha" required><br>
        <input type="password" name="confirma_senha" placeholder="Confirmar senha" required><br>
        <button type="submit">Cadastrar</button>
    </form>
    
    <p>Já tem conta? <a href="login.php">Faça login</a></p>
</body>
</html>
```

```php
<?php
// painel.php - página protegida
session_start();

// Verifica se está logado
if (!isset($_SESSION['usuario_id'])) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Painel</title>
</head>
<body>
    <h1>Bem-vindo, <?php echo htmlspecialchars($_SESSION['usuario_nome']); ?>!</h1>
    <p>Esta é uma página protegida.</p>
    <a href="logout.php">Sair</a>
</body>
</html>
```

```php
<?php
// logout.php
session_start();
session_destroy();
header('Location: login.php');
exit;
?>
```

---

## Projeto Prático: Sistema de Contatos

Agora vamos juntar tudo num projeto real. Um sistema onde usuários precisam estar logados pra enviar mensagens, com os dados salvos no MySQL.

### Estrutura do banco

Primeiro, cria o banco de dados no phpMyAdmin. Vai em `http://localhost/phpmyadmin`, clica em "Novo", nome `sistema_contatos`, collation `utf8mb4_general_ci`, e cria.

Agora executa esse SQL pra criar as tabelas:

```sql
-- Tabela de usuários
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de mensagens
CREATE TABLE mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    assunto VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

A tabela `mensagens` tem uma foreign key pra `usuarios` - cada mensagem pertence a um usuário. O `ON DELETE CASCADE` significa que se deletar um usuário, as mensagens dele também são deletadas.

### Estrutura de arquivos

```plaintext
sistema_contatos/
├── index.php
├── login.php
├── cadastro.php
├── logout.php
├── contato.php
├── mensagens.php
├── includes/
│   ├── conexao.php
│   ├── funcoes.php
│   └── auth.php
├── css/
│   └── style.css
└── .htaccess
```

### Arquivos do includes/

A pasta `includes/` contém os arquivos de configuração que serão reutilizados em todas as páginas. Separar assim evita repetição de código e facilita manutenção - se precisar mudar a senha do banco, muda em um lugar só.

**conexao.php** é o arquivo de conexão com o banco de dados. Usamos PDO porque é mais seguro e flexível que as funções antigas `mysql_*`. As opções `ERRMODE_EXCEPTION` faz o PHP lançar exceções em caso de erro (em vez de falhar silenciosamente), e `FETCH_ASSOC` retorna os resultados como arrays associativos.

<details markdown="1">
<summary><strong>conexao.php - Conexão com o banco</strong></summary>

```php
<?php
$host = 'localhost';
$dbname = 'sistema_contatos';
$username = 'root';
$password = '';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}
?>
```

</details>

**funcoes.php** centraliza funções utilitárias usadas em várias páginas. A função `sanitizar()` limpa inputs contra XSS. A `redirecionar()` faz redirect de forma segura (com `exit` pra garantir que o código para). As funções de mensagem permitem passar feedback entre páginas via sessão. E as funções de CSRF geram e validam tokens pra proteger formulários.

<details markdown="1">
<summary><strong>funcoes.php - Funções auxiliares</strong></summary>

```php
<?php
// Limpa string contra XSS - converte caracteres especiais em entidades HTML
function sanitizar($string) {
    return trim(htmlspecialchars($string, ENT_QUOTES, 'UTF-8'));
}

// Redireciona e para a execução (importante o exit!)
function redirecionar($url) {
    header("Location: $url");
    exit;
}

// Sistema de mensagens flash - persiste entre requisições via sessão
function mensagemSessao($tipo, $texto) {
    $_SESSION['mensagem'] = ['tipo' => $tipo, 'texto' => $texto];
}

function exibirMensagem() {
    if (isset($_SESSION['mensagem'])) {
        $msg = $_SESSION['mensagem'];
        $classe = $msg['tipo'] == 'sucesso' ? 'msg-sucesso' : 'msg-erro';
        echo "<div class='mensagem $classe'>{$msg['texto']}</div>";
        unset($_SESSION['mensagem']);  // Remove após exibir (só mostra uma vez)
    }
}

// Proteção CSRF - gera input hidden com token único
function csrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return '<input type="hidden" name="csrf_token" value="' . $_SESSION['csrf_token'] . '">';
}

// Valida se o token enviado bate com o da sessão
function validarCsrf() {
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        die('Requisição inválida - token CSRF não confere');
    }
}
?>
```

</details>

**auth.php** é incluído no topo de todas as páginas. Ele configura a sessão de forma segura, inicia ela, carrega as dependências e define funções de autenticação. O `cookie_httponly` impede JavaScript de acessar o cookie de sessão (proteção contra roubo via XSS). O `use_strict_mode` rejeita IDs de sessão inventados pelo cliente.

<details markdown="1">
<summary><strong>auth.php - Autenticação e sessão</strong></summary>

```php
<?php
// Configurações de segurança da sessão (ANTES do session_start)
ini_set('session.cookie_httponly', 1);    // JS não acessa o cookie
ini_set('session.use_strict_mode', 1);    // Rejeita IDs de sessão inválidos
// ini_set('session.cookie_secure', 1);   // Descomentar em produção com HTTPS

session_start();
require_once 'conexao.php';
require_once 'funcoes.php';

// Verifica se usuário está logado
function estaLogado() {
    return isset($_SESSION['usuario_id']);
}

// Bloqueia acesso a páginas protegidas
function exigirLogin() {
    if (!estaLogado()) {
        mensagemSessao('erro', 'Você precisa estar logado para acessar esta página.');
        redirecionar('login.php');
    }
}

// Retorna dados do usuário logado
function usuarioAtual() {
    return [
        'id' => $_SESSION['usuario_id'] ?? null,
        'nome' => $_SESSION['usuario_nome'] ?? null,
        'email' => $_SESSION['usuario_email'] ?? null
    ];
}
?>
```

</details>

### Estilos CSS

O CSS abaixo cria um visual moderno com gradiente escuro, cards com efeito glassmorphism (fundo semi-transparente com blur), e botões com gradiente. Não vou explicar linha por linha porque CSS é mais sobre experimentação - o importante é entender que ele estiliza as classes que usamos no HTML (.container, .card, .nav, .btn, etc.).

<details markdown="1">
<summary><strong>style.css - Estilos do projeto</strong></summary>

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    min-height: 100vh;
    color: #fff;
}

.container {
    max-width: 500px;
    margin: 0 auto;
    padding: 40px 20px;
}

.container.wide {
    max-width: 900px;
}

h1 {
    text-align: center;
    margin-bottom: 30px;
    font-size: 2em;
}

.card {
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 30px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.nav {
    background: rgba(0,0,0,0.3);
    padding: 15px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav a {
    color: #4facfe;
    text-decoration: none;
    margin-left: 20px;
}

.nav a:hover {
    color: #00f2fe;
}

.form-group {
    margin-bottom: 20px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 1px;
}

input, textarea, select {
    width: 100%;
    padding: 12px;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    color: #fff;
    font-size: 16px;
}

input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #4facfe;
}

input::placeholder, textarea::placeholder {
    color: rgba(255,255,255,0.5);
}

textarea {
    min-height: 120px;
    resize: vertical;
}

button, .btn {
    display: inline-block;
    padding: 12px 25px;
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    border: none;
    border-radius: 8px;
    color: #1a1a2e;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
}

button:hover, .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(79,172,254,0.4);
}

button.full {
    width: 100%;
}

.mensagem {
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.msg-sucesso {
    background: rgba(40,167,69,0.2);
    border: 1px solid #28a745;
}

.msg-erro {
    background: rgba(220,53,69,0.2);
    border: 1px solid #dc3545;
}

.links {
    text-align: center;
    margin-top: 20px;
}

.links a {
    color: #4facfe;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

th {
    background: rgba(79,172,254,0.2);
    font-size: 0.85em;
    text-transform: uppercase;
}

tr:hover {
    background: rgba(255,255,255,0.05);
}

.empty {
    text-align: center;
    padding: 40px;
    color: rgba(255,255,255,0.6);
}
```

</details>

### Páginas do sistema

Agora vamos ver as páginas em si. Cada uma começa incluindo o `auth.php`, que já inicia a sessão e carrega as dependências. Perceba o padrão: primeiro vem a lógica PHP (processar formulário, buscar dados), depois o HTML. Isso é importante porque headers HTTP (como redirects) precisam ser enviados antes de qualquer output HTML.

**index.php** é a página inicial. Ela verifica se o usuário está logado e mostra conteúdo diferente pra cada caso. Usa as funções `estaLogado()` e `usuarioAtual()` que definimos no auth.php.

<details markdown="1">
<summary><strong>index.php - Página inicial</strong></summary>

```php
<?php require_once 'includes/auth.php'; ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Contatos</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="nav">
        <strong>Sistema de Contatos</strong>
        <div>
            <?php if (estaLogado()): ?>
                <span>Olá, <?php echo htmlspecialchars(usuarioAtual()['nome']); ?></span>
                <a href="contato.php">Enviar Mensagem</a>
                <a href="mensagens.php">Minhas Mensagens</a>
                <a href="logout.php">Sair</a>
            <?php else: ?>
                <a href="login.php">Entrar</a>
                <a href="cadastro.php">Cadastrar</a>
            <?php endif; ?>
        </div>
    </nav>
    
    <div class="container">
        <h1>Bem-vindo!</h1>
        
        <div class="card">
            <?php if (estaLogado()): ?>
                <p>Você está logado como <strong><?php echo htmlspecialchars(usuarioAtual()['email']); ?></strong>.</p>
                <br>
                <a href="contato.php" class="btn full">Enviar Nova Mensagem</a>
            <?php else: ?>
                <p>Para enviar mensagens, você precisa estar logado.</p>
                <br>
                <div style="display: flex; gap: 10px;">
                    <a href="login.php" class="btn" style="flex:1;">Entrar</a>
                    <a href="cadastro.php" class="btn" style="flex:1;">Criar Conta</a>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
```

</details>

**login.php** processa o formulário de login. Primeiro verifica se já está logado (redireciona pra home). Quando recebe POST, valida o token CSRF, busca o usuário pelo email, e usa `password_verify()` pra comparar a senha digitada com o hash no banco. Se bater, regenera o ID da sessão (segurança contra session fixation) e guarda os dados do usuário na sessão.

<details markdown="1">
<summary><strong>login.php - Página de login</strong></summary>

```php
<?php
require_once 'includes/auth.php';

// Se já tá logado, manda pra home
if (estaLogado()) {
    redirecionar('index.php');
}

$erro = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    validarCsrf();  // Verifica token CSRF antes de processar
    
    $email = sanitizar($_POST['email']);
    $senha = $_POST['senha'];  // Não sanitiza senha - pode ter caracteres especiais
    
    // Busca usuário pelo email usando prepared statement
    $stmt = $pdo->prepare("SELECT id, nome, email, senha FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();
    
    // Verifica se encontrou E se a senha bate com o hash
    if ($usuario && password_verify($senha, $usuario['senha'])) {
        // Regenera ID da sessão pra prevenir session fixation
        session_regenerate_id(true);
        
        // Guarda dados na sessão
        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['usuario_nome'] = $usuario['nome'];
        $_SESSION['usuario_email'] = $usuario['email'];
        
        mensagemSessao('sucesso', 'Login realizado com sucesso!');
        redirecionar('index.php');
    } else {
        // Mensagem genérica - não diz se foi email ou senha errada (segurança)
        $erro = 'Email ou senha incorretos';
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>Entrar</h1>
        
        <div class="card">
            <?php exibirMensagem(); ?>
            
            <?php if ($erro): ?>
                <div class="mensagem msg-erro"><?php echo $erro; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <?php echo csrfToken(); ?>  <!-- Token CSRF oculto -->
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" name="senha" required>
                </div>
                
                <button type="submit" class="full">Entrar</button>
            </form>
            
            <div class="links">
                <p>Não tem conta? <a href="cadastro.php">Cadastre-se</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

</details>

**cadastro.php** cria novos usuários. Valida todos os campos (tamanho do nome, formato do email, tamanho da senha, confirmação), verifica se o email já existe no banco, e só então cria o usuário com a senha hasheada. Nunca armazene senhas em texto puro!

<details markdown="1">
<summary><strong>cadastro.php - Página de registro</strong></summary>

```php
<?php
require_once 'includes/auth.php';

if (estaLogado()) {
    redirecionar('index.php');
}

$erro = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    validarCsrf();  // Sempre validar CSRF antes de processar
    
    $nome = sanitizar($_POST['nome']);
    $email = sanitizar($_POST['email']);
    $senha = $_POST['senha'];  // Não sanitizar senha
    $confirma = $_POST['confirma'];
    
    // Validações em cascata
    if (strlen($nome) < 3) {
        $erro = 'Nome deve ter pelo menos 3 caracteres';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erro = 'Email inválido';
    } elseif (strlen($senha) < 6) {
        $erro = 'Senha deve ter pelo menos 6 caracteres';
    } elseif ($senha !== $confirma) {
        $erro = 'As senhas não conferem';
    } else {
        // Verifica se email já existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            $erro = 'Este email já está cadastrado';
        } else {
            // Cria hash da senha - NUNCA armazene em texto puro!
            $hash = password_hash($senha, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)");
            $stmt->execute([$nome, $email, $hash]);
            
            mensagemSessao('sucesso', 'Conta criada com sucesso! Faça login.');
            redirecionar('login.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cadastro</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>Criar Conta</h1>
        
        <div class="card">
            <?php if ($erro): ?>
                <div class="mensagem msg-erro"><?php echo $erro; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <?php echo csrfToken(); ?>
                
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" name="nome" required>
                </div>
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" name="senha" required>
                </div>
                
                <div class="form-group">
                    <label>Confirmar Senha</label>
                    <input type="password" name="confirma" required>
                </div>
                
                <button type="submit" class="full">Cadastrar</button>
            </form>
            
            <div class="links">
                <p>Já tem conta? <a href="login.php">Faça login</a></p>
            </div>
        </div>
    </div>
</body>
</html>
```

</details>

**logout.php** encerra a sessão de forma segura. Não basta só chamar `session_destroy()` - também limpa o array `$_SESSION` e invalida o cookie no navegador. Assim mesmo que alguém tenha o ID de sessão antigo, não vai funcionar.

<details markdown="1">
<summary><strong>logout.php - Encerrar sessão</strong></summary>

```php
<?php
session_start();

// Limpa todas as variáveis de sessão
$_SESSION = [];

// Destrói o cookie da sessão (importante!)
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destrói a sessão
session_destroy();

header('Location: login.php');
exit;
?>
```

</details>

**contato.php** é o formulário de contato - só acessível pra usuários logados. O `exigirLogin()` no início redireciona pra login se não estiver autenticado. Valida o assunto contra uma lista pré-definida (não confia no que vem do select), e limita o tamanho da mensagem.

<details markdown="1">
<summary><strong>contato.php - Formulário de contato</strong></summary>

```php
<?php
require_once 'includes/auth.php';
exigirLogin();  // Bloqueia acesso se não estiver logado

$erro = '';
$assuntos = ['Dúvida', 'Sugestão', 'Reclamação', 'Parceria', 'Outro'];

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    validarCsrf();
    
    $assunto = sanitizar($_POST['assunto']);
    $mensagem = sanitizar($_POST['mensagem']);
    
    // Valida contra lista pré-definida - não confia no que veio do <select>
    if (!in_array($assunto, $assuntos)) {
        $erro = 'Selecione um assunto válido';
    } elseif (strlen($mensagem) < 10) {
        $erro = 'Mensagem deve ter pelo menos 10 caracteres';
    } elseif (strlen($mensagem) > 2000) {
        $erro = 'Mensagem muito longa (máximo 2000 caracteres)';
    } else {
        // Insere a mensagem associada ao usuário logado
        $stmt = $pdo->prepare("INSERT INTO mensagens (usuario_id, assunto, mensagem) VALUES (?, ?, ?)");
        $stmt->execute([usuarioAtual()['id'], $assunto, $mensagem]);
        
        mensagemSessao('sucesso', 'Mensagem enviada com sucesso!');
        redirecionar('mensagens.php');
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enviar Mensagem</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="nav">
        <strong>Sistema de Contatos</strong>
        <div>
            <a href="index.php">Início</a>
            <a href="mensagens.php">Minhas Mensagens</a>
            <a href="logout.php">Sair</a>
        </div>
    </nav>
    
    <div class="container">
        <h1>Enviar Mensagem</h1>
        
        <div class="card">
            <?php if ($erro): ?>
                <div class="mensagem msg-erro"><?php echo $erro; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <?php echo csrfToken(); ?>
                
                <div class="form-group">
                    <label>Assunto</label>
                    <select name="assunto" required>
                        <option value="">Selecione...</option>
                        <?php foreach ($assuntos as $a): ?>
                            <option value="<?php echo $a; ?>"><?php echo $a; ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Mensagem</label>
                    <textarea name="mensagem" placeholder="Digite sua mensagem..." required></textarea>
                </div>
                
                <button type="submit" class="full">Enviar</button>
            </form>
        </div>
    </div>
</body>
</html>
```

</details>

**mensagens.php** lista as mensagens do usuário logado. A query usa `WHERE usuario_id = ?` pra só trazer mensagens dele (não de outros usuários), ordenadas da mais recente pra mais antiga. O `htmlspecialchars()` ao exibir garante que mesmo se alguém tivesse conseguido salvar HTML malicioso, não seria executado.

<details markdown="1">
<summary><strong>mensagens.php - Lista de mensagens</strong></summary>

```php
<?php
require_once 'includes/auth.php';
exigirLogin();

// Busca só as mensagens do usuário logado, mais recentes primeiro
$stmt = $pdo->prepare("SELECT * FROM mensagens WHERE usuario_id = ? ORDER BY criado_em DESC");
$stmt->execute([usuarioAtual()['id']]);
$mensagens = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minhas Mensagens</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="nav">
        <strong>Sistema de Contatos</strong>
        <div>
            <a href="index.php">Início</a>
            <a href="contato.php">Nova Mensagem</a>
            <a href="logout.php">Sair</a>
        </div>
    </nav>
    
    <div class="container wide">
        <h1>Minhas Mensagens</h1>
        
        <div class="card">
            <?php exibirMensagem(); ?>
            
            <?php if (empty($mensagens)): ?>
                <div class="empty">
                    <p>Você ainda não enviou nenhuma mensagem.</p>
                    <br>
                    <a href="contato.php" class="btn">Enviar Primeira Mensagem</a>
                </div>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Assunto</th>
                            <th>Mensagem</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($mensagens as $msg): ?>
                            <tr>
                                <td><?php echo date('d/m/Y H:i', strtotime($msg['criado_em'])); ?></td>
                                <td><?php echo htmlspecialchars($msg['assunto']); ?></td>
                                <td><?php echo nl2br(htmlspecialchars(substr($msg['mensagem'], 0, 100))); ?><?php echo strlen($msg['mensagem']) > 100 ? '...' : ''; ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
```

</details>

**.htaccess** configura o Apache pra melhorar a segurança. Desabilita listagem de diretórios (senão qualquer um poderia ver todos os arquivos), adiciona headers de segurança, bloqueia acesso a arquivos sensíveis (.sql, .env, etc), e impede acesso direto à pasta includes. Esse arquivo é processado pelo Apache, não pelo PHP.

<details markdown="1">
<summary><strong>.htaccess - Configurações do Apache</strong></summary>

```apache
# Desabilita listagem de diretórios
Options -Indexes

# Habilita rewrite (útil pra URLs amigáveis depois)
RewriteEngine On

# Headers de segurança
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Bloqueia acesso a arquivos sensíveis
<FilesMatch "\.(sql|log|ini|env|bak|config)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Protege a pasta includes de acesso direto
<IfModule mod_rewrite.c>
    RewriteRule ^includes/ - [F,L]
</IfModule>
```

</details>

---

## Testando o projeto

1. Instala o XAMPP e inicia o Apache e MySQL
2. Acessa `http://localhost/phpmyadmin` e cria o banco `sistema_contatos`
3. Executa o SQL das tabelas na aba SQL do phpMyAdmin
4. Cria a pasta `sistema_contatos` em `C:\xampp\htdocs`
5. Coloca os arquivos na estrutura mostrada
6. Acessa `http://localhost/sistema_contatos`
7. Cria uma conta, faz login, e envia mensagens!

O legal desse projeto é que ele usa tudo que a gente viu: HTML pra estrutura, CSS pra estilo, PHP pra lógica, MySQL pra persistência, sessões pra autenticação, validação e sanitização pra segurança. É um sistema completo, por mais simples que pareça.

---

## Segurança em Aplicações Web

Segurança não é opcional - é parte fundamental do desenvolvimento. Uma aplicação vulnerável pode expor dados de usuários, ser usada pra atacar outros sistemas, ou simplesmente destruir sua reputação. Vamos entender as principais vulnerabilidades e como nosso projeto se protege delas (e onde ainda pode melhorar).

### SQL Injection

SQL Injection é provavelmente o ataque mais conhecido e ainda muito comum. Acontece quando dados do usuário são inseridos diretamente numa query SQL sem tratamento. Imagina esse código vulnerável:

```php
// VULNERÁVEL - NUNCA faça isso!
$email = $_POST['email'];
$query = "SELECT * FROM usuarios WHERE email = '$email'";
$resultado = $pdo->query($query);
```

Se alguém digitar no campo de email: `' OR '1'='1' --`

A query vira: `SELECT * FROM usuarios WHERE email = '' OR '1'='1' --'`

O `OR '1'='1'` é sempre verdadeiro, então retorna todos os usuários. O `--` comenta o resto da query. O atacante acabou de burlar seu login.

Pior ainda, poderia ser: `'; DROP TABLE usuarios; --`

Isso deletaria toda a tabela de usuários.

No nosso projeto a gente se protege usando **prepared statements**:

```php
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
```

Com prepared statements, a estrutura da query é enviada pro banco separadamente dos valores. O banco sabe que o `?` é um valor, não código SQL. Mesmo que alguém coloque código malicioso, vai ser tratado como texto literal.

Isso é a proteção que usamos em todos os lugares do projeto que interagem com o banco - login, cadastro, inserção de mensagens, listagem. Nunca concatene variáveis diretamente em queries SQL.

### Cross-Site Scripting (XSS)

XSS acontece quando um atacante consegue injetar JavaScript malicioso que é executado no navegador de outros usuários. Tem três tipos principais:

**Reflected XSS**: O código malicioso vem na URL e é refletido na página. Exemplo: `pagina.php?nome=<script>alert('hackeado')</script>`. Se a página mostrar esse parâmetro sem sanitizar, o script executa.

**Stored XSS**: O código é armazenado no banco (num comentário, mensagem, perfil) e executado toda vez que alguém visualiza aquele conteúdo. Mais perigoso porque afeta todos os usuários que acessarem.

**DOM-based XSS**: O código malicioso manipula o DOM diretamente via JavaScript, sem passar pelo servidor.

O perigo real: um atacante pode roubar cookies de sessão (`document.cookie`), redirecionar pra páginas falsas, modificar o conteúdo da página, fazer requisições em nome do usuário...

No nosso projeto a proteção é o `htmlspecialchars()`:

```php
function sanitizar($string) {
    return trim(htmlspecialchars($string, ENT_QUOTES, 'UTF-8'));
}
```

Essa função converte caracteres especiais em entidades HTML:
- `<` vira `&lt;`
- `>` vira `&gt;`
- `"` vira `&quot;`
- `'` vira `&#039;`

Então se alguém tentar injetar `<script>alert('xss')</script>`, o navegador vai mostrar literalmente esse texto, não executar como código.

Usamos essa sanitização em todos os inputs que são exibidos de volta: nome do usuário, assunto da mensagem, conteúdo da mensagem. Sempre sanitize na saída (quando exibe) e valide na entrada (quando recebe).

### Cross-Site Request Forgery (CSRF)

CSRF é quando um atacante engana um usuário logado a fazer uma ação sem querer. Funciona assim: você tá logado no seu banco. O atacante te manda um link ou você acessa um site malicioso que tem um formulário oculto:

```html
<form action="https://seubanco.com/transferir" method="POST" id="evil">
    <input type="hidden" name="conta" value="atacante123">
    <input type="hidden" name="valor" value="10000">
</form>
<script>document.getElementById('evil').submit();</script>
```

Seu navegador ainda tem a sessão do banco ativa, então a requisição é feita com suas credenciais. O banco não sabe que não foi você que fez.

**No nosso projeto implementamos proteção CSRF** usando tokens. No `funcoes.php` temos as funções `csrfToken()` que gera um input hidden com um token único, e `validarCsrf()` que verifica se o token enviado bate com o da sessão. Todos os formulários (login, cadastro, contato) incluem o token e validam antes de processar.

O funcionamento é simples: quando a sessão começa, geramos um token aleatório de 32 bytes. Cada formulário inclui esse token num campo hidden. Quando o formulário é enviado, verificamos se o token veio e se bate com o da sessão. Como o atacante não tem acesso ao token (ele é único por sessão), não consegue forjar requisições válidas.

**CUIDADO!** Se você não aplicou proteção CSRF na sua aplicação, abaixo vai um resumo de como botar para usar tokens CSRF:

<details markdown="1">
<summary><strong>Como implementar proteção CSRF (código opcional)</strong></summary>

```php
// No início da sessão, gera um token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Na função de gerar token pro formulário
function csrfToken() {
    return '<input type="hidden" name="csrf_token" value="' . $_SESSION['csrf_token'] . '">';
}

// Na validação do POST
function validarCsrf() {
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        die('Token CSRF inválido');
    }
}
```

E nos formulários:

```html
<form method="POST">
    <?php echo csrfToken(); ?>
    <!-- resto do formulário -->
</form>
```

Cada formulário tem um token único que o atacante não consegue adivinhar. Se o token não bater, a requisição é rejeitada.

</details>

### Remote Code Execution (RCE)

RCE é o pesadelo de qualquer desenvolvedor - quando um atacante consegue executar código arbitrário no seu servidor. Geralmente acontece via:

**Upload de arquivos maliciosos**: Alguém faz upload de um arquivo `.php` disfarçado de imagem e depois acessa ele diretamente.

**Funções perigosas**: `eval()`, `exec()`, `system()`, `shell_exec()`, `passthru()` executando input do usuário.

**Desserialização insegura**: `unserialize()` com dados não confiáveis.

Nosso projeto não tem upload de arquivos nem usa essas funções perigosas, então tá relativamente seguro nesse aspecto. Mas se você for adicionar upload depois:

<details markdown="1">
<summary><strong>Como implementar upload seguro (código opcional)</strong></summary>

```php
// Validação básica de upload
$extensoesPermitidas = ['jpg', 'jpeg', 'png', 'gif'];
$extensao = strtolower(pathinfo($_FILES['arquivo']['name'], PATHINFO_EXTENSION));

if (!in_array($extensao, $extensoesPermitidas)) {
    die('Tipo de arquivo não permitido');
}

// Verifica o MIME type real (não confia só na extensão)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $_FILES['arquivo']['tmp_name']);
$mimesPermitidos = ['image/jpeg', 'image/png', 'image/gif'];

if (!in_array($mimeType, $mimesPermitidos)) {
    die('Tipo de arquivo inválido');
}

// Renomeia o arquivo pra evitar execução
$novoNome = bin2hex(random_bytes(16)) . '.' . $extensao;

// Move pra pasta fora do webroot ou com .htaccess bloqueando PHP
move_uploaded_file($_FILES['arquivo']['tmp_name'], 'uploads/' . $novoNome);
```

</details>

### Session Hijacking

Se um atacante conseguir o ID de sessão de um usuário, pode se passar por ele. Isso pode acontecer via XSS (roubando `document.cookie`), sniffing de rede (em conexões HTTP), ou session fixation.

Proteções que podemos aplicar:

```php
// No início de session_start, configure:
ini_set('session.cookie_httponly', 1);  // JavaScript não acessa o cookie
ini_set('session.cookie_secure', 1);    // Só envia em HTTPS
ini_set('session.use_strict_mode', 1);  // Rejeita IDs não inicializados pelo servidor

session_start();

// Regenera o ID após login (previne session fixation)
session_regenerate_id(true);
```

No nosso projeto já aplicamos essas proteções no `auth.php` e no `login.php` - o `session_regenerate_id(true)` é chamado após login bem-sucedido e as configurações de cookie seguro estão no auth.php.

### Senhas e Hashing

Nunca, jamais, em hipótese alguma armazene senhas em texto puro. Se o banco vazar (e bancos vazam o tempo todo), todas as senhas dos usuários ficam expostas. E como muita gente reutiliza senha, o estrago se espalha pra outros serviços.

No nosso projeto usamos `password_hash()` e `password_verify()`:

```php
// Criando hash da senha
$hash = password_hash($senha, PASSWORD_DEFAULT);

// Verificando senha
if (password_verify($senhaDigitada, $hashDoBanco)) {
    // Senha correta
}
```

O `PASSWORD_DEFAULT` atualmente usa bcrypt, que é lento de propósito (dificulta ataques de força bruta) e já inclui salt automaticamente. Quando algoritmos mais seguros surgirem, o PHP vai atualizar o default, e seu código continua funcionando.

**Nunca use**: MD5, SHA1, SHA256 puro pra senhas. São rápidos demais e vulneráveis a rainbow tables.

### Headers de Segurança

No `.htaccess` do projeto já configuramos alguns headers importantes:

```apache
Header set X-Content-Type-Options "nosniff"      # Previne MIME sniffing
Header set X-Frame-Options "SAMEORIGIN"          # Previne clickjacking
Header set X-XSS-Protection "1; mode=block"      # Ativa filtro XSS do navegador
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

Pra produção, considere adicionar também:

```apache
Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"  # Força HTTPS
```

O Content-Security-Policy (CSP) é especialmente poderoso contra XSS - você define de onde scripts podem ser carregados, bloqueando scripts inline maliciosos.

### Checklist de Segurança

Resumindo, aqui tá o que nosso projeto implementa:

**Implementado no projeto:**
- Prepared statements contra SQL Injection
- `htmlspecialchars()` contra XSS
- `password_hash()` pra senhas
- Validação de inputs
- Headers de segurança básicos
- Proteção da pasta includes via .htaccess
- `session_regenerate_id()` após login
- Configurações de cookie seguro (httponly, strict mode)
- Logout seguro (limpa sessão e cookie)
- Tokens CSRF em todos os formulários

**Pra implementar em produção:**
- Rate limiting (limitar tentativas de login)
- Logs de atividades suspeitas
- HTTPS (obrigatório!)
- Content-Security-Policy mais restritivo

Segurança é um processo contínuo. Novas vulnerabilidades são descobertas o tempo todo. Mantenha PHP e dependências atualizados, acompanhe as boas práticas, e sempre parta do princípio que todo input do usuário é potencialmente malicioso.

---

## Frameworks e próximos passos

O que a gente fez aqui é PHP "puro". Funciona, é didático, serve pra projetos pequenos. Mas pra projetos maiores, frameworks ajudam muito com organização, segurança, produtividade.

Em PHP o Laravel é o mais popular atualmente - elegante, bem documentado, cheio de features prontas. Symfony é mais robusto, usado em projetos enterprise. CodeIgniter é mais leve e simples. Pro front-end, React, Vue.js e Angular são os frameworks/bibliotecas mais usados. Se quiser usar JavaScript no back-end também, Node.js com Express é uma opção popular.

Minha sugestão de caminho: domina bem o básico primeiro (o que a gente viu aqui), depois aprende Git pra controle de versão, aprofunda em SQL, estuda um framework PHP (Laravel é uma boa pedida), e eventualmente explora o mundo JavaScript moderno se quiser.

---

## Considerações finais

Desenvolvimento web é um campo gigante e esse guia mal arranhou a superfície. Mas agora você tem uma base sólida: entende como front-end e back-end se comunicam, sabe criar interfaces com HTML/CSS, processar dados com PHP, armazenar no banco, fazer autenticação, proteger contra ataques básicos.

O projeto que a gente fez é simples mas funcional. Você pode evoluir ele de várias formas: adicionar painel admin pra ver todas as mensagens, implementar "esqueci minha senha" com envio de email, upload de arquivos, paginação, AJAX pra experiência mais fluida...

A dica é não ficar só na teoria. Pega esse projeto, roda, modifica, quebra, conserta. Adiciona features. Cada problema que você resolve te ensina algo novo. E quando travar, pesquisa - a comunidade de desenvolvimento é enorme e provavelmente alguém já passou pelo mesmo problema.
