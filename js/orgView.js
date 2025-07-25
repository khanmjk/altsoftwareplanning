// js/orgView.js

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
 * Generates the entire Organogram View, including the new Resource Management section.
 */
function generateOrganogram() {
    console.log("Generating Organogram View...");
    const viewContainer = document.getElementById('organogramView');
    if (!viewContainer) {
        console.error("Organogram view container not found.");
        return;
    }
    viewContainer.innerHTML = `
        <div id="organogramToolbar" style="margin-bottom: 10px;"></div>
        <div id="organogramContent" style="border: 1px solid #ccc; padding: 15px;"></div>
        <div id="resourceManagementSection" style="margin-top: 30px;"></div>
        <div id="teamBreakdown" style="margin-top: 30px;"></div>
    `;

    generateOrganogramHtml();
    generateResourceManagementSection();
    generateTeamTable(currentSystemData); // Ensure team table is also generated
}


/**
 * Generates the Organogram using HTML structure.
 * (Renamed from generateOrganogram to avoid conflict with the new main function)
 */
function generateOrganogramHtml() {
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
                if (node.children && node.children.length > 0) {
                    nodeContent += '<ul style="list-style-type: none; padding-left: 15px; margin-top: 3px;">';
                    node.children.forEach(engNode => {
                        if (engNode.type === 'engineer') {
                             nodeContent += `<li style="font-size:0.85em;">${engNode.name}</li>`;
                        }
                    });
                    nodeContent += '</ul>';
                }
                break;
            default:
                nodeContent = `<strong>${node.name || 'Group'}</strong>`;
                nodeStyle = 'color: #6c757d;';
        }
        html += `<span style="${nodeStyle}">${nodeContent}</span>`;

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

/**
 * Generates the collapsible "Resource Management" section with Add and Delete forms.
 */
function generateResourceManagementSection() {
    const container = document.getElementById('resourceManagementSection');
    if (!container) return;

    container.innerHTML = `
        <div style="border: 1px solid #ccc; border-radius: 4px;">
            <h3 onclick="toggleCollapsibleSection('addResourceContent', 'addResourceToggle')" style="cursor: pointer; margin: 0; padding: 10px; background-color: #e9ecef; border-bottom: 1px solid #ccc;">
                <span id="addResourceToggle" class="toggle-indicator">(+) </span>Add New Resource
            </h3>
            <div id="addResourceContent" style="display: none; padding: 15px;"></div>
            
            <h3 onclick="toggleCollapsibleSection('deleteResourceContent', 'deleteResourceToggle')" style="cursor: pointer; margin: 0; padding: 10px; background-color: #e9ecef; border-top: 1px solid #ccc;">
                <span id="deleteResourceToggle" class="toggle-indicator">(+) </span>Delete Resource
            </h3>
            <div id="deleteResourceContent" style="display: none; padding: 15px;"></div>
        </div>
    `;

    generateAddNewResourceSection(document.getElementById('addResourceContent'));
    generateDeleteResourceSection(document.getElementById('deleteResourceContent'));
}

/**
 * Generates the "Delete Resource" form section.
 */
function generateDeleteResourceSection(containerElement) {
    if (!containerElement) return;

    containerElement.innerHTML = `
        <div style="margin-bottom: 10px;">
            <label for="deleteResourceType" style="display:block; margin-bottom:5px;">Resource Type:</label>
            <select id="deleteResourceType" onchange="populateDeleteResourceDropdown()">
                <option value="">-- Select Type --</option>
                <option value="engineer">Engineer</option>
                <option value="sdm">SDM</option>
                <option value="sr_manager">Senior Manager</option>
                <option value="pmt">PMT</option>
            </select>
        </div>
        <div style="margin-bottom: 10px;">
            <label for="deleteResourceSelect" style="display:block; margin-bottom:5px;">Resource to Delete:</label>
            <select id="deleteResourceSelect">
                <option value="">-- Select Resource --</option>
            </select>
        </div>
        <button type="button" class="btn-danger" onclick="handleDeleteResource()">Delete Selected Resource</button>
    `;
}

