---
title: "Guia Completo de Bug Bounty: Índice da Série (do Básico ao Avançado)"
description: "O mapa da série inteira — fundamentos (web, recon, severidade, report) e um post por classe de vulnerabilidade (IDOR, XSS, SQLi, SSRF, RCE, ATO e mais), com uma trilha de estudo sugerida."
author: matheus
date: 2026-06-04 09:00:00 -0300
categories: [Bug Bounty]
tags: ["bug bounty", "web security", "OWASP", "roadmap", "índice", "estudo"]
image: /assets/img/covers/guia-bug-bounty.png
pin: true
comments: true
---

## Sobre esta série

Esta é uma série de estudo de **bug bounty / segurança ofensiva web**, escrita do **básico ao avançado** pra qualquer pessoa acompanhar — de quem nunca interceptou uma request até quem já caça faz tempo. Cada post é **autossuficiente** (explica o que precisa), traz **teoria + como funciona por trás + exploração passo a passo + caso prático + defesa em camadas + checklist**, e tudo é **prática autorizada** (labs e programas com permissão).

> Os exemplos são **fictícios-realistas e anonimizados** — baseados em *padrões* de falhas reais, sem expor alvos, empresas ou dados de ninguém.

> 📥 **[Baixe o guia completo em PDF](/assets/pdf/guia-completo-de-bug-bounty.pdf)** — os 26 capítulos num arquivo só (381 páginas), com a identidade do Acervo de TI, pra ler offline.
{: .prompt-info }

## Como usar (trilha sugerida)

1. **Comece pelos Fundamentos** (`00` → `03`), na ordem. É o alicerce que os outros posts assumem (HTTP, Burp, recon, como medir impacto e como reportar).
2. **Depois, ataque as vulnerabilidades** (`10` em diante). Pode ler na ordem que quiser, mas a numeração já vai do mais comum/fundamental pro mais avançado.
3. **Pratique cada uma** nos labs indicados (PortSwigger Academy, DVWA, TryHackMe, HackingClub) antes de tocar em qualquer programa real.

---

## 🧱 Fundamentos

| # | Post | O que você aprende |
|---|---|---|
| 00 | [Fundamentos de Web Hacking & Bug Bounty](/posts/fundamentos-web-hacking/) | A área, pilares da SI (CIA), como a web funciona, HTTP, autn × autz, OWASP Top 10, Burp do zero (incl. FoxyProxy + certificado), mindset |
| 01 | [Recon & Discovery](/posts/recon-discovery/) | Recon passivo/ativo: subdomínios, httpx, gau, análise de JS, fuzzing (ffuf/katana), dorks, achar programas |
| 02 | [Severidade, Impacto e Triagem](/posts/severidade-impacto-triagem/) | CVSS 3.1/4.0 passo a passo, CWE, VRT da Bugcrowd, como argumentar impacto |
| 03 | [Como Escrever um Report que Paga](/posts/como-escrever-report-que-paga/) | Estrutura que não gera questionamento + como defender o bounty na triagem |

## 🎯 Vulnerabilidades (do básico ao avançado)

