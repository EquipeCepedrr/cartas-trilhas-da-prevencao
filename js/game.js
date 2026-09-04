(function (window) {
  'use strict';

  var STORAGE_KEY = 'trilhas-prevencao-state-v1';
  var CATEGORY_ORDER = ['green', 'blue', 'yellow', 'purple'];
  var SPECIAL_SPACES = [5, 10, 15, 20, 25, 30, 35, 40];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function shuffle(list) {
    var array = list.slice();
    var i;
    for (i = array.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function randomItem(list) {
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function storageWorks() {
    try {
      var testKey = '__trilhas_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function defaultConfig() {
    return {
      voiceEnabled: true,
      voiceRate: 1,
      soundsEnabled: true,
      animationsEnabled: true
    };
  }

  function emptyState(config) {
    return {
      version: 1,
      active: false,
      players: [],
      currentPlayer: 0,
      movingPlayer: 0,
      usedQuestionIds: [],
      usedCardIds: [],
      rouletteRemaining: CATEGORY_ORDER.slice(),
      currentQuestionId: null,
      currentQuestionAnswered: false,
      currentAnswerIndex: null,
      currentCardId: null,
      currentRoll: null,
      suggestedPosition: null,
      phase: 'home',
      victory: null,
      undoSnapshot: null,
      turnStartSnapshot: null,
      notice: '',
      firstActionGuideShown: false,
      firstActionCompleted: false,
      config: config || defaultConfig(),
      updatedAt: null
    };
  }

  function normalizeState(raw) {
    var base = emptyState(defaultConfig());
    if (!raw || typeof raw !== 'object') return base;
    var state = {};
    Object.keys(base).forEach(function (key) {
      state[key] = typeof raw[key] === 'undefined' ? base[key] : raw[key];
    });
    state.config = Object.assign(defaultConfig(), raw.config || {});
    if (!Array.isArray(state.players)) state.players = [];
    if (!Array.isArray(state.usedQuestionIds)) state.usedQuestionIds = [];
    if (!Array.isArray(state.usedCardIds)) state.usedCardIds = [];
    if (!Array.isArray(state.rouletteRemaining)) state.rouletteRemaining = CATEGORY_ORDER.slice();
    state.players = state.players.slice(0, 4).map(function (player, index) {
      return {
        id: player.id || ('player-' + (index + 1)),
        name: String(player.name || ('Jogador ' + (index + 1))).slice(0, 40),
        position: Math.max(0, Math.min(41, Number(player.position) || 0)),
        skipTurns: Math.max(0, Number(player.skipTurns) || 0),
        colorIndex: typeof player.colorIndex === 'number' ? player.colorIndex : index
      };
    });
    if (state.players.length && (state.currentPlayer < 0 || state.currentPlayer >= state.players.length)) {
      state.currentPlayer = 0;
    }
    if (state.players.length && (state.movingPlayer < 0 || state.movingPlayer >= state.players.length)) {
      state.movingPlayer = state.currentPlayer;
    }
    return state;
  }

  function GameEngine() {
    this.storageAvailable = storageWorks();
    this.memoryState = emptyState(defaultConfig());
    this.state = this.load();
  }

  GameEngine.prototype.load = function () {
    if (!this.storageAvailable) return clone(this.memoryState);
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      if (!value) return emptyState(defaultConfig());
      return normalizeState(JSON.parse(value));
    } catch (error) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (ignore) {}
      return emptyState(defaultConfig());
    }
  };

  GameEngine.prototype.save = function () {
    this.state.updatedAt = new Date().toISOString();
    if (!this.storageAvailable) {
      this.memoryState = clone(this.state);
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      return true;
    } catch (error) {
      this.storageAvailable = false;
      this.memoryState = clone(this.state);
      return false;
    }
  };

  GameEngine.prototype.coreSnapshot = function () {
    var snapshot = clone(this.state);
    snapshot.undoSnapshot = null;
    snapshot.turnStartSnapshot = null;
    snapshot.notice = '';
    return snapshot;
  };

  GameEngine.prototype.beginTurn = function () {
    this.state.phase = 'turn';
    this.state.currentQuestionId = null;
    this.state.currentQuestionAnswered = false;
    this.state.currentAnswerIndex = null;
    this.state.currentCardId = null;
    this.state.currentRoll = null;
    this.state.suggestedPosition = null;
    this.state.movingPlayer = this.state.currentPlayer;
    this.state.turnStartSnapshot = this.coreSnapshot();
    this.save();
  };

  GameEngine.prototype.createGame = function (names) {
    var config = clone(this.state.config || defaultConfig());
    var cleanNames = (names || []).slice(0, 4);
    if (cleanNames.length < 2) cleanNames = ['Jogador 1', 'Jogador 2'];
    this.state = emptyState(config);
    this.state.active = true;
    this.state.players = cleanNames.map(function (name, index) {
      return {
        id: 'player-' + (index + 1),
        name: String(name || ('Jogador ' + (index + 1))).trim().slice(0, 40) || ('Jogador ' + (index + 1)),
        position: 0,
        skipTurns: 0,
        colorIndex: index
      };
    });
    this.state.currentPlayer = 0;
    this.state.movingPlayer = 0;
    this.state.notice = 'Partida iniciada. Vez de ' + this.state.players[0].name + '.';
    this.beginTurn();
    return clone(this.state);
  };

  GameEngine.prototype.markFirstActionGuideShown = function () {
    this.state.firstActionGuideShown = true;
    this.save();
  };

  GameEngine.prototype.completeFirstActionGuide = function () {
    this.state.firstActionGuideShown = true;
    this.state.firstActionCompleted = true;
    this.save();
  };

  GameEngine.prototype.clearGame = function () {
    var config = clone(this.state.config || defaultConfig());
    this.state = emptyState(config);
    this.save();
  };

  GameEngine.prototype.hasActiveGame = function () {
    return Boolean(this.state.active && this.state.players.length >= 2 && !this.state.victory);
  };

  GameEngine.prototype.current = function () {
    return this.state.players[this.state.currentPlayer] || null;
  };

  GameEngine.prototype.mover = function () {
    return this.state.players[this.state.movingPlayer] || this.current();
  };

  GameEngine.prototype.setMovingPlayer = function (index) {
    if (index >= 0 && index < this.state.players.length) {
      this.state.movingPlayer = index;
      if (this.state.currentRoll !== null) {
        this.state.suggestedPosition = this.state.players[index].position + this.state.currentRoll;
      }
      this.save();
    }
  };

  GameEngine.prototype.getCategoryForPosition = function (position) {
    var pos = Number(position) || 1;
    if (pos < 1) pos = 1;
    return CATEGORY_ORDER[(pos - 1) % CATEGORY_ORDER.length];
  };

  GameEngine.prototype.availableQuestions = function (category) {
    var used = this.state.usedQuestionIds;
    return (window.TRILHAS_QUESTIONS || []).filter(function (question) {
      return question.category === category && used.indexOf(question.id) === -1;
    });
  };

  GameEngine.prototype.drawQuestion = function (category) {
    var available = this.availableQuestions(category);
    var question = randomItem(available);
    this.state.currentQuestionId = question ? question.id : null;
    this.state.currentQuestionAnswered = false;
    this.state.currentAnswerIndex = null;
    this.state.phase = question ? 'question' : 'categories';
    this.save();
    return question ? clone(question) : null;
  };

  GameEngine.prototype.getQuestion = function () {
    var id = this.state.currentQuestionId;
    return (window.TRILHAS_QUESTIONS || []).filter(function (question) {
      return question.id === id;
    })[0] || null;
  };

  GameEngine.prototype.answerQuestion = function (answerIndex) {
    var question = this.getQuestion();
    if (!question || this.state.currentQuestionAnswered) return null;
    var correct = Number(answerIndex) === Number(question.correct);
    this.state.currentQuestionAnswered = true;
    this.state.currentAnswerIndex = Number(answerIndex);
    if (correct && this.state.usedQuestionIds.indexOf(question.id) === -1) {
      this.state.usedQuestionIds.push(question.id);
      this.state.phase = 'dice-choice';
    } else {
      this.state.phase = 'wrong-answer';
    }
    this.save();
    return { correct: correct, question: clone(question) };
  };

  GameEngine.prototype.tryAnotherQuestion = function () {
    this.state.currentQuestionId = null;
    this.state.currentQuestionAnswered = false;
    this.state.currentAnswerIndex = null;
    this.state.phase = 'categories';
    this.save();
  };

  GameEngine.prototype.setRoll = function (value) {
    var roll = Math.max(1, Math.min(6, Number(value) || 1));
    this.state.currentRoll = roll;
    this.state.movingPlayer = this.state.currentPlayer;
    this.state.suggestedPosition = this.current().position + roll;
    this.state.phase = 'movement';
    this.save();
    return roll;
  };

  GameEngine.prototype.rollDigital = function () {
    return this.setRoll(Math.floor(Math.random() * 6) + 1);
  };

  GameEngine.prototype.isSpecial = function (position) {
    return SPECIAL_SPACES.indexOf(Number(position)) !== -1;
  };

  GameEngine.prototype.markVictory = function (playerIndex) {
    var player = this.state.players[playerIndex];
    if (!player) return null;
    player.position = 41;
    this.state.victory = {
      playerIndex: playerIndex,
      playerName: player.name,
      at: new Date().toISOString()
    };
    this.state.active = false;
    this.state.phase = 'victory';
    this.state.notice = 'Parabéns! ' + player.name + ' concluiu as Trilhas da Prevenção!';
    this.save();
    return clone(this.state.victory);
  };

  GameEngine.prototype.applyMovement = function (targetPosition, options) {
    var opts = options || {};
    var playerIndex = typeof opts.playerIndex === 'number' ? opts.playerIndex : this.state.movingPlayer;
    var player = this.state.players[playerIndex];
    if (!player) return { error: 'Jogador não encontrado.' };
    var target = Math.max(0, Math.min(41, Number(targetPosition)));
    if (isNaN(target)) return { error: 'Casa inválida.' };
    player.position = target;
    this.state.suggestedPosition = target;
    this.save();

    if (target > 40) {
      return { victory: this.markVictory(playerIndex), player: clone(player) };
    }

    if (this.isSpecial(target)) {
      this.state.phase = 'card';
      this.state.currentCardId = null;
      this.save();
      return { special: true, player: clone(player), position: target };
    }

    if (opts.completeTurn !== false) {
      this.completeTurn();
      return { completed: true, player: clone(player), position: target };
    }

    return { completed: false, player: clone(player), position: target };
  };

  GameEngine.prototype.ensureCardCycle = function () {
    var allCards = window.TRILHAS_CARDS || [];
    if (this.state.usedCardIds.length >= allCards.length) {
      this.state.usedCardIds = [];
      this.save();
      return true;
    }
    return false;
  };

  GameEngine.prototype.cardLayout = function () {
    this.ensureCardCycle();
    var used = this.state.usedCardIds;
    var remaining = (window.TRILHAS_CARDS || []).filter(function (card) {
      return used.indexOf(card.id) === -1;
    }).map(function (card) { return card.id; });
    var randomized = shuffle(remaining);
    while (randomized.length < 10) randomized.push(null);
    return randomized.slice(0, 10);
  };

  GameEngine.prototype.drawCard = function (cardId) {
    var card = (window.TRILHAS_CARDS || []).filter(function (item) {
      return item.id === cardId;
    })[0] || null;
    if (!card || this.state.usedCardIds.indexOf(card.id) !== -1) return null;
    this.state.currentCardId = card.id;
    this.state.usedCardIds.push(card.id);
    this.state.phase = 'card-result';
    if (card.effect.kind === 'move') {
      this.state.suggestedPosition = Math.max(0, this.current().position + Number(card.effect.value || 0));
    } else {
      this.state.suggestedPosition = null;
    }
    this.save();
    return clone(card);
  };

  GameEngine.prototype.getCard = function () {
    var id = this.state.currentCardId;
    return (window.TRILHAS_CARDS || []).filter(function (card) {
      return card.id === id;
    })[0] || null;
  };

  GameEngine.prototype.confirmCardEffect = function (manualPosition) {
    var card = this.getCard();
    if (!card) return { error: 'Carta não encontrada.' };
    if (card.effect.kind === 'skip') {
      this.current().skipTurns += Number(card.effect.value || 1);
      this.save();
      this.completeTurn();
      return { skipped: true };
    }
    var target = typeof manualPosition === 'number' ? manualPosition : this.state.suggestedPosition;
    return this.applyMovement(target, { playerIndex: this.state.currentPlayer, completeTurn: true });
  };

  GameEngine.prototype.spinRoulette = function () {
    if (!this.state.rouletteRemaining.length) {
      this.state.rouletteRemaining = CATEGORY_ORDER.slice();
    }
    var category = randomItem(this.state.rouletteRemaining);
    var index = this.state.rouletteRemaining.indexOf(category);
    if (index !== -1) this.state.rouletteRemaining.splice(index, 1);
    this.save();
    return category;
  };

  GameEngine.prototype.completeTurn = function () {
    if (!this.state.players.length || this.state.victory) return;
    this.state.undoSnapshot = this.state.turnStartSnapshot ? clone(this.state.turnStartSnapshot) : this.coreSnapshot();

    var count = this.state.players.length;
    var next = this.state.currentPlayer;
    var skippedNames = [];
    var guard = 0;
    do {
      next = (next + 1) % count;
      guard += 1;
      if (this.state.players[next].skipTurns > 0) {
        this.state.players[next].skipTurns -= 1;
        skippedNames.push(this.state.players[next].name);
      } else {
        break;
      }
    } while (guard <= count * 2);

    this.state.currentPlayer = next;
    this.state.movingPlayer = next;
    this.state.currentQuestionId = null;
    this.state.currentQuestionAnswered = false;
    this.state.currentAnswerIndex = null;
    this.state.currentCardId = null;
    this.state.currentRoll = null;
    this.state.suggestedPosition = null;
    this.state.phase = 'turn';
    this.state.notice = skippedNames.length
      ? skippedNames.join(', ') + ' perdeu/perderam o turno. Vez de ' + this.current().name + '.'
      : 'Vez de ' + this.current().name + '.';
    this.state.turnStartSnapshot = this.coreSnapshot();
    this.save();
  };

  GameEngine.prototype.endTurnWithoutMove = function () {
    this.completeTurn();
  };

  GameEngine.prototype.canUndo = function () {
    return Boolean(this.state.undoSnapshot);
  };

  GameEngine.prototype.undoLastTurn = function () {
    if (!this.state.undoSnapshot) return false;
    var previous = normalizeState(clone(this.state.undoSnapshot));
    previous.notice = 'A última rodada foi desfeita.';
    previous.undoSnapshot = null;
    previous.turnStartSnapshot = null;
    this.state = previous;
    this.state.active = true;
    this.state.victory = null;
    this.state.turnStartSnapshot = this.coreSnapshot();
    this.save();
    return true;
  };

  GameEngine.prototype.updateConfig = function (patch) {
    this.state.config = Object.assign(defaultConfig(), this.state.config || {}, patch || {});
    this.save();
    return clone(this.state.config);
  };

  GameEngine.prototype.resetConfig = function () {
    this.state.config = defaultConfig();
    this.save();
    return clone(this.state.config);
  };

  GameEngine.prototype.categoryCounts = function () {
    var self = this;
    var result = {};
    CATEGORY_ORDER.forEach(function (category) {
      result[category] = self.availableQuestions(category).length;
    });
    return result;
  };

  GameEngine.prototype.boardCoordinates = function () {
    // Centros reais das casas na arte oficial do tabuleiro (1535 x 2048).
    // O índice 0 representa o botão verde de início e o índice 41 a moeda final.
    var size = { width: 1535, height: 2048 };
    var raw = [
      [1290, 1645],
      [1100, 1640], [920, 1630], [760, 1630], [625, 1625], [415, 1690],
      [250, 1695], [110, 1570], [100, 1430], [105, 1290], [280, 1335],
      [430, 1345], [570, 1375], [730, 1410], [900, 1425], [1060, 1420],
      [1210, 1400], [1340, 1325], [1408, 1190], [1415, 1040], [1320, 930],
      [1160, 980], [1010, 1040], [866, 1095], [730, 1160], [585, 1180],
      [435, 1210], [287, 1215], [150, 1130], [95, 995], [160, 790],
      [330, 714], [500, 738], [655, 773], [810, 820], [970, 840],
      [1135, 850], [1298, 819], [1395, 700], [1415, 520], [1390, 340],
      [1175, 155]
    ];
    return raw.map(function (point) {
      return {
        x: (point[0] / size.width) * 100,
        y: (point[1] / size.height) * 100
      };
    });
  };

  window.TrilhasGame = new GameEngine();
  window.TrilhasGameConstants = {
    categories: CATEGORY_ORDER.slice(),
    specialSpaces: SPECIAL_SPACES.slice(),
    storageKey: STORAGE_KEY
  };
}(window));
