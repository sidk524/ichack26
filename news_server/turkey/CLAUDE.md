# Turkey Earthquake News Data Processing

## Purpose

This subdirectory contains specialized scripts and data for processing Turkey earthquake news articles. The system fetches earthquake news from Google News RSS feeds, extracts geographical locations using multiple AI/NER approaches, and adds GPS coordinates to disaster events for visualization and analysis.

## Directory Overview

```
turkey/
├── Python Scripts (7 total)
│   ├── fetch_turkey_earthquake_news.py    # Main data fetcher
│   ├── clean_location_extractor.py        # BERT NER-based extractor
│   ├── add_gps_coordinates.py             # Pattern-based GPS adder
│   ├── enhanced_gps_extractor.py          # T5-Flan + web scraping
│   ├── llm_location_extractor.py          # T5-Flan location names only
│   ├── quick_enhanced_gps.py              # Fast pattern matching
│   └── fast.py                            # Parallel processing variant
├── XML Files (16 total)
│   └── turkey_earthquake_*.xml            # Category-specific RSS feeds
├── JSON Files (12 total)
│   ├── turkey.json                        # Main unified dataset
│   ├── turkey_backup*.json                # Processing backups
│   └── good_turkey.json                   # Final processed output
└── Cache
    └── geocode_cache.pkl                  # Geocoding cache
```

## Key Python Scripts

### 1. fetch_turkey_earthquake_news.py
**Purpose**: Main data collection script
**Functionality**:
- Fetches Google News RSS feeds for 16 earthquake-related categories
- Categories: casualties, damage, rescue, infrastructure, tourism, seismic analysis, etc.
- Deduplicates news items across all feeds
- Creates unified `turkey.json` with all unique news items
- Saves individual XML files per category

**Key Functions**:
- `fetch_google_news_rss()` - Fetches RSS with retry logic
- `parse_rss_content()` - Extracts items from XML
- `ensure_uniqueness()` - Removes duplicates by title/link/guid
- `load_existing_xml_files()` - Consolidates all XML sources

**Output**: 16 XML files + unified `turkey.json`

### 2. clean_location_extractor.py
**Purpose**: BERT-based Named Entity Recognition for location extraction
**Model**: `Elastic/distilbert-base-cased-finetuned-conll03-english`
**Functionality**:
- Web scraping: Fetches full article content from news URLs
- NER Pipeline: Extracts location entities (LOC tags only)
- Strict filtering: Blocks non-geographical terms (dates, agencies, etc.)
- Batch geocoding: Uses OpenStreetMap Nominatim API
- Aggregated locations: Collects ALL valid locations from text (comma-separated)

**Key Features**:
- Hardware acceleration (GPU/MPS/CPU auto-detect)
- 3-phase processing: extraction → batch geocoding → coordinate application
- Disaster keyword matching (2+ keywords required)
- Fallback to Turkey default coordinates (39.0, 35.0)

**Output**: Items tagged with `disaster: true` and `location` object containing name + GPS

### 3. add_gps_coordinates.py
**Purpose**: Pattern-based GPS coordinate extraction (no LLM)
**Functionality**:
- Hardcoded Turkish location database (~25 cities)
- Pattern matching for city names in title/description
- Magnitude extraction from text
- Mock "LLM" that's actually rule-based

**Limitations**: Simple pattern matching, no web scraping, limited location coverage

### 4. enhanced_gps_extractor.py
**Purpose**: Advanced T5-Flan LLM + web scraping for precise GPS
**Model**: `google/flan-t5-small`
**Functionality**:
- Full article content extraction via newspaper3k + BeautifulSoup
- T5-Flan prompting for location extraction
- Enhanced Turkish location database (100+ locations)
- 6 decimal place GPS precision with random offset for granularity
- Earthquake technical info extraction (magnitude, depth, time)

**Key Features**:
- Multi-source content analysis (title + description + full article)
- Confidence scoring (0.6 - 0.9)
- Geocoding fallback via `geocoder` library
- Detailed metadata (extraction_method, confidence, content_length)

**Processing Limit**: Processes first 50 items (configurable)

### 5. llm_location_extractor.py
**Purpose**: T5-Flan for location names only (no GPS coordinates)
**Model**: `google/flan-t5-small`
**Functionality**:
- Extracts location names using T5-Flan prompting
- No GPS coordinates - just location name strings
- Fallback to pattern matching if LLM fails
- Preserves disaster tagging

**Use Case**: When you want locations identified but don't need coordinates yet

### 6. quick_enhanced_gps.py
**Purpose**: Fast pattern-based GPS extraction
**Functionality**:
- Optimized for speed - no LLM, no web scraping
- Enhanced location database with precise coordinates
- Random precision offset (-0.001 to 0.001) for granularity
- Magnitude extraction
- Processes all items

**Advantages**: Fast, no external API calls, reliable

