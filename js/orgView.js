/** REVISED Builds hierarchical data for Organogram - Adds Away-Team Info */
function buildHierarchyData() {
    console.log("Building hierarchy data with away-team info...");
    if (!currentSystemData) return null;

    // Create maps for efficient lookup
    const sdmMap = new Map((currentSystemData.sdms || []).map(sdm => [sdm.sdmId, { ...sdm, children: [], type: 'sdm' }])); // Add type
    const srMgrMap = new Map((currentSystemData.seniorManagers || []).map(sr => [sr.seniorManagerId, { ...sr, children: [], type: 'srMgr' }])); // Add type

    // Nest SDMs under Senior Managers
    sdmMap.forEach(sdm => {
        if (sdm.seniorManagerId && srMgrMap.has(sdm.seniorManagerId)) {
            srMgrMap.get(sdm.seniorManagerId).children.push(sdm);
        } else {
            // Handle SDMs without a valid Senior Manager
            const unassignedSrMgrKey = 'unassigned-sr-mgr';
            if (!srMgrMap.has(unassignedSrMgrKey)) {
                srMgrMap.set(unassignedSrMgrKey, { seniorManagerId: unassignedSrMgrKey, seniorManagerName: 'Unassigned Senior Manager', children: [], type: 'srMgr' });
            }
            if(sdm && sdm.sdmId) srMgrMap.get(unassignedSrMgrKey).children.push(sdm);
        }
    });

    // Nest Teams under SDMs
    (currentSystemData.teams || []).forEach(team => {
        const awayTeamCount = team.awayTeamMembers?.length ?? 0; // Calculate away team count
        const sourceSummary = getSourceSummary(team.awayTeamMembers); // Get source summary

        const teamNode = {
            name: team.teamIdentity || team.teamName || 'Unnamed Team',
            type: 'team',
            details: `BIS: ${team.engineers?.length ?? 0} / Funded: ${team.fundedHeadcount ?? 'N/A'}`, // Show Team BIS vs Funded here
            awayTeamCount: awayTeamCount, // Store away team count
            awaySourceSummary: sourceSummary, // Store source summary
            children: (team.engineers || []).map(eng => ({
                name: `${eng.name || 'Unnamed'} (L${eng.level ?? '?'})`,
                type: 'engineer'
            }))
        };

        if (team.sdmId && sdmMap.has(team.sdmId)) {
            sdmMap.get(team.sdmId).children.push(teamNode);
        } else {
            // Handle Teams without a valid SDM
            const unassignedSdmKey = 'unassigned-sdm';
            if (!sdmMap.has(unassignedSdmKey)) {
                sdmMap.set(unassignedSdmKey, { sdmId: unassignedSdmKey, sdmName: 'Unassigned SDM', children: [], type: 'sdm' });
                // Add this unassigned SDM group under the unassigned Sr Mgr group
                const unassignedSrMgrKey = 'unassigned-sr-mgr';
                if (!srMgrMap.has(unassignedSrMgrKey)) {
                     srMgrMap.set(unassignedSrMgrKey, { seniorManagerId: unassignedSrMgrKey, seniorManagerName: 'Unassigned Senior Manager', children: [], type: 'srMgr' });
                }
                srMgrMap.get(unassignedSrMgrKey).children.push(sdmMap.get(unassignedSdmKey));
            }
            if(team && team.teamId) sdmMap.get(unassignedSdmKey).children.push(teamNode);
        }
    });

    // Define the root node
    const root = {
        name: currentSystemData.systemName || 'Organization',
        type: 'root',
        children: Array.from(srMgrMap.values()) // Use Sr Mgrs as top-level children
    };

    console.log("Finished building hierarchy data.");
    return root;
}

