#!/usr/bin/env python3
"""
NER-based location name extractor for Turkey earthquake news.
Optimized with:
- Web Scraping (fetches article content)
- Aggregated Location Logic (collects ALL valid locations)
- Stricter Filtering (removes non-geographical entities)
"""

import json
import time
import warnings
import re
warnings.filterwarnings("ignore")

# Import required packages
try:
    import torch
    from transformers import pipeline
    import requests
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Error importing packages: {e}")
    print("Please install with: pip install transformers torch requests beautifulsoup4")
    exit(1)


class NERLocationExtractor:
    """BERT-based location extractor using Named Entity Recognition."""

    def __init__(self):
        print("Initializing NER Engine...")

        # 1. Initialize Web Session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; EarthquakeNewsBot/1.0; +http://example.com/bot)'
        })

        # 2. Hardware Acceleration
        self.device = -1 
        if torch.cuda.is_available():
            self.device = 0
            print("✓ GPU (CUDA) detected and enabled.")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self.device = "mps"
            print("✓ Apple Silicon (MPS) detected and enabled.")
        else:
            print("ℹ Using CPU.")

        # 3. Load Model
        # Using a model fine-tuned for CONLL03 which is standard for NER
        model_name = "Elastic/distilbert-base-cased-finetuned-conll03-english"
        
        try:
            self.ner_pipeline = pipeline(
                "token-classification", 
                model=model_name, 
                aggregation_strategy="simple", 
                device=self.device
            )
            print("✓ Model loaded successfully.")
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            exit(1)

        self.disaster_keywords = [
            'earthquake', 'quake', 'seismic', 'tremor', 'magnitude',
            'collapsed', 'collapse', 'building', 'damage', 'rescue',
            'aftershock', 'epicenter', 'fault'
        ]
        
        # Blocklist: Common false positives that models often mistake for locations
        self.blocked_locations = {
            'earthquake', 'quake', 'magnitude', 'richter', 'epicenter', 'fault',
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
            'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
            'september', 'october', 'november', 'december',
            'twitter', 'facebook', 'instagram', 'whatsapp', 'google', 'youtube',
            'afad', 'usgs', 'kandilli', 'euromed', 'emsc', # Agencies
            'turkish', 'syrian', 'american', 'russian', 'greek', # Nationalities (usually MISC, but safe to block)
            'north', 'south', 'east', 'west' # Generic directions
        }

    def fetch_article_text(self, url: str) -> str:
        """Visits link and extracts text."""
        if not url or not url.startswith('http'):
            return ""
            
        try:
            response = self.session.get(url, timeout=3)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                paragraphs = soup.find_all('p')
                text_content = " ".join([p.get_text() for p in paragraphs])
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                return text_content
        except Exception:
            pass
        return ""

    def is_disaster_event(self, text: str) -> bool:
        """Check if the text implies a disaster event."""
        text_lower = text.lower()
        disaster_score = sum(1 for keyword in self.disaster_keywords if keyword in text_lower)
        return disaster_score >= 2

    def extract_location_name(self, full_text: str) -> str:
        """
        Extracts ALL valid locations found in the text.
        Filters out non-geographical terms via strict tag checking and blocklists.
        """
        
        # Analyze first 2500 chars (roughly 500-600 words)
        text_to_analyze = full_text[:2500]

        try:
            ner_results = self.ner_pipeline(text_to_analyze)
        except Exception as e:
            print(f"Inference error: {e}")
            return None

        # Set to store unique locations found
        found_locations = set()
        
        for entity in ner_results:
            # 1. Strict Filter: Only accept 'LOC' (Location) tags.
            # Reject 'MISC' (often events/nationalities), 'ORG' (Agencies), 'PER' (People)
            if entity['entity_group'] != 'LOC':
                continue

            entity_text = entity['word'].strip()
            entity_lower = entity_text.lower()

            # 2. Validation Checks
            
            # Skip short garbage (e.g., "A", "The")
            if len(entity_text) < 3:
                continue
                
            # Skip if it contains numbers (e.g., "7.8", "M7")
            if any(char.isdigit() for char in entity_text):
                continue

            # Skip URL parts
            if entity_lower.startswith(('http', 'www', 'news', 'com')):
                continue

            # 3. Blocklist Filter (Stop non-geographical false positives)
            if entity_lower in self.blocked_locations:
                continue

            # If it passed all checks, add it to our list
            found_locations.add(entity_text)

        if not found_locations:
            return None

        # Return all unique locations, sorted alphabetically
        return ', '.join(sorted(found_locations))

    def process_news_item(self, item: dict) -> dict:
        """Process a single news item."""
        title = item.get('title', '')
        description = item.get('description', '')
        link = item.get('link') or item.get('url')

        # 1. Fetch content
        fetched_text = ""
        if link:
            fetched_text = self.fetch_article_text(link)

        # 2. Concatenate 
        combined_text = f"{title}. {description} {fetched_text}"

        # 3. Check relevance
        if not self.is_disaster_event(combined_text):
            return item

        item['disaster'] = True
        
        # 4. Extract ALL locations
        location = self.extract_location_name(combined_text)

        if location:
            item['location'] = {
                'name': location,
                'extraction_method': 'distilbert_ner_full_text'
            }

        return item


def main():
    print("Full Context NER Location Extractor")
    print("=" * 42)

    input_file = 'turkey.json'
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"✗ Error loading data: {e}")
        return

    extractor = NERLocationExtractor()
    
    start_time = time.time()
    disaster_count = 0
    location_count = 0
    items_to_process = data['items']

    print(f"\nProcessing {len(items_to_process)} items...")

    for i, item in enumerate(items_to_process):
        # Reset tags
        item.pop('disaster', None)
        item.pop('location', None)

        updated_item = extractor.process_news_item(item)
        
        if updated_item.get('disaster', False):
            disaster_count += 1
        if 'location' in updated_item:
            location_count += 1
            # Optional: Print what we found to verify
            # print(f"  -> Found: {updated_item['location']['name']}")

        data['items'][i] = updated_item

        if (i + 1) % 10 == 0:
            print(f"Processed {i + 1} items...")

    total_time = time.time() - start_time
    
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 42)
    print(f"Completed in {total_time:.2f} seconds")
    print(f"- Disaster events: {disaster_count}")
    print(f"- Items with locations: {location_count}")

if __name__ == "__main__":
    main()
