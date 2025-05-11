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


// In js/orgView.js

let engineerListTable = null; // To hold the Tabulator instance
let engineerTableWidgetInstance = null;

// Make sure updateEngineerTableHeading, prepareEngineerDataForTabulator,
// and defineEngineerTableColumns are defined in this file as per our previous discussions.
// (Their content will be the versions we finalized that fix display issues and data updates).

/**
 * Generates the Engineer List table by instantiating and configuring
 * the EnhancedTableWidget.
 */
function generateEngineerTable() {
    console.log("Generating Engineer List using EnhancedTableWidget...");
    updateEngineerTableHeading(); // Assumes this function updates the H2 title with stats

    const tableData = prepareEngineerDataForTabulator();
    const columnDefinitions = defineEngineerTableColumns(); // This function now returns Tabulator column defs

    // Ensure the target div for the widget exists in index.html within #engineerTableView
    const widgetContainerId = 'engineerTableWidgetContainer';
    let widgetTargetDiv = document.getElementById(widgetContainerId);
    if (!widgetTargetDiv) {
        const engineerTableView = document.getElementById('engineerTableView');
        if (!engineerTableView) {
            console.error("Cannot find #engineerTableView to append widget container.");
            return;
        }
        // Remove any old static table or old tabulator div if they exist from previous versions
        const oldStaticTable = engineerTableView.querySelector('table');
        if (oldStaticTable) oldStaticTable.remove();
        const oldTabulatorDiv = document.getElementById('engineerTableTabulator'); // Old ID for Tabulator div
         if(oldTabulatorDiv) oldTabulatorDiv.remove();


        widgetTargetDiv = document.createElement('div');
        widgetTargetDiv.id = widgetContainerId;
        engineerTableView.appendChild(widgetTargetDiv);
        console.log(`Created new widget container div with ID: ${widgetContainerId}`);
    } else {
        console.log(`Using existing widget container div with ID: ${widgetContainerId}`);
    }


    // Destroy previous widget instance if it exists
    if (engineerTableWidgetInstance) {
        engineerTableWidgetInstance.destroy();
        engineerTableWidgetInstance = null;
        console.log("Previous Engineer List widget instance destroyed.");
    }

    // Create new instance of EnhancedTableWidget
    engineerTableWidgetInstance = new EnhancedTableWidget(widgetContainerId, {
        data: tableData,
        columns: columnDefinitions,
        uniqueIdField: 'name', // Assuming 'name' is unique for engineers and used as row ID
        paginationSize: 100, // As per your request
        paginationSizeSelector: [25, 50, 100, 250, 500], // Customize page size options
        initialSort: [{ column: "name", dir: "asc" }], // Example: Sort by name initially
        exportCsvFileName: 'engineer_list.csv',
        exportJsonFileName: 'engineer_list.json',
        exportXlsxFileName: 'engineer_list.xlsx',
        exportSheetName: 'Engineers',
        // The cellEdited logic is now part of the column definitions passed in `columnDefinitions`
        // The widget's generic cellEdited could be used for logging or global actions if needed.
        // cellEdited: (cell) => {
        //     console.log("Global cellEdited from widget options:", cell.getField(), cell.getValue());
        // }
    });
    console.log("Engineer List EnhancedTableWidget instance created.");
}

