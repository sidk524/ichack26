#!/usr/bin/env python3
"""
Convert news.xml RSS feed to JSON format.
"""

import xml.etree.ElementTree as ET
import json
from datetime import datetime

def parse_news_xml(xml_file, output_file):
    """Parse XML RSS feed and convert to JSON format."""

    tree = ET.parse(xml_file)
    root = tree.getroot()

    # Find the channel element
    channel = root.find('./channel')
    if channel is None:
        print("No channel found in XML")
        return

    # Extract channel information
    feed_info = {
        'title': channel.find('title').text if channel.find('title') is not None else '',
        'link': channel.find('link').text if channel.find('link') is not None else '',
        'description': channel.find('description').text if channel.find('description') is not None else '',
        'language': channel.find('language').text if channel.find('language') is not None else '',
        'lastBuildDate': channel.find('lastBuildDate').text if channel.find('lastBuildDate') is not None else '',
        'generator': channel.find('generator').text if channel.find('generator') is not None else ''
    }

    # Extract news items
    items = []
    for item in channel.findall('item'):
        news_item = {
            'title': item.find('title').text if item.find('title') is not None else '',
            'link': item.find('link').text if item.find('link') is not None else '',
            'guid': item.find('guid').text if item.find('guid') is not None else '',
            'pubDate': item.find('pubDate').text if item.find('pubDate') is not None else '',
            'description': item.find('description').text if item.find('description') is not None else '',
            'source': item.find('source').get('url') if item.find('source') is not None else ''
        }
        items.append(news_item)

    # Create final JSON structure
    news_data = {
        'feed': feed_info,
        'items': items,
        'totalItems': len(items),
        'convertedAt': datetime.now().isoformat()
    }

    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(news_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully converted {len(items)} news items to {output_file}")
    return news_data

if __name__ == "__main__":
    parse_news_xml("news.xml", "news.json")