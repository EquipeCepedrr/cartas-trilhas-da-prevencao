(function (window, document) {
  'use strict';

  var game = window.TrilhasGame;
  var a11y = window.TrilhasA11y;
  var app = document.getElementById('app');
  var modalRoot = document.getElementById('modal-root');
  var route = 'home';
  var deferredInstallPrompt = null;
  var currentCardLayout = null;
  var rouletteResult = null;
  var rouletteRotation = 0;
  var ruleIndex = 0;
  var practiceQuestion = null;
  var practiceAnswer = null;
  var practiceCard = null;
  var questionFlowMode = null;

  // Associação oficial conforme a arte do tabuleiro e o banco do projeto:
  // Verde = conceituação/classificação; Azul = efeitos das drogas.
  var categoryInfo = {
    green: { label: 'Verde', title: 'Conceituação e classificação das drogas', color: '#2ead63' },
    blue: { label: 'Azul', title: 'Efeitos das drogas', color: '#2f80ed' },
    yellow: { label: 'Amarelo', title: 'Tratamentos e consequências', color: '#f2c94c' },
    purple: { label: 'Roxo', title: 'Comportamentos', color: '#8e5ac8' }
  };

  var tokenColors = ['#d7263d', '#2f80ed', '#8e5ac8', '#111827'];

  var rules = [
    {
      title: '1. Participantes',
      body: '<p>A partida deve ter de <strong>2 a 4 jogadores ou equipes</strong>. Uma única pessoa pode controlar dois ou mais peões.</p>'
    },
    {
      title: '2. Preparação',
      body: '<p>Escolha a quantidade de jogadores, edite os nomes se desejar e coloque todos os peões na área verde de início.</p>'
    },
    {
      title: '3. Quem começa',
      body: '<p>O aplicativo inicia com o Jogador 1 e controla automaticamente a ordem dos turnos.</p>'
    },
    {
      title: '4. Categorias',
      body: '<ul><li><strong>Verde:</strong> conceituação e classificação das drogas.</li><li><strong>Azul:</strong> efeitos das drogas.</li><li><strong>Amarelo:</strong> tratamentos e consequências.</li><li><strong>Roxo:</strong> comportamentos.</li></ul><p>A categoria da casa atual aparece como sugestão, mas outra categoria pode ser escolhida.</p>'
    },
    {
      title: '5. Perguntas',
      body: '<p>Escolha uma categoria, leia a pergunta e selecione uma alternativa. A resposta correta só é mostrada depois da escolha.</p>'
    },
    {
      title: '6. Acerto e erro',
      body: '<p>Ao <strong>acertar</strong>, a pergunta sai do banco da partida e o jogador lança o dado. Ao <strong>errar</strong>, o peão permanece na casa e a pergunta poderá aparecer novamente.</p>'
    },
    {
      title: '7. Dado e movimento',
      body: '<p>Use o dado digital ou informe o resultado de um dado físico. O aplicativo sugere a casa de destino, mas o aplicador pode corrigir manualmente.</p>'
    },
    {
      title: '8. Autonomia/Armadilha',
      body: '<p>As casas 5, 10, 15, 20, 25, 30, 35 e 40 abrem uma carta especial. A carta pode sugerir avanço, recuo ou perda de turno. O efeito só ocorre após confirmação.</p>'
    },
    {
      title: '9. Vitória',
      body: '<p>O jogador vence quando <strong>ultrapassa a casa 40</strong> e alcança a moeda final. Parar exatamente na casa 40 ainda exige uma carta especial.</p>'
    }
  ];

  function escapeHtml(value) {
    return String(value === null || typeof value === 'undefined' ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function categoryName(category) {
    return categoryInfo[category] ? categoryInfo[category].title : 'Categoria';
  }

  function playerPositionLabel(position) {
    if (position <= 0) return 'Início';
    if (position > 40) return 'Chegada';
    return 'Casa ' + position;
  }

  function icon(value) {
    return '<span aria-hidden="true">' + value + '</span>';
  }

  function topbar() {
    var current = game.current();
    var turn = current && game.state.active
      ? '<div class="player-turn" aria-label="Vez de ' + escapeHtml(current.name) + '"><span class="player-dot" style="--token-color:' + tokenColors[current.colorIndex % tokenColors.length] + '"></span><span>Vez de ' + escapeHtml(current.name) + '</span></div>'
      : '';
    return '<header class="topbar">' +
      '<button class="brand-button" type="button" data-action="go-home" aria-label="Voltar à tela inicial">' +
        '<img src="assets/icons/icon-192.png" alt="">' +
        '<span><strong>Trilhas da Prevenção</strong><small>Escolhas que contam</small></span>' +
      '</button>' + turn + '</header>';
  }

  function shell(content) {
    return '<div class="app-shell">' + topbar() + content + '</div>';
  }

  function readButton(target, label) {
    return '<button class="btn btn-secondary btn-small btn-icon" type="button" data-read-target="' + target + '">' + icon('🔊') + escapeHtml(label || 'Ouvir conteúdo') + '</button>';
  }

  function explanationOnlyBlock(explanation) {
    var clean = String(explanation || '').trim();
    return clean ? '<div class="explanation"><strong>Explicação:</strong> ' + escapeHtml(clean) + '</div>' : '';
  }

  function answerAndExplanationBlock(answer, explanation) {
    var clean = String(explanation || '').trim();
    return '<div class="explanation"><strong>Resposta correta:</strong> ' + escapeHtml(answer) + (clean ? '<br><strong>Explicação:</strong> ' + escapeHtml(clean) : '') + '</div>';
  }

  function renderHome() {
    var active = game.hasActiveGame();
    var storageWarning = game.storageAvailable ? '' : '<div class="notice warning"><strong>Atenção:</strong> o armazenamento local não está disponível. A partida funcionará, mas poderá ser perdida ao fechar a página.</div>';
    var primaryLabel = active ? 'Continuar partida' : 'Iniciar partida';
    var primaryAction = active ? 'continue-game' : 'open-setup';
    return shell(
      storageWarning +
      '<section class="hero-card" id="home-content">' +
        '<img class="hero-logo" src="assets/images/logo-projeto.png" alt="Trilhas da Prevenção: Escolhas que Contam">' +
        '<p class="hero-description">Jogo educativo e interativo de prevenção ao uso e abuso de álcool e outras drogas, voltado principalmente para adolescentes e jovens.</p>' +
        '<div class="action-grid">' +
          '<button class="btn btn-primary" type="button" data-action="' + primaryAction + '">' + icon('▶️') + ' ' + primaryLabel + '</button>' +
          '<button class="btn btn-secondary" type="button" data-action="open-rules">' + icon('📘') + ' Regras</button>' +
          '<button class="btn btn-secondary" type="button" data-action="open-question-browser">' + icon('❓') + ' Perguntas</button>' +
          '<button class="btn btn-secondary" type="button" data-action="open-cards-practice">' + icon('🃏') + ' Autonomia / Armadilha</button>' +
          '<button class="btn btn-secondary" type="button" data-action="open-roulette">' + icon('🎯') + ' Roleta</button>' +
          '<button class="btn btn-danger" type="button" data-action="request-new-game">' + icon('🔄') + ' Nova partida</button>' +
          '<button class="btn btn-secondary" type="button" data-action="open-settings">' + icon('⚙️') + ' Configurações</button>' +
          '<button class="btn btn-secondary" type="button" data-action="open-about">' + icon('ℹ️') + ' Sobre o projeto</button>' +
        '</div>' +
        '<div class="partner-logos" style="grid-template-columns:1fr">' +
          '<img src="assets/images/partners-strip.png" alt="Secretaria do Trabalho e Bem-Estar Social e Governo de Roraima">' +
        '</div>' +
      '</section>'
    );
  }

  function renderSetup() {
    var fields = '';
    var i;
    for (i = 1; i <= 4; i += 1) {
      fields += '<div class="field player-name-field" data-player-field="' + i + '"' + (i > 2 ? ' hidden' : '') + '>' +
        '<label for="player-name-' + i + '">Nome do Jogador ' + i + ' <span class="field-help">(opcional)</span></label>' +
        '<input id="player-name-' + i + '" type="text" maxlength="40" value="Jogador ' + i + '" autocomplete="off">' +
      '</div>';
    }
    return shell(
      '<section class="panel">' +
        '<div class="panel-header"><div><h1>Iniciar partida</h1><p>Escolha de 2 a 4 jogadores ou equipes.</p></div></div>' +
        '<form id="setup-form" class="setup-grid">' +
          '<div class="field"><label for="player-count">Quantidade de jogadores ou equipes</label>' +
            '<select id="player-count" name="player-count"><option value="2">2 jogadores</option><option value="3">3 jogadores</option><option value="4">4 jogadores</option></select>' +
            '<span class="field-help">Uma pessoa pode controlar todos os peões, mas a partida precisa ter pelo menos dois.</span>' +
          '</div>' +
          '<div class="player-name-fields">' + fields + '</div>' +
          '<div class="action-grid compact">' +
            '<button class="btn btn-primary" type="submit">Começar partida</button>' +
            '<button class="btn btn-secondary" type="button" data-action="go-home">Cancelar</button>' +
          '</div>' +
        '</form>' +
      '</section>'
    );
  }

  function tokenOffsets(players) {
    var groups = {};
    var result = {};
    players.forEach(function (player, index) {
      var key = String(player.position);
      if (!groups[key]) groups[key] = [];
      groups[key].push(index);
    });
    Object.keys(groups).forEach(function (key) {
      var members = groups[key];
      members.forEach(function (playerIndex, groupIndex) {
        var total = members.length;
        var spread = 14;
        var center = (total - 1) / 2;
        result[playerIndex] = {
          x: (groupIndex - center) * spread,
          y: total > 2 && groupIndex % 2 ? 8 : 0
        };
      });
    });
    return result;
  }

  function renderBoard(selectable) {
    var coords = game.boardCoordinates();
    var offsets = tokenOffsets(game.state.players);
    var tokens = game.state.players.map(function (player, index) {
      var position = Math.max(0, Math.min(41, player.position));
      var point = coords[position] || coords[0];
      var offset = offsets[index] || { x: 0, y: 0 };
      var selected = index === game.state.movingPlayer;
      var current = index === game.state.currentPlayer;
      return '<button type="button" class="token ' + (current ? 'is-current ' : '') + (selected && selectable ? 'is-moving' : '') + '"' +
        ' style="--x:' + point.x.toFixed(2) + ';--y:' + point.y.toFixed(2) + ';--offset-x:' + offset.x + 'px;--offset-y:' + offset.y + 'px;--token-color:' + tokenColors[player.colorIndex % tokenColors.length] + '"' +
        ' aria-label="' + escapeHtml(player.name) + ', ' + playerPositionLabel(player.position) + (current ? ', jogador da vez' : '') + '" data-player-index="' + index + '"' +
        (selectable ? ' data-action="select-moving-player"' : '') + '>' +
        '<span>' + escapeHtml(player.name) + '</span></button>';
    }).join('');
    var highlight = '';
    if ((route === 'movement' || route === 'card-result') && game.state.suggestedPosition !== null) {
      var highlightPosition = Math.max(0, Math.min(41, Number(game.state.suggestedPosition)));
      var highlightPoint = coords[highlightPosition] || coords[0];
      highlight = '<span class="target-highlight" aria-hidden="true" style="--x:' + highlightPoint.x.toFixed(2) + ';--y:' + highlightPoint.y.toFixed(2) + '"></span>';
    }
    return '<div class="board-card"><div class="board-scroll" aria-label="Tabuleiro digital. Deslize horizontalmente em telas pequenas.">' +
      '<div class="board-stage" id="board-stage"><img src="assets/images/board.jpg" alt="Tabuleiro com área inicial, casas numeradas de 1 a 40 e moeda final">' + highlight + tokens + '</div>' +
    '</div></div>';
  }

  function renderPlayerList() {
    return '<ul class="player-list">' + game.state.players.map(function (player, index) {
      return '<li class="player-row ' + (index === game.state.currentPlayer ? 'current' : '') + '">' +
        '<span class="player-dot" style="--token-color:' + tokenColors[player.colorIndex % tokenColors.length] + '"></span>' +
        '<span><strong>' + escapeHtml(player.name) + '</strong>' + (player.skipTurns ? '<br><small>Perde ' + player.skipTurns + ' turno(s)</small>' : '') + '</span>' +
        '<span class="position">' + playerPositionLabel(player.position) + '</span>' +
      '</li>';
    }).join('') + '</ul>';
  }

  function renderGame() {
    if (!game.hasActiveGame()) return renderHome();
    var notice = game.state.notice ? '<div class="notice" id="game-notice">' + escapeHtml(game.state.notice) + '</div>' : '';
    var guideActive = !game.state.firstActionCompleted;
    var guideHint = guideActive
      ? '<div class="round-guide-hint"><strong>Primeira ação:</strong> sorteie a cor/tema e abra uma pergunta.</div>'
      : '';
    return shell(
      notice +
      '<section class="game-layout">' +
        renderBoard(false) +
        '<aside class="sidebar">' +
          '<div class="status-card"><h2>Jogadores</h2>' + renderPlayerList() + '</div>' +
          '<div class="status-card"><h2>Ações da rodada</h2>' + guideHint + '<div class="action-grid" style="grid-template-columns:1fr">' +
            '<button class="btn btn-primary" type="button" data-action="open-categories">' + icon('❓') + ' Perguntas</button>' +
            '<button id="round-roulette-button" class="btn btn-secondary' + (guideActive ? ' is-guided-action' : '') + '" type="button" data-action="open-roulette">' + icon('🎯') + ' Roleta</button>' +
            '<button class="btn btn-secondary" type="button" data-action="open-cards-game">' + icon('🃏') + ' Autonomia / Armadilha</button>' +
            '<button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>' + icon('↩️') + ' Refazer turno</button>' +
            '<button class="btn btn-secondary" type="button" data-action="go-home">Início</button>' +
          '</div></div>' +
        '</aside>' +
      '</section>'
    );
  }

  function renderCategories() {
    if (!game.hasActiveGame()) return renderQuestionBrowser();
    var current = game.current();
    var suggested = game.getCategoryForPosition(current.position || 1);
    var counts = game.categoryCounts();
    var buttons = window.TrilhasGameConstants.categories.map(function (category) {
      var info = categoryInfo[category];
      var available = counts[category];
      return '<button class="category-button ' + category + (category === suggested ? ' suggested' : '') + '" type="button" data-action="draw-question" data-category="' + category + '"' + (available ? '' : ' disabled') + '>' +
        (category === suggested ? '<span class="suggested-badge">Categoria sugerida</span>' : '') +
        '<span>' + info.label + ' — ' + info.title + '</span>' +
        '<small>' + (available ? available + ' pergunta(s) disponível(is)' : 'Categoria concluída nesta partida') + '</small>' +
      '</button>';
    }).join('');
    return shell(
      '<section class="panel" id="categories-content">' +
        '<div class="panel-header"><div><h1>Escolha uma categoria</h1><p>A casa atual sugere uma categoria, mas outra pode ser selecionada.</p></div>' + readButton('#categories-content', 'Ouvir categorias') + '</div>' +
        '<div class="category-grid">' + buttons + '</div>' +
        '<div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="back-to-game">Voltar ao tabuleiro</button><button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>Refazer turno</button></div>' +
      '</section>'
    );
  }

  function questionSpeech(question) {
    var alternatives = question.options.map(function (option, index) {
      return 'Alternativa ' + String.fromCharCode(65 + index) + ': ' + option;
    }).join('. ');
    return question.text + '. ' + alternatives;
  }

  function renderQuestion() {
    var question = game.getQuestion();
    if (!question) return renderCategories();
    var answered = game.state.currentQuestionAnswered;
    var selected = game.state.currentAnswerIndex;
    var correct = answered && selected === question.correct;
    var answers = question.options.map(function (option, index) {
      var stateClass = '';
      var marker = String.fromCharCode(65 + index) + '.';
      if (answered && index === question.correct) stateClass = ' correct';
      if (answered && index === selected && index !== question.correct) stateClass = ' wrong';
      return '<button class="answer-btn' + stateClass + '" type="button" data-action="answer-question" data-answer-index="' + index + '"' + (answered ? ' disabled' : '') + '>' +
        '<span class="answer-marker">' + marker + '</span>' + escapeHtml(option) +
      '</button>';
    }).join('');
    var result = '';
    if (answered) {
      if (correct) {
        result = '<div class="notice success"><strong>Resposta correta!</strong> Agora escolha como jogar o dado.</div>' +
          explanationOnlyBlock(question.explanation) +
          '<div class="action-grid compact"><button class="btn btn-primary" type="button" data-action="use-digital-dice">Usar dado digital</button><button class="btn btn-secondary" type="button" data-action="open-physical-dice">Usar dado físico</button><button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>Refazer turno</button></div>';
      } else {
        result = '<div class="notice error"><strong>Resposta incorreta.</strong> Você permanece na mesma casa.</div>' +
          answerAndExplanationBlock(question.options[question.correct], question.explanation) +
          '<div class="action-grid compact"><button class="btn btn-primary" type="button" data-action="next-player-no-move">Próximo jogador</button><button class="btn btn-secondary" type="button" data-action="try-another-question">Tentar outra pergunta</button><button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>Refazer turno</button></div>';
      }
    }
    return shell(
      '<section class="question-card" id="question-content" data-speech-text="' + escapeHtml(questionSpeech(question)) + '">' +
        '<div class="panel-header"><div><div class="question-meta"><span class="badge ' + question.category + '">' + escapeHtml(categoryInfo[question.category].label) + '</span><span class="badge">Complexidade ' + escapeHtml(question.complexity) + '</span></div></div>' + readButton('#question-content', 'Ler pergunta') + '</div>' +
        '<h1 class="question-text">' + escapeHtml(question.text) + '</h1>' +
        '<div class="answer-list">' + answers + '</div>' + result +
      '</section>'
    );
  }

  function renderPhysicalDice() {
    var buttons = '';
    var i;
    for (i = 1; i <= 6; i += 1) {
      buttons += '<button class="btn btn-secondary" type="button" data-action="set-physical-dice" data-dice-value="' + i + '">' + i + '</button>';
    }
    return shell(
      '<section class="panel" id="physical-dice-content">' +
        '<div class="panel-header"><div><h1>Dado físico</h1><p>Informe o número obtido no dado. Somente valores de 1 a 6 são aceitos.</p></div>' + readButton('#physical-dice-content', 'Ouvir instrução') + '</div>' +
        '<div class="number-grid">' + buttons + '</div>' +
        '<div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="back-to-question">Voltar</button></div>' +
      '</section>'
    );
  }

  function renderMovement() {
    if (!game.hasActiveGame()) return renderHome();
    var mover = game.mover();
    var target = game.state.suggestedPosition;
    var selector = game.state.players.map(function (player, index) {
      return '<button class="player-choice ' + (index === game.state.movingPlayer ? 'selected' : '') + '" type="button" data-action="select-moving-player" data-player-index="' + index + '">' + escapeHtml(player.name) + '</button>';
    }).join('');
    var message = mover.name + ' deve avançar até ' + (target > 40 ? 'a chegada final' : 'a casa ' + target) + '.';
    return shell(
      '<section class="panel" id="movement-content" data-speech-text="Resultado do dado: ' + game.state.currentRoll + '. ' + escapeHtml(message) + '">' +
        '<div class="panel-header"><div><h1>Movimentação do peão</h1><p>Confira a sugestão antes de confirmar.</p></div>' + readButton('#movement-content', 'Ouvir movimento') + '</div>' +
        '<div class="dice-display" aria-label="Resultado do dado: ' + game.state.currentRoll + '">' + game.state.currentRoll + '</div>' +
        '<div class="player-selector" aria-label="Escolher peão para correção manual">' + selector + '</div>' +
        '<p class="movement-summary"><strong>' + escapeHtml(message) + '</strong></p>' +
        renderBoard(true) +
        '<div class="action-grid three">' +
          '<button class="btn btn-primary" type="button" data-action="confirm-movement">Confirmar movimento</button>' +
          '<button class="btn btn-secondary" type="button" data-action="choose-manual-position">Escolher outra casa</button>' +
          '<button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>Refazer turno</button>' +
        '</div>' +
      '</section>'
    );
  }

  function ensureCardLayout() {
    if (!currentCardLayout) currentCardLayout = game.cardLayout();
    return currentCardLayout;
  }

  function renderCardsGame() {
    if (!game.hasActiveGame()) return renderCardsPractice();
    if (game.state.currentCardId) return renderCardResult();
    var layout = ensureCardLayout();
    var remaining = layout.filter(function (id) { return Boolean(id); }).length;
    var cards = layout.map(function (id, index) {
      return '<button class="card-back" type="button" ' + (id ? 'data-action="draw-card" data-card-id="' + id + '"' : 'disabled') + ' aria-label="' + (id ? 'Carta virada para baixo número ' + (index + 1) : 'Carta já utilizada') + '"><span>' + (id ? '?' : '✓') + '</span></button>';
    }).join('');
    return shell(
      '<section class="panel" id="cards-content">' +
        '<div class="panel-header"><div><h1>Autonomia / Armadilha</h1><p>Escolha uma carta. O tipo e o conteúdo permanecem ocultos até a seleção.</p></div>' + readButton('#cards-content', 'Ouvir instrução') + '</div>' +
        '<div class="notice">Restam <strong>' + remaining + '</strong> carta(s) neste ciclo. Quando todas forem usadas, o conjunto será restaurado automaticamente.</div>' +
        '<div class="cards-grid">' + cards + '</div>' +
        '<div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="back-to-game">Voltar ao tabuleiro</button><button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>Refazer turno</button></div>' +
      '</section>'
    );
  }

  function renderCardResult() {
    var card = game.getCard();
    if (!card) {
      currentCardLayout = game.cardLayout();
      return renderCardsGame();
    }
    var current = game.current();
    var effectControls;
    var speech = card.type + '. ' + card.title + '. ' + card.text + '. Consequência: ' + card.consequence;
    if (card.effect.kind === 'skip') {
      effectControls = '<button class="btn btn-primary" type="button" data-action="confirm-card-skip">Confirmar penalidade</button>' +
        '<button class="btn btn-secondary" type="button" data-action="ignore-card-effect">Não aplicar e encerrar turno</button>';
    } else {
      var target = game.state.suggestedPosition;
      var guidance = target > 40 ? 'chegada final' : 'casa ' + target;
      effectControls = '<button class="btn btn-primary" type="button" data-action="confirm-card-move">Confirmar casa sugerida: ' + guidance + '</button>' +
        '<button class="btn btn-secondary" type="button" data-action="choose-card-manual-position">Escolher outra casa</button>';
    }
    return shell(
      '<section class="result-card card-result ' + card.type + '" id="card-result-content" data-speech-text="' + escapeHtml(speech) + '">' +
        '<p class="card-type">' + escapeHtml(card.type) + '</p>' +
        '<h1>' + escapeHtml(card.title) + '</h1>' +
        '<p>' + escapeHtml(card.text) + '</p>' +
        '<p class="card-consequence">' + escapeHtml(card.consequence) + '</p>' +
        (card.effect.kind === 'move' ? '<div class="notice">A carta orienta que <strong>' + escapeHtml(current.name) + '</strong> vá para ' + (game.state.suggestedPosition > 40 ? 'a chegada final' : 'a casa ' + game.state.suggestedPosition) + '.</div>' : '<div class="notice warning">O próximo turno de <strong>' + escapeHtml(current.name) + '</strong> será pulado após a confirmação.</div>') +
        (card.effect.kind === 'move' ? renderBoard(false) : '') +
        readButton('#card-result-content', 'Ler carta') +
        '<div class="action-grid compact">' + effectControls + '<button class="btn btn-warning" type="button" data-action="request-undo"' + (game.canUndo() ? '' : ' disabled') + '>Refazer turno</button></div>' +
      '</section>'
    );
  }

  function renderRoulette() {
    var resultHtml = rouletteResult
      ? '<div class="roulette-result">Categoria sorteada: <span class="badge ' + rouletteResult + '">' + escapeHtml(categoryName(rouletteResult)) + '</span></div>'
      : '<div class="roulette-result">Toque em girar para sortear uma categoria.</div>';
    var goButton = rouletteResult && game.hasActiveGame()
      ? '<button class="btn btn-primary" type="button" data-action="roulette-go-category" data-category="' + rouletteResult + '">Ir para essa categoria</button>'
      : '';
    return shell(
      '<section class="panel" id="roulette-content">' +
        '<div class="panel-header"><div><h1>Roleta digital</h1><p>As quatro categorias são sorteadas em ciclos sem repetição.</p></div>' + readButton('#roulette-content', 'Ouvir roleta') + '</div>' +
        '<div class="roulette-wrap"><div class="roulette-pointer" aria-hidden="true"></div><div id="roulette-wheel" class="roulette" role="img" aria-label="Roleta com quatro categorias"></div></div>' +
        resultHtml +
        '<div class="action-grid compact"><button class="btn btn-primary" type="button" data-action="spin-roulette">Girar roleta</button>' + goButton + '<button class="btn btn-secondary" type="button" data-action="roulette-back">Voltar</button></div>' +
      '</section>'
    );
  }

  function renderRules() {
    var stepButtons = rules.map(function (item, index) {
      return '<button class="rule-step-button ' + (index === ruleIndex ? 'active' : '') + '" type="button" data-action="select-rule" data-rule-index="' + index + '">' + escapeHtml(item.title) + '</button>';
    }).join('');
    var current = rules[ruleIndex];
    return shell(
      '<section class="panel" id="rules-content">' +
        '<div class="panel-header"><div><h1>Regras do jogo</h1><p>Conteúdo resumido e dividido em etapas.</p></div>' + readButton('#rule-current', 'Ler esta regra') + '</div>' +
        '<div class="rules-layout"><nav class="rule-steps" aria-label="Etapas das regras">' + stepButtons + '</nav>' +
          '<article class="rule-card" id="rule-current"><h2>' + escapeHtml(current.title) + '</h2>' + current.body +
            '<div class="rule-nav"><button class="btn btn-secondary" type="button" data-action="previous-rule"' + (ruleIndex === 0 ? ' disabled' : '') + '>Anterior</button><button class="btn btn-primary" type="button" data-action="next-rule"' + (ruleIndex === rules.length - 1 ? ' disabled' : '') + '>Próxima</button></div>' +
          '</article></div>' +
        '<div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="go-home">Voltar ao início</button></div>' +
      '</section>'
    );
  }

  function isInstalled() {
    return Boolean(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function renderSettings() {
    var config = game.state.config;
    var installText = isInstalled() ? 'Aplicativo instalado.' : (deferredInstallPrompt ? 'Instalar aplicativo' : 'Instalação disponível pelo menu do Chrome quando os requisitos forem atendidos.');
    return shell(
      '<section class="settings-card panel" id="settings-content">' +
        '<div class="panel-header"><div><h1>Configurações</h1><p>Estas preferências são mantidas mesmo ao iniciar uma nova partida.</p></div>' + readButton('#settings-content', 'Ouvir configurações') + '</div>' +
        '<div class="settings-grid">' +
          '<div class="setting-row"><div><strong>Leitura por voz</strong><p>A leitura só começa quando um botão de áudio é pressionado.</p></div><label class="toggle"><input id="setting-voice" type="checkbox" data-setting="voiceEnabled"' + (config.voiceEnabled ? ' checked' : '') + '><span aria-hidden="true"></span><span class="sr-only">Ativar leitura por voz</span></label></div>' +
          '<div class="setting-row"><div><strong>Velocidade da leitura</strong><p>Escolha entre 0,6 e 1,6.</p></div><div class="range-row"><input id="setting-rate" type="range" min="0.6" max="1.6" step="0.1" value="' + config.voiceRate + '" data-setting="voiceRate"><output id="rate-output" for="setting-rate">' + Number(config.voiceRate).toFixed(1) + 'x</output></div></div>' +
          '<div class="setting-row"><div><strong>Efeitos sonoros</strong><p>Sons breves para acerto, erro, dado, roleta, cartas, movimento e vitória.</p></div><label class="toggle"><input type="checkbox" data-setting="soundsEnabled"' + (config.soundsEnabled ? ' checked' : '') + '><span aria-hidden="true"></span><span class="sr-only">Ativar efeitos sonoros</span></label></div>' +
          '<div class="setting-row"><div><strong>Animações</strong><p>O sistema também respeita a preferência de redução de movimento do aparelho.</p></div><label class="toggle"><input type="checkbox" data-setting="animationsEnabled"' + (config.animationsEnabled ? ' checked' : '') + '><span aria-hidden="true"></span><span class="sr-only">Ativar animações</span></label></div>' +
          '<div class="setting-row"><div><strong>Instalação</strong><p id="install-status">' + escapeHtml(installText) + '</p></div><button class="btn btn-primary btn-small" type="button" data-action="install-app"' + ((!deferredInstallPrompt || isInstalled()) ? ' disabled' : '') + '>' + (isInstalled() ? 'Instalado' : 'Instalar') + '</button></div>' +
        '</div>' +
        '<div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="test-voice">Testar leitura</button><button class="btn btn-secondary" type="button" data-action="reset-settings">Restaurar configurações</button><button class="btn btn-primary" type="button" data-action="settings-back">Concluir</button></div>' +
      '</section>'
    );
  }

  function renderAbout() {
    return shell(
      '<section class="panel" id="about-content">' +
        '<div class="panel-header"><div><h1>Sobre o projeto</h1><p>Informações resumidas.</p></div>' + readButton('#about-content', 'Ouvir sobre o projeto') + '</div>' +
        '<div class="about-grid"><div class="about-list">' +
          '<div class="about-item">Desenvolvido pela <strong>Coordenação Estadual da Política de Enfrentamento às Drogas de Roraima</strong>.</div>' +
          '<div class="about-item">Vinculado à <strong>Secretaria do Trabalho e Bem-Estar Social — SETRABES</strong>.</div>' +
          '<div class="about-item">Utiliza uma abordagem <strong>educativa, interativa e lúdica</strong>.</div>' +
          '<div class="about-item">Busca estimular <strong>decisões saudáveis e conscientes</strong>.</div>' +
          '<div class="about-item">Trabalha a prevenção ao uso e abuso de substâncias psicoativas.</div>' +
          '<div class="about-item">Integra o projeto <strong>Droga Zero: Prevenção em Movimento</strong>.</div>' +
        '</div><div class="partner-logos" style="grid-template-columns:1fr;margin-top:0"><img src="assets/images/logo-projeto.png" alt="Logomarca oficial do projeto"><img src="assets/images/partners-strip.png" alt="Secretaria do Trabalho e Bem-Estar Social e Governo de Roraima"></div></div>' +
        '<div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="go-home">Voltar ao início</button></div>' +
      '</section>'
    );
  }

  function renderQuestionBrowser() {
    var categoryButtons = window.TrilhasGameConstants.categories.map(function (category) {
      var total = window.TRILHAS_QUESTIONS.filter(function (q) { return q.category === category; }).length;
      return '<button class="category-button ' + category + '" type="button" data-action="practice-question" data-category="' + category + '"><span>' + escapeHtml(categoryInfo[category].label + ' — ' + categoryInfo[category].title) + '</span><small>Sortear uma entre ' + total + ' perguntas</small></button>';
    }).join('');
    return shell(
      '<section class="panel" id="browser-content"><div class="panel-header"><div><h1>Perguntas</h1><p>Escolha uma cor/tema. Uma única pergunta será sorteada, sem exibir previamente as respostas do banco.</p></div>' + readButton('#browser-content', 'Ouvir categorias') + '</div>' +
        '<div class="category-grid">' + categoryButtons + '</div><div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="go-home">Voltar ao início</button></div></section>'
    );
  }

  function renderPracticeQuestion() {
    if (!practiceQuestion) return renderQuestionBrowser();
    var q = practiceQuestion;
    var answered = practiceAnswer !== null;
    var answers = q.options.map(function (option, index) {
      var className = '';
      if (answered && index === q.correct) className = ' correct';
      if (answered && index === practiceAnswer && index !== q.correct) className = ' wrong';
      return '<button class="answer-btn' + className + '" type="button" data-action="answer-practice" data-answer-index="' + index + '"' + (answered ? ' disabled' : '') + '><span class="answer-marker">' + String.fromCharCode(65 + index) + '.</span>' + escapeHtml(option) + '</button>';
    }).join('');
    var result = answered ? '<div class="notice ' + (practiceAnswer === q.correct ? 'success' : 'error') + '"><strong>' + (practiceAnswer === q.correct ? 'Resposta correta!' : 'Resposta incorreta.') + '</strong></div>' + answerAndExplanationBlock(q.options[q.correct], q.explanation) : '';
    return shell(
      '<section class="question-card" id="practice-content" data-speech-text="' + escapeHtml(questionSpeech(q)) + '"><div class="panel-header"><div class="question-meta"><span class="badge ' + q.category + '">Treinamento</span><span class="badge">' + escapeHtml(q.complexity) + '</span></div>' + readButton('#practice-content', 'Ler pergunta') + '</div><h1 class="question-text">' + escapeHtml(q.text) + '</h1><div class="answer-list">' + answers + '</div>' + result + '<div class="action-grid compact"><button class="btn btn-primary" type="button" data-action="practice-question" data-category="' + q.category + '">Sortear outra</button><button class="btn btn-secondary" type="button" data-action="open-question-browser">Voltar</button></div></section>'
    );
  }

  function renderCardsPractice() {
    var cards = '';
    var i;
    for (i = 0; i < 10; i += 1) {
      cards += '<button class="card-back" type="button" data-action="draw-practice-card" data-card-index="' + i + '" aria-label="Carta virada para baixo número ' + (i + 1) + '"><span>?</span></button>';
    }
    return shell(
      '<section class="panel" id="cards-practice-content"><div class="panel-header"><div><h1>Autonomia / Armadilha</h1><p>Modo de consulta. Nenhuma partida será alterada.</p></div>' + readButton('#cards-practice-content', 'Ouvir instrução') + '</div><div class="cards-grid">' + cards + '</div><div class="action-grid compact"><button class="btn btn-secondary" type="button" data-action="go-home">Voltar ao início</button></div></section>'
    );
  }

  function renderPracticeCardResult() {
    if (!practiceCard) return renderCardsPractice();
    var speech = practiceCard.type + '. ' + practiceCard.title + '. ' + practiceCard.text + '. ' + practiceCard.consequence;
    return shell(
      '<section class="result-card card-result ' + practiceCard.type + '" id="practice-card-content" data-speech-text="' + escapeHtml(speech) + '"><p class="card-type">' + escapeHtml(practiceCard.type) + '</p><h1>' + escapeHtml(practiceCard.title) + '</h1><p>' + escapeHtml(practiceCard.text) + '</p><p class="card-consequence">' + escapeHtml(practiceCard.consequence) + '</p>' + readButton('#practice-card-content', 'Ler carta') + '<div class="action-grid compact"><button class="btn btn-primary" type="button" data-action="open-cards-practice">Escolher outra carta</button><button class="btn btn-secondary" type="button" data-action="go-home">Voltar ao início</button></div></section>'
    );
  }

  function renderVictory() {
    var victory = game.state.victory;
    if (!victory) return renderHome();
    var confetti = '';
    var colors = ['#2ead63', '#2f80ed', '#f2c94c', '#8e5ac8', '#f2994a'];
    var i;
    for (i = 0; i < 22; i += 1) {
      confetti += '<span class="confetti" aria-hidden="true" style="--left:' + ((i * 47) % 100) + '%;--delay:' + ((i % 8) * -.22) + 's;--confetti:' + colors[i % colors.length] + '"></span>';
    }
    return shell(
      '<section class="hero-card victory-card" id="victory-content">' + confetti + '<div class="victory-emoji" aria-hidden="true">🏆</div><h1>Parabéns!</h1><p class="question-text">' + escapeHtml(victory.playerName) + ' concluiu as Trilhas da Prevenção!</p>' + readButton('#victory-content', 'Ouvir mensagem') + '<div class="action-grid"><button class="btn btn-primary" type="button" data-action="open-setup-after-victory">Nova partida</button><button class="btn btn-secondary" type="button" data-action="go-home">Voltar ao início</button></div></section>'
    );
  }

  function render() {
    var html;
    switch (route) {
      case 'setup': html = renderSetup(); break;
      case 'game': html = renderGame(); break;
      case 'categories': html = renderCategories(); break;
      case 'question': html = renderQuestion(); break;
      case 'physical-dice': html = renderPhysicalDice(); break;
      case 'movement': html = renderMovement(); break;
      case 'cards': html = renderCardsGame(); break;
      case 'card-result': html = renderCardResult(); break;
      case 'roulette': html = renderRoulette(); break;
      case 'rules': html = renderRules(); break;
      case 'settings': html = renderSettings(); break;
      case 'about': html = renderAbout(); break;
      case 'question-browser': html = renderQuestionBrowser(); break;
      case 'practice-question': html = renderPracticeQuestion(); break;
      case 'cards-practice': html = renderCardsPractice(); break;
      case 'practice-card-result': html = renderPracticeCardResult(); break;
      case 'victory': html = renderVictory(); break;
      default: html = renderHome();
    }
    app.innerHTML = html;
    app.setAttribute('aria-busy', 'false');
    a11y.updateGlobalVoiceButton();
    window.scrollTo(0, 0);
    window.setTimeout(function () {
      var heading = app.querySelector('h1');
      try {
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        } else {
          app.focus({ preventScroll: true });
        }
      } catch (focusError) {
        if (heading) heading.focus();
        else app.focus();
      }
    }, 20);
  }

  function navigate(nextRoute) {
    route = nextRoute;
    render();
  }

  function routeForState() {
    if (game.state.victory || game.state.phase === 'victory') return 'victory';
    if (game.state.phase === 'question' || game.state.phase === 'wrong-answer' || game.state.phase === 'dice-choice') return 'question';
    if (game.state.phase === 'movement') return 'movement';
    if (game.state.phase === 'card-result') return 'card-result';
    if (game.state.phase === 'card') return 'cards';
    if (game.state.phase === 'categories') return 'categories';
    return 'game';
  }

  function showToast(message, type) {
    var region = document.getElementById('toast-region');
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3600);
  }

  function showModal(options) {
    var opts = options || {};
    modalRoot.innerHTML = '<div class="modal-overlay" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<h2 id="modal-title">' + escapeHtml(opts.title || 'Confirmação') + '</h2>' +
      '<div id="modal-body">' + (opts.body || '') + '</div>' +
      '<div class="modal-actions">' + (opts.actions || '<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>') + '</div>' +
    '</section></div>';
    window.setTimeout(function () {
      var focusable = modalRoot.querySelector('button, input, select');
      if (focusable) focusable.focus();
    }, 20);
  }

  function closeModal() {
    modalRoot.innerHTML = '';
  }

  function focusModalContent() {
    window.setTimeout(function () {
      var focusable = modalRoot.querySelector('button:not([disabled]), input, select, [tabindex]');
      if (focusable) focusable.focus();
    }, 20);
  }

  function setQuestionModal(title, body) {
    modalRoot.innerHTML = '<div class="modal-overlay question-modal-overlay" role="presentation"><section class="modal question-modal" role="dialog" aria-modal="true" aria-labelledby="question-modal-title">' +
      '<div class="question-modal-header"><div><p class="question-modal-kicker">Perguntas da rodada</p><h2 id="question-modal-title">' + escapeHtml(title) + '</h2></div><button class="question-modal-close" type="button" data-action="close-question-modal" aria-label="Fechar perguntas e voltar ao tabuleiro">×</button></div>' +
      '<div class="question-modal-body">' + body + '</div>' +
    '</section></div>';
    focusModalContent();
  }

  function showGameQuestionHubModal() {
    if (!game.hasActiveGame()) return;
    questionFlowMode = 'game';
    var current = game.current();
    var suggested = game.getCategoryForPosition(current.position || 1);
    var counts = game.categoryCounts();
    var buttons = window.TrilhasGameConstants.categories.map(function (category) {
      var info = categoryInfo[category];
      var available = counts[category];
      return '<button class="question-theme-button ' + category + (category === suggested ? ' suggested' : '') + '" type="button" data-action="draw-question" data-category="' + category + '"' + (available ? '' : ' disabled') + '>' +
        '<span class="question-theme-dot" aria-hidden="true"></span><span><strong>' + escapeHtml(info.label) + '</strong><small>' + escapeHtml(info.title) + '</small></span>' +
        (category === suggested ? '<span class="compact-suggested-badge">Sugerida</span>' : '') +
      '</button>';
    }).join('');
    setQuestionModal('Escolha a cor/tema',
      '<p class="question-modal-intro">Ao selecionar uma categoria, o aplicativo sorteará imediatamente uma pergunta disponível.</p>' +
      '<div class="question-hub-grid">' + buttons + '</div>' +
      '<div class="question-modal-footer"><button class="btn btn-secondary btn-small" type="button" data-action="close-question-modal">Voltar ao tabuleiro</button></div>'
    );
  }

  function showGameQuestionModal() {
    var question = game.getQuestion();
    if (!question) { showGameQuestionHubModal(); return; }
    questionFlowMode = 'game';
    var answered = game.state.currentQuestionAnswered;
    var selected = game.state.currentAnswerIndex;
    var correct = answered && selected === question.correct;
    var answers = question.options.map(function (option, index) {
      var stateClass = '';
      if (answered && index === question.correct) stateClass = ' correct';
      if (answered && index === selected && index !== question.correct) stateClass = ' wrong';
      return '<button class="answer-btn' + stateClass + '" type="button" data-action="answer-question" data-answer-index="' + index + '"' + (answered ? ' disabled' : '') + '><span class="answer-marker">' + String.fromCharCode(65 + index) + '.</span>' + escapeHtml(option) + '</button>';
    }).join('');
    var result = '';
    if (answered && correct) {
      result = '<div class="notice success modal-result"><strong>Resposta correta!</strong> Agora escolha como jogar o dado.</div>' +
        explanationOnlyBlock(question.explanation) +
        '<div class="action-grid compact question-result-actions"><button class="btn btn-primary" type="button" data-action="use-digital-dice">Usar dado digital</button><button class="btn btn-secondary" type="button" data-action="open-physical-dice">Usar dado físico</button></div>';
    } else if (answered) {
      result = '<div class="notice error modal-result"><strong>Resposta incorreta.</strong> Você permanece na mesma casa.</div>' +
        answerAndExplanationBlock(question.options[question.correct], question.explanation) +
        '<div class="action-grid compact question-result-actions"><button class="btn btn-primary" type="button" data-action="next-player-no-move">Próximo jogador</button><button class="btn btn-secondary" type="button" data-action="try-another-question">Tentar outra pergunta</button></div>';
    }
    setQuestionModal('Responda à pergunta',
      '<section id="question-modal-content" data-speech-text="' + escapeHtml(questionSpeech(question)) + '">' +
        '<div class="question-modal-tools"><div class="question-meta"><span class="badge ' + question.category + '">' + escapeHtml(categoryInfo[question.category].label) + '</span><span class="badge">Complexidade ' + escapeHtml(question.complexity) + '</span></div>' + readButton('#question-modal-content', 'Ler pergunta') + '</div>' +
        '<h3 class="question-text modal-question-text">' + escapeHtml(question.text) + '</h3><div class="answer-list">' + answers + '</div>' + result +
      '</section>'
    );
  }

  function showFirstActionGuide() {
    if (!game.hasActiveGame() || game.state.firstActionGuideShown) return;
    game.markFirstActionGuideShown();
    showModal({
      title: 'Comece pela cor/tema',
      body: '<div class="first-action-guide"><div class="guide-icon" aria-hidden="true">🎯</div><p><strong>Primeira ação:</strong> sorteie uma cor/tema na <strong>Roleta</strong>. Depois, o aplicativo abrirá uma pergunta daquela categoria.</p><p>O botão necessário continuará piscando no painel <strong>Ações da rodada</strong>.</p></div>',
      actions: '<button class="btn btn-secondary" type="button" data-action="close-modal">Entendi</button><button class="btn btn-primary" type="button" data-action="open-guided-roulette">Abrir roleta</button>'
    });
  }

  function resumeGameFlow() {
    var phase = game.state.phase;
    if (phase === 'categories') {
      navigate('game');
      window.setTimeout(showGameQuestionHubModal, 30);
    } else if (phase === 'question' || phase === 'wrong-answer' || phase === 'dice-choice') {
      navigate('game');
      window.setTimeout(showGameQuestionModal, 30);
    } else {
      navigate(routeForState());
      if (route === 'game') window.setTimeout(showFirstActionGuide, 60);
    }
  }

  function confirmNewGame() {
    if (game.state.active || game.state.victory) {
      showModal({
        title: 'Iniciar nova partida?',
        body: '<p>Iniciar uma nova partida apagará o progresso atual. As configurações de acessibilidade serão mantidas.</p>',
        actions: '<button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-danger" type="button" data-action="confirm-new-game">Apagar e continuar</button>'
      });
    } else {
      navigate('setup');
    }
  }

  function confirmUndo() {
    if (!game.canUndo()) {
      showToast('Ainda não existe uma rodada concluída para desfazer.', 'warning');
      return;
    }
    showModal({
      title: 'Refazer turno',
      body: '<p>Deseja realmente desfazer a última rodada?</p>',
      actions: '<button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-warning" type="button" data-action="confirm-undo">Desfazer rodada</button>'
    });
  }

  function showManualPositionModal(context) {
    var label = context === 'card' ? 'Escolha a casa para aplicar a carta.' : 'Escolha a casa de destino para corrigir o movimento.';
    showModal({
      title: 'Escolher outra casa',
      body: '<div class="field"><label for="manual-position">' + escapeHtml(label) + '</label><input id="manual-position" type="number" inputmode="numeric" min="0" max="41" value="' + Math.min(41, game.state.suggestedPosition || 0) + '"><span class="field-help">Use 0 para o início e 41 para a moeda final.</span></div>',
      actions: '<button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="button" data-action="confirm-manual-position" data-context="' + context + '">Confirmar casa</button>'
    });
  }

  function animateMovement(playerIndex, target, callback) {
    var player = game.state.players[playerIndex];
    var start = player ? player.position : 0;
    var finalTarget = Math.max(0, Math.min(41, Number(target)));
    var token = document.querySelector('.token[data-player-index="' + playerIndex + '"]');
    var coords = game.boardCoordinates();
    if (!token || !a11y.animationsEnabled() || start === finalTarget) {
      callback();
      return;
    }
    var direction = finalTarget >= start ? 1 : -1;
    var path = [];
    var position;
    for (position = start + direction; direction > 0 ? position <= finalTarget : position >= finalTarget; position += direction) {
      path.push(position);
    }
    var delay = Math.max(45, Math.min(170, Math.floor(1700 / Math.max(1, path.length))));
    var index = 0;
    token.classList.add('is-moving');
    a11y.playSound('move');
    function step() {
      if (index >= path.length) {
        token.classList.remove('is-moving');
        callback();
        return;
      }
      var point = coords[path[index]] || coords[0];
      token.style.setProperty('--x', point.x.toFixed(2));
      token.style.setProperty('--y', point.y.toFixed(2));
      index += 1;
      window.setTimeout(step, delay);
    }
    step();
  }

  function applyMovementAndRoute(target, playerIndex, isCard) {
    animateMovement(playerIndex, target, function () {
      var result = isCard
        ? game.confirmCardEffect(Number(target))
        : game.applyMovement(Number(target), { playerIndex: playerIndex, completeTurn: true });
      currentCardLayout = null;
      if (result && result.error) {
        showToast(result.error, 'error');
        render();
      } else if (result && result.victory) {
        a11y.playSound('victory');
        navigate('victory');
      } else if (result && result.special) {
        currentCardLayout = game.cardLayout();
        navigate('cards');
      } else {
        navigate('game');
      }
    });
  }

  function handleClick(event) {
    var button = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!button || button.disabled) return;
    var action = button.getAttribute('data-action');

    if (action === 'go-home') navigate('home');
    else if (action === 'open-setup') navigate('setup');
    else if (action === 'continue-game') resumeGameFlow();
    else if (action === 'back-to-game') navigate('game');
    else if (action === 'open-categories') { if (game.hasActiveGame()) { game.completeFirstActionGuide(); game.state.phase = game.getQuestion() ? game.state.phase : 'categories'; game.save(); render(); if (game.getQuestion()) showGameQuestionModal(); else showGameQuestionHubModal(); } else navigate('question-browser'); }
    else if (action === 'request-new-game') confirmNewGame();
    else if (action === 'confirm-new-game') { closeModal(); game.clearGame(); currentCardLayout = null; rouletteResult = null; navigate('setup'); }
    else if (action === 'open-setup-after-victory') { game.clearGame(); navigate('setup'); }
    else if (action === 'request-undo') confirmUndo();
    else if (action === 'confirm-undo') { closeModal(); game.undoLastTurn(); currentCardLayout = null; showToast('Última rodada desfeita.', 'success'); navigate('game'); }
    else if (action === 'close-modal') closeModal();
    else if (action === 'close-question-modal') { closeModal(); questionFlowMode = null; }
    else if (action === 'open-rules') navigate('rules');
    else if (action === 'open-settings') navigate('settings');
    else if (action === 'open-about') navigate('about');
    else if (action === 'open-question-browser') navigate('question-browser');
    else if (action === 'open-cards-practice') { practiceCard = null; navigate('cards-practice'); }
    else if (action === 'open-roulette') { if (game.hasActiveGame()) game.completeFirstActionGuide(); closeModal(); rouletteResult = null; navigate('roulette'); }
    else if (action === 'open-guided-roulette') { game.completeFirstActionGuide(); closeModal(); rouletteResult = null; navigate('roulette'); }
    else if (action === 'roulette-back') navigate(game.hasActiveGame() ? 'game' : 'home');
    else if (action === 'draw-question') {
      var category = button.getAttribute('data-category');
      var question = game.drawQuestion(category);
      if (!question) showToast('Todas as perguntas desta categoria foram concluídas. Escolha outra categoria.', 'warning');
      else if (questionFlowMode === 'game' || modalRoot.querySelector('.question-modal')) showGameQuestionModal();
      else navigate('question');
    }
    else if (action === 'answer-question') {
      var answer = game.answerQuestion(Number(button.getAttribute('data-answer-index')));
      if (answer) {
        a11y.playSound(answer.correct ? 'correct' : 'wrong');
        a11y.announce(answer.correct ? 'Resposta correta. Agora jogue o dado.' : 'Resposta incorreta. Você permanece na mesma casa.');
        if (modalRoot.querySelector('.question-modal') || questionFlowMode === 'game') showGameQuestionModal();
        else render();
      }
    }
    else if (action === 'try-another-question') { game.tryAnotherQuestion(); if (questionFlowMode === 'game' || modalRoot.querySelector('.question-modal')) showGameQuestionHubModal(); else navigate('categories'); }
    else if (action === 'next-player-no-move') { closeModal(); questionFlowMode = null; game.endTurnWithoutMove(); navigate('game'); }
    else if (action === 'use-digital-dice') {
      closeModal();
      questionFlowMode = null;
      a11y.playSound('dice');
      game.rollDigital();
      navigate('movement');
      var dice = document.querySelector('.dice-display');
      if (dice && a11y.animationsEnabled()) dice.classList.add('rolling');
    }
    else if (action === 'open-physical-dice') { closeModal(); questionFlowMode = 'game-return'; navigate('physical-dice'); }
    else if (action === 'back-to-question') { if (questionFlowMode === 'game-return') { questionFlowMode = 'game'; navigate('game'); window.setTimeout(showGameQuestionModal, 20); } else navigate('question'); }
    else if (action === 'set-physical-dice') { a11y.playSound('dice'); game.setRoll(Number(button.getAttribute('data-dice-value'))); navigate('movement'); }
    else if (action === 'select-moving-player') { game.setMovingPlayer(Number(button.getAttribute('data-player-index'))); render(); }
    else if (action === 'confirm-movement') { applyMovementAndRoute(game.state.suggestedPosition, game.state.movingPlayer, false); }
    else if (action === 'choose-manual-position') showManualPositionModal('movement');
    else if (action === 'confirm-manual-position') {
      var input = document.getElementById('manual-position');
      var value = input ? Number(input.value) : NaN;
      var context = button.getAttribute('data-context');
      if (isNaN(value) || value < 0 || value > 41) { showToast('Informe uma casa entre 0 e 41.', 'error'); return; }
      if (value > 40) {
        closeModal();
        showModal({
          title: 'Confirmar vitória',
          body: '<p>A movimentação manual ultrapassa a casa 40. Confirmar chegada à moeda final?</p>',
          actions: '<button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="button" data-action="confirm-final-position" data-context="' + context + '">Confirmar vitória</button>'
        });
      } else {
        closeModal();
        applyMovementAndRoute(value, context === 'card' ? game.state.currentPlayer : game.state.movingPlayer, context === 'card');
      }
    }
    else if (action === 'confirm-final-position') {
      var finalContext = button.getAttribute('data-context');
      closeModal();
      applyMovementAndRoute(41, finalContext === 'card' ? game.state.currentPlayer : game.state.movingPlayer, finalContext === 'card');
    }
    else if (action === 'open-cards-game') { currentCardLayout = null; game.state.phase = 'card'; game.state.currentCardId = null; game.save(); navigate('cards'); }
    else if (action === 'draw-card') {
      var card = game.drawCard(button.getAttribute('data-card-id'));
      if (!card) { showToast('Esta carta não está mais disponível.', 'warning'); currentCardLayout = game.cardLayout(); render(); }
      else { a11y.playSound('card'); navigate('card-result'); }
    }
    else if (action === 'confirm-card-skip') { game.confirmCardEffect(); currentCardLayout = null; navigate('game'); }
    else if (action === 'ignore-card-effect') { game.completeTurn(); currentCardLayout = null; navigate('game'); }
    else if (action === 'confirm-card-move') { applyMovementAndRoute(game.state.suggestedPosition, game.state.currentPlayer, true); }
    else if (action === 'choose-card-manual-position') showManualPositionModal('card');
    else if (action === 'spin-roulette') {
      var wheel = document.getElementById('roulette-wheel');
      var selectedCategory = game.spinRoulette();
      var categoryIndex = window.TrilhasGameConstants.categories.indexOf(selectedCategory);
      rouletteRotation += 1080 + (360 - categoryIndex * 90) + 45;
      if (wheel) wheel.style.transform = 'rotate(' + rouletteRotation + 'deg)';
      a11y.playSound('roulette');
      button.disabled = true;
      window.setTimeout(function () {
        rouletteResult = selectedCategory;
        a11y.announce('Categoria sorteada: ' + categoryName(selectedCategory));
        render();
      }, a11y.animationsEnabled() ? 1450 : 20);
    }
    else if (action === 'roulette-go-category') {
      var rouletteCategory = button.getAttribute('data-category');
      var rouletteQuestion = game.drawQuestion(rouletteCategory);
      if (rouletteQuestion && game.hasActiveGame()) { questionFlowMode = 'game'; navigate('game'); window.setTimeout(showGameQuestionModal, 20); }
      else if (rouletteQuestion) navigate('question');
      else { showToast('Esta categoria foi concluída na partida. Escolha outra.', 'warning'); if (game.hasActiveGame()) { navigate('game'); window.setTimeout(showGameQuestionHubModal, 20); } else navigate('question-browser'); }
    }
    else if (action === 'select-rule') { ruleIndex = Number(button.getAttribute('data-rule-index')); render(); }
    else if (action === 'previous-rule') { ruleIndex = Math.max(0, ruleIndex - 1); render(); }
    else if (action === 'next-rule') { ruleIndex = Math.min(rules.length - 1, ruleIndex + 1); render(); }
    else if (action === 'install-app') installApp();
    else if (action === 'test-voice') a11y.speak('Leitura por voz ativada. Trilhas da Prevenção: escolhas que contam.');
    else if (action === 'reset-settings') { game.resetConfig(); a11y.updateGlobalVoiceButton(); showToast('Configurações restauradas.', 'success'); render(); }
    else if (action === 'settings-back') navigate(game.hasActiveGame() ? 'game' : 'home');
    else if (action === 'practice-question') {
      var practiceCategory = button.getAttribute('data-category');
      var pool = window.TRILHAS_QUESTIONS.filter(function (q) { return q.category === practiceCategory; });
      practiceQuestion = pool[Math.floor(Math.random() * pool.length)];
      practiceAnswer = null;
      navigate('practice-question');
    }
    else if (action === 'answer-practice') { practiceAnswer = Number(button.getAttribute('data-answer-index')); a11y.playSound(practiceAnswer === practiceQuestion.correct ? 'correct' : 'wrong'); render(); }
    else if (action === 'draw-practice-card') { practiceCard = window.TRILHAS_CARDS[Math.floor(Math.random() * window.TRILHAS_CARDS.length)]; a11y.playSound('card'); navigate('practice-card-result'); }
  }

  function handleSubmit(event) {
    if (event.target.id !== 'setup-form') return;
    event.preventDefault();
    var count = Number(document.getElementById('player-count').value);
    var names = [];
    var i;
    for (i = 1; i <= count; i += 1) {
      var input = document.getElementById('player-name-' + i);
      names.push(input && input.value.trim() ? input.value.trim() : 'Jogador ' + i);
    }
    game.createGame(names);
    currentCardLayout = null;
    a11y.preloadSounds();
    navigate('game');
    window.setTimeout(showFirstActionGuide, 80);
  }

  function handleChange(event) {
    var target = event.target;
    if (target.id === 'player-count') {
      var count = Number(target.value);
      var fields = document.querySelectorAll('[data-player-field]');
      Array.prototype.forEach.call(fields, function (field) {
        field.hidden = Number(field.getAttribute('data-player-field')) > count;
      });
      return;
    }
    var setting = target.getAttribute('data-setting');
    if (!setting) return;
    var patch = {};
    patch[setting] = target.type === 'checkbox' ? target.checked : Number(target.value);
    game.updateConfig(patch);
    if (setting === 'voiceRate') {
      var output = document.getElementById('rate-output');
      if (output) output.textContent = Number(target.value).toFixed(1) + 'x';
    }
    a11y.updateGlobalVoiceButton();
  }

  function installApp() {
    if (isInstalled()) {
      showToast('O aplicativo já está instalado.', 'success');
      return;
    }
    if (!deferredInstallPrompt) {
      showToast('A instalação não está disponível neste momento. Use o menu do Chrome e procure “Instalar aplicativo”.', 'warning');
      return;
    }
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') showToast('Instalação iniciada.', 'success');
      else showToast('Instalação cancelada.', 'warning');
      deferredInstallPrompt = null;
      render();
    });
  }

  function showResumeModal() {
    if (!game.hasActiveGame()) return;
    showModal({
      title: 'Existe uma partida em andamento',
      body: '<p>Você pode continuar de onde parou ou iniciar uma nova partida.</p>',
      actions: '<button class="btn btn-primary" type="button" data-action="resume-from-modal">Continuar partida</button><button class="btn btn-danger" type="button" data-action="new-from-modal">Nova partida</button>'
    });
  }

  document.addEventListener('click', function (event) {
    var actionButton = event.target.closest ? event.target.closest('[data-action]') : null;
    if (actionButton) {
      var action = actionButton.getAttribute('data-action');
      if (action === 'resume-from-modal') { closeModal(); resumeGameFlow(); return; }
      if (action === 'new-from-modal') { closeModal(); confirmNewGame(); return; }
    }
    handleClick(event);
  });
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', function (event) {
    if (event.target.id === 'setting-rate') handleChange(event);
  });

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (route === 'settings') render();
  });

  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    showToast('Aplicativo instalado.', 'success');
    if (route === 'settings') render();
  });

  window.addEventListener('offline', function () { showToast('Você está offline. O aplicativo continuará funcionando.', 'warning'); });
  window.addEventListener('online', function () { showToast('Conexão restabelecida.', 'success'); });

  document.addEventListener('error', function (event) {
    var target = event.target;
    if (!target || target.tagName !== 'IMG') return;
    if (target.getAttribute('src') === 'assets/images/board.jpg') {
      target.style.display = 'none';
      var stage = target.parentNode;
      if (stage && !stage.querySelector('.board-error')) {
        var warning = document.createElement('div');
        warning.className = 'board-error notice error';
        warning.textContent = 'A imagem do tabuleiro não foi carregada. Volte ao início e tente novamente.';
        stage.appendChild(warning);
      }
      showToast('A imagem do tabuleiro não foi carregada.', 'error');
    }
  }, true);

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('service-worker.js').catch(function () {
      showToast('Não foi possível ativar o modo offline. Recarregue a página em uma conexão segura.', 'warning');
    });
  }

  window.TrilhasApp = {
    navigate: navigate,
    render: render,
    showToast: showToast
  };

  render();
  registerServiceWorker();
  a11y.updateGlobalVoiceButton();
  window.setTimeout(showResumeModal, 250);
}(window, document));
