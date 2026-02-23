import asyncio
import sys
import argparse
import nodriver as uc
import time

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--token', required=True, help='Twitter auth_token')
    args = parser.parse_args()

    auth_token = args.token

    browser = None
    try:
        # Start browser in interactive mode (headless=False) so user can browse
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

        # Navigate direct to home feed with the newly injected auth token
        home_url = 'https://x.com/home'
        await page.get(home_url)
        
        print("Browser session started successfully. Keeping alive...")
        sys.stdout.flush()

        # Keep script running infinitely so the browser window stays open for the user.
        # If user manually closes the window, the script will naturally terminate eventually.
        while True:
            await asyncio.sleep(60)

    except Exception as e:
        print(f"Error launching safe browser: {str(e)}")
        sys.exit(1)
    finally:
        # Do not automatically close the browser here, unless it crashed.
        # The user's whole goal is to use the browser manually.
        pass

if __name__ == '__main__':
    asyncio.run(main())
