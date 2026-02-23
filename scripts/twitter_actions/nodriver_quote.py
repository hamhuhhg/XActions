import asyncio
import sys
import argparse
from utils import setup_browser, print_success, print_error
import nodriver as uc

async def quote_tweet(auth_token, target_url, text, media=None):
    browser, page = await setup_browser(auth_token)
    if not browser or not page:
        return

    try:
        # 1. Navigate directly to the generic composer URL
        # The most foolproof way to quote a tweet is to simply include its URL in the text.
        # X.com automatically converts the link into a Quote Card when posted.
        compose_url = "https://x.com/compose/tweet"
        
        print(f"Navigating to composer URL: {compose_url}")
        await page.get(compose_url)
        await asyncio.sleep(4)

        # 2. Find composer and Type 
        textarea = None
        
        # Poll for the textarea
        for _ in range(20): # up to 10 seconds
            try:
                textarea = await page.select('[data-testid="tweetTextarea_0"]')
                if textarea: break
            except: pass
            await asyncio.sleep(0.5)

        if not textarea:
            print_error("Failed to find quote composer textarea after intent navigation.")
            return

        await textarea.click()
        await asyncio.sleep(0.3)
        # Type the user's text first
        await textarea.send_keys(text)
        await asyncio.sleep(0.3)
        
        # Send native Enter keystrokes to create a new line.
        # \n in send_keys is often ignored by X.com's React draft editor.
        await page.send(uc.cdp.input_.dispatch_key_event(
            type_="keyDown",
            windows_virtual_key_code=13, # Enter
        ))
        await page.send(uc.cdp.input_.dispatch_key_event(
            type_="keyUp",
            windows_virtual_key_code=13,
        ))
        await asyncio.sleep(0.3)
        
        # Send the Target Tweet URL on the new line
        await textarea.send_keys(target_url)
        await asyncio.sleep(0.3)
        
        # Send a literal space to force X.com to parse the URL and activate the Quote Card preview
        await page.send(uc.cdp.input_.dispatch_key_event(type_="char", text=" "))
        
        # Wait a moment for X.com to fetch the card preview
        await asyncio.sleep(2)

        # 4. Handle Media if present
        if media:
            try:
                file_input = await page.select('input[type="file"][accept*="image"]')
                if file_input:
                    await file_input.send_file(media)
                    await asyncio.sleep(3)
                else:
                    print("Could not find file input for media.")
            except Exception as me:
                print(f"Failed to attach media: {str(me)}")

        # 5. Click Post Button
        post_btn = None
        valid_selectors = [
            '[data-testid="tweetButton"]:not([disabled])',
            '[data-testid="tweetButtonInline"]:not([disabled])'
        ]

        for _ in range(10): # Poll for up to 5 seconds
            for selector in valid_selectors:
                try:
                    post_btn = await page.select(selector)
                    if post_btn:
                        break
                except:
                    pass
            if post_btn:
                break
            await asyncio.sleep(0.5)

        if post_btn:
            await post_btn.click()
        else:
            print("Post button not found natively, attempting Ctrl+Enter fallback...")
            await page.send(uc.cdp.input_.dispatch_key_event(
                type_="rawKeyDown",
                windows_virtual_key_code=17, # Ctrl
                modifiers=2
            ))
            await page.send(uc.cdp.input_.dispatch_key_event(
                type_="keyDown",
                windows_virtual_key_code=13, # Enter
                modifiers=2 
            ))
            await page.send(uc.cdp.input_.dispatch_key_event(
                type_="keyUp",
                windows_virtual_key_code=13,
                modifiers=2
            ))
            await page.send(uc.cdp.input_.dispatch_key_event(
                type_="keyUp",
                windows_virtual_key_code=17,
                modifiers=0
            ))

        await asyncio.sleep(4)

        # 6. Verify and get ID
        try:
             still_open = await page.select('[data-testid="tweetTextarea_0"]')
             if still_open:
                 val = getattr(still_open, 'value', '')
                 if text in val:
                     print_error("Quote composer remained open with text. Quote likely failed.")
                     return
        except:
             pass

        tweet_id = None
        try:
            toast = await page.select('[data-testid="toast"]')
            if toast:
                links = await toast.query_selector_all('a[href*="/status/"]')
                for link in links:
                    href = getattr(link, 'href', '')
                    if '/status/' in href:
                        tweet_id = href.split('/status/')[1].split('/')[0]
                        break
        except: pass

        print_success({
            "message": "Quote posted successfully",
            "quoteId": tweet_id
        })

    except Exception as e:
        print_error(f"Error during quote: {str(e)}")
    finally:
        browser.stop()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--token', required=True, help='Twitter auth_token')
    parser.add_argument('--target', required=True, help='Target tweet URL')
    parser.add_argument('--text', required=True, help='Text to quote')
    parser.add_argument('--media', required=False, help='Path to media file to upload')
    args = parser.parse_args()

    asyncio.run(quote_tweet(args.token, args.target, args.text, args.media))
