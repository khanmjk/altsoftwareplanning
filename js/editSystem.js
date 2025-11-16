/** Display Services for Editing **/

/** REVISED Display Services for Editing - Refresh on Add Platform Dep **/
function displayServicesForEditing(services, containerId, expandedIndex = -1) {
    const servicesDiv = document.getElementById(containerId);
    servicesDiv.innerHTML = ''; // Clear existing content

    // Get a list of existing teams for the owning team selection
    const teamOptions = (currentSystemData.teams || []).map(team => ({ // Added default empty array
        teamId: team.teamId,
        teamIdentity: team.teamIdentity
    }));

    // Ensure platformDependencies is initialized and rebuilt
    if (!currentSystemData.platformDependencies) {
        currentSystemData.platformDependencies = [];
    }

    (services || []).forEach((service, index) => { // Added default empty array
        if (!service) return; // Skip potentially null entries if array was modified externally

        let serviceDiv = document.createElement('div');
        serviceDiv.className = 'service-edit';
        serviceDiv.setAttribute('data-service-index', index); // Add index for easier selection

        // Header (collapsible)
        let serviceHeader = document.createElement('h4');
        // Ensure serviceName exists before using it
        const headerText = service.serviceName || 'New Service';
        serviceHeader.style.cursor = 'pointer';
        let indicator = document.createElement('span');
        indicator.innerText = (index === expandedIndex) ? '- ' : '+ '; // Set initial state based on expandedIndex
        serviceHeader.appendChild(indicator);
        serviceHeader.appendChild(document.createTextNode(`Service: ${headerText}`));

        // Details container
        let serviceDetails = document.createElement('div');
        serviceDetails.className = 'service-details';
        serviceDetails.style.display = (index === expandedIndex) ? 'block' : 'none'; // Set initial state

        // Toggle Functionality - Modified to refresh lists on expand
        serviceHeader.onclick = () => {
            const content = serviceDetails; // Use variable already defined
            const isCurrentlyCollapsed = content.style.display === 'none' || content.style.display === '';
            content.style.display = isCurrentlyCollapsed ? 'block' : 'none';
            indicator.innerText = isCurrentlyCollapsed ? '- ' : '+ ';

            // Refresh available lists only when expanding
            if (isCurrentlyCollapsed) {
                console.log("Refreshing lists on expand for service:", service.serviceName);
                // Refresh Available Platform Dependencies
                const otherPlatDepsSelect = content.querySelector('select[data-field="availablePlatformDependencies"]');
                const currentPlatDepsSelect = content.querySelector('select[data-field="currentPlatformDependencies"]');
                if (otherPlatDepsSelect && currentPlatDepsSelect) {
                    const currentPlatDeps = Array.from(currentPlatDepsSelect.options).map(opt => opt.value);
                    otherPlatDepsSelect.innerHTML = ''; // Clear
                     (currentSystemData.platformDependencies || []).forEach(dep => {
                        if (!currentPlatDeps.includes(dep)) {
                            otherPlatDepsSelect.appendChild(new Option(dep, dep));
                        }
                    });
                }

                // Refresh Available Service Dependencies
                const otherSvcDepsSelect = content.querySelector('select[data-field="availableServiceDependencies"]');
                const currentSvcDepsSelect = content.querySelector('select[data-field="currentServiceDependencies"]');
                if (otherSvcDepsSelect && currentSvcDepsSelect) {
                    const currentSvcDeps = Array.from(currentSvcDepsSelect.options).map(opt => opt.value);
                    otherSvcDepsSelect.innerHTML = ''; // Clear
                     (currentSystemData.services || []).forEach(otherSvc => {
                        if (otherSvc.serviceName !== service.serviceName && !currentSvcDeps.includes(otherSvc.serviceName)) {
                            otherSvcDepsSelect.appendChild(new Option(otherSvc.serviceName, otherSvc.serviceName));
                        }
                    });
                }

                // Refresh Available APIs for each API within this service
                const apiEditDivs = content.querySelectorAll('.api-edit');
                const allApisList = (currentSystemData.services || []).flatMap(s => (s.apis || []).map(a => a.apiName));
                apiEditDivs.forEach((apiDiv, apiIdx) => {
                     const currentApiName = service.apis[apiIdx]?.apiName; // Get current API name
                     const otherApiDepsSelect = apiDiv.querySelector('select[data-field="availableApis"]');
                     const currentApiDepsSelect = apiDiv.querySelector('select[data-field="currentDependentApis"]');
                     if (otherApiDepsSelect && currentApiDepsSelect && currentApiName) {
                         const currentApiDeps = Array.from(currentApiDepsSelect.options).map(opt => opt.value);
                         otherApiDepsSelect.innerHTML = ''; // Clear
                         allApisList.forEach(apiName => {
                             if (apiName !== currentApiName && !currentApiDeps.includes(apiName)) {
                                 otherApiDepsSelect.appendChild(new Option(apiName, apiName));
                             }
                         });
                     }
                 });
            }
        };

        // --- Service Name & Description ---
        let nameLabel = document.createElement('label');
        nameLabel.innerText = 'Service Name:';
        let nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = service.serviceName || '';
        nameInput.setAttribute('data-service-index', index);
        nameInput.setAttribute('data-field', 'serviceName');
        nameInput.addEventListener('change', handleServiceInputChange); // Use shared handler
        serviceDetails.appendChild(nameLabel); serviceDetails.appendChild(document.createElement('br'));
        serviceDetails.appendChild(nameInput); serviceDetails.appendChild(document.createElement('br'));

        let descLabel = document.createElement('label');
        descLabel.innerText = 'Service Description:';
        let descTextarea = document.createElement('textarea');
        descTextarea.rows = 2; descTextarea.style.width = '90%';
        descTextarea.value = service.serviceDescription || '';
        descTextarea.setAttribute('data-service-index', index);
        descTextarea.setAttribute('data-field', 'serviceDescription');
        descTextarea.addEventListener('change', handleServiceInputChange); // Use shared handler
        serviceDetails.appendChild(descLabel); serviceDetails.appendChild(document.createElement('br'));
        serviceDetails.appendChild(descTextarea); serviceDetails.appendChild(document.createElement('br'));
        // -----------------------------------

        // --- Platform Dependencies ---
        const currentPlatDeps = (service.platformDependencies || []).map(dep => ({ value: dep, text: dep }));
        const availablePlatDeps = (currentSystemData.platformDependencies || []).filter(dep => !(service.platformDependencies || []).includes(dep)).map(dep => ({ value: dep, text: dep }));
        const platformContainer = createDualListContainer(
            index, 'Current Platform Deps:', 'Available Platform Deps:',
            currentPlatDeps, availablePlatDeps,
            'currentPlatformDependencies', 'availablePlatformDependencies',
            (movedDep, direction, serviceIdx) => { // Callback updates data model directly
                const targetService = currentSystemData.services[serviceIdx];
                if (!targetService.platformDependencies) targetService.platformDependencies = [];
                if (direction === 'add') {
                    if (!targetService.platformDependencies.includes(movedDep)) targetService.platformDependencies.push(movedDep);
                } else {
                    targetService.platformDependencies = targetService.platformDependencies.filter(d => d !== movedDep);
                }
            },
            true, true, 'Enter New Platform Dependency', // multiSelectLeft = true, allowAddNew = true
            (newDepName) => { // Add New Callback for Platform Deps (Simplified like SDM/PMT)
                        const textInput = platformContainer.querySelector('input[type="text"]'); // Get input relative to this dual list
                        if (!newDepName || newDepName.trim() === '') {
                            if(textInput) textInput.value = ''; // Clear input even if empty
                            return null;
                        }
                        newDepName = newDepName.trim();

                        // Ensure global platform dependencies array exists
                        if (!currentSystemData.platformDependencies) {
                            currentSystemData.platformDependencies = [];
                        }

                        const alreadyExistsGlobally = currentSystemData.platformDependencies.includes(newDepName);

                        // Find the specific select lists for THIS service instance to check if already visible
                        const currentPlatDepsSelect = platformContainer.querySelector('select[data-field="currentPlatformDependencies"]');
                        const availablePlatDepsSelect = platformContainer.querySelector('select[data-field="availablePlatformDependencies"]');

                        if (!currentPlatDepsSelect || !availablePlatDepsSelect) {
                             console.error("Could not find platform dependency select lists for service index:", index);
                             if(textInput) textInput.value = '';
                             return null;
                         }

                        const inCurrentList = Array.from(currentPlatDepsSelect.options).some(opt => opt.value === newDepName);
                        const inAvailableList = Array.from(availablePlatDepsSelect.options).some(opt => opt.value === newDepName);

                        if (inCurrentList || inAvailableList) {
                             alert(`Platform dependency "${newDepName}" is already listed for this service.`);
                             if(textInput) textInput.value = '';
                             return null; // Already present for this service, do nothing more
                         }

                        // If it doesn't exist globally, add it to the global data list
                        if (!alreadyExistsGlobally) {
                            currentSystemData.platformDependencies.push(newDepName);
                            console.log("Added new global platform dependency to data:", newDepName);
                        } else {
                            console.log(`"${newDepName}" already exists globally.`);
                        }

                        // --- ALWAYS RETURN THE ITEM ---
                        // Let createDualListContainer handle adding it to the 'Available' list for *this instance*.
                        // The fact it's in currentSystemData.platformDependencies ensures it's available later.
                        if (textInput) textInput.value = ''; // Clear the input field
                        return { value: newDepName, text: newDepName };
                    }
        );
        serviceDetails.appendChild(platformContainer);
        serviceDetails.appendChild(document.createElement('br'));
        // ---------------------------

         // --- Service Dependencies ---
         const currentSvcDeps = (service.serviceDependencies || []).map(dep => ({ value: dep, text: dep }));
         const availableSvcDeps = (currentSystemData.services || [])
             .filter(s => s.serviceName !== service.serviceName && !(service.serviceDependencies || []).includes(s.serviceName))
             .map(s => ({ value: s.serviceName, text: s.serviceName }));
         const serviceDepContainer = createDualListContainer(
             index, 'Current Service Deps:', 'Available Services:',
             currentSvcDeps, availableSvcDeps,
             'currentServiceDependencies', 'availableServiceDependencies',
             (movedSvc, direction, serviceIdx) => { // Callback updates data model directly
                 const targetService = currentSystemData.services[serviceIdx];
                 if (!targetService.serviceDependencies) targetService.serviceDependencies = [];
                 if (direction === 'add') {
                     if (!targetService.serviceDependencies.includes(movedSvc)) targetService.serviceDependencies.push(movedSvc);
                 } else {
                     targetService.serviceDependencies = targetService.serviceDependencies.filter(d => d !== movedSvc);
                 }
             },
             true // multiSelectLeft = true
             // Cannot add new *services* from here, only from main 'Add New Service' button
         );
         serviceDetails.appendChild(serviceDepContainer);
         serviceDetails.appendChild(document.createElement('br'));
        // ------------------------

        // --- APIs Section ---
        let apisContainer = document.createElement('div');
        apisContainer.className = 'apis-container';
        let apisLabel = document.createElement('h5');
        apisLabel.innerText = 'APIs:'; apisLabel.style.marginTop = '15px';
        apisContainer.appendChild(apisLabel);

        const allApisList = (currentSystemData.services || []).flatMap(s => (s.apis || []).map(a => a.apiName));

        (service.apis || []).forEach((api, apiIndex) => {
            let apiDiv = document.createElement('div');
            apiDiv.className = 'api-edit';

            let apiNameLabel = document.createElement('label'); apiNameLabel.innerText = 'API Name:';
            let apiNameInput = document.createElement('input'); apiNameInput.type = 'text'; apiNameInput.value = api.apiName || '';
            apiNameInput.setAttribute('data-service-index', index); apiNameInput.setAttribute('data-api-index', apiIndex); apiNameInput.setAttribute('data-field', 'apiName');
            apiNameInput.addEventListener('change', handleApiInputChange); // Use shared handler
            apiDiv.appendChild(apiNameLabel); apiDiv.appendChild(document.createElement('br'));
            apiDiv.appendChild(apiNameInput); apiDiv.appendChild(document.createElement('br'));

            let apiDescLabel = document.createElement('label'); apiDescLabel.innerText = 'API Description:';
            let apiDescTextarea = document.createElement('textarea'); apiDescTextarea.rows = 2; apiDescTextarea.style.width = '90%'; apiDescTextarea.value = api.apiDescription || '';
            apiDescTextarea.setAttribute('data-service-index', index); apiDescTextarea.setAttribute('data-api-index', apiIndex); apiDescTextarea.setAttribute('data-field', 'apiDescription');
            apiDescTextarea.addEventListener('change', handleApiInputChange); // Use shared handler
            apiDiv.appendChild(apiDescLabel); apiDiv.appendChild(document.createElement('br'));
            apiDiv.appendChild(apiDescTextarea); apiDiv.appendChild(document.createElement('br'));

            // API Dependencies Dual List
            const currentApiDeps = (api.dependentApis || []).map(dep => ({ value: dep, text: dep }));
            const availableApiDeps = allApisList
                .filter(aName => aName !== api.apiName && !(api.dependentApis || []).includes(aName))
                .map(aName => ({ value: aName, text: aName }));
            const apiDepsContainer = createDualListContainer(
                 apiIndex, // Context is the API index within the service
                 'Current API Deps:', 'Available APIs:',
                 currentApiDeps, availableApiDeps,
                 'currentDependentApis', 'availableApis',
                 (movedApi, direction, currentApiIndex) => { // Callback updates data model directly
                     const targetService = currentSystemData.services[index]; // Outer service index
                     const targetApi = targetService?.apis[currentApiIndex];
                     if (targetApi) {
                         if (!targetApi.dependentApis) targetApi.dependentApis = [];
                         if (direction === 'add') {
                             if (!targetApi.dependentApis.includes(movedApi)) targetApi.dependentApis.push(movedApi);
                         } else {
                             targetApi.dependentApis = targetApi.dependentApis.filter(d => d !== movedApi);
                         }
                     }
                 },
                 true // multiSelectLeft = true
                 // Cannot add *new* APIs here, only via the service's 'Add New API' button
             );
             apiDiv.appendChild(apiDepsContainer);
             apiDiv.appendChild(document.createElement('br'));


            let deleteApiButton = document.createElement('button'); 
            deleteApiButton.type = 'button'; 
            deleteApiButton.className = 'btn-danger'; // Added class for styling
            deleteApiButton.innerText = 'Delete API';
            deleteApiButton.onclick = () => deleteApi(index, apiIndex, containerId); // Pass containerId
            apiDiv.appendChild(deleteApiButton);

            apisContainer.appendChild(apiDiv);
        });

        let addApiButton = document.createElement('button'); addApiButton.type = 'button'; addApiButton.innerText = 'Add New API';
        addApiButton.onclick = () => addNewApi(index, containerId); // Pass containerId
        apisContainer.appendChild(addApiButton);
        serviceDetails.appendChild(apisContainer);
        serviceDetails.appendChild(document.createElement('br'));
        // --------------------

        // --- Action Buttons ---
        let deleteServiceButton = document.createElement('button'); 
        deleteServiceButton.type = 'button'; 
        deleteServiceButton.className = 'btn-danger'; // Added class for styling
        deleteServiceButton.innerText = 'Delete Service';
        /* deleteServiceButton.style.color = 'red'; 
        deleteServiceButton.style.marginLeft = '10px'; */
        deleteServiceButton.onclick = () => { if (confirm('Are you sure?')) deleteService(index, containerId); }; // Pass containerId
        serviceDetails.appendChild(deleteServiceButton);

        let saveServiceButton = document.createElement('button'); 
        saveServiceButton.type = 'button'; 
        saveServiceButton.className = 'btn-primary'; // Added class for styling
        saveServiceButton.innerText = 'Save Service Changes';
        saveServiceButton.style.marginLeft = '10px'; 
        saveServiceButton.onclick = () => saveServiceChanges(index); // Saves only this service's state from currentSystemData
        serviceDetails.appendChild(saveServiceButton);
        // --------------------

        serviceDiv.appendChild(serviceHeader);
        serviceDiv.appendChild(serviceDetails);
        servicesDiv.appendChild(serviceDiv);
    }); // End services.forEach

    // --- Shared Event Handlers for Inputs ---
    function handleServiceInputChange(event) {
        const serviceIndex = parseInt(event.target.getAttribute('data-service-index'));
        const field = event.target.getAttribute('data-field');
        const value = event.target.value;
        if (serviceIndex >= 0 && serviceIndex < currentSystemData.services.length) {
            currentSystemData.services[serviceIndex][field] = value;
            // If service name changed, update the header
            if (field === 'serviceName') {
                 const header = event.target.closest('.service-edit')?.querySelector('h4');
                 if (header) {
                     const indicatorSpan = header.querySelector('span');
                     header.textContent = `Service: ${value || 'New Service'}`; // Recreate text
                     if(indicatorSpan) header.insertBefore(indicatorSpan, header.firstChild); // Add indicator back
                 }
            }
        }
    }

     function handleApiInputChange(event) {
        const serviceIndex = parseInt(event.target.getAttribute('data-service-index'));
        const apiIndex = parseInt(event.target.getAttribute('data-api-index'));
        const field = event.target.getAttribute('data-field');
        const value = event.target.value;
        if (serviceIndex >= 0 && serviceIndex < currentSystemData.services.length &&
            apiIndex >= 0 && apiIndex < currentSystemData.services[serviceIndex].apis.length) {
            currentSystemData.services[serviceIndex].apis[apiIndex][field] = value;
        }
    }
    // ------------------------------------

    // --- Helper to find current expanded service index ---
     function findExpandedServiceIndex(containerId = 'editServicesManagement') { // Default containerId
         const servicesContainerDiv = document.getElementById(containerId);
         if (!servicesContainerDiv) {
             console.warn("findExpandedServiceIndex: Could not find container with ID:", containerId);
             return -1;
         }
         const serviceDetailDivs = servicesContainerDiv.querySelectorAll('.service-details'); // Use class selector
         for (let i = 0; i < serviceDetailDivs.length; i++) {
             // Check the display style directly
             if (serviceDetailDivs[i].style.display === 'block') {
                 // Find the parent service-edit div to get the index attribute
                 const parentEditDiv = serviceDetailDivs[i].closest('.service-edit');
                 if (parentEditDiv) {
                     const indexAttr = parentEditDiv.getAttribute('data-service-index');
                     if (indexAttr !== null) {
                         return parseInt(indexAttr); // Return the index from the attribute
                     }
                 }
             }
         }
         return -1; // Not found or none expanded
     }

} // --- End displayServicesForEditing ---

