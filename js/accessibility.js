(function (window, document) {
  'use strict';

  var soundMap = {
    correct: 'assets/audio/correct.wav',
    wrong: 'assets/audio/wrong.wav',
    dice: 'assets/audio/dice.wav',
    roulette: 'assets/audio/roulette.wav',
    move: 'assets/audio/move.wav',
    card: 'assets/audio/card.wav',
    victory: 'assets/audio/victory.wav'
  };

  var cachedAudio = {};
  var currentUtterance = null;

  function config() {
    return (window.TrilhasGame && window.TrilhasGame.state && window.TrilhasGame.state.config) || {
      voiceEnabled: true,
      voiceRate: 1,
      soundsEnabled: true,
      animationsEnabled: true
    };
  }

  function announce(message) {
    var region = document.getElementById('live-region');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(function () {
      region.textContent = String(message || '');
    }, 30);
  }

  function supportsSpeech() {
    return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  function stopSpeech() {
    if (supportsSpeech()) window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  function speak(text) {
    var settings = config();
    if (!settings.voiceEnabled) {
      announce('A leitura por voz está desativada. Ative-a nas configurações.');
      if (window.TrilhasApp && window.TrilhasApp.showToast) {
        window.TrilhasApp.showToast('A leitura por voz está desativada. Ative-a nas configurações.', 'warning');
      }
      return false;
    }
    if (!supportsSpeech()) {
      announce('A leitura por voz não é suportada neste aparelho.');
      if (window.TrilhasApp && window.TrilhasApp.showToast) {
        window.TrilhasApp.showToast('A leitura por voz não é suportada neste aparelho.', 'warning');
      }
      return false;
    }
    stopSpeech();
    var cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return false;
    var utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = Math.max(0.6, Math.min(1.6, Number(settings.voiceRate) || 1));
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = function () { currentUtterance = null; };
    utterance.onerror = function () {
      currentUtterance = null;
      announce('Não foi possível concluir a leitura por voz.');
    };
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function loadSound(name) {
    if (!soundMap[name]) return null;
    if (!cachedAudio[name]) {
      var audio = new Audio(soundMap[name]);
      audio.preload = 'auto';
      cachedAudio[name] = audio;
    }
    return cachedAudio[name];
  }

  function playSound(name) {
    if (!config().soundsEnabled) return;
    var audio = loadSound(name);
    if (!audio) return;
    try {
      audio.currentTime = 0;
      var playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(function () {
          announce('O navegador bloqueou o áudio. Toque novamente após interagir com a tela.');
        });
      }
    } catch (error) {
      announce('Não foi possível reproduzir o efeito sonoro.');
    }
  }

  function animationsEnabled() {
    var mediaReduced = false;
    try {
      mediaReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (ignore) {}
    return Boolean(config().animationsEnabled && !mediaReduced);
  }

  function updateGlobalVoiceButton() {
    var button = document.getElementById('global-voice-button');
    if (!button) return;
    var enabled = Boolean(config().voiceEnabled);
    button.classList.toggle('is-off', !enabled);
    button.setAttribute('aria-label', enabled ? 'Leitura por voz ativada. Abrir configurações.' : 'Leitura por voz desativada. Abrir configurações.');
    button.setAttribute('title', enabled ? 'Leitura por voz ativada' : 'Leitura por voz desativada');
    button.innerHTML = enabled
      ? '<span aria-hidden="true">🔊</span><span class="voice-status">Voz ativa</span>'
      : '<span aria-hidden="true">🔇</span><span class="voice-status">Voz inativa</span>';
  }

  function readableTextFrom(element) {
    if (!element) return '';
    return element.getAttribute('data-speech-text') || element.innerText || element.textContent || '';
  }

  function bindDelegatedSpeech() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-read-target], [data-read-text]') : null;
      if (!button) return;
      var explicit = button.getAttribute('data-read-text');
      if (explicit) {
        speak(explicit);
        return;
      }
      var selector = button.getAttribute('data-read-target');
      if (!selector) return;
      var target = document.querySelector(selector);
      speak(readableTextFrom(target));
    });
  }

  function preloadSounds() {
    Object.keys(soundMap).forEach(loadSound);
  }

  bindDelegatedSpeech();

  window.TrilhasA11y = {
    announce: announce,
    speak: speak,
    stopSpeech: stopSpeech,
    supportsSpeech: supportsSpeech,
    playSound: playSound,
    preloadSounds: preloadSounds,
    animationsEnabled: animationsEnabled,
    updateGlobalVoiceButton: updateGlobalVoiceButton
  };
}(window, document));
