/**
 * GAROZO! Party Game — Orquestador Visual de Animaciones (js/animations.js)
 * Controla:
 * 1. La Masita Anfitriona (idle, nerviosa con sudor, carrera con polvo + patada, alegría y shock).
 * 2. El Cubo 3D en CSS (rotación exacta hacia las 6 caras dibujadas y sombra elástica).
 * 3. La secuencia caótica «¡GAROZOOO!» (pausa dramática 350ms, screen-shake, banner y estampida).
 * 4. La celebración «WIN!» (desfile de la Masita de la trompeta, ronda feliz y confeti de grafito).
 */

export class GarozoAnimationDirector {
  constructor(elements, assetsMap) {
    this.el = elements;
    this.assets = assetsMap;
    this.rollSpinCounter = 0;

    // Orientaciones exactas (grados X, Y) para que cada cara del cubo 3D quede al frente
    // con una ligera inclinación isométrica para apreciar el volumen 3D del dado
    this.faceRotations = {
      1: { rx: -10, ry: 12 },
      2: { rx: -10, ry: -168 },
      3: { rx: -10, ry: -78 },
      4: { rx: -10, ry: 102 },
      5: { rx: -100, ry: 0 },
      6: { rx: 80, ry: 0 },
    };
  }

  /**
   * Resuelve la ruta de un sprite (permite usar data URIs embebidos o rutas relativas)
   */
  getSpriteUrl(key) {
    return (this.assets && this.assets[key]) || key;
  }

  /**
   * Configura el estado de reposo o nerviosismo de la Masita Anfitriona según la racha
   */
  updateHostMood(rollStreak = 0) {
    const { hostImg, hostDust, hostSweat } = this.el;
    if (!hostImg) return;

    hostImg.classList.remove('state-kick', 'state-happy', 'state-dead', 'state-idle', 'state-nervous');
    if (hostDust) hostDust.classList.remove('is-active');

    if (rollStreak >= 3) {
      hostImg.src = this.getSpriteUrl('masita_nervous');
      hostImg.classList.add('state-nervous');
      if (hostSweat) hostSweat.classList.add('is-active');
    } else {
      hostImg.src = this.getSpriteUrl('masita_idle');
      hostImg.classList.add('state-idle');
      if (hostSweat) hostSweat.classList.remove('is-active');
    }
  }

  /**
   * Ejecuta la coreografía completa de tirada:
   * 1. La Masita corre con nube de polvo y patea el dado.
   * 2. El cubo 3D salta por el aire y gira en X, Y, Z hasta aterrizar en `faceValue` (1..6).
   * 3. Invoca `onLanded()` al finalizar el aterrizaje.
   */
  playRollSequence(faceValue, onLanded) {
    const { hostImg, hostDust, hostSweat, diceScene, diceCube, diceShadow } = this.el;

    // 1. Masita corre y lanza la patada
    if (hostSweat) hostSweat.classList.remove('is-active');
    if (hostImg) {
      hostImg.classList.remove('state-idle', 'state-nervous', 'state-happy', 'state-dead', 'state-kick');
      hostImg.src = this.getSpriteUrl('masita_run');
      void hostImg.offsetWidth; // reflow para reiniciar animación
      hostImg.classList.add('state-kick');
    }

    if (hostDust) {
      hostDust.classList.remove('is-active');
      void hostDust.offsetWidth;
      hostDust.classList.add('is-active');
    }

    // 2. A los 160ms (momento del impacto de la patada), el dado 3D despega y rota
    setTimeout(() => {
      this.rollSpinCounter += 1;
      const target = this.faceRotations[faceValue] || this.faceRotations[1];

      // Añadimos vueltas completas (360 * k) para que el cubo siempre gire con energía
      const extraX = this.rollSpinCounter * 720;
      const extraY = this.rollSpinCounter * 1080;

      if (diceScene) {
        diceScene.classList.remove('is-jumping');
        void diceScene.offsetWidth;
        diceScene.classList.add('is-jumping');
      }

      if (diceShadow) {
        diceShadow.classList.remove('is-jumping');
        void diceShadow.offsetWidth;
        diceShadow.classList.add('is-jumping');
      }

      if (diceCube) {
        diceCube.style.transform = `rotateX(${target.rx - extraX}deg) rotateY(${target.ry + extraY}deg)`;
      }
    }, 160);

    // 3. Aterrizaje del dado a los 900ms
    setTimeout(() => {
      if (typeof onLanded === 'function') {
        onLanded();
      }
    }, 900);
  }

