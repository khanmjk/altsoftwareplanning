// js/aiService.js
// [NEW] Set to true to bypass API calls and return mock data for UI development
const AI_ANALYSIS_MOCK_MODE = false;
// [NEW] Set to true to bypass image API calls
const AI_IMAGE_MOCK_MODE = false; // Legacy mock disabled; diagrams now render via Mermaid
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
6. Use valid IDs (no spaces/special chars without quotes).
7. Base relationships strictly on the provided JSON context.
`;
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
async function _fetchWithRetry(url, options, maxRetries = 5, initialDelay = 1000, spinnerP = null) {
    let attempt = 0;
    let lastDetailedError = null; // Store the last detailed error    
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
                const errorMessage = `API Error: ${errorBody?.error?.message || response.statusText} (Status: ${response.status})`;
                console.error(`[AI-DEBUG] Fetch Error (4xx): ${response.status}. Not retrying.`, errorBody);
                lastDetailedError = new Error(errorMessage); // Store and throw detailed error   
                // We'll let the calling function format the specific error message.
                throw new Error(`Google API request failed: ${errorBody.error?.message || response.statusText}`);
            }

            // 3. Server Error (5xx) or Rate Limit (429): This is a retry-able error.
            if (response.status >= 500 || response.status === 429) {
                console.warn(`[AI-DEBUG] Fetch Error (5xx/429): ${response.status}. Retrying... (Attempt ${attempt + 1}/${maxRetries})`);

                // Try to get the JSON body from the server error
                let errorBody = null;
                try { errorBody = await response.json(); } catch (e) { /* no json body */ }
                const errorMessage = `API Error: ${errorBody?.error?.message || response.statusText} (Status: ${response.status})`;
                lastDetailedError = new Error(errorMessage); // Store the detailed 5xx error
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
                console.error("[AI-DEBUG] Fetch failed after all retries.", lastDetailedError || error);

                // Throw an error that includes the lastDetailedError.message
                const finalErrorMessage = lastDetailedError ? lastDetailedError.message : error.message;
                throw new Error(`API request failed after ${maxRetries} attempts. Last error: ${finalErrorMessage}`);
            }

            // Calculate exponential backoff + jitter
            const jitter = Math.random() * 1000; // Add up to 1 second of jitter
            const delay = initialDelay * Math.pow(2, attempt - 1) + jitter;

            // Update spinner text if element was provided
            if (spinnerP) {
                spinnerP.textContent = `AI service is busy (Attempt ${attempt}/${maxRetries}). Retrying in ${(delay / 1000).toFixed(1)}s...`;
            }

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
 * @returns {Promise<object|null>} A promise that resolves to the new SystemService.getCurrentSystem() object or null on failure.
 */
async function generateSystemFromPrompt(userPrompt, apiKey, provider, spinnerP = null) {
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
                // This function now returns an object { data, stats }
                return await _generateSystemWithGemini(systemPrompt, userPrompt, apiKey, spinnerP);
            case 'openai-gpt4o':
                // return await _generateSystemWithOpenAI(systemPrompt, userPrompt, apiKey);
                console.warn("OpenAI generation not yet implemented.");
                window.notificationManager.showToast("AI provider 'OpenAI (GPT-4o)' is not yet implemented.", 'warning');
                return { data: null, stats: null }; // TODO
            case 'anthropic-claude35':
                // return await _generateSystemWithAnthropic(systemPrompt, userPrompt, apiKey);
                console.warn("Anthropic generation not yet implemented.");
                window.notificationManager.showToast("AI provider 'Anthropic (Claude 3.5 Sonnet)' is not yet implemented.", 'warning');
                return { data: null, stats: null }; // TODO
            case 'mistral-large':
                console.warn("Mistral generation not yet implemented.");
                window.notificationManager.showToast("AI provider 'Mistral (Large 2)' is not yet implemented.", 'warning');
                return { data: null, stats: null }; // TODO
            case 'cohere-command-r':
                console.warn("Cohere generation not yet implemented.");
                window.notificationManager.showToast("AI provider 'Cohere (Command R)' is not yet implemented.", 'warning');
                return { data: null, stats: null }; // TODO
            default:
                console.error(`Unknown AI provider: ${provider}`);
                window.notificationManager.showToast(`AI System Generation for "${provider}" is not yet supported.`, 'warning');
                return { data: null, stats: null };
        }
    } catch (error) {
        console.error(`Error during AI generation with ${provider}:`, error);
        // Changed this alert to show the specific error message
        window.notificationManager.showToast(`An error occurred while communicating with the AI. Check the console.\nError: ${error.message}`, 'error');
        return { data: null, stats: null };
    }
}

async function generateDiagramFromPrompt(userPrompt, contextJson, apiKey, provider) {
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
        return { code: cleaned, title: userPrompt };
    } catch (error) {
        console.error("[AI-DIAGRAM] Diagram generation failed:", error);
        throw error;
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
    // !!!!! The LLM struggles with large inputs, so we must pick a smaller but still rich example. !!!!!
    // const schemaExample = JSON.stringify(sampleSystemDataShopSphere, null, 2); // Using ShopSphere as a robust example

    // !!!! Need to create a smaller example schema to fit within token limits !!!!
    // [NEW] Define a minimal schema example instead of the full sample data
    // !!!! This drastically reduces the input token count to prevent context window errors.

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
                "workPackageIds": ["wp-example-001"], // This ID must be present below
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
        // [MODIFIED] This array is no longer empty.
        "workPackages": [
            {
                "workPackageId": "wp-example-001", // This ID matches the one in yearlyInitiatives
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
    // [MODIFIED] Use the new minimal example
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
    * Each work package *must* have realistic \`deliveryPhases\` populated from this list: "${JSON.stringify(STANDARD_WORK_PACKAGE_PHASES)}".
 
11.  **DO NOT TRUNCATE:** (This was old Rule 8) Your *entire* response must be a single, complete JSON object. Do not stop part-way. Ensure all brackets and braces are closed.

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
 * @returns {Promise<object|null>} An object containing the parsed JSON data and generation stats.
 */
async function _generateSystemWithGemini(systemPrompt, userPrompt, apiKey, spinnerP = null) {
    // [LOG] Added for debugging
    console.log("[AI-DEBUG] _generateSystemWithGemini: Preparing to call Gemini for system generation...");

    // TODO: [SECURITY] This is a client-side call using a user-provided API key.
    // This architecture is unsafe for production. Before merging to a public site,
    // this function MUST be refactored to call a secure server-side proxy
    // that manages the API key and makes the actual request to the Google API.

    //const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    //Switched from gemini-2.5-pro to gemini-2.5-flash, the correct model for this API endpoint.
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

    // The _fetchWithRetry function will handle retries and 4xx/5xx errors
    const response = await _fetchWithRetry(API_URL, fetchOptions, 5, 1000, spinnerP);

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
        console.log("[AI-DEBUG] _generateSystemWithGemini: JSON parsed successfully.");

        // --- [NEW] Collect Stats ---
        const usage = responseData.usageMetadata || {};
        const stats = {
            inputChars: systemPrompt.length + userPrompt.length,
            outputChars: cleanedJsonString.length,
            outputTokens: usage.candidatesTokenCount || 'N/A',
            totalTokens: usage.totalTokenCount || 'N/A',
            systemPromptSummary: systemPrompt.substring(0, 200) + "..."
        };
        console.log("[AI-DEBUG] Collected generation stats:", stats);
        // --- End Stats ---

        return { data: parsedJson, stats: stats };

    } catch (e) {
        console.error("[AI-DEBUG] _generateSystemWithGemini: FAILED to parse JSON response.", e);
        console.error("Raw AI response:", jsonString);
        throw new Error("The AI returned invalid JSON. Please try again.");
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
/**
 * [MODIFIED] Public "Router" Function: Gets analysis from a full chat history.
 *
 * @param {Array<object>} chatHistory The full conversation history (e.g., [{role: 'user', ...}, {role: 'model', ...}]).
 * @param {string} apiKey The user's API key.
 * @param {string} provider The selected provider.
 * @returns {Promise<object>} A promise that resolves to { textResponse: string, usage: object }
 */
async function getAnalysisFromPrompt(chatHistory, apiKey, provider) {
    console.log(`[AI-DEBUG] getAnalysisFromPrompt: Routing for provider '${provider}'. History has ${chatHistory.length} turns.`);

    // --- Mock Mode ---
    if (AI_ANALYSIS_MOCK_MODE) {
        console.warn("[AI-DEBUG] MOCK MODE ENABLED. Returning fake data without API call.");
        await new Promise(resolve => setTimeout(resolve, 750));
        const mockResponse = `This is a mock AI response. I received a history of ${chatHistory.length} turns.`;
        return {
            textResponse: mockResponse,
            usage: { totalTokenCount: 100 } // Mock usage
        };
    }
    // --- End Mock Mode ---

    // 1. [REMOVED] System prompt is no longer built here. It's in the chatHistory.

    // 2. Route to the correct provider
    try {
        switch (provider) {
            case 'google-gemini':
                return await _getAnalysisWithGemini(chatHistory, apiKey); // Pass history
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
        // Re-throw the error so the AI chat controller can catch it
        throw new Error(`An error occurred while communicating with the AI: ${error.message}`);
    }
}

// Expose public functions to global scope for other modules
if (typeof window !== 'undefined') {
    window.getAnalysisFromPrompt = getAnalysisFromPrompt;
}

/**
 * [MODIFIED] Calls the Google Gemini API to get analysis.
 * @param {Array<object>} chatHistory The full conversation history.
 * @returns {Promise<object>} A promise that resolves to { textResponse: string, usage: object }
 */
async function _getAnalysisWithGemini(chatHistory, apiKey) {
    console.log("[AI-DEBUG] _getAnalysisWithGemini: Preparing to call Gemini with full chat history.");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // [MODIFIED] The request body is now just the history
    const requestBody = {
        "contents": chatHistory
        // We could also use "system_instruction" for the priming prompt, 
        // but including it in "contents" is simpler and supported by all models.
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

    // [MODIFIED] Extract text AND usage metadata
    const textResponse = responseData.candidates[0].content.parts[0].text;
    const usage = responseData.usageMetadata || { totalTokenCount: 0 }; // Ensure usage object exists

    console.log(`[AI-DEBUG] _getAnalysisWithGemini: Received analysis text. Tokens: ${usage.totalTokenCount}`);

    // [MODIFIED] Return the object
    return { textResponse, usage };
}

/**
 * [NEW] Builds the system prompt for image generation.
 * This instructs the AI on how to interpret the context data for drawing.
 * @returns {string} The detailed system prompt for image generation.
 */
function _getArchitecturePrompt() {
    return "You are a visual architect. Your task is to generate a clear, professional, block-and-arrow architecture diagram based on the user's prompt and the provided CONTEXT DATA.\n\n" +
        "**RULES:**\n" +
        "1.  **Grounding:** You MUST base your diagram *only* on the services, teams, and dependencies in the CONTEXT DATA. Do not invent services or relationships.\n" +
        "2.  **Clarity:** The diagram must be simple, clean, and easy to read. Use logical groupings.\n" +
        "3.  **How to Draw:**\n" +
        "    * Use the `services` list to draw the main blocks.\n" +
        "    * Use the `serviceDependencies` to draw arrows *between* the blocks.\n" +
        "    * Use the `owningTeamId` to visually group or color-code services that belong to the same team.\n" +
        "    * Label all blocks and arrows clearly.\n" +
        "4.  **Format:** Generate a single, high-quality PNG image.";
}

function _getOrgChartPrompt() {
    return "You are an organizational design assistant. Your task is to generate a clean, hierarchical organization chart based on the user's prompt and the provided CONTEXT DATA.\n\n" +
        "**RULES:**\n" +
        "1.  **Grounding:** You MUST base your diagram *only* on the personnel in the CONTEXT DATA. Do not invent people or teams.\n" +
        "2.  **Clarity:** The diagram must be a simple, top-down hierarchy.\n" +
        "3.  **How to Draw:**\n" +
        "    * Use the `seniorManagers` as the top-level nodes.\n" +
        "    * Use the `sdms` to draw the next level, linking them to their `seniorManagerId`.\n" +
        "    * Use the `teams` to draw the next level, linking them to their `sdmId`.\n" +
        "    * If the user asks for engineers, you can include `allKnownEngineers` linked to their `currentTeamId`.\n" +
        "    * Label all blocks clearly with their names.\n" +
        "4.  **Format:** Generate a single, high-quality PNG image.";
}

function _getMindMapPrompt() {
    return "You are a strategic planning assistant. Your task is to generate a conceptual diagram (like a mind map or flowchart) based on the user's prompt and the provided CONTEXT DATA.\n\n" +
        "**RULES:**\n" +
        "1.  **Grounding:** You MUST base your diagram *only* on the items in the CONTEXT DATA (like `goals` or `initiatives`).\n" +
        "2.  **Clarity:** The diagram must be logical and easy to follow.\n" +
        "3.  **How to Draw:**\n" +
        "    * Identify the central topic from the USER PROMPT (e.g., a specific goal or 'all goals').\n" +
        "    * Use the CONTEXT DATA to create child nodes. For example, if the topic is a goal, the child nodes should be the `initiatives` linked to it.\n" +
        "    * If the user asks for a flowchart, use the `workPackages` or `deliveryPhases` to show a simple sequence.\n" +
        "    * Label all nodes clearly.\n" +
        "4.  **Format:** Generate a single, high-quality PNG image.";
}

/**
 * [MODIFIED] [PRIVATE] Calls the Google Imagen API via the Vertex AI endpoint.
 * This is the REAL implementation.
 * @returns {Promise<object>} An object { isImage: true, imageUrl: string, altText: string }
 */
async function _generateImageWithImagen(userPrompt, contextJson, apiKey) {
    console.log("[AI-DEBUG] _generateImageWithImagen: Preparing to call REAL Imagen 3 via Vertex AI...");

    // !!! IMPORTANT: REPLACE WITH YOUR PROJECT ID FROM GOOGLE CLOUD CONSOLE !!!
    const GCP_PROJECT_ID = "gen-lang-client-0801101504"; // e.g., "gen-lang-client-0..."
    const GCP_REGION = "us-central1"; // Imagen is often in us-central1

    if (GCP_PROJECT_ID === "YOUR-PROJECT-ID-HERE") {
        throw new Error("Missing GCP_PROJECT_ID in js/aiService.js, _generateImageWithImagen");
    }

    // [THE FIX] This is the correct Vertex AI endpoint for Imagen
    const API_URL = `https://` + GCP_REGION + `-aiplatform.googleapis.com/v1/projects/` + GCP_PROJECT_ID + `/locations/` + GCP_REGION + `/publishers/google/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    // 1. Build the new combined prompt (router)
    let imageSystemPrompt;
    const promptLowerCase = userPrompt.toLowerCase();
    if (promptLowerCase.includes('architecture') || promptLowerCase.includes('block diagram')) {
        imageSystemPrompt = _getArchitecturePrompt();
        console.log("[AI-DEBUG] Image Router: Selected Architecture Prompt (Vertex)");
    } else if (promptLowerCase.includes('org chart') || promptLowerCase.includes('managers')) {
        imageSystemPrompt = _getOrgChartPrompt();
        console.log("[AI-DEBUG] Image Router: Selected Org Chart Prompt (Vertex)");
    } else if (promptLowerCase.includes('mind map') || promptLowerCase.includes('flowchart')) {
        imageSystemPrompt = _getMindMapPrompt();
        console.log("[AI-DEBUG] Image Router: Selected Mind Map Prompt (Vertex)");
    } else {
        imageSystemPrompt = _getArchitecturePrompt();
        console.warn("[AI-DEBUG] Image Router: Defaulted to Architecture Prompt (Vertex)");
    }
    const combinedPrompt = `${imageSystemPrompt}\n\nCONTEXT DATA:\n${contextJson}\n\nUSER PROMPT:\n${userPrompt}`;

    // [THE FIX] This is the correct request body format for the Vertex AI API
    const requestBody = {
        "instances": [
            { "prompt": combinedPrompt }
        ],
        "parameters": {
            "number_of_images": 1
        }
    };

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
            // NOTE: This endpoint uses API Key in the URL, not a Bearer token
        },
        body: JSON.stringify(requestBody)
    };

    // Use the retry mechanism
    const response = await _fetchWithRetry(API_URL, fetchOptions);
    const responseData = await response.json();

    // 2. Process the response
    // The Vertex AI response has a different structure
    if (!responseData.predictions || !responseData.predictions[0] || !responseData.predictions[0].bytesBase64Encoded) {
        console.error("[AI-DEBUG] Invalid response structure from Vertex AI (Imagen):", responseData);
        throw new Error("Received an invalid or empty response from the Imagen AI.");
    }

    // 3. Convert Base64 to a Data URL
    const base64ImageData = responseData.predictions[0].bytesBase64Encoded;
    const imageUrl = `data:image/png;base64,${base64ImageData}`;

    console.log(`[AI-DEBUG] _generateImageWithImagen: Successfully received and formatted image as data URL.`);

    return {
        isImage: true,
        imageUrl: imageUrl,
        altText: userPrompt
    };
}

