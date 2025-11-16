// js/aiChatAssistant.js

let chatSessionHistory = []; // [NEW] This is our session memory
let sessionTotalTokens = 0; // [NEW] This will track token usage for the session
const CONVERSATION_HISTORY_LENGTH = 30; // [NEW] Max number of conversational turns to remember (15 user, 15 model)
const USE_FULL_SYSTEM_CONTEXT_TOGGLE = true; // [NEW] The toggle for our data strategy

// --- Module-specific Globals ---
let aiChatPanel = null;
let aiChatLog = null;
let aiChatInput = null;
let aiChatSendButton = null;

// [NEW] Initialize markdown-it. It's already loaded in index.html.
const md = window.markdownit();
let cachedImageGenerationFn = null;
// [MODIFIED] Store all suggested questions, now with image request flags.
const SUGGESTED_QUESTIONS = {
    'planningView': [
        { text: "Which teams are overloaded in this plan?" },
        { text: "How can I optimize this plan to fit more initiatives?", isImageRequest: false },
        { text: "Generate a flowchart for the top 'Committed' initiative.", isImageRequest: true },
        { text: "Suggest SDE-Year reductions for 2-3 BTL initiatives.", isImageRequest: false },
        { text: "Analyze the risks in this plan." }
    ],
    'roadmapView': [
        { text: "Summarize all initiatives currently in 'Backlog' status." },
        { text: "Which 'Defined' initiatives have the highest SDE-Year estimates?" },
        { text: "Show me all initiatives related to the 'Revenue Growth' theme." },
        { text: "Are there any 'Backlog' items with no teams assigned yet?" },
        { text: "Who is the owner of the 'Expand to EU Market' initiative?" }
    ],
    'organogramView': [
        { text: "Rate my overall team composition and find risks." },
        { text: "Generate a stylized org chart of the managers.", isImageRequest: true },
        { text: "Who are all the AI Software Engineers?", isImageRequest: false },
        { text: "Find potential skill gaps in the engineer roster." },
        { text: "Which teams have the highest number of junior engineers?" }
    ],
    'visualizationCarousel': [
        { text: "Generate a block diagram of this architecture.", isImageRequest: true },
        { text: "Rate the architectural design. Are there bottlenecks?", isImageRequest: false },
        { text: "What services does the 'User Management Service' depend on?" },
        { text: "Which team owns the 'Content Delivery Service'?" },
        { text: "Show a table of all services and their owning teams." }
    ],
    'dashboardView': [
        { text: "Summarize the key takeaways from the 'Strategic Goals' widget." },
        { text: "Generate a mind map of our 'Strategic Goals'.", isImageRequest: true },
        { text: "What risks do you see in the 'Team Demand' widget data?" },
        { text: "Analyze the 'Investment Distribution' for this year." },
        { text: "What's the biggest accomplishment shown?" }
    ],
    'capacityConfigView': [
        { text: "Find anomalies in my capacity configuration." },
        { text: "Which team has the highest 'avgOverheadHoursPerWeekPerSDE'?" },
        { text: "Walk me through the capacity calculation for the 'Avengers' team." },
        { text: "What is the total 'AI Productivity Gain' across the org?" },
        { text: "Compare the 'Standard Leave' days for all teams." }
    ],
    'systemEditForm': [
        { text: "How do I add a new Team?" },
        { text: "What's the difference between 'Engineers' and 'Away-Team Members'?" },
        { text: "Find any services that don't have an owning team." },
        { text: "Find any engineers in the roster who are not assigned to a team." },
        { text: "Explain the 'Platform Dependencies' field for a service." }
    ],
    'sdmForecastingView': [
        { text: "Explain the 'Effective Engineers' calculation." },
        { text: "How does 'Annual Attrition Rate' affect this forecast?" },
        { text: "What's the difference between 'Total Ramped Up Engineers' and 'Total Headcount'?" },
        { text: "Analyze the hiring rate needed to close the gap by the target week." },
        { text: "How do the 'Capacity Constraints' (like overhead) affect this forecast?" }
    ],
    'default': [
        { text: "What is this system about?" },
        { text: "How many teams are there?" },
        { text: "Summarize the main strategic goals." },
        { text: "List all services in the system." }
    ]
};
 
