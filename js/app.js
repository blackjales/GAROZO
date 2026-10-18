/**
 * GAROZO! Party Game — Controlador Principal de Interfaz y Flujo Inicial (js/app.js)
 * Conecta:
 * - El nuevo flujo de entrada (Hub Principal -> ¿Cómo se juega? / Configura tu partida -> ¡Listo para jugar! -> Juego).
 * - El motor de estado existente (state.js), el motor de audio (audio.js) y el director de animaciones (animations.js).
 */

import {
  GarozoStateEngine,
  GAME_STATES,
  PLAYER_PALETTES,
  normalizePlayerNames,
  sanitizeTargetScore,
} from './state.js';
import { GarozoAudioEngine } from './audio.js';
import { GarozoAnimationDirector } from './animations.js';

export function initGarozoApp(customAssetsMap = null) {
  const defaultAssets = {
    masita_hub_dice: 'assets/sprites/masita_hub_dice.png',
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

    // Pantallas del flujo
    screenHub: document.getElementById('screenHub'),
    screenRules: document.getElementById('screenRules'),
    screenSetup: document.getElementById('screenSetup'),
    screenConfirm: document.getElementById('screenConfirm'),
    screenGame: document.getElementById('screenGame'),

    // Hub Principal
    btnHubSettings: document.getElementById('btnHubSettings'),
    btnHubAudio: document.getElementById('btnHubAudio'),
    hubAudioIconLabel: document.getElementById('hubAudioIconLabel'),
    btnHubPlay: document.getElementById('btnHubPlay'),
    btnHubRules: document.getElementById('btnHubRules'),

    // Modal discreto de Ajustes
    hubSettingsModal: document.getElementById('hubSettingsModal'),
    btnSettingsAudioToggle: document.getElementById('btnSettingsAudioToggle'),
    btnSettingsOpenRules: document.getElementById('btnSettingsOpenRules'),
    btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),

    // Pantalla ¿Cómo se juega?
    btnRulesBackTop: document.getElementById('btnRulesBackTop'),
    btnRulesBackBottom: document.getElementById('btnRulesBackBottom'),
    btnRulesPlay: document.getElementById('btnRulesPlay'),

    // Pantalla Configura tu partida
    btnSetupBack: document.getElementById('btnSetupBack'),
    btnTargetMinus: document.getElementById('btnTargetMinus'),
    btnTargetPlus: document.getElementById('btnTargetPlus'),
    setupTargetDisplay: document.getElementById('setupTargetDisplay'),
    btnPresetCustom: document.getElementById('btnPresetCustom'),
    customTargetDrawer: document.getElementById('customTargetDrawer'),
    customTargetInput: document.getElementById('customTargetInput'),
    setupPlayerCountBadge: document.getElementById('setupPlayerCountBadge'),
    playersSetupList: document.getElementById('playersSetupList'),
    btnAddPlayer: document.getElementById('btnAddPlayer'),
    setupPlayersHint: document.getElementById('setupPlayersHint'),
    btnSetupContinue: document.getElementById('btnSetupContinue'),

    // Pantalla Confirmación (¡Listo para jugar!)
    btnConfirmBackTop: document.getElementById('btnConfirmBackTop'),
    confirmTargetValue: document.getElementById('confirmTargetValue'),
    confirmPlayersCount: document.getElementById('confirmPlayersCount'),
    confirmPlayersList: document.getElementById('confirmPlayersList'),
    btnConfirmStart: document.getElementById('btnConfirmStart'),
    btnConfirmEdit: document.getElementById('btnConfirmEdit'),

    // Pantalla Tablero de Juego
    btnGameToHub: document.getElementById('btnGameToHub'),
    btnOpenSetup: document.getElementById('btnOpenSetup'),
    btnAudioToggle: document.getElementById('btnAudioToggle'),
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
  };

  const stateEngine = new GarozoStateEngine();
  const audioEngine = new GarozoAudioEngine();
  const animDirector = new GarozoAnimationDirector(dom, assets);

  // Estado persistente de configuración (conserva cambios al avanzar y regresar)
  const setupDraft = {
    targetScore: 100,
    isCustomMode: false,
    playerNames: ['Jugador 1', 'Jugador 2'],
  };

  let currentScreen = 'hub';

  // Renderizar anillas superiores de la libreta en el tablero
  const ringsContainer = document.getElementById('notebookRings');
  if (ringsContainer && ringsContainer.children.length === 0) {
    for (let i = 0; i < 11; i++) {
      const ring = document.createElement('div');
      ring.className = 'ring-loop';
      ring.innerHTML = '<span class="ring-hole"></span>';
      ringsContainer.appendChild(ring);
    }
  }

  /**
   * Cambia entre las pantallas principales ('hub', 'rules', 'setup', 'confirm', 'game')
   */
  function showScreen(screenName) {
    currentScreen = screenName;
    const mapping = {
      hub: dom.screenHub,
      rules: dom.screenRules,
      setup: dom.screenSetup,
      confirm: dom.screenConfirm,
      game: dom.screenGame,
    };

    Object.entries(mapping).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('is-active', key === screenName);
    });

    if (screenName === 'setup') {
      renderSetupScreen();
    } else if (screenName === 'confirm') {
      renderConfirmScreen();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Sincroniza todos los controles de sonido (Hub, Modal de Ajustes y Tablero)
   */
  function syncAudioUI() {
    const muted = audioEngine.isMuted;
    if (dom.hubAudioIconLabel) {
      dom.hubAudioIconLabel.textContent = muted ? '🔇' : '🔊';
    }
    if (dom.btnAudioToggle) {
      dom.btnAudioToggle.textContent = muted ? '🔇 Mudo' : '🔊 Sonido';
      dom.btnAudioToggle.classList.toggle('is-muted', muted);
    }
    if (dom.btnSettingsAudioToggle) {
      dom.btnSettingsAudioToggle.textContent = muted ? '🔇 Desactivado' : '🔊 Activado';
      dom.btnSettingsAudioToggle.classList.toggle('is-muted', muted);
    }
  }

  function handleToggleAudio() {
    audioEngine.toggleMute();
    syncAudioUI();
  }

  /* ==========================================================================
     LÓGICA DE CONFIGURACIÓN DE PARTIDA (META + 2 A 8 JUGADORES)
     ========================================================================== */
  function setDraftTargetScore(newTarget, fromCustomInput = false) {
    const sanitized = sanitizeTargetScore(newTarget, setupDraft.targetScore || 100);
    setupDraft.targetScore = sanitized;

    if (dom.setupTargetDisplay) {
      dom.setupTargetDisplay.textContent = String(sanitized);
    }
    if (!fromCustomInput && dom.customTargetInput) {
      dom.customTargetInput.value = String(sanitized);
    }

    const isStandardPreset = [100, 500, 1000].includes(sanitized) && !setupDraft.isCustomMode;
    document.querySelectorAll('[data-target-preset]').forEach((btn) => {
      const presetVal = Number(btn.getAttribute('data-target-preset'));
      btn.classList.toggle('is-selected', isStandardPreset && presetVal === sanitized);
    });

    if (dom.btnPresetCustom) {
      dom.btnPresetCustom.classList.toggle(
        'is-selected',
        setupDraft.isCustomMode || ![100, 500, 1000].includes(sanitized)
      );
    }

    if (dom.customTargetDrawer) {
      dom.customTargetDrawer.hidden = !(
        setupDraft.isCustomMode || ![100, 500, 1000].includes(sanitized)
      );
    }
  }

  function renderSetupPlayersList() {
    if (!dom.playersSetupList) return;
    dom.playersSetupList.innerHTML = '';

    const count = setupDraft.playerNames.length;
    if (dom.setupPlayerCountBadge) {
      dom.setupPlayerCountBadge.textContent = `${count} / 8`;
    }

    setupDraft.playerNames.forEach((name, idx) => {
      const palette = PLAYER_PALETTES[idx % PLAYER_PALETTES.length];
      const row = document.createElement('div');
      row.className = 'player-setup-row';
      row.setAttribute('role', 'listitem');

      const canRemove = count > 2;
      row.innerHTML = `
        <span class="player-color-dot" style="background:${palette.dot}" title="Color ${palette.name}"></span>
        <input
          type="text"
          class="player-name-input"
          maxlength="18"
          value="${name.replace(/"/g, '&quot;')}"
          placeholder="Jugador ${idx + 1}"
          aria-label="Nombre del jugador ${idx + 1}"
          data-player-idx="${idx}"
        >
        <button
          type="button"
          class="remove-player-btn"
          data-remove-idx="${idx}"
          aria-label="Eliminar jugador ${idx + 1}"
          ${canRemove ? '' : 'disabled title="Mínimo 2 jugadores"'}
        >×</button>
      `;
      dom.playersSetupList.appendChild(row);
    });

    dom.playersSetupList.querySelectorAll('.player-name-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-player-idx'));
        setupDraft.playerNames[idx] = e.target.value;
      });
    });

    dom.playersSetupList.querySelectorAll('.remove-player-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (setupDraft.playerNames.length <= 2) return;
        const idx = Number(e.currentTarget.getAttribute('data-remove-idx'));
        setupDraft.playerNames.splice(idx, 1);
        audioEngine.playPaperTick(900, 0.04);
        renderSetupPlayersList();
      });
    });

    if (dom.btnAddPlayer) {
      const atMax = count >= 8;
      dom.btnAddPlayer.disabled = atMax;
      dom.btnAddPlayer.textContent = atMax
        ? 'Máximo de 8 jugadores alcanzado'
        : '+ Agregar jugador';
    }

    if (dom.setupPlayersHint) {
      if (count >= 8) {
        dom.setupPlayersHint.textContent = 'Has alcanzado el límite máximo de 8 participantes.';
      } else if (count <= 2) {
        dom.setupPlayersHint.textContent = 'Se requieren al menos 2 jugadores para comenzar.';
      } else {
        dom.setupPlayersHint.textContent = '';
      }
    }
  }

  function renderSetupScreen() {
    setDraftTargetScore(setupDraft.targetScore);
    renderSetupPlayersList();
  }

  /* ==========================================================================
     LÓGICA DE PANTALLA DE CONFIRMACIÓN («¡LISTO PARA JUGAR!»)
     ========================================================================== */
  function renderConfirmScreen() {
    const resolvedNames = normalizePlayerNames(setupDraft.playerNames);
    const target = sanitizeTargetScore(setupDraft.targetScore, 100);

    if (dom.confirmTargetValue) {
      dom.confirmTargetValue.textContent = String(target);
    }
    if (dom.confirmPlayersCount) {
      dom.confirmPlayersCount.textContent = String(resolvedNames.length);
    }

    if (dom.confirmPlayersList) {
      dom.confirmPlayersList.innerHTML = resolvedNames
        .map((name, idx) => {
          const palette = PLAYER_PALETTES[idx % PLAYER_PALETTES.length];
          return `
            <li class="confirm-player-item">
              <span class="confirm-player-left">
                <span class="player-color-dot" style="background:${palette.dot}"></span>
                <span>${name}</span>
              </span>
              <span class="confirm-player-tag">J${idx + 1} · ${palette.name}</span>
            </li>
          `;
        })
        .join('');
    }
  }

  /* ==========================================================================
     RENDERIZADO DEL TABLERO DE JUEGO ACTIVO
     ========================================================================== */
  function renderScoreboard(snapshot) {
    if (!dom.playersCarousel) return;
    dom.playersCarousel.innerHTML = '';

    snapshot.players.forEach((player, idx) => {
      const isActive = idx === snapshot.currentPlayerIndex;
      const card = document.createElement('div');
      card.className = `player-card ${isActive ? 'is-active boil-effect' : ''}`;
      card.dataset.playerIndex = String(idx);

      const projected = player.savedScore + (isActive ? snapshot.turnScore : 0);
      const formulaHtml =
        isActive && snapshot.turnScore > 0
          ? `<div class="player-live-formula">${player.savedScore} + ${snapshot.turnScore} = <strong>${projected}</strong></div>`
          : `<div class="player-live-formula">Meta: ${Math.min(100, Math.round((player.savedScore / snapshot.targetScore) * 100))}%</div>`;

      card.innerHTML = `
        <div class="player-avatar-box" style="background:${player.palette.tint}; border-color:${player.palette.dot}">
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

  /* ==========================================================================
     SUSCRIPCIÓN A EVENTOS DEL MOTOR DE JUEGO
     ========================================================================== */
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

  /* ==========================================================================
     LISTENERS DE NAVEGACIÓN ENTRE PANTALLAS Y CONTROLES
     ========================================================================== */
  // 1. Hub Principal
  dom.btnHubPlay?.addEventListener('click', () => {
    audioEngine.playPaperTick(1100, 0.05);
    showScreen('setup');
  });

  dom.btnHubRules?.addEventListener('click', () => {
    audioEngine.playPaperTick(1100, 0.05);
    showScreen('rules');
  });

  dom.btnHubAudio?.addEventListener('click', handleToggleAudio);

  dom.btnHubSettings?.addEventListener('click', () => {
    syncAudioUI();
    dom.hubSettingsModal?.classList.add('is-visible');
  });

  dom.btnCloseSettingsModal?.addEventListener('click', () => {
    dom.hubSettingsModal?.classList.remove('is-visible');
  });

  dom.btnSettingsAudioToggle?.addEventListener('click', handleToggleAudio);

  dom.btnSettingsOpenRules?.addEventListener('click', () => {
    dom.hubSettingsModal?.classList.remove('is-visible');
    showScreen('rules');
  });

  // 2. Pantalla ¿Cómo se juega?
  dom.btnRulesBackTop?.addEventListener('click', () => showScreen('hub'));
  dom.btnRulesBackBottom?.addEventListener('click', () => showScreen('hub'));
  dom.btnRulesPlay?.addEventListener('click', () => showScreen('setup'));

  // 3. Pantalla Configura tu partida
  dom.btnSetupBack?.addEventListener('click', () => showScreen('hub'));

  dom.btnTargetMinus?.addEventListener('click', () => {
    const step = setupDraft.targetScore <= 100 ? 10 : 50;
    setDraftTargetScore(Math.max(10, setupDraft.targetScore - step));
  });

  dom.btnTargetPlus?.addEventListener('click', () => {
    const step = setupDraft.targetScore < 100 ? 10 : 50;
    setDraftTargetScore(Math.min(9999, setupDraft.targetScore + step));
  });

  document.querySelectorAll('[data-target-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setupDraft.isCustomMode = false;
      const val = Number(btn.getAttribute('data-target-preset')) || 100;
      setDraftTargetScore(val);
    });
  });

  dom.btnPresetCustom?.addEventListener('click', () => {
    setupDraft.isCustomMode = true;
    setDraftTargetScore(setupDraft.targetScore);
    dom.customTargetInput?.focus();
  });

  dom.customTargetInput?.addEventListener('input', (e) => {
    const raw = parseInt(e.target.value, 10);
    if (!Number.isNaN(raw) && raw > 0) {
      setupDraft.isCustomMode = true;
      setDraftTargetScore(raw, true);
    }
  });

  dom.customTargetInput?.addEventListener('change', (e) => {
    const clean = sanitizeTargetScore(e.target.value, 100);
    e.target.value = String(clean);
    setDraftTargetScore(clean, false);
  });

  dom.btnAddPlayer?.addEventListener('click', () => {
    if (setupDraft.playerNames.length >= 8) return;
    const nextNum = setupDraft.playerNames.length + 1;
    setupDraft.playerNames.push(`Jugador ${nextNum}`);
    audioEngine.playPaperTick(1200, 0.04);
    renderSetupPlayersList();
  });

  dom.btnSetupContinue?.addEventListener('click', () => {
    setDraftTargetScore(setupDraft.targetScore);
    audioEngine.playPaperTick(1300, 0.05);
    showScreen('confirm');
  });

  // 4. Pantalla de Confirmación (¡Listo para jugar!)
  dom.btnConfirmBackTop?.addEventListener('click', () => showScreen('setup'));
  dom.btnConfirmEdit?.addEventListener('click', () => showScreen('setup'));

  dom.btnConfirmStart?.addEventListener('click', () => {
    audioEngine.unlock();
    const resolvedNames = normalizePlayerNames(setupDraft.playerNames);
    const resolvedTarget = sanitizeTargetScore(setupDraft.targetScore, 100);

    dom.winOverlay?.classList.remove('is-visible');
    stateEngine.startNewGame({
      playerNames: resolvedNames,
      targetScore: resolvedTarget,
    });
    showScreen('game');
  });

  // 5. Controles del Tablero de Juego
  function handleRollAction() {
    if (currentScreen !== 'game') return;
    if (stateEngine.state !== GAME_STATES.PLAYER_TURN) return;
    stateEngine.requestRoll();
  }

  function handleBankAction() {
    if (currentScreen !== 'game') return;
    if (stateEngine.state !== GAME_STATES.PLAYER_TURN || stateEngine.turnScore <= 0) return;
    stateEngine.requestBank();
  }

  dom.btnRoll?.addEventListener('click', handleRollAction);
  dom.diceStageSlot?.addEventListener('click', handleRollAction);
  dom.btnBank?.addEventListener('click', handleBankAction);

  dom.btnGameToHub?.addEventListener('click', () => {
    dom.winOverlay?.classList.remove('is-visible');
    showScreen('hub');
  });

  dom.btnOpenSetup?.addEventListener('click', () => {
    dom.winOverlay?.classList.remove('is-visible');
    showScreen('setup');
  });

  dom.btnAudioToggle?.addEventListener('click', handleToggleAudio);

  dom.carouselPrev?.addEventListener('click', () => {
    dom.playersCarousel?.scrollBy({ left: -140, behavior: 'smooth' });
  });
  dom.carouselNext?.addEventListener('click', () => {
    dom.playersCarousel?.scrollBy({ left: 140, behavior: 'smooth' });
  });

  dom.btnRematch?.addEventListener('click', () => {
    dom.winOverlay?.classList.remove('is-visible');
    stateEngine.rematch();
  });

  dom.btnNewSetupFromWin?.addEventListener('click', () => {
    dom.winOverlay?.classList.remove('is-visible');
    showScreen('setup');
  });

  // Atajos de teclado cuando el tablero de juego está activo
  window.addEventListener('keydown', (e) => {
    if (currentScreen !== 'game') return;
    if (dom.winOverlay?.classList.contains('is-visible')) return;

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      handleRollAction();
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      handleBankAction();
    }
  });

  // Inicializar estado de audio y mostrar el Hub Principal al abrir la app
  syncAudioUI();
  renderSetupScreen();
  showScreen('hub');

  window.GAROZO_GAME = {
    stateEngine,
    audioEngine,
    animDirector,
    setupDraft,
    showScreen,
    getCurrentScreen: () => currentScreen,
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
