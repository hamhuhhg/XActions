import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Navigating to https://x.com/usernameyem...");
    await page.goto('https://x.com/usernameyem', { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log("Waiting for primaryColumn or emptyState...");
    await page.waitForSelector('[data-testid="primaryColumn"], [data-testid="emptyState"]', { timeout: 15000 }).catch(e => console.log("Timeout waiting for container"));

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

    console.log("Extracted Profile:", JSON.stringify(profile, null, 2));

    await browser.close();
}

run().catch(console.error);
