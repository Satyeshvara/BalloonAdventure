/*
    File: js/Core/EnvironmentManager.js
    Description: Manages the Game Environment (Canvas Dimensions & Sky Background).
                 Handles dynamic resizing and gradient generation.
    
    Responsibility:
    - Maintains Canvas Size synced with Window.
    - Generates and Renders the Sky Gradient.
*/

class EnvironmentManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.skyGradient = null;
    }

    /**
     * Initialize the environment.
     * @param {HTMLCanvasElement} canvas 
     * @param {CanvasRenderingContext2D} ctx 
     */
    init(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Initial build
        this.handleResize();
    }

    /**
     * Updates canvas dimensions and rebuilds the sky gradient.
     * Should be called on initialization and window resize events.
     */
    handleResize() {
        if (!this.canvas || !this.ctx) return;

        // 1. Sync Canvas with Window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // 2. Re-create Gradient based on new height
        this.skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        this.skyGradient.addColorStop(0, '#80B5FF'); // Light Blue (Top)
        this.skyGradient.addColorStop(1, '#D9E9FF'); // Pale Blue (Bottom)
    }

    /**
     * Renders the background.
     */
    draw() {
        if (!this.ctx || !this.skyGradient) return;

        this.ctx.fillStyle = this.skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Export Singleton
export const environmentManager = new EnvironmentManager();