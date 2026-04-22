import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let b64Token = '';
    let platform = 'twitter';
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--token_b64' && args[i+1]) {
            b64Token = args[i+1];
        } else if (args[i] === '--platform' && args[i+1]) {
            platform = args[i+1];
        }
    }

    if (!b64Token) {
        console.error("No token provided");
        process.exit(1);
    }

    const auth_token = Buffer.from(b64Token, 'base64').toString('utf8');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-notifications'
        ]
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    if (platform === 'facebook') {
        let parsedCookies = [];
        try {
            const cookiesData = JSON.parse(auth_token);
            if (Array.isArray(cookiesData)) {
                parsedCookies = cookiesData;
            } else {
                // Legacy object format if applicable
                if (cookiesData.c_user && cookiesData.xs) {
                    parsedCookies = [
                        { name: 'c_user', value: String(cookiesData.c_user), domain: '.facebook.com', path: '/', secure: true, httpOnly: false, sameSite: 'None' },
                        { name: 'xs', value: String(cookiesData.xs), domain: '.facebook.com', path: '/', secure: true, httpOnly: true, sameSite: 'None' }
                    ];
                }
            }
        } catch (e) {
            let c_user = '';
            let xs = '';
            const cMatch = auth_token.match(/c_user=([^;\s]+)/);
            const xMatch = auth_token.match(/xs=([^;\s]+)/);
            if (cMatch) c_user = cMatch[1];
            if (xMatch) xs = xMatch[1];
            if (c_user && xs) {
                parsedCookies = [
                    { name: 'c_user', value: String(c_user), domain: '.facebook.com', path: '/', secure: true, httpOnly: false, sameSite: 'None' },
                    { name: 'xs', value: String(xs), domain: '.facebook.com', path: '/', secure: true, httpOnly: true, sameSite: 'None' }
                ];
            }
        }

        if (parsedCookies.length > 0) {
            await page.setCookie(...parsedCookies);
        }
        await page.goto('https://www.facebook.com/');
    } else {
        await page.setCookie({
            name: 'auth_token',
            value: String(auth_token),
            domain: '.twitter.com',
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'None'
        });
        await page.setCookie({
            name: 'auth_token',
            value: String(auth_token),
            domain: '.x.com',
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'None'
        });
        await page.goto('https://x.com/home');
    }
    
    console.log("Browser launched successfully. Keeping alive...");
    
    browser.on('disconnected', () => {
        console.log("Browser closed. Exiting.");
        process.exit(0);
    });
}

main().catch(error => {
    console.error("Failed to start browser:", error);
    process.exit(1);
});
