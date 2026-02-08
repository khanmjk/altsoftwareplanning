/**
 * MarketplaceAuthService
 *
 * GitHub OAuth session management for the Community Blueprints Marketplace worker.
 *
 * Auth model:
 * - Popup-based OAuth via worker endpoints.
 * - Worker callback posts a signed session token back to the opener via postMessage.
 * - App stores the session token in UI prefs via SystemRepository (no direct localStorage usage).
 */

const MARKETPLACE_SESSION_PREF_KEY = 'smt_marketplace_session_v1';
const MARKETPLACE_AUTH_WORKER_BASE_URL = 'https://smt-blueprints-worker.khanmjk.workers.dev';

function authNormalizeString(value) {
  return String(value || '').trim();
}

function authDeepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function authNowIso() {
  return new Date().toISOString();
}

function authGetWorkerBaseUrl() {
  return MARKETPLACE_AUTH_WORKER_BASE_URL;
}

function authGetWorkerOrigin() {
  try {
    return new URL(authGetWorkerBaseUrl()).origin;
  } catch {
    return '';
  }
}

function authReadSession() {
  const raw = systemRepository.getUiPref(MARKETPLACE_SESSION_PREF_KEY, null);
  if (!raw || typeof raw !== 'object') return null;
  if (!authNormalizeString(raw.token)) return null;
  if (!raw.user || typeof raw.user !== 'object') return null;
  const storedWorkerBaseUrl = authNormalizeString(raw.workerBaseUrl || '');
  const currentWorkerOrigin = authGetWorkerOrigin();
  if (storedWorkerBaseUrl && currentWorkerOrigin) {
    try {
      if (new URL(storedWorkerBaseUrl).origin !== currentWorkerOrigin) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return authDeepClone(raw);
}

function authWriteSession(session) {
  systemRepository.setUiPref(MARKETPLACE_SESSION_PREF_KEY, session);
}

const MarketplaceAuthService = {
  getWorkerBaseUrl() {
    return authGetWorkerBaseUrl();
  },

  getWorkerOrigin() {
    return authGetWorkerOrigin();
  },

  getSession() {
    return authReadSession();
  },

  isLoggedIn() {
    return !!authReadSession();
  },

  getToken() {
    return authReadSession()?.token || '';
  },

  getAuthHeader() {
    const token = this.getToken();
    return token ? `Bearer ${token}` : '';
  },

  logout() {
    systemRepository.setUiPref(MARKETPLACE_SESSION_PREF_KEY, null);
  },

  async loginWithGitHub() {
    const workerBaseUrl = this.getWorkerBaseUrl();
    const workerOrigin = this.getWorkerOrigin();
    if (!workerOrigin) {
      return { success: false, error: 'Marketplace worker URL is invalid.' };
    }

    const appOrigin = authNormalizeString(window.location.origin);
    if (!appOrigin || appOrigin === 'null') {
      return {
        success: false,
        error: 'Marketplace login requires the app to be served over http(s), not file://.',
      };
    }

    const startUrl = new URL('/api/auth/github/start', workerOrigin);
    startUrl.searchParams.set('origin', appOrigin);

    const width = 640;
    const height = 720;
    const left = Math.max(0, Math.floor(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.floor(window.screenY + (window.outerHeight - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top}`;

    const popup = window.open(startUrl.toString(), 'smt-marketplace-auth', features);
    if (!popup) {
      return { success: false, error: 'Popup blocked. Allow popups to sign in.' };
    }

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearInterval(pollTimer);
      };

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };

      const onMessage = (event) => {
        if (event.origin !== workerOrigin) return;
        const data = event.data || {};
        if (data.type !== 'smt-marketplace-auth') return;
        const token = authNormalizeString(data.token);
        if (!token) {
          finish({ success: false, error: 'Login response missing token.' });
          return;
        }

        const user = data.user && typeof data.user === 'object' ? data.user : null;
        if (!user) {
          finish({ success: false, error: 'Login response missing user.' });
          return;
        }

        const session = {
          token,
          user: authDeepClone(user),
          savedAt: authNowIso(),
          workerBaseUrl,
        };
        authWriteSession(session);
        finish({ success: true, session: authDeepClone(session) });
      };

      window.addEventListener('message', onMessage);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          finish({ success: false, error: 'Login cancelled.' });
        }
      }, 500);
    });
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketplaceAuthService;
}
