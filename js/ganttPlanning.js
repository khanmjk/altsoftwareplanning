// [CONTENT START]
// js/ganttPlanning.js

// --- Global State ---
let currentGanttYear = new Date().getFullYear();
let currentGanttGroupBy = 'All Initiatives';
let currentGanttStatusFilter = 'All';
let currentFrappeViewMode = 'Month';
let showOtherTeamEstimates = false;
let ganttTableWidthPct = 36;

// Expansion State
let expandedGanttInitiatives = new Set();
let expandedGanttWorkPackages = new Set();
let ganttChartInstance = null;

// Feature Flag Helper
function isFrappeMode() {
    return (typeof USE_FRAPPE_GANTT !== 'undefined' && USE_FRAPPE_GANTT === true);
}

function initializeGanttPlanningView() {
    const container = document.getElementById('ganttPlanningView');
    if (!container) return;
    
    if (typeof ensureWorkPackagesForInitiatives === 'function') {
        ensureWorkPackagesForInitiatives(currentSystemData, currentGanttYear);
    }

    if (expandedGanttWorkPackages.size === 0 && currentSystemData?.workPackages) {
        currentSystemData.workPackages.forEach(wp => expandedGanttWorkPackages.add(wp.workPackageId));
    }

    container.innerHTML = `
        <div id="ganttPlanningControls" class="gantt-filter-bar"></div>
        <div id="ganttSplitPane" class="gantt-split">
            <div id="ganttPlanningTableContainer" class="gantt-panel"></div>
            <div id="ganttSplitResizer" class="gantt-resizer" title="Drag to resize"></div>
            <div id="ganttChartWrapper" class="gantt-panel" style="overflow:hidden;">
                <div id="ganttChartContainer" class="${isFrappeMode() ? 'gantt-container' : 'mermaid'}"></div>
            </div>
        </div>
    `;

    renderGanttControls();
    setupGanttResizer();
    applyGanttSplitWidth();
    initChartEngine();
    renderGanttTable();
    refreshChart();
}

function initChartEngine() {
    const containerId = 'ganttChartContainer';
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '';
    el.classList.remove('mermaid', 'gantt-container');

    if (isFrappeMode() && typeof FrappeGanttComponent !== 'undefined') {
        el.classList.add('gantt-container'); 
        ganttChartInstance = new FrappeGanttComponent({
            containerId: containerId,
            onTaskUpdated: handleChartTaskUpdate
        });
    } else {
        el.classList.add('mermaid');
        ganttChartInstance = new GanttChart({
            container: el,
            mermaidInstance: (typeof mermaid !== 'undefined' ? mermaid : null)
        });
    }
}

// --- CONTROLS ---
function renderGanttControls() {
    const controls = document.getElementById('ganttPlanningControls');
    if (!controls) return;
    const prevTeam = document.getElementById('ganttGroupValue')?.value || 'all';
    controls.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'filter-bar';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '10px';
    wrapper.style.alignItems = 'center';
    wrapper.style.flexWrap = 'wrap';

    // Year
    const availableYears = new Set((currentSystemData?.yearlyInitiatives || []).map(i => i.attributes?.planningYear).filter(y => y));
    availableYears.add(currentGanttYear);
    const yearSelect = createSelect(Array.from(availableYears).sort(), currentGanttYear, (val) => { currentGanttYear = parseInt(val, 10); updateView(); });

    // Group
    const groupSelect = createSelect(['All Initiatives', 'Team'], currentGanttGroupBy, (val) => { 
        currentGanttGroupBy = val; 
        if (val !== 'Team') showOtherTeamEstimates = false;
        renderGanttControls(); 
        updateView(); 
    }, (v) => `View by ${v}`);

    // Status
    const allStatuses = new Set((currentSystemData?.yearlyInitiatives || []).map(i => i.status).filter(s => s));
    const statusSelect = createSelect(['All', ...Array.from(allStatuses).sort()], currentGanttStatusFilter, (val) => { currentGanttStatusFilter = val; updateView(); });

    // Dynamic Team Toggle
    let otherTeamsToggle = null;
    if (currentGanttGroupBy === 'Team') {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = showOtherTeamEstimates;
        cb.onchange = (e) => { showOtherTeamEstimates = e.target.checked; renderGanttTable(); };
        otherTeamsToggle = createLabel('Show other estimates', cb);
    }

    // Zoom
    let zoomControl = document.createElement('span'); 
    if (isFrappeMode()) {
        zoomControl = createSelect(['Day', 'Week', 'Month'], currentFrappeViewMode, (val) => { currentFrappeViewMode = val; refreshChart(); }, null, "Zoom");
    }

    const dynamicFilterWrap = document.createElement('div');
    dynamicFilterWrap.id = 'ganttDynamicFilter';

    wrapper.appendChild(createLabel('Year:', yearSelect));
    wrapper.appendChild(createLabel('Group:', groupSelect));
    wrapper.appendChild(dynamicFilterWrap);
    if (otherTeamsToggle) wrapper.appendChild(otherTeamsToggle);
    wrapper.appendChild(createLabel('Status:', statusSelect)); 
    if (isFrappeMode()) wrapper.appendChild(zoomControl);

    controls.appendChild(wrapper);
    renderDynamicGroupFilter(prevTeam); 
}

