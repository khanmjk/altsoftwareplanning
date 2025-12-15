---
trigger: always_on
---

# Workspace Canvas Contract part 1

## Purpose

This document defines the architectural contract that all pages/views in the SMT Platform must follow to maintain a cohesive, enterprise-grade workspace experience. Following these rules ensures every page feels integrated and immersive—part of the workspace canvas, not a separate applet.

---

## 1. Canvas Structure Rules

### 1.1 Canvas Layers

Every view operates within the **Workspace Shell**, which consists of three layers:

```
┌─────────────────────────────────────────────┐
│  Canvas Header (Global)                     │  ← Page title, breadcrumbs, actions
├─────────────────────────────────────────────┤
│  Canvas Toolbar (Optional, Sticky)          │  ← Submenus, filters, view controls
├─────────────────────────────────────────────┤
│                                             │
│  Canvas Content (The View)                  │  ← Main page content
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**Defined in**: `css/layout/workspace-shell.css`

### 1.2 Component Responsibilities

#### WorkspaceComponent (`js/components/WorkspaceComponent.js`)

**Responsibilities**:
- Manages the main content area (`#main-content-area`)
- Creates/shows/hides view containers
- Provides APIs for setting page metadata and toolbar content

**APIs**:
```javascript
// Set page title, breadcrumbs, and header actions
workspaceComponent.setPageMetadata({
    title: 'Page Title',
    breadcrumbs: ['Section', 'Page'],
    actions: [{label: 'Action', icon: 'fas fa-icon', onClick: fn}]
});

// Set toolbar content
workspaceComponent.setToolbar(htmlStringOrElement);

// Render a view
workspaceComponent.render(viewId, renderCallback);
```

#### Views

**Must**:
- Accept a container element in render function
- Use `workspaceComponent.setPageMetadata()` to set header
- Use `workspaceComponent.setToolbar()` for sticky controls
- Apply `.workspace-view` class to main container
- Use view-specific CSS files (no inline styles)

**Must Not**:
- Generate inline HTML strings in JavaScript (use DOM creation or templates)
- Apply inline styles (use CSS classes)
- Bypass workspace shell (no full-page takeovers)

---

## 2. Navigation Patterns

### 2.1 Multi-View Pages

Pages with multiple sub-views (e.g., System Overview with 7 visualizations) **must**:

1. **Use Pill Navigation** in the toolbar
   - Use `PillNavigationComponent` class
   - Display horizontal pill button menu
   - Highlight active pill
   
2. **Render All Views as Siblings**
   - Create all view containers in the DOM
   - Toggle visibility with `.active` class or `display: block/none`
   - Do NOT use carousel prev/next buttons
   
3. **Example Pattern**:
   ```javascript
   class MyMultiView {
       constructor(containerId) {
           this.pillNav = new PillNavigationComponent({
               items: [{id: 'view1', label: 'View 1'}, ...],
               onSwitch: (viewId) => this.switchView(viewId)
           });
       }
       
       render() {
           workspaceComponent.setPageMetadata({...});
           workspaceComponent.setToolbar(this.pillNav.render());
           this.renderViewStructure();
           this.switchView('view1');
       }
       
       switchView(viewId) {
           // Hide all, show one
           this.views.forEach(v => v.style.display = 'none');
           document.getElementById(viewId).style.display = 'block';
           this.pillNav.setActive(viewId);
       }
   }
   ```

### 2.2 Single-View Pages

Pages with one primary view **should**:
- Use toolbar for filters, controls, or actions
- Avoid unnecessary navigation chrome

---

## 3. CSS Organization

### 3.1 File Structure

```
css/
├── layout/
│   ├── workspace-shell.css       # Canvas layers (.canvas-header, .canvas-toolbar, .canvas-content)
│   └── main-layout.css            # Page-level layout
├── components/
│   ├── pill-navigation.css        # Pill navigation styles
│   └── [component-name].css       # Other reusable components
└── views/
    └── [view-name]-view.css       # View-specific styles
```

### 3.2 Naming Conventions

**View-specific styles**:
- Use BEM naming: `.view-name__element--modifier`
- Scope to view: prefix with view name

**Shared components**:
- Use component name prefix (e.g., `.pill-nav__item`)

**No**:
- Inline styles in JavaScript
- Generic class names (`.button`, `.container`)
- !important overrides (except for critical utility classes)

### 3.3 View Container Classes

Every view's main container should use:
```html
<div class="workspace-view [view-specific-class]">
    <!-- View content -->
</div>
```

**Standard classes**:
- `.workspace-view` - Base view padding and layout
- `.workspace-card` - Standard content card with border/shadow
- `.workspace-empty-state` - Empty state placeholder

---

## 4. Scrolling Behavior

### 4.1 Default Scrolling

The `.canvas-content` layer handles scrolling by default:
```css
.canvas-content {
    flex-grow: 1;
    overflow-y: auto;
    /* Main canvas scroll */
}
```

### 4.2 View-Specific Scrolling

If a view needs internal scrolling (e.g., a table within a view):
1. Set the view container to `height: 100%`
2. Create scrollable child container
3. Example:
   ```html
   <div class="workspace-view" style="height: 100%;">
       <div class="scrollable-content" style="height: 100%; overflow-y: auto;">
           <!-- Scrollable content -->
       </div>
   </div>
   ```

