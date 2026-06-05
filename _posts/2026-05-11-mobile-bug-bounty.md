---
title: "Bug Bounty em Mobile: testando apps Android/iOS (e a API por trás)"
description: "Do setup (emulador, Burp, certificado CA, bypass de SSL pinning) aos achados clássicos de app mobile — e o pulo do gato: testar a API por trás com todo o arsenal web."
author: matheus
date: 2026-05-11 14:06:00 -0300
categories: [Bug Bounty, Vulnerabilidades]
tags: ["mobile", "Android", "iOS", "bug bounty", "OWASP MASVS", "OWASP Mobile Top 10", "Frida", "Objection", "SSL pinning", "Jadx", "Apktool", "API security"]
image: /assets/img/covers/mobile-bug-bounty.png
pin: false
comments: true
---

## O segredo que ninguém te conta sobre mobile

Tem gente que olha pra um programa de bug bounty com escopo mobile (um `*.apk`, um app na App Store) e congela: *"não sei nada de Android, não sei programar em Kotlin, vou passar"*. Erro. A verdade que mais economiza tempo na sua carreira é esta:

> **A maior parte de mobile bug bounty é testar a API HTTP por trás do app — e isso você já sabe fazer.**

Um app de banco, de delivery ou de rede social é, na prática, um **cliente bonito** que conversa com uma API REST/GraphQL. Quando você consegue colocar o **Burp no meio** dessa conversa, o "alvo mobile" vira o **mesmo alvo web** que você já ataca nos posts [10](/posts/broken-access-control-idor-bola-bfla/), [12](/posts/account-takeover/) e [20](/posts/business-logic/): IDOR, BFLA, business logic, tudo. O que muda é (1) **como interceptar** esse tráfego (o app não tem uma barra de URL, e muitas vezes usa **pinning** pra te bloquear) e (2) um conjunto de falhas **específicas do device** (segredos no APK, armazenamento inseguro, deeplink inseguro, WebView perigosa).

> 💡 **IDOR / BOLA**: você troca o ID de um recurso na request (ex.: `accountId=1001`→`1002`) e acessa o dado de **outro usuário** porque o servidor não checa se aquilo é seu. **BFLA**: você chama uma **função/endpoint que não devia** (ex.: rota de admin) com seu token comum, e o servidor deixa. ([Glossário](/posts/fundamentos-web-hacking/))

> 💡 **Pinning** (SSL/certificate pinning): o app só confia num certificado específico, "fixado" no código — por isso o certificado do Burp não cola e a interceptação quebra. Vamos derrubar isso já já. [Glossário](/posts/fundamentos-web-hacking/)

Este post cobre **do básico ao avançado**: setup completo, panorama OWASP (Mobile Top 10 + MASVS), os achados que mais aparecem, e o **pulo do gato** de levar o tráfego interceptado pro seu arsenal web.

## O que é "testar um app mobile", afinal

**Analogia:** pensa no app como o **garçom** de um restaurante. Você (usuário) fala com o garçom numa linguagem bonitinha (a tela), mas quem realmente prepara, guarda e serve a comida é a **cozinha** (a API + o servidor). Testar mobile é, em boa parte, **conseguir ouvir o que o garçom fala com a cozinha** — e depois mandar pedidos direto pra cozinha, pulando o garçom.

Tecnicamente, um teste de app tem **duas frentes**:

| Frente | O que você analisa | Como |
|---|---|---|
| **Dinâmica (a API)** | O tráfego HTTP que o app gera | Roteia pro Burp, intercepta, manipula |
| **Estática + device** | O que está **dentro** do app e **no aparelho** | Decompila o APK/IPA, lê o armazenamento, testa componentes |

A grande sacada é entender que a **autorização de verdade mora no servidor**. O app pode esconder um botão de admin, mas se a API aceita a request, o bug está lá — independente do app. Por isso a frente dinâmica costuma render os achados mais graves (e mais bem pagos).

## Por que isso importa (e quanto paga)

- **A API por trás** é onde moram IDOR/BOLA, BFLA e business logic — as classes que mais pagam (de algumas centenas a **dezenas de milhares de reais**, como vimos no post [10](/posts/broken-access-control-idor-bola-bfla/)).
- **Segredos hardcoded no app** (API keys, credenciais, hosts internos) dão acesso a sistemas que deviam ser privados — é a mesma família de [credenciais/segredos vazados que vimos em Security Misconfiguration](/posts/security-misconfiguration-cve-hunting/), só que a "fonte" agora é o APK. E às vezes encadeiam pra outras falhas (ex.: um host esquecido no APK que vira [subdomain takeover](/posts/subdomain-takeover-broken-link-hijacking/)).
- **Deeplink inseguro + WebView** podem virar **account takeover** com um clique.

Na prática, achados de app costumam pagar em faixas parecidas com web: **R$500–R$3.000** pra hardcoded secrets / data storage de impacto médio, e **R$5.000+** quando a API exposta vaza PII em escala ou permite ATO. O impacto manda no número — não a "dificuldade" de ter mexido com mobile.