/**
 * Populates the second dropdown in the delete section based on the selected resource type.
 */
function populateDeleteResourceDropdown() {
    const resourceType = document.getElementById('deleteResourceType').value;
    const selectDropdown = document.getElementById('deleteResourceSelect');
    selectDropdown.innerHTML = '<option value="">-- Select Resource --</option>';

    let resources = [];
    switch (resourceType) {
        case 'engineer':
            resources = currentSystemData.allKnownEngineers || [];
            resources.forEach(r => selectDropdown.add(new Option(r.name, r.name)));
            break;
        case 'sdm':
            resources = currentSystemData.sdms || [];
            resources.forEach(r => selectDropdown.add(new Option(r.sdmName, r.sdmId)));
            break;
        case 'sr_manager':
            resources = currentSystemData.seniorManagers || [];
            resources.forEach(r => selectDropdown.add(new Option(r.seniorManagerName, r.seniorManagerId)));
            break;
        case 'pmt':
            resources = currentSystemData.pmts || [];
            resources.forEach(r => selectDropdown.add(new Option(r.pmtName, r.pmtId)));
            break;
    }
}

/**
 * Handles the logic for deleting a selected resource.
 */
function handleDeleteResource() {
    const resourceType = document.getElementById('deleteResourceType').value;
    const resourceId = document.getElementById('deleteResourceSelect').value;
    const resourceName = document.getElementById('deleteResourceSelect').options[document.getElementById('deleteResourceSelect').selectedIndex]?.text;

    if (!resourceType || !resourceId) {
        alert("Please select a resource type and a specific resource to delete.");
        return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${resourceName}"? This action cannot be undone.`)) {
        return;
    }

    let success = false;

    switch (resourceType) {
        case 'engineer':
            const engIndex = currentSystemData.allKnownEngineers.findIndex(e => e.name === resourceId);
            if (engIndex > -1) {
                const engineer = currentSystemData.allKnownEngineers[engIndex];
                // Remove from assigned team, if any
                if (engineer.currentTeamId) {
                    const team = currentSystemData.teams.find(t => t.teamId === engineer.currentTeamId);
                    if (team && team.engineers) {
                        team.engineers = team.engineers.filter(name => name !== engineer.name);
                    }
                }
                // Remove from global roster
                currentSystemData.allKnownEngineers.splice(engIndex, 1);
                success = true;
            }
            break;
        case 'sdm':
            currentSystemData.sdms = currentSystemData.sdms.filter(s => s.sdmId !== resourceId);
            // Un-assign from any teams
            currentSystemData.teams.forEach(team => {
                if (team.sdmId === resourceId) team.sdmId = null;
            });
            success = true;
            break;
        case 'sr_manager':
            currentSystemData.seniorManagers = currentSystemData.seniorManagers.filter(s => s.seniorManagerId !== resourceId);
            // Un-assign from any SDMs
            currentSystemData.sdms.forEach(sdm => {
                if (sdm.seniorManagerId === resourceId) sdm.seniorManagerId = null;
            });
            success = true;
            break;
        case 'pmt':
            currentSystemData.pmts = currentSystemData.pmts.filter(p => p.pmtId !== resourceId);
            // Un-assign from any teams
            currentSystemData.teams.forEach(team => {
                if (team.pmtId === resourceId) team.pmtId = null;
            });
            success = true;
            break;
    }

    if (success) {
        alert(`Resource "${resourceName}" has been deleted.`);
        saveSystemChanges();
        // Refresh the entire view to reflect data changes everywhere
        generateOrganogram();
    } else {
        alert(`Could not find the specified resource to delete.`);
    }
}


/**
 * Generates the Team Breakdown Table.
 * (No changes needed for this function, but it's required for the view)
 */
