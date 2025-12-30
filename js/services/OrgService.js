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
    const team = systemData.teams.find((t) => t.teamId === teamId);
    return team ? team.teamIdentity || team.teamName : teamId;
  },

  /**
   * Adds a new engineer to the global roster.
   * @param {object} systemData
   * @param {object} engineerData
   */
  addEngineerToRoster(systemData, engineerData = {}) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    const { name, level, attributes = {}, currentTeamId = null } = engineerData;

    if (!name || !name.trim()) throw new Error('OrgService: Engineer name is required.');
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel) || numericLevel < 1)
      throw new Error('OrgService: Engineer level must be a positive number.');

    if (!Array.isArray(systemData.allKnownEngineers)) {
      systemData.allKnownEngineers = [];
    }
    const normalizedName = name.trim();
    if (
      systemData.allKnownEngineers.some(
        (e) => e.name.toLowerCase() === normalizedName.toLowerCase()
      )
    ) {
      throw new Error(`Engineer "${normalizedName}" already exists in the roster.`);
    }

    const sanitizedAttributes = {
      isAISWE: !!attributes.isAISWE,
      aiAgentType: attributes.isAISWE ? attributes.aiAgentType || 'General AI' : null,
      skills: Array.isArray(attributes.skills)
        ? attributes.skills.map((skill) => skill.trim()).filter(Boolean)
        : [],
      yearsOfExperience: Number.isFinite(attributes.yearsOfExperience)
        ? attributes.yearsOfExperience
        : 0,
    };

    const newEngineer = {
      engineerId: this._generateIncrementalId(systemData.allKnownEngineers, 'engineerId', 'eng'),
      name: normalizedName,
      level: numericLevel,
      currentTeamId: null,
      attributes: sanitizedAttributes,
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
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!engineerName || !engineerName.trim())
      throw new Error('OrgService: Engineer name is required.');

    const engineer = (systemData.allKnownEngineers || []).find((e) => e.name === engineerName);
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
      const oldTeam = (systemData.teams || []).find((team) => team.teamId === oldTeamId);
      if (oldTeam && Array.isArray(oldTeam.engineers)) {
        oldTeam.engineers = oldTeam.engineers.filter((name) => name !== engineerName);
      }
    }

    engineer.currentTeamId = normalizedNewTeamId;

    if (normalizedNewTeamId) {
      const newTeam = (systemData.teams || []).find((team) => team.teamId === normalizedNewTeamId);
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
   * Deletes an engineer from the roster.
   * Also removes them from any team they are assigned to.
   * @param {object} systemData
   * @param {string} engineerName
   * @returns {object} The deleted engineer object
   */
  deleteEngineer(systemData, engineerName) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!engineerName || !engineerName.trim())
      throw new Error('OrgService: Engineer name is required.');

    const engineers = systemData.allKnownEngineers || [];
    const engineerIndex = engineers.findIndex((e) => e.name === engineerName);
    if (engineerIndex === -1) {
      throw new Error(`OrgService: Engineer "${engineerName}" not found in roster.`);
    }

    const engineer = engineers[engineerIndex];

    // Remove engineer from their current team if assigned
    if (engineer.currentTeamId) {
      const team = (systemData.teams || []).find((t) => t.teamId === engineer.currentTeamId);
      if (team && Array.isArray(team.engineers)) {
        team.engineers = team.engineers.filter((name) => name !== engineerName);
      }
    }

    // Remove from roster
    engineers.splice(engineerIndex, 1);
    console.log(`OrgService: Deleted engineer ${engineerName}`);

    return engineer;
  },

  /**
   * Updates an existing engineer's properties.
   * @param {object} systemData
   * @param {string} engineerIdentifier - Name or engineerId
   * @param {object} updates - Properties to update (level, attributes)
   * @returns {object} The updated engineer object
   */
  updateEngineer(systemData, engineerIdentifier, updates = {}) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!engineerIdentifier) throw new Error('OrgService: Engineer identifier is required.');

    const engineers = systemData.allKnownEngineers || [];
    const engineer = engineers.find(
      (e) => e.name === engineerIdentifier || e.engineerId === engineerIdentifier
    );

    if (!engineer) {
      throw new Error(`OrgService: Engineer "${engineerIdentifier}" not found in roster.`);
    }

    if (updates.level !== undefined) {
      const numericLevel = Number(updates.level);
      if (Number.isFinite(numericLevel) && numericLevel >= 1) {
        engineer.level = numericLevel;
      }
    }

    if (updates.attributes && typeof updates.attributes === 'object') {
      engineer.attributes = { ...engineer.attributes, ...updates.attributes };
    }

    console.log(`OrgService: Updated engineer ${engineer.name}`);
    return engineer;
  },

  /**
   * Adds a new PMT (Product Manager Technical).
   * @param {object} systemData
   * @param {string} name
   * @param {object} attributes
   * @returns {object} The newly created PMT
   */
  addPmt(systemData, name, attributes = {}) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!name || !name.trim()) throw new Error('OrgService: PMT name is required.');

    const normalizedName = name.trim();
    if (!Array.isArray(systemData.pmts)) {
      systemData.pmts = [];
    }
    if (
      systemData.pmts.some((p) => (p.pmtName || '').toLowerCase() === normalizedName.toLowerCase())
    ) {
      throw new Error(`PMT "${normalizedName}" already exists.`);
    }

    const newPmt = {
      pmtId: this._generateIncrementalId(systemData.pmts, 'pmtId', 'pmt'),
      pmtName: normalizedName,
      attributes: attributes || {},
    };

    systemData.pmts.push(newPmt);
    console.log(`OrgService: Added PMT ${newPmt.pmtId}`);
    return newPmt;
  },

  /**
   * Updates a PMT's properties.
   * @param {object} systemData
   * @param {string} pmtId
   * @param {object} updates
   * @returns {object} The updated PMT
   */
  updatePmt(systemData, pmtId, updates = {}) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!pmtId) throw new Error('OrgService: pmtId is required.');

    const pmts = systemData.pmts || [];
    const pmt = pmts.find((p) => p.pmtId === pmtId);
    if (!pmt) {
      throw new Error(`OrgService: PMT with ID "${pmtId}" not found.`);
    }

    if (updates.pmtName) {
      pmt.pmtName = updates.pmtName.trim();
    }
    if (updates.attributes && typeof updates.attributes === 'object') {
      pmt.attributes = { ...pmt.attributes, ...updates.attributes };
    }

    console.log(`OrgService: Updated PMT ${pmtId}`);
    return pmt;
  },

  /**
   * Deletes a PMT.
   * @param {object} systemData
   * @param {string} pmtId
   * @returns {object} The deleted PMT
   */
  deletePmt(systemData, pmtId) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!pmtId) throw new Error('OrgService: pmtId is required.');

    const pmts = systemData.pmts || [];
    const index = pmts.findIndex((p) => p.pmtId === pmtId);
    if (index === -1) {
      throw new Error(`OrgService: PMT with ID "${pmtId}" not found.`);
    }

    const deleted = pmts.splice(index, 1)[0];

    // Clear pmtId from any teams that reference this PMT
    (systemData.teams || []).forEach((team) => {
      if (team.pmtId === pmtId) {
        team.pmtId = null;
      }
    });

    console.log(`OrgService: Deleted PMT ${pmtId}`);
    return deleted;
  },

  /**
   * Adds a new senior manager.
   * @param {object} systemData
   * @param {string} name
   */
  addSeniorManager(systemData, name) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!name || !name.trim()) throw new Error('OrgService: Senior Manager name is required.');

    const normalizedName = name.trim();
    if (!Array.isArray(systemData.seniorManagers)) {
      systemData.seniorManagers = [];
    }
    if (
      systemData.seniorManagers.some(
        (s) => (s.seniorManagerName || '').toLowerCase() === normalizedName.toLowerCase()
      )
    ) {
      throw new Error(`Senior Manager "${normalizedName}" already exists.`);
    }

    const newSrMgr = {
      seniorManagerId: this._generateIncrementalId(
        systemData.seniorManagers,
        'seniorManagerId',
        'srMgr'
      ),
      seniorManagerName: normalizedName,
      attributes: {},
    };

    systemData.seniorManagers.push(newSrMgr);
    return newSrMgr;
  },

  /**
   * Adds a new team to the organization.
   * @param {object} systemData
   * @param {object} teamData - Optional overrides for team properties
   * @returns {object} The newly created team
   */
  addTeam(systemData, teamData = {}) {
    if (!systemData) {
      throw new Error('OrgService.addTeam: systemData is required.');
    }
    if (!Array.isArray(systemData.teams)) {
      systemData.teams = [];
    }

    const newTeamId = this._generateIncrementalId(systemData.teams, 'teamId', 'team');
    const newTeam = {
      teamId: newTeamId,
      teamName: '',
      teamIdentity: '',
      teamDescription: '',
      fundedHeadcount: 0,
      buildersInSeats: 0,
      engineers: [],
      awayTeamMembers: [],
      sdmId: null,
      seniorManagerId: null,
      pmtId: null,
      ...teamData,
    };

    systemData.teams.push(newTeam);
    console.log(`OrgService: Added team ${newTeam.teamId}`);
    return newTeam;
  },

  /**
   * Deletes a team by ID.
   * @param {object} systemData
   * @param {string} teamId
   * @returns {boolean} True if team was deleted
   */
  deleteTeam(systemData, teamId) {
    if (!systemData || !Array.isArray(systemData.teams)) {
      throw new Error('OrgService.deleteTeam: systemData.teams is unavailable.');
    }
    const initialLength = systemData.teams.length;
    systemData.teams = systemData.teams.filter((t) => t.teamId !== teamId);

    const deleted = systemData.teams.length < initialLength;
    if (deleted) {
      console.log(`OrgService: Deleted team ${teamId}`);
    }
    return deleted;
  },

  /**
   * Adds a new away-team member to a team.
   * @param {object} systemData
   * @param {string} teamId
   * @param {object} memberData - { name, level, sourceTeam, attributes }
   * @returns {object} The newly created away-team member
   */
  addAwayTeamMember(systemData, teamId, memberData = {}) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!teamId) throw new Error('OrgService: teamId is required.');

    const team = (systemData.teams || []).find((t) => t.teamId === teamId);
    if (!team) {
      throw new Error(`OrgService: Team "${teamId}" not found.`);
    }

    if (!Array.isArray(team.awayTeamMembers)) {
      team.awayTeamMembers = [];
    }

    const { name, level, sourceTeam, attributes = {} } = memberData;
    if (!name || !name.trim()) throw new Error('OrgService: Away-team member name is required.');

    const newMember = {
      awayMemberId: `away${teamId.replace(/[^a-z0-9]/gi, '')}_${team.awayTeamMembers.length + 1}`,
      name: name.trim(),
      level: Number.isFinite(Number(level)) ? Number(level) : 4,
      sourceTeam: sourceTeam || 'External',
      attributes: attributes || {},
    };

    team.awayTeamMembers.push(newMember);
    console.log(`OrgService: Added away-team member ${newMember.name} to team ${teamId}`);
    return newMember;
  },

  /**
   * Removes an away-team member from a team.
   * @param {object} systemData
   * @param {string} teamId
   * @param {string} awayMemberId - The awayMemberId or member name
   * @returns {object} The removed member
   */
  removeAwayTeamMember(systemData, teamId, awayMemberId) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!teamId) throw new Error('OrgService: teamId is required.');
    if (!awayMemberId) throw new Error('OrgService: awayMemberId is required.');

    const team = (systemData.teams || []).find((t) => t.teamId === teamId);
    if (!team) {
      throw new Error(`OrgService: Team "${teamId}" not found.`);
    }

    const members = team.awayTeamMembers || [];
    const index = members.findIndex(
      (m) => m.awayMemberId === awayMemberId || m.name === awayMemberId
    );
    if (index === -1) {
      throw new Error(
        `OrgService: Away-team member "${awayMemberId}" not found in team "${teamId}".`
      );
    }

    const removed = members.splice(index, 1)[0];
    console.log(`OrgService: Removed away-team member ${removed.name} from team ${teamId}`);
    return removed;
  },

  /**
   * Reassigns a team to a different manager (SDM or Senior Manager).
   * Enables flexible hierarchy where teams can report directly to Senior Managers.
   * @param {object} systemData
   * @param {string} teamIdentifier
   * @param {string} managerIdentifier - SDM ID/name or Senior Manager ID/name
   * @param {string} managerType - Optional: 'sdm' or 'seniorManager'
   * @returns {object} Summary of the reassignment
   */
  reassignTeamToManager(systemData, teamIdentifier, managerIdentifier, managerType = null) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!teamIdentifier) throw new Error('OrgService: teamIdentifier is required.');
    if (!managerIdentifier) throw new Error('OrgService: managerIdentifier is required.');

    const resolvedTeamId = this._resolveTeamIdentifier(systemData, teamIdentifier);
    if (!resolvedTeamId) {
      throw new Error(`OrgService: Could not resolve team identifier "${teamIdentifier}".`);
    }

    const team = (systemData.teams || []).find((t) => t.teamId === resolvedTeamId);
    if (!team) {
      throw new Error(`OrgService: Team "${resolvedTeamId}" not found.`);
    }

    const previousSdmId = team.sdmId || null;
    const previousSeniorManagerId = team.seniorManagerId || null;

    // Auto-detect manager type if not specified
    let resolvedManagerType = managerType;
    let resolvedManagerId = null;

    if (!resolvedManagerType || resolvedManagerType === 'sdm') {
      resolvedManagerId = this._resolveSdmIdentifier(systemData, managerIdentifier);
      if (resolvedManagerId) {
        resolvedManagerType = 'sdm';
      }
    }

    if (!resolvedManagerId && (!resolvedManagerType || resolvedManagerType === 'seniorManager')) {
      resolvedManagerId = this._resolveSeniorManagerIdentifier(systemData, managerIdentifier);
      if (resolvedManagerId) {
        resolvedManagerType = 'seniorManager';
      }
    }

    if (!resolvedManagerId) {
      throw new Error(`OrgService: Could not resolve manager identifier "${managerIdentifier}".`);
    }

    // Apply the reassignment based on manager type
    if (resolvedManagerType === 'sdm') {
      team.sdmId = resolvedManagerId;
      team.seniorManagerId = null;
    } else {
      team.sdmId = null;
      team.seniorManagerId = resolvedManagerId;
    }

    console.log(
      `OrgService: Reassigned team ${resolvedTeamId} to ${resolvedManagerType} ${resolvedManagerId}`
    );

    return {
      teamId: resolvedTeamId,
      previousSdmId,
      previousSeniorManagerId,
      newManagerType: resolvedManagerType,
      newManagerId: resolvedManagerId,
    };
  },

  /**
   * Gets a summary count of all roster members.
   * @param {object} systemData
   * @returns {object} Counts by role type
   */
  getRosterSummary(systemData) {
    if (!systemData) return { total: 0 };

    const awayTeamCount = (systemData.teams || []).reduce(
      (sum, team) => sum + (team.awayTeamMembers || []).length,
      0
    );

    const summary = {
      engineers: (systemData.allKnownEngineers || []).length,
      awayTeam: awayTeamCount,
      sdms: (systemData.sdms || []).length,
      seniorManagers: (systemData.seniorManagers || []).length,
      pmts: (systemData.pmts || []).length,
      projectManagers: (systemData.projectManagers || []).length,
    };

    summary.total =
      summary.engineers +
      summary.awayTeam +
      summary.sdms +
      summary.seniorManagers +
      summary.pmts +
      summary.projectManagers;

    return summary;
  },

  /**
   * Adds a new service to the system.
   * @param {object} systemData
   * @param {object} serviceData - Optional overrides for service properties
   * @returns {object} The newly created service
   */
  addService(systemData, serviceData = {}) {
    if (!systemData) {
      throw new Error('OrgService.addService: systemData is required.');
    }
    if (!Array.isArray(systemData.services)) {
      systemData.services = [];
    }

    const newService = {
      serviceName: 'New Service ' + ((systemData.services?.length || 0) + 1),
      serviceDescription: '',
      owningTeamId: null,
      apis: [],
      serviceDependencies: [],
      platformDependencies: [],
      ...serviceData,
    };

    systemData.services.push(newService);
    console.log(`OrgService: Added service ${newService.serviceName}`);
    return newService;
  },

  /**
   * Deletes a service by name.
   * @param {object} systemData
   * @param {string} serviceName
   * @returns {object|null} The deleted service, or null if not found
   */
  deleteService(systemData, serviceName) {
    if (!systemData || !Array.isArray(systemData.services)) {
      throw new Error('OrgService.deleteService: systemData.services is unavailable.');
    }
    const serviceIndex = systemData.services.findIndex((s) => s.serviceName === serviceName);
    if (serviceIndex === -1) {
      console.warn(`OrgService.deleteService: Service "${serviceName}" not found.`);
      return null;
    }

    const deletedService = systemData.services.splice(serviceIndex, 1)[0];
    console.log(`OrgService: Deleted service ${serviceName}`);
    return deletedService;
  },

  /**
   * Bulk-reassigns teams from one SDM to another.
   * @param {object} systemData
   * @param {string} sourceSdmId
   * @param {string} targetSdmId
   * @returns {object} Summary of reassignments
   */
  bulkReassignTeams(systemData, sourceSdmId, targetSdmId) {
    if (!systemData || !Array.isArray(systemData.teams)) {
      throw new Error('OrgService.bulkReassignTeams: systemData.teams is unavailable.');
    }
    const resolvedSource = this._resolveSdmIdentifier(systemData, sourceSdmId);
    const resolvedTarget = this._resolveSdmIdentifier(systemData, targetSdmId);
    if (!resolvedSource)
      throw new Error(`bulkReassignTeams: Could not resolve source SDM "${sourceSdmId}".`);
    if (!resolvedTarget)
      throw new Error(`bulkReassignTeams: Could not resolve target SDM "${targetSdmId}".`);
    if (resolvedSource === resolvedTarget)
      throw new Error('bulkReassignTeams: Source and target SDM IDs are the same.');

    const movedTeams = systemData.teams.filter((team) => team.sdmId === resolvedSource);
    movedTeams.forEach((team) => {
      team.sdmId = resolvedTarget;
    });

    console.log(
      `OrgService: Moved ${movedTeams.length} teams from ${resolvedSource} to ${resolvedTarget}`
    );
    return {
      movedTeamIds: movedTeams.map((t) => t.teamId),
      movedTeamNames: movedTeams.map((t) => t.teamIdentity || t.teamName || t.teamId),
      sourceSdmId: resolvedSource,
      targetSdmId: resolvedTarget,
    };
  },

  /**
   * Adds a new SDM.
   * @param {object} systemData
   * @param {string} name
   * @param {string|null} seniorManagerId
   */
  addSdm(systemData, name, seniorManagerId = null) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!name || !name.trim()) throw new Error('OrgService: SDM name is required.');

    const normalizedName = name.trim();
    if (!Array.isArray(systemData.sdms)) {
      systemData.sdms = [];
    }
    if (
      systemData.sdms.some((s) => (s.sdmName || '').toLowerCase() === normalizedName.toLowerCase())
    ) {
      throw new Error(`SDM "${normalizedName}" already exists.`);
    }

    if (
      seniorManagerId &&
      !(systemData.seniorManagers || []).some((s) => s.seniorManagerId === seniorManagerId)
    ) {
      const resolvedId = this._resolveSeniorManagerIdentifier(systemData, seniorManagerId);
      if (resolvedId) {
        seniorManagerId = resolvedId;
      }
    }

    if (
      seniorManagerId &&
      !(systemData.seniorManagers || []).some((s) => s.seniorManagerId === seniorManagerId)
    ) {
      throw new Error(
        `OrgService: Cannot assign to non-existent seniorManagerId "${seniorManagerId}".`
      );
    }

    const newSdm = {
      sdmId: this._generateIncrementalId(systemData.sdms, 'sdmId', 'sdm'),
      sdmName: normalizedName,
      seniorManagerId: seniorManagerId || null,
      attributes: {},
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
    if (!systemData || !Array.isArray(systemData.sdms))
      throw new Error('OrgService: SDM data is not loaded.');
    if (!sdmId) throw new Error('OrgService: sdmId is required.');

    const sdmIndex = systemData.sdms.findIndex((s) => s.sdmId === sdmId);
    if (sdmIndex === -1) throw new Error(`OrgService: SDM with ID "${sdmId}" not found.`);

    if (
      updates.seniorManagerId &&
      !(systemData.seniorManagers || []).some((s) => s.seniorManagerId === updates.seniorManagerId)
    ) {
      const resolvedId = this._resolveSeniorManagerIdentifier(systemData, updates.seniorManagerId);
      if (resolvedId) {
        updates.seniorManagerId = resolvedId;
      }
    }
    if (
      updates.seniorManagerId &&
      !(systemData.seniorManagers || []).some((s) => s.seniorManagerId === updates.seniorManagerId)
    ) {
      throw new Error(
        `OrgService: Cannot assign to non-existent seniorManagerId "${updates.seniorManagerId}".`
      );
    }

    const sdm = systemData.sdms[sdmIndex];
    Object.assign(sdm, updates);
    return sdm;
  },

  /**
   * Deletes an SDM.
   * @param {object} systemData
   * @param {string} sdmId
   * @param {string|null} reassignTeamsToSdmId
   */
  deleteSdm(systemData, sdmId, reassignTeamsToSdmId = null) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!sdmId) throw new Error('OrgService: sdmId is required.');

    const sdms = systemData.sdms || [];
    const index = sdms.findIndex((s) => s.sdmId === sdmId);
    if (index === -1) throw new Error(`OrgService: SDM with ID "${sdmId}" not found.`);

    if (reassignTeamsToSdmId) {
      const targetSdm = this._resolveSdmIdentifier(systemData, reassignTeamsToSdmId);
      if (!targetSdm) {
        throw new Error(
          `OrgService: Cannot reassign teams to non-existent sdmId "${reassignTeamsToSdmId}".`
        );
      }
      reassignTeamsToSdmId = targetSdm;
    }

    const deletedSdm = sdms.splice(index, 1)[0];

    // Reassign or orphan teams
    (systemData.teams || []).forEach((team) => {
      if (team.sdmId === sdmId) {
        team.sdmId = reassignTeamsToSdmId || null;
      }
    });

    console.log(`OrgService: Deleted SDM ${sdmId}`);
    return { deleted: true, sdm: deletedSdm };
  },

  /**
   * Reassigns a team to a new SDM.
   * @param {object} systemData
   * @param {string} teamIdentifier
   * @param {string} newSdmIdentifier
   */
  reassignTeamToSdm(systemData, teamIdentifier, newSdmIdentifier) {
    if (!systemData || !Array.isArray(systemData.teams))
      throw new Error('OrgService: Team data is not loaded.');

    const resolvedTeamId = this._resolveTeamIdentifier(systemData, teamIdentifier);
    if (!resolvedTeamId)
      throw new Error(`OrgService: Could not resolve team identifier "${teamIdentifier}".`);

    const team = systemData.teams.find((t) => t.teamId === resolvedTeamId);
    if (!team) throw new Error(`OrgService: Team with ID "${resolvedTeamId}" not found.`);

    const resolvedSdmId = this._resolveSdmIdentifier(systemData, newSdmIdentifier);
    if (!resolvedSdmId)
      throw new Error(`OrgService: Could not resolve SDM identifier "${newSdmIdentifier}".`);

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
    if (!systemData || !Array.isArray(systemData.sdms))
      throw new Error('OrgService: SDM data is not loaded.');

    const resolvedSdmId = this._resolveSdmIdentifier(systemData, sdmIdentifier);
    if (!resolvedSdmId)
      throw new Error(`OrgService: Could not resolve SDM identifier "${sdmIdentifier}".`);

    const sourceSdm = (systemData.sdms || []).find((sdm) => sdm.sdmId === resolvedSdmId);
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
        const destSdm = (systemData.sdms || []).find((sdm) => sdm.sdmId === resolved);
        destinationSeniorManagerId = destSdm ? destSdm.seniorManagerId || null : null;
        destinationType = 'sdm';
        return true;
      }
      return false;
    };

    if (destinationType === 'seniorManager') {
      if (!resolveDestinationAsSeniorManager()) {
        throw new Error(
          `OrgService: Destination senior manager "${destinationIdentifier}" not found.`
        );
      }
    } else if (destinationType === 'sdm') {
      if (!resolveDestinationAsSdm()) {
        throw new Error(`OrgService: Destination SDM "${destinationIdentifier}" not found.`);
      }
    } else {
      if (!resolveDestinationAsSeniorManager()) {
        if (!resolveDestinationAsSdm()) {
          throw new Error(
            `OrgService: Could not resolve destination identifier "${destinationIdentifier}" to an SDM or Senior Manager.`
          );
        }
      }
    }

    const affectedTeams = (systemData.teams || []).filter((team) => team.sdmId === resolvedSdmId);
    const previousSeniorManagerId = sourceSdm.seniorManagerId || null;
    sourceSdm.seniorManagerId = destinationSeniorManagerId || null;

    return {
      sdmId: resolvedSdmId,
      destinationType,
      destinationSeniorManagerId: sourceSdm.seniorManagerId,
      destinationSdmId,
      previousSeniorManagerId,
      movedTeamIds: affectedTeams.map((team) => team.teamId),
      movedTeamNames: affectedTeams.map(
        (team) => team.teamIdentity || team.teamName || team.teamId
      ),
    };
  },

  /**
   * Deletes a Senior Manager.
   * @param {object} systemData
   * @param {string} seniorManagerId
   * @param {string|null} reassignToSeniorManagerId
   */
  deleteSeniorManager(systemData, seniorManagerId, reassignToSeniorManagerId = null) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!seniorManagerId) throw new Error('OrgService: seniorManagerId is required.');

    const srManagers = systemData.seniorManagers || [];
    const index = srManagers.findIndex((sm) => sm.seniorManagerId === seniorManagerId);
    if (index === -1)
      throw new Error(`OrgService: Senior manager with ID "${seniorManagerId}" not found.`);

    if (reassignToSeniorManagerId) {
      if (!srManagers.some((sm) => sm.seniorManagerId === reassignToSeniorManagerId)) {
        throw new Error(
          `OrgService: Cannot reassign to non-existent seniorManagerId "${reassignToSeniorManagerId}".`
        );
      }
    }

    const deletedSrMgr = srManagers.splice(index, 1)[0];

    (systemData.sdms || []).forEach((sdm) => {
      if (sdm.seniorManagerId === seniorManagerId) {
        sdm.seniorManagerId = reassignToSeniorManagerId || null;
      }
    });

    return { deleted: true, seniorManager: deletedSrMgr };
  },

  /**
   * Adds a new project manager.
   * @param {object} systemData
   * @param {string} name
   * @param {object} attributes
   */
  addProjectManager(systemData, name, attributes = {}) {
    if (!systemData) throw new Error('OrgService: systemData is required.');
    if (!name || !name.trim()) throw new Error('OrgService: Project Manager name is required.');

    const normalizedName = name.trim();
    if (!Array.isArray(systemData.projectManagers)) {
      systemData.projectManagers = [];
    }
    if (
      systemData.projectManagers.some(
        (pm) => (pm.pmName || '').toLowerCase() === normalizedName.toLowerCase()
      )
    ) {
      throw new Error(`Project Manager "${normalizedName}" already exists.`);
    }

    const newPm = {
      pmId: this._generateIncrementalId(systemData.projectManagers, 'pmId', 'pm'),
      pmName: normalizedName,
      attributes: attributes,
    };

    systemData.projectManagers.push(newPm);
    console.log(`OrgService: Added Project Manager ${newPm.pmId}`);
    return newPm;
  },

  /**
   * Updates a project manager.
   * @param {object} systemData
   * @param {string} pmId
   * @param {object} updates
   */
  updateProjectManager(systemData, pmId, updates = {}) {
    if (!systemData || !Array.isArray(systemData.projectManagers))
      throw new Error('OrgService: Project Manager data is not loaded.');
    if (!pmId) throw new Error('OrgService: pmId is required.');

    const pm = systemData.projectManagers.find((p) => p.pmId === pmId);
    if (!pm) throw new Error(`OrgService: Project Manager with ID "${pmId}" not found.`);

    if (updates.pmName) {
      const normalizedName = updates.pmName.trim();
      if (
        systemData.projectManagers.some(
          (p) => p.pmId !== pmId && (p.pmName || '').toLowerCase() === normalizedName.toLowerCase()
        )
      ) {
        throw new Error(`Project Manager "${normalizedName}" already exists.`);
      }
      updates.pmName = normalizedName;
    }

    Object.assign(pm, updates);
    console.log(`OrgService: Updated Project Manager ${pmId}`);
    return pm;
  },

  /**
   * Deletes a project manager.
   * @param {object} systemData
   * @param {string} pmId
   */
  deleteProjectManager(systemData, pmId) {
    if (!systemData || !Array.isArray(systemData.projectManagers))
      throw new Error('OrgService: Project Manager data is not loaded.');
    if (!pmId) throw new Error('OrgService: pmId is required.');

    const index = systemData.projectManagers.findIndex((p) => p.pmId === pmId);
    if (index === -1) throw new Error(`OrgService: Project Manager with ID "${pmId}" not found.`);

    const deletedPm = systemData.projectManagers.splice(index, 1)[0];
    console.log(`OrgService: Deleted Project Manager ${pmId}`);
    return deletedPm;
  },

  // --- Private / Internal Helpers ---

  _generateIncrementalId(collection = [], idField, prefix) {
    const regex = new RegExp(`^${prefix}(\\d+)$`);
    let maxNumeric = 0;
    collection.forEach((item) => {
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

    const directMatch = managers.find(
      (sm) => (sm.seniorManagerId || '').toLowerCase() === String(identifier).toLowerCase()
    );
    if (directMatch) return directMatch.seniorManagerId;

    const placeholderMatch =
      typeof identifier === 'string' ? identifier.match(/^{{seniorManagerId_(.+)}}$/) : null;
    if (placeholderMatch) {
      identifier = placeholderMatch[1];
    }

    const sanitizedInput = this._normalizeNameForLookup(identifier.replace(/^srMgr[-_]?/i, ''));
    if (!sanitizedInput) return null;

    const nameMatch = managers.find(
      (sm) => this._normalizeNameForLookup(sm.seniorManagerName) === sanitizedInput
    );
    return nameMatch ? nameMatch.seniorManagerId : null;
  },

  _resolveSdmIdentifier(systemData, identifier) {
    if (!identifier) return null;
    const sdms = systemData?.sdms || [];
    if (sdms.length === 0) return null;

    const identifierStr = String(identifier).trim();
    const directMatch = sdms.find(
      (sdm) => (sdm.sdmId || '').toLowerCase() === identifierStr.toLowerCase()
    );
    if (directMatch) return directMatch.sdmId;

    let lookupValue = identifierStr;
    const placeholderMatch =
      typeof identifierStr === 'string' ? identifierStr.match(/^{{sdmId_(.+)}}$/) : null;
    if (placeholderMatch) {
      lookupValue = placeholderMatch[1];
    }

    const sanitizedInput = this._normalizeNameForLookup(lookupValue);
    if (!sanitizedInput) return null;

    const matches = sdms.filter((sdm) => {
      const normalizedName = this._normalizeNameForLookup(sdm.sdmName);
      if (!normalizedName) return false;
      return (
        normalizedName === sanitizedInput ||
        normalizedName.startsWith(sanitizedInput) ||
        sanitizedInput.startsWith(normalizedName)
      );
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
    const directMatch = teams.find(
      (team) => (team.teamId || '').toLowerCase() === identifierStr.toLowerCase()
    );
    if (directMatch) return directMatch.teamId;

    let lookupValue = identifierStr;
    const placeholderMatch =
      typeof identifierStr === 'string' ? identifierStr.match(/^{{teamId_(.+)}}$/) : null;
    if (placeholderMatch) {
      lookupValue = placeholderMatch[1];
    }

    const sanitizedInput = this._normalizeNameForLookup(lookupValue);
    if (!sanitizedInput) return null;

    const matches = teams.filter((team) => {
      const normalizedIdentity = this._normalizeNameForLookup(team.teamIdentity);
      const normalizedName = this._normalizeNameForLookup(team.teamName);
      const candidates = [normalizedIdentity, normalizedName].filter(Boolean);
      return candidates.some(
        (candidate) =>
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
  },
};

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrgService;
}
