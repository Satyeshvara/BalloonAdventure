/*
    File: js/Core/main.js
    Description: The Main Orchestrator. Connects Input, Logic, Rendering, and Audio.
    Architecture: Component-Based & Event-Driven.
    
    Verified Features:
    - Game State Management & Lifecycle
    - Persistence Integration (High Score & Settings)
    - LeaderboardManager Integration via Event Bus
    - Physics Tunneling Fix
    - Object Pool Optimization (Birds & Particles)
*/

// --- Import Core Modules ---
import { GameStateManager } from './GameStateManager.js';
import { GameConfig } from './GameConfigurationManager.js';
import { eventBus, EVENTS } from './EventManager.js';

// --- Import Systems ---
import { InputManager } from '../Systems/InputManager.js';
import { audioManager } from '../Systems/AudioManager.js';
import { resourceManager } from '../Systems/ResourceManager.js';
import { CollisionManager } from '../Systems/CollisionManager.js';
import { persistenceManager } from '../Systems/PersistenceManager.js';
import { particleSystemManager } from '../Systems/ParticleSystemManager.js';

// --- Import Entities ---
import { Balloon } from '../Entities/Balloon.js';
import { Birds } from '../Entities/Birds.js';

// --- Import UI ---
import * as HUD from '../UI/HUD.js';
// Note: LeaderboardManager.js is self-initializing and imported in index.html

// --- DOM Reference Cache ---
const els = {
    cvs: document.getElementById('gameCanvas'),
    vid: document.getElementById('inputVideo'),
    scr: document.getElementById('scoreVal'),
    acc: document.getElementById('accuracyVal'),
    fps: document.getElementById('fpsVal'),
    hudBox: document.getElementById('right-hud'),
    hudRadios: document.getElementsByName('hudPos'),
    mod: document.getElementById('permission-modal'),
    // REMOVED: introCvs reference is no longer needed
    sld: document.getElementById('sensitivityRange'),
    txt: document.getElementById('percentText'),
    btn: document.getElementById('startBtn'),
    pauseUI: document.getElementById('pause-overlay'),
    gov: document.getElementById('gameover-overlay'),
    fSc: document.getElementById('finalScore'),
    rst: document.getElementById('restartBtn'),
    homeBtn: document.getElementById('homeBtn'),
    pauseRestartBtn: document.getElementById('pauseRestartBtn'),
    pauseHomeBtn: document.getElementById('pauseHomeBtn'),
    toastStack: document.getElementById('notification-stack'),
    caution: document.getElementById('caution-card'),
    musicRadios: document.getElementsByName('musicControl')
};

// --- Constants ---
const MAX_DELTA_TIME = 50; 

// --- Initialization ---
const gsm = new GameStateManager();
const inputManager = new InputManager(els.vid);

HUD.init({
    score: els.scr,
    accuracy: els.acc,
    fps: els.fps,
    hudBox: els.hudBox,
    hudRadios: els.hudRadios
});

// --- Game Logic Variables ---
const ctx = els.cvs.getContext('2d', { alpha: false, desynchronized: true });

let score = 0;
let lastTime = 0;
let skyGradient;
let smoothedFPS = 60;
let fpsTimer = 0;

// --- Entity Pooling Setup ---
let balloon = null; 
const pool = [];        
const freeList = [];    
const activeBirds = []; 

