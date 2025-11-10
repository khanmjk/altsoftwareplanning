// js/aiService.js

// --- AI System Generation ---

/**
 * Public "Router" Function: Generates a new system from a text prompt.
 * It selects the correct internal function based on the provider.
 *
 * @param {string} userPrompt The user's description (e.g., "A spreadsheet app").
 * @param {string} apiKey The user's API key.
 * @param {string} provider The selected provider (e.g., "google-gemini").
 * @returns {Promise<object|null>} A promise that resolves to the new currentSystemData object or null on failure.
 */
async function generateSystemFromPrompt(userPrompt, apiKey, provider) {
    console.log(`AI: Routing system generation for provider: ${provider}`);
    
    // 1. Get the shared "System Prompt" (the schema and rules)
    const systemPrompt = _getSystemGenerationPrompt();

    // 2. Route to the correct provider-specific function
    try {
        switch (provider) {
            case 'google-gemini':
                return await _generateSystemWithGemini(systemPrompt, userPrompt, apiKey);
            case 'openai-gpt4o':
                // return await _generateSystemWithOpenAI(systemPrompt, userPrompt, apiKey);
                console.warn("OpenAI generation not yet implemented.");
                alert("AI provider 'OpenAI (GPT-4o)' is not yet implemented.");
                return null; // TODO
            case 'anthropic-claude35':
                // return await _generateSystemWithAnthropic(systemPrompt, userPrompt, apiKey);
                console.warn("Anthropic generation not yet implemented.");
                alert("AI provider 'Anthropic (Claude 3.5 Sonnet)' is not yet implemented.");
                return null; // TODO
            case 'mistral-large':
                console.warn("Mistral generation not yet implemented.");
                alert("AI provider 'Mistral (Large 2)' is not yet implemented.");
                return null; // TODO
            case 'cohere-command-r':
                console.warn("Cohere generation not yet implemented.");
                alert("AI provider 'Cohere (Command R)' is not yet implemented.");
                return null; // TODO
            default:
                console.error(`Unknown AI provider: ${provider}`);
                alert(`AI System Generation for "${provider}" is not yet supported.`);
                return null;
        }
    } catch (error) {
        console.error(`Error during AI generation with ${provider}:`, error);
        alert(`An error occurred while communicating with the AI. Check the console.\nError: ${error.message}`);
        return null;
    }
}

/**
 * Builds the main "system prompt" that instructs the AI on its task.
 * This is kept separate so all providers can use the same instructions.
 * @returns {string} The detailed system prompt.
 */
function _getSystemGenerationPrompt() {
    // This is the most important part. We give the AI its persona, rules, and the exact schema.
    // We will use one of our sample data files as a perfect example.
    const schemaExample = JSON.stringify(sampleSystemDataShopSphere, null, 2); // Using ShopSphere as a robust example

    return `
You are an expert Software Architect and systems designer. Your sole task is to generate a complete, valid JSON object representing a software system based on a user's prompt.

**RULES:**
1.  **JSON ONLY:** You MUST respond with *nothing* but the valid JSON object. Do not include \`\`\`json ... \`\`\` or any explanatory text before or after the JSON block.
2.  **ADHERE TO SCHEMA:** The JSON you generate MUST strictly follow the structure and data types of the example schema provided below.
3.  **BE PLAUSIBLE:** Create realistic and plausible team names, service names, APIs, and initiatives that fit the user's prompt.
4.  **POPULATE ALL FIELDS:** You must generate data for all key arrays: seniorManagers, sdms, pmts, projectManagers, teams, allKnownEngineers, services, yearlyInitiatives, goals, and definedThemes.
5.  **ENSURE CONSISTENCY:**
    * All \`teamId\` values in the \`teams\` array must be unique.
    * All \`sdmId\`s in the \`sdms\` array must be unique.
    * The \`owningTeamId\` in each service must match a \`teamId\` from the \`teams\` array.
    * The \`sdmId\` and \`pmtId\` in each team must match an \`sdmId\` or \`pmtId\` from the respective arrays.
    * Engineers in a team's \`engineers\` array must have their names listed in the \`allKnownEngineers\` array, and their \`currentTeamId\` in \`allKnownEngineers\` must match the team's \`teamId\`.
    * Initiative \`assignments\` must use valid \`teamId\`s.
    * Initiative \`themes\` must use valid \`themeId\`s from the \`definedThemes\` array.
    * Initiative \`primaryGoalId\` must use a valid \`goalId\` from the \`goals\` array.

**JSON SCHEMA EXAMPLE:**
Here is an example of the exact JSON structure you must follow.
${schemaExample}

Proceed to generate the new JSON object based on the user's prompt.
`;
}

