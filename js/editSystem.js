/**
 * Edit System View Logic
 * Refactored to use ServiceEditComponent and TeamEditComponent
 */

class SystemEditController {
  constructor() {
    this.container = null;
    this.systemData = null;
    this.serviceEditComponent = null;
    this.teamEditComponent = null;
    this.refs = {};
    this._handlers = {
      saveDetails: () => this.saveSystemDetails(),
      addService: () => this.addNewService(),
      addTeam: () => this.addNewTeam(),
      saveAll: () => this.saveAllChanges(),
      cancel: () => this.exitEditMode(),
    };
  }

  render(systemData, container) {
    console.log('Entering Edit System form (Focus Mode)...');

    this.systemData = systemData;
    this.container = container || document.getElementById('systemEditForm');

    if (!this.container) {
      console.error('System Edit Form container not found.');
      return;
    }

    this._clearContainer(this.container);

    if (!this.systemData) {
      console.error('SystemEditController called without systemData.');
      this._renderError('Error: No system data loaded.');
      return;
    }

    const formShell = this._buildFormShell();
    this.container.appendChild(formShell);
    this._attachEventListeners();
    this._populateSystemEditForm();
  }

  _clearContainer(container) {
    if (!container) return;
    container.replaceChildren();
  }

  _renderError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.textContent = message;
    this.container.appendChild(alert);
  }

  _buildFormShell() {
    this.refs = {};

    const wrapper = document.createElement('div');
    wrapper.id = 'systemEditFormContent';
    wrapper.className = 'system-edit-container';

    wrapper.appendChild(this._createSectionHeader('System Details'));

    const form = document.createElement('form');
    form.id = 'editSystemForm';

    const nameInput = this._createInput('text', 'systemNameInput', 'form-control');
    const nameGroup = this._createFormGroup('System Name:', nameInput);
    form.appendChild(nameGroup);

    const descInput = this._createTextarea('systemDescriptionInput', 'form-control');
    const descGroup = this._createFormGroup('System Description:', descInput);
    form.appendChild(descGroup);

    const saveDetailsBtn = this._createButton(
      'Save System Details',
      'saveSystemDetailsBtn',
      'btn btn-primary'
    );
    const saveActions = this._createActionGroup([saveDetailsBtn], 'system-edit-actions');
    form.appendChild(saveActions);

    wrapper.appendChild(form);

    wrapper.appendChild(this._createSectionHeader('Services'));
    const servicesContainer = document.createElement('div');
    servicesContainer.id = 'editServicesManagement';
    wrapper.appendChild(servicesContainer);

    const addServiceBtn = this._createButton(
      'Add New Service',
      'addNewServiceBtn',
      'btn btn-primary'
    );
    wrapper.appendChild(this._createActionGroup([addServiceBtn], 'system-edit-actions'));

    wrapper.appendChild(this._createSectionHeader('Teams'));
    const teamsContainer = document.createElement('div');
    teamsContainer.id = 'teamsManagement';
    wrapper.appendChild(teamsContainer);

    const addTeamBtn = this._createButton('Add New Team', 'addNewTeamBtn', 'btn btn-primary');
    wrapper.appendChild(this._createActionGroup([addTeamBtn], 'system-edit-actions'));

    const saveAllBtn = this._createButton(
      'Save All Changes',
      'saveAllChangesBtn',
      'btn btn-success'
    );
    const cancelBtn = this._createButton('Cancel', 'cancelEditBtn', 'btn btn-danger');
    wrapper.appendChild(
      this._createActionGroup([saveAllBtn, cancelBtn], 'system-edit-footer-actions')
    );

    this.refs.systemNameInput = nameInput;
    this.refs.systemDescriptionInput = descInput;
    this.refs.saveDetailsBtn = saveDetailsBtn;
    this.refs.addServiceBtn = addServiceBtn;
    this.refs.addTeamBtn = addTeamBtn;
    this.refs.saveAllBtn = saveAllBtn;
    this.refs.cancelBtn = cancelBtn;
    this.refs.servicesContainer = servicesContainer;
    this.refs.teamsContainer = teamsContainer;

    return wrapper;
  }

  _createSectionHeader(title) {
    const header = document.createElement('div');
    header.className = 'system-edit-section-header';
    const heading = document.createElement('h3');
    heading.textContent = title;
    header.appendChild(heading);
    return header;
  }

  _createFormGroup(labelText, fieldEl) {
    const group = document.createElement('div');
    group.className = 'system-edit-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    if (fieldEl.id) {
      label.htmlFor = fieldEl.id;
    }
    group.appendChild(label);
    group.appendChild(fieldEl);
    return group;
  }

  _createInput(type, id, className) {
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.className = className;
    return input;
  }

  _createTextarea(id, className) {
    const textarea = document.createElement('textarea');
    textarea.id = id;
    textarea.className = className;
    return textarea;
  }

  _createButton(text, id, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = className;
    button.textContent = text;
    return button;
  }

  _createActionGroup(buttons, className) {
    const group = document.createElement('div');
    group.className = className;
    buttons.forEach((button) => group.appendChild(button));
    return group;
  }

  _attachEventListeners() {
    const { saveDetailsBtn, addServiceBtn, addTeamBtn, saveAllBtn, cancelBtn } = this.refs;

    if (saveDetailsBtn) saveDetailsBtn.addEventListener('click', this._handlers.saveDetails);
    if (addServiceBtn) addServiceBtn.addEventListener('click', this._handlers.addService);
    if (addTeamBtn) addTeamBtn.addEventListener('click', this._handlers.addTeam);
    if (saveAllBtn) saveAllBtn.addEventListener('click', this._handlers.saveAll);
    if (cancelBtn) cancelBtn.addEventListener('click', this._handlers.cancel);
  }

  _populateSystemEditForm() {
    console.log('Populating System Edit Form...');
    if (!this.systemData) {
      console.error('populateSystemEditForm called without systemData.');
      return;
    }

    const { systemNameInput, systemDescriptionInput } = this.refs;
    if (systemNameInput) systemNameInput.value = this.systemData.systemName || '';
    if (systemDescriptionInput)
      systemDescriptionInput.value = this.systemData.systemDescription || '';

    if (!this.serviceEditComponent) {
      this.serviceEditComponent = new ServiceEditComponent(
        'editServicesManagement',
        this.systemData
      );
    } else {
      this.serviceEditComponent.systemData = this.systemData;
    }

    if (!this.teamEditComponent) {
      this.teamEditComponent = new TeamEditComponent('teamsManagement', this.systemData);
    } else {
      this.teamEditComponent.systemData = this.systemData;
    }

    try {
      this.serviceEditComponent.render();
      this.teamEditComponent.render();
    } catch (error) {
      console.error('Error rendering edit components:', error);
    }
  }

  addNewService(overrides = {}) {
    const currentSystem = SystemService.getCurrentSystem();
    const newService = {
      serviceName: 'New Service ' + ((currentSystem.services?.length || 0) + 1),
      serviceDescription: '',
      owningTeamId: null,
      apis: [],
      serviceDependencies: [],
      platformDependencies: [],
      ...overrides,
    };

    if (!currentSystem.services) currentSystem.services = [];
    currentSystem.services.push(newService);

    if (this.serviceEditComponent) {
      this.serviceEditComponent.expandedIndex = currentSystem.services.length - 1;
      this.serviceEditComponent.render();
    }
    return newService;
  }

  addNewTeam(overrides = {}) {
    const currentSystem = SystemService.getCurrentSystem();
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
      ...overrides,
    };

    if (!currentSystem.teams) currentSystem.teams = [];
    currentSystem.teams.push(newTeam);

    if (this.teamEditComponent) {
      this.teamEditComponent.expandedIndex = currentSystem.teams.length - 1;
      this.teamEditComponent.render();
    }
    return newTeam;
  }

  async saveSystemDetails() {
    const { systemNameInput, systemDescriptionInput } = this.refs;
    const newSystemName = systemNameInput ? systemNameInput.value.trim() : '';

    if (!newSystemName) {
      notificationManager.showToast('System name cannot be empty.', 'warning');
      return;
    }

    const currentSystem = SystemService.getCurrentSystem();
    currentSystem.systemName = newSystemName;
    currentSystem.systemDescription = systemDescriptionInput
      ? systemDescriptionInput.value.trim()
      : '';

    const saved = SystemService.saveSystem(currentSystem, newSystemName);
    if (saved) {
      notificationManager.showToast('System details saved.', 'success');
    } else {
      notificationManager.showToast('Failed to save system details.', 'error');
    }
  }

  async saveAllChanges() {
    console.log('saveAllChanges called.');

    const { systemNameInput, systemDescriptionInput } = this.refs;
    const finalSystemName = systemNameInput ? systemNameInput.value.trim() : '';
    const finalSystemDescription = systemDescriptionInput
      ? systemDescriptionInput.value.trim()
      : '';

    if (!finalSystemName) {
      notificationManager.showToast('System Name cannot be empty.', 'warning');
      if (systemNameInput) systemNameInput.focus();
      return;
    }

    if (!finalSystemDescription) {
      const confirm = await notificationManager.confirm(
        'System Description is empty. Save anyway?',
        'Empty Description',
        { confirmStyle: 'warning' }
      );
      if (!confirm) {
        if (systemDescriptionInput) systemDescriptionInput.focus();
        return;
      }
    }

    const currentSystem = SystemService.getCurrentSystem();
    const oldSystemNameKey = currentSystem.systemName;
    currentSystem.systemName = finalSystemName;
    currentSystem.systemDescription = finalSystemDescription;

    if (!validateEngineerAssignments()) {
      currentSystem.systemName = oldSystemNameKey;
      return;
    }

    try {
      if (SystemService.systemExists(finalSystemName) && oldSystemNameKey !== finalSystemName) {
        const confirmOverwrite = await notificationManager.confirm(
          `A system named "${finalSystemName}" already exists. Overwrite it?`,
          'Overwrite System',
          { confirmStyle: 'danger' }
        );
        if (!confirmOverwrite) {
          currentSystem.systemName = oldSystemNameKey;
          const fallbackSaved = SystemService.saveSystem(currentSystem, oldSystemNameKey);
          if (!fallbackSaved) {
            notificationManager.showToast('Failed to save system. Please try again.', 'error');
          }
          return;
        }
      }

      const saved = SystemService.saveSystem(currentSystem, finalSystemName);
      if (saved) {
        CapacityEngine.recalculate(currentSystem);
        notificationManager.showToast(`System "${finalSystemName}" saved successfully!`, 'success');
      } else {
        notificationManager.showToast('Failed to save system. Please try again.', 'error');
        currentSystem.systemName = oldSystemNameKey;
      }
    } catch (error) {
      console.error('Error saving system:', error);
      notificationManager.showToast('An error occurred while saving.', 'error');
      currentSystem.systemName = oldSystemNameKey;
    }
  }

  exitEditMode() {
    console.log('Exiting edit mode...');
    const currentSystem = SystemService.getCurrentSystem();
    if (currentSystem && currentSystem.systemName) {
      SystemService.loadAndActivate(currentSystem.systemName);
    } else {
      appState.closeCurrentSystem();
    }
  }
}

