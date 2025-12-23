/**
 * DiagramModal
 * Modal component for rendering Mermaid diagrams.
 */
class DiagramModal {
    constructor() {
        this.modalElement = null;
        this.titleElement = null;
        this.contentElement = null;
    }

    static getInstance() {
        if (!DiagramModal._instance) {
            DiagramModal._instance = new DiagramModal();
        }
        return DiagramModal._instance;
    }

    render() {
        if (this.modalElement) return;

        const modal = document.createElement('div');
        modal.id = 'diagramModal';
        modal.className = 'modal';

        const wrapper = document.createElement('div');
        wrapper.className = 'modal-content-wrapper modal-content-wrapper--diagram';

        const header = document.createElement('div');
        header.className = 'modal-header';

        const title = document.createElement('h3');
        title.id = 'diagramModalTitle';
        title.textContent = 'Generated Diagram';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-button';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body modal-body--diagram';

        const content = document.createElement('div');
        content.id = 'diagramModalContent';
        content.className = 'mermaid diagram-modal__content';
        body.appendChild(content);

        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-secondary';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.close());

        footer.appendChild(closeButton);

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
        this.titleElement = title;
        this.contentElement = content;
    }

    open() {
        this.render();
        if (this.modalElement) {
            this.modalElement.classList.add('is-open');
        }
    }

    close() {
        if (this.modalElement) {
            this.modalElement.classList.remove('is-open');
        }
        if (this.contentElement) {
            this._clearElement(this.contentElement);
        }
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
