# Agent 2: Humanitarian Data Sources (Turkey + UK Focus)

## Summary

This document provides tested and verified API endpoints for humanitarian and refugee data with a focus on Turkey and the United Kingdom. All endpoints have been tested and are confirmed working as of February 2026.

---

## 1. UNHCR Population API

### Status: WORKING

The UNHCR (United Nations High Commissioner for Refugees) provides a comprehensive API for refugee population statistics.

### Base URL
```
https://api.unhcr.org/population/v1/
```

### Endpoints

#### Population Statistics
```bash
# Turkey refugee data
curl "https://api.unhcr.org/population/v1/population/?year=2024&coa=TUR&limit=5"

# UK refugee data
curl "https://api.unhcr.org/population/v1/population/?year=2024&coa=GBR&limit=5"

# List all countries
curl "https://api.unhcr.org/population/v1/countries/"
```

### Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `year` | Year for statistics | `2024` |
| `coa` | Country of Asylum (3-letter code) | `TUR`, `GBR` |
| `coo` | Country of Origin (3-letter code) | `SYR`, `AFG` |
| `limit` | Number of results | `5`, `100` |

### Sample Response (Turkey 2024)
```json
{
  "page": 1,
  "items": [
    {
      "year": 2024,
      "coa_id": 196,
      "coa_name": "Turkiye",
      "coa": "TUR",
      "coa_iso": "TUR",
      "refugees": 2940735,
      "asylum_seekers": 154083,
      "returned_refugees": 159439,
      "idps": "0",
      "returned_idps": "0",
      "stateless": 420,
      "ooc": "0",
      "hst": "0"
    }
  ]
}
```

### Sample Response (UK 2024)
```json
{
  "items": [
    {
      "year": 2024,
      "coa_name": "United Kingdom of Great Britain and Northern Ireland",
      "coa": "GBR",
      "refugees": 515677,
      "asylum_seekers": 124783,
      "returned_refugees": 6000,
      "stateless": 4672,
      "ooc": 389
    }
  ]
}
```

### Key Fields
| Field | Description |
|-------|-------------|
| `refugees` | Total refugee population |
| `asylum_seekers` | Number of asylum seekers |
| `returned_refugees` | Refugees who returned |
| `idps` | Internally Displaced Persons |
| `stateless` | Stateless persons |
| `ooc` | Others of Concern |

---

## 2. OpenStreetMap Overpass API

### Status: WORKING

Overpass API provides access to OpenStreetMap data including humanitarian facilities.

### Base URL
```
https://overpass-api.de/api/interpreter
```

### Tested Queries

#### 2.1 Refugee Sites (Turkey/Iraq region)
```bash
curl -d 'data=[out:json];node["amenity"="refugee_site"](36,26,42,45);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 4558785189,
      "lat": 36.7946471,
      "lon": 42.9620635,
      "tags": {
        "amenity": "refugee_site",
        "name": "Shariya IDP Camp",
        "name:ar": "مخيم شاريا للنازحين",
        "name:en": "Sharya camp"
      }
    },
    {
      "type": "node",
      "id": 5591566622,
      "lat": 36.6717455,
      "lon": 43.4374838,
      "tags": {
        "amenity": "refugee_site",
        "name": "Mamrashan IDP Camp"
      }
    }
  ]
}
```

#### 2.2 Hospitals - Turkey
```bash
curl -d 'data=[out:json];node["amenity"="hospital"](36,26,42,45);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 62673820,
      "lat": 39.9254075,
      "lon": 32.8319519,
      "tags": {
        "amenity": "hospital",
        "healthcare": "hospital",
        "name": "Baskent Universitesi Hastanesi",
        "wheelchair": "no"
      }
    },
    {
      "type": "node",
      "id": 279563546,
      "lat": 37.0399394,
      "lon": 27.4289622,
      "tags": {
        "amenity": "hospital",
        "healthcare": "hospital",
        "name": "Bodrum Amerikan Hastanesi"
      }
    }
  ]
}
```

#### 2.3 Hospitals - UK
```bash
curl -d 'data=[out:json];node["amenity"="hospital"](50,-6,56,2);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 15034614,
      "lat": 53.0562194,
      "lon": -2.1902949,
      "tags": {
        "addr:city": "Stoke-on-Trent",
        "addr:postcode": "ST6 7AG",
        "amenity": "hospital",
        "emergency": "no",
        "name": "Haywood Hospital Walk-in Centre",
        "opening_hours": "Mo-Fr 07:00-22:00; Sa 09:00-22:00; Su 09:00-22:00",
        "operator": "NHS",
        "phone": "+44 1782 581112",
        "wheelchair": "yes"
      }
    },
    {
      "type": "node",
      "id": 21137164,
      "lat": 52.2183876,
      "lon": 0.1367897,
      "tags": {
        "addr:city": "Cambridge",
        "amenity": "hospital",
        "emergency": "yes",
        "healthcare": "hospital",
        "name": "Urgent Care Cambridge"
      }
    }
  ]
}
```

