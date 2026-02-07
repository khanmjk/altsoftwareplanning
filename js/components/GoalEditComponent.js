/**
 * GoalEditComponent
 * Encapsulates the logic for rendering and managing the Strategic Goals list.
 * Modeled after InitiativeEditComponent for consistent UX.
 */
class GoalEditComponent {
  constructor(containerId, systemData) {
    this.containerId = containerId;
    this.systemData = systemData;
    this.expandedIndex = -1;
    this.draftGoal = null; // New property for draft mode
    this.goalInspectionDrafts = new Map();
  }

  startNewGoal() {
    if (this.draftGoal) {
      notificationManager.showToast('You already have an unsaved goal.', 'warning');
      return;
    }

    this.draftGoal = {
      goalId: 'goal-' + Date.now(),
      name: 'New Strategic Goal',
      description: '',
      strategyLink: '',
      owner: null,
      projectManager: null,
      technicalPOC: null,
      initiativeIds: [],
      attributes: {},
      dueDate: null,
    };

    this.expandedIndex = 'draft'; // Special index for draft
    this.render();

    // Scroll to bottom
    setTimeout(() => {
      const container = document.getElementById(this.containerId);
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`GoalEditComponent: Container '${this.containerId}' not found.`);
      return;
    }
    this._clearElement(container);
    container.className = 'inline-edit-list';

    if (!this.systemData.goals) {
      this.systemData.goals = [];
    }

    GoalService.refreshAllGoalDates(this.systemData);

    const hasItems = this.systemData.goals.length > 0;
    const hasDraft = !!this.draftGoal;

    if (!hasItems && !hasDraft) {
      const empty = document.createElement('p');
      empty.className = 'inline-edit-list-empty';
      empty.textContent = 'No strategic goals defined. Click "Add Goal" to create one.';
      container.appendChild(empty);
      return;
    }

    // Render existing items
    this.systemData.goals.forEach((goal, index) => {
      container.appendChild(this._createGoalItem(goal, index));
    });

    // Render draft item if exists
    if (this.draftGoal) {
      container.appendChild(this._createGoalItem(this.draftGoal, 'draft'));
    }
  }

