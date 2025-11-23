(function() {
    class FrappeGanttComponent {
        constructor({ containerId, onTaskUpdated }) {
            this.containerId = containerId;
            this.element = document.getElementById(containerId);
            this.onTaskUpdated = onTaskUpdated; 
            this.gantt = null;
        }

        render(tasks, viewMode = 'Month') {
            if (!this.element) return;
            this.element.innerHTML = ''; 

            if (!tasks || tasks.length === 0) {
                this.element.innerHTML = '<div style="padding:20px; color:#777;">No planning data to display.</div>';
                return;
            }

            if (typeof Gantt === 'undefined') {
                this.element.innerHTML = '<div style="color:red;">Error: Frappe Gantt library not loaded. Check index.html.</div>';
                return;
            }

            try {
                // Initialize Frappe Gantt
                this.gantt = new Gantt(`#${this.containerId}`, tasks, {
                    header_height: 50,
                    column_width: 30,
                    step: 24,
                    view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                    bar_height: 30,
                    bar_corner_radius: 3,
                    arrow_curve: 5,
                    padding: 18,
                    view_mode: viewMode,
                    date_format: 'YYYY-MM-DD',
                    custom_popup_html: this._customPopupHtml,
                    on_date_change: (task, start, end) => this._handleDateChange(task, start, end)
                });
            } catch (e) {
                console.error("Frappe Gantt Render Crash Prevented:", e);
                this.element.innerHTML = `
                    <div style="padding:15px; background:#fff3cd; color:#856404; border:1px solid #ffeeba;">
                        <strong>Display Error:</strong> The chart could not be drawn. <br>
                        <small>${e.message}</small>
                    </div>`;
            }
        }

        _handleDateChange(task, start, end) {
            if (typeof this.onTaskUpdated === 'function') {
                // Handle Timezone offsets to prevent off-by-one-day errors
                const formatDate = (d) => {
                    const offset = d.getTimezoneOffset() * 60000;
                    return new Date(d.getTime() - offset).toISOString().split('T')[0];
                };
                this.onTaskUpdated(task._type, task._originalId, formatDate(start), formatDate(end));
            }
        }

        _customPopupHtml(task) {
            const startStr = task._start.toLocaleDateString();
            const endStr = task._end.toLocaleDateString();
            return `
                <div style="width: 200px; padding: 10px; font-family: sans-serif; font-size: 12px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">${task.name}</div>
                    <div style="color: #666; margin-bottom: 5px;">${startStr} - ${endStr}</div>
                    <div>${task.progress}% Completed</div>
                </div>
            `;
        }
    }

    if (typeof window !== 'undefined') {
        window.FrappeGanttComponent = FrappeGanttComponent;
    }
})();