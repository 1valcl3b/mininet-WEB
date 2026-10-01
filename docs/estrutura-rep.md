```
mininet-web-frontend/
├── index.html
├── script.js
├── style.css
└── modules/
    ├── dom.js
    ├── state.js
    ├── node-config.js
    ├── nodes.js
    ├── links.js
    ├── ui.js
    └── topology-io.js
```
Responsabilidades separadas:

dom.js: referências dos elementos HTML
state.js: estado compartilhado da topologia
node-config.js: configuração dos componentes
nodes.js: criação e numeração dos nós
links.js: criação e atualização dos enlaces
ui.js: mensagens, contadores e coordenadas
topology-io.js: abrir, salvar e exportar topologias
script.js: eventos e coordenação da aplicação