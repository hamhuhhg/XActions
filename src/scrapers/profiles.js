/**
 * XActions Profile and Follower Scrapers
 * Profile details, followers, and following lists
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { sleep, randomDelay, SELECTORS } from '../core/index.js';

/**
 * Scrape profile information for a user
 * @param {Object} page - Browser page instance
 * @param {string} username - Twitter username (without @)
 * @returns {Promise<Object>} Profile data
 */
export async function scrapeProfile(page, username) {
  try {
    // Avoid networkidle2 on X.com as it polls constantly and causes timeouts
    await page.goto(`https://x.com/${username}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.log(`Navigation to profile failed, proceeding to check DOM anyway: ${err.message}`);
  }

  await randomDelay();

  try {
    // Look for either the profile column or the "Account suspended" / "Doesn't exist" text
    await page.waitForSelector(
      `${SELECTORS.profile.primaryColumn}, ${SELECTORS.profile.emptyState}`,
      { timeout: 15000 }
    );

    // Explicitly wait for the username section to appear so we know text has rendered, not just the column shell
    await page.waitForSelector(SELECTORS.profile.name, { timeout: 10000 }).catch(() => {});

    await sleep(4000); // Give extra time for following/followers stats to load in

    // Check if it's an empty state (e.g. suspended or doesn't exist)
    const isEmpty = await page.evaluate(
      (emptySel) => !!document.querySelector(emptySel),
      SELECTORS.profile.emptyState
    );
    if (isEmpty) {
      console.log(
        `Profile @${username} appears to be suspended, doesn't exist, or is blocked by a login wall.`
      );
    }
  } catch {
    console.log(
      `Timeout waiting for user profile: ${username}. It might be rate-limited, suspended, or require an auth token.`
    );
    console.log(`Page URL was: ${page.url()}`);
    try {
      await page.screenshot({ path: `error_profile_${username}.png`, fullPage: true });
      console.log(`Saved screenshot to error_profile_${username}.png`);
    } catch {
      // ignore
    }
  }

  const profile = await page.evaluate((selectors) => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

    // Get header image
    const headerStyle = document
      .querySelector(selectors.profile.header)
      ?.closest('div')
      ?.previousElementSibling?.querySelector('img')?.src;

    // Get avatar
    const avatar = document.querySelector(
      '[data-testid="UserAvatar-Container-unknown"] img, [data-testid*="UserAvatar"] img'
    )?.src;

    // Parse name and username. Using [\w_.]+ to catch various username formats.
    const nameSection = document.querySelector(selectors.profile.name);
    const fullText = nameSection?.textContent || '';
    const usernameMatch = fullText.match(/@([\w_.]+)/);

    // Get stats
    const followingLink = document.querySelector('a[href$="/following"]');
    const followersLink = document.querySelector(
      'a[href$="/verified_followers"], a[href$="/followers"]'
    );

    return {
      name: fullText.split('@')[0]?.trim() || null,
      username: usernameMatch?.[1] || null,
      bio: getText('[data-testid="UserDescription"]'),
      location: getText('[data-testid="UserLocation"]'),
      website: getAttr('[data-testid="UserUrl"] a', 'href'),
      joined: getText('[data-testid="UserJoinDate"]'),
      birthday: getText(selectors.profile.birthday),
      following: followingLink?.querySelector('span')?.textContent || null,
      followers: followersLink?.querySelector('span')?.textContent || null,
      avatar: avatar || null,
      header: headerStyle || null,
      verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
      protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
    };
  }, SELECTORS);

  return profile;
}

/**
 * Scrape followers for a user
 * @param {Object} page - Browser page instance  
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} List of follower objects
 */
export async function scrapeFollowers(page, username, options = {}) {
  const { limit = 1000, onProgress } = options;

  await page.goto(`https://x.com/${username}/followers`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await randomDelay();

  const followers = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (followers.size < limit && retries < maxRetries) {
    const users = await page.evaluate((selectors) => {
      const cells = document.querySelectorAll(selectors.relationship.userCell);
      return Array.from(cells)
        .map((cell) => {
          const link = cell.querySelector('a[href^="/"]');
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const bioEl = cell.querySelector(selectors.profile.bio);
          const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');
          const avatarEl = cell.querySelector('img[src*="profile_images"]');

          const href = link?.getAttribute('href') || '';
          const user = href.split('/')[1];

          return {
            username: user,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
            verified: !!verifiedEl,
            avatar: avatarEl?.src || null,
          };
        })
        .filter((u) => u.username && !u.username.includes('?'));
    }, SELECTORS);

    const prevSize = followers.size;
    users.forEach((u) => followers.set(u.username, u));

    if (onProgress) {
      onProgress({ scraped: followers.size, limit });
    }

    if (followers.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(followers.values()).slice(0, limit);
}

/**
 * Scrape accounts a user is following
 * @param {Object} page - Browser page instance
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} List of following objects
 */
export async function scrapeFollowing(page, username, options = {}) {
  const { limit = 1000, onProgress } = options;

  await page.goto(`https://x.com/${username}/following`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await randomDelay();

  const following = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (following.size < limit && retries < maxRetries) {
    const users = await page.evaluate((selectors) => {
      const cells = document.querySelectorAll(selectors.relationship.userCell);
      return Array.from(cells)
        .map((cell) => {
          const link = cell.querySelector('a[href^="/"]');
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const bioEl = cell.querySelector(selectors.profile.bio);
          const followsBackEl = cell.querySelector(selectors.relationship.userFollowIndicator);

          const href = link?.getAttribute('href') || '';
          const user = href.split('/')[1];

          return {
            username: user,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
            followsBack: !!followsBackEl,
          };
        })
        .filter((u) => u.username && !u.username.includes('?'));
    }, SELECTORS);

    const prevSize = following.size;
    users.forEach((u) => following.set(u.username, u));

    if (onProgress) {
      onProgress({ scraped: following.size, limit });
    }

    if (following.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(following.values()).slice(0, limit);
}
