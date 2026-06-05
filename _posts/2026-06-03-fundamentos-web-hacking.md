---
title: "Fundamentos de Web Hacking & Bug Bounty: do zero ao primeiro alvo"
description: "A base que todo caçador precisa: como a web funciona, anatomia do HTTP, autenticação vs autorização, o mapa do OWASP Top 10 2021, ética de bug bounty e o setup do Burp Suite — passo a passo, do zero."
author: matheus
date: 2026-06-03 23:59:00 -0300
categories: [Bug Bounty, Fundamentos]
tags: ["fundamentos", "HTTP", "autenticação", "autorização", "OWASP", "bug bounty", "web security", "Burp Suite", "mindset"]
pin: false
comments: true
---

## Por que começar pelos fundamentos

Tem muita gente boa que trava no bug bounty não por falta de coragem, mas porque pulou a base. A pessoa aprende um payload de XSS decorado, joga em dez sites, não acontece nada, e conclui que "isso não funciona". O problema quase nunca é o payload — é que ela não enxerga o que está acontecendo **por trás** quando aperta um botão no navegador. Sem esse modelo mental, caçar bug vira loteria.

Este é o post **base** da série. Aqui a gente monta o alicerce que todos os outros assumem que você já tem: como a web conversa, o que é uma request HTTP de verdade, a diferença entre *autenticação* e *autorização* (que confunde até gente sênior), o mapa do [OWASP Top 10 2021](https://owasp.org/Top10/2021/), o que é bug bounty e suas regras, e o setup do **Burp Suite** — a ferramenta que vai ser sua lupa pro resto da jornada. No fim, você consegue interceptar uma request, alterar e reenviar. É o "primeiro alvo" do título.

## A área: onde o bug bounty se encaixa

Antes de sair caçando, entenda o terreno — começando por duas palavras que costumam ser tratadas como sinônimas, mas **não são**:

- **Segurança da Informação (InfoSec)** protege a **informação em qualquer forma** — digital, em papel, numa conversa, num contrato trancado na gaveta. É o conceito mais amplo; os pilares dela (a tríade CIA, logo abaixo) valem pra um servidor *e* pra um documento físico.
- **Cibersegurança (cybersecurity)** é a parte focada no **mundo digital**: proteger sistemas, redes, dispositivos e dados eletrônicos contra ameaças cibernéticas. Na prática é uma **especialização dentro da** segurança da informação (com bastante sobreposição — mas não são a mesma coisa).

**Web hacking e bug bounty vivem na cibersegurança**, mais especificamente na **segurança de aplicações (AppSec)**. E o campo, dos dois lados, se organiza por "cores" que se completam:

- **Defensivo (o lado "azul"):** quem protege — monitora, detecta, responde e corrige. O **Blue Team** é o time dessa linha (SOC, resposta a incidente, *hardening*).
- **Ofensivo (o lado "vermelho"):** quem **ataca para defender** — encontra a falha antes do criminoso, sempre com autorização. **É aqui que o bug bounty mora.** Não é um único papel: o lado ofensivo engloba **pentest**, **bug bounty / caça a vulnerabilidades** e o **Red Team** propriamente dito — que é uma disciplina específica (veja a tabela abaixo), não sinônimo de "ofensivo".
- **AppSec** atravessa os dois lados: tem a parte **defensiva** (escrever código seguro, *threat modeling*, revisão) e a **ofensiva** (testar a aplicação atrás de falhas). Bug bounty é, em boa parte, **AppSec ofensivo**.
- **Purple Team:** a **integração** entre o vermelho e o azul. Pode ser um **time dedicado** que reúne as duas funções, ou um **modo de trabalho/exercício** em que ofensivo e defensivo colaboram em ciclo: o atacante mostra *como* entrou, o defensor ajusta detecção e resposta, e juntos validam se a correção realmente fecha o buraco. O nome vem da mistura (vermelho + azul = roxo). O ponto **não** é "mais um time atacando" — é o **feedback loop** entre ataque e defesa.

> **Analogia:** o vermelho é o ladrão contratado pra testar a casa; o azul é a equipe de segurança que tenta pegá-lo; o roxo é os dois sentando juntos depois pra revisar as câmeras e tapar cada brecha que o ladrão usou. O atrito vira aprendizado.

Dentro do ofensivo, vale separar três coisas que confundem:

| Modalidade | Como funciona | Pagamento |
|---|---|---|
| **Pentest** | Contratado, **escopo e prazo fixos**, relatório formal no fim | Por **tempo/projeto** |
| **Bug Bounty** | Programa **aberto e contínuo**; você acha o que quiser dentro do escopo | Por **resultado** (bounty por falha válida) |
| **Red Team** | Simula um adversário real de ponta a ponta; foco em testar **detecção e resposta** | Por **engajamento** |

O bug bounty é majoritariamente **AppSec ofensivo**: o alvo costuma ser aplicação **web, mobile e API**. As principais plataformas que intermediam programas são **[HackerOne](https://hackerone.com)** e **[Bugcrowd](https://bugcrowd.com)** (as maiores), **[Intigriti](https://intigriti.com)** e **[YesWeHack](https://yeswehack.com)** (fortes na Europa) e **[Synack](https://synack.com)** (só por convite). Detalhamos como funcionam (escopo, regras, VDP × pago) mais abaixo, em *"O que é bug bounty"*.

## Os pilares da Segurança da Informação (a tríade CIA — ou CID, em português)

Toda vulnerabilidade, no fundo, **quebra um destes três pilares** — e saber qual é ajuda demais na hora de explicar o **impacto** de um report.

- **C — Confidencialidade:** só quem tem permissão acessa o dado. *Quebra:* um **IDOR** que te deixa ler a fatura de outro cliente; um vazamento de PII.
- **I — Integridade:** o dado não pode ser alterado indevidamente. *Quebra:* manipular o preço de um pedido, ou um **BFLA** que deixa você alterar o cadastro de outra pessoa.
- **A — Disponibilidade (Availability):** o sistema fica no ar pra quem precisa. *Quebra:* um **DoS** que derruba a aplicação.

> **Analogia:** pense num cofre de banco. **Confidencialidade** é só o dono abrir; **Integridade** é o saldo lá dentro não ser adulterado; **Disponibilidade** é o cofre abrir quando o dono precisa. Tirar qualquer uma das três já é um problema de segurança.

Dois primos completam o time: **Autenticidade** (a informação/usuário é mesmo quem diz ser) e **Não-repúdio** (não dá pra negar que fez uma ação — logs, assinaturas). Guarde a tríade CIA: no post de [Severidade e Impacto](/posts/severidade-impacto-triagem/), é exatamente a partir dela que a gente mede o tamanho de uma falha.

## Como a web funciona (cliente, servidor e banco de dados)

Antes de quebrar, você precisa entender o que está montado. Uma aplicação web tem, no mínimo, três peças:

> **Analogia:** pense num restaurante. Você (o **cliente**) faz um pedido ao garçom. O garçom leva pra **cozinha** (o servidor), que prepara o prato consultando a **despensa** (o banco de dados). O prato volta pela mesma rota. Você nunca entra na cozinha nem na despensa — só recebe o que mandaram trazer. Web hacking é, em grande parte, **mandar pedidos que o garçom não esperava** e ver o que a cozinha devolve.

As três peças:

- **Cliente (browser):** roda HTML, CSS e JavaScript na *sua* máquina. Tudo aqui está sob seu controle — e é por isso que **nenhuma checagem de segurança feita só no cliente vale alguma coisa**. Botão escondido, campo `disabled`, validação em JS: tudo isso você consegue burlar.
- **Servidor (backend):** recebe as requisições, aplica a **lógica de negócio**, decide quem pode o quê e responde. É aqui que a segurança *de verdade* mora (ou deveria morar).
- **Banco de dados (DB):** onde os dados ficam guardados (usuários, pedidos, faturas). O servidor consulta o banco; o cliente **nunca** fala direto com ele.

A conversa entre cliente e servidor acontece via **HTTP** (ou HTTPS, que é HTTP dentro de um túnel TLS criptografado). Entender HTTP é o ponto de partida obrigatório — é a língua que você vai falar a partir de agora.

## Anatomia do HTTP

HTTP é um protocolo de **requisição e resposta**: o cliente manda uma *request*, o servidor manda uma *response*. Cada troca é independente — o protocolo é **stateless** (não lembra da request anterior por conta própria; já já vemos como cookies resolvem isso).

### A request por dentro

Uma requisição HTTP crua tem esta cara (é literalmente o que viaja na rede):

```http
GET /api/perfil?id=1001 HTTP/2
Host: app.exemplo.com
User-Agent: Mozilla/5.0
Accept: application/json
Cookie: session=abc123
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

Decompondo:

1. **Linha inicial:** `GET /api/perfil?id=1001 HTTP/2` — o **método** (`GET`), o **caminho** (`/api/perfil`) com a **query string** (`?id=1001`), e a versão do protocolo.
2. **Headers:** metadados em pares `Chave: Valor` (quem é o host, o que o cliente aceita, credenciais...).
3. **Corpo (body):** opcional. `GET` normalmente não tem corpo; `POST`/`PUT` carregam dados aqui (um JSON, um formulário).

### Métodos HTTP

O método diz **a intenção** da request. Os que você mais vai mexer:

| Método | Pra que serve | É seguro? | É idempotente? |
|---|---|---|---|
| **GET** | Buscar/ler um recurso. **Não deve** alterar nada no servidor | Sim | Sim |
| **POST** | Criar recurso ou disparar uma ação (login, pagamento) | Não | Não |
| **PUT** | Substituir um recurso inteiro pelo conteúdo enviado | Não | Sim |
| **DELETE** | Apagar um recurso | Não | Sim |
| **PATCH** | Alterar **parcialmente** um recurso | Não | Não |

Dois conceitos da especificação que valem ouro pro hunter (definições da [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)):

- **Seguro (safe):** o método **não altera o estado** do servidor — só lê. `GET`, `HEAD`, `OPTIONS` são seguros.
- **Idempotente:** chamar **N vezes** dá o mesmo efeito de chamar **uma vez**. `GET`, `PUT`, `DELETE` são idempotentes; `POST` e `PATCH` **não** são.

> 💡 **Por que isso importa na caça:** se uma aplicação valida autorização no `GET /pedido/1001` mas esquece de validar no `POST`, `PUT` ou `DELETE` do mesmo recurso, você acabou de achar uma falha. **Sempre teste todos os métodos** — muita gente checa só o método "óbvio".

### Status codes (códigos de resposta)

A resposta sempre começa com um número de três dígitos. A primeira casa define a família ([MDN — HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)):

| Família | Significado | Exemplos que importam |
|---|---|---|
| **1xx** | Informativo | (raro no dia a dia) |
| **2xx** | Sucesso | `200 OK`, `201 Created`, `204 No Content` |
| **3xx** | Redirecionamento | `301 Moved Permanently`, `302 Found`, `304 Not Modified` |
| **4xx** | Erro **do cliente** | `400`, `401`, `403`, `404`, `405`, `429` |
| **5xx** | Erro **do servidor** | `500`, `502`, `503` |

Os que você lê o tempo todo testando:

- **`200 OK`** — deu certo. Se você trocou um `id` e veio `200` com dado que não é seu, acendeu a luz.
- **`401 Unauthorized`** — apesar do nome, significa **"não autenticado"**: você precisa se identificar (logar) primeiro.
- **`403 Forbidden`** — você **está identificado**, mas **não tem permissão** pra esse recurso. (Guarde a diferença `401` x `403`, ela é o coração da próxima seção.)
- **`404 Not Found`** — recurso não existe. Às vezes uma API devolve `404` em vez de `403` de propósito, pra não revelar que o objeto existe.
- **`405 Method Not Allowed`** — o método é conhecido mas não é aceito ali. Pista pra trocar `GET`↔`POST`.
- **`429 Too Many Requests`** — rate limiting. A ausência dele em fluxos sensíveis (login, OTP) é, por si só, uma falha reportável.
- **`500 Internal Server Error`** — o servidor quebrou. Erro inesperado costuma vazar stack traces e dados — bom sinal de que você empurrou um input que ele não esperava.

### Headers que todo hunter precisa conhecer

Headers são onde mora metade da diversão. Os essenciais:

| Header | Direção | Pra que serve |
|---|---|---|
| `Host` | request | Diz qual site você quer (vários sites num mesmo IP) |
| `Authorization` | request | Carrega o token de credencial (ex.: `Bearer <jwt>`) |
| `Cookie` | request | Manda os cookies de volta ao servidor (sessão) |
| `Content-Type` | ambos | Formato do corpo (`application/json`, `application/x-www-form-urlencoded`) |
| `Set-Cookie` | response | Servidor cria/atualiza um cookie no cliente |
| `Location` | response | Pra onde redirecionar (acompanha `3xx`) |
| `X-Forwarded-For` | request | IP de origem alegado — muito abusado em bypasses |

### Cookies e sessão (como a web "lembra" de você)

HTTP é stateless: cada request nasce "amnésica". Então como o site sabe que você continua logado entre uma página e outra? Com **cookies**.

> **Analogia:** é a pulseirinha de festa. Na entrada você mostra o ingresso (login) e recebe uma pulseira (cookie de sessão). Daí pra frente, em vez de mostrar o ingresso toda hora, você só ergue o braço — a pulseira prova que você já entrou.

O fluxo:

```http
# 1) Você loga — o servidor cria a sessão e devolve a "pulseira"
POST /login HTTP/2
Host: app.exemplo.com
Content-Type: application/json

{"usuario":"alice","senha":"..."}
```

```http
# Resposta: o servidor te entrega o cookie
HTTP/2 200 OK
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax   # <- a "pulseira"
```

```http
# 2) Nas próximas requests, o browser reenvia o cookie automaticamente
GET /api/perfil HTTP/2
Host: app.exemplo.com
Cookie: session=abc123   # <- prova que é você, sem relogar
```

Três flags de cookie que você precisa reconhecer (vão aparecer em vários posts da série):

- **`HttpOnly`** — o JavaScript da página **não** consegue ler o cookie. Mitiga roubo de sessão via XSS.
- **`Secure`** — o cookie só viaja por HTTPS.
- **`SameSite`** — controla se o cookie é enviado em requests vindas de **outros sites**. É a primeira linha de defesa contra **CSRF**.

Além de cookies de sessão, muitas APIs modernas usam **tokens** (tipo JWT) no header `Authorization: Bearer ...`. Mesma ideia — uma credencial que prova quem você é a cada request — só que sem depender de cookie.

## O que é uma vulnerabilidade web

Uma **vulnerabilidade** é uma falha que faz a aplicação se comportar de um jeito que **não foi pretendido**, com impacto em **confidencialidade, integridade ou disponibilidade** (a tríade CIA/CID). Não é "achar um erro feio na tela" — é conseguir fazer algo que você **não deveria** poder.

> **Analogia:** o cofre do hotel ser inquebrável não adianta se a senha-mestra é `0000` e está escrita atrás da porta. A vulnerabilidade raramente é "a criptografia é fraca"; quase sempre é uma **suposição errada** que o desenvolvedor fez — "ninguém vai trocar esse número", "esse campo é validado no front", "esse endpoint é secreto".

A causa-raiz da maioria esmagadora das falhas web é **uma só**: o servidor **confia em algo que veio do cliente**. O id na URL, o `role` no corpo da request, o preço no carrinho, o header `X-Forwarded-For`. Tudo que sai do navegador é controlável pelo usuário — e tratar isso como confiável é a origem do IDOR, da injeção, do bypass de autorização e de quase tudo que você vai estudar nesta série.

## Autenticação vs Autorização (deixa cristalino)

Essas duas palavras parecem sinônimas e **não são**. Misturá-las é a fonte número 1 de confusão — e a falha [#1 do OWASP](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) nasce exatamente de errar a segunda.

| | **Autenticação (AuthN)** | **Autorização (AuthZ)** |
|---|---|---|
| Pergunta que responde | **"Quem é você?"** | **"Você pode fazer isso?"** |
| Quando acontece | No login | Em **cada** ação/recurso, depois do login |
| Falha típica | Login fraco, bypass de senha, JWT quebrado | IDOR, BOLA, BFLA, acesso a função de admin |
| Status code | `401 Unauthorized` (= não autenticado) | `403 Forbidden` (= autenticado, sem permissão) |

> **Analogia:** entrar no prédio do escritório com seu crachá é **autenticação** — a catraca confirma que você é funcionário. Mas o seu crachá só **deveria** abrir a porta do *seu* andar; se ele abre a sala do CEO e o cofre do financeiro, isso é falha de **autorização**. O prédio sabe quem você é; só errou no que você pode fazer.

Em código, o erro clássico é checar **só** a autenticação:

```php
// VULNERÁVEL — verifica que você está logado, mas não que o pedido é SEU
function getPedido() {
    if (!usuarioEstaLogado()) {           // autenticação: OK
        http_response_code(401);
        return;
    }
    $id = $_GET['id'];                     // <- confia no id que veio do cliente
    return Pedido::find($id);              // entrega pra qualquer um autenticado
}
```

```php
// CORRETO — verifica também a PROPRIEDADE (autorização)
function getPedido() {
    if (!usuarioEstaLogado()) {
        http_response_code(401);
        return;
    }
    $pedido = Pedido::where('id', $_GET['id'])
                    ->where('dono_id', usuarioLogadoId())  // <- a checagem que faltava
                    ->first();
    if (!$pedido) { http_response_code(403); return; }     // logado, mas não é seu
    return $pedido;
}
```

Grave isso: **autenticação não implica autorização**. Estar logado não te dá direito a tudo — e quase todo bug de acesso vive nessa lacuna. (A série tem um post inteiro sobre isso: [Broken Access Control — IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/).)

## O mapa: OWASP Top 10 2021

O [OWASP Top 10](https://owasp.org/www-project-top-ten/) é a lista das categorias de risco mais críticas em aplicações web, mantida pela Open Worldwide Application Security Project. É o **mapa do território** — vale memorizar, porque programas de bug bounty, triagers e classificações de severidade falam essa língua.

A edição mais recente é a [2025](https://owasp.org/Top10/2025/), mas neste post a gente aprende pela [edição de 2021](https://owasp.org/Top10/2021/) — e isso é proposital. O 2021 ainda é a referência que **a esmagadora maioria** dos programas de bug bounty, triagers e materiais de estudo usa hoje; as categorias são mais estáveis e didáticas pra começar. Quando você dominar o 2021, a transição pro 2025 é só ajuste (veja o quadro depois da tabela). Segue o **2021**:

| # | Categoria | Em uma frase |
|---|---|---|
| **A01** | [Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) | Acessar dado/função de outra pessoa (IDOR, BOLA, BFLA) — a que mais paga |
| **A02** | [Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) | Dado sensível mal protegido (sem TLS, hash fraco, segredo exposto) |
| **A03** | [Injection](https://owasp.org/Top10/A03_2021-Injection/) | Input vira código/comando (SQLi, NoSQLi, command injection, XSS) |
| **A04** | [Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/) | Falha de **arquitetura/lógica** — o design já nasceu errado |
| **A05** | [Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/) | Configuração errada (defaults, painéis abertos, headers ausentes) |
| **A06** | [Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/) | Biblioteca/serviço desatualizado com CVE conhecida |
| **A07** | [Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/) | Falha no login (senha fraca, sessão mal gerida, MFA furado) |
| **A08** | [Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/) | Confiar em update/pipeline/dado sem checar integridade (ex.: deserialização insegura) |
| **A09** | [Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/) | Não logar/monitorar — o ataque acontece e ninguém vê |
| **A10** | [Server-Side Request Forgery (SSRF)](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/) | Forçar o servidor a fazer requisições pra onde você quer (rede interna, metadados de cloud) |

Não precisa decorar tudo de cara. Comece dominando **A01** e **A03** — são as que mais aparecem e mais pagam — e use a lista como índice pra estudar o resto.

> 💡 **E o [OWASP Top 10 2025](https://owasp.org/Top10/2025/)?** A edição nova já saiu e reorganizou a lista. As mudanças que valem conhecer: **Broken Access Control segue em #1**; **Security Misconfiguration sobe pra #2**; **Injection cai pra #5** e **Insecure Design pra #6**; **Vulnerable and Outdated Components** vira **Software Supply Chain Failures** (#3, escopo mais amplo); o **SSRF deixa de ser categoria própria e foi absorvido por Broken Access Control**; e entra uma categoria nova, **Mishandling of Exceptional Conditions** (#10). O **raciocínio** continua o mesmo — só mudaram nomes e posições. Aprenda o 2021 primeiro (é o que os programas ainda usam) e leia o 2025 como "diff".

## O que é bug bounty (escopo, regras e ética)

**Bug bounty** é um programa em que uma empresa **autoriza** pesquisadores externos a procurar falhas nos seus sistemas e **paga recompensa** (bounty) por vulnerabilidades válidas reportadas com responsabilidade. As plataformas mais usadas são **HackerOne, Bugcrowd, Intigriti e YesWeHack**.

A palavra que sustenta tudo isso é **autorização**. Sem um programa que te autoriza, testar o sistema de terceiros é **crime** — não importa quão "do bem" seja a intenção. Por isso, antes de qualquer payload, você lê:

- **Escopo (scope):** *o que* você pode testar. Lista exatamente os domínios, apps e APIs **in-scope**. Tudo que estiver fora é **out-of-scope** e não pode ser tocado. O escopo também diz **quais classes de falha** valem — tem programa que coloca IDOR ou rate limit **fora de escopo**, e tem programa que paga muito bem por eles. **Ler as regras é parte do trabalho.**
- **Regras de engajamento:** o que é proibido (ex.: ataques de DoS, engenharia social com funcionários reais, testar contas de outros usuários, automação agressiva sem limite).
- **Política de divulgação:** quando e como você pode tornar a falha pública. O padrão é **divulgação coordenada/responsável**: você reporta **em privado**, dá tempo pro time corrigir, e só divulga depois (se a política permitir). Nunca solte um 0-day no Twitter pra ganhar likes.

> ⚠️ **Tipos de programa:** **VDP** (Vulnerability Disclosure Program) geralmente **não paga** — você reporta por reputação/pontos. **BBP** (Bug Bounty Program) paga em dinheiro. Muitos programas privados (os que pagam melhor) só chegam por **convite**, e os convites vêm de quem construiu **reputação** em programas públicos/VDP.

### Ética e legalidade — inegociável

- **Só toque no que está autorizado e dentro do escopo.** Trocar um `id` no sistema de alguém sem programa que autorize é invasão, prevista em lei (no Brasil, art. 154-A do Código Penal).
- **Prova de conceito mínima.** Demonstre a falha com o **menor** impacto possível. Não baixe a base de dados inteira de PII pra "provar" — um ou dois registros mascarados bastam.
- **Não cause dano.** Nada de derrubar serviço, apagar dado de produção ou usar conta real de terceiro.
- **Reporte com responsabilidade.** Privado primeiro, divulgação só quando permitido.

Vai treinar? Use **labs feitos pra isso** (próxima seção). É lá que você quebra à vontade, sem risco legal.

## Setup do Burp Suite (passo a passo)

O **Burp Suite** é o canivete suíço do hunter web: um **proxy de interceptação** que fica **entre o seu navegador e o servidor**, deixando você **ler, pausar, editar e reenviar** cada request. Sem ele, você está cego — vê só o que a página resolve te mostrar. Com ele, você vê (e controla) o HTTP cru.

A versão **Community** é grátis e cobre tudo o que precisamos aqui (Proxy, Repeater e Intruder com limite). O fluxo abaixo segue o roteiro oficial do [Getting started with Burp Suite](https://portswigger.net/burp/documentation/desktop/getting-started).

> **Analogia:** o Burp é um grampo na linha telefônica — só que da SUA própria ligação, e com permissão. Você ouve a conversa entre browser e servidor, e pode **interromper no meio pra mudar o que foi dito** antes de chegar do outro lado.

### Passo 1 — Instalar e abrir

Baixe em [portswigger.net/burp](https://portswigger.net/burp/communitydownload), instale e abra. Escolha **Temporary project** → **Use Burp defaults** → **Start Burp**.

### Passo 2 — Usar o navegador embutido (caminho mais fácil)

O Burp vem com um **browser embutido** já pré-configurado pra passar pelo proxy — sem mexer em proxy do sistema nem instalar certificado manualmente. Vá em **Proxy → Intercept** e clique em **Open Browser**. É a forma recomendada pra começar.

> Se preferir usar **seu** navegador (Firefox/Chrome), siga o Passo 2b. É o caminho que a maioria usa no dia a dia, porque você navega no ambiente real (suas extensões, suas sessões).

### Passo 2b — Usar o SEU navegador (proxy + certificado, na mão)

Usar o navegador embutido é o atalho, mas em alvos reais você quase sempre vai querer o **seu** navegador. Pra isso, dois ajustes: **apontar o tráfego pro Burp** e **confiar no certificado dele** (senão todo HTTPS quebra).

**1. Entenda o que está acontecendo.** O Burp escuta, por padrão, em `127.0.0.1:8080` (veja/edite em **Proxy → Proxy settings → Proxy listeners**). Você precisa fazer o navegador mandar as requests pra esse IP:porta em vez de ir direto pro site. É o "host:porta" que vai aparecer em tudo daqui pra frente.

**2. Direcione o navegador com o FoxyProxy** (extensão que liga/desliga proxy num clique — muito melhor que mexer no proxy do sistema toda hora). Instale o **FoxyProxy** ([Firefox](https://addons.mozilla.org/firefox/addon/foxyproxy-standard/) / [Chrome](https://chromewebstore.google.com/detail/foxyproxy/gcknhkkoolaabfmlnjonogaaifnjlfnp)) e crie um perfil:

```text
Title:    Burp
Proxy Type / Type:   HTTP
Proxy IP / Host:     127.0.0.1
Port:                8080
```

Salve e, na barra do navegador, clique no ícone do FoxyProxy → selecione **Burp** pra ativar (e **Disable/Turn Off** pra voltar ao normal). Pronto: o tráfego do navegador agora passa pelo Burp.

> Sem extensão dá pra fazer no próprio Firefox em **Settings → Network Settings → Manual proxy**: `HTTP Proxy 127.0.0.1`, `Port 8080`, e marque **"Also use this proxy for HTTPS"**. Mas o FoxyProxy é bem mais prático.

**3. Instale o certificado CA do Burp** (pra HTTPS não dar erro). Com o proxy ativo, acesse **`http://burp`** no navegador → botão **CA Certificate** → baixe o `cacert.der`. Depois importe no navegador:

- **Firefox** (tem sua própria store de certificados): `Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import` → selecione o arquivo → marque **"Trust this CA to identify websites"**.
- **Chrome/Edge** (usa a store do sistema): abra o gerenciador em **`chrome://settings/certificates`** → aba **Authorities** → **Import**, ou importe direto na store do SO (no Linux costuma precisar converter pra `.crt`/`.pem` com `openssl x509 -inform der -in cacert.der -out burp.crt`).

> 💡 **Por que o certificado?** O Burp faz um "MITM do bem" no SEU tráfego: ele intercepta o HTTPS apresentando um certificado próprio. O navegador só confia nesse certificado se a CA do Burp estiver instalada — por isso, sem esse passo, todo site HTTPS acusa erro de TLS.

**Alternativas ao Burp** (mesma ideia de proxy de interceptação): **OWASP ZAP** (gratuito e ótimo pra começar), **Charles Proxy** (pago, muito usado pra debug web/mobile), **mitmproxy** (linha de comando, scriptável em Python) e **Caido** (proxy moderno e leve). O conceito de "apontar o navegador pro proxy + instalar o certificado" é **o mesmo** em todos — muda só a interface.

### Passo 3 — Interceptar uma request

Em **Proxy → Intercept**, ative **Intercept is on**. Agora navegue no browser do Burp pra qualquer página *autorizada* (use um lab — veja a seção seguinte). O Burp vai **pausar** a request e mostrar pra você:

```http
GET /api/perfil?id=1001 HTTP/2          # <- aqui você pode editar antes de enviar
Host: app.exemplo.com
Cookie: session=abc123
```

Clique **Forward** pra deixar passar, ou **Drop** pra descartar. Toda request que passa fica registrada em **Proxy → HTTP history** — é seu histórico completo pra revisitar depois.

### Passo 4 — Reenviar e brincar no Repeater

O **Repeater** é onde você passa 80% do tempo. Ele pega uma request e deixa você **editar e reenviar quantas vezes quiser**, vendo a resposta lado a lado. É o lugar pra testar "e se eu trocar esse número?".

Na HTTP history (ou no Intercept), clique com o botão direito na request → **Send to Repeater** → aba **Repeater**. Edite o que quiser e clique **Send**:

```http
GET /api/perfil?id=1001 HTTP/2   # original
GET /api/perfil?id=1002 HTTP/2   # <- troca o id e reenvia: voltou dado de outro?
```

Se a resposta vier `200 OK` com dados que não são seus, você acabou de confirmar manualmente um possível **IDOR** — tudo no Repeater.

### Passo 5 — Automatizar com o Intruder

Quando você precisa testar **muitos valores** (enumerar 1000 ids, fuzzar um parâmetro, testar uma lista de payloads), o **Intruder** automatiza. Botão direito na request → **Send to Intruder** → aba **Intruder**:

1. **Positions:** marque com `§` o ponto que varia. Ex.: `?id=§1001§`.
2. **Attack type:** comece com **Sniper** (um único ponto, percorre uma lista).
3. **Payloads:** escolha o conjunto. Pra ids sequenciais, use **Numbers** (ex.: de `1000` a `2000`).
4. **Start attack** e ordene a tabela por **Status** e **Length** — respostas diferentes do padrão (vários `200` com tamanhos distintos) são as que merecem atenção.

> ⚠️ A versão **Community** roda o Intruder **com throttling** (lento de propósito). Pra enumeração séria existe a **Professional**, mas pra aprender e provar o conceito a Community resolve.

Pronto: interceptou, editou, reenviou e automatizou. Esse é o ciclo que se repete em **todo** post técnico desta série.

## Mindset do hunter (onde começar de verdade)

Ferramenta e teoria você pega rápido. O que separa quem ganha dinheiro de quem desiste é **cabeça**. O que funciona na prática:

- **Comece por VDP e pelo DoD.** Programas de VDP (HackerOne, Bugcrowd, Intigriti, YesWeHack) e o **DoD** (Department of Defense, na HackerOne) aceitam até falhas simples e dão **reputação/pontos**. Reputação destrava **convites pra programas privados** — que são menos lotados e pagam melhor. É o caminho clássico: reporta em VDP/DoD → sobe no rank → chovem convites privados.
- **Profundidade > superfície.** A "casca" do alvo (o que aparece num scan rápido) já foi varrida por milhares de bots rodando 24/7. Você não ganha competindo com automação na superfície. Ganha indo **fundo num fluxo** que a maioria ignora — entender de verdade como uma funcionalidade funciona e perceber o que os outros não perceberam.
- **Analise o fluxo, não decore checklist.** Checklist é ótimo pra não esquecer o básico, mas o diferencial está em **raciocinar sobre a lógica** da aplicação. Os melhores bugs (lógica de negócio, broken access control) não saltam de scanner — saltam de quem **observa**.
- **Foque um escopo e domine.** Em vez de pular de alvo em alvo, escolha **um** programa, entenda a aplicação a fundo e detone. Conhecimento profundo de um alvo rende mais que conhecimento raso de dez.
- **Frustração faz parte.** Você vai colecionar **duplicadas** e **informativos** antes do primeiro pago — e duplicada, longe de ser derrota, é o sinal de que você está no **caminho certo** (alguém achou o mesmo bug antes; você só precisa achar **primeiro** ou ir **mais fundo**). Foque em aprender e em **testar o que aprendeu**.

## Glossário rápido (os termos que vão aparecer na série)

Vai topar com essas palavras o tempo todo nos próximos posts. Guarde aqui — quando esquecer, volta nesta seção. (Os termos de HTTP, cookie/sessão, header e proxy já foram explicados acima.)

- **API** — a "porta de entrada" pra falar com o servidor por código (em vez de telas). Em geral devolve **JSON**. Cada URL/ação dela é um **endpoint** (ex.: `GET /api/v1/usuarios/1001`).
- **Endpoint** — um caminho específico da aplicação/API que aceita requests (ex.: `/login`, `/api/faturas`).
- **Payload** — o "conteúdo" que você envia. Pode ser o **corpo** de uma request, ou, em ataque, a **string maliciosa** que você injeta (ex.: um payload de XSS).
- **Token** — uma credencial que prova quem você é depois do login, enviada a cada request (normalmente no header `Authorization: Bearer ...`). Substitui ficar mandando senha toda hora.
- **JWT (JSON Web Token)** — o tipo de token mais comum. São **três partes separadas por ponto** — `header.payload.signature` — cada uma em **Base64URL**. O `payload` carrega dados (ex.: `userId`, `role`) e a `signature` garante que ninguém alterou o token. ⚠️ Base64 **não é** criptografia: dá pra ler o conteúdo de um JWT em [jwt.io](https://jwt.io). Exploração a fundo no post [Account Takeover](/posts/account-takeover/).
- **Hash × Criptografia × Encoding** (não confunda — cai muito):
  - **Encoding** (ex.: **Base64**, URL-encoding): só **muda o formato**, reversível por qualquer um. **Não protege nada.**
  - **Hash** (ex.: SHA-256, bcrypt): via de **mão única**, não dá pra "des-hashear" (mas dá pra quebrar por força bruta se for fraco).
  - **Criptografia** (ex.: AES): reversível **só com a chave**. É o que de fato protege confidencialidade.
- **TLS / HTTPS** — a camada que **criptografa** a conexão entre navegador e servidor (o cadeado). O **certificado** é o que prova a identidade do site (e é por isso que o Burp instala o dele — Passo 2b).
- **DNS / Subdomínio / CNAME** — o DNS traduz nome (`alvo.com`) em IP. **Subdomínio** é `loja.alvo.com`. **CNAME** é um "apelido" que aponta um nome pra outro — central no post [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/).
- **Same-Origin Policy (SOP)** — regra do navegador: por padrão, um site **não** lê dados de outra origem (domínio+porta+protocolo). É a base da segurança no browser.
- **CORS** — o mecanismo que **relaxa** a SOP de forma controlada (libera origens específicas). Mal configurado, vira vulnerabilidade.
- **CSP (Content Security Policy)** — header que diz ao navegador **de onde** scripts/recursos podem rodar. É a principal defesa contra [XSS](/posts/xss-html-injection/).
- **WAF (Web Application Firewall)** — um "porteiro" que filtra requests suspeitas antes de chegar na aplicação. Dá pra burlar (você verá vários *bypasses* na série).
- **PoC (Proof of Concept)** — a prova mínima de que a falha existe (a request/print que demonstra), que vai no report.
- **PII** — dados pessoais (nome, CPF, e-mail, endereço). Vazar PII = alto impacto.
- **CVE / CWE / CVSS** — **CVE** é o "RG" de uma vuln pública conhecida (`CVE-AAAA-NNNN`); **CWE** é a *categoria* da falha; **CVSS** é a nota de severidade. Tudo no post [Severidade e Impacto](/posts/severidade-impacto-triagem/).
- **Recon / Fuzzing** — **recon** é mapear o alvo (o que existe); **fuzzing** é disparar muitas tentativas pra descobrir caminhos/parâmetros. Detalhe no post [Recon & Discovery](/posts/recon-discovery/).
- **API / GraphQL / Introspection** — além de REST, muitas apps usam **GraphQL** (uma única URL `/graphql` que aceita *queries*). **Introspection** é um recurso do GraphQL que **lista todo o schema** (tipos, campos, operações) — ouro pro atacante quando fica habilitado. Tudo no post [Segurança de APIs](/posts/api-security/).
- **Mass Assignment** — quando você manda **campos extras** no JSON da request (ex.: `"role":"admin"`, `"isAdmin":true`) e a aplicação aceita cegamente, alterando o que não devia. Mais no post [Segurança de APIs](/posts/api-security/).
- **SSL Pinning** — o app **mobile** só confia num certificado específico, o que **trava o Burp** (o certificado dele é rejeitado). Resolve-se com *bypass* via Frida/objection. Veja [Bug Bounty em Mobile](/posts/mobile-bug-bounty/).
- **Deeplink** — um link especial (ex.: `app://...`) que abre uma tela específica de um app mobile. Deeplinks mal validados viram vetor de ataque. Veja [Mobile](/posts/mobile-bug-bounty/).
- **Cloud metadata** — um endpoint interno da nuvem (ex.: `http://169.254.169.254`) que devolve credenciais/configuração da máquina. Alvo clássico de **SSRF** → ver [SSRF](/posts/ssrf/).
- **Primitiva / Chaining** — uma **primitiva** é o que uma falha te dá de "poder" (ler arquivo, redirecionar, fazer request server-side...). **Chaining** é **encadear** várias primitivas/falhas pequenas até um impacto crítico. O post [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/) é só sobre isso.
- **XXE / Entidade externa** — no XML, uma "entidade externa" (`<!ENTITY x SYSTEM "file:///...">`) faz o **parser** buscar um arquivo/URL. Abusar disso pra ler arquivos ou fazer SSRF é o [XXE](/posts/xxe-xml-external-entity/).
- **Serialização / Gadget chain** — **serializar** é virar um objeto em bytes/string (pra salvar/trafegar); **deserializar** dado não-confiável pode virar RCE encadeando classes já presentes (**gadget chain**). Veja [Insecure Deserialization](/posts/insecure-deserialization/).
- **Prototype Pollution** — poluir o `Object.prototype` do JavaScript (via `__proto__`), o que afeta **todos** os objetos da aplicação. Veja [Prototype Pollution](/posts/prototype-pollution/).
- **S3 / IAM / IMDS** — termos de nuvem AWS: **S3** (armazenamento em *buckets*), **IAM** (identidades e permissões), **IMDS** (endpoint de metadata `169.254.169.254` que pode devolver credenciais). Veja [Cloud & AWS](/posts/cloud-aws-misconfiguration/).

## Ferramentas + labs legais

Pra praticar sem pisar em terreno ilegal:

- **[PortSwigger Web Security Academy](https://portswigger.net/web-security)** — a melhor fonte **gratuita** do mundo, do mesmo time do Burp. Labs interativos por classe de falha, com solução.
- **[OWASP Juice Shop](https://owasp.org/www-project-juice-shop/)** — app deliberadamente vulnerável, moderno (SPA + API), ótimo pra treinar.
- **[DVWA](https://github.com/digininja/DVWA)** (Damn Vulnerable Web Application) — clássico pra rodar local e estudar cada falha em níveis de dificuldade.
- **[TryHackMe](https://tryhackme.com/)** e **[Hack The Box](https://www.hackthebox.com/)** — trilhas guiadas e máquinas pra praticar pentest.
- **Burp Suite Community** — interceptar, Repeater e Intruder, como vimos.

## Checklist do iniciante

- [ ] Entendo o fluxo **cliente → servidor → banco** e por que segurança no cliente não conta.
- [ ] Sei ler uma **request HTTP** crua (linha inicial, headers, body).
- [ ] Conheço os **métodos** (GET/POST/PUT/DELETE) e o que é *safe* e *idempotente*.
- [ ] Reconheço os **status codes** que importam (200, 401, 403, 404, 429, 500).
- [ ] Sei a diferença entre **`401` (não autenticado)** e **`403` (sem permissão)**.
- [ ] Tenho **cristalina** a diferença entre **autenticação** e **autorização**.
- [ ] Sei recitar de cabeça o que é cada item do **OWASP Top 10 2021**.
- [ ] Sempre **leio o escopo e as regras** antes de testar — e só toco no autorizado.
- [ ] Consigo **interceptar, editar e reenviar** uma request no Burp (Proxy + Repeater).
- [ ] Tenho conta numa plataforma (HackerOne/Bugcrowd) e um **lab** pra treinar.

## Pegadinhas e o que NÃO funciona

- ❌ **Achar que validação no front protege.** O cliente é seu — `disabled`, campo oculto e checagem em JS são contornáveis. A segurança real é **no servidor**.
- ❌ **Confundir `401` com `403`.** `401` = falta logar; `403` = logado, sem permissão. Confundir leva a diagnóstico errado.
- ❌ **Testar fora do escopo "só pra ver".** Out-of-scope é out-of-scope. Além de não pagar, pode te tirar do programa — ou pior, virar caso de polícia.
- ❌ **Achar que `GET` nunca muda estado.** Ele **não deveria**, mas tem app que altera dado num `GET`. Não confunda "como deveria ser" com "como está".
- ❌ **Disparar Intruder/scanner sem limite num alvo real.** Automação agressiva pode causar indisponibilidade — viola regras e pode dar dano. Em lab, à vontade; em produção, com parcimônia.
- ❌ **Decorar payload sem entender.** Payload sem modelo mental do HTTP por trás é tiro no escuro. Entenda o **porquê**.

## O que você precisa lembrar

- A web é **cliente ↔ servidor ↔ banco**, conversando por **HTTP**. Tudo que vem do cliente é **controlável** — e tratar isso como confiável é a origem da maioria das falhas.
- **Autenticação** = "quem é você"; **autorização** = "você pode?". Não confunda — é a base do bug que mais paga.
- O **OWASP Top 10 2021** é o seu mapa; **A01 (Broken Access Control)** e **A03 (Injection)** são onde começar.
- Bug bounty é **caça autorizada**: leia escopo e regras, use PoC mínima, divulgue com responsabilidade.
- **Burp Suite** é a lupa: Proxy intercepta, Repeater testa, Intruder automatiza.

> 💡 **Dica de ouro:** o caçador iniciante decora payloads; o caçador que evolui **lê a request e pergunta "o que o servidor está confiando aqui que ele não deveria?"**. Toda falha web é uma resposta a essa pergunta. Comece por VDP/DoD pra ganhar reputação, vá fundo num único alvo, e use o Repeater pra **provar** — não só achar — que tem bug.

## Nota ética

Tudo aqui é pra **testes autorizados**: programas de bug bounty (dentro do escopo), pentests contratados e labs legais. Testar sistemas de terceiros sem autorização é crime, além de totalmente desnecessário quando existe tanto lab bom (PortSwigger Academy, Juice Shop, DVWA, THM, HTB) pra treinar de graça. Use esse conhecimento pra **proteger**, reportar com responsabilidade e ensinar.

## Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/2021/) — a lista usada neste post e a página de cada categoria. ([OWASP Top 10 2025](https://owasp.org/Top10/2025/) — edição mais recente.)
- [MDN — HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods) — métodos, *safe* e *idempotent*.
- [MDN — HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) — todas as famílias de status.
- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) — cookies, sessão e flags `HttpOnly`/`Secure`/`SameSite`.
- [PortSwigger — Getting started with Burp Suite](https://portswigger.net/burp/documentation/desktop/getting-started) — setup oficial do proxy.
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — labs gratuitos por classe de falha.
- [HackerOne — Bug Bounty Programs](https://www.hackerone.com/) e [Bugcrowd](https://www.bugcrowd.com/) — plataformas pra começar.

---
*Próximo na série: [Broken Access Control — IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) · base recomendada antes de caçar: este post.*
