/*
    File: js/UI/LeaderboardManager.js
    Description: Manages the Leaderboard UI with Pagination and Animations.
    Features:
        - Pagination (5 Slides, 10 items per slide).
        - Slide Animations (Left/Right).
        - Interactive Navigation (Arrows & Dots).
        - XSS-Safe Rendering.
        - Data Integration: Currently initialized with empty state for future API integration.
*/

class LeaderboardManager {
    constructor() {
        // Configuration
        this.ITEMS_PER_PAGE = 10;
        this.TOTAL_PAGES = 5;

        // State
        this.state = {
            data: [], // Intentionally left blank for dynamic data injection
            currentPage: 0
        };

        // DOM References Cache
        this.els = {
            tableBody: document.getElementById('leaderboard-body'),
            emptyMsg: document.getElementById('leaderboard-empty-msg'),
            btnPrev: document.getElementById('prevSlide'),
            btnNext: document.getElementById('nextSlide'),
            dotsContainer: document.getElementById('paginationDots')
        };

        this.init();
    }

    init() {
        // 1. Setup Event Listeners for Navigation
        this.setupListeners();

        // 2. Initial Render
        // Since data is empty, this will trigger the Empty State UI automatically.
        this.render(0, null);
    }

    // --- Data Management ---
    // Note: 'generateMockData' has been removed. 
    // Future API method 'fetchLeaderboardData()' should populate this.state.data

    // --- Event Listeners ---
    setupListeners() {
        // Arrow Navigation
        if (this.els.btnPrev) {
            this.els.btnPrev.onclick = () => this.changePage(-1);
        }
        if (this.els.btnNext) {
            this.els.btnNext.onclick = () => this.changePage(1);
        }

        // Dot Navigation
        if (this.els.dotsContainer) {
            const dots = this.els.dotsContainer.querySelectorAll('.dot');
            dots.forEach(dot => {
                dot.onclick = (e) => {
                    const targetIndex = parseInt(e.target.dataset.index);
                    if (!isNaN(targetIndex)) {
                        this.goToPage(targetIndex);
                    }
                };
            });
        }
    }

    // --- Navigation Logic ---
    changePage(direction) {
        const newPage = this.state.currentPage + direction;
        
        // Bounds Check
        if (newPage >= 0 && newPage < this.TOTAL_PAGES) {
            this.state.currentPage = newPage;
            // Determine Animation Direction
            const animType = direction > 0 ? 'next' : 'prev';
            this.render(this.state.currentPage, animType);
        }
    }

    goToPage(index) {
        if (index === this.state.currentPage) return;
        
        const direction = index > this.state.currentPage ? 'next' : 'prev';
        this.state.currentPage = index;
        this.render(this.state.currentPage, direction);
    }

    // --- Rendering Logic ---
    render(pageIndex, animationType) {
        if (!this.els.tableBody) return;

        // 1. Slice Data for current page
        // With empty data, slice will return []
        const start = pageIndex * this.ITEMS_PER_PAGE;
        const end = start + this.ITEMS_PER_PAGE;
        const pageData = this.state.data.slice(start, end);

        // 2. Clear Table
        this.els.tableBody.innerHTML = '';

        // 3. Handle Empty State
        if (pageData.length === 0) {
            if (this.els.emptyMsg) this.els.emptyMsg.style.display = 'block';
            
            // Optional: Hide pagination if no data exists to improve UX
            // keeping it visible for now as per structural requirements
            return;
        } else {
            if (this.els.emptyMsg) this.els.emptyMsg.style.display = 'none';
        }

        // 4. Build Rows (DocumentFragment for performance)
        const fragment = document.createDocumentFragment();

        pageData.forEach((entry) => {
            const row = document.createElement('tr');

            // Rank
            const rankCell = document.createElement('td');
            rankCell.className = 'col-rank';
            rankCell.textContent = entry.rank;

            // Player Name (XSS Safe - using textContent)
            const playerCell = document.createElement('td');
            playerCell.className = 'col-player';
            playerCell.textContent = entry.player;

            // Score
            const scoreCell = document.createElement('td');
            scoreCell.className = 'col-score';
            scoreCell.textContent = entry.score;

            row.appendChild(rankCell);
            row.appendChild(playerCell);
            row.appendChild(scoreCell);
            fragment.appendChild(row);
        });

        this.els.tableBody.appendChild(fragment);

        // 5. Update UI Controls (Dots & Arrows)
        this.updateControls(pageIndex);

        // 6. Apply Animation
        if (animationType) {
            this.triggerAnimation(animationType);
        }
    }

    updateControls(activeIndex) {
        // Update Dots
        if (this.els.dotsContainer) {
            const dots = this.els.dotsContainer.querySelectorAll('.dot');
            dots.forEach((dot, index) => {
                if (index === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }

        // Update Arrow Visibility
        if (this.els.btnPrev) {
            this.els.btnPrev.style.opacity = activeIndex === 0 ? '0.3' : '1';
            this.els.btnPrev.style.pointerEvents = activeIndex === 0 ? 'none' : 'auto';
        }
        if (this.els.btnNext) {
            this.els.btnNext.style.opacity = activeIndex === (this.TOTAL_PAGES - 1) ? '0.3' : '1';
            this.els.btnNext.style.pointerEvents = activeIndex === (this.TOTAL_PAGES - 1) ? 'none' : 'auto';
        }
    }

    triggerAnimation(type) {
        // Remove existing classes to reset animation
        this.els.tableBody.classList.remove('anim-next', 'anim-prev');
        
        // Trigger Reflow to restart CSS animation
        void this.els.tableBody.offsetWidth;

        // Add specific animation class
        if (type === 'next') {
            this.els.tableBody.classList.add('anim-next');
        } else if (type === 'prev') {
            this.els.tableBody.classList.add('anim-prev');
        }
    }
}

// Export Singleton
export const leaderboardManager = new LeaderboardManager();