# Trilhas da Prevenção: Escolhas que Contam

PWA educativo feito em HTML, CSS e JavaScript puro. Funciona em celulares, tablets e computadores, salva a partida no aparelho e opera offline após o primeiro carregamento completo.

## Associação oficial das cores

O aplicativo segue esta associação, sem inversão:

- **🟩 Verde:** conceituação e classificação das drogas;
- **🟦 Azul:** efeitos das drogas;
- **🟨 Amarelo:** tratamentos e consequências;
- **🟪 Roxo:** comportamentos relacionados ao uso, abuso e dependência.

O texto do manual que apresenta azul e verde invertidos não é utilizado como referência para a associação das categorias. A arte do tabuleiro, o prompt técnico e a organização do banco têm prioridade.

## O que foi atualizado nesta versão

- orientação visual da primeira ação, com pop-up explicativo e destaque pulsante no botão **Roleta**;
- perguntas da partida abertas em um pop-up compacto sobre o tabuleiro, mantendo o mapa visível ao fundo;
- seleção de cor/tema passou a sortear imediatamente apenas uma pergunta, sem mostrar previamente o banco e os gabaritos;
- remoção da antiga tela que listava todas as perguntas e respostas de uma categoria;
- coordenadas das 40 casas refeitas com base na arte oficial do tabuleiro;
- peões centralizados diretamente sobre cada casa durante a movimentação;
- correção da tela do tabuleiro para carregar diretamente a arte oficial `assets/images/board.jpg`, eliminando a trilha SVG provisória;

Esta versão já foi atualizada com base nos materiais enviados:

- logomarca do projeto integrado **Droga Zero + Trilhas da Prevenção**;
- arte oficial do tabuleiro utilizada no jogo;
- faixa institucional da **SETRABES** e **Governo de Roraima** extraída dos assets enviados;
- banco oficial importado do PDF fornecido;
- 10 cartas oficiais de **Autonomia** e **Armadilha**;
- coordenadas dos peões ajustadas para o tabuleiro vertical enviado.

### Observação importante sobre o banco de perguntas

O PDF enviado resultou em **50 perguntas estruturadas** no aplicativo, distribuídas assim:

- **Verde (Classificação e conceito): 12**
- **Azul (Efeitos): 16**
- **Roxo (Comportamentos): 11**
- **Amarelo (Tratamentos e consequências): 11**

Se existir uma versão revisada com 51 perguntas, basta atualizar o PDF/fonte e regenerar o banco.

## Atualização 1.3.1 — pop-ups responsivos

O módulo independente de perguntas foi ajustado para adaptar seus pop-ups automaticamente a:

- navegadores de desktop;
- celulares Android e iPhone na vertical;
- celulares e tablets na horizontal;
- áreas seguras de aparelhos com notch/barra inferior.

No celular vertical, o conteúdo usa formato de painel inferior responsivo. Em telas horizontais de pouca altura, o conteúdo é compactado e usa rolagem interna, preservando os botões de ação.

## Teste rápido no Windows

1. Extraia o arquivo ZIP.
2. Abra a pasta extraída.
3. Dê dois cliques em `INICIAR_TESTE_WINDOWS.bat`.
4. O navegador deverá abrir em `http://localhost:8000`.
5. Não feche a janela preta enquanto estiver testando.

Se o `.bat` não funcionar, instale o Python ou use a extensão **Live Server** do VS Code.

## Teste pelo terminal

Na pasta do projeto, execute:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

O Service Worker e a instalação PWA não funcionam corretamente quando o arquivo `index.html` é aberto direto por `file://`.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos e pastas deste projeto para a raiz do repositório.
3. Em **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/root`.
6. Salve.
7. Aguarde a publicação.
8. Abra o endereço uma vez com internet para que os recursos sejam armazenados offline.

O arquivo `.nojekyll` já está incluído.

## Instalação pelo Chrome no Android

1. Abra o endereço publicado no Google Chrome.
2. Aguarde o carregamento completo.
3. Abra **Configurações** dentro do aplicativo e toque em **Instalar**, se o botão estiver disponível.
4. Se o botão interno não aparecer, abra o menu de três pontos do Chrome.
5. Toque em **Instalar aplicativo** ou **Adicionar à tela inicial**.
6. Abra o app pelo ícone criado.

## Como testar o modo offline

1. Abra o aplicativo com internet.
2. Navegue pelas telas principais pelo menos uma vez.
3. Feche e abra novamente.
4. Ative o modo avião ou desligue Wi‑Fi e dados móveis.
5. Abra o aplicativo instalado.
6. Teste tabuleiro, perguntas, cartas, dado, roleta, sons e retomada da partida.

No computador, o teste também pode ser feito pelo DevTools do Chrome em **Application > Service Workers > Offline**.

## Onde substituir imagens

Se novas artes oficiais forem recebidas, substitua mantendo os mesmos nomes:

- `assets/images/logo-projeto.png`
- `assets/images/board.jpg`
- `assets/images/partners-strip.png`

Os peões são posicionados por coordenadas definidas em `js/game.js`, na função `boardCoordinates`. Esta versão usa a proporção do tabuleiro enviado: **1535 × 2048**. Se o tabuleiro mudar, as coordenadas devem ser ajustadas.

Após substituir qualquer arquivo armazenado offline, altere o valor de `CACHE_NAME` em `service-worker.js` para forçar a atualização do cache.

## Onde substituir os sons

Substitua os arquivos `.wav` dentro de `assets/audio/`, mantendo os nomes:

- `correct.wav`
- `wrong.wav`
- `dice.wav`
- `roulette.wav`
- `move.wav`
- `card.wav`
- `victory.wav`

## Como atualizar perguntas e cartas

Edite:

- `data/questions.json`
- `data/cards.json`

Depois gere novamente `js/questions.js` com a mesma estrutura do banco atual.

## Testes automatizados

Motor do jogo:

```bash
node tests/engine-tests.js
```

Integridade estática:

```bash
python tests/static-tests.py
```

O relatório desta versão está em `RELATORIO-DE-TESTES.md`. A validação atual contém 24 testes funcionais automatizados.

## Privacidade

O aplicativo não possui login, servidor, painel administrativo ou banco online. A partida e as configurações ficam apenas no armazenamento local do aparelho.

## Módulo separado: perguntas e Autonomia/Armadilha

A versão 1.3.0 inclui um módulo totalmente independente do tabuleiro em:

- `PERGUNTAS_OFFLINE.html`
- `modulos/perguntas-offline/index.html`

É um único HTML autocontido, adequado para WebView e uso offline. Ele contém internamente o banco de perguntas, as 10 situações de Autonomia/Armadilha, estilos, JavaScript e logomarca.

Funcionamento:

- escolha entre Verde, Azul, Amarelo ou Roxo;
- uma única pergunta aleatória é sorteada;
- a pergunta sorteada sai do ciclo imediatamente e não se repete;
- a resposta correta só aparece depois de selecionar uma alternativa;
- o sorteio vermelho/laranja utiliza as 10 situações especiais sem repetição;
- o progresso dos sorteios é preservado em `localStorage` quando o WebView/navegador permite;
- é possível restaurar uma categoria, as situações especiais ou todo o banco.
