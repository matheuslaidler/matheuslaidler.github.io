---
title: CyberHeroes - Desafio hacker [TryHackMe]
description: 'Resolvendo a máquina CyberHeroes do TryHackMe: autenticação client-side, engenharia reversa de JavaScript e ofuscação por string invertida, e por que "se está no código do cliente, está exposto".'
author: matheus
tags: ["TryHackMe", "WriteUps", "CTF", "web", "JavaScript", "client-side", "autenticação"]
categories: ["Segurança", "CTF e Writeups"]
pin: false
comments: true
image: /assets/img/covers/cyberheroes-writeup.png
---

## CyberHeroes - Writeup em Português

### Resolução do desafio hacker fácil do TryHackMe

> Want to be a part of the elite club of CyberHeroes? Prove your merit by finding a way to log in!
> Quer fazer parte do clube de elite dos CyberHeroes? Prove seu mérito encontrando uma maneira de fazer login!

Essa é uma máquina **fácil**, mas ela ensina um dos conceitos mais importantes (e mais mal-entendidos por quem está começando) em segurança web: **a diferença entre validar algo no cliente e validar no servidor**. Em vez de só "achar a senha", eu quero que você saia daqui entendendo *por que* essa senha estava ao alcance da mão, porque esse mesmo erro aparece em aplicações reais, não só em CTF.

> **Informações da máquina:**
> - IP do alvo (gerado pra mim): `10.10.32.251`
> - Plataforma: TryHackMe
> - Tema: autenticação client-side / reverse de JavaScript
{: .prompt-info }

---

## Teoria: o que é autenticação client-side (e por que ela é quebrada por natureza)

Antes de tocar na máquina, segura essa ideia, porque ela é o coração do desafio.

Quando você faz login num site bem feito, o que acontece é:

1. O navegador (cliente) **envia** seu usuário e senha para o **servidor**.
2. O **servidor** compara com o que está guardado (idealmente um *hash* no banco), decide se está certo e devolve uma sessão.

Repare: a **decisão** acontece no servidor, onde você (atacante) **não** tem acesso ao código nem aos dados. O cliente só manda os dados e recebe um "sim" ou "não".

Agora imagine que um desenvolvedor preguiçoso coloca a **senha correta dentro do JavaScript da página** e faz a comparação no próprio navegador. É o equivalente a deixar o gabarito da prova impresso no verso da folha. Não importa o quão "embaralhado" esteja o gabarito, ele está na sua mão, e você consegue ler.

> **Nunca confie no client-side.** Tudo que roda no navegador (HTML, CSS, JS) é **100% visível e modificável** pelo usuário. Validação de segurança *tem* que acontecer no servidor. Se está no código do cliente, está exposto.
{: .prompt-warning }

Guarda isso. A máquina inteira é uma demonstração desse erro.

---

## 1. Reconhecimento

Como sempre, começo com um **Nmap** pra saber o que está rodando. Confesso que, enquanto o scan completo rodava, eu já fui investigar no navegador e resolvi antes mesmo de ele terminar. Mesmo assim, o hábito de deixar rodando é bom: às vezes ele revela uma porta que você não acharia na mão.

```bash
sudo nmap -sS -sV -p- 10.10.32.251
```

**Explico cada parâmetro:**
- `-sS` *SYN scan* (rápido e discreto; não completa o handshake TCP).
- `-sV` detecta a **versão** dos serviços.
- `-p-` escaneia **todas** as 65535 portas.
- `10.10.32.251` o IP do alvo.

