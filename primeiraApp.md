# **Primeira App**

_Última atualização do doc. 01.Março.2025_

- [Notas introdutórias](#notas-introdutórias)
- [Ionic CLI](#ionic-cli)
- [Estrutura de um projeto](#estrutura-de-um-projeto)
- [Angular](#angular)
- [Componentes Ionic](#componentes-ionic)
- [Navegação e Routing](#navegação-e-routing)
- [Conceitos básicos de routing](#conceitos-básicos-de-routing)
- [Passagem de parâmetros entre ecrãs](#passagem-de-parâmetros-entre-ecrãs)
- [Apontamentos teóricos](#apontamentos-teóricos)

# Notas introdutórias
_Revisão_

## [Ionic](https://ionicframework.com/)

- _Framework_ que permite o desenvolvimento de apps desktop e **mobile** através da utilização de tecnologias web: HTML, CSS e Javascript;

- Permite a integração com _frameworks_ JS tais como **Angular**, React e Vue;

- Uma app desenvolvida em Ionic pode ser distribuída para plataformas nativas, iOS e **Android**, através de uma ferramenta chamada **Capacitor**;

- É focada no desenvolvimento de _frontend_: UI e UX, controlos, componentes e gestos por forma a que o aspeto de uma app esteja de acordo com a plataforma nativa de destino (iOS ou Android).

## Instalação

1. Instalar o [Node.js](https://nodejs.org/en/)

1. Confirmar instalação do node
    ```bash
    node --version
    npm --version
    ```
    ou 
    ```bash
    node -v
    npm -v
    ```

1. Instalar o Ionic CLI globalmente no sistema (_flag_ -g)
    ```bash
    npm install -g @ionic/cli
    ```

1. Confirmar a instalação do Ionic CLI
    ```bash
    ionic -v
    ```

## Editor de código

- _Deixo apenas a minha recomendação:_ [Visual Studio Code](https://code.visualstudio.com/)

- A instalação da extensão _Ionic Snippets v2.2.2 (de fivethree)_ pode ajudar no desenvolvimento do código (_está desatualizada mas, mesmo assim, pode ajudar_).

# Ionic CLI

O Ionic Command-Line Interface (CLI) permite a criação, alteração e construção/distribuição de uma app.

## Criar uma app

1. Numa pasta destinada para o efeito de desenvolvimento de apps, executar o seguinte comando:

    ```bash
    ionic start ipvc blank --type=angular
    ```

    o comando acima tem o seguinte significado:

    ```
    ionic <comando> <nome-da-app> <template-a-utilizar> <framework>
    ```

    > Na pergunta **_Would you like to build your app with NgModules or Standalone Components?_** deve ser escolhida a opção **_NgModules_**

2. Entrar na pasta da app e (pré-)visualizar a app:
    ```bash
    cd .\ipvc
    ionic serve
    ```

3. É possível visualizar como a app fica em diferentes plataformas, diretamente no browser (_demonstrado na aula..._)

    (_já existiu o **ionic lab**, para o mesmo efeito, descontinuado na versão 7_)

# Estrutura de um projeto

> **A pasta mais importante do projeto é a `src`**

- As pastas iniciadas por um ponto podem ser ignoradas. Têm como responsabilidade a configuração do ambiente de desenvolvimento. 

- `node_modules` é uma pasta gerada de forma automática a partir do momento que são instaladas as dependências (um package depende de outros packages) através do comando `npm install`, o qual já foi automaticamente executado pelo Ionic. Este comando verifica, no ficheiro `package.json`, todos os pacotes que são necessários estar instalados para que o projeto/app funcione.

- `src` é a pasta mais importante e onde a grande maioria do trabalho é realizado (quase a totalidade).

Relativamente aos ficheiros que estão na raiz do projeto, destacam-se os seguintes:

- **angular.json**: ficheiro com valores de configuração do projeto Ionic/Angular (não há necessidade de o alterar).

- **capacitor.config.ts** / **ionic.config.json**: ficheiros com valores de configuração do projeto (pode haver a necessidade de os alterar, principalmente aquando da construção da app final).

- **package.json**: Todas as dependências dos pacotes estão definidas neste ficheiro (há a necessidade de o alterar, no entanto essas alterações são, na sua maioria, feitas de forma automática).

- **ts***: Ficheiros de configuração do Typescript (não há necessidade de os alterar).

# Angular

## Apresentação do funcionamento
- A pasta `\src\app` pode ser considerada como o _ponto de entrada_ da app.

- Esta pasta funciona em conjunto com o ficheiro `index.html` (que não precisa de ser editado). É neste ficheiro que, o Angular, faz o carregamento da app, mais precisamente no elemento ``<app-root>``.

- Com o Angular, uma app é:
    - contruída por **componentes** - components (páginas)
    - organizados em **módulos** - modules 

- Sempre que é gerada uma nova página (ou ecrã), essa página é sempre gerada com os seguintes ficheiros:
    - `<nome>.routing.module.ts`: definição da rota para esta página
    - `<nome>.module.ts`: módulo da página onde são adicionados os _imports_ e onde é declarado o componente
    - `<nome>.page.html`: _template_ da página (_view_)
    - `<nome>.page.scss`: estilo da página
    - `<nome>.page.spec.ts`: ficheiro para casos de teste (_test cases_)
    - `<nome>.page.ts`: controlador (_controller_) do _template_ da página

- Os ficheiros constituem partes diferentes mas estão todas interligadas.

## `page.html` + `page.ts`

- Dentro da classe, definida em `page.ts`, é possível a definição de variáveis e métodos;

- No ficheiro `page.html` é possível aceder a variáveis (propriedades) e métodos definidos em `page.ts`. O acesso a uma variável é conseguido através do _**Angular data binding**_ recorrendo a duplas chavetas: `{{ nome_da_var }}`

Exemplo:  

`home.page.ts` 
```js
export class HomePage {

  public nomeInstituto: string;

  constructor() {
    this.nomeInstituto = 'Instituto Politécnico de Viana do Castelo';
  }

}
```
`home.page.html`  
```html
<ion-header [translucent]="true">
  <ion-toolbar>
    <ion-title>
      IPVC
    </ion-title>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true">
  <ion-header collapse="condense">
    <ion-toolbar>
      <ion-title size="large">IPVC</ion-title>
    </ion-toolbar>
  </ion-header>

  <div id="container">
    {{ nomeInstituto }}
  </div>
</ion-content>
```

# Componentes Ionic

[Ionic Components](https://ionicframework.com/docs/components)

- Os componentes do Ionic são _blocos_ que permitem rapidamente construir a UI (User Interface) da uma app;

- São personalizáveis;

- Adaptam-se, de forma automática, ao iOS e/ou Android.

## Análise aos componentes presentes em `home.page.html` (numa nova app)

- `ion-header`: O _header_ é o componente pai (_parent component_) da área da barra de ferramentas (_toolbar_) area de uma app. É um dos 3 elementos principais (os outros dois são `ion-content` e `ion-footer`)

- `ion-toolbar`: A _toolbar_ pode ser posicionada dentro do _header_ ou do _footer_ (_containers_) é está fixa dentro do seu _container_

- `ion-content`: A área principal de uma página onde é _desenhado_ a estrutura e o conteúdo da mesma. Quando o conteúdo excede a área visível disponível, permite, automaticamente, o scroll da mesma.

> Para evitar a produção desnecessária de código é aconselhável o conhecimento dos componentes disponibilizados pela framework (pelo menos o conhecimento de que existem, para quando houver necessidade da sua utilização).

# Navegação e Routing

### Routing
(_definição simplificada e genérica_)  
O _routing_ é o mecanismo responsável por mapear pedidos, efetuados num _cliente_ (browser, app, ...), com ações especificadas num _controller_. Quando o URL, de um pedido, corresponde a qualquer um dos padrões de rota registado na _tabela_ de rotas, o mecanismo de _routing_ (roteamento, encaminhamento) encaminha a solicitação para o _handler_ (manipulador) apropriado para essa solicitação.

- O Ionic não possui um conceito de roteamento próprio e depende da estrutura JS da qual depende (no caso Angular)

- O primeiro local, na app, em que o roteamento é definido é em `app/app‑routing.module.ts`

- Num projeto Ionic, gerado com o template _blank_, existem duas rotas definidas (num array). Uma é a 'home' e a outra apenas redireciona um caminho vazio '' para a rota 'home'

- Na definição da rota 'home' existe a chave `loadChildren` que define o caminho para o ficheiro do módulo da página correspondente (home). Simplificando pode considerar-se que à rota 'home' corresponde uma página que será mostrada, quando é acedida a rota.

- O Angular Router substituirá o `ion-router-outlet`(em `app/app.component.html`) com as informações relativas a determinado caminho, definidas nas rotas.

- Para todas as páginas que queremos aceder, existentes numa app, é necessária a definição de um caminho (a rota). Através do Ionic CLI, sempre que é gerada uma nova página (ecrã) é adicionada uma nova entrada no array das rotas de forma automática. 

# Conceitos básicos de routing

- A geração de novas páginas é feita da seguinte forma:

  ```bash
  ionic g page lista
  ```

  e outra:

  ```bash
  ionic g page detalhe
  ```

- Após a execução dos dois comandos acima, são adicionadas duas novas rotas à nossa app (em `app/app‑routing.module.ts`). Isso significa que, na prática, ficamos com as seguintes rotas:

  - `/home`: acesso ao conteúdo de `home.page.html`
  - `/lista`: acesso ao conteúdo de  `lista.page.html`
  - `/detalhe`: acesso ao conteúdo de  `detalhe.page.html`

-  Como o projeto (app) foi criado com **NgModules** e não com **Standalone Components** é necessário ir ao controller de cada página (`<nome_pagina>.page.ts`) e alterar o código de definição do componente adicionando-lhe `standalone: false`. Por exemplo, a definição do componente lista (em `lista.page.ts`) passa de:

    ```js
    @Component({
      selector: 'app-lista',
      templateUrl: './lista.page.html',
      styleUrls: ['./lista.page.scss'],
    })
    ```

    para:

    ```js
    @Component({
      selector: 'app-lista',
      templateUrl: './lista.page.html',
      styleUrls: ['./lista.page.scss'],
      standalone: false
    })
    ```

- Em `home.page.html` podemos colocar dois botões que farão o mesmo de formas distintas:

  ```html
  <ion-button routerLink="/lista">
    Lista de qualquer coisa
  </ion-button>

  <ion-button (click)="verDetalhe()">
    Ver detalhe de qualquer coisa
  </ion-button>
  ```

- Em `home.page.ts` teremos o seguinte, dentro da class `HomePage` (para que o seguinte botão funcione):

  ```js
  constructor(private router: Router) {
  }

  public verDetalhe() {
    this.router.navigateByUrl('/detalhe');
  }
  ```

- Na página `lista` e `detalhe` dentro do `header` (dentro da `toolbar`) deverá ser incluído o componente `ion-back-button`. Este componente mostra, de forma automática uma seta "para trás" quando é acedida através da navegação explicada acima.
  ```html
  <ion-header>
    <ion-toolbar>
      <ion-title>Detalhe</ion-title>
      <ion-buttons slot="start">
        <ion-back-button></ion-back-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  ```

# Passagem de parâmetros entre ecrãs

- A forma mais recomendada e segura para a navegação, com passagem de informação, é através de parâmetros nas rotas (em `app-routing.module.ts`):

  Podemos passar a rota `detalhe` de:

  ```js
  {
    path: 'detalhe',
    loadChildren: () => import('./detalhe/detalhe.module').then( m => m.DetalhePageModule)
  }
  ```
  para:

  ```js
  {
    path: 'detalhe/:id',
    loadChildren: () => import('./detalhe/detalhe.module').then( m => m.DetalhePageModule)
  }
  ```

- Alterada a rota, há agora 3 intervenções a fazer na app:

  1. Alterar o método verDetalhe() (em `home.page.ts`) para o envio do parâmetro:

  ```js
  verDetalhe() {
    this.router.navigateByUrl('/detalhe/123');
  }
  ```

  2. Alterar a class DetalhePage (em `detalhe.page.ts`) para receber o parâmetro:

  ```js
  export class DetalhePage implements OnInit {

    public valorRecebido: any;

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
      this.valorRecebido = this.route.snapshot.paramMap.get('id');
    }

  }
  ```

  3. Alterar a página do detalhe (`detalhe.page.html`):

  ```html
  <ion-content>
    (...)
    
    {{ valorRecebido }}
  </ion-content>
  ```

# Apontamentos teóricos

## ngOnInit()
- Método do ciclo de vida do Angular que é executado quando um componente é inicializado;

- Invocado imediatamente após o Angular inicializar o componente e as propriedades;

- Método importante num componente Angular que é frequentemente utilizado para configurar o componente antes que ele seja renderizado.

---
_José Viana | josev@estg.ipvc.pt_
