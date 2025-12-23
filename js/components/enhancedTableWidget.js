// js/components/enhancedTableWidget.js

/**
 * EnhancedTableWidget
 * A reusable table component that wraps Tabulator to provide a consistent
 * UX with integrated controls for column visibility and data export.
 */
class EnhancedTableWidget {
    constructor(targetElementOrId, options = {}) {
        if (!targetElementOrId) {
            console.error("EnhancedTableWidget: Target element or ID is required.");
            return;
        }

        this.targetElement = typeof targetElementOrId === 'string' ?
            document.getElementById(targetElementOrId) :
            targetElementOrId;

        if (!this.targetElement) {
            console.error(`EnhancedTableWidget: Target element "${targetElementOrId}" not found in the DOM.`);
            return;
        }

        // Default options merged with user-provided options
        this.options = {
            data: [],
            columns: [],
            uniqueIdField: 'id', // Default unique ID field in data objects for Tabulator
            layout: "fitColumns",
            responsiveLayout: "hide", // "hide" or "collapse"
            pagination: "local",
            paginationSize: 25,
            paginationSizeSelector: [10, 25, 50, 100, 250],
            movableColumns: true,
            initialSort: [], // e.g., [{column:"name", dir:"asc"}]
            headerVisible: true, // Tabulator's own header for column titles
            placeholder: "No Data Available",
            // Widget-specific options
            showColumnToggle: true,
            showExportMenu: true,
            exportCsvFileName: 'table_data.csv',
            exportJsonFileName: 'table_data.json',
            exportXlsxFileName: 'table_data.xlsx',
            exportSheetName: 'Sheet1',
            // Callbacks
            cellEdited: null, // User-defined callback: function(cellComponent) {}
            // ... other potential Tabulator options or widget options ...
            ...options
        };

        this.tabulatorInstance = null;
        this.widgetContainer = null;
        this.controlsDiv = null;
        this.columnVisibilityDropdown = null;
        this.exportDropdown = null;

        this._buildWidgetShell();
        this._initTabulator();
    }

    /**
     * Creates the main DOM structure for the widget (controls area, Tabulator container).
     */
    _buildWidgetShell() {
        this._clearElement(this.targetElement);

        this.widgetContainer = document.createElement('div');
        this.widgetContainer.className = 'enhanced-table-widget'; // For overall widget styling

        // Create and append controls area if needed
        if (this.options.showColumnToggle || this.options.showExportMenu) {
            this._createControlsArea();
            this.widgetContainer.appendChild(this.controlsDiv);
        }

        // Create div for Tabulator to attach to
        const tabulatorHostDiv = document.createElement('div');
        // Tabulator will be initialized on this div
        this.widgetContainer.appendChild(tabulatorHostDiv);

        this.targetElement.appendChild(this.widgetContainer);
        this.tabulatorHostDiv = tabulatorHostDiv; // Store reference for Tabulator init
    }

    /**
     * Initializes the Tabulator instance.
     */
    _initTabulator() {
        if (!this.tabulatorHostDiv) {
            console.error("EnhancedTableWidget: Tabulator host div not found for initialization.");
            return;
        }
        try {
            this.tabulatorInstance = new Tabulator(this.tabulatorHostDiv, {
                data: this.options.data,
                columns: this.options.columns,
                layout: this.options.layout,
                responsiveLayout: this.options.responsiveLayout,
                pagination: this.options.pagination,
                paginationSize: this.options.paginationSize,
                paginationSizeSelector: this.options.paginationSizeSelector,
                movableColumns: this.options.movableColumns,
                initialSort: this.options.initialSort,
                headerVisible: this.options.headerVisible,
                index: this.options.uniqueIdField,
                placeholder: this.options.placeholder,
                cellEdited: (cell) => { // Tabulator's cell component
                    if (typeof this.options.cellEdited === 'function') {
                        this.options.cellEdited(cell);
                    }
                },
                // Spread any other Tabulator-specific options from this.options
                // Be careful not to pass widget-specific options that Tabulator doesn't understand.

                // Event callbacks for conditional pagination
                dataLoaded: (data) => {
                    this._updatePaginationVisibility();
                    if (typeof this.options.dataLoaded === 'function') this.options.dataLoaded(data);
                },
                pageLoaded: (pageno) => {
                    this._updatePaginationVisibility();
                    if (typeof this.options.pageLoaded === 'function') this.options.pageLoaded(pageno);
                },
                tableBuilt: () => {
                    this._updatePaginationVisibility();
                    if (typeof this.options.tableBuilt === 'function') this.options.tableBuilt();
                }
            });
        } catch (error) {
            console.error("EnhancedTableWidget: Error initializing Tabulator:", error);
            this.tabulatorHostDiv.textContent = "Error initializing table.";
        }
    }

