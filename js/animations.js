/**
 * js/animations.js
 * Orquestador y Director Técnico de Animación para "GAROZO! party game".
 * Controla la Masita Anfitriona, la física del Dado 3D, la Estampida Caótica y la Fanfarria de Victoria.
 */

class GarozoAnimations {
  constructor() {
    this.hostWrap = document.getElementById('hostMasitaWrap');
    this.hostImg = document.getElementById('hostMasitaImg');
    this.hostDust = document.getElementById('hostDust');
    this.hostSweat = document.getElementById('hostSweat');
    this.diceCube = document.getElementById('diceCube');
    this.diceShadow = document.getElementById('diceShadow');
    this.diceScene = document.getElementById('diceScene');
    this.greedMeter = document.getElementById('greedMeter');
    this.garozoOverlay = document.getElementById('garozoOverlay');
    this.garozoBanner = document.getElementById('garozoBanner');
    this.winOverlay = document.getElementById('winOverlay');
    this.appContainer = document.querySelector('.sketchbook-container');

    // Ángulos actuales de rotación del dado
    this.diceRotX = 0;
    this.diceRotY = 0;

    // Sprite paths
    this.sprites = {
      idle: 'assets/sprites/masita_idle.png',
      run: 'assets/sprites/masita_run.png',
      point: 'assets/sprites/masita_point.png',
      nervous: 'assets/sprites/masita_nervous.png',
      happy: 'assets/sprites/masita_happy.png',
      shock: 'assets/sprites/panic_dizzy.png',
      trumpet: 'assets/sprites/masita_trumpet.png',
      scream: 'assets/sprites/panic_scream.png',
      fall: 'assets/sprites/panic_fall.png',
      crash: 'assets/sprites/panic_crash.png',
      dust: 'assets/sprites/fx_dust.png',
      sweat: 'assets/sprites/fx_sweat.png',
      dead: 'assets/sprites/panic_dead.png'
    };

    // Mapeo angular exacto para que la cara seleccionada mire a cámara
    this.faceRotations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: -90 },
      3: { x: -90, y: 0 },
      4: { x: 90, y: 0 },
      5: { x: 0, y: 90 },
      6: { x: 0, y: 180 }
    };
  }

  /**
   * Cambia la pose y animación de la Masita Anfitriona
   * @param {string} pose - 'idle', 'run', 'point', 'nervous', 'happy', 'shock'
   */
  setHostPose(pose) {
    if (!this.hostImg || !this.hostWrap) return;

    this.hostWrap.classList.remove('masita-idle-anim', 'masita-nervous-anim', 'masita-happy-jump');
    if (this.hostSweat) this.hostSweat.style.opacity = '0';

    switch (pose) {
      case 'nervous':
        this.hostImg.src = this.sprites.nervous;
        this.hostWrap.classList.add('masita-nervous-anim');
        if (this.hostSweat) {
          this.hostSweat.src = this.sprites.sweat;
          this.hostSweat.classList.add('sweat-pop');
          this.hostSweat.style.opacity = '1';
        }
        break;
      case 'run':
        this.hostImg.src = this.sprites.run;
        break;
      case 'point':
        this.hostImg.src = this.sprites.point;
        this.hostWrap.classList.add('masita-idle-anim');
        break;
      case 'happy':
        this.hostImg.src = this.sprites.happy;
        this.hostWrap.classList.add('masita-happy-jump');
        break;
      case 'shock':
        this.hostImg.src = this.sprites.shock;
        break;
      case 'idle':
      default:
        this.hostImg.src = this.sprites.idle;
        this.hostWrap.classList.add('masita-idle-anim');
        break;
    }
  }

  /**
   * Coreografía completa de la Patada de la Masita y Vuelo del Dado 3D
   */
  playKickAndRoll(diceValue, onImpact, onLand) {
    return new Promise((resolve) => {
      // 1. La Masita cambia a correr y sprinta hacia el dado
      this.setHostPose('run');
      this.hostWrap.classList.remove('masita-kick-sequence');
      void this.hostWrap.offsetWidth; // Force reflow
      this.hostWrap.classList.add('masita-kick-sequence');

      // 2. Disparo de nube de polvo de arranque (180ms)
      setTimeout(() => {
        if (this.hostDust) {
          this.hostDust.src = this.sprites.dust;
          this.hostDust.classList.remove('dust-burst');
          void this.hostDust.offsetWidth;
          this.hostDust.classList.add('dust-burst');
        }
      }, 180);

      // 3. ¡EL IMPACTO DE LA PATADA! (420ms)
      setTimeout(() => {
        if (onImpact) onImpact();

        // El dado toma vuelo 3D
        this.diceScene.classList.remove('dice-rolling-flight');
        this.diceShadow.classList.remove('dice-shadow-flight');
        void this.diceScene.offsetWidth;
        this.diceScene.classList.add('dice-rolling-flight');
        this.diceShadow.classList.add('dice-shadow-flight');

        // Rotación 3D del cubo con múltiples vueltas dramáticas
        const target = this.faceRotations[diceValue] || { x: 0, y: 0 };
        const extraTurnsX = 360 * (3 + Math.floor(Math.random() * 2));
        const extraTurnsY = 360 * (3 + Math.floor(Math.random() * 2));

        this.diceRotX = extraTurnsX + target.x;
        this.diceRotY = extraTurnsY + target.y;

        this.diceCube.style.transition = 'transform 0.92s cubic-bezier(0.2, 0.8, 0.25, 1)';
        this.diceCube.style.transform = `rotateX(${this.diceRotX}deg) rotateY(${this.diceRotY}deg)`;
      }, 420);

      // 4. Aterrizaje y rebote final del dado (980ms desde el inicio)
      setTimeout(() => {
        if (onLand) onLand(diceValue);

        // Limpiar animaciones de vuelo
        this.diceScene.classList.remove('dice-rolling-flight');
        this.diceShadow.classList.remove('dice-shadow-flight');
        this.hostWrap.classList.remove('masita-kick-sequence');

        resolve(diceValue);
      }, 1380);
    });
  }

  /**
   * Secuencia de Caos «¡GAROZOOO!» (Tirada = 1)
   */
  playGarozoSequence(onComplete) {
    // 1. Pausa dramática de 350ms (la Masita Anfitriona se congela en shock)
    this.setHostPose('shock');

    setTimeout(() => {
      // 2. Terremoto en la libreta
      if (this.appContainer) {
        this.appContainer.classList.remove('screen-quake');
        void this.appContainer.offsetWidth;
        this.appContainer.classList.add('screen-quake');
      }

      // 3. Desplegar overlay de Garozo y caída del cartel
      if (this.garozoOverlay) {
        this.garozoOverlay.classList.add('active');
        this.garozoOverlay.innerHTML = `
          <div class="garozo-banner-wrap" id="garozoBannerWrap">
            <img src="${this.sprites.garozoBanner || 'assets/sprites/banner_garozo.png'}" class="garozo-banner-img garozo-banner-slam" alt="¡GAROZOOO!">
          </div>
          <div id="stampedeContainer"></div>
        `;
      }

      // 4. Lanzar Estampida Caótica de Masitas (6 a 10 corredores con 3 patrones aleatorios)
      this.spawnChaosStampede();

      // 5. Duración ágil de ~2.2s antes de ceder el turno
      setTimeout(() => {
        if (this.garozoOverlay) {
          this.garozoOverlay.classList.remove('active');
          this.garozoOverlay.innerHTML = '';
        }
        if (this.appContainer) {
          this.appContainer.classList.remove('screen-quake');
        }
        this.setHostPose('idle');
        if (onComplete) onComplete();
      }, 2200);
    }, 350);
  }

  /**
   * Genera una estampida aleatoria impredecible con múltiples patrones
   */
  spawnChaosStampede() {
    const container = document.getElementById('stampedeContainer');
    if (!container) return;

    const patternType = Math.floor(Math.random() * 3); // 0, 1 o 2
    const panicSprites = [
      this.sprites.scream,
      this.sprites.fall,
      this.sprites.crash,
      this.sprites.shock,
      this.sprites.dead,
      this.sprites.run
    ];

    const masitasCount = 7 + Math.floor(Math.random() * 4); // 7 a 10

    for (let i = 0; i < masitasCount; i++) {
      const masita = document.createElement('img');
      const randomSprite = panicSprites[Math.floor(Math.random() * panicSprites.length)];
      masita.src = randomSprite;
      masita.className = 'stampede-masita';

      const size = 65 + Math.floor(Math.random() * 45); // 65px a 110px
      const topPos = 20 + Math.random() * 60; // 20% a 80% de altura
      const delay = i * 0.14 + Math.random() * 0.1;
      const duration = 1.1 + Math.random() * 0.6;

      masita.style.width = `${size}px`;
      masita.style.height = `${size}px`;
      masita.style.objectFit = 'contain';
      masita.style.top = `${topPos}%`;

      if (patternType === 0) {
        // Patrón 1: Estampida en masa hacia la derecha
        masita.style.left = '-120px';
        masita.style.animation = `stampedeRight ${duration}s cubic-bezier(0.2, 0.8, 0.4, 1) ${delay}s forwards`;
      } else if (patternType === 1) {
        // Patrón 2: Resbalones y volteretas hacia la izquierda
        masita.style.right = '-120px';
        masita.style.animation = `stampedeLeftRoll ${duration}s ease-in-out ${delay}s forwards`;
      } else {
        // Patrón 3: Choque cruzado de ambos lados
        if (i % 2 === 0) {
          masita.style.left = '-120px';
          masita.style.animation = `stampedeRight ${duration}s ease-out ${delay}s forwards`;
        } else {
          masita.style.right = '-120px';
          masita.style.animation = `stampedeLeftRoll ${duration}s ease-out ${delay}s forwards`;
        }
      }

      container.appendChild(masita);
    }

    // Si es patrón 2 o 3, agregar un choque de estrellas en el centro
    if (patternType === 2) {
      setTimeout(() => {
        const crashEl = document.createElement('img');
        crashEl.src = this.sprites.crash;
        crashEl.className = 'stampede-masita';
        crashEl.style.width = '140px';
        crashEl.style.height = '140px';
        crashEl.style.top = '45%';
        crashEl.style.animation = 'stampedeCrashCenter 1.2s ease-out forwards';
        container.appendChild(crashEl);
      }, 400);
    }
  }

  /**
   * Secuencia de Victoria «WIN!»
   */
  playWinSequence(winner, onRematch, onNewGame) {
    if (!this.winOverlay) return;

    this.winOverlay.classList.add('active');
    this.winOverlay.innerHTML = `
      <img src="assets/sprites/banner_win.png" class="win-banner-img boil-living" alt="WIN!">
      <div class="winner-name-display">${winner.name}</div>
      <div class="winner-score-display">¡Campeón con ${winner.savedPoints} Puntos!</div>

      <div class="win-parade-area" id="winParadeArea">
        <img src="${this.sprites.trumpet}" class="trumpet-masita-img trumpet-march" alt="Masita Trompeta">
      </div>

      <div class="win-actions">
        <button class="btn-game btn-roll" id="btnRematch">¡REVANCHA!</button>
        <button class="btn-game btn-bank" id="btnNewGame">NUEVA PARTIDA</button>
      </div>
      <div id="winConfettiContainer"></div>
    `;

    // Conectar botones
    const btnRematch = document.getElementById('btnRematch');
    const btnNewGame = document.getElementById('btnNewGame');

    if (btnRematch) {
      btnRematch.addEventListener('click', () => {
        this.winOverlay.classList.remove('active');
        this.winOverlay.innerHTML = '';
        if (onRematch) onRematch();
      });
    }

    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        this.winOverlay.classList.remove('active');
        this.winOverlay.innerHTML = '';
        if (onNewGame) onNewGame();
      });
    }

    // Agregar Masitas bailarinas en ronda
    const paradeArea = document.getElementById('winParadeArea');
    if (paradeArea) {
      [-60, 60].forEach((offset, idx) => {
        const dancer = document.createElement('img');
        dancer.src = idx % 2 === 0 ? this.sprites.happy : this.sprites.run;
        dancer.style.position = 'absolute';
        dancer.style.height = '90px';
        dancer.style.transform = `translateX(${offset}px)`;
        dancer.className = 'masita-happy-jump';
        paradeArea.appendChild(dancer);
      });
    }

    // Lluvia de confeti de colores dibujado
    this.spawnConfetti();
  }

  spawnConfetti() {
    const container = document.getElementById('winConfettiContainer');
    if (!container) return;

    const colors = ['#ffe270', '#ff758f', '#99e2b4', '#a2d2ff', '#ffd166', '#ffc6ff'];
    for (let i = 0; i < 35; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 1.5}s`;
      piece.style.animationDuration = `${2.0 + Math.random() * 1.5}s`;
      container.appendChild(piece);
    }
  }

  /**
   * Vuelo de burbuja de puntos hacia la tarjeta del jugador al plantarse
   */
  flyPointsToPlayer(targetElement, points) {
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const sourceEl = document.getElementById('turnPointsValue');
    const sourceRect = sourceEl ? sourceEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };

    const bubble = document.createElement('div');
    bubble.className = 'flying-point-bubble';
    bubble.innerText = `+${points}`;
    bubble.style.left = `${sourceRect.left}px`;
    bubble.style.top = `${sourceRect.top}px`;
    document.body.appendChild(bubble);

    // Animación hacia la tarjeta
    requestAnimationFrame(() => {
      bubble.style.left = `${rect.left + rect.width / 2 - 20}px`;
      bubble.style.top = `${rect.top + rect.height / 2 - 15}px`;
      bubble.style.transform = 'scale(0.85)';
      bubble.style.opacity = '0.9';
    });

    setTimeout(() => {
      bubble.remove();
      targetElement.classList.add('bump');
      setTimeout(() => targetElement.classList.remove('bump'), 200);
    }, 650);
  }
}

// Exportación global
window.GarozoAnimations = GarozoAnimations;
