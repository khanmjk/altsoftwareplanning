(function() {
    function buildFrappeTasks({ initiatives = [], workPackages = [], year }) {
        if (typeof ensureWorkPackagesForInitiatives === 'function' && typeof currentSystemData !== 'undefined') {
            ensureWorkPackagesForInitiatives(currentSystemData, year);
        }

        const rawTasks = [];
        const yearVal = year || new Date().getFullYear();
        const defaultStart = `${yearVal}-01-15`;
        const defaultEnd = `${yearVal}-11-01`;

        const wpByInit = new Map();
        workPackages.forEach(wp => {
            if (!wpByInit.has(wp.initiativeId)) wpByInit.set(wp.initiativeId, []);
            wpByInit.get(wp.initiativeId).push(wp);
        });

        initiatives.forEach(init => {
            const wpList = wpByInit.get(init.initiativeId) || [];
            
            const initStart = init.attributes?.startDate || defaultStart;
            const initEnd = init.targetDueDate || defaultEnd;
            
            rawTasks.push({
                id: `init-${init.initiativeId}`,
                name: init.title || 'Untitled Initiative',
                start: initStart,
                end: initEnd,
                progress: 0,
                dependencies: [],
                custom_class: 'gantt-initiative-bar',
                _originalId: init.initiativeId,
                _type: 'initiative',
                _isParent: true
            });

            wpList.forEach(wp => {
                let start = wp.startDate || initStart;
                let end = wp.endDate || initEnd;

                // Fix: Prevent start > end errors which crash Frappe
                if (new Date(start) > new Date(end)) end = start;

                const rawDeps = (wp.dependencies || []).map(d => `wp-${d}`);

                rawTasks.push({
                    id: `wp-${wp.workPackageId}`,
                    name: wp.title || 'Phase',
                    start: start,
                    end: end,
                    progress: calculateProgress(wp.status),
                    dependencies: rawDeps, 
                    custom_class: 'gantt-wp-bar',
                    _originalId: wp.workPackageId,
                    _initiativeId: init.initiativeId,
                    _type: 'workPackage'
                });
            });
        });

        // CRITICAL: Sanitize Dependencies
        // Frappe Gantt crashes if a dependency ID refers to a task that doesn't exist (e.g. filtered out)
        const validIds = new Set(rawTasks.map(t => t.id));
        
        const safeTasks = rawTasks.map(task => {
            const safeDeps = (task.dependencies || []).filter(depId => validIds.has(depId));
            return {
                ...task,
                dependencies: safeDeps.join(',') // Frappe expects comma-separated string
            };
        });

        return safeTasks;
    }

    function calculateProgress(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('completed') || s.includes('done')) return 100;
        if (s.includes('in progress')) return 50;
        if (s.includes('blocked')) return 10;
        return 0;
    }

    if (typeof window !== 'undefined') {
        window.frappeGanttAdapter = { buildFrappeTasks };
    }
})();
