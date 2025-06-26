// js/goalsView.js

/**
 * Initializes the entire Strategic Goals View widget.
 */
function initializeGoalsView() {
    console.log("Initializing Strategic Goals Dashboard widget...");
    const container = document.getElementById('strategicGoalsWidget');
    if (!container) {
        console.error("Strategic Goals Widget container not found.");
        return;
    }

    container.innerHTML = `
        <div id="roadmapTableFiltersGoals" class="widget-filter-bar">
        </div>
        <div id="goalCardsContainer" class="goal-cards-container"></div>
    `;
    
    generateRoadmapTableFilters('Goals', renderGoalsView, { includeThemes: false });
    renderGoalsView();
}

/**
 * Prepares the data for the Strategic Goals view, including all calculations.
 * MODIFIED: Now calculates team-by-team SDE totals for tooltips.
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
        
        let finalContributingTeams = new Set(contributingTeams);
        if (teamFilter !== 'all') {
            if(!finalContributingTeams.has(teamFilter)) return null;
        } else if (orgFilter !== 'all') {
            const teamsInOrg = new Set();
            (currentSystemData.sdms || []).forEach(sdm => {
                if (sdm.seniorManagerId === orgFilter) {
                    (currentSystemData.teams || []).forEach(team => {
                        if (team.sdmId === sdm.sdmId) teamsInOrg.add(team.teamId);
                    });
                }
            });
            const intersection = new Set([...finalContributingTeams].filter(x => teamsInOrg.has(x)));
            if (intersection.size === 0) return null;
        }

        const totalSde = initiativesForYear.reduce((sum, init) => sum + (init.assignments || []).reduce((s, a) => s + (a.sdeYears || 0), 0), 0);
        const completedInitiatives = initiativesForYear.filter(init => init.status === 'Completed').length;
        const totalInitiatives = initiativesForYear.length;

        let overallStatus = 'On Track';
        let statusReason = 'All initiatives are on track.';

        if (totalInitiatives > 0 && completedInitiatives === totalInitiatives) {
            overallStatus = 'Completed';
            statusReason = 'All linked initiatives for this period are completed.';
        } else {
            const atRiskInitiatives = initiativesForYear.filter(init => 
                (init.attributes.planningStatusFundedHc === 'BTL') || 
                (new Date(init.targetDueDate) < new Date() && init.status !== 'Completed')
            );

            if (atRiskInitiatives.length > 0) {
                overallStatus = 'At Risk';
                statusReason = `At risk due to: ${atRiskInitiatives.map(i => `'${i.title}'`).join(', ')}.`;
            }
        }
        
        const contributingThemes = new Set();
        initiativesForYear.forEach(init => {
            (init.themes || []).forEach(t => contributingThemes.add(t));
        });

        // ** NEW: Calculate SDE breakdown for the tooltip **
        const sdeBreakdownByTeam = {};
        initiativesForYear.forEach(init => {
            (init.assignments || []).forEach(assignment => {
                sdeBreakdownByTeam[assignment.teamId] = (sdeBreakdownByTeam[assignment.teamId] || 0) + assignment.sdeYears;
            });
        });


        return {
            ...goal,
            displayTotalSde: totalSde,
            displayCompletedCount: completedInitiatives,
            displayTotalInitiatives: totalInitiatives,
            displayStatus: overallStatus,
            displayStatusReason: statusReason,
            displayContributingTeams: Array.from(contributingTeams),
            displaySdeBreakdown: sdeBreakdownByTeam, // Add breakdown to data
            displayThemes: Array.from(contributingThemes),
            displayInitiatives: initiativesForYear 
        };
    }).filter(Boolean);

    return processedGoals;
}


/**
 * Renders the Strategic Goal Cards into the container.
 * MODIFIED: Adds progress bar and SDE breakdown tooltip.
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
    const teamMap = new Map((currentSystemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));

    goalData.forEach(goal => {
        const teamNames = goal.displayContributingTeams.map(tid => teamMap.get(tid) || 'Unknown').join(', ');
        const themeNames = goal.displayThemes.map(tid => themeMap.get(tid) || 'Uncategorized').join(', ');

        const card = document.createElement('div');
        card.className = `goal-card status-${goal.displayStatus.toLowerCase().replace(' ', '-')}`;

        const initiativesListId = `initiatives-list-${goal.goalId}`;
        const initiativeCardsHTML = goal.displayInitiatives.map(init => {
            const totalSde = (init.assignments || []).reduce((s,a) => s + (a.sdeYears || 0), 0);
            const statusClass = `status-${(init.status || 'backlog').toLowerCase().replace(/\s+/g, '-')}`;
            const isBTL = init.attributes.planningStatusFundedHc === 'BTL' ? 'btl' : '';
            const breakdownHTML = (init.assignments || []).filter(a => a.sdeYears > 0).map(a => `<strong>${teamMap.get(a.teamId) || '??'}</strong>: ${a.sdeYears.toFixed(2)}`).join(', ');
            return `<div class="mini-initiative-card ${statusClass} ${isBTL}"><div class="mini-card-main-row"><span class="mini-card-title">${init.title}</span><span class="mini-card-sde">Total: ${totalSde.toFixed(2)} SDEs</span></div><div class="mini-card-breakdown">${breakdownHTML || 'No SDEs assigned'}</div></div>`;
        }).join('') || `<div class="no-initiatives-text">No initiatives match the current filter.</div>`;

        // ** NEW: Generate SDE breakdown tooltip and progress bar **
        const sdeTooltipText = Object.entries(goal.displaySdeBreakdown)
            .map(([teamId, sde]) => `• ${teamMap.get(teamId) || 'Unknown'}: ${sde.toFixed(2)} SDEs`)
            .join('\n');
        
        const progressPercentage = goal.displayTotalInitiatives > 0 ? (goal.displayCompletedCount / goal.displayTotalInitiatives) * 100 : 0;
        const progressBarHTML = `
            <div class="progress-bar-container" title="${progressPercentage.toFixed(0)}% Complete">
                <div class="progress-bar-fill" style="width: ${progressPercentage}%;"></div>
                <span class="progress-bar-text">${goal.displayCompletedCount} / ${goal.displayTotalInitiatives}</span>
            </div>
        `;

        card.innerHTML = `
            <div class="goal-card-header">
                <h3>${goal.name}</h3>
                <span class="goal-status" title="${goal.displayStatusReason}">${goal.displayStatus}</span>
            </div>
            <p class="goal-description"><em>${goal.description || 'No description provided.'}</em></p>
            <div class="goal-metrics">
                <div title="${sdeTooltipText}">
                    <span class="metric-value">${goal.displayTotalSde.toFixed(2)}</span>
                    <span class="metric-label">Total SDE-Years</span>
                </div>
                <div>
                    <span class="metric-value">${goal.displayTotalInitiatives}</span>
                    <span class="metric-label">Total Initiatives</span>
                </div>
                <div class="metric-progress">
                    ${progressBarHTML}
                    <span class="metric-label">Progress</span>
                </div>
            </div>
            <div class="goal-ownership">...</div>
            <div class="goal-teams">...</div>
            <div class="goal-themes">...</div>
            <div class="goal-initiatives-toggle">...</div>
        `;
        // For brevity, the static parts of innerHTML are omitted but should be the same as the previous version.
        // Full replacement below:
        card.innerHTML = `
            <div class="goal-card-header">
                <h3>${goal.name}</h3>
                <span class="goal-status" title="${goal.displayStatusReason}">${goal.displayStatus}</span>
            </div>
            <p class="goal-description"><em>${goal.description || 'No description provided.'}</em></p>
            <div class="goal-metrics">
                <div title="${sdeTooltipText}">
                    <span class="metric-value">${goal.displayTotalSde.toFixed(2)}</span>
                    <span class="metric-label">Total SDE-Years</span>
                </div>
                <div>
                    <span class="metric-value">${goal.displayTotalInitiatives}</span>
                    <span class="metric-label">Total Initiatives</span>
                </div>
                <div class="metric-progress">
                    ${progressBarHTML}
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
                <div class="toggle-summary" data-target-id="${initiativesListId}">
                    View Linked Initiatives (${goal.displayInitiatives.length}) <span class="toggle-arrow">▼</span>
                </div>
                <div id="${initiativesListId}" class="initiatives-list" style="display: none;">
                    ${initiativeCardsHTML}
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll('.toggle-summary').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target-id');
            const targetList = document.getElementById(targetId);
            const arrow = toggle.querySelector('.toggle-arrow');

            if (targetList) {
                const isHidden = targetList.style.display === 'none';
                targetList.style.display = isHidden ? 'block' : 'none';
                if (arrow) {
                    arrow.textContent = isHidden ? '▲' : '▼';
                }
            }
        });
    });
}