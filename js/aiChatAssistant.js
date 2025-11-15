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
    
    // 4. Call the (mocked) AI service
    try {
        const aiResponse = await getAnalysisFromPrompt(
            userQuestion, 
            contextJson, 
            globalSettings.ai.apiKey, // from main.js
            globalSettings.ai.provider // from main.js
        );
        
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

    if (!currentSystemData) {
        contextData.data = "No system is currently loaded.";
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
        }
    } catch (e) {
        console.error("Error during context scraping:", e);
        contextData.data = "An error occurred while gathering context.";
    }

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
