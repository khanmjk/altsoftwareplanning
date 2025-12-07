/**
 * PillNavigationComponent
 * 
 * Reusable pill button navigation component for workspace toolbar.
 * Provides horizontal tab-style navigation with Jira-inspired styling.
 * 
 * @example
 * const pillNav = new PillNavigationComponent({
 *     items: [
 *         {id: 'overview', label: 'Overview', icon: 'fas fa-home'},
 *         {id: 'details', label: 'Details', icon: 'fas fa-info-circle'}
 *     ],
 *     onSwitch: (itemId) => console.log('Switched to:', itemId)
 * });
 * 
 * document.getElementById('toolbar').appendChild(pillNav.render());
 * pillNav.setActive('overview');
 */
class PillNavigationComponent {
    /**
     * @param {Object} options - Configuration options
     * @param {Array<Object>} options.items - Navigation items [{id, label, icon?}, ...]
     * @param {Function} options.onSwitch - Callback when pill is clicked (itemId) => {}
     * @param {string} options.initialActive - Optional initial active item ID
     */
    constructor(options = {}) {
        this.items = options.items || [];
        this.onSwitch = options.onSwitch || (() => { });
        this.activeItemId = options.initialActive || (this.items[0]?.id || null);
        this.container = null;

        // Validate items
        if (!Array.isArray(this.items) || this.items.length === 0) {
            console.warn('PillNavigationComponent: No items provided');
        }

        // Ensure each item has required fields
        this.items.forEach((item, index) => {
            if (!item.id) {
                console.error(`PillNavigationComponent: Item at index ${index} missing 'id' field`, item);
            }
            if (!item.label) {
                console.warn(`PillNavigationComponent: Item '${item.id}' missing 'label' field`);
            }
        });
    }

    /**
     * Renders the pill navigation component
     * @returns {HTMLElement} The rendered navigation container
     */
    render() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'pill-nav';
        this.container.setAttribute('role', 'tablist');

        // Create pill buttons for each item
        this.items.forEach((item, index) => {
            const pillButton = this.createPillButton(item, index);
            this.container.appendChild(pillButton);
        });

        return this.container;
    }

    /**
     * Creates a single pill button element
     * @private
     */
    createPillButton(item, index) {
        const button = document.createElement('button');
        button.className = 'pill-nav__item';
        button.setAttribute('role', 'tab');
        button.setAttribute('data-pill-id', item.id);
        button.setAttribute('aria-selected', item.id === this.activeItemId ? 'true' : 'false');
        button.setAttribute('tabindex', item.id === this.activeItemId ? '0' : '-1');

        // Add active class if this is the active item
        if (item.id === this.activeItemId) {
            button.classList.add('pill-nav__item--active');
        }

        // Add icon if provided
        if (item.icon) {
            const icon = document.createElement('i');
            icon.className = item.icon + ' pill-nav__icon';
            button.appendChild(icon);
        }

        // Add label
        const label = document.createElement('span');
        label.className = 'pill-nav__label';
        label.textContent = item.label;
        button.appendChild(label);

        // Add click handler
        button.addEventListener('click', () => {
            this.setActive(item.id);
            this.onSwitch(item.id);
        });

        // Add keyboard navigation
        button.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e, index);
        });

        return button;
    }

    /**
     * Handles keyboard navigation (arrow keys)
     * @private
     */
    handleKeyboardNavigation(event, currentIndex) {
        let targetIndex = currentIndex;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                targetIndex = currentIndex > 0 ? currentIndex - 1 : this.items.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                targetIndex = currentIndex < this.items.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                event.preventDefault();
                targetIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                targetIndex = this.items.length - 1;
                break;
            default:
                return; // Don't handle other keys
        }

        const targetItem = this.items[targetIndex];
        if (targetItem) {
            this.setActive(targetItem.id);
            this.onSwitch(targetItem.id);

            // Focus the new button
            const targetButton = this.container?.querySelector(`[data-pill-id="${targetItem.id}"]`);
            if (targetButton) {
                targetButton.focus();
            }
        }
    }

    /**
     * Sets the active pill button
     * @param {string} itemId - The ID of the item to make active
     */
    setActive(itemId) {
        if (!this.container) {
            console.warn('PillNavigationComponent: Cannot set active, component not rendered');
            return;
        }

        // Verify item exists
        const itemExists = this.items.some(item => item.id === itemId);
        if (!itemExists) {
            console.error(`PillNavigationComponent: Item '${itemId}' not found in items list`);
            return;
        }

        this.activeItemId = itemId;

        // Update all buttons
        const buttons = this.container.querySelectorAll('.pill-nav__item');
        buttons.forEach(button => {
            const buttonId = button.getAttribute('data-pill-id');
            const isActive = buttonId === itemId;

            // Update active class
            button.classList.toggle('pill-nav__item--active', isActive);

            // Update ARIA attributes
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    /**
     * Gets the currently active item ID
     * @returns {string|null} The active item ID or null
     */
    getActive() {
        return this.activeItemId;
    }

    /**
     * Updates the items and re-renders
     * @param {Array<Object>} newItems - New items array
     */
    updateItems(newItems) {
        this.items = newItems;
        if (this.container) {
            const parent = this.container.parentNode;
            if (parent) {
                const newContainer = this.render();
                parent.replaceChild(newContainer, this.container);
            }
        }
    }

    /**
     * Destroys the component and cleans up event listeners
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.items = [];
        this.activeItemId = null;
        this.onSwitch = () => { };
    }
}
