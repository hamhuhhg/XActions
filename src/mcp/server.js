#!/usr/bin/env node
/**
 * XActions MCP Server
 * Model Context Protocol server for AI agents (Claude, GPT, etc.)
 * 
 * This enables AI assistants to automate X/Twitter tasks directly.
 * 
 * Modes:
 * - LOCAL (default): Free, uses Puppeteer for browser automation
 * - REMOTE: Paid via x402 protocol, uses XActions cloud API
 * 
 * Environment Variables:
 * - XACTIONS_MODE: 'local' (default) or 'remote'
 * - XACTIONS_API_URL: API URL for remote mode (default: https://api.xactions.app)
 * - X402_PRIVATE_KEY: Wallet private key for x402 payments (remote mode)
 * - X402_NETWORK: 'base-sepolia' (testnet, default) or 'base' (mainnet)
 * - XACTIONS_SESSION_COOKIE: X/Twitter auth_token cookie
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Configuration
// ============================================================================

const MODE = process.env.XACTIONS_MODE || 'local';
const API_URL = process.env.XACTIONS_API_URL || 'https://api.xactions.app';
const X402_PRIVATE_KEY = process.env.X402_PRIVATE_KEY;
const X402_NETWORK = process.env.X402_NETWORK || 'base-sepolia';
const SESSION_COOKIE = process.env.XACTIONS_SESSION_COOKIE;

// Dynamic backend (initialized at startup)
let localTools = null;
let dbTools = null;
let fbTools = null;
let remoteClient = null;

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: 'x_login',
    description: 'Login to X/Twitter using a session cookie (auth_token). Required before some operations.',
    inputSchema: {
      type: 'object',
      properties: {
        cookie: {
          type: 'string',
          description: 'The auth_token cookie value from X.com',
        },
      },
      required: ['cookie'],
    },
  },
  {
    name: 'fb_login',
    description: 'Login to Facebook using c_user and xs cookies. Required before Facebook operations.',
    inputSchema: {
      type: 'object',
      properties: {
        cookie: {
          type: 'string',
          description: 'JSON string containing {"c_user":"...","xs":"..."} cookies for Facebook',
        },
      },
      required: ['cookie'],
    },
  },
  {
    name: 'x_get_profile',
    description: 'Get profile information for an X/Twitter user including bio, follower count, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (without @)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'fb_get_profile',
    description: 'Get basic profile info (name, bio) from a Facebook user or page URL. Requires fb_login first.',
    inputSchema: {
      type: 'object',
      properties: {
        profileUrl: {
          type: 'string',
          description: 'Full URL to the Facebook profile or page',
        },
      },
      required: ['profileUrl'],
    },
  },
  {
    name: 'fb_get_group_posts',
    description: 'Scrape posts from a Facebook group URL. Requires fb_login first.',
    inputSchema: {
      type: 'object',
      properties: {
        groupUrl: {
          type: 'string',
          description: 'Full URL to the Facebook group',
        },
        limit: {
          type: 'number',
          description: 'Maximum posts to fetch',
        },
      },
      required: ['groupUrl'],
    },
  },
  {
    name: 'fb_post_timeline',
    description: 'Post text to the currently logged in Facebook timeline. Requires fb_login first.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text content to post on the timeline',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'fb_reply_comment',
    description: 'Reply or comment on a Facebook post. Requires fb_login first.',
    inputSchema: {
      type: 'object',
      properties: {
        postUrl: {
          type: 'string',
          description: 'URL of the Facebook post',
        },
        text: {
          type: 'string',
          description: 'The comment text to post',
        },
      },
      required: ['postUrl', 'text'],
    },
  },
  {
    name: 'x_get_followers',
    description: 'Scrape followers for an X/Twitter account. Returns usernames, names, and bios.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (without @)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of followers to scrape (default: 100)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_following',
    description: 'Scrape accounts that a user is following. Includes whether they follow back.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (without @)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number to scrape (default: 100)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_non_followers',
    description: 'Get accounts you follow that do not follow you back.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Your Twitter username (without @)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_tweets',
    description: 'Scrape recent tweets from a user profile.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (without @)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tweets (default: 50)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_search_tweets',
    description: 'Search for tweets matching a query. Returns latest tweets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (can include operators like from:, to:, #hashtag)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 50)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'x_follow',
    description: 'Follow an X/Twitter user.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to follow (without @)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_unfollow',
    description: 'Unfollow an X/Twitter user.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to unfollow (without @)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_unfollow_non_followers',
    description: 'Bulk unfollow accounts that don\'t follow you back.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Your username to analyze',
        },
        maxUnfollows: {
          type: 'number',
          description: 'Maximum accounts to unfollow (default: 100)',
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview without actually unfollowing (default: false)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_detect_unfollowers',
    description: 'Get current followers for comparison. Run periodically to detect unfollowers.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to track followers for',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_post_tweet',
    description: 'Post a new tweet to X/Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Tweet content (max 280 characters)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'x_like',
    description: 'Like a tweet by its URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the tweet to like',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'x_retweet',
    description: 'Retweet a tweet by its URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the tweet to retweet',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'x_download_video',
    description: 'Get video download URLs from a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: {
          type: 'string',
          description: 'URL of the tweet containing video',
        },
      },
      required: ['tweetUrl'],
    },
  },
  // ── Phase 1: Core Interaction Tools ────────────────────────────────────────
  {
    name: 'x_reply',
    description: 'Reply to a specific tweet by its URL. Requires login first.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: {
          type: 'string',
          description: 'Full URL of the tweet to reply to (e.g. https://x.com/user/status/123)',
        },
        text: {
          type: 'string',
          description: 'Reply text content (max 280 characters)',
        },
      },
      required: ['tweetUrl', 'text'],
    },
  },
  {
    name: 'x_quote_tweet',
    description: 'Quote-tweet a tweet with commentary. Requires login first.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: {
          type: 'string',
          description: 'Full URL of the tweet to quote',
        },
        text: {
          type: 'string',
          description: 'Your commentary text to add above the quoted tweet (max 280 chars)',
        },
      },
      required: ['tweetUrl', 'text'],
    },
  },
  {
    name: 'x_get_trends',
    description: 'Get current trending topics/hashtags for a specific country or worldwide. Useful for content strategy.',
    inputSchema: {
      type: 'object',
      properties: {
        country: {
          type: 'string',
          description: 'Country name (e.g. "worldwide", "Saudi Arabia", "United States", "Egypt"). Default: worldwide',
        },
        limit: {
          type: 'number',
          description: 'Number of trends to return (default: 10, max: 50)',
        },
      },
    },
  },
  {
    name: 'x_check_suspension',
    description: 'Check if an X/Twitter account is suspended, not found, or active.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to check (without @)',
        },
      },
      required: ['username'],
    },
  },
  // ── Phase 2: Campaign Management ──────────────────────────────────────────
  {
    name: 'x_create_campaign',
    description: 'Create a new automation campaign with tweets, replies, and/or quotes. Store it in the database for execution.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Campaign name' },
        tweets: {
          type: 'array',
          description: 'Array of tweets to post. Each: { text, media? }',
          items: { type: 'object', properties: { text: { type: 'string' }, media: { type: 'string' } }, required: ['text'] },
        },
        fb_posts: {
          type: 'array',
          description: 'Array of Facebook posts. Each: { text }',
          items: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
        },
        replies: {
          type: 'array',
          description: 'Array of replies. Each: { target (tweet URL or ID), text, media? }',
          items: { type: 'object', properties: { target: { type: 'string' }, text: { type: 'string' } }, required: ['target', 'text'] },
        },
        quotes: {
          type: 'array',
          description: 'Array of quote-tweets. Each: { target (tweet URL or ID), text, media? }',
          items: { type: 'object', properties: { target: { type: 'string' }, text: { type: 'string' } }, required: ['target', 'text'] },
        },
        schedule: { type: 'string', description: 'ISO date string for scheduled run (optional, e.g. "2025-03-01T09:00:00Z")' },
        accountIds: {
          type: 'array',
          description: 'Account IDs to run this campaign on (from x_list_accounts)',
          items: { type: 'string' },
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'x_list_campaigns',
    description: 'List all campaigns saved in the database. Optionally filter by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'active', 'completed', 'paused'],
          description: 'Filter by status (optional)',
        },
      },
    },
  },
  {
    name: 'x_run_campaign',
    description: 'Execute a campaign now. Runs all configured tweets/replies/quotes on the campaign accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID (from x_list_campaigns or x_create_campaign result)' },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'x_delete_campaign',
    description: 'Delete a campaign from the database.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'Campaign ID to delete' },
      },
      required: ['campaignId'],
    },
  },
  // ── Phase 3: Multi-Account Management ─────────────────────────────────────
  {
    name: 'x_add_account',
    description: 'Save an X/Twitter account (auth_token cookie) to the system for campaigns and multi-account operations.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Friendly name for the account (e.g. "main", "news_account")' },
        cookie: { type: 'string', description: 'auth_token cookie value from X.com' },
        country: { type: 'string', description: 'Country/region label for organization (optional)' },
      },
      required: ['name', 'cookie'],
    },
  },
  {
    name: 'x_list_accounts',
    description: 'List all saved X/Twitter accounts in the system.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x_remove_account',
    description: 'Remove a saved account from the system.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account ID to remove (from x_list_accounts)' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'fb_add_account',
    description: 'Save a Facebook account to the system. Provide c_user and xs cookies.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Friendly name for the account' },
        cookie: { type: 'string', description: 'JSON string containing {"c_user":"...","xs":"..."}' },
        country: { type: 'string', description: 'Country/region label' },
      },
      required: ['name', 'cookie'],
    },
  },
  {
    name: 'fb_list_accounts',
    description: 'List all saved Facebook (and X) accounts in the system.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'fb_remove_account',
    description: 'Remove a saved Facebook account from the system.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account ID to remove' },
      },
      required: ['accountId'],
    },
  },
  // ── Phase 4: Advanced Scrapers ─────────────────────────────────────────────
  {
    name: 'x_get_bookmarks',
    description: 'Scrape your saved bookmarks from X/Twitter. Requires login first.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum bookmarks to return (default: 100)' },
      },
    },
  },
  {
    name: 'x_get_thread',
    description: 'Unroll and scrape a full tweet thread by its URL. Returns all tweets in chronological order.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'URL of any tweet in the thread (e.g. https://x.com/user/status/123)' },
      },
      required: ['tweetUrl'],
    },
  },
  {
    name: 'x_get_viral_tweets',
    description: 'Find high-engagement/viral tweets for a search query. Sorted by likes, retweets, or total engagement.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or hashtag to find viral tweets for' },
        minLikes: { type: 'number', description: 'Minimum likes threshold (default: 100)' },
        limit: { type: 'number', description: 'Maximum tweets to return (default: 50)' },
        sortBy: {
          type: 'string',
          enum: ['likes', 'retweets', 'replies', 'engagement'],
          description: 'Sort order (default: likes)',
        },
      },
      required: ['query'],
    },
  },
];

// ============================================================================
// Backend Initialization
// ============================================================================

/**
 * Initialize the appropriate backend based on mode
 */