    /**
     * Hides the pagination footer if data fits on a single page.
     */
    _updatePaginationVisibility() {
        if (!this.tabulatorInstance) return;

        const footer = this.tabulatorHostDiv.querySelector('.tabulator-footer');
        if (!footer) return;

        // Check if we have active pagination
        const pageSize = this.tabulatorInstance.getPageSize();
        // getDataCount("active") returns filtered data count
        const totalRows = this.tabulatorInstance.getDataCount("active");

        if (totalRows <= pageSize) {
            footer.classList.add('is-hidden');
        } else {
            footer.classList.remove('is-hidden');
        }
    }


    /**
     * Creates the controls area with gear and export icons.
     */
    _createControlsArea() {
        this.controlsDiv = document.createElement('div');
        this.controlsDiv.className = 'etw-controls-area'; // Use class for styling

        if (this.options.showColumnToggle) {
            const gearButton = document.createElement('button');
            this._appendIcon(gearButton, 'fas fa-cog');
            gearButton.title = 'Show/Hide Columns';
            gearButton.className = 'etw-control-button etw-column-toggle-button';
            gearButton.type = 'button';
            gearButton.onclick = (event) => {
                event.stopPropagation(); // Prevent click-outside-to-close if dropdown is already open
                this._toggleColumnVisibilityDropdown(gearButton);
            };
            this.controlsDiv.appendChild(gearButton);
        }

        if (this.options.showExportMenu) {
            const exportButton = document.createElement('button');
            this._appendIcon(exportButton, 'fas fa-download');
            exportButton.title = 'Export Data';
            exportButton.className = 'etw-control-button etw-export-button';
            exportButton.type = 'button';
            exportButton.onclick = (event) => {
                event.stopPropagation();
                this._toggleExportDropdown(exportButton);
            };
            this.controlsDiv.appendChild(exportButton);
        }
    }

    _appendIcon(button, iconClass) {
        if (!button) return;
        const icon = document.createElement('i');
        icon.className = iconClass;
        button.appendChild(icon);
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * Toggles and populates the column visibility dropdown.
     * @param {HTMLElement} buttonElement - The button that triggered the dropdown.
     */
    _toggleColumnVisibilityDropdown(buttonElement) {
        if (!this.tabulatorInstance) return;

        // Remove existing dropdown if any
        if (this.columnVisibilityDropdown && this.columnVisibilityDropdown.parentNode) {
            this.columnVisibilityDropdown.remove();
            // If it was the same button click, just close it
            if (this.columnVisibilityDropdown._trigger === buttonElement) {
                this.columnVisibilityDropdown = null;
                return;
            }
        }
        this.columnVisibilityDropdown = null; // Reset


        this.columnVisibilityDropdown = document.createElement('div');
        this.columnVisibilityDropdown.className = 'etw-dropdown etw-column-visibility-dropdown';
        this.columnVisibilityDropdown._trigger = buttonElement; // Store trigger

        this.tabulatorInstance.getColumns().forEach(column => {
            const colDef = column.getDefinition();
            // Only include columns that have a title and a field (i.e., actual data columns)
            if (colDef.title && colDef.field) {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = column.isVisible();
                checkbox.onchange = () => column.toggle();
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` ${colDef.title}`));
                this.columnVisibilityDropdown.appendChild(label);
            }
        });