function saveServiceChanges(serviceIndex) {
    // Perform validation (optional)
    const service = currentSystemData.services[serviceIndex];
    if (!service.serviceName || service.serviceName.trim() === '') {
        alert('Service name cannot be empty.');
        return;
    }

    const serviceEditDivs = document.querySelectorAll('.service-edit');
    const currentServiceDiv = serviceEditDivs[serviceIndex];

    // Update Platform Dependencies
    const currentDepsSelect = currentServiceDiv.querySelector('select[data-field="currentPlatformDependencies"]');
    const selectedDependencies = Array.from(currentDepsSelect.options).map(option => option.value);
    service.platformDependencies = selectedDependencies;

    // Update Service Dependencies
    const currentServiceDepsSelect = currentServiceDiv.querySelector('select[data-field="currentServiceDependencies"]');
    const selectedServiceDependencies = Array.from(currentServiceDepsSelect.options).map(option => option.value);
    service.serviceDependencies = selectedServiceDependencies;

    // **Update APIs and their Dependent APIs**
    const apisContainer = currentServiceDiv.querySelector('.apis-container');
    const apiEditDivs = apisContainer.querySelectorAll('.api-edit');

    service.apis.forEach((api, apiIndex) => {
        const apiDiv = apiEditDivs[apiIndex];

        // Update API fields
        const apiNameInput = apiDiv.querySelector('input[data-field="apiName"]');
        api.apiName = apiNameInput.value;

        const apiDescTextarea = apiDiv.querySelector('textarea[data-field="apiDescription"]');
        api.apiDescription = apiDescTextarea.value;

        // Update Dependent APIs
        const currentDependentApisSelect = apiDiv.querySelector('select[data-field="currentDependentApis"]');
        const selectedDependentApis = Array.from(currentDependentApisSelect.options).map(option => option.value);
        api.dependentApis = selectedDependentApis;
    });

    // Save currentSystemData to local storage
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    systems[currentSystemData.systemName] = currentSystemData;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

    alert('Service changes saved.');

    // **Update the Team Breakdown and Service Dependencies Tables**
    generateTeamTable(currentSystemData);
    generateServiceDependenciesTable();
    
    // Optionally collapse the service details or provide additional feedback
}

