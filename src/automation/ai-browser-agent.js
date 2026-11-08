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
      description: 'Uploads one or more local media files to the page file input (<input type="file">).',
      parameters: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' }, description: 'Array of absolute file paths to upload' },
          ref: { type: 'number', description: 'Optional numeric [ref] ID of a specific input:file element' },
        },
        required: ['files'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wait',
      description: 'Waits for a few seconds (1 to 15) for uploads, dialogs, or page updates to complete, then reads the page.',
      parameters: {
        type: 'object',
        properties: { seconds: { type: 'number', description: 'Seconds to wait (1-15)' } },
        required: ['seconds'],
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

      const items = [];
      const seen = new Set();
      for (const el of document.querySelectorAll(selectors)) {
        if (seen.has(el) || !isVisible(el)) continue;
        seen.add(el);
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || (tag === 'input' ? 'input:' + (el.type || 'text') : tag);
        const label = labelOf(el);
        if (!label && role !== 'input:file' && !el.isContentEditable && tag !== 'input' && tag !== 'textarea') continue;

        // Never expose cover photo or profile avatar editing controls to prevent accidental profile modifications
        const lowerLabel = (label + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
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

      const bodyText = (document.body?.innerText || '')
        .split('\\n')
        .map(l => l.trim())
        .filter(Boolean)
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
 * Click element by ref
 */
async function executeClick(client, ref) {
  const result = await client.evaluate(`((targetRef) => {
    const el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]');
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });

    const label = (el.getAttribute('aria-label') || el.innerText || el.textContent || '').slice(0, 80).trim().toLowerCase();
    const isPostButton = /^(post|نشر|share|مشاركة|daabac|dhig|faafi|publier|publicar|posten|paylaş|bagikan)$/i.test(label) ||
      /(post|نشر|share|مشاركة|daabac|dhig|faafi|publier|publicar)/i.test(label) ||
      el.getAttribute('data-testid')?.includes('post_button') ||
      (el.closest('div[role="dialog"]') && ['submit', 'post'].includes(el.getAttribute('type')));

    const triggerClick = (target) => {
      ['mouseover', 'mousedown', 'mouseup'].forEach(name => {
        const ev = new MouseEvent(name, { view: window, bubbles: true, cancelable: true, buttons: 1 });
        target.dispatchEvent(ev);
      });
      try {
        target.click();
      } catch (e) {
        target.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
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

    return { ok: true, label, isPostButton };
  })(${Number(ref)})`);

  if (!result || !result.ok) {
    throw new Error(`Element [${ref}] not found on page. Call read_page first to refresh element refs.`);
  }

  if (result.isPostButton) {
    await new Promise(r => setTimeout(r, 4000));
    return {
      clicked: ref,
      target: result.label,
      is_post_submitted: true,
      note: 'The Post button was clicked and the post has been SUBMITTED. Do NOT click Post again. Conclude now with your final json status block.',
    };
  }

  await new Promise(r => setTimeout(r, 1200));
  return { clicked: ref, target: result.label };
}

/**
 * Type text into element by ref
 */
async function executeTypeText(client, ref, text, clear = true, pressEnter = false) {
  const targetText = String(text || '');
  if (!targetText) return { typed: false, length: 0 };

  const insertResult = await client.evaluate(`((targetRef, val, shouldClear) => {
    const el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]') || document.activeElement;
    if (!el) return null;

    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.focus();
    try { el.click(); } catch(e) {}

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
async function executeFileUpload(client, files, ref = null) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('file_upload requires a non-empty array of file paths');
  }

  // 1. If ref is provided and it is a button (e.g. Photo/video button), click it to mount input[type="file"]
  if (ref) {
    await client.evaluate(`((targetRef) => {
      const el = document.querySelector('[data-ap-ref="' + Number(targetRef) + '"]');
      if (el && (el.tagName !== 'INPUT' || el.type !== 'file')) {
        try {
          el.scrollIntoView({ block: 'center' });
          ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
            el.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, view: window }));
          });
          el.click();
        } catch(e) {}
      }
    })(${Number(ref)})`);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 2. Ensure photo/video button inside the composer dialog is clicked if file input is not yet mounted
  await client.evaluate(`() => {
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    const dialog = dialogs.find(d => {
      return d.querySelector('[contenteditable="true"], [role="textbox"], div[data-lexical-editor="true"]') ||
        (d.innerText && (d.innerText.includes('Create post') || d.innerText.includes('إنشاء منشور') || d.innerText.includes('What\\'s on your mind') || d.innerText.includes('بم تفكر')));
    }) || dialogs[0];

    if (!dialog) return;

    if (dialog.querySelector('input[type="file"]')) return;

    const buttons = Array.from(dialog.querySelectorAll('div[role="button"], button, [role="button"]'));
    const photoBtn = buttons.find(b => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const txt = (b.innerText || b.textContent || '').toLowerCase();
      const isForbidden = aria.includes('close') || aria.includes('إغلاق') ||
                          aria.includes('remove') || aria.includes('إزالة') ||
                          aria.includes('delete') || aria.includes('حذف');
      if (isForbidden) return false;

      return (
        aria === 'photo/video' || aria === 'صورة/فيديو' ||
        aria.includes('photo') || aria.includes('صورة') ||
        aria.includes('sawir') || aria.includes('foto') ||
        aria.includes('video') || aria.includes('فيديو') ||
        aria.includes('muuqaal') ||
        txt.includes('photo') || txt.includes('صورة') ||
        txt.includes('sawir') || txt.includes('foto') ||
        txt.includes('video') || txt.includes('فيديو') ||
        b.querySelector('img[src*="photo"], img[src*="image"], i[data-visualcompletion="css-img"]')
      );
    });

    if (photoBtn) {
      try {
        photoBtn.scrollIntoView({ block: 'center' });
        ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(name => {
          photoBtn.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, view: window }));
        });
        photoBtn.click();
      } catch(e) {}
    }
  }`);

  // 3. Wait up to 6 seconds for input[type="file"] to be mounted inside div[role="dialog"]
  let hasDialogInput = false;
  for (let w = 0; w < 12; w++) {
    hasDialogInput = await client.evaluate(`() => {
      const dialog = document.querySelector('div[role="dialog"]');
      return !!(dialog && dialog.querySelector('input[type="file"]'));
    }`);
    if (hasDialogInput) break;
    await new Promise(r => setTimeout(r, 500));
  }

  // STRICT SELECTOR: Under NO circumstances fallback to a global input[type="file"] outside the dialog!
  // Any input[type="file"] outside the dialog on profile pages is for cover photo or avatar.
  const selector = 'div[role="dialog"] input[type="file"]';

  for (const filePath of files) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Media file not found at: ${resolvedPath}`);
    }
    const sent = await client.sendFile(selector, resolvedPath);
    if (!sent) {
      throw new Error('فشل إرفاق ملف الوسائط في نافذة المنشور. لم يتم العثور على محدد رفع الصور داخل المنشور.');
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // 4. Dispatch change event to trigger preview in React/Lexical
  await client.evaluate(`() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      dialog.querySelectorAll('input[type="file"]').forEach(input => {
        try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
      });
    }
  }`);

  await new Promise(r => setTimeout(r, 2500));
  return { uploaded: files, status: 'media_attached_waiting_preview' };
}