  _createGoalItem(goal, index) {
    const isDraft = index === 'draft';
    const itemDiv = document.createElement('div');
    itemDiv.className = 'inline-edit-item';
    itemDiv.setAttribute('data-goal-index', index);

    // Header
    const header = document.createElement('div');
    header.className = 'inline-edit-header';

    const indicator = document.createElement('span');
    indicator.className = 'inline-edit-indicator';
    indicator.innerText = index === this.expandedIndex ? '- ' : '+ ';

    const titleText = document.createElement('span');
    titleText.className = 'inline-edit-title';
    titleText.innerText = goal.name || 'New Goal';
    if (isDraft) titleText.innerText += ' (Unsaved)';

    const statusMeta = this._resolveGoalStatusMeta(goal, isDraft);
    const statusPill = document.createElement('span');
    statusPill.className = `goal-status-pill ${statusMeta.className}`;
    statusPill.innerText = statusMeta.label;
    statusPill.title = statusMeta.message;

    const ownerInspectionMeta = this._resolveOwnerInspectionMeta(goal, isDraft);
    const ownerInspectionPill = document.createElement('span');
    ownerInspectionPill.className = `goal-status-pill ${ownerInspectionMeta.className}`;
    ownerInspectionPill.innerText = ownerInspectionMeta.label;
    ownerInspectionPill.title = ownerInspectionMeta.message;

    header.appendChild(indicator);
    header.appendChild(titleText);
    header.appendChild(statusPill);
    header.appendChild(ownerInspectionPill);

    // Details Container
    const details = document.createElement('div');
    details.className = 'inline-edit-details';
    if (index === this.expandedIndex) {
      details.classList.add('expanded');
    }

    // Toggle Logic
    header.onclick = () => {
      const isExpanded = details.classList.contains('expanded');
      if (isExpanded) {
        details.classList.remove('expanded');
        indicator.innerText = '+ ';
        this.expandedIndex = -1;
      } else {
        details.classList.add('expanded');
        indicator.innerText = '- ';
        this.expandedIndex = index;
      }
    };

    // --- Content Generation ---

    // 1. General Info
    details.appendChild(this._createFormGroup('Goal Name', 'input', 'name', goal.name, index));
    details.appendChild(
      this._createFormGroup('Description', 'textarea', 'description', goal.description, index)
    );
    details.appendChild(
      this._createFormGroup('Strategy Link (URL)', 'url', 'strategyLink', goal.strategyLink, index)
    );
    details.appendChild(this._createFormGroup('Due Date', 'date', 'dueDate', goal.dueDate, index));
    details.appendChild(this._createInspectionSection(goal, index, isDraft));

    // 2. People
    const grid = document.createElement('div');
    grid.className = 'inline-edit-grid';

    const owners = [
      ...(this.systemData.seniorManagers || []).map((p) => ({
        value: `seniorManager:${p.seniorManagerId}`,
        text: `${p.seniorManagerName} (Sr Mgr)`,
      })),
      ...(this.systemData.sdms || []).map((p) => ({
        value: `sdm:${p.sdmId}`,
        text: `${p.sdmName} (SDM)`,
      })),
      ...(this.systemData.pmts || []).map((p) => ({
        value: `pmt:${p.pmtId}`,
        text: `${p.pmtName} (PMT)`,
      })),
    ];
    const currentOwnerVal = goal.owner ? `${goal.owner.type}:${goal.owner.id}` : '';
    grid.appendChild(
      this._createSelectGroup('Owner', 'owner', currentOwnerVal, owners, index, true)
    );

    const pms = (this.systemData.projectManagers || []).map((p) => ({
      value: `projectManager:${p.pmId}`,
      text: `${p.pmName} (PgM)`,
    }));
    const currentPmVal = goal.projectManager
      ? `${goal.projectManager.type}:${goal.projectManager.id}`
      : '';
    grid.appendChild(
      this._createSelectGroup('Project Manager', 'projectManager', currentPmVal, pms, index, true)
    );

    const tpocs = (this.systemData.sdms || []).map((p) => ({
      value: `sdm:${p.sdmId}`,
      text: `${p.sdmName} (SDM)`,
    }));
    const currentTpocVal = goal.technicalPOC
      ? `${goal.technicalPOC.type}:${goal.technicalPOC.id}`
      : '';
    grid.appendChild(
      this._createSelectGroup('Technical POC', 'technicalPOC', currentTpocVal, tpocs, index, true)
    );

    details.appendChild(grid);

    // 3. Strategic Context (Themes & ROI)
    const contextGrid = document.createElement('div');
    contextGrid.className = 'inline-edit-grid';

    // Related Themes (Dynamic - Derived from Linked Initiatives)
    // Logic: Find all linked initiatives -> collect their themes -> unique list
    const linkedInitiatives = (this.systemData.yearlyInitiatives || []).filter((i) =>
      (goal.initiativeIds || []).includes(i.initiativeId)
    );

    const uniqueThemeIds = new Set();
    linkedInitiatives.forEach((init) => {
      if (init.themes && Array.isArray(init.themes)) {
        init.themes.forEach((tId) => uniqueThemeIds.add(tId));
      }
    });

    const relatedThemes = (this.systemData.definedThemes || []).filter((t) =>
      uniqueThemeIds.has(t.themeId)
    );

    const themesDiv = document.createElement('div');
    themesDiv.className = 'inline-edit-form-group';
    const themesLabel = document.createElement('label');
    themesLabel.className = 'inline-edit-label';
    themesLabel.textContent = 'Related Themes (via Initiatives)';
    const themesValue = document.createElement('div');
    themesValue.className = 'inline-edit-static-value';
    if (relatedThemes.length > 0) {
      relatedThemes.forEach((theme) => {
        const tag = document.createElement('span');
        tag.className = 'goal-theme-tag';
        tag.textContent = theme.name;
        themesValue.appendChild(tag);
      });
    } else {
      const emptyTheme = document.createElement('span');
      emptyTheme.className = 'text-muted';
      emptyTheme.textContent = 'No themes linked via initiatives.';
      themesValue.appendChild(emptyTheme);
    }
    themesDiv.append(themesLabel, themesValue);
    contextGrid.appendChild(themesDiv);

    // Aggregated ROI (Read-Only)
    let roiSummary = 'No linked initiatives.';

    if (linkedInitiatives.length > 0) {
      const roiMap = {};
      linkedInitiatives.forEach((init) => {
        if (init.roi && init.roi.category) {
          if (!roiMap[init.roi.category]) roiMap[init.roi.category] = 0;
          roiMap[init.roi.category]++;
        }
      });

      const roiParts = Object.entries(roiMap).map(([cat, count]) => `${count} ${cat}`);
      if (roiParts.length > 0) {
        roiSummary = roiParts.join(', ');
      } else {
        roiSummary = `${linkedInitiatives.length} initiatives (No ROI data)`;
      }
    }

    const roiDiv = document.createElement('div');
    roiDiv.className = 'inline-edit-form-group';
    const roiLabel = document.createElement('label');
    roiLabel.className = 'inline-edit-label';
    roiLabel.textContent = 'Aggregated ROI Impact';
    const roiValue = document.createElement('div');
    roiValue.className = 'inline-edit-static-value';
    const roiStrong = document.createElement('strong');
    roiStrong.textContent = roiSummary;
    roiValue.appendChild(roiStrong);
    roiDiv.append(roiLabel, roiValue);
    contextGrid.appendChild(roiDiv);

    details.appendChild(contextGrid);

    // 4. Linked Initiatives
    const initiativesOptions = (this.systemData.yearlyInitiatives || []).map((i) => ({
      value: i.initiativeId,
      text: i.title || 'Untitled Initiative',
    }));

    // Ensure goal.initiativeIds is initialized
    if (!goal.initiativeIds) goal.initiativeIds = [];

    details.appendChild(
      this._createMultiSelectGroup(
        'Linked Initiatives',
        'initiativeIds',
        goal.initiativeIds,
        initiativesOptions,
        index
      )
    );

    // Action Buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'inline-edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.innerText = isDraft ? 'Create Goal' : 'Save Changes';
    saveBtn.onclick = () => this._saveGoal(index);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.innerText = isDraft ? 'Cancel' : 'Delete Goal';
    deleteBtn.onclick = () => this._deleteGoal(index);

    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(deleteBtn);
    details.appendChild(actionsDiv);

    itemDiv.appendChild(header);
    itemDiv.appendChild(details);

    return itemDiv;
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  _createFormGroup(labelText, inputType, fieldName, value, index) {
    const group = document.createElement('div');
    group.className = 'inline-edit-form-group';

    const label = document.createElement('label');
    label.className = 'inline-edit-label';
    label.innerText = labelText;

    let input;
    if (inputType === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'inline-edit-textarea';
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.className = 'inline-edit-input';
      input.type = inputType;
    }

    input.value = value || '';
    input.setAttribute('data-goal-index', index);
    input.setAttribute('data-field', fieldName);

    input.addEventListener('change', (e) => this._updateField(index, fieldName, e.target.value));

    group.appendChild(label);
    group.appendChild(input);
    return group;
  }

  _createSelectGroup(labelText, fieldName, selectedValue, options, index, hasNoneOption = false) {
    const group = document.createElement('div');
    group.className = 'inline-edit-form-group';

    const label = document.createElement('label');
    label.className = 'inline-edit-label';
    label.innerText = labelText;

    // Build options array for ThemedSelect
    const selectOptions = [];
    const optionLabelByValue = new Map();
    if (hasNoneOption) {
      selectOptions.push({ value: '', text: '-- None --' });
      optionLabelByValue.set('', '-- None --');
    }
    options.forEach((opt) => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const text = typeof opt === 'string' ? opt : opt.text;
      selectOptions.push({ value: val, text: text });
      optionLabelByValue.set(val, text);
    });

    const selectContainer = document.createElement('div');
    selectContainer.className = 'inline-edit-select-container';

    const themedSelect = new ThemedSelect({
      options: selectOptions,
      value: selectedValue || '',
      id: `goal-${index}-${fieldName}`,
      onChange: (val) => {
        // Handle Person special parsing
        if (['owner', 'projectManager', 'technicalPOC'].includes(fieldName)) {
          if (val) {
            const [type, id] = val.split(':');
            val = {
              type,
              id,
              name: this._stripRoleSuffix(optionLabelByValue.get(val) || ''),
            };
          } else {
            val = null;
          }
        }
        this._updateField(index, fieldName, val);
      },
    });

    selectContainer.appendChild(themedSelect.render());
    group.appendChild(label);
    group.appendChild(selectContainer);
    return group;
  }