> 💡 **PII** (Personally Identifiable Information): dado pessoal que identifica alguém (nome, CPF, e-mail, telefone). **ATO** (Account Takeover): quando o atacante toma a conta da vítima. Vazar PII em escala ou tomar contas é o que dispara as maiores recompensas.

> ⚠️ **Escopo.** Muitos programas separam "app" de "API". Leia as regras: às vezes o `*.apk` está no escopo mas a API tem regras próprias (rate limit, contas de teste). E **nunca** ataque infraestrutura de loja (Play Store/App Store) — só o app do programa.

## Setup: colocando o Burp no meio do tráfego

Essa é a parte que assusta os iniciantes e que, feita uma vez, você nunca mais esquece. Vou focar em **Android** (mais aberto e o que aparece em 90% dos programas); no fim falo do iOS.

### Passo 0 — Ter onde rodar o app

Você precisa de um **Android controlável**:

- **Emulador** — o jeito mais fácil é um **AVD (Android Virtual Device)** do Android Studio. **Dica de ouro:** crie uma imagem **"Google APIs" e NÃO "Google Play"** — as imagens *sem* Play Store vêm **rootadas** (você consegue `adb root`), o que facilita instalar o certificado como CA de sistema e rodar o `frida-server`.
- **Dispositivo físico rootado** — mais realista (alguns apps detectam emulador), mas requer root (Magisk).

> 💡 **`adb`** (Android Debug Bridge): a ferramenta de linha de comando que conecta seu PC ao device/emulador (instalar apps, mexer em arquivos, abrir shell). Vem no Android SDK Platform Tools. [Glossário](/posts/fundamentos-web-hacking/)

Confirme que o device aparece:

```bash
adb devices          # lista os dispositivos conectados
adb shell getprop ro.product.cpu.abilist   # ex.: x86_64 (você vai precisar disso pro frida-server)
```

### Passo 1 — Apontar o tráfego do app pro Burp

O Burp escuta numa porta (padrão `127.0.0.1:8080`). Primeiro, faça o Burp escutar em **todas as interfaces** (Proxy → Proxy settings → editar o listener → bind to *All interfaces*), e descubra o **IP da sua máquina** na rede (ex.: `192.168.0.10`).

Agora configure o proxy no Android:

- **Emulador / Wi-Fi:** Settings → Wi-Fi → (segura na rede) → *Modify network* → *Proxy: Manual* → Host `192.168.0.10`, Port `8080`.
- Teste abrindo `http://192.168.0.10:8080` no navegador do device: tem que aparecer a página do Burp ("Burp Suite ... Welcome").

Pronto: **o tráfego HTTP já cai no Burp**. O **HTTPS**, porém, vai dar erro de certificado — é aí que entra o próximo passo.

### Passo 2 — Instalar o certificado CA do Burp no Android

> 💡 **CA (Certificate Authority)**: a "autoridade" em quem o sistema confia pra assinar certificados HTTPS. O Burp gera o seu próprio CA; pro app aceitar o HTTPS interceptado, o Android precisa **confiar nesse CA**. [Glossário](/posts/fundamentos-web-hacking/)

Exporte o CA do Burp em **formato DER**: Proxy → Proxy settings → *Import / export CA certificate* → *Certificate in DER format* → salve como `cacert.der`.

Aqui mora a pegadinha que trava todo mundo. **A partir do Android 7 (Nougat, API 24)**, o Google mudou as regras: **apps que miram API 24+ não confiam mais em CAs instalados pelo usuário** por padrão — só na **store de sistema**. Ou seja, instalar o CA "como usuário" (em Settings) faz o **navegador** funcionar, mas **a maioria dos apps continua ignorando** o seu CA.

Existem dois "níveis" de CA:

| Tipo | Onde fica | Quem confia |
|---|---|---|
| **User CA** | `/data/misc/user/0/cacerts-added/` | Só o navegador e apps que **optarem** por isso (raro) |
| **System CA** | `/system/etc/security/cacerts/` | **Todos** os apps por padrão |

**Por que isso acontece?** Existe um arquivo opcional, o **`network_security_config`** (XML no `res/xml/`, referenciado no `AndroidManifest.xml`), onde o dev declara em quais CAs o app confia. Sem ele, o padrão do Android 7+ é: *só `system`*. Por isso, pra interceptar a maioria dos apps, você precisa instalar o CA do Burp como **CA de sistema** (num device/emulador rootado).

> 💡 **`network_security_config`**: o XML onde o app declara política de rede/TLS (quais CAs confiar, se permite cleartext, se faz pinning). Ler esse arquivo já te diz se o app vai dar trabalho. [Glossário](/posts/fundamentos-web-hacking/)

**Instalando como System CA (emulador rootado):**

O Android espera o CA com um nome no formato `<hash>.0`. Você calcula o hash com o OpenSSL e empurra pro diretório de sistema:

```bash
# 1. Converte o DER do Burp pra PEM e calcula o nome esperado pelo Android
openssl x509 -inform DER -in cacert.der -out cacert.pem
HASH=$(openssl x509 -inform PEM -subject_hash_old -in cacert.pem -noout | head -1)
cp cacert.pem "$HASH.0"

# 2. Monta /system como gravável e copia o CA (emulador "Google APIs", rootado)
adb root
adb remount                       # torna /system gravável
adb push "$HASH.0" /system/etc/security/cacerts/
adb shell chmod 644 /system/etc/security/cacerts/$HASH.0
adb reboot                        # reinicia pro Android reler a store de sistema
```

