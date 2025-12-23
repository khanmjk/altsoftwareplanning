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

function clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function appendHtmlContent(container, htmlContent) {
    if (!container || !htmlContent) return;
    const parser = new DOMParser();
    const parsed = parser.parseFromString(htmlContent, 'text/html');
    while (parsed.body.firstChild) {
        container.appendChild(parsed.body.firstChild);
    }
}

function setButtonIcon(button, iconClass) {
    if (!button) return;
    clearElement(button);
    const icon = document.createElement('i');
    icon.className = iconClass;
    button.appendChild(icon);
}

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

    chatInputResizeObserver = new ResizeObserver(() => updateHeightVar());
    chatInputResizeObserver.observe(aiChatInput);

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

    // Attach close button listener (replaces inline onclick per contract)
    const closeButton = document.getElementById('aiChatCloseButton');
    if (closeButton) {
        closeButton.addEventListener('click', closeAiChatPanel);
    }

    aiChatInput.dataset.imageRequest = 'false';

    const submitHandler = () => {
        aiAgentController.handleUserChatSubmit();
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

    console.log("AI Chat Assistant view initialized.");
}

function openAiChatPanel() {
    workspaceComponent.openExtension('aiChat');
    aiAgentController.renderSuggestionsForCurrentView();
    if (aiChatInput) aiChatInput.focus();
}

function closeAiChatPanel() {
    workspaceComponent.closeExtension('aiChat');
}

function isAiChatPanelOpen() {
    return workspaceComponent.isExtensionOpen('aiChat');
}

