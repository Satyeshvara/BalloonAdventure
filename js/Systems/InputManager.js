/*
    File: js/Systems/InputManager.js
    Description: Manages input via MediaPipe Hands (Primary) or Mouse/Touch (Fallback).
                 Implements strict lifecycle management and communicates via EventManager.
                 
    UPDATES (Security Patch): 
    - Implemented Offline/CDN Failure Check.
    - Added Graceful Degradation to Mouse Mode if Hands API is missing.
*/

import { eventBus, EVENTS } from '../Core/EventManager.js';

export class InputManager {
    constructor(videoElement) {
        this.video = videoElement;
        this.hands = null;
        this.cameraStream = null;
        
        // --- State Management ---
        this.inputType = 'NONE'; // 'CAMERA', 'MOUSE', 'NONE'
        this.isInitialized = false; 
        
        // --- Loop Control (The Zombie Killer) ---
        this.currentLoopId = 0; // Unique ID for the active tracking loop

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
     * Wrapped in Try-Catch for Fault Tolerance.
     */
    _hardResetAI() {
        if (this.hands) {
            try {
                this.hands.close(); // Critical: Frees GPU memory
            } catch (e) {
                console.warn("[InputManager] Error closing old Hands instance:", e);
            }
            this.hands = null;
        }

        console.log("[InputManager] Initializing Fresh AI Instance...");
        
        // DEFENSIVE CODING:
        // Even if the class exists, instantiation might fail (e.g., WebAssembly error)
        try {
            // Global 'Hands' object comes from the CDN script in index.html
            this.hands = new Hands({ 
                locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` 
            });

            this.hands.setOptions({ 
                maxNumHands: 1, 
                modelComplexity: 0, // 0 = Faster (Lite), 1 = Full
                minDetectionConfidence: 0.5, 
                minTrackingConfidence: 0.5 
            });

            this.hands.onResults(this.handleResults.bind(this));
        } catch (error) {
            // Re-throw to be caught by init() fallback logic
            throw new Error(`MediaPipe Instantiation Failed: ${error.message}`);
        }
    }

    /**
     * Main Initialization Logic.
     */
    async init() {
        if (this.isInitialized) return;

        // --- CRITICAL CHECK: EXTERNAL DEPENDENCY VALIDATION ---
        // Check if CDN loaded correctly using the flag from index.html OR standard type check
        if (typeof Hands === 'undefined' || window.mediaPipeLoadError) {
            console.warn("[InputManager] External Dependency Failed (Offline/CDN). Forcing Mouse Mode.");
            this.enableFallbackMode();
            return;
        }

        try {
            this._hardResetAI(); // Initial Setup
            await this.startCamera();
            
            this.inputType = 'CAMERA';
            this.isInitialized = true;
            this.consecutiveErrors = 0;
            
            // Broadcast Success
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

        // Strict Validation: Ensure video actually has data
        if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
            throw new Error("Video stream active but contains no data (Black Frame).");
        }
    }

    enableFallbackMode() {
        if (this.inputType === 'MOUSE') return;

        console.log("[InputManager] Activating Fallback Mode & Background Recovery...");
        this.inputType = 'MOUSE';
        this.isInitialized = true; 
        
        this._stopCameraStream();
        
        // Kill zombie loops by incrementing ID
        this.currentLoopId++; 

        // Broadcast Fallback Event
        eventBus.emit(EVENTS.INPUT_MODE_CHANGED, 'MOUSE_FALLBACK');
        
        // Force status update to hide "Hand Not Found" UI immediately
        eventBus.emit(EVENTS.GESTURE_ACCURACY, 100); 

        // Only attempt recovery if MediaPipe is actually loaded.
        // If it failed to load entirely, recovery is impossible without page reload.
        if (typeof Hands !== 'undefined' && !window.mediaPipeLoadError) {
            this._startRecoveryMechanism();
        } else {
            console.log("[InputManager] Recovery disabled due to missing dependencies.");
        }
    }

    _startRecoveryMechanism() {
        if (this.recoveryInterval) clearInterval(this.recoveryInterval);
        
        // Passive check every 5 seconds to see if camera is back
        this.recoveryInterval = setInterval(async () => {
            await this._attemptRecovery();
        }, this.RECOVERY_DELAY);
    }

    async _attemptRecovery() {
        // Stop checks if we are already back in Camera mode
        if (this.inputType === 'CAMERA') {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
            return;
        }

        try {
            await this.startCamera();
            this._hardResetAI();

            if (this.video && this.video.readyState >= 2) {
                // Process one dummy frame to verify pipeline
                await this.hands.send({ image: this.video });
                this.restoreCameraMode();
            }
        } catch (e) {
            // Quiet fail, clean up and wait for next interval
            this._stopCameraStream();
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

        eventBus.emit(EVENTS.INPUT_MODE_CHANGED, 'CAMERA_RESTORE');

        this.startTracking();
    }

    /**
     * Processes AI results from MediaPipe.
     */
    handleResults(res) {
        if (this.inputType !== 'CAMERA') return;

        this.consecutiveErrors = 0;
        
        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            const conf = res.multiHandedness[0].score;
            
            // Broadcast Accuracy for HUD
            eventBus.emit(EVENTS.GESTURE_ACCURACY, Math.round(conf * 100));

            if (conf > 0.35) {
                const yCoord = res.multiHandLandmarks[0][8].y; // Index finger tip
                const minB = 0.3, maxB = 0.7; // Active area bounds
                this.targetY = Math.max(0, Math.min(1, (yCoord - minB) / (maxB - minB)));
            }
        } else {
            // Hand lost
            eventBus.emit(EVENTS.GESTURE_ACCURACY, 0);
        }
    }

    startTracking() {
        if (this.inputType === 'CAMERA') {
            this.currentLoopId++;
            this._cameraLoop(this.currentLoopId);
        }
    }

    async _cameraLoop(loopId) {
        // Stop if loop ID changed (Zombie Killer) or mode changed
        if (loopId !== this.currentLoopId) return;
        if (this.inputType !== 'CAMERA') return;

        if (this.video && this.video.readyState >= 2) {
            try {
                await this.hands.send({ image: this.video });
            } catch (e) {
                this.consecutiveErrors++;
                if (this.consecutiveErrors > this.MAX_ERRORS) {
                    this.enableFallbackMode();
                    return; 
                }
            }
        }
        
        requestAnimationFrame(() => this._cameraLoop(loopId));
    }

    /**
     * Public API: Returns the current smoothed Y position (0.0 to 1.0).
     * Used by Main.js game loop.
     */
    getY() {
        let rawInput;
        if (this.inputType === 'CAMERA') {
            rawInput = this.targetY;
        } else {
            rawInput = this.mouseY;
        }
        // Smooth interpolation
        this.smoothedY = (rawInput * 0.22) + (this.smoothedY * 0.78);
        return this.smoothedY;
    }
}