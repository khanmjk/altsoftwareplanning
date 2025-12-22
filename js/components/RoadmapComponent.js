/**
 * RoadmapComponent
 * Renders the visual roadmap grids (Quarterly View and 3-Year Plan).
 * Supports Drag & Drop for interactive planning.
 * 
 * Contract Compliance:
 * - No innerHTML for template creation (uses DOM APIs)
 * - Uses helper methods for element creation
 */
class RoadmapComponent {
    constructor(containerId, viewType) {
        this.containerId = containerId;
        this.viewType = viewType; // 'quarterly' or '3yp'
        this.draggedInitiativeId = null;
        // Initialize planning year from system data (first available year)
        this.planningYear = this._getDefaultPlanningYear();
    }

    /**
     * Get default planning year from system data
     */
    _getDefaultPlanningYear() {
        const system = SystemService.getCurrentSystem();
        if (!system || !system.yearlyInitiatives) {
            return new Date().getFullYear();
        }
        const years = [...new Set(
            system.yearlyInitiatives
                .map(init => init.attributes?.planningYear)
                .filter(Boolean)
        )].sort((a, b) => a - b);
        return years.length > 0 ? years[0] : new Date().getFullYear();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear container using DOM API
        this._clearElement(container);

        // Create filters container
        const filtersContainer = document.createElement('div');
        filtersContainer.id = 'roadmapTableFilters';
        filtersContainer.className = 'roadmap-toolbar-content';
        filtersContainer.style.marginBottom = '15px';
        container.appendChild(filtersContainer);

        // Create grid container
        const gridContainer = document.createElement('div');
        gridContainer.id = 'roadmapGridContainer';
        gridContainer.className = 'roadmap-grid-container';
        container.appendChild(gridContainer);

        this.renderFilters();
        this.renderGrid();
    }

    /**
     * Clears all children from an element
     * @param {HTMLElement} element
     */
    _clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    renderFilters() {
        const filtersContainer = document.getElementById('roadmapTableFilters');
        if (!filtersContainer) return;

        this._clearElement(filtersContainer);

        // 1. Year Filter
        const currentYear = new Date().getFullYear();
        if (!this.planningYear || this.planningYear === 'all') {
            this.planningYear = currentYear;
        }

        const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
        const yearOptions = years.map(y => ({ value: y.toString(), text: y.toString() }));

        const yearWrap = this._createFilterWrapper('Year:');
        this._yearSelect = new ThemedSelect({
            options: yearOptions,
            value: this.planningYear.toString(),
            id: 'roadmapYearFilter',
            onChange: (value) => {
                this.planningYear = parseInt(value);
                this.renderGrid();
            }
        });
        yearWrap.appendChild(this._yearSelect.render());
        filtersContainer.appendChild(yearWrap);

        // 2. Org Filter
        const orgOptions = [{ value: 'all', text: 'All Organizations' }];
        (SystemService.getCurrentSystem().seniorManagers || []).forEach(sm => {
            orgOptions.push({ value: sm.seniorManagerId, text: sm.seniorManagerName });
        });

        const orgWrap = this._createFilterWrapper('Org:');
        this._orgSelect = new ThemedSelect({
            options: orgOptions,
            value: 'all',
            id: 'roadmapOrgFilter',
            onChange: (value) => {
                this.updateTeamOptions(value);
                this.renderGrid();
            }
        });
        orgWrap.appendChild(this._orgSelect.render());
        filtersContainer.appendChild(orgWrap);

        // 3. Team Filter (will be populated by updateTeamOptions)
        const teamWrap = this._createFilterWrapper('Team:');
        teamWrap.id = 'roadmapTeamFilterContainer';
        filtersContainer.appendChild(teamWrap);

        // 4. Theme Filter
        const themeOptions = [{ value: 'all', text: 'All Themes' }];
        (SystemService.getCurrentSystem().definedThemes || []).forEach(t => {
            themeOptions.push({ value: t.themeId, text: t.name });
        });

        const themeWrap = this._createFilterWrapper('Theme:');
        this._themeSelect = new ThemedSelect({
            options: themeOptions,
            value: 'all',
            id: 'roadmapThemeFilter',
            onChange: () => this.renderGrid()
        });
        themeWrap.appendChild(this._themeSelect.render());
        filtersContainer.appendChild(themeWrap);

        // Initial Team Population
        this.updateTeamOptions('all');
    }

    /**
     * Create filter wrapper with label
     */
    _createFilterWrapper(labelText) {
        const wrapper = document.createElement('div');
        wrapper.className = 'roadmap-filter-group';

        const label = document.createElement('label');
        label.className = 'roadmap-filter-label';
        label.textContent = labelText;
        wrapper.appendChild(label);

        return wrapper;
    }

