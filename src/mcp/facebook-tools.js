#!/usr/bin/env node
/**
 * XActions Local Tools FOR FACEBOOK
 * Free mode - runs browser automation using camofox-browser HTTP API
 * 
 * @author nich (@nichxbt)
 * @see https://xactions.app
 * @license MIT
 */

import { CamofoxClient } from './camofox-client.js';

let client = null;

async function getClient() {
  if (!client) {
    client = new CamofoxClient('xactions_fb');
    await client.createTab();
  }
  return client;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(1500 + Math.random() * 3000);

export async function closeBrowser() {
  if (client) {
    await client.closeTab();
    client = null;
  }
}

export async function fb_login({ cookie }) {
  try {
    const c = await getClient();
    
    let cookiesToSet = [];
    let parsedData;
    
    console.log(`[FB Auth] Attempting to parse cookie data (length: ${cookie.length})`);

    try {
      parsedData = JSON.parse(cookie);
    } catch (e) {
      const cMatch = cookie.match(/c_user=([^;\s]+)/);
      const xMatch = cookie.match(/xs=([^;\s]+)/);
      if (cMatch && xMatch) {
          parsedData = { c_user: cMatch[1], xs: xMatch[1] };
      } else {
          throw new Error('Invalid cookie format. Use {"c_user":"...","xs":"..."} or a standard cookie string.');
      }
    }

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
        throw new Error('Missing c_user or xs. Please ensure you provided both c_user and xs cookies.');
    }

    if (cookiesToSet.length === 0) {
        throw new Error('No valid cookies found in the provided data.');
    }

    const finalCookies = cookiesToSet.map(cookieObj => ({
      ...cookieObj,
      domain: cookieObj.domain || '.facebook.com',
      path: cookieObj.path || '/',
      secure: true,
      sameSite: 'None'
    }));

    const hasC = finalCookies.some(cookieObj => cookieObj.name === 'c_user');
    const hasX = finalCookies.some(cookieObj => cookieObj.name === 'xs');
    
    if (!hasC || !hasX) {
        throw new Error('Missing c_user or xs in the cookie list. Please provide a full session.');
    }

    await c.importCookies(finalCookies);

    const currentUrl = await c.evaluate(`() => window.location.href`);
    if (!currentUrl.includes('facebook.com')) {
        await c.goto('https://www.facebook.com/');
    }
    // Wait longer to allow Facebook React app to hydrate completely
    await sleep(6000);

    let checkLogin = await c.evaluate(`() => {
      const loginForm = document.querySelector('input[name="email"], input[type="password"]');
      if (loginForm) return 'LOGIN_REQUIRED';
      const searchExists = document.querySelector('[aria-label="Search Facebook"], [aria-label="بحث في فيسبوك"], [role="search"]');
      if (searchExists) return 'SUCCESS';
      const loggedInIndicator = document.querySelector('[aria-label="Your profile"], [aria-label="الحساب"], div[data-testid="user_menu"]');
      if (loggedInIndicator || window.location.href.includes('facebook.com/home')) return 'SUCCESS';
      
      const continueBtn = Array.from(document.querySelectorAll('div[role="button"], button')).find(el => el.textContent.includes('Continue') || el.textContent.includes('متابعة'));
      if (continueBtn) return 'CONTINUE_SCREEN';

      return 'UNKNOWN:' + window.location.href + '|' + document.body.innerText.substring(0, 200);
    }`);

    if (checkLogin === 'CONTINUE_SCREEN') {
      console.log('[FB Auth] Found "Continue" screen, clicking continue button...');
      await c.evaluate(`() => {
        const continueBtn = Array.from(document.querySelectorAll('div[role="button"], button')).find(el => el.textContent.includes('Continue') || el.textContent.includes('متابعة'));
        if (continueBtn) continueBtn.click();
      }`);
      await sleep(6000); // Wait for potential login navigation
      
      // Re-verify login status
      checkLogin = await c.evaluate(`() => {
        const loginForm = document.querySelector('input[name="email"], input[type="password"]');
        if (loginForm) return 'LOGIN_REQUIRED';
        const searchExists = document.querySelector('[aria-label="Search Facebook"], [aria-label="بحث في فيسبوك"], [role="search"]');
        if (searchExists) return 'SUCCESS';
        const loggedInIndicator = document.querySelector('[aria-label="Your profile"], [aria-label="الحساب"], div[data-testid="user_menu"]');
        if (loggedInIndicator || window.location.href.includes('facebook.com/home')) return 'SUCCESS';
        return 'UNKNOWN:' + window.location.href + '|' + document.body.innerText.substring(0, 200);
      }`);
    }

    if (checkLogin === 'LOGIN_REQUIRED') throw new Error('Facebook is asking for login. Your cookies might be expired or invalid.');
    if (checkLogin.startsWith('UNKNOWN')) {
      try {
        const snapshot = await c.snapshot();
        const fs = await import('fs/promises');
        await fs.writeFile('fb_login_error_snapshot.json', JSON.stringify(snapshot, null, 2));
      } catch(e) { console.error('Failed to save snapshot', e); }
      throw new Error('Could not verify login status. A snapshot has been saved to fb_login_error_snapshot.json');
    }

    return { success: true, message: 'Successfully logged into Facebook.' };
  } catch (error) {
    console.error('[FB Login Error]', error.message);
    throw error;
  }
}

