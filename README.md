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

The ultimate goal is to enable better-informed decision-making for software delivery, resource allocation, and strategic planning.

---

## 2. Getting Started

Upon launching the application, you'll see the main menu on the top bar.

### AI Assistant Settings

* Click the **"AI Assistant"** button, which is always visible in the top bar.
* Check the **"Enable AI Assistant Mode"** box.
* Select your desired AI provider (currently limited to "google-gemini" for the MVP).
* **Use a FREE API Key:** You must obtain a free-tier API key from **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
* **Note on Free Keys: Free-tier keys often have strict rate limits. If you see a **"503: Model Overloaded"** error, it means the service is busy. The application will retry several times, but you may need to wait and try again later.**
* Paste your API key into the text field.
* **Disclaimer:** This is a client-side application. Your API key is stored exclusively in your browser's local storage and is never sent to any server other than the selected LLM provider. Using this app comes with risks. The author is not liable for any issues that arise from using your own private (non-free-tier) API key.
* Click **"Save Settings"**.

#### Image Generation Requirements

The Imagen-powered diagram feature requires a couple of extra steps:

1. **Run the app from a local dev server** (e.g., VS Code Live Server, `npm run dev`, `npx http-server`). Calls to `file:///…` origins are blocked by modern browsers.
2. **Allow-list your dev origin in Google AI Studio / Google Cloud Console** for the API key you are using. Under *Application restrictions → Website restrictions* add the localhost origins you plan to use, for example:
   * `http://localhost`
   * `http://127.0.0.1`
   * `http://localhost:*/*`
   * `http://127.0.0.1:*/*`
3. **Understand the limitation:** Because keys are stored in the browser, production hosting (e.g., GitHub Pages) cannot safely call Imagen. A backend proxy that stores the key securely is required for public deployments (see backlog item “Add backend proxy for AI image generation”).

With those steps completed you can use the image suggestions in the AI Chat panel to request block diagrams, org charts, or mind maps.

### AI Assistant

* **AI System Generation:** From the home screen, use the "Create with AI" button to generate a complete, realistic system and 3-year plan from a single text prompt.
* **Settings Management:** A globally accessible "AI Assistant" button in the top bar allows you to enable/disable AI mode and securely save your API key in local storage. The modal provides explicit instructions and disclaimers for using a free API key.
* **Loading Animation:** A spinner provides visual feedback while the AI is processing your request.
* **Generation Statistics:** After a system is created, a panel displays metrics about the LLM interaction, including token and character counts for the input and output.
* **Context-Aware Chat:** Once a system is loaded, an "AI Chat" button appears. This opens a chat panel that allows you to ask questions about the *currently loaded system*. The AI's context is updated as you navigate, allowing you to ask specific questions about what you're seeing.
* **Image Suggestions:** Certain suggested questions (e.g., “Generate a block diagram…”) will attempt to create diagrams via Imagen. Make sure the requirements above are satisfied; otherwise the chat will explain why image generation failed.

#### Example Chat Questions

Here are some examples of the types of expert-level questions you can ask the assistant, based on the view you are on:

* **On "System Overview" (Visualizations):**
    * "What is this system about?"
    * "Which team owns the 'Content Delivery Service'?"
    * "What services does the 'Recommendation Engine' depend on?"
    * "Show me all upstream and downstream dependencies for the 'Payment Service'."

* **On "Inspect Org Design" (Org Chart & Engineer List):**
    * "Who is 'Emily Clark' and what are her skills?"
    * "Give me a list of all AI Software Engineers and their agent types."
    * "How many L5+ (Level 5 or higher) engineers are in the 'Core Platform' org?"
    * "Who does 'Alice Johnson' report to?"

* **On "Year Plan":**
    * "Which teams are overloaded based on the current ATL/BTL line?"
    * "What's the total Net SDE-Year capacity for the 'Avengers' team?"
    * "Summarize all initiatives assigned to the 'Avengers' and their total SDE load."

* **On "Capacity Tuning":**
    * "Walk me through the capacity calculation for the 'Spartans' team."
    * "What is the org-wide 'Net Project Capacity' in the 'EffectiveBIS' scenario?"
    * "Which team has the highest 'aiProductivityGainPercent' configured and what is it?"

* **On "Dashboard" (viewing a widget):**
    * (Viewing 'Strategic Goals') "Which goals are 'At Risk' and why?"
    * (Viewing 'Investment Distribution') "What's our biggest investment theme this year and how many SDE-Years are assigned to it?"
    * (Viewing 'Team Demand') "Which team has the highest 'Backlog' demand in Q3?"

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

