/**
 * AIService.js
 * 
 * Domain logic for AI features and UI integration.
 * Handles AI settings validation, UI toggling, generation stats management,
 * and direct interaction with LLM providers (Gemini, etc.).
 * 
 * Part of Service Layer Architecture (see docs/workspace-canvas-contract.md Section 10)
 */

// Feature Flags / Constants
const AI_ANALYSIS_MOCK_MODE = false;
const AI_IMAGE_MOCK_MODE = false;

const MERMAID_SYSTEM_PROMPT = `
You are a technical documentation expert. Your task is to generate a valid Mermaid.js diagram based on the user's request and the provided System Context.

RULES:
1. Return ONLY the raw Mermaid syntax. Do not include markdown fences (\`\`\`) or explanations.
2. Use 'graph TD' or 'graph LR' for architecture/relationship diagrams.
3. Use 'sequenceDiagram' if the user asks for a flow or interaction.
4. Use 'mindmap' if the user asks for a breakdown of goals or themes.
5. Use 'gantt' if the user asks for a schedule, timeline, or project plan.
   - Use 'dateFormat YYYY-MM-DD'.
   - Group tasks into 'section' blocks (e.g., by Initiative or Team).
   - Ensure dates are valid.
6. Use valid IDs (no spaces/special chars). Use labels via brackets or parentheses, e.g. node_id["Label"].
7. Use only one direction declaration (graph TD/LR). Do NOT use 'direction' inside subgraphs.
8. Subgraphs must have explicit IDs: subgraph sg_frontend["Frontend"]. Never use quoted labels as subgraph IDs.
9. Do NOT connect edges to subgraph labels. Edges must connect node IDs only. If you need a group connector, create a node for it.
10. Every node line must start with an ID. Do not output bare labels.
11. Close every subgraph with 'end' and keep each directive on its own line.
12. Avoid colons in labels; use hyphens instead.
13. Base relationships strictly on the provided JSON context.
`;

