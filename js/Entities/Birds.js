import { GameConfig } from '../Core/GameConfigurationManager.js';

export class Birds {
    constructor(ctx, img) {
        this.ctx = ctx;
        this.img = img;
        
        this.active = false;
        this.x = 0; 
        this.y = 0;
        this.speed = 0; 
        this.vy = 0; 
        this.size = 0;
        this.canvasH = 0; 
    }

    spawn(canvasW, canvasH, speedMult, score) {
        // Size Logic
        this.size = GameConfig.ENTITIES.BIRDS.MIN_SIZE + Math.random() * GameConfig.ENTITIES.BIRDS.SIZE_VARIANCE;
        
        // Position Logic
        this.x = canvasW + GameConfig.ENTITIES.BIRDS.SPAWN_X_OFFSET;
        this.y = Math.random() * (canvasH - this.size);
        this.canvasH = canvasH;
        
        // Speed Logic (Updated: Removed Magic Number 3.5)
        const baseSpeed = GameConfig.DIFFICULTY.INITIAL_SPEED;
        const variance = Math.random() * GameConfig.DIFFICULTY.SPEED_VARIANCE;
        this.speed = (baseSpeed + variance) * speedMult;
        
        // Vertical Movement Logic
        if (score >= GameConfig.DIFFICULTY.SCORE_THRESHOLD_VERTICAL_MVMT) {
            this.vy = (Math.random() - 0.5) * 6 * speedMult;
        } else {
            this.vy = 0;
        }

        this.active = true;
    }

    update(dt) {
        if (!this.active) return false;
        
        const timeScale = dt / GameConfig.PHYSICS.GAME_SPEED_TIMESCALE;
        
        this.x -= this.speed * timeScale;
        this.y += this.vy * timeScale;

        const isPastLeftEdge = this.x < GameConfig.ENTITIES.BIRDS.DESPAWN_X_BUFFER;
        const isPastVerticalBounds = this.y < -GameConfig.ENTITIES.BIRDS.DESPAWN_Y_BUFFER || 
                                     this.y > this.canvasH + GameConfig.ENTITIES.BIRDS.DESPAWN_Y_BUFFER;

        if (isPastLeftEdge || isPastVerticalBounds) {
            this.active = false;
            return true;
        }
        return false;
    }

    draw() {
        if (this.active) {
            this.ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
        }
    }
}