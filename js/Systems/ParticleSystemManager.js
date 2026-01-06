/*
    File: js/Systems/ParticleSystemManager.js
    Description: Manages visual effects (Explosions, Confetti) using an optimized Object Pool.
    DSA Strategy: 
        1. Object Pooling: Pre-allocates memory to avoid Garbage Collection spikes.
        2. Swap-and-Pop: Uses O(1) removal logic for the active list.
*/

import { GameConfig } from '../Core/GameConfigurationManager.js';

class Particle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0; // Velocity X
        this.vy = 0; // Velocity Y
        this.life = 0; // Frames remaining
        this.size = 0;
        this.color = '#fff';
        this.alpha = 1;
    }

    /**
     * Resets the particle state for reuse.
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {string} type - 'EXPLOSION' or 'CONFETTI'
     */
    spawn(x, y, type) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.alpha = 1;

        // Randomized Life Span
        this.life = GameConfig.PARTICLES.LIFE_SPAN_MIN + Math.random() * GameConfig.PARTICLES.LIFE_SPAN_VAR;

        if (type === 'EXPLOSION') {
            // Radial burst
            const angle = Math.random() * Math.PI * 2;
            const force = Math.random() * GameConfig.PARTICLES.EXPLOSION_FORCE;
            this.vx = Math.cos(angle) * force;
            this.vy = Math.sin(angle) * force;
            this.color = '#F23D3D'; // Fire Red/Orange
            this.size = Math.random() * 5 + 3;
        } 
        else if (type === 'CONFETTI') {
            // Fountain effect (up and out)
            this.vx = (Math.random() - 0.5) * GameConfig.PARTICLES.CONFETTI_FORCE;
            this.vy = (Math.random() - 1.5) * GameConfig.PARTICLES.CONFETTI_FORCE; // Bias upwards
            const colors = GameConfig.PARTICLES.COLORS;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.size = Math.random() * 4 + 2;
        }
    }

    /**
     * Updates physics and lifecycle.
     * @param {number} timeScale - Normalized DeltaTime
     * @returns {boolean} - True if still alive
     */
    update(timeScale) {
        // Physics Integration
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // Apply Gravity
        this.vy += GameConfig.PARTICLES.GRAVITY * timeScale;

        // Apply Drag (Friction)
        this.vx *= GameConfig.PARTICLES.DRAG;
        this.vy *= GameConfig.PARTICLES.DRAG;

        // Reduce Life & Fade Out
        this.life -= 1 * timeScale;
        this.alpha = Math.max(0, this.life / (GameConfig.PARTICLES.LIFE_SPAN_MIN + GameConfig.PARTICLES.LIFE_SPAN_VAR));

        return this.life > 0;
    }
}

class ParticleSystemManager {
    constructor() {
        this.pool = [];
        this.activeParticles = [];
        this.ctx = null;
    }

    /**
     * Pre-allocates memory for particles.
     * @param {CanvasRenderingContext2D} ctx 
     */
    init(ctx) {
        this.ctx = ctx;
        this.pool = [];
        this.activeParticles = [];

        for (let i = 0; i < GameConfig.POOLING.PARTICLE_POOL_SIZE; i++) {
            this.pool.push(new Particle());
        }
        console.log(`[ParticleSystem] Initialized pool with ${GameConfig.POOLING.PARTICLE_POOL_SIZE} particles.`);
    }

    /**
     * Triggers an effect at a specific location.
     * @param {number} x 
     * @param {number} y 
     * @param {string} type - 'EXPLOSION' or 'CONFETTI'
     * @param {number} count - Number of particles to emit
     */
    emit(x, y, type, count = 10) {
        for (let i = 0; i < count; i++) {
            if (this.pool.length > 0) {
                const p = this.pool.pop(); // O(1) retrieval
                p.spawn(x, y, type);
                this.activeParticles.push(p);
            }
        }
    }

    update(dt) {
        if (this.activeParticles.length === 0) return;

        const timeScale = dt / GameConfig.PHYSICS.GAME_SPEED_TIMESCALE;

        // Reverse Loop for safe removal logic
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            
            const isAlive = p.update(timeScale);

            if (!isAlive) {
                p.active = false;
                this.pool.push(p); // Return to pool

                // DSA Optimization: Swap-and-Pop for O(1) removal
                // 1. Overwrite current dead particle with the last one in the list
                this.activeParticles[i] = this.activeParticles[this.activeParticles.length - 1];
                // 2. Remove the last element (which is now a duplicate of the dead one's position)
                this.activeParticles.pop();
            }
        }
    }

    draw() {
        if (this.activeParticles.length === 0 || !this.ctx) return;

        this.ctx.save();
        for (const p of this.activeParticles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.fillRect(p.x, p.y, p.size, p.size); 
        }
        this.ctx.restore();
    }
    
    reset() {
        // Return all active particles to pool immediately
        while(this.activeParticles.length > 0) {
             const p = this.activeParticles.pop();
             p.active = false;
             this.pool.push(p);
        }
    }
}

// Export Singleton
export const particleSystemManager = new ParticleSystemManager();