# Coding Agent Contract for SMT Platform

> **Version**: 1.0  
> **Last Updated**: 2025-12-07  
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
window.navigationManager = new NavigationManager();
window.headerComponent = new HeaderComponent('main-header');
window.workspaceComponent = new WorkspaceComponent('main-content-area');
```

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
- HTML template files loaded via `fetch()` (e.g., `html/components/*.html`)

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
- [ ] No cross-view updates
- [ ] Module-level state encapsulated in class

### Workspace Integration
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

| File | Issue | Priority |
|------|-------|----------|
| `yearPlanning.js` | Module-level globals, inline HTML | High |
| `visualizations.js` | window.* assignments | High |
| `ganttPlanning.js` | Inline HTML templates | Medium |
| `aiViewRegistry.js` | Defensive duck-typing | Medium |
| `ganttAdapter.js` | Defensive function checks | Low |

---

**Owner**: SMT Platform Engineering Team  
**Enforcement**: All pull requests must pass this contract checklist
