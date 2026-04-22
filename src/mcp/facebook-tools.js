#!/usr/bin/env node
/**
 * XActions Local Tools (Puppeteer-based) FOR FACEBOOK
 * Free mode - runs browser automation locally
 * 
 * @author nich (@nichxbt)
 * @see https://xactions.app
 * @license MIT
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Browser instance (reused across calls)
let browser = null;
let page = null;

/**
 * Initialize browser with stealth mode
 */
async function initBrowser() {
  if (!browser) {
     browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-notifications' // Important for FB
      ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }
  return { browser, page };
}

/**
 * Human-like delay
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(1500 + Math.random() * 3000); // FB needs slightly longer delays

/**
 * Close browser (for cleanup)
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

/**
 * Login to Facebook using c_user and xs cookies
 * The cookie string passed should be a JSON object string: {"c_user":"...","xs":"..."}
 */
export async function fb_login({ cookie }) {
  try {
    const { page } = await initBrowser();
    
    let cookiesToSet = [];
    let parsedData;
    
    // Debug log (redacted)
    console.log(`[FB Auth] Attempting to parse cookie data (length: ${cookie.length})`);

    try {
      parsedData = JSON.parse(cookie);
    } catch (e) {
      // It's a string, not JSON
      const cMatch = cookie.match(/c_user=([^;\s]+)/);
      const xMatch = cookie.match(/xs=([^;\s]+)/);
      if (cMatch && xMatch) {
          parsedData = { c_user: cMatch[1], xs: xMatch[1] };
      } else {
          throw new Error('Invalid cookie format. Use {"c_user":"...","xs":"..."} or a standard cookie string.');
      }
    }

    // Helper to extract cookies from various structures
    const findInArray = (arr) => {
        const c = arr.find(x => x.name === 'c_user');
        const x = arr.find(x => x.name === 'xs');
        return c && x ? { c_user: c.value, xs: x.value, full: arr } : null;
    };

    if (Array.isArray(parsedData)) {
      cookiesToSet = parsedData;
    } else if (parsedData.cookies && Array.isArray(parsedData.cookies)) {
      cookiesToSet = parsedData.cookies;
    } else if (parsedData.c_user && parsedData.xs) {
      cookiesToSet = [
        { name: 'c_user', value: String(parsedData.c_user), domain: '.facebook.com', path: '/', secure: true, httpOnly: false, sameSite: 'None' },
        { name: 'xs', value: String(parsedData.xs), domain: '.facebook.com', path: '/', secure: true, httpOnly: true, sameSite: 'None' }
      ];
    } else {
        // Final attempt: Search all object keys for c_user/xs values if they are nested somewhere
        // This handles some weird exports
        throw new Error('Missing c_user or xs. Please ensure you provided both c_user and xs cookies.');
    }

    if (cookiesToSet.length === 0) {
        throw new Error('No valid cookies found in the provided data.');
    }

    // Standardize domain and properties for all cookies in the list
    const finalCookies = cookiesToSet.map(c => ({
      ...c,
      domain: c.domain || '.facebook.com',
      path: c.path || '/',
      secure: true,
      sameSite: 'None'
    }));

    // Ensure c_user and xs are actually present in the final list
    const hasC = finalCookies.some(c => c.name === 'c_user');
    const hasX = finalCookies.some(c => c.name === 'xs');
    
    if (!hasC || !hasX) {
        throw new Error('Missing c_user or xs in the cookie list. Please provide a full session.');
    }

    // Set cookies
    await page.setCookie(...finalCookies);

    // Navigate to home to verify only if not already there
    if (!page.url().includes('facebook.com')) {
        await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await sleep(2000);

    // Verify login success - look for common logged-in elements
    const loginForm = await page.$('input[name="email"], input[type="password"]');
    if (loginForm) {
      // Double check if it's just a "re-enter password" for security, but usually means logged out
      throw new Error('Facebook is asking for login. Your cookies might be expired or invalid.');
    }

    // Check if we see the "Search Facebook" or "Home" which indicates success
    const searchExists = await page.$('[aria-label="Search Facebook"], [aria-label="بحث في فيسبوك"], [role="search"]');
    if (!searchExists) {
      // Maybe it's a mobile redirect or something else
      const loggedInIndicator = await page.$('[aria-label="Your profile"], [aria-label="الحساب"], div[data-testid="user_menu"]');
      if (!loggedInIndicator && !page.url().includes('facebook.com/home')) {
          throw new Error('Could not verify login status. Page might be blocked or cookies expired.');
      }
    }

    return { success: true, message: 'Successfully logged into Facebook.' };
  } catch (error) {
    console.error('[FB Login Error]', error.message);
    throw error;
  }
}

/**
 * Get profile information for a Facebook user or page
 */
export async function fb_get_profile({ profileUrl, cookie }) {
  const { page } = await initBrowser();
  if (cookie) {
      await fb_login({ cookie });
  }
  
  try {
    // Ensure we start from a clean slate or logged-in state if cookies were previously set
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    await randomDelay();

    // Basic scraping logic for Facebook (selectors might need updating as FB changes frequently)
    return await page.evaluate(() => {
      // H1 is usually the profile name
      const nameEl = document.querySelector('h1');
      
      // Intro / Bio sections usually have specific structured classes, but as a fallback parsing text
      // This is a naive selector, a robust implementation would need deep DOM analysis
      const introContainers = Array.from(document.querySelectorAll('span')).filter(el => 
        el.textContent.includes('Intro') || el.textContent.includes('Bio') || el.textContent.includes('About')
      );
      
      let bioText = null;
      if (introContainers.length > 0) {
          // Attempt to find sibling or parent content that describes the user
          // For now, grabbing the generic meta description is safer:
          const metaDesc = document.querySelector('meta[name="description"]');
          bioText = metaDesc ? metaDesc.getAttribute('content') : 'Intro found but could not parse text.';
      } else {
          const metaDesc = document.querySelector('meta[name="description"]');
          bioText = metaDesc ? metaDesc.getAttribute('content') : null;
      }

      return {
        success: true,
        name: nameEl ? nameEl.textContent : null,
        bio_or_meta: bioText,
        url: window.location.href
      };
    });
  } catch (error) {
    console.error('[FB Get Profile Error]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Post to Facebook timeline
 */
export async function fb_post_timeline({ text, cookie }) {
  const { page } = await initBrowser();
  if (cookie) {
      await fb_login({ cookie });
  }
  
  try {
    // Navigate only if we are not already on the homepage
    if (!page.url().includes('facebook.com')) {
        await page.goto('https://www.facebook.com/', { waitUntil: 'load', timeout: 60000 });
    }
    await sleep(4000);

    // Wait for the page to render fully
    await sleep(5000);

    // 1. Find and click "What's on your mind?"
    const clickSuccess = await page.evaluate(() => {
      // Check if we hit a login screen
      if (document.querySelector('input[type="password"], input[name="email"]')) {
        return 'LOGIN_SCREEN';
      }

      // Helper to trigger a "real" click
      const triggerClick = (el) => {
          if (!el) return false;
          ['mousedown', 'mouseup', 'click'].forEach(name => {
              const event = new MouseEvent(name, {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  buttons: 1
              });
              el.dispatchEvent(event);
          });
          return true;
      };

      // Comprehensive search for the composer box
      const composerSelectors = [
          '[role="button"][aria-label*="What\'s on your mind"]',
          '[role="button"][aria-label*="بم تفكر"]',
          '[role="button"][aria-label*="بِمَ تفكر"]',
          'div[data-pagelet="PageletComposerPostStatus"] [role="button"]',
          '[role="main"] [role="button"]', // Often the composer is the first button in main
      ];

      for (const selector of composerSelectors) {
          const el = document.querySelector(selector);
          if (el && (el.offsetHeight > 0 || el.getBoundingClientRect().height > 0)) {
              if (triggerClick(el)) return true;
          }
      }

      // Text-based fallback search (Search in all buttons and spans)
      const allElements = Array.from(document.querySelectorAll('div[role="button"], span, div'));
      const textMatches = allElements.filter(el => {
          const t = (el.textContent || '').trim();
          return t.includes("What's on your mind") || 
                 t.includes("What’s on your mind") || // Curly apostrophe
                 t.includes("بم تفكر") || 
                 t.includes("بمَ تفكر") || 
                 t.includes("بِمَ تفكر");
      });

      for (const match of textMatches) {
          let clickable = match.closest('div[role="button"]') || match;
          if (triggerClick(clickable)) return true;
      }

      return false;
    });

    if (clickSuccess === 'LOGIN_SCREEN') {
      throw new Error('Facebook is asking for login. Your cookies might be expired or invalid.');
    }

    if (!clickSuccess) {
      // Last resort: we will try to find the very first contenteditable on the page and click its container
      const genericBox = await page.evaluate(() => {
        const anyBox = document.querySelector('div[role="textbox"], [contenteditable="true"]');
        if (anyBox) {
          const btn = anyBox.closest('div[role="button"]');
          if (btn) btn.click();
          else anyBox.click();
          return true;
        }
        return false;
      });
      if (!genericBox) {
        throw new Error('Could not find the button to start composing a post. Page might not have loaded correctly.');
      }
    }

    // Wait for the modal dialog to appear and be ready
    try {
        await page.waitForSelector('div[role="dialog"]', { timeout: 10000, visible: true });
    } catch (e) {
        console.log('[FB Post] Dialog role not found, continuing with generic search...');
    }

    // 2. Focus the modal's textbox and use page.keyboard.type
    let focused = false;
    try {
        // Wait even longer for the skeleton screen to be replaced by actual content
        // FB modals can be extremely slow on some connections
        const boxSelector = '[contenteditable="true"], [role="textbox"], div[aria-label*="mind"], div[aria-label*="تفكر"], div[aria-label*="Create"]';
        console.log('[FB Post] Waiting for editor to hydrate (up to 40s)...');
        const boxHandle = await page.waitForSelector(boxSelector, { timeout: 40000, visible: true });
        
        if (boxHandle) {
            // Give it some time to settle
            await sleep(2000);
            await boxHandle.click();
            await boxHandle.focus();
            focused = true;
            console.log('[FB Post] Editor focused and ready.');
        }
    } catch (e) {
        console.error('[FB Post] Editor did not appear within 40s. Modal might be stuck in loading state.');
    }

    if (!focused) {
        focused = await page.evaluate(() => {
            // Find the highest z-index dialog or overlay
            const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], div[aria-modal="true"]'))
              .filter(d => d.offsetHeight > 0);
              
            let postDialog = dialogs[dialogs.length - 1] || document.body;
      
            // Last ditch effort: Find any visible contenteditable
            const allBoxes = Array.from(document.querySelectorAll('[contenteditable="true"]'))
              .filter(el => el.offsetHeight > 0);
              
            if (allBoxes.length > 0) {
              const target = allBoxes[allBoxes.length - 1]; // Often the most recent modal one
              target.focus();
              target.click();
              return true;
            }
            return false;
        });
    }

    if (!focused) {
      const debugFile = 'fb_post_error.png';
      await page.screenshot({ path: debugFile });
      throw new Error(`No visible textbox found inside the dialog. A screenshot has been saved to ${debugFile} for debugging.`);
    }
    
    // Type text using a more robust method for React/Draft.js editors
    await page.evaluate((t) => {
        const editor = document.querySelector('[contenteditable="true"], [role="textbox"]');
        if (editor) {
            editor.focus();
            // Use execCommand to simulate real user typing for Draft.js/React
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, t);
            
            // Dispatch events to wake up React
            ['input', 'change', 'blur'].forEach(name => {
                const event = new Event(name, { bubbles: true });
                editor.dispatchEvent(event);
            });
        }
    }, text);
    
    // Give time to React to update state and enable the Post button
    await sleep(3000);

    // 3. High-Reliability Submission Sequence
    console.log('[FB Post] Starting submission sequence...');
    let attempts = 0;
    let dialogClosed = false;

    while (attempts < 3 && !dialogClosed) {
        attempts++;
        console.log(`[FB Post] Submit attempt ${attempts}/3...`);

        // A. Try Keyboard shortcuts while focused on editor
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');
        await sleep(2000);

        // Check if closed
        dialogClosed = await page.evaluate(() => {
            return document.querySelectorAll('div[role="dialog"]').length === 0;
        });
        if (dialogClosed) break;

        // B. Find the Blue Primary Button and use Puppeteer's native click
        try {
            const btnHandle = await page.evaluateHandle(() => {
                const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'))
                    .filter(d => d.offsetHeight > 0 || d.hasAttribute('aria-modal'));
                const dialog = dialogs[dialogs.length - 1] || document.body;
                
                const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
                
                return buttons.find(b => {
                    const style = window.getComputedStyle(b);
                    const bgColor = style.backgroundColor;
                    const isBlue = bgColor.includes('rgb(8, 102, 255)') || 
                                   bgColor.includes('rgb(24, 119, 242)') || 
                                   bgColor.includes('rgb(0, 100, 209)');
                    return isBlue && b.offsetHeight > 25 && style.pointerEvents !== 'none';
                });
            });

            if (btnHandle && btnHandle.asElement()) {
                console.log('[FB Post] Found blue button, attempting native handle click...');
                // elementHandle.click() scrolls into view and checks actionability
                await btnHandle.click({ delay: 50 });
                await sleep(3000);
            }
        } catch (e) {
            console.log('[FB Post] Error during button click fallback:', e.message);
        }

        // Final check for this attempt
        dialogClosed = await page.evaluate(() => {
            const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'))
                .filter(d => d.offsetHeight > 0 || d.hasAttribute('aria-modal'));
            return dialogs.length === 0;
        });
    }

    // Final Success Verification Screenshot
    await page.screenshot({ path: 'fb_post_success.png' });
    
    if (!dialogClosed) {
        console.warn('[FB Post] Dialog is still visible after 5 attempts.');
        throw new Error('Failed to submit post: Dialog remained open after multiple attempts.');
    }

    console.log('[FB Post] Process complete. Post successful.');
    return { success: true, message: 'Successfully posted to Facebook timeline.' };
  } catch (error) {
    console.error('[FB Post Error]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Scrape posts from a Facebook group
 */
export async function fb_get_group_posts({ groupUrl, limit = 10, cookie }) {
  const { page } = await initBrowser();
  if (cookie) {
      await fb_login({ cookie });
  }
  
  try {
    await page.goto(groupUrl, { waitUntil: 'load', timeout: 60000 });
    await randomDelay();

    const posts = new Set();
    let retries = 0;

    while (posts.size < limit && retries < 5) {
      const newPosts = await page.evaluate(() => {
        // Facebook feeds use aria-posinset or generic div structured feeds
        // A common pattern is div[role="feed"] > div > div
        const feedContainer = document.querySelector('div[role="feed"]');
        if (!feedContainer) return [];

        // Typically, each post is a direct or near-direct child of the feed with role="article" or similar
        // We look for any container whose text is long enough to be a post, or look for specific roles
        const articles = Array.from(feedContainer.querySelectorAll('div[data-ad-preview="message"], div[dir="auto"]'));
        
        return articles.map(article => {
            // Find author: usually an h2, h3 or strong tag preceding the text
            // Because FB DOM is obfuscated, text extraction is safest
            let text = article.textContent || '';
            // Try to find the closest wrapper
            const wrapper = article.closest('div[role="article"]') || article.closest('div[class*="x1yztbdb"]'); // common generic class
            
            let author = 'Unknown';
            if (wrapper) {
                const authorEl = wrapper.querySelector('h2, h3, strong');
                if (authorEl) author = authorEl.textContent;
            }

            // Exclude empty or very short UI strings
            if (text.length > 10) {
                return JSON.stringify({ author, text: text.substring(0, 500) });
            }
            return null;
        }).filter(Boolean);
      });

      const prevSize = posts.size;
      newPosts.forEach(p => posts.add(p));

      if (posts.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);
    }

    const results = Array.from(posts).map(p => JSON.parse(p)).slice(0, limit);
    return {
        success: true,
        count: results.length,
        posts: results
    };

  } catch (error) {
    console.error('[FB Get Group Posts Error]', error);
    return { success: false, error: 'Failed to get group posts: ' + error.message };
  }
}

/**
 * Reply or comment on a specific Facebook post
 */
export async function fb_reply_comment({ postUrl, text, cookie }) {
  const { page } = await initBrowser();
  if (cookie) {
      await fb_login({ cookie });
  }
  
  try {
    await page.goto(postUrl, { waitUntil: 'load', timeout: 60000 });
    await randomDelay();

    // Look for the comment input box. Facebook uses contenteditable divs for comments.
    // They are usually labeled specifically for writing a comment.
    const commentBoxSelector = 'div[role="textbox"][contenteditable="true"][aria-label*="comment" i]';
    
    // Wait for the comment box, but with a short timeout since it might use a different selector
    try {
        await page.waitForSelector(commentBoxSelector, { timeout: 5000 });
        await page.click(commentBoxSelector);
    } catch (e) {
        // Fallback: search for visual placeholders
        await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const target = spans.find(s => s.textContent.toLowerCase().includes('write a comment') || s.textContent.includes('تعليق'));
            if (target) {
                target.closest('div[role="button"], div[role="textbox"]')?.click();
            }
        });
        await sleep(1000);
    }

    // Now assume the active element is the text box or find it again globally
    const fallbackTextBox = 'div[role="textbox"][contenteditable="true"]';
    await page.waitForSelector(fallbackTextBox, { timeout: 10000 });
    
    // Type the comment
    await page.type(fallbackTextBox, text, { delay: 50 });
    await randomDelay();

    // Press enter to submit the comment
    // Facebook automatically submits comments on 'Enter' (without Shift)
    await page.keyboard.press('Enter');
    
    await sleep(4000); // Wait for the comment to post

    return { success: true, message: 'Successfully commented on the Facebook post.' };
  } catch (error) {
    console.error('[FB Reply Error]', error);
    return { success: false, error: 'Failed to reply/comment: ' + error.message };
  }
}

export const fbToolMap = {
  fb_login,
  fb_get_profile,
  fb_post_timeline,
  fb_get_group_posts,
  fb_reply_comment
};
