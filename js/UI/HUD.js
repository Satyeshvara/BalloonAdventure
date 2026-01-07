/* --- START OF FILE js/UI/HUD.js --- */

/*
    File: js/UI/HUD.js
    Description: Manages the Heads-Up Display (Score, Accuracy, FPS, AI Stress).
    Refactor Status: Fixed "Unresponsive" bug by disabling CSS transition during JS animation loop.
*/

import { eventBus, EVENTS } from '../Core/EventManager.js';

// Private variables
let scoreEl = null,
    accuracyEl = null,
    fpsEl = null,
    scoreContainerEl = null, 
    statsContainerEl = null, // Maps to #statusMonitor DOM element
    stressCardEl = null,
    stressValEl = null,
    stressFillEl = null;

// State Tracking
let lastStressUpdate = 0;
const STRESS_UPDATE_INTERVAL = 100; // Updated for smoother gradient updates
let isAiCrashPause = false; // FLAG: Determines if the pause was caused by AI failure
let recoveryInterval = null;

// Gradient Colors (RGB)
const COLOR_GREEN = { r: 0, g: 191, b: 16 };   // Safe
const COLOR_YELLOW = { r: 255, g: 212, b: 0 }; // Moderate
const COLOR_RED = { r: 255, g: 64, b: 64 };    // Critical

/**
 * Initializes the HUD module.
 * @param {object} elements - Dictionary of DOM elements.
 */
export function init(elements) {
    // Store DOM References
    scoreEl = elements.score;
    accuracyEl = elements.accuracy;
    fpsEl = elements.fps;
    
    scoreContainerEl = elements.scoreContainer;
    statsContainerEl = elements.statsContainer;
    
    stressCardEl = elements.stressCard;
    stressValEl = elements.stressVal;
    stressFillEl = elements.stressFill;

    // Setup Listeners
    if (elements.hudRadios) {
        elements.hudRadios.forEach(radio => {
            radio.addEventListener('change', (e) => _updateHudPosition(e.target.value));
        });
    }
    _setupEventListeners();
}

/**
 * Helper: Linear Interpolation
 */
function _lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Generates the RGB color string based on the 3-point gradient requirement.
 * 0-25%: Green
 * 25-75%: Transition (Green -> Yellow -> Red)
 * 75-100%: Red
 */
function _getGradientColor(percentage) {
    let r, g, b;

    if (percentage <= 25) {
        // Safe Zone
        r = COLOR_GREEN.r;
        g = COLOR_GREEN.g;
        b = COLOR_GREEN.b;
    } else if (percentage >= 75) {
        // Critical Zone
        r = COLOR_RED.r;
        g = COLOR_RED.g;
        b = COLOR_RED.b;
    } else {
        // Middle Zone (25% to 75%)
        // Split into two sub-transitions for smooth Yellow pass-through
        const range = percentage - 25; // 0 to 50
        const t = range / 50; // 0.0 to 1.0

        if (t < 0.5) {
            // Green to Yellow (First half of transition)
            const localT = t * 2; 
            r = _lerp(COLOR_GREEN.r, COLOR_YELLOW.r, localT);
            g = _lerp(COLOR_GREEN.g, COLOR_YELLOW.g, localT);
            b = _lerp(COLOR_GREEN.b, COLOR_YELLOW.b, localT);
        } else {
            // Yellow to Red (Second half of transition)
            const localT = (t - 0.5) * 2;
            r = _lerp(COLOR_YELLOW.r, COLOR_RED.r, localT);
            g = _lerp(COLOR_YELLOW.g, COLOR_RED.g, localT);
            b = _lerp(COLOR_YELLOW.b, COLOR_RED.b, localT);
        }
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function _updateHudPosition(pos) {
    const applyPosition = (element, position) => {
        if (element) {
            element.classList.toggle('left', position === 'left');
            element.classList.toggle('right', position !== 'left');
        }
    };
    
    applyPosition(scoreContainerEl, pos);
    applyPosition(statsContainerEl, pos);
}

function _updateStressCardVisibility() {
    if (!stressCardEl) return;
    const isHudActive = scoreContainerEl && scoreContainerEl.style.display !== 'none';
    stressCardEl.style.display = isHudActive ? 'flex' : 'none';
}

/**
 * Sets the HUD to a critical failure state instantly.
 * Card BG becomes Red @ 75% Opacity. Bar becomes Red @ 100%.
 */
function _setCriticalState() {
    if (scoreContainerEl && scoreContainerEl.style.display === 'none') return;

    if (recoveryInterval) clearInterval(recoveryInterval);
    
    // 1. Set Card Background (Red, 75% Opacity)
    if (stressCardEl) {
        stressCardEl.style.backgroundColor = `rgba(255, 64, 64, 0.75)`;
    }

    // 2. Set Text
    if (stressValEl) stressValEl.innerText = "100%";

    // 3. Set Bar & DISABLE TRANSITION to prevent conflict with JS loop later
    if (stressFillEl) {
        stressFillEl.style.transition = 'none'; // CRITICAL FIX: Disable CSS smoothing
        stressFillEl.style.width = '100%';
        stressFillEl.style.backgroundColor = _getGradientColor(100); // Red
    }
}

/**
 * Starts the 5-second recovery animation.
 * Synchronizes Card Opacity Fade (75% -> 0%) with Bar Cooldown (Red -> Green).
 */
function _startRecoveryAnimation() {
    if (recoveryInterval) clearInterval(recoveryInterval);
    
    // Ensure transition is off so JS drives the animation smoothly
    if (stressFillEl) stressFillEl.style.transition = 'none';

    const startTime = performance.now();
    const duration = 5000;

    recoveryInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        let progress = elapsed / duration;

        if (progress >= 1) {
            progress = 1;
            clearInterval(recoveryInterval);
            recoveryInterval = null;
            isAiCrashPause = false; 
            _resetToNormal(); // Snap to clean state
            return;
        }

        const remainingPct = 100 * (1 - progress); // 100 -> 0

        // 1. Update Text & Bar Width
        if (stressValEl) stressValEl.innerText = `${Math.round(remainingPct)}%`;
        if (stressFillEl) stressFillEl.style.width = `${remainingPct}%`;

        // 2. Update Bar Color (Reverse Gradient: Red -> Yellow -> Green)
        const currentColor = _getGradientColor(remainingPct);
        if (stressFillEl) stressFillEl.style.backgroundColor = currentColor;

        // 3. Update Card Background Opacity (0.75 -> 0.0)
        // Red color remains constant, only alpha changes
        const currentAlpha = 0.75 * (1 - progress);
        if (stressCardEl) {
            stressCardEl.style.backgroundColor = `rgba(255, 64, 64, ${currentAlpha.toFixed(3)})`;
        }

    }, 16); // ~60fps
}

