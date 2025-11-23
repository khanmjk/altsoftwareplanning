const aiAgentTools = [
    {
        command: "addInitiative",
        description: "Adds a new initiative to the backlog/year plan.",
        parameters: [
            { name: "title", type: "string", description: "Human-readable title for the initiative.", required: true },
            { name: "description", type: "string", description: "Optional description of the initiative.", required: false },
            { name: "status", type: "string", description: "Workflow status such as 'Backlog', 'Defined', or 'Committed'.", required: false },
            { name: "attributes", type: "object", description: "Additional metadata such as { planningYear: YYYY }.", required: false },
            { name: "targetDueDate", type: "string", description: "Target date in YYYY-MM-DD format.", required: false },
            { name: "assignments", type: "array", description: "Array of { teamId: string, sdeYears: number } objects.", required: false }
        ]
    },
    {
        command: "updateInitiative",
        description: "Updates the fields of an existing initiative.",
        parameters: [
            { name: "initiativeId", type: "string", description: "ID of the initiative to update.", required: true },
            { name: "updates", type: "object", description: "Object containing the fields to update on the initiative.", required: true }
        ]
    },
    {
        command: "deleteInitiative",
        description: "Deletes an initiative from the backlog/year plan.",
        parameters: [
            { name: "initiativeId", type: "string", description: "ID of the initiative to delete.", required: true }
        ]
    },
    {
        command: "addNewTeam",
        description: "Creates a new team entry in the system.",
        parameters: [
            { name: "teamData", type: "object", description: "Optional overrides for the new team (teamName, teamIdentity, fundedHeadcount, etc.).", required: false }
        ]
    },
    {
        command: "deleteTeam",
        description: "Deletes a team by ID.",
        parameters: [
            { name: "teamId", type: "string", description: "The unique ID of the team to delete.", required: true },
            { name: "silent", type: "boolean", description: "If true, suppresses UI alerts.", required: false }
        ]
    },
    {
        command: "addEngineerToRoster",
        description: "Adds a new engineer to the global roster (allKnownEngineers).",
        parameters: [
            { name: "name", type: "string", description: "Engineer name.", required: true },
            { name: "level", type: "number", description: "Engineer level (1-7).", required: true },
            { name: "attributes", type: "object", description: "Fields such as { isAISWE, aiAgentType, skills[], yearsOfExperience }.", required: false },
            { name: "currentTeamId", type: "string", description: "Optional team ID to immediately assign the engineer to.", required: false }
        ]
    },
    {
        command: "moveEngineerToTeam",
        description: "Moves an engineer to a different team (or unassigns them).",
        parameters: [
            { name: "engineerName", type: "string", description: "Name of the engineer in the roster.", required: true },
            { name: "newTeamId", type: "string", description: "Destination team ID (null to unassign).", required: false }
        ]
    },
    {
        command: "addSeniorManager",
        description: "Adds a new Senior Manager to the organization.",
        parameters: [
            { name: "name", type: "string", description: "The full name of the new Senior Manager.", required: true }
        ]
    },
    {
        command: "addSdm",
        description: "Adds a new SDM (Software Development Manager) to the organization.",
        parameters: [
            { name: "name", type: "string", description: "The full name of the new SDM.", required: true },
            { name: "seniorManagerId", type: "string", description: "Optional. The ID of the Senior Manager this SDM reports to.", required: false }
        ]
    },
    {
        command: "updateSdm",
        description: "Updates the properties of an existing SDM. Used to change their reporting line.",
        parameters: [
            { name: "sdmId", type: "string", description: "The ID of the SDM to update.", required: true },
            { name: "updates", type: "object", description: "An object of fields to update, e.g., { seniorManagerId: '...' }.", required: true }
        ]
    },
    {
        command: "reassignTeamToSdm",
        description: "Moves an existing team to report to a different SDM.",
        parameters: [
            { name: "teamIdentifier", type: "string", description: "Team ID, name, or placeholder (e.g., {{teamId_RoutingRangers}}).", required: true },
            { name: "sdmIdentifier", type: "string", description: "SDM ID, name, or placeholder (e.g., {{sdmId_PaulBright}}).", required: true }
        ]
    },
    {
        command: "reassignSdmWithTeams",
        description: "Moves an SDM (and all of their teams) under a different SDM’s organization or a new Senior Manager.",
        parameters: [
            { name: "sdmIdentifier", type: "string", description: "SDM ID, name, or placeholder (e.g., {{sdmId_AlexChen}}).", required: true },
            { name: "destinationIdentifier", type: "string", description: "Target SDM or Senior Manager identifier.", required: true },
            { name: "destinationType", type: "string", description: "Optional. Explicitly set to 'sdm' or 'seniorManager'.", required: false }
        ]
    },
    {
        command: "deleteSeniorManager",
        description: "Deletes a Senior Manager and optionally reassigns their SDMs to another Sr. Manager.",
        parameters: [
            { name: "seniorManagerId", type: "string", description: "The ID of the Senior Manager to delete.", required: true },
            { name: "reassignToSeniorManagerId", type: "string", description: "Optional. The ID of another Senior Manager to reassign SDMs to.", required: false }
        ]
    },
    {
        command: "addNewService",
        description: "Creates a new service entry in the system.",
        parameters: [
            { name: "serviceData", type: "object", description: "Optional overrides such as serviceName, owningTeamId, dependencies, etc.", required: false }
        ]
    },
    {
        command: "deleteService",
        description: "Deletes a service by name.",
        parameters: [
            { name: "serviceName", type: "string", description: "Name of the service to delete.", required: true }
        ]
    },
    {
        command: "bulkUpdateTeamCapacity",
        description: "Bulk-updates capacity settings for multiple teams (overhead, AI gain, buffers).",
        parameters: [
            { name: "updates", type: "object", description: "Fields to merge into teamCapacityAdjustments.", required: false },
            { name: "capacityReductionPercent", type: "number", description: "Percent reduction converted into added overhead hours/week.", required: false },
            { name: "aiProductivityGainPercent", type: "number", description: "Set a new AI productivity gain percent for the targeted teams.", required: false },
            { name: "avgOverheadHoursPerWeekPerSDE", type: "number", description: "Override avgOverheadHoursPerWeekPerSDE for targeted teams.", required: false },
            { name: "filter", type: "object", description: "Optional filter { teamIds: [], orgIdentifier: 'sdmId|seniorManagerId|All' }.", required: false }
        ]
    },
    {
        command: "bulkUpdateInitiatives",
        description: "Bulk-updates initiative fields (e.g., status/isProtected) that match criteria.",
        parameters: [
            { name: "updates", type: "object", description: "Fields to apply to each matching initiative (e.g., { status: 'Backlog' }).", required: true },
            { name: "criteria", type: "object", description: "Filter initiatives by { goalId, themeId, roiValue, confidenceLevel, status, isProtected }.", required: false }
        ]
    },
    {
        command: "bulkAdjustInitiativeEstimates",
        description: "Scales SDE-year estimates for assignments on matching initiatives by a factor.",
        parameters: [
            { name: "adjustmentFactor", type: "number", description: "Multiplier (0.9 reduces scope by 10%, 1.1 adds 10%).", required: true },
            { name: "criteria", type: "object", description: "Filter initiatives by { goalId, themeId, roiValue, confidenceLevel, status, isProtected }.", required: false }
        ]
    },
    {
        command: "bulkReassignTeams",
        description: "Moves all teams from one SDM to another SDM.",
        parameters: [
            { name: "sourceSdmId", type: "string", description: "SDM currently owning the teams.", required: true },
            { name: "targetSdmId", type: "string", description: "SDM who will receive the teams.", required: true }
        ]
    },
    {
        command: "generateDiagram",
        description: "Generates a visual diagram (flowchart, sequence, architecture, org chart, or Gantt/Timeline) based on the system data. Use this when the user asks to 'draw', 'visualize', 'show me a diagram', or 'map out' something.",
        parameters: [
            { name: "description", type: "string", description: "A specific description of what to diagram (e.g., 'Sequence diagram of payment flow' or 'Gantt chart for Q1 initiatives').", required: true }
        ]
    }
];

