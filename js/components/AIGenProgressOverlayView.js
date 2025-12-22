/**
 * AIGenProgressOverlayView
 * Manages the "Create with AI" flow, including the loading overlay and the orchestration
 * of the AI generation process.
 */
class AIGenProgressOverlayView {
    constructor() {
        this.overlayElement = null;
        this.messageElement = null;
        this.isGenerated = false; // Track if we created the DOM

        // Bind methods
        this.startGenerationFlow = this.startGenerationFlow.bind(this);
    }

    /**
     * Ensures the DOM elements exist.
     * Creates them if they don't.
     */
    _ensureDom() {
        if (this.overlayElement) return;

        // check if it already exists in DOM (e.g. static html)
        const existing = document.getElementById('aiGenOverlay');
        if (existing) {
            this.overlayElement = existing;
            this.messageElement = existing.querySelector('.ai-gen-overlay__text');
            return;
        }

        // Create dynamically
        const overlay = document.createElement('div');
        overlay.id = 'aiGenOverlay';
        overlay.className = 'ai-gen-overlay';

        const spinner = document.createElement('div');
        spinner.className = 'ai-gen-overlay__spinner';

        const message = document.createElement('p');
        message.className = 'ai-gen-overlay__text';
        message.textContent = 'Initializing AI...';

        overlay.appendChild(spinner);
        overlay.appendChild(message);

        document.body.appendChild(overlay);

        this.overlayElement = overlay;
        this.messageElement = message;
        this.isGenerated = true;
    }

    /**
     * Shows the overlay with a message.
     * @param {string} message 
     */
    show(message = 'AI is working...') {
        this._ensureDom();
        if (this.messageElement) this.messageElement.textContent = message;

        // Force reflow to ensure transition works if just created
        this.overlayElement.offsetHeight;

        this.overlayElement.classList.add('visible');
    }

    /**
     * Hides the overlay.
     */
    hide() {
        if (!this.overlayElement) return;
        this.overlayElement.classList.remove('visible');
    }

    /**
     * Updates the text message on the overlay.
     * @param {string} message 
     */
    updateMessage(message) {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    /**
     * The main entry point for the "Create with AI" user flow.
     * Orchestrates the prompt, API call, validation, and saving.
     */
    async startGenerationFlow() {
        const settings = SettingsService.get();
        if (!settings.ai.isEnabled || !settings.ai.apiKey) {
            notificationManager.showToast("AI Assistant mode is not enabled or API key is missing. Please check AI settings.", "error");
            return;
        }

        const prompt = await notificationManager.prompt(
            "Describe the new software system you want to create (e.g., 'A video streaming service like Netflix', 'An e-commerce platform like Amazon'):",
            "",
            "Create New System with AI"
        );

        if (!prompt || prompt.trim().length === 0) {
            console.log("AI system generation cancelled by user.");
            return;
        }

        // 1. Show Overlay
        this.show('AI is generating your system... This may take a moment.');

        // Close any stale stats modal
        if (AIService.closeStatsModal) AIService.closeStatsModal();

        try {
            // 2. Call AI Service
            // Pass the message element as the 'spinnerP' compatible object (wrapper)
            // The service expects an element with .textContent property
            const result = await AIService.generateSystemFromPrompt(
                prompt,
                settings.ai.apiKey,
                settings.ai.provider,
                this.messageElement // Pass the DOM element so service can update progress text
            );

            const newSystemData = result.data;
            const stats = result.stats;

            if (!newSystemData) {
                return; // Error handled in service (usually)
            }

            // 3. Validation
            const { isValid, errors, warnings } = AIService.validateGeneratedSystem(newSystemData);

            if (!isValid) {
                console.error("AI Generation Failed Validation:", errors);
                const errorList = errors.slice(0, 10).join("\n- ");
                notificationManager.showToast(`AI generation failed validation checks.\nErrors:\n- ${errorList}`, "error");
                return;
            }

            if (warnings.length > 0) {
                console.warn("AI Generation Warnings:", warnings);
            }

            // 4. Success & Save
            console.log("AI generation successful and validated:", newSystemData);
            SystemService.setCurrentSystem(newSystemData);

            let finalSystemName = newSystemData.systemName;
            if (SystemService.systemExists(finalSystemName)) {
                finalSystemName = `${finalSystemName} (AI ${Date.now().toString().slice(-5)})`;
                newSystemData.systemName = finalSystemName;
            }

            SystemService.saveSystem(newSystemData, finalSystemName);

            if (stats && AIService.showStatsModal) {
                AIService.showStatsModal(stats);
            }

            notificationManager.showToast(`Successfully created: "${finalSystemName}"!`, "success");

            // 5. Navigate
            SystemService.loadAndActivate(finalSystemName);

        } catch (error) {
            notificationManager.showToast("An error occurred during AI system generation.\nError: " + error.message, "error");
            console.error("Error in AIGenProgressOverlayView:", error);
        } finally {
            // 6. Hide Overlay
            this.hide();
            // Reset text for next time (optional, but good practice)
            setTimeout(() => {
                this.updateMessage('Initializing...');
            }, 300);
        }
    }
    /**
     * Singleton accessor.
     * @returns {AIGenProgressOverlayView}
     */
    static getInstance() {
        if (!AIGenProgressOverlayView.instance) {
            AIGenProgressOverlayView.instance = new AIGenProgressOverlayView();
        }
        return AIGenProgressOverlayView.instance;
    }
}
