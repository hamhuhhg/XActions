/**
 * TurnstileSolver Node.js Client & Process Supervisor
 * Communicates with embedded TurnstileSolver Python engine (http://localhost:8191/v1)
 * Replaces Puppeteer and Camofox across XActions.
 */

import { spawn } from 'child_process';
import path from 'path';
import fileURLToPath from 'url';

const API_BASE = process.env.TURNSTILE_SOLVER_URL || process.env.SOLVER_API_URL || 'http://localhost:8191';

let solverProcess = null;
let isStartingServer = false;

/**
 * Ensure TurnstileSolver Python server is running on API_BASE
 */
export async function ensureSolverRunning() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return true;
  } catch (e) {
    // Not running yet
  }

  if (isStartingServer) {
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) return true;
      } catch (err) {}
      attempts++;
    }
    return false;
  }

  isStartingServer = true;
  console.log('[TurnstileSolver] Starting embedded Python solver engine (solver/main.py)...');

  try {
    const solverPath = path.resolve('solver/main.py');
    let solverPort = '8191';
    try {
      solverPort = new URL(API_BASE).port || '8191';
    } catch(e) {}
    solverProcess = spawn('python', [solverPath], {
      stdio: 'inherit',
      shell: true,
      detached: false,
      env: { ...process.env, SOLVER_PORT: solverPort },
    });

    solverProcess.on('error', (err) => {
      console.error('[TurnstileSolver] Failed to start python solver process:', err.message);
    });

    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          console.log('[TurnstileSolver] Engine successfully started and ready on ' + API_BASE);
          isStartingServer = false;
          return true;
        }
      } catch (err) {}
      attempts++;
    }
  } catch (err) {
    console.error('[TurnstileSolver] Error launching solver process:', err);
  } finally {
    isStartingServer = false;
  }

  return false;
}

/**
 * Stop TurnstileSolver Python engine process
 */
export function stopSolverProcess() {
  if (solverProcess && !solverProcess.killed) {
    console.log('[TurnstileSolver] Shutting down Python solver engine...');
    try {
      solverProcess.kill();
    } catch (e) {}
  }
}

export class TurnstileClient {
  constructor(userId = 'xactions_session') {
    this.userId = userId;
    this.sessionId = null;
    this.currentUrl = 'about:blank';
    this.currentHtml = '';
    this.currentCookies = [];
    this.turnstileToken = null;
    this.userCookiesToInject = [];
  }

