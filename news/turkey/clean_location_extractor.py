#!/usr/bin/env python3
"""
Fast NER-based location name extractor for Turkey earthquake news.
Optimized with:
- Model caching (loading once)
- Hugging Face Pipelines (optimized inference)
- DistilBERT (faster model)
- GPU/MPS acceleration
"""

import json
import time
import warnings
warnings.filterwarnings("ignore")

# Import required packages
try:
    import torch
    from transformers import pipeline
except ImportError as e:
    print(f"Error importing transformers: {e}")
    print("Please install with: pip install transformers torch")
    exit(1)


class NERLocationExtractor:
    """BERT-based location extractor using Named Entity Recognition."""

    def __init__(self):
        print("Initializing NER Engine...")

        # 1. OPTIMIZATION: Check for Hardware Acceleration (GPU/MPS)
        self.device = -1 # Default to CPU
        if torch.cuda.is_available():
            self.device = 0 # Use first GPU
            print("✓ GPU (CUDA) detected and enabled.")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self.device = "mps" # Apple Silicon Metal
            print("✓ Apple Silicon (MPS) detected and enabled.")
        else:
            print("ℹ Using CPU. (Install torch with CUDA for faster speeds)")

        # 2. OPTIMIZATION: Use DistilBERT (Faster) & Load ONCE
        # We use a 'pipeline' which handles tokenization and subword merging automatically (C++ optimized)
        model_name = "Elastic/distilbert-base-cased-finetuned-conll03-english"
        
        try:
            self.ner_pipeline = pipeline(
                "token-classification", 
                model=model_name, 
                aggregation_strategy="simple", # Automatically merges "##" subwords and "B-"/"I-" tags
                device=self.device
            )
            print("✓ Model loaded successfully.")
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            exit(1)

        # Disaster keywords for event detection
        self.disaster_keywords = [
            'earthquake', 'quake', 'seismic', 'tremor', 'magnitude',
            'collapsed', 'collapse', 'building', 'infrastructure', 'damage',
            'casualties', 'deaths', 'injured', 'victims', 'rescue',
            'emergency', 'disaster', 'aid', 'relief', 'humanitarian',
            'aftershock', 'epicenter', 'fault'
        ]
        
        # Pre-compile known locations for O(1) lookups
        self.turkish_locations = {
            'istanbul', 'ankara', 'izmir', 'bursa', 'antalya', 'adana', 'konya', 'gaziantep',
            'mersin', 'kayseri', 'eskisehir', 'diyarbakir', 'samsun', 'denizli', 'adapazari',
            'malatya', 'kahramanmaras', 'erzurum', 'van', 'batman', 'elazig', 'erzincan',
            'tunceli', 'bingol', 'mus', 'bitlis', 'hakkari', 'sirnak', 'mardin', 'sanliurfa',
            'adiyaman', 'kilis', 'osmaniye', 'hatay', 'isparta', 'burdur', 'afyon', 'kutahya',
            'manisa', 'aydin', 'mugla', 'usak', 'denizli', 'pamukkale', 'bodrum', 'marmaris',
            'kusadasi', 'cesme', 'alanya', 'side', 'kas', 'kalkan', 'fethiye', 'oludeniz',
            'cappadocia', 'goreme', 'urgup', 'avanos', 'nevsehir', 'kayseri', 'nigde',
            'trabzon', 'rize', 'artvin', 'giresun', 'ordu', 'sinop', 'kastamonu', 'zonguldak',
            'bartin', 'karabuk', 'corum', 'amasya', 'tokat', 'sivas', 'yozgat', 'kirsehir',
            'nevsehir', 'aksaray', 'karaman', 'mersin', 'adana', 'osmaniye', 'hatay', 'kilis',
            'gaziantep', 'adiyaman', 'kahramanmaras', 'malatya', 'elazig', 'tunceli', 'bingol',
            'antakya', 'iskenderun', 'samandagi', 'reyhanli', 'kirikhan', 'defne', 'arsuz',
            'golbasi', 'kumlu', 'nurdagi', 'islahiye', 'araban', 'nizip', 'karkamis', 'oguzelii',
            'besni', 'golbasi', 'sincik', 'tut', 'gerger', 'celikhan', 'samsat', 'kahta',
            'goksun', 'elbistan', 'afsin', 'pazarcik', 'turkoglu', 'caglayancerit', 'andirin',
            'nurhak', 'ekinozu', 'akca dagi', 'arapkir', 'arguvan', 'battalgazi', 'darende',
            'dogansehir', 'hekimhan', 'kale', 'kuluncak', 'puturge', 'yazihan', 'yesilyurt',
            'sivrice', 'agin', 'alacakaya', 'aricilar', 'baskil', 'karakocan', 'keban', 'maden',
            'palu'
        }

    def is_disaster_event(self, title: str, description: str) -> bool:
        """Check if the news item is disaster-specific."""
        combined_text = f"{title} {description}".lower()
        disaster_score = sum(1 for keyword in self.disaster_keywords if keyword in combined_text)
        return disaster_score >= 2

    def extract_location_name(self, title: str, description: str) -> str:
        """Extract specific Turkish cities/locations using optimized Pipeline NER."""
        combined_text = f"{title} {description}"
        
        # Truncate to 512 chars to avoid model limits (speed optimization)
        # Most location info is in the first few sentences.
        combined_text = combined_text[:512]

        try:
            # Run Inference
            # The pipeline handles tokenization, forward pass, and decoding
            ner_results = self.ner_pipeline(combined_text)
        except Exception as e:
            print(f"Inference error: {e}")
            return None

        # Filter for location entities
        specific_locations = []
        
        entities = []
        for entity in ner_results:
            # Pipeline with aggregation returns 'entity_group' (e.g., 'LOC')
            if entity['entity_group'] in ['LOC', 'MISC']:
                entity_text = entity['word']
                entity_lower = entity_text.lower()

                # Skip not full entity names.
                if '#' in entity_lower:
                    continue

                # Check if it's a known Turkish location
                if entity_lower in self.turkish_locations:
                    # Return immediately if we find a strong match (Lazy return)
                    entities.append(entity_text)
                    continue

                # Fallback heuristics for Turkish-looking names
                if (len(entity_text) > 3 and
                    not any(char.isdigit() for char in entity_text) and
                    not entity_lower.startswith(('http', 'www', 'news'))):
                    specific_locations.append(entity_text)

        # Return the first heuristic match if no exact match found
        if len(entities) == 0 and specific_locations:
            return ','.join(set(specific_locations))

        return ','.join(set(entities))

    def process_news_item(self, item: dict) -> dict:
        """Process a single news item."""
        title = item.get('title', '')
        description = item.get('description', '')

        if not self.is_disaster_event(title, description):
            return item

        item['disaster'] = True
        
        # Only run costly NER if it IS a disaster event
        location = self.extract_location_name(title, description)

        if location:
            item['location'] = {
                'name': location,
                'extraction_method': 'distilbert_ner'
            }

        return item


def main():
    print("Fast NER-Based Location Extractor")
    print("=" * 42)

    input_file = 'turkey.json'
    
    # Load data
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"✗ Error loading data: {e}")
        return

    # Initialize Extractor (Loads model ONCE here)
    extractor = NERLocationExtractor()
    
    start_time = time.time()
    disaster_count = 0
    location_count = 0
    items_to_process = data['items']

    print(f"\nProcessing {len(items_to_process)} items...")

    # Processing Loop
    for i, item in enumerate(items_to_process):
        # Clean old tags
        item.pop('disaster', None)
        item.pop('location', None)

        updated_item = extractor.process_news_item(item)
        
        if updated_item.get('disaster', False):
            disaster_count += 1
        if 'location' in updated_item:
            location_count += 1

        data['items'][i] = updated_item

        if (i + 1) % 50 == 0:
            print(f"Processed {i + 1} items...")

    total_time = time.time() - start_time
    
    # Save results
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 42)
    print(f"Completed in {total_time:.2f} seconds ({len(items_to_process)/total_time:.1f} items/sec)")
    print(f"- Disaster events: {disaster_count}")
    print(f"- Locations found: {location_count}")

if __name__ == "__main__":
    main()
