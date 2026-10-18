/**
 * js/state.js
 * Motor determinista y desacoplado de reglas y estado para "GAROZO! party game".
 * Diseñado con arquitectura de eventos y preparado para multijugador online.
 */

class GarozoGameState {
  constructor() {
    this.players = [];
    this.targetScore = 100;
    this.activePlayerIndex = 0;
    this.provisionalPoints = 0;
    this.turnStreak = 0; // Número de tiradas exitosas seguidas en el turno
    this.lastRoll = null;
    this.status = 'CONFIG'; // 'CONFIG', 'PLAYING', 'ROLLING', 'GAROZO', 'BANKING', 'GAME_OVER'
    this.winner = null;
    
    // Sistema de eventos para desacoplar de UI / Audio / Red
    this.listeners = {
      stateChange: [],
      rollStart: [],
      rollResult: [],
      garozo: [],
      bank: [],
      win: [],
      turnChange: []
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data, this.getSnapshot());
        } catch (err) {
          console.error(`Error en listener de evento ${event}:`, err);
        }
      });
    }
  }

  /**
   * Configura e inicializa una nueva partida
   * @param {Array<string>} playerNames - Lista de nombres de 2 a 8 jugadores
   * @param {number} targetScore - Meta de puntos (ej. 50, 100, 200...)
   */
  initGame(playerNames, targetScore = 100) {
    if (!playerNames || playerNames.length < 2 || playerNames.length > 8) {
      throw new Error("El juego requiere entre 2 y 8 jugadores");
    }

    const defaultColors = [
      '#ffe270', // Amarillo marcador clásico
      '#99e2b4', // Verde menta pastel
      '#a2d2ff', // Celeste cuaderno
      '#ffafcc', // Rosa chicle
      '#ffc6ff', // Lila suave
      '#ffd166', // Naranja pastel
      '#cbf3f0', // Turquesa hielo
      '#ffccd5'  // Coral pastel
    ];

    this.players = playerNames.map((name, idx) => ({
      id: `player_${idx + 1}`,
      name: name.trim() || `Jugador ${idx + 1}`,
      color: defaultColors[idx % defaultColors.length],
      savedPoints: 0,
      rollsHistory: []
    }));

    this.targetScore = Math.max(10, parseInt(targetScore, 10) || 100);
    this.activePlayerIndex = 0;
    this.provisionalPoints = 0;
    this.turnStreak = 0;
    this.lastRoll = null;
    this.winner = null;
    this.status = 'PLAYING';

    this.emit('stateChange', { action: 'GAME_STARTED' });
    this.emit('turnChange', { player: this.getActivePlayer() });
  }

  getActivePlayer() {
    return this.players[this.activePlayerIndex] || null;
  }

  /**
   * Ejecuta una tirada de dado
   * @param {number|null} forcedValue - Opcional para pruebas o sincronización online (1 a 6)
   */
  rollDice(forcedValue = null) {
    if (this.status !== 'PLAYING') {
      return { success: false, reason: 'Estado no permite tirar' };
    }

    const player = this.getActivePlayer();
    if (!player) return { success: false, reason: 'No hay jugador activo' };

    this.status = 'ROLLING';
    this.emit('rollStart', { player });

    // Determinación del dado (1 a 6)
    const diceValue = (forcedValue >= 1 && forcedValue <= 6)
      ? forcedValue 
      : Math.floor(Math.random() * 6) + 1;

    this.lastRoll = diceValue;
    player.rollsHistory.push(diceValue);

    // Si saca un 1: ¡GAROZOOO!
    if (diceValue === 1) {
      const lostPoints = this.provisionalPoints;
      this.provisionalPoints = 0;
      this.turnStreak = 0;
      this.status = 'GAROZO';

      this.emit('rollResult', { diceValue, isGarozo: true, lostPoints, player });
      this.emit('garozo', { lostPoints, player });

      return {
        success: true,
        diceValue: 1,
        isGarozo: true,
        lostPoints
      };
    }

    // Si saca entre 2 y 6: suma a puntos provisionales
    this.provisionalPoints += diceValue;
    this.turnStreak += 1;
    this.status = 'PLAYING';

    // REGLA CRÍTICA: Comprobación de Victoria Inmediata
    const totalPotential = player.savedPoints + this.provisionalPoints;
    if (totalPotential >= this.targetScore) {
      player.savedPoints = totalPotential;
      this.provisionalPoints = 0;
      this.status = 'GAME_OVER';
      this.winner = player;

      this.emit('rollResult', { diceValue, isGarozo: false, addedPoints: diceValue, player });
      this.emit('win', { winner: player, finalScore: player.savedPoints });
      this.emit('stateChange', { action: 'GAME_OVER' });

      return {
        success: true,
        diceValue,
        isWin: true,
        winner: player
      };
    }

    this.emit('rollResult', { 
      diceValue, 
      isGarozo: false, 
      addedPoints: diceValue, 
      player,
      turnStreak: this.turnStreak,
      provisionalPoints: this.provisionalPoints
    });
    this.emit('stateChange', { action: 'POINTS_ADDED' });

    return {
      success: true,
      diceValue,
      isGarozo: false,
      addedPoints: diceValue,
      provisionalPoints: this.provisionalPoints
    };
  }

  /**
   * Finaliza la secuencia de Garozo y pasa el turno
   */
  finishGarozoSequence() {
    if (this.status !== 'GAROZO') return;
    this.passTurn();
  }

  /**
   * El jugador decide plantarse y asegurar sus puntos provisionales
   */
  bankPoints() {
    if (this.status !== 'PLAYING') {
      return { success: false, reason: 'No se puede plantear en este estado' };
    }
    if (this.provisionalPoints === 0) {
      return { success: false, reason: 'No hay puntos para guardar' };
    }

    const player = this.getActivePlayer();
    const securedPoints = this.provisionalPoints;
    player.savedPoints += securedPoints;
    this.provisionalPoints = 0;
    this.turnStreak = 0;
    this.status = 'BANKING';

    this.emit('bank', { player, securedPoints, totalSaved: player.savedPoints });

    // Verificar victoria tras plantarse (por redundancia)
    if (player.savedPoints >= this.targetScore) {
      this.status = 'GAME_OVER';
      this.winner = player;
      this.emit('win', { winner: player, finalScore: player.savedPoints });
      this.emit('stateChange', { action: 'GAME_OVER' });
      return { success: true, isWin: true, winner: player };
    }

    return {
      success: true,
      player,
      securedPoints
    };
  }

  /**
   * Finaliza la animación de guardado y pasa el turno
   */
  finishBankSequence() {
    if (this.status !== 'BANKING') return;
    this.passTurn();
  }

  /**
   * Pasa el turno al siguiente jugador de la ronda
   */
  passTurn() {
    if (this.status === 'GAME_OVER') return;

    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    this.provisionalPoints = 0;
    this.turnStreak = 0;
    this.lastRoll = null;
    this.status = 'PLAYING';

    const nextPlayer = this.getActivePlayer();
    this.emit('turnChange', { player: nextPlayer });
    this.emit('stateChange', { action: 'TURN_CHANGED' });
  }

  /**
   * Reinicia la partida con los mismos jugadores
   */
  rematch() {
    if (!this.players || this.players.length === 0) return;
    const names = this.players.map(p => p.name);
    this.initGame(names, this.targetScore);
  }

  /**
   * Obtiene una copia completa e inmutable del estado
   */
  getSnapshot() {
    return {
      status: this.status,
      targetScore: this.targetScore,
      activePlayerIndex: this.activePlayerIndex,
      activePlayer: this.getActivePlayer(),
      provisionalPoints: this.provisionalPoints,
      turnStreak: this.turnStreak,
      lastRoll: this.lastRoll,
      winner: this.winner,
      players: this.players.map(p => ({ ...p, rollsHistory: [...p.rollsHistory] }))
    };
  }

  /**
   * Serialización JSON para sincronización Online (WebSockets / Firebase)
   */
  serialize() {
    return JSON.stringify(this.getSnapshot());
  }

  loadState(stateObj) {
    if (typeof stateObj === 'string') stateObj = JSON.parse(stateObj);
    this.players = stateObj.players || [];
    this.targetScore = stateObj.targetScore || 100;
    this.activePlayerIndex = stateObj.activePlayerIndex || 0;
    this.provisionalPoints = stateObj.provisionalPoints || 0;
    this.turnStreak = stateObj.turnStreak || 0;
    this.lastRoll = stateObj.lastRoll || null;
    this.status = stateObj.status || 'CONFIG';
    this.winner = stateObj.winner || null;
    this.emit('stateChange', { action: 'STATE_LOADED' });
  }
}

// Exportación compatible tanto con módulos ES como script global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GarozoGameState;
}
