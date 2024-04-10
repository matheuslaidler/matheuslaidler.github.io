---
description: Conhecendo as nomenclaturas mais comuns do mundo linux
---

# Termos e Nomenclaturas

## Terminologias do Mundo Linux

Ao mergulhar no mundo do Linux, você encontrará uma série de nomenclaturas e termos específicos que podem parecer confusos no início, mas são essenciais para entender o ecossistema Linux. Neste artigo, vamos explorar algumas dessas nomenclaturas e explicar o que elas significam.&#x20;

_Alguns termos podem já terem sido explicados anteriormente._

### Open Source

O termo Open Source, ou código aberto, refere-se a um modelo de desenvolvimento de software em que o código-fonte é disponibilizado e pode ser modificado e distribuído livremente. O Linux é conhecido por ser um sistema operacional de código aberto, o que significa que qualquer pessoa pode acessar, modificar e compartilhar o código do sistema operacional.

Essas são apenas algumas das nomenclaturas comuns encontradas no mundo Linux. À medida que você explora mais o sistema operacional, encontrará muitos outros termos e conceitos interessantes. Com o tempo, você se familiarizará cada vez mais com o ecossistema Linux e se tornará um usuário experiente e confortável no mundo do pinguim.

### Kernel

O kernel é o coração do sistema operacional Linux. Ele é responsável por fornecer uma camada de software que permite a comunicação entre o hardware e o software. O kernel controla os recursos do sistema, gerencia processos, dispositivos de hardware e fornece uma base estável para o funcionamento do sistema operacional.

### Distribuição (Distro)

Uma distribuição Linux, ou simplesmente distro, é uma versão completa do sistema operacional Linux que inclui o kernel Linux, ferramentas de sistema, utilitários e aplicativos. Existem várias distribuições Linux populares, como Ubuntu, Fedora, Debian, CentOS, entre outras. Cada distribuição possui características específicas, como o gerenciador de pacotes utilizado, a interface gráfica padrão e as configurações predefinidas.

{% content-ref url="distros.md" %}
[distros.md](distros.md)
{% endcontent-ref %}

### Interface Gráfica do Usuário (GUI)

A Interface Gráfica do Usuário (GUI) é a camada visual e interativa do sistema operacional Linux. Ela permite que os usuários interajam com o computador de forma intuitiva por meio de ícones, janelas, menus e botões. Existem diferentes ambientes de desktop populares no Linux, como GNOME, KDE, XFCE, Unity, entre outros, que oferecem diferentes experiências visuais e recursos.

### Terminal

O Terminal, também conhecido como console ou shell, é uma interface de linha de comando no Linux. Ele permite que os usuários executem comandos diretamente no sistema operacional. O Terminal oferece uma maneira poderosa e flexível de realizar tarefas, como gerenciamento de arquivos, instalação de pacotes, configurações do sistema, automação de tarefas e muito mais.

{% content-ref url="terminal-do-zero.md" %}
[terminal-do-zero.md](terminal-do-zero.md)
{% endcontent-ref %}

### Terminal Emulado

Um terminal emulado é uma aplicação que permite executar comandos de terminal em uma janela gráfica. Ele oferece uma interface amigável para o uso do Terminal, fornecendo recursos adicionais, como destaque de sintaxe, histórico de comandos, autocompletar, divisão de tela e muito mais. Exemplos de emuladores de terminal incluem o GNOME Terminal, Konsole, Terminator e Tilix.

### GTK (GIMP Toolkit)

GTK, sigla para GIMP Toolkit, é um conjunto de bibliotecas de software usadas para criar interfaces gráficas de usuário (GUIs) no Linux. Desenvolvido originalmente para o software de edição de imagens GIMP, o GTK se tornou uma das bibliotecas mais populares para desenvolver aplicativos no ambiente desktop Linux. É amplamente utilizado no ambiente GNOME e em muitos outros aplicativos GTK-based.

### Qt

Qt é outro conjunto de ferramentas de desenvolvimento de software usado para criar GUIs no Linux. Desenvolvido pela empresa norueguesa Trolltech (agora parte da Digia), o Qt é conhecido por sua facilidade de uso e versatilidade. Ele permite que os desenvolvedores criem aplicativos que podem ser executados em várias plataformas, incluindo Linux, Windows e macOS. O ambiente de desktop KDE é baseado no Qt, e muitos aplicativos populares no Linux são desenvolvidos usando essa estrutura.

### XFCE

