# Coding Agent Contract for SMT Platform

> **Version**: 1.2  
> **Last Updated**: 2025-12-23  
> **Purpose**: System instructions for AI coding agents working on this codebase

---

## 1. Core Principles

This document establishes mandatory rules for any coding agent (AI or human) modifying the SMT Platform codebase. All changes must comply with these rules to maintain code health and portability.

> [!CAUTION]
> Non-compliance with these rules introduces technical debt and may cause regressions. Always validate your changes against this contract before committing.

---

## 2. Mandatory Rules

### 2.1 No Defensive Coding for Internal Code

**Rule**: Do NOT use type checks or existence guards for functions/classes defined within this repository.

❌ **Prohibited patterns** (for internal code):
```javascript
// BAD - querying internal codebase functions
if (typeof getWorkingDaysPerYear === 'function') { ... }
if (window.ganttAdapter && typeof window.ganttAdapter.buildTasks === 'function') { ... }
if (typeof FeatureFlags !== 'undefined' && typeof FeatureFlags.getRenderer === 'function') { ... }
```

✅ **Correct pattern** (assume internal code exists):
```javascript
// GOOD - trust internal codebase structure
const workingDays = getWorkingDaysPerYear();
const tasks = ganttAdapter.buildTasks(initiatives);
const renderer = FeatureFlags.getRenderer();
```

**Exceptions allowed**:
- Third-party library checks (e.g., `if (typeof luxon !== 'undefined')`)
- ES Module compatibility: `if (typeof module !== 'undefined' && module.exports)`
- External API callbacks passed via options objects

---

### 2.2 No Window Global Scope Access (Except main.js)

**Rule**: Only `main.js` may assign or check `window.*` globals. All other files must access singletons directly.

❌ **Prohibited in non-main.js files**:
```javascript
// BAD - assigning to window global
window.myService = MyService;
window.myViewInstance = new MyView();

// BAD - checking window globals
if (window.yearPlanningView) { window.yearPlanningView.render(); }
if (window.workspaceComponent) { ... }
```

✅ **Correct patterns**:
```javascript
// GOOD - direct access (singletons are initialized in main.js)
workspaceComponent.setPageMetadata({ ... });
yearPlanningView.render();

// GOOD - singleton getter pattern for self-reference
class OrgView {
    static getInstance() {
        if (!OrgView._instance) {
            OrgView._instance = new OrgView();
        }
        return OrgView._instance;
    }
}
```

**main.js is the ONLY place** that should contain:
```javascript
// main.js - OK to use window.* here
const workspaceShell = new WorkspaceShellComponent('app-root');
workspaceShell.render();

window.navigationManager = new NavigationManager();
window.headerComponent = new HeaderComponent('workspace-header');
window.sidebarComponent = new SidebarComponent('sidebar', window.navigationManager);
window.workspaceComponent = new WorkspaceComponent('main-content-area');
```

**Clarification**: This rule targets app-specific globals. Standard browser API usage is allowed in any file (e.g., `window.addEventListener`, `window.location`, `window.history`, `window.open`, `window.getComputedStyle`).

---

### 2.3 No Service Layer Duplication

**Rule**: Each domain concern must have ONE service. If you need functionality that overlaps, extend the existing service.

| Domain | Service | Location |
|--------|---------|----------|
| System lifecycle | `SystemService` | `js/services/SystemService.js` |
| Organization | `OrgService` | `js/services/OrgService.js` |
| Initiatives | `InitiativeService` | `js/services/InitiativeService.js` |
| Work Packages | `WorkPackageService` | `js/services/WorkPackageService.js` |
| Planning calculations | `PlanningService` | `js/services/PlanningService.js` |
| Capacity math | `CapacityService` | `js/services/CapacityService.js` |
| AI operations | `AIService` | `js/services/AIService.js` |
| Settings | `SettingsService` | `js/services/SettingsService.js` |

