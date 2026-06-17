---
title: "XSS: proteções, falhas e o que realmente funciona"
description: "As 'proteções de XSS' que parecem seguras mas são bypassáveis — X-XSS-Protection, blacklist/WAF, htmlspecialchars mal-usado, 'só validar input' — por que falham, e o que de fato protege. Com atenção ao código gerado por IA (vibecoding)."
author: matheus
date: 2025-11-23
categories: ["Segurança", "Web Security"]
tags: ["XSS", "web security", "CSP", "DOMPurify", "secure coding", "AppSec", "vibe-coding"]
pin: false
comments: true
permalink: /posts/xss-protecoes-e-falhas/
redirect_from:
  - /posts/xss-guia-completo/
image: /assets/img/covers/xss-protecoes-e-falhas.png
---

## O que é XSS (e por que este post foca nas DEFESAS)

XSS (Cross-Site Scripting) é fazer o navegador da vítima executar JavaScript que **você** controlou, no contexto do site alvo — roubo de sessão, ações em nome da vítima, keylogger. Em uma frase: o site confia num dado do usuário e o devolve como **código**, não como texto.

Os três tipos, rápido:

| Tipo | Como chega | Analogia |
|---|---|---|
| **Reflected** | Volta na resposta da request atual — precisa a vítima clicar no link | Um **copo de água envenenado** entregue na mão da vítima |
| **Stored** | Fica salvo no servidor e dispara pra todo mundo que abre a página | **Envenenar a água da cidade**: atinge todos, sem engenharia social |
| **DOM-based** | O próprio JavaScript do front joga o dado num *sink* perigoso; o servidor nem vê | Um assaltante que entra **pela janela** enquanto todos vigiam a porta |

> 📖 Quer o guia completo de XSS — **o que é a fundo, como explorar do básico ao avançado** (contextos de injeção, recon, bypass de WAF, blind XSS) e a defesa moderna detalhada? Está no capítulo da série: **[XSS e HTML Injection](/posts/xss-html-injection/)**.
{: .prompt-info }

**Este post é sobre o outro lado:** as "proteções de XSS" que aparecem em tutorial antigo, em config copiada da internet e — cada vez mais — em **código que a IA gera quando você pede "deixa seguro"**. Muitas *parecem* defesa e **não seguram** um atacante. Vamos ver cada uma: o que é, **por que falha**, o **bypass**, e o que realmente funciona.

> A regra que explica quase toda falha abaixo: XSS se resolve **tratando dado como dado** — *encoding na saída, conforme o contexto* — não tentando adivinhar e bloquear "o que é malicioso" na entrada. Defesa por **lista do que é proibido** (denylist) perde pra criatividade do atacante; **allowlist + encoding na saída** ganha.
{: .prompt-tip }

## Como não virar vítima (Proteção completa)

Agora o que interessa neste post: como se defender **de verdade** — e por que tantas proteções que *parecem* certas **não defendem**. É tipo conhecer as táticas do ladrão pra trancar a casa direito (e descobrir quais "fechaduras" são de papelão).

### Regra número 1: Nunca confie no input do usuário

**JAMAIS** coloque dados vindos do usuário diretamente na página. Sempre trate, sempre valide, sempre suspeite. Se você só fizer isso, já evita 90% dos XSS.

### Backend: A primeira linha de defesa

**PHP - Sanitização inteligente:**

> ⚠️ **Exemplo do que NÃO fazer.** Os filtros por blacklist abaixo (bloquear palavras como `script`, `eval`, regex de `on\w+=`, etc.) são **frágeis e bypassáveis** — estão aqui só para você entender *por que* falham. A defesa correta é **escape contextual na saída** + **DOMPurify** + **CSP**, mostrada mais adiante.
{: .prompt-warning }

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
{% raw %}
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
{% endraw %}

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
# X-XSS-Protection: DEPRECADO — não protege mais e pode até abrir brecha. Use 0 (desliga o legado) ou omita + CSP:
Header always set X-XSS-Protection "0"

