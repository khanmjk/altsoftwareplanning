---
trigger: always_on
---

### 10.3 Example Pattern

```javascript
// js/services/PlanningService.js
export function calculateTeamLoadSummary(teams, initiatives, scenario) {
    // Pure calculation logic
    return { rows: [...], totals: {...} };
}

export function getATLInitiatives(initiatives, teamCapacity) {
    // Returns initiatives above the line
    return initiatives.filter(i => i.cumulativeLoad <= teamCapacity);
}

// js/components/YearPlanningView.js
import { calculateTeamLoadSummary } from '../services/PlanningService.js';

class YearPlanningView {
    renderSummary() {
        const data = calculateTeamLoadSummary(teams, initiatives, this.scenario);
        this.buildSummaryTable(data); // DOM creation only
    }
}
```

### 10.4 Migration Benefits

| Layer | React Migration | Rails Backend |
|-------|-----------------|---------------|
| View | Becomes React component | Frontend-only |
| Service | Stays as-is or becomes React hook | Moves to Rails controller/service |
| Repository | Becomes API client | Becomes Rails model |

---

## 11. AI Integration Contract

### 11.1 CRITICAL: AI Integration Must Be Maintained

> [!CAUTION]
> When refactoring any view to the Workspace Canvas pattern, **AI integration MUST be preserved or enhanced**. 
> Breaking AI context access is a critical regression.

### 11.2 The `getAIContext()` Interface

Every class-based view **MUST** implement the `getAIContext()` method:

```javascript
class MyView {
    /**
     * Returns structured context data for AI Chat Panel integration
     * Implements the AI_VIEW_REGISTRY contract
     * @returns {Object} Context object with view-specific data
     */
    getAIContext() {
        return {
            viewTitle: 'My View',
            // View-specific state
            currentMode: this.currentMode,
            // Relevant data for AI analysis
            items: this.items?.map(i => ({ id: i.id, name: i.name })),
            itemCount: this.items?.length || 0
        };
    }
}
```

**Required fields**:
- `viewTitle` - Human-readable view name

**Recommended fields**:
- Current mode/tab/sub-view state
- Counts and summaries for quick AI analysis
- Filtered/mapped data (avoid sending raw large objects)

### 11.3 AI View Registry

All views are registered in `js/ai/aiViewRegistry.js`:

```javascript
const AI_VIEW_REGISTRY = {
    planningView: {
        getInstance: () => window.yearPlanningView,
        displayName: 'Year Plan',
        fallbackGlobals: ['currentPlanningYear', 'planningCapacityScenario']
    },
    // ... other views
};
```

**When creating a new view**:
1. Add entry to `AI_VIEW_REGISTRY` 
2. Set instance variable pattern: `window.[viewName]Instance`
3. Implement `getAIContext()` method

### 11.4 How AI Scraping Works

The `aiAgentController.scrapeCurrentViewContext()` function:

1. **First**: Checks `AI_VIEW_REGISTRY` for class instance with `getAIContext()`
2. **Fallback**: Uses legacy switch statement for non-class views

```javascript
// ai/aiAgentController.js
if (window.getAIContextForView && currentView) {
    const classContext = window.getAIContextForView(currentView);
    if (classContext && classContext.source === 'class') {
        contextData.data = classContext;  // Uses class method
        return JSON.stringify(contextData);
    }
}
// Falls back to legacy globals...
```

### 11.5 Compliance Checklist for AI

When refactoring a view, verify:

- [ ] Class implements `getAIContext()` method
- [ ] View instance registered on `window` (e.g., `window.myViewInstance`)
- [ ] Entry added to `AI_VIEW_REGISTRY` in `js/ai/aiViewRegistry.js`
- [ ] `getAIContext()` returns `viewTitle` + relevant state data
- [ ] Legacy global variables preserved until all dependencies migrated
- [ ] Tested: Open AI Chat, ask context-dependent question, verify response

### 11.6 AI Optimizer Integration

Views with AI optimization capabilities must:

1. **Expose optimization trigger**: `window.runOptimizer(options)`
2. **Accept result callback**: Update UI after optimization completes
3. **Preserve undo capability**: Store pre-optimization state