Before creating a new service, check if the functionality belongs in an existing one.

---

### 2.4 Singleton Service Pattern

**Rule**: All service layer classes must be instantiated as singletons, accessible to any source file.

```javascript
// Service pattern - object literal singleton (current pattern)
const MyService = {
    doSomething() { ... },
    doSomethingElse() { ... }
};

// View/Page calling service directly
class MyView {
    handleClick() {
        MyService.doSomething();  // Direct call, no instantiation
    }
}
```

---

### 2.5 No Cross-View Updates

**Rule**: A view/page must NOT directly update another page's display, unless they share the same display area (e.g., widgets within a view).

❌ **Prohibited**:
```javascript
// BAD - one view updating another
class SettingsView {
    saveSettings() {
        // ...save logic...
        window.dashboardView.refresh();  // NO! Don't refresh other pages
        window.orgViewInstance.render(); // NO!
    }
}
```

✅ **Correct patterns**:
```javascript
// GOOD - let navigation trigger re-render
class SettingsView {
    saveSettings() {
        SettingsService.save();
        // Views will re-render when navigated to
    }
}

// GOOD - update shared shell components (header, sidebar)
class SettingsView {
    saveSettings() {
        SettingsService.save();
        headerComponent.updateAiButtonVisibility(); // OK - shared shell
    }
}

// GOOD - update widgets within the same view
class DashboardView {
    switchWidget() {
        this.chartWidget.render(newData);  // OK - same view
    }
}
```

---

### 2.6 No Inline HTML in JavaScript

**Rule**: Do NOT use template literals with `innerHTML` for generating HTML. Use DOM creation APIs instead.
TemplateLoader and HTML template files are no longer allowed for view markup.

❌ **Prohibited**:
```javascript
// BAD - inline HTML templates
container.innerHTML = `
    <div class="my-component">
        <h2>${title}</h2>
        <button onclick="handleClick()">Click</button>
    </div>
`;
```

✅ **Correct pattern**:
```javascript
// GOOD - DOM creation
const wrapper = document.createElement('div');
wrapper.className = 'my-component';

const heading = document.createElement('h2');
heading.textContent = title;
wrapper.appendChild(heading);

const button = document.createElement('button');
button.textContent = 'Click';
button.addEventListener('click', handleClick);
wrapper.appendChild(button);

container.appendChild(wrapper);
```

**Exceptions**:
- `main.js` template fallbacks for file:// protocol compatibility

---

### 2.7 View/Model/Control Separation

**Rule**: All features must respect the architecture defined in `docs/workspace-canvas-contract.md`.

| Layer | Location | Responsibility |
|-------|----------|---------------|
| View | `js/components/` | DOM creation, event binding, user interaction |
| Service | `js/services/` | Business logic, calculations, pure functions |
| Repository | `js/repositories/` | Data persistence, localStorage, API calls |

Services must:
- Export pure functions (no DOM access)
- Accept data as parameters, return transformed data
- Be testable in isolation

**Exceptions (approved DOM access in services)**:
- `ThemeService` (theme application to document root)
- `AIService` (chat panel integration hooks)
- `AboutService` (JSONP and HTML decoding helpers)
- `MermaidService` (render error UI for external library)

If another service needs DOM access, add it to this allowlist with a brief justification.

Views must:
- Implement `getAIContext()` method for AI integration
- Use `workspaceComponent.setPageMetadata()` for headers
- Apply `.workspace-view` class to main container

---

### 2.8 Minimize Global Variables

**Rule**: Avoid module-level mutable state. Encapsulate state within class instances.

❌ **Prohibited**:
```javascript
// BAD - module-level mutable state
let currentYear = new Date().getFullYear();
let planningScenario = 'effective';
let draggedItemId = null;

function handleDrag(event) {
    draggedItemId = event.target.id;  // Modifying global
}
```

