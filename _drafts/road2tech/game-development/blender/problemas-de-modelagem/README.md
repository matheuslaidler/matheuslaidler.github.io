---
description: >-
  Corrigindo alguns problemas que geralmente ocorrem quando modelamos nossos
  personagens, como texturas se modificando ao juntar objetos e partes não
  visíveis da malha quando exportadas a outro programa
---

# 🌚 Problemas de Modelagem

## Resolução de problemas gerais e comuns

Provavelmente alguns de vocês passaram por alguns problemas que mostrarei aqui sem saber de suas resoluções ou confundir com bugs, principalmente também se aprenderam o sozinho na tentativa e erro.



Neste tópico de postagens teremos alguns rápidos posts com correções de alguns problemas que podemos enfrentar ao modelar nossos personagens para desenvolvimentos de jogos.

Bugs com UVs e calculo de normais são bem recorrentes e serão os primeiros tópicos a serem expostos aqui.



### Problema comum #1 - Faces invisíveis

Muitas vezes, quando ocorre esse problema, até confundimos com alguns erros de texturas e quebramos cabeça para tentar entender o porque do personagem estar todo estranho. Porém, as vezes é apenas a parte visível da malha que está invertida, ou seja, a parte de dentro - que não tem que ser renderizada - está para fora.

Um problema simples que um recalculo de normais já pode resolver. Para entender melhor como fazer isso, siga para o post abaixo:

{% content-ref url="render-bugado-face-visivel-no-lado-errado.md" %}
[render-bugado-face-visivel-no-lado-errado.md](render-bugado-face-visivel-no-lado-errado.md)
{% endcontent-ref %}

### Problema comum #2 - Textura com UVs diferentes

Muitas das vezes que vamos juntar duas malhas do mesmo personagem, as texturas entre elas mudam uma em função da outra, ou seja, a mudança ainda vai dependendo da ordem de quem juntei. Isso ocorre quando não percebemos a diferença de nomenclatura das UV Maps.&#x20;

Um problema comum e simples que pode ser resolvido ao utilizar um nome em comum para todos. Para entender melhor como fazer isso, siga para o post abaixo:

{% content-ref url="textura-bugada-mudanca-ao-juntar-malhas.md" %}
[textura-bugada-mudanca-ao-juntar-malhas.md](textura-bugada-mudanca-ao-juntar-malhas.md)
{% endcontent-ref %}

...





