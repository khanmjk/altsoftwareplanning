/**
 * AboutView
 * Displays author information and AI-related blog posts.
 * Fetches posts with "chatGPT" label from Blogger API.
 */
class AboutView {
    constructor() {
        this.container = null;
        this.blogId = '2027834094987620676';
        this.labelFilter = 'chatGPT';
        this.blogUrl = 'https://khanmjk-outlet.blogspot.com';
        this.posts = [];

        // YouTube configuration
        this.youtubeChannelUrl = 'https://www.youtube.com/channel/UC2ryW_gQBMNZgv6GNUhM2ag';
        this.youtubeWorkerUrl = 'https://smt-feedback-worker.khanmjk.workers.dev/youtube';
        this.videos = [];
    }

    /**
     * Singleton accessor
     * @returns {AboutView}
     */
    static getInstance() {
        if (!AboutView._instance) {
            AboutView._instance = new AboutView();
        }
        return AboutView._instance;
    }

    /**
     * Render the About view
     * @param {HTMLElement} container - The container to render into
     */
    render(container) {
        this.container = container;
        this._clearElement(this.container);

        // Set page metadata
        workspaceComponent.setPageMetadata({
            title: 'About',
            breadcrumbs: ['Help', 'About'],
            actions: [
                {
                    label: 'Visit Blog',
                    icon: 'fas fa-external-link-alt',
                    onClick: () => window.open(this.blogUrl, '_blank')
                }
            ]
        });

        // Clear toolbar
        workspaceComponent.setToolbar(null);

        // Create view wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'workspace-view about-view';

        // Hero Section
        wrapper.appendChild(this._createHeroSection());

        // Blog Posts Section
        const postsSection = this._createPostsSection();
        wrapper.appendChild(postsSection);

        // YouTube Videos Section
        const videosSection = this._createVideosSection();
        wrapper.appendChild(videosSection);

        this.container.appendChild(wrapper);

        // Fetch content
        this._fetchBlogPosts();
        this._fetchYouTubeVideos();
    }

    /**
     * Create the hero/author section
     * @returns {HTMLElement}
     */
    _createHeroSection() {
        const hero = document.createElement('div');
        hero.className = 'about-view__hero';

        // Author info
        const authorCard = document.createElement('div');
        authorCard.className = 'about-view__author-card';

        // Author photo
        const avatar = document.createElement('div');
        avatar.className = 'about-view__avatar';

        const avatarImg = document.createElement('img');
        avatarImg.src = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhWFOIBZbuZPwCogTfE_ByQjgYJp4ZVK8aeVlUgSUoc9-0N_gd09g7HAU7gMxmSKO2I-NHVu3-fRHNqqihUV-UMhETo1aKaeEYKWvUFS08WdB1BeW3dH0EH3FJ8PI7uwSqvxnXNElAuaQGsrAHe7Y8_4HqE2ppYMuvWY4zq-pCF_fjr4DsNwrPsz-BRWg/s150/IMG_20220705_145433.jpg';
        avatarImg.alt = 'Mo Khan';
        avatarImg.className = 'about-view__avatar-img';
        avatar.appendChild(avatarImg);

        // Info container
        const info = document.createElement('div');
        info.className = 'about-view__author-info';

        const name = document.createElement('h2');
        name.className = 'about-view__author-name';
        name.textContent = 'Mo Khan';

        const tagline = document.createElement('p');
        tagline.className = 'about-view__tagline';
        tagline.textContent = 'Software & Engineering Leader | AI-First Development Advocate';

        const bio = document.createElement('p');
        bio.className = 'about-view__bio';
        bio.textContent = 'Building SMT with AI-assisted development practices. Exploring the intersection of traditional software engineering and modern AI tooling.';

        // Links
        const links = document.createElement('div');
        links.className = 'about-view__links';

        links.appendChild(this._createLink('Blog', 'fas fa-blog', this.blogUrl));
        links.appendChild(this._createLink('GitHub', 'fab fa-github', 'https://github.com/khanmjk'));
        links.appendChild(this._createLink('LinkedIn', 'fab fa-linkedin', 'https://www.linkedin.com/in/khanmjk/'));

        info.appendChild(name);
        info.appendChild(tagline);
        info.appendChild(bio);
        info.appendChild(links);

        authorCard.appendChild(avatar);
        authorCard.appendChild(info);
        hero.appendChild(authorCard);

        return hero;
    }