/**
 * [PRIVATE] Calls the Google Gemini API to generate a system.
 * @returns {Promise<object|null>} Parsed JSON object or null.
 */
async function _generateSystemWithGemini(systemPrompt, userPrompt, apiKey) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

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
            "maxOutputTokens": 8192,
        },
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Gemini API Error:", errorBody);
        throw new Error(`Google API request failed: ${errorBody.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.candidates || !responseData.candidates[0].content.parts[0].text) {
        console.error("Invalid response structure from Gemini:", responseData);
        throw new Error("Received an invalid response from the AI.");
    }

    const jsonString = responseData.candidates[0].content.parts[0].text;
    
    // Clean the response: The AI *should* only return JSON, but sometimes includes ```json ... ```
    const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');

    try {
        return JSON.parse(cleanedJsonString);
    } catch (e) {
        console.error("Failed to parse JSON response from AI:", e);
        console.error("Raw AI response:", jsonString);
        throw new Error("The AI returned invalid JSON. Please try again.");
    }
}

// TODO: Implement private helpers for other providers
// async function _generateSystemWithOpenAI(systemPrompt, userPrompt, apiKey) { ... }
// async function _generateSystemWithAnthropic(systemPrompt, userPrompt, apiKey) { ... }


// --- AI Analysis Functions ---

/**
 * Public "Router" Function: Gets analysis for a given context and question.
 *
 * @param {string} userQuestion The user's question (e.g., "Which teams are overloaded?").
 * @param {string} contextJson The JSON string of the current view's data.
 * @param {string} apiKey The user's API key.
 * @param {string} provider The selected provider.
 * @returns {Promise<string|null>} A promise that resolves to the AI's text answer or null on failure.
 */
async function getAnalysisFromPrompt(userQuestion, contextJson, apiKey, provider) {
    console.log(`AI: Routing analysis for provider: ${provider}`);
    
    // 1. Build the analysis prompt
    const systemPrompt = `You are a helpful software planning assistant. Analyze the following JSON data, which represents the user's current view, to answer their question.
    
    CONTEXT DATA:
    ${contextJson}
    
    Answer the user's question based *only* on the data provided. Be concise and helpful.`;
    
    // 2. Route to the correct provider
    try {
        switch (provider) {
            case 'google-gemini':
                return await _getAnalysisWithGemini(systemPrompt, userQuestion, apiKey);
            case 'openai-gpt4o':
                // return await _getAnalysisWithOpenAI(systemPrompt, userQuestion, apiKey);
                return "OpenAI analysis is not yet implemented."; // TODO
            case 'anthropic-claude35':
                // return await _getAnalysisWithAnthropic(systemPrompt, userQuestion, apiKey);
                return "Anthropic analysis is not yet implemented."; // TODO
            // ... other cases
            default:
                console.error(`Unknown AI provider: ${provider}`);
                return `Analysis for "${provider}" is not yet supported.`;
        }
    } catch (error) {
        console.error(`Error during AI analysis with ${provider}:`, error);
        return `An error occurred while communicating with the AI. Check the console.\nError: ${error.message}`;
    }
}

/**
 * [PRIVATE] Calls the Google Gemini API to get analysis.
 * @returns {Promise<string|null>} Text answer or null.
 */
async function _getAnalysisWithGemini(systemPrompt, userQuestion, apiKey) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const requestBody = {
        "contents": [
            {
                "parts": [
                    { "text": systemPrompt },
                    { "text": "USER_QUESTION: " + userQuestion }
                ]
            }
        ]
        // Using default generation config for chat
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Gemini API Error:", errorBody);
        throw new Error(`Google API request failed: ${errorBody.error?.message || response.statusText}`);
    }

    const responseData = await response.json();

    if (!responseData.candidates || !responseData.candidates[0].content.parts[0].text) {
        console.error("Invalid response structure from Gemini:", responseData);
        throw new Error("Received an invalid response from the AI.");
    }

    return responseData.candidates[0].content.parts[0].text;
}

// TODO: Implement private analysis helpers for other providers
// async function _getAnalysisWithOpenAI(systemPrompt, userQuestion, apiKey) { ... }
// async function _getAnalysisWithAnthropic(systemPrompt, userQuestion, apiKey) { ... }