/**
 * Frappe Gantt implementation of the GanttRenderer.
 * Currently a stub for future implementation.
 */
class FrappeGanttRenderer extends GanttRenderer {
    constructor(container) {
        super(container);
        this.gantt = null;
    }

    async render(tasks, options = {}) {
        if (!this.container) return;
        this.clear();

        if (!tasks || tasks.length === 0) {
            this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No initiatives to display.</div>';
            return;
        }

        // Create a wrapper for the SVG because Frappe appends to the selector
        const wrapperId = `frappe-gantt-${Date.now()}`;
        const wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.style.overflow = 'auto'; // Allow scrolling
        this.container.appendChild(wrapper);

        const frappeTasks = this._transformTasks(tasks);

        try {
            // Frappe Gantt expects a selector string or element
            this.gantt = new Gantt(`#${wrapperId}`, frappeTasks, {
                header_height: 50,
                column_width: 30,
                step: 24,
                view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                bar_height: 20,
                bar_corner_radius: 3,
                arrow_curve: 5,
                padding: 18,
                view_mode: 'Month',
                date_format: 'YYYY-MM-DD',
                custom_popup_html: (task) => {
                    return `
                        <div class="details-container" style="width: 300px; padding: 10px;">
                            <h5 style="margin: 0 0 5px 0;">${task.name}</h5>
                            <p style="margin: 0; font-size: 12px;">${task.start} to ${task.end}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Progress: ${task.progress}%</p>
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

    _transformTasks(tasks) {
        return tasks.map(task => {
            // Map our types to custom classes if needed, though Frappe has limited built-in class support via custom_class
            let customClass = 'gantt-task';
            if (task.type === 'initiative') customClass += ' gantt-initiative';
            if (task.type === 'workPackage') customClass += ' gantt-work-package';
            if (task.type === 'assignment') customClass += ' gantt-assignment';

            // Status based coloring
            if (task.status) customClass += ` status-${task.status.toLowerCase().replace(/\s+/g, '-')}`;

            return {
                id: task.id,
                name: task.label || task.title,
                start: task.start,
                end: task.end,
                progress: task.progress || 0,
                dependencies: task.dependencies || '',
                custom_class: customClass,
                // Pass metadata through
                initiativeId: task.initiativeId,
                workPackageId: task.workPackageId,
                teamId: task.teamId,
                type: task.type
            };
        });
    }

    _applyCustomStyles(tasks) {
        // This is where we could inject dynamic CSS if the library doesn't support enough styling via classes
        // For now, we rely on the classes added in _transformTasks and CSS in ganttChart.css (which we might need to update)
    }
}

if (typeof window !== 'undefined') {
    window.FrappeGanttRenderer = FrappeGanttRenderer;
}
