# News Server

## Purpose

The news_server is a comprehensive news aggregation and processing system that fetches disaster and regular news from Google News RSS feeds, processes and balances the datasets, and streams them to the data_server via HTTP. It consists of a Go-based HTTP client for streaming news data and a Python-based data collection/processing pipeline.

## Architecture

**Two-part system:**
1. **Go Server** (`main.go`) - HTTP client that reads JSON news datasets and streams them to data_server endpoint
2. **Python Data Pipeline** - Collection of scripts that fetch, process, balance, and unify news data from Google News RSS feeds

**Data Flow:**
```
Google News RSS Feeds
    ↓
Python Fetcher Scripts (fetch_*.py)
    ↓
XML Files (raw RSS feeds)
    ↓
Python Processing Scripts (create_*.py)
    ↓
Unified JSON Datasets
    ↓
Go Server (main.go)
    ↓
data_server (/news_information_in endpoint)
```

## Key Files and Responsibilities

### Go Server Implementation

**`main.go`** (5,023 bytes)
- HTTP client that streams news items to data_server
- Reads JSON news files and POSTs each item to `https://715814cd2aaf.ngrok-free.app/news_information_in`
- Converts RFC1123 dates to RFC3339Nano format
- Supports configurable start position and delay between items
- Infinite loop with automatic wraparound
- Uses zerolog for structured logging

**Command-line flags:**
- `--file`: JSON file to read (default: news.json)
- `--start`: Percentage (0-100) to start from in the news list
- `--delay`: Delay in milliseconds between items (default: 1000ms)

**`run.sh`**
```bash
go run main.go -file=turkey/turkey.json -delay=2000
```

**`go.mod`** / **`go.sum`**
- Go 1.25.0
- Dependencies: zerolog for logging, colorable/isatty for terminal output

### Python Data Fetching Scripts

**`fetch_disaster_news.py`** (9,210 bytes)
- Fetches disaster-related news from Google News RSS feeds
- 15 disaster categories: Haiti, LA wildfires, California fires, earthquakes, hurricanes, floods, etc.
- Creates individual XML files per category
- Aggregates into `unified_disaster_news.json`
- Deduplicates by title/link/guid
- Sorts by date (newest first)

**`fetch_massive_disaster_news.py`** (14,169 bytes)
- Extended disaster news fetcher targeting 10,000+ items
- 70+ disaster query categories including:
  - Specific events (Haiti 2025, LA Palisades fire, Altadena fire)
  - Weather disasters (hurricanes, tornadoes, blizzards, heat waves)
  - Geological (earthquakes, volcanoes, landslides, tsunamis)
  - Fire-related (wildfires, forest fires, brush fires, evacuations)
  - Flood-related (flash floods, river floods, coastal flooding)
  - Emergency response (rescue operations, first responders, evacuations)
  - Infrastructure (power outages, building collapses, bridge failures)
  - Environmental (toxic spills, air quality, pollution disasters)
  - Regional specific (Japan, Australia, Europe, Asia, Africa, etc.)
- Creates `massive_unified_disaster_news.json`
- Progress tracking and deduplication
- Rate-limited with random delays (0.5-2s)

**`fetch_regular_news.py`** (10,458 bytes)
- Fetches non-disaster news targeting 6,000+ items
- Categories include:
  - Sports (football, basketball, cricket, tennis, F1, etc.)
  - Finance (stocks, crypto, major tech companies, indices)
  - Technology (AI, smartphones, social media, streaming, gaming)
  - Entertainment (Hollywood, music, celebrity news, awards)
  - Politics (UK, US, EU, China, Russia, Ukraine, etc.)
  - Health & Science (medical breakthroughs, space exploration, climate)
  - Lifestyle (fashion, food, travel, education, real estate)
- Creates individual XML files per category
- Progress tracking with early exit on target reached

### Python Data Processing Scripts

**`create_balanced_dataset.py`** (10,352 bytes)
- Creates balanced dataset: 4,000 disaster events + 6,000 regular news items
- Categorizes XML files using keyword matching
- Disaster keywords: fire, earthquake, flood, hurricane, emergency, etc.
- Regular keywords: sports, finance, tech, entertainment, politics, etc.
- Random sampling if too many items
- Supplements from existing JSON files if needed
- Removes duplicates and sorts by date
- Output: `balanced_news_dataset.json` (12,858,422 bytes)

