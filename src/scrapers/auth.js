/**
 * XActions Authentication Utilities
 * Session cookie handlers for X/Twitter and Facebook
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */
import { normalizeFacebookCookies } from '../core/cookies.js';

/**
 * Login with session cookie
 * @param {Object} page - Browser page instance
 * @param {string} authToken - auth_token cookie
 * @param {Object} [options] - Optional navigation options
 * @returns {Promise<Object>} Page instance
 */
export async function loginWithCookie(page, authToken, options = {}) {
  const { timeout = 30000, waitUntil = 'domcontentloaded' } = options;
  await page.setCookie({
    name: 'auth_token',
    value: authToken,
    domain: '.x.com',
    path: '/',
    httpOnly: true,
    secure: true,
  });
  await page.goto('https://x.com/home', { waitUntil, timeout });
  return page;
}

/**
 * Login with Facebook session cookie
 * @param {Object} page - Browser page instance
 * @param {string} tokenString - Token string or JSON array
 * @param {Object} [options] - Optional navigation options
 * @returns {Promise<Object>} Page instance
 */
export async function loginWithFacebookCookie(page, tokenString, options = {}) {
  const { timeout = 30000, waitUntil = 'domcontentloaded' } = options;
  const cookiesToSet = normalizeFacebookCookies(tokenString);
  const cUser = cookiesToSet.find((c) => c.name === 'c_user')?.value;
  const xs = cookiesToSet.find((c) => c.name === 'xs')?.value;

  if (!cUser || !xs) {
    throw new Error('Invalid Facebook token format. Must contain c_user and xs.');
  }

  await page.setCookie(...cookiesToSet);
  await page.goto('https://www.facebook.com/', { waitUntil, timeout });
  return page;
}