async function initializeBackend() {
  if (MODE === 'remote') {
    console.error('🌐 XActions MCP Server: Remote mode');
    console.error('   API: ' + API_URL);
    console.error('   Payments: x402 protocol');

    if (!X402_PRIVATE_KEY) {
      console.error('⚠️  X402_PRIVATE_KEY not set - payment-required requests will fail');
      console.error('   Set it to enable automatic payments for API calls');
    }

    const { createX402Client } = await import('./x402-client.js');
    remoteClient = await createX402Client({
      apiUrl: API_URL,
      privateKey: X402_PRIVATE_KEY,
      sessionCookie: SESSION_COOKIE,
      network: X402_NETWORK,
    });

  } else {
    console.error('💻 XActions MCP Server: Local mode (free)');
    console.error('   Using Puppeteer for browser automation');

    const tools = await import('./local-tools.js');
    localTools = tools.toolMap || tools.default || tools;

    // Load DB tools (campaigns & account management via Prisma)
    try {
      const dbMod = await import('./db-tools.js');
      dbTools = dbMod.dbToolMap || dbMod.default || dbMod;
      console.error('   DB tools loaded (campaigns & accounts)');
    } catch (dbErr) {
      console.error('   ⚠️  DB tools unavailable:', dbErr.message);
    }

    // Load Facebook tools
    try {
      const fbMod = await import('./facebook-tools.js');
      fbTools = fbMod.fbToolMap || fbMod.default || fbMod;
      console.error('   Facebook tools loaded');
    } catch (fbErr) {
      console.error('   ⚠️  Facebook tools unavailable:', fbErr.message);
    }

    if (SESSION_COOKIE) {
      console.error('   Session cookie provided - will authenticate');
    }
  }
}

