/**
 * AIGenerationStatsModal
 * Modal component for displaying AI generation statistics.
 */
class AIGenerationStatsModal {
    constructor() {
        this.modalElement = null;
        this.contentElement = null;
    }

    static getInstance() {
        if (!AIGenerationStatsModal._instance) {
            AIGenerationStatsModal._instance = new AIGenerationStatsModal();
        }
        return AIGenerationStatsModal._instance;
    }

    render() {
        if (this.modalElement) return;

        const modal = document.createElement('div');
        modal.id = 'aiGenerationStatsModal';
        modal.className = 'modal';

        const wrapper = document.createElement('div');
        wrapper.className = 'modal-content-wrapper';

        const header = document.createElement('div');
        header.className = 'modal-header';

        const title = document.createElement('h3');
        title.textContent = 'AI Generation Statistics';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-button';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body';

        const content = document.createElement('pre');
        content.id = 'aiGenerationStatsContent';
        content.className = 'ai-stats-pre';
        body.appendChild(content);

        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        const dismissButton = document.createElement('button');
        dismissButton.type = 'button';
        dismissButton.className = 'btn-primary';
        dismissButton.textContent = 'Got it';
        dismissButton.addEventListener('click', () => this.close());

        footer.appendChild(dismissButton);

        wrapper.appendChild(header);
        wrapper.appendChild(body);
        wrapper.appendChild(footer);
        modal.appendChild(wrapper);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.close();
            }
        });

        document.body.appendChild(modal);

        this.modalElement = modal;
        this.contentElement = content;
    }

    open(contentText) {
        this.render();
        if (this.contentElement && typeof contentText === 'string') {
            this.contentElement.textContent = contentText;
        }
        if (this.modalElement) {
            this.modalElement.classList.add('is-open');
        }
    }

    close() {
        if (this.modalElement) {
            this.modalElement.classList.remove('is-open');
        }
    }
}
