import asyncio
import nodriver as uc

async def test_scrape():
    browser = await uc.start()
    page = await browser.get('https://getdaytrends.com/')
    
    await asyncio.sleep(5) # Wait for page load
    
    print("--- Testing Top Trends Extraction ---")
    rows = await page.select_all('table.table tbody tr')
    for i, row in enumerate(rows[:5]):
        try:
            rank = await row.query_selector('th')
            rank_text = rank.text if rank else "?"
            
            name_el = await row.query_selector('a.string')
            name_text = name_el.text if name_el else "?"
            
            tweets_el = await row.query_selector('div.small.text-muted')
            tweets_text = tweets_el.text if tweets_el else ""
            
            print(f"[{rank_text}] {name_text} - {tweets_text}")
        except Exception as e:
            print("Row err:", e)
            
    print("\n--- Testing Countries Extraction ---")
    try:
        # Looking for country links
        areas = await page.select_all('#dropdown-areas a')
        if not areas:
            areas = await page.select_all('#dropdown-countries a')
            
        print(f"Found {len(areas)} areas/countries.")
        for a in areas[:10]:
            print(f"{a.text} -> {getattr(a, 'href', '')}")
            
    except Exception as e:
         print("Country extraction error:", e)

    browser.stop()

if __name__ == '__main__':
    asyncio.run(test_scrape())