function getAgentToolsetDescription() {
    return aiAgentTools.map(tool => {
        const params = (tool.parameters || []).map(param => {
            const requiredLabel = param.required ? "[required]" : "[optional]";
            return `- ${param.name} (${param.type}) ${requiredLabel}: ${param.description}`;
        }).join('\n') || '- None';
        return `Command: ${tool.command}\nDescription: ${tool.description}\nParameters:\n${params}`;
    }).join('\n\n');
}

function getToolsSummaryList() {
    return aiAgentTools.map(tool => ({
        command: tool.command,
        description: tool.description
    }));
}

async function executeTool(command, payload = {}) {
    switch (command) {
        case 'addInitiative': {
            const newInitiative = addInitiative(payload);
            if (!newInitiative) throw new Error('Failed to add initiative.');
            _smartRefreshInitiative(newInitiative);
            return newInitiative;
        }
        case 'updateInitiative': {
            if (!payload.initiativeId) throw new Error('updateInitiative: initiativeId is required.');
            const updates = payload.updates || {};
            const updated = updateInitiative(payload.initiativeId, updates);
            if (!updated) throw new Error('Failed to update initiative.');
            _smartRefreshInitiative(updated);
            return updated;
        }
        case 'deleteInitiative': {
            if (!payload.initiativeId) throw new Error('deleteInitiative: initiativeId is required.');
            const success = deleteInitiative(payload.initiativeId);
            if (!success) throw new Error('Failed to delete initiative.');
            if (typeof currentEditingInitiativeId !== 'undefined' && currentEditingInitiativeId === payload.initiativeId) {
                currentEditingInitiativeId = null;
            }
            return { deleted: true, initiativeId: payload.initiativeId };
        }
        case 'addNewTeam': {
            const overrides = payload.teamData || {};
            const result = addNewTeam(overrides) || ((currentSystemData.teams || [])[currentSystemData.teams.length - 1] ?? null);
            if (!result) throw new Error('Failed to add new team.');
            return result;
        }
        case 'deleteTeam': {
            if (!payload.teamId) throw new Error('deleteTeam: teamId is required.');
            const teamIndex = (currentSystemData.teams || []).findIndex(team => team.teamId === payload.teamId);
            if (teamIndex === -1) throw new Error(`deleteTeam: Team with ID ${payload.teamId} not found.`);
            const teamCopy = { ...(currentSystemData.teams[teamIndex] || {}) };
            const success = deleteTeam(teamIndex, { skipConfirm: true, silent: payload.silent !== undefined ? payload.silent : true });
            if (!success) throw new Error('Failed to delete team.');
            return { deleted: true, teamId: payload.teamId, team: teamCopy };
        }
        case 'addEngineerToRoster': {
            const engineer = addEngineerToRoster(payload);
            return engineer;
        }
        case 'moveEngineerToTeam': {
            if (!payload.engineerName) throw new Error('moveEngineerToTeam: engineerName is required.');
            const updatedEngineer = moveEngineerToTeam(payload.engineerName, payload.newTeamId || null);
            return updatedEngineer;
        }
        case 'addSeniorManager': {
            if (!payload.name) throw new Error('addSeniorManager: name is required.');
            return addSeniorManager(payload.name);
        }
        case 'addSdm': {
            if (!payload.name) throw new Error('addSdm: name is required.');
            return addSdm(payload.name, payload.seniorManagerId || null);
        }
        case 'updateSdm': {
            if (!payload.sdmId) throw new Error('updateSdm: sdmId is required.');
            if (!payload.updates || typeof payload.updates !== 'object') {
                throw new Error('updateSdm: updates object is required.');
            }
            return updateSdm(payload.sdmId, payload.updates);
        }
        case 'reassignTeamToSdm': {
            const teamIdentifier = payload.teamIdentifier || payload.teamId;
            const sdmIdentifier = payload.sdmIdentifier || payload.newSdmId;
            if (!teamIdentifier) throw new Error('reassignTeamToSdm: teamIdentifier is required.');
            if (!sdmIdentifier) throw new Error('reassignTeamToSdm: sdmIdentifier is required.');
            return reassignTeamToSdm(teamIdentifier, sdmIdentifier);
        }
        case 'reassignSdmWithTeams': {
            const sdmIdentifier = payload.sdmIdentifier || payload.sdmId;
            const destinationIdentifier = payload.destinationIdentifier || payload.destinationId || payload.targetIdentifier;
            const destinationType = payload.destinationType || payload.targetType || null;
            if (!sdmIdentifier) throw new Error('reassignSdmWithTeams: sdmIdentifier is required.');
            if (!destinationIdentifier) throw new Error('reassignSdmWithTeams: destinationIdentifier is required.');
            return reassignSdmWithTeams(sdmIdentifier, destinationIdentifier, { destinationType });
        }
        case 'deleteSeniorManager': {
            if (!payload.seniorManagerId) throw new Error('deleteSeniorManager: seniorManagerId is required.');
            return deleteSeniorManager(payload.seniorManagerId, payload.reassignToSeniorManagerId || null);
        }
        case 'addNewService': {
            const overrides = payload.serviceData || {};
            const newService = addNewService(overrides) || ((currentSystemData.services || [])[currentSystemData.services.length - 1] ?? null);
            if (!newService) throw new Error('Failed to add new service.');
            return newService;
        }
        case 'deleteService': {
            if (!payload.serviceName) throw new Error('deleteService: serviceName is required.');
            const serviceIndex = (currentSystemData.services || []).findIndex(service => service.serviceName === payload.serviceName);
            if (serviceIndex === -1) throw new Error(`deleteService: Service "${payload.serviceName}" not found.`);
            const deletedService = deleteService(serviceIndex, 'editServicesManagement');
            if (!deletedService) throw new Error('Failed to delete service.');
            return { deleted: true, serviceName: payload.serviceName, service: deletedService };
        }
        case 'bulkUpdateTeamCapacity': {
            const result = bulkUpdateTeamCapacity(payload || {});
            if (!result) throw new Error('bulkUpdateTeamCapacity: No changes were applied.');
            return result;
        }
        case 'bulkUpdateInitiatives': {
            if (!payload || !payload.updates) throw new Error('bulkUpdateInitiatives: updates object is required.');
            const result = bulkUpdateInitiatives(payload.updates, payload.criteria || {});
            return result;
        }
        case 'bulkAdjustInitiativeEstimates': {
            const factor = payload?.adjustmentFactor;
            if (factor === undefined || factor === null || isNaN(factor)) {
                throw new Error('bulkAdjustInitiativeEstimates: adjustmentFactor (number) is required.');
            }
            return bulkAdjustInitiativeEstimates(Number(factor), payload.criteria || {});
        }
        case 'bulkReassignTeams': {
            const sourceSdmId = payload?.sourceSdmId || payload?.fromSdmId;
            const targetSdmId = payload?.targetSdmId || payload?.toSdmId;
            if (!sourceSdmId) throw new Error('bulkReassignTeams: sourceSdmId is required.');
            if (!targetSdmId) throw new Error('bulkReassignTeams: targetSdmId is required.');
            return bulkReassignTeams(sourceSdmId, targetSdmId);
        }
        default:
            throw new Error(`Unknown tool command: ${command}`);
    }
}

