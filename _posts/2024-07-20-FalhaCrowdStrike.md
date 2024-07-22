---

title: O update que fez a CrowdStrike parar o mundo
description: 'Entenda e reflita sobre o incidente da empresa, ao atualizar o Falcon, que respingou no mundo todo'
author: matheus
tags: ["CrowdStrike", "Microsoft", "Falcon","Programação"]
categories: ["Cibersegurança", "Sistema Operacional"]
pin: false
comments: true

---

# Entendendo a Falha da CrowdStrike e suas Consequências

Recentemente, os Estados Unidos enfrentaram os famosos "apagões cibernéticos" que foram bem significativos, trazendo à tona uma certa fragilidade dos sistemas críticos de tecnologia. O incidente envolvendo a _CrowdStrike_ e seu produto _Falcon_ ilustra bem as problemáticas e suas consequências, oferecendo uma oportunidade para refletir sobre as práticas e responsabilidades em cibersegurança. Este episódio não só destacou a importância das boas práticas, mas também as consequências severas quando erros críticos ocorrem. Errar é humano, mas até que ponto é tolerável?

## Contexto e o que aconteceu

A CrowdStrike é uma empresa de cibersegurança conhecida por seu software de Endpoint Detection and Response (EDR) chamado Falcon. EDR é uma tecnologia usada para monitorar e responder a ameaças nos endpoints, como computadores e dispositivos móveis. Em uma atualização recente, uma falha crítica ocorreu, causando interrupções significativas.

## Detalhes Técnicos do Incidente

### A Atualização Problemática

- **Update Automático:** A atualização foi distribuída automaticamente para os usuários do Falcon. Atualizações automáticas são comuns e úteis para garantir que todos os sistemas estejam protegidos contra as ameaças mais recentes. No entanto, nesse caso, a atualização continha um bug crítico.
- **Falha no Processo de Teste:** A falha parece estar relacionada a uma insuficiência nos testes. Isso indica que a atualização não passou por testes rigorosos ou que algum aspecto crítico não foi adequadamente avaliado antes da liberação.

### Como Funciona um Sistema Operacional

Para compreender o impacto da falha, é fundamental entender o funcionamento de um sistema operacional (SO). O SO atua como um intermediário entre o hardware e os aplicativos, gerenciando recursos como CPU, memória e dispositivos de entrada/saída. O nível de kernel, onde ocorrem as operações mais críticas, gerencia:

- **Gerenciamento de Processos:** Controla a execução e alocação de tempo da CPU.
- **Gerenciamento de Memória:** Aloca e libera memória, evitando interferências entre processos.
- **Gerenciamento de Dispositivos:** Facilita a comunicação entre aplicativos e hardware.

### Interações com o Kernel

O Falcon, como uma solução de EDR, opera em um nível muito baixo do sistema operacional, interagindo diretamente com o kernel. Alterações ou falhas nessas interações podem ter consequências graves, incluindo a falha completa do sistema.

### Causas do Incidente

A falha foi causada por um erro crítico na atualização do módulo Sensor do Falcon, que envolveu a tentativa de acesso a um ponteiro *nulo*. Em termos técnicos, um ponteiro nulo aponta para um endereço de memória inválido, o que pode causar falhas graves, especialmente quando o erro ocorre no *nível de kernel* do sistema operacional.

#### Endereços de Memória e Ponteiros

Em programação, um ponteiro é como um endereço que você guarda para saber onde algo está localizado. Vamos dar uma passada, com exemplo, sobre ponteiros:

<img title="" src="file:///home/matthew/Downloads/png-transparent-pointer-computer-programming-variable-programming-language-c-programming-language-angle-text-rectangle-removebg-preview.png" alt="png-transparent-pointer-computer-programming-variable-programming-language-c-programming-language-angle-text-rectangle-removebg-preview.png" data-align="center" width="340">

Imagine que um ponteiro é como um atalho que você guarda para saber onde uma variável está localizada na memória do computador. Esse atalho permite que você acesse e modifique o valor da variável diretamente, sem precisar se preocupar com onde exatamente ela está armazenada.

Por exemplo, suponha que temos uma estrutura chamada `Data` que contém dois números inteiros, `x` e `y`. Quando criamos um ponteiro para essa estrutura, como `Data* data_ptr = new Data();`, estamos dizendo que `data_ptr` vai armazenar o endereço de onde a estrutura `Data` está guardada na memória do computador. 

- Quando usamos `data_ptr->x`, estamos acessando o valor do primeiro número inteiro na estrutura `Data`, que está localizado exatamente no endereço que `data_ptr` está apontando.
- Já `data_ptr->y` está em um endereço um pouco mais adiante na memória, deslocado por 4 bytes em relação ao `data_ptr` (considerando que um `int` ocupa 4 bytes).

Um erro comum é tentar usar o ponteiro sem verificar se ele está apontando para um local válido. Isso pode causar problemas graves se o ponteiro estiver nulo, ou seja, se ele não estiver realmente apontando para lugar nenhum.

