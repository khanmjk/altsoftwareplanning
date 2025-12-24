/**
 * NotificationManager
 * Replaces legacy alert(), confirm(), and prompt() with modern UI components.
 */
class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.history = [];
        this.listeners = new Set();
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
     * Shows a toast notification and records it to history.
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'error', 'warning', 'info'.
     * @param {number} duration - Duration in ms (default 5000).
     */
    showToast(message, type = 'info', duration = 5000) {
        const entry = {
            id: `notif-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            message,
            type,
            timestamp: Date.now(),
            read: false
        };
        this.history.push(entry);
        this._notifyListeners();

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

        // Build toast using DOM creation instead of innerHTML
        const toastIcon = document.createElement('div');
        toastIcon.className = 'toast-icon';
        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        toastIcon.appendChild(icon);

        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';
        const toastTitle = document.createElement('div');
        toastTitle.className = 'toast-title';
        toastTitle.textContent = title;
        const toastMessage = document.createElement('div');
        toastMessage.className = 'toast-message';
        toastMessage.textContent = message;
        toastContent.appendChild(toastTitle);
        toastContent.appendChild(toastMessage);

        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => toast.remove());

        toast.appendChild(toastIcon);
        toast.appendChild(toastContent);
        toast.appendChild(closeButton);

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
     * Returns a copy of recorded notifications (newest first).
     */
    getNotifications() {
        return [...this.history].sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Marks all notifications as read.
     */
    markAllRead() {
        this.history = this.history.map(n => ({ ...n, read: true }));
        this._notifyListeners();
    }

    /**
     * Removes a notification by id.
     * @param {string} id
     */
    removeNotification(id) {
        const before = this.history.length;
        this.history = this.history.filter(n => n.id !== id);
        if (this.history.length !== before) {
            this._notifyListeners();
        }
    }

    /**
     * Adds a listener that is called whenever history changes.
     * @param {function} cb
     * @returns {function} unsubscribe
     */
    addListener(cb) {
        if (typeof cb !== 'function') return () => { };
        this.listeners.add(cb);
        // push initial state
        cb(this.getNotifications());
        return () => this.listeners.delete(cb);
    }

    _notifyListeners() {
        const snapshot = this.getNotifications();
        this.listeners.forEach(fn => {
            try { fn(snapshot); } catch (err) { console.error('Notification listener failed', err); }
        });
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

            // Create modal using DOM
            const modal = document.createElement('div');
            modal.className = 'notification-modal';

            // Header
            const header = document.createElement('div');
            header.className = 'notification-modal-header';
            const titleEl = document.createElement('h3');
            titleEl.className = 'notification-modal-title';
            titleEl.textContent = title;
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '\u00d7';
            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            // Body
            const body = document.createElement('div');
            body.className = 'notification-modal-body';
            body.textContent = message;

            // Footer
            const footer = document.createElement('div');
            footer.className = 'notification-modal-footer';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'notification-btn notification-btn-secondary';
            cancelBtn.textContent = cancelText;
            const confirmBtn = document.createElement('button');
            confirmBtn.className = `notification-btn notification-btn-${confirmStyle}`;
            confirmBtn.textContent = confirmText;
            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);

            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const close = (result) => {
                overlay.remove();
                resolve(result);
            };

            confirmBtn.addEventListener('click', () => close(true));
            cancelBtn.addEventListener('click', () => close(false));
            closeBtn.addEventListener('click', () => close(false));

            // Close on click outside
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });
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

            // Create modal using DOM
            const modal = document.createElement('div');
            modal.className = 'notification-modal';

            // Header
            const header = document.createElement('div');
            header.className = 'notification-modal-header';
            const titleEl = document.createElement('h3');
            titleEl.className = 'notification-modal-title';
            titleEl.textContent = title;
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '\u00d7';
            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            // Body
            const body = document.createElement('div');
            body.className = 'notification-modal-body';
            const label = document.createElement('label');
            label.className = 'notification-modal-label';
            label.textContent = message;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'notification-modal-input';
            input.value = defaultValue;
            body.appendChild(label);
            body.appendChild(input);

            // Footer
            const footer = document.createElement('div');
            footer.className = 'notification-modal-footer';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'notification-btn notification-btn-secondary';
            cancelBtn.textContent = 'Cancel';
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'notification-btn notification-btn-primary';
            confirmBtn.textContent = 'OK';
            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);

            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            input.focus();
            input.select();

            const close = (result) => {
                overlay.remove();
                resolve(result);
            };

            confirmBtn.addEventListener('click', () => close(input.value));
            cancelBtn.addEventListener('click', () => close(null));
            closeBtn.addEventListener('click', () => close(null));

            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(null);
            });
        });
    }
}

// Export as singleton
const notificationManager = new NotificationManager();