// Helper to prepare data for Tabulator (needs to be defined)
// In js/orgView.js
function prepareEngineerDataForTabulator() {
    if (!currentSystemData || !currentSystemData.allKnownEngineers) {
        return [];
    }

    return currentSystemData.allKnownEngineers.map((engineer) => { // Removed index
        let teamDisplayForColumn = "Unallocated"; // This is for initial display, formatter handles it mainly
        let actualTeamIdForData = engineer.currentTeamId;
        let sdmName = "N/A";
        let seniorManagerName = "N/A";

        if (engineer.currentTeamId) {
            const team = (currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
            if (team) {
                teamDisplayForColumn = team.teamIdentity || team.teamName || "Unknown Team";
                if (team.sdmId) {
                    const sdm = (currentSystemData.sdms || []).find(s => s.sdmId === team.sdmId);
                    if (sdm) {
                        sdmName = sdm.sdmName;
                        if (sdm.seniorManagerId) {
                            const srMgr = (currentSystemData.seniorManagers || []).find(sm => sm.seniorManagerId === sdm.seniorManagerId);
                            if (srMgr) {
                                seniorManagerName = srMgr.seniorManagerName;
                            }
                        }
                    }
                }
            } else {
                teamDisplayForColumn = "Orphaned (Team Missing)";
                actualTeamIdForData = null;
            }
        }

        return {
            // rowNumber: index + 1, // REMOVED Issue 2.5
            name: engineer.name,
            level: engineer.level,
            teamId: actualTeamIdForData, // This is the actual data field for team assignment
            // teamDisplayIdentity: teamDisplayForColumn, // Not strictly needed if formatter uses teamId
            sdmName: sdmName,
            seniorManagerName: seniorManagerName,
        };
    });
}

// In js/orgView.js

function defineEngineerTableColumns() {
    // ... (engineerLevels, levelEditorParams, getTeamIdentityEditorParams, editableCellFormatter remain the same as the last working version) ...
    const engineerLevels = [
        { label: "L1", value: 1 }, { label: "L2", value: 2 }, { label: "L3", value: 3 },
        { label: "L4", value: 4 }, { label: "L5", value: 5 }, { label: "L6", value: 6 },
        { label: "L7", value: 7 }
    ];

    const levelEditorParams = {
        values: engineerLevels,
        autocomplete: false,
        clearable: false,
    };

    const getTeamIdentityEditorParams = () => {
        const teams = currentSystemData.teams || [];
        const options = [{ label: "-- Unassign --", value: "" }];
        teams.forEach(team => {
            const displayIdentity = team.teamIdentity || team.teamName || team.teamId;
            if (displayIdentity) {
                options.push({ label: String(displayIdentity), value: team.teamId });
            }
        });
        return {
            values: options,
            autocomplete: false,
            clearable: true,
        };
    };

    const editableCellFormatter = function(cell, formatterParams, onRendered){
        let value = cell.getValue();
        const field = cell.getField();

        if (field === "level") {
            value = String(value);
        } else if (field === "teamId") {
            const teamId = cell.getValue();
            if (teamId) {
                const team = (currentSystemData.teams || []).find(t => t.teamId === teamId);
                value = team ? (team.teamIdentity || team.teamName || teamId) : "Invalid Team ID";
            } else {
                value = "Unallocated";
            }
        }
        const columnDef = cell.getColumn().getDefinition();
        if (columnDef.editor) {
            return value + " <span style='color:#007bff; font-size:0.8em; margin-left: 5px; cursor:pointer;' title='Edit'>✏️</span>";
        }
        return value;
    };


    return [
        {
            title: "Engineer Name", field: "name", sorter: "string", minWidth: 200, frozen: true,
            editable: false,
            // For export, ensure the 'name' field is used directly
            accessorDownload: function(value, data, type, params, column, row) {
                return data.name; // Or simply 'value' if field is 'name'
            }
        },
        {
            title: "Level", field: "level", width: 120, hozAlign: "left",
            sorter: "number",
            editor: "list",
            editorParams: levelEditorParams,
            formatter: editableCellFormatter,
            cellEdited: function(cell) {
                // ... (cellEdited logic for Level remains the same)
                const engineerName = cell.getRow().getData().name;
                const newLevelValue = parseInt(cell.getValue());
                if (isNaN(newLevelValue)) {
                    console.error(`Invalid level value after edit for ${engineerName}:`, cell.getValue());
                    cell.restoreOldValue();
                    return;
                }
                const engineerGlobal = currentSystemData.allKnownEngineers.find(e => e.name === engineerName);
                if (engineerGlobal) {
                    engineerGlobal.level = newLevelValue;
                    if (engineerGlobal.currentTeamId) {
                        const assignedTeam = currentSystemData.teams.find(t => t.teamId === engineerGlobal.currentTeamId);
                        if (assignedTeam && assignedTeam.engineers) {
                            const engineerInTeam = assignedTeam.engineers.find(e => e.name === engineerName);
                            if (engineerInTeam) engineerInTeam.level = newLevelValue;
                        }
                    }
                    saveSystemChanges();
                }
            },
            // For export, ensure the numeric level is used, or format as "L1" if preferred in export
            accessorDownload: function(value, data, type, params, column, row) {
                // return data.level; // Exports the raw number: 1, 2, 3
                // OR if you want "L1", "L2" in export:
                const levelObj = engineerLevels.find(l => l.value === data.level);
                return levelObj ? levelObj.label : data.level;
            }
        },
        {
            title: "Team Identity", field: "teamId",
            sorter: "string",
            minWidth: 170,
            hozAlign: "left",
            editor: "list",
            editorParams: getTeamIdentityEditorParams,
            formatter: editableCellFormatter,
            cellEdited: function(cell) {
                // ... (cellEdited logic for Team Identity remains the same)
                const engineerName = cell.getRow().getData().name;
                const newAssignedTeamId = cell.getValue() === "" ? null : cell.getValue();
                const engineerGlobal = currentSystemData.allKnownEngineers.find(e => e.name === engineerName);
                if (engineerGlobal) {
                    const oldTeamId = engineerGlobal.currentTeamId;
                    if (oldTeamId === newAssignedTeamId) return;
                    engineerGlobal.currentTeamId = newAssignedTeamId;
                    if (oldTeamId) {
                        const oldTeam = currentSystemData.teams.find(t => t.teamId === oldTeamId);
                        if (oldTeam && oldTeam.engineers) {
                            oldTeam.engineers = oldTeam.engineers.filter(e => e.name !== engineerName);
                        }
                    }
                    if (newAssignedTeamId) {
                        const newTeam = currentSystemData.teams.find(t => t.teamId === newAssignedTeamId);
                        if (newTeam) {
                            if (!newTeam.engineers) newTeam.engineers = [];
                            if (!newTeam.engineers.some(e => e.name === engineerName)) {
                                newTeam.engineers.push({ name: engineerGlobal.name, level: engineerGlobal.level });
                            }
                        }
                    }
                    saveSystemChanges();
                    generateEngineerTable();
                }
            },
            // ***** START OF FIX FOR EXPORT *****
            accessorDownload: function(value, data, type, accessorParams, column, row) {
                // 'value' here is the teamId (or null) from the row's data for this field
                // 'data' is the entire data object for the row
                const teamId = data.teamId; // Or simply 'value'
                if (teamId) {
                    const team = (currentSystemData.teams || []).find(t => t.teamId === teamId);
                    return team ? (team.teamIdentity || team.teamName || teamId) : "Invalid Team ID";
                } else {
                    return "Unallocated";
                }
            }
            // ***** END OF FIX FOR EXPORT *****
        },
        {
            title: "SDM Name", field: "sdmName", sorter: "string", minWidth: 150, editable: false,
            accessorDownload: function(value, data) { return data.sdmName; } // Explicitly return field value
        },
        {
            title: "Senior Manager", field: "seniorManagerName", sorter: "string", minWidth: 150, editable: false,
            accessorDownload: function(value, data) { return data.seniorManagerName; } // Explicitly return field value
        },
    ];
}

// Helper to update the main heading (Funded, BIS etc.) - this can be adapted from your existing generateEngineerTable
function updateEngineerTableHeading() {
    const heading = document.getElementById('engineerTableHeading');
    if (!currentSystemData || !currentSystemData.teams || !heading) return;

    let totalFundedHC = 0;
    let totalTeamBIS = 0; // Actual engineers on teams
    let totalAwayTeamBIS = 0;

    (currentSystemData.teams || []).forEach(team => {
        totalFundedHC += team.fundedHeadcount ?? 0;
        totalTeamBIS += team.engineers?.length ?? 0;
        totalAwayTeamBIS += team.awayTeamMembers?.length ?? 0;
    });
    const totalEffectiveBIS = totalTeamBIS + totalAwayTeamBIS;
    const totalHiringGap = totalFundedHC - totalTeamBIS;

    heading.innerText = `Engineer Resource List (Funded: ${totalFundedHC} | Team BIS: ${totalTeamBIS} | Away BIS: ${totalAwayTeamBIS} | Effective BIS: ${totalEffectiveBIS} | Hiring Gap: ${totalHiringGap})`;
    // ... (rest of your heading style/title logic)
}


/** Generates the HTML table for engineers */
/** REVISED Generates the HTML table for engineers - Adds Row Counter & Away-Team Indicator */
function generateEngineerTable_original() {
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

// In js/orgView.js

function generateAddNewResourceSection(containerElement) {
    console.log("Generating 'Add New Resource' section...");
    if (!containerElement) {
        console.error("Container for 'Add New Resource' section not provided.");
        return;
    }

    let sectionDiv = document.getElementById('addNewResourceSection');
    if (sectionDiv) {
        sectionDiv.innerHTML = ''; // Clear if already exists for re-rendering
    } else {
        sectionDiv = document.createElement('div');
        sectionDiv.id = 'addNewResourceSection';
        sectionDiv.style.marginTop = '30px';
        sectionDiv.style.padding = '15px';
        sectionDiv.style.border = '1px solid #ccc';
        sectionDiv.style.backgroundColor = '#f9f9f9';
    }

    const title = document.createElement('h3');
    title.textContent = 'Add New Resource to Organisation';
    sectionDiv.appendChild(title);

    const form = document.createElement('form');
    form.id = 'addNewResourceForm';
    form.onsubmit = function(event) { event.preventDefault(); handleAddNewResource(); };

    // Resource Type Selector
    form.innerHTML += `
        <div style="margin-bottom: 10px;">
            <label for="newResourceType">Resource Type:</label>
            <select id="newResourceType" name="resourceType" onchange="toggleNewResourceFields()">
                <option value="engineer">Engineer</option>
                <option value="sdm">SDM</option>
                <option value="sr_manager">Senior Manager</option>
                <option value="pmt">PMT</option>
            </select>
        </div>
    `;

    // Fields for Engineer
    form.innerHTML += `
        <div id="newEngineerFields" class="resource-fields" style="margin-bottom: 10px;">
            <label for="newEngineerName">Engineer Name:</label>
            <input type="text" id="newEngineerName" name="engineerName" required>
            <label for="newEngineerLevel">Level (1-7):</label>
            <input type="number" id="newEngineerLevel" name="engineerLevel" min="1" max="7" value="1" required>
        </div>
    `;

    // Fields for SDM
    const srManagerOptions = (currentSystemData.seniorManagers || []).map(sm => `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`).join('');
    form.innerHTML += `
        <div id="newSdmFields" class="resource-fields" style="display:none; margin-bottom: 10px;">
            <label for="newSdmName">SDM Name:</label>
            <input type="text" id="newSdmName" name="sdmName">
            <label for="assignSrManagerId">Assign to Senior Manager (Optional):</label>
            <select id="assignSrManagerId" name="srManagerId">
                <option value="">-- None --</option>
                ${srManagerOptions}
            </select>
        </div>
    `;

    // Fields for Senior Manager
    form.innerHTML += `
        <div id="newSrManagerFields" class="resource-fields" style="display:none; margin-bottom: 10px;">
            <label for="newSrManagerName">Senior Manager Name:</label>
            <input type="text" id="newSrManagerName" name="srManagerName">
        </div>
    `;

    // Fields for PMT
    form.innerHTML += `
        <div id="newPmtFields" class="resource-fields" style="display:none; margin-bottom: 10px;">
            <label for="newPmtName">PMT Name:</label>
            <input type="text" id="newPmtName" name="pmtName">
        </div>
    `;

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Add Resource';
    submitButton.className = 'btn-primary';
    form.appendChild(submitButton);

    sectionDiv.appendChild(form);
    containerElement.appendChild(sectionDiv); // Append to the provided container

    toggleNewResourceFields(); // Initial call to show correct fields
}

function toggleNewResourceFields() {
    const resourceType = document.getElementById('newResourceType').value;
    document.querySelectorAll('#addNewResourceForm .resource-fields').forEach(div => {
        div.style.display = 'none';
        // Clear and unrequire inputs in hidden fields
        div.querySelectorAll('input, select').forEach(input => {
            if (input.type !== 'select-one') input.value = '';
            else input.selectedIndex = 0;
            input.required = false;
        });
    });

    if (resourceType === 'engineer') {
        document.getElementById('newEngineerFields').style.display = 'block';
        document.getElementById('newEngineerName').required = true;
        document.getElementById('newEngineerLevel').required = true;
    } else if (resourceType === 'sdm') {
        document.getElementById('newSdmFields').style.display = 'block';
        document.getElementById('newSdmName').required = true;
    } else if (resourceType === 'sr_manager') {
        document.getElementById('newSrManagerFields').style.display = 'block';
        document.getElementById('newSrManagerName').required = true;
    } else if (resourceType === 'pmt') {
        document.getElementById('newPmtFields').style.display = 'block';
        document.getElementById('newPmtName').required = true;
    }
}

function handleAddNewResource() {
    const resourceType = document.getElementById('newResourceType').value;
    let success = false;

    if (resourceType === 'engineer') {
        const name = document.getElementById('newEngineerName').value.trim();
        const level = parseInt(document.getElementById('newEngineerLevel').value);
        if (name && !isNaN(level) && level >= 1 && level <= 7) {
            if (!(currentSystemData.allKnownEngineers || []).some(e => e.name.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.allKnownEngineers) currentSystemData.allKnownEngineers = [];
                currentSystemData.allKnownEngineers.push({ name, level, currentTeamId: null });
                success = true;
                console.log("Added new engineer:", { name, level });
            } else {
                alert(`Engineer with name "${name}" already exists.`);
            }
        } else {
            alert("Invalid engineer name or level.");
        }
    } else if (resourceType === 'sdm') {
        const name = document.getElementById('newSdmName').value.trim();
        const srManagerId = document.getElementById('assignSrManagerId').value || null;
        if (name) {
            if (!(currentSystemData.sdms || []).some(s => s.sdmName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.sdms) currentSystemData.sdms = [];
                currentSystemData.sdms.push({ sdmId: 'sdm-' + Date.now(), sdmName: name, seniorManagerId: srManagerId });
                success = true;
                console.log("Added new SDM:", { name, srManagerId });
            } else {
                alert(`SDM with name "${name}" already exists.`);
            }
        } else {
            alert("SDM name cannot be empty.");
        }
    } else if (resourceType === 'sr_manager') {
        const name = document.getElementById('newSrManagerName').value.trim();
        if (name) {
            if (!(currentSystemData.seniorManagers || []).some(s => s.seniorManagerName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.seniorManagers) currentSystemData.seniorManagers = [];
                currentSystemData.seniorManagers.push({ seniorManagerId: 'srMgr-' + Date.now(), seniorManagerName: name });
                success = true;
                console.log("Added new Senior Manager:", { name });
            } else {
                alert(`Senior Manager with name "${name}" already exists.`);
            }
        } else {
            alert("Senior Manager name cannot be empty.");
        }
    } else if (resourceType === 'pmt') {
        const name = document.getElementById('newPmtName').value.trim();
        if (name) {
            if (!(currentSystemData.pmts || []).some(p => p.pmtName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.pmts) currentSystemData.pmts = [];
                currentSystemData.pmts.push({ pmtId: 'pmt-' + Date.now(), pmtName: name });
                success = true;
                console.log("Added new PMT:", { name });
            } else {
                alert(`PMT with name "${name}" already exists.`);
            }
        } else {
            alert("PMT name cannot be empty.");
        }
    }

    if (success) {
        alert("Resource added successfully!");
        saveSystemChanges(); // Save the updated system data
        document.getElementById('addNewResourceForm').reset();
        toggleNewResourceFields(); // Reset form view

        // Refresh relevant parts of the Org View if needed
        // generateOrganogram(); // If new managers/SDMs affect it
        // generateTeamTable(currentSystemData); // If new managers/SDMs affect it
        // The Engineer List will refresh when the user navigates to it.
        // For SDM/Sr.Mgr dropdowns in the "Add New Resource" section itself:
        if (resourceType === 'sr_manager' && document.getElementById('assignSrManagerId')) {
            const srManagerSelect = document.getElementById('assignSrManagerId');
            srManagerSelect.innerHTML = '<option value="">-- None --</option>' + (currentSystemData.seniorManagers || []).map(sm => `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`).join('');
        }
    }
}