> ⚠️ Em **Android 10+** o `/system` costuma ser read-only de verdade; nesses casos o caminho é montar um overlay via `adb shell mount -o rw,remount /` ou usar **Magisk + módulo de CA** (ex.: o módulo *MagiskTrustUserCerts* "promove" o user CA a system CA). Em **Android 14** há suporte a CAs atualizáveis em `/apex/com.android.conscrypt/cacerts/`. A ferramenta **objection** automatiza boa parte disso; e o **HTTPToolkit** tem um modo "one-click" que resolve isso pra você.

Depois do reboot, o HTTPS dos apps cai no Burp **decriptado**. Falta um inimigo: o pinning.

### Passo 3 — Derrubando o SSL Pinning

Mesmo com o CA de sistema instalado, alguns apps **se recusam** a falar com o Burp: eles têm o certificado/chave **fixado no código** (pinning) e comparam com o que recebem. Como o Burp apresenta o **dele**, a comparação falha e a conexão morre (você vê erros de TLS handshake / `SSLPeerUnverified` no logcat).

**A solução é instrumentação dinâmica: o Frida.**

> 💡 **Frida**: um toolkit que **injeta JavaScript dentro de um processo em execução** e "engancha" (hooks) funções em tempo real — você consegue trocar o que uma função retorna sem recompilar o app. É o canivete suíço do mobile testing. [Glossário](/posts/fundamentos-web-hacking/)

**Instalar o `frida-server` no device** (precisa de root). Baixe o binário do release que bate com a arquitetura do passo 0 (ex.: `frida-server-XX.X.X-android-x86_64`):

```bash
# No PC: instala o cliente Frida
pip install frida-tools

# Empurra o frida-server pro device e sobe
adb push frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server"
adb shell "/data/local/tmp/frida-server &"   # roda em background no device

# Confirma a conexão (lista processos do device pela USB)
frida-ps -U
```

> 💡 A flag `-U` quer dizer **USB** (conecta no device/emulador). `frida-ps -U` listando processos = Frida funcionando.

Agora, **derrubar o pinning** — o jeito mais fácil é com o **objection**, que é uma camada por cima do Frida com comandos prontos:

> 💡 **objection**: ferramenta construída sobre o Frida que dá comandos prontos ("explore" um app sem escrever script) — bypass de pinning, ler armazenamento, listar activities, tudo num REPL. [Glossário](/posts/fundamentos-web-hacking/)

```bash
pip install objection

# "Explora" o app e cai num REPL interativo (use o package name exato)
objection -g com.exemplo.app explore

# Dentro do REPL do objection:
android sslpinning disable
```

Quando funciona, você vê no console mensagens como `Custom TrustManager ready, overriding SSLContext.init()` e, se o app usa a lib OkHttp, `Found okhttp3.CertificatePinner, overriding CertificatePinner.check()`. Tradução: o objection **engatou** nas funções de validação e fez elas sempre dizerem "ok". O tráfego volta a aparecer no Burp.

**Alternativa só com Frida** (sem objection): use o script clássico da comunidade `frida-multiple-unpinning` (do akabe1). A forma mais limpa é puxá-lo direto do **Frida CodeShare** (repositório oficial de scripts da comunidade) — assim você não precisa ter o `.js` salvo localmente:

```bash
# --codeshare baixa o script pelo nome; -U USB; -f inicia o app do zero (spawn)
# --no-pause: ESSENCIAL — sem isso o Frida sobe o app "congelado" e o hook não roda
frida --codeshare akabe1/frida-multiple-unpinning -U -f com.exemplo.app --no-pause

# Se preferir um arquivo local (.js já baixado), o equivalente é:
#   frida -U -f com.exemplo.app -l frida-multiple-unpinning.js --no-pause
```

> 💡 **Por que `--no-pause`?** Ao usar `-f` (spawn), o Frida inicia o app **suspenso** pra você ter tempo de injetar o hook *antes* do código rodar. O unpinning precisa rodar nesse momento — mas você também precisa **soltar** o processo. `--no-pause` retoma a execução automaticamente após carregar o script. (Sem ele, ou você roda `%resume` no REPL, ou o app fica travado na tela de splash.)

> ⚠️ Pinning robusto (Flutter, implementações nativas customizadas) pode resistir ao script genérico. Aí o caminho é abrir o app no jadx, achar a função que faz o pin e escrever um **hook específico**. Mas, pra 90% dos apps, `objection ... android sslpinning disable` resolve.

### E o iOS?

A lógica é a mesma (interceptar a API), porém exige um **iPhone com jailbreak** (ou simulador, com limitações). Instala-se o CA do Burp em *Settings → General → VPN & Device Management* e depois **ativa-se a confiança total** em *Settings → General → About → Certificate Trust Settings*. O Frida/objection também roda em iOS jailbroken (`frida-ps -U`, `objection ... ios sslpinning disable`). O ecossistema é mais fechado e caro (precisa de hardware/jailbreak), por isso a maioria começa por Android — mas o **mindset é idêntico**.

