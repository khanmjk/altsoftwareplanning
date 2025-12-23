/**
 * ServiceEditComponent
 * Encapsulates the logic for rendering and managing the Service Edit list.
 */
class ServiceEditComponent {
    constructor(containerId, systemData) {
        this.containerId = containerId;
        this.systemData = systemData;
        this.expandedIndex = -1;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`ServiceEditComponent: Container '${this.containerId}' not found.`);
            return;
        }
        this._clearElement(container);
        container.className = 'service-edit-list';

        if (!this.systemData.services) {
            this.systemData.services = [];
        }

        this.systemData.services.forEach((service, index) => {
            if (!service) return;
            container.appendChild(this._createServiceItem(service, index));
        });
    }

    _createServiceItem(service, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'service-edit-item';
        itemDiv.setAttribute('data-service-index', index);

        // Header
        const header = document.createElement('div');
        header.className = 'service-edit-header';

        const indicator = document.createElement('span');
        indicator.className = 'service-edit-indicator';
        indicator.innerText = (index === this.expandedIndex) ? '- ' : '+ ';

        const titleText = document.createElement('span');
        titleText.innerText = `Service: ${service.serviceName || 'New Service'}`;

        header.appendChild(indicator);
        header.appendChild(titleText);

        // Details Container
        const details = document.createElement('div');
        details.className = 'service-edit-details';
        if (index === this.expandedIndex) {
            details.classList.add('expanded');
        }

        // Toggle Logic
        header.onclick = () => {
            const isExpanded = details.classList.contains('expanded');

            if (isExpanded) {
                details.classList.remove('expanded');
                indicator.innerText = '+ ';
                this.expandedIndex = -1;
            } else {
                details.classList.add('expanded');
                indicator.innerText = '- ';
                this.expandedIndex = index;
                this._refreshListsOnExpand(details, service);
            }
        };

        // --- Content Generation ---

        // Service Name
        details.appendChild(this._createFormGroup('Service Name:', 'input', 'serviceName', service.serviceName, index));

        // Service Description
        details.appendChild(this._createFormGroup('Service Description:', 'textarea', 'serviceDescription', service.serviceDescription, index));

        // Platform Dependencies (Collapsible)
        details.appendChild(this._createCollapsibleSection('Platform Dependencies', this._createPlatformDependenciesContent(service, index)));

        // Service Dependencies (Collapsible)
        details.appendChild(this._createCollapsibleSection('Service Dependencies', this._createServiceDependenciesContent(service, index)));

        // APIs Section (Collapsible)
        details.appendChild(this._createCollapsibleSection('APIs', this._createApisContent(service, index)));

        // Action Buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'service-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.innerText = 'Save Service Changes';
        saveBtn.onclick = () => this._saveServiceChanges(index);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerText = 'Delete Service';
        deleteBtn.onclick = () => this._deleteService(index);

        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(deleteBtn);
        details.appendChild(actionsDiv);

        itemDiv.appendChild(header);
        itemDiv.appendChild(details);

        return itemDiv;
    }

    _createCollapsibleSection(titleText, contentNode) {
        const section = document.createElement('div');
        section.className = 'service-edit-section';

        const header = document.createElement('div');
        header.className = 'service-edit-section-header';

        const indicator = document.createElement('span');
        indicator.className = 'service-edit-indicator';
        indicator.innerText = '+ '; // Default collapsed

        const title = document.createElement('h5');
        title.className = 'service-edit-section-title';
        title.innerText = titleText;

        header.appendChild(indicator);
        header.appendChild(title);

        const content = document.createElement('div');
        content.className = 'service-edit-section-content';
        content.appendChild(contentNode);

        header.onclick = () => {
            const isExpanded = content.classList.contains('expanded');
            if (isExpanded) {
                content.classList.remove('expanded');
                indicator.innerText = '+ ';
            } else {
                content.classList.add('expanded');
                indicator.innerText = '- ';
            }
        };

        section.appendChild(header);
        section.appendChild(content);
        return section;
    }

    _createFormGroup(labelText, inputType, fieldName, value, index) {
        const group = document.createElement('div');
        group.className = 'service-edit-form-group';

        const label = document.createElement('label');
        label.className = 'service-edit-label';
        label.innerText = labelText;

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'service-edit-textarea';
            input.rows = 2;
        } else {
            input = document.createElement('input');
            input.className = 'service-edit-input';
            input.type = 'text';
        }

        input.value = value || '';
        input.setAttribute('data-service-index', index);
        input.setAttribute('data-field', fieldName);

        input.addEventListener('change', (e) => {
            const val = e.target.value;
            if (this.systemData.services[index]) {
                this.systemData.services[index][fieldName] = val;

                if (fieldName === 'serviceName') {
                    const headerTitle = e.target.closest('.service-edit-item').querySelector('.service-edit-header span:last-child');
                    if (headerTitle) headerTitle.innerText = `Service: ${val || 'New Service'}`;
                }
            }
        });

        group.appendChild(label);
        group.appendChild(input);
        return group;
    }

    _createPlatformDependenciesContent(service, index) {
        const wrapper = document.createElement('div');

        const currentPlatDeps = (service.platformDependencies || []).map(dep => ({ value: dep, text: dep }));
        const availablePlatDeps = (this.systemData.platformDependencies || [])
            .filter(dep => !(service.platformDependencies || []).includes(dep))
            .map(dep => ({ value: dep, text: dep }));

        const container = new DualListSelector({
            contextIndex: index,
            leftLabel: 'Current Platform Deps:',
            rightLabel: 'Available Platform Deps:',
            currentOptions: currentPlatDeps,
            availableOptions: availablePlatDeps,
            leftField: 'currentPlatformDependencies',
            rightField: 'availablePlatformDependencies',
            moveCallback: (movedDep, direction, serviceIdx) => {
                const targetService = this.systemData.services[serviceIdx];
                if (!targetService.platformDependencies) targetService.platformDependencies = [];
                if (direction === 'add') {
                    if (!targetService.platformDependencies.includes(movedDep)) targetService.platformDependencies.push(movedDep);
                } else {
                    targetService.platformDependencies = targetService.platformDependencies.filter(d => d !== movedDep);
                }
            },
            multiSelectLeft: true,
            allowAddNew: true,
            addNewPlaceholder: 'Enter New Platform Dependency',
            addNewCallback: (newDepName) => this._addNewPlatformDependency(newDepName, index, container)
        }).render();

        wrapper.appendChild(container);
        return wrapper;
    }

    _addNewPlatformDependency(newDepName, index, container) {
        const textInput = container.querySelector('input[type="text"]');
        if (!newDepName || newDepName.trim() === '') {
            if (textInput) textInput.value = '';
            return null;
        }
        newDepName = newDepName.trim();

        if (!this.systemData.platformDependencies) this.systemData.platformDependencies = [];

        const alreadyExistsGlobally = this.systemData.platformDependencies.includes(newDepName);

        const currentSelect = container.querySelector('select[data-field="currentPlatformDependencies"]');
        const availableSelect = container.querySelector('select[data-field="availablePlatformDependencies"]');

        if (currentSelect && availableSelect) {
            const inCurrent = Array.from(currentSelect.options).some(opt => opt.value === newDepName);
            const inAvailable = Array.from(availableSelect.options).some(opt => opt.value === newDepName);
            if (inCurrent || inAvailable) {
                notificationManager.showToast(`Platform dependency "${newDepName}" is already listed.`, 'warning');
                if (textInput) textInput.value = '';
                return null;
            }
        }

        if (!alreadyExistsGlobally) {
            this.systemData.platformDependencies.push(newDepName);
        }

        if (textInput) textInput.value = '';
        return { value: newDepName, text: newDepName };
    }

    _createServiceDependenciesContent(service, index) {
        const wrapper = document.createElement('div');

        const currentSvcDeps = (service.serviceDependencies || []).map(dep => ({ value: dep, text: dep }));
        const availableSvcDeps = (this.systemData.services || [])
            .filter(s => s.serviceName !== service.serviceName && !(service.serviceDependencies || []).includes(s.serviceName))
            .map(s => ({ value: s.serviceName, text: s.serviceName }));

        const container = new DualListSelector({
            contextIndex: index,
            leftLabel: 'Current Service Deps:',
            rightLabel: 'Available Services:',
            currentOptions: currentSvcDeps,
            availableOptions: availableSvcDeps,
            leftField: 'currentServiceDependencies',
            rightField: 'availableServiceDependencies',
            moveCallback: (movedSvc, direction, serviceIdx) => {
                const targetService = this.systemData.services[serviceIdx];
                if (!targetService.serviceDependencies) targetService.serviceDependencies = [];
                if (direction === 'add') {
                    if (!targetService.serviceDependencies.includes(movedSvc)) targetService.serviceDependencies.push(movedSvc);
                } else {
                    targetService.serviceDependencies = targetService.serviceDependencies.filter(d => d !== movedSvc);
                }
            },
            multiSelectLeft: true
        }).render();

        wrapper.appendChild(container);
        return wrapper;
    }

    _createApisContent(service, index) {
        const container = document.createElement('div');

        (service.apis || []).forEach((api, apiIndex) => {
            container.appendChild(this._createApiItem(api, apiIndex, index));
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-secondary';
        addBtn.innerText = 'Add New API';
        addBtn.onclick = () => this._addNewApi(index);
        container.appendChild(addBtn);

        return container;
    }

    _createApiItem(api, apiIndex, serviceIndex) {
        const item = document.createElement('div');
        item.className = 'service-edit-api-item';

        // API Name
        const nameGroup = this._createApiFormGroup('API Name:', 'input', 'apiName', api.apiName, serviceIndex, apiIndex);
        item.appendChild(nameGroup);

        // API Description
        const descGroup = this._createApiFormGroup('API Description:', 'textarea', 'apiDescription', api.apiDescription, serviceIndex, apiIndex);
        item.appendChild(descGroup);

        // API Dependencies
        const allApisList = (this.systemData.services || []).flatMap(s => (s.apis || []).map(a => a.apiName));
        const currentApiDeps = (api.dependentApis || []).map(dep => ({ value: dep, text: dep }));
        const availableApiDeps = allApisList
            .filter(aName => aName !== api.apiName && !(api.dependentApis || []).includes(aName))
            .map(aName => ({ value: aName, text: aName }));

        const depsContainer = new DualListSelector({
            contextIndex: apiIndex,
            leftLabel: 'Current API Deps:',
            rightLabel: 'Available APIs:',
            currentOptions: currentApiDeps,
            availableOptions: availableApiDeps,
            leftField: 'currentDependentApis',
            rightField: 'availableApis',
            moveCallback: (movedApi, direction, currentApiIdx) => {
                const targetService = this.systemData.services[serviceIndex];
                const targetApi = targetService?.apis[currentApiIdx];
                if (targetApi) {
                    if (!targetApi.dependentApis) targetApi.dependentApis = [];
                    if (direction === 'add') {
                        if (!targetApi.dependentApis.includes(movedApi)) targetApi.dependentApis.push(movedApi);
                    } else {
                        targetApi.dependentApis = targetApi.dependentApis.filter(d => d !== movedApi);
                    }
                }
            },
            multiSelectLeft: true
        }).render();
        item.appendChild(depsContainer);

        // Delete API Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger service-edit-api-delete';
        deleteBtn.innerText = 'Delete API';
        deleteBtn.onclick = () => this._deleteApi(serviceIndex, apiIndex);
        item.appendChild(deleteBtn);

        return item;
    }

    _createApiFormGroup(labelText, inputType, fieldName, value, serviceIndex, apiIndex) {
        const group = document.createElement('div');
        group.className = 'service-edit-form-group';

        const label = document.createElement('label');
        label.className = 'service-edit-label';
        label.innerText = labelText;

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'service-edit-textarea';
            input.rows = 2;
        } else {
            input = document.createElement('input');
            input.className = 'service-edit-input';
            input.type = 'text';
        }

        input.value = value || '';
        input.addEventListener('change', (e) => {
            if (this.systemData.services[serviceIndex]?.apis[apiIndex]) {
                this.systemData.services[serviceIndex].apis[apiIndex][fieldName] = e.target.value;
            }
        });

        group.appendChild(label);
        group.appendChild(input);
        return group;
    }

    _refreshListsOnExpand(content, service) {
        // Refresh Platform Deps
        const otherPlatDepsSelect = content.querySelector('select[data-field="availablePlatformDependencies"]');
        const currentPlatDepsSelect = content.querySelector('select[data-field="currentPlatformDependencies"]');
        if (otherPlatDepsSelect && currentPlatDepsSelect) {
            const currentPlatDeps = Array.from(currentPlatDepsSelect.options).map(opt => opt.value);
            this._clearElement(otherPlatDepsSelect);
            (this.systemData.platformDependencies || []).forEach(dep => {
                if (!currentPlatDeps.includes(dep)) {
                    otherPlatDepsSelect.appendChild(new Option(dep, dep));
                }
            });
        }

        // Refresh Service Deps
        const otherSvcDepsSelect = content.querySelector('select[data-field="availableServiceDependencies"]');
        const currentSvcDepsSelect = content.querySelector('select[data-field="currentServiceDependencies"]');
        if (otherSvcDepsSelect && currentSvcDepsSelect) {
            const currentSvcDeps = Array.from(currentSvcDepsSelect.options).map(opt => opt.value);
            this._clearElement(otherSvcDepsSelect);
            (this.systemData.services || []).forEach(otherSvc => {
                if (otherSvc.serviceName !== service.serviceName && !currentSvcDeps.includes(otherSvc.serviceName)) {
                    otherSvcDepsSelect.appendChild(new Option(otherSvc.serviceName, otherSvc.serviceName));
                }
            });
        }

        // Refresh API Deps
        const apiEditDivs = content.querySelectorAll('.service-edit-api-item');
        const allApisList = (this.systemData.services || []).flatMap(s => (s.apis || []).map(a => a.apiName));
        apiEditDivs.forEach((apiDiv, apiIdx) => {
            const currentApiName = service.apis[apiIdx]?.apiName;
            const otherApiDepsSelect = apiDiv.querySelector('select[data-field="availableApis"]');
            const currentApiDepsSelect = apiDiv.querySelector('select[data-field="currentDependentApis"]');
            if (otherApiDepsSelect && currentApiDepsSelect && currentApiName) {
                const currentApiDeps = Array.from(currentApiDepsSelect.options).map(opt => opt.value);
                this._clearElement(otherApiDepsSelect);
                allApisList.forEach(apiName => {
                    if (apiName !== currentApiName && !currentApiDeps.includes(apiName)) {
                        otherApiDepsSelect.appendChild(new Option(apiName, apiName));
                    }
                });
            }
        });
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    _addNewApi(serviceIndex) {
        const service = this.systemData.services[serviceIndex];
        if (!service) return;

        const newApi = {
            apiName: 'New API ' + ((service.apis?.length || 0) + 1),
            apiDescription: '',
            dependentApis: []
        };

        if (!service.apis) service.apis = [];
        service.apis.push(newApi);

        this.expandedIndex = serviceIndex; // Keep expanded
        this.render();
    }

    _deleteApi(serviceIndex, apiIndex) {
        this.systemData.services[serviceIndex].apis.splice(apiIndex, 1);
        this.expandedIndex = serviceIndex; // Keep expanded
        this.render();
    }

    async _deleteService(index) {
        if (await notificationManager.confirm('Are you sure you want to delete this service?', 'Delete Service', { confirmStyle: 'danger' })) {
            this.systemData.services.splice(index, 1);

            this.render();
        }
    }

    _saveServiceChanges(index) {
        const service = this.systemData.services[index];
        if (!service.serviceName || service.serviceName.trim() === '') {
            notificationManager.showToast('Service name cannot be empty.', 'error');
            return;
        }

        // Note: Data binding handles most updates. 
        // We just need to ensure the dual lists are synced if they haven't been (though the callbacks handle that).
        // The original code re-read from DOM here. Since we use direct data binding in callbacks, 
        // we might not need to re-read everything, but let's be safe and trust the callbacks.

        SystemService.saveSystem(this.systemData);
        notificationManager.showToast('Service changes saved.', 'success');
    }
}
