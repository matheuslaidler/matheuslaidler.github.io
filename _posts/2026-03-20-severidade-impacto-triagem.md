---
title: "Severidade, Impacto e Triagem: falando a língua do programa"
description: "Como impacto define o bounty, como calcular CVSS 3.1/4.0 passo a passo, referenciar CWE, prever a classificação com o VRT da Bugcrowd e argumentar com o triador."
author: matheus
date: 2026-03-20 18:34:00 -0300
categories: [Bug Bounty, Fundamentos]
tags: ["CVSS", "CWE", "VRT", "Bugcrowd", "severidade", "triagem", "bug bounty", "web security", "report writing"]
image: /assets/img/covers/severidade-impacto-triagem.png
pin: false
comments: true
---

## O mesmo bug, dois bounties diferentes

> 💡 **IDOR** (e **PII**): IDOR é trocar um identificador na request (`?id=1001` → `?id=1002`) e acessar dado que não é seu; PII são dados pessoais (CPF, cartão, telefone). Detalhe no [Glossário](/posts/fundamentos-web-hacking/#glossário-rápido-os-termos-que-vão-aparecer-na-série).

Dois caçadores acham o **mesmo** IDOR no mesmo programa. O primeiro escreve: *"dá pra trocar o `id` e ver o perfil de outro usuário"*. Recebe **R$500** e um "obrigado". O segundo escreve: *"qualquer usuário autenticado lê nome, CPF e telefone de **todos** os clientes; enumerei 2.000 contas em 4 minutos — vazamento de PII em massa, violação de LGPD"*, anexa o vetor `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` (6.5, Medium) com a justificativa de subir pra High pela escala, e cita a [CWE-639](https://cwe.mitre.org/data/definitions/639.html). Recebe **R$5.000**.

Mesma falha. A diferença não foi a técnica, foi a capacidade de **traduzir o achado para a língua que o programa usa para precificar risco**: severidade, impacto, CVSS, CWE e a taxonomia da plataforma. Esse post é sobre essa língua. Quem domina ela não só ganha mais por bug, como **discute de igual pra igual** quando o triador tenta rebaixar um achado.

> A regra que rege tudo: **o bounty paga pelo impacto, não pelo esforço.** Você pode ter quebrado a cabeça numa cadeia de 6 requests; se o resultado final é "consigo ler um e-mail que já é semi-público", paga pouco. Já um `?id=1001 → ?id=1002` de 10 segundos que expõe CPF de milhões pode ser crítico. Triador não paga sofrimento; paga consequência.

## O que é "severidade" e o que é "impacto"

São coisas relacionadas, mas não iguais. Confundir as duas é o erro de quem está começando.

- **Impacto** é a **consequência no mundo real**: o que um atacante consegue fazer e o tamanho do estrago. "Lê PII de todo mundo", "transfere dinheiro", "derruba o serviço".
- **Severidade** é a **nota padronizada** que a gente dá pra esse impacto, numa escala que todos entendem (Baixo/Médio/Alto/Crítico, ou um número CVSS de 0 a 10).

> **Analogia:** numa emergência médica, o **impacto** é "o paciente está com dor no peito e falta de ar". A **severidade** é a classificação de triagem: a pulseira vermelha/amarela/verde que define a ordem de atendimento. O enfermeiro da triagem (o **triador** do programa) pega a sua descrição do impacto e atribui uma pulseira. Se você descreve mal o sintoma, leva pulseira verde numa coisa que era vermelha.

E é por isso que **triagem** (o ato do programa avaliar, validar e classificar o seu report) é o momento em que o seu impacto vira severidade vira dinheiro. Você não controla a decisão final, mas controla **toda a informação que alimenta ela**.

## Por que o impacto define o bounty (e como pensar nele)

Programas pagam para **reduzir risco**. Risco, na prática, é `probabilidade × impacto`. Como o seu report já prova que a falha existe (probabilidade ~100%), o que sobra para precificar é o **impacto**. E impacto tem três dimensões que você precisa atacar em todo report:

| Dimensão | Pergunta que o triador faz | Como você maximiza |
|---|---|---|
| **Sensibilidade do dado/ação** | "O que vaza ou o que dá pra fazer?" | PII (CPF, cartão), credenciais, dinheiro, RCE > dado público |
| **Escala** | "Quantos usuários/contas isso afeta?" | "todos os clientes" >>> "só a minha conta" |
| **Pré-condições** | "Quão difícil é explorar?" | sem login e sem interação > precisa ser admin + phishing |

> **Analogia:** é igual avaliar um vazamento de água. Não importa só que vaza. Importa **o que** vaza (água limpa ou esgoto?), **quanto** vaza (uma gota ou um cano rompido?) e **o que precisa acontecer** pra vazar (sempre, ou só quando alguém abre três torneiras ao mesmo tempo?). Um report bom responde as três perguntas antes do triador perguntar.

A tabela `tip-impacto` que você vai montar mentalmente em todo achado é essa. Guarde-a.

## CVSS: o "termômetro" universal de severidade

**CVSS** (Common Vulnerability Scoring System) é o padrão da indústria, mantido pela [FIRST.org](https://www.first.org/cvss/), para transformar características de uma vulnerabilidade num **número de 0.0 a 10.0**. É o que o NVD usa, o que vai nas CVEs, e o que a maioria dos programas espera ver no seu report.

Pensa no CVSS como uma **receita**: você escolhe os ingredientes (as métricas), e a fórmula cospe o prato (o score). O legal é que a "lista de ingredientes" (o **vetor**) é mais importante que o número, porque ela mostra **como você chegou lá**. Um triador pode discordar do seu número, mas se o vetor está certo, a conversa é objetiva.

### A escala qualitativa (igual em 3.1 e 4.0)

| Faixa | Rating |
|---|---|
| 0.0 | None / Informativo |
| 0.1 – 3.9 | Low / Baixo |
| 4.0 – 6.9 | Medium / Médio |
| 7.0 – 8.9 | High / Alto |
| 9.0 – 10.0 | Critical / Crítico |

### CVSS v3.1: as 8 métricas base que você precisa dominar

O **vetor** começa sempre com `CVSS:3.1/` seguido das oito métricas base, separadas por `/`. Elas se dividem em dois grupos: **explorabilidade** (quão fácil é atacar) e **impacto** (o que acontece). Vamos uma a uma, com o *porquê* de cada valor:

**Grupo Explorabilidade:**

| Métrica | Sigla | Valores | O que significa (do "pior pro melhor" pro atacante) |
|---|---|---|---|
| **Attack Vector** | `AV` | `N` Network, `A` Adjacent, `L` Local, `P` Physical | De onde se ataca. `N` (pela internet) é o pior caso → score mais alto |
| **Attack Complexity** | `AC` | `L` Low, `H` High | Precisa de condições especiais fora do controle do atacante? `L` = não, é só mandar |
| **Privileges Required** | `PR` | `N` None, `L` Low, `H` High | Que nível de acesso o atacante precisa ter? `N` = nenhum (anônimo) é o pior caso |
| **User Interaction** | `UI` | `N` None, `R` Required | A vítima precisa clicar/fazer algo? `N` = ataque sozinho, sem ajuda |
| **Scope** | `S` | `U` Unchanged, `C` Changed | A falha estoura o "compartimento" dela e afeta outros componentes? `C` = sim (mais grave) |

**Grupo Impacto** (a tríade clássica de segurança, a **CIA**):

| Métrica | Sigla | Valores | O que significa |
|---|---|---|---|
| **Confidentiality** | `C` | `H` High, `L` Low, `N` None | Quanto dado **vaza**? `H` = vaza tudo que importa |
| **Integrity** | `I` | `H` High, `L` Low, `N` None | Quanto dado o atacante consegue **alterar**? |
| **Availability** | `A` | `H` High, `L` Low, `N` None | Quanto o serviço fica **indisponível**? |

> **Analogia do Scope (`S`), que é a métrica que mais confunde:** imagina um apartamento. Se você arromba a porta e rouba só aquele apartamento, o `Scope` é **Unchanged**: o estrago ficou contido na "autoridade" daquele recurso. Agora, se ao arrombar você ganha a chave-mestra do prédio inteiro e a sala de segurança, o `Scope` é **Changed**, porque a falha em um componente comprometeu **outros**. Exemplo clássico de `S:C`: um XSS (que vive no navegador da vítima) ataca a sessão e o domínio da aplicação, saindo do "compartimento" dele.

### Lendo um vetor de cabeça

Pega este, de uma RCE não autenticada (RCE é *Remote Code Execution*, rodar código no servidor do alvo, o pior caso):

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
```

Traduzindo em voz alta: *"Ataco pela rede (`AV:N`), é fácil (`AC:L`), não preciso de login (`PR:N`) nem que a vítima faça nada (`UI:N`); não estoura o escopo (`S:U`), mas vaza tudo (`C:H`), altera tudo (`I:H`) e derruba tudo (`A:H`)."* Resultado: **9.8 Critical**. É o vetor canônico de RCE no [VRT da Bugcrowd](https://github.com/bugcrowd/vulnerability-rating-taxonomy/blob/master/mappings/cvss_v3/cvss_v3.json).

### Calculando um score passo a passo (sem decoreba)

Você **não precisa** calcular na mão: a [calculadora oficial da FIRST](https://www.first.org/cvss/calculator/3.1) faz isso e gera o vetor pra você. Mas entender a mecânica blinda você contra triador que erra a conta. A fórmula da v3.1 tem três peças:

1. **ISS (Impact Sub-Score):** `1 − [(1−C)(1−I)(1−A)]`, combina a tríade CIA. Cada métrica vira um peso (`H=0.56`, `L=0.22`, `N=0`).
2. **Impact:** com `Scope:U`, é `6.42 × ISS`.
3. **Exploitability:** `8.22 × AV × AC × PR × UI` (cada um com seu peso da tabela oficial).

O Base Score (com `S:U`) é `roundup(min(Impact + Exploitability, 10))`.

Vamos calcular um **IDOR que lê PII, exigindo só estar logado**, vetor `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`:

```python
# Pesos oficiais da spec CVSS v3.1 (first.org/cvss/v3.1/specification-document)
AV, AC, PR, UI = 0.85, 0.77, 0.62, 0.85   # N, L, L (com Scope:U), N
C, I, A        = 0.56, 0.0, 0.0           # H, N, N

ISS    = 1 - ((1 - C) * (1 - I) * (1 - A))   # = 0.56
Impact = 6.42 * ISS                          # = 3.5952
Expl   = 8.22 * AV * AC * PR * UI            # = 2.8352...
Base   = min(Impact + Expl, 10)              # = 6.4304...
# roundup p/ 1 casa decimal (regra da spec: arredonda pra CIMA) -> 6.5 (Medium)
```

> ⚠️ **Pegadinha do `Scope` no peso do `PR`:** quando `Scope:U`, `PR:L` vale **0.62**; quando `Scope:C`, `PR:L` sobe pra **0.68** (e `PR:H` vai de **0.27** para **0.50**). O `PR` é a **única métrica cujo peso muda conforme o escopo**, e esquecer disso é o erro de conta mais comum. Conferindo na [calculadora oficial](https://www.first.org/cvss/calculator/3.1), o vetor acima dá exatamente **6.5 (Medium)**. Sempre valide o número na ferramenta em vez de confiar na conta de cabeça.

A lição prática: **monte o vetor com cuidado e deixe a calculadora dar o número.** O seu trabalho de caçador é escolher as 8 letras certas — e saber defender cada uma.

### CVSS v4.0: o que mudou (e por que aprender)

A v4.0 (lançada em 2023, [spec oficial](https://www.first.org/cvss/v4.0/specification-document)) é a evolução. Programas estão migrando devagar; você vai ver os dois por anos. As mudanças que importam:

- **Quatro grupos de métricas:** **Base**, **Threat** (substitui o antigo Temporal, reflete se já existe exploit ativo), **Environmental** (ajuste pro seu ambiente) e **Supplemental** (contexto que não muda o score).
- **Nomenclatura nova:** **CVSS-B** (só Base), **CVSS-BT** (Base + Threat), **CVSS-BTE** (tudo). Quando você reporta com base só na falha, é tecnicamente um **CVSS-B**.
- **Nasce o `AT` (Attack Requirements):** separa "complexidade do ataque" das "condições de deployment que precisam existir". Antes tudo ficava enfiado no `AC`.
- **`UI` agora tem 3 valores:** `N` None, `P` **Passive** (interação acontece sem a vítima querer, tipo carregar uma página) e `A` **Active** (a vítima precisa agir deliberadamente).
- **Morre o `Scope`; nasce a separação Sistema Vulnerável × Sistema Subsequente:** em vez do `S`, agora você pontua o impacto no **sistema vulnerável** (`VC`/`VI`/`VA`) **e** o impacto em **sistemas subsequentes** (`SC`/`SI`/`SA`). É um jeito mais honesto de medir "o estrago vazou pra fora?".

O mesmo RCE do exemplo, em v4.0, fica assim:

```
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N
```

> ⚠️ **A pegadinha que pega todo mundo: esse vetor NÃO dá 9.8 em v4.0, dá `9.3` (Critical).** Em v3.1, comprometer "tudo" no servidor (`C:H/I:H/A:H` com `S:U`) chega a 9.8. Em v4.0, o impacto se divide entre **sistema vulnerável** (`VC/VI/VA`, que estão `H`) e **sistemas subsequentes** (`SC/SI/SA`, aqui `N`). Como o estrago ficou contido no servidor afetado e não vazou pra outros sistemas, o teto cai: **só chega a 10.0 quando os sistemas subsequentes também são `H`** (`SC:H/SI:H/SA:H`). É exatamente assim que a [FIRST pontua o Log4Shell](https://www.first.org/cvss/examples) (CVE-2021-44228): vulnerável-`H`, subsequente-`N` → **9.3**. Moral: **não copie o número da v3.1 pra v4.0**, recalcule sempre na [calculadora oficial v4.0](https://www.first.org/cvss/calculator/4.0).

> 💡 Na prática do dia a dia: aprenda v3.1 **de verdade** (é o que mais aparece) e saiba **traduzir** pra v4.0. Quase todo programa aceita o vetor v3.1; alguns pedem v4.0. Ter os dois no report é sinal de maturidade.

## CWE: dando o "nome do sobrenome" da falha

Se o CVSS responde **"quão grave?"**, o **CWE** (Common Weakness Enumeration, da [MITRE](https://cwe.mitre.org/)) responde **"que tipo de fraqueza é?"**. É um catálogo numerado de **classes de erro de software**, tipo um CID-10 da segurança. Cada entrada tem um número (`CWE-NNN`), um nome canônico e uma descrição.

> **Analogia:** o CVSS é o "termômetro" (mede a febre); o CWE é o "diagnóstico" (é gripe, dengue ou COVID?). Dois reports podem ter o mesmo score 7.5, mas CWEs completamente diferentes, e o time de dev conserta cada classe de um jeito.

Citar o CWE certo faz três coisas pelo seu report: mostra que você **sabe o que achou**, ajuda o time a **rotear pro dono certo do código**, e **acelera a triagem**. Os que mais aparecem em bug bounty web:

| CWE | Nome oficial (MITRE) | Classe que você costuma reportar |
|---|---|---|
| [CWE-639](https://cwe.mitre.org/data/definitions/639.html) | Authorization Bypass Through User-Controlled Key | IDOR/BOLA |
| [CWE-862](https://cwe.mitre.org/data/definitions/862.html) | Missing Authorization | BFLA, função sem checagem de permissão |
| [CWE-200](https://cwe.mitre.org/data/definitions/200.html) | Exposure of Sensitive Information to an Unauthorized Actor | vazamento de PII/dados |
| [CWE-79](https://cwe.mitre.org/data/definitions/79.html) | Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting') | XSS |
| [CWE-89](https://cwe.mitre.org/data/definitions/89.html) | Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection') | SQLi |
| [CWE-918](https://cwe.mitre.org/data/definitions/918.html) | Server-Side Request Forgery (SSRF) | SSRF |
| [CWE-22](https://cwe.mitre.org/data/definitions/22.html) | Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal') | LFI/Path Traversal |

> 💡 **Como referenciar:** escreva `CWE-639: Authorization Bypass Through User-Controlled Key` e linke pra `https://cwe.mitre.org/data/definitions/639.html`. Não invente o nome: pega o **canônico** direto da MITRE. Nome errado mina sua credibilidade na hora.

## VRT da Bugcrowd: prevendo a classificação ANTES de reportar

> 💡 O **ATO** (Account Takeover) é o comprometimento total da conta da vítima (sessão, brute force, phishing), com acesso aos dados e ações dela.
{: .prompt-tip }

Aqui está o segredo que economiza horas: o [**VRT (Vulnerability Rating Taxonomy)**](https://bugcrowd.com/vulnerability-rating-taxonomy) da Bugcrowd é uma tabela pública que diz, pra cada classe de falha, **qual prioridade a Bugcrowd tende a dar por padrão**. É literalmente o "gabarito" que os triadores usam. Ler o VRT antes de reportar é como **ver as respostas da prova** — você já sabe se aquilo vale P1 ou P5.

A escala de prioridade vai de **P1 a P5**:

| Prioridade | Significado | Paga? | Exemplos típicos |
|---|---|---|---|
| **P1** | Critical | $$$ | RCE, SQLi com leitura no servidor, ATO (*account takeover*, roubo de conta) em massa, roubo financeiro |
| **P2** | High | $$ | IDOR lendo PII, SSRF interno, autenticação quebrada significativa |
| **P3** | Medium | $ | XSS armazenado limitado, CSRF em ação relevante, IDOR de dado moderado |
| **P4** | Low | $ (baixo) | XSS refletido com pré-condições, open redirect, falhas de menor alcance |
| **P5** | Informational | normalmente **não paga** | "best practice", falhas por design, risco aceito pelo negócio |

O ouro está nas variações por **contexto**. Um IDOR não é uma coisa só. O VRT atual (Broken Access Control → IDOR, [VRT 1.18](https://github.com/bugcrowd/vulnerability-rating-taxonomy)) detalha por **tipo de identificador** (iterável/sequencial vs. GUID/complexo) e **ação**:

- **P1:** Modificar/ver **dado sensível** com identificador **iterável** (sequencial).
- **P2:** Modificar **dado sensível** com identificador **iterável**.
- **P3:** Ver **dado sensível** com identificador **iterável**.
- **P4:** Modificar/ver **dado sensível** com identificador **complexo (GUID/UUID)**.
- **P5:** Ver **dado não-sensível**.

Repara: **o que muda a prioridade é exatamente o trio que discutimos**, ou seja, sensibilidade (sensível > não-sensível), ação (modificar > só ler) e dificuldade (ID **iterável** vale mais que GUID, porque é trivial de enumerar em massa). O VRT inclusive **mapeia cada categoria pra um vetor CVSS de referência** ([JSON público no GitHub](https://github.com/bugcrowd/vulnerability-rating-taxonomy/blob/master/mappings/cvss_v3/cvss_v3.json)). Alguns exemplos reais desse mapeamento:

```text
remote_code_execution_rce      -> AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H   (9.8, P1)
sql_injection                  -> AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N   (8.2, P1)
using_default_credentials      -> AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L   (9.4, P1)
bypass_of_password_confirmation-> AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:N   (7.1, P2)
username_enumeration           -> AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N   (3.7, P4/P5)
```

> 💡 **Workflow que eu uso:** achei o bug → abro o VRT → encontro a categoria mais próxima → vejo a prioridade-base e o vetor de referência → **ajusto pro meu contexto** (minha escala é maior? meu dado é mais sensível?) → escrevo o report já alinhado àquela expectativa. Quando o triador abre, ele vê exatamente o que esperava ver. Triagem rápida = bounty rápido.

E quando o programa é da **HackerOne** e não da Bugcrowd? O VRT ainda serve de referência mental excelente, mas confira o **CVSS** que a própria H1 calcula e a política de severidade do programa. Ferramentas que ajudam: a [calculadora CVSS da FIRST](https://www.first.org/cvss/calculator/3.1), o [site do CWE](https://cwe.mitre.org/) pra confirmar nomes, e o próprio JSON do VRT pra puxar vetores prontos.

## Exemplo de classificação por classe de falha

Pra fixar, aqui vai a "tradução" de achados comuns. Todos os scores foram conferidos na calculadora oficial, então copie e adapte. Adicionei a coluna **CVSS v4.0 (CVSS-B)** porque cada vez mais programa pede os dois lado a lado:

| Achado (cenário fictício) | CWE | Vetor CVSS v3.1 | Score v3.1 | CVSS v4.0 (CVSS-B) | VRT |
|---|---|---|---|---|---|
| RCE não-autenticada em upload | CWE-94/CWE-78 | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` | **9.8** Crit | **9.3** Crit — `VC:H/VI:H/VA:H/SC:N/SI:N/SA:N` | P1 |
| SQLi extraindo banco | CWE-89 | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N` | **8.2** High | *(ver nota)* | P1 |
| IDOR lendo PII de todos (logado) | CWE-639 | `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` | **6.5** Med | *(ver nota)* | P2 |
| IDOR lendo PII **sem login** | CWE-639 | `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` | **7.5** High | ~**8.7** — `VC:H/VI:N/VA:N/SC:N/SI:N/SA:N` (vetor do Heartbleed) | P2 |
| XSS refletido (rouba sessão) | CWE-79 | `AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` | **6.1** Med | **5.1** Med — `UI:A/VC:N/VI:N/VA:N/SC:L/SI:L/SA:N` | P3/P4 |
| Enumeração de usuário | CWE-200 | `AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` | **3.7** Low | *(ver nota)* | P4/P5 |

> ⚠️ **Por que o número v4.0 muda (e por que algumas linhas ficaram em aberto):** a v4.0 separa o impacto no **sistema vulnerável** (`VC/VI/VA`) do impacto em **sistemas subsequentes** (`SC/SI/SA`), e não existe mais o `Scope`. Por isso o RCE que dava 9.8 vira **9.3**: o estrago fica contido (`SC:N/SI:N/SA:N`). Os três vetores acima são os **exemplos oficiais do FIRST** ([CVSS v4.0 examples](https://www.first.org/cvss/v4.0/examples)): o RCE é o vetor do **Log4Shell** (CVE-2021-44228, **9.3**); o "IDOR sem login" usa o vetor do **Heartbleed** (CVE-2014-0160, **8.7**) por ser idêntico em forma (anônimo, só confidencialidade alta, sem impacto subsequente, daí o "~"); o XSS refletido é o vetor do **Zimbra** (CVE-2022-24682, **5.1**), em que o roubo de sessão cai no sistema subsequente (`SC:L/SI:L`). As linhas marcadas *(ver nota)* eu **não** preenchi: o único exemplo oficial de SQLi do FIRST é **autenticado** (PrestaShop, `PR:L` → 7.1), então ele não casa com este SQLi anônimo, e não há exemplo oficial de IDOR/enumeração em v4.0, então em vez de chutar um score, deixei o conceito. (Detalhe da v4.0: quando a métrica de ameaça `E` fica em "Not Defined", a spec assume o pior caso, então o **CVSS-B já equivale ao número com `E:A`** que aparece nos exemplos do FIRST.) Recalcule sempre na [calculadora oficial v4.0](https://www.first.org/cvss/calculator/4.0).

Repara no par de IDORs: **a mesma falha** vira **6.5** ou **7.5** (v3.1) só por causa do `PR` (precisa login ou não). Essa única letra pode ser a diferença entre Medium e High, e é exatamente o tipo de coisa que você **argumenta** na triagem.

## Como argumentar impacto quando o triador questiona

Triador rebaixou ou marcou como informativo? Isso é **normal** e muitas vezes **reversível**. O caminho que funciona, na ordem:

**1. Confirme que está no escopo.** Antes de qualquer briga, releia o brief. Se a falha está listada como fora de escopo, não há o que argumentar e você não vai ganhar. Se **não** está listada como exclusão, ela é elegível, e isso é seu primeiro ponto.

**2. Reframe o impacto: suba uma camada.** Não descreva o **sintoma**, descreva a **consequência de negócio**. Compare:

> ❌ *"Dá pra fazer muitas requisições sem bloqueio."*
> ✅ *"A ausência de rate limit no endpoint de OTP permite força bruta do código de 6 dígitos (1M de combinações) em minutos, levando a **account takeover**. Anexei o vetor e um PoC enumerando 10k tentativas sem bloqueio."*

Mesma falha, impacto reposicionado de "chato" pra "ATO". Ferramentas pra **provar a escala** que sustenta o reframe: o **Burp Intruder** (enumerar IDs/tentativas e mostrar centenas de `200 OK` distintos) e um print do volume.

**3. Mostre que a indústria paga isso: precedente público.** Esse é o argumento mais forte. Linke **reports públicos da mesma classe que foram pagos** como prova de que o mercado trata aquilo como válido:

> *"Falhas equivalentes são consistentemente aceitas e recompensadas, vide [estes reports públicos da HackerOne](https://github.com/reddelexc/hackerone-reports) e a classificação-base **P-X** no [VRT da Bugcrowd](https://bugcrowd.com/vulnerability-rating-taxonomy). Solicito reavaliação com base nesse precedente."*

Esse combo (escopo confirmado + reframe de impacto + precedente público pago) **já reverteu rebaixamentos** de coisas que o triador tinha tratado como menores (rate limit é o exemplo clássico que vira bônus quando bem argumentado).

**4. Seja técnico e cordial.** Anexe o vetor CVSS e o CWE. Discuta a **letra específica** do vetor que você acha que está errada ("aqui o `PR` deveria ser `N`, porque o endpoint responde sem token; segue request"). Briga objetiva sobre o vetor você ganha; briga emocional você perde.

## Duplicadas e informativos: o que são e como lidar

Dois desfechos que **todo** caçador vive — e que não significam fracasso:

**Duplicada (duplicate):** alguém reportou aquilo antes de você. Você não recebe (em geral), mas:
- É **sinal de que você está no caminho certo**: achou algo real e relevante.
- A lição é **achar primeiro** (velocidade no recon) ou **ir mais fundo** que as ferramentas pegam, no manual, onde duplica menos.
- **Momento de menos duplicadas:** quando um programa **migra de plataforma** ou **atualiza o escopo**, a superfície é nova e menos gente já varreu. Fique de olho nessas notificações.

**Informativo (informative):** o programa reconhece o report, mas não o trata como vulnerabilidade que paga (por design, risco aceito, ou impacto insuficiente). Mas atenção:
- Informativo **às vezes paga bônus.** Há casos de pesquisador que manteve o report aberto, foi paciente, e **meses depois** recebeu um bônus pela contribuição/persistência. **Não feche o report na bronca.**
- Nem todo achado de scanner é vuln. Antes de reportar algo do **Nuclei**, por exemplo, **leia o template e entenda a CVE**, porque muita coisa "casa" mas não tem impacto real (e vira informativo na hora). Avaliar impacto antes de reportar é o que separa P5 de report bom.

> ⚠️ **Expectativa realista:** o caminho normal é **muito** report duplicado e informativo **antes** dos pagos. Isso não é você sendo ruim. É a curva. Quem entende severidade/impacto cedo encurta essa curva, porque para de reportar P5 e passa a empacotar bem os P1–P3.

## Defesa em camadas: severidade vista do lado do dev

Entender severidade não serve só pra ganhar bounty. Serve pra **defender melhor**, porque você prioriza a correção pelo risco real. Do lado do código, "reduzir severidade" é reduzir o impacto de cada métrica CVSS:

```php
// Reduzindo o IMPACTO (C/I/A do CVSS) — minimização de dados:
// em vez de devolver o objeto inteiro, devolve só o necessário, mascarando PII.
return [
    'id'    => $cliente->id,
    'nome'  => $cliente->nome,
    'cpf'   => mask_cpf($cliente->cpf),   // <- transforma C:H em C:L no pior caso de vazamento
];
```

```python
# Reduzindo o ATTACK VECTOR / PRIVILEGES (AV/PR) — exigir autenticação e rede interna
# em endpoint sensível: o que seria PR:N (anônimo) vira PR:L, derrubando o score.
@require_auth                      # <- não-autenticado nem chega aqui
@require_internal_network          # <- AV:N vira AV:A (rede adjacente)
def relatorio_financeiro(request):
    ...
```

```javascript
// Reduzindo AVAILABILITY (A) e barrando força-bruta — rate limit por identidade
// Mata a escala que faz um bug "Low" virar "Critical".
const limiter = rateLimit({ windowMs: 60_000, max: 5,           // 5 tentativas/min
  keyGenerator: (req) => req.user?.id ?? req.ip });             // <- por usuário, não só IP
app.post('/api/otp/verify', limiter, verifyOtpHandler);
```

> ❌ **O que NÃO reduz severidade de verdade:** esconder o endpoint (segurança por obscuridade, `AV` continua `N`), confiar em controle só no frontend, ou "documentar como risco aceito" sem o negócio realmente ter aceito. O score não cai porque você fingiu que o impacto não existe.

## Ferramentas + labs legais

- **[Calculadora CVSS v3.1 oficial (FIRST)](https://www.first.org/cvss/calculator/3.1)** e **[v4.0](https://www.first.org/cvss/calculator/4.0)**: monte o vetor, copie o número. Use sempre; não calcule de cabeça.
- **[VRT da Bugcrowd](https://bugcrowd.com/vulnerability-rating-taxonomy)** + o **[JSON de mapeamento CVSS no GitHub](https://github.com/bugcrowd/vulnerability-rating-taxonomy)**: gabarito de prioridade e vetores prontos.
- **[Site da MITRE CWE](https://cwe.mitre.org/)**: confirme o nome canônico antes de citar.
- **[OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)**: alternativa qualitativa (Likelihood × Impact) útil quando CVSS não encaixa.
- **Praticar classificação:** pegue um lab da [PortSwigger Web Security Academy](https://portswigger.net/web-security/all-labs) e, pra cada lab que resolver, **escreva o vetor CVSS e o CWE** como exercício. Treinar classificação é tão importante quanto treinar exploração.

## Checklist do caçador

- [ ] Identifiquei a **classe** e o **CWE** canônico (nome certo, link da MITRE).
- [ ] Montei o **vetor CVSS v3.1** e tirei o número na **calculadora oficial** (não de cabeça).
- [ ] Respondi as 3 dimensões de impacto: **sensibilidade**, **escala**, **pré-condições**.
- [ ] Conferi a categoria no **VRT** e ajustei a expectativa de prioridade (P1–P5) ao meu contexto.
- [ ] Provei **escala** com PoC (Intruder/contagem de respostas) quando aplicável.
- [ ] Confirmei que a falha **está no escopo** antes de reportar.
- [ ] No report, descrevi a **consequência de negócio**, não só o sintoma técnico.
- [ ] Tenho **precedente público** (reports pagos da mesma classe) guardado pra argumentar se rebaixarem.

## Pegadinhas / o que NÃO funciona

- **Inflar o CVSS na marra.** Marcar `C:H/I:H/A:H` num bug que só lê um dado público não cola: o triador refaz o vetor e perde a confiança no resto do report.
- **Confundir esforço com impacto.** "Levei 3 dias" não é argumento de severidade. Consequência é.
- **Esquecer o `Scope`.** `S:C` muda o cálculo (e o peso do `PR`). XSS quase sempre é `S:C`; muita gente erra pra `S:U` e subestima.
- **Citar CWE errado/genérico demais.** `CWE-200` pra tudo é preguiça; use o específico (`CWE-639` pra IDOR, `CWE-862` pra BFLA).
- **Fechar report informativo na hora.** Pode virar bônus depois. Paciência é estratégia.
- **Achar que VRT é lei.** É **baseline**. Contexto (escopo do brief, impacto incomum) pode mudar a prioridade, pros dois lados.

## O que você precisa lembrar

- **Bounty paga impacto, não esforço.** Sensibilidade × escala × pré-condições.
- **CVSS** = termômetro (número); o **vetor** vale mais que o score porque mostra o raciocínio. Domine v3.1, saiba traduzir pra v4.0.
- **CWE** = diagnóstico (nome da fraqueza); cite o canônico, linkado.
- **VRT** = gabarito de prioridade P1–P5; leia **antes** de reportar pra prever a classificação.
- **Triagem é negociação técnica:** escopo + reframe de impacto + precedente público pago revertem rebaixamento.
- **Duplicada** = caminho certo, vai mais fundo; **informativo** = não desista, pode virar bônus.

> 💡 **Dica de ouro:** antes de apertar "enviar", releia o report fingindo ser o triador cansado da centésima submissão do dia. Se em 15 segundos ele consegue ver **a classe (CWE), a gravidade (vetor CVSS) e a consequência de negócio com escala**, você escreveu na língua do programa — e essa é a língua que paga.

## Nota ética

Classificar severidade é ferramenta de **comunicação responsável** com programas autorizados: bug bounty no escopo, pentests contratados e labs legais. Argumentar impacto **nunca** justifica testar mais fundo do que o escopo permite só pra "inflar" o CVSS (ex.: dumpar um banco inteiro de PII real pra "provar escala", quando uma amostra mínima basta). Prove o necessário, pare no mínimo viável, e reporte pra **proteger**, não pra exibir estrago.

## Referências

- [FIRST — CVSS v3.1 Specification Document](https://www.first.org/cvss/v3.1/specification-document)
- [FIRST — CVSS v4.0 Specification Document](https://www.first.org/cvss/v4.0/specification-document) · [Calculadora v3.1](https://www.first.org/cvss/calculator/3.1) · [Calculadora v4.0](https://www.first.org/cvss/calculator/4.0)
- [Bugcrowd — Vulnerability Rating Taxonomy (VRT)](https://bugcrowd.com/vulnerability-rating-taxonomy) · [VRT no GitHub (com mapeamento CVSS)](https://github.com/bugcrowd/vulnerability-rating-taxonomy)
- [MITRE — CWE List](https://cwe.mitre.org/) · [CWE-639](https://cwe.mitre.org/data/definitions/639.html) · [CWE-862](https://cwe.mitre.org/data/definitions/862.html) · [CWE-200](https://cwe.mitre.org/data/definitions/200.html)
- [OWASP — Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
- [reddelexc/hackerone-reports — reports públicos por tipo (precedente)](https://github.com/reddelexc/hackerone-reports)

---
*Próximo na série: [Como escrever um report que paga](/posts/como-escrever-report-que-paga/) · base: [Broken Access Control: IDOR, BOLA e BFLA](/posts/broken-access-control-idor-bola-bfla/)*

---

*📚 Parte do **[Guia Completo de Bug Bounty](/posts/guia-bug-bounty/)**: o índice da série, do básico ao avançado.*