/** REVISED Generates the Organogram using HTML structure - Displays Away-Team Annotation */
function generateOrganogram() {
    console.log("Generating Organogram HTML...");
    const hierarchicalData = buildHierarchyData(); // Get data with away-team info
    const container = document.getElementById('organogramContent');
    if (!hierarchicalData || !container) {
        console.error("No data or container for organogram HTML.");
        if(container) container.innerHTML = '<p style="color: red;">Could not generate organogram data.</p>';
        return;
    }
    container.innerHTML = ''; // Clear previous content
    container.style.fontFamily = 'Arial, sans-serif'; // Ensure consistent font

    // Recursive function to build nested HTML
    function buildHtmlLevel(node, level) {
        if (!node) return '';

        // Indentation and Styling
        let html = `<div class="org-level-${level}" style="margin-left: ${level * 25}px; margin-bottom: 5px; padding: 3px 5px; border-left: 2px solid #eee; position: relative;">`;
        let nodeContent = '';
        let nodeStyle = '';
        let detailsStyle = 'font-size: 0.8em; color: #555; margin-left: 5px;';

        // Define content and style based on node type
        switch(node.type) {
            case 'root':
                nodeContent = `<strong>System: ${node.name || 'N/A'}</strong>`;
                nodeStyle = 'font-size: 1.2em; color: #333;';
                break;
            case 'srMgr':
                 nodeContent = `<strong title="${node.seniorManagerId || ''}">Sr. Manager: ${node.seniorManagerName || node.name || 'N/A'}</strong>`;
                 nodeStyle = 'font-size: 1.1em; color: #0056b3;';
                break;
            case 'sdm':
                 nodeContent = `<strong title="${node.sdmId || ''}">SDM: ${node.sdmName || node.name || 'N/A'}</strong>`;
                 nodeStyle = 'color: #007bff;';
                break;
            case 'team':
                // *** CORRECTED LINE: Removed title attribute using undefined 'team' variable ***
                nodeContent = `<span style="color: #17a2b8;">Team: ${node.name || 'N/A'}</span> <span style="${detailsStyle}">(${node.details || ''})</span>`;
                // *****************************************************************************
                // Add Away-Team Annotation
                if (node.awayTeamCount > 0) {
                    const awaySourceText = node.awaySourceSummary || 'Source Unknown';
                    // Add tooltip to the annotation itself
                    const annotation = ` <span style="color: #dc3545; font-style: italic; font-size: 0.9em;" title="Away-Team Sources: ${awaySourceText}">(+${node.awayTeamCount} Away)</span>`;
                    nodeContent += annotation;
                }
                break;
            case 'engineer':
                nodeContent = `<span style="font-size: 0.9em;">${node.name || 'N/A'}</span>`;
                break;
            default:
                nodeContent = `<strong>${node.name || 'Group'}</strong>`;
                nodeStyle = 'color: #6c757d;';
        }

        // Apply style to a wrapper span for the main content
        html += `<span style="${nodeStyle}">${nodeContent}</span>`;

        // Recursively add children (excluding engineers directly under teams)
        if (node.children && node.children.length > 0 && node.type !== 'team') {
            node.children.forEach(child => {
                if (!child.type) { /* ... infer type ... */
                    if (level === 0) child.type = 'srMgr'; else if (level === 1) child.type = 'sdm'; else if (level === 2) child.type = 'team'; else if (level === 3 && node.type === 'team') child.type = 'engineer';
                }
                if (child.type !== 'engineer') { html += buildHtmlLevel(child, level + 1); }
            });
        }
        // Optional: Explicitly list engineers under team (currently commented out)
        /* else if (node.type === 'team' && node.children && node.children.length > 0) { ... } */

        html += `</div>`;
        return html;
    } // --- End buildHtmlLevel ---

    // Start building from the root (level 0)
    container.innerHTML = buildHtmlLevel(hierarchicalData, 0);
    console.log("Finished generating Organogram HTML (v2 - Fix).");
}

