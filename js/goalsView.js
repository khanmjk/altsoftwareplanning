// js/goalsView.js

/**
 * Initializes the entire Strategic Goals View widget.
 * This is the main entry point called from dashboard.js.
 */
function initializeGoalsView() {
    console.log("Initializing Strategic Goals Dashboard widget...");
    const container = document.getElementById('strategicGoalsWidget');
    if (!container) {
        console.error("Strategic Goals Widget container not found.");
        return;
    }

    // CORRECTED: The ID now correctly matches what generateRoadmapTableFilters expects ('roadmapTableFilters' + 'Goals')
    container.innerHTML = `
        <div id="roadmapTableFiltersGoals" class="widget-filter-bar">
        </div>
        <div id="goalCardsContainer" class="goal-cards-container"></div>
    `;

    // Generate filters (Org & Team only) and pass the render function specific to this view
    generateRoadmapTableFilters('Goals', renderGoalsView, { includeThemes: false });
    renderGoalsView();
}

/**
 * Prepares the data for the Strategic Goals view, including all calculations.
 */
function prepareGoalData() {
    const yearFilter = dashboardPlanningYear;
    const orgFilter = document.getElementById('roadmapOrgFilterGoals')?.value || 'all';
    const teamFilter = document.getElementById('roadmapTeamFilterGoals')?.value || 'all';

    let allGoals = JSON.parse(JSON.stringify(currentSystemData.goals || []));

    let processedGoals = allGoals.map(goal => {
        let allInitiativesForGoal = (currentSystemData.yearlyInitiatives || []).filter(init =>
            (goal.initiativeIds || []).includes(init.initiativeId)
        );

        let initiativesForYear = allInitiativesForGoal;
        if (yearFilter !== 'all') {
            initiativesForYear = allInitiativesForGoal.filter(init => init.attributes.planningYear == yearFilter);
        }

        if (initiativesForYear.length === 0) {
            return null;
        }

        let initiativesToDisplay = initiativesForYear;
        const contributingTeams = new Set();
        initiativesForYear.forEach(init => {
            (init.assignments || []).forEach(a => contributingTeams.add(a.teamId));
        });

        if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (currentSystemData.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (currentSystemData.teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                    });
                }
            });
            if (Array.from(contributingTeams).every(tid => !teamsInOrg.has(tid))) {
                return null;
            }
        }
        
        if (teamFilter !== 'all') {
            if (!contributingTeams.has(teamFilter)) {
                return null;
            }
        }

        // After all filtering, if there are no teams from the selection contributing, hide the card.
        let finalContributingTeams = new Set(contributingTeams);
        if (teamFilter !== 'all') {
            finalContributingTeams = new Set([teamFilter]);
        } else if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (currentSystemData.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (currentSystemData.teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                    });
                }
            });
            finalContributingTeams = new Set([...contributingTeams].filter(x => teamsInOrg.has(x)));
        }

        if(finalContributingTeams.size === 0) return null;

        const totalSde = initiativesForYear.reduce((sum, init) => sum + (init.assignments || []).reduce((s, a) => s + (a.sdeYears || 0), 0), 0);
        const completedInitiatives = initiativesForYear.filter(init => init.status === 'Completed').length;
        const totalInitiatives = initiativesForYear.length;

        let overallStatus = 'On Track';
        if (totalInitiatives > 0 && completedInitiatives === totalInitiatives) {
            overallStatus = 'Completed';
        } else if (initiativesForYear.some(init => (init.attributes.planningStatusFundedHc === 'BTL') || (new Date(init.targetDueDate) < new Date() && init.status !== 'Completed'))) {
            overallStatus = 'At Risk';
        }

        const contributingThemes = new Set();
        initiativesForYear.forEach(init => {
            (init.themes || []).forEach(t => contributingThemes.add(t));
        });

        return {
            ...goal,
            displayTotalSde: totalSde,
            displayCompletedCount: completedInitiatives,
            displayTotalInitiatives: totalInitiatives,
            displayStatus: overallStatus,
            displayContributingTeams: Array.from(contributingTeams),
            displayThemes: Array.from(contributingThemes),
            displayInitiatives: initiativesForYear 
        };
    }).filter(Boolean);

    return processedGoals;
}


/**
 * Renders the Strategic Goal Cards into the container.
 */
function renderGoalsView() {
    const container = document.getElementById('goalCardsContainer');
    if (!container) return;

    const goalData = prepareGoalData();
    
    if (goalData.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #777; margin-top: 20px;">No goals match the current filter criteria.</p>`;
        return;
    }

    container.innerHTML = ''; 
    const themeMap = new Map((currentSystemData.definedThemes || []).map(t => [t.themeId, t.name]));

    goalData.forEach(goal => {
        const teamMap = new Map((currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));
        const teamNames = goal.displayContributingTeams.map(tid => teamMap.get(tid) || 'Unknown').join(', ');
        const themeNames = goal.displayThemes.map(tid => themeMap.get(tid) || 'Uncategorized').join(', ');


        const card = document.createElement('div');
        card.className = `goal-card status-${goal.displayStatus.toLowerCase().replace(' ', '-')}`;

        card.innerHTML = `
            <div class="goal-card-header">
                <h3>${goal.name}</h3>
                <span class="goal-status">${goal.displayStatus}</span>
            </div>
            <p class="goal-description"><em>${goal.description || 'No description provided.'}</em></p>
            <div class="goal-metrics">
                <div>
                    <span class="metric-value">${goal.displayTotalSde.toFixed(2)}</span>
                    <span class="metric-label">Total SDE-Years</span>
                </div>
                <div>
                    <span class="metric-value">${goal.displayTotalInitiatives}</span>
                    <span class="metric-label">Total Initiatives</span>
                </div>
                <div>
                    <span class="metric-value">${goal.displayCompletedCount} / ${goal.displayTotalInitiatives}</span>
                    <span class="metric-label">Progress</span>
                </div>
            </div>
            <div class="goal-ownership">
                <strong>Owner:</strong> ${goal.owner?.name || 'N/A'}<br>
                <strong>Project Manager:</strong> ${goal.projectManager?.name || 'N/A'}<br>
                <strong>Technical POC:</strong> ${goal.technicalPOC?.name || 'N/A'}
            </div>
            <div class="goal-teams">
                <strong>Contributing Teams:</strong> ${teamNames || 'None'}
            </div>
            <div class="goal-themes">
                <strong>Strategic Themes:</strong> ${themeNames || 'None'}
            </div>
            <div class="goal-initiatives-toggle">
                <details>
                    <summary>View Linked Initiatives (${goal.displayInitiatives.length}) ▼</summary>
                    <ul>
                        ${goal.displayInitiatives.map(init => `<li>${init.title} - (Status: ${init.status}) - (${(init.assignments || []).reduce((s,a) => s + (a.sdeYears || 0), 0).toFixed(2)} SDEs)</li>`).join('')}
                    </ul>
                </details>
            </div>
        `;
        container.appendChild(card);
    });
}