    updateTeamOptions(orgId) {
        const container = document.getElementById('roadmapTeamFilterContainer');
        if (!container) return;

        // Clear previous ThemedSelect
        const existingSelect = container.querySelector('.themed-select');
        if (existingSelect) {
            existingSelect.remove();
        }

        // Filter teams based on org selection
        let teams = SystemService.getCurrentSystem().teams || [];
        if (orgId !== 'all') {
            const validSdmIds = new Set();
            (SystemService.getCurrentSystem().sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgId) validSdmIds.add(sdm.sdmId);
            });
            teams = teams.filter(t => validSdmIds.has(t.sdmId));
        }

        // Build team options
        const teamOptions = [{ value: 'all', text: 'All Teams' }];
        teams.sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName))
            .forEach(t => {
                teamOptions.push({
                    value: t.teamId,
                    text: t.teamIdentity || t.teamName
                });
            });

        // Create new ThemedSelect
        this._teamSelect = new ThemedSelect({
            options: teamOptions,
            value: 'all',
            id: 'roadmapTeamFilter',
            onChange: () => this.renderGrid()
        });

        container.appendChild(this._teamSelect.render());
    }

    renderGrid() {
        const gridContainer = document.getElementById('roadmapGridContainer');
        if (!gridContainer) return;

        const data = this.prepareData();
        if (!data) {
            this._clearElement(gridContainer);
            const noDataMsg = document.createElement('div');
            noDataMsg.className = 'no-data-message';
            noDataMsg.textContent = 'No initiatives found for the selected criteria.';
            gridContainer.appendChild(noDataMsg);
            return;
        }

        if (this.viewType === 'quarterly') {
            this.renderQuarterlyGrid(gridContainer, data);
        } else if (this.viewType === '3yp') {
            this.render3YPGrid(gridContainer, data);
        }
    }

    prepareData() {
        // Collect Filter Values from ThemedSelect instances
        const orgFilter = this._orgSelect?.getValue() || 'all';
        const teamFilter = this._teamSelect?.getValue() || 'all';
        const yearFilter = this.planningYear || 'all';

        // Collect Theme Filters
        const themeFilter = this._themeSelect?.getValue() || 'all';
        const selectedThemes = themeFilter !== 'all' ? [themeFilter] : [];

        // Use RoadmapService for data retrieval
        const systemData = SystemService.getCurrentSystem();
        if (this.viewType === 'quarterly') {
            return RoadmapService.getQuarterlyRoadmapData({
                initiatives: systemData.yearlyInitiatives || [],
                sdms: systemData.sdms || [],
                teams: systemData.teams || [],
                definedThemes: systemData.definedThemes || [],
                filters: {
                    year: yearFilter,
                    orgId: orgFilter,
                    teamId: teamFilter,
                    themeIds: selectedThemes
                }
            });
        } else if (this.viewType === '3yp') {
            return RoadmapService.get3YearPlanData({
                initiatives: systemData.yearlyInitiatives || [],
                sdms: systemData.sdms || [],
                teams: systemData.teams || [],
                definedThemes: systemData.definedThemes || [],
                currentYear: new Date().getFullYear(),
                filters: {
                    orgId: orgFilter,
                    teamId: teamFilter,
                    themeIds: selectedThemes
                }
            });
        }
        return null;
    }

    /**
     * Creates a roadmap card element for an initiative
     * @param {Object} init - Initiative data
     * @returns {HTMLElement}
     */
    _createRoadmapCard(init) {
        const statusClass = this.getStatusClass(init.status);

        // Calculate pills data
        const sdeTotal = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0).toFixed(1);
        const themeNames = (init.themes || []).map(tid => {
            const t = SystemService.getCurrentSystem().definedThemes.find(th => th.themeId === tid);
            return t ? t.name : 'Uncategorized';
        }).join(', ') || 'Uncategorized';

        const teams = [...new Set((init.assignments || []).map(a => {
            const t = SystemService.getCurrentSystem().teams.find(tm => tm.teamId === a.teamId);
            return t ? (t.teamIdentity || t.teamName) : 'Unknown';
        }))];

        // Create card
        const card = document.createElement('div');
        card.className = `roadmap-card ${statusClass}`;
        card.draggable = true;
        card.dataset.id = init.initiativeId;

        // Card header with theme pill
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        const themePill = document.createElement('span');
        themePill.className = 'pill pill-theme';
        themePill.textContent = themeNames;
        cardHeader.appendChild(themePill);
        card.appendChild(cardHeader);

        // Card title
        const cardTitle = document.createElement('div');
        cardTitle.className = 'card-title';
        cardTitle.textContent = init.title;
        card.appendChild(cardTitle);

        // Card footer with pills
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';

        const cardPills = document.createElement('div');
        cardPills.className = 'card-pills';

        // Team pills
        teams.forEach(teamName => {
            const teamPill = document.createElement('span');
            teamPill.className = 'pill pill-team';
            teamPill.textContent = teamName;
            cardPills.appendChild(teamPill);
        });

        // SDE pill
        const sdePill = document.createElement('span');
        sdePill.className = 'pill pill-sde';
        sdePill.textContent = `${sdeTotal} SDE`;
        cardPills.appendChild(sdePill);

        cardFooter.appendChild(cardPills);
        card.appendChild(cardFooter);

        return card;
    }

    renderQuarterlyGrid(container, data) {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const quarterData = { Q1: [], Q2: [], Q3: [], Q4: [] };
        const processedIds = new Set();

        // Format Headers: Q1 '25
        const planningYear = this.planningYear || new Date().getFullYear();
        const shortYear = planningYear.toString().slice(-2);

        // Iterate through the theme-grouped data to flatten it
        Object.keys(data).forEach(theme => {
            quarters.forEach(q => {
                if (data[theme][q]) {
                    data[theme][q].forEach(init => {
                        if (!processedIds.has(init.initiativeId)) {
                            quarterData[q].push(init);
                            processedIds.add(init.initiativeId);
                        }
                    });
                }
            });
        });

        // Clear container
        this._clearElement(container);

        // Create grid structure
        const grid = document.createElement('div');
        grid.className = 'roadmap-grid quarterly-grid';

        // Header row
        const headerRow = document.createElement('div');
        headerRow.className = 'roadmap-header-row';
        quarters.forEach(q => {
            const headerCell = document.createElement('div');
            headerCell.className = `roadmap-header-cell quarter-header header-${q}`;
            headerCell.textContent = `${q} '${shortYear}`;
            headerRow.appendChild(headerCell);
        });
        grid.appendChild(headerRow);

        // Content row
        const contentRow = document.createElement('div');
        contentRow.className = 'roadmap-content-row';

        quarters.forEach(quarter => {
            const initiatives = quarterData[quarter];

            const cell = document.createElement('div');
            cell.className = `roadmap-quarter-cell column-${quarter}`;
            cell.dataset.quarter = quarter;

            initiatives.forEach(init => {
                cell.appendChild(this._createRoadmapCard(init));
            });

            contentRow.appendChild(cell);
        });

        grid.appendChild(contentRow);
        container.appendChild(grid);

        this.attachCardEventListeners(container);
        this.attachDragEventListeners(container);
    }

    render3YPGrid(container, data) {
        const columns = ['Current Year', 'Next Year', 'Future'];
        const currentYear = new Date().getFullYear();
        const columnLabels = {
            'Current Year': `${currentYear}`,
            'Next Year': `${currentYear + 1}`,
            'Future': `${currentYear + 2}+`
        };

        // Flatten data
        const gridData = { 'Current Year': [], 'Next Year': [], 'Future': [] };
        const processedIds = new Set();

        Object.keys(data).forEach(theme => {
            columns.forEach(col => {
                if (data[theme][col]) {
                    data[theme][col].forEach(init => {
                        if (!processedIds.has(init.initiativeId)) {
                            gridData[col].push(init);
                            processedIds.add(init.initiativeId);
                        }
                    });
                }
            });
        });

        // Clear container
        this._clearElement(container);

        // Create grid structure
        const grid = document.createElement('div');
        grid.className = 'roadmap-grid three-year-grid';

        // Header row
        const headerRow = document.createElement('div');
        headerRow.className = 'roadmap-header-row';
        columns.forEach(col => {
            const colClass = col.replace(/\s+/g, '-').toLowerCase();
            const headerCell = document.createElement('div');
            headerCell.className = `roadmap-header-cell header-${colClass}`;
            headerCell.textContent = columnLabels[col];
            headerRow.appendChild(headerCell);
        });
        grid.appendChild(headerRow);

        // Content row
        const contentRow = document.createElement('div');
        contentRow.className = 'roadmap-content-row';

        columns.forEach(col => {
            const initiatives = gridData[col];
            const colClass = col.replace(/\s+/g, '-').toLowerCase();

            const cell = document.createElement('div');
            cell.className = `roadmap-quarter-cell column-${colClass}`;
            cell.dataset.yearBucket = col;

            initiatives.forEach(init => {
                cell.appendChild(this._createRoadmapCard(init));
            });

            contentRow.appendChild(cell);
        });

        grid.appendChild(contentRow);
        container.appendChild(grid);

        this.attachCardEventListeners(container);
        this.attachDragEventListeners(container);
    }

    /**
     * Attach click event listener using event delegation for roadmap cards
     */
    attachCardEventListeners(container) {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.roadmap-card');
            if (card) {
                const initiativeId = card.dataset.id;
                if (!initiativeId) return;
                const roadmapView = navigationManager.getViewInstance('roadmapView');
                roadmapView.openModalForEdit(initiativeId);
            }
        });
    }

    /**
     * Attach drag event listeners using event delegation
     */
    attachDragEventListeners(container) {
        // Handle dragstart on cards
        container.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.roadmap-card');
            if (card) {
                const initiativeId = card.dataset.id;
                this.handleDragStart(e, initiativeId);
            }
        });

        // Handle dragover on quarter cells
        container.addEventListener('dragover', (e) => {
            const cell = e.target.closest('.roadmap-quarter-cell');
            if (cell) {
                e.preventDefault();
                cell.classList.add('drag-over');
            }
        });

        // Handle dragleave on quarter cells
        container.addEventListener('dragleave', (e) => {
            const cell = e.target.closest('.roadmap-quarter-cell');
            if (cell && !cell.contains(e.relatedTarget)) {
                cell.classList.remove('drag-over');
            }
        });

        // Handle drop on quarter cells
        container.addEventListener('drop', (e) => {
            const cell = e.target.closest('.roadmap-quarter-cell');
            if (cell) {
                const target = cell.dataset.quarter || cell.dataset.yearBucket;
                this.handleDrop(e, target);
            }
        });
    }

    getStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'backlog': return 'status-backlog';
            case 'defined': return 'status-defined';
            case 'in-progress': return 'status-in-progress';
            case 'completed': return 'status-completed';
            case 'at-risk': return 'status-at-risk';
            default: return 'status-default';
        }
    }

    // --- Drag & Drop Handlers ---

    handleDragStart(event, initiativeId) {
        this.draggedInitiativeId = initiativeId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', initiativeId);
        event.target.classList.add('dragging');
    }

    handleDrop(event, target) {
        event.preventDefault();
        document.querySelectorAll('.roadmap-quarter-cell').forEach(el => el.classList.remove('drag-over'));

        const initiativeId = this.draggedInitiativeId;
        if (!initiativeId) return;

        this.updateInitiative(initiativeId, target);
        this.draggedInitiativeId = null;
    }

    updateInitiative(initiativeId, target) {
        const initiativeIndex = SystemService.getCurrentSystem().yearlyInitiatives.findIndex(i => i.initiativeId === initiativeId);
        if (initiativeIndex === -1) return;

        const initiative = SystemService.getCurrentSystem().yearlyInitiatives[initiativeIndex];
        const title = initiative.title;
        const updates = {};
        let toastMessage = '';

        if (this.viewType === 'quarterly') {
            // Quarterly View Update
            const newQuarter = target;
            const oldQuarter = initiative.targetQuarter || RoadmapService.getQuarterFromDate(initiative.targetDueDate) || 'Backlog';

            updates.targetQuarter = newQuarter;

            const year = this.planningYear && this.planningYear !== 'all'
                ? parseInt(this.planningYear)
                : (initiative.attributes.planningYear || new Date().getFullYear());

            const newDueDate = RoadmapService.getEndDateForQuarter(newQuarter, year);
            if (newDueDate) updates.targetDueDate = newDueDate;

            toastMessage = `Moved "${title}" from ${oldQuarter} to ${newQuarter}`;

        } else if (this.viewType === '3yp') {
            // 3YP View Update
            const newBucket = target;
            const currentYear = new Date().getFullYear();
            let newYear;

            if (newBucket === 'Current Year') newYear = currentYear;
            else if (newBucket === 'Next Year') newYear = currentYear + 1;
            else if (newBucket === 'Future') newYear = currentYear + 2;

            updates.attributes = { ...(initiative.attributes || {}), planningYear: newYear };
            toastMessage = `Moved "${title}" to ${newYear}`;
        }

        // Use Service Layer for mutation
        const success = InitiativeService.updateInitiative(SystemService.getCurrentSystem(), initiativeId, updates);

        if (success) {
            SystemService.save();
            this.renderGrid();
            notificationManager.showToast(toastMessage, 'success');
        } else {
            notificationManager.showToast('Failed to update initiative.', 'error');
        }
    }

    generateToolbarControls() {
        // Return any specific controls for the toolbar if needed
        return document.createElement('div');
    }
}
