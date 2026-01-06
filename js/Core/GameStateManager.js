/*
    File: js/GameStateManager.js
    Description: Implements a Finite State Machine (FSM) to manage game states securely.
*/

export const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

export class GameStateManager {
    constructor() {
        this._state = STATE.MENU; 
    }

    getState() {
        return this._state;
    }

    isMenu() {
        return this._state === STATE.MENU;
    }

    isPlaying() {
        return this._state === STATE.PLAYING;
    }

    isPaused() {
        return this._state === STATE.PAUSED;
    }

    isGameOver() {
        return this._state === STATE.GAME_OVER;
    }

    /* --- State Transitions (Actions) --- */

    /**
     * Transitions to PLAYING.
     * Updated for QA: Allows restarting even if game is PAUSED.
     * @returns {boolean} True if transition was successful.
     */
    startGame() {
        if (this._state === STATE.MENU || this._state === STATE.GAME_OVER || this._state === STATE.PAUSED) {
            this._state = STATE.PLAYING;
            return true;
        }
        console.warn(`Invalid State Transition: Cannot start game from ${this._state}`);
        return false;
    }

    pauseGame() {
        if (this._state === STATE.PLAYING) {
            this._state = STATE.PAUSED;
            return true;
        }
        return false;
    }

    resumeGame() {
        if (this._state === STATE.PAUSED) {
            this._state = STATE.PLAYING;
            return true;
        }
        return false;
    }

    endGame() {
        if (this._state === STATE.PLAYING || this._state === STATE.PAUSED) {
            this._state = STATE.GAME_OVER;
            return true;
        }
        return false;
    }

    resetToMenu() {
        this._state = STATE.MENU;
    }
}