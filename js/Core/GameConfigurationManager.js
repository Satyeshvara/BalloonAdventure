/*
    File: js/Core/GameConfigurationManager.js
    Description: Centralized, immutable repository for all game constants.
    Security: Uses Object.freeze to prevent runtime modification.
*/

export const GameConfig = Object.freeze({
    // --- Asset Paths (Aligned with Directory Structure) ---
    ASSETS: {
        IMAGES: {
            BALLOON: 'assets/Images/Balloon.png', 
            BIRDS: 'assets/Images/Birds.png'
        },
        AUDIO: {
            BG_MUSIC: 'assets/Audio/Music/SlowDancing.mp3'
        }
    },

    // --- Gameplay Physics & Mechanics ---
    PHYSICS: {
        GRAVITY_EASING_MIN: 0.05,
        GRAVITY_EASING_MAX: 0.45,
        BALLOON_SMOOTHING: 0.22, // Input smoothing factor (Lerp)
        GAME_SPEED_TIMESCALE: 16.67 // Target ms per frame (60 FPS)
    },

    // --- Entity Dimensions & Logic ---
    ENTITIES: {
        BALLOON: {
            WIDTH: 100,
            HEIGHT: 100,
            START_X: 100,
            START_Y_RATIO: 0.5 // Start at 50% height
        },
        BIRDS: {
            MIN_SIZE: 32,
            SIZE_VARIANCE: 8,   // Max size = 32 + 8 = 40
            SPAWN_X_OFFSET: 60, // Spawn 60px outside right edge
            DESPAWN_X_BUFFER: -150, // Despawn when 150px past left edge
            DESPAWN_Y_BUFFER: 250   // Despawn if moves too far up/down
        }
    },

    // --- Difficulty Tuning ---
    DIFFICULTY: {
        INITIAL_SPEED: 4.5,
        SPEED_VARIANCE: 3.5,    
        SPEED_INCREMENT: 0.001,
        MAX_SPEED: 8.0, // Cap speed to prevent impossible gameplay
        
        SPAWN_RATE_INITIAL: 0.01,
        SPAWN_RATE_INCREMENT: 0.00002,
        MAX_SPAWN_RATE: 0.06,

        SCORE_THRESHOLD_VERTICAL_MVMT: 500 // Score needed for birds to move vertically
    },

    // --- Object Pooling Settings ---
    POOLING: {
        OBSTACLE_POOL_SIZE: 45,
        PARTICLE_POOL_SIZE: 150 // Optimized for memory/performance balance
    },

    // --- UI/System Settings ---
    SYSTEM: {
        FPS_UPDATE_INTERVAL: 250, // ms
        TOAST_DURATION: 7000      // ms
    },

    // --- Visual Effects (Particles) ---
    PARTICLES: {
        GRAVITY: 0.5,
        DRAG: 0.96, // Air resistance factor (0.96 = 4% speed loss per frame)
        EXPLOSION_FORCE: 12,
        CONFETTI_FORCE: 6,
        LIFE_SPAN_MIN: 30, // Minimum frames to live
        LIFE_SPAN_VAR: 20, // Variance in life span
        // Vibrant colors for visual polish
        COLORS: ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3']
    }
});