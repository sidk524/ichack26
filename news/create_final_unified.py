#!/usr/bin/env python3
import json
import xml.etree.ElementTree as ET
import glob
from datetime import datetime

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

def load_all_xml_files():
    """Load all XML files"""
    xml_files = glob.glob("*.xml")
    all_items = []

    print(f"Loading {len(xml_files)} XML files...")

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

def load_all_json_files():
    """Load all JSON files"""
    json_files = glob.glob("*.json")
    all_items = []

    print(f"Loading {len(json_files)} JSON files...")

    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'items' in data:
                    items = data['items']
                    all_items.extend(items)
                    print(f"Loaded {len(items)} items from {json_file}")
                elif isinstance(data, list):
                    all_items.extend(data)
                    print(f"Loaded {len(data)} items from {json_file}")
        except Exception as e:
            print(f"Error loading {json_file}: {e}")

    return all_items

def main():
    """Create final unified JSON with all data"""
    print("Creating final unified JSON from all sources...")

    # Load all data
    xml_items = load_all_xml_files()
    json_items = load_all_json_files()

    # Combine all items
    all_items = xml_items + json_items

    print(f"Total raw items: {len(all_items)}")

    # Remove duplicates
    print("Removing duplicates...")
    unique_items = ensure_uniqueness(all_items)
    print(f"Unique items: {len(unique_items)} (removed {len(all_items) - len(unique_items)} duplicates)")

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
            "title": "Massive Unified Disaster News Feed - Complete Collection",
            "link": "https://news.google.com",
            "description": f"Complete disaster news collection with {len(unique_items)} unique items from multiple sources",
            "language": "en-GB",
            "lastBuildDate": datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "generator": "Complete Disaster News Aggregator 3.0"
        },
        "items": unique_items
    }

    # Save unified JSON
    with open('massive_unified_disaster_news.json', 'w', encoding='utf-8') as f:
        json.dump(unified_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Created massive_unified_disaster_news.json with {len(unique_items)} unique items")

    # Check if we reached 10k
    if len(unique_items) >= 10000:
        print(f"🎉 SUCCESS! Reached target of 10,000+ items! ({len(unique_items)} items)")
        return True
    else:
        print(f"📊 Result: {len(unique_items)} items (Target was 10,000)")
        return False

if __name__ == "__main__":
    success = main()