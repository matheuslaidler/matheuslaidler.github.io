---
description: Modelo ficou distorcido dentro da engine? faces não renderizadas?
---

# Render bugado: Face visível no lado errado

Nesta página iremos comentar sobre um problema que acaba com a cabeça de muitos iniciantes

## Recalculando normais

### Visibilidade de Face

De forma bem simplória, o Blender faz uma otimização calculando qual será a face normalmente visível para ser renderizado. Ele precisa determinar qual parte vai ser visível para o usuário, evitando forçar um calculo e render de todas as faces de um objeto, incluindo as partes de dentro que não serão vistas. Em outras palavras, devemos configurar qual das faces serão para ficar invisíveis e quais não serão visualizadas.

O problema é que dentro do blender, de forma padrão, você visualizará a camada normalmente, e isso confunde muitos iniciantes que acabam exportando seu modelo para uma engine e se surpreender ao ver um personagem todo tosco, com partes invisíveis e estranhas.&#x20;

Você pode visualizar quais faces serão visíveis e qual será invisível ao abrir o _Viewport Overlays, ao lado esquerdo do X-Ray,_ e marcar _Face Orientation. Você perceberá que a face <mark style="color:blue;">**azul**</mark> é a visível, já a face <mark style="color:red;">**vermelha**</mark> é a face **não** visível. Para mudarmos isso, podemos selecionar as partes que queremos em_ edit mode_, e_ em _mesh teremos a_ opção _normals. Se_ usarmos a opção **flip** já invertemos as partes visíveis de onde selecionamos.&#x20;

Podemos também selecionar toda uma grande parte e fazer o programa recalcular qual das faces selecionadas vão precisar virar, recalculando as partes visíveis e as invisíveis.&#x20;

Resumidamente, podemos usar uma opção para simplesmente inverter qualquer face que selecionamos, assim como podemos pedir um recalculo de qual das faces de uma região selecionada é para fora e qual é para dentro.

Acaba sendo preferível trabalhar com atalho, podendo utilizar o _**ALT+N**_ para abrir o _menu_ de opções de "normals" em "mesh". Assim como, o atalho _**SHIFT+N**_ para a automação da função de recalcular as normais, que vai detectar qual face deve realmente ser virada_._

Resumidamente_,_ podemos fazer o blender automaticamente recalcular quais as faces normais de uma área ou objeto quando todos os seus vértices forem selecionados, além de podermos selecionar manualmente as faces que precisamos inverter a visibilidade.

#### Exemplos visuais:

Nos meus print abaixo, vemos meu personagem de costas com a face orientation ativada.&#x20;

Perceba que apenas a parte de dentro da luva está vermelha.

<figure><img src="../../../../.gitbook/assets/image (2).png" alt="" width="375"><figcaption></figcaption></figure>

Já nesta outra imagem temos as faces visíveis totalmente invertidas

<figure><img src="../../../../.gitbook/assets/image (11).png" alt="" width="348"><figcaption></figcaption></figure>

Janela de mudança das faces normais com e sem atalho.

<figure><img src="../../../../.gitbook/assets/image (5).png" alt="" width="233"><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (16).png" alt="" width="316"><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (3).png" alt="" width="277"><figcaption></figcaption></figure>

#### Exemplos visuais práticos

Alguns exemplos de quando o problema ocorreu comigo.

Contextualizado:

Ao terminar de desenvolver o pé esquerdo, eu o copiei e colei dentro do projeto para inverter o seu lado e já ter o pé direito. Inclusive, por conta de onde estava o meu centro de origem da malha, quando usei o _mirror_ em _X Global_, o pé foi no local perfeito do outro lado :smile:, coisa linda.&#x20;

Porém, quando fiz esta inversão global, as faces visíveis também foram invertidas e isso poderia muito bem passar despercebido.&#x20;

Então, o pé ficou assim:

<figure><img src="../../../../.gitbook/assets/image (13).png" alt="" width="206"><figcaption></figcaption></figure>

Utilizando a seleção com raio X em todos esses vértices, ou usando a tecla L se todos os vértices estivessem conectados, podemos fazer a virada de camada visível.

Usando a opção "_Recalculate Normals_" com as teclas _**SHIFT+N**_&#x20;

<figure><img src="../../../../.gitbook/assets/image (14).png" alt="" width="350"><figcaption></figcaption></figure>

