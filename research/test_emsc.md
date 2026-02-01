# EMSC Seismic Portal API Test Results

**Test Date:** 2026-02-01
**API Endpoint:** https://www.seismicportal.eu/fdsnws/event/1/query

## Test 1: Turkey Region (minlat=36, maxlat=42, minlon=26, maxlon=45)

**Status:** PASS - Coordinates returned successfully

### Sample Events with Actual Coordinates:

| Event ID | Region | Latitude | Longitude | Depth (km) | Magnitude | Time |
|----------|--------|----------|-----------|------------|-----------|------|
| 20260201_0000021 | WESTERN TURKEY | 39.1603 | 28.2689 | 9.8 | 1.6 ml | 2026-02-01T01:28:44.0Z |
| 20260201_0000022 | WESTERN TURKEY | 39.2403 | 29.0183 | 6.8 | 1.1 ml | 2026-02-01T01:27:19.0Z |
| 20260201_0000023 | EASTERN TURKEY | 38.2901 | 38.1422 | 13.5 | - | 2026-02-01T01:19:20.22Z |

### Verified Fields:
- `lat` field present: YES (e.g., 39.1603)
- `lon` field present: YES (e.g., 28.2689)
- `geometry.coordinates` array: YES (format: [lon, lat, depth])

---

## Test 2: UK Region (minlat=50, maxlat=60, minlon=-8, maxlon=2)

**Status:** PASS - Coordinates returned successfully

### Sample Events with Actual Coordinates:

| Event ID | Region | Latitude | Longitude | Depth (km) | Magnitude | Time |
|----------|--------|----------|-----------|------------|-----------|------|
| 20260130_0000273 | IRISH SEA | 53.01 | -5.32 | 6.0 | 1.2 m | 2026-01-30T15:38:24.8Z |
| 20260121_0000314 | UNITED KINGDOM | 55.54 | -6.54 | 1.0 | 0.7 m | 2026-01-21T15:07:35.6Z |
| 20260118_0000340 | NORTH SEA | 58.935 | 1.432 | 26.1 | - | 2026-01-18T12:24:51.7Z |

### Verified Fields:
- `lat` field present: YES (e.g., 53.01)
- `lon` field present: YES (e.g., -5.32)
- `geometry.coordinates` array: YES (format: [lon, lat, depth])

---

## API Response Structure

The EMSC API returns GeoJSON FeatureCollection format:

```json
{
    "type": "FeatureCollection",
    "metadata": {
        "count": 5
    },
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat, depth]
            },
            "id": "event_id",
            "properties": {
                "lat": latitude,
                "lon": longitude,
                "depth": depth_km,
                "mag": magnitude,
                "magtype": "ml",
                "flynn_region": "REGION NAME",
                "time": "ISO timestamp",
                "auth": "source_authority"
            }
        }
    ]
}
```

## Key Findings

1. **Coordinates are provided in TWO locations:**
   - `geometry.coordinates`: Array format [longitude, latitude, depth]
   - `properties.lat` and `properties.lon`: Direct numeric values

2. **Geographic bounding box filtering works correctly:**
   - Turkey query returned events within 36-42N, 26-45E
   - UK query returned events within 50-60N, 8W-2E

3. **Additional useful fields:**
   - `flynn_region`: Human-readable location name
   - `depth`: Depth in kilometers (negative in geometry, positive in properties)
   - `mag` and `magtype`: Magnitude value and scale type
   - `auth`: Reporting authority (EMSC, AFAD, INSN, etc.)

## Conclusion

The EMSC Seismic Portal API successfully returns latitude and longitude coordinates for earthquake events. The API is functional and can be used to retrieve real-time seismic data for any geographic region by specifying bounding box parameters.
