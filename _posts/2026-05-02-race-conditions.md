---
title: "Race Conditions: explorando a janela entre checar e usar"
description: "Como a janela de milissegundos entre verificar uma regra e aplicá-la deixa você usar um cupom, um saque ou um voto várias vezes — e como achar, explorar (single-packet attack) e corrigir."
author: matheus
date: 2026-05-02 11:15:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["race condition", "TOCTOU", "limit-overrun", "single-packet attack", "Turbo Intruder", "Burp Suite", "business logic", "web security", "bug bounty"]
image: /assets/img/covers/race-conditions.png
pin: false
comments: true
---

## Quando "resgatar 1 vez" vira "resgatar 30 vezes"

Imagina um cupom de R$50 que só pode ser usado **uma vez por conta**. Você aplica, ganha o desconto, fim. Agora imagina que, em vez de clicar uma vez, você dispara **20 requisições idênticas no mesmo milissegundo**. O servidor recebe todas quase juntas, e cada uma faz a mesma pergunta (*"esse cupom já foi usado?"*) **antes** de qualquer uma ter terminado de marcar o cupom como usado. Todas leem "ainda não foi usado". Resultado: R$1.000 de desconto com um cupom de R$50.

Isso é uma **race condition** (condição de corrida). A falha não está no cupom em si: está no **intervalo de tempo** entre o servidor *checar* a regra e *aplicar* o efeito. Esse intervalo é a "janela de corrida", e às vezes ela dura menos de 1 milissegundo. Por muitos anos race conditions foram consideradas "difíceis de explorar via rede" por causa da latência. Em 2023, o **single-packet attack** do James Kettle (PortSwigger Research) mudou esse jogo, e é por isso que esse bug voltou com tudo pros programas de bug bounty. Neste post a gente vai do conceito até a exploração técnica perfeita, com defesa de verdade.

## O que é uma race condition (TOCTOU)

**Analogia:** pensa numa porta giratória de banco que só deixa passar uma pessoa por vez. O segurança olha, vê que está vazia, libera. Mas se **três pessoas empurram a porta no mesmo instante**, todas passam antes do segurança "atualizar" o que viu. Ele checou um estado (vazia) e agiu (liberou), mas entre o *checar* e o *agir* o mundo mudou.

Tecnicamente, isso é um **TOCTOU** (*time-of-check to time-of-use*, tempo-da-checagem até tempo-do-uso). A aplicação faz duas coisas que **deveriam ser uma só, indivisível**:

1. **Check (checar):** "esse cupom já foi usado?" / "tem saldo?" / "esse usuário já votou?"
2. **Use (usar):** aplica o desconto / debita o saldo / registra o voto.

Quando essas duas etapas **não são atômicas** (não acontecem como um bloco único e protegido), abre-se uma janela. Se você conseguir enfiar uma segunda operação **dentro** dessa janela (antes da primeira terminar de escrever o resultado), você "corre" contra o sistema. Daí o nome.

> **Conceito-chave:** race condition não é sobre "mandar muita request" (isso é força bruta / rate limiting). É sobre **timing**: mandar requests concorrentes que colidem **no mesmo registro** dentro da janela em que o estado ainda não foi atualizado.

## Por que isso importa (e quanto paga)

O impacto é quase sempre **financeiro e direto**, o que faz o programa entender rápido:

- **Limit overrun (estouro de limite):** usar um cupom/gift card/promoção N vezes, sacar dinheiro além do saldo, votar/avaliar várias vezes, resgatar pontos de fidelidade repetidamente.
- **Bypass de limites de negócio:** burlar "máximo 1 por cliente", "1 voto por usuário", "1 cadastro por CPF". No fundo, o race é uma forma de quebrar uma **regra de negócio** pela janela de timing. É primo direto das falhas de [Business Logic](/posts/business-logic/).
- **Estados inconsistentes:** transferir o mesmo dinheiro pra duas contas, confirmar um pedido duas vezes, criar dois recursos que deviam ser únicos.
- **Bypass de segurança em sub-estados:** janelas onde a sessão já existe mas o 2FA ainda não foi marcado como obrigatório (falaremos disso adiante).

