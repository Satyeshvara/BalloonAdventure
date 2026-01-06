/*
    Developer Overview Logic
    Path: js/UI/DeveloperOverview.js
    Description: Handles the creation and interaction logic for the Developer's Overview overlay.
                 Updated to support specific UI alignment and Copyright styling requirements.
*/

export class DeveloperOverviewManager {
    constructor() {
        // Configuration
        this.overlayId = 'developer-overlay';
        this.triggerBtnId = 'overviewBtn'; // Defined in index.html
        
        // Social Media Configuration
        this.socialData = [
            {
                id: 'github',
                url: 'https://www.github.com/Satyeshvara',
                iconPath: 'assets/Images/Icons/GitHub.png',
                altText: 'GitHub Profile'
            },
            {
                id: 'linkedin',
                url: 'https://www.linkedin.com/in/satyeshvara',
                iconPath: 'assets/Images/Icons/LinkedIn.png',
                altText: 'LinkedIn Profile'
            }
        ];

        // Bind methods to ensure 'this' context is preserved
        this.openOverlay = this.openOverlay.bind(this);
        this.closeOverlay = this.closeOverlay.bind(this);

        this.init();
    }

    /**
     * Initialize listeners.
     * Waits for the DOM to ensure the trigger button is available.
     */
    init() {
        const triggerBtn = document.getElementById(this.triggerBtnId);
        if (triggerBtn) {
            triggerBtn.addEventListener('click', this.openOverlay);
            console.log("DeveloperOverviewManager: Initialized successfully.");
        } else {
            console.warn(`DeveloperOverviewManager: Button #${this.triggerBtnId} not found.`);
        }
    }

    /**
     * Handles the opening logic:
     * 1. Checks/Creates DOM structure lazily (only when requested).
     * 2. Toggles visibility.
     */
    openOverlay() {
        // Lazy Loading: Create HTML structure only if it doesn't exist
        if (!document.getElementById(this.overlayId)) {
            this.createOverlayStructure();
        }
        this.toggleVisibility(true);
    }

    /**
     * Dynamically builds the Overlay HTML based on CSS specs.
     * structure: Title -> Social Links -> Copyright -> Exit Button
     * This order is crucial for the CSS 'gap' property to function correctly between elements.
     */
    createOverlayStructure() {
        // 1. Main Overlay Container
        const overlay = document.createElement('div');
        overlay.id = this.overlayId;

        // 2. Card Container
        const card = document.createElement('div');
        card.className = 'developer-card';

        // 3. Title
        const title = document.createElement('h2');
        title.className = 'developer-title';
        title.textContent = "Developer’s Overview";

        // 4. Social Links Container
        const socialContainer = document.createElement('div');
        socialContainer.className = 'social-links-container';

        // Generate Icons/Links
        this.socialData.forEach(item => {
            const anchor = document.createElement('a');
            anchor.href = item.url;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer"; // Security Best Practice against reverse tabnabbing

            const img = document.createElement('img');
            img.src = item.iconPath;
            img.alt = item.altText;
            img.className = 'social-icon'; 

            anchor.appendChild(img);
            socialContainer.appendChild(anchor);
        });

        // 5. NEW: Copyright Text
        // Explicitly styled via .copyright-text class as per requirements
        const copyright = document.createElement('p');
        copyright.className = 'copyright-text';
        copyright.textContent = '© sonuemoji 2025. All rights reserved.';

        // 6. Exit Button
        const exitBtn = document.createElement('button');
        exitBtn.id = 'developer-exit-btn';
        exitBtn.textContent = 'Exit';
        exitBtn.addEventListener('click', this.closeOverlay);

        // 7. Assemble DOM
        // The appending order ensures the vertical spacing (25px gap) applies correctly:
        // Title -> (25px) -> Social -> (25px) -> Copyright -> (25px) -> Exit
        card.appendChild(title);
        card.appendChild(socialContainer);
        card.appendChild(copyright); 
        card.appendChild(exitBtn);
        overlay.appendChild(card);

        // Append to Document Body
        document.body.appendChild(overlay);

        // UX: Close when clicking background (Backdrop)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeOverlay();
            }
        });
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

// Instantiate to activate logic
new DeveloperOverviewManager();