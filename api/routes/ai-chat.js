/**
 * XActions AI Chat Route
 * OpenAI-compatible API endpoint for AI chat with XActions tool use
 *
 * Supports any OpenAI-compatible API:
 *   - OpenAI (api.openai.com)
 *   - Anthropic (api.anthropic.com/v1)
 *   - Groq (api.groq.com/openai/v1)
 *   - DeepSeek (api.deepseek.com/v1)
 *   - Ollama (http://localhost:11434/v1)
 *   - LM Studio (http://localhost:1234/v1)
 *   - Any OpenAI-compatible endpoint
 */

import express from 'express';
import axios from 'axios';
import { toolMap } from '../../src/mcp/local-tools.js';
import { dbToolMap } from '../../src/mcp/db-tools.js';
import { fbToolMap } from '../../src/mcp/facebook-tools.js';

const router = express.Router();

// ─── All XActions Tools for AI Tool-Use ──────────────────────────────────────

const XACTIONS_TOOLS = [
  // Auth
  { name: 'x_login', description: 'Login to X/Twitter. Provide EITHER the accountId of a saved account OR the raw auth_token cookie.', parameters: { type: 'object', properties: { accountId: { type: 'string', description: 'ID of a saved account (preferred)' }, cookie: { type: 'string', description: 'Raw auth_token string from x.com' } } } },
  { name: 'fb_login', description: 'Login to Facebook. Provide EITHER the accountId of a saved account OR the raw JSON string cookie {"c_user":"...","xs":"..."}.', parameters: { type: 'object', properties: { accountId: { type: 'string', description: 'ID of a saved account (preferred)' }, cookie: { type: 'string', description: 'Raw JSON cookie string for Facebook' } } } },
  { name: 'x_get_profile', description: 'Get user profile info by username', parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },

  // Scraping
  { name: 'x_get_followers', description: 'Get followers list for a username', parameters: { type: 'object', properties: { username: { type: 'string' }, limit: { type: 'number', description: 'Max followers (default: 100)' } }, required: ['username'] } },
  { name: 'fb_get_profile', description: 'Get basic profile info (name, bio) from a Facebook user or page URL.', parameters: { type: 'object', properties: { profileUrl: { type: 'string', description: 'Full URL to the Facebook profile or page' } }, required: ['profileUrl'] } },
  { name: 'fb_get_group_posts', description: 'Scrape posts from a Facebook group URL.', parameters: { type: 'object', properties: { groupUrl: { type: 'string', description: 'Full URL to the Facebook group (e.g., https://www.facebook.com/groups/id/)' }, limit: { type: 'number', description: 'Max posts to fetch' } }, required: ['groupUrl'] } },
  { name: 'x_get_following', description: 'Get following list for a username', parameters: { type: 'object', properties: { username: { type: 'string' }, limit: { type: 'number' } }, required: ['username'] } },
  { name: 'x_get_non_followers', description: 'Find users who don\'t follow back', parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_get_tweets', description: 'Get recent tweets from a user profile', parameters: { type: 'object', properties: { username: { type: 'string' }, limit: { type: 'number' } }, required: ['username'] } },
  { name: 'x_search_tweets', description: 'Search tweets by keyword or hashtag', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
  { name: 'x_get_bookmarks', description: 'Scrape authenticated user bookmarks', parameters: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'x_get_thread', description: 'Unroll a full tweet thread', parameters: { type: 'object', properties: { tweetUrl: { type: 'string' } }, required: ['tweetUrl'] } },
  { name: 'x_get_viral_tweets', description: 'Find high-engagement tweets by search query', parameters: { type: 'object', properties: { query: { type: 'string' }, minLikes: { type: 'number' }, limit: { type: 'number' }, sortBy: { type: 'string', enum: ['likes', 'retweets', 'replies', 'engagement'] } }, required: ['query'] } },
  { name: 'x_get_trends', description: 'Get trending topics by country (worldwide, Saudi Arabia, United States, etc)', parameters: { type: 'object', properties: { country: { type: 'string' }, limit: { type: 'number' } } } },

  // Write actions
  { name: 'fb_post_timeline', description: 'Post to Facebook timeline', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'fb_reply_comment', description: 'Reply or comment on a Facebook post', parameters: { type: 'object', properties: { postUrl: { type: 'string' }, text: { type: 'string' } }, required: ['postUrl', 'text'] } },
  { name: 'x_post_tweet', description: 'Post a new tweet', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'x_reply', description: 'Reply to a tweet', parameters: { type: 'object', properties: { tweetUrl: { type: 'string' }, text: { type: 'string' } }, required: ['tweetUrl', 'text'] } },
  { name: 'x_quote_tweet', description: 'Quote-tweet with commentary', parameters: { type: 'object', properties: { tweetUrl: { type: 'string' }, text: { type: 'string' } }, required: ['tweetUrl', 'text'] } },
  { name: 'x_like', description: 'Like a tweet', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'x_retweet', description: 'Retweet a tweet', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'x_follow', description: 'Follow a user', parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_unfollow', description: 'Unfollow a user', parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_unfollow_non_followers', description: 'Bulk unfollow users who don\'t follow back', parameters: { type: 'object', properties: { username: { type: 'string' }, maxUnfollows: { type: 'number' }, dryRun: { type: 'boolean', description: 'If true, only shows who would be unfollowed without doing it' } }, required: ['username'] } },
  { name: 'x_detect_unfollowers', description: 'Get snapshot of current followers to track unfollowers', parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_check_suspension', description: 'Check if an account is suspended', parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] } },
  { name: 'x_download_video', description: 'Get video download URL from a tweet', parameters: { type: 'object', properties: { tweetUrl: { type: 'string' } }, required: ['tweetUrl'] } },

  // Campaigns
  { name: 'x_create_campaign', description: 'Create an automation campaign with tweets, replies, Facebook posts, and/or quotes', parameters: { type: 'object', properties: { name: { type: 'string' }, tweets: { type: 'array', items: { type: 'object' } }, fb_posts: { type: 'array', items: { type: 'object' } }, replies: { type: 'array', items: { type: 'object' } }, quotes: { type: 'array', items: { type: 'object' } }, accountIds: { type: 'array', items: { type: 'string' } } }, required: ['name'] } },
  { name: 'x_list_campaigns', description: 'List all saved campaigns', parameters: { type: 'object', properties: { status: { type: 'string' } } } },
  { name: 'x_run_campaign', description: 'Execute a campaign by ID', parameters: { type: 'object', properties: { campaignId: { type: 'string' } }, required: ['campaignId'] } },
  { name: 'x_delete_campaign', description: 'Delete a campaign by ID', parameters: { type: 'object', properties: { campaignId: { type: 'string' } }, required: ['campaignId'] } },

  // Accounts
  { name: 'x_add_account', description: 'Save an X/Twitter account (auth_token)', parameters: { type: 'object', properties: { name: { type: 'string' }, cookie: { type: 'string' }, country: { type: 'string' } }, required: ['name', 'cookie'] } },
  { name: 'x_list_accounts', description: 'List all saved accounts (both Twitter and Facebook)', parameters: { type: 'object', properties: {} } },
  { name: 'x_remove_account', description: 'Remove a saved account by ID', parameters: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] } },
  { name: 'fb_add_account', description: 'Save a Facebook account (c_user + xs JSON)', parameters: { type: 'object', properties: { name: { type: 'string' }, cookie: { type: 'string', description: 'JSON string: {"c_user":"...","xs":"..."}' }, country: { type: 'string' } }, required: ['name', 'cookie'] } },
  { name: 'fb_list_accounts', description: 'List all saved accounts (alias for x_list_accounts)', parameters: { type: 'object', properties: {} } },
  { name: 'fb_remove_account', description: 'Remove a saved Facebook account by ID', parameters: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] } },
];