// --- Helper: Dynamic Toast Spawner ---
function spawnToast(message, duration = GameConfig.SYSTEM.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = 'toast-card';
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a73e8">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>${message}</span>
    `;
    els.toastStack.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, duration);
}

// --- Event Subscriptions ---
eventBus.on(EVENTS.INPUT_MODE_CHANGED, (mode) => {
    const accuracyBoard = document.getElementById('accuracy-board');
    switch (mode) {
        case 'CAMERA_INIT':
            spawnToast("Gesture mode enabled", 4000);
            if(accuracyBoard) accuracyBoard.style.display = 'flex';
            els.caution.classList.add('toast-hidden');
            break;
        case 'MOUSE_FALLBACK':
            if (gsm.isPlaying()) {
                gsm.pauseGame();
                els.pauseUI.style.display = 'flex'; 
                eventBus.emit(EVENTS.GAME_PAUSE);
            }
            spawnToast("Switched to Mouse Control.");
            els.caution.classList.add('toast-hidden'); 
            if(accuracyBoard) accuracyBoard.style.display = 'none';
            break;
        case 'CAMERA_RESTORE':
            if (gsm.isPlaying()) {
                gsm.pauseGame();
                els.pauseUI.style.display = 'flex';
                eventBus.emit(EVENTS.GAME_PAUSE);
            }
            spawnToast("Gesture Mode Restored.");
            if(accuracyBoard) accuracyBoard.style.display = 'flex';
            break;
    }
});

eventBus.on(EVENTS.GESTURE_ACCURACY, (accuracy) => {
    if (gsm.isMenu() || gsm.isGameOver() || gsm.isPaused()) return;
    if (accuracy > 0 || inputManager.inputType === 'MOUSE') {
        els.caution.classList.add('toast-hidden');
    } else {
        els.caution.classList.remove('toast-hidden');
    }
});

// --- Gameplay Loop & Rendering ---

// REMOVED: handleIntroLoop() is no longer needed as Leaderboard is now the primary UI.

function buildSky() {
    const oldH = els.cvs.height;
    els.cvs.width = window.innerWidth;
    els.cvs.height = window.innerHeight;

    skyGradient = ctx.createLinearGradient(0, 0, 0, els.cvs.height);
    skyGradient.addColorStop(0, '#80B5FF');
    skyGradient.addColorStop(1, '#D9E9FF');

    if (!gsm.isMenu() && oldH > 0 && balloon) {
        const scaleY = els.cvs.height / oldH;
        balloon.y *= scaleY;
        pool.forEach(obj => {
            if (obj.active) {
                obj.y *= scaleY;
                obj.canvasH = els.cvs.height; 
            }
        });
    }
}
window.addEventListener('resize', buildSky);

function updateSliderUI() {
    const val = parseInt(els.sld.value);
    els.txt.innerText = `${val}%`;
    els.sld.style.background = `linear-gradient(to right, #216DD9 ${val}%, #D9D9D9 ${val}%)`;
    if (balloon) {
        const min = GameConfig.PHYSICS.GRAVITY_EASING_MIN;
        const max = GameConfig.PHYSICS.GRAVITY_EASING_MAX;
        balloon.easing = min + (val / 100) * (max - min);
    }
}

// Settings Persistence Listeners
els.sld.oninput = updateSliderUI;
els.sld.onchange = () => {
    persistenceManager.updateSetting('sensitivity', parseInt(els.sld.value));
};

function loop(timestamp) {
    if (gsm.isMenu() || gsm.isGameOver()) return;

    let dt = timestamp - lastTime;
    lastTime = timestamp;

    if (dt <= 0) {
        requestAnimationFrame(loop);
        return;
    }

    if (dt > MAX_DELTA_TIME) {
        dt = MAX_DELTA_TIME;
    }

    if (gsm.isPlaying()) {
        const timeScale = dt / GameConfig.PHYSICS.GAME_SPEED_TIMESCALE; 
        
        const smoothedInput = inputManager.getY();
        if (balloon) {
            balloon.targetY = smoothedInput * (window.innerHeight - balloon.h);
            balloon.update(dt);
        }

        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, els.cvs.width, els.cvs.height);
        
        particleSystemManager.update(dt);
        particleSystemManager.draw();

        const difficultyMult = 1.0 + (score * GameConfig.DIFFICULTY.SPEED_INCREMENT);
        const spawnRate = Math.min(
            GameConfig.DIFFICULTY.MAX_SPAWN_RATE, 
            GameConfig.DIFFICULTY.SPAWN_RATE_INITIAL + (score * GameConfig.DIFFICULTY.SPAWN_RATE_INCREMENT)
        );

        if (Math.random() < (spawnRate * timeScale) && freeList.length > 0) {
            const bird = freeList.pop();
            bird.spawn(els.cvs.width, els.cvs.height, difficultyMult, score);
            activeBirds.push(bird);
        }

        if (balloon) balloon.draw();

        for (let i = activeBirds.length - 1; i >= 0; i--) {
            const bird = activeBirds[i];
            
            if (bird.update(dt)) {
                score += 10;
                eventBus.emit(EVENTS.SCORE_UPDATED, score);
                freeList.push(bird); 
                activeBirds[i] = activeBirds[activeBirds.length - 1];
                activeBirds.pop();
                continue; 
            }
            
            bird.draw();
            
            if (CollisionManager.checkCollision(balloon, bird)) {
                particleSystemManager.emit(balloon.x + balloon.w/2, balloon.y + balloon.h/2, 'EXPLOSION', 30);
                particleSystemManager.draw();

                if (gsm.endGame()) {
                    persistenceManager.tryUpdateHighScore(score);
                    const best = persistenceManager.getHighScore();
                    
                    els.fSc.innerHTML = `${score}<br><span style="font-size:1.2rem; color: #888; display: block; margin-top: 5px;">Best: ${best}</span>`;
                    
                    els.gov.style.display = 'flex';
                    // This single event is all that's needed for Leaderboard integration.
                    eventBus.emit(EVENTS.GAME_OVER);
                }
                return;
            }
        }

        const instantFPS = dt > 0 ? 1000 / dt : 60;
        smoothedFPS = (smoothedFPS * 0.9) + (instantFPS * 0.1);

        fpsTimer += dt;
        if (fpsTimer > GameConfig.SYSTEM.FPS_UPDATE_INTERVAL) {
            HUD.updateFPS(smoothedFPS);
            fpsTimer = 0;
        }
    }
    requestAnimationFrame(loop);
}

// --- Game Control Functions ---

