/**
 * Real-Time Clock Manager
 * Handles the idle detection and time display logic for the Homepage.
 */

// Configuration Constants
const IDLE_TIMEOUT_MS = 15000; // 15 Seconds

// DOM Elements (Cached for O(1) performance)
let overlay = null;
let timeEl = null;
let dateEl = null;
let homeContainer = null;

// State Variables
let idleTimer = null;
let clockInterval = null;
let isClockVisible = false;

/**
 * Initializes the Real-Time Clock System.
 * Should be called after the DOM is fully loaded.
 */
function initRealTimeClock() {
    // 1. Create and Inject HTML dynamically if not present
    if (!document.getElementById('real-time-clock-overlay')) {
        createClockDOM();
    }

    // 2. Cache References
    overlay = document.getElementById('real-time-clock-overlay');
    timeEl = document.getElementById('rtc-time');
    dateEl = document.getElementById('rtc-date');
    homeContainer = document.getElementById('permission-modal'); // Used to check if we are on Home

    // 3. Start Idle Listener
    resetIdleTimer();

    // 4. Attach Event Listeners for User Activity
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'click', 'touchstart'];
    activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity);
    });
}

/**
 * Creates the overlay HTML structure strictly for the JS module.
 */
function createClockDOM() {
    const div = document.createElement('div');
    div.id = 'real-time-clock-overlay';
    div.innerHTML = `
        <div id="rtc-time">00 : 00 : 00</div>
        <div id="rtc-date">Day, Date Month Year</div> 
    `;
    document.body.appendChild(div);
}

/**
 * Handles any user interaction (Mouse/Keyboard).
 * Dismisses clock if active, and resets the idle timer.
 */
function handleUserActivity() {
    if (isClockVisible) {
        hideClock();
    }
    resetIdleTimer();
}

/**
 * Resets the 15-second inactivity timer.
 */
function resetIdleTimer() {
    // Clear existing timer
    if (idleTimer) clearTimeout(idleTimer);

    // Only set timer if we are strictly on the Homepage
    if (isHomepageActive()) {
        idleTimer = setTimeout(showClock, IDLE_TIMEOUT_MS);
    }
}

/**
 * Checks if the User is currently on the Homepage.
 * Returns true if the Main Menu (permission-modal) is visible.
 */
function isHomepageActive() {
    // Safety: If element doesn't exist, assume false
    if (!homeContainer) return false;
    
    // Check if the home container is displayed
    const style = window.getComputedStyle(homeContainer);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Displays the Clock Overlay and starts the time update loop.
 */
function showClock() {
    // Double check we are still on home before showing
    if (!isHomepageActive()) return;

    isClockVisible = true;
    overlay.style.display = 'flex';
    
    updateTime(); // Immediate update to replace placeholder
    // Start interval to update every second
    clockInterval = setInterval(updateTime, 1000);
}

/**
 * Hides the Clock Overlay and stops the time update loop.
 */
function hideClock() {
    isClockVisible = false;
    overlay.style.display = 'none';
    
    // Clear interval to save resources
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

/**
 * Updates the text content of Time and Date elements.
 */
function updateTime() {
    const now = new Date();

    // Format Time: Hours : Minutes : Seconds
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = `${h} : ${m} : ${s}`;

    // Format Date: Day, Date Month Year
    // Example: Sunday, 1 January 2026
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();

    dateEl.textContent = `${dayName}, ${dateNum} ${monthName} ${year}`;
}

// Auto-initialize when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealTimeClock);
} else {
    initRealTimeClock();
}