/**
 * GAROZO! Party Game — Controlador Principal de Interfaz (js/app.js)
 * Conecta el motor de estado (state.js), el motor de audio (audio.js)
 * y el director de animaciones (animations.js) con el DOM.
 */

import { GarozoStateEngine, GAME_STATES, PLAYER_PALETTES } from './state.js';
import { GarozoAudioEngine } from './audio.js';
import { GarozoAnimationDirector } from './animations.js';

export function initGarozoApp(customAssetsMap = null) {
  const defaultAssets = {
    masita_idle: 'assets/sprites/masita_idle.png',
    masita_run: 'assets/sprites/masita_run.png',
    masita_point: 'assets/sprites/masita_point.png',
    panic_dead: 'assets/sprites/panic_dead.png',
    masita_happy: 'assets/sprites/masita_happy.png',
    masita_nervous: 'assets/sprites/masita_nervous.png',
    masita_trumpet: 'assets/sprites/masita_trumpet.png',
    panic_scream: 'assets/sprites/panic_scream.png',
    panic_fall: 'assets/sprites/panic_fall.png',
    panic_crash: 'assets/sprites/panic_crash.png',
    panic_dizzy: 'assets/sprites/panic_dizzy.png',
    banner_garozo: 'assets/sprites/banner_garozo.png',
    banner_win: 'assets/sprites/banner_win.png',
    logo_garozo: 'assets/sprites/logo_garozo.png',
    icon_bag: 'assets/sprites/icon_bag.png',
    fx_dust: 'assets/sprites/fx_dust.png',
    fx_sweat: 'assets/sprites/fx_sweat.png',
    face_1: 'assets/sprites/dice/face_1.png',
    face_2: 'assets/sprites/dice/face_2.png',
    face_3: 'assets/sprites/dice/face_3.png',
    face_4: 'assets/sprites/dice/face_4.png',
    face_5: 'assets/sprites/dice/face_5.png',
    face_6: 'assets/sprites/dice/face_6.png',
  };

  const assets = customAssetsMap || window.GAROZO_EMBEDDED_ASSETS || defaultAssets;

  const dom = {
    appShell: document.getElementById('appShell'),
    btnAudioToggle: document.getElementById('btnAudioToggle'),
    btnOpenSetup: document.getElementById('btnOpenSetup'),
    targetScoreLabel: document.getElementById('targetScoreLabel'),
    turnStatusHint: document.getElementById('turnStatusHint'),
    carouselPrev: document.getElementById('carouselPrev'),
    carouselNext: document.getElementById('carouselNext'),
    playersCarousel: document.getElementById('playersCarousel'),
    turnPointsEl: document.getElementById('turnPointsValue'),
    streakCounterLabel: document.getElementById('streakCounterLabel'),
    greedWedgeBar: document.getElementById('greedWedgeBar'),
    greedQuestionText: document.getElementById('greedQuestionText'),
    stageShoutLabel: document.getElementById('stageShoutLabel'),
    diceStageSlot: document.getElementById('diceStageSlot'),
    diceScene: document.getElementById('diceScene'),
    diceCube: document.getElementById('diceCube'),
    diceShadow: document.getElementById('diceShadow'),
    hostImg: document.getElementById('hostMasitaImg'),
    hostDust: document.getElementById('hostFxDust'),
    hostSweat: document.getElementById('hostFxSweat'),
    btnRoll: document.getElementById('btnRollDice'),
    btnBank: document.getElementById('btnBankScore'),
    bankPointsBadge: document.getElementById('bankPointsBadge'),

    // Overlay Garozo
    garozoOverlay: document.getElementById('garozoOverlay'),
    garozoBanner: document.getElementById('garozoBannerImg'),
    garozoSubtitle: document.getElementById('garozoSubtitle'),
    stampedeLane: document.getElementById('stampedeLane'),

    // Overlay Victoria
    winOverlay: document.getElementById('winOverlay'),
    winParadeStage: document.getElementById('winParadeStage'),
    winnerNameText: document.getElementById('winnerNameText'),
    winnerScoreText: document.getElementById('winnerScoreText'),
    standingsList: document.getElementById('standingsList'),
    btnRematch: document.getElementById('btnRematch'),
    btnNewSetupFromWin: document.getElementById('btnNewSetupFromWin'),

    // Modal Configuración
    setupModal: document.getElementById('setupModal'),
    playersSetupList: document.getElementById('playersSetupList'),
    btnAddPlayer: document.getElementById('btnAddPlayer'),
    customTargetInput: document.getElementById('customTargetInput'),
    btnStartConfiguredGame: document.getElementById('btnStartConfiguredGame'),
    btnCloseSetup: document.getElementById('btnCloseSetup'),
  };

  const stateEngine = new GarozoStateEngine();
  const audioEngine = new GarozoAudioEngine();
  const animDirector = new GarozoAnimationDirector(dom, assets);

  // Estado temporal del formulario de configuración
  let setupDraftPlayers = ['JUAN', 'ANA', 'MATEO'];
  let setupDraftTarget = 100;

  // Renderizar anillas superiores de la libreta
  const ringsContainer = document.getElementById('notebookRings');
  if (ringsContainer && ringsContainer.children.length === 0) {
    for (let i = 0; i < 11; i++) {
      const ring = document.createElement('div');
      ring.className = 'ring-loop';
      ring.innerHTML = '<span class="ring-hole"></span>';
      ringsContainer.appendChild(ring);
    }
  }

  function syncAudioButtonUI() {
    if (!dom.btnAudioToggle) return;
    if (audioEngine.isMuted) {
      dom.btnAudioToggle.textContent = '🔇 Mudo';
      dom.btnAudioToggle.classList.add('is-muted');
    } else {
      dom.btnAudioToggle.textContent = '🔊 Sonido';
      dom.btnAudioToggle.classList.remove('is-muted');
    }
  }

  /**
   * Renderiza el carrusel superior de tarjetas de jugadores
   */
  function renderScoreboard(snapshot) {
    if (!dom.playersCarousel) return;
    dom.playersCarousel.innerHTML = '';

    snapshot.players.forEach((player, idx) => {
      const isActive = idx === snapshot.currentPlayerIndex;
      const card = document.createElement('div');
      card.className = `player-card ${isActive ? 'is-active boil-effect' : ''}`;
      card.dataset.playerIndex = String(idx);

      if (!isActive) {
        card.style.backgroundColor = '#fdfaf1';
      }

      const projected = player.savedScore + (isActive ? snapshot.turnScore : 0);
      const formulaHtml =
        isActive && snapshot.turnScore > 0
          ? `<div class="player-live-formula">${player.savedScore} + ${snapshot.turnScore} = <strong>${projected}</strong></div>`
          : `<div class="player-live-formula">Meta: ${Math.min(100, Math.round((player.savedScore / snapshot.targetScore) * 100))}%</div>`;

      card.innerHTML = `
        <div class="player-avatar-box" style="background:${player.palette.tint}">
          <img src="${assets.masita_idle}" alt="${player.name}">
        </div>
        <div class="player-name">${player.name}</div>
        <div class="player-score-main">${player.savedScore}</div>
        ${formulaHtml}
        ${
          isActive
            ? `<img class="active-mini-masita" src="${assets.masita_point}" alt="Turno">
               <span class="active-turn-badge">¡TURNO!</span>`
            : ''
        }
      `;

      dom.playersCarousel.appendChild(card);

      if (isActive) {
        requestAnimationFrame(() => {
          card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
      }
    });
  }

  /**
   * Actualiza el medidor de codicia, los puntos provisionales y el estado de los botones
   */
  function renderArenaAndControls(snapshot, popScore = false) {
    if (dom.targetScoreLabel) {
      dom.targetScoreLabel.textContent = `META: ${snapshot.targetScore} PTS`;
    }

    if (dom.turnStatusHint && snapshot.currentPlayer) {
      dom.turnStatusHint.textContent = `Turno de ${snapshot.currentPlayer.name}`;
    }

    if (dom.turnPointsEl) {
      dom.turnPointsEl.textContent = String(snapshot.turnScore);
      if (popScore) {
        dom.turnPointsEl.classList.remove('pop-anim');
        void dom.turnPointsEl.offsetWidth;
        dom.turnPointsEl.classList.add('pop-anim');
      }
    }

    if (dom.streakCounterLabel) {
      dom.streakCounterLabel.textContent =
        snapshot.rollStreak > 0 ? `Racha: ${snapshot.rollStreak}x 🔥` : 'Sin riesgo aún';
    }

    // Actualizar los 6 segmentos en cuña del medidor de codicia
    if (dom.greedWedgeBar) {
      const segments = dom.greedWedgeBar.querySelectorAll('.greed-segment');
      segments.forEach((seg, idx) => {
        seg.classList.remove('is-filled', 'is-danger');
        if (idx < snapshot.rollStreak) {
          seg.classList.add(snapshot.rollStreak >= 4 ? 'is-danger' : 'is-filled');
        }
      });
      dom.greedWedgeBar.classList.toggle('high-streak', snapshot.rollStreak >= 3);
    }

    if (dom.greedQuestionText) {
      if (snapshot.turnScore === 0) {
        dom.greedQuestionText.textContent = '¡Tira el dado para estrenar el turno!';
        dom.greedQuestionText.classList.remove('is-high-risk');
      } else if (snapshot.rollStreak >= 3) {
        dom.greedQuestionText.textContent = '⚠️ ¡Racha alta! ¿OTRA o PLANTAS?';
        dom.greedQuestionText.classList.add('is-high-risk');
      } else {
        dom.greedQuestionText.textContent = '+ ¿OTRA? o ¿PLANTAS?';
        dom.greedQuestionText.classList.remove('is-high-risk');
      }
    }

    const canAct = snapshot.state === GAME_STATES.PLAYER_TURN;
    if (dom.btnRoll) {
      dom.btnRoll.disabled = !canAct;
    }
    if (dom.btnBank) {
      const canBank = canAct && snapshot.turnScore > 0;
      dom.btnBank.disabled = !canBank;
      dom.btnBank.classList.toggle('can-bank', canBank);
    }
    if (dom.bankPointsBadge) {
      dom.bankPointsBadge.textContent =
        snapshot.turnScore > 0 ? `+${snapshot.turnScore} PTS` : '0 PTS';
    }
  }

  /**
   * Suscripciones a los eventos del Motor de Estado
   */
  stateEngine.on('onTurnChange', (_payload, snapshot) => {
    animDirector.updateHostMood(0);
    if (dom.stageShoutLabel && snapshot.currentPlayer) {
      dom.stageShoutLabel.textContent = `¡¡VAMOS ${snapshot.currentPlayer.name}!!`;
    }
    renderScoreboard(snapshot);
    renderArenaAndControls(snapshot);
  });

  stateEngine.on('onRoll', ({ value }, snapshot) => {
    renderArenaAndControls(snapshot);
    if (dom.stageShoutLabel) {
      dom.stageShoutLabel.textContent = '¡¡TIRAR!!';
    }

    audioEngine.playRunAndKick();
    audioEngine.playDiceBounce();

    animDirector.playRollSequence(value, () => {
      stateEngine.resolveRollOutcome();
      const afterSnap = stateEngine.getSnapshot();

      if (afterSnap.state === GAME_STATES.PLAYER_TURN) {
        // Sumó entre 2 y 6 puntos sin ganar aún
        audioEngine.playScorePoints(afterSnap.rollStreak);
        if (dom.stageShoutLabel) {
          dom.stageShoutLabel.textContent = `¡+${value} PUNTOS!`;
        }
        animDirector.updateHostMood(afterSnap.rollStreak);
        renderScoreboard(afterSnap);
        renderArenaAndControls(afterSnap, true);
      }
    });
  });

  stateEngine.on('onGarozo', ({ lostPoints }, snapshot) => {
    renderScoreboard(snapshot);
    renderArenaAndControls(snapshot);
    if (dom.stageShoutLabel) {
      dom.stageShoutLabel.textContent = '¡¡GAROZOOO!! 😱';
    }

    audioEngine.playGarozo();
    animDirector.playGarozoStampede(lostPoints, () => {
      stateEngine.advanceTurn();
    });
  });

  stateEngine.on('onBank', ({ bankedPoints }, snapshot) => {
    audioEngine.playBank();
    if (dom.stageShoutLabel) {
      dom.stageShoutLabel.textContent = `¡GUARDÓ +${bankedPoints}!`;
    }

    const activeCard = dom.playersCarousel
      ? dom.playersCarousel.querySelector('.player-card.is-active')
      : null;

    renderArenaAndControls(snapshot);

    animDirector.playBankSequence(bankedPoints, activeCard, () => {
      renderScoreboard(stateEngine.getSnapshot());
      if (stateEngine.state !== GAME_STATES.GAME_OVER) {
        stateEngine.advanceTurn();
      }
    });
  });

  stateEngine.on('onWin', ({ winner, finalScore, standings }, snapshot) => {
    renderScoreboard(snapshot);
    renderArenaAndControls(snapshot);
    audioEngine.playWinFanfare();

    if (dom.winnerNameText) dom.winnerNameText.textContent = winner.name;
    if (dom.winnerScoreText) {
      dom.winnerScoreText.textContent = `${finalScore} PTS (Meta: ${snapshot.targetScore})`;
    }

    if (dom.standingsList) {
      dom.standingsList.innerHTML = standings
        .map(
          (p, i) => `
          <div class="standing-row ${i === 0 ? 'is-first' : ''}">
            <span>${i === 0 ? '🏆' : `#${i + 1}`} ${p.name}</span>
            <span>${p.savedScore} pts <small>(Garozos: ${p.garozos})</small></span>
          </div>
        `
        )
        .join('');
    }

    animDirector.spawnWinConfetti(dom.winParadeStage);
    if (dom.winOverlay) {
      dom.winOverlay.classList.add('is-visible');
    }
  });

  /**
   * Acciones de usuario: Tirar dado y Plantarse
   */
  function handleRollAction() {
    if (stateEngine.state !== GAME_STATES.PLAYER_TURN) return;
    stateEngine.requestRoll();
  }

  function handleBankAction() {
    if (stateEngine.state !== GAME_STATES.PLAYER_TURN || stateEngine.turnScore <= 0) return;
    stateEngine.requestBank();
  }

  if (dom.btnRoll) dom.btnRoll.addEventListener('click', handleRollAction);
  if (dom.diceStageSlot) dom.diceStageSlot.addEventListener('click', handleRollAction);
  if (dom.btnBank) dom.btnBank.addEventListener('click', handleBankAction);

  // Atajos de teclado para PC (Espacio/Enter = Tirar, P/B = Plantarse)
  window.addEventListener('keydown', (e) => {
    if (
      dom.setupModal?.classList.contains('is-visible') ||
      dom.winOverlay?.classList.contains('is-visible')
    ) {
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      handleRollAction();
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      handleBankAction();
    }
  });

  // Navegación del carrusel de jugadores
  if (dom.carouselPrev) {
    dom.carouselPrev.addEventListener('click', () => {
      dom.playersCarousel?.scrollBy({ left: -140, behavior: 'smooth' });
    });
  }
  if (dom.carouselNext) {
    dom.carouselNext.addEventListener('click', () => {
      dom.playersCarousel?.scrollBy({ left: 140, behavior: 'smooth' });
    });
  }

  // Botón de Sonido / Mute
  if (dom.btnAudioToggle) {
    syncAudioButtonUI();
    dom.btnAudioToggle.addEventListener('click', () => {
      audioEngine.toggleMute();
      syncAudioButtonUI();
    });
  }

  /**
   * Modal de Configuración de Partida (2 a 8 jugadores y meta de puntos)
   */
  function renderSetupModalPlayers() {
    if (!dom.playersSetupList) return;
    dom.playersSetupList.innerHTML = '';

    setupDraftPlayers.forEach((name, idx) => {
      const palette = PLAYER_PALETTES[idx % PLAYER_PALETTES.length];
      const row = document.createElement('div');
      row.className = 'player-setup-row';
      row.innerHTML = `
        <span class="player-color-dot" style="background:${palette.tint}"></span>
        <input
          type="text"
          class="sketch-input player-name-input"
          maxlength="12"
          value="${name}"
          placeholder="Jugador ${idx + 1}"
          data-idx="${idx}"
        >
        ${
          setupDraftPlayers.length > 2
            ? `<button type="button" class="remove-player-btn" data-remove="${idx}" title="Eliminar">✕</button>`
            : ''
        }
      `;
      dom.playersSetupList.appendChild(row);
    });

    dom.playersSetupList.querySelectorAll('.player-name-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const i = Number(e.target.dataset.idx);
        setupDraftPlayers[i] = e.target.value;
      });
    });

    dom.playersSetupList.querySelectorAll('.remove-player-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.currentTarget.dataset.remove);
        if (setupDraftPlayers.length > 2) {
          setupDraftPlayers.splice(i, 1);
          renderSetupModalPlayers();
        }
      });
    });

    if (dom.btnAddPlayer) {
      dom.btnAddPlayer.disabled = setupDraftPlayers.length >= 8;
      dom.btnAddPlayer.textContent =
        setupDraftPlayers.length >= 8
          ? 'Máximo 8 jugadores'
          : `+ Añadir Jugador (${setupDraftPlayers.length}/8)`;
    }
  }

  function openSetupModal() {
    setupDraftPlayers = stateEngine.players.map((p) => p.name);
    setupDraftTarget = stateEngine.targetScore;
    if (dom.customTargetInput) dom.customTargetInput.value = String(setupDraftTarget);

    document.querySelectorAll('.target-preset-btn').forEach((btn) => {
      btn.classList.toggle('is-selected', Number(btn.dataset.target) === setupDraftTarget);
    });

    renderSetupModalPlayers();
    dom.setupModal?.classList.add('is-visible');
  }

  if (dom.btnOpenSetup) {
    dom.btnOpenSetup.addEventListener('click', openSetupModal);
  }
  if (dom.btnCloseSetup) {
    dom.btnCloseSetup.addEventListener('click', () => {
      dom.setupModal?.classList.remove('is-visible');
    });
  }
  if (dom.btnAddPlayer) {
    const defaultExtras = ['SOFÍA', 'LUCAS', 'VALERIA', 'DIEGO', 'CAMILA', 'TOMÁS'];
    dom.btnAddPlayer.addEventListener('click', () => {
      if (setupDraftPlayers.length < 8) {
        const nextName =
          defaultExtras[setupDraftPlayers.length - 2] || `JUGADOR ${setupDraftPlayers.length + 1}`;
        setupDraftPlayers.push(nextName);
        renderSetupModalPlayers();
      }
    });
  }

  document.querySelectorAll('.target-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setupDraftTarget = Number(btn.dataset.target) || 100;
      if (dom.customTargetInput) dom.customTargetInput.value = String(setupDraftTarget);
      document.querySelectorAll('.target-preset-btn').forEach((b) => {
        b.classList.toggle('is-selected', b === btn);
      });
    });
  });

  if (dom.customTargetInput) {
    dom.customTargetInput.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val >= 10) {
        setupDraftTarget = val;
        document.querySelectorAll('.target-preset-btn').forEach((b) => {
          b.classList.toggle('is-selected', Number(b.dataset.target) === val);
        });
      }
    });
  }

  if (dom.btnStartConfiguredGame) {
    dom.btnStartConfiguredGame.addEventListener('click', () => {
      audioEngine.unlock();
      dom.setupModal?.classList.remove('is-visible');
      dom.winOverlay?.classList.remove('is-visible');
      stateEngine.startNewGame({
        playerNames: setupDraftPlayers,
        targetScore: setupDraftTarget,
      });
    });
  }

  // Botones de Victoria: Revancha y Nueva Partida
  if (dom.btnRematch) {
    dom.btnRematch.addEventListener('click', () => {
      dom.winOverlay?.classList.remove('is-visible');
      stateEngine.rematch();
    });
  }
  if (dom.btnNewSetupFromWin) {
    dom.btnNewSetupFromWin.addEventListener('click', () => {
      dom.winOverlay?.classList.remove('is-visible');
      openSetupModal();
    });
  }

  // Iniciar partida por defecto con JUAN, ANA y MATEO a 100 puntos
  stateEngine.startNewGame({
    playerNames: ['JUAN', 'ANA', 'MATEO'],
    targetScore: 100,
  });

  // Exponer instancia global para pruebas automatizadas e inspección
  window.GAROZO_GAME = {
    stateEngine,
    audioEngine,
    animDirector,
  };

  return window.GAROZO_GAME;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initGarozoApp());
  } else {
    initGarozoApp();
  }
}
