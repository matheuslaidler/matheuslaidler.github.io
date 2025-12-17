---
title: "Guia Definitivo de Programação C/C++"
description: "Jornada completa pela programação C baseada na experiência pessoal que tive na UFRJ em 2021"
date: 2022-05-18 12:00:00 -0300
last_modified_at: 2025-11-18 20:00:40 -0300
categories: [road2tech,development]
tags: [c, programming, programacao, guia, complete-guide, gcc, unix, linux, matematica, decimal, c++]
pin: false
math: true
---

# Desbravando C: Programação de Forma Didática

> Documentação completa e definitiva baseada na experiência prática de laboratório e redação na UFRJ. Do ambiente de desenvolvimento até conceitos avançados, preservando o estilo didático e explicações claras que fizeram desta jornada uma experiência única de aprendizado.

---

## Sumário

1. [Introdução](#introdução)
2. [Preparação do Ambiente](#preparação-do-ambiente)
3. [Parte I: Fundamentos](#parte-i-fundamentos)
4. [Parte II: Estruturas Intermediárias](#parte-ii-estruturas-intermediárias)
5. [Parte III: Tópicos Avançados](#parte-iii-tópicos-avançados)
6. [Conclusão](#conclusão)

---

## Introdução

Este guia apresenta uma jornada completa pela programação C, desde conceitos fundamentais até tópicos avançados como system calls e manipulação de bits. O material foi desenvolvido através de 12 tarefas práticas que abordam progressivamente todos os aspectos essenciais da linguagem.

A abordagem aqui é diferente dos manuais tradicionais - usamos analogias criativas, explicações didáticas e exemplos práticos que tornam conceitos complexos mais acessíveis. Como sempre dizíamos: "É legal deixar claro" cada detalhe, e é exatamente isso que faremos.

Queria aproveitar a introdução desta documentação - focada nas redações, exercícios e programas desenvolvidos em aula -, para saudar o professor Daniel Bastos, que tornou tudo isso possível. Ele não apenas foi um excelente professor para mim, como também um ótimo conselheiro. Conseguiu fazer com que os alunos gostassem de programação de forma natural, mesmo aqueles que estavam tendo contato com C como primeira linguagem. Juntei todos os arquivos das aulas e das tarefas de 2021 e tentei compactar neste documento. Deixarei todos os arquivos do backup em um repositório no github para quem tiver interesse ([UFRJ-Prog-C-2021](https://github.com/matheuslaidler/UFRJ-Prog-C-2021)).

Este guia serve tanto para iniciantes quanto para quem quer relembrar conceitos, funcionando como uma referência completa da linguagem C com foco prático.

---

## Para Marinheiros de Primeira Viagem

Se você está vendo C pela primeira vez, aqui estão alguns conceitos fundamentais que tornarão sua jornada muito mais tranquila:

### O Que É Programação?

Programação é essencialmente dar instruções precisas ao computador. Imagine que você está ensinando alguém a fazer um sanduíche por telefone - você precisa ser muito específico sobre cada passo, pois a pessoa não pode ver o que você está fazendo.

### Por Que Aprender C?

C é uma linguagem "próxima ao metal" - isto é, próxima ao hardware. Enquanto outras linguagens escondem detalhes complexos, C te mostra como as coisas realmente funcionam. É como aprender a dirigir com câmbio manual antes do automático - você entende melhor o que está acontecendo "por baixo dos panos".

### Conceitos Essenciais Antes de Começar

**Variáveis** são como caixas rotuladas onde guardamos informações:
```c
int idade = 25;        // Uma caixa chamada "idade" que guarda o número 25
char letra = 'A';      // Uma caixa chamada "letra" que guarda a letra A
```

**Funções** são receitas que executam tarefas específicas:
```c
printf("Olá mundo!");  // Uma receita que escreve texto na tela
```

**Arrays** são como prateleiras com várias caixas numeradas:
```c
int numeros[5];        // Uma prateleira com 5 caixinhas para números
```

**Ponteiros** são como endereços postais - apontam para onde algo está na memória. Não se preocupe se parecer confuso no início, eles fazem sentido com a prática.

#### Anatomia de um Programa C

Antes de prosseguir, vamos entender a "cara" de um programa C básico:

```c
#include <stdio.h>    // 1. Inclusões de bibliotecas

int main(void) {      // 2. Função principal - onde tudo começa
    printf("Olá!");   // 3. Comandos (instruções)
    return 0;         // 4. Retorno - diz "deu tudo certo"
}                     // 5. Fechamento com chave
```

**Linha por linha:**

1. **`#include <stdio.h>`** - É como pedir uma "caixa de ferramentas" emprestada. O `stdio.h` contém ferramentas para entrada/saída (como `printf` para escrever na tela). Sem isso, o computador não sabe o que é `printf`!

2. **`int main(void)`** - Todo programa C precisa de uma função `main`. É o "ponto de partida" - quando você executa o programa, ele começa aqui. O `int` significa que vai retornar um número inteiro, e `void` significa que não recebe nenhuma informação de fora.

3. **As chaves `{ }`** - Tudo entre as chaves pertence à função. É como os limites de uma receita.

4. **`return 0;`** - Avisa ao sistema operacional: "Terminei e deu tudo certo!" (0 = sucesso, outros números = algum erro)

5. **Ponto e vírgula `;`** - Cada instrução termina com `;`. É como o ponto final de uma frase. Esquecer o ponto e vírgula é um dos erros mais comuns de iniciantes!

#### Conceitos Fundamentais: Alto vs Baixo Nível

**Linguagens de Baixo Nível** (como C e Assembly):
- Controle direto sobre a memória
- Você gerencia ponteiros e alocação manual
- Mais próximas ao hardware
- Maior performance, mas mais trabalho

**Linguagens de Alto Nível** (como Python, JavaScript):
- Abstraem detalhes complexos
- Gerenciamento automático de memória
- Mais fáceis de usar, mas menos controle
- Ideais para desenvolvimento rápido

C fica numa posição única: é baixo nível o suficiente para ter controle total, mas alto nível o suficiente para ser produtivo.

#### E Sobre Orientação a Objetos?

Uma confusão comum: **C não é orientado a objetos**. C++ que é! Aqui está a diferença:

**C (Programação Estruturada):**
```c
// Dados e funções separados
struct Pessoa {
    char nome[50];
    int idade;
};

void mostrar_pessoa(struct Pessoa p) {
    printf("%s tem %d anos\n", p.nome, p.idade);
}
```

**C++ (Orientado a Objetos):**
```cpp
// Dados e métodos juntos numa classe
class Pessoa {
private:
    string nome;
    int idade;
public:
    void mostrar() {
        cout << nome << " tem " << idade << " anos" << endl;
    }
};
```

**Por que a confusão existe?**
- C++ foi construído "em cima" do C
- Muita sintaxe é similar
- C++ pode compilar muito código C

**Por que começar com C e não C++?**
1. **Base sólida** - Entender ponteiros e memória primeiro
2. **Simplicidade** - Menos conceitos para digerir inicialmente  
3. **Fundamentos** - OOP faz mais sentido depois de dominar o básico
4. **Versatilidade** - C está em todo lugar (sistemas embarcados, kernels, etc.)

Pense assim: C te ensina como a casa é construída (fundação, estrutura), C++ te mostra como decorar e organizar os cômodos (classes, objetos). Ambos são valiosos, mas entender a estrutura primeiro é essencial!


### Mentalidade Certa

1. **Erros são normais** - Todo programador erra centenas de vezes por dia. O importante é aprender com cada erro.

2. **Seja paciente** - Programação é como aprender um novo idioma. No início parece impossível, mas depois vira natural.

3. **Pratique muito** - Ler sobre programação é como ler sobre natação - só funciona se você praticar.

4. **Pense passo a passo** - Quebre problemas grandes em probleminhas pequenos.

### Antes de Prosseguir

Este guia foi criado a partir de aulas reais da UFRJ, mantendo o estilo didático único que me ajudou e também pode ajudar muitos estudantes. As explicações usam analogias do dia a dia porque conceitos abstratos ficam mais fáceis quando comparamos com coisas familiares. Juntei minhas anotações, programas e pesquisas da época com as explicações e anotações do meu professor. Eu mesmo vou continuar utilizando este documento para estudo.

Não tenha pressa. Cada seção constrói sobre a anterior. Se algo não fizer sentido, volte e releia - é completamente normal precisar de várias leituras para absorver conceitos novos.

Agora vamos começar nossa jornada! 🚀

---

## Preparação do Ambiente

### Ambientes de Desenvolvimento Suportados

#### Windows - MSYS2/MinGW
Para usuários Windows, foi recomendado pelo professor usar o **MSYS2-MinGW** (32 e 64 bits) que fornece um ambiente Unix-like completo:

```bash
# Instalação básica após baixar MSYS2
pacman -S mingw-w64-x86_64-gcc
pacman -S make
pacman -S wget
pacman -S tar
```

Eu recomendo a utilização do **WSL2** para quem quer usar os comandos bash/ambiente Unix-like, tenho um pequeno tutorial de como instalar e usar no post sobre comandos [Linux: Dando início a uma fase Terminal ](../terminal/) - nesse artigo explico bem os comandos shell e pode ser um complemento útil.

#### Linux/Unix
Em sistemas Unix/Linux, as ferramentas geralmente já estão disponíveis:

```bash
# Ubuntu/Debian
sudo apt install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
```

#### Editor Recomendado
**Sublime Text**, **Atom** e **VScode** são softwares altamente recomendados para visualização adequada de:
- Diferenciação entre espaços e TABs
- Syntax highlighting para C
- Múltiplos arquivos simultaneamente

### Ferramentas Essenciais

#### GCC - GNU Compiler Collection
O coração do nosso ambiente de desenvolvimento:

```bash
# Compilação básica
gcc programa.c -o programa

# Compilação com flags recomendadas
gcc -Wall -x c -g -std=c99 -pedantic-errors -c arquivo.c
gcc -o executavel arquivo.o

# Para bibliotecas matemáticas
gcc programa.c -lm -o programa
```

**Flags importantes:**
- `-Wall`: Mostra todos os warnings
- `-g`: Inclui informações de debug
- `-std=c99`: Usa padrão C99
- `-pedantic-errors`: Força conformidade estrita
- `-lm`: Linka biblioteca matemática

#### Make - Automatização de Build
O `make` determina automaticamente quais partes precisam ser recompiladas:

```makefile
# Exemplo de Makefile básico
CFLAGS = -Wall -x c -g -std=c99 -pedantic-errors

programa: programa.o
	gcc -o programa programa.o

programa.o: programa.c
	gcc $(CFLAGS) -c programa.c

clean:
	rm -f *.o programa
```

**Observação crucial:** Comandos no Makefile **DEVEM** usar TAB, não espaços. O make trata TAB como operador para executar comandos shell.

#### Comandos Shell Essenciais

```bash
# Download de pacotes
wget http://exemplo.com/arquivo.tar.gz

# Descompactação
tar -zxvf arquivo.tar.gz

# Compilação automatizada
make

# Limpeza
make clean

# Execução com privilégios (Unix/Linux)
chmod +x programa
./programa

# Redirecionamento de entrada (stdin) do programa para ler os dados que estão em arquivo.txt
./programa < arquivo.txt
# o contrário (./program > arquivo.txt) seria redirecionamento de saída do programa para um arquivo - stdout.

# Uso de pipes
echo 'dados' | ./programa

# Filtragem com grep
ls | grep "palavra"
```

### Configuração Inicial

#### Testando o Ambiente

Crie um arquivo `teste.c`:

```c
#include <stdio.h>

int main(void) {
    printf("Ambiente configurado com sucesso!\n");
    return 0;
}
```

Compile e execute:

```bash
gcc teste.c -o teste
./teste
```

Se aparecer "Ambiente configurado com sucesso!", você está pronto para começar!

#### Estrutura de Projeto Recomendada

```
projeto/
├── src/           # Código fonte (.c)
├── include/       # Headers (.h)
├── obj/           # Arquivos objeto (.o)
├── bin/           # Executáveis
├── Makefile       # Automação de build
└── README.md      # Documentação
```

**O que são arquivos Header (.h)?**

Arquivos `.h` (headers) são como "índices" ou "contratos". Eles declaram o que existe (funções, constantes) sem mostrar como funciona por dentro. O código real fica nos arquivos `.c`.

**Por que separar?**
- **Organização:** Fácil ver o que um módulo oferece
- **Reutilização:** Vários arquivos `.c` podem usar o mesmo `.h`
- **Compilação mais rápida:** Só recompila o que mudou

**Exemplo prático:**
```c
// calculadora.h - O "contrato"
int somar(int a, int b);      // Declara que existe uma função somar
int multiplicar(int a, int b); // Declara que existe multiplicar

// calculadora.c - A "implementação"
#include "calculadora.h"
int somar(int a, int b) { return a + b; }        // Aqui está o código real
int multiplicar(int a, int b) { return a * b; }

// programa.c - Quem usa
#include "calculadora.h"  // Aspas = arquivo nosso; <> = biblioteca do sistema
int resultado = somar(2, 3);  // Agora pode usar!
```

Agora vamos começar nossa jornada! 🚀

---

## Parte I: Fundamentos

### Tarefa 1: Contando Dígitos - Introdução aos Arrays

#### O Problema Prático

Certa empresa colocou regras específicas para identificação de relatórios para organização geral. Uma delas era sobre numerá-los por dez sessões diferentes apresentadas, assim ficaria mais organizado e daria para controlar a quantidade por sessões.

Ao catalogar os relatórios com os dígitos, um pequeno banco de dados poderia ser feito com cada número referente a cada sessão com seus respectivos relatórios. Ou seja, se a sessão '0' for referente à sessão de RH da empresa, todos os relatórios de RH estarão alocados somente naquela região.

O programa que estudamos aqui serve para contar esses números de dígitos contidas num arquivo-texto qualquer. Ele também identificará os outros tipos de caracteres.

#### Definições Básicas

Antes de começar, vamos definir o que é um 'dígito' nesta versão 0.1: consideraremos como *dígito* qualquer caractere do teclado numérico (0-9).

#### Como Usar o Programa

Usamos o programa da forma típica UNIX, usando o shell para preparar a entrada:

```bash
./count-digits < /etc/services
digits = 174 193 121 138 125 122 127 93 64 83, white space = 2444, other = 9282

echo '12389473921874 ! @ banana' | ./count-digits 
digits = 0 2 2 2 2 0 0 2 2 2, white space = 4, other = 8
```

#### Entendendo o Funcionamento

O programa começa criando uma lista com os dígitos do nosso teclado - um array que contém os 10 elementos de 0 a 9. Ele funciona basicamente como um banco de dados para nosso programa. A ideia é comparar cada caractere do texto com cada elemento da lista, contando as ocorrências.

A saída mostra quantas vezes cada dígito apareceu, na ordem dos nossos 10 elementos (0,1,...9). Se aparecer o '0' duas vezes e do '1' em diante aparecer uma vez cada, o resultado será: `2 1 1 1 1 1 1 1 1 1`

**Declaração das variáveis:**

```c
int main(void) {
  int c, nwhite, nother;
  int ndigit[10]; /* 0, 1, 2, 3, 4, ..., 9 */
```

**Inicialização do array:**

```c
nwhite = nother = 0;
for (int i = 0; i < 10; ++i)
  ndigit[i] = 0;
```

**Entendendo o laço `for`:**

O `for` é uma estrutura de repetição (loop) com três partes:

```c
for (inicialização; condição; incremento)
    comando;
```

1. **Inicialização** (`int i = 0`): Executa uma vez no início, criando uma variável contadora
2. **Condição** (`i < 10`): Enquanto for verdadeira, o loop continua
3. **Incremento** (`++i`): Executa após cada repetição

Então `for (int i = 0; i < 10; ++i)` significa: "comece com i=0, enquanto i for menor que 10, execute o comando e depois some 1 em i". Isso repete o comando 10 vezes (i vai de 0 a 9).

**O coração do programa - a contagem:**

```c
while ((c = getchar()) != EOF) {
  if (c >= '0' && c <= '9')
    ++ndigit[c - '0'];
  else if (c == ' ' || c == '\n' || c == '\t')
    ++nwhite;
  else 
    ++nother;
}
```

**Explicando as peças novas:**

- **`getchar()`** - Lê um único caractere da entrada. É como pegar uma letra de cada vez de um texto.

- **`EOF`** - Significa "End Of File" (Fim do Arquivo). Quando não há mais nada para ler, `getchar()` retorna esse valor especial. É o sinal de "acabou".

- **`++ndigit[...]`** - O `++` antes da variável incrementa (soma 1) antes de usar o valor. Se `ndigit[3]` vale 5, após `++ndigit[3]` ele vale 6.

- **`c >= '0' && c <= '9'`** - Verifica se o caractere está entre '0' e '9'. O `&&` significa "E" (ambas condições devem ser verdadeiras).

Em outras palavras, o programa pega o valor dos caracteres e os compara. É como se começasse assim: `digits= 0 0 0 0 0 0 0 0 0 0, white space = 0, other = 0`

A cada espaço, quebra de linha ou tab, incrementa o 'white space'. Para cada caractere que não é número nem espaço, incrementa 'other'. Para cada dígito, incrementa a posição correspondente no array.

**Observação importante:** Para pegar o número total de caracteres usados, podemos somar o 'other' com os números encontrados. Isso sem contar espaços e quebras de linha.

**Exibição dos resultados:**

```c
printf("digits =");
for (int i = 0; i < 10; ++i)
  printf(" %d", ndigit[i]);
printf(", white space = %d, other = %d\n", nwhite, nother);
```

#### Detalhe Crucial: Precedência de Operadores

Para o laço-while funcionar, precisamos os parênteses em `(c = getchar())` porque a precedência do operador `=` é menor que a do `!=`. Sem eles, teríamos:

```c
c = (getchar() != EOF)
```

Assim, os únicos "caracteres" lidos seriam 1 ou 0 (resultados da comparação), causando contagem incorreta.

**Observação importante:** Para pegar o número total de caracteres usados, podemos somar o 'other' com os números encontrados. Isso sem contar espaços e quebras de linha. Esta é uma propriedade do programa que serve para verificarmos a saída dele.

#### Entendendo a Tabela ASCII

Para entender o truque `c - '0'`, precisamos conhecer a **tabela ASCII**. ASCII é um padrão que associa cada caractere a um número:

| Caractere | Número ASCII |
|-----------|-------------|
| '0' | 48 |
| '1' | 49 |
| '2' | 50 |
| ... | ... |
| '9' | 57 |
| 'A' | 65 |
| 'a' | 97 |

Quando escrevemos `'0'` (com aspas simples), não estamos falando do número zero, mas do **caractere** '0', que vale 48 na tabela ASCII.

**O truque mágico:** Se `c` contém o caractere '5' (ASCII 53), então `c - '0'` faz `53 - 48 = 5`. Transformamos o caractere no número correspondente!

A natureza da tabela ASCII faz com que `c - '0'` seja sempre um número entre 0 e 9 quando c é um dígito. Observar isso prova que o statement `++ndigit[c - '0']` sempre funcionará porque o índice nunca cai fora dos limites do array, que é de zero a nove.

#### Código Completo

```c
#include <stdio.h>

int main(void) {
  int c, nwhite, nother;
  int ndigit[10];
  
  nwhite = nother = 0;
  for (int i = 0; i < 10; ++i)
    ndigit[i] = 0;
    
  while ((c = getchar()) != EOF) {
    if (c >= '0' && c <= '9')
      ++ndigit[c - '0'];
    else if (c == ' ' || c == '\n' || c == '\t')
      ++nwhite;
    else 
      ++nother;
  }
  
  printf("digits =");
  for (int i = 0; i < 10; ++i)
    printf(" %d", ndigit[i]);
  printf(", white space = %d, other = %d\n", nwhite, nother);
  
  return 0;
}
```

### Tarefa 2: Função getline - Manipulação de Strings

#### Conceito Importante: Constantes com #define

Antes de mergulhar nesta tarefa, precisamos entender o `#define`. Ele cria uma **constante** - um valor que não muda durante o programa:

```c
#define MAXLINE 1000   // Define que MAXLINE vale 1000
```

**Por que usar?** Imagine que você usa o número 1000 em 50 lugares do código. Se precisar mudar para 2000, teria que alterar 50 vezes! Com `#define`, muda só em um lugar.

**Convenção:** Constantes são escritas em MAIÚSCULAS para diferenciá-las de variáveis comuns.

**O terminador nulo `\0`:** Toda string em C termina com um caractere especial invisível chamado "terminador nulo" (`\0`). Ele diz ao computador: "a string acaba aqui". Por isso, se você quer guardar 5 letras, precisa de espaço para 6 caracteres (5 + o `\0`).

#### O Cenário Prático

Um chefe pede para você ajudar o time de suporte verificando relatórios que seguem normas padrão de limite de caracteres e linhas por documento. Como primeira camada de correção, documentos que excedem os limites são descartados. Para automatizar essa tarefa repetitiva, criamos um programa que analisa linha por linha.

#### Conceitos Fundamentais sobre Strings

É importante considerarmos uma 'string de palavras' como uma lista de caracteres, ou seja, banana seria um array com cada elemento sendo cada letra dessa palavra. Portanto, uma linha inteira seria uma lista de todas as caracteres presentes, como letras e espaços, por exemplo.

Cada letra, espaço e caractere escape serão contados como um caractere. Caracteres escape seriam os tipos de caracteres que são interpretados de outra forma, como o '\n', que ao invés de printar a escrita direto, será feito a função de pular uma linha.

**Importante:** Para usuários de Windows, uma quebra de linha pode contar como dois. Isso porque o padrão desse sistema é ser \r\n ao invés de ser apenas \n. Dá para verificar o tipo com programas de edição de texto como NotePad++, podemos ver se está como Unix(LF) ou Windows(CR LF).

Podemos até adicionar uma condicional no programa para sempre que achar um \r antes de um \n descartar ele da contagem ou simplesmente colocá-lo no loop for como uma das formas de parar o loop, dessa forma ele já não será contado de qualquer maneira. O problema é que nunca daria para verificar se o \n existe pois antes de chegar nele o loop já pararia. Não me parece necessário perder muito tempo nisso. Por exemplo: se a lista[i] = \n, podemos ver se lista[i-1] é \r, se for, não contar essa caractere.

**Representação na memória:**

```
lista = ['b','a','n','a','n','a','\n','\0']

         B A N A N A \n \0    ->      08 bytes
        -----------------------   (1 byte = 8 bits)
         8 8 8 8 8 8  8  8    ->      64 bits
```

#### Como Usar o Programa

```bash
# Para usuários Unix/Linux que precisam dar privilégio
chmod +x lnlen

./lnlen < count-digits.c | head -13

1: 19: #include <stdio.h>
2: 1:
3: 17: int main(void) {
4: 25:   int c, nwhite, nother;
5: 46:   int ndigit[10];
6: 1:
7: 23:   nwhite = nother = 0;
8: 31:   for (int i = 0; i < 10; ++i)
9: 19:     ndigit[i] = 0;
10: 1:
11: 35:   while ((c = getchar()) != EOF) {
12: 30:     if (c >= '0' && c <= '9')
13: 25:       ++ndigit[c - '0'];
```

#### Análise da Função getline

A função que lê uma linha completa é crucial para o programa. Esta função, que chamaremos 'getline', percorre a linha inteira, verifica os elementos e retorna a quantidade de caracteres.

```c
int getln(char s[], int lim) {
  int c, i;                 
  for (i = 0; i < lim - 1 && (c = getchar()) != EOF && c != '\n'; ++i)
    s[i] = c;
  if (c == '\n') {
    s[i] = c; 
    ++i;
  }
  s[i] = '\0';
  return i;    
}
```

O valor de 'c' recebe cada elemento da entrada, permitindo comparar se chegamos ao final da linha. O 'i' acumulado representa o total de caracteres da linha.

#### Análise da Função Main

A função main faz a contagem de linhas, iniciando 'i' com 1, obtendo o resultado de getline como 'len'. Se maior que 0, incrementa o contador de linhas até que getline retorne 0 (não há mais linhas). Então imprime o número da linha, quantidade de caracteres e o conteúdo.

```c
int main(void) {
  int len; char ln[MAXLINE];
  for (int i = 1; (len = getln(ln, MAXLINE)) > 0; ++i)
    printf("%d: %d: %s", i, len, ln);
  return 0;
}
```

#### Conceito Importante: Call By Value

Uma relação interessante sobre funções e variáveis: a variável 's' armazena o endereço da variável 'ln' em main. Quando getln() entra em ação, existem dois objetos que conhecem a posição do array que guarda a linha lida: o primeiro objeto é 'ln' em main e o segundo é 's' em getline.

Mesmo que modifiquemos o valor de 's', fazendo algo como 's = 0', não afetaria o valor de 'ln' em nada: o efeito é esquecer onde 'ln' está porque trocamos a informação que tínhamos pelo número zero. Apesar de tirar o valor de 's', o procedimento main continua bem porque ainda sabe que a string está na posição da memória armazenada por 'ln'.

Em outras palavras, se você tem duas variáveis ligadas, modificar uma não significa que também modificou a outra, o que pode ser visto como garantia de integridade. Essa funcionalidade é importante e interessante, conhecida como 'Call By Value'.

#### Código Completo

```c
#include <stdio.h>
#define MAXLINE 1000

int getln(char s[], int lim);

int main(void) {
  int len; char ln[MAXLINE];
  for (int i = 1; (len = getln(ln, MAXLINE)) > 0; ++i)
    printf("%d: %d: %s", i, len, ln);
  return 0;
}

int getln(char s[], int lim) {
  int c, i;                 
  for (i = 0; i < lim - 1 && (c = getchar()) != EOF && c != '\n'; ++i)
    s[i] = c;
  if (c == '\n') {
    s[i] = c; 
    ++i;
  }
  s[i] = '\0';
  return i;    
}
```

---

## Parte II: Estruturas Intermediárias

### Tarefa 3: Calculadora com Notação Polonesa - Estruturas de Dados (Pilhas)

#### A História da Calculadora

Em uma escola de programação, um aluno pede dicas ao monitor sobre seu primeiro projeto. O monitor sugere criar algo pessoal e útil, como uma ferramenta para automatizar tarefas. Sem ideias específicas, o aluno aceita a sugestão de fazer uma calculadora.

Como uma calculadora completa é complexa para iniciantes, o professor recomenda começar com algo simples para "pegar o jeito" antes de partir para projetos mais ambiciosos e "testar tudo que der na telha".

#### Entendendo a Notação Polonesa

Enquanto usamos expressões como "2 + 2" (notação infixa), a "notação polonesa" escreveria "+ 4 4" - operador antes dos argumentos. A notação reversa escreve "4 4 +" - argumentos antes do operador. Esta notação foi inventada pelo matemático Jan Lukasiewicz.

Nosso programa usa notação polonesa inversa e é básico: não considera números flutuantes. Uma divisão resultando '1,3' será exibida como '1'.

#### Usando Comandos Shell

Como o programa roda em shell, podemos usar comandos compatíveis. Damos entrada aos números e operações via 'echo' (similar ao 'print' em Python), usando pipe '|' para redirecionar dados.

O pipe funciona como filtro para controlar a saída do terminal. Por exemplo:

```bash
ls | grep "prova"
prova_de_matemática.txt
prova_de_fisica1.pdf
provas_corrigidas.docx
provando_teoremas.pdf
```

O pipe redirecionou a saída do 'ls' para o 'grep', que filtrou apenas arquivos contendo "prova".

#### Exemplos de Uso

```bash
echo '1 1 +' | ./polonesa.exe
2

echo '2 5 *' | ./polonesa.exe
10

echo '10 2 /' | ./polonesa.exe
5
```

É possível encadear operações: '1 1 + 60 +' soma 1+1=2, depois 2+60=62. Um operador funciona com dois números - três números precisam de mais operadores.

#### Estrutura de Dados: Stack (Pilha)

A calculadora usa uma pilha como estrutura de dados. Quando detecta um número, coloca no topo da pilha. Quando detecta uma operação, retira dois elementos, computa a operação e coloca o resultado na pilha.

**Imagine que o programa escolhe a ordem dos números como batatinhas Pringles em seu pote cilíndrico. A cada operação, ele retira duas "batatinhas" do topo para fazer a operação. Essas são as últimas colocadas antes da operação.**

É importante frisar que, mesmo pegando números do topo, o programa não atrapalha a ordem da polonesa inversa. Se '10 - 20' é escrito '10 20 -', ele não pode inverter a ordem na operação.

#### Exemplo Detalhado

```bash
echo '2 3 + 1 -' | ./polonesa.exe
4
```

Passo a passo:
1. Lê '2' → coloca na pilha
2. Lê '3' → coloca na pilha
3. Lê '+' → pega 3 e 2, calcula 2+3=5, coloca 5 na pilha
4. Lê '1' → coloca na pilha  
5. Lê '-' → pega 1 e 5, calcula 5-1=4

#### Implementação das Funções de Pilha

```c
int sp = 0;  
int val[MAXVAL];

void push(int n) {
  if (sp < MAXVAL)
    val[sp++] = n;
  else
    printf("error: stack full: %d\n", n);
}

int pop(void) {
  if (sp > 0)
    return val[--sp];
  else {
    printf("error: tried to pop an empty stack\n");
    return 0;
  }
}
```

Para empilhar usa-se push(), para retirar usa-se pop(). O sp marca a próxima posição livre na pilha. No push, `val[sp++]` primeiro iguala a 'n', depois incrementa sp. No pop, `--sp` primeiro decrementa (porque sp já está na próxima posição livre).

#### Buffer de Entrada

**O que é um buffer?** Um buffer é uma área de memória temporária usada para armazenar dados "em trânsito". Pense como uma sala de espera: os dados ficam ali temporariamente antes de serem processados.

**Por que precisamos disso aqui?** Às vezes o programa lê um caractere a mais para saber se o número terminou (por exemplo, lê um espaço). Esse caractere extra precisa ser "devolvido" para ser lido depois. O buffer guarda esses caracteres "devolvidos".

O programa usa um buffer para guardar informações temporariamente:

```c
int getch(void) { 
  if (p > 0) 
    return buf[--p]; 
  else 
    return getchar();
}

void ungetch(int c) {
  if (p >= BUFSIZE)
    printf("ungetch: too many characters; buffer full\n"); 
  else
    buf[p++] = c;
}
```

Esta implementação mantém a integridade das informações durante movimentações entre diferentes partes do programa.

#### Função getop - Reconhecimento de Tokens

```c
int getop(char s[]) {
  int i, c;

  while ((s[0] = c = getch()) == ' ' || c == '\t')
    ; /* skip white space */

  s[1] = '\0';

  if (!isdigit(c)) {
    return c; /* not a digit, not an integer */
  }
```

**Sobre `isdigit()`:** Esta função verifica se um caractere é um dígito (0-9). Retorna um valor diferente de zero (verdadeiro) se for dígito, ou zero (falso) se não for. Precisa incluir `<ctype.h>` para usá-la.

O primeiro while ignora espaços completamente. Se não é dígito, trata-se de operador. Para números multi-dígito:

```c
i = 0;
if (isdigit(c)) 
  while (isdigit(s[++i] = c = getch()))
    ;
s[i] = '\0';

if (c != EOF)
  ungetch(c); 

return NUMBER;
```

Este processo lê caracteres consecutivos formando um número inteiro, fechando com '\0'.

#### Função Main - O Centro de Controle

**Antes de ver o código, entenda o `switch`:**

O `switch` é uma forma elegante de fazer múltiplas comparações. Em vez de vários `if-else if-else if...`, usamos:

```c
switch (variavel) {
  case valor1:
    // faz algo se variavel == valor1
    break;       // IMPORTANTE: sai do switch
  case valor2:
    // faz algo se variavel == valor2
    break;
  default:
    // faz algo se nenhum case combinou
}
```

**`break`** é essencial! Sem ele, o código "escorre" para o próximo case. O **`default`** é o "caso contrário" - executa se nenhum case combinar.

**Sobre `atoi()`:** A função `atoi()` (ASCII to Integer) converte uma string de texto em número. Por exemplo: `atoi("42")` retorna o número `42`.

```c
#include <stdio.h>
#include <stdlib.h>
#include "polonesa.h"
#define MAXOP 100

int main(void) { 
  int type; int op2; char s[MAXOP];

  while ( (type = getop(s)) != EOF ) {

    switch (type) {
    case NUMBER: 
      push(atoi(s));
      break;
    case '+':
      push(pop() + pop());
      break;
    case '*':
      push(pop() * pop());
      break;
    case '-':
      op2 = pop();
      push(pop() - op2); 
      break;
    case '/': 
      op2 = pop();
      if (op2 != 0) {
        push(pop() / op2);
      } else {
        printf("error: division by zero is *undefined*\n");
      }
      break;
    case '\n':
      printf("\t%d\n", pop());
      break;
    default:
      printf("error: unknown operator ``%s''\n", s);
      break;
    }
  }
  return 0;
}
```

O getop retorna sempre um TIPO de token. Para números, usa atoi() para converter string em inteiro. Para operações, a ordem importa - a linguagem C não garante qual pop() executa primeiro, então usamos a variável op2 para garantir ordem correta.

A quebra de linha exibe e remove o topo da pilha. Tentar duas quebras consecutivas resultará em erro (pilha vazia).

### Tarefa 4: Ponteiros e Endereços IP - Referências de Memória

#### A Importância das Referências

É comum em diversas atividades a necessidade de referências. Na linguagem, usamos referências etimológicas para explicar palavras. Na programação, ponteiros servem para dar referência a localizações na memória.

Em C, usar ponteiros para referenciar posições de memória é útil e interessante.

#### Conceitos Básicos de Ponteiros

O resumo mais breve: o símbolo '*', além de multiplicação, serve para ponteiros e referências.

**Um ponteiro é uma variável que armazena um endereço de memória.** Como endereços são números inteiros, ponteiros armazenam números inteiros. Eles apontam para lugares na memória onde dados estão armazenados.

Para um caractere:
```c
char* p;
```

Isso diz ao compilador: "p é um número que armazena endereço de memória onde há um caractere".

#### Exemplo Prático

```c
#include <stdio.h>

int main() {
  char c; c = 'a';

  printf("c = %d = %c\n", c, c);
  printf("c is at %p\n", &c);
}
```

O operador '&' mostra o endereço em memória onde uma variável está localizada. A resposta vem em hexadecimal (começa com 0x), representando um inteiro em base 16.

#### Endereços IP e Network Byte Order

IP significa "Internet Protocol". É o nome do protocolo de roteamento de redes como a Internet. Numa rede-IP, a cada computador um número de 32 bits é associado. Por exemplo, um computador na Internet poderia ter sido associado ao número 1 ou 2 ou 16909060. Qualquer número entre 0 e 2^32 - 1 bits serve.

Suponha que um certo computador na Internet tenha sido associado ao número 16909060. O que se diz então é que esse computador tem endereço-IP 1.2.3.4.

**Mas espera - o que é Little-Endian e Big-Endian?**

Quando guardamos um número grande (que ocupa vários bytes) na memória, temos duas formas de organizá-lo:

- **Big-Endian** ("ponta grande primeiro"): O byte mais significativo vem primeiro. Como escrevemos números normalmente: 1234 = mil duzentos e trinta e quatro.

- **Little-Endian** ("ponta pequena primeiro"): O byte menos significativo vem primeiro. Seria como escrever 1234 de trás pra frente: 4321.

**Analogia:** Imagine escrever uma data. Americanos escrevem Mês/Dia/Ano (MM/DD/YYYY), brasileiros escrevem Dia/Mês/Ano (DD/MM/YYYY). O mesmo dado, ordens diferentes!

A maioria dos PCs usa Little-Endian. É importante saber disso quando você inspeciona a memória diretamente.

Já sabemos que o número 16909060 é escrito na memória de um computador-little-endian como [04][03][02][01], sendo que cada grupo de colchetes representa um byte. Isso implica, portanto, que a notação de endereços-IP é big-endian. De fato, o que é chamado de "network byte order" - a convenção de que ordem usar quando dados são transmitidos via rede - é, por definição, big-endian.

#### Lendo Bytes de um Inteiro

Para entender melhor como dados são armazenados:

```c
#include <stdio.h>

int main() {
  int x = 5;
  char *p = (char*)&x;
  
  printf("Inteiro: %d\n", x);
  for(int i = 0; i < sizeof(int); i++) {
    printf("Byte %d: %d\n", i, p[i]);
  }
}
```

**Nota de compilação:** Este código pode gerar avisos, mas funciona. Compile com:
```bash
gcc -o bytes-of-int bytes-of-int.c
```

### Tarefa 5: Conversão de Tipos e Argumentos de Linha de Comando

#### Trabalhando com argc/argv

Esta tarefa foca numa calculadora que aceita argumentos via linha de comando, utilizando a biblioteca matemática do C.

**Entendendo argc e argv:**

Quando você executa um programa pelo terminal com argumentos, como `./calculadora 5 + 3`, o sistema passa essas informações para o programa através de dois parâmetros especiais:

- **`argc`** (argument count): Um número que diz quantos argumentos foram passados. No exemplo `./calculadora 5 + 3`, argc seria 4 (o nome do programa conta!).

- **`argv`** (argument vector): Um array contendo os argumentos como strings. No exemplo:
  - `argv[0]` = "./calculadora"
  - `argv[1]` = "5"
  - `argv[2]` = "+"
  - `argv[3]` = "3"

O argv é um array de ponteiros para caracteres - essencialmente um array de strings: "argv[0], argv[1], argv[2]...". Poderíamos declarar como `char **argv` (ponteiro para ponteiro), mas `char *argv[]` é mais claro neste contexto.

#### Compreendendo Arrays de Ponteiros vs Arrays Simples

É importante entender que `char *argv[]` é um array de **ponteiros** (pra char), ou seja, argv[] é um array em que cada posição dele armazena o endereço onde se localiza uma string - que é uma string digitada na linha de comando.

Se olharmos os endereços de cada **posição** do array, veremos que todos eles estão sequencialmente na memória do computador. Mas o **valor** que guardamos em cada elemento (do array argv[]) pode ser qualquer endereço de memória.

Considere a linha de comando: `./expr.exe 1 + 2`

Essa linha produzirá um array com quatro elementos. Qual será o valor de argv[0]? Pode ser, por exemplo, 123. Mas, se for esse o valor, então no endereço de memória 123 estará o caractere '.' e no endereço 124 estará o '/' e assim sucessivamente.

Strings também são arrays e, portanto, ocupam regiões **contíguas** de memória. Por isso a string "./expr.exe" tem que estar disposta de forma contígua.

Enquanto argv[0] e argv[1] são as posições das strings da linha de comando, &argv[0] e &argv[1] são os lugares onde estão anotados os endereços onde (na memória) estão esses argumentos da linha de comando. É fácil confundir as duas coisas.

#### Eficiência em Condicionais

Para verificar argumentos, é mais prático usar uma condicional única:

```c
int main(int argc, char *argv[]) {
  if (argc != 4) usage(0);
  // ...
}
```

#### Conversão String para Integer

Existem formas usuais como 'atoi()', 'strtol()' e 'strtoumax()', mas aqui aprendemos a implementar essas funções. É como aprender a fazer o motor - quando quebrar, saberemos consertar.

O programa utiliza uma função interessante para este fim: `uint64_t array_to_uint64(char *s, uint64_t *u)`. É interessante ressaltar que 'uint' é 'unsigned int' que é um inteiro não sinalizado. Já o '64' é de '64 bits' mesmo.

Essa função trabalha percorrendo cada caractere da string, convertendo de caractere para dígito (`s[pos] - '0'`), verificando se é válido (< 10), e construindo o número final multiplicando por 10 e somando o novo dígito.

Para facilitar iniciantes: se você der `make` no terminal e obtiver erro, copie o comando gcc do erro e adicione o `-lm`. A compilação será concluída.

#### Biblioteca Matemática e Compilação

Para usar funções como pow() para potenciação, precisamos compilar com a flag '-lm':

```bash
gcc programa.c -lm -o programa
```

**Dica importante:** Para facilitar iniciantes, se você der `make` no terminal e obtiver erro, copie o comando gcc do erro e adicione o `-lm`. A compilação será concluída.

Isso linka a biblioteca matemática (math.h) ao programa, permitindo usar funções como:
- `pow(base, expoente)` - Potenciação
- `sqrt(numero)` - Raiz quadrada  
- `sin(angulo)` - Seno
- `cos(angulo)` - Cosseno

### Tarefa 6: Estruturas (Structs) - Números Racionais

#### Introdução às Estruturas

```c
struct rational {
    int num;
    int den;
};
```

Uma estrutura agrupa dados relacionados. Importante: você não está construindo uma estrutura, está declarando para o compilador. Não é um objeto existente na memória, é uma informação pro compilador. Ou seja, você não está pedindo para alocar espaço.

Por isso é errado inicializar na declaração:
```c
struct point {
  int x = 0;  // ERRO!
  int y = 0;  // ERRO!
}
```

Como não alocamos espaço e apenas declaramos os inteiros, essa forma está completamente insensata. Então isso não existe.

#### Uso Correto de Estruturas

Para usar, declare uma variável do tipo struct. Assim você diz pro compilador: preciso alocar espaço para eu colocar algo, mas que seja do tamanho da struct 'point', e vamos chamá-la de 'p':

```c
struct point p;    // CORRETO
```

Isso aloca espaço na memória do tamanho da struct, chamando de 'p'. Agora podemos atribuir valores. A sintaxe para escrever um número em 'x' de struct point é: nome da região de memória onde está alocando a estrutura p1 + '.x' e o valor '= 0'. Perceba que seria impossível fazer isso sem alocarmos um espaço na memória (p1):

```c
struct point p1, p2;
p1.x = 0; p1.y = 0; // Ponto Origem (0,0)
p2.x = 1; p2.y = 1; // Ponto (1,1)
```

#### Diferença Crucial: Structs vs Arrays

É legal deixar bem claro que as structs e os procedimentos não são como arrays. Elas são mais como inteiros e caracteres, ou seja, se usar uma struct como argumento, ela será copiada para o procedimento. Já com o array, ele acaba não sendo passado, e sim o seu endereço de memória, fica como um ponteiro para essa array. Isso acaba deixando esse modo de estrutura extremamente útil.

Em outras palavras: estruturas não são como arrays, que decaem para ponteiros quando passados para procedimentos - apenas o endereço é passado. Structs são copiadas integralmente para procedimentos, como inteiros e caracteres. Estruturas são copiadas para dentro do procedimento, preservando integridade dos dados originais.

#### Facilitando com typedef

**O que é `typedef`?** A palavra `typedef` (type definition) cria um "apelido" para um tipo existente. É como dar um nome mais curto ou mais descritivo para algo e o utilizar como um atalho/alias.

**Sintaxe:** `typedef tipo_original novo_nome;`

**Exemplos simples:**
```c
typedef int Inteiro;           // Agora "Inteiro" é sinônimo de "int"
typedef unsigned long ulong;   // "ulong" é mais curto que "unsigned long"
```

Para evitar repetir 'struct rational', criamos um sinônimo:

```c
typedef struct rational Rational;  // "Rational" agora substitui "struct rational"

Rational mul(Rational r1, Rational r2) {
    Rational ret;
    ret.num = r1.num * r2.num;
    ret.den = r1.den * r2.den;
    return ret;
}
```

#### Aritmética de Frações

Para somar frações com denominadores diferentes, usamos duas técnicas:

**Método do "cruzamento":**
```
1/4 + 1/10 = (1×10 + 1×4)/(4×10) = 14/40 = 7/20
```

**Multiplicação:** numerador × numerador, denominador × denominador
**Divisão:** inverte a segunda fração e multiplica

---

## Parte III: Tópicos Avançados

### Tarefa 7: Conversão de Bases Numéricas

#### Entendendo Sistemas de Numeração

Conversões numéricas são importantes e bem utilizadas na área da computação. Para muitos que iniciam acham ser um "bicho de sete cabeças", mas não chega nem perto disso. Estamos acostumados com a base numérica decimal (0,1,2,3,4,5,6,7,8,9), mas como no mundo tecnológico os dispositivos eletrônicos tendem a trabalhar em baixo nível com a base numérica binária (0 ou 1), veremos ela primeiro por ser mais fácil de explicar, até porque tem sua importância devido aos números binários serem facilmente representados na eletrônica através de pulsos elétricos.

Resumidamente, a base numérica representa a quantidade de 'símbolos' possíveis para representar um determinado número. Ou seja, decimal seria um padrão de dez números, logo o que vier depois será representado pelos números anteriores. Se decimal vai de 0 a 9, todos os números depois disso serão representados de uma junção de números que vão de 0 a 9, como o próprio 10 que é o '1' e o '0'.

Agora, porque nessa ordem? É como se voltássemos para utilizar os números de trás para continuar, não dá para voltar pelo 0 se não iria somente repetir tudo e não continuar, então precisamos partir do 1 para começar e formar o 10 até 19 e depois já partir pro 2 e formar o 20.

#### Conceito de Base Numérica

A base representa a quantidade de símbolos possíveis. Decimal usa dez símbolos (0-9), então números maiores são representações combinadas desses símbolos.

| Base | Símbolos |
|------|----------|
| Decimal | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Binário | 0, 1 |
| Octal | 0, 1, 2, 3, 4, 5, 6, 7 |
| Hexadecimal | 0-9, A, B, C, D, E, F |

Quando chegamos ao último símbolo de uma base, incrementamos o dígito da esquerda. Em octal: 7 → 10, 17 → 20. Em binário: 0, 1, 10, 11, 100, 101...

#### Conversão de Decimal para Outras Bases

A conversão usa divisões consecutivas pela base desejada até não ser mais divisível. Pegamos o resultado da última divisão junto com os restos (do último ao primeiro).

**Exemplo: 34 para binário:**
```
34/2 = 17 (resto 0)
17/2 = 8  (resto 1)
8/2  = 4  (resto 0)
4/2  = 2  (resto 0)
2/2  = 1* (resto 0)

Resultado: 1 + restos invertidos = 100010
```

#### Conversão para Decimal

Para converter qualquer base para decimal, multiplicamos cada dígito pela base elevada à sua posição (começando de 0 pela direita):

**Exemplo: 3000321 (base 4) para decimal:**
```
3×(4⁶) + 0×(4⁵) + 0×(4⁴) + 0×(4³) + 3×(4²) + 2×(4¹) + 1×(4⁰)
= 3×4096 + 0 + 0 + 0 + 3×16 + 2×4 + 1×1
= 12288 + 0 + 0 + 0 + 48 + 8 + 1 = 12345
```

#### Observações sobre Eficiência

Bases que são potências uma da outra facilitam conversões. Por exemplo:
- 4² = 16 (conversão base 4 ↔ 16 é mais eficiente)
- 2⁴ = 16 (conversão base 2 ↔ 16 é mais eficiente)

### Tarefa 8: Arrays de Estruturas - Keywords Counter

#### Contando Palavras-Chave

Este programa conta ocorrências de palavras-chave da linguagem C, demonstrando uso prático de arrays de estruturas.

```c
struct key {
  char *word; 
  int count;
};

struct key table[] = {
  {"break", 0}, {"case", 0}, {"char", 0}, {"for", 0},
  {"const", 0}, {"int", 0}, {"continue", 0}, {"default", 0},
  {"unsigned", 0}, {"void", 0}, {"volatile", 0}, {"while", 0}
};

#define NKEYS ((sizeof table) / (sizeof table[0]) )
```

**Entendendo o truque com `sizeof`:**

O operador `sizeof` retorna o tamanho em bytes de uma variável ou tipo. O truque `sizeof table / sizeof table[0]` calcula quantos elementos há no array:
- `sizeof table` = tamanho total do array em bytes
- `sizeof table[0]` = tamanho de um elemento
- Divisão = número de elementos!

Isso é útil porque se adicionarmos mais keywords, o NKEYS se ajusta automaticamente.

#### Funcionalidade Principal

**Funções importantes usadas:**
- **`isalpha(c)`**: Verifica se `c` é uma letra (A-Z ou a-z). Retorna verdadeiro ou falso.
- **`strcmp(s1, s2)`**: Compara duas strings. Retorna 0 se forem iguais, negativo se s1 < s2, positivo se s1 > s2.

O programa lê palavras, verifica se são alfabéticas e se estão na tabela de keywords:

```c
int main(int argc, char *argv[]) {
  int n; char word[MAXWORD];

  while (getword(word, MAXWORD) != EOF)
    if (isalpha(word[0]))
      if ((n = lookup(word, table)) >= 0)
        table[n].count++;
  
  for (n = 0; n < NKEYS; n++) 
    if (argc == 1)
      printf("%4d %s\n",table[n].count, table[n].word);

  return 0;
}
```

A função lookup usa strcmp para comparar strings e retornar o índice se encontrada.

### Tarefa 9: Manipulação de Arquivos - Formatação de Eventos

#### Leitura Inteligente de Arquivos

Este programa lê arquivos de eventos com datas, formatando elegantemente a saída. Demonstra técnicas avançadas de manipulação de arquivos e o uso de funções importantes da biblioteca stdio.

#### Técnicas Importantes

**Glossário de funções usadas nesta tarefa:**

| Função | O que faz |
|--------|----------|
| `fgets(str, n, arquivo)` | Lê uma linha do arquivo (até n-1 caracteres) |
| `memset(ptr, valor, n)` | Preenche n bytes de memória com o valor |
| `sscanf(str, formato, ...)` | Lê dados formatados de uma string (como scanf, mas de string) |
| `snprintf(str, n, formato, ...)` | Escreve formatado em string (como printf, mas em string) |
| `strlen(str)` | Retorna o tamanho da string |

**memset() para limpeza:**
```c
char event[MAXLINE]; 
memset(event, '\0', sizeof event);
```

O que acontece se removermos as chamadas a memset()? O memset() garante que o array esteja completamente limpo antes de cada uso, prevenindo lixo de memória de operações anteriores.

**sscanf() com regex para parsing:**
```c
r = sscanf(buff, "%d/%d/%d %[^\n]", &d, &m, &y, event);
```

Por que não usamos scanf() sem fgets() se scanf() é capaz de ler diretamente? O fgets() nos dá controle total sobre a linha, permitindo validação antes do parsing com sscanf().

**snprintf() para formatação segura:**
```c
snprintf(date, sizeof date, "Dia %d de %s de %d", d, month(m), y);
```

**Formatação condicional com operador ternário:**
```c
printf("%-30s --> %-.30s%s\n", date, event, 
       strlen(event) > 30 ? "..." : "");
```

**O operador ternário `? :`** é um "if compacto":
```c
condição ? valor_se_verdadeiro : valor_se_falso
```

No exemplo: se `strlen(event) > 30` for verdadeiro, usa "...", senão usa "" (vazio). É útil para expressões curtas inline.

#### Diferença Fundamental: System Calls vs Library Functions

Entrada e saída **não** é parte da linguagem C porque entrada e saída requer serviços do sistema operacional, como procedimentos como read() e write(), que são chamados de system calls. O que a biblioteca padrão faz é minimizar as dependências do sistema, o que ajuda o escritor da biblioteca padrão, tornando a biblioteca mais portável.

#### Estrutura do Programa

O programa funciona assim:
1. Abre arquivo de eventos
2. Lê linha por linha
3. Extrai data e descrição usando sscanf
4. Formata data por extenso
5. Exibe resultado formatado

**Exemplo de saída:**
```
Dia 1 de janeiro de 1970       --> The UNIX Epoch.
Dia 25 de dezembro de 2021     --> Natal
```

### Tarefa 10: System Calls vs Library Functions - Fork e Processos

#### Diferença Fundamental

Um procedimento C é diferente de um procedimento que invoca o sistema operacional. System calls usam instruções específicas do hardware e não são portáveis. A linguagem C mantém portabilidade evitando detalhes íntimos do hardware.

#### Criação de Processos

**Glossário de tipos e funções de processos:**

| Elemento | Significado |
|----------|------------|
| `pid_t` | Tipo especial para guardar IDs de processo (basicamente um inteiro) |
| `fork()` | Cria uma cópia do processo atual ("clona" o programa) |
| `getpid()` | Retorna o ID do processo atual |
| `perror(msg)` | Imprime mensagem de erro do sistema (quando algo dá errado) |
| `exit(n)` | Encerra o programa imediatamente com código n |

```c
#include <stdio.h>
#include <sys/types.h>   // Define pid_t
#include <unistd.h>      // Define fork(), getpid()

int main(void){
  pid_t pid = fork();    // Aqui o programa se "divide em dois"!

  if (pid == -1) {
    printf("Erro no fork!\n");
    return 1;
  }

  if (pid > 0) {
    printf("Processo pai - ID: %d\n", getpid());
  } else {
    printf("Processo filho - ID: %d\n", getpid());
  }
  
  return 0;
}
```

**fork()** cria uma cópia exata do processo:
- Processo pai recebe PID do filho (> 0)
- Processo filho recebe 0
- Erro retorna -1

#### System Calls vs Biblioteca

**System Calls** são chamadas diretas ao kernel:
- fork(), exec(), wait()
- open(), read(), write(), close()
- Dependem do sistema operacional

**Funções de Biblioteca** são portáveis:
- printf(), scanf(), malloc()
- fopen(), fread(), fwrite()
- Funcionam em qualquer sistema com biblioteca C

### Tarefa 11: Unions - Compartilhamento de Memória

#### Union vs Struct

Unions permitem diferentes tipos compartilharem o mesmo espaço de memória:

```c
struct labA {
  short int x;      // 2 bytes
  unsigned char z;  // 1 byte
} n;                // Total: 3 bytes

union labB {
  short int x;      // 2 bytes  
  unsigned char z;  // 1 byte
} m;                // Total: 2 bytes (compartilhado)
```

#### Comportamento Importante

```c
m.x = 5;    // Escreve 5 na memória
m.z = 'a';  // Sobrescreve com 97 (ASCII de 'a')
// Agora ambos m.x e m.z retornam 97!
```

Unions economizam espaço mas apenas um membro é válido por vez.

#### Casos de Uso Prático

**Interpretação de dados:**
```c
union data {
  int as_int;
  float as_float;
  char bytes[4];
};

union data valor;
valor.as_int = 42;
printf("Como int: %d\n", valor.as_int);
printf("Como float: %f\n", valor.as_float);
printf("Como bytes: %d %d %d %d\n", 
       valor.bytes[0], valor.bytes[1], 
       valor.bytes[2], valor.bytes[3]);
```

### Tarefa 12: UNIX Pipes - Comunicação Entre Processos

#### Filosofia Unix: "Do One Thing and Do It Well"

Doug McIlroy, um dos criadores dos UNIX pipes, defendia a filosofia de que cada programa deve "fazer uma coisa e fazê-la bem". Quando dizemos a nosso shell:

```bash
cat shell.c | less
```

Estamos vendo essa filosofia em ação:
- `cat` faz uma coisa: escrever arquivos na saída padrão
- `less` faz uma coisa: criar um paginador lendo da entrada padrão
- O pipe `|` conecta essas ferramentas simples para realizar uma tarefa complexa

Isso demonstra como ferramentas simples e focadas podem ser combinadas de formas poderosas.

#### Implementação de Pipeline

Este programa implementa comunicação entre pai e filho usando pipes. Os comentários no código original explicam cada passo:

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main(int argc, char *argv[]) {
  int pfd[2]; int r; // file descriptor
  
  // declarando e definindo inteiros; chamando pipe, fork e configurando erros
  r = pipe(pfd); if (r < 0) { perror("pipe"); exit(1); } 
  r = fork(); if (r < 0) { perror("fork"); exit(2); }

  if (r == 0) {
    // Processo filho
    close(pfd[1]); // sessão filho fechando a escrita
    r = dup2(pfd[0], STDIN_FILENO); if (r < 0) { perror("filho dup2"); exit(3); } // recebendo a leitura e configurando erro
    close(pfd[0]); // fechando o canal, não lerá mais nada vindo do pipe
    execl("/usr/bin/less","less",NULL); // filtrando a saida recebida com less
  }
  
  // Processo pai
  close(pfd[0]); // sessão pai fechando a leitura de informações vindas do pipe para apenas escrever
  r = dup2(pfd[1], STDOUT_FILENO); if (r < 0) { perror("pai dup2"); exit(4); } // escrevendo e configurando erro
  close(pfd[1]); // fechando a conexão de escrita com o pipe
  // Se deletarmos não conseguimos fechar o less no terminal, já que continuará aberto para enviar mais informações pro less, que ficará esperando
  
  for (int c = 0; c < 100; ++c) // apenas um loop para escrever linhas
    printf("Eis a linha %d\n", c);
  
  // Quando terminar de escrever, fechar a saida padrão - para não ter mais ninguém escrevendo pro pipe
  fclose(stdout); // Se tirar esse: o less vai ficar aguardando este fechar, e este aguardará o fim do less, portanto ficará com a tela vazia. Ou seja, o less nem chega a imprimir nada na tela.
  
  wait(NULL); // wait para fazer a sessão pai esperar a sessão filho, ou seja, não fazê-los trabalhar paralelamente
  // Se não tiver esse wait aqui, o less perderia acesso ao terminal por não ter um pai esperando por ele. Se o pai morre o filho fica em segundo plano e perde acesso ao terminal
  
  return 0;
}
```

**Pontos cruciais explicados no código original:**

1. **close(pfd[1])** no processo pai é essencial - sem isso o `less` nunca termina porque o pipe permanece aberto para escrita
2. **fclose(stdout)** sinaliza fim de dados - sem isso o `less` fica esperando mais dados eternamente  
3. **wait(NULL)** é necessário para o pai esperar o filho - sem isso o filho perde acesso ao terminal

Isso cria uma pipeline equivalente a `./programa | less`.

#### Conceitos de Pipes

**Glossário de funções de pipes:**

| Função/Constante | O que faz |
|-----------------|----------|
| `pipe(fd)` | Cria um "tubo" de comunicação. fd[0] = ponta de leitura, fd[1] = ponta de escrita |
| `dup2(origem, destino)` | Faz o `destino` apontar para onde `origem` aponta (redireciona) |
| `execl(prog, arg0, ..., NULL)` | Substitui o programa atual por outro (ex: executa "less") |
| `wait(NULL)` | Espera um processo filho terminar |
| `STDIN_FILENO` | Constante = 0, representa a entrada padrão |
| `STDOUT_FILENO` | Constante = 1, representa a saída padrão |

**Pipe** é um canal de comunicação unidirecional entre processos:
- `pipe(fd)` cria dois descritores: fd[0] para leitura, fd[1] para escrita
- `dup2()` redireciona entrada/saída padrão
- `fork()` cria processo filho que herda descritores
- `exec()` substitui imagem do processo mantendo descritores

#### Contexto Histórico

A ideia de "UNIX pipes" vem da programação funcional, na verdade. Em 1965, Peter Landin inventa os "streams" em "A Correspondence Between ALGOL 60 and Church's Lambda-Notation: Part I".

Como Peter Landin comentou, a ideia é que "os itens de um stream intermediário nunca precisam existir simultaneamente. Então streams podem ter vantagens práticas quando uma lista é submetida a uma cascata de processos de edição".

### Operadores Bit a Bit - Dominando Bits

#### Os Operadores Fundamentais

Para completar o domínio da linguagem C, precisamos entender os operadores bit a bit:

| Operador | Nome | Função | Exemplo |
|----------|------|--------|---------|
| `&` | AND | 1 se ambos forem 1 | `5 & 3 = 1` |
| `\|` | OR | 1 se pelo menos um for 1 | `5 \| 3 = 7` |
| `^` | XOR | 1 se diferentes | `5 ^ 3 = 6` |
| `~` | NOT | Inverte todos os bits | `~5 = -6` |
| `<<` | Shift esquerda | Desloca à esquerda | `5 << 1 = 10` |
| `>>` | Shift direita | Desloca à direita | `5 >> 1 = 2` |

#### Tabelas de Verdade

**AND (&):**
```
0 & 0 = 0
0 & 1 = 0  
1 & 0 = 0
1 & 1 = 1
```

**OR (|):**
```
0 | 0 = 0
0 | 1 = 1
1 | 0 = 1  
1 | 1 = 1
```

**XOR (^):**
```
0 ^ 0 = 0
0 ^ 1 = 1
1 ^ 0 = 1
1 ^ 1 = 0
```

#### Exemplos Visuais

Usando 5 (101₂) e 3 (011₂):

```
AND:  101 & 011 = 001 = 1
OR:   101 | 011 = 111 = 7  
XOR:  101 ^ 011 = 110 = 6
```

#### Aplicações Práticas

**Verificar se número é par:**
```c
if ((num & 1) == 0) printf("Par");
```

**Multiplicar/dividir por potências de 2:**
```c
resultado = num << 3; // num * 8
resultado = num >> 2; // num / 4
```

**Extrair componentes RGB:**
```c
unsigned int cor = 0xFF5733;
int vermelho = (cor >> 16) & 0xFF;
int verde = (cor >> 8) & 0xFF;
int azul = cor & 0xFF;
```

**Máscaras de bits:**
```c
int valor = 0b11010110;
int mascara = 0b00001111;
int resultado = valor & mascara; // Isola 4 bits inferiores
```

**Trocar valores sem variável temporária:**
```c
a = a ^ b;
b = a ^ b;
a = a ^ b;
```

**Verificar se potência de 2:**
```c
if ((n & (n-1)) == 0) printf("É potência de 2");
```

#### Otimizações Com Bits

**Contagem de bits ligados:**
```c
int count_bits(int n) {
  int count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}
```

**Inverter bits em inteiro:**
```c
int reverse_bits(int n) {
  int result = 0;
  for (int i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);
    n >>= 1;
  }
  return result;
}
```

---

## Conclusão

Esta jornada pela programação C cobriu desde conceitos fundamentais até tópicos avançados de programação de sistema. Começamos com a configuração do ambiente de desenvolvimento e chegamos à manipulação direta de bits, passando por:

### O Que Aprendemos

**Ambiente e Ferramentas:**
- Configuração MSYS2/MinGW para Windows
- Uso do GCC com flags apropriadas
- Automação com Make e Makefiles
- Comandos shell essenciais

**Fundamentos:**
- Arrays e manipulação de dados
- Strings e tratamento de texto
- Funções e modularização
- Controle de fluxo e estruturas

**Estruturas Intermediárias:**
- Pilhas e estruturas de dados
- Ponteiros e referências de memória  
- Structs e organização de dados
- Argumentos de linha de comando

**Tópicos Avançados:**
- Conversão de bases numéricas
- Manipulação avançada de arquivos
- System calls e programação de sistema
- Unions e otimização de memória
- Comunicação entre processos
- Operações bit a bit

### Filosofia de Aprendizado

A abordagem didática com analogias (como as "batatinhas Pringles" para pilhas) e exemplos práticos torna conceitos complexos mais acessíveis. A progressão natural do básico ao avançado, sempre com códigos funcionais, proporciona uma base sólida para qualquer programador.

### Próximos Passos

Com este guia completo, você tem:
- **Referência técnica** para consultas rápidas
- **Exemplos práticos** para adaptar em projetos
- **Base sólida** para explorar tópicos mais avançados
- **Entendimento profundo** dos fundamentos

### Recursos Adicionais

**Para continuar aprendendo:**
- Manual do GCC: `man gcc`
- Manual do Make: `man make`  
- Documentação POSIX para system calls
- K&R C Programming Language (livro referência)

### Dicas Finais

1. **Pratique regularmente** - A programação se aprende fazendo
2. **Compile com warnings** - Use sempre `-Wall`
3. **Use ferramentas de debug** - gdb é seu amigo
4. **Leia código de outros** - Projetos open source são ótimas referências
5. **Documente seu código** - Comentários claros economizam tempo futuro

Como sempre dizíamos: "tamo junto" nesta jornada de aprendizado. Agora você tem uma referência completa da linguagem C, desde o ambiente de desenvolvimento até a manipulação direta de bits na memória.

A programação é uma jornada contínua de descoberta e aperfeiçoamento. Este guia fornece a base sólida necessária para explorar territórios ainda mais avançados da computação.

**Bons códigos e continue sempre aprendendo!** 🚀

---

*"Foi um prazer ler e foi um prazer passar este semestre com você."*

**Referências e Agradecimentos:**
- Brian Kernighan e Dennis Ritchie - The C Programming Language
- Professor e colegas da UFRJ - CMT1-CMT012-14733
- Comunidade Unix/Linux - Pela cultura de ferramentas e filosofia
- Jan Lukasiewicz - Pela notação polonesa

- Doug McIlroy e Ken Thompson - Pelos UNIX pipes



