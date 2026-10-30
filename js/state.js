/**
 * GAROZO! Party Game — Motor de Estado Desacoplado (state.js)
 * Implementa las reglas de Pig / Garozo con arquitectura basada en eventos,
 * reutilizando la lógica de turnos, dado, victoria inmediata y derrota.
 */

export const GAME_STATES = Object.freeze({
  IDLE: 'IDLE',
  PLAYER_TURN: 'PLAYER_TURN',
  ROLLING: 'ROLLING',
  GAROZO: 'GAROZO',
  BANKING: 'BANKING',
  GAME_OVER: 'GAME_OVER',
});

export const PLAYER_PALETTES = [
  { id: 'red',    name: 'Rojo',      dot: '#e63946', tint: '#ffd6d9', badge: '#b81d2a' },
  { id: 'blue',   name: 'Azul',      dot: '#256eff', tint: '#d6e6ff', badge: '#1b4fd8' },
  { id: 'green',  name: 'Verde',     dot: '#52b788', tint: '#d8f3dc', badge: '#2d6a4f' },
  { id: 'yellow', name: 'Amarillo',  dot: '#f6d34c', tint: '#fff3b0', badge: '#b48300' },
  { id: 'purple', name: 'Morado',    dot: '#9b5de5', tint: '#ebd9fc', badge: '#6a2c91' },
  { id: 'orange', name: 'Naranja',   dot: '#f77f00', tint: '#ffe5c2', badge: '#c25e00' },
  { id: 'pink',   name: 'Rosa',      dot: '#ff5d8f', tint: '#ffd9e6', badge: '#b5174e' },
  { id: 'teal',   name: 'Turquesa',  dot: '#00bbf9', tint: '#ccf2ff', badge: '#0077a8' },
];

/**
 * Normaliza una lista de nombres (2 a 8 jugadores):
 * - Si un campo está vacío, asigna "Jugador N".
 * - Si hay nombres duplicados, los distingue visualmente con sufijo "(2)", "(3)", etc.,
 *   además de su color e identificador único.
 */
export function normalizePlayerNames(rawNames = []) {
  const sliced = Array.isArray(rawNames) ? rawNames.slice(0, 8) : [];
  while (sliced.length < 2) {
    sliced.push('');
  }

  const baseNames = sliced.map((raw, idx) => {
    const trimmed = String(raw ?? '').trim();
    return trimmed.length > 0 ? trimmed.slice(0, 18) : `Jugador ${idx + 1}`;
  });

  // Distinguir duplicados (case-insensitive)
  const counts = new Map();
  return baseNames.map((name) => {
    const key = name.toLowerCase();
    const seen = counts.get(key) || 0;
    counts.set(key, seen + 1);
    if (seen === 0) return name;
    return `${name} (${seen + 1})`;
  });
}

/**
 * Valida y normaliza la meta de puntos como entero positivo dentro de límites razonables (10..9999).
 */
