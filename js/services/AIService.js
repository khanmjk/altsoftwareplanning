/**
 * AIService.js
 * 
 * Domain logic for AI features and UI integration.
 * Handles AI settings validation, UI toggling, and generation stats management.
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

const AIService = {

    lastGenerationStats: null,

    /**
     * Updates the UI based on AI feature enablement in global settings.
     * Toggles "Create with AI" card and Chat Panel visibility.
     * @param {object} globalSettings - The current global settings object.
     * @param {object} options - Options options like { skipPlanningRender: boolean }
     */
    updateAiDependentUI(globalSettings, options = {}) {
        const { skipPlanningRender = false } = options;
        const aiEnabled = !!(globalSettings?.ai?.isEnabled);

        // Toggle the new "Create with AI" card in the welcome view
        const createWithAiCard = document.getElementById('createWithAiCard');
        if (createWithAiCard) {
            createWithAiCard.style.display = aiEnabled ? 'block' : 'none';
        }

        const chatContainer = document.getElementById('aiChatPanelContainer');
        const chatHandle = document.getElementById('chatResizeHandle');
        if (chatContainer) {
            if (aiEnabled) {
                chatContainer.style.display = 'block';
                // Check if global aiChatAssistant is available for finer control
                if (!(window.aiChatAssistant && typeof window.aiChatAssistant.isAiChatPanelOpen === 'function' && window.aiChatAssistant.isAiChatPanelOpen())) {
                    chatContainer.style.width = chatContainer.style.width || '0';
                    if (chatHandle) chatHandle.style.display = 'none';
                }
            } else {
                if (window.aiChatAssistant && typeof window.aiChatAssistant.closeAiChatPanel === 'function') {
                    window.aiChatAssistant.closeAiChatPanel();
                }
                chatContainer.style.display = 'none';
                if (chatHandle) chatHandle.style.display = 'none';
            }
        }

        if (!skipPlanningRender && typeof window.currentViewId !== 'undefined' && window.currentViewId === 'planningView' && typeof window.renderPlanningView === 'function') {
            window.renderPlanningView();
        }
    },

    /**
     * Formats AI generation stats into a readable block of text.
     * @param {object} stats 
     * @returns {string} Formatted text
     */
    formatAiStats(stats) {
        if (!stats) return "No statistics were provided.";
        const {
            inputChars = 0,
            outputChars = 0,
            outputTokens = 0,
            totalTokens = 0,
            systemPromptSummary = ''
        } = stats;

        return `Input Characters: ${inputChars.toLocaleString()}
Output Characters: ${outputChars.toLocaleString()}
Output Tokens: ${outputTokens.toLocaleString()}
Total Tokens (est.): ${totalTokens.toLocaleString()}

System Prompt Summary:
${systemPromptSummary}`.trim();
    },

    /**
     * Stores and displays the AI stats modal.
     * @param {object} stats 
     */
    showStatsModal(stats) {
        const modal = document.getElementById('aiGenerationStatsModal');
        const content = document.getElementById('aiGenerationStatsContent');

        if (!modal || !content) {
            console.warn("AIService: AI Stats modal elements not found.");
            return;
        }

        if (stats) {
            this.lastGenerationStats = stats;
        }

        if (!this.lastGenerationStats) {
            console.warn("AIService: No AI stats available to display.");
            return;
        }

        content.textContent = this.formatAiStats(this.lastGenerationStats);
        modal.style.display = 'block';
    },

    /**
     * Hides the AI stats modal.
     */
    closeStatsModal() {
        const modal = document.getElementById('aiGenerationStatsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
};

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.AIService = AIService;
}

// Export for ES modules (future migration)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
