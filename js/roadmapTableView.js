// js/roadmapTableView.js

let roadmapTimelineTable = null; // To hold the Tabulator instance for this specific view

/**
 * Initializes the Quarterly Roadmap Table View widget.
 */
function initializeRoadmapTableView() {
    const container = document.getElementById('roadmapTimelineWidget');
    if (!container) { return; }
    container.innerHTML = `<div id="roadmapTableFilters" class="widget-filter-bar"></div><div id="quarterlyRoadmapContainer" class="quarterly-roadmap-container"></div>`;
    generateRoadmapTableFilters('', renderQuarterlyRoadmap);
    renderQuarterlyRoadmap();
}

/**
 * NEW: Initializes the 3-Year Plan (3YP) Roadmap View widget.
 */
function initialize3YPRoadmapView() {
    const container = document.getElementById('threeYearPlanWidget');
    if (!container) { return; }
    container.innerHTML = `<div id="roadmapTableFilters3YP" class="widget-filter-bar"></div><div id="threeYearPlanContainer" class="three-year-plan-container"></div>`;
    generateRoadmapTableFilters('3YP', render3YPRoadmap);
    render3YPRoadmap();
}

/**
 * Generates the interactive filter dropdowns, including a custom multi-select for themes.
 */
function generateRoadmapTableFilters(idSuffix = '', renderCallback, options = { includeThemes: true }) {
    const containerId = 'roadmapTableFilters' + idSuffix;
    const filtersContainer = document.getElementById(containerId);
    if (!filtersContainer) { return; }

    filtersContainer.innerHTML = '';

    const createDropdownFilter = (id, labelText, options) => {
        const div = document.createElement('div');
        div.className = 'filter-item';
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;
        const select = document.createElement('select');
        select.id = id;
        select.innerHTML = options;
        div.appendChild(label);
        div.appendChild(select);
        return div;
    };

    // --- Org Filter ---
    let orgOptions = '<option value="all">All Organizations</option>';
    (currentSystemData.seniorManagers || []).forEach(sm => {
        orgOptions += `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`;
    });
    const orgFilter = createDropdownFilter('roadmapOrgFilter' + idSuffix, 'Filter by Organization:', orgOptions);
    orgFilter.querySelector('select').onchange = () => {
        updateTeamFilterOptions(idSuffix);
        renderCallback();
    };
    filtersContainer.appendChild(orgFilter);

    // --- Team Filter ---
    const teamFilter = createDropdownFilter('roadmapTeamFilter' + idSuffix, 'Filter by Team:', '<option value="all">All Teams</option>');
    teamFilter.querySelector('select').onchange = renderCallback;
    filtersContainer.appendChild(teamFilter);

    // --- Conditional Theme Filter ---
    if (options.includeThemes) {
        const themeFilterWrapper = document.createElement('div');
        themeFilterWrapper.className = 'filter-item';
        const themeLabel = document.createElement('label');
        themeLabel.textContent = 'Filter by Theme:';
        themeFilterWrapper.appendChild(themeLabel);

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'custom-multiselect-dropdown';

        const dropdownButton = document.createElement('button');
        dropdownButton.id = 'theme-dropdown-button' + idSuffix;
        dropdownButton.className = 'dropdown-button';
        dropdownButton.type = 'button';

        const dropdownPanel = document.createElement('div');
        dropdownPanel.id = 'theme-dropdown-panel' + idSuffix;
        dropdownPanel.className = 'dropdown-panel';

        const selectAllContainer = document.createElement('div');
        selectAllContainer.className = 'select-all-container';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'theme-select-all' + idSuffix;
        const selectAllLabel = document.createElement('label');
        selectAllLabel.htmlFor = selectAllCheckbox.id;
        selectAllLabel.textContent = 'Select/Clear All';
        selectAllContainer.appendChild(selectAllCheckbox);
        selectAllContainer.appendChild(selectAllLabel);
        dropdownPanel.appendChild(selectAllContainer);

        const themeItemsContainer = document.createElement('div');
        themeItemsContainer.className = 'dropdown-items-container';
        (currentSystemData.definedThemes || []).forEach(theme => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dropdown-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `theme_filter_${theme.themeId}` + idSuffix;
            checkbox.value = theme.themeId;
            checkbox.className = 'theme-checkbox-item';
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = theme.name;
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            themeItemsContainer.appendChild(itemDiv);
        });
        dropdownPanel.appendChild(themeItemsContainer);

        dropdownContainer.appendChild(dropdownButton);
        dropdownContainer.appendChild(dropdownPanel);
        themeFilterWrapper.appendChild(dropdownContainer);
        filtersContainer.appendChild(themeFilterWrapper);

        const updateButtonText = () => {
            const checkboxes = dropdownPanel.querySelectorAll('.theme-checkbox-item:checked');
            const total = dropdownPanel.querySelectorAll('.theme-checkbox-item').length;
            if (checkboxes.length === total || checkboxes.length === 0) {
                dropdownButton.textContent = 'All Themes';
                selectAllCheckbox.checked = checkboxes.length === total;
                selectAllCheckbox.indeterminate = false;
            } else {
                dropdownButton.textContent = `${checkboxes.length} Theme(s) Selected`;
                selectAllCheckbox.indeterminate = true;
            }
        };

        const allCheckboxes = Array.from(dropdownPanel.querySelectorAll('.theme-checkbox-item'));

        selectAllCheckbox.addEventListener('change', () => {
            allCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
            updateButtonText();
            renderCallback();
        });

        allCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateButtonText();
                renderCallback();
            });
        });

        dropdownButton.addEventListener('click', (e) => { e.stopPropagation(); dropdownPanel.classList.toggle('show'); });
        document.addEventListener('click', (e) => { if (!dropdownContainer.contains(e.target)) { dropdownPanel.classList.remove('show'); } });

        selectAllCheckbox.checked = true;
        allCheckboxes.forEach(cb => cb.checked = true);
        updateButtonText();
    }

    updateTeamFilterOptions(idSuffix);
}


