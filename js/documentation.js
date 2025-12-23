// js/documentation.js

/**
 * NEW: Renders the Help/Documentation View into the Workspace.
 */
function renderHelpView(container) {
    console.log("Rendering Help View...");
    if (!container) {
        console.error("Help View container not provided.");
        return;
    }

    // Set Workspace Metadata
    workspaceComponent.setPageMetadata({
        title: 'Documentation',
        breadcrumbs: ['Help', 'Documentation'],
        actions: []
    });
    // Clear toolbar
    workspaceComponent.setToolbar(null);

    clearElement(container);

    const wrapper = document.createElement('div');
    wrapper.className = 'documentation-wrapper';

    const content = document.createElement('div');
    content.id = 'documentationContent';
    content.className = 'documentation-content';
    content.appendChild(buildDocumentationLoadingState());

    wrapper.appendChild(content);
    container.appendChild(wrapper);

    loadAndDisplayDocumentation();
}

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function buildDocumentationLoadingState() {
    const loading = document.createElement('div');
    loading.className = 'loading-state';

    const icon = document.createElement('i');
    icon.className = 'fas fa-spinner fa-spin';
    loading.appendChild(icon);
    loading.appendChild(document.createTextNode(' Loading documentation...'));

    return loading;
}

function renderDocumentationError(contentDiv, message) {
    if (!contentDiv) return;
    clearElement(contentDiv);

    const error = document.createElement('div');
    error.className = 'documentation-error';
    error.textContent = message;
    contentDiv.appendChild(error);
}

function renderDocumentationHtml(contentDiv, htmlContent) {
    if (!contentDiv) return;
    clearElement(contentDiv);

    const parsed = new DOMParser().parseFromString(htmlContent, 'text/html');
    const fragment = document.createDocumentFragment();

    while (parsed.body.firstChild) {
        fragment.appendChild(parsed.body.firstChild);
    }

    contentDiv.appendChild(fragment);
}

/**
 * Fetches README.md, converts Markdown to HTML, displays it,
 * and handles internal anchor link scrolling.
 * Uses custom slugify for markdown-it-anchor.
 */
async function loadAndDisplayDocumentation() {
    const contentDiv = document.getElementById('documentationContent');
    if (!contentDiv) {
        console.error("LAD_SLUGIFY: Documentation content div not found.");
        return;
    }
    console.log("LAD_SLUGIFY: Attempting to load documentation.");

    const readmeUrl = 'https://raw.githubusercontent.com/khanmjk/altsoftwareplanning/refs/heads/main/README.md';

    // Use MarkdownService for rendering with anchor support
    if (!MarkdownService.isAvailable()) {
        console.error("LAD_SLUGIFY: MarkdownService not available");
        renderDocumentationError(contentDiv, 'Markdown rendering is unavailable.');
        return;
    }

    try {
        const response = await fetch(readmeUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching README.`);
        }
        let markdownText = await response.text();
        console.log("LAD_SLUGIFY: Successfully fetched README.md");

        // Remove the first H1 (# Title) as it is redundant with the Workspace Header
        // and causes layout/spacing issues.
        // Regex explanation:
        // ^\s*      -> Start of string, optional whitespace
        // #\s+      -> Hash and space (H1)
        // [^\n]+    -> The title text (until newline)
        // (\n|\r\n)* -> Any following newlines
        markdownText = markdownText.replace(/^\s*#\s+[^\n]+(\n|\r\n)*/, '');

        const htmlContent = MarkdownService.renderWithAnchors(markdownText, customSlugify);
        renderDocumentationHtml(contentDiv, htmlContent);
        console.log("LAD_SLUGIFY: Documentation rendered.");

        // Re-attach internal link listeners
        const internalLinks = contentDiv.querySelectorAll('a[href^="#"]');
        internalLinks.forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                } else {
                    console.warn(`LAD_SLUGIFY: Target element #${targetId} not found.`);
                }
            });
        });

    } catch (error) {
        console.error("LAD_SLUGIFY: Failed to load or render documentation:", error);
        const message = error && error.message
            ? `Could not load documentation. Details: ${error.message}`
            : 'Could not load documentation.';
        renderDocumentationError(contentDiv, message);
    }
}

/**
 * Custom slugify function to match the README's Table of Contents link style.
 */
function customSlugify(str) {
    if (typeof str !== 'string') return '';
    const AMPERSAND_PLACEHOLDER = '_AMPERSANDREPLACEMENT_';

    let s = str.toString().trim().toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/^\d+(\.\d+)*\.\s*/, '')
        .replace(/\s*&\s*/g, AMPERSAND_PLACEHOLDER)
        .replace(/&/g, AMPERSAND_PLACEHOLDER)
        .replace(/\s+|[/\\?,:()!"“„#$'%~`´]/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    return s.replace(new RegExp(AMPERSAND_PLACEHOLDER, 'g'), '--');
}
