#!/usr/bin/env python3
import json
import xml.etree.ElementTree as ET
import glob
from datetime import datetime
import random

def ensure_uniqueness(items):
    """Remove duplicate items based on title, link, or guid"""
    seen = set()
    unique_items = []

    for item in items:
        identifiers = []
        if 'title' in item and item['title']:
            identifiers.append(('title', item['title'].strip().lower()))
        if 'link' in item and item['link']:
            identifiers.append(('link', item['link'].strip()))
        if 'guid' in item and item['guid']:
            identifiers.append(('guid', item['guid'].strip()))

        is_duplicate = False
        for id_type, id_value in identifiers:
            if id_value in seen:
                is_duplicate = True
                break

        if not is_duplicate:
            for id_type, id_value in identifiers:
                seen.add(id_value)
            unique_items.append(item)

    return unique_items

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
                    from urllib.parse import urlparse
                    parsed = urlparse(item_data['link'])
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

def categorize_xml_files():
    """Categorize XML files into disaster and regular news"""
    xml_files = glob.glob("*.xml")

    disaster_keywords = [
        'disaster', 'fire', 'wildfire', 'earthquake', 'hurricane', 'tornado', 'flood', 'tsunami',
        'volcano', 'emergency', 'evacuation', 'rescue', 'landslide', 'drought', 'storm', 'blizzard',
        'toxic', 'spill', 'chemical', 'environmental', 'climate_disaster', 'climate_emergency',
        'geological', 'infrastructure_fail', 'building_collapse', 'bridge_collapse', 'dam_failure',
        'power_outage', 'water_shortage', 'air_quality', 'pollution', 'arson', 'brush_fire',
        'structure_fire', 'forest_fire', 'flash_flood', 'river_flood', 'coastal_flood',
        'palisades', 'altadena', 'haiti_earthquake', 'haiti_disaster'
    ]

    regular_keywords = [
        'football', 'basketball', 'soccer', 'tennis', 'cricket', 'golf', 'baseball', 'rugby',
        'formula1', 'sports', 'manchester', 'real_madrid', 'arsenal', 'chelsea', 'stock',
        'crypto', 'bitcoin', 'apple', 'tesla', 'microsoft', 'nvidia', 'amazon', 'google',
        'meta', 'facebook', 'dow_jones', 'nasdaq', 'sp500', 'federal_reserve', 'inflation',
        'banking', 'wall_street', 'financial', 'ai_tech', 'chatgpt', 'iphone', 'samsung',
        'android', 'spacex', 'twitter', 'instagram', 'tiktok', 'youtube', 'netflix',
        'gaming', 'cybersecurity', 'quantum', 'hollywood', 'music', 'taylor_swift',
        'celebrity', 'oscars', 'grammy', 'marvel', 'disney', 'streaming', 'video_games',
        'politics', 'trump', 'biden', 'china_news', 'russia_news', 'ukraine_news',
        'medical', 'covid', 'space_exploration', 'nasa', 'renewable_energy', 'electric_vehicles',
        'pharmaceutical', 'fashion', 'food_industry', 'travel', 'education', 'real_estate',
        'automotive', 'luxury', 'breaking_news', 'world_news', 'business_news', 'tech_news',
        'entertainment_news', 'sports_headlines'
    ]

    disaster_files = []
    regular_files = []

    for xml_file in xml_files:
        filename_lower = xml_file.lower()

        is_disaster = any(keyword in filename_lower for keyword in disaster_keywords)
        is_regular = any(keyword in filename_lower for keyword in regular_keywords)

        if is_disaster and not is_regular:
            disaster_files.append(xml_file)
        elif is_regular and not is_disaster:
            regular_files.append(xml_file)
        elif 'integrated_news' in filename_lower or 'news.xml' in filename_lower:
            regular_files.append(xml_file)
        else:
            # Default categorization for ambiguous files
            if any(word in filename_lower for word in ['recent', '2025']):
                if 'disaster' in filename_lower or 'fire' in filename_lower:
                    disaster_files.append(xml_file)
                else:
                    regular_files.append(xml_file)
            else:
                regular_files.append(xml_file)

    return disaster_files, regular_files