/** Generates the HTML table for engineers */
/** REVISED Generates the HTML table for engineers - Adds Row Counter & Away-Team Indicator */
function generateEngineerTable() {
    console.log("Generating Engineer Table with Counter & Away Indicator..."); // Log start

    // --- Get Table Elements ---
    const engineerTableView = document.getElementById('engineerTableView');
    const table = document.getElementById('engineerTable');
    const tableHead = table?.querySelector('thead'); // Get the thead
    const tableBody = table?.querySelector('tbody');
    const tableFoot = table?.querySelector('tfoot'); // Get tfoot (though not directly used here)
    const heading = document.getElementById('engineerTableHeading');

    // --- Basic Data & Element Checks ---
    if (!currentSystemData || !currentSystemData.teams) { /* ... no change ... */
        console.error("Cannot generate engineer table: No system or team data loaded.");
        if(heading) heading.innerText = 'Engineer Resource List (Error: No Data)';
        if(tableBody) tableBody.innerHTML = '';
        return;
     }
    if (!table || !tableHead || !tableBody || !heading) { /* ... no change ... */
         console.error("Cannot generate engineer table: Required HTML elements not found (table, thead, tbody, or heading).");
         if(engineerTableView) engineerTableView.style.display = 'none';
         return;
     }
    tableBody.innerHTML = ''; // Clear existing rows

    // --- 1. Update Column Headers (Add '#' column) ---
    const headerRow = tableHead.querySelector('tr');
    headerRow.innerHTML = ''; // Clear existing headers

    // Define headers including the new '#' column
    const headersConfig = [
        { text: '#', title: 'Row Number' }, // NEW Counter Column
        { text: 'Engineer Name', title: 'Name of the engineer. (Away) indicates an away-team resource.', key: 'name'},
        { text: 'Level', title: 'Skill level of the engineer (L1-L5).', key: 'level'},
        { text: 'Team Name', title: 'The team the engineer is currently assigned to.', key: 'teamName'},
        { text: 'SDM Name', title: 'Software Development Manager for the assigned team.', key: 'sdmName'},
        { text: 'Senior Manager Name', title: 'Senior Manager overseeing the SDM.', key: 'srMgrName'}
    ];

    headersConfig.forEach(config => {
        const th = document.createElement('th');
        th.textContent = config.text;
        th.title = config.title;
        th.style.border = '1px solid #ccc';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.backgroundColor = '#f2f2f2';
        th.style.position = 'sticky';
        th.style.top = '0';
        th.style.zIndex = '1';
        // Add sort key and cursor pointer if defined
        if (config.key) {
            th.setAttribute('data-sort-key', config.key);
            th.style.cursor = 'pointer';
        }
        headerRow.appendChild(th);
    });
     // --- End Header Update ---

    // --- 2. Calculate System-Wide Totals (No change from previous step) ---
    let totalFundedHC = 0;
    let totalTeamBIS = 0;
    let totalAwayTeamBIS = 0;
    let totalEffectiveBIS = 0;
    let engineerListData = [];

    const sdmsMap = new Map((currentSystemData.sdms || []).map(s => [s.sdmId, s]));
    const srMgrsMap = new Map((currentSystemData.seniorManagers || []).map(s => [s.seniorManagerId, s]));

    currentSystemData.teams.forEach(team => {
        const currentFunded = team.fundedHeadcount ?? 0;
        const currentTeamBIS = team.engineers?.length ?? 0;
        const currentAwayTeamBIS = team.awayTeamMembers?.length ?? 0;

        totalFundedHC += currentFunded;
        totalTeamBIS += currentTeamBIS;
        totalAwayTeamBIS += currentAwayTeamBIS;
        totalEffectiveBIS += (currentTeamBIS + currentAwayTeamBIS);

        // Add regular engineers to list
        (team.engineers || []).forEach(eng => { /* ... no change ... */
             if (!eng || !eng.name) return;
             const sdm = team.sdmId ? sdmsMap.get(team.sdmId) : null;
             const srMgr = sdm ? srMgrsMap.get(sdm.seniorManagerId) : null;
             engineerListData.push({
                 name: eng.name, level: eng.level ?? 'N/A',
                 teamName: team.teamName || team.teamIdentity || 'N/A',
                 sdmName: sdm ? sdm.sdmName : 'N/A', srMgrName: srMgr ? srMgr.seniorManagerName : 'N/A',
                 isAwayTeam: false // Explicitly false for regular members
             });
        });
        // Add away team members to list
        (team.awayTeamMembers || []).forEach(awayEng => { /* ... no change ... */
              if (!awayEng || !awayEng.name) return;
              const sdm = team.sdmId ? sdmsMap.get(team.sdmId) : null;
              const srMgr = sdm ? srMgrsMap.get(sdm.seniorManagerId) : null;
              engineerListData.push({
                  name: awayEng.name, level: awayEng.level ?? 'N/A',
                  teamName: team.teamName || team.teamIdentity || 'N/A', // Assigned team
                  sdmName: sdm ? sdm.sdmName : 'N/A', srMgrName: srMgr ? srMgr.seniorManagerName : 'N/A',
                  isAwayTeam: true, // Flag as away team
                  sourceTeam: awayEng.sourceTeam || 'Unknown Source' // Include source
              });
        });
    });

    const totalHiringGap = totalFundedHC - totalTeamBIS;
    // --- End Total Calculations ---

    // --- 3. Update Heading Text (No change from previous step) ---
    heading.innerText = `Engineer Resource List (Funded: ${totalFundedHC} | Team BIS: ${totalTeamBIS} | Away BIS: ${totalAwayTeamBIS} | Effective BIS: ${totalEffectiveBIS} | Hiring Gap: ${totalHiringGap})`;
    heading.style.color = totalHiringGap < 0 ? 'blue' : (totalHiringGap > 0 ? 'darkorange' : 'green');
    heading.title = `Finance Approved Funding: ${totalFundedHC}\nActual Team Members (BIS): ${totalTeamBIS}\nAway-Team Members: ${totalAwayTeamBIS}\nTotal Effective Capacity (Team + Away): ${totalEffectiveBIS}\nHiring Gap (Funded - Team BIS): ${totalHiringGap}`;
    // --- End Heading Update ---

    // --- 4. Sorting (No change from previous step) ---
    engineerListData.sort((a, b) => { /* ... no changes ... */
        const key = engineerSortState.key;
        const ascending = engineerSortState.ascending;
        let valA = a[key];
        let valB = b[key];
        if (key === 'level') {
           valA = (typeof valA === 'number') ? valA : -1;
           valB = (typeof valB === 'number') ? valB : -1;
           return ascending ? valA - valB : valB - valA;
        }
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
     });
    // --- End Sorting ---

    // --- 5. Populate Table Body (Add counter and away indicator) ---
    let rowCounter = 1; // Initialize counter
    engineerListData.forEach(engData => {
        let row = tableBody.insertRow();

        // NEW: Insert Counter Cell
        const counterCell = row.insertCell();
        counterCell.textContent = rowCounter++;
        counterCell.style.textAlign = 'center';
        counterCell.style.fontSize = '0.9em';
        counterCell.style.color = '#666';

        // Engineer Name Cell (with Away indicator)
        const nameCell = row.insertCell();
        let nameDisplay = engData.name;
        if (engData.isAwayTeam) {
            nameDisplay = `(Away) ${engData.name}`; // Add prefix
            nameCell.title = `Away-Team member from: ${engData.sourceTeam}`; // Add tooltip
            nameCell.style.fontStyle = 'italic'; // Style away team members
            nameCell.style.color = '#0056b3'; // Example different color
        }
        nameCell.textContent = nameDisplay;

        // Other Cells (no change in logic)
        row.insertCell().textContent = engData.level;
        row.insertCell().textContent = engData.teamName;
        row.insertCell().textContent = engData.sdmName;
        row.insertCell().textContent = engData.srMgrName;
    });
    // --- End Populate Table ---

    // --- 6. Add Sorting Click Handlers (Update sort indicators) ---
    document.querySelectorAll('#engineerTable th[data-sort-key]').forEach(th => {
        const handler = (event) => handleSortClick(event);
        th.removeEventListener('click', th.__sortHandler); // Use stored handler reference
        th.addEventListener('click', handler);
        th.__sortHandler = handler; // Store handler reference

        // Update sort indicator
        const key = th.getAttribute('data-sort-key');
        let indicator = ' \u2195'; // Default: Up/Down arrow
        // Clear any existing indicator before adding new one
        let currentText = th.textContent.replace(/ [\u2195\u25B2\u25BC]/g, '');
        if (key === engineerSortState.key) {
            indicator = engineerSortState.ascending ? ' \u25B2' : ' \u25BC'; // Up or Down arrow
        }
        th.textContent = currentText + indicator;
    });
    // --- End Sorting Handlers ---
    console.log("Finished generating Engineer Table with counter & away indicator."); // Log end
}