function postAgentMessageToView(htmlContent, isError = false) {
    const messageDiv = addChatMessage('', 'ai');
    if (!messageDiv) return null;
    clearElement(messageDiv);
    appendHtmlContent(messageDiv, htmlContent || '');
    if (isError) {
        messageDiv.classList.add('ai-chat-error');
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
    clearElement(loadingMessageEl);
    loadingMessageEl.classList.remove('loading');

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-content-container';
    contentDiv.dataset.rawHtml = htmlContent || '';
    appendHtmlContent(contentDiv, htmlContent || '');

    const copyButton = document.createElement('button');
    copyButton.className = 'chat-copy-button';
    setButtonIcon(copyButton, 'fas fa-copy');
    copyButton.title = 'Copy response';
    copyButton.onclick = (e) => {
        e.stopPropagation();
        try {
            const htmlToCopy = contentDiv.dataset.rawHtml || '';
            const textToCopy = contentDiv.textContent;
            const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
            const textBlob = new Blob([textToCopy], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
            navigator.clipboard.write(data).then(() => {
                setButtonIcon(copyButton, 'fas fa-check');
                setTimeout(() => { setButtonIcon(copyButton, 'fas fa-copy'); }, 2000);
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
        clearElement(suggestionsContainer);
        suggestionsContainer.style.display = 'none';
        return;
    }

    suggestionsContainer.style.display = 'flex';
    clearElement(suggestionsContainer);

    suggestions.forEach((suggestion) => {
        const pill = document.createElement('div');
        pill.className = 'suggestion-pill';
        if (suggestion.isImageRequest) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-image';
            pill.appendChild(icon);
            pill.appendChild(document.createTextNode(` ${suggestion.text}`));
        } else {
            pill.textContent = suggestion.text;
        }

        pill.onclick = () => {
            if (aiChatInput) {
                aiChatInput.value = suggestion.text || '';
                aiChatInput.dataset.imageRequest = suggestion.isImageRequest ? 'true' : 'false';
            }
            aiAgentController.handleUserChatSubmit();
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
            clearElement(messageDiv);
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

    const tools = aiAgentController.getAvailableTools();

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
    clearElement(aiChatCommandPopup);
    commandPopupOptions = [];
    commandPopupIndex = -1;
    setCommandPopupKeyboardNav(false);
    tools.forEach((tool, idx) => {
        const option = document.createElement('div');
        option.className = 'ai-command-option';
        const name = document.createElement('span');
        name.className = 'command-name';
        name.textContent = `/${tool.command}`;
        const desc = document.createElement('span');
        desc.className = 'command-desc';
        desc.textContent = tool.description || '';
        option.appendChild(name);
        option.appendChild(desc);
        option.onclick = () => applyCommandSelection(tool.command);
        aiChatCommandPopup.appendChild(option);
        commandPopupOptions.push({ element: option, command: tool.command });
    });
    aiChatCommandPopup.style.display = 'block';
}

function hideCommandPopup() {
    if (!aiChatCommandPopup) return;
    aiChatCommandPopup.style.display = 'none';
    clearElement(aiChatCommandPopup);
    commandPopupOptions = [];
    commandPopupIndex = -1;
    setCommandPopupKeyboardNav(false);
}

function isCommandPopupVisible() {
    return !!(aiChatCommandPopup && aiChatCommandPopup.style.display !== 'none' && aiChatCommandPopup.childElementCount > 0);
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

function openDiagramModal(code, title = 'Generated Diagram') {
    if (typeof DiagramModal !== 'undefined') {
        DiagramModal.getInstance().render();
    }
    const modal = document.getElementById('diagramModal');
    const titleEl = document.getElementById('diagramModalTitle');
    const contentEl = document.getElementById('diagramModalContent');
    if (!modal || !contentEl) {
        console.error("Diagram modal elements not found.");
        return;
    }
    if (titleEl) titleEl.textContent = title || 'Generated Diagram';
    modal.style.display = 'block';

    const renderDiagramError = (error, source) => {
        while (contentEl.firstChild) {
            contentEl.removeChild(contentEl.firstChild);
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'diagram-modal__error';

        const heading = document.createElement('div');
        heading.className = 'diagram-modal__error-title';
        heading.textContent = 'Diagram Render Error';

        const message = document.createElement('div');
        message.className = 'diagram-modal__error-message';
        message.textContent = error && error.message ? error.message : 'Unknown error';

        const pre = document.createElement('pre');
        pre.className = 'diagram-modal__error-code';
        pre.textContent = source || '';

        wrapper.appendChild(heading);
        wrapper.appendChild(message);
        wrapper.appendChild(pre);
        contentEl.appendChild(wrapper);
    };

    const extractErrorLine = (error) => {
        const message = (error && (error.str || error.message)) ? String(error.str || error.message) : '';
        const match = message.match(/line\s+(\d+)/i);
        if (!match) return null;
        const line = parseInt(match[1], 10);
        return Number.isNaN(line) ? null : line;
    };

    const buildNumberedCode = (source) => {
        const lines = source.split('\n');
        const pad = String(lines.length || 1).length;
        return lines.map((line, idx) => `${String(idx + 1).padStart(pad, ' ')} | ${line}`).join('\n');
    };

    const buildErrorContext = (source, errorLine) => {
        if (!errorLine) return '';
        const lines = source.split('\n');
        if (lines.length === 0) return '';
        const pad = String(lines.length).length;
        const start = Math.max(1, errorLine - 3);
        const end = Math.min(lines.length, errorLine + 3);
        const context = [];
        for (let i = start; i <= end; i += 1) {
            const marker = i === errorLine ? '>' : ' ';
            context.push(`${marker} ${String(i).padStart(pad, ' ')} | ${lines[i - 1]}`);
        }
        return context.join('\n');
    };

    const logMermaidDebug = (label, source, error) => {
        const errorLine = extractErrorLine(error);
        const context = buildErrorContext(source, errorLine);
        const numberedCode = buildNumberedCode(source);
        const debugPayload = {
            label: label,
            lineCount: source ? source.split('\n').length : 0,
            errorLine: errorLine,
            errorMessage: error && error.message ? error.message : '',
            errorDetail: error && error.str ? error.str : ''
        };

        if (typeof AIService !== 'undefined') {
            if (!AIService.lastDiagramDebug) {
                AIService.lastDiagramDebug = {};
            }
            AIService.lastDiagramDebug[label] = {
                ...debugPayload,
                context: context,
                code: source,
                numberedCode: numberedCode
            };
        }

        console.groupCollapsed(`[AI-DIAGRAM] Mermaid render debug (${label})`);
        console.debug(debugPayload);
        if (context) {
            console.debug('Context:\n' + context);
        }
        console.debug('Mermaid code (numbered):\n' + numberedCode);
        console.groupEnd();
    };

    const getSanitizedCode = (rawCode, aggressive = false) => {
        if (typeof AIService !== 'undefined' && AIService.sanitizeMermaidCode) {
            return AIService.sanitizeMermaidCode(rawCode, { aggressive: aggressive });
        }
        return (rawCode || '').replace(/:/g, ' -');
    };

    const renderMermaid = (source) => {
        contentEl.textContent = source;
        contentEl.removeAttribute('data-processed');
        return Promise.resolve(mermaid.init(undefined, contentEl));
    };

    try {
        if (!mermaid || !mermaid.init) {
            console.warn("Mermaid.init is not available. Is the library loaded?");
            throw new Error("Mermaid library not loaded");
        }

        const baseCode = getSanitizedCode(code, false);
        renderMermaid(baseCode).catch(err => {
            console.error("Mermaid async render failed:", err);
            logMermaidDebug('base', baseCode, err);
            const aggressiveCode = getSanitizedCode(code, true);
            if (aggressiveCode && aggressiveCode !== baseCode) {
                renderMermaid(aggressiveCode).catch(innerErr => {
                    console.error("Mermaid async render failed after sanitize:", innerErr);
                    logMermaidDebug('aggressive', aggressiveCode, innerErr);
                    renderDiagramError(innerErr, aggressiveCode);
                });
                return;
            }
            renderDiagramError(err, baseCode);
        });

    } catch (err) {
        console.error("Mermaid sync render failed:", err);
        const fallbackCode = getSanitizedCode(code, true);
        logMermaidDebug('sync', fallbackCode, err);
        renderDiagramError(err, fallbackCode);
    }
}


function closeDiagramModal() {
    if (typeof DiagramModal !== 'undefined') {
        DiagramModal.getInstance().close();
        return;
    }
    const modal = document.getElementById('diagramModal');
    const contentEl = document.getElementById('diagramModalContent');
    if (modal) modal.style.display = 'none';
    clearElement(contentEl);
}

function postDiagramWidget(title, code) {
    if (!aiChatLog) return;
    const message = document.createElement('div');
    message.classList.add('chat-message', 'ai-message');
    const summary = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'Diagram Generated:';
    summary.appendChild(strong);
    summary.appendChild(document.createTextNode(` ${title || 'Untitled'}`));
    const button = document.createElement('button');
    button.className = 'btn-primary';
    button.style.marginTop = '8px';
    button.textContent = 'View Diagram';
    button.onclick = () => openDiagramModal(code, title);
    message.appendChild(summary);
    message.appendChild(button);
    aiChatLog.appendChild(message);
    aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

// Export
const aiChatAssistant = {
    initializeAiChatPanel,
    openAiChatPanel,
    closeAiChatPanel,
    isAiChatPanelOpen,
    postAgentMessageToView,
    postUserMessageToView,
    showAgentLoadingIndicator,
    hideAgentLoadingIndicator,
    toggleChatInput,
    getChatInputValue,
    clearChatInput,
    isImageRequestPending,
    setTokenCount,
    setSuggestionPills,
    openDiagramModal,
    closeDiagramModal,
    postDiagramWidget
};
