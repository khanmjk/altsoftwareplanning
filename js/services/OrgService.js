/**
 * OrgService.js
 * 
 * Domain logic for Organization and Team management.
 * Handles Engineers, Senior Managers, SDMs, and Team structure.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const OrgService = {

    /**
     * Helper to get team name.
     * @param {object} systemData
     * @param {string} teamId
     */
    getTeamNameById(systemData, teamId) {
        if (!systemData || !systemData.teams) return teamId; // Fallback
        const team = systemData.teams.find(t => t.teamId === teamId);
        return team ? (team.teamIdentity || team.teamName) : teamId;
    },

    /**
     * Adds a new engineer to the global roster.
     * @param {object} systemData
     * @param {object} engineerData
     */
    addEngineerToRoster(systemData, engineerData = {}) {
        if (!systemData) throw new Error("OrgService: systemData is required.");
        const { name, level, attributes = {}, currentTeamId = null } = engineerData;

        if (!name || !name.trim()) throw new Error("OrgService: Engineer name is required.");
        const numericLevel = Number(level);
        if (!Number.isFinite(numericLevel) || numericLevel < 1) throw new Error("OrgService: Engineer level must be a positive number.");

        if (!Array.isArray(systemData.allKnownEngineers)) {
            systemData.allKnownEngineers = [];
        }
        const normalizedName = name.trim();
        if (systemData.allKnownEngineers.some(e => e.name.toLowerCase() === normalizedName.toLowerCase())) {
            throw new Error(`Engineer "${normalizedName}" already exists in the roster.`);
        }

        const sanitizedAttributes = {
            isAISWE: !!attributes.isAISWE,
            aiAgentType: attributes.isAISWE ? (attributes.aiAgentType || "General AI") : null,
            skills: Array.isArray(attributes.skills) ? attributes.skills.map(skill => skill.trim()).filter(Boolean) : [],
            yearsOfExperience: Number.isFinite(attributes.yearsOfExperience) ? attributes.yearsOfExperience : 0
        };

        const newEngineer = {
            name: normalizedName,
            level: numericLevel,
            currentTeamId: null,
            attributes: sanitizedAttributes
        };

        systemData.allKnownEngineers.push(newEngineer);

        if (currentTeamId) {
            let resolvedTeamId = currentTeamId;
            if (typeof resolvedTeamId === 'string') {
                const teamIdFromLookup = this._resolveTeamIdentifier(systemData, resolvedTeamId);
                if (teamIdFromLookup) {
                    resolvedTeamId = teamIdFromLookup;
                }
            }
            this.moveEngineerToTeam(systemData, normalizedName, resolvedTeamId);
        }

        return newEngineer;
    },

    /**
     * Moves an engineer to a new team.
     * @param {object} systemData
     * @param {string} engineerName
     * @param {string|null} newTeamId
     */
    moveEngineerToTeam(systemData, engineerName, newTeamId) {
        if (!systemData) throw new Error("OrgService: systemData is required.");
        if (!engineerName || !engineerName.trim()) throw new Error("OrgService: Engineer name is required.");

        const engineer = (systemData.allKnownEngineers || []).find(e => e.name === engineerName);
        if (!engineer) throw new Error(`OrgService: Engineer "${engineerName}" not found in roster.`);

        let normalizedNewTeamId = newTeamId || null;
        if (normalizedNewTeamId) {
            const resolvedTeamId = this._resolveTeamIdentifier(systemData, normalizedNewTeamId);
            if (resolvedTeamId) {
                normalizedNewTeamId = resolvedTeamId;
            }
        }

        const oldTeamId = engineer.currentTeamId || null;
        if (oldTeamId === normalizedNewTeamId) {
            return engineer;
        }

        if (oldTeamId) {
            const oldTeam = (systemData.teams || []).find(team => team.teamId === oldTeamId);
            if (oldTeam && Array.isArray(oldTeam.engineers)) {
                oldTeam.engineers = oldTeam.engineers.filter(name => name !== engineerName);
            }
        }

        engineer.currentTeamId = normalizedNewTeamId;

        if (normalizedNewTeamId) {
            const newTeam = (systemData.teams || []).find(team => team.teamId === normalizedNewTeamId);
            if (!newTeam) throw new Error(`OrgService: Team with ID "${normalizedNewTeamId}" not found.`);

            if (!Array.isArray(newTeam.engineers)) {
                newTeam.engineers = [];
            }
            if (!newTeam.engineers.includes(engineerName)) {
                newTeam.engineers.push(engineerName);
            }
        }

        return engineer;
    },

    /**
     * Adds a new senior manager.
     * @param {object} systemData
     * @param {string} name
     */
    addSeniorManager(systemData, name) {
        if (!systemData) throw new Error("OrgService: systemData is required.");
        if (!name || !name.trim()) throw new Error("OrgService: Senior Manager name is required.");

        const normalizedName = name.trim();
        if (!Array.isArray(systemData.seniorManagers)) {
            systemData.seniorManagers = [];
        }
        if (systemData.seniorManagers.some(s => (s.seniorManagerName || '').toLowerCase() === normalizedName.toLowerCase())) {
            throw new Error(`Senior Manager "${normalizedName}" already exists.`);
        }

        const newSrMgr = {
            seniorManagerId: this._generateIncrementalId(systemData.seniorManagers, 'seniorManagerId', 'srMgr'),
            seniorManagerName: normalizedName,
            attributes: {}
        };

        systemData.seniorManagers.push(newSrMgr);
        return newSrMgr;
    },

    /**
     * Adds a new SDM.
     * @param {object} systemData
     * @param {string} name
     * @param {string|null} seniorManagerId
     */
    addSdm(systemData, name, seniorManagerId = null) {
        if (!systemData) throw new Error("OrgService: systemData is required.");
        if (!name || !name.trim()) throw new Error("OrgService: SDM name is required.");

        const normalizedName = name.trim();
        if (!Array.isArray(systemData.sdms)) {
            systemData.sdms = [];
        }
        if (systemData.sdms.some(s => (s.sdmName || '').toLowerCase() === normalizedName.toLowerCase())) {
            throw new Error(`SDM "${normalizedName}" already exists.`);
        }

        if (seniorManagerId && !(systemData.seniorManagers || []).some(s => s.seniorManagerId === seniorManagerId)) {
            const resolvedId = this._resolveSeniorManagerIdentifier(systemData, seniorManagerId);
            if (resolvedId) {
                seniorManagerId = resolvedId;
            }
        }

        if (seniorManagerId && !(systemData.seniorManagers || []).some(s => s.seniorManagerId === seniorManagerId)) {
            throw new Error(`OrgService: Cannot assign to non-existent seniorManagerId "${seniorManagerId}".`);
        }

        const newSdm = {
            sdmId: this._generateIncrementalId(systemData.sdms, 'sdmId', 'sdm'),
            sdmName: normalizedName,
            seniorManagerId: seniorManagerId || null,
            attributes: {}
        };

        systemData.sdms.push(newSdm);
        return newSdm;
    },

    /**
     * Updates an SDM.
     * @param {object} systemData
     * @param {string} sdmId
     * @param {object} updates
     */
    updateSdm(systemData, sdmId, updates = {}) {
        if (!systemData || !Array.isArray(systemData.sdms)) throw new Error("OrgService: SDM data is not loaded.");
        if (!sdmId) throw new Error("OrgService: sdmId is required.");

        const sdmIndex = systemData.sdms.findIndex(s => s.sdmId === sdmId);
        if (sdmIndex === -1) throw new Error(`OrgService: SDM with ID "${sdmId}" not found.`);

        if (updates.seniorManagerId && !(systemData.seniorManagers || []).some(s => s.seniorManagerId === updates.seniorManagerId)) {
            const resolvedId = this._resolveSeniorManagerIdentifier(systemData, updates.seniorManagerId);
            if (resolvedId) {
                updates.seniorManagerId = resolvedId;
            }
        }
        if (updates.seniorManagerId && !(systemData.seniorManagers || []).some(s => s.seniorManagerId === updates.seniorManagerId)) {
            throw new Error(`OrgService: Cannot assign to non-existent seniorManagerId "${updates.seniorManagerId}".`);
        }

        const sdm = systemData.sdms[sdmIndex];
        Object.assign(sdm, updates);
        return sdm;
    },

    /**
     * Reassigns a team to a new SDM.
     * @param {object} systemData
     * @param {string} teamIdentifier
     * @param {string} newSdmIdentifier
     */
    reassignTeamToSdm(systemData, teamIdentifier, newSdmIdentifier) {
        if (!systemData || !Array.isArray(systemData.teams)) throw new Error("OrgService: Team data is not loaded.");

        const resolvedTeamId = this._resolveTeamIdentifier(systemData, teamIdentifier);
        if (!resolvedTeamId) throw new Error(`OrgService: Could not resolve team identifier "${teamIdentifier}".`);

        const team = systemData.teams.find(t => t.teamId === resolvedTeamId);
        if (!team) throw new Error(`OrgService: Team with ID "${resolvedTeamId}" not found.`);

        const resolvedSdmId = this._resolveSdmIdentifier(systemData, newSdmIdentifier);
        if (!resolvedSdmId) throw new Error(`OrgService: Could not resolve SDM identifier "${newSdmIdentifier}".`);

        const previousSdmId = team.sdmId || null;
        team.sdmId = resolvedSdmId;

        return { teamId: team.teamId, previousSdmId, newSdmId: resolvedSdmId, team };
    },

    /**
     * Reassigns an SDM and their teams to another structure.
     * @param {object} systemData
     * @param {string} sdmIdentifier
     * @param {string} destinationIdentifier
     * @param {object} options
     */
    reassignSdmWithTeams(systemData, sdmIdentifier, destinationIdentifier, options = {}) {
        if (!systemData || !Array.isArray(systemData.sdms)) throw new Error("OrgService: SDM data is not loaded.");

        const resolvedSdmId = this._resolveSdmIdentifier(systemData, sdmIdentifier);
        if (!resolvedSdmId) throw new Error(`OrgService: Could not resolve SDM identifier "${sdmIdentifier}".`);

        const sourceSdm = (systemData.sdms || []).find(sdm => sdm.sdmId === resolvedSdmId);
        if (!sourceSdm) throw new Error(`OrgService: SDM with ID "${resolvedSdmId}" not found.`);

        let destinationType = (options.destinationType || '').toLowerCase() || null;
        let destinationSeniorManagerId = null;
        let destinationSdmId = null;

        const resolveDestinationAsSeniorManager = () => {
            const resolved = this._resolveSeniorManagerIdentifier(systemData, destinationIdentifier);
            if (resolved) {
                destinationSeniorManagerId = resolved;
                destinationType = 'seniorManager';
                return true;
            }
            return false;
        };

        const resolveDestinationAsSdm = () => {
            const resolved = this._resolveSdmIdentifier(systemData, destinationIdentifier);
            if (resolved) {
                destinationSdmId = resolved;
                const destSdm = (systemData.sdms || []).find(sdm => sdm.sdmId === resolved);
                destinationSeniorManagerId = destSdm ? (destSdm.seniorManagerId || null) : null;
                destinationType = 'sdm';
                return true;
            }
            return false;
        };

        if (destinationType === 'seniorManager') {
            if (!resolveDestinationAsSeniorManager()) {
                throw new Error(`OrgService: Destination senior manager "${destinationIdentifier}" not found.`);
            }
        } else if (destinationType === 'sdm') {
            if (!resolveDestinationAsSdm()) {
                throw new Error(`OrgService: Destination SDM "${destinationIdentifier}" not found.`);
            }
        } else {
            if (!resolveDestinationAsSeniorManager()) {
                if (!resolveDestinationAsSdm()) {
                    throw new Error(`OrgService: Could not resolve destination identifier "${destinationIdentifier}" to an SDM or Senior Manager.`);
                }
            }
        }

        const affectedTeams = (systemData.teams || []).filter(team => team.sdmId === resolvedSdmId);
        const previousSeniorManagerId = sourceSdm.seniorManagerId || null;
        sourceSdm.seniorManagerId = destinationSeniorManagerId || null;

        return {
            sdmId: resolvedSdmId,
            destinationType,
            destinationSeniorManagerId: sourceSdm.seniorManagerId,
            destinationSdmId,
            previousSeniorManagerId,
            movedTeamIds: affectedTeams.map(team => team.teamId),
            movedTeamNames: affectedTeams.map(team => team.teamIdentity || team.teamName || team.teamId)
        };
    },

    /**
     * Deletes a Senior Manager.
     * @param {object} systemData
     * @param {string} seniorManagerId
     * @param {string|null} reassignToSeniorManagerId
     */
    deleteSeniorManager(systemData, seniorManagerId, reassignToSeniorManagerId = null) {
        if (!systemData) throw new Error("OrgService: systemData is required.");
        if (!seniorManagerId) throw new Error("OrgService: seniorManagerId is required.");

        const srManagers = systemData.seniorManagers || [];
        const index = srManagers.findIndex(sm => sm.seniorManagerId === seniorManagerId);
        if (index === -1) throw new Error(`OrgService: Senior manager with ID "${seniorManagerId}" not found.`);

        if (reassignToSeniorManagerId) {
            if (!srManagers.some(sm => sm.seniorManagerId === reassignToSeniorManagerId)) {
                throw new Error(`OrgService: Cannot reassign to non-existent seniorManagerId "${reassignToSeniorManagerId}".`);
            }
        }

        const deletedSrMgr = srManagers.splice(index, 1)[0];

        (systemData.sdms || []).forEach(sdm => {
            if (sdm.seniorManagerId === seniorManagerId) {
                sdm.seniorManagerId = reassignToSeniorManagerId || null;
            }
        });

        return { deleted: true, seniorManager: deletedSrMgr };
    },

    // --- Private / Internal Helpers ---

    _generateIncrementalId(collection = [], idField, prefix) {
        const regex = new RegExp(`^${prefix}(\\d+)$`);
        let maxNumeric = 0;
        collection.forEach(item => {
            const value = item && item[idField];
            if (typeof value === 'string') {
                const match = value.match(regex);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!Number.isNaN(num)) {
                        maxNumeric = Math.max(maxNumeric, num);
                    }
                }
            }
        });
        return `${prefix}${maxNumeric + 1}`;
    },

    _normalizeNameForLookup(value) {
        return (value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    },

    _resolveSeniorManagerIdentifier(systemData, identifier) {
        if (!identifier) return null;
        const managers = systemData?.seniorManagers || [];
        if (managers.length === 0) return null;

        const directMatch = managers.find(sm => (sm.seniorManagerId || '').toLowerCase() === String(identifier).toLowerCase());
        if (directMatch) return directMatch.seniorManagerId;

        const placeholderMatch = typeof identifier === 'string' ? identifier.match(/^{{seniorManagerId_(.+)}}$/) : null;
        if (placeholderMatch) {
            identifier = placeholderMatch[1];
        }

        const sanitizedInput = this._normalizeNameForLookup(identifier.replace(/^srMgr[-_]?/i, ''));
        if (!sanitizedInput) return null;

        const nameMatch = managers.find(sm => this._normalizeNameForLookup(sm.seniorManagerName) === sanitizedInput);
        return nameMatch ? nameMatch.seniorManagerId : null;
    },

    _resolveSdmIdentifier(systemData, identifier) {
        if (!identifier) return null;
        const sdms = systemData?.sdms || [];
        if (sdms.length === 0) return null;

        const identifierStr = String(identifier).trim();
        const directMatch = sdms.find(sdm => (sdm.sdmId || '').toLowerCase() === identifierStr.toLowerCase());
        if (directMatch) return directMatch.sdmId;

        let lookupValue = identifierStr;
        const placeholderMatch = typeof identifierStr === 'string' ? identifierStr.match(/^{{sdmId_(.+)}}$/) : null;
        if (placeholderMatch) {
            lookupValue = placeholderMatch[1];
        }

        const sanitizedInput = this._normalizeNameForLookup(lookupValue);
        if (!sanitizedInput) return null;

        const matches = sdms.filter(sdm => {
            const normalizedName = this._normalizeNameForLookup(sdm.sdmName);
            if (!normalizedName) return false;
            return normalizedName === sanitizedInput ||
                normalizedName.startsWith(sanitizedInput) ||
                sanitizedInput.startsWith(normalizedName);
        });

        if (matches.length === 1) {
            return matches[0].sdmId;
        }
        if (matches.length > 1) {
            console.warn(`OrgService: Ambiguous SDM identifier "${identifierStr}".`);
        }
        return null;
    },

    _resolveTeamIdentifier(systemData, identifier) {
        if (!identifier) return null;
        const teams = systemData?.teams || [];
        if (teams.length === 0) return null;

        const identifierStr = String(identifier).trim();
        const directMatch = teams.find(team => (team.teamId || '').toLowerCase() === identifierStr.toLowerCase());
        if (directMatch) return directMatch.teamId;

        let lookupValue = identifierStr;
        const placeholderMatch = typeof identifierStr === 'string' ? identifierStr.match(/^{{teamId_(.+)}}$/) : null;
        if (placeholderMatch) {
            lookupValue = placeholderMatch[1];
        }

        const sanitizedInput = this._normalizeNameForLookup(lookupValue);
        if (!sanitizedInput) return null;

        const matches = teams.filter(team => {
            const normalizedIdentity = this._normalizeNameForLookup(team.teamIdentity);
            const normalizedName = this._normalizeNameForLookup(team.teamName);
            const candidates = [normalizedIdentity, normalizedName].filter(Boolean);
            return candidates.some(candidate =>
                candidate === sanitizedInput ||
                candidate.startsWith(sanitizedInput) ||
                sanitizedInput.startsWith(candidate)
            );
        });

        if (matches.length === 1) {
            return matches[0].teamId;
        }
        if (matches.length > 1) {
            console.warn(`OrgService: Ambiguous Team identifier "${identifierStr}".`);
        }
        return null;
    }
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrgService;
}
