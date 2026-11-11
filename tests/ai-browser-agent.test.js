import { describe, it, expect } from 'vitest';
import {
  normalizeBaseUrl,
  parseResultBlock,
  buildFacebookAgentPrompt,
  BROWSER_TOOLS,
} from '../src/automation/ai-browser-agent.js';

describe('AI Browser Agent Module', () => {
  describe('normalizeBaseUrl', () => {
    it('should normalize default OpenAI url', () => {
      expect(normalizeBaseUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1');
    });

    it('should strip trailing slashes and /chat/completions', () => {
      expect(normalizeBaseUrl('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/v1');
      expect(normalizeBaseUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
    });

    it('should add /v1 to bare origins', () => {
      expect(normalizeBaseUrl('http://localhost:11434')).toBe('http://localhost:11434/v1');
    });
  });

  describe('parseResultBlock', () => {
    it('should parse valid json result block', () => {
      const text = `
Here is my analysis.
\`\`\`json
{
  "status": "submitted",
  "clicked_post": true,
  "post_url": null,
  "commented": true,
  "note": "Post verified live on timeline"
}
\`\`\`
Done.`;
      const result = parseResultBlock(text);
      expect(result).not.toBeNull();
      expect(result.status).toBe('submitted');
      expect(result.clicked_post).toBe(true);
      expect(result.commented).toBe(true);
      expect(result.note).toBe('Post verified live on timeline');
    });

    it('should parse pending_approval status', () => {
      const text = `\`\`\`json
{
  "status": "pending_approval",
  "clicked_post": true,
  "note": "Post submitted for admin review in group"
}
\`\`\``;
      const result = parseResultBlock(text);
      expect(result.status).toBe('pending_approval');
      expect(result.clicked_post).toBe(true);
    });

    it('should return null for malformed or missing blocks', () => {
      expect(parseResultBlock('No json here')).toBeNull();
      expect(parseResultBlock('```json\n{"status":"unknown"}\n```')).toBeNull();
    });
  });

  describe('buildFacebookAgentPrompt', () => {
    it('should preserve exact user post content between markers', () => {
      const userText = 'مرحباً بكم في منصتنا الجديدة! عرض حصري اليوم فقط.';
      const prompt = buildFacebookAgentPrompt({
        post: { text: userText, targetUrl: 'https://www.facebook.com/me' },
        accountName: 'TechAccount',
      });

      expect(prompt).toContain('<<<POST_TEXT');
      expect(prompt).toContain(userText);
      expect(prompt).toContain('POST_TEXT>>>');
      expect(prompt).toContain('Destination: Account Owner\'s Facebook Timeline/Profile');
    });

    it('should include group membership instructions when targeting a Facebook group', () => {
      const prompt = buildFacebookAgentPrompt({
        post: { text: 'سؤال تقني مهم', targetUrl: 'https://www.facebook.com/groups/tech_group_123/' },
        accountName: 'TechAccount',
      });

      expect(prompt).toContain('Destination: Facebook GROUP (https://www.facebook.com/groups/tech_group_123/)');
      expect(prompt).toContain('MEMBERSHIP FIRST:');
      expect(prompt).toContain('Join group');
      expect(prompt).toContain('awaiting_join');
    });

    it('should include first comment instructions when specified by user', () => {
      const firstComment = 'الرابط للتسجيل: https://example.com/register';
      const prompt = buildFacebookAgentPrompt({
        post: {
          text: 'منشور رئيسي مع تفاصيل',
          firstComment: firstComment,
        },
        accountName: 'TechAccount',
      });

      expect(prompt).toContain('FIRST COMMENT INSTRUCTION:');
      expect(prompt).toContain('<<<COMMENT_TEXT');
      expect(prompt).toContain(firstComment);
      expect(prompt).toContain('COMMENT_TEXT>>>');
    });

    it('should include groups crossposting instructions when postToGroups is true', () => {
      const prompt = buildFacebookAgentPrompt({
        post: {
          text: 'منشور ترويجي في كل المجموعات',
          postToGroups: true,
        },
        accountName: 'TechAccount',
      });

      expect(prompt).toContain('GROUPS CROSSPOSTING INSTRUCTION');
      expect(prompt).toContain('select_post_groups');
      expect(prompt).toContain('النشر في كل المجموعات');
    });
  });

  describe('BROWSER_TOOLS Schema', () => {
    it('should export all essential browser tools for autonomous agent', () => {
      const toolNames = BROWSER_TOOLS.map(t => t.function.name);
      expect(toolNames).toContain('navigate');
      expect(toolNames).toContain('read_page');
      expect(toolNames).toContain('click');
      expect(toolNames).toContain('type_text');
      expect(toolNames).toContain('file_upload');
      expect(toolNames).toContain('wait');
      expect(toolNames).toContain('select_post_groups');
    });

    it('should have valid schema for each tool', () => {
      for (const tool of BROWSER_TOOLS) {
        expect(tool.type).toBe('function');
        expect(tool.function.name).toBeTypeOf('string');
        expect(tool.function.description).toBeTypeOf('string');
        expect(tool.function.parameters).toBeTypeOf('object');
      }
    });
  });

  describe('Model and Settings Resolution', () => {
    it('should properly recognize custom models passed via settings.model or settings.ai_model', () => {
      const customModel = 'meta/llama-3.1-70b-instruct';
      const settingsA = { model: customModel, baseUrl: 'https://integrate.api.nvidia.com/v1', apiKey: 'test' };
      const settingsB = { ai_model: customModel, ai_base_url: 'https://integrate.api.nvidia.com/v1', ai_api_key: 'test' };

      const resolvedModelA = settingsA.model || settingsA.ai_model;
      const resolvedModelB = settingsB.model || settingsB.ai_model;

      expect(resolvedModelA).toBe(customModel);
      expect(resolvedModelB).toBe(customModel);
    });
  });
});

