/**
 * Builds hierarchical data for Organogram.
 * MODIFIED: Iterates team.engineers (array of names) and looks up details
 * from currentSystemData.allKnownEngineers to build engineer nodes.
 */
function buildHierarchyData() {
    console.log("Building hierarchy data with new engineer model...");
    if (!currentSystemData) return null;

    const sdmMap = new Map((currentSystemData.sdms || []).map(sdm => [sdm.sdmId, { ...sdm, children: [], type: 'sdm' }]));
    const srMgrMap = new Map((currentSystemData.seniorManagers || []).map(sr => [sr.seniorManagerId, { ...sr, children: [], type: 'srMgr' }]));

    sdmMap.forEach(sdm => {
        if (sdm.seniorManagerId && srMgrMap.has(sdm.seniorManagerId)) {
            srMgrMap.get(sdm.seniorManagerId).children.push(sdm);
        } else {
            const unassignedSrMgrKey = 'unassigned-sr-mgr';
            if (!srMgrMap.has(unassignedSrMgrKey)) {
                srMgrMap.set(unassignedSrMgrKey, { seniorManagerId: unassignedSrMgrKey, seniorManagerName: 'Unassigned Senior Manager', children: [], type: 'srMgr' });
            }
            if (sdm && sdm.sdmId) srMgrMap.get(unassignedSrMgrKey).children.push(sdm);
        }
    });

    (currentSystemData.teams || []).forEach(team => {
        const awayTeamCount = team.awayTeamMembers?.length ?? 0;
        const sourceSummary = typeof getSourceSummary === 'function' ? getSourceSummary(team.awayTeamMembers) : '';

        // Build engineer children by looking up names from team.engineers in allKnownEngineers
        const engineerChildren = (team.engineers || []).map(engineerName => {
            const engineerDetails = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
            return {
                name: `${engineerDetails ? engineerDetails.name : engineerName} (L${engineerDetails ? engineerDetails.level : '?'})${engineerDetails?.attributes?.isAISWE ? ' [AI]' : ''}`,
                type: 'engineer'
            };
        }).filter(e => e.name); // Filter out any undefined if lookup failed, though ideally names should always exist

        const teamNode = {
            name: team.teamIdentity || team.teamName || 'Unnamed Team',
            type: 'team',
            details: `BIS: ${team.engineers?.length ?? 0} / Funded: ${team.fundedHeadcount ?? 'N/A'}`,
            awayTeamCount: awayTeamCount,
            awaySourceSummary: sourceSummary,
            children: engineerChildren
        };

        if (team.sdmId && sdmMap.has(team.sdmId)) {
            sdmMap.get(team.sdmId).children.push(teamNode);
        } else {
            const unassignedSdmKey = 'unassigned-sdm';
            if (!sdmMap.has(unassignedSdmKey)) {
                sdmMap.set(unassignedSdmKey, { sdmId: unassignedSdmKey, sdmName: 'Unassigned SDM', children: [], type: 'sdm' });
                const unassignedSrMgrKey = 'unassigned-sr-mgr';
                if (!srMgrMap.has(unassignedSrMgrKey)) {
                     srMgrMap.set(unassignedSrMgrKey, { seniorManagerId: unassignedSrMgrKey, seniorManagerName: 'Unassigned Senior Manager', children: [], type: 'srMgr' });
                }
                srMgrMap.get(unassignedSrMgrKey).children.push(sdmMap.get(unassignedSdmKey));
            }
            if (team && team.teamId) sdmMap.get(unassignedSdmKey).children.push(teamNode);
        }
    });

    const root = {
        name: currentSystemData.systemName || 'Organization',
        type: 'root',
        children: Array.from(srMgrMap.values())
    };

    console.log("Finished building hierarchy data.");
    return root;
}

/**
 * Generates the Organogram using HTML structure.
 * No direct changes needed here due to engineer model, as buildHierarchyData handles it.
 */
function generateOrganogram() {
    console.log("Generating Organogram HTML...");
    const hierarchicalData = buildHierarchyData();
    const container = document.getElementById('organogramContent');
    if (!hierarchicalData || !container) {
        console.error("No data or container for organogram HTML.");
        if(container) container.innerHTML = '<p style="color: red;">Could not generate organogram data.</p>';
        return;
    }
    container.innerHTML = '';
    container.style.fontFamily = 'Arial, sans-serif';

    function buildHtmlLevel(node, level) {
        if (!node) return '';
        let html = `<div class="org-level-${level}" style="margin-left: ${level * 25}px; margin-bottom: 5px; padding: 3px 5px; border-left: 2px solid #eee; position: relative;">`;
        let nodeContent = '';
        let nodeStyle = '';
        let detailsStyle = 'font-size: 0.8em; color: #555; margin-left: 5px;';

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
                nodeContent = `<span style="color: #17a2b8;">Team: ${node.name || 'N/A'}</span> <span style="${detailsStyle}">(${node.details || ''})</span>`;
                if (node.awayTeamCount > 0) {
                    const awaySourceText = node.awaySourceSummary || 'Source Unknown';
                    const annotation = ` <span style="color: #dc3545; font-style: italic; font-size: 0.9em;" title="Away-Team Sources: ${awaySourceText}">(+${node.awayTeamCount} Away)</span>`;
                    nodeContent += annotation;
                }
                // Display engineer names from node.children (which are already formatted by buildHierarchyData)
                if (node.children && node.children.length > 0) {
                    nodeContent += '<ul style="list-style-type: none; padding-left: 15px; margin-top: 3px;">';
                    node.children.forEach(engNode => { // These are engineer nodes from buildHierarchyData
                        if (engNode.type === 'engineer') {
                             nodeContent += `<li style="font-size:0.85em;">${engNode.name}</li>`;
                        }
                    });
                    nodeContent += '</ul>';
                }
                break;
            // Engineer case is handled by team now, direct rendering of engineer nodes not needed at top levels.
            // case 'engineer':
            //     nodeContent = `<span style="font-size: 0.9em;">${node.name || 'N/A'}</span>`;
            //     break;
            default:
                nodeContent = `<strong>${node.name || 'Group'}</strong>`;
                nodeStyle = 'color: #6c757d;';
        }
        html += `<span style="${nodeStyle}">${nodeContent}</span>`;

        // Recursively add children for non-team, non-engineer types
        if (node.children && node.children.length > 0 && node.type !== 'team' && node.type !== 'engineer') {
            node.children.forEach(child => {
                 html += buildHtmlLevel(child, level + 1);
            });
        }
        html += `</div>`;
        return html;
    }
    container.innerHTML = buildHtmlLevel(hierarchicalData, 0);
    console.log("Finished generating Organogram HTML.");
}

// In js/orgView.js

