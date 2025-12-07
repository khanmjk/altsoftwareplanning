/**
 * CapacityConfigurationView.js
 * 
 * Sub-view for configuring capacity parameters.
 * Handles Global Constraints (Working Days, Holidays) and Team Constraints (Leave, Overhead).
 */
class CapacityConfigurationView {
    constructor() {
        this.container = null;
    }

    render(container) {
        this.container = container;
        this.container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'capacity-configuration-view';

        // Header
        const header = document.createElement('h2');
        header.textContent = 'Capacity Configuration';
        header.className = 'capacity-config-header';
        wrapper.appendChild(header);

        // 1. Company Policy Leave (Organizational Defaults)
        this._createCollapsibleSection(
            '1. Company Policy Leave',
            'Set the baseline working days and standard leave types.',
            (content) => this._renderCompanyPolicy(content),
            wrapper
        );

        // 2. Divisional Events (Global Events)
        this._createCollapsibleSection(
            '2. Divisional Events',
            'Manage organization-wide events that affect all teams.',
            (content) => this._renderDivisionalEvents(content),
            wrapper
        );

        // 3. Team-Specific Adjustments
        this._createCollapsibleSection(
            '3. Team-Specific Adjustments',
            'Fine-tune capacity for individual teams based on their specific context.',
            (content) => this._renderTeamConstraints(content),
            wrapper
        );

        this.container.appendChild(wrapper);
    }

    _createCollapsibleSection(titleText, descText, contentRenderer, parent) {
        const section = document.createElement('div');
        section.className = 'capacity-collapsible-section';

        const header = document.createElement('div');
        header.className = 'capacity-collapsible-header';

        const titleGroup = document.createElement('div');

        const title = document.createElement('h3');
        title.className = 'capacity-section-title';
        title.textContent = titleText;
        titleGroup.appendChild(title);

        if (descText) {
            const desc = document.createElement('p');
            desc.className = 'capacity-section-desc';
            desc.textContent = descText;
            titleGroup.appendChild(desc);
        }
        header.appendChild(titleGroup);

        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down capacity-collapsible-icon';
        header.appendChild(icon);

        const body = document.createElement('div');
        body.className = 'capacity-collapsible-body';

        header.onclick = () => {
            const isHidden = body.style.display === 'none' || body.style.display === '';
            body.style.display = isHidden ? 'block' : 'none';
            header.classList.toggle('capacity-collapsible-header--active', isHidden);
        };

        section.appendChild(header);
        section.appendChild(body);
        parent.appendChild(section);

        // Render content immediately (or could be lazy loaded)
        contentRenderer(body);
    }

    _renderCompanyPolicy(container) {
        const config = SystemService.getCurrentSystem().capacityConfiguration;
        if (!config) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger';
            alert.textContent = 'Missing capacityConfiguration';
            container.appendChild(alert);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'capacity-config-grid';

        // Left Column: Basics
        const leftCol = document.createElement('div');

        // Working Days
        const wdGroup = this._createInputGroup('Standard Working Days / Year', 'number', config.workingDaysPerYear || 261, (val) => {
            config.workingDaysPerYear = parseInt(val);
        }, 'e.g., 261');
        leftCol.appendChild(wdGroup);

        // Public Holidays
        const phGroup = this._createInputGroup('Public Holidays (Days/Year)', 'number', config.globalConstraints?.publicHolidays || 0, (val) => {
            if (!config.globalConstraints) config.globalConstraints = {};
            config.globalConstraints.publicHolidays = parseInt(val);
        });
        leftCol.appendChild(phGroup);

        grid.appendChild(leftCol);

        // Right Column: Leave Types
        const rightCol = document.createElement('div');
        const leaveTitle = document.createElement('h4');
        leaveTitle.textContent = 'Standard Leave Types';
        leaveTitle.className = 'capacity-subsection-title';
        rightCol.appendChild(leaveTitle);

        const leaveTable = document.createElement('table');
        leaveTable.className = 'table table-sm table-bordered';

        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        const th1 = document.createElement('th'); th1.textContent = 'Type';
        const th2 = document.createElement('th'); th2.textContent = 'Default Days/SDE';
        tr.appendChild(th1); tr.appendChild(th2);
        thead.appendChild(tr);
        leaveTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        leaveTable.appendChild(tbody);

        rightCol.appendChild(leaveTable);
        this._renderLeaveTypesRows(tbody);

        grid.appendChild(rightCol);
        container.appendChild(grid);
    }

