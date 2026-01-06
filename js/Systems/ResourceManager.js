/*
    File: js/Systems/ResourceManager.js
    Description: Centralized Asset Management System.
                 Handles asynchronous preloading of Images and Audio to ensure
                 smooth gameplay without "pop-in" effects or network lag.
    Dependencies: GameConfigurationManager (for paths)
*/

import { GameConfig } from '../Core/GameConfigurationManager.js';

class ResourceManager {
    constructor() {
        // Caches to store loaded DOM objects (Image/Audio)
        this.images = new Map();
        this.audio = new Map();
        
        // Status tracking
        this.isLoaded = false;
    }

    /**
     * Main entry point to start loading all assets defined in GameConfig.
     * @returns {Promise} Resolves when ALL assets are ready.
     */
    async init() {
        console.log("[ResourceManager] Starting Asset Preloading...");

        try {
            const imagePromises = this._loadImages(GameConfig.ASSETS.IMAGES);
            const audioPromises = this._loadAudio(GameConfig.ASSETS.AUDIO);

            // Wait for both queues to finish parallel loading
            await Promise.all([...imagePromises, ...audioPromises]);

            this.isLoaded = true;
            console.log("[ResourceManager] All Assets Loaded Successfully.");
            return true;

        } catch (error) {
            console.error("[ResourceManager] Critical Error Loading Assets:", error);
            throw error; // Propagate error to Main.js to stop game start
        }
    }

    /**
     * Helper: Iterates over the Image Config and creates Promises.
     * @param {Object} imageList - Dictionary from GameConfig
     * @returns {Array<Promise>}
     */
    _loadImages(imageList) {
        return Object.entries(imageList).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;

                img.onload = () => {
                    this.images.set(key, img); // Store using the Config Key (e.g., 'BALLOON')
                    resolve();
                };

                img.onerror = () => {
                    reject(`Failed to load image: ${src}`);
                };
            });
        });
    }

    /**
     * Helper: Iterates over the Audio Config and creates Promises.
     * @param {Object} audioList - Dictionary from GameConfig
     * @returns {Array<Promise>}
     */
    _loadAudio(audioList) {
        return Object.entries(audioList).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.src = src;
                
                // For 'loop' settings, we handle logic in AudioManager, 
                // here we just ensure the file exists and is readable.
                
                // 'canplaythrough' event means enough data is buffered to play.
                const onLoaded = () => {
                    this.audio.set(key, audio);
                    // Cleanup event listener to avoid memory leaks
                    audio.removeEventListener('canplaythrough', onLoaded);
                    audio.removeEventListener('error', onError);
                    resolve();
                };

                const onError = (e) => {
                    reject(`Failed to load audio: ${src}`);
                };

                audio.addEventListener('canplaythrough', onLoaded);
                audio.addEventListener('error', onError);

                // Force browser to start loading metadata
                audio.load();
            });
        });
    }

    /**
     * Retrieve a loaded Image asset.
     * @param {string} key - The key from GameConfig (e.g., 'BALLOON')
     * @returns {HTMLImageElement}
     */
    getImage(key) {
        const img = this.images.get(key);
        if (!img) {
            console.warn(`[ResourceManager] Image key not found: ${key}`);
            return null;
        }
        return img;
    }

    /**
     * Retrieve a loaded Audio asset.
     * @param {string} key - The key from GameConfig (e.g., 'BG_MUSIC')
     * @returns {HTMLAudioElement}
     */
    getAudio(key) {
        const aud = this.audio.get(key);
        if (!aud) {
            console.warn(`[ResourceManager] Audio key not found: ${key}`);
            return null;
        }
        return aud;
    }
}

// Export as Singleton
export const resourceManager = new ResourceManager();