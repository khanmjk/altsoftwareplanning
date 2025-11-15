// js/aiService.js
// [NEW] Set to true to bypass API calls and return mock data for UI development
const AI_ANALYSIS_MOCK_MODE = false;
// [NEW] Set to true to bypass image API calls
const AI_IMAGE_MOCK_MODE = false;
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
 * @returns {Promise<object|null>} A promise that resolves to the new currentSystemData object or null on failure.
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
                alert("AI provider 'OpenAI (GPT-4o)' is not yet implemented.");
                return { data: null, stats: null }; // TODO
            case 'anthropic-claude35':
                // return await _generateSystemWithAnthropic(systemPrompt, userPrompt, apiKey);
                console.warn("Anthropic generation not yet implemented.");
                alert("AI provider 'Anthropic (Claude 3.5 Sonnet)' is not yet implemented.");
                return { data: null, stats: null }; // TODO
            case 'mistral-large':
                console.warn("Mistral generation not yet implemented.");
                alert("AI provider 'Mistral (Large 2)' is not yet implemented.");
                return { data: null, stats: null }; // TODO
            case 'cohere-command-r':
                console.warn("Cohere generation not yet implemented.");
                alert("AI provider 'Cohere (Command R)' is not yet implemented.");
                return { data: null, stats: null }; // TODO
            default:
                console.error(`Unknown AI provider: ${provider}`);
                alert(`AI System Generation for "${provider}" is not yet supported.`);
                return { data: null, stats: null };
        }
    } catch (error) {
        console.error(`Error during AI generation with ${provider}:`, error);
        // Changed this alert to show the specific error message
        alert(`An error occurred while communicating with the AI. Check the console.\nError: ${error.message}`);
        return { data: null, stats: null };
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
        { "goalId": "goal-example", "name": "Example Goal 2025", "description": "...", "initiativeIds": ["init-example-001"], "attributes": {} }
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
          "impactedTeamAssignments": [ { "teamId": "team-example", "sdeDaysEstimate": 100 } ],
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

10. **[NEW RULE] GENERATE WORK PACKAGES:** You *must* generate 1-3 \`workPackages\` for *at least 10-15 initiatives* (especially for Year 1).
    * Each work package *must* have a valid \`initiativeId\`.
    * Each work package *must* link to the initiative by also adding its \`workPackageId\` to the \`yearlyInitiatives.workPackageIds\` array.
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

    // --- [NEW] Mock Mode Implementation ---
    if (AI_ANALYSIS_MOCK_MODE) {
        console.warn("[AI-DEBUG] MOCK MODE ENABLED. Returning fake data without API call.");
        // Simulate a network delay
        await new Promise(resolve => setTimeout(resolve, 750));

        // Check for specific questions to make the mock more interactive
        if (userQuestion.toLowerCase().includes("overloaded")) {
             return "This is a mock response. Based on the context from the 'planningView', the **Data Dragoons** team appears to be overloaded by 2.5 SDE-Years.";
        }
        if (userQuestion.toLowerCase().includes("how many teams")) {
             return "This is a mock response. The provided context from 'organogramView' shows there are **8 teams** in this system.";
        }

        return `This is a mock AI response. I received your question: "${userQuestion}". I am analyzing the provided context, which is ${contextJson.length} characters long.`;
    }
    // --- [END NEW] ---
    
 // 1. Build the analysis prompt
    const systemPrompt = `You are an expert Software Engineering Planning & Management Partner. Your goals are to:
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
            d.  Recommend a new priority order based on \`roi\` and your new estimates.
    
    CONTEXT DATA:
    ${contextJson}
    
    Answer the user's question concisely and helpfully.
    `;

    
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

// Expose public functions to global scope for other modules
if (typeof window !== 'undefined') {
window.getAnalysisFromPrompt = getAnalysisFromPrompt;
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

    //const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    // [MODIFIED] Switched from gemini-2.5-pro to gemini-2.5-flash
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;    

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

    // MODIFIED: Call _fetchWithRetry instead of fetch. No spinner needed here.
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

/**
 * [NEW] Builds the system prompt for image generation.
 * This instructs the AI on how to interpret the context data for drawing.
 * @returns {string} The detailed system prompt for image generation.
 */
function _getImageGenerationSystemPrompt() {
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

/**
 * [NEW] [PRIVATE] Calls the Google Imagen API to generate an image.
 * This is the REAL implementation.
 * @returns {Promise<object>} An object { isImage: true, imageUrl: string, altText: string }
 */
async function _generateImageWithImagen(userPrompt, contextJson, apiKey) {
    console.log("[AI-DEBUG] _generateImageWithImagen: Preparing to call REAL Imagen 3...");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;

    const imageSystemPrompt = _getImageGenerationSystemPrompt();
    const combinedPrompt = `${imageSystemPrompt}\n\nCONTEXT DATA:\n${contextJson}\n\nUSER PROMPT:\n${userPrompt}`;

    const requestBody = {
        prompt: { text: combinedPrompt },
        number_of_images: 1
    };
    
    const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    };

    const response = await _fetchWithRetry(API_URL, fetchOptions);
    const responseData = await response.json();

    if (!responseData.images || !responseData.images[0] || !responseData.images[0].imageBytes) {
        console.error("[AI-DEBUG] Invalid response structure from Imagen:", responseData);
        throw new Error("Received an invalid or empty response from the Imagen AI.");
    }

    const base64ImageData = responseData.images[0].imageBytes;
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
    
    if (AI_IMAGE_MOCK_MODE) {
        console.warn(`[AI-DEBUG] MOCK IMAGE GENERATION. Prompt: "${userPrompt}". Context: ${contextJson.length} chars.`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            isImage: true,
            imageUrl: "http://googleusercontent.com/image_generation_content/0",
            altText: "A placeholder block diagram of the StreamView system architecture."
        };
    }

    try {
        switch (provider) {
            case 'google-gemini':
                return await _generateImageWithImagen(userPrompt, contextJson, apiKey);
            default:
                console.error(`Unknown AI provider for images: ${provider}`);
                throw new Error(`Image generation for "${provider}" is not yet supported.`);
        }
    } catch (error) {
        console.error(`Error during AI image generation with ${provider}:`, error);
        throw new Error(`Image generation failed: ${error.message}`);
    }
}

if (typeof window !== 'undefined') {
    window.generateImageFromPrompt = generateImageFromPrompt;
}