> 💡 **2FA/MFA**: autenticação de dois/múltiplos fatores; além da senha, exige um segundo fator (código, app, SMS). Mais no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

A faixa de bounty varia muito com o **impacto provado**: um race em algo cosmético (avaliar uma vez a mais) costuma ser **Low** e paga de **R$200 a R$500**; um race que deixa **sacar/transferir dinheiro além do saldo** ou **multiplicar crédito** salta pra **High/Critical** e pode pagar **vários milhares de reais**. O que muda o número é sempre: *dá pra transformar isso em dinheiro ou em dano real, e em que escala?*

> 📊 **Como o race pontua (CVSS).** Pra falar a língua do triador, leve um vetor junto: cito o **v3.1** (ainda o mais usado nos programas) e o **v4.0** ao lado. Repare que o que move o score é o **tipo de impacto** (`I`/`VI`): o limit-overrun corrompe **integridade** do estado (contador, saldo, unicidade), raramente confidencialidade.
>
> | Cenário do race | CVSS v3.1 | CVSS v4.0 (vetor) |
> |---|---|---|
> | **Cosmético** (voto/avaliação múltipla — o caso deste post) | **4.3 Médio** — `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N` | `AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N` — **Médio** |
> | **Limit-overrun financeiro** (sacar/multiplicar crédito além do saldo) | **6.5 Médio** — `AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N` (sobe a **7.1 Alto** com `A:L`, ou **7.5 Alto** se o endpoint for não autenticado, `PR:N`) | `AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N/SC:N/SI:N/SA:N` — **Alto** |
>
> Os decimais do **v3.1** acima foram calculados na [calculadora oficial do FIRST](https://www.first.org/cvss/calculator/3.1); para o decimal exato do **v4.0**, rode o vetor na [calculadora v4.0](https://www.first.org/cvss/calculator/4.0) (a escala do v4.0 **não é linear**, então cito a faixa qualitativa + o vetor pra você reproduzir). O número-base do race costuma travar em **Médio/Alto**; é a **escala** (multipliquei crédito quantas vezes? afetei quantas contas?) que você argumenta em texto pra justificar a severidade real, sem inflar o vetor. Como calibrar isso com o triador: [Severidade & Impacto na Triagem](/posts/severidade-impacto-triagem/).

> 💡 Já vimos em [Severidade & Impacto na Triagem](/posts/severidade-impacto-triagem/) que **o impacto é o que paga**. Num race, o impacto é literalmente *quantas vezes você conseguiu repetir o que deveria ser único*. Quantifique isso no report.

## Como funciona por trás

Vamos abrir o capô. Um fluxo de resgate de cupom **vulnerável** costuma ser assim no backend:

```php
// VULNERÁVEL — check e use separados, sem trava (não-atômico)
$cupom = $db->query("SELECT * FROM cupons WHERE codigo = ? AND usado = 0", [$codigo]);

if ($cupom) {                                  // (1) CHECK: ainda não usado?
    aplicarDesconto($usuario, $cupom->valor);  // (2) USE: dá o desconto
    $db->query("UPDATE cupons SET usado = 1 WHERE id = ?", [$cupom->id]); // (3) marca
}
```

Lido sequencialmente, parece correto. Mas pensa em **duas requisições chegando quase juntas**, cada uma numa thread/processo do servidor:

```
tempo →
Req A:  SELECT (usado=0? sim) ── aplicaDesconto ── UPDATE usado=1
Req B:        SELECT (usado=0? sim) ── aplicaDesconto ── UPDATE usado=1
                  ↑
        B leu "usado=0" ANTES de A escrever "usado=1"
```

As duas leram `usado = 0` **na mesma janela**, as duas aplicaram o desconto, e só então as duas escreveram `usado = 1`. O `UPDATE` final nem reclama: ele só seta `1` duas vezes. O dano já foi feito **entre o SELECT e o UPDATE**.

Do lado de fora (atacante), o que você faz é simplesmente disparar várias requisições idênticas **o mais simultâneas possível** (o header `Authorization: Bearer <token>` é a sua credencial de sessão que prova quem você é; ver [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série)):

```http
POST /api/cupom/resgatar HTTP/2
Host: alvo.com
Authorization: Bearer <seu_token>
Content-Type: application/json

{"codigo":"PROMO50"}        # <- esta MESMA request, mandada 20x em paralelo
```

Quanto mais juntas elas chegarem no servidor, maior a chance de várias caírem dentro da janela. É por isso que **o timing é tudo**, e por isso técnicas como o single-packet attack importam tanto.

## Tipos e variações

| Tipo | Janela explorada | Exemplo clássico |
|---|---|---|
| **Limit overrun** | Entre checar limite e decrementá-lo | Cupom/gift card usado N vezes; saque acima do saldo |
| **Multi-request no mesmo recurso** | Entre ler e gravar o mesmo registro | 2 transferências do mesmo saldo; voto duplicado |
| **Sub-estados ocultos** | Estado intermediário de uma única operação | Sessão válida mas 2FA ainda não exigido; cadastro meio-criado |
| **Multi-endpoint (multistep)** | Janela entre dois endpoints diferentes | Aplicar cupom enquanto finaliza o pedido |
| **Single-request, múltiplos efeitos** | Dentro do processamento de 1 request | Arrays vazios (`param[]`) batendo com `null` durante init |

A grande sacada da pesquisa moderna (Kettle, *Smashing the State Machine*, Black Hat USA 2023 / DEF CON 31) foi mostrar que **toda requisição HTTP pode transitar a aplicação por vários estados ocultos e fugazes**, não só o óbvio "limit overrun". Esses sub-estados duram ~1ms e, com a ferramenta certa, dá pra disparar requests exatamente dentro deles.

## Recon: como encontrar candidatos

Antes de atirar requests em paralelo, você **prediz** onde pode haver colisão. A metodologia oficial do PortSwigger é **Predict → Probe → Prove** (prever, sondar, provar). Procure endpoints (cada URL/rota da API que recebe uma requisição; detalhe no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série)) que:

