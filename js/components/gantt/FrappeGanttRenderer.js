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

        // Create a wrapper for the SVG because Frappe appends to the selector
        const wrapperId = `frappe-gantt-${Date.now()}`;
        const wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.style.overflowX = 'auto';
        wrapper.style.overflowY = 'auto';
        wrapper.style.height = '100%'; // Ensure it fills container
        wrapper.style.minHeight = '100%';
        wrapper.style.width = '100%';
        wrapper.style.position = 'relative';
        this.container.appendChild(wrapper);

        const year = options.year || new Date().getFullYear();
        const frappeTasks = this._transformTasks(tasks || []);

        try {
            // Calculate date range based on options.year
            const year = options.year || new Date().getFullYear();
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            // Frappe Gantt expects a selector string or element
            this.gantt = new Gantt(`#${wrapperId}`, frappeTasks, {
                header_height: 60, // Taller header
                column_width: 30,
                step: 24,
                view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                bar_height: 35, // Taller bars (was 25)
                bar_corner_radius: 4,
                arrow_curve: 5,
                padding: 25, // More padding (was 18)
                view_mode: this.currentViewMode,
                date_format: 'YYYY-MM-DD',
                // Limit view to 12 months
                start: startDate,
                end: endDate,
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

            // Apply custom styles after render
            this._applyCustomStyles(tasks);
            this._resizeForTasks(wrapper, frappeTasks, options);

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
        const barPadding = 12; // Frappe internal gap between bars
        const headerHeight = opts.header_height || 50;
        const padding = opts.padding || 18;

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
        wrapper.style.overflowY = 'auto';
        wrapper.style.overflowX = 'auto';
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

            // Use the raw title if available to avoid double indentation from adapter, 
            // or clean up the adapter's indentation if we want to control it here.
            // The adapter adds \u00A0 which might not render well in SVG. 
            // Let's strip leading whitespace/non-breaking spaces and apply our own prefix.
            const rawName = (task.label || task.title || '').replace(/^[\s\u00A0]+/, '');

            return {
                id: task.id,
                name: namePrefix + rawName,
                start: start,
                end: end,
                progress: task.progress || 0,
                dependencies: task.dependencies || '',
                custom_class: customClass,
                // Pass metadata through
                initiativeId: task.initiativeId,
                workPackageId: task.workPackageId,
                teamId: task.teamId,
                type: task.type,
                status: task.status
            };
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

                // Move label slightly if needed, or ensure it's visible
                // For now, just ensuring high contrast
            }
        });
    }
}

if (typeof window !== 'undefined') {
    window.FrappeGanttRenderer = FrappeGanttRenderer;
}
