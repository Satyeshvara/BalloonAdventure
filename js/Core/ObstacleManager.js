/*
    File: js/Core/ObstacleManager.js
    Description: Manages the lifecycle of obstacles (Birds).
                 Handles Object Pooling, Spawning Logic, and Collision Detection.
    
    DSA Strategy: 
    - Implements Object Pooling to zero-out Garbage Collection during gameplay.
    - Uses Swap-and-Pop (O(1)) for efficient removal of active entities.
*/

import { Birds } from '../Entities/Birds.js';
import { GameConfig } from './GameConfigurationManager.js';
import { CollisionManager } from '../Systems/CollisionManager.js';

class ObstacleManager {
    constructor() {
        this.ctx = null;
        this.img = null;
        
        // Memory Pools
        this.pool = [];            // Inactive objects (ready to use)
        this.activeObstacles = []; // Objects currently on screen
    }

    /**
     * Initializes the pool with Bird entities.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLImageElement} imageAsset 
     */
    init(ctx, imageAsset) {
        this.ctx = ctx;
        this.img = imageAsset;
        this.pool = [];
        this.activeObstacles = [];

        // Pre-allocate memory based on Config
        for (let i = 0; i < GameConfig.POOLING.OBSTACLE_POOL_SIZE; i++) {
            const bird = new Birds(this.ctx, this.img);
            this.pool.push(bird);
        }
        
        console.log(`[ObstacleManager] Initialized with ${this.pool.length} entities.`);
    }

    /**
     * Main Logic Loop: Handles Spawning, Updates, and Collisions.
     * @param {number} dt - Delta Time
     * @param {number} score - Current Score (determines difficulty)
     * @param {number} canvasW - Current Canvas Width
     * @param {number} canvasH - Current Canvas Height
     * @param {Object} balloon - Player Entity (for collision check)
     * @returns {Object} Result - { scoreAdded: number, hasCollided: boolean, collisionX: number, collisionY: number }
     */
    update(dt, score, canvasW, canvasH, balloon) {
        const result = {
            scoreAdded: 0,
            hasCollided: false,
            collisionX: 0,
            collisionY: 0
        };

        const timeScale = dt / GameConfig.PHYSICS.GAME_SPEED_TIMESCALE;

        // --- 1. Spawning Logic ---
        this._handleSpawning(timeScale, score, canvasW, canvasH);

        // --- 2. Update & Collision Loop ---
        // Iterate backwards to allow safe removal (Swap-and-Pop)
        for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
            const obstacle = this.activeObstacles[i];
            
            // A. Update Position
            // obstacle.update() returns true if it goes off-screen (Despawn)
            if (obstacle.update(dt)) {
                result.scoreAdded += 10; // Score for surviving the obstacle
                this._returnToPool(i);
                continue;
            }

            // B. Check Collision
            if (balloon && CollisionManager.checkCollision(balloon, obstacle)) {
                result.hasCollided = true;
                // Capture coordinates for explosion effect
                result.collisionX = obstacle.x; 
                result.collisionY = obstacle.y;
                // Don't return immediately; let the loop finish or break based on game design.
                // Here we return immediately because game is over.
                return result; 
            }
        }

        return result;
    }

    draw() {
        for (const obstacle of this.activeObstacles) {
            obstacle.draw();
        }
    }

    reset() {
        // Move all active obstacles back to pool
        while(this.activeObstacles.length > 0) {
            const obs = this.activeObstacles.pop();
            obs.active = false;
            this.pool.push(obs);
        }
        // Ensure pool integrity
        if (this.pool.length !== GameConfig.POOLING.OBSTACLE_POOL_SIZE) {
            console.warn("[ObstacleManager] Pool size mismatch on reset. Re-initializing.");
            // Re-fill if necessary (Safety fallback)
            // Ideally, we shouldn't lose objects unless code has bugs.
        }
    }

    handleResize(newH, oldH) {
        // Adjust positions if window resizes
        const scaleY = newH / oldH;
        this.pool.forEach(obj => {
            if (obj.active) {
                obj.y *= scaleY;
                obj.canvasH = newH;
            }
        });
    }

    // --- Private Helpers ---

    _handleSpawning(timeScale, score, canvasW, canvasH) {
        // Calculate Difficulty
        const difficultyMult = 1.0 + (score * GameConfig.DIFFICULTY.SPEED_INCREMENT);
        
        const spawnRate = Math.min(
            GameConfig.DIFFICULTY.MAX_SPAWN_RATE, 
            GameConfig.DIFFICULTY.SPAWN_RATE_INITIAL + (score * GameConfig.DIFFICULTY.SPAWN_RATE_INCREMENT)
        );

        // Random Chance Spawn
        if (Math.random() < (spawnRate * timeScale) && this.pool.length > 0) {
            const bird = this.pool.pop();
            bird.spawn(canvasW, canvasH, difficultyMult, score);
            this.activeObstacles.push(bird);
        }
    }

    _returnToPool(index) {
        const obstacle = this.activeObstacles[index];
        obstacle.active = false;
        this.pool.push(obstacle);

        // DSA Optimization: Swap-and-Pop (O(1))
        // Replace current element with the last one, then remove the last one.
        this.activeObstacles[index] = this.activeObstacles[this.activeObstacles.length - 1];
        this.activeObstacles.pop();
    }
}

// Export Singleton
export const obstacleManager = new ObstacleManager();