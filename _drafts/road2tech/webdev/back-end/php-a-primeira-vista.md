# PHP à primeira vista

## Introdução ao PHP: O que é, o que faz e como funciona? Quais os fundamentos?

Neste artigo veremos rapidamente uma apresentação geral e logo mais um resumo prático dos fundamentos.

#### O que o PHP é?

É uma das linguagens de programação mais populares para desenvolvimento web. Ela é usada para criar sites dinâmicos e aplicativos web, além de ser compatível com a maioria dos servidores web e sistemas operacionais.

Desenvolvido em 1994 por Rasmus Lerdorf, o PHP inicialmente se chamava "Personal Home Page Tools" (Ferramentas de Página Pessoal). Desde então, o PHP evoluiu e se tornou uma das principais linguagens de programação para desenvolvimento web.

#### O que o PHP faz?

É uma linguagem de programação do lado do servidor, isso significa que o código PHP é executado no servidor web antes que a página seja enviada para o navegador do usuário, permitindo que as páginas da web sejam mais dinâmicas e interativas.

Esta linguagem é usada principalmente para criar aplicativos web, como fóruns, blogs, redes sociais e comércio eletrônico. Ele também é usado em sites corporativos e governamentais, bem como em aplicações internas de empresas.

#### Como o PHP funciona?

É interpretado, o que significa que o código é executado diretamente pelo servidor web, em vez de ser compilado em um executável. Isso torna o desenvolvimento mais rápido e fácil, pois as alterações podem ser feitas rapidamente e testadas imediatamente. É uma linguagem de tipagem fraca, o que significa que as variáveis não precisam ser explicitamente declaradas com um tipo de dados.

Ele é compatível com a maioria dos servidores web, incluindo Apache, Nginx e Microsoft IIS. Além de ser compatível com a maioria dos sistemas operacionais, incluindo Windows, Linux e macOS.

#### Conclusão da apresentação

O PHP é uma linguagem de programação popular para desenvolvimento web que permite criar sites dinâmicos e aplicativos web interativos. Ele é executado no lado do servidor e é compatível com a maioria dos servidores web e sistemas operacionais. Se você estiver interessado em desenvolvimento web, aprender PHP pode ser um ótimo lugar para começar.



### Introdução aos fundamentos

Se você está começando a aprender PHP, é possível que se sinta intimidado(a) à primeira vista. A sintaxe pode parecer confusa e você pode se perguntar como tudo isso funciona. No entanto, com um pouco de prática e dedicação, você pode se tornar confortável com a linguagem rapidamente.

Neste artigo, vamos dar uma olhada em alguns dos fundamentos do PHP, explicando conceitos básicos de forma clara e direta. Em vez de tentar cobrir todos os aspectos da linguagem de uma só vez, vamos focar em uma introdução gradual, como uma aula de apostila.

### Variáveis

As variáveis são um dos elementos mais importantes em qualquer linguagem de programação, e o PHP não é exceção. Em PHP, as variáveis são usadas para armazenar valores e podem ser definidas facilmente. Por exemplo, se você quiser definir uma variável chamada "nome", você pode usar o seguinte código:

```php
$nome = "João";
```

Isso define a variável "nome" como uma string contendo "João". As variáveis em PHP sempre começam com um sinal de dólar ($) seguido pelo nome da variável.

### Operadores

Os operadores são usados para realizar cálculos ou manipulações em variáveis. Em PHP, existem muitos tipos diferentes de operadores, desde operadores matemáticos básicos até operadores de comparação. Alguns exemplos incluem:

```php
$a + $b; // Adição
$a - $b; // Subtração
$a * $b; // Multiplicação
$a / $b; // Divisão
$a % $b; // Resto da divisão
$a == $b; // Igualdade
$a != $b; // Diferença
$a > $b; // Maior que
$a < $b; // Menor que
$a >= $b; // Maior ou igual a
$a <= $b; // Menor ou igual a
```

### Condicionais

As condicionais são usadas para testar condições e executar código com base no resultado desses testes. Em PHP, a estrutura de condicionais mais comum é o "if", que é usado da seguinte forma:

```php
if ($idade >= 18) {
    echo "Você é maior de idade.";
} else {
    echo "Você é menor de idade.";
}
```

