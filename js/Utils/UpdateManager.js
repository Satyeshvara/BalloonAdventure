/*Path: js/Utils/UpdateManager.js*/

export class UpdateManager {
    constructor() {
        // UPDATED KEY as requested
        this.STORAGE_KEY = 'BalloonAdventure-Updates'; 
        this.jsonPath = 'database/Update.json';
    }

    /**
     * Checks for updates by fetching the JSON config.
     * Returns TRUE if an update is available (and renders the UI).
     * Returns FALSE if no update is needed.
     */
    async checkForUpdates() {
        try {
            // 1. Fetch JSON with Cache Busting (Timestamp ensures we get fresh data)
            const response = await fetch(`${this.jsonPath}?t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load update config: ${response.status}`);
            }
            
            const config = await response.json();
            const currentVersion = config.version;
            const storedVersion = localStorage.getItem(this.STORAGE_KEY);

            // 2. Compare Versions
            // If storedVersion is null (first visit) OR different from currentVersion
            if (currentVersion !== storedVersion) {
                console.log(`[UpdateManager] Update found: ${currentVersion} (Local: ${storedVersion})`);
                this._renderUpdateModal(config);
                return true; // Signal to Halt Game Initialization
            }

            return false; // Proceed with game
        } catch (error) {
            console.warn("[UpdateManager] Skipped update check (Offline or Missing Config):", error);
            return false; // Fail-safe: Allow game to run even if check fails
        }
    }

    _renderUpdateModal(config) {
        // Generate Paragraphs dynamically from "contents" key
        const contentItems = config.contents.map(line => `<p>${line}</p>`).join('');

        // Create Overlay Element
        const overlay = document.createElement('div');
        overlay.className = 'update-overlay';
        
        // Inject HTML with the updated structure
        // This now includes a dedicated .update-header to group title and version
        overlay.innerHTML = `
            <div class="update-card">
                <div class="update-header">
                    <h2 class="update-title">A new version is ready!</h2>
                    <div class="update-version">v${config.version}</div>
                </div>
                
                <div class="update-content">
                    ${contentItems}
                </div>

                <button id="updateBtn">Let's update!</button>
            </div>
        `;

        // Append to Body
        document.body.appendChild(overlay);

        // Bind Button Action
        const btn = document.getElementById('updateBtn');
        if (btn) {
            btn.onclick = () => {
                // 1. Save new version to LocalStorage
                localStorage.setItem(this.STORAGE_KEY, config.version);
                
                // 2. Force Refresh via Cache-Busting Query Param
                // This appends ?v=1.1 to the URL, forcing the browser to reload fresh assets
                const url = new URL(window.location.href);
                url.searchParams.set('v', config.version); 
                window.location.href = url.toString();
            };
        }
    }
}