/**
 * Initializes the AI Chat Panel elements and attaches event listeners.
 * This is called once by main.js on startup.
 */
function initializeAiChatPanel() {
    // We must wait for the component to be loaded by main.js
    // A simple delay ensures the HTML is in the DOM.
    setTimeout(() => {
        aiChatPanel = document.getElementById('aiChatPanel');
        aiChatLog = document.getElementById('aiChatLog');
        aiChatInput = document.getElementById('aiChatInput');
        aiChatSendButton = document.getElementById('aiChatSendButton');

        if (aiChatSendButton) {
            aiChatSendButton.addEventListener('click', handleAiChatSubmit);
        } else {
            console.error("AI Chat: Send button not found.");
        }
        
        if (aiChatInput) {
            aiChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAiChatSubmit();
                }
            });
        } else {
             console.error("AI Chat: Input text area not found.");
        }
        if (typeof initializeChatResizer === 'function') {
            initializeChatResizer();
        }

        if(aiChatPanel) {
            console.log("AI Chat Assistant module initialized.");
            renderSuggestedQuestions();
        } else {
            console.error("AI Chat: Panel not found. HTML component might have failed to load.");
        }
    }, 500); // Wait 500ms for HTML components to load.
}

/**
 * Opens the AI Chat Panel.
 * This function is called by the button in main.js.
 */
function openAiChatPanel() {
    if (!aiChatPanel) return;
    const panel = document.getElementById('aiChatPanelContainer');
    const handle = document.getElementById('chatResizeHandle');
    if (panel) panel.style.width = '400px';
    if (handle) handle.style.display = 'block';
    if (typeof renderSuggestedQuestions === 'function') {
        renderSuggestedQuestions();
    }
    if(aiChatInput) aiChatInput.focus();
}

/**
 * Closes the AI Chat Panel.
 * This function is called by the 'x' button and by switchView in main.js.
 */
function closeAiChatPanel() {
    const panel = document.getElementById('aiChatPanelContainer');
    const handle = document.getElementById('chatResizeHandle');
    if (panel) panel.style.width = '0';
    if (handle) handle.style.display = 'none';
}

/**
 * [NEW] Returns the expert persona and analysis rules for the AI.
 * This is the refined prompt we worked on.
 */
function _getAiPrimingPrompt() {
    return `You are an expert Software Engineering Planning & Management Partner. Your goals are to:
    1.  **Prioritize the CONTEXT DATA:** Base all your answers about the user's system (initiatives, teams, engineers, services) exclusively on the JSON data provided in the "CONTEXT DATA" section.
    2.  **Use General Knowledge as a Fallback:** If the user asks a general knowledge question (e.g., "What is AWS?", "Define 'SDE-Year'"), and the answer is *not* in the CONTEXT DATA, you may use your own knowledge to provide a brief, helpful definition.
    3.  **Be Clear:** When using your own knowledge, state it (e.g., "AWS CloudFront is a content delivery network..."). When using the context, be specific (e.g., "Based on the data, the 'Avengers' team...").
    
    4.  **Perform Expert Analysis & Provide Recommendations (Your Main Task):** If the user asks for an analysis, opinion, rating, or recommendation (e.g., "rate this," "find risks," "optimize this plan"), you MUST perform a deep analysis. Even for simple questions, you should *proactively* add these insights if you find them.
        * **Architectural Analysis:** Use the \`services\` data (especially \`serviceDependencies\`) to comment on loose/tight coupling, potential bottlenecks, or how the architecture aligns with team structure (Conway's Law).
        * **Organizational Analysis:** Use \`allKnownEngineers\` and \`teams\` data to analyze team composition. Proactively find and highlight risks like skill gaps, high junior-to-senior ratios, or single-person dependencies on a critical skill.
        * **Capacity & Risk Analysis:** If the context includes \`capacityConfigView\` or \`planningView\` data, actively scrutinize it. Find anomalies. (e.g., "I notice the 'Avengers' have 20 hours/week of overhead while all other teams have 6. Is this correct?"). Call out opportunities to optimize leave schedules or other constraints.
        * **Planning & Optimization Suggestions:** This is your most advanced task. When asked to analyze or optimize the \`planningView\`, do not just re-order initiatives.
            a.  First, respect all \`isProtected: true\` initiatives.
            b.  Then, to fit more work, you are empowered to **suggest specific reductions to SDE-Year estimates** for non-protected items.
            c.  You must justify *why* (e.g., "The initiative 'Improve UI' is 2.5 SDE-Years, which seems high for a UI-only task. Reducing it to 1.5 might fit it Above The Line.").
            d.  Recommend a new priority order based on \`roi\` and your new estimates.`;
}

