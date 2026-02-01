#!/usr/bin/env python3
"""
Cleans turkey.json data by removing or fixing location entries with ## tokens.
"""

import json
import re

def clean_location_name(name):
    """Remove ## tokens and clean up location names."""
    if not name or '##' not in name:
        return name

    # Split by comma and filter out parts with ##
    parts = name.split(',')
    clean_parts = []

    for part in parts:
        part = part.strip()
        # Skip if contains ##
        if '##' in part:
            continue
        # Keep valid location names
        if len(part) >= 2 and not part.startswith(('#', '@', '.', ',')):
            clean_parts.append(part)

    # Return cleaned name or None if nothing valid remains
    if clean_parts:
        return ', '.join(clean_parts)
    return None

def clean_turkey_data():
    """Clean the turkey.json file."""
    print("Loading turkey.json...")

    with open('turkey.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    items_with_bad_locations = 0
    items_fixed = 0
    items_removed_location = 0

    for item in data.get('items', []):
        if 'location' in item and 'name' in item['location']:
            original_name = item['location']['name']

            # Check if location name contains ##
            if '##' in original_name:
                items_with_bad_locations += 1

                # Try to clean the name
                cleaned_name = clean_location_name(original_name)

                if cleaned_name:
                    # Update with cleaned name
                    item['location']['name'] = cleaned_name
                    items_fixed += 1
                    print(f"Fixed: '{original_name}' -> '{cleaned_name}'")
                else:
                    # Remove location entirely if no valid name remains
                    del item['location']
                    items_removed_location += 1
                    print(f"Removed location: '{original_name}'")

    # Save cleaned data
    print("\nSaving cleaned data...")
    with open('turkey_cleaned.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Cleaning complete!")
    print(f"   - Items with ## tokens: {items_with_bad_locations}")
    print(f"   - Items fixed: {items_fixed}")
    print(f"   - Locations removed: {items_removed_location}")
    print(f"   - Saved to: turkey_cleaned.json")

    # Also save backup of original
    import shutil
    shutil.copy('turkey.json', 'turkey_backup_before_cleaning.json')
    print(f"   - Original backed up to: turkey_backup_before_cleaning.json")

    # Auto-replace if we found and fixed issues
    if items_with_bad_locations > 0:
        shutil.copy('turkey_cleaned.json', 'turkey.json')
        print("\n✅ turkey.json has been replaced with cleaned version")

if __name__ == "__main__":
    clean_turkey_data()