**`create_final_unified.py`** (5,781 bytes)
- Merges ALL XML and JSON files into single dataset
- Loads all .xml files in directory
- Loads all .json files in directory
- Deduplicates across all sources
- Sorts by date (newest first)
- Creates `massive_unified_disaster_news.json` (6,923,471 bytes)
- Target: 10,000+ items

**`convert_xml_to_json.py`** (2,325 bytes)
- Simple XML RSS to JSON converter
- Extracts channel metadata (title, link, description, language, generator)
- Extracts news items with standard fields
- Adds totalItems count and convertedAt timestamp
- Default: converts `news.xml` to `news.json`

**`extend_news.py`** (9,676 bytes)
- Extends news.json with random events and XML integration
- Generates 5 random news events with random dates (last 30 days)
- Integrates all XML files found in directory
- Creates `integrated_news.xml` with all items
- Creates `news_extended.json` with extended dataset
- Deduplicates and sorts by date

**`verify_data_count.py`** (7,816 bytes)
- Comprehensive data verification and reporting tool
- Counts items in all JSON and XML files
- Categorizes files (disaster vs regular, by year, etc.)
- Reports file sizes, item counts, duplicates removed
- Top 10 largest files by item count
- Category breakdowns with file counts
- Target verification (10,000 items)
- Data quality checks (valid/invalid files)
- Exit code: 0 if target reached, 1 otherwise

## Data Files

**Primary Datasets:**
- `balanced_news_dataset.json` (12.8 MB) - 4k disasters + 6k regular news
- `massive_unified_disaster_news.json` (6.9 MB) - Comprehensive disaster collection
- `unified_disaster_news.json` (1.5 MB) - Standard disaster news
- `news_extended.json` (101 KB) - Extended basic news
- `news.json` (99 KB) - Basic news dataset

**JSON Structure:**
```json
{
  "feed": {
    "title": "Feed Title",
    "link": "https://news.google.com",
    "description": "Feed description",
    "language": "en-GB",
    "lastBuildDate": "Sat, 01 Feb 2026 12:00:00 GMT",
    "generator": "Aggregator Version"
  },
  "items": [
    {
      "title": "News article title",
      "link": "https://example.com/article",
      "guid": "unique-identifier",
      "pubDate": "Fri, 30 Jan 2026 08:28:27 GMT",
      "description": "Article description or snippet",
      "source": "https://example.com",
      "disaster": true,
      "location": {
        "name": "Location Name",
        "lat": 39.123,
        "long": 27.456
      }
    }
  ],
  "totalItems": 10000,
  "disaster_count": 4000,
  "regular_count": 6000
}
```

**XML Files:**
- Individual category XML files (50-200 KB each)
- RSS 2.0 format with channel metadata and items
- Generated by fetch scripts, consumed by processing scripts

## Go Server Implementation Details

**Data Structures:**
```go
type Location struct {
    Name string  `json:"name"`
    Lat  float32 `json:"lat"`
    Long float32 `json:"long"`
}

type NewsItem struct {
    Title       string   `json:"title"`
    Link        string   `json:"link"`
    GUID        string   `json:"guid"`
    PubDate     string   `json:"pubDate"`
    Description string   `json:"description"`
    Source      string   `json:"source"`
    Disaster    bool     `json:"disaster"`
    Location    Location `json:"location"`
}

type NewsData struct {
    Feed        FeedInfo   `json:"feed"`
    Items       []NewsItem `json:"items"`
    TotalItems  int        `json:"totalItems"`
    ConvertedAt string     `json:"convertedAt"`
}
```

**Key Features:**
- Reads entire JSON file into memory
- Calculates start index based on percentage
- Infinite loop that wraps around at end
- Date conversion: RFC1123 → RFC3339Nano
- Trims payload to essential fields (title, link, pubDate, disaster, location)
- 10-second HTTP timeout
- Structured logging with zerolog (RFC3339Nano timestamps)
- Console writer with color output

**Target URL:**
```
https://715814cd2aaf.ngrok-free.app/news_information_in
```

## Python Data Processing Pipeline

### Standard Workflow

**Step 1: Fetch Disaster News**
```bash
# Option A: Standard disaster collection (~1.5MB)
python fetch_disaster_news.py

# Option B: Massive disaster collection (target 10k+, ~7MB)
python fetch_massive_disaster_news.py
```

