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
function addNewService() {
    // Create a new service object with default values
    const newService = {
        serviceName: 'New Service ' + ((currentSystemData.services?.length || 0) + 1),
        serviceDescription: '',
        owningTeamId: null,
        apis: [],
        serviceDependencies: [],
        platformDependencies: []
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
}

/** Delete Service **/

function deleteService(serviceIndex, containerId) {
    // Remove the service from the system data
    currentSystemData.services.splice(serviceIndex, 1);

    // **Update the Team Breakdown and Service Dependencies Tables**
    generateTeamTable(currentSystemData);
    generateServiceDependenciesTable();
    
    // Refresh the service editing display
    displayServicesForEditing(currentSystemData.services, containerId,serviceIndex);
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

/** Display Teams for Editing **/
/** REVISED Display Teams for Editing - Adds Away-Team Management Section */
function displayTeamsForEditing(teams, expandedIndex = -1) {
    const teamsDiv = document.getElementById('teamsManagement');
    teamsDiv.innerHTML = ''; // Clear existing content

    // Pre-fetch global lists (keep as before)
    const allServices = (currentSystemData.services || []).map(service => ({ value: service.serviceName, text: service.serviceName, owningTeamId: service.owningTeamId || null }));
    const allSdms = currentSystemData.sdms || [];
    const allPmts = currentSystemData.pmts || [];
    const allSeniorManagers = currentSystemData.seniorManagers || [];
    // Note: Away-team list is per-team, not global selection here

    (teams || []).forEach((team, index) => {
        if (!team) { console.warn("Skipping invalid team object at index", index); return; }

        let teamDiv = document.createElement('div');
        teamDiv.className = 'team-edit';
        teamDiv.setAttribute('data-team-render-index', index); // Keep render index if needed

        // --- Header (Collapsible) - No Change ---
        let teamHeader = document.createElement('h4');
        teamHeader.style.cursor = 'pointer';
        let indicator = document.createElement('span');
        indicator.innerText = (index === expandedIndex) ? '- ' : '+ ';
        teamHeader.appendChild(indicator);
        teamHeader.appendChild(document.createTextNode(`Team: ${team.teamIdentity || team.teamName || 'New Team'}`));

        let teamDetails = document.createElement('div');
        teamDetails.className = 'team-details';
        teamDetails.style.display = (index === expandedIndex) ? 'block' : 'none';

        // Toggle Functionality (Keep as before, but refresh away-team list too)
        teamHeader.onclick = () => {
            const content = teamDetails;
            const isCurrentlyCollapsed = content.style.display === 'none' || content.style.display === '';
            content.style.display = isCurrentlyCollapsed ? 'block' : 'none';
            indicator.innerText = isCurrentlyCollapsed ? '- ' : '+ ';
            if (isCurrentlyCollapsed) {
                 // Refresh Available Services
                 refreshAvailableListsInDualList(content, 'currentServices', 'availableServices',
                    (currentSystemData.services || []).map(s => ({ value: s.serviceName, text: s.serviceName, owningTeamId: s.owningTeamId || null })),
                    team.teamId
                 );
                 // Refresh Sr Mgr display
                 displaySeniorManagerAssignment(content.querySelector(`#sdmSection_${index}`), index, team.sdmId);
                 // Refresh Away-Team List Display (in case data changed elsewhere)
                 displayAwayTeamMembers(team.awayTeamMembers || [], index);
                 // Refresh Effective BIS display
                 updateEffectiveBISDisplay(index);
            }
        };
        // --- End Header ---

        // --- Basic Info Inputs (Using revised helper) ---
        teamDetails.appendChild(createInputLabelPair(`teamIdentity_${index}`, 'Team Identity:', team.teamIdentity || '', 'text', index, 'teamIdentity'));
        teamDetails.appendChild(createInputLabelPair(`teamName_${index}`, 'Team Name:', team.teamName || '', 'text', index, 'teamName'));
        teamDetails.appendChild(createInputLabelPair(`teamDescription_${index}`, 'Team Description:', team.teamDescription || '', 'textarea', index, 'teamDescription'));
        // --- End Basic Info ---

        // --- Services Owned Dual List (Keep as before) ---
        const currentServices = allServices.filter(s => s.owningTeamId === team.teamId);
        const availableServices = allServices.filter(s => s.owningTeamId !== team.teamId);
        const servicesContainer = createDualListContainer(
             index, 'Services Owned:', 'Available Services:',
             currentServices, availableServices,
             'currentServices', 'availableServices',
             (movedOptionValue, direction, contextIndex) => { /* ... service move callback (no change) ... */
                const service = currentSystemData.services.find(s => s.serviceName === movedOptionValue);
                const targetTeam = currentSystemData.teams[contextIndex];
                if (service && targetTeam) {
                    service.owningTeamId = (direction === 'add') ? targetTeam.teamId : null;
                }
             }
        );
        teamDetails.appendChild(servicesContainer);
        teamDetails.appendChild(document.createElement('br'));
        // --- End Services ---

        // --- SDM Assignment & Senior Manager Assignment (Keep as before) ---
        const sdmSection = document.createElement('div'); /* ... sdm section setup (no change) ... */
        sdmSection.id = `sdmSection_${index}`; sdmSection.style.border = '1px dashed #ccc'; sdmSection.style.padding = '10px'; sdmSection.style.marginBottom = '10px';
        let sdmSectionTitle = document.createElement('h5'); sdmSectionTitle.innerText = 'SDM Assignment'; sdmSection.appendChild(sdmSectionTitle);
        const currentSdm = allSdms.find(sdm => sdm && sdm.sdmId === team.sdmId);
        const sdmContainer = createDualListContainer( /* ... sdm dual list setup (no change) ... */
            index, 'Current SDM:', 'Available SDMs:',
            currentSdm ? [{ value: currentSdm.sdmId, text: currentSdm.sdmName }] : [],
            allSdms.filter(sdm => sdm && sdm.sdmId !== team.sdmId).map(sdm => ({ value: sdm.sdmId, text: sdm.sdmName })),
            'currentSdm', 'availableSdms',
            (movedOptionValue, direction, contextIndex) => { // SDM Move Callback
                const targetTeam = currentSystemData.teams[contextIndex];
                if(targetTeam){
                    const newSdmId = (direction === 'add') ? movedOptionValue : null;
                    targetTeam.sdmId = newSdmId;
                    // Refresh Sr. Mgr section using the specific sdmSection container
                    displaySeniorManagerAssignment(sdmSection, contextIndex, newSdmId);
                }
            },
            false, true, 'Enter New SDM Name', // Single select left, allow add new
            (newSdmName) => { /* ... add new sdm callback (no change) ... */
                if (!newSdmName || newSdmName.trim() === '') return null; newSdmName = newSdmName.trim();
                let existingSdm = allSdms.find(s => s && s.sdmName.toLowerCase() === newSdmName.toLowerCase());
                if (existingSdm) { alert(`SDM "${newSdmName}" already exists.`); return null; }
                const newSdmId = 'sdm-' + Date.now(); const newSdm = { sdmId: newSdmId, sdmName: newSdmName, seniorManagerId: null };
                currentSystemData.sdms.push(newSdm); allSdms.push(newSdm); // Update local cache too
                console.log("Added new SDM:", newSdm); return { value: newSdmId, text: newSdmName };
             }
        );
        sdmSection.appendChild(sdmContainer);
        let srMgrAssignmentContainer = document.createElement('div'); srMgrAssignmentContainer.id = `srMgrAssignmentContainer_${index}`; srMgrAssignmentContainer.style.marginTop = '10px';
        sdmSection.appendChild(srMgrAssignmentContainer);
        teamDetails.appendChild(sdmSection); teamDetails.appendChild(document.createElement('br'));
        // Initial population of Sr Mgr (will also happen on expand)
        if (teamDetails.style.display === 'block') {
            displaySeniorManagerAssignment(sdmSection, index, team.sdmId);
        }
        // --- End SDM/SrMgr ---

        // --- PMT Assignment (Keep as before) ---
        const currentPmt = allPmts.find(pmt => pmt && pmt.pmtId === team.pmtId);
        const pmtContainer = createDualListContainer(/* ... pmt dual list setup (no change) ... */
            index, 'Current PMT:', 'Available PMTs:',
            currentPmt ? [{ value: currentPmt.pmtId, text: currentPmt.pmtName }] : [],
            allPmts.filter(pmt => pmt && pmt.pmtId !== team.pmtId).map(pmt => ({ value: pmt.pmtId, text: pmt.pmtName })),
            'currentPmt', 'availablePmts',
            (movedOptionValue, direction, contextIndex) => { // PMT Move Callback
                const targetTeam = currentSystemData.teams[contextIndex];
                if(targetTeam) targetTeam.pmtId = (direction === 'add') ? movedOptionValue : null;
            },
            false, true, 'Enter New PMT Name', // Single select left, allow add new
             (newPmtName) => { /* ... add new pmt callback (no change) ... */
                 if (!newPmtName || newPmtName.trim() === '') return null; newPmtName = newPmtName.trim();
                 let existingPmt = allPmts.find(p => p && p.pmtName.toLowerCase() === newPmtName.toLowerCase());
                 if (existingPmt) { alert(`PMT "${newPmtName}" already exists.`); return null; }
                 const newPmtId = 'pmt-' + Date.now(); const newPmt = { pmtId: newPmtId, pmtName: newPmtName };
                 currentSystemData.pmts.push(newPmt); allPmts.push(newPmt); // Update local cache
                 console.log("Added new PMT:", newPmt); return { value: newPmtId, text: newPmtName };
              }
        );
        teamDetails.appendChild(pmtContainer); teamDetails.appendChild(document.createElement('br'));
        // --- End PMT ---

        // --- Headcount Section ---
        teamDetails.appendChild(createInputLabelPair(`fundedHeadcount_${index}`, 'Finance Approved Funding:', team.fundedHeadcount ?? 0, 'number', index, 'fundedHeadcount'));

        // ** UPDATED: Display Effective BIS (Read Only) **
        const teamBIS = team.engineers?.length ?? 0;
        const awayTeamBIS = team.awayTeamMembers?.length ?? 0;
        const effectiveBIS = teamBIS + awayTeamBIS;
        const bisTooltip = `Team BIS: ${teamBIS}, Away-Team BIS: ${awayTeamBIS}`;
        teamDetails.appendChild(
            createInputLabelPair(`effectiveBIS_${index}`, 'Effective BIS:', effectiveBIS, 'text', index, 'effectiveBIS', true, bisTooltip) // isReadOnly = true
        );
        teamDetails.appendChild(document.createElement('br'));
        // --- End Headcount ---

        // --- Engineer Assignment (Keep as before) ---
        let engineersSectionTitle = document.createElement('h5'); /* ... engineer section setup (no change) ... */
        engineersSectionTitle.innerText = 'Team Engineer Assignment'; engineersSectionTitle.style.marginTop = '15px'; teamDetails.appendChild(engineersSectionTitle);
        const currentEngineerOptions = (team.engineers || []).map(eng => ({ value: eng.name, text: `${eng.name} (L${eng.level ?? '?'})` })); // Show level in list
        // Available needs to be calculated carefully now
        let allEngineerNamesMap = new Map();
        (currentSystemData.teams || []).forEach(t => { (t.engineers || []).forEach(eng => { if (eng?.name) allEngineerNamesMap.set(eng.name, t.teamId); }); });
        const availableEngineerOptions = Array.from(allEngineerNamesMap.keys()).filter(name => allEngineerNamesMap.get(name) !== team.teamId).map(name => ({ value: name, text: name }));

        const engineerContainer = createDualListContainer( /* ... engineer dual list setup (no change in basic structure) ... */
            index, 'Current Engineers:', 'Available Engineers:', currentEngineerOptions, availableEngineerOptions,
            'currentEngineers', 'availableEngineers',
            (movedEngineerName, direction, contextIndex) => { // Engineer Move Callback
                 const currentTeam = currentSystemData.teams[contextIndex]; if (!currentTeam) return;
                 if (direction === 'add') { /* ... remove from other teams, add to current (no change) ... */
                    let engineerLevel = 1; // Default level
                    // Try find the engineer on another team to get their level
                    currentSystemData.teams.forEach(otherTeam => {
                         const existingEng = (otherTeam.engineers || []).find(eng => eng.name === movedEngineerName);
                         if (existingEng) engineerLevel = existingEng.level ?? 1;
                    });

                     // Remove from *all* other teams first
                     currentSystemData.teams.forEach((otherTeam, otherIdx) => {
                         if (otherTeam.teamId !== currentTeam.teamId && otherTeam.engineers) {
                             const initialLength = otherTeam.engineers.length;
                             otherTeam.engineers = otherTeam.engineers.filter(eng => eng.name !== movedEngineerName);
                             if (otherTeam.engineers.length < initialLength) {
                                 updateEffectiveBISDisplay(otherIdx); // Update other team's displayed BIS
                             }
                         }
                     });
                    // Add engineer to current team if not already present
                    if (!currentTeam.engineers) currentTeam.engineers = [];
                    if (!currentTeam.engineers.some(eng => eng.name === movedEngineerName)) {
                        currentTeam.engineers.push({ name: movedEngineerName, level: engineerLevel }); // Use found/default level
                        console.log(`Added ${movedEngineerName} to team ${currentTeam.teamId}`);
                    }
                 } else { // Remove from current team
                     if (currentTeam.engineers) {
                        currentTeam.engineers = currentTeam.engineers.filter(eng => eng.name !== movedEngineerName);
                        console.log(`Removed ${movedEngineerName} from team ${currentTeam.teamId}`);
                     }
                 }
                 // Update Effective BIS display for the current team
                 updateEffectiveBISDisplay(contextIndex);
                 // Refresh available lists for *all* team editors after moving an engineer
                 refreshAllAvailableEngineerLists();

            },
            true, false, '', null // multiSelectLeft = true, allowAddNew = false for engineers
        );
        engineerContainer.id = `engineersList_${index}`; teamDetails.appendChild(engineerContainer);
        // --- End Engineers ---

        // *** NEW: Away-Team Management Section ***
        let awayTeamSection = document.createElement('div');
        awayTeamSection.style.marginTop = '15px';
        awayTeamSection.style.padding = '10px';
        awayTeamSection.style.border = '1px solid #add8e6'; // Light blue border
        awayTeamSection.style.backgroundColor = '#f0f8ff'; // Alice blue background

        let awayTeamTitle = document.createElement('h5');
        awayTeamTitle.innerText = 'Away-Team Members';
        awayTeamSection.appendChild(awayTeamTitle);

        // Container to display current away-team members
        let awayMemberListDiv = document.createElement('div');
        awayMemberListDiv.id = `awayMemberList_${index}`;
        awayMemberListDiv.style.marginBottom = '10px';
        awayMemberListDiv.style.maxHeight = '150px'; // Prevent excessive height
        awayMemberListDiv.style.overflowY = 'auto'; // Add scroll if needed
        awayMemberListDiv.style.border = '1px solid #ccc';
        awayMemberListDiv.style.padding = '5px';
        awayTeamSection.appendChild(awayMemberListDiv);
        // Initial population of the list happens later in displayAwayTeamMembers

        // Form to add new away-team members
        let addAwayForm = document.createElement('div');
        addAwayForm.style.marginTop = '10px';
        addAwayForm.innerHTML = `
            <label for="newAwayName_${index}" style="margin-right: 5px;">Name:</label>
            <input type="text" id="newAwayName_${index}" placeholder="Away Member Name" style="width: 150px; margin-right: 10px;">
            <label for="newAwayLevel_${index}" style="margin-right: 5px;">Level:</label>
            <input type="number" id="newAwayLevel_${index}" min="1" max="5" placeholder="1-5" style="width: 50px; margin-right: 10px;">
            <label for="newAwaySource_${index}" style="margin-right: 5px;">Source:</label>
            <input type="text" id="newAwaySource_${index}" placeholder="Source Team/Org" style="width: 150px; margin-right: 10px;">
            <button type="button" id="addAwayBtn_${index}">Add Away Member</button>
        `;
        awayTeamSection.appendChild(addAwayForm);

        teamDetails.appendChild(awayTeamSection);
        teamDetails.appendChild(document.createElement('br'));

        // Attach event listener to the 'Add Away Member' button
        // Need to do this *after* the button is added to the DOM
         setTimeout(() => { // Use setTimeout to ensure element exists
            const addBtn = document.getElementById(`addAwayBtn_${index}`);
            if (addBtn) {
                 addBtn.onclick = () => handleAddAwayTeamMember(index);
             } else {
                 console.warn(`Could not find Add Away button for team index ${index}`);
             }
             // Initial population of the away team list display
             displayAwayTeamMembers(team.awayTeamMembers || [], index);
         }, 0);
        // *** END Away-Team Section ***


        // --- Action Buttons (Save/Delete Team) - No Change ---
        let actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.style.marginTop = '15px';
        let saveButton = document.createElement('button'); 
        saveButton.type = 'button'; 
        saveButton.className = 'btn-primary'; // Added class for styling
        saveButton.innerText = 'Save Team Changes'; 
        saveButton.onclick = () => saveTeamChanges(index); 
        actionButtonsDiv.appendChild(saveButton);
        
        let deleteButton = document.createElement('button'); 
        deleteButton.type = 'button'; 
        deleteButton.className = 'btn-danger'; // Added class for styling
        deleteButton.innerText = 'Delete Team'; 
        deleteButton.style.marginLeft = '10px'; 
        /* deleteButton.style.color = 'red'; */
        deleteButton.onclick = () => deleteTeam(index); 
        actionButtonsDiv.appendChild(deleteButton);
        teamDetails.appendChild(actionButtonsDiv);
        // --- End Actions ---

        teamDiv.appendChild(teamHeader);
        teamDiv.appendChild(teamDetails);
        teamsDiv.appendChild(teamDiv);
    }); // End teams.forEach
} // --- End displayTeamsForEditing ---

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

 /** Helper to refresh available engineer lists in all open team edit sections */
function refreshAllAvailableEngineerLists() {
     console.log("Refreshing all available engineer lists...");
     const allTeamEditDivs = document.querySelectorAll('#teamsManagement .team-edit');
     let allEngineerNamesMap = new Map(); // Recalculate global map
     (currentSystemData.teams || []).forEach(t => { (t.engineers || []).forEach(eng => { if (eng?.name) allEngineerNamesMap.set(eng.name, t.teamId); }); });

     allTeamEditDivs.forEach((teamDiv, index) => {
         // Only refresh if the details are potentially visible (no easy way to know for sure without checking style)
         // This is a simplification; ideally, only refresh *actually* visible ones.
         const teamData = currentSystemData.teams[index]; // Assuming render index matches data index
         if (!teamData) return;

         const availableEngineersSelect = teamDiv.querySelector('select[data-field="availableEngineers"]');
         const currentEngineersSelect = teamDiv.querySelector('select[data-field="currentEngineers"]');

         if (availableEngineersSelect && currentEngineersSelect) {
             const currentTeamEngineers = Array.from(currentEngineersSelect.options).map(opt => opt.value);
             availableEngineersSelect.innerHTML = ''; // Clear current options
             Array.from(allEngineerNamesMap.keys())
                 .filter(name => !currentTeamEngineers.includes(name)) // Filter out engineers already in the current list
                 .forEach(name => {
                     availableEngineersSelect.appendChild(new Option(name, name));
                 });
         }
     });
}

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
function addNewTeam() {
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
        pmtId: null  // No default PMT assigned
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
}

/** Delete Team **/

function deleteTeam(index) {
    const team = currentSystemData.teams[index];
    const confirmDelete = confirm(`Are you sure you want to delete the team "${team.teamName}"? This action cannot be undone.`);
    if (confirmDelete) {
        // Remove the team from currentSystemData.teams
        currentSystemData.teams.splice(index, 1);

        // Update services that reference this team
        currentSystemData.services.forEach(service => {
            if (service.owningTeamId === team.teamId) {
                service.owningTeamId = null;
            }
        });

        // Update uniqueEngineers array
        uniqueEngineers = uniqueEngineers.filter(engineer => engineer.teamId !== team.teamId);

        // Update team assignments in engineers
        currentSystemData.teams.forEach(t => {
            if (t.teamId !== team.teamId) {
                const engineers = t.engineerNames ? t.engineerNames.split(',').map(name => name.trim()) : [];
                t.engineerNames = engineers.filter(name => {
                    const engineer = uniqueEngineers.find(e => e.engineerName === name);
                    return engineer && engineer.teamId === t.teamId;
                }).join(', ');
            }
        });

        // Save changes to local storage
        saveSystemChanges();
        
        // Notify the user
        alert(`Team "${team.teamName}" has been deleted.`);

        // Refresh the teams editing interface
        displayTeamsForEditing(currentSystemData.teams);

        // Update other UI components
        generateTeamTable(currentSystemData);
        generateTeamVisualization(currentSystemData);
        generateServiceDependenciesTable();
        populateServiceSelection();
        populateDependencyServiceSelection();
        updateServiceVisualization();
        updateDependencyVisualization();
    }
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

