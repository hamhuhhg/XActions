/**
 * TurnstileSolver Node.js Client & Process Supervisor
 * Communicates with embedded TurnstileSolver Python engine (http://localhost:8191/v1)
 * Replaces Puppeteer and Camofox across XActions.
 */

import { spawn } from 'child_process';
import path from 'path';

const API_BASE =
  process.env.TURNSTILE_SOLVER_URL || process.env.SOLVER_API_URL || 'http://localhost:8191';

let solverProcess = null;
let isStartingServer = false;
let isSolverConfirmedRunning = false;

/**
 * Ensure TurnstileSolver Python server is running on API_BASE
 */
export async function ensureSolverRunning() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      isSolverConfirmedRunning = true;
      return true;
    }
  } catch (e) {
    isSolverConfirmedRunning = false;
  }

  if (isStartingServer) {
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          isSolverConfirmedRunning = true;
          return true;
        }
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
    } catch (e) {}
    solverProcess = spawn('python', [solverPath], {
      stdio: 'ignore',
      shell: true,
      detached: false,
      env: { ...process.env, SOLVER_PORT: solverPort },
    });

    solverProcess.on('error', (err) => {
      console.error('[TurnstileSolver] Failed to start python solver process:', err.message);
    });

    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          console.log('[TurnstileSolver] Engine successfully started and ready on ' + API_BASE);
          isStartingServer = false;
          isSolverConfirmedRunning = true;
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
  isSolverConfirmedRunning = false;
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
    this.dataSaver = true;
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

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
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
        if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
          isSolverConfirmedRunning = false;
          if (attempts < 2) {
            console.log('[TurnstileSolver] Connection lost, reconnecting/starting solver engine...');
            await ensureSolverRunning();
            continue;
          }
          throw new Error(
            `Cannot connect to TurnstileSolver server at ${API_BASE}. Ensure python & zendriver are installed.`
          );
        }
        throw err;
      }
    }
  }

  /**
   * Create or attach to a persistent browser session
   */
  async createSession(proxy = null, ttlMinutes = 60, dataSaver = true) {
    this.dataSaver = dataSaver;
    const res = await this._request('sessions.create', {
      session: this.userId,
      proxy,
      session_ttl_minutes: ttlMinutes,
      dataSaver: dataSaver,
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
    const validCookies = [];
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
      validCookies.push(cookieObj);
    }
    this.userCookiesToInject = validCookies;

    // If session is already created, apply cookies directly via CDP
    if (this.sessionId && validCookies.length > 0) {
      try {
        await this._request('sessions.set_cookies', { cookies: validCookies });
      } catch (e) {
        // Fallback to next request.get
      }
    }
    return true;
  }

  async importCookies(cookies) {
    return this.setCookie(...cookies);
  }

  async getCookies() {
    try {
      const res = await this._request('sessions.cookies');
      return res.cookies || [];
    } catch (e) {
      return null;
    }
  }

  async cookies() {
    return this.getCookies();
  }

  // Puppeteer stub methods
  async setUserAgent() {
    return true;
  }
  async setViewport() {
    return true;
  }
  async setBypassCSP() {
    return true;
  }
  async setDefaultNavigationTimeout() {
    return true;
  }

  /**
   * Navigate to URL using TurnstileSolver get/post
   */
  async goto(targetUrl, options = {}) {
    const effectiveDataSaver = options.dataSaver !== undefined ? options.dataSaver : (this.dataSaver !== undefined ? this.dataSaver : true);
    const effectiveDisableMedia = options.disableMedia !== undefined ? options.disableMedia : effectiveDataSaver;

    if (!this.sessionId) {
      await this.createSession(null, 60, effectiveDataSaver);
    }

    const payload = {
      url: targetUrl,
      maxTimeout: options.timeout || 60000,
      cookies: this.userCookiesToInject.length > 0 ? this.userCookiesToInject : undefined,
      disableMedia: effectiveDisableMedia,
      dataSaver: effectiveDataSaver,
    };

    const res = await this._request('request.get', payload);
    this.userCookiesToInject = []; // Reset after navigation
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
    const effectiveDataSaver = options.dataSaver !== undefined ? options.dataSaver : (this.dataSaver !== undefined ? this.dataSaver : true);
    const effectiveDisableMedia = options.disableMedia !== undefined ? options.disableMedia : effectiveDataSaver;

    if (!this.sessionId) {
      await this.createSession(null, 60, effectiveDataSaver);
    }

    const payload = {
      url: targetUrl,
      postData,
      maxTimeout: options.timeout || 60000,
      cookies: this.userCookiesToInject.length > 0 ? this.userCookiesToInject : undefined,
      disableMedia: effectiveDisableMedia,
      dataSaver: effectiveDataSaver,
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
   * Evaluate JS on live browser session or stored page state
   */
  async evaluate(fn, ...args) {
    let fnStr;
    if (typeof fn === 'function') {
      fnStr = `(${fn.toString()})(...${JSON.stringify(args)})`;
    } else if (typeof fn === 'string') {
      const trimmed = fn.trim();
      if (/^\s*\([^\)]*\)\s*=>/.test(trimmed) || /^\s*function\b/.test(trimmed) || /^\s*\([^)]*\)\s*\{/.test(trimmed)) {
        fnStr = `(${trimmed})(...${JSON.stringify(args)})`;
      } else if (/^\s*\(.*?\)\s*\(\s*\)$/.test(trimmed)) {
        fnStr = trimmed;
      } else {
        fnStr = trimmed;
      }
    } else {
      fnStr = String(fn);
    }

    if (this.sessionId) {
      try {
        const res = await this._request('sessions.evaluate', { postData: fnStr });
        if (res && res.result !== undefined) {
          return res.result;
        }
      } catch (err) {
        // Fallback to local evaluation
      }
    }

    // In-memory DOM evaluation fallback if live eval unavailable
    try {
      const evalFunc = new Function('document', 'window', `return (${fnStr});`);
      const bodyText = (this.currentHtml || '').replace(/<[^>]+>/g, ' ');
      const mockDoc = {
        title: this.currentHtml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '',
        body: { textContent: bodyText, innerText: bodyText },
        querySelector: (sel) => null,
        querySelectorAll: (sel) => [],
      };
      return evalFunc(mockDoc, { location: { href: this.currentUrl } });
    } catch (e) {
      return null;
    }
  }

  async wait(opts) {
    if (typeof opts === 'number') {
      await new Promise(r => setTimeout(r, opts));
      return true;
    }
    const selector = typeof opts === 'string' ? opts : opts?.selector;
    const timeout = (typeof opts === 'object' && opts.timeout) || 10000;
    return await this.waitForSelector(selector, { timeout });
  }

  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || 10000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = await this.evaluate(`() => {
        const sel = ${JSON.stringify(selector)};
        const el = document.querySelector(sel);
        return !!(el && (el.offsetHeight > 0 || el.offsetWidth > 0 || el.getBoundingClientRect().height > 0));
      }`);
      if (found) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  }

  async click(selector) {
    return await this.evaluate(`() => {
      const sel = ${JSON.stringify(selector)};
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        return true;
      }
      return false;
    }`);
  }

  async type(selectorOrText, text = null) {
    let textToType = text;
    if (text === null && typeof selectorOrText === 'string') {
      textToType = selectorOrText;
    } else if (selectorOrText && text) {
      await this.evaluate(`(sel) => {
        const el = document.querySelector(sel);
        if (el) el.focus();
      }`, selectorOrText);
    }
    if (this.sessionId && textToType) {
      try {
        const res = await this._request('sessions.type', { postData: textToType });
        return res?.result ?? true;
      } catch (e) {
        // Fallback
      }
    }
    return true;
  }

  async sendFile(selectorOrPath, filePath = null) {
    let targetSelector = selectorOrPath;
    let targetPath = filePath;
    if (filePath === null && typeof selectorOrPath === 'string') {
      targetSelector = 'input[type="file"]';
      targetPath = selectorOrPath;
    }
    if (this.sessionId && targetPath) {
      try {
        const absPath = path.resolve(targetPath);
        const res = await this._request('sessions.send_file', {
          postData: absPath,
          turnstile_input_name: targetSelector,
        });
        return res?.result ?? true;
      } catch (e) {
        console.error('[TurnstileClient sendFile error]', e.message);
        return false;
      }
    }
    return false;
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