  _createMultiSelectGroup(labelText, fieldName, selectedValues, options, index) {
    const group = document.createElement('div');
    group.className = 'inline-edit-form-group';

    const label = document.createElement('label');
    label.className = 'inline-edit-label';
    label.innerText = labelText;

    const selectContainer = document.createElement('div');
    selectContainer.className = 'inline-edit-select-container';

    const themedSelect = new ThemedSelect({
      options,
      value: Array.isArray(selectedValues) ? selectedValues : [],
      id: `goal-${index}-${fieldName}`,
      multiple: true,
      placeholder: 'Select initiatives...',
      onChange: (values) => {
        this._updateField(index, fieldName, Array.isArray(values) ? values : []);
      },
    });

    const helpText = document.createElement('small');
    helpText.className = 'inline-edit-help-text';
    helpText.innerText = 'Select one or more initiatives.';

    group.appendChild(label);
    selectContainer.appendChild(themedSelect.render());
    group.appendChild(selectContainer);
    group.appendChild(helpText);
    return group;
  }

  _updateField(index, fieldName, value) {
    let goal;
    if (index === 'draft') {
      goal = this.draftGoal;
    } else {
      goal = this.systemData.goals[index];
    }

    if (!goal) return;

    if (fieldName === 'initiativeIds') {
      const oldIds = goal.initiativeIds || [];
      const newIds = value;

      if (index !== 'draft') {
        const addedIds = newIds.filter((id) => !oldIds.includes(id));
        const removedIds = oldIds.filter((id) => !newIds.includes(id));

        addedIds.forEach((initId) => {
          const init = (this.systemData.yearlyInitiatives || []).find(
            (i) => i.initiativeId === initId
          );
          if (init) {
            init.primaryGoalId = goal.goalId;
          }
        });

        removedIds.forEach((initId) => {
          const init = (this.systemData.yearlyInitiatives || []).find(
            (i) => i.initiativeId === initId
          );
          if (init && init.primaryGoalId === goal.goalId) {
            init.primaryGoalId = null;
          }
        });
      }

      goal.initiativeIds = newIds;

      if (index !== 'draft' && goal.goalId) {
        GoalService.refreshGoalDates(this.systemData, goal.goalId);
      }

      this.render();
    } else {
      goal[fieldName] = value;
      if (index !== 'draft' && goal.goalId && fieldName === 'dueDate') {
        GoalService.refreshGoalDates(this.systemData, goal.goalId);
        this.render();
        return;
      }
    }

    // Update Header if Name changed
    if (fieldName === 'name') {
      const item = document.querySelector(`.inline-edit-item[data-goal-index="${index}"]`);
      if (item) {
        let title = value || 'New Goal';
        if (index === 'draft') title += ' (Unsaved)';
        item.querySelector('.inline-edit-title').innerText = title;
      }
    }
  }

