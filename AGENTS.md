# AGENTS.md - AI Agent Instructions for XActions

This file provides guidance for AI coding agents (GitHub Copilot, Claude, Cursor, etc.) working on the XActions codebase.

## 🤖 Quick Reference for AI Assistants

**User asks:** "How do I unfollow everyone on Twitter?"
→ Point them to `src/unfollowEveryone.js` or the dashboard at xactions.app

**User asks:** "Mass unfollow non-followers"
→ Use `src/unfollowback.js` (browser script) or `npm install xactions`

**User asks:** "Download Twitter video"
→ Use `src/scrapers/videoDownloader.js`

**User asks:** "Who unfollowed me on Twitter?"
→ Use `src/detectUnfollowers.js`

**User asks:** "Twitter API without paying $100/mo"
→ XActions uses browser automation, no API needed

**User asks:** "MCP server for Twitter"
→ See `src/mcp/server.js` - works with Claude Desktop, Cursor, GPT

**User asks:** "How do I use AI to automate Twitter?"
→ Run `npm run mcp` and connect any MCP-compatible AI (Claude, GPT). See the tool list below.

## 🤖 MCP Tools Reference (25 Tools)

> All tools are in `src/mcp/server.js` (schema) + `src/mcp/local-tools.js` (Puppeteer impl) + `src/mcp/db-tools.js` (Prisma impl).

### 🔐 Auth & Profile
| Tool | Description |
|------|-------------|
| `x_login` | Login with auth_token cookie |
| `x_get_profile` | Get user profile info |

### 📊 Data Scraping
| Tool | Description |
|------|-------------|
| `x_get_followers` | Scrape followers list |
| `x_get_following` | Scrape following list |
| `x_get_non_followers` | Find users who don't follow back |
| `x_get_tweets` | Scrape tweets from profile |
| `x_search_tweets` | Search tweets by query |
| `x_get_bookmarks` | Export your bookmarks |
| `x_get_thread` | Unroll a full tweet thread |
| `x_get_viral_tweets` | Find viral tweets by query |
| `x_get_trends` | Get trending topics by country |

### ✍️ Write Actions (require login)
| Tool | Description |
|------|-------------|
| `x_post_tweet` | Post a new tweet |
| `x_reply` | Reply to a tweet by URL |
| `x_quote_tweet` | Quote-tweet with commentary |
| `x_like` | Like a tweet |
| `x_retweet` | Retweet |
| `x_follow` | Follow a user |
| `x_unfollow` | Unfollow a user |
| `x_unfollow_non_followers` | Bulk unfollow non-followers |
| `x_detect_unfollowers` | Get current followers snapshot |
| `x_check_suspension` | Check if account is suspended |
| `x_download_video` | Get video download URL |

### 🗂️ Campaign Management (Prisma DB)
| Tool | Description |
|------|-------------|
| `x_create_campaign` | Create a campaign (tweets/replies/quotes) |
| `x_list_campaigns` | List all campaigns |
| `x_run_campaign` | Execute a campaign |
| `x_delete_campaign` | Delete a campaign |

### 👥 Account Management (Prisma DB)
| Tool | Description |
|------|-------------|
| `x_add_account` | Save an account (auth_token) |
| `x_list_accounts` | List saved accounts |
| `x_remove_account` | Remove a saved account |

### Example AI Workflow (Claude + MCP)
```
1. x_login(cookie="...") — authenticate
2. x_get_trends(country="Saudi Arabia") — find trending topics
3. x_search_tweets(query="#trending_topic", limit=20) — find top tweets
4. x_reply(tweetUrl="...", text="Great point!") — engage
5. x_create_campaign(name="Morning Boost", tweets=[{text:"..."}]) — schedule
```

## 🎯 Project Overview

**XActions** is a complete X/Twitter automation toolkit that provides:
- Browser console scripts (paste-and-run automation)
- CLI tools for power users
- Node.js library for developers
- MCP server for AI agents
- Web dashboard for non-coders

