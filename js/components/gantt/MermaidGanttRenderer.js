/**
 * Mermaid implementation of the GanttRenderer.
 * Encapsulates all Mermaid-specific logic.
 */
class MermaidGanttRenderer extends GanttRenderer {
    constructor(container, mermaidInstance) {
        super(container);
        // Use MermaidService if available, fallback to direct mermaid global
        this.mermaid = mermaidInstance || MermaidService.getInstance() || (typeof mermaid !== 'undefined' ? mermaid : null);
        this.config = {
            theme: "default",
            // themeVariables: {
            //     primaryColor: "#cfe2f3",
            //     secondaryColor: "#e1f5fe",
            //     tertiaryColor: "#fff",
            //     taskBkgColor: "#4a90e2",
            //     taskTextColor: "#ffffff",
            //     activeTaskBkgColor: "#4a90e2",
            //     activeTaskTextColor: "#ffffff",
            //     doneBkgColor: "#a0c4ff",
            //     doneTextColor: "#333333",
            //     critBkgColor: "#ff6b6b",
            //     critTextColor: "#ffffff",
            //     sectionBkgColor: "#ffffff",
            //     sectionBkgColor2: "#fcfcfc",
            //     altSectionBkgColor: "#ffffff"
            // },
            gantt: {
                barHeight: 60,
                barGap: 10,
                fontSize: 18,
                sectionFontSize: 18,
                numberSectionStyles: 4,
                axisFormat: "%Y-%m-%d",
                topPadding: 120,
                leftPadding: 450,
                gridLineStartPadding: 50
            }
        };
    }

    _appendSvgToContainer(svgMarkup) {
        if (!this.container || !svgMarkup) return false;
        const parser = new DOMParser();
        const parsed = parser.parseFromString(svgMarkup, 'image/svg+xml');
        const svgEl = parsed.documentElement;
        if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
            return false;
        }
        const doc = this.container.ownerDocument || document;
        this.container.appendChild(doc.importNode(svgEl, true));
        return true;
    }

    _renderErrorMessage(message) {
        if (!this.container) return;
        const doc = this.container.ownerDocument || document;
        const wrapper = doc.createElement('div');
        wrapper.className = 'mermaid-error';
        const strong = doc.createElement('strong');
        strong.textContent = 'Error rendering Gantt chart.';
        wrapper.appendChild(strong);
        if (message) {
            wrapper.appendChild(doc.createElement('br'));
            const detail = doc.createElement('small');
            detail.textContent = message;
            wrapper.appendChild(detail);
        }
        this.container.appendChild(wrapper);
    }

    async render(tasks, options = {}) {
        if (!this.container) return;
        if (!tasks || tasks.length === 0) {
            this.container.textContent = 'No initiatives to display.';
            return;
        }
        if (!this.mermaid || typeof this.mermaid.render !== 'function') {
            this.container.textContent = 'Mermaid is not available.';
            return;
        }

        const syntax = this._buildMermaidSyntax(tasks, options);
        console.log("Mermaid Syntax:", syntax); // DEBUG LOG
        const renderId = `gantt-${Date.now()}`;

        try {
            this.clear();
            const result = await this.mermaid.render(renderId, syntax);
            const appended = this._appendSvgToContainer(result.svg);
            if (!appended) {
                this._renderErrorMessage('Unable to parse diagram output.');
                return;
            }
            this._applyEnhancements(tasks);
        } catch (err) {
            console.error("MermaidGanttRenderer render failed:", err);
            this._renderErrorMessage(err.message);
        }
    }

    _buildMermaidSyntax(tasks, options) {
        const lines = [];

        // Configuration block
        lines.push(`%%{init: ${JSON.stringify(this.config)} }%%`);

        lines.push('gantt');
        lines.push('dateFormat YYYY-MM-DD');
        lines.push('axisFormat %Y-%m-%d');

        const title = options.title || 'Detailed Plan';
        lines.push(`title ${title}`);

        // Today marker
        lines.push(`todayMarker stroke-width:2px,stroke:#f00,opacity:0.7`);

        // Define Classes for Hierarchy - TEMPORARILY DISABLED due to Mermaid syntax error
        // lines.push('classDef initiative fill:#6f42c1,stroke:#5a32a3,color:#fff');
        // lines.push('classDef workPackage fill:#0366d6,stroke:#024ea2,color:#fff');
        // lines.push('classDef assignment fill:#2ea44f,stroke:#22863a,color:#fff');

        const groupMap = new Map();
        tasks.forEach(task => {
            const group = task.group || 'All';
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group).push(task);
        });

        Array.from(groupMap.entries()).forEach(([group, tasks]) => {
            lines.push(`section ${this._escapeLabel(group)}`);
            tasks.forEach(task => {
                const statusToken = this._mapStatusToToken(task.status);
                const safeLabel = this._escapeLabel(task.label || task.title);

                const start = task.start;
                const end = task.end;

                if (this._isValidDate(start) && this._isValidDate(end)) {
                    lines.push(`${safeLabel} :${statusToken}, ${task.id}, ${start}, ${end}`);
                }
            });
        });

        // Apply Classes to Tasks - TEMPORARILY DISABLED
        // tasks.forEach(task => {
        //     if (task.type) {
        //         lines.push(`class ${task.id} ${task.type}`);
        //     }
        // });

        return lines.join('\n');
    }

    _applyEnhancements(tasks) {
        const svg = this.container.querySelector('svg');
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.minWidth = '100%';
            svg.style.minHeight = '100%';
            svg.style.maxWidth = 'none';
            svg.style.maxHeight = 'none';
        }
        // Add tooltips
        const taskGroups = this.container.querySelectorAll('.task');
        taskGroups.forEach(groupEl => {
            const taskId = groupEl.id?.replace('task-', '') || null;
            const task = tasks.find(t => t.id === taskId);
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

    _mapStatusToToken(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('done') || s.includes('complete')) return 'done';
        if (s.includes('risk') || s.includes('block')) return 'crit';
        return 'active';
    }

    _escapeLabel(text) {
        return (text || '').replace(/:/g, ' -').replace(/,/g, ' / ');
    }

    _isValidDate(str) {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
    }
}