function _smartRefreshInitiative(initiative) {
    if (!initiative || typeof currentEditingInitiativeId === 'undefined') return;
    if (currentEditingInitiativeId && initiative.initiativeId === currentEditingInitiativeId && typeof populateRoadmapInitiativeForm_modal === 'function') {
        populateRoadmapInitiativeForm_modal(initiative);
    }
}

/**
 * --- Bulk/Macro Tool Implementations ---
 */
function _ensureTeamCapacityAdjustments(team) {
    if (!team.teamCapacityAdjustments || typeof team.teamCapacityAdjustments !== 'object') {
        team.teamCapacityAdjustments = { leaveUptakeEstimates: [], variableLeaveImpact: {}, teamActivities: [], avgOverheadHoursPerWeekPerSDE: 0, aiProductivityGainPercent: 0, attributes: {} };
    }
    const adj = team.teamCapacityAdjustments;
    if (!Array.isArray(adj.leaveUptakeEstimates)) adj.leaveUptakeEstimates = [];
    if (!adj.variableLeaveImpact || typeof adj.variableLeaveImpact !== 'object') adj.variableLeaveImpact = {};
    if (!Array.isArray(adj.teamActivities)) adj.teamActivities = [];
    if (adj.avgOverheadHoursPerWeekPerSDE === undefined || adj.avgOverheadHoursPerWeekPerSDE === null) adj.avgOverheadHoursPerWeekPerSDE = 0;
    if (adj.aiProductivityGainPercent === undefined || adj.aiProductivityGainPercent === null) adj.aiProductivityGainPercent = 0;
    if (!adj.attributes || typeof adj.attributes !== 'object') adj.attributes = {};
    return adj;
}

