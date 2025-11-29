/**
 * SystemSelectionModal
 * A reusable component for displaying the system selection modal.
 */
class SystemSelectionModal {
    constructor() {
        this.overlayId = 'systemSelectionOverlay';
    }

    show(systemNames, onSelect) {
        this.close(); // Close existing if any

        // Create Overlay
        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.className = 'system-selection-overlay';

        // Create Modal
        const modal = document.createElement('div');
        modal.className = 'system-selection-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'system-selection-header';
        header.innerHTML = `<h2>Select System</h2>`;
        modal.appendChild(header);

        // List
        const list = document.createElement('ul');
        list.className = 'system-selection-list';

        systemNames.forEach(systemName => {
            const li = document.createElement('li');
            li.className = 'system-selection-item';
            li.innerHTML = `
                <div class="system-selection-item-content">
                    <div class="system-icon">
                        <i class="fas fa-cube"></i>
                    </div>
                    <div class="system-info">
                        <div class="system-name">${systemName}</div>
                        <div class="system-meta">Last modified: Today</div>
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: #cbd5e1; font-size: 0.8rem;"></i>
            `;
            li.onclick = () => {
                if (typeof onSelect === 'function') {
                    onSelect(systemName);
                }
                this.close();
            };
            list.appendChild(li);
        });
        modal.appendChild(list);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'system-selection-footer';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn-modal-cancel';
        cancelButton.innerText = 'Cancel';
        cancelButton.onclick = () => this.close();
        footer.appendChild(cancelButton);
        modal.appendChild(footer);

        // Assemble
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
    }

    close() {
        const existingOverlay = document.getElementById(this.overlayId);
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }
    }
}

// Export to window
if (typeof window !== 'undefined') {
    window.SystemSelectionModal = SystemSelectionModal;
}