/** Add New Service in Edit Form **/
function addNewEditService() {
    // Create a new service object with default values
    const newService = {
        serviceName: 'New Service',
        serviceDescription: '',
        owningTeamId: '',
        apis: [],
        serviceDependencies: [],
        platformDependencies: []
    };

    // Add to the system data
    if (!currentSystemData.services) {
        currentSystemData.services = [];
    }
    currentSystemData.services.push(newService);

    // Refresh the service editing display for the edit form
    displayServicesForEditing(currentSystemData.services, 'editServicesManagement');
}

/** Add New Service **/

/** REVISED Add New Service - Simplified Refresh Call **/
function addNewService(overrides = {}) {
    // Create a new service object with default values
    const newService = {
        serviceName: 'New Service ' + ((currentSystemData.services?.length || 0) + 1),
        serviceDescription: '',
        owningTeamId: null,
        apis: [],
        serviceDependencies: [],
        platformDependencies: [],
        ...overrides
    };

    // Add to the system data
    if (!currentSystemData.services) {
        currentSystemData.services = [];
    }
    currentSystemData.services.push(newService);
    console.log("Added new service to data:", newService); // Log data addition

    // --- Refresh BOTH Service and Team editing displays ---
    // Call display functions WITHOUT trying to preserve expanded index for now
    console.log("Refreshing service editors...");
    try {
        displayServicesForEditing(currentSystemData.services, 'editServicesManagement');
    } catch (error) {
         console.error("Error during displayServicesForEditing:", error);
         alert("Error refreshing service list. Check console.");
         return; // Stop if service display fails
    }


    console.log("Refreshing team editors...");
    try {
         displayTeamsForEditing(currentSystemData.teams);
     } catch (error) {
         console.error("Error during displayTeamsForEditing:", error);
         alert("Error refreshing team list. Check console.");
         return; // Stop if team display fails
     }
    console.log("UI refresh attempt complete after adding service.");
    // ------------------------------------------------------
    return newService;
}

/** Delete Service **/

function deleteService(serviceIndex, containerId) {
    // Remove the service from the system data
    const deletedServices = currentSystemData.services.splice(serviceIndex, 1);
    const deletedService = deletedServices.length ? deletedServices[0] : null;

    // **Update the Team Breakdown and Service Dependencies Tables**
    generateTeamTable(currentSystemData);
    generateServiceDependenciesTable();
    
    // Refresh the service editing display
    displayServicesForEditing(currentSystemData.services, containerId,serviceIndex);
    return deletedService;
}

/** Add New API **/

/** REVISED Add New API - Refresh UI **/
function addNewApi(serviceIndex, containerId = 'editServicesManagement') { // Added containerId parameter
    // Find the service
    if (!currentSystemData || !currentSystemData.services || serviceIndex >= currentSystemData.services.length) {
        console.error("Cannot add API, invalid service index:", serviceIndex);
        return;
    }
    const service = currentSystemData.services[serviceIndex];

    // Create a new API object with default values
    const newApi = {
        apiName: 'New API ' + ((service.apis?.length || 0) + 1), // Slightly more unique default name
        apiDescription: '',
        dependentApis: []
    };

    // Add to the service's APIs
    if (!service.apis) {
        service.apis = [];
    }
    service.apis.push(newApi);

    // --- Refresh the service editing display ---
    // Re-rendering ensures all 'Available APIs' lists are updated
    console.log(`Refreshing service editors after adding new API to service index ${serviceIndex}...`);
    displayServicesForEditing(currentSystemData.services, containerId, serviceIndex); // Try to re-expand the current service
    // -----------------------------------------
}

/** Delete API **/

function deleteApi(serviceIndex, apiIndex, containerId) {
    // Remove the API from the service's APIs
    currentSystemData.services[serviceIndex].apis.splice(apiIndex, 1);

    // Refresh the service editing display
    displayServicesForEditing(currentSystemData.services, containerId, serviceIndex);
}

/**
 * REVISED Display Teams for Editing - Aligned with new Engineer Data Model (v2)
 * - `team.engineers` is now an array of names.
 * - `allKnownEngineers` is the SSoT for engineer details including new attributes.
 * - "Add New Engineer" prompts for all new attributes.
 * - Engineer assignment logic correctly updates both `team.engineers` (names) and `allKnownEngineers.currentTeamId`.
 */