##### Código de Exemplo

```cpp
#include <iostream>

struct Data {
    int x;
    int y;
};

int main() {
    // Criando um ponteiro para a estrutura Data
    Data* data_ptr = new Data();

    // Inicializando os membros da estrutura
    data_ptr->x = 10;
    data_ptr->y = 20;

    // Acessando e exibindo os valores através do ponteiro - atalho
    std::cout << "Valor de x: " << data_ptr->x << std::endl;
    std::cout << "Valor de y: " << data_ptr->y << std::endl;

    // Verificando se o ponteiro não é nulo antes de acessar
    if (data_ptr != nullptr) {
        std::cout << "Ponteiro é válido." << std::endl;
    } else {
        std::cout << "Ponteiro é nulo." << std::endl;
    }

    // Liberando a memória alocada
    delete data_ptr;
    data_ptr = nullptr;

    return 0;
}
```

##### Saída Esperada

```
Valor de x: 10
Valor de y: 20
Ponteiro é válido.
```

Nesse exemplo, criamos uma estrutura chamada `Data` e um ponteiro `data_ptr` que age como um atalho para uma instância dessa estrutura. Inicializamos os valores dos membros da estrutura e os acessamos através do ponteiro (atalho). Verificamos se o ponteiro é válido antes de usá-lo e, por fim, liberamos a memória alocada.



O erro ocorreu porque o código da atualização não verificou se o ponteiro estava nulo antes de tentar acessar a memória, resultando em uma falha crítica.

### Impacto nos Sistemas

A falha afetou amplamente sistemas que utilizavam o Falcon, resultando em interrupções significativas, como o cancelamento de voos e a indisponibilidade de serviços essenciais como o 911. No Brasil, o impacto foi menor, possivelmente devido à menor dependência do Falcon ou à aplicação incompleta da atualização.

## Análise da Solução e Resolução do Problema

### Soluções Implementadas

Após a falha, a CrowdStrike implementou as seguintes soluções:

1. **Identificação do Erro:** O erro foi localizado no código da atualização, que causava a tentativa de acessar um endereço de memória inválido.
2. **Reversão Remota:** Uma reversão remota foi publicada, exigindo que os computadores afetados fossem reiniciados para aplicar a correção.
3. **Modo de Segurança:** Para aqueles que não conseguiram aplicar a correção automaticamente, foi necessário iniciar o sistema no modo de segurança e remover manualmente o arquivo problemático.

### Detalhes Técnicos da Resolução

- **CSAgent.sys:** A análise dos binários revelou que não houve mudanças significativas entre a versão problemática e a corrigida do driver `CSAgent.sys`, utilizando ferramentas como BinDiff. Portanto, a falha não foi causada por uma mudança no código do driver.
- **Arquivos de Atualização:** Verificou-se que o arquivo de atualização "C-00000291-*.sys" não estava zerado como alegado, mas continha informações válidas. A falha ocorreu quando o CSAgent.sys tentou parsear arquivos corrompidos devido a uma falta de gerenciamento de erros, resultando em um acesso de memória inválido.

### Políticas de Atualização e Melhoria dos Processos de Teste

- **Política de Atualização:** A CrowdStrike recomenda a configuração de uma política de atualização que permita manter uma ou mais versões anteriores, evitando que atualizações instantâneas possam causar problemas semelhantes no futuro. Além disso, a adoção de um cronograma de atualizações pode prevenir ocorrências de falhas em massa.
- **Testes Exaustivos:** Implementar processos de teste mais rigorosos e abrangentes para garantir que todas as atualizações sejam seguras antes da distribuição.
- **Testes Automatizados e Manuais:** Usar uma combinação de testes automatizados para cobertura rápida e testes manuais para casos específicos que possam ser negligenciados por scripts.

## Reflexões e Boas Práticas

### A Culpabilidade da Microsoft e Comparações com o Linux

É importante esclarecer que a Microsoft não é responsável pelo incidente, apesar de algumas críticas direcionadas a ela. A falha foi exclusiva da atualização da CrowdStrike, e não uma vulnerabilidade do sistema operacional Windows. Em um cenário ideal, a Microsoft poderia usar a situação para promover seu próprio produto, como o Defender for Endpoint, mas isso não é uma questão de culpabilidade.

As comparações entre Windows e Linux também são simplistas e enganosas. O Linux enfrentou recentemente um incidente envolvendo um backdoor, que foi rapidamente resolvido devido à natureza open-source do código, permitindo que a comunidade detectasse e corrigisse a falha. Isso não significa que Linux ou Windows sejam infalíveis, nem que seja um melhor que o outro e nem que um é mais propício a dar problemas de grande porte que o outro, mas pode destacar a importância da transparência e colaboração do código aberto. O backdoor foi uma engenharia social que quase deu certo e na prática não afetou praticamente ninguém. 

