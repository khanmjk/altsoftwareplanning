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
        this.extensionRegistry = new Map();
        this.extensionContainer = null;
        this.extensionHandle = null;
        this.activeExtensionId = null;
        this.currentExtensionWidth = 0;
        this.isResizingExtension = false;
        this._boundExtensionResizeStart = this._handleExtensionResizeStart.bind(this);
        this._boundExtensionResizeMove = this._handleExtensionResizeMove.bind(this);
        this._boundExtensionResizeEnd = this._handleExtensionResizeEnd.bind(this);
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
            child.classList.add('is-hidden');
        });

        // 2. Get or Create the view container
        let viewContainer = document.getElementById(viewId);

        if (!viewContainer) {
            viewContainer = document.createElement('div');
            viewContainer.id = viewId;
            viewContainer.className = 'workspace-view';
            this.container.appendChild(viewContainer);
        } else {
            // Ensure it's visible
            viewContainer.classList.remove('is-hidden');
            // Clear previous content using DOM API
            this._clearElement(viewContainer);
        }
        viewContainer.classList.remove('is-hidden');

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

    _appendHtmlContent(container, htmlContent) {
        if (!container || !htmlContent) return;
        const parser = new DOMParser();
        const parsed = parser.parseFromString(htmlContent, 'text/html');
        while (parsed.body.firstChild) {
            container.appendChild(parsed.body.firstChild);
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
            toolbar.classList.add('is-hidden');
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
            this._appendHtmlContent(toolbar, content);
        } else if (content instanceof HTMLElement) {
            toolbar.appendChild(content);
        }

        toolbar.classList.remove('is-hidden');
    }

    /**
     * Initializes the workspace extension framework.
     */
    initExtensions() {
        this.extensionContainer = document.getElementById('workspace-extension-container');
        this.extensionHandle = document.getElementById('workspace-extension-handle');

        if (!this.extensionContainer || !this.extensionHandle) {
            console.error('WorkspaceComponent: Extension container not found.');
            return;
        }

        this.extensionHandle.addEventListener('mousedown', this._boundExtensionResizeStart);

        document.addEventListener('viewChanged', (event) => {
            const viewId = event?.detail?.viewId;
            if (!viewId) return;
            this.notifyViewChange(viewId);
        });

        this._setExtensionWidth(0);
        this.extensionContainer.setAttribute('aria-hidden', 'true');
        this.extensionHandle.classList.add('is-hidden');
    }

    /**
     * Registers a workspace extension.
     * @param {Object} extension
     */
    registerExtension(extension) {
        const entry = {
            extension: extension,
            pane: null,
            rendered: false,
            enabled: true,
            defaultWidth: extension.defaultWidth || 400,
            minWidth: extension.minWidth || 280,
            maxWidth: extension.maxWidth || null,
            width: extension.defaultWidth || 400
        };

        this.extensionRegistry.set(extension.id, entry);
        this._mountExtension(entry);
    }

    /**
     * Opens a registered extension panel.
     * @param {string} extensionId
     */
    openExtension(extensionId) {
        const entry = this.extensionRegistry.get(extensionId);
        if (!entry || !entry.enabled) return;

        if (!entry.rendered) {
            this._mountExtension(entry);
        }

        if (this.activeExtensionId && this.activeExtensionId !== extensionId) {
            this._hideExtension(this.activeExtensionId);
        }

        this.activeExtensionId = extensionId;

        if (entry.pane) {
            entry.pane.classList.remove('is-hidden');
        }

        this.extensionContainer.setAttribute('aria-hidden', 'false');
        this.extensionHandle.classList.remove('is-hidden');
        this._setExtensionWidth(entry.width);

        entry.extension.onOpen();
    }

    /**
     * Closes the active extension panel.
     * @param {string} [extensionId]
     */
    closeExtension(extensionId = this.activeExtensionId) {
        if (!extensionId) return;
        const entry = this.extensionRegistry.get(extensionId);
        if (!entry) return;

        if (entry.pane) {
            entry.pane.classList.add('is-hidden');
        }

        entry.extension.onClose();
        this.activeExtensionId = null;
        this._setExtensionWidth(0);
        this.extensionContainer.setAttribute('aria-hidden', 'true');
        this.extensionHandle.classList.add('is-hidden');
    }

    /**
     * Toggles the visibility of an extension panel.
     * @param {string} extensionId
     */
    toggleExtension(extensionId) {
        if (this.isExtensionOpen(extensionId)) {
            this.closeExtension(extensionId);
            return;
        }
        this.openExtension(extensionId);
    }

    /**
     * Checks if a specific extension is open.
     * @param {string} extensionId
     * @returns {boolean}
     */
    isExtensionOpen(extensionId) {
        return this.activeExtensionId === extensionId && this.currentExtensionWidth > 0;
    }

    /**
     * Enables or disables an extension panel.
     * @param {string} extensionId
     * @param {boolean} isEnabled
     */
    setExtensionEnabled(extensionId, isEnabled) {
        const entry = this.extensionRegistry.get(extensionId);
        if (!entry) return;
        entry.enabled = isEnabled;

        if (!isEnabled && this.activeExtensionId === extensionId) {
            this.closeExtension(extensionId);
        }
    }

    /**
     * Notifies the active extension of a view change.
     * @param {string} viewId
     */
    notifyViewChange(viewId) {
        if (!this.activeExtensionId) return;
        const entry = this.extensionRegistry.get(this.activeExtensionId);
        if (!entry) return;
        entry.extension.onViewChange(viewId);
    }

    _mountExtension(entry) {
        if (!this.extensionContainer || entry.rendered) return;

        const pane = document.createElement('div');
        pane.className = 'workspace-extension__pane is-hidden';
        pane.dataset.extensionId = entry.extension.id;
        entry.extension.render(pane);

        this.extensionContainer.appendChild(pane);
        entry.pane = pane;
        entry.rendered = true;
    }

    _hideExtension(extensionId) {
        const entry = this.extensionRegistry.get(extensionId);
        if (!entry) return;

        if (entry.pane) {
            entry.pane.classList.add('is-hidden');
        }
        entry.extension.onClose();
    }

    _setExtensionWidth(width) {
        const activeEntry = this.activeExtensionId
            ? this.extensionRegistry.get(this.activeExtensionId)
            : null;
        const clampedWidth = this._clampExtensionWidth(width, activeEntry);
        this.currentExtensionWidth = clampedWidth;
        styleVars.set(document.documentElement, { '--workspace-extension-width': `${clampedWidth}px` });
    }

    _clampExtensionWidth(width, entry) {
        if (width <= 0) return 0;
        if (!entry) return width;

        const maxWidth = entry.maxWidth || Math.floor(window.innerWidth / 2);
        const minWidth = entry.minWidth;
        return Math.min(Math.max(width, minWidth), maxWidth);
    }

    _handleExtensionResizeStart(event) {
        if (!this.activeExtensionId) return;
        event.preventDefault();
        this.isResizingExtension = true;
        document.body.classList.add('is-resizing');
        document.addEventListener('mousemove', this._boundExtensionResizeMove);
        document.addEventListener('mouseup', this._boundExtensionResizeEnd);
    }

    _handleExtensionResizeMove(event) {
        if (!this.isResizingExtension || !this.activeExtensionId) return;
        const entry = this.extensionRegistry.get(this.activeExtensionId);
        if (!entry) return;

        const newWidth = window.innerWidth - event.clientX;
        this._setExtensionWidth(newWidth);
        entry.width = this.currentExtensionWidth;
    }

    _handleExtensionResizeEnd() {
        this.isResizingExtension = false;
        document.body.classList.remove('is-resizing');
        document.removeEventListener('mousemove', this._boundExtensionResizeMove);
        document.removeEventListener('mouseup', this._boundExtensionResizeEnd);
    }
}
