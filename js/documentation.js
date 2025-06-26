// js/documentation.js

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
    } else {
        console.log("LAD_SLUGIFY: window.markdownit is DEFINED.");
    }

    let md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    if (typeof window.markdownItAnchor === 'function' && typeof window.customSlugify === 'function') {
        console.log("LAD_SLUGIFY: markdown-it-anchor and customSlugify are DEFINED. Applying anchor plugin.");
        try {
            md = md.use(window.markdownItAnchor, {
                permalink: window.markdownItAnchor.permalink.headerLink(),
                level: [1, 2, 3, 4, 5, 6],
                slugify: s => window.customSlugify(s) // Ensure window.customSlugify is called
            });
        } catch (e) {
            console.error("LAD_SLUGIFY: Error applying markdown-it-anchor:", e);
        }
    } else {
        if (typeof window.markdownItAnchor !== 'function') {
            console.warn("LAD_SLUGIFY: window.markdownItAnchor is UNDEFINED. Links may not function as expected.");
        }
        if (typeof window.customSlugify !== 'function') {
            console.warn("LAD_SLUGIFY: window.customSlugify is UNDEFINED. Links may not use custom slugs.");
        }
    }

    contentDiv.innerHTML = '<p><em>Fetching latest documentation from GitHub...</em></p>';

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
        const internalLinks = contentDiv.querySelectorAll('a[href^="#"]');
        internalLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement && contentDiv.contains(targetElement)) {
                    const contentDivScrollTop = contentDiv.scrollTop;
                    const contentDivRect = contentDiv.getBoundingClientRect();
                    const targetElementRect = targetElement.getBoundingClientRect();
                    const targetOffsetFromContentDivTop = targetElementRect.top - contentDivRect.top;
                    let scrollToPosition = contentDivScrollTop + targetOffsetFromContentDivTop - 10; // Small offset
                    scrollToPosition = Math.max(0, scrollToPosition);
                    contentDiv.scrollTop = scrollToPosition;
                    console.log(`LAD_SLUGIFY: Scrolled to: #${targetId}`);
                } else {
                    console.warn(`LAD_SLUGIFY: Target element for link #${targetId} not found or not within contentDiv.`);
                    const generatedIds = Array.from(contentDiv.querySelectorAll('[id]')).map(el => el.id);
                    console.log("LAD_SLUGIFY: Available IDs in documentation content:", generatedIds);
                }
            });
        });
        console.log("LAD_SLUGIFY: Internal link listeners attached.");

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