# 🏆 WriteUps

\-- documentações ainda em revisão --

unica parte salva das notes ate agr;\
\
\
Resolvendo desafios ThisIsLegal by Matheus Laidler -Nao publicar com as respostas diretas-

Parte 1: Basic Challenges

1- Codigo fonte da pagina ou inspecionar

## Challenge 1

Find the password in the page.

Resposta: easy321

2- Codigo fonte da pagina ou inspecionar if (form.username.value=="admin" && form.password.value=="iamgod") { Resposta: login= admin senha=iamgod

3- Acessar o arquivo https://thisislegal.com/challenge3/c\_99.txt e o problema https://thisislegal.com/challenge3/index.php?file=home percebe-se que possui, na url, o file=home que pode ser substituido. Colocando a url do arquivo depois do file= e a chave para passar no desafio. Resposta: https://thisislegal.com/challenge3/index.php?file=https://thisislegal.com/challenge3/c\_99.txt

4- Inspecionar elemento -> Menu -> Application -> Cookies -> thisislegal.com -> ALLOWED\_ACCESS = YES -> Atualizar a pagina Resposta: Modificar cookie ativando Allow Access e atualizar a pagina

5- Inpecionar elemento trocar o email noreply@thisislegal.com pelo seu para que a senha seja enviada a vc, dps so clicar em Email Password e ver seu email Resposta: email422

6- Para evitar que certos diretorios, por exemplo, deixem de aparecer em mecanismos de busca usa-se robots.txt https://thisislegal.com/robots.txt vc tera agora a url que dara tua vitoria Resposta: https://thisislegal.com/challenge/robotspage

7- Pagina criada pelo Microsoft FrontPage (descontinuado) -> Dica: Vermeer Technologies Inc \[Microsoft Acquires Vermeer Technologies Inc. January 16, 1996 ]. Pesquisar no google sobre hacking FrontPage Vermeer Technology Inc; ou Vermeer Technology Inc hacking. caimos nesse site http://www.ouah.org/hfag.txt pelo google. Nesse site veremos que existe uma vuln de indexaçao de diretorio. "Hacking FrontPage at a Glance When logging onto a FrontPage Server (FPS), it prompts for an Username and a Password,

* a little security feature preventing unauthorized personnel in receiving access to the server. The FPS stores the Username and Password in a file often called service.pwd. Why do I say often? Earlier versions of FPS, from vers. 2.0 and below I think, didn't have a file called service.pwd, but three other files called administrators.pwd, authors.pwd and users.pwd. Service.pwd will reside in a directory called \_vti\_pvt. (Go ahead and find it on your own computer). When you find it, open service.pwd in a text editor like Notepad or Write. Then you'll probably see something like this\*: Johndoe:lwCa29nm.xv ...." Podemos ent verificar o diretorio \_vti\_pvt (https://thisislegal.com/public/challenge7/\_vti\_pvt/) Veremos que possui o admnistrators.pwd neste diretorio. Ao clicar nele temos o login e senha. Porem, ainda eh necessario quebrar a senha da forma como achamos, podendo ser feito com ferramentas como John The Ripper ou outro. Agora basta fazer o login na aba admin. Resposta: login=admin senha=a1b2c3

8- Baixaremos o app.zip - Dica: Visual Basic Pode usar a dica deles e ir de ollydbg para achar o login e senha, tudo pelo windows. Como uso linux, farei da seguinte maneira. Usaremos um debugger que tbm funcione no linux: https://www.gdbgui.com/installation/ Se tiver dando erro com pipx pelo zsh, tente pelo bash. OU podemos usar o https://www.radare.org/r/ e https://www.hopperapp.com etc... O meio mais rapido eh pelo programa que eles indicaram (ollydbg) Verificaremos vbaStrCmp, agora temos que comparar os valores especificos e o valor inserido como senha e nome de usuario. Veremos os argumentos com os valores, com isso podemos obter a chave de autenticaçao. Podemos testar, no programa, so a senha para sabermos se eh correta. Pode ser verificado no 402148 JE; JNZ ==> achamos a senha Resposta:crackedapp175

9- O que temos que fazer nesse exercicio eh decifrar o zjii hfxj tfs mwkj qlwqejh nv vmj ywddzflh nd xfzvmjijwhjl :) (se curtir esse tipo de coisa, pode aprender mais aqui: https://www2.rivier.edu/faculty/vriabov/cs572aweb/Assignments/CrackingClassicCiphers.htm) Podemos achar a chave criando um script, podemos usar algumas ferramentas da net e ate brincar usando a cabeça mesmo. Temos que ver o tipo da cifra, verificar se eh de deslocamento ou substituiçao Usando o site ciphertools.co.uk/decode.php da pra brincar bastante, colocando pra decodificar como uma cifra de substituiçao mais de uma vez, podemos chegar nisso (FELL DOME CON HA VEG RAG U EDIT T HEW ASS FORD I SM OF THE LEADER) que parece ser, em portugues, uma frase como: "muito bem, você decifrou e agora é o líder" Colocando para decifrar, ainda nesse site, por Transposition (simple) / substituition: ( WELL DONE YOU HAVER FARMED IT THE PASS W OF DIS NOW THE LEA DE F) com a key WCGHJLBMNRAIEXFYUQDVSKZOTP --Ao ir brincando e substituindo as letras em Substituiton (Manual) tbm, fui montando a frase ate chegar em algo que faça sentido / verificar se o que eu achava que seria estava correta Dps disso tentei formar a frase com well done no inicio e com theleader junto no final (por seguir a ordem de espaços da cifra), o resto a gnt ja consegue supor junto e em teste, fui substituindo, fznd desse jeito mais demorado kk Assim chegamos a conclusao que teremos de substituir: Z por W; J por E; I por L; L por R; H por D; F por O; X por N; J por E; E por K; W por A; V por T; T por Y; S por U; M por H; K por V; N por I; D por S; Y por P; Q por C Resultando >

ZJII HFXJ TFS MWKJ QLWQEJH NV VMJ YWDDZFLH ND XFZVMJIJWHJL :) well done you have cracked it the password is nowtheleader :)

