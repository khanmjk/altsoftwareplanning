/**
 * DualListSelector
 * 
 * A reusable component for dual-list selection interfaces (e.g., selecting items from a pool).
 * Replaces the legacy createDualListContainer utility.
 */
class DualListSelector {
    /**
     * @param {object} options
     * @param {string} options.contextIndex - Unique identifier for this instance context
     * @param {string} options.leftLabel - Label for the left (selected) list
     * @param {string} options.rightLabel - Label for the right (available) list
     * @param {Array<object>} options.currentOptions - Items currently in the left list [{text, value}]
     * @param {Array<object>} options.availableOptions - Items currently in the right list [{text, value}]
     * @param {string} options.leftField - Data attribute name for left list
     * @param {string} options.rightField - Data attribute name for right list
     * @param {Function} options.moveCallback - Callback(value, direction('add'|'remove'), contextIndex)
     * @param {boolean} [options.multiSelectLeft=true] - Whether left list allows multiple selection
     * @param {boolean} [options.allowAddNew=false] - Whether to show "Add New" input
     * @param {string} [options.addNewPlaceholder=''] - Placeholder for "Add New" input
     * @param {Function} [options.addNewCallback=null] - Callback for adding new item
     */
    constructor({
        contextIndex,
        leftLabel,
        rightLabel,
        currentOptions,
        availableOptions,
        leftField,
        rightField,
        moveCallback,
        multiSelectLeft = true,
        allowAddNew = false,
        addNewPlaceholder = '',
        addNewCallback = null
    }) {
        this.contextIndex = contextIndex;
        this.leftLabel = leftLabel;
        this.rightLabel = rightLabel;
        this.currentOptions = currentOptions || [];
        this.availableOptions = availableOptions || [];
        this.leftField = leftField;
        this.rightField = rightField;
        this.moveCallback = moveCallback;
        this.multiSelectLeft = multiSelectLeft;
        this.allowAddNew = allowAddNew;
        this.addNewPlaceholder = addNewPlaceholder;
        this.addNewCallback = addNewCallback;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'dual-list-container';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        // Left List (Current/Selected)
        const leftDiv = document.createElement('div');
        leftDiv.style.flex = '1';
        leftDiv.style.marginRight = '5px';

        const currentLabel = document.createElement('label');
        currentLabel.textContent = this.leftLabel;
        currentLabel.style.display = 'block';

        const currentSelect = document.createElement('select');
        currentSelect.multiple = this.multiSelectLeft;
        currentSelect.size = 5;
        currentSelect.style.width = '100%';
        currentSelect.setAttribute('data-list-context-index', this.contextIndex);
        currentSelect.setAttribute('data-field', this.leftField);

        this.currentOptions.forEach(opt => {
            currentSelect.appendChild(new Option(opt.text, opt.value));
        });

        leftDiv.appendChild(currentLabel);
        leftDiv.appendChild(currentSelect);

        // Buttons
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.flexDirection = 'column';
        buttonsDiv.style.alignItems = 'center';
        buttonsDiv.style.margin = '0 5px';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '&gt;';
        removeBtn.title = 'Remove selected item(s)';
        removeBtn.style.marginBottom = '5px';

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.innerHTML = '&lt;';
        addBtn.title = 'Add selected item(s)';

        buttonsDiv.appendChild(addBtn);
        buttonsDiv.appendChild(removeBtn);

        // Right List (Available)
        const rightDiv = document.createElement('div');
        rightDiv.style.flex = '1';
        rightDiv.style.marginLeft = '5px';

        const availableLabel = document.createElement('label');
        availableLabel.textContent = this.rightLabel;
        availableLabel.style.display = 'block';

        const availableSelect = document.createElement('select');
        availableSelect.multiple = true;
        availableSelect.size = 5;
        availableSelect.style.width = '100%';
        availableSelect.setAttribute('data-list-context-index', this.contextIndex);
        availableSelect.setAttribute('data-field', this.rightField);

        this.availableOptions.forEach(opt => {
            availableSelect.appendChild(new Option(opt.text, opt.value));
        });

        rightDiv.appendChild(availableLabel);
        rightDiv.appendChild(availableSelect);

        // Add New functionality
        if (this.allowAddNew && this.addNewCallback) {
            const addNewContainer = document.createElement('div');
            addNewContainer.style.marginTop = '5px';
            addNewContainer.style.display = 'flex';

            const addNewInput = document.createElement('input');
            addNewInput.type = 'text';
            addNewInput.placeholder = this.addNewPlaceholder;
            addNewInput.style.flexGrow = '1';
            addNewInput.style.marginRight = '5px';

            const addNewBtn = document.createElement('button');
            addNewBtn.type = 'button';
            addNewBtn.textContent = 'Add';

            addNewBtn.onclick = async (e) => {
                e.preventDefault();
                let result = this.addNewCallback(addNewInput.value);
                if (result instanceof Promise) {
                    result = await result;
                }
                const newItemData = result;

                if (newItemData && newItemData.value && newItemData.text) {
                    const exists = Array.from(availableSelect.options).some(opt => opt.value === newItemData.value) ||
                        Array.from(currentSelect.options).some(opt => opt.value === newItemData.value);

                    if (!exists) {
                        availableSelect.appendChild(new Option(newItemData.text, newItemData.value));
                    } else if (!newItemData.preventAdd) {
                        console.warn("Item already exists in lists:", newItemData.text);
                    }
                    addNewInput.value = '';
                } else if (newItemData && newItemData.preventAdd) {
                    addNewInput.value = '';
                }
            };

            addNewContainer.appendChild(addNewInput);
            addNewContainer.appendChild(addNewBtn);
            rightDiv.appendChild(addNewContainer);
        }

        // Button Event Handlers
        removeBtn.onclick = (e) => {
            e.preventDefault();
            Array.from(currentSelect.selectedOptions).forEach(option => {
                availableSelect.appendChild(option);
                this.moveCallback(option.value, 'remove', this.contextIndex);
            });
        };

        addBtn.onclick = (e) => {
            e.preventDefault();
            Array.from(availableSelect.selectedOptions).forEach(option => {
                if (!this.multiSelectLeft) {
                    // If single select, move existing items back to available
                    while (currentSelect.options.length > 0) {
                        let existingOption = currentSelect.options[0];
                        availableSelect.appendChild(existingOption);
                        this.moveCallback(existingOption.value, 'remove', this.contextIndex);
                    }
                }
                currentSelect.appendChild(option);
                this.moveCallback(option.value, 'add', this.contextIndex);
            });
        };

        container.appendChild(leftDiv);
        container.appendChild(buttonsDiv);
        container.appendChild(rightDiv);

        return container;
    }
}
