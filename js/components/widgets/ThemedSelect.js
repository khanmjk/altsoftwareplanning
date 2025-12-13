/**
 * ThemedSelect
 * 
 * A reusable themed dropdown component that replaces native select elements
 * with fully customizable, theme-aware dropdowns.
 * 
 * Usage:
 * 1. Direct instantiation:
 *    const select = new ThemedSelect({
 *        options: [{value: '1', text: 'Option 1'}, ...],
 *        value: '1',
 *        onChange: (value) => console.log(value)
 *    });
 *    container.appendChild(select.render());
 * 
 * 2. Auto-upgrade existing selects:
 *    Add class "themed-select-auto" to any native <select> element
 *    Call ThemedSelect.upgradeAll() on page load
 */
class ThemedSelect {
    /**
     * @param {object} options
     * @param {Array<{value: string, text: string, disabled?: boolean}>} options.options - Dropdown options
     * @param {string} [options.value] - Initial selected value
     * @param {string} [options.placeholder='Select...'] - Placeholder text
     * @param {function} [options.onChange] - Callback when value changes (receives value, text)
     * @param {string} [options.className] - Additional CSS class for container
     * @param {string} [options.id] - ID for the hidden input
     * @param {string} [options.name] - Name attribute for form submission
     * @param {boolean} [options.disabled=false] - Disabled state
     * @param {boolean} [options.searchable=false] - Enable search/filter (future)
     * @param {HTMLSelectElement} [options.originalSelect] - Original select element (for auto-upgrade)
     */
    constructor({
        options = [],
        value = '',
        placeholder = 'Select...',
        onChange = null,
        className = '',
        id = '',
        name = '',
        disabled = false,
        searchable = false,
        originalSelect = null
    } = {}) {
        this.options = options;
        this.value = value;
        this.placeholder = placeholder;
        this.onChange = onChange;
        this.className = className;
        this.id = id || `themed-select-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.disabled = disabled;
        this.searchable = searchable;
        this.originalSelect = originalSelect;

        this.isOpen = false;
        this.highlightedIndex = -1;
        this.container = null;
        this.trigger = null;
        this.dropdown = null;
        this.hiddenInput = null;

        // Register this instance for global management
        ThemedSelect._instances.push(this);

        // Bind methods
        this._handleTriggerClick = this._handleTriggerClick.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleClickOutside = this._handleClickOutside.bind(this);
    }

    /**
     * Render the themed select component
     * @returns {HTMLElement}
     */
    render() {
        // Container
        this.container = document.createElement('div');
        this.container.className = `themed-select ${this.className}`.trim();
        this.container.setAttribute('data-themed-select-id', this.id);
        if (this.disabled) {
            this.container.classList.add('themed-select--disabled');
        }

        // Hidden input for form submission
        this.hiddenInput = document.createElement('input');
        this.hiddenInput.type = 'hidden';
        this.hiddenInput.id = this.id;
        this.hiddenInput.name = this.name;
        this.hiddenInput.value = this.value;
        this.container.appendChild(this.hiddenInput);

        // Trigger button
        this.trigger = document.createElement('button');
        this.trigger.type = 'button';
        this.trigger.className = 'themed-select__trigger';
        this.trigger.setAttribute('aria-haspopup', 'listbox');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.disabled = this.disabled;
        this._updateTriggerText();
        this.container.appendChild(this.trigger);

        // Dropdown panel
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'themed-select__dropdown';
        this.dropdown.setAttribute('role', 'listbox');
        this.dropdown.setAttribute('aria-labelledby', this.id);
        this._renderOptions();
        this.container.appendChild(this.dropdown);

        // Event listeners
        this.trigger.addEventListener('click', this._handleTriggerClick);
        this.trigger.addEventListener('keydown', this._handleKeyDown);
        this.dropdown.addEventListener('keydown', this._handleKeyDown);

        // Prevent scroll propagation when scrolling inside dropdown
        this.dropdown.addEventListener('wheel', this._handleDropdownWheel.bind(this), { passive: false });

        return this.container;
    }

    /**
     * Render dropdown options
     */
    _renderOptions() {
        this.dropdown.innerHTML = '';

        this.options.forEach((opt, index) => {
            const option = document.createElement('div');
            option.className = 'themed-select__option';
            option.setAttribute('role', 'option');
            option.setAttribute('data-value', opt.value);
            option.setAttribute('data-index', index);
            option.textContent = opt.text;

            if (opt.value === this.value) {
                option.classList.add('themed-select__option--selected');
                option.setAttribute('aria-selected', 'true');
            }

            if (opt.disabled) {
                option.classList.add('themed-select__option--disabled');
                option.setAttribute('aria-disabled', 'true');
            }

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!opt.disabled) {
                    this._selectOption(opt.value, opt.text);
                }
            });

            option.addEventListener('mouseenter', () => {
                this._highlightOption(index);
            });

            this.dropdown.appendChild(option);
        });
    }

    /**
     * Update trigger button text
     */
    _updateTriggerText() {
        const selected = this.options.find(opt => opt.value === this.value);
        if (selected) {
            this.trigger.textContent = selected.text;
            this.trigger.classList.remove('themed-select__trigger--placeholder');
        } else {
            this.trigger.textContent = this.placeholder;
            this.trigger.classList.add('themed-select__trigger--placeholder');
        }
    }

    /**
     * Handle trigger click
     */
    _handleTriggerClick(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.disabled) {
            this.isOpen ? this.close() : this.open();
        }
    }

    /**
     * Handle keyboard navigation
     */
    _handleKeyDown(e) {
        if (this.disabled) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.isOpen && this.highlightedIndex >= 0) {
                    const opt = this.options[this.highlightedIndex];
                    if (opt && !opt.disabled) {
                        this._selectOption(opt.value, opt.text);
                    }
                } else if (!this.isOpen) {
                    this.open();
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.close();
                this.trigger.focus();
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (!this.isOpen) {
                    this.open();
                } else {
                    this._highlightNextOption(1);
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (this.isOpen) {
                    this._highlightNextOption(-1);
                }
                break;

            case 'Tab':
                if (this.isOpen) {
                    this.close();
                }
                break;

            case 'Home':
                if (this.isOpen) {
                    e.preventDefault();
                    this._highlightOption(0);
                }
                break;

            case 'End':
                if (this.isOpen) {
                    e.preventDefault();
                    this._highlightOption(this.options.length - 1);
                }
                break;
        }
    }

    /**
     * Highlight an option by index
     */
    _highlightOption(index) {
        const options = this.dropdown.querySelectorAll('.themed-select__option');
        options.forEach((opt, i) => {
            opt.classList.toggle('themed-select__option--highlighted', i === index);
        });
        this.highlightedIndex = index;

        // Scroll into view
        if (options[index]) {
            options[index].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Move highlight by direction
     */
    _highlightNextOption(direction) {
        let newIndex = this.highlightedIndex + direction;

        // Skip disabled options
        while (newIndex >= 0 && newIndex < this.options.length) {
            if (!this.options[newIndex].disabled) {
                break;
            }
            newIndex += direction;
        }

        if (newIndex >= 0 && newIndex < this.options.length) {
            this._highlightOption(newIndex);
        }
    }

    /**
     * Handle wheel events on dropdown to prevent page scroll
     * Only scrolls the dropdown content, never the page
     */
    _handleDropdownWheel(e) {
        if (!this.isOpen) return;

        const dropdown = this.dropdown;
        const scrollTop = dropdown.scrollTop;
        const scrollHeight = dropdown.scrollHeight;
        const clientHeight = dropdown.clientHeight;
        const deltaY = e.deltaY;

        // Check if content is scrollable
        const isScrollable = scrollHeight > clientHeight;

        if (!isScrollable) {
            // Content fits, no need to scroll at all - prevent page scroll
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // If scrolling up and at top, or scrolling down and at bottom, prevent page scroll
        const atTop = scrollTop <= 0 && deltaY < 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight && deltaY > 0;

        if (atTop || atBottom) {
            e.preventDefault();
        }

        e.stopPropagation();
    }

    /**
     * Select an option
     */
    _selectOption(value, text) {
        const previousValue = this.value;
        this.value = value;
        this.hiddenInput.value = value;

        // Update UI
        this._updateTriggerText();
        this._renderOptions();
        this.close();
        this.trigger.focus();

        // Update original select if exists
        if (this.originalSelect) {
            this.originalSelect.value = value;
            // Dispatch change event on original select
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Call onChange callback
        if (this.onChange && previousValue !== value) {
            this.onChange(value, text);
        }
    }

    /**
     * Open the dropdown
     */
    open() {
        if (this.disabled || this.isOpen) return;

        // Close all other open dropdowns first
        ThemedSelect.closeAllExcept(this);

        this.isOpen = true;
        this.container.classList.add('themed-select--open');
        this.trigger.setAttribute('aria-expanded', 'true');

        // Highlight current selection
        const currentIndex = this.options.findIndex(opt => opt.value === this.value);
        this._highlightOption(currentIndex >= 0 ? currentIndex : 0);

        // Add click outside listener
        setTimeout(() => {
            document.addEventListener('click', this._handleClickOutside);
        }, 0);
    }

    /**
     * Close the dropdown
     */
    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.container.classList.remove('themed-select--open');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.highlightedIndex = -1;

        // Remove highlight
        this.dropdown.querySelectorAll('.themed-select__option--highlighted').forEach(opt => {
            opt.classList.remove('themed-select__option--highlighted');
        });

        document.removeEventListener('click', this._handleClickOutside);
    }

    /**
     * Handle click outside
     */
    _handleClickOutside(e) {
        if (!this.container.contains(e.target)) {
            this.close();
        }
    }

    /**
     * Get current value
     * @returns {string}
     */
    getValue() {
        return this.value;
    }

    /**
     * Set value programmatically
     * @param {string} value
     */
    setValue(value) {
        const opt = this.options.find(o => o.value === value);
        if (opt) {
            this._selectOption(opt.value, opt.text);
        }
    }

    /**
     * Update options dynamically
     * @param {Array<{value: string, text: string}>} options
     */
    setOptions(options) {
        this.options = options;
        this._renderOptions();

        // Reset value if current value not in new options
        if (!options.find(o => o.value === this.value)) {
            this.value = '';
            this._updateTriggerText();
        }
    }

    /**
     * Enable/disable the select
     * @param {boolean} disabled
     */
    setDisabled(disabled) {
        this.disabled = disabled;
        this.trigger.disabled = disabled;
        this.container.classList.toggle('themed-select--disabled', disabled);
        if (disabled) {
            this.close();
        }
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        document.removeEventListener('click', this._handleClickOutside);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    // =========================================================================
    // Static Methods for Auto-Upgrade
    // =========================================================================

    /**
     * Upgrade all native selects with class "themed-select-auto"
     * @param {HTMLElement} [container=document] - Container to search within
     * @returns {ThemedSelect[]} - Array of created ThemedSelect instances
     */
    static upgradeAll(container = document) {
        const instances = [];
        const selects = container.querySelectorAll('select.themed-select-auto');

        selects.forEach(select => {
            // Skip if already upgraded
            if (select.hasAttribute('data-themed-select-upgraded')) {
                return;
            }

            // Check if select has options (excluding empty placeholder)
            const hasRealOptions = select.options.length > 1 ||
                (select.options.length === 1 && select.options[0].value !== '');

            if (hasRealOptions) {
                // Options exist, upgrade immediately
                const instance = ThemedSelect.upgradeSelect(select);
                if (instance) {
                    instances.push(instance);
                }
            } else {
                // No options yet, use MutationObserver to wait for them
                ThemedSelect._waitForOptionsAndUpgrade(select);
            }
        });

        return instances;
    }

    /**
     * Wait for options to be added to select, then upgrade
     * @param {HTMLSelectElement} select
     * @private
     */
    static _waitForOptionsAndUpgrade(select) {
        // Skip if already being observed or upgraded
        if (select._themedSelectObserver || select.hasAttribute('data-themed-select-upgraded')) {
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            // Check if options have been added
            const hasRealOptions = select.options.length > 1 ||
                (select.options.length === 1 && select.options[0].value !== '');

            if (hasRealOptions) {
                // Disconnect observer first to prevent multiple upgrades
                obs.disconnect();
                select._themedSelectObserver = null;

                // Upgrade the select
                ThemedSelect.upgradeSelect(select);
            }
        });

        // Store reference to observer for cleanup
        select._themedSelectObserver = observer;

        // Observe for child changes (option elements being added)
        observer.observe(select, {
            childList: true,
            subtree: false
        });

        // Safety timeout: if no options after 5 seconds, stop observing
        setTimeout(() => {
            if (select._themedSelectObserver) {
                select._themedSelectObserver.disconnect();
                select._themedSelectObserver = null;
                console.warn('[ThemedSelect] Timeout waiting for options:', select.id);
            }
        }, 5000);
    }

    /**
     * Upgrade a single native select element
     * @param {HTMLSelectElement} select - Native select to upgrade
     * @returns {ThemedSelect|null}
     */
    static upgradeSelect(select) {
        if (!select || select.hasAttribute('data-themed-select-upgraded')) {
            return null;
        }

        // Extract options from native select
        const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            disabled: opt.disabled
        }));

        // Get current value
        const value = select.value;

        // Get placeholder from first empty option or data attribute
        let placeholder = select.getAttribute('data-placeholder') || 'Select...';
        if (select.options[0] && select.options[0].value === '' && select.options[0].text) {
            placeholder = select.options[0].text;
        }

        // Create ThemedSelect instance
        const instance = new ThemedSelect({
            options,
            value,
            placeholder,
            id: select.id || undefined,
            name: select.name || undefined,
            disabled: select.disabled,
            className: select.className.replace('themed-select-auto', '').trim(),
            originalSelect: select
        });

        // Render and insert
        const themedElement = instance.render();

        // Hide original select (keep for form submission and event handling)
        select.style.display = 'none';
        select.setAttribute('data-themed-select-upgraded', 'true');
        select.setAttribute('aria-hidden', 'true');
        select.tabIndex = -1;

        // Insert themed select after the native one
        select.parentNode.insertBefore(themedElement, select.nextSibling);

        // Sync changes from native select (for programmatic updates)
        select.addEventListener('change', () => {
            if (select.value !== instance.getValue()) {
                instance.setValue(select.value);
            }
        });

        // Store instance reference
        select._themedSelectInstance = instance;

        return instance;
    }

    /**
     * Get ThemedSelect instance from a native select element
     * @param {HTMLSelectElement} select
     * @returns {ThemedSelect|null}
     */
    static getInstance(select) {
        return select._themedSelectInstance || null;
    }

    /**
     * Close all open ThemedSelect dropdowns except the specified one
     * @param {ThemedSelect} [exceptInstance] - Instance to keep open
     */
    static closeAllExcept(exceptInstance = null) {
        ThemedSelect._instances.forEach(instance => {
            if (instance !== exceptInstance && instance.isOpen) {
                instance.close();
            }
        });
    }

    /**
     * Close all open ThemedSelect dropdowns
     */
    static closeAll() {
        ThemedSelect.closeAllExcept(null);
    }
}

// Static instances registry
ThemedSelect._instances = [];

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemedSelect;
}
