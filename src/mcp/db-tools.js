#!/usr/bin/env node
/**
 * XActions MCP DB Tools
 * Prisma-backed tools for campaign & account management via MCP
 *
 * Exposes:
 *   - x_create_campaign
 *   - x_list_campaigns
 *   - x_run_campaign
 *   - x_delete_campaign
 *   - x_add_account
 *   - x_list_accounts
 *   - x_remove_account
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { fb_login, fb_post_timeline, closeBrowser } from './facebook-tools.js';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runPythonScript(scriptName, args) {
    const base = path.join(__dirname, '../../scripts/twitter_actions');
    const scriptPath = path.join(base, scriptName);
    return new Promise((resolve) => {
        const proc = spawn('python', [scriptPath, ...args]);
        let out = '';
        let err = '';
        proc.stdout.on('data', (d) => { out += d.toString(); });
        proc.stderr.on('data', (d) => { err += d.toString(); });
        proc.on('close', () => {
            try {
                const match = out.match(/\{[\s\S]*\}/);
                if (match) resolve(JSON.parse(match[0]));
                else resolve({ success: false, error: 'Invalid output', stderr: err });
            } catch (e) {
                resolve({ success: false, error: 'Parse error: ' + e.message });
            }
        });
    });
}

async function executeAutomationForAccount(authToken, content, accountName) {
    const results = [];

    // POST TWEETS
    if (content.tweets?.length) {
        for (const t of content.tweets) {
            try {
                const args = ['--token', authToken, '--text', t.text];
                if (t.media) args.push('--media', t.media);
                const res = await runPythonScript('nodriver_post.py', args);
                results.push({ type: 'tweet', text: t.text.substring(0, 30), ...res });
                await new Promise(r => setTimeout(r, 5000));
            } catch (e) {
                results.push({ type: 'tweet', success: false, error: e.message });
            }
        }
    }

    // REPLIES
    if (content.replies?.length) {
        for (const r of content.replies) {
            try {
                const url = r.target.startsWith('http') ? r.target : `https://x.com/i/status/${r.target}`;
                const args = ['--token', authToken, '--target', url, '--text', r.text];
                if (r.media) args.push('--media', r.media);
                const res = await runPythonScript('nodriver_reply.py', args);
                results.push({ type: 'reply', target: r.target, ...res });
                await new Promise(r2 => setTimeout(r2, 5000));
            } catch (e) {
                results.push({ type: 'reply', success: false, error: e.message });
            }
        }
    }

    // QUOTES
    if (content.quotes?.length) {
        for (const q of content.quotes) {
            try {
                const url = q.target.startsWith('http') ? q.target : `https://x.com/i/status/${q.target}`;
                const args = ['--token', authToken, '--target', url, '--text', q.text];
                if (q.media) args.push('--media', q.media);
                const res = await runPythonScript('nodriver_quote.py', args);
                results.push({ type: 'quote', target: q.target, ...res });
                await new Promise(r2 => setTimeout(r2, 5000));
            } catch (e) {
                results.push({ type: 'quote', success: false, error: e.message });
            }
        }
    }

    return results;
}

async function executeFacebookAutomation(authToken, content, accountName) {
    const results = [];
    
    // Only execute if there are fb_posts
    if (!content.fb_posts?.length) return results;

    try {
        // 1. Login with cookies
        const loginRes = await fb_login({ cookie: authToken });
        if (!loginRes.success) {
            return [{ type: 'login_failed', success: false, error: loginRes.error }];
        }

        // 2. Post to timeline
        for (const post of content.fb_posts) {
            try {
                const res = await fb_post_timeline({ text: post.text });
                results.push({ type: 'fb_post', text: post.text.substring(0, 30), ...res });
                await new Promise(r => setTimeout(r, 6000)); // Facebook needs longer delays
            } catch (e) {
                results.push({ type: 'fb_post', success: false, error: e.message });
            }
        }
    } finally {
        await closeBrowser(); // Clean up to avoid crossing sessions between accounts
    }

    return results;
}

// ─── Campaign Tools ───────────────────────────────────────────────────────────

/**
 * Create a new campaign in the database
 */
