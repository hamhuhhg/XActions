/**
 * XActions Automation Modules
 *
 * Central registry of browser-side growth, moderation, and interaction automation scripts.
 * Can be read directly for browser console injection or evaluated in headless browser sessions.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTOMATION_SCRIPTS = {
  core: path.join(__dirname, 'core.js'),
  actions: path.join(__dirname, 'actions.js'),
  autoLiker: path.join(__dirname, 'autoLiker.js'),
  autoCommenter: path.join(__dirname, 'autoCommenter.js'),
  autoPoster: path.join(__dirname, 'autoPoster.js'),
  customerService: path.join(__dirname, 'customerService.js'),
  followEngagers: path.join(__dirname, 'followEngagers.js'),
  followTargetUsers: path.join(__dirname, 'followTargetUsers.js'),
  growthSuite: path.join(__dirname, 'growthSuite.js'),
  keywordFollow: path.join(__dirname, 'keywordFollow.js'),
  linkScraper: path.join(__dirname, 'linkScraper.js'),
  multiAccount: path.join(__dirname, 'multiAccount.js'),
  protectActiveUsers: path.join(__dirname, 'protectActiveUsers.js'),
  quotaSupervisor: path.join(__dirname, 'quotaSupervisor.js'),
  sessionLogger: path.join(__dirname, 'sessionLogger.js'),
  smartUnfollow: path.join(__dirname, 'smartUnfollow.js'),
};

/**
 * Read the raw script source for browser console injection or page.evaluate()
 * @param {keyof typeof AUTOMATION_SCRIPTS} scriptName
 * @returns {string} script source code
 */
export function getScriptSource(scriptName) {
  const scriptPath = AUTOMATION_SCRIPTS[scriptName];
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    throw new Error(`Automation script "${scriptName}" not found.`);
  }
  return fs.readFileSync(scriptPath, 'utf8');
}

/**
 * Get core setup script bundled with an automation script for execution
 * @param {keyof typeof AUTOMATION_SCRIPTS} scriptName
 * @returns {string} combined source code
 */
export function getBundledScript(scriptName) {
  const coreSrc = getScriptSource('core');
  if (scriptName === 'core') return coreSrc;
  const scriptSrc = getScriptSource(scriptName);
  return `${coreSrc}\n\n${scriptSrc}`;
}

export default AUTOMATION_SCRIPTS;
