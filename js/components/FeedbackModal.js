/**
 * FeedbackModal
 * Modal component for collecting user feedback.
 * Follows the existing modal patterns (RoadmapInitiativeModal).
 */
class FeedbackModal {
    constructor() {
        this.modalElement = null;
        this.isOpen = false;
        this.themedTypeSelect = null;

        // Form state
        this.feedbackType = 'General Feedback';
        this.description = '';
        this.email = '';
        this.includeContext = true;
    }

    /**
     * Singleton accessor
     * @returns {FeedbackModal}
     */
    static getInstance() {
        if (!FeedbackModal._instance) {
            FeedbackModal._instance = new FeedbackModal();
        }
        return FeedbackModal._instance;
    }

    /**
     * Render the modal DOM structure
     */
    render() {
        // Remove existing modal if present
        if (this.modalElement) {
            this.modalElement.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'feedbackModal';
        modal.className = 'modal feedback-modal';

        // Create modal content wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-content-wrapper feedback-modal__wrapper';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';

        const title = document.createElement('h3');
        title.textContent = 'Provide Feedback';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-button';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body feedback-modal__body';

        // Feedback Type
        const typeGroup = this._createFormGroup('Feedback Type');

        const types = [
            { value: 'Bug Report', text: 'Bug Report' },
            { value: 'Feature Request', text: 'Feature Request' },
            { value: 'General Feedback', text: 'General Feedback' },
            { value: 'Question', text: 'Question' }
        ];

        this.themedTypeSelect = new ThemedSelect({
            options: types,
            value: this.feedbackType,
            id: 'feedback-type',
            placeholder: 'Select feedback type...',
            onChange: (value) => {
                this.feedbackType = value;
            }
        });

        typeGroup.appendChild(this.themedTypeSelect.render());
        body.appendChild(typeGroup);

        // Description
        const descGroup = this._createFormGroup('Description', true);
        const descTextarea = document.createElement('textarea');
        descTextarea.id = 'feedback-description';
        descTextarea.className = 'feedback-modal__textarea';
        descTextarea.placeholder = 'Please describe your feedback, bug, or feature request...';
        descTextarea.rows = 6;
        descTextarea.required = true;
        descTextarea.addEventListener('input', (e) => {
            this.description = e.target.value;
        });
        descGroup.appendChild(descTextarea);
        body.appendChild(descGroup);

        // Email (optional)
        const emailGroup = this._createFormGroup('Email (optional)');
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'feedback-email';
        emailInput.className = 'feedback-modal__input';
        emailInput.placeholder = 'your@email.com (for follow-up)';
        emailInput.addEventListener('input', (e) => {
            this.email = e.target.value;
        });
        emailGroup.appendChild(emailInput);
        body.appendChild(emailGroup);

        // Include Context Checkbox
        const contextGroup = document.createElement('div');
        contextGroup.className = 'feedback-modal__checkbox-group';

        const contextCheckbox = document.createElement('input');
        contextCheckbox.type = 'checkbox';
        contextCheckbox.id = 'feedback-include-context';
        contextCheckbox.checked = this.includeContext;
        contextCheckbox.addEventListener('change', (e) => {
            this.includeContext = e.target.checked;
        });

        const contextLabel = document.createElement('label');
        contextLabel.htmlFor = 'feedback-include-context';
        contextLabel.textContent = 'Include app context (helps with debugging)';

        contextGroup.appendChild(contextCheckbox);
        contextGroup.appendChild(contextLabel);
        body.appendChild(contextGroup);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this.close());

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.id = 'feedback-submit-btn';
        submitBtn.className = 'btn-primary';
        submitBtn.textContent = 'Submit Feedback';
        submitBtn.addEventListener('click', () => this.submit());

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        // Assemble
        wrapper.appendChild(header);
        wrapper.appendChild(body);
        wrapper.appendChild(footer);
        modal.appendChild(wrapper);

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });

        document.body.appendChild(modal);
        this.modalElement = modal;
    }

    /**
     * Create a form group with label
     * @param {string} labelText 
     * @param {boolean} isRequired 
     * @returns {HTMLElement}
     */
    _createFormGroup(labelText, isRequired = false) {
        const group = document.createElement('div');
        group.className = 'feedback-modal__form-group';

        const label = document.createElement('label');
        label.className = 'feedback-modal__label';
        label.textContent = labelText;
        if (isRequired) {
            const asterisk = document.createElement('span');
            asterisk.className = 'feedback-modal__required';
            asterisk.textContent = ' *';
            label.appendChild(asterisk);
        }

        group.appendChild(label);
        return group;
    }

    /**
     * Open the modal
     */
    open() {
        // Check if worker is configured
        if (!FeedbackService.isConfigured()) {
            notificationManager.showToast(
                'Feedback service is not configured. Please deploy the Cloudflare Worker first.',
                'warning'
            );
            console.warn('FeedbackModal: Worker URL not configured. See FeedbackService.js');
            // Still allow opening for demo purposes, but warn
        }

        this.render();
        this.resetForm();
        this.modalElement.style.display = 'flex';
        this.isOpen = true;

        // Focus description field
        setTimeout(() => {
            const desc = document.getElementById('feedback-description');
            if (desc) desc.focus();
        }, 100);
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modalElement) {
            this.modalElement.style.display = 'none';
        }
        this.isOpen = false;
    }

    /**
     * Reset form fields
     */
    resetForm() {
        this.feedbackType = 'General Feedback';
        this.description = '';
        this.email = '';
        this.includeContext = true;

        if (this.themedTypeSelect) {
            this.themedTypeSelect.setValue(this.feedbackType);
        }

        const descTextarea = document.getElementById('feedback-description');
        const emailInput = document.getElementById('feedback-email');
        const contextCheckbox = document.getElementById('feedback-include-context');

        if (descTextarea) descTextarea.value = '';
        if (emailInput) emailInput.value = '';
        if (contextCheckbox) contextCheckbox.checked = true;
    }

    /**
     * Submit the feedback
     */
    async submit() {
        // Validate
        if (!this.description.trim()) {
            notificationManager.showToast('Please enter a description for your feedback.', 'error');
            const descField = document.getElementById('feedback-description');
            if (descField) descField.focus();
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('feedback-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const result = await FeedbackService.submitFeedback({
                type: this.feedbackType,
                description: this.description,
                email: this.email,
                includeContext: this.includeContext
            });

            if (result.success) {
                notificationManager.showToast(
                    `Thank you! Your feedback has been submitted. (Issue #${result.issueNumber})`,
                    'success'
                );
                this.close();
            } else {
                notificationManager.showToast(
                    `Failed to submit feedback: ${result.error}`,
                    'error'
                );
            }
        } catch (error) {
            console.error('FeedbackModal: Submit error', error);
            notificationManager.showToast(
                'An unexpected error occurred. Please try again.',
                'error'
            );
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}
