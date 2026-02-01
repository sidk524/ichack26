# Natural Disasters Data Sources - API Testing Results

**Agent 1 Research Report**
**Focus: Turkey + UK**
**Date: 2026-02-01**

---

## Summary

| API | Status | Turkey Support | UK Support | Best For |
|-----|--------|----------------|------------|----------|
| USGS Earthquakes | WORKING | Yes | Yes* | Global earthquakes, Turkey coverage |
| EMSC Seismic Portal | WORKING | Yes | Yes | Europe/Turkey earthquakes, FDSN format |
| EMSC GeoJSON | WORKING | Yes | Yes | Real-time European earthquakes |
| Kandilli (KOERI) | WORKING | Yes | No | Turkey-specific earthquakes (Turkish) |
| NASA EONET | WORKING | Limited | Limited | Wildfires, storms, volcanoes |
| AFAD Turkey | NOT WORKING | - | - | No response from API |
| BGS UK | NOT WORKING | - | - | 404 Error |

*UK has very few earthquakes - EMSC is better for UK region

---

## 1. USGS Earthquake API (WORKING)

### Endpoint
```
https://earthquake.usgs.gov/fdsnws/event/1/query
```

### Turkey Region Query
```bash
curl "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=10&minlatitude=36&maxlatitude=42&minlongitude=26&maxlongitude=45"
```

### UK Region Query
```bash
curl "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=10&minlatitude=49&maxlatitude=61&minlongitude=-8&maxlongitude=2"
```

### Sample Response (Turkey)
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated": 1769910249000,
    "url": "https://earthquake.usgs.gov/fdsnws/event/1/query...",
    "title": "USGS Earthquakes",
    "status": 200,
    "api": "1.14.1",
    "count": 3
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "mag": 4.4,
        "place": "15 km SSE of Sindirgi, Turkey",
        "time": 1769388442257,
        "updated": 1769402757040,
        "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000rs18",
        "felt": null,
        "cdi": null,
        "mmi": null,
        "alert": null,
        "status": "reviewed",
        "tsunami": 0,
        "sig": 298,
        "net": "us",
        "code": "7000rs18",
        "magType": "mwr",
        "type": "earthquake",
        "title": "M 4.4 - 15 km SSE of Sindirgi, Turkey"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [28.2765, 39.1269, 22.788]
      },
      "id": "us7000rs18"
    }
  ]
}
```

### Available Fields
| Field | Description | Example |
|-------|-------------|---------|
| `mag` | Magnitude | 4.4 |
| `place` | Human-readable location | "15 km SSE of Sindirgi, Turkey" |
| `time` | Unix timestamp (ms) | 1769388442257 |
| `geometry.coordinates` | [longitude, latitude, depth_km] | [28.2765, 39.1269, 22.788] |
| `magType` | Magnitude type | "mwr", "mb", "ml" |
| `tsunami` | Tsunami flag (0/1) | 0 |
| `sig` | Significance (0-1000) | 298 |
| `status` | Review status | "reviewed", "automatic" |
| `url` | Event detail page | https://earthquake.usgs.gov/... |

### Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `format` | Response format | geojson, csv, text |
| `limit` | Max results | 100 |
| `minlatitude` | South boundary | 36 |
| `maxlatitude` | North boundary | 42 |
| `minlongitude` | West boundary | 26 |
| `maxlongitude` | East boundary | 45 |
| `minmagnitude` | Minimum magnitude | 2.5 |
| `starttime` | Start date | 2026-01-01 |
| `endtime` | End date | 2026-02-01 |

---

## 2. EMSC Seismic Portal FDSN (WORKING)

### Endpoint
```
https://www.seismicportal.eu/fdsnws/event/1/query
```

### Turkey Region Query
```bash
curl "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=10&minlat=36&maxlat=42&minlon=26&maxlon=45"
```

### UK Region Query
```bash
curl "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=10&minlat=49&maxlat=61&minlon=-8&maxlon=2"
```

### Sample Response (Turkey)
```json
{
  "type": "FeatureCollection",
  "metadata": {"count": 3},
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [28.2689, 39.1603, -9.8]
      },
      "id": "20260201_0000021",
      "properties": {
        "source_id": "1938973",
        "source_catalog": "EMSC-RTS",
        "lastupdate": "2026-02-01T01:44:21.704852Z",
        "time": "2026-02-01T01:28:44.0Z",
        "flynn_region": "WESTERN TURKEY",
        "lat": 39.1603,
        "lon": 28.2689,
        "depth": 9.8,
        "evtype": "ke",
        "auth": "AFAD",
        "mag": 1.6,
        "magtype": "ml",
        "unid": "20260201_0000021"
      }
    }
  ]
}
```

### Sample Response (UK)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "geometry": {
        "coordinates": [-5.32, 53.01, -6.0]
      },
      "properties": {
        "time": "2026-01-30T15:38:24.8Z",
        "flynn_region": "IRISH SEA",
        "mag": 1.2,
        "magtype": "m"
      }
    },
    {
      "geometry": {
        "coordinates": [-6.54, 55.54, -1.0]
      },
      "properties": {
        "flynn_region": "UNITED KINGDOM",
        "mag": 0.7
      }
    }
  ]
}
```

