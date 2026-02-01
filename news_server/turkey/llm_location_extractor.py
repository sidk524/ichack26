#!/usr/bin/env python3
"""
T5-Flan location name extractor for Turkey earthquake news.
Extracts only location names using LLM, no GPS coordinates.
Preserves disaster tagging.
"""

import json
import re
import time
import warnings
warnings.filterwarnings("ignore")

# Import required packages
try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    import torch
except ImportError as e:
    print(f"Error importing transformers: {e}")
    print("Please install with: uv add transformers torch")
    exit(1)


class T5LocationExtractor:
    """T5-Flan based location name extractor for disaster events."""

    def __init__(self):
        # Initialize T5-Flan model
        self.model_name = "google/flan-t5-small"
        print(f"Loading {self.model_name} model...")

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)

        # Set device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

        print(f"Model loaded on {self.device}")

        # Disaster keywords for event detection
        self.disaster_keywords = [
            'earthquake', 'quake', 'seismic', 'tremor', 'magnitude',
            'collapsed', 'collapse', 'building', 'infrastructure', 'damage',
            'casualties', 'deaths', 'injured', 'victims', 'rescue',
            'emergency', 'disaster', 'aid', 'relief', 'humanitarian',
            'aftershock', 'epicenter', 'fault', 'geological'
        ]

    def is_disaster_event(self, title: str, description: str) -> bool:
        """Check if the news item is disaster-specific."""
        combined_text = f"{title} {description}".lower()
        disaster_score = sum(1 for keyword in self.disaster_keywords if keyword in combined_text)
        return disaster_score >= 2

    def query_t5_for_location(self, text: str) -> str:
        """Use T5-Flan to extract location name from text."""
        try:
            # Create focused prompt for location extraction
            prompt = f"""
            Extract the most specific location name mentioned in this Turkish earthquake news text.
            Only return the location name, nothing else.

            Text: {text[:400]}

            Location:"""

            # Tokenize and generate
            inputs = self.tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=20,
                    temperature=0.1,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id
                )

            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Clean up the response
            location = response.strip()

            # Remove common prefixes/suffixes
            prefixes_to_remove = ['location:', 'city:', 'town:', 'region:', 'province:', 'area:']
            for prefix in prefixes_to_remove:
                if location.lower().startswith(prefix):
                    location = location[len(prefix):].strip()

            # Basic validation - should be a reasonable location name
            if len(location) > 2 and len(location) < 50 and not location.lower().startswith('the'):
                return location.title()

            return None

        except Exception as e:
            print(f"T5 query failed: {e}")
            return None

    def extract_location_fallback(self, title: str, description: str) -> str:
        """Fallback location extraction using pattern matching."""
        combined_text = f"{title} {description}".lower()

        # Turkish locations in order of specificity
        turkish_locations = [
            'sindirgi', 'akhisar', 'balikesir', 'manisa', 'kutahya',
            'istanbul', 'izmir', 'ankara', 'bursa', 'canakkale',
            'tekirdag', 'kocaeli', 'sakarya', 'yalova', 'bolu',
            'western turkey', 'western türkiye', 'marmara region',
            'aegean region', 'western anatolia'
        ]

        for location in turkish_locations:
            if location in combined_text:
                return location.title().replace('Türkiye', 'Turkey')

        if 'turkey' in combined_text or 'türkiye' in combined_text:
            return 'Turkey'

        return None

    def process_news_item(self, item: dict) -> dict:
        """Process a single news item for location extraction."""
        title = item.get('title', '')
        description = item.get('description', '')

        # Check if it's a disaster event
        is_disaster = self.is_disaster_event(title, description)

        if not is_disaster:
            return item

        # Mark as disaster
        item['disaster'] = True

        print(f"Processing disaster event: {title[:60]}...")

        # Try T5-Flan extraction first
        combined_text = f"{title} {description}"
        location = self.query_t5_for_location(combined_text)

        # Fallback to pattern matching if T5 fails
        if not location:
            location = self.extract_location_fallback(title, description)

        # Add location if found
        if location:
            item['location'] = {
                'name': location,
                'extraction_method': 't5_flan_location_only'
            }
            print(f"  ✓ Location: {location}")
        else:
            print(f"  ⚠ No location found")

        return item