/**
 * Resets the visuals and state back to normal operation.
 */
function _resetToNormal() {
    if (recoveryInterval) {
        clearInterval(recoveryInterval);
        recoveryInterval = null;
    }
    isAiCrashPause = false;

    // Reset Card Background to Transparent
    if (stressCardEl) stressCardEl.style.backgroundColor = 'transparent';
    
    // Reset Bar & RESTORE TRANSITION for normal gameplay smoothing
    if (stressFillEl) {
        stressFillEl.style.transition = 'width 0.1s linear'; // Restore CSS smoothing
        stressFillEl.style.width = '0%';
        stressFillEl.style.backgroundColor = _getGradientColor(0); // Green
    }
    if (stressValEl) stressValEl.innerText = '0%';
    
    _updateStressCardVisibility();
}

/**
 * Binds EventBus events to UI updates.
 */
function _setupEventListeners() {
    const handleReset = () => {
        if (scoreEl) scoreEl.innerText = '0';
        if (accuracyEl) accuracyEl.innerText = '0%';
        if (fpsEl) fpsEl.innerText = '0';
        _resetToNormal();
    };

    eventBus.on(EVENTS.GAME_START, handleReset);
    eventBus.on(EVENTS.GAME_RESTART, handleReset);
    eventBus.on(EVENTS.GAME_RESUME, handleReset);

    eventBus.on(EVENTS.INPUT_MODE_CHANGED, (mode) => {
        if (mode === 'MOUSE_FALLBACK') {
            isAiCrashPause = true;
            _setCriticalState();
        }
    });
    
    eventBus.on(EVENTS.GAME_PAUSE, () => {
        if (isAiCrashPause) {
            // Slight delay ensures the Pause Overlay is rendered before starting animation
            setTimeout(() => {
                _startRecoveryAnimation();
            }, 50);
        }
    });

    eventBus.on(EVENTS.AI_STRESS_UPDATED, (stress) => {
        if (!stressCardEl || isAiCrashPause) return; 

        const now = performance.now();
        if (stress <= 80 && (now - lastStressUpdate < STRESS_UPDATE_INTERVAL)) {
            return;
        }
        lastStressUpdate = now;

        const clampedStress = Math.min(100, Math.max(0, stress));

        if (stressValEl) stressValEl.innerText = `${Math.round(clampedStress)}%`;
        
        if (stressFillEl) {
            stressFillEl.style.width = `${clampedStress}%`;
            // Apply Gradient Logic dynamically
            stressFillEl.style.backgroundColor = _getGradientColor(clampedStress);
        }
    });

    eventBus.on(EVENTS.SCORE_UPDATED, (newScore) => {
        if (scoreEl) scoreEl.innerText = newScore;
    });

    eventBus.on(EVENTS.GESTURE_ACCURACY, (accuracy) => {
        if (accuracyEl) accuracyEl.innerText = `${accuracy}%`;
    });
}

/**
 * Public Method: Updates FPS.
 */
export function updateFPS(fps) {
    if (fpsEl) fpsEl.innerText = Math.round(fps);
}