Dentro de publicações que tentam descredibilizar o Windows e respomsabilidar a Microsoft pelo incidente do Falcon, muito foi usado como carta de 'ataque' a linux esta situação do backdoor, como se fosse uma comparação viável. Essa parte do backdoor do linux, na época, furou a bolha e muitos até hoje não sabem direito o que aconteceu e como tudo se desenrolou. Por mais que seja uma severidade crítica de base score 10 (CVE-2024-3094), até por cenários que poderiam surgir a partir daquilo em determinadas situações, a 'exploitability score' foi de 3.9 e isso diz muito sobre como baixo foi o risco prático disso, e os usuários finais nem precisaram se preocupar tal qual os usuários de windows com o acontecimento que estamos falando neste 'artigo'. 

Enfim, windows e sistemas que usam kernel linux são excelentes ferramentas e tem seus altos e baixos, essa briguinha de rede social numa situação séria dessas pode trazer muita desinformação, até em relação a cibersegurança.

### Críticas e Resposta às Falhas

Criticar práticas e erros após um incidente é fácil quando estamos no conforto de nossas casas, mas é essencial reconhecer que erros são inevitáveis, mesmo para empresas altamente qualificadas. Trabalhar em cibersegurança é como operar em um ambiente de alta precisão; erros podem ter consequências graves, semelhantes aos riscos enfrentados por cirurgiões ou pilotos.

**Boas Práticas a Considerar:**

- **Testes Rigorosos:** Realizar testes exaustivos antes da implementação de atualizações.
- **Monitoramento e Resposta:** Ter sistemas de monitoramento e planos de resposta bem definidos.
- **Comunicação e Transparência:** Desenvolver uma estratégia de comunicação eficaz para manter os usuários informados durante incidentes e atualizações.
- **Resiliência e Recuperação:** Estabelecer planos de contingência robustos para mitigar os impactos de falhas e garantir a rápida recuperação dos sistemas afetados.

Mesmo as maiores empresas podem enfrentar erros, e a falha da CrowdStrike serve como um lembrete da importância de manter práticas rigorosas de segurança e resposta a incidentes.

#### Conclusão reflexiva

O incidente da CrowdStrike não somente destaca a cibersegurança como uma tarefa complexa e desafiadora, mas também é um alerta sobre a necessidade de manter padrões rigorosos nesse respeito. Do mesmo modo que pilotos e cirurgiões não podem permitir certos erros, basicamente porque as consequências podem ser letais, empresários trabalhando em segurança cibernética, também, devem seguir esse modelo. Desde que os seres humanos cometam erros e eles sejam inevitáveis, as consequências de tal “humanidade” em sistemas tão críticos podem ser insuportáveis.

Deste modo, o exemplo ressalva a importância de uma política de segurança sólida, testes abrangentes e abordagem pró-ativa à proteção cibernética. Corporações como a CrowdStrike que desempenha um papel crítico em proteger um sistema crítico precisam assegurar que suas atualizações e modificações de software sejam submetidas a processos de avaliação detalhados a fim de impedir qualquer tipo de falha.

Comparações podem ser feitas com incidentes na aviação, onde falhas em sistemas críticos levaram a grandes avanços na segurança devido a uma análise minuciosa e à implementação de melhorias. A cibersegurança deve seguir o mesmo caminho, aprendendo com os erros para construir sistemas mais robustos e confiáveis.

Por mais que sejamos humanos (e humanos erram), determinados erros de certas profissões não podem ser cometidos, principalmente quando estamos falando de profissões que lidam com a vida, por exemplo. Um piloto não pode escolher pilotar desligando seu "transponder", pois ficaria mais fácil de ocorrer uma colisão com outra aeronave. Mesmo tendo 30 anos de piloto e nunca tendo errado, isso não justifica que não deve ser criticado depois de cometer um erro desse.

Quando consideramos os riscos envolvidos em cibersegurança — desde a interrupção de sistemas hospitalares e voos até a paralisia de sistemas bancários — fica claro que alguns erros não podem ser tolerados. A falha da CrowdStrike, embora não seja fatal, atrasou a vida de muitas pessoas e resultou em perdas econômicas significativas. É um tipo de erro que não deve ser tolerado porque suas repercussões são amplas e profundas, afetando não apenas o mundo digital, mas também a vida real e a economia.

Por fim, a falha da CrowdStrike é um lembrete poderoso de que, em um mundo digital cada vez mais interconectado, não podemos nos permitir negligenciar as etapas rigorosas de segurança. A prevenção é fundamental, e uma falha em um componente de software pode ter repercussões que se estendem muito além do domínio digital, afetando vidas e economias. É um chamado para que todos na indústria de tecnologia redobrem seus esforços para garantir a segurança e a confiança nos sistemas de que todos dependemos.

Para mais detalhes técnicos com uma análise aprofundada, recomendo uma postagem rápida da hakai security [aqui](https://hakaisecurity.io/incidente-do-crowdstrike-uma-rapida-analise-do-pre-apocalipse/research-blog/).
