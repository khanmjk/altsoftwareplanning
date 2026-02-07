# Software Management & Planning Tool (SMT) - v2.0

**Welcome to the Software Management & Planning Tool!** This application is designed to help software engineering leaders and managers model, visualize, and plan their software systems, organizational structures, and yearly initiatives.

> **v2.0 "Engineered" Release**: This codebase has moved from a prototype to a robust **Service-Based Architecture**. While the UI remains familiar, the underlying engine is now governed by strict Contracts.

---

## Table of Contents

1.  [Technical Architecture (v2.0)](#technical-architecture)
2.  [AI-First Development (Contracts)](#ai-first-development)
3.  [Purpose](#purpose)
4.  [Getting Started](#getting-started)
5.  [Core Concepts & Data Model](#core-concepts--data-model)
6.  [Key Features](#key-features)
    - [Community Blueprints Exchange](#community-blueprints-exchange)
    - [Detailed Planning & Gantt](#detailed-planning--gantt)
    - [AI Assistant](#ai-assistant-1)
    - [Strategic Dashboard](#strategic-dashboard)
7.  [Basic Workflow Example](#basic-workflow-example)
8.  [Tips & Best Practices](#tips--best-practices)
9.  [Known Limitations](#known-limitations)
10. [Future Roadmap](#future-roadmap)

---

## 🏗️ Technical Architecture

SMT v2.0 is built with a **"Vanilla JS + Service Architecture"** approach, designed for durability and AI-assistability.

### Directory Structure

```text
/root
├── ai/                 # Agentic Controllers & Toolsets (The "Brain")
├── docs/               # AI Contracts & Governance (READ THESE)
├── css/
│   ├── components/     # Scoped component styles
│   └── themes/         # CSS Variables for Dark/Light modes
└── js/
    ├── services/       # Business Logic (Singleton Services)
    ├── components/     # UI Components (View Layer)
    ├── managers/       # State Management
    └── main.js         # Application Bootstrapper
```

### Key Patterns

1.  **Service Layer**: All business logic resides in `js/services`.
2.  **No Globals**: We strictly avoid `window` pollution.
3.  **Event-Driven**: Components update via state subscribers.

### Backend Services (Cloudflare Workers)

SMT is primarily a client-side application, but uses **Cloudflare Workers** for secure server-side operations:

```text
smt-feedback-worker/
├── src/index.js      # Worker entry point
├── wrangler.toml     # Cloudflare configuration
└── README.md         # Deployment instructions
```

**Feedback Submission Flow:**

```
User → FeedbackModal → FeedbackService → Cloudflare Worker → GitHub Issues API
```

The worker acts as a secure proxy, holding the GitHub API token server-side so users never need to authenticate or store credentials.

**YouTube API Proxy Flow:**

```
User → About View → Cloudflare Worker (/youtube) → YouTube Data API
```

The same worker also proxies requests to the YouTube Data API. This allows the application to fetch video data without exposing the YouTube API Key in the client-side code. The key is stored securely as a Cloudflare Secret (`YOUTUBE_API_KEY`).

### External Integrations

1.  **Blogger API**: Used in the "About" view to fetch AI-related blog posts. Implemented via client-side JSONP to bypass CORS restrictions during local development.
2.  **YouTube Data API**: Used in the "About" view to fetch channel videos. Proxied via Cloudflare Worker to secure the API key.

---

## 🤖 AI-First Development

This project is maintained with the **Antigravity** workflow. Contributors using AI agents **MUST** load the contracts first.

- **`docs/coding-agent-contract.md`**: Technical rules (file structure, variables).
- **`docs/workspace-canvas-contract.md`**: UI/UX rules (theming, colors).

---

## 1. Purpose

This tool provides a unified platform to:

- **Model Software Architecture:** Define systems, services, APIs, and their dependencies.
- **Map Organizational Structure:** Link teams to services, assign engineers (including AI Software Engineers), and represent management hierarchies.
- **Visualize Relationships:** Understand how services connect, how teams are structured, and how they relate to the software they own.
- **Plan Capacity & Resources:** Configure detailed capacity constraints (leave, overheads, team activities, etc.) and AI productivity gains to understand true team availability (Net Project SDE Years).
- **Manage Roadmaps & Backlogs:** Define, prioritize, and manage initiatives from backlog through to completion, focusing on strategic alignment and product management needs.
- **Execute Yearly Planning:** Commit initiatives to a yearly plan, assign detailed engineering estimates, and track against calculated team capacities.
- **Gain Strategic Insights:** Use the dashboard to visualize investment allocation, track strategic trends over time, and monitor progress towards business goals.
- **Forecast Team Growth:** Model SDE hiring, ramp-up, and attrition, factoring in detailed capacity constraints to predict resource availability.
- **Accelerate Modeling with AI:** Use a powerful AI Assistant to generate entire, realistic sample systems and roadmaps from a single text prompt.

### Latest Release Highlights (February 7, 2026)

- **Goal lifecycle engine is now operational**: goals compute health/status from linked initiatives (including due-date inheritance, slippage detection, and completion behavior) and stay synchronized across Dashboard and Management views.
- **Goal lifecycle UI is now fully manageable**: create/update/delete goals in **Product -> Management -> Goals**, with goal status pills and linked-initiative controls.
- **Roadmap discoverability improved**: quarterly and 3YP now support **Goal** and **Status** filters; Roadmap toolbar includes direct shortcuts to **Manage Themes**, **Manage Initiatives**, and **Manage Goals**.
- **Management productivity improved**: initiatives now support inline search/reset filtering in Product Management.
- **Capacity insights improved**: Capacity dashboard includes a **Hiring Gap** KPI, and sink calculations now avoid counting unfilled roles as staffed capacity.
- **Org chart readability improved**: org chart rendering now emphasizes depth levels visually.
- **Data portability improved**: sidebar now supports system **Export**/**Import** (JSON) with schema-versioned payloads and compatibility checks.
- **Year Plan resilience improved**: users can save/load plan snapshots (latest 5 per planning year retained) and filter planning by **Team Focus**.
- **Detailed Planning improved**: dependency conflict detection is surfaced in UI and auto-scheduling can shift work packages to resolve predecessor violations.
- **AI planning copilots expanded**: alignment/risk analysis commands now include goal-initiative alignment and goal risk assessment.
- **Community Blueprints Exchange delivered**: browse a curated Top-100 catalog with explicit availability states, install prebuilt launch packages without API key setup, and contribute local systems to unlock additional curated blueprints.

---

## 2. Getting Started

Upon launching the application, you'll see the **Sidebar** on the left.

### AI Assistant Settings

- Click the **"Settings"** link in the sidebar (under **Configuration**).
- Check the **"Enable AI Assistant Mode"** box.
- Select your desired AI provider (currently limited to "google-gemini" for the MVP).
- **Use a FREE API Key:** You must obtain a free-tier API key from **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
- **Note on Free Keys: Free-tier keys often have strict rate limits. If you see a **"503: Model Overloaded"** error, it means the service is busy. The application will retry several times, but you may need to wait and try again later.**
- Paste your API key into the text field.
- **Disclaimer:** This is a client-side application. Your API key is stored exclusively in your browser's local storage and is never sent to any server other than the selected LLM provider. Using this app comes with risks. The author is not liable for any issues that arise from using your own private (non-free-tier) API key.
- Click **"Save Settings"**.
- Toggling **"Enable AI Assistant Mode"** now immediately shows/hides every AI-only control (Create with AI, AI Assistant chat, and the Year Plan “Optimize This Plan” button) without requiring a page refresh.

#### Diagram Generation (Mermaid)

The AI Assistant can generate Mermaid diagrams directly (no external image service required). When you ask for a diagram in natural language, the agent produces Mermaid syntax and renders it in a modal.

### AI Assistant

The AI Assistant is a powerful, integrated feature.

- **AI System Generation:** From the home screen, use the "Create with AI" button to generate a complete system from a text prompt.
- **Settings:** Use the global "AI Settings" button to enable the assistant and add your API key.
- **Context-Aware Chat & Analysis:** Once a system is loaded, use the "AI Assistant" button to open the chat panel. You can ask complex, analytical questions about the data in your current view (e.g., "Which teams are overloaded?").
- **Action Agent:** The AI can now perform actions. Type `/` in the chat to see a list of commands you can ask the AI to run, such as `/addInitiative` or `/moveEngineerToTeam`.

For a full list of AI features, see **Section 4: Key Features**.

### Loading a Saved System

- Click **"Load System"**.
- A dialog will appear listing all previously saved systems.
- Click the "Load" button next to the system you wish to work with.
- The application comes with a rich library of pre-configured sample systems to help you explore its features. These include:
  - **`StreamView`** (Video Streaming Platform)
  - **`ConnectPro`** (Cloud Contact Center)
  - **`ShopSphere`** (eCommerce Marketplace)
  - **`InsightAI`** (Generative AI Platform)
  - **`FinSecure`** (FinTech Neobank)

### Creating a New System

- Click **"New System"**.
- You will be taken to the "Edit System" page with a new, default system structure.
- Fill in the "System Name" and "System Description".
- Proceed to define your services, teams, managers, and other relevant data.
- Remember to click **"Save All Changes"** at the bottom of the edit page.

### Creating a New System with AI

- First, enable the AI Assistant and save your API key (see "AI Assistant Settings" above).
- On the home screen, click the **"Create with AI"** button.
- Enter a prompt describing the system you want to model (e.g., "A food delivery service like Uber Eats" or "A new FinTech bank").
- A loading spinner will appear while the AI generates your system.
- The AI will generate a complete, realistic system, including a full org chart, a multi-year roadmap, and all service dependencies.
- Upon successful creation, a statistics panel will appear, showing details about the generation process, such as token count and character count.
- This new system is then saved to your local storage just like a manually created one.

### Deleting a System

- Click **"Delete System"** from the home page menu.
- A dialog will list saved systems. Click "Delete" next to the desired system.
- A confirmation prompt will appear before permanent deletion.

### Resetting to Defaults

- Click **"Reset Defaults"**.
- **Caution:** This action will erase ALL currently saved systems and restore the initial sample systems. This cannot be undone.
- A confirmation prompt will appear before deletion.

### Exporting and Importing System Data (JSON)

- Open the system switcher in the sidebar (top-left system dropdown).
- Click **"Export System"** to download a schema-versioned JSON export of the active system.
- Click **"Import System"** to load a previously exported file.
- Import behavior includes compatibility checks:
  - unsupported or newer schema versions are rejected with clear errors
  - legacy payloads are accepted through compatibility normalization where possible
  - imported systems can be activated immediately after import

### Community Blueprints (AppStore-lite)

- Open **Community Blueprints** from the sidebar to browse a curated Top-100 catalog.
- Launch wave includes **25 prebuilt, installable curated packages**; remaining entries are intentionally marked **Needs Contribution**.
- Search and filter support title, tags, category, trust label, availability, complexity, stage, and source.
- Open **Preview** to inspect:
  - system composition baseline (services, teams, goals, initiatives)
  - prompt pack (seed + MVP/Scale/Enterprise variants)
  - trust + availability labels (`Verified`, `Community`, `Experimental`; `Available`, `Needs Contribution`)
- Install lifecycle actions are explicit and state-aware:
  - **Install Blueprint** for first install
  - **Open Installed** when already installed
  - **Install Another Copy** for parallel variants
  - **Update to Latest** when catalog package is newer than local installed copy
- Non-available curated entries enforce contribution flow:
  - **Install Locked** is disabled
  - **Contribute with AI** triggers the existing **Create with AI** generation path (BYOK token usage), then validates and publishes locally
- Publish local systems with **Publish Local System**:
  - validate package shape and required metadata
  - download portable package JSON
  - publish into local community catalog storage for discoverability

---

## 3. Core Concepts & Data Model

Understanding these core entities is key to using the tool effectively. Most entities include an extensible `attributes: {}` object for future flexibility.

### System

- The highest-level entity, representing a collection of related software services (e.g., a product or platform).
- Attributes: `systemName`, `systemDescription`, and an extensible `attributes` object.

### Services & APIs

- **Services:** Logical components within a system providing specific business functionalities.
  - Attributes: `serviceName`, `serviceDescription`, `owningTeamId`, an array of `apis`, `serviceDependencies` (other services it relies on), `platformDependencies`, and an extensible `attributes` object.
- **APIs:** Public interfaces exposed by a service.
  - Attributes: `apiName`, `apiDescription`, `dependentApis` (other APIs it calls), and an extensible `attributes` object.

### Teams (2-Pizza Teams)

- Agile software development teams responsible for building and maintaining services.
- Attributes: `teamId` (unique), `teamName` (official name), `teamIdentity` (codename/nickname), `teamDescription`, `sdmId`, `pmtId`, `fundedHeadcount`.
- **Flexible Hierarchy:** Teams can report to either an SDM (`sdmId`) OR directly to a Senior Manager (`seniorManagerId`). Only one should be set at a time.
- `engineers`: An array of engineer names (strings) who are primary members of this team. These names link to entries in the global `allKnownEngineers` list.
- `awayTeamMembers`: An array of objects, where each object represents a borrowed engineer and includes `{ awayMemberId, name, level, sourceTeam, attributes }`.
- `teamCapacityAdjustments`: A detailed object for configuring team-specific capacity modifiers (see [Capacity Configuration](#capacity-configuration)).
- Extensible `attributes` object.

### Engineers (`allKnownEngineers`)

- The central roster of all engineers in the system is stored in `currentSystemData.allKnownEngineers`.
- Each engineer object includes:
  - `engineerId`: A unique identifier for the engineer (e.g., "eng-001", "eng-ai-1"). **Required for all operations.**
  - `name`: Unique name of the engineer.
  - `level`: Numerical level (e.g., 1-7).
  - `currentTeamId`: The `teamId` of the team they are currently assigned to as a primary member (null if unassigned).
  - `attributes`: An extensible object containing:
    - `isAISWE` (boolean): True if the engineer is an AI Software Engineer.
    - `aiAgentType` (string): Specifies the type of AI agent (e.g., "Code Generation", "Testing") if `isAISWE` is true.
    - `skills` (array of strings): List of the engineer's skills.
    - `yearsOfExperience` (number): Years of industry experience.

### Away-Team Members

- Engineers borrowed from other teams, business units, or organizations to supplement a team's capacity.
- Tracked within each team's `awayTeamMembers` array. Each member has:
  - `awayMemberId`: A unique identifier for the away-team member. **Required for all operations.**
  - `name`, `level`, `sourceTeam`, and `attributes` (similar to `allKnownEngineers` for consistency, e.g., for AI away-members).
- These members contribute to a team's **Effective BIS (Builders In Seats)**.

### Managers (SDMs, Senior Managers, Project Managers)

- **Software Development Manager (SDM):** Manages one or more 2-Pizza Teams.
  - Attributes: `sdmId`, `sdmName`, `seniorManagerId` (their direct manager), and an extensible `attributes` object.
- **Senior Manager:** Manages one or more SDMs.
  - Attributes: `seniorManagerId`, `seniorManagerName`, and an extensible `attributes` object.
- **Project Managers:** Individuals responsible for managing projects/initiatives.
  - Stored in `currentSystemData.projectManagers` array.
  - Attributes: `pmId`, `pmName`, and an extensible `attributes` object.

### Platform Dependencies

- External infrastructure, cloud services, or shared components that services rely on (e.g., "AWS S3," "Auth0," "Kafka"). Dynamically compiled into `currentSystemData.platformDependencies`.

### Yearly Initiatives

- Projects, workstreams, or features planned for a year, stored in `currentSystemData.yearlyInitiatives`.
- Key Attributes:
  - `initiativeId`, `title`, `description`.
  - `isProtected` (boolean): If true, the initiative is locked at the top of the plan.
  - `assignments`: Array of `{ teamId: string, sdeYears: number }` objects detailing effort per team. At the roadmap stage, `sdeYears` can be `0` to indicate general team impact or involvement before detailed SDE estimates are available. This structure is consistent with how the Yearly Planning view tracks effort.
  - `impactedServiceIds` (array of strings): Lists the service IDs directly affected by this initiative.
  - `roi`: An object detailing Return on Investment: `{ category, valueType, estimatedValue, currency, timeHorizonMonths, confidenceLevel, calculationMethodology, businessCaseLink, overrideJustification, attributes }`.
  - `targetDueDate` (string: "YYYY-MM-DD").
  - `actualCompletionDate` (string: "YYYY-MM-DD").
  - `status` (string: e.g., "Backlog", "Defined", "Committed", "In Progress", "Completed").
  - `themes` (array of strings/themeIds): Links to `definedThemes`.
  - `primaryGoalId` (string): Links to a `goal` in `currentSystemData.goals`.
  - `projectManager`, `owner`, `technicalPOC`: Objects like `{ type, id, name }` linking to personnel.
  - `workPackageIds` (array of strings): Links to `workPackages`.
  - `attributes`: An extensible object, now including `pmCapacityNotes` (string) for product manager notes on high-level capacity or team impact and `planningYear` (number) which is the primary field for associating an initiative with a planning year.

### Capacity Configuration

- A detailed set of parameters stored in `currentSystemData.capacityConfiguration` to define and calculate net engineering capacity.
  - **Global (`globalConstraints`):**
    - `workingDaysPerYear`: Basis for SDE Year calculations.
    - `standardHoursPerDay`: Standard work hours.
    - `publicHolidays` (number): Days per year.
    - `orgEvents` (array): Objects like `{ id, name, estimatedDaysPerSDE, attributes }`.
  - **Standard Leave Types (`leaveTypes`):** Array of objects like `{ id, name, defaultEstimatedDays, attributes }` (e.g., Annual, Sick, Study, In-Lieu).
  - **Per Team (`team.teamCapacityAdjustments`):**
    - `leaveUptakeEstimates` (array): Objects like `{ leaveTypeId, estimatedUptakePercent }` for team-specific uptake of standard leave.
    - `variableLeaveImpact` (object): Total team days lost for types like `{ maternity: { affectedSDEs, avgDaysPerAffectedSDE } }`.
    - `teamActivities` (array): Objects like `{ id, name, type, estimateType ('perSDE'|'total'), value, attributes }`.
    - `avgOverheadHoursPerWeekPerSDE` (number): For recurring meetings, admin, etc.
    - `aiProductivityGainPercent` (number): An estimated percentage of productivity gained for human engineers due to AI tooling.
- The system uses these inputs to generate `currentSystemData.calculatedCapacityMetrics`.

### Goals

- Strategic objectives that initiatives align with, stored in `currentSystemData.goals`.
- Core attributes: `goalId`, `name`, `description`, `strategyLink`, `owner`, `projectManager`, `technicalPOC`, `initiativeIds`, and extensible `attributes`.
- Lifecycle/status attributes (computed and persisted): `targetEndDate`/`dueDate`, `plannedEndDate`, `status`, `statusVisual`, `statusLabel`, `statusSeverity`, `healthCode`, `statusMessage`, and `inheritedDueDate`.
- Goal status logic is centralized in `GoalService` and reused by both the Goals dashboard widget and Product Management goals list.

### Defined Themes

- Tags or categories for grouping initiatives, stored in `currentSystemData.definedThemes`.
- Attributes: `themeId`, `name`, `description`, `relatedGoalIds` (array of linked goal IDs), and an extensible `attributes` object.

### Work Packages

- Granular breakdown of initiatives, stored in `currentSystemData.workPackages`.
- Attributes: `workPackageId`, `initiativeId` (parent), `name`, `description`, `owner` (personnel object), `status`, `deliveryPhases` (array of `{ phaseName, status, startDate, endDate, notes }` - standard phases include "Requirements & Definition", "Design (Technical & UX)", "Implementation", "Integration & System Testing", "Security Testing", "User Acceptance Testing (UAT/E2E)", "Deployment", "Completed & Monitored"), `plannedDeliveryDate`, `actualDeliveryDate`, `impactedTeamAssignments` (array of `{ teamId, sdeDaysEstimate }`), `totalCapacitySDEdays` (calculated), `impactedServiceIds`, `dependencies` (array linking to other work packages), and an extensible `attributes` object.

### Archived Yearly Plans

- Snapshots of past yearly plans, stored in `currentSystemData.archivedYearlyPlans`.
- Snapshot attributes: `snapshotId`, `planningYear`, `createdAt`, `label`, `scenario`, `applyConstraints`, `initiatives`, and `workPackages`.
- Retention policy: latest **5 snapshots per planning year** are kept automatically.

---

## 4. Key Features

### Community Blueprints Exchange

- **Curated Top-100 catalog** of inspired-by software product blueprints.
- **Launch 25 available now** with install-ready packages; remaining curated entries are contribution-gated.
- **Prompt-first previews** expose concise seed prompts and reusable variants for educational remixing.
- **Install lifecycle UX** supports first install, open installed, install another copy, and update-to-latest.
- **Contribution workflow** uses existing AI generation path to unlock curated entries locally.
- **Local publish flow** lets users validate, export, and publish their own blueprint packages.
- **Trust + availability labeling** distinguishes source credibility and install readiness at a glance.

### Detailed Planning & Gantt

We’ve introduced a new “Detailed Planning” page with a hierarchical table and Gantt chart for initiatives and work packages.

What’s included:

- **Hierarchical Table**: (Initiative → Work Package → Team assignments) with inline editing of dates, estimates, and predecessor links.
- **Gantt Chart**: A visual timeline using Mermaid/Frappe (configurable) to show work duration and dependencies.
- **Dependency Management**: Work package dependencies and cross-initiative predecessor selection.
- **Conflict Visibility**: dependency conflict badge shows current scheduling conflicts.
- **Auto-Schedule Baseline**: shifts work packages when predecessors end later than scheduled starts.
- **Filtering**: View data by Year, Team, or Goal.
- **Drill-Down**: Double-click initiatives to reveal Work Packages, and Work Packages to reveal underlying tasks.

### AI Assistant

The AI Assistant has been refactored into a powerful, stateful **Action Agent** with a clean "Controller" (`ai/aiAgentController.js`) and "Toolset" (`ai/aiAgentToolset.js`) architecture.

- **AI System Generation:** From the home screen, use the "Create with AI" button to generate a complete, realistic system and 3-year plan from a single text prompt.
- **Settings Management:** A globally accessible "AI Settings" button in the top bar allows you to enable/disable AI mode and securely save your API key in local storage.
- **Stateful, Multi-Turn Conversation:** The agent now maintains a full chat session history (`chatSessionHistory`). You can ask follow-up questions, and the AI will remember the context of your previous messages, just like a real conversation. The session resets when you load a new system.
- **Action Agent & Tool Use:** The AI can now perform actions and "drive the app." You can ask it to make changes to the system data (e.g., "Add a new initiative," "Move this engineer," "Delete this service"). The AI will formulate a JSON-based "plan" which the `aiAgentController` executes using the `aiAgentToolset`.
- **`/` Command Discoverability:** To see what actions the agent can perform, simply type `/` in the chat input. A pop-up menu will appear showing all available commands (like `/addInitiative`, `/moveEngineerToTeam`).
- **True Context-Awareness:** The AI's context is now synchronized with _exactly_ what you see on the UI. When you ask a question, the agent scrapes the _calculated data_ from your current view (e.g., the `teamLoadSummary` and `planningTable` data from the "Year Plan" view, or the filtered data from the "Dashboard" view) and sends it with your question. This ensures its analysis is always based on the toggles and filters you have selected.
- **Plan Optimization Agent:** Launchable from the Year Plan view, this specialist runs an Analyze → Propose → Confirm workflow. It streams progress updates into the chat, posts a before/after capacity narrative, and waits for you to Apply or Discard the suggested changes.
- **Action Summaries:** Every autonomous agent plan now closes with a concise list of the changes it made (e.g., which initiatives were updated and how), making it easy to audit the run without digging through logs.
- **Goal Planning Analysis Commands:** Includes alignment and risk-focused tools such as `analyzeGoalAlignment` and `analyzeGoalRisk`.
- **Expert Analysis:** The AI is prompted to be an expert engineering partner. You can ask it to:
  - **Analyze Team Composition:** "Find hiring risks" or "Analyze the ratio of junior to senior engineers."
  - **Optimize Plans:** "Suggest SDE-Year reductions for 2-3 BTL initiatives" or "How can I optimize this plan to fit more work?"
  - **Find Bottlenecks:** "Inspect the capacity constraints and find anomalies" or "Which teams are overloaded in this plan?"
- **Token Usage Tracking:** The chat panel now displays a running total of the "Session Tokens" used, so you are aware of your API usage.
- **Image Suggestions:** Certain suggested questions (e.g., “Generate a block diagram…”) will attempt to create diagrams via Imagen. (Note: This is still mocked, as noted in "Getting Started").

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

- _Scenario A: “Austerity” Plan_ — “Increase overhead to 10 hours/week for everyone and move all ‘Low’ confidence initiatives to the backlog.”
  - Plan: `bulkUpdateTeamCapacity({ avgOverheadHoursPerWeekPerSDE: 10 })` + `bulkUpdateInitiatives({ status: 'Backlog' }, { confidenceLevel: 'Low' })`
- _Scenario B: “AI Boost”_ — “Assume 20% productivity gain for all teams.”
  - Plan: `bulkUpdateTeamCapacity({ aiProductivityGainPercent: 20 })`

### System Navigation

Once a system is loaded, a **Sidebar** appears on the left, organizing all major views into logical domains.

#### **System**

- **System Overview:** Visualizes your architecture (Services, APIs, Dependencies) and Team relationships.
- **Org Design:** View the organization chart and manage the engineer roster.
- **Edit System:** Modify system metadata, services, teams, and assignments.

#### **Product**

- **Roadmap & Backlog:** The source of truth for all initiatives. Define, prioritize, and manage work before committing it to a yearly plan.
- **Management:** Dedicated product administration for Themes, Initiatives, and Goals (including lifecycle management).

#### **Planning**

- **Year Plan:** Commit initiatives to a yearly plan, assign engineering estimates, and track against capacity (ATL/BTL).
- **Detailed Planning:** A granular view with a hierarchical table and Gantt chart for initiatives and work packages.
- **Capacity Tuning:** Define leave, overhead, and AI productivity gains to calculate realistic Net Project Capacity.
- **Resource Forecast:** Model SDE hiring, attrition, and ramp-up to predict future resource availability.

#### **Insights**

- **Dashboard:** High-level strategic widgets (Goals, Accomplishments, Investment Trends, 3-Year Plan).

#### **Configuration**

- **Community Blueprints:** Browse/install curated blueprint packages and publish local blueprint packages.
- **Settings:** Manage application settings (e.g., AI configuration).

#### **Help**

- **How to Guide:** Access this documentation.
- **Provide Feedback:** Submit bug reports, feature requests, or general feedback directly to GitHub Issues.
- **About:** View author information, see the latest AI & Development blog posts (fetched dynamically from Blogger), and watch recent videos from the author's YouTube channel (fetched via secure proxy).

---

### Strategic Dashboard (Insights)

Click **"Dashboard"** from the sidebar to access high-level widgets for strategic analysis.

#### Dashboard Carousel

- Navigate through widgets using "Previous" and "Next".

#### Strategic Goals Dashboard

- **Purpose:** Track progress against high-level business objectives.
- **Features:** Goal cards show SDE investment, linked initiatives, status/health rationale, and contributing teams.
- **Operational Shortcut:** Includes direct navigation to **Manage Goals**.

#### Accomplishments View

- **Purpose:** Celebrate completed work.
- **Features:** Lists "Completed" initiatives with details on owners, teams, and final effort.

#### Investment Distribution by Theme

- Doughnut chart showing SDE-Year allocation per strategic theme.

#### Investment Trend Over Time

- Stacked bar chart visualizing year-over-year investment shifts.

#### Roadmap by Quarter & 3-Year Plan

- **Roadmap by Quarter:** Theme-based swimlanes for Q1-Q4.
- **3-Year Plan (3YP):** Strategic outlook (Current Year, Next Year, Future).

### System Overview & Visualizations (System)

Accessible via **"System Overview"**.

- **System Visualization:** Services, APIs, Platform Dependencies.
- **Team Relationships:** Interconnections based on service dependencies.
- **Service Dependency Graph:** Force-directed graph of upstream/downstream dependencies.

### Diagramming (Mermaid)

Mermaid-based diagrams are available across the app and via the AI Assistant.

- **System Architecture:** Teams, services, and dependencies.
- **Service API Interactions:** Detailed API-level flows.
- **AI-Generated:** Ask the AI to "Draw a block diagram" or "Visualize the checkout flow."

### Editing System Data (System)

- Click **"Edit System"**.
- Modify Name, Description, Services, Teams, and Personnel.
- **Save All Changes** to persist updates.

### Organizational Views (System)

- Click **"Org Design"** to see the org chart (Block, List, Table layouts) and manage the unified roster.
- **Manage Roster:** A unified view for managing all organizational roles including:
  - **Engineers:** Add, edit, delete, or move engineers between teams.
  - **PMTs (Product Management Team):** Add or remove PMT members.
  - **Away-Team Members:** Add guests/contractors to specific teams.
  - **Roster Summary:** View counts of all role types at a glance.
  - **Flexible Hierarchy:** Teams can report to SDMs or directly to Senior Managers.

### Tuning Capacity Constraints (Planning)

- Click **"Capacity Tuning"**.
- Define global and team-specific constraints (holidays, leave, overhead) to calculate **Net Project SDE Years**.
- The Capacity dashboard now also reports **Hiring Gap** and uses staffed capacity assumptions when unfilled headcount exists.

### Roadmap & Backlog Management (Product)

- Click **"Roadmap & Backlog"**.
- Manage the pipeline of initiatives. This is the staging area for work before it enters the Year Plan.
- Use quick actions to jump directly to **Manage Themes**, **Manage Initiatives**, **Manage Goals**, or **Goal Inspections**.
- Quarterly and 3YP roadmap views support **Goal** and **Status** filtering.

### Goal Inspections & Reporting (Product)

- Go to **Management -> Inspections** (or use Roadmap/Dashboard quick actions).
- Goal owners can submit weekly check-ins with:
  - manual owner status (**On Track**, **Slipping**, **At Risk**, **Late**, **Blocked**, **Achieved**)
  - weekly comment
  - **Path to Green (PTG)** and PTG target date
  - blockers and leadership asks
- Leadership reporting includes:
  - update coverage this week
  - stale goals
  - at-risk/late goals
  - owner-vs-computed status mismatches
  - top blockers rollup
- Inspection report table supports filtering and **CSV/XLSX export**.

### Yearly Planning (Planning)

- Click **"Year Plan"**.
- **Plan & Track:** Assign estimates and monitor capacity (ATL/BTL).
- **Team Focus:** Filter planning views to a selected team while preserving totals.
- **Snapshots:** Save and restore plan snapshots for the current planning year (latest 5 retained).
- **Export:** Download the active year plan to **CSV** or **XLSX** (metadata, team summary, and initiatives).
- **AI Optimization:** Use the **🤖 Optimize This Plan** button to have the AI analyze and propose scope adjustments.

### Dynamic Theming (UX)

- **Dark & Light Modes:** Fully supported, high-contrast system themes.
- **Seasonal Themes:** Automatic updates for holidays (e.g., "Spooky" for Halloween, "Winter" for Christmas).
- **Random Theme Generator:** Feeling adventurous? Use the "Random Theme" button in Settings to generate a unique, mathematically harmonious color palette.
- **Contract-Driven:** All themes adhere to the strict semantic color variables defined in `docs/workspace-canvas-contract.md`.

### Provide Feedback (Help)

- Click **"Provide Feedback"** in the sidebar (under **Help**).
- Submit bug reports, feature requests, or general feedback directly to the project's GitHub Issues.
- **Features:**
  - **Feedback Types:** Bug Report, Feature Request, General Feedback, or Other.
  - **Optional Email:** Provide your email for follow-up (completely optional).
  - **App Context:** Optionally include debugging context (current view, theme, system name) to help diagnose issues.
- **Privacy:** No sensitive data (API keys, user data) is ever shared. Only basic app state is included if you opt-in.
- **Architecture:** Submissions are routed through a Cloudflare Worker that securely holds the GitHub API token, so you never need to authenticate.

---

## 5. Basic Workflow Example

1.  **Create/Load a System:** Start with a sample or generate one with AI.
2.  **Define Strategy:** Go to **Dashboard** or **Edit System** to set Goals and Themes.
3.  **Build Roster:** Use **Org Design** to add engineers and teams.
4.  **Tune Capacity:** Use **Capacity Tuning** to set holiday schedules and overheads.
5.  **Create Initiatives:** Use **Roadmap & Backlog** to define work.
6.  **Year Planning:** Go to **Year Plan**, drag initiatives to "Committed", and assign team effort. Watch the ATL/BTL lines.
7.  **Optimize:** Use the AI to check for bottlenecks or suggest optimizations.
8.  **Visualize:** Use **Detailed Planning** (Gantt) to schedule specific work packages.

---

## 6. Tips & Best Practices

- **Save Frequently:** The app saves to local storage, but explicitly clicking "Save" is good practice.
- **Use AI for Grunt Work:** Don't manually type out 50 initiatives. Ask the AI: "Generate 20 initiatives for a crypto exchange."
- **Monitor Capacity:** If a team is "Red" in the Year Plan, they are overbooked. Adjust estimates or move work to BTL.
- **Check Contracts:** When developing, always refer to `docs/coding-agent-contract.md` to ensure your code is clean and modular.

---

## 7. Known Limitations (MVP)

- **Local Storage Only:** Data persists in your browser. Clearing cache wipes data.
- **Single User:** No real-time collaboration (yet).
- **AI Rate Limits:** Dependent on your Google Gemini API quota.

---

## 8. Future Roadmap

- [x] **Unit Testing Suite**: Implemented a TDD framework for Services.
- [x] **System Export/Import (JSON)**: Schema-versioned JSON export and compatibility-checked import.
- [x] **Year Plan Snapshots**: Save/load snapshots with automatic retention (latest 5 per planning year).
- [x] **Year Plan CSV/XLSX Export**: Export current year-plan view (metadata, team summary, initiatives) to spreadsheet formats.
- [x] **Goal Lifecycle Management**: Goal status matrix + lifecycle CRUD in Product Management.
- [x] **Goal Owner Inspections & Reporting**: Weekly owner status/PTG check-ins, stale+mismatch detection, and exportable leadership reporting.
- [ ] **Cross-View CSV/XLSX Export Utility**: Standardize reusable export generation across additional planning/system views.
- [ ] **Visual Editors**: Enhanced drag-and-drop for Org Charts.
- [ ] **Architecture Diagrams**: Expanded auto-generation of system maps.

---

_Created by khanmjk | Powered by Antigravity_
