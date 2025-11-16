// js/aiChatAssistant.js

let aiChatPanel = null;
let aiChatLog = null;
let aiChatInput = null;
let aiChatSendButton = null;
let aiChatCommandPopup = null;
let commandPopupOptions = [];
let commandPopupIndex = -1;
let commandPopupKeyboardNav = false;
let chatInputResizeObserver = null;
let chatInputFallbackEvents = [];
let chatInputFallbackTarget = null;

function cleanupChatInputHeightWatchers() {
    if (chatInputResizeObserver) {
        chatInputResizeObserver.disconnect();
        chatInputResizeObserver = null;
    }
    if (chatInputFallbackTarget && chatInputFallbackEvents.length > 0) {
        chatInputFallbackEvents.forEach(({ event, handler }) => {
            chatInputFallbackTarget.removeEventListener(event, handler);
        });
    }
    chatInputFallbackEvents = [];
    chatInputFallbackTarget = null;
}

function monitorChatInputHeight() {
    if (!aiChatInput) return;
    cleanupChatInputHeightWatchers();

    const updateHeightVar = () => {
        const heightValue = aiChatInput ? (aiChatInput.offsetHeight || 0) : 0;
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.setProperty('--ai-chat-input-height', `${heightValue}px`);
        }
    };

    if (typeof ResizeObserver === 'function') {
        chatInputResizeObserver = new ResizeObserver(() => updateHeightVar());
        chatInputResizeObserver.observe(aiChatInput);
    } else {
        chatInputFallbackTarget = aiChatInput;
        ['input', 'mouseup', 'keyup'].forEach(eventName => {
            const handler = () => updateHeightVar();
            chatInputFallbackTarget.addEventListener(eventName, handler);
            chatInputFallbackEvents.push({ event: eventName, handler });
        });
    }

    updateHeightVar();
}

function initializeAiChatPanel() {
    aiChatPanel = document.getElementById('aiChatPanel');
    aiChatLog = document.getElementById('aiChatLog');
    aiChatInput = document.getElementById('aiChatInput');
    aiChatSendButton = document.getElementById('aiChatSendButton');
    aiChatCommandPopup = document.getElementById('aiChatCommandPopup');

    if (!aiChatPanel || !aiChatLog || !aiChatInput || !aiChatSendButton) {
        console.error("AI Chat: Failed to initialize view. Missing DOM elements.");
        return;
    }

    aiChatInput.dataset.imageRequest = 'false';

    const submitHandler = () => {
        if (window.aiAgentController && typeof window.aiAgentController.handleUserChatSubmit === 'function') {
            window.aiAgentController.handleUserChatSubmit();
        } else {
            console.error("AI Chat: aiAgentController.handleUserChatSubmit() not available.");
        }
    };

    aiChatSendButton.addEventListener('click', submitHandler);
    aiChatInput.addEventListener('input', handleChatInput);
    aiChatInput.addEventListener('keydown', handleChatKeyDown);
    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitHandler();
        }
    });
    document.addEventListener('click', handleDocumentClickForCommands);
    if (aiChatCommandPopup) {
        aiChatCommandPopup.addEventListener('mousemove', () => {
            if (commandPopupKeyboardNav) {
                setCommandPopupKeyboardNav(false);
            }
        });
    }

    monitorChatInputHeight();

    if (typeof initializeChatResizer === 'function') {
        initializeChatResizer();
    }

    console.log("AI Chat Assistant view initialized.");
}

function openAiChatPanel() {
    if (!aiChatPanel) return;
    const panel = document.getElementById('aiChatPanelContainer');
    const handle = document.getElementById('chatResizeHandle');
    if (panel) panel.style.width = '400px';
    if (handle) handle.style.display = 'block';
    if (window.aiAgentController && typeof window.aiAgentController.renderSuggestionsForCurrentView === 'function') {
        window.aiAgentController.renderSuggestionsForCurrentView();
    }
    if (aiChatInput) aiChatInput.focus();
}

function closeAiChatPanel() {
    const panel = document.getElementById('aiChatPanelContainer');
    const handle = document.getElementById('chatResizeHandle');
    if (panel) panel.style.width = '0';
    if (handle) handle.style.display = 'none';
}

function postAgentMessageToView(htmlContent, isError = false) {
    const messageDiv = addChatMessage('', 'ai');
    if (!messageDiv) return null;
    messageDiv.innerHTML = htmlContent || '';
    if (isError) {
        messageDiv.classList.add('ai-chat-error');
        messageDiv.style.color = '#c62828';
    }
    return messageDiv;
}

function postUserMessageToView(text) {
    addChatMessage(text, 'user');
}

function showAgentLoadingIndicator() {
    return addChatMessage('AI is thinking...', 'ai', true);
}