XFCE é um ambiente de desktop leve e rápido para sistemas Linux. Foi criado com o objetivo de fornecer uma alternativa mais leve e eficiente em termos de recursos aos ambientes de desktop tradicionais, como GNOME e KDE. O XFCE oferece uma experiência de usuário amigável, mas com requisitos de hardware mais baixos, tornando-o uma escolha popular para computadores mais antigos ou com recursos limitados.

### Rolling Release

Uma distribuição Linux com modelo de lançamento contínuo, ou rolling release, é aquela em que as atualizações são fornecidas regularmente e em tempo real, sem a necessidade de atualizações principais ou lançamentos de versões específicas. Em um modelo de lançamento contínuo, os usuários obtêm as últimas atualizações de software assim que são lançadas, mantendo o sistema sempre atualizado com as versões mais recentes dos aplicativos e do sistema operacional.

### LTS (Long-Term Support)

LTS, ou Long-Term Support, refere-se a uma versão específica de uma distribuição Linux que recebe suporte estendido a longo prazo. Essas versões são projetadas para oferecer estabilidade e segurança a longo prazo, sendo atualizadas com correções de bugs e patches de segurança por um período mais longo em comparação com as versões regulares. Essas versões LTS são ideais para empresas e usuários que valorizam a estabilidade e a confiabilidade em detrimento das atualizações de recursos mais recentes.

Essas são apenas algumas das nomenclaturas comuns encontradas no mundo Linux. Conforme você explora mais o sistema operacional, encontrará muitos outros termos e conceitos interessantes. Com o tempo, você se familiarizará cada vez mais com o ecossistema Linux e se tornará um usuário experiente e confortável no mundo do pinguim.

### Pacotes e Gerenciadores de Pacotes

