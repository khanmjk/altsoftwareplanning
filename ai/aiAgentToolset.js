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

const aiAgentToolset = {
    aiAgentTools,
    getAgentToolsetDescription,
    getToolsSummaryList,
    executeTool
};

if (typeof window !== 'undefined') {
    window.aiAgentToolset = aiAgentToolset;
}
