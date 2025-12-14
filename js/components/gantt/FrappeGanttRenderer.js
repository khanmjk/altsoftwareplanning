/**
 * Frappe Gantt implementation of the GanttRenderer.
 * Currently a stub for future implementation.
 */
class FrappeGanttRenderer extends GanttRenderer {
    constructor(container) {
        super(container);
        this.gantt = null;
        this.currentViewMode = 'Month';
        this.tasks = [];
    }

    async render(tasks, options = {}) {
        if (!this.container) return;
        this.clear();
        this.tasks = tasks; // Store for view mode switching

        // Ensure container stretches to available height for consistent scrolling
        this.container.style.display = 'block';
        this.container.style.height = '100%';
        this.container.style.minHeight = '0';
        // Allow the container to scroll when content exceeds available height
        this.container.style.overflow = 'auto';

        if (!tasks || tasks.length === 0) {
            this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No initiatives to display.</div>';
            return;
        }

        // Clamp tasks to the selected year window so the view stays to 12 months
        const year = options.year || new Date().getFullYear();
        const clampedTasks = this._clampTasksToYear(tasks, year);

        // Create a wrapper for the SVG because Frappe appends to the selector
        const wrapperId = `frappe-gantt-${Date.now()}`;
        const wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.style.overflow = 'hidden';
        wrapper.style.height = '100%'; // Ensure it fills container
        wrapper.style.minHeight = '100%';
        wrapper.style.width = '100%';
        wrapper.style.position = 'relative';
        this.container.appendChild(wrapper);

        const frappeTasks = this._transformTasks(clampedTasks || []);
        this._taskLabelMap = this._buildTaskLabelMap(frappeTasks);
        this._dependencyTextMap = this._buildDependencyTextMap(frappeTasks);

        try {
            // Calculate date range based on options.year
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            // Frappe Gantt expects a selector string or element
            const startDateObj = new Date(`${year}-01-01T00:00:00Z`);
            const endDateObj = new Date(`${year}-12-31T00:00:00Z`);

            // Use FrappeGanttService to create the instance
            this.gantt = FrappeGanttService.createInstance(`#${wrapperId}`, frappeTasks, {
                header_height: 60, // Taller header
                column_width: 30,
                step: 24,
                view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                bar_height: 30, // Taller bars (was 25)
                bar_padding: 24, // More padding (was 8)
                bar_corner_radius: 4,
                arrow_curve: 5,
                padding: 24, // More padding (was 18)
                view_mode: this.currentViewMode,
                date_format: 'YYYY-MM-DD',
                // Limit view to 12 months
                start: startDateObj,
                end: endDateObj,
                custom_popup_html: (task) => {
                    // Rich Tooltip Implementation
                    const start = task._start.toISOString().split('T')[0];
                    const end = task._end.toISOString().split('T')[0];
                    let typeLabel = 'Task';
                    let details = '';

                    if (task.type === 'initiative') {
                        typeLabel = 'Initiative';
                        details = `<p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Status: <strong>${task.status || 'N/A'}</strong></p>`;
                    } else if (task.type === 'workPackage') {
                        typeLabel = 'Work Package';
                        details = `<p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Parent Initiative ID: ${task.initiativeId}</p>`;
                    } else if (task.type === 'assignment') {
                        typeLabel = 'Team Assignment';
                        details = `<p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Team ID: ${task.teamId}</p>`;
                    }

                    return `
                        <div class="details-container" style="width: 240px; padding: 10px;">
                            <h5 style="margin: 0 0 5px 0; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 4px;">${task.name}</h5>
                            <span style="font-size: 10px; background: #eee; padding: 2px 6px; border-radius: 4px; color: #555;">${typeLabel}</span>
                            <p style="margin: 8px 0 0 0; font-size: 12px;">${start} to ${end}</p>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Progress: ${task.progress}%</p>
                            ${details}
                        </div>
                    `;
                },
                on_date_change: (task, start, end) => {
                    if (options.onUpdate) {
                        // Frappe passes Date objects, convert to YYYY-MM-DD string
                        const formatDate = (d) => d.toISOString().split('T')[0];
                        options.onUpdate({
                            task: task,
                            start: formatDate(start),
                            end: formatDate(end)
                        });
                    }
                }
            });

            // Force the visible window to the selected year only (no spill-over into next year)
            if (this.gantt) {
                this.gantt.gantt_start = startDateObj;
                this.gantt.gantt_end = endDateObj;
                this.gantt.setup_dates();
                this.gantt.change_view_mode(this.currentViewMode);
            }

            // Apply custom styles after render
            this._applyCustomStyles(tasks);
            this._resizeForTasks(wrapper, frappeTasks, options);
            this._markLockedBars(wrapper, frappeTasks);
            this._applyFocusStyles(wrapper, frappeTasks, options.focus);
            this._styleDependencies(wrapper);

            // Attach double-click handling to support expand/collapse sync with table
            this._bindDoubleClick(wrapper, frappeTasks, options);

        } catch (err) {
            console.error("FrappeGanttRenderer render failed:", err);
            this.container.innerHTML = `
                <div style="color: #721c24; background-color: #f8d7da; padding: 10px; border: 1px solid #f5c6cb; border-radius: 4px;">
                    <strong>Error rendering Frappe Gantt.</strong><br>
                    <small>${err.message}</small>
                </div>`;
        }
    }