function displayTeamsForEditing(teamsDataToDisplay, expandedTeamIndex = -1) {
    console.log("displayTeamsForEditing called. Expanded index:", expandedTeamIndex, "Using new engineer model (v2).");
    const teamsDiv = document.getElementById('teamsManagement');
    if (!teamsDiv) {
        console.error("Team management div 'teamsManagement' not found.");
        return;
    }
    teamsDiv.innerHTML = ''; // Clear existing content

    if (!currentSystemData) {
        console.error("currentSystemData is not available.");
        teamsDiv.innerHTML = "<p style='color:red;'>Error: System data not loaded.</p>";
        return;
    }

    // Ensure allKnownEngineers exists and engineer objects have attributes (robustness)
    if (!currentSystemData.allKnownEngineers || !Array.isArray(currentSystemData.allKnownEngineers)) {
        console.warn("'currentSystemData.allKnownEngineers' is missing or not an array. Initializing.");
        currentSystemData.allKnownEngineers = [];
        // Basic population from teams if totally missing (should ideally be done by loadSavedSystem)
        (currentSystemData.teams || []).forEach(team => {
            (team.engineers || []).forEach(engNameOrObj => {
                const name = typeof engNameOrObj === 'string' ? engNameOrObj : engNameOrObj?.name;
                const level = typeof engNameOrObj === 'string' ? 1 : (engNameOrObj?.level || 1);
                if (name && !currentSystemData.allKnownEngineers.some(e => e.name === name)) {
                    currentSystemData.allKnownEngineers.push({
                        name: name,
                        level: level,
                        currentTeamId: team.teamId, // Initial assignment
                        attributes: { isAISWE: false, aiAgentType: null, skills: [], yearsOfExperience: 0 }
                    });
                }
            });
        });
    }
    currentSystemData.allKnownEngineers.forEach(engineer => {
        if (!engineer.attributes) {
            engineer.attributes = { isAISWE: false, aiAgentType: null, skills: [], yearsOfExperience: 0 };
        }
        if (typeof engineer.attributes.isAISWE === 'undefined') engineer.attributes.isAISWE = false;
        if (typeof engineer.attributes.aiAgentType === 'undefined') engineer.attributes.aiAgentType = null;
        if (!Array.isArray(engineer.attributes.skills)) engineer.attributes.skills = [];
        if (typeof engineer.attributes.yearsOfExperience === 'undefined') engineer.attributes.yearsOfExperience = 0;
    });


    const allServices = (currentSystemData.services || []).map(service => ({ value: service.serviceName, text: service.serviceName, owningTeamId: service.owningTeamId || null }));
    const allSdms = currentSystemData.sdms || [];
    const allPmts = currentSystemData.pmts || [];

    (teamsDataToDisplay || []).forEach((team, teamIndex) => {
        if (!team || !team.teamId) {
            console.warn("Skipping invalid team object at index", teamIndex, team);
            return;
        }
        // Ensure team.engineers is an array of names
        if (!Array.isArray(team.engineers) || (team.engineers.length > 0 && typeof team.engineers[0] !== 'string')) {
            console.warn(`Team ${team.teamId} engineers array is not in the expected format (array of names). Normalizing.`);
            // Attempt to normalize if it's objects {name, level} - this path should be less common after data.js and main.js updates
            if (Array.isArray(team.engineers) && team.engineers.length > 0 && typeof team.engineers[0] === 'object') {
                team.engineers = team.engineers.map(engObj => engObj.name).filter(name => typeof name === 'string');
            } else {
                team.engineers = []; // Default to empty array of names
            }
        }


        let teamDiv = document.createElement('div');
        teamDiv.className = 'team-edit';
        teamDiv.setAttribute('data-team-id', team.teamId);
        teamDiv.setAttribute('data-team-render-index', teamIndex);

        let teamHeader = document.createElement('h4');
        teamHeader.style.cursor = 'pointer';
        let indicator = document.createElement('span');
        const isExpanded = (teamIndex === expandedTeamIndex) || (teamsDataToDisplay.length === 1 && teamsDataToDisplay.length > 0);
        indicator.innerText = isExpanded ? '- ' : '+ ';
        teamHeader.appendChild(indicator);
        teamHeader.appendChild(document.createTextNode(`Team: ${team.teamIdentity || team.teamName || `Team (${team.teamId.slice(-4)})`}`));

        let teamDetails = document.createElement('div');
        teamDetails.className = 'team-details';
        teamDetails.style.display = isExpanded ? 'block' : 'none';

        teamHeader.onclick = () => {
            const currentlyExpanded = teamDetails.style.display === 'block';
            document.querySelectorAll('#teamsManagement .team-details').forEach(td => td.style.display = 'none');
            document.querySelectorAll('#teamsManagement h4 > span').forEach(ind => ind.innerText = '+ ');
            if (currentlyExpanded) {
                teamDetails.style.display = 'none';
                indicator.innerText = '+ ';
            } else {
                teamDetails.style.display = 'block';
                indicator.innerText = '- ';
                if (typeof displaySeniorManagerAssignment === 'function') displaySeniorManagerAssignment(teamDiv.querySelector(`#sdmSection_${teamIndex}`), teamIndex, team.sdmId);
                if (typeof displayAwayTeamMembers === 'function') displayAwayTeamMembers(team.awayTeamMembers || [], teamIndex);
                if (typeof updateEffectiveBISDisplay === 'function') updateEffectiveBISDisplay(teamIndex);
            }
        };

        teamDetails.appendChild(createInputLabelPair(`teamIdentity_${teamIndex}`, 'Team Identity:', team.teamIdentity || '', 'text', teamIndex, 'teamIdentity'));
        teamDetails.appendChild(createInputLabelPair(`teamName_${teamIndex}`, 'Team Name:', team.teamName || '', 'text', teamIndex, 'teamName'));
        teamDetails.appendChild(createInputLabelPair(`teamDescription_${teamIndex}`, 'Team Description:', team.teamDescription || '', 'textarea', teamIndex, 'teamDescription'));

        const currentServicesForTeam = (team.teamId && allServices.filter(s => s.owningTeamId === team.teamId)) || [];
        const availableServicesForTeam = allServices.filter(s => !s.owningTeamId || s.owningTeamId === null);
        const servicesContainer = createDualListContainer(
             teamIndex, 'Services Owned:', 'Available Unowned Services:',
             currentServicesForTeam.map(s => ({value: s.value, text: s.text})),
             availableServicesForTeam.map(s => ({value: s.value, text: s.text})),
             'currentServices', 'availableServices',
             (movedServiceValue, direction, currentTeamIndexCallback) => {
                const serviceToUpdate = currentSystemData.services.find(s => s.serviceName === movedServiceValue);
                const targetTeamForService = currentSystemData.teams[currentTeamIndexCallback];
                if (serviceToUpdate && targetTeamForService) {
                    if (direction === 'add') serviceToUpdate.owningTeamId = targetTeamForService.teamId;
                    else serviceToUpdate.owningTeamId = null;
                    displayTeamsForEditing(currentSystemData.teams, currentTeamIndexCallback);
                }
             }
        );
        teamDetails.appendChild(servicesContainer);
        teamDetails.appendChild(document.createElement('br'));

        const sdmSection = document.createElement('div');
        sdmSection.id = `sdmSection_${teamIndex}`;
        sdmSection.style.border = '1px dashed #ccc'; sdmSection.style.padding = '10px'; sdmSection.style.marginBottom = '10px';
        let sdmSectionTitle = document.createElement('h5'); sdmSectionTitle.innerText = 'SDM Assignment'; sdmSection.appendChild(sdmSectionTitle);
        const currentSdm = allSdms.find(sdm => sdm && sdm.sdmId === team.sdmId);
        const sdmContainer = createDualListContainer(
            teamIndex, 'Current SDM:', 'Available SDMs:',
            currentSdm ? [{ value: currentSdm.sdmId, text: currentSdm.sdmName }] : [],
            allSdms.filter(sdm => sdm && (!team.sdmId || sdm.sdmId !== team.sdmId)).map(s => ({ value: s.sdmId, text: s.sdmName })),
            'currentSdm', 'availableSdms',
            (movedSdmId, directionCallback, teamIndexCallback) => {
                const targetTeamForSdm = currentSystemData.teams[teamIndexCallback];
                if (targetTeamForSdm) {
                    targetTeamForSdm.sdmId = (directionCallback === 'add') ? movedSdmId : null;
                    if (typeof displaySeniorManagerAssignment === 'function') displaySeniorManagerAssignment(sdmSection, teamIndexCallback, targetTeamForSdm.sdmId);
                }
            }, false, true, 'Enter New SDM Name',
            (newSdmNameInput) => {
                 if (!newSdmNameInput || newSdmNameInput.trim() === '') return null;
                 newSdmNameInput = newSdmNameInput.trim();
                 if ((currentSystemData.sdms || []).some(s => s && s.sdmName.toLowerCase() === newSdmNameInput.toLowerCase())) {
                     alert(`SDM "${newSdmNameInput}" already exists.`); return { preventAdd: true };
                 }
                 const newSdmObject = { sdmId: 'sdm-' + Date.now(), sdmName: newSdmNameInput, seniorManagerId: null };
                 if (!currentSystemData.sdms) currentSystemData.sdms = [];
                 currentSystemData.sdms.push(newSdmObject);
                 displayTeamsForEditing(currentSystemData.teams, teamIndex); // Refresh all SDM lists
                 return { value: newSdmObject.sdmId, text: newSdmObject.sdmName };
            }
        );
        sdmSection.appendChild(sdmContainer);
        let srMgrAssignmentContainer = document.createElement('div');
        srMgrAssignmentContainer.id = `srMgrAssignmentContainer_${teamIndex}`;
        srMgrAssignmentContainer.style.marginTop = '10px';
        sdmSection.appendChild(srMgrAssignmentContainer);
        teamDetails.appendChild(sdmSection);
        teamDetails.appendChild(document.createElement('br'));

        const currentPmt = allPmts.find(pmt => pmt && pmt.pmtId === team.pmtId);
        const pmtContainer = createDualListContainer(
            teamIndex, 'Current PMT:', 'Available PMTs:',
            currentPmt ? [{ value: currentPmt.pmtId, text: currentPmt.pmtName }] : [],
            allPmts.filter(pmt => pmt && (!team.pmtId || pmt.pmtId !== team.pmtId)).map(p => ({ value: p.pmtId, text: p.pmtName })),
            'currentPmt', 'availablePmts',
            (movedPmtId, directionCallback, teamIndexCallback) => {
                const targetTeamForPmt = currentSystemData.teams[teamIndexCallback];
                if (targetTeamForPmt) targetTeamForPmt.pmtId = (directionCallback === 'add') ? movedPmtId : null;
            }, false, true, 'Enter New PMT Name',
            (newPmtNameInput) => {
                if (!newPmtNameInput || newPmtNameInput.trim() === '') return null;
                newPmtNameInput = newPmtNameInput.trim();
                if ((currentSystemData.pmts || []).some(p => p && p.pmtName.toLowerCase() === newPmtNameInput.toLowerCase())) {
                    alert(`PMT "${newPmtNameInput}" already exists.`); return { preventAdd: true };
                }
                const newPmtObject = { pmtId: 'pmt-' + Date.now(), pmtName: newPmtNameInput };
                if (!currentSystemData.pmts) currentSystemData.pmts = [];
                currentSystemData.pmts.push(newPmtObject);
                displayTeamsForEditing(currentSystemData.teams, teamIndex); // Refresh all PMT lists
                return { value: newPmtObject.pmtId, text: newPmtObject.pmtName };
            }
        );
        teamDetails.appendChild(pmtContainer);
        teamDetails.appendChild(document.createElement('br'));

        teamDetails.appendChild(createInputLabelPair(`fundedHeadcount_${teamIndex}`, 'Finance Approved Funding:', team.fundedHeadcount ?? 0, 'number', teamIndex, 'fundedHeadcount'));
        const currentTeamMemberCount = (team.engineers || []).length; // Now count of names
        const currentAwayTeamBIS = (team.awayTeamMembers || []).length;
        const currentEffectiveBIS = currentTeamMemberCount + currentAwayTeamBIS;
        const bisTooltipText = `Team Members (from roster): ${currentTeamMemberCount}, Away-Team BIS: ${currentAwayTeamBIS}`;
        teamDetails.appendChild(
            createInputLabelPair(`effectiveBIS_${teamIndex}`, 'Effective BIS:', currentEffectiveBIS.toFixed(0), 'text', teamIndex, 'effectiveBIS', true, bisTooltipText)
        );
        teamDetails.appendChild(document.createElement('br'));

        let engineersSectionTitle = document.createElement('h5');
        engineersSectionTitle.innerText = 'Team Engineer Assignment';
        engineersSectionTitle.style.marginTop = '15px';
        teamDetails.appendChild(engineersSectionTitle);

        const currentEngineerOptions = (team.engineers || []).map(engineerName => {
            const engDetails = (currentSystemData.allKnownEngineers || []).find(e => e.name === engineerName);
            return {
                value: engineerName,
                text: `${engineerName} (L${engDetails ? engDetails.level : '?'})${engDetails?.attributes?.isAISWE ? ' [AI]' : ''}`
            };
        });

        const availableEngineerOptions = (currentSystemData.allKnownEngineers || [])
            .filter(knownEng => !(team.engineers || []).includes(knownEng.name)) // Filter out engineers already on this team by name
            .map(knownEng => {
                let teamContext = "Unallocated";
                if (knownEng.currentTeamId) { // If assigned to any team (could be a different one)
                    const assignedTeam = (currentSystemData.teams || []).find(t => t.teamId === knownEng.currentTeamId);
                    teamContext = assignedTeam ? (assignedTeam.teamIdentity || assignedTeam.teamName) : `Assigned Elsewhere (${knownEng.currentTeamId.slice(-4)})`;
                }
                return {
                    value: knownEng.name,
                    text: `${knownEng.name} (L${knownEng.level ?? '?'})${knownEng.attributes?.isAISWE ? ' [AI]' : ''} - (${teamContext})`
                };
            });

        const engineerContainer = createDualListContainer(
            teamIndex, 'Current Engineers:', 'Available Engineers (System Pool):',
            currentEngineerOptions, availableEngineerOptions,
            'currentTeamEngineersList', 'availableSystemEngineersList', // Unique field names for list elements
            (movedEngineerName, direction, currentTeamEditIndex) => {
                const targetTeam = currentSystemData.teams[currentTeamEditIndex];
                if (!targetTeam) return;
                if (!Array.isArray(targetTeam.engineers)) targetTeam.engineers = [];

                const engineerGlobal = (currentSystemData.allKnownEngineers || []).find(ke => ke.name === movedEngineerName);
                if (!engineerGlobal) {
                    console.error(`Engineer ${movedEngineerName} not found in global pool.`);
                    return;
                }
                const oldTeamIdForEngineer = engineerGlobal.currentTeamId;

                if (direction === 'add') { // Add to targetTeam.engineers
                    if (oldTeamIdForEngineer && oldTeamIdForEngineer !== targetTeam.teamId) {
                        const oldTeamObject = (currentSystemData.teams || []).find(t => t.teamId === oldTeamIdForEngineer);
                        if (oldTeamObject && Array.isArray(oldTeamObject.engineers)) {
                            oldTeamObject.engineers = oldTeamObject.engineers.filter(name => name !== movedEngineerName);
                        }
                    }
                    if (!targetTeam.engineers.includes(movedEngineerName)) {
                        targetTeam.engineers.push(movedEngineerName);
                    }
                    engineerGlobal.currentTeamId = targetTeam.teamId;
                } else { // Remove from targetTeam.engineers
                    targetTeam.engineers = targetTeam.engineers.filter(name => name !== movedEngineerName);
                    if (engineerGlobal.currentTeamId === targetTeam.teamId) { // Only unassign if they were on this team
                        engineerGlobal.currentTeamId = null;
                    }
                }
                displayTeamsForEditing(currentSystemData.teams, currentTeamEditIndex);
            },
            true, true, 'Enter New Engineer Name to Add to System Pool',
            (newEngineerNameInput, currentTeamEditIndex) => {
                if (!newEngineerNameInput || newEngineerNameInput.trim() === '') {
                    alert("Engineer name cannot be empty."); return null;
                }
                const name = newEngineerNameInput.trim();
                if ((currentSystemData.allKnownEngineers || []).some(eng => eng.name.toLowerCase() === name.toLowerCase())) {
                    alert(`An engineer named "${name}" already exists in the system pool.`);
                    return { preventAdd: true }; // Prevent createDualListContainer from adding duplicate to UI
                }

                const levelStr = prompt(`Enter level (1-7) for new engineer "${name}":`, "1");
                if (levelStr === null) return null;
                const level = parseInt(levelStr);
                if (isNaN(level) || level < 1 || level > 7) {
                    alert("Invalid level. Please enter a number between 1 and 7."); return null;
                }
                const yearsStr = prompt(`Enter years of experience for "${name}":`, "0");
                if (yearsStr === null) return null;
                const yearsOfExperience = parseInt(yearsStr) || 0;
                const skillsStr = prompt(`Enter skills for "${name}" (comma-separated):`, "");
                const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(s => s) : [];
                // const isAISWE = confirm(`Is "${name}" an AI Software Engineer?`); replaced
                let isAIInput = prompt(`Is "${name}" an AI Software Engineer? (Enter Yes or No)`, "No");
                if (isAIInput === null) {
                    // User clicked Cancel on the Yes/No prompt for AI status
                    return null; // This is intended to cancel the entire "Add New Engineer" operation
                }
                const isAISWE = isAIInput.trim().toLowerCase() === 'yes';
                let aiAgentType = null;
                if (isAISWE) {
                    const typeStr = prompt(`Enter AI Agent Type for "${name}" (e.g., Code Generation):`, "General AI");
                    if (typeStr === null) return null;
                    aiAgentType = typeStr.trim() || "General AI";
                }

                const newEngineerData = {
                    name, level, currentTeamId: null, // Added to global pool, initially unassigned
                    attributes: { isAISWE, aiAgentType, skills, yearsOfExperience }
                };
                if (!currentSystemData.allKnownEngineers) currentSystemData.allKnownEngineers = [];
                currentSystemData.allKnownEngineers.push(newEngineerData);
                console.log("Added new engineer to global pool:", newEngineerData);
                displayTeamsForEditing(currentSystemData.teams, currentTeamEditIndex); // Refresh all team UIs
                // Return data for createDualListContainer to add to *this instance's* "Available" list
                return { value: newEngineerData.name, text: `${newEngineerData.name} (L${newEngineerData.level})${newEngineerData.attributes.isAISWE ? ' [AI]' : ''} - (Unallocated)` };
             }
        );
        engineerContainer.id = `engineersList_${teamIndex}`;
        teamDetails.appendChild(engineerContainer);

        let awayTeamSection = document.createElement('div');
        awayTeamSection.style.marginTop = '15px'; awayTeamSection.style.padding = '10px';
        awayTeamSection.style.border = '1px solid #add8e6'; awayTeamSection.style.backgroundColor = '#f0f8ff';
        let awayTeamTitle = document.createElement('h5'); awayTeamTitle.innerText = 'Away-Team Members';
        awayTeamSection.appendChild(awayTeamTitle);
        let awayMemberListDiv = document.createElement('div'); awayMemberListDiv.id = `awayMemberList_${teamIndex}`;
        awayMemberListDiv.style.marginBottom = '10px'; awayMemberListDiv.style.maxHeight = '150px';
        awayMemberListDiv.style.overflowY = 'auto'; awayMemberListDiv.style.border = '1px solid #ccc';
        awayMemberListDiv.style.padding = '5px'; awayTeamSection.appendChild(awayMemberListDiv);
        let addAwayForm = document.createElement('div'); addAwayForm.style.marginTop = '10px';
        addAwayForm.innerHTML = `
            <label for="newAwayName_${teamIndex}" style="margin-right: 5px;">Name:</label>
            <input type="text" id="newAwayName_${teamIndex}" placeholder="Away Member Name" style="width: 150px; margin-right: 10px;">
            <label for="newAwayLevel_${teamIndex}" style="margin-right: 5px;">Level:</label>
            <input type="number" id="newAwayLevel_${teamIndex}" min="1" max="7" placeholder="1-7" style="width: 50px; margin-right: 10px;">
            <label for="newAwaySource_${teamIndex}" style="margin-right: 5px;">Source:</label>
            <input type="text" id="newAwaySource_${teamIndex}" placeholder="Source Team/Org" style="width: 150px; margin-right: 10px;">
            <button type="button" id="addAwayBtn_${teamIndex}" class="btn-secondary">Add Away Member</button>
        `;
        awayTeamSection.appendChild(addAwayForm);
        teamDetails.appendChild(awayTeamSection);
        teamDetails.appendChild(document.createElement('br'));

        setTimeout(() => {
            const addAwayBtn = document.getElementById(`addAwayBtn_${teamIndex}`);
            if (addAwayBtn && typeof handleAddAwayTeamMember === 'function') {
                addAwayBtn.onclick = () => handleAddAwayTeamMember(teamIndex);
            }
            if (typeof displayAwayTeamMembers === 'function') displayAwayTeamMembers(team.awayTeamMembers || [], teamIndex);
        }, 0);

        let actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.style.marginTop = '15px';
        let saveButton = document.createElement('button');
        saveButton.type = 'button'; saveButton.className = 'btn-primary';
        saveButton.innerText = 'Save Team Changes'; saveButton.onclick = () => saveTeamChanges(teamIndex);
        actionButtonsDiv.appendChild(saveButton);
        let deleteButton = document.createElement('button');
        deleteButton.type = 'button'; deleteButton.className = 'btn-danger';
        deleteButton.innerText = 'Delete Team'; deleteButton.style.marginLeft = '10px';
        deleteButton.onclick = () => deleteTeam(teamIndex);
        actionButtonsDiv.appendChild(deleteButton);
        teamDetails.appendChild(actionButtonsDiv);

        teamDiv.appendChild(teamHeader);
        teamDiv.appendChild(teamDetails);
        teamsDiv.appendChild(teamDiv);

        if (isExpanded && typeof updateEffectiveBISDisplay === 'function') {
            updateEffectiveBISDisplay(teamIndex);
        }
    });
}