/**
 * [NEW] Clears the chat UI and primes the AI's memory with the
 * persona and (optionally) the full system context.
 * This is called by loadSavedSystem() in main.js.
 */
function startNewAiChatSession() {
    console.log("[AI CHAT] Starting new chat session. Clearing history and UI.");

    // 1. Clear the UI
    if (aiChatLog) {
        aiChatLog.innerHTML = '<div class="chat-message ai-message">Hello! I have loaded the context for <strong>' + (currentSystemData?.systemName || 'the system') + '</strong>. How can I help you analyze it?</div>';
    }
    const usageDisplay = document.getElementById('aiChatUsageDisplay');
    if (usageDisplay) {
        usageDisplay.textContent = 'Session Tokens: 0';
    }

    // 2. Clear the session memory and token count
    chatSessionHistory = [];
    sessionTotalTokens = 0;
    
    if (!currentSystemData) {
        console.warn("[AI CHAT] No system data loaded. AI assistant will have no context.");
        return;
    }

    // 3. Get the refined persona prompt
    let primingPrompt = _getAiPrimingPrompt();

    // 4. Add the correct context based on our toggle
    if (USE_FULL_SYSTEM_CONTEXT_TOGGLE) {
        // STRATEGY 1: Pin the *entire* system data.
        const fullContextJson = JSON.stringify(currentSystemData, null, 2);
        primingPrompt += `

HERE IS THE FULL SYSTEM DATA ("CONTEXT DATA"):
${fullContextJson}

Confirm you have received these instructions and the full system data, and are ready to answer questions.`;
        
        console.log(`[AI CHAT] New session primed with FULL system context (${fullContextJson.length} chars).`);

    } else {
        // STRATEGY 2: Minimal priming prompt. Context will be added to each user message.
        primingPrompt += `

You will be given the CONTEXT DATA with each user question. Confirm you have received these instructions.`;
        console.log(`[AI CHAT] New session primed with MINIMAL context. Context will be scraped per-question.`);
    }
    
    // 5. Add this priming data to the history. This becomes our "pinned" context.
    chatSessionHistory.push({ role: 'user', parts: [{ text: primingPrompt }] });
    chatSessionHistory.push({ role: 'model', parts: [{ text: `Understood. I have loaded the context for ${currentSystemData.systemName}. I am ready to analyze.` }] });
}

/**
 * [MODIFIED] Handles the logic of sending a chat message to the AI service.
 * Now uses stateful chatSessionHistory and the USE_FULL_SYSTEM_CONTEXT_TOGGLE.
 */
