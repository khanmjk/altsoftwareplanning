/**
 * SystemEditView
 * 
 * Wrapper class to conform editSystem.js to the workspace-canvas-contract.
 * Delegates rendering to SystemEditController.
 */
class SystemEditView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.controller = null;
    }

    render(container, params = {}) {
        if (container) {
            this.container = container;
        } else if (this.containerId) {
            this.container = document.getElementById(this.containerId);
        }

        if (!this.container) {
            console.error('SystemEditView: No container provided');
            return;
        }

        workspaceComponent.setPageMetadata({
            title: 'Edit System',
            breadcrumbs: ['System', 'Edit System'],
            actions: []
        });
        workspaceComponent.setToolbar(null);

        if (!this.controller) {
            this.controller = new SystemEditController();
        }

        // Get current system or create new for create mode
        const system = params.createMode ? null : SystemService.getCurrentSystem();

        this.controller.render(system, this.container);
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     */
    getAIContext() {
        const system = SystemService.getCurrentSystem();
        return {
            viewTitle: 'Edit System',
            systemName: system?.systemName || 'New System',
            isEditing: !!system
        };
    }
}
