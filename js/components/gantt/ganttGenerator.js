// Unified Gantt syntax generator: delegates to ganttAdapter + ganttChart helpers.
(function() {
    function generateGanttSyntax(initiatives, groupBy = 'Initiative', viewYear = new Date().getFullYear(), options = {}) {
        const selectedTeam = options.selectedTeamId || null;
        const tasks = (window.ganttAdapter && typeof window.ganttAdapter.buildTasksFromInitiatives === 'function')
            ? window.ganttAdapter.buildTasksFromInitiatives({
                initiatives: initiatives || [],
                workPackages: currentSystemData?.workPackages || [],
                viewBy: groupBy,
                filters: {},
                year: viewYear,
                selectedTeam
            })
            : [];
        if (typeof window.buildMermaidFromTasks === 'function') {
            return window.buildMermaidFromTasks(tasks, { title: `Detailed Plan - ${viewYear}` });
        }
        return 'gantt\ndateFormat YYYY-MM-DD\nsection No Data\nNo data :done, 2025-01-01, 2025-01-02';
    }

    if (typeof window !== 'undefined') {
        window.generateGanttSyntax = generateGanttSyntax;
    }
})();