        this._displayDropdown(this.columnVisibilityDropdown, buttonElement);
    }

    /**
     * Toggles and populates the export options dropdown.
     * @param {HTMLElement} buttonElement - The button that triggered the dropdown.
     */
    _toggleExportDropdown(buttonElement) {
        if (!this.tabulatorInstance) return;

        if (this.exportDropdown && this.exportDropdown.parentNode) {
            this.exportDropdown.remove();
            if (this.exportDropdown._trigger === buttonElement) {
                this.exportDropdown = null;
                return;
            }
        }
        this.exportDropdown = null;

        this.exportDropdown = document.createElement('div');
        this.exportDropdown.className = 'etw-dropdown etw-export-dropdown';
        this.exportDropdown._trigger = buttonElement;

        const createExportOption = (text, format, fileName) => {
            const item = document.createElement('div');
            item.textContent = text;
            item.onclick = () => {
                try {
                    if (format === "xlsx" && typeof XLSX === 'undefined') {
                        notificationManager.showToast("XLSX export requires the SheetJS library (xlsx.full.min.js) to be included.", "error");
                        console.warn("SheetJS library not found for XLSX export.");
                        return;
                    }
                    this.tabulatorInstance.download(format, fileName, format === "xlsx" ? { sheetName: this.options.exportSheetName } : undefined);
                } catch (e) {
                    console.error(`Error downloading as ${format}:`, e);
                    notificationManager.showToast(`Could not download as ${format}. Check console for details.`, "error");
                }
                if (this.exportDropdown) this.exportDropdown.remove(); // Close dropdown after action
                this.exportDropdown = null;
            };
            this.exportDropdown.appendChild(item);
        };

        createExportOption('CSV', 'csv', this.options.exportCsvFileName);
        createExportOption('JSON', 'json', this.options.exportJsonFileName);
        // Conditionally add XLSX if SheetJS library is loaded (basic check)
        if (typeof XLSX !== 'undefined' || this.options.forceXlsxExportOption) { // Added force option for testing
            createExportOption('XLSX (Excel)', 'xlsx', this.options.exportXlsxFileName);
        }


        this._displayDropdown(this.exportDropdown, buttonElement);
    }

    /**
     * Helper to display a dropdown menu relative to a button.
     * Includes click-outside-to-close behavior.
     * @param {HTMLElement} dropdownElement - The dropdown div to display.
     * @param {HTMLElement} buttonElement - The button that triggered the dropdown.
     */
    _displayDropdown(dropdownElement, buttonElement) {
        // Append to the controls area for positioning context if controlsDiv exists, otherwise to widget container
        const parentForDropdown = this.controlsDiv || this.widgetContainer;
        parentForDropdown.appendChild(dropdownElement); // Append first to calculate position correctly if needed

        // Basic positioning (can be enhanced with more precise calculations)
        if (typeof styleVars !== 'undefined' && styleVars.set) {
            styleVars.set(dropdownElement, {
                '--etw-dropdown-top': `${buttonElement.offsetTop + buttonElement.offsetHeight}px`,
                '--etw-dropdown-right': `${parentForDropdown.offsetWidth - (buttonElement.offsetLeft + buttonElement.offsetWidth)}px`
            });
        }
        dropdownElement.classList.add('etw-dropdown--open');

        // Click outside to close
        const clickOutsideHandler = (event) => {
            if (!dropdownElement.contains(event.target) && event.target !== buttonElement) {
                if (dropdownElement.parentNode) {
                    dropdownElement.remove();
                }
                if (dropdownElement === this.columnVisibilityDropdown) this.columnVisibilityDropdown = null;
                if (dropdownElement === this.exportDropdown) this.exportDropdown = null;
                document.removeEventListener('click', clickOutsideHandler, true);
            }
        };

        // Use setTimeout to ensure the current click event (that opened the dropdown)
        // doesn't immediately trigger the clickOutsideHandler.
        setTimeout(() => {
            document.addEventListener('click', clickOutsideHandler, true);
        }, 0);
    }


    // --- Public API ---

    /**
     * Replaces all data in the table.
     * @param {Array<Object>} data - The new array of data objects.
     */
    setData(data) {
        this.options.data = data;
        if (this.tabulatorInstance) {
            this.tabulatorInstance.replaceData(data)
                .then(() => console.log("EnhancedTableWidget: Data replaced successfully."))
                .catch(err => console.error("EnhancedTableWidget: Error replacing data:", err));
        } else {
            // If Tabulator wasn't initialized (e.g., target div wasn't ready), try again.
            this._initTabulator();
        }
    }

    /**
     * Updates specific row data in the table.
     * @param {string|number} id - The unique ID of the row to update.
     * @param {Object} data - An object containing the fields to update.
     */
    updateRow(id, data) {
        if (this.tabulatorInstance) {
            this.tabulatorInstance.updateData([{ [this.options.uniqueIdField]: id, ...data }])
                .then(() => console.log(`EnhancedTableWidget: Row ${id} updated.`))
                .catch(err => console.error(`EnhancedTableWidget: Error updating row ${id}:`, err));
        }
    }

    /**
     * Adds a new row to the table.
     * @param {Object} data - The data object for the new row.
     * @param {boolean} [atTop=false] - Whether to add the row to the top or bottom.
     * @param {(string|number)} [nearRowId] - ID of an existing row to add the new row near.
     */
    addRow(data, atTop = false, nearRowId = undefined) {
        if (this.tabulatorInstance) {
            this.tabulatorInstance.addData([data], atTop, nearRowId)
                .then((rows) => console.log("EnhancedTableWidget: Row added.", rows[0].getData()))
                .catch(err => console.error("EnhancedTableWidget: Error adding row:", err));
        }
    }

    /**
     * Deletes a row from the table.
     * @param {string|number} id - The unique ID of the row to delete.
     */
    deleteRow(id) {
        if (this.tabulatorInstance) {
            this.tabulatorInstance.deleteRow(id)
                .then(() => console.log(`EnhancedTableWidget: Row ${id} deleted.`))
                .catch(err => console.error(`EnhancedTableWidget: Error deleting row ${id}:`, err));
        }
    }


    /**
     * Destroys the Tabulator instance and cleans up the widget's DOM elements.
     */
    destroy() {
        if (this.tabulatorInstance) {
            try {
                this.tabulatorInstance.destroy();
            } catch (e) {
                console.warn("EnhancedTableWidget: Error during Tabulator instance destruction:", e);
            }
            this.tabulatorInstance = null;
        }
        if (this.widgetContainer && this.widgetContainer.parentNode) {
            this.widgetContainer.remove();
        }
        this.widgetContainer = null;
        this.controlsDiv = null;
        this.columnVisibilityDropdown = null;
        this.exportDropdown = null;
        console.log(`EnhancedTableWidget destroyed for target: ${this.targetElement ? this.targetElement.id : 'unknown'}`);
    }
}
