/**
 * XActions Scrapers
 * No-API-required scrapers for X/Twitter data
 *
 * Uses Puppeteer with stealth mode to avoid detection.
 * All scrapers include human-like delays and rate limiting.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { createBrowser, createPage, sleep, randomDelay, BrowserManager } from '../core/index.js';

// Import domain sub-modules
import { loginWithCookie, loginWithFacebookCookie } from './auth.js';
import { scrapeProfile, scrapeFollowers, scrapeFollowing } from './profiles.js';
import {
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapeLikes,
  scrapeHashtag,
  scrapeMedia,
  scrapeListMembers,
} from './tweets.js';
import { exportToJSON, exportToCSV } from './export.js';

// Core utilities re-exports
export { createBrowser, createPage, sleep, randomDelay, BrowserManager };

// Re-export domain scrapers
export * from './auth.js';
export * from './profiles.js';
export * from './tweets.js';
export * from './export.js';

// Default export for backward compatibility
export default {
  // Core
  createBrowser,
  createPage,
  loginWithCookie,
  loginWithFacebookCookie,

  // Scrapers
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapeLikes,
  scrapeHashtag,
  scrapeMedia,
  scrapeListMembers,

  // Export
  exportToJSON,
  exportToCSV,
};