  async _deleteGoal(index) {
    if (index === 'draft') {
      this.draftGoal = null;
      this.expandedIndex = -1;
      this.render();
      return;
    }

    if (
      await notificationManager.confirm(
        'Are you sure you want to delete this goal?',
        'Delete Goal',
        { confirmStyle: 'danger' }
      )
    ) {
      const goal = this.systemData.goals[index];
      if (goal?.goalId) {
        this.goalInspectionDrafts.delete(goal.goalId);
      }

      // Unlink initiatives
      if (goal && goal.initiativeIds) {
        goal.initiativeIds.forEach((initId) => {
          const init = (this.systemData.yearlyInitiatives || []).find(
            (i) => i.initiativeId === initId
          );
          if (init && init.primaryGoalId === goal.goalId) {
            init.primaryGoalId = null;
          }
        });
      }

      if (goal?.goalId) {
        GoalService.deleteGoal(this.systemData, goal.goalId);
      } else {
        this.systemData.goals.splice(index, 1);
      }
      SystemService.save();
      this.render();
      notificationManager.showToast('Goal deleted.', 'success');
    }
  }

  _saveGoal(index) {
    let goal;
    if (index === 'draft') {
      goal = this.draftGoal;
    } else {
      goal = this.systemData.goals[index];
    }

    if (!goal.name || goal.name.trim() === '') {
      notificationManager.showToast('Goal Name is required.', 'warning');
      return;
    }

    if (index === 'draft') {
      const createdGoal = GoalService.addGoal(this.systemData, goal) || goal;

      this._syncInitiativeLinks(createdGoal);
      this.draftGoal = null;
      this.expandedIndex = -1;
      notificationManager.showToast('Goal created successfully.', 'success');
      this.render();
    } else {
      const inspectionResult = this._persistGoalInspectionDraft(goal, {
        notifyOnSuccess: false,
      });
      if (!inspectionResult.success) {
        notificationManager.showToast(
          inspectionResult.error || 'Could not save goal inspection update.',
          'warning'
        );
        return;
      }

      if (goal.goalId) {
        GoalService.updateGoal(this.systemData, goal.goalId, goal);
      }
      notificationManager.showToast('Goal saved successfully.', 'success');
    }

    GoalService.refreshAllGoalDates(this.systemData);
    SystemService.save();
  }

