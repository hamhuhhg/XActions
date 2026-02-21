import express from 'express';
import scrapers from '../../src/scrapers/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

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
        // 1. We must dynamically import the requested automation script.
        // However, the automation scripts in `src/automation` are currently designed to be copy-pasted into the browser console.
        // To run them via Node.js, we would need to adapt them or inject them into a Puppeteer page context.

        // For now, we will simulate the execution or inject it into the page context.
        // Let's create a browser session and inject the script.
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

        // Inject them into the browser context and attempt execution
        // WARNING: This depends heavily on how the browser scripts are structured. 
        // Usually, they are IIFEs that require manual start, or expose a window object.

        // First, set the configuration object in the window context
        await page.evaluate((opts) => {
            window.XActionsConfig = opts;
            console.log("XActionsConfig injected into window:", opts);
        }, options || {});

        // Inject scripts via Puppeteer's addScriptTag to bypass the strict CSP
        // This works because CDP injects scripts at a privileged level

        await page.addScriptTag({ content: coreScript });
        await page.addScriptTag({ content: actionsLibraryScript });

        // Give the libraries a tiny moment to parse and register globally
        await new Promise(r => setTimeout(r, 500));

        // Finally, inject the action script which auto-starts
        await page.addScriptTag({ content: actionScript });

        // Note: Puppeteer scripts running in the background would need proper monitoring and shouldn't block the request.
        // For a real API, this should likely trigger a background job (e.g. Bull queue) and return a job ID.
        res.json({ success: true, message: `Script ${scriptName} started successfully in background.` });

    } catch (error) {
        console.error('Automation error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Note: If running a background task, we shouldn't close the browser immediately.
        // This is just a conceptual implementation for the API.
        // if (browser) await browser.close(); 
    }
});


export default router;