### 7. fast.py
**Purpose**: High-performance parallel processing variant
**Functionality**:
- Multi-threaded web scraping (10 workers)
- Parallel NER inference
- Parallel batch geocoding (5 workers)
- Connection pooling with retry logic
- GPU FP16 optimization (2x speedup)
- lxml parser (faster than html.parser)

**Performance**: Designed for processing large datasets quickly

## Data Files

### XML Files (16 files)
Category-specific Google News RSS feeds:
- `turkey_earthquake_casualties.xml` - Deaths, injuries
- `turkey_earthquake_damage.xml` - Building collapses
- `turkey_earthquake_rescue.xml` - Rescue operations
- `turkey_earthquake_infrastructure.xml` - Infrastructure damage
- `turkey_earthquake_affected_cities.xml` - City-specific coverage
- `turkey_earthquake_response.xml` - Emergency response
- `turkey_earthquake_humanitarian.xml` - Aid and relief
- `turkey_earthquake_tourism.xml` - Tourism impact
- `turkey_earthquake_economic.xml` - Economic impact
- `turkey_earthquake_seismic.xml` - Seismic activity
- `turkey_earthquake_technical.xml` - Alert systems
- `turkey_earthquake_international.xml` - International coverage
- `turkey_earthquake_regional.xml` - Regional coverage
- `turkey_earthquake_historical.xml` - Historical context
- `turkey_earthquake_recovery.xml` - Recovery efforts
- `turkey_earthquake_incidents.xml` - Core incidents

**Structure**: RSS 2.0 XML with items containing title, link, guid, pubDate, description

### JSON Files

**Primary**:
- `turkey.json` - Main unified dataset (~1.6MB, current processed state)
- `good_turkey.json` - Final processed version with best location data

**Backups** (preserve different processing stages):
- `turkey_backup.json` - Original backup
- `turkey_backup_original.json` - Pre-processing state
- `turkey_backup_enhanced.json` - T5-Flan enhanced GPS
- `turkey_backup_bert_ner.json` - BERT NER processed
- `turkey_backup_llm_ner.json` - LLM NER processed
- `turkey_backup_clean.json` - Clean extraction processed

**Intermediate**:
- `turkey_with_gps.json` - GPS coordinates added
- `turkey_quick_enhanced.json` - Quick GPS processing output
- `turkey_location_names.json` - Location names only (no GPS)

**Structure**:
```json
{
  "feed": {
    "title": "Turkey Earthquake News Feed",
    "link": "https://news.google.com",
    "description": "...",
    "language": "en-GB",
    "generator": "..."
  },
  "items": [
    {
      "title": "...",
      "link": "...",
      "guid": "...",
      "pubDate": "Sat, 08 Nov 2025 08:00:00 GMT",
      "description": "...",
      "source": "...",
      "disaster": true,
      "location": {
        "name": "Balikesir",
        "lat": 39.648361,
        "lng": 27.882589,
        "coordinates": "39.648361,27.882589",
        "extraction_method": "distilbert_ner_full_text",
        "confidence": 0.8,
        "is_disaster_event": true
      }
    }
  ]
}
```

## Location Extraction Approaches

### 1. BERT NER-based (clean_location_extractor.py)
**Model**: DistilBERT fine-tuned on CoNLL03
**Approach**:
- Web scraping for full article context
- Token classification pipeline
- Strict LOC entity filtering
- Blocklist for false positives
- Batch geocoding

**Pros**: Accurate, context-aware, handles multi-word locations
**Cons**: Slower, requires web access, GPU helps significantly

### 2. T5-Flan LLM (enhanced_gps_extractor.py, llm_location_extractor.py)
**Model**: google/flan-t5-small
**Approach**:
- Instruction-based prompting
- Question-answering format
- Location-specific queries
- Optional coordinate extraction

**Pros**: Flexible, understands context, good for ambiguous cases
**Cons**: Slower inference, requires GPU for speed, can hallucinate

### 3. Pattern Matching (add_gps_coordinates.py, quick_enhanced_gps.py)
**Approach**:
- Regex patterns for Turkish city names
- Hardcoded location database
- Direct string matching
- No external API calls

**Pros**: Fast, reliable, no dependencies, no rate limits
**Cons**: Limited to known locations, misses variations/aliases

### 4. Hybrid (fast.py)
**Approach**:
- BERT NER for extraction
- Parallel processing for speed
- Batch geocoding
- Connection pooling

**Pros**: Best balance of accuracy and speed
**Cons**: Complex implementation, resource-intensive

## Data Processing Pipeline

### Standard Workflow

1. **Fetch News** (`fetch_turkey_earthquake_news.py`)
   ```bash
   python fetch_turkey_earthquake_news.py
   # Creates: 16 XML files + turkey.json
   ```

