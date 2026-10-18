/**
 * js/audio.js
 * Motor sonoro y háptico autónomo para "GAROZO! party game".
 * Construido con Web Audio API, SpeechSynthesis cómica y navigator.vibrate.
 */

class GarozoAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('garozo_muted') === 'true';
    this.speechAvailable = 'speechSynthesis' in window;
    this.hapticsAvailable = 'vibrate' in navigator;
    
    // Pentatónica ascendente para racha de tiradas
    this.pentatonicFrequencies = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50 // C6
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('garozo_muted', this.isMuted ? 'true' : 'false');
    return this.isMuted;
  }

  vibrate(pattern) {
    if (this.isMuted || !this.hapticsAvailable) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignorar restricciones de dispositivo
    }
  }

  /**
   * Genera un pulso corto de ruido blanco filtrado (textura de papel)
   */
  createPaperNoise(duration = 0.15, filterFreq = 3000) {
    if (!this.ctx || this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Sonido de la carrera y patada de la Masita
   */
  playKick() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Fricción rápida de patitas en papel
    this.createPaperNoise(0.12, 2400);

    // 2. Boing/Thump elástico cómico de impacto
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.setValueAtTime(0.35, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now + 0.05);
    osc.stop(now + 0.30);
  }

  /**
   * Golpecitos de rebote del dado en la libreta
   */
  playDiceBounce(intensity = 1.0) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Golpecito seco de madera/papel
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 95 + Math.random() * 30;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    const vol = 0.25 * intensity;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);

    // Micro háptica en aterrizaje
    if (intensity > 0.8) {
      this.vibrate(30);
    }
  }

  /**
   * Suma de puntos: trazo de lápiz + nota musical según racha
   */
  playScoreAdd(streak = 1) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Rasquido de lápiz rápido
    this.createPaperNoise(0.08, 3800);

    // 2. Tono musical alegre ascendente
    const noteIdx = Math.min(streak - 1, this.pentatonicFrequencies.length - 1);
    const freq = this.pentatonicFrequencies[Math.max(0, noteIdx)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Armónico suave
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    gain2.gain.setValueAtTime(0.08, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  /**
   * Plantarse (Guardar puntos): sonido de saquito / tintineo y acorde alegre
   */
  playBank() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Campanillas en arpegio (Do Mayor 7 / C, E, G, B, C)
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.50];
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.18, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.38);
    });

    this.vibrate([40, 40, 80]);
  }

  /**
   * ¡GAROZOOO! (Sale un 1): Trombón triste + chillido de pánico + voz cómica
   */
  playGarozo() {
    this.init();
    if (this.isMuted) return;

    // Háptica de alarma
    this.vibrate([80, 50, 180]);

    if (this.ctx) {
      const now = this.ctx.currentTime;

      // 1. Trombón triste disonante cayendo en pitch
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      // Frecuencias desafinadas para choque cómico
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.linearRampToValueAtTime(140, now + 0.6);
      osc1.frequency.linearRampToValueAtTime(80, now + 1.2);

      osc2.frequency.setValueAtTime(228, now); // Ligero batimiento
      osc2.frequency.linearRampToValueAtTime(145, now + 0.6);
      osc2.frequency.linearRampToValueAtTime(76, now + 1.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 1.2);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.35);
      osc2.stop(now + 1.35);

      // 2. Pequeños chillidos de Masitas en estampida
      [0.2, 0.45, 0.75, 1.0].forEach((delay, idx) => {
        const squeak = this.ctx.createOscillator();
        const sqGain = this.ctx.createGain();
        squeak.type = 'sine';
        const startFreq = 800 + idx * 250;
        squeak.frequency.setValueAtTime(startFreq, now + delay);
        squeak.frequency.exponentialRampToValueAtTime(startFreq + 600, now + delay + 0.08);
        squeak.frequency.exponentialRampToValueAtTime(300, now + delay + 0.18);

        sqGain.gain.setValueAtTime(0.12, now + delay);
        sqGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

        squeak.connect(sqGain);
        sqGain.connect(this.ctx.destination);

        squeak.start(now + delay);
        squeak.stop(now + delay + 0.2);
      });
    }

    // 3. Voz cómica sintetizada "¡Garozo!"
    if (this.speechAvailable) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance("¡Garozo!");
        utter.lang = 'es-ES';
        utter.pitch = 1.7; // Voz aguda y cómica de Masita
        utter.rate = 1.25;
        utter.volume = 0.9;
        window.speechSynthesis.speak(utter);
      } catch (err) {
        // Fallback silencioso si el navegador bloquea audio
      }
    }
  }

  /**
   * Fanfarria de Victoria: Masita de la Trompeta
   */
  playWinFanfare() {
    this.init();
    if (this.isMuted) return;

    this.vibrate([100, 50, 100, 50, 200, 100, 300]);

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Melodía triunfal tipo fanfarria de trompeta:
    // Sol4, Do5, Mi5, Sol5, Mi5, Sol5 (sostenido con brillo)
    const melody = [
      { note: 392.00, start: 0.00, dur: 0.14 },
      { note: 523.25, start: 0.16, dur: 0.14 },
      { note: 659.25, start: 0.32, dur: 0.16 },
      { note: 783.99, start: 0.50, dur: 0.28 },
      { note: 659.25, start: 0.82, dur: 0.14 },
      { note: 783.99, start: 1.00, dur: 0.80 }
    ];

    melody.forEach(item => {
      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Timbre de trompeta / viento-metal
      osc.type = 'sawtooth';
      oscHarmonic.type = 'triangle';

      osc.frequency.setValueAtTime(item.note, now + item.start);
      oscHarmonic.frequency.setValueAtTime(item.note * 2, now + item.start);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(item.note * 2.5, now + item.start);
      filter.Q.value = 2.0;

      const tStart = now + item.start;
      const tEnd = tStart + item.dur;

      gain.gain.setValueAtTime(0.001, tStart);
      gain.gain.linearRampToValueAtTime(0.24, tStart + 0.03);
      gain.gain.setValueAtTime(0.22, tEnd - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, tEnd);

      osc.connect(filter);
      oscHarmonic.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(tStart);
      oscHarmonic.start(tStart);
      osc.stop(tEnd + 0.05);
      oscHarmonic.stop(tEnd + 0.05);
    });

    // Voz de celebración opcional
    if (this.speechAvailable) {
      setTimeout(() => {
        try {
          const utter = new SpeechSynthesisUtterance("¡Victoria!");
          utter.lang = 'es-ES';
          utter.pitch = 1.5;
          utter.rate = 1.1;
          window.speechSynthesis.speak(utter);
        } catch (e) {}
      }, 1200);
    }
  }
}

// Exportación global
window.GarozoAudio = GarozoAudio;
