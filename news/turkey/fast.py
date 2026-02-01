import json
import time
import re
import warnings
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Attempt to load high-performance packages
try:
    import torch
    from transformers import pipeline
except ImportError:
    print("Please install: pip install transformers torch requests beautifulsoup4 lxml")
    exit(1)

warnings.filterwarnings("ignore")

# --- PERFORMANCE CONFIG ---
MAX_WORKERS = 10  # Number of simultaneous web requests
TURKEY_DEFAULT_COORDS = {"lat": 39.0, "lng": 35.0}

class FastNERExtractor:
    def __init__(self):
        # 1. AI Optimization: Use GPU + FP16 (Half Precision) for 2x speedup
        self.device = 0 if torch.cuda.is_available() else -1
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        print(f"Initializing NER on {'GPU' if self.device == 0 else 'CPU'}...")
        self.ner_pipeline = pipeline(
            "token-classification",
            model="Elastic/distilbert-base-cased-finetuned-conll03-english",
            aggregation_strategy="simple",
            device=self.device,
            torch_dtype=dtype
        )

        # 2. Network Optimization: Connection Pooling
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=0.1)
        adapter = HTTPAdapter(pool_connections=MAX_WORKERS, pool_maxsize=MAX_WORKERS, max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update({'User-Agent': 'FastDisasterBot/1.0'})

        self.disaster_keywords = {'earthquake', 'quake', 'seismic', 'tremor', 'magnitude', 'collapsed', 'damage'}
        self.blocked = {'twitter', 'facebook', 'instagram', 'monday', 'tuesday', 'turkish', 'north', 'south'}

    def fetch_text(self, url):
        if not url: return ""
        try:
            # Using 'lxml' parser is significantly faster than 'html.parser'
            resp = self.session.get(url, timeout=3)
            soup = BeautifulSoup(resp.content, 'lxml') 
            return " ".join([p.text for p in soup.find_all('p')])[:2500]
        except: return ""

    def extract_loc(self, text):
        if sum(1 for k in self.disaster_keywords if k in text.lower()) < 2:
            return None
        
        results = self.ner_pipeline(text)
        locs = {r['word'].strip() for r in results if r['entity_group'] == 'LOC' 
                and len(r['word']) > 2 and r['word'].lower() not in self.blocked}
        return ", ".join(sorted(locs)) if locs else None

    def process_item(self, item):
        """Individual worker task"""
        full_text = f"{item.get('title')} {item.get('description')} {self.fetch_text(item.get('link'))}"
        loc_name = self.extract_loc(full_text)
        if loc_name:
            item['disaster'] = True
            item['location'] = {'name': loc_name}
        return item

def geocode_fast(name):
    """Parallel-friendly geocoder"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "FastGeo"}
        r = requests.get(url, params={"q": f"{name}, Turkey", "format": "json", "limit": 1}, headers=headers, timeout=2)
        data = r.json()
        if data: return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
    except: pass
    return TURKEY_DEFAULT_COORDS

def main():
    input_file = 'turkey.json'
    with open(input_file, 'r') as f: data = json.load(f)
    
    extractor = FastNERExtractor()
    items = data['items']

    # --- PHASE 1: Parallel Scrape & NER ---
    print(f"Executing Parallel Extraction (Workers: {MAX_WORKERS})...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        data['items'] = list(executor.map(extractor.process_item, items))

    # --- PHASE 2: Parallel Geocoding ---
    unique_locs = {i['location']['name'] for i in data['items'] if 'location' in i}
    print(f"Geocoding {len(unique_locs)} unique locations in parallel...")
    
    with ThreadPoolExecutor(max_workers=5) as executor: # Keep geocoding lower to avoid IP bans
        coords_map = dict(zip(unique_locs, executor.map(geocode_fast, unique_locs)))

    # Apply results
    for item in data['items']:
        if 'location' in item:
            coords = coords_map.get(item['location']['name'])
            item['location'].update(coords)

    with open(input_file, 'w') as f: json.dump(data, f, indent=2)
    print("Done!")

if __name__ == "__main__":
    main()