/** Helper to display Senior Manager Assignment UI within SDM section */
function displaySeniorManagerAssignment(sdmSectionContainer, teamIndex, currentSdmId) {
    // Find the specific container using teamIndex (or could use sdmId if unique)
    let srMgrContainer = sdmSectionContainer.querySelector(`#srMgrAssignmentContainer_${teamIndex}`);
    if (!srMgrContainer) {
         console.error("Could not find Sr Mgr container for team index", teamIndex);
         return;
     }
    srMgrContainer.innerHTML = ''; // Clear previous content
    srMgrContainer.style.paddingLeft = '20px'; // Indent slightly

    // Ensure global data is available
    const allSdms = currentSystemData.sdms || [];
    const allSeniorManagers = currentSystemData.seniorManagers || [];

    const currentSdm = allSdms.find(sdm => sdm && sdm.sdmId === currentSdmId);

    if (!currentSdm) {
        srMgrContainer.innerText = 'Assign an SDM to manage Senior Manager assignment.';
        return; // No SDM assigned, nothing to show
    }

    let title = document.createElement('h6');
    title.innerText = `Senior Manager for SDM: ${currentSdm.sdmName}`;
    srMgrContainer.appendChild(title);

    const currentSrMgr = allSeniorManagers.find(sr => sr && sr.seniorManagerId === currentSdm.seniorManagerId);

    const srMgrDualList = createDualListContainer( // Call global helper
        teamIndex, // Pass teamIndex for context if needed by callbacks
        'Current Sr. Mgr:', 'Available Sr. Mgrs:',
        currentSrMgr ? [{ value: currentSrMgr.seniorManagerId, text: currentSrMgr.seniorManagerName }] : [],
        allSeniorManagers.filter(sr => sr && sr.seniorManagerId !== currentSdm.seniorManagerId)
                         .map(sr => ({ value: sr.seniorManagerId, text: sr.seniorManagerName })), // Map to value/text
        `currentSrMgr_${currentSdmId}`, // Field names specific to this SDM
        `availableSrMgrs_${currentSdmId}`,
        (movedSrMgrId, direction) => { // Callback on Sr Mgr move
            // Find the SDM in the main data again to modify it
            const sdmToUpdate = currentSystemData.sdms.find(s => s.sdmId === currentSdmId);
            if (sdmToUpdate) {
                 sdmToUpdate.seniorManagerId = (direction === 'add') ? movedSrMgrId : null;
                 console.log(`Set Sr Mgr for SDM ${currentSdmId} to ${sdmToUpdate.seniorManagerId}`);
             } else {
                 console.warn("Could not find SDM to update Sr Mgr for:", currentSdmId);
             }
        },
        false, // singleSelectLeft = true for current Sr Mgr (set multiSelectLeft to false)
        true, // Allow adding new Sr Mgrs
        'Enter New Sr. Manager Name',
        (newSrMgrName) => { // Callback for adding new Sr Mgr
            if (!newSrMgrName || newSrMgrName.trim() === '') return null;
            newSrMgrName = newSrMgrName.trim();
            let existingSrMgr = (currentSystemData.seniorManagers || []).find(s => s && s.seniorManagerName.toLowerCase() === newSrMgrName.toLowerCase()); // check s
            if (existingSrMgr) {
                alert(`Senior Manager "${newSrMgrName}" already exists.`);
                return null;
            }
            const newSrMgrId = 'srMgr-' + Date.now();
            const newSrMgr = { seniorManagerId: newSrMgrId, seniorManagerName: newSrMgrName };
            if (!currentSystemData.seniorManagers) currentSystemData.seniorManagers = []; // Ensure array exists
            currentSystemData.seniorManagers.push(newSrMgr); // Add to main data
            // We might need to update the local 'allSeniorManagers' if it's used elsewhere before a full refresh
            console.log("Added new Senior Manager:", newSrMgr);
            return { value: newSrMgrId, text: newSrMgrName }; // Return for UI update
        }
    );
    srMgrContainer.appendChild(srMgrDualList);
 }

 /*
    Since displayTeamsForEditing is now called to refresh all team UIs after significant engineer assignment changes (like adding a new engineer or moving an engineer between teams), 
    the more granular refreshAllAvailableEngineerLists function is no longer strictly necessary and might lead to inconsistencies 
    if not perfectly synced. For now, to simplify and ensure data integrity, we rely on the full refresh.
*/

 /** Helper to refresh available engineer lists in all open team edit sections */
