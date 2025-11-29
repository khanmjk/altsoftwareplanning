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
    render(viewId, renderCallback) {
        if (!this.container) return;

        console.log(`WorkspaceComponent: Rendering view '${viewId}'`);

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
            // Apply standard workspace styles
            viewContainer.style.width = '100%';
            viewContainer.style.height = '100%';
            viewContainer.style.overflowY = 'auto';
            viewContainer.style.padding = '20px';
            viewContainer.style.boxSizing = 'border-box';
            this.container.appendChild(viewContainer);
        } else {
            // Ensure it's visible
            viewContainer.style.display = 'block';
            // Clear previous content to ensure fresh render
            viewContainer.innerHTML = '';
        }

        // 3. Execute the render callback to populate the content
        if (typeof renderCallback === 'function') {
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
    }
}

// Export for global usage
if (typeof window !== 'undefined') {
    window.WorkspaceComponent = WorkspaceComponent;
}
