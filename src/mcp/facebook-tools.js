#!/usr/bin/env node
/**
 * XActions Local Tools FOR FACEBOOK
 * Free mode - runs browser automation using TurnstileSolver HTTP API
 *
 * @author nich (@nichxbt)
 * @see https://xactions.app
 * @license MIT
 */

import fs from 'fs';
import path from 'path';
import TurnstileClient from '../solver/turnstile-client.js';
import { normalizeFacebookCookies } from '../core/cookies.js';

const activeClients = new Map();

export function resolveSessionId(accountId, cookie) {
  // 1. Priority: Extract permanent Facebook User ID (c_user) from cookie if available
  if (cookie) {
    try {
      const cookies = normalizeFacebookCookies(cookie);
      const cUser = cookies.find(c => c.name === 'c_user')?.value;
      if (cUser && /^\d+$/.test(cUser)) {
        return `safe_browser_facebook_${cUser}`;
      }
    } catch (e) {}

    const cMatch = typeof cookie === 'string'
      ? (cookie.match(/"c_user"\s*:\s*"?(\d+)"?/) || cookie.match(/c_user=(\d+)/))
      : null;
    if (cMatch && cMatch[1]) {
      return `safe_browser_facebook_${cMatch[1]}`;
    }
  }

  // 2. If accountId is specifically a c_user or custom identifier (not 'default')
  if (accountId && String(accountId) !== 'default' && String(accountId).trim()) {
    return `safe_browser_facebook_${String(accountId).trim()}`;
  }

  return 'safe_browser_facebook_default';
}

