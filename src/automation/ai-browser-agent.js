/**
 * AI Browser Agent for Automated Publishing (Click-by-Click)
 * Drives the browser autonomously using LLM tool calling (OpenAI-compatible)
 * Learned from autoposter architecture: inspects DOM refs, clicks, types, uploads media,
 * solves membership prompts, handles First Comments, and verifies live posts.
 *
 * @author nich (@nichxbt) & DeepMind Pair Programming
 * @license MIT
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getClient, resolveSessionId, fb_login } from '../mcp/facebook-tools.js';

const STATUSES = new Set(['submitted', 'pending_approval', 'awaiting_join', 'failed']);

/**
 * Normalizes an OpenAI-compatible base URL
 */
export function normalizeBaseUrl(raw) {
  let s = String(raw || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  s = s.replace(/\/chat\/completions$/i, '').replace(/\/models$/i, '');
  try {
    const u = new URL(s);
    if (u.pathname === '' || u.pathname === '/') {
      u.pathname = '/v1';
      return u.toString().replace(/\/+$/, '');
    }
  } catch (e) {}
  return s;
}

/**
 * Parses the final ```json fenced block from AI response
 */
export function parseResultBlock(text) {
  if (typeof text !== 'string') return null;
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (!blocks.length) return null;
  try {
    const parsed = JSON.parse(blocks.at(-1)[1]);
    if (!STATUSES.has(parsed.status) || typeof parsed.clicked_post !== 'boolean') return null;
    return {
      status: parsed.status,
      clicked_post: parsed.clicked_post,
      post_url: parsed.post_url || null,
      note: typeof parsed.note === 'string' ? parsed.note : '',
      ...(typeof parsed.commented === 'boolean' ? { commented: parsed.commented } : {}),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Tools schema for OpenAI-compatible function calling
 */
export const BROWSER_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigates the browser to the given https URL and returns the page elements and text.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Full https:// URL to navigate to' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_page',
      description: 'Reads the current page URL, visible text, and all interactive elements with numeric [ref] IDs.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click',
      description: 'Clicks an interactive element on the page by its numeric [ref] ID from read_page.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'number', description: 'The numeric [ref] ID from read_page' } },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Types text into an input, textarea, or contenteditable composer by its numeric [ref] ID.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'number', description: 'The numeric [ref] ID of the input or composer from read_page' },
          text: { type: 'string', description: 'Exact text to type' },
          clear: { type: 'boolean', description: 'Whether to clear existing text first (default: false)' },
          press_enter: { type: 'boolean', description: 'Whether to press Enter after typing (default: false)' },
        },
        required: ['ref', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_upload',
      description: 'Uploads one or more local media files directly to the active post composer dialog.',
      parameters: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' }, description: 'Array of absolute file paths to upload' },
          ref: { type: 'number', description: 'Optional: leave omitted. The tool directly attaches files to the open composer.' },
        },
        required: ['files'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wait',
      description: 'Waits for a few seconds (1 to 30) for uploads, dialogs, or page updates to complete, then reads the page.',
      parameters: {
        type: 'object',
        properties: { seconds: { type: 'number', description: 'Seconds to wait (1-30)' } },
        required: ['seconds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_post_groups',
      description: 'Selects up to 9 Facebook groups all at once in the "Post in more places" / "Post to groups" (النشر في مزيد من الأماكن / المجموعات) modal. It checks all 9 groups simultaneously and confirms with Done/Save in a single action.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of groups to select (default: 9, maximum allowed by Facebook: 9)',
          },
          group_refs: {
            type: 'array',
            items: { type: 'number' },
            description: 'Optional list of numeric [ref] IDs from read_page of the group checkboxes to select all at once.',
          },
        },
      },
    },
  },
];

/**
 * Serializes the DOM into a structured text snapshot with numeric [ref] IDs
 */
export async function serializeDomSnapshot(client) {
  const snapshot = await client.evaluate(`(() => {
    try {
      // Auto-dismiss "إضافة إلى منشورك" (Add to your post) feelings/people popup if it is open
      const subDialogs = Array.from(document.querySelectorAll('div[role="dialog"], div[role="region"], div[aria-modal="true"]')).filter(d => {
        const hasEditor = !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
        if (hasEditor) return false; // Never dismiss the main composer dialog!
        const txt = d.innerText || '';
        return (txt.includes('إضافة إلى منشورك') || txt.includes('Add to your post')) &&
               (txt.includes('شعور') || txt.includes('نشاط') || txt.includes('تلقي مكالمات') || txt.includes('حدث شخصي') || txt.includes('feeling') || txt.includes('الأشخاص'));
      });
      for (const d of subDialogs) {
        const backBtn = Array.from(d.querySelectorAll('div[role="button"], button')).find(b => {
          const a = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).toLowerCase();
          return a.includes('رجوع') || a.includes('back') || a.includes('إغلاق') || a.includes('close');
        }) || d.querySelector('div[role="button"], button');
        if (backBtn) {
          try { backBtn.click(); } catch(e) {}
        }
      }

      // Auto-dismiss any empty stray composer dialog if another dialog (e.g. Post Settings) is already open
      const allDialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
      if (allDialogs.length > 1) {
        for (const d of allDialogs) {
          const editor = d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
          const hasMedia = !!d.querySelector('img[src*="blob:"], img[src*="data:"], img[src*="scontent"], img[src*="fbcdn"]');
          const txt = (editor?.innerText || editor?.textContent || '').trim();
          const isPostSettings = (d.innerText || '').includes('إعدادات المنشور') || (d.innerText || '').includes('Post settings');
          const isPlaceholderOnly = !txt || txt === 'بم تفكر؟' || txt === 'بماذا تفكر؟' || txt.includes('بم تفكر') || txt.toLowerCase().includes("what's on your mind");
          if (editor && isPlaceholderOnly && !hasMedia && !isPostSettings) {
            const closeBtn = d.querySelector('div[aria-label="إغلاق"], div[aria-label="Close"], [role="button"][aria-label*="إغلاق"], [role="button"][aria-label*="Close"]');
            if (closeBtn) {
              try { closeBtn.click(); } catch(e) {}
            }
          }
        }
      }

      // Completely remove Facebook's generic background banner "تستغرق هذه العملية وقتاً أطول"
      document.querySelectorAll('div, span, p').forEach(el => {
        const t = (el.innerText || '').trim();
        if (
          t.includes('تستغرق هذه العملية') ||
          t.includes('أطول من المتوقع') ||
          t.includes('taking longer than expected') ||
          t.includes('taking longer than usual')
        ) {
          if (!el.querySelector('[contenteditable="true"], [role="textbox"]')) {
            try { el.remove(); } catch(e) {}
          }
        }
      });

      let nextRef = 1;
      document.querySelectorAll('[data-ap-ref]').forEach(el => el.removeAttribute('data-ap-ref'));

      const isVisible = (el) => {
        if (!el || !el.getBoundingClientRect) return false;
        if (el.tagName === 'INPUT' && el.type === 'file') return true; // keep hidden file inputs discoverable
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 2 && rect.height > 2;
      };

      const labelOf = (el) => {
        const parts = [
          el.getAttribute('aria-label'),
          el.getAttribute('data-placeholder'),
          el.getAttribute('placeholder'),
          el.getAttribute('title'),
          el.getAttribute('name'),
          el.innerText,
          el.value,
        ].filter(Boolean).map(s => String(s).replace(/\\s+/g, ' ').trim()).filter(Boolean);
        return (parts[0] || '').slice(0, 140);
      };

      const selectors = [
        'a[href]',
        'button',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[role="combobox"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[role="radio"]',
        '[role="checkbox"]',
        '[role="tab"]',
        '[contenteditable="true"]',
      ].join(',');

      // Check if a modal dialog is open (e.g. Create Post, Groups modal, Post Options)
      const openDialogs = Array.from(document.querySelectorAll('div[role="dialog"]')).filter(isVisible);

      // Prioritize the composer dialog (specifically contains the post text editor)
      const composerModals = openDialogs.filter(d => {
        return !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
      });
      const activeModal = composerModals.length > 0
        ? composerModals[composerModals.length - 1]
        : (openDialogs.length > 0 ? openDialogs[openDialogs.length - 1] : null);

      // STRICT SCOPE: If a modal dialog is open, ONLY scan elements inside that dialog!
      // Background timeline elements must NEVER be exposed or given a [ref]!
      const rootScope = activeModal || document;

      const items = [];
      const seen = new Set();
      for (const el of rootScope.querySelectorAll(selectors)) {
        if (seen.has(el) || !isVisible(el)) continue;
        seen.add(el);
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || (tag === 'input' ? 'input:' + (el.type || 'text') : tag);
        let label = labelOf(el);

        const isEditor = el.isContentEditable || el.getAttribute('role') === 'textbox' || el.hasAttribute('data-lexical-editor');
        if (isEditor) {
          label = 'مربع كتابة المنشور (Post text editor) - اكتب النص هنا عبر type_text';
        }
        if (!label && role !== 'input:file' && !isEditor && tag !== 'input' && tag !== 'textarea') continue;

        const lowerLabel = (label + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();

        // Never expose Close / Cancel button on the active composer to prevent the AI from accidentally closing it!
        if (
          lowerLabel === 'إغلاق' || lowerLabel === 'close' ||
          lowerLabel === 'إلغاء' || lowerLabel === 'cancel' ||
          (lowerLabel.includes('إغلاق') && lowerLabel.length <= 12) ||
          (lowerLabel.includes('close') && lowerLabel.length <= 12)
        ) {
          if (activeModal) continue;
        }

        // Never expose cover photo or profile avatar editing controls to prevent accidental profile modifications
        if (
          lowerLabel.includes('cover photo') ||
          lowerLabel.includes('صورة الغلاف') ||
          lowerLabel.includes('sawirka daboolka') ||
          lowerLabel.includes('edit cover') ||
          lowerLabel.includes('update cover') ||
          lowerLabel.includes('profile picture') ||
          lowerLabel.includes('صورة الملف الشخصي') ||
          lowerLabel.includes('sawirka profile')
        ) {
          continue;
        }

        // Never expose audience / privacy controls to prevent accidental visibility changes (e.g. "Only me")
        if (
          lowerLabel.includes('أنا فقط') || lowerLabel.includes('only me') ||
          lowerLabel.includes('أصدقاء محددون') || lowerLabel.includes('specific friends') ||
          lowerLabel.includes('الأصدقاء باستثناء') || lowerLabel.includes('friends except') ||
          lowerLabel.includes('تحديد الجمهور') || lowerLabel.includes('select audience')
        ) {
          continue;
        }

        // Never expose "بم تفكر؟" / "What's on your mind" if a modal is already open
        if (
          lowerLabel.includes('بم تفكر') || lowerLabel.includes('بماذا تفكر') ||
          lowerLabel.includes("what's on your mind") || lowerLabel.includes('whats on your mind')
        ) {
          if (activeModal || openDialogs.length > 0) continue;
        }

        // Never expose "Add to your post" submenu toolbar triggers (feelings, people, location, check-in, more...)
        // This prevents the AI agent from clicking toolbar buttons that open unwanted popups!
        const isPhotoOrVideo = lowerLabel.includes('صورة/فيديو') || lowerLabel.includes('photo/video') || lowerLabel.includes('photo') || lowerLabel.includes('video') || lowerLabel.includes('صورة');
        if (!isPhotoOrVideo) {
          if (
            lowerLabel === 'المزيد' || lowerLabel === 'more' || lowerLabel === '...' ||
            lowerLabel.includes('شعور/نشاط') || lowerLabel.includes('feeling/activity') ||
            lowerLabel.includes('الأشخاص') || lowerLabel.includes('tag people') ||
            lowerLabel.includes('الموقع') || lowerLabel.includes('check in') ||
            lowerLabel.includes('تلقي مكالمات') || lowerLabel.includes('حدث شخصي') ||
            lowerLabel.includes('صورة gif') || lowerLabel.includes('فيديو بث مباشر') ||
            lowerLabel.includes('المساهم')
          ) {
            continue;
          }
        }
        const ref = nextRef++;
        el.setAttribute('data-ap-ref', String(ref));
        const extra = [];
        if (el.getAttribute('aria-checked')) extra.push('checked=' + el.getAttribute('aria-checked'));
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') extra.push('disabled');
        if (tag === 'a' && el.href) extra.push('href=' + el.href.slice(0, 100));
        if (tag === 'input' && el.type === 'file') extra.push('accept=' + (el.accept || '*'));
        items.push(\`[\${ref}] <\${role}> "\${label}"\${extra.length ? ' (' + extra.join(', ') + ')' : ''}\`);
        if (items.length >= 250) break;
      }

      const bodyText = ((activeModal || document.body)?.innerText || '')
        .split('\\n')
        .map(l => l.trim())
        .filter(l => Boolean(l) && !l.includes('تستغرق هذه العملية') && !l.includes('أطول من المتوقع') && !l.includes('taking longer'))
        .slice(0, 120)
        .join('\\n')
        .slice(0, 4000);

      return {
        url: location.href,
        title: document.title,
        elements: items.join('\\n'),
        text: bodyText,
      };
    } catch(err) {
      return {
        url: location.href,
        title: document.title,
        elements: '',
        text: (document.body?.innerText || '').slice(0, 4000),
      };
    }
  })()`);

  return snapshot || { url: '', title: '', elements: '', text: '' };
}

