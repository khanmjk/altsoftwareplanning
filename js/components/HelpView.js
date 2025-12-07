/**
 * HelpView
 * 
 * Wrapper class to conform documentation.js to the workspace-canvas-contract.
 * Delegates rendering to the existing renderHelpView function.
 */
class HelpView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
    }

    render(container) {
        if (container) {
            this.container = container;
        } else if (this.containerId) {
            this.container = document.getElementById(this.containerId);
        }

        if (!this.container) {
            console.error('HelpView: No container provided');
            return;
        }

        // Delegate to existing function
        renderHelpView(this.container);
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     */
    getAIContext() {
        return {
            viewTitle: 'How to Guide',
            description: 'Documentation and help content'
        };
    }
}
