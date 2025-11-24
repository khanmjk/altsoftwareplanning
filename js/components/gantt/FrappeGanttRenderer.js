/**
 * Frappe Gantt implementation of the GanttRenderer.
 * Currently a stub for future implementation.
 */
class FrappeGanttRenderer extends GanttRenderer {
    constructor(container) {
        super(container);
    }

    async render(tasks, options = {}) {
        if (!this.container) return;
        this.clear();

        this.container.innerHTML = `
            <div style="padding: 20px; text-align: center; border: 2px dashed #ccc; background-color: #f9f9f9; color: #666;">
                <h3>Frappe Gantt Renderer</h3>
                <p>This renderer is currently under development.</p>
                <p>Please switch back to <strong>Mermaid</strong> using the feature flag:</p>
                <code>FeatureFlags.setRenderer('mermaid')</code>
            </div>
        `;

        console.log('[FrappeGanttRenderer] Render called with tasks:', tasks);
    }
}

if (typeof window !== 'undefined') {
    window.FrappeGanttRenderer = FrappeGanttRenderer;
}
