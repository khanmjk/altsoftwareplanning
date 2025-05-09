# Software Management & Planning Tool - MVP

**Welcome to the Software Management & Planning Tool!** This application is designed to help software engineering leaders and managers model, visualize, and plan their software systems, organizational structures, and yearly initiatives.

## Table of Contents

1.  [Purpose](#purpose)
2.  [Getting Started](#getting-started)
    *   [Loading a Saved System](#loading-a-saved-system)
    *   [Creating a New System](#creating-a-new-system)
    *   [Resetting to Defaults](#resetting-to-defaults)
3.  [Core Concepts & Data Model](#core-concepts--data-model)
    *   [System](#system)
    *   [Services & APIs](#services--apis)
    *   [Teams (2-Pizza Teams)](#teams-2-pizza-teams)
    *   [Engineers & Levels](#engineers--levels)
    *   [Away-Team Members](#away-team-members)
    *   [Managers (SDMs & Senior Managers)](#managers-sdms--senior-managers)
    *   [Platform Dependencies](#platform-dependencies)
    *   [Yearly Initiatives](#yearly-initiatives)
    *   [Capacity Configuration](#capacity-configuration)
4.  [Key Features](#key-features)
    *   [System Overview & Visualizations](#system-overview--visualizations)
        *   [Carousel Navigation](#carousel-navigation)
        *   [System Visualization](#system-visualization)
        *   [Team Relationships Visualization](#team-relationships-visualization)
        *   [Service Relationships Visualization](#service-relationships-visualization)
        *   [Service Dependency Visualization & Table](#service-dependency-visualization--table)
    *   [Editing System Data](#editing-system-data)
    *   [Organizational Views](#organizational-views)
        *   [Organization Chart (Org Chart)](#organization-chart-org-chart)
        *   [Team Breakdown Table](#team-breakdown-table)
        *   [Engineer Resource List](#engineer-resource-list)
    *   [Tune Capacity Constraints](#tune-capacity-constraints)
        *   [Global Configuration](#global-configuration)
        *   [Team-Specific Adjustments](#team-specific-adjustments)
        *   [Calculated Capacity Summary, Narrative & Waterfall Chart](#calculated-capacity-summary-narrative--waterfall-chart)
    *   [Yearly Planning](#yearly-planning)
        *   [Planning Table](#planning-table)
        *   [Capacity Scenarios (Effective BIS, Team BIS, Funded HC)](#capacity-scenarios-effective-bis-team-bis-funded-hc)
        *   [Applying Capacity Constraints (Net vs. Gross)](#applying-capacity-constraints-net-vs-gross)
        *   [Protected Initiatives](#protected-initiatives)
        *   [Drag & Drop Prioritization](#drag--drop-prioritization)
        *   [Adding New Initiatives](#adding-new-initiatives)
        *   [Team Load Summary Table](#team-load-summary-table)
    *   [SDM Resource Forecasting Model](#sdm-resource-forecasting-model)
5.  [Basic Workflow Example](#basic-workflow-example)
6.  [Tips & Best Practices](#tips--best-practices)
7.  [Known Limitations (MVP)](#known-limitations-mvp)
8.  [Future Enhancements (Backlog Highlights)](#future-enhancements-backlog-highlights)

---

## 1. Purpose

This tool provides a unified platform to:

*   **Model Software Architecture:** Define systems, services, APIs, and their dependencies.
*   **Map Organizational Structure:** Link teams to services, assign engineers, and represent management hierarchies.
*   **Visualize Relationships:** Understand how services connect, how teams are structured, and how they relate to the software they own.
*   **Plan Capacity & Resources:** Configure detailed capacity constraints (leave, overheads, etc.) to understand true team availability.
*   **Manage Yearly Roadmaps:** Create, prioritize, and estimate yearly initiatives against calculated team capacities.
*   **Forecast Team Growth:** Model SDE hiring, ramp-up, and attrition to predict resource availability.

The ultimate goal is to enable better-informed decision-making for software delivery, resource allocation, and strategic planning.

---

## 2. Getting Started

Upon launching the application, you'll see the main menu:

### Loading a Saved System

*   Click **"Load Saved System"**.
*   A dialog will appear listing all previously saved systems.
*   Click the "Load" button next to the system you wish to work with.
*   The application comes with pre-configured sample systems (`StreamView` and `ConnectPro`) to help you explore its features.

### Creating a New System

*   Click **"Create New System"**.
*   You will be taken to the "Edit System" page with a new, default system structure.
*   Fill in the "System Name" and "System Description".
*   Proceed to define your services, teams, managers, and other relevant data.
*   Remember to click **"Save All Changes"** at the bottom of the edit page.

### Resetting to Defaults

*   Click **"Reset to Defaults"**.
*   **Caution:** This action will erase ALL currently saved systems and restore the initial sample systems (`StreamView`, `ConnectPro`). This cannot be undone.
*   A confirmation prompt will appear before deletion.

---

## 3. Core Concepts & Data Model

Understanding these core entities is key to using the tool effectively:

### System

*   The highest-level entity, representing a collection of related software services (e.g., a product or platform).
*   Attributes: System Name, System Description.

### Services & APIs

*   **Services:** Logical components within a system that provide specific business functionalities (e.g., "User Management Service," "Payment Service").
    *   Attributes: Service Name, Description, Owning Team, APIs, Service Dependencies (other services it relies on), Platform Dependencies.
*   **APIs:** Public interfaces exposed by a service.
    *   Attributes: API Name, Description, Dependent APIs (other APIs it calls).

### Teams (2-Pizza Teams)

*   The agile software development teams responsible for building and maintaining services.
*   Attributes: Team ID (unique), Team Name (official name), Team Identity (codename/nickname), Description, SDM ID, PMT ID, Funded Headcount, Engineers (list of team members), Away-Team Members.

### Engineers & Levels

*   Individual software engineers within a team.
*   Attributes: Name, Level (L1-Junior to L5-Senior Principal).

### Away-Team Members

*   Engineers borrowed from other teams, business units, or organizations to supplement a team's capacity.
*   Attributes: Name, Level, Source Team/Organization.
*   These members contribute to a team's **Effective BIS (Builders In Seats)**.

### Managers (SDMs & Senior Managers)

*   **Software Development Manager (SDM):** Manages one or more 2-Pizza Teams.
    *   Attributes: SDM ID, SDM Name, Senior Manager ID (their direct manager).
*   **Senior Manager:** Manages one or more SDMs.
    *   Attributes: Senior Manager ID, Senior Manager Name.

### Platform Dependencies

*   External infrastructure, cloud services, or shared components that services rely on (e.g., "AWS S3," "Auth0," "Kafka").

### Yearly Initiatives

*   Projects, workstreams, or features planned for a year.
*   Attributes: Initiative ID, Title, Description, Related Business Goal ID, `isProtected` (boolean), Assignments (array of `{ teamId, sdeYears }`).

### Capacity Configuration

*   A detailed set of parameters to define and calculate net engineering capacity.
    *   **Global:** Working Days/Year, Standard Hours/Day, Public Holidays, Org-Wide Events, Standard Leave Type Defaults.
    *   **Per Team:** Leave Uptake % for standard leave, Variable Leave impact (e.g., Maternity), Team-Specific Activities, Recurring Overhead (e.g., average hours/week/SDE for meetings).

---

## 4. Key Features

### System Overview & Visualizations

Accessible after loading a system. Provides multiple views of your architecture and organization.

#### Carousel Navigation

*   Use the "< Previous" and "Next >" buttons to cycle through different visualizations. The title in the center indicates the current view.

#### System Visualization

*   Displays services (colored by owning team), their APIs, and their connections to platform dependencies.
*   Shows service-to-service dependencies and API-to-API dependencies.
*   Interactive: Zoom, pan, hover over nodes for tooltips.

#### Team Relationships Visualization

*   Shows teams as nodes, colored by their identity.
*   Links between teams indicate dependencies based on the services they own.
*   Hover for team details (SDM, PMT, services owned, etc.).

#### Service Relationships Visualization

*   Select a specific service from the dropdown (or "All Services View").
*   Visualizes the selected service, its direct dependencies (upstream services it relies on), and platform dependencies.
*   If a specific service is selected, it is highlighted.

#### Service Dependency Visualization & Table

*   Select a service from the dropdown.
*   Displays a force-directed graph showing the selected service and its direct upstream and downstream service dependencies, as well as platform dependencies.
*   Hover over nodes to see their connections highlighted.
*   The **Service Dependencies Table** (appears below the carousel when this visualization is active) provides a tabular view of all services, their owners, and their upstream/downstream/platform dependencies.

### Editing System Data

*   Click **"Edit System"** from the system overview page.
*   Modify:
    *   System Name and Description.
    *   **Services:** Add, delete, or edit services, their APIs, and their dependencies (service & platform).
    *   **Teams:** Add, delete, or edit teams, assign services, assign SDMs/PMTs, manage engineers, and manage away-team members.
    *   **SDMs & Senior Managers:** Add, delete, or edit managers and their reporting structure. (Implicitly managed through team and SDM assignments).
*   Use dual-list selectors for assigning services, SDMs, PMTs, engineers, and dependencies.
*   Click **"Save All Changes"** to persist all modifications. Click **"Cancel"** to discard changes and return to the system overview.

### Organizational Views

Accessible from the system overview page.

#### Organization Chart (Org Chart)

*   Click **"View Org Chart"**.
*   Displays an HTML-based hierarchical view of the organization: System Name -> Senior Managers -> SDMs -> Teams.
*   Team nodes show Funded HC vs. Builders In Seats (BIS) and annotations for away-team members.

#### Team Breakdown Table

*   Displayed below the Org Chart.
*   Provides a detailed tabular breakdown of each team, grouped by Senior Manager and SDM.
*   Columns include: Team Identity, Team Name, PMT, Team BIS, Funded HC, Effective BIS, Hiring Gap, Engineers (with levels), Away-Team Members (with level & source), and Services Owned.
*   Includes totals for key capacity metrics.

#### Engineer Resource List

*   Click **"View Engineers in Org"**.
*   Displays a sortable table of all engineers (including away-team members) in the system.
*   Columns: #, Engineer Name (with "(Away)" indicator), Level, Team Name, SDM Name, Senior Manager Name.
*   Click column headers to sort.
*   The table header summarizes total Funded HC, Team BIS, Away BIS, Effective BIS, and Hiring Gap for the entire organization.

### Tune Capacity Constraints

*   Click **"Tune Capacity Constraints"** from the system overview page.
*   This page allows you to define factors that reduce raw engineering capacity.

#### Global Configuration

*   **Standard Working Days Per Year:** Basis for SDE Year calculations.
*   **Public Holidays (Days/Year):** Global holidays impacting all teams.
*   **Organization-Wide Events:** Events like hackathons, all-hands (Name, Est. Days/SDE).
*   **Standard Leave Types:** Define default estimated days/SDE for types like Annual, Sick, Study.

#### Team-Specific Adjustments

*   Collapsible sections for each team.
*   **Standard Leave Uptake Estimate (%):** For each standard leave type, estimate the percentage of the global default days that this team's members typically take.
*   **Variable Leave Impact Estimate:** Input total team days lost for types like Maternity, Paternity, Medical, Family Responsibility (Number of SDEs affected * Avg. Days per SDE).
*   **Team Activities:** Define non-recurring team-specific events (e.g., training, conferences). Estimate impact either as "Days/SDE" or "Total Team Days".
*   **Recurring Overhead:** Estimate average hours per SDE per week spent on recurring meetings, admin, ceremonies, etc.

#### Calculated Capacity Summary, Narrative & Waterfall Chart

*   **Summary Table:** Dynamically updates to show, for the selected scenario (Effective BIS, Team BIS, Funded HC):
    *   Team Identity
    *   Headcount (for the scenario)
    *   Gross SDE Years
    *   (-) Total Deductions (SDE Years) - with tooltip for breakdown
    *   (=) Net Project SDE Years
*   **Narrative Section (Collapsible):** Provides a detailed written explanation of the capacity calculations, breaking down how gross capacity is reduced by various sinks at global and team levels.
*   **Waterfall Chart (Collapsible):** Visualizes the capacity reduction from Gross SDE Years to Net Project SDE Years for the selected team or the entire organization, showing the impact of each deduction category.
*   Click **"Save All Capacity Configuration"** to persist these settings.

### Yearly Planning

*   Click **"Manage Year Plan"** from the system overview page.

#### Planning Table

*   Interactive table to manage and prioritize yearly initiatives.
*   **Columns:** Protected, Title, ID, Description, Total SDE Years (per initiative), Cumulative SDE Years (overall), Capacity Status (vs. Team BIS & Funded HC), ATL/BTL (vs. selected scenario), and a column for SDE Year estimate per team.

#### Capacity Scenarios (Effective BIS, Team BIS, Funded HC)

*   Buttons at the top allow you to select the capacity scenario used to determine the Above-The-Line (ATL) / Below-The-Line (BTL) cut-off.
    *   **Effective BIS:** Team members + Away-team members.
    *   **Team BIS:** Only current team members.
    *   **Funded HC:** Budgeted headcount.

#### Applying Capacity Constraints (Net vs. Gross)

*   A checkbox **"Apply Capacity Constraints?"** allows you to switch the ATL/BTL calculation.
    *   **Unchecked (Default/Gross):** Uses the raw headcount from the selected scenario (Effective BIS, Team BIS, or Funded HC) as the capacity limit.
    *   **Checked (Net):** Uses the **Net Project SDE Years** (calculated from the "Tune Capacity Constraints" page for the selected scenario) as the capacity limit. This provides a more realistic view of deliverable capacity.
    *   *(Note: The toggle is disabled if capacity constraints haven't been configured and saved yet.)*

#### Protected Initiatives

*   Check the "Protected" box for an initiative to lock it at the top of the plan. Protected items cannot be dragged below non-protected items.

#### Drag & Drop Prioritization

*   Non-protected initiatives can be dragged and dropped to change their priority. The table recalculates cumulative totals and ATL/BTL status accordingly.

#### Adding New Initiatives

*   A collapsible section at the bottom allows adding new initiatives with a title, description, optional business goal ID, and SDE Year assignments per team.

#### Team Load Summary Table

*   A collapsible table above the main planning table.
*   Shows each team's: Funded HC, Team BIS, Away BIS, Effective BIS, **Assigned ATL SDEs** (sum of SDEs for that team from currently ATL initiatives), **Scenario Capacity Limit** (team's limit based on selected scenario & constraint toggle), Remaining Capacity, and an ATL Status (OK, Near Limit, Overloaded).
*   This helps quickly identify team-specific bottlenecks or surplus for the committed ATL work.

### SDM Resource Forecasting Model

*   Click **"SDM Resource Forecasting"** from the system overview page.
*   Allows Software Development Managers (SDMs) to model and forecast their team's headcount and effective SDE availability over a 52-week period.
*   **Inputs:**
    *   Select a Team (Funded Size and Current Engineers are auto-populated).
    *   Average Hiring Time (weeks).
    *   Ramp-up Time (weeks for new hires to become productive).
    *   Annual Attrition Rate (%).
    *   Target Week to Close Funding Gap.
*   **Capacity Integration:** The model uses the **Net Available Days per Week per SDE** calculated from the "Tune Capacity Constraints" page for the selected team. This means the forecast automatically factors in configured leave, holidays, overhead, etc., for that team.
*   **Outputs:**
    *   **Monthly Resource Summary Table:** Shows Headcount, SDE-Weeks, and SDE-Days available per month.
    *   **Weekly Resource Plan Table:** Shows effective engineers available each week.
    *   **Forecast Chart:** Visualizes:
        *   Effective Engineers (available for project work, adjusted by net available days).
        *   Total Ramped Up Engineers.
        *   Total Headcount.
        *   Cumulative Attrition.
        *   Funded Team Size (target line).
    *   **Hiring Info:** Provides an estimate of hires required.
*   **FAQ & Model Insights:** An extensive FAQ section explains the model's calculations, assumptions, limitations, and potential future improvements.

---

## 5. Basic Workflow Example

1.  **Load or Create a System:** Start by loading an existing system (e.g., `StreamView`) or creating a new one.
2.  **Define Core Data (Edit System):**
    *   Set the System Name and Description.
    *   Add/Define your **Teams**, assigning SDMs and PMTs. Add **Engineers** to these teams with their levels. Add any **Away-Team Members**.
    *   Add/Define **Services**, assign them to owning teams, and define their **APIs**.
    *   Establish **Service Dependencies** and **Platform Dependencies** for each service.
    *   Click **"Save All Changes"**.
3.  **Explore Visualizations (System Overview):**
    *   Use the carousel to view the System, Team, Service, and Dependency visualizations.
    *   View the Org Chart and Engineer List.
4.  **Tune Capacity Constraints:**
    *   Navigate to "Tune Capacity Constraints".
    *   Set global working days, holidays, and org events.
    *   For each team, configure leave uptake, variable leave impact, team activities, and recurring overhead.
    *   Review the calculated summary, narrative, and waterfall chart to understand net capacity.
    *   Click **"Save All Capacity Configuration"**.
5.  **Manage Yearly Plan:**
    *   Navigate to "Manage Year Plan".
    *   Add your initiatives with SDE Year estimates per team.
    *   Mark critical initiatives as "Protected".
    *   Drag and drop to prioritize.
    *   Select different "Capacity Scenarios" (Effective BIS, Team BIS, Funded HC) and toggle "Apply Capacity Constraints" to see how the ATL/BTL line shifts.
    *   Review the "Team Load Summary" to identify team-specific load.
    *   Click **"Save Current Plan Order & Estimates"**.
6.  **Forecast Resources (Optional):**
    *   Navigate to "SDM Resource Forecasting".
    *   Select a team and adjust hiring/ramp-up parameters to model their resource trajectory.

---

## 6. Tips & Best Practices

*   **Save Regularly:** Use the "Save" buttons frequently, especially after making significant changes in the Edit System, Capacity Constraints, or Planning views.
*   **Start Simple:** If creating a new system, start by defining a few key teams and services, then gradually add detail.
*   **Consistent Naming:** Use consistent and clear names for services, teams, and APIs.
*   **Iterate on Plans:** Yearly planning is an iterative process. Use the tool to explore different scenarios.
*   **Understand Capacity Sinks:** Pay close attention to the "Tune Capacity Constraints" page. Accurate inputs here are crucial for realistic planning.
*   **Use Tooltips:** Hover over labels and buttons for more information.

---

## 7. Known Limitations (MVP)

*   **Single User, Local Storage:** Data is saved in your browser's local storage. There is no backend server or multi-user collaboration.
*   **No Version Control for Plans:** Only the latest saved state of the plan is kept.
*   **Limited Import/Export:** Currently, no direct import/export to CSV/Excel (this is a future enhancement).
*   **Basic UI:** The user interface is functional for an MVP but does not yet have advanced styling or modern UX components.
*   **Skill Matching Not Modeled:** The tool does not currently track engineer skills or match them to initiative requirements for resource allocation.

---

## 8. Future Enhancements (Backlog Highlights)

This tool is an evolving MVP. Some planned future enhancements include:

*   **UX Improvements:** Modernizing the look and feel.
*   **Data Model Extensibility:** Making it easier to add new attributes.
*   **AI-Powered Engineers:** Modeling AI team members.
*   **Enhanced Yearly Planning:** ROI, due dates, quarterly views, versioning, export.
*   **Roadmap & Backlog Management Module:** A dedicated section for managing backlogs and roadmaps with themes and strategies.
*   **Detailed Planning Module:** Work packages, task dependencies, status tracking.
*   **AI-Powered Enhancements:** AI-assisted system creation, planning optimization, chatbots.
*   **Collaboration & Cloud Sync:** Moving beyond local storage for multi-user access.

---