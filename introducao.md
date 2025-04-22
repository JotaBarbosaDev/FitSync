# **Introdução**

_Última atualização do doc. 22.Fevereiro.2025_

- [Notas introdutórias](#notas-introdutórias)
- [Recursos](#recursos)
- [Instalação - Preparação do ambiente de desenvolvimento](#instalação---preparação-do-ambiente-de-desenvolvimento)
- [Configuração do ambiente de desenvolvimento](#configuração-do-ambiente-de-desenvolvimento)
- [Resolução de (eventuais) problemas](#resolução-de-eventuais-problemas)
- [Alguns comandos do Ionic CLI](#alguns-comandos-do-ionic-cli)


# Notas introdutórias

## Histórico de versões | **Ionic 8**
- Ionic 8.4.3 » 20.Novembro.2024 [Announcing Ionic 8.4](https://ionic.io/blog/announcing-ionic-8-4)
- Ionic 8.1 » 02.Maio.2024 - [Announcing Ionic 8.1 ](https://ionic.io/blog/announcing-ionic-8-1)
- Ionic 8 » 17.Abril.2024 - [Ionic 8 is here!](https://ionic.io/blog/ionic-8-is-here)
- Ionic 8 Beta » 28.Fevereiro.2024 - [Announcing the Ionic 8 Beta](https://ionic.io/blog/announcing-the-ionic-8-beta)

## Histórico de versões | **Ionic 7**
- Ionic 7.6 » 18.Janeiro.2024 - [Announcing Ionic 7.6](https://ionic.io/blog/announcing-ionic-7-6)
- Ionic 7.5 » 11.Outubro.2023 - [Announcing Ionic v7.5](https://ionic.io/blog/announcing-ionic-7-5)
- Ionic 7.1 » 21.Junho.2023 - [Announcing Ionic v7.1](https://ionic.io/blog/announcing-ionic-v7-1)
- Ionic CLI 7 » 24.Abril.2023 - [Ionic CLI V7 ](https://ionic.io/blog/ionic-cli-v7)
- Ionic 7 » 29.Março.2023 - [Ionic 7 is here!](https://ionic.io/blog/ionic-7-is-here)
- Ionic 7.0 Beta » 01.Fevereiro.2023 - [Announcing the Ionic 7 Beta](https://ionic.io/blog/announcing-the-ionic-7-beta)

## Histórico de versões | **Ionic 6**
- Ionic 6.3 » 05.Outubro.2022 - [Announcing Ionic v6.3](https://ionic.io/blog/announcing-ionic-v6-3)
  - _Component Playground_ » 28.Setembro.2022 [Announcing Component Playgrounds for Ionic Docs](https://ionic.io/blog/announcing-component-playgrounds-for-ionic-docs)
- Ionic 6.2 » 02.Agosto.2022 - [Announcing Ionic v6.2](https://ionicframework.com/blog/announcing-ionic-v6-2/)
- Ionic 6.1 » 14.Abril.2022 - [Announcing Ionic v6.1](https://blog.ionicframework.com/announcing-ionic-v6-1/)
- Ionic 6 » 13.Dezembro.2021 (versão final) - [Announcing Ionic 6](https://ionicframework.com/blog/announcing-ionic-6/) 
- Ionic 6 » 07.Outubro.2021 (versão RC _Release Candidate_) - [Ionic 6.0 Release Candidate](https://ionicframework.com/blog/ionic-6-0-release-candidate/)

## Histórico de versões < Ionic 6
- Ionic 5 » 11.Fevereiro.2020 - [Announcing Ionic 5](https://ionicframework.com/blog/announcing-ionic-5/)
- Ionic 4 » 23.Janeiro.2019

## Histórico de versões | **Capacitor**

- Capacitor 7 » 20.Janeiro.2025 - [Capacitor 7 has hit GA!](https://ionic.io/blog/capacitor-7-has-hit-ga)
- Capacitor 6 » 15.Abril.2024 - [Announcing Capacitor 6.0](https://ionic.io/blog/announcing-capacitor-6-0)
- Capacitor 5 » 03.Maio.2023 - [Announcing Capacitor 5.0](https://ionic.io/blog/announcing-capacitor-5)
- Capacitor 4 » 29.Julho.2022 - [Announcing Capacitor 4.0](https://ionic.io/blog/announcing-capacitor-4-0)
- Capacitor 3 » 19.Maio.2021 - [Announcing Capacitor 3.0](https://ionic.io/blog/announcing-capacitor-3-0)
- Capacitor 2 » 08.Abril.2020 - [Announcing Capacitor 2.0](https://ionic.io/blog/announcing-capacitor-2-0)
- Capacitor 1 » 22.Maio.2019 - [Announcing Capacitor 1.0](https://ionic.io/blog/announcing-capacitor-1-0)


> GA = General Availability » Versão final

## Outras notas

- Ionic framework [Github](https://github.com/ionic-team/ionic-framework)

- Apresentação do Ionic em 40 segundos - [Ionic in 40 Seconds](https://www.youtube.com/watch?v=m5noC7HguBw)

- [Capacitor: Everything You’ve Ever Wanted to Know](https://ionic.io/blog/capacitor-everything-youve-ever-wanted-to-know)

- As aplicações do Ionic são, inicialmente, criadas através de um utilitário da linha de comandos do Ionic (o "CLI").  
  CLI = Command-Line Interface

- É utilizado o Cordova/Capacitor para preparar e fazer a publicação (deploy) como uma aplicação nativa (código nativo da plataforma destino).

## Capacitor (EN)
Capacitor is an open source native runtime for building Web Native apps.
Create cross-platform iOS, Android, and Progressive Web Apps with JavaScript, HTML, and CSS.   
[Capacitor: https://capacitorjs.com/](https://capacitorjs.com/)


Consultar (Moodle):
- Ionic eBook - Hybrid vs Native.pdf

Consultar (URLs):
- Ionic: [https://ionicframework.com/](https://ionicframework.com/)
- Documentação: [https://ionicframework.com/docs](https://ionicframework.com/docs)  
(em [https://ionicframework.com/](https://ionicframework.com/) : Developers » Ionic )
- Ionic Blog: [https://ionicframework.com/blog/](https://ionicframework.com/blog/)  
(em [https://ionicframework.com/](https://ionicframework.com/) : Community » Blog)

# Recursos
- [A Visual Studio Code Extension for Ionic (blog)](https://ionicframework.com/blog/a-visual-studio-code-extension-for-ionic/)
- [Extensão, no VisualStudio Marketplace](https://marketplace.visualstudio.com/items?itemName=ionic.ionic)

# Instalação - Preparação do ambiente de desenvolvimento

Instalação/configuração de alguns _utilitários_ para a preparação do ambiente de desenvolvimento.
                        
1. Instalação node.js  
[https://nodejs.org](https://nodejs.org)

> Versão a instalar:  
> XX.XX.X LTS (atualmente, 22.14.0)  
> Download Node.js (LTS) - botão

2. Durante o processo de instalação não há necessidade de qualquer configuração personalizada  
(Next -> "I accept the terms in the License Agreement" -> Next -> Next -> Next -> Install -> Finish)

3. Verificar se o node (e o npm) está instalado corretamente (no terminal/powershell)
> Apesar de podermos aceder ao terminal (Windows PowerShell), o processo torna-se mais simples se o fizermos diretamente no terminal do Visual Studio Code (View » Terminal).  
> `node -v` (devolve a versão do node atualmente instalada no sistema)  
> ou  
> `node --version`  
> Os comandos acima, no caso de devolverem as respetivas versões, indicam-nos se o node e o npm estão instalados no sistema.  
(NOTA: as versões do node e do npm são diferentes)

4. Instalar o Ionic (Ionic CLI):  
`npm install -g @ionic/cli` ou
`npm i -g @ionic/cli`  
**ESTA INSTALAÇÃO É FEITA APENAS UMA VEZ**  
(O Ionic fica instalado globalmente no sistema)

    NOTA: Se o ionic já estiver instalado, numa versão anterior, deverá ser, em primeiro lugar, executado o comando:  
    `npm uninstall -g ionic`

5. Para ver a listagem de várias versões (incluíndo a do Ionic):   
`ionic info`
> este comando, para listar a versão do Ionic, deve ser executado dentro de uma pasta de um projeto (app) Ionic.

_A PARTIR DESTE PONTO, O PROCESSO SERÁ DEMONSTRADO E EXPLICADO, AO DETALHE, NA AULA_

6. Iniciar uma nova app (apara efeitos de testar a framework):  
O comando abaixo cria uma pasta com uma _app_ baseada num determinado template disponibilizado pela framework.  
`ionic start exemplo1 blank`

7. ESTE COMANDO DEVER SER EFETUADO, NO TERMINAL, DENTRO DA PASTA DO PROJETO - NO CASO _exemplo1_   
`ionic serve`  

> Notas:
> - npm (Node Package Manager): gestor de packages (pacotes) para Javascript (URL: https://www.npmjs.com/)  
   É um cliente que permite a interação remota para consumir e distribuir módulos Javascript  
>  
> - O argumento -g ou --global faz com que o npm instale o package globalmente em vez de localmente.  
> Ver outras flags em: https://github.com/npm/npmconf/blob/master/config-defs.js
>  
> - CLI = Command Line Interface


# Configuração do ambiente de desenvolvimento
                                  
VS Code Extensions recomendadas:
- Angular Language Service
- Angular Snippets (Version 18) - John Papa
- Ionic Snippets (Ionic snippets for VS Code)

# Resolução de (eventuais) problemas
## Permissões no Windows                                                       

Quando houver problemas de permissões de execução de scripts, deve ser seguido o procedimento abaixo:

1. Observar todas as políticas de execução (execution policies) que afetam a sessão atual, listadas por ordem de precedência:
Get-ExecutionPolicy -List

2. Alterar a política de execução necessária:  
`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Desinstalação

No caso de, por algum motivo, ser necessária (esperemos que não!) a desinstalação, deverão ser executados os comandos abaixo pela ordem indicada:
```
npm uninstall -g ionic
npm cache clean -f
npm install npm -g
```

## Permissões no Mac

No caso de ocorrência de erros relacionados com permissões, o seguinte comando permite dar permissões ao utilizador para executar comandos npm e, portanto, evitar eventuais problemas, neste caso em particular, com a instalação do ionic.

```
sudo chown -R $USER /usr/local/lib/node_modules
```

_executar no terminal_

# Alguns comandos do Ionic CLI

Listar todos os _starter templates_ disponíveis:
```
ionic start --list
```

Iniciar (criar) um projeto novo com o starter definido (blank) e a framework selecionada (Angular):
```
ionic start exemplo blank --type=angular
```

---
_José Viana | josev@estg.ipvc.pt_
