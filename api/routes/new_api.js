import express from 'express';
import scrapers from '../../src/scrapers/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

const router = express.Router();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTOMATION_DIR = path.join(__dirname, '../../src/automation');

/**
 * ============================================================================
 * DATA SCRAPER ENDPOINTS
 * ============================================================================
 */

// Helper function to handle scraping requests
const handleScrape = async (req, res, scraperFn, ...args) => {
    let browser = null;
    try {
        browser = await scrapers.createBrowser();
        const page = await scrapers.createPage(browser);

        // Check if auth_token is provided (some scrapers work better with login)
        const authToken = req.headers['x-auth-token'] || req.cookies?.auth_token;
        if (authToken) {
            await scrapers.loginWithCookie(page, authToken);
        }

        const result = await scraperFn(page, ...args);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
};

router.get('/profile', (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    handleScrape(req, res, scrapers.scrapeProfile, username);
});

router.get('/followers', (req, res) => {
    const { username, limit } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    handleScrape(req, res, scrapers.scrapeFollowers, username, { limit: parseInt(limit) || 100 });
});

router.get('/following', (req, res) => {
    const { username, limit } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    handleScrape(req, res, scrapers.scrapeFollowing, username, { limit: parseInt(limit) || 100 });
});

router.get('/tweets', (req, res) => {
    const { username, limit, includeReplies } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    handleScrape(req, res, scrapers.scrapeTweets, username, {
        limit: parseInt(limit) || 50,
        includeReplies: includeReplies === 'true'
    });
});

router.get('/search', (req, res) => {
    const { query, limit, filter } = req.query;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    handleScrape(req, res, scrapers.searchTweets, query, {
        limit: parseInt(limit) || 50,
        filter: filter || 'latest'
    });
});

router.get('/hashtag', (req, res) => {
    const { tag, limit } = req.query;
    if (!tag) return res.status(400).json({ error: 'Tag is required' });
    handleScrape(req, res, scrapers.scrapeHashtag, tag, { limit: parseInt(limit) || 50 });
});

router.get('/thread', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    handleScrape(req, res, scrapers.scrapeThread, url);
});

router.get('/media', (req, res) => {
    const { username, limit } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    handleScrape(req, res, scrapers.scrapeMedia, username, { limit: parseInt(limit) || 50 });
});

/**
 * ============================================================================
 * AUTOMATION ACTION ENDPOINTS
 * ============================================================================
 */

// Dynamic route to run any automation script
router.post('/run', async (req, res) => {
    const { scriptName, options } = req.body;
    const authToken = req.headers['x-auth-token'] || req.cookies?.auth_token;

    if (!authToken) {
        return res.status(401).json({ error: 'Twitter auth_token is REQUIRED to run actions' });
    }

    if (!scriptName) {
        return res.status(400).json({ error: 'scriptName is required' });
    }

    // Define allowed scripts mapping to ensure security
    const allowedScripts = {
        'autoPoster': 'autoPoster.js',
        'autoLike': 'autoLiker.js',
        'autoComment': 'autoCommenter.js',
        'autoRetweet': 'actions.js', // We don't have autoRetweeter yet, just placeholder for now
        'autoFollow': 'followTargetUsers.js',
        'followTarget': 'followTargetUsers.js',
        'smartUnfollow': 'smartUnfollow.js',
        'customerService': 'customerService.js',
        'growthSuite': 'growthSuite.js'
    };

    const filename = allowedScripts[scriptName];
    if (!filename) {
        return res.status(400).json({ error: `Script '${scriptName}' is not allowed or does not exist.` });
    }

    const scriptPath = path.join(AUTOMATION_DIR, filename);
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ error: `Script file not found in automation directory.` });
    }

    let browser = null;
    try {
        browser = await scrapers.createBrowser();
        const page = await scrapers.createPage(browser);

        // Pipe browser console logs to the Node.js terminal
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') console.error(`[Browser] ERROR: ${text}`);
            else if (type === 'warning') console.warn(`[Browser] WARN: ${text}`);
            else console.log(`[Browser] ${text}`);
        });

        await scrapers.loginWithCookie(page, authToken);

        // Wait for the primary React application to render to ensure the DOM is ready for scripts
        console.log(`[Backend] Waiting for X.com React application to load before injecting scripts...`);
        try {
            await page.waitForSelector('[data-testid="primaryColumn"], [data-testid="SideNav_NewTweet_Button"]', { timeout: 30000 });
            console.log(`[Backend] X.com loaded successfully, proceeding with injection.`);
        } catch (e) {
            console.log(`[Backend] Warning: Timeout waiting for React hydration. Page might be slow. Continuing anyway: ${e.message}`);
        }

        // Read the core script (dependency for all automations)
        const coreScript = fs.readFileSync(path.join(AUTOMATION_DIR, 'core.js'), 'utf8');

        // Read the actions library (dependency for most automations)
        const actionsLibraryScript = fs.readFileSync(path.join(AUTOMATION_DIR, 'actions.js'), 'utf8');

        // Read the target automation script
        const actionScript = fs.readFileSync(scriptPath, 'utf8');

        await page.evaluate((opts) => {
            window.XActionsConfig = opts;
            console.log("XActionsConfig injected into window:", opts);
        }, options || {});

        await page.addScriptTag({ content: coreScript });
        await page.addScriptTag({ content: actionsLibraryScript });

        // Give the libraries a tiny moment to parse and register globally
        await new Promise(r => setTimeout(r, 500));

        // Finally, inject the action script which auto-starts
        await page.addScriptTag({ content: actionScript });

        res.json({ success: true, message: `Script ${scriptName} started successfully in background.` });

    } catch (error) {
        console.error('Automation error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // if (browser) await browser.close(); 
    }
});