def load_xml_files(file_list, max_items=None):
    """Load XML files and return items"""
    all_items = []

    print(f"Loading {len(file_list)} XML files...")

    for xml_file in file_list:
        try:
            with open(xml_file, 'r', encoding='utf-8') as f:
                content = f.read()
                items = parse_rss_content(content)
                all_items.extend(items)
                print(f"Loaded {len(items)} items from {xml_file}")

                if max_items and len(all_items) >= max_items:
                    print(f"Reached target of {max_items} items, stopping...")
                    break

        except Exception as e:
            print(f"Error loading {xml_file}: {e}")

    if max_items:
        all_items = all_items[:max_items]

    return all_items

def main():
    """Create balanced dataset: 4k disaster + 6k regular news"""
    print("Creating balanced dataset: 4k disaster events + 6k regular news")
    print("="*60)

    # Categorize XML files
    disaster_files, regular_files = categorize_xml_files()

    print(f"Found {len(disaster_files)} disaster files")
    print(f"Found {len(regular_files)} regular news files")

    # Load disaster events (limit to 4k)
    print("\nLoading disaster events (target: 4,000)...")
    disaster_items = load_xml_files(disaster_files)
    disaster_items = ensure_uniqueness(disaster_items)

    # Randomly sample 4k disaster items if we have more
    if len(disaster_items) > 4000:
        print(f"Sampling 4,000 from {len(disaster_items)} disaster items...")
        disaster_items = random.sample(disaster_items, 4000)

    print(f"Selected {len(disaster_items)} disaster items")

    # Load regular news (target 6k)
    print("\nLoading regular news (target: 6,000)...")
    regular_items = load_xml_files(regular_files)
    regular_items = ensure_uniqueness(regular_items)

    # If we don't have enough regular news, pad with existing items
    if len(regular_items) < 6000:
        print(f"Have {len(regular_items)} regular items, need 6,000...")
        print("Loading JSON files to supplement regular news...")

        # Load existing JSON files for regular news
        json_files = glob.glob("*.json")
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if 'items' in data:
                        # Filter out disaster-related items from JSON
                        filtered_items = []
                        for item in data['items']:
                            title_lower = item.get('title', '').lower()
                            if not any(word in title_lower for word in ['disaster', 'fire', 'earthquake', 'flood', 'hurricane']):
                                filtered_items.append(item)
                        regular_items.extend(filtered_items)
                        print(f"Added {len(filtered_items)} regular items from {json_file}")
            except Exception as e:
                print(f"Error loading {json_file}: {e}")

        # Remove duplicates again
        regular_items = ensure_uniqueness(regular_items)

    # Sample 6k regular items if we have more
    if len(regular_items) > 6000:
        print(f"Sampling 6,000 from {len(regular_items)} regular items...")
        regular_items = random.sample(regular_items, 6000)

    print(f"Selected {len(regular_items)} regular news items")

    # Combine and sort by date
    all_items = disaster_items + regular_items

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

    all_items.sort(key=parse_date, reverse=True)

    # Create balanced JSON structure
    balanced_data = {
        "feed": {
            "title": "Balanced News Feed - 4k Disasters + 6k Regular News",
            "link": "https://news.google.com",
            "description": f"Balanced news collection: {len(disaster_items)} disaster events + {len(regular_items)} regular news = {len(all_items)} total items",
            "language": "en-GB",
            "lastBuildDate": datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "generator": "Balanced News Aggregator 1.0"
        },
        "disaster_count": len(disaster_items),
        "regular_count": len(regular_items),
        "total_count": len(all_items),
        "items": all_items
    }

    # Save balanced JSON
    with open('balanced_news_dataset.json', 'w', encoding='utf-8') as f:
        json.dump(balanced_data, f, indent=2, ensure_ascii=False)

    print("\n" + "="*60)
    print("BALANCED DATASET CREATED!")
    print("="*60)
    print(f"✅ Disaster events: {len(disaster_items)}")
    print(f"✅ Regular news: {len(regular_items)}")
    print(f"✅ Total items: {len(all_items)}")
    print(f"✅ File: balanced_news_dataset.json")

    # Breakdown by category
    print(f"\nRatio: {len(disaster_items)/len(all_items)*100:.1f}% disasters, {len(regular_items)/len(all_items)*100:.1f}% regular news")

if __name__ == "__main__":
    main()