/* --- START OF FILE js/Systems/InputManager.js --- */

/*
    File: js/Systems/InputManager.js
    Description: Manages input via MediaPipe Hands (Primary) or Mouse/Touch (Fallback).
                 Implements strict lifecycle management, AI Stress Monitoring, and Back-pressure prevention.
                 
    Refactor Status:
    - FIXED: Watchdog now emits 100% Stress Event before Fallback (Fixes Silent Crash).
    - REFINED: Optimized Error Handling to sync with HUD Critical Failure state.
*/

import { eventBus, EVENTS } from '../Core/EventManager.js';
import { GameConfig } from '../Core/GameConfigurationManager.js';

export class InputManager {
    constructor(videoElement) {
        this.video = videoElement;
        this.hands = null;
        this.cameraStream = null;
        
        // --- State Management ---
        this.inputType = 'NONE'; // 'CAMERA', 'MOUSE', 'NONE'
        this.isInitialized = false; 
        
        // --- Loop Control ---
        this.currentLoopId = 0; // Unique ID for the active tracking loop

        // --- Back-pressure & Monitoring ---
        this.isProcessing = false; // The Gatekeeper Flag
        this.lastFrameTime = 0;    // Timestamp of current frame start
        this.watchdogInterval = null;
        
        // --- Auto-Fallback State ---
        this.criticalStressStartTime = 0; // Timestamp when stress first exceeded 90%

        // --- Coordinates ---
        this.targetY = 0.5;
        this.smoothedY = 0.5;
        this.mouseY = 0.5;

        // --- Error Recovery ---
        this.consecutiveErrors = 0;
        this.MAX_ERRORS = 15; 
        
        // --- Auto-Recovery ---
        this.recoveryInterval = null;
        this.RECOVERY_DELAY = 5000;
        
        this._setupMouseListeners();
    }

    _setupMouseListeners() {
        // Passive listeners always track mouse, just in case fallback is triggered
        window.addEventListener('mousemove', (e) => {
            this.mouseY = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
        });
        window.addEventListener('touchmove', (e) => {
            if(e.touches.length > 0) {
                this.mouseY = Math.max(0, Math.min(1, e.touches[0].clientY / window.innerHeight));
            }
        }, {passive: true});
    }

