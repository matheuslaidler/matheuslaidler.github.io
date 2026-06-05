---
title: "Broken Access Control na Prática: IDOR, BOLA e BFLA do Básico ao Avançado"
description: "Por que controle de acesso quebrado é a falha que mais paga em bug bounty — e como achar, explorar e corrigir IDOR, BOLA e BFLA passo a passo."
author: matheus
date: 2026-06-03 23:55:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["IDOR", "BOLA", "BFLA", "broken access control", "OWASP", "bug bounty", "web security", "Burp Suite", "API security"]
image: /assets/img/covers/broken-access-control-idor-bola-bfla.png
pin: false
comments: true
---

## Quando trocar um número vale R$5.000

Imagina que você acessa a sua fatura num app e a URL é mais ou menos assim:

```
GET /api/faturas/charge-details?chargeId=10051002
```

Aí bate aquela curiosidade clássica de quem mexe com segurança: *"e se eu trocar esse `10051002` por `10051001`?"*. Você troca. A tela carrega. Só que a fatura que aparece **não é a sua** — é a de outro cliente, com nome, CPF e nota fiscal. Pronto: você acabou de encontrar um **IDOR**, e esse tipo de falha paga de algumas centenas a **dezenas de milhares de reais** dependendo do programa.

Controle de acesso quebrado (**Broken Access Control**) é a vulnerabilidade **número 1** do [OWASP Top 10 (A01:2021)](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) e, de longe, a que mais aparece em programas de bug bounty reais. Neste post a gente vai do "o que é" até técnicas avançadas, com exploração, caso prático e defesa de verdade.

## O que é Broken Access Control?

**Controle de acesso** é o conjunto de regras que decide *quem pode fazer o quê*. Autenticação responde "**quem é você?**"; autorização responde "**você pode fazer isso?**". Broken Access Control é quando a aplicação **erra na autorização** — ela sabe quem você é, mas esquece de checar se você *pode* acessar aquele recurso ou executar aquela função.

> **Analogia:** é o hotel que confere seu nome no balcão (autenticação) mas entrega um cartão que abre **qualquer** quarto, não só o seu (autorização quebrada). Pior: às vezes o cartão também abre a sala de controle do hotel.

Dentro dessa família existem três siglas que você precisa dominar:

