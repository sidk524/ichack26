# Agent 4: Crime & Civil Unrest Data Sources Research

**Focus Areas:** Turkey and UK
**Research Date:** February 2026

---

## Summary

This document catalogs working APIs for crime and civil unrest data, with a focus on Turkey and the UK. Three primary sources were identified and tested:

| Source | Coverage | Status | Auth Required |
|--------|----------|--------|---------------|
| UK Police API | UK only | Working | No |
| GDELT API | Global | Working | No |
| ACLED API | Global | Requires Registration | Yes (free) |

---

## 1. UK Police API (data.police.uk)

**Status:** WORKING - Fully tested and operational

### Overview
The UK Police API provides comprehensive crime data for England, Wales, and Northern Ireland. It offers street-level crime data, police force information, and neighborhood details.

### Base URL
```
https://data.police.uk/api/
```

### Authentication
**None required** - The API is completely open and free to use.

### Key Endpoints

#### 1.1 Street-Level Crimes by Location
```bash
curl "https://data.police.uk/api/crimes-street/all-crime?lat=51.5&lng=-0.1&date=2024-01"
```

**Response Sample:**
```json
[
  {
    "category": "anti-social-behaviour",
    "location_type": "Force",
    "location": {
      "latitude": "51.490825",
      "street": {
        "id": 1680899,
        "name": "On or near Petrol Station"
      },
      "longitude": "-0.111492"
    },
    "context": "",
    "outcome_status": null,
    "persistent_id": "",
    "id": 116083561,
    "location_subtype": "",
    "month": "2024-01"
  }
]
```

**Fields:**
- `category` - Crime type (e.g., "anti-social-behaviour", "violent-crime", "public-order")
- `location.latitude` / `location.longitude` - Geographic coordinates
- `location.street.name` - Approximate street location
- `month` - Month of crime (YYYY-MM format)
- `outcome_status` - Investigation outcome (if available)
- `id` - Unique crime identifier

#### 1.2 Crime by Specific Category
```bash
# Get public order crimes (protests, civil unrest related)
curl "https://data.police.uk/api/crimes-street/public-order?lat=51.5&lng=-0.1&date=2024-01"
```

#### 1.3 Crime Categories
```bash
curl "https://data.police.uk/api/crime-categories?date=2024-01"
```

**Response Sample:**
```json
[
  {"url": "all-crime", "name": "All crime"},
  {"url": "anti-social-behaviour", "name": "Anti-social behaviour"},
  {"url": "public-order", "name": "Public order"},
  {"url": "violent-crime", "name": "Violence and sexual offences"}
]
```

**Relevant Categories for Civil Unrest:**
- `public-order` - Most relevant for protests/demonstrations
- `anti-social-behaviour` - May include protest-related incidents
- `violent-crime` - Violence and sexual offences

#### 1.4 List Police Forces
```bash
curl "https://data.police.uk/api/forces"
```

**Response Sample:**
```json
[
  {"id": "metropolitan", "name": "Metropolitan Police Service"},
  {"id": "city-of-london", "name": "City of London Police"},
  {"id": "greater-manchester", "name": "Greater Manchester Police"}
]
```

#### 1.5 Outcomes at Location
```bash
curl "https://data.police.uk/api/outcomes-at-location?date=2024-01&lat=51.5&lng=-0.1"
```

### Rate Limits
- No explicit rate limit documented
- Recommended: Keep requests reasonable

### Notes
- Data typically updated monthly
- Maximum 10,000 crimes per request
- Location coordinates are anonymized to street level
- Data covers England, Wales, and Northern Ireland only

---

## 2. GDELT API (Global Database of Events, Language, and Tone)

**Status:** WORKING - Fully tested and operational

### Overview
GDELT monitors world news media in over 100 languages, tracking events including protests, civil unrest, and conflicts globally. Excellent coverage of Turkey and UK.

### Base URLs
- **DOC API:** `https://api.gdeltproject.org/api/v2/doc/doc`
- **GEO API:** `https://api.gdeltproject.org/api/v2/geo/geo`

### Authentication
**None required** - Free and open API

### Rate Limits
**IMPORTANT:** Limit requests to one every 5 seconds. For larger queries, contact kalev.leetaru5@gmail.com

### Key Endpoints

#### 2.1 Article Search (DOC API)
```bash
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20turkey&mode=ArtList&format=json&maxrecords=5"
```

**Response Sample (Turkey Protests):**
```json
{
  "articles": [
    {
      "url": "https://www.haberler.com/guncel/...",
      "url_mobile": "https://www.haberler.com/amp/...",
      "title": "CHPli Tanrikulundan , Mesem Protestosuna Katilan 16 Tiplinin Tutuklanmasina Tepki",
      "seendate": "20251204T133000Z",
      "socialimage": "",
      "domain": "haberler.com",
      "language": "Turkish",
      "sourcecountry": "Turkey"
    }
  ]
}
```