    /**
     * Create a link button
     */
    _createLink(label, iconClass, url) {
        const link = document.createElement('a');
        link.className = 'about-view__link';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const icon = document.createElement('i');
        icon.className = iconClass;

        const text = document.createElement('span');
        text.textContent = label;

        link.appendChild(icon);
        link.appendChild(text);
        return link;
    }

    /**
     * Create the blog posts section container
     * @returns {HTMLElement}
     */
    _createPostsSection() {
        const section = document.createElement('div');
        section.className = 'about-view__posts-section';

        const header = document.createElement('div');
        header.className = 'about-view__section-header';

        const title = document.createElement('h3');
        const icon = document.createElement('i');
        icon.className = 'fas fa-robot';
        title.appendChild(icon);
        title.appendChild(document.createTextNode(' AI & Development Articles'));

        const viewAllLink = document.createElement('a');
        viewAllLink.href = `${this.blogUrl}/search/label/${this.labelFilter}`;
        viewAllLink.target = '_blank';
        viewAllLink.className = 'about-view__view-all';
        viewAllLink.textContent = 'View All →';

        header.appendChild(title);
        header.appendChild(viewAllLink);

        const postsContainer = document.createElement('div');
        postsContainer.id = 'about-posts-container';
        postsContainer.className = 'about-view__posts-container';

        // Loading state using DOM Access
        this._setLoadingState(postsContainer, 'Loading articles...');

        section.appendChild(header);
        section.appendChild(postsContainer);

        return section;
    }

    /**
     * Helper to set loading state
     */
    _setLoadingState(container, text) {
        this._clearElement(container);
        const wrapper = document.createElement('div');
        wrapper.className = 'about-view__loading';

        const icon = document.createElement('i');
        icon.className = 'fas fa-spinner fa-spin';

        wrapper.appendChild(icon);
        wrapper.appendChild(document.createTextNode(' ' + text));

        container.appendChild(wrapper);
    }

    /**
     * Fetch blog posts using AboutService
     */
    async _fetchBlogPosts() {
        try {
            if (typeof AboutService === 'undefined') {
                console.error('AboutService not found. Make sure it is loaded in index.html');
                this._renderPostsError();
                return;
            }

            this.posts = await AboutService.getBlogPosts(this.blogId, this.labelFilter);
            this._renderPosts();
        } catch (error) {
            console.error('AboutView: Failed to fetch blog posts', error);
            this._renderPostsError();
        }
    }

