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
        getInstance: () => window.yearPlanningView,
        displayName: 'Year Plan',
        fallbackGlobals: ['currentPlanningYear', 'planningCapacityScenario',
            'applyCapacityConstraintsToggle', 'currentYearPlanSummaryData',
            'currentYearPlanTableData']
    },

    // P1 - High Priority
    ganttPlanningView: {
        getInstance: () => null, // Legacy - no class yet
        displayName: 'Detailed Planning (Gantt)',
        fallbackGlobals: ['currentGanttYear', 'currentGanttGroupBy']
    },

    capacityConfigView: {
        getInstance: () => window.capacityPlanningViewInstance,
        displayName: 'Capacity Tuning',
        fallbackGlobals: []
    },

    managementView: {
        getInstance: () => window.managementViewInstance,
        displayName: 'Product Management',
        fallbackGlobals: []
    },

    visualizationCarousel: {
        getInstance: () => window.systemOverviewViewInstance,
        displayName: 'System Overview',
        fallbackGlobals: ['currentServiceDependenciesTableData']
    },

    organogramView: {
        getInstance: () => window.orgViewInstance,
        displayName: 'Org Design',
        fallbackGlobals: []
    },

    roadmapView: {
        getInstance: () => window.roadmapViewInstance,
        displayName: 'Roadmap',
        fallbackGlobals: []
    },

    // P2 - Secondary
    dashboardView: {
        getInstance: () => window.dashboardViewInstance,
        displayName: 'Dashboard',
        fallbackGlobals: ['dashboardItems', 'currentDashboardIndex', 'dashboardPlanningYear']
    },

    sdmForecastingView: {
        getInstance: () => window.resourceForecastViewInstance,
        displayName: 'Resource Forecasting',
        fallbackGlobals: []
    },

    settingsView: {
        getInstance: () => window.settingsViewInstance,
        displayName: 'Settings',
        fallbackGlobals: []
    },

    systemsView: {
        getInstance: () => window.systemsViewInstance,
        displayName: 'Systems',
        fallbackGlobals: []
    },

    // P3 - Low Priority / Static
    welcomeView: {
        getInstance: () => null,
        displayName: 'Welcome',
        isStatic: true
    },

    helpView: {
        getInstance: () => null,
        displayName: 'Help & Documentation',
        isStatic: true
    },

    systemEditForm: {
        getInstance: () => null,
        displayName: 'Edit System',
        fallbackGlobals: []
    }
};

/**
 * Get AI context for the current view
 * Tries class instance first, falls back to legacy globals
 * @param {string} viewId - The view ID to get context for
 * @returns {Object|null} Context data or null if view not found
 */
function getAIContextForView(viewId) {
    const config = AI_VIEW_REGISTRY[viewId];
    if (!config) return null;

    // Try class instance first
    const instance = config.getInstance?.();
    if (instance && instance.getAIContext) {
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

    const instance = config.getInstance?.();
    return instance && instance.getAIContext;
}

// Export to window
if (typeof window !== 'undefined') {
    window.AI_VIEW_REGISTRY = AI_VIEW_REGISTRY;
    window.getAIContextForView = getAIContextForView;
    window.hasClassContextProvider = hasClassContextProvider;
}
