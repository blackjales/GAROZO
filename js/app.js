/**
 * js/app.js
 * Controlador principal de la interfaz DOM y eventos para "GAROZO! party game".
 * Integra State Machine, Motor de Audio y Animaciones.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Instanciación de subsistemas
  const state = new GarozoGameState();
  const audio = new GarozoAudio();
  const anim = new GarozoAnimations();

  // 2. Elementos DOM
  const btnRoll = document.getElementById('btnRoll');
  const btnBank = document.getElementById('btnBank');
  const diceStageWrap = document.getElementById('diceStageWrap');
  const bankPointsVal = document.getElementById('bankPointsVal');
  const turnPointsValue = document.getElementById('turnPointsValue');
  const tensionBarFill = document.getElementById('tensionBarFill');
  const playersCarousel = document.getElementById('playersCarousel');
  const targetScoreDisplay = document.getElementById('targetScoreDisplay');
  const btnMute = document.getElementById('btnMute');
  const btnSettings = document.getElementById('btnSettings');
  const btnLogo = document.getElementById('btnLogo');
  const setupModal = document.getElementById('setupModal');
  const rulesModal = document.getElementById('rulesModal');
  const btnCloseRules = document.getElementById('btnCloseRules');
  const goalChips = document.getElementById('goalChips');
  const customGoalInput = document.getElementById('customGoalInput');
  const playersConfigList = document.getElementById('playersConfigList');
  const btnAddPlayer = document.getElementById('btnAddPlayer');
  const btnStartGame = document.getElementById('btnStartGame');

  // Nombres simpáticos por defecto para Masitas
  const masitaNamePool = [
    'Masita Feliz', 'Masita Pro', 'Masita Glotona', 
    'Masita Saltarina', 'Masita Dramática', 'Masita Valiente', 
    'Masita Veloz', 'Masita Suertuda'
  ];

  let configPlayers = ['Masita 1', 'Masita 2', 'Masita 3'];
  let selectedGoal = 100;
  let isRollingAction = false;

  // 3. Inicialización de Audio UI
  function updateAudioButton() {
    btnMute.innerText = audio.isMuted ? '🔇' : '🔊';
  }
  updateAudioButton();

  btnMute.addEventListener('click', () => {
    audio.toggleMute();
    updateAudioButton();
  });

  // 4. Modal de Configuración y Gestión de Jugadores
  function renderPlayersConfig() {
    playersConfigList.innerHTML = '';
    configPlayers.forEach((name, index) => {
      const row = document.createElement('div');
      row.className = 'player-config-row';
      row.innerHTML = `
        <span class="player-config-num">#${index + 1}</span>
        <input type="text" class="input-pencil player-name-input" data-index="${index}" value="${name}" maxlength="18" placeholder="Nombre Masita">
        ${configPlayers.length > 2 ? `<button type="button" class="btn-remove-p" data-index="${index}" title="Quitar">✕</button>` : ''}
      `;
      playersConfigList.appendChild(row);
    });

    // Control de límite máximo (8 jugadores)
    btnAddPlayer.style.display = configPlayers.length >= 8 ? 'none' : 'block';

    // Inputs listeners
    playersConfigList.querySelectorAll('.player-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        configPlayers[idx] = e.target.value;
      });
    });

    // Remove buttons
    playersConfigList.querySelectorAll('.btn-remove-p').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (configPlayers.length > 2) {
          configPlayers.splice(idx, 1);
          renderPlayersConfig();
        }
      });
    });
  }

  btnAddPlayer.addEventListener('click', () => {
    if (configPlayers.length < 8) {
      const nextNum = configPlayers.length + 1;
      const randomSuggest = masitaNamePool[nextNum - 1] || `Masita ${nextNum}`;
      configPlayers.push(randomSuggest);
      renderPlayersConfig();
    }
  });

  // Selector de Meta (Chips + Input)
  goalChips.querySelectorAll('.goal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      goalChips.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedGoal = parseInt(chip.dataset.goal, 10);
      customGoalInput.value = selectedGoal;
    });
  });

  customGoalInput.addEventListener('input', (e) => {
    selectedGoal = parseInt(e.target.value, 10) || 50;
    goalChips.querySelectorAll('.goal-chip').forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.goal, 10) === selectedGoal);
    });
  });

  btnStartGame.addEventListener('click', () => {
    const validNames = configPlayers.map((n, i) => n.trim() || `Masita ${i + 1}`);
    state.initGame(validNames, selectedGoal);
    setupModal.classList.remove('active');
  });

  btnSettings.addEventListener('click', () => {
    renderPlayersConfig();
    setupModal.classList.add('active');
  });

  btnLogo.addEventListener('click', () => {
    rulesModal.classList.add('active');
  });

  btnCloseRules.addEventListener('click', () => {
    rulesModal.classList.remove('active');
  });

  // 5. Renderizado del Marcador Superior de Jugadores
  function updatePlayersCarousel() {
    const snapshot = state.getSnapshot();
    playersCarousel.innerHTML = '';

    snapshot.players.forEach((player, idx) => {
      const isActive = idx === snapshot.activePlayerIndex;
      const card = document.createElement('div');
      card.className = `player-card ${isActive ? 'active' : ''}`;
      card.id = `playerCard_${idx}`;

      const potential = isActive && snapshot.provisionalPoints > 0
        ? `${player.savedPoints} + ${snapshot.provisionalPoints} = ${player.savedPoints + snapshot.provisionalPoints}`
        : '';

      card.innerHTML = `
        <img src="assets/sprites/masita_idle.png" class="player-peeking" alt="Turno">
        <div class="p-name" style="color: ${isActive ? '#2b2724' : '#555'}">${player.name}</div>
        <div class="p-score">${player.savedPoints}</div>
        <div class="p-potential">${potential}</div>
      `;

      // Clic para enfocar o ver datos
      card.addEventListener('click', () => {
        if (!isActive && state.status === 'PLAYING' && snapshot.provisionalPoints === 0) {
          // Si no hay tiradas en curso, permitir explorar
        }
      });

      playersCarousel.appendChild(card);
    });

    targetScoreDisplay.innerText = snapshot.targetScore;

    // Centrar suavemente la tarjeta activa
    const activeCard = document.getElementById(`playerCard_${snapshot.activePlayerIndex}`);
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // 6. Actualización del Medidor de Tensión y Botones
  function updateGreedMeter(provisionalPoints, streak = 0) {
    turnPointsValue.innerText = provisionalPoints;
    bankPointsVal.innerText = provisionalPoints;

    // Barra de tensión (crece con la racha de tiradas)
    const tensionPercent = Math.min(100, streak * 20);
    tensionBarFill.style.width = `${tensionPercent}%`;

    if (streak >= 3) {
      tensionBarFill.classList.add('tension-high');
    } else {
      tensionBarFill.classList.remove('tension-high');
    }

    // Efecto bump en los números
    turnPointsValue.classList.add('bump');
    setTimeout(() => turnPointsValue.classList.remove('bump'), 180);

    // Habilitar / Deshabilitar botón de Plantarse
    btnBank.disabled = provisionalPoints === 0 || isRollingAction;
    btnRoll.disabled = isRollingAction;
  }

  // 7. Acción: Tirar el Dado
  async function handleRoll() {
    if (isRollingAction || state.status !== 'PLAYING') return;

    isRollingAction = true;
    btnRoll.disabled = true;
    btnBank.disabled = true;

    // 1. Obtener resultado del motor
    // Pre-calculamos el dado determinista antes de la animación
    const diceResult = Math.floor(Math.random() * 6) + 1;

    // 2. Coreografía: Masita corre, patea y el dado 3D vuela
    await anim.playKickAndRoll(
      diceResult,
      () => {
        // Al impacto de la patada
        audio.playKick();
      },
      (finalValue) => {
        // Al aterrizar el dado en la libreta
        audio.playDiceBounce(1.0);
      }
    );

    // 3. Aplicar resultado en el motor de juego
    state.rollDice(diceResult);
    isRollingAction = false;
  }

  // 8. Acción: Plantarse (Guardar puntos)
  function handleBank() {
    if (isRollingAction || state.status !== 'PLAYING' || state.provisionalPoints === 0) return;

    const secured = state.provisionalPoints;
    const activeIdx = state.activePlayerIndex;
    const activeCardEl = document.getElementById(`playerCard_${activeIdx}`);

    audio.playBank();
    anim.setHostPose('happy');
    anim.flyPointsToPlayer(activeCardEl, secured);

    btnBank.disabled = true;
    btnRoll.disabled = true;

    // Aplicar guardado en el motor
    setTimeout(() => {
      state.bankPoints();
      state.finishBankSequence();
    }, 700);
  }

  // 9. Conexión de Eventos del Motor con UI y Audio
  state.on('turnChange', ({ player }) => {
    updatePlayersCarousel();
    updateGreedMeter(0, 0);
    anim.setHostPose('idle');
  });

  state.on('rollResult', (data) => {
    if (data.isGarozo) {
      // ¡SACÓ UN 1! (Garozo)
      updateGreedMeter(0, 0);
      updatePlayersCarousel();

      audio.playGarozo();
      anim.playGarozoSequence(() => {
        state.finishGarozoSequence();
      });
    } else {
      // Puntos sumados (2 al 6)
      audio.playScoreAdd(data.turnStreak);
      updateGreedMeter(data.provisionalPoints, data.turnStreak);
      updatePlayersCarousel();

      if (data.turnStreak >= 3) {
        anim.setHostPose('nervous');
      } else {
        anim.setHostPose('idle');
      }
    }
  });

  state.on('win', ({ winner }) => {
    updatePlayersCarousel();
    audio.playWinFanfare();

    anim.playWinSequence(
      winner,
      // Callback Revancha
      () => {
        state.rematch();
      },
      // Callback Nueva Partida
      () => {
        renderPlayersConfig();
        setupModal.classList.add('active');
      }
    );
  });

  // 10. Listeners de Botones y Toques Táctiles
  btnRoll.addEventListener('click', handleRoll);
  btnBank.addEventListener('click', handleBank);
  diceStageWrap.addEventListener('click', handleRoll);

  // Atajos de teclado para escritorio (Espacio = Tirar, Enter = Plantarse, M = Mute)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // No interceptar en campos de texto

    if (e.code === 'Space') {
      e.preventDefault();
      handleRoll();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      handleBank();
    } else if (e.key === 'm' || e.key === 'M') {
      audio.toggleMute();
      updateAudioButton();
    }
  });

  // 11. Inicio inicial
  renderPlayersConfig();
  state.initGame(configPlayers, selectedGoal);
});
