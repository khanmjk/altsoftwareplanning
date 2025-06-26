// js/roadmapTableView.js

let roadmapTimelineTable = null; // To hold the Tabulator instance for this specific view

/**
 * Initializes the entire Roadmap Table View widget.
 * This is the main entry point called from dashboard.js.
 */
function initializeRoadmapTableView() {
    console.log("Initializing new Quarterly Roadmap Swimlane View widget...");
    const container = document.getElementById('roadmapTimelineWidget');
    if (!container) {
        console.error("Roadmap Timeline Widget container not found.");
        return;
    }

    container.innerHTML = `
        <div id="roadmapTableFilters" style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 20px;">
            </div>
        <div id="quarterlyRoadmapContainer" style="overflow-x: auto;"></div>
    `;

    generateRoadmapTableFilters();
    renderQuarterlyRoadmap(); 
}

/**
 * Generates the interactive filter dropdowns for Org and Team.
 */
function generateRoadmapTableFilters() {
    const filtersContainer = document.getElementById('roadmapTableFilters');
    if (!filtersContainer) return;

    filtersContainer.innerHTML = ''; // Clear existing filters

    const createFilter = (id, labelText, options, onChange) => {
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;
        label.style.fontWeight = 'bold';
        label.style.marginRight = '5px';
        
        const select = document.createElement('select');
        select.id = id;
        select.onchange = onChange;
        select.innerHTML = options;
        
        div.appendChild(label);
        div.appendChild(select);
        return div;
    };

    // --- Organization (Senior Manager) Filter ---
    let orgOptions = '<option value="all">All Organizations</option>';
    (currentSystemData.seniorManagers || []).forEach(sm => {
        orgOptions += `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`;
    });
    const handleOrgChange = () => {
        updateTeamFilterOptions();
        renderQuarterlyRoadmap();
    };
    filtersContainer.appendChild(createFilter('roadmapOrgFilter', 'Filter by Organization:', orgOptions, handleOrgChange));

    // --- Team Filter (initially empty, will be populated) ---
    const teamFilterDiv = document.createElement('div');
    const teamLabel = document.createElement('label');
    teamLabel.htmlFor = 'roadmapTeamFilter';
    teamLabel.textContent = 'Filter by Team:';
    teamLabel.style.fontWeight = 'bold';
    teamLabel.style.marginRight = '5px';
    const teamSelect = document.createElement('select');
    teamSelect.id = 'roadmapTeamFilter';
    teamSelect.onchange = renderQuarterlyRoadmap;
    
    teamFilterDiv.appendChild(teamLabel);
    teamFilterDiv.appendChild(teamSelect);
    filtersContainer.appendChild(teamFilterDiv);

    updateTeamFilterOptions();
}

/**
 * Updates the options in the team filter based on the selected organization.
 */
function updateTeamFilterOptions() {
    const orgFilterValue = document.getElementById('roadmapOrgFilter')?.value || 'all';
    const teamSelect = document.getElementById('roadmapTeamFilter');
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

/**
 * Prepares and structures the data for the quarterly roadmap display.
 */
function prepareDataForQuarterlyRoadmap() {
    const yearFilter = dashboardPlanningYear; 
    const orgFilter = document.getElementById('roadmapOrgFilter')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilter')?.value || 'all';

    let initiatives = currentSystemData.yearlyInitiatives || [];

    // --- Filter Initiatives ---
    if (yearFilter !== 'all') {
        initiatives = initiatives.filter(init => init.attributes.planningYear == yearFilter);
    }

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

    // --- Group Data by Theme, then by Quarter ---
    const roadmapData = {};
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));

    initiatives.forEach(init => {
        const quarter = getQuarterFromDate(init.targetDueDate);
        if (!quarter) return;

        const assignedThemes = init.themes && init.themes.length > 0 ? init.themes : ['uncategorized'];

        assignedThemes.forEach(themeId => {
            const themeName = themeMap.get(themeId) || "Uncategorized";
            if (!roadmapData[themeName]) {
                roadmapData[themeName] = { Q1: [], Q2: [], Q3: [], Q4: [] };
            }
            roadmapData[themeName][quarter].push(init);
        });
    });

    return roadmapData;
}

/**
 * Renders the new quarterly roadmap table.
 * FIX: Displays team breakdown correctly even if only one team from an org is assigned.
 */
function renderQuarterlyRoadmap() {
    const container = document.getElementById('quarterlyRoadmapContainer');
    if (!container) return;

    const roadmapData = prepareDataForQuarterlyRoadmap();
    const themes = Object.keys(roadmapData).sort();
    const orgFilter = document.getElementById('roadmapOrgFilter')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilter')?.value || 'all';

    if (themes.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #777; margin-top: 20px;">No initiatives match the current filter criteria.</p>`;
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
                            if (sdm.seniorManagerId === orgFilter) {
                                (currentSystemData.teams || []).forEach(team => {
                                    if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                                });
                            }
                        });
                        
                        const orgAssignments = (init.assignments || []).filter(a => teamsInOrg.has(a.teamId));
                        const orgSde = orgAssignments.reduce((sum, a) => sum + (a.sdeYears || 0), 0);

                        let breakdownHTML = '';
                        // *** FIX: Show breakdown if ANY teams from the org are assigned ***
                        if (orgAssignments.length > 0) { 
                            breakdownHTML = orgAssignments.map(a => {
                                const team = currentSystemData.teams.find(t => t.teamId === a.teamId);
                                const teamName = team ? (team.teamIdentity || team.teamName) : "Unknown Team";
                                return `<div class="initiative-sde-breakdown">${teamName}: ${a.sdeYears.toFixed(2)}</div>`;
                            }).join('');
                        }
                        
                        sdeDisplayHTML = `<div class="initiative-sde">Org Total: ${orgSde.toFixed(2)} of ${totalSde.toFixed(2)} SDEs</div>${breakdownHTML}`;
                    } else {
                        sdeDisplayHTML = `<div class="initiative-sde">(${totalSde.toFixed(2)} SDEs)</div>`;
                    }

                    const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(/\s+/g, '-')}`;
                    tableHTML += `
                        <div class="initiative-card ${statusClass}" 
                             title="${init.description || init.title}" 
                             onclick="openRoadmapModalForEdit('${init.initiativeId}')">
                            <div class="initiative-title">${init.title}</div>
                            ${sdeDisplayHTML}
                        </div>
                    `;
                });
            }
            tableHTML += `</div></td>`;
        }
        tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;
    
    container.innerHTML = tableHTML;
}


/**
 * Helper function to get the quarter (Q1, Q2, Q3, Q4) from a date string.
 */
function getQuarterFromDate(dateString) {
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