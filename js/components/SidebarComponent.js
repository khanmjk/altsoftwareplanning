/**
 * SidebarComponent
 * Manages the rendering and interaction of the sidebar navigation.
 */
class SidebarComponent {
    constructor(containerId, navigationManager) {
        this.container = document.getElementById(containerId);
        this.navManager = navigationManager;
        this.isCollapsed = false;

        // Bind methods
        this.toggleDropdown = this.toggleDropdown.bind(this);
    }

    init() {
        if (!this.container) {
            console.error('Sidebar container not found');
            return;
        }
        this.render();
        this.attachEventListeners();
    }

    render() {
        // The HTML structure is largely static in index.html, 
        // but we could render dynamic parts here if needed.
        // For now, we assume the structure exists and we just manage state.

        // Example: Update user profile or system name if available
        const systemNameEl = this.container.querySelector('.system-name-display');
        if (systemNameEl && window.currentSystemData) {
            systemNameEl.textContent = window.currentSystemData.systemName;
        }
    }

    attachEventListeners() {
        // Navigation Links
        const navLinks = this.container.querySelectorAll('.nav-item[data-view]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.getAttribute('data-view');
                this.navManager.navigateTo(viewId);
            });
        });

        // Dropdown Toggles
        const dropdownToggles = this.container.querySelectorAll('[data-toggle="dropdown"]');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = toggle.getAttribute('data-target');
                this.toggleDropdown(targetId);
            });
        });

        // Close dropdowns on global click
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });

        // Create with AI Button
        const createAiBtn = this.container.querySelector('#create-ai-btn');
        if (createAiBtn) {
            createAiBtn.addEventListener('click', () => {
                if (typeof handleCreateWithAi === 'function') {
                    handleCreateWithAi();
                }
            });
        }
    }

    setActive(viewId) {
        // Remove active class from all
        const allLinks = this.container.querySelectorAll('.nav-item');
        allLinks.forEach(link => link.classList.remove('active'));

        // Add to current
        const activeLink = this.container.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    toggleDropdown(id) {
        this.closeAllDropdowns();
        const menu = document.getElementById(id);
        if (menu) {
            menu.classList.add('show');
        }
    }

    closeAllDropdowns() {
        const menus = document.querySelectorAll('.dropdown-menu');
        menus.forEach(menu => menu.classList.remove('show'));
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SidebarComponent = SidebarComponent;
}