// TODO: Implement private analysis helpers for other providers
// async function _getAnalysisWithOpenAI(systemPrompt, userQuestion, apiKey) { ... }
// async function _getAnalysisWithAnthropic(systemPrompt, userQuestion, apiKey) { ... }

/**
 * [NEW] Public "Router" Function: Generates an image from a prompt.
 * This is a MOCK for Phase 1. It does not call a real API.
 * It will return a placeholder diagram.
 *
 * @param {string} userPrompt The user's image request (e.g., "Draw a block diagram...").
 * @param {string} contextJson The JSON string of the current view's data.
 * @param {string} apiKey The user's API key (unused in mock).
 * @param {string} provider The selected provider (unused in mock).
 * @returns {Promise<object>} A promise that resolves to an object: { isImage: true, url: string, altText: string }
 */
async function generateImageFromPrompt(userPrompt, contextJson, apiKey, provider) {
    console.log(`[AI-DEBUG] generateImageFromPrompt: Routing for provider '${provider}'...`);

    if (!apiKey) {
        console.error("[AI-DEBUG] Image generation failed: API key is missing.");
        throw new Error("AI API key is not set. Please add your Gemini API key in the AI Assistant settings.");
    }

    // Reuse Mermaid text generation for diagramming instead of mocked images
    const diagramResult = await generateDiagramFromPrompt(userPrompt, contextJson, apiKey, provider);
    return {
        isImage: false,
        ...diagramResult
    };
}

if (typeof window !== 'undefined') {
    window.generateImageFromPrompt = generateImageFromPrompt;
}

if (typeof window !== 'undefined') {
    window.generateDiagramFromPrompt = generateDiagramFromPrompt;
}
// Export debug helpers if needed
if (typeof window !== 'undefined') {
    window._generateTextWithGemini = _generateTextWithGemini;
}
