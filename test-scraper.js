import TurnstileClient from './src/solver/turnstile-client.js';

async function run() {
    const page = new TurnstileClient('test_scraper');
    await page.createSession();

    console.log("Navigating to https://x.com/usernameyem...");
    await page.goto('https://x.com/usernameyem', { timeout: 30000 });

    await new Promise(r => setTimeout(r, 5000));

    await page.screenshot({ path: 'debug_twitter_screenshot.png' });
    console.log("Screenshot saved to debug_twitter_screenshot.png");

    const profile = await page.evaluate(() => {
        const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
        const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

        const headerStyle = document.querySelector('[data-testid="UserProfileHeader_Items"]')?.closest('div')?.previousElementSibling?.querySelector('img')?.src;
        const avatar = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img, [data-testid*="UserAvatar"] img')?.src;
        const nameSection = document.querySelector('[data-testid="UserName"]');
        const fullText = nameSection?.textContent || '';
        const usernameMatch = fullText.match(/@([\w_]+)/);
        const followingLink = document.querySelector('a[href$="/following"]');
        const followersLink = document.querySelector('a[href$="/verified_followers"], a[href$="/followers"]');

        return {
            name: fullText.split('@')[0]?.trim() || null,
            username: usernameMatch?.[1] || null,
            bio: getText('[data-testid="UserDescription"]'),
            location: getText('[data-testid="UserLocation"]'),
            website: getAttr('[data-testid="UserUrl"] a', 'href'),
            joined: getText('[data-testid="UserJoinDate"]'),
            following: followingLink?.querySelector('span')?.textContent || null,
            followers: followersLink?.querySelector('span')?.textContent || null,
            avatar: avatar || null,
            header: headerStyle || null,
        };
    });

    await page.destroySession();
}

run().catch(console.error);
