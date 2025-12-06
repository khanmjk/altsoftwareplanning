/**
 * Edit System View Logic
 * Refactored to use ServiceEditComponent and TeamEditComponent
 */

// Global Instances
let serviceEditComponent = null;
let teamEditComponent = null;

/** Show System Edit Form using WorkspaceComponent */
function showSystemEditForm(systemData, container) {
    console.log("Entering Edit System form (Focus Mode)...");

    // Fallback if container not passed
    if (!container) {
        container = document.getElementById('systemEditForm');
    }
    if (!container) {
        console.error("System Edit Form container not found.");
        return;
    }

    if (!systemData) {
        console.error("showSystemEditForm called without systemData.");
        container.innerHTML = '<div class="alert alert-danger">Error: No system data loaded.</div>';
        return;
    }

    // Inject the template
    container.innerHTML = systemEditFormTemplate;

    // Populate the form
    populateSystemEditForm(systemData);
}

// Template for the System Edit Form
const systemEditFormTemplate = `
        <div id="systemEditFormContent" class="system-edit-container">
            <!-- Header removed to avoid duplication -->
            
            <div class="system-edit-section-header">
                <h3>System Details</h3>
            </div>
            
            <form id="editSystemForm">
                <div class="system-edit-group">
                    <label for="systemNameInput">System Name:</label>
                    <input type="text" id="systemNameInput" class="form-control">
                </div>
                <div class="system-edit-group">
                    <label for="systemDescriptionInput">System Description:</label>
                    <textarea id="systemDescriptionInput" class="form-control"></textarea>
                </div>
                <div class="system-edit-actions">
                    <button type="button" class="btn btn-primary" onclick="saveSystemDetails()">Save System Details</button>
                </div>
            </form>

            <div class="system-edit-section-header">
                <h3>Services</h3>
            </div>
            <div id="editServicesManagement"></div>
            <div class="system-edit-actions">
                <button type="button" class="btn btn-primary" onclick="addNewService()">Add New Service</button>
            </div>

            <div class="system-edit-section-header">
                <h3>Teams</h3>
            </div>
            <div id="teamsManagement"></div>
            <div class="system-edit-actions">
                <button id="addNewTeamButton" type="button" class="btn btn-primary" onclick="addNewTeam()">Add New Team</button>
            </div>

            <div class="system-edit-footer-actions">
                <button type="button" class="btn btn-success" onclick="saveAllChanges()">Save All Changes</button>
                <button type="button" class="btn btn-danger" onclick="exitEditMode()">Cancel</button>
            </div>
        </div>
    `;

/**
 * Populates the System Edit Form with data.
 */
function populateSystemEditForm(systemData) {
    console.log("Populating System Edit Form...");
    if (!systemData) { console.error("populateSystemEditForm called without systemData."); return; }

    // --- Populate form fields ---
    const nameInput = document.getElementById('systemNameInput');
    const descInput = document.getElementById('systemDescriptionInput');
    if (nameInput) nameInput.value = systemData.systemName || '';
    if (descInput) descInput.value = systemData.systemDescription || '';

    // Initialize Components
    if (!serviceEditComponent) {
        serviceEditComponent = new ServiceEditComponent('editServicesManagement', systemData);
    } else {
        serviceEditComponent.systemData = systemData; // Update data
    }

    if (!teamEditComponent) {
        teamEditComponent = new TeamEditComponent('teamsManagement', systemData);
    } else {
        teamEditComponent.systemData = systemData; // Update data
    }

    // Render Components
    try {
        serviceEditComponent.render();
        teamEditComponent.render();
    } catch (error) {
        console.error("Error rendering edit components:", error);
    }
}
window.populateSystemEditForm = populateSystemEditForm;

/** Add New Service **/
function addNewService(overrides = {}) {
    const newService = {
        serviceName: 'New Service ' + ((currentSystemData.services?.length || 0) + 1),
        serviceDescription: '',
        owningTeamId: null,
        apis: [],
        serviceDependencies: [],
        platformDependencies: [],
        ...overrides
    };

    if (!currentSystemData.services) currentSystemData.services = [];
    currentSystemData.services.push(newService);

    // Refresh Component
    if (serviceEditComponent) {
        serviceEditComponent.expandedIndex = currentSystemData.services.length - 1; // Expand new
        serviceEditComponent.render();
    }
    return newService;
}

/** Add New Team **/
function addNewTeam(overrides = {}) {
    const newTeamId = 'team-' + Date.now();
    const newTeam = {
        teamId: newTeamId,
        teamName: '',
        teamIdentity: '',
        teamDescription: '',
        fundedHeadcount: 0,
        buildersInSeats: 0,
        engineers: [],
        sdmId: null,
        pmtId: null,
        ...overrides
    };

    if (!currentSystemData.teams) currentSystemData.teams = [];
    currentSystemData.teams.push(newTeam);

    // Refresh Component
    if (teamEditComponent) {
        teamEditComponent.expandedIndex = currentSystemData.teams.length - 1; // Expand new
        teamEditComponent.render();
    }
    return newTeam;
}