/**
 * ============================================================================
 * INTERACTIVE LOGIN ENDPOINT
 * ============================================================================
 */
import { spawn } from 'child_process';

router.get('/login', async (req, res) => {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'nodriver_login.py');

        // Ensure python is available in the environment
        const pythonProcess = spawn('python', [scriptPath]);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            try {
                // Find the first valid JSON block in the output
                // In case there are some warnings before the JSON string
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
                    console.error('stderr:', errorData);
                    console.error('stdout:', outputData);
                    res.status(500).json({ success: false, error: 'فشل استخراج بيانات تسجيل الدخول. تأكد من تثبيت بايثون ومكتبة nodriver.' });
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
});

/**
 * ============================================================================
 * ACCOUNT SUSPENSION CHECK
 * ============================================================================
 */
router.post('/check_suspension', async (req, res) => {
    try {
        const { token, username } = req.body;

        if (!token) return res.status(400).json({ success: false, error: 'auth_token is required' });
        if (!username) return res.status(400).json({ success: false, error: 'username is required' });

        const scriptPath = path.join(process.cwd(), 'scripts', 'check_suspension.py');
        const pythonProcess = spawn('python', [scriptPath, '--token', token, '--username', username]);

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            try {
                const jsonMatch = outputData.match(/\{.*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    res.json(result);
                } else {
                    console.error('Suspension check failed. Exit code:', code);
                    console.error('stderr:', errorData);
                    console.error('stdout:', outputData);
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
});
/**
 * ============================================================================
 * SAFE BROWSER LOGIN
 * ============================================================================
 */
router.post('/safe_browser', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) return res.status(400).json({ success: false, error: 'auth_token is required' });

        const scriptPath = path.join(process.cwd(), 'scripts', 'safe_browser.py');

        // We spawn the process and don't wait for it to close since it stays open indefinitely
        const pythonProcess = spawn('python', [scriptPath, '--token', token], {
            detached: true,
            stdio: 'ignore' // We don't need to read output, and this helps it detach properly
        });

        // Prevent parent from waiting for this child process to exit
        pythonProcess.unref();

        res.json({ success: true, message: 'Browser launched successfully.' });
    } catch (error) {
        console.error('Safe browser spawning error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * ============================================================================
 * CAMPAIGNS MANAGEMENT
 * ============================================================================
 */

// List all campaigns
router.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create or Update a campaign
router.post('/campaigns', async (req, res) => {
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
            stats: stats ? JSON.stringify(stats) : null
        };

        let result;
        if (id) {
            // Update existing
            result = await prisma.campaign.update({
                where: { id },
                data
            });
        } else {
            // Create new
            result = await prisma.campaign.create({
                data
            });
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a campaign
router.delete('/campaigns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.campaign.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sync accounts from frontend
router.post('/accounts/sync', async (req, res) => {
    try {
        const { accounts } = req.body;
        if (!Array.isArray(accounts)) return res.status(400).json({ success: false, error: 'Accounts array required' });

        for (const acc of accounts) {
            await prisma.xAccount.upsert({
                where: { id: acc.id.toString() },
                update: {
                    name: acc.name,
                    token: acc.token,
                    country: acc.country,
                    isSuspended: !!acc.isSuspended
                },
                create: {
                    id: acc.id.toString(),
                    name: acc.name,
                    token: acc.token,
                    country: acc.country,
                    isSuspended: !!acc.isSuspended
                }
            });
        }
        res.json({ success: true, message: 'Accounts synced successfully' });
    } catch (error) {
        console.error('Error syncing accounts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload media for campaigns
router.post('/upload_media', async (req, res) => {
    try {
        const { fileBase64, extension } = req.body;

        if (!fileBase64 || !extension) {
            return res.status(400).json({ success: false, error: 'Missing file content or extension' });
        }

        // Remove the data:image/...;base64, prefix if it exists
        const base64Data = fileBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');

        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        const uploadsDir = path.join(process.cwd(), 'uploads');

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, base64Data, 'base64');

        res.json({ success: true, filePath: filePath });
    } catch (error) {
        console.error('Media upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ----------------------------------------------------------------------------
// CAMPAIGN EXECUTION ENGINE
// ----------------------------------------------------------------------------

// Execute a campaign
router.post('/campaigns/:id/execute', async (req, res) => {
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

        // Update campaign status
        await prisma.campaign.update({
            where: { id },
            data: { status: 'active' }
        });

        const results = [];

        for (const accId of accountIds) {
            const account = await prisma.xAccount.findUnique({ where: { id: accId.toString() } });
            if (!account || !account.token) {
                results.push({ account: accId, success: false, error: 'Account or token missing in DB' });
                continue;
            }

            console.log(`[Campaign] Triggering backend-driven execution for ${account.name}`);

            // Execute in background
            executeAutomationForAccount(account.token, content, account.name)
                .catch(err => console.error(`[Campaign Background Error] ${account.name}:`, err));

            results.push({ account: account.name, success: true });
        }

        res.json({ success: true, message: 'Campaign execution started in background', results });

    } catch (error) {
        console.error('Error executing campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function executeAutomationForAccount(authToken, content, accountName) {
    let browser;
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

    // Helper to run Python nodriver scripts
    const runPythonScript = (scriptName, args) => {
        return new Promise((resolve, reject) => {
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
    };

    try {
        console.log(`[Campaign Engine] Authenticating ${accountName} for Python Execution...`);

        // 1. POST TWEETS
        if (content.tweets?.length) {
            for (const t of content.tweets) {
                try {
                    console.log(`[Campaign] ${accountName} posting tweet via nodriver: ${t.text.substring(0, 30)}...`);

                    const args = [
                        '--token', authToken,
                        '--text', t.text
                    ];

                    if (t.media) {
                        args.push('--media', t.media);
                    }

                    const result = await runPythonScript('nodriver_post.py', args);

                    if (result.success) {
                        console.log(`[Campaign] ✅ Tweet posted successfully for ${accountName}!`);
                        if (result.tweetId) {
                            if (t.refId) {
                                idMap[t.refId.trim()] = result.tweetId;
                                console.log(`[Campaign] Captured ID for ${t.refId}: ${result.tweetId}`);
                            }
                        } else {
                            console.warn(`[Campaign] Tweet likely posted, but couldn't capture the ID for ${accountName}`);
                        }
                    } else {
                        console.error(`[Campaign] Post failed for ${accountName}: ${result.error || 'Unknown error'}`);
                        // We continue the loop so other independent tweets might still post
                    }
                } catch (err) {
                    console.error(`[Campaign Action Error] Post failed: ${err.message}`);
                }
                await new Promise(r => setTimeout(r, 5000));
            }
        }

        // 2. REPLIES / QUOTES
        const actions = [
            ...(content.replies || []).map(r => ({ ...r, type: 'reply' })),
            ...(content.quotes || []).map(q => ({ ...q, type: 'quote' }))
            // Note: DM is omitted for now as we don't have a nodriver_dm.py yet.
            // DMs are rarely used in these campaigns anyway.
        ];

        for (const action of actions) {
            try {
                const target = resolveTarget(action.target);
                if (!target) {
                    console.error(`[Campaign] Skipping ${action.type}: Target unresolved or depends on a failed step`);
                    continue;
                }

                console.log(`[Campaign] ${accountName} executing ${action.type} to ${target} via nodriver`);

                const url = target.startsWith('http') ? target : `https://x.com/i/status/${target}`;

                let result;
                if (action.type === 'reply') {
                    const args = [
                        '--token', authToken,
                        '--target', url,
                        '--text', action.text
                    ];
                    if (action.media) {
                        args.push('--media', action.media);
                    }
                    result = await runPythonScript('nodriver_reply.py', args);

                    if (result.success && result.replyId && action.refId) {
                        idMap[action.refId.trim()] = result.replyId;
                    }
                } else if (action.type === 'quote') {
                    const args = [
                        '--token', authToken,
                        '--target', url,
                        '--text', action.text
                    ];
                    if (action.media) {
                        args.push('--media', action.media);
                    }
                    result = await runPythonScript('nodriver_quote.py', args);

                    if (result.success && result.quoteId && action.refId) {
                        idMap[action.refId.trim()] = result.quoteId;
                    }
                }

                if (!result.success) {
                    console.error(`[Campaign Action Error] ${action.type} failed: ${result.error || 'Unknown error'}`);
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

export default router;
