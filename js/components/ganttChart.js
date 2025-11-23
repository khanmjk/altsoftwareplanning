/**
 * GanttChart component: lightweight wrapper around Mermaid gantt rendering with a simple API.
 */
(function() {
    const MERMAID_GANTT_CONFIG = {
        theme: "base",
        themeVariables: {
            primaryColor: "#cfe2f3",
            secondaryColor: "#e1f5fe",
            tertiaryColor: "#fff",
            taskBkgColor: "#4a90e2",
            taskTextColor: "#ffffff",
            activeTaskBkgColor: "#4a90e2",
            activeTaskTextColor: "#ffffff",
            doneBkgColor: "#a0c4ff",
            doneTextColor: "#333333",
            critBkgColor: "#ff6b6b",
            critTextColor: "#ffffff",
            sectionBkgColor: "#ffffff",
            sectionBkgColor2: "#fcfcfc",
            altSectionBkgColor: "#ffffff"
        },
        gantt: {
            barHeight: 40,
            barGap: 8,
            fontSize: 16,
            sectionFontSize: 16,
            numberSectionStyles: 4,
            axisFormat: "%Y-%m-%d",
            topPadding: 60,
            leftPadding: 450,    // increased to give more room for titles
            gridLineStartPadding: 50
        }
    };

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
            const syntax = buildMermaidFromTasks(this.tasks, this.options);
            const renderId = `gantt-${Date.now()}`;
            try {
                this.container.innerHTML = '';
                const result = await this.mermaid.render(renderId, syntax);
                this.container.innerHTML = result.svg;
                this._applyEnhancements();
            } catch (err) {
                console.error("GanttChart render failed:", err);
                console.debug("Failed Syntax:\n", syntax);
                if (typeof this.onRenderError === 'function') {
                    this.onRenderError(err, syntax);
                }
                this.container.innerHTML = `
                    <div style="color: #721c24; background-color: #f8d7da; padding: 10px; border: 1px solid #f5c6cb; border-radius: 4px;">
                        <strong>Error rendering Gantt chart.</strong><br>
                        <small>${err.message}</small>
                    </div>`;
            }
        }

        _applyEnhancements() {
            const svg = this.container.querySelector('svg');
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = 'auto';
                svg.style.maxWidth = 'none';
            }
            // Add tooltips by matching data-id on task groups
            const taskGroups = this.container.querySelectorAll('.task');
            taskGroups.forEach(groupEl => {
                const taskId = groupEl.id?.replace('task-', '') || null;
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    let title = groupEl.querySelector('title');
                    if (!title) {
                        title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                        groupEl.appendChild(title);
                    }
                    title.textContent = task.label || task.title || '';
                }
            });
        }
    }

    function buildMermaidFromTasks(tasks = [], options = {}) {
        const lines = [];
        
        // Configuration block to improve readability/spacing with a blue/gray palette
        lines.push(`%%{init: ${JSON.stringify(MERMAID_GANTT_CONFIG)} }%%`);

        lines.push('gantt');
        lines.push('dateFormat YYYY-MM-DD');
        lines.push('axisFormat %Y-%m-%d');
        
        const title = options.title || 'Detailed Plan';
        lines.push(`title ${title}`);

        // Today marker
        const today = new Date().toISOString().split('T')[0];
        lines.push(`todayMarker stroke-width:2px,stroke:#f00,opacity:0.7`);

        const groupMap = new Map();
        tasks.forEach(task => {
            const group = task.group || 'All';
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group).push(task);
        });

        Array.from(groupMap.entries()).forEach(([group, tasks]) => {
            lines.push(`section ${escapeLabel(group)}`);
            tasks.forEach(task => {
                const statusToken = mapStatusToToken(task.status);
                const safeLabel = escapeLabel(task.label || task.title);
                
                const start = task.start;
                const end = task.end;
                
                if (isValidDate(start) && isValidDate(end)) {
                    lines.push(`${safeLabel} :${statusToken}, ${task.id}, ${start}, ${end}`);
                }
            });
        });

        return lines.join('\n');
    }

    function mapStatusToToken(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('done') || s.includes('complete')) return 'done';
        if (s.includes('risk') || s.includes('block')) return 'crit';
        return 'active';
    }
    function escapeLabel(text) {
        return (text || '').replace(/:/g, ' -').replace(/,/g, ' / ');
    }
    function truncate(text, maxLen) {
        const t = text || '';
        if (t.length <= maxLen) return t;
        return t.slice(0, maxLen - 3).trim() + '...';
    }
    function isValidDate(str) {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
    }

    if (typeof window !== 'undefined') {
        window.GanttChart = GanttChart;
        window.buildMermaidFromTasks = buildMermaidFromTasks;
    }
})();
