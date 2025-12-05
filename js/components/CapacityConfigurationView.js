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

        // 1. Global Constraints
        this._renderGlobalConstraints(wrapper);

        // Separator
        const hr = document.createElement('hr');
        hr.style.margin = '30px 0'; // Utility style allowed? Or move to CSS.
        // Let's keep minimal inline for HR or use a class.
        hr.className = 'capacity-separator';
        wrapper.appendChild(hr);

        // 2. Team Constraints
        this._renderTeamConstraints(wrapper);

        this.container.appendChild(wrapper);
    }

    _renderGlobalConstraints(parentContainer) {
        const section = document.createElement('div');
        section.id = 'globalConstraintsSection';

        const title = document.createElement('h3');
        title.textContent = '1. Organizational Defaults & Global Events';
        title.className = 'capacity-section-title';
        section.appendChild(title);

        const desc = document.createElement('p');
        desc.textContent = 'Set the baseline working days and organization-wide events that affect all teams.';
        desc.className = 'capacity-section-desc';
        section.appendChild(desc);

        const config = window.currentSystemData.capacityConfiguration;
        if (!config) {
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger';
            alert.textContent = 'Missing capacityConfiguration';
            section.appendChild(alert);
            parentContainer.appendChild(section);
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
        section.appendChild(grid);

        // Org Events (Full Width)
        const eventsTitle = document.createElement('h4');
        eventsTitle.textContent = 'Organization-Wide Events';
        eventsTitle.style.marginTop = '20px'; // Move to CSS
        section.appendChild(eventsTitle);

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
        section.appendChild(orgEventsTable);

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
        section.appendChild(addEventBtn);

        parentContainer.appendChild(section);
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
        const leaveTypes = window.currentSystemData.capacityConfiguration?.leaveTypes || [];
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
        const events = window.currentSystemData.capacityConfiguration?.globalConstraints?.orgEvents || [];
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
        const section = document.createElement('div');
        section.id = 'teamConstraintsSection';

        const title = document.createElement('h3');
        title.textContent = '2. Team-Specific Adjustments';
        title.className = 'capacity-section-title';
        section.appendChild(title);

        const desc = document.createElement('p');
        desc.textContent = 'Fine-tune capacity for individual teams based on their specific context (e.g., high overhead, specific leave patterns).';
        desc.className = 'capacity-section-desc';
        section.appendChild(desc);

        const teams = window.currentSystemData.teams || [];

        // Accordion container
        const accordion = document.createElement('div');
        accordion.className = 'accordion';
        accordion.id = 'teamConstraintsAccordion';

        teams.forEach((team, index) => {
            const item = document.createElement('div');
            item.className = 'capacity-team-card';

            // Header
            const header = document.createElement('div');
            header.className = 'capacity-team-header';

            const titleSpan = document.createElement('strong');
            titleSpan.textContent = team.teamIdentity || team.teamName;
            header.appendChild(titleSpan);

            const toggleSpan = document.createElement('span');
            toggleSpan.className = 'text-muted';
            toggleSpan.textContent = 'Click to expand';
            header.appendChild(toggleSpan);

            const body = document.createElement('div');
            body.className = 'capacity-team-body';

            header.onclick = () => {
                const isHidden = body.style.display === 'none' || body.style.display === '';
                body.style.display = isHidden ? 'block' : 'none';
                toggleSpan.textContent = isHidden ? 'Click to collapse' : 'Click to expand';
            };

            item.appendChild(header);
            item.appendChild(body);
            accordion.appendChild(item);

            this._renderTeamDetails(body, team);
        });

        section.appendChild(accordion);
        parentContainer.appendChild(section);
    }

    _renderTeamDetails(container, team) {
        // Ensure data structure
        if (!team.teamCapacityAdjustments) {
            team.teamCapacityAdjustments = {
                leaveUptakeEstimates: [],
                variableLeaveImpact: {},
                teamActivities: [],
                aiProductivityGainPercent: 0
            };
        }

        const grid = document.createElement('div');
        grid.className = 'capacity-team-grid';

        // Left: Leave & Overhead
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
        varTitle.style.marginTop = '15px';
        left.appendChild(varTitle);

        ['maternity', 'paternity', 'familyResp', 'medical'].forEach(key => {
            if (!team.teamCapacityAdjustments.variableLeaveImpact[key]) {
                team.teamCapacityAdjustments.variableLeaveImpact[key] = { affectedSDEs: 0, avgDaysPerAffectedSDE: 0 };
            }
            const data = team.teamCapacityAdjustments.variableLeaveImpact[key];
            const row = document.createElement('div');
            row.className = 'capacity-variable-leave-row';

            const label = document.createElement('span');
            label.className = 'capacity-variable-leave-label';
            label.textContent = `${key}:`;
            row.appendChild(label);

            const sdeInput = document.createElement('input');
            sdeInput.type = 'number';
            sdeInput.className = 'form-control form-control-sm capacity-input-sm';
            sdeInput.value = data.affectedSDEs;
            sdeInput.onchange = (e) => data.affectedSDEs = parseInt(e.target.value);

            const daysInput = document.createElement('input');
            daysInput.type = 'number';
            daysInput.className = 'form-control form-control-sm capacity-input-sm';
            daysInput.style.marginLeft = '5px';
            daysInput.value = data.avgDaysPerAffectedSDE;
            daysInput.onchange = (e) => data.avgDaysPerAffectedSDE = parseInt(e.target.value);

            row.appendChild(sdeInput);
            row.appendChild(document.createTextNode(' SDEs x '));
            row.appendChild(daysInput);
            row.appendChild(document.createTextNode(' Days'));
            left.appendChild(row);
        });

        grid.appendChild(left);

        // Right: Team Activities
        const right = document.createElement('div');
        const actTitle = document.createElement('h5');
        actTitle.textContent = 'Team Activities';
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
                delBtn.innerHTML = '&times;'; // Allowed entity
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
}

window.CapacityConfigurationView = CapacityConfigurationView;