### 4.3 Toolbar Behavior

The `.canvas-toolbar` is **sticky** and remains visible during scroll:
```css
.canvas-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
}
```

---

## 5. Class-Based View Pattern

### 5.1 Recommended Structure

```javascript
class MyView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        // Initialize state
    }
    
    render() {
        // 1. Set workspace metadata
        workspaceComponent.setPageMetadata({...});
        
        // 2. Set toolbar (if needed)
        workspaceComponent.setToolbar(...);
        
        // 3. Render view content
        this.renderContent();
    }
    
    renderContent() {
        // DOM creation, no inline HTML
        const wrapper = document.createElement('div');
        wrapper.className = 'workspace-view my-view';
        // ... build DOM
        this.container.appendChild(wrapper);
    }
    
    destroy() {
        // Cleanup
    }
}
```

### 5.2 Registration with NavigationManager

Add view mapping in `NavigationManager.navigateTo()`:
```javascript
else if (viewId === 'myView') {
    window.workspaceComponent.render(viewId, (container) => {
        if (!window.myViewInstance) {
            window.myViewInstance = new MyView(container.id);
        } else {
            window.myViewInstance.container = container;
        }
        window.myViewInstance.render();
    });
}
```

---

## 6. Anti-Patterns to Avoid

❌ **Inline HTML Generation**
```javascript
// BAD
container.innerHTML = `<div class="view">...</div>`;
```

✅ **DOM Creation or Templates**
```javascript
// GOOD
const view = document.createElement('div');
view.className = 'workspace-view';
container.appendChild(view);
```

---

❌ **Carousel Prev/Next Navigation**
```javascript
// BAD
<button onclick="navigatePrev()">Previous</button>
<button onclick="navigateNext()">Next</button>
```

✅ **Pill Button Navigation**
```javascript
// GOOD
const pillNav = new PillNavigationComponent({
    items: [{id: 'tab1', label: 'Tab 1'}, ...],
    onSwitch: (id) => switchView(id)
});
```

---

❌ **Bypassing Workspace Shell**
```javascript
// BAD - taking over the entire page
document.body.innerHTML = '<div class="my-app">...</div>';
```

✅ **Using Workspace Container**
```javascript
// GOOD - render within provided container
render(container) {
    container.appendChild(this.createView());
}
```

---

## 7. Compliance Checklist

Before submitting a new view or refactoring an existing one, verify:

**Workspace Integration**:
- [ ] Uses `workspaceComponent.setPageMetadata()` for title/breadcrumbs
- [ ] Uses `workspaceComponent.setToolbar()` for controls (if multi-view)
- [ ] Container uses `.workspace-view` class
- [ ] Multi-view pages use `PillNavigationComponent`
- [ ] No carousel prev/next buttons
- [ ] Scrolling works correctly (canvas-level or view-level)
- [ ] Registered in `NavigationManager.navigateTo()`

**Theming & Design System**:
- [ ] No hardcoded colors (`#fff`, `black`, `rgb(...)`) - use `var(--theme-*)`
- [ ] Visualizations/Canvas elements respect current theme (Light/Dark compliant)
- [ ] Components inherit standard background/text variables (`--theme-bg-primary`, etc.)

**Code Quality (Migration Readiness)**:
- [ ] No inline HTML strings (use DOM creation)
- [ ] No inline CSS (use view-specific CSS file in `css/views/`)
- [ ] No inline `onclick` attributes (use `addEventListener`)
- [ ] Business logic extracted to Service module (see Section 10)
- [ ] Global functions exposed on `window` for AI integration

**AI Integration**:
- [ ] Page context function implemented for chat panel (see Section 11)
- [ ] Optimizer hooks documented (if applicable)

---

## 8. Reference Implementations

**Canonical Examples**:
- ✅ `js/components/OrgView.js` - Class-based, strict DOM creation, AI integration
- ✅ `js/components/ManagementView.js` - Component composition, pill nav
- ✅ `js/components/RoadmapView.js` - Clean class pattern
- ✅ `js/components/CapacityDashboardView.js` - Service layer pattern
- ✅ `js/components/GanttPlanningView.js` - Complex hierarchical view, MVC pattern with GanttTableController
- ✅ `js/components/YearPlanningView.js` - Full refactor example: service commands, state encapsulation, no globals

---

## 10. Service Layer Architecture (Migration Readiness)

### 10.1 Purpose

To enable future migration to modern frameworks (React, Next.js, Rails), all views must separate concerns into three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  View (Presentation)         js/components/[View].js        │
│  └─ DOM creation, event binding, user interaction           │
├─────────────────────────────────────────────────────────────┤
│  Service (Business Logic)    js/services/[Domain]Service.js │
│  └─ Calculations, transformations, pure functions           │
├─────────────────────────────────────────────────────────────┤
│  Repository (Data Access)    js/repositories/[Entity]Repository.js │
│  └─ LocalStorage, API calls, data persistence               │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Service Layer Rules

**Must**:
- Export pure functions (no DOM access)
- Accept data as parameters, return transformed data
- Be testable in isolation
- Be reusable across views

**Must Not**:
- Access `document` or `window.innerWidth` etc.
- Modify global state directly (return values instead)
- Contain presentation logic (colors, labels for display)

