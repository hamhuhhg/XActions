/**
 * XActions Tweets, Threads, Likes, and Search Scrapers
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { randomDelay, SELECTORS } from '../core/index.js';

/**
 * Scrape tweets from a user's profile
 * @param {Object} page - Browser page instance
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} List of tweet objects
 */
export async function scrapeTweets(page, username, options = {}) {
  const { limit = 100, includeReplies = false, onProgress } = options;

  const url = includeReplies
    ? `https://x.com/${username}/with_replies`
    : `https://x.com/${username}`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay();

  const tweets = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (tweets.size < limit && retries < maxRetries) {
    const tweetData = await page.evaluate((selectors) => {
      const articles = document.querySelectorAll(selectors.tweet.container);
      return Array.from(articles)
        .map((article) => {
          const textEl = article.querySelector(selectors.tweet.text);
          const timeEl = article.querySelector(selectors.tweet.timestamp);
          const likesEl = article.querySelector(`${selectors.actions.like} span span`);
          const retweetsEl = article.querySelector(`${selectors.actions.retweet} span span`);
          const repliesEl = article.querySelector(`${selectors.actions.reply} span span`);
          const viewsEl = article.querySelector(
            selectors.actions.viewsCount
              ? `${selectors.actions.viewsCount} span span`
              : 'a[href*="/analytics"] span span'
          );
          const linkEl = article.querySelector(selectors.tweet.link);

          // Get media
          const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(
            (i) => i.src
          );
          const video = !!article.querySelector('[data-testid="videoPlayer"]');

          // Get quoted tweet
          const quotedEl = article.querySelector('[data-testid="quoteTweet"]');

          return {
            id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
            text: textEl?.textContent || null,
            timestamp: timeEl?.getAttribute('datetime') || null,
            likes: likesEl?.textContent || '0',
            retweets: retweetsEl?.textContent || '0',
            replies: repliesEl?.textContent || '0',
            views: viewsEl?.textContent || null,
            url: linkEl?.href || null,
            media: {
              images,
              hasVideo: video,
            },
            isQuote: !!quotedEl,
            isRetweet: !!article.querySelector('[data-testid="socialContext"]'),
          };
        })
        .filter((t) => t.id);
    }, SELECTORS);

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.set(t.id, t));

    if (onProgress) {
      onProgress({ scraped: tweets.size, limit });
    }

    if (tweets.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(tweets.values()).slice(0, limit);
}

/**
 * Search tweets by query
 * @param {Object} page - Browser page instance
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} List of tweet search results
 */
export async function searchTweets(page, query, options = {}) {
  const { limit = 100, filter = 'latest', onProgress } = options;

  const filterMap = {
    latest: 'live',
    top: 'top',
    people: 'user',
    photos: 'image',
    videos: 'video',
  };

  const encodedQuery = encodeURIComponent(query);
  const f = filterMap[filter] || 'live';

  await page.goto(`https://x.com/search?q=${encodedQuery}&src=typed_query&f=${f}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await randomDelay();

  const tweets = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (tweets.size < limit && retries < maxRetries) {
    const tweetData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles)
        .map((article) => {
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
          const timeEl = article.querySelector('time');
          const linkEl = article.querySelector('a[href*="/status/"]');
          const likesEl = article.querySelector('[data-testid="like"] span span');

          return {
            id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
            text: textEl?.textContent || null,
            author: authorLink?.href?.split('/')[3] || null,
            timestamp: timeEl?.getAttribute('datetime') || null,
            likes: likesEl?.textContent || '0',
            url: linkEl?.href || null,
          };
        })
        .filter((t) => t.id);
    });

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.set(t.id, t));

    if (onProgress) {
      onProgress({ scraped: tweets.size, limit });
    }

    if (tweets.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(tweets.values()).slice(0, limit);
}

/**
 * Scrape a full tweet thread
 * @param {Object} page - Browser page instance
 * @param {string} tweetUrl - Tweet URL
 * @returns {Promise<Array>} List of tweets in thread
 */
export async function scrapeThread(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay();

  // Scroll to load full thread
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1000, 2000);
  }

  const thread = await page.evaluate(() => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const mainTweetId = window.location.pathname.match(/status\/(\d+)/)?.[1];

    // Get main author
    const mainArticle = Array.from(articles).find((a) =>
      a.querySelector(`a[href*="/status/${mainTweetId}"]`)
    );
    const mainAuthor = mainArticle
      ?.querySelector('[data-testid="User-Name"] a')
      ?.href?.split('/')[3];

    return Array.from(articles)
      .map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
        const timeEl = article.querySelector('time');
        const linkEl = article.querySelector('a[href*="/status/"]');

        const author = authorLink?.href?.split('/')[3];

        return {
          id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
          text: textEl?.textContent || null,
          author,
          timestamp: timeEl?.getAttribute('datetime') || null,
          url: linkEl?.href || null,
          isMainAuthor: author === mainAuthor,
        };
      })
      .filter((t) => t.id && t.isMainAuthor);
  });

  return thread;
}

/**
 * Scrape users who liked a tweet
 * @param {Object} page - Browser page instance
 * @param {string} tweetUrl - Tweet URL
 * @param {Object} options - Options
 * @returns {Promise<Array>} List of users who liked
 */
export async function scrapeLikes(page, tweetUrl, options = {}) {
  const { limit = 100 } = options;

  const likesUrl = tweetUrl.replace(/\/status\//, '/status/') + '/likes';
  await page.goto(likesUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay();

  const users = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (users.size < limit && retries < maxRetries) {
    const userData = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells)
        .map((cell) => {
          const link = cell.querySelector('a[href^="/"]');
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');

          const href = link?.getAttribute('href') || '';
          const user = href.split('/')[1];

          return {
            username: user,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
          };
        })
        .filter((u) => u.username && !u.username.includes('?'));
    });

    const prevSize = users.size;
    userData.forEach((u) => users.set(u.username, u));

    if (users.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(users.values()).slice(0, limit);
}

/**
 * Scrape tweets for a hashtag
 * @param {Object} page - Browser page instance
 * @param {string} hashtag - Hashtag string
 * @param {Object} options - Search options
 * @returns {Promise<Array>} List of tweets
 */
export async function scrapeHashtag(page, hashtag, options = {}) {
  const { limit = 100, filter = 'latest' } = options;
  const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
  return searchTweets(page, `#${tag}`, { limit, filter });
}

/**
 * Scrape media (images/videos) from a user
 * @param {Object} page - Browser page instance
 * @param {string} username - Twitter username
 * @param {Object} options - Options
 * @returns {Promise<Array>} List of media items
 */
export async function scrapeMedia(page, username, options = {}) {
  const { limit = 100 } = options;

  await page.goto(`https://x.com/${username}/media`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await randomDelay();

  const media = [];
  let retries = 0;
  const maxRetries = 10;

  while (media.length < limit && retries < maxRetries) {
    const newMedia = await page.evaluate(() => {
      const items = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(items).flatMap((article) => {
        const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(
          (img) => ({
            type: 'image',
            url: img.src.replace(/&name=\w+/, '&name=large'),
          })
        );

        const videos = article.querySelector('[data-testid="videoPlayer"]')
          ? [{ type: 'video', url: article.querySelector('a[href*="/status/"]')?.href }]
          : [];

        const tweetUrl = article.querySelector('a[href*="/status/"]')?.href;

        return [...images, ...videos].map((m) => ({
          ...m,
          tweetUrl,
        }));
      });
    });

    const prevLength = media.length;
    newMedia.forEach((m) => {
      if (!media.find((existing) => existing.url === m.url)) {
        media.push(m);
      }
    });

    if (media.length === prevLength) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return media.slice(0, limit);
}

/**
 * Scrape members of a Twitter list
 * @param {Object} page - Browser page instance
 * @param {string} listUrl - Twitter list URL
 * @param {Object} options - Options
 * @returns {Promise<Array>} List of members
 */
export async function scrapeListMembers(page, listUrl, options = {}) {
  const { limit = 500 } = options;

  const membersUrl = listUrl.endsWith('/members') ? listUrl : `${listUrl}/members`;
  await page.goto(membersUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay();

  const members = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (members.size < limit && retries < maxRetries) {
    const users = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells)
        .map((cell) => {
          const link = cell.querySelector('a[href^="/"]');
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const bioEl = cell.querySelector('[data-testid="UserDescription"]');

          const href = link?.getAttribute('href') || '';
          const user = href.split('/')[1];

          return {
            username: user,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
          };
        })
        .filter((u) => u.username && !u.username.includes('?'));
    });

    const prevSize = members.size;
    users.forEach((u) => members.set(u.username, u));

    if (members.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(members.values()).slice(0, limit);
}