// ─── Execute a Tool ───────────────────────────────────────────────────────────

async function executeTool(name, args, accounts = []) {
  if ((name === 'x_login' || name === 'fb_login') && args.accountId) {
    const acc = accounts.find(a => a.id === args.accountId || a.name === args.accountId);
    if (acc) {
      args.cookie = acc.token;
    }
  }

  const allTools = { ...toolMap, ...dbToolMap, ...fbToolMap };
  const fn = allTools[name];
  if (!fn) return { error: `Unknown tool: ${name}` };
  try {
    const result = await fn(args);
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are XActions AI, an intelligent X/Twitter automation assistant.
You have access to powerful tools for scraping, engaging, and managing Twitter/X accounts.

Key guidelines:
- Always confirm destructive actions (unfollow, delete) before executing them unless the user explicitly said to proceed
- For bulk operations, start with a dry run (dryRun: true) first and show the results
- When searching for trends or tweets, present results in a clear, organized format
- You can chain multiple tools together to accomplish complex goals
- Be concise in your responses but thorough in tool execution
- If the user hasn't provided an auth_token/cookie, remind them to do so for write actions

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

// ─── Chat Endpoint ────────────────────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  const { message, history = [], config = {} } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const apiKey = config.apiKey || process.env.AI_API_KEY || '';
  const model = config.model || 'gpt-4o-mini';
  const accounts = config.accounts || [];

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required. Configure it in the settings panel.' });
  }

  // Inject available accounts into system prompt
  let dynamicSystemPrompt = SYSTEM_PROMPT;
  if (accounts.length > 0) {
    dynamicSystemPrompt += `\n\n=== AVAILABLE ACCOUNTS ===\n`;
    dynamicSystemPrompt += `You have access to the following saved social media accounts:\n`;
    accounts.forEach(a => {
      const platform = a.platform || 'twitter';
      dynamicSystemPrompt += `- Platform: [${platform.toUpperCase()}] | accountId: "${a.id}" | Name: ${a.name} | Country: ${a.country}\n`;
    });
    dynamicSystemPrompt += `\nTo use any of these Twitter/X accounts, you MUST call the "x_login" tool and pass the "accountId". For Facebook accounts, use the respective "fb_login" tool or Facebook-specific tools when they become available.\nIf the user asks to use an account, switch to it using the appropriate login tool first before calling other action tools. Tools starting with "x_" are for Twitter/X ONLY, and tools starting with "fb_" are for Facebook ONLY.`;
  } else if (config.cookie) {
    dynamicSystemPrompt += `\n\n=== AUTHENTICATION ===\nThe user has provided a default authentication cookie. You can call "x_login" with this cookie to explicitly authenticate: ${config.cookie}\n`;
  }

  // Build messages array
  const messages = [
    { role: 'system', content: dynamicSystemPrompt },
    ...history,
    { role: 'user', content: message },
  ];

  // Build tools in OpenAI format
  const tools = XACTIONS_TOOLS.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const toolResults = [];
  let finalContent = '';
  let currentMessages = [...messages];

  try {
    // Agentic loop — continue until no more tool calls
    for (let iteration = 0; iteration < 10; iteration++) {
      const payload = {
        model,
        messages: currentMessages,
        tools,
        tool_choice: 'auto',
        max_tokens: 4096,
      };

      const response = await axios.post(`${baseUrl}/chat/completions`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      const choice = response.data.choices?.[0];
      const msg = choice?.message;

      if (!msg) break;

      // Add assistant message to history
      currentMessages.push(msg);

      // If no tool calls → final response
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        finalContent = msg.content || '';
        break;
      }

      // Execute all tool calls in parallel
      const toolCallResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          const toolName = tc.function.name;
          let toolArgs = {};
          try { toolArgs = JSON.parse(tc.function.arguments); } catch {}

          const result = await executeTool(toolName, toolArgs, accounts);
          toolResults.push({ tool: toolName, args: toolArgs, result });

          return {
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        })
      );

      // Add all tool results to messages
      currentMessages.push(...toolCallResults);

      // If stop reason is not tool_calls, break
      if (choice.finish_reason !== 'tool_calls') break;
    }

    return res.json({
      content: finalContent,
      toolResults,
      usage: { model, baseUrl },
    });

  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    const status = err.response?.status || 500;
    return res.status(status).json({ error: errMsg });
  }
});

// ─── List tools ──────────────────────────────────────────────────────────────

router.get('/tools', (_req, res) => {
  res.json({
    count: XACTIONS_TOOLS.length,
    tools: XACTIONS_TOOLS.map(t => ({ name: t.name, description: t.description })),
  });
});

export default router;