  /**
   * Secuencia de Plantarse: Masita salta feliz y partículas de puntos viajan al marcador
   */
  playBankSequence(bankedPoints, activeCardEl, onComplete) {
    const { hostImg, hostSweat, turnPointsEl } = this.el;

    if (hostSweat) hostSweat.classList.remove('is-active');
    if (hostImg) {
      hostImg.classList.remove('state-idle', 'state-nervous', 'state-kick', 'state-dead');
      hostImg.src = this.getSpriteUrl('masita_happy');
      hostImg.classList.add('state-happy');
    }

    // Lanzar partícula flotante desde el contador central hacia la tarjeta del jugador activo
    if (turnPointsEl && activeCardEl) {
      const startRect = turnPointsEl.getBoundingClientRect();
      const endRect = activeCardEl.getBoundingClientRect();

      const particle = document.createElement('div');
      particle.className = 'floating-score-particle';
      particle.textContent = `+${bankedPoints} PTS`;
      particle.style.left = `${startRect.left + startRect.width / 2 - 40}px`;
      particle.style.top = `${startRect.top}px`;
      document.body.appendChild(particle);

      requestAnimationFrame(() => {
        const dx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
        const dy = endRect.top + endRect.height / 2 - startRect.top;
        particle.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.75)`;
        particle.style.opacity = '0.15';
      });

      setTimeout(() => {
        particle.remove();
      }, 680);
    }

    setTimeout(() => {
      if (typeof onComplete === 'function') onComplete();
    }, 780);
  }

  /**
   * Secuencia «¡GAROZOOO!» cuando sale un 1:
   * - Pausa dramática de 350ms con Masita anfitriona en shock (`panic_dead.png`).
   * - Caída de `banner_garozo.png` + temblor de pantalla.
   * - Estampida caótica de 9 Masitas cruzando la pantalla con 4 patrones aleatorios (~2.2s).
   */
  playGarozoStampede(lostPoints, onComplete) {
    const {
      appShell,
      hostImg,
      hostSweat,
      garozoOverlay,
      garozoBanner,
      garozoSubtitle,
      stampedeLane,
    } = this.el;

    // 1. Pausa dramática de 350ms con la Masita Anfitriona congelada en shock
    if (hostSweat) hostSweat.classList.remove('is-active');
    if (hostImg) {
      hostImg.classList.remove('state-idle', 'state-nervous', 'state-kick', 'state-happy');
      hostImg.src = this.getSpriteUrl('panic_dead');
      void hostImg.offsetWidth;
      hostImg.classList.add('state-dead');
    }

    setTimeout(() => {
      // 2. Temblor de pantalla + Banner "¡GAROZOOO!"
      if (appShell) {
        appShell.classList.remove('screen-shake-active');
        void appShell.offsetWidth;
        appShell.classList.add('screen-shake-active');
      }

      if (garozoSubtitle) {
        garozoSubtitle.textContent =
          lostPoints > 0
            ? `¡SACÓ UN 1! Pierde ${lostPoints} pts y pasa el turno`
            : '¡SACÓ UN 1! Pasa el turno';
      }

      if (garozoOverlay) {
        garozoOverlay.classList.add('is-visible');
      }

      if (garozoBanner) {
        garozoBanner.classList.remove('slam-in');
        void garozoBanner.offsetWidth;
        garozoBanner.classList.add('slam-in');
      }

      // 3. Generar estampida caótica de 9 Masitas con los 4 patrones de movimiento
      if (stampedeLane) {
        stampedeLane.innerHTML = '';
        const panicSprites = [
          'panic_scream',
          'panic_fall',
          'panic_crash',
          'panic_dizzy',
          'panic_dead',
        ];
        const patterns = [
          'stampedeRunLTR',
          'stampedeRunRTL',
          'stampedeTumbleLTR',
          'stampedeSlideRTL',
        ];

        const count = 9;
        for (let i = 0; i < count; i++) {
          const img = document.createElement('img');
          const spriteKey = panicSprites[i % panicSprites.length];
          const patternName = patterns[i % patterns.length];

          img.src = this.getSpriteUrl(spriteKey);
          img.className = 'stampede-runner';

          // Distribuir verticalmente entre el 28% y el 80% de la pantalla
          const topPct = 28 + ((i * 17) % 52);
          const duration = 1.15 + (i % 3) * 0.22;
          const delay = (i * 0.09).toFixed(2);
          const size = 96 + (i % 3) * 18;

          img.style.top = `${topPct}vh`;
          img.style.width = `${size}px`;
          img.style.height = `${size}px`;
          img.style.animation = `${patternName} ${duration}s cubic-bezier(0.25, 0.8, 0.4, 1) ${delay}s forwards`;

          stampedeLane.appendChild(img);
        }
      }
    }, 350);

    // 4. Finalizar secuencia ágil a los 2250ms y ceder el turno
    setTimeout(() => {
      if (garozoOverlay) {
        garozoOverlay.classList.remove('is-visible');
      }
      if (stampedeLane) {
        stampedeLane.innerHTML = '';
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 2250);
  }

  /**
   * Genera confeti de papel y grafito en el escenario de victoria
   */
  spawnWinConfetti(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll('.sketch-confetti-piece').forEach((n) => n.remove());

    const colors = ['#ffe270', '#ffbfa8', '#b8f2d0', '#bde0fe', '#221e1b', '#fdfaf1'];
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('span');
      piece.className = 'sketch-confetti-piece';
      piece.style.left = `${(i * 19) % 96}%`;
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.animationDelay = `${(i * 0.11).toFixed(2)}s`;
      piece.style.setProperty('--drift', `${(i % 2 === 0 ? 1 : -1) * (15 + (i % 25))}px`);
      containerEl.appendChild(piece);
    }
  }
}
