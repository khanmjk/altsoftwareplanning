/**
 * HeaderComponent
 * Manages the top header, breadcrumbs, and global actions.
 */
class HeaderComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.breadcrumbsContainer = this.container ? this.container.querySelector('.breadcrumbs') : null;
        this.pageTitleElement = document.getElementById('page-title-display'); // In main content
        this.pageDescElement = document.getElementById('page-desc-display');   // In main content
    }

    init() {
        if (!this.container) {
            console.error('Header container not found');
            return;
        }
        this.attachEventListeners();
        this.setupNotifications();
    }

    attachEventListeners() {
        // AI Assistant Toggle
        const aiBtn = this.container.querySelector('#header-ai-btn');
        if (aiBtn) {
            // Initial visibility check
            this.updateAiButtonVisibility(aiBtn);

            // Listen for global settings changes (optional, but good practice if we had an event)
            // For now, we rely on update() or manual checks if settings change.

            aiBtn.addEventListener('click', () => {
                const isEnabled = window.globalSettings && window.globalSettings.ai && window.globalSettings.ai.isEnabled;

                if (!isEnabled) {
                    window.notificationManager.showToast('AI Assistant is currently disabled. Please enable it in Settings.', 'info');
                    return;
                }

                if (window.aiChatAssistant && typeof window.aiChatAssistant.openAiChatPanel === 'function') {
                    // Check if already open
                    if (window.aiChatAssistant.isAiChatPanelOpen()) {
                        window.aiChatAssistant.closeAiChatPanel();
                    } else {
                        window.aiChatAssistant.openAiChatPanel();
                    }
                } else {
                    console.warn('AI Chat Assistant not available');
                }
            });
        }
    }

    setupNotifications() {
        const notifBtn = this.container.querySelector('#header-notifications-btn');
        const notifDropdown = this.container.querySelector('#notifications-dropdown');

        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other dropdowns if any (optional, but good practice)
                const otherDropdowns = document.querySelectorAll('.dropdown-menu.show');
                otherDropdowns.forEach(d => {
                    if (d !== notifDropdown) d.classList.remove('show');
                });

                notifDropdown.classList.toggle('show');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifDropdown.classList.remove('show');
                }
            });
        }
    }

    updateAiButtonVisibility(btn) {
        if (!btn) return;
        const isEnabled = window.globalSettings && window.globalSettings.ai && window.globalSettings.ai.isEnabled;

        // Show always, but style differently if disabled
        btn.style.display = 'inline-flex';

        if (isEnabled) {
            btn.style.opacity = '1';
            btn.style.filter = 'none';
            btn.style.cursor = 'pointer';
            btn.title = 'Open AI Assistant';
        } else {
            btn.style.opacity = '0.5';
            btn.style.filter = 'grayscale(100%)';
            btn.style.cursor = 'not-allowed';
            btn.title = 'AI Assistant (Disabled)';
        }
    }

    update(viewId, systemName) {
        this.updateBreadcrumbs(viewId, systemName);
        const aiBtn = this.container.querySelector('#header-ai-btn');
        this.updateAiButtonVisibility(aiBtn);
    }
    updateBreadcrumbs(viewId, systemName) {
        if (!this.breadcrumbsContainer) return;

        const homeIcon = '<span style="color: #64748b;"><i class="fas fa-home"></i></span>';
        const separator = '<span class="separator"><i class="fas fa-chevron-right"></i></span>';

        let html = `${homeIcon}`;

        if (systemName) {
            html += `${separator} <span>${systemName}</span>`;
        }

        // Map viewId to Breadcrumb path
        const path = this.getViewPath(viewId);
        if (path) {
            path.forEach(step => {
                html += `${separator} <span class="${step.isLast ? 'current-page' : ''}">${step.label}</span>`;
            });
        }

        this.breadcrumbsContainer.innerHTML = html;
    }


    getViewPath(viewId) {
        // Define paths for each view
        const paths = {
            'planningView': [{ label: 'Planning' }, { label: 'Year Plan', isLast: true }],
            'ganttPlanningView': [{ label: 'Planning' }, { label: 'Detailed Planning', isLast: true }],
            'capacityConfigView': [{ label: 'Planning' }, { label: 'Capacity Tuning', isLast: true }],
            'sdmForecastingView': [{ label: 'Planning' }, { label: 'Resource Forecast', isLast: true }],
            'roadmapView': [{ label: 'Product' }, { label: 'Roadmap & Backlog', isLast: true }],
            'managementView': [{ label: 'Product' }, { label: 'Management', isLast: true }],
            'visualizationCarousel': [{ label: 'System' }, { label: 'Overview', isLast: true }],
            'organogramView': [{ label: 'System' }, { label: 'Org Design', isLast: true }],
            'systemEditForm': [{ label: 'System' }, { label: 'Edit System', isLast: true }],
            'dashboardView': [{ label: 'Insights' }, { label: 'Dashboard', isLast: true }],
            'helpView': [{ label: 'Help' }, { label: 'How to Guide', isLast: true }],
            'settingsView': [{ label: 'Configuration' }, { label: 'Settings', isLast: true }],
            'systemsView': [{ label: 'System' }, { label: 'My Systems', isLast: true }],
        };
        return paths[viewId] || [{ label: 'Home', isLast: true }];
    }


}

if (typeof window !== 'undefined') {
    window.HeaderComponent = HeaderComponent;
}
