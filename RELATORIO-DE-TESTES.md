# Relatório de testes

Data da validação: 29 de julho de 2026.

## Correção de associação das cores

Foi confirmada e reforçada no código a associação oficial:

- **Verde:** conceituação e classificação das drogas;
- **Azul:** efeitos das drogas.

O aplicativo não utiliza a inversão presente em um trecho do manual.

## Escopo validado nesta atualização

Foi validada a versão atualizada com:

- nova logomarca integrada do projeto;
- tabuleiro oficial enviado pelo usuário;
- banco importado do PDF oficial;
- 10 cartas oficiais de Autonomia e Armadilha;
- novos ícones PWA;
- ajuste das coordenadas dos peões para o tabuleiro vertical.
- correção da referência visual: a tela de jogo agora carrega `assets/images/board.jpg` e não mais o tabuleiro SVG provisório.

## Melhorias validadas nesta versão

- pop-up de orientação da primeira ação;
- destaque pulsante da Roleta enquanto a primeira ação não foi realizada;
- hub compacto de temas sobre o tabuleiro;
- pergunta aleatória exibida imediatamente após a escolha do tema;
- remoção da listagem completa de perguntas e gabaritos;
- conjunto de 42 coordenadas: início, casas 1 a 40 e chegada;
- peões centralizados sobre as casas da arte oficial.

## Testes automatizados executados

Resultado: **24 testes aprovados e 0 falhas**.

Foram verificados:

- existência de **50 perguntas** e **10 cartas**;
- distribuição oficial das perguntas por categoria;
- IDs únicos e respostas válidas;
- criação de partidas com 2, 3 e 4 jogadores;
- resposta correta e retirada da pergunta;
- resposta errada e permanência da pergunta;
- esgotamento de categoria;
- dado digital e entrada do dado físico;
- movimentação normal;
- casas especiais 5, 10, 15, 20, 25, 30, 35 e 40;
- vitória ao ultrapassar a casa 40;
- ausência de vitória ao parar exatamente na casa 40;
- retirada e restauração das dez cartas;
- penalidade de perda de turno;
- roleta sem repetição e restauração do ciclo;
- desfazer a última rodada;
- restauração do estado em nova partida;
- preservação das configurações gerais;
- persistência da partida após novo carregamento.

## Verificação estática

Resultado: **aprovada**.

Foram verificados:

- validade dos arquivos JSON;
- presença dos arquivos essenciais;
- existência de todos os recursos listados no Service Worker;
- ausência de dependências externas durante a execução;
- dimensões dos ícones PWA;
- consistência dos bancos de perguntas e cartas.

## Limitação do ambiente de validação

O ambiente não permitiu uma inspeção visual automatizada completa em navegador real. Por isso, ainda é obrigatório fazer teste manual no dispositivo final antes da publicação oficial.

## Checklist manual recomendado

- testar o app em tablet Android;
- conferir alinhamento dos peões em todas as casas;
- validar leitura por voz no aparelho final;
- testar instalação pelo Chrome;
- testar modo offline após o primeiro carregamento;
- testar roleta, cartas, dado digital e dado físico;
- testar áudio ativado e desativado;
- testar animações ativadas, desativadas e redução de movimento;
- testar navegação por toque e teclado;
- confirmar, com a equipe do projeto, se o banco final desejado é de 50 ou 51 perguntas.
