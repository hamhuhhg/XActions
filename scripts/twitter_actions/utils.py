import asyncio
import json
import nodriver as uc

async def setup_browser(auth_token):
    """
    Initializes a nodriver browser instance with the given auth token.
    Returns the browser and page objects.
    """
    try:
        # Start browser in interactive mode (headless=False) to bypass Cloudflare/Bot detection
        # nodriver handles stealth automatically, adding extra args can break it.
        browser = await uc.start(headless=False)
        
        # Navigate to set the cookie
        page = await browser.get('https://x.com')
        
        # Create cookie object and set it
        await page.send(uc.cdp.network.set_cookie(
            name='auth_token',
            value=auth_token,
            domain='.x.com',
            path='/',
            secure=True,
            http_only=True
        ))
        
        # Navigate to the home feed with the newly injected auth token
        await page.get('https://x.com/home')
        
        # Give it a moment to load the initial DOM
        await asyncio.sleep(3)
        
        return browser, page
    except Exception as e:
        print_error(f"Failed to initialize browser: {str(e)}")
        if 'browser' in locals() and browser:
            browser.stop()
        return None, None

def print_success(data):
    """Prints a standard JSON success response for Node.js to parse."""
    response = {"success": True}
    response.update(data)
    print(json.dumps(response))

def print_error(message):
    """Prints a standard JSON error response for Node.js to parse."""
    print(json.dumps({
        "success": False,
        "error": message
    }))