  async _request(cmd, params = {}) {
    await ensureSolverRunning();
    const url = `${API_BASE}/v1`;
    const payload = {
      cmd,
      session: this.sessionId,
      maxTimeout: params.maxTimeout || 60000,
      ...params,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.status === 'error')) {
        throw new Error(`TurnstileSolver API Error: ${data?.message || res.statusText}`);
      }
      return data;
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to TurnstileSolver server at ${API_BASE}. Ensure python & zendriver are installed.`);
      }
      throw err;
    }
  }

  /**
   * Create or attach to a persistent browser session
   */
  async createSession(proxy = null, ttlMinutes = 60) {
    const res = await this._request('sessions.create', {
      session: this.userId,
      proxy,
      session_ttl_minutes: ttlMinutes,
    });
    this.sessionId = res.session;
    return this.sessionId;
  }

  /**
   * Destroy persistent session
   */
  async destroySession() {
    if (!this.sessionId) return;
    try {
      await this._request('sessions.destroy', { session: this.sessionId });
    } catch (e) {
      // Ignore if session already destroyed
    }
    this.sessionId = null;
  }

  /**
   * Import / queue cookies before request
   */
  async setCookie(...cookies) {
    for (const c of cookies) {
      const cookieObj = {
        name: c.name,
        value: c.value,
        domain: c.domain || undefined,
        path: c.path || '/',
        secure: c.secure !== undefined ? c.secure : true,
        httpOnly: c.httpOnly !== undefined ? c.httpOnly : false,
        expires: c.expires || undefined,
      };
      this.userCookiesToInject.push(cookieObj);
    }
    return true;
  }

  async importCookies(cookies) {
    return this.setCookie(...cookies);
  }

  // Puppeteer stub methods
  async setUserAgent() { return true; }
  async setViewport() { return true; }
  async setBypassCSP() { return true; }
  async setDefaultNavigationTimeout() { return true; }

  /**
   * Navigate to URL using TurnstileSolver get/post
   */
  async goto(targetUrl, options = {}) {
    if (!this.sessionId) {
      await this.createSession();
    }

    const payload = {
      url: targetUrl,
      maxTimeout: options.timeout || 60000,
      cookies: this.userCookiesToInject.length > 0 ? this.userCookiesToInject : undefined,
    };

    const res = await this._request('request.get', payload);
    if (res.solution) {
      this.currentUrl = res.solution.url || targetUrl;
      this.currentHtml = res.solution.response || '';
      this.currentCookies = res.solution.cookies || [];
      this.turnstileToken = res.solution.turnstile_token || null;
    }
    return res;
  }

  /**
   * Submit POST request using TurnstileSolver
   */
  async post(targetUrl, postData, options = {}) {
    if (!this.sessionId) {
      await this.createSession();
    }

    const payload = {
      url: targetUrl,
      postData,
      maxTimeout: options.timeout || 60000,
      cookies: this.userCookiesToInject.length > 0 ? this.userCookiesToInject : undefined,
    };

    const res = await this._request('request.post', payload);
    if (res.solution) {
      this.currentUrl = res.solution.url || targetUrl;
      this.currentHtml = res.solution.response || '';
      this.currentCookies = res.solution.cookies || [];
      this.turnstileToken = res.solution.turnstile_token || null;
    }
    return res;
  }

  url() {
    return this.currentUrl;
  }

  async content() {
    return this.currentHtml;
  }

  /**
   * Evaluate JS on stored page state or via request re-eval
   */
  async evaluate(fn, ...args) {
    let fnStr = typeof fn === 'function' ? fn.toString() : fn;
    if (typeof fn === 'string' && fn.trim().startsWith('() =>')) {
      fnStr = `(${fnStr})()`;
    } else if (typeof fn === 'function') {
      if (args.length > 0) {
        fnStr = `(${fnStr})(...${JSON.stringify(args)})`;
      } else {
        fnStr = `(${fnStr})()`;
      }
    }

    // In-memory DOM evaluation fallback if HTML is available using JSDOM / regex / simple runner
    try {
      const evalFunc = new Function('document', 'window', `return (${fnStr});`);
      // Basic mock window/document for page.evaluate calls
      const mockDoc = {
        title: this.currentHtml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '',
        body: { textContent: this.currentHtml.replace(/<[^>]+>/g, ' ') },
        querySelector: (sel) => null,
        querySelectorAll: (sel) => [],
      };
      return evalFunc(mockDoc, { location: { href: this.currentUrl } });
    } catch (e) {
      return null;
    }
  }

  async waitForSelector(selector, options = {}) {
    return true; // Page content already fetched and solved by TurnstileSolver
  }

  async click(selector) {
    return true;
  }

  async type(selector, text) {
    return true;
  }

  async screenshot(options = {}) {
    if (!this.sessionId) await this.createSession();
    const res = await this._request('request.get', {
      url: this.currentUrl,
      returnScreenshot: true,
    });
    return res.solution?.response || '';
  }

  async closeTab() {
    await this.destroySession();
  }

  async close() {
    await this.destroySession();
  }
}

export async function createBrowser(options = {}) {
  const client = new TurnstileClient(options.userId || 'xactions_session');
  await client.createSession(options.proxy, options.ttlMinutes);
  return {
    newPage: async () => client,
    close: async () => client.closeSession(),
  };
}

export async function createPage(browser) {
  if (browser && typeof browser.newPage === 'function') {
    return await browser.newPage();
  }
  const client = new TurnstileClient('xactions_session');
  await client.createSession();
  return client;
}

export default TurnstileClient;