| Sigla | Nome | O que o atacante faz |
|---|---|---|
| **IDOR** | Insecure Direct Object Reference | Troca o **identificador de um objeto** (`id`, `cpf`, `chargeId`) e acessa dado de outro usuário |
| **BOLA** | Broken Object Level Authorization | Mesmo conceito do IDOR, mas o termo oficial de **API** (é o #1 do [OWASP API Top 10](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)) |
| **BFLA** | Broken Function Level Authorization | Acessa uma **função/ação** que devia ser só de outro perfil (ex.: usuário comum executa ação de admin) |

Resumindo a diferença que mais confunde:
- **IDOR/BOLA** = acesso indevido a um **objeto/dado** ("vejo a fatura de outra pessoa").
- **BFLA** = acesso indevido a uma **função** ("executo uma ação de administrador sendo usuário comum").

## Por que isso importa (e quanto paga)

O impacto é direto e fácil de explicar pro programa — por isso paga bem:

- **Vazamento de PII em massa** (PII = dado pessoal identificável: nome, CPF, e-mail, endereço — [Glossário](/posts/fundamentos-web-hacking/)): enumerar IDs sequenciais e baixar dados de **todos** os clientes (nome, CPF, endereço, faturas).
- **Account Takeover (ATO)**: trocar um identificador num fluxo de reset/refresh de senha e assumir a conta de qualquer um.
- **Ações privilegiadas**: um cliente comum bloqueando/alterando recursos que só o admin deveria mexer (BFLA).

Em programas reais, falhas dessa família costumam pagar de **R$500** (um IDOR simples, baixo impacto) até **R$10.000+** (BFLA com ação crítica ou IDOR expondo PII em escala). O que define o valor é o **impacto** — e impacto aqui é sobre *dado sensível* e *escala* (quantas contas dá pra afetar).

> ⚠️ **Cheque o escopo antes.** Existem programas que colocam IDOR **fora de escopo** — e outros que pagam muito bem. Ler as regras do programa é parte do trabalho.

## Como funciona por trás

A raiz quase sempre é a mesma: o servidor **confia em um identificador que veio do cliente** e não verifica se aquele usuário é o **dono** do objeto (ou se tem permissão pra função).

Fluxo vulnerável típico:

```http
GET /api/pedidos?id=1001 HTTP/2
Host: alvo.com
Authorization: Bearer eyJhbGciOi...   # <- você está autenticado como Usuário B
```

```php
// Backend VULNERÁVEL — busca o objeto, mas nunca checa o dono
$pedido = $db->query("SELECT * FROM pedidos WHERE id = " . $_GET['id']);
return json($pedido);   // entrega pra qualquer um autenticado
```

O servidor sabe que você é o Usuário B (token válido), mas entrega o pedido `1001` mesmo que ele seja do Usuário A. **Faltou a checagem de propriedade** (`WHERE id = ? AND dono_id = usuario_logado`).

> 💡 **Token / `Authorization: Bearer`**: a credencial que prova quem você é em cada request (sem ele, você não está "logado"). Costuma ser um **JWT** (`header.payload.signature` em Base64URL). Detalhe no [Glossário](/posts/fundamentos-web-hacking/).

## Tipos e variações

1. **IDOR por ID numérico sequencial** — o clássico: `?id=1001` → `?id=1002`.
2. **IDOR em parâmetro "de negócio"** — não é um `id` óbvio: `?cpf=`, `?NroConta=`, `?chargeId=`, `?id_subgrupo=`.
3. **IDOR no corpo (POST/PUT) ou em header** — o identificador vai no JSON ou num header customizado, não na URL.
4. **IDOR por troca de token entre contas** — você mantém **seu** acesso, mas usa um endpoint que **outro perfil** acessa, trocando só o token de autorização (clássico em downloads de relatório).
5. **IDOR "mascarado"** — o ID é um UUID/hash/valor criptografado. Às vezes a própria API te devolve o valor já criptografado de um parâmetro, e aí dá pra reusar (veremos no caso prático).
6. **BFLA** — o endpoint da função privilegiada existe e responde, só não devia aceitar o seu perfil.

## Recon — como encontrar

Antes de explorar, você precisa **mapear superfícies**. Onde IDOR/BFLA se escondem:

- **Tudo que carrega "um recurso meu"**: faturas, pedidos, perfis, mensagens, downloads de relatório, anexos, tickets.
- **Parâmetros com identificador**: `id`, `user_id`, `uuid`, `cpf`, `conta`, `chargeId`, `orderId`, `documentId`, `file`.
- **Fluxos de conta**: reset de senha, troca de e-mail, refresh token, convites — ótimos pra ATO.
- **Funções por perfil (BFLA)**: logue como **admin**, anote **todos** os endpoints/ações que só o admin enxerga; depois tente chamá-los autenticado como **usuário comum**.

Dicas de descoberta:

```bash
# Endpoints e parâmetros escondidos vivem nos arquivos JS
echo https://alvo.com | gau | grep '\.js$' | httpx -mc 200 -content-type | grep javascript
# leia CADA arquivo: paths de API, nomes de parâmetros, rotas de admin
```

```text
# Google dorks pra achar docs de API (onde os IDs e endpoints aparecem)
site:alvo.com inurl:apidocs | inurl:swagger | inurl:api-docs | inurl:v1
```

> 💡 **Regra de ouro do recon de IDOR:** trabalhe **sempre com 2 contas** (Conta A e Conta B), de preferência de perfis diferentes. Você precisa do objeto de A pra tentar acessar com B — sem isso, fica adivinhando.

## Exploração passo a passo (do básico ao avançado)

### Nível 1 — Enumerar ID na URL (GET)
O básico. Mande sua própria request no **Burp Repeater**, troque o ID e veja se volta dado de outro usuário.

```http
GET /api/faturas/charge-details?chargeId=10051002 HTTP/2   # sua fatura
GET /api/faturas/charge-details?chargeId=10051001 HTTP/2   # <- troca: fatura de outro?
```

Se voltou dado que não é seu → IDOR confirmado. Pra mostrar **escala**, use o **Burp Intruder** com um payload numérico (payload = a lista de valores que o Burp injeta automaticamente; `Sniper` é o modo que varia uma posição por vez — aqui, o `chargeId`) e veja quantos IDs respondem 200 com dados distintos.

### Nível 2 — ID no corpo / método não-óbvio
Nem todo IDOR está na URL. Teste o identificador no JSON do POST/PUT, em headers (`X-User-Id`) e troque o **método** (se `GET /pedido/1001` é checado mas `POST`/`PUT` não).

```http
PUT /api/usuario HTTP/2
Host: alvo.com
Content-Type: application/json
Authorization: Bearer <token_da_Conta_B>

{"userId": 1001, "telefone": "11999999999"}   # <- 1001 é da Conta A
```

### Nível 3 — Troca de token (Broken Access Control em função)
Padrão campeão em downloads de relatório. **Conta A** tem acesso à funcionalidade; **Conta B** não. Você dispara a request **com a Conta A**, intercepta no Burp e **troca só o token** pelo da Conta B:

```http
POST /api/relatorios/download HTTP/2
Host: alvo.com
Authorization: Bearer <token_da_Conta_B>   # <- troca aqui (era da Conta A)
Content-Type: application/json

{"reportId": 42}
```

Se o relatório **baixa mesmo com o token da Conta B** (que não tinha acesso), você provou que a autorização da **função** está quebrada.

### Nível 4 — BFLA (função privilegiada com perfil comum)
Logue como admin **e** como usuário comum (navegadores/sessões diferentes). Pegue uma ação que só o admin faz (ex.: "bloquear loja", "alterar dados de outro usuário") e refaça a request com o token do usuário comum:

```http
POST /api/admin/store/block HTTP/2
Authorization: Bearer <token_do_usuario_comum>   # <- perfil sem permissão
{"storeId": 77}
```

Resposta `200`/ação executada = **BFLA**.

### Nível 5 — Avançado: IDs "protegidos"
- **UUID/hash:** se não é sequencial, procure o ID **vazando** em outras respostas (listagens, JS, notificações, e-mails) e reuse.
- **Valor criptografado devolvido pela própria API:** alguns endpoints recebem um parâmetro e, na **resposta**, devolvem esse valor **já criptografado/assinado**. Dá pra pegar esse valor de um objeto e injetá-lo na request de outro — você não quebrou a cripto, só **reaproveitou** o que o servidor te deu.
- **ATO via fluxo de senha:** intercepte o reset/refresh e troque o **identificador do usuário** (login/e-mail) no parâmetro:

```http
POST /autenticacao/api/v1/alterar-senha HTTP/2
{"usuario": "vitima_alvo", "novaSenha": "Senha123!", "confirmaSenha": "Senha123!"}
# <- "usuario" deveria ser fixo na sessão; se aceitar outro, é ATO
```

## Caso real-fictício: IDOR → vazamento de PII em faturas

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você está testando `app.exemplo.com`, uma plataforma financeira. Na área "Financeiro → Faturas", ao abrir uma fatura, o Burp registra:

```http
GET /api/billing/statement/charge-details?chargeId=10051002 HTTP/2
Host: app.exemplo.com
Authorization: Bearer <seu_token>
```

**Passo 1 — Confirmar.** No Repeater, troco `10051002` por `10051001`:

```http
HTTP/2 200 OK
Content-Type: application/json

{"chargeId":10051001,"customerName":"OUTRO CLIENTE","cpf":"***.***.***-**",
 "invoiceUrl":"/files/nfse/10051001.pdf","amount":299.50}
```

Voltou a fatura de **outro cliente** — nome, CPF e link da nota fiscal (NFS-e). IDOR confirmado.

**Passo 2 — Mostrar escala.** Burp Intruder, `Sniper` no `chargeId`, payload numérico `10050000–10052000`. Centenas de `200 OK` com clientes diferentes → não é caso isolado, é **vazamento em massa de PII**.

**O que a tela do Burp mostraria:** painel Request/Response lado a lado; na Response, o JSON com `customerName`/`cpf` de um cliente que não é o da conta logada — destacado em vermelho o `chargeId` trocado.

**Passo 3 — Report.** Título `[IDOR] - Exposição de faturas e NFS-e (PII) via troca de chargeId`. Resumo focado no risco ao negócio: *"qualquer cliente autenticado consegue ler faturas e notas fiscais (com CPF) de todos os outros, violando a LGPD"*. Passos numerados + prints. Severidade **Crítica** (PII em escala). (Veja o post [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

## Defesa em camadas

A correção real é **sempre no servidor** e por objeto. Frontend não conta.

**1. Cheque a propriedade do objeto (object-level), não só o login:**

```php
// ERRADO — confia no id do cliente
$pedido = Pedido::find($_GET['id']);

// CORRETO — só devolve se o objeto for do usuário logado
$pedido = Pedido::where('id', $req->id)
                ->where('dono_id', auth()->id())   // <- a checagem que faltava
                ->firstOrFail();                    // 404 se não for dono
```

```javascript
// Node/Express — autorização por dono
const pedido = await Pedido.findOne({ _id: req.params.id, donoId: req.user.id });
if (!pedido) return res.sendStatus(404);
```

**2. Autorização por função (contra BFLA):** valide o **papel** em TODA rota privilegiada, no backend — não esconda o botão no front e ache que resolveu.

```python
# Django/DRF — nega por padrão
@permission_classes([IsAdminUser])
def block_store(request): ...
```

**3. Princípios que matam a classe inteira:**
- **Deny by default**: tudo é negado a menos que explicitamente permitido.
- **Não confie em NADA do cliente** pra decidir autorização (id, role, flags no JWT do lado errado).
- **IDs imprevisíveis** (UUID v4) ajudam contra enumeração — mas **não substituem** a checagem de dono.
- **Logue e alerte** acessos negados/anômalos (enumeração gera muitos 403/404).
- **Teste de autorização no CI**: para cada endpoint, um teste "Conta B não acessa objeto de Conta A".

> ❌ **O que NÃO basta:** esconder o botão no frontend, usar UUID sem checar dono, confiar no `role` que veio no corpo da request, ou bloquear só o método `GET` e esquecer `POST/PUT/DELETE`.

## Ferramentas + labs legais

- **Burp Suite** — Repeater (trocar IDs), Intruder (enumerar), e extensões **Autorize** / **AuthMatrix** (testam automaticamente "acesso com a outra conta").
- **ffuf / Param miners** — descobrir parâmetros e IDs.
- **Labs pra praticar (autorizados):** [PortSwigger Web Security Academy — Access Control](https://portswigger.net/web-security/access-control) (a melhor fonte gratuita), DVWA, [bWAPP](http://www.itsecgames.com/), TryHackMe, HackTheBox, HackingClub.

## Checklist do caçador

- [ ] Criei **2 contas** (perfis diferentes quando possível).
- [ ] Mapeei todo parâmetro com identificador (`id`, `cpf`, `chargeId`, `conta`, `uuid`...).
- [ ] Testei troca de ID em **GET, POST, PUT, DELETE** e no **corpo/headers**.
- [ ] Testei **troca de token** entre Conta A e Conta B em funções restritas.
- [ ] Como admin, anotei ações privilegiadas e tentei chamá-las como **usuário comum** (BFLA).
- [ ] Procurei IDs/valores **vazando** em respostas, JS e e-mails (pra IDs não-sequenciais).
- [ ] Mostrei **escala/impacto** (Intruder) e identifiquei **dado sensível** (PII).
- [ ] Conferi que IDOR **está no escopo** do programa.

## O que você precisa lembrar

- **IDOR/BOLA** = acesso a **objeto** de outro; **BFLA** = acesso a **função** de outro perfil.
- A causa é sempre **falta de checagem de propriedade/permissão no servidor**.
- O dinheiro está no **impacto**: PII + escala + ação crítica.

> 💡 **Dica de ouro:** se você consegue **ler ou alterar** algo trocando um identificador, e o servidor não reclama, **provavelmente é Broken Access Control**. Sempre teste com duas contas — é a diferença entre "achar que tem bug" e **provar** que tem.

## Nota ética

Tudo aqui é pra **testes autorizados** — programas de bug bounty (dentro do escopo), pentests contratados e labs legais. Trocar IDs em sistemas de terceiros sem autorização é crime, além de desnecessário quando existe tanto lab bom pra treinar. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [OWASP A01:2021 — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP API Security — BOLA (API1:2023)](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) e [BFLA (API5:2023)](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [PortSwigger — Access control vulnerabilities](https://portswigger.net/web-security/access-control)
- [reddelexc/hackerone-reports — Top IDOR reports](https://github.com/reddelexc/hackerone-reports/blob/master/tops_by_bug_type/TOPIDOR.md) (mais de 200 reports reais pra estudar)

---
*Próximo na série: [Account Takeover — JWT, reset de senha e OAuth](/posts/account-takeover/) · base: [Recon & Discovery](/posts/recon-discovery/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
