// js/aiChatAssistant.js

// --- Module-specific Globals ---
let aiChatPanel = null;
let aiChatLog = null;
let aiChatInput = null;
let aiChatSendButton = null;

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
    
    // 4. Call the (mocked) AI service
    try {
        const aiResponse = await getAnalysisFromPrompt(
            userQuestion, 
            contextJson, 
            globalSettings.ai.apiKey, // from main.js
            globalSettings.ai.provider // from main.js
        );
        console.log('[AI CHAT] Received AI response.');
        
        // 5. Update the loading message with the real response
        if (loadingMessageEl) {
            loadingMessageEl.textContent = aiResponse;
            loadingMessageEl.classList.remove('loading');
        }

    } catch (error) {
        console.error("Error during AI chat submit:", error);
        if (loadingMessageEl) {
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
 * Helper function to add a message to the chat log UI.
 */
function addChatMessage(text, sender, isLoading = false) {
    if (!aiChatLog) return null;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.textContent = text;
    
    if (isLoading) {
        messageDiv.classList.add('loading');
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

    try {
        switch (currentViewId) {
            case 'planningView':
                contextData.data = {
                    planningYear: currentPlanningYear,
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
                    teams: currentSystemData.teams.map(t => ({ teamId: t.teamId, teamName: t.teamName, teamIdentity: t.teamIdentity })),
                    engineerRosterSummary: {
                        totalEngineers: currentSystemData.allKnownEngineers.length,
                        totalHumans: currentSystemData.allKnownEngineers.filter(e => !e.attributes.isAISWE).length,
                        totalAI: currentSystemData.allKnownEngineers.filter(e => e.attributes.isAISWE).length
                    }
                };
                break;

            case 'dashboardView':
                contextData.data = {
                    currentWidget: dashboardItems[currentDashboardIndex].title,
                    dashboardYearFilter: dashboardPlanningYear
                };
                break;

            case 'visualizationCarousel':
                contextData.data = {
                    services: currentSystemData.services.map(s => s.serviceName),
                    teams: currentSystemData.teams.map(t => t.teamIdentity)
                };
                break;

            default:
                contextData.data = `Context scraping for view '${currentViewId}' is not fully implemented. System name: ${currentSystemData.systemName}`;
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
