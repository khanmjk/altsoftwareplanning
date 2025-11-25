/**
 * Abstract base class for Gantt renderers.
 * All specific renderer implementations should extend this class.
 */
class GanttRenderer {
    constructor(container) {
        if (this.constructor === GanttRenderer) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.container = container;
    }

    /**
     * Render the Gantt chart with the given tasks.
     * @param {Array} tasks - Array of task objects (normalized format).
     * @param {Object} options - Rendering options (e.g., title, year).
     */
    async render(tasks, options) {
        throw new Error("Method 'render()' must be implemented.");
    }

    /**
     * Clear the chart container.
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

if (typeof window !== 'undefined') {
    window.GanttRenderer = GanttRenderer;
}
