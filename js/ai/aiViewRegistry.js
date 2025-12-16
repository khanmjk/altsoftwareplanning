/**
 * AI View Registry
 * Maps view IDs to their context providers for AI Chat Panel integration.
 * 
 * This registry enables the AI scraper to get structured context data from
 * class-based views via their getAIContext() method, with fallback to legacy
 * global variable scraping.
 */

const AI_VIEW_REGISTRY = {
    // P0 - Critical
    planningView: {
        displayName: 'Year Plan',
        fallbackGlobals: []  // No module-level globals - all state in viewInstance via getContext()
    },

    // P1 - High Priority
    ganttPlanningView: {
        displayName: 'Detailed Planning (Gantt)',
        fallbackGlobals: []  // No module-level globals - all state in viewInstance
    },

    capacityConfigView: {
        displayName: 'Capacity Tuning',
        fallbackGlobals: []
    },

    managementView: {
        displayName: 'Product Management',
        fallbackGlobals: []
    },

    visualizationCarousel: {
        displayName: 'System Overview',
        fallbackGlobals: ['currentServiceDependenciesTableData']
    },

    organogramView: {
        displayName: 'Org Design',
        fallbackGlobals: []
    },

    roadmapView: {
        displayName: 'Roadmap',
        fallbackGlobals: []
    },

    // P2 - Secondary
    dashboardView: {
        displayName: 'Dashboard',
        fallbackGlobals: ['dashboardItems', 'currentDashboardIndex', 'dashboardPlanningYear']
    },

    sdmForecastingView: {
        displayName: 'Resource Forecasting',
        fallbackGlobals: []
    },

    settingsView: {
        displayName: 'Settings',
        fallbackGlobals: []
    },

    systemsView: {
        displayName: 'Systems',
        fallbackGlobals: []
    },

    // P3 - Low Priority / Static
    welcomeView: {
        displayName: 'Welcome',
        isStatic: true
    },

    helpView: {
        displayName: 'Help & Documentation',
        isStatic: true
    },

    systemEditForm: {
        displayName: 'Edit System',
        fallbackGlobals: []
    },

    aboutView: {
        displayName: 'About',
        fallbackGlobals: []
    }
};

/**
 * Get view instance from NavigationManager
 * @param {string} viewId - The view ID
 * @returns {Object|null} View instance or null
 */
function getViewInstance(viewId) {
    // Per coding contract: assume navigationManager exists (initialized in main.js)
    return navigationManager.getViewInstance(viewId);
}

/**
 * Get AI context for the current view
 * Tries class instance first, falls back to legacy globals
 * @param {string} viewId - The view ID to get context for
 * @returns {Object|null} Context data or null if view not found
 */
function getAIContextForView(viewId) {
    const config = AI_VIEW_REGISTRY[viewId];
    if (!config) return null;

    // Try class instance from NavigationManager
    // Per coding contract Rule 2.9: Assume all views implement getAIContext()
    // If a view doesn't, that's a bug to be fixed, not defended against
    const instance = getViewInstance(viewId);
    if (instance) {
        return {
            source: 'class',
            viewId: viewId,
            displayName: config.displayName,
            ...instance.getAIContext()
        };
    }

    // For static views, return minimal context
    if (config.isStatic) {
        return {
            source: 'static',
            viewId: viewId,
            displayName: config.displayName
        };
    }

    // Signal caller to use legacy scraping
    return null;
}

/**
 * Check if a view has a class-based context provider
 * @param {string} viewId - The view ID to check
 * @returns {boolean}
 */
function hasClassContextProvider(viewId) {
    const config = AI_VIEW_REGISTRY[viewId];
    if (!config) return false;

    // Per coding contract Rule 2.9: All registered views implement getAIContext()
    const instance = getViewInstance(viewId);
    return !!instance;
}
