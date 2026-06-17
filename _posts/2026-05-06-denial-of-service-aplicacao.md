---
title: "Denial of Service em nível de aplicação (com responsabilidade)"
description: "Como provar vetores de DoS de aplicação — ReDoS, zip bomb, GraphQL aninhado, falta de paginação e rate limit — sem derrubar produção, com PoC controlada e defesa em camadas."
author: matheus
date: 2026-05-06 16:32:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["denial of service", "DoS", "ReDoS", "regex", "GraphQL", "rate limiting", "zip bomb", "resource exhaustion", "OWASP", "bug bounty", "web security"]
image: /assets/img/covers/denial-of-service-aplicacao.png
pin: false
comments: true
---

## A falha que você não pode "provar até o fim"

A maioria das vulnerabilidades que a gente caça em bug bounty é segura de demonstrar: você troca um `id`, lê a fatura de outro (já vimos isso no post [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/)), tira o print e reporta. Ninguém fica sem serviço.

**Denial of Service (DoS) é diferente.** Aqui a "prova completa" seria justamente o que você **nunca** pode fazer: deixar a aplicação fora do ar para usuários reais. Se você de fato derrubar produção, parou de ser pesquisador e virou um incidente: fora do escopo, possivelmente ilegal, e um ótimo jeito de ser banido do programa.

> **Analogia:** testar DoS é como ser o engenheiro que avalia se uma ponte aguenta peso. Você **não** dirige 50 caminhões em cima para ver se ela cai. Você calcula a carga, faz um teste pontual e controlado num trecho, e mostra com evidência que **se** alguém colocar peso demais, ela cede. A conclusão é a mesma ("a ponte é frágil"), só que ninguém morre no processo.

Então a regra deste post é: **demonstrar o vetor, não consumar o ataque.** A gente vai aprender a identificar onde a aplicação é frágil, medir o sinal (tempo de resposta, consumo) com **uma** requisição controlada, e calcular/argumentar o impacto, sem nunca tentar de verdade tirar o serviço do ar. Esse é o DoS que paga e que não te coloca em apuros.

Vamos focar em **DoS de aplicação** (camada 7 do OSI, a camada "de aplicação" do modelo de rede, onde vivem HTTP e as funcionalidades, em oposição às camadas baixas de rede/banda), não no DoS volumétrico de rede (inundar a banda com tráfego). A diferença é importante: o volumétrico exige uma botnet e quase sempre está **fora de escopo**; o de aplicação explora uma **fraqueza lógica** (uma regex mal escrita, uma query sem limite, um upload sem teto) onde **uma única requisição barata** força o servidor a gastar recursos caros. É aí que mora o bug interessante.

## O que é DoS de aplicação?