/**
 * Generates the Team Breakdown Table.
 * MODIFIED (v5 - Robust Lookup from data.js structure):
 * - Assumes team.engineers is an array of names.
 * - Performs case-insensitive, trimmed lookup of engineer details from systemData.allKnownEngineers.
 * - Logs specific names if details are not found in the roster.
 */
function generateTeamTable(systemData) {
    console.log("[DEBUG V5] ENTER generateTeamTable");

    const teamTable = document.getElementById('teamTable');
    if (!teamTable) {
        console.error("[DEBUG V5] EXIT generateTeamTable: Could not find #teamTable element.");
        const teamBreakdownDiv = document.getElementById('teamBreakdown');
        if (teamBreakdownDiv) {
             teamBreakdownDiv.innerHTML = '<p style="color:red;">Error: HTML element for team table not found (ID: teamTable).</p>';
        }
        return;
    }

    const tableHead = teamTable.querySelector('thead');
    const tableBody = teamTable.querySelector('tbody');
    const tableFoot = teamTable.querySelector('tfoot');

    if (!tableHead || !tableBody || !tableFoot) {
        console.error("[DEBUG V5] EXIT generateTeamTable: Table structure incomplete (missing thead/tbody/tfoot).");
        const teamBreakdownDiv = document.getElementById('teamBreakdown');
        if (teamBreakdownDiv) {
            teamBreakdownDiv.innerHTML = '<p style="color:red;">Error: Team table HTML structure is incomplete.</p>';
        }
        return;
    }

    tableBody.innerHTML = '';
    tableHead.innerHTML = '';
    tableFoot.innerHTML = '';
    console.log("[DEBUG V5] Cleared table head, body, and foot.");

    const headerRow = tableHead.insertRow();
    const headersConfig = [
        { text: 'Senior Manager', title: 'Senior Manager overseeing the SDM(s).' },
        { text: 'SDM', title: 'Software Development Manager for the team(s).' },
        { text: 'Team Identity', title: 'Unique identifier or codename for the team.' },
        { text: 'Team Name', title: 'Official name of the team.' },
        { text: 'PMT', title: 'Product Management counterpart for the team.' },
        { text: 'Team BIS', title: 'Builders In Seats: Count of actual engineers assigned to this team (from team.engineers list).' },
        { text: 'Finance Approved Funding', title: 'Official budgeted headcount allocated by finance.' },
        { text: 'Effective BIS', title: 'Total building capacity including team members and away-team resources (Team BIS + Away-Team BIS).' },
        { text: 'BIS Hiring Gap', title: 'Gap between Finance Approved Funding and actual Team BIS (Funded - Team BIS). Shows hiring need.' },
        { text: 'Engineers (Level & Type)', title: 'List of engineers assigned to this team, their level, and if they are AI.' },
        { text: 'Away-Team Members', title: 'List of engineers borrowed from other teams/orgs, their level, and source.' },
        { text: 'Services Owned', title: 'List of services this team owns.' }
     ];
    headersConfig.forEach(config => {
        const th = document.createElement('th');
        th.textContent = config.text;
        th.title = config.title;
        Object.assign(th.style, { border: '1px solid #ccc', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2', position: 'sticky', top: '0', zIndex: '1' });
        headerRow.appendChild(th);
    });

    if (!systemData || !systemData.teams || !Array.isArray(systemData.teams) || !systemData.allKnownEngineers || !Array.isArray(systemData.allKnownEngineers)) {
        console.error("[DEBUG V5] EXIT generateTeamTable: Invalid or missing systemData.teams or systemData.allKnownEngineers. Check data loading and structure.");
        let errRow = tableBody.insertRow(); let cell = errRow.insertCell();
        cell.colSpan = headersConfig.length; cell.textContent = "Error: Core team or global engineer roster data is missing or invalid. Please check system data."; cell.style.color = 'red';
        const levelKeyElement = document.getElementById('levelKey'); if (levelKeyElement) levelKeyElement.innerHTML = '';
        return;
    }

    const services = systemData.services || [];
    const sdms = systemData.sdms || [];
    const pmts = systemData.pmts || [];
    const seniorManagers = systemData.seniorManagers || [];
    const allKnownEngineers = systemData.allKnownEngineers; // Source of truth for engineer details

    let totalFundedHC = 0; let totalTeamBIS = 0; let totalEffectiveBIS = 0;

    const getSeniorManagerName = (srMgrId) => { if (!srMgrId) return 'No Senior Manager'; const srMgr = seniorManagers.find(s => s.seniorManagerId === srMgrId); return srMgr ? srMgr.seniorManagerName : `Unknown (${srMgrId.slice(-4)})`; };
    const getSdmName = (sdmId) => { if (!sdmId) return 'No SDM'; const sdm = sdms.find(s => s.sdmId === sdmId); return sdm ? sdm.sdmName : `Unknown (${sdmId.slice(-4)})`; };
    const getPmtName = (pmtId) => { if (!pmtId) return 'N/A'; const pmt = pmts.find(p => p.pmtId === pmtId); return pmt ? pmt.pmtName : `Unknown (${pmtId.slice(-4)})`; };

    let teamServicesMap = {};
    services.forEach(service => { let teamId = service.owningTeamId; if (teamId) { if (!teamServicesMap[teamId]) teamServicesMap[teamId] = []; teamServicesMap[teamId].push(service.serviceName); } });

    let groupedData = {};
    systemData.teams.forEach(team => { if (!team || !team.teamId) return; const sdm = sdms.find(s => s.sdmId === team.sdmId); const srMgrId = sdm ? (sdm.seniorManagerId || 'no-sr-mgr') : 'no-sdm'; const sdmIdValue = team.sdmId || 'no-sdm'; if (!groupedData[srMgrId]) groupedData[srMgrId] = {}; if (!groupedData[srMgrId][sdmIdValue]) groupedData[srMgrId][sdmIdValue] = []; groupedData[srMgrId][sdmIdValue].push(team); });

    console.log("[DEBUG V5] Starting table body population. Number of known engineers in roster:", allKnownEngineers.length);
    let rowCount = 0;
    for (const srMgrId in groupedData) {
        const srMgrData = groupedData[srMgrId];
        const srMgrNameDisplay = (srMgrId === 'no-sr-mgr' || srMgrId === 'no-sdm') ? 'No Assigned Senior Manager' : getSeniorManagerName(srMgrId);
        let isFirstRowForSrMgr = true;
        let srMgrRowspan = 0;
        for (const sdmIdValue in srMgrData) { srMgrRowspan += srMgrData[sdmIdValue].length; }

        for (const sdmIdValue in srMgrData) {
            const teamsInSdmGroup = srMgrData[sdmIdValue];
            const sdmNameDisplay = (sdmIdValue === 'no-sdm') ? 'No Assigned SDM' : getSdmName(sdmIdValue);
            let isFirstRowForSdm = true;

            teamsInSdmGroup.forEach((team) => {
                if (!team || !team.teamId) { console.warn("[DEBUG V5] Skipping invalid team in generateTeamTable:", team); return; }
                let row = tableBody.insertRow();
                rowCount++;

                if (isFirstRowForSrMgr) { let srMgrCell = row.insertCell(); srMgrCell.innerText = srMgrNameDisplay; srMgrCell.rowSpan = srMgrRowspan; srMgrCell.style.verticalAlign = 'top'; isFirstRowForSrMgr = false; }
                if (isFirstRowForSdm) { let sdmCell = row.insertCell(); sdmCell.innerText = sdmNameDisplay; sdmCell.rowSpan = teamsInSdmGroup.length; sdmCell.style.verticalAlign = 'top'; isFirstRowForSdm = false; }
                row.insertCell().innerText = team.teamIdentity || 'N/A';
                row.insertCell().innerText = team.teamName || 'N/A';
                row.insertCell().innerText = getPmtName(team.pmtId);

                const fundedHC = team.fundedHeadcount ?? 0;
                const teamMemberEngineerNames = team.engineers || [];
                const teamBIS = teamMemberEngineerNames.length;
                const awayTeamBIS = (team.awayTeamMembers || []).length;
                const effectiveBIS = teamBIS + awayTeamBIS;
                const hiringGap = fundedHC - teamBIS;

                const teamBISCell = row.insertCell(); teamBISCell.innerText = teamBIS; teamBISCell.style.textAlign = 'center';
                row.insertCell().innerText = fundedHC.toFixed(0);
                const effectiveBISCell = row.insertCell(); effectiveBISCell.innerText = effectiveBIS.toFixed(0); effectiveBISCell.title = `Team Members: ${teamBIS}, Away-Team: ${awayTeamBIS}`; effectiveBISCell.style.textAlign = 'center'; if (awayTeamBIS > 0) effectiveBISCell.style.fontWeight = 'bold';
                let hiringGapCell = row.insertCell(); hiringGapCell.innerText = hiringGap; hiringGapCell.style.color = hiringGap < 0 ? 'blue' : (hiringGap > 0 ? 'orange' : 'green'); hiringGapCell.style.textAlign = 'center';
                if (hiringGap < 0) { hiringGapCell.title = `Team BIS (${teamBIS}) exceeds Funded HC (${fundedHC}) by ${Math.abs(hiringGap)}`; hiringGapCell.style.fontWeight = 'bold'; }
                else if (hiringGap > 0) { hiringGapCell.title = `Need to hire ${hiringGap} to reach Funded HC (${fundedHC})`; }
                else { hiringGapCell.title = `Team BIS matches Funded HC`; }

                totalFundedHC += fundedHC; totalTeamBIS += teamBIS; totalEffectiveBIS += effectiveBIS;

                let engineersCell = row.insertCell();
                if (teamMemberEngineerNames.length > 0) {
                    engineersCell.innerHTML = teamMemberEngineerNames.map(engineerNameFromTeamLoop => {
                        if (!engineerNameFromTeamLoop || typeof engineerNameFromTeamLoop !== 'string') {
                            console.warn(`[V5 DEBUG] Invalid engineer name in team.engineers: '${engineerNameFromTeamLoop}' for team: ${team.teamIdentity}`);
                            return `${String(engineerNameFromTeamLoop || 'Invalid Name In TeamList')} (Error: Bad Name Format)`;
                        }
                        const trimmedNameFromTeam = engineerNameFromTeamLoop.trim();
                        const lowerTrimmedNameFromTeam = trimmedNameFromTeam.toLowerCase();

                        const engDetails = allKnownEngineers.find(e =>
                            e.name && typeof e.name === 'string' &&
                            e.name.trim().toLowerCase() === lowerTrimmedNameFromTeam
                        );

                        if (engDetails) {
                            const attributes = engDetails.attributes || {};
                            const typeIndicator = attributes.isAISWE ? ` [AI - ${attributes.aiAgentType || 'General'}]` : '';
                            return `${engDetails.name} (L${engDetails.level ?? '?'})${typeIndicator}`;
                        } else {
                            console.warn(`[V5 DEBUG - Lookup FAIL] Engineer name "${trimmedNameFromTeam}" (from team "${team.teamIdentity || team.teamId}") NOT FOUND in allKnownEngineers roster.`);
                            return `${engineerNameFromTeamLoop} (Details Missing - Not in Roster)`;
                        }
                    }).join('<br>');
                } else {
                    engineersCell.innerText = 'None';
                }
                engineersCell.style.whiteSpace = 'pre-line';

                let awayTeamCell = row.insertCell();
                if (team.awayTeamMembers && team.awayTeamMembers.length > 0) {
                    awayTeamCell.innerHTML = team.awayTeamMembers.map(awayEng => {
                        if (typeof awayEng !== 'object' || awayEng === null) return 'Invalid Away Data';
                        const attributes = awayEng.attributes || {}; // Assuming away members might also have attributes
                        const typeIndicator = attributes.isAISWE ? ` [AI - ${attributes.aiAgentType || 'General'}]` : '';
                        return `${awayEng.name || 'Unnamed'} (L${awayEng.level ?? '?'})${typeIndicator} - From: ${awayEng.sourceTeam || 'Unknown Source'}`;
                    }).join('<br>');
                } else {
                    awayTeamCell.innerText = 'None';
                }
                Object.assign(awayTeamCell.style, { whiteSpace: 'pre-line', fontSize: '0.9em', color: '#333' });

                let servicesOwnedCell = row.insertCell();
                servicesOwnedCell.innerText = team.teamId && teamServicesMap[team.teamId] ? teamServicesMap[team.teamId].join(', ') : 'None';
            });
        }
    }
    console.log(`[DEBUG V5] Finished table body population. Inserted ${rowCount} rows.`);

    const totalHiringGap = totalFundedHC - totalTeamBIS;
    let footerRow1 = tableFoot.insertRow();
    let totalsLabelCell = footerRow1.insertCell();
    totalsLabelCell.textContent = 'Totals:';
    totalsLabelCell.colSpan = 5;
    Object.assign(totalsLabelCell.style, { textAlign: 'right', fontWeight: 'bold'});

    const createFooterCell = (value, id) => {
        let cell = footerRow1.insertCell();
        cell.textContent = typeof value === 'number' ? value.toFixed(0) : String(value);
        if (id) cell.id = id;
        Object.assign(cell.style, { fontWeight: 'bold', textAlign: 'center', border: '1px solid #ccc', padding: '8px', backgroundColor: '#f8f9fa' });
        return cell;
    };

    createFooterCell(totalTeamBIS, 'totalTeamBIS');
    createFooterCell(totalFundedHC, 'totalFundedHC');
    createFooterCell(totalEffectiveBIS, 'totalEffectiveBIS');
    const totalHiringGapCell = createFooterCell(totalHiringGap, 'totalGap');
    totalHiringGapCell.style.color = totalHiringGap < 0 ? 'blue' : (totalHiringGap > 0 ? 'orange' : 'green');

    let remainingFooterCols = headersConfig.length - totalsLabelCell.colSpan - 4;
    for(let i=0; i < remainingFooterCols; i++) {
        const emptyCell = footerRow1.insertCell();
        emptyCell.style.backgroundColor = '#f8f9fa';
        emptyCell.style.border = '1px solid #ccc';
    }

    let footerRow2 = tableFoot.insertRow();
    let gapNoteCell = footerRow2.insertCell();
    gapNoteCell.colSpan = headersConfig.length;
    gapNoteCell.id = 'gapNote';
    Object.assign(gapNoteCell.style, { textAlign: 'right', fontStyle: 'italic', fontSize: '0.9em', paddingTop: '5px', borderTop: '1px solid #ddd'});
    let gapNoteText = `Overall BIS Hiring Gap: ${totalHiringGap} (Finance Approved Funding vs Team BIS). `;
    if (totalHiringGap > 0) gapNoteText += `Need to hire ${totalHiringGap}.`;
    else if (totalHiringGap < 0) gapNoteText += `Over hiring target by ${Math.abs(totalHiringGap)}.`;
    else gapNoteText += `At hiring target.`;
    if (totalEffectiveBIS > totalTeamBIS) gapNoteText += ` Effective capacity boosted to ${totalEffectiveBIS.toFixed(0)} by away-teams.`
    gapNoteCell.innerText = gapNoteText;

    const levelKeyElement = document.getElementById('levelKey');
    if (levelKeyElement) {
        levelKeyElement.innerHTML = `Level Key: L1-L7. [AI - Type] indicates an AI Software Engineer and its specialization.`;
    } else {
        console.warn("[DEBUG V5] Could not find #levelKey element.");
    }
    console.log("[DEBUG V5] EXIT generateTeamTable - Successful completion.");
}
window.generateTeamTable = generateTeamTable;

// END OF REPLACEMENT for generateTeamTable


let engineerTableWidgetInstance = null; // Keep this global for the widget

/**
 * Generates the Engineer List table by instantiating and configuring
 * the EnhancedTableWidget.
 * MODIFIED: Added a redraw call for Tabulator to fix initial display issues.
 */
function generateEngineerTable() {
    console.log("Generating Engineer List using EnhancedTableWidget...");
    if (typeof updateEngineerTableHeading === 'function') {
        updateEngineerTableHeading();
    } else {
        console.warn("updateEngineerTableHeading function not found.");
    }

    const tableData = prepareEngineerDataForTabulator(); // This function is already updated
    const columnDefinitions = defineEngineerTableColumns(); // This function is already updated

    const widgetContainerId = 'engineerTableWidgetContainer';
    let widgetTargetDiv = document.getElementById(widgetContainerId);

    if (!widgetTargetDiv) {
        const engineerTableView = document.getElementById('engineerTableView');
        if (!engineerTableView) {
            console.error("Cannot find #engineerTableView to append widget container.");
            return;
        }
        // Remove any old static table or old tabulator div if they exist
        const oldStaticTable = engineerTableView.querySelector('table');
        if (oldStaticTable) oldStaticTable.remove();
        const oldTabulatorDiv = document.getElementById('engineerTableTabulator');
        if (oldTabulatorDiv) oldTabulatorDiv.remove();

        widgetTargetDiv = document.createElement('div');
        widgetTargetDiv.id = widgetContainerId;
        engineerTableView.appendChild(widgetTargetDiv);
        console.log(`Created new widget container div with ID: ${widgetContainerId}`);
    } else {
        // If reusing, ensure it's empty if a previous widget was there but not properly destroyed
        // This might happen if engineerTableWidgetInstance was nulled but DOM not cleared.
        // widgetTargetDiv.innerHTML = ''; // Optional: Clear if issues persist with re-renders
        console.log(`Using existing widget container div with ID: ${widgetContainerId}`);
    }

    // Destroy previous widget instance if it exists to prevent conflicts
    if (engineerTableWidgetInstance) {
        engineerTableWidgetInstance.destroy();
        engineerTableWidgetInstance = null;
        console.log("Previous Engineer List widget instance destroyed.");
    }

    // Create new instance of EnhancedTableWidget
    try {
        engineerTableWidgetInstance = new EnhancedTableWidget(widgetContainerId, {
            data: tableData,
            columns: columnDefinitions,
            uniqueIdField: 'name',
            paginationSize: 100,
            paginationSizeSelector: [25, 50, 100, 250, 500],
            initialSort: [{ column: "name", dir: "asc" }],
            exportCsvFileName: 'engineer_list.csv',
            exportJsonFileName: 'engineer_list.json',
            exportXlsxFileName: 'engineer_list.xlsx',
            exportSheetName: 'Engineers'
            // cellEdited callback is now part of columnDefinitions
        });
        console.log("Engineer List EnhancedTableWidget instance created.");

        // Force Tabulator to redraw after a very short delay
        // This ensures the container is visible and has dimensions.
        if (engineerTableWidgetInstance && engineerTableWidgetInstance.tabulatorInstance) {
            setTimeout(() => {
                console.debug("Attempting Tabulator redraw for Engineer List after short delay.");
                engineerTableWidgetInstance.tabulatorInstance.redraw(true);
            }, 100); // 100ms delay, can be adjusted
        } else {
            console.warn("Could not access tabulatorInstance for redraw inside generateEngineerTable.");
        }
    } catch (error) {
        console.error("Error creating EnhancedTableWidget for Engineer List:", error);
        if (widgetTargetDiv) {
            widgetTargetDiv.innerHTML = "<p style='color:red;'>Error initializing engineer table widget. Check console.</p>";
        }
    }
}

// In js/orgView.js

// Function: prepareEngineerDataForTabulator
// MODIFIED: To extract and prepare new engineer attributes for the table.
function prepareEngineerDataForTabulator() {
    if (!currentSystemData || !currentSystemData.allKnownEngineers) {
        console.warn("prepareEngineerDataForTabulator: currentSystemData.allKnownEngineers is missing.");
        return [];
    }

    return currentSystemData.allKnownEngineers.map((engineer) => {
        let sdmName = "N/A";
        let seniorManagerName = "N/A";

        if (engineer.currentTeamId) {
            const team = (currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
            if (team) {
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
            }
        }

        // Prepare data from attributes, ensuring defaults if attributes or nested fields are missing
        const attributes = engineer.attributes || {}; // Ensure attributes object exists
        const isAISWE = attributes.isAISWE || false;
        const aiAgentType = isAISWE ? (attributes.aiAgentType || "General AI") : "-";
        const skillsArray = Array.isArray(attributes.skills) ? attributes.skills : [];
        const yearsOfExperience = typeof attributes.yearsOfExperience === 'number' ? attributes.yearsOfExperience : 0;

        return {
            name: engineer.name,
            level: engineer.level,
            teamId: engineer.currentTeamId,
            sdmName: sdmName,
            seniorManagerName: seniorManagerName,
            // New fields from attributes
            isAISWE: isAISWE, // Boolean, for formatter
            aiAgentType: aiAgentType,
            skills: skillsArray.join(', '), // Comma-separated string for display and editing
            _skillsArray: skillsArray, // Keep original array for editing if needed, or parse from string
            yearsOfExperience: yearsOfExperience
        };
    });
}

// Function: defineEngineerTableColumns
// MODIFIED: Added new columns for Type (AI/Human), AI Agent Type, Skills (editable), and Years Exp.
// These new columns are set to visible: false by default.
// In js/orgView.js

// Replace the existing defineEngineerTableColumns function with this:
function defineEngineerTableColumns() {
    console.log("Defining Engineer Table Columns (Tabulator list editor fix)..."); // Added console log
    const engineerLevels = [
        { label: "All", value: "" }, { label: "L1", value: 1 }, { label: "L2", value: 2 }, { label: "L3", value: 3 },
        { label: "L4", value: 4 }, { label: "L5", value: 5 }, { label: "L6", value: 6 }, { label: "L7", value: 7 }
    ];
    // For Level Cell Editor
    const levelCellEditorParams = {
        values: engineerLevels.filter(l => l.value !== ""), // Exclude "All" from cell editor
        autocomplete: false, // Consider true if list is very long
        clearable: false // A level should probably always be set
    };
    // For Level Header Filter
    const levelHeaderFilterParams = {
        values: engineerLevels, // "All" is included for clearing filter
        clearable: true,
        autocomplete: true,
        multiselect: false
    };

    // For Team Identity Cell Editor
    const getTeamIdentityCellEditorParams = () => {
        const teams = currentSystemData.teams || [];
        const options = [{ label: "-- Unassign --", value: "" }]; // "" value for null teamId
        (teams || []).forEach(team => { // Ensure teams is an array
            const displayIdentity = team.teamIdentity || team.teamName || team.teamId;
            if (displayIdentity) {
                options.push({ label: String(displayIdentity), value: team.teamId });
            }
        });
        // Sort options by label, keeping "-- Unassign --" at the top
        options.sort((a, b) => {
            if (a.value === "") return -1;
            if (b.value === "") return 1;
            return String(a.label).localeCompare(String(b.label));
        });
        return { values: options, autocomplete: true, clearable: true }; // enable autocomplete
    };

    // For Team Identity Header Filter
    const getTeamIdentityHeaderFilterParams = () => {
        const options = [{ label: "All", value: "" }];
        const addedTeamIds = new Set([""]);

        if (currentSystemData && currentSystemData.allKnownEngineers) {
            (currentSystemData.allKnownEngineers || []).forEach(engineer => { // Ensure allKnownEngineers is an array
                if (engineer.currentTeamId && !addedTeamIds.has(engineer.currentTeamId)) {
                    const team = (currentSystemData.teams || []).find(t => t.teamId === engineer.currentTeamId);
                    if (team) {
                        const display = team.teamIdentity || team.teamName || team.teamId;
                        options.push({ label: String(display), value: team.teamId });
                        addedTeamIds.add(team.teamId);
                    }
                } else if (!engineer.currentTeamId && !addedTeamIds.has("_UNALLOCATED_")) {
                    options.push({ label: "Unallocated", value: "_UNALLOCATED_" });
                    addedTeamIds.add("_UNALLOCATED_");
                }
            });
        }
        options.sort((a,b) => {
            if (a.value === "") return -1;
            if (b.value === "") return 1;
            if (a.value === "_UNALLOCATED_") return options.length -1; // Try to push Unallocated towards end
            if (b.value === "_UNALLOCATED_") return -(options.length -1);
            return String(a.label).localeCompare(String(b.label));
        });
        return { values: options, clearable: true, autocomplete: true };
    };

    // For SDM and Sr Manager Header Filters
    const getNameHeaderFilterParams = (sourceArray, nameField) => {
        const options = [{ label: "All", value: "" }];
        if (sourceArray) {
            const uniqueNames = {};
            sourceArray.forEach(item => {
                if (item && item[nameField]) {
                    uniqueNames[item[nameField]] = item[nameField]; // Value is the name itself for filtering
                }
            });
            Object.keys(uniqueNames).sort((a,b) => String(a).localeCompare(String(b))).forEach(name => {
                 options.push({ label: name, value: name });
            });
        }
        return { values: options, clearable: true, autocomplete: true };
    };

    // Generic formatter for cells that might be editable, to add an edit icon
    const editableCellFormatter = (cell) => {
        let value = cell.getValue();
        const field = cell.getField();
        const columnDef = cell.getColumn().getDefinition();

        if (field === "level") {
            const levelObj = engineerLevels.find(l => l.value === parseInt(value));
            value = levelObj ? levelObj.label : String(value);
        } else if (field === "teamId") {
            const teamId = cell.getValue();
            if (teamId) {
                const team = (currentSystemData.teams || []).find(t => t.teamId === teamId);
                value = team ? (team.teamIdentity || team.teamName || teamId) : `Missing (${teamId.slice(-4)})`;
            } else {
                value = "Unallocated";
            }
        }
        // Skills and Years Exp. have their own formatters if needed, or are handled by prepare...

        if (columnDef.editor && value !== undefined && value !== null && String(value).trim() !== "") { // Add edit icon if column is editable and has a value
            return `${value} <span style='color:#007bff; font-size:0.8em; margin-left: 5px; cursor:pointer;' title='Edit ${columnDef.title || field}'>✏️</span>`;
        }
        return value; // Return value directly if no editor or if value is empty
    };

    return [
        { title: "Engineer Name", field: "name", sorter: "string", minWidth: 180, frozen: true, editable: false, headerFilter: "input", headerFilterPlaceholder: "Filter by name...", accessorDownload: (v,d) => d.name },
        {
            title: "Level", field: "level", width: 100, hozAlign: "left", sorter: "number",
            editor: "list", editorParams: levelCellEditorParams,
            formatter: editableCellFormatter,
            headerFilter: "list", headerFilterParams: levelHeaderFilterParams, headerFilterFunc: "=",
            cellEdited: (cell) => {
                const engineerName = cell.getRow().getData().name;
                const newLevelValue = parseInt(cell.getValue()); // Editor should provide the value directly
                if (isNaN(newLevelValue) || newLevelValue < 1 || newLevelValue > 7) {
                    alert("Invalid level. Please select a valid level from the list.");
                    cell.restoreOldValue();
                    return;
                }
                const engineerGlobal = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
                if (engineerGlobal) {
                    engineerGlobal.level = newLevelValue;
                    console.log(`Updated level for ${engineerName} to ${newLevelValue} in allKnownEngineers.`);
                    if (typeof saveSystemChanges === 'function') saveSystemChanges();
                } else {
                    console.error(`Engineer ${engineerName} not found in allKnownEngineers for level update.`);
                }
            },
            accessorDownload: (v,d) => (engineerLevels.find(l => l.value === d.level) || {label: d.level}).label
        },
        {
            title: "Type", field: "isAISWE", width: 70, hozAlign: "center",
            formatter: (cell) => {
                const isAI = cell.getValue();
                return isAI ? '<i class="fas fa-robot" title="AI Engineer"></i>' : '<i class="fas fa-user" title="Human Engineer"></i>';
            },
            headerFilter: "list", // Changed from "select" to "list"
            headerFilterParams: {
                values: [ // Using array of objects for "list" header filter
                    {label: "All", value: ""},
                    {label: "AI", value: true},
                    {label: "Human", value: false}
                ]
            },
            visible: false,
            download: true, accessorDownload: (v,d) => d.isAISWE ? "AI" : "Human"
        },
        {
            title: "AI Agent Type", field: "aiAgentType", minWidth: 150, hozAlign: "left",
            formatter: (cell) => cell.getValue() || "-",
            headerFilter: "input", headerFilterPlaceholder: "Filter by AI Type...",
            visible: false,
            download: true, accessorDownload: (v,d) => d.aiAgentType === "-" ? "" : d.aiAgentType // Export blank if it was just a dash
        },
        {
            title: "Skills", field: "skills", minWidth: 200, hozAlign: "left",
            editor: "input",
            formatter: editableCellFormatter,
            headerFilter: "input", headerFilterPlaceholder: "Filter by skills (comma-sep)...",
            visible: false,
            cellEdited: (cell) => {
                const engineerName = cell.getRow().getData().name;
                const newSkillsString = cell.getValue();
                const newSkillsArray = newSkillsString ? newSkillsString.split(',').map(s => s.trim()).filter(s => s) : [];
                const engineerGlobal = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
                if (engineerGlobal) {
                    if (!engineerGlobal.attributes) engineerGlobal.attributes = {isAISWE: false, aiAgentType: null, skills:[], yearsOfExperience:0};
                    engineerGlobal.attributes.skills = newSkillsArray;
                    console.log(`Updated skills for ${engineerName} to:`, newSkillsArray);
                    if (typeof saveSystemChanges === 'function') saveSystemChanges();
                }
            },
            download: true, accessorDownload: (v,d) => d.skills
        },
        {
            title: "Years Exp.", field: "yearsOfExperience", width: 100, hozAlign: "right", sorter: "number",
            formatter: (cell) => {
                const val = cell.getValue();
                return (typeof val === 'number') ? `${val} years` : (val || "-");
            },
            headerFilter: "number", headerFilterParams:{placeholder:"e.g. >2"}, // Tabulator uses headerFilterParams for placeholder
            visible: false,
            download: true, accessorDownload: (v,d) => d.yearsOfExperience
        },
        {
            title: "Team Identity", field: "teamId", sorterParams: { alignEmptyValues: "top" }, minWidth: 170, hozAlign: "left",
            editor: "list", editorParams: getTeamIdentityCellEditorParams,
            formatter: editableCellFormatter,
            headerFilter: "list", headerFilterParams: getTeamIdentityHeaderFilterParams,
            headerFilterFunc: (headerValue, rowValue, rowData, filterParams) => {
                if (headerValue === "") return true;
                if (headerValue === "_UNALLOCATED_") return !rowValue;
                return rowValue === headerValue;
            },
            cellEdited: (cell) => {
                const engineerName = cell.getRow().getData().name;
                const newAssignedTeamId = cell.getValue() === "" ? null : cell.getValue();
                const engineerGlobal = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
                if (engineerGlobal) {
                    const oldTeamId = engineerGlobal.currentTeamId;
                    if (oldTeamId === newAssignedTeamId) return;

                    engineerGlobal.currentTeamId = newAssignedTeamId;
                    if (oldTeamId) {
                        const oldTeam = (currentSystemData.teams || []).find(t => t.teamId === oldTeamId);
                        if (oldTeam && Array.isArray(oldTeam.engineers)) {
                            oldTeam.engineers = oldTeam.engineers.filter(name => name !== engineerName);
                        }
                    }
                    if (newAssignedTeamId) {
                        const newTeam = (currentSystemData.teams || []).find(t => t.teamId === newAssignedTeamId);
                        if (newTeam) {
                            if (!Array.isArray(newTeam.engineers)) newTeam.engineers = [];
                            if (!newTeam.engineers.includes(engineerName)) {
                                newTeam.engineers.push(engineerName);
                            }
                        }
                    }
                    console.log(`Moved engineer ${engineerName} from team ${oldTeamId || 'Unassigned'} to ${newAssignedTeamId || 'Unassigned'}.`);
                    if (typeof saveSystemChanges === 'function') saveSystemChanges();
                    // Refresh the table to reflect potential changes in Team Identity display and available options in other rows.
                    if (typeof generateEngineerTable === 'function') generateEngineerTable();
                }
            },
            accessorDownload: (v,d) => { const t = (currentSystemData.teams || []).find(team => team.teamId === d.teamId); return t ? (t.teamIdentity || t.teamName || d.teamId) : "Unallocated"; }
        },
        { title: "Manager (SDM)", field: "sdmName", sorter: "string", minWidth: 150, editable: false, headerFilter: "list", headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.sdms, 'sdmName'), headerFilterFunc: "=", headerFilterPlaceholder: "Filter by SDM...", accessorDownload: (v,d) => d.sdmName },
        { title: "Senior Manager", field: "seniorManagerName", sorter: "string", minWidth: 150, editable: false, headerFilter: "list", headerFilterParams: () => getNameHeaderFilterParams(currentSystemData.seniorManagers, 'seniorManagerName'), headerFilterFunc: "=", headerFilterPlaceholder: "Filter by Sr. Mgr...", accessorDownload: (v,d) => d.seniorManagerName },
    ];
}

/**
 * Updates the H2 heading for the engineer table with summary stats.
 * MODIFIED: Calculates BIS based on `allKnownEngineers` that have a `currentTeamId`.
 */
function updateEngineerTableHeading() {
    const heading = document.getElementById('engineerTableHeading');
    if (!currentSystemData || !heading) return;

    let totalFundedHC = 0;
    (currentSystemData.teams || []).forEach(team => {
        totalFundedHC += team.fundedHeadcount ?? 0;
    });

    // Calculate Team BIS by counting engineers in allKnownEngineers that have a currentTeamId
    const totalTeamBIS = (currentSystemData.allKnownEngineers || []).filter(eng => eng.currentTeamId).length;

    // Calculate Away Team BIS (sum of awayTeamMembers arrays)
    let totalAwayTeamBIS = 0;
    (currentSystemData.teams || []).forEach(team => {
        totalAwayTeamBIS += (team.awayTeamMembers || []).length;
    });

    const totalEffectiveBIS = totalTeamBIS + totalAwayTeamBIS;
    const totalHiringGap = totalFundedHC - totalTeamBIS; // Gap is based on primary team members vs funded

    heading.innerText = `Engineer Resource List (Funded: ${totalFundedHC} | Team BIS: ${totalTeamBIS} | Away BIS: ${totalAwayTeamBIS} | Effective BIS: ${totalEffectiveBIS} | Hiring Gap: ${totalHiringGap})`;
    heading.style.color = totalHiringGap < 0 ? 'blue' : (totalHiringGap > 0 ? 'darkorange' : 'green');
    heading.title = `Finance Approved Funding: ${totalFundedHC}\nActual Team Members (BIS): ${totalTeamBIS}\nAway-Team Members: ${totalAwayTeamBIS}\nTotal Effective Capacity (Team + Away): ${totalEffectiveBIS}\nHiring Gap (Funded - Team BIS): ${totalHiringGap}`;
}


/**
 * Generates the "Add New Resource" form section.
 * MODIFIED: Added fields for new engineer attributes (isAISWE, aiAgentType, skills, yearsOfExperience).
 */
function generateAddNewResourceSection(containerElement) {
    console.log("Generating 'Add New Resource' section with new engineer attributes...");
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
        containerElement.appendChild(sectionDiv); // Append to the provided container
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
            <label for="newResourceType" style="display:block; margin-bottom:5px;">Resource Type:</label>
            <select id="newResourceType" name="resourceType" onchange="toggleNewResourceFields()">
                <option value="engineer">Engineer</option>
                <option value="sdm">SDM</option>
                <option value="sr_manager">Senior Manager</option>
                <option value="pmt">PMT</option>
            </select>
        </div>
    `;

    // Fields for Engineer - MODIFIED to include new attributes
    form.innerHTML += `
        <div id="newEngineerFields" class="resource-fields" style="border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
            <h5 style="margin-top:0; margin-bottom:10px;">Engineer Details</h5>
            <div style="margin-bottom:8px;">
                <label for="newEngineerName" style="display:block;">Engineer Name:</label>
                <input type="text" id="newEngineerName" name="engineerName" required>
            </div>
            <div style="margin-bottom:8px;">
                <label for="newEngineerLevel" style="display:block;">Level (1-7):</label>
                <input type="number" id="newEngineerLevel" name="engineerLevel" min="1" max="7" value="1" required style="width:80px;">
            </div>
            <div style="margin-bottom:8px;">
                <label for="newEngineerYearsOfExperience" style="display:block;">Years of Experience:</label>
                <input type="number" id="newEngineerYearsOfExperience" name="yearsOfExperience" min="0" value="0" style="width:80px;">
            </div>
            <div style="margin-bottom:8px;">
                <label for="newEngineerSkills" style="display:block;">Skills (comma-separated):</label>
                <input type="text" id="newEngineerSkills" name="skills" placeholder="e.g., Java, AWS, Agile">
            </div>
            <div style="margin-top:10px; margin-bottom:5px;">
                <input type="checkbox" id="newEngineerIsAISWE" name="isAISWE" onchange="toggleAIAgentTypeField()" style="margin-right:5px; vertical-align:middle;">
                <label for="newEngineerIsAISWE" style="vertical-align:middle;">Is AI Software Engineer?</label>
            </div>
            <div id="aiAgentTypeContainer" style="display:none; margin-top:5px; margin-bottom:8px;">
                <label for="newEngineerAIAgentType" style="display:block;">AI Agent Type:</label>
                <input type="text" id="newEngineerAIAgentType" name="aiAgentType" placeholder="e.g., Code Generation, Testing">
            </div>
        </div>
    `;

    const srManagerOptions = (currentSystemData?.seniorManagers || []).map(sm => `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`).join('');
    form.innerHTML += `
        <div id="newSdmFields" class="resource-fields" style="display:none; margin-bottom:10px; border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
            <h5 style="margin-top:0; margin-bottom:10px;">SDM Details</h5>
            <div style="margin-bottom:8px;">
                <label for="newSdmName" style="display:block;">SDM Name:</label>
                <input type="text" id="newSdmName" name="sdmName">
            </div>
            <div>
                <label for="assignSrManagerId" style="display:block;">Assign to Senior Manager (Optional):</label>
                <select id="assignSrManagerId" name="srManagerId">
                    <option value="">-- None --</option>
                    ${srManagerOptions}
                </select>
            </div>
        </div>
    `;
    form.innerHTML += `
        <div id="newSrManagerFields" class="resource-fields" style="display:none; margin-bottom:10px; border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
             <h5 style="margin-top:0; margin-bottom:10px;">Senior Manager Details</h5>
            <div>
                <label for="newSrManagerName" style="display:block;">Senior Manager Name:</label>
                <input type="text" id="newSrManagerName" name="srManagerName">
            </div>
        </div>
    `;
    form.innerHTML += `
        <div id="newPmtFields" class="resource-fields" style="display:none; margin-bottom:10px; border:1px solid #e0e0e0; padding:10px; border-radius:4px;">
            <h5 style="margin-top:0; margin-bottom:10px;">PMT Details</h5>
            <div>
                <label for="newPmtName" style="display:block;">PMT Name:</label>
                <input type="text" id="newPmtName" name="pmtName">
            </div>
        </div>
    `;

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Add Resource';
    submitButton.className = 'btn-primary';
    submitButton.style.marginTop = '10px';
    form.appendChild(submitButton);

    sectionDiv.appendChild(form);
    toggleNewResourceFields(); // Initial call
}

/**
 * Toggles visibility of form fields based on selected resource type.
 * MODIFIED: Calls toggleAIAgentTypeField when engineer is selected.
 */
function toggleNewResourceFields() {
    const resourceType = document.getElementById('newResourceType').value;
    document.querySelectorAll('#addNewResourceForm .resource-fields').forEach(div => {
        div.style.display = 'none';
        div.querySelectorAll('input, select').forEach(input => {
            if (input.type !== 'select-one' && input.type !== 'checkbox') input.value = '';
            else if (input.type === 'select-one') input.selectedIndex = 0;
            else if (input.type === 'checkbox') input.checked = false;
            input.required = false; // Reset required status
        });
    });

    if (resourceType === 'engineer') {
        document.getElementById('newEngineerFields').style.display = 'block';
        document.getElementById('newEngineerName').required = true;
        document.getElementById('newEngineerLevel').required = true;
        // Years, Skills, AI Agent Type are not strictly required but will be collected
        if (typeof toggleAIAgentTypeField === 'function') toggleAIAgentTypeField(); // Ensure AI type field visibility is correct
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

/**
 * Helper function to toggle AI Agent Type field visibility based on IsAISWE checkbox.
 * NEW function.
 */
function toggleAIAgentTypeField() {
    const isAISWECheckbox = document.getElementById('newEngineerIsAISWE');
    const aiAgentTypeContainer = document.getElementById('aiAgentTypeContainer');
    const aiAgentTypeInput = document.getElementById('newEngineerAIAgentType');

    if (isAISWECheckbox && aiAgentTypeContainer && aiAgentTypeInput) {
        if (isAISWECheckbox.checked) {
            aiAgentTypeContainer.style.display = 'block';
            aiAgentTypeInput.required = true; // Make AI type required if it's an AI SWE
        } else {
            aiAgentTypeContainer.style.display = 'none';
            aiAgentTypeInput.required = false;
            aiAgentTypeInput.value = '';
        }
    }
}

/**
 * Handles adding a new resource to the system.
 * MODIFIED: Collects new attributes for engineers and saves them in the 'attributes' object.
 */
function handleAddNewResource() {
    const resourceType = document.getElementById('newResourceType').value;
    let success = false;
    let newResourceDataForLog = {};

    if (!currentSystemData) {
        alert("Error: currentSystemData is not loaded. Cannot add resource.");
        return;
    }

    if (resourceType === 'engineer') {
        const name = document.getElementById('newEngineerName').value.trim();
        const level = parseInt(document.getElementById('newEngineerLevel').value);
        const yearsOfExperience = parseInt(document.getElementById('newEngineerYearsOfExperience').value) || 0;
        const skillsString = document.getElementById('newEngineerSkills').value.trim();
        const skills = skillsString ? skillsString.split(',').map(s => s.trim()).filter(s => s) : [];
        const isAISWE = document.getElementById('newEngineerIsAISWE').checked;
        const aiAgentType = isAISWE ? document.getElementById('newEngineerAIAgentType').value.trim() : null;

        if (name && !isNaN(level) && level >= 1 && level <= 7) {
            if (!(currentSystemData.allKnownEngineers || []).some(e => e.name.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.allKnownEngineers) currentSystemData.allKnownEngineers = [];
                const newEngineer = {
                    name,
                    level,
                    currentTeamId: null, // Initially unassigned
                    attributes: {
                        isAISWE,
                        aiAgentType: isAISWE ? (aiAgentType || "General AI") : null,
                        skills,
                        yearsOfExperience
                    }
                };
                currentSystemData.allKnownEngineers.push(newEngineer);
                newResourceDataForLog = newEngineer;
                success = true;
            } else {
                alert(`Engineer with name "${name}" already exists in the global roster.`);
            }
        } else {
            alert("Invalid engineer name or level. Please ensure name is provided and level is between 1 and 7.");
        }
    } else if (resourceType === 'sdm') {
        const name = document.getElementById('newSdmName').value.trim();
        const srManagerId = document.getElementById('assignSrManagerId').value || null;
        if (name) {
            if (!(currentSystemData.sdms || []).some(s => s.sdmName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.sdms) currentSystemData.sdms = [];
                const newSdm = { sdmId: 'sdm-' + Date.now(), sdmName: name, seniorManagerId: srManagerId };
                currentSystemData.sdms.push(newSdm);
                newResourceDataForLog = newSdm;
                success = true;
            } else { alert(`SDM with name "${name}" already exists.`); }
        } else { alert("SDM name cannot be empty."); }
    } else if (resourceType === 'sr_manager') {
        const name = document.getElementById('newSrManagerName').value.trim();
        if (name) {
            if (!(currentSystemData.seniorManagers || []).some(s => s.seniorManagerName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.seniorManagers) currentSystemData.seniorManagers = [];
                const newSrManager = { seniorManagerId: 'srMgr-' + Date.now(), seniorManagerName: name };
                currentSystemData.seniorManagers.push(newSrManager);
                newResourceDataForLog = newSrManager;
                success = true;
            } else { alert(`Senior Manager with name "${name}" already exists.`); }
        } else { alert("Senior Manager name cannot be empty."); }
    } else if (resourceType === 'pmt') {
        const name = document.getElementById('newPmtName').value.trim();
        if (name) {
            if (!(currentSystemData.pmts || []).some(p => p.pmtName.toLowerCase() === name.toLowerCase())) {
                if (!currentSystemData.pmts) currentSystemData.pmts = [];
                const newPmt = { pmtId: 'pmt-' + Date.now(), pmtName: name };
                currentSystemData.pmts.push(newPmt);
                newResourceDataForLog = newPmt;
                success = true;
            } else { alert(`PMT with name "${name}" already exists.`); }
        } else { alert("PMT name cannot be empty."); }
    }

    if (success) {
        alert("Resource added successfully to the system roster!");
        console.log("Added new resource to currentSystemData:", newResourceDataForLog);
        if (typeof saveSystemChanges === 'function') saveSystemChanges();
        document.getElementById('addNewResourceForm').reset();
        toggleNewResourceFields(); // This will also call toggleAIAgentTypeField

        // Refresh relevant views if they are currently displayed
        if (document.getElementById('organogramView').style.display !== 'none') {
            if (typeof generateOrganogram === 'function') generateOrganogram();
            if (typeof generateTeamTable === 'function') generateTeamTable(currentSystemData); // Pass data
        }
        if (document.getElementById('engineerTableView').style.display !== 'none') {
            if (typeof generateEngineerTable === 'function') generateEngineerTable();
        }
        // Update dropdowns in other forms if necessary (e.g., SDM list in team edit, Sr Mgr list here)
        if (resourceType === 'sr_manager' && document.getElementById('assignSrManagerId')) {
            const srManagerSelect = document.getElementById('assignSrManagerId');
            const currentSrMgrs = currentSystemData.seniorManagers || [];
            srManagerSelect.innerHTML = '<option value="">-- None --</option>' + currentSrMgrs.map(sm => `<option value="${sm.seniorManagerId}">${sm.seniorManagerName}</option>`).join('');
        }
        if (resourceType === 'sdm' && typeof displayTeamsForEditing === 'function' && document.getElementById('systemEditForm').style.display !== 'none') {
            displayTeamsForEditing(currentSystemData.teams, -1); // Refresh team edit view to update SDM lists
        }
         if (resourceType === 'pmt' && typeof displayTeamsForEditing === 'function' && document.getElementById('systemEditForm').style.display !== 'none') {
            displayTeamsForEditing(currentSystemData.teams, -1); // Refresh team edit view to update PMT lists
        }
    }
}