/**
 * Builds instructions prompt for Facebook publishing
 */
export function buildFacebookAgentPrompt({ post, accountName, settings = {} }) {
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
    destinationRules = `Destination: Account Owner's Facebook Timeline/Profile (${targetUrl}).
1. Navigate to ${targetUrl}.
2. Click the composer box ("What's on your mind?" / "بماذا تفكر؟").
3. Type the user's exact post text into the composer.
4. If media files are provided, use file_upload and wait for preview to mount. NEVER touch any cover photo or profile picture controls.
5. Click Post (نشر) ONCE. Never click twice.
6. Verify the composer dialog closes and the post appears on the profile/feed. Report status "submitted".`;
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

  return `You are an autonomous browser automation agent for Facebook. Your job is to publish ONE post for the account owner (${accountName}), using the provided browser tools.

${destinationRules}

EXACT POST TEXT (type exactly as given between the markers, do not invent or modify anything):
<<<POST_TEXT
${post.text || ''}
POST_TEXT>>>

${mediaSection}

${firstCommentSection}

CRITICAL RULES:
- The user prepared the post content themselves. Never generate or modify their content.
- Always inspect the page with navigate or read_page first to get numeric [ref] IDs.
- TYPE TEXT ONCE: Call type_text ONCE to enter the post text. Never type the text twice.
- ATTACH MEDIA ONCE: When attaching photos or media, call file_upload ONCE with the files array. After file_upload, call wait(3) to let the photo preview render. NEVER close or discard the composer dialog!
- NEVER TOUCH COVER PHOTO OR PROFILE PICTURE: Under no circumstances click "Edit cover photo" (تعديل صورة الغلاف), "Update profile picture", or save any cover changes. Your ONLY job is publishing the user's post in the composer dialog.
- CLICK POST ONCE: Click the Post/Share (نشر) button EXACTLY ONCE. Never click it a second time.
- IMMEDIATELY FINISH: As soon as the Post button is clicked, the post is submitted. Conclude immediately with your final fenced json block.
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

  const prompt = buildFacebookAgentPrompt({ post, accountName: account.name || 'Owner', settings });

  const messages = [
    {
      role: 'system',
      content: 'You are an expert browser automation agent that publishes social media posts step-by-step using browser tools. Always inspect elements using read_page, interact by numeric [ref] IDs, and conclude with the required fenced JSON status block.',
    },
    { role: 'user', content: prompt },
  ];

  onLog(`[AI Agent] Connecting to model: ${model} at ${baseUrl}...`);

  let turns = 0;
  const maxTurns = settings.max_turns || 15;
  let finalContent = '';
  let resultBlock = null;
  let hasTypedPostText = false;
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
            await client.goto(fnArgs.url);
            await new Promise(r => setTimeout(r, 2500));
            toolOutput = await serializeDomSnapshot(client);
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
              toolOutput = await executeClick(client, fnArgs.ref);
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
              if (isTypingPostText && toolOutput?.typed) {
                hasTypedPostText = true;
              }
            }
          } else if (fnName === 'file_upload') {
            toolOutput = await executeFileUpload(client, fnArgs.files, fnArgs.ref);
          } else if (fnName === 'wait') {
            const secs = Math.min(Math.max(Number(fnArgs.seconds) || 2, 1), 15);
            await new Promise(r => setTimeout(r, secs * 1000));
            toolOutput = await serializeDomSnapshot(client);
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
};