## O mapa OWASP: Mobile Top 10 + MASVS

Antes de caçar, vale ter o mapa oficial na cabeça. A OWASP mantém dois materiais que andam juntos:

**OWASP Mobile Top 10 (edição 2024)** — as 10 classes de risco mais comuns:

| # | Risco | Em uma frase |
|---|---|---|
| M1 | Improper Credential Usage | Credenciais hardcoded, mal guardadas ou reusadas |
| M2 | Inadequate Supply Chain Security | SDKs/libs de terceiros comprometidos ou inseguros |
| M3 | Insecure Authentication/Authorization | Autn/autz feita errado (muitas vezes **na API**) |
| M4 | Insufficient Input/Output Validation | Não valida entrada/saída (injeções, etc.) |
| M5 | Insecure Communication | Cleartext, TLS fraco, sem pinning |
| M6 | Inadequate Privacy Controls | Coleta/exposição indevida de dados pessoais |
| M7 | Insufficient Binary Protections | Sem anti-tamper/obfuscation (facilita engenharia reversa) |
| M8 | Security Misconfiguration | Componentes exportados, debug ligado, configs frouxas |
| M9 | Insecure Data Storage | Dados sensíveis salvos em claro no aparelho |
| M10 | Insufficient Cryptography | Cripto fraca ou mal aplicada |

**OWASP MASVS** (Mobile Application Security Verification Standard) é o **padrão de verificação** — o "checklist do que deve estar seguro", dividido em grupos de controle: **MASVS-STORAGE** (armazenamento), **MASVS-CRYPTO** (cripto), **MASVS-AUTH** (autn/autz), **MASVS-NETWORK** (comunicação), **MASVS-PLATFORM** (interação com a plataforma: deeplinks, WebView, IPC), **MASVS-CODE** (qualidade/dependências) e **MASVS-RESILIENCE** (resistência a engenharia reversa). O **MASTG** (Testing Guide) é o **passo a passo** de como testar cada um — é a sua bíblia técnica gratuita.

## Achados comuns (e como caçar cada um)

### 1. Insecure data storage (M9) — o que o app salva no aparelho

Apps guardam coisas localmente. O bug é guardar **dado sensível em claro** (token, senha, PII, PAN de cartão). Onde olhar (com o app aberto e logado, num device rootado):

- **SharedPreferences** (Android) — XMLs em `/data/data/<package>/shared_prefs/`.
- **Bancos SQLite** — `/data/data/<package>/databases/`.
- **Arquivos diversos** — `/data/data/<package>/files/`, cache.
- **Keychain (iOS) / Keystore (Android)** — o lugar **certo** pra segredos; o bug é **não** usar isso.

```bash
# Explorar o storage do app pelo objection (sem precisar achar os paths na mão)
objection -g com.exemplo.app explore
# no REPL:
env                             # mostra os diretórios do app (data, cache, files…)
cd /data/data/com.exemplo.app/shared_prefs
ls                              # lista os XMLs de SharedPreferences
filesystem cat prefs.xml        # imprime o conteúdo do arquivo (segredos em claro?)
android keystore list          # lista entradas do Android KeyStore
```

> 💡 Versões antigas do objection tinham um atalho `android shrpref dump`; ele foi **removido** das releases atuais. Hoje o caminho é `env` + navegar no `filesystem` (`ls`/`filesystem cat`), como acima.

```bash
# Ou na unha, via adb. Duas formas, dependendo do app/device:
# (a) app DEBUGGABLE (android:debuggable="true") — run-as funciona SEM root:
adb shell run-as com.exemplo.app cat /data/data/com.exemplo.app/shared_prefs/prefs.xml
# (b) app de produção (não-debuggable) — precisa de root pra ler /data/data alheio:
adb shell "su -c cat /data/data/com.exemplo.app/shared_prefs/prefs.xml"
```

> 💡 `run-as` só te dá acesso ao sandbox de apps marcados como **debuggable** no manifesto (raro em produção) e **não exige root**. Pra um app de loja num device rootado, use `su -c`. É um erro comum tentar `run-as` num app de produção e levar `run-as: package not debuggable`.

**O que a tela mostraria:** um `prefs.xml` com algo como `<string name="auth_token">eyJhbGci...</string>` ou `<string name="user_password">Senha123</string>` em **texto claro**. Token persistido em claro num device que pode ser roubado/clonado = achado válido (impacto depende do que o token destrava).

### 2. Hardcoded secrets / API keys no APK (M1) — decompilando o app

Esse é o **pão com manteiga** do iniciante em mobile, e rende rápido. Devs esquecem chaves dentro do app achando que "ninguém vai abrir". Mas o APK é só um ZIP, e decompilar é trivial.

> 💡 **jadx**: decompilador que transforma o bytecode Dalvik (`.dex`) do APK de volta em **Java legível** — tem versão CLI (`jadx`) e GUI (`jadx-gui`). **apktool**: descompacta o APK em recursos + **smali** (assembly do Dalvik) e remonta — bom pra ler `AndroidManifest.xml` e `res/`. [Glossário](/posts/fundamentos-web-hacking/)

