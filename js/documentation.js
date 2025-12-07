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
    // Set Workspace Metadata
    workspaceComponent.setPageMetadata({
        title: 'Documentation',
        breadcrumbs: ['Help', 'Documentation'],
        actions: []
    });
    // Clear toolbar
    workspaceComponent.setToolbar(null);

    // Create the content wrapper if it doesn't exist
    // This wrapper allows us to control scrolling and padding independent of the main container
    // Load template
    templateLoader.load('html/views/documentation-view.html')
        .then(html => {
            container.innerHTML = html;
            loadAndDisplayDocumentation();
        })
        .catch(err => {
            console.error('Failed to load documentation template:', err);
            container.innerHTML = '<div class="error-state">Failed to load documentation template.</div>';
        });

    // Trigger the load - moved to inside template load callback
    // loadAndDisplayDocumentation();
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



    let md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    try {
        md = md.use(window.markdownItAnchor, {
            permalink: window.markdownItAnchor.permalink.headerLink(),
            level: [1, 2, 3, 4, 5, 6],
            slugify: s => customSlugify(s)
        });
    } catch (e) {
        console.error("LAD_SLUGIFY: Error applying markdown-it-anchor:", e);
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

        const htmlContent = md.render(markdownText);
        contentDiv.innerHTML = htmlContent;
        console.log("LAD_SLUGIFY: Documentation rendered.");

        // Re-attach internal link listeners
        // Note: We attach to the container provided by WorkspaceComponent if possible, 
        // but here we are inside the contentDiv. 
        // We need to scroll the *scrollable parent*. 
        // In WorkspaceComponent, the container passed to render() is usually the scrollable one, 
        // or its parent. 
        // Let's find the nearest scrollable parent.
        const scrollableParent = contentDiv.closest('.workspace-view-container') || document.getElementById('main-content-area') || window;

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
        contentDiv.innerHTML = `<p style="color:red;">Could not load documentation. Details: ${error.message}</p>`;
    }
}

/**
 * Custom slugify function to match the README's Table of Contents link style.
 */
function customSlugify(str) {
    if (typeof str !== 'string') return '';
    const AMPERSAND_PLACEHOLDER = '_AMPERSANDREPLACEMENT_';

    let s = str.toString().trim().toLowerCase()
        .replace(/^\d+(\.\d+)*\.\s*/, '')
        .replace(/\s*&\s*/g, AMPERSAND_PLACEHOLDER)
        .replace(/&/g, AMPERSAND_PLACEHOLDER)
        .replace(/\s+|[/\\?,:()!"“„#$'%~`´]/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    return s.replace(new RegExp(AMPERSAND_PLACEHOLDER, 'g'), '--');
}