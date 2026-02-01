# GDELT GeoJSON API Test Results

**Test Date:** 2026-02-01
**API Endpoint:** `https://api.gdeltproject.org/api/v2/geo/geo`
**Status:** SUCCESS - Coordinates returned in GeoJSON format

---

## Test 1: Earthquake Query

**URL:** `https://api.gdeltproject.org/api/v2/geo/geo?query=earthquake&format=GeoJSON`

### Results - COORDINATES VERIFIED

| Location | Longitude | Latitude | Article Count |
|----------|-----------|----------|---------------|
| Turkey | 34.9115 | 39.059 | 112 |
| Hatay, Turkey | 36.1572 | 36.2066 | 80 |
| Mexico | -102.0 | 23.0 | 35 |
| Japan | 138.0 | 36.0 | 32 |
| Maluku, Indonesia | 119.827 | -3.8932 | 29 |
| China | 105.0 | 35.0 | 25 |

### Sample GeoJSON Feature Structure
```json
{
    "type": "Feature",
    "properties": {
        "name": "Turkey",
        "count": 112,
        "shareimage": "https://imgs.stargazete.com/...",
        "html": "<a href=\"...\">...</a>"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [34.9115, 39.059]
    }
}
```

---

## Test 2: Protest Turkey Query

**URL:** `https://api.gdeltproject.org/api/v2/geo/geo?query=protest%20turkey&format=GeoJSON`

### Results - COORDINATES VERIFIED

| Location | Longitude | Latitude | Article Count |
|----------|-----------|----------|---------------|
| Turkey | 34.9115 | 39.059 | 89 |
| Iran | 53.0 | 32.0 | 65 |
| Tehran, Iran | 51.5148 | 35.75 | 35 |
| Saudi Arabia | 45.0 | 25.0 | 32 |
| Washington, USA | -77.0364 | 38.8951 | 32 |
| United Arab Emirates | 54.0 | 24.0 | 26 |

### Sample GeoJSON Feature Structure
```json
{
    "type": "Feature",
    "properties": {
        "name": "Tehran, Tehran, Iran",
        "count": 35,
        "shareimage": "https://s.yimg.com/...",
        "html": "<a href=\"...\">...</a>"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [51.5148, 35.75]
    }
}
```

---

## Key Findings

### GeoJSON Structure
- **Format:** Standard GeoJSON FeatureCollection
- **Geometry Type:** Point
- **Coordinate Order:** [longitude, latitude] (GeoJSON standard)

### Properties Available
- `name`: Location name (city, region, country)
- `count`: Number of articles mentioning this location
- `shareimage`: Representative image URL
- `html`: HTML snippet with article links

### API Parameters
- `query`: Search term (URL encoded)
- `format`: Response format (GeoJSON, HTML, etc.)

---

## Integration Notes for Project

### Extracting Coordinates in Python
```python
import requests

def get_gdelt_locations(query):
    url = f"https://api.gdeltproject.org/api/v2/geo/geo?query={query}&format=GeoJSON"
    response = requests.get(url)
    data = response.json()

    locations = []
    for feature in data.get("features", []):
        coords = feature["geometry"]["coordinates"]
        props = feature["properties"]
        locations.append({
            "name": props["name"],
            "longitude": coords[0],
            "latitude": coords[1],
            "article_count": props["count"]
        })
    return locations
```

### Important Notes
1. **Coordinate order is [lon, lat]** - standard GeoJSON format
2. **Real-time data** - reflects current news coverage
3. **No API key required** - public access
4. **Rate limiting** - be mindful of request frequency
5. **Includes article links** - in the `html` property

---

## Conclusion

**GDELT API successfully returns lat/lon coordinates** in standard GeoJSON format. The API provides:
- Precise coordinates for locations mentioned in news
- Article counts showing coverage intensity
- Related article links and images
- Real-time global news geographic data

This API is suitable for mapping news events and monitoring geographic news coverage patterns.
