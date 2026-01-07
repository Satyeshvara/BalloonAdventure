/*
    File: js/Core/main.js
    Description: The Main Orchestrator.
    Refactor Status: Integrated UpdateManager for Patch Notes & Version Control.
*/

// --- Import Core Modules ---
import { GameStateManager } from './GameStateManager.js';
import { GameConfig } from './GameConfigurationManager.js';
import { eventBus, EVENTS } from './EventManager.js';
import { gameLoopManager } from './GameLoopManager.js';
import { obstacleManager } from './ObstacleManager.js';
import { environmentManager } from './EnvironmentManager.js';
import { uiManager } from './UIManager.js';

// --- NEW IMPORT: Update Manager ---
import { UpdateManager } from '../Utils/UpdateManager.js';

// --- Import Systems ---
import { InputManager } from '../Systems/InputManager.js';
import { audioManager } from '../Systems/AudioManager.js';
import { resourceManager } from '../Systems/ResourceManager.js';
import { persistenceManager } from '../Systems/PersistenceManager.js';
import { particleSystemManager } from '../Systems/ParticleSystemManager.js';

// --- Import Entities ---
import { Balloon } from '../Entities/Balloon.js';

// --- Import UI ---
import * as HUD from '../UI/HUD.js';

// --- Initialization ---
const gsm = new GameStateManager();
const inputManager = new InputManager(document.getElementById('inputVideo'));

// FIX: Injecting Updated DOM Elements for HUD
HUD.init({
    score: document.getElementById('scoreVal'),
    accuracy: document.getElementById('accuracyVal'),
    fps: document.getElementById('fpsVal'),
    
    // Updated Containers (Replacing 'hudBox')
    scoreContainer: document.getElementById('hud-score-container'),
    
    // ID UPDATED: Renamed from 'hud-stats-container' to 'statusMonitor'
    statsContainer: document.getElementById('statusMonitor'),
    
    hudRadios: document.getElementsByName('hudPos'),
    
    // Stress Monitor Elements
    stressCard: document.getElementById('ai-stress-card'),
    stressVal: document.getElementById('stressVal'),
    stressFill: document.getElementById('stressFill')
});

// --- Game Logic Variables ---
const cvs = document.getElementById('gameCanvas');
const ctx = cvs.getContext('2d', { alpha: false, desynchronized: true });

let score = 0;
let balloon = null; 

// --- Event Subscriptions ---

eventBus.on(EVENTS.INPUT_MODE_CHANGED, (mode) => {
    switch (mode) {
        case 'CAMERA_INIT':
            uiManager.spawnToast("Gesture mode enabled", 4000);
            uiManager.toggleAccuracyBoard(true);
            uiManager.toggleCaution(false);
            break;
        case 'MOUSE_FALLBACK':
            if (gsm.isPlaying()) {
                triggerPause();
            }
            uiManager.spawnToast("Switched to Mouse Control.");
            uiManager.toggleCaution(false); 
            uiManager.toggleAccuracyBoard(false);
            break;
        case 'CAMERA_RESTORE':
            if (gsm.isPlaying()) {
                triggerPause();
            }
            uiManager.spawnToast("Gesture Mode Restored.");
            uiManager.toggleAccuracyBoard(true);
            break;
    }
});

eventBus.on(EVENTS.GESTURE_ACCURACY, (accuracy) => {
    if (gsm.isMenu() || gsm.isGameOver() || gsm.isPaused()) return;
    
    if (accuracy > 0 || inputManager.inputType === 'MOUSE') {
        uiManager.toggleCaution(false);
    } else {
        uiManager.toggleCaution(true);
    }
});

// --- Gameplay & Rendering Logic ---

window.addEventListener('resize', () => {
    const oldH = cvs.height;
    environmentManager.handleResize();

    if (!gsm.isMenu() && oldH > 0 && balloon) {
        const newH = cvs.height;
        const scaleY = newH / oldH;
        balloon.y *= scaleY;
        obstacleManager.handleResize(newH, oldH);
    }
});

function gameUpdate(dt) {
    if (!gsm.isPlaying()) return;

    const smoothedInput = inputManager.getY();
    if (balloon) {
        balloon.targetY = smoothedInput * (window.innerHeight - balloon.h);
        balloon.update(dt);
    }

    particleSystemManager.update(dt);

    const obsResult = obstacleManager.update(dt, score, cvs.width, cvs.height, balloon);

    if (obsResult.scoreAdded > 0) {
        score += obsResult.scoreAdded;
        eventBus.emit(EVENTS.SCORE_UPDATED, score);
    }

    if (obsResult.hasCollided) {
        handleCollision(obsResult.collisionX, obsResult.collisionY);
    }
}

function gameDraw() {
    environmentManager.draw();
    particleSystemManager.draw();
    if (balloon) balloon.draw();
    obstacleManager.draw();
}

function handleCollision(x = 0, y = 0) {
    const bx = x || (balloon ? balloon.x + balloon.w/2 : 0);
    const by = y || (balloon ? balloon.y + balloon.h/2 : 0);

    particleSystemManager.emit(bx, by, 'EXPLOSION', 30);
    particleSystemManager.draw();

    if (gsm.endGame()) {
        gameLoopManager.stop();
        persistenceManager.tryUpdateHighScore(score);
        const best = persistenceManager.getHighScore();
        uiManager.showGameOver(score, best);
        eventBus.emit(EVENTS.GAME_OVER);
    }
}