function _teamMatchesFilter(team, filter = {}) {
    if (!filter || Object.keys(filter).length === 0) return true;

    if (Array.isArray(filter.teamIds) && filter.teamIds.length > 0) {
        return filter.teamIds.includes(team.teamId);
    }

    if (filter.orgIdentifier) {
        const ident = String(filter.orgIdentifier).trim();
        if (!ident || ident.toLowerCase() === 'all') return true;
        if ((team.sdmId || '').toLowerCase() === ident.toLowerCase()) return true;

        const resolvedSdmId = (typeof _resolveSdmIdentifier === 'function') ? _resolveSdmIdentifier(ident) : null;
        if (resolvedSdmId && team.sdmId && team.sdmId.toLowerCase() === resolvedSdmId.toLowerCase()) return true;

        if (currentSystemData?.sdms && typeof _resolveSeniorManagerIdentifier === 'function') {
            const teamSdm = (currentSystemData.sdms || []).find(s => s.sdmId === team.sdmId);
            const resolvedSrMgrId = _resolveSeniorManagerIdentifier(ident);
            if (resolvedSrMgrId && teamSdm?.seniorManagerId === resolvedSrMgrId) return true;
        }
        return false;
    }

    return true;
}

function bulkUpdateTeamCapacity(options = {}) {
    if (!currentSystemData || !Array.isArray(currentSystemData.teams)) {
        throw new Error('bulkUpdateTeamCapacity: currentSystemData.teams is unavailable.');
    }
    const { updates = {}, capacityReductionPercent = null, aiProductivityGainPercent = null, avgOverheadHoursPerWeekPerSDE = null, filter = {} } = options;
    const targets = (currentSystemData.teams || []).filter(team => _teamMatchesFilter(team, filter));
    const updatedTeams = [];
    const appliedFields = [];

    targets.forEach(team => {
        const adj = _ensureTeamCapacityAdjustments(team);
        const changeLog = {};

        if (aiProductivityGainPercent !== null && aiProductivityGainPercent !== undefined) {
            adj.aiProductivityGainPercent = aiProductivityGainPercent;
            changeLog.aiProductivityGainPercent = aiProductivityGainPercent;
            if (!appliedFields.includes('aiProductivityGainPercent')) appliedFields.push('aiProductivityGainPercent');
        }
        if (avgOverheadHoursPerWeekPerSDE !== null && avgOverheadHoursPerWeekPerSDE !== undefined) {
            adj.avgOverheadHoursPerWeekPerSDE = avgOverheadHoursPerWeekPerSDE;
            changeLog.avgOverheadHoursPerWeekPerSDE = avgOverheadHoursPerWeekPerSDE;
            if (!appliedFields.includes('avgOverheadHoursPerWeekPerSDE')) appliedFields.push('avgOverheadHoursPerWeekPerSDE');
        }
        if (capacityReductionPercent !== null && capacityReductionPercent !== undefined && !isNaN(capacityReductionPercent)) {
            const percent = Number(capacityReductionPercent);
            const assumedHoursPerWeek = 40;
            const addedOverhead = Math.max(0, (percent / 100) * assumedHoursPerWeek);
            adj.avgOverheadHoursPerWeekPerSDE = (adj.avgOverheadHoursPerWeekPerSDE || 0) + addedOverhead;
            adj.strategicBufferPercent = percent;
            changeLog.capacityReductionPercent = percent;
            changeLog.addedOverheadHoursPerWeekPerSDE = addedOverhead;
            if (!appliedFields.includes('capacityReductionPercent')) appliedFields.push('capacityReductionPercent');
        }
        if (updates && typeof updates === 'object') {
            Object.keys(updates).forEach(key => {
                adj[key] = updates[key];
                changeLog[key] = updates[key];
                if (!appliedFields.includes(key)) appliedFields.push(key);
            });
        }

        updatedTeams.push({
            teamId: team.teamId,
            teamName: team.teamIdentity || team.teamName || team.teamId,
            changes: changeLog
        });
    });

    return {
        updatedCount: updatedTeams.length,
        updatedTeams,
        appliedFields,
        scopeDescription: `${updatedTeams.length} ${updatedTeams.length === 1 ? 'team' : 'teams'}`,
        filterApplied: filter
    };
}