* **AI System Generation:** From the home screen, use the "Create with AI" button to generate a complete, realistic system and 3-year plan from a single text prompt.
* **Settings Management:** A globally accessible "AI Assistant" button in the top bar allows you to enable/disable AI mode and securely save your API key in local storage. The modal provides explicit instructions and disclaimers for using a free API key.
* **Loading Animation:** A spinner provides visual feedback while the AI is processing your request.
* **Generation Statistics:** After a system is created, a panel displays metrics about the LLM interaction, including token and character counts for the input and output.

### System Navigation

Once a system is loaded, a persistent navigation bar appears at the top, giving you one-click access to all major views for that system. The currently active view is highlighted for context. Click **"Home"** to return to the system selection screen.

### Strategic Dashboard

Click **"Dashboard"** from the top navigation bar to access a set of high-level widgets for strategic analysis.

#### Dashboard Carousel

* Navigate through different dashboard widgets using "Previous" and "Next" buttons.

#### Strategic Goals Dashboard

* **Purpose:** To track progress against high-level business objectives for a selected year.
* **Features:** Displays a set of "Goal Cards," one for each strategic goal.
    * **At-a-glance Metrics:** Each card shows the total SDE investment, number of linked initiatives, and a visual progress bar.
    * **Contextual Status:** The overall status (`On Track`, `At Risk`, `Completed`) provides an immediate health check. Hover over the status for a tooltip explaining the reason.
    * **Ownership & Teams:** Clearly lists the goal's owner, PM, and technical POC, as well as all teams contributing to the goal's initiatives.
    * **Drill-Down:** Expand a card to see a detailed list of the specific initiatives supporting that goal, including a team-by-team SDE breakdown for each.

#### Accomplishments View

* **Purpose:** To celebrate and report on successfully completed work.
* **Features:** Shows a list of all initiatives that have a status of "Completed."
    * Each accomplishment card displays the initiative title, completion date, and description.
    * It provides rich context by showing the strategic goal it supported, the themes it belonged to, the key owners, contributing teams, and the final team effort in SDE-Years.

#### Investment Distribution by Theme

* A doughnut chart and summary table showing the percentage of total SDE-Year investment allocated to each strategic theme.
* A global "Filter by Year" dropdown allows for analyzing a specific year or all years combined.

#### Investment Trend Over Time

* A 100% stacked bar chart that visualizes how theme-based investment percentages evolve year-over-year, making it easy to spot strategic shifts.

#### Roadmap by Quarter & 3-Year Plan

* **Purpose:** To visualize the product roadmap from both tactical and strategic perspectives.
* **Features:**
    * **Roadmap by Quarter:** A theme-based swimlane view with columns for Q1, Q2, Q3, and Q4 of a selected year.
    * **3-Year Plan (3YP):** A similar swimlane view with columns for the "Current Year," "Next Year," and "Future," providing a long-range strategic outlook.
    * Both views are interactive and can be filtered by Organization, Team, and Theme.

### System Overview & Visualizations

Accessible by clicking **"System Overview"**. Provides multiple views of your architecture and organization.

* **Carousel Navigation:** Use the "< Previous" and "Next >" buttons to cycle through different visualizations.
* **System Visualization:** Displays services, their APIs, and platform dependencies.
* **Team Relationships Visualization:** Shows how teams are interconnected based on service dependencies.
* **Service Relationships Visualization:** Visualizes a specific service and its direct dependencies.
* **Service Dependency Visualization & Table:** A force-directed graph and a table detailing upstream and downstream dependencies for a selected service.

### Editing System Data

* Click **"Edit System"** from the top navigation bar.
* Modify: System Name, Description, Services, APIs, Teams, and manage assignments for Engineers, SDMs, and PMTs.
* Click **"Save All Changes"** to persist all modifications.

### Organizational Views

* Click **"Inspect Org Design"** to see an organization chart (in multiple layouts: Block, List, Table) and a detailed, editable list of all engineers in the system.

### Tune Capacity Constraints

* Click **"Capacity Tuning"** from the top navigation bar.
* This page allows defining factors that impact engineering capacity, such as leave, overhead, and AI-driven productivity gains, to calculate a realistic Net Project Capacity for each team.

### Roadmap & Backlog Management

* Click **"Roadmap & Backlog"** to manage the pipeline of all initiatives. This is the source of truth for creating and defining work before it is committed to a yearly plan.

### Yearly Planning

* Click **"Year Plan"** to commit initiatives, assign detailed engineering estimates, and track progress against calculated team capacities using the Above The Line / Below The Line (ATL/BTL) system.

### SDM Resource Forecasting Model

* Click **"Resource Forecasting"** to access a tool for modeling team headcount and effective SDE availability over 52 weeks, factoring in hiring, attrition, and capacity constraints.

### Tool Documentation (Home Page)

* The application's home page (when no system is loaded) features a collapsible section displaying this `README.md` file directly.

