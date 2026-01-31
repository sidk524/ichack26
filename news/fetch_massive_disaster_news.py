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
            time.sleep(random.uniform(0.5, 2))

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

    print(f"Loading existing XML files: {len(xml_files)} files found")

    for xml_file in xml_files:
        try:
            with open(xml_file, 'r', encoding='utf-8') as f:
                content = f.read()
                items = parse_rss_content(content)
                all_items.extend(items)
                if items:
                    print(f"Loaded {len(items)} items from {xml_file}")
        except Exception as e:
            print(f"Error loading {xml_file}: {e}")

    return all_items

def main():
    """Main function to fetch massive disaster news and create unified JSON"""

    # Comprehensive disaster queries to reach 10k+ items
    disaster_queries = [
        # Natural Disasters - Specific Events
        ("haiti earthquake 2025 2026", "haiti_earthquake_2025.xml"),
        ("la wildfire 2025 palisades", "la_palisades_fire_2025.xml"),
        ("california wildfire 2025 2026", "california_wildfire_2025.xml"),
        ("los angeles fires january 2025", "la_fires_jan_2025.xml"),
        ("palisades fire evacuations", "palisades_evacuations.xml"),
        ("altadena fire 2025", "altadena_fire_2025.xml"),

        # Weather Disasters
        ("hurricane 2025 2026", "hurricane_2025.xml"),
        ("tornado 2025 2026", "tornado_2025.xml"),
        ("blizzard storm 2025", "blizzard_2025.xml"),
        ("ice storm 2025", "ice_storm_2025.xml"),
        ("drought 2025 2026", "drought_2025.xml"),
        ("heat wave 2025", "heat_wave_2025.xml"),
        ("severe weather 2025", "severe_weather_2025.xml"),
        ("winter storm 2025", "winter_storm_2025.xml"),

        # Geological
        ("earthquake 2025 2026", "earthquake_2025.xml"),
        ("volcano eruption 2025", "volcano_2025.xml"),
        ("landslide 2025", "landslide_2025.xml"),
        ("tsunami warning 2025", "tsunami_2025.xml"),
        ("geological disaster 2025", "geological_2025.xml"),

        # Fire Related
        ("wildfire 2025 2026", "wildfire_2025.xml"),
        ("forest fire 2025", "forest_fire_2025.xml"),
        ("brush fire 2025", "brush_fire_2025.xml"),
        ("fire evacuation 2025", "fire_evacuation_2025.xml"),
        ("arson fire 2025", "arson_fire_2025.xml"),
        ("structure fire 2025", "structure_fire_2025.xml"),

        # Flood Related
        ("flood 2025 2026", "flood_2025.xml"),
        ("flash flood 2025", "flash_flood_2025.xml"),
        ("river flood 2025", "river_flood_2025.xml"),
        ("coastal flooding 2025", "coastal_flood_2025.xml"),
        ("dam failure 2025", "dam_failure_2025.xml"),

        # Emergency Response
        ("emergency response 2025", "emergency_response_2025.xml"),
        ("disaster relief 2025", "disaster_relief_2025.xml"),
        ("evacuation order 2025", "evacuation_2025.xml"),
        ("rescue operations 2025", "rescue_operations_2025.xml"),
        ("first responders 2025", "first_responders_2025.xml"),
        ("emergency services 2025", "emergency_services_2025.xml"),
        ("disaster preparedness 2025", "disaster_prep_2025.xml"),

        # Infrastructure
        ("power outage 2025", "power_outage_2025.xml"),
        ("water shortage 2025", "water_shortage_2025.xml"),
        ("infrastructure failure 2025", "infrastructure_fail_2025.xml"),
        ("bridge collapse 2025", "bridge_collapse_2025.xml"),
        ("building collapse 2025", "building_collapse_2025.xml"),

        # Health/Environmental
        ("air quality emergency 2025", "air_quality_2025.xml"),
        ("toxic spill 2025", "toxic_spill_2025.xml"),
        ("chemical accident 2025", "chemical_accident_2025.xml"),
        ("environmental disaster 2025", "environmental_2025.xml"),
        ("pollution disaster 2025", "pollution_2025.xml"),

        # Climate Related
        ("climate disaster 2025", "climate_disaster_2025.xml"),
        ("extreme weather 2025", "extreme_weather_2025.xml"),
        ("climate emergency 2025", "climate_emergency_2025.xml"),
        ("global warming impact 2025", "global_warming_2025.xml"),

        # Regional Specific
        ("disaster japan 2025", "japan_disaster_2025.xml"),
        ("disaster australia 2025", "australia_disaster_2025.xml"),
        ("disaster europe 2025", "europe_disaster_2025.xml"),
        ("disaster asia 2025", "asia_disaster_2025.xml"),
        ("disaster africa 2025", "africa_disaster_2025.xml"),
        ("disaster south america 2025", "south_america_disaster_2025.xml"),
        ("disaster canada 2025", "canada_disaster_2025.xml"),
        ("disaster mexico 2025", "mexico_disaster_2025.xml"),

        # Urban Disasters
        ("city emergency 2025", "city_emergency_2025.xml"),
        ("urban disaster 2025", "urban_disaster_2025.xml"),
        ("metropolitan emergency 2025", "metro_emergency_2025.xml"),

        # Transportation
        ("transport disaster 2025", "transport_disaster_2025.xml"),
        ("highway closure disaster 2025", "highway_closure_2025.xml"),
        ("airport emergency 2025", "airport_emergency_2025.xml"),

        # Additional Natural Phenomena
        ("sinkhole 2025", "sinkhole_2025.xml"),
        ("avalanche 2025", "avalanche_2025.xml"),
        ("mudslide 2025", "mudslide_2025.xml"),
        ("rockslide 2025", "rockslide_2025.xml"),

        # Broader Search Terms
        ("natural disaster news 2025", "natural_disaster_news_2025.xml"),
        ("breaking disaster news 2025", "breaking_disaster_2025.xml"),
        ("disaster alert 2025", "disaster_alert_2025.xml"),
        ("emergency alert 2025", "emergency_alert_2025.xml"),
        ("catastrophe 2025", "catastrophe_2025.xml"),
        ("calamity 2025", "calamity_2025.xml")
    ]

    print(f"Starting massive disaster news collection with {len(disaster_queries)} queries...")
    print("Target: 10,000+ items")

    total_items_fetched = 0

    # Fetch news for each disaster type
    for i, (query, filename) in enumerate(disaster_queries, 1):
        print(f"\n[{i}/{len(disaster_queries)}] Processing: {query}")

        # Fetch RSS content
        xml_content = fetch_google_news_rss(query)
        if xml_content:
            # Parse and save as XML
            items = parse_rss_content(xml_content)
            if items:
                save_as_xml(items, filename, f"Disaster News: {query.replace(' 2025 2026', '').replace(' 2025', '').title()}")
                total_items_fetched += len(items)
                print(f"Total items fetched so far: {total_items_fetched}")
            else:
                print(f"No items found for {query}")
        else:
            print(f"Failed to fetch content for {query}")

        # Progress update
        if i % 10 == 0:
            print(f"\n*** PROGRESS UPDATE: Completed {i}/{len(disaster_queries)} queries ***")
            print(f"*** Total items fetched: {total_items_fetched} ***\n")

    # Load all XML files and create unified JSON
    print("\n" + "="*60)
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
            "title": "Massive Unified Disaster News Feed",
            "link": "https://news.google.com",
            "description": "Comprehensive disaster news from multiple sources - 10k+ items",
            "language": "en-GB",
            "lastBuildDate": datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "generator": "Massive Disaster News Aggregator 2.0"
        },
        "items": unique_items
    }

    # Save unified JSON
    with open('massive_unified_disaster_news.json', 'w', encoding='utf-8') as f:
        json.dump(unified_data, f, indent=2, ensure_ascii=False)

    print(f"Created massive_unified_disaster_news.json with {len(unique_items)} unique items")

    # Summary
    print("\n" + "="*60)
    print("FINAL SUMMARY:")
    print(f"- Processed {len(disaster_queries)} different disaster queries")
    print(f"- Total raw items fetched: {total_items_fetched}")
    print(f"- Total items loaded from all XML files: {len(all_items)}")
    print(f"- Unique items after deduplication: {len(unique_items)}")
    print(f"- Duplicates removed: {len(all_items) - len(unique_items)}")
    print(f"- Final JSON file: massive_unified_disaster_news.json")

    # Check if we reached 10k
    if len(unique_items) >= 10000:
        print(f"🎉 SUCCESS: Reached target of 10,000+ items! ({len(unique_items)} items)")
    else:
        print(f"📊 Result: {len(unique_items)} items (Target was 10,000)")

if __name__ == "__main__":
    main()