### Available Fields
| Field | Description | Example |
|-------|-------------|---------|
| `lat`, `lon` | Coordinates | 39.1603, 28.2689 |
| `depth` | Depth in km | 9.8 |
| `mag` | Magnitude | 1.6 |
| `magtype` | Magnitude type | "ml" |
| `time` | ISO timestamp | "2026-02-01T01:28:44.0Z" |
| `flynn_region` | Region name | "WESTERN TURKEY" |
| `auth` | Authority source | "AFAD", "EMSC" |
| `source_catalog` | Data source | "EMSC-RTS" |

### Parameters
| Parameter | Description |
|-----------|-------------|
| `format` | json, geojson, xml |
| `limit` | Max results |
| `minlat`, `maxlat` | Latitude bounds |
| `minlon`, `maxlon` | Longitude bounds |
| `minmag` | Minimum magnitude |
| `start`, `end` | Time range |

---

## 3. EMSC GeoJSON API (WORKING)

### Endpoint
```
https://www.emsc-csem.org/service/api/1.6/get.geojson
```

### Example Query
```bash
curl "https://www.emsc-csem.org/service/api/1.6/get.geojson?type=full"
```

### Sample Response
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated_time_str": "Thu, 02 Oct 2025 07:50:57 +0000",
    "api": "1.6",
    "status": 200
  },
  "features": [
    {
      "type": "Feature",
      "id": 1874692,
      "properties": {
        "evid": 1874692,
        "url": "https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=1874692",
        "time": {
          "time_str": "Thu, 02 Oct 2025 07:25:49 +0000",
          "tz": 180,
          "tz_str": "Europe/Istanbul"
        },
        "location": {"lat": 38.0811, "lon": 27.0405},
        "magnitude": {"mag": 1.4, "mag_type": "ML"},
        "depth": {"depth": 12.2, "depth_str": "12.2 Km"},
        "place": {"region": "WESTERN TURKEY"},
        "tsunami": {"type": "NONE"}
      },
      "geometry": {
        "type": "Point",
        "coordinates": [27.0405, 38.0811, 12.2]
      }
    }
  ]
}
```

### Available Fields
| Field | Description |
|-------|-------------|
| `location.lat`, `location.lon` | Coordinates |
| `magnitude.mag` | Magnitude value |
| `magnitude.mag_type` | Magnitude type |
| `depth.depth` | Depth in km |
| `place.region` | Region name |
| `time.time_str` | Human-readable time |
| `tsunami.type` | Tsunami status |
| `url` | Event detail page |

---

## 4. Kandilli Observatory (KOERI) - Turkey (WORKING)

### Endpoint
```
http://www.koeri.boun.edu.tr/scripts/lst0.asp
```

### Example Query
```bash
curl "http://www.koeri.boun.edu.tr/scripts/lst0.asp"
```

### Response Format
Returns HTML page with embedded `<pre>` text table. Data format:
```
Tarih      Saat      Enlem(N)  Boylam(E) Derinlik(km)  MD   ML   Mw    Yer
---------- --------  --------  -------   ----------    ------------    --------------
2026.02.01 04:28:44  39.1223   28.2415       15.8      -.-  1.6  -.-   BAYRAKLI-SINDIRGI (BALIKESIR)
2026.02.01 04:27:18  39.2460   29.0402        8.8      -.-  1.1  -.-   KATRANDAGI-EMET (KUTAHYA)
2026.02.01 04:19:20  38.2870   38.1522       13.4      -.-  1.4  -.-   SEYITUSAGI-YESILYURT (MALATYA)
```

### Available Fields (Parsing Required)
| Column | Description | Turkish Header |
|--------|-------------|----------------|
| Tarih | Date (YYYY.MM.DD) | Date |
| Saat | Time (HH:MM:SS) | Time |
| Enlem(N) | Latitude | Latitude (N) |
| Boylam(E) | Longitude | Longitude (E) |
| Derinlik(km) | Depth in km | Depth |
| MD | Duration magnitude | - |
| ML | Local magnitude | - |
| Mw | Moment magnitude | - |
| Yer | Location name (Turkish) | Place |

### Notes
- Data is in Turkish language
- Requires HTML parsing to extract data
- Returns last 500 earthquakes
- Very detailed for Turkey region
- Updates in near real-time

---

## 5. NASA EONET (WORKING)

### Base Endpoint
```
https://eonet.gsfc.nasa.gov/api/v3/events
```

### Available Categories
| Category ID | Description |
|-------------|-------------|
| `drought` | Droughts |
| `dustHaze` | Dust and Haze |
| `earthquakes` | Earthquakes |
| `floods` | Floods |
| `landslides` | Landslides |
| `manmade` | Man-made disasters |
| `seaLakeIce` | Sea and Lake Ice |
| `severeStorms` | Severe Storms (Hurricanes, Typhoons) |
| `snow` | Snow |
| `tempExtremes` | Temperature Extremes |
| `volcanoes` | Volcanic Activity |
| `waterColor` | Water Color (algae blooms) |
| `wildfires` | Wildfires |

### Example Queries
```bash
# Wildfires
curl "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=5"

