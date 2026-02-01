# Agent 5: News & Weather Alerts Data Sources Research
## Focus: Turkey + UK (with global coverage options)

**Date:** 2026-02-01
**Status:** TESTED AND WORKING

---

## Table of Contents
1. [Weather Alerts APIs](#weather-alerts-apis)
2. [Earthquake/Disaster APIs](#earthquakedisaster-apis)
3. [News APIs](#news-apis)
4. [Summary & Recommendations](#summary--recommendations)

---

## Weather Alerts APIs

### 1. Norway Met Office - MetAlerts (WORKING - FREE)
**Best for:** European weather alerts, covers some UK areas

**Endpoint:**
```
GET https://api.met.no/weatherapi/metalerts/2.0/all.json
```

**Example Request:**
```bash
curl -s "https://api.met.no/weatherapi/metalerts/2.0/all.json" \
  -H "User-Agent: YourAppName/1.0"
```

**Sample Response:**
```json
{
  "type": "Feature",
  "geometry": {
    "coordinates": [[[ /* polygon coordinates */ ]]],
    "type": "Polygon"
  },
  "properties": {
    "area": "A3",
    "awareness_level": "2; yellow; Moderate",
    "awareness_type": "1; Wind",
    "certainty": "Likely",
    "description": "Vestlig sterk kuling 20 m/s.",
    "event": "gale",
    "eventAwarenessName": "Kuling",
    "eventEndingTime": "2026-02-01T02:00:00+00:00",
    "riskMatrixColor": "Yellow",
    "severity": "Moderate",
    "status": "Actual",
    "title": "Kuling, A3, 31 januar 22:00 UTC til 01 februar 02:00 UTC."
  },
  "when": {
    "interval": ["2026-01-31T22:00:00+00:00", "2026-02-01T02:00:00+00:00"]
  }
}
```

**Key Fields:**
- `awareness_level`: Alert level (1-4: yellow/orange/red)
- `awareness_type`: Type code (1=Wind, 2=Snow, 3=Thunderstorm, etc.)
- `severity`: Moderate/Severe/Extreme
- `when.interval`: Start and end time of alert

**Notes:**
- No API key required
- Requires User-Agent header
- GeoJSON format
- Covers Norway, Svalbard, and marine areas

---

### 2. UK Met Office NSWWS (National Severe Weather Warning Service)
**Best for:** Official UK weather warnings

**Endpoint:** Requires API key registration
```
https://[provided-url]/nswws/atom
```

**Registration:**
- Apply via: https://metoffice.github.io/nswws-public-api/
- Contact form for API key access

**Format:** Atom Syndication Format (XML)

**Key Features:**
- Official UK Met Office severe weather warnings
- Updates when warnings are issued/updated/cancelled/expired
- Categories: Rain, Wind, Snow, Ice, Fog, Thunderstorm

**Notes:**
- Requires API key in `x-api-key` header
- Rate limits apply (provided with key)
- Best for production UK weather applications

---

### 3. Open-Meteo (WORKING - FREE, NO API KEY)
**Best for:** Weather forecasts for any location (Turkey + UK)

**Endpoint:**
```
GET https://api.open-meteo.com/v1/forecast
```

**Example - London, UK:**
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current=temperature_2m,wind_speed_10m&hourly=temperature_2m"
```

**Example - Ankara, Turkey:**
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=32.9&current=temperature_2m,wind_speed_10m&daily=weathercode&timezone=auto"
```

**Sample Response (Turkey):**
```json
{
  "latitude": 39.875,
  "longitude": 32.875,
  "timezone": "Europe/Istanbul",
  "timezone_abbreviation": "GMT+3",
  "elevation": 899.0,
  "current": {
    "time": "2026-02-01T04:45",
    "temperature_2m": 5.5,
    "wind_speed_10m": 7.8
  },
  "daily": {
    "time": ["2026-02-01", "2026-02-02", ...],
    "weathercode": [3, 80, 85, 3, 3, 61, 80]
  }
}
```

**Weather Code Reference:**
- 0: Clear sky
- 1-3: Partly cloudy
- 45-48: Fog
- 51-67: Rain/Drizzle
- 71-77: Snow
- 80-82: Rain showers
- 85-86: Snow showers
- 95-99: Thunderstorm

**Notes:**
- No API key required
- Supports UKMO 2km model for UK
- Completely free for non-commercial use

---

### 4. US NWS Alerts API (WORKING - FREE)
**Best for:** Reference implementation, US alerts only

**Endpoint:**
```
GET https://api.weather.gov/alerts/active
```

**Example:**
```bash
curl -s "https://api.weather.gov/alerts/active?status=actual" \
  -H "User-Agent: YourApp/1.0"
```

**Sample Response:**
```json
{
  "type": "FeatureCollection",
  "features": [{
    "properties": {
      "areaDesc": "Inland Berkeley",
      "severity": "Severe",
      "certainty": "Likely",
      "urgency": "Expected",
      "event": "Extreme Cold Warning",
      "headline": "Extreme Cold Warning issued January 31...",
      "description": "Dangerously cold wind chills...",
      "instruction": "Dress in layers including a hat...",
      "effective": "2026-01-31T20:34:00-05:00",
      "expires": "2026-02-01T04:45:00-05:00"
    }
  }]
}
```

**Key Fields:**
- `severity`: Minor/Moderate/Severe/Extreme
- `certainty`: Possible/Likely/Observed
- `urgency`: Unknown/Past/Future/Expected/Immediate
- `event`: Alert type name
- `areaDesc`: Affected area description

---

## Earthquake/Disaster APIs

### 5. USGS Earthquake API (WORKING - FREE)
**Best for:** Global earthquake data, excellent for worldwide monitoring

**Endpoint:**
```
GET https://earthquake.usgs.gov/fdsnws/event/1/query
```

**Example:**
```bash
curl "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-01-30&minmagnitude=4&limit=5"
```

**Sample Response:**
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated": 1769910320000,
    "title": "USGS Earthquakes",
    "count": 5
  },
  "features": [{
    "type": "Feature",
    "properties": {
      "mag": 4.4,
      "place": "74 km WSW of Calingasta, Argentina",
      "time": 1769902089809,
      "status": "reviewed",
      "tsunami": 0,
      "type": "earthquake",
      "title": "M 4.4 - 74 km WSW of Calingasta, Argentina"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [-70.0906, -31.6759, 143.928]
    },
    "id": "us6000s5sr"
  }]
}
```

**Key Parameters:**
- `format`: geojson, csv, text, xml
- `starttime`/`endtime`: ISO8601 dates
- `minmagnitude`/`maxmagnitude`: Magnitude filter
- `minlatitude`/`maxlatitude`: Bounding box
- `limit`: Max results

**Notes:**
- No API key required
- Real-time data
- Global coverage including Turkey

---

### 6. AFAD Turkey Earthquake API (WORKING - FREE)
**Best for:** Turkey-specific earthquake data from official source

**Endpoint:**
```
POST https://deprem.afad.gov.tr/EventData/GetEventsByFilter
```

**Example Request:**
```bash
curl -X POST "https://deprem.afad.gov.tr/EventData/GetEventsByFilter" \
  -H "Content-Type: application/json" \
  -d '{
    "EventSearchFilterList": [
      {"FilterType": 8, "Value": "2026-01-30T00:00:00"},
      {"FilterType": 9, "Value": "2026-02-01T23:59:59"}
    ],
    "Skip": 0,
    "Take": 100,
    "SortDescriptor": {"field": "eventDate", "dir": "desc"}
  }'
```

**Filter Types:**
- FilterType 8: Start date
- FilterType 9: End date

**Response Fields:**
- `eventDate`: Earthquake date/time
- `latitude`, `longitude`: Location
- `depth`: Depth in km
- `magnitude`: Magnitude value
- `location`: Place description (Turkish)

**Notes:**
- Official Turkey disaster management agency
- POST request required
- No API key needed
- Real-time data

---

### 7. EMSC Seismic Portal (EUROPE)
**Best for:** European earthquake data

**Endpoint:**
```
GET https://www.seismicportal.eu/fdsnws/event/1/query
```

**Example:**
```bash
curl "https://www.seismicportal.eu/fdsnws/event/1/query?format=geojson&starttime=2026-01-30&minmag=4"
```

**Notes:**
- FDSN standard format
- GeoJSON output
- Covers Europe including Turkey

---

### 8. GDACS - Global Disaster Alert System (WORKING - FREE)
**Best for:** Global disaster alerts (earthquakes, floods, cyclones, droughts)

**Endpoint:**
```
GET https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH
```

**Example:**
```bash
curl "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ,FL,TC&fromDate=2026-01-25&toDate=2026-02-01"
```

**Sample Response:**
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [47.4, -17.99]
    },
    "properties": {
      "eventtype": "TC",
      "eventid": 1001254,
      "eventname": "FYTIA-26",
      "name": "Tropical Cyclone FYTIA-26",
      "alertlevel": "Orange",
      "alertscore": 2,
      "country": "Madagascar",
      "fromdate": "2026-01-29T12:00:00",
      "todate": "2026-01-31T18:00:00",
      "affectedcountries": [{"iso3": "MDG", "countryname": "Madagascar"}],
      "severitydata": {
        "severity": 179.443296,
        "severitytext": "Moderate Tropical Storm (maximum wind speed of 179 km/h)",
        "severityunit": "km/h"
      }
    }
  }]
}
```

**Event Types:**
- `EQ`: Earthquakes
- `FL`: Floods
- `TC`: Tropical Cyclones
- `DR`: Droughts
- `VO`: Volcanoes
- `WF`: Wildfires

**Alert Levels:**
- Green (1): Low impact
- Orange (2): Moderate impact
- Red (3): High impact

**Notes:**
- UN/EU joint system
- GeoJSON format
- No API key required
- Global coverage

---

## News APIs

### 9. GDELT Project (WORKING - FREE)
**Best for:** Global news monitoring, disaster/crisis news

**Endpoint:**
```
GET https://api.gdeltproject.org/api/v2/doc/doc
```

**Example - Turkey Earthquake News:**
```bash
curl "https://api.gdeltproject.org/api/v2/doc/doc?query=turkey+earthquake&mode=artlist&maxrecords=10&format=json"
```

**Sample Response:**
```json
{
  "articles": [{
    "url": "https://www.turkiyegazetesi.com.tr/...",
    "title": "Deprem mi oldu, nerede deprem oldu? AFAD son depremler...",
    "seendate": "20260126T091500Z",
    "domain": "turkiyegazetesi.com.tr",
    "language": "Turkish",
    "sourcecountry": "Turkey"
  }]
}
```

**Key Parameters:**
- `query`: Search terms (supports boolean operators)
- `mode`: artlist, timelinevol, timelinetone
- `maxrecords`: Number of results (max 250)
- `format`: json, html
- `sourcelang`: Filter by language (e.g., "turkish")
- `sourcecountry`: Filter by country

**Query Examples:**
- `query=disaster+UK`: UK disaster news
- `query=flood+turkey`: Turkey flood news
- `query=earthquake+warning`: Earthquake warnings

**Notes:**
- No API key required
- Real-time news monitoring
- Excellent for crisis/disaster monitoring
- Supports Turkish and English

---

### 10. NewsAPI.org (FREE TIER AVAILABLE)
**Best for:** General news headlines

**Endpoint:**
```
GET https://newsapi.org/v2/top-headlines
GET https://newsapi.org/v2/everything
```

**Example:**
```bash
curl "https://newsapi.org/v2/top-headlines?country=gb&apiKey=YOUR_KEY"
curl "https://newsapi.org/v2/everything?q=turkey+disaster&apiKey=YOUR_KEY"
```

**Free Tier:**
- 100 requests/day
- Headlines from 1 month ago
- For development only

**Notes:**
- Requires API key (free registration)
- Good for UK (country=gb) headlines
- Production requires paid plan

---

### 11. TheNewsAPI.com (FREE TIER AVAILABLE)
**Best for:** Global news with filtering

**Endpoint:**
```
GET https://api.thenewsapi.com/v1/news/all
```

**Free Tier:**
- 3 requests/day
- Limited features

---

### 12. GNews API (FREE TIER AVAILABLE)
**Best for:** Simple news search

**Endpoint:**
```
GET https://gnews.io/api/v4/search
GET https://gnews.io/api/v4/top-headlines
```

**Free Tier:**
- 100 requests/day
- 10 articles per request
- 12-hour delay

---

## Summary & Recommendations

### For Turkey:

| Data Type | Recommended API | Notes |
|-----------|-----------------|-------|
| Earthquakes | AFAD API | Official, real-time, POST request |
| Weather Forecasts | Open-Meteo | Free, no key needed |
| Disaster Alerts | GDACS | Global coverage, GeoJSON |
| News | GDELT | Free, Turkish language support |

### For UK:

| Data Type | Recommended API | Notes |
|-----------|-----------------|-------|
| Weather Warnings | UK Met Office NSWWS | Official, requires API key |
| Weather Forecasts | Open-Meteo (UKMO model) | Free, 2km resolution |
| Disaster Alerts | GDACS | Global coverage |
| News | NewsAPI/GDELT | Both work well for UK |

### Best Free APIs (No Key Required):

1. **Open-Meteo** - Weather forecasts worldwide
2. **Norway Met Alerts** - European weather alerts
3. **USGS Earthquakes** - Global earthquake data
4. **GDACS** - Global disaster alerts
5. **GDELT** - News monitoring
6. **AFAD** - Turkey earthquakes

### Integration Priority:

1. **GDACS** - Single API for multiple disaster types globally
2. **Open-Meteo** - Weather for both Turkey and UK
3. **AFAD** - Turkey-specific earthquakes
4. **GDELT** - News monitoring for crisis situations
5. **UK Met Office NSWWS** - Official UK warnings (when key obtained)

---

## Quick Start Code Examples

### Python - Fetch Turkey Earthquakes (AFAD):
```python
import requests
from datetime import datetime, timedelta

url = "https://deprem.afad.gov.tr/EventData/GetEventsByFilter"
end_date = datetime.now()
start_date = end_date - timedelta(days=1)

payload = {
    "EventSearchFilterList": [
        {"FilterType": 8, "Value": start_date.isoformat()},
        {"FilterType": 9, "Value": end_date.isoformat()}
    ],
    "Skip": 0,
    "Take": 100,
    "SortDescriptor": {"field": "eventDate", "dir": "desc"}
}

response = requests.post(url, json=payload)
earthquakes = response.json()
```

### Python - Fetch Global Disasters (GDACS):
```python
import requests
from datetime import datetime, timedelta

end_date = datetime.now().strftime("%Y-%m-%d")
start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

url = f"https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
params = {
    "eventtype": "EQ,FL,TC",
    "fromDate": start_date,
    "toDate": end_date
}

response = requests.get(url, params=params)
disasters = response.json()
```

### Python - Fetch Weather (Open-Meteo):
```python
import requests

# UK (London)
uk_url = "https://api.open-meteo.com/v1/forecast"
uk_params = {
    "latitude": 51.5,
    "longitude": -0.1,
    "current": "temperature_2m,wind_speed_10m,weathercode",
    "daily": "weathercode,temperature_2m_max,temperature_2m_min"
}

# Turkey (Istanbul)
tr_params = {
    "latitude": 41.0,
    "longitude": 29.0,
    "current": "temperature_2m,wind_speed_10m,weathercode",
    "timezone": "Europe/Istanbul"
}

uk_weather = requests.get(uk_url, params=uk_params).json()
tr_weather = requests.get(uk_url, params=tr_params).json()
```

---

*Document generated by Agent 5 - News & Weather Alerts Research*
