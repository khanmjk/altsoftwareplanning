/**
 * TeamEditComponent
 * Encapsulates the logic for rendering and managing the Team Edit list.
 */
class TeamEditComponent {
    constructor(containerId, systemData) {
        this.containerId = containerId;
        this.systemData = systemData;
        this.expandedIndex = -1;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`TeamEditComponent: Container '${this.containerId}' not found.`);
            return;
        }
        container.innerHTML = '';
        container.className = 'team-edit-list';

        if (!this.systemData.teams) {
            this.systemData.teams = [];
        }

        // Ensure allKnownEngineers exists
        if (!this.systemData.allKnownEngineers || !Array.isArray(this.systemData.allKnownEngineers)) {
            this.systemData.allKnownEngineers = [];
        }

        this.systemData.teams.forEach((team, index) => {
            if (!team) return;
            container.appendChild(this._createTeamItem(team, index));
        });
    }

    _createTeamItem(team, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'team-edit-item';
        itemDiv.setAttribute('data-team-id', team.teamId);

        // Header
        const header = document.createElement('div');
        header.className = 'team-edit-header';

        const indicator = document.createElement('span');
        indicator.className = 'team-edit-indicator';
        indicator.innerText = (index === this.expandedIndex) ? '- ' : '+ ';

        const titleText = document.createElement('span');
        titleText.innerText = `Team: ${team.teamIdentity || team.teamName || `Team (${team.teamId.slice(-4)})`}`;

        header.appendChild(indicator);
        header.appendChild(titleText);

        // Details Container
        const details = document.createElement('div');
        details.className = 'team-edit-details';
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
                // Collapse others
                document.querySelectorAll('.team-edit-details').forEach(el => el.classList.remove('expanded'));
                document.querySelectorAll('.team-edit-indicator').forEach(el => el.innerText = '+ ');

                details.classList.add('expanded');
                indicator.innerText = '- ';
                this.expandedIndex = index;

                // Refresh dynamic sections
                this._refreshDynamicSections(details, team, index);
            }
        };

        // --- Content Generation ---

        // Basic Info
        details.appendChild(this._createFormGroup('Team Identity:', 'input', 'teamIdentity', team.teamIdentity, index));
        details.appendChild(this._createFormGroup('Team Name:', 'input', 'teamName', team.teamName, index));
        details.appendChild(this._createFormGroup('Team Description:', 'textarea', 'teamDescription', team.teamDescription, index));

        // Services Owned (Collapsible)
        details.appendChild(this._createCollapsibleSection('Services Owned', this._createServicesOwnedContent(team, index)));

        // SDM Assignment (Collapsible)
        details.appendChild(this._createCollapsibleSection('SDM Assignment', this._createSdmAssignmentContent(team, index)));

        // PMT Assignment (Collapsible)
        details.appendChild(this._createCollapsibleSection('PMT Assignment', this._createPmtAssignmentContent(team, index)));

        // Headcount & BIS
        details.appendChild(this._createFormGroup('Finance Approved Funding:', 'number', 'fundedHeadcount', team.fundedHeadcount, index));

        const currentEffectiveBIS = (team.engineers?.length || 0) + (team.awayTeamMembers?.length || 0);
        const bisGroup = this._createFormGroup('Effective BIS:', 'text', 'effectiveBIS', currentEffectiveBIS, index, true); // Read-only
        bisGroup.querySelector('input').id = `effectiveBIS_${index}`;
        details.appendChild(bisGroup);

        // Engineers (Collapsible)
        details.appendChild(this._createCollapsibleSection('Team Engineer Assignment', this._createEngineersContent(team, index)));

        // Away Team (Collapsible)
        details.appendChild(this._createCollapsibleSection('Away-Team Members', this._createAwayTeamContent(team, index)));

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'team-edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.innerText = 'Save Team Changes';
        saveBtn.onclick = () => this._saveTeamChanges(index);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerText = 'Delete Team';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.onclick = () => this._deleteTeam(index);

        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(deleteBtn);
        details.appendChild(actionsDiv);

        itemDiv.appendChild(header);
        itemDiv.appendChild(details);

        return itemDiv;
    }

    _createCollapsibleSection(titleText, contentNode) {
        const section = document.createElement('div');
        section.className = 'team-edit-section';

        const header = document.createElement('div');
        header.className = 'team-edit-section-header';

        const indicator = document.createElement('span');
        indicator.className = 'team-edit-indicator';
        indicator.innerText = '+ '; // Default collapsed

        const title = document.createElement('h5');
        title.className = 'team-edit-section-title';
        title.innerText = titleText;

        header.appendChild(indicator);
        header.appendChild(title);

        const content = document.createElement('div');
        content.className = 'team-edit-section-content';
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

    _createFormGroup(labelText, inputType, fieldName, value, index, readOnly = false) {
        const group = document.createElement('div');
        group.className = 'team-edit-form-group';

        const label = document.createElement('label');
        label.className = 'team-edit-label';
        label.innerText = labelText;

        let input;
        if (inputType === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'team-edit-textarea';
            input.rows = 2;
        } else {
            input = document.createElement('input');
            input.className = 'team-edit-input';
            input.type = inputType;
        }

        input.value = value || (inputType === 'number' ? 0 : '');
        input.setAttribute('data-team-index', index);
        input.setAttribute('data-field', fieldName);
        if (readOnly) input.readOnly = true;

        input.addEventListener('change', (e) => {
            if (!readOnly && this.systemData.teams[index]) {
                this.systemData.teams[index][fieldName] = e.target.value;
                if (fieldName === 'teamIdentity' || fieldName === 'teamName') {
                    const headerTitle = e.target.closest('.team-edit-item').querySelector('.team-edit-header span:last-child');
                    const t = this.systemData.teams[index];
                    if (headerTitle) headerTitle.innerText = `Team: ${t.teamIdentity || t.teamName || 'New Team'}`;
                }
            }
        });

        group.appendChild(label);
        group.appendChild(input);
        return group;
    }

    _createServicesOwnedContent(team, index) {
        const wrapper = document.createElement('div');

        const allServices = (this.systemData.services || []).map(service => ({ value: service.serviceName, text: service.serviceName, owningTeamId: service.owningTeamId || null }));
        const currentServicesForTeam = (team.teamId && allServices.filter(s => s.owningTeamId === team.teamId)) || [];
        const availableServicesForTeam = allServices.filter(s => !s.owningTeamId || s.owningTeamId === null);

        const container = createDualListContainer(
            index, 'Services Owned:', 'Available Unowned Services:',
            currentServicesForTeam.map(s => ({ value: s.value, text: s.text })),
            availableServicesForTeam.map(s => ({ value: s.value, text: s.text })),
            'currentServices', 'availableServices',
            (movedServiceValue, direction, currentTeamIndexCallback) => {
                const serviceToUpdate = this.systemData.services.find(s => s.serviceName === movedServiceValue);
                const targetTeamForService = this.systemData.teams[currentTeamIndexCallback];
                if (serviceToUpdate && targetTeamForService) {
                    if (direction === 'add') serviceToUpdate.owningTeamId = targetTeamForService.teamId;
                    else serviceToUpdate.owningTeamId = null;
                    // We might need to refresh other teams if we steal a service, but for now just re-render this one if needed
                    // Ideally we'd trigger a full re-render or smart update
                }
            }
        );
        wrapper.appendChild(container);
        return wrapper;
    }

    _createSdmAssignmentContent(team, index) {
        const sdmSection = document.createElement('div');
        sdmSection.id = `sdmSection_${index}`;

        const sdmContainer = this._createSdmDualList(team, index, sdmSection);
        sdmSection.appendChild(sdmContainer);

        // Sr Mgr Container (Placeholder, populated by displaySeniorManagerAssignment)
        const srMgrContainer = document.createElement('div');
        srMgrContainer.id = `srMgrAssignmentContainer_${index}`;
        srMgrContainer.style.marginTop = '10px';
        sdmSection.appendChild(srMgrContainer);

        return sdmSection;
    }

    _createSdmDualList(team, index, sdmSection) {
        const allSdms = this.systemData.sdms || [];
        const currentSdm = allSdms.find(sdm => sdm && sdm.sdmId === team.sdmId);

        return createDualListContainer(
            index, 'Current SDM:', 'Available SDMs:',
            currentSdm ? [{ value: currentSdm.sdmId, text: currentSdm.sdmName }] : [],
            allSdms.filter(sdm => sdm && (!team.sdmId || sdm.sdmId !== team.sdmId)).map(s => ({ value: s.sdmId, text: s.sdmName })),
            'currentSdm', 'availableSdms',
            (movedSdmId, directionCallback, teamIndexCallback) => {
                const targetTeam = this.systemData.teams[teamIndexCallback];
                if (targetTeam) {
                    targetTeam.sdmId = (directionCallback === 'add') ? movedSdmId : null;
                    displaySeniorManagerAssignment(sdmSection, teamIndexCallback, targetTeam.sdmId);
                }
            }, false, true, 'Enter New SDM Name',
            (newSdmNameInput) => {
                if (!newSdmNameInput || newSdmNameInput.trim() === '') return null;
                newSdmNameInput = newSdmNameInput.trim();
                if ((this.systemData.sdms || []).some(s => s && s.sdmName.toLowerCase() === newSdmNameInput.toLowerCase())) {
                    notificationManager.showToast(`SDM "${newSdmNameInput}" already exists.`, 'warning'); return { preventAdd: true };
                }
                const newSdmObject = { sdmId: 'sdm-' + Date.now(), sdmName: newSdmNameInput, seniorManagerId: null };
                if (!this.systemData.sdms) this.systemData.sdms = [];
                this.systemData.sdms.push(newSdmObject);
                // We should refresh the list here, but createDualListContainer handles the UI add. 
                // We just need to ensure data consistency.
                return { value: newSdmObject.sdmId, text: newSdmObject.sdmName };
            }
        );
    }

    _createPmtAssignmentContent(team, index) {
        const pmtSection = document.createElement('div');
        pmtSection.appendChild(this._createPmtDualList(team, index));
        return pmtSection;
    }

    _createPmtDualList(team, index) {
        const allPmts = this.systemData.pmts || [];
        const currentPmt = allPmts.find(pmt => pmt && pmt.pmtId === team.pmtId);

        return createDualListContainer(
            index, 'Current PMT:', 'Available PMTs:',
            currentPmt ? [{ value: currentPmt.pmtId, text: currentPmt.pmtName }] : [],
            allPmts.filter(pmt => pmt && (!team.pmtId || pmt.pmtId !== team.pmtId)).map(p => ({ value: p.pmtId, text: p.pmtName })),
            'currentPmt', 'availablePmts',
            (movedPmtId, directionCallback, teamIndexCallback) => {
                const targetTeam = this.systemData.teams[teamIndexCallback];
                if (targetTeam) targetTeam.pmtId = (directionCallback === 'add') ? movedPmtId : null;
            }, false, true, 'Enter New PMT Name',
            (newPmtNameInput) => {
                if (!newPmtNameInput || newPmtNameInput.trim() === '') return null;
                newPmtNameInput = newPmtNameInput.trim();
                if ((this.systemData.pmts || []).some(p => p && p.pmtName.toLowerCase() === newPmtNameInput.toLowerCase())) {
                    notificationManager.showToast(`PMT "${newPmtNameInput}" already exists.`, 'warning'); return { preventAdd: true };
                }
                const newPmtObject = { pmtId: 'pmt-' + Date.now(), pmtName: newPmtNameInput };
                if (!this.systemData.pmts) this.systemData.pmts = [];
                this.systemData.pmts.push(newPmtObject);
                return { value: newPmtObject.pmtId, text: newPmtObject.pmtName };
            }
        );
    }

    _createEngineersContent(team, index) {
        return this._createEngineersDualList(team, index);
    }

    _createEngineersDualList(team, index) {
        const currentEngineerOptions = (team.engineers || []).map(engineerName => {
            const engDetails = (this.systemData.allKnownEngineers || []).find(e => e.name === engineerName);
            return {
                value: engineerName,
                text: `${engineerName} (L${engDetails ? engDetails.level : '?'})${engDetails?.attributes?.isAISWE ? ' [AI]' : ''}`
            };
        });

        const availableEngineerOptions = (this.systemData.allKnownEngineers || [])
            .filter(knownEng => !(team.engineers || []).includes(knownEng.name))
            .map(knownEng => {
                let teamContext = "Unallocated";
                if (knownEng.currentTeamId) {
                    const assignedTeam = (this.systemData.teams || []).find(t => t.teamId === knownEng.currentTeamId);
                    teamContext = assignedTeam ? (assignedTeam.teamIdentity || assignedTeam.teamName) : `Assigned Elsewhere (${knownEng.currentTeamId.slice(-4)})`;
                }
                return {
                    value: knownEng.name,
                    text: `${knownEng.name} (L${knownEng.level ?? '?'})${knownEng.attributes?.isAISWE ? ' [AI]' : ''} - (${teamContext})`
                };
            });

        const container = createDualListContainer(
            index, 'Current Engineers:', 'Available Engineers (System Pool):',
            currentEngineerOptions, availableEngineerOptions,
            'currentTeamEngineersList', 'availableSystemEngineersList',
            (movedEngineerName, direction, currentTeamEditIndex) => {
                const targetTeam = this.systemData.teams[currentTeamEditIndex];
                if (!targetTeam) return;
                if (!Array.isArray(targetTeam.engineers)) targetTeam.engineers = [];

                const engineerGlobal = (this.systemData.allKnownEngineers || []).find(ke => ke.name === movedEngineerName);
                if (!engineerGlobal) return;

                const oldTeamIdForEngineer = engineerGlobal.currentTeamId;

                if (direction === 'add') {
                    if (oldTeamIdForEngineer && oldTeamIdForEngineer !== targetTeam.teamId) {
                        const oldTeamObject = (this.systemData.teams || []).find(t => t.teamId === oldTeamIdForEngineer);
                        if (oldTeamObject && Array.isArray(oldTeamObject.engineers)) {
                            oldTeamObject.engineers = oldTeamObject.engineers.filter(name => name !== movedEngineerName);
                        }
                    }
                    if (!targetTeam.engineers.includes(movedEngineerName)) {
                        targetTeam.engineers.push(movedEngineerName);
                    }
                    engineerGlobal.currentTeamId = targetTeam.teamId;
                } else {
                    targetTeam.engineers = targetTeam.engineers.filter(name => name !== movedEngineerName);
                    if (engineerGlobal.currentTeamId === targetTeam.teamId) {
                        engineerGlobal.currentTeamId = null;
                    }
                }
                // Update BIS display
                this._updateEffectiveBIS(currentTeamEditIndex);
            },
            true, true, 'Enter New Engineer Name',
            async (newEngineerNameInput) => {
                // This async callback logic matches the original editSystem.js
                // Note: Since this is a callback passed to createDualListContainer, 
                // we assume createDualListContainer handles the async nature if implemented correctly.
                // If not, we might need to adjust. The original code used async here.

                if (!newEngineerNameInput || newEngineerNameInput.trim() === '') {
                    notificationManager.showToast("Engineer name cannot be empty.", 'warning'); return null;
                }
                const name = newEngineerNameInput.trim();
                if ((this.systemData.allKnownEngineers || []).some(eng => eng.name.toLowerCase() === name.toLowerCase())) {
                    notificationManager.showToast(`An engineer named "${name}" already exists.`, 'warning');
                    return { preventAdd: true };
                }

                // We need to use prompt/confirm here. 
                // Since this is a component, we rely on notificationManager being available globally.
                const levelStr = await notificationManager.prompt(`Enter level (1-7) for "${name}":`, "1", "Engineer Level");
                if (levelStr === null) return null;
                const level = parseInt(levelStr) || 1;

                const yearsStr = await notificationManager.prompt(`Enter years of experience for "${name}":`, "0", "Experience");
                if (yearsStr === null) return null;
                const yearsOfExperience = parseInt(yearsStr) || 0;

                const skillsStr = await notificationManager.prompt(`Enter skills for "${name}" (comma-separated):`, "", "Skills");
                const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(s => s) : [];

                let isAIInput = await notificationManager.prompt(`Is "${name}" an AI Software Engineer? (Yes/No)`, "No", "AI Engineer?");
                if (isAIInput === null) return null;
                const isAISWE = isAIInput.trim().toLowerCase() === 'yes';

                let aiAgentType = null;
                if (isAISWE) {
                    const typeStr = await notificationManager.prompt(`Enter AI Agent Type for "${name}":`, "General AI", "AI Agent Type");
                    if (typeStr === null) return null;
                    aiAgentType = typeStr.trim() || "General AI";
                }

                const newEngineerData = {
                    name, level, currentTeamId: null,
                    attributes: { isAISWE, aiAgentType, skills, yearsOfExperience }
                };

                if (!this.systemData.allKnownEngineers) this.systemData.allKnownEngineers = [];
                this.systemData.allKnownEngineers.push(newEngineerData);

                return { value: newEngineerData.name, text: `${newEngineerData.name} (L${newEngineerData.level})${newEngineerData.attributes.isAISWE ? ' [AI]' : ''} - (Unallocated)` };
            }
        );
        return container;
    }

    _createAwayTeamContent(team, index) {
        const section = document.createElement('div');

        const listDiv = document.createElement('div');
        listDiv.className = 'away-team-list';
        listDiv.id = `awayMemberList_${index}`;

        if (team.awayTeamMembers && team.awayTeamMembers.length > 0) {
            team.awayTeamMembers.forEach((member, memberIndex) => {
                const item = document.createElement('div');
                item.className = 'away-team-item';

                const info = document.createElement('span');
                info.textContent = `${member.name} (L${member.level}) - ${member.sourceTeam}`;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-danger';
                removeBtn.textContent = 'Remove';
                removeBtn.onclick = () => this._removeAwayMember(index, memberIndex);

                item.appendChild(info);
                item.appendChild(removeBtn);
                listDiv.appendChild(item);
            });
        } else {
            listDiv.innerHTML = '<em style="color: #999; padding: 5px;">No away-team members assigned.</em>';
        }
        section.appendChild(listDiv);

        // Add New Form
        const form = document.createElement('div');
        form.className = 'team-edit-form-group';
        form.style.display = 'flex';
        form.style.gap = '10px';
        form.style.alignItems = 'flex-end';
        form.innerHTML = `
            <div style="flex: 2;">
                <label class="team-edit-label">Name</label>
                <input type="text" id="newAwayName_${index}" class="team-edit-input" placeholder="Name">
            </div>
            <div style="flex: 1;">
                <label class="team-edit-label">Level</label>
                <input type="number" id="newAwayLevel_${index}" class="team-edit-input" min="1" max="7" placeholder="Lvl">
            </div>
            <div style="flex: 2;">
                <label class="team-edit-label">Source</label>
                <input type="text" id="newAwaySource_${index}" class="team-edit-input" placeholder="Source Team">
            </div>
            <button type="button" id="addAwayBtn_${index}" class="btn btn-secondary">Add</button>
        `;
        section.appendChild(form);

        // Bind click event after appending
        setTimeout(() => {
            const btn = section.querySelector(`#addAwayBtn_${index}`);
            if (btn) btn.onclick = () => this._addAwayMember(index);
        }, 0);

        return section;
    }

    _addAwayMember(teamIndex) {
        const nameInput = document.getElementById(`newAwayName_${teamIndex}`);
        const levelInput = document.getElementById(`newAwayLevel_${teamIndex}`);
        const sourceInput = document.getElementById(`newAwaySource_${teamIndex}`);

        const name = nameInput?.value.trim();
        const level = parseInt(levelInput?.value);
        const sourceTeam = sourceInput?.value.trim();

        if (!name || isNaN(level) || !sourceTeam) {
            notificationManager.showToast('Please fill all fields for away member.', 'warning');
            return;
        }

        const team = this.systemData.teams[teamIndex];
        if (!team.awayTeamMembers) team.awayTeamMembers = [];

        team.awayTeamMembers.push({ name, level, sourceTeam });

        // Refresh just this section or re-render
        this.expandedIndex = teamIndex;
        this.render();
    }

    _removeAwayMember(teamIndex, memberIndex) {
        this.systemData.teams[teamIndex].awayTeamMembers.splice(memberIndex, 1);
        this.expandedIndex = teamIndex;
        this.render();
    }

    _updateEffectiveBIS(teamIndex) {
        const team = this.systemData.teams[teamIndex];
        if (!team) return;
        const count = (team.engineers?.length || 0) + (team.awayTeamMembers?.length || 0);
        const input = document.getElementById(`effectiveBIS_${teamIndex}`);
        if (input) input.value = count;
    }

    _refreshDynamicSections(details, team, index) {
        // Trigger SDM Sr Mgr display
        const sdmSection = details.querySelector(`#sdmSection_${index}`);
        if (sdmSection) {
            displaySeniorManagerAssignment(sdmSection, index, team.sdmId);
        }
        // Update BIS
        this._updateEffectiveBIS(index);
    }

    async _deleteTeam(index) {
        if (await notificationManager.confirm('Are you sure you want to delete this team?', 'Delete Team', { confirmStyle: 'danger' })) {
            const team = this.systemData.teams[index];
            const teamId = team.teamId;

            this.systemData.teams.splice(index, 1);

            // Cleanup references
            (this.systemData.services || []).forEach(s => {
                if (s.owningTeamId === teamId) s.owningTeamId = null;
            });

            if (this.systemData.allKnownEngineers) {
                this.systemData.allKnownEngineers.forEach(e => {
                    if (e.currentTeamId === teamId) e.currentTeamId = null;
                });
            }

            // Global updates
            generateTeamTable(this.systemData);
            generateTeamVisualization(this.systemData);

            this.render();
        }
    }

    _saveTeamChanges(index) {
        const team = this.systemData.teams[index];
        if (!team.teamIdentity || !team.teamName) {
            notificationManager.showToast('Team Identity and Name are required.', 'warning');
            return;
        }

        // Validate Engineer Assignments (Global function check)
        if (!validateEngineerAssignments()) {
            return;
        }

        systemRepository.saveSystem(this.systemData.systemName, this.systemData);
        notificationManager.showToast('Team changes saved.', 'success');

        generateTeamTable(this.systemData);
        generateTeamVisualization(this.systemData);
    }
}
