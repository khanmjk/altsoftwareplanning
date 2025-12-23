/**
 * AIChatPanelExtension
 * Workspace extension panel that hosts the AI chat UI.
 */
class AIChatPanelExtension {
    constructor() {
        this.id = 'aiChat';
        this.defaultWidth = 400;
        this.minWidth = 300;
    }

    render(container) {
        const panel = document.createElement('div');
        panel.id = 'aiChatPanel';

        const header = document.createElement('div');
        header.className = 'modal-header';

        const title = document.createElement('h3');
        title.id = 'aiChatTitle';
        title.textContent = 'AI Assistant';
        header.appendChild(title);

        const closeButton = document.createElement('span');
        closeButton.id = 'aiChatCloseButton';
        closeButton.className = 'close-button';
        closeButton.textContent = String.fromCharCode(215);
        header.appendChild(closeButton);

        const log = document.createElement('div');
        log.id = 'aiChatLog';
        const greeting = document.createElement('div');
        greeting.className = 'chat-message ai-message';
        greeting.textContent = 'Hello! How can I help you analyze the current system?';
        log.appendChild(greeting);

        const suggestions = document.createElement('div');
        suggestions.id = 'aiChatSuggestions';

        const usage = document.createElement('div');
        usage.id = 'aiChatUsageDisplay';
        usage.textContent = 'Session Tokens: 0';

        const inputContainer = document.createElement('div');
        inputContainer.id = 'aiChatInputContainer';

        const commandPopup = document.createElement('div');
        commandPopup.id = 'aiChatCommandPopup';
        inputContainer.appendChild(commandPopup);

        const input = document.createElement('textarea');
        input.id = 'aiChatInput';
        input.placeholder = 'Ask about the current view...';
        inputContainer.appendChild(input);

        const sendButton = document.createElement('button');
        sendButton.id = 'aiChatSendButton';
        sendButton.className = 'btn-primary';
        sendButton.textContent = 'Send';
        inputContainer.appendChild(sendButton);

        panel.appendChild(header);
        panel.appendChild(log);
        panel.appendChild(suggestions);
        panel.appendChild(usage);
        panel.appendChild(inputContainer);

        container.appendChild(panel);
    }

    onOpen() {}

    onClose() {}

    onViewChange() {}
}
