/*
    File: js/Core/GameLoopManager.js
    Description: Dedicated Game Loop Orchestrator.
                 Manages timing, delta-time calculation, FPS smoothing, and loop lifecycle.
                 Decouples the "Heartbeat" from the Main Controller.
    
    DSA/Optimization: 
    - Uses High-Resolution Time (performance.now).
    - Implements 'Time Clamping' to prevent physics explosions on lag spikes.
*/

import { GameConfig } from './GameConfigurationManager.js';

class GameLoopManager {
    constructor() {
        // State Flags
        this.isRunning = false;
        this.isPaused = false;
        
        // Loop Reference (for cancellation)
        this.rafId = 0;
        
        // Timing Variables
        this.lastTime = 0;
        this.accumulatedTime = 0;
        
        // Callbacks
        this.updateFn = null;
        this.drawFn = null;
        this.fpsUpdateFn = null; // Optional: To send FPS back to UI

        // FPS Calculation
        this.smoothedFPS = 60;
        this.fpsTimer = 0;
        
        // Constants (Local cache for O(1) access)
        this.MAX_DELTA_TIME = 50; // Cap dt to prevent spiraling
        this.FPS_INTERVAL = GameConfig.SYSTEM.FPS_UPDATE_INTERVAL;
    }

    /**
     * Initializes the loop with callbacks.
     * @param {Function} updateFn - Logic update (receives dt).
     * @param {Function} drawFn - Rendering logic.
     * @param {Function} fpsUpdateFn - (Optional) UI update for FPS.
     */
    setCallbacks(updateFn, drawFn, fpsUpdateFn = null) {
        this.updateFn = updateFn;
        this.drawFn = drawFn;
        this.fpsUpdateFn = fpsUpdateFn;
    }

    start() {
        if (this.isRunning) return; // Prevent double start

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((ts) => this._loop(ts));
        
        console.log("[GameLoopManager] Loop Started.");
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        console.log("[GameLoopManager] Loop Stopped.");
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            // No need to cancel RAF, we just skip updates in the loop
            // to keep the thread alive but idle.
        }
    }

    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            // Reset time to prevent a huge jump (delta spike) after resuming
            this.lastTime = performance.now();
        }
    }

    _loop(timestamp) {
        // 1. Lifecycle Check
        if (!this.isRunning) return;

        // 2. Schedule Next Frame immediately
        this.rafId = requestAnimationFrame((ts) => this._loop(ts));

        // 3. Pause Check (Idle State)
        if (this.isPaused) return;

        // 4. Calculate Delta Time (dt)
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Safety: Prevent negative dt (system clock adjustment)
        if (dt < 0) dt = 0;

        // Safety: Time Clamping (Lag Spike Protection)
        if (dt > this.MAX_DELTA_TIME) {
            dt = this.MAX_DELTA_TIME;
        }

        try {
            // 5. Update Physics/Logic
            if (this.updateFn) this.updateFn(dt);

            // 6. Draw/Render
            if (this.drawFn) this.drawFn();

            // 7. FPS Calculation
            this._processFPS(dt);

        } catch (error) {
            console.error("[GameLoopManager] Critical Error in Frame:", error);
            this.stop(); // Fail-safe: Stop loop to prevent browser freeze
        }
    }

    _processFPS(dt) {
        // Calculate Instant FPS
        const instantFPS = dt > 0 ? 1000 / dt : 60;
        
        // Weighted Moving Average for Smoothing (90% history, 10% new)
        this.smoothedFPS = (this.smoothedFPS * 0.9) + (instantFPS * 0.1);

        this.fpsTimer += dt;
        if (this.fpsTimer > this.FPS_INTERVAL) {
            if (this.fpsUpdateFn) this.fpsUpdateFn(this.smoothedFPS);
            this.fpsTimer = 0;
        }
    }
}

// Export Singleton
export const gameLoopManager = new GameLoopManager();