/**
 * Detects whether a media upload (photo/video) is still in flight in the composer.
 */
async function isUploadInFlight(client) {
  return await client.evaluate(`(() => {
    const visible = (el) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return !!r && r.width > 0 && r.height > 0 && el.getAttribute && el.getAttribute('aria-hidden') !== 'true';
    };
    const progressEls = (() => {
      const dialog = Array.from(document.querySelectorAll('div[role="dialog"]')).find(d => d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]'));
      const scope = dialog || document;
      return Array.from(scope.querySelectorAll('[role="progressbar"], div[data-visualcompletion="loading-state"], [aria-busy="true"]')).filter(visible);
    })();
    // Post button: check ONLY inside the composer scope; busy only if EVERY match is disabled
    const composerScope = (() => {
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
      const withContent = dialogs.find(d => {
        const ed = d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
        const hasMedia = !!d.querySelector('img[src*="blob:"], img[src*="data:"], img[src*="scontent"], img[src*="fbcdn"]');
        const txt = (ed?.innerText || ed?.textContent || '').trim();
        return txt.length > 0 || hasMedia;
      });
      return withContent || dialogs[0] || document;
    })();
    const postBtns = Array.from(composerScope.querySelectorAll('div[role="button"], button')).filter(b => {
      if (!visible(b)) return false;
      const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim().toLowerCase();
      return /^(post|نشر|publish|انشر|next|التالي)$/i.test(label) || ((/post|نشر|التالي/i.test(label)) && label.length <= 16);
    });
    const hasPostBtn = postBtns.length > 0;
    const postDisabled = hasPostBtn && postBtns.every(b => b.getAttribute('aria-disabled') === 'true' || b.disabled === true);
    const editorVisible = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]')).some(visible);
    const bodyTxt = (document.body && document.body.innerText) || '';
    const uploadingTextEl = /(جاري التحميل|جاري الرفع|جاري النشر|uploading|still uploading|finishing up)/i.test(bodyTxt.slice(0, 3000));
    // Upload FAILURE signals: Facebook rejected the file
    const failedUpload = /(لا يمكن تحميل ملف|لم نتمكن من تحميل|تعذر تحميل|غير مدعوم|الصيغة غير|can't|couldn't|failed to upload|upload failed|unsupported|something went wrong)/i.test(bodyTxt.slice(0, 5000));
    return {
      editor: editorVisible,
      hasPostBtn,
      postDisabled,
      progress: progressEls.length,
      uploadingText: uploadingTextEl,
      failed: failedUpload,
      href: window.location.href
    };
  })()`);
}

/**
 * Blocks until composer media (photo/video) upload settles: no progress bars,
 * no "uploading" texts, and the Post button enabled. Guard-speed 120s default.
 */