2. **Extract Locations** (Choose one approach)

   **Option A: BERT NER (Recommended)**
   ```bash
   python clean_location_extractor.py
   # Adds: disaster tags + location names + GPS coordinates
   ```

   **Option B: T5-Flan Enhanced**
   ```bash
   python enhanced_gps_extractor.py
   # Adds: disaster tags + precise GPS + technical info
   ```

   **Option C: Quick Pattern Matching**
   ```bash
   python quick_enhanced_gps.py
   # Adds: disaster tags + GPS (fast, no LLM)
   ```

   **Option D: Parallel Processing**
   ```bash
   python fast.py
   # Fastest for large datasets
   ```

3. **Result**: `turkey.json` with enriched location data

### Data Flow

```
Google News RSS Feeds (16 categories)
    ↓
fetch_turkey_earthquake_news.py
    ↓
XML Files (turkey_earthquake_*.xml)
    ↓
Unified turkey.json (deduplicated)
    ↓
Location Extraction Scripts (4 options)
    ↓
Enriched turkey.json with:
    - disaster: true/false
    - location: {name, lat, lng, extraction_method}
    - Optional: earthquake_info {magnitude, depth}
    ↓
Final Output: good_turkey.json
```

## Integration with Parent news_server

The turkey subdirectory is part of the larger news_server system:

**Parent Directory Structure**:
```
news_server/
├── fetch_disaster_news.py          # General disaster news fetcher
├── fetch_regular_news.py           # Non-disaster news
├── create_balanced_dataset.py      # Combines disaster + regular news
├── unified_disaster_news.json      # All disaster news
├── balanced_news_dataset.json      # Final balanced dataset
└── turkey/                         # Turkey earthquake specialist
    └── (this directory)
```

**Integration Points**:
- Turkey earthquake data can be merged into `unified_disaster_news.json`
- `create_balanced_dataset.py` balances disaster vs regular news
- Main server (`main.go`) serves unified datasets via HTTP API
- Turkey data provides high-quality geolocated earthquake events

**Usage in Parent System**:
```python
# In create_final_unified.py or similar:
import json

# Load Turkey earthquake data
with open('turkey/turkey.json', 'r') as f:
    turkey_data = json.load(f)

# Filter disaster events
turkey_disasters = [
    item for item in turkey_data['items']
    if item.get('disaster', False)
]

# Merge into unified dataset
all_disasters.extend(turkey_disasters)
```

## Performance Considerations

**Speed Ranking** (fastest to slowest):
1. `quick_enhanced_gps.py` - Pure pattern matching
2. `fast.py` - Parallel BERT NER
3. `llm_location_extractor.py` - T5-Flan names only
4. `clean_location_extractor.py` - BERT NER + web scraping
5. `enhanced_gps_extractor.py` - T5-Flan + full web scraping

**Accuracy Ranking** (best to worst):
1. `enhanced_gps_extractor.py` - Full context + LLM
2. `clean_location_extractor.py` - BERT NER + full text
3. `fast.py` - BERT NER (less context)
4. `llm_location_extractor.py` - T5-Flan (limited)
5. `quick_enhanced_gps.py` - Pattern matching only

**Hardware Requirements**:
- GPU: 2x speedup for BERT/T5-Flan
- Apple Silicon: MPS support for Mac M1/M2
- CPU: All scripts work on CPU (slower)
- RAM: 2-4GB for models + data
- Network: Required for web scraping and geocoding

## Dependencies

```bash
# Core
pip install transformers torch

# NER/LLM
pip install beautifulsoup4 requests newspaper3k

# Geocoding
pip install geocoder

# Performance (fast.py)
pip install lxml urllib3

# Optional
pip install spacy  # Alternative NER
```

## Common Issues

**Geocoding Rate Limits**:
- Nominatim: 1 request/second limit
- Solution: Batch geocoding with delays
- Cache: `geocode_cache.pkl` stores previous results

**Web Scraping Failures**:
- Some sites block scrapers
- Solution: Timeout after 3 seconds, continue
- Fallback: Use title + description only

**False Location Positives**:
- NER tags non-locations (dates, agencies)
- Solution: Blocklist in `clean_location_extractor.py`
- Manual: Review `blocked_locations` set

**GPU Out of Memory**:
- Large batch sizes can exhaust VRAM
- Solution: Process in smaller batches
- Use: FP16 mode (half precision) for 2x efficiency

## Quick Reference

**Get fresh earthquake news**:
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server/turkey
python fetch_turkey_earthquake_news.py
```

**Add locations (fast)**:
```bash
python quick_enhanced_gps.py
```

**Add locations (accurate)**:
```bash
python clean_location_extractor.py
```

**View results**:
```bash
cat turkey.json | jq '.items[] | select(.disaster == true) | {title, location}'
```

**Count disaster events**:
```bash
cat turkey.json | jq '[.items[] | select(.disaster == true)] | length'
```

## File Sizes (Approximate)

- XML files: ~50-200KB each
- `turkey.json`: 1.6MB (current)
- `good_turkey.json`: 1.6MB (final)
- Backups: 1.4-1.7MB each
- Total: ~20MB for all files

## Last Updated

Structure documented: 2026-02-01
Processing pipeline: Active and functional
Data source: Google News RSS (updated continuously)