function generateTeamTable(systemData) {
    console.log("[DEBUG V5] ENTER generateTeamTable");

    const teamTable = document.getElementById('teamTable');
    const teamBreakdownDiv = document.getElementById('teamBreakdown'); // Get the parent container
    if (!teamBreakdownDiv) return;

    // If the table doesn't exist, create it.
    if (!teamTable) {
        const newTable = document.createElement('table');
        newTable.id = 'teamTable';
        newTable.innerHTML = '<thead></thead><tbody></tbody><tfoot></tfoot>';
        teamBreakdownDiv.appendChild(newTable);
    }
    
    // Now get the final table and its parts
    const finalTeamTable = document.getElementById('teamTable');
    const tableHead = finalTeamTable.querySelector('thead');
    const tableBody = finalTeamTable.querySelector('tbody');
    const tableFoot = finalTeamTable.querySelector('tfoot');
    
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
    const allKnownEngineers = systemData.allKnownEngineers;

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
                        const attributes = awayEng.attributes || {};
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
        const newLevelKey = document.createElement('p');
        newLevelKey.id = 'levelKey';
        newLevelKey.innerHTML = `Level Key: L1-L7. [AI - Type] indicates an AI Software Engineer and its specialization.`;
        teamBreakdownDiv.insertBefore(newLevelKey, finalTeamTable);
    }
    console.log("[DEBUG V5] EXIT generateTeamTable - Successful completion.");
}

/**
 * Generates the "Add New Resource" form section.
 * (No changes needed for this function, but it's required for the view)
 */
function generateAddNewResourceSection(containerElement) {
    console.log("Generating 'Add New Resource' section with new engineer attributes...");
    if (!containerElement) {
        console.error("Container for 'Add New Resource' section not provided.");
        return;
    }

    let sectionDiv = document.getElementById('addNewResourceSection');
    if (sectionDiv) {
        sectionDiv.innerHTML = '';
    } else {
        sectionDiv = document.createElement('div');
        sectionDiv.id = 'addNewResourceSection';
    }

    const form = document.createElement('form');
    form.id = 'addNewResourceForm';
    form.onsubmit = function(event) { event.preventDefault(); handleAddNewResource(); };

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

    containerElement.appendChild(form);
    toggleNewResourceFields();
}

/**
 * Handles adding a new resource to the system.
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
                    currentTeamId: null,
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
        toggleNewResourceFields();

        // Refresh the entire view to show the new resource in all relevant places
        generateOrganogram();
    }
}

/**
 * Toggles visibility of form fields based on selected resource type.
 */
function toggleNewResourceFields() {
    const resourceType = document.getElementById('newResourceType').value;
    document.querySelectorAll('#addNewResourceForm .resource-fields').forEach(div => {
        div.style.display = 'none';
        div.querySelectorAll('input, select').forEach(input => {
            if (input.type !== 'select-one' && input.type !== 'checkbox') input.value = '';
            else if (input.type === 'select-one') input.selectedIndex = 0;
            else if (input.type === 'checkbox') input.checked = false;
            input.required = false;
        });
    });

    if (resourceType === 'engineer') {
        document.getElementById('newEngineerFields').style.display = 'block';
        document.getElementById('newEngineerName').required = true;
        document.getElementById('newEngineerLevel').required = true;
        if (typeof toggleAIAgentTypeField === 'function') toggleAIAgentTypeField();
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
 * Helper function to toggle AI Agent Type field visibility.
 */
function toggleAIAgentTypeField() {
    const isAISWECheckbox = document.getElementById('newEngineerIsAISWE');
    const aiAgentTypeContainer = document.getElementById('aiAgentTypeContainer');
    const aiAgentTypeInput = document.getElementById('newEngineerAIAgentType');

    if (isAISWECheckbox && aiAgentTypeContainer && aiAgentTypeInput) {
        if (isAISWECheckbox.checked) {
            aiAgentTypeContainer.style.display = 'block';
            aiAgentTypeInput.required = true;
        } else {
            aiAgentTypeContainer.style.display = 'none';
            aiAgentTypeInput.required = false;
            aiAgentTypeInput.value = '';
        }
    }
}