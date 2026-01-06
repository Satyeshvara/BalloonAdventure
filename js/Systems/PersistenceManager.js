/*
    File: js/Systems/PersistenceManager.js
    Description: Manages data persistence using localStorage with an in-memory cache layer.
    Principles: 
        1. Cache-First Strategy (Reads are O(1) from memory).
        2. Fail-Safe (Handles disabled localStorage gracefully).
        3. Schema Validation (Ensures default values exist).
*/

const STORAGE_KEY = 'Database-BalloonAdventure_v1.0';

const DEFAULT_DATA = {
    highScore: 0,
    settings: {
        musicEnabled: true,     // Audio Manager preference
        hudPosition: 'left',    // UI preference
        sensitivity: 50         // Input Manager preference
    }
};

class PersistenceManager {
    constructor() {
        // In-Memory Cache (RAM) - This is our "Single Source of Truth" during runtime.
        // Deep copy default data to avoid reference issues
        this.cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.isSupported = this._checkStorageSupport();
    }

    /**
     * Internal check to see if localStorage is available and writable.
     * Some browsers disable this in Incognito mode.
     */
    _checkStorageSupport() {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn("[PersistenceManager] LocalStorage is disabled or full. Data will not persist.");
            return false;
        }
    }

    /**
     * Loads data from disk to memory.
     * Called once during game initialization.
     */
    load() {
        if (!this.isSupported) return;

        try {
            const rawData = localStorage.getItem(STORAGE_KEY);
            if (rawData) {
                const parsedData = JSON.parse(rawData);
                
                // Merge Logic: Protects against schema updates.
                // If we add new settings in the future, existing saves won't break.
                this.cache = {
                    ...this.cache,
                    ...parsedData,
                    settings: {
                        ...this.cache.settings,
                        ...(parsedData.settings || {})
                    }
                };
            }
        } catch (e) {
            console.error("[PersistenceManager] Failed to load save data:", e);
        }
    }

    /**
     * Serializes memory cache and writes to disk.
     */
    save() {
        if (!this.isSupported) return;

        try {
            const jsonString = JSON.stringify(this.cache);
            localStorage.setItem(STORAGE_KEY, jsonString);
        } catch (e) {
            console.warn("[PersistenceManager] Failed to save data (Quota Exceeded?):", e);
        }
    }

    // --- High Score API ---

    getHighScore() {
        return this.cache.highScore;
    }

    /**
     * Updates high score only if the new score is higher.
     * @param {number} score 
     * @returns {boolean} True if new high score was set.
     */
    tryUpdateHighScore(score) {
        if (score > this.cache.highScore) {
            this.cache.highScore = score;
            this.save(); 
            return true;
        }
        return false;
    }

    // --- Settings API ---

    getSettings() {
        return this.cache.settings;
    }

    updateSetting(key, value) {
        if (this.cache.settings.hasOwnProperty(key)) {
            this.cache.settings[key] = value;
            this.save();
        } else {
            console.warn(`[PersistenceManager] Invalid setting key: ${key}`);
        }
    }
    
    resetData() {
        this.cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this.save();
        console.log("[PersistenceManager] Data reset to defaults.");
    }
}

// Export Singleton
export const persistenceManager = new PersistenceManager();