/**
 * Updates the options in the team filter based on the selected organization.
 */
function updateTeamFilterOptions(idSuffix = '') {
    const orgFilterValue = document.getElementById('roadmapOrgFilter' + idSuffix)?.value || 'all';
    const teamSelect = document.getElementById('roadmapTeamFilter' + idSuffix);
    if (!teamSelect) return;

    teamSelect.innerHTML = '';
    teamSelect.add(new Option('All Teams', 'all'));

    let teamsToShow = [];
    if (orgFilterValue === 'all') {
        teamsToShow = currentSystemData.teams || [];
    } else {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgFilterValue) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) {
                        teamsInOrg.add(team);
                    }
                });
            }
        });
        teamsToShow = Array.from(teamsInOrg);
    }

    teamsToShow.sort((a, b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName)).forEach(team => {
        teamSelect.add(new Option(team.teamIdentity || team.teamName, team.teamId));
    });
}

// =================================================================
// QUARTERLY ROADMAP FUNCTIONS
// =================================================================

function prepareDataForQuarterlyRoadmap() {
    const orgFilter = document.getElementById('roadmapOrgFilter')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilter')?.value || 'all';
    const themeCheckboxes = document.querySelectorAll('#theme-dropdown-panel input.theme-checkbox-item:checked');
    const selectedThemes = Array.from(themeCheckboxes).map(cb => cb.value);
    const yearFilter = dashboardPlanningYear; // Use the global variable from dashboard.js

    let initiatives = currentSystemData.yearlyInitiatives || [];

    // ** THE FIX IS HERE **
    // Only apply the year filter if a specific year is selected
    if (yearFilter !== 'all') {
        initiatives = initiatives.filter(init => init.attributes.planningYear == yearFilter);
    }
    // ** END FIX **

    if (orgFilter !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgFilter) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                });
            }
        });
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
    }

    if (teamFilter !== 'all') {
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamFilter));
    }

    const allThemeIds = (currentSystemData.definedThemes || []).map(t => t.themeId);
    if (selectedThemes.length < allThemeIds.length) {
        initiatives = initiatives.filter(init => {
            const initThemes = init.themes || [];
            if (initThemes.length === 0) return false;
            return initThemes.some(themeId => selectedThemes.includes(themeId));
        });
    }

    const roadmapData = {};
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));

    initiatives.forEach(init => {
        const quarter = getQuarterFromDate(init.targetDueDate);
        if (!quarter) return;

        const assignedThemes = init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];

        assignedThemes.forEach(themeId => {
            const themeName = themeMap.get(themeId) || "Uncategorized";

            if (selectedThemes.length < allThemeIds.length && !selectedThemes.includes(themeId)) {
                return;
            }

            if (!roadmapData[themeName]) {
                roadmapData[themeName] = { Q1: [], Q2: [], Q3: [], Q4: [] };
            }
            roadmapData[themeName][quarter].push(init);
        });
    });

    return roadmapData;
}