# Content Security Policy básico
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'"
```

> **Nota:** `X-XSS-Protection` está **deprecado** e foi removido dos navegadores modernos (pode até introduzir problemas). Hoje a proteção real vem do **CSP** — recomenda-se `X-XSS-Protection: 0` ou simplesmente não depender dele.
{: .prompt-warning }

### Entendendo as camadas de defesa (e por que frontend sozinho não basta)

Pergunta clássica: se a proteção está só no frontend, dá pra contorná-la? **Sim, dá.** Por isso defesa em camadas faz diferença.

A **primeira camada** é o backend - sanitização e validação no servidor. Essa não pode ser burlada pelo usuário e protege contra Reflected e Stored XSS. Funciona mesmo se o JavaScript do navegador estiver desabilitado.

A **segunda camada** são os headers HTTP como **CSP** e X-Frame-Options (o `X-XSS-Protection` **não** entra aqui — é deprecado, como vimos). São configurados no servidor mas executados pelo browser, e o CSP protege principalmente contra execução de scripts não autorizados.

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

### Content Security Policy (CSP) - a rede de segurança que segura o resto

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

> ⚠️ **Exemplo do que NÃO fazer.** Os filtros por blacklist abaixo (bloquear palavras como `script`, `eval`, regex de `on\w+=`, etc.) são **frágeis e bypassáveis** — estão aqui só para você entender *por que* falham. A defesa correta é **escape contextual na saída** + **DOMPurify** + **CSP**, mostrada mais adiante.
{: .prompt-warning }

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

> ⚠️ **Validar input NÃO é a defesa primária de XSS** — e blacklist de campo é bypassável. O mesmo dado é seguro num contexto e perigoso em outro, e dado legítimo carrega caractere especial (o nome `O'Brien` tem aspa). Valide por **allowlist do formato esperado** (um e-mail é um e-mail) como **reforço** — a defesa de verdade é o **encoding na saída** (logo abaixo). ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html))
{: .prompt-warning }

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

> ⚠️ **Isto é detecção/log (denylist), NÃO prevenção.** Bloquear `eval`/`atob`/`fromCharCode` e "palavras suspeitas" é *whack-a-mole*: sobra `setTimeout`, `Function`, template literals — ou um `onerror` simples que não usa nenhuma dessas. Serve pra **monitorar/alertar**, nunca como o conserto. A prevenção continua sendo **encoding na saída + CSP**.
{: .prompt-warning }

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

# X-XSS-Protection: DEPRECADO — não ativa mais nada e pode introduzir brecha. Use 0 (ou omita) + CSP:
X-XSS-Protection: 0

# Força HTTPS (se disponível)
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

> **Nota:** `X-XSS-Protection` está **deprecado** e foi removido dos navegadores modernos (pode até introduzir problemas). Hoje a proteção real vem do **CSP** — recomenda-se `X-XSS-Protection: 0` ou simplesmente não depender dele.
{: .prompt-warning }

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

> **Nota:** o `json_encode` já escapa a barra `/`, então um `</script>` injetado não fecha a tag — por isso ele dá conta de uma string **dentro de `<script>`**. Se a saída puder cair em contexto HTML (fora de uma string JS), use `json_encode($x, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_HEX_APOS)` pra escapar `< > & '` também.
{: .prompt-tip }

### Proteção em camadas contra obfuscação

Pra se proteger de payloads obfuscados, o primeiro passo é sempre decodificar HTML entities e URL encoding antes de validar o input - assim você pega o payload "real" e não a versão disfarçada. Bloqueie funções perigosas como `eval`, `atob`, `fromCharCode` e o protocolo `javascript:`. Use CSP restritivo com `script-src-attr 'none'` pra bloquear event handlers inline, force scripts específicos via nonce ou hash, e monitore tentativas de obfuscação nos logs. Se tiver WAF, configure regras específicas pra payloads ofuscados.

Como identificar que alguém tá tentando obfuscar? Fique de olho em múltiplas codificações empilhadas (URL + HTML + Unicode), funções suspeitas nos inputs, quebra de palavras com comentários HTML tipo `scr<!---->ipt`, unicode escapes como `\u0061` no lugar de `a`, e Base64 aparecendo em contextos estranhos.

E não se engane: atacante sempre acha jeito novo de obfuscar. Por isso a defesa tem que ser em camadas - validação, sanitização, CSP e monitoramento trabalhando juntos.

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

Pra fechar a parte de defesa: sempre valide e sanitize inputs, faça escape apropriado pro contexto onde o dado vai aparecer (HTML, JavaScript, URL, cada um tem seu método), configure CSP restritivo, use os headers de segurança (`X-Content-Type-Options`, `X-Frame-Options` — **não** o `X-XSS-Protection`, que é deprecado), HTTPS sempre que possível, mantenha frameworks e bibliotecas atualizados, e rode scanner de vulnerabilidades regularmente.

### O que NÃO funciona

Alguns mitos que vejo por aí: "só bloquear a tag script resolve" - não resolve, existem dezenas de outras formas de executar JavaScript. "Filtro no frontend é suficiente" - nunca é, cliente não é confiável. "WAF resolve tudo" - WAF é complemento, não solução única. "Encoding resolve" - só em contextos específicos. "Blacklist é melhor que whitelist" - whitelist sempre ganha porque você define o que PODE, não o que NÃO PODE (e atacantes são criativos demais pra você prever tudo).

