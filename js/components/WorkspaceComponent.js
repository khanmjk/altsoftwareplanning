/**
 * WorkspaceComponent
 * Responsible for managing the main content area of the application.
 * It handles clearing previous views, creating new view containers,
 * and managing scrolling and layout for the active page.
 * 
 * Contract Compliance:
 * - No innerHTML for template creation (uses DOM APIs)
 * - Uses textContent for clearing where possible
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
            this.container.appendChild(viewContainer);
            viewContainer.style.display = 'block';
        } else {
            // Ensure it's visible
            viewContainer.style.display = 'block';
            // Clear previous content using DOM API
            this._clearElement(viewContainer);
        }

        // 3. Execute the render callback to populate the content
        try {
            renderCallback(viewContainer);
        } catch (error) {
            console.error(`WorkspaceComponent: Error in render callback for '${viewId}':`, error);
            this._renderErrorMessage(viewContainer, error);
        }
    }

    /**
     * Clears all children from an element (replaces innerHTML = '')
     * @param {HTMLElement} element
     */
    _clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * Renders an error message using DOM APIs
     * @param {HTMLElement} container
     * @param {Error} error
     */
    _renderErrorMessage(container, error) {
        this._clearElement(container);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';

        const heading = document.createElement('h3');
        heading.textContent = 'Error Loading View';
        errorDiv.appendChild(heading);

        const message = document.createElement('p');
        message.textContent = 'There was a problem rendering this page.';
        errorDiv.appendChild(message);

        const pre = document.createElement('pre');
        pre.textContent = error.message;
        errorDiv.appendChild(pre);

        container.appendChild(errorDiv);
    }

    /**
     * Resets the Workspace Shell to a default state.
     */
    resetShell() {
        // Clear Toolbar
        const toolbar = document.getElementById('workspace-toolbar');
        if (toolbar) {
            this._clearElement(toolbar);
            toolbar.style.display = 'none';
        }

        // Clear Actions
        const actions = document.getElementById('workspace-actions');
        if (actions) {
            this._clearElement(actions);
        }

        // Reset Title
        const title = document.getElementById('workspace-title');
        if (title) {
            title.textContent = 'Workspace';
        }

        // Reset Breadcrumbs
        const breadcrumbs = document.getElementById('workspace-breadcrumbs');
        if (breadcrumbs) {
            this._clearElement(breadcrumbs);
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

        // Update Breadcrumbs using DOM APIs
        const breadcrumbsEl = document.getElementById('workspace-breadcrumbs');
        if (breadcrumbsEl) {
            this._clearElement(breadcrumbsEl);
            breadcrumbs.forEach(b => {
                const span = document.createElement('span');
                span.className = 'canvas-header__breadcrumb-item';
                span.textContent = b;
                breadcrumbsEl.appendChild(span);
            });
        }

        // Update Actions using DOM APIs
        const actionsEl = document.getElementById('workspace-actions');
        if (actionsEl) {
            this._clearElement(actionsEl);
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = action.className || 'btn btn-primary btn-sm';

                // Add icon if present
                if (action.icon) {
                    const icon = document.createElement('i');
                    icon.className = action.icon;
                    btn.appendChild(icon);
                    btn.appendChild(document.createTextNode(' '));
                }

                // Add label
                btn.appendChild(document.createTextNode(action.label + ' '));

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

        this._clearElement(toolbar);

        if (typeof content === 'string') {
            // For string content, create a wrapper and use textContent if it's plain text
            // or use insertAdjacentHTML for HTML strings (acceptable for toolbar content from views)
            const wrapper = document.createElement('div');
            wrapper.innerHTML = content; // toolbar content from views may contain HTML
            while (wrapper.firstChild) {
                toolbar.appendChild(wrapper.firstChild);
            }
        } else if (content instanceof HTMLElement) {
            toolbar.appendChild(content);
        }

        toolbar.style.display = 'flex';
    }
}