    /**
     * Render the fetched posts
     */
    _renderPosts() {
        const container = document.getElementById('about-posts-container');
        if (!container) return;

        this._clearElement(container);

        if (this.posts.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'about-view__no-posts';
            empty.textContent = 'No articles found.';
            container.appendChild(empty);
            return;
        }

        this.posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'about-view__post-card';

            const title = document.createElement('h4');
            title.className = 'about-view__post-title';
            title.textContent = post.title;

            const date = document.createElement('span');
            date.className = 'about-view__post-date';

            const dateIcon = document.createElement('i');
            dateIcon.className = 'fas fa-calendar-alt';

            date.appendChild(dateIcon);
            date.appendChild(document.createTextNode(' ' + post.date));

            const summary = document.createElement('p');
            summary.className = 'about-view__post-summary';
            summary.textContent = post.summary;

            const readMore = document.createElement('a');
            readMore.href = post.url;
            readMore.target = '_blank';
            readMore.className = 'about-view__read-more';
            readMore.textContent = 'Read Article →';

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(summary);
            card.appendChild(readMore);

            card.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A') {
                    window.open(post.url, '_blank');
                }
            });

            container.appendChild(card);
        });
    }

    /**
     * Render error state for posts
     */
    _renderPostsError() {
        const container = document.getElementById('about-posts-container');
        if (!container) return;

        this._clearElement(container);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'about-view__error';

        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-triangle';

        const msg = document.createElement('p');
        msg.textContent = 'Unable to load articles. ';

        const link = document.createElement('a');
        link.href = `${this.blogUrl}/search/label/${this.labelFilter}`;
        link.target = '_blank';
        link.textContent = 'View on blog →';

        msg.appendChild(link);
        errorDiv.appendChild(icon);
        errorDiv.appendChild(msg);

        container.appendChild(errorDiv);
    }

    /**
     * Create the YouTube videos section container
     * @returns {HTMLElement}
     */
    _createVideosSection() {
        const section = document.createElement('div');
        section.className = 'about-view__videos-section';

        const header = document.createElement('div');
        header.className = 'about-view__section-header';

        const title = document.createElement('h3');
        const icon = document.createElement('i');
        icon.className = 'fab fa-youtube';
        title.appendChild(icon);
        title.appendChild(document.createTextNode(' YouTube Videos'));

        const viewAllLink = document.createElement('a');
        viewAllLink.href = this.youtubeChannelUrl;
        viewAllLink.target = '_blank';
        viewAllLink.className = 'about-view__view-all';
        viewAllLink.textContent = 'View Channel →';

        header.appendChild(title);
        header.appendChild(viewAllLink);

        const videosContainer = document.createElement('div');
        videosContainer.id = 'about-videos-container';
        videosContainer.className = 'about-view__videos-container';

        this._setLoadingState(videosContainer, 'Loading videos...');

        section.appendChild(header);
        section.appendChild(videosContainer);

        return section;
    }

    /**
     * Fetch videos using AboutService
     */
    async _fetchYouTubeVideos() {
        try {
            if (typeof AboutService === 'undefined') {
                console.error('AboutService not found');
                this._renderVideosError();
                return;
            }

            this.videos = await AboutService.getYouTubeVideos(this.youtubeWorkerUrl);
            this._renderVideos();
        } catch (error) {
            console.error('AboutView: Failed to fetch YouTube videos', error);
            this._renderVideosError();
        }
    }

    /**
     * Render the fetched videos
     */
    _renderVideos() {
        const container = document.getElementById('about-videos-container');
        if (!container) return;

        this._clearElement(container);

        if (this.videos.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'about-view__no-posts';
            empty.textContent = 'No videos found.';
            container.appendChild(empty);
            return;
        }

        this.videos.forEach(video => {
            const card = document.createElement('a');
            card.className = 'about-view__video-card';
            card.href = video.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';

            const thumbnail = document.createElement('div');
            thumbnail.className = 'about-view__video-thumbnail';

            const img = document.createElement('img');
            img.src = video.thumbnail;
            img.alt = video.title;

            const playBtn = document.createElement('div');
            playBtn.className = 'about-view__video-play';
            const playIcon = document.createElement('i');
            playIcon.className = 'fas fa-play';
            playBtn.appendChild(playIcon);

            thumbnail.appendChild(img);
            thumbnail.appendChild(playBtn);

            const info = document.createElement('div');
            info.className = 'about-view__video-info';

            const title = document.createElement('h4');
            title.className = 'about-view__video-title';
            title.textContent = video.title;

            const date = document.createElement('span');
            date.className = 'about-view__video-date';

            const dateIcon = document.createElement('i');
            dateIcon.className = 'fas fa-calendar-alt';
            date.appendChild(dateIcon);
            date.appendChild(document.createTextNode(' ' + video.date));

            info.appendChild(title);
            info.appendChild(date);

            card.appendChild(thumbnail);
            card.appendChild(info);

            container.appendChild(card);
        });
    }

    /**
     * Render error state for videos
     */
    _renderVideosError() {
        const container = document.getElementById('about-videos-container');
        if (!container) return;

        this._clearElement(container);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'about-view__error';

        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-triangle';

        const msg = document.createElement('p');
        msg.textContent = 'Unable to load videos. ';

        const link = document.createElement('a');
        link.href = this.youtubeChannelUrl;
        link.target = '_blank';
        link.textContent = 'View on YouTube →';

        msg.appendChild(link);
        errorDiv.appendChild(icon);
        errorDiv.appendChild(msg);

        container.appendChild(errorDiv);
    }

    /**
     * Get AI context for this view
     * @returns {Object}
     */
    getAIContext() {
        return {
            viewTitle: 'About',
            author: {
                name: 'Mo Khan',
                tagline: 'Software & Engineering Leader | AI-First Development Advocate',
                bio: 'Building SMT with AI-assisted development practices. Exploring the intersection of traditional software engineering and modern AI tooling.',
                links: {
                    blog: this.blogUrl,
                    youtube: this.youtubeChannelUrl,
                    github: 'https://github.com/khanmjk',
                    linkedin: 'https://www.linkedin.com/in/khanmjk/'
                }
            },
            content: {
                blogPosts: this.posts.slice(0, 5).map(p => ({ title: p.title, date: p.date })),
                videos: this.videos.slice(0, 5).map(v => ({ title: v.title, date: v.date }))
            },
            description: 'Displays author information, AI-related blog articles, and YouTube videos. Use this context to answer questions about the developer and their content.'
        };
    }

    _clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}