    changeViewMode(mode) {
        if (this.gantt) {
            this.currentViewMode = mode;
            this.gantt.change_view_mode(mode);
        }
    }

    _resizeForTasks(wrapper, tasks, options = {}) {
        if (!wrapper) return;
        const svg = wrapper.querySelector('svg');
        if (!svg) return;

        const opts = this.gantt ? this.gantt.options : {};
        const barHeight = opts.bar_height || 30;
        const barPadding = opts.bar_padding || 24; // Extra gap to reduce overlap
        const headerHeight = opts.header_height || 60;
        const padding = opts.padding || 24;

        // Use actual rendered bars to determine needed height
        const count = Math.max((tasks || []).length || 1, options.metaInitiativeCount || 0);
        // Generous per-row height to avoid truncation; Frappe's internal layout adds extra gap.
        const rowHeight = barHeight + (barPadding * 2);
        const computedHeight = headerHeight + (padding * 2) + (count * rowHeight);

        // Set SVG height so all tasks render, keep width fluid
        svg.style.width = '100%';
        svg.style.maxWidth = 'none';
        svg.style.height = `${computedHeight}px`;
        svg.setAttribute('height', `${computedHeight}`);

        wrapper.style.minHeight = `${computedHeight}px`;
        wrapper.style.height = `${computedHeight}px`;
        wrapper.style.overflow = 'hidden';
    }

    _markLockedBars(wrapper, tasks) {
        if (!wrapper || !tasks || !tasks.length) return;
        // Use normalized IDs for consistent lookup
        const map = new Map(tasks.map(t => [this._normalizeId(t.id), t]));
        const bars = wrapper.querySelectorAll('.bar-wrapper');
        bars.forEach(bar => {
            const id = bar.getAttribute('data-id');
            const normId = this._normalizeId(id);
            const task = map.get(normId);
            if (!task) return;
            let lockedReason = null;
            if (task.type === 'initiative' && task.hasWorkPackages) {
                lockedReason = 'Drag disabled - edit at work package level. Double-click to expand.';
            } else if (task.type === 'workPackage' && (task.assignmentCount || 0) > 1) {
                lockedReason = 'Drag disabled - edit dates at task level. Double-click to expand.';
            }
            if (lockedReason) {
                bar.classList.add('locked-task');
                const barEl = bar.querySelector('.bar');
                if (barEl) {
                    barEl.setAttribute('title', lockedReason);
                    barEl.style.cursor = 'pointer';
                }
                const label = bar.querySelector('.bar-label');
                if (label) {
                    label.setAttribute('title', lockedReason);
                    label.style.cursor = 'pointer';
                }
            }
        });
    }

