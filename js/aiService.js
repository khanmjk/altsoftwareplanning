// js/aiService.js
/**
 * [NEW] A private helper to wrap fetch calls with exponential backoff.
 * This is a best-practice coding pattern for handling transient server
 * errors (5xx) or rate limits (429), which are common with LLM APIs.
 *
 * @param {string} url The API endpoint to fetch.
 * @param {object} options The options object for the fetch call (method, headers, body).
 * @param {number} maxRetries The maximum number of retries.
 * @param {number} initialDelay The starting delay in milliseconds.
 * @returns {Promise<Response>} A promise that resolves to the successful fetch Response.
 * @throws {Error} Throws an error if retries fail or if a non-retryable error (4xx) occurs.
 */
async function _fetchWithRetry(url, options, maxRetries = 5, initialDelay = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
        // [LOG] Added for debugging
        console.log(`[AI-DEBUG] Fetch Attempt ${attempt + 1}/${maxRetries}: POST to ${url.split('?')[0]}`);
        
        try {
            const response = await fetch(url, options);

            // 1. Success case: The request was successful.
            if (response.ok) {
                // [LOG] Added for debugging
                console.log(`[AI-DEBUG] Fetch Attempt ${attempt + 1} Succeeded (Status: ${response.status})`);
                return response;
            }

            // 2. Client Error (4xx): Don't retry. This is a permanent failure
            //    (e.g., bad API key, malformed request).
            if (response.status >= 400 && response.status < 500) {
                const errorBody = await response.json();
                console.error(`[AI-DEBUG] Fetch Error (4xx): ${response.status}. Not retrying.`, errorBody);
                // We'll let the calling function format the specific error message.
                throw new Error(`Google API request failed: ${errorBody.error?.message || response.statusText}`);
            }

            // 3. Server Error (5xx) or Rate Limit (429): This is a retry-able error.
            if (response.status >= 500 || response.status === 429) {
                console.warn(`[AI-DEBUG] Fetch Error (5xx/429): ${response.status}. Retrying... (Attempt ${attempt + 1}/${maxRetries})`);
                // We throw an error to trigger the catch block's retry logic.
                throw new Error(`Retryable error: ${response.statusText}`);
            }
            
            // Handle other unexpected non-ok statuses
            throw new Error(`Unhandled HTTP error: ${response.status}`);

        } catch (error) {
            // This catch block handles network errors AND our thrown retryable errors.
            
            // If the error was a non-retryable 4xx, re-throw it immediately.
            if (error.message.includes("Google API request failed")) {
                throw error;
            }

            console.warn(`[AI-DEBUG] Fetch attempt ${attempt + 1} failed: ${error.message}`);
            attempt++;
            
            if (attempt >= maxRetries) {
                console.error("[AI-DEBUG] Fetch failed after all retries.", error);
                throw new Error(`API request failed after ${maxRetries} attempts. Last error: ${error.message}`);
            }

            // Calculate exponential backoff + jitter
            const jitter = Math.random() * 1000; // Add up to 1 second of jitter
            const delay = initialDelay * Math.pow(2, attempt - 1) + jitter;
            
            console.log(`[AI-DEBUG] Waiting ${delay.toFixed(0)}ms before next retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // This line should not be reachable, but as a fallback:
    throw new Error("API request failed after all retries.");
}
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
    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] generateSystemFromPrompt: Routing for provider '${provider}' with prompt: "${userPrompt}"`);
    
    // 1. Get the shared "System Prompt" (the schema and rules)
    const systemPrompt = _getSystemGenerationPrompt();

    // 2. Route to the correct provider-specific function
    try {
        // TODO: [SECURITY] The apiKey is passed here from local storage.
        // This is acceptable for local-only development but MUST NOT
        // be deployed to a public website.
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
    // [LOG] Added for debugging
    console.log("[AI-DEBUG] _getSystemGenerationPrompt: Building master system prompt...");
    
    // This is the most important part. We give the AI its persona, rules, and the exact schema.
    // We will use one of our sample data files as a perfect example.
    const schemaExample = JSON.stringify(sampleSystemDataShopSphere, null, 2); // Using ShopSphere as a robust example

    const promptString = `
You are a seasoned VP of Engineering and strategic business partner, acting as a founding technology leader. Your purpose is to help a user create a tech business and organize their software development teams.

Your sole task is to take a user's prompt (e.g., "An excel spreadsheet company," "A video streaming app") and generate a single, complete, valid JSON object representing the entire software system, organizational structure, and three-year roadmap. This JSON will be used in an educational tool for software managers.

**RULES:**

1.  **JSON ONLY:** You MUST respond with *nothing* but the valid, raw JSON object. Do not include \`\`\`json ... \`\`\` or any explanatory text before or after the JSON block.

2.  **ADHERE TO SCHEMA:** The JSON you generate MUST strictly follow the structure and data types of the example schema provided below. This is the highest priority.

3.  **REAL-WORLD INDUSTRY PRACTICE (Conway's Law):** The generated data must represent real-world industry practice. You must organize the software stack into teams. Teams own services that expose APIs. Services must have plausible upstream and downstream relationships (serviceDependencies). The organizational structure (managers, teams) and the software architecture (services) must be logically aligned.

4.  **SYNTHESIZE A 3-YEAR ROADMAP:** You must synthesize a rich, detailed three-year roadmap. Populate the \`yearlyInitiatives\` array with initiatives for the next three years (e.g., 2025, 2026, 2027). This plan must be detailed:
    * Create logical initiatives that build upon each other (e.g., Year 1: MVP & Compliance; Year 2: Scale & New Features; Year 3: Global Expansion).
    * Include detailed SDE estimates in the \`assignments\` array for each initiative.
    * Assign \`isProtected: true\` to plausible KTLO (Keep The Lights On) or mandatory compliance initiatives.

5.  **POPULATE ALL FIELDS:** You must generate rich, plausible data for ALL key arrays: \`seniorManagers\`, \`sdms\`, \`pmts\`, \`projectManagers\`, \`teams\`, \`allKnownEngineers\` (including realistic skills, levels, and AI SWEs), \`services\`, \`yearlyInitiatives\`, \`goals\`, and \`definedThemes\`.
    * The \`goals\` and \`definedThemes\` must logically connect to your 3-year roadmap.

6.  **ENSURE CONSISTENCY (CRITICAL):**
    * All \`teamId\` values in the \`teams\` array must be unique.
    * All \`sdmId\`s in the \`sdms\` array must be unique.
    * The \`owningTeamId\` in each \`service\` must match a \`teamId\` from the \`teams\` array.
    * The \`sdmId\` and \`pmtId\` in each \`team\` must match an \`sdmId\` or \`pmtId\` from the respective arrays.
    * Engineers in a team's \`engineers\` array (which are *names*) must be listed in the \`allKnownEngineers\` array.
    * The \`currentTeamId\` for an engineer in \`allKnownEngineers\` MUST match the \`teamId\` of the team they are in.
    * Initiative \`assignments\` must use valid \`teamId\`s.
    * Initiative \`themes\` must use valid \`themeId\`s from the \`definedThemes\` array.
    * Initiative \`primaryGoalId\` must use a valid \`goalId\` from the \`goals\` array.

**JSON SCHEMA EXAMPLE:**
Here is an example of the exact JSON structure you must follow.
${schemaExample}

Proceed to generate the new JSON object based on the user's prompt.
`;
    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] _getSystemGenerationPrompt: Master prompt length: ${promptString.length} chars.`);
    return promptString;
}

/**
 * [PRIVATE] Calls the Google Gemini API to generate a system.
 * [MODIFIED] Uses _fetchWithRetry to handle transient errors.
 * @returns {Promise<object|null>} Parsed JSON object or null.
 */
async function _generateSystemWithGemini(systemPrompt, userPrompt, apiKey) {
    // [LOG] Added for debugging
    console.log("[AI-DEBUG] _generateSystemWithGemini: Preparing to call Gemini for system generation...");
    
    // TODO: [SECURITY] This is a client-side call using a user-provided API key.
    // This architecture is unsafe for production. Before merging to a public site,
    // this function MUST be refactored to call a secure server-side proxy
    // that manages the API key and makes the actual request to the Google API.
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

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


    // MODIFIED: Create the options object for fetch
    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    };

    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] _generateSystemWithGemini: Calling _fetchWithRetry for ${API_URL.split('?')[0]}`);

    // MODIFIED: Call _fetchWithRetry instead of fetch
    // The _fetchWithRetry function will handle retries and 4xx/5xx errors
    const response = await _fetchWithRetry(API_URL, fetchOptions);

    // [LOG] Added for debugging
    console.log("[AI-DEBUG] _generateSystemWithGemini: Fetch successful. Parsing response data...");
    
    const responseData = await response.json();
    
    if (!responseData.candidates || !responseData.candidates[0].content.parts[0].text) {
        console.error("[AI-DEBUG] Invalid response structure from Gemini:", responseData);
        throw new Error("Received an invalid response from the AI.");
    }

    const jsonString = responseData.candidates[0].content.parts[0].text;
    
    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] _generateSystemWithGemini: Received raw response string (${jsonString.length} chars).`);

    // Clean the response
    const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');

    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] _generateSystemWithGemini: Cleaned JSON string. Attempting to parse...`);

    try {
        const parsedJson = JSON.parse(cleanedJsonString);
        // [LOG] Added for debugging
        console.log("[AI-DEBUG] _generateSystemWithGemini: JSON parsed successfully.");
        return parsedJson;
    } catch (e) {
        console.error("[AI-DEBUG] _generateSystemWithGemini: FAILED to parse JSON response.", e);
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
    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] getAnalysisFromPrompt: Routing for provider '${provider}' with question: "${userQuestion}"`);
    
    // 1. Build the analysis prompt
    const systemPrompt = `You are a helpful software planning assistant. Analyze the following JSON data, which represents the user's current view, to answer their question.
    
    CONTEXT DATA:
    ${contextJson}
    
    Answer the user's question based *only* on the data provided. Be concise and helpful.`;
    
    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] getAnalysisFromPrompt: System prompt and context JSON length: ${systemPrompt.length} chars.`);

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
 * [MODIFIED] Uses _fetchWithRetry to handle transient errors.
 * @returns {Promise<string|null>} Text answer or null.
 */
async function _getAnalysisWithGemini(systemPrompt, userQuestion, apiKey) {
    // [LOG] Added for debugging
    console.log("[AI-DEBUG] _getAnalysisWithGemini: Preparing to call Gemini for analysis...");
    
    // TODO: [SECURITY] This is a client-side call using a user-provided API key.
    // This architecture is unsafe for production. Before merging to a public site,
    // this function MUST be refactored to call a secure server-side proxy
    // that manages the API key and makes the actual request to the Google API.

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

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

    // MODIFIED: Create the options object for fetch
    const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    };

    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] _getAnalysisWithGemini: Calling _fetchWithRetry for ${API_URL.split('?')[0]}`);

    // MODIFIED: Call _fetchWithRetry instead of fetch
    const response = await _fetchWithRetry(API_URL, fetchOptions);

    // [LOG] Added for debugging
    console.log("[AI-DEBUG] _getAnalysisWithGemini: Fetch successful. Parsing response data...");

    const responseData = await response.json();

    if (!responseData.candidates || !responseData.candidates[0].content.parts[0].text) {
        console.error("[AI-DEBUG] Invalid response structure from Gemini:", responseData);
        throw new Error("Received an invalid response from the AI.");
    }

    const textResponse = responseData.candidates[0].content.parts[0].text;
    
    // [LOG] Added for debugging
    console.log(`[AI-DEBUG] _getAnalysisWithGemini: Received analysis text: "${textResponse}"`);

    return textResponse;
}

// TODO: Implement private analysis helpers for other providers
// async function _getAnalysisWithOpenAI(systemPrompt, userQuestion, apiKey) { ... }
// async function _getAnalysisWithAnthropic(systemPrompt, userQuestion, apiKey) { ... }