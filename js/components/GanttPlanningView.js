/**
 * GanttPlanningView
 * 
 * Wrapper class to conform ganttPlanning.js to the workspace-canvas-contract.
 * Delegates rendering to the existing renderGanttPlanningView function.
 */
class GanttPlanningView {
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
            console.error('GanttPlanningView: No container provided');
            return;
        }

        // Delegate to existing function
        renderGanttPlanningView(this.container);
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     */
    getAIContext() {
        return {
            viewTitle: 'Detailed Planning (Gantt)',
            currentYear: typeof currentGanttYear !== 'undefined' ? currentGanttYear : null,
            groupBy: typeof currentGanttGroupBy !== 'undefined' ? currentGanttGroupBy : null
        };
    }
}
