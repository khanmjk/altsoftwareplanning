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

    // Attach event listeners (replacing inline onclick handlers per contract)
    _attachSystemEditEventListeners();

    // Populate the form
    populateSystemEditForm(systemData);
}

/**
 * Attaches event listeners to the System Edit Form buttons.
 * This replaces the inline onclick handlers per workspace-canvas-contract.
 */
function _attachSystemEditEventListeners() {
    const saveDetailsBtn = document.getElementById('saveSystemDetailsBtn');
    const addServiceBtn = document.getElementById('addNewServiceBtn');
    const addTeamBtn = document.getElementById('addNewTeamBtn');
    const saveAllBtn = document.getElementById('saveAllChangesBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (saveDetailsBtn) saveDetailsBtn.addEventListener('click', saveSystemDetails);
    if (addServiceBtn) addServiceBtn.addEventListener('click', addNewService);
    if (addTeamBtn) addTeamBtn.addEventListener('click', addNewTeam);
    if (saveAllBtn) saveAllBtn.addEventListener('click', saveAllChanges);
    if (cancelBtn) cancelBtn.addEventListener('click', exitEditMode);
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
                    <button type="button" id="saveSystemDetailsBtn" class="btn btn-primary">Save System Details</button>
                </div>
            </form>

            <div class="system-edit-section-header">
                <h3>Services</h3>
            </div>
            <div id="editServicesManagement"></div>
            <div class="system-edit-actions">
                <button type="button" id="addNewServiceBtn" class="btn btn-primary">Add New Service</button>
            </div>

            <div class="system-edit-section-header">
                <h3>Teams</h3>
            </div>
            <div id="teamsManagement"></div>
            <div class="system-edit-actions">
                <button id="addNewTeamBtn" type="button" class="btn btn-primary">Add New Team</button>
            </div>

            <div class="system-edit-footer-actions">
                <button type="button" id="saveAllChangesBtn" class="btn btn-success">Save All Changes</button>
                <button type="button" id="cancelEditBtn" class="btn btn-danger">Cancel</button>
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


/** Add New Service **/
function addNewService(overrides = {}) {
    const newService = {
        serviceName: 'New Service ' + ((SystemService.getCurrentSystem().services?.length || 0) + 1),
        serviceDescription: '',
        owningTeamId: null,
        apis: [],
        serviceDependencies: [],
        platformDependencies: [],
        ...overrides
    };

    if (!SystemService.getCurrentSystem().services) SystemService.getCurrentSystem().services = [];
    SystemService.getCurrentSystem().services.push(newService);

    // Refresh Component
    if (serviceEditComponent) {
        serviceEditComponent.expandedIndex = SystemService.getCurrentSystem().services.length - 1; // Expand new
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

    if (!SystemService.getCurrentSystem().teams) SystemService.getCurrentSystem().teams = [];
    SystemService.getCurrentSystem().teams.push(newTeam);

    // Refresh Component
    if (teamEditComponent) {
        teamEditComponent.expandedIndex = SystemService.getCurrentSystem().teams.length - 1; // Expand new
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
        notificationManager.showToast('System name cannot be empty.', 'warning');
        return;
    }

    SystemService.getCurrentSystem().systemName = newSystemName;
    SystemService.getCurrentSystem().systemDescription = systemDescriptionTextarea.value.trim();

    systemRepository.saveSystem(newSystemName, SystemService.getCurrentSystem());
    notificationManager.showToast('System details saved.', 'success');


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
        notificationManager.showToast('System Name cannot be empty.', 'warning');
        if (systemNameInput) systemNameInput.focus();
        return;
    }

    if (!finalSystemDescription) {
        if (!await notificationManager.confirm('System Description is empty. Save anyway?', 'Empty Description', { confirmStyle: 'warning' })) {
            if (systemDescriptionTextarea) systemDescriptionTextarea.focus();
            return;
        }
    }

    // 3. Update Data Object (temporarily)
    const oldSystemNameKey = SystemService.getCurrentSystem().systemName;
    SystemService.getCurrentSystem().systemName = finalSystemName;
    SystemService.getCurrentSystem().systemDescription = finalSystemDescription;

    // 4. Validate Engineer Assignments
    if (!validateEngineerAssignments()) {
        // Revert name change on validation failure to avoid state mismatch
        SystemService.getCurrentSystem().systemName = oldSystemNameKey;
        return;
    }

    // 5. Save to Repository (with Rename/Overwrite Logic)
    try {
        // Check for Rename: In this app, renaming acts as "Save Copy". 
        // We DO NOT delete the old system. This allows users to experiment by creating variations.
        // if (oldSystemNameKey && oldSystemNameKey !== finalSystemName) { ... } // DELETED

        // Check for Overwrite: If new name exists (and it's not the same as old name)
        if (systemRepository.getSystemData(finalSystemName) && oldSystemNameKey !== finalSystemName) {
            if (!await notificationManager.confirm(`A system named "${finalSystemName}" already exists. Overwrite it?`, 'Overwrite System', { confirmStyle: 'danger' })) {
                systemRepository.saveSystem(newSystemName, SystemService.getCurrentSystem());
            }
        }

        // Perform Save
        const saved = systemRepository.saveSystem(finalSystemName, SystemService.getCurrentSystem());

        if (saved) {
            // Recalculate capacity metrics so Year Plan picks up changes
            CapacityEngine.recalculate(SystemService.getCurrentSystem());

            notificationManager.showToast(`System "${finalSystemName}" saved successfully!`, 'success');


        } else {
            notificationManager.showToast('Failed to save system. Please try again.', 'error');
            SystemService.getCurrentSystem().systemName = oldSystemNameKey; // Revert on failure
        }
    } catch (error) {
        console.error("Error saving system:", error);
        notificationManager.showToast('An error occurred while saving.', 'error');
        SystemService.getCurrentSystem().systemName = oldSystemNameKey; // Revert on error
    }
}


/** Exit Edit Mode **/
function exitEditMode() {
    console.log("Exiting edit mode...");
    // If we were creating a new system, return to home or load the new system
    if (SystemService.getCurrentSystem() && SystemService.getCurrentSystem().systemName) {
        SystemService.loadAndActivate(SystemService.getCurrentSystem().systemName);
    } else {
        appState.closeCurrentSystem();
    }
}


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

    const allSdms = SystemService.getCurrentSystem().sdms || [];
    const allSeniorManagers = SystemService.getCurrentSystem().seniorManagers || [];
    const currentSdm = allSdms.find(sdm => sdm && sdm.sdmId === currentSdmId);

    if (!currentSdm) {
        srMgrContainer.innerText = 'Assign an SDM to manage Senior Manager assignment.';
        return;
    }

    let title = document.createElement('h6');
    title.innerText = `Senior Manager for SDM: ${currentSdm.sdmName}`;
    srMgrContainer.appendChild(title);

    const currentSrMgr = allSeniorManagers.find(sr => sr && sr.seniorManagerId === currentSdm.seniorManagerId);

    const srMgrDualList = new DualListSelector({
        contextIndex: teamIndex,
        leftLabel: 'Current Sr. Mgr:',
        rightLabel: 'Available Sr. Mgrs:',
        currentOptions: currentSrMgr ? [{ value: currentSrMgr.seniorManagerId, text: currentSrMgr.seniorManagerName }] : [],
        availableOptions: allSeniorManagers.filter(sr => sr && sr.seniorManagerId !== currentSdm.seniorManagerId)
            .map(sr => ({ value: sr.seniorManagerId, text: sr.seniorManagerName })),
        leftField: `currentSrMgr_${currentSdmId}`,
        rightField: `availableSrMgrs_${currentSdmId}`,
        moveCallback: (movedSrMgrId, direction) => {
            const sdmToUpdate = SystemService.getCurrentSystem().sdms.find(s => s.sdmId === currentSdmId);
            if (sdmToUpdate) {
                sdmToUpdate.seniorManagerId = (direction === 'add') ? movedSrMgrId : null;
            }
        },
        multiSelectLeft: false,
        allowAddNew: true,
        addNewPlaceholder: 'Enter New Sr. Manager Name',
        addNewCallback: (newSrMgrName) => {
            if (!newSrMgrName || newSrMgrName.trim() === '') return null;
            newSrMgrName = newSrMgrName.trim();
            let existingSrMgr = (SystemService.getCurrentSystem().seniorManagers || []).find(s => s && s.seniorManagerName.toLowerCase() === newSrMgrName.toLowerCase());
            if (existingSrMgr) {
                notificationManager.showToast(`Senior Manager "${newSrMgrName}" already exists.`, 'warning');
                return null;
            }
            const newSrMgrId = 'srMgr-' + Date.now();
            const newSrMgr = { seniorManagerId: newSrMgrId, seniorManagerName: newSrMgrName };
            if (!SystemService.getCurrentSystem().seniorManagers) SystemService.getCurrentSystem().seniorManagers = [];
            SystemService.getCurrentSystem().seniorManagers.push(newSrMgr);
            return { value: newSrMgrId, text: newSrMgrName };
        }
    }).render();
    srMgrContainer.appendChild(srMgrDualList);
}

/** Validation Helper */
function validateEngineerAssignments() {
    const engineerAssignments = {};
    SystemService.getCurrentSystem().teams.forEach(team => {
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
        notificationManager.showToast('Validation Errors:\n' + validationErrors, 'error');
        return false;
    }
    return true;
}