export async function getClient(sessionIdOrOptions = 'safe_browser_facebook_default') {
  let sid = 'safe_browser_facebook_default';
  let requestedDataSaver = undefined;
  if (typeof sessionIdOrOptions === 'string') {
    sid = sessionIdOrOptions;
  } else if (sessionIdOrOptions && typeof sessionIdOrOptions === 'object') {
    sid = resolveSessionId(sessionIdOrOptions.accountId, sessionIdOrOptions.cookie);
    if (sessionIdOrOptions.dataSaver !== undefined) {
      requestedDataSaver = sessionIdOrOptions.dataSaver;
    }
  }

  if (!activeClients.has(sid)) {
    console.log(`[FB Browser] Starting TurnstileClient session: ${sid}`);
    const c = new TurnstileClient(sid);
    await c.createSession(null, 60, requestedDataSaver !== undefined ? requestedDataSaver : true);
    activeClients.set(sid, c);
  } else if (requestedDataSaver !== undefined) {
    const existing = activeClients.get(sid);
    if (existing && existing.dataSaver !== requestedDataSaver) {
      await existing.createSession(null, 60, requestedDataSaver);
    }
  }
  return activeClients.get(sid);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(1500 + Math.random() * 3000);

export async function closeBrowser(sessionIdOrAccount = null, cookie = null) {
  let targetSids = [];

  if (sessionIdOrAccount && typeof sessionIdOrAccount === 'object') {
    const acc = sessionIdOrAccount.accountId || sessionIdOrAccount.id;
    const ck = sessionIdOrAccount.cookie || sessionIdOrAccount.token || cookie;
    if (acc || ck) {
      targetSids.push(resolveSessionId(acc, ck));
    }
    if (acc) {
      targetSids.push(String(acc).startsWith('safe_browser_') ? String(acc) : `safe_browser_facebook_${acc}`);
    }
  } else if (typeof sessionIdOrAccount === 'string' && sessionIdOrAccount.trim()) {
    const raw = sessionIdOrAccount.trim();
    targetSids.push(raw.startsWith('safe_browser_') ? raw : `safe_browser_facebook_${raw}`);
    if (cookie) {
      targetSids.push(resolveSessionId(raw, cookie));
    }
  }

  if (cookie && typeof cookie === 'string') {
    const cUserMatch = cookie.match(/"c_user"\s*:\s*"?(\d+)"?/) || cookie.match(/c_user=(\d+)/);
    if (cUserMatch && cUserMatch[1]) {
      targetSids.push(`safe_browser_facebook_${cUserMatch[1]}`);
    }
  }

  // Deduplicate and filter falsy values
  targetSids = [...new Set(targetSids.filter(Boolean))];

  let closedCount = 0;

  // 1. Destroy explicitly matching sessions
  for (const sid of targetSids) {
    if (activeClients.has(sid)) {
      console.log(`[FB Browser] Closing matched session: ${sid}`);
      const c = activeClients.get(sid);
      await c.destroySession().catch(() => {});
      activeClients.delete(sid);
      closedCount++;
    } else {
      // Also send destroy request to solver directly in case client was created externally or in previous run
      try {
        const dummy = new TurnstileClient(sid);
        await dummy.destroySession().catch(() => {});
      } catch (e) {}
    }
  }

  // 2. If an account or cookie was provided, fuzzy match against activeClients keys
  if (sessionIdOrAccount && closedCount === 0) {
    const queryStr = String(typeof sessionIdOrAccount === 'object' ? (sessionIdOrAccount.accountId || '') : sessionIdOrAccount).trim();
    if (queryStr && queryStr !== 'default') {
      for (const [sid, client] of Array.from(activeClients.entries())) {
        if (sid.includes(queryStr)) {
          console.log(`[FB Browser] Closing fuzzy-matched session: ${sid}`);
          await client.destroySession().catch(() => {});
          activeClients.delete(sid);
          closedCount++;
        }
      }
    }
  }

  // 3. Fallback: If sessionIdOrAccount was provided and only 1 active client exists, close it
  if (sessionIdOrAccount && closedCount === 0 && activeClients.size === 1) {
    const [soleSid, client] = activeClients.entries().next().value;
    console.log(`[FB Browser] Fallback: Closing single active session: ${soleSid}`);
    await client.destroySession().catch(() => {});
    activeClients.delete(soleSid);
    closedCount++;
  }

  // 4. If no specific account was provided, or if closedCount === 0 and !sessionIdOrAccount
  if (!sessionIdOrAccount) {
    console.log(`[FB Browser] Closing all active sessions (${activeClients.size})...`);
    for (const [id, c] of Array.from(activeClients.entries())) {
      await c.destroySession().catch(() => {});
    }
    activeClients.clear();
  }
}

/**
 * Dismisses non-composer modal dialogs, cookie banners, and "Not Now" / "ليس الآن" notification prompts.
 */
export async function dismissFacebookOverlays(client) {
  try {
    const dismissed = await client.evaluate(`(() => {
      let count = 0;

      // 1. Identify non-composer dialogs, alert dialogs, or modal backdrops
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], div[role="alertdialog"], div[aria-modal="true"]'));
      for (const d of dialogs) {
        // Never dismiss the post composer dialog
        const hasEditor = !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]') ||
          (d.innerText && (d.innerText.includes('Create post') || d.innerText.includes('إنشاء منشور') || d.innerText.includes('What\\'s on your mind') || d.innerText.includes('بم تفكر')));
        if (hasEditor) continue;

        // Search for dismiss/close/cancel/not now buttons inside this non-composer dialog
        const buttons = Array.from(d.querySelectorAll('div[role="button"], button, [role="button"]'));
        const dismissBtn = buttons.find(b => {
          const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
          return (
            txt === 'not now' || txt === 'ليس الآن' ||
            txt === 'close' || txt === 'إغلاق' ||
            txt === 'cancel' || txt === 'إلغاء' ||
            txt === 'decline' || txt === 'رفض' ||
            txt === 'later' || txt === 'لاحقاً' || txt === 'لاحقا' ||
            aria.includes('close') || aria.includes('إغلاق') ||
            aria.includes('not now') || aria.includes('ليس الآن')
          );
        });

        if (dismissBtn) {
          try {
            dismissBtn.click();
            count++;
          } catch(e) {}
        } else {
          try {
            d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            d.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            count++;
          } catch(e) {}
        }
      }

      // 2. Scan general buttons for standalone "Not Now" / "ليس الآن"
      const allButtons = Array.from(document.querySelectorAll('div[role="button"], button'));
      for (const b of allButtons) {
        const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
        if (txt === 'not now' || txt === 'ليس الآن' || aria === 'not now' || aria === 'ليس الآن') {
          try {
            b.click();
            count++;
          } catch(e) {}
        }
      }

      return count;
    })()`);

    if (dismissed > 0) {
      console.log(`[FB Overlay Dismiss] Dismissed ${dismissed} non-composer popups/banners.`);
    }
    return dismissed;
  } catch (err) {
    return 0;
  }
}

/**
 * Waits until the live Facebook page is actually loaded and interactive
 * (handles slow / poor internet: the DOM isn't ready right after goto()).
 * - Polls document.readyState + Facebook mount points every 2s
 * - If nothing mounts after `reloadAfterMs`, reloads the live page once
 * Returns 'ready' | 'login' | 'timeout' (callers proceed with a warning on timeout).
 */
export async function waitFacebookReady(client, maxMs = 90000, { reloadAfterMs = 45000 } = {}) {
  const started = Date.now();
  let reloaded = false;
  let lastLogged = 0;

  while (Date.now() - started < maxMs) {
    const state = await client.evaluate(`(() => {
      const mountedBy = document.querySelector('#mount_0_0 div, #mount_0_0 [role], div[data-pagelet], div[role="main"], div[role="feed"], div[role="banner"]');
      const bodyText = document.body ? (document.body.innerText || '').length : 0;
      const bodyHtml = document.documentElement ? document.documentElement.outerHTML.length : 0;
      const loginScreen = !!document.querySelector('input[type="password"], input[name="email"], form[action*="login" i]');
      const external = !/facebook\\.com/i.test(location.hostname);
      return {
        readyState: document.readyState,
        bodyText,
        bodyHtml,
        mounted: !!mountedBy,
        loginScreen,
        external,
        href: window.location.href
      };
    })()`).catch(() => null);

    if (state) {
      if (state.external) {
        console.warn(`[FB Ready] Browser left Facebook to: ${state.href}`);
        return 'external';
      }
      if (state.loginScreen) {
        console.log('[FB Ready] Detected login screen — cookies may have expired.');
        return 'login';
      }
      const looksReady = state.mounted && state.bodyText > 100 && state.bodyHtml > 5000
        && (state.readyState === 'complete' || state.readyState === 'interactive');
      if (looksReady) {
        console.log(`[FB Ready] ✅ Page interactive after ${Math.round((Date.now() - started) / 1000)}s (readyState: ${state.readyState}).`);
        return 'ready';
      }

      const elapsed = Date.now() - started;
      if (elapsed - lastLogged >= 10000) {
        lastLogged = elapsed;
        console.log(`[FB Ready] Waiting for page (readyState: ${state.readyState}, mounted: ${state.mounted}, text: ${state.bodyText})... ${Math.round(elapsed / 1000)}s`);
      }

      // Recover from a stuck half-loaded page: reload once and keep waiting
      if (!reloaded && elapsed >= reloadAfterMs && !state.mounted) {
        reloaded = true;
        console.log('[FB Ready] Page did not mount in time — reloading live page once (slow network recovery)...');
        await client.evaluate('() => { window.location.reload(); }').catch(() => {});
        await sleep(6000);
        continue;
      }
    }

    await sleep(2000);
  }

  console.warn('[FB Ready Warning] Page readiness could not be confirmed within timeout; proceeding with best effort.');
  return 'timeout';
}

export async function fb_login({ cookie, accountId }) {
  try {
    const sid = resolveSessionId(accountId, cookie);
    console.log(`[FB Auth] Authenticating for session: ${sid}`);
    const c = await getClient(sid);

    let finalCookies = [];

    if (cookie) {
      console.log(`[FB Auth] Parsing cookie payload (length: ${cookie.length})`);
      finalCookies = normalizeFacebookCookies(cookie);
    }

    if (finalCookies.length > 0) {
      console.log(`[FB Auth] Injecting ${finalCookies.length} session cookies into ${sid}...`);
      await c.setCookie(...finalCookies);
    }

    // Always navigate to facebook.com to load/refresh with active cookies
    console.log('[FB Auth] Navigating to https://www.facebook.com/ ...');
    await c.goto('https://www.facebook.com/');
    // Slow-internet safety: wait until the page is actually loaded before checking cookies
    await waitFacebookReady(c, 60000).catch(() => 'timeout');

    const getStatus = async () => {
      return await c.evaluate(`() => {
        const loginForm = document.querySelector('input[name="email"], input[type="password"]');
        if (loginForm) return 'LOGIN_REQUIRED';
        const searchExists = document.querySelector('[aria-label="Search Facebook"], [aria-label="بحث في فيسبوك"], [role="search"]');
        if (searchExists) return 'SUCCESS';
        const loggedInIndicator = document.querySelector('[aria-label="Your profile"], [aria-label="الحساب"], div[data-testid="user_menu"]');
        if (loggedInIndicator || window.location.href.includes('facebook.com/home')) return 'SUCCESS';
        
        const continueBtn = Array.from(document.querySelectorAll('div[role="button"], button')).find(el => el.textContent.includes('Continue') || el.textContent.includes('متابعة'));
        if (continueBtn) return 'CONTINUE_SCREEN';

        return 'UNKNOWN:' + window.location.href + '|' + ((document.body && document.body.innerText) || '').substring(0, 200);
      }`);
    };

    let checkLogin = 'UNKNOWN';
    for (let i = 0; i < 12; i++) {
      checkLogin = await getStatus();
      if (
        checkLogin === 'SUCCESS' ||
        checkLogin === 'CONTINUE_SCREEN' ||
        checkLogin === 'LOGIN_REQUIRED'
      ) {
        break;
      }
      await sleep(1000);
    }

    if (checkLogin === 'CONTINUE_SCREEN') {
      console.log('[FB Auth] Found "Continue" screen, clicking continue button...');
      await c.evaluate(`() => {
        const continueBtn = Array.from(document.querySelectorAll('div[role="button"], button')).find(el => el.textContent.includes('Continue') || el.textContent.includes('متابعة'));
        if (continueBtn) continueBtn.click();
      }`);

      for (let i = 0; i < 10; i++) {
        await sleep(1000);
        checkLogin = await getStatus();
        if (checkLogin === 'SUCCESS' || checkLogin === 'LOGIN_REQUIRED') {
          break;
        }
      }
    }

    if (checkLogin === 'LOGIN_REQUIRED') {
      throw new Error('فشل تسجيل الدخول: يطلب فيسبوك تسجيل الدخول. يرجى فتح الحساب من "مدير الحسابات" أولاً والتأكد من حفظ الكعكات بنجاح.');
    }

    console.log('[FB Auth] ✅ Authentication check passed: SUCCESS');
    return { success: true, message: 'تم تسجيل الدخول والتحقق من جلسة فيسبوك بنجاح.' };
  } catch (error) {
    console.error('[FB Login Error]', error.message);
    throw error;
  }
}

export async function fb_get_profile({ profileUrl, cookie, accountId }) {
  const c = await getClient({ accountId, cookie });
  if (cookie) await fb_login({ cookie, accountId });

  try {
    await c.goto(profileUrl);
    await sleep(3000);

    // Scroll down to load posts
    await c.evaluate(`() => window.scrollBy(0, 800)`);
    await sleep(2000);
    await c.evaluate(`() => window.scrollBy(0, 1200)`);
    await sleep(2500);

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
    await sleep(1000);

    return await c.evaluate(`() => {
      // 1. Extract Profile Name accurately
      let name = null;
      const h1El = document.querySelector('div[role="main"] h1') || document.querySelector('h1');
      if (h1El) {
        const h1Text = h1El.innerText?.trim() || h1El.textContent?.trim();
        if (h1Text && !h1Text.toLowerCase().includes('facebook')) {
          name = h1Text.split('\\n')[0].trim();
        }
      }

      if (!name) {
        let cleanTitle = (document.title || '')
          .replace(/^\\(\\d+\\)\\s*/, '')
          .replace(/\\s*[|•\\-–—]\\s*Facebook.*$/i, '')
          .trim();
        if (cleanTitle && cleanTitle.toLowerCase() !== 'facebook') {
          name = cleanTitle;
        }
      }

      if (!name) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        if (ogTitle && !ogTitle.toLowerCase().includes('facebook')) {
          name = ogTitle.split('|')[0].split('•')[0].trim();
        }
      }

      if (!name) {
        // Fallback: extract username from URL
        const urlMatch = window.location.pathname.replace(/^\\//, '').split('/')[0];
        if (urlMatch && urlMatch !== 'profile.php') {
          name = urlMatch;
        }
      }

      // 2. Identify Intro Section / Sidebar
      let introContainer = null;
      let bioText = null;
      const introItems = [];

      const allElements = Array.from(document.querySelectorAll('div[role="main"] span, div[role="main"] h2, div[role="main"] h3'));
      for (const el of allElements) {
        const txt = el.innerText?.trim();
        if (txt === 'Intro' || txt === 'نبذة' || txt === 'السيرة الذاتية' || txt === 'About' || txt === 'معلومات') {
          introContainer = el.closest('div[role="region"]') || el.parentElement?.parentElement?.parentElement;
          break;
        }
      }

      if (introContainer) {
        const introTexts = Array.from(introContainer.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
          .map(e => e.innerText?.trim())
          .filter(t => t && t.length > 2 && t !== 'Intro' && t !== 'نبذة' && t !== 'السيرة الذاتية' && t !== 'About');

        for (const t of introTexts) {
          if (
            t.startsWith('يعمل لدى') || t.startsWith('Works at') ||
            t.startsWith('درس في') || t.startsWith('Studied at') ||
            t.startsWith('يقيم في') || t.startsWith('Lives in') ||
            t.startsWith('من مدينة') || t.startsWith('من ') || t.startsWith('From ') ||
            t.startsWith('تاريخ الانضمام') || t.startsWith('Joined ') ||
            t.startsWith('يتابعه') || t.startsWith('Followed by') ||
            t.startsWith('متزوج') || t.startsWith('Married') || t.startsWith('أعزب') || t.startsWith('Single')
          ) {
            if (!introItems.includes(t) && t.length < 150) {
              introItems.push(t);
            }
          } else if (!bioText && t.length > 5 && t.length < 250) {
            bioText = t;
          }
        }
      }

      if (!bioText) {
        const metaDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                         document.querySelector('meta[name="description"]')?.getAttribute('content');
        if (metaDesc && !metaDesc.includes('Log into Facebook') && !metaDesc.includes('تسجيل الدخول إلى فيسبوك')) {
          bioText = metaDesc.trim();
        }
      }

      // 3. Extract Friends and Followers Count
      let friendsCount = null;
      let followersCount = null;

      const headerArea = document.querySelector('div[role="main"]');
      const headerText = headerArea ? headerArea.innerText.substring(0, 1500) : document.body.innerText.substring(0, 1500);

      const fMatch = headerText.match(/([\\d,.]+\\s*[KkMmBb]?)\\s*(?:أصدقاء|صديق|friends?)\\b/i);
      if (fMatch) friendsCount = fMatch[1].trim();

      const folMatch = headerText.match(/([\\d,.]+\\s*[KkMmBb]?)\\s*(?:متابع(?:اً|ين)?|followers?)\\b/i);
      if (folMatch) followersCount = folMatch[1].trim();

      const links = Array.from(document.querySelectorAll('a'));
      for (const a of links) {
        const text = a.innerText?.trim() || '';
        const href = a.href || '';
        if (!friendsCount && (href.includes('/friends') || text.includes('أصدقاء') || text.includes('friends'))) {
          const match = text.match(/([\\d,.]+\\s*[KkMmBb]?)/);
          if (match) friendsCount = match[1].trim();
        }
        if (!followersCount && (href.includes('/followers') || text.includes('متابع') || text.includes('followers'))) {
          const match = text.match(/([\\d,.]+\\s*[KkMmBb]?)/);
          if (match) followersCount = match[1].trim();
        }
      }

      // 4. Extract Avatar safely
      let avatar = null;
      try {
        const svgImg = document.querySelector('div[role="main"] svg image') || document.querySelector('svg image');
        if (svgImg) {
          avatar = svgImg.getAttribute('xlink:href') || svgImg.getAttribute('href') || null;
        }
        if (!avatar) {
          const profileImg = document.querySelector('div[role="main"] a[aria-label*="Profile picture" i] img, div[role="main"] a[aria-label*="صورة الملف الشخصي" i] img, a[aria-label*="Profile picture" i] img');
          if (profileImg) avatar = profileImg.src;
        }
        if (!avatar) {
          avatar = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
        }
      } catch (e) {}

      // 5. Extract latest 5 posts
      const posts = [];
      const articles = document.querySelectorAll('[role="article"]');
      
      for (const article of articles) {
          if (article.closest('ul') || article.parentElement.closest('[role="article"]')) continue;
          
          let text = '';
          const textContainer = article.querySelector('[data-ad-preview="message"]');
          if (textContainer) {
              text = textContainer.innerText;
          } else {
              const textDivs = Array.from(article.querySelectorAll('div[dir="auto"]'));
              const postTexts = textDivs
                  .map(d => d.innerText.trim())
                  .filter(t => t.length > 15 && !t.includes('Like') && !t.includes('Comment') && !t.includes('Share') && !t.includes('أعجبني') && !t.includes('تعليق'));
              if (postTexts.length > 0) {
                  text = postTexts.sort((a, b) => b.length - a.length)[0];
              }
          }

          // Clean up "See less / عرض أقل" from post text
          if (text) {
            text = text.replace(/\\s*(?:عرض أقل|See less|Read less)\\s*$/i, '').trim();
          }

          const imgs = Array.from(article.querySelectorAll('img'));
          const images = [];
          for (const img of imgs) {
              const src = img.getAttribute('src');
              if (src && src.includes('scontent') && !src.includes('/emoji/')) {
                  images.push(src);
              }
          }
          
          const link = Array.from(article.querySelectorAll('a')).find(a => a.href && (a.href.includes('/posts/') || a.href.includes('/permalink/') || a.href.includes('/videos/')));
          const url = link ? link.href : null;

          if (text || images.length > 0) {
              posts.push({
                  text: text.trim(),
                  images: [...new Set(images)],
                  url: url
              });
          }
          
          if (posts.length >= 5) break;
      }

      return {
        success: true,
        name: name,
        url: window.location.href,
        bio: bioText,
        avatar: avatar,
        friendsCount: friendsCount,
        followersCount: followersCount,
        intro: introItems,
        recentPosts: posts
      };
    }`);
  } catch (error) {
    console.error('[FB Scrape Error]', error.message);
    return { success: false, error: error.message };
  }
}

export async function fb_post_timeline({ text, imagePath, mediaPath, targetUrl, firstComment, postToGroups, cookie, accountId }) {
  // Data Saver blocks *.jpg/*.png/*.webp downloads via CDP, which breaks the
  // composer image preview and upload verification — so when posting WITH an
  // image, the session must run with Data Saver OFF.
  const wantsImage = typeof (imagePath || mediaPath) === 'string' && (imagePath || mediaPath).trim();
  if (wantsImage) {
    console.log('[FB Post] Image detected in post — requesting session with Data Saver OFF (previews must load for upload verification).');
  }
  const c = await getClient({
    accountId,
    cookie,
    ...(wantsImage ? { dataSaver: false } : {}),
  });
  if (cookie) await fb_login({ cookie, accountId });

  try {
    const targetImage = imagePath || mediaPath;
    let localFilePath = null;
    if (targetImage && typeof targetImage === 'string' && targetImage.trim()) {
      const trimmed = targetImage.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          console.log(`[FB Post] Downloading image from URL: ${trimmed}`);
          const res = await fetch(trimmed);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            const uploadsDir = path.resolve('uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const ext = trimmed.split('?')[0].split('.').pop() || 'jpg';
            const tempFile = path.join(uploadsDir, `fb_img_${Date.now()}.${ext}`);
            fs.writeFileSync(tempFile, buffer);
            localFilePath = path.resolve(tempFile);
          }
        } catch (dlErr) {
          console.error('[FB Post] Error downloading image URL:', dlErr.message);
        }
      } else {
        localFilePath = path.resolve(trimmed);
        if (!fs.existsSync(localFilePath)) {
          const inUploads = path.resolve('uploads', trimmed);
          if (fs.existsSync(inUploads)) {
            localFilePath = inUploads;
          }
        }
      }
    }

    const destUrl = (targetUrl && targetUrl.trim()) ? targetUrl.trim() : 'https://www.facebook.com/';
    console.log(`[FB Post] Navigating to destination: ${destUrl}`);
    const navAndAwait = async (url, maxMs) => {
      await c.goto(url);
      return await waitFacebookReady(c, maxMs);
    };

    // Slow-internet safety: wait until the page is genuinely loaded & interactive
    // NEVER proceed with clicks while the page has not mounted — blind clicks hit
    // sponsored feed ads (e.g. opening grammarly.com instead of posting)
    let readyState = await navAndAwait(destUrl, 90000);
    if (readyState === 'external') {
      console.warn('[FB Post] Left Facebook during load (ad/redirect) — navigating back...');
      readyState = await navAndAwait(destUrl, 60000);
    }
    if (readyState === 'login') {
      throw new Error('يبدو أن جلسة فيسبوك انتهت (صفحة تسجيل الدخول). يرجى تحديث الكوكيز وإعادة المحاولة.');
    }
    if (readyState !== 'ready') {
      // One retry navigation before giving up
      console.warn('[FB Post] Page did not load in time — retrying navigation once...');
      readyState = await navAndAwait(destUrl, 60000);
    }
    if (readyState !== 'ready') {
      throw new Error('تعذّر تحميل صفحة فيسبوك نظراً لبطء الإنترنت. يرجى التحقق من الاتصال وإعادة المحاولة. (لم يتم تنفيذ أي نقرة لتفادي النقر على الإعلانات)');
    }

    // Dismiss any notification prompts, translation bars, or modal banners
    await dismissFacebookOverlays(c);
    await sleep(1000);

    // Scroll to top
    await c.evaluate(`() => window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(800);

    console.log('[FB Post] Opening post composer...');

    const clickComposerTrigger = async () => {
      return await c.evaluate(`() => {
        if (document.querySelector('input[type="password"], input[name="email"]')) return 'LOGIN_SCREEN';

        // SAFETY: never click inside paid/sponsored posts or foreign-link CTAs
        // (blind feed clicking was opening sponsored ads like grammarly.com)
        const isAdContext = (el) => {
          const anchor = el.closest && el.closest('a[href]');
          if (anchor && anchor.getAttribute) {
            const href = anchor.getAttribute('href') || '';
            if (href.includes('/a/?') || href.includes('/l.php') || href.includes('/a.php') || href.includes('utm_') || /(^|\\/\\/)(?!.*facebook\\.com)http/i.test(href)) return true;
          }
          const article = el.closest && el.closest('[role="article"]');
          if (article) {
            const head = ((article.innerText || article.textContent || '') + '').slice(0, 400);
            if (/^\\s*(Sponsored|ممول|إعلان)/im.test(head)) return true;
          }
          return false;
        };

        const triggerClick = (el) => {
          if (!el) return false;
          if (isAdContext(el)) return false;
          ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
            const event = new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 });
            el.dispatchEvent(event);
          });
          try { el.click(); } catch(e) {}
          return true;
        };

        // 1. Keyword match (deepest elements first): composer placeholder text only
        const matches = Array.from(document.querySelectorAll('div[role="button"], span')).filter(el => {
          if (el.offsetHeight <= 0) return false;
          const t = ((el.innerText || el.textContent || '') + '').trim().toLowerCase();
          const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
          // Ad CTA texts are never composer triggers
          if (/^(اعرف المزيد|learn more|shop now|شاهد المزيد|see more|عرض المزيد|read more|قراءة المزيد)$/.test(t)) return false;
          // Composer placeholders are short texts — long articles mentioning them must not match
          if (t.length > 60) return false;
          const isMatch = t.includes('تفكر') || t.includes('mind') || t.includes('اكتب') || t.includes('write') ||
                          t.includes('إنشاء منشور') || t.includes('create post') ||
                          aria.includes('تفكر') || aria.includes('mind') || aria.includes('اكتب') || aria.includes('write') ||
                          aria.includes('إنشاء منشور') || aria.includes('create post');
          return isMatch && isAdContext(el) === false;
        });

        for (let i = matches.length - 1; i >= 0; i--) {
          const el = matches[i];
          const target = el.closest('div[role="button"]') || el;
          if (triggerClick(target)) {
            return true;
          }
        }

        // 2. Known composer pagelets ONLY.
        // Never blind-click generic feed buttons — those are frequently sponsored ads!
        const composerSelectors = [
          'div[data-pagelet="ProfileComposer"] div[role="button"]',
          'div[data-pagelet="GroupInlineComposer"] div[role="button"]',
          'div[data-pagelet="Feed_Sidebar_Composer"] div[role="button"]'
        ];

        for (const selector of composerSelectors) {
          try {
            const el = document.querySelector(selector);
            if (el && el.offsetHeight > 0 && triggerClick(el)) return true;
          } catch(e) {}
        }

        return false;
      }`);
    };

    // Helpers: URL safety + editor visibility (composer may be a dialog OR a full page)
    const currentHref = async () => {
      try { return String(await c.evaluate('() => window.location.href') || ''); } catch (e) { return ''; }
    };
    const isFacebookUrl = (href) => {
      try {
        const host = new URL(href).hostname || '';
        return /(^|\.)facebook\./i.test(host);
      } catch (e) {
        return /(^|\.)facebook\./i.test(String(href || ''));
      }
    };
    const editorVisible = () => c.evaluate(`() => {
      const editors = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]'));
      return editors.some(e => {
        const r = e.getBoundingClientRect();
        return (r.width > 0 && r.height > 0) || e.offsetHeight > 0 || e.offsetWidth > 0;
      });
    }`);
    const waitForEditor = async (maxMs = 15000) => {
      const end = Date.now() + maxMs;
      while (Date.now() < end) {
        if (await editorVisible()) return true;
        await sleep(1500);
      }
      return false;
    };

    // Retry opening the composer until an editor actually appears.
    // Facebook now often opens the composer as a FULL PAGE at /post/create
    // (real navigation) — that must be supported, not treated as "left Facebook".
    let composerOpen = false;
    for (let attempt = 0; attempt < 10 && !composerOpen; attempt++) {
      if (attempt > 0) {
        console.log(`[FB Post] Composer not open (attempt ${attempt + 1}), dismissing overlays and retrying click...`);
        await dismissFacebookOverlays(c);
        await sleep(900);
      }
      const clickSuccess = await clickComposerTrigger();
      if (clickSuccess === 'LOGIN_SCREEN') throw new Error('يرجى تسجيل الدخول أولاً بحساب فيسبوك.');

      // Progressive waiting: give Facebook time to mount the composer dialog/page
      await sleep(2000 + attempt * 700);

      const hrefNow = await currentHref();
      if (/\/post\/create\b/i.test(hrefNow) || /\/composer\b/i.test(hrefNow)) {
        console.log('[FB Post] Detected full-page composer (post/create) — waiting for its editor...');
        composerOpen = await waitForEditor(15000);
      } else {
        composerOpen = await editorVisible();
      }

      // SAFETY: recover ONLY if we truly left the facebook.com domain
      if (!composerOpen && hrefNow && !isFacebookUrl(hrefNow)) {
        console.warn(`[FB Post] ⚠ A click left Facebook to: ${hrefNow} — recovering and navigating back...`);
        await c.goto(destUrl);
        await waitFacebookReady(c, 60000);
        await dismissFacebookOverlays(c);
      }
    }

    if (!composerOpen) {
      // Last resort for slow connections: fresh navigation and one final round
      console.log('[FB Post] Composer never opened — navigating fresh for a final attempt...');
      const finalState = await navAndAwait(destUrl, 60000);
      if (finalState !== 'ready') {
        throw new Error('تعذّر تحميل صفحة فيسبوك أو فتح نافذة إنشاء المنشور بسبب بطء الإنترنت. لم يُنفَّذ أي منشور — يرجى إعادة المحاولة.');
      }
      await dismissFacebookOverlays(c);
      for (let attempt = 0; attempt < 4 && !composerOpen; attempt++) {
        const clickSuccess = await clickComposerTrigger();
        if (clickSuccess === 'LOGIN_SCREEN') throw new Error('يرجى تسجيل الدخول أولاً بحساب فيسبوك.');
        await sleep(2500);
        const hrefNow = await currentHref();
        if (/\/post\/create\b/i.test(hrefNow) || /\/composer\b/i.test(hrefNow)) {
          composerOpen = await waitForEditor(12000);
        } else {
          composerOpen = await editorVisible();
        }
      }
    }

    if (!composerOpen) {
      throw new Error('تعذّر فتح نافذة إنشاء المنشور. قد توجد نافذة منبثقة تعيق النقر أو تغيّرت واجهة فيسبوك.');
    }

    // Shared page-side DOM helpers injected into every evaluate snippet below
    const FB_DOM_HELPERS = String.raw`
      const xaNorm = (s) => (s || '').replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      const xaFindDialog = () => {
        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
        return dialogs.find(d => d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]')) || dialogs[0] || null;
      };
      const xaFindEditor = () => {
        const pickBest = (scope) => {
          const editors = Array.from(scope.querySelectorAll('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]'));
          const visible = editors.filter(e => {
            const r = e.getBoundingClientRect();
            return (r.width > 5 && r.height > 5) || e.offsetHeight > 0 || e.offsetWidth > 0;
          });
          const scoreOf = (e) => {
            const lp = ((e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('data-placeholder') || '')).toLowerCase();
            let s = 0;
            if (/comment|تعليق|رد/.test(lp)) s -= 10;
            if (/mind|تفكر|what|ما هو|اكتب شيئ|create post|إنشاء منشور/.test(lp)) s += 6;
            else if (/اكتب|write/.test(lp)) s += 2;
            return s;
          };
          visible.sort((a, b) => scoreOf(b) - scoreOf(a));
          return visible[0] || null;
        };
        const dialog = xaFindDialog();
        if (dialog) {
          const ed = pickBest(dialog);
          if (ed) return ed;
        }
        return pickBest(document);
      };
      const xaClearEditor = (editor) => {
        try {
          editor.focus();
          const range = document.createRange();
          range.selectNodeContents(editor);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('delete', false, null);
        } catch (e) {
          try { editor.innerText = ''; } catch (e2) {}
        }
      };
      const xaPaste = (editor, plain) => {
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', plain);
          editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
          return true;
        } catch (e) {
          return false;
        }
      };
      const xaInsertByLines = (editor, plain) => {
        editor.focus();
        const lines = String(plain).split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (i > 0) {
            let broke = false;
            try { broke = document.execCommand('insertLineBreak', false, null); } catch (e) {}
            if (!broke) {
              try { editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })); } catch (e) {}
            }
          }
          if (lines[i]) {
            let ok = false;
            try { ok = document.execCommand('insertText', false, lines[i]); } catch (e) {}
            if (!ok) xaPaste(editor, lines[i]);
          }
        }
      };
      const xaSetInnerText = (editor, plain) => {
        editor.innerText = plain;
        ['beforeinput', 'input', 'change'].forEach(n => editor.dispatchEvent(new Event(n, { bubbles: true })));
      };
    `;

    // Wait for the text editor and paste text using a resilient multi-method ladder
    console.log('[FB Post] Waiting for editor and pasting text (smart method ladder)...');
    let editorReady = null;
    const postTextJson = JSON.stringify(text);

    for (let i = 0; i < 24; i++) {
      editorReady = await c.evaluate(String.raw`() => {
        ${FB_DOM_HELPERS}
        const plain = ${postTextJson};
        const target = xaNorm(plain);
        if (!target) return { found: true, hasText: true, method: 'empty' };
        const editor = xaFindEditor();
        if (!editor) return { found: false, hasText: false };
        try { editor.focus(); } catch (e) {}
        try { editor.click(); } catch (e) {}
        const current = xaNorm(editor.innerText || editor.textContent || '');
        if (current === target) return { found: true, hasText: true, method: 'already' };

        // Method 1: native paste event (most reliable for Lexical/ProseMirror composers)
        if (current.length) xaClearEditor(editor);
        xaPaste(editor, plain);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        let after = xaNorm(editor.innerText || editor.textContent || '');
        if (after && (after.includes(target) || target.includes(after))) {
          return { found: true, hasText: true, method: 'paste' };
        }

        // Method 2: per-line simulated typing (handles paragraphs correctly)
        xaClearEditor(editor);
        xaInsertByLines(editor, plain);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        after = xaNorm(editor.innerText || editor.textContent || '');
        if (after && (after.includes(target) || target.includes(after))) {
          return { found: true, hasText: true, method: 'exec' };
        }

        // Method 3: direct innerText write (last JS resort)
        xaClearEditor(editor);
        xaSetInnerText(editor, plain);
        after = xaNorm(editor.innerText || editor.textContent || '');
        if (after && (after.includes(target) || target.includes(after))) {
          return { found: true, hasText: true, method: 'innerText' };
        }

        return { found: true, hasText: false, afterLen: after.length };
      }`);

      if (editorReady && editorReady.found) {
        if (editorReady.hasText) {
          console.log(`[FB Post] Text set successfully via '${editorReady.method}' method.`);
          await sleep(1500);
          break;
        }
        console.log('[FB Post] In-page insertion did not stick, switching to driver typing...');
        break;
      }
      await sleep(1500);
    }

    if (!editorReady || !editorReady.found) {
      throw new Error('لم يتم العثور على مربع إدخال النص في نافذة المنشور.');
    }

    if (!editorReady.hasText) {
      // Fallback: real keyboard typing through the browser driver
      try {
        await c.type(text);
      } catch (e) {
        console.error('[FB Post] Driver typing failed:', e.message);
      }
      await sleep(1200);
      const textVerified = await c.evaluate(String.raw`() => {
        ${FB_DOM_HELPERS}
        const target = xaNorm(${postTextJson});
        const editor = xaFindEditor();
        if (!editor) return false;
        const cur = xaNorm(editor.innerText || editor.textContent || '');
        return !!(cur && (cur.includes(target) || target.includes(cur)));
      }`);
      if (!textVerified) {
        throw new Error('تعذّر إدخال النص في مربع المنشور بعد تجربة عدة طرق. قد تكون واجهة فيسبوك قد تغيّرت.');
      }
      console.log('[FB Post] Text verified after driver typing.');
    }

    // Attach image if provided
    if (localFilePath && fs.existsSync(localFilePath)) {
      console.log(`[FB Post] Attaching image file: ${localFilePath}`);
      try {
        let attachVerified = false;

        for (let attempt = 0; attempt < 4 && !attachVerified; attempt++) {
          // A. Locate and tag the best file input (dialog first, then document-wide)
          const tagged = await c.evaluate(() => {
            document.querySelectorAll('input[data-xa-finput]').forEach(el => el.removeAttribute('data-xa-finput'));
            const all = Array.from(document.querySelectorAll('input[type="file"]')).filter(el => !el.disabled);
            const dialog = document.querySelector('div[role="dialog"]');
            const ordered = dialog
              ? all.filter(el => dialog.contains(el)).concat(all.filter(el => !dialog.contains(el)))
              : all;
            const pick = ordered[0] || null;
            if (pick) {
              pick.setAttribute('data-xa-finput', '1');
              return true;
            }
            return false;
          });

          if (!tagged) {
            // B. Spawn a file input by clicking the Photo/Video button
            await c.evaluate(String.raw`() => {
              const dialog = document.querySelector('div[role="dialog"]');
              const scopes = dialog ? [dialog, document] : [document];
              const seen = new Set();
              const clickable = [];
              for (const scope of scopes) {
                scope.querySelectorAll('div[role="button"], button, span[role="button"], a[role="link"]').forEach(el => {
                  if (seen.has(el)) return;
                  seen.add(el);
                  const r = el.getBoundingClientRect();
                  if (r.width <= 0 || r.height <= 0) return;
                  const label = ((el.getAttribute('aria-label') || '') + ' ' + (el.innerText || el.textContent || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
                  const forbidden = /remove|إزالة|delete|حذف|close|إغلاق|cancel|إلغاء|edit photo|تعديل الصورة|reels|ريلز|feeling|شعور/.test(label);
                  const isPhoto = /photo\s*\/\s*video/i.test(label) || /صورة\s*\/\s*فيديو/.test(label) || /photo|صورة/.test(label);
                  if (isPhoto && !forbidden) clickable.push(el);
                });
              }
              if (!clickable.length) return false;
              const depthOf = (el) => { let d = 0; let n = el; while (n.parentElement) { d++; n = n.parentElement; } return d; };
              clickable.sort((a, b) => depthOf(b) - depthOf(a));
              const target = clickable[0].closest('div[role="button"], button') || clickable[0];
              ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
                try { target.dispatchEvent(new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 })); } catch (e) {}
              });
              try { target.click(); } catch (e) {}
              return true;
            }`);
            await sleep(2200);
            continue;
          }

          // C. Send the file to the tagged input via the driver
          console.log('[FB Post] Sending file to the tagged file input...');
          let sent = false;
          try { sent = await c.sendFile('input[data-xa-finput]', localFilePath); } catch (e) { console.error('[FB Post] sendFile #1 error:', e.message); }
          if (!sent) {
            try { sent = await c.sendFile('div[role="dialog"] input[type="file"]', localFilePath); } catch (e) {}
          }
          if (!sent) {
            try { sent = await c.sendFile('input[type="file"]', localFilePath); } catch (e) {}
          }
          console.log(`[FB Post] File send result: ${sent}`);
          await sleep(2000);

          // Notify framework handlers about the change
          await c.evaluate(`() => {
            document.querySelectorAll('input[data-xa-finput], input[type="file"]').forEach(input => {
              try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
            });
          }`);

          // D. Wait for upload completion + preview to mount (longer window for slow internet)
          let uploadDone = false;
          for (let u = 0; u < 40; u++) {
            const status = await c.evaluate(String.raw`() => {
              const dialog = document.querySelector('div[role="dialog"]');
              const scope = dialog || document;
              const hasFilled = Array.from(scope.querySelectorAll('input[type="file"]')).some(inp => inp.files && inp.files.length > 0);
              const imgs = Array.from(scope.querySelectorAll('img')).filter(img => {
                const src = img.src || '';
                return (src.startsWith('blob:') || src.startsWith('data:') || src.includes('scontent') || src.includes('fbcdn')) && !src.includes('/emoji/') && !src.includes('/rsrc.php/');
              });
              const hasMediaContainer = !!scope.querySelector('[aria-label*="Photo" i], [aria-label*="صورة"], div[role="img"], div[data-visualcompletion="media-vc-image"]');
              const isUploading = !!scope.querySelector('[role="progressbar"], div[data-visualcompletion="loading-state"]');
              const hasImage = hasFilled || imgs.length > 0 || hasMediaContainer;
              const buttons = Array.from(scope.querySelectorAll('div[role="button"], button'));
              const postBtn = buttons.find(b => {
                const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || b.textContent || '')).trim().toLowerCase();
                return label === 'post' || label === 'نشر';
              });
              const canPost = !!(postBtn && postBtn.getAttribute('aria-disabled') !== 'true');
              return { hasImage, isUploading, canPost, ready: hasImage && !isUploading };
            }`);

            if (status && (status.ready || (status.hasImage && status.canPost))) {
              console.log('[FB Post] ✅ Image uploaded and ready in composer!');
              uploadDone = true;
              break;
            }
            await sleep(1500);
          }

          if (uploadDone) {
            attachVerified = true;
          } else if (attempt < 3) {
            console.log(`[FB Post] Upload not confirmed (attempt ${attempt + 1}), retrying attach flow...`);
            await sleep(1000);
          }
        }

        if (!attachVerified) {
          console.warn('[FB Post Warning] Upload could not be verified; continuing with current composer state.');
        }
      } catch (attachErr) {
        console.error('[FB Post] Error attaching image:', attachErr.message);
      }
    }

    // Step D: Verify text is present in the editor (works with dialog OR /post/create page)
    await c.evaluate(String.raw`() => {
      ${FB_DOM_HELPERS}
      const editor = xaFindEditor();
      if (!editor) return;
      const postText = ${postTextJson};
      const current = (editor.innerText || editor.textContent || '').trim();
      if (!current.includes(postText)) {
        try {
          editor.focus();
          document.execCommand('insertText', false, postText);
        } catch(e) {}
      }
    }`);

    await sleep(2000);

    // Step D2: If postToGroups is requested, select up to 9 groups all at once
    if (postToGroups) {
      console.log('[FB Post] 👥 Groups crossposting requested — opening "Post in more places" and selecting up to 9 groups all at once...');
      try {
        await c.evaluate(`(() => {
          const visible = (el) => {
            const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
            return !!r && r.width > 0 && r.height > 0;
          };
          const triggerClick = (target) => {
            ['mouseover', 'mousedown', 'mouseup'].forEach(name => {
              target.dispatchEvent(new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
            });
            try { target.click(); } catch (e) {
              target.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
            }
          };
          const composer = document.querySelector('div[role="dialog"]') || document;
          const buttons = Array.from(composer.querySelectorAll('div[role="button"], button, [role="button"], span[role="button"]')).filter(visible);
          const moreBtn = buttons.find(b => {
            const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).toLowerCase();
            if (/close|إغلاق|remove|إزالة|delete|حذف|photo|صورة|video|فيديو|feeling|شعور|tag|إشارة/i.test(label)) return false;
            return label.includes('مزيد من الأماكن') || label.includes('more places') || label.includes('share to groups') || label.includes('مشاركة في مجموعات') || (label.includes('مجموعات') && !label.includes('قواعد')) || (label.includes('groups') && !label.includes('rules'));
          });
          if (moreBtn) triggerClick(moreBtn);
        })()`);
        await sleep(2000);
        await c.evaluate(`(() => {
          const visible = (el) => {
            const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
            return !!r && r.width > 0 && r.height > 0;
          };
          const triggerClick = (target) => {
            ['mouseover', 'mousedown', 'mouseup'].forEach(name => {
              target.dispatchEvent(new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
            });
            try { target.click(); } catch (e) {
              target.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
            }
          };
          const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
          const groupsDialog = dialogs[dialogs.length - 1] || document;
          const checkboxes = Array.from(groupsDialog.querySelectorAll('div[role="checkbox"], input[type="checkbox"], [aria-checked]')).filter(visible);
          const toSelect = checkboxes.filter(c => c.getAttribute('aria-checked') !== 'true' && !c.checked).slice(0, 9);
          for (const cb of toSelect) {
            triggerClick(cb);
            if (cb.tagName === 'INPUT' && cb.type === 'checkbox') cb.checked = true;
            try { cb.setAttribute('aria-checked', 'true'); } catch (e) {}
          }
          const allButtons = Array.from(groupsDialog.querySelectorAll('div[role="button"], button')).filter(visible);
          const doneBtn = allButtons.find(b => {
            const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim().toLowerCase();
            return /^(done|تم|save|حفظ|back|رجوع)$/i.test(label) || label.includes('done') || label.includes('تم') || label.includes('back');
          });
          if (doneBtn) triggerClick(doneBtn);
        })()`);
        await sleep(1500);
        console.log('[FB Post] ✅ Groups crossposting selection completed.');
      } catch (grpErr) {
        console.warn('[FB Post Warning] Could not select groups:', grpErr.message);
      }
    }

    // Step E: Click submit/post button and wait for confirmation
    console.log('[FB Post] Submitting post...');
    let submitted = false;
    const submitAttempt = async (attempt) => {
      const clicked = await c.evaluate(() => {
        // Any remaining visible composer editor means "not posted yet"
        const editors = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]'));
        const editorStillVisible = editors.some(e => {
          const r = e.getBoundingClientRect();
          return (r.width > 0 && r.height > 0) || e.offsetHeight > 0 || e.offsetWidth > 0;
        });
        if (!editorStillVisible) return true; // posted: no editable composer remains anywhere

        // Work on the composer dialog if present, otherwise on the whole page (/post/create mode)
        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
        const dialog = dialogs.find(d => d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]')) || null;
        const scope = dialog || document.body;

        const triggerClick = (target) => {
          ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
            const ev = new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 });
            target.dispatchEvent(ev);
          });
          try { target.click(); } catch (e) {}
        };

        const buttons = Array.from(scope.querySelectorAll('div[role="button"], button'));

        // 1. Match by aria-label / visible text (Post / نشر / publish variants)
        for (const btn of buttons) {
          const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.innerText || btn.textContent || '')).trim().toLowerCase();
          const exactHit = ['post', 'نشر', 'publish', 'انشر'].some(v => label === v);
          const containsHit = (label.includes('post') || label.includes('نشر')) && label.length <= 16
            && !/remove|إزالة|cancel|إلغاء|delete|حذف|copy|نسخ|save|حفظ|embed|تضمين|later|لاحقا|reels|ريلز/.test(label);
          if ((exactHit || containsHit) && btn.getAttribute('aria-disabled') !== 'true') {
            triggerClick(btn);
            return true;
          }
        }

        // 2. Fallback: the enabled blue action button
        const blueBtn = buttons.find(b => {
          const style = window.getComputedStyle(b);
          const bg = style.backgroundColor;
          const isBlue = bg.includes('rgb(8, 102, 255)') || bg.includes('rgb(24, 119, 242)') || bg.includes('rgb(0, 100, 209)');
          return isBlue && b.offsetHeight > 20 && style.pointerEvents !== 'none' && b.getAttribute('aria-disabled') !== 'true';
        });

        if (blueBtn) {
          triggerClick(blueBtn);
          return true;
        }

        return false;
      });

      if (clicked) {
        await sleep(2500);
        const stillOpen = await editorVisible();
        if (!stillOpen) {
          console.log('[FB Post] Post submitted and composer closed successfully.');
          return true;
        }
      } else if (attempt >= 6) {
        // Fallback: Ctrl+Enter keyboard shortcut on the focused editor
        await c.evaluate(`() => {
          const editors = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"]'));
          const editor = editors[editors.length - 1];
          if (editor) { try { editor.focus(); } catch (e) {} }
          const tgt = document.activeElement || document.body;
          ['keydown', 'keyup'].forEach(type => {
            tgt.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, bubbles: true, cancelable: true }));
          });
        }`);
        await sleep(2000);
      }

      return false;
    };

    for (let s = 0; s < 12; s++) {
      submitted = await submitAttempt(s);
      if (submitted) break;
      await sleep(2000);
    }

    await sleep(3000);

    // Optional First Comment (if specified)
    if (firstComment && typeof firstComment === 'string' && firstComment.trim()) {
      console.log('[FB Post] Posting first comment on the newly created post...');
      try {
        await sleep(3000);
        // Find comment button or active comment input on the topmost post
        // (retry a few times: on slow internet the new post takes a while to render)
        let commentOpened = false;
        for (let r = 0; r < 5 && !commentOpened; r++) {
          await c.evaluate(`() => {
            const commentButtons = Array.from(document.querySelectorAll('div[role="button"], span')).filter(el => {
              const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
              const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
              return txt === 'comment' || txt === 'تعليق' || aria.includes('comment') || aria.includes('تعليق');
            });
            const visible = commentButtons.find(el => {
              const btn = el.closest('div[role="button"]') || el;
              const rect = btn.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
            if (visible) {
              const btn = visible.closest('div[role="button"]') || visible;
              try {
                ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => btn.dispatchEvent(new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 })));
                btn.click();
              } catch(e) {}
            }
          }`);
          await sleep(2000);
          commentOpened = await c.evaluate(`() => {
            const editors = Array.from(document.querySelectorAll('div[aria-label*="comment" i][contenteditable="true"], div[aria-label*="تعليق" i][contenteditable="true"]'));
            return editors.some(el => {
              const rc = el.getBoundingClientRect();
              return rc.width > 0 && rc.height > 0;
            });
          }`);
          if (!commentOpened) console.log(`[FB Post] Comment editor not open yet (retry ${r + 1}/5)...`);
        }

        // Paste the comment using the smart method ladder (avoids duplicate text)
        const commentResult = await c.evaluate(String.raw`() => {
          ${FB_DOM_HELPERS}
          const plain = ${JSON.stringify(firstComment.trim())};
          const target = xaNorm(plain);
          const editor = Array.from(document.querySelectorAll('div[aria-label*="comment" i][contenteditable="true"], div[aria-label*="تعليق" i][contenteditable="true"], div[aria-label*="اكتب تعليق" i][contenteditable="true"]'))
            .find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || null;
          if (!editor) return { found: false, hasText: false };
          try { editor.focus(); editor.click(); } catch (e) {}
          xaPaste(editor, plain);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          const cur = xaNorm(editor.innerText || editor.textContent || '');
          if (cur && (cur.includes(target) || target.includes(cur))) return { found: true, hasText: true };
          xaClearEditor(editor);
          xaInsertByLines(editor, plain);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          const after = xaNorm(editor.innerText || editor.textContent || '');
          return { found: true, hasText: !!(after && (after.includes(target) || target.includes(after))) };
        }`);

        if (!commentResult || !commentResult.found) {
          console.warn('[FB Post Warning] Comment editor not found on the page.');
        } else {
          if (!commentResult.hasText) {
            try { await c.type(firstComment.trim()); } catch (e) {}
            await sleep(800);
          }
          await c.evaluate(`() => {
            const el = document.activeElement;
            if (el) {
              ['keydown', 'keypress', 'keyup'].forEach(type => {
                el.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              });
            }
          }`);
          console.log('[FB Post] ✅ First comment submitted.');
        }
      } catch (commentErr) {
        console.warn('[FB Post Warning] Could not post first comment:', commentErr.message);
      }
    }

    console.log('[FB Post] Process complete.');

    // Try to capture the URL of the freshly published post
    let postUrl = null;
    try {
      postUrl = await c.evaluate(`() => {
        const a = Array.from(document.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="/story.php"]')).find(x => x.offsetHeight > 0);
        return a ? a.href : null;
      }`);
    } catch (e) {}

    return { success: true, message: 'تم نشر المنشور بنجاح.', postUrl: postUrl || null };
  } catch (error) {
    console.error('[FB Post Error]', error.message);
    throw error;
  }
}

export async function fb_get_group_posts({ groupUrl, limit = 10, cookie, accountId }) {
  const c = await getClient({ accountId, cookie });
  if (cookie) await fb_login({ cookie, accountId });

  try {
    console.log(`[FB Group] Navigating to group: ${groupUrl}`);
    await c.goto(groupUrl);
    await sleep(4000);

    const targetLimit = Number(limit) || 10;

    // Scroll down to load more group posts
    const maxScrolls = Math.min(Math.ceil(targetLimit / 3), 6);
    for (let s = 0; s < maxScrolls; s++) {
      await c.evaluate(`() => window.scrollBy(0, 1000)`);
      await sleep(2000);
    }

    // Expand "See more" / "عرض المزيد"
    await c.evaluate(`() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]')).filter(el => {
        const t = el.textContent ? el.textContent.trim() : '';
        return t === 'See more' || t === 'عرض المزيد' || t === 'Read more' || t === 'قراءة المزيد';
      });
      buttons.forEach(btn => {
        try { btn.click(); } catch(e) {}
      });
    }`);
    await sleep(1000);

    return await c.evaluate(`() => {
      try {
        const limitCount = ${targetLimit};

        // Check if page redirected to login
        if (window.location.href.includes('/login') || window.location.href.includes('login.php')) {
          return {
            success: false,
            error: 'هذه المجموعة تتطلب تسجيل الدخول أو الانضمام. يرجى التأكد من تسجيل الدخول بحسابك في إدارة الحسابات.',
            groupUrl: window.location.href
          };
        }

        // 1. Group Name
        let groupName = null;
        const h1 = document.querySelector('h1') || document.querySelector('div[role="main"] h1');
        if (h1) {
          groupName = h1.innerText ? h1.innerText.trim() : (h1.textContent ? h1.textContent.trim() : null);
        }
        if (!groupName || groupName.toLowerCase() === 'facebook') {
          groupName = (document.title || '')
            .replace(/^\\(\\d+\\)\\s*/, '')
            .replace(/\\s*[|•\\-–—]\\s*Facebook.*$/i, '')
            .replace(/\\s*[|•\\-–—]\\s*فيسبوك.*$/i, '')
            .trim();
        }

        // 2. Members count
        let membersCount = null;
        const allText = document.body.innerText || '';
        const memMatch = allText.match(/([\\d.,KMkm]+)\\s*(?:members|عضو|أعضاء)/i);
        if (memMatch) membersCount = memMatch[1];

        // 3. Extract Group Posts
        const posts = [];
        const candidateElements = Array.from(document.querySelectorAll('div[role="feed"] > div, div[role="main"] div[role="article"], div[role="article"], div[data-ad-preview="message"]'));
        
        for (const article of candidateElements) {
          if (posts.length >= limitCount) break;

          // Author
          let author = null;
          const authorEl = article.querySelector('h2, h3, h4, strong, a[role="link"] > span > strong, a[href*="/user/"] strong');
          if (authorEl) {
            author = authorEl.innerText ? authorEl.innerText.trim() : (authorEl.textContent ? authorEl.textContent.trim() : null);
          }

          // Post URL
          let postUrl = null;
          const links = Array.from(article.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="/groups/"]'));
          for (const l of links) {
            const h = l.getAttribute('href');
            if (h && (h.includes('/posts/') || h.includes('/permalink/'))) {
              postUrl = h.startsWith('http') ? h : ('https://www.facebook.com' + h);
              break;
            }
          }

          // Text
          const messageDiv = article.querySelector('div[dir="auto"], div[data-ad-preview="message"]');
          let text = messageDiv ? (messageDiv.innerText ? messageDiv.innerText.trim() : messageDiv.textContent ? messageDiv.textContent.trim() : null) : null;
          if (!text && article.getAttribute('role') === 'article') {
            text = article.innerText ? article.innerText.trim() : '';
          }

          // Clean text from noise
          if (text) {
            text = text.replace(/\\s*(?:عرض أقل|See less)\\s*$/i, '').trim();
          }

          // Images
          const images = [];
          const imgEls = article.querySelectorAll('img');
          imgEls.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.includes('emoji') && !src.includes('static') && (img.naturalWidth > 100 || !img.naturalWidth)) {
              images.push(src);
            }
          });

          if (text && text.length > 5 && !posts.some(p => p.text === text)) {
            posts.push({
              author: author || 'Facebook User',
              text: text,
              url: postUrl || window.location.href,
              images: images.slice(0, 4)
            });
          }
        }

        return {
          success: true,
          groupName: groupName || 'Facebook Group',
          groupUrl: window.location.href,
          membersCount,
          postsCount: posts.length,
          posts
        };
      } catch (err) {
        return {
          success: false,
          error: err.message
        };
      }
    }`);
  } catch (error) {
    console.error('[FB Group Error]', error.message);
    throw error;
  }
}

export async function fb_reply_comment({ postUrl, text, cookie, accountId }) {
  const c = await getClient({ accountId, cookie });
  if (cookie) await fb_login({ cookie, accountId });

  try {
    console.log(`[FB Reply] Navigating to post: ${postUrl}`);
    await c.goto(postUrl);
    await sleep(4000);

    // Scroll to comments area
    await c.evaluate(`() => window.scrollBy(0, 500)`);
    await sleep(2000);

    // Find comment box / textbox
    const focused = await c.evaluate(`() => {
      const inputs = Array.from(document.querySelectorAll('[role="textbox"], [contenteditable="true"], form textarea, div[aria-label*="comment" i], div[aria-label*="تعليق" i]'))
        .filter(el => el.offsetHeight > 0 || el.offsetWidth > 0);
      
      if (inputs.length > 0) {
        const target = inputs[inputs.length - 1];
        target.focus();
        target.click();
        return true;
      }
      return false;
    }`);

    if (!focused) {
      throw new Error('Could not locate comment input box on the specified post URL.');
    }

    await sleep(1500);

    const commentTextJson = JSON.stringify(text);
    await c.evaluate(`() => {
      const t = ${commentTextJson};
      const editor = document.activeElement || document.querySelector('[role="textbox"], [contenteditable="true"]');
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

    await sleep(2000);

    // Press Enter to submit comment
    await c.evaluate(`() => {
      const editor = document.activeElement || document.querySelector('[role="textbox"], [contenteditable="true"]');
      if (editor) {
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        editor.dispatchEvent(enterEvent);
      }
    }`);

    await sleep(3000);

    return {
      success: true,
      message: 'Comment submitted successfully.',
      postUrl
    };
  } catch (error) {
    console.error('[FB Reply Error]', error.message);
    throw error;
  }
}

