/*
    File: js/Core/UIManager.js
    Description: Manages Meta-UI (Menus, Overlays, Settings, Toasts).
    
    Refactor Status: 
    - Updated to manage split HUD containers (Score vs Telemetry).
    - Ensures both containers sync with Visibility and Settings logic.
    - Updated statsContainer reference to 'statusMonitor'.
*/

import { GameConfig } from './GameConfigurationManager.js';

class UIManager {
    constructor() {
        this.els = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        // 1. Cache DOM Elements
        this.els = {
            // Screens/Overlays
            mod: document.getElementById('permission-modal'), // Main Menu
            pauseUI: document.getElementById('pause-overlay'),
            gov: document.getElementById('gameover-overlay'),
            
            // Buttons
            btn: document.getElementById('startBtn'),
            rst: document.getElementById('restartBtn'),
            homeBtn: document.getElementById('homeBtn'),
            pauseRestartBtn: document.getElementById('pauseRestartBtn'),
            pauseHomeBtn: document.getElementById('pauseHomeBtn'),
            
            // Settings Controls
            sld: document.getElementById('sensitivityRange'),
            txt: document.getElementById('percentText'),
            musicRadios: document.getElementsByName('musicControl'),
            hudRadios: document.getElementsByName('hudPos'),
            
            // Notifications
            toastStack: document.getElementById('notification-stack'),
            caution: document.getElementById('caution-card'),
            
            // Game Over Data
            fSc: document.getElementById('finalScore'),
            
            // HUD Containers (Refactored)
            // Replaces 'hudBox' with distinct containers
            scoreContainer: document.getElementById('hud-score-container'),
            
            // ID UPDATED: Renamed from 'hud-stats-container' to 'statusMonitor'
            statsContainer: document.getElementById('statusMonitor'),
            
            // Specific Stats Elements
            accuracyBoard: document.getElementById('accuracy-board'),
            audioVisualizer: document.getElementById('audio-visualizer'),
            stressCard: document.getElementById('ai-stress-card')
        };

        // 2. Setup Internal Listeners
        const closePrivacyToast = document.getElementById('close-toast');
        if(closePrivacyToast) {
            const privacyToast = document.getElementById('toast-notification');
            closePrivacyToast.onclick = () => privacyToast.classList.add('toast-hidden');
            setTimeout(() => privacyToast.classList.add('toast-hidden'), 10000);
        }

        // Default State: Hide HUD on Load
        this.toggleGameplayHUD(false);

        this.isInitialized = true;
    }

    bindActions(handlers) {
        this.els.btn.onclick = handlers.onStart;
        
        const restartHandler = handlers.onRestart;
        this.els.rst.onclick = restartHandler;
        this.els.pauseRestartBtn.onclick = restartHandler;

        const homeHandler = handlers.onHome;
        this.els.homeBtn.onclick = homeHandler;
        this.els.pauseHomeBtn.onclick = homeHandler;

        this.els.sld.oninput = (e) => {
            const val = parseInt(e.target.value);
            this._updateSliderVisuals(val);
            if (handlers.onSensitivity) handlers.onSensitivity(val);
        };
        this.els.sld.onchange = (e) => {
             if (handlers.onSensitivitySave) handlers.onSensitivitySave(parseInt(e.target.value));
        };

        this.els.musicRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (handlers.onMusic) handlers.onMusic(e.target.value === 'on');
            });
        });

        this.els.hudRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (handlers.onHud) handlers.onHud(e.target.value);
            });
        });
    }

    // --- Screen Management ---

    showMenu() {
        this.els.mod.style.display = 'flex';
        this.els.pauseUI.style.display = 'none';
        this.els.gov.style.display = 'none';
        this.toggleGameplayHUD(false); // Hide HUD on Menu
    }

    showGame() {
        this.els.mod.style.display = 'none';
        this.els.pauseUI.style.display = 'none';
        this.els.gov.style.display = 'none';
        this.toggleGameplayHUD(true); // Show HUD in Game
    }

    showPause() {
        this.els.pauseUI.style.display = 'flex';
    }

    hidePause() {
        this.els.pauseUI.style.display = 'none';
    }

    showGameOver(score, highScore) {
        this.els.fSc.innerHTML = `${score}<br><span style="font-size:1.2rem; color: #888; display: block; margin-top: 5px;">Best: ${highScore}</span>`;
        this.els.gov.style.display = 'flex';
    }

    // --- HUD Visibility Logic ---
    toggleGameplayHUD(visible) {
        // Use 'flex' because .hud-container is defined as display: flex in CSS
        const displayVal = visible ? 'flex' : 'none';
        
        // Toggle Primary Containers
        if (this.els.scoreContainer) this.els.scoreContainer.style.display = displayVal;
        
        // Note: We generally show the stats container structure if visible,
        // but specific children (accuracy/stress) might be hidden by InputManager logic.
        if (this.els.statsContainer) this.els.statsContainer.style.display = displayVal;
        
        // Input-dependent elements (Accuracy, Stress)
        // We force HIDE them on Menu. 
        if (!visible) {
            if (this.els.accuracyBoard) this.els.accuracyBoard.style.display = 'none';
            if (this.els.stressCard) this.els.stressCard.style.display = 'none';
            if (this.els.audioVisualizer) this.els.audioVisualizer.style.display = 'none';
        }
    }

    // --- Loading State ---

    setLoading(isLoading) {
        if (isLoading) {
            this.els.btn.innerText = "Loading Assets...";
            this.els.btn.disabled = true;
        } else {
            this.els.btn.innerText = "Start";
            this.els.btn.disabled = false;
        }
    }

    // --- Notifications ---

    spawnToast(message, duration = GameConfig.SYSTEM.TOAST_DURATION) {
        const toast = document.createElement('div');
        toast.className = 'toast-card';
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a73e8">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>${message}</span>
        `;
        this.els.toastStack.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, duration);
    }

    toggleCaution(show) {
        if (show) {
            this.els.caution.classList.remove('toast-hidden');
        } else {
            this.els.caution.classList.add('toast-hidden');
        }
    }

    toggleAccuracyBoard(show) {
        if (this.els.accuracyBoard) {
            this.els.accuracyBoard.style.display = show ? 'flex' : 'none';
        }
    }

    // --- Settings Synchronization ---

    syncSettings(settings) {
        this.els.sld.value = settings.sensitivity;
        this._updateSliderVisuals(settings.sensitivity);

        Array.from(this.els.musicRadios).forEach(r => {
            r.checked = (r.value === 'on') === settings.musicEnabled;
        });

        Array.from(this.els.hudRadios).forEach(r => {
            r.checked = r.value === settings.hudPosition;
        });
        
        // Apply Position to BOTH containers
        const applyPos = (el) => {
            if(el) {
                if (settings.hudPosition === 'left') {
                    el.classList.add('left'); 
                    el.classList.remove('right');
                } else {
                    el.classList.add('right'); 
                    el.classList.remove('left');
                }
            }
        };

        applyPos(this.els.scoreContainer);
        applyPos(this.els.statsContainer);
    }

    _updateSliderVisuals(val) {
        this.els.txt.innerText = `${val}%`;
        this.els.sld.style.background = `linear-gradient(to right, #216DD9 ${val}%, #D9D9D9 ${val}%)`;
    }
}

export const uiManager = new UIManager();