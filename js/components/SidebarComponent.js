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
        this._buildShell();

        // Example: Update user profile or system name if available
        const systemNameEl = this.container.querySelector('.system-name-display');
        if (systemNameEl) {
            const currentSystem = SystemService.getCurrentSystem();
            systemNameEl.textContent = currentSystem ? currentSystem.systemName : 'My System';
        }

        this.updateState();
    }

    _buildShell() {
        if (!this.container) return;
        this._clearElement(this.container);

        this.container.appendChild(this._buildLogoArea());
        this.container.appendChild(this._buildSystemSwitcher());
        this.container.appendChild(this._buildNavGroups());
    }

    _buildLogoArea() {
        const logo = document.createElement('div');
        logo.className = 'logo-area sidebar__logo-area';
        logo.id = 'app-title';

        const icon = document.createElement('i');
        icon.className = 'fas fa-layer-group logo-icon';
        logo.appendChild(icon);
        logo.appendChild(document.createTextNode(' SMT Platform'));

        return logo;
    }

    _buildSystemSwitcher() {
        const wrapper = document.createElement('div');
        wrapper.className = 'system-switcher-container';

        const button = document.createElement('div');
        button.className = 'system-switcher-btn';
        button.setAttribute('data-toggle', 'dropdown');
        button.setAttribute('data-target', 'system-dropdown');

        const content = document.createElement('div');
        content.className = 'sidebar__system-switcher-content';

        const icon = document.createElement('div');
        icon.className = 'sidebar__system-icon';
        icon.textContent = 'S';

        const name = document.createElement('div');
        name.className = 'system-name-display sidebar__system-name';
        name.textContent = 'My System';

        content.appendChild(icon);
        content.appendChild(name);

        const chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-down sidebar__chevron-icon';

        button.appendChild(content);
        button.appendChild(chevron);

        const dropdown = document.createElement('div');
        dropdown.id = 'system-dropdown';
        dropdown.className = 'dropdown-menu';

        dropdown.appendChild(this._buildDropdownItem('load-system', 'fas fa-folder-open', 'Load System'));
        dropdown.appendChild(this._buildDropdownItem('new-system', 'fas fa-plus-circle', 'New System'));

        const separator = document.createElement('div');
        separator.className = 'sidebar__menu-separator';
        dropdown.appendChild(separator);

        const closeItem = this._buildDropdownItem('close-system', 'fas fa-times-circle', 'Close System');
        closeItem.classList.add('danger');
        dropdown.appendChild(closeItem);

        wrapper.appendChild(button);
        wrapper.appendChild(dropdown);

        return wrapper;
    }

    _buildDropdownItem(action, iconClass, label) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('data-action', action);

        const icon = document.createElement('i');
        icon.className = `${iconClass} sidebar__menu-icon`;
        item.appendChild(icon);
        item.appendChild(document.createTextNode(` ${label}`));

        return item;
    }

    _buildNavGroups() {
        const navGroups = document.createElement('div');
        navGroups.className = 'nav-groups';

        const groups = [
            {
                title: 'System',
                items: [
                    { view: 'visualizationCarousel', icon: 'fas fa-sitemap', text: 'System Overview' },
                    { view: 'organogramView', icon: 'fas fa-users', text: 'Org Design' },
                    { view: 'systemEditForm', icon: 'fas fa-cog', text: 'Edit System' }
                ]
            },
            {
                title: 'Product',
                items: [
                    { view: 'roadmapView', icon: 'fas fa-map', text: 'Roadmap & Backlog' },
                    { view: 'managementView', icon: 'fas fa-tasks', text: 'Management' }
                ]
            },
            {
                title: 'Planning',
                items: [
                    { view: 'planningView', icon: 'far fa-calendar-alt', text: 'Year Plan' },
                    { view: 'ganttPlanningView', icon: 'fas fa-stream', text: 'Detailed Planning' },
                    { view: 'capacityConfigView', icon: 'fas fa-sliders-h', text: 'Capacity Tuning' },
                    { view: 'sdmForecastingView', icon: 'fas fa-chart-line', text: 'Resource Forecast' }
                ]
            },
            {
                title: 'Insights',
                items: [
                    { view: 'dashboardView', icon: 'fas fa-tachometer-alt', text: 'Dashboard' }
                ]
            },
            {
                title: 'Configuration',
                items: [
                    { view: 'settingsView', icon: 'fas fa-cog', text: 'Settings' }
                ]
            },
            {
                title: 'Help',
                items: [
                    { view: 'helpView', icon: 'fas fa-book', text: 'How to Guide' },
                    { id: 'feedback-nav-item', icon: 'fas fa-comment-alt', text: 'Provide Feedback' },
                    { view: 'aboutView', icon: 'fas fa-info-circle', text: 'About' }
                ]
            }
        ];

        groups.forEach(group => {
            const title = document.createElement('div');
            title.className = 'nav-group-title';
            title.textContent = group.title;
            navGroups.appendChild(title);

            group.items.forEach(item => {
                navGroups.appendChild(this._buildNavItem(item));
            });
        });

        return navGroups;
    }

    _buildNavItem(item) {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'nav-item';
        if (item.view) {
            link.setAttribute('data-view', item.view);
        }
        if (item.id) {
            link.id = item.id;
        }

        const iconWrap = document.createElement('div');
        iconWrap.className = 'nav-icon';
        const icon = document.createElement('i');
        icon.className = item.icon;
        iconWrap.appendChild(icon);

        const text = document.createElement('div');
        text.className = 'nav-text';
        text.textContent = item.text;

        link.appendChild(iconWrap);
        link.appendChild(text);

        return link;
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

        // Hide close system action if no system is loaded.
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

        // System Dropdown Actions
        this.container.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.dropdown-item[data-action]');
            if (!actionItem) return;

            const action = actionItem.getAttribute('data-action');
            switch (action) {
                case 'load-system':
                    if (window.navigationManager) {
                        window.navigationManager.navigateTo('systemsView');
                    }
                    break;
                case 'new-system':
                    SystemService.createAndActivate();
                    break;
                case 'close-system':
                    if (typeof appState !== 'undefined') {
                        appState.closeCurrentSystem();
                    }
                    break;
                default:
                    break;
            }

            this.closeAllDropdowns();
        });
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

    _clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