export async function x_create_campaign({ name, tweets = [], fb_posts = [], replies = [], quotes = [], schedule, accountIds = [] }) {
    try {
        const content = { tweets, fb_posts, replies, quotes };
        const config = { target_accounts: accountIds };

        const campaign = await prisma.campaign.create({
            data: {
                name,
                platform: 'twitter',
                status: 'draft',
                schedule: schedule ? new Date(schedule) : null,
                content: JSON.stringify(content),
                config: JSON.stringify(config),
                stats: JSON.stringify({ created_via: 'mcp' }),
            },
        });

        return {
            success: true,
            campaign: {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                schedule: campaign.schedule,
                tweetsCount: tweets.length,
                fbPostsCount: fb_posts.length,
                repliesCount: replies.length,
                quotesCount: quotes.length,
                accountIds,
            },
            message: `Campaign "${name}" created with ID: ${campaign.id}`,
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * List all campaigns
 */
export async function x_list_campaigns({ status } = {}) {
    try {
        const where = status ? { status } : {};
        const campaigns = await prisma.campaign.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return {
            success: true,
            count: campaigns.length,
            campaigns: campaigns.map(c => ({
                id: c.id,
                name: c.name,
                status: c.status,
                platform: c.platform,
                schedule: c.schedule,
                createdAt: c.createdAt,
            })),
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Run/execute a campaign
 */
export async function x_run_campaign({ campaignId }) {
    try {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign) return { success: false, error: `Campaign ${campaignId} not found` };

        const config = JSON.parse(campaign.config || '{}');
        const content = JSON.parse(campaign.content || '{}');
        const accountIds = config.target_accounts || [];

        if (accountIds.length === 0) {
            return { success: false, error: 'No accounts configured for this campaign. Use x_create_campaign with accountIds, or update the campaign.' };
        }

        // Mark as active
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'active' } });

        const allResults = [];
        for (const accId of accountIds) {
            const account = await prisma.socialAccount.findUnique({ where: { id: accId.toString() } });
            if (!account?.token) {
                allResults.push({ account: accId, success: false, error: 'Account or token not found' });
                continue;
            }
            // Fire and collect (non-blocking for large campaigns)
            let results;
            if (account.platform === 'facebook') {
                results = await executeFacebookAutomation(account.token, content, account.name);
            } else {
                results = await executeAutomationForAccount(account.token, content, account.name);
            }
            allResults.push({ account: account.name, platform: account.platform, results });
        }

        await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'completed' } });

        return {
            success: true,
            campaignId,
            message: `Campaign "${campaign.name}" executed`,
            results: allResults,
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Delete a campaign
 */
export async function x_delete_campaign({ campaignId }) {
    try {
        await prisma.campaign.delete({ where: { id: campaignId } });
        return { success: true, message: `Campaign ${campaignId} deleted` };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ─── Account Tools ────────────────────────────────────────────────────────────

/**
 * Add an X/Twitter account to the system
 */
export async function x_add_account({ name, cookie, country = 'unknown', platform = 'twitter' }) {
    try {
        const id = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const account = await prisma.socialAccount.upsert({
            where: { id },
            create: { id, name, token: cookie, country, isSuspended: false, platform },
            update: { name, token: cookie, country, platform },
        });
        return {
            success: true,
            account: { id: account.id, name: account.name, country: account.country, platform: account.platform },
            message: `Account "${name}" added successfully`,
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * List all saved accounts
 */
export async function x_list_accounts() {
    try {
        const accounts = await prisma.socialAccount.findMany({ orderBy: { id: 'asc' } });
        return {
            success: true,
            count: accounts.length,
            accounts: accounts.map(a => ({
                id: a.id,
                name: a.name,
                country: a.country,
                isSuspended: a.isSuspended,
                hasToken: !!a.token,
            })),
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Remove a saved account
 */
export async function x_remove_account({ accountId }) {
    try {
        await prisma.socialAccount.delete({ where: { id: accountId } });
        return { success: true, message: `Account ${accountId} removed` };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ─── Facebook Aliases ────────────────────────────────────────────────────────

export async function fb_add_account({ name, cookie, country = 'unknown' }) {
    return x_add_account({ name, cookie, country, platform: 'facebook' });
}

export async function fb_list_accounts() {
    return x_list_accounts(); // Returns all accounts regardless of platform
}

export async function fb_remove_account({ accountId }) {
    return x_remove_account({ accountId });
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const dbToolMap = {
    x_create_campaign,
    x_list_campaigns,
    x_run_campaign,
    x_delete_campaign,
    x_add_account,
    x_list_accounts,
    x_remove_account,
    fb_add_account,
    fb_list_accounts,
    fb_remove_account,
};

export default dbToolMap;