Fluxo de caça:

```bash
# 1. Pegue o APK (do device, se já instalado)
adb shell pm path com.exemplo.app          # mostra o caminho do base.apk
adb pull /data/app/.../base.apk app.apk

# 2. Decompile pra Java e abra no GUI pra navegar
jadx-gui app.apk
# (ou via CLI, jogando a saída numa pasta)
jadx -d app_src app.apk

# 3. Descompacte recursos + manifesto com apktool
apktool d app.apk -o app_decoded
```

Agora **grep tudo** atrás de segredos e endpoints. Inclusive em apps **híbridos** (Cordova/Ionic/React Native), onde a lógica vive num bundle JavaScript (`assets/www/.../main.js`, `index.android.bundle`):

```bash
# Procura padrões de segredo no código decompilado e nos assets
grep -rniE "api[_-]?key|secret|password|token|authorization|bearer" app_src/ app_decoded/

# O velho confiável: strings extrai literais ASCII de qualquer arquivo binário
strings app.apk | grep -iE "https?://|api[_-]?key|AKIA|firebaseio|amazonaws"
```

**Caso real-fictício:** num app Android de funcionários de `app.exemplo.com`, você abre o `assets/www/build/main.js` no jadx-gui e encontra duas constantes em claro:

```javascript
// main.js (bundle do app híbrido) — segredos hardcoded
var LOGIN_URL = "https://api.exemplo.com/v1/login";
var API_KEY_PRINCIPAL = "ak_live_REDACTED_xxxxxxxxxxxx";   // <- chave de API em claro
var API_KEY_BACKOFFICE = "ak_bo_REDACTED_yyyyyyyyyyyy";    // <- chave administrativa
```

Com `API_KEY_BACKOFFICE` você bate direto na [API por trás](/posts/api-security/) e acessa dados administrativos que jamais deveriam estar ao alcance do app do cliente. Report: *"chave administrativa hardcoded no bundle JS do APK permite acesso não autorizado à API de backoffice"*. Severidade conforme o que a chave destrava (aqui, **alto** — CVSS v3.1 **6.5** `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`; CVSS v4.0 **7.1** `AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` — confidencialidade alta; a chave funciona como credencial de baixo privilégio que qualquer um extrai do APK, daí `PR:L`).

> 💡 **Variação que paga:** às vezes o que vaza não é uma key, é um **host interno esquecido** (ex.: `constants.baseURL = "https://app-antigo.herokuapp.com"`). Se esse host estiver **órfão** (provedor não reclamado), vira [subdomain takeover](/posts/subdomain-takeover-broken-link-hijacking/). Já vi APK render dois bugs de uma vez: secret + takeover.

### 3. Insecure communication (M5) — cleartext e ausência de pinning

- **Cleartext HTTP:** o app manda dado sensível em `http://` (sem TLS). Procure no manifesto/`network_security_config`: `android:usesCleartextTraffic="true"` ou `<cleartextTrafficPermitted="true">`. Confirme no Burp vendo a request em claro.
- **Sem pinning:** não é bug por si só, mas vale notar (e foi o que te deixou interceptar fácil). Pinning **ausente** facilita ataques MITM (*Man-in-the-Middle* — alguém na mesma rede se põe "no meio" e lê/altera o tráfego) em redes hostis; só costuma virar report quando combinado com dado sensível em trânsito.

### 4. Exported components e deeplinks inseguros (M8/M3) — caminho pro ATO

Apps Android expõem **componentes** (Activities, Services, BroadcastReceivers, ContentProviders) que **outros apps** podem chamar. Se um componente sensível está **`exported`** sem proteção, um app malicioso (ou um link) pode acioná-lo.

> 💡 **Deeplink**: uma URL especial (ex.: `exemploapp://...` ou `https://exemplo.com/...` via App Links) que **abre direto uma tela do app**. É ótimo pra UX — e perigoso quando a tela aberta confia cegamente no que veio na URL. [Glossário](/posts/fundamentos-web-hacking/)

Onde olhar: o `AndroidManifest.xml` (extraído com apktool). Procure `android:exported="true"` e `<intent-filter>` com `<data android:scheme="...">` (deeplinks) e a categoria `android.intent.category.BROWSABLE` (significa que um **link no navegador** consegue abrir).

```xml
<!-- AndroidManifest.xml — activity exportada que aceita deeplink (sinal de alerta) -->
<activity android:name=".LoginActivity" android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="exemploapp" android:host="auth" />   <!-- exemploapp://auth?... -->
  </intent-filter>
</activity>
```

Teste disparando o componente/deeplink **via adb** (simulando o que um app/link malicioso faria):

```bash
# Iniciar uma activity exportada diretamente
adb shell am start -n com.exemplo.app/.AdminActivity

# Disparar um deeplink, injetando parâmetros controlados pelo atacante
adb shell am start -W -a android.intent.action.VIEW \
  -d "exemploapp://auth?token=ATTACKER_TOKEN&user_id=1001" com.exemplo.app
```