    /**
     * Helper: Safely stops any existing camera stream to free hardware.
     */
    _stopCameraStream() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => {
                track.stop();
            });
            this.cameraStream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
    }

    /**
     * Helper: Hard Resets the MediaPipe AI Instance.
     */
    _hardResetAI() {
        if (this.hands) {
            try {
                this.hands.close(); 
            } catch (e) {
                console.warn("[InputManager] Error closing old Hands instance:", e);
            }
            this.hands = null;
        }

        console.log("[InputManager] Initializing Fresh AI Instance...");
        
        try {
            this.hands = new Hands({ 
                locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` 
            });

            this.hands.setOptions({ 
                maxNumHands: 1, 
                modelComplexity: 0, 
                minDetectionConfidence: 0.5, 
                minTrackingConfidence: 0.5 
            });

            this.hands.onResults(this.handleResults.bind(this));
        } catch (error) {
            throw new Error(`MediaPipe Instantiation Failed: ${error.message}`);
        }
    }

    /**
     * Main Initialization Logic.
     */
    async init() {
        if (this.isInitialized) return;

        if (typeof Hands === 'undefined' || window.mediaPipeLoadError) {
            console.warn("[InputManager] External Dependency Failed (Offline/CDN). Forcing Mouse Mode.");
            this.enableFallbackMode();
            return;
        }

        try {
            this._hardResetAI(); 
            await this.startCamera();
            
            this.inputType = 'CAMERA';
            this.isInitialized = true;
            this.consecutiveErrors = 0;
            
            eventBus.emit(EVENTS.INPUT_MODE_CHANGED, 'CAMERA_INIT');

        } catch (error) {
            console.warn("[InputManager] Init failed. Triggering Fallback.", error);
            this.enableFallbackMode();
        }
    }

    async startCamera() {
        this._stopCameraStream();

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 30 } 
        });
        
        this.cameraStream = stream;
        this.video.srcObject = stream;
        
        await new Promise((resolve, reject) => {
            this.video.onloadedmetadata = () => {
                this.video.play().then(resolve).catch(reject);
            };
            this.video.onerror = reject;
        });

        if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
            throw new Error("Video stream active but contains no data (Black Frame).");
        }
    }

    /**
     * Activates Fallback Mode (Mouse Control).
     * Stops Watchdog and AI loops.
     */
    enableFallbackMode() {
        if (this.inputType === 'MOUSE') return;

        console.log("[InputManager] Activating Fallback Mode & Background Recovery...");
        
        // Stop Watchdog
        if (this.watchdogInterval) clearInterval(this.watchdogInterval);
        this.watchdogInterval = null;
        
        this.inputType = 'MOUSE';
        this.isInitialized = true; 
        this.isProcessing = false;
        
        this._stopCameraStream();
        this.currentLoopId++; 

        // CRITICAL UPDATE: 
        // Emitting this event now triggers the "Critical Failure" red pulse in HUD.js
        eventBus.emit(EVENTS.INPUT_MODE_CHANGED, 'MOUSE_FALLBACK');
        
        // Mouse is 100% accurate by definition
        eventBus.emit(EVENTS.GESTURE_ACCURACY, 100); 

        // Start Recovery if possible
        if (typeof Hands !== 'undefined' && !window.mediaPipeLoadError) {
            this._startRecoveryMechanism();
        }
    }

    _startRecoveryMechanism() {
        if (this.recoveryInterval) clearInterval(this.recoveryInterval);
        
        this.recoveryInterval = setInterval(async () => {
            await this._attemptRecovery();
        }, this.RECOVERY_DELAY);
    }

    async _attemptRecovery() {
        if (this.inputType === 'CAMERA') {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
            return;
        }

        try {
            await this.startCamera();
            this._hardResetAI();

            if (this.video && this.video.readyState >= 2) {
                // Initial dummy send
                this.isProcessing = true;
                await this.hands.send({ image: this.video });
                this.isProcessing = false;
                this.restoreCameraMode();
            }
        } catch (e) {
            this._stopCameraStream();
            this.isProcessing = false;
        }
    }

    restoreCameraMode() {
        console.log("[InputManager] System Recovered. Restoring Gesture Control.");
        
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
        }

        this.inputType = 'CAMERA';
        this.consecutiveErrors = 0;
        this.criticalStressStartTime = 0;

        eventBus.emit(EVENTS.INPUT_MODE_CHANGED, 'CAMERA_RESTORE');
        this.startTracking();
    }

    /**
     * Internal Logic: Calculates 'Hybrid Stress'
     * Takes the MAXIMUM of Latency Stress (Time) and Error Stress (Instability).
     */
    _calculateHybridStress(latency) {
        const { MAX_LATENCY_MS } = GameConfig.AI_MONITORING;
        
        // 1. Latency Stress (Speed)
        const latencyStress = Math.min(100, (latency / MAX_LATENCY_MS) * 100);
        
        // 2. Error Stress (Stability)
        const errorStress = Math.min(100, (this.consecutiveErrors / this.MAX_ERRORS) * 100);
        
        // Return worst-case scenario
        return Math.max(latencyStress, errorStress);
    }

    /**
     * Processes AI results. 
     */
    handleResults(res) {
        if (this.inputType !== 'CAMERA') return;

        // 1. End Latency Measurement
        const now = performance.now();
        const latency = now - this.lastFrameTime;
        
        // 2. Unlock Gatekeeper
        this.isProcessing = false; 
        
        // Reset errors on success
        this.consecutiveErrors = 0;

        // 3. Calculate Hybrid Stress (Purely latency here, as errors are 0)
        const stress = this._calculateHybridStress(latency);
        eventBus.emit(EVENTS.AI_STRESS_UPDATED, stress);

        // 4. Check Critical Stress Duration (Auto-Fallback)
        const { CRITICAL_STRESS_THRESHOLD, AUTO_FALLBACK_DURATION } = GameConfig.AI_MONITORING;
        
        if (stress > CRITICAL_STRESS_THRESHOLD) {
            if (this.criticalStressStartTime === 0) {
                this.criticalStressStartTime = now;
            } else if (now - this.criticalStressStartTime > AUTO_FALLBACK_DURATION) {
                console.warn("[InputManager] Sustained High Stress (Auto-Fallback Triggered).");
                this.enableFallbackMode();
                return;
            }
        } else {
            this.criticalStressStartTime = 0; 
        }

        // 5. Standard Tracking Logic
        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            const conf = res.multiHandedness[0].score;
            eventBus.emit(EVENTS.GESTURE_ACCURACY, Math.round(conf * 100));

            if (conf > 0.35) {
                const yCoord = res.multiHandLandmarks[0][8].y; 
                const minB = 0.3, maxB = 0.7; 
                this.targetY = Math.max(0, Math.min(1, (yCoord - minB) / (maxB - minB)));
            }
        } else {
            eventBus.emit(EVENTS.GESTURE_ACCURACY, 0);
        }
    }

    /**
     * Starts the Tracking Loop and the Watchdog.
     */
    startTracking() {
        if (this.inputType === 'CAMERA') {
            this.currentLoopId++;
            this._startWatchdog();
            this._cameraLoop(this.currentLoopId);
        }
    }

    /**
     * Watchdog: Monitors 'isProcessing'. 
     * If true for too long, AI is hung.
     */
    _startWatchdog() {
        if (this.watchdogInterval) clearInterval(this.watchdogInterval);
        const { WATCHDOG_INTERVAL, WATCHDOG_TIMEOUT } = GameConfig.AI_MONITORING;
        
        this.watchdogInterval = setInterval(() => {
            // If processing is locked AND time elapsed > timeout
            if (this.isProcessing && (performance.now() - this.lastFrameTime > WATCHDOG_TIMEOUT)) {
                console.warn("[InputManager] Watchdog Triggered: AI Hung. Forcing Fallback.");
                
                // BUG-01 FIX: Explicitly signal 100% stress so UI records the spike before fallback
                eventBus.emit(EVENTS.AI_STRESS_UPDATED, 100);
                
                this.enableFallbackMode();
            }
        }, WATCHDOG_INTERVAL);
    }

    /**
     * The Tracking Loop with Back-pressure Prevention.
     */
    async _cameraLoop(loopId) {
        if (loopId !== this.currentLoopId || this.inputType !== 'CAMERA') return;

        // BACK-PRESSURE CHECK & HYBRID STRESS UPDATE:
        if (this.isProcessing) {
            const now = performance.now();
            const pendingLatency = now - this.lastFrameTime;
            
            // Calculate Hybrid Stress
            const stress = this._calculateHybridStress(pendingLatency);
            
            eventBus.emit(EVENTS.AI_STRESS_UPDATED, stress);

            requestAnimationFrame(() => this._cameraLoop(loopId));
            return;
        }

        if (this.video && this.video.readyState >= 2) {
            try {
                // Lock Gatekeeper
                this.isProcessing = true;
                this.lastFrameTime = performance.now();
                
                await this.hands.send({ image: this.video });

            } catch (e) {
                this.isProcessing = false; // Unlock on error
                this.consecutiveErrors++;

                // IMMEDIATE FEEDBACK:
                // Calculate stress based on new Error Count immediately.
                const stress = this._calculateHybridStress(0);
                eventBus.emit(EVENTS.AI_STRESS_UPDATED, stress);

                if (this.consecutiveErrors > this.MAX_ERRORS) {
                    this.enableFallbackMode();
                    return; 
                }
            }
        }
        
        requestAnimationFrame(() => this._cameraLoop(loopId));
    }

    getY() {
        let rawInput;
        if (this.inputType === 'CAMERA') {
            rawInput = this.targetY;
        } else {
            rawInput = this.mouseY;
        }
        this.smoothedY = (rawInput * 0.22) + (this.smoothedY * 0.78);
        return this.smoothedY;
    }
}