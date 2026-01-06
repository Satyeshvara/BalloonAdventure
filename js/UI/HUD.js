/*
    File: js/UI/HUD.js
    Description: Manages the Heads-Up Display (Score, Accuracy, FPS).
                 Subscribes to EventManager to react to game changes automatically.
    Dependencies: EventManager
*/

import { eventBus, EVENTS } from '../Core/EventManager.js';

// Private variables to hold DOM references
let scoreEl = null;
let accuracyEl = null;
let fpsEl = null;
let hudBoxEl = null;

/**
 * Initializes the HUD module.
 * Binds DOM elements and subscribes to relevant Game Events.
 * 
 * @param {object} elements - Dictionary of DOM elements { score, accuracy, fps, hudBox, hudRadios }
 */
export function init(elements) {
    // 1. Store DOM References
    scoreEl = elements.score;
    accuracyEl = elements.accuracy;
    fpsEl = elements.fps;
    hudBoxEl = elements.hudBox;

    // 2. Setup Position Toggles (Left/Right)
    // This logic remains local as it's purely UI preference
    if (elements.hudRadios) {
        elements.hudRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'left') {
                    hudBoxEl.classList.add('left');
                    hudBoxEl.classList.remove('right');
                } else {
                    hudBoxEl.classList.add('right');
                    hudBoxEl.classList.remove('left');
                }
            });
        });
    }

    // 3. Subscribe to Events (Decoupled Architecture)
    _setupEventListeners();
}

/**
 * Internal helper to bind EventBus events to UI updates.
 */
function _setupEventListeners() {
    // A. Handle Score Updates (from Main.js)
    eventBus.on(EVENTS.SCORE_UPDATED, (newScore) => {
        if (scoreEl) scoreEl.innerText = newScore;
    });

    // B. Handle Gesture Accuracy (from InputManager.js)
    eventBus.on(EVENTS.GESTURE_ACCURACY, (accuracy) => {
        if (accuracyEl) accuracyEl.innerText = `${accuracy}%`;
    });

    // C. Handle Game Resets (Start/Restart)
    const resetDisplay = () => {
        if (scoreEl) scoreEl.innerText = '0';
        if (accuracyEl) accuracyEl.innerText = '0%';
        if (fpsEl) fpsEl.innerText = '0';
    };

    eventBus.on(EVENTS.GAME_START, resetDisplay);
    eventBus.on(EVENTS.GAME_RESTART, resetDisplay);
}

/**
 * Public Method: Updates FPS.
 * Kept as a direct export because FPS updates are extremely frequent (4x per second),
 * and creating an event object for every FPS tick might be slight overkill, 
 * though Main.js can choose to use this OR an event.
 * 
 * @param {number} fps 
 */
export function updateFPS(fps) {
    if (fpsEl) fpsEl.innerText = Math.round(fps);
}