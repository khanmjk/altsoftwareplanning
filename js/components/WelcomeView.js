/**
 * WelcomeView
 * 
 * View class for the welcome/home screen.
 * Renders static welcome content from index.html.
 */
class WelcomeView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
    }

    render(container) {
        if (container) {
            this.container = container;
        } else if (this.containerId) {
            this.container = document.getElementById(this.containerId);
        }

        if (!this.container) {
            console.error('WelcomeView: No container provided');
            return;
        }

        workspaceComponent.setPageMetadata({
            title: 'Welcome',
            breadcrumbs: [],
            actions: []
        });
        workspaceComponent.setToolbar(null);

        this._clearElement(this.container);

        const view = document.createElement('div');
        view.className = 'welcome-view';

        const header = document.createElement('div');
        header.className = 'welcome-header';

        const title = document.createElement('h1');
        title.className = 'welcome-header__title';
        title.textContent = 'Welcome to SMT Platform';

        const subtitle = document.createElement('p');
        subtitle.className = 'welcome-header__subtitle';
        subtitle.textContent = 'Your comprehensive, one-stop shop for Software Managers. Plan roadmaps, visualize architecture, forecast resources, and manage team capacity, all in one unified workspace.';

        header.appendChild(title);
        header.appendChild(subtitle);

        const grid = document.createElement('div');
        grid.className = 'welcome-grid';

        const loadCard = this._createActionCard({
            title: 'Load Existing System',
            description: 'Access your saved architecture plans, roadmaps, and capacity configurations.',
            iconClass: 'fas fa-folder-open',
            iconModifier: 'action-card__icon-container--blue',
            onClick: () => {
                navigationManager.navigateTo('systemsView');
            }
        });

        const createCard = this._createActionCard({
            title: 'Create New System',
            description: 'Start a new project from scratch. Define teams, services, and strategic goals.',
            iconClass: 'fas fa-plus-circle',
            iconModifier: 'action-card__icon-container--green',
            onClick: () => {
                SystemService.createAndActivate();
            }
        });

        const aiCard = this._createActionCard({
            id: 'createWithAiCard',
            title: 'Create with AI',
            description: 'Generate a complete system architecture and plan using AI assistance.',
            iconClass: 'fas fa-magic',
            iconModifier: 'action-card__icon-container--purple',
            isHidden: true
        });

        const docsCard = this._createActionCard({
            title: 'Documentation',
            description: 'Learn how to use the platform, best practices for modeling, and more.',
            iconClass: 'fas fa-book',
            iconModifier: 'action-card__icon-container--gray',
            onClick: () => {
                navigationManager.navigateTo('helpView');
            }
        });

        grid.appendChild(loadCard);
        grid.appendChild(createCard);
        grid.appendChild(aiCard);
        grid.appendChild(docsCard);

        view.appendChild(header);
        view.appendChild(grid);
        this.container.appendChild(view);
    }

    /**
     * Returns structured context data for AI Chat Panel integration
     */
    getAIContext() {
        return {
            viewTitle: 'Welcome',
            description: 'Application home screen'
        };
    }

    _createActionCard({ id, title, description, iconClass, iconModifier, onClick = () => {}, isHidden = false }) {
        const card = document.createElement('div');
        card.className = 'action-card';
        if (id) {
            card.id = id;
        }
        if (isHidden) {
            card.classList.add('is-hidden');
        }
        card.addEventListener('click', onClick);

        const iconContainer = document.createElement('div');
        iconContainer.className = `action-card__icon-container ${iconModifier}`;
        const icon = document.createElement('i');
        icon.className = `action-card__icon ${iconClass}`;
        iconContainer.appendChild(icon);

        const heading = document.createElement('h3');
        heading.className = 'action-card__title';
        heading.textContent = title;

        const copy = document.createElement('p');
        copy.className = 'action-card__description';
        copy.textContent = description;

        card.appendChild(iconContainer);
        card.appendChild(heading);
        card.appendChild(copy);

        return card;
    }

    _clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
