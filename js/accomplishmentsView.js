// js/accomplishmentsView.js

/**
 * Initializes the entire Accomplishments View widget.
 */
function initializeAccomplishmentsView() {
    console.log("Initializing Accomplishments Dashboard widget...");
    const container = document.getElementById('accomplishmentsWidget');
    if (!container) {
        console.error("Accomplishments Widget container not found.");
        return;
    }

    container.innerHTML = `
        <div id="roadmapTableFiltersAccomplishments" class="widget-filter-bar">
        </div>
        <div id="accomplishmentsContainer" class="accomplishments-container"></div>
    `;

    generateRoadmapTableFilters('Accomplishments', renderAccomplishmentsView, { includeThemes: true });
    renderAccomplishmentsView();
}

/**
 * Prepares the data for the Accomplishments view.
 * MODIFIED: Now gathers additional context like Goal, Themes, Ownership, and ROI.
 */
function prepareAccomplishmentsData() {
    const yearFilter = dashboardPlanningYear;
    const orgFilter = document.getElementById('roadmapOrgFilterAccomplishments')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilterAccomplishments')?.value || 'all';
    const themeCheckboxes = document.querySelectorAll('#theme-dropdown-panelAccomplishments input.theme-checkbox-item:checked');
    const selectedThemes = Array.from(themeCheckboxes).map(cb => cb.value);

    let completedInitiatives = (currentSystemData.yearlyInitiatives || []).filter(init => init.status === 'Completed');

    // --- Filter Initiatives ---
    if (yearFilter !== 'all') {
        completedInitiatives = completedInitiatives.filter(init => init.attributes.planningYear == yearFilter);
    }

    if (orgFilter !== 'all') {
        const teamsInOrg = new Set();
        (currentSystemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === orgFilter) {
                (currentSystemData.teams || []).forEach(team => {
                    if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                });
            }
        });
        completedInitiatives = completedInitiatives.filter(init => (init.assignments || []).some(a => teamsInOrg.has(a.teamId)));
    }

    if (teamFilter !== 'all') {
        completedInitiatives = completedInitiatives.filter(init => (init.assignments || []).some(a => a.teamId === teamFilter));
    }

    const allThemeIds = (currentSystemData.definedThemes || []).map(t => t.themeId);
    if (selectedThemes.length > 0 && selectedThemes.length < allThemeIds.length) {
        completedInitiatives = completedInitiatives.filter(init => {
            const initThemes = init.themes || [];
            if (initThemes.length === 0) return false;
            return initThemes.some(themeId => selectedThemes.includes(themeId));
        });
    }

    // Sort by completion date, most recent first
    completedInitiatives.sort((a, b) => {
        const dateA = new Date(a.actualCompletionDate || a.targetDueDate);
        const dateB = new Date(b.actualCompletionDate || b.targetDueDate);
        return dateB - dateA;
    });

    return completedInitiatives;
}


/**
 * Renders the list of completed initiatives with enhanced context.
 */
function renderAccomplishmentsView() {
    const container = document.getElementById('accomplishmentsContainer');
    if (!container) return;

    const accomplishments = prepareAccomplishmentsData();

    if (accomplishments.length === 0) {
        container.innerHTML = `<p class="accomplishments-container__empty">No completed initiatives match the current filter criteria.</p>`;
        return;
    }

    container.innerHTML = '';
    const teamMap = new Map((currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));
    const goalMap = new Map((currentSystemData.goals || []).map(g => [g.goalId, g.name]));
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));


    accomplishments.forEach(init => {
        const card = document.createElement('div');
        card.className = 'accomplishment-card';

        const totalSde = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
        const contributingTeams = (init.assignments || [])
            .map(a => teamMap.get(a.teamId) || 'Unknown')
            .join(', ');

        const completionDateText = init.actualCompletionDate
            ? `Completed: ${init.actualCompletionDate}`
            : `Completed (Target): ${init.targetDueDate || 'N/A'}`;

        // ** NEW: Gather additional context **
        const goalName = goalMap.get(init.primaryGoalId) || 'N/A';
        const themeNames = (init.themes || []).map(tid => themeMap.get(tid)).join(', ') || 'None';
        const ownerName = init.owner?.name || 'N/A';
        const pmName = init.projectManager?.name || 'N/A';

        let roiText = 'N/A';
        if (init.roi && init.roi.category && init.roi.estimatedValue) {
            roiText = `${init.roi.category}: ${init.roi.estimatedValue}`;
        } else if (init.roi && init.roi.category) {
            roiText = init.roi.category;
        }


        card.innerHTML = `
            <div class="accomplishment-header">
                <h4 class="accomplishment-title">${init.title}</h4>
                <span class="accomplishment-date">${completionDateText}</span>
            </div>
            <p class="accomplishment-description">${init.description || 'No description.'}</p>
            <div class="accomplishment-details">
                <div><strong>Part of Goal:</strong> ${goalName}</div>
                <div><strong>Themes:</strong> ${themeNames}</div>
                <div><strong>Owner:</strong> ${ownerName} &nbsp;&nbsp;•&nbsp;&nbsp; <strong>Project Manager:</strong> ${pmName}</div>
                <div><strong>Achieved ROI:</strong> ${roiText}</div>
            </div>
            <div class="accomplishment-footer">
                <span><strong>Teams:</strong> ${contributingTeams}</span>
                <span><strong>Effort:</strong> ${totalSde.toFixed(2)} SDE-Years</span>
            </div>
        `;
        container.appendChild(card);
    });
}