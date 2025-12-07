/**
 * Factory to create the appropriate GanttRenderer based on feature flags.
 */
class GanttFactory {
    /**
     * Create a Gantt renderer instance.
     * @param {HTMLElement} container - The container element for the chart.
     * @returns {GanttRenderer}
     */
    static createRenderer(container) {
        const rendererType = FeatureFlags.getRenderer();

        switch (rendererType) {
            case 'frappe':
                return new FrappeGanttRenderer(container);
            case 'mermaid':
            default:
                return new MermaidGanttRenderer(container);
        }
    }
}