**Step 2: Fetch Regular News**
```bash
python fetch_regular_news.py  # Target 6k+ regular news items
```

**Step 3: Create Balanced Dataset**
```bash
python create_balanced_dataset.py  # 4k disasters + 6k regular = 10k total
```

**Step 4: Verify Data**
```bash
python verify_data_count.py  # Comprehensive verification report
```

**Step 5: Stream to data_server**
```bash
go run main.go -file=balanced_news_dataset.json -delay=1000
# or
./run.sh  # Streams turkey earthquake data
```

### Common Operations

**Convert XML to JSON:**
```bash
python convert_xml_to_json.py
```

**Extend existing news:**
```bash
python extend_news.py  # Adds random events and integrates XML files
```

**Create unified disaster dataset:**
```bash
python create_final_unified.py  # Merges ALL data sources
```

### Data Processing Features

**Deduplication Logic:**
- Checks title (case-insensitive), link, and guid
- Removes exact duplicates across all sources
- Preserves first occurrence

**Date Handling:**
- Input: RFC1123 format (`Fri, 30 Jan 2026 08:28:27 GMT`)
- Output (JSON): RFC1123 preserved
- Output (Go stream): RFC3339Nano (`2026-01-30T08:28:27.000000000Z`)

**Sorting:**
- Always newest first (descending by pubDate)
- Handles multiple date formats with fallback

**Rate Limiting:**
- Google News RSS: Random delays (0.5-3s between requests)
- Retry logic: 3 attempts with exponential backoff
- User-Agent rotation for scraping reliability

## Turkey Earthquake Subdirectory

**Location:** `/Users/haashim/Repositories/ichack26workspace/ichack26/news_server/turkey/`

**Purpose:** Specialized processing for Turkey earthquake news with geographical location extraction and GPS coordinate tagging.

**See:** `turkey/CLAUDE.md` for comprehensive documentation including:
- 7 Python scripts for location extraction (BERT NER, T5-Flan LLM, pattern matching, parallel processing)
- 16 XML category files (casualties, damage, rescue, infrastructure, etc.)
- 12 JSON files (unified datasets, backups, processing variants)
- Location extraction approaches (accuracy vs speed tradeoffs)
- Integration with parent news_server system

**Quick Access:**
```bash
cd turkey/
python fetch_turkey_earthquake_news.py  # Fetch latest earthquake news
python clean_location_extractor.py      # Add GPS coordinates (BERT NER)
python quick_enhanced_gps.py            # Add GPS coordinates (fast pattern matching)
```

**Integration:**
- Turkey earthquake data can be merged into unified disaster datasets
- Contains high-quality geolocated disaster events
- `run.sh` by default streams turkey/turkey.json
- Provides real-world disaster data with precise locations

## Dependencies and Tech Stack

### Go Dependencies (go.mod)
```
github.com/rs/zerolog v1.34.0         # Structured logging
github.com/mattn/go-colorable v0.1.14 # Color terminal output
github.com/mattn/go-isatty v0.0.20    # Terminal detection
golang.org/x/sys v0.40.0              # System calls
```

### Python Dependencies (Inferred)
```
requests              # HTTP requests for RSS fetching
xml.etree.ElementTree # XML parsing (built-in)
json                  # JSON handling (built-in)
urllib.parse          # URL parsing (built-in)
glob                  # File pattern matching (built-in)
datetime              # Date handling (built-in)
random                # Random sampling (built-in)
collections           # Data structures (built-in)

# Turkey subdirectory additional:
transformers          # BERT NER, T5-Flan LLM
torch                 # PyTorch for model inference
beautifulsoup4        # Web scraping
newspaper3k           # Article extraction
geocoder              # Geocoding API
lxml                  # Fast XML parsing
```

### Tech Stack Summary
- **Backend:** Go 1.25.0 (HTTP client/streamer)
- **Data Processing:** Python 3.x (fetching, processing, balancing)
- **Data Source:** Google News RSS Feeds
- **Data Format:** RSS 2.0 XML → JSON
- **Storage:** File-based (JSON datasets)
- **Logging:** zerolog (Go), print statements (Python)
- **HTTP:** Standard library (Go), requests (Python)

## Integration with data_server

**data_server Location:** `/Users/haashim/Repositories/ichack26workspace/ichack26/data_server/`