/* exported displaySeniorManagerAssignment */
/**
 * Helper to display Senior Manager Assignment UI within SDM section
 * Kept global as it's used by TeamEditComponent
 */
function displaySeniorManagerAssignment(sdmSectionContainer, teamIndex, currentSdmId) {
  const srMgrContainer = sdmSectionContainer.querySelector(
    `#srMgrAssignmentContainer_${teamIndex}`
  );
  if (!srMgrContainer) {
    return;
  }
  srMgrContainer.replaceChildren();

  const allSdms = SystemService.getCurrentSystem().sdms || [];
  const allSeniorManagers = SystemService.getCurrentSystem().seniorManagers || [];
  const currentSdm = allSdms.find((sdm) => sdm && sdm.sdmId === currentSdmId);

  if (!currentSdm) {
    srMgrContainer.textContent = 'Assign an SDM to manage Senior Manager assignment.';
    return;
  }

  const title = document.createElement('h6');
  title.textContent = `Senior Manager for SDM: ${currentSdm.sdmName}`;
  srMgrContainer.appendChild(title);

  const currentSrMgr = allSeniorManagers.find(
    (sr) => sr && sr.seniorManagerId === currentSdm.seniorManagerId
  );

  const srMgrDualList = new DualListSelector({
    contextIndex: teamIndex,
    leftLabel: 'Current Sr. Mgr:',
    rightLabel: 'Available Sr. Mgrs:',
    currentOptions: currentSrMgr
      ? [{ value: currentSrMgr.seniorManagerId, text: currentSrMgr.seniorManagerName }]
      : [],
    availableOptions: allSeniorManagers
      .filter((sr) => sr && sr.seniorManagerId !== currentSdm.seniorManagerId)
      .map((sr) => ({ value: sr.seniorManagerId, text: sr.seniorManagerName })),
    leftField: `currentSrMgr_${currentSdmId}`,
    rightField: `availableSrMgrs_${currentSdmId}`,
    moveCallback: (movedSrMgrId, direction) => {
      const sdmToUpdate = SystemService.getCurrentSystem().sdms.find(
        (s) => s.sdmId === currentSdmId
      );
      if (sdmToUpdate) {
        sdmToUpdate.seniorManagerId = direction === 'add' ? movedSrMgrId : null;
      }
    },
    multiSelectLeft: false,
    allowAddNew: true,
    addNewPlaceholder: 'Enter New Sr. Manager Name',
    addNewCallback: (newSrMgrName) => {
      if (!newSrMgrName || newSrMgrName.trim() === '') return null;
      const normalizedName = newSrMgrName.trim();
      const existingSrMgr = (SystemService.getCurrentSystem().seniorManagers || []).find(
        (s) => s && s.seniorManagerName.toLowerCase() === normalizedName.toLowerCase()
      );
      if (existingSrMgr) {
        notificationManager.showToast(
          `Senior Manager "${normalizedName}" already exists.`,
          'warning'
        );
        return null;
      }
      const newSrMgrId = 'srMgr-' + Date.now();
      const newSrMgr = { seniorManagerId: newSrMgrId, seniorManagerName: normalizedName };
      if (!SystemService.getCurrentSystem().seniorManagers)
        SystemService.getCurrentSystem().seniorManagers = [];
      SystemService.getCurrentSystem().seniorManagers.push(newSrMgr);
      return { value: newSrMgrId, text: normalizedName };
    },
  }).render();
  srMgrContainer.appendChild(srMgrDualList);
}

/** Validation Helper */
function validateEngineerAssignments() {
  const engineerAssignments = {};
  SystemService.getCurrentSystem().teams.forEach((team) => {
    const teamEngineers = team.engineers || [];
    teamEngineers.forEach((engineerName) => {
      if (engineerName) {
        if (engineerAssignments[engineerName]) {
          engineerAssignments[engineerName].push(
            team.teamName || team.teamIdentity || 'Unnamed Team'
          );
        } else {
          engineerAssignments[engineerName] = [
            team.teamName || team.teamIdentity || 'Unnamed Team',
          ];
        }
      }
    });
  });

  const conflictingEngineers = Object.entries(engineerAssignments).filter(
    ([_, teams]) => teams.length > 1
  );
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
