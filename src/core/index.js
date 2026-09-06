/**
 * XActions Core Engine
 *
 * Provides shared selectors, browser lifecycle abstractions, and core utilities.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

export * from './selectors.js';
export { default as SELECTORS, getSelector } from './selectors.js';
export * from './browser.js';
export { default as BrowserManager } from './browser.js';
export * from './cookies.js';
