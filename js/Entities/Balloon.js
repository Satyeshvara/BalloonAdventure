/*
    File: js/Entities/Balloon.js
    Description: Represents the player's character. Handles physics interpolation and rendering.
    Dependency: GameConfigurationManager (for physics constants)
*/

import { GameConfig } from '../Core/GameConfigurationManager.js';

export class Balloon {
    constructor(ctx, img) {
        this.ctx = ctx;
        this.img = img;
        
        // Initialize dimensions and position from Config
        this.w = GameConfig.ENTITIES.BALLOON.WIDTH;
        this.h = GameConfig.ENTITIES.BALLOON.HEIGHT;
        this.x = GameConfig.ENTITIES.BALLOON.START_X;
        
        // Start vertically centered (or as defined in config)
        this.y = window.innerHeight * GameConfig.ENTITIES.BALLOON.START_Y_RATIO;
        
        this.targetY = this.y;
        
        // Easing determines responsiveness (lag). 
        // This is mutable as it can be adjusted via Settings Slider in Main.js
        this.easing = 0.12; 
    }

    update(dt) {
        if (!isFinite(this.targetY)) return;

        // Time-based scaling ensures movement is consistent across different frame rates (FPS)
        const timeScale = dt / GameConfig.PHYSICS.GAME_SPEED_TIMESCALE; // Normalize to 60 FPS
        
        // Lerp (Linear Interpolation) for smooth movement
        // Formula: current + (target - current) * fraction
        const lerp = 1 - Math.pow(1 - this.easing, timeScale);
        this.y += (this.targetY - this.y) * lerp;
        
        // Boundary Checks: Keep balloon inside the screen
        const maxY = window.innerHeight - this.h;
        if (this.y < 0) this.y = 0;
        if (this.y > maxY) this.y = maxY;
    }

    draw() {
        if (this.img.complete) {
            this.ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
        }
    }
}