def main():
    """Main function to process turkey.json with T5-Flan location extraction."""

    # First, restore original data without GPS coordinates
    print("T5-Flan Location Name Extractor")
    print("=" * 40)
    print("Features:")
    print("- T5-Flan LLM for location name extraction")
    print("- No GPS coordinates, only location names")
    print("- Disaster event tagging preserved")
    print("=" * 40)

    input_file = 'turkey.json'
    backup_file = 'turkey_backup_original.json'
    output_file = 'turkey_location_names.json'

    # Load current data
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✓ Loaded {len(data['items'])} news items")
    except Exception as e:
        print(f"✗ Error loading data: {e}")
        return

    # Create backup
    try:
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✓ Created backup at {backup_file}")
    except Exception as e:
        print(f"⚠ Warning: Could not create backup: {e}")

    # Clean existing GPS data from items
    print("\nCleaning existing GPS coordinates...")
    for item in data['items']:
        # Remove GPS coordinates but keep location names if they exist
        if 'location' in item:
            location_data = item['location']
            if 'name' in location_data:
                # Keep only the name
                item['location'] = {
                    'name': location_data['name'],
                    'extraction_method': 'cleaned_for_reprocessing'
                }
            else:
                # Remove location entirely if no name
                del item['location']

    # Initialize T5 extractor
    try:
        extractor = T5LocationExtractor()
    except Exception as e:
        print(f"✗ Error initializing T5 extractor: {e}")
        return

    # Process items with T5-Flan
    print("\nProcessing with T5-Flan location extraction...")
    print("-" * 40)

    disaster_count = 0
    location_count = 0
    processed = 0

    # Process first 100 items for demonstration (remove limit for full dataset)
    items_to_process = data['items'][:100]  # Remove [:100] for full processing

    for i, item in enumerate(items_to_process):
        processed += 1

        # Remove any existing location/disaster flags for clean processing
        if 'disaster' in item:
            del item['disaster']
        if 'location' in item:
            del item['location']

        # Process with T5-Flan
        updated_item = extractor.process_news_item(item)

        # Count results
        if updated_item.get('disaster', False):
            disaster_count += 1
            data['items'][i] = updated_item

            if 'location' in updated_item:
                location_count += 1

        # Progress indicator
        if processed % 20 == 0:
            print(f"Progress: {processed}/{len(items_to_process)} items...")

        # Small delay to prevent overheating
        time.sleep(0.1)

    # Update metadata
    data['feed']['description'] = "Turkey earthquake news with T5-Flan extracted location names"
    data['feed']['generator'] = "T5-Flan Location Name Extractor 1.0"

    # Add processing metadata
    if 'processing_metadata' not in data:
        data['processing_metadata'] = {}

    data['processing_metadata']['t5_location_extraction'] = {
        'processed_at': time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        'model_used': 'google/flan-t5-small',
        'total_items_processed': processed,
        'disaster_events_found': disaster_count,
        'locations_extracted': location_count,
        'coordinates_included': False,
        'location_names_only': True
    }

    # Save results
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Saved location-enhanced data to {output_file}")

        # Update original file
        with open(input_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✓ Updated original {input_file}")

    except Exception as e:
        print(f"✗ Error saving: {e}")
        return

    # Summary
    print("\n" + "=" * 40)
    print("T5-FLAN LOCATION EXTRACTION SUMMARY:")
    print(f"- Items processed: {processed}")
    print(f"- Disaster events found: {disaster_count}")
    print(f"- Location names extracted: {location_count}")
    print(f"- Extraction rate: {location_count/disaster_count*100:.1f}%" if disaster_count > 0 else "- No disasters found")
    print(f"- GPS coordinates: None (location names only)")
    print(f"- Model used: google/flan-t5-small")
    print(f"- Output file: {output_file}")

    if location_count > 0:
        print(f"\n✓ Successfully extracted {location_count} location names using T5-Flan!")
    else:
        print("\n⚠ No location names were extracted")


if __name__ == "__main__":
    main()