/**
 * AccomplishmentsWidget Component
 * 
 * Displays completed initiatives with context within DashboardView.
 * Refactored from accomplishmentsView.js to use DOM creation pattern.
 */
class AccomplishmentsWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.cardsContainer = null;
        this.planningYear = 'all'; // Default, set via setPlanningYear()
    }

    /**
     * Set the planning year filter
     * @param {string|number} year - The year to filter by, or 'all'
     */
    setPlanningYear(year) {
        this.planningYear = year;
    }

    /**
     * Render the widget
     */
    render() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('AccomplishmentsWidget: Container not found:', this.containerId);
            return;
        }

        // Clear and create structure
        this._clearElement(this.container);

        this.cardsContainer = document.createElement('div');
        this.cardsContainer.id = 'accomplishmentsContainer';
        this.cardsContainer.className = 'accomplishments-container';
        this.container.appendChild(this.cardsContainer);

        // Render accomplishment cards
        this.renderCards();
    }

    /**
     * Prepare accomplishments data
     * @returns {Array} Filtered and sorted completed initiatives
     */
    prepareData() {
        const yearFilter = this.planningYear;
        const systemData = SystemService.getCurrentSystem();

        if (!systemData) return [];

        let completedInitiatives = (systemData.yearlyInitiatives || [])
            .filter(init => init.status === 'Completed');

        // Apply year filter
        if (yearFilter !== 'all') {
            completedInitiatives = completedInitiatives.filter(init =>
                init.attributes.planningYear == yearFilter
            );
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
     * Render accomplishment cards
     */
    renderCards() {
        if (!this.cardsContainer) return;

        const accomplishments = this.prepareData();
        this._clearElement(this.cardsContainer);

        if (accomplishments.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'accomplishments-container__empty';
            emptyMsg.textContent = 'No completed initiatives match the current filter criteria.';
            this.cardsContainer.appendChild(emptyMsg);
            return;
        }

        // Build lookup maps
        const systemData = SystemService.getCurrentSystem();
        const teamMap = new Map((systemData.teams || []).map(t => [t.teamId, t.teamIdentity || t.teamName]));
        const goalMap = new Map((systemData.goals || []).map(g => [g.goalId, g.name]));
        const themeMap = new Map((systemData.definedThemes || []).map(t => [t.themeId, t.name]));

        accomplishments.forEach(init => {
            const card = this.createCard(init, teamMap, goalMap, themeMap);
            this.cardsContainer.appendChild(card);
        });
    }

    /**
     * Create a single accomplishment card
     * @param {Object} init - Initiative data
     * @param {Map} teamMap - Team ID to name mapping
     * @param {Map} goalMap - Goal ID to name mapping
     * @param {Map} themeMap - Theme ID to name mapping
     * @returns {HTMLElement} Card element
     */
    createCard(init, teamMap, goalMap, themeMap) {
        const card = document.createElement('div');
        card.className = 'accomplishment-card';

        // Calculate metrics
        const totalSde = (init.assignments || []).reduce((sum, a) => sum + (a.sdeYears || 0), 0);
        const contributingTeams = (init.assignments || [])
            .map(a => teamMap.get(a.teamId) || 'Unknown')
            .join(', ');

        // Header
        const header = document.createElement('div');
        header.className = 'accomplishment-header';

        const title = document.createElement('h4');
        title.className = 'accomplishment-title';
        title.textContent = init.title;
        header.appendChild(title);

        const dateSpan = document.createElement('span');
        dateSpan.className = 'accomplishment-date';
        dateSpan.textContent = init.actualCompletionDate
            ? `Completed: ${init.actualCompletionDate}`
            : `Completed (Target): ${init.targetDueDate || 'N/A'}`;
        header.appendChild(dateSpan);

        card.appendChild(header);

        // Description
        const desc = document.createElement('p');
        desc.className = 'accomplishment-description';
        desc.textContent = init.description || 'No description.';
        card.appendChild(desc);

        // Details section
        const details = document.createElement('div');
        details.className = 'accomplishment-details';

        // Goal
        const goalDiv = document.createElement('div');
        const goalStrong = document.createElement('strong');
        goalStrong.textContent = 'Part of Goal: ';
        goalDiv.appendChild(goalStrong);
        goalDiv.appendChild(document.createTextNode(goalMap.get(init.primaryGoalId) || 'N/A'));
        details.appendChild(goalDiv);

        // Themes
        const themesDiv = document.createElement('div');
        const themesStrong = document.createElement('strong');
        themesStrong.textContent = 'Themes: ';
        themesDiv.appendChild(themesStrong);
        const themeNames = (init.themes || []).map(tid => themeMap.get(tid)).filter(Boolean).join(', ') || 'None';
        themesDiv.appendChild(document.createTextNode(themeNames));
        details.appendChild(themesDiv);

        // Owner & PM
        const ownershipDiv = document.createElement('div');
        const ownerStrong = document.createElement('strong');
        ownerStrong.textContent = 'Owner: ';
        ownershipDiv.appendChild(ownerStrong);
        ownershipDiv.appendChild(document.createTextNode(init.owner?.name || 'N/A'));
        ownershipDiv.appendChild(document.createTextNode('  •  '));
        const pmStrong = document.createElement('strong');
        pmStrong.textContent = 'Project Manager: ';
        ownershipDiv.appendChild(pmStrong);
        ownershipDiv.appendChild(document.createTextNode(init.projectManager?.name || 'N/A'));
        details.appendChild(ownershipDiv);

        // ROI
        const roiDiv = document.createElement('div');
        const roiStrong = document.createElement('strong');
        roiStrong.textContent = 'Achieved ROI: ';
        roiDiv.appendChild(roiStrong);
        let roiText = 'N/A';
        if (init.roi?.category && init.roi?.estimatedValue) {
            roiText = `${init.roi.category}: ${init.roi.estimatedValue}`;
        } else if (init.roi?.category) {
            roiText = init.roi.category;
        }
        roiDiv.appendChild(document.createTextNode(roiText));
        details.appendChild(roiDiv);

        card.appendChild(details);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'accomplishment-footer';

        const teamsSpan = document.createElement('span');
        const teamsStrong = document.createElement('strong');
        teamsStrong.textContent = 'Teams: ';
        teamsSpan.appendChild(teamsStrong);
        teamsSpan.appendChild(document.createTextNode(contributingTeams || 'None'));
        footer.appendChild(teamsSpan);

        const effortSpan = document.createElement('span');
        const effortStrong = document.createElement('strong');
        effortStrong.textContent = 'Effort: ';
        effortSpan.appendChild(effortStrong);
        effortSpan.appendChild(document.createTextNode(`${totalSde.toFixed(2)} SDE-Years`));
        footer.appendChild(effortSpan);

        card.appendChild(footer);

        return card;
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