function _initiativeMatchesCriteria(initiative, criteria = {}) {
    if (!criteria || Object.keys(criteria).length === 0) return true;
    const matchesGoal = criteria.goalId
        ? (initiative.primaryGoalId === criteria.goalId ||
            (Array.isArray(currentSystemData?.goals) && currentSystemData.goals.some(g => g.goalId === criteria.goalId && (g.initiativeIds || []).includes(initiative.initiativeId))))
        : true;
    if (!matchesGoal) return false;

    const matchesTheme = criteria.themeId ? Array.isArray(initiative.themes) && initiative.themes.includes(criteria.themeId) : true;
    if (!matchesTheme) return false;

    const matchesRoiValue = criteria.roiValue ? String(initiative.roi?.estimatedValue || '').toLowerCase() === String(criteria.roiValue).toLowerCase() : true;
    if (!matchesRoiValue) return false;

    const matchesConfidence = criteria.confidenceLevel ? String(initiative.roi?.confidenceLevel || '').toLowerCase() === String(criteria.confidenceLevel).toLowerCase() : true;
    if (!matchesConfidence) return false;

    const matchesStatus = criteria.status ? String(initiative.status || '').toLowerCase() === String(criteria.status).toLowerCase() : true;
    if (!matchesStatus) return false;

    const matchesProtection = typeof criteria.isProtected === 'boolean' ? initiative.isProtected === criteria.isProtected : true;
    if (!matchesProtection) return false;

    return true;
}

