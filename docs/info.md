## Ideia, Objetivo Principal & Público-Alvo

- **Ideia & Objetivo:** O Mininet-WEB é uma interface Web para criação e gerenciamento visual de topologias de redes no Mininet. Seu objetivo é tornar a configuração de experimentos de rede mais intuitiva, permitindo que o usuário construa a topologia de forma interativa e, posteriormente, utilize o módulo de provisionamento para executar a rede no Mininet.

- **Público-Alvo:** Estudantes, pesquisadores, professores e profissionais da área de Redes de Computadores que utilizam o Mininet para estudos, ensino, desenvolvimento e experimentação de redes.

- **Problema:** A criação de topologias no Mininet é tradicionalmente realizada por meio da CLI ou de scripts Python, exigindo conhecimento prévio dos comandos e da estrutura de programação utilizada para definir hosts, switches, enlaces e outros componentes.

- **Solução & Valor:** O Mininet-WEB oferece uma interface gráfica baseada em manipulação visual, permitindo criar e organizar componentes de rede por meio de operações de arrastar e soltar. A proposta é reduzir a barreira de entrada e facilitar a visualização, configuração e reprodução das topologias utilizadas nos experimentos.

## Benchmarking (Análise Comparativa)

| Ferramenta | Pontos Fortes | Limitações | Diferencial da Solução |
| ---------- | ------------- | ---------- | ---------------------- |
| Mininet-GUI | - | - | Interface Web e manipulação interativa |
| Mininet-WEB | — | Em desenvolvimento | Integração entre editor visual e provisionamento Mininet |

## Equipe

- **Ivalcleb Leôncio Benigno de Souza** - 20232380013 | [GitHub](https://github.com/1valcl3b)

## Funcionalidades Planejadas (Features)

- [x] Interface WEB interativa e de fácil uso
- [x] Criação de topologias por arrastar e soltar
- [x] Adição de hosts, switches, roteadores, controladores e NAT
- [x] Criação de enlaces entre componentes
- [x] Seleção e exclusão de componentes
- [x] Atalhos de teclado para operações comuns
- [ ] Edição das propriedades dos componentes
- [ ] Movimentação e organização dos componentes na topologia 
- [ ] Salvamento e carregamento de topologias
- [ ] Exportação da topologia para scripts Python do Mininet
- [ ] Módulo de provisionamento
- [ ] Execução de topologias diretamente pelo Mininet-WEB
- [ ] Visualização do estado dos componentes e enlaces
- [ ] Execução de testes de conectividade, como Pingall
- [ ] Monitoramento dos experimentos em execução
- [ ] Histórico e gerenciamento de experimentos