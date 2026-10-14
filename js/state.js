/**
 * GAROZO! Party Game — Motor de Estado Desacoplado (state.js)
 * Implementa las reglas de Pig / Garozo con arquitectura basada en eventos,
 * lista para conexión en interfaz local o sincronización vía WebSockets.
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
  { id: 'classic', name: 'Grafito', tint: '#ffe270', badge: '#2c2623' },
  { id: 'coral',   name: 'Coral',   tint: '#ffbfa8', badge: '#d94e34' },
  { id: 'mint',    name: 'Menta',   tint: '#b8f2d0', badge: '#248f59' },
  { id: 'sky',     name: 'Cielo',   tint: '#bde0fe', badge: '#256eff' },
  { id: 'lilac',   name: 'Lavanda', tint: '#e2cfea', badge: '#7b3f9e' },
  { id: 'peach',   name: 'Durazno', tint: '#ffd89b', badge: '#d97706' },
  { id: 'berry',   name: 'Frambuesa', tint: '#ffc2d1', badge: '#c9184a' },
  { id: 'lime',    name: 'Limón',   tint: '#d9f99d', badge: '#4d7c0f' },
];

export class GarozoStateEngine {
  constructor() {
    this.state = GAME_STATES.IDLE;
    this.targetScore = 100;
    this.players = [
      { id: 0, name: 'JUAN', savedScore: 0, palette: PLAYER_PALETTES[0], garozos: 0, maxStreak: 0 },
      { id: 1, name: 'ANA',  savedScore: 0, palette: PLAYER_PALETTES[1], garozos: 0, maxStreak: 0 },
      { id: 2, name: 'MATEO', savedScore: 0, palette: PLAYER_PALETTES[2], garozos: 0, maxStreak: 0 },
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
  startNewGame({ playerNames = ['JUAN', 'ANA'], targetScore = 100 } = {}) {
    const validNames = playerNames
      .map((n) => String(n || '').trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 8);

    while (validNames.length < 2) {
      validNames.push(`JUGADOR ${validNames.length + 1}`);
    }

    this.targetScore = Math.max(10, Number(targetScore) || 100);
    this.players = validNames.map((name, idx) => ({
      id: idx,
      name: name.slice(0, 12),
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
      // ¡GAROZO! Pierde todos los puntos acumulados en el turno
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

    // Regla de victoria inmediata en turno activo
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
   * Devuelve una instantánea serializable del estado (compatible con WebSockets)
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
