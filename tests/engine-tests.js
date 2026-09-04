'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

function createContext(sharedStorage) {
  const store = sharedStorage || {};
  const localStorage = {
    setItem(key, value) { store[key] = String(value); },
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    removeItem(key) { delete store[key]; }
  };
  const context = {
    window: {},
    localStorage,
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    isNaN,
    setTimeout,
    clearTimeout
  };
  context.window.window = context.window;
  context.window.localStorage = localStorage;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/questions.js'), 'utf8'), context, { filename: 'questions.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game.js'), 'utf8'), context, { filename: 'game.js' });
  return { context, game: context.window.TrilhasGame, store };
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed += 1;
  } catch (error) {
    console.error('✗', name, '-', error.message);
    failed += 1;
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Falha de asserção');
}

const shared = {};
let env = createContext(shared);
let game = env.game;
const questions = env.context.window.TRILHAS_QUESTIONS;
const cards = env.context.window.TRILHAS_CARDS;

test('Banco contém 50 perguntas do PDF oficial', () => assert(questions.length === 50));
test('Categorias oficiais foram importadas com as quantidades esperadas', () => {
  const expected = { green: 12, blue: 16, yellow: 11, purple: 11 };
  Object.keys(expected).forEach(category => {
    assert(questions.filter(q => q.category === category).length === expected[category], category);
  });
});
test('Perguntas têm IDs únicos e resposta válida', () => {
  assert(new Set(questions.map(q => q.id)).size === questions.length, 'IDs repetidos');
  questions.forEach(q => {
    assert(q.options.length >= 2 && q.options.length <= 4, q.id + ' com quantidade inválida de alternativas');
    assert(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.id + ' resposta inválida');
  });
});
test('Banco contém 10 cartas, cinco de cada tipo', () => {
  assert(cards.length === 10);
  assert(cards.filter(c => c.type === 'autonomia').length === 5);
  assert(cards.filter(c => c.type === 'armadilha').length === 5);
});

test('Cria partidas com 2, 3 e 4 jogadores', () => {
  [2,3,4].forEach(count => {
    game.createGame(Array.from({length: count}, (_,i) => 'J' + (i+1)));
    assert(game.state.players.length === count, String(count));
    assert(game.state.currentPlayer === 0);
  });
});

test('Nova partida inicia com orientação visual pendente', () => {
  game.createGame(['A','B']);
  assert(game.state.firstActionGuideShown === false);
  assert(game.state.firstActionCompleted === false);
  game.markFirstActionGuideShown();
  assert(game.state.firstActionGuideShown === true);
  game.completeFirstActionGuide();
  assert(game.state.firstActionCompleted === true);
});

test('Tabuleiro possui coordenadas reais para início, 40 casas e chegada', () => {
  const coords = game.boardCoordinates();
  assert(coords.length === 42, 'Quantidade de coordenadas: ' + coords.length);
  coords.forEach((point, index) => {
    assert(point.x >= 0 && point.x <= 100, 'x inválido em ' + index);
    assert(point.y >= 0 && point.y <= 100, 'y inválido em ' + index);
  });
  assert(coords[1].x > 65 && coords[1].y > 75, 'Casa 1 fora da região inferior direita');
  assert(coords[6].x < 20 && coords[6].y > 75, 'Casa 6 fora da região inferior esquerda');
  assert(coords[20].x > 80 && coords[20].y > 40 && coords[20].y < 50, 'Casa 20 fora da curva direita');
  assert(coords[40].x > 85 && coords[40].y < 20, 'Casa 40 fora da região superior direita');
});

test('Resposta errada não retira pergunta do banco', () => {
  game.createGame(['A','B']);
  const q = game.drawQuestion('green');
  const wrong = (q.correct + 1) % q.options.length;
  const result = game.answerQuestion(wrong);
  assert(result.correct === false);
  assert(!game.state.usedQuestionIds.includes(q.id));
});

test('Resposta correta retira pergunta do banco', () => {
  game.createGame(['A','B']);
  const q = game.drawQuestion('blue');
  const result = game.answerQuestion(q.correct);
  assert(result.correct === true);
  assert(game.state.usedQuestionIds.includes(q.id));
  assert(!game.availableQuestions('blue').some(item => item.id === q.id));
});

test('Categoria esgotada não reinicia automaticamente', () => {
  game.createGame(['A','B']);
  const ids = questions.filter(q => q.category === 'yellow').map(q => q.id);
  game.state.usedQuestionIds = ids.slice();
  game.save();
  assert(game.availableQuestions('yellow').length === 0);
  assert(game.drawQuestion('yellow') === null);
});

test('Dado digital gera apenas valores entre 1 e 6', () => {
  game.createGame(['A','B']);
  for (let i=0;i<100;i+=1) {
    const value = game.rollDigital();
    assert(value >= 1 && value <= 6, String(value));
  }
});

