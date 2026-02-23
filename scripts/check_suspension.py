import asyncio
import sys
import json
import nodriver as uc
import argparse

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--token', required=True, help='Twitter auth_token')
    parser.add_argument('--username', required=True, help='Twitter username to check')
    args = parser.parse_args()

    auth_token = args.token
    username = args.username.strip('@')

    browser = None
    try:
        # Start browser in headless mode since user doesn't need to interact
        browser = await uc.start(headless=True)
        
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

        # STRATEGY 1: Navigate direct to home feed. Permanently suspended accounts often show a bright banner here without redirecting.
        home_url = 'https://x.com/home'
        await page.get(home_url)
        
        # Wait for home content
        await asyncio.sleep(6)
        
        # Check current URL, sometimes Twitter redirects locked accounts
        current_url = await page.evaluate('window.location.href')
        
        if 'twitter.com/account/access' in current_url or 'x.com/account/access' in current_url:
            # This is a locked/suspended account wall
            print(json.dumps({
                "success": True,
                "username": username,
                "isSuspended": True,
                "doesNotExist": False
            }))
            return

        # Check for multiple variations of suspension text on the home page itself
        home_text = await page.evaluate('document.body.innerText')
        home_content = str(home_text) if home_text else ""
        
        suspension_texts = [
            "Account suspended",
            "موقوف",
            "Twitter suspends accounts",
            "This account has been suspended",
            "يوقف حسابات",
            "Suspended",
            "To unlock your account",
            "your account is suspended",
            "لإلغاء قفل حسابك",
            "تم إيقاف حسابك",
            "Permanently suspended",
            "موقوف نهائياً",
            "حسابك في وضع القراءة فقط بشكل دائم",
            "بعد مراجعة متأنية، قرّرنا أن حسابك انتهك قوانين X"
        ]
        
        for text in suspension_texts:
            if text in home_content:
                print(json.dumps({
                    "success": True,
                    "username": username,
                    "isSuspended": True,
                    "doesNotExist": False
                }))
                return

        # STRATEGY 2: Navigate to specific profile page, to catch stealthy profile-only suspensions
        profile_url = f'https://x.com/{username}'
        await page.get(profile_url)
        
        # Wait for profile content
        await asyncio.sleep(5)

        # Check for multiple variations of suspension text by getting all text on the page natively
        page_text = await page.evaluate('document.body.innerText')
        page_content = str(page_text) if page_text else ""
        
        is_suspended = False
        suspension_texts = [
            "Account suspended",
            "موقوف",
            "Twitter suspends accounts",
            "This account has been suspended",
            "يوقف حسابات",
            "Suspended",
            "To unlock your account",
            "your account is suspended",
            "لإلغاء قفل حسابك",
            "تم إيقاف حسابك",
            "حسابك في وضع القراءة فقط بشكل دائم",
            "بعد مراجعة متأنية، قرّرنا أن حسابك انتهك قوانين X"
        ]
        
        for text in suspension_texts:
            if text in page_content:
                is_suspended = True
                break
                
        # To be extra safe, let's also check if the account doesn't exist
        does_not_exist = False
        not_exist_texts = [
           "This account doesn’t exist",
           "هذا الحساب غير موجود",
           "This account doesn't exist",
           "Something went wrong, but don’t fret",
           "حدث خطأ ما"
        ]
        
        for text in not_exist_texts:
            if text in page_content:
                does_not_exist = True
                break

        print(json.dumps({
            "success": True,
            "username": username,
            "isSuspended": is_suspended,
            "doesNotExist": does_not_exist
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
    finally:
        try:
            if browser:
                browser.stop()
        except:
            pass

if __name__ == '__main__':
    asyncio.run(main())