Segurança se faz em camadas. Uma proteção falha? As outras seguram. É como trancar a porta, janela E colocar alarme - paranóico, mas efetivo.

## 🤖 Vibecoding: cuidado com a "proteção" que a IA te dá

Quando você pede pra uma IA "adicionar proteção contra XSS" sem ser específico, é comum ela devolver **exatamente as defesas deste post que falham**: um regex que remove `<script>`, um `X-XSS-Protection: 1; mode=block`, uma função de "sanitização" por blacklist, ou validação que quebra dado legítimo. Parece seguro, passa no teste óbvio (`<script>alert(1)</script>`) e abre a porta pro primeiro `<img onerror>`.

Como se proteger ao *vibecodar*:

- **Peça a defesa certa pelo nome:** "use **output encoding por contexto** e **DOMPurify (allowlist)**, não blacklist; configure **CSP com nonce**".
- **Desconfie de qualquer regex que 'remove tags perigosas'** — é denylist.
- **Teste o resultado com mais que `<script>`:** jogue `<img src=x onerror=alert(document.domain)>` e um payload em atributo de aspas simples.
- É um caso particular de um problema maior — veja [Os riscos de segurança do vibecoding](/posts/vibecode-riscos-seguranca/).

## Ferramentas para testar XSS

Estas são as ferramentas que eu realmente uso, não é só lista de Wikipedia rs.

O **Burp Suite** é o canivete suíço - intercepta e modifica requisições em tempo real, e o Intruder é perfeito pra fuzzing de payloads. O **XSSer** é um scanner automático que testa centenas de payloads diferentes, útil quando você quer varrer rápido. O **BeEF** é um framework pra controlar navegadores comprometidos - muito sinistro, mas mostra bem o potencial real de um XSS explorado. O **OWASP ZAP** é a alternativa gratuita ao Burp, ótima pra quem está começando. E nunca subestime o **F12 do próprio navegador** - as DevTools são poderosas demais pra testar XSS manualmente.

## Labs para praticar sem quebrar a lei

Esses são os playgrounds onde você pode testar à vontade.

O **DVWA** (Damn Vulnerable Web Application) é clássico e muito bom pra começar. O **WebGoat** são os labs oficiais da OWASP, bem didáticos. O **XSS Game** é um desafio interativo do Google que vale a pena. O **bWAPP** é outra aplicação vulnerável com vários níveis de dificuldade. A **PortSwigger Academy** tem labs gratuitos da galera do Burp Suite - muito bem feitos. O **TryHackMe** tem máquinas com XSS e explicações passo a passo, bom pra quem está começando. O **Hacking Club** é meu favorito, tem aulas e máquinas específicas de XSS. E o site `testphp.vulnweb.com` da Acunetix é um site vulnerável de propósito que você pode usar pra estudo.

## O que levar deste post

A defesa de XSS que **funciona** cabe numa frase: **trate dado como dado**. Codifique na **saída**, conforme o **contexto** (HTML, atributo, JS, URL), e use **allowlist** (DOMPurify) pra HTML rico. CSP é a rede de segurança; cookies `HttpOnly`/`SameSite` limitam o estrago (mas não previnem o XSS).

O que **NÃO** conta como defesa, por mais que pareça: blacklist/regex de "palavras perigosas", `X-XSS-Protection`, "só validar input", detecção de obfuscação caseira, ou confiar só no WAF/CSP. Cada um falha sozinho — e vários aparecem prontos em código gerado por IA.

> 🧪 **Teste a sua "proteção" com mais que `<script>`:** jogue `<img src=x onerror=alert(document.domain)>` e um payload em **atributo de aspas simples**. Se passou, sua defesa é de papelão.

> **Com grandes poderes vem grandes responsabilidades.** Use pra proteger seus projetos, fazer pentests autorizados, educar e reportar com responsabilidade — nunca pra atacar sem permissão. Pratique em lab (PortSwigger Academy, DVWA, TryHackMe, HackingClub).
{: .prompt-warning }

## Leia também

- **[XSS e HTML Injection — o guia completo](/posts/xss-html-injection/)** (a série: o que é, como explorar do básico ao avançado, e a defesa moderna detalhada)
- [Os riscos de segurança do vibecoding](/posts/vibecode-riscos-seguranca/)
- [SQL Injection da teoria à prática](/posts/sql-injection-definitivo/)
- [Desenvolvimento Web na Prática com PHP](/posts/desenvolvimento-web-guia-pratico/)