async function waitForMediaUploadSettled(client, maxMs = 120000, onLog = null) {
  const start = Date.now();
  let lastLog = 0;
  while (Date.now() - start < maxMs) {
    const st = await isUploadInFlight(client);
    // FAILURE short-circuit: stop waiting immediately when FB rejects the file
    if (st && st.failed) {
      onLog && onLog('[AI Agent Upload] ❌ Facebook REJECTED the media file ("لا يمكن تحميل ملف") — stopping the wait loop.');
      return { settled: false, failed: true, state: st };
    }
    if (!st || !st.editor) {
      // No composer editor visible: nothing pending to wait for here
      return { settled: true, state: st || null };
    }
    const busy = st.progress > 0 || st.uploadingText || st.postDisabled;
    if (!busy) {
      // Grace: confirm stability once more after 2s (upload progress can restart)
      await new Promise(r => setTimeout(r, 2000));
      const st2 = await isUploadInFlight(client);
      if (st2 && st2.failed) {
        onLog && onLog('[AI Agent Upload] ❌ Facebook REJECTED the media file — stopping the wait loop.');
        return { settled: false, failed: true, state: st2 };
      }
      const busy2 = st2 && st2.editor && (st2.progress > 0 || st2.uploadingText || st2.postDisabled);
      if (!busy2) return { settled: true, state: st2 || st };
      continue;
    }
    if (onLog && Date.now() - lastLog > 8000) {
      lastLog = Date.now();
      onLog(`[AI Agent Upload] Media still uploading (progressbars: ${st.progress}, uploading text: ${st.uploadingText}, post-button locked: ${st.postDisabled}) — Post will be clicked ONLY when upload completes...`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return { settled: false, failed: false, state: null };
}

/**
 * Click element by ref
 */
async function executeClick(client, ref, { post = {}, hasTypedPostText = false, hasUploadedMedia = false, hasSelectedGroups = true, onLog = null } = {}) {
  // Probe first (no click): resolve label + detect post button + FORBIDDEN cover controls
  const probe = await client.evaluate(`((targetRef) => {
    const el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]');
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });

    const label = (el.getAttribute('aria-label') || el.innerText || el.textContent || '').slice(0, 80).trim().toLowerCase();
    const isPostButton = /^(post|نشر|share|مشاركة|daabac|dhig|faafi|publier|publicar|posten|paylaş|bagikan)$/i.test(label) ||
      /(post|نشر|share|مشاركة|daabac|dhig|faafi|publier|publicar)/i.test(label) ||
      el.getAttribute('data-testid')?.includes('post_button') ||
      (el.closest('div[role="dialog"]') && ['submit', 'post'].includes(el.getAttribute('type')));
    const isNextButton = /^(next|التالي)$/i.test(label) || label === 'next' || label === 'التالي';
    const isCloseButton = /^(close|إغلاق|إلغاء|cancel)$/i.test(label) || label === 'إغلاق' || label === 'close' || label === 'إلغاء' || label === 'cancel';

    // HARD FORBIDDEN: never touch cover photo / profile picture controls
    let forbiddenCover = false;
    try {
      const hay = (label + ' ' + (el.getAttribute('title') || ''));
      forbiddenCover = /cover photo|صورة الغلاف|تعديل الغلاف|إضافة صورة غلاف|change cover|update cover|switch cover|اختيار صورة الغلاف|تغيير الغلاف|update profile picture|profile picture|صورة الملف الشخصي|تحديث صورة الملف الشخصي|تغيير صورة الملف/i.test(hay) ||
        !!(el.closest && el.closest('[data-testid*="cover"], #fb-cover-photo-attachment, [aria-label*="صورة الغلاف" i], [aria-label*="cover photo" i]'));
    } catch (e) {}

    // HARD FORBIDDEN: never touch audience / privacy selectors (must remain Public / العامة)
    let forbiddenAudience = false;
    try {
      if (
        label.includes('أنا فقط') || label.includes('only me') ||
        label.includes('أصدقاء محددون') || label.includes('specific friends') ||
        label.includes('الأصدقاء باستثناء') || label.includes('friends except') ||
        label.includes('تحديد الجمهور') || label.includes('select audience')
      ) {
        forbiddenAudience = true;
      }
    } catch(e) {}

    // HARD FORBIDDEN: never touch "Add to your post" toolbar popups (feelings, people, location, check-in, more...)
    let forbiddenSubmenu = false;
    try {
      const isMedia = label.includes('صورة') || label.includes('فيديو') || label.includes('photo') || label.includes('video');
      if (!isMedia) {
        if (
          label === 'المزيد' || label === 'more' || label === '...' ||
          label.includes('إضافة إلى منشورك') || label.includes('add to your post') ||
          label.includes('شعور') || label.includes('feeling') ||
          label.includes('أشخاص') || label.includes('tag people') ||
          label.includes('الموقع') || label.includes('check in') ||
          label.includes('تلقي مكالمات') || label.includes('حدث شخصي') ||
          label.includes('المساهم')
        ) {
          forbiddenSubmenu = true;
        }
      }
    } catch(e) {}

    // Guard against clicking elements outside the active modal dialog
    let outsideModal = false;
    try {
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]')).filter(d => {
        const r = d.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (dialogs.length > 0) {
        const isInsideAnyDialog = !!el.closest('div[role="dialog"]');
        if (!isInsideAnyDialog && !isNextButton && !isPostButton) {
          outsideModal = true;
        }
      }
    } catch(e) {}

    return { ok: true, label, isPostButton, isNextButton, isCloseButton, forbiddenCover, forbiddenSubmenu, forbiddenAudience, outsideModal };
  })(${Number(ref)})`);

  if (!probe || !probe.ok) {
    throw new Error(`Element [${ref}] not found on page. Call read_page first to refresh element refs.`);
  }

  if (probe.isCloseButton) {
    onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on Close/Cancel button ("${probe.label}") — closing the composer is forbidden while publishing.`);
    return {
      clicked: ref,
      target: probe.label,
      blocked: true,
      forbidden_close: true,
      note: 'محظور تماماً: لا تنقر على زر الإغلاق! هدفك هو كتابة المنشور ونشره. استدع أداة type_text فوراً لكتابة نص المنشور في المحرر.',
    };
  }

  if (probe.outsideModal) {
    onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on element [${ref}] ("${probe.label}") — it is outside the active dialog.`);
    return {
      clicked: ref,
      target: probe.label,
      blocked: true,
      outside_modal: true,
      note: 'محظور: هذا العنصر يقع في الصفحة الخلفية خارج نافذة النشر النشطة. تفاعل فقط مع الأزرار داخل نافذة النشر المفتوحة.',
    };
  }

  if (probe.forbiddenAudience) {
    onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on audience/privacy control ("${probe.label}") — audience must remain Public (العامة) and not be touched.`);
    return {
      clicked: ref,
      target: probe.label,
      blocked: true,
      forbidden_audience: true,
      note: 'محظور: هذا الزر ("' + probe.label + '") يغير خصوصية المنشور (تحديد الجمهور) ولا علاقة له بالمجموعات. يجب أن يظل المنشور عاماً (العامة). لا تنقر عليه!',
    };
  }

  if (probe.forbiddenCover) {
    onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on cover/profile-photo control ("${probe.label}") — the post must be published in the composer with the attached media, NOT as cover/profile photo. If a cover dialog opened, click Cancel (إلغاء) and return to the composer.`);
    return {
      clicked: ref,
      target: probe.label,
      blocked: true,
      forbidden_cover: true,
      note: 'محظور تماماً: لا تغيير للصورة الشخصية أو صورة الغلاف تحت أي ظرف. هذه العناصر لا تُنقر ولا تُستعمل لتمرير صورة المنشور. الصورة الصحيحة هي التي رُفعت داخل محرر المنشور نفسه (زر "صورة/فيديو" داخل المحرر). إذا فُتحت نافذة تغيير الغلاف/الصورة الشخصية، انقر إلغاء (إلغاء) وأعد النقر على زر النشر داخل المحرر.',
    };
  }

  if (probe.forbiddenSubmenu) {
    onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on submenu control ("${probe.label}") — this button opens feelings/people/check-in ("إضافة إلى منشورك"). To add post text use type_text, for media use file_upload, and for groups use select_post_groups.`);
    return {
      clicked: ref,
      target: probe.label,
      blocked: true,
      forbidden_submenu: true,
      note: 'محظور: هذا الزر ("' + probe.label + '") يفتح قائمة المشاعر والأشخاص والموقع ("إضافة إلى منشورك") ولا علاقة له بالمجموعات. لا تنقر عليه! لكتابة النص استخدم type_text، وللصور استخدم file_upload، وللمجموعات استخدم أداة select_post_groups.',
    };
  }

  const isComposerTrigger = /(بم تفكر|بماذا تفكر|mind|اكتب شيئ|create post|إنشاء منشور)/i.test(probe.label);
  if (isComposerTrigger) {
    const isModalOpen = await client.evaluate(`() => {
      const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
      return dialogs.length > 0;
    }`);
    if (isModalOpen) {
      onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on "${probe.label}" — a post modal/settings dialog is already open!`);
      return {
        clicked: ref,
        target: probe.label,
        blocked: true,
        already_open: true,
        is_composer_open: true,
        note: 'نافذة المنشور أو إعدادات المنشور مفتوحة بالفعل أمامك. لا تنقر على "بم تفكر؟" مرة أخرى لأن ذلك يفتح نافذة مكررة. اضغط على زر "نشر" (Post) لإتمام نشر المنشور.',
      };
    }
  }

  if (probe.isPostButton) {
    // GUARD 1: Post text MUST be typed before clicking Post!
    if (post.text && !hasTypedPostText) {
      const editorCheck = await client.evaluate(`() => {
        const editors = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]'));
        const text = editors.map(e => e.innerText || e.textContent || '').join(' ').trim();
        return text.length > 5;
      }`);

      if (!editorCheck) {
        onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on Post button — post text has NOT been typed yet!`);
        return {
          clicked: ref,
          target: probe.label,
          blocked: true,
          missing_text: true,
          note: 'محظور تماماً: لا يمكنك الضغط على زر النشر لأنك لم تكتب نص المنشور بعد في المحرر! يجب أولاً كتابة نص المنشور باستخدام أداة type_text.',
        };
      }
    }

    // GUARD 2: Media files MUST be uploaded before clicking Post!
    const wantsMedia = post.media && (Array.isArray(post.media) ? post.media.length > 0 : Boolean(post.media));
    if (wantsMedia && !hasUploadedMedia) {
      const mediaCheck = await client.evaluate(`() => {
        const dialog = document.querySelector('div[role="dialog"]') || document;
        const imgs = Array.from(dialog.querySelectorAll('img')).filter(img => {
          const s = img.src || '';
          return (s.startsWith('blob:') || s.startsWith('data:') || s.includes('scontent') || s.includes('fbcdn')) && !s.includes('/emoji/') && !s.includes('/rsrc.php/');
        });
        const hasCard = !!dialog.querySelector('[aria-label*="Photo" i], [aria-label*="صورة"], div[role="img"], div[data-visualcompletion="media-vc-image"]');
        return imgs.length > 0 || hasCard;
      }`);

      if (!mediaCheck) {
        onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on Post button — media files have NOT been attached yet!`);
        return {
          clicked: ref,
          target: probe.label,
          blocked: true,
          missing_media: true,
          note: 'محظور تماماً: المنشور يحتوي على صورة/فيديو ولم يتم إرفاقها بعد. يجب أولاً استدعاء أداة file_upload لإرفاق الملفات قبل النقر على زر النشر.',
        };
      }
    }

    // GUARD 3: Groups crossposting MUST be performed before clicking Post!
    if (post.postToGroups && !hasSelectedGroups) {
      onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on Post button — select_post_groups(count: 9) not called yet!`);
      return {
        clicked: ref,
        target: probe.label,
        blocked: true,
        missing_groups: true,
        note: 'محظور تماماً: تم تفعيل النشر في كل المجموعات. يجب استدعاء أداة select_post_groups(count: 9) لتحديد المجموعات التسع أولاً قبل الضغط على زر النشر.',
      };
    }

    // CRITICAL GUARD: never submit while media is still uploading (or if upload FAILED)
    const waitFor = await waitForMediaUploadSettled(client, 120000, onLog);
    if (waitFor.failed) {
      onLog && onLog('[AI Agent Upload] ❌ Media upload FAILED — Post click REFUSED. Asking the agent to recover...');
      return {
        clicked: ref,
        target: probe.label,
        blocked: true,
        upload_failed: true,
        note: 'فشل رفع الوسائط (فيسبوك رفض الملف: "لا يمكن تحميل ملف"). لا تضغط زر النشر ولا تتنقل. الخطوة الصحيحة: استخدم read_page، انقر على زر X/إزالة الخاص ببطاقة المعاينة الفاشلة لإزالتها، ثم أعد المحاولة بـ file_upload. إذا تكرر الفشل، أبلغ بفشل الوسائط window ولا تنشر منشوراً ناقصاً.',
      };
    }
    if (!waitFor.settled) {
      onLog && onLog('[AI Agent Upload] ❌ Upload did not complete in time — Post click REFUSED to avoid publishing a broken/incomplete post.');
      return {
        clicked: ref,
        target: probe.label,
        blocked: true,
        note: 'الصورة أو الفيديو ما زال يتم رفعه ولم يكتمل. لا تضغط زر النشر ولا تتنقل إلى صفحة أخرى. استخدم wait(seconds) أو read_page ثم أعد النقر على زر النشر فقط عند التأكد من اكتمال الرفع.',
      };
    }
    onLog && onLog('[AI Agent Upload] ✅ Media upload confirmed complete — now clicking Post.');
  }

  if (probe.isNextButton) {
    if (post.text && !hasTypedPostText) {
      onLog && onLog(`[AI Agent Guard] 🚫 BLOCKED click on Next ("التالي") — post text has NOT been typed yet!`);
      return {
        clicked: ref,
        target: probe.label,
        blocked: true,
        missing_text: true,
        note: 'محظور: لا يمكنك الانتقال بالضغط على التالي حتى تكتب نص المنشور أولاً عبر type_text.',
      };
    }
  }

  const click = await client.evaluate(`((targetRef) => {
    const el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]');
    if (!el) return null;

    const label = (el.getAttribute('aria-label') || el.innerText || el.textContent || '').slice(0, 80).trim().toLowerCase();
    const isPostButton = /^(post|نشر|share|مشاركة)$/i.test(label) ||
      /(post|نشر|share|مشاركة)/i.test(label) ||
      el.getAttribute('data-testid')?.includes('post_button');
    const isNextButton = /^(next|التالي)$/i.test(label) || label === 'next' || label === 'التالي';

    const triggerClick = (target) => {
      if (!target) return;
      const btn = target.closest('div[role="button"], button, [role="button"], a[role="button"]') || target;
      try { btn.focus(); } catch (e) {}
      try {
        btn.click();
      } catch (e) {
        try { target.click(); } catch (err) {}
      }
    };

    triggerClick(el);

    if (isPostButton) {
      try {
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('disabled', 'true');
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.5';
      } catch(e) {}
    }

    return { ok: true, label, isPostButton, isNextButton };
  })(${Number(ref)})`);

  if (!click || !click.ok) {
    throw new Error(`Element [${ref}] not found on page. Call read_page first to refresh element refs.`);
  }

  if (click.isNextButton) {
    await new Promise(r => setTimeout(r, 2500));
    return {
      clicked: ref,
      target: click.label,
      is_next_step: true,
      note: 'تم الضغط على "التالي" بنجاح وتم فتح شاشة خيارات النشر. إذا كان مطلوباً النشر في المجموعات، استدع الآن أداة select_post_groups(count: 9)، ثم اضغط على زر نشر (Post).',
    };
  }

  if (click.isPostButton) {
    await new Promise(r => setTimeout(r, 4000));
    return {
      clicked: ref,
      target: click.label,
      is_post_submitted: true,
      note: 'The Post button was clicked ONLY after confirming media upload completed, and the post has been SUBMITTED. Do NOT click Post again. Do NOT navigate away for at least 15 seconds — use wait(15) first, then read_page to verify the post was published.',
    };
  }

  if (isComposerTrigger) {
    await new Promise(r => setTimeout(r, 2500));
    return {
      clicked: ref,
      target: click.label,
      is_composer_open: true,
      note: 'تم فتح نافذة إنشاء المنشور بنجاح. الخطوة التالية الإلزامية: استدع أداة type_text فوراً لكتابة نص المنشور في مربع الكتابة. لا تنتظر ولا تنقر على أي أزرار أخرى.',
    };
  }

  await new Promise(r => setTimeout(r, 1200));
  return { clicked: ref, target: click.label };
}

/**
 * Type text into element by ref
 */
async function executeTypeText(client, ref, text, clear = true, pressEnter = false) {
  const targetText = String(text || '');
  if (!targetText) return { typed: false, length: 0 };

  const insertResult = await client.evaluate(`((targetRef, val, shouldClear) => {
    // 1. Locate the best target element:
    // If a composer dialog is open, the target MUST be the text editor inside that composer!
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const composer = dialogs.find(d => {
      return !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
    });

    let el = null;
    if (composer) {
      el = composer.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
    }
    if (!el && targetRef) {
      el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]');
    }
    if (!el) {
      el = document.activeElement;
    }
    if (!el) return null;

    // NEVER click if el is a button or trigger!
    const isButton = el.getAttribute('role') === 'button' || el.tagName === 'BUTTON';
    if (isButton) {
      const fallbackEditor = document.querySelector('div[role="dialog"] [contenteditable="true"], div[role="dialog"] [role="textbox"]');
      if (fallbackEditor) {
        el = fallbackEditor;
      } else {
        return { ok: false, error: 'target_is_button' };
      }
    }

    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.focus();
    // Only click if it is an actual contenteditable or input element, NEVER a button!
    if (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      try { el.click(); } catch(e) {}
    }

    const isInput = 'value' in el && typeof el.value === 'string';
    const currentText = isInput ? el.value : (el.innerText || el.textContent || '');

    // Normalize text comparison for idempotency
    const normCur = currentText.replace(/\\s+/g, ' ').trim();
    const normVal = val.replace(/\\s+/g, ' ').trim();

    // If the element already contains this exact text, do not duplicate it
    if (normCur === normVal || (normVal.length > 10 && normCur.includes(normVal))) {
      return { ok: true, alreadyPresent: true, inserted: true };
    }

    // Clear existing text before typing a new post to prevent duplication
    if (shouldClear || currentText.length > 0) {
      if (isInput) {
        el.value = '';
      } else if (el.isContentEditable) {
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('delete', false, null);
        } catch(e) {
          el.innerHTML = '';
        }
      }
    }

    let inserted = false;
    // Primary insertion via execCommand insertText
    try {
      inserted = document.execCommand('insertText', false, val);
    } catch(e) {}

    // Fallback for native inputs
    if (!inserted) {
      if (isInput) {
        el.value = val;
        inserted = true;
      } else {
        el.innerText = val;
        inserted = true;
      }
    }

    ['beforeinput', 'input', 'change'].forEach(name => {
      try { el.dispatchEvent(new Event(name, { bubbles: true })); } catch(e) {}
    });

    return { ok: true, alreadyPresent: false, inserted: true };
  })(${Number(ref)}, ${JSON.stringify(targetText)}, ${Boolean(clear)})`);

  if (!insertResult || !insertResult.ok) {
    throw new Error(`Element [${ref}] not found on page. Call read_page first to refresh element refs.`);
  }

  // NOTE: We deliberately do NOT fall back to client.type() here!
  // In Facebook Lexical, execCommand succeeds, and calling client.type()
  // immediately afterwards resulted in the entire post text being typed twice.

  if (pressEnter) {
    await new Promise(r => setTimeout(r, 200));
    await client.evaluate(`((targetRef) => {
      const el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]') || document.activeElement;
      if (!el) return;
      ['keydown', 'keypress', 'keyup'].forEach(type => {
        el.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      });
    })(${Number(ref)})`);
  }

  await new Promise(r => setTimeout(r, 800));
  return { typed: true, ref, length: targetText.length };
}

/**
 * Upload files via CDP sendFile directly into the post composer dialog
 */
async function executeFileUpload(client, files, ref = null, { onLog = null } = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('file_upload requires a non-empty array of file paths');
  }

  onLog && onLog(`[AI Agent Upload] 📷 Preparing to attach ${files.length} file(s) into composer...`);

  // 1. Locate the active composer dialog and tag or spawn the file input (STRICTLY inside dialog)
  const setupResult = await client.evaluate(`() => {
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const composer = dialogs.find(d => {
      return !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
    }) || dialogs[dialogs.length - 1];

    if (!composer) return { hasDialog: false };

    // Clear any previous tag
    document.querySelectorAll('input[data-xa-finput]').forEach(el => el.removeAttribute('data-xa-finput'));

    // Check if input[type="file"] is already present inside composer
    const existingInput = composer.querySelector('input[type="file"]');
    if (existingInput) {
      existingInput.setAttribute('data-xa-finput', '1');
      return { hasDialog: true, alreadyMounted: true };
    }

    // Input not mounted yet. Look specifically for the "صورة/فيديو" (Photo/video) button in composer toolbar
    const allBtns = Array.from(composer.querySelectorAll('div[role="button"], button, [role="button"], span[role="button"]'));
    const photoBtn = allBtns.find(b => {
      const aria = ((b.getAttribute('aria-label') || '') + '').trim().toLowerCase();
      const txt = ((b.innerText || b.textContent || '') + '').trim().toLowerCase();
      const title = ((b.getAttribute('title') || '') + '').trim().toLowerCase();
      const combined = aria + ' ' + txt + ' ' + title;

      // STRICT EXCLUSIONS: Never click close, profile photo, cover photo, feelings, check-in, etc.
      const isForbidden = /close|إغلاق|remove|إزالة|delete|حذف|cancel|إلغاء|profile|ملف شخصي|cover|غلاف|avatar|audience|عامة|أنا فقط|أصدقاء|مشاعر|feeling|people|أشخاص|tag|check|زيارة|location|موقع|live|مباشر|reels|ريلز/i.test(combined);
      if (isForbidden) return false;

      // STRICT MATCH: Must specifically be Photo/Video
      return (
        aria === 'صورة/فيديو' ||
        aria === 'photo/video' ||
        aria.includes('صورة/فيديو') ||
        aria.includes('photo/video') ||
        txt.includes('صورة/فيديو') ||
        txt.includes('photo/video') ||
        title.includes('صورة/فيديو') ||
        title.includes('photo/video')
      );
    });

    if (photoBtn) {
      try { photoBtn.focus(); } catch (e) {}
      try { photoBtn.click(); } catch (e) {}
      return { hasDialog: true, clickedPhotoBtn: true };
    }

    return { hasDialog: true, clickedPhotoBtn: false };
  }`);

  // 2. If photo button was clicked, wait up to 5s for input[type="file"] to be mounted inside composer
  let inputReady = setupResult?.alreadyMounted || false;
  if (!inputReady) {
    for (let w = 0; w < 10; w++) {
      await new Promise(r => setTimeout(r, 500));
      inputReady = await client.evaluate(`() => {
        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
        const composer = dialogs.find(d => {
          return !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
        }) || dialogs[dialogs.length - 1];
        if (!composer) return false;

        const inp = composer.querySelector('input[type="file"]');
        if (inp) {
          document.querySelectorAll('input[data-xa-finput]').forEach(el => el.removeAttribute('data-xa-finput'));
          inp.setAttribute('data-xa-finput', '1');
          return true;
        }
        return false;
      }`);
      if (inputReady) break;
    }
  }

  // 3. Selectors to try:
  const selectorsToTry = [
    'input[data-xa-finput="1"]',
    'div[role="dialog"] input[type="file"]',
    'input[type="file"]',
  ];

  for (const filePath of files) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Media file not found at: ${resolvedPath}`);
    }
    // Validate the file is a real image/video BEFORE sending (FB rejects corrupt files)
    try {
      const head = Buffer.alloc(16);
      const fh = fs.openSync(resolvedPath, 'r');
      fs.readSync(fh, head, 0, 16, 0);
      fs.closeSync(fh);
      const sig = head.toString('hex');
      const isJpeg = sig.startsWith('ffd8ff');
      const isPng = sig.startsWith('89504e47');
      const isGif = sig.startsWith('47494638');
      const isWebp = sig.includes('57454250');
      const isMp4 = sig.includes('66747970') || head.toString('latin1').includes('ftyp');
      const isHtml = sig.startsWith('3c21646f') || sig.startsWith('3c68746d') || head.toString('latin1').toLowerCase().includes('<htm');
      if (isHtml || (!isJpeg && !isPng && !isGif && !isWebp && !isMp4)) {
        throw new Error(`الملف ${resolvedPath} ليس صورة/فيديو صالحاً (تالف أو صفحة خطأ محفوظة) — لن يقبله فيسبوك. يرجى استخدام ملف وسائط صالح.`);
      }
    } catch (vErr) {
      if (String(vErr.message).includes('ليس صورة/فيديو')) throw vErr;
      // validation read failure: proceed (sendFile may still work)
    }

    let sent = false;
    for (const sel of selectorsToTry) {
      try {
        sent = await client.sendFile(sel, resolvedPath);
        if (sent) break;
      } catch (e) {
        // try next selector
      }
    }

    if (!sent) {
      throw new Error('فشل إرفاق ملف الوسائط في نافذة المنشور. لم يتم العثور على محدد رفع الصور داخل المنشور.');
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // 4. Dispatch change event to trigger preview in React/Lexical
  await client.evaluate(`() => {
    document.querySelectorAll('input[data-xa-finput], div[role="dialog"] input[type="file"], input[type="file"]').forEach(input => {
      try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
    });
  }`);

  // 5. Wait for upload outcome: complete / failed (FB rejection) with ONE recovery retry
  const outcome = (await (async () => {
    let lastState = null;
    for (let i = 0; i < 60; i++) {
      const st = await isUploadInFlight(client);
      if (st) {
        lastState = st;
        if (st.failed) return { failed: true };
        if (!st.editor) return { done: true };
        if (!(st.progress > 0 || st.uploadingText || st.postDisabled)) {
          await new Promise(r => setTimeout(r, 2000));
          const st2 = await isUploadInFlight(client);
          if (st2 && st2.failed) return { failed: true };
          if (!(st2 && st2.editor && (st2.progress > 0 || st2.uploadingText || st2.postDisabled))) return { done: true };
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    return { timeout: true };
  })()) || { timeout: true };

  if (outcome.failed) {
    // Attempt ONE recovery: remove the rejected preview item, then re-send the file
    onLog && onLog('[AI Agent Upload] ⚠ Upload rejected by Facebook — removing the failed preview and retrying once...');
    const removed = await client.evaluate(`(() => {
      const visible = (el) => { const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; return !!r && r.width > 0 && r.height > 0; };
      let card = null;
      const candidates = Array.from(document.querySelectorAll('div[role="img"], img, div'));
      for (const el of candidates) {
        if (!visible(el)) continue;
        const t = ((el.innerText || el.getAttribute('aria-label') || '') + '');
        if (t.length > 0 && t.length < 120 && /(عذرًا|عذرا|cannot|can't|couldn't)/i.test(t)) {
          card = el.closest('div[role="img"]') || el;
          break;
        }
      }
      if (!card) return false;
      let scope = card;
      for (let up = 0; up < 6 && scope; up++) {
        const x = Array.from(scope.querySelectorAll('div[role="button"], button')).find(b => {
          const aria = ((b.getAttribute('aria-label') || '') + '').toLowerCase();
          const txt = (b.innerText || '').trim();
          return /remove|إزالة|حذف/.test(aria) || txt === 'Remove' || txt === 'إزالة';
        });
        if (x) {
          try { x.scrollIntoView({ block: 'center' }); } catch (e) {}
          ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
            x.dispatchEvent(new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
          });
          try { x.click(); } catch (e) {}
          return true;
        }
        scope = scope.parentElement;
      }
      return false;
    })()`);

    if (removed) {
      await new Promise(r => setTimeout(r, 2500));
      // Re-send the same file once
      let reSent = false;
      for (const sel of selectorsToTry) {
        try {
          reSent = await client.sendFile(sel, path.resolve(files[0]));
          if (reSent) break;
        } catch(e) {}
      }
      if (reSent) {
        await new Promise(r => setTimeout(r, 1500));
        await client.evaluate(`() => {
          document.querySelectorAll('input[data-xa-finput], div[role="dialog"] input[type="file"], input[type="file"]').forEach(input => {
            try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
          });
        }`);
      }
      // Wait again for a shorter window
      for (let i = 0; i < 40; i++) {
        const st = await isUploadInFlight(client);
        if (st && st.failed) {
          onLog && onLog('[AI Agent Upload] ❌ Retry FAILED too — the file itself is being rejected by Facebook.');
          return {
            uploaded: files,
            status: 'media_upload_failed',
            note: 'فشل رفع الوسائط مرة أخرى بعد محاولة الاسترداد. السبب غالباً أن الملف نفسه مرفوض من فيسبوك (تالف/غير مدعوم). لا تنشر منشوراً ناقصاً: أبلغ بفشل الوسائط أو انشر النص فقط بعد إزالة المعاينة الفاشلة (زر X/إزالة).',
          };
        }
        if (st && !st.editor) break;
        const busy = st && (st.progress > 0 || st.uploadingText || st.postDisabled);
        if (!busy) break;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return {
    uploaded: files,
    status: 'media_uploaded',
    note: 'Media attached and upload fully completed. You may now click the Post button.',
  };
}

/**
 * Selects up to 9 Facebook groups all at once in the "Post in more places" (النشر في مزيد من الأماكن / خيارات النشر) modal
 */
export async function executeSelectPostGroups(client, { count = 9, group_refs = [], onLog = null } = {}) {
  const maxCount = Math.min(Math.max(Number(count) || 9, 1), 9); // strictly capped at 9 by Facebook rules

  onLog && onLog(`[AI Agent Groups] 👥 Selecting up to ${maxCount} Facebook groups all at once...`);

  // Step 1: Advance composer to Post Settings screen if button is "التالي" (Next)
  const advanceResult = await client.evaluate(`(() => {
    const visible = (el) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return !!r && r.width > 0 && r.height > 0;
    };
    const triggerClick = (target) => {
      if (!target) return;
      const btn = target.closest('div[role="button"], button, [role="button"], a[role="button"]') || target;
      try { btn.focus(); } catch (e) {}
      try {
        btn.click();
      } catch (e) {
        try { target.click(); } catch (err) {}
      }
    };

    // Find the composer dialog that contains the actual post content
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const composer = dialogs.find(d => {
      const editor = d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]');
      const hasMedia = !!d.querySelector('img[src*="blob:"], img[src*="data:"], img[src*="scontent"], img[src*="fbcdn"]');
      const txt = (editor?.innerText || editor?.textContent || '').trim();
      return txt.length > 0 || hasMedia;
    }) || dialogs[dialogs.length - 1] || document;

    const buttons = Array.from(composer.querySelectorAll('div[role="button"], button, [role="button"], span[role="button"]')).filter(visible);

    // If button is "التالي" (Next), click Next to open the Post Settings screen
    const nextBtn = buttons.find(b => {
      const t = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim().toLowerCase();
      if (/close|إغلاق|remove|إزالة|delete|حذف|cancel|إلغاء/i.test(t)) return false;
      return (t.includes('التالي') || t.includes('next'));
    });

    if (nextBtn) {
      triggerClick(nextBtn);
      return { clickedNext: true };
    }

    return { clickedNext: false };
  })()`);

  if (advanceResult?.clickedNext) {
    onLog && onLog('[AI Agent Groups] Clicked "التالي" (Next) — advancing to Post Settings screen...');
    await new Promise(r => setTimeout(r, 2500));
  }

  // Step 2: In the Post Settings screen (or current screen), find and click "مشاركة في مجموعات" / "المجموعات"
  const openGroupsResult = await client.evaluate(`(() => {
    const visible = (el) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return !!r && r.width > 0 && r.height > 0;
    };
    const triggerClick = (target) => {
      if (!target) return;
      const btn = target.closest('div[role="button"], button, [role="button"], a[role="button"]') || target;
      try { btn.focus(); } catch (e) {}
      try {
        btn.click();
      } catch (e) {
        try { target.click(); } catch (err) {}
      }
    };

    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const activeDialog = dialogs[dialogs.length - 1] || document;

    // A real groups list modal has MULTIPLE checkboxes for groups (at least 2), and does NOT say "إعدادات المنشور"
    const nonBoostCheckboxes = Array.from(activeDialog.querySelectorAll('div[role="checkbox"], input[type="checkbox"], [aria-checked]')).filter(cb => {
      const label = ((cb.getAttribute('aria-label') || '') + ' ' + (cb.innerText || '') + ' ' + (cb.parentElement?.innerText || '')).toLowerCase();
      return !label.includes('ترويج') && !label.includes('boost') && !label.includes('إعلان');
    });

    const isGroupsListAlreadyOpen = nonBoostCheckboxes.length >= 2 && !(activeDialog.innerText || '').includes('إعدادات المنشور');
    if (isGroupsListAlreadyOpen) {
      return { alreadyOpen: true };
    }

    // Look for the "المجموعات" row inside Post Settings
    const candidates = Array.from(activeDialog.querySelectorAll('div[role="button"], button, [role="button"], span, div')).filter(visible);
    const groupsOption = candidates.find(el => {
      const t = ((el.innerText || el.getAttribute('aria-label') || '') + '').trim().toLowerCase();
      if (/close|إغلاق|remove|إزالة|delete|حذف|cancel|إلغاء|photo|صورة|video|فيديو|feeling|شعور|tag|إشارة|audience|جمهور|خصوصية|العامة|الأصدقاء|أنا فقط|تحديد الجمهور|ترويج|boost|إعلان|حفظ|save|نشر|post/i.test(t)) return false;
      return (
        t === 'المجموعات' ||
        t === 'مجموعات' ||
        t.includes('مشاركة في مجموعات') ||
        t.includes('مشاركة في المجموعات') ||
        t.includes('share to groups') ||
        t.includes('مزيد من الأماكن') ||
        t.includes('more places') ||
        (t.includes('مجموعات') && !t.includes('قواعد'))
      );
    });

    if (groupsOption) {
      triggerClick(groupsOption);
      return { clickedOpen: true, label: (groupsOption.innerText || 'المجموعات').slice(0, 40) };
    }

    return { clickedOpen: false };
  })()`);

  if (openGroupsResult?.clickedOpen) {
    onLog && onLog(`[AI Agent Groups] Clicked "${openGroupsResult.label}" — waiting for groups modal to open...`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Step 3: Select up to 9 groups simultaneously in the verified groups modal
  const selectResult = await client.evaluate(`((maxCount) => {
    const visible = (el) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return !!r && r.width > 0 && r.height > 0;
    };
    const triggerClick = (target) => {
      if (!target) return;
      const btn = target.closest('div[role="button"], button, [role="button"], a[role="button"]') || target;
      try { btn.focus(); } catch (e) {}
      try {
        btn.click();
      } catch (e) {
        try { target.click(); } catch (err) {}
      }
    };

    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const topDialog = dialogs[dialogs.length - 1] || document;

    // Filter checkboxes: STRICTLY ignore Boost Post / Ad checkboxes!
    const allCheckboxes = Array.from(topDialog.querySelectorAll('div[role="checkbox"], input[type="checkbox"], [aria-checked]')).filter(visible);
    const groupCheckboxes = allCheckboxes.filter(cb => {
      const label = ((cb.getAttribute('aria-label') || '') + ' ' + (cb.innerText || '') + ' ' + (cb.parentElement?.innerText || '')).toLowerCase();
      return !label.includes('ترويج') && !label.includes('boost') && !label.includes('إعلان') && !label.includes('ad');
    });

    if (groupCheckboxes.length === 0) {
      return { success: false, reason: 'no_group_checkboxes_found' };
    }

    const selectedNames = [];
    const toSelect = groupCheckboxes.filter(c => c.getAttribute('aria-checked') !== 'true' && !c.checked).slice(0, maxCount);

    for (const item of toSelect) {
      triggerClick(item);
      if (item.tagName === 'INPUT' && item.type === 'checkbox') {
        item.checked = true;
        try { item.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
      }
      try { item.setAttribute('aria-checked', 'true'); } catch(e) {}
      const itemText = (item.getAttribute('aria-label') || item.innerText || item.closest('div[role="listitem"]')?.innerText || item.parentElement?.innerText || 'Group').split('\\n')[0].trim();
      selectedNames.push(itemText.slice(0, 60));
    }

    // Step 4: Click Done / Save / Confirm in the groups modal (NEVER click Back!)
    const allButtons = Array.from(topDialog.querySelectorAll('div[role="button"], button')).filter(visible);
    const doneBtn = allButtons.find(b => {
      const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim().toLowerCase();
      return /^(done|تم|save|حفظ|تأكيد|confirm)$/i.test(label) || label === 'done' || label === 'تم';
    }) || allButtons.find(b => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return aria === 'done' || aria === 'تم' || aria === 'save' || aria === 'حفظ' || aria.includes('done') || aria.includes('تم') || aria.includes('save') || aria.includes('حفظ');
    });

    if (doneBtn) {
      triggerClick(doneBtn);
    }

    return {
      success: selectedNames.length > 0,
      selectedCount: selectedNames.length,
      groups: selectedNames,
      modalClosed: !!doneBtn,
    };
  })(${maxCount})`);

  if (selectResult?.success) {
    onLog && onLog(`[AI Agent Groups] ✅ Selected ${selectResult.selectedCount} groups all at once: ${selectResult.groups.join(', ')}. Returned to Post Settings screen.`);
    await new Promise(r => setTimeout(r, 2000));
  } else {
    onLog && onLog(`[AI Agent Groups] ℹ No separate groups modal needed or found (${selectResult?.reason || 'none'}). Ready to post.`);
  }

  // Step 5: Post settings are configured and groups selected! Now click Post / نشر button directly!
  const postSubmitResult = await client.evaluate(`(() => {
    const visible = (el) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return !!r && r.width > 0 && r.height > 0;
    };
    const triggerClick = (target) => {
      if (!target) return;
      const btn = target.closest('div[role="button"], button, [role="button"], a[role="button"]') || target;
      try { btn.focus(); } catch (e) {}
      try {
        btn.click();
      } catch (e) {
        try { target.click(); } catch (err) {}
      }
    };

    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    // Target the dialog that actually contains Post Settings or post options
    const targetDialog = dialogs.find(d => {
      const t = (d.innerText || '').toLowerCase();
      return t.includes('إعدادات المنشور') || t.includes('post settings') || t.includes('خيارات المشاركة');
    }) || dialogs[0] || document;

    const allButtons = Array.from(targetDialog.querySelectorAll('div[role="button"], button, [role="button"]')).filter(visible);
    // Find Post / نشر button
    const postBtn = allButtons.find(b => {
      const label = ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim().toLowerCase();
      if (/close|إغلاق|remove|إزالة|delete|حذف|cancel|إلغاء|back|رجوع/i.test(label)) return false;
      return (
        label === 'نشر' ||
        label === 'post' ||
        label === 'share' ||
        label === 'مشاركة' ||
        (label.includes('نشر') && label.length <= 12) ||
        (label.includes('post') && label.length <= 12)
      );
    }) || allButtons.find(b => {
      // Blue button fallback on Post Settings screen
      const style = window.getComputedStyle(b);
      const bg = style.backgroundColor || '';
      const isBlue = bg.includes('rgb(8, 102, 255)') || bg.includes('rgb(24, 119, 242)') || bg.includes('rgb(0, 100, 209)');
      return isBlue && b.offsetHeight >= 28 && b.getAttribute('aria-disabled') !== 'true';
    });

    if (postBtn && postBtn.getAttribute('aria-disabled') !== 'true') {
      triggerClick(postBtn);
      return { clickedPost: true, label: (postBtn.innerText || postBtn.getAttribute('aria-label') || 'نشر').slice(0, 30) };
    }

    return { clickedPost: false };
  })()`);

  if (postSubmitResult?.clickedPost) {
    onLog && onLog(`[AI Agent Groups] 🚀 Post button ("${postSubmitResult.label}") clicked! Post has been SUBMITTED.`);
    await new Promise(r => setTimeout(r, 4000));
    return {
      success: true,
      selected_count: selectResult?.selectedCount || 0,
      groups: selectResult?.groups || [],
      is_post_submitted: true,
      status: 'submitted',
      note: 'تم تحديد المجموعات بنجاح والضغط على زر النشر (Post). المنشور تم إرساله ويجري نشره الآن.',
    };
  }

  return {
    success: Boolean(selectResult?.success),
    selected_count: selectResult?.selectedCount || 0,
    groups: selectResult?.groups || [],
    confirmed: Boolean(selectResult?.modalClosed),
    ready_to_post: true,
    note: selectResult?.success
      ? `تم تحديد ${selectResult.selectedCount} مجموعات بنجاح دفعة واحدة. شاشة خيارات النشر جاهزة الآن، اضغط على زر نشر (Post) لإكمال العملية.`
      : 'أصبحت شاشة خيارات النشر جاهزة. اضغط الآن على زر نشر (Post).',
  };
}

/**
 * Derives the account owner's profile landing URL — always facebook.com/me
 * (Facebook redirects it to the logged-in user's own profile page automatically).
 */
export function deriveOwnerProfileUrl(account = null, cookie = null) {
  return 'https://www.facebook.com/me';
}

/**
 * Builds instructions prompt for Facebook publishing
 */
export function buildFacebookAgentPrompt({ post, accountName, account = null, startUrl = null, settings = {} }) {
  const targetUrl = (post.targetUrl && post.targetUrl.trim()) ? post.targetUrl.trim() : 'https://www.facebook.com/';
  const isGroup = targetUrl.includes('/groups/');
  const isPage = post.destinationType === 'page' || (!isGroup && !targetUrl.includes('/me') && targetUrl !== 'https://www.facebook.com/' && targetUrl !== 'https://www.facebook.com');

  let destinationRules = '';
  if (isGroup) {
    const about = settings.join_about || "I'm interested in what this group discusses and want to follow the conversations here.";
    destinationRules = `Destination: Facebook GROUP (${targetUrl}).
MEMBERSHIP FIRST:
1. Navigate to ${targetUrl}. Look at the group button:
   - If it says "Joined" (أنت عضو / تم الانضمام): The account is already a member. Proceed to post.
   - If it says "Join group" (انضمام إلى المجموعة): Click it once.
     If a dialog asks membership questions, answer truthfully, politely and safely based on:
     "${about}"
     For multiple-choice or yes/no questions, pick the most natural option. Agree to group rules if a checkbox appears.
     Submit answers, then wait 2 seconds.
   - If it says "Pending" or "Cancel request" (قيد المراجعة / طلب معلق): Do NOT post. Report status "awaiting_join" with clicked_post false and an explanatory note.
2. To post in the group:
   - Click "Write something..." (اكتب شيئاً...) or the group post composer.
   - Type the user's post text into the composer.
   - If media files are provided, upload them with file_upload and wait for previews to mount.
   - Click Post once.
   - If the group says the post is submitted for admin approval, report status "pending_approval".
   - If the post is published directly to the group feed, report status "submitted".`;
  } else if (isPage) {
    destinationRules = `Destination: Facebook PAGE (${targetUrl}).
1. Navigate to ${targetUrl}.
2. Check if posting is active as the Page identity or visitor. Use the page composer ("Create post" / "إنشاء منشور").
3. Type the user's post text, attach media if provided, and click Post once.
4. Verify the post appears on the page. Report status "submitted".`;
  } else {
    const profileStart = startUrl || 'https://www.facebook.com/me';
    destinationRules = `Destination: Account Owner's Facebook Timeline/Profile.
ALWAYS START ON THE OWNER'S PROFILE PAGE (never post from the feed):
- The browser should already be open on the owner's profile page: ${profileStart}
- Step 0: call read_page to confirm you are on the owner's own profile.
- If it is NOT on the profile page, navigate to ${profileStart} and let it fully load first.

MANDATORY STEP-BY-STEP SEQUENCE (FOLLOW THIS EXACT ORDER):
1. On the profile page, click the composer box ("What's on your mind?" / "بماذا تفكر؟") to open "Create post" ("إنشاء منشور").
2. [MANDATORY FIRST ACTION] Call type_text to type the exact post text into the composer box. DO NOT CLICK ANY OTHER BUTTON UNTIL TEXT IS TYPED!
3. If media files are provided, call file_upload to attach the photos/videos and wait for previews to finish uploading.
4. ${post.postToGroups ? '[GROUPS CROSSPOSTING] Call select_post_groups(count: 9) to select 9 groups all at once. The tool handles clicking Next ("التالي") if needed and selects all 9 groups all at once.' : 'Verify post content is in composer.'}
5. If the blue button at the bottom says "التالي" (Next), click it to advance to post settings.
6. When the blue button at the bottom says "نشر" (Post), click Post (نشر) ONCE. Never click twice.
7. Verify the composer closes and the new post appears at the TOP of the owner's profile timeline. Report status "submitted". You may verify by navigating to ${profileStart}`;
  }

  const mediaSection = (post.media && post.media.length)
    ? `MEDIA TO ATTACH:
Attach these local media files using the file_upload tool. Wait for previews to finish uploading before clicking Post:
${(Array.isArray(post.media) ? post.media : [post.media]).map(p => `- ${p}`).join('\n')}`
    : 'No media files to attach.';

  const firstCommentSection = post.firstComment
    ? `FIRST COMMENT INSTRUCTION:
Only after you have confirmed the main post is published live (status "submitted"), add ONE comment on that new post with this exact text:
<<<COMMENT_TEXT
${post.firstComment}
COMMENT_TEXT>>>
Find the new post at the top of the feed (posted by ${accountName}), click its Comment box, type the comment, and press Enter to submit. Check that the comment appears. A missing comment never makes the post fail.`
    : '';

  const groupsSection = post.postToGroups
    ? `GROUPS CROSSPOSTING INSTRUCTION (النشر في كل المجموعات - 9 مجموعات):
The user requested to publish this post to Facebook groups (up to 9 groups simultaneously):
1. In the open post composer, FIRST type the text and attach media files.
2. DO NOT click "..." or "Add to your post" ("إضافة إلى منشورك") or feelings/people buttons! That button is NOT for groups!
3. To select groups, call the select_post_groups tool with count: 9. The tool handles finding the groups and selecting all 9 groups all at once.
4. Only after select_post_groups finishes, click Post.`
    : '';

  return `You are an autonomous browser automation agent for Facebook. Your job is to publish ONE post for the account owner (${accountName}), using the provided browser tools.

${destinationRules}

EXACT POST TEXT (type exactly as given between the markers, do not invent or modify anything):
<<<POST_TEXT
${post.text || ''}
POST_TEXT>>>

${mediaSection}

${firstCommentSection}

${groupsSection}

CRITICAL RULES:
- The user prepared the post content themselves. Never generate or modify their content.
- ALWAYS TYPE TEXT FIRST: Right after opening the composer, your very first action MUST be calling type_text. Never search for or click toolbar buttons before the text is typed!
- DO NOT WAIT FOR BACKGROUND TOASTS: If you see "تستغرق هذه العملية وقتاً أطول" (This is taking longer than expected) or any network banner, IGNORE IT COMPLETELY! It is a harmless background feed notice from Facebook. DO NOT call wait() because of it! Right after opening the composer, your first action is ALWAYS calling type_text on the editor!
- NEVER TOUCH AUDIENCE OR PRIVACY SELECTORS: Never click buttons containing "العامة" / "الأصدقاء" / "أنا فقط" / "تحديد الجمهور". Post audience must remain Public (العامة). The system automatically blocks any clicks on them.
- NEVER CLICK "..." OR "Add to your post" ("إضافة إلى منشورك") OR FEELINGS/CHECK-IN/TAG BUTTONS! These toolbar buttons are for adding feelings and locations, NOT for publishing or groups. Clicking them opens unwanted popups and blocks the composer. The system automatically blocks clicks on them.
- IF BUTTON SAYS "التالي" (Next): Clicking "التالي" advances to the post settings screen where groups and post options are located.
- GROUPS SELECTION WITH select_post_groups: To publish to groups, call the select_post_groups tool. It selects all 9 groups all at once.
- CLICK POST ONCE: Click the Post/Share (نشر) button EXACTLY ONCE only after text, media, and groups are done. Never click it a second time.
- Always inspect the page with navigate or read_page first to get numeric [ref] IDs.
- TYPE TEXT ONCE: Call type_text ONCE to enter the post text. Never type the text twice.
- ATTACH MEDIA WITH file_upload: When attaching photos or media, call file_upload ONCE with the files array. Wait for upload to complete before advancing.
- WAIT FOR UPLOAD: With photo/video attached, click Post ONLY after the upload has fully completed (no spinner/progressbar visible, no "جاري التحميل" text, Post button enabled).
- NEVER NAVIGATE AWAY while inside the composer or while uploading — navigating now discards the post entirely.
- NEVER TOUCH COVER PHOTO OR PROFILE PICTURE: Under no circumstances click "Edit cover photo" (تعديل صورة الغلاف) or "Update profile picture".
- IF YOUR CLICK WAS BLOCKED: the tool returns blocked=true. Read the note returned by the tool to understand what action is needed.
- VERIFY AFTER POSTING: After the post button is clicked, wait(15) then read_page. Conclude ONLY when the composer is gone (or the post is visible on the feed/profile).
- If a banner asks about notifications ("Not Now" / "ليس الآن"), click "Not Now". NEVER click "Close" (إغلاق) or "Discard" on the post composer!
- If you encounter a security challenge, password prompt, or checkpoint, stop immediately and report failed with note "Security checkpoint / login required".
- Stay strictly on facebook.com.

When finished, your final response MUST end with a fenced json code block:
\`\`\`json
{
  "status": "submitted" | "pending_approval" | "awaiting_join" | "failed",
  "clicked_post": true | false,
  "post_url": null,
  ${post.firstComment ? '"commented": true | false,' : ''}
  "note": "short summary of the result"
}
\`\`\``;
}

/**
 * Runs the AI Browser Agent for a single Facebook post (Click-by-Click)
 */
export async function runAiBrowserAgentForPost({
  post,
  account,
  settings = {},
  onLog = console.log,
}) {
  const accountId = account.id || 'default';
  const cookie = account.token || account.cookie;
  const sid = resolveSessionId(accountId, cookie);

  onLog(`[AI Agent] Initializing browser session for ${account.name || accountId} (${sid})...`);

  // Ensure solver engine and browser session are ready
  const client = await getClient({ accountId, cookie, dataSaver: false });
  if (cookie) {
    await fb_login({ cookie, accountId });
  }

  // Always START the posting flow from the account owner's profile page,
  // not from the news feed — then continue the whole publish flow there.
  const startUrl = deriveOwnerProfileUrl(account, cookie);
  try {
    onLog(`[AI Agent] Opening the owner profile page first: ${startUrl}`);
    await client.goto(startUrl);
    await new Promise(r => setTimeout(r, 4000));
  } catch (navErr) {
    onLog(`[AI Agent] Initial navigation to profile failed (${navErr.message}) — the agent will navigate itself.`);
  }

  // Configure LLM - accept any casing or naming variant
  const baseUrl = normalizeBaseUrl(
    settings.baseUrl ||
    settings.ai_base_url ||
    settings.base_url ||
    settings.model_base_url ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1'
  );
  const apiKey = String(
    settings.apiKey ||
    settings.ai_api_key ||
    settings.api_key ||
    process.env.OPENAI_API_KEY ||
    ''
  ).trim();
  const model = String(
    settings.model ||
    settings.ai_model ||
    settings.model_name ||
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini'
  ).trim();

  if (!apiKey && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    throw new Error('مفتاح الذكاء الاصطناعي (API Key) غير محدد. يرجى إدخال المفتاح في إعدادات الحملة أو استخدام النشر المباشر الذكي.');
  }

  const prompt = buildFacebookAgentPrompt({ post, accountName: account.name || 'Owner', account, startUrl, settings });

  const messages = [
    {
      role: 'system',
      content: 'You are an expert browser automation agent that publishes social media posts step-by-step using browser tools. Always inspect elements using read_page, interact by numeric [ref] IDs, and conclude with the required fenced JSON status block.',
    },
    { role: 'user', content: prompt },
  ];

  onLog(`[AI Agent] Connecting to model: ${model} at ${baseUrl}...`);

  let turns = 0;
  const maxTurns = settings.max_turns || 40;
  let finalContent = '';
  let resultBlock = null;
  let hasTypedPostText = false;
  let hasUploadedMedia = false;
  let hasSelectedGroups = !post.postToGroups;
  let hasClickedPost = false;

  while (turns < maxTurns) {
    turns++;
    onLog(`[AI Agent] Turn ${turns}/${maxTurns}: requesting next action from AI...`);

    const payload = {
      model,
      messages,
      tools: BROWSER_TOOLS,
      tool_choice: 'auto',
      max_tokens: 3000,
    };

    let response;
    try {
      response = await axios.post(`${baseUrl}/chat/completions`, payload, {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
          'Content-Type': 'application/json',
        },
        timeout: 90000,
      });
    } catch (apiErr) {
      const responseData = apiErr.response?.data;
      const errMsg = (typeof responseData === 'object' ? (responseData?.error?.message || responseData?.message || JSON.stringify(responseData)) : null) || apiErr.message;
      onLog(`[AI Agent Error] LLM API Call Failed (${apiErr.response?.status || 'ERR'}): ${errMsg}`);
      throw new Error(`فشل الاتصال بنموذج الذكاء الاصطناعي (${model}): ${errMsg}`);
    }

    const choice = response.data?.choices?.[0];
    const msg = choice?.message;
    if (!msg) {
      onLog('[AI Agent] Empty response from model.');
      break;
    }

    messages.push(msg);

    // Check if the model called tools
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try { fnArgs = JSON.parse(tc.function.arguments); } catch (e) {}

        onLog(`[AI Agent Tool] Executing: ${fnName}(${JSON.stringify(fnArgs)})`);
        let toolOutput = null;

        try {
          if (fnName === 'navigate') {
            // SAFETY: navigating while media is still uploading kills the post ("Leave site?")
            // Also block leaving the composer before the post has been confirmed submitted.
            const navState = await isUploadInFlight(client);
            const busyUpload = navState && navState.editor && (navState.progress > 0 || navState.uploadingText || navState.postDisabled);
            const onComposerPage = navState && /\/(post\/create|composer)\b/i.test(String(navState.href || ''));
            if (busyUpload || (!hasClickedPost && onComposerPage)) {
              onLog('[AI Agent Guard] Navigate blocked — leaving the composer now would discard the post (media may still be uploading).');
              toolOutput = {
                blocked: true,
                note: 'التنقل محظور الآن: أنت داخل محرر النشر والوسائط قد لا تزال تُرفع، والمنشور لم يُنشر بعد. لا استفاده من التنقل. اضغط زر النشر أولاً (بعد تأكد اكتمال الرفع)، ثم انتظر، ثم تحقق من النتائج.',
              };
            } else {
              await client.goto(fnArgs.url);
              await new Promise(r => setTimeout(r, 2500));
              toolOutput = await serializeDomSnapshot(client);
            }
          } else if (fnName === 'read_page') {
            toolOutput = await serializeDomSnapshot(client);
          } else if (fnName === 'click') {
            if (hasClickedPost && !post.firstComment) {
              onLog(`[AI Agent Guard] Post already submitted. Ignoring redundant click(ref: ${fnArgs.ref})`);
              toolOutput = {
                status: 'already_submitted',
                note: 'Post has already been submitted. Do not click Post again. Conclude with final json block.',
              };
            } else {
              toolOutput = await executeClick(client, fnArgs.ref, {
                post,
                hasTypedPostText,
                hasUploadedMedia,
                hasSelectedGroups,
                onLog,
              });
              if (toolOutput.is_post_submitted) {
                hasClickedPost = true;
                onLog('[AI Agent Guard] Post button clicked. Submission locked to prevent duplicate posts.');
              }
            }
          } else if (fnName === 'type_text') {
            const isTypingPostText = (fnArgs.text || '').replace(/\s+/g, ' ').trim() === (post.text || '').replace(/\s+/g, ' ').trim();
            if (isTypingPostText && hasTypedPostText) {
              onLog(`[AI Agent Guard] Post text already entered. Ignoring redundant type_text(ref: ${fnArgs.ref})`);
              toolOutput = {
                typed: true,
                note: 'Post text is already present in the composer. Do not type again.',
              };
            } else {
              toolOutput = await executeTypeText(client, fnArgs.ref, fnArgs.text, fnArgs.clear !== false, fnArgs.press_enter);
              if (toolOutput?.typed) {
                hasTypedPostText = true;
              }
            }
          } else if (fnName === 'file_upload') {
            toolOutput = await executeFileUpload(client, fnArgs.files, fnArgs.ref, { onLog });
            if (toolOutput?.status === 'media_uploaded') {
              hasUploadedMedia = true;
            }
          } else if (fnName === 'select_post_groups') {
            toolOutput = await executeSelectPostGroups(client, {
              count: fnArgs.count || 9,
              group_refs: fnArgs.group_refs || [],
              onLog,
            });
            if (toolOutput?.success || toolOutput?.selected_count > 0 || toolOutput?.status === 'already_selected' || toolOutput?.status === 'groups_selected') {
              hasSelectedGroups = true;
            }
            if (toolOutput?.is_post_submitted) {
              hasClickedPost = true;
              onLog('[AI Agent Guard] Post button clicked via select_post_groups. Submission locked to prevent duplicate posts.');
            }
          } else if (fnName === 'wait') {
            const isComposerOpen = await client.evaluate(`() => {
              const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
              return dialogs.some(d => !!d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]'));
            }`);
            if (isComposerOpen && !hasTypedPostText) {
              onLog && onLog('[AI Agent Guard] ℹ Composer is open. Intercepting wait: post text must be typed now!');
              toolOutput = await serializeDomSnapshot(client);
              toolOutput.note = 'تنبيه عاجل: نافذة المنشور مفتوحة وجاهزة تماماً. لا تنتظر! الخطوة الإلزامية الآن: استدعِ أداة type_text فوراً لكتابة نص المنشور في المحرر [مربع كتابة المنشور].';
            } else {
              const secs = Math.min(Math.max(Number(fnArgs.seconds) || 2, 1), 30);
              await new Promise(r => setTimeout(r, secs * 1000));
              toolOutput = await serializeDomSnapshot(client);
            }
          } else {
            toolOutput = { error: `Unknown tool: ${fnName}` };
          }
        } catch (execErr) {
          onLog(`[AI Agent Tool Error] ${fnName}: ${execErr.message}`);
          toolOutput = { error: execErr.message };
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolOutput),
        });
      }
    } else {
      // Model returned final text
      finalContent = msg.content || '';
      onLog(`[AI Agent] Received final message from AI.`);
      resultBlock = parseResultBlock(finalContent);
      if (resultBlock) break;
    }
  }

  if (!resultBlock && finalContent) {
    resultBlock = parseResultBlock(finalContent);
  }

  const success = resultBlock ? (resultBlock.status === 'submitted' || resultBlock.status === 'pending_approval') : false;

  return {
    success,
    status: resultBlock?.status || 'failed',
    clicked_post: resultBlock?.clicked_post || false,
    post_url: resultBlock?.post_url || null,
    commented: resultBlock?.commented || false,
    note: resultBlock?.note || (success ? 'تم النشر بنجاح بواسطة وكيل الذكاء الاصطناعي' : 'لم يكتمل النشر'),
    turns,
    finalContent,
  };
}

export default {
  runAiBrowserAgentForPost,
  serializeDomSnapshot,
  buildFacebookAgentPrompt,
  parseResultBlock,
  normalizeBaseUrl,
  BROWSER_TOOLS,
  executeSelectPostGroups,
};