# Severe Storms
curl "https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=5"

# Volcanoes
curl "https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open&limit=5"

# All categories
curl "https://eonet.gsfc.nasa.gov/api/v3/categories"
```

### Sample Response (Severe Storms)
```json
{
  "title": "EONET Events",
  "description": "Natural events from EONET.",
  "events": [
    {
      "id": "EONET_17583",
      "title": "Tropical Cyclone Fytia",
      "link": "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_17583",
      "closed": null,
      "categories": [
        {"id": "severeStorms", "title": "Severe Storms"}
      ],
      "sources": [
        {"id": "JTWC", "url": "https://www.metoc.navy.mil/jtwc/products/sh1926.tcw"}
      ],
      "geometry": [
        {
          "magnitudeValue": 100.00,
          "magnitudeUnit": "kts",
          "date": "2026-01-31T00:00:00Z",
          "type": "Point",
          "coordinates": [44.8, -16]
        }
      ]
    }
  ]
}
```

### Sample Response (Volcanoes)
```json
{
  "events": [
    {
      "id": "EONET_17163",
      "title": "Ambrym Volcano, Vanuatu",
      "categories": [{"id": "volcanoes", "title": "Volcanoes"}],
      "sources": [
        {"id": "SIVolcano", "url": "https://volcano.si.edu/volcano.cfm?vn=257040"}
      ],
      "geometry": [
        {
          "date": "2026-01-08T00:00:00Z",
          "type": "Point",
          "coordinates": [168.12, -16.25]
        }
      ]
    }
  ]
}
```

### Available Fields
| Field | Description |
|-------|-------------|
| `id` | Event ID |
| `title` | Event name |
| `categories` | Event type(s) |
| `sources` | Data source URLs |
| `geometry[].coordinates` | [longitude, latitude] |
| `geometry[].date` | ISO timestamp |
| `geometry[].magnitudeValue` | Size/intensity |
| `geometry[].magnitudeUnit` | Unit (kts, acres, etc.) |
| `closed` | null if ongoing, date if closed |

### Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `category` | Filter by type | wildfires, severeStorms |
| `status` | open or closed | open |
| `limit` | Max results | 10 |
| `bbox` | Bounding box | minLon,minLat,maxLon,maxLat |
| `start` | Start date | 2026-01-01 |
| `end` | End date | 2026-02-01 |

---

## 6. AFAD Turkey (NOT WORKING)

### Endpoint
```
https://deprem.afad.gov.tr/EventData/GetEventsByFilter
```

### Attempted Query
```bash
curl -X POST "https://deprem.afad.gov.tr/EventData/GetEventsByFilter" \
  -H "Content-Type: application/json" \
  -d '{"Skip":0,"Take":3}'
```

### Status
**NOT WORKING** - API returns no response or empty result. May require authentication or different parameters.

---

## 7. BGS UK (NOT WORKING)

### Endpoint
```
http://earthquakes.bgs.ac.uk/feeds/WorldSeismicity.xml
```

### Status
**NOT WORKING** - Returns 404 Not Found. The feed appears to be discontinued.

### Alternative
Use EMSC Seismic Portal for UK earthquakes (see Section 2).

---

## Recommended Implementation

### For Turkey Earthquakes
1. **Primary**: EMSC Seismic Portal (FDSN) - structured JSON, good coverage
2. **Secondary**: USGS API - global coverage, reliable
3. **Backup**: Kandilli (KOERI) - most detailed Turkey data, requires parsing

### For UK Earthquakes
1. **Primary**: EMSC Seismic Portal (FDSN) - covers UK/Irish Sea region
2. **Note**: UK has very few earthquakes, expect sparse data

### For Other Disasters
1. **Wildfires**: NASA EONET (primarily US coverage)
2. **Severe Storms**: NASA EONET (global cyclones/hurricanes)
3. **Volcanoes**: NASA EONET (global coverage)

---

## Geographic Bounding Boxes

### Turkey
```
minlatitude=36
maxlatitude=42
minlongitude=26
maxlongitude=45
```

### UK (including Ireland and surrounding seas)
```
minlatitude=49
maxlatitude=61
minlongitude=-8
maxlongitude=2
```

---

## Rate Limits & Best Practices

| API | Rate Limit | Notes |
|-----|------------|-------|
| USGS | 20,000/day | Cache results, use time filters |
| EMSC | Unknown | Be respectful, cache results |
| NASA EONET | Unknown | Public API, reasonable use |
| Kandilli | Unknown | Scraping - use sparingly |

### Best Practices
1. Cache responses to reduce API calls
2. Use time-based filters to get only new data
3. Implement retry logic with exponential backoff
4. Store last event ID/time to fetch only new events
