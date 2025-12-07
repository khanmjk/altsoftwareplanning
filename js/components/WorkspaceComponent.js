/**
 * WorkspaceComponent
 * Responsible for managing the main content area of the application.
 * It handles clearing previous views, creating new view containers,
 * and managing scrolling and layout for the active page.
 */
class WorkspaceComponent {
    /**
     * @param {string} containerId - The ID of the main content wrapper/area.
     */
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`WorkspaceComponent: Container '${containerId}' not found.`);
        }
    }

    /**
     * Renders a view into the workspace.
     * @param {string} viewId - The unique ID for the view's container (e.g., 'capacityConfigView').
     * @param {Function} renderCallback - A function that populates the view container.
     */
    /**
     * Renders a view into the workspace.
     * @param {string} viewId - The unique ID for the view's container (e.g., 'capacityConfigView').
     * @param {Function} renderCallback - A function that populates the view container.
     */
    render(viewId, renderCallback) {
        if (!this.container) return;

        console.log(`WorkspaceComponent: Rendering view '${viewId}'`);

        // Reset Shell State (Clear Toolbar, Actions)
        this.resetShell();

        // 1. Hide all existing children (Hybrid Mode support)
        Array.from(this.container.children).forEach(child => {
            child.style.display = 'none';
        });

        // 2. Get or Create the view container
        let viewContainer = document.getElementById(viewId);

        if (!viewContainer) {
            viewContainer = document.createElement('div');
            viewContainer.id = viewId;
            viewContainer.className = 'workspace-view';
            // Apply standard workspace styles - REMOVED fixed styles to let CSS handle it
            // viewContainer.style.width = '100%';
            // viewContainer.style.height = '100%';
            // viewContainer.style.overflowY = 'auto';
            // viewContainer.style.padding = '20px';
            // viewContainer.style.boxSizing = 'border-box';
            this.container.appendChild(viewContainer);
            // Explicitly set display block for new container
            viewContainer.style.display = 'block';
        } else {
            // Ensure it's visible
            viewContainer.style.display = 'block';
            // Clear previous content to ensure fresh render
            viewContainer.innerHTML = '';
        }

        // 3. Execute the render callback to populate the content
        try {
            renderCallback(viewContainer);
        } catch (error) {
            console.error(`WorkspaceComponent: Error in render callback for '${viewId}':`, error);
            viewContainer.innerHTML = `<div class="error-message">
                <h3>Error Loading View</h3>
                <p>There was a problem rendering this page.</p>
                <pre>${error.message}</pre>
            </div>`;
        }
    }

    /**
     * Resets the Workspace Shell to a default state.
     */
    resetShell() {
        // Clear Toolbar
        const toolbar = document.getElementById('workspace-toolbar');
        if (toolbar) {
            toolbar.innerHTML = '';
            toolbar.style.display = 'none';
        }

        // Clear Actions
        const actions = document.getElementById('workspace-actions');
        if (actions) {
            actions.innerHTML = '';
        }

        // Reset Title
        const title = document.getElementById('workspace-title');
        if (title) {
            title.textContent = 'Workspace';
        }

        // Reset Breadcrumbs
        const breadcrumbs = document.getElementById('workspace-breadcrumbs');
        if (breadcrumbs) {
            breadcrumbs.innerHTML = '';
        }
    }

    /**
     * Updates the Global Workspace Header.
     * @param {Object} metadata
     * @param {string} metadata.title - The page title.
     * @param {Array<string>} metadata.breadcrumbs - Array of breadcrumb strings.
     * @param {Array<Object>} metadata.actions - Array of action objects { label, icon, onClick, className }.
     */
    setPageMetadata({ title, breadcrumbs = [], actions = [] }) {
        // Update Title
        const titleEl = document.getElementById('workspace-title');
        if (titleEl) titleEl.textContent = title || 'Workspace';

        // Update Breadcrumbs
        const breadcrumbsEl = document.getElementById('workspace-breadcrumbs');
        if (breadcrumbsEl) {
            breadcrumbsEl.innerHTML = breadcrumbs.map(b =>
                `<span class="canvas-header__breadcrumb-item">${b}</span>`
            ).join('');
        }

        // Update Actions
        const actionsEl = document.getElementById('workspace-actions');
        if (actionsEl) {
            actionsEl.innerHTML = '';
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = action.className || 'btn btn-primary btn-sm';
                btn.innerHTML = `${action.icon ? `<i class="${action.icon}"></i> ` : ''}${action.label} `;
                if (action.onClick) {
                    btn.onclick = action.onClick;
                }
                actionsEl.appendChild(btn);
            });
        }
    }

    /**
     * Sets the content of the sticky toolbar.
     * @param {string|HTMLElement} content - HTML string or Element to put in the toolbar.
     */
    setToolbar(content) {
        const toolbar = document.getElementById('workspace-toolbar');
        if (!toolbar) return;

        toolbar.innerHTML = '';
        if (typeof content === 'string') {
            toolbar.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            toolbar.appendChild(content);
        }

        toolbar.style.display = 'flex';
    }
}

// Export for global usage
if (typeof window !== 'undefined') {
    window.WorkspaceComponent = WorkspaceComponent;
}
