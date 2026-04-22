import asyncio
import nodriver as uc
import argparse
import json
import sys
import os

# Fix encoding for Windows command line output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

async def extract_trends(action, country=None):
    try:
        # User explicitly requested Headless mode
        browser = await uc.start(headless=True)
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Failed to start browser: {str(e)}"}))
        return

    try:
        url = 'https://getdaytrends.com/'
        if action == 'trends' and country and country != 'worldwide':
            url = f'https://getdaytrends.com/{country}/'

        page = await browser.get(url)
        await asyncio.sleep(4) # Wait for page rendering

        result_data = {}

        if action == 'countries':
            areas = await page.select_all('#dropdown-areas a')
            if not areas:
                areas = await page.select_all('#dropdown-countries a')
            
            countries_list = []
            for area in areas:
                try:
                    name = area.text.strip()
                    href = getattr(area, 'href', '')
                    if href and href.startswith('/'):
                        # extract country slug from href, e.g. /saudi-arabia/
                        slug = href.strip('/').split('/')[-1]
                        countries_list.append({
                            "name": name,
                            "slug": slug
                        })
                except: pass

            # Add Worldwide as default option
            if not any(c.get('slug') == 'worldwide' for c in countries_list):
                 countries_list.insert(0, {"name": "Worldwide", "slug": "worldwide"})

            result_data = {
                "success": True,
                "countries": countries_list
            }

        elif action == 'trends':
            trends_list = []
            rows = await page.select_all('table.table tbody tr')
            # Limit to top 20 as requested
            for row in rows[:20]:
                try:
                    rank_el = await row.query_selector('th')
                    name_el = await row.query_selector('a.string')
                    tweets_el = await row.query_selector('div.small.text-muted')

                    if name_el:
                        trends_list.append({
                            "rank": rank_el.text.strip() if rank_el else "",
                            "name": name_el.text.strip(),
                            "volume": tweets_el.text.strip() if tweets_el else ""
                        })
                except:
                    continue
            
            result_data = {
                "success": True,
                "country": country if country else "worldwide",
                "trends": trends_list
            }

        print(json.dumps(result_data, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
    finally:
        browser.stop()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['countries', 'trends'], required=True, help='What to extract')
    parser.add_argument('--country', required=False, help='Country slug for trends')
    args = parser.parse_args()

    asyncio.run(extract_trends(args.action, args.country))