async function startGameRoutine() {
    try {
        els.btn.innerText = "Loading Assets...";
        els.btn.disabled = true;

        await resourceManager.init();
        await inputManager.init(); 

        syncMenuUIToSettings(); 
        
        const settings = persistenceManager.getSettings();
        audioManager.init();
        audioManager.setMusicEnabled(settings.musicEnabled);
        if (settings.musicEnabled) {
            audioManager.playMusic(); 
        }

        particleSystemManager.init(ctx);

        balloon = new Balloon(ctx, resourceManager.getImage('BALLOON'));
        updateSliderUI();

        pool.length = 0;
        freeList.length = 0;
        activeBirds.length = 0; 

        const birdImg = resourceManager.getImage('BIRDS');
        for (let i = 0; i < GameConfig.POOLING.OBSTACLE_POOL_SIZE; i++) {
            const b = new Birds(ctx, birdImg);
            pool.push(b);
            freeList.push(b);
        }

        lastTime = performance.now();
        if (gsm.startGame()) {
            els.mod.style.display = 'none';
            inputManager.startTracking();
            eventBus.emit(EVENTS.GAME_START);
            requestAnimationFrame(loop);
        }

    } catch (e) {
        console.error("Critical Start Error:", e);
        spawnToast("Error starting game. Check console.");
        els.btn.innerText = "Start";
        els.btn.disabled = false;
    }
}

function restartGame() {
    score = 0; 
    eventBus.emit(EVENTS.SCORE_UPDATED, 0);
    
    activeBirds.forEach(bird => {
        bird.active = false;
        freeList.push(bird);
    });
    activeBirds.length = 0; 

    if (freeList.length !== pool.length) {
        freeList.length = 0;
        pool.forEach(o => {
            o.active = false;
            freeList.push(o);
        });
    }

    particleSystemManager.reset();

    balloon.y = window.innerHeight * GameConfig.ENTITIES.BALLOON.START_Y_RATIO;
    balloon.targetY = balloon.y;
    
    smoothedFPS = 60;
    fpsTimer = 0;

    els.gov.style.display = 'none';
    els.pauseUI.style.display = 'none';
    
    if (gsm.startGame()) {
        lastTime = performance.now();
        eventBus.emit(EVENTS.GAME_RESTART);
        requestAnimationFrame(loop);
    }
}

function goHome() {
    eventBus.emit(EVENTS.GAME_HOME);
    location.reload(); 
}

// --- Event Listeners ---

els.btn.onclick = startGameRoutine;
els.rst.onclick = restartGame;
els.homeBtn.onclick = goHome;
els.pauseRestartBtn.onclick = restartGame;
els.pauseHomeBtn.onclick = goHome;

const closePrivacyToast = document.getElementById('close-toast');
if(closePrivacyToast) {
    const privacyToast = document.getElementById('toast-notification');
    closePrivacyToast.onclick = () => privacyToast.classList.add('toast-hidden');
    setTimeout(() => privacyToast.classList.add('toast-hidden'), 10000);
}

eventBus.on(EVENTS.SCORE_UPDATED, (newScore) => {
    if (balloon && newScore > 0 && newScore % 100 === 0) { 
        particleSystemManager.emit(balloon.x + balloon.w/2, balloon.y, 'CONFETTI', 15);
    }
});

window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space') {
        if (gsm.isPlaying()) {
            gsm.pauseGame();
            els.pauseUI.style.display = 'flex';
            eventBus.emit(EVENTS.GAME_PAUSE);
            els.caution.classList.add('toast-hidden'); 
        } else if (gsm.isPaused()) {
            gsm.resumeGame();
            els.pauseUI.style.display = 'none';
            eventBus.emit(EVENTS.GAME_RESUME);
        }
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && gsm.isPlaying()) {
        gsm.pauseGame();
        els.pauseUI.style.display = 'flex';
        eventBus.emit(EVENTS.GAME_PAUSE);
        els.caution.classList.add('toast-hidden');
    }
});

window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
    }
});

// --- Settings Persistence Listeners ---

els.musicRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isEnabled = e.target.value === 'on';
        audioManager.setMusicEnabled(isEnabled);
        persistenceManager.updateSetting('musicEnabled', isEnabled);
    });
});

els.hudRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        persistenceManager.updateSetting('hudPosition', e.target.value);
        if (e.target.value === 'left') {
            els.hudBox.classList.add('left'); els.hudBox.classList.remove('right');
        } else {
            els.hudBox.classList.add('right'); els.hudBox.classList.remove('left');
        }
    });
});

function syncMenuUIToSettings() {
    const settings = persistenceManager.getSettings();
    
    els.sld.value = settings.sensitivity;
    updateSliderUI(); 

    Array.from(els.musicRadios).forEach(r => {
        r.checked = (r.value === 'on') === settings.musicEnabled;
    });
    audioManager.setMusicEnabled(settings.musicEnabled);

    Array.from(els.hudRadios).forEach(r => {
        r.checked = r.value === settings.hudPosition;
    });
    if (settings.hudPosition === 'left') {
        els.hudBox.classList.add('left'); els.hudBox.classList.remove('right');
    } else {
        els.hudBox.classList.add('right'); els.hudBox.classList.remove('left');
    }

    console.log("[Main] Persistence synced successfully.");
}

function initApp() {
    buildSky();
    // REMOVED: handleIntroLoop() call
    
    persistenceManager.load();
    syncMenuUIToSettings();
}

window.addEventListener('DOMContentLoaded', initApp);