function hideAgentLoadingIndicator(loadingMessageEl, htmlContent) {
    if (!loadingMessageEl) return;
    loadingMessageEl.innerHTML = '';
    loadingMessageEl.classList.remove('loading');

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-content-container';
    contentDiv.innerHTML = htmlContent || '';

    const copyButton = document.createElement('button');
    copyButton.className = 'chat-copy-button';
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = 'Copy response';
    copyButton.onclick = (e) => {
        e.stopPropagation();
        try {
            const htmlToCopy = contentDiv.innerHTML;
            const textToCopy = contentDiv.textContent;
            const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
            const textBlob = new Blob([textToCopy], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
            navigator.clipboard.write(data).then(() => {
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => { copyButton.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
            }).catch(err => {
                console.error('Failed to copy rich text, falling back to plain text.', err);
                navigator.clipboard.writeText(textToCopy);
            });
        } catch (error) {
            console.error('Error creating ClipboardItem, falling back to plain text.', error);
            navigator.clipboard.writeText(contentDiv.textContent || '');
        }
    };

    loadingMessageEl.appendChild(contentDiv);
    loadingMessageEl.appendChild(copyButton);
}

function setSuggestionPills(suggestions = []) {
    let suggestionsContainer = document.getElementById('aiChatSuggestions');
    if (!suggestionsContainer) return;

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        return;
    }

    suggestionsContainer.style.display = 'flex';
    suggestionsContainer.innerHTML = '';

    suggestions.forEach((suggestion) => {
        const pill = document.createElement('div');
        pill.className = 'suggestion-pill';
        if (suggestion.isImageRequest) {
            pill.innerHTML = `<i class="fas fa-image"></i> ${suggestion.text}`;
        } else {
            pill.textContent = suggestion.text;
        }

        pill.onclick = () => {
            if (aiChatInput) {
                aiChatInput.value = suggestion.text || '';
                aiChatInput.dataset.imageRequest = suggestion.isImageRequest ? 'true' : 'false';
            }
            if (window.aiAgentController && typeof window.aiAgentController.handleUserChatSubmit === 'function') {
                window.aiAgentController.handleUserChatSubmit();
            }
        };

        suggestionsContainer.appendChild(pill);
    });
}

function setTokenCount(count) {
    const usageDisplay = document.getElementById('aiChatUsageDisplay');
    if (!usageDisplay) return;
    const safeCount = typeof count === 'number' && !Number.isNaN(count) ? count : 0;
    usageDisplay.textContent = `Session Tokens: ${safeCount.toLocaleString()}`;
}

function toggleChatInput(disabled) {
    if (!aiChatInput || !aiChatSendButton) return;
    aiChatInput.disabled = !!disabled;
    aiChatSendButton.disabled = !!disabled;
    if (!disabled) {
        aiChatInput.dataset.imageRequest = 'false';
        aiChatInput.focus();
        hideCommandPopup();
    }
}

function getChatInputValue() {
    return aiChatInput ? aiChatInput.value.trim() : '';
}

function clearChatInput() {
    if (aiChatInput) {
        aiChatInput.value = '';
        aiChatInput.dataset.imageRequest = 'false';
    }
}

function isImageRequestPending() {
    return aiChatInput ? aiChatInput.dataset.imageRequest === 'true' : false;
}

function addChatMessage(text, sender, isLoading = false) {
    if (!aiChatLog) return null;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;

    if (isLoading) {
        messageDiv.classList.add('loading');
    }

    if (sender === 'ai') {
        if (text) {
            messageDiv.textContent = text;
        } else {
            messageDiv.innerHTML = '';
        }
    } else {
        messageDiv.textContent = text;
    }

    aiChatLog.appendChild(messageDiv);
    aiChatLog.scrollTop = aiChatLog.scrollHeight;
    return messageDiv;
}

function handleChatInput(e) {
    if (!aiChatCommandPopup) return;
    const text = (e && e.target ? e.target.value : aiChatInput.value) || '';

    if (!text.startsWith('/')) {
        hideCommandPopup();
        return;
    }

    const tools = (window.aiAgentController && typeof window.aiAgentController.getAvailableTools === 'function')
        ? window.aiAgentController.getAvailableTools()
        : [];

    if (!tools || tools.length === 0) {
        hideCommandPopup();
        return;
    }

    const query = text.slice(1).toLowerCase();
    const filtered = !query
        ? tools
        : tools.filter(tool => tool.command.toLowerCase().includes(query));

    if (filtered.length === 0) {
        hideCommandPopup();
        return;
    }

    buildCommandPopup(filtered);
}

function handleChatKeyDown(e) {
    if (!isCommandPopupVisible()) {
        if (e.key === 'Escape') hideCommandPopup();
        return;
    }

    const optionsCount = commandPopupOptions.length;
    if (e.key === 'Escape') {
        hideCommandPopup();
        return;
    }

    if (optionsCount === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCommandPopupKeyboardNav(true);
        if (e.key === 'ArrowDown') {
            commandPopupIndex = (commandPopupIndex + 1) % optionsCount;
        } else {
            commandPopupIndex = (commandPopupIndex - 1 + optionsCount) % optionsCount;
        }
        highlightCommandOption(commandPopupIndex);
    } else if (e.key === 'Enter' && commandPopupIndex >= 0) {
        e.preventDefault();
        const selection = commandPopupOptions[commandPopupIndex];
        if (selection) {
            applyCommandSelection(selection.command);
        }
    }
}

function handleDocumentClickForCommands(e) {
    if (!isCommandPopupVisible()) return;
    if (!aiChatCommandPopup || !aiChatInput) return;
    const target = e.target;
    if (target === aiChatInput) return;
    if (aiChatCommandPopup.contains(target)) return;
    hideCommandPopup();
}

function buildCommandPopup(tools) {
    if (!aiChatCommandPopup) return;
    aiChatCommandPopup.innerHTML = '';
    commandPopupOptions = [];
    commandPopupIndex = -1;
    setCommandPopupKeyboardNav(false);
    tools.forEach((tool, idx) => {
        const option = document.createElement('div');
        option.className = 'ai-command-option';
        option.innerHTML = `
            <span class="command-name">/${tool.command}</span>
            <span class="command-desc">${tool.description || ''}</span>
        `;
        option.onclick = () => applyCommandSelection(tool.command);
        aiChatCommandPopup.appendChild(option);
        commandPopupOptions.push({ element: option, command: tool.command });
    });
    aiChatCommandPopup.style.display = 'block';
}

function hideCommandPopup() {
    if (!aiChatCommandPopup) return;
    aiChatCommandPopup.style.display = 'none';
    aiChatCommandPopup.innerHTML = '';
    commandPopupOptions = [];
    commandPopupIndex = -1;
    setCommandPopupKeyboardNav(false);
}

function isCommandPopupVisible() {
    return !!(aiChatCommandPopup && aiChatCommandPopup.style.display !== 'none' && aiChatCommandPopup.innerHTML);
}

function highlightCommandOption(newIndex) {
    if (commandPopupOptions.length === 0) return;
    commandPopupOptions.forEach(opt => opt.element.classList.remove('active'));
    if (newIndex >= 0 && newIndex < commandPopupOptions.length) {
        commandPopupOptions[newIndex].element.classList.add('active');
        commandPopupOptions[newIndex].element.scrollIntoView({ block: 'nearest' });
    }
}

function applyCommandSelection(commandName) {
    if (!aiChatInput) return;
    aiChatInput.value = `/${commandName} `;
    aiChatInput.dataset.imageRequest = 'false';
    aiChatInput.focus();
    hideCommandPopup();
}

function setCommandPopupKeyboardNav(isActive) {
    commandPopupKeyboardNav = isActive;
    if (!aiChatCommandPopup) return;
    if (isActive) {
        aiChatCommandPopup.classList.add('keyboard-nav');
    } else {
        aiChatCommandPopup.classList.remove('keyboard-nav');
    }
}

let isChatResizing = false;

function initializeChatResizer() {
    const handle = document.getElementById('chatResizeHandle');
    if (!handle) {
        console.error("Chat resize handle not found");
        return;
    }
    handle.addEventListener('mousedown', onChatResizeMouseDown);
    console.log("Chat resize handle initialized.");
}

function onChatResizeMouseDown(e) {
    e.preventDefault();
    isChatResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onChatResizeMouseMove);
    document.addEventListener('mouseup', onChatResizeMouseUp);
}

function onChatResizeMouseMove(e) {
    if (!isChatResizing) return;
    const panel = document.getElementById('aiChatPanelContainer');
    if (!panel) return;
    let newWidth = window.innerWidth - e.clientX;
    if (newWidth < 300) newWidth = 300;
    if (newWidth > window.innerWidth / 2) newWidth = window.innerWidth / 2;
    panel.style.width = newWidth + 'px';
}

function onChatResizeMouseUp() {
    isChatResizing = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
    document.removeEventListener('mousemove', onChatResizeMouseMove);
    document.removeEventListener('mouseup', onChatResizeMouseUp);
}

if (typeof window !== 'undefined') {
    window.aiChatAssistant = {
        initializeAiChatPanel,
        openAiChatPanel,
        closeAiChatPanel,
        postAgentMessageToView,
        postUserMessageToView,
        showAgentLoadingIndicator,
        hideAgentLoadingIndicator,
        setSuggestionPills,
        setTokenCount,
        toggleChatInput,
        getChatInputValue,
        clearChatInput,
        isImageRequestPending
    };
}
