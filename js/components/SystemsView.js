class SystemsView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    render() {
        if (!this.container) return;

        const aiEnabled = window.globalSettings?.ai?.isEnabled || false;

        // Button logic: Show always, but disable if AI is not enabled
        const aiButtonHtml = `
            <button class="btn-primary" 
                style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3); ${!aiEnabled ? 'opacity: 0.6; cursor: not-allowed; filter: grayscale(100%);' : ''}" 
                onclick="${aiEnabled ? 'if(window.handleCreateWithAi) window.handleCreateWithAi()' : 'window.notificationManager.showToast(\'Please enable AI in Settings to use this feature.\', \'warning\')'}"
                title="${aiEnabled ? 'Create a new system using AI' : 'Enable AI in Settings to use this feature'}">
                <i class="fas fa-magic" style="margin-right: 8px;"></i> Create with AI
            </button>
        `;

        this.container.innerHTML = `
            <div class="systems-view-container" style="padding: 40px; max-width: 1200px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
                    <h1 style="font-size: 2rem; color: #1e293b; margin: 0;">
                        <i class="fas fa-server" style="margin-right: 10px; color: #64748b;"></i> My Systems
                    </h1>
                    <div style="display: flex; gap: 15px;">
                        ${aiButtonHtml}
                        <button class="btn-primary" onclick="if(window.createNewSystem) window.createNewSystem()">
                            <i class="fas fa-plus" style="margin-right: 5px;"></i> Create New System
                        </button>
                    </div>
                </div>

                <div id="systemsGrid">
                    <!-- Systems will be populated here -->
                    <p>Loading systems...</p>
                </div>
            </div>
        `;

        this.populateSystems(aiButtonHtml);
    }

    populateSystems(aiButtonHtml) {
        const grid = document.getElementById('systemsGrid');
        if (!grid) return;

        const allSystems = this.getAllSystems();
        const sampleKeys = ['StreamView', 'ConnectPro', 'ShopSphere', 'InsightAI', 'FinSecure'];

        const sampleSystems = allSystems.filter(sys => sampleKeys.includes(sys.id));
        const userSystems = allSystems.filter(sys => !sampleKeys.includes(sys.id));

        let html = '';

        // 1. User Systems Section
        html += `
            <div style="margin-bottom: 50px;">
                <h2 style="font-size: 1.5rem; color: #334155; margin-bottom: 20px; border-left: 4px solid #3b82f6; padding-left: 15px;">My Systems</h2>
                ${userSystems.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 25px;">
                        ${userSystems.map(sys => this.renderSystemCard(sys, true)).join('')}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                        <i class="fas fa-box-open" style="font-size: 2rem; color: #94a3b8; margin-bottom: 15px;"></i>
                        <p style="color: #64748b; margin-bottom: 15px;">You haven't created any custom systems yet.</p>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            ${aiButtonHtml}
                            <button class="btn-primary" onclick="if(window.createNewSystem) window.createNewSystem()">Create Your First System</button>
                        </div>
                    </div>
                `}
            </div>
        `;

        // 2. Sample Systems Section
        if (sampleSystems.length > 0) {
            html += `
                <div>
                    <h2 style="font-size: 1.5rem; color: #334155; margin-bottom: 20px; border-left: 4px solid #64748b; padding-left: 15px;">Sample Systems</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 25px;">
                        ${sampleSystems.map(sys => this.renderSystemCard(sys, false)).join('')}
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
        // Remove grid-template-columns from the container as we now have sections
        grid.style.display = 'block';
    }

    renderSystemCard(sys, isUserSystem) {
        return `
            <div class="system-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                <div style="flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div style="width: 50px; height: 50px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-size: 1.2rem;">
                            ${sys.name.charAt(0).toUpperCase()}
                        </div>
                        ${isUserSystem ? `
                        <div class="system-badge" style="background: #f1f5f9; color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">
                            ${sys.lastModified ? new Date(sys.lastModified).toLocaleDateString() : 'Unknown Date'}
                        </div>
                        ` : ''}
                    </div>
                    
                    <h3 style="font-size: 1.25rem; color: #0f172a; margin: 0 0 10px 0;">${sys.name}</h3>
                    <p style="color: #64748b; font-size: 0.95rem; margin: 0 0 20px 0; line-height: 1.5;">
                        ${sys.description || 'No description provided.'}
                    </p>
                </div>

                <div style="display: flex; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 10px;">
                    <button class="btn-primary" style="flex-grow: 1;" onclick="window.systemsViewInstance.loadSystem('${sys.id}')">
                        <i class="fas fa-folder-open" style="margin-right: 5px;"></i> Load
                    </button>
                    ${isUserSystem ? `
                    <button class="btn-secondary" style="color: #ef4444; border-color: #fecaca; background: #fff;" onclick="window.systemsViewInstance.deleteSystem('${sys.id}')" title="Delete System">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getAllSystems() {
        const storageKey = window.LOCAL_STORAGE_KEY || 'architectureVisualization_systems_v10';
        const systemsString = localStorage.getItem(storageKey);
        if (!systemsString) return [];

        try {
            const systemsMap = JSON.parse(systemsString);
            return Object.entries(systemsMap).map(([key, data]) => ({
                id: key, // The key in the map is the system name/ID
                name: data.systemName || key,
                description: data.systemDescription || '',
                lastModified: data.lastModified || null
            })).sort((a, b) => {
                // Sort by last modified descending
                const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
                const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
                return dateB - dateA;
            });
        } catch (e) {
            console.error('Error parsing systems from localStorage', e);
            return [];
        }
    }

    loadSystem(systemKey) {
        if (window.loadSavedSystem) {
            window.loadSavedSystem(systemKey);
        } else {
            console.error('loadSavedSystem function not found');
        }
    }

    async deleteSystem(systemKey) {
        if (await window.notificationManager.confirm(`Are you sure you want to permanently delete "${systemKey}"? This action cannot be undone.`, 'Delete System', { confirmStyle: 'danger' })) {
            const storageKey = window.LOCAL_STORAGE_KEY || 'architectureVisualization_systems_v10';
            const systemsString = localStorage.getItem(storageKey);
            if (systemsString) {
                const systemsMap = JSON.parse(systemsString);
                if (systemsMap[systemKey]) {
                    delete systemsMap[systemKey];
                    localStorage.setItem(storageKey, JSON.stringify(systemsMap));
                    this.render(); // Refresh view
                }
            }
        }
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.SystemsView = SystemsView;
}
