import asyncio
import sys
import argparse
import nodriver as uc
import time
import json

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--token', default='', help='auth_token or json cookie dict (raw)')
    parser.add_argument('--token_b64', default='', help='base64 encoded token')
    parser.add_argument('--platform', default='twitter', help='twitter or facebook')
    args = parser.parse_args()

    import base64
    if args.token_b64:
        auth_token = base64.b64decode(args.token_b64).decode('utf-8')
    else:
        auth_token = args.token

    platform = args.platform

    browser = None
    try:
        # Start browser in interactive mode (headless=False) so user can browse
        browser = await uc.start(headless=False)
        
        if platform == 'facebook':
            page = await browser.get('https://facebook.com')
            try:
                c_user = ""
                xs = ""
                try:
                    cookies = json.loads(auth_token)
                    c_user = str(cookies.get('c_user', ''))
                    xs = str(cookies.get('xs', ''))
                except json.JSONDecodeError:
                    import re
                    c_match = re.search(r'c_user=([^;]+)', auth_token)
                    x_match = re.search(r'xs=([^;]+)', auth_token)
                    if c_match: c_user = c_match.group(1)
                    if x_match: xs = x_match.group(1)
                    
                if c_user:
                    await page.send(uc.cdp.network.set_cookie(
                        name='c_user', value=c_user, domain='.facebook.com', path='/',
                        secure=True, http_only=False
                    ))
                if xs:
                    await page.send(uc.cdp.network.set_cookie(
                        name='xs', value=xs, domain='.facebook.com', path='/',
                        secure=True, http_only=True
                    ))
            except Exception as e:
                print(f"Failed to parse facebook cookies: {str(e)}")
            
            await page.get('https://facebook.com/')
            
        else: # Default Twitter
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
            await page.get('https://x.com/home')
            
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