**Por que isso vira ATO:** se a `LoginActivity` recebe um `token`/`user_id` pela deeplink e **confia** nele sem validar a origem, um link de phishing (`exemploapp://auth?token=...`) pode **logar a vítima na conta do atacante** (e fazê-la "guardar" dados onde o atacante vê) ou o contrário — sobrescrever a sessão. É um clique pra ATO. (A mecânica de takeover está detalhada no post [12](/posts/account-takeover/).)

> 💡 **Ferramenta dedicada:** o **drozer** automatiza a varredura de componentes exportados (`run app.package.attacksurface`, `run app.activity.start ...`). É o "scanner de superfície de ataque" do device.

### 5. WebView perigosa (M8) — quando o app embute um navegador

Muitos apps abrem conteúdo web dentro de uma **WebView**. Dois pecados clássicos:

**a) `addJavascriptInterface` — ponte JS → Java.** O dev expõe um objeto Java pro JavaScript da página chamar. Se a WebView carrega **conteúdo controlável** (URL de terceiro, deeplink, HTTP sem TLS sujeito a MITM), esse JS pode invocar métodos nativos.

```java
// VULNERÁVEL: expõe um objeto nativo ao JS da página
webView.getSettings().setJavaScriptEnabled(true);
webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");
```

> 💡 **CVE** (Common Vulnerabilities and Exposures): identificador público de uma falha conhecida (ex.: CVE-2012-6636).
{: .prompt-tip }

Historicamente (antes do **API 17 / Android 4.2**, CVE-2012-6636) isso era **RCE direto** (Remote Code Execution — rodar código arbitrário no dispositivo da vítima, o pior cenário) via reflection. Do API 17 em diante, **só métodos anotados com `@JavascriptInterface`** ficam expostos — o que reduz o risco, mas **não elimina**: se o bridge tem um método poderoso (ex.: que pega um token, lê um arquivo, abre uma URL), o JS malicioso ainda abusa dele. (E se o app mira API < 17, ou usa um SDK compilado pra API < 17, o RCE clássico volta.)

> 💡 **LFI** (Local File Inclusion): ler arquivos locais via parâmetro (ex.: ?file=../../etc/passwd). Em WebView, risco de ler arquivos do sandbox do app.
{: .prompt-tip }

**b) `setAllowFileAccess(true)` + carregamento de URL externa.** Permite que a página acesse `file://` no sandbox do app — combinado com um handler que lê arquivos, vira **leitura arbitrária** de dados do app (parecido com [LFI](/posts/lfi-path-traversal/), mas no device). Procure `setAllowFileAccess`, `setAllowUniversalAccessFromFileURLs`, `setAllowFileAccessFromFileURLs` no código.

## O pulo do gato: interceptou → ataque a API com TODO o arsenal web

Aqui é onde o dinheiro está. **Depois que o tráfego cai no Burp** (CA de sistema + pinning derrubado), o "app mobile" desaparece — você está olhando requests HTTP comuns. **Faça exatamente o que faria num alvo web:**

1. **Mapeie a API.** O Burp já registrou os endpoints conforme você navegou. Anote padrões (`/api/v1/...`), parâmetros, IDs.
2. **IDOR / BOLA** (post [10](/posts/broken-access-control-idor-bola-bfla/)): toda request que carrega "um recurso meu" — troque o ID no Repeater. Apps mobile **adoram** mandar `userId`/`accountId` no corpo, e o backend confia.

```http
POST /api/v1/account/statement HTTP/2
Host: api.exemplo.com
Authorization: Bearer <token_da_Conta_B>
Content-Type: application/json

{"accountId": 1001}   # <- 1001 é da Conta A; veio do app, o servidor confia?
```

3. **BFLA** (post [10](/posts/broken-access-control-idor-bola-bfla/)): a API mobile às vezes expõe endpoints administrativos que o **app esconde no front** — chame-os com um token de usuário comum.
4. **Business logic** (post [20](/posts/business-logic/)): manipule valores que o app "trava" na tela (preço, quantidade, status de pagamento, cupom). O servidor revalida?
5. **Mass assignment**: adicione campos extras ao JSON (`"role":"admin"`, `"isVerified":true`) e veja se o backend aceita.

> 💡 **Mass assignment**: quando a API liga automaticamente os campos do JSON aos atributos do objeto no servidor — se você injeta um campo que não deveria controlar (ex.: `role`), pode escalar privilégio. [Glossário](/posts/fundamentos-web-hacking/)

> 💡 **Regra de ouro do mobile:** o app é só uma "capa" da API. Tudo que você aprendeu de web vale **igualzinho** — e a API mobile costuma ser **menos testada** que o site, então sobram IDOR e BFLA. (Uma trilha dedicada a API vem no post de [API Security](/posts/api-security/) da série.)