- **Operam sobre o mesmo registro** com "uma vez só" embutido: resgate de cupom, aplicar voucher, votar, avaliar, "curtir", confirmar pagamento, sacar, transferir, resgatar pontos.
- **Têm um limite numérico** que decrementa: saldo, estoque, quantidade de usos, créditos.
- **Têm regra de unicidade de negócio:** "1 por CPF", "1 cadastro por e-mail", "só pode aplicar 1 cupom".
- **Fluxos de conta sensíveis:** confirmar e-mail, habilitar/exigir 2FA, trocar senha, onde existem estados intermediários.

Sinais no tráfego (olhe no proxy do Burp, o intermediário que intercepta e mostra cada request; ver [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série)):

```text
# parâmetros e paths que cheiram a "ação única / limite"
/resgatar  /redeem  /apply-coupon  /vote  /rate  /withdraw  /transfer  /claim
?couponCode=  ?voucher=  ?amount=  qualquer "usado/used/claimed/once"
```

> 💡 Já vimos coleta de endpoints e JS no post [Recon & Discovery](/posts/recon-discovery/) (com `gau`, `katana`, `httpx`). Aqui o recon é mais cirúrgico: você não quer *todos* os endpoints, quer os que mexem em **dinheiro, contagem ou unicidade**.

## Exploração passo a passo (do básico ao avançado)

### Nível 0: Benchmark (NÃO pule isso)
Antes de tentar o ataque, entenda o comportamento **normal**. Mande a request **uma vez** e veja a resposta. Depois mande algumas em **sequência** (separadas) e confirme que o servidor responde "cupom já usado" / "limite atingido" como deveria. Esse é o seu controle: sem ele você não sabe se "funcionou".