**Fields:**
- `url` - Full URL of the article
- `url_mobile` - Mobile version URL
- `title` - Article title
- `seendate` - When GDELT indexed the article (YYYYMMDDTHHmmssZ)
- `domain` - Source website domain
- `language` - Article language
- `sourcecountry` - Country of the news source

#### 2.2 Geographic Event Search (GEO API)
```bash
curl "https://api.gdeltproject.org/api/v2/geo/geo?query=protest&format=GeoJSON&maxrecords=5"
```

**Response Sample:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Minneapolis, Minnesota, United States",
        "count": 972,
        "shareimage": "https://...",
        "html": "<a href=\"...\">Article Title</a>"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-93.2638, 44.9800]
      }
    }
  ]
}
```

**Fields:**
- `properties.name` - Location name
- `properties.count` - Number of articles mentioning this location
- `geometry.coordinates` - [longitude, latitude]

### Query Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `query` | text | Search terms (URL encoded) |
| `mode` | ArtList, TimelineVol, ToneChart | Output mode |
| `format` | json, html, csv | Response format |
| `maxrecords` | 1-250 | Number of results |
| `startdatetime` | YYYYMMDDHHMMSS | Start date filter |
| `enddatetime` | YYYYMMDDHHMMSS | End date filter |
| `sourcecountry` | country code | Filter by source country |
| `sourcelang` | language code | Filter by language |

### Example Queries

**UK Protests:**
```bash
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20london&mode=ArtList&format=json&maxrecords=5"
```

**Turkey Civil Unrest:**
```bash
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20istanbul&mode=ArtList&format=json&maxrecords=5"
```

**Istanbul Demonstrations:**
```bash
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=demonstration%20turkey&mode=ArtList&format=json&maxrecords=5"
```

---

## 3. ACLED API (Armed Conflict Location & Event Data)

**Status:** REQUIRES REGISTRATION - API access requires free myACLED account

### Overview
ACLED is the gold standard for conflict and protest event data. It provides disaggregated data on political violence and demonstrations worldwide, including Turkey and UK.

### Registration Required
1. Create free account at: https://acleddata.com
2. Create myACLED account
3. Obtain API access credentials (email + access key)

### Base URLs
- **Auth Token:** `https://acleddata.com/oauth/token`
- **Data API:** `https://acleddata.com/api/acled/read`

### Authentication Flow

#### Step 1: Get Access Token
```bash
curl -X POST "https://acleddata.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your.email@example.com" \
  -d "password=YOUR_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=acled"
```

**Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 86400,
  "access_token": "ACCESS-TOKEN-HERE",
  "refresh_token": "REFRESH-TOKEN-HERE"
}
```

#### Step 2: Make API Request
```bash
curl -H "Authorization: Bearer ACCESS-TOKEN-HERE" \
  -X GET \
  "https://acleddata.com/api/acled/read?limit=10&country=Turkey"
```

### Query Parameters

| Parameter | Format | Description |
|-----------|--------|-------------|
| `country` | text | Country name (e.g., "Turkey", "United Kingdom") |
| `region` | number | Region code |
| `event_date` | YYYY-MM-DD | Event date |
| `year` | YYYY | Filter by year |
| `event_type` | text | Type of event (Protests, Riots, etc.) |
| `latitude` | number | Latitude coordinate |
| `longitude` | number | Longitude coordinate |
| `limit` | number | Max records to return |
| `_format` | json/csv | Response format |

### Event Types
- **Battles** - Armed clashes between groups
- **Explosions/Remote violence** - Bombs, IEDs, shelling
- **Violence against civilians** - Targeted attacks on civilians
- **Protests** - Non-violent demonstrations
- **Riots** - Violent demonstrations
- **Strategic developments** - Political events, agreements

### Example Queries

**Turkey Protests:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://acleddata.com/api/acled/read?_format=json&country=Turkey&event_type=Protests&year=2024"
```

**UK Riots and Protests:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://acleddata.com/api/acled/read?_format=json&country=United%20Kingdom&event_type=Protests:OR:event_type=Riots&year=2024"
```

### ACLED Data Fields

| Field | Description |
|-------|-------------|
| `event_id_cnty` | Unique event identifier |
| `event_date` | Date of event (YYYY-MM-DD) |
| `event_type` | Type of event |
| `sub_event_type` | Detailed event classification |
| `actor1` / `actor2` | Parties involved |
| `country` | Country |
| `admin1` / `admin2` / `admin3` | Administrative divisions |
| `location` | Specific location name |
| `latitude` / `longitude` | Coordinates |
| `fatalities` | Number of deaths |
| `notes` | Event description |
| `source` | Information source |

### R Package
```r
# Install
install.packages("acled.api")

