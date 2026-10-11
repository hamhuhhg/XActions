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
  if (typeof sessionIdOrOptions === 'string') {
    sid = sessionIdOrOptions;
  } else if (sessionIdOrOptions && typeof sessionIdOrOptions === 'object') {
    sid = resolveSessionId(sessionIdOrOptions.accountId, sessionIdOrOptions.cookie);
  }

  if (!activeClients.has(sid)) {
    console.log(`[FB Browser] Starting TurnstileClient session: ${sid}`);
    const c = new TurnstileClient(sid);
    await c.createSession();
    activeClients.set(sid, c);
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
    await sleep(2500);

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

        return 'UNKNOWN:' + window.location.href + '|' + (document.body.innerText || '').substring(0, 200);
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

export async function fb_post_timeline({ text, imagePath, mediaPath, cookie, accountId }) {
  const c = await getClient({ accountId, cookie });
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

    const currentUrl = await c.evaluate(`() => window.location.href`);
    if (!currentUrl || !currentUrl.includes('facebook.com')) {
      await c.goto('https://www.facebook.com/');
    }
    await sleep(4000);

    console.log('[FB Post] Opening post composer...');

    const clickSuccess = await c.evaluate(`() => {
      if (document.querySelector('input[type="password"], input[name="email"]')) return 'LOGIN_SCREEN';

      const triggerClick = (el) => {
        if (!el) return false;
        ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
          const event = new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 });
          el.dispatchEvent(event);
        });
        try { el.click(); } catch(e) {}
        return true;
      };

      // 1. Search by matching elements from deepest leaf elements backwards
      const allElements = Array.from(document.querySelectorAll('div[role="button"], span, div, p'));
      const matches = allElements.filter(el => {
        const t = (el.innerText || el.textContent || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        return (t.includes('تفكر') || t.includes('mind') || aria.includes('تفكر') || aria.includes('mind')) && el.offsetHeight > 0;
      });

      for (let i = matches.length - 1; i >= 0; i--) {
        const el = matches[i];
        const target = el.closest('div[role="button"]') || el;
        if (triggerClick(target)) {
          return true;
        }
      }

      // 2. Direct selectors fallback
      const composerSelectors = [
        'div[data-pagelet="ProfileComposer"] div[role="button"]',
        'div[data-pagelet="FeedUnit_0"] div[role="button"]',
        'div[role="main"] div[role="button"]',
        'div[role="feed"] div[role="button"]'
      ];

      for (const selector of composerSelectors) {
        try {
          const els = Array.from(document.querySelectorAll(selector));
          for (const el of els) {
            if (el.offsetHeight > 0) {
              if (triggerClick(el)) return true;
            }
          }
        } catch(e) {}
      }

      return false;
    }`);

    if (clickSuccess === 'LOGIN_SCREEN') throw new Error('يرجى تسجيل الدخول أولاً بحساب فيسبوك.');

    await sleep(2500);

    // Wait for the text editor
    console.log('[FB Post] Waiting for editor to become ready...');
    let editorReady = null;
    const postTextJson = JSON.stringify(text);

    for (let i = 0; i < 10; i++) {
      editorReady = await c.evaluate(`() => {
        const dialog = document.querySelector('div[role="dialog"]') || document.body;
        const editor = dialog.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"], div[aria-label*="mind" i], div[aria-label*="تفكر" i]');

        if (editor && (editor.offsetHeight > 0 || editor.offsetWidth > 0 || editor.getBoundingClientRect().height > 0)) {
          editor.focus();
          try { editor.click(); } catch(e) {}

          const postText = ${postTextJson};

          // Safely set text inside the text editor without deleting outer dialog/media containers
          try {
            const range = document.createRange();
            range.selectNodeContents(editor);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('insertText', false, postText);
          } catch(e) {
            try {
              document.execCommand('insertText', false, postText);
            } catch(e2) {
              editor.innerText = postText;
            }
          }

          ['beforeinput', 'input', 'change'].forEach(name => {
            editor.dispatchEvent(new Event(name, { bubbles: true }));
          });

          const currentContent = (editor.innerText || editor.textContent || '').trim();
          const hasText = currentContent.includes(postText);

          return { found: true, hasText };
        }
        return { found: false, hasText: false };
      }`);

      if (editorReady && editorReady.found) {
        if (!editorReady.hasText) {
          console.log('[FB Post] Editor focused, inserting text via CDP fallback...');
          await c.type(text);
        } else {
          console.log('[FB Post] Text inserted successfully via editor.');
        }
        await sleep(1500);
        break;
      }
      await sleep(1500);
    }

    if (!editorReady || !editorReady.found) {
      throw new Error('لم يتم العثور على مربع إدخال النص في نافذة المنشور.');
    }

    // Attach image if provided
    if (localFilePath && fs.existsSync(localFilePath)) {
      console.log(`[FB Post] Attaching image file: ${localFilePath}`);
      try {
        // Step A: Ensure photo upload area/input is active in dialog
        await c.evaluate(`() => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return false;
          
          let fileInput = dialog.querySelector('input[type="file"]');
          if (!fileInput) {
            const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
            const photoBtn = buttons.find(b => {
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              const txt = (b.innerText || b.textContent || '').toLowerCase();
              const isForbidden = aria.includes('remove') || aria.includes('إزالة') || aria.includes('delete') || aria.includes('حذف') || aria.includes('close') || aria.includes('إغلاق');
              if (isForbidden) return false;
              return (
                aria === 'photo/video' || aria === 'صورة/فيديو' ||
                aria.includes('photo/video') || aria.includes('صورة/فيديو') ||
                aria.includes('photo') || aria.includes('صورة') ||
                txt.includes('photo/video') || txt.includes('صورة/فيديو') ||
                txt.includes('photo') || txt.includes('صورة')
              );
            });
            if (photoBtn) {
              try { photoBtn.click(); return true; } catch(e) {}
            }
          }
          return false;
        }`);
        await sleep(2000);

        // Wait up to 5s for input[type="file"] to appear in dialog
        for (let w = 0; w < 10; w++) {
          const hasInput = await c.evaluate(`() => !!(document.querySelector('div[role="dialog"] input[type="file"]') || document.querySelector('input[type="file"]'))`);
          if (hasInput) break;
          await sleep(500);
        }

        // Step B: Send file via CDP targeting strictly the dialog's input[type="file"]
        const sent = await c.sendFile('div[role="dialog"] input[type="file"]', localFilePath);
        console.log(`[FB Post] File send result: ${sent}`);
        await sleep(1000);

        // Dispatch change event to notify React/Facebook handlers
        await c.evaluate(`() => {
          const dialog = document.querySelector('div[role="dialog"]');
          const inputs = dialog ? Array.from(dialog.querySelectorAll('input[type="file"]')) : Array.from(document.querySelectorAll('input[type="file"]'));
          inputs.forEach(input => {
            try {
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } catch(e) {}
          });
        }`);

        // Step C: Wait for the image upload to complete and preview to mount
        console.log('[FB Post] Waiting for image upload to complete and preview to mount...');
        let uploadFinished = false;
        for (let u = 0; u < 25; u++) {
          const status = await c.evaluate(`() => {
            const dialog = document.querySelector('div[role="dialog"]');
            if (!dialog) return { ready: false };

            // Check for image preview in dialog
            const imgs = Array.from(dialog.querySelectorAll('img')).filter(img => {
              const src = img.src || '';
              return (src.startsWith('blob:') || src.startsWith('data:') || src.includes('scontent') || src.includes('fbcdn'))
                && !src.includes('/emoji/') && !src.includes('/rsrc.php/') && img.offsetHeight > 40;
            });
            const hasImage = imgs.length > 0;

            // Check for upload progress bar
            const progressBar = dialog.querySelector('[role="progressbar"], div[data-visualcompletion="loading-state"]');
            const isUploading = !!progressBar;

            // Check if post button is ready
            const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
            const postBtn = buttons.find(b => {
              const label = (b.getAttribute('aria-label') || '').trim().toLowerCase();
              const text = (b.innerText || b.textContent || '').trim().toLowerCase();
              return (label === 'post' || label === 'نشر' || text === 'post' || text === 'نشر');
            });
            const canPost = postBtn && postBtn.getAttribute('aria-disabled') !== 'true';

            return { hasImage, isUploading, canPost, ready: hasImage && !isUploading && canPost };
          }`);

          if (status && (status.ready || (status.hasImage && status.canPost))) {
            console.log('[FB Post] ✅ Image uploaded and ready in composer!');
            uploadFinished = true;
            break;
          }

          await sleep(1500);
        }
      } catch (attachErr) {
        console.error('[FB Post] Error attaching image:', attachErr.message);
      }
    }

    // Step D: Verify text is present in the editor
    await c.evaluate(`() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return;
      const editor = dialog.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
      if (editor) {
        const postText = ${postTextJson};
        const current = (editor.innerText || editor.textContent || '').trim();
        if (!current.includes(postText)) {
          try {
            editor.focus();
            document.execCommand('insertText', false, postText);
          } catch(e) {}
        }
      }
    }`);

    await sleep(2000);

    // Step E: Click submit/post button and wait for confirmation
    console.log('[FB Post] Submitting post...');
    let submitted = false;

    for (let s = 0; s < 10; s++) {
      submitted = await c.evaluate(`() => {
        const dialog = document.querySelector('div[role="dialog"]');
        if (!dialog) return true; // Dialog closed means posted!

        const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button'));
        
        // 1. Check by aria-label / text (نشر / Post)
        for (const btn of buttons) {
          const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
          const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
          if (label === 'post' || label === 'نشر' || text === 'post' || text === 'نشر') {
            if (btn.getAttribute('aria-disabled') !== 'true') {
              btn.click();
              return true;
            }
          }
        }

        // 2. Check by blue style button
        const blueBtn = buttons.find(b => {
          const style = window.getComputedStyle(b);
          const bg = style.backgroundColor;
          const isBlue = bg.includes('rgb(8, 102, 255)') || bg.includes('rgb(24, 119, 242)') || bg.includes('rgb(0, 100, 209)');
          return isBlue && b.offsetHeight > 20 && style.pointerEvents !== 'none' && b.getAttribute('aria-disabled') !== 'true';
        });

        if (blueBtn) {
          blueBtn.click();
          return true;
        }

        return false;
      }`);

      if (submitted) {
        await sleep(2500);
        const stillOpen = await c.evaluate(`() => !!document.querySelector('div[role="dialog"]')`);
        if (!stillOpen) {
          console.log('[FB Post] Post submitted and dialog closed successfully.');
          break;
        }
      }

      await sleep(2000);
    }

    await sleep(3000);

    console.log('[FB Post] Process complete.');
    return { success: true, message: 'تم نشر المنشور على يوميات فيسبوك بنجاح.' };
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



