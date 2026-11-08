/**
 * TurnstileSolver Node.js Client & Process Supervisor
 * Communicates with embedded TurnstileSolver Python engine (http://127.0.0.1:8191/v1)
 * Replaces Puppeteer and Camofox across XActions.
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import net from 'net';
import fs from 'fs';

let activeSolverUrl = process.env.TURNSTILE_SOLVER_URL || process.env.SOLVER_API_URL || null;
let solverProcess = null;
let isStartingServer = false;
let isSolverConfirmedRunning = false;

export function getApiBase() {
  if (activeSolverUrl) return activeSolverUrl;
  const portFile = path.resolve('solver/.solver_port');
  if (fs.existsSync(portFile)) {
    try {
      const filePort = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
      if (filePort) return `http://127.0.0.1:${filePort}`;
    } catch (e) {}
  }
  return 'http://127.0.0.1:8191';
}

function detectPythonCommand() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {}
  }
  return 'python';
}

async function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(preferred = 8191) {
  const candidates = [preferred, 8192, 8195, 8199, 8787, 38191];
  for (const p of candidates) {
    if (await isPortAvailable(p, '127.0.0.1')) {
      return p;
    }
  }
  return 8192;
}

/**
 * Ensure TurnstileSolver Python server is running
 */
export async function ensureSolverRunning() {
  // 1. If already confirmed running, quick check
  if (isSolverConfirmedRunning && activeSolverUrl) {
    try {
      const res = await fetch(`${activeSolverUrl}/health`, { signal: AbortSignal.timeout(800) });
      if (res.ok) return true;
    } catch (e) {
      isSolverConfirmedRunning = false;
    }
  }

  // 2. Check if an engine is already running or being started by another process
  const portFile = path.resolve('solver/.solver_port');
  if (fs.existsSync(portFile)) {
    try {
      const filePort = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
      if (filePort) {
        // Give an existing/starting engine up to 10 seconds to respond
        for (let i = 0; i < 20; i++) {
          try {
            const res = await fetch(`http://127.0.0.1:${filePort}/health`, { signal: AbortSignal.timeout(600) });
            if (res.ok) {
              activeSolverUrl = `http://127.0.0.1:${filePort}`;
              isSolverConfirmedRunning = true;
              return true;
            }
          } catch (e) {}
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } catch (e) {}
  }

  const portsToCheck = [8191, 8192, 8195, 8199, 8787, 38191];
  for (const p of portsToCheck) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/health`, { signal: AbortSignal.timeout(400) });
      if (res.ok) {
        activeSolverUrl = `http://127.0.0.1:${p}`;
        isSolverConfirmedRunning = true;
        return true;
      }
    } catch (e) {}
  }

  // 3. If starting is in progress in this process, wait for it
  if (isStartingServer) {
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 400));
      if (isSolverConfirmedRunning && activeSolverUrl) return true;
      attempts++;
    }
    return isSolverConfirmedRunning;
  }

  isStartingServer = true;

  try {
    const solverPath = path.resolve('solver/main.py');
    const pyCmd = detectPythonCommand();
    const chosenPort = await findAvailablePort(8191);
    activeSolverUrl = `http://127.0.0.1:${chosenPort}`;

    console.log(`[TurnstileSolver] Starting embedded Python solver engine on port ${chosenPort} using "${pyCmd}"...`);

    let errorOutput = '';
    solverProcess = spawn(pyCmd, ['-u', solverPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      detached: false,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        SOLVER_PORT: String(chosenPort),
        SOLVER_HOST: '127.0.0.1',
      },
    });

    solverProcess.stdout?.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) console.log(`[TurnstileSolver] ${msg}`);
    });

    solverProcess.stderr?.on('data', (d) => {
      const msg = d.toString().trim();
      errorOutput += msg + '\n';
      if (msg) console.log(`[TurnstileSolver] ${msg}`);
    });

    solverProcess.on('error', (err) => {
      console.error('[TurnstileSolver] Failed to spawn python solver process:', err.message);
    });

    solverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[TurnstileSolver] Process exited with code ${code}. Error details: ${errorOutput.trim() || 'Process terminated'}`);
      }
    });

    let attempts = 0;
    while (attempts < 50) {
      if (solverProcess.exitCode !== null && solverProcess.exitCode !== 0) {
        console.error(`[TurnstileSolver] Engine failed to start (Process exited with code ${solverProcess.exitCode}).`);
        isStartingServer = false;
        return false;
      }

      await new Promise((r) => setTimeout(r, 400));
      try {
        const res = await fetch(`${activeSolverUrl}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          console.log(`[TurnstileSolver] Engine successfully started and ready on ${activeSolverUrl}`);
          isStartingServer = false;
          isSolverConfirmedRunning = true;
          return true;
        }
      } catch (err) {}
      attempts++;
    }
  } catch (err) {
    console.error('[TurnstileSolver] Error launching solver process:', err);
  } finally {
    isStartingServer = false;
  }

  return false;
}

/**
 * Stop TurnstileSolver Python engine process
 */
