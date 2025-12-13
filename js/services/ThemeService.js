/**
 * ThemeService.js
 * 
 * Manages application theming system
 * Handles theme switching, persistence, and CSS variable injection
 * 
 * Part of Service Layer Architecture
 */

const THEME_DEFINITIONS = {
    light: {
        id: 'light',
        name: 'Light Mode',
        colors: {
            bgPrimary: '#ffffff',
            bgSecondary: '#f8f9fa',
            bgTertiary: '#f0f2f5',

            textPrimary: '#212529',
            textSecondary: '#6c757d',
            textMuted: '#adb5bd',

            borderColor: '#e0e0e0',
            borderLight: '#f1f5f9',

            primary: '#007bff',
            primaryHover: '#0069d9',
            primaryActive: '#0062cc',

            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',

            cardBg: '#ffffff',
            cardBorder: '#e0e0e0',
            cardShadow: 'rgba(0, 0, 0, 0.05)',

            modalOverlay: 'rgba(0, 0, 0, 0.5)',
            dropdownBg: '#ffffff',

            headerBg: '#ffffff',
            headerText: '#212529',
            sidebarBg: '#ffffff',
            sidebarText: '#495057'
        }
    },

    dark: {
        id: 'dark',
        name: 'Dark Mode',
        colors: {
            bgPrimary: '#1a1a2e',
            bgSecondary: '#16213e',
            bgTertiary: '#0f3460',

            textPrimary: '#e8e8e8',
            textSecondary: '#b0b0b0',
            textMuted: '#808080',

            borderColor: '#2a2a3e',
            borderLight: '#3a3a4e',

            primary: '#4a9eff',
            primaryHover: '#3a8eef',
            primaryActive: '#2a7edf',

            success: '#3ddc84',
            warning: '#ffca28',
            danger: '#ff5252',
            info: '#29b6f6',

            cardBg: '#16213e',
            cardBorder: '#2a2a3e',
            cardShadow: 'rgba(0, 0, 0, 0.3)',

            modalOverlay: 'rgba(0, 0, 0, 0.7)',
            dropdownBg: '#16213e',

            headerBg: '#0f3460',
            headerText: '#e8e8e8',
            sidebarBg: '#16213e',
            sidebarText: '#b0b0b0'
        }
    },

    spring: {
        id: 'spring',
        name: 'Spring',
        colors: {
            bgPrimary: '#fff8f0',
            bgSecondary: '#fff0e6',
            bgTertiary: '#ffe8d6',

            textPrimary: '#2d3436',
            textSecondary: '#636e72',
            textMuted: '#b2bec3',

            borderColor: '#ffdab9',
            borderLight: '#ffe8cc',

            primary: '#ff6b9d',
            primaryHover: '#ff5588',
            primaryActive: '#ff3f77',

            success: '#55efc4',
            warning: '#fdcb6e',
            danger: '#ff7675',
            info: '#74b9ff',

            cardBg: '#ffffff',
            cardBorder: '#ffdab9',
            cardShadow: 'rgba(255, 107, 157, 0.1)',

            modalOverlay: 'rgba(255, 245, 235, 0.8)',
            dropdownBg: '#ffffff',

            headerBg: '#fff0e6',
            headerText: '#2d3436',
            sidebarBg: '#fff0e6',
            sidebarText: '#2d3436'
        }
    },

    summer: {
        id: 'summer',
        name: 'Summer',
        colors: {
            bgPrimary: '#fff9e6',
            bgSecondary: '#fff3cc',
            bgTertiary: '#ffedb3',

            textPrimary: '#3d3d3d',
            textSecondary: '#757575',
            textMuted: '#a0a0a0',

            borderColor: '#ffe699',
            borderLight: '#ffeb99',

            primary: '#ff9500',
            primaryHover: '#e68600',
            primaryActive: '#cc7700',

            success: '#4cd964',
            warning: '#ffcc00',
            danger: '#ff3b30',
            info: '#5ac8fa',

            cardBg: '#ffffff',
            cardBorder: '#ffe699',
            cardShadow: 'rgba(255, 149, 0, 0.1)',

            modalOverlay: 'rgba(255, 249, 230, 0.8)',
            dropdownBg: '#ffffff',

            headerBg: '#fff9e6',
            headerText: '#3d3d3d',
            sidebarBg: '#fff3cc',
            sidebarText: '#3d3d3d'
        }
    },

    autumn: {
        id: 'autumn',
        name: 'Autumn',
        colors: {
            bgPrimary: '#fff5eb',
            bgSecondary: '#ffe8d1',
            bgTertiary: '#ffd9b3',

            textPrimary: '#4a3728',
            textSecondary: '#6b5643',
            textMuted: '#9a8776',

            borderColor: '#d9a679',
            borderLight: '#e6c2a1',

            primary: '#d2691e',
            primaryHover: '#c25a14',
            primaryActive: '#b24b0a',

            success: '#8fbc8f',
            warning: '#daa520',
            danger: '#cd5c5c',
            info: '#5f9ea0',

            cardBg: '#ffffff',
            cardBorder: '#d9a679',
            cardShadow: 'rgba(210, 105, 30, 0.1)',

            modalOverlay: 'rgba(255, 245, 235, 0.8)',
            dropdownBg: '#ffffff',

            headerBg: '#fff5eb',
            headerText: '#4a3728',
            sidebarBg: '#ffe8d1',
            sidebarText: '#4a3728'
        }
    },

    winter: {
        id: 'winter',
        name: 'Winter',
        colors: {
            bgPrimary: '#f0f8ff',
            bgSecondary: '#e6f3ff',
            bgTertiary: '#d9edff',

            textPrimary: '#1e3a5f',
            textSecondary: '#4a6fa5',
            textMuted: '#7a9cc6',

            borderColor: '#b3d9ff',
            borderLight: '#cce5ff',

            primary: '#4682b4',
            primaryHover: '#36729f',
            primaryActive: '#26628a',

            success: '#5f9ea0',
            warning: '#f0e68c',
            danger: '#b0c4de',
            info: '#87ceeb',

            cardBg: '#ffffff',
            cardBorder: '#b3d9ff',
            cardShadow: 'rgba(70, 130, 180, 0.1)',

            modalOverlay: 'rgba(240, 248, 255, 0.8)',
            dropdownBg: '#ffffff',

            headerBg: '#f0f8ff',
            headerText: '#1e3a5f',
            sidebarBg: '#e6f3ff',
            sidebarText: '#1e3a5f'
        }
    }
};