    _renderDivisionalEvents(container) {
        const config = SystemService.getCurrentSystem().capacityConfiguration;

        const orgEventsTable = document.createElement('table');
        orgEventsTable.className = 'table table-striped capacity-org-events-table';

        const orgThead = document.createElement('thead');
        const orgTr = document.createElement('tr');
        ['Event Name', 'Est. Days/SDE', 'Action'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            orgTr.appendChild(th);
        });
        orgThead.appendChild(orgTr);
        orgEventsTable.appendChild(orgThead);

        const orgEventsTbody = document.createElement('tbody');
        orgEventsTable.appendChild(orgEventsTbody);
        container.appendChild(orgEventsTable);

        this._renderOrgEventsRows(orgEventsTbody);

        const addEventBtn = document.createElement('button');
        addEventBtn.className = 'btn btn-outline-primary btn-sm';

        const icon = document.createElement('i');
        icon.className = 'fas fa-plus';
        addEventBtn.appendChild(icon);
        addEventBtn.appendChild(document.createTextNode(' Add Event'));

        addEventBtn.onclick = () => {
            if (!config.globalConstraints) config.globalConstraints = {};
            if (!config.globalConstraints.orgEvents) config.globalConstraints.orgEvents = [];
            config.globalConstraints.orgEvents.push({ name: 'New Event', estimatedDaysPerSDE: 0 });
            this._renderOrgEventsRows(orgEventsTbody);
        };
        container.appendChild(addEventBtn);
    }

    _createInputGroup(label, type, value, onChange, placeholder = '') {
        const div = document.createElement('div');
        div.className = 'capacity-form-group';

        const lbl = document.createElement('label');
        lbl.textContent = label;
        lbl.className = 'capacity-form-label';

        const input = document.createElement('input');
        input.type = type;
        input.className = 'form-control';
        input.value = value;
        input.placeholder = placeholder;
        input.onchange = (e) => onChange(e.target.value);

        div.appendChild(lbl);
        div.appendChild(input);
        return div;
    }

    _renderLeaveTypesRows(tbody) {
        tbody.innerHTML = '';
        const leaveTypes = SystemService.getCurrentSystem().capacityConfiguration?.leaveTypes || [];
        leaveTypes.forEach(lt => {
            const row = tbody.insertRow();
            row.insertCell().textContent = lt.name;
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-control form-control-sm';
            input.value = lt.defaultEstimatedDays || 0;
            input.onchange = (e) => lt.defaultEstimatedDays = parseFloat(e.target.value);
            row.insertCell().appendChild(input);
        });
    }

    _renderOrgEventsRows(tbody) {
        tbody.innerHTML = '';
        const events = SystemService.getCurrentSystem().capacityConfiguration?.globalConstraints?.orgEvents || [];
        events.forEach((event, index) => {
            const row = tbody.insertRow();

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'form-control form-control-sm';
            nameInput.value = event.name || '';
            nameInput.onchange = (e) => event.name = e.target.value;
            row.insertCell().appendChild(nameInput);

            const daysInput = document.createElement('input');
            daysInput.type = 'number';
            daysInput.className = 'form-control form-control-sm';
            daysInput.value = event.estimatedDaysPerSDE || 0;
            daysInput.onchange = (e) => event.estimatedDaysPerSDE = parseFloat(e.target.value);
            row.insertCell().appendChild(daysInput);

            const btn = document.createElement('button');
            btn.className = 'btn btn-danger btn-sm';

            const icon = document.createElement('i');
            icon.className = 'fas fa-trash';
            btn.appendChild(icon);

            btn.onclick = () => {
                events.splice(index, 1);
                this._renderOrgEventsRows(tbody);
            };
            row.insertCell().appendChild(btn);
        });
    }

    _renderTeamConstraints(parentContainer) {
        const teams = SystemService.getCurrentSystem().teams || [];

        // Accordion container
        const accordion = document.createElement('div');
        accordion.className = 'capacity-accordion';

        teams.forEach((team, index) => {
            const item = document.createElement('div');
            item.className = 'capacity-team-item';

            // Header
            const header = document.createElement('div');
            header.className = 'capacity-team-header';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'capacity-team-title';
            titleSpan.textContent = team.teamIdentity || team.teamName;
            header.appendChild(titleSpan);

            const icon = document.createElement('i');
            icon.className = 'fas fa-chevron-down capacity-team-icon';
            header.appendChild(icon);

            const body = document.createElement('div');
            body.className = 'capacity-team-body';

            header.onclick = () => {
                const isHidden = body.style.display === 'none' || body.style.display === '';
                body.style.display = isHidden ? 'block' : 'none';
                icon.className = isHidden ? 'fas fa-chevron-up capacity-team-icon' : 'fas fa-chevron-down capacity-team-icon';
                item.classList.toggle('capacity-team-item--active', isHidden);
            };

            item.appendChild(header);
            item.appendChild(body);
            accordion.appendChild(item);

            this._renderTeamDetails(body, team);
        });

        parentContainer.appendChild(accordion);
    }

    _renderTeamDetails(container, team) {
        // Ensure data structure
        if (!team.teamCapacityAdjustments) {
            team.teamCapacityAdjustments = {
                leaveUptakeEstimates: [],
                variableLeaveImpact: {},
                teamActivities: [],
                aiProductivityGainPercent: 0,
                engineerLeavePlans: {} // New Feature
            };
        }
        if (!team.teamCapacityAdjustments.engineerLeavePlans) {
            team.teamCapacityAdjustments.engineerLeavePlans = {};
        }

        const grid = document.createElement('div');
        grid.className = 'capacity-team-grid';

        // Left Column: Leave & Overhead
        const left = document.createElement('div');

        // Overhead
        left.appendChild(this._createInputGroup('Avg. Overhead (Hrs/Week/SDE)', 'number', team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE || 0, (val) => {
            team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE = parseFloat(val);
        }));

        // AI Gain
        left.appendChild(this._createInputGroup('AI Productivity Gain (%)', 'number', team.teamCapacityAdjustments.aiProductivityGainPercent || 0, (val) => {
            team.teamCapacityAdjustments.aiProductivityGainPercent = parseFloat(val);
        }));

        // Variable Leave
        const varTitle = document.createElement('h5');
        varTitle.textContent = 'Variable Leave (Maternity, etc.)';
        varTitle.className = 'capacity-subsection-title';
        left.appendChild(varTitle);

        const varGrid = document.createElement('div');
        varGrid.className = 'capacity-variable-leave-grid';

        // Headers
        ['Category', 'Affected SDEs', 'Avg Days/SDE'].forEach(text => {
            const h = document.createElement('div');
            h.className = 'capacity-variable-leave-header';
            h.textContent = text;
            varGrid.appendChild(h);
        });

        ['maternity', 'paternity', 'familyResp', 'medical'].forEach(key => {
            if (!team.teamCapacityAdjustments.variableLeaveImpact[key]) {
                team.teamCapacityAdjustments.variableLeaveImpact[key] = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
            }
            const data = team.teamCapacityAdjustments.variableLeaveImpact[key];

            // Label
            const label = document.createElement('div');
            label.className = 'capacity-variable-leave-label';
            label.textContent = key;
            varGrid.appendChild(label);

            // SDE Input
            const sdeGroup = this._createInputWithSuffix('number', data.affectedSDEs, 'SDEs', (val) => data.affectedSDEs = parseInt(val));
            varGrid.appendChild(sdeGroup);

            // Days Input
            const daysGroup = this._createInputWithSuffix('number', data.avgDaysPerAffectedSDE, 'Days', (val) => data.avgDaysPerAffectedSDE = parseInt(val));
            varGrid.appendChild(daysGroup);
        });

        left.appendChild(varGrid);
        grid.appendChild(left);

        // Right Column: Team Activities & Engineer Leave
        const right = document.createElement('div');

        // --- Engineer Leave Plans ---
        const engLeaveTitle = document.createElement('h5');
        engLeaveTitle.textContent = 'Engineer Leave Plans';
        engLeaveTitle.className = 'capacity-subsection-title';
        right.appendChild(engLeaveTitle);

        const engLeaveContainer = document.createElement('div');
        engLeaveContainer.className = 'capacity-engineer-leave-container';

        // Header
        const engHeader = document.createElement('div');
        engHeader.className = 'capacity-engineer-leave-header';
        const h1 = document.createElement('span'); h1.textContent = 'Engineer Name';
        const h2 = document.createElement('span'); h2.textContent = 'Planned Days';
        engHeader.appendChild(h1);
        engHeader.appendChild(h2);
        engLeaveContainer.appendChild(engHeader);

        const engineers = team.engineers || [];
        if (engineers.length === 0) {
            const noEng = document.createElement('div');
            noEng.textContent = 'No engineers assigned to this team.';
            noEng.style.padding = '15px';
            noEng.style.color = '#999';
            noEng.style.fontStyle = 'italic';
            engLeaveContainer.appendChild(noEng);
        } else {
            engineers.forEach(engName => {
                const row = document.createElement('div');
                row.className = 'capacity-engineer-row';

                const nameLabel = document.createElement('span');
                nameLabel.className = 'capacity-engineer-name';
                nameLabel.textContent = engName;
                row.appendChild(nameLabel);

                const daysInput = document.createElement('input');
                daysInput.type = 'number';
                daysInput.className = 'form-control form-control-sm';
                daysInput.placeholder = '0';
                daysInput.value = team.teamCapacityAdjustments.engineerLeavePlans[engName] || '';
                daysInput.onchange = (e) => {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || val === 0) {
                        delete team.teamCapacityAdjustments.engineerLeavePlans[engName];
                    } else {
                        team.teamCapacityAdjustments.engineerLeavePlans[engName] = val;
                    }
                };
                row.appendChild(daysInput);

                engLeaveContainer.appendChild(row);
            });
        }
        right.appendChild(engLeaveContainer);

        // Team Activities
        const actTitle = document.createElement('h5');
        actTitle.textContent = 'Team Activities';
        actTitle.className = 'capacity-subsection-title';
        actTitle.style.marginTop = '20px';
        right.appendChild(actTitle);

        const actTable = document.createElement('table');
        actTable.className = 'table table-sm table-striped';

        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        ['Activity', 'Value', 'Type', ''].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        actTable.appendChild(thead);

        const actTbody = document.createElement('tbody');
        actTable.appendChild(actTbody);

        const renderActs = () => {
            actTbody.innerHTML = '';
            (team.teamCapacityAdjustments.teamActivities || []).forEach((act, idx) => {
                const r = actTbody.insertRow();

                const nameIn = document.createElement('input');
                nameIn.className = 'form-control form-control-sm';
                nameIn.value = act.name || '';
                nameIn.onchange = (e) => act.name = e.target.value;
                r.insertCell().appendChild(nameIn);

                const valIn = document.createElement('input');
                valIn.type = 'number';
                valIn.className = 'form-control form-control-sm capacity-input-md';
                valIn.value = act.value || 0;
                valIn.onchange = (e) => act.value = parseFloat(e.target.value);
                r.insertCell().appendChild(valIn);

                const typeSel = document.createElement('select');
                typeSel.className = 'form-control form-control-sm';

                const opt1 = document.createElement('option'); opt1.value = 'perSDE'; opt1.textContent = 'Days/SDE';
                const opt2 = document.createElement('option'); opt2.value = 'total'; opt2.textContent = 'Total Days';
                typeSel.appendChild(opt1); typeSel.appendChild(opt2);
                typeSel.value = act.estimateType || 'perSDE';

                typeSel.onchange = (e) => act.estimateType = e.target.value;
                r.insertCell().appendChild(typeSel);

                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-danger btn-sm';
                delBtn.innerHTML = '&times;';
                delBtn.onclick = () => {
                    team.teamCapacityAdjustments.teamActivities.splice(idx, 1);
                    renderActs();
                };
                r.insertCell().appendChild(delBtn);
            });
        };
        renderActs();
        right.appendChild(actTable);

        const addActBtn = document.createElement('button');
        addActBtn.className = 'btn btn-outline-secondary btn-sm';
        addActBtn.textContent = 'Add Activity';
        addActBtn.onclick = () => {
            if (!team.teamCapacityAdjustments.teamActivities) team.teamCapacityAdjustments.teamActivities = [];
            team.teamCapacityAdjustments.teamActivities.push({ name: 'New Activity', value: 0, estimateType: 'perSDE' });
            renderActs();
        };
        right.appendChild(addActBtn);

        grid.appendChild(right);
        container.appendChild(grid);
    }

    _createInputWithSuffix(type, value, suffix, onChange) {
        const group = document.createElement('div');
        group.className = 'capacity-input-group';

        const input = document.createElement('input');
        input.type = type;
        input.className = 'form-control form-control-sm capacity-input-with-suffix';
        input.value = value;
        input.onchange = (e) => onChange(e.target.value);
        group.appendChild(input);

        const suffixSpan = document.createElement('span');
        suffixSpan.className = 'capacity-input-suffix';
        suffixSpan.textContent = suffix;
        group.appendChild(suffixSpan);

        return group;
    }
}

window.CapacityConfigurationView = CapacityConfigurationView;