DoS é tornar um recurso **indisponível** para quem tem direito a ele. Na camada de aplicação, segundo a [OWASP](https://owasp.org/www-community/attacks/Denial_of_Service), isso normalmente acontece **esgotando recursos do servidor** (CPU, memória, disco, conexões, threads) ou abusando de uma funcionalidade até ela travar, **sem precisar consumir a banda de rede**. São os ataques mais difíceis de identificar e mitigar exatamente porque parecem tráfego legítimo.

A ideia-chave que você precisa internalizar é a de **assimetria de custo** (também chamada de **amplificação**):

> Um ataque de DoS de aplicação é eficaz quando o **custo para o atacante** de enviar uma requisição é **muito menor** que o **custo para o servidor** de processá-la.

Se eu mando 40 bytes de payload (o conteúdo que vai no corpo da requisição) e o servidor gasta 30 segundos de CPU a 100%, eu tenho uma alavanca brutal. Não preciso de botnet. Preciso de poucas requisições dessas em paralelo para travar o processo. Toda técnica deste post é uma variação dessa mesma ideia: **achar a alavanca**.

| Conceito | Significado |
|---|---|
| **Vetor** | O ponto fraco (regex, query, upload, endpoint caro) |
| **Amplificação** | Quanto o servidor gasta por unidade de esforço seu |
| **Exhaustion** | O recurso que estoura (CPU, RAM, disco, conexões, threads) |
| **PoC controlada** | A demonstração que prova o vetor **sem** derrubar nada |

## Por que isso importa (e quanto paga)

DoS costuma pagar **menos** que um RCE ou um IDOR de PII (dados pessoais identificáveis: nome, CPF, e-mail), mas paga, e em muitos programas é aceito quando está no escopo. Em casos reais, falhas de **rate limiting** (a porta de entrada do DoS de aplicação) renderam de **bônus de ~US$100** até **US$700**, e em programas BR um *account lockout* abusável saiu por algumas centenas de reais. Faixas honestas: de **R$250** (um rate limit ausente, baixo impacto) até **alguns milhares** quando o vetor é caro (ReDoS travando o worker, GraphQL multiplicando milhões de queries).

O que move o valor é o **impacto demonstrável e a assimetria**:

- **Indisponibilidade do serviço:** usuários legítimos não conseguem usar a aplicação.
- **Account lockout em massa:** um atacante derruba o *login* de qualquer pessoa só errando a senha 3 vezes (DoS direcionado a contas, sem precisar derrubar a infra inteira).
- **Esgotamento de recurso caro:** um worker preso 30s numa regex deixa de atender todo mundo na fila.
- **Custo financeiro:** em arquitetura serverless/auto-scaling, "DoS" pode virar **DoW (Denial of Wallet)**: você não derruba, você faz a conta da cloud explodir.

> 📊 **Como o DoS pontua (CVSS).** O DoS é a classe mais "limpa" de pontuar: o impacto é só em **disponibilidade** (`A:H` no v3.1, `VA:H` no v4.0). Confidencialidade e integridade ficam em `N`. O que move o número é uma coisa só: **precisa de login?**
>
> | Cenário | CVSS v3.1 | CVSS v4.0 |
> |---|---|---|
> | **Não autenticado** (qualquer um derruba a app) | `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` → **7.5 (Alto)** | `AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N` → **8.7 (Alto)** |
> | **Autenticado** (precisa de uma conta válida) | `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H` → **6.5 (Médio)** | `AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N` → **Alto** (rode na calculadora) |
>
> O `8.7` do v4.0 não autenticado é o valor que a própria [FIRST cita como exemplo de DoS de rede não autenticado](https://www.first.org/cvss/faq): repare que o v4.0 pontua **mais alto** que o v3.1 (7.5) para o mesmo DoS, porque na nova fórmula a disponibilidade pesa mais. Os decimais do v3.1 saem da [calculadora oficial](https://www.first.org/cvss/calculator/3.1); para o decimal exato do v4.0 autenticado, rode o vetor na [calculadora v4.0](https://www.first.org/cvss/calculator/4.0) (a escala não é linear e o valor cai uma faixa em relação ao não autenticado, mas continua em **Alto**). Não cole número de fórmula: ajuste conforme **o que você provou**, e lembre que o DoS frequentemente está **fora de escopo** (mais abaixo). Calibrar isso bem: [Severidade, Impacto e Triagem](/posts/severidade-impacto-triagem/).

> ⚠️ **DoS é a classe mais sensível ao escopo.** Muitos programas escrevem, com todas as letras, *"DoS/DDoS testing is prohibited"*. Quando proibido, **não teste o impacto**: no máximo reporte a **ausência de controle** (ex.: "endpoint X aceita upload sem limite de tamanho") como observação teórica, sem provocar a queda. Ler as regras é parte do trabalho. Quando os triagers questionam o impacto de um rate limit, o caminho é: confirmar que **não está fora de escopo**, argumentar o impacto em detalhe e **linkar reports públicos** da mesma classe já pagos como precedente.

## Como funciona por trás

Toda aplicação tem recursos finitos. Um servidor web roda com um número limitado de **workers/threads**; cada um tem um teto de **CPU** e **memória**; o disco tem espaço; o pool de conexões tem tamanho. DoS de aplicação é **fazer um desses recursos chegar a zero** mais rápido do que o servidor consegue liberar.

Pense no fluxo normal: a requisição chega, um worker pega, processa rápido (milissegundos), responde e fica livre para o próximo. Agora imagine que **uma** requisição prende o worker por 30 segundos:

```
Worker livre → recebe req cara → ocupado 30s → ... fila enchendo ...
                                              ↑ usuários legítimos esperando
```

Com poucos workers e algumas requisições caras em paralelo, **todos os workers ficam ocupados ao mesmo tempo** e a aplicação para de responder a quem chega depois. Você não "quebrou" nada, só ocupou todos os caixas do banco com clientes que demoram uma eternidade. Esse é o coração do DoS de aplicação.

## Tipos e variações

Vamos cobrir os vetores de aplicação mais cobrados em bug bounty. Cada um é uma forma diferente de criar **assimetria de custo**.

1. **ReDoS (Regular expression DoS):** uma regex mal escrita entra em *backtracking* catastrófico e gasta CPU exponencial num input pequeno.
2. **Resource exhaustion por upload/descompressão:** upload sem limite de tamanho, ou **zip bomb** (arquivo minúsculo que descomprime para gigabytes).
3. **GraphQL, query aninhada/profunda e batching:** uma query recursiva ou um lote de queries num único POST multiplica o trabalho do backend.
4. **Falta de paginação/limite:** endpoint que devolve "todos os registros" sem teto; peça `first: 99999999` e veja o servidor sofrer.
5. **Falta de rate limit em endpoint caro:** sem teto de requisições em rotas que custam (envio de e-mail/SMS, geração de PDF, busca pesada, *login*).
6. **Amplificação lógica:** abusar de uma regra de negócio para gerar trabalho desproporcional (ex.: um *trigger* que dispara N e-mails, ou um *account lockout* abusável).

## Recon — como encontrar

DoS de aplicação se acha **mapeando onde o servidor faz trabalho caro a partir de input seu**. Onde olhar:

- **Campos validados por regex:** e-mail, telefone, CPF, URL, senha (políticas complexas). Se a validação trava em input estranho, cheira a ReDoS.
- **Uploads e importações:** qualquer "envie um arquivo": avatar, planilha, ZIP, importação de vendas/contatos. Procure ausência de limite de tamanho e de tipo.
- **Endpoints de listagem:** `?limit=`, `?per_page=`, `first:`, `size=`. Teste valores absurdos.
- **GraphQL.** Se existe `/graphql`, teste introspection (consulta especial que faz o servidor revelar todo o schema/tipos da API) e veja relações que permitem aninhamento cíclico (`post → author → posts → author → ...`).
- **Ações caras e disparáveis:** `login`, reset de senha, reenvio de OTP/SMS, geração de relatório/PDF, exportação. São candidatos a **rate limit ausente**.

Ferramentas que ajudam (as básicas estão no post [Recon & Discovery](/posts/recon-discovery/)):

```bash
# Descobrir endpoints/params caros vazados no JS (gau = pega URLs do Wayback/etc;
# httpx = sonda quais respondem) — leia cada path procurando upload/search/export
echo alvo.com | gau | grep -Ei 'upload|import|export|search|graphql|report' | httpx -mc 200
```

```bash
# Achar um endpoint GraphQL (e se introspection está ligada)
echo alvo.com | httpx -path /graphql -mc 200 -title
```

> 💡 **Regra de ouro do recon de DoS:** procure o ponto onde **input pequeno = trabalho grande**. Anote o **tempo-base** (latência normal do endpoint) ANTES de testar: é a sua linha de referência para medir o sinal depois. Sem linha-base, você não tem prova.

## Exploração passo a passo (do básico ao avançado, e sempre controlada)

A regra que vale para **todos** os níveis: meça com **uma** requisição, compare com a linha-base, **pare** assim que tiver o sinal. Você está coletando evidência de fragilidade, não tirando o serviço do ar.

### Nível 1 — Rate limit ausente em endpoint caro (a porta de entrada)

O teste mais simples e o mais cobrado. Pegue uma ação que custa (envio de OTP, *login*, busca) e verifique se há teto de requisições. No **Burp Repeater**, mande a mesma request um punhado de vezes e observe: ela **continua** respondendo `200`, sem `429 Too Many Requests`, sem CAPTCHA, sem atraso progressivo?

```http
POST /api/v1/otp/send HTTP/2
Host: alvo.com
Content-Type: application/json

{"phone":"+5511999999999"}      # <- reenviar N vezes: cada uma dispara um SMS (custa $)
```

Para **evidenciar** sem abusar, use o **Burp Intruder** com um número **pequeno e controlado** de requisições (ex.: 20–30, *Null payloads*), só para mostrar que **nada** barra. Você não precisa de 10.000. Precisa provar que o controle **não existe**. Se quiser controlar a taxa fora do Burp, o `ffuf` aceita a flag `-t` para limitar threads (o default manda muita requisição por segundo):

```bash
# -t 5 = só 5 threads; teste controlado, não enxurrada
ffuf -w nums.txt -t 5 -u https://alvo.com/api/v1/otp/send -X POST -mc all
```

### Nível 2 — Account lockout abusável (DoS direcionado)

Variação clássica de amplificação lógica. Se o sistema **bloqueia a conta** após 3 senhas erradas e **não** tem rate limit por origem, qualquer pessoa que saiba o seu *login* consegue **te trancar para fora** repetidamente: um DoS direcionado, sem derrubar a infra.

```http
POST /auth/login HTTP/2
Host: alvo.com
Content-Type: application/json

{"username":"vitima_alvo","password":"errada"}   # <- 3x e a conta de OUTRA pessoa tranca
```

Para demonstrar com responsabilidade: use **uma conta de teste sua** como "vítima", erre a senha o número de vezes da política e mostre a resposta de bloqueio. Você prova o vetor na sua própria conta, nunca na de um usuário real.

### Nível 3 — ReDoS (regex catastrófica)

Aqui está a alavanca de CPU mais elegante. Algumas regex, com certos inputs, entram em **backtracking catastrófico**: o número de caminhos que o motor tenta cresce **exponencialmente** com o tamanho do input. Um input de 30 caracteres pode levar **segundos ou minutos**.

Por que acontece? Motores de regex tradicionais (PCRE, o de JS, Java, Python) usam *backtracking*: quando o casamento falha, o motor **volta** a posições anteriores e tenta outro caminho, repetindo isso até esgotar todas as possibilidades. Uma **"evil regex"** tem **repetição agrupada com sobreposição**: quantificador dentro de quantificador onde as alternativas se sobrepõem. A [OWASP](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS) lista quatro padrões clássicos:

| Evil regex | Por que é vulnerável |
|---|---|
| `(a+)+$` | `a+` dentro de `(...)+` — o motor pode dividir os `a` de incontáveis formas |
| `([a-zA-Z]+)*$` | repetição de repetição |
| `(a\|aa)+$` | alternância **sobreposta** (`aa` também casa como `a`+`a`) |
| `(a\|a?)+$` | alternância sobreposta com opcional |

Todos explodem com um input como `aaaaaaaaaaaaaaaaaaaaaaaa!`: uma sequência longa de `a` que **quase** casa, seguida de um caractere (`!`) que força a **falha** e dispara o backtracking de todos os caminhos possíveis.

**Como testar com responsabilidade:** você **não** precisa derrubar o servidor. Reproduza a regex localmente (ou peça-a no JS do front, onde validações às vezes vivem) e meça o tempo de CPU **na sua própria máquina**:

```javascript
// PoC LOCAL — meça na SUA máquina, jamais mande o input ao servidor de produção
const evil = /^(a+)+$/;
const input = "a".repeat(30) + "!";   // 30 'a' + '!' já trava por segundos
console.time("redos");
evil.test(input);                      // <- aqui o motor entra em backtracking catastrófico
console.timeEnd("redos");              // tempo cresce ~exponencialmente com o tamanho
```

No alvo, a prova **controlada** é mandar **uma** requisição com um input moderado (ex.: 25–35 caracteres no padrão acima) no campo validado pela regex e medir a **latência** contra a linha-base. Se a resposta de 50ms vira 8s com **um** caractere a mais no input, você demonstrou o vetor sem precisar de paralelismo nem de derrubar nada. **Pare aí** e calcule o impacto no report ("input de N chars → ~Xs de CPU; basta um punhado em paralelo para saturar os workers").

### Nível 4 — Resource exhaustion: upload gigante e zip bomb

Dois sabores. O primeiro é **upload sem limite de tamanho**: se o endpoint aceita um arquivo de qualquer tamanho e o carrega **inteiro na memória** para processar, um arquivo grande estoura a RAM do worker. O segundo, mais sofisticado, é a **zip bomb**: um arquivo `.zip` **minúsculo** (kilobytes) que **descomprime** para gigabytes ou terabytes, esgotando RAM/disco durante a extração.

A zip bomb funciona porque a descompressão é assimétrica por natureza: o famoso `42.zip` tem 42 KB e descomprime para **4.5 petabytes** (razão de ~107 bilhões para 1, via aninhamento de várias camadas de ZIP), e variantes modernas em camada única chegam a razões de milhões-para-um sobrepondo entradas de arquivo. O servidor recebe poucos bytes e tenta materializar gigabytes ou mais.

**Demonstração responsável:** o ponto que você reporta é a **ausência de validação**, não a queda. Mostre que o endpoint **aceita** um arquivo acima do que deveria, ou que **não checa a razão de compressão**. Você pode evidenciar com um arquivo grande **mas controlado** (ex.: alguns MB acima do limite esperado) e a resposta `200`/aceitação, sem precisar enviar uma bomba real que materialize gigabytes em produção.

```http
POST /api/import/contacts HTTP/2
Host: alvo.com
Content-Type: multipart/form-data; boundary=----x

------x
Content-Disposition: form-data; name="file"; filename="data.zip"
Content-Type: application/zip

<conteúdo do arquivo>            # <- aceita .zip sem checar tamanho/razão de descompressão?
------x--
```

A evidência forte aqui é a **ausência de limite**: nenhum `Content-Length` máximo, nenhuma rejeição por tipo/tamanho, nenhuma mensagem sobre razão de compressão.

### Nível 5 — GraphQL: aninhamento profundo e batching

Se o alvo expõe `/graphql`, dois vetores se destacam. O primeiro é a **query profundamente aninhada**: quando o schema tem relações cíclicas, você pode pedir o mesmo caminho repetidamente, e cada nível **multiplica** o trabalho do resolver (e do banco). A [PortSwigger](https://portswigger.net/web-security/graphql) avisa que "queries muito aninhadas podem ter impacto significativo de performance e potencialmente abrir oportunidade para ataques de DoS se forem aceitas". Na prática, em resolvers que disparam uma consulta ao banco por nível, o número de operações cresce de forma multiplicativa com a profundidade, podendo chegar a milhares ou milhões.

```graphql
# Query aninhada — cada nível multiplica o trabalho do backend (PoC: cheque o tempo, depois PARE)
query {
  post(id: 1) {
    author { posts { author { posts { author { id   # <- ciclo author↔posts se repetindo
    } } } } }
  }
}
```

O segundo é **query batching**: mandar **várias** operações num **único** HTTP POST. Há duas formas: (a) um **array de queries** no corpo, suportado por servidores com batching habilitado (ex.: Apollo Server com `allowBatchedHttpRequests`), e (b) **aliases**, que repetem o mesmo campo com nomes diferentes numa única operação e funcionam em **qualquer** servidor GraphQL. Os dois efeitos são iguais: uma chamada de rede vira N execuções no backend. Ótima assimetria, e também um jeito de **burlar rate limit** que conta por requisição HTTP. A [PortSwigger](https://portswigger.net/web-security/graphql) observa que, "como aliases efetivamente permitem enviar múltiplas queries numa única mensagem HTTP, eles podem burlar" o rate limit por requisição.

(a) **batching por array** (depende de o servidor aceitar), no corpo do POST:

```json
[
  {"query":"query{ expensiveSearch(q:\"a\"){ id } }"},
  {"query":"query{ expensiveSearch(q:\"b\"){ id } }"}
]
```

(b) **batching por aliases** (funciona em qualquer servidor), com N buscas caras numa só request:

```graphql
query {
  a: expensiveSearch(q: "a") { id }
  b: expensiveSearch(q: "b") { id }
}
```

**Responsável:** mande **uma** query com aninhamento **moderado** (poucos níveis) e meça a latência contra a linha-base. Se 3 níveis já dobram o tempo, você extrapola o impacto no report **sem** mandar a query de 30 níveis que realmente derruba.

### Nível 6 — Falta de paginação / limite de quantidade

O primo simples do batching. Endpoints que aceitam `first`, `limit`, `per_page` ou `size` sem teto deixam você pedir o universo inteiro de uma vez: o servidor carrega tudo na memória e serializa um JSON gigante.

```http
GET /api/v1/transactions?per_page=99999999 HTTP/2   # <- sem teto = carrega tudo na RAM
Host: alvo.com
Authorization: Bearer <seu_token>   # Bearer = esquema "portador": o token no header já autentica a request
```

A prova controlada é subir o valor **gradualmente** (100 → 1.000 → 10.000) medindo a latência, e mostrar que **não há limite** imposto pelo servidor, sem precisar chegar no valor que estoura.

## Caso real-fictício: ReDoS no validador de e-mail

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você testa `app.exemplo.com`. No cadastro, o campo de e-mail é validado **no backend** por uma regex. No JS da página (descoberto no recon) você encontra a mesma regex sendo usada no front:

```javascript
// Trecho achado no bundle JS do alvo (validação de e-mail)
const re = /^([a-zA-Z0-9]+)*@alvo\.com$/;   // <- ([a-zA-Z0-9]+)* : repetição de repetição = evil regex
```

**Passo 1, confirmar localmente.** Você reproduz a regex na sua máquina (jamais mandando ao servidor ainda) e mede:

```javascript
const re = /^([a-zA-Z0-9]+)*@alvo\.com$/;
const payload = "a".repeat(30) + "@alvo.co";   // quase casa, mas o '.com' falha → backtracking
console.time("redos"); re.test(payload); console.timeEnd("redos");
// redos: ~7500ms   <- 30 caracteres travam o motor por ~7s nesta máquina (cada +2 'a' ~quadruplica o tempo)
```

**Passo 2, linha-base no alvo.** No Burp Repeater, você submete um e-mail normal e anota o tempo de resposta: **~70ms**.

**Passo 3, uma requisição controlada.** Você envia **uma única** request de cadastro com o input que trava a regex:

```http
POST /api/v1/signup HTTP/2
Host: app.exemplo.com
Content-Type: application/json

{"email":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@alvo.co","password":"Senha123!"}
# <- 30 'a' + dominio que falha o casamento: força backtracking catastrófico no servidor
```

```http
HTTP/2 504 Gateway Timeout
# A resposta de ~70ms virou um timeout de gateway: o worker ficou preso na regex
```

**Passo 4, parar e calcular.** Você **não** repete em paralelo nem tenta derrubar. Uma requisição mostrando que o tempo saltou de 70ms para o timeout do gateway **já prova o vetor**. No report você extrapola: *"com a quantidade de workers do serviço, um punhado dessas requisições em paralelo satura todos os workers e nega o serviço: input de 40 bytes vs. minutos de CPU."*

**O que a tela do Burp mostraria:** painel Request/Response; na Response, o `504`/tempo de resposta drasticamente maior que a linha-base de 70ms, com o input longo destacado no corpo da request.

**Passo 5, report.** Título `[DoS - ReDoS] - Backtracking catastrófico no validador de e-mail do cadastro`. Resumo focado no negócio: *"um input de poucos bytes força o servidor a gastar CPU por segundos/minutos numa regex vulnerável; poucas requisições em paralelo saturam os workers e tornam o cadastro indisponível"*. Passos numerados, a PoC **local** medindo a curva de tempo, e a **uma** requisição controlada no alvo como evidência. Como o cadastro é **anônimo** (sem login), o vetor é `PR:N`: **CVSS v3.1 7.5 (Alto)** (`AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`) · **CVSS v4.0 8.7 (Alto)** (`AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N`). Severidade sempre **conforme o impacto provado e o escopo do programa**: se DoS for *out-of-scope*, não há report de impacto a fazer. (Veja o post [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

## Defesa em camadas

A defesa de DoS de aplicação é sempre **impor limites**: em tempo, tamanho, quantidade, complexidade e taxa. Nenhum controle isolado resolve; é a soma das camadas.

**1. Rate limiting (a base de tudo).** Limite requisições por IP/usuário, especialmente em rotas caras e de autenticação.

```javascript
// Node/Express — express-rate-limit
const rateLimit = require("express-rate-limit");
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // janela de 15 min
  max: 5,                     // 5 requisições por IP na janela; o resto recebe 429
  standardHeaders: "draft-8", // emite o header combinado RateLimit (padrão IETF mais novo; draft-6 usa os RateLimit-* separados)
  legacyHeaders: false,
});
app.post("/api/v1/otp/send", otpLimiter, sendOtp);   // <- aplica só onde dói
```

**2. Account lockout com freio, não só trava.** Bloquear por tentativa errada protege contra brute force, mas vira DoS direcionado se não houver rate limit por origem. Combine: limite por IP **antes** do lockout, use *backoff* progressivo e lockout temporário (não permanente), e prefira CAPTCHA/MFA a trancar a conta da vítima.

**3. Timeouts em tudo.** Nenhuma operação deve poder rodar indefinidamente. A [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html) recomenda operações assíncronas e timeouts de sessão/requisição.

```javascript
// Timeout de requisição: mata o handler que passar do teto
app.use((req, res, next) => { res.setTimeout(10_000, () => res.sendStatus(503)); next(); });
```

**4. Regex segura (contra ReDoS).** Evite repetição de repetição e alternância sobreposta. Para input não-confiável, prefira um **motor sem backtracking** como o [RE2](https://github.com/google/re2) (via `re2` no Node, que tem complexidade linear garantida), ou valide com um *parser* dedicado em vez de regex.

```javascript
const RE2 = require("re2");
const re = new RE2(/^[a-z0-9.]+@alvo\.com$/);   // RE2 não faz backtracking: tempo linear
// alternativa sem regex: validar tamanho máximo + split('@') + checagens simples
```

**5. Limites de tamanho e descompressão (contra upload/zip bomb).** Imponha tamanho máximo de corpo e de arquivo, valide o tipo, e **limite a saída** da descompressão (o `zlib` nativo do Node historicamente não limita o tamanho descomprimido; escolha uma lib que valide ou rode a extração com quota de CPU/memória/disco, ex.: container com limites).

```javascript
app.use(express.json({ limit: "100kb" }));   // corpo JSON ≤ 100 KB
// upload (multer): limite de tamanho por arquivo
const upload = require("multer")({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2 MB
```

```python
# Python — checar a razão de compressão ANTES de extrair tudo (anti zip bomb)
import zipfile
MAX_RATIO, MAX_TOTAL = 100, 200 * 1024 * 1024  # razão 100:1, total 200 MB
with zipfile.ZipFile(path) as z:
    total = sum(i.file_size for i in z.infolist())
    comp  = sum(i.compress_size for i in z.infolist())
    if total > MAX_TOTAL or (comp and total / comp > MAX_RATIO):
        raise ValueError("possível zip bomb: razão/total acima do limite")
```

**6. Complexidade e profundidade no GraphQL.** A [PortSwigger](https://portswigger.net/web-security/graphql) e a [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html) recomendam: limitar **profundidade** da query, limitar **quantidade** (`first` máximo), **custo/complexidade** (rejeitar queries caras), **timeout** por query, **limite de batch** (máximo de operações por POST) e **paginação** obrigatória.

```javascript
// Apollo Server — limita profundidade da query
const depthLimit = require("graphql-depth-limit");
const server = new ApolloServer({ schema, validationRules: [ depthLimit(7) ] }); // <- máx 7 níveis
```

**7. Paginação e quotas.** Toda listagem deve ter um teto **imposto pelo servidor** (`per_page` capado em, ex., 100), independentemente do que o cliente pedir. Defina quotas por usuário/plano para operações caras.

> ❌ **O que NÃO basta:** validar só no frontend (a regex/limite do front é ignorável); confiar no `Content-Length` enviado pelo cliente; ter rate limit por requisição mas aceitar batching (que burla a contagem); usar UUID/IDs imprevisíveis (não tem relação com DoS); ou achar que CAPTCHA resolve DoS. Segundo a própria OWASP, CAPTCHA protege contra abuso de funcionalidade, **não** contra DoS de exhaustion.

## Ferramentas + labs legais

- **Burp Suite:** Repeater (medir latência de **uma** request), Intruder com volume **pequeno e controlado**, e a extensão **InQL** para mapear schema GraphQL.
- **ffuf:** fuzzing com `-t` para **controlar** a taxa (não para inundar).
- **redos-detector / safe-regex (npm)** e **recheck:** análise estática para flagrar evil regex no código.
- **RE2** ([google/re2](https://github.com/google/re2)): motor de regex linear, a defesa que melhor aguenta input não-confiável.
- **Labs pra praticar (autorizados):** [PortSwigger Web Security Academy — GraphQL](https://portswigger.net/web-security/graphql) (labs de DoS por aninhamento/batching), [Snyk Learn — ReDoS](https://learn.snyk.io/lesson/redos/), DVWA, TryHackMe, HackTheBox. Para ReDoS, o melhor lab é **a sua própria máquina**: reproduza a regex e meça o tempo.

## Checklist do caçador

- [ ] Confirmei que **DoS está no escopo** (se proibido, só reporto **ausência de controle**, sem provocar queda).
- [ ] Anotei a **linha-base** (latência normal) de cada endpoint **antes** de testar.
- [ ] Testei **rate limit** em rotas caras e de auth (sem `429`/CAPTCHA = achado).
- [ ] Verifiquei **account lockout** abusável (testando na **minha** conta).
- [ ] Reproduzi **ReDoS localmente** e medi a curva de tempo antes de tocar no alvo.
- [ ] Mandei **UMA** requisição controlada e **parei** ao ter o sinal, nunca paralelizei para derrubar.
- [ ] Testei **uploads** (sem limite de tamanho/tipo) e razão de compressão.
- [ ] Em GraphQL: testei **aninhamento moderado** e **batching**; medi a latência.
- [ ] Testei `limit`/`per_page`/`first` **subindo gradualmente**, sem chegar no valor que estoura.
- [ ] **Calculei e argumentei** o impacto no report em vez de demonstrá-lo até o fim.

## Pegadinhas / o que NÃO funciona

- **"Vou rodar o Intruder com 100k requisições pra provar."** Não. Isso É o ataque: você derruba produção e some do programa. Volume pequeno + extrapolação no texto.
- **Confundir DoS de aplicação com volumétrico.** Inundar a banda quase sempre está fora de escopo e exige botnet; o que paga é a **fraqueza lógica**.
- **Testar account lockout na conta de um usuário real.** Use sempre conta de teste sua como "vítima".
- **Achar que rate limit no front conta.** O atacante chama a API direto; só o controle **no servidor** vale.
- **Reportar "rate limit ausente" sem impacto.** Triager vai questionar. Amarre num custo concreto (SMS pago, login, lockout) e linke precedentes.
- **Mandar uma zip bomb real em produção.** Demonstre a **ausência de validação**, não materialize os gigabytes.

## O que você precisa lembrar

- DoS de aplicação é **assimetria de custo**: input barato → trabalho caro no servidor.
- A prova é **medir o sinal com uma requisição** e **extrapolar**, nunca consumar a queda.
- Os vetores campeões: **ReDoS**, **upload/zip bomb**, **GraphQL aninhado/batch**, **falta de paginação** e **rate limit ausente**.
- A defesa é **impor limites** em camadas: taxa, tempo, tamanho, complexidade e quota.

> 💡 **Dica de ouro:** o melhor report de DoS prova a **fragilidade** sem causar o **dano**. Se você consegue mostrar, com a linha-base ao lado, que uma requisição barata custou caro ao servidor (e **parou aí**), você tem um achado pago e a consciência limpa. Quem derruba produção "pra ter certeza" não é pesquisador: é o incidente do dia.

## Nota ética

DoS é a classe onde a linha entre **pesquisa** e **crime** é mais fina. Tudo aqui é para **testes autorizados**: bug bounty dentro do escopo (e DoS frequentemente está **fora** dele), pentests contratados e labs legais. **Nunca** tente tornar um serviço de terceiros indisponível: além de ilegal, é desnecessário, porque o vetor se prova com medição controlada. Reproduza ReDoS na sua máquina, meça com uma requisição, extrapole no texto e reporte com responsabilidade. Proteger é o objetivo; derrubar produção nunca é.

## Referências

- [OWASP — Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [OWASP — Denial of Service (attack)](https://owasp.org/www-community/attacks/Denial_of_Service)
- [OWASP — Regular expression Denial of Service (ReDoS)](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [OWASP — GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [PortSwigger — GraphQL API vulnerabilities](https://portswigger.net/web-security/graphql)
- [OWASP API Security — API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [Snyk Learn — ReDoS](https://learn.snyk.io/lesson/redos/)
- [google/re2 — motor de regex linear](https://github.com/google/re2)
- [FIRST — CVSS v4.0 (calculadora e FAQ; cita DoS de rede não autenticado como 8.7)](https://www.first.org/cvss/calculator/4.0)

---
*Próximo/relacionado na série: [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) · base: [Recon & Discovery](/posts/recon-discovery/) · pra reportar: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)**: o índice da série, do básico ao avançado.*
