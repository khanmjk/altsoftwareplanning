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
        if (systemNameEl && SystemService.getCurrentSystem()) {
            systemNameEl.textContent = SystemService.getCurrentSystem().systemName;
        }

        this.updateState();
    }

    updateState() {
        const hasSystem = !!SystemService.getCurrentSystem();
        const navLinks = this.container.querySelectorAll('.nav-item[data-view]');

        navLinks.forEach(link => {
            const viewId = link.getAttribute('data-view');
            // Exempt Help, Settings, Systems, and About views from disabling
            if (!hasSystem && !['helpView', 'settingsView', 'systemsView', 'aboutView'].includes(viewId)) {
                link.classList.add('disabled');
            } else {
                link.classList.remove('disabled');
            }
        });

        // Ensure Settings is always enabled (it doesn't have data-view, it has data-toggle)
        // But we might want to disable "Delete System" if no system is loaded.
        const deleteSystemBtn = this.container.querySelector('.dropdown-item.danger');
        if (deleteSystemBtn) {
            deleteSystemBtn.classList.toggle('is-hidden', !hasSystem);
        }
    }

    attachEventListeners() {
        // App Title Click -> Welcome View
        const appTitle = document.getElementById('app-title');
        if (appTitle) {
            appTitle.addEventListener('click', () => {
                this.navManager.navigateTo('welcomeView');
            });
        }

        // Navigation Links
        const navLinks = this.container.querySelectorAll('.nav-item[data-view]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Check if disabled
                if (link.classList.contains('disabled')) return;

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
                AIGenProgressOverlayView.getInstance().startGenerationFlow();
            });
        }

        // Provide Feedback Button
        const feedbackBtn = this.container.querySelector('#feedback-nav-item');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                FeedbackModal.getInstance().open();
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