**Integration Points:**

1. **HTTP Endpoint:**
   - news_server (Go) → `POST /news_information_in` → data_server (Python aiohttp)
   - URL: `https://715814cd2aaf.ngrok-free.app/news_information_in` (ngrok tunnel)

2. **Payload Format:**
   ```json
   {
     "title": "News article title",
     "link": "https://example.com/article",
     "pubDate": "2026-01-30T08:28:27.000000000Z",
     "disaster": true,
     "location": {
       "name": "Location Name",
       "lat": 39.123,
       "long": 27.456
     }
   }
   ```

3. **Data Storage (data_server):**
   - Receives news via `/news_information_in`
   - Stores in SQLite database (`news_articles` table)
   - Schema: `(article_id, link, title, pub_date, disaster, location_name, lat, lon, received_at)`
   - See: `data_server/CLAUDE.md` for full details

4. **Data Flow:**
   ```
   news_server/main.go (Go client)
       ↓ HTTP POST
   data_server/news_client.py (aiohttp server)
       ↓ save_news()
   data_server/database/postgres.py (SQLite operations)
       ↓ INSERT
   SQLite Database (data/ichack_server.db)
       ↓ SELECT
   generate_states.py (Claude AI analysis)
       ↓ GET
   /danger_entities_out (API endpoint)
   ```

5. **Related Files:**
   - `data_server/news_client.py` - Receives news via HTTP POST
   - `data_server/database/postgres.py` - SQLite database operations
   - `data_server/generate_states.py` - AI state generation with Claude
   - `data_server/CLAUDE.md` - Full data_server documentation

**Deployment:**
- news_server: Runs locally, streams to ngrok tunnel
- data_server: Deployed on Google Cloud Run (us-central1)
- ngrok: Provides public URL for local development

## Usage Examples

### Stream balanced dataset to data_server
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server
go run main.go -file=balanced_news_dataset.json -delay=1000 -start=0
```

### Stream turkey earthquake data
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server
./run.sh
# Equivalent to:
# go run main.go -file=turkey/turkey.json -delay=2000
```

### Fetch fresh disaster news
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server
python fetch_massive_disaster_news.py
# Creates massive_unified_disaster_news.json with 10k+ items
```

### Create new balanced dataset
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server
python fetch_massive_disaster_news.py  # Fetch disaster news
python fetch_regular_news.py           # Fetch regular news
python create_balanced_dataset.py      # Combine into 4k+6k balanced dataset
python verify_data_count.py            # Verify counts and quality
```

### View JSON data stats
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server
python verify_data_count.py
# Outputs comprehensive report with file sizes, item counts, categories
```

### Convert XML to JSON
```bash
cd /Users/haashim/Repositories/ichack26workspace/ichack26/news_server
python convert_xml_to_json.py
# Converts news.xml to news.json
```

## File Structure

```
news_server/
├── main.go                              # Go HTTP client (streaming server)
├── go.mod                               # Go module dependencies
├── go.sum                               # Go dependency checksums
├── run.sh                               # Quick start script (turkey data)
│
├── fetch_disaster_news.py               # Disaster news fetcher (15 categories)
├── fetch_massive_disaster_news.py       # Extended disaster fetcher (70+ categories)
├── fetch_regular_news.py                # Regular news fetcher (sports, finance, tech, etc.)
│
├── create_balanced_dataset.py           # Creates 4k+6k balanced dataset
├── create_final_unified.py              # Merges ALL data sources
├── convert_xml_to_json.py               # XML → JSON converter
├── extend_news.py                       # Extends news with random events
├── verify_data_count.py                 # Data verification tool
│
├── balanced_news_dataset.json           # 12.8 MB - 4k disasters + 6k regular
├── massive_unified_disaster_news.json   # 6.9 MB - 10k+ disaster items
├── unified_disaster_news.json           # 1.5 MB - Standard disaster collection
├── news_extended.json                   # 101 KB - Extended basic news
├── news.json                            # 99 KB - Basic news dataset
│
└── turkey/                              # Turkey earthquake specialist
    ├── CLAUDE.md                        # Turkey subdirectory documentation
    ├── fetch_turkey_earthquake_news.py  # Fetches turkey earthquake news (16 categories)
    ├── clean_location_extractor.py      # BERT NER location extraction + GPS
    ├── enhanced_gps_extractor.py        # T5-Flan LLM + web scraping for GPS
    ├── llm_location_extractor.py        # T5-Flan for location names only
    ├── quick_enhanced_gps.py            # Fast pattern-based GPS extraction
    ├── add_gps_coordinates.py           # Simple pattern-based GPS
    ├── fast.py                          # Parallel processing variant
    ├── turkey.json                      # 1.6 MB - Unified turkey dataset
    ├── good_turkey.json                 # 1.6 MB - Final processed version
    ├── turkey_earthquake_*.xml          # 16 category XML files
    └── (12 JSON files including backups and processing variants)