/** Save System Details **/
async function saveSystemDetails() {
    const systemNameInput = document.getElementById('systemNameInput');
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');

    const newSystemName = systemNameInput.value.trim();

    if (!newSystemName) {
        window.notificationManager.showToast('System name cannot be empty.', 'warning');
        return;
    }

    currentSystemData.systemName = newSystemName;
    currentSystemData.systemDescription = systemDescriptionTextarea.value.trim();

    window.systemRepository.saveSystem(newSystemName, currentSystemData);
    window.notificationManager.showToast('System details saved.', 'success');

    if (currentMode == Modes.EDITING) {
        generateTeamTable(currentSystemData);
        generateServiceDependenciesTable();
        updateServiceVisualization();
        updateDependencyVisualization();
    }
}

/** Save All Changes (Main Save Handler) **/
async function saveAllChanges() {
    console.log("saveAllChanges called.");

    // 1. Get Inputs
    const systemNameInput = document.getElementById('systemNameInput');
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');
    const finalSystemName = systemNameInput ? systemNameInput.value.trim() : '';
    const finalSystemDescription = systemDescriptionTextarea ? systemDescriptionTextarea.value.trim() : '';

    // 2. Validate Inputs
    if (!finalSystemName) {
        window.notificationManager.showToast('System Name cannot be empty.', 'warning');
        if (systemNameInput) systemNameInput.focus();
        return;
    }

    if (!finalSystemDescription) {
        if (!await window.notificationManager.confirm('System Description is empty. Save anyway?', 'Empty Description', { confirmStyle: 'warning' })) {
            if (systemDescriptionTextarea) systemDescriptionTextarea.focus();
            return;
        }
    }

    // 3. Update Data Object (temporarily)
    const oldSystemNameKey = currentSystemData.systemName;
    currentSystemData.systemName = finalSystemName;
    currentSystemData.systemDescription = finalSystemDescription;

    // 4. Validate Engineer Assignments
    if (!validateEngineerAssignments()) {
        // Revert name change on validation failure to avoid state mismatch
        currentSystemData.systemName = oldSystemNameKey;
        return;
    }

    // 5. Save to Repository (with Rename/Overwrite Logic)
    try {
        // Check for Rename: In this app, renaming acts as "Save Copy". 
        // We DO NOT delete the old system. This allows users to experiment by creating variations.
        // if (oldSystemNameKey && oldSystemNameKey !== finalSystemName) { ... } // DELETED

        // Check for Overwrite: If new name exists (and it's not the same as old name)
        if (window.systemRepository.getSystemData(finalSystemName) && oldSystemNameKey !== finalSystemName) {
            if (!await window.notificationManager.confirm(`A system named "${finalSystemName}" already exists. Overwrite it?`, 'Overwrite System', { confirmStyle: 'danger' })) {
                // Revert and Cancel
                currentSystemData.systemName = oldSystemNameKey;
                return;
            }
        }

        // Perform Save
        const saved = window.systemRepository.saveSystem(finalSystemName, currentSystemData);

        if (saved) {
            window.notificationManager.showToast(`System "${finalSystemName}" saved successfully!`, 'success');

            // 6. Post-Save: Exit Edit Mode
            // If we were creating, this effectively switches us to "Browse" mode for the new system
            if (typeof currentMode !== 'undefined') {
                currentMode = (typeof Modes !== 'undefined' && Modes.Browse) ? Modes.Browse : 'browse';
            }
            exitEditMode();
        } else {
            window.notificationManager.showToast('Failed to save system. Please try again.', 'error');
            currentSystemData.systemName = oldSystemNameKey; // Revert on failure
        }
    } catch (error) {
        console.error("Error saving system:", error);
        window.notificationManager.showToast('An error occurred while saving.', 'error');
        currentSystemData.systemName = oldSystemNameKey; // Revert on error
    }
}
window.saveAllChanges = saveAllChanges;

/** Exit Edit Mode **/
function exitEditMode() {
    console.log("Exiting edit mode...");
    // If we were creating a new system, return to home or load the new system
    if (window.currentSystemData && window.currentSystemData.systemName) {
        if (window.loadSavedSystem) {
            window.loadSavedSystem(window.currentSystemData.systemName);
        } else {
            window.returnToHome();
        }
    } else {
        window.returnToHome();
    }
}
window.exitEditMode = exitEditMode;

