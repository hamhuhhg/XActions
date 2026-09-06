/**
 * Camofox HTTP API Client
 * Replaces Puppeteer/Playwright with pure HTTP requests to the camofox-browser server
 */

import crypto from 'crypto';

const API_BASE = process.env.CAMOFOX_API_URL || 'http://localhost:9377';

export class CamofoxClient {
  constructor(userId) {
    this.userId = userId || 'xactions';
    this.tabId = null;
  }

  async _request(endpoint, method = 'POST', body = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (process.env.CAMOFOX_API_KEY) {
      options.headers['Authorization'] = `Bearer ${process.env.CAMOFOX_API_KEY}`;
    }
    if (body) {
      options.body = JSON.stringify({ userId: this.userId, ...body });
    }
    
    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(`Camofox API Error (${res.status}): ${JSON.stringify(data || res.statusText)}`);
      }
      return data;
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to camofox-browser server at ${API_BASE}. Please ensure 'npm start' is running in the camofox-browser repository.`);
      }
      throw err;
    }
  }

  /**
   * Import cookies (Playwright format) into the browser session
   */
  async importCookies(cookies) {
    const url = `${API_BASE}/sessions/${encodeURIComponent(this.userId)}/cookies`;
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.CAMOFOX_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.CAMOFOX_API_KEY}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cookies })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Cookie import failed: ${JSON.stringify(data)}`);
    return data;
  }

  // Puppeteer duck-typing methods
  async setCookie(cookie) {
      return this.importCookies([cookie]);
  }

  async setUserAgent(ua) {
      // Stub: Camoufox fingerprint handles this automatically, no op needed
      return true;
  }

  async setViewport(vp) {
      // Stub: Camoufox fingerprint handles this automatically, no op needed
      return true;
  }

  /**
   * Create a new tab and optionally navigate
   */
  async createTab(url = null) {
    const body = { sessionKey: `${this.userId}_session` };
    if (url) body.url = url;
    const res = await this._request('/tabs', 'POST', body);
    this.tabId = res.tabId;
    return this.tabId;
  }

  /**
   * Navigate an existing tab
   */
  async goto(url, options = {}) {
    if (!this.tabId) await this.createTab();
    return await this._request(`/tabs/${this.tabId}/navigate`, 'POST', { url });
  }

  /**
   * Wait for a CSS selector or MS
   */
  async wait(options) {
    // options: { selector, timeout, state } or { ms }
    return await this._request(`/tabs/${this.tabId}/wait`, 'POST', options);
  }

  /**
   * Get an accessibility snapshot with element refs
   */
  async snapshot() {
    const url = `${API_BASE}/tabs/${this.tabId}/snapshot?userId=${encodeURIComponent(this.userId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Snapshot failed: ${res.statusText}`);
    return await res.json();
  }

  /**
   * Click an element by CSS selector or Ref
   */
  async click(selectorOrRef) {
    const isRef = /^e\d+$/.test(selectorOrRef);
    const body = isRef ? { ref: selectorOrRef } : { selector: selectorOrRef };
    return await this._request(`/tabs/${this.tabId}/click`, 'POST', body);
  }

  /**
   * Type text into an element by CSS selector or Ref
   */
  async type(selectorOrRef, text, pressEnter = false) {
    const isRef = /^e\d+$/.test(selectorOrRef);
    const body = isRef ? { ref: selectorOrRef, text, pressEnter } : { selector: selectorOrRef, text, pressEnter };
    return await this._request(`/tabs/${this.tabId}/type`, 'POST', body);
  }

  /**
   * Evaluate a JavaScript expression in the page context
   * Supports passing arguments and native functions
   */
  async evaluate(expression, ...args) {
    let exprStr = typeof expression === 'function' ? expression.toString() : expression;
    
    // Auto-wrap string arrow functions in IIFE
    if (typeof expression === 'string' && expression.trim().startsWith('() =>')) {
        exprStr = `(${exprStr})()`;
    }

    // Wrap function in IIFE and pass args
    if (args.length > 0) {
      const argsStr = JSON.stringify(args);
      exprStr = `(${exprStr})(...${argsStr})`;
    } else if (typeof expression === 'function') {
      exprStr = `(${exprStr})()`;
    }

    const res = await this._request(`/tabs/${this.tabId}/evaluate`, 'POST', { expression: exprStr });
    return res.result;
  }

  /**
   * Close the current tab
   */
  async closeTab() {
    if (!this.tabId) return;
    const url = `${API_BASE}/tabs/${this.tabId}`;
    await fetch(url, { method: 'DELETE' });
    this.tabId = null;
  }
}
