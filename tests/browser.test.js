import { describe, it, expect } from 'vitest';
import { BrowserManager, sleep, randomDelay } from '../src/core/browser.js';
import * as XActions from '../src/index.js';

describe('XActions Core Browser Manager & Utilities', () => {
  it('should export sleep and randomDelay functions', async () => {
    expect(typeof sleep).toBe('function');
    expect(typeof randomDelay).toBe('function');

    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('should instantiate BrowserManager with default options', () => {
    const manager = new BrowserManager();
    expect(manager).toBeDefined();
    expect(manager.options.sessionId).toBe('xactions_default');
    expect(manager.options.headless).toBe(true);
    expect(manager.isOpen).toBe(false);
  });

  it('should instantiate BrowserManager with custom options', () => {
    const manager = new BrowserManager({
      sessionId: 'custom_session_123',
      headless: false,
      timeout: 15000,
    });
    expect(manager.options.sessionId).toBe('custom_session_123');
    expect(manager.options.headless).toBe(false);
    expect(manager.options.timeout).toBe(15000);
  });

  it('should export BrowserManager and factory helpers from core and root entrypoints', () => {
    expect(XActions.BrowserManager).toBeDefined();
    expect(XActions.core.BrowserManager).toBeDefined();
    expect(typeof XActions.createBrowser).toBe('function');
    expect(typeof XActions.createPage).toBe('function');
    expect(typeof XActions.sleep).toBe('function');
    expect(typeof XActions.randomDelay).toBe('function');
  });
});
