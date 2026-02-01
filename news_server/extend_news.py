#!/usr/bin/env python3
import json
import random
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from xml.dom import minidom
import os
import glob

def load_news_json(file_path):
    """Load and parse the news.json file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_random_events():
    """Generate random news events with random pubDates"""
    random_events = [
        {
            "title": "Major breakthrough in renewable energy technology announced - TechNews",
            "link": "https://example.com/tech/renewable-breakthrough",
            "guid": "tech-renewable-breakthrough-2026",
            "description": "Scientists develop new solar panel technology with 90% efficiency rate",
            "source": "https://example.com"
        },
        {
            "title": "Global climate summit reaches historic agreement - Environmental Times",
            "link": "https://example.com/climate/historic-agreement",
            "guid": "climate-historic-agreement-2026",
            "description": "World leaders commit to ambitious carbon reduction targets",
            "source": "https://example.com"
        },
        {
            "title": "AI breakthrough in medical diagnostics - Medical Journal",
            "link": "https://example.com/medical/ai-breakthrough",
            "guid": "medical-ai-breakthrough-2026",
            "description": "New AI system can detect diseases with 99% accuracy",
            "source": "https://example.com"
        },
        {
            "title": "Space exploration reaches new milestone - Space Daily",
            "link": "https://example.com/space/new-milestone",
            "guid": "space-new-milestone-2026",
            "description": "First successful mission to establish permanent lunar base",
            "source": "https://example.com"
        },
        {
            "title": "Economic recovery shows strong signs globally - Financial News",
            "link": "https://example.com/economy/recovery-signs",
            "guid": "economy-recovery-signs-2026",
            "description": "Global markets surge as recovery accelerates worldwide",
            "source": "https://example.com"
        }
    ]

    # Generate random dates within the last 30 days
    now = datetime.now()
    for event in random_events:
        random_days = random.randint(0, 30)
        random_hours = random.randint(0, 23)
        random_minutes = random.randint(0, 59)
        random_date = now - timedelta(days=random_days, hours=random_hours, minutes=random_minutes)
        event["pubDate"] = random_date.strftime("%a, %d %b %Y %H:%M:%S GMT")

    return random_events

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
                print(f"Removing duplicate item with {id_type}: {id_value[:100]}...")
                is_duplicate = True
                break

        if not is_duplicate:
            # Add all identifiers to seen set
            for id_type, id_value in identifiers:
                seen.add(id_value)
            unique_items.append(item)

    return unique_items

def extend_news_json(news_data, random_events):
    """Add random events to the news data and ensure uniqueness"""
    # Combine all items
    all_items = news_data["items"] + random_events

    # Remove duplicates
    print(f"Checking {len(all_items)} items for duplicates...")
    unique_items = ensure_uniqueness(all_items)
    print(f"Kept {len(unique_items)} unique items (removed {len(all_items) - len(unique_items)} duplicates)")

    news_data["items"] = unique_items

    # Sort all items by pubDate
    def parse_date(item):
        try:
            return datetime.strptime(item["pubDate"], "%a, %d %b %Y %H:%M:%S GMT")
        except:
            return datetime.min

    news_data["items"].sort(key=parse_date, reverse=True)
    return news_data

def parse_xml_file(file_path):
    """Parse an XML file and extract items with dates"""
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()

        items = []

        # Find all item elements
        for item in root.iter('item'):
            item_data = {}

            # Extract basic fields
            for field in ['title', 'link', 'guid', 'pubDate', 'description']:
                element = item.find(field)
                if element is not None:
                    item_data[field] = element.text

            # Try to extract source from link or add a default
            if 'link' in item_data:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(item_data['link'])
                    item_data['source'] = f"{parsed.scheme}://{parsed.netloc}"
                except:
                    item_data['source'] = "https://example.com"
            else:
                item_data['source'] = "https://example.com"

            if item_data:  # Only add if we found some data
                items.append(item_data)

        return items

    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return []

def integrate_xml_files():
    """Find all XML files and integrate them in date order"""
    xml_files = glob.glob("*.xml")
    all_items = []

    print(f"Found XML files: {xml_files}")

    for xml_file in xml_files:
        print(f"Processing {xml_file}...")
        items = parse_xml_file(xml_file)
        all_items.extend(items)
        print(f"Extracted {len(items)} items from {xml_file}")

    # Remove duplicates from XML items
    print(f"Checking {len(all_items)} XML items for duplicates...")
    unique_items = ensure_uniqueness(all_items)
    print(f"Kept {len(unique_items)} unique XML items (removed {len(all_items) - len(unique_items)} duplicates)")

    # Sort all items by date
    def parse_date(item):
        if 'pubDate' not in item:
            return datetime.min
        try:
            return datetime.strptime(item["pubDate"], "%a, %d %b %Y %H:%M:%S GMT")
        except:
            try:
                # Try alternative date formats
                return datetime.strptime(item["pubDate"], "%Y-%m-%d %H:%M:%S")
            except:
                return datetime.min

    unique_items.sort(key=parse_date, reverse=True)

    # Create integrated XML
    create_integrated_xml(unique_items)

    return unique_items

def create_integrated_xml(items):
    """Create a single integrated XML file from all items"""
    # Create root RSS element
    rss = ET.Element('rss')
    rss.set('version', '2.0')
    rss.set('xmlns:media', 'http://search.yahoo.com/mrss/')

    # Create channel
    channel = ET.SubElement(rss, 'channel')

    # Add channel metadata
    ET.SubElement(channel, 'title').text = "Integrated News Feed"
    ET.SubElement(channel, 'link').text = "https://example.com/integrated"
    ET.SubElement(channel, 'description').text = "Integrated news from multiple XML sources"
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

    with open('integrated_news.xml', 'w', encoding='utf-8') as f:
        f.write(reparsed.toprettyxml(indent="  "))

    print(f"Created integrated_news.xml with {len(items)} items")

def main():
    """Main function to extend news.json and integrate XML files"""
    print("Starting news processing...")

    # Load existing news.json
    print("Loading news.json...")
    news_data = load_news_json('news.json')
    original_count = len(news_data["items"])
    print(f"Loaded {original_count} existing news items")

    # Generate and add random events
    print("Generating random events...")
    random_events = generate_random_events()
    news_data = extend_news_json(news_data, random_events)
    print(f"Added {len(random_events)} random events")

    # Save extended news.json
    with open('news_extended.json', 'w', encoding='utf-8') as f:
        json.dump(news_data, f, indent=2, ensure_ascii=False)
    print(f"Saved extended news to news_extended.json with {len(news_data['items'])} total items")

    # Integrate XML files
    print("\nIntegrating XML files...")
    xml_items = integrate_xml_files()
    print(f"Integrated {len(xml_items)} items from XML files")

    print("\nProcessing complete!")
    print(f"- Extended JSON: news_extended.json ({len(news_data['items'])} items)")
    print(f"- Integrated XML: integrated_news.xml ({len(xml_items)} items)")

if __name__ == "__main__":
    main()