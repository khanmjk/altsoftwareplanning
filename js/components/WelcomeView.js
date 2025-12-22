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

        // Load static welcome content from hidden template
        const staticWelcome = document.getElementById('welcomeViewContent');
        if (staticWelcome) {
            this.container.innerHTML = staticWelcome.innerHTML;
            this.container.classList.remove('is-hidden');
        } else {
            this.container.innerHTML = '<h1>Welcome</h1><p>Welcome content not found.</p>';
        }
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
}
