/*
    General Instructions Logic
    Path: js/UI/GeneralInstructions.js
    Description: Handles fetching JSON data, dynamic HTML injection, and UI interactions.
*/

export class GeneralInstructionsManager {
    constructor() {
        // Configuration
        this.jsonPath = 'database/GeneralInstructions.json';
        this.overlayId = 'instructions-overlay';
        this.triggerBtnId = 'instructionBtn'; // Matches ID in index.html
        
        // Bind methods to ensure 'this' context is preserved
        this.openOverlay = this.openOverlay.bind(this);
        this.closeOverlay = this.closeOverlay.bind(this);
        
        this.init();
    }

    /**
     * Initialize listeners. 
     * Assumes the Trigger Button exists in the DOM at load time.
     */
    init() {
        const triggerBtn = document.getElementById(this.triggerBtnId);
        if (triggerBtn) {
            triggerBtn.addEventListener('click', this.openOverlay);
            console.log("GeneralInstructionsManager: Initialized successfully.");
        } else {
            console.warn(`GeneralInstructionsManager: Button #${this.triggerBtnId} not found.`);
        }
    }

    /**
     * Handles the opening logic:
     * 1. Checks/Creates DOM structure.
     * 2. Fetches data.
     * 3. Renders and shows UI.
     */
    async openOverlay() {
        // Lazy Loading: Create HTML structure only when needed
        if (!document.getElementById(this.overlayId)) {
            this.createOverlayStructure();
        }

        try {
            const data = await this.fetchInstructions();
            this.renderContent(data);
            this.toggleVisibility(true);
        } catch (error) {
            console.error("GeneralInstructionsManager Error:", error);
        }
    }

    /**
     * Fetch JSON data from the database folder.
     */
    async fetchInstructions() {
        const response = await fetch(this.jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load instructions. Status: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Dynamically builds the Overlay HTML based on CSS specs.
     */
    createOverlayStructure() {
        // Main Container
        const overlay = document.createElement('div');
        overlay.id = this.overlayId;

        // Card Container
        const card = document.createElement('div');
        card.className = 'instructions-card';

        // Title
        const title = document.createElement('h2');
        title.className = 'instructions-title';
        
        // List Container
        const list = document.createElement('ul');
        list.className = 'instructions-list';

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.id = 'instructions-close-btn';
        closeBtn.textContent = 'Got it.';
        closeBtn.addEventListener('click', this.closeOverlay);

        // Assemble DOM
        card.appendChild(title);
        card.appendChild(list);
        card.appendChild(closeBtn);
        overlay.appendChild(card);

        // Append to Document Body
        document.body.appendChild(overlay);

        // UX: Close when clicking outside the card (Backdrop click)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeOverlay();
            }
        });
    }

    /**
     * Populates the HTML with JSON data.
     * Uses textContent for Security (prevents XSS).
     */
    renderContent(data) {
        const overlay = document.getElementById(this.overlayId);
        if (!overlay) return;

        // Set Title
        const titleEl = overlay.querySelector('.instructions-title');
        titleEl.textContent = data.title || "Instructions";

        // Set List Items
        const listEl = overlay.querySelector('.instructions-list');
        listEl.innerHTML = ''; // Clear previous content

        if (data.instructions && Array.isArray(data.instructions)) {
            // UPDATED: Using index for numbering instead of icons
            data.instructions.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'instruction-item';

                // Numbering Span (e.g., "1.", "2.")
                const numberSpan = document.createElement('span');
                numberSpan.textContent = `${index + 1}.`;
                // Inline style for basic alignment/boldness
                numberSpan.style.fontWeight = 'bold'; 
                numberSpan.style.minWidth = '20px'; 

                // Instruction Text
                const textSpan = document.createElement('span');
                textSpan.textContent = item.text;

                li.appendChild(numberSpan);
                li.appendChild(textSpan);
                listEl.appendChild(li);
            });
        }
    }

    closeOverlay() {
        this.toggleVisibility(false);
    }

    toggleVisibility(isVisible) {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            if (isVisible) {
                overlay.classList.add('visible');
            } else {
                overlay.classList.remove('visible');
            }
        }
    }
}

// Instantiate the class to activate the logic
new GeneralInstructionsManager();