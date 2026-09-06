/**
 * XActions - The Complete X/Twitter Automation Toolkit
 *
 * "Don't Panic." - The Hitchhiker's Guide to the Galaxy
 *
 * Features:
 * - Scrapers: Profile, followers, following, tweets, threads, media
 * - MCP Server: AI agent integration for Claude, GPT, etc.
 * - CLI: Command-line interface for all operations
 * - Browser Scripts: Copy-paste scripts for X.com console
 * - Core Engine: Centralized DOM selectors and stealth automation utilities
 * - SaaS API: Self-hosted automation platform
 *
 * No Twitter API required - saves $100-$5000+/month!
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 * @towel Always know where yours is
 */

// Re-export all scrapers
export * from './scrapers/index.js';

// Re-export core engine & selectors
export * from './core/index.js';

// Re-export automation modules
export * from './automation/index.js';

// Default export for convenience
import scrapers from './scrapers/index.js';
import * as core from './core/index.js';
import * as automation from './automation/index.js';

export { scrapers, core, automation };
export default scrapers;

/**
 * Quick start example:
 *
 * ```javascript
 * import { createBrowser, createPage, scrapeProfile, scrapeFollowers, SELECTORS } from 'xactions';
 *
 * const browser = await createBrowser();
 * const page = await createPage(browser);
 *
 * // Get profile info
 * const profile = await scrapeProfile(page, 'elonmusk');
 * console.log(profile);
 *
 * // Scrape followers
 * const followers = await scrapeFollowers(page, 'elonmusk', { limit: 100 });
 * console.log(followers);
 *
 * await browser.close();
 * ```
 */