```

## Performance and Scalability

**Data Volume:**
- Balanced dataset: 10,000 items (~13 MB)
- Massive disaster: 10,000+ items (~7 MB)
- Turkey earthquake: ~1,000 items (~1.6 MB)

**Processing Speed:**
- XML fetching: 0.5-3s per query (rate limited)
- Deduplication: Fast (hash-based set operations)
- JSON parsing/writing: Fast (built-in libraries)
- Go streaming: Configurable delay (default 1s/item)

**Memory Usage:**
- Go server: Loads entire JSON file into memory
- Python scripts: Stream processing where possible
- Recommendation: 2-4 GB RAM for processing large datasets

**Scalability:**
- Can handle 10k+ items per dataset
- Deduplication works across all sources
- Go server can loop indefinitely
- Rate limiting prevents API abuse

## Common Operations

**Start fresh data collection:**
```bash
# Remove old XML files
rm *.xml

# Fetch new disaster news (massive collection)
python fetch_massive_disaster_news.py

# Fetch new regular news
python fetch_regular_news.py

# Create balanced dataset
python create_balanced_dataset.py

# Verify results
python verify_data_count.py
```

**Stream different datasets:**
```bash
# Stream balanced dataset (10k items)
go run main.go -file=balanced_news_dataset.json -delay=1000

# Stream massive disaster dataset (10k+ disasters only)
go run main.go -file=massive_unified_disaster_news.json -delay=1000

# Stream turkey earthquake data (geolocated)
go run main.go -file=turkey/turkey.json -delay=2000
```

**Quick verification:**
```bash
# Count items in JSON file
cat balanced_news_dataset.json | grep -o '"title"' | wc -l

# View first news item
cat balanced_news_dataset.json | jq '.items[0]'

# Count disaster vs regular
cat balanced_news_dataset.json | jq '.disaster_count, .regular_count'

# Check file sizes
ls -lh *.json
```

## Development Notes

**Adding new disaster categories:**
1. Edit `fetch_massive_disaster_news.py`
2. Add new `(query, filename)` tuple to `disaster_queries` list
3. Run script to fetch new data
4. Rebuild unified dataset with `create_final_unified.py`

**Adding new regular news categories:**
1. Edit `fetch_regular_news.py`
2. Add new `(query, filename)` tuple to `regular_news_queries` list
3. Run script to fetch new data
4. Rebuild balanced dataset with `create_balanced_dataset.py`

**Changing balance ratio:**
1. Edit `create_balanced_dataset.py`
2. Modify target counts in comments and sampling logic
3. Adjust `if len(disaster_items) > 4000:` and `if len(regular_items) > 6000:`
4. Run script to create new balanced dataset

**Changing streaming target:**
1. Edit `main.go`
2. Change `const targetURL = "https://..."` to new endpoint
3. Rebuild: `go build main.go`

## Troubleshooting

**Google News rate limiting:**
- Symptom: Many failed fetches
- Solution: Increase delays in fetch scripts (`time.sleep(random.uniform(2, 5))`)

**Go server can't find file:**
- Check file path is relative to current directory
- Use absolute paths if needed
- Verify JSON file is valid with `jq . file.json`

**No items after deduplication:**
- Check if all items are duplicates
- Review deduplication logic in `ensure_uniqueness()`
- Verify multiple XML files exist

**Data verification fails:**
- Run `python verify_data_count.py` for detailed report
- Check for empty/invalid XML files
- Verify JSON structure with `jq . file.json`

## Last Updated

- Structure documented: 2026-02-01
- Go server: Active and functional
- Python pipeline: Active and functional
- Data sources: Google News RSS (updated continuously)
- Integration: Connected to data_server via ngrok
