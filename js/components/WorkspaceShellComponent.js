/**
 * WorkspaceShellComponent
 * Builds the core workspace layout shell (sidebar container, header, toolbar, content).
 */
class WorkspaceShellComponent {
    constructor(rootId) {
        this.root = document.getElementById(rootId);
    }

    render() {
        if (!this.root) {
            console.error('WorkspaceShellComponent: Root container not found.');
            return;
        }

        this._clearElement(this.root);

        const appContainer = document.createElement('div');
        appContainer.id = 'app-container';

        const sidebar = document.createElement('div');
        sidebar.id = 'sidebar';

        const mainWrapper = document.createElement('div');
        mainWrapper.id = 'main-content-wrapper';

        const header = this._buildHeader();
        const toolbar = document.createElement('div');
        toolbar.id = 'workspace-toolbar';
        toolbar.className = 'canvas-toolbar is-hidden';

        const mainContent = document.createElement('div');
        mainContent.id = 'main-content-area';
        mainContent.className = 'canvas-content';

        mainWrapper.appendChild(header);
        mainWrapper.appendChild(toolbar);
        mainWrapper.appendChild(mainContent);

        const extensionHandle = document.createElement('div');
        extensionHandle.id = 'workspace-extension-handle';
        extensionHandle.className = 'is-hidden';
        extensionHandle.setAttribute('aria-hidden', 'true');

        const extensionContainer = document.createElement('aside');
        extensionContainer.id = 'workspace-extension-container';
        extensionContainer.className = 'workspace-extension';
        extensionContainer.setAttribute('aria-hidden', 'true');

        appContainer.appendChild(sidebar);
        appContainer.appendChild(mainWrapper);
        appContainer.appendChild(extensionHandle);
        appContainer.appendChild(extensionContainer);

        this.root.appendChild(appContainer);
    }

    _buildHeader() {
        const header = document.createElement('header');
        header.id = 'workspace-header';
        header.className = 'canvas-header';

        const left = document.createElement('div');
        left.className = 'canvas-header__left';

        const breadcrumbs = document.createElement('div');
        breadcrumbs.id = 'workspace-breadcrumbs';
        breadcrumbs.className = 'canvas-header__breadcrumbs';

        const title = document.createElement('h1');
        title.id = 'workspace-title';
        title.className = 'canvas-header__title';
        title.textContent = 'Workspace';

        left.appendChild(breadcrumbs);
        left.appendChild(title);

        const right = document.createElement('div');
        right.className = 'canvas-header__right';

        const actions = document.createElement('div');
        actions.id = 'workspace-actions';
        right.appendChild(actions);

        const notificationWrapper = document.createElement('div');
        notificationWrapper.className = 'notification-wrapper';

        const notifBtn = document.createElement('button');
        notifBtn.id = 'header-notifications-btn';
        notifBtn.className = 'header-btn';
        notifBtn.type = 'button';
        notifBtn.title = 'Notifications';

        const notifIcon = document.createElement('i');
        notifIcon.className = 'fas fa-bell';
        notifBtn.appendChild(notifIcon);

        const notifBadge = document.createElement('span');
        notifBadge.id = 'notification-badge';
        notifBadge.className = 'notification-badge is-hidden';
        notifBtn.appendChild(notifBadge);

        const notifDropdown = document.createElement('div');
        notifDropdown.id = 'notifications-dropdown';
        notifDropdown.className = 'dropdown-menu notifications-dropdown';

        const dropdownHeader = document.createElement('div');
        dropdownHeader.className = 'notifications-dropdown__header';

        const dropdownTitle = document.createElement('span');
        dropdownTitle.textContent = 'Notifications';

        const dropdownMarkRead = document.createElement('span');
        dropdownMarkRead.id = 'notifications-mark-read';
        dropdownMarkRead.className = 'notifications-dropdown__mark-read';
        dropdownMarkRead.textContent = 'Mark all read';

        dropdownHeader.appendChild(dropdownTitle);
        dropdownHeader.appendChild(dropdownMarkRead);

        const notifList = document.createElement('div');
        notifList.id = 'notifications-list';
        notifList.className = 'notifications-dropdown__content';

        notifDropdown.appendChild(dropdownHeader);
        notifDropdown.appendChild(notifList);

        notificationWrapper.appendChild(notifBtn);
        notificationWrapper.appendChild(notifDropdown);
        right.appendChild(notificationWrapper);

        const aiBtn = document.createElement('button');
        aiBtn.id = 'header-ai-btn';
        aiBtn.className = 'header-btn';
        aiBtn.type = 'button';
        aiBtn.title = 'AI Assistant';

        const aiIcon = document.createElement('i');
        aiIcon.className = 'fas fa-robot';
        aiBtn.appendChild(aiIcon);

        right.appendChild(aiBtn);

        header.appendChild(left);
        header.appendChild(right);

        return header;
    }

    _clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
