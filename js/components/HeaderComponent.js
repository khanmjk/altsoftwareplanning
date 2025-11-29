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

    updateAiButtonVisibility(btn) {
        if (!btn) return;
        const isEnabled = window.globalSettings && window.globalSettings.ai && window.globalSettings.ai.isEnabled;
        btn.style.display = isEnabled ? 'inline-flex' : 'none';
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
            'visualizationCarousel': [{ label: 'System' }, { label: 'Overview', isLast: true }],
            'organogramView': [{ label: 'System' }, { label: 'Org Design', isLast: true }],
            'systemEditForm': [{ label: 'System' }, { label: 'Edit System', isLast: true }],
            'dashboardView': [{ label: 'Insights' }, { label: 'Dashboard', isLast: true }],
            'helpView': [{ label: 'Help' }, { label: 'How to Guide', isLast: true }],
        };
        return paths[viewId] || [{ label: 'Home', isLast: true }];
    }

    getViewInfo(viewId) {
        const infos = {
            'planningView': { title: 'Year Plan', desc: 'Manage high-level initiatives and resource allocation.' },
            'ganttPlanningView': { title: 'Detailed Planning', desc: 'Gantt chart view for detailed project scheduling.' },
            'capacityConfigView': { title: 'Capacity Tuning', desc: 'Adjust team capacities and constraints.' },
            'sdmForecastingView': { title: 'Resource Forecasting', desc: 'Forecast resource needs based on SDM model.' },
            'roadmapView': { title: 'Roadmap & Backlog', desc: 'Product roadmap and backlog management.' },
            'visualizationCarousel': { title: 'System Overview', desc: 'Visual representations of the system architecture.' },
            'organogramView': { title: 'Organization Design', desc: 'View and edit team structures and hierarchy.' },
            'systemEditForm': { title: 'Edit System', desc: 'Modify system details, services, and teams.' },
            'dashboardView': { title: 'Dashboard', desc: 'Key metrics and system health indicators.' },
        };
        return infos[viewId] || { title: 'Welcome', desc: 'Select a system or create a new one.' };
    }
}

if (typeof window !== 'undefined') {
    window.HeaderComponent = HeaderComponent;
}
