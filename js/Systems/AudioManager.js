/*
    File: js/Systems/AudioManager.js
    Description: Manages AudioContext, Background Music, and Visualizer integration.
                 Decoupled from Main.js via EventManager.
                 
    UPDATES (Security Patch): 
    - Implemented robust State Checks to prevent Race Conditions.
    - Added "Rescue Mechanism" for Autoplay Policy compliance.
*/

import * as AudioVisualizer from '../UI/AudioVisualizer.js';
import { eventBus, EVENTS } from '../Core/EventManager.js';
import { resourceManager } from './ResourceManager.js';

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.sourceNode = null;
        this.bgMusic = null; // Will hold the DOM Audio Element
        
        this.isMusicEnabled = true; // User preference
        this.isInitialized = false;
        
        // Flag to prevent multiple rescue attempts
        this.isRescuing = false;
    }

    /**
     * Initializes the AudioContext and Visualizer.
     * Must be called AFTER ResourceManager has loaded assets.
     */
    init() {
        if (this.isInitialized) return;

        // 1. Retrieve the preloaded audio element from ResourceManager
        this.bgMusic = resourceManager.getAudio('BG_MUSIC');

        if (!this.bgMusic) {
            console.error("[AudioManager] Background Music asset not found!");
            return;
        }

        // 2. Setup Loop
        this.bgMusic.loop = true;

        // 3. Initialize Web Audio API
        // Cross-browser compatibility check
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        // 4. Handle System Interruptions (e.g., Phone calls, Alarm)
        this.audioContext.onstatechange = () => {
            if (this.audioContext.state === 'interrupted') {
                this.bgMusic.pause();
                AudioVisualizer.setPaused(true);
            } else if (this.audioContext.state === 'running' && this.isMusicEnabled && this.bgMusic.paused) {
                // If context resumes and music was supposed to be on, try playing
                 this.playMusic().catch(e => console.warn("[AudioManager] Auto-resume failed:", e));
            }
        };

        // 5. Create Audio Graph: Source -> Analyser -> Speakers
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;

        // Create MediaElementSource safely
        try {
            // Check if we can create the node (in case init is called twice erroneously)
            this.sourceNode = this.audioContext.createMediaElementSource(this.bgMusic);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } catch (e) {
            console.warn("[AudioManager] Source node might already exist or failed creation:", e);
        }

        // 6. Initialize UI Visualizer
        AudioVisualizer.init(this.analyser, document.getElementById('audio-visualizer'));
        
        this.isInitialized = true;
        this._setupEventListeners();
    }

    /**
     * Private: Subscribe to Game Events to automate audio control.
     */
    _setupEventListeners() {
        // Pause Music on Game Pause
        eventBus.on(EVENTS.GAME_PAUSE, () => {
            if (this.bgMusic) this.bgMusic.pause();
            AudioVisualizer.setPaused(true);
        });

        // Resume Music on Game Resume (if enabled)
        eventBus.on(EVENTS.GAME_RESUME, () => {
            if (this.isMusicEnabled) this.playMusic();
        });

        // Stop/Reset on Game Over or Home
        eventBus.on(EVENTS.GAME_OVER, () => this.stopMusic());
        eventBus.on(EVENTS.GAME_HOME, () => this.stopMusic());

        // Restart Music on Game Restart
        eventBus.on(EVENTS.GAME_RESTART, () => {
            this.restartMusic();
        });
    }

    /**
     * Starts playback safely (handling Autoplay Policy).
     * Robust Pattern: Check State -> Resume -> Play -> Catch Errors -> Retry.
     */
    async playMusic() {
        if (!this.isInitialized || !this.isMusicEnabled) return;

        try {
            // A. Explicit State Check & Resume
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // B. Double-check state after resume attempt
            if (this.audioContext.state === 'running') {
                const playPromise = this.bgMusic.play();
                
                // Modern browsers return a Promise from play()
                if (playPromise !== undefined) {
                    await playPromise;
                }
                
                AudioVisualizer.show();
            } else {
                // If still suspended, trigger rescue
                throw new Error("Context failed to resume.");
            }
        } catch (e) {
            console.warn("[AudioManager] Autoplay prevented by browser policy. Attaching rescue listener.", e);
            this._attachRescueListener();
        }
    }

    /**
     * Fallback Mechanism:
     * If playMusic fails (due to race condition or async token expiry),
     * this listens for the NEXT user interaction to immediately unlock audio.
     */
    _attachRescueListener() {
        if (this.isRescuing) return;
        this.isRescuing = true;

        const unlockHandler = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    if (this.isMusicEnabled) {
                        await this.bgMusic.play();
                        AudioVisualizer.show();
                    }
                    console.log("[AudioManager] Audio Context Recovered via Rescue Listener.");
                } catch (e) {
                    console.error("[AudioManager] Rescue failed:", e);
                }
            }
            // Cleanup: Remove listener once executed
            this.isRescuing = false;
            window.removeEventListener('click', unlockHandler);
            window.removeEventListener('keydown', unlockHandler);
            window.removeEventListener('touchstart', unlockHandler);
        };

        // Listen for any interaction
        window.addEventListener('click', unlockHandler, { once: true });
        window.addEventListener('keydown', unlockHandler, { once: true });
        window.addEventListener('touchstart', unlockHandler, { once: true });
    }

    /**
     * Resets music to 0:00 and plays.
     */
    async restartMusic() {
        if (this.bgMusic) {
            this.bgMusic.currentTime = 0;
            await this.playMusic();
        }
    }

    /**
     * Completely stops music and hides visualizer.
     */
    stopMusic() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
        AudioVisualizer.hide();
    }

    /**
     * Toggles music on/off based on User Settings (Radio Buttons).
     * @param {boolean} enabled 
     */
    setMusicEnabled(enabled) {
        this.isMusicEnabled = enabled;
        
        if (!enabled) {
            if (this.bgMusic) this.bgMusic.pause();
            AudioVisualizer.hide();
        } else {
            // If context is already running, resume playback immediately
            if (this.audioContext && this.audioContext.state === 'running') {
                this.playMusic();
            } else {
                // If suspended, try to resume/play (will trigger rescue if needed)
                this.playMusic();
            }
        }
    }
}

// Export Singleton Instance
export const audioManager = new AudioManager();