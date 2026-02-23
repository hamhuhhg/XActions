import asyncio
import sys
import json
import nodriver as uc

async def main():
    try:
        # nodriver handles stealth automatically. Adding extra args usually causes it to crash and restart in a loop.
        browser = await uc.start(
            headless=False
        )

        page = await browser.get('https://x.com/i/flow/login')
        
        auth_token = None
        account_name = None

        # Poll for cookies (Timeout after 5 mins)
        max_attempts = 300
        attempts = 0

        while attempts < max_attempts:
            try:
                cookies = await page.send(uc.cdp.network.get_cookies(urls=['https://x.com']))
                for cookie in cookies:
                    name = getattr(cookie, 'name', '')
                    if name == 'auth_token':
                        auth_token = getattr(cookie, 'value', '')
                        break
            except Exception as e:
                pass
            
            if auth_token:
                # Login succeeded, wait for DOM to load a bit and try to get the user name
                await asyncio.sleep(5)
                try:
                    # Select the side nav profile button
                    elem = await page.select('[data-testid="SideNav_AccountSwitcher_Button"]')
                    if elem:
                        text = elem.text
                        if text:
                            lines = text.split('\n')
                            name = lines[0] if len(lines) > 0 else 'حساب تمت مصادقته'
                            handle = lines[1] if len(lines) > 1 else ''
                            account_name = f"{name} ({handle})"
                except Exception as e:
                    pass

                if not account_name:
                    account_name = 'المحفظة الجديدة'

                print(json.dumps({
                    "success": True,
                    "token": auth_token,
                    "accountName": account_name
                }))
                break
                
            await asyncio.sleep(1)
            attempts += 1

        if not auth_token:
            print(json.dumps({
                "success": False,
                "error": "انتهت مهلة تسجيل الدخول. يرجى المحاولة مرة أخرى."
            }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
    finally:
        try:
            if 'browser' in locals() and browser:
                browser.stop()
        except:
            pass

if __name__ == '__main__':
    asyncio.run(main())
