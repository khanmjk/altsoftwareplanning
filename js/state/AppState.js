/**
 * Centralized application state management
 */
class AppState {
    constructor() {
        this._state = {
            currentSystem: null,
            currentView: null,
            ui: {
                mode: 'NAVIGATION',
                loading: false
            },
            planning: {
                capacityScenario: 'effective',
                chartTeamId: '__ORG_VIEW__',
                draggedInitiativeId: null
            },
            settings: {
                ai: {
                    isEnabled: false,
                    provider: 'google-gemini',
                    apiKey: null
                }
            }
        };
        this._listeners = new Map();
    }

    /**
     * Get current system data
     * @returns {Object|null} Current system
     */
    get currentSystem() {
        return this._state.currentSystem;
    }

    /**
     * Set current system and notify listeners
     * @param {Object} value - System data
     */
    set currentSystem(value) {
        const oldValue = this._state.currentSystem;
        this._state.currentSystem = value;
        this._notify('currentSystem', value, oldValue);
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function
     */
    subscribe(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, []);
        }
        this._listeners.get(key).push(callback);
    }

    /**
     * Notify listeners of state change
     * @private
     */
    _notify(key, newValue, oldValue) {
        const listeners = this._listeners.get(key) || [];
        listeners.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                console.error(`State listener error for ${key}:`, error);
            }
        });
    }

    /**
     * Get nested state value
     * @param {string} path - Dot notation path (e.g., 'ui.loading')
     * @returns {*} State value
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this._state);
    }

    /**
     * Set nested state value
     * @param {string} path - Dot notation path
     * @param {*} value - New value
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this._state);
        const oldValue = target[lastKey];
        target[lastKey] = value;
        this._notify(path, value, oldValue);
    }

    /**
     * Close the current system and return to home/welcome view.
     * Centralizes "session close" logic.
     */
    closeCurrentSystem() {
        console.log("AppState: Closing current system session.");

        // Clear system state via SystemService
        if (typeof SystemService !== 'undefined') {
            SystemService.setCurrentSystem(null);
        }

        // Also clear local state (AppState is notified by SystemService.setCurrentSystem)
        this._state.currentSystem = null;

        // Update sidebar state
        if (typeof sidebarComponent !== 'undefined' && sidebarComponent) {
            sidebarComponent.updateState();
        }

        // Navigate to welcome view
        if (typeof navigationManager !== 'undefined' && navigationManager) {
            navigationManager.navigateTo('welcomeView');
        }
    }
}

// Export as singleton
const appState = new AppState();

// Define Modes constant within AppState
appState.Modes = {
    NAVIGATION: 'navigation',
    Browse: 'Browse',
    EDITING: 'editing',
    CREATING: 'creating',
    PLANNING: 'planning',
    ROADMAP: 'roadmap'
};

if (typeof window !== 'undefined') {
    window.appState = appState;
}
