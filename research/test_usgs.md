# USGS Earthquake API Test Results

**Test Date:** 2026-02-01
**Status:** PASSED - All coordinates successfully returned

---

## Test 1: Get 3 Most Recent Earthquakes (Global)

**API Endpoint:**
```
https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=3&orderby=time
```

**Response Status:** 200 OK

### Earthquakes Retrieved:

| # | Location | Longitude | Latitude | Depth (km) | Magnitude |
|---|----------|-----------|----------|------------|-----------|
| 1 | 6 km NNW of Cantwell, Alaska | -149.004 | 63.448 | 84.8 | 1.9 |
| 2 | 3 km SE of Loma Linda, CA | -117.2398 | 34.0317 | 14.3 | 0.82 |
| 3 | 38 km N of Chase, Alaska | -149.971 | 62.793 | 76.9 | 1.9 |

**Coordinate Format Verified:** `"coordinates": [longitude, latitude, depth]`

---

## Test 2: Get Earthquakes in Turkey/Greece Region (Bounding Box)

**API Endpoint:**
```
https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=3&minlatitude=36&maxlatitude=42&minlongitude=26&maxlongitude=45
```

**Bounding Box Parameters:**
- Min Latitude: 36
- Max Latitude: 42
- Min Longitude: 26
- Max Longitude: 45

**Response Status:** 200 OK

### Earthquakes Retrieved:

| # | Location | Longitude | Latitude | Depth (km) | Magnitude |
|---|----------|-----------|----------|------------|-----------|
| 1 | 15 km SSE of Sindirgi, Turkey | 28.2765 | 39.1269 | 22.788 | 4.4 |
| 2 | 10 km SSW of Sindirgi, Turkey | 28.13 | 39.1558 | 10.0 | 4.1 |
| 3 | 15 km ESE of Sindirgi, Turkey | 28.3371 | 39.1861 | 8.79 | 4.9 |

**Coordinate Format Verified:** `"coordinates": [longitude, latitude, depth]`

---

## Raw JSON Response Structure

```json
{
    "type": "FeatureCollection",
    "metadata": {
        "generated": 1769910927000,
        "url": "...",
        "title": "USGS Earthquakes",
        "status": 200,
        "api": "1.14.1",
        "limit": 3,
        "offset": 1,
        "count": 3
    },
    "features": [
        {
            "type": "Feature",
            "properties": {
                "mag": 4.4,
                "place": "15 km SSE of Sindirgi, Turkey",
                "time": 1769388442257,
                "type": "earthquake",
                "title": "M 4.4 - 15 km SSE of Sindirgi, Turkey"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [28.2765, 39.1269, 22.788]
            }
        }
    ]
}
```

---

## Key Findings

1. **Coordinates ARE returned** in the `geometry.coordinates` array
2. **Format:** `[longitude, latitude, depth]` (GeoJSON standard)
3. **Note:** GeoJSON uses longitude FIRST, then latitude (opposite of typical lat/lon notation)
4. **Depth:** Measured in kilometers below sea level
5. **API is fully functional** and returns real-time earthquake data

---

## Useful API Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `format` | Output format | `geojson`, `csv`, `xml` |
| `limit` | Max results | `1` to `20000` |
| `orderby` | Sort order | `time`, `magnitude` |
| `minlatitude` | Min lat bound | `36` |
| `maxlatitude` | Max lat bound | `42` |
| `minlongitude` | Min lon bound | `26` |
| `maxlongitude` | Max lon bound | `45` |
| `minmagnitude` | Min magnitude | `4.5` |
| `starttime` | Start date | `2026-01-01` |
| `endtime` | End date | `2026-02-01` |

---

## Conclusion

**VERIFIED:** The USGS Earthquake API successfully returns latitude and longitude coordinates for all earthquake events. The coordinates are embedded in the `geometry.coordinates` array following GeoJSON specification where:
- `coordinates[0]` = Longitude
- `coordinates[1]` = Latitude
- `coordinates[2]` = Depth (km)
