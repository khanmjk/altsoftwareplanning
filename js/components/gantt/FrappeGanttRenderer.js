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

        if (!tasks || tasks.length === 0) {
            this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No initiatives to display.</div>';
            return;
        }

        // Create a wrapper for the SVG because Frappe appends to the selector
        const wrapperId = `frappe-gantt-${Date.now()}`;
        const wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.style.overflow = 'auto'; // Allow scrolling
        wrapper.style.height = '100%'; // Ensure it fills container
        this.container.appendChild(wrapper);

        const frappeTasks = this._transformTasks(tasks);

        try {
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

    _transformTasks(tasks) {
        return tasks.map(task => {
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
                start: task.start,
                end: task.end,
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
        // Additional manual DOM manipulation if needed
    }
}

if (typeof window !== 'undefined') {
    window.FrappeGanttRenderer = FrappeGanttRenderer;
}