/**
 * Execute a tool using the appropriate backend
 */
async function executeTool(name, args) {
  // Add session cookie to args if provided globally
  if (SESSION_COOKIE && !args.cookie && name === 'x_login') {
    args.cookie = SESSION_COOKIE;
  }

  if (MODE === 'remote') {
    return await remoteClient.execute(name, args);
  } else {
    // DB tools (campaigns/accounts) take priority over local puppeteer tools
    if (dbTools && typeof dbTools[name] === 'function') {
      return await dbTools[name](args);
    }
    // Check Facebook tools
    if (fbTools && typeof fbTools[name] === 'function') {
      return await fbTools[name](args);
    }
    const toolFn = localTools[name];
    if (!toolFn) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await toolFn(args);
  }
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'xactions-mcp',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Execute tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeTool(name, args || {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };

  } catch (error) {
    // Handle x402 payment errors specially
    if (error.code === 'PAYMENT_REQUIRED') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Payment required',
              message: error.message,
              price: error.price,
              network: error.network || X402_NETWORK,
              hint: 'Set X402_PRIVATE_KEY with a funded wallet to enable automatic payments',
              faucet: X402_NETWORK === 'base-sepolia'
                ? 'Get testnet USDC: https://faucet.circle.com/'
                : 'Ensure wallet has USDC on Base',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    if (error.code === 'PAYMENT_FAILED') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Payment failed',
              message: error.message,
              hint: 'Check wallet balance and try again',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Generic error
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            ...(process.env.DEBUG ? { stack: error.stack } : {}),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Cleanup and Startup
// ============================================================================

// Cleanup on exit
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down...');
  if (MODE === 'local' && localTools?.closeBrowser) {
    await localTools.closeBrowser();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (MODE === 'local' && localTools?.closeBrowser) {
    await localTools.closeBrowser();
  }
  process.exit(0);
});

// Start server
async function main() {
  console.error('');
  console.error('⚡ XActions MCP Server v3.0.0');
  console.error('   https://github.com/nirholas/XActions');
  console.error('');

  await initializeBackend();

  console.error('');
  console.error('📋 Available tools: ' + TOOLS.length);
  console.error('');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✅ Server running on stdio');
  console.error('   Ready for connections from Claude, Cursor, etc.');
  console.error('');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