const AIService = {

    lastGenerationStats: null,

    // --- UI & Stats Management ---

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
            createWithAiCard.classList.toggle('is-hidden', !aiEnabled);
        }

        workspaceComponent.setExtensionEnabled('aiChat', aiEnabled);

        if (!skipPlanningRender && navigationManager.currentViewId === 'planningView') {
            // Dispatch event so views can subscribe to settings changes
            document.dispatchEvent(new CustomEvent('settings:changed', { detail: { aiEnabled: aiEnabled } }));
            // Also refresh active view if it has a render method
            const activeView = navigationManager.getViewInstance('planningView');
            activeView.render();
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
        if (stats) {
            this.lastGenerationStats = stats;
        }

        if (!this.lastGenerationStats) {
            console.warn("AIService: No AI stats available to display.");
            return;
        }

        AIGenerationStatsModal.getInstance().open(this.formatAiStats(this.lastGenerationStats));
    },

    /**
     * Hides the AI stats modal.
     */
    closeStatsModal() {
        AIGenerationStatsModal.getInstance().close();
    },

    /**
     * Sanitizes Mermaid code to reduce common AI output errors.
     * @param {string} rawCode
     * @param {object} options
     * @param {boolean} options.aggressive - Apply stricter cleanup rules.
     * @returns {string}
     */
    sanitizeMermaidCode(rawCode, options = {}) {
        const { aggressive = false } = options;
        if (!rawCode || typeof rawCode !== 'string') return '';

        const normalized = rawCode
            .replace(/```mermaid/gi, '')
            .replace(/```/g, '')
            .replace(/\r\n?/g, '\n');

        const headerRegex = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|mindmap|timeline|quadrantChart)\b/i;
        let headerLine = '';
        let headerHasDirection = false;
        const bodyLines = [];
        const subgraphLabelMap = new Map();
        const usedSubgraphIds = new Set();
        let subgraphDepth = 0;

        const createSubgraphId = (label) => {
            const base = `sg_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}` || 'sg';
            let id = base === 'sg_' ? 'sg' : base;
            let index = 1;
            while (usedSubgraphIds.has(id)) {
                index += 1;
                id = `${base}_${index}`;
            }
            usedSubgraphIds.add(id);
            return id;
        };

        const normalizeSubgraphLine = (line) => {
            const match = line.match(/^subgraph\s+(.+)$/i);
            if (!match) return line;

            const rest = match[1].trim();
            if (!rest) return line;

            const hasLabelWrapper = /[\[\(]/.test(rest);
            if (hasLabelWrapper) {
                return line;
            }

            const isQuoted = rest.startsWith('"') || rest.startsWith("'");
            const labelText = isQuoted ? rest.replace(/^['"]|['"]$/g, '') : rest;
            const hasSpaces = /\s/.test(labelText);
            if (!isQuoted && !hasSpaces) {
                return line;
            }

            const label = labelText.trim();
            if (!label) return line;

            const existing = subgraphLabelMap.get(label);
            const id = existing || createSubgraphId(label);
            subgraphLabelMap.set(label, id);
            return `subgraph ${id}["${label}"]`;
        };

        const replaceSubgraphLabelTokens = (line) => {
            let updated = line;
            subgraphLabelMap.forEach((id, label) => {
                const token = `"${label}"`;
                let startIndex = 0;
                let nextIndex = updated.indexOf(token, startIndex);
                while (nextIndex !== -1) {
                    const before = updated[nextIndex - 1];
                    const after = updated[nextIndex + token.length];
                    const isWrapped = (before === '[' || before === '(') && (after === ']' || after === ')');
                    if (!isWrapped) {
                        updated = `${updated.slice(0, nextIndex)}${id}${updated.slice(nextIndex + token.length)}`;
                        startIndex = nextIndex + id.length;
                    } else {
                        startIndex = nextIndex + token.length;
                    }
                    nextIndex = updated.indexOf(token, startIndex);
                }
            });
            return updated;
        };

        normalized.split('\n').forEach((line) => {
            let trimmed = line.trim();
            if (!trimmed) return;

            if (!headerLine && headerRegex.test(trimmed)) {
                headerLine = trimmed;
                const headerParts = trimmed.split(/\s+/);
                if (headerParts.length >= 2) {
                    const maybeDirection = headerParts[1].toUpperCase();
                    headerHasDirection = ['TB', 'TD', 'BT', 'RL', 'LR'].includes(maybeDirection);
                }
                return;
            }

            trimmed = trimmed.replace(/^\d+[\).]\s+/, '');
            trimmed = trimmed.replace(/^[-*+]\s+/, '');
            trimmed = trimmed.replace(/:/g, ' -');

            if (!trimmed) return;

            if (/^direction\b/i.test(trimmed)) {
                const parts = trimmed.split(/\s+/);
                const dir = (parts[1] || '').toUpperCase();
                if (!['TB', 'TD', 'BT', 'RL', 'LR'].includes(dir)) {
                    return;
                }
                if (subgraphDepth > 0 || headerHasDirection) {
                    return;
                }
            }

            if (aggressive) {
                const looksLikeMermaid = /(-->|---|==>|<--|<->|subgraph\b|end\b|classDef\b|class\b|style\b|linkStyle\b|click\b|direction\b|note\b|[\[\(])/i.test(trimmed);
                if (!looksLikeMermaid) return;
            }

            const normalizedLine = normalizeSubgraphLine(trimmed);
            bodyLines.push(normalizedLine);

            if (/^subgraph\b/i.test(normalizedLine)) {
                subgraphDepth += 1;
            } else if (/^end\b/i.test(normalizedLine)) {
                subgraphDepth = Math.max(0, subgraphDepth - 1);
            }
        });

        const outputLines = [];
        outputLines.push(headerLine || 'graph TD');
        bodyLines.forEach((line) => {
            outputLines.push(replaceSubgraphLabelTokens(line));
        });

        const subgraphCount = outputLines.filter(line => /^subgraph\b/i.test(line)).length;
        const endCount = outputLines.filter(line => /^end\b/i.test(line)).length;
        for (let i = endCount; i < subgraphCount; i += 1) {
            outputLines.push('end');
        }

        return outputLines.join('\n').trim();
    },

    // --- Core AI Logic (Migrated from ai/aiService.js) ---

    /**
     * Public "Router" Function: Generates a new system from a text prompt.
     * It selects the correct internal function based on the provider.
     *
     * @param {string} userPrompt The user's description (e.g., "A spreadsheet app").
     * @param {string} apiKey The user's API key.
     * @param {string} provider The selected provider (e.g., "google-gemini").
     * @param {HTMLElement|null} spinnerP Optional element to update with progress status.
     * @returns {Promise<object|null>} A promise that resolves to { data: object, stats: object } or null on failure.
     */
    async generateSystemFromPrompt(userPrompt, apiKey, provider, spinnerP = null) {
        console.log(`[AI-DEBUG] generateSystemFromPrompt: Routing for provider '${provider}' with prompt: "${userPrompt}"`);

        const systemPrompt = _getSystemGenerationPrompt();

        try {
            switch (provider) {
                case 'google-gemini':
                    return await _generateSystemWithGemini(systemPrompt, userPrompt, apiKey, spinnerP);
                case 'openai-gpt4o':
                    console.warn("OpenAI generation not yet implemented.");
                    notificationManager.showToast("AI provider 'OpenAI (GPT-4o)' is not yet implemented.", 'warning');
                    return { data: null, stats: null };
                case 'anthropic-claude35':
                    console.warn("Anthropic generation not yet implemented.");
                    notificationManager.showToast("AI provider 'Anthropic (Claude 3.5 Sonnet)' is not yet implemented.", 'warning');
                    return { data: null, stats: null };
                case 'mistral-large':
                    console.warn("Mistral generation not yet implemented.");
                    notificationManager.showToast("AI provider 'Mistral (Large 2)' is not yet implemented.", 'warning');
                    return { data: null, stats: null };
                case 'cohere-command-r':
                    console.warn("Cohere generation not yet implemented.");
                    notificationManager.showToast("AI provider 'Cohere (Command R)' is not yet implemented.", 'warning');
                    return { data: null, stats: null };
                default:
                    console.error(`Unknown AI provider: ${provider}`);
                    notificationManager.showToast(`AI System Generation for "${provider}" is not yet supported.`, 'warning');
                    return { data: null, stats: null };
            }
        } catch (error) {
            console.error(`Error during AI generation with ${provider}:`, error);
            notificationManager.showToast(`An error occurred while communicating with the AI. Check the console.\nError: ${error.message}`, 'error');
            const stats = error && error.stats ? error.stats : null;
            return { data: null, stats: stats };
        }
    },

    /**
     * Public "Router" Function: Gets analysis from a full chat history.
     *
     * @param {Array<object>} chatHistory The full conversation history (e.g., [{role: 'user', ...}, {role: 'model', ...}]).
     * @param {string} apiKey The user's API key.
     * @param {string} provider The selected provider.
     * @returns {Promise<object>} A promise that resolves to { textResponse: string, usage: object }
     */
    async getAnalysisFromPrompt(chatHistory, apiKey, provider) {
        console.log(`[AI-DEBUG] getAnalysisFromPrompt: Routing for provider '${provider}'. History has ${chatHistory.length} turns.`);

        if (AI_ANALYSIS_MOCK_MODE) {
            console.warn("[AI-DEBUG] MOCK MODE ENABLED. Returning fake data without API call.");
            await new Promise(resolve => setTimeout(resolve, 750));
            const mockResponse = `This is a mock AI response. I received a history of ${chatHistory.length} turns.`;
            return {
                textResponse: mockResponse,
                usage: { totalTokenCount: 100 }
            };
        }

        try {
            switch (provider) {
                case 'google-gemini':
                    return await _getAnalysisWithGemini(chatHistory, apiKey);
                case 'openai-gpt4o':
                    return { textResponse: "OpenAI analysis is not yet implemented.", usage: { totalTokenCount: 0 } };
                case 'anthropic-claude35':
                    return { textResponse: "Anthropic analysis is not yet implemented.", usage: { totalTokenCount: 0 } };
                default:
                    console.error(`Unknown AI provider: ${provider}`);
                    throw new Error(`Analysis for "${provider}" is not yet supported.`);
            }
        } catch (error) {
            console.error(`Error during AI analysis with ${provider}:`, error);
            throw new Error(`An error occurred while communicating with the AI: ${error.message}`);
        }
    },

    /**
     * Generates a mermaid diagram code from a prompt.
     */
    async generateDiagramFromPrompt(userPrompt, contextJson, apiKey, provider) {
        console.debug("[AI-DIAGRAM] generateDiagramFromPrompt invoked", {
            provider,
            prompt: userPrompt,
            contextLength: (contextJson || '').length
        });
        const prompt = `${MERMAID_SYSTEM_PROMPT}\nCONTEXT:\n${contextJson}\nREQUEST:\n${userPrompt}`;
        try {
            const rawText = await _generateTextWithGemini(prompt, userPrompt, apiKey);
            console.debug("[AI-DIAGRAM] Raw diagram response text:", rawText);
            const cleaned = (rawText || '')
                .replace(/```mermaid/gi, '')
                .replace(/```/g, '')
                .trim();
            if (!cleaned) {
                throw new Error("AI did not return any diagram content. Please try again or adjust your request.");
            }
            const sanitized = AIService.sanitizeMermaidCode(cleaned);
            return { code: sanitized, title: userPrompt };
        } catch (error) {
            console.error("[AI-DIAGRAM] Diagram generation failed:", error);
            throw error;
        }
    },

    /**
     * Generates an image from a prompt.
     * Legacy/Mock wrapper - now primarily uses Diagram generation or Vertex AI.
     */
    async generateImageFromPrompt(userPrompt, contextJson, apiKey, provider) {
        console.log(`[AI-DEBUG] generateImageFromPrompt: Routing for provider '${provider}'...`);

        if (!apiKey) {
            console.error("[AI-DEBUG] Image generation failed: API key is missing.");
            throw new Error("AI API key is not set. Please add your Gemini API key in the AI Assistant settings.");
        }

        // Reuse Mermaid text generation for diagramming instead of mocked images
        const diagramResult = await AIService.generateDiagramFromPrompt(userPrompt, contextJson, apiKey, provider);
        return {
            isImage: false,
            ...diagramResult
        };
    },

    // --- Validation Logic ---

    /**
     * Validates a newly generated AI system object against our core schema rules.
     *
     * @param {object} systemData The parsed JSON object from the AI.
     * @returns {{isValid: boolean, errors: string[], warnings: string[]}}
     */
    validateGeneratedSystem(systemData) {
        console.log("[AI-VALIDATE] Starting AI System Validation...");
        const errors = [];
        const warnings = [];

        // --- 1. Top-Level Existence Checks ---
        console.log("[AI-VALIDATE] Checking top-level data structure...");
        if (!systemData || typeof systemData !== 'object' || Array.isArray(systemData)) {
            errors.push("AI returned no data or the data was not a JSON object.");
            console.error("[AI-VALIDATE] Basic structure validation FAILED. Data is not a valid object.");
            return { isValid: false, errors, warnings };
        }

        const requiredString = (key) => {
            if (!systemData[key] || typeof systemData[key] !== 'string' || systemData[key].trim() === '') {
                errors.push(`Required top-level string "${key}" is missing or empty.`);
            }
        };

        const requiredPopulatedArray = (key) => {
            if (!Array.isArray(systemData[key])) {
                errors.push(`Required field "${key}" is missing or not an array.`);
                return false; // Cannot check contents
            }
            if (systemData[key].length === 0) {
                errors.push(`Required array "${key}" must not be empty. AI must generate this data.`);
                return false;
            }
            return true; // Array exists and is populated
        };

        const optionalArray = (key) => {
            if (!Array.isArray(systemData[key])) {
                errors.push(`Field "${key}" is missing or not an array.`);
                return false;
            }
            if (systemData[key].length === 0) {
                warnings.push(`Array "${key}" is empty. AI should ideally populate this.`);
            }
            return true;
        };

        requiredString('systemName');

        const criticalArrays = [
            'teams', 'allKnownEngineers', 'services',
            'yearlyInitiatives', 'goals', 'definedThemes',
            'sdms', 'pmts', 'projectManagers'
        ];
        let canProceed = true;
        for (const key of criticalArrays) {
            if (!requiredPopulatedArray(key)) {
                canProceed = false;
            }
        }

        if (!Array.isArray(systemData.workPackages)) {
            errors.push(`Required field "workPackages" is missing or not an array.`);
            canProceed = false;
        } else if (systemData.workPackages.length === 0) {
            warnings.push(`Array "workPackages" is empty. Rule #10 (Generate Work Packages) was not fully followed.`);
        }

        if (!systemData.capacityConfiguration || typeof systemData.capacityConfiguration !== 'object') {
            errors.push(`Required field "capacityConfiguration" is missing or not an object.`);
            canProceed = false;
        }

        optionalArray('seniorManagers');

        if (!canProceed) {
            console.error("[AI-VALIDATE] Basic structure validation FAILED. Critical arrays or objects are missing.");
            return { isValid: false, errors, warnings }; // Stop if basic structure is wrong
        }
        console.log("[AI-VALIDATE] Basic structure OK.");


        // --- 2. Build Look-up Sets & Check Uniqueness (Rule #6) ---
        console.log("[AI-VALIDATE] Building look-up sets and checking uniqueness...");
        const teamIds = new Set();
        const teamNames = new Set();
        systemData.teams.forEach((team, i) => {
            if (!team.teamId) errors.push(`Team at index ${i} is missing "teamId".`);
            else if (teamIds.has(team.teamId)) errors.push(`Duplicate teamId found: ${team.teamId}`);
            else teamIds.add(team.teamId);

            if (!team.teamName) errors.push(`Team ${team.teamId || `at index ${i}`} is missing "teamName".`);
            else if (teamNames.has(team.teamName.toLowerCase())) warnings.push(`Duplicate teamName found: ${team.teamName}`);
            else teamNames.add(team.teamName.toLowerCase());
        });

        const sdmIds = new Set();
        systemData.sdms.forEach((sdm, i) => {
            if (!sdm.sdmId) errors.push(`SDM at index ${i} is missing "sdmId".`);
            else if (sdmIds.has(sdm.sdmId)) errors.push(`Duplicate sdmId found: ${sdm.sdmId}`);
            else sdmIds.add(sdm.sdmId);
        });

        const pmtIds = new Set(systemData.pmts.map(p => p.pmtId).filter(Boolean));
        const goalIds = new Set(systemData.goals.map(g => g.goalId).filter(Boolean));
        const themeIds = new Set(systemData.definedThemes.map(t => t.themeId).filter(Boolean));
        const pmIds = new Set(systemData.projectManagers.map(p => p.pmId).filter(Boolean));
        const workPackageIds = new Set(systemData.workPackages.map(wp => wp.workPackageId).filter(Boolean));

        const engineerNameMap = new Map();
        const engineerNameCheck = new Set();
        systemData.allKnownEngineers.forEach((eng, i) => {
            if (!eng.name) errors.push(`Engineer at index ${i} is missing a "name".`);
            else if (engineerNameCheck.has(eng.name.toLowerCase())) errors.push(`Duplicate engineer name found: ${eng.name}`);
            else {
                engineerNameCheck.add(eng.name.toLowerCase());
                engineerNameMap.set(eng.name, eng); // Use exact case for map key
            }
        });

        // --- 3. Relational Integrity Checks (Rule #6, 7, 9, 10) ---
        console.log("[AI-VALIDATE] Checking relational integrity (links between data)...");

        // Check Teams
        console.log(`[AI-VALIDATE] ... checking ${systemData.teams.length} Teams (SDMs, PMTs, Engineers, Capacity)...`);
        systemData.teams.forEach(team => {
            if (team.sdmId && !sdmIds.has(team.sdmId)) {
                errors.push(`Team "${team.teamName}" uses a non-existent sdmId: ${team.sdmId}`);
            }
            if (team.pmtId && !pmtIds.has(team.pmtId)) {
                errors.push(`Team "${team.teamName}" uses a non-existent pmtId: ${team.pmtId}`);
            }

            for (const engName of (team.engineers || [])) {
                if (!engineerNameMap.has(engName)) {
                    errors.push(`Team "${team.teamName}" lists an engineer "${engName}" who is not in 'allKnownEngineers'.`);
                } else {
                    const engData = engineerNameMap.get(engName);
                    if (engData.currentTeamId !== team.teamId) {
                        errors.push(`Data inconsistency: Engineer "${engName}" is in Team "${team.teamName}"'s list, but their 'currentTeamId' in 'allKnownEngineers' is "${engData.currentTeamId}".`);
                    }
                }
            }

            if (!team.teamCapacityAdjustments || typeof team.teamCapacityAdjustments !== 'object') {
                errors.push(`Team "${team.teamName}" is missing "teamCapacityAdjustments" object.`);
            } else {
                if (typeof team.teamCapacityAdjustments.avgOverheadHoursPerWeekPerSDE !== 'number') {
                    warnings.push(`Team "${team.teamName}" is missing "avgOverheadHoursPerWeekPerSDE".`);
                }
                if (typeof team.teamCapacityAdjustments.aiProductivityGainPercent !== 'number') {
                    warnings.push(`Team "${team.teamName}" is missing "aiProductivityGainPercent".`);
                }
            }

            // Type validation for numeric fields
            if (team.fundedHeadcount !== undefined && typeof team.fundedHeadcount !== 'number') {
                errors.push(`Team "${team.teamName}" has invalid "fundedHeadcount" type: expected number, got ${typeof team.fundedHeadcount}. Value: "${team.fundedHeadcount}"`);
            }

            if (!team.attributes || typeof team.attributes !== 'object') {
                warnings.push(`Team "${team.teamName}" is missing "attributes" object.`);
            }
        });

        // Check allKnownEngineers
        console.log(`[AI-VALIDATE] ... checking ${systemData.allKnownEngineers.length} Engineers (roster consistency)...`);
        engineerNameMap.forEach((eng, engName) => {
            if (eng.currentTeamId && !teamIds.has(eng.currentTeamId)) {
                errors.push(`Engineer "${engName}" is assigned to a non-existent teamId: ${eng.currentTeamId}`);
            }
        });

        // Check Services
        console.log(`[AI-VALIDATE] ... checking ${systemData.services.length} Services (Ownership, Dependencies, Attributes)...`);
        systemData.services.forEach(service => {
            if (service.owningTeamId && !teamIds.has(service.owningTeamId)) {
                errors.push(`Service "${service.serviceName}" is owned by a non-existent teamId: ${service.owningTeamId}`);
            }

            if (!service.serviceDependencies || service.serviceDependencies.length === 0) {
                warnings.push(`Service "${service.serviceName}" has no "serviceDependencies".`);
            }
            if (!service.platformDependencies || service.platformDependencies.length === 0) {
                warnings.push(`Service "${service.serviceName}" has no "platformDependencies".`);
            }
            if (!service.attributes || typeof service.attributes !== 'object') {
                warnings.push(`Service "${service.serviceName}" is missing "attributes" object.`);
            }
        });

        // Check Goals
        console.log(`[AI-VALIDATE] ... checking ${systemData.goals.length} Goals...`);
        systemData.goals.forEach(goal => {
            if (!goal.goalId) errors.push('A goal is missing its "goalId".');
            if (!goal.name) errors.push(`Goal "${goal.goalId}" is missing "name".`);

            if (!goal.dueDate) {
                warnings.push(`Goal "${goal.name || goal.goalId}" is missing "dueDate".`);
            }
        });

        // Check Initiatives
        console.log(`[AI-VALIDATE] ... checking ${systemData.yearlyInitiatives.length} Initiatives (Goals, Themes, Personnel, Work Packages)...`);
        systemData.yearlyInitiatives.forEach(init => {
            if (!init.initiativeId) errors.push('An initiative is missing its "initiativeId".');

            if (init.primaryGoalId && !goalIds.has(init.primaryGoalId)) {
                errors.push(`Initiative "${init.title}" uses a non-existent primaryGoalId: ${init.primaryGoalId}`);
            }

            for (const themeId of (init.themes || [])) {
                if (!themeIds.has(themeId)) {
                    errors.push(`Initiative "${init.title}" uses a non-existent themeId: ${themeId}`);
                }
            }

            for (const assignment of (init.assignments || [])) {
                if (!assignment.teamId || !teamIds.has(assignment.teamId)) {
                    errors.push(`Initiative "${init.title}" is assigned to a non-existent teamId: ${assignment.teamId || 'null'}`);
                }
            }

            const checkPersonnel = (personnel, type) => {
                if (!personnel) {
                    warnings.push(`Initiative "${init.title}" is missing "${type}".`);
                    return;
                }
                if (!personnel.type || !personnel.id || !personnel.name) {
                    errors.push(`Initiative "${init.title}" has an incomplete "${type}" object.`);
                    return;
                }
                let idSet;

                switch (personnel.type) {
                    case 'sdm': idSet = sdmIds; break;
                    case 'pmt': idSet = pmtIds; break;
                    case 'pm': idSet = pmIds; break;
                    case 'engineer':
                        idSet = engineerNameMap;
                        break;
                    case 'seniorManager':
                        idSet = new Set(systemData.seniorManagers.map(sm => sm.seniorManagerId));
                        break;
                    default:
                        errors.push(`Initiative "${init.title}" has unknown personnel type "${personnel.type}" for "${type}".`);
                        return;
                }

                const idToFind = (personnel.type === 'engineer') ? personnel.name : personnel.id;
                if (!idSet.has(idToFind)) {
                    errors.push(`Initiative "${init.title}" lists a non-existent ${type}: "${personnel.name}" (ID/Name: ${idToFind}).`);
                }
            };
            checkPersonnel(init.owner, 'owner');
            checkPersonnel(init.projectManager, 'projectManager');
            checkPersonnel(init.technicalPOC, 'technicalPOC');

            if (!init.impactedServiceIds || init.impactedServiceIds.length === 0) {
                warnings.push(`Initiative "${init.title}" has no "impactedServiceIds".`);
            }

            if (!init.workPackageIds || !Array.isArray(init.workPackageIds)) {
                warnings.push(`Initiative "${init.title}" is missing "workPackageIds" array.`);
            } else if (init.workPackageIds.length > 0) {
                for (const wpId of init.workPackageIds) {
                    if (!workPackageIds.has(wpId)) {
                        warnings.push(`Initiative "${init.title}" links to a non-existent workPackageId: ${wpId}`);
                    }
                }
            }
        });

        // Check Work Packages
        console.log(`[AI-VALIDATE] ... checking ${systemData.workPackages.length} Work Packages (links back to initiatives)...`);
        systemData.workPackages.forEach(wp => {
            if (!wp.initiativeId || !systemData.yearlyInitiatives.some(i => i.initiativeId === wp.initiativeId)) {
                warnings.push(`WorkPackage "${wp.workPackageId}" has an invalid or missing "initiativeId": ${wp.initiativeId}`);
            }

            const parentInit = systemData.yearlyInitiatives.find(i => i.initiativeId === wp.initiativeId);
            if (parentInit && (!parentInit.workPackageIds || !parentInit.workPackageIds.includes(wp.workPackageId))) {
                warnings.push(`Data inconsistency: WorkPackage "${wp.workPackageId}" links to initiative "${parentInit.title}", but the initiative does not link back to it in its "workPackageIds" array.`);
            }
        });

        // --- 4. Final Result ---
        if (errors.length > 0) {
            console.error(`[AI-VALIDATE] Validation FAILED. Errors: ${errors.length}, Warnings: ${warnings.length}`);
        } else {
            console.log(`[AI-VALIDATE] Validation PASSED. Errors: 0, Warnings: ${warnings.length}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
};

// --- Private Helpers ---

/**
 * Wraps fetch calls with exponential backoff.
 */
async function _fetchWithRetry(url, options, maxRetries = 5, initialDelay = 1000, spinnerP = null) {
    let attempt = 0;
    let lastDetailedError = null;
    while (attempt < maxRetries) {
        console.log(`[AI-DEBUG] Fetch Attempt ${attempt + 1}/${maxRetries}: POST to ${url.split('?')[0]}`);
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                console.log(`[AI-DEBUG] Fetch Attempt ${attempt + 1} Succeeded (Status: ${response.status})`);
                return response;
            }

            if (response.status >= 400 && response.status < 500) {
                const errorBody = await response.json();
                const errorMessage = `API Error: ${errorBody?.error?.message || response.statusText} (Status: ${response.status})`;
                console.error(`[AI-DEBUG] Fetch Error (4xx): ${response.status}. Not retrying.`, errorBody);
                lastDetailedError = new Error(errorMessage);
                throw new Error(`Google API request failed: ${errorBody.error?.message || response.statusText}`);
            }

            if (response.status >= 500 || response.status === 429) {
                console.warn(`[AI-DEBUG] Fetch Error (5xx/429): ${response.status}. Retrying... (Attempt ${attempt + 1}/${maxRetries})`);
                let errorBody = null;
                try { errorBody = await response.json(); } catch (e) { }
                const errorMessage = `API Error: ${errorBody?.error?.message || response.statusText} (Status: ${response.status})`;
                lastDetailedError = new Error(errorMessage);
                throw new Error(`Retryable error: ${response.statusText}`);
            }

            throw new Error(`Unhandled HTTP error: ${response.status}`);

        } catch (error) {
            if (error.message.includes("Google API request failed")) {
                throw error;
            }

            console.warn(`[AI-DEBUG] Fetch attempt ${attempt + 1} failed: ${error.message}`);
            attempt++;

            if (attempt >= maxRetries) {
                console.error("[AI-DEBUG] Fetch failed after all retries.", lastDetailedError || error);
                const finalErrorMessage = lastDetailedError ? lastDetailedError.message : error.message;
                throw new Error(`API request failed after ${maxRetries} attempts. Last error: ${finalErrorMessage}`);
            }

            const jitter = Math.random() * 1000;
            const delay = initialDelay * Math.pow(2, attempt - 1) + jitter;

            if (spinnerP) {
                spinnerP.textContent = `AI service is busy (Attempt ${attempt}/${maxRetries}). Retrying in ${(delay / 1000).toFixed(1)}s...`;
            }

            console.log(`[AI-DEBUG] Waiting ${delay.toFixed(0)}ms before next retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error("API request failed after all retries.");
}

/**
 * Builds the main "system prompt".
 */
function _getSystemGenerationPrompt() {
    console.log("[AI-DEBUG] _getSystemGenerationPrompt: Building master system prompt...");

    const minimalSchemaExample = {
        "systemName": "Example System",
        "systemDescription": "A brief description of the system.",
        "seniorManagers": [
            { "seniorManagerId": "srMgr-example", "seniorManagerName": "Example Sr. Manager", "attributes": {} }
        ],
        "sdms": [
            { "sdmId": "sdm-example", "sdmName": "Example SDM", "seniorManagerId": "srMgr-example", "attributes": {} }
        ],
        "pmts": [
            { "pmtId": "pmt-example", "pmtName": "Example PMT", "attributes": {} }
        ],
        "projectManagers": [
            { "pmId": "pm-example", "pmName": "Example Project Manager", "attributes": {} }
        ],
        "teams": [
            {
                "teamId": "team-example",
                "teamName": "Example Team",
                "teamIdentity": "Phoenix",
                "fundedHeadcount": 5,
                "engineers": ["Example Engineer 1 (L4)"],
                "awayTeamMembers": [
                    { "name": "Contractor 1", "level": 3, "sourceTeam": "External", "attributes": {} }
                ],
                "sdmId": "sdm-example",
                "pmtId": "pmt-example",
                "teamCapacityAdjustments": {
                    "leaveUptakeEstimates": [],
                    "variableLeaveImpact": { "maternity": { "affectedSDEs": 0, "avgDaysPerAffectedSDE": 0 } },
                    "teamActivities": [],
                    "avgOverheadHoursPerWeekPerSDE": 6,
                    "aiProductivityGainPercent": 10
                },
                "attributes": {}
            }
        ],
        "allKnownEngineers": [
            {
                "name": "Example Engineer 1 (L4)",
                "level": 4,
                "currentTeamId": "team-example",
                "attributes": {
                    "isAISWE": false,
                    "aiAgentType": null,
                    "skills": ["Java", "AWS", "React"],
                    "yearsOfExperience": 5
                }
            },
            {
                "name": "AI-Bot-01",
                "level": 4,
                "currentTeamId": "team-example",
                "attributes": {
                    "isAISWE": true,
                    "aiAgentType": "Code Generation",
                    "skills": ["Python", "Unit Tests"],
                    "yearsOfExperience": null
                }
            }
        ],
        "services": [
            {
                "serviceName": "ExampleService",
                "serviceDescription": "The main service.",
                "owningTeamId": "team-example",
                "apis": [
                    { "apiName": "GetExampleAPI", "apiDescription": "Gets data.", "dependentApis": [], "attributes": {} }
                ],
                "serviceDependencies": [],
                "platformDependencies": ["AWS S3", "PostgreSQL"],
                "attributes": {}
            }
        ],
        "capacityConfiguration": {
            "workingDaysPerYear": 261,
            "standardHoursPerDay": 8,
            "globalConstraints": {
                "publicHolidays": 10,
                "orgEvents": [
                    { "id": "event-1", "name": "Global All-Hands", "estimatedDaysPerSDE": 1, "attributes": {} }
                ]
            },
            "leaveTypes": [
                { "id": "annual", "name": "Annual Leave", "defaultEstimatedDays": 20, "attributes": {} }
            ],
            "attributes": {}
        },
        "yearlyInitiatives": [
            {
                "initiativeId": "init-example-001",
                "title": "Example Initiative (Year 1)",
                "description": "An example initiative.",
                "isProtected": true,
                "assignments": [
                    { "teamId": "team-example", "sdeYears": 1.5 }
                ],
                "impactedServiceIds": ["ExampleService"],
                "roi": {
                    "category": "Tech Debt",
                    "valueType": "QualitativeScore",
                    "estimatedValue": "Critical",
                    "currency": null,
                    "timeHorizonMonths": 12,
                    "confidenceLevel": "High",
                    "calculationMethodology": "N/A",
                    "businessCaseLink": null,
                    "overrideJustification": null,
                    "attributes": {}
                },
                "targetDueDate": "2025-12-31",
                "actualCompletionDate": null,
                "status": "Committed",
                "themes": ["theme-example"],
                "primaryGoalId": "goal-example",
                "projectManager": { "type": "pm", "id": "pm-example", "name": "Example Project Manager" },
                "owner": { "type": "sdm", "id": "sdm-example", "name": "Example SDM" },
                "technicalPOC": { "type": "engineer", "id": "eng-example", "name": "Example Engineer 1 (L4)" },
                "workPackageIds": ["wp-example-001"],
                "attributes": {
                    "pmCapacityNotes": "Example note.",
                    "planningYear": 2025
                }
            }
        ],
        "goals": [
            { "goalId": "goal-example", "name": "Example Goal 2025", "description": "...", "initiativeIds": ["init-example-001"], "attributes": {}, "dueDate": "2025-12-31" }
        ],
        "definedThemes": [
            { "themeId": "theme-example", "name": "Example Theme", "description": "...", "relatedGoalIds": ["goal-example"], "attributes": {} }
        ],
        "archivedYearlyPlans": [],
        "workPackages": [
            {
                "workPackageId": "wp-example-001",
                "initiativeId": "init-example-001",
                "name": "Example Work Package",
                "description": "The first phase of work for the example initiative.",
                "owner": { "type": "sdm", "id": "sdm-example", "name": "Example SDM" },
                "status": "Defined",
                "deliveryPhases": [
                    { "phaseName": "Requirements & Definition", "status": "Completed", "startDate": "2025-01-01", "endDate": "2025-01-31", "notes": "Initial spec complete." }
                ],
                "plannedDeliveryDate": "2025-12-31",
                "actualDeliveryDate": null,
                "impactedTeamAssignments": [{ "teamId": "team-example", "sdeDaysEstimate": 100 }],
                "totalCapacitySDEdays": 100,
                "impactedServiceIds": ["ExampleService"],
                "dependencies": [],
                "attributes": {}
            }
        ],
        "calculatedCapacityMetrics": null,
        "attributes": {}
    };

    const schemaExample = JSON.stringify(minimalSchemaExample, null, 2);

    const promptString = `
You are a seasoned VP of Engineering and strategic business partner, acting as a founding technology leader. Your purpose is to help a user create a tech business and organize their software development teams. You are an expert in software team topologies and organizational structure design, taking the best from industry players like Google, Microsoft, Apple, Netflix, Amazon, etc.

Your sole task is to take a user's prompt (e.g., "An excel spreadsheet company," "A video streaming app") and generate a single, complete, valid JSON object representing the entire software system, organizational structure, and three-year roadmap. This JSON will be used in an educational tool for software managers.

**RULES:**

1.  **JSON ONLY:** You MUST respond with *nothing* but the valid, raw JSON object. Do not include \`\`\`json ... \`\`\` or any explanatory text before or after the JSON block.

2.  **ADHERE TO SCHEMA:** The JSON you generate MUST strictly follow the structure and data types of the example schema provided below. This is the highest priority.

3.  **REAL-WORLD INDUSTRY PRACTICE (Conway's Law):** The generated data must represent real-world industry practice. You must organize the software stack into teams (2-Pizza teams). Teams own services that expose APIs. Services must have plausible upstream and downstream relationships (serviceDependencies). The organizational structure (managers, teams) and the software architecture (services) must be logically aligned.

4.  **SYNTHESIZE A RICH, FRONT-LOADED 3-YEAR ROADMAP:** This is critical. You must generate a *rich and detailed* three-year plan. The plan must be **front-loaded**.
    * **Year 1 (e.g., 2025):** Must be very heavy. Generate approximately **10-12 initiatives**. Focus on MVP, core infrastructure, compliance, and initial features.
    * **Year 2 (e.g., 2026):** Must be detailed. Generate approximately **5-7 initiatives**. Focus on scaling, new feature verticals, and addressing tech debt.
    * **Year 3 (e.g., 2027):** Must be high-level. Generate approximately **3-5 initiatives**. Focus on global expansion, new R&D, and major architectural shifts.
    * **Assign Realistic Statuses:** This is critical. Do not set all initiatives to "Committed". The status must reflect a real-world plan for the *current* year (Year 1):
        * **Year 1 (e.g., 2025):** Show a mix of statuses: "Completed" (for items that would be done by now), "In Progress" (for current items), "Committed" (for items planned this year), and "Backlog" or "Defined" (for items that are not yet funded).
        * **Year 2 (e.g., 2026):** Statuses should mostly be "Defined" (scoped) or "Committed" (high-priority approved items).
        * **Year 3 (e.g., 2027):** Statuses should mostly be "Backlog" or "Defined" (high-level ideas).
    * Include detailed SDE estimates in the \`assignments\` array for each initiative.
    * Assign \`isProtected: true\` to plausible KTLO (Keep The Lights On) or mandatory compliance initiatives.

5.  **POPULATE ALL FIELDS AND ATTRIBUTES:** You must generate rich, plausible data for ALL key arrays: \`seniorManagers\`, \`sdms\`, \`pmts\`, \`projectManagers\`, \`teams\` (including \`awayTeamMembers\` for some), \`allKnownEngineers\` (including realistic \`attributes.skills\`, \`attributes.yearsOfExperience\`, and some \`attributes.isAISWE: true\`), \`services\`, \`yearlyInitiatives\`, \`goals\`, and \`definedThemes\`.
    * **Crucially, you *must* also populate the \`attributes: {}\` object** for most items with 1-2 realistic, non-schema-defined pieces of metadata (e.g., {"cost-center": "123-A"} for a team, {"criticality": "high"} for a service).

6.  **ENSURE 100% CONSISTENCY (CRITICAL):**
    * All \`teamId\` values in the \`teams\` array must be unique.
    * All \`sdmId\`s in the \`sdms\` array must be unique.
    * The \`owningTeamId\` in each \`service\` must match a \`teamId\` from the \`teams\` array.
    * The \`sdmId\` and \`pmtId\` in each \`team\` must match an \`sdmId\` or \`pmtId\` from the respective arrays.
    * Engineers in a team's \`engineers\` array (which are *names*) must be listed in the \`allKnownEngineers\` array.
    * The \`currentTeamId\` for an engineer in \`allKnownEngineers\` MUST match the \`teamId\` of the team they are in.
    * Initiative \`assignments\` must use valid \`teamId\`s.
    * Initiative \`themes\` must use valid \`themeId\`s from the \`definedThemes\` array.
    * Initiative \`primaryGoalId\` must use a valid \`goalId\` from the \`goals\` array.
    * **Personnel Links:** The \`owner\`, \`projectManager\`, and \`technicalPOC\` objects on initiatives and goals *must* be valid. The \`id\` must correspond to a real \`sdmId\`, \`pmtId\`, \`pmId\`, or \`seniorManagerId\`, and the \`name\` must match. For \`technicalPOC\` of type 'engineer', the \`name\` must match an engineer in \`allKnownEngineers\`.

7.  **CREATE DENSE INTERCONNECTIONS:** This is vital for the tool's planning features. The generated system *must* be highly interconnected.
    * **Service Dependencies:** Services *must* have plausible \`serviceDependencies\`. Do not create a system where all services are isolated.
    * **Platform Dependencies:** Services *must* list realistic \`platformDependencies\` (e.g., "AWS S3", "PostgreSQL", "Kafka", "AWS Lambda").
    * **API Dependencies:** APIs *must* call other APIs. Populate \`dependentApis\` to show how services interact at a technical level.
    * **Initiative Impact:** Initiatives *must* impact services. Populate \`impactedServiceIds\` for each initiative to show what parts of the system it touches.

8.  **REALISTIC TEAM LOADING:** The \`sdeYears\` assignments in your roadmap must create realistic challenges. Some teams (especially platform or core product teams) should be heavily loaded or even overloaded in Year 1, reflecting real-world bottlenecks.

9.  **SIMULATE REALISTIC CAPACITY CONSTRAINTS:** This is essential for the planning tool. You *must* populate the capacity model with realistic, non-zero data.
    * Set \`capacityConfiguration.globalConstraints.publicHolidays\` to a realistic number (e.g., 8-12).
    * Add 1-2 plausible \`orgEvents\` to \`globalConstraints.orgEvents\`.
    * Set realistic \`defaultEstimatedDays\` for the defined \`leaveTypes\`.
    * For *every* team in the \`teams\` array, you *must* provide realistic, non-zero values for \`teamCapacityAdjustments\`:
        * Set \`avgOverheadHoursPerWeekPerSDE\` to a plausible number (e.g., 4-8 hours).
        * Set \`aiProductivityGainPercent\` to a value between 5 and 25.
        * Add 1-2 \`teamActivities\` (like training or offsites) for *some* teams.
        * Add *some* non-zero data to \`variableLeaveImpact\` for at least a few teams (e.g., for 'maternity').

10. **[NEW RULE] GENERATE WORK PACKAGES WITH DEPENDENCIES:** You *must* generate 1-3 \`workPackages\` for *at least 10-15 initiatives* (especially for Year 1).
    * Each work package *must* have a valid \`initiativeId\`.
    * Each work package *must* link to the initiative by also adding its \`workPackageId\` to the \`yearlyInitiatives.workPackageIds\` array.
    * **Dependencies:** Create logical dependencies between these work packages.
      * Example: If Initiative A has "Phase 1" and "Phase 2", "Phase 2" must list the \`workPackageId\` of "Phase 1" in its \`dependencies\` array.
      * Creating these links is critical for the Gantt chart visualization.
    * Each work package *must* have realistic \`deliveryPhases\`.
 
11. **[CRITICAL] STRICT DATA TYPES:** Numeric values MUST be JSON numbers, NOT strings. This is a hard requirement.
    * \`fundedHeadcount\` must be a NUMBER (e.g., \`5\`), NOT a string (e.g., \`"5"\`).
    * \`sdeYears\`, \`level\`, \`avgOverheadHoursPerWeekPerSDE\`, \`aiProductivityGainPercent\`, \`estimatedDaysPerSDE\`, \`defaultEstimatedDays\`, \`publicHolidays\`, and ALL other numeric fields must be JSON numbers.
    * **WRONG:** \`"fundedHeadcount": "5"\` (string)
    * **CORRECT:** \`"fundedHeadcount": 5\` (number)
    * Failure to follow this rule will cause the application to crash.
 
12.  **DO NOT TRUNCATE:** Your *entire* response must be a single, complete JSON object. Do not stop part-way. Ensure all brackets and braces are closed.

**JSON SCHEMA EXAMPLE:**
Here is an example of the exact JSON structure you must follow.
${schemaExample}

Proceed to generate the new JSON object based on the user's prompt.
`;
    console.log(`[AI-DEBUG] _getSystemGenerationPrompt: Master prompt length: ${promptString.length} chars.`);
    return promptString;
}

/**
 * Calls the Google Gemini API to generate a system.
 */
async function _generateSystemWithGemini(systemPrompt, userPrompt, apiKey, spinnerP = null) {
    console.log("[AI-DEBUG] _generateSystemWithGemini: Preparing to call Gemini for system generation...");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        "contents": [
            {
                "parts": [
                    { "text": systemPrompt },
                    { "text": "USER_PROMPT: " + userPrompt }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.5,
            "topK": 1,
            "topP": 1,
            "maxOutputTokens": 65000
        },
    };

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    };

    console.log(`[AI-DEBUG] _generateSystemWithGemini: Calling _fetchWithRetry for ${API_URL.split('?')[0]}`);

    const response = await _fetchWithRetry(API_URL, fetchOptions, 5, 1000, spinnerP);

    console.log("[AI-DEBUG] _generateSystemWithGemini: Fetch successful. Parsing response data...");

    const responseData = await response.json();

    const usage = responseData.usageMetadata || {};
    const stats = {
        inputChars: systemPrompt.length + userPrompt.length,
        outputChars: 0,
        outputTokens: usage.candidatesTokenCount || 'N/A',
        totalTokens: usage.totalTokenCount || 'N/A',
        systemPromptSummary: systemPrompt.substring(0, 200) + "..."
    };

    const candidateText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
        console.error("[AI-DEBUG] Invalid response structure from Gemini:", responseData);
        const error = new Error("Received an invalid response from the AI.");
        error.stats = stats;
        throw error;
    }

    const jsonString = candidateText;
    console.log(`[AI-DEBUG] _generateSystemWithGemini: Received raw response string (${jsonString.length} chars).`);

    const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
    stats.outputChars = cleanedJsonString.length;

    try {
        const parsedJson = JSON.parse(cleanedJsonString);
        console.log("[AI-DEBUG] _generateSystemWithGemini: JSON parsed successfully.");
        console.log("[AI-DEBUG] Collected generation stats:", stats);

        return { data: parsedJson, stats: stats };

    } catch (e) {
        console.error("[AI-DEBUG] _generateSystemWithGemini: FAILED to parse JSON response.", e);
        console.error("Raw AI response:", jsonString);
        const error = new Error("The AI returned invalid JSON. Please try again.");
        error.stats = stats;
        throw error;
    }
}

async function _generateTextWithGemini(systemPrompt, userPrompt, apiKey) {
    console.log("[AI-DEBUG] _generateTextWithGemini: Preparing text generation call...");
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const requestBody = {
        "contents": [
            {
                "parts": [
                    { "text": systemPrompt },
                    { "text": "USER_PROMPT: " + userPrompt }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "topK": 1,
            "topP": 1,
            "maxOutputTokens": 4000
        }
    };
    const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    };
    console.log("[AI-DEBUG] _generateTextWithGemini: Calling _fetchWithRetry", { url: API_URL.split('?')[0] });
    const response = await _fetchWithRetry(API_URL, fetchOptions);
    const responseData = await response.json();
    const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("[AI-DEBUG] _generateTextWithGemini: Received text length", text.length);
    return text;
}

/**
 * Check ai/aiService.js for details on legacy image generation.
 */
async function _getAnalysisWithGemini(chatHistory, apiKey) {
    console.log("[AI-DEBUG] _getAnalysisWithGemini: Preparing to call Gemini with full chat history.");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        "contents": chatHistory
    };

    const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    };

    console.log(`[AI-DEBUG] _getAnalysisWithGemini: Calling _fetchWithRetry with ${chatHistory.length} history items.`);

    const response = await _fetchWithRetry(API_URL, fetchOptions);
    const responseData = await response.json();

    if (!responseData.candidates || !responseData.candidates[0].content.parts[0].text) {
        console.error("[AI-DEBUG] Invalid response structure from Gemini:", responseData);
        throw new Error("Received an invalid response from the AI.");
    }

    const textResponse = responseData.candidates[0].content.parts[0].text;
    const usage = responseData.usageMetadata || { totalTokenCount: 0 };

    console.log(`[AI-DEBUG] _getAnalysisWithGemini: Received analysis text. Tokens: ${usage.totalTokenCount}`);

    return { textResponse, usage };
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
