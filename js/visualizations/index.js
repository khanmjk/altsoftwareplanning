/**
 * Visualization Classes Index
 * 
 * This module provides convenient access to all visualization classes.
 * Import order matters - BaseVisualization must be loaded first.
 * 
 * Available classes:
 * - BaseVisualization: Abstract base class with shared D3 patterns
 * - SystemVisualization: Main system architecture visualization
 * - TeamVisualization: Team relationships visualization
 * - ServiceVisualization: Service relationships visualization
 * - DependencyVisualization: Service dependency graph
 * 
 * Usage:
 * All classes are automatically available globally when scripts are loaded.
 * For convenience, instances can be created and reused:
 * 
 * @example
 * const systemViz = new SystemVisualization();
 * systemViz.render(SystemService.getCurrentSystem());
 */

// Global instances for convenience (created on demand)
let _visualizationInstances = null;

/**
 * Get or create visualization instances
 * @returns {Object} Object containing visualization instances
 */
function getVisualizationInstances() {
    if (!_visualizationInstances) {
        _visualizationInstances = {
            system: new SystemVisualization(),
            team: new TeamVisualization(),
            service: new ServiceVisualization(),
            dependency: new DependencyVisualization()
        };
    }
    return _visualizationInstances;
}

/**
 * Reset visualization instances (useful when configuration changes)
 */
function resetVisualizationInstances() {
    if (_visualizationInstances) {
        Object.values(_visualizationInstances).forEach(viz => viz.destroy());
    }
    _visualizationInstances = null;
}
