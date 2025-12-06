/**
 * YearPlanningView.js
 * 
 * Class-based Year Planning view for the Workspace Canvas.
 * Compliant with docs/workspace-canvas-contract.md v2.0
 * 
 * Features:
 * - Drag-drop initiative reordering
 * - Real-time ATL/BTL calculation
 * - Team Load Summary synchronization
 * - AI optimizer integration
 */

class YearPlanningView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentYear = new Date().getFullYear();
        this.scenario = 'effective'; // 'funded' | 'team_bis' | 'effective'
        this.applyConstraints = false;

        // Cached calculated data
        this.summaryData = null;
        this.tableData = null;

        // Drag state
        this.draggedInitiativeId = null;
        this.draggedRowElement = null;

        // UI state
        this.isSummaryExpanded = window.isSummaryTableExpanded || false;
    }

    /**
     * Main render function - called by NavigationManager
     */
    render() {
        if (!this.container) {
            console.error("YearPlanningView: Container not found");
            return;
        }

        // Ensure capacity metrics are fresh
        this.refreshCapacityMetrics();

        // 1. Set Workspace Metadata
        this.setPageMetadata();

        // 2. Set Toolbar
        this.setToolbar();

        // 3. Render Content
        this.renderLayout();

        // 4. Ensure data consistency
        this.ensureDataConsistency();

        // 5. Calculate and render tables
        this.summaryData = this.calculateSummaryData();
        this.renderSummaryTable(this.summaryData);

        this.tableData = this.calculateTableData();
        this.renderPlanningTable(this.tableData);

        console.log("YearPlanningView: Render complete");
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        const atlInitiatives = (this.tableData || []).filter(i => !i.isBTL);
        const btlInitiatives = (this.tableData || []).filter(i => i.isBTL);

        return {
            viewTitle: 'Year Plan',
            planningYear: this.currentYear,
            scenario: this.scenario,
            constraintsEnabled: this.applyConstraints,
            teamLoadSummary: this.summaryData,
            planningTable: this.tableData,
            // Summary metrics for quick AI access
            atlInitiativeCount: atlInitiatives.length,
            btlInitiativeCount: btlInitiatives.length,
            totalSdeYears: atlInitiatives.reduce((sum, i) => sum + (i.calculatedInitiativeTotalSde || 0), 0)
        };
    }

    /**
     * Refresh capacity metrics before rendering
     */
    refreshCapacityMetrics() {
        if (window.currentSystemData) {
            const capacityEngine = new CapacityEngine(window.currentSystemData);
            window.currentSystemData.calculatedCapacityMetrics = capacityEngine.calculateAllMetrics();
        }
    }

    /**
     * Set workspace page metadata (header)
     * NOTE: Actions moved to toolbar per Workspace Canvas UX pattern
     */
    setPageMetadata() {
        if (!window.workspaceComponent) return;

        window.workspaceComponent.setPageMetadata({
            title: 'Year Plan',
            breadcrumbs: ['Planning', 'Year Plan'],
            actions: [] // Actions in toolbar, not header
        });
    }

    /**
     * Set workspace toolbar
     */
    setToolbar() {
        if (!window.workspaceComponent) return;
        const toolbar = this.generateToolbar();
        window.workspaceComponent.setToolbar(toolbar);
    }

    /**
     * Generate toolbar controls
     * @returns {HTMLElement}
     */
    generateToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'planning-toolbar';

        // Left side - controls
        const leftGroup = document.createElement('div');
        leftGroup.style.display = 'flex';
        leftGroup.style.alignItems = 'center';
        leftGroup.style.gap = '20px';

        // Year Selector
        leftGroup.appendChild(this.createYearSelector());

        // Scenario Controls
        const scenarioGroup = this.createScenarioControls();
        if (scenarioGroup) leftGroup.appendChild(scenarioGroup);

        toolbar.appendChild(leftGroup);

        // Right side - actions
        const rightGroup = document.createElement('div');
        rightGroup.style.display = 'flex';
        rightGroup.style.alignItems = 'center';
        rightGroup.style.gap = '10px';
        rightGroup.style.marginLeft = 'auto';

        // Constraints Toggle
        const toggleGroup = this.createConstraintsToggle();
        if (toggleGroup) rightGroup.appendChild(toggleGroup);

        // Save Plan Button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-danger btn-sm';
        saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Plan for ${this.currentYear}`;
        saveBtn.addEventListener('click', () => this.handleSavePlan());
        rightGroup.appendChild(saveBtn);

        // Optimize Button (AI-enabled only)
        if (window.globalSettings?.ai?.isEnabled) {
            const optimizeBtn = document.createElement('button');
            optimizeBtn.className = 'btn btn-info btn-sm';
            optimizeBtn.innerHTML = '<i class="fas fa-robot"></i> Optimize Plan';
            optimizeBtn.addEventListener('click', () => this.runOptimizer());
            rightGroup.appendChild(optimizeBtn);
        }

        toolbar.appendChild(rightGroup);

        return toolbar;
    }

    /**
     * Create year selector dropdown
     */
    createYearSelector() {
        const calendarYear = new Date().getFullYear();
        let availableYears = this.getAvailableYears();

        const yearGroup = document.createElement('div');
        yearGroup.style.display = 'flex';
        yearGroup.style.alignItems = 'center';
        yearGroup.style.gap = '8px';

        const yearLabel = document.createElement('strong');
        yearLabel.textContent = 'Planning Year:';
        yearGroup.appendChild(yearLabel);

        const yearSelect = document.createElement('select');
        yearSelect.className = 'form-select form-select-sm';
        yearSelect.style.padding = '4px 8px';
        yearSelect.style.borderRadius = '4px';
        yearSelect.addEventListener('change', (e) => this.setYear(parseInt(e.target.value)));

        availableYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === this.currentYear) option.selected = true;
            yearSelect.appendChild(option);
        });

        yearGroup.appendChild(yearSelect);
        return yearGroup;
    }

    /**
     * Get available planning years from initiatives
     */
    getAvailableYears() {
        const calendarYear = new Date().getFullYear();
        let availableYears = [];

        const initiatives = window.currentSystemData?.yearlyInitiatives || [];
        if (initiatives.length > 0) {
            const yearsFromData = new Set(
                initiatives.map(init => init.attributes?.planningYear).filter(Boolean)
            );
            availableYears = Array.from(yearsFromData);
        }

        if (!availableYears.includes(calendarYear)) availableYears.push(calendarYear);
        availableYears.sort((a, b) => a - b);

        if (!availableYears.includes(this.currentYear)) {
            this.currentYear = availableYears.includes(calendarYear) ? calendarYear : availableYears[0];
        }

        return availableYears;
    }

    /**
     * Create scenario toggle buttons
     */
    createScenarioControls() {
        const metrics = window.currentSystemData?.calculatedCapacityMetrics;
        if (!metrics) return null;

        const scenarioGroup = document.createElement('div');
        scenarioGroup.style.display = 'flex';
        scenarioGroup.style.alignItems = 'center';
        scenarioGroup.style.gap = '8px';

        const label = document.createElement('strong');
        label.textContent = 'Calculate ATL/BTL using:';
        scenarioGroup.appendChild(label);

        const scenarios = [
            { id: 'effective', label: 'Effective BIS', key: 'EffectiveBIS' },
            { id: 'team_bis', label: 'Team BIS', key: 'TeamBIS' },
            { id: 'funded', label: 'Funded HC', key: 'FundedHC' }
        ];

        scenarios.forEach(sc => {
            const btn = document.createElement('button');
            btn.textContent = sc.label;
            btn.className = `btn btn-sm ${this.scenario === sc.id ? 'btn-primary' : 'btn-light'}`;
            btn.style.border = '1px solid #ccc';
            if (this.scenario === sc.id) {
                btn.style.backgroundColor = '#007bff';
                btn.style.color = 'white';
            }

            const scMetrics = metrics.totals?.[sc.key];
            if (scMetrics) {
                btn.title = `Gross: ${scMetrics.grossYrs.toFixed(2)}, Net: ${scMetrics.netYrs.toFixed(2)}`;
            }

            btn.addEventListener('click', () => this.setScenario(sc.id));
            scenarioGroup.appendChild(btn);
        });

        return scenarioGroup;
    }

    /**
     * Create constraints toggle checkbox
     */
    createConstraintsToggle() {
        const metrics = window.currentSystemData?.calculatedCapacityMetrics;
        if (!metrics) return null;

        const toggleGroup = document.createElement('div');
        toggleGroup.style.display = 'flex';
        toggleGroup.style.alignItems = 'center';
        toggleGroup.style.gap = '6px';
        toggleGroup.style.marginLeft = 'auto';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'applyConstraintsToggle';
        checkbox.checked = this.applyConstraints;
        checkbox.style.cursor = 'pointer';
        checkbox.addEventListener('change', (e) => this.setApplyConstraints(e.target.checked));

        const toggleLabel = document.createElement('label');
        toggleLabel.htmlFor = 'applyConstraintsToggle';
        toggleLabel.textContent = 'Apply Constraints & AI Gains (Net)';
        toggleLabel.style.cursor = 'pointer';
        toggleLabel.style.userSelect = 'none';
        toggleLabel.title = "Toggling this ON applies all configured capacity constraints.";

        toggleGroup.appendChild(checkbox);
        toggleGroup.appendChild(toggleLabel);
        return toggleGroup;
    }

    /**
     * Render the main layout structure using DOM creation
     * PHASE 3: Converted from innerHTML to document.createElement
     */
    renderLayout() {
        // Capture current expanded state before re-rendering
        const existingSummaryContent = document.getElementById('teamLoadSummaryContent');
        if (existingSummaryContent) {
            this.isSummaryExpanded = existingSummaryContent.style.display !== 'none';
            window.isSummaryTableExpanded = this.isSummaryExpanded;
        }

        const isExpanded = this.isSummaryExpanded;

        // Clear container
        this.container.innerHTML = '';

        // === Team Load Summary Section ===
        // Styling now in year-planning-view.css
        const summarySection = document.createElement('div');
        summarySection.id = 'teamLoadSummarySection';

        // Summary Header (collapsible) - styling in CSS
        const summaryHeader = document.createElement('h4');
        summaryHeader.title = 'Click to expand/collapse team load summary';
        summaryHeader.addEventListener('click', () => {
            toggleCollapsibleSection('teamLoadSummaryContent', 'teamLoadSummaryToggle');
        });

        const toggleIndicator = document.createElement('span');
        toggleIndicator.id = 'teamLoadSummaryToggle';
        toggleIndicator.className = 'toggle-indicator';
        toggleIndicator.textContent = isExpanded ? '(-) ' : '(+) ';
        summaryHeader.appendChild(toggleIndicator);

        summaryHeader.appendChild(document.createTextNode('Team Load Summary (for ATL Initiatives)'));
        summarySection.appendChild(summaryHeader);

        // Summary Content (collapsible content) - styling in CSS
        const summaryContent = document.createElement('div');
        summaryContent.id = 'teamLoadSummaryContent';
        // Dynamic display state (not in CSS)
        summaryContent.style.display = isExpanded ? 'block' : 'none';

        // Note paragraph - styling in CSS
        const summaryNote = document.createElement('p');
        summaryNote.textContent = 'Shows team load based *only* on initiatives currently Above The Line (ATL) according to the selected scenario below.';
        summaryContent.appendChild(summaryNote);

        // Summary Table - styling in CSS
        const summaryTable = document.createElement('table');
        summaryTable.id = 'teamLoadSummaryTable';

        // Table Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f2f2f2';

        const headers = [
            { text: 'Team Name', title: '' },
            { text: 'Funded HC', title: 'Finance Approved Budget' },
            { text: 'Team BIS', title: 'Actual Team Members' },
            { text: 'Away BIS', title: 'Borrowed/Away Members' },
            { text: 'Effective BIS', title: 'Team BIS + Away BIS' },
            { text: 'Assigned ATL SDEs', title: 'SDEs assigned to this team from ATL initiatives only' },
            { text: 'Scenario Capacity Limit', title: "Team's capacity based on selected scenario button below" },
            { text: 'Remaining Capacity (ATL)', title: 'Scenario Capacity Limit - Assigned ATL SDEs' },
            { text: 'ATL Status', title: 'Load status for ATL work based on Scenario Capacity Limit' }
        ];

        headers.forEach(h => {
            const th = document.createElement('th');
            th.style.border = '1px solid #ccc';
            th.style.padding = '5px';
            th.textContent = h.text;
            if (h.title) th.title = h.title;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        summaryTable.appendChild(thead);

        // Table Body
        const tbody = document.createElement('tbody');
        tbody.id = 'teamLoadSummaryTableBody';
        summaryTable.appendChild(tbody);

        // Table Footer
        const tfoot = document.createElement('tfoot');
        tfoot.id = 'teamLoadSummaryTableFoot';
        tfoot.style.fontWeight = 'bold';
        summaryTable.appendChild(tfoot);

        summaryContent.appendChild(summaryTable);
        summarySection.appendChild(summaryContent);
        this.container.appendChild(summarySection);

        // === Planning Table Container ===
        const planningTableContainer = document.createElement('div');
        planningTableContainer.id = 'planningTableContainer';
        this.container.appendChild(planningTableContainer);
    }

    /**
     * Ensure data consistency before rendering
     */
    ensureDataConsistency() {
        if (typeof ensureWorkPackagesForInitiatives === 'function') {
            ensureWorkPackagesForInitiatives(window.currentSystemData, this.currentYear);
            const initiatives = window.currentSystemData?.yearlyInitiatives || [];
            initiatives
                .filter(init => init.attributes?.planningYear == this.currentYear)
                .forEach(init => {
                    if (typeof syncInitiativeTotals === 'function') {
                        syncInitiativeTotals(init.initiativeId, window.currentSystemData);
                    }
                });
        }
    }

    /**
     * Calculate summary data using PlanningService
     */
    calculateSummaryData() {
        if (!window.currentSystemData?.calculatedCapacityMetrics || !window.currentSystemData?.teams) {
            return { rows: [], totals: {} };
        }

        const initiativesForYear = (window.currentSystemData.yearlyInitiatives || [])
            .filter(init => init.attributes?.planningYear == this.currentYear && init.status !== 'Completed');

        return PlanningService.calculateTeamLoadSummary({
            teams: window.currentSystemData.teams,
            initiatives: initiativesForYear,
            calculatedMetrics: window.currentSystemData.calculatedCapacityMetrics,
            scenario: this.scenario,
            applyConstraints: this.applyConstraints,
            allKnownEngineers: window.currentSystemData.allKnownEngineers || []
        });
    }

    /**
     * Calculate table data using PlanningService
     */
    calculateTableData() {
        if (!window.currentSystemData?.calculatedCapacityMetrics || !window.currentSystemData?.teams) {
            return [];
        }

        const initiativesForYear = (window.currentSystemData.yearlyInitiatives || [])
            .filter(init => init.attributes?.planningYear == this.currentYear && init.status !== 'Completed');

        const calculatedData = PlanningService.calculatePlanningTableData({
            initiatives: initiativesForYear,
            calculatedMetrics: window.currentSystemData.calculatedCapacityMetrics,
            scenario: this.scenario,
            applyConstraints: this.applyConstraints
        });

        // Update original initiative objects for persistence
        calculatedData.forEach(calcInit => {
            const originalInit = (window.currentSystemData.yearlyInitiatives || [])
                .find(i => i.initiativeId === calcInit.initiativeId);
            if (originalInit) {
                originalInit.attributes.planningStatusFundedHc = calcInit.calculatedAtlBtlStatus;
            }
        });

        return calculatedData;
    }

    /**
     * Render the Team Load Summary table with context-aware columns
     * Columns adapt based on selected scenario and constraints toggle
     */
    renderSummaryTable(summaryData) {
        const summaryContainer = document.getElementById('teamLoadSummarySection');
        if (!summaryContainer) { return; }

        const summaryTable = summaryContainer.querySelector('#teamLoadSummaryTable');
        const summaryTableBody = summaryTable?.querySelector('#teamLoadSummaryTableBody');
        const summaryTableFoot = summaryTable?.querySelector('#teamLoadSummaryTableFoot');
        let summaryTableHead = summaryTable?.querySelector('thead');

        if (!summaryTable || !summaryTableBody || !summaryTableFoot || !summaryTableHead) {
            console.error("YearPlanningView: Missing Team Load Summary table structure.");
            return;
        }

        // Clear existing content
        summaryTableHead.innerHTML = '';
        summaryTableBody.innerHTML = '';
        summaryTableFoot.innerHTML = '';

        // Scenario and state configuration
        const scenarioKey = this.scenario === 'funded' ? 'FundedHC' :
            (this.scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
        const isNetCapacityUsed = this.applyConstraints;
        const scenarioNameForTitle = `${isNetCapacityUsed ? 'Net' : 'Gross'} ${scenarioKey.replace('BIS', ' BIS')}`;

        // Update title
        const summaryTitleHeader = summaryContainer.querySelector('h4');
        if (summaryTitleHeader) {
            const toggleSpan = summaryTitleHeader.querySelector('span.toggle-indicator');
            summaryTitleHeader.textContent = ` Team Load Summary (for ATL Initiatives - Scenario: ${scenarioNameForTitle})`;
            if (toggleSpan) {
                summaryTitleHeader.insertBefore(toggleSpan, summaryTitleHeader.firstChild);
            }
        }

        // Build context-aware column configuration
        const columns = this._buildSummaryColumns(scenarioKey, isNetCapacityUsed);

        // Build header row
        const headerRow = summaryTableHead.insertRow();
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.header;
            th.title = col.title;
            th.style.textAlign = 'center';
            headerRow.appendChild(th);
        });

        // Build data rows
        (summaryData.rows || []).forEach(rowData => {
            const row = summaryTableBody.insertRow();
            columns.forEach(col => {
                const cell = row.insertCell();
                const value = col.getValue(rowData, isNetCapacityUsed);
                cell.textContent = value;

                // Apply styling
                if (col.getStyle) {
                    const style = col.getStyle(rowData, isNetCapacityUsed);
                    Object.assign(cell.style, style);
                }
                cell.style.textAlign = col.align || 'center';
            });
        });

        // Build footer row
        const totals = summaryData.totals || {};
        const footerRow = summaryTableFoot.insertRow();
        columns.forEach(col => {
            const cell = footerRow.insertCell();
            const value = col.getTotal ? col.getTotal(totals, isNetCapacityUsed) : '';
            cell.textContent = value;

            // Apply styling
            if (col.getTotalStyle) {
                const style = col.getTotalStyle(totals, isNetCapacityUsed);
                Object.assign(cell.style, style);
            }
            cell.style.textAlign = col.align || 'center';
        });
    }

    /**
     * Build column configuration based on scenario and constraints
     * @private
     */
    _buildSummaryColumns(scenarioKey, isNetCapacityUsed) {
        const columns = [];
        const stateDisplayName = isNetCapacityUsed ? 'Net' : 'Gross';

        // 1. Team Name (always)
        columns.push({
            header: 'Team',
            title: 'Team Name',
            align: 'left',
            getValue: (row) => row.teamName,
            getTotal: () => 'Totals'
        });

        // 2. Scenario-specific base capacity column(s)
        if (this.scenario === 'funded') {
            columns.push({
                header: 'Funded HC (Humans)',
                title: 'Budgeted headcount for human engineers.',
                getValue: (row) => row.fundedHC.toFixed(2),
                getTotal: (totals) => (totals.fundedHCGross ?? 0).toFixed(2)
            });
        } else if (this.scenario === 'team_bis') {
            columns.push({
                header: 'Team BIS (Humans)',
                title: 'Actual human engineers on the team.',
                getValue: (row) => row.teamBISHumans.toFixed(2),
                getTotal: (totals) => (totals.teamBISHumans ?? 0).toFixed(2)
            });
        } else {
            // Effective BIS - show Team BIS + Away BIS
            columns.push({
                header: 'Team BIS (Humans)',
                title: 'Actual human engineers on the team.',
                getValue: (row) => row.teamBISHumans.toFixed(2),
                getTotal: (totals) => (totals.teamBISHumans ?? 0).toFixed(2)
            });
            columns.push({
                header: 'Away BIS (Humans)',
                title: 'Borrowed human engineers from other teams.',
                getValue: (row) => row.awayBISHumans.toFixed(2),
                getTotal: (totals) => (totals.awayBISHumans ?? 0).toFixed(2)
            });
        }

        // 3. AI Engineers (always - important distinction)
        columns.push({
            header: 'AI Engineers',
            title: 'Count of AI Software Engineers contributing to the team.',
            getValue: (row) => row.aiEngineers.toFixed(2),
            getTotal: (totals) => (totals.aiEngineers ?? 0).toFixed(2)
        });

        // 4. Adjustment columns (only when constraints ON)
        if (isNetCapacityUsed) {
            columns.push({
                header: '(-) Sinks (SDE/Yrs)',
                title: 'Total deductions from leave, overhead, etc.',
                getValue: (row) => `-${row.sinks.toFixed(2)}`,
                getTotal: (totals) => `-${(totals.sinks ?? 0).toFixed(2)}`,
                getStyle: () => ({ color: '#dc3545' }),
                getTotalStyle: () => ({ color: '#dc3545' })
            });
            columns.push({
                header: '(+) AI Productivity Gain',
                title: 'The effective SDE/Year capacity gained from AI tooling.',
                getValue: (row) => `+${row.productivityGain.toFixed(2)}`,
                getTotal: (totals) => `+${(totals.productivityGain ?? 0).toFixed(2)}`,
                getStyle: () => ({ color: '#28a745' }),
                getTotalStyle: () => ({ color: '#28a745' })
            });
            columns.push({
                header: 'AI Gain %',
                title: 'The configured productivity gain percentage for the team.',
                getValue: (row) => `${row.productivityPercent.toFixed(0)}%`,
                getTotal: () => ''
            });
        }

        // 5. Final Capacity (always)
        const scenarioDisplayName = scenarioKey.replace('BIS', ' BIS');
        columns.push({
            header: `${scenarioDisplayName} Capacity (${stateDisplayName})`,
            title: `The total planning capacity under ${scenarioDisplayName} scenario.`,
            getValue: (row) => row.scenarioCapacity.toFixed(2),
            getTotal: (totals) => (totals.scenarioCapacity ?? 0).toFixed(2)
        });

        // 6. Assigned ATL SDEs (always)
        columns.push({
            header: 'Assigned ATL SDEs',
            title: 'SDEs assigned from ATL initiatives.',
            getValue: (row) => row.assignedAtlSde.toFixed(2),
            getTotal: (totals) => (totals.assignedAtlSde ?? 0).toFixed(2)
        });

        // 7. Remaining Capacity (always)
        columns.push({
            header: 'Remaining Capacity (ATL)',
            title: 'Scenario Capacity minus Assigned ATL SDEs.',
            getValue: (row) => row.remainingCapacity.toFixed(2),
            getTotal: (totals) => (totals.remainingCapacity ?? 0).toFixed(2),
            getStyle: (row) => ({ color: row.remainingCapacity < 0 ? 'red' : 'green' }),
            getTotalStyle: (totals) => ({ color: (totals.remainingCapacity ?? 0) < 0 ? 'red' : 'green' })
        });

        // 8. ATL Status (always)
        columns.push({
            header: 'ATL Status',
            title: 'Indicates if team is overloaded based on ATL work.',
            getValue: (row) => row.status,
            getTotal: () => '',
            getStyle: (row) => ({
                color: row.status === '🛑 Overloaded' ? 'red' :
                    (row.status === '⚠️ Near Limit' ? 'darkorange' : 'green'),
                fontWeight: 'bold'
            })
        });

        return columns;
    }

    /**
     * Render the main Planning Table
     * REFACTORED: Moved from yearPlanning.js into class for proper encapsulation
     * NOTE: Event handlers (drag/drop, estimate change, protected change) still reference
     * legacy functions in yearPlanning.js - those can be migrated in a follow-up cleanup
     */
    renderPlanningTable(tableData) {
        const tableContainer = document.getElementById('planningTableContainer');
        if (!tableContainer) { return; }

        tableContainer.innerHTML = '';

        const tableWrapper = document.createElement('div');
        tableWrapper.id = 'planningTableWrapper';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.id = 'planningTable';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Fixed headers
        const fixedHeaders = ['Protected', 'Title', 'ID', 'Description', 'Total SDE Years', 'Cumulative SDE Years', 'Capacity Status', 'ATL/BTL'];
        fixedHeaders.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.border = '1px solid #ccc';
            th.style.padding = '8px';
            th.style.textAlign = 'left';
            th.style.whiteSpace = 'nowrap';
            headerRow.appendChild(th);
        });

        // Team columns
        const teams = window.currentSystemData?.teams || [];
        const calculatedMetrics = window.currentSystemData?.calculatedCapacityMetrics || {};
        const teamHeaderMap = new Map();

        teams.forEach((team, index) => {
            const th = document.createElement('th');
            const teamDisplayIdentity = team.teamIdentity || team.teamId || 'Unknown';
            const teamFullName = team.teamName || teamDisplayIdentity;
            const teamMetrics = calculatedMetrics[team.teamId];
            const teamTitle = `Team: ${teamFullName}\nIdentity: ${teamDisplayIdentity}\nFunded HC: ${teamMetrics?.FundedHC?.humanHeadcount?.toFixed?.(2) || '0.00'}\nTeam BIS: ${teamMetrics?.TeamBIS?.totalHeadcount?.toFixed?.(2) || '0.00'}\nEff. BIS: ${teamMetrics?.EffectiveBIS?.totalHeadcount?.toFixed?.(2) || '0.00'}`;
            th.textContent = teamDisplayIdentity;
            th.title = teamTitle;
            th.setAttribute('data-team-id', team.teamId);
            Object.assign(th.style, {
                border: '1px solid #ccc', padding: '8px', textAlign: 'center', writingMode: 'vertical-lr',
                textOrientation: 'mixed', whiteSpace: 'nowrap', minWidth: '35px', maxWidth: '35px'
            });
            headerRow.appendChild(th);
            teamHeaderMap.set(fixedHeaders.length + index, team.teamId);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.id = 'planningTableBody';

        // Cumulative tracking per team
        let teamCumulativeSde = {};
        teams.forEach(team => { teamCumulativeSde[team.teamId] = 0; });

        // Use class properties instead of global variables
        const scenarioKey = this.scenario === 'funded' ? 'FundedHC' :
            (this.scenario === 'team_bis' ? 'TeamBIS' : 'EffectiveBIS');
        const isNetCapacityUsed = this.applyConstraints;

        // Build rows
        tableData.forEach((initiative) => {
            const row = tbody.insertRow();
            row.setAttribute('data-initiative-id', initiative.initiativeId);
            row.style.borderBottom = '1px solid #eee';
            row.style.padding = '2px 0';
            row.setAttribute('draggable', !initiative.isProtected);

            // Legacy drag handlers (still in yearPlanning.js)
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('dragleave', handleDragLeave);
            row.addEventListener('drop', handleDrop);
            row.addEventListener('dragend', handleDragEnd);
            if (!initiative.isProtected) {
                row.addEventListener('dragstart', handleDragStart);
                row.style.cursor = 'move';
            } else {
                row.style.cursor = 'default';
            }

            // Protected checkbox cell
            const protectedCell = row.insertCell();
            const protectedCheckbox = document.createElement('input');
            protectedCheckbox.type = 'checkbox';
            protectedCheckbox.checked = initiative.isProtected;
            protectedCheckbox.setAttribute('data-initiative-id', initiative.initiativeId);
            protectedCheckbox.style.cursor = 'pointer';
            protectedCheckbox.onchange = handleProtectedChange; // Legacy handler
            protectedCell.appendChild(protectedCheckbox);
            protectedCell.style.textAlign = 'center';

            // Title cell
            const titleCell = row.insertCell();
            titleCell.textContent = initiative.title || 'No Title';
            titleCell.style.fontWeight = initiative.isProtected ? 'bold' : 'normal';

            // ID cell
            const idCell = row.insertCell();
            idCell.textContent = initiative.initiativeId;
            idCell.style.fontSize = '0.8em';
            idCell.style.color = '#555';

            // Description cell
            const descCell = row.insertCell();
            const descText = initiative.description || '';
            descCell.textContent = descText.length > 50 ? descText.substring(0, 47) + '...' : descText;
            descCell.title = descText;

            // Total SDE cell
            const totalSdeCell = row.insertCell();
            totalSdeCell.style.textAlign = 'right';
            totalSdeCell.textContent = initiative.calculatedInitiativeTotalSde.toFixed(2);

            // Cumulative SDE cell
            const cumSdeCell = row.insertCell();
            cumSdeCell.style.textAlign = 'right';
            cumSdeCell.textContent = initiative.calculatedCumulativeSde.toFixed(2);

            // Capacity Status cell
            const statusCell = row.insertCell();
            statusCell.style.textAlign = 'center';
            const totalTeamBIS = calculatedMetrics.totals?.TeamBIS?.totalHeadcount || 0;
            const totalFundedHC = calculatedMetrics.totals?.FundedHC?.humanHeadcount || 0;

            if (initiative.calculatedCumulativeSde <= totalTeamBIS) {
                statusCell.textContent = '✅';
                statusCell.title = `Within Team BIS (${totalTeamBIS.toFixed(2)})`;
                statusCell.style.backgroundColor = '#d4edda';
            } else if (initiative.calculatedCumulativeSde <= totalFundedHC) {
                statusCell.textContent = '⚠️';
                statusCell.title = `Exceeds Team BIS, Within Funded HC (${totalFundedHC.toFixed(2)})`;
                statusCell.style.backgroundColor = '#fff3cd';
            } else {
                statusCell.textContent = '🛑';
                statusCell.title = `Exceeds Funded HC (${totalFundedHC.toFixed(2)})`;
                statusCell.style.backgroundColor = '#f8d7da';
            }

            // ATL/BTL cell
            const atlBtlCell = row.insertCell();
            atlBtlCell.style.fontWeight = 'bold';
            atlBtlCell.style.textAlign = 'center';
            if (!initiative.isBTL) {
                atlBtlCell.textContent = 'ATL';
                atlBtlCell.style.color = 'green';
            } else {
                atlBtlCell.textContent = 'BTL';
                atlBtlCell.style.color = 'red';
            }

            // Team estimate cells
            const assignmentsMap = new Map((initiative.assignments || []).map(a => [a.teamId, a.sdeYears]));
            teamHeaderMap.forEach((teamId) => {
                const teamCell = row.insertCell();
                const currentEstimate = assignmentsMap.get(teamId) || 0;
                if (!initiative.isBTL) {
                    teamCumulativeSde[teamId] += currentEstimate;
                }

                const estimateInput = document.createElement('input');
                estimateInput.type = 'number';
                estimateInput.min = '0';
                estimateInput.step = '0.25';
                estimateInput.value = currentEstimate > 0 ? currentEstimate.toFixed(2) : '';
                estimateInput.setAttribute('data-initiative-id', initiative.initiativeId);
                estimateInput.setAttribute('data-team-id', teamId);
                Object.assign(estimateInput.style, {
                    width: '60px', textAlign: 'right', border: 'none', backgroundColor: 'transparent'
                });
                estimateInput.addEventListener('change', handleEstimateChange); // Legacy handler
                teamCell.appendChild(estimateInput);
                teamCell.style.textAlign = 'center';

                // Color code based on capacity
                let teamLimit = isNetCapacityUsed
                    ? calculatedMetrics[teamId]?.[scenarioKey]?.netYrs ?? 0
                    : calculatedMetrics[teamId]?.[scenarioKey]?.grossYrs ?? 0;

                const currentTeamCumulative = teamCumulativeSde[teamId];
                if (currentTeamCumulative <= teamLimit) {
                    teamCell.style.backgroundColor = '#d4edda';
                    teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit: ${teamLimit.toFixed(2)} - OK`;
                } else {
                    teamCell.style.backgroundColor = '#f8d7da';
                    teamCell.title = `Cumulative: ${currentTeamCumulative.toFixed(2)} / Limit: ${teamLimit.toFixed(2)} - Overloaded`;
                }
            });

            // Apply row styling based on status
            row.querySelectorAll('td').forEach((cell, idx) => {
                if (idx < fixedHeaders.length) {
                    if (initiative.isProtected) {
                        cell.style.backgroundColor = '#f8f9fa';
                    } else if (initiative.isBTL) {
                        cell.style.backgroundColor = '#ffeeee';
                    }
                }
            });
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        tableContainer.appendChild(tableWrapper);

        // Adjust height (legacy helper)
        if (typeof adjustPlanningTableHeight === 'function') {
            adjustPlanningTableHeight();
        }
    }

    // ==================== State Setters ====================

    setYear(year) {
        this.currentYear = parseInt(year);
        console.log(`YearPlanningView: Year changed to ${this.currentYear}`);
        this.render();
    }

    setScenario(scenario) {
        this.scenario = scenario;
        console.log(`YearPlanningView: Scenario changed to ${this.scenario}`);
        this.render();
    }

    setApplyConstraints(value) {
        this.applyConstraints = value;
        console.log(`YearPlanningView: Apply constraints = ${this.applyConstraints}`);
        this.render();
    }

    // ==================== Actions ====================

    handleSavePlan() {
        console.log(`Saving plan for year ${this.currentYear}...`);

        if (!window.currentSystemData?.systemName) {
            window.notificationManager?.showToast("Cannot save: No system data loaded.", "error");
            return;
        }

        const initiativesForYear = (window.currentSystemData.yearlyInitiatives || [])
            .filter(init => init.attributes?.planningYear == this.currentYear);

        initiativesForYear.forEach(initiative => {
            const planningStatus = initiative.attributes?.planningStatusFundedHc;

            if (initiative.status === "Completed") return;

            if (planningStatus === 'ATL') {
                if (initiative.status === "Backlog" || initiative.status === "Defined") {
                    initiative.status = "Committed";
                }
            } else if (planningStatus === 'BTL') {
                if (initiative.status === "Committed" || initiative.status === "In Progress") {
                    initiative.status = "Backlog";
                }
            }
        });

        try {
            if (typeof ensureWorkPackagesForInitiatives === 'function') {
                ensureWorkPackagesForInitiatives(window.currentSystemData, this.currentYear);
                initiativesForYear.forEach(init => {
                    if (typeof syncWorkPackagesFromInitiative === 'function') {
                        syncWorkPackagesFromInitiative(init, window.currentSystemData);
                    }
                    if (typeof syncInitiativeTotals === 'function') {
                        syncInitiativeTotals(init.initiativeId, window.currentSystemData);
                    }
                });
            }
            saveSystemChanges();
            window.notificationManager?.showToast(`Plan for ${this.currentYear} saved successfully.`, "success");
            this.render();
        } catch (error) {
            console.error("Error saving plan:", error);
            window.notificationManager?.showToast("Error saving plan. Check console.", "error");
        }
    }

    runOptimizer() {
        if (window.aiAgentController?.runPrebuiltAgent) {
            window.aiAgentController.runPrebuiltAgent('optimizePlan');
        } else {
            window.notificationManager?.showToast("AI Controller not available.", "error");
        }
    }

    // ==================== AI Integration ====================

    /**
     * Get context for AI chat panel
     */
    getContext() {
        return {
            viewName: 'Year Planning',
            currentYear: this.currentYear,
            scenario: this.scenario,
            applyConstraints: this.applyConstraints,
            atlInitiatives: PlanningService.getATLInitiatives(this.tableData || []),
            btlInitiatives: PlanningService.getBTLInitiatives(this.tableData || []),
            totalCapacity: PlanningService.getTotalCapacity(
                window.currentSystemData?.calculatedCapacityMetrics,
                this.scenario,
                this.applyConstraints
            ),
            summaryTotals: this.summaryData?.totals || {}
        };
    }
}

// ==================== Global Instance & Compatibility ====================

// Global instance
window.yearPlanningView = null;

// Compatibility layer - delegates to instance or uses legacy functions
window.renderPlanningView = function () {
    // Use new class if instance exists, otherwise fall back to legacy
    if (window.yearPlanningView) {
        window.yearPlanningView.render();
    } else {
        // Legacy fallback - will be removed after full migration
        console.warn("YearPlanningView: Using legacy renderPlanningView");
    }
};

window.setPlanningYear = function (year) {
    if (window.yearPlanningView) {
        window.yearPlanningView.setYear(year);
    } else {
        currentPlanningYear = parseInt(year);
        renderPlanningView();
    }
};

window.setPlanningScenario = function (scenario) {
    if (window.yearPlanningView) {
        window.yearPlanningView.setScenario(scenario);
    } else {
        planningCapacityScenario = scenario;
        renderPlanningView();
    }
};

// AI context function
window.getYearPlanningContext = function () {
    if (window.yearPlanningView) {
        return window.yearPlanningView.getContext();
    }
    return { viewName: 'Year Planning', error: 'View not initialized' };
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YearPlanningView;
}