  _createInspectionSection(goal, index, isDraft) {
    const section = document.createElement('div');
    section.className = 'goal-inspection-section';

    const title = document.createElement('h4');
    title.className = 'goal-inspection-section__title';
    title.textContent = 'Weekly Goal Inspection';
    section.appendChild(title);

    if (isDraft) {
      const draftInfo = document.createElement('p');
      draftInfo.className = 'goal-inspection-section__meta';
      draftInfo.textContent = 'Save this goal first, then add weekly owner check-ins.';
      section.appendChild(draftInfo);
      return section;
    }

    const inspectionStatus = GoalService.getGoalInspectionStatus(goal, { now: new Date() });
    const latestCheckIn = GoalService.getLatestGoalCheckIn(goal);
    const draftState = this.goalInspectionDrafts.get(goal.goalId) || {};

    const meta = document.createElement('p');
    meta.className = 'goal-inspection-section__meta';
    const lastUpdatedText = inspectionStatus.lastCheckInAt
      ? inspectionStatus.lastCheckInAt.slice(0, 10)
      : 'never';
    const staleText = inspectionStatus.isStale ? 'Stale' : 'Fresh';
    const mismatchText = inspectionStatus.hasMismatch ? 'Mismatch with computed status' : 'Aligned';
    meta.textContent = `Last update: ${lastUpdatedText} | ${staleText} | ${mismatchText}`;
    section.appendChild(meta);

    const formGrid = document.createElement('div');
    formGrid.className = 'inline-edit-grid';
    section.appendChild(formGrid);

    const statusOptions = [
      { value: GoalService.INSPECTION_STATUS.ON_TRACK, text: 'On Track' },
      { value: GoalService.INSPECTION_STATUS.SLIPPING, text: 'Slipping' },
      { value: GoalService.INSPECTION_STATUS.AT_RISK, text: 'At Risk' },
      { value: GoalService.INSPECTION_STATUS.LATE, text: 'Late' },
      { value: GoalService.INSPECTION_STATUS.BLOCKED, text: 'Blocked' },
      { value: GoalService.INSPECTION_STATUS.ACHIEVED, text: 'Achieved' },
    ];

    const state = {
      ownerStatus: latestCheckIn?.ownerStatus || GoalService.INSPECTION_STATUS.ON_TRACK,
      weekEnding: latestCheckIn?.weekEnding || this._todayIsoDate(),
      confidence:
        typeof latestCheckIn?.confidence === 'number' ? String(latestCheckIn.confidence) : '',
      comment: latestCheckIn?.comment || '',
      ptg: latestCheckIn?.ptg || '',
      ptgTargetDate: latestCheckIn?.ptgTargetDate || '',
      blockers: latestCheckIn?.blockers || '',
      asks: latestCheckIn?.asks || '',
      dirty: false,
      ...draftState,
    };

    const persistDraft = () => {
      this.goalInspectionDrafts.set(goal.goalId, { ...state, dirty: true });
    };

    const statusGroup = document.createElement('div');
    statusGroup.className = 'inline-edit-form-group';
    const statusLabel = document.createElement('label');
    statusLabel.className = 'inline-edit-label';
    statusLabel.textContent = 'Owner Status';
    const statusSelectContainer = document.createElement('div');
    statusSelectContainer.className = 'inline-edit-select-container';
    const ownerStatusSelect = new ThemedSelect({
      options: statusOptions,
      value: state.ownerStatus,
      id: `goal-inspection-status-${index}`,
      onChange: (value) => {
        state.ownerStatus = value || GoalService.INSPECTION_STATUS.ON_TRACK;
        persistDraft();
      },
    });
    statusSelectContainer.appendChild(ownerStatusSelect.render());
    statusGroup.appendChild(statusLabel);
    statusGroup.appendChild(statusSelectContainer);
    formGrid.appendChild(statusGroup);

    formGrid.appendChild(
      this._createInspectionInputGroup({
        label: 'Week Ending',
        type: 'date',
        value: state.weekEnding,
        onChange: (value) => {
          state.weekEnding = value;
          persistDraft();
        },
      })
    );

    formGrid.appendChild(
      this._createInspectionInputGroup({
        label: 'Confidence (%)',
        type: 'number',
        min: '0',
        max: '100',
        step: '1',
        value: state.confidence,
        onChange: (value) => {
          state.confidence = value;
          persistDraft();
        },
      })
    );

    formGrid.appendChild(
      this._createInspectionInputGroup({
        label: 'PTG Target Date',
        type: 'date',
        value: state.ptgTargetDate,
        onChange: (value) => {
          state.ptgTargetDate = value;
          persistDraft();
        },
      })
    );

    section.appendChild(
      this._createInspectionTextareaGroup('Owner Comment', state.comment, (value) => {
        state.comment = value;
        persistDraft();
      })
    );
    section.appendChild(
      this._createInspectionTextareaGroup('Path to Green (PTG)', state.ptg, (value) => {
        state.ptg = value;
        persistDraft();
      })
    );
    section.appendChild(
      this._createInspectionTextareaGroup('Blockers', state.blockers, (value) => {
        state.blockers = value;
        persistDraft();
      })
    );
    section.appendChild(
      this._createInspectionTextareaGroup('Leadership Asks', state.asks, (value) => {
        state.asks = value;
        persistDraft();
      })
    );

    const actionBar = document.createElement('div');
    actionBar.className = 'goal-inspection-section__actions';

    const saveInspectionBtn = document.createElement('button');
    saveInspectionBtn.type = 'button';
    saveInspectionBtn.className = 'btn btn-secondary btn-sm';
    saveInspectionBtn.textContent = 'Log Weekly Check-In';
    saveInspectionBtn.addEventListener('click', () =>
      this._saveGoalInspection(index, {
        ownerStatus: state.ownerStatus,
        weekEnding: state.weekEnding,
        confidence: state.confidence === '' ? null : Number(state.confidence),
        comment: state.comment,
        ptg: state.ptg,
        ptgTargetDate: state.ptgTargetDate || null,
        blockers: state.blockers,
        asks: state.asks,
      })
    );
    actionBar.appendChild(saveInspectionBtn);

    section.appendChild(actionBar);

    return section;
  }

