/**
 * DocumentationComponent
 * Manages the fetching, rendering, and interaction of the documentation.
 */
class DocumentationComponent {
    constructor(containerId, scrollContainerId) {
        this.container = document.getElementById(containerId);
        this.scrollContainer = document.getElementById(scrollContainerId);
        this.readmeUrl = 'https://raw.githubusercontent.com/khanmjk/altsoftwareplanning/refs/heads/main/README.md';
        this.isLoaded = false;
        this.customSlugify = this.customSlugify.bind(this);
    }

    async init() {
        console.log("DocumentationComponent initialized");
        if (!this.container) {
            console.error('Documentation container not found');
            return;
        }
        await this.loadContent();
    }

    async loadContent() {
        if (this.isLoaded) {
            console.log("Documentation already loaded");
            return;
        }

        this.container.innerHTML = '<p><em>Fetching latest documentation from GitHub...</em></p>';

        try {
            if (typeof window.markdownit === 'undefined') {
                throw new Error("markdown-it library not loaded");
            }

            const response = await fetch(this.readmeUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const markdownText = await response.text();
            console.log("Documentation fetched, length:", markdownText.length);

            this.render(markdownText);
            this.isLoaded = true;

        } catch (error) {
            console.error("Failed to load documentation:", error);
            this.container.innerHTML = `<p style="color:red;">Could not load documentation. Details: ${error.message}</p>`;
        }
    }

    render(markdownText) {
        console.log("Rendering markdown...");
        let md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true
        });

        if (typeof window.markdownItAnchor !== 'undefined') {
            console.log("Applying markdown-it-anchor plugin");
            try {
                md = md.use(window.markdownItAnchor, {
                    permalink: window.markdownItAnchor.permalink.headerLink(),
                    level: [1, 2, 3, 4, 5, 6],
                    slugify: this.customSlugify
                });
            } catch (e) {
                console.warn("Error applying markdown-it-anchor:", e);
            }
        } else {
            console.warn("markdown-it-anchor not found");
        }

        const htmlContent = md.render(markdownText);
        this.container.innerHTML = htmlContent;
        console.log("Markdown rendered. HTML length:", htmlContent.length);

        // Debug: Check if headers have IDs
        const headers = this.container.querySelectorAll('h1, h2, h3');
        console.log("Found headers:", headers.length);
        if (headers.length > 0) {
            console.log("First header ID:", headers[0].id);
        }

        this.attachLinkListeners();
    }

    attachLinkListeners() {
        const internalLinks = this.container.querySelectorAll('a[href^="#"]');
        console.log("Found internal links:", internalLinks.length);
        internalLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                console.log("Link clicked, target:", targetId);
                this.scrollToSection(targetId);
            });
        });
    }

    scrollToSection(targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement && this.scrollContainer) {
            console.log("Scrolling to element:", targetId);
            // Calculate position relative to the scroll container
            const containerRect = this.scrollContainer.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            const scrollTop = this.scrollContainer.scrollTop;

            // Position = current scroll + (target top - container top)
            const targetPosition = scrollTop + (targetRect.top - containerRect.top) - 20; // 20px padding

            this.scrollContainer.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        } else {
            console.warn(`Target element #${targetId} not found`);
            // Fallback: Try to find by text content if ID fails?
            // Or maybe the ID is slightly different?
            const allIds = Array.from(this.container.querySelectorAll('[id]')).map(el => el.id);
            console.log("Available IDs:", allIds);
        }
    }

    customSlugify(str) {
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
}

if (typeof window !== 'undefined') {
    window.DocumentationComponent = DocumentationComponent;
}