✅ **Correct pattern**:
```javascript
// GOOD - state encapsulated in class
class YearPlanningView {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.planningScenario = 'effective';
        this.draggedItemId = null;
    }
    
    handleDrag(event) {
        this.draggedItemId = event.target.id;
    }
}
```

**Allowed globals** (in main.js only):
- Singleton component instances: `workspaceComponent`, `headerComponent`, `sidebarComponent`
- Singleton managers: `navigationManager`
- Template fallbacks: `TEMPLATE_FALLBACKS`

---

### 2.9 AI Integration is Mandatory

**Rule**: Every page/view MUST implement AI integration. This is not optional.

Every class-based view must:
1. Implement `getAIContext()` method
2. Be registered in `js/ai/aiViewRegistry.js`
3. Return meaningful context for AI analysis

```javascript
class MyView {
    getAIContext() {
        return {
            viewTitle: 'My View',
            currentMode: this.currentMode,
            itemCount: this.items?.length || 0,
            // Add relevant context for AI understanding
        };
    }
}
```

> [!IMPORTANT]
> Do NOT use duck-typing checks like `typeof instance.getAIContext === 'function'`. Assume all views implement the interface. If a view doesn't, that's a bug to be fixed.

---

### 2.10 Portability First

**Rule**: Write code that can be easily migrated to other frameworks (React, Next.js, Rails).

- Keep business logic in services (framework-agnostic)
- Avoid tight coupling to specific DOM APIs where possible
- Use dependency injection patterns
- Document any browser-specific APIs used

---

## 3. Compliance Checklist

Before submitting any code change, verify:

### Architecture
- [ ] Business logic is in a Service, not in the View
- [ ] No new services duplicating existing service responsibilities
- [ ] View implements `getAIContext()` method

### Code Patterns
- [ ] No defensive coding for internal functions
- [ ] No `window.*` assignments (unless in main.js)
- [ ] No inline HTML templates
- [ ] No HTML template files or TemplateLoader usage
- [ ] No cross-view updates
- [ ] Module-level state encapsulated in class
- [ ] CSS uses theme variables (see theming rule below)

### Theming Compliance

**Rule**: CSS colors MUST use theme variables. Standalone hardcoded colors are violations.

✅ **Compliant patterns** (NOT violations):
```css
/* Using theme variable with hardcoded fallback - GOOD */
color: var(--theme-text-primary, #212529);
background: var(--theme-success, #28a745);

/* Using color-mix with theme variable - GOOD */
background: color-mix(in srgb, var(--theme-info), transparent 85%);
```

❌ **Violations** (must fix):
```css
/* Standalone hardcoded color - BAD */
color: #777;
background-color: #e3f2fd;
border-left-color: #0052cc;
```

**Excluded from audits** (acceptable):
- `ThemeService.js` - Theme definition constants
- `MermaidService.js` - Library configuration colors
- `variables.css` - CSS variable definitions

### Workspace Integration
- [ ] `WorkspaceShellComponent` renders the layout before UI components initialize
- [ ] Uses `workspaceComponent.setPageMetadata()` for headers
- [ ] Uses `workspaceComponent.setToolbar()` for controls
- [ ] Registered in `NavigationManager` if new view

---

## 4. Reference Files

