# 🎨 Front-end

### Uma leve Introdução

O desenvolvimento front-end é a parte da programação que lida com a interface do usuário (UI) de um website ou aplicativo. É o que o usuário vê e interage, como botões, menus, imagens, formulários e textos.

### Para que serve?

O objetivo do desenvolvimento front-end é criar uma interface de usuário atraente, interativa e responsiva. É a parte visual e funcional que faz a interação do usuário com o site ou aplicativo.

### Desenvolvimento com HTML, CSS e JavaScript

HTML, CSS e JavaScript são as principais tecnologias usadas no desenvolvimento front-end.

{% tabs %}
{% tab title="HTML " %}
**HTML** é a **linguagem de marcação** que descreve a estrutura do conteúdo em uma página da web. Ela permite definir seções, títulos, parágrafos, imagens, links e outros elementos do conteúdo.&#x20;

{% content-ref url="html.md" %}
[html.md](html.md)
{% endcontent-ref %}
{% endtab %}

{% tab title="CSS " %}
**CSS** é a **linguagem de estilo** que controla a aparência e o layout do conteúdo. Ela permite definir a cor, tamanho, fonte, margens, espaçamento e outros estilos dos elementos HTML.

{% content-ref url="css.md" %}
[css.md](css.md)
{% endcontent-ref %}
{% endtab %}

{% tab title="JavaScript " %}
**JavaScript** é a **linguagem de programação** que controla o comportamento interativo do conteúdo. Ela permite adicionar interatividade, animação e outras funcionalidades ao site ou aplicativo.

{% content-ref url="javascript.md" %}
[javascript.md](javascript.md)
{% endcontent-ref %}
{% endtab %}

{% tab title="Exemplo" %}
```html
<!DOCTYPE html>
<html>
<head>
	<title>Exemplo HTML, CSS e JavaScript</title>
	<style>
		#botao {
			background-color: black;
			color: white;
			padding: 10px;
			border: none;
			border-radius: 5px;
			cursor: pointer;
		}
	</style>
</head>
<body>
	<h1>Olá, mundo!</h1>
	<p>Clique no botão para mudar a cor de fundo da página:</p>
	<button id="botao" onclick="mudarCor()">Clique aqui</button>
	<p>Cuidado pra não me deixar vermelho... hihi</p>
	<br>
	<a>Uma clicada é um tapa em Matheus Laidler :D</a>
	<script>
		function mudarCor() {
			document.body.style.backgroundColor = "red";
		}
	</script>
</body>
</html>
```

Código do exemplo em prática:

{% embed url="https://matheuslaidler.github.io/intro-frontend/" %}
{% endtab %}
{% endtabs %}

{% hint style="info" %}
_**HTML**_** não é** considerado linguagem de **programação** ;)
{% endhint %}

{% hint style="info" %}
Embora o CSS não seja considerado uma linguagem de programação completa, ele possui recursos que se **assemelham à programação**, como seletores, propriedades e valores.&#x20;

No entanto, a principal função do CSS é controlar a aparência visual dos elementos da página, e não realizar cálculos complexos ou processar **lógica de programação.**
{% endhint %}

### Exemplificação

Acima foi colocado um exemplo de código que utiliza, em um mesmo arquivo .html, todos as linguagens mencionadas como um projeto inicial básico de front end.&#x20;

É um exemplo básico de como HTML, CSS e JavaScript podem trabalhar **juntos** para criar uma página web interativa. Neste caso, não estão sendo usadas separadamente em diferentes formatos de arquivos, _como um "style.css" e um "index.html"_. Quando se trata de projeto super pequeno e simples, como este, colocar tudo junto pode ser bem interessante - até porque pode não compensar criar um .js ou .css apenas para uma pequena função.

Salvando o exemplo em um **arquivo HTML** temos o seguinte resultado já apresentado anteriormente:&#x20;

{% embed url="https://matheuslaidler.github.io/intro-frontend/" %}

Nessa página temos u_**m título**_, _**um parágrafo**_, _**um botão**_ e **funcionalidade** com _um pouco de CSS e JavaScript_.&#x20;

&#x20; **-**   O **CSS é definido dentro do cabeçalho do HTML**, e é usado para **estilizar o botão**.&#x20;

&#x20; \-   O **JavaScript é definido dentro do corpo do HTML**, e é usado para **mudar a cor** de fundo da página **quando o botão é clicado**.

Ao abrir este arquivo em um navegador, você verá "Olá, mundo!" em um cabeçalho e um botão "Clique aqui" abaixo dele.&#x20;

Quando você clica no botão, a cor de fundo da página muda para vermelho, graças à função JavaScript `mudarCor()`.&#x20;

O CSS é usado para definir o estilo do botão, incluindo a cor de fundo, a cor do texto, o espaçamento, a forma e o cursor do mouse.

Este é apenas um exemplo básico de como HTML, CSS e JavaScript podem trabalhar juntos. Há muitas outras coisas que podem ser feitas com essas linguagens, dependendo da criatividade e habilidade do desenvolvedor.

### Diferenças entre HTML, CSS e JavaScript

* **HTML** é usado para criar a **estrutura do conteúdo**
* **CSS** é usado para controlar a **aparência** e o **layout**
* **JavaScript** é usado para adicionar **interatividade** e **funcionalidade**.

**HTML é estático**, ou seja, ele define a estrutura da página e não muda sem que seja alterado manualmente. Já **CSS e JavaScript são dinâmicos**, ou seja, eles podem mudar a aparência e o comportamento do conteúdo de acordo com a interação do usuário.

### Conclusão

O desenvolvimento front-end é uma parte importante do processo de criação de um site ou aplicativo. _HTML, CSS e JavaScript_ são as principais tecnologias usadas para criar interfaces de usuário atraentes, interativas e responsivas. Entender as diferenças entre elas é essencial para criar sites e aplicativos de alta qualidade e com bom desempenho.