Resposta:nowtheleader

10- Temos que baixar o swf e olhar seu codigo fonte, seja por programa ou por serviços web que forneçam ferramenta para isso. veremos no codigo as seguintes linhas: if (password == "flashking") { txt3var = "Correct! enter into password box"; } else { txt3var = "Wrong :( Try Again"; } Resposta:flashking

Parte 2: Realistic Challenges

1- Ao entrarmos na primeira vez na pagina de compras, podemos tentar mudar no inspecionar elemento o valor de tudo para 0, ainda sim teremos o erro e voltarmos a fzr tudo dnv. Pudemos ver q algumas coisas ficaram como ocultas no codigo... Bom, façamos dnv o procedimento, porem na pagina antes do pagamento,o buy.php, e vamos ver os itens com type hidden e o que tiver o valor 100 e nome amount, vc pode mudar pra 0,01 e ir pra compra. Pronto! Resultado: buy.php -> amout value=0.01 -> buy

2- O lance eh entrar no login do site e tentar um SQL Injection Com o login e senha ' or 1=1-- conseguimos acesso. AGora podemos ver que logamos no admin, porem ainda eh uma conta limitada (ue). Podemos fzr bk do db e ver o superadmin com sua hash, agora eh quebrar a md5 (8cc4ba204dd44cc92d7646ad035b7647) e entrar com a senha achada (lmon12) \[Login=SuperAdmin; Senha=lmon12] Neste novo usuario poderemos ir pra pasta raiz - gerenciador de arquivos - e podemos tentar ter acesso ao arquivo. Tentar achar alguma file ou diretorio suspeito, como a pasta logs em imagens. N queremos nossos rastros e deletaremos ela, mas nada acontece msm. Em Misc deletaremos a pasta Targets. Resultado: SQL Injection -> Conta limitada -> Ver db -> conta ilimitada SuperAdmin::lmon12 -> Deletar pastas log e targets.

3- O grande truque agora eh procurar alguma vulnerabilidade fraca. Temos uma aba que foi feita para add links no canto direito e que so funciona apos o adm aceitar. Porem, eh ai que vamos brincar. Testando com qlqr site famoso podemos ver que a mensagem de espera pela revisao foi dada, e n foi feita com a pagina atualizada, ent podemos modificar o codigo para testar em tempo real. Em inspecionar podemos ver uma funçao do tipo escondida chamada LinkView com valor 1, vamos alterar para 0 e testar. Agora o link foi add. Podemos ent fzr um script ser executado. Ao fzr um XSS simples eh resolvido. Resultado: Submit a link -> LinkView to 0 -> XSS examplealert(1);