export function sanitizeTargetScore(rawTarget, fallback = 100) {
  const parsed = parseInt(String(rawTarget ?? '').trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(9999, Math.max(10, parsed));
}

export class GarozoStateEngine {
  constructor() {
    this.state = GAME_STATES.IDLE;
    this.targetScore = 100;
    this.players = [
      { id: 0, name: 'Jugador 1', savedScore: 0, palette: PLAYER_PALETTES[0], garozos: 0, maxStreak: 0 },
      { id: 1, name: 'Jugador 2', savedScore: 0, palette: PLAYER_PALETTES[1], garozos: 0, maxStreak: 0 },
    ];
    this.currentPlayerIndex = 0;
    this.turnScore = 0;
    this.rollStreak = 0;
    this.lastDiceValue = 1;
    this.winner = null;
    this.history = [];

    this.listeners = {
      onRoll: [],
      onGarozo: [],
      onBank: [],
      onWin: [],
      onTurnChange: [],
      onStateChange: [],
    };
  }

  /**
   * Suscribe un callback a un evento del motor (`onRoll`, `onGarozo`, `onBank`, `onWin`, `onTurnChange`, `onStateChange`)
   */
  on(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].push(callback);
    }
    return () => {
      if (this.listeners[eventName]) {
        this.listeners[eventName] = this.listeners[eventName].filter((cb) => cb !== callback);
      }
    };
  }

  emit(eventName, payload) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((cb) => {
        try {
          cb(payload, this.getSnapshot());
        } catch (err) {
          console.error(`[GarozoStateEngine] Error en listener ${eventName}:`, err);
        }
      });
    }
  }

  setState(nextState) {
    const prevState = this.state;
    this.state = nextState;
    this.emit('onStateChange', { prevState, nextState });
  }

  /**
   * Configura e inicia una nueva partida (2 a 8 jugadores, meta configurable)
   */
  startNewGame({ playerNames = ['Jugador 1', 'Jugador 2'], targetScore = 100 } = {}) {
    const resolvedNames = normalizePlayerNames(playerNames);
    this.targetScore = sanitizeTargetScore(targetScore, 100);

    this.players = resolvedNames.map((name, idx) => ({
      id: idx,
      name,
      savedScore: 0,
      palette: PLAYER_PALETTES[idx % PLAYER_PALETTES.length],
      garozos: 0,
      maxStreak: 0,
    }));

    this.currentPlayerIndex = 0;
    this.turnScore = 0;
    this.rollStreak = 0;
    this.lastDiceValue = 5;
    this.winner = null;
    this.history = [];

    this.setState(GAME_STATES.PLAYER_TURN);
    this.emit('onTurnChange', {
      currentPlayer: this.getCurrentPlayer(),
      currentPlayerIndex: this.currentPlayerIndex,
      reason: 'GAME_START',
    });
  }

  /**
   * Reinicia la partida actual con los mismos jugadores y meta (Revancha)
   */
  rematch() {
    const names = this.players.map((p) => p.name);
    this.startNewGame({ playerNames: names, targetScore: this.targetScore });
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex] || this.players[0];
  }

  /**
   * Inicia una tirada de dado. Bloquea anti-spam si no está en PLAYER_TURN.
   * Permite inyectar un `forcedValue` (1..6) para pruebas o servidor autoritativo.
   */
  requestRoll(forcedValue = null) {
    if (this.state !== GAME_STATES.PLAYER_TURN) {
      return null;
    }

    this.setState(GAME_STATES.ROLLING);

    const value =
      forcedValue !== null && forcedValue >= 1 && forcedValue <= 6
        ? Math.floor(forcedValue)
        : Math.floor(Math.random() * 6) + 1;

    this.lastDiceValue = value;
    const player = this.getCurrentPlayer();

    this.emit('onRoll', {
      player,
      value,
      rollStreak: value === 1 ? 0 : this.rollStreak + 1,
      projectedTurnScore: value === 1 ? 0 : this.turnScore + value,
      projectedTotal: value === 1 ? player.savedScore : player.savedScore + this.turnScore + value,
    });

    return value;
  }

  /**
   * Llamado por el orquestador visual cuando el dado 3D termina de aterrizar.
   * Evalúa el resultado de la tirada según las reglas de Pig / Garozo.
   */
  resolveRollOutcome() {
    if (this.state !== GAME_STATES.ROLLING) return;

    const value = this.lastDiceValue;
    const player = this.getCurrentPlayer();

    if (value === 1) {
      // ¡GAROZO! Pierde todos los puntos provisionales del turno; conserva los guardados
      const lostPoints = this.turnScore;
      this.turnScore = 0;
      this.rollStreak = 0;
      player.garozos += 1;

      this.history.unshift({
        type: 'GAROZO',
        playerName: player.name,
        lostPoints,
        timestamp: Date.now(),
      });

      this.setState(GAME_STATES.GAROZO);
      this.emit('onGarozo', {
        player,
        lostPoints,
      });
      return;
    }

    // Tirada exitosa (2..6)
    this.turnScore += value;
    this.rollStreak += 1;
    if (this.rollStreak > player.maxStreak) {
      player.maxStreak = this.rollStreak;
    }

    const totalIfBanked = player.savedScore + this.turnScore;

    // Regla 5: Victoria inmediata en turno activo cuando guardados + provisionales >= meta
    if (totalIfBanked >= this.targetScore) {
      const bankedPoints = this.turnScore;
      player.savedScore = totalIfBanked;
      this.turnScore = 0;
      this.winner = player;

      this.history.unshift({
        type: 'WIN',
        playerName: player.name,
        bankedPoints,
        finalScore: player.savedScore,
        timestamp: Date.now(),
      });

      this.setState(GAME_STATES.GAME_OVER);
      this.emit('onWin', {
        winner: player,
        bankedPoints,
        finalScore: player.savedScore,
        standings: this.getStandings(),
      });
      return;
    }

    // Continúa el turno del jugador activo
    this.setState(GAME_STATES.PLAYER_TURN);
  }

  /**
   * El jugador decide Plantarse y asegurar los puntos provisionales del turno.
   */
  requestBank() {
    if (this.state !== GAME_STATES.PLAYER_TURN || this.turnScore <= 0) {
      return false;
    }

    this.setState(GAME_STATES.BANKING);
    const player = this.getCurrentPlayer();
    const bankedPoints = this.turnScore;
    const previousSaved = player.savedScore;
    player.savedScore += bankedPoints;
    this.turnScore = 0;
    this.rollStreak = 0;

    this.history.unshift({
      type: 'BANK',
      playerName: player.name,
      bankedPoints,
      newTotal: player.savedScore,
      timestamp: Date.now(),
    });

    this.emit('onBank', {
      player,
      bankedPoints,
      previousSaved,
      newTotal: player.savedScore,
    });

    if (player.savedScore >= this.targetScore) {
      this.winner = player;
      this.setState(GAME_STATES.GAME_OVER);
      this.emit('onWin', {
        winner: player,
        bankedPoints,
        finalScore: player.savedScore,
        standings: this.getStandings(),
      });
      return true;
    }

    return true;
  }

  /**
   * Avanza al siguiente jugador tras completar la animación de GAROZO o BANKING.
   */
  advanceTurn() {
    if (this.state === GAME_STATES.GAME_OVER) return;

    const prevPlayer = this.getCurrentPlayer();
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnScore = 0;
    this.rollStreak = 0;

    this.setState(GAME_STATES.PLAYER_TURN);
    this.emit('onTurnChange', {
      previousPlayer: prevPlayer,
      currentPlayer: this.getCurrentPlayer(),
      currentPlayerIndex: this.currentPlayerIndex,
      reason: 'TURN_END',
    });
  }

  /**
   * Devuelve la tabla de posiciones ordenada por puntaje total
   */
  getStandings() {
    return [...this.players].sort((a, b) => b.savedScore - a.savedScore);
  }

  /**
   * Devuelve una instantánea serializable del estado
   */
  getSnapshot() {
    const current = this.getCurrentPlayer();
    return {
      state: this.state,
      targetScore: this.targetScore,
      players: this.players.map((p) => ({ ...p })),
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayer: current ? { ...current } : null,
      turnScore: this.turnScore,
      rollStreak: this.rollStreak,
      lastDiceValue: this.lastDiceValue,
      projectedScore: current ? current.savedScore + this.turnScore : 0,
      winner: this.winner ? { ...this.winner } : null,
    };
  }
}