Isso testa se a variável "idade" é maior ou igual a 18 e exibe uma mensagem apropriada com base no resultado.

## Fundamentos importantes da linguagem PHP

Além das variáveis, operadores e condicionais, existem diversos outros conceitos fundamentais da linguagem PHP que são essenciais para o desenvolvimento de aplicações web eficientes e seguras. Abaixo, são apresentados alguns desses conceitos:

### Funções

Funções são blocos de código que executam uma tarefa específica e podem ser chamados em qualquer parte do programa. As funções são usadas para modularizar o código e torná-lo mais organizado e reutilizável.

```php
// Exemplo de definição de função em PHP
function soma($a, $b) {
  return $a + $b;
}

// Chamada da função soma
$resultado = soma(2, 3); // $resultado será 5
```

### Loops

Loops são usados para repetir um bloco de código várias vezes. Existem dois tipos principais de loops em PHP: o `for` e o `while`.

```php
// Exemplo de uso do loop for
for ($i = 0; $i < 10; $i++) {
  echo $i;
}

// Exemplo de uso do loop while
$i = 0;
while ($i < 10) {
  echo $i;
  $i++;
}
```

### Arrays

Arrays são usados para armazenar uma coleção de valores relacionados sob um único nome. Eles são usados para armazenar listas de elementos e podem ser usados para representar dados estruturados.

```php
// Exemplo de definição de array em PHP
$frutas = array("maçã", "banana", "laranja");

// Acessando elementos de um array
echo $frutas[0]; // Imprime "maçã"
echo $frutas[1]; // Imprime "banana"
echo $frutas[2]; // Imprime "laranja"
```

### Classes e objetos

Classes e objetos são usados para criar estruturas de dados personalizadas e definir comportamentos específicos. Classes são usadas para definir a estrutura de dados, enquanto objetos são instâncias dessa estrutura.

```php
// Exemplo de definição de classe em PHP
class Pessoa {
  public $nome;
  public $idade;

  function __construct($nome, $idade) {
    $this->nome = $nome;
    $this->idade = $idade;
  }

  function apresentar() {
    echo "Meu nome é " . $this->nome . " e tenho " . $this->idade . " anos";
  }
}

// Criação de um objeto a partir da classe Pessoa
$pessoa1 = new Pessoa("João", 30);

// Chamada do método apresentar do objeto pessoa1
$pessoa1->apresentar(); // Imprime "Meu nome é João e tenho 30 anos"
```

### Manipulação de strings

A manipulação de strings é uma parte essencial do desenvolvimento web em PHP. É necessário manipular strings para formatar textos, validar dados de entrada, realizar buscas em bancos de dados, entre outras tarefas.

```php
// Exemplo de uso da função strlen para obter o tamanho de uma string
$frase = "Aprendendo PHP";
$tamanho = strlen($frase); // $tamanho será 15

// Exemplo de uso da função strpos para buscar um trecho de texto em uma string
$frase = "Aprendendo PHP";
$posicao = strpos($frase, "PHP"); // $posicao será 11

// Exemplo de uso da função str_replace para substituir trechos de texto em uma string
$frase = "Aprendendo PHP";
$nova_frase = str_replace("PHP", "JavaScript", $frase); // $nova_frase será "Aprendendo JavaScript"
```

### Tratamento de erros

O tratamento de erros é uma parte fundamental do desenvolvimento de aplicações web em PHP. Erros podem ocorrer em diversas situações, como quando um usuário insere dados inválidos em um formulário ou quando há um problema na conexão com o banco de dados.

```php
// Exemplo de tratamento de erros em PHP
try {
  // Código que pode gerar um erro
} catch (Exception $e) {
  // Código que trata o erro
  echo "Ocorreu um erro: " . $e->getMessage();
}
```

### Conclusão

Os fundamentos apresentados neste texto são apenas alguns dos conceitos essenciais da linguagem PHP. Existem muitos outros conceitos importantes que são utilizados no desenvolvimento de aplicações web robustas e eficientes. É importante lembrar que a prática é fundamental para se tornar um bom programador em PHP e que é necessário sempre buscar aprimorar os conhecimentos na linguagem.