#### 2.4 Homeless Shelters - UK
```bash
curl -d 'data=[out:json];node["social_facility"="shelter"](50,-6,56,2);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 671237104,
      "lat": 52.1444238,
      "lon": -0.4754431,
      "tags": {
        "addr:housenumber": "50",
        "addr:street": "Clarendon Street",
        "amenity": "social_facility",
        "social_facility": "shelter",
        "social_facility:for": "homeless",
        "website": "https://www.kingsarmsproject.org/the-nightshelter/"
      }
    },
    {
      "type": "node",
      "id": 1243077938,
      "lat": 51.5861676,
      "lon": -2.9970723,
      "tags": {
        "addr:city": "Newport",
        "addr:postcode": "NP20 1JG",
        "amenity": "social_facility",
        "name": "The Gap Centre",
        "phone": "+44 1633 895 010",
        "social_facility": "shelter",
        "social_facility:for": "homeless",
        "website": "https://www.thegap.wales/"
      }
    }
  ]
}
```

#### 2.5 Food Banks - UK
```bash
curl -d 'data=[out:json];node["social_facility"="food_bank"](50,-6,56,2);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 267784099,
      "lat": 52.3437217,
      "lon": 0.5115112,
      "tags": {
        "addr:city": "Bury St Edmunds",
        "addr:postcode": "IP28 7ES",
        "amenity": "social_facility",
        "name": "King's Project",
        "opening_hours": "Mo 10:00-12:00, Fr 10:00-12:00",
        "social_facility": "food_bank",
        "website": "http://www.kingsproject.org.uk/"
      }
    },
    {
      "type": "node",
      "id": 1135617188,
      "lat": 51.6304357,
      "lon": -0.7521560,
      "tags": {
        "addr:city": "High Wycombe",
        "amenity": "social_facility",
        "name": "Wycombe Food Hub",
        "opening_hours": "Mo-Sa 10:00-13:30; Su closed",
        "social_facility": "food_bank",
        "website": "https://wycombefoodhub.org/"
      }
    }
  ]
}
```

#### 2.6 Community Centres - UK
```bash
curl -d 'data=[out:json];node["amenity"="community_centre"](50,-6,56,2);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 15955381,
      "lat": 51.4532419,
      "lon": -0.9797647,
      "tags": {
        "addr:city": "Reading",
        "addr:postcode": "RG1 7XT",
        "amenity": "community_centre",
        "contact:phone": "+44 118 959 0058",
        "name": "The Oasis Community Centre",
        "contact:website": "http://www.theoasisreading.org.uk/"
      }
    }
  ]
}
```

#### 2.7 Social Facilities - Turkey
```bash
curl -d 'data=[out:json];node["social_facility"](36,26,42,45);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Sample Response:**
```json
{
  "elements": [
    {
      "type": "node",
      "id": 3305606665,
      "lat": 41.0489830,
      "lon": 28.9319100,
      "tags": {
        "amenity": "social_facility",
        "name": "Eyup Cocuk Yuvasi",
        "operator": "Istanbul valiligi",
        "social_facility": "group_home",
        "social_facility:for": "orphan"
      }
    }
  ]
}
```

### Bounding Box Reference
| Region | Coordinates (lat_min, lon_min, lat_max, lon_max) |
|--------|--------------------------------------------------|
| Turkey | `36, 26, 42, 45` |
| UK | `50, -6, 56, 2` |
| London | `51.3, -0.5, 51.7, 0.3` |

### Common Tags for Humanitarian Data
| Tag | Values | Description |
|-----|--------|-------------|
| `amenity` | `hospital`, `refugee_site`, `community_centre` | Facility type |
| `social_facility` | `shelter`, `food_bank`, `nursing_home` | Social service type |
| `social_facility:for` | `homeless`, `senior`, `orphan`, `refugee` | Target population |
| `emergency` | `yes`, `no` | Emergency services available |
| `wheelchair` | `yes`, `no`, `limited` | Accessibility |

---

## 3. Humanitarian Data Exchange (HDX) API

### Status: WORKING

HDX provides access to humanitarian datasets from various organizations.

### Base URL
```
https://data.humdata.org/api/3/action/
```

### Endpoints

#### Search Datasets
```bash
# Turkey refugee datasets
curl "https://data.humdata.org/api/3/action/package_search?q=turkey+refugee&rows=3"

