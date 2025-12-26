/**
 * ai/aiPlanOptimizationAgent.js
 *
 * This is a "Specialist Agent" responsible for orchestrating
 * the complex, multi-step task of optimizing a Year Plan.
 * It follows an "Analyze, Propose, Confirm" workflow.
 */

const aiPlanOptimizationAgent = (() => {
  // File-local state to hold the proposed changes
  let pendingPlanChanges = null;
  let postMessageCallback = null; // Stores the function to post messages to the chat
  let lastConfirmationContainerId = null;
  const md = window.markdownit();

  /**
   * Public entry point. Starts the optimization analysis.
   * @param {function} postMessageFn - The function from aiChatAssistant to post messages.
   */
  async function runOptimization(uiHooksOrFn, options = {}) {
    console.log('[OptimizeAgent] Starting analysis...');
    const uiHooks = _normalizeUiHooks(uiHooksOrFn);
    postMessageCallback = uiHooks.postMessage;
    pendingPlanChanges = null; // Clear any old changes
    const { contextJson = null, primingHistory = [] } = options || {};

    const progressMessageEl = uiHooks.postMessage ? uiHooks.postMessage('') : null;
    const updateProgress = (text) => {
      if (progressMessageEl && typeof progressMessageEl.appendChild === 'function') {
        _clearElement(progressMessageEl);
        const em = document.createElement('em');
        em.textContent = text;
        progressMessageEl.appendChild(em);
      } else if (uiHooks.postMessage) {
        uiHooks.postMessage(text);
      } else {
        console.log(text);
      }
    };

    updateProgress('🤖 Gathering plan context...');

    let parsedContext = null;
    if (contextJson) {
      try {
        parsedContext = JSON.parse(contextJson);
      } catch (error) {
        console.warn('[OptimizeAgent] Failed to parse context JSON:', error);
      }
    }

    try {
      // 1. ANALYZE (The "Before" Narrative)
      postMessageCallback(md.render('Starting plan optimization...'));

      let originalPlanData = parsedContext?.data?.planningTable;
      let originalSummaryData = parsedContext?.data?.teamLoadSummary;

      // Try to get data from the active view instance
      const yearPlanView = navigationManager?.getViewInstance?.('planningView');
      if (!originalPlanData && yearPlanView?.tableData) {
        originalPlanData = yearPlanView.tableData;
      }
      if (!originalSummaryData && yearPlanView?.summaryData) {
        originalSummaryData = yearPlanView.summaryData;
      }

      if (!originalPlanData || !originalSummaryData) {
        console.warn(
          '[OptimizeAgent] Plan data unavailable. Attempting to refresh planning view...'
        );
        updateProgress('🤖 Refreshing Year Plan view to gather data...');
        if (yearPlanView?.render) {
          yearPlanView.render();
          originalPlanData = yearPlanView.tableData;
          originalSummaryData = yearPlanView.summaryData;
        }
      }

      if (!originalPlanData || !originalSummaryData) {
        console.warn('[OptimizeAgent] Plan data still missing. Using PlanningService directly...');
        updateProgress('🤖 Calculating plan data directly...');
        // Calculate using PlanningService with current system data
        const systemData = SystemService.getCurrentSystem();
        if (systemData?.yearlyInitiatives && systemData?.calculatedCapacityMetrics) {
          const planningYear = yearPlanView?.currentYear || new Date().getFullYear();
          const scenario = yearPlanView?.scenario || 'effective';
          const applyConstraints = yearPlanView?.applyConstraints || false;
          const initiativesForYear = systemData.yearlyInitiatives.filter(
            (init) => init.attributes?.planningYear == planningYear && init.status !== 'Completed'
          );
          originalPlanData = PlanningService.calculatePlanningTableData({
            initiatives: initiativesForYear,
            calculatedMetrics: systemData.calculatedCapacityMetrics,
            scenario,
            applyConstraints,
          });
          originalSummaryData = PlanningService.calculateTeamLoadSummary({
            teams: systemData.teams || [],
            initiatives: initiativesForYear,
            calculatedMetrics: systemData.calculatedCapacityMetrics,
            scenario,
            applyConstraints,
            allKnownEngineers: systemData.allKnownEngineers || [],
          });
        }
      }

      if (!originalPlanData || !originalSummaryData) {
        throw new Error("Year Plan data is not calculated. Please view the 'Year Plan' tab first.");
      }

      const { btlCount, overloadedTeams } = _analyzePlanState(
        originalPlanData,
        originalSummaryData
      );

      const beforeNarrative = `
**'Before' Analysis:**
* **Capacity:** Your plan has **${btlCount}** initiative(s) Below The Line.
* **Team Load:** ${overloadedTeams.length} team(s) are overloaded: ${overloadedTeams.length > 0 ? overloadedTeams.join(', ') : 'None'}.

*I will now run 5 optimization iterations to find improvements... This may take a moment.*
            `;
      postMessageCallback(md.render(beforeNarrative));

      // 2. ITERATE & PROPOSE (The "After" Narrative)
      // This function runs the internal reasoning loop
      updateProgress('🤖 Running optimization iterations (0/5)...');
      const proposedChanges = await _runOptimizationLoop(
        originalPlanData,
        contextJson,
        primingHistory,
        updateProgress
      );

      if (proposedChanges.length === 0) {
        updateProgress('⚠️ No optimizations were found.');
        postMessageCallback(
          md.render('Optimization complete. I could not find any safe optimizations for this plan.')
        );
        return;
      }

      // Create a temporary data copy to calculate the "After" state
      const { tempSystemData, tempPlanTableData, tempSummaryData } =
        _applyChangesToTempData(proposedChanges);
      const { btlCount: afterBtlCount, overloadedTeams: afterOverloadedTeams } = _analyzePlanState(
        tempPlanTableData,
        tempSummaryData
      );

      const changesNarrative = proposedChanges
        .map((change, idx) => {
          const init = SystemService.getCurrentSystem().yearlyInitiatives.find(
            (i) => i.initiativeId === change.initiativeId
          );
          const oldSde = init.assignments.find((a) => a.teamId === change.teamId)?.sdeYears || 0;
          const teamName = OrgService.getTeamNameById(
            SystemService.getCurrentSystem(),
            change.teamId
          );
          return `- **${idx + 1}. ${init.title} – ${teamName}:** Reduce from \`${oldSde.toFixed(2)}\` to \`${change.newSdeYears.toFixed(2)}\` SDEs.\n  - *Justification:* ${change.justification}`;
        })
        .join('\n');

      const afterNarrative = `
**Optimization Complete.**
I ran 5 iterations and recommend the following **${proposedChanges.length} change(s)**:
${changesNarrative}

---
**'After' Analysis (If Applied):**
* **Capacity:** Your plan would have **${afterBtlCount}** initiative(s) Below The Line.
* **Team Load:** ${afterOverloadedTeams.length} team(s) would be overloaded: ${afterOverloadedTeams.length > 0 ? afterOverloadedTeams.join(', ') : 'None'}.
            `;
      postMessageCallback(md.render(afterNarrative));
      updateProgress('🤖 Optimization complete. Awaiting your confirmation...');

      // 3. CONFIRM - Using DOM-based event handling per coding contract
      pendingPlanChanges = tempSystemData; // Store the *full* modified system data
      lastConfirmationContainerId = `agentConfirmationControls-${Date.now()}`;

      // Create confirmation UI using DOM
      const confirmContainer = document.createElement('div');
      confirmContainer.id = lastConfirmationContainerId;
      confirmContainer.className = 'agent-confirmation-controls';

      const promptText = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Would you like to apply these changes?';
      promptText.appendChild(strong);
      confirmContainer.appendChild(promptText);

      const buttonRow = document.createElement('div');
      buttonRow.className = 'agent-confirmation-controls__actions';

      const applyBtn = document.createElement('button');
      applyBtn.className = 'btn-primary';
      const applyIcon = document.createElement('i');
      applyIcon.className = 'fas fa-check';
      applyBtn.appendChild(applyIcon);
      applyBtn.appendChild(document.createTextNode(' Apply Changes'));
      applyBtn.addEventListener('click', () => aiAgentController.confirmPrebuiltAgent(true));
      buttonRow.appendChild(applyBtn);

      const discardBtn = document.createElement('button');
      discardBtn.className = 'btn-secondary';
      const discardIcon = document.createElement('i');
      discardIcon.className = 'fas fa-times';
      discardBtn.appendChild(discardIcon);
      discardBtn.appendChild(document.createTextNode(' Discard'));
      discardBtn.addEventListener('click', () => aiAgentController.confirmPrebuiltAgent(false));
      buttonRow.appendChild(discardBtn);

      confirmContainer.appendChild(buttonRow);

      const statusDiv = document.createElement('div');
      statusDiv.className = 'agent-confirmation-status';
      confirmContainer.appendChild(statusDiv);

      // Post confirmation UI via the chat assistant's message API
      const messageEl = aiChatAssistant.postAgentMessageToView('');
      if (messageEl) {
        messageEl.appendChild(confirmContainer);
      }

      if (progressMessageEl && typeof progressMessageEl.appendChild === 'function') {
        const completeEm = document.createElement('em');
        completeEm.textContent = '🤖 Optimization complete.';
        _clearElement(progressMessageEl);
        progressMessageEl.appendChild(completeEm);
      }
    } catch (error) {
      console.error('[OptimizeAgent] Error:', error);
      postMessageCallback(`An error occurred during optimization: ${error.message}`, true);
      updateProgress(`⚠️ Optimization failed: ${error.message}`);
    }
  }

  function _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Public function for the Controller to call when user clicks "Apply".
   */
  async function applyPendingChanges() {
    if (!pendingPlanChanges) {
      console.error('[OptimizeAgent] No pending changes to apply.');
      return false;
    }

    console.log('[OptimizeAgent] Applying pending changes...');
    // Apply the changes to the live data via SystemService
    SystemService.setCurrentSystem(pendingPlanChanges);
    pendingPlanChanges = null; // Clear the pending changes

    // Save and refresh the main UI
    if (SystemService.save) {
      SystemService.save();
    }
    // Navigate to Planning View
    navigationManager.navigateTo('planningView');

    // Wait for view to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Render via the view instance
    const yearPlanView = navigationManager?.getViewInstance?.('planningView');
    if (yearPlanView?.render) {
      yearPlanView.render();
    }

    postMessageCallback(
      md.render('✅ **Plan applied.** The Year Plan has been updated and saved.')
    );
    return true;
  }

  /**
   * Public function for the Controller to call when user clicks "Discard".
   */
  function discardPendingChanges() {
    pendingPlanChanges = null;
    postMessageCallback(md.render('Changes discarded.'));
  }

  /**
   * Public helper to check if the agent is awaiting confirmation.
   */
  function hasPendingChanges() {
    return pendingPlanChanges !== null;
  }

  function getLastConfirmationContainerId() {
    return lastConfirmationContainerId;
  }

  // --- Internal Helper Functions ---

  /**
   * Analyzes a plan state and returns key metrics.
   */
  function _analyzePlanState(planData, summaryData) {
    const btlCount = (planData || []).filter((i) => i.isBTL).length;
    const overloadedTeams = (summaryData.rows || [])
      .filter((row) => row.remainingCapacity < 0)
      .map((row) => row.teamName);
    return { btlCount, overloadedTeams };
  }

  /**
   * Runs the internal optimization loop.
   * @returns {Promise<Array>} A list of change objects.
   */
  async function _runOptimizationLoop(
    originalPlanData,
    serializedContext,
    primingHistory = [],
    progressCallback = null
  ) {
    let currentTempPlanData = JSON.parse(JSON.stringify(originalPlanData));
    const allChanges = [];
    const contextBlock = serializedContext ? `CURRENT VIEW CONTEXT:\n${serializedContext}\n\n` : '';
    const pinnedHistory = Array.isArray(primingHistory) ? primingHistory.filter(Boolean) : [];

    for (let i = 0; i < 5; i++) {
      // Run 5 iterations
      progressCallback(`🤖 Running optimization iterations (${i + 1}/5)...`);
      const simplifiedPlan = currentTempPlanData
        .filter((init) => init.isBTL && !init.isProtected) // Only look at non-protected BTL items
        .map((init) => ({
          initiativeId: init.initiativeId,
          title: init.title,
          description: init.description,
          assignments: init.assignments,
        }));

      if (simplifiedPlan.length === 0) {
        console.log('[OptimizeAgent] Loop ended: No more BTL items to optimize.');
        break; // Stop if no BTL items are left
      }

      const specialistPrompt = `
You are an optimization specialist. I will give you a list of "Below The Line" (BTL) initiatives.
Your goal is to propose ONE change to ONE initiative to help fit it "Above The Line".
The best change is a small, justifiable SDE reduction.

${contextBlock}
BTL INITIATIVES:
${JSON.stringify(simplifiedPlan, null, 2)}

Respond with a single JSON object in this format:
{
  "initiativeId": "id-to-change",
  "teamId": "team-to-change",
  "newSdeYears": 1.25,
  "justification": "Your brief reason for this specific reduction."
}
If you cannot find a good change, respond with null.
            `;

      const history = [];
      if (pinnedHistory.length > 0) {
        history.push(...pinnedHistory);
      }
      history.push({ role: 'user', parts: [{ text: specialistPrompt }] });

      const analysisFn = await aiAgentController._waitForAnalysisFunction();
      const aiResponse = await analysisFn(
        history,
        SettingsService.get().ai.apiKey,
        SettingsService.get().ai.provider
      );

      try {
        const responseText = aiResponse?.textResponse || '';
        console.debug('[OptimizeAgent] Specialist response text:', responseText);
        const change = _parseAgentJsonResponse(responseText);
        if (change && change.initiativeId && change.teamId && change.newSdeYears) {
          allChanges.push(change); // Add to our list
          // Update our temporary plan for the *next* loop
          const initToUpdate = currentTempPlanData.find(
            (i) => i.initiativeId === change.initiativeId
          );
          if (initToUpdate) {
            const assignment = (initToUpdate.assignments || []).find(
              (a) => a.teamId === change.teamId
            );
            if (assignment) {
              assignment.sdeYears = change.newSdeYears;
            } else {
              initToUpdate.assignments.push({
                teamId: change.teamId,
                sdeYears: change.newSdeYears,
              });
            }
          }
        } else {
          console.log('[OptimizeAgent] Loop ended: AI returned no valid change.');
          break;
        }
      } catch (e) {
        console.warn('[OptimizeAgent] Loop failed to parse AI response, ending loop.', e);
        break;
      }
    }
    return allChanges;
  }

  function _parseAgentJsonResponse(responseText = '') {
    const trimmed = (responseText || '').trim();
    console.debug('[OptimizeAgent] Parsing specialist response (trimmed):', trimmed);
    if (!trimmed) {
      throw new Error('Empty response from optimization specialist.');
    }
    const withoutFence = trimmed.startsWith('```')
      ? trimmed
          .replace(/^```(?:json)?/i, '')
          .replace(/```$/, '')
          .trim()
      : trimmed;
    console.debug('[OptimizeAgent] Response without fences:', withoutFence);
    const directAttempt = _safeJsonParse(withoutFence);
    if (directAttempt) return directAttempt;
    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = withoutFence.slice(firstBrace, lastBrace + 1);
      console.debug('[OptimizeAgent] Attempting fallback slice:', sliced);
      const fallbackAttempt = _safeJsonParse(sliced);
      if (fallbackAttempt) return fallbackAttempt;
    }
    throw new Error('Failed to parse specialist response as JSON.');
  }

  function _safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.debug('[OptimizeAgent] JSON parse failed for value:', value, error);
      return null;
    }
  }

  function _normalizeUiHooks(input) {
    const hooks = input || {};
    const postMessage = hooks.postMessageFn || hooks.postMessage || null;
    return {
      postMessage: postMessage || ((text) => console.log('[OptimizeAgent]', text)),
    };
  }

  /**
   * Applies a list of changes to a deep copy of SystemService.getCurrentSystem()
   * and recalculates the plan.
   */
  function _applyChangesToTempData(changes) {
    const tempSystemData = JSON.parse(JSON.stringify(SystemService.getCurrentSystem()));

    changes.forEach((change) => {
      const init = tempSystemData.yearlyInitiatives.find(
        (i) => i.initiativeId === change.initiativeId
      );
      if (init) {
        const assignment = (init.assignments || []).find((a) => a.teamId === change.teamId);
        if (assignment) {
          assignment.sdeYears = change.newSdeYears;
        } else {
          init.assignments.push({ teamId: change.teamId, sdeYears: change.newSdeYears });
        }
      }
    });

    // Now, we must re-calculate the plan based on this temp data.
    // We perform pure calculations on the temp object without touching global state.

    // Recalculate capacity metrics for the temp data (mutates tempSystemData only)
    CapacityEngine.recalculate(tempSystemData);

    // Get initiatives for current planning year
    const planningYear = new Date().getFullYear();
    const initiativesForYear = (tempSystemData.yearlyInitiatives || []).filter(
      (init) => init.attributes?.planningYear == planningYear && init.status !== 'Completed'
    );

    // Use PlanningService to calculate summary and planning table data
    // Explicitly passing data from tempSystemData ensures we don't read from global
    const tempSummaryData = PlanningService.calculateTeamLoadSummary({
      teams: tempSystemData.teams,
      initiatives: initiativesForYear,
      calculatedMetrics: tempSystemData.calculatedCapacityMetrics,
      scenario: 'funded',
      applyConstraints: true,
      allKnownEngineers: tempSystemData.allKnownEngineers || [],
    });

    const tempPlanTableData = PlanningService.calculatePlanningTableData({
      initiatives: initiativesForYear,
      calculatedMetrics: tempSystemData.calculatedCapacityMetrics,
      scenario: 'funded',
      applyConstraints: true,
    });

    return { tempSystemData, tempPlanTableData, tempSummaryData };
  }

  return {
    runOptimization,
    applyPendingChanges,
    discardPendingChanges,
    hasPendingChanges,
    getLastConfirmationContainerId,
  };
})();