**Caso real-fictício de ponta a ponta:** app de uma fintech, `app.exemplo.com`. (1) Crio AVD "Google APIs", instalo o CA do Burp como system CA. (2) O app não conecta → `objection -g com.exemplo.app explore` → `android sslpinning disable`. (3) Tráfego aparece: vejo `POST /api/v1/billing/statement` com `{"accountId": 50231}`. (4) No Repeater, troco pra `50230` com **meu** token (Conta B) → volta a fatura de **outro cliente** (nome, CPF, valor). IDOR confirmado na API mobile. (5) Intruder no `accountId` → centenas de 200 com clientes distintos = **vazamento de PII em escala**. O "bug mobile" era, na real, um IDOR clássico de API. Severidade **alta** — o atacante precisa de **uma conta qualquer** (usa o token da Conta B), então `PR:L`: CVSS v3.1 **6.5** `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` e CVSS v4.0 **7.1** `AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` (confidencialidade alta; muitos programas elevam pra **crítica** na prática pelo volume de PII e o enquadramento de LGPD, mesmo o score base ficando em "alto"). (Post [02](/posts/severidade-impacto-triagem/) pra calibrar; report no formato do post [03](/posts/como-escrever-report-que-paga/).)

## Defesa em camadas

A defesa de mobile é a soma de "device" + "servidor" — e, como sempre, **o servidor é quem manda**.

**1. A API é a fronteira de verdade (a camada que mais importa):**

```javascript
// Node/Express — NUNCA confie no accountId que veio do app; derive do token
app.post("/api/v1/billing/statement", auth, async (req, res) => {
  // ERRADO: const acc = await Account.findById(req.body.accountId);
  const acc = await Account.findOne({ _id: req.body.accountId, ownerId: req.user.id });
  if (!acc) return res.sendStatus(404);     // checagem de dono (object-level)
  return res.json(acc.statement);
});
```

**2. Não guarde segredo no app.** API key embutida **sempre vaza** (o APK é público). Use fluxos de token por usuário (OAuth), segredos só no backend, e **Android Keystore / iOS Keychain** pra material sensível no device — nunca SharedPreferences/`NSUserDefaults` em claro.

**3. Comunicação:** TLS obrigatório (`usesCleartextTraffic="false"`), `network_security_config` restrito, e **pinning** (atrapalha o atacante casual — mas saiba que **não substitui** autorização no servidor; pinning só protege o canal, não a regra de negócio).

**4. Plataforma:** marque `android:exported="false"` em tudo que não precisa ser público; **valide a origem e os parâmetros** de deeplinks (não confie no `token`/`user_id` da URL); em WebView, `setJavaScriptEnabled(false)` se não precisar, **evite `addJavascriptInterface`** (e, se usar, exponha o mínimo com `@JavascriptInterface`), `setAllowFileAccess(false)`, e nunca carregue URL controlável por terceiro.

**5. Binário:** ofuscação (R8/ProGuard) e detecção de root/Frida **elevam o custo** do atacante — mas são **defesa em profundidade**, não a correção. Quem trata o app como confiável e a API como burra está vulnerável por definição.

> ❌ **O que NÃO basta:** esconder o endpoint admin só no app, "confiar" que ninguém decompila o APK, fazer pinning e achar que resolveu autorização, ou validar regra de negócio no cliente. **Tudo que importa, valide no servidor.**

## Ferramentas + labs legais

**Ferramentas (todas gratuitas/open-source):**

- **Android Studio / AVD** — emulador (use imagem "Google APIs" pra ter root).
- **adb** — controle do device (Platform Tools).
- **Burp Suite** — interceptar e atacar a API (Repeater, Intruder).
- **jadx / jadx-gui** — decompilar APK pra Java legível.
- **apktool** — descompactar recursos + smali (ler `AndroidManifest.xml`).
- **Frida** — instrumentação dinâmica (hooks em runtime).
- **objection** — Frida "com baterias": `android sslpinning disable`, dump de storage, etc.
- **drozer** — varredura de componentes exportados.
- **MobSF (Mobile Security Framework)** — análise **estática + dinâmica automatizada**; joga o APK e ele já lista secrets, permissões, componentes exportados, cleartext. Ótimo pra um **primeiro scan** que aponta onde focar.

**Labs autorizados pra praticar:**

