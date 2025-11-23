/**
 * GanttChart component: lightweight wrapper around Mermaid gantt rendering with a simple API.
 */
(function() {
    class GanttChart {
        constructor({ container, mermaidInstance, onRenderError } = {}) {
            this.container = container;
            this.mermaid = mermaidInstance || (typeof mermaid !== 'undefined' ? mermaid : null);
            this.onRenderError = onRenderError;
            this.tasks = [];
            this.options = {};
        }

        setData(tasks = [], options = {}) {
            this.tasks = tasks;
            this.options = options;
        }

        async render() {
            if (!this.container) return;
            if (!this.tasks.length) {
                this.container.textContent = 'No initiatives to display.';
                return;
            }
            if (!this.mermaid || typeof this.mermaid.render !== 'function') {
                this.container.textContent = 'Mermaid is not available.';
                return;
            }
            const syntax = this._buildMermaidSyntax();
            const renderId = `gantt-${Date.now()}`;
            try {
                const result = await this.mermaid.render(renderId, syntax);
                this.container.innerHTML = result.svg;
                this._applyEnhancements();
            } catch (err) {
                console.error("GanttChart render failed:", err, syntax);
                if (typeof this.onRenderError === 'function') {
                    this.onRenderError(err, syntax);
                }
                this.container.textContent = 'Unable to render Gantt chart. Check console for details.';
            }
        }

        _buildMermaidSyntax() {
            const lines = [];
            lines.push('gantt');
            lines.push('dateFormat YYYY-MM-DD');
            lines.push('axisFormat %Y-%m-%d');
            const title = this.options.title || 'Detailed Plan';
            lines.push(`title ${title}`);

            // Group tasks by group label
            const groupMap = new Map();
            this.tasks.forEach(task => {
                const group = task.group || 'All';
                if (!groupMap.has(group)) groupMap.set(group, []);
                groupMap.get(group).push(task);
            });

            Array.from(groupMap.entries()).forEach(([group, tasks]) => {
                lines.push(`section ${escapeLabel(group)}`);
                tasks.forEach(task => {
                    const statusToken = mapStatusToToken(task.status);
                    const fullLabel = escapeLabel(task.label || task.title || task.id);
                    const label = truncate(fullLabel, 48);
                    const start = task.start;
                    const end = task.end;
                    if (isValidDate(start) && isValidDate(end)) {
                        lines.push(`${label} :${statusToken}, ${task.id}, ${start}, ${end}`);
                    }
                });
            });

            return lines.join('\n');

            function mapStatusToToken(status) {
                const s = (status || '').toLowerCase();
                if (s.includes('done') || s.includes('complete')) return 'done';
                if (s.includes('risk') || s.includes('block')) return 'crit';
                return 'active';
            }
            function escapeLabel(text) {
                return (text || '').replace(/:/g, '\\:').replace(/,/g, ' / ');
            }
            function truncate(text, maxLen) {
                const t = text || '';
                if (t.length <= maxLen) return t;
                return t.slice(0, maxLen - 3).trim() + '...';
            }
            function isValidDate(str) {
                return /^\d{4}-\d{2}-\d{2}$/.test(str);
            }
        }
        _applyEnhancements() {
            const svg = this.container.querySelector('svg');
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = 'auto';
            }
            // Add tooltips by matching data-id in order of tasks
            const labels = this.container.querySelectorAll('.task text');
            labels.forEach((textEl, idx) => {
                const task = this.tasks[idx];
                if (task) {
                    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                    title.textContent = task.label || task.title || '';
                    const existing = textEl.querySelector('title');
                    if (existing) existing.remove();
                    textEl.appendChild(title);
                }
            });
        }
    }

    if (typeof window !== 'undefined') {
        window.GanttChart = GanttChart;
    }
})();