/** 
 * Helper to display Senior Manager Assignment UI within SDM section 
 * Kept global as it's used by TeamEditComponent
 */
function displaySeniorManagerAssignment(sdmSectionContainer, teamIndex, currentSdmId) {
    // Find the specific container using teamIndex
    let srMgrContainer = sdmSectionContainer.querySelector(`#srMgrAssignmentContainer_${teamIndex}`);
    if (!srMgrContainer) {
        // Fallback or error handling if container structure changed
        // In the new component, we create this container, so it should be found if passed correctly
        return;
    }
    srMgrContainer.innerHTML = '';
    srMgrContainer.style.paddingLeft = '20px';

    const allSdms = currentSystemData.sdms || [];
    const allSeniorManagers = currentSystemData.seniorManagers || [];
    const currentSdm = allSdms.find(sdm => sdm && sdm.sdmId === currentSdmId);

    if (!currentSdm) {
        srMgrContainer.innerText = 'Assign an SDM to manage Senior Manager assignment.';
        return;
    }

    let title = document.createElement('h6');
    title.innerText = `Senior Manager for SDM: ${currentSdm.sdmName}`;
    srMgrContainer.appendChild(title);

    const currentSrMgr = allSeniorManagers.find(sr => sr && sr.seniorManagerId === currentSdm.seniorManagerId);

    const srMgrDualList = createDualListContainer(
        teamIndex, 'Current Sr. Mgr:', 'Available Sr. Mgrs:',
        currentSrMgr ? [{ value: currentSrMgr.seniorManagerId, text: currentSrMgr.seniorManagerName }] : [],
        allSeniorManagers.filter(sr => sr && sr.seniorManagerId !== currentSdm.seniorManagerId)
            .map(sr => ({ value: sr.seniorManagerId, text: sr.seniorManagerName })),
        `currentSrMgr_${currentSdmId}`,
        `availableSrMgrs_${currentSdmId}`,
        (movedSrMgrId, direction) => {
            const sdmToUpdate = currentSystemData.sdms.find(s => s.sdmId === currentSdmId);
            if (sdmToUpdate) {
                sdmToUpdate.seniorManagerId = (direction === 'add') ? movedSrMgrId : null;
            }
        },
        false, true, 'Enter New Sr. Manager Name',
        (newSrMgrName) => {
            if (!newSrMgrName || newSrMgrName.trim() === '') return null;
            newSrMgrName = newSrMgrName.trim();
            let existingSrMgr = (currentSystemData.seniorManagers || []).find(s => s && s.seniorManagerName.toLowerCase() === newSrMgrName.toLowerCase());
            if (existingSrMgr) {
                window.notificationManager.showToast(`Senior Manager "${newSrMgrName}" already exists.`, 'warning');
                return null;
            }
            const newSrMgrId = 'srMgr-' + Date.now();
            const newSrMgr = { seniorManagerId: newSrMgrId, seniorManagerName: newSrMgrName };
            if (!currentSystemData.seniorManagers) currentSystemData.seniorManagers = [];
            currentSystemData.seniorManagers.push(newSrMgr);
            return { value: newSrMgrId, text: newSrMgrName };
        }
    );
    srMgrContainer.appendChild(srMgrDualList);
}

/** Validation Helper */
function validateEngineerAssignments() {
    const engineerAssignments = {};
    currentSystemData.teams.forEach(team => {
        const teamEngineers = team.engineers || []; // Now array of names
        teamEngineers.forEach(engineerName => {
            if (engineerName) {
                if (engineerAssignments[engineerName]) {
                    engineerAssignments[engineerName].push(team.teamName || team.teamIdentity || 'Unnamed Team');
                } else {
                    engineerAssignments[engineerName] = [team.teamName || team.teamIdentity || 'Unnamed Team'];
                }
            }
        });
    });

    const conflictingEngineers = Object.entries(engineerAssignments).filter(([_, teams]) => teams.length > 1);
    let validationErrors = '';

    if (conflictingEngineers.length > 0) {
        validationErrors += 'The following engineers are assigned to multiple teams:\n';
        conflictingEngineers.forEach(([engineerName, teams]) => {
            validationErrors += `- ${engineerName}: ${teams.join(', ')}\n`;
        });
    }

    if (validationErrors) {
        window.notificationManager.showToast('Validation Errors:\n' + validationErrors, 'error');
        return false;
    }
    return true;
}

// Expose functions globally
window.displayServicesForEditing = (services, containerId) => {
    if (serviceEditComponent) serviceEditComponent.render();
};
window.displayTeamsForEditing = (teams, index) => {
    if (teamEditComponent) teamEditComponent.render();
};
window.displaySeniorManagerAssignment = displaySeniorManagerAssignment;
window.validateEngineerAssignments = validateEngineerAssignments;
