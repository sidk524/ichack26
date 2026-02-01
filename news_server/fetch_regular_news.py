#!/usr/bin/env python3
import requests
import xml.etree.ElementTree as ET
from xml.dom import minidom
import json
import time
import random
from datetime import datetime, timedelta
import urllib.parse
import glob
import os

def fetch_google_news_rss(query, max_retries=3):
    """Fetch Google News RSS feed for a given query"""
    base_url = "https://news.google.com/rss/search"
    params = {
        'q': query,
        'hl': 'en-GB',
        'gl': 'GB',
        'ceid': 'GB:en'
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    for attempt in range(max_retries):
        try:
            print(f"Fetching: {query} (attempt {attempt + 1})")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            time.sleep(random.uniform(0.3, 1.5))
            return response.text

        except Exception as e:
            print(f"Error fetching {query} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1, 3))
            else:
                print(f"Failed to fetch after {max_retries} attempts")
                return None

def parse_rss_content(xml_content):
    """Parse RSS XML content and extract items"""
    try:
        root = ET.fromstring(xml_content)
        items = []

        for item in root.iter('item'):
            item_data = {}

            for field in ['title', 'link', 'guid', 'pubDate', 'description']:
                element = item.find(field)
                if element is not None:
                    item_data[field] = element.text

            if 'link' in item_data:
                try:
                    parsed = urllib.parse.urlparse(item_data['link'])
                    item_data['source'] = f"{parsed.scheme}://{parsed.netloc}"
                except:
                    item_data['source'] = "https://news.google.com"
            else:
                item_data['source'] = "https://news.google.com"

            if item_data:
                items.append(item_data)

        return items
    except Exception as e:
        print(f"Error parsing RSS content: {e}")
        return []

def save_as_xml(items, filename, title):
    """Save items as XML file"""
    rss = ET.Element('rss')
    rss.set('version', '2.0')
    rss.set('xmlns:media', 'http://search.yahoo.com/mrss/')

    channel = ET.SubElement(rss, 'channel')

    ET.SubElement(channel, 'title').text = title
    ET.SubElement(channel, 'link').text = "https://news.google.com"
    ET.SubElement(channel, 'description').text = f"Google News feed for {title}"
    ET.SubElement(channel, 'language').text = "en-GB"
    ET.SubElement(channel, 'generator').text = "NFE/5.0"
    ET.SubElement(channel, 'lastBuildDate').text = datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT")

    for item_data in items:
        item = ET.SubElement(channel, 'item')
        for field in ['title', 'link', 'guid', 'pubDate', 'description']:
            if field in item_data and item_data[field]:
                ET.SubElement(item, field).text = item_data[field]

    rough_string = ET.tostring(rss, 'utf-8')
    reparsed = minidom.parseString(rough_string)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(reparsed.toprettyxml(indent="  "))

    print(f"Saved {len(items)} items to {filename}")

def main():
    """Fetch comprehensive regular news to reach 6k items"""

    # Comprehensive regular news queries
    regular_news_queries = [
        # Sports
        ("football premier league 2025 2026", "football_2025.xml"),
        ("basketball NBA 2025", "basketball_nba_2025.xml"),
        ("soccer champions league 2025", "soccer_champions_2025.xml"),
        ("tennis 2025 tournaments", "tennis_2025.xml"),
        ("olympics 2025 2026", "olympics_2025.xml"),
        ("cricket 2025 matches", "cricket_2025.xml"),
        ("golf 2025 tournaments", "golf_2025.xml"),
        ("baseball MLB 2025", "baseball_mlb_2025.xml"),
        ("rugby 2025", "rugby_2025.xml"),
        ("formula 1 F1 2025", "formula1_2025.xml"),
        ("sports news 2025", "sports_news_2025.xml"),
        ("Manchester United 2025", "manchester_united_2025.xml"),
        ("Real Madrid 2025", "real_madrid_2025.xml"),
        ("Arsenal 2025", "arsenal_2025.xml"),
        ("Chelsea 2025", "chelsea_2025.xml"),

        # Finance & Business
        ("stock market 2025 2026", "stock_market_2025.xml"),
        ("cryptocurrency bitcoin 2025", "crypto_bitcoin_2025.xml"),
        ("apple stock 2025", "apple_stock_2025.xml"),
        ("tesla stock 2025", "tesla_stock_2025.xml"),
        ("microsoft earnings 2025", "microsoft_earnings_2025.xml"),
        ("nvidia stock 2025", "nvidia_stock_2025.xml"),
        ("amazon business 2025", "amazon_business_2025.xml"),
        ("google alphabet 2025", "google_alphabet_2025.xml"),
        ("meta facebook 2025", "meta_facebook_2025.xml"),
        ("dow jones 2025", "dow_jones_2025.xml"),
        ("nasdaq 2025", "nasdaq_2025.xml"),
        ("sp500 2025", "sp500_2025.xml"),
        ("federal reserve 2025", "federal_reserve_2025.xml"),
        ("inflation rates 2025", "inflation_2025.xml"),
        ("interest rates 2025", "interest_rates_2025.xml"),
        ("banking news 2025", "banking_2025.xml"),
        ("wall street 2025", "wall_street_2025.xml"),
        ("financial markets 2025", "financial_markets_2025.xml"),

        # Technology
        ("artificial intelligence AI 2025", "ai_tech_2025.xml"),
        ("chatgpt openai 2025", "chatgpt_openai_2025.xml"),
        ("iphone apple 2025", "iphone_apple_2025.xml"),
        ("samsung galaxy 2025", "samsung_galaxy_2025.xml"),
        ("android google 2025", "android_google_2025.xml"),
        ("spacex elon musk 2025", "spacex_2025.xml"),
        ("twitter x social media 2025", "twitter_x_2025.xml"),
        ("instagram social media 2025", "instagram_2025.xml"),
        ("tiktok social media 2025", "tiktok_2025.xml"),
        ("youtube google 2025", "youtube_2025.xml"),
        ("netflix streaming 2025", "netflix_2025.xml"),
        ("gaming industry 2025", "gaming_2025.xml"),
        ("cybersecurity 2025", "cybersecurity_2025.xml"),
        ("quantum computing 2025", "quantum_computing_2025.xml"),

        # Entertainment & Celebrity
        ("hollywood movies 2025", "hollywood_movies_2025.xml"),
        ("music industry 2025", "music_industry_2025.xml"),
        ("taylor swift 2025", "taylor_swift_2025.xml"),
        ("celebrity news 2025", "celebrity_news_2025.xml"),
        ("oscars academy awards 2025", "oscars_2025.xml"),
        ("grammy awards 2025", "grammy_2025.xml"),
        ("marvel movies 2025", "marvel_movies_2025.xml"),
        ("disney entertainment 2025", "disney_2025.xml"),
        ("streaming services 2025", "streaming_2025.xml"),
        ("video games 2025", "video_games_2025.xml"),

        # Politics & World News
        ("united kingdom politics 2025", "uk_politics_2025.xml"),
        ("donald trump 2025", "trump_2025.xml"),
        ("joe biden 2025", "biden_2025.xml"),
        ("european union 2025", "eu_2025.xml"),
        ("china news 2025", "china_news_2025.xml"),
        ("russia news 2025", "russia_news_2025.xml"),
        ("ukraine news 2025", "ukraine_news_2025.xml"),
        ("middle east news 2025", "middle_east_2025.xml"),
        ("japan news 2025", "japan_news_2025.xml"),
        ("australia news 2025", "australia_news_2025.xml"),
        ("canada news 2025", "canada_news_2025.xml"),
        ("india news 2025", "india_news_2025.xml"),

        # Health & Science
        ("medical breakthrough 2025", "medical_breakthrough_2025.xml"),
        ("covid health 2025", "covid_health_2025.xml"),
        ("space exploration 2025", "space_exploration_2025.xml"),
        ("nasa space 2025", "nasa_space_2025.xml"),
        ("climate science 2025", "climate_science_2025.xml"),
        ("renewable energy 2025", "renewable_energy_2025.xml"),
        ("electric vehicles 2025", "electric_vehicles_2025.xml"),
        ("pharmaceutical drugs 2025", "pharmaceutical_2025.xml"),

        # Lifestyle & Culture
        ("fashion industry 2025", "fashion_2025.xml"),
        ("food industry 2025", "food_industry_2025.xml"),
        ("travel tourism 2025", "travel_tourism_2025.xml"),
        ("education 2025", "education_2025.xml"),
        ("real estate property 2025", "real_estate_2025.xml"),
        ("automotive cars 2025", "automotive_2025.xml"),
        ("luxury brands 2025", "luxury_brands_2025.xml"),

        # More specific categories
        ("breaking news 2025", "breaking_news_2025.xml"),
        ("world news 2025", "world_news_2025.xml"),
        ("business news 2025", "business_news_2025.xml"),
        ("technology news 2025", "tech_news_2025.xml"),
        ("entertainment news 2025", "entertainment_news_2025.xml"),
        ("sports headlines 2025", "sports_headlines_2025.xml"),
    ]

    print(f"Starting regular news collection with {len(regular_news_queries)} queries...")
    print("Target: 6,000+ regular news items")

    total_items_fetched = 0

    for i, (query, filename) in enumerate(regular_news_queries, 1):
        print(f"\n[{i}/{len(regular_news_queries)}] Processing: {query}")

        xml_content = fetch_google_news_rss(query)
        if xml_content:
            items = parse_rss_content(xml_content)
            if items:
                save_as_xml(items, filename, f"Regular News: {query.replace(' 2025 2026', '').replace(' 2025', '').title()}")
                total_items_fetched += len(items)
                print(f"Total regular news items fetched so far: {total_items_fetched}")
            else:
                print(f"No items found for {query}")
        else:
            print(f"Failed to fetch content for {query}")

        if i % 10 == 0:
            print(f"\n*** PROGRESS UPDATE: Completed {i}/{len(regular_news_queries)} queries ***")
            print(f"*** Total regular news items fetched: {total_items_fetched} ***\n")

        if total_items_fetched >= 6000:
            print(f"\n🎉 Target reached! {total_items_fetched} items fetched")
            break

    print("\n" + "="*60)
    print(f"Regular news collection complete! Total items: {total_items_fetched}")

if __name__ == "__main__":
    main()