```javascript
// Example: Year Planning optimizer hook
window.runYearPlanOptimizer = async function(options) {
    const preState = JSON.parse(JSON.stringify(currentPlanData));
    const result = await AIOptimizerAgent.optimize(options);
    
    applyOptimizationResult(result);
    renderPlanningView();
    
    return { success: true, undoState: preState };
};
```


### 11.7 Views with AI Context Implemented

> **Last Audit**: 2025-12-14

| View | Class Instance | Status |
|------|----------------|--------|
| `planningView` | `YearPlanningView` | ✅ |
| `managementView` | `ManagementView` | ✅ |
| `capacityConfigView` | `CapacityConfigurationView` | ✅ |
| `capacityDashboardView` | `CapacityDashboardView` | ✅ |
| `visualizationCarousel` | `SystemOverviewView` | ✅ |
| `organogramView` | `OrgView` | ✅ |
| `roadmapView` | `RoadmapView` | ✅ |
| `dashboardView` | `DashboardView` | ✅ |
| `settingsView` | `SettingsView` | ✅ |
| `sdmForecastingView` | `ResourceForecastView` | ✅ |
| `systemsView` | `SystemsView` | ✅ |
| `ganttPlanningView` | `GanttPlanningView` | ✅ (line 1101) |
| `systemEditForm` | `SystemEditView` | ✅ |
| `capacityPlanningView` | `CapacityPlanningView` | ✅ |
| `welcomeView` | `WelcomeView` | ✅ Static |
| `helpView` | `HelpView` | ✅ Static |

**Total Views with AI Context: 17**

---

## 12. Theming & Design System Integrity

To ensure a seamless, premium experience across Light, Dark, and Seasonal themes, strict adherence to the **Semantic Variable System** is mandatory.

### 12.1 The Golden Rule: No Hardcoded Colors

> [!CRITICAL]
> **NEVER** use hardcoded hex values, RGB/RGBA, or named colors in CSS or JavaScript.
> *   ❌ `background-color: #ffffff;`
> *   ❌ `color: black;`
> *   ❌ `.style('fill', '#333')`
> 
> **ALWAYS** use the semantic theme variables defined in `css/settings/variables.css`.
> *   ✅ `background-color: var(--theme-bg-primary);`
> *   ✅ `color: var(--theme-text-primary);`
> *   ✅ `.style('fill', 'var(--theme-text-secondary)')`

### 12.2 Semantic Variable Usage Guide

**Backgrounds**:
- `var(--theme-bg-primary)`: Main page background (Canvas)
- `var(--theme-bg-secondary)`: Sidebar, headers, card backgrounds (if distinct)
- `var(--theme-bg-tertiary)`: Hover states, active items
- `var(--theme-card-bg)`: Explicit card container background

**Text**:
- `var(--theme-text-primary)`: Main headings, body text
- `var(--theme-text-secondary)`: Metadata, secondary labels
- `var(--theme-text-muted)`: Disabled text, subtle hints (placeholders)

**Borders**:
- `var(--theme-border-color)`: Standard borders
- `var(--theme-border-light)`: Subtle dividers

**Interactive**:
- `var(--theme-primary)`: Primary brand color (Actions, Active States)
- `var(--theme-primary-hover)`: Hover state for primary actions

### 12.3 JavaScript & Visualizations (D3/Canvas)

Dynamic visualizations must not break the theme.

1.  **CSS Classes First**: Whenever possible, apply a CSS class to SVG elements and style them in CSS using variables.
    ```javascript
    // GOOD
    node.append('circle').attr('class', 'node-circle');
    // CSS: .node-circle { fill: var(--theme-bg-secondary); }
    ```

2.  **Inline Styles with Variables**: If dynamic styling is required, inject the variable string.
    ```javascript
    // GOOD
    element.style('stroke', 'var(--theme-text-muted)');
    ```

3.  **Computed Styles**: If a raw hex value is absolutely needed (e.g., for Canvas API), read it from a dummy element or `getComputedStyle`.

### 12.4 Integrity Checks

Any PR or Refactor involving UI changes must pass the **"Midnight Test"**:
1.  Complete the work in Light Mode.
2.  Switch to Dark Mode using Settings.
3.  Verify:
    - No "white blocks" or jarring backgrounds.
    - All text is legible (no black text on dark background).
    - Borders are visible but not overpowering.
    - Tables do not have hardcoded white stripes.