# UK refugee datasets
curl "https://data.humdata.org/api/3/action/package_search?q=united+kingdom+refugee&rows=3"
```

### Sample Response (Truncated)
```json
{
  "success": true,
  "result": {
    "count": 6,
    "results": [
      {
        "id": "df46bb71-238c-4c04-98a6-f9f0333deac6",
        "name": "turkey-refugee-camps",
        "title": "Turkey Refugee Camps",
        "dataset_source": "UNHCR",
        "has_geodata": true,
        "resources": [
          {
            "name": "Turkey_Refugee_Camps.zip",
            "format": "SHP",
            "download_url": "https://data.humdata.org/dataset/.../turkey_refugee_camps.zip"
          }
        ],
        "organization": {
          "title": "Regional IM Working Group - Europe"
        }
      },
      {
        "id": "46e2d084-6773-4b10-aad4-de6b0e416c4a",
        "name": "world-bank-social-development-indicators-for-turkey",
        "title": "Turkey - Social Development",
        "dataset_source": "World Bank",
        "notes": "Contains data about refugees, asylum seekers, labor force..."
      },
      {
        "id": "ff383a8b-396a-4d78-b403-687b0a783769",
        "name": "syria-refugee-sites",
        "title": "Syria Refugee Sites",
        "dataset_source": "U.S. Government",
        "notes": "Verified data about refugee sites in Turkey, Jordan, Iraq"
      }
    ]
  }
}
```

### Key Fields
| Field | Description |
|-------|-------------|
| `id` | Unique dataset identifier |
| `name` | URL-friendly name |
| `title` | Human-readable title |
| `dataset_source` | Data provider (UNHCR, World Bank, etc.) |
| `has_geodata` | Whether dataset contains geographic data |
| `resources` | Downloadable files with format and URL |
| `organization` | Publishing organization |

### Available Dataset Types
- Turkey Refugee Camps (SHP format with locations)
- Syria Refugee Sites (CSV, TSV, XLSX)
- Social Development Indicators
- Population Density Maps

---

## 4. Emergency Shelters via Overpass

### Status: NO RESULTS (Turkey region)

The query for emergency shelters in Turkey returned empty results:

```bash
curl -d 'data=[out:json];node["emergency"="shelter"](36,26,42,45);out body 5;' \
  "https://overpass-api.de/api/interpreter"
```

**Note:** This tag is sparsely used in OpenStreetMap. Use `social_facility=shelter` instead for better results.

---

## 5. Quick Reference: Copy-Paste Commands

### Turkey - All Humanitarian Facilities
```bash
# Hospitals
curl -d 'data=[out:json];node["amenity"="hospital"](36,26,42,45);out body 100;' "https://overpass-api.de/api/interpreter"

# Refugee sites
curl -d 'data=[out:json];node["amenity"="refugee_site"](36,26,42,45);out body 100;' "https://overpass-api.de/api/interpreter"

# Social facilities
curl -d 'data=[out:json];node["social_facility"](36,26,42,45);out body 100;' "https://overpass-api.de/api/interpreter"

# UNHCR statistics
curl "https://api.unhcr.org/population/v1/population/?year=2024&coa=TUR"
```

### UK - All Humanitarian Facilities
```bash
# Hospitals
curl -d 'data=[out:json];node["amenity"="hospital"](50,-6,56,2);out body 100;' "https://overpass-api.de/api/interpreter"

# Shelters
curl -d 'data=[out:json];node["social_facility"="shelter"](50,-6,56,2);out body 100;' "https://overpass-api.de/api/interpreter"

# Food banks
curl -d 'data=[out:json];node["social_facility"="food_bank"](50,-6,56,2);out body 100;' "https://overpass-api.de/api/interpreter"

# Community centres
curl -d 'data=[out:json];node["amenity"="community_centre"](50,-6,56,2);out body 100;' "https://overpass-api.de/api/interpreter"

# UNHCR statistics
curl "https://api.unhcr.org/population/v1/population/?year=2024&coa=GBR"
```

---

## 6. Integration Notes

### Rate Limits
- **UNHCR API**: No documented rate limits, but use reasonable delays
- **Overpass API**: 1-2 requests per second recommended; heavy queries may timeout
- **HDX API**: No documented rate limits

### Data Freshness
- **UNHCR**: Annual statistics, updated periodically
- **OpenStreetMap**: Community-maintained, varies by region
- **HDX**: Varies by dataset (check `last_modified` field)

### Authentication
- All tested APIs are **public** and require **no authentication**

### Error Handling
- Overpass API returns empty `elements` array if no results
- UNHCR returns empty `items` array if no data for query
- HDX returns `success: false` on errors with error message

---

## 7. Python Integration Example

```python
import requests

# UNHCR API
def get_refugee_stats(country_code, year=2024):
    url = f"https://api.unhcr.org/population/v1/population/"
    params = {"coa": country_code, "year": year}
    response = requests.get(url, params=params)
    return response.json()

# Overpass API
def get_facilities(amenity_type, bbox):
    url = "https://overpass-api.de/api/interpreter"
    query = f'[out:json];node["amenity"="{amenity_type}"]({bbox});out body;'
    response = requests.post(url, data={"data": query})
    return response.json()

# HDX API
def search_datasets(query, rows=10):
    url = "https://data.humdata.org/api/3/action/package_search"
    params = {"q": query, "rows": rows}
    response = requests.get(url, params=params)
    return response.json()

# Usage examples
turkey_stats = get_refugee_stats("TUR")
uk_hospitals = get_facilities("hospital", "50,-6,56,2")
refugee_datasets = search_datasets("turkey refugee")
```

---

## 8. Summary Statistics (2024)

| Country | Refugees | Asylum Seekers | Stateless |
|---------|----------|----------------|-----------|
| Turkey | 2,940,735 | 154,083 | 420 |
| UK | 515,677 | 124,783 | 4,672 |

---

*Document generated: February 2026*
*All endpoints tested and verified working*