/**
 * Facebook Warm-up & Engagement Campaign Tool
 * Likes posts on the feed or target URL with randomized jitter/variance and natural human delays.
 */
export async function fb_warmup_accounts({
  likesCount = 5,
  variance = 2,
  delayMin = 5,
  delayMax = 12,
  feedUrl = '',
  cookie,
  accountId,
  keepBrowserOpen = false,
} = {}) {
  const c = await getClient({ accountId, cookie });
  if (cookie) await fb_login({ cookie, accountId });

  const baseLikes = Math.max(1, parseInt(likesCount, 10) || 5);
  const varRange = Math.max(0, parseInt(variance, 10) || 0);

  // Compute random jitter between -varRange and +varRange
  const jitter = varRange > 0 ? Math.floor(Math.random() * (varRange * 2 + 1)) - varRange : 0;
  const targetLikes = Math.max(1, baseLikes + jitter);

  const minWait = Math.max(2, parseInt(delayMin, 10) || 5);
  const maxWait = Math.max(minWait, parseInt(delayMax, 10) || 12);

  const targetUrl = feedUrl && feedUrl.startsWith('http') ? feedUrl : 'https://www.facebook.com/';

  console.log(`[FB Warmup] Target likes for this session: ${targetLikes} (Base: ${baseLikes}, Variance: ±${varRange}, Jitter: ${jitter >= 0 ? '+' : ''}${jitter})`);
  console.log(`[FB Warmup] Delays between actions: ${minWait}s - ${maxWait}s`);

  try {
    const currentUrl = await c.evaluate(`() => window.location.href`);
    if (!currentUrl || !currentUrl.includes('facebook.com')) {
      await c.goto(targetUrl);
    } else if (targetUrl !== 'https://www.facebook.com/' && !currentUrl.includes(targetUrl)) {
      await c.goto(targetUrl);
    }

    await sleep(4000);

    let likedCount = 0;
    let scrolls = 0;
    const maxScrolls = Math.max(20, targetLikes * 4);
    let consecutiveFails = 0;

    while (likedCount < targetLikes && scrolls < maxScrolls) {
      scrolls++;

      // Try to find and like an unliked post in the current view
      const likeResult = await c.evaluate(`() => {
        const triggerClick = (el) => {
          if (!el) return false;
          ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
            const event = new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 });
            el.dispatchEvent(event);
          });
          try { el.click(); } catch(e) {}
          return true;
        };

        const buttons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"], button'));
        
        for (const btn of buttons) {
          if (btn.dataset.xactionsProcessed) continue;

          const label = (btn.getAttribute('aria-label') || '').trim();
          const text = (btn.innerText || btn.textContent || '').trim();
          const isPressed = btn.getAttribute('aria-pressed') === 'true';

          // Match like button in English and Arabic
          const isLikeButton = (
            label === 'Like' || label === 'إعجاب' || label === 'أعجبني' ||
            (label.startsWith('Like') && !label.includes('Unlike')) ||
            (label.startsWith('إعجاب') && !label.includes('إلغاء')) ||
            text === 'Like' || text === 'إعجاب' || text === 'أعجبني'
          );

          if (isLikeButton && !isPressed && btn.offsetHeight > 10 && btn.offsetWidth > 10) {
            const style = window.getComputedStyle(btn);
            const color = style.color || '';
            const isLikedColor = color.includes('rgb(8, 102, 255)') || color.includes('rgb(24, 119, 242)');

            if (!isLikedColor) {
              btn.dataset.xactionsProcessed = 'liked';
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              triggerClick(btn);
              return { success: true, text: text || label };
            }
          }
          
          btn.dataset.xactionsProcessed = 'checked';
        }

        return { success: false };
      }`);

      if (likeResult && likeResult.success) {
        likedCount++;
        consecutiveFails = 0;
        console.log(`[FB Warmup] 👍 Liked post (${likedCount}/${targetLikes})`);

        if (likedCount >= targetLikes) {
          break;
        }

        const waitTime = Math.floor(minWait + Math.random() * (maxWait - minWait + 1));
        console.log(`[FB Warmup] ⏳ Waiting ${waitTime}s before next interaction...`);
        await sleep(waitTime * 1000);
      } else {
        consecutiveFails++;
        if (consecutiveFails > 8) {
          console.log('[FB Warmup] No more visible like buttons found after multiple scrolls.');
          break;
        }
      }

      const scrollDistance = Math.floor(400 + Math.random() * 350);
      await c.evaluate(`(dist) => window.scrollBy({ top: dist, behavior: 'smooth' })`, scrollDistance);
      await sleep(2000 + Math.random() * 1500);
    }

    console.log(`[FB Warmup] ✅ Completed session: ${likedCount} posts liked (target was ${targetLikes}).`);

    return {
      success: true,
      targetLikes,
      likedCount,
      message: `تم تنشيط الحساب بنجاح: تم التفاعل والإعجاب بـ ${likedCount} منشور (الهدف العشوائي المحسوب للحساب: ${targetLikes} إعجاب).`
    };
  } catch (error) {
    console.error('[FB Warmup Error]', error.message);
    throw error;
  } finally {
    if (!keepBrowserOpen) {
      console.log(`[FB Warmup] Closing browser session for account ${accountId || 'default'}...`);
      await closeBrowser(accountId, cookie).catch((err) => {
        console.warn('[FB Warmup] Error closing browser in finally block:', err.message);
      });
    }
  }
}

export const fbToolMap = {
  fb_login,
  fb_get_profile,
  fb_get_group_posts,
  fb_post_timeline,
  fb_reply_comment,
  fb_warmup_accounts,
};



