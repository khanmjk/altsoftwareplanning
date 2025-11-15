// js/aiChatAssistant.js

// --- Module-specific Globals ---
let aiChatPanel = null;
let aiChatLog = null;
let aiChatInput = null;
let aiChatSendButton = null;

// [NEW] Initialize markdown-it. It's already loaded in index.html.
const md = window.markdownit();
 
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

        // [NEW] Find the header and make the panel draggable
        const aiChatHeader = aiChatPanel ? aiChatPanel.querySelector('.modal-header') : null;
        if (aiChatPanel && aiChatHeader) {
            makeElementDraggable(aiChatPanel, aiChatHeader);
            console.log("AI Chat Panel is now draggable.");
        }
        // [END NEW]

        if(aiChatPanel) {
            console.log("AI Chat Assistant module initialized.");
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
    if (aiChatPanel) {
        aiChatPanel.style.display = 'flex';
        if(aiChatInput) aiChatInput.focus();
    }
}

/**
 * Closes the AI Chat Panel.
 * This function is called by the 'x' button and by switchView in main.js.
 */
function closeAiChatPanel() {
    if (aiChatPanel) {
        aiChatPanel.style.display = 'none';
    }
}

/**
 * Handles the logic of sending a chat message to the AI service.
 */
async function handleAiChatSubmit() {
    if (!aiChatInput || !aiChatSendButton || !aiChatLog) return;
    
    const userQuestion = aiChatInput.value.trim();
    if (userQuestion.length === 0) return;

    console.log('[AI CHAT] Submitting question.', {
        question: userQuestion,
        currentViewId,
        hasSystemLoaded: !!currentSystemData,
        aiEnabled: globalSettings?.ai?.isEnabled
    });
    
    // Disable input
    aiChatInput.value = '';
    aiChatInput.disabled = true;
    aiChatSendButton.disabled = true;
    
    // 1. Add user's message to log
    addChatMessage(userQuestion, 'user');
    
    // 2. Add loading indicator
    const loadingMessageEl = addChatMessage('AI is thinking...', 'ai', true);
    
    // 3. Scrape context from the current view
    const contextJson = scrapeCurrentViewContext();
    console.log(`[AI CHAT] Context JSON length: ${contextJson.length}`, contextJson);
    
    // 4. Call the AI service
    try {
        const analysisFn = await waitForAnalysisFunction();
        if (!analysisFn) {
            throw new Error('AI analysis service is unavailable.');
        }
        const aiResponse = await analysisFn(
            userQuestion, 
            contextJson, 
            globalSettings.ai.apiKey, // from main.js
            globalSettings.ai.provider // from main.js
        );
        console.log('[AI CHAT] Received AI response.');
        
        // 5. [FIXED] Update the loading message with the real response
        if (loadingMessageEl) {
            // --- NEW STRUCTURE ---
            // 1. Clear the "thinking..." text
            loadingMessageEl.innerHTML = '';
            loadingMessageEl.classList.remove('loading');

            // 2. Create a specific container for the content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'chat-content-container';
            contentDiv.innerHTML = md.render(aiResponse); // Render markdown
            
            // 3. Create the copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'chat-copy-button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = 'Copy response';
            
            // 4. [THE FIX] Implement rich HTML copy
            copyButton.onclick = (e) => {
                e.stopPropagation();
                try {
                    const htmlToCopy = contentDiv.innerHTML;
                    const textToCopy = aiResponse; // The raw markdown as plain text fallback

                    const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
                    const textBlob = new Blob([textToCopy], { type: 'text/plain' });

                    const data = [new ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    })];

                    navigator.clipboard.write(data).then(() => {
                        copyButton.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy rich text: ', err);
                        // Fallback to plain text copy if rich copy fails
                        navigator.clipboard.writeText(textToCopy);
                    });

                } catch (err) {
                    console.error('Error creating ClipboardItem. Falling back to plain text.', err);
                    // Fallback for older browsers or errors
                    navigator.clipboard.writeText(aiResponse);
                }
            };
            
            // 5. Append new elements
            loadingMessageEl.appendChild(contentDiv);
            loadingMessageEl.appendChild(copyButton);
            // --- END NEW STRUCTURE ---
        }

    } catch (error) {
        console.error("Error during AI chat submit:", error);
        if (loadingMessageEl) {
            loadingMessageEl.innerHTML = ''; // Clear "thinking..." text
            loadingMessageEl.textContent = `Error: ${error.message}`;
            loadingMessageEl.style.color = 'red';
            loadingMessageEl.classList.remove('loading');
        }
    } finally {
        // Re-enable input
        aiChatInput.disabled = false;
        aiChatSendButton.disabled = false;
        if(aiChatInput) aiChatInput.focus();
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

/**
 * [NEW] Makes an HTML element draggable by its header.
 * @param {HTMLElement} panel The panel element to be moved.
 * @param {HTMLElement} header The header element that triggers the drag.
 */
function makeElementDraggable(panel, header) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    header.addEventListener('mousedown', (e) => {
        // Only drag if the click is on the header itself, not the close button
        if (e.target.classList.contains('close-button')) {
            return;
        }
        isDragging = true;
        const rect = panel.getBoundingClientRect();
        panel.style.top = rect.top + 'px';
        panel.style.left = rect.left + 'px';
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + panel.offsetWidth > viewportWidth) newLeft = viewportWidth - panel.offsetWidth;
        if (newTop + panel.offsetHeight > viewportHeight) newTop = viewportHeight - panel.offsetHeight;
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
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
