# Software Management & Planning Tool - MVP

**Welcome to the Software Management & Planning Tool!** This application is designed to help software engineering leaders and managers model, visualize, and plan their software systems, organizational structures, and yearly initiatives.

## Table of Contents

1.  [Purpose](#purpose)
2.  [Getting Started](#getting-started)
    * [AI Assistant Settings](#ai-assistant-settings)
    * [AI Assistant](#ai-assistant)
    * [Loading a Saved System](#loading-a-saved-system)
    * [Creating a New System](#creating-a-new-system)
    * [Creating a New System with AI](#creating-a-new-system-with-ai)
    * [Deleting a System](#deleting-a-system)
    * [Resetting to Defaults](#resetting-to-defaults)
3.  [Core Concepts & Data Model](#core-concepts--data-model)
    * [System](#system)
    * [Services & APIs](#services--apis)
    * [Teams (2-Pizza Teams)](#teams-2-pizza-teams)
    * [Engineers (`allKnownEngineers`)](#engineers-allknownengineers)
    * [Away-Team Members](#away-team-members)
    * [Managers (SDMs, Senior Managers, Project Managers)](#managers-sdms-senior-managers-project-managers)
    * [Platform Dependencies](#platform-dependencies)
    * [Yearly Initiatives](#yearly-initiatives)
    * [Capacity Configuration](#capacity-configuration)
    * [Goals](#goals)
    * [Defined Themes](#defined-themes)
    * [Work Packages](#work-packages)
    * [Archived Yearly Plans](#archived-yearly-plans)
4.  [Key Features](#key-features)
    * [AI Assistant](#ai-assistant)
    * [System Navigation](#system-navigation)
    * [Strategic Dashboard](#strategic-dashboard)
        * [Dashboard Carousel](#dashboard-carousel)
        * [Strategic Goals Dashboard](#strategic-goals-dashboard)
        * [Accomplishments View](#accomplishments-view)
        * [Investment Distribution by Theme](#investment-distribution-by-theme)
        * [Investment Trend Over Time](#investment-trend-over-time)
        * [Roadmap by Quarter & 3-Year Plan](#roadmap-by-quarter--3-year-plan)
    * [System Overview & Visualizations](#system-overview--visualizations)
    * [Diagramming (Mermaid)](#diagramming-mermaid)
    * [Editing System Data](#editing-system-data)
    * [Organizational Views](#organizational-views)
    * [Tune Capacity Constraints](#tune-capacity-constraints)
    * [Roadmap & Backlog Management](#roadmap--backlog-management)
    * [Yearly Planning](#yearly-planning)
    * [SDM Resource Forecasting Model](#sdm-resource-forecasting-model)
    * [Tool Documentation (Home Page)](#tool-documentation-home-page)
5.  [Basic Workflow Example](#basic-workflow-example)
6.  [Tips & Best Practices](#tips--best-practices)
7.  [Known Limitations (MVP)](#known-limitation-mvp)
8.  [Future Enhancements (Backlog Highlights)](#future-enhancements-backlog-highlights)

---

## 1. Purpose

This tool provides a unified platform to:

* **Model Software Architecture:** Define systems, services, APIs, and their dependencies.
* **Map Organizational Structure:** Link teams to services, assign engineers (including AI Software Engineers), and represent management hierarchies.
* **Visualize Relationships:** Understand how services connect, how teams are structured, and how they relate to the software they own.
* **Plan Capacity & Resources:** Configure detailed capacity constraints (leave, overheads, team activities, etc.) and AI productivity gains to understand true team availability (Net Project SDE Years).
* **Manage Roadmaps & Backlogs:** Define, prioritize, and manage initiatives from backlog through to completion, focusing on strategic alignment and product management needs.
* **Execute Yearly Planning:** Commit initiatives to a yearly plan, assign detailed engineering estimates, and track against calculated team capacities.
* **Gain Strategic Insights:** Use the dashboard to visualize investment allocation, track strategic trends over time, and monitor progress towards business goals.
* **Forecast Team Growth:** Model SDE hiring, ramp-up, and attrition, factoring in detailed capacity constraints to predict resource availability.
* **Accelerate Modeling with AI:** Use a powerful AI Assistant to generate entire, realistic sample systems and roadmaps from a single text prompt.

---

## Detailed Planning (WIP)
We’ve introduced a new “Detailed Planning” page with a hierarchical table and Gantt chart for initiatives and work packages. It’s actively evolving and has known rough edges.

What’s included:
- Hierarchical table (Initiative → Work Package → Team assignments) with inline editing of dates, estimates, and predecessor links.
- Gantt chart (Mermaid) with larger bars, wider left padding, and a blue/gray theme.
- Work package dependencies (including cross-initiative) and initiative-level predecessor selection.
- Filters for year/team and a resizable split between table and chart.

### Gantt renderer feature flag & Frappe WIP
- A renderer toggle (Mermaid ↔ Frappe) is available in the Detailed Planning header; Mermaid remains the default.
- Status/year filters are applied identically to the table and the chart so rows stay aligned.
- Double-click to drill: initiative → shows WPs; double-click a WP → shows its tasks; expansions stay in sync between table and chart.
- Edit locks: initiatives with WPs, and WPs with multiple tasks, are marked locked with “not allowed” cursors/tooltips; valid edits roll up dates to parents.
- Label tweaks: long labels are truncated with tooltips; extra spacing reduces overlap. This is still a work in progress—visual glitches (e.g., occasional label overflow or timeline span beyond the year) may occur.

Known issues:
- Styling is still being consolidated; some inline/UI polish is pending.
- Mermaid can fail to render on malformed data; dependencies aren’t visualized yet.
- AI-generated diagrams may need manual cleanup if Mermaid parsing fails.
- Performance on very large data sets isn’t optimized yet.

The ultimate goal is to enable better-informed decision-making for software delivery, resource allocation, and strategic planning.

---

## 2. Getting Started

Upon launching the application, you'll see the **Sidebar** on the left.

### AI Assistant Settings

* Click the **"Settings"** link in the sidebar (under **Configuration**).
* Check the **"Enable AI Assistant Mode"** box.
* Select your desired AI provider (currently limited to "google-gemini" for the MVP).
* **Use a FREE API Key:** You must obtain a free-tier API key from **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
* **Note on Free Keys: Free-tier keys often have strict rate limits. If you see a **"503: Model Overloaded"** error, it means the service is busy. The application will retry several times, but you may need to wait and try again later.**
* Paste your API key into the text field.
* **Disclaimer:** This is a client-side application. Your API key is stored exclusively in your browser's local storage and is never sent to any server other than the selected LLM provider. Using this app comes with risks. The author is not liable for any issues that arise from using your own private (non-free-tier) API key.
* Click **"Save Settings"**.
* Toggling **"Enable AI Assistant Mode"** now immediately shows/hides every AI-only control (Create with AI, AI Assistant chat, and the Year Plan “Optimize This Plan” button) without requiring a page refresh.

#### Diagram Generation (Mermaid)

The AI Assistant can generate Mermaid diagrams directly (no external image service required). When you ask for a diagram in natural language, the agent produces Mermaid syntax and renders it in a modal.

### AI Assistant

The AI Assistant is a powerful, integrated feature.

* **AI System Generation:** From the home screen, use the "Create with AI" button to generate a complete system from a text prompt.
* **Settings:** Use the global "AI Settings" button to enable the assistant and add your API key.
* **Context-Aware Chat & Analysis:** Once a system is loaded, use the "AI Assistant" button to open the chat panel. You can ask complex, analytical questions about the data in your current view (e.g., "Which teams are overloaded?").
* **Action Agent:** The AI can now perform actions. Type `/` in the chat to see a list of commands you can ask the AI to run, such as `/addInitiative` or `/moveEngineerToTeam`.

For a full list of AI features, see **Section 4: Key Features**.

### Loading a Saved System

* Click **"Load System"**.
* A dialog will appear listing all previously saved systems.
* Click the "Load" button next to the system you wish to work with.
* The application comes with a rich library of pre-configured sample systems to help you explore its features. These include:
    * **`StreamView`** (Video Streaming Platform)
    * **`ConnectPro`** (Cloud Contact Center)
    * **`ShopSphere`** (eCommerce Marketplace)
    * **`InsightAI`** (Generative AI Platform)
    * **`FinSecure`** (FinTech Neobank)

### Creating a New System

* Click **"New System"**.
* You will be taken to the "Edit System" page with a new, default system structure.
* Fill in the "System Name" and "System Description".
* Proceed to define your services, teams, managers, and other relevant data.
* Remember to click **"Save All Changes"** at the bottom of the edit page.

### Creating a New System with AI

* First, enable the AI Assistant and save your API key (see "AI Assistant Settings" above).
* On the home screen, click the **"Create with AI"** button.
* Enter a prompt describing the system you want to model (e.g., "A food delivery service like Uber Eats" or "A new FinTech bank").
* A loading spinner will appear while the AI generates your system.
* The AI will generate a complete, realistic system, including a full org chart, a multi-year roadmap, and all service dependencies.
* Upon successful creation, a statistics panel will appear, showing details about the generation process, such as token count and character count.
* This new system is then saved to your local storage just like a manually created one.

### Deleting a System

* Click **"Delete System"** from the home page menu.
* A dialog will list saved systems. Click "Delete" next to the desired system.
* A confirmation prompt will appear before permanent deletion.

### Resetting to Defaults

* Click **"Reset Defaults"**.
* **Caution:** This action will erase ALL currently saved systems and restore the initial sample systems. This cannot be undone.
* A confirmation prompt will appear before deletion.

---

## 3. Core Concepts & Data Model

Understanding these core entities is key to using the tool effectively. Most entities include an extensible `attributes: {}` object for future flexibility.

### System

* The highest-level entity, representing a collection of related software services (e.g., a product or platform).
* Attributes: `systemName`, `systemDescription`, and an extensible `attributes` object.

### Services & APIs

* **Services:** Logical components within a system providing specific business functionalities.
    * Attributes: `serviceName`, `serviceDescription`, `owningTeamId`, an array of `apis`, `serviceDependencies` (other services it relies on), `platformDependencies`, and an extensible `attributes` object.
* **APIs:** Public interfaces exposed by a service.
    * Attributes: `apiName`, `apiDescription`, `dependentApis` (other APIs it calls), and an extensible `attributes` object.

### Teams (2-Pizza Teams)

* Agile software development teams responsible for building and maintaining services.
* Attributes: `teamId` (unique), `teamName` (official name), `teamIdentity` (codename/nickname), `teamDescription`, `sdmId`, `pmtId`, `fundedHeadcount`.
* `engineers`: An array of engineer names (strings) who are primary members of this team. These names link to entries in the global `allKnownEngineers` list.
* `awayTeamMembers`: An array of objects, where each object represents a borrowed engineer and includes `{ name, level, sourceTeam, attributes }`.
* `teamCapacityAdjustments`: A detailed object for configuring team-specific capacity modifiers (see [Capacity Configuration](#capacity-configuration)).
* Extensible `attributes` object.

### Engineers (`allKnownEngineers`)

* The central roster of all engineers in the system is stored in `currentSystemData.allKnownEngineers`.
* Each engineer object includes:
    * `name`: Unique name of the engineer.
    * `level`: Numerical level (e.g., 1-7).
    * `currentTeamId`: The `teamId` of the team they are currently assigned to as a primary member (null if unassigned).
    * `attributes`: An extensible object containing:
        * `isAISWE` (boolean): True if the engineer is an AI Software Engineer.
        * `aiAgentType` (string): Specifies the type of AI agent (e.g., "Code Generation", "Testing") if `isAISWE` is true.
        * `skills` (array of strings): List of the engineer's skills.
        * `yearsOfExperience` (number): Years of industry experience.

### Away-Team Members

* Engineers borrowed from other teams, business units, or organizations to supplement a team's capacity.
* Tracked within each team's `awayTeamMembers` array. Each member has `name`, `level`, `sourceTeam`, and `attributes` (similar to `allKnownEngineers` for consistency, e.g., for AI away-members).
* These members contribute to a team's **Effective BIS (Builders In Seats)**.

### Managers (SDMs, Senior Managers, Project Managers)

* **Software Development Manager (SDM):** Manages one or more 2-Pizza Teams.
    * Attributes: `sdmId`, `sdmName`, `seniorManagerId` (their direct manager), and an extensible `attributes` object.
* **Senior Manager:** Manages one or more SDMs.
    * Attributes: `seniorManagerId`, `seniorManagerName`, and an extensible `attributes` object.
* **Project Managers:** Individuals responsible for managing projects/initiatives.
    * Stored in `currentSystemData.projectManagers` array.
    * Attributes: `pmId`, `pmName`, and an extensible `attributes` object.

### Platform Dependencies

* External infrastructure, cloud services, or shared components that services rely on (e.g., "AWS S3," "Auth0," "Kafka"). Dynamically compiled into `currentSystemData.platformDependencies`.

### Yearly Initiatives

* Projects, workstreams, or features planned for a year, stored in `currentSystemData.yearlyInitiatives`.
* Key Attributes:
    * `initiativeId`, `title`, `description`.
    * `isProtected` (boolean): If true, the initiative is locked at the top of the plan.
    * `assignments`: Array of `{ teamId: string, sdeYears: number }` objects detailing effort per team. At the roadmap stage, `sdeYears` can be `0` to indicate general team impact or involvement before detailed SDE estimates are available. This structure is consistent with how the Yearly Planning view tracks effort.
    * `impactedServiceIds` (array of strings): Lists the service IDs directly affected by this initiative.
    * `roi`: An object detailing Return on Investment: `{ category, valueType, estimatedValue, currency, timeHorizonMonths, confidenceLevel, calculationMethodology, businessCaseLink, overrideJustification, attributes }`.
    * `targetDueDate` (string: "YYYY-MM-DD").
    * `actualCompletionDate` (string: "YYYY-MM-DD").
    * `status` (string: e.g., "Backlog", "Defined", "Committed", "In Progress", "Completed").
    * `themes` (array of strings/themeIds): Links to `definedThemes`.
    * `primaryGoalId` (string): Links to a `goal` in `currentSystemData.goals`.
    * `projectManager`, `owner`, `technicalPOC`: Objects like `{ type, id, name }` linking to personnel.
    * `workPackageIds` (array of strings): Links to `workPackages`.
    * `attributes`: An extensible object, now including `pmCapacityNotes` (string) for product manager notes on high-level capacity or team impact and `planningYear` (number) which is the primary field for associating an initiative with a planning year.

### Capacity Configuration

* A detailed set of parameters stored in `currentSystemData.capacityConfiguration` to define and calculate net engineering capacity.
    * **Global (`globalConstraints`):**
        * `workingDaysPerYear`: Basis for SDE Year calculations.
        * `standardHoursPerDay`: Standard work hours.
        * `publicHolidays` (number): Days per year.
        * `orgEvents` (array): Objects like `{ id, name, estimatedDaysPerSDE, attributes }`.
    * **Standard Leave Types (`leaveTypes`):** Array of objects like `{ id, name, defaultEstimatedDays, attributes }` (e.g., Annual, Sick, Study, In-Lieu).
    * **Per Team (`team.teamCapacityAdjustments`):**
        * `leaveUptakeEstimates` (array): Objects like `{ leaveTypeId, estimatedUptakePercent }` for team-specific uptake of standard leave.
        * `variableLeaveImpact` (object): Total team days lost for types like `{ maternity: { affectedSDEs, avgDaysPerAffectedSDE } }`.
        * `teamActivities` (array): Objects like `{ id, name, type, estimateType ('perSDE'|'total'), value, attributes }`.
        * `avgOverheadHoursPerWeekPerSDE` (number): For recurring meetings, admin, etc.
        * `aiProductivityGainPercent` (number): An estimated percentage of productivity gained for human engineers due to AI tooling.
* The system uses these inputs to generate `currentSystemData.calculatedCapacityMetrics`.

### Goals

* Strategic objectives that initiatives align with, stored in `currentSystemData.goals`.
* Attributes: `goalId`, `name`, `description`, `strategyLink`, `owner`, `projectManager`, `technicalPOC` (personnel objects), `initiativeIds` (array of linked initiative IDs), and an extensible `attributes` object.

### Defined Themes

* Tags or categories for grouping initiatives, stored in `currentSystemData.definedThemes`.
* Attributes: `themeId`, `name`, `description`, `relatedGoalIds` (array of linked goal IDs), and an extensible `attributes` object.

### Work Packages

* Granular breakdown of initiatives, stored in `currentSystemData.workPackages`.
* Attributes: `workPackageId`, `initiativeId` (parent), `name`, `description`, `owner` (personnel object), `status`, `deliveryPhases` (array of `{ phaseName, status, startDate, endDate, notes }` - standard phases include "Requirements & Definition", "Design (Technical & UX)", "Implementation", "Integration & System Testing", "Security Testing", "User Acceptance Testing (UAT/E2E)", "Deployment", "Completed & Monitored"), `plannedDeliveryDate`, `actualDeliveryDate`, `impactedTeamAssignments` (array of `{ teamId, sdeDaysEstimate }`), `totalCapacitySDEdays` (calculated), `impactedServiceIds`, `dependencies` (array linking to other work packages), and an extensible `attributes` object.

### Archived Yearly Plans

* Snapshots of past yearly plans, stored in `currentSystemData.archivedYearlyPlans`.
* Attributes: `versionId`, `versionName`, `archivedDate`, a deep copy of `initiatives` at that time, `notes`, and an extensible `attributes` object.

---

## 4. Key Features

### AI Assistant

The AI Assistant has been refactored into a powerful, stateful **Action Agent** with a clean "Controller" (`ai/aiAgentController.js`) and "Toolset" (`ai/aiAgentToolset.js`) architecture.

* **AI System Generation:** From the home screen, use the "Create with AI" button to generate a complete, realistic system and 3-year plan from a single text prompt.
* **Settings Management:** A globally accessible "AI Settings" button in the top bar allows you to enable/disable AI mode and securely save your API key in local storage.
* **Stateful, Multi-Turn Conversation:** The agent now maintains a full chat session history (`chatSessionHistory`). You can ask follow-up questions, and the AI will remember the context of your previous messages, just like a real conversation. The session resets when you load a new system.
* **Action Agent & Tool Use:** The AI can now perform actions and "drive the app." You can ask it to make changes to the system data (e.g., "Add a new initiative," "Move this engineer," "Delete this service"). The AI will formulate a JSON-based "plan" which the `aiAgentController` executes using the `aiAgentToolset`.
* **`/` Command Discoverability:** To see what actions the agent can perform, simply type `/` in the chat input. A pop-up menu will appear showing all available commands (like `/addInitiative`, `/moveEngineerToTeam`).
* **True Context-Awareness:** The AI's context is now synchronized with *exactly* what you see on the UI. When you ask a question, the agent scrapes the *calculated data* from your current view (e.g., the `teamLoadSummary` and `planningTable` data from the "Year Plan" view, or the filtered data from the "Dashboard" view) and sends it with your question. This ensures its analysis is always based on the toggles and filters you have selected.
* **Plan Optimization Agent:** Launchable from the Year Plan view, this specialist runs an Analyze → Propose → Confirm workflow. It streams progress updates into the chat, posts a before/after capacity narrative, and waits for you to Apply or Discard the suggested changes.
* **Action Summaries:** Every autonomous agent plan now closes with a concise list of the changes it made (e.g., which initiatives were updated and how), making it easy to audit the run without digging through logs.
* **Expert Analysis:** The AI is prompted to be an expert engineering partner. You can ask it to:
    * **Analyze Team Composition:** "Find hiring risks" or "Analyze the ratio of junior to senior engineers."
    * **Optimize Plans:** "Suggest SDE-Year reductions for 2-3 BTL initiatives" or "How can I optimize this plan to fit more work?"
    * **Find Bottlenecks:** "Inspect the capacity constraints and find anomalies" or "Which teams are overloaded in this plan?"
* **Token Usage Tracking:** The chat panel now displays a running total of the "Session Tokens" used, so you are aware of your API usage.
* **Image Suggestions:** Certain suggested questions (e.g., “Generate a block diagram…”) will attempt to create diagrams via Imagen. (Note: This is still mocked, as noted in "Getting Started").

### Bulk AI Agent Scenarios (Macro Operations)

Empower the agent to perform complex, multi-entity updates that are tedious to do manually. Each plan highlights the scope before execution (e.g., “This will affect 12 teams...”).

**1) Capacity & Resourcing Manager**  
- User intent: “Reduce all teams’ capacity by 20% to account for burnout.” / “Set everyone’s AI productivity gain to 15%.”  
- Tool: `bulkUpdateTeamCapacity` (supports `capacityReductionPercent`, `aiProductivityGainPercent`, `avgOverheadHoursPerWeekPerSDE`, plus filters by teamIds or orgIdentifier).

**2) Strategic Portfolio Manager**  
- User intent: “Move all ‘Low ROI’ initiatives to the Backlog.” / “Approve all initiatives under the ‘Cloud Migration’ goal.”  
- Tool: `bulkUpdateInitiatives` (criteria: goalId, themeId, roiValue, confidenceLevel, status, isProtected).

**3) Scope Trimmer (“Haircut” Tool)**  
- User intent: “Reduce the scope of all committed initiatives by 10% to fit the plan.”  
- Tool: `bulkAdjustInitiativeEstimates` (adjustmentFactor scales SDE-year assignments; same criteria options as above).

**4) Org Restructurer (Advanced)**  
- User intent: “Move all teams from John Doe to Jane Smith.”  
- Tool: `bulkReassignTeams` (moves all teams from one SDM to another).

**Safety checks**  
- Bulk operations can be destructive; the agent surfaces an impact summary before running (e.g., “Reducing capacity for 15 teams”).  
- Plans are shown to the user before execution; review the description to confirm scope.

**Example scenarios**  
- *Scenario A: “Austerity” Plan* — “Increase overhead to 10 hours/week for everyone and move all ‘Low’ confidence initiatives to the backlog.”  
  - Plan: `bulkUpdateTeamCapacity({ avgOverheadHoursPerWeekPerSDE: 10 })` + `bulkUpdateInitiatives({ status: 'Backlog' }, { confidenceLevel: 'Low' })`
- *Scenario B: “AI Boost”* — “Assume 20% productivity gain for all teams.”  
  - Plan: `bulkUpdateTeamCapacity({ aiProductivityGainPercent: 20 })`

### System Navigation
Once a system is loaded, a **Sidebar** appears on the left, organizing all major views into logical domains.

#### **System**
*   **System Overview:** Visualizes your architecture (Services, APIs, Dependencies) and Team relationships.
*   **Org Design:** View the organization chart and manage the engineer roster.
*   **Edit System:** Modify system metadata, services, teams, and assignments.

#### **Product**
*   **Roadmap & Backlog:** The source of truth for all initiatives. Define, prioritize, and manage work before committing it to a yearly plan.

#### **Planning**
*   **Year Plan:** Commit initiatives to a yearly plan, assign engineering estimates, and track against capacity (ATL/BTL).
*   **Detailed Planning:** A granular view with a hierarchical table and Gantt chart for initiatives and work packages.
*   **Capacity Tuning:** Define leave, overhead, and AI productivity gains to calculate realistic Net Project Capacity.
*   **Resource Forecast:** Model SDE hiring, attrition, and ramp-up to predict future resource availability.

#### **Insights**
*   **Dashboard:** High-level strategic widgets (Goals, Accomplishments, Investment Trends, 3-Year Plan).

#### **Configuration**
*   **Settings:** Manage application settings (e.g., AI configuration).

#### **Help**
*   **How to Guide:** Access this documentation.

---

### Strategic Dashboard (Insights)

Click **"Dashboard"** from the sidebar to access high-level widgets for strategic analysis.

#### Dashboard Carousel
*   Navigate through widgets using "Previous" and "Next".

#### Strategic Goals Dashboard
*   **Purpose:** Track progress against high-level business objectives.
*   **Features:** Goal Cards showing SDE investment, linked initiatives, and status (On Track, At Risk). Drill down to see contributing teams.

#### Accomplishments View
*   **Purpose:** Celebrate completed work.
*   **Features:** Lists "Completed" initiatives with details on owners, teams, and final effort.

#### Investment Distribution by Theme
*   Doughnut chart showing SDE-Year allocation per strategic theme.

#### Investment Trend Over Time
*   Stacked bar chart visualizing year-over-year investment shifts.

#### Roadmap by Quarter & 3-Year Plan
*   **Roadmap by Quarter:** Theme-based swimlanes for Q1-Q4.
*   **3-Year Plan (3YP):** Strategic outlook (Current Year, Next Year, Future).

### System Overview & Visualizations (System)

Accessible via **"System Overview"**.
*   **System Visualization:** Services, APIs, Platform Dependencies.
*   **Team Relationships:** Interconnections based on service dependencies.
*   **Service Dependency Graph:** Force-directed graph of upstream/downstream dependencies.

### Diagramming (Mermaid)

Mermaid-based diagrams are available across the app and via the AI Assistant.
*   **System Architecture:** Teams, services, and dependencies.
*   **Service API Interactions:** Detailed API-level flows.
*   **AI-Generated:** Ask the AI to "Draw a block diagram" or "Visualize the checkout flow."

### Editing System Data (System)

*   Click **"Edit System"**.
*   Modify Name, Description, Services, Teams, and Personnel.
*   **Save All Changes** to persist updates.

### Organizational Views (System)

*   Click **"Org Design"** to see the org chart (Block, List, Table layouts) and manage the engineer roster.

### Tune Capacity Constraints (Planning)

*   Click **"Capacity Tuning"**.
*   Define global and team-specific constraints (holidays, leave, overhead) to calculate **Net Project SDE Years**.

### Roadmap & Backlog Management (Product)

*   Click **"Roadmap & Backlog"**.
*   Manage the pipeline of initiatives. This is the staging area for work before it enters the Year Plan.

### Yearly Planning (Planning)

*   Click **"Year Plan"**.
*   **Plan & Track:** Assign estimates and monitor capacity (ATL/BTL).
*   **AI Optimization:** Use the **🤖 Optimize This Plan** button to have the AI analyze and propose scope adjustments.
* [AI] - Ability to export the year plan, showing ATL/BTL logic, etc. to Excel - the excel model must be generated using LLM so that formulaes in the code are applied to the excel generation
* Now that we have a goals dashboard view, we need to think about introducing an interface to manage the lifecycle of goals
* Utilities
    * Now that we've got export to excel, csv and json working, we need a utlity to generate these files from other places: planning table, overall system data dump, etc.
    * [AI] Explore generating architecture diagramming options, apart from the app's 3d node graphs
* UX
    * Ability to export the system to JSON, CSV and Excel, from top level menu "Export System" [leveraging Tabular library's export functionality]
* Year Planning
    * View planning by teams - for individual manager team planning.
    * Add versioning when saving plans (up to 5 previous versions) - need to update data model structure
    * Add ability to export the plan to CSV or Excel
* Team Editing
    * We support away team only from an incoming perspective (i.e. help provided to the team), but we could also consider concept of outgoing away team (I.e. the team lends engineers to other teams)
* AI enhancements
    * Use AI to generate a delivery plan - classic ganntt chart using the year plan as input, work out a plan per team for the year
    * Use AI to set-up recurring tasks to collect status updates for initiatives (detailed work package tracking feature)
    * USe AI to generate graphs / views the webapp pages don't currently render - like a pie chart showing disribution of initiatives by themes
    * Use AI to create a new system from a visual software architecture diagram
    * Use AI to optimise detail planning
* TODO: Work with other LLM providers
* TODO: Add backend proxy for AI image generation (securely store user-provided API keys and enable browser clients hosted on GitHub Pages to call Imagen without exposing secrets)
* Bugs / Missing features
    * [UX] Add ability remove an engineer from Engineer List table to account for attrition (the engineer must be removed from the main engineer list and all associate objects where engineer is associated with a team)
* [UX] Include a Delete Resource section in the Organization view, make the Add and Delete resource sections collapsible.
* [Feature] - In Service Dependency Visualization, use different colours for upstream and downstream dependent nodes