//function refreshAllAvailableEngineerLists() {
//     console.log("Refreshing all available engineer lists...");
//     const allTeamEditDivs = document.querySelectorAll('#teamsManagement .team-edit');
//     let allEngineerNamesMap = new Map(); // Recalculate global map
//     (currentSystemData.teams || []).forEach(t => { (t.engineers || []).forEach(eng => { if (eng?.name) allEngineerNamesMap.set(eng.name, t.teamId); }); });
//
//     allTeamEditDivs.forEach((teamDiv, index) => {
//         // Only refresh if the details are potentially visible (no easy way to know for sure without checking style)
//         // This is a simplification; ideally, only refresh *actually* visible ones.
//         const teamData = currentSystemData.teams[index]; // Assuming render index matches data index
//         if (!teamData) return;
//
//         const availableEngineersSelect = teamDiv.querySelector('select[data-field="availableEngineers"]');
//         const currentEngineersSelect = teamDiv.querySelector('select[data-field="currentEngineers"]');
//
//         if (availableEngineersSelect && currentEngineersSelect) {
//             const currentTeamEngineers = Array.from(currentEngineersSelect.options).map(opt => opt.value);
//             availableEngineersSelect.innerHTML = ''; // Clear current options
//             Array.from(allEngineerNamesMap.keys())
//                 .filter(name => !currentTeamEngineers.includes(name)) // Filter out engineers already in the current list
//                 .forEach(name => {
//                     availableEngineersSelect.appendChild(new Option(name, name));
//                 });
//         }
//     });
//}

/** Helper to refresh available options in a specific dual list (used for services) */
function refreshAvailableListsInDualList(contentContainer, currentListField, availableListField, allOptionsData, currentTeamId) {
    const currentSelect = contentContainer.querySelector(`select[data-field='${currentListField}']`);
    const availableSelect = contentContainer.querySelector(`select[data-field='${availableListField}']`);

    if (currentSelect && availableSelect) {
        const currentlyAssignedValues = Array.from(currentSelect.options).map(opt => opt.value);
        availableSelect.innerHTML = ''; // Clear
        allOptionsData.forEach(optionData => {
            // For services, filter out those owned by the current team OR already in the 'current' list
             if (optionData.owningTeamId !== currentTeamId && !currentlyAssignedValues.includes(optionData.value)) {
                 availableSelect.appendChild(new Option(optionData.text, optionData.value));
             }
        });
        console.log(`Refreshed available list for field: ${availableListField}`);
    } else {
         console.warn(`Could not find select lists for refresh: ${currentListField} / ${availableListField}`);
    }
}

/** Displays the list of current away team members for a specific team */
function displayAwayTeamMembers(awayMembers, teamIndex) {
    const listDiv = document.getElementById(`awayMemberList_${teamIndex}`);
    if (!listDiv) {
        console.error(`Could not find away member list div for team index ${teamIndex}`);
        return;
    }
    listDiv.innerHTML = ''; // Clear current list

    if (!awayMembers || awayMembers.length === 0) {
        listDiv.innerHTML = '<em style="color: #666;">No away-team members assigned.</em>';
        return;
    }

    awayMembers.forEach((member, memberIndex) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.marginBottom = '3px';
        itemDiv.style.padding = '2px';
        itemDiv.style.borderBottom = '1px dashed #eee';

        const memberInfo = document.createElement('span');
        memberInfo.textContent = `${member.name || 'Unnamed'} (L${member.level ?? '?'}) - ${member.sourceTeam || 'Unknown Source'}`;
        itemDiv.appendChild(memberInfo);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.fontSize = '0.8em';
        removeBtn.style.padding = '1px 4px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.onclick = () => handleRemoveAwayTeamMember(teamIndex, memberIndex);
        itemDiv.appendChild(removeBtn);

        listDiv.appendChild(itemDiv);
    });
}

/** Handles clicking the 'Add Away Member' button */
function handleAddAwayTeamMember(teamIndex) {
    const nameInput = document.getElementById(`newAwayName_${teamIndex}`);
    const levelInput = document.getElementById(`newAwayLevel_${teamIndex}`);
    const sourceInput = document.getElementById(`newAwaySource_${teamIndex}`);

    const name = nameInput?.value.trim();
    const level = parseInt(levelInput?.value);
    const sourceTeam = sourceInput?.value.trim();

    // Validation
    if (!name) { alert('Please enter a name for the away-team member.'); return; }
    if (isNaN(level) || level < 1 || level > 5) { alert('Please enter a valid level (1-5).'); return; }
    if (!sourceTeam) { alert('Please enter the source team/organization.'); return; }

    // Add to data model
    const team = currentSystemData.teams[teamIndex];
    if (!team) { console.error(`Cannot add away member, team index ${teamIndex} not found.`); return; }
    if (!team.awayTeamMembers) { team.awayTeamMembers = []; }

    // Check if member with same name already exists *in this team's away list*
    if (team.awayTeamMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        alert(`An away-team member named "${name}" is already assigned to this team.`);
        return;
    }

    team.awayTeamMembers.push({ name, level, sourceTeam });
    console.log(`Added away member to team ${teamIndex}:`, { name, level, sourceTeam });

    // Clear inputs
    if (nameInput) nameInput.value = '';
    if (levelInput) levelInput.value = '';
    if (sourceInput) sourceInput.value = '';

    // Refresh display
    displayAwayTeamMembers(team.awayTeamMembers, teamIndex);
    updateEffectiveBISDisplay(teamIndex); // Update the read-only BIS display
}

/** Handles clicking the 'Remove' button for an away-team member */
function handleRemoveAwayTeamMember(teamIndex, memberIndex) {
    const team = currentSystemData.teams[teamIndex];
    if (!team || !team.awayTeamMembers || memberIndex >= team.awayTeamMembers.length) {
        console.error(`Cannot remove away member, invalid indices: team ${teamIndex}, member ${memberIndex}`);
        return;
    }

    const removedMember = team.awayTeamMembers.splice(memberIndex, 1);
    console.log(`Removed away member from team ${teamIndex}:`, removedMember);

    // Refresh display
    displayAwayTeamMembers(team.awayTeamMembers, teamIndex);
    updateEffectiveBISDisplay(teamIndex); // Update the read-only BIS display
}

/** Helper to update the read-only Effective BIS display for a team */
function updateEffectiveBISDisplay(teamIndex) {
    const team = currentSystemData.teams[teamIndex];
    if (!team) return;

    const teamBIS = team.engineers?.length ?? 0;
    const awayTeamBIS = team.awayTeamMembers?.length ?? 0;
    const effectiveBIS = teamBIS + awayTeamBIS;
    const bisTooltip = `Team BIS: ${teamBIS}, Away-Team BIS: ${awayTeamBIS}`;

    const effectiveBISSpan = document.getElementById(`effectiveBIS_${teamIndex}`);
    const effectiveBISLabel = effectiveBISSpan?.previousElementSibling; // Get label for tooltip update

    if (effectiveBISSpan) {
        effectiveBISSpan.textContent = effectiveBIS;
        effectiveBISSpan.title = bisTooltip; // Update value tooltip
    }
     if (effectiveBISLabel) {
        effectiveBISLabel.title = bisTooltip; // Update label tooltip
     }
}