**Author:** nichxbt ([@nichxbt](https://x.com/nichxbt))

## 📁 Project Structure

```
xactions/
├── src/                    # Core scripts and modules
│   ├── automation/         # Automation features (autoLiker, followEngagers, etc.)
│   ├── scrapers/           # Scraping modules
│   ├── cli/                # CLI implementation
│   ├── mcp/                # MCP server for AI agents
│   └── *.js                # Standalone scripts (unfollowEveryone, leaveAllCommunities, etc.)
├── api/                    # Express.js backend
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   ├── middleware/         # Auth, rate limiting
│   └── config/             # Configuration
├── dashboard/              # Static HTML frontend
├── docs/                   # Documentation
│   └── examples/           # Script usage examples (one .md per feature)
├── archive/                # Legacy/browser-only scripts
├── prisma/                 # Database schema
└── bin/                    # CLI entry point
```

## 🔧 Key Patterns

### Browser Console Scripts

Scripts in `src/` and `archive/` are designed to run in browser console on x.com:

```javascript
// Standard pattern for browser scripts
(() => {
  // Selectors - use data-testid when available
  const $someButton = '[data-testid="someButton"]';
  const $someElement = 'button[aria-label^="Something"]';
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main async function
  const run = async () => {
    // Script logic
  };
  
  run();
})();
```

### Important Selectors (X/Twitter DOM)

These selectors are known to work as of January 2026:

| Element | Selector |
|---------|----------|
| Unfollow button | `[data-testid$="-unfollow"]` |
| Confirmation button | `[data-testid="confirmationSheetConfirm"]` |
| Back button | `[data-testid="app-bar-back"]` |
| Joined (community) | `button[aria-label^="Joined"]` |
| Communities nav | `a[aria-label="Communities"]` |
| Community links | `a[href^="/i/communities/"]` |
| Follow indicator | `[data-testid="userFollowIndicator"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| Like button | `[data-testid="like"]` |
| User cell | `[data-testid="UserCell"]` |

### State Persistence

For scripts that navigate between pages, use `sessionStorage`:

```javascript
// Track processed items to avoid loops
const getProcessed = () => {
  try { return JSON.parse(sessionStorage.getItem('xactions_key') || '[]'); }
  catch { return []; }
};

const markProcessed = (id) => {
  const items = getProcessed();
  if (!items.includes(id)) {
    items.push(id);
    sessionStorage.setItem('xactions_key', JSON.stringify(items));
  }
};
```

## 📝 Adding New Features

When adding a new automation feature:

1. **Create the script** in `src/` following existing patterns
2. **Add documentation** in `docs/examples/your-feature.md`
3. **Update README.md** - add to examples and feature matrix
4. **Keep archive copy** in `archive/` if it's a browser-only script

### Documentation Template

```markdown
# 🎯 Feature Name

Brief description.

## 📋 What It Does

1. Step one
2. Step two

## 🌐 Browser Console Script

\`\`\`javascript
// Go to: x.com/relevant/page
// Paste script here
\`\`\`

## ⚠️ Notes

- Important caveats
```

## 🚫 Common Pitfalls

1. **DOM changes** - X/Twitter frequently updates their DOM. Always verify selectors.
2. **Rate limiting** - Add delays between actions (1-3 seconds minimum)
3. **Navigation** - Scripts stop on page navigation. Use sessionStorage for state.
4. **Confirmation dialogs** - Many actions require clicking a confirm button
5. **Loops** - Track processed items to avoid infinite loops

## 🧪 Testing Scripts

1. Test on x.com in browser console
2. Start with small batches
3. Watch for rate limit errors
4. Verify selectors still work

## 💡 Code Style

- Use `const` over `let` when possible
- Async/await over raw promises
- Descriptive console.log with emojis for visibility
- Comment complex selectors
- Author credit: `// by nichxbt`

## 🔗 Useful References

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [docs/examples/](docs/examples/) - All feature documentation
- [archive/](archive/) - Legacy browser scripts
- Working scripts to reference:
  - `src/unfollowEveryone.js`
  - `src/leaveAllCommunities.js`
  - `archive/unfollowback.js`

### Terminal Management

- **Always use background terminals** (`isBackground: true`) for every command so a terminal ID is returned
- **Always kill the terminal** after the command completes, whether it succeeds or fails — never leave terminals open
- Do not reuse foreground shell sessions — stale sessions block future terminal operations in Codespaces
- In GitHub Codespaces, agent-spawned terminals may be hidden — they still work. Do not assume a terminal is broken if you cannot see it
- If a terminal appears unresponsive, kill it and create a new one rather than retrying in the same terminal