4-\
dicas: Diretorio; CRACK htpasswd Testando os 'Testimonials' podemos modifical o url dps do '?costumers=' por algo como toto Dara uma mensagem : Error opening file: gbgb Sempre sera toto => gbgb vice-versa. Podemos modificar colocando '../index.php' ou so index.php Dara uma mensagem : Error opening file: ..vaqrk.cuc Colocando o vaqrk.cuc ele da error 403 Se colocarmos como ../vaqrk.cuc ele muda o campo de texto com o index do site. Se colocarmos ../admin.php ele nos mostra ../nqzva.cuc Dando uma olhada na aba order vemos um formulario com order2.php Testaremos order2.php na mudança do nick Vemos beqre2.cuc - Se formos colocar ../beqre2.cuc dara o sucesso do JS do order2.php Podemos tentar analisar de alguma forma como com Burp Suite. https://thisislegal.com/real4/src/read.php?customer=../beqre2.cuc Dps um error 403 como codigo de resposta http. ( Antes Eu pensei em fzr uma troca no link pelo htaccess, que eh um arquivo de config p servidores web como apache no link ../htaccess ele me mandou que eh a mesma coisa que ../ugnpprff ) Conseguindo analisar e ter acesso ao codigo php sera possivel ver na linha $File = './secure/orders.db'; Agora sabemos dos diretorios secure e do arquivo orders.db Podemos testar na url; https://thisislegal.com/real4/secure/orders.db Da apenas uma mensagem "not actually needed" Se formos modificar aquela URL com esse arquivo e pasta secure, vemos que e a mesma coisa que por /frpher/beqref Ent poderemos usar thisislegal.com/real4/src/read.php?customer=../frpher/beqref.qo e teremos o aviso na pagina testimonials. La atras eu havia testado o htaccess e vi que era ugnpprff, tentando entrar nele dentro da pasta secure> https://thisislegal.com/real4/src/read.php?customer=../frpher/.ugnpprff (coloquei . no ugnpprff pois normalmente o arquivo htaccess fica oculto, ou seja, fica .htaccess A mensagem continua sendo dada la. Tento o arquivo .htpasswd tem chance de mostrar pela modificaçao do link. Para isso teria que trocar htpasswd e ver qual seria a sua forma modificada (ugcnffjq) -rot13- Testando como https://thisislegal.com/real4/src/read.php?customer=../frpher/.ugcnffjq ent eh possivel abrir o arquivo e mostrar o resultado com o nome e senha ( admin:adzN92vpWgSP6 ) Agora eh quebrar a senha com John The Ripper Tentar abrir o diretorio secure e logar ( https://thisislegal.com/public/real4/secure/ ) Resultado: /secure -> admin::vimto

5- Podemos tentar fuçar o site e tentar achar diretorios como uma analise normal. Ao testar o search do site, que chega a dar raiva por ter sido feito pra n achar nada, eh possivel ver os diretorios acessados pela url, e um deles eh adm. deixando apenas o /adm nos eh proporcionados uma tela de login. Testando SQL Injection podemos obter um erro muito bom ( Details supplied do not match information in login.pwd file. ) login.pwd file.... Esse e provavelmente o arquivo onde tem as inf da conta que o login checa para validar. Temos que achar um jeito para achar esse arquivo. Indo em produtos, clicando no server 1 e dps da imagem do produto, podemos ver uma coisa na url: https://thisislegal.com/real5/i.php?img=images/server Vemos que a imagem vem pelo parametro dado na propria URL com o diretorio. Podemos tentar mudar o diretorio e fazer os testes. Se testarmos https://thisislegal.com/real5/i.php?img=adm/login.pwd da Error Opening File Pode estar dando erro por estar um arquivo com extensao, dai compensa testar add caracteres nulas de codificaçao de url como %00 Agora com https://thisislegal.com/real5/i.php?img=adm/login.pwd%00 podemos ter acesso ao arquivo. A senha fica em base64, aWFta2luZzMyMQ== Resposta: login com admin / iamking321

Parte 3: Programming Challenges

1-

Parte 4: Bonus Challenges

1-

2-

3-

4-

5-

6-

7-

8-

9-

10-

11-

12-

Parte 5: SQL Challenges

1-

2-

Parte 6: Encryption Challenges

1-

2-

3-

4-

5-

6-

Parte 7: Application Challenges

1-

2-

3-

4-

Parte 8: User Challenges

1-

2-

3-

\---Fim---

Creditos: laidler, ThisIsLegal.com.
