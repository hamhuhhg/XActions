import asyncio
import sys
import argparse
from utils import setup_browser, print_success, print_error
import nodriver as uc

async def post_tweet(auth_token, text, media=None):
    browser, page = await setup_browser(auth_token)
    if not browser or not page:
        return

    try:
        # 1. Open Composer
        # Try to find existing textarea first
        textarea = await page.select('[data-testid="tweetTextarea_0"]')
        
        if not textarea:
            # Click sidebar compose button
            compose_btn = None
            try:
                compose_btn = await page.select('[data-testid="SideNav_NewTweet_Button"]')
            except:
                pass
                
            if compose_btn:
                await compose_btn.click()
            else:
                # Fallback to 'n' shortcut by dispatching native keyboard event via CDP
                await page.send(uc.cdp.input_.dispatch_key_event(
                    type_="char",
                    text="n"
                ))
            
            await asyncio.sleep(2)
            
            # Wait for textarea to appear
            for _ in range(10):
                try:
                    textarea = await page.select('[data-testid="tweetTextarea_0"]')
                    if textarea:
                        break
                except:
                    pass
                await asyncio.sleep(0.5)

        if not textarea:
            print_error("Failed to find tweet composer textarea.")
            return

        # 2. Type Text
        await textarea.click()
        await asyncio.sleep(0.3)
        await textarea.send_keys(text)
        await asyncio.sleep(1)

        # 3. Handle Media if present
        if media:
            try:
                # Find the file input element. Twitter uses a hidden input[type="file"]
                file_input = await page.select('input[type="file"][accept*="image"]')
                if file_input:
                    await file_input.send_file(media)
                    # wait a bit for upload to process, Twitter disables post button while uploading
                    await asyncio.sleep(3)
                else:
                    print("Could not find file input for media.")
            except Exception as me:
                print(f"Failed to attach media: {str(me)}")

        # 4. Click Post Button
        post_btn = None
        
        # Find active post button (could be multiple if modal vs inline)
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
            # Fallback: Send Ctrl+Enter via CDP keyboard event
            print("Post button not found natively, attempting Ctrl+Enter fallback...")
            # We must dispatch raw CDP events for modifiers
            await page.send(uc.cdp.input_.dispatch_key_event(
                type_="rawKeyDown",
                windows_virtual_key_code=17, # Ctrl
                modifiers=2 # Ctrl modifier mask
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

        # Wait for the post to register and composer to close
        await asyncio.sleep(4)

        # 4. Verify and get ID
        # The DOM might keep the textarea around but hidden. 
        # The surest sign of a failed post is if our text is still in it.
        try:
             still_open = await page.select('[data-testid="tweetTextarea_0"]')
             if still_open:
                 # Check if the text we typed is still there
                 val = getattr(still_open, 'value', '')
                 if text in val:
                     print_error("Post button clicked, but text remains in composer. Post likely failed.")
                     return
        except:
             # Exception means element not found, which is also good (composer removed)
             pass

        # Try to get ID from toast notification
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
            "message": "Tweet posted successfully",
            "tweetId": tweet_id
        })

    except Exception as e:
        print_error(f"Error during post: {str(e)}")
    finally:
        browser.stop()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--token', required=True, help='Twitter auth_token')
    parser.add_argument('--text', required=True, help='Text to tweet')
    parser.add_argument('--media', required=False, help='Path to media file to upload')
    args = parser.parse_args()

    asyncio.run(post_tweet(args.token, args.text, args.media))
