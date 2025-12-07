/**
 * HeaderComponent
 * Manages the top header, breadcrumbs, and global actions.
 */
class HeaderComponent {
    constructor(containerId) {
        // Updated to use the new Workspace Header ID
        this.container = document.getElementById('workspace-header');
        // Fallback for legacy or if ID not found (though it should be there)
        if (!this.container) {
            this.container = document.getElementById(containerId);
        }

        this.breadcrumbsContainer = document.getElementById('workspace-breadcrumbs');
        this.pageTitleElement = document.getElementById('page-title-display'); // In main content
        this.pageDescElement = document.getElementById('page-desc-display');   // In main content
    }

    init() {
        if (!this.container) {
            console.error('HeaderComponent: Header container not found');
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
                const isEnabled = SettingsService.get() && SettingsService.get().ai && SettingsService.get().ai.isEnabled;

                if (!isEnabled) {
                    notificationManager.showToast('AI Assistant is currently disabled. Please enable it in Settings.', 'info');
                    return;
                }

                if (aiChatAssistant.isAiChatPanelOpen()) {
                    aiChatAssistant.closeAiChatPanel();
                } else {
                    aiChatAssistant.openAiChatPanel();
                }
            });
        }
    }

    setupNotifications() {
        const notifBtn = this.container.querySelector('#header-notifications-btn');
        const notifDropdown = this.container.querySelector('#notifications-dropdown');
        const notifList = this.container.querySelector('#notifications-list');
        const notifMarkRead = this.container.querySelector('#notifications-mark-read');
        const badge = this.container.querySelector('#notification-badge');
        const manager = notificationManager;

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

        if (manager && notifList) {
            // Render initial & subscribe to changes
            this.unsubscribeNotifications = manager.addListener((items) => {
                this.renderNotificationsList(items, notifList, badge);
            });

            notifList.addEventListener('click', (e) => {
                const target = e.target;
                if (target.dataset.action === 'remove-notification' && target.dataset.id) {
                    manager.removeNotification(target.dataset.id);
                }
            });
        }

        if (manager && notifMarkRead) {
            notifMarkRead.addEventListener('click', (e) => {
                e.stopPropagation();
                manager.markAllRead();
            });
        }
    }

    updateAiButtonVisibility(btn) {
        if (!btn) return;
        const isEnabled = SettingsService.get() && SettingsService.get().ai && SettingsService.get().ai.isEnabled;

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

    renderNotificationsList(items = [], listEl, badgeEl) {
        if (!listEl) return;
        if (!Array.isArray(items) || items.length === 0) {
            listEl.innerHTML = `
                <div class="notifications-empty">
                    <div class="notifications-empty__icon"><i class="far fa-bell-slash"></i></div>
                    <p>No notifications yet</p>
                </div>
            `;
        } else {
            listEl.innerHTML = items.map(item => {
                const ts = new Date(item.timestamp);
                const timeLabel = isNaN(ts) ? '' : ts.toLocaleString();
                return `
                    <div class="notification-item ${item.read ? 'notification-item--read' : ''}">
                        <div class="notification-item__icon notification-item__icon--${item.type || 'info'}">
                            <i class="fas ${this.iconForType(item.type)}"></i>
                        </div>
                        <div class="notification-item__content">
                            <div class="notification-item__message">${item.message}</div>
                            <div class="notification-item__meta">${timeLabel}</div>
                        </div>
                        <button class="notification-item__remove" data-action="remove-notification" data-id="${item.id}" title="Remove notification">&times;</button>
                    </div>
                `;
            }).join('');
        }

        if (badgeEl) {
            const unread = items.filter(n => !n.read).length;
            badgeEl.style.display = unread > 0 ? 'block' : 'none';
        }
    }

    iconForType(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
    updateBreadcrumbs(viewId, systemName) {
        if (!this.breadcrumbsContainer) return;

        // SKIP for refactored views that handle their own metadata
        const refactoredViews = ['roadmapView'];
        if (refactoredViews.includes(viewId)) {
            return;
        }

        const homeIcon = '<span style="color: #64748b;"><i class="fas fa-home"></i></span>';
        const separator = '<span class="canvas-header__breadcrumb-item"></span>'; // Use new separator style if possible, or just text

        let html = `${homeIcon}`;

        if (systemName) {
            html += ` <span class="canvas-header__breadcrumb-item">${systemName}</span>`;
        }

        // Map viewId to Breadcrumb path
        const path = this.getViewPath(viewId);
        if (path) {
            path.forEach(step => {
                html += ` <span class="canvas-header__breadcrumb-item ${step.isLast ? 'current-page' : ''}">${step.label}</span>`;
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