function bulkUpdateInitiatives(updates, criteria = {}) {
    if (!currentSystemData || !Array.isArray(currentSystemData.yearlyInitiatives)) {
        throw new Error('bulkUpdateInitiatives: currentSystemData.yearlyInitiatives is unavailable.');
    }
    if (!updates || typeof updates !== 'object') {
        throw new Error('bulkUpdateInitiatives: updates object is required.');
    }

    const targetInits = currentSystemData.yearlyInitiatives.filter(init => _initiativeMatchesCriteria(init, criteria));
    targetInits.forEach(init => {
        Object.assign(init, updates);
    });

    return {
        updatedCount: targetInits.length,
        appliedUpdates: updates,
        criteria
    };
}

function bulkAdjustInitiativeEstimates(adjustmentFactor, criteria = {}) {
    if (!currentSystemData || !Array.isArray(currentSystemData.yearlyInitiatives)) {
        throw new Error('bulkAdjustInitiativeEstimates: currentSystemData.yearlyInitiatives is unavailable.');
    }
    const factor = Number(adjustmentFactor);
    if (!isFinite(factor)) {
        throw new Error('bulkAdjustInitiativeEstimates: adjustmentFactor must be a finite number.');
    }

    const targetInits = currentSystemData.yearlyInitiatives.filter(init => _initiativeMatchesCriteria(init, criteria));
    const updates = [];

    targetInits.forEach(init => {
        const before = (init.assignments || []).map(a => ({ ...a }));
        init.assignments = (init.assignments || []).map(a => {
            const currentValue = Number(a.sdeYears) || 0;
            const newValue = Number((currentValue * factor).toFixed(2));
            return { ...a, sdeYears: newValue };
        });
        updates.push({ initiativeId: init.initiativeId, before, after: init.assignments });
    });

    return {
        updatedCount: updates.length,
        adjustmentFactor: factor,
        updates,
        criteria
    };
}

function bulkReassignTeams(sourceSdmId, targetSdmId) {
    if (!currentSystemData || !Array.isArray(currentSystemData.teams)) {
        throw new Error('bulkReassignTeams: currentSystemData.teams is unavailable.');
    }
    const resolveSdm = (id) => (typeof _resolveSdmIdentifier === 'function') ? _resolveSdmIdentifier(id) : id;
    const resolvedSource = resolveSdm(sourceSdmId);
    const resolvedTarget = resolveSdm(targetSdmId);
    if (!resolvedSource) throw new Error(`bulkReassignTeams: Could not resolve source SDM "${sourceSdmId}".`);
    if (!resolvedTarget) throw new Error(`bulkReassignTeams: Could not resolve target SDM "${targetSdmId}".`);
    if (resolvedSource === resolvedTarget) throw new Error('bulkReassignTeams: Source and target SDM IDs are the same.');

    const movedTeams = (currentSystemData.teams || []).filter(team => team.sdmId === resolvedSource);
    movedTeams.forEach(team => { team.sdmId = resolvedTarget; });

    return {
        movedTeamIds: movedTeams.map(t => t.teamId),
        movedTeamNames: movedTeams.map(t => t.teamIdentity || t.teamName || t.teamId),
        sourceSdmId: resolvedSource,
        targetSdmId: resolvedTarget
    };
}

const aiAgentToolset = {
    aiAgentTools,
    getAgentToolsetDescription,
    getToolsSummaryList,
    executeTool
};

if (typeof window !== 'undefined') {
    window.aiAgentToolset = aiAgentToolset;
}