No Burp: selecione as requests no Repeater como um **grupo de abas** e use **"Send group in sequence (separate connections)"**. Isso é a linha de base.

### Nível 1: Burp Repeater e o "Send group in parallel"
A forma mais simples e moderna de testar. A partir do **Burp Suite 2023.9+**, o Repeater faz o single-packet attack pra você:

1. Mande a request vulnerável pro **Repeater**.
2. Duplique a aba várias vezes (ex.: 20 cópias idênticas).
3. Selecione todas → adicione a um **tab group** (clique direito → *Add tab to group*).
4. Clique na setinha ao lado de *Send* e escolha **"Send group in parallel"**.

O Burp decide a técnica sozinho: em **HTTP/2** usa o **single-packet attack**; em **HTTP/1** cai pro **last-byte synchronization**. Se duas ou mais respostas voltarem com `200`/sucesso quando *só uma* deveria, você tem um race.

```http
# As 20 abas no grupo são esta MESMA request — disparadas "ao mesmo tempo"
POST /api/cupom/resgatar HTTP/2
Host: alvo.com
Authorization: Bearer <seu_token>
Content-Type: application/json

{"codigo":"PROMO50"}
```

### Nível 2: Turbo Intruder (single-packet attack)
Quando você quer controle fino, escala (20-30 requests) ou precisa de wordlist, use a extensão **Turbo Intruder** (BApp Store). Mande a request pro Turbo Intruder e use o template oficial `race-single-packet-attack.py`:

```python
def queueRequests(target, wordlists):
    # HTTP/2 -> Engine.BURP2 dispara o single-packet attack
    # HTTP/1 -> use Engine.THREADED ou Engine.BURP
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           engine=Engine.BURP2)

    # 'gate' segura um pedaço de cada request até openGate() ser chamado
    for i in range(20):
        engine.queue(target.req, gate='race1')

    # libera as 20 requests sincronizadas (em 1 pacote TCP no HTTP/2)
    engine.openGate('race1')


def handleResponse(req, interesting):
    table.add(req)
```

**O que cada parte faz, sem mágica:**
- `concurrentConnections=1` + `Engine.BURP2`: força **uma conexão HTTP/2** e o modo single-packet.
- `engine.queue(..., gate='race1')`: enfileira a request, mas **segura o último fragmento** de cada uma (o "portão" fechado).
- `engine.openGate('race1')`: **abre o portão**, soltando os fragmentos finais de todas as 20 requests **juntos**, num único pacote TCP. Elas chegam ao servidor praticamente no mesmo instante.

### Nível 3: O single-packet attack, por dentro (o "porquê")
Aqui está o pulo do gato que tornou races exploráveis remotamente. O problema histórico era o **network jitter**: mesmo mandando 20 requests "juntas", a rede entrega cada uma com um atraso ligeiramente diferente (1ms aqui, 4ms ali), e elas chegam **espalhadas**, fora da janela de ~1ms.

O **single-packet attack** resolve assim, usando **multiplexação do HTTP/2** (que permite várias "streams"/requests numa mesma conexão):

1. Envia **quase tudo** de cada uma das 20 requests, **menos o último frame** (um fragmento minúsculo é retido).
2. Espera todas estarem "prontas, faltando só o empurrãozinho".
3. Dispara os **20 frames finais dentro de um único pacote TCP**.

Como tudo chega no mesmo pacote, o servidor recebe e processa as 20 requests **ao mesmo tempo, independente do jitter da rede**. Isso comprime a entrega pra uma janela mediana de **~1ms**: o Kettle demonstrou de **20 a 30 requests** atravessando ~17.000 km (Melbourne ↔ Dublin) e ainda chegando com spread mediano de ~1ms. Na prática: a race condition remota passa a ser tão confiável quanto se você estivesse atacando *localhost*.