async function handleAiChatSubmit() {
    if (!aiChatInput || !aiChatSendButton || !aiChatLog) return;
    
    const userQuestion = aiChatInput.value.trim();
    if (userQuestion.length === 0) return;

    console.log('[AI CHAT] Submitting question.', { question: userQuestion, view: currentViewId });
    
    // Disable input
    aiChatInput.value = '';
    aiChatInput.disabled = true;
    aiChatSendButton.disabled = true;
    
    // 1. Add user's message to log
    addChatMessage(userQuestion, 'user');
    
    // 2. Add loading indicator
    const loadingMessageEl = addChatMessage('AI is thinking...', 'ai', true);
    
    // 3. [NEW] Prepare the user's turn based on the toggle
    let userTurnContent = "";
    if (USE_FULL_SYSTEM_CONTEXT_TOGGLE) {
        // STRATEGY 1: Just send the question. The context is already in the pinned prompt.
        userTurnContent = userQuestion;
    } else {
        // STRATEGY 2: Scrape context and append it to the question.
        const contextJson = scrapeCurrentViewContext();
        console.log(`[AI CHAT] Scraping MINIMAL context (${contextJson.length} chars) from view: ${currentViewId}`);
        userTurnContent = `
USER QUESTION:
"${userQuestion}"

CONTEXT DATA (for this question only):
${contextJson}
        `;
    }
    
    // 4. [NEW] Add this combined turn to our session history
    chatSessionHistory.push({ role: 'user', parts: [{ text: userTurnContent }] });

    // 5. [NEW] Create the "sliding window" of history to send
    let historyToSend = [];
    if (chatSessionHistory.length <= CONVERSATION_HISTORY_LENGTH) {
        // If history is short, send all of it
        historyToSend = chatSessionHistory;
    } else {
        // If history is long, send Pinned Prompt + Last N turns
        historyToSend = [
            chatSessionHistory[0], // Pinned Persona/Data Prompt
            chatSessionHistory[1], // Pinned Persona/Data Response
            ...chatSessionHistory.slice(-CONVERSATION_HISTORY_LENGTH) // Last 30 items
        ];
        console.log(`[AI CHAT] History is long (${chatSessionHistory.length} turns). Sending Pinned + Last ${CONVERSATION_HISTORY_LENGTH} turns.`);
    }
    
    // 6. Call the AI service
    try {
        const analysisFn = await waitForAnalysisFunction();
        if (!analysisFn) throw new Error('AI analysis service is unavailable.');

        // [MODIFIED] Pass the historyToSend, and expect an object back
        const aiResponse = await analysisFn(
            historyToSend,
            globalSettings.ai.apiKey,
            globalSettings.ai.provider
        );
        
        // 7. [NEW] Add the AI's response to our session memory
        chatSessionHistory.push({ role: 'model', parts: [{ text: aiResponse.textResponse }] });
        
        // 8. [NEW] Update token count
        if (aiResponse.usage && aiResponse.usage.totalTokenCount) {
            sessionTotalTokens += aiResponse.usage.totalTokenCount;
            const usageDisplay = document.getElementById('aiChatUsageDisplay');
            if (usageDisplay) {
                usageDisplay.textContent = `Session Tokens: ${sessionTotalTokens.toLocaleString()}`;
            }
        }

        console.log(`[AI CHAT] Received response. History now has ${chatSessionHistory.length} turns. Session Tokens: ${sessionTotalTokens}`);
        
        // 9. [MODIFIED] Update the loading message with the real response TEXT
        if (loadingMessageEl) {
            loadingMessageEl.innerHTML = ''; // Clear "thinking..."
            loadingMessageEl.classList.remove('loading');

            const contentDiv = document.createElement('div');
            contentDiv.className = 'chat-content-container';
            contentDiv.innerHTML = md.render(aiResponse.textResponse); // Render markdown
            
            const copyButton = document.createElement('button');
            copyButton.className = 'chat-copy-button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = 'Copy response';
            
            copyButton.onclick = (e) => {
                e.stopPropagation();
                try {
                    const htmlToCopy = contentDiv.innerHTML;
                    const textToCopy = aiResponse.textResponse; // The raw markdown
                    const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
                    const textBlob = new Blob([textToCopy], { type: 'text/plain' });
                    const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
                    navigator.clipboard.write(data).then(() => {
                        copyButton.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => { copyButton.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy rich text, falling back to plain text.', err);
                        navigator.clipboard.writeText(textToCopy); // Fallback
                    });
                } catch (err) {
                    console.error('Error creating ClipboardItem, falling back to plain text.', err);
                    navigator.clipboard.writeText(aiResponse.textResponse); // Fallback
                }
            };
            
            loadingMessageEl.appendChild(contentDiv);
            loadingMessageEl.appendChild(copyButton);
        }

    } catch (error) {
        console.error("Error during AI chat submit:", error);
        if (loadingMessageEl) {
            loadingMessageEl.innerHTML = '';
            loadingMessageEl.textContent = `Error: ${error.message}`;
            loadingMessageEl.style.color = 'red';
            loadingMessageEl.classList.remove('loading');
        }
        // [NEW] Remove the failed user turn from history so they can try again
        if (chatSessionHistory.length > 0 && chatSessionHistory[chatSessionHistory.length - 1].role === 'user') {
            chatSessionHistory.pop();
            console.log("[AI CHAT] Removed failed user turn from history.");
        }
    } finally {
        // Re-enable input
        aiChatInput.disabled = false;
        aiChatSendButton.disabled = false;
        if(aiChatInput) aiChatInput.focus();
        const suggestionsContainer = document.getElementById('aiChatSuggestions');
        if (suggestionsContainer) suggestionsContainer.style.display = 'flex';
    }
}

/**
 * [NEW] Handles sending an image generation request.
 */
async function handleAiImageSubmit(userQuestion) {
    if (!aiChatInput || !aiChatSendButton || !aiChatLog) return;
    
    const question = userQuestion || aiChatInput.value.trim();
    if (question.length === 0) return;

    console.log('[AI CHAT] Submitting IMAGE request.', { question, currentViewId });
    
    aiChatInput.value = '';
    aiChatInput.disabled = true;
    aiChatSendButton.disabled = true;
    
    addChatMessage(question, 'user');
    const loadingMessageEl = addChatMessage('AI is generating an image...', 'ai', true);
    const contextJson = scrapeCurrentViewContext();
    
    try {
        const imageFn = resolveImageGenerationFunction();
        if (!imageFn) {
            throw new Error('AI image generation service is unavailable. Please ensure AI is enabled and an API key is saved.');
        }
        const response = await imageFn(
            question, 
            contextJson, 
            globalSettings.ai.apiKey,
            globalSettings.ai.provider
        );

        if (loadingMessageEl && response && response.isImage) {
            loadingMessageEl.innerHTML = `
                <p>Here is the generated diagram:</p>
                <img src="${response.imageUrl}" 
                     alt="${response.altText}" 
                     class="chat-generated-image" 
                     title="Right-click to copy or save this image" />
            `;
            loadingMessageEl.classList.remove('loading');
        } else {
            throw new Error('Mock response was not a valid image object.');
        }

    } catch (error) {
        console.error("Error during AI image submit:", error);
        if (loadingMessageEl) {
            loadingMessageEl.innerHTML = '';
            loadingMessageEl.textContent = `Error: ${error.message}`;
            loadingMessageEl.style.color = 'red';
            loadingMessageEl.classList.remove('loading');
        }
    } finally {
        aiChatInput.disabled = false;
        aiChatSendButton.disabled = false;
        if(aiChatInput) aiChatInput.focus();
        const suggestionsContainerFinal = document.getElementById('aiChatSuggestions');
        if (suggestionsContainerFinal) suggestionsContainerFinal.style.display = 'flex';
    }
}

/**
 * [MODIFIED] Helper function to add a message to the chat log UI.
 */
function addChatMessage(text, sender, isLoading = false) {
    if (!aiChatLog) return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    if (isLoading) {
        messageDiv.classList.add('loading');
    }

    if (sender === 'ai') {
        // AI messages: Render as HTML.
        // This will primarily be used for the "thinking..." message.
        messageDiv.innerHTML = md.render(text); 
    } else {
        // User messages: Render as plain text to prevent self-XSS
        messageDiv.textContent = text;
    }
    
    aiChatLog.appendChild(messageDiv);
    
    // Scroll to bottom
    aiChatLog.scrollTop = aiChatLog.scrollHeight;
    
    return messageDiv;
}

/**
 * [MODIFIED] Renders the suggested question pills based on the current view.
 */
function renderSuggestedQuestions() {
    let suggestionsContainer = document.getElementById('aiChatSuggestions');
    if (!suggestionsContainer) {
        const chatPanel = document.getElementById('aiChatPanel');
        const inputContainer = document.getElementById('aiChatInputContainer');
        if (chatPanel && inputContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'aiChatSuggestions';
            suggestionsContainer.className = 'ai-chat-suggestions';
            chatPanel.insertBefore(suggestionsContainer, inputContainer);
        }
    }
    if (!suggestionsContainer) return;

    suggestionsContainer.style.display = 'flex';

    const questions = SUGGESTED_QUESTIONS[currentViewId] || SUGGESTED_QUESTIONS['default'];
    suggestionsContainer.innerHTML = '';

    questions.forEach(question => {
        if (question.isImageRequest) {
            if (!globalSettings || !globalSettings.ai || !globalSettings.ai.isEnabled || !globalSettings.ai.apiKey) {
                return;
            }
        }

        const pill = document.createElement('div');
        pill.className = 'suggestion-pill';

        if (question.isImageRequest) {
            pill.innerHTML = `<i class="fas fa-image"></i> ${question.text}`;
        } else {
            pill.textContent = question.text;
        }

        pill.onclick = () => {
            console.log('[AI CHAT] Suggested question clicked:', question.text, { isImageRequest: !!question.isImageRequest });
            if (aiChatInput) {
                aiChatInput.value = question.text;
            }
            if (question.isImageRequest) {
                handleAiImageSubmit(question.text);
            } else {
                handleAiChatSubmit();
            }
        };
        suggestionsContainer.appendChild(pill);
    });
}

/**
 * Implements the "Context Scraper" backlog item.
 * It reads the global 'currentViewId' and 'currentSystemData'
 * to provide relevant context for the AI.
 */
function scrapeCurrentViewContext() {
    let contextData = {
        view: currentViewId, // from main.js
        timestamp: new Date().toISOString()
    };

    console.log(`[AI CHAT] Scraping context for view: ${currentViewId || 'none'}`);

    if (!currentSystemData) {
        contextData.data = "No system is currently loaded.";
        console.warn('[AI CHAT] No system data available while scraping context.');
        return JSON.stringify(contextData);
    }

    // [NEW] Add high-level context to ALL payloads
    contextData.systemName = currentSystemData.systemName;
    contextData.systemDescription = currentSystemData.systemDescription;
    // [END NEW]

    try {
        switch (currentViewId) {
            case 'planningView':
                contextData.data = {
                    planningYear: currentPlanningYear,
                    // [NEW] Send the metrics that power this view
                    calculatedCapacityMetrics: currentSystemData.calculatedCapacityMetrics,
                    planningScenario: planningCapacityScenario, // from yearPlanning.js
                    constraintsEnabled: applyCapacityConstraintsToggle, // from yearPlanning.js
                    
                    // [NEW] Send team/sdm info to help AI resolve IDs
                    teams: currentSystemData.teams.map(t => ({ teamId: t.teamId, teamIdentity: t.teamIdentity, sdmId: t.sdmId })),
                    sdms: currentSystemData.sdms.map(s => ({ sdmId: s.sdmId, sdmName: s.sdmName })),

                    // Send the initiatives for this year
                    initiatives: (currentSystemData.yearlyInitiatives || []).filter(init => init.attributes.planningYear == currentPlanningYear)
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
                        engineerNames: t.engineers // [NEW] List of engineer names on this team
                    })),

                    // [REPLACED] Send the full engineer roster so AI can answer skill/level questions
                    allKnownEngineers: currentSystemData.allKnownEngineers 
                };
                break;

            case 'dashboardView':
                const currentWidget = dashboardItems[currentDashboardIndex]; // from dashboard.js
                contextData.data = {
                    currentWidgetTitle: currentWidget.title,
                    dashboardYearFilter: dashboardPlanningYear // from dashboard.js
                };

                // [NEW] Dynamically add the data for the *specific widget* being viewed
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
                        case 'investmentTrendWidget':
                            // This one processes all years, so no filter needed
                            if (typeof generateInvestmentTrendChart === 'function') {
                                // This is complex as data is processed *inside* the chart func.
                                // We'll skip sending data for this one for now.
                                contextData.data.widgetNote = "Context scraping for this specific widget is not yet fully supported.";
                            }
                            break;
                        case 'teamDemandWidget':
                            if (typeof processTeamDemandData === 'function') {
                                // Note: This depends on filters set in 'roadmapTableFiltersDemand'
                                contextData.data.widgetData = processTeamDemandData();
                            }
                            break;
                        case 'roadmapTimelineWidget':
                        case 'threeYearPlanWidget':
                            contextData.data.widgetNote = "Context for roadmap widgets is best viewed from the 'Roadmap & Backlog' page.";
                            break;
                        case 'initiativeImpactWidget':
                             contextData.data.widgetNote = "This is a complex visual graph. Ask me questions, and I will try to answer from the raw data.";
                             contextData.data.widgetData = {
                                initiatives: currentSystemData.yearlyInitiatives.length,
                                teams: currentSystemData.teams.length,
                                services: currentSystemData.services.length
                             };
                            break;
                    }
                } catch (e) {
                    console.error("Error scraping dashboard widget context:", e);
                    contextData.data.widgetError = "Could not scrape context for this widget.";
                }
                break;

            case 'visualizationCarousel':
                contextData.data = {
                    // Send richer data so AI can answer "what does this service do?"
                    services: currentSystemData.services.map(s => ({
                        serviceName: s.serviceName,
                        serviceDescription: s.serviceDescription,
                        owningTeamId: s.owningTeamId,
                        serviceDependencies: s.serviceDependencies,
                        platformDependencies: s.platformDependencies
                    })),
                    // Send richer data so AI can answer "who is on this team?"
                    teams: currentSystemData.teams.map(t => ({
                        teamId: t.teamId,
                        teamName: t.teamName,
                        teamIdentity: t.teamIdentity,
                        sdmId: t.sdmId,
                        pmtId: t.pmtId
                    }))
                };
                break;

            default:
                // The systemName and systemDescription are already added at the top
                contextData.data = `No specific context is scraped for the current view ('${currentViewId}').`;
                console.warn('[AI CHAT] Missing specialized context handler for view:', currentViewId);
        }
    } catch (e) {
        console.error("Error during context scraping:", e);
        contextData.data = "An error occurred while gathering context.";
    }

    console.debug('[AI CHAT] Context payload prepared:', contextData);
    // Stringify with a replacer to handle potential circular references, though unlikely here
    return JSON.stringify(contextData, (key, value) => {
        // Simple circularity check (not needed for our simple data, but good practice)
        if (typeof value === 'object' && value !== null) {
            if (key === '_d3_') { // Example: exclude d3 internal properties
                return;
            }
        }
        return value;
    }, 2); // 2-space indentation
}

