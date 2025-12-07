// Unified Gantt syntax generator: delegates to ganttAdapter + ganttChart helpers.
(function () {
    function generateGanttSyntax(initiatives, groupBy = 'Initiative', viewYear = new Date().getFullYear(), options = {}) {
        const selectedTeam = options.selectedTeamId || null;
        const tasks = (ganttAdapter && typeof ganttAdapter.buildTasksFromInitiatives === 'function')
            ? ganttAdapter.buildTasksFromInitiatives({
                initiatives: initiatives || [],
                workPackages: SystemService.getCurrentSystem()?.workPackages || [],
                viewBy: groupBy,
                filters: {},
                year: viewYear,
                selectedTeam
            })
            : [];
        buildMermaidFromTasks(tasks, 'gantt-chart-container', (task) => {
            console.log('Task clicked:', task);
            // openEditTaskModal(task); // user can implement
        });
        return 'gantt\ndateFormat YYYY-MM-DD\nsection No Data\nNo data :done, 2025-01-01, 2025-01-02';
    }

    // Export generateGanttSyntax globally
    const generateGanttSyntax_export = generateGanttSyntax;
})();
