#!/usr/bin/env python3
import json
import xml.etree.ElementTree as ET
import glob
import os
from collections import defaultdict

def count_json_items(json_file):
    """Count items in a JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if 'items' in data:
                return len(data['items'])
            elif isinstance(data, list):
                return len(data)
            else:
                return 0
    except Exception as e:
        print(f"Error reading {json_file}: {e}")
        return 0

def count_xml_items(xml_file):
    """Count items in an XML file"""
    try:
        with open(xml_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Try to parse as XML
        try:
            root = ET.fromstring(content)
            items = list(root.iter('item'))
            return len(items)
        except ET.ParseError:
            # If XML parsing fails, count <item> tags manually
            return content.count('<item>')

    except Exception as e:
        print(f"Error reading {xml_file}: {e}")
        return 0

def get_file_size(file_path):
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except:
        return 0

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"

    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1

    return f"{size_bytes:.1f} {size_names[i]}"

def verify_data_integrity():
    """Comprehensive verification of all data files"""

    print("="*70)
    print("COMPREHENSIVE DATA VERIFICATION REPORT")
    print("="*70)

    # Find all JSON files
    json_files = glob.glob("*.json")
    xml_files = glob.glob("*.xml")

    print(f"\nFound {len(json_files)} JSON files and {len(xml_files)} XML files")

    # Analyze JSON files
    print("\n" + "="*50)
    print("JSON FILES ANALYSIS")
    print("="*50)

    json_stats = {}
    total_json_items = 0

    for json_file in sorted(json_files):
        item_count = count_json_items(json_file)
        file_size = get_file_size(json_file)
        json_stats[json_file] = {
            'items': item_count,
            'size': file_size
        }
        total_json_items += item_count

        print(f"{json_file:<40} | {item_count:>8} items | {format_file_size(file_size):>10}")

    print("-" * 70)
    print(f"{'TOTAL JSON ITEMS:':<40} | {total_json_items:>8} items")

    # Analyze XML files
    print("\n" + "="*50)
    print("XML FILES ANALYSIS")
    print("="*50)

    xml_stats = {}
    total_xml_items = 0
    categories = defaultdict(list)

    for xml_file in sorted(xml_files):
        item_count = count_xml_items(xml_file)
        file_size = get_file_size(xml_file)
        xml_stats[xml_file] = {
            'items': item_count,
            'size': file_size
        }
        total_xml_items += item_count

        # Categorize files
        if 'recent' in xml_file:
            categories['Recent Disaster News'].append((xml_file, item_count))
        elif '2025' in xml_file:
            categories['2025 Specific'].append((xml_file, item_count))
        elif any(keyword in xml_file for keyword in ['disaster', 'fire', 'hurricane', 'earthquake']):
            categories['Natural Disasters'].append((xml_file, item_count))
        else:
            categories['General News'].append((xml_file, item_count))

        status = "✓ Valid" if item_count > 0 else "⚠ Empty/Invalid"
        print(f"{xml_file:<40} | {item_count:>8} items | {format_file_size(file_size):>10} | {status}")

    print("-" * 70)
    print(f"{'TOTAL XML ITEMS:':<40} | {total_xml_items:>8} items")

    # Category breakdown
    print("\n" + "="*50)
    print("XML FILES BY CATEGORY")
    print("="*50)

    for category, files in categories.items():
        category_total = sum(count for _, count in files)
        print(f"\n{category}: {len(files)} files, {category_total} items")
        for file, count in sorted(files, key=lambda x: x[1], reverse=True)[:5]:  # Top 5
            print(f"  • {file:<35} | {count:>6} items")
        if len(files) > 5:
            print(f"  ... and {len(files) - 5} more files")

    # Overall statistics
    print("\n" + "="*50)
    print("OVERALL STATISTICS")
    print("="*50)

    total_files = len(json_files) + len(xml_files)
    total_items = total_json_items + total_xml_items
    total_size = sum(get_file_size(f) for f in json_files + xml_files)

    print(f"Total files:           {total_files}")
    print(f"Total items:           {total_items:,}")
    print(f"Total data size:       {format_file_size(total_size)}")
    print(f"JSON items:            {total_json_items:,}")
    print(f"XML items:             {total_xml_items:,}")

    # Target verification
    print("\n" + "="*50)
    print("TARGET VERIFICATION")
    print("="*50)

    target = 10000
    if total_items >= target:
        print(f"🎉 SUCCESS! Reached target of {target:,} items")
        print(f"   Total items: {total_items:,} ({total_items - target:,} over target)")
    else:
        print(f"📊 Progress: {total_items:,} / {target:,} items ({total_items/target*100:.1f}%)")
        print(f"   Remaining: {target - total_items:,} items needed")

    # Data quality checks
    print("\n" + "="*50)
    print("DATA QUALITY CHECKS")
    print("="*50)

    valid_xml_files = [f for f in xml_files if xml_stats[f]['items'] > 0]
    invalid_xml_files = [f for f in xml_files if xml_stats[f]['items'] == 0]

    print(f"Valid XML files:       {len(valid_xml_files)} / {len(xml_files)}")
    print(f"Invalid XML files:     {len(invalid_xml_files)}")

    if invalid_xml_files:
        print("Invalid files:")
        for f in invalid_xml_files[:10]:  # Show first 10
            print(f"  • {f}")
        if len(invalid_xml_files) > 10:
            print(f"  ... and {len(invalid_xml_files) - 10} more")

    # Largest files
    print("\n" + "="*50)
    print("LARGEST FILES BY ITEM COUNT")
    print("="*50)

    all_files = [(f, json_stats[f]['items'], 'JSON') for f in json_files] + \
                [(f, xml_stats[f]['items'], 'XML') for f in xml_files]

    largest_files = sorted(all_files, key=lambda x: x[1], reverse=True)[:10]

    for i, (filename, count, file_type) in enumerate(largest_files, 1):
        print(f"{i:2d}. {filename:<35} | {count:>8} items | {file_type}")

    # Summary for massive unified file
    print("\n" + "="*50)
    print("UNIFIED DATA FILE ANALYSIS")
    print("="*50)

    massive_file = "massive_unified_disaster_news.json"
    if massive_file in json_files:
        massive_count = json_stats[massive_file]['items']
        massive_size = json_stats[massive_file]['size']
        print(f"Massive unified file:  {massive_file}")
        print(f"Items:                 {massive_count:,}")
        print(f"File size:             {format_file_size(massive_size)}")
        print(f"Average item size:     {massive_size/massive_count:.0f} bytes per item")
    else:
        print("Massive unified file not found yet.")

    print("\n" + "="*70)
    print("END OF VERIFICATION REPORT")
    print("="*70)

    return {
        'total_items': total_items,
        'total_files': total_files,
        'json_items': total_json_items,
        'xml_items': total_xml_items,
        'target_reached': total_items >= target,
        'valid_xml_files': len(valid_xml_files),
        'invalid_xml_files': len(invalid_xml_files)
    }

if __name__ == "__main__":
    stats = verify_data_integrity()

    # Exit with status code indicating success/failure
    if stats['target_reached']:
        exit(0)  # Success
    else:
        exit(1)  # Target not reached