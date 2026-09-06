import { describe, it, expect } from 'vitest';
import { AUTOMATION_SCRIPTS, getScriptSource, getBundledScript } from '../src/automation/index.js';
import * as XActions from '../src/index.js';

describe('XActions Automation Module Registry', () => {
  it('should export all automation script definitions', () => {
    expect(AUTOMATION_SCRIPTS).toBeDefined();
    expect(AUTOMATION_SCRIPTS.core).toBeDefined();
    expect(AUTOMATION_SCRIPTS.autoLiker).toBeDefined();
    expect(AUTOMATION_SCRIPTS.autoCommenter).toBeDefined();
    expect(AUTOMATION_SCRIPTS.smartUnfollow).toBeDefined();
  });

  it('should load script source code successfully', () => {
    const coreSource = getScriptSource('core');
    expect(typeof coreSource).toBe('string');
    expect(coreSource.length).toBeGreaterThan(100);
    expect(coreSource).toContain('window.XActions');
  });

  it('should bundle core with target script', () => {
    const bundled = getBundledScript('autoLiker');
    expect(bundled).toContain('window.XActions');
    expect(bundled).toContain('Auto-Liker');
  });

  it('should be exposed via main package entrypoint', () => {
    expect(XActions.AUTOMATION_SCRIPTS).toBeDefined();
    expect(typeof XActions.getScriptSource).toBe('function');
    expect(XActions.automation).toBeDefined();
  });
});
