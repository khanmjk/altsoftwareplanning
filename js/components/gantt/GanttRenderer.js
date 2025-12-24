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
        this._eventTarget = new EventTarget();
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
        if (!this.container) return;
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    addEventListener(type, listener, options) {
        this._eventTarget.addEventListener(type, listener, options);
    }

    removeEventListener(type, listener, options) {
        this._eventTarget.removeEventListener(type, listener, options);
    }

    _emit(type, detail) {
        this._eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }
}