- **[OWASP MASTG Crackmes (UnCrackable Apps)](https://mas.owasp.org/crackmes/)** — desafios oficiais de engenharia reversa/pinning (Level 1/2/3).
- **[InsecureBankv2](https://github.com/dineshshetty/Android-InsecureBankv2)** ([MASTG-APP-0010](https://mas.owasp.org/MASTG/apps/android/MASTG-APP-0010/)) — banco vulnerável de propósito (storage, logging, exported, etc.).
- **[DIVA Android](https://mas.owasp.org/MASTG/apps/android/MASTG-APP-0007/)** — "Damn Insecure and Vulnerable App", 13 desafios clássicos.
- **PortSwigger / TryHackMe / HackTheBox** têm trilhas mobile e de API que complementam.

## Checklist do caçador (mobile)

- [ ] Subi um AVD "Google APIs" (ou device rootado) e o `adb devices` enxerga.
- [ ] Proxy do device apontado pro Burp; CA do Burp instalado como **system CA** (não só user).
- [ ] App conectou? Se não, **derrubei o pinning** (`objection ... android sslpinning disable` ou Frida).
- [ ] Decompilei o APK (jadx) e descompactei (apktool); rodei `grep`/`strings` atrás de **secrets/keys/hosts**.
- [ ] Li o `AndroidManifest.xml`: `exported="true"`, deeplinks (`BROWSABLE`), `usesCleartextTraffic`, `network_security_config`.
- [ ] Conferi o **storage** do app (SharedPreferences/SQLite) por token/PII em claro.
- [ ] Testei **deeplinks/activities exportadas** via `adb am start` (pensando em ATO).
- [ ] Achei WebView? Procurei `addJavascriptInterface` e `setAllowFileAccess`.
- [ ] **O pulo do gato:** levei o tráfego pro Repeater e ataquei a API com **IDOR/BFLA/business logic/mass assignment** (2 contas!).
- [ ] Rodei o **MobSF** pra não deixar nada óbvio passar.

## Pegadinhas / o que NÃO funciona

- **Instalar o CA só "como usuário" e esperar interceptar tudo.** No Android 7+ a maioria dos apps **ignora** o user CA. Sem system CA (ou Magisk), você só vê o navegador.
- **Achar que pinning = bug.** Pinning **ausente** raramente é report sozinho; pinning **presente** é só um obstáculo que você contorna pra testar a API.
- **Reportar "API key no APK" sem impacto.** Uma key de serviço público (ex.: Google Maps com restrição de pacote) muitas vezes é **informativa**. Mostre o que a key **destrava** de fato.
- **Esquecer que o emulador é detectável.** Alguns apps barram emulador/root. Use device físico ou contorne com hooks (objection: `android root disable`).
- **Parar no app.** O app raramente é o prêmio — a **API por trás** é. Não interceptou nada de interessante? Talvez o app só sirva conteúdo estático e o ouro esteja em outro endpoint.

## O que você precisa lembrar

- **Mobile bug bounty ≈ testar a API por trás** + um punhado de falhas de device.
- O trabalho "novo" é só **colocar o Burp no meio**: system CA (Android 7+) + **bypass de pinning** (Frida/objection). Depois disso, é web.
- Achados de device clássicos: **secrets no APK** (jadx/strings), **data storage** em claro, **deeplink/exported** inseguro (→ ATO), **WebView** perigosa.
- **A autorização real é no servidor.** Sempre.

> 💡 **Dica de ouro:** quando bater o "não sei mobile", lembre — **decompile com jadx e grep por `key|secret|token|http`**, e **jogue o tráfego no Burp**. Esses dois movimentos sozinhos já acham a maioria dos bugs de app mobile. O resto é o arsenal web que você já tem.

## Nota ética

Tudo aqui é pra **alvos autorizados**: programas de bug bounty com app **no escopo**, pentests contratados e os **labs legais** (MASTG Crackmes, InsecureBankv2, DIVA) — que existem justamente pra você treinar pinning, decompilação e exploração sem tocar em ninguém. Decompilar e instrumentar **o app de outra pessoa fora de escopo** é violação de propriedade/lei. Reporte com responsabilidade, anonimize PII nas evidências e use o conhecimento pra deixar os apps mais seguros.

## Referências

- [OWASP Mobile Application Security (MAS) — MASVS, MASTG, MASWE](https://mas.owasp.org/)
- [OWASP Mobile Top 10 (2024)](https://owasp.org/www-project-mobile-top-10/) · [lista dos riscos](https://owasp.org/www-project-mobile-top-10/2023-risks/)
- [OWASP MASTG — UnCrackable Crackmes](https://mas.owasp.org/crackmes/) · [InsecureBankv2 (MASTG-APP-0010)](https://mas.owasp.org/MASTG/apps/android/MASTG-APP-0010/) · [DIVA (MASTG-APP-0007)](https://mas.owasp.org/MASTG/apps/android/MASTG-APP-0007/)
- [Android Developers — Network security configuration](https://developer.android.com/privacy-and-security/security-config) · [Changes to Trusted CAs in Android Nougat](https://android-developers.googleblog.com/2016/07/changes-to-trusted-certificate.html)
- [Frida — documentação Android](https://frida.re/docs/android/) · [frida-multiple-unpinning (CodeShare, akabe1)](https://codeshare.frida.re/@akabe1/frida-multiple-unpinning/) · [objection (MASTG-TOOL-0029)](https://mas.owasp.org/MASTG/tools/android/MASTG-TOOL-0029/)
- [jadx](https://github.com/skylot/jadx) · [apktool](https://apktool.org/) · [MobSF](https://mobsf.github.io/docs/)
- [WithSecure — WebView addJavascriptInterface RCE](https://labs.withsecure.com/publications/webview-addjavascriptinterface-remote-code-execution)

---
*Relacionado na série: [Broken Access Control — IDOR/BOLA/BFLA](/posts/broken-access-control-idor-bola-bfla/) · [Account Takeover](/posts/account-takeover/) · [Segurança de APIs](/posts/api-security/) · [Business Logic Flaws](/posts/business-logic/) · [Security Misconfiguration](/posts/security-misconfiguration-cve-hunting/) · [LFI / Path Traversal](/posts/lfi-path-traversal/) · [Subdomain Takeover](/posts/subdomain-takeover-broken-link-hijacking/) · base: [Recon & Discovery](/posts/recon-discovery/) · pra reportar: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)** — o índice da série, do básico ao avançado.*
