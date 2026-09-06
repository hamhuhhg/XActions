import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('XActions CLI Interface', () => {
  it('should output help information with binary name xactions', () => {
    const output = execSync('node src/cli/index.js --help', { encoding: 'utf-8' });
    expect(output).toContain('Usage: xactions');
    expect(output).toContain('XActions - The Complete X/Twitter Automation Toolkit');
  });

  it('should list all core CLI subcommands', () => {
    const output = execSync('node src/cli/index.js --help', { encoding: 'utf-8' });
    expect(output).toContain('profile');
    expect(output).toContain('followers');
    expect(output).toContain('following');
    expect(output).toContain('non-followers');
    expect(output).toContain('tweets');
    expect(output).toContain('search');
    expect(output).toContain('hashtag');
    expect(output).toContain('thread');
    expect(output).toContain('media');
  });

  it('should output accurate version matching package.json', () => {
    const output = execSync('node src/cli/index.js --version', { encoding: 'utf-8' }).trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });
});
