/**
 * Utility for applying CSS custom properties without inline style clutter.
 */
const styleVars = {
    /**
     * Apply CSS variables to a target element.
     * @param {HTMLElement} el - Target element
     * @param {Object} vars - Map of CSS variable names to values
     */
    set(el, vars) {
        if (!el || !vars) return;
        Object.entries(vars).forEach(([key, value]) => {
            el.style.setProperty(key, value);
        });
    }
};