function updateView() {
    renderGanttTable();
    refreshChart();
}

function getGanttFilteredInitiatives() {
    let initiatives = currentSystemData?.yearlyInitiatives ? [...currentSystemData.yearlyInitiatives] : [];

    if (currentGanttYear) initiatives = initiatives.filter(init => (init.attributes?.planningYear || '').toString() === currentGanttYear.toString());
    if (currentGanttStatusFilter !== 'All') initiatives = initiatives.filter(init => init.status === currentGanttStatusFilter);
    
    if (currentGanttGroupBy === 'Team') {
        const selectedTeam = document.getElementById('ganttGroupValue')?.value || 'all';
        if (selectedTeam !== 'all') {
            initiatives = initiatives.filter(init => (init.assignments || []).some(a => a.teamId === selectedTeam));
        }
    }
    return initiatives;
}

// --- RICH TABLE RENDERER ---

function renderGanttTable() {
    const container = document.getElementById('ganttPlanningTableContainer');
    if (!container) return;

    const initiatives = getGanttFilteredInitiatives();
    const showTeams = currentGanttGroupBy !== 'Team'; 
    const selectedTeamId = (currentGanttGroupBy === 'Team') ? (document.getElementById('ganttGroupValue')?.value || 'all') : 'all';

    container.innerHTML = `
        <div class="gantt-table-wrapper">
        <table class="gantt-table">
            <thead>
                <tr>
                    <th style="width:30px"></th>
                    <th>Item</th>
                    ${showTeams ? '<th>Teams</th>' : ''}
                    <th style="width:95px">Start</th>
                    <th style="width:95px">End</th>
                    <th style="width:50px">SDEs</th>
                    <th style="width:100px">Predecessors</th>
                    <th style="width:85px">Status</th>
                    <th style="width:40px"></th>
                </tr>
            </thead>
            <tbody id="ganttTableBody"></tbody>
        </table>
        </div>
    `;
    
    const tbody = document.getElementById('ganttTableBody');
    const colSpan = showTeams ? 9 : 8;

    if (initiatives.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; padding:20px; color:#888;">No initiatives match the current filters.</td></tr>`;
        return;
    }

    initiatives.forEach(init => {
        const isExpanded = expandedGanttInitiatives.has(init.initiativeId);
        const teamNames = (init.assignments || []).map(a => getTeamName(a.teamId)).join(', ');
        
        // Level 1: Initiative
        const trInit = document.createElement('tr');
        trInit.style.backgroundColor = '#f8f9fa';
        trInit.className = 'gantt-init-row';
        trInit.innerHTML = `
            <td class="clickable" onclick="toggleGanttInit('${init.initiativeId}')" style="text-align:center; font-weight:bold; cursor:pointer;">
                ${isExpanded ? '▼' : '▶'}
            </td>
            <td style="font-weight:600;" title="${init.title}">
                <div style="display:flex; flex-direction:column;">
                    <span>${truncate(init.title, 30)}</span>
                    <span style="font-size:10px; color:#666; font-family:monospace;">${init.initiativeId}</span>
                </div>
            </td>
            ${showTeams ? `<td><span style="font-size:11px; color:#555;">${truncate(teamNames, 20)}</span></td>` : ''}
            <td><input type="date" value="${init.attributes?.startDate || ''}" disabled class="gantt-input-readonly"></td>
            <td><input type="date" value="${init.targetDueDate || ''}" disabled class="gantt-input-readonly"></td>
            <td></td>
            <td></td>
            <td><span class="status-badge ${slugify(init.status)}">${init.status}</span></td>
            <td>
                <button class="btn-sm" onclick="triggerAddWp('${init.initiativeId}')" title="Add Work Package">+</button>
            </td>
        `;
        tbody.appendChild(trInit);

        if (isExpanded) {
            const wps = getWorkPackagesForInitiative(init.initiativeId);
            if (wps.length === 0) {
                tbody.innerHTML += `<tr><td colspan="${colSpan}" style="padding-left:40px; color:#999; font-style:italic; font-size:11px;">No work packages. Click + to add.</td></tr>`;
            }
            
            wps.forEach(wp => {
                const isWpExpanded = expandedGanttWorkPackages.has(wp.workPackageId);
                const wpTeams = (wp.impactedTeamAssignments || []).map(a => getTeamName(a.teamId)).join(', ');
                const totalSDE = (wp.impactedTeamAssignments || []).reduce((sum, a) => sum + (a.sdeDays/261), 0).toFixed(1);
                const depString = (wp.dependencies || []).join(', ');

                // Level 2: Work Package
                const trWp = document.createElement('tr');
                trWp.style.backgroundColor = '#fff';
                trWp.innerHTML = `
                    <td class="clickable" onclick="toggleGanttWp('${wp.workPackageId}')" style="text-align:center; font-size:10px; color:#666; cursor:pointer;">
                        ${isWpExpanded ? '▼' : '▶'}
                    </td>
                    <td style="padding-left: 20px;">
                        <input type="text" value="${wp.title}" onchange="updateWpData('${wp.workPackageId}', 'title', this.value)" style="width:95%; border:none; border-bottom:1px dashed #ccc; font-size:12px;">
                    </td>
                    ${showTeams ? `<td style="font-size:11px;">${truncate(wpTeams, 15)}</td>` : ''}
                    <td><input type="date" value="${wp.startDate || ''}" onchange="updateWpData('${wp.workPackageId}', 'startDate', this.value)" class="gantt-input-date"></td>
                    <td><input type="date" value="${wp.endDate || ''}" onchange="updateWpData('${wp.workPackageId}', 'endDate', this.value)" class="gantt-input-date"></td>
                    <td style="text-align:center; font-size:11px;">${totalSDE}</td>
                    
                    <td>
                        <input type="text" value="${depString}" placeholder="wp-123..." 
                               onchange="updateWpData('${wp.workPackageId}', 'dependencies', this.value)"
                               title="Comma separated IDs"
                               style="width:100%; font-size:11px; border:1px solid #eee; padding:2px;">
                    </td>

                    <td>
                        <select onchange="updateWpData('${wp.workPackageId}', 'status', this.value)" class="gantt-input-select">
                            ${['Planned','In Progress','Completed','Blocked'].map(s => `<option value="${s}" ${wp.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="btn-sm btn-danger" onclick="triggerDeleteWp('${wp.workPackageId}')">×</button>
                    </td>
                `;
                tbody.appendChild(trWp);

                // Level 3: Team Assignments
                if (isWpExpanded) {
                    (wp.impactedTeamAssignments || []).forEach((assign) => {
                        if (currentGanttGroupBy === 'Team' && selectedTeamId !== 'all' && !showOtherTeamEstimates && assign.teamId !== selectedTeamId) {
                            return; 
                        }

                        const teamName = getTeamName(assign.teamId);
                        const sdeYears = (assign.sdeDays / 261).toFixed(2);
                        const trAssign = document.createElement('tr');
                        trAssign.className = 'gantt-assign-row';
                        trAssign.style.backgroundColor = '#fcfcfc';
                        
                        trAssign.innerHTML = `
                            <td></td>
                            <td style="padding-left:40px; font-size:11px; color:#555; font-style:italic;">Team: ${teamName}</td>
                            ${showTeams ? '<td></td>' : ''}
                            <td><input type="date" value="${assign.startDate || wp.startDate || ''}" class="gantt-input-date-sm" onchange="updateAssignment('${wp.workPackageId}', '${assign.teamId}', 'startDate', this.value)"></td>
                            <td><input type="date" value="${assign.endDate || wp.endDate || ''}" class="gantt-input-date-sm" onchange="updateAssignment('${wp.workPackageId}', '${assign.teamId}', 'endDate', this.value)"></td>
                            <td><input type="number" step="0.1" value="${sdeYears}" class="gantt-input-sm" style="width:40px" onchange="updateAssignment('${wp.workPackageId}', '${assign.teamId}', 'sdeYears', this.value)"></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        `;
                        tbody.appendChild(trAssign);
                    });
                }
            });
        }
    });
}

// --- CHART ENGINE ---
async function refreshChart() {
    const initiatives = getGanttFilteredInitiatives();
    
    if (isFrappeMode()) {
        if (!window.frappeGanttAdapter || !ganttChartInstance) return;
        const tasks = window.frappeGanttAdapter.buildFrappeTasks({
            initiatives,
            workPackages: currentSystemData.workPackages || [],
            year: currentGanttYear
        });
        ganttChartInstance.render(tasks, currentFrappeViewMode);
    } else {
        if (!window.ganttAdapter || !ganttChartInstance) return;
        const tasks = window.ganttAdapter.buildTasksFromInitiatives({
            initiatives,
            workPackages: currentSystemData.workPackages || [],
            year: currentGanttYear,
            viewBy: currentGanttGroupBy
        });
        ganttChartInstance.setData(tasks, { title: `Plan ${currentGanttYear}` });
        await ganttChartInstance.render();
    }
}

function handleChartTaskUpdate(type, id, newStart, newEnd) {
    if (type === 'workPackage') {
        if (typeof updateWorkPackage === 'function') {
            updateWorkPackage(id, { startDate: newStart, endDate: newEnd });
            const wp = currentSystemData.workPackages.find(w => w.workPackageId === id);
            if (wp) syncInitiativeTotals(wp.initiativeId, currentSystemData);
            saveSystemChanges();
            renderGanttTable(); 
        }
    } else {
        refreshChart();
    }
}

// --- HELPERS ---
window.toggleGanttInit = (id) => {
    if (expandedGanttInitiatives.has(id)) expandedGanttInitiatives.delete(id);
    else expandedGanttInitiatives.add(id);
    renderGanttTable();
};

window.toggleGanttWp = (id) => {
    if (expandedGanttWorkPackages.has(id)) expandedGanttWorkPackages.delete(id);
    else expandedGanttWorkPackages.add(id);
    renderGanttTable();
};

window.triggerAddWp = (initId) => {
    if (typeof addWorkPackage === 'function') {
        addWorkPackage(initId);
        expandedGanttInitiatives.add(initId);
        saveSystemChanges();
        updateView();
    }
};

window.triggerDeleteWp = (wpId) => {
    if (confirm("Delete this work package?")) {
        if (typeof deleteWorkPackage === 'function') deleteWorkPackage(wpId);
        saveSystemChanges();
        updateView();
    }
};

window.updateWpData = (id, field, value) => {
    if (typeof updateWorkPackage === 'function') {
        const updates = {};
        if (field === 'dependencies') {
            updates[field] = value.split(',').map(s => s.trim()).filter(s => s);
        } else {
            updates[field] = value;
        }

        updateWorkPackage(id, updates);
        
        if (field === 'startDate' || field === 'endDate') {
            const wp = currentSystemData.workPackages.find(w => w.workPackageId === id);
            if (wp) syncInitiativeTotals(wp.initiativeId, currentSystemData);
        }
        saveSystemChanges();
        refreshChart(); 
    }
};

window.updateAssignment = (wpId, teamId, field, value) => {
    const wp = currentSystemData.workPackages.find(w => w.workPackageId === wpId);
    if (!wp) return;
    const assign = (wp.impactedTeamAssignments || []).find(a => a.teamId === teamId);
    if (!assign) return;

    if (field === 'startDate') assign.startDate = value;
    if (field === 'endDate') assign.endDate = value;
    if (field === 'sdeYears') assign.sdeDays = parseFloat(value) * 261;

    syncInitiativeTotals(wp.initiativeId, currentSystemData);
    saveSystemChanges();
    
    if (field !== 'sdeYears') refreshChart();
};

// --- LAYOUT HELPERS ---
function applyGanttSplitWidth() {
    const split = document.getElementById('ganttSplitPane');
    if (!split) return;
    const clamped = Math.min(80, Math.max(20, ganttTableWidthPct));
    ganttTableWidthPct = clamped;
    split.style.gridTemplateColumns = `${clamped}% 10px ${100 - clamped}%`;
}

function setupGanttResizer() {
    const resizer = document.getElementById('ganttSplitResizer');
    const split = document.getElementById('ganttSplitPane');
    if (!resizer || !split) return;
    if (resizer.dataset.bound) {
        applyGanttSplitWidth();
        return;
    }
    resizer.dataset.bound = 'true';
    let isDragging = false;
    let startX = 0;
    let startPct = ganttTableWidthPct;

    const stopDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('mouseleave', stopDrag);
    };

    const onDrag = (e) => {
        if (!isDragging) return;
        const rect = split.getBoundingClientRect();
        const delta = e.clientX - startX;
        const startPx = (startPct / 100) * rect.width;
        const newPx = startPx + delta;
        if (rect.width <= 0) return;
        ganttTableWidthPct = (newPx / rect.width) * 100;
        applyGanttSplitWidth();
    };

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startPct = ganttTableWidthPct;
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mouseleave', stopDrag);
    });

    window.addEventListener('resize', applyGanttSplitWidth);
}

// --- UTILS ---
function createSelect(options, value, onChange, labelFn = null, labelText = null) {
    const select = document.createElement('select');
    [...new Set(options)].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = labelFn ? labelFn(opt) : opt;
        select.appendChild(o);
    });
    select.value = value;
    select.onchange = (e) => onChange(e.target.value);
    if (labelText) {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '5px';
        const span = document.createElement('span');
        span.textContent = labelText + ':';
        span.style.fontWeight = '600';
        wrapper.appendChild(span);
        wrapper.appendChild(select);
        return wrapper;
    }
    return select;
}

function createLabel(text, element) {
    const label = document.createElement('label');
    label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '5px'; label.style.fontSize = '13px';
    const span = document.createElement('span'); span.textContent = text; span.style.fontWeight = '600';
    label.appendChild(span); label.appendChild(element);
    return label;
}

function renderDynamicGroupFilter(defaultTeam = 'all') {
    const wrap = document.getElementById('ganttDynamicFilter');
    if (!wrap) return;
    wrap.innerHTML = '';
    
    if (currentGanttGroupBy === 'Team') {
        const select = createSelect(
            ['all', ...(currentSystemData?.teams || []).map(t => t.teamId)],
            defaultTeam,
            (val) => {
                window.__lastTeamFilter = val;
                updateView();
            },
            (id) => {
                if(id==='all') return 'All Teams';
                const t = (currentSystemData?.teams || []).find(x=>x.teamId===id);
                return t ? (t.teamIdentity || t.teamName) : id;
            }
        );
        select.id = 'ganttGroupValue';
        wrap.appendChild(createLabel('Team:', select));
    }
}

function getWorkPackagesForInitiative(initId) {
    return (currentSystemData.workPackages || []).filter(wp => wp.initiativeId === initId);
}

function getTeamName(teamId) {
    const t = (currentSystemData.teams || []).find(x => x.teamId === teamId);
    return t ? (t.teamIdentity || t.teamName) : teamId;
}

function truncate(str, n) { return (str && str.length > n) ? str.substr(0, n-1) + '...' : str; }
function slugify(text) { return (text || '').toLowerCase().replace(/\s+/g, '-'); }

if (typeof window !== 'undefined') {
    window.initializeGanttPlanningView = initializeGanttPlanningView;
    window.renderGanttTable = renderGanttTable; 
}
// [CONTENT END]
