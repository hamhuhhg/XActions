/**
 * Automation & Campaign Controller for XActions API
 * Handles browser script injection, platform logins, campaigns, and account sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import scrapers from '../../src/scrapers/index.js';
import { fbToolMap, closeBrowser as closeFbBrowser } from '../../src/mcp/facebook-tools.js';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTOMATION_DIR = path.join(__dirname, '../../src/automation');

/**
 * Allowed script registry for security
 */
const ALLOWED_SCRIPTS = {
  autoPoster: 'autoPoster.js',
  autoLike: 'autoLiker.js',
  autoComment: 'autoCommenter.js',
  autoRetweet: 'actions.js',
  autoFollow: 'followTargetUsers.js',
  followTarget: 'followTargetUsers.js',
  smartUnfollow: 'smartUnfollow.js',
  customerService: 'customerService.js',
  growthSuite: 'growthSuite.js',
};

/**
 * POST /api/run - Dynamic runner for automation scripts
 */
export async function runScript(req, res) {
  const { scriptName, options } = req.body;
  const authToken = req.headers['x-auth-token'] || req.cookies?.auth_token;

  if (!authToken) {
    return res.status(401).json({ error: 'Twitter auth_token is REQUIRED to run actions' });
  }

  if (!scriptName) {
    return res.status(400).json({ error: 'scriptName is required' });
  }

  const filename = ALLOWED_SCRIPTS[scriptName];
  if (!filename) {
    return res.status(400).json({ error: `Script '${scriptName}' is not allowed or does not exist.` });
  }

  const scriptPath = path.join(AUTOMATION_DIR, filename);
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: `Script file not found in automation directory.` });
  }

  try {
    const browser = await scrapers.createBrowser();
    const page = await scrapers.createPage(browser);

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') console.error(`[Browser] ERROR: ${text}`);
      else if (type === 'warning') console.warn(`[Browser] WARN: ${text}`);
      else console.log(`[Browser] ${text}`);
    });

    await scrapers.loginWithCookie(page, authToken);

    console.log(`[Backend] Waiting for X.com React application to load before injecting scripts...`);
    try {
      await page.waitForSelector('[data-testid="primaryColumn"], [data-testid="SideNav_NewTweet_Button"]', { timeout: 30000 });
      console.log(`[Backend] X.com loaded successfully, proceeding with injection.`);
    } catch (e) {
      console.log(`[Backend] Warning: Timeout waiting for React hydration. Continuing anyway: ${e.message}`);
    }

    const coreScript = fs.readFileSync(path.join(AUTOMATION_DIR, 'core.js'), 'utf8');
    const actionsLibraryScript = fs.readFileSync(path.join(AUTOMATION_DIR, 'actions.js'), 'utf8');
    const actionScript = fs.readFileSync(scriptPath, 'utf8');

    await page.evaluate((opts) => {
      window.XActionsConfig = opts;
      console.log('XActionsConfig injected into window:', opts);
    }, options || {});

    await page.addScriptTag({ content: coreScript });
    await page.addScriptTag({ content: actionsLibraryScript });

    await new Promise(r => setTimeout(r, 500));
    await page.addScriptTag({ content: actionScript });

    res.json({ success: true, message: `Script ${scriptName} started successfully in background.` });
  } catch (error) {
    console.error('Automation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/login - Interactive login handler
 */
export async function interactiveLogin(req, res) {
  try {
    // Increase socket timeout to allow user sufficient time to log in
    if (req.setTimeout) req.setTimeout(600000);
    if (res.setTimeout) res.setTimeout(600000);

    const { platform } = req.query;

    if (platform === 'facebook') {
      console.log('[FB Login] Launching interactive browser for Facebook login...');
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        channel: 'chrome',
        args: [
          '--start-maximized',
          '--disable-notifications',
          '--no-default-browser-check'
        ],
      });
      const page = await browser.pages().then(p => p[0] || browser.newPage());
      
      // Navigate to Facebook login safely with generous timeout and fallback
      await page.goto('https://www.facebook.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }).catch(err => {
        console.warn('[FB Login] Initial navigation notice:', err.message);
      });

      let loggedIn = false;
      let checks = 0;
      const maxChecks = 300; // 300 * 2s = 600 seconds (10 minutes)

      while (checks < maxChecks) {
        if (!browser.isConnected()) {
          console.log('[FB Login] Browser window was closed by the user.');
          break;
        }

        try {
          const cookies = await page.cookies().catch(() => []);
          const cUser = cookies.find(c => c.name === 'c_user')?.value;
          const xs = cookies.find(c => c.name === 'xs')?.value;

          if (cUser && xs) {
            loggedIn = true;
            console.log(`[FB Login] ✅ Detected successful login for c_user: ${cUser}`);
            // Wait 2s for home feed / profile to load
            await new Promise(r => setTimeout(r, 2000));
            
            const allCookies = await page.cookies().catch(() => cookies);
            let accountName = `فيسبوك (${cUser})`;
            try {
              const nameCandidate = await page.evaluate(() => {
                const h1 = document.querySelector('h1');
                if (h1 && h1.innerText && !h1.innerText.toLowerCase().includes('facebook')) return h1.innerText.trim();
                const prof = document.querySelector('[aria-label="Your profile"], [aria-label="الحساب"], [aria-label*="Profile" i]');
                if (prof && prof.innerText) return prof.innerText.trim();
                return null;
              }).catch(() => null);
              if (nameCandidate) accountName = nameCandidate;
            } catch (_) {}

            await browser.close().catch(() => {});
            return res.json({
              success: true,
              token: JSON.stringify(allCookies),
              userId: cUser,
              accountName
            });
          }
        } catch (pollErr) {
          // Navigation in progress or frame detachment; continue polling safely
        }

        await new Promise(r => setTimeout(r, 2000));
        checks++;
      }

      await browser.close().catch(() => {});
      if (!loggedIn) {
        return res.json({
          success: false,
          error: 'انتهت مهلة تسجيل الدخول (10 دقائق) أو تم إغلاق المتصفح دون إتمام تسجيل الدخول.'
        });
      }
      return;
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'nodriver_login.py');
    const pythonProcess = spawn('python', [scriptPath]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => { outputData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

    pythonProcess.on('close', (code) => {
      try {
        const jsonMatch = outputData.match(/\{.*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.success) {
            res.json(result);
          } else {
            res.status(408).json(result);
          }
        } else {
          console.error('Python nodriver script failed. Exit code:', code);
          res.status(500).json({ success: false, error: 'فشل استخراج بيانات تسجيل الدخول.' });
        }
      } catch (e) {
        console.error('Error parsing python output:', e, outputData);
        res.status(500).json({ success: false, error: 'خطأ غير متوقع في معالجة بيانات تسجيل الدخول.' });
      }
    });
  } catch (error) {
    console.error('Browser login spawning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/check_suspension - Check account status
 */
export async function checkSuspension(req, res) {
  try {
    const { token, username, platform } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'auth_token is required' });

    if (platform === 'facebook') {
      let browser = null;
      try {
        browser = await scrapers.createBrowser();
        const page = await scrapers.createPage(browser);
        await scrapers.loginWithFacebookCookie(page, token);

        await new Promise(r => setTimeout(r, 5000));
        const url = page.url ? (typeof page.url === 'function' ? page.url() : page.url) : '';
        const isSuspended = url.includes('login') || url.includes('checkpoint');

        await browser.close();
        return res.json({
          success: true,
          isSuspended,
          doesNotExist: false,
          message: !isSuspended ? 'Account is active' : 'Account appears suspended or cookies expired',
        });
      } catch (e) {
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: 'Facebook check failed: ' + e.message });
      }
    }

    if (!username) return res.status(400).json({ success: false, error: 'username is required' });

    const scriptPath = path.join(process.cwd(), 'scripts', 'check_suspension.py');
    const pythonProcess = spawn('python', [scriptPath, '--token', token, '--username', username]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => { outputData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

    pythonProcess.on('close', (code) => {
      try {
        const jsonMatch = outputData.match(/\{.*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          res.json(result);
        } else {
          console.error('Suspension check failed. Exit code:', code);
          res.status(500).json({ success: false, error: 'فشل فحص الحساب. يرجى التحقق من سجلات الخادم.' });
        }
      } catch (e) {
        console.error('Error parsing python output:', e, outputData);
        res.status(500).json({ success: false, error: 'حدث خطأ غير متوقع أثناء الفحص.' });
      }
    });
  } catch (error) {
    console.error('Suspension check spawning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/safe_browser - Spawn safe browser
 */
export async function launchSafeBrowser(req, res) {
  try {
    const { token, platform, accountId, dataSaver } = req.body;

    let effectiveToken = token;
    if (accountId && accountId !== 'default') {
      try {
        const dbAcc = await prisma.socialAccount.findUnique({ where: { id: accountId.toString() } });
        if (dbAcc && dbAcc.token) {
          effectiveToken = dbAcc.token;
        }
      } catch (e) {}
    }

    if (!effectiveToken && !token) return res.status(400).json({ success: false, error: 'auth_token is required' });

    const isDataSaver = dataSaver === undefined ? '1' : (dataSaver ? '1' : '0');
    const scriptPath = path.join(process.cwd(), 'scripts', 'safe_browser.js');
    const b64Token = Buffer.from(effectiveToken || token || '').toString('base64');
    const nodeProcess = spawn('node', [
      scriptPath,
      '--token_b64', b64Token,
      '--platform', platform || 'twitter',
      '--accountId', accountId ? String(accountId) : 'default',
      '--dataSaver', isDataSaver
    ], {
      detached: true,
      stdio: 'ignore',
    });

    nodeProcess.unref();
    res.json({ success: true, message: 'Browser launched successfully.' });
  } catch (error) {
    console.error('Safe browser spawning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/facebook/run - Execute Facebook action
 */
export async function runFacebookAction(req, res) {
  const { scriptName, options } = req.body;
  const authToken = req.headers['x-auth-token'] || req.cookies?.auth_token;

  if (!authToken) {
    return res.status(401).json({ error: 'Facebook cookies (auth_token) are REQUIRED to run actions' });
  }

  if (!scriptName || !fbToolMap[scriptName]) {
    return res.status(400).json({ error: `Facebook tool '${scriptName}' is not defined.` });
  }

  try {
    const accountId = req.headers['x-account-id'] || options?.accountId;
    const runArgs = { ...options, cookie: authToken, accountId };
    console.log(`[Facebook API] Running ${scriptName} for account: ${accountId || 'default'}...`);
    const result = await fbToolMap[scriptName](runArgs);

    if (result && result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result?.error || 'Action failed' });
    }
  } catch (error) {
    console.error('Facebook Automation error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    const accountId = req.headers['x-account-id'] || req.body?.options?.accountId;
    await closeFbBrowser(accountId, authToken).catch(e => console.error('Error closing FB browser:', e));
  }
}

/**
 * GET /api/campaigns
 */
export async function getCampaigns(req, res) {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/campaigns
 */
export async function saveCampaign(req, res) {
  try {
    const { id, name, platform, status, schedule, config, content, stats } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Campaign name is required' });

    const data = {
      name,
      platform: platform || 'twitter',
      status: status || 'draft',
      schedule: schedule ? new Date(schedule) : null,
      config: config ? JSON.stringify(config) : null,
      content: content ? JSON.stringify(content) : null,
      stats: stats ? JSON.stringify(stats) : null,
    };

    let result;
    if (id) {
      result = await prisma.campaign.update({ where: { id }, data });
    } else {
      result = await prisma.campaign.create({ data });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/campaigns/:id
 */
export async function deleteCampaign(req, res) {
  try {
    const { id } = req.params;
    await prisma.campaign.delete({ where: { id } });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/accounts
 */
export async function getAccounts(req, res) {
  try {
    const accounts = await prisma.socialAccount.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/accounts/sync
 */
export async function syncAccounts(req, res) {
  try {
    const { accounts } = req.body;
    if (!Array.isArray(accounts)) return res.status(400).json({ success: false, error: 'Accounts array required' });

    for (const acc of accounts) {
      await prisma.socialAccount.upsert({
        where: { id: acc.id.toString() },
        update: {
          platform: acc.platform || 'twitter',
          name: acc.name,
          token: acc.token,
          country: acc.country,
          isSuspended: !!acc.isSuspended,
          username: acc.username || null,
          email: acc.email || null,
          phone: acc.phone || null,
          password: acc.password || null,
          avatar: acc.avatar || null,
          notes: acc.notes || null,
          order: typeof acc.order === 'number' ? acc.order : 0,
        },
        create: {
          id: acc.id.toString(),
          platform: acc.platform || 'twitter',
          name: acc.name,
          token: acc.token,
          country: acc.country,
          isSuspended: !!acc.isSuspended,
          username: acc.username || null,
          email: acc.email || null,
          phone: acc.phone || null,
          password: acc.password || null,
          avatar: acc.avatar || null,
          notes: acc.notes || null,
          order: typeof acc.order === 'number' ? acc.order : 0,
        },
      });
    }
    res.json({ success: true, message: 'Accounts synced successfully' });
  } catch (error) {
    console.error('Error syncing accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/accounts/:id
 */
export async function deleteAccount(req, res) {
  try {
    const { id } = req.params;
    await prisma.socialAccount.delete({ where: { id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.json({ success: true, message: 'Account was already deleted or not found' });
    }
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/upload_media
 */
export async function uploadMedia(req, res) {
  try {
    const { fileBase64, extension } = req.body;
    if (!fileBase64 || !extension) {
      return res.status(400).json({ success: false, error: 'Missing file content or extension' });
    }

    const base64Data = fileBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');

    res.json({ success: true, filePath });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Helper to run Python nodriver scripts
 */
function runPythonScript(scriptName, args) {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'twitter_actions', scriptName);
    const pythonProcess = spawn('python', [scriptPath, ...args]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => { outputData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

    pythonProcess.on('close', (code) => {
      try {
        const match = outputData.match(/\{[\s\S]*\}/);
        if (match) {
          const result = JSON.parse(match[0]);
          resolve(result);
        } else {
          console.error(`[Python Error] ${scriptName} (Code: ${code})`, errorData);
          resolve({ success: false, error: 'Invalid output from python script' });
        }
      } catch (e) {
        console.error(`[Python Parse Error] ${scriptName}`, e, outputData);
        resolve({ success: false, error: 'Failed to parse python output' });
      }
    });
  });
}

/**
 * Background runner for account automation in campaigns
 */
async function executeAutomationForAccount(authToken, content, accountName) {
  const idMap = {};

  const resolveTarget = (target) => {
    if (!target) return null;
    let unresolved = false;
    const resolved = target.replace(/\{\{(.*?)\}\}/g, (match, refId) => {
      const val = idMap[refId?.trim()];
      if (!val) {
        unresolved = true;
        return match;
      }
      return val;
    });
    return unresolved ? null : resolved;
  };

  try {
    console.log(`[Campaign Engine] Authenticating ${accountName} for Python Execution...`);

    // 1. Post Tweets
    if (content.tweets?.length) {
      for (const t of content.tweets) {
        try {
          console.log(`[Campaign] ${accountName} posting tweet: ${t.text.substring(0, 30)}...`);
          const args = ['--token', authToken, '--text', t.text];
          if (t.media) args.push('--media', t.media);

          const result = await runPythonScript('nodriver_post.py', args);
          if (result.success && result.tweetId && t.refId) {
            idMap[t.refId.trim()] = result.tweetId;
          }
        } catch (err) {
          console.error(`[Campaign Action Error] Post failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    // 2. Replies / Quotes
    const actions = [
      ...(content.replies || []).map(r => ({ ...r, type: 'reply' })),
      ...(content.quotes || []).map(q => ({ ...q, type: 'quote' })),
    ];

    for (const action of actions) {
      try {
        const target = resolveTarget(action.target);
        if (!target) continue;

        const url = target.startsWith('http') ? target : `https://x.com/i/status/${target}`;
        const script = action.type === 'reply' ? 'nodriver_reply.py' : 'nodriver_quote.py';
        const args = ['--token', authToken, '--target', url, '--text', action.text];
        if (action.media) args.push('--media', action.media);

        const result = await runPythonScript(script, args);
        if (result.success && (result.replyId || result.quoteId) && action.refId) {
          idMap[action.refId.trim()] = result.replyId || result.quoteId;
        }
      } catch (err) {
        console.error(`[Campaign Action Error] ${action.type} failed: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 5000));
    }

    console.log(`[Campaign] ✅ ${accountName} finished successfully!`);
  } catch (e) {
    console.error(`[Campaign Engine Global Error] ${accountName}: ${e.message}`);
  }
}

/**
 * Background runner for Facebook account automation in campaigns
 */
async function executeFacebookCampaignForAccount(authToken, content, accountName, accountId) {
  const idMap = {};

  const resolveTarget = (target) => {
    if (!target) return null;
    let unresolved = false;
    const resolved = target.replace(/\{\{(.*?)\}\}/g, (match, refId) => {
      const val = idMap[refId?.trim()];
      if (!val) {
        unresolved = true;
        return match;
      }
      return val;
    });
    return unresolved ? null : resolved;
  };

  try {
    console.log(`[FB Campaign Engine] Starting campaign for ${accountName} (accountId: ${accountId})...`);
    const { fb_post_timeline, fb_reply_comment, fb_warmup_accounts, closeBrowser } = await import('../../src/mcp/facebook-tools.js');

    // 1. Post Timeline Posts (supports content.posts or content.fb_posts)
    const posts = content.posts || content.fb_posts || [];
    if (posts.length) {
      for (const p of posts) {
        try {
          console.log(`[FB Campaign] ${accountName} posting to timeline: ${p.text.substring(0, 30)}...`);
          const res = await fb_post_timeline({ text: p.text, imagePath: p.media || p.imagePath, cookie: authToken, accountId });
          if (res?.success && p.refId) {
            idMap[p.refId.trim()] = res.postUrl || 'https://www.facebook.com';
          }
        } catch (err) {
          console.error(`[FB Campaign Action Error] Post failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    // 2. Comments / Replies (supports content.comments or content.replies)
    const comments = content.comments || content.replies || [];
    if (comments.length) {
      for (const c of comments) {
        try {
          const target = resolveTarget(c.target);
          if (!target) continue;

          console.log(`[FB Campaign] ${accountName} commenting on ${target}: ${c.text.substring(0, 30)}...`);
          await fb_reply_comment({ postUrl: target, text: c.text, cookie: authToken, accountId });
        } catch (err) {
          console.error(`[FB Campaign Action Error] Comment failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 6000));
      }
    }

    // 3. Warm-up (if enabled in content)
    if (content.warmup?.enabled) {
      try {
        console.log(`[FB Campaign] ${accountName} performing warm-up likes...`);
        await fb_warmup_accounts({
          likesCount: content.warmup.likesCount || 5,
          variance: content.warmup.variance || 2,
          cookie: authToken,
          accountId,
        });
      } catch (err) {
        console.error(`[FB Campaign Warmup Error]: ${err.message}`);
      }
    }

    console.log(`[FB Campaign] ✅ ${accountName} finished successfully!`);
  } catch (e) {
    console.error(`[FB Campaign Engine Global Error] ${accountName}: ${e.message}`);
  } finally {
    try {
      const { closeBrowser } = await import('../../src/mcp/facebook-tools.js');
      await closeBrowser(accountId, authToken).catch(() => {});
    } catch (e) {}
  }
}

/**
 * POST /api/campaigns/:id/execute
 */
export async function executeCampaign(req, res) {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const config = JSON.parse(campaign.config || '{}');
    const content = JSON.parse(campaign.content || '{}');
    const accountIds = config.target_accounts || [];

    if (accountIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No accounts selected for this campaign' });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });

    const isFacebookCampaign = campaign.platform === 'facebook';
    const results = [];

    for (const accId of accountIds) {
      const account = await prisma.socialAccount.findUnique({ where: { id: accId.toString() } });
      if (!account || !account.token) {
        results.push({ account: accId, success: false, error: 'Account or token missing in DB' });
        continue;
      }

      const isFbAccount = (account.platform || '').toLowerCase() === 'facebook';

      if (isFacebookCampaign || isFbAccount) {
        executeFacebookCampaignForAccount(account.token, content, account.name, account.id)
          .catch(err => console.error(`[FB Campaign Background Error] ${account.name}:`, err));
      } else {
        executeAutomationForAccount(account.token, content, account.name)
          .catch(err => console.error(`[Campaign Background Error] ${account.name}:`, err));
      }

      results.push({ account: account.name, platform: isFbAccount ? 'facebook' : 'twitter', success: true });
    }

    res.json({ success: true, message: 'Campaign execution started in background', results });
  } catch (error) {
    console.error('Error executing campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
