/**
 * XActions Unified Browser Adapter & Lifecycle Manager
 *
 * Provides a standardized, robust interface for managing browser instances,
 * stealth sessions, cookies, page lifecycles, and anti-detection mechanisms.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import TurnstileClient, {
  createBrowser as createTurnstileBrowser,
  createPage as createTurnstilePage,
  ensureSolverRunning,
} from '../solver/turnstile-client.js';
import { normalizeFacebookCookies } from './cookies.js';

/**
 * Standard delay helper
 * @param {number} ms Milliseconds to wait
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Randomized jitter delay to emulate human behavior
 * @param {number} min Minimum delay in ms (default: 1000)
 * @param {number} max Maximum delay in ms (default: 3000)
 * @returns {Promise<void>}
 */
export const randomDelay = (min = 1000, max = 3000) => {
  const delay = Math.floor(min + Math.random() * (max - min));
  return sleep(delay);
};

/**
 * Unified Browser Manager
 */
export class BrowserManager {
  constructor(options = {}) {
    this.options = {
      sessionId: options.sessionId || 'xactions_default',
      headless: options.headless !== false,
      timeout: options.timeout || 30000,
      ...options,
    };
    this.client = null;
    this.isOpen = false;
  }

  /**
   * Initializes the browser engine and connects to the solver session
   * @returns {Promise<{browser: TurnstileClient, page: TurnstileClient}>}
   */
  async launch() {
    if (this.client && this.isOpen) {
      return { browser: this.client, page: this.client };
    }

    await ensureSolverRunning();
    this.client = new TurnstileClient(this.options.sessionId);
    await this.client.createSession();
    this.isOpen = true;

    return { browser: this.client, page: this.client };
  }

  /**
   * Set authentication cookie for X/Twitter
   * @param {string} authToken The auth_token cookie value
   */
  async setAuthToken(authToken) {
    if (!this.client) {
      await this.launch();
    }

    await this.client.setCookie({
      name: 'auth_token',
      value: authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
  }

  /**
   * Set authentication cookies for Facebook / Meta
   * @param {string} tokenString Formatted c_user & xs or cookie string
   */
  async setFacebookAuth(tokenString) {
    if (!this.client) {
      await this.launch();
    }

    const cookies = normalizeFacebookCookies(tokenString);
    if (cookies.length > 0) {
      await this.client.setCookie(...cookies);
    } else if (tokenString.includes(':')) {
      const [cUser, xs] = tokenString.split(':');
      const fallback = [];
      if (cUser) fallback.push({ name: 'c_user', value: cUser.trim(), domain: '.facebook.com', path: '/' });
      if (xs) fallback.push({ name: 'xs', value: xs.trim(), domain: '.facebook.com', path: '/' });
      if (fallback.length > 0) {
        await this.client.setCookie(...fallback);
      }
    }
  }

  /**
   * Navigate to a URL with human-like randomized waiting
   * @param {string} url
   * @param {object} options
   */
  async navigate(url, options = {}) {
    if (!this.client) {
      await this.launch();
    }
    const response = await this.client.goto(url, {
      waitUntil: options.waitUntil || 'domcontentloaded',
      timeout: options.timeout || this.options.timeout,
    });
    await randomDelay(1000, 2500);
    return response;
  }

  /**
   * Safely scroll down the page to trigger dynamic content loading
   * @param {number} scrollCount Number of scroll steps
   * @param {number} distance Distance per step in pixels
   */
  async autoScroll(scrollCount = 3, distance = 800) {
    if (!this.client) return;

    for (let i = 0; i < scrollCount; i++) {
      await this.client.evaluate((d) => {
        window.scrollBy({ top: d, behavior: 'smooth' });
      }, distance);
      await randomDelay(1500, 3000);
    }
  }

  /**
   * Executes a task within a controlled browser lifecycle and guarantees cleanup
   * @param {Function} taskFn Async function receiving { browser, page, manager }
   * @returns {Promise<any>} Result of taskFn
   */
  static async withBrowser(options = {}, taskFn) {
    const manager = new BrowserManager(options);
    try {
      const session = await manager.launch();
      return await taskFn({ ...session, manager });
    } finally {
      await manager.close();
    }
  }

  /**
   * Close the browser session and clean up resources
   */
  async close() {
    if (this.client && this.isOpen) {
      try {
        await this.client.closeTab();
      } catch {
        // Ignore close errors during teardown
      } finally {
        this.client = null;
        this.isOpen = false;
      }
    }
  }
}

/**
 * Factory helper to create a browser instance
 */
export async function createBrowser(options = {}) {
  return await createTurnstileBrowser(options);
}

/**
 * Factory helper to create a page instance
 */
export async function createPage(browser) {
  return await createTurnstilePage(browser);
}

export default BrowserManager;