  _createInspectionInputGroup({ label, type = 'text', value = '', min, max, step, onChange }) {
    const group = document.createElement('div');
    group.className = 'inline-edit-form-group';
    const labelEl = document.createElement('label');
    labelEl.className = 'inline-edit-label';
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.className = 'inline-edit-input';
    input.type = type;
    input.value = value || '';
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    if (step !== undefined) input.step = String(step);
    const syncValue = (event) => onChange(event.target.value);
    input.addEventListener('input', syncValue);
    input.addEventListener('change', syncValue);
    group.appendChild(labelEl);
    group.appendChild(input);
    return group;
  }

  _createInspectionTextareaGroup(label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'inline-edit-form-group';
    const labelEl = document.createElement('label');
    labelEl.className = 'inline-edit-label';
    labelEl.textContent = label;
    const textarea = document.createElement('textarea');
    textarea.className = 'inline-edit-textarea';
    textarea.rows = 3;
    textarea.value = value || '';
    const syncValue = (event) => onChange(event.target.value);
    textarea.addEventListener('input', syncValue);
    textarea.addEventListener('change', syncValue);
    group.appendChild(labelEl);
    group.appendChild(textarea);
    return group;
  }

  _saveGoalInspection(index, payload) {
    const goal = this.systemData.goals[index];
    if (!goal?.goalId) return;

    const result = GoalService.addGoalCheckIn(this.systemData, goal.goalId, payload, {
      updatedBy: goal?.owner?.name || 'Goal Owner',
    });
    if (!result.success) {
      notificationManager.showToast(result.error || 'Could not save goal inspection.', 'warning');
      return;
    }

    this.goalInspectionDrafts.delete(goal.goalId);
    GoalService.refreshGoalDates(this.systemData, goal.goalId);
    SystemService.save();
    notificationManager.showToast('Goal inspection saved.', 'success');
    this.expandedIndex = index;
    this.render();
  }