// Keep handleSortClick, showOrganogramView, showEngineerTableView functions as they were.
// Make sure buildHierarchyData also still exists.

/** Handles clicking on sortable table headers */
function handleSortClick(event) {
    const key = event.target.getAttribute('data-sort-key');
    if (!key) return;

    if (engineerSortState.key === key) {
        engineerSortState.ascending = !engineerSortState.ascending; // Toggle direction
    } else {
        engineerSortState.key = key; // Change sort key
        engineerSortState.ascending = true; // Default to ascending
    }
    generateEngineerTable(); // Re-generate table with new sort order
}

/** DEBUGGING VERSION - Generate Team Breakdown Table - Adds Extensive Logging */
function generateTeamTable(systemData) {
    console.log("[DEBUG] ENTER generateTeamTable"); // Log function entry

    const teamTable = document.getElementById('teamTable');
    console.log("[DEBUG] Found teamTable element:", teamTable); // Log table element found

    // Add checks immediately after getting elements
    if (!teamTable) {
        console.error("[DEBUG] EXIT generateTeamTable: Could not find #teamTable element.");
        if (document.getElementById('teamBreakdown')) {
             document.getElementById('teamBreakdown').innerHTML = '<p style="color:red;">Error: Cannot find table element with ID "teamTable".</p>';
        }
        return;
    }

    const tableHead = teamTable.querySelector('thead'); // Removed optional chaining temporarily for clearer errors if teamTable is null
    const tableBody = teamTable.querySelector('tbody');
    const tableFoot = teamTable.querySelector('tfoot');
    console.log("[DEBUG] Found thead:", tableHead);
    console.log("[DEBUG] Found tbody:", tableBody);
    console.log("[DEBUG] Found tfoot:", tableFoot);

    if (!tableHead || !tableBody || !tableFoot) {
        console.error("[DEBUG] EXIT generateTeamTable: Could not find required inner table elements (thead, tbody, tfoot).");
        if (document.getElementById('teamBreakdown')) {
             document.getElementById('teamBreakdown').innerHTML = '<p style="color:red;">Error: Table structure incomplete (missing thead/tbody/tfoot).</p>';
        }
        return;
    }
    console.log("[DEBUG] All table elements found. Proceeding to clear content...");

    // --- Clear previous content ---
    try {
        tableBody.innerHTML = '';
        tableHead.innerHTML = '';
        tableFoot.innerHTML = '';
        console.log("[DEBUG] Cleared table head, body, and foot.");
    } catch (error) {
        console.error("[DEBUG] EXIT generateTeamTable: Error clearing table content:", error);
        return;
    }

    // --- 1. Rebuild Column Headers ---
    console.log("[DEBUG] Rebuilding column headers...");
    const headerRow = tableHead.insertRow();
    const headersConfig = [ /* ... headersConfig array remains the same ... */
        { text: 'Senior Manager', title: 'Senior Manager overseeing the SDM(s).' },
        { text: 'SDM', title: 'Software Development Manager for the team(s).' },
        { text: 'Team Identity', title: 'Unique identifier or codename for the team.' },
        { text: 'Team Name', title: 'Official name of the team.' },
        { text: 'PMT', title: 'Product Management counterpart for the team.' },
        { text: 'Team BIS', title: 'Builders In Seats: Count of actual engineers assigned to this team.' },
        { text: 'Finance Approved Funding', title: 'Official budgeted headcount allocated by finance.' },
        { text: 'Effective BIS to deliver initiatives', title: 'Total building capacity including team members and away-team resources (Team BIS + Away-Team BIS).' },
        { text: 'BIS Hiring Gap', title: 'Gap between Finance Approved Funding and actual Team BIS (Funded - Team BIS). Shows hiring need.' },
        { text: 'Engineers (Level)', title: 'List of engineers assigned to this team and their level.' },
        { text: 'Away-Team Members', title: 'List of engineers borrowed from other teams/orgs, their level, and source.' },
        { text: 'Services Owned', title: 'List of services this team owns.' }
     ];
    try {
        headersConfig.forEach(config => {
            const th = document.createElement('th');
            th.textContent = config.text;
            th.title = config.title;
            th.style.border = '1px solid #ccc'; th.style.padding = '8px'; th.style.textAlign = 'left';
            th.style.backgroundColor = '#f2f2f2'; th.style.position = 'sticky'; th.style.top = '0'; th.style.zIndex = '1';
            headerRow.appendChild(th);
        });
        console.log("[DEBUG] Successfully rebuilt headers.");
    } catch (error) {
        console.error("[DEBUG] EXIT generateTeamTable: Error rebuilding headers:", error);
        return;
    }
    // --- End Header Rebuild ---

    // --- 2. Defensive checks for core data ---
    console.log("[DEBUG] Performing defensive data checks...");
    if (!systemData || !systemData.teams || !Array.isArray(systemData.teams)) {
        console.error("[DEBUG] EXIT generateTeamTable: Invalid or missing systemData.teams");
        let errRow = tableBody.insertRow(); let cell = errRow.insertCell();
        cell.colSpan = headersConfig.length; cell.textContent = "Error: Team data is missing or invalid."; cell.style.color = 'red';
        tableFoot.innerHTML = '';
        const levelKeyElement = document.getElementById('levelKey'); if (levelKeyElement) levelKeyElement.innerHTML = '';
        return;
    }
    const services = systemData.services || []; const sdms = systemData.sdms || []; const pmts = systemData.pmts || []; const seniorManagers = systemData.seniorManagers || [];
    console.log("[DEBUG] Data checks passed.");
    // --- End Defensive Checks ---

    // --- 3. Totals Initialization ---
    let totalFundedHC = 0; let totalTeamBIS = 0; let totalEffectiveBIS = 0;
    console.log("[DEBUG] Initialized totals.");
    // --- End Totals Init ---

    // --- 4. Helper Functions --- (Defined but not logged during definition)
    const getSeniorManagerName = (srMgrId) => { if (!srMgrId) return 'No Senior Manager'; const srMgr = seniorManagers.find(s => s.seniorManagerId === srMgrId); return srMgr ? srMgr.seniorManagerName : `Unknown (${srMgrId})`; };
    const getSdmName = (sdmId) => { if (!sdmId) return 'No SDM'; const sdm = sdms.find(s => s.sdmId === sdmId); return sdm ? sdm.sdmName : `Unknown (${sdmId})`; };
    const getPmtName = (pmtId) => { if (!pmtId) return 'N/A'; const pmt = pmts.find(p => p.pmtId === pmtId); return pmt ? pmt.pmtName : `Unknown (${pmtId})`; };
    // --- End Helpers ---

    // --- 5. Map teamId to services ---
    console.log("[DEBUG] Mapping services to teams...");
    let teamServicesMap = {};
    try {
        services.forEach(service => { let teamId = service.owningTeamId; if (teamId) { if (!teamServicesMap[teamId]) teamServicesMap[teamId] = []; teamServicesMap[teamId].push(service.serviceName); } });
        console.log("[DEBUG] Service mapping complete.");
    } catch(error) {
        console.error("[DEBUG] EXIT generateTeamTable: Error mapping services:", error);
        return;
    }
    // --- End Service Map ---

    // --- 6. Group teams by Senior Manager -> SDM ---
    console.log("[DEBUG] Grouping teams...");
    let groupedData = {};
    try {
        systemData.teams.forEach(team => { if (!team) return; const sdm = sdms.find(s => s.sdmId === team.sdmId); const srMgrId = sdm ? (sdm.seniorManagerId || 'no-sr-mgr') : 'no-sdm'; const sdmId = team.sdmId || 'no-sdm'; if (!groupedData[srMgrId]) groupedData[srMgrId] = {}; if (!groupedData[srMgrId][sdmId]) groupedData[srMgrId][sdmId] = []; groupedData[srMgrId][sdmId].push(team); });
        console.log("[DEBUG] Team grouping complete.");
    } catch (error) {
        console.error("[DEBUG] EXIT generateTeamTable: Error grouping teams:", error);
        return;
    }
    // --- End Grouping ---

    // --- 7. Populate Table Body ---
    console.log("[DEBUG] Starting table body population...");
    try {
        let rowCount = 0;
        for (const srMgrId in groupedData) {
            // ... (rest of the body population logic - no changes, just wrapped in try) ...
            const srMgrData = groupedData[srMgrId];
            const srMgrNameDisplay = (srMgrId === 'no-sr-mgr' || srMgrId === 'no-sdm') ? 'No Assigned Senior Manager' : getSeniorManagerName(srMgrId);
            let isFirstRowForSrMgr = true;
            let srMgrRowspan = 0;
            for (const sdmId in srMgrData) { srMgrRowspan += srMgrData[sdmId].length; }

            for (const sdmId in srMgrData) {
                const teams = srMgrData[sdmId];
                const sdmNameDisplay = (sdmId === 'no-sdm') ? 'No Assigned SDM' : getSdmName(sdmId);
                let isFirstRowForSdm = true;

                teams.forEach((team) => {
                    if (!team) return;
                    let row = tableBody.insertRow();
                    rowCount++;

                    // Standard Grouping Cells
                    if (isFirstRowForSrMgr) { let srMgrCell = row.insertCell(); srMgrCell.innerText = srMgrNameDisplay; srMgrCell.rowSpan = srMgrRowspan; srMgrCell.style.verticalAlign = 'top'; isFirstRowForSrMgr = false; }
                    if (isFirstRowForSdm) { let sdmCell = row.insertCell(); sdmCell.innerText = sdmNameDisplay; sdmCell.rowSpan = teams.length; sdmCell.style.verticalAlign = 'top'; isFirstRowForSdm = false; }
                    row.insertCell().innerText = team.teamIdentity || 'N/A';
                    row.insertCell().innerText = team.teamName || 'N/A';
                    row.insertCell().innerText = getPmtName(team.pmtId);

                    // Capacity Calculations & Cells
                    const fundedHC = team.fundedHeadcount ?? 0;
                    const teamBIS = team.engineers?.length ?? 0;
                    const awayTeamBIS = team.awayTeamMembers?.length ?? 0;
                    const effectiveBIS = teamBIS + awayTeamBIS;
                    const hiringGap = fundedHC - teamBIS;

                    const teamBISCell = row.insertCell(); teamBISCell.innerText = teamBIS; teamBISCell.style.textAlign = 'center';
                    row.insertCell().innerText = fundedHC.toFixed(2);
                    const effectiveBISCell = row.insertCell(); effectiveBISCell.innerText = effectiveBIS.toFixed(2); effectiveBISCell.title = `Team BIS: ${teamBIS}, Away-Team BIS: ${awayTeamBIS}`; effectiveBISCell.style.textAlign = 'center'; if (awayTeamBIS > 0) effectiveBISCell.style.fontWeight = 'bold';
                    let hiringGapCell = row.insertCell(); hiringGapCell.innerText = hiringGap; hiringGapCell.style.color = hiringGap < 0 ? 'blue' : (hiringGap > 0 ? 'orange' : 'green'); hiringGapCell.style.textAlign = 'center'; if (hiringGap < 0) { hiringGapCell.title = `Team BIS (${teamBIS}) exceeds Funded HC (${fundedHC}) by ${Math.abs(hiringGap)}`; hiringGapCell.style.fontWeight = 'bold'; } else if (hiringGap > 0) { hiringGapCell.title = `Need to hire ${hiringGap} to reach Funded HC (${fundedHC})`; } else { hiringGapCell.title = `Team BIS matches Funded HC`; }

                    // Accumulate Totals
                    totalFundedHC += fundedHC; totalTeamBIS += teamBIS; totalEffectiveBIS += effectiveBIS;

                    // Engineers (Level) Cell
                    let engineersCell = row.insertCell(); if (team.engineers && Array.isArray(team.engineers) && team.engineers.length > 0) { engineersCell.innerHTML = team.engineers .map(eng => { if (typeof eng !== 'object' || eng === null) return 'Invalid Eng Data'; const name = eng.name || 'Unnamed'; const level = eng.level ?? '?'; return name + ' (L' + level + ')'; }) .join('<br>'); } else { engineersCell.innerText = 'None'; } engineersCell.style.whiteSpace = 'pre-line';

                    // Away-Team Members Cell
                    let awayTeamCell = row.insertCell(); if (team.awayTeamMembers && Array.isArray(team.awayTeamMembers) && team.awayTeamMembers.length > 0) { awayTeamCell.innerHTML = team.awayTeamMembers .map(awayEng => { if (typeof awayEng !== 'object' || awayEng === null) return 'Invalid Away Data'; const name = awayEng.name || 'Unnamed'; const level = awayEng.level ?? '?'; const source = awayEng.sourceTeam || 'Unknown Source'; return `${name} (L${level}) - ${source}`; }) .join('<br>'); } else { awayTeamCell.innerText = 'None'; } awayTeamCell.style.whiteSpace = 'pre-line'; awayTeamCell.style.fontSize = '0.9em'; awayTeamCell.style.color = '#333';

                    // Services Owned Cell
                    let servicesOwnedCell = row.insertCell(); servicesOwnedCell.innerText = team.teamId && teamServicesMap[team.teamId] ? teamServicesMap[team.teamId].join(', ') : 'None';
                }); // End teams.forEach
            } // End sdmId loop
        } // End srMgrId loop
        console.log(`[DEBUG] Finished table body population. Inserted ${rowCount} rows.`);
    } catch (error) {
         console.error("[DEBUG] EXIT generateTeamTable: Error populating table body:", error);
         return;
    }
    // --- End Populate Body ---

    // --- 8. REBUILD Footer Totals ---
    console.log("[DEBUG] Rebuilding footer...");
    try {
        const totalHiringGap = totalFundedHC - totalTeamBIS;
        let footerRow1 = tableFoot.insertRow();

        let totalsLabelCell = footerRow1.insertCell();
        totalsLabelCell.textContent = 'Totals:';
        totalsLabelCell.colSpan = 5; // Using explicit 5
        totalsLabelCell.style.textAlign = 'right';
        totalsLabelCell.style.fontWeight = 'bold';

        let totalTeamBISCell = footerRow1.insertCell(); totalTeamBISCell.textContent = totalTeamBIS.toFixed(2); totalTeamBISCell.id = 'totalTeamBIS';
        let totalFundedHCCell = footerRow1.insertCell(); totalFundedHCCell.textContent = totalFundedHC.toFixed(2); totalFundedHCCell.id = 'totalFundedHC';
        let totalEffectiveBISCell = footerRow1.insertCell(); totalEffectiveBISCell.textContent = totalEffectiveBIS.toFixed(2); totalEffectiveBISCell.id = 'totalEffectiveBIS';
        let totalHiringGapCell = footerRow1.insertCell(); totalHiringGapCell.textContent = totalHiringGap; totalHiringGapCell.id = 'totalGap';

        let remainingFooterCols = headersConfig.length - totalsLabelCell.colSpan - 4;
        for(let i=0; i < remainingFooterCols; i++) { footerRow1.insertCell(); }

        [totalTeamBISCell, totalFundedHCCell, totalEffectiveBISCell, totalHiringGapCell].forEach(cell => { /* ... styling ... */
             cell.style.fontWeight = 'bold'; cell.style.textAlign = 'center';
             cell.style.border = '1px solid #ccc'; cell.style.padding = '8px'; cell.style.backgroundColor = '#f8f9fa';
        });
        totalHiringGapCell.style.color = totalHiringGap < 0 ? 'blue' : (totalHiringGap > 0 ? 'orange' : 'green');

        let footerRow2 = tableFoot.insertRow();
        let gapNoteCell = footerRow2.insertCell();
        gapNoteCell.colSpan = headersConfig.length;
        gapNoteCell.id = 'gapNote'; /* ... styling ... */
        gapNoteCell.style.textAlign = 'right'; gapNoteCell.style.fontStyle = 'italic'; gapNoteCell.style.fontSize = '0.9em'; gapNoteCell.style.paddingTop = '5px'; gapNoteCell.style.borderTop = '1px solid #ddd';

        let gapNoteText = `Overall BIS Hiring Gap: ${totalHiringGap} (Finance Approved Funding vs Team BIS). `;
        if (totalHiringGap > 0) { gapNoteText += `Need to hire ${totalHiringGap}.`; }
        else if (totalHiringGap < 0) { gapNoteText += `Over hiring target by ${Math.abs(totalHiringGap)}.`; }
        else { gapNoteText += `At hiring target.`; }
        if (totalEffectiveBIS > totalTeamBIS) { gapNoteText += ` Effective capacity boosted to ${totalEffectiveBIS.toFixed(2)} by away-teams.` }
        gapNoteCell.innerText = gapNoteText;
        console.log("[DEBUG] Footer rebuilt successfully.");
    } catch (error) {
        console.error("[DEBUG] EXIT generateTeamTable: Error rebuilding footer:", error);
        return;
    }
    // --- End Footer Rebuild ---

    // --- 9. Populate Level Key ---
    console.log("[DEBUG] Populating level key...");
    try {
        const levelKeyElement = document.getElementById('levelKey');
        if (levelKeyElement) {
            levelKeyElement.innerHTML = `Level Key: L1=SDE 1 (Junior), L2=SDE 2 (Intermediate), L3=SDE 3 (Senior), L4=Principal SDE, L5=Senior Principal SDE`;
        } else {
             console.warn("[DEBUG] Could not find #levelKey element.");
        }
        console.log("[DEBUG] Level key populated.");
    } catch (error) {
        console.error("[DEBUG] EXIT generateTeamTable: Error populating level key:", error);
        return;
    }
    // --- End Level Key ---
    console.log("[DEBUG] EXIT generateTeamTable - Successful completion."); // Log function end
}
// Ensure it's globally accessible
window.generateTeamTable = generateTeamTable;


