/*
    File: js/Systems/CollisionManager.js
    Description: Handles physics interactions and collision detection.
                 Uses AABB (Axis-Aligned Bounding Box) logic with hitbox padding
                 to ensure "fair" gameplay (ignoring transparent corners of sprites).
*/

export class CollisionManager {
    
    /**
     * Checks for a collision between the Player (Balloon) and an Obstacle (Bird).
     * Uses AABB algorithm with padding for better UX.
     * 
     * @param {Object} balloon - The player entity (x, y, w, h).
     * @param {Object} obstacle - The obstacle entity (x, y, size).
     * @returns {boolean} - True if collision detected, False otherwise.
     */
    static checkCollision(balloon, obstacle) {
        // Validation: Ensure entities exist to prevent runtime crashes
        if (!balloon || !obstacle) return false;
        if (!obstacle.active) return false; // Don't collide with dead objects

        // Hitbox Padding:
        // Reduces the effective collision area to ignore transparent pixels.
        // Higher value = More forgiving (Easier game).
        const padding = 22; 

        // Define Box A (Balloon) with padding
        const balloonLeft = balloon.x + padding;
        const balloonRight = balloon.x + balloon.w - padding;
        const balloonTop = balloon.y + padding;
        const balloonBottom = balloon.y + balloon.h - padding;

        // Define Box B (Obstacle) with padding
        // Obstacles are square, so width/height = size
        const obsLeft = obstacle.x + padding;
        const obsRight = obstacle.x + obstacle.size - padding;
        const obsTop = obstacle.y + padding;
        const obsBottom = obstacle.y + obstacle.size - padding;

        // AABB Collision Rule:
        // If the boxes overlap on BOTH X and Y axes, a collision occurred.
        const isColliding = (
            balloonLeft < obsRight &&
            balloonRight > obsLeft &&
            balloonTop < obsBottom &&
            balloonBottom > obsTop
        );

        return isColliding;
    }
}