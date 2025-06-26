// js/roadmapTableView.js

let roadmapTimelineTable = null; // To hold the Tabulator instance for this specific view

/**
 * Initializes the entire Roadmap Table View widget.
 * This is the main entry point called from dashboard.js.
 */
function initializeRoadmapTableView() {
    console.log("Initializing Roadmap Table View widget...");
    const container = document.getElementById('roadmapTimelineWidget');
    if (!container) {
        console.error("Roadmap Timeline Widget container not found.");
        return;
    }

    // Create the layout for filters and the table container
    container.innerHTML = `
        <div id="roadmapTableFilters" style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; gap: 20px;">
            </div>
        <div id="roadmapTimelineTableContainer"></div>
    `;

    generateRoadmapTableFilters();
    renderRoadmapTimelineTable(); // Initial render with default "All" filters
}

/**
 * Generates the interactive filter dropdowns for Org and Team.
 */
function generateRoadmapTableFilters() {
    const filtersContainer = document.getElementById('roadmapTableFilters');
    if (!filtersContainer) return;

    // --- Senior Manager (Org) Filter ---
    const orgFilterDiv = document.createElement('div');
    const orgLabel = document.createElement('label');
    orgLabel.htmlFor = 'roadmapOrgFilter';
    orgLabel.textContent = 'Filter by Organization:';
    orgLabel.style.fontWeight = 'bold';
    orgLabel.style.marginRight = '5px';
    
    const orgSelect = document.createElement('select');
    orgSelect.id = 'roadmapOrgFilter';
    orgSelect.onchange = () => renderRoadmapTimelineTable();
    
    orgSelect.innerHTML = '<option value="all">All Organizations</option>';
    (currentSystemData.seniorManagers || []).forEach(sm => {
        orgSelect.add(new Option(sm.seniorManagerName, sm.seniorManagerId));
    });
    orgFilterDiv.appendChild(orgLabel);
    orgFilterDiv.appendChild(orgSelect);

    // --- Team Filter ---
    const teamFilterDiv = document.createElement('div');
    const teamLabel = document.createElement('label');
    teamLabel.htmlFor = 'roadmapTeamFilter';
    teamLabel.textContent = 'Filter by Team:';
    teamLabel.style.fontWeight = 'bold';
    teamLabel.style.marginRight = '5px';

    const teamSelect = document.createElement('select');
    teamSelect.id = 'roadmapTeamFilter';
    teamSelect.onchange = () => renderRoadmapTimelineTable();

    teamSelect.innerHTML = '<option value="all">All Teams</option>';
    (currentSystemData.teams || []).sort((a,b) => (a.teamIdentity || a.teamName).localeCompare(b.teamIdentity || b.teamName)).forEach(team => {
        teamSelect.add(new Option(team.teamIdentity || team.teamName, team.teamId));
    });
    teamFilterDiv.appendChild(teamLabel);
    teamFilterDiv.appendChild(teamSelect);

    filtersContainer.appendChild(orgFilterDiv);
    filtersContainer.appendChild(teamFilterDiv);
}


/**
 * Prepares data for the quarterly roadmap table, applying filters and grouping.
 * @returns {Array} An array of objects, where each object represents a quarter and contains nested initiative data.
 */
function prepareDataForRoadmapTimeline() {
    const orgFilter = document.getElementById('roadmapOrgFilter')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilter')?.value || 'all';

    let initiatives = currentSystemData.yearlyInitiatives || [];

    // --- Apply Filters ---
    if (orgFilter !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgFilter) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) {
                        teamsInOrg.add(team.teamId);
                    }
                });
            }
        });
        initiatives = initiatives.filter(init => 
            (init.assignments || []).some(a => teamsInOrg.has(a.teamId))
        );
    }
    
    if (teamFilter !== 'all') {
        initiatives = initiatives.filter(init => 
            (init.assignments || []).some(a => a.teamId === teamFilter)
        );
    }

    // --- Group by Quarter ---
    const groupedByQuarter = {};
    initiatives.forEach(init => {
        const quarter = formatDateToQuarterYear(init.targetDueDate);
        if (!quarter) return;

        if (!groupedByQuarter[quarter]) {
            groupedByQuarter[quarter] = {
                quarter: quarter,
                initiatives: []
            };
        }
        groupedByQuarter[quarter].initiatives.push(init);
    });

    return Object.values(groupedByQuarter).sort((a, b) => {
        const [aQ, aY] = a.quarter.split(' ');
        const [bQ, bY] = b.quarter.split(' ');
        if (aY !== bY) return aY - bY;
        return aQ.substring(1) - bQ.substring(1);
    });
}


/**
 * Renders the timeline table using Tabulator's nested data feature.
 */
function renderRoadmapTimelineTable() {
    const tableContainer = document.getElementById('roadmapTimelineTableContainer');
    if (!tableContainer) return;

    const tableData = prepareDataForRoadmapTimeline();

    if (roadmapTimelineTable) {
        roadmapTimelineTable.destroy();
    }

    roadmapTimelineTable = new Tabulator(tableContainer, {
        data: tableData,
        layout: "fitColumns",
        placeholder: "No initiatives match the selected filters for any quarter.",
        dataTree: true,
        dataTreeStartExpanded: true,
        dataTreeChildField: "initiatives",
        columns: [
            { title: "Quarter", field: "quarter", width: 200, frozen: true },
            {
                title: "Total SDEs",
                field: "initiatives",
                width: 150,
                hozAlign: "center",
                formatter: (cell) => {
                    const initiatives = cell.getValue() || [];
                    const totalSDEs = initiatives.reduce((sum, init) => sum + (init.assignments || []).reduce((s, a) => s + (a.sdeYears || 0), 0), 0);
                    return `<strong>${totalSDEs.toFixed(2)}</strong>`;
                }
            }
        ],
        // FIX: Replaced the incorrect `rowFormatter` with the correct `dataTreeRowNestedFormatter`
        dataTreeRowNestedFormatter: (row) => {
            const holderEl = document.createElement("div");
            holderEl.style.backgroundColor = "#fafafa";
            holderEl.style.padding = "10px";
            
            const tableEl = document.createElement("div");
            holderEl.appendChild(tableEl);
            
            // Create and render the sub-table for initiatives within the quarter
            new Tabulator(tableEl, {
                layout: "fitColumns",
                data: row.getData().initiatives,
                columns: [
                    { title: "Initiative Title", field: "title", width: 300, tooltip: true },
                    { title: "Status", field: "status", width: 120 },
                    { title: "Owner", field: "owner.name", width: 150, formatter: (cell) => cell.getValue() || "N/A" },
                    { 
                        title: "Themes", field: "themes", formatter: (cell) => {
                            const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));
                            return (cell.getValue() || []).map(id => themeMap.get(id) || id).join(', ');
                        },
                        tooltip: true
                    },
                    { 
                        title: "SDE-Years", field: "assignments", width: 120, hozAlign: "center", formatter: (cell) => {
                            return (cell.getValue() || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0).toFixed(2);
                        }
                    }
                ]
            });

            return holderEl;
        },
    });
}