function triggerPause() {
    gsm.pauseGame();
    gameLoopManager.pause();
    uiManager.showPause();
    eventBus.emit(EVENTS.GAME_PAUSE);
    uiManager.toggleCaution(false);
}

function triggerResume() {
    gsm.resumeGame();
    gameLoopManager.resume();
    uiManager.hidePause();
    eventBus.emit(EVENTS.GAME_RESUME);
}

// --- Game Action Handlers ---

async function onStartAction() {
    try {
        uiManager.setLoading(true);

        await resourceManager.init();
        await inputManager.init(); 

        const settings = persistenceManager.getSettings();
        uiManager.syncSettings(settings);
        
        audioManager.init();
        audioManager.setMusicEnabled(settings.musicEnabled);
        if (settings.musicEnabled) {
            audioManager.playMusic(); 
        }

        particleSystemManager.init(ctx);
        obstacleManager.init(ctx, resourceManager.getImage('BIRDS'));
        environmentManager.init(cvs, ctx);

        balloon = new Balloon(ctx, resourceManager.getImage('BALLOON'));
        updateBalloonPhysics(settings.sensitivity);

        if (gsm.startGame()) {
            uiManager.showGame(); // Shows HUD now
            inputManager.startTracking();
            eventBus.emit(EVENTS.GAME_START);
            
            gameLoopManager.setCallbacks(gameUpdate, gameDraw, HUD.updateFPS);
            gameLoopManager.start();
        }
        uiManager.setLoading(false);

    } catch (e) {
        console.error("Critical Start Error:", e);
        uiManager.spawnToast("Error starting game. Check console.");
        uiManager.setLoading(false);
    }
}

function onRestartAction() {
    score = 0; 
    eventBus.emit(EVENTS.SCORE_UPDATED, 0);
    
    obstacleManager.reset();
    particleSystemManager.reset();

    balloon.y = window.innerHeight * GameConfig.ENTITIES.BALLOON.START_Y_RATIO;
    balloon.targetY = balloon.y;
    
    uiManager.showGame();
    
    if (gsm.startGame()) {
        eventBus.emit(EVENTS.GAME_RESTART);
        gameLoopManager.setCallbacks(gameUpdate, gameDraw, HUD.updateFPS);
        gameLoopManager.stop();
        gameLoopManager.start();
    }
}

function onHomeAction() {
    gameLoopManager.stop();
    eventBus.emit(EVENTS.GAME_HOME);
    location.reload(); 
}

function updateBalloonPhysics(val) {
    if (balloon) {
        const min = GameConfig.PHYSICS.GRAVITY_EASING_MIN;
        const max = GameConfig.PHYSICS.GRAVITY_EASING_MAX;
        balloon.easing = min + (val / 100) * (max - min);
    }
}

// --- Event Listeners ---

eventBus.on(EVENTS.SCORE_UPDATED, (newScore) => {
    if (balloon && newScore > 0 && newScore % 100 === 0) { 
        particleSystemManager.emit(balloon.x + balloon.w/2, balloon.y, 'CONFETTI', 15);
    }
});

window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space') {
        if (gsm.isPlaying()) {
            triggerPause();
        } else if (gsm.isPaused()) {
            triggerResume();
        }
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && gsm.isPlaying()) {
        triggerPause();
    }
});

// --- SECURITY & PROTECTION ---

window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', function (e) {
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key)) || 
        (e.ctrlKey && e.key === 'U')
    ) {
        e.preventDefault();
        return false;
    }
});

// --- Initialization & Update Check ---

async function initApp() {
    // 1. UPDATE CHECK FIRST
    // This logic runs before any game initialization.
    // If an update is detected, it shows the overlay and halts execution.
    const updateMgr = new UpdateManager();
    const hasUpdate = await updateMgr.checkForUpdates();

    if (hasUpdate) {
        console.log("[Main] Update pending. Halting initialization.");
        return; 
    }

    // 2. Normal Initialization (Only if no updates)
    uiManager.init(); 
    persistenceManager.load();
    
    // Sync Settings (This will now run safely thanks to UIManager Fix)
    const settings = persistenceManager.getSettings();
    uiManager.syncSettings(settings);
    
    console.log("[Main] Persistence synced successfully.");

    // Bind Actions
    uiManager.bindActions({
        onStart: onStartAction,
        onRestart: onRestartAction,
        onHome: onHomeAction,
        onSensitivity: (val) => updateBalloonPhysics(val),
        onSensitivitySave: (val) => persistenceManager.updateSetting('sensitivity', val),
        onMusic: (isEnabled) => {
            audioManager.setMusicEnabled(isEnabled);
            persistenceManager.updateSetting('musicEnabled', isEnabled);
        },
        onHud: (pos) => persistenceManager.updateSetting('hudPosition', pos)
    });
    
    // Init Environment
    environmentManager.init(cvs, ctx); 
}

window.addEventListener('DOMContentLoaded', initApp);