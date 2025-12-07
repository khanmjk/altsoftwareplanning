/**
 * SystemEditView
 * 
 * Wrapper class to conform editSystem.js to the workspace-canvas-contract.
 * Delegates rendering to the existing showSystemEditForm function.
 */
class SystemEditView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
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

        // Get current system or create new for create mode
        const system = params.createMode ? null : SystemService.getCurrentSystem();

        // Delegate to existing function
        showSystemEditForm(system, this.container);
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