| # | Post | Classe |
|---|---|---|
| 10 | [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/) | A falha que mais paga: acesso indevido a objeto/função |
| 11 | [Security Misconfiguration & Caça a CVEs/1-day](/posts/security-misconfiguration-cve-hunting/) | Config inseguro, `.git`/backup/debug, fingerprint → CVE → PoC |
| 12 | [Account Takeover (ATO)](/posts/account-takeover/) | Reset/refresh, JWT (alg=none, weak secret, confusion), OAuth, 2FA |
| 13 | [XSS e HTML Injection](/posts/xss-html-injection/) | Reflected/Stored/DOM, contexto, bypass de WAF, CSP |
| 14 | [SQL Injection](/posts/sql-injection/) | UNION, blind, sqlmap, NoSQLi, queries parametrizadas |
| 15 | [RCE: Command Injection, SSTI e Upload](/posts/rce-command-injection-ssti/) | Caminhos pra shell: comando no SO, template injection, upload |
| 16 | [SSRF](/posts/ssrf/) | Servidor como proxy: rede interna, cloud metadata, chaining → RCE |
| 17 | [LFI e Path Traversal](/posts/lfi-path-traversal/) | `../`, wrappers PHP, log poisoning → RCE |
| 18 | [CRLF Injection & HTTP Request Smuggling](/posts/crlf-request-smuggling/) | Quebrar o parsing do HTTP: `%0d%0a`, desync CL.TE/TE.CL |
| 19 | [Open Redirect](/posts/open-redirect/) | O trampolim: chaining pra OAuth token theft, SSRF, phishing |
| 20 | [Business Logic Flaws](/posts/business-logic/) | Quando a regra de negócio é o bug (preço, workflow, replay) |
| 21 | [Race Conditions](/posts/race-conditions/) | A janela TOCTOU: limit-overrun e single-packet attack |
| 22 | [Denial of Service (aplicação)](/posts/denial-of-service-aplicacao/) | ReDoS, zip bomb, GraphQL — com PoC responsável |
| 23 | [Subdomain Takeover & Broken Link Hijacking](/posts/subdomain-takeover-broken-link-hijacking/) | Herdar DNS/recursos abandonados (S3, Pages, Heroku) |
| 24 | [Bug Bounty em Mobile (Android/iOS)](/posts/mobile-bug-bounty/) | Interceptar o app, bypass de SSL pinning, decompilar APK e testar a API por trás |
| 25 | [Segurança de APIs (OWASP API Top 10)](/posts/api-security/) | BOLA/BFLA, mass assignment, excessive data exposure, GraphQL |
| 28 | [XXE (XML External Entity)](/posts/xxe-xml-external-entity/) | Abusar do parser de XML: ler arquivos, SSRF e exfiltração OOB |
| 29 | [Insecure Deserialization](/posts/insecure-deserialization/) | De objeto serializado a RCE via gadget chains (PHP/Java/Python) |
| 30 | [Prototype Pollution](/posts/prototype-pollution/) | Envenenar o `Object` do JS → DOM XSS, bypass de auth, RCE no Node |
| 31 | [Cloud & AWS Misconfiguration](/posts/cloud-aws-misconfiguration/) | S3 público, chaves vazadas, IMDS via SSRF, takeover de recurso cloud |

## 🧠 Avançado e fechamento

| # | Post | O que você aprende |
|---|---|---|
| 26 | [Chaining de Vulnerabilidades](/posts/chaining-vulnerabilidades/) | Encadear falhas "pequenas" em algo crítico: Open Redirect→OAuth, SSRF→RCE, XSS→ATO |
| 27 | [Anatomia de uma Caçada: do Recon ao Report](/posts/capstone-do-recon-ao-report/) | Walkthrough end-to-end que costura a série inteira numa caçada (fictícia) real |

---

## Conectando tudo

- Os pilares **CIA** ([Fundamentos](/posts/fundamentos-web-hacking/)) dizem **qual** propriedade a falha quebra; a [Severidade & Impacto](/posts/severidade-impacto-triagem/) transforma isso em **bounty**; o [Report que paga](/posts/como-escrever-report-que-paga/) ensina a **comunicar**. Os capítulos **`10`–`25` e `28`–`31`** são o **como achar e explorar** cada classe — do [Broken Access Control](/posts/broken-access-control-idor-bola-bfla/) ao [Cloud & AWS](/posts/cloud-aws-misconfiguration/).
- E os capítulos **`26`** ([Chaining](/posts/chaining-vulnerabilidades/)) e **`27`** ([Anatomia de uma Caçada](/posts/capstone-do-recon-ao-report/)) fecham a série: boa parte das classes **se combina** — Open Redirect → roubo de token (OAuth), SSRF → RCE / credenciais de cloud, XSS → Account Takeover, IDOR + Business Logic → fraude. Depois de dominar cada classe, o pulo do gato é **encadear**.

## Nota ética

Tudo aqui é pra **estudo e testes autorizados** — labs e programas de bug bounty/pentest com permissão. Testar sistemas de terceiros sem autorização é crime (no Brasil, art. 154-A do CP), além de desnecessário: existe lab de sobra pra treinar à vontade. Use pra **proteger**, reportar com responsabilidade e ensinar.

*Bons bugs! 🐛 — [matheuslaidler.github.io](https://matheuslaidler.github.io)*
