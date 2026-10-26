import TurnstileClient from '../src/solver/turnstile-client.js';
import { PrismaClient } from '@prisma/client';
import { normalizeFacebookCookies } from '../src/core/cookies.js';

const prisma = new PrismaClient();

async function updateAccountToken(accId, newCookiesJson) {
  try {
    if (accId && accId !== 'default') {
      await prisma.socialAccount.update({
        where: { id: accId.toString() },
        data: { token: newCookiesJson },
      });
      console.log(`[SafeBrowser] 🍪 Successfully saved updated cookies to database for account ${accId}`);
    }
  } catch (e) {
    console.error(`[SafeBrowser] Error saving cookies to database:`, e.message);
  }
}

async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let b64Token = '';
    let platform = 'twitter';
    let accountId = 'default';
    let dataSaver = true;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--token_b64' && args[i+1]) {
            b64Token = args[i+1];
        } else if (args[i] === '--platform' && args[i+1]) {
            platform = args[i+1];
        } else if (args[i] === '--accountId' && args[i+1]) {
            accountId = args[i+1];
        } else if (args[i] === '--dataSaver' && args[i+1]) {
            dataSaver = args[i+1] !== '0' && args[i+1] !== 'false';
        }
    }

    if (!b64Token) {
        console.error("No token provided");
        process.exit(1);
    }

    const auth_token = Buffer.from(b64Token, 'base64').toString('utf8');

    const sessionId = `safe_browser_${platform}_${accountId}`;
    const client = new TurnstileClient(sessionId);
    console.log(`[SafeBrowser] 🌐 Launching session ${sessionId} (Data Saver: ${dataSaver ? 'ON - Videos/Images blocked' : 'OFF'})...`);
    await client.createSession(null, 60, dataSaver);

    if (platform === 'facebook') {
        const parsedCookies = normalizeFacebookCookies(auth_token);
        if (parsedCookies.length > 0) {
            console.log(`[SafeBrowser] 🍪 Setting ${parsedCookies.length} Facebook session cookies...`);
            await client.setCookie(...parsedCookies);
        }
        await client.goto('https://www.facebook.com/', { dataSaver, disableMedia: dataSaver });
    } else {
        if (!hasExistingTwitter && auth_token) {
            await client.setCookie({
                name: 'auth_token',
                value: String(auth_token),
                domain: '.twitter.com',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'None'
            });
            await client.setCookie({
                name: 'auth_token',
                value: String(auth_token),
                domain: '.x.com',
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'None'
            });
        }
        await client.goto('https://x.com/home', { dataSaver, disableMedia: dataSaver });
    }
    
    console.log("TurnstileSolver session launched successfully. Active URL:", client.url());
    console.log("[SafeBrowser] 🕵️ Starting real-time cookie monitor watcher...");

    let lastSavedToken = auth_token;
    let failureCount = 0;

    // Real-time cookie watcher loop
    while (true) {
        await new Promise(r => setTimeout(r, 4000));
        try {
            const currentCookies = await client.getCookies();
            
            if (currentCookies === null) {
                failureCount++;
                if (failureCount >= 2) {
                    console.log("[SafeBrowser] Browser window closed by user. Exiting watcher.");
                    break;
                }
                continue;
            }

            failureCount = 0;
            if (!Array.isArray(currentCookies) || currentCookies.length === 0) {
                continue;
            }

            if (platform === 'facebook') {
                const cUser = currentCookies.find(c => c.name === 'c_user')?.value;
                const xs = currentCookies.find(c => c.name === 'xs')?.value;

                if (cUser && xs) {
                    const jsonString = JSON.stringify(currentCookies);
                    if (jsonString !== lastSavedToken) {
                        console.log(`[SafeBrowser] 🍪 Detected and saved updated Facebook session cookies for c_user=${cUser}`);
                        lastSavedToken = jsonString;
                        await updateAccountToken(accountId, jsonString);
                    }
                }
            } else {
                const authTokenCookie = currentCookies.find(c => c.name === 'auth_token')?.value;
                if (authTokenCookie && authTokenCookie !== lastSavedToken) {
                    console.log(`[SafeBrowser] 🍪 Detected and saved updated Twitter auth_token`);
                    lastSavedToken = authTokenCookie;
                    await updateAccountToken(accountId, authTokenCookie);
                }
            }
        } catch (err) {
            failureCount++;
            if (failureCount >= 2) {
                console.log("[SafeBrowser] Exception checking cookies. Browser likely closed. Exiting watcher.");
                break;
            }
        }
    }
}

main().catch(error => {
    console.error("Failed to start browser:", error);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect().catch(() => {});
});