test('Dado físico limita valor para 1 a 6', () => {
  game.createGame(['A','B']);
  assert(game.setRoll(0) === 1);
  assert(game.setRoll(9) === 6);
  assert(game.setRoll(4) === 4);
});

test('Movimento normal conclui turno', () => {
  game.createGame(['A','B']);
  game.setRoll(3);
  const result = game.applyMovement(3, {playerIndex: 0, completeTurn: true});
  assert(result.completed === true);
  assert(game.state.players[0].position === 3);
  assert(game.state.currentPlayer === 1);
});

test('Casas especiais abrem cartas', () => {
  game.createGame(['A','B']);
  [5,10,15,20,25,30,35,40].forEach(position => {
    game.state.players[0].position = 0;
    game.state.currentPlayer = 0;
    game.state.movingPlayer = 0;
    const result = game.applyMovement(position, {playerIndex: 0, completeTurn: true});
    assert(result.special === true, String(position));
    assert(game.state.phase === 'card');
  });
});

test('Ultrapassar casa 40 gera vitória', () => {
  game.createGame(['A','B']);
  game.state.players[0].position = 39;
  const result = game.applyMovement(41, {playerIndex: 0, completeTurn: true});
  assert(Boolean(result.victory));
  assert(game.state.players[0].position === 41);
  assert(game.state.active === false);
});

test('Parar exatamente na casa 40 não gera vitória imediata', () => {
  game.createGame(['A','B']);
  game.state.players[0].position = 39;
  const result = game.applyMovement(40, {playerIndex: 0, completeTurn: true});
  assert(result.special === true);
  assert(!game.state.victory);
});

test('Carta utilizada sai do ciclo', () => {
  game.createGame(['A','B']);
  game.applyMovement(5, {playerIndex:0, completeTurn:true});
  const layout = game.cardLayout();
  const id = layout.find(Boolean);
  const card = game.drawCard(id);
  assert(card && card.id === id);
  assert(game.state.usedCardIds.includes(id));
  assert(!game.cardLayout().includes(id));
});

test('Cartas são restauradas depois das dez', () => {
  game.createGame(['A','B']);
  game.state.usedCardIds = cards.map(c => c.id);
  const reset = game.ensureCardCycle();
  assert(reset === true);
  assert(game.state.usedCardIds.length === 0);
  assert(game.cardLayout().filter(Boolean).length === 10);
});

test('Penalidade pula o próximo turno do jogador', () => {
  game.createGame(['A','B']);
  game.state.players[1].skipTurns = 1;
  game.completeTurn();
  assert(game.state.players[1].skipTurns === 0);
  assert(game.state.currentPlayer === 0);
});

test('Roleta não repete categoria no ciclo', () => {
  game.createGame(['A','B']);
  game.state.rouletteRemaining = ['green','blue','yellow','purple'];
  const results = [game.spinRoulette(), game.spinRoulette(), game.spinRoulette(), game.spinRoulette()];
  assert(new Set(results).size === 4, results.join(','));
  assert(game.state.rouletteRemaining.length === 0);
  game.spinRoulette();
  assert(game.state.rouletteRemaining.length === 3);
});

test('Refazer restaura a última rodada concluída', () => {
  game.createGame(['A','B']);
  game.setRoll(3);
  game.applyMovement(3, {playerIndex:0, completeTurn:true});
  assert(game.state.players[0].position === 3);
  assert(game.state.currentPlayer === 1);
  assert(game.canUndo());
  assert(game.undoLastTurn());
  assert(game.state.players[0].position === 0);
  assert(game.state.currentPlayer === 0);
  assert(!game.canUndo());
});

test('Nova partida restaura perguntas, cartas, roleta e penalidades', () => {
  game.createGame(['A','B']);
  game.state.usedQuestionIds = ['g01'];
  game.state.usedCardIds = ['a01'];
  game.state.rouletteRemaining = ['green'];
  game.state.players[0].skipTurns = 1;
  game.createGame(['A','B']);
  assert(game.state.usedQuestionIds.length === 0);
  assert(game.state.usedCardIds.length === 0);
  assert(game.state.rouletteRemaining.length === 4);
  assert(game.state.players.every(p => p.skipTurns === 0 && p.position === 0));
});

test('Configurações sobrevivem à nova partida', () => {
  game.updateConfig({voiceEnabled:false, voiceRate:1.4, soundsEnabled:false});
  game.createGame(['A','B']);
  assert(game.state.config.voiceEnabled === false);
  assert(game.state.config.voiceRate === 1.4);
  assert(game.state.config.soundsEnabled === false);
});

test('Persistência recupera partida em novo carregamento', () => {
  game.createGame(['Persistente A','Persistente B']);
  game.state.players[0].position = 17;
  game.save();
  const second = createContext(shared).game;
  assert(second.state.players[0].position === 17);
  assert(second.state.players[0].name === 'Persistente A');
  assert(second.hasActiveGame());
});

console.log(`\nResultado: ${passed} aprovado(s), ${failed} falha(s).`);
if (failed) process.exit(1);
