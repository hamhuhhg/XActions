import asyncio
import sys
import argparse
from utils import setup_browser, print_success, print_error
import nodriver as uc

async def reply_tweet(auth_token, target_url, text, media=None):
    browser, page = await setup_browser(auth_token)
    if not browser or not page:
        return

    try:
        # 1. Navigate to target tweet
        await page.get(target_url)
        # Give initial time for the framework to start loading
        await asyncio.sleep(2)

        # 2. Find reply textarea with polling (X.com can be slow)
        textarea = None
        selectors = [
            '[data-testid="tweetTextarea_0"]',
            '[aria-label="Post text"]'
        ]
        
        for _ in range(20): # Poll for up to 10 seconds (20 * 0.5s)
            for selector in selectors:
                try:
                    textarea = await page.select(selector)
                    if textarea:
                        break
                except:
                    pass
            if textarea:
                break
            await asyncio.sleep(0.5)

        if not textarea:
            # Maybe the tweet is deleted or restricted
            error_container = None
            try:
                error_container = await page.select('.errorContainer')
            except:
                pass
                
            if error_container:
                print_error("Target tweet exists but is an error page (e.g. deleted or protected).")
                return
            
            print_error("Failed to find reply textarea on target tweet page.")
            return

        # 3. Type Reply
        await textarea.click()
        await asyncio.sleep(0.3)
        await textarea.send_keys(text)
        await asyncio.sleep(1)

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

        # 5. Click Reply Button
        # The reply button often shares the same testid as the post button
        reply_btn = None
        btn_selectors = [
            '[data-testid="tweetButtonInline"]:not([disabled])',
            '[data-testid="tweetButton"]:not([disabled])'
        ]
        
        for _ in range(10): # Poll for up to 5 seconds
            for selector in btn_selectors:
                try:
                    reply_btn = await page.select(selector)
                    if reply_btn:
                        break
                except:
                    pass
            if reply_btn:
                break
            await asyncio.sleep(0.5)

        if not reply_btn:
            # Sometimes if clicking the textarea didn't enable the button, 
            # we need to simulate typing more aggressively
            await textarea.send_keys(' ')
            await page.send(uc.cdp.input_.dispatch_key_event(type_="char", text="\b")) # Backspace
            await asyncio.sleep(1)
            
            for _ in range(5):
                for selector in btn_selectors:
                    try:
                        reply_btn = await page.select(selector)
                        if reply_btn:
                            break
                    except:
                        pass
                if reply_btn:
                    break
                await asyncio.sleep(0.5)

        if reply_btn:
            await reply_btn.click()
        else:
            print("Reply button not found nateively, attempting Ctrl+Enter fallback...")
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

        # 5. Verify and get ID
        # Since it's an inline composer, if it disappears or resets, it likely posted
        try:
             # Check if original typed text is gone
             val = getattr(textarea, 'value', '')
             if text in val:
                 print_error("Reply button clicked, but text remained in composer. Reply likely failed.")
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
        except:
            pass

        print_success({
            "message": "Reply posted successfully",
            "replyId": tweet_id
        })

    except Exception as e:
        print_error(f"Error during reply: {str(e)}")
    finally:
        browser.stop()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--token', required=True, help='Twitter auth_token')
    parser.add_argument('--target', required=True, help='Target tweet URL')
    parser.add_argument('--text', required=True, help='Text to reply')
    parser.add_argument('--media', required=False, help='Path to media file to upload')
    args = parser.parse_args()

    asyncio.run(reply_tweet(args.token, args.target, args.text, args.media))
