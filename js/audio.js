/**
 * GAROZO! Party Game — Motor de Audio Sintetizado y Háptica (audio.js)
 * 100% Web Audio API nativa + SpeechSynthesis ("¡Garozo!") + navigator.vibrate.
 * Sin dependencias ni archivos de audio externos pesados.
 */

export class GarozoAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.noiseBuffer = null;

    try {
      const savedMute = localStorage.getItem('garozo_muted');
      if (savedMute === 'true') this.isMuted = true;
    } catch (_) {
      // Ignorar errores de almacenamiento en sandbox
    }

    // Escala pentatónica mayor ascendente (Hz) para rachas de puntos
    this.pentatonicScale = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50, // C6
      1174.66, // D6
      1318.51, // E6
      1567.98, // G6
      1760.00, // A6
    ];
  }

  /**
   * Inicializa o reanuda el AudioContext tras interacción del usuario
   */
  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('garozo_muted', String(this.isMuted));
    } catch (_) {}
    if (!this.isMuted) {
      this.unlock();
      this.playPaperTick(700, 0.08);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.isMuted;
  }

  /**
   * Ejecuta retroalimentación háptica en móviles compatibles
   */
  vibrate(pattern) {
    if (this.isMuted) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }

  /**
   * Sonido corto de fricción de papel / trazo de lápiz
   */
  playPaperTick(centerFreq = 1100, duration = 0.05, gainValue = 0.14, delay = 0) {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(3.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    src.start(now);
    src.stop(now + duration + 0.01);
  }

  /**
   * Carrera de la Masita (pasos en papel) + Patada elástica ("thump")
   */
  playRunAndKick() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    this.vibrate(30);

    // 3 pasos rápidos sobre papel antes de la patada
    this.playPaperTick(950, 0.045, 0.15, 0.0);
    this.playPaperTick(1220, 0.045, 0.18, 0.07);
    this.playPaperTick(1450, 0.05, 0.20, 0.14);

    // Impacto elástico "thump" de la patada a los 220ms
    const kickTime = this.ctx.currentTime + 0.22;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195, kickTime);
    osc.frequency.exponentialRampToValueAtTime(46, kickTime + 0.14);

    gain.gain.setValueAtTime(0.001, kickTime);
    gain.gain.linearRampToValueAtTime(0.45, kickTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, kickTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(kickTime);
    osc.stop(kickTime + 0.16);
  }

  /**
   * Rebotes del dado de madera/papel sincronizados con el giro 3D
   */
  playDiceBounce() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    const bounceTimes = [0.28, 0.46, 0.62, 0.76, 0.88];
    const bounceFreqs = [520, 640, 710, 580, 790];

    bounceTimes.forEach((offset, idx) => {
      const t = this.ctx.currentTime + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(bounceFreqs[idx], t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.045);

      const amp = 0.22 * Math.pow(0.82, idx);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.055);

      this.playPaperTick(1400 + idx * 120, 0.03, amp * 0.6, offset);
    });
  }

  /**
   * Sonido al sumar puntos (2..6): trazo de lápiz + escala pentatónica ascendente según racha
   */
  playScorePoints(streak = 1) {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    this.vibrate(20);

    const idx = Math.min(Math.max(0, streak - 1), this.pentatonicScale.length - 1);
    const baseFreq = this.pentatonicScale[idx];
    const now = this.ctx.currentTime;

    // Trazo rápido de grafito escribiendo los puntos
    this.playPaperTick(1600, 0.06, 0.14, 0.0);
    this.playPaperTick(1950, 0.05, 0.12, 0.05);

    // Nota principal alegre + armónico superior
    [1, 1.5].forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq * mult, now + i * 0.045);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 1.02, now + i * 0.045 + 0.18);

      const peak = i === 0 ? 0.28 : 0.14;
      gain.gain.setValueAtTime(0.001, now + i * 0.045);
      gain.gain.linearRampToValueAtTime(peak, now + i * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.24);
    });
  }

  /**
   * Sonido al Plantarse (asegurar puntos en la bolsa): tintineo y acorde mayor triunfal
   */
  playBank() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    this.vibrate([30, 30, 50]);

    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6
    const now = this.ctx.currentTime;

    chord.forEach((freq, i) => {
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.37);
    });
  }

  /**
   * ¡GAROZOOO! (Sacó un 1): golpe disonante, trombón cómico, chillidos de estampida y voz "¡Garozo!"
   */
  playGarozo() {
    if (this.isMuted) return;
    this.unlock();

    this.vibrate([80, 50, 180]);

    if (this.ctx) {
      const now = this.ctx.currentTime;

      // 1. Golpe disonante cómico ("boing/crunch" de choque)
      [155.56, 164.81, 220.0].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.48, now + 0.45);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      });

      // 2. Chillidos cómicos de las Masitas corriendo en estampida
      for (let i = 0; i < 4; i++) {
        const st = now + 0.32 + i * 0.22;
        const squeak = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();

        squeak.type = 'sine';
        const startF = 780 + (i % 2) * 240;
        squeak.frequency.setValueAtTime(startF, st);
        squeak.frequency.linearRampToValueAtTime(startF * 1.45, st + 0.08);
        squeak.frequency.exponentialRampToValueAtTime(startF * 0.75, st + 0.18);

        sGain.gain.setValueAtTime(0.001, st);
        sGain.gain.linearRampToValueAtTime(0.14, st + 0.02);
        sGain.gain.exponentialRampToValueAtTime(0.001, st + 0.19);

        squeak.connect(sGain);
        sGain.connect(this.ctx.destination);
        squeak.start(st);
        squeak.stop(st + 0.2);
      }
    }

    // 3. Síntesis de voz en español diciendo "¡Garozo!"
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance('¡Garozo!');
        utter.lang = 'es-ES';
        utter.pitch = 1.35;
        utter.rate = 1.08;
        utter.volume = 1.0;
        window.speechSynthesis.speak(utter);
      } catch (_) {}
    }
  }

  /**
   * Fanfarria triunfal de la Masita de la Trompeta al ganar la partida
   */
  playWinFanfare() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    this.vibrate([60, 40, 60, 40, 120, 60, 260]);

    // Melodía clásica de fanfarria de trompeta: G4 - C5 - E5 - G5 - E5 - G5!
    const notes = [
      { f: 392.00, t: 0.00, d: 0.14 }, // G4
      { f: 523.25, t: 0.15, d: 0.14 }, // C5
      { f: 659.25, t: 0.30, d: 0.14 }, // E5
      { f: 783.99, t: 0.45, d: 0.28 }, // G5
      { f: 659.25, t: 0.76, d: 0.14 }, // E5
      { f: 783.99, t: 0.92, d: 0.65 }, // G5 largo
    ];

    const now = this.ctx.currentTime;

    notes.forEach(({ f, t, d }) => {
      const start = now + t;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(f, start);
      osc2.frequency.setValueAtTime(f * 1.003, start);

      // Timbre cálido de trompeta con envolvente en el filtro
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, start);
      filter.frequency.linearRampToValueAtTime(2800, start + 0.04);
      filter.frequency.exponentialRampToValueAtTime(1400, start + d);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.24, start + 0.02);
      gain.gain.setValueAtTime(0.20, start + d * 0.75);
      gain.gain.exponentialRampToValueAtTime(0.001, start + d);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + d + 0.02);
      osc2.stop(start + d + 0.02);
    });
  }
}
