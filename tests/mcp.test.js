import { describe, it, expect } from 'vitest';
import { TOOLS } from '../src/mcp/server.js';

describe('XActions MCP Server Tools Registry', () => {
  it('should export an array of tool definitions', () => {
    expect(TOOLS).toBeDefined();
    expect(Array.isArray(TOOLS)).toBe(true);
    expect(TOOLS.length).toBeGreaterThanOrEqual(25);
  });

  it('should validate every tool has a valid schema structure', () => {
    for (const tool of TOOLS) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('should contain all essential X/Twitter automation tools', () => {
    const toolNames = TOOLS.map((t) => t.name);

    // Auth
    expect(toolNames).toContain('x_login');
    expect(toolNames).toContain('x_get_profile');

    // Scraping
    expect(toolNames).toContain('x_get_followers');
    expect(toolNames).toContain('x_get_following');
    expect(toolNames).toContain('x_get_non_followers');
    expect(toolNames).toContain('x_get_tweets');
    expect(toolNames).toContain('x_search_tweets');
    expect(toolNames).toContain('x_get_thread');

    // Actions
    expect(toolNames).toContain('x_post_tweet');
    expect(toolNames).toContain('x_reply');
    expect(toolNames).toContain('x_like');
    expect(toolNames).toContain('x_retweet');
    expect(toolNames).toContain('x_follow');
    expect(toolNames).toContain('x_unfollow');
    expect(toolNames).toContain('x_unfollow_non_followers');
  });

  it('should have properly defined required fields for core actions', () => {
    const loginTool = TOOLS.find((t) => t.name === 'x_login');
    expect(loginTool?.inputSchema.required).toContain('cookie');

    const postTweetTool = TOOLS.find((t) => t.name === 'x_post_tweet');
    expect(postTweetTool?.inputSchema.required).toContain('text');

    const replyTool = TOOLS.find((t) => t.name === 'x_reply');
    expect(replyTool?.inputSchema.required).toContain('tweetUrl');
    expect(replyTool?.inputSchema.required).toContain('text');
  });

  it('should contain Facebook tools including fb_warmup_accounts', () => {
    const toolNames = TOOLS.map((t) => t.name);
    expect(toolNames).toContain('fb_login');
    expect(toolNames).toContain('fb_get_profile');
    expect(toolNames).toContain('fb_get_group_posts');
    expect(toolNames).toContain('fb_post_timeline');
    expect(toolNames).toContain('fb_reply_comment');
    expect(toolNames).toContain('fb_warmup_accounts');

    const warmupTool = TOOLS.find((t) => t.name === 'fb_warmup_accounts');
    expect(warmupTool?.inputSchema.properties).toHaveProperty('likesCount');
    expect(warmupTool?.inputSchema.properties).toHaveProperty('variance');
    expect(warmupTool?.inputSchema.properties).toHaveProperty('delayMin');
    expect(warmupTool?.inputSchema.properties).toHaveProperty('delayMax');
  });
});
