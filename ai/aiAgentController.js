const aiAgentController = (() => {
    let chatSessionHistory = [];
    let sessionTotalTokens = 0;
    const CONVERSATION_HISTORY_LENGTH = 30;
    const USE_FULL_SYSTEM_CONTEXT_TOGGLE = true;
    const md = window.markdownit();

    const SUGGESTED_QUESTIONS = {
        planningView: [
            { text: "Which teams are overloaded in this plan?" },
            { text: "How can I optimize this plan to fit more initiatives?", isImageRequest: false },
            { text: "Generate a flowchart for the top 'Committed' initiative.", isImageRequest: true },
            { text: "Suggest SDE-Year reductions for 2-3 BTL initiatives.", isImageRequest: false },
            { text: "Analyze the risks in this plan." }
        ],
        roadmapView: [
            { text: "Summarize all initiatives currently in 'Backlog' status." },
            { text: "Which 'Defined' initiatives have the highest SDE-Year estimates?" },
            { text: "Show me all initiatives related to the 'Revenue Growth' theme." },
            { text: "Are there any 'Backlog' items with no teams assigned yet?" }
        ],
        organogramView: [
            { text: "Rate my overall team composition and find risks." },
            { text: "Generate a stylized org chart of the managers.", isImageRequest: true },
            { text: "Who are all the AI Software Engineers?", isImageRequest: false },
            { text: "Find potential skill gaps in the engineer roster." },
            { text: "Which teams have the highest number of junior engineers?" }
        ],
        visualizationCarousel: [
            { text: "Generate a block diagram of this architecture.", isImageRequest: true },
            { text: "Rate the architectural design. Are there bottlenecks?", isImageRequest: false },
            { text: "Show a table of all services and their owning teams." }
        ],
        dashboardView: [
            { text: "Summarize the key takeaways from the 'Strategic Goals' widget." },
            { text: "Generate a mind map of our 'Strategic Goals'.", isImageRequest: true },
            { text: "What risks do you see in the 'Team Demand' widget data?" },
            { text: "Analyze the 'Investment Distribution' for this year." },
            { text: "What's the biggest accomplishment shown?" }
        ],
        capacityConfigView: [
            { text: "Find anomalies in my capacity configuration." },
            { text: "Which team has the highest 'avgOverheadHoursPerWeekPerSDE'?" },
            { text: "What is the total 'AI Productivity Gain' across the org?" },
            { text: "Compare the 'Standard Leave' days for all teams." }
        ],
        systemEditForm: [
            { text: "How do I add a new Team?" },
            { text: "What's the difference between 'Engineers' and 'Away-Team Members'?" },
            { text: "Find any services that don't have an owning team." },
            { text: "Find any engineers in the roster who are not assigned to a team." },
            { text: "Explain the 'Platform Dependencies' field for a service." }
        ],
        sdmForecastingView: [
            { text: "Explain the 'Effective Engineers' calculation." },
            { text: "How does 'Annual Attrition Rate' affect this forecast?" },
            { text: "What's the difference between 'Total Ramped Up Engineers' and 'Total Headcount'?" },
            { text: "Analyze the hiring rate needed to close the gap by the target week." },
            { text: "How do the 'Capacity Constraints' (like overhead) affect this forecast?" }
        ],
        default: [
            { text: "What is this system about?" },
            { text: "How many teams are there?" },
            { text: "Summarize the main strategic goals." },
            { text: "List all services in the system." }
        ]
    };

    let isAgentThinking = false;
    let cachedImageGenerationFn = null;

    function _getAiPrimingPrompt() {
        const toolsetDescription = (window.aiAgentToolset && typeof window.aiAgentToolset.getAgentToolsetDescription === 'function')
            ? window.aiAgentToolset.getAgentToolsetDescription()
            : 'Toolset description is unavailable. You may still answer questions but cannot execute actions.';

        return `You are an expert Software Engineering Planning & Management Partner. Your goals are to:
    1.  **Prioritize the CONTEXT DATA:** Base all your answers about the user's system (initiatives, teams, engineers, services) exclusively on the JSON data provided in the "CONTEXT DATA" section.
    2.  **Use General Knowledge as a Fallback:** If the user asks a general knowledge question (e.g., "What is AWS?", "Define 'SDE-Year'"), and the answer is *not* in the CONTEXT DATA, you may use your own knowledge to provide a brief, helpful definition.
    3.  **Be Clear:** When using your own knowledge, state it (e.g., "AWS CloudFront is a content delivery network..."). When using the context, be specific (e.g., "Based on the data, the 'Avengers' team...").
    4.  **Perform Expert Analysis & Provide Recommendations (Your Main Task):** If the user asks for an analysis, opinion, rating, or recommendation (e.g., "rate this," "find risks," "optimize this plan"), you MUST perform a deep analysis. Even for simple questions, you should *proactively* add these insights if you find them.
        * **Architectural Analysis:** Use the \`services\` data (especially \`serviceDependencies\`) to comment on loose/tight coupling, potential bottlenecks, or how the architecture aligns with team structure (Conway's Law).
        * **Organizational Analysis:** Use \`allKnownEngineers\` and \`teams\` data to analyze team composition. Proactively find and highlight risks like skill gaps, high junior-to-senior ratios, or single-person dependencies on a critical skill.
        * **Capacity & Risk Analysis:** If the context includes \`capacityConfigView\` or \`planningView\` data, actively scrutinize it. Find anomalies. (e.g., "I notice the 'Avengers' have 20 hours/week of overhead while all other teams have 6. Is this correct?"). Call out opportunities to optimize leave schedules or other constraints.
        * **Planning & Optimization Suggestions:** When asked to analyze or optimize the \`planningView\`, do not just re-order initiatives.
            a.  First, respect all \`isProtected: true\` initiatives.
            b.  Then, to fit more work, you are empowered to **suggest specific reductions to SDE-Year estimates** for non-protected items.
            c.  You must justify *why* (e.g., "The initiative 'Improve UI' is 2.5 SDE-Years, which seems high for a UI-only task. Reducing it to 1.5 might fit it Above The Line.").
            d.  Recommend a new priority order based on \`roi\` and your new estimates.
    5.  **Macro/Bulk actions need scope callouts:** When proposing bulk tools (capacity, initiative moves, scope trims, reassignments), state how many items will be touched in your plan (e.g., "Reducing capacity for 15 teams") before execution.

ACTION AGENT RULES:
- When you need the app to take actions, respond with an <execute_plan>...</execute_plan> block.
- Inside the tag, provide valid JSON: { "steps": [ { "command": "toolName", "payload": { ... } } ] }.
- Use ONLY the commands listed below. Do not invent new tools.
- If no actions are required, respond normally without the execute_plan tag.
- If the user's message begins with a slash command (e.g., "/addInitiative ..."), interpret that as a strong hint to prioritize the matching tool in your plan.

AVAILABLE COMMANDS:
${toolsetDescription}`;
    }

    function startSession() {
        console.log("[AI CHAT] Starting agent session. Clearing history and UI.");
        const chatLog = document.getElementById('aiChatLog');
        if (chatLog) {
            chatLog.innerHTML = '<div class="chat-message ai-message">Hello! I have loaded the full context for <strong>' + (currentSystemData?.systemName || 'the system') + '</strong>. How can I help you analyze it?<br><br>You can now ask me to perform actions (including bulk actions!) using simple English OR Type <b>/</b> to see a list of available commands.</div>';
        }
        if (window.aiChatAssistant && typeof window.aiChatAssistant.setTokenCount === 'function') {
            window.aiChatAssistant.setTokenCount(0);
        }
        if (window.aiChatAssistant && typeof window.aiChatAssistant.clearChatInput === 'function') {
            window.aiChatAssistant.clearChatInput();
        }

        chatSessionHistory = [];
        sessionTotalTokens = 0;
        isAgentThinking = false;

        if (!currentSystemData) {
            console.warn("[AI CHAT] No system data loaded. AI assistant will have no context.");
            return;
        }

        let primingPrompt = _getAiPrimingPrompt();
        if (USE_FULL_SYSTEM_CONTEXT_TOGGLE) {
            const fullContextJson = JSON.stringify(currentSystemData, null, 2);
            primingPrompt += `\n\nHERE IS THE FULL SYSTEM DATA ("CONTEXT DATA"):\n${fullContextJson}\n\nConfirm you have received these instructions and the full system data, and are ready to answer questions.`;
        } else {
            primingPrompt += `\n\nYou will be given the CONTEXT DATA with each user question. Confirm you have received these instructions.`;
        }

        chatSessionHistory.push({ role: 'user', parts: [{ text: primingPrompt }] });
        chatSessionHistory.push({ role: 'model', parts: [{ text: `Understood. I have loaded the context for ${currentSystemData.systemName}. I am ready to analyze.` }] });

        renderSuggestionsForCurrentView();
    }

    function renderSuggestionsForCurrentView() {
        const suggestions = SUGGESTED_QUESTIONS[currentViewId] || SUGGESTED_QUESTIONS.default;
        if (window.aiChatAssistant && typeof window.aiChatAssistant.setSuggestionPills === 'function') {
            window.aiChatAssistant.setSuggestionPills(suggestions);
        }
    }

    async function handleUserChatSubmit() {
        if (isAgentThinking) return;
        const view = window.aiChatAssistant;
        if (!view || typeof view.getChatInputValue !== 'function') return;

        const userQuestion = view.getChatInputValue();
        if (!userQuestion) return;

        isAgentThinking = true;
        view.toggleChatInput(true);
        const isImageRequest = typeof view.isImageRequestPending === 'function' ? view.isImageRequestPending() : false;
        view.postUserMessageToView(userQuestion);
        view.clearChatInput();

        if (isImageRequest) {
            await _handleImageRequest(userQuestion);
            return;
        }

        await _executeChatTurn(userQuestion);
    }

    function getAvailableTools() {
        if (window.aiAgentToolset && typeof window.aiAgentToolset.getToolsSummaryList === 'function') {
            return window.aiAgentToolset.getToolsSummaryList();
        }
        return [];
    }

    async function _executeChatTurn(userQuestion) {
        const view = window.aiChatAssistant;
        const loadingMessageEl = view && typeof view.showAgentLoadingIndicator === 'function'
            ? view.showAgentLoadingIndicator()
            : null;

        const contextJson = scrapeCurrentViewContext();
        console.log(`[AI CHAT] Scraping DYNAMIC context (${contextJson.length} chars) from view: ${currentViewId}`);
        const userTurnContent = `
USER QUESTION: "${userQuestion}"

CONTEXT DATA (for this question only, from your current UI view): ${contextJson} `;

        chatSessionHistory.push({ role: 'user', parts: [{ text: userTurnContent }] });

        let historyToSend = [];
        if (chatSessionHistory.length <= CONVERSATION_HISTORY_LENGTH) {
            historyToSend = chatSessionHistory;
        } else {
            historyToSend = [
                chatSessionHistory[0],
                chatSessionHistory[1],
                ...chatSessionHistory.slice(-CONVERSATION_HISTORY_LENGTH)
            ];
            console.log(`[AI CHAT] History is long (${chatSessionHistory.length} turns). Sending Pinned + Last ${CONVERSATION_HISTORY_LENGTH} turns.`);
        }

        try {
            const analysisFn = await _waitForAnalysisFunction();
            if (!analysisFn) throw new Error('AI analysis service is unavailable.');

            const aiResponse = await analysisFn(
                historyToSend,
                globalSettings.ai.apiKey,
                globalSettings.ai.provider
            );

            if (!aiResponse || typeof aiResponse.textResponse !== 'string') {
                throw new Error('Received an invalid response from the AI.');
            }

            chatSessionHistory.push({ role: 'model', parts: [{ text: aiResponse.textResponse }] });

            if (aiResponse.usage && aiResponse.usage.totalTokenCount) {
                sessionTotalTokens += aiResponse.usage.totalTokenCount;
                if (view && typeof view.setTokenCount === 'function') {
                    view.setTokenCount(sessionTotalTokens);
                }
            }

            const planMatch = aiResponse.textResponse.match(/<execute_plan>([\s\S]*?)<\/execute_plan>/i);
            if (!planMatch) {
                const rendered = md.render(aiResponse.textResponse);
                if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                    view.hideAgentLoadingIndicator(loadingMessageEl, rendered);
                }
                return;
            }

            let plan;
            try {
                plan = JSON.parse(planMatch[1]);
            } catch (error) {
                const errorHtml = `<span style="color:red;">Failed to parse agent plan JSON: ${error.message}</span>`;
                if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                    view.hideAgentLoadingIndicator(loadingMessageEl, errorHtml);
                }
                return;
            }

            const steps = Array.isArray(plan.steps) ? plan.steps : [];
            console.debug('[AI Agent Controller] Parsed agent plan from chat:', steps);
            await _executeAgentPlan(steps, loadingMessageEl);
        } catch (error) {
            console.error("Error during AI chat submit:", error);
            if (loadingMessageEl && typeof loadingMessageEl.remove === 'function') {
                loadingMessageEl.remove();
            }
            if (view && typeof view.postAgentMessageToView === 'function') {
                view.postAgentMessageToView(`Error: ${error.message}`, true);
            }
        } finally {
            isAgentThinking = false;
            if (view && typeof view.toggleChatInput === 'function') {
                view.toggleChatInput(false);
            }
            renderSuggestionsForCurrentView();
        }
    }

    async function _handleImageRequest(userQuestion) {
        const view = window.aiChatAssistant;
        const loadingMessageEl = view && typeof view.showAgentLoadingIndicator === 'function'
            ? view.showAgentLoadingIndicator()
            : null;
        try {
            const contextJson = scrapeCurrentViewContext();
            const imageFn = _resolveImageGenerationFunction();
            if (!imageFn) {
                throw new Error('AI image generation service is unavailable. Please ensure AI is enabled and an API key is saved.');
            }
            const response = await imageFn(
                userQuestion,
                contextJson,
                globalSettings.ai.apiKey,
                globalSettings.ai.provider
            );

            if (response && response.isImage && response.imageUrl) {
                const html = `\n                <p>Here is the generated diagram:</p>\n                <img src="${response.imageUrl}"\n                     alt="${response.altText || 'Generated diagram'}"\n                     class="chat-generated-image"\n                     title="Right-click to copy or save this image" />\n            `;
                if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                    view.hideAgentLoadingIndicator(loadingMessageEl, html);
                }
            } else if (response && response.code) {
                if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                    view.hideAgentLoadingIndicator(loadingMessageEl, '<p>Diagram generated. Click "View Diagram" to open.</p>');
                }
                if (view && typeof view.postDiagramWidget === 'function') {
                    view.postDiagramWidget(response.title, response.code);
                }
            } else {
                throw new Error('Diagram generation response was invalid.');
            }
        } catch (error) {
            console.error("Error during AI image submit:", error);
            if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                view.hideAgentLoadingIndicator(loadingMessageEl, `<span style="color:red;">Error: ${error.message}</span>`);
            }
        } finally {
            isAgentThinking = false;
            if (view && typeof view.toggleChatInput === 'function') {
                view.toggleChatInput(false);
            }
            renderSuggestionsForCurrentView();
        }
    }

    async function _executeAgentPlan(steps, loadingMessageEl) {
        const view = window.aiChatAssistant;
        if (!Array.isArray(steps) || steps.length === 0) {
            if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                view.hideAgentLoadingIndicator(loadingMessageEl, md.render('No executable steps were provided.'));
            }
            return;
        }

        if (!window.aiAgentToolset || typeof window.aiAgentToolset.executeTool !== 'function') {
            if (view && typeof view.hideAgentLoadingIndicator === 'function') {
                view.hideAgentLoadingIndicator(loadingMessageEl, '<span style="color:red;">Agent toolset is unavailable.</span>');
            }
            return;
        }

        if (view && typeof view.hideAgentLoadingIndicator === 'function') {
            view.hideAgentLoadingIndicator(loadingMessageEl, '<p>Starting agent plan...</p>');
        }

        console.debug('[AI Agent Controller] Executing agent plan with steps:', steps);

        const stepResults = [];
        const stepSummaries = [];
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            try {
                const resolvedPayload = _resolvePayloadPlaceholders(step.payload || {}, stepResults);
                if (view && typeof view.postAgentMessageToView === 'function') {
                    view.postAgentMessageToView(`Step ${i + 1}: Executing <b>${step.command}</b>...`);
                }
                if (step.command === 'generateDiagram') {
                    if (view && typeof view.postAgentMessageToView === 'function') {
                        view.postAgentMessageToView(`Generating diagram: "${resolvedPayload.description || ''}"...`);
                    }
                    const contextJson = typeof scrapeCurrentViewContext === 'function' ? scrapeCurrentViewContext() : '{}';
                    console.debug("[AI-DIAGRAM] Context JSON length:", (contextJson || '').length);
                    try {
                        const result = await window.generateDiagramFromPrompt(
                            resolvedPayload.description || '',
                            contextJson,
                            globalSettings.ai.apiKey,
                            globalSettings.ai.provider
                        );
                        console.debug("[AI-DIAGRAM] Diagram generation result:", result);
                        if (view && typeof view.postDiagramWidget === 'function') {
                            view.postDiagramWidget(result.title, result.code);
                        }
                        stepResults[i] = result;
                        stepSummaries.push(`Generated diagram: ${resolvedPayload.description || ''}`);
                        if (view && typeof view.postAgentMessageToView === 'function') {
                            view.postAgentMessageToView(`Step ${i + 1} complete.`);
                        }
                    } catch (err) {
                        console.error("[AI-DIAGRAM] Error during diagram generation:", err);
                        throw err;
                    }
                    continue;
                }
                const result = await window.aiAgentToolset.executeTool(step.command, resolvedPayload);
                stepResults[i] = result;
                 console.debug('[AI Agent Controller] Step completed:', { step: step.command, payload: resolvedPayload, result });
                stepSummaries.push(_describeAgentStep(step.command, resolvedPayload, result, i));
                if (view && typeof view.postAgentMessageToView === 'function') {
                    view.postAgentMessageToView(`Step ${i + 1} complete.`);
                }
            } catch (error) {
                if (view && typeof view.postAgentMessageToView === 'function') {
                    view.postAgentMessageToView(`Error on step ${i + 1} (${step.command}): ${error.message}`, true);
                }
                break;
            }
        }

        if (typeof saveSystemChanges === 'function') {
            try { saveSystemChanges(); } catch (error) { console.error('saveSystemChanges failed:', error); }
        }
        if (typeof refreshCurrentView === 'function') {
            try { refreshCurrentView(); } catch (error) { console.error('refreshCurrentView failed:', error); }
        }

        if (view && typeof view.postAgentMessageToView === 'function') {
            let summaryHtml = '<b>Agent plan finished.</b> UI has been refreshed.';
            if (stepSummaries.length > 0) {
                summaryHtml += '<br><br><strong>Actions performed:</strong><ul>' +
                    stepSummaries.map(text => `<li>${text}</li>`).join('') +
                    '</ul>';
            }
            view.postAgentMessageToView(summaryHtml);
        }
    }

    function _resolvePayloadPlaceholders(payload, stepResults) {
        if (Array.isArray(payload)) {
            return payload.map(value => _resolvePayloadPlaceholders(value, stepResults));
        }
        if (payload && typeof payload === 'object') {
            const resolved = {};
            Object.keys(payload).forEach(key => {
                resolved[key] = _resolvePayloadPlaceholders(payload[key], stepResults);
            });
            return resolved;
        }
        if (typeof payload === 'string') {
            const exactMatch = payload.match(/^{{step_(\d+)_result(?:\.([^}]+))?}}$/);
            if (exactMatch) {
                return _getStepResultValue(stepResults, exactMatch[1], exactMatch[2]);
            }
            return payload.replace(/{{step_(\d+)_result(?:\.([^}]+))?}}/g, (match, indexStr, path) => {
                const value = _getStepResultValue(stepResults, indexStr, path);
                if (value === undefined || value === null) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value);
            });
        }
        return payload;
    }

    function _getStepResultValue(stepResults, indexStr, path) {
        const index = parseInt(indexStr, 10);
        const base = stepResults[index];
        if (base === undefined) return undefined;
        if (!path) return base;
        return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), base);
    }

    function _describeAgentStep(command, payload, result, index) {
        switch (command) {
            case 'addInitiative': {
                const title = payload?.title || result?.title || 'initiative';
                const planningYear = payload?.attributes?.planningYear || (result?.attributes?.planningYear);
                return `Created initiative <strong>${title}</strong>${planningYear ? ` for ${planningYear}` : ''}.`;
            }
            case 'updateInitiative': {
                const initiativeId = payload?.initiativeId || result?.initiativeId || '(unknown)';
                const summary = _summarizeInitiativeUpdates(payload?.updates || {}, result);
                return `Updated initiative <code>${initiativeId}</code>${summary ? ` (${summary})` : '.'}`;
            }
            case 'deleteInitiative': {
                const initiativeId = payload?.initiativeId || result?.initiativeId || '(unknown)';
                return `Deleted initiative <code>${initiativeId}</code>.`;
            }
            case 'moveEngineerToTeam': {
                const engineer = payload?.engineerName || result?.name || 'engineer';
                const team = payload?.newTeamId || result?.currentTeamId || 'unassigned';
                return `Moved ${engineer} to team <code>${team}</code>.`;
            }
            case 'addEngineerToRoster': {
                const engineerName = payload?.name || result?.name || 'engineer';
                return `Added engineer <strong>${engineerName}</strong> to roster.`;
            }
            case 'addNewTeam': {
                const teamId = result?.teamId || '(new team)';
                const teamName = result?.teamName || result?.teamIdentity || '';
                return `Created team <strong>${teamName || teamId}</strong>.`;
            }
            case 'addNewService': {
                const serviceName = payload?.serviceData?.serviceName || result?.serviceName || 'service';
                return `Created service <strong>${serviceName}</strong>.`;
            }
            case 'bulkUpdateTeamCapacity': {
                const count = result?.updatedCount ?? 0;
                const scope = result?.scopeDescription || `${count} teams`;
                const fields = Array.isArray(result?.appliedFields) && result.appliedFields.length > 0 ? result.appliedFields.join(', ') : null;
                return `Bulk-updated capacity for ${scope}${fields ? ` (fields: ${fields})` : ''}.`;
            }
            case 'bulkUpdateInitiatives': {
                const count = result?.updatedCount ?? 0;
                const status = payload?.updates?.status;
                const isProtected = payload?.updates?.isProtected;
                const changes = [];
                if (status) changes.push(`status → ${status}`);
                if (typeof isProtected === 'boolean') changes.push(`isProtected → ${isProtected}`);
                return `Updated ${count} initiatives${changes.length ? ` (${changes.join('; ')})` : ''}.`;
            }
            case 'bulkAdjustInitiativeEstimates': {
                const factor = payload?.adjustmentFactor;
                const count = result?.updatedCount ?? 0;
                return `Scaled SDE estimates by ${factor} for ${count} initiatives.`;
            }
            case 'bulkReassignTeams': {
                const moved = result?.movedTeamIds?.length ?? 0;
                const source = payload?.sourceSdmId || payload?.fromSdmId;
                const target = payload?.targetSdmId || payload?.toSdmId;
                return `Moved ${moved} teams from <code>${source}</code> to <code>${target}</code>.`;
            }
            default:
                return `Executed <code>${command}</code> (step ${index + 1}).`;
        }
    }

    function _summarizeInitiativeUpdates(updates, result) {
        if (!updates || typeof updates !== 'object') return '';
        const messages = [];
        if (updates.status) {
            messages.push(`status → ${updates.status}`);
        }
        if (updates.attributes && typeof updates.attributes === 'object') {
            const attrKeys = Object.keys(updates.attributes);
            if (attrKeys.length > 0) {
                messages.push(`attributes (${attrKeys.join(', ')})`);
            }
        }
        if (Array.isArray(updates.assignments)) {
            const assignmentSummary = updates.assignments
                .map(a => {
                    const team = a.teamId || 'team';
                    const sde = typeof a.sdeYears === 'number' ? a.sdeYears.toFixed(2) : a.sdeYears;
                    return `${team}: ${sde}`;
                })
                .join(', ');
            if (assignmentSummary) {
                messages.push(`assignments → ${assignmentSummary}`);
            }
        }
        const otherKeys = Object.keys(updates).filter(key => !['status', 'attributes', 'assignments'].includes(key));
        if (otherKeys.length > 0) {
            messages.push(`fields: ${otherKeys.join(', ')}`);
        }
        return messages.join('; ');
    }

    /**
     * [NEW] Main entry point for prebuilt agent buttons.
     * This acts as a router to the correct specialist agent.
     * @param {string} agentName - The name of the agent to run.
     * @param {object} payload - The data from the UI (e.g., { engineerName: '...' }).
     */
    async function runPrebuiltAgent(agentName, payload) {
        console.log(`[AI Agent Controller] Received request to run prebuilt agent: ${agentName}`, payload);
        const view = window.aiChatAssistant;
        if (!view) {
             console.error("AI Chat Assistant view is not available.");
             return;
        }

        // 1. Open the chat panel
        view.openAiChatPanel();

        // 2. Route to the specialist
        try {
            switch (agentName) {
                case 'optimizePlan':
                    if (window.aiPlanOptimizationAgent && typeof window.aiPlanOptimizationAgent.runOptimization === 'function') {
                        const contextJson = scrapeCurrentViewContext();
                        const pinnedHistory = [];
                        if (chatSessionHistory[0]) pinnedHistory.push(chatSessionHistory[0]);
                        if (chatSessionHistory[1]) pinnedHistory.push(chatSessionHistory[1]);
                        // Pass the function to post messages
                        window.aiPlanOptimizationAgent.runOptimization({
                            postMessageFn: view.postAgentMessageToView
                        }, {
                            contextJson,
                            primingHistory: pinnedHistory
                        });
                    } else {
                        throw new Error("The Plan Optimization Agent (aiPlanOptimizationAgent.js) is not loaded or does not have a 'runOptimization' function.");
                    }
                    break;
                
                case 'initiateDeleteEngineer':
                    // Placeholder for when we implement this
                    if (window.aiOrgChangeAgent && typeof window.aiOrgChangeAgent.initiateDeleteEngineer === 'function') {
                         window.aiOrgChangeAgent.initiateDeleteEngineer(payload.engineerName);
                    } else {
                        throw new Error("The Org Change Agent (aiOrgChangeAgent.js) is not loaded or is missing 'initiateDeleteEngineer'.");
                    }
                    break;

                default:
                    throw new Error(`Unknown or unavailable prebuilt agent: "${agentName}"`);
            }
        } catch (error) {
            console.error(`Error running specialist agent '${agentName}':`, error);
            view.postAgentMessageToView(`Error: ${error.message}`, true);
        }
    }

    /**
     * [NEW] Handles the user's "Apply" or "Discard" response
     * from a specialist agent's proposal.
     * @param {boolean} didConfirm - True if "Apply" was clicked, false if "Discard".
     */
    function confirmPrebuiltAgent(didConfirm) {
        console.log(`[AI Agent Controller] Received agent confirmation: ${didConfirm}`);
        const view = window.aiChatAssistant;
        if (!view) return;

        let actionHandled = false;
        let outcomeText = didConfirm ? 'Changes applied.' : 'Changes discarded.';

        // Check which agent has pending changes
        if (window.aiPlanOptimizationAgent && typeof window.aiPlanOptimizationAgent.hasPendingChanges === 'function' && window.aiPlanOptimizationAgent.hasPendingChanges()) {
            if (didConfirm) {
                const applied = window.aiPlanOptimizationAgent.applyPendingChanges();
                actionHandled = applied;
                if (!applied) {
                    outcomeText = 'Failed to apply changes.';
                }
            } else {
                window.aiPlanOptimizationAgent.discardPendingChanges();
                actionHandled = true;
            }
        } 
        // else if (window.aiOrgChangeAgent && window.aiOrgChangeAgent.hasPendingChanges()) {
        //     // Logic for other agents will go here
        // } 
        else {
            console.warn("Agent confirmation received, but no agent had pending changes.");
            view.postAgentMessageToView("Could not find the pending changes to apply. Please try running the agent again.", true);
            outcomeText = 'No pending changes found.';
        }

        if (actionHandled || outcomeText) {
            _markAgentConfirmationHandled(outcomeText);
        }
    }

    async function _waitForAnalysisFunction(maxAttempts = 5, delayMs = 200) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (typeof getAnalysisFromPrompt === 'function') {
                return getAnalysisFromPrompt;
            }
            if (typeof window !== 'undefined' && typeof window.getAnalysisFromPrompt === 'function') {
                return window.getAnalysisFromPrompt;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return null;
    }

    function _resolveImageGenerationFunction() {
        if (cachedImageGenerationFn) return cachedImageGenerationFn;
        if (typeof generateImageFromPrompt === 'function') {
            cachedImageGenerationFn = generateImageFromPrompt;
            return cachedImageGenerationFn;
        }
        if (typeof window !== 'undefined' && typeof window.generateImageFromPrompt === 'function') {
            cachedImageGenerationFn = window.generateImageFromPrompt;
            return cachedImageGenerationFn;
        }
        return null;
    }

    function scrapeCurrentViewContext() {
        let contextData = {
            view: currentViewId,
            timestamp: new Date().toISOString()
        };

        console.log(`[AI CHAT] Scraping context for view: ${currentViewId || 'none'}`);

        if (!currentSystemData) {
            contextData.data = "No system is currently loaded.";
            console.warn('[AI CHAT] No system data available while scraping context.');
            return JSON.stringify(contextData);
        }

        contextData.systemName = currentSystemData.systemName;
        contextData.systemDescription = currentSystemData.systemDescription;

        try {
            switch (currentViewId) {
            case 'planningView':
                contextData.data = {
                    viewTitle: "Year Plan",
                    planningYear: currentPlanningYear,
                    scenario: planningCapacityScenario,
                    constraintsEnabled: applyCapacityConstraintsToggle,
                    teamLoadSummary: currentYearPlanSummaryData,
                    planningTable: currentYearPlanTableData
                };
                break;
                case 'capacityConfigView':
                    contextData.data = {
                        metrics: currentSystemData.calculatedCapacityMetrics,
                        config: currentSystemData.capacityConfiguration
                    };
                    break;
                case 'organogramView':
                    contextData.data = {
                        seniorManagers: currentSystemData.seniorManagers,
                        sdms: currentSystemData.sdms,
                        teams: currentSystemData.teams.map(t => ({
                            teamId: t.teamId,
                            teamName: t.teamName,
                            teamIdentity: t.teamIdentity,
                            engineerNames: t.engineers
                        })),
                        allKnownEngineers: currentSystemData.allKnownEngineers
                    };
                    break;
                case 'dashboardView':
                    const currentWidget = dashboardItems[currentDashboardIndex];
                    contextData.data = {
                        currentWidgetTitle: currentWidget.title,
                        dashboardYearFilter: dashboardPlanningYear
                    };
                    try {
                        switch (currentWidget.id) {
                            case 'strategicGoalsWidget':
                                if (typeof prepareGoalData === 'function') {
                                    contextData.data.widgetData = prepareGoalData();
                                }
                                break;
                            case 'accomplishmentsWidget':
                                if (typeof prepareAccomplishmentsData === 'function') {
                                    contextData.data.widgetData = prepareAccomplishmentsData();
                                }
                                break;
                            case 'investmentDistributionWidget':
                                if (typeof processInvestmentData === 'function') {
                                    contextData.data.widgetData = processInvestmentData(dashboardPlanningYear);
                                }
                                break;
                        }
                    } catch (error) {
                        console.warn('Dashboard widget context error:', error);
                    }
                    break;
            case 'visualizationCarousel':
                contextData.data = {
                    services: currentSystemData.services,
                    dependencies: currentSystemData.serviceDependencies,
                    platformDependencies: currentSystemData.platformDependencies,
                    serviceDependenciesTable: typeof window !== 'undefined' ? (window.currentServiceDependenciesTableData || []) : []
                };
                break;
                case 'roadmapView':
                    contextData.data = {
                        initiatives: currentSystemData.yearlyInitiatives,
                        goals: currentSystemData.goals,
                        themes: currentSystemData.definedThemes
                    };
                    break;
                default:
                    contextData.data = currentSystemData;
                    break;
            }
        } catch (error) {
            console.error('Error while scraping context:', error);
            contextData.data = { error: error.message };
        }

        return JSON.stringify(contextData, null, 2);
    }

    function _markAgentConfirmationHandled(statusText) {
        const containerId = (window.aiPlanOptimizationAgent && typeof window.aiPlanOptimizationAgent.getLastConfirmationContainerId === 'function')
            ? window.aiPlanOptimizationAgent.getLastConfirmationContainerId()
            : null;
        if (!containerId) return;
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        });
        const statusEl = container.querySelector('.agent-confirmation-status');
        if (statusEl) {
            statusEl.textContent = statusText || 'Handled.';
        } else if (statusText) {
            const div = document.createElement('div');
            div.className = 'agent-confirmation-status';
            div.textContent = statusText;
            container.appendChild(div);
        }
    }

    return {
        startSession,
        handleUserChatSubmit,
        renderSuggestionsForCurrentView,
        getAvailableTools,
        runPrebuiltAgent,        // [NEW]
        confirmPrebuiltAgent,     // [NEW]
        _waitForAnalysisFunction  // [NEW] Expose helper for specialist agents
    };
})();

if (typeof window !== 'undefined') {
    window.aiAgentController = aiAgentController;
}
