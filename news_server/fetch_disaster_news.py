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

            # Add small delay to be respectful
            time.sleep(random.uniform(1, 3))

            return response.text

        except Exception as e:
            print(f"Error fetching {query} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(random.uniform(2, 5))
            else:
                print(f"Failed to fetch after {max_retries} attempts")
                return None

def parse_rss_content(xml_content):
    """Parse RSS XML content and extract items"""
    try:
        root = ET.fromstring(xml_content)
        items = []

        # Find all item elements
        for item in root.iter('item'):
            item_data = {}

            # Extract basic fields
            for field in ['title', 'link', 'guid', 'pubDate', 'description']:
                element = item.find(field)
                if element is not None:
                    item_data[field] = element.text

            # Try to extract source from link
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
    # Create root RSS element
    rss = ET.Element('rss')
    rss.set('version', '2.0')
    rss.set('xmlns:media', 'http://search.yahoo.com/mrss/')

    # Create channel
    channel = ET.SubElement(rss, 'channel')

    # Add channel metadata
    ET.SubElement(channel, 'title').text = title
    ET.SubElement(channel, 'link').text = "https://news.google.com"
    ET.SubElement(channel, 'description').text = f"Google News feed for {title}"
    ET.SubElement(channel, 'language').text = "en-GB"
    ET.SubElement(channel, 'generator').text = "NFE/5.0"
    ET.SubElement(channel, 'lastBuildDate').text = datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT")

    # Add all items
    for item_data in items:
        item = ET.SubElement(channel, 'item')

        for field in ['title', 'link', 'guid', 'pubDate', 'description']:
            if field in item_data and item_data[field]:
                ET.SubElement(item, field).text = item_data[field]

    # Pretty print and save
    rough_string = ET.tostring(rss, 'utf-8')
    reparsed = minidom.parseString(rough_string)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(reparsed.toprettyxml(indent="  "))

    print(f"Saved {len(items)} items to {filename}")

def ensure_uniqueness(items):
    """Remove duplicate items based on title, link, or guid"""
    seen = set()
    unique_items = []

    for item in items:
        # Create a unique identifier based on title, link, or guid
        identifiers = []
        if 'title' in item and item['title']:
            identifiers.append(('title', item['title'].strip().lower()))
        if 'link' in item and item['link']:
            identifiers.append(('link', item['link'].strip()))
        if 'guid' in item and item['guid']:
            identifiers.append(('guid', item['guid'].strip()))

        # Check if any identifier has been seen before
        is_duplicate = False
        for id_type, id_value in identifiers:
            if id_value in seen:
                is_duplicate = True
                break

        if not is_duplicate:
            # Add all identifiers to seen set
            for id_type, id_value in identifiers:
                seen.add(id_value)
            unique_items.append(item)

    return unique_items

def load_existing_xml_files():
    """Load all existing XML files"""
    xml_files = glob.glob("*.xml")
    all_items = []

    print(f"Loading existing XML files: {xml_files}")

    for xml_file in xml_files:
        try:
            with open(xml_file, 'r', encoding='utf-8') as f:
                content = f.read()
                items = parse_rss_content(content)
                all_items.extend(items)
                print(f"Loaded {len(items)} items from {xml_file}")
        except Exception as e:
            print(f"Error loading {xml_file}: {e}")

    return all_items

def main():
    """Main function to fetch disaster news and create unified JSON"""

    # Define disaster queries with more specific recent terms
    disaster_queries = [
        ("haiti disaster 2025 2026", "haiti_disaster_recent.xml"),
        ("la wildfire 2025 palisades", "la_wildfire_recent.xml"),
        ("california wildfire 2025 2026", "california_wildfire_recent.xml"),
        ("natural disaster 2025 2026", "natural_disaster_recent.xml"),
        ("earthquake 2025 2026", "earthquake_recent.xml"),
        ("hurricane 2025 2026", "hurricane_recent.xml"),
        ("flood disaster 2025 2026", "flood_recent.xml"),
        ("wildfire evacuation 2025", "wildfire_evacuation_recent.xml"),
        ("emergency response 2025 2026", "emergency_response_recent.xml"),
        ("disaster relief 2025 2026", "disaster_relief_recent.xml"),
        ("climate disaster 2025", "climate_disaster_recent.xml"),
        ("forest fire 2025 2026", "forest_fire_recent.xml"),
        ("tornado 2025 2026", "tornado_recent.xml"),
        ("tsunami 2025 2026", "tsunami_recent.xml"),
        ("volcanic eruption 2025", "volcanic_eruption_recent.xml")
    ]

    print("Starting disaster news collection...")

    # Fetch news for each disaster type
    for query, filename in disaster_queries:
        print(f"\nProcessing: {query}")

        # Fetch RSS content
        xml_content = fetch_google_news_rss(query)
        if xml_content:
            # Parse and save as XML
            items = parse_rss_content(xml_content)
            if items:
                save_as_xml(items, filename, f"Recent {query.replace(' 2025 2026', '').replace(' 2025', '').title()}")
            else:
                print(f"No items found for {query}")
        else:
            print(f"Failed to fetch content for {query}")

    # Load all XML files and create unified JSON
    print("\n" + "="*50)
    print("Creating unified JSON from all XML files...")

    all_items = load_existing_xml_files()

    # Remove duplicates
    print(f"Removing duplicates from {len(all_items)} total items...")
    unique_items = ensure_uniqueness(all_items)
    print(f"Kept {len(unique_items)} unique items (removed {len(all_items) - len(unique_items)} duplicates)")

    # Sort by date
    def parse_date(item):
        if 'pubDate' not in item:
            return datetime.min
        try:
            return datetime.strptime(item["pubDate"], "%a, %d %b %Y %H:%M:%S GMT")
        except:
            try:
                return datetime.strptime(item["pubDate"], "%Y-%m-%d %H:%M:%S")
            except:
                return datetime.min

    unique_items.sort(key=parse_date, reverse=True)

    # Create unified JSON structure
    unified_data = {
        "feed": {
            "title": "Unified Disaster News Feed",
            "link": "https://news.google.com",
            "description": "Comprehensive disaster news from multiple sources",
            "language": "en-GB",
            "lastBuildDate": datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "generator": "Disaster News Aggregator 1.0"
        },
        "items": unique_items
    }

    # Save unified JSON
    with open('unified_disaster_news.json', 'w', encoding='utf-8') as f:
        json.dump(unified_data, f, indent=2, ensure_ascii=False)

    print(f"Created unified_disaster_news.json with {len(unique_items)} unique items")

    # Summary
    print("\n" + "="*50)
    print("SUMMARY:")
    print(f"- Fetched news for {len(disaster_queries)} disaster types")
    print(f"- Created {len([f for q, f in disaster_queries])} XYZ.xml files")
    print(f"- Unified JSON: unified_disaster_news.json ({len(unique_items)} items)")
    print("- All data is deduplicated and sorted by date")

if __name__ == "__main__":
    main()