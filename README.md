# Mininet-WEB

<p align="center">
  <img src="images/mininet-web-logo.png" alt="Mininet-WEB" width="368">
</p>

## Sobre

O **Mininet-WEB** é uma aplicação web para criação e gerenciamento visual de topologias de redes utilizando o **Mininet**.

A proposta é fornecer uma interface gráfica e interativa para que o usuário possa construir topologias de rede por meio de componentes visuais, como hosts, switches, roteadores e controladores.

## Interface

<p align="center">
  <img src="images/mininet-web-interface.png" alt="Interface do Mininet-WEB">
</p>

Informações complementares podem ser obtidas em [Informações Adicionais](./docs/info.md).

## Execução local

1. No diretório `mininet-web-backend`, instale as dependências e inicie a API:

  ```sh
  npm install
  npm start
  ```

  O catálogo de componentes fica em `mininet-web-backend/db.json` e é servido em `http://localhost:3000/components`.

2. Sirva o conteúdo de `mininet-web-frontend` por HTTP (por exemplo, com a extensão Live Server do VS Code) e abra a página servida. O frontend usa `fetch` para carregar o catálogo da API.