let isChatResizing = false;

function initializeChatResizer() {
    const handle = document.getElementById('chatResizeHandle');
    if (!handle) {
        console.error("Chat resize handle not found");
        return;
    }
    handle.addEventListener('mousedown', onChatResizeMouseDown);
    console.log("Chat resize handle initialized.");
}

function onChatResizeMouseDown(e) {
    e.preventDefault();
    isChatResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onChatResizeMouseMove);
    document.addEventListener('mouseup', onChatResizeMouseUp);
}

function onChatResizeMouseMove(e) {
    if (!isChatResizing) return;
    const panel = document.getElementById('aiChatPanelContainer');
    if (!panel) return;
    let newWidth = window.innerWidth - e.clientX;
    if (newWidth < 300) newWidth = 300;
    if (newWidth > window.innerWidth / 2) newWidth = window.innerWidth / 2;
    panel.style.width = newWidth + 'px';
}

function onChatResizeMouseUp() {
    isChatResizing = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
    document.removeEventListener('mousemove', onChatResizeMouseMove);
    document.removeEventListener('mouseup', onChatResizeMouseUp);
}

/**
 * Helper: Waits for the AI analysis function to be available before using it.
 */
async function waitForAnalysisFunction(maxAttempts = 5, delayMs = 200) {
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

function resolveImageGenerationFunction() {
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
