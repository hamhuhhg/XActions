/**
 * Scraper Controller for XActions API
 * Handles data scraping requests and browser lifecycle management
 */

import scrapers from '../../src/scrapers/index.js';

/**
 * Universal helper function to execute scraping actions safely
 */
export const handleScrape = async (req, res, scraperFn, ...args) => {
  let browser = null;
  try {
    browser = await scrapers.createBrowser();
    const page = await scrapers.createPage(browser);

    // Check if auth_token is provided (some scrapers work better with login)
    const authToken = req.headers['x-auth-token'] || req.cookies?.auth_token;
    if (authToken) {
      await scrapers.loginWithCookie(page, authToken);
    }

    const result = await scraperFn(page, ...args);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

/**
 * GET /api/profile
 */
export async function getProfile(req, res) {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  return handleScrape(req, res, scrapers.scrapeProfile, username);
}

/**
 * GET /api/followers
 */
export async function getFollowers(req, res) {
  const { username, limit } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  return handleScrape(req, res, scrapers.scrapeFollowers, username, { limit: parseInt(limit) || 100 });
}

/**
 * GET /api/following
 */
export async function getFollowing(req, res) {
  const { username, limit } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  return handleScrape(req, res, scrapers.scrapeFollowing, username, { limit: parseInt(limit) || 100 });
}

/**
 * GET /api/tweets
 */
export async function getTweets(req, res) {
  const { username, limit, includeReplies } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  return handleScrape(req, res, scrapers.scrapeTweets, username, {
    limit: parseInt(limit) || 50,
    includeReplies: includeReplies === 'true',
  });
}

/**
 * GET /api/search
 */
export async function searchTweets(req, res) {
  const { query, limit, filter } = req.query;
  if (!query) return res.status(400).json({ error: 'Query is required' });
  return handleScrape(req, res, scrapers.searchTweets, query, {
    limit: parseInt(limit) || 50,
    filter: filter || 'latest',
  });
}

/**
 * GET /api/hashtag
 */
export async function getHashtag(req, res) {
  const { tag, limit } = req.query;
  if (!tag) return res.status(400).json({ error: 'Tag is required' });
  return handleScrape(req, res, scrapers.scrapeHashtag, tag, { limit: parseInt(limit) || 50 });
}

/**
 * GET /api/thread
 */
export async function getThread(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  return handleScrape(req, res, scrapers.scrapeThread, url);
}

/**
 * GET /api/media
 */
export async function getMedia(req, res) {
  const { username, limit } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  return handleScrape(req, res, scrapers.scrapeMedia, username, { limit: parseInt(limit) || 50 });
}
