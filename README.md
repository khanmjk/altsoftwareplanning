# Software Management & Planning Tool - MVP

**Welcome to the Software Management & Planning Tool!** This application is designed to help software engineering leaders and managers model, visualize, and plan their software systems, organizational structures, and yearly initiatives.

## Table of Contents

1.  [Purpose](#purpose)
2.  [Getting Started](#getting-started)
    * [Loading a Saved System](#loading-a-saved-system)
    * [Creating a New System](#creating-a-new-system)
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
    * [System Overview & Visualizations](#system-overview--visualizations)
        * [Carousel Navigation](#carousel-navigation)
        * [System Visualization](#system-visualization-1)
        * [Team Relationships Visualization](#team-relationships-visualization-1)
        * [Service Relationships Visualization](#service-relationships-visualization-1)
        * [Service Dependency Visualization & Table](#service-dependency-visualization--table-1)
    * [Editing System Data](#editing-system-data)
    * [Organizational Views](#organizational-views)
        * [Organization Chart (Org Chart)](#organization-chart-org-chart-1)
        * [Team Breakdown Table](#team-breakdown-table-1)
        * [Engineer Resource List](#engineer-resource-list-1)
        * [Adding New Resources](#adding-new-resources)
    * [Tune Capacity Constraints](#tune-capacity-constraints)
        * [Global Configuration](#global-configuration-1)
        * [Team-Specific Adjustments & AI Productivity](#team-specific-adjustments--ai-productivity)
        * [Calculated Capacity Summary, Narrative & Waterfall Chart](#calculated-capacity-summary-narrative--waterfall-chart-1)
    * [Roadmap & Backlog Management](#roadmap--backlog-management)
        * [Roadmap Table](#roadmap-table)
        * [Status Filtering](#status-filtering)
        * [Adding & Editing Initiatives (Modal & Inline)](#adding--editing-initiatives-modal--inline)
    * [Yearly Planning](#yearly-planning)
        * [Planning Table](#planning-table-1)
        * [Capacity Scenarios & Constraints Toggle](#capacity-scenarios--constraints-toggle)
        * [Protected Initiatives](#protected-initiatives-1)
        * [Drag & Drop Prioritization](#drag--drop-prioritization-1)
    * [Strategic Dashboard](#strategic-dashboard)
        * [Dashboard Carousel](#dashboard-carousel)
        * [Investment Distribution by Theme](#investment-distribution-by-theme)
        * [Investment Trend Over Time](#investment-trend-over-time)
        * [Roadmap by Quarter (Swimlane View)](#roadmap-by-quarter-swimlane-view)
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
* **Gain Strategic Insights:** Use the dashboard to visualize investment allocation by theme and track strategic trends over time.
* **Forecast Team Growth:** Model SDE hiring, ramp-up, and attrition, factoring in detailed capacity constraints to predict resource availability.

The ultimate goal is to enable better-informed decision-making for software delivery, resource allocation, and strategic planning.

---

## 2. Getting Started

Upon launching the application, you'll see the main menu on the top bar:

### Loading a Saved System

* Click **"Load System"**.
* A dialog will appear listing all previously saved systems.
* Click the "Load" button next to the system you wish to work with.
* The application comes with pre-configured sample systems (`StreamView` and `ConnectPro`) to help you explore its features.

### Creating a New System

* Click **"New System"**.
* You will be taken to the "Edit System" page with a new, default system structure.
* Fill in the "System Name" and "System Description".
* Proceed to define your services, teams, managers, and other relevant data.
* Remember to click **"Save All Changes"** at the bottom of the edit page.

### Deleting a System

* Click **"Delete System"** from the home page menu.
* A dialog will list saved systems. Click "Delete" next to the desired system.
* A confirmation prompt will appear before permanent deletion.

### Resetting to Defaults

* Click **"Reset Defaults"**.
* **Caution:** This action will erase ALL currently saved systems and restore the initial sample systems (`StreamView`, `ConnectPro`). This cannot be undone.
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

### System Overview & Visualizations

Accessible after loading a system. Provides multiple views of your architecture and organization through a modernized card-based UI with a persistent top navigation bar.

#### Carousel Navigation

* Use the "< Previous" and "Next >" buttons to cycle through different visualizations. The title in the center indicates the current view.

#### System Visualization

* Displays services (colored by owning team), their APIs, and their connections to platform dependencies.
* Shows service-to-service dependencies and API-to-API dependencies.
* Interactive: Zoom, pan, hover over nodes for tooltips.

#### Team Relationships Visualization

* Shows teams as nodes, colored by their identity.
* Links between teams indicate dependencies based on the services they own.
* Hover for team details (SDM, PMT, services owned, etc.).

#### Service Relationships Visualization

* Select a specific service from the dropdown (or "All Services View").
* Visualizes the selected service, its direct dependencies (upstream services it relies on), and platform dependencies.
* If a specific service is selected, it is highlighted.

#### Service Dependency Visualization & Table

* Select a service from the dropdown.
* Displays a force-directed graph showing the selected service and its direct upstream and downstream service dependencies, as well as platform dependencies.
* Hover over nodes to see their connections highlighted.
* The **Service Dependencies Table** (appears below the carousel when this visualization is active) provides a tabular view of all services, their owners, and their upstream/downstream/platform dependencies.

### Editing System Data

* Click **"Edit System"** from the system overview page.
* Modify:
    * System Name and Description.
    * **Services:** Add, delete, or edit services, their APIs, and their dependencies (service & platform).
    * **Teams:** Add, delete, or edit teams, assign services, assign SDMs/PMTs, manage engineers (including AI SWEs), and manage away-team members.
    * **Personnel:** Project Managers, Goals, and Defined Themes can be managed (future: dedicated UIs for these).
* Use dual-list selectors for assigning services, SDMs, PMTs, engineers, and dependencies.
* Click **"Save All Changes"** to persist all modifications. Click **"Cancel"** to discard changes and return to the system overview.

### Organizational Views

Accessible from the system overview page.

#### Organization Chart (Org Chart)

* Click **"Inspect Org Design"**.
* Displays an HTML-based hierarchical view: System Name -> Senior Managers -> SDMs -> Teams.
* Team nodes show Funded HC vs. Builders In Seats (BIS) and annotations for **away-team members and their sources**.

#### Team Breakdown Table

* Displayed below the Org Chart.
* A detailed table of each team, grouped by Senior Manager and SDM.
* Columns: Senior Manager, SDM, Team Identity, Team Name, PMT, **Team BIS**, Funded HC, **Effective BIS**, **BIS Hiring Gap**, **Engineers (Name, Level, AI Type if applicable)**, **Away-Team Members (Name, Level, Source, AI Type if applicable)**, and Services Owned.
* Includes totals for key capacity metrics.

#### Engineer Resource List

* Click **"Engineers List"**.
* Utilizes an **Enhanced Table Widget** for a sortable, filterable, and exportable (CSV, JSON, XLSX) view of all engineers in `allKnownEngineers`.
* **Columns:** Engineer Name, Level, Type (Human/AI), AI Agent Type, Skills, Years of Experience, current Team Identity, SDM Name, Senior Manager Name. Many columns are editable directly in the table.
* The table header summarizes total Funded HC, Team BIS, Away BIS, Effective BIS, and Hiring Gap for the organization.

#### Adding New Resources

* The "Inspect Org Design" view includes a section to "Add New Resource to Organisation," allowing direct addition of Engineers (Human or AI), SDMs, Senior Managers, and PMTs to the system's roster.

### Tune Capacity Constraints

* Click **"Capacity Tuning"** from the system overview page.
* This page allows defining factors that reduce raw engineering capacity and account for AI-driven productivity gains.

#### Global Configuration

* **Standard Working Days Per Year:** Basis for SDE Year calculations.
* **Standard Hours Per Day:** Used for converting weekly overhead hours to days.
* **Public Holidays (Days/Year):** Global holidays impacting all teams.
* **Organization-Wide Events:** Events like hackathons (Name, Est. Days/SDE).
* **Standard Leave Types:** Define default estimated days/SDE for types like Annual, Sick, Study, In-Lieu.

#### Team-Specific Adjustments & AI Productivity

* Collapsible sections for each team.
* **Standard Leave Uptake Estimate (%):** Percentage of global default days this team's members typically take for each standard leave type.
* **Variable Leave Impact Estimate:** Input total team days lost for types like Maternity, Paternity, Medical, Family Responsibility (Number of SDEs affected * Avg. Days per SDE).
* **Team Activities:** Define non-recurring team-specific events (e.g., training, conferences). Estimate impact either as "Days/SDE" or "Total Team Days".
* **Recurring Overhead:** Estimate average hours per SDE per week spent on recurring meetings, admin, ceremonies, etc. (e.g., `avgOverheadHoursPerWeekPerSDE`).
* **AI Tooling Productivity Gain (%):** Estimate the percentage of productivity gain for human engineers on the team from using AI-assisted tools. This gain is applied after all capacity sinks are deducted to calculate the final Net Capacity.

#### Calculated Capacity Summary, Narrative & Waterfall Chart

* **Summary Table:** Dynamically updates to show, for the selected scenario (Effective BIS, Team BIS, Funded HC): Team Identity, Headcount (for the scenario), Gross SDE Years, (-) Total Deductions (SDE Years - with tooltip for breakdown of sinks like leave, holidays, activities, overhead), and (=) Net Project SDE Years. Displays warnings if net capacity is zero or negative.
* **Narrative Section (Collapsible):** Provides a detailed written explanation of capacity calculations, breaking down how gross capacity is reduced by various sinks at global and team levels, including explicit calculation parameters and reconciliation of deductions.
* **Waterfall Chart (Collapsible):** Visualizes the capacity reduction from Gross SDE Years to Net Project SDE Years for the selected team or the entire organization, showing the impact of each deduction category (Holidays, Org Events, Std Leave, Var Leave, Activities, Overhead) and the positive impact of AI Productivity Gains.
* Click **"Save All Capacity Configuration"** to persist settings and calculated metrics.

### Roadmap & Backlog Management

* Click **"Roadmap & Backlog"** from the system overview page.
* This view is the single source of truth for creating and managing the pipeline of all initiatives.

#### Roadmap Table

* An interactive table (powered by Tabulator via `EnhancedTableWidget`) displaying all initiatives.
* **Columns include:** Title, Description, Status, Owner, ROI Summary (Category: Value), Target Quarter/Yr, Target Due Date, and Themes. Additional ROI details and PM Capacity Notes are available as hidden columns.
* Supports sorting and filtering on all columns.
* Detailed SDE year assignments per team are managed in the "Yearly Planning" view to separate concerns.

#### Status Filtering

* Filter initiatives by status: "All", "Backlog", "Defined", "Committed", "In Progress", "Completed".
* The table defaults to showing all initiatives.

#### Adding & Editing Initiatives (Modal & Inline)

* Click "Add New Initiative" or an "Edit" button in a row to open a **modal dialog** for comprehensive editing.
* Key fields like Title, Owner, Target Due Date, and Themes are also **editable directly within the table** for quick adjustments.

### Yearly Planning

* Click **"Year Plan"** from the system overview page. This view consumes data from the central Roadmap/Backlog.

#### Planning Table

* Interactive table to manage and prioritize initiatives for a specific year.
* **Dynamic Year Selector:** The planning view is driven by a year selector, which is dynamically populated based on the `planningYear` attribute of your initiatives. This ensures you only plan for years that have defined work.
* **Columns:** Protected, Title, ID, Description, Total SDE Years (per initiative), Cumulative SDE Years (overall), Capacity Status, ATL/BTL, and a column for SDE Year estimate per team.
* **No "Add Initiative" Button:** All initiatives must now originate from the Roadmap/Backlog page to enforce a single source of truth.

#### Capacity Scenarios & Constraints Toggle

* **Capacity Scenarios:** Buttons at the top allow selecting the capacity scenario (Effective BIS, Team BIS, or Funded HC) used for the ATL/BTL cut-off and per-team cell coloring.
* **Apply Constraints & AI Gains (Net):** A checkbox that provides a powerful toggle between two planning realities: Gross capacity vs. Net (realistic) capacity after accounting for all sinks and AI gains.

#### Protected Initiatives

* Lock initiatives at the top of the plan; they cannot be dragged below non-protected items.

#### Drag & Drop Prioritization

* Reorder non-protected initiatives to change priority; table recalculates dynamically.

#### Enhanced Team Load Summary Table

* A collapsible, detailed table that provides a clear and transparent breakdown of each team's capacity for the selected scenario, explicitly showing Human vs. AI contributions, capacity sinks, and AI productivity gains.

### Strategic Dashboard

* Click **"Dashboard"** from the system overview page.
* Provides high-level strategic insights into your planning data.

#### Dashboard Carousel

* Navigate through different dashboard widgets using "Previous" and "Next" buttons.

#### Investment Distribution by Theme

* A doughnut chart and summary table showing the percentage of total SDE-Year investment allocated to each strategic theme.
* A global "Filter by Year" dropdown allows for analyzing a specific year or all years combined.

#### Investment Trend Over Time

* A 100% stacked bar chart that visualizes how theme-based investment percentages evolve year-over-year, making it easy to spot strategic shifts.

#### Roadmap by Quarter (Swimlane View)

* A theme-based swimlane view of the roadmap, with columns for Q1, Q2, Q3, and Q4.
* **Cascading Filters:** Filter the view by Organization (Senior Manager) and Team. The team filter is context-aware, updating its options based on the selected organization.
* **Contextual SDE Display:** The effort displayed on each initiative card is context-aware:
    * When filtered by organization, it shows the "Org Total" SDEs and provides a team-by-team breakdown.
    * When filtered by a team, it shows that team's specific effort relative to the total.
* **Interactive Cards:** Click on any initiative card to open the detailed "Edit Initiative" modal. Cards are also color-coded by their status.

### SDM Resource Forecasting Model

* Click **"Resource Forecasting"** from the system overview page.
* Models team headcount and effective SDE availability over 52 weeks.
* **Inputs:** Team selection, Avg Hiring Time, Ramp-up Time, Annual Attrition Rate, Target Week to Close Gap.
* **Capacity Integration:** Uses **Net Available Days per Week per SDE** (from "Tune Capacity Constraints") for the selected team, automatically factoring in configured leave, holidays, overhead, etc.
* **Outputs:** Monthly/Weekly resource tables, Forecast Chart (Effective Engineers, Total Ramped Up, Total Headcount, Attrition, Funded Size), Hiring Info.
* Includes an **FAQ & Model Insights** section.

### Tool Documentation (Home Page)

* The application's home page (when no system is loaded) features a collapsible section displaying this `README.md` file directly.
* This ensures users have easy access to up-to-date information about the tool's features, data model, and usage.

---

## 5. Basic Workflow Example

1.  **Load or Create a System.**
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
    * Use the carousel to switch between the "Investment Distribution", "Investment Trend", and "Roadmap by Quarter" widgets.
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

* **Save Regularly:** Use the "Save" buttons frequently, especially "Save All Changes" in Edit System and "Save All Capacity Configuration" in Capacity Tuning, and "Save Current Plan" in Year Plan.
* **Iterative Definition:** Start with high-level entities and gradually add detail.
* **Consistent Naming:** Use clear and consistent names for all entities.
* **Data Model First:** For new complex features, define the data model structure in `js/data.js` and update sample/default data before building the UI.
* **Leverage Tooltips:** Hover over labels, buttons, and column headers for explanations.
* **Use the Narrative:** The Capacity Tuning narrative provides a detailed story of your capacity calculations – use it to validate your inputs.
* **Roadmap vs. Year Plan:** Use the "Roadmap & Backlog" view for broader strategic planning and initiative definition. Use the "Year Plan" view for detailed engineering capacity allocation and commitment for a specific period.

---

## 7. Known Limitations (MVP)

* **Single User, Local Storage:** Data is saved in your browser's local storage. No backend server or multi-user collaboration.
* **Limited Import/Export:** General import/export for initiatives/plans to CSV/Excel is a future enhancement (though tables built with `EnhancedTableWidget` like Engineer List and Roadmap Table support export).
* **No True Skill Matching:** While skills are tracked for engineers, there's no automated matching to initiative requirements for resource suggestions.
* **UI for Advanced Planning Entities:** While the data model supports Goals, Themes, Project Managers, Work Packages, and Plan Archiving, dedicated UI views for managing all aspects of these (beyond basic linking in initiatives or adding PMs to a roster) are still under development or planned.
* **Manual Refresh for Some Cross-View Updates:** Some complex data interdependencies might occasionally require a manual refresh of a view (e.g., by navigating away and back) if a direct data-driven UI update isn't immediately implemented for all edge cases.

---

## 8. Future Enhancements (Backlog Highlights)

This tool is an evolving MVP. Key future enhancements include:

* **Detailed Planning Module:** UI for managing Goals (linking initiatives), Work Packages (phases, status, team assignments, dependencies), and task breakdowns.
* **Enhanced Yearly Planning UI:** Full UI support for editing all new initiative fields (ROI, due dates, personnel, etc.) directly in the planning table or a detail panel. UI for managing `archivedYearlyPlans`.
* **AI-Powered Enhancements:**
    * Conversational AI assistant for data querying and insights.
    * AI-assisted system modeling and plan optimization.
    * Analysis of team composition and hiring risks.
* **Data Access Layer Refactoring:** Complete the abstraction of data operations for easier future backend integration.
* **EnhancedTableWidget Rollout:** Apply the widget to more tables (e.g., Planning Table, Team Load Summary) for consistent filtering/export.
* **Collaboration & Cloud Sync:** For multi-user access and data persistence beyond local storage.