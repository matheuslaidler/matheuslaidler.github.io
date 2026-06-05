---
title: "Business Logic Flaws: quando a regra de negócio é a vulnerabilidade"
description: "Por que scanners não acham falha de lógica de negócio — e como mapear o fluxo, abusar das suposições erradas do dev e provar o impacto, do preço negativo ao workflow bypass."
author: matheus
date: 2026-06-03 23:45:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["business logic", "logic flaws", "OWASP", "WSTG", "bug bounty", "web security", "Burp Suite", "price manipulation", "workflow bypass"]
image: /assets/img/covers/business-logic.png
pin: false
comments: true
---

## A vulnerabilidade que não tem payload

Você manda uma compra com `quantidade: -1` e, em vez de erro, o seu **saldo aumenta**. Você pula a tela de pagamento indo direto pra URL de confirmação e o pedido sai como **pago**. Você aplica o mesmo cupom 200 vezes trocando um header e o desconto **empilha**. Repare numa coisa: em nenhum desses casos teve aspas, `<script>`, `UNION SELECT` ou qualquer caractere mágico. O servidor fez **exatamente o que foi programado pra fazer** — o problema é que *o que foi programado* permite abuso.

Isso é **Business Logic Flaw** (falha de lógica de negócio). É a classe de bug onde **não existe payload, existe raciocínio**. Ela não está num caractere que escapou da sanitização; está numa **suposição que o desenvolvedor fez e nunca validou** — "o cliente sempre vai comprar quantidade positiva", "quem chegou na etapa 3 já passou pela etapa 2", "ninguém vai mandar uma data de nascimento de 2025 depois de cadastrado". Cada uma dessas frases é uma porta.

É também a classe que **scanner nenhum acha** (já vamos ver por quê), o que a torna um prato cheio pra quem testa na mão. Neste post a gente vai do "o que é" até técnicas concretas — manipulação de preço, workflow bypass, replay, abuso de cupom, bypass de validação client-side, inconsistência de estado — sempre com o *porquê*, código de ataque e código de defesa. (Se você ainda não viu como mapear superfície de ataque, dá uma passada no [post 01 — Recon & Discovery](/posts/recon-discovery/) antes; aqui assumo que você já sabe interceptar uma request no Burp.)

## O que é uma falha de lógica de negócio?

> **Analogia:** imagine uma catraca de metrô que só conta passagens *somando*. O engenheiro presumiu que toda passagem é `+1`. Aí alguém descobre que dá pra inserir um cartão com valor `-1` e a catraca, fazendo o que foi mandada fazer, **devolve crédito** em vez de cobrar. A catraca não está "hackeada" — ela está funcionando perfeitamente. O bug está na **regra**: ninguém disse a ela que passagem negativa não existe no mundo real.

A definição oficial da PortSwigger é direta: falhas de lógica de negócio são "**falhas no design e na implementação de uma aplicação que permitem ao atacante provocar comportamento não-intencional**". Elas nascem quando o time **não antecipa estados incomuns** e não os trata com segurança.

A diferença pra todas as outras classes que vimos na série é essencial:

| Classe | A falha está em... | Tem payload? |
|---|---|---|
| XSS / SQLi | dado **malformado** que escapa do contexto | Sim (`'`, `<script>`, ...) |
| Broken Access Control (IDOR/BFLA) | **autorização** que não foi checada | Não, mas tem **identificador** trocado |
| **Business Logic** | uma **regra/suposição de negócio** que pode ser quebrada com dado **perfeitamente válido** | **Não** — tem raciocínio |

Repare: em Business Logic, o valor que você manda costuma ser **sintaticamente perfeito**. `-1` é um inteiro válido. `2025` é um ano válido. Pular pra `/checkout/confirm` é uma navegação válida. O servidor não tem como "detectar caractere suspeito" porque **não há caractere suspeito**. É por isso que ela é tão silenciosa — e tão bem paga.

## Por que scanners não acham (e por isso paga)

A própria PortSwigger resume: "**falhas de lógica são frequentemente invisíveis pra quem não está explicitamente procurando por elas**" e não aparecem no uso normal. Pensa em como um scanner (Acunetix, Nuclei, o scanner do Burp) funciona: ele tem uma **lista de payloads** e uma **lista de sinais de resposta** (erro de SQL, reflexão de `<script>`, etc.). Ele dispara `' OR 1=1--` e vê se quebra.

