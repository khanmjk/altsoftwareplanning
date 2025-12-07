/**
 * RoadmapComponent
 * Renders the visual roadmap grids (Quarterly View and 3-Year Plan).
 * Supports Drag & Drop for interactive planning.
 */
class RoadmapComponent {
    constructor(containerId, viewType) {
        this.containerId = containerId;
        this.viewType = viewType; // 'quarterly' or '3yp'
        this.draggedInitiativeId = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div id="roadmapTableFilters" class="roadmap-toolbar-content" style="margin-bottom: 15px;"></div>
            <div id="roadmapGridContainer" class="roadmap-grid-container"></div>
        `;

        this.renderFilters();
        this.renderGrid();
    }

    renderFilters() {
        const filtersContainer = document.getElementById('roadmapTableFilters');
        if (!filtersContainer) return;

        filtersContainer.innerHTML = '';

        // Helper to create filter
        const createFilter = (id, label, options, onChange) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'roadmap-filter-group';

            const labelEl = document.createElement('label');
            labelEl.className = 'roadmap-filter-label';
            labelEl.htmlFor = id;
            labelEl.textContent = label;

            const select = document.createElement('select');
            select.id = id;
            select.className = 'form-select form-select-sm';
            select.innerHTML = options;
            select.onchange = onChange;

            wrapper.appendChild(labelEl);
            wrapper.appendChild(select);
            return wrapper;
        };

        // 1. Year Filter (Crucial for 3YP context)
        const currentYear = new Date().getFullYear();
        // Default to current year if not set or 'all'
        if (!window.dashboardPlanningYear || window.dashboardPlanningYear === 'all') {
            window.dashboardPlanningYear = currentYear;
        }

        const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
        // Removed "All Years" option as requested
        const yearOptions = years.map(y => `<option value="${y}" ${y == window.dashboardPlanningYear ? 'selected' : ''}>${y}</option>`).join('');

        filtersContainer.appendChild(createFilter('roadmapYearFilter', 'Year:', yearOptions, (e) => {
            window.dashboardPlanningYear = e.target.value; // Sync with global
            this.renderGrid();
        }));

        // 2. Org Filter
        let orgOptions = '<option value="all">All Organizations</option>';
        (SystemService.getCurrentSystem().seniorManagers || []).forEach(sm => {
            orgOptions += `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`;
        });

        filtersContainer.appendChild(createFilter('roadmapOrgFilter', 'Org:', orgOptions, (e) => {
            this.updateTeamOptions(e.target.value);
            this.renderGrid();
        }));

        // 3. Team Filter
        filtersContainer.appendChild(createFilter('roadmapTeamFilter', 'Team:', '<option value="all">All Teams</option>', () => this.renderGrid()));

        // 4. Theme Filter (Simplified for now, can enhance to multiselect later if needed)
        let themeOptions = '<option value="all">All Themes</option>';
        (SystemService.getCurrentSystem().definedThemes || []).forEach(t => {
            themeOptions += `<option value="${t.themeId}">${t.name}</option>`;
        });

        filtersContainer.appendChild(createFilter('roadmapThemeFilter', 'Theme:', themeOptions, () => this.renderGrid()));

        // Initial Team Population
        this.updateTeamOptions('all');
    }

    updateTeamOptions(orgId) {
        const teamSelect = document.getElementById('roadmapTeamFilter');
        if (!teamSelect) return;

        let teams = SystemService.getCurrentSystem().teams || [];
        if (orgId !== 'all') {
            const validSdmIds = new Set();
            (SystemService.getCurrentSystem().sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgId) validSdmIds.add(sdm.sdmId);
            });
            teams = teams.filter(t => validSdmIds.has(t.sdmId));
        }

        teamSelect.innerHTML = '<option value="all">All Teams</option>';
        teams.sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName))
            .forEach(t => {
                teamSelect.add(new Option(t.teamIdentity || t.teamName, t.teamId));
            });
    }

    renderGrid() {
        const gridContainer = document.getElementById('roadmapGridContainer');
        if (!gridContainer) return;

        const data = this.prepareData();
        if (!data) {
            gridContainer.innerHTML = '<div class="no-data-message">No initiatives found for the selected criteria.</div>';
            return;
        }

        if (this.viewType === 'quarterly') {
            this.renderQuarterlyGrid(gridContainer, data);
        } else if (this.viewType === '3yp') {
            this.render3YPGrid(gridContainer, data);
        }
    }

    prepareData() {
        // Collect Filter Values
        const orgFilter = document.getElementById('roadmapOrgFilter')?.value || 'all';
        const teamFilter = document.getElementById('roadmapTeamFilter')?.value || 'all';
        const yearFilter = window.dashboardPlanningYear || 'all';

        // Collect Theme Filters (Simplified Single Select for now, matching renderFilters)
        const themeFilter = document.getElementById('roadmapThemeFilter')?.value || 'all';
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

    renderQuarterlyGrid(container, data) {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const quarterData = { Q1: [], Q2: [], Q3: [], Q4: [] };
        const processedIds = new Set(); // Track unique IDs to prevent duplicates

        // Format Headers: Q1 '25
        const planningYear = window.dashboardPlanningYear || new Date().getFullYear();
        const shortYear = planningYear.toString().slice(-2);
        const headerLabels = quarters.map(q => `${q} '${shortYear}`);

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

        let html = `
            <div class="roadmap-grid quarterly-grid">
                <div class="roadmap-header-row">
                    ${quarters.map((q, i) => `<div class="roadmap-header-cell quarter-header header-${q}">${headerLabels[i]}</div>`).join('')}
                </div>
                <div class="roadmap-content-row">
        `;

        quarters.forEach(quarter => {
            const initiatives = quarterData[quarter];
            html += `
                <div class="roadmap-quarter-cell column-${quarter}" 
                     data-quarter="${quarter}">
            `;

            initiatives.forEach(init => {
                const statusClass = this.getStatusClass(init.status);

                // Pills Logic
                const sdeTotal = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0).toFixed(1);
                const themeNames = (init.themes || []).map(tid => {
                    const t = SystemService.getCurrentSystem().definedThemes.find(th => th.themeId === tid);
                    return t ? t.name : 'Uncategorized';
                }).join(', ') || 'Uncategorized';

                // Team Pills
                const teams = [...new Set((init.assignments || []).map(a => {
                    const t = SystemService.getCurrentSystem().teams.find(tm => tm.teamId === a.teamId);
                    return t ? (t.teamIdentity || t.teamName) : 'Unknown';
                }))];
                const teamPills = teams.map(t => `<span class="pill pill-team">${t}</span>`).join('');

                html += `
                    <div class="roadmap-card ${statusClass}" 
                         draggable="true" 
                         data-id="${init.initiativeId}">
                        <div class="card-header">
                            <span class="pill pill-theme">${themeNames}</span>
                        </div>
                        <div class="card-title">${init.title}</div>
                        <div class="card-footer">
                            <div class="card-pills">
                                ${teamPills}
                                <span class="pill pill-sde">${sdeTotal} SDE</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`; // End quarter cell
        });

        html += `</div></div>`; // End content row and grid
        container.innerHTML = html;
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

        // Flatten data (similar to quarterly view)
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

        let html = `
            <div class="roadmap-grid three-year-grid">
                <div class="roadmap-header-row">
                    ${columns.map(col => `<div class="roadmap-header-cell header-${col.replace(/\s+/g, '-').toLowerCase()}">${columnLabels[col]}</div>`).join('')}
                </div>
                <div class="roadmap-content-row">
        `;

        columns.forEach(col => {
            const initiatives = gridData[col];
            const colClass = col.replace(/\s+/g, '-').toLowerCase();

            html += `
                <div class="roadmap-quarter-cell column-${colClass}" 
                     data-year-bucket="${col}">
            `;

            initiatives.forEach(init => {
                const statusClass = this.getStatusClass(init.status);

                // Pills Logic (Reused)
                const sdeTotal = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0).toFixed(1);
                const themeNames = (init.themes || []).map(tid => {
                    const t = SystemService.getCurrentSystem().definedThemes.find(th => th.themeId === tid);
                    return t ? t.name : 'Uncategorized';
                }).join(', ') || 'Uncategorized';

                const teams = [...new Set((init.assignments || []).map(a => {
                    const t = SystemService.getCurrentSystem().teams.find(tm => tm.teamId === a.teamId);
                    return t ? (t.teamIdentity || t.teamName) : 'Unknown';
                }))];
                const teamPills = teams.map(t => `<span class="pill pill-team">${t}</span>`).join('');

                html += `
                    <div class="roadmap-card ${statusClass}" 
                         draggable="true" 
                         data-id="${init.initiativeId}">
                        <div class="card-header">
                            <span class="pill pill-theme">${themeNames}</span>
                        </div>
                        <div class="card-title">${init.title}</div>
                        <div class="card-footer">
                            <div class="card-pills">
                                ${teamPills}
                                <span class="pill pill-sde">${sdeTotal} SDE</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;
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
                if (initiativeId && window.openRoadmapModalForEdit) {
                    window.openRoadmapModalForEdit(initiativeId);
                }
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

        if (this.viewType === 'quarterly') {
            // Quarterly View Update
            const newQuarter = target;
            const oldQuarter = initiative.targetQuarter || RoadmapService.getQuarterFromDate(initiative.targetDueDate) || 'Backlog';

            initiative.targetQuarter = newQuarter;

            const year = window.dashboardPlanningYear && window.dashboardPlanningYear !== 'all'
                ? parseInt(window.dashboardPlanningYear)
                : (initiative.attributes.planningYear || new Date().getFullYear());

            const newDueDate = RoadmapService.getEndDateForQuarter(newQuarter, year);
            if (newDueDate) initiative.targetDueDate = newDueDate;

            window.notificationManager.showToast(`Moved "${title}" from ${oldQuarter} to ${newQuarter}`, 'success');

        } else if (this.viewType === '3yp') {
            // 3YP View Update
            const newBucket = target;
            const currentYear = new Date().getFullYear();
            let newYear;

            if (newBucket === 'Current Year') newYear = currentYear;
            else if (newBucket === 'Next Year') newYear = currentYear + 1;
            else if (newBucket === 'Future') newYear = currentYear + 2;

            const oldYear = initiative.attributes.planningYear || 'Unknown';
            initiative.attributes.planningYear = newYear;

            // Clear specific quarter/date when moving years to avoid confusion? 
            // Or just let them persist? Let's keep them for now but maybe reset quarter if moving to future.

            window.notificationManager.showToast(`Moved "${title}" to ${newYear}`, 'success');
        }

        window.saveSystemChanges();
        this.renderGrid();
    }

    generateToolbarControls() {
        // Return any specific controls for the toolbar if needed
        return document.createElement('div');
    }
}

// Global Instance for Event Handlers
window.roadmapComponentInstance = null;

// Wrap constructor to set global instance
const OriginalRoadmapComponent = RoadmapComponent;
RoadmapComponent = class extends OriginalRoadmapComponent {
    constructor(containerId, viewType) {
        super(containerId, viewType);
        window.roadmapComponentInstance = this;
    }
};