function renderQuarterlyRoadmap() {
    const container = document.getElementById('quarterlyRoadmapContainer');
    if (!container) return;

    const roadmapData = prepareDataForQuarterlyRoadmap();
    const themes = Object.keys(roadmapData).sort();
    const orgFilter = document.getElementById('roadmapOrgFilter')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilter')?.value || 'all';

    // This function's rendering logic is unchanged.
    // For brevity, I am not repeating the full inner HTML generation of the table,
    // as it remains the same.

    // Re-paste the existing render logic for completeness:
    if (Object.keys(roadmapData).length === 0) {
        container.innerHTML = `<p class="roadmap-table-view__empty">No initiatives match the current filter criteria.</p>`;
        return;
    }

    let tableHTML = `<table class="quarterly-roadmap-table">`;
    tableHTML += `
        <thead>
            <tr>
                <th>Theme</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
            </tr>
        </thead>
    `;
    tableHTML += `<tbody>`;
    themes.forEach(themeName => {
        tableHTML += `<tr>`;
        tableHTML += `<td class="theme-cell">${themeName}</td>`;
        for (let i = 1; i <= 4; i++) {
            const quarterKey = `Q${i}`;
            const initiatives = roadmapData[themeName]?.[quarterKey] || [];
            tableHTML += `<td><div class="quarter-cell">`;
            if (initiatives.length > 0) {
                initiatives.forEach(init => {
                    const totalSde = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
                    let sdeDisplayHTML = '';

                    if (teamFilter !== 'all') {
                        const team = currentSystemData.teams.find(t => t.teamId === teamFilter);
                        const teamName = team ? (team.teamIdentity || team.teamName) : "Team";
                        const teamAssignment = (init.assignments || []).find(a => a.teamId === teamFilter);
                        const teamSde = teamAssignment ? (teamAssignment.sdeYears || 0) : 0;
                        sdeDisplayHTML = `<div class="initiative-sde">${teamName}: ${teamSde.toFixed(2)} of ${totalSde.toFixed(2)} SDEs</div>`;
                    } else if (orgFilter !== 'all') {
                        const teamsInOrg = new Set();
                        (currentSystemData.sdms || []).forEach(sdm => {
                            if (sdm.seniorManagerId === orgFilter) { (currentSystemData.teams || []).forEach(team => { if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId); }); }
                        });
                        const orgAssignments = (init.assignments || []).filter(a => teamsInOrg.has(a.teamId));
                        const orgSde = orgAssignments.reduce((sum, a) => sum + (a.sdeYears || 0), 0);
                        let breakdownHTML = '';
                        if (orgAssignments.length > 0) {
                            breakdownHTML = orgAssignments.map(a => { const team = currentSystemData.teams.find(t => t.teamId === a.teamId); const teamName = team ? (team.teamIdentity || team.teamName) : "Unknown Team"; return `<div class="initiative-sde-breakdown">${teamName}: ${a.sdeYears.toFixed(2)}</div>`; }).join('');
                        }
                        sdeDisplayHTML = `<div class="initiative-sde">Org Total: ${orgSde.toFixed(2)} of ${totalSde.toFixed(2)} SDEs</div>${breakdownHTML}`;
                    } else {
                        sdeDisplayHTML = `<div class="initiative-sde">(${totalSde.toFixed(2)} SDEs)</div>`;
                    }
                    const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(/\s+/g, '-')}`;
                    tableHTML += `<div class="initiative-card ${statusClass}" title="${init.description || init.title}" data-initiative-id="${init.initiativeId}"><div class="initiative-title">${init.title}</div>${sdeDisplayHTML}</div>`;
                });
            }
            tableHTML += `</div></td>`;
        }
        tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;

    // Event delegation for initiative cards
    container.querySelectorAll('.initiative-card').forEach(card => {
        card.addEventListener('click', () => {
            const initiativeId = card.getAttribute('data-initiative-id');
            if (initiativeId && typeof openRoadmapModalForEdit === 'function') {
                openRoadmapModalForEdit(initiativeId);
            }
        });
    });
}


function getQuarterFromDate(dateString) {
    if (!dateString) return null;
    try {
        const month = parseInt(dateString.substring(5, 7), 10);
        if (month >= 1 && month <= 3) return 'Q1';
        if (month >= 4 && month <= 6) return 'Q2';
        if (month >= 7 && month <= 9) return 'Q3';
        if (month >= 10 && month <= 12) return 'Q4';
        return null;
    } catch (e) { return null; }
}

// =================================================================
// 3-YEAR PLAN (3YP) FUNCTIONS
// =================================================================

function prepareDataFor3YPRoadmap() {
    const orgFilter = document.getElementById('roadmapOrgFilter3YP')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilter3YP')?.value || 'all';
    const themeCheckboxes = document.querySelectorAll('#theme-dropdown-panel3YP input.theme-checkbox-item:checked');
    const selectedThemes = Array.from(themeCheckboxes).map(cb => cb.value);

    let initiatives = currentSystemData.yearlyInitiatives || [];

    if (orgFilter !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => { if (sdm.seniorManagerId === orgFilter) { (currentSystemData.teams || []).forEach(team => { if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId); }); } });
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
    }

    if (teamFilter !== 'all') {
        initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamFilter));
    }

    const allThemeIds = (currentSystemData.definedThemes || []).map(t => t.themeId);
    if (selectedThemes.length < allThemeIds.length) {
        initiatives = initiatives.filter(init => {
            const initThemes = init.themes || [];
            if (initThemes.length === 0) return false;
            return initThemes.some(themeId => selectedThemes.includes(themeId));
        });
    }

    const roadmapData = {};
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
    const currentYear = new Date().getFullYear();

    initiatives.forEach(init => {
        const planningYear = init.attributes.planningYear;
        if (!planningYear) return;

        let yearBucket;
        if (planningYear === currentYear) { yearBucket = 'Current Year'; }
        else if (planningYear === currentYear + 1) { yearBucket = 'Next Year'; }
        else if (planningYear > currentYear + 1) { yearBucket = 'Future'; }
        else { return; }

        const assignedThemes = init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];
        assignedThemes.forEach(themeId => {
            const themeName = themeMap.get(themeId) || "Uncategorized";

            if (selectedThemes.length < allThemeIds.length && !selectedThemes.includes(themeId)) {
                return;
            }

            if (!roadmapData[themeName]) {
                roadmapData[themeName] = { 'Current Year': [], 'Next Year': [], 'Future': [] };
            }
            roadmapData[themeName][yearBucket].push(init);
        });
    });

    return roadmapData;
}

function render3YPRoadmap() {
    const container = document.getElementById('threeYearPlanContainer');
    if (!container) return;

    const roadmapData = prepareDataFor3YPRoadmap();
    const themes = Object.keys(roadmapData).sort();
    const currentYear = new Date().getFullYear();

    if (Object.keys(roadmapData).length === 0) {
        container.innerHTML = `<p class="roadmap-table-view__empty">No initiatives match the current filter criteria for the 3YP view.</p>`;
        return;
    }

    let tableHTML = `<table class="quarterly-roadmap-table">`;
    tableHTML += `<thead><tr><th>Theme</th><th>Current Year (${currentYear})</th><th>Next Year (${currentYear + 1})</th><th>Future (${currentYear + 2}+)</th></tr></thead>`;
    tableHTML += `<tbody>`;
    themes.forEach(themeName => {
        tableHTML += `<tr><td class="theme-cell">${themeName}</td>`;
        ['Current Year', 'Next Year', 'Future'].forEach(yearBucket => {
            const initiatives = roadmapData[themeName]?.[yearBucket] || [];
            tableHTML += `<td><div class="quarter-cell">`;
            if (initiatives.length > 0) {
                initiatives.sort((a, b) => (a.title || '').localeCompare(b.title || '')).forEach(init => {
                    const totalSde = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
                    let sdeDisplayHTML = `<div class="initiative-sde">(${totalSde.toFixed(2)} SDEs)</div>`;
                    const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(/\s+/g, '-')}`;
                    tableHTML += `<div class="initiative-card ${statusClass}" title="${init.description || init.title}" data-initiative-id="${init.initiativeId}"><div class="initiative-title">${init.title}</div>${sdeDisplayHTML}</div>`;
                });
            }
            tableHTML += `</div></td>`;
        });
        tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;

    container.innerHTML = tableHTML;

    // Event delegation for initiative cards
    container.querySelectorAll('.initiative-card').forEach(card => {
        card.addEventListener('click', () => {
            const initiativeId = card.getAttribute('data-initiative-id');
            if (initiativeId && typeof openRoadmapModalForEdit === 'function') {
                openRoadmapModalForEdit(initiativeId);
            }
        });
    });
}