/**
 * RoadmapTableWidget Component
 * 
 * Displays Quarterly Roadmap and 3-Year Plan tables within DashboardView.
 * Refactored from roadmapTableView.js to use DOM creation pattern.
 */
class RoadmapTableWidget {
    constructor(containerId, type = 'quarterly') {
        this.containerId = containerId;
        this.type = type; // 'quarterly' or '3yp'
        this.container = null;
        this.filtersContainer = null;
        this.tableContainer = null;
        this.idSuffix = type === '3yp' ? '3YP' : '';
    }

    /**
     * Render the widget
     */
    render() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('RoadmapTableWidget: Container not found:', this.containerId);
            return;
        }

        // Clear container using DOM methods
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        // Create filters container
        this.filtersContainer = document.createElement('div');
        this.filtersContainer.id = 'roadmapTableFilters' + this.idSuffix;
        this.filtersContainer.style.marginBottom = '15px';
        this.container.appendChild(this.filtersContainer);

        // Create table container
        this.tableContainer = document.createElement('div');
        this.tableContainer.id = this.type === '3yp' ? 'threeYearPlanContainer' : 'quarterlyRoadmapContainer';
        this.tableContainer.className = this.type === '3yp' ? 'three-year-plan-container' : 'quarterly-roadmap-container';
        this.container.appendChild(this.tableContainer);

        // Create filter controls
        const filterControls = this.createFilterControls();
        this.filtersContainer.appendChild(filterControls);

        // Update team filter options
        this.updateTeamFilterOptions();

        // Render table
        this.renderTable();
    }

    /**
     * Create filter control elements
     */
    createFilterControls() {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '15px';
        container.style.alignItems = 'center';

        // Org Filter
        const orgFilter = this.createDropdownFilter(
            'roadmapOrgFilter' + this.idSuffix,
            'Org:',
            this.getOrgOptions()
        );
        orgFilter.querySelector('select').addEventListener('change', () => {
            this.updateTeamFilterOptions();
            this.renderTable();
        });
        container.appendChild(orgFilter);

        // Team Filter
        const teamFilter = this.createDropdownFilter(
            'roadmapTeamFilter' + this.idSuffix,
            'Team:',
            [{ value: 'all', label: 'All Teams' }]
        );
        teamFilter.querySelector('select').addEventListener('change', () => this.renderTable());
        container.appendChild(teamFilter);

        // Theme Filter (only for quarterly)
        if (this.type === 'quarterly') {
            const themeFilter = this.createThemeFilter();
            container.appendChild(themeFilter);
        }

        return container;
    }

    /**
     * Create a dropdown filter
     */
    createDropdownFilter(id, labelText, options) {
        const div = document.createElement('div');
        div.className = 'filter-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '5px';

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;
        label.style.fontWeight = '600';
        label.style.marginBottom = '0';
        div.appendChild(label);

        const select = document.createElement('select');
        select.id = id;
        select.className = 'form-select form-select-sm';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        div.appendChild(select);
        return div;
    }

    /**
     * Get org filter options
     */
    getOrgOptions() {
        const options = [{ value: 'all', label: 'All Organizations' }];
        const systemData = window.currentSystemData;

        (systemData?.seniorManagers || []).forEach(sm => {
            options.push({ value: sm.seniorManagerId, label: sm.seniorManagerName });
        });

        return options;
    }

    /**
     * Create theme multi-select filter
     */
    createThemeFilter() {
        const systemData = window.currentSystemData;
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-item';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '5px';

        const label = document.createElement('label');
        label.textContent = 'Theme:';
        label.style.fontWeight = '600';
        label.style.marginBottom = '0';
        wrapper.appendChild(label);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'custom-multiselect-dropdown';
        dropdownContainer.style.position = 'relative';

        const button = document.createElement('button');
        button.id = 'theme-dropdown-button' + this.idSuffix;
        button.className = 'dropdown-button btn btn-outline-secondary btn-sm';
        button.type = 'button';
        button.style.minWidth = '150px';
        button.style.textAlign = 'left';
        button.textContent = 'All Themes';

        const panel = document.createElement('div');
        panel.id = 'theme-dropdown-panel' + this.idSuffix;
        panel.className = 'dropdown-panel';
        panel.style.zIndex = '1000';

        // Select All
        const selectAllContainer = document.createElement('div');
        selectAllContainer.className = 'select-all-container';

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'theme-select-all' + this.idSuffix;
        selectAllCheckbox.checked = true;

        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = selectAllCheckbox.id;
        selectAllLabel.textContent = 'Select/Clear All';

        selectAllContainer.appendChild(selectAllCheckbox);
        selectAllContainer.appendChild(selectAllLabel);
        panel.appendChild(selectAllContainer);

        // Theme items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'dropdown-items-container';

        (systemData?.definedThemes || []).forEach(theme => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `theme_filter_${theme.themeId}${this.idSuffix}`;
            checkbox.value = theme.themeId;
            checkbox.className = 'theme-checkbox-item';
            checkbox.checked = true;

            const itemLabel = document.createElement('label');
            itemLabel.htmlFor = checkbox.id;
            itemLabel.textContent = theme.name;

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(itemLabel);
            itemsContainer.appendChild(itemDiv);
        });

        panel.appendChild(itemsContainer);
        dropdownContainer.appendChild(button);
        dropdownContainer.appendChild(panel);
        wrapper.appendChild(dropdownContainer);

        // Event handlers
        const updateButtonText = () => {
            const checked = panel.querySelectorAll('.theme-checkbox-item:checked');
            const total = panel.querySelectorAll('.theme-checkbox-item').length;

            if (checked.length === total || checked.length === 0) {
                button.textContent = 'All Themes';
                selectAllCheckbox.checked = checked.length === total;
                selectAllCheckbox.indeterminate = false;
            } else {
                button.textContent = `${checked.length} Theme(s) Selected`;
                selectAllCheckbox.indeterminate = true;
            }
        };

        const allCheckboxes = itemsContainer.querySelectorAll('.theme-checkbox-item');

        selectAllCheckbox.addEventListener('change', () => {
            allCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
            updateButtonText();
            this.renderTable();
        });

        allCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateButtonText();
                this.renderTable();
            });
        });

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                panel.classList.remove('show');
            }
        });

        return wrapper;
    }

    /**
     * Update team filter options based on org selection
     */
    updateTeamFilterOptions() {
        const orgFilter = document.getElementById('roadmapOrgFilter' + this.idSuffix);
        const teamSelect = document.getElementById('roadmapTeamFilter' + this.idSuffix);
        if (!teamSelect) return;

        const orgValue = orgFilter?.value || 'all';
        const systemData = window.currentSystemData;

        // Clear existing options
        while (teamSelect.firstChild) {
            teamSelect.removeChild(teamSelect.firstChild);
        }

        // Add "All Teams" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Teams';
        teamSelect.appendChild(allOption);

        // Get teams to show
        let teamsToShow = [];
        if (orgValue === 'all') {
            teamsToShow = systemData?.teams || [];
        } else {
            const teamsInOrg = new Set();
            (systemData?.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgValue) {
                    (systemData?.teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) {
                            teamsInOrg.add(team);
                        }
                    });
                }
            });
            teamsToShow = Array.from(teamsInOrg);
        }

        // Add team options
        teamsToShow
            .sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName))
            .forEach(team => {
                const option = document.createElement('option');
                option.value = team.teamId;
                option.textContent = team.teamIdentity || team.teamName;
                teamSelect.appendChild(option);
            });
    }

    /**
     * Render the table based on type
     */
    renderTable() {
        if (this.type === '3yp') {
            this.render3YPTable();
        } else {
            this.renderQuarterlyTable();
        }
    }

    /**
     * Get filtered initiatives based on current filter selections
     */
    getFilteredInitiatives() {
        const systemData = window.currentSystemData;
        const orgFilter = document.getElementById('roadmapOrgFilter' + this.idSuffix)?.value || 'all';
        const teamFilter = document.getElementById('roadmapTeamFilter' + this.idSuffix)?.value || 'all';
        const yearFilter = window.dashboardPlanningYear;

        let initiatives = systemData?.yearlyInitiatives || [];

        // Year filter (only for quarterly)
        if (this.type === 'quarterly' && yearFilter !== 'all') {
            initiatives = initiatives.filter(init => init.attributes.planningYear == yearFilter);
        }

        // Org filter
        if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (systemData?.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (systemData?.teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                    });
                }
            });
            initiatives = initiatives.filter(init =>
                (init.assignments || []).some(a => teamsInOrg.has(a.teamId))
            );
        }

        // Team filter
        if (teamFilter !== 'all') {
            initiatives = initiatives.filter(init =>
                (init.assignments || []).some(a => a.teamId === teamFilter)
            );
        }

        // Theme filter
        const themePanel = document.getElementById('theme-dropdown-panel' + this.idSuffix);
        if (themePanel) {
            const selectedThemes = Array.from(
                themePanel.querySelectorAll('.theme-checkbox-item:checked')
            ).map(cb => cb.value);

            const allThemeIds = (systemData?.definedThemes || []).map(t => t.themeId);

            if (selectedThemes.length < allThemeIds.length) {
                initiatives = initiatives.filter(init => {
                    const initThemes = init.themes || [];
                    if (initThemes.length === 0) return false;
                    return initThemes.some(tid => selectedThemes.includes(tid));
                });
            }
        }

        return initiatives;
    }

    /**
     * Render quarterly roadmap table
     */
    renderQuarterlyTable() {
        if (!this.tableContainer) return;

        // Clear container
        while (this.tableContainer.firstChild) {
            this.tableContainer.removeChild(this.tableContainer.firstChild);
        }

        const systemData = window.currentSystemData;
        const initiatives = this.getFilteredInitiatives();
        const themeMap = new Map((systemData?.definedThemes || []).map(t => [t.themeId, t.name]));

        // Group by theme and quarter
        const roadmapData = {};
        initiatives.forEach(init => {
            const quarter = this.getQuarterFromDate(init.targetDueDate);
            if (!quarter) return;

            const themes = init.themes?.length > 0 ? init.themes : ['uncategorized'];
            themes.forEach(themeId => {
                const themeName = themeMap.get(themeId) || 'Uncategorized';
                if (!roadmapData[themeName]) {
                    roadmapData[themeName] = { Q1: [], Q2: [], Q3: [], Q4: [] };
                }
                roadmapData[themeName][quarter].push(init);
            });
        });

        const themes = Object.keys(roadmapData).sort();

        if (themes.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'roadmap-table-view__empty';
            emptyMsg.textContent = 'No initiatives match the current filter criteria.';
            this.tableContainer.appendChild(emptyMsg);
            return;
        }

        // Build table using DOM
        const table = this.buildTable(
            ['Theme', 'Q1', 'Q2', 'Q3', 'Q4'],
            themes.map(themeName => ({
                themeName,
                columns: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => roadmapData[themeName][q] || [])
            }))
        );

        this.tableContainer.appendChild(table);
    }

    /**
     * Render 3-Year Plan table
     */
    render3YPTable() {
        if (!this.tableContainer) return;

        // Clear container
        while (this.tableContainer.firstChild) {
            this.tableContainer.removeChild(this.tableContainer.firstChild);
        }

        const systemData = window.currentSystemData;
        const initiatives = this.getFilteredInitiatives();
        const themeMap = new Map((systemData?.definedThemes || []).map(t => [t.themeId, t.name]));
        const currentYear = new Date().getFullYear();

        // Group by theme and year bucket
        const roadmapData = {};
        initiatives.forEach(init => {
            const planningYear = init.attributes?.planningYear;
            if (!planningYear) return;

            let yearBucket;
            if (planningYear === currentYear) yearBucket = 'Current Year';
            else if (planningYear === currentYear + 1) yearBucket = 'Next Year';
            else if (planningYear > currentYear + 1) yearBucket = 'Future';
            else return;

            const themes = init.themes?.length > 0 ? init.themes : ['uncategorized'];
            themes.forEach(themeId => {
                const themeName = themeMap.get(themeId) || 'Uncategorized';
                if (!roadmapData[themeName]) {
                    roadmapData[themeName] = { 'Current Year': [], 'Next Year': [], 'Future': [] };
                }
                roadmapData[themeName][yearBucket].push(init);
            });
        });

        const themes = Object.keys(roadmapData).sort();

        if (themes.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'roadmap-table-view__empty';
            emptyMsg.textContent = 'No initiatives match the current filter criteria for the 3YP view.';
            this.tableContainer.appendChild(emptyMsg);
            return;
        }

        // Build table using DOM
        const table = this.buildTable(
            ['Theme', `Current Year (${currentYear})`, `Next Year (${currentYear + 1})`, `Future (${currentYear + 2}+)`],
            themes.map(themeName => ({
                themeName,
                columns: ['Current Year', 'Next Year', 'Future'].map(bucket => roadmapData[themeName][bucket] || [])
            }))
        );

        this.tableContainer.appendChild(table);
    }

    /**
     * Build table element with DOM creation
     */
    buildTable(headers, rows) {
        const table = document.createElement('table');
        table.className = 'quarterly-roadmap-table';

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        const orgFilter = document.getElementById('roadmapOrgFilter' + this.idSuffix)?.value || 'all';
        const teamFilter = document.getElementById('roadmapTeamFilter' + this.idSuffix)?.value || 'all';

        rows.forEach(row => {
            const tr = document.createElement('tr');

            // Theme cell
            const themeCell = document.createElement('td');
            themeCell.className = 'theme-cell';
            themeCell.textContent = row.themeName;
            tr.appendChild(themeCell);

            // Quarter/Year cells
            row.columns.forEach(initiatives => {
                const td = document.createElement('td');
                const cellDiv = document.createElement('div');
                cellDiv.className = 'quarter-cell';

                initiatives.forEach(init => {
                    const card = this.createInitiativeCard(init, orgFilter, teamFilter);
                    cellDiv.appendChild(card);
                });

                td.appendChild(cellDiv);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        return table;
    }

    /**
     * Create initiative card element
     */
    createInitiativeCard(init, orgFilter, teamFilter) {
        const systemData = window.currentSystemData;
        const card = document.createElement('div');
        const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(/\s+/g, '-')}`;
        card.className = `initiative-card ${statusClass}`;
        card.title = init.description || init.title;
        card.dataset.initiativeId = init.initiativeId;

        // Title
        const title = document.createElement('div');
        title.className = 'initiative-title';
        title.textContent = init.title;
        card.appendChild(title);

        // SDE display
        const totalSde = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
        const sdeDiv = document.createElement('div');
        sdeDiv.className = 'initiative-sde';

        if (teamFilter !== 'all') {
            const team = systemData?.teams?.find(t => t.teamId === teamFilter);
            const teamName = team ? (team.teamIdentity || team.teamName) : 'Team';
            const teamAssignment = (init.assignments || []).find(a => a.teamId === teamFilter);
            const teamSde = teamAssignment ? (teamAssignment.sdeYears || 0) : 0;
            sdeDiv.textContent = `${teamName}: ${teamSde.toFixed(2)} of ${totalSde.toFixed(2)} SDEs`;
        } else if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (systemData?.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (systemData?.teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                    });
                }
            });
            const orgAssignments = (init.assignments || []).filter(a => teamsInOrg.has(a.teamId));
            const orgSde = orgAssignments.reduce((sum, a) => sum + (a.sdeYears || 0), 0);
            sdeDiv.textContent = `Org Total: ${orgSde.toFixed(2)} of ${totalSde.toFixed(2)} SDEs`;
        } else {
            sdeDiv.textContent = `(${totalSde.toFixed(2)} SDEs)`;
        }

        card.appendChild(sdeDiv);

        // Click handler
        card.addEventListener('click', () => {
            if (typeof window.openRoadmapModalForEdit === 'function') {
                window.openRoadmapModalForEdit(init.initiativeId);
            }
        });

        return card;
    }

    /**
     * Get quarter from date string
     */
    getQuarterFromDate(dateString) {
        if (!dateString) return null;
        try {
            const month = parseInt(dateString.substring(5, 7), 10);
            if (month >= 1 && month <= 3) return 'Q1';
            if (month >= 4 && month <= 6) return 'Q2';
            if (month >= 7 && month <= 9) return 'Q3';
            if (month >= 10 && month <= 12) return 'Q4';
            return null;
        } catch (e) {
            return null;
        }
    }
}

// Export to window
if (typeof window !== 'undefined') {
    window.RoadmapTableWidget = RoadmapTableWidget;
}