function updateTeamSize(teamIndex, newSize) {
    currentSystemData.teams[teamIndex].sizeOfTeam = newSize;

    // Update the UI element for "Size of Team"
    const teamDiv = document.querySelectorAll('.team-edit')[teamIndex];
    const sizeInput = teamDiv.querySelector('input[data-field="sizeOfTeam"]');
    sizeInput.value = newSize;

    // **Update sizeOfTeam in currentSystemData**
    currentSystemData.teams[teamIndex].sizeOfTeam = newSize;
}

function updateAvailableEngineersInOtherTeams(engineerName, assignedTeamId) {
    // Loop through all teams
    currentSystemData.teams.forEach((team, idx) => {
        // Skip the team where the engineer was just added or removed
        if (team.teamId === assignedTeamId) {
            return;
        }

        const teamDiv = document.querySelectorAll('.team-edit')[idx];
        const availableEngineersSelect = teamDiv.querySelector('select[data-field="availableEngineers"]');
        const currentEngineersSelect = teamDiv.querySelector('select[data-field="currentEngineers"]');

        if (assignedTeamId) {
            // Remove from availableEngineersSelect
            const option = Array.from(availableEngineersSelect.options).find(opt => opt.value === engineerName);
            if (option) {
                availableEngineersSelect.removeChild(option);
            }
        } else {
            // Add to availableEngineersSelect if not already present
            const optionExists = Array.from(availableEngineersSelect.options).some(opt => opt.value === engineerName);
            const inCurrentEngineers = Array.from(currentEngineersSelect.options).some(opt => opt.value === engineerName);
            if (!optionExists && !inCurrentEngineers) {
                let option = document.createElement('option');
                option.value = engineerName;
                option.text = engineerName;
                availableEngineersSelect.appendChild(option);
            }
        }
    });
}

function updateAvailableServicesInOtherTeams(serviceName, assignedTeamId) {
    // Loop through all teams
    currentSystemData.teams.forEach((team, idx) => {
        // Skip the team where the service was just added or removed
        if (team.teamId === assignedTeamId) {
            return;
        }

        const teamDiv = document.querySelectorAll('.team-edit')[idx];
        const availableServicesSelect = teamDiv.querySelector('select[data-field="availableServices"]');
        const currentServicesSelect = teamDiv.querySelector('select[data-field="currentServices"]');

        if (assignedTeamId) {
            // Remove from availableServicesSelect
            const option = Array.from(availableServicesSelect.options).find(opt => opt.value === serviceName);
            if (option) {
                availableServicesSelect.removeChild(option);
            }
        } else {
            // Add to availableServicesSelect if not already present
            const optionExists = Array.from(availableServicesSelect.options).some(opt => opt.value === serviceName);
            const inCurrentServices = Array.from(currentServicesSelect.options).some(opt => opt.value === serviceName);
            if (!optionExists && !inCurrentServices) {
                let option = document.createElement('option');
                option.value = serviceName;
                option.text = serviceName;
                availableServicesSelect.appendChild(option);
            }
        }
    });
}

function removeServiceFromPreviousTeam(serviceName, prevTeamId) {
    const prevTeamIndex = currentSystemData.teams.findIndex(t => t.teamId === prevTeamId);
    if (prevTeamIndex !== -1) {
        const prevTeamDiv = document.querySelectorAll('.team-edit')[prevTeamIndex];
        const prevCurrentServicesSelect = prevTeamDiv.querySelector('select[data-field="currentServices"]');
        const prevOption = Array.from(prevCurrentServicesSelect.options).find(opt => opt.value === serviceName);
        if (prevOption) {
            prevCurrentServicesSelect.removeChild(prevOption);
            // Add to availableServicesSelect of previous team
            const prevAvailableServicesSelect = prevTeamDiv.querySelector('select[data-field="availableServices"]');
            prevAvailableServicesSelect.appendChild(prevOption.cloneNode(true));
        }
    }
}

function removeEngineerFromPreviousTeam(engineerName, prevTeamId) {
    const prevTeamIndex = currentSystemData.teams.findIndex(t => t.teamId === prevTeamId);
    if (prevTeamIndex !== -1) {
        const prevTeamDiv = document.querySelectorAll('.team-edit')[prevTeamIndex];
        const prevCurrentEngineersSelect = prevTeamDiv.querySelector('select[data-field="currentEngineers"]');
        const prevOption = Array.from(prevCurrentEngineersSelect.options).find(opt => opt.value === engineerName);
        if (prevOption) {
            prevCurrentEngineersSelect.removeChild(prevOption);
            // Update uniqueEngineers
            const engineer = uniqueEngineers.find(e => e.engineerName === engineerName);
            if (engineer) engineer.teamId = null;
        }
    }
}