| Document | Purpose |
|----------|---------|
| [workspace-canvas-contract.md](file:///Users/khanmjk/Documents/GitHub/altsoftwareplanning/docs/workspace-canvas-contract.md) | UI/UX architecture rules |
| [main.js](file:///Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/main.js) | Application entry point (global assignments OK here) |
| [OrgView.js](file:///Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/components/OrgView.js) | Reference: Good DOM creation patterns |
| [PlanningService.js](file:///Users/khanmjk/Documents/GitHub/altsoftwareplanning/js/services/PlanningService.js) | Reference: Pure service layer |

---

## 5. Current Violations to Fix

> [!WARNING]
> The following files have known violations and are scheduled for refactoring.
> **Last Audit**: 2025-12-15

| File | Issue | Priority | Notes |
|------|-------|----------|-------|
| `DashboardView.js` | Inline HTML (container clearing) | Low | Mostly uses `innerHTML = ''` for clearing |
| `enhancedTableWidget.js` | Defensive options callbacks | Low | Checks if options callbacks are functions (acceptable for external API) |

### Recently Resolved (since last audit)

| File | Previous Issue | Resolution |
|------|----------------|------------|
| `yearPlanning.js` | Module-level globals (lines 5-16), inline HTML | ✅ **DELETED** - All functionality migrated to `YearPlanningView.js` class |
| `YearPlanningView.js` | Legacy compatibility layer, inline styles | ✅ Full refactor: added 7 handler methods, uses service commands, removed globals |
| `aiPlanOptimizationAgent.js` | `window.renderPlanningView`, `window.currentYearPlanTableData` | ✅ Uses `navigationManager.getViewInstance('planningView')` |
| `aiAgentController.js` | `currentPlanningYear` global in fallback | ✅ Uses class instance via `navigationManager` |
| `AIService.js` | Direct `renderPlanningView()` call | ✅ Dispatches `settings:changed` event instead |
| `aiViewRegistry.js` | Fallback globals for planningView | ✅ Removed - all state in viewInstance |
| `visualizations.js` | window.* assignments | ✅ Refactored to 12-line init file |
| `ganttPlanning.js` | Inline HTML templates | ✅ Refactored to `GanttPlanningView.js` class |
| `GanttPlanningView.js` | Module-level globals | ✅ Removed globals, uses viewInstance DI |
| `GanttTableController.js` | Defensive function checks | ✅ Uses viewInstance property |
| `WorkspaceComponent.js` | Inline HTML templates | ✅ Refactored to DOM APIs |
| `RoadmapComponent.js` | Inline HTML templates | ✅ Refactored to DOM APIs with _createRoadmapCard helper |
| `GanttPlanningView.js` | Defensive typeof ganttAdapter/ToastComponent | ✅ Removed 3 checks |
| `InitiativeRow.js` | Defensive typeof GanttService checks | ✅ Removed 3 checks, calls service directly |
| `WorkPackageRow.js` | Defensive typeof GanttService checks | ✅ Removed 4 checks |
| `AssignmentRow.js` | Defensive typeof SystemService check | ✅ Removed 1 check |
| `CapacityService.js` | Defensive typeof OrgService checks | ✅ Removed 2 checks |
| `InitiativeService.js` | Defensive typeof GoalService check | ✅ Removed 1 check |
| `GanttTableModel.js` | Defensive typeof GanttService check | ✅ Removed 1 check |
| `AppState.js` | Defensive typeof checks for SystemService/components | ✅ Removed 3 checks |
| `ForecastingEngine.js` | Defensive typeof CapacityService check | ✅ Removed 1 check |

### Theming Violations (CSS/JS hardcoded colors)

> [!NOTE]
> CSS view files have been converted to use theme variables with fallbacks.

**Resolved CSS Files**:
- ✅ `css/views/roadmap-view.css` - Converted 15 hardcoded colors (pills, status indicators)
- ✅ `css/views/goals-view.css` - Converted 4 colors (progress bar, theme pill)
- ✅ `css/views/dashboard-view.css` - Converted 2 colors (button/table text)
- ✅ `css/views/roadmap-table-view.css` - Converted 1 color (empty state)
- ✅ `css/views/accomplishments-view.css` - Converted 1 color (empty state)

**Remaining (Acceptable)**:
- `js/services/MermaidService.js` - Theme fallback colors (acceptable)
- `js/services/ThemeService.js` - Theme definition constants (acceptable)
- `css/foundation-components/buttons.css` - Uses proper var() fallbacks

---

**Owner**: SMT Platform Engineering Team  
**Enforcement**: All pull requests must pass this contract checklist