> Em HTTP/1.1 não dá pra multiplexar, então a técnica anterior é o **last-byte synchronization**: você manda quase todas as requests, segura o último byte de cada uma, e solta todos os últimos bytes juntos. Funciona, mas tem ~4ms de espalhamento, pior que o single-packet, então prefira HTTP/2 quando o alvo suportar.

### Nível 4: Sub-estados e multi-endpoint (avançado)
Nem todo race é "repetir a mesma request". Às vezes a janela está **dentro do processamento de uma operação**. Exemplo clássico de sub-estado, em pseudocódigo de login:

```python
# Existe um instante entre estas duas linhas em que a sessão é VÁLIDA
# mas o 'enforce_mfa' ainda não foi setado:
session['userid'] = user.userid       # <- já logado aqui
if user.mfa_enabled:
    session['enforce_mfa'] = True      # <- janela: antes daqui, sem MFA
```

Disparando requests concorrentes (uma de login, outra batendo num endpoint protegido) dá pra "entrar" nesse instante e usar a sessão **antes do 2FA ser exigido**. Aqui o single-packet attack deixa de ser só "limit overrun" e vira um vetor de **account takeover**: bypass de 2FA é uma das aplicações que o Kettle demonstrou. Como esse abuso se conecta com os outros caminhos de ATO (reset de senha, JWT, OAuth), veja [Account Takeover](/posts/account-takeover/).

Pra **multi-endpoint** (a janela está entre dois endpoints diferentes), o alinhamento é mais difícil por causa de tempos de processamento distintos. Truques oficiais:
- **Connection warming:** mande um `GET /` antes pra "esquentar" a conexão e normalizar o atraso do backend.
- Se o timing oscilar, abuse do rate limit do próprio alvo: dispare **requests dummy** pra forçar um atraso no servidor e alinhar a janela.

## Caso real-fictício: race no endpoint de avaliação (voto múltiplo)

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você testa `app.exemplo.com`, uma plataforma de cursos. Cada usuário pode **avaliar um conteúdo uma única vez** (de 1 a 5 estrelas), e a média é exibida publicamente. Ao avaliar, o Burp registra:

```http
POST /api/v2/streamings/1001/rate HTTP/2
Host: app.exemplo.com
Authorization: Bearer <seu_token>
Content-Type: application/json

{"score":5}
```

**Passo 1, Benchmark.** No Repeater, mando a request 3x em **sequência**. A 1ª responde `200`; a 2ª e 3ª respondem `409 Conflict` com `{"error":"já avaliado"}`. Comportamento normal: 1 voto por usuário. Bom.

**Passo 2, Atacar.** Duplico a aba 20 vezes, jogo num **tab group** e uso **"Send group in parallel"** (single-packet, pois é HTTP/2). Resposta:

```http
HTTP/2 200 OK
Content-Type: application/json

{"streamingId":1001,"score":5,"accepted":true}
```

E **não foi só uma** que voltou `200`: **8 das 20** retornaram `accepted: true`. As outras 12 deram `409`. Ou seja: das 20, **8 colidiram dentro da janela** e registraram voto.

**Passo 3, Provar o impacto.** Recarrego a página do conteúdo: a média de avaliação saltou, contabilizando **8 votos meus** num recurso que deveria aceitar **1**. Com o Turbo Intruder e várias rodadas, consigo empurrar a nota de qualquer conteúdo pra cima (ou pra baixo). Isolei o conjunto mínimo: o efeito reproduz com ~10 requests paralelas.

**O que a tela do Burp mostraria:** a aba *Logger*/grupo de respostas com várias linhas `200 OK accepted:true` lado a lado, todas com timestamps praticamente idênticos, destacando que múltiplas passaram onde só uma deveria.