---

## 5. Basic Workflow Example

1.  **Load, Create, or Generate a System:**
    * (Option A) Click **"Load System"** to load a sample like `ShopSphere`.
    * (Option B) Click **"New System"** to start from scratch.
    * (Option C) Enable the AI Assistant, then click **"Create with AI"** and provide a prompt.
2.  **Define Core Data (Edit System / Org View):**
    * Set System Name and Description.
    * Add/Define **Project Managers**, **Goals**, and **Defined Themes**.
    * Add/Define your **Teams**, assigning SDMs and PMTs.
    * Add **Engineers** (Human or AI) to the global roster (`allKnownEngineers`) and assign them to teams. Add any **Away-Team Members**.
    * Add/Define **Services**, assign owning teams, and define **APIs** and dependencies.
    * Click **"Save All Changes"** in the Edit System view.
3.  **Explore Visualizations (System Overview):** Use the carousel, view Org Chart, and Engineer List.
4.  **Manage Roadmap & Backlog:**
    * Navigate to "Roadmap & Backlog".
    * Add new initiatives, define their strategic attributes (goals, themes, ROI, owner, PM notes, etc.), and set their initial status (e.g., "Backlog", "Defined").
    * Edit existing initiatives as they evolve, either inline or via the modal.
5.  **Tune Capacity Constraints:**
    * Navigate to "Capacity Tuning".
    * Set global working days, holidays, org events, and default leave days.
    * For each team, configure leave uptake %, variable leave impact, team activities, recurring overhead, and **AI productivity gain %**.
    * Review the summary, narrative, and waterfall chart.
    * **Save All Capacity Configuration**.
6.  **Analyze Dashboard Views:**
    * Navigate to the **"Dashboard"**.
    * Use the carousel to switch between the Strategic Goals, Accomplishments, Investment, and Roadmap widgets.
    * Use the filters to analyze data for specific years, organizations, or teams.
7.  **Manage Yearly Plan:**
    * Navigate to "Year Plan".
    * Select a planning year from the dynamic dropdown.
    * Assign detailed SDE Year estimates per team.
    * Mark critical initiatives as "Protected". Drag and drop to prioritize.
    * Use "Capacity Scenarios" and the "Apply Constraints & AI Gains (Net)?" toggle to analyze.
    * Review the "Enhanced Team Load Summary" table to see detailed capacity and loading.
    * **Save Current Plan Order & Estimates**.
8.  **Forecast Resources (Optional):** Navigate to "Resource Forecasting" for team-specific hiring and availability modeling.

---

## 6. Tips & Best Practices

* **Save Regularly:** Use the "Save" buttons frequently to persist your changes.
* **Iterative Definition:** Start with high-level entities and gradually add detail.
* **Use the Dashboard:** Regularly check the Strategic Goals and Accomplishments dashboards to track progress and celebrate wins.
* **Roadmap vs. Year Plan:** Use the "Roadmap & Backlog" view for broader strategic planning and the "Year Plan" view for detailed engineering capacity allocation.

---

## 7. Known Limitations (MVP)

* **Single User, Local Storage:** Data is saved in your browser's local storage. No multi-user collaboration.
* **Limited Import/Export:** General import/export for initiatives/plans to CSV/Excel is a future enhancement (though tables built with `EnhancedTableWidget` like Engineer List and Roadmap Table support export).
* **No True Skill Matching:** While skills are tracked for engineers, there's no automated matching to initiative requirements for resource suggestions.
* **UI for Advanced Planning Entities:** While the data model supports Goals, Themes, Project Managers, Work Packages, and Plan Archiving, dedicated UI views for managing all aspects of these are still under development or planned.

---

## 8. Future Enhancements (Backlog Highlights)

This tool is an evolving MVP. Key future enhancements include:

* **Detailed Planning Module:** UI for managing Goals (linking initiatives), Work Packages (phases, status, team assignments, dependencies), and task breakdowns.
* **Enhanced Yearly Planning UI:** Full UI support for editing all new initiative fields (ROI, due dates, personnel, etc.) directly in the planning table or a detail panel. UI for managing `archivedYearlyPlans`.
* **AI-Powered Enhancements:**
    * **[Done]** AI-assisted system modeling and data generation.
    * Conversational AI assistant for data querying and insights.
    * Analysis of team composition and hiring risks.
    * AI-assisted plan optimization.
* **Data Access Layer Refactoring:** Complete the abstraction of data operations for easier future backend integration.
* **EnhancedTableWidget Rollout:** Apply the widget to more tables (e.g., Planning Table, Team Load Summary) for consistent filtering/export.
* **Collaboration & Cloud Sync:** For multi-user access and data persistence beyond local storage.