function validateTeamChanges() {
    // Check for engineers assigned to multiple teams
    const engineerAssignments = {};
    currentSystemData.teams.forEach(team => {
        const teamEngineers = team.engineerNames ? team.engineerNames.split(',').map(name => name.trim()) : [];
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

    // Check for services owned by multiple teams
    const serviceAssignments = {};
    currentSystemData.services.forEach(service => {
        if (service.owningTeamId) {
            if (serviceAssignments[service.serviceName]) {
                serviceAssignments[service.serviceName].push(service.owningTeamId);
            } else {
                serviceAssignments[service.serviceName] = [service.owningTeamId];
            }
        }
    });

    const conflictingServices = Object.entries(serviceAssignments).filter(([_, teams]) => teams.length > 1);

    let validationErrors = '';

    if (conflictingEngineers.length > 0) {
        validationErrors += 'The following engineers are assigned to multiple teams:\n';
        conflictingEngineers.forEach(([engineerName, teams]) => {
            validationErrors += `- ${engineerName}: ${teams.join(', ')}\n`;
        });
    }

    if (conflictingServices.length > 0) {
        validationErrors += 'The following services are owned by multiple teams:\n';
        conflictingServices.forEach(([serviceName, teamIds]) => {
            const teamNames = teamIds.map(teamId => {
                const team = currentSystemData.teams.find(t => t.teamId === teamId);
                return team ? (team.teamName || team.teamIdentity || 'Unnamed Team') : 'Unknown Team';
            });
            validationErrors += `- ${serviceName}: ${teamNames.join(', ')}\n`;
        });
    }

    if (validationErrors) {
        alert('Validation Errors:\n' + validationErrors);
        return false;
    }

    return true;
}


/** Updated Save Team Changes **/
/** Updated Save Team Changes - Includes Collapse Logic & Validation Call **/
function saveTeamChanges(index) {
    // Get the specific team object
    if (!currentSystemData || !currentSystemData.teams || index >= currentSystemData.teams.length) {
        console.error("Cannot save team, invalid index or data:", index);
        return;
    }
    const team = currentSystemData.teams[index];

    // --- Data is assumed to be updated by input listeners and dual-list callbacks ---

    // Recalculate Builders In Seats just to be sure it matches the array
    team.buildersInSeats = team.engineers ? team.engineers.length : 0;

    // Validate required fields for this team
    if (!team.teamIdentity || !team.teamName) {
        alert('Team Identity and Team Name are required.');
        return; // Don't proceed if basic info missing
    }

    // *** Add cross-team validation before saving system state ***
    if (!validateEngineerAssignments()) { // Call validation function
        return; // Stop saving if validation fails
    }
    // *********************************************************

    console.log("Saving changes for team (via saveSystemChanges):", JSON.stringify(team, null, 2));

    // --- Save the entire system data to local storage ---
    saveSystemChanges(); // This function now also includes validation internally

    // --- Update related UI elements ---
    generateTeamTable(currentSystemData); // Update main Team Breakdown table
    generateTeamVisualization(currentSystemData); // Update Team Visualization

    alert(`Changes for team "${team.teamName || team.teamIdentity}" potentially saved (system state saved).`);

    // --- Collapse the edit section after saving attempt ---
    const teamDivs = document.querySelectorAll('#teamsManagement .team-edit');
    if (index < teamDivs.length) {
         const teamDiv = teamDivs[index];
         const teamDetails = teamDiv.querySelector('.team-details');
         const indicator = teamDiv.querySelector('h4 > span');
         // Check if elements exist before modifying
         if (teamDetails) teamDetails.style.display = 'none';
         if (indicator) indicator.innerText = '+ ';
     }
  
}

/** Updated Add New Team **/
function addNewTeam(overrides = {}) {
    // Generate a unique teamId (simple approach for now)
    const newTeamId = 'team-' + Date.now();

    // Create a new team object with the updated default structure
    const newTeam = {
        teamId: newTeamId,
        teamName: '', // Blank initially
        teamIdentity: '', // Blank initially
        teamDescription: '', // Added field
        fundedHeadcount: 0, // Default funded HC
        buildersInSeats: 0, // Default BIS (no engineers yet)
        engineers: [], // Start with an empty array for engineers
        sdmId: null, // No default SDM assigned
        pmtId: null,  // No default PMT assigned
        ...overrides
        // Removed sdmName, pmtName as they are derived via IDs
    };

    // Add to the system data
    if (!currentSystemData.teams) {
        currentSystemData.teams = [];
    }
    currentSystemData.teams.push(newTeam);

    // Get the index of the newly added team
    const newTeamIndex = currentSystemData.teams.length - 1;

    // Refresh the team editing display and expand the new team
    // Pass -1 if displayTeamsForEditing doesn't handle expansion correctly, or pass newTeamIndex
    displayTeamsForEditing(currentSystemData.teams, newTeamIndex);

    return newTeam;
}

/** Delete Team **/

// In js/editSystem.js

function deleteTeam(teamIndex, options = {}) {
    const { skipConfirm = false, silent = false } = options;
    const teamToDelete = currentSystemData.teams[teamIndex];
    if (!teamToDelete) {
        console.error("Team to delete not found at index:", teamIndex);
        return false;
    }
    const confirmDelete = skipConfirm ? true : confirm(`Are you sure you want to delete the team "${teamToDelete.teamName || teamToDelete.teamIdentity}"? This action cannot be undone.`);

    if (confirmDelete) {
        const deletedTeamId = teamToDelete.teamId;

        // Remove the team from currentSystemData.teams
        currentSystemData.teams.splice(teamIndex, 1);

        // Update services that reference this team's ID
        (currentSystemData.services || []).forEach(service => {
            if (service.owningTeamId === deletedTeamId) {
                service.owningTeamId = null; // Service becomes unowned
            }
        });

        // --- NEW: Update allKnownEngineers ---
        if (currentSystemData.allKnownEngineers) {
            currentSystemData.allKnownEngineers.forEach(engineer => {
                if (engineer.currentTeamId === deletedTeamId) {
                    engineer.currentTeamId = null; // Engineer becomes unallocated
                }
            });
        }
        // --- END NEW ---

        // The uniqueEngineers array might be deprecated if allKnownEngineers is the sole source.
        // For now, if it's still used elsewhere, it would also need updating.
        // uniqueEngineers = uniqueEngineers.filter(engineer => engineer.teamId !== deletedTeamId);


        // Save changes to local storage
        saveSystemChanges(); // This function should ideally save the entire currentSystemData

        if (!silent) {
            alert(`Team "${teamToDelete.teamName || teamToDelete.teamIdentity}" has been deleted.`);
        }

        // Refresh the teams editing interface: Re-render all team sections
        // Pass -1 or a valid index if you want a specific team to be expanded.
        // Passing the original index might be confusing as it's now deleted.
        displayTeamsForEditing(currentSystemData.teams, -1); // Refresh and collapse all

        // Update other UI components that might be affected
        generateTeamTable(currentSystemData); // In orgView.js
        generateTeamVisualization(currentSystemData); // In visualizations.js
        // If planning view or capacity view depend on team list, they might need refresh too if visible.
        if (document.getElementById('planningView').style.display !== 'none') {
            if (typeof renderPlanningView === 'function') {
                renderPlanningView();
            }
        }
        if (document.getElementById('capacityConfigView').style.display !== 'none') {
            // This might need more granular updates or a full re-render of capacity view sections
            generateTeamConstraintsForms(); // In capacityTuning.js
            updateCapacityCalculationsAndDisplay(); // In capacityTuning.js
        }
        return true;
    }
    return false;
}

// Add a generic handler for team input changes (if not already present)
// This replaces the specific listeners previously inside createInputLabelPair
function handleTeamInputChange(event) {
    const input = event.target;
    const teamIndex = parseInt(input.getAttribute('data-team-index'));
    const fieldName = input.getAttribute('data-field');
    let value = input.value;

    if (input.type === 'number') {
        value = parseInt(value);
        if (isNaN(value)) value = 0;
    }

    if (currentSystemData && currentSystemData.teams && teamIndex >= 0 && teamIndex < currentSystemData.teams.length) {
        currentSystemData.teams[teamIndex][fieldName] = value;
        console.log(`Updated team[${teamIndex}].${fieldName} to:`, value);

        // If team identity or name changed, update the header
        if (fieldName === 'teamIdentity' || fieldName === 'teamName') {
            const teamDiv = input.closest('.team-edit');
            const header = teamDiv?.querySelector('h4');
            if (header) {
                 const indicator = header.querySelector('span');
                 const teamData = currentSystemData.teams[teamIndex];
                 header.textContent = `Team: ${teamData.teamIdentity || teamData.teamName || 'New Team'}`;
                 if(indicator) header.insertBefore(indicator, header.firstChild);
            }
        }
    } else {
        console.warn(`Could not update team data for index ${teamIndex}, field ${fieldName}`);
    }
}

/** REVISED (v4) Show System Edit Form using switchView */
function showSystemEditForm(systemData) {
    console.log("Entering Edit System form (Focus Mode)...");
    if (!systemData) { console.error("showSystemEditForm called without systemData."); return; }

    // Use switchView to handle showing the form and managing buttons/title
    switchView('systemEditForm', Modes.EDITING); // Explicitly set EDITING mode

    // --- Populate form fields ---
    const nameInput = document.getElementById('systemNameInput');
    const descInput = document.getElementById('systemDescriptionInput');
    if(nameInput) nameInput.value = systemData.systemName || '';
    if(descInput) descInput.value = systemData.systemDescription || '';
    console.log("Populated edit form: Name=", nameInput?.value, "Desc=", descInput?.value);

    // Populate services and teams (existing logic)
    try {
        displayServicesForEditing(systemData.services || [], 'editServicesManagement');
        displayTeamsForEditing(systemData.teams || []);
    } catch (error) {
        console.error("Error populating services/teams in edit form:", error);
        const editFormDiv = document.getElementById('systemEditForm');
        if(editFormDiv) editFormDiv.innerHTML = `<p style="color:red;">Error populating form details. Check console.</p>`;
    }

}

/** Save System Details **/
function saveSystemDetails() {
    // Get updated system name and description
    console.log("*** 1 document.getElementById('systemNameInput').value",document.getElementById('systemNameInput').value);
    console.log("*** 2 document.getElementById('systemDescriptionInput'",document.getElementById('systemDescriptionInput').value);

    const systemNameInput = document.getElementById('systemNameInput');
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');

    console.log("*** 3 systemNameInput = ", systemNameInput.value);
    console.log("*** 4 systemDescriptionTextarea = ", systemDescriptionTextarea.value);

    const oldSystemName = currentSystemData.systemName;
    const newSystemName = systemNameInput.value.trim();

    if (!newSystemName) {
        alert('System name cannot be empty.');
        return;
    }

    currentSystemData.systemName = newSystemName;
    currentSystemData.systemDescription = systemDescriptionTextarea.value.trim();

    // Save currentSystemData to local storage
    const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

    systems[newSystemName] = currentSystemData;

    console.log('Saving to local storage:', systems);

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

    alert('System details saved, please continue to update the services and teams. Note: If you changed the system name, it is treated as a new system');

    if (currentMode == Modes.EDITING) {
    // Update UI components
    generateTeamTable(currentSystemData);
    generateServiceDependenciesTable();
    updateServiceVisualization();
    updateDependencyVisualization();
    }
}

/** Save All Changes **/

/** REVISED Save All Changes - Handles Creation and Updates */
function saveAllChanges() {
//    if (currentMode !== Modes.CREATING && currentMode !== Modes.EDITING) {
//         alert('Not in creation or edit mode. No changes to save.');
//         return;
//    }

    // --- Get Final System Name and Description from Form ---
    const systemNameInput = document.getElementById('systemNameInput');
    const systemDescriptionTextarea = document.getElementById('systemDescriptionInput');
    const finalSystemName = systemNameInput.value.trim();
    const finalSystemDescription = systemDescriptionTextarea.value.trim();

    if (!finalSystemName) {
        alert('System Name cannot be empty. Please enter a name before saving.');
        systemNameInput.focus(); // Focus the input field
        return;
    }
    // Basic check for description, can be optional
    if (!finalSystemDescription) {
        if (!confirm('System Description is empty. Save anyway?')) {
            systemDescriptionTextarea.focus();
            return;
        }
    }
    // --- Update currentSystemData with final name/desc ---
    // This ensures the object being saved has the correct top-level info
    const oldSystemNameKey = currentSystemData.systemName; // Store the name *before* updating
    currentSystemData.systemName = finalSystemName;
    currentSystemData.systemDescription = finalSystemDescription;
    console.log(`Attempting to save system as: "${finalSystemName}"`);

    // --- Perform Validation ---
    // Ensure engineer assignments are valid before saving
    if (!validateEngineerAssignments()) {
        // If validation fails, revert name/desc change in the data object
        // to avoid potential mismatches if user cancels or tries again.
        currentSystemData.systemName = oldSystemNameKey;
        currentSystemData.systemDescription = document.getElementById('systemDescriptionInput').value; // Or revert based on how it was before validation
        return; // Stop the save
    }
    // Add other validation checks here if needed (e.g., required fields for teams/services)

    // --- Save to Local Storage ---
    try {
        const systems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

        // Check if renaming an existing system or creating a new one
        if (currentMode === Modes.EDITING && oldSystemNameKey && oldSystemNameKey !== finalSystemName) {
            // If the name changed during editing, remove the old entry
            if (systems[oldSystemNameKey]) {
                delete systems[oldSystemNameKey];
                console.log(`Removed old system entry for key: "${oldSystemNameKey}" due to rename.`);
            }
        }
        // Check if overwriting another system with the new name (relevant for 'Create New' if name exists)
        if (systems[finalSystemName] && (currentMode === Modes.CREATING || oldSystemNameKey !== finalSystemName)) {
            if (!confirm(`A system named "${finalSystemName}" already exists. Overwrite it?`)) {
                // Revert data object name change before cancelling
                currentSystemData.systemName = oldSystemNameKey;
                currentSystemData.systemDescription = document.getElementById('systemDescriptionInput').value; // Revert desc too
                return; // User cancelled overwrite
            }
        }


        // Save the current data under the final name
        systems[finalSystemName] = currentSystemData;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(systems));

        alert(`System "${finalSystemName}" saved successfully.`);

        // --- Post-Save Actions ---
        if (currentMode === Modes.CREATING) {
            // After successfully creating, switch to Browse mode for the new system
            currentMode = Modes.Browse;
            // Optionally reload the view for the newly saved system
            loadSavedSystem(finalSystemName); // Load it properly
        } else {
            // If editing, maybe exit edit mode or refresh views
            exitEditMode(); // Go back to Browse mode
        }

    } catch (error) {
        console.error("Error saving system to local storage:", error);
        alert("An error occurred while trying to save the system. Please check the console for details.");
        // Revert data object name change on error
        currentSystemData.systemName = oldSystemNameKey;
        currentSystemData.systemDescription = document.getElementById('systemDescriptionInput').value;
    }

}

window.showSystemEditForm = showSystemEditForm;