**Passo 4, Report.** Título `[Race Condition] - Voto/avaliação múltipla via requests concorrentes (single-packet attack)`. Resumo focado no negócio: *"a regra de '1 avaliação por usuário' pode ser burlada disparando requisições concorrentes, permitindo inflar/deflacionar a nota de qualquer conteúdo e manipular o ranking público"*. Inclua o **benchmark sequencial** (mostra a regra funcionando) + o **resultado paralelo** (mostra a quebra). Esse contraste é o que prova o bug. (Veja [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

> ⚠️ Esse mesmo padrão num endpoint de **saque/cupom/saldo** sobe a severidade de Low pra High/Critical. A técnica é idêntica; só muda o que está em jogo.

## Defesa em camadas

A correção real é **tornar o check-e-use atômico** ou **impossível de duplicar**. Tudo no servidor: concorrência não se resolve no frontend.

**1. Transação + trava no banco (a defesa principal).** Use uma transação e **trave a linha** que você vai ler-e-atualizar, pra que a segunda request **espere** a primeira terminar:

```php
// CORRETO — SELECT ... FOR UPDATE trava a linha dentro da transação
$db->beginTransaction();
$cupom = $db->query(
    "SELECT * FROM cupons WHERE codigo = ? AND usado = 0 FOR UPDATE", // <- trava aqui
    [$codigo]
);
if ($cupom) {
    $db->query("UPDATE cupons SET usado = 1 WHERE id = ?", [$cupom->id]);
    aplicarDesconto($usuario, $cupom->valor);
}
$db->commit(); // libera a trava só agora — a Req B só lê depois disto
```

A request B fica **bloqueada** no `SELECT ... FOR UPDATE` até a A dar `commit`; quando B finalmente lê, vê `usado = 1` e é negada. A janela some.

**2. Operação atômica num único comando.** Melhor ainda: não separe check e use. Deixe o **banco** decidir, num comando só, e confie no número de linhas afetadas:

```sql
-- decrementa SÓ se ainda houver saldo; atômico no próprio UPDATE
UPDATE contas SET saldo = saldo - 100
 WHERE id = :id AND saldo >= 100;
-- se affected_rows = 0 -> não tinha saldo, rejeita. Sem janela.
```

**3. Restrição de unicidade no schema.** Pra "1 por X", deixe o banco garantir: duas inserções concorrentes não furam um índice único:

```sql
-- o banco rejeita a 2ª inserção concorrente com erro de duplicidade
ALTER TABLE avaliacoes
  ADD CONSTRAINT uq_user_streaming UNIQUE (user_id, streaming_id);
```

**4. Idempotency keys.** Pra ações tipo pagamento, exija uma chave de idempotência única por operação; requests repetidas com a mesma chave retornam o **mesmo** resultado, sem reexecutar:

```http
POST /api/pagamentos HTTP/2
Idempotency-Key: 3f1c9a7e-...-única-por-operação   # <- repetiu? devolve o 1º resultado
```

```javascript
// Node — grava a chave atomicamente; 2ª request com a mesma chave não reexecuta
const ok = await redis.set(`idem:${key}`, '1', 'NX', 'EX', 86400); // NX = só se não existir
if (!ok) return res.status(409).json({ error: 'requisição duplicada' });
// ... processa pagamento ...
```

> ❌ **O que NÃO basta:** desabilitar o botão no front após o clique; um `SELECT` seguido de `UPDATE` **sem** transação/trava (continua não-atômico); confiar em rate limiting (race usa *poucas* requests, dentro do limite); um `if (usado) return` em memória da aplicação sem garantia no banco.

## Ferramentas + labs legais

- **Burp Suite**: Repeater com **"Send group in parallel"** (single-packet automático em HTTP/2) e **"Send group in sequence"** pro benchmark.
- **Turbo Intruder** (BApp Store): extensão do James Kettle; template `race-single-packet-attack.py` pra escala e wordlists.
- **Labs pra praticar (autorizados):** [PortSwigger Web Security Academy — Race conditions](https://portswigger.net/web-security/race-conditions) (5 labs, do limit overrun ao multi-endpoint, a melhor fonte gratuita), além de THM/HTB.

## Checklist do caçador

- [ ] Mapeei endpoints que operam sobre **o mesmo registro** com regra de "uma vez/limite/unicidade".
- [ ] Fiz o **benchmark sequencial** primeiro (provei que a regra funciona normalmente).
- [ ] Disparei o ataque com **"Send group in parallel"** (single-packet em HTTP/2).
- [ ] Confirmei o alvo em **HTTP/2** (single-packet); se HTTP/1, usei last-byte sync.
- [ ] Para escala/wordlist, usei **Turbo Intruder** (`Engine.BURP2`, `gate`/`openGate`).
- [ ] Contei **quantas** requests passaram onde só uma deveria (quantifiquei o impacto).
- [ ] Testei sub-estados (2FA/sessão) e races multi-endpoint quando fazia sentido.
- [ ] Mostrei no report o contraste **sequencial (ok) × paralelo (quebrou)**.

## Pegadinhas / o que NÃO funciona

- **Confundir com rate limiting:** mandar 10.000 requests é força bruta. Race é **poucas requests, no timing certo**, sobre o mesmo recurso. São bugs diferentes.
- **Testar em HTTP/1 e achar que "não tem race":** o jitter pode mascarar a janela. Tente HTTP/2 + single-packet antes de descartar.
- **Não fazer benchmark:** sem a linha de base sequencial, você não consegue provar (nem pra você) que o paralelo quebrou algo.
- **Resultado não-determinístico:** races nem sempre disparam em 100% das tentativas. Rode **várias vezes**; uma única passagem indevida já é o bug.
- **"O UPDATE final conserta":** não conserta. O dano acontece **antes** dele, na janela entre o SELECT e o UPDATE.

## O que você precisa lembrar

- Race condition = explorar a **janela entre checar e usar** (TOCTOU) disparando operações concorrentes sobre o **mesmo registro**.
- A causa raiz é **check-e-use não-atômico** no servidor.
- A exploração moderna é o **single-packet attack** (HTTP/2): Burp Repeater "Send group in parallel" ou Turbo Intruder.
- A defesa é **atomicidade**: transação + `FOR UPDATE`, update condicional atômico, `UNIQUE` no schema, idempotency keys.

> 💡 **Dica de ouro:** sempre faça o **benchmark sequencial antes**. Se em sequência o servidor diz "já usado / limite atingido", mas em paralelo várias passam, você não só achou o bug: você já tem a **prova pronta** pro report. O contraste sequencial × paralelo é a evidência mais limpa que existe pra essa classe.

## Nota ética

Tudo aqui é pra **testes autorizados**: programas de bug bounty (dentro do escopo), pentests contratados e labs legais como a PortSwigger Academy. Disparar requests concorrentes contra sistemas de terceiros sem autorização pode causar inconsistência de dados real (dinheiro, estoque) e é crime. Treine nos labs, reporte com responsabilidade e use o conhecimento pra ajudar a corrigir.

## Referências

- [PortSwigger — Race conditions (Web Security Academy)](https://portswigger.net/web-security/race-conditions)
- [PortSwigger Research — Smashing the state machine: the true potential of web race conditions](https://portswigger.net/research/smashing-the-state-machine) (James Kettle, Black Hat USA 2023 / DEF CON 31)
- [PortSwigger Research — The single-packet attack: making remote race-conditions 'local'](https://portswigger.net/research/the-single-packet-attack-making-remote-race-conditions-local)
- [Turbo Intruder — template `race-single-packet-attack.py`](https://github.com/PortSwigger/turbo-intruder/blob/master/resources/examples/race-single-packet-attack.py)
- [OWASP WSTG — Business Logic Testing (4.10, inclui Test for Process Timing)](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/) · [OWASP — Race Condition](https://owasp.org/www-community/vulnerabilities/Race_Condition)

---
*Próximo/relacionado na série: [Severidade & Impacto na Triagem](/posts/severidade-impacto-triagem/) · base: [Recon & Discovery](/posts/recon-discovery/) · reportar: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)**, o índice da série, do básico ao avançado.*