Os pacotes são arquivos que contêm programas, bibliotecas e outros componentes de software no Linux. Os gerenciadores de pacotes são ferramentas que facilitam a instalação, atualização e remoção de pacotes no sistema operacional. Alguns exemplos de gerenciadores de pacotes populares são **apt** (usado no Ubuntu e derivados), **yum**/**dnf** (usado no Fedora e CentOS), **pacman** (usado no Arch Linux) e **zypper** (usado no openSUSE).

### DPKG (Debian Package)

O **DPKG** é uma ferramenta de gerenciamento de pacotes no Linux amplamente utilizada em distribuições baseadas em Debian, como Ubuntu, Debian, Linux Mint, entre outras. Sua função é instalar, remover e gerenciar pacotes de software no sistema operacional.&#x20;

Trabalha diretamente com pacotes no formato .deb, que são os pacotes de instalação usados nas distribuições Debian. Isso permite que os usuários instalem novos pacotes, atualizem pacotes existentes e removam pacotes do sistema. Com ele é possível listar os pacotes instalados no sistema, verificar informações detalhadas sobre um pacote específico, como versão, tamanho e dependências, e executar operações de manutenção, como reparar pacotes quebrados ou configurar pacotes que não foram configurados corretamente.&#x20;

É uma ferramenta de baixo nível que trabalha diretamente com pacotes individuais. No entanto, ele não resolve automaticamente as dependências dos pacotes, ou seja, não instala automaticamente os pacotes necessários para que um determinado pacote funcione corretamente. Para resolver as dependências, o DPKG é frequentemente usado em conjunto com ferramentas de gerenciamento de pacotes de alto nível, como o apt ou apt-get, que resolvem automaticamente as dependências e simplificam o processo de instalação de pacotes no sistema.

### APT (Advanced Package Tool)

O **Advanced Package Tool** (APT) é uma poderosa ferramenta de gerenciamento de pacotes amplamente utilizada em sistemas Linux baseados em Debian, como Ubuntu, Debian e Linux Mint. Ele simplifica o processo de instalação, atualização e remoção de pacotes de software, além de gerenciar as dependências entre eles. Ele oferece uma interface de linha de comando, onde os usuários podem executar comandos como apt (ou apt-get) e apt-cache para poder determinadas funções como buscar, instalar, atualizar e remover pacotes.&#x20;

O APT também possui recursos avançados, como resolução automática de dependências, permitindo que os usuários instalem pacotes com todas as dependências necessárias. Com sua vasta coleção de pacotes disponíveis nos repositórios oficiais e em repositórios de terceiros, o APT torna o gerenciamento de software mais eficiente e conveniente em sistemas Debian-based.

### Snap

O **Snap** é um formato de empacotamento de software e uma tecnologia de implantação de aplicativos no Linux. Ele permite empacotar um aplicativo e todas as suas dependências em um único pacote, tornando a instalação e atualização de software mais fácil e independente das bibliotecas do sistema. Os snaps são projetados para serem portáteis e executáveis em diferentes distribuições Linux.

### Flatpak

O **Flatpak** é outro formato de empacotamento de software e um ambiente de execução para aplicativos no Linux. Ele oferece um sistema sandbox para aplicativos, isolando-os do sistema operacional subjacente. Os aplicativos Flatpak são empacotados juntamente com suas dependências, garantindo que funcionem de maneira consistente em diferentes distribuições Linux.

### AppImage

O **AppImage** é um formato de empacotamento de aplicativos no Linux que visa fornecer aplicativos independentes e portáteis. Ao contrário dos formatos tradicionais de empacotamento, o AppImage permite que um aplicativo seja executado em diferentes distribuições Linux sem a necessidade de instalação. Basta baixar o arquivo AppImage, torná-lo executável e executá-lo.

### PPAs (Personal Packages)

No contexto do mundo Linux, PPA é a sigla para Personal Package Archive, que se refere a um repositório de software personalizado usado no sistema operacional Ubuntu e em suas variantes, como o Linux Mint.

O PPA é um recurso que permite que desenvolvedores e usuários criem e distribuam pacotes de software para essas distribuições Linux de forma independente. É uma maneira conveniente de fornecer software que não está disponível nos repositórios oficiais do Ubuntu ou que é uma versão mais recente do que a oferecida pelos repositórios padrão.

Os PPAs geralmente são usados para distribuir software adicional, atualizações de versões e correções de bugs para o Ubuntu e suas variantes. Eles podem ser adicionados ao sistema por meio do comando "add-apt-repository" ou por meio de ferramentas gráficas, como o "Software & Updates" ou "Gerenciador de Pacotes Synaptic". Uma vez adicionado o PPA, os pacotes de software fornecidos por ele podem ser instalados usando o gerenciador de pacotes padrão do Ubuntu, o "apt" ou ferramentas gráficas relacionadas.

Os PPAs oferecem aos usuários do Ubuntu e suas variantes uma maneira conveniente de acessar software atualizado e adicional, ampliando a disponibilidade de aplicativos e recursos para essas distribuições Linux. No entanto, é importante observar que os PPAs são repositórios independentes e não são oficialmente mantidos ou suportados pela Canonical, empresa responsável pelo Ubuntu. Portanto, é necessário ter cuidado ao adicionar PPAs de fontes não confiáveis e é recomendado verificar a reputação e a segurança do PPA antes de adicioná-lo ao sistema.

### Wine - Wine Is Not an Emulatore

O **Wine** é uma camada de compatibilidade que permite executar aplicativos do Windows em sistemas operacionais Linux. Ele traduz as chamadas do sistema do Windows para chamadas do sistema compatíveis com o Linux, permitindo que os aplicativos do Windows sejam executados sem a necessidade de uma instalação completa do Windows.

### Wayland

O **Wayland** é um protocolo de exibição para sistemas operacionais baseados em Linux, projetado para substituir o antigo protocolo X Window System (X11). Ele oferece uma arquitetura mais moderna e eficiente, fornecendo recursos avançados de exibição e manipulação de janelas. O Wayland visa melhorar o desempenho, a segurança e a experiência geral do usuário em sistemas Linux.

### KDE & KDE Plasma

O **KDE** é um ambiente de desktop e uma comunidade de desenvolvedores de software que cria uma variedade de aplicativos e ferramentas para sistemas operacionais baseados em Linux. O KDE oferece uma interface gráfica intuitiva e altamente personalizável, além de fornecer uma ampla gama de aplicativos, como um gerenciador de arquivos, cliente de e-mail, reprodutor de mídia e muito mais.

O KDE Plasma é o ambiente de desktop padrão fornecido pelo projeto KDE. Ele oferece uma experiência de desktop moderna, com uma interface de usuário elegante e recursos avançados de personalização. O KDE Plasma é conhecido por sua flexibilidade e extensibilidade, permitindo que os usuários adaptem o ambiente de trabalho às suas necessidades e preferências.

### GNOME

GNOME é um ambiente de desktop popular para sistemas Linux. Ele é conhecido por sua interface elegante e intuitiva, que oferece uma experiência de usuário moderna e amigável. O GNOME é construído usando a biblioteca GTK e é o ambiente de desktop padrão em muitas distribuições Linux, como Ubuntu. Ele oferece uma ampla gama de recursos e ferramentas, além de suportar extensões que permitem personalizar a experiência do usuário.

### Finalizando

Essas são algumas das ferramentas e terminologias comuns no mundo Linux. Cada uma delas desempenha um papel importante no ecossistema do Linux, fornecendo soluções para empacotamento de aplicativos, compatibilidade com o Windows, ambientes de desktop, protocolos de exibição e muito mais.