![Resultado do Nmap](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FGEMaUxr5d98f23TVKLyd%2Fimage.png?alt=media&token=1bb229fa-0172-45c5-87c7-deeba569ec17){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

O resultado prático: um **serviço web na porta 80**. Abrindo no navegador:

```text
http://10.10.32.251
```

> **Mentalidade:** cheguei a pensar em deixar um brute-force de diretório (gobuster/ffuf) rodando, mas a regra de ouro em web é **ler o código-fonte e observar o tráfego ANTES de sair forçando**. O alvo te entrega muita coisa de graça se você olhar. Ainda bem que fiz isso primeiro.
{: .prompt-tip }

---

## 2. Investigação: lendo o que o site entrega de graça

Olhando o fonte da página, vejo os `.css` e a estrutura sendo carregados. Decidi abrir os diretórios "pais" desses recursos numa aba nova, em especial o `/assets/`, que costuma guardar os recursos do site.

![Código-fonte da página](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2F0jQgUybhwmrKuKZDrKq0%2Fimage.png?alt=media&token=696a3053-34c7-4392-962c-6f4c59f74a78){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Estrutura de arquivos](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FPPyM08wirBDXgkiZbNBL%2Fimage.png?alt=media&token=2cf929ab-e76d-4f53-9590-c10cd6a766e2){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Pra minha surpresa, o **directory listing** do Apache estava habilitado em `/assets/`, dava pra ver os arquivos e até a versão do servidor.

![Directory listing habilitado](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2F8KKZpyEMvx0R2mRk9KHK%2Fimage.png?alt=media&token=022798df-8776-4049-a0b2-aec8abc9b7be2){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

> **O que é directory listing?** Quando uma pasta não tem um `index.html` e o servidor está configurado pra **listar o conteúdo**, qualquer um vê todos os arquivos ali dentro (uma má configuração clássica, o `Options Indexes` ligado no Apache). Aqui não foi decisivo, mas em alvos reais é como achar a planta do prédio: você descobre arquivos de backup, `.bak`, fontes, configs.
{: .prompt-info }

Em CTF tem muita coisa pra **desviar sua atenção**, e isso cheirava a um desses desvios, então anotei mentalmente ("se eu não achar nada, volto aqui") e segui. Voltando pra home e explorando as funcionalidades, encontrei a aba de login: um arquivo **`login.html`**.

> **Esse `.html` no login me acendeu uma luz.** Login normalmente é processado no **backend** (PHP, Node, etc.). Um login que é só um `.html` estático sugere fortemente que **a lógica está no front**, ou seja, no JavaScript do navegador. Primeira hipótese formada.
{: .prompt-tip }

---

## 3. A tela de login: confirmando a hipótese client-side

Por reflexo, testei o feijão-com-arroz: `admin:admin` e um SQL injection básico `' or 1=1 --`. Cheguei a pensar em subir o Burp pra interceptar e mandar pro Hydra fazer brute-force.

> **Por que o `' or 1=1 --`?** É o teste clássico de **SQL injection** em login: se a query fosse `... WHERE user='$u' AND pass='$p'`, a aspa fecharia a string e o `or 1=1` tornaria a condição sempre verdadeira, logando sem senha. Mas isso **só funciona se existir um banco/servidor processando**, e é exatamente isso que eu vou descobrir que **não** existe aqui.
{: .prompt-info }

Antes de partir pra força bruta, fiz o passo que resolveu tudo: abri a aba **Network** do DevTools e tentei logar observando o tráfego. E nada. Nenhuma requisição saía pro servidor.

![Aba Network sem requisições - 1](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2Fl44Ccp5ng7NoSUcNkEHG%2Fimage.png?alt=media&token=7b606ed5-453f-41bd-ae62-07da550cfce8){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

![Aba Network sem requisições - 2](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FQ5H8N5e7j9nggXEUZU9D%2Fimage.png?alt=media&token=a0fc7f55-1736-4d39-8684-c955ff118d40){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

> **Esse "nada" é o achado.** Se eu digito usuário e senha, clico em "login" e **nenhuma requisição HTTP sai**, então a decisão de "login certo ou errado" está sendo tomada **dentro do navegador, em JavaScript**. Hipótese confirmada: autenticação 100% client-side. O brute-force com Hydra seria inútil aqui, não há servidor pra forçar.
{: .prompt-warning }

---

## 4. Engenharia reversa do JavaScript

Confirmado que a lógica estava no front, fui direto ao **código-fonte** caçar o script de autenticação.

![Lógica de autenticação no JavaScript](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2Fe5eUZ7f5PgwQZk9egQk1%2Fimage.png?alt=media&token=e3a32b8d-f680-4b93-b569-52e7e07636f6){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

Achei. Era a função que valida o login, e com ela o usuário e a senha. A "proteção" do dev foi guardar a senha **invertida de trás pra frente** (uma ofuscação ingênua). A lógica era, em essência, assim:

```javascript
function login() {
  let user = document.getElementById("username").value;
  let pass = document.getElementById("password").value;

  // usuário esperado e senha "ofuscada" (invertida) embutidos no JS
  if (user === "h3ck3rBoi" && pass.split("").reverse().join("") === "54321@terceSrepuS") {
    // libera a flag / redireciona
  } else {
    // "credenciais inválidas"
  }
}
```

Repare no truque: o código pega a **sua** senha digitada, **inverte** com `.split("").reverse().join("")` e compara com a constante `54321@terceSrepuS`. Ou seja, a senha real é essa string **lida ao contrário**.

> **O que é "ofuscação" e por que não é segurança?** Inverter string, Base64, ROT13, hex, são **transformações reversíveis**, não criptografia. Qualquer uma é desfeita em segundos. Ofuscar um segredo que está no cliente é como escrever a senha de trás pra frente num post-it colado no monitor: continua na sua frente.
{: .prompt-warning }

Pra reverter a string, o jeito mais rápido no terminal é o comando `rev`:

```bash
echo "54321@terceSrepuS" | rev
```

**Explico cada parâmetro:**
- `echo "..."` joga a string ofuscada na saída padrão.
- `| rev` o `rev` inverte cada linha caractere a caractere.

Resultado:

```text
SuperSecret@12345
```

![Revertendo a string com rev](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FhW5h5uKjtL9qp2NO9KMa%2Fimage.png?alt=media&token=01873c5e-7689-46c5-8251-c91c4ac6de61){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

> **Dica:** pra brincar com Base64/ROT13/hex sem decorar comando, o [CyberChef](https://gchq.github.io/CyberChef/) é um canivete suíço. Joga a string lá e testa todas as transformações.
{: .prompt-tip }

Credenciais em mãos:

![Credenciais encontradas](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FBZphJxtTE7JfGyb9lCAi%2Fimage.png?alt=media&token=534373e4-8cff-4ca4-b57f-bb6c34543927){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

**Credenciais:** `h3ck3rBoi : SuperSecret@12345`

> Cheguei a achar, por um segundo, que era pegadinha e que viria uma flag falsa, rs. Mas era pra valer.

![Flag obtida após o login](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FbQv9wabgPnNw9BmnSoN6%2Fuploads%2FEfkLtaDXSVmkaATehNQD%2Fimage.png?alt=media&token=59219c29-5047-4d86-aebc-68a32bd7c024){: .dark .w-80 .shadow .rounded-10 w='1212' h='668' }

> 🚩 **Flag:** `flag{edb0be532c540b1a150c3a7e85d2466e}`
{: .prompt-tip }

---

## Resumo do Ataque

### Cadeia de exploração

```text
Recon (Nmap -> porta 80 web)
  └─> Leitura do fonte / observação do tráfego (em vez de brute-force)
       └─> Login é um login.html estático + DevTools Network NÃO mostra requisição
            └─> Conclusão: autenticação 100% client-side (decisão no JavaScript)
                 └─> Reverse do JS: senha embutida e "ofuscada" (string invertida)
                      └─> echo "..." | rev  =>  SuperSecret@12345  ->  login  ->  flag
```

### Defesas que falharam

| Falha | Por que é um problema | Correção |
|---|---|---|
| Autenticação no client-side (JS) | A decisão de login acontece onde o atacante tem controle total | Validar credenciais **no servidor**; o cliente só envia e recebe sim/não |
| Senha embutida no código do cliente | Qualquer um lê o JS e extrai o segredo | Senha **nunca** no front; guardar *hash* no servidor (bcrypt/argon2) |
| "Ofuscação" por string invertida | Transformação reversível não é proteção | Não existe ofuscação que proteja segredo no cliente, não coloque segredo lá |
| Directory listing habilitado em `/assets/` | Expõe arquivos e versão do servidor | `Options -Indexes` no Apache; `index.html` nas pastas |

### Lição principal

Esse foi um CTF simples, mas a lição é grande e **aparece em apps reais**: **olhe o código-fonte e observe a aba Network antes de qualquer coisa.** O fato de **nenhuma requisição** sair ao tentar logar foi o sinal definitivo de que a autenticação era client-side. E lembre: **ofuscação não é criptografia**. Se o segredo está no cliente, ele está exposto. O servidor é o único lugar onde uma decisão de segurança pode ser realmente confiável.

---

> Meu perfil na plataforma: <https://tryhackme.com/p/laidler>

Bons estudos e happy hacking! 🔒
