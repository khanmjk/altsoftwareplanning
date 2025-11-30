/**
 * NotificationManager
 * Replaces legacy alert(), confirm(), and prompt() with modern UI components.
 */
class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        } else {
            this.toastContainer = document.querySelector('.toast-container');
        }
    }

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'error', 'warning', 'info'.
     * @param {number} duration - Duration in ms (default 5000).
     */
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconClass = 'fa-info-circle';
        let title = 'Info';

        switch (type) {
            case 'success':
                iconClass = 'fa-check-circle';
                title = 'Success';
                break;
            case 'error':
                iconClass = 'fa-exclamation-circle';
                title = 'Error';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                title = 'Warning';
                break;
        }

        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${iconClass}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.toastContainer.appendChild(toast);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('closing');
                toast.addEventListener('animationend', () => {
                    if (toast.parentElement) toast.remove();
                });
            }, duration);
        }
    }

    /**
     * Shows a confirmation modal.
     * @param {string} message - The confirmation message.
     * @param {string} title - The modal title (optional).
     * @param {object} options - { confirmText: 'Yes', cancelText: 'Cancel', confirmStyle: 'primary'|'danger' }
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise.
     */
    confirm(message, title = 'Confirmation', options = {}) {
        return new Promise((resolve) => {
            const confirmText = options.confirmText || 'Confirm';
            const cancelText = options.cancelText || 'Cancel';
            const confirmStyle = options.confirmStyle || 'primary'; // 'primary' or 'danger'

            const overlay = document.createElement('div');
            overlay.className = 'notification-modal-overlay';

            overlay.innerHTML = `
                <div class="notification-modal">
                    <div class="notification-modal-header">
                        <h3 class="notification-modal-title">${title}</h3>
                        <button class="toast-close" id="modalCloseBtn">&times;</button>
                    </div>
                    <div class="notification-modal-body">
                        ${message}
                    </div>
                    <div class="notification-modal-footer">
                        <button class="notification-btn notification-btn-secondary" id="modalCancelBtn">${cancelText}</button>
                        <button class="notification-btn notification-btn-${confirmStyle}" id="modalConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const close = (result) => {
                overlay.remove();
                resolve(result);
            };

            document.getElementById('modalConfirmBtn').onclick = () => close(true);
            document.getElementById('modalCancelBtn').onclick = () => close(false);
            document.getElementById('modalCloseBtn').onclick = () => close(false);

            // Close on click outside
            overlay.onclick = (e) => {
                if (e.target === overlay) close(false);
            };
        });
    }

    /**
     * Shows a prompt modal for user input.
     * @param {string} message - The prompt message.
     * @param {string} defaultValue - Default value for the input.
     * @param {string} title - The modal title.
     * @returns {Promise<string|null>} - Resolves to the input value or null if canceled.
     */
    prompt(message, defaultValue = '', title = 'Input Required') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'notification-modal-overlay';

            overlay.innerHTML = `
                <div class="notification-modal">
                    <div class="notification-modal-header">
                        <h3 class="notification-modal-title">${title}</h3>
                        <button class="toast-close" id="modalCloseBtn">&times;</button>
                    </div>
                    <div class="notification-modal-body">
                        <label style="display:block; margin-bottom:5px;">${message}</label>
                        <input type="text" class="notification-modal-input" id="modalInput" value="${defaultValue}">
                    </div>
                    <div class="notification-modal-footer">
                        <button class="notification-btn notification-btn-secondary" id="modalCancelBtn">Cancel</button>
                        <button class="notification-btn notification-btn-primary" id="modalConfirmBtn">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const input = document.getElementById('modalInput');
            input.focus();
            input.select();

            const close = (result) => {
                overlay.remove();
                resolve(result);
            };

            document.getElementById('modalConfirmBtn').onclick = () => close(input.value);
            document.getElementById('modalCancelBtn').onclick = () => close(null);
            document.getElementById('modalCloseBtn').onclick = () => close(null);

            // Handle Enter key
            input.onkeydown = (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) close(null);
            };
        });
    }
}

// Expose to window
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}