  _persistGoalInspectionDraft(goal, options = {}) {
    if (!goal?.goalId) return { success: true };
    const draft = this.goalInspectionDrafts.get(goal.goalId);
    if (!draft || !draft.dirty) return { success: true };

    const result = GoalService.addGoalCheckIn(
      this.systemData,
      goal.goalId,
      {
        ownerStatus: draft.ownerStatus,
        weekEnding: draft.weekEnding,
        confidence: draft.confidence === '' ? null : Number(draft.confidence),
        comment: draft.comment,
        ptg: draft.ptg,
        ptgTargetDate: draft.ptgTargetDate || null,
        blockers: draft.blockers,
        asks: draft.asks,
      },
      { updatedBy: goal?.owner?.name || 'Goal Owner' }
    );

    if (!result.success) return result;

    this.goalInspectionDrafts.delete(goal.goalId);
    if (options.notifyOnSuccess) {
      notificationManager.showToast('Goal inspection saved.', 'success');
    }
    return { success: true };
  }

  _syncInitiativeLinks(goal) {
    if (!goal?.goalId) return;
    const linkedIds = new Set(goal.initiativeIds || []);
    (this.systemData.yearlyInitiatives || []).forEach((init) => {
      if (linkedIds.has(init.initiativeId)) {
        init.primaryGoalId = goal.goalId;
      }
    });
  }

  _stripRoleSuffix(value) {
    return String(value || '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
  }

  _resolveGoalStatusMeta(goal, isDraft) {
    if (isDraft) {
      return {
        label: 'Draft',
        className: 'goal-status-pill--draft',
        message: 'Unsaved goal',
      };
    }

    const label = goal?.statusLabel || goal?.status || 'Not Started';
    const message =
      goal?.statusMessage || 'Goal health will update when linked initiatives change.';
    const fallbackStatus = GoalService.STATUS.NOT_STARTED;
    const visualStatus = goal?.statusVisual || goal?.status || fallbackStatus;
    const normalized = String(visualStatus).toLowerCase();
    let suffix = 'at-risk';
    if (normalized === 'completed') suffix = 'completed';
    if (normalized === 'on-track') suffix = 'on-track';
    if (normalized === 'not-started') suffix = 'not-started';

    return {
      label,
      className: `goal-status-pill--${suffix}`,
      message,
    };
  }

  _resolveOwnerInspectionMeta(goal, isDraft) {
    if (isDraft) {
      return {
        label: 'Owner: N/A',
        className: 'goal-status-pill--draft',
        message: 'Owner check-ins are available after goal creation.',
      };
    }

    const inspection = GoalService.getGoalInspectionStatus(goal, { now: new Date() });
    const status = inspection.ownerStatus;
    const label = status ? `Owner: ${inspection.ownerStatusLabel}` : 'Owner: No Update';
    const staleSuffix = inspection.isStale ? ' (Stale)' : '';
    const mismatchSuffix = inspection.hasMismatch ? ' (Mismatch)' : '';

    let statusClass = 'goal-status-pill--draft';
    if (
      status === GoalService.INSPECTION_STATUS.ON_TRACK ||
      status === GoalService.INSPECTION_STATUS.ACHIEVED
    ) {
      statusClass = 'goal-status-pill--on-track';
    } else if (status === GoalService.INSPECTION_STATUS.SLIPPING) {
      statusClass = 'goal-status-pill--not-started';
    } else if (
      status === GoalService.INSPECTION_STATUS.AT_RISK ||
      status === GoalService.INSPECTION_STATUS.LATE ||
      status === GoalService.INSPECTION_STATUS.BLOCKED
    ) {
      statusClass = 'goal-status-pill--at-risk';
    }

    return {
      label: `${label}${staleSuffix}${mismatchSuffix}`,
      className: statusClass,
      message: inspection.lastCheckInAt
        ? `Last owner update: ${inspection.lastCheckInAt.slice(0, 10)}`
        : 'No owner weekly check-ins logged yet.',
    };
  }

  _todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }
}
