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

    // Create the content wrapper if it doesn't exist
    // This wrapper allows us to control scrolling and padding independent of the main container
    container.innerHTML = `
        <div id="documentationContent" style="padding: 30px; max-width: 1000px; margin: 0 auto; background-color: #fff; min-height: 100%;">
            <p><em>Loading documentation...</em></p>
        </div>
    `;

    // Trigger the load
    loadAndDisplayDocumentation();
}
window.renderHelpView = renderHelpView;

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

    if (typeof window.markdownit === 'undefined') {
        const errorMsg = "LAD_SLUGIFY: FATAL - window.markdownit is UNDEFINED. Cannot render documentation.";
        console.error(errorMsg);
        contentDiv.innerHTML = `<p style="color:red;">${errorMsg}</p>`;
        return;
    }

    let md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    if (typeof window.markdownItAnchor === 'function' && typeof window.customSlugify === 'function') {
        try {
            md = md.use(window.markdownItAnchor, {
                permalink: window.markdownItAnchor.permalink.headerLink(),
                level: [1, 2, 3, 4, 5, 6],
                slugify: s => window.customSlugify(s)
            });
        } catch (e) {
            console.error("LAD_SLUGIFY: Error applying markdown-it-anchor:", e);
        }
    }

    try {
        const response = await fetch(readmeUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching README.`);
        }
        const markdownText = await response.text();
        console.log("LAD_SLUGIFY: Successfully fetched README.md");

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
window.customSlugify = customSlugify;