const ThemeService = {
    currentTheme: 'light',
    customThemes: {}, // Store randomly generated themes

    /**
     * Initialize the theme service
     * Loads saved theme from settings and applies it
     */
    init() {
        const savedTheme = SettingsService.get('theme') || 'light';
        this.applyTheme(savedTheme, false); // Don't save on init (prevent circular write)
        console.log('ThemeService: Initialized with theme:', savedTheme);
    },

    /**
     * Apply a theme to the application
     * @param {string} themeId - Theme identifier
     * @param {boolean} persist - Whether to save to settings (default: true)
     */
    applyTheme(themeId, persist = true) {
        // Check built-in themes first
        let theme = THEME_DEFINITIONS[themeId];

        // Check custom themes if not found
        if (!theme && this.customThemes[themeId]) {
            theme = this.customThemes[themeId];
        }

        if (!theme) {
            console.error(`ThemeService: Theme "${themeId}" not found, falling back to light`);
            theme = THEME_DEFINITIONS.light;
            themeId = 'light';
        }

        // Temporarily disable transitions for instant theme switch
        document.body.classList.add('theme-transitioning');

        // Apply data-theme attribute for CSS selectors
        document.documentElement.setAttribute('data-theme', themeId);

        // Update CSS variables dynamically
        requestAnimationFrame(() => {
            const root = document.documentElement;
            Object.entries(theme.colors).forEach(([key, value]) => {
                const cssVar = this.camelToKebab(key);
                root.style.setProperty(`--theme-${cssVar}`, value);
            });

            this.currentTheme = themeId;

            // Re-enable transitions
            requestAnimationFrame(() => {
                document.body.classList.remove('theme-transitioning');
            });

            // Save to settings if requested
            if (persist) {
                SettingsService.update({ theme: themeId });
            }

            console.log('ThemeService: Applied theme:', themeId);
        });
    },

    /**
     * Get the current active theme ID
     * @returns {string}
     */
    getCurrentTheme() {
        return this.currentTheme;
    },

    /**
     * Check if the current theme is a dark theme
     * @returns {boolean}
     */
    isDarkTheme() {
        const theme = THEME_DEFINITIONS[this.currentTheme] || this.customThemes[this.currentTheme];
        if (!theme) return false;

        // Check background lightness - dark themes have dark backgrounds
        const bgPrimary = theme.colors.bgPrimary || '#ffffff';

        // Simple heuristic: if bgPrimary starts with a dark color
        if (bgPrimary.startsWith('hsl')) {
            // Extract lightness from HSL
            const match = bgPrimary.match(/hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*(\d+)%?\s*\)/);
            if (match) {
                return parseInt(match[1]) < 50;
            }
        }

        // For hex colors, convert and check brightness
        if (bgPrimary.startsWith('#')) {
            const hex = bgPrimary.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness < 128;
        }

        // Known dark theme IDs
        return this.currentTheme === 'dark';
    },

    /**
     * Get the current theme's color palette
     * @returns {Object} Color palette object
     */
    getThemeColors() {
        const theme = THEME_DEFINITIONS[this.currentTheme] || this.customThemes[this.currentTheme];
        return theme?.colors || THEME_DEFINITIONS.light.colors;
    },

    /**
     * Get list of available themes
     * @returns {Array<{id: string, name: string}>}
     */
    getThemeList() {
        const builtInThemes = Object.values(THEME_DEFINITIONS).map(t => ({
            id: t.id,
            name: t.name
        }));

        const customThemes = Object.values(this.customThemes).map(t => ({
            id: t.id,
            name: t.name
        }));

        return [...builtInThemes, ...customThemes];
    },

    /**
     * Generate a random theme with harmonious colors
     * @returns {Object} Theme object
     */
    generateRandomTheme() {
        const themeId = `random-${Date.now()}`;

        // Generate base hue (0-360)
        const baseHue = Math.floor(Math.random() * 360);

        // Randomly choose light or dark mode
        const isDark = Math.random() > 0.5;

        // Helper to create HSL color
        const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

        // Generate harmonious color palette
        const colors = isDark ? {
            // Dark theme palette
            bgPrimary: hsl(baseHue, 20, 15),
            bgSecondary: hsl(baseHue, 25, 18),
            bgTertiary: hsl(baseHue, 30, 22),

            textPrimary: hsl(baseHue, 10, 90),
            textSecondary: hsl(baseHue, 10, 70),
            textMuted: hsl(baseHue, 10, 50),

            borderColor: hsl(baseHue, 15, 25),
            borderLight: hsl(baseHue, 15, 30),

            primary: hsl(baseHue, 80, 60),
            primaryHover: hsl(baseHue, 80, 55),
            primaryActive: hsl(baseHue, 80, 50),

            success: hsl(120, 50, 60),
            warning: hsl(45, 90, 60),
            danger: hsl(0, 70, 60),
            info: hsl(200, 70, 60),

            cardBg: hsl(baseHue, 25, 18),
            cardBorder: hsl(baseHue, 15, 25),
            cardShadow: 'rgba(0, 0, 0, 0.3)',

            modalOverlay: 'rgba(0, 0, 0, 0.7)',
            dropdownBg: hsl(baseHue, 25, 18),

            headerBg: hsl(baseHue, 30, 20),
            headerText: hsl(baseHue, 10, 90),
            sidebarBg: hsl(baseHue, 25, 18),
            sidebarText: hsl(baseHue, 10, 70)
        } : {
            // Light theme palette
            bgPrimary: hsl(baseHue, 20, 98),
            bgSecondary: hsl(baseHue, 25, 95),
            bgTertiary: hsl(baseHue, 30, 92),

            textPrimary: hsl(baseHue, 20, 20),
            textSecondary: hsl(baseHue, 15, 40),
            textMuted: hsl(baseHue, 10, 60),

            borderColor: hsl(baseHue, 20, 85),
            borderLight: hsl(baseHue, 20, 90),

            primary: hsl(baseHue, 70, 50),
            primaryHover: hsl(baseHue, 70, 45),
            primaryActive: hsl(baseHue, 70, 40),

            success: hsl(120, 50, 45),
            warning: hsl(45, 90, 50),
            danger: hsl(0, 70, 50),
            info: hsl(200, 70, 50),

            cardBg: '#ffffff',
            cardBorder: hsl(baseHue, 20, 85),
            cardShadow: `hsla(${baseHue}, 50%, 50%, 0.1)`,

            modalOverlay: 'rgba(0, 0, 0, 0.5)',
            dropdownBg: '#ffffff',

            headerBg: hsl(baseHue, 25, 95),
            headerText: hsl(baseHue, 20, 20),
            sidebarBg: hsl(baseHue, 25, 95),
            sidebarText: hsl(baseHue, 15, 40)
        };

        const randomTheme = {
            id: themeId,
            name: `Random Theme (${isDark ? 'Dark' : 'Light'})`,
            colors: colors
        };

        // Store in custom themes
        this.customThemes[themeId] = randomTheme;

        return randomTheme;
    },

    /**
     * Convert camelCase to kebab-case for CSS variables
     * @param {string} str - camelCase string
     * @returns {string} kebab-case string
     */
    camelToKebab(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
};
