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
        * [Team-Specific Adjustments](#team-specific-adjustments-1)
        * [Calculated Capacity Summary, Narrative & Waterfall Chart](#calculated-capacity-summary-narrative--waterfall-chart-1)
    * [Yearly Planning](#yearly-planning)
        * [Planning Table](#planning-table-1)
        * [Capacity Scenarios (Effective BIS, Team BIS, Funded HC)](#capacity-scenarios-effective-bis-team-bis-funded-hc-1)
        * [Applying Capacity Constraints (Net vs. Gross)](#applying-capacity-constraints-net-vs-gross-1)
        * [Protected Initiatives](#protected-initiatives-1)
        * [Drag & Drop Prioritization](#drag--drop-prioritization-1)
        * [Adding New Initiatives](#adding-new-initiatives-1)
        * [Team Load Summary Table](#team-load-summary-table-1)
    * [SDM Resource Forecasting Model](#sdm-resource-forecasting-model)
    * [Tool Documentation (Home Page)](#tool-documentation-home-page)
5.  [Basic Workflow Example](#basic-workflow-example)
6.  [Tips & Best Practices](#tips--best-practices)
7.  [Known Limitations (MVP)](#known-limitations-mvp)
8.  [Future Enhancements (Backlog Highlights)](#future-enhancements-backlog-highlights)

---

## 1. Purpose

This tool provides a unified platform to:

* **Model Software Architecture:** Define systems, services, APIs, and their dependencies.
* **Map Organizational Structure:** Link teams to services, assign engineers (including AI Software Engineers), and represent management hierarchies.
* **Visualize Relationships:** Understand how services connect, how teams are structured, and how they relate to the software they own.
* **Plan Capacity & Resources:** Configure detailed capacity constraints (leave, overheads, team activities, etc.) to understand true team availability (Net Project SDE Years).
* **Manage Yearly Roadmaps:** Create, prioritize, and estimate yearly initiatives (with ROI, status, themes) against calculated team capacities.
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
    * `assignments`: Array of `{ teamId, sdeYears }` objects detailing effort per team.
    * `roi`: An object detailing Return on Investment: `{ category, valueType, estimatedValue, currency, timeHorizonMonths, confidenceLevel, calculationMethodology, businessCaseLink, overrideJustification, attributes }`.
    * `targetDueDate` (string: "YYYY-MM-DD").
    * `status` (string: e.g., "Backlog", "Defined", "Committed", "In Progress", "Completed").
    * `themes` (array of strings/themeIds): Links to `definedThemes`.
    * `primaryGoalId` (string): Links to a `goal` in `currentSystemData.goals`.
    * `projectManager`, `owner`, `technicalPOC`: Objects like `{ type, id, name }` linking to personnel.
    * `impactedServiceIds` (array of strings).
    * `workPackageIds` (array of strings): Links to `workPackages`.
    * Extensible `attributes` object.

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
* This page allows defining factors that reduce raw engineering capacity.

#### Global Configuration

* **Standard Working Days Per Year:** Basis for SDE Year calculations.
* **Standard Hours Per Day:** Used for converting weekly overhead hours to days.
* **Public Holidays (Days/Year):** Global holidays impacting all teams.
* **Organization-Wide Events:** Events like hackathons (Name, Est. Days/SDE).
* **Standard Leave Types:** Define default estimated days/SDE for types like Annual, Sick, Study, In-Lieu.

#### Team-Specific Adjustments

* Collapsible sections for each team.
* **Standard Leave Uptake Estimate (%):** Percentage of global default days this team's members typically take for each standard leave type.
* **Variable Leave Impact Estimate:** Input total team days lost for types like Maternity, Paternity, Medical, Family Responsibility (Number of SDEs affected * Avg. Days per SDE).
* **Team Activities:** Define non-recurring team-specific events (e.g., training, conferences). Estimate impact either as "Days/SDE" or "Total Team Days".
* **Recurring Overhead:** Estimate average hours per SDE per week spent on recurring meetings, admin, ceremonies, etc. (e.g., `avgOverheadHoursPerWeekPerSDE`).

#### Calculated Capacity Summary, Narrative & Waterfall Chart

* **Summary Table:** Dynamically updates to show, for the selected scenario (Effective BIS, Team BIS, Funded HC): Team Identity, Headcount (for the scenario), Gross SDE Years, (-) Total Deductions (SDE Years - with tooltip for breakdown of sinks like leave, holidays, activities, overhead), and (=) Net Project SDE Years. Displays warnings if net capacity is zero or negative.
* **Narrative Section (Collapsible):** Provides a detailed written explanation of capacity calculations, breaking down how gross capacity is reduced by various sinks at global and team levels, including explicit calculation parameters and reconciliation of deductions.
* **Waterfall Chart (Collapsible):** Visualizes the capacity reduction from Gross SDE Years to Net Project SDE Years for the selected team or the entire organization, showing the impact of each deduction category (Holidays, Org Events, Std Leave, Var Leave, Activities, Overhead).
* Click **"Save All Capacity Configuration"** to persist settings and calculated metrics.

### Yearly Planning

* Click **"Year Plan"** from the system overview page.

#### Planning Table

* Interactive table to manage and prioritize yearly initiatives.
* **Columns:** Protected, Title, ID, Description, Total SDE Years (per initiative), Cumulative SDE Years (overall), Capacity Status (vs. Team BIS & Funded HC), ATL/BTL (vs. selected scenario), and a column for SDE Year estimate per team (cells colored Green/Red based on team's capacity for the selected scenario).
    *(Future columns based on data model: ROI, Target Due Date, Delivery Quarter, Status, Themes, Primary Goal, Owner, Project Manager)*

#### Capacity Scenarios (Effective BIS, Team BIS, Funded HC)

* Buttons at the top allow selecting the capacity scenario (Effective BIS, Team BIS, or Funded HC) used for the ATL/BTL cut-off and per-team cell coloring.

#### Applying Capacity Constraints (Net vs. Gross)

* A checkbox **"Apply Capacity Constraints?"** switches the ATL/BTL calculation and per-team cell coloring:
    * **Unchecked (Gross):** Uses raw headcount from the selected scenario.
    * **Checked (Net):** Uses **Net Project SDE Years** (from "Tune Capacity Constraints" for the selected scenario).
    * *(Disabled if capacity constraints haven't been saved with `calculatedCapacityMetrics`)*.

#### Protected Initiatives

* Lock initiatives at the top of the plan; they cannot be dragged below non-protected items.

#### Drag & Drop Prioritization

* Reorder non-protected initiatives to change priority; table recalculates dynamically.

#### Adding New Initiatives

* Collapsible section to add initiatives with title, description, optional goal ID, and SDE Year assignments.
    *(Future: inputs for ROI, due date, status, themes, owner, PM)*

#### Team Load Summary Table

* A collapsible table above the main planning table.
* Shows each team's: Funded HC, Team BIS, Away BIS, Effective BIS, **Assigned ATL SDEs** (sum of SDEs for that team from currently ATL initiatives), **Scenario Capacity Limit** (team's limit based on selected scenario & constraint toggle), Remaining Capacity (ATL), ATL Status.

### SDM Resource Forecasting Model

* Click **"Resource Forecasting"** from the system overview page.
* Models team headcount and effective SDE availability over 52 weeks.
* **Inputs:** Team selection (auto-populates Funded Size, Current Engineers), Avg Hiring Time, Ramp-up Time, Annual Attrition Rate, Target Week to Close Gap.
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
4.  **Tune Capacity Constraints:**
    * Navigate to "Capacity Tuning".
    * Set global working days, holidays, org events, and default leave days.
    * For each team, configure leave uptake %, variable leave impact, team activities, and recurring overhead.
    * Review the summary, narrative, and waterfall chart.
    * **Save All Capacity Configuration**.
5.  **Manage Yearly Plan:**
    * Navigate to "Year Plan".
    * Add initiatives with SDE estimates, linking to goals, themes, assigning owners/PMs, and setting ROI, due dates, and status.
    * Mark critical initiatives as "Protected". Drag and drop to prioritize.
    * Use "Capacity Scenarios" and the "Apply Capacity Constraints?" toggle to analyze.
    * Review "Team Load Summary".
    * **Save Current Plan Order & Estimates**.
6.  **Forecast Resources (Optional):** Navigate to "Resource Forecasting" for team-specific hiring and availability modeling.

---

## 6. Tips & Best Practices

* **Save Regularly:** Use the "Save" buttons frequently.
* **Iterative Definition:** Start with high-level entities (Systems, Teams, major Services) and gradually add detail (APIs, dependencies, new personnel, detailed initiative attributes).
* **Consistent Naming:** Use clear and consistent names for all entities.
* **Data Model First:** For new complex features (like detailed work packages), define the data model structure in `js/data.js` and update sample/default data before building the UI.
* **Leverage Tooltips:** Hover over labels, buttons, and column headers for explanations.
* **Use the Narrative:** The Capacity Tuning narrative provides a detailed story of your capacity calculations – use it to validate your inputs.

---

## 7. Known Limitations (MVP)

* **Single User, Local Storage:** Data is saved in your browser's local storage. No backend server or multi-user collaboration.
* **Limited Import/Export:** Initiative/Plan import/export to CSV/Excel is a future enhancement. (The Engineer List table *does* support export via the EnhancedTableWidget).
* **No True Skill Matching:** While skills are tracked for engineers, there's no automated matching to initiative requirements for resource suggestions.
* **UI for Advanced Planning Entities:** While the data model supports Goals, Themes, Project Managers, Work Packages, and Plan Archiving, dedicated UI views for managing all aspects of these (beyond basic linking in initiatives or adding PMs to a roster) are still under development or planned.
* **Manual Refresh for Some Cross-View Updates:** Some complex data interdependencies might occasionally require a manual refresh of a view (e.g., by navigating away and back) if a direct data-driven UI update isn't immediately implemented for all edge cases.

---

## 8. Future Enhancements (Backlog Highlights)

This tool is an evolving MVP. Key future enhancements include:

* **Full Roadmap & Backlog Management Module:** Dedicated UI for managing initiatives by status, themes, goals; generating multi-year roadmap views; import capabilities.
* **Detailed Planning Module:** UI for managing Goals (linking initiatives), Work Packages (phases, status, team assignments, dependencies), and task breakdowns.
* **Enhanced Yearly Planning UI:** Full UI support for editing all new initiative fields (ROI, due dates, personnel, etc.) directly in the planning table or a detail panel. UI for managing `archivedYearlyPlans`.
* **AI-Powered Enhancements:**
    * Conversational AI assistant for data querying and insights.
    * AI-assisted system modeling and plan optimization.
    * Analysis of team composition and hiring risks.
* **Data Access Layer Refactoring:** Complete the abstraction of data operations for easier future backend integration.
* **EnhancedTableWidget Rollout:** Apply the widget to more tables (e.g., Planning Table, Team Load Summary) for consistent filtering/export.
* **Collaboration & Cloud Sync:** For multi-user access and data persistence beyond local storage.

---