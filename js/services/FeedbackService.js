/**
 * FeedbackService
 * Handles submission of user feedback to the Cloudflare Worker proxy.
 * The worker then creates a GitHub issue.
 */
const FeedbackService = {
  // Cloudflare Worker URL for feedback submission
  WORKER_URL: 'https://smt-feedback-worker.khanmjk.workers.dev',

  /**
   * Submit feedback to GitHub Issues via the Cloudflare Worker
   * @param {Object} feedbackData - The feedback data
   * @param {string} feedbackData.type - 'Bug Report', 'Feature Request', 'General Feedback', or 'Other'
   * @param {string} feedbackData.description - The feedback content (required)
   * @param {string} [feedbackData.title] - Optional title/summary
   * @param {string} [feedbackData.email] - Optional email for follow-up
   * @param {boolean} [feedbackData.includeContext] - Whether to include app context
   * @returns {Promise<{success: boolean, issueNumber?: number, issueUrl?: string, error?: string}>}
   */
  async submitFeedback(feedbackData) {
    // Validate required fields
    if (!feedbackData.type || !feedbackData.description) {
      return {
        success: false,
        error: 'Feedback type and description are required',
      };
    }

    // Build payload
    const payload = {
      type: feedbackData.type,
      description: feedbackData.description,
      title: feedbackData.title || '',
      email: feedbackData.email || '',
      userAgent: navigator.userAgent,
    };

    const marketplaceHandle = this.getMarketplaceHandle();
    if (marketplaceHandle) {
      payload.reporterHandle = marketplaceHandle;
    }

    // Include app context if requested
    if (feedbackData.includeContext) {
      payload.context = this.getAppContext();
      payload.currentView = this.getCurrentView();
    }

    try {
      const response = await fetch(this.WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('FeedbackService: Submission failed', result);
        return {
          success: false,
          error: result.error || `Request failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        issueNumber: result.issueNumber,
        issueUrl: result.issueUrl,
      };
    } catch (error) {
      console.error('FeedbackService: Network error', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  },

  /**
   * Get the current view name from navigation
   * @returns {string}
   */
  getCurrentView() {
    return navigationManager.currentView || 'unknown';
  },

  /**
   * Gather app context for debugging
   * @returns {Object}
   */
  getAppContext() {
    const context = {
      timestamp: new Date().toISOString(),
      currentView: this.getCurrentView(),
    };

    // Add system info if available
    const currentSystem = SystemService.getCurrentSystem();
    if (currentSystem) {
      context.systemName = currentSystem.systemName;
      context.hasTeams = (currentSystem.teams || []).length;
      context.hasServices = (currentSystem.services || []).length;
      context.hasInitiatives = (currentSystem.initiatives || []).length;
    }

    // Add settings info
    const settings = SettingsService.get();
    if (settings) {
      context.theme = settings.theme?.mode || 'light';
      context.aiEnabled = settings.ai?.isEnabled || false;
    }

    return context;
  },

  /**
   * If user is signed into the Community Marketplace, return their GitHub handle.
   * This is used to credit the reporter in feedback issues without requiring write scopes.
   * @returns {string}
   */
  getMarketplaceHandle() {
    try {
      if (typeof MarketplaceAuthService === 'undefined') return '';
      if (!MarketplaceAuthService.isLoggedIn()) return '';
      const session = MarketplaceAuthService.getSession();
      const handle = session?.user?.handle ? String(session.user.handle).trim() : '';
      return handle;
    } catch {
      return '';
    }
  },

  /**
   * Check if the worker URL has been configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.WORKER_URL && !this.WORKER_URL.includes('YOUR_SUBDOMAIN');
  },
};
