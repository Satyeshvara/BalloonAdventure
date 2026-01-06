/*
    File: js/Core/EventManager.js
    Description: Robust Pub/Sub system with memory-leak protection.
    Pattern: Singleton Observer
*/

class EventManager {
    constructor() {
        // Map stores arrays of callbacks: { 'EVENT_NAME': [func1, func2] }
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - The event identifier.
     * @param {function} callback - The function to execute.
     * @returns {function} - A function to unsubscribe this specific listener (Cleanup).
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        
        const callbacks = this.listeners.get(eventName);
        callbacks.push(callback);

        // Security Fix: Return a cleanup function to prevent memory leaks
        // Usage: const unsubscribe = eventBus.on('EVENT', cb); -> unsubscribe();
        return () => this.off(eventName, callback);
    }

    /**
     * Unsubscribe from an event manually.
     * @param {string} eventName 
     * @param {function} callback 
     */
    off(eventName, callback) {
        if (!this.listeners.has(eventName)) return;
        
        const callbacks = this.listeners.get(eventName);
        const index = callbacks.indexOf(callback);
        
        if (index > -1) {
            callbacks.splice(index, 1);
        }

        // Optimization: Remove key if empty to save memory
        if (callbacks.length === 0) {
            this.listeners.delete(eventName);
        }
    }

    /**
     * Publish (Emit) an event safely.
     * @param {string} eventName 
     * @param {any} data - Data to pass to listeners.
     */
    emit(eventName, data) {
        if (!this.listeners.has(eventName)) return;
        
        const callbacks = this.listeners.get(eventName);
        
        // Iterate over a copy to prevent issues if listeners unsubscribe during emit
        [...callbacks].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                // Fault Tolerance: Log error but don't crash the game loop
                console.error(`[EventManager] Error in listener for '${eventName}':`, error);
            }
        });
    }
}

// Export Singleton Instance
export const eventBus = new EventManager();

// Standardized Event Constants (Enum)
export const EVENTS = {
    // Game State
    GAME_START: 'GAME_START',
    GAME_OVER: 'GAME_OVER',
    GAME_PAUSE: 'GAME_PAUSE',
    GAME_RESUME: 'GAME_RESUME',
    GAME_RESTART: 'GAME_RESTART',
    GAME_HOME: 'GAME_HOME',

    // Gameplay
    SCORE_UPDATED: 'SCORE_UPDATED',
    COLLISION: 'COLLISION',
    
    // System/Input
    INPUT_MODE_CHANGED: 'INPUT_MODE_CHANGED', // 'CAMERA' or 'MOUSE'
    GESTURE_ACCURACY: 'GESTURE_ACCURACY'
};