    _bindDoubleClick(wrapper, tasks, options = {}) {
        if (!wrapper || !tasks || !tasks.length) return;
        const cb = options.onItemDoubleClick;
        if (!cb) return;

        // Build map with normalized IDs for consistent lookup
        const taskMap = new Map(tasks.map(t => [this._normalizeId(t.id), t]));
        const handler = (e) => {
            const bar = e.target.closest('.bar-wrapper');
            if (!bar) return;
            const id = bar.getAttribute('data-id');
            if (!id) return;
            // Normalize the DOM ID for lookup
            const normId = this._normalizeId(id);
            const task = taskMap.get(normId);
            if (task) cb(task);
        };
        wrapper.addEventListener('dblclick', handler);

        // Return a cleanup if ever needed; for now rely on wrapper recreation per render
        this._detachDbl = () => wrapper.removeEventListener('dblclick', handler);
    }

    _clampTasksToYear(tasks, year) {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;

        const toISO = (d) => {
            if (!d) return null;
            // Accept YYYY-MM-DD or YYYY/MM/DD, fallback to raw
            const normalized = d.replace(/\//g, '-');
            const m = /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
            return m || null;
        };

        const clampDate = (dateStr) => {
            const iso = toISO(dateStr);
            if (!iso) return null;
            if (iso < yearStart) return yearStart;
            if (iso > yearEnd) return yearEnd;
            return iso;
        };

        return (tasks || []).map(task => {
            const start = clampDate(task.start) || yearStart;
            const end = clampDate(task.end) || yearEnd;
            const safeEnd = end < start ? start : end;
            return { ...task, start, end: safeEnd };
        });
    }

    _normalizeId(value) {
        return (value || '')
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    _transformTasks(tasks) {
        return tasks.map(task => {
            const start = (task.start || '').replace(/\//g, '-');
            const end = (task.end || '').replace(/\//g, '-');
            let customClass = 'gantt-task';
            let namePrefix = '';

            if (task.type === 'initiative') {
                customClass += ' gantt-initiative';
                namePrefix = '🔹 '; // Diamond for Initiative
            }
            if (task.type === 'workPackage') {
                customClass += ' gantt-work-package';
                namePrefix = '  ↳ '; // Arrow for Work Package
            }
            if (task.type === 'assignment') {
                customClass += ' gantt-assignment';
                namePrefix = '    👤 '; // User icon for Assignment
            }

            // Status based coloring
            if (task.status) customClass += ` status-${task.status.toLowerCase().replace(/\s+/g, '-')}`;

            // Use the raw title if available to avoid double indentation from adapter.
            const rawName = (task.label || task.title || '').replace(/^[\s\u00A0]+/, '');
            // Keep full text; truncation is handled after measuring the rendered bar width.
            const displayName = rawName;

            return {
                id: task.id,
                name: namePrefix + displayName,
                start: start,
                end: end,
                progress: task.progress || 0,
                dependencies: task.dependencies || '',
                custom_class: customClass,
                hasWorkPackages: task.hasWorkPackages,
                assignmentCount: task.assignmentCount,
                originalLabel: rawName,
                displayLabel: rawName,
                namePrefix,
                // Pass metadata through
                initiativeId: task.initiativeId,
                workPackageId: task.workPackageId,
                teamId: task.teamId,
                type: task.type,
                status: task.status
            };
        });
    }

    _buildTaskLabelMap(tasks) {
        const map = new Map();
        (tasks || []).forEach(t => {
            const normId = this._normalizeId(t.id);
            if (!normId) return;
            map.set(normId, this._friendlyTaskLabel(t));
        });
        return map;
    }

    _buildDependencyTextMap(tasks) {
        const map = new Map();
        const labelMap = this._taskLabelMap || new Map();
        (tasks || []).forEach(toTask => {
            const toId = this._normalizeId(toTask.id);
            if (!toId || !toTask.dependencies) return;
            const deps = toTask.dependencies.split(',').map(s => this._normalizeId(s)).filter(Boolean);
            deps.forEach(fromId => {
                const key = `${toId}|${fromId}`;
                if (map.has(key)) return;
                const toLabel = labelMap.get(toId) || toTask.name || toTask.title || toId;
                const fromLabel = labelMap.get(fromId) || fromId;
                const text = `${toLabel} depends on ${fromLabel}`;
                map.set(key, text);
            });
        });
        return map;
    }

    _friendlyTaskLabel(task) {
        if (!task) return '';
        const base = task.displayLabel || task.originalLabel || task.name || task.title || task.id;
        if (task.type === 'assignment') {
            return base || (task.teamId ? `Team ${task.teamId}` : 'Assignment');
        }
        if (task.type === 'workPackage') {
            return base || 'Work Package';
        }
        if (task.type === 'initiative') {
            return base || 'Initiative';
        }
        return base;
    }

    _applyFocusStyles(wrapper, tasks, focus = {}) {
        if (!wrapper || !Array.isArray(tasks)) return;
        const focusTaskId = this._normalizeId(focus?.taskId);
        const focusInitiativeId = this._normalizeId(focus?.initiativeId);
        const focusType = focus?.taskType || null;

        const taskMap = new Map((tasks || []).map(t => [this._normalizeId(t.id), t]));
        const bars = wrapper.querySelectorAll('.bar-wrapper');
        bars.forEach(bar => {
            bar.classList.remove('focus-initiative', 'focus-row');
            const idNorm = this._normalizeId(bar.getAttribute('data-id'));
            if (!idNorm) return;
            const task = taskMap.get(idNorm);
            const taskInit = this._normalizeId(task?.initiativeId);

            // Get bar element for styling
            const barEl = bar.querySelector('.bar');

            // Reset focus styles
            if (barEl) {
                barEl.style.removeProperty('stroke');
                barEl.style.removeProperty('stroke-width');
                barEl.style.removeProperty('filter');
            }

            if (focusInitiativeId && taskInit && taskInit === focusInitiativeId) {
                bar.classList.add('focus-initiative');
            }

            const isExactFocus = focusTaskId && idNorm === focusTaskId;
            const isInitFocus = focusType === 'initiative' && focusInitiativeId && idNorm === focusInitiativeId;
            if (isExactFocus || isInitFocus) {
                bar.classList.add('focus-row');
                // Apply prominent inline styles for visibility
                if (barEl) {
                    barEl.style.setProperty('stroke', '#3b82f6', 'important');
                    barEl.style.setProperty('stroke-width', '3px', 'important');
                    barEl.style.setProperty('filter', 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.7))', 'important');
                }
            }
        });
    }

    _applyCustomStyles(tasks) {
        // Manually enforce styles on the SVG elements to bypass CSS specificity issues
        const svg = this.container.querySelector('svg');
        if (!svg) return;

        // 1. Fix Container Sizing
        svg.style.width = '100%';
        svg.style.maxWidth = 'none';

        // 2. Iterate over task groups and apply styles
        // Frappe Gantt uses data-id on the bar-wrapper
        const groups = svg.querySelectorAll('.bar-wrapper');
        groups.forEach(group => {
            const id = group.getAttribute('data-id');
            const task = tasks.find(t => t.id === id);
            if (!task) return;

            const bar = group.querySelector('.bar');
            const progress = group.querySelector('.bar-progress');
            const label = group.querySelector('.bar-label');

            // Define Styles
            let color = '#a3a3a3'; // Default Grey
            let opacity = '0.3';
            let fontWeight = '400';
            let fontSize = '12px';
            let textColor = '#333';

            if (task.type === 'initiative') {
                color = '#6f42c1'; // Purple
                opacity = '0.25';
                fontWeight = '700';
                fontSize = '14px';
                textColor = '#4a2c8a'; // Darker Purple for text
            } else if (task.type === 'workPackage') {
                color = '#0366d6'; // Blue
                opacity = '0.25';
                fontWeight = '600';
                fontSize = '13px';
                textColor = '#003d80'; // Darker Blue
            } else if (task.type === 'assignment') {
                color = '#2ea44f'; // Green
                opacity = '0.25';
                fontWeight = '500';
                fontSize = '12px';
                textColor = '#1a7f37'; // Darker Green
            }

            // Status Overrides
            if (task.status) {
                const s = task.status.toLowerCase();
                if (s === 'done' || s === 'complete') {
                    color = '#a0c4ff'; // Light Blue
                } else if (s === 'blocked' || s === 'risk') {
                    color = '#ff6b6b'; // Red
                }
            }

            // Apply Styles with Priority
            if (bar) {
                bar.style.setProperty('fill', color, 'important');
                bar.style.setProperty('opacity', opacity, 'important');
            }
            if (progress) {
                progress.style.setProperty('fill', color, 'important');
            }
            if (label) {
                label.style.setProperty('font-weight', fontWeight, 'important');
                label.style.setProperty('font-size', fontSize, 'important');
                label.style.setProperty('fill', textColor, 'important');
                // Prefer adapter-supplied label (includes SDE/date), fall back to title.
                const fullLabel = task.displayLabel || task.originalLabel || task.label || task.title || '';
                if (fullLabel) {
                    label.setAttribute('title', `${(task.namePrefix || '').trim()} ${fullLabel}`.trim());
                }

                // Center label within the bar to avoid overflow past the bar bounds
                const barWidth = bar ? Number(bar.getAttribute('width')) : null;
                const barX = bar ? Number(bar.getAttribute('x')) : null;
                if (barWidth && barX !== null) {
                    const centerX = barX + barWidth / 2;
                    label.setAttribute('x', centerX);
                    label.setAttribute('text-anchor', 'middle');
                }

                // Dynamic truncation based on available width; tolerate slight overflow (5 chars) before trimming.
                const availablePx = bar ? Math.max(0, Number(bar.getAttribute('width')) - 12) : 0;
                const fontPx = parseFloat(label.style.fontSize || window.getComputedStyle(label).fontSize || '12') || 12;
                const avgCharPx = fontPx * 0.6; // rough average width per character
                const maxChars = Math.max(4, Math.floor(availablePx / avgCharPx));
                const tolerance = 5;
                const baseText = (label.textContent || '').trim() || fullLabel;
                let rendered = baseText;

                if (baseText.length > maxChars + tolerance) {
                    const targetChars = Math.max(4, maxChars - 1);
                    rendered = baseText.slice(0, targetChars).trimEnd() + '…';
                }

                label.textContent = rendered;
            }
        });
    }

    _truncateLabel(text, maxLen) {
        const t = (text || '').trim();
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen - 1).trim() + '…';
    }

    _styleDependencies(wrapper) {
        if (!wrapper) return;

        // Styling is handled via CSS classes to support theme variables
        // We add classes here and let CSS (.dep-initiative, .dep-task) handle colors
        const arrowRecords = (this.gantt && Array.isArray(this.gantt.arrows)) ? this.gantt.arrows : [];

        // Style and annotate from the source of truth (gantt.arrows)
        arrowRecords.forEach(rec => {
            const el = rec?.element;
            if (!el) return;
            const path = el.tagName?.toLowerCase() === 'path' ? el : el.querySelector('path') || el;
            const targetEl = path;

            // Determine dependency type based on from/to task types
            const fromType = rec.from_task?.type || null;
            const toType = rec.to_task?.type || null;

            // Initiative dependency: both are initiatives
            const isInitiativeDep = fromType === 'initiative' && toType === 'initiative';
            // Task dependency: either is assignment (within a WP)
            const isTaskDep = fromType === 'assignment' || toType === 'assignment';

            // Add class for CSS targeting (CSS handles colors via theme variables)
            if (isInitiativeDep) {
                targetEl.classList.add('dep-initiative');
            } else if (isTaskDep) {
                targetEl.classList.add('dep-task');
            }

            // Base styling - colors come from CSS for theme compliance
            targetEl.style.fill = 'none';
            targetEl.style.cursor = 'help';

            // Seed ids/labels from record
            const fromId = rec.from_task?.id ? this._normalizeId(rec.from_task.id) : null;
            const toId = rec.to_task?.id ? this._normalizeId(rec.to_task.id) : null;
            if (fromId) targetEl.dataset.fromId = fromId;
            if (toId) targetEl.dataset.toId = toId;
            if (rec.from_task?.name) targetEl.dataset.fromLabel = rec.from_task.name;
            if (rec.to_task?.name) targetEl.dataset.toLabel = rec.to_task.name;

            // Also honor any data-from/data-to set by Frappe
            const dataFrom = targetEl.dataset.from || targetEl.getAttribute('data-from');
            const dataTo = targetEl.dataset.to || targetEl.getAttribute('data-to');
            if (dataFrom) targetEl.dataset.fromId = this._normalizeId(dataFrom);
            if (dataTo) targetEl.dataset.toId = this._normalizeId(dataTo);

            // Attach human labels and description
            this._populateArrowLabels(wrapper, targetEl);
            const desc = this._formatDependencyText(wrapper, targetEl);
            targetEl.setAttribute('title', desc);

            const showBadge = (e) => this._showSoftBadge(wrapper, targetEl, e);
            const hideBadge = () => this._hideSoftBadge(wrapper);
            targetEl.addEventListener('mouseenter', showBadge);
            targetEl.addEventListener('mouseleave', hideBadge);
        });

        // Style any arrow heads present (using CSS variables via class)
        const heads = wrapper.querySelectorAll('.arrow-head');
        heads.forEach(head => {
            head.style.opacity = '0.65';
        });
    }

    _showSoftBadge(wrapper, arrowEl, evt) {
        this._hideSoftBadge(wrapper);
        const badge = document.createElement('div');
        badge.className = 'soft-dep-badge';

        const detailText = this._formatDependencyText(wrapper, arrowEl);
        const badgeText = `Soft: ${detailText}`;
        badge.textContent = badgeText;

        const arrowBox = arrowEl.getBoundingClientRect();
        const wrapperBox = wrapper.getBoundingClientRect();
        const top = arrowBox.top - wrapperBox.top - 8; // slightly above arrow
        const left = arrowBox.left - wrapperBox.left + (arrowBox.width / 2);
        badge.style.top = `${top}px`;
        badge.style.left = `${left}px`;

        // Attach and keep reference for cleanup
        wrapper.appendChild(badge);
        this._softBadge = badge;
    }

    _populateArrowLabels(wrapper, arrowEl) {
        if (!arrowEl) return;
        const fromId = this._normalizeId(arrowEl.dataset.fromId || arrowEl.dataset.from || arrowEl.getAttribute('data-from'));
        const toId = this._normalizeId(arrowEl.dataset.toId || arrowEl.dataset.to || arrowEl.getAttribute('data-to'));

        const lookupLabel = (id) => this._lookupTaskLabel(wrapper, id);
        const fromLabel = arrowEl.dataset.fromLabel || lookupLabel(fromId);
        const toLabel = arrowEl.dataset.toLabel || lookupLabel(toId);

        if (fromLabel) arrowEl.dataset.fromLabel = fromLabel;
        if (toLabel) arrowEl.dataset.toLabel = toLabel;
    }

    _lookupTaskLabel(wrapper, normId) {
        if (!normId) return null;
        const id = this._normalizeId(normId);
        if (!id) return null;
        if (this._taskLabelMap && this._taskLabelMap.has(id)) {
            return this._taskLabelMap.get(id);
        }
        // Fallback: query rendered bar label text
        const match = Array.from(wrapper.querySelectorAll('.bar-wrapper[data-id]')).find(bw => this._normalizeId(bw.getAttribute('data-id')) === id);
        if (match) {
            const lbl = match.querySelector('.bar-label');
            if (lbl && lbl.textContent) return lbl.textContent.trim();
        }
        return null;
    }

    _formatDependencyText(wrapper, arrowEl) {
        const fallback = 'Soft dependency (informational)';
        if (!arrowEl) return fallback;

        const fromId = arrowEl.dataset.fromId || null;
        const toId = arrowEl.dataset.toId || null;
        const fromLabelDs = arrowEl.dataset.fromLabel || null;
        const toLabelDs = arrowEl.dataset.toLabel || null;

        const depKey = (toId && fromId) ? `${this._normalizeId(toId)}|${this._normalizeId(fromId)}` : null;
        if (depKey && this._dependencyTextMap && this._dependencyTextMap.has(depKey)) {
            const txt = this._dependencyTextMap.get(depKey);
            return txt;
        }

        const fromLabel = fromLabelDs
            || this._lookupTaskLabel(wrapper, fromId)
            || null;
        const toLabel = toLabelDs
            || this._lookupTaskLabel(wrapper, toId)
            || null;

        if (fromLabel && toLabel) {
            return `${toLabel} depends on ${fromLabel}`;
        }
        return fallback;
    }

    _hideSoftBadge(wrapper) {
        if (this._softBadge && wrapper && wrapper.contains(this._softBadge)) {
            wrapper.removeChild(this._softBadge);
        }
        this._softBadge = null;
    }
}