Agora me diz: qual payload detecta que **"quantidade negativa gera crédito"**? Não existe. O scanner teria que **entender que o app vende coisas, que quantidade deveria ser positiva, e que crédito negativo é absurdo no domínio**. Ele não entende o negócio — ele só conhece sintaxe. Como diz um princípio que circula muito entre caçadores experientes: *enquanto a maioria roda mil ferramentas e segue checklist, o diferencial vem de analisar o fluxo da aplicação usando só lógica — a diferença não está no que você olha, mas no que você percebe.*

Tradução pra bolso: **menos competição**. A galera roda scanner e reporta o que ele cospe. Quem senta, entende o fluxo e percebe a suposição quebrada acha bug que mais ninguém viu. Em programas reais, falhas de lógica pagam de **algumas centenas de reais/euros** (um bypass de limite de baixo impacto — faixa de **€150–€300** numa plataforma europeia, ou **~$500** num bypass de regra de negócio Médio) até **R$5.000+** quando a lógica quebrada toca dinheiro, autenticação ou PII em escala (um *account takeover* via falha de fluxo, por exemplo, cai nessa faixa alta). A variação é enorme justamente porque **o preço acompanha o impacto concreto**, não a "técnica" — voltamos nisso no [CVSS do caso prático](#caso-real-fictício-cupom-que-empilha--preço-no-corpo).

> 💡 **PII**: dados pessoais identificáveis (nome, CPF, e-mail, etc.). Detalhe no [Glossário](/posts/fundamentos-web-hacking/).

> ⚠️ **O estado do ativo mexe no bolso (lição de triagem).** Uma falha de lógica aceita como **Alto** numa funcionalidade que estava **fora de produção** (que seria só descontinuada) pode pagar a pontuação do Alto **sem nenhum bônus** — enquanto o mesmo Alto num fluxo *em produção* renderia mais. A severidade técnica não muda; a **recompensa** sim. Antes de queimar horas num fluxo, confirme que ele está **vivo e em produção**. (Mais sobre precificar achado no [post 02 — Severidade, Impacto e Triagem](/posts/severidade-impacto-triagem/).)

## Como funciona por trás: a suposição não-validada

Toda falha de lógica tem a mesma anatomia. Existe uma **invariante** — uma regra que o negócio assume como sempre verdadeira — e o servidor **não a reforça**. Exemplos de invariantes:

- "quantidade de item é sempre ≥ 1"
- "o preço vem da nossa base, nunca do cliente"
- "pra chegar em `confirmar`, passou por `pagar`"
- "cada conta envia o formulário no máximo uma vez"
- "data de nascimento, depois de cadastrada, não muda a maioridade"

O dev confia que essas regras "naturalmente" se mantêm porque **a interface dele as mantém** (o `<select>` só mostra de 1 a 10; o botão "confirmar" só aparece depois de pagar). O erro é achar que **a interface é a fronteira de segurança**. Não é. A fronteira é a **API**. E na API, o atacante manda o que quiser. (Por isso lógica de negócio e segurança de API andam de mãos dadas — veja o [post 25 — API Security](/posts/api-security/), onde os mesmos endpoints viram a superfície de ataque.)

```php
// Backend VULNERÁVEL — confia que quantidade veio do <select> (1 a 10)
$qtd   = (int) $_POST['quantidade'];          // <- e se vier -1 ?
$preco = $produto->preco;
$total = $qtd * $preco;                        // -1 * 100 = -100  (total negativo!)
// o checkout DEBITA o total do saldo do cliente:
$saldo = $usuario->saldo - $total;            // saldo - (-100) = saldo + 100  -> o saldo SOBE
```

Não tem injeção. Tem aritmética honesta sobre uma entrada que **nunca deveria existir** — e que o servidor nunca proibiu.

## Tipos e variações

> 💡 **WSTG** (Web Security Testing Guide): o guia de testes de segurança web do OWASP, organizado por classe de falha.
{: .prompt-tip }

Vou organizar pelo *jeito de raciocinar*, com referência aos exemplos oficiais da PortSwigger e às seções do OWASP WSTG (Business Logic Testing, seção **4.10**: dez casos de teste — de *Test Business Logic Data Validation* (`4.10.1` / `WSTG-BUSL-01`) a *Test Payment Functionality* (`4.10.10`, presente na versão *latest*); a versão *stable* v4.2 vai até `4.10.9` / `WSTG-BUSL-09`):

1. **Confiança excessiva em controle client-side** — o app valida no navegador (JS, `maxlength`, `<select>`, preço escondido num `hidden`) e confia que isso chega intacto. Você adultera depois que sai do browser, no Burp. (*Excessive trust in client-side controls*.)
2. **Não tratar entrada incomum** — valor **negativo**, número gigante (**integer overflow**), zero, string vazia, casa decimal a mais (arredondamento), tipo trocado. (*Failing to handle unconventional input*.)
3. **Suposições erradas sobre o comportamento do usuário** — "quem passou pelo passo X é confiável dali pra frente". Inclui **workflow bypass** (pular etapas) e campos "imutáveis" que ficam editáveis depois. (*Making flawed assumptions about user behavior*.)
4. **Falhas específicas do domínio** — abuso de **cupom/desconto**, regras de saldo, programa de pontos, lógica de cobrança. (*Domain-specific flaws*.)
5. **Reuso / replay de request** — repetir uma operação que deveria ser única (um envio, um resgate, uma transferência) porque não há **idempotência** (a garantia de que repetir a mesma chamada produz o mesmo resultado, sem acumular efeito).
6. **Inconsistência de estado** — duas operações que, intercaladas/concorrentes, deixam o sistema num estado impossível (clássica **race condition** em saldo/estoque).
7. **Oráculo de cifragem / valores reaproveitados** — o servidor te devolve um valor já assinado/cifrado e você reusa pra autenticar outra coisa. (*Providing an encryption oracle* — conversa direto com o "ID criptografado devolvido pela API" que vimos no [post 10 — IDOR/BOLA/BFLA](/posts/broken-access-control-idor-bola-bfla/).)

## Recon — como achar falha de lógica

Aqui o "recon" não é varrer subdomínio (isso é o [post 01](/posts/recon-discovery/)). É **engenharia reversa do negócio**. O processo, passo a passo:

**1. Use a aplicação como um usuário de verdade, do início ao fim.** Faça uma compra completa. Cadastre-se. Resgate um cupom. Transfira algo. Com o **Burp Proxy ligado**, cada clique vira uma request gravada no histórico. Você está construindo o **mapa do fluxo**.

**2. Liste as etapas e as transições.** Desenhe (no papel mesmo): `carrinho → endereço → pagamento → confirmação`. Cada seta é uma **suposição** ("só chego em confirmação depois de pagar").

**3. Para cada campo, pergunte "qual o intervalo que o dev presumiu?".** Quantidade: ele presumiu 1 a N positivo. Preço: ele presumiu que vem do servidor. Data: ele presumiu passado. Anote a **suposição** de cada um — é a sua lista de testes.

**4. Procure onde a validação mora.** Abra o DevTools/Burp: a checagem está no JS (client-side) ou tem uma resposta de erro do servidor quando você força? Se a única barreira é o `<select>`, **a barreira é fictícia**.

> 💡 **Sinais de que tem ouro ali:** valores monetários no corpo da request (`price`, `amount`, `total`), campos que "não deveriam estar editáveis" trafegando mesmo assim, fluxos com múltiplas etapas (checkout, KYC — a verificação de identidade do cliente, *Know Your Customer*; onboarding), qualquer "limite" ("1 por conta", "1 cupom por pedido"), e qualquer campo que represente **estado** (`status`, `step`, `paid`, `role`).

Ferramentas que entram aqui (todas apresentadas a fundo no [post 01](/posts/recon-discovery/)):
- **Burp Suite** — o coração. **Proxy** pra gravar o fluxo, **Repeater** pra remontar request alterando um campo, **Intruder** pra repetir/enumerar, **Comparer** pra diff de respostas.
- **DevTools do navegador** — pra ver a validação client-side antes de furá-la.
- **Burp Logger / sitemap** — pra não perder nenhuma etapa do fluxo.

## Exploração passo a passo (do básico ao avançado)

### Nível 1 — Manipulação de preço (confiança no client-side)

O caso mais clássico de domínio. O carrinho manda o **preço** no corpo da request (erro grave, mas comum em integrações antigas). No Repeater, você troca:

```http
POST /api/cart/checkout HTTP/2
Host: app.exemplo.com
Authorization: Bearer <seu_token>
Content-Type: application/json

{"productId": 1001, "quantity": 1, "price": 1.00}   # <- preço real é 1299.00
```

Se o pedido fecha por R$ 1,00, o servidor **confiou no preço do cliente** em vez de buscar na própria base. Variações do mesmo raciocínio: trocar a **moeda**, mandar **desconto** no corpo, ou alterar o `total` final.

### Nível 2 — Entrada incomum: quantidade negativa e overflow

Não precisa nem do preço no corpo. Ataque a **quantidade**:

```http
POST /api/cart/add HTTP/2
Content-Type: application/json

{"productId": 1001, "quantity": -1}   # <- gera total negativo = crédito?
```

Teste a bateria de "valores que o dev não esperou": `-1`, `0`, `0.999`, `99999999999`, `"1"` (string), `[1]` (array). Cada um exercita uma suposição diferente.

O caso premium aqui é o **integer overflow**, que a PortSwigger documenta no lab *Low-level logic flaw*. O preço de um item, somado muitas vezes, **estoura o máximo de um inteiro de 32 bits** (`2.147.483.647`) e **dá a volta** pro mínimo negativo (`-2.147.483.648`). A técnica:

```text
1. Burp Intruder no parâmetro quantity, payload type "Null payloads".
2. Em Payload configuration, marque "Continue indefinitely".
3. Cada request adiciona unidades; o total cresce até estourar o int...
4. ...vira negativo e começa a "subir" de volta em direção a 0.
5. Pare quando o total ficar entre $0 e o seu saldo -> compra por centavos.
```

Não há payload malicioso — há **aritmética que o backend não protegeu**.

### Nível 3 — Workflow bypass (pular etapas)

A suposição: "pra chegar na confirmação, passou pelo pagamento". Você mapeou o fluxo no recon. Agora **pula direto** pra etapa final:

```http
POST /api/order/confirm HTTP/2     # <- normalmente só se chega aqui DEPOIS de /pay
Content-Type: application/json

{"orderId": 5012}
```

> 💡 **MFA / 2FA**: autenticação de múltiplos fatores — exige 2+ fatores pra logar (ex.: senha + código do app autenticador).
{: .prompt-tip }

Se o pedido vira `CONFIRMED`/`PAID` sem nunca ter passado por `/api/order/pay`, **a máquina de estado não foi validada no servidor**. Mesmo raciocínio vale pra pular **KYC**, pular **verificação de e-mail**, ou pular a etapa de **MFA** num login.

Uma variante muito comum (e que paga) é **pular uma etapa obrigatória reusando a request de uma conta que já passou por ela**. Padrão clássico em fintechs: existe uma regra de negócio "só pode solicitar o cartão / aprovar o aumento de limite **depois de aceitar os termos**". Você usa duas contas — a **Conta A** já aceitou os termos, a **Conta B** não. Captura a request da ação restrita com a Conta A e **troca só a autenticação** pela da Conta B:

```http
POST /api/limit/approve HTTP/2     # <- normalmente exige termos aceitos
Authorization: Bearer <token_da_Conta_B>   # <- B nunca aceitou os termos
Content-Type: application/json

{"increaseId": 8842}
```

Se a Conta B consegue interagir com o aumento de limite **sem ter aceitado os termos**, a etapa obrigatória do fluxo nunca foi validada no servidor — só na interface. (Repare o cruzamento com a **troca de token** do [post 10](/posts/broken-access-control-idor-bola-bfla/): a *técnica* é a mesma, mas aqui o alvo não é acesso a dado de outro, e sim **contornar uma regra de negócio do processo**.)

### Nível 4 — Reuso/replay e abuso de limite

A suposição: "essa operação só pode acontecer uma vez (por conta)". Aqui entram duas técnicas.

**Replay puro:** capture a request de uma operação única (resgatar cupom, enviar formulário), mande pro Repeater (`Ctrl+R`) e **reenvie N vezes** ali (`Ctrl+Space` a cada reenvio). Se cada reenvio acumula efeito (saldo, desconto, envios), não há **idempotência**.

**Burlar o "1 por conta" trocando o identificador de tenant** (tenant = a conta/organização "dona" dos dados num sistema multicliente). Padrão real e elegante: o limite é amarrado num header de conta, não na sua sessão. Você tem Conta A e Conta B. O servidor checa o header `Account`, mas confia que ele "bate" com o token:

```http
POST /api/forms/submit HTTP/2
Authorization: Bearer <token_da_Conta_B>   # sua sessão é a B
Account: 100123                             # <- mas você põe o Account da Conta A
Content-Type: application/json

{"formId": 77}
```

Trocando o `Account` da B pelo da A (e vice-versa), você reseta o contador e **submete o formulário infinitas vezes**, furando a regra de "envio único por conta". (Repare o parentesco com a **troca de token** do [post 10](/posts/broken-access-control-idor-bola-bfla/) — só que ali o alvo é *acesso*; aqui é *contornar um limite de negócio*.)

### Nível 5 — Bypass de validação client-side (idade, CPF) e campo "imutável"

A suposição: "o usuário passou pela validação no cadastro, então o dado dele é confiável pra sempre". Dois casos concretos e muito comuns no Brasil:

**Idade / data de nascimento editável depois.** O cadastro **bloqueia menores de idade** (valida a data no front e no momento do registro). Mas depois de confirmar a conta, existe um `/perfil/editar` que **deixa trocar a data de nascimento sem revalidar a maioridade**:

```http
PATCH /api/user/profile HTTP/2
Authorization: Bearer <seu_token>
Content-Type: application/json

{"birthDate": "2015-04-04"}   # <- agora você é "menor"; o controle de idade caiu
```

A validação existia **só na porta de entrada**. Depois que você entrou, o campo "imutável" virou editável — falha de **suposição sobre comportamento do usuário**.

**CPF não validado no backend.** O formulário valida o CPF no JavaScript (dígito verificador, máscara). Você manda a request **direto pra API**, pulando o JS, com um CPF **inexistente/sintaticamente errado**:

```http
POST /api/checkout HTTP/2
Content-Type: application/json

{"productId": 1001, "taxpayer_registry": "00000000000"}   # <- CPF inválido
```

Se a compra fecha e o CPF é **persistido sem validação**, o backend confiou que o JS já tinha checado. Impacto real: quebra o faturamento fiscal (a nota sai com documento inexistente), comprometendo o envio de dados ao governo. Parece "bobo", mas paga — é uma invariante de negócio (CPF tem que ser válido) que o servidor não reforça.

> 💡 **O outro lado da moeda — quando o fluxo *exige* documento válido pra prosseguir.** Às vezes você precisa de um documento **formalmente válido** (dígito verificador correto) só pra passar de etapa e chegar no ponto interessante. Aí entram geradores como o **4devs** (gera CPF/CNPJ formalmente válidos, sem vínculo com pessoa real — use só em conta de teste, em alvo autorizado). Detalhe de garimpo: muitos programas europeus (vistos na Intigriti) exigem **documento europeu** no cadastro, e a falta de um gerador equivalente vira barreira de entrada — o que, por outro lado, **reduz a concorrência** naquele programa.

### Nível 6 — Avançado: inconsistência de estado (race condition)

A suposição: "as operações acontecem uma de cada vez". Você tem R$ 100 de saldo e quer transferir R$ 100 **duas vezes**. Se você disparar as duas requests **exatamente ao mesmo tempo**, ambas leem o saldo "100", ambas aprovam, e você transfere **R$ 200 tendo R$ 100** (saldo negativo / dobro de valor):

```text
# Burp Repeater -> agrupe as 2 requests numa aba de grupo
# clique em "Send group in parallel (single-packet attack)"
# as duas chegam no MESMO instante -> ambas validam contra o saldo antigo
```

O *single-packet attack* do Burp (Repeater → "Send group in parallel") sincroniza as requests pra explorar essa janela de microssegundos. É lógica de novo: o dev presumiu serialização que o banco não garantiu.

## Caso real-fictício: cupom que empilha + preço no corpo

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você testa `app.exemplo.com`, uma loja. No recon, você comprou um item com o Proxy ligado e mapeou o fluxo: `add → apply-coupon → checkout`. Na etapa do cupom, o Burp gravou:

```http
POST /api/cart/apply-coupon HTTP/2
Host: app.exemplo.com
Authorization: Bearer <seu_token>
Content-Type: application/json

{"cartId": 5012, "coupon": "BEMVINDO10"}
```

```http
HTTP/2 200 OK
Content-Type: application/json

{"cartId":5012,"subtotal":1000.00,"discount":100.00,"total":900.00}
```

Desconto de 10% aplicado, total caiu pra 900. **Suposição do dev:** "um cupom por carrinho".

**Passo 1 — Replay do cupom.** Mando a request de `apply-coupon` pro Repeater (`Ctrl+R`) e reenvio a **mesma** request cinco vezes (`Ctrl+Space` x5). A resposta mostra o `discount` **acumulando**:

```http
HTTP/2 200 OK
{"cartId":5012,"subtotal":1000.00,"discount":500.00,"total":500.00}   # <- 5x10% empilhou
```

Não havia **idempotência**: o servidor somava o desconto a cada chamada, em vez de garantir "um cupom só".

**Passo 2 — Empurro pra zero (entrada incomum).** Reenvio até o `discount` passar de 1000. O servidor não trava em zero:

```http
HTTP/2 200 OK
{"cartId":5012,"subtotal":1000.00,"discount":1100.00,"total":-100.00}   # <- total NEGATIVO
```

**Passo 3 — Fecho o pedido.** Mando o `checkout`. Total negativo vira **crédito na conta** — eu "ganho" R$ 100 comprando.

**O que a tela do Burp mostraria:** painel Request/Response do Repeater; na Response, o campo `total` destacado em vermelho passando de `900.00` → `500.00` → `-100.00` a cada reenvio, sem nenhum erro de validação.

**Passo 4 — Report.** Título: `[Business Logic] Empilhamento de cupom + total negativo gera crédito indevido`. Resumo focado no risco: *"qualquer cliente autenticado consegue zerar/inverter o valor de um pedido reaplicando o mesmo cupom, gerando prejuízo financeiro direto"*. Passos numerados + prints das três respostas. Pra estruturar o report, veja o [post 03 — Como escrever um report que paga](/posts/como-escrever-report-que-paga/).

**Severidade e CVSS.** Aqui está o ponto que mais separa biz logic das outras classes: **não existe "o CVSS de business logic"** — o vetor é todo do *impacto concreto* que você provou. Neste cenário (qualquer usuário **autenticado** consegue forjar crédito → integridade financeira comprometida, sem exigir interação da vítima nem vazar dado de terceiros), um vetor defensável é:

- **CVSS v3.1:** `6.5` (Medium) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N` (rede, fácil, precisa estar logado, sem interação; integridade **alta** porque você corrompe o valor do pedido, mas confidencialidade e disponibilidade `N`).
- **CVSS v4.0:** `7.1` (High) — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N/SC:N/SI:N/SA:N`.

Repare que as duas versões **discordam** (Medium na v3.1, High na v4.0) — exatamente o tipo de divergência que o [post 02](/posts/severidade-impacto-triagem/) explica: não copie o número de uma pra outra, calcule cada um. Tendo **os dois vetores** no report, você discute de igual pra igual seja qual for a versão que o programa usa.

> ⚠️ **Calibre pelo que você provou, não pelo teto teórico.** Se o crédito gerado **fica preso no carrinho** e some ao limpar a sessão, o impacto cai (vira Baixo/informativo). Se ele vira **saldo sacável / dinheiro de verdade em escala**, sobe pra Crítico (e o vetor muda: integridade *e* disponibilidade financeira em jogo). O mesmo bug "empilhar cupom" pode valer um `4.x` ou um `9.x` dependendo do **efeito de negócio** — por isso *sempre* persiga e documente o impacto financeiro real. Recalcule o número na [calculadora oficial](https://www.first.org/cvss/calculator/4.0) e calibre conforme o [post 02](/posts/severidade-impacto-triagem/).

## Defesa em camadas

A regra-mãe é a mesma da série inteira: **valide TODAS as invariantes no servidor**. O cliente é uma sugestão; o servidor é a lei. Mas em Business Logic isso se desdobra em camadas específicas:

**1. Valide o domínio do valor, não só o tipo.** "É inteiro" não basta — tem que ser inteiro **dentro do intervalo que faz sentido no negócio**:

```php
// CORRETO — reforça a invariante de domínio
$qtd = filter_var($_POST['quantidade'], FILTER_VALIDATE_INT);
if ($qtd === false || $qtd < 1 || $qtd > 10) {
    http_response_code(422);
    exit('quantidade invalida');
}
```

**2. Nunca confie em preço/desconto/total vindos do cliente.** Recalcule tudo a partir da fonte de verdade (o banco):

```javascript
// Node — o preço SEMPRE vem da base, o cliente só diz O QUE quer comprar
const produto = await Produto.findById(req.body.productId);
const qtd     = Math.trunc(req.body.quantity);
if (!Number.isInteger(qtd) || qtd < 1 || qtd > produto.estoque) {
  return res.status(422).json({ erro: "quantidade invalida" });
}
const total = produto.preco * qtd;   // <- preco do servidor, nunca req.body.price
```

**3. Proteja a aritmética (overflow/arredondamento).** Use tipos monetários adequados (decimal, centavos como inteiro) e cheque limites antes de operar:

```python
# Python — dinheiro em Decimal, nunca float; e cap explícito
from decimal import Decimal
total = produto.preco * qtd
if total < 0 or total > Decimal("1000000"):
    raise ValueError("total fora do intervalo permitido")
```

**4. Modele o fluxo como máquina de estado e valide a transição.** Pra cada etapa, cheque que o **estado anterior** é o esperado:

```php
// CORRETO — confirmar só é permitido se o pedido estiver PAGO
$pedido = Pedido::where('id', $req->orderId)
               ->where('dono_id', auth()->id())   // dono (vide post 10)
               ->firstOrFail();
if ($pedido->status !== 'PAGO') {                  // <- valida a transição
    abort(409, 'pedido nao esta no estado PAGO');
}
$pedido->update(['status' => 'CONFIRMADO']);
```

**5. Garanta idempotência e limites no servidor.** Operações que devem acontecer uma vez precisam de uma **chave de idempotência** (ou de uma restrição no banco), não de um contador no front:

```sql
-- O banco IMPÕE "um cupom por carrinho", aconteça o que acontecer na API
ALTER TABLE cupons_aplicados ADD CONSTRAINT uq_cupom_por_carrinho UNIQUE (cart_id);
```

**6. Revalide invariantes "permanentes" sempre que o dado mudar.** Se maioridade depende da data de nascimento, **revalide a maioridade em toda edição** — não só no cadastro. Trate concorrência com **transação + lock** (`SELECT ... FOR UPDATE`) pra matar race condition de saldo.

> ❌ **O que NÃO basta:** validar só no JavaScript; checar "é número" sem checar o **intervalo**; esconder o botão "confirmar" achando que protege a etapa; confiar que o cliente manda preço/role/`Account` corretos; um contador de limite mantido no front. Em Business Logic, **a defesa é entender o negócio melhor que o atacante** e codificar cada suposição como uma checagem explícita.

## Ferramentas + labs legais

- **Burp Suite** — Proxy (mapear fluxo), Repeater (alterar um campo, replay), Intruder (overflow via Null payloads "continue indefinitely"), Repeater "Send group in parallel" (race condition), Comparer (diff de respostas).
- **DevTools do navegador** — pra ver e furar a validação client-side.
- **Labs pra praticar (autorizados):**
  - [PortSwigger — Business logic vulnerabilities](https://portswigger.net/web-security/logic-flaws) (11 labs gratuitos: *excessive trust in client-side controls*, *high-level logic vulnerability*, *low-level logic flaw* (overflow), *inconsistent handling of exceptional input*, *insufficient workflow validation*, *authentication bypass via flawed state machine*, *infinite money logic flaw*, *authentication bypass via encryption oracle*, entre outros).
  - **OWASP Juice Shop** — cheio de desafios de lógica (carrinho, cupom, basket de outro usuário).
  - TryHackMe, HackTheBox, HackingClub — máquinas com fluxos de negócio pra abusar.

## Checklist do caçador

- [ ] **Usei o app inteiro** com o Proxy ligado e desenhei o fluxo (etapas e transições).
- [ ] Para cada campo, anotei a **suposição** do dev (intervalo esperado) e testei o **oposto** (`-1`, `0`, gigante, string, array, decimal).
- [ ] Procurei **preço/desconto/total** no corpo da request e tentei alterá-los.
- [ ] Tentei **pular etapas** chamando a request da etapa final direto (workflow bypass).
- [ ] **Reenviei** operações "únicas" (replay) e checei se acumulam (idempotência).
- [ ] Tentei furar limites trocando o **identificador de conta/tenant** entre Conta A e Conta B.
- [ ] Mandei requests **direto pra API** pulando a validação client-side (CPF, idade, formato).
- [ ] Testei editar campos "**imutáveis**" depois do cadastro (data de nascimento, e-mail, role).
- [ ] Testei **concorrência** (Repeater → send group in parallel) em saldo/estoque/limite.
- [ ] Tentei **pular etapa obrigatória** (aceite de termos, KYC) reusando a request de uma conta que já passou, trocando só a autenticação.
- [ ] Conferi que a falha **está no escopo**, que o fluxo está **em produção** (não-prod paga menos) e medi o **impacto no negócio** (dinheiro, PII, auth).

## Pegadinhas / o que NÃO funciona

- **Reportar "aceita valor negativo" sem impacto.** Se o `-1` é rejeitado lá na frente ou não muda saldo/preço, é só validação fraca — não é bug pagável. **Sempre persiga o efeito de negócio.**
- **Confundir com IDOR.** Trocar `id=1001` por `1002` pra ver dado de outro é **Broken Access Control** ([post 10](/posts/broken-access-control-idor-bola-bfla/)). Business Logic é quebrar uma **regra** com **seu próprio** dado. Eles se cruzam (muito report vem rotulado "Business Logic" sendo IDOR), mas a *raiz* é diferente.
- **Achar que client-side resolve.** Se você furou pelo Burp, o app está vulnerável — não adianta o dev dizer "mas no site não dá".
- **Esquecer o estado limpo.** Replay e overflow sujam o carrinho/saldo de teste. Use **conta de teste** e documente o estado inicial, senão você não consegue reproduzir pro triager.

## O que você precisa lembrar

- Business Logic é a falha onde **não há payload, há raciocínio**: o app faz o que foi programado, mas a **regra** permite abuso.
- **Scanner não acha** porque não entende o negócio — por isso paga e tem menos competição.
- O método é sempre: **mapear o fluxo → listar as suposições → testar o inesperado → provar o impacto.**
- A defesa é **reforçar toda invariante no servidor**: intervalo do valor, preço da base, máquina de estado, idempotência, revalidação.

> 💡 **Dica de ouro:** antes de testar uma tela, faça a pergunta de ouro — *"o que o desenvolvedor presumiu que eu nunca faria aqui?"*. Quantidade negativa, pular a etapa de pagamento, reusar o cupom, mandar uma idade impossível direto na API. A resposta a essa pergunta **é** o seu próximo bug.

## Nota ética

Tudo aqui é pra **testes autorizados** — bug bounty dentro do escopo, pentests contratados e labs legais. Manipular preço, gerar crédito ou burlar limite em sistemas de terceiros sem autorização é fraude e crime, mesmo que "tecnicamente o servidor deixou". Existe lab demais pra treinar (PortSwigger, Juice Shop) — use o conhecimento pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [PortSwigger — Business logic vulnerabilities](https://portswigger.net/web-security/logic-flaws)
- [PortSwigger — Examples of business logic vulnerabilities](https://portswigger.net/web-security/logic-flaws/examples)
- [PortSwigger — Lab: Low-level logic flaw (integer overflow)](https://portswigger.net/web-security/logic-flaws/examples/lab-logic-flaws-low-level)
- [OWASP WSTG — Business Logic Testing (4.10)](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/10-Business_Logic_Testing/)
- [OWASP — Business logic vulnerability](https://owasp.org/www-community/vulnerabilities/Business_logic_vulnerability)
- [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/)

---
*Próximo na série: [Race Conditions e ataques de concorrência](/posts/race-conditions/) · relacionados: [Broken Access Control — IDOR/BOLA/BFLA](/posts/broken-access-control-idor-bola-bfla/) · [API Security](/posts/api-security/) · [Recon & Discovery](/posts/recon-discovery/) · [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