export function stopSolverProcess() {
  isSolverConfirmedRunning = false;
  if (solverProcess && !solverProcess.killed) {
    console.log('[TurnstileSolver] Shutting down Python solver engine...');
    try {
      solverProcess.kill();
    } catch (e) {}
  }
}

export class TurnstileClient {
  constructor(userId = 'xactions_session') {
    this.userId = userId;
    this.sessionId = null;
    this.dataSaver = true;
    this.currentUrl = 'about:blank';
    this.currentHtml = '';
    this.currentCookies = [];
    this.turnstileToken = null;
    this.userCookiesToInject = [];
  }

  async _request(cmd, params = {}) {
    await ensureSolverRunning();
    const url = `${getApiBase()}/v1`;
    const payload = {
      cmd,
      session: this.sessionId,
      maxTimeout: params.maxTimeout || 60000,
      ...params,
    };

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || (data && data.status === 'error')) {
          throw new Error(`TurnstileSolver API Error: ${data?.message || res.statusText}`);
        }
        return data;
      } catch (err) {
        if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
          isSolverConfirmedRunning = false;
          if (attempts < 2) {
            console.log('[TurnstileSolver] Connection lost, reconnecting/starting solver engine...');
            await ensureSolverRunning();
            continue;
          }
          throw new Error(
            `Cannot connect to TurnstileSolver server at ${getApiBase()}. Ensure python & zendriver are installed.`
          );
        }
        throw err;
      }
    }
  }

  /**
   * Create or attach to a persistent browser session
   */
  async createSession(proxy = null, ttlMinutes = 60, dataSaver = true) {
    this.dataSaver = dataSaver;
    const res = await this._request('sessions.create', {
      session: this.userId,
      proxy,
      session_ttl_minutes: ttlMinutes,
      dataSaver: dataSaver,
    });
    this.sessionId = res.session;
    return this.sessionId;
  }

  /**
   * Destroy persistent session
   */
  async destroySession() {
    if (!this.sessionId) return;
    try {
      await this._request('sessions.destroy', { session: this.sessionId });
    } catch (e) {
      // Ignore if session already destroyed
    }
    this.sessionId = null;
  }

  /**
   * Import / queue cookies before request
   */
  async setCookie(...cookies) {
    const validCookies = [];
    for (const c of cookies) {
      const cookieObj = {
        name: c.name,
        value: c.value,
        domain: c.domain || undefined,
        path: c.path || '/',
        secure: c.secure !== undefined ? c.secure : true,
        httpOnly: c.httpOnly !== undefined ? c.httpOnly : false,
        expires: c.expires || undefined,
      };
      validCookies.push(cookieObj);
    }
    this.userCookiesToInject = validCookies;

    // If session is already created, apply cookies directly via CDP
    if (this.sessionId && validCookies.length > 0) {
      try {
        await this._request('sessions.set_cookies', { cookies: validCookies });
      } catch (e) {
        // Fallback to next request.get
      }
    }
    return true;
  }

  async importCookies(cookies) {
    return this.setCookie(...cookies);
  }

  async getCookies() {
    try {
      const res = await this._request('sessions.cookies');
      return res.cookies || [];
    } catch (e) {
      return null;
    }
  }

  async cookies() {
    return this.getCookies();
  }

  // Puppeteer stub methods
  async setUserAgent() {
    return true;
  }
  async setViewport() {
    return true;
  }
  async setBypassCSP() {
    return true;
  }
  async setDefaultNavigationTimeout() {
    return true;
  }

  /**
   * Navigate to URL using TurnstileSolver get/post
   */
  async goto(targetUrl, options = {}) {
    const effectiveDataSaver = options.dataSaver !== undefined ? options.dataSaver : (this.dataSaver !== undefined ? this.dataSaver : true);
    const effectiveDisableMedia = options.disableMedia !== undefined ? options.disableMedia : effectiveDataSaver;

    if (!this.sessionId) {
      await this.createSession(null, 60, effectiveDataSaver);
    }

    const payload = {
      url: targetUrl,
      maxTimeout: options.timeout || 60000,
      cookies: this.userCookiesToInject.length > 0 ? this.userCookiesToInject : undefined,
      disableMedia: effectiveDisableMedia,
      dataSaver: effectiveDataSaver,
    };

    const res = await this._request('request.get', payload);
    this.userCookiesToInject = []; // Reset after navigation
    if (res.solution) {
      this.currentUrl = res.solution.url || targetUrl;
      this.currentHtml = res.solution.response || '';
      this.currentCookies = res.solution.cookies || [];
      this.turnstileToken = res.solution.turnstile_token || null;
    }
    return res;
  }

  /**
   * Submit POST request using TurnstileSolver
   */
  async post(targetUrl, postData, options = {}) {
    const effectiveDataSaver = options.dataSaver !== undefined ? options.dataSaver : (this.dataSaver !== undefined ? this.dataSaver : true);
    const effectiveDisableMedia = options.disableMedia !== undefined ? options.disableMedia : effectiveDataSaver;

    if (!this.sessionId) {
      await this.createSession(null, 60, effectiveDataSaver);
    }

    const payload = {
      url: targetUrl,
      postData,
      maxTimeout: options.timeout || 60000,
      cookies: this.userCookiesToInject.length > 0 ? this.userCookiesToInject : undefined,
      disableMedia: effectiveDisableMedia,
      dataSaver: effectiveDataSaver,
    };

    const res = await this._request('request.post', payload);
    if (res.solution) {
      this.currentUrl = res.solution.url || targetUrl;
      this.currentHtml = res.solution.response || '';
      this.currentCookies = res.solution.cookies || [];
      this.turnstileToken = res.solution.turnstile_token || null;
    }
    return res;
  }

  url() {
    return this.currentUrl;
  }

  async content() {
    return this.currentHtml;
  }

  /**
   * Evaluate JS on live browser session or stored page state
   */
  async evaluate(fn, ...args) {
    let fnStr;
    if (typeof fn === 'function') {
      fnStr = `(${fn.toString()})(...${JSON.stringify(args)})`;
    } else if (typeof fn === 'string') {
      const trimmed = fn.trim();
      const isAlreadyInvoked = /\)\s*\([^\)]*\)\s*;?$/s.test(trimmed) || /\}\s*\([^\)]*\)\s*;?$/s.test(trimmed);
      if (isAlreadyInvoked) {
        fnStr = trimmed;
      } else if (/^\s*\(?\s*(function\b|(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>)/s.test(trimmed)) {
        fnStr = `(${trimmed})(...${JSON.stringify(args)})`;
      } else {
        fnStr = trimmed;
      }
    } else {
      fnStr = String(fn);
    }

    if (this.sessionId) {
      try {
        const res = await this._request('sessions.evaluate', { postData: fnStr });
        if (res && res.result !== undefined) {
          return res.result;
        }
      } catch (err) {
        // Fallback to local evaluation
      }
    }

    // In-memory DOM evaluation fallback if live eval unavailable
    try {
      const evalFunc = new Function('document', 'window', `return (${fnStr});`);
      const bodyText = (this.currentHtml || '').replace(/<[^>]+>/g, ' ');
      const mockDoc = {
        title: this.currentHtml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '',
        body: { textContent: bodyText, innerText: bodyText },
        querySelector: (sel) => null,
        querySelectorAll: (sel) => [],
      };
      return evalFunc(mockDoc, { location: { href: this.currentUrl } });
    } catch (e) {
      return null;
    }
  }

  async wait(opts) {
    if (typeof opts === 'number') {
      await new Promise(r => setTimeout(r, opts));
      return true;
    }
    const selector = typeof opts === 'string' ? opts : opts?.selector;
    const timeout = (typeof opts === 'object' && opts.timeout) || 10000;
    return await this.waitForSelector(selector, { timeout });
  }

  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || 10000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = await this.evaluate(`() => {
        const sel = ${JSON.stringify(selector)};
        const el = document.querySelector(sel);
        return !!(el && (el.offsetHeight > 0 || el.offsetWidth > 0 || el.getBoundingClientRect().height > 0));
      }`);
      if (found) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  }

  async click(selector) {
    return await this.evaluate(`() => {
      const sel = ${JSON.stringify(selector)};
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        return true;
      }
      return false;
    }`);
  }

  async type(selectorOrText, text = null) {
    let textToType = text;
    if (text === null && typeof selectorOrText === 'string') {
      textToType = selectorOrText;
    } else if (selectorOrText && text) {
      await this.evaluate(`(sel) => {
        const el = document.querySelector(sel);
        if (el) el.focus();
      }`, selectorOrText);
    }
    if (this.sessionId && textToType) {
      try {
        const res = await this._request('sessions.type', { postData: textToType });
        return res?.result ?? true;
      } catch (e) {
        // Fallback
      }
    }
    return true;
  }

  async sendFile(selectorOrPath, filePath = null) {
    let targetSelector = selectorOrPath;
    let targetPath = filePath;
    if (filePath === null && typeof selectorOrPath === 'string') {
      targetSelector = 'input[type="file"]';
      targetPath = selectorOrPath;
    }
    if (this.sessionId && targetPath) {
      try {
        const absPath = path.resolve(targetPath);
        const res = await this._request('sessions.send_file', {
          postData: absPath,
          turnstile_input_name: targetSelector,
        });
        return res?.result ?? true;
      } catch (e) {
        console.error('[TurnstileClient sendFile error]', e.message);
        return false;
      }
    }
    return false;
  }

  async screenshot(options = {}) {
    if (!this.sessionId) await this.createSession();
    const res = await this._request('request.get', {
      url: this.currentUrl,
      returnScreenshot: true,
    });
    return res.solution?.response || '';
  }

  async closeTab() {
    await this.destroySession();
  }

  async close() {
    await this.destroySession();
  }
}

export async function createBrowser(options = {}) {
  const client = new TurnstileClient(options.userId || 'xactions_session');
  await client.createSession(options.proxy, options.ttlMinutes);
  return {
    newPage: async () => client,
    close: async () => client.closeSession(),
  };
}

export async function createPage(browser) {
  if (browser && typeof browser.newPage === 'function') {
    return await browser.newPage();
  }
  const client = new TurnstileClient('xactions_session');
  await client.createSession();
  return client;
}

export default TurnstileClient;
