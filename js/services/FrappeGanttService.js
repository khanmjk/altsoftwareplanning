/**
 * FrappeGanttService - Abstraction layer for Frappe Gantt library
 * 
 * This service provides a unified interface for creating Frappe Gantt instances,
 * abstracting away the direct Gantt global reference for future ES module migration.
 */
const FrappeGanttService = {
    /**
     * Check if Frappe Gantt library is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof Gantt !== 'undefined';
    },

    /**
     * Create a new Frappe Gantt chart instance
     * @param {string} selector - CSS selector for the container (e.g., '#chart')
     * @param {Array} tasks - Array of task objects
     * @param {Object} options - Frappe Gantt configuration options
     * @returns {Object} Gantt instance
     * @throws {Error} If Frappe Gantt library is not available
     */
    createInstance(selector, tasks, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('FrappeGanttService: Frappe Gantt library not loaded');
        }
        return new Gantt(selector, tasks, options);
    },

    /**
     * Get the Gantt constructor (for advanced use cases)
     * @returns {Function|null} The Gantt constructor or null if not available
     */
    getConstructor() {
        if (!this.isAvailable()) {
            return null;
        }
        return Gantt;
    }
};