# Usage
library(acled.api)
Sys.setenv(ACLED_EMAIL_ADDRESS = "your.email@example.com")
Sys.setenv(ACLED_ACCESS_KEY = "your_access_key")

data <- acled.api(
  country = "Turkey",
  start.date = "2024-01-01",
  end.date = "2024-12-31"
)
```

---

## 4. Additional Sources (Research Only)

### 4.1 Turkey-Specific Sources

**Turkey Protest, Repression, and Pro-Government Rally Dataset (TPRPGRD)**
- Academic dataset covering 2013-2016
- 12,910 coded events from Turkish newspapers
- Includes protests, government repression, pro-government rallies
- Available via academic request

**Trading Economics - Turkey Terrorism Index**
- URL: https://tradingeconomics.com/turkey/terrorism-index
- Provides annual terrorism index data
- API access requires subscription

### 4.2 Commercial APIs

**FirstOInvest Protest & Civil Unrest Monitoring**
- Endpoint: `https://api.firstoinvest.com/v1/ProtestUnrest/`
- Requires API key (commercial)
- Fields: DateTime, Country, StateCity, Topic, Title, URL

### 4.3 UK Crime Statistics (Alternative)

**UKCrimestats API**
- URL: https://www.ukcrimestats.com/api/
- Requires API key (registration)
- Provides crime rankings and statistics by postcode

---

## 5. Integration Recommendations

### For Real-Time Monitoring

1. **Primary: GDELT** (no auth, global coverage, 5-sec rate limit)
   - Best for: Breaking news, trending events
   - Query frequency: Every 5 seconds max

2. **Secondary: UK Police API** (no auth, UK only)
   - Best for: Historical crime patterns, UK-specific analysis
   - Query frequency: No strict limit

3. **Tertiary: ACLED** (requires registration)
   - Best for: Comprehensive conflict analysis, academic research
   - Query frequency: Based on account tier

### Sample Integration Code (Python)

```python
import requests
import time

# GDELT - Global protest news
def get_gdelt_protests(location, max_records=10):
    url = f"https://api.gdeltproject.org/api/v2/doc/doc"
    params = {
        "query": f"protest {location}",
        "mode": "ArtList",
        "format": "json",
        "maxrecords": max_records
    }
    response = requests.get(url, params=params)
    time.sleep(5)  # Rate limit
    return response.json()

# UK Police API - Street-level crime
def get_uk_crimes(lat, lng, date, category="all-crime"):
    url = f"https://data.police.uk/api/crimes-street/{category}"
    params = {"lat": lat, "lng": lng, "date": date}
    response = requests.get(url, params=params)
    return response.json()

# Example usage
turkey_news = get_gdelt_protests("istanbul")
uk_crimes = get_uk_crimes(51.5, -0.1, "2024-01")
```

---

## 6. Turkey-Specific Notes

### Current Situation (as of early 2026)
Based on research, Turkey has experienced significant civil unrest:

- **March 2025 Protests:** Following the arrest of Istanbul Mayor Ekrem Imamoglu
- Protests spread to 55 of 81 provinces
- Largest demonstrations since 2013 Gezi Park protests
- Social media crackdowns and detentions reported

### Monitoring Turkey via GDELT
```bash
# Turkish language sources
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=protest&sourcelang=turkish&mode=ArtList&format=json&maxrecords=10"

# Specific cities
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20ankara&mode=ArtList&format=json&maxrecords=10"
```

---

## 7. Data Freshness & Update Frequency

| Source | Update Frequency | Lag Time |
|--------|------------------|----------|
| UK Police API | Monthly | ~2 months |
| GDELT | Near real-time | Minutes |
| ACLED | Weekly | 1-2 weeks |

---

## Appendix: Quick Reference

### Tested & Working Endpoints

```bash
# UK Police - All crimes near coordinate
curl "https://data.police.uk/api/crimes-street/all-crime?lat=51.5&lng=-0.1&date=2024-01"

# UK Police - Crime categories
curl "https://data.police.uk/api/crime-categories?date=2024-01"

# UK Police - Police forces
curl "https://data.police.uk/api/forces"

# GDELT - Turkey protests (JSON)
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=protest%20turkey&mode=ArtList&format=json&maxrecords=5"

# GDELT - GeoJSON protest locations
curl "https://api.gdeltproject.org/api/v2/geo/geo?query=protest&format=GeoJSON&maxrecords=5"
```

### Key URLs
- UK Police API Docs: https://data.police.uk/docs/
- GDELT API Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-documentation/
- ACLED Registration: https://acleddata.com
- ACLED API Docs: https://acleddata.com/api-documentation/getting-started