export async function fb_get_profile({ profileUrl, cookie }) {
  const c = await getClient();
  if (cookie) await fb_login({ cookie });
  
  try {
    await c.goto(profileUrl);
    await randomDelay();
    
    // Scroll down a couple of times to ensure recent posts are loaded into the DOM
    await c.evaluate(`() => window.scrollBy(0, 800)`);
    await sleep(2000);
    await c.evaluate(`() => window.scrollBy(0, 1000)`);
    await sleep(3000);

    // Expand "See more" / "عرض المزيد" for long posts
    await c.evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]')).filter(el => {
        const t = el.textContent.trim();
        return t === 'See more' || t === 'عرض المزيد' || t === 'Read more' || t === 'قراءة المزيد';
      });
      buttons.forEach(btn => {
        try { btn.click(); } catch(e) {}
      });
    }`);
    await sleep(1500);

    return await c.evaluate(`() => {
      const nameEl = document.querySelector('h1');
      const introContainers = Array.from(document.querySelectorAll('span')).filter(el => 
        el.textContent.includes('Intro') || el.textContent.includes('Bio') || el.textContent.includes('About') || el.textContent.includes('السيرة الذاتية')
      );
      
      let bioText = null;
      const metaDesc = document.querySelector('meta[name="description"]');
      bioText = metaDesc ? metaDesc.getAttribute('content') : (introContainers.length > 0 ? 'Intro found but could not parse text.' : null);

      // Extract latest 5 posts
      const posts = [];
      const articles = document.querySelectorAll('[role="article"]');
      
      for (const article of articles) {
          // Skip comments and nested articles
          if (article.closest('ul') || article.parentElement.closest('[role="article"]')) continue;
          
          let text = '';
          const textContainer = article.querySelector('[data-ad-preview="message"]');
          if (textContainer) {
              text = textContainer.innerText;
          } else {
              // Fallback: Gather text from div[dir="auto"]
              const textDivs = Array.from(article.querySelectorAll('div[dir="auto"]'));
              const postTexts = textDivs
                  .map(d => d.innerText.trim())
                  .filter(t => t.length > 15 && !t.includes('Like') && !t.includes('Comment') && !t.includes('Share') && !t.includes('أعجبني') && !t.includes('تعليق'));
              if (postTexts.length > 0) {
                  // Usually the longest text is the main post content
                  text = postTexts.sort((a, b) => b.length - a.length)[0];
              }
          }

          // Extract images from facebook CDN
          const imgs = Array.from(article.querySelectorAll('img'));
          const images = [];
          for (const img of imgs) {
              const src = img.getAttribute('src');
              // Scontent is standard for FB uploaded images. Exclude small icons.
              if (src && src.includes('scontent') && !src.includes('/emoji/')) {
                  images.push(src);
              }
          }
          
          // Get Post URL
          const link = Array.from(article.querySelectorAll('a')).find(a => a.href && (a.href.includes('/posts/') || a.href.includes('/permalink/') || a.href.includes('/videos/')));
          const url = link ? link.href : null;

          if (text || images.length > 0) {
              posts.push({
                  text: text.trim(),
                  images: [...new Set(images)], // Unique images
                  url: url
              });
          }
          
          if (posts.length >= 5) break;
      }

      return {
        success: true,
        name: nameEl?.textContent || null,
        url: window.location.href,
        bio: bioText,
        friendsCount: null,
        recentPosts: posts
      };
    }`);
  } catch (error) {
    console.error('[FB Scrape Error]', error.message);
    return { success: false, error: error.message };
  }
}

export async function fb_post_timeline({ text, cookie }) {
  const c = await getClient();
  if (cookie) await fb_login({ cookie });
  
  try {
    const currentUrl = await c.evaluate(`() => window.location.href`);
    if (!currentUrl.includes('facebook.com')) {
        await c.goto('https://www.facebook.com/');
    }
    await sleep(4000);
    await sleep(5000);

    const clickSuccess = await c.evaluate(`() => {
      if (document.querySelector('input[type="password"], input[name="email"]')) return 'LOGIN_SCREEN';

      const triggerClick = (el) => {
          if (!el) return false;
          ['mousedown', 'mouseup', 'click'].forEach(name => {
              const event = new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 });
              el.dispatchEvent(event);
          });
          return true;
      };

      const composerSelectors = [
          '[role="button"][aria-label*="What\\'s on your mind"]',
          '[role="button"][aria-label*="بم تفكر"]',
          '[role="button"][aria-label*="بِمَ تفكر"]',
          'div[data-pagelet="PageletComposerPostStatus"] [role="button"]',
          '[role="main"] [role="button"]'
      ];

      for (const selector of composerSelectors) {
          const el = document.querySelector(selector);
          if (el && (el.offsetHeight > 0 || el.getBoundingClientRect().height > 0)) {
              if (triggerClick(el)) return true;
          }
      }

      const allElements = Array.from(document.querySelectorAll('div[role="button"], span, div'));
      const textMatches = allElements.filter(el => {
          const t = (el.textContent || '').trim();
          return t.includes("What's on your mind") || t.includes("What’s on your mind") || t.includes("بم تفكر") || t.includes("بمَ تفكر") || t.includes("بِمَ تفكر");
      });

      for (const match of textMatches) {
          let clickable = match.closest('div[role="button"]') || match;
          if (triggerClick(clickable)) return true;
      }

      return false;
    }`);

    if (clickSuccess === 'LOGIN_SCREEN') throw new Error('Facebook is asking for login.');

    if (!clickSuccess) {
      const genericBox = await c.evaluate(`() => {
        const anyBox = document.querySelector('div[role="textbox"], [contenteditable="true"]');
        if (anyBox) {
          const btn = anyBox.closest('div[role="button"]');
          if (btn) btn.click();
          else anyBox.click();
          return true;
        }
        return false;
      }`);
      if (!genericBox) throw new Error('Could not find the button to start composing a post.');
    }

    try { await c.wait({ selector: 'div[role="dialog"]', timeout: 10000 }); } catch (e) {}

    let focused = false;
    try {
        console.log('[FB Post] Waiting for editor to hydrate (up to 40s)...');
        await c.wait({ selector: '[contenteditable="true"], [role="textbox"], div[aria-label*="mind"], div[aria-label*="تفكر"], div[aria-label*="Create"]', timeout: 40000 });
        await sleep(2000);
        focused = await c.evaluate(`() => {
            const boxes = document.querySelectorAll('[contenteditable="true"], [role="textbox"], div[aria-label*="mind"], div[aria-label*="تفكر"], div[aria-label*="Create"]');
            for(const box of boxes) {
                if (box.offsetHeight > 0) {
                    box.focus();
                    box.click();
                    return true;
                }
            }
            return false;
        }`);
        if (focused) console.log('[FB Post] Editor focused and ready.');
    } catch (e) {
        console.error('[FB Post] Editor did not appear within 40s.');
    }

    if (!focused) {
        focused = await c.evaluate(`() => {
            const allBoxes = Array.from(document.querySelectorAll('[contenteditable="true"]')).filter(el => el.offsetHeight > 0);
            if (allBoxes.length > 0) {
              const target = allBoxes[allBoxes.length - 1];
              target.focus();
              target.click();
              return true;
            }
            return false;
        }`);
    }

    if (!focused) {
      throw new Error(`No visible textbox found inside the dialog.`);
    }
    
    const safeText = text.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    await c.evaluate(`() => {
        const t = \`${safeText}\`;
        const editor = document.querySelector('[contenteditable="true"], [role="textbox"]');
        if (editor) {
            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, t);
            ['input', 'change', 'blur'].forEach(name => {
                const event = new Event(name, { bubbles: true });
                editor.dispatchEvent(event);
            });
        }
    }`);
    
    await sleep(3000);

    console.log('[FB Post] Starting submission sequence...');
    let attempts = 0;
    let dialogClosed = false;

    while (attempts < 3 && !dialogClosed) {
        attempts++;
        console.log(`[FB Post] Submit attempt ${attempts}/3...`);

        await c.evaluate(`() => {
            const editor = document.querySelector('[contenteditable="true"], [role="textbox"]');
            if (editor) {
                const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, ctrlKey: true, bubbles: true });
                editor.dispatchEvent(enterEvent);
            }
        }`);
        await sleep(2000);

        dialogClosed = await c.evaluate(`() => document.querySelectorAll('div[role="dialog"]').length === 0`);
        if (dialogClosed) break;

        const clickedBlue = await c.evaluate(`() => {
            const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]')).filter(d => d.offsetHeight > 0 || d.hasAttribute('aria-modal'));
            const dialog = dialogs[dialogs.length - 1] || document.body;
            const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
            
            const b = buttons.find(b => {
                const style = window.getComputedStyle(b);
                const bgColor = style.backgroundColor;
                const isBlue = bgColor.includes('rgb(8, 102, 255)') || bgColor.includes('rgb(24, 119, 242)') || bgColor.includes('rgb(0, 100, 209)');
                return isBlue && b.offsetHeight > 25 && style.pointerEvents !== 'none';
            });
            if (b) { b.click(); return true; }
            return false;
        }`);

        if (clickedBlue) {
            console.log('[FB Post] Found blue button, attempting JS click...');
            await sleep(3000);
        }

        dialogClosed = await c.evaluate(`() => {
            const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]')).filter(d => d.offsetHeight > 0 || d.hasAttribute('aria-modal'));
            return dialogs.length === 0;
        }`);
    }

    // Attempt to take screenshot if endpoint exists, otherwise ignore
    try {
      await fetch(`${process.env.CAMOFOX_API_URL || 'http://localhost:9377'}/tabs/${c.tabId}/screenshot`);
    } catch(e) {}

    if (!dialogClosed) {
        console.warn('[FB Post] Dialog is still visible after 3 attempts.');
        throw new Error('Failed to submit post: Dialog remained open after multiple attempts.');
    }

    console.log('[FB Post] Process complete.');
    return { success: true, message: 'Posted successfully on timeline' };
  } catch (error) {
    console.error('[FB Post Error]', error.stack);
    throw error;
  }
}

export const fbToolMap = {
  fb_login,
  fb_get_profile,
  fb_post_timeline,
};
