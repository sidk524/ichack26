# NASA EONET API Test Results

**Test Date:** 2026-02-01
**API Base URL:** https://eonet.gsfc.nasa.gov/api/v3/events
**Status:** PASSED - All tests return coordinates successfully

---

## Test 1: Open Events (limit=5)

**Endpoint:** `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5`

**Result:** SUCCESS - 5 events returned with coordinates

| Event ID | Title | Category | Longitude | Latitude | Magnitude |
|----------|-------|----------|-----------|----------|-----------|
| EONET_17583 | Tropical Cyclone Fytia | Severe Storms | 42.3 | -15.6 | 35.00 kts |
| EONET_17586 | 540 RX Prescribed Fire, Cleburne, Alabama | Wildfires | -85.572972 | 33.819111 | 589.00 acres |
| EONET_17585 | LXR Northwest Rx 0129 Prescribed Fire, Palm Beach, Florida | Wildfires | -80.392267 | 26.642667 | 4000.00 acres |
| EONET_17588 | APQ Area NC Rx 0128 Prescribed Fire, Polk, Florida | Wildfires | -81.320114 | 27.723452 | 761.00 acres |
| EONET_17589 | CRO C-15 Pinecliff RX Prescribed Fire, Craven, North Carolina | Wildfires | -76.808333 | 34.925833 | 701.00 acres |

---

## Test 2: Wildfires (limit=3)

**Endpoint:** `https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=3`

**Result:** SUCCESS - 3 wildfire events returned with coordinates

| Event ID | Title | Longitude | Latitude | Magnitude | Date |
|----------|-------|-----------|----------|-----------|------|
| EONET_17586 | 540 RX Prescribed Fire, Cleburne, Alabama | **-85.572972** | **33.819111** | 589.00 acres | 2026-01-29T08:29:00Z |
| EONET_17585 | LXR Northwest Rx 0129 Prescribed Fire, Palm Beach, Florida | **-80.392267** | **26.642667** | 4000.00 acres | 2026-01-29T07:15:00Z |
| EONET_17588 | APQ Area NC Rx 0128 Prescribed Fire, Polk, Florida | **-81.320114** | **27.723452** | 761.00 acres | 2026-01-28T08:55:00Z |

---

## Test 3: Severe Storms (limit=3)

**Endpoint:** `https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=3`

**Result:** SUCCESS - 2 severe storm events returned with coordinates (only 2 active storms at test time)

### Tropical Cyclone Fytia (EONET_17583)
Track with multiple coordinate points showing storm movement:

| Date | Longitude | Latitude | Magnitude |
|------|-----------|----------|-----------|
| 2026-01-29T18:00:00Z | **42.3** | **-15.6** | 35.00 kts |
| 2026-01-30T00:00:00Z | **42.4** | **-15.6** | 45.00 kts |
| 2026-01-30T06:00:00Z | **42.5** | **-15.6** | 60.00 kts |
| 2026-01-30T12:00:00Z | **43.0** | **-15.5** | 80.00 kts |
| 2026-01-30T18:00:00Z | **43.9** | **-15.5** | 95.00 kts |
| 2026-01-31T00:00:00Z | **44.8** | **-16.0** | 100.00 kts |
| 2026-01-31T06:00:00Z | **45.8** | **-16.3** | 75.00 kts |
| 2026-01-31T12:00:00Z | **46.5** | **-17.1** | 60.00 kts |

### Tropical Cyclone 18P (EONET_17537)
Track with multiple coordinate points:

| Date | Longitude | Latitude | Magnitude |
|------|-----------|----------|-----------|
| 2026-01-28T06:00:00Z | **172.2** | **-16.9** | 35.00 kts |
| 2026-01-28T12:00:00Z | **173.7** | **-18.9** | 40.00 kts |
| 2026-01-28T18:00:00Z | **173.8** | **-21.4** | 55.00 kts |
| 2026-01-29T00:00:00Z | **173.7** | **-23.4** | 55.00 kts |
| 2026-01-29T06:00:00Z | **173.0** | **-24.9** | 45.00 kts |
| 2026-01-29T12:00:00Z | **172.5** | **-26.2** | 40.00 kts |
| 2026-01-29T18:00:00Z | **171.9** | **-26.9** | 35.00 kts |

---

## Coordinate Format Verification

**CONFIRMED:** Response contains `"geometry"` with `"coordinates": [longitude, latitude]`

### JSON Structure Example:
```json
{
  "geometry": [
    {
      "magnitudeValue": 589.00,
      "magnitudeUnit": "acres",
      "date": "2026-01-29T08:29:00Z",
      "type": "Point",
      "coordinates": [ -85.572972, 33.819111 ]
    }
  ]
}
```

### Key Observations:
1. **Coordinate Order:** GeoJSON standard - `[longitude, latitude]` (NOT lat/lon)
2. **Multiple Points:** Storms can have multiple geometry entries tracking movement over time
3. **Magnitude Data:** Includes magnitude value and unit (kts for storms, acres for fires)
4. **Timestamps:** Each coordinate point includes an ISO 8601 date/time
5. **Point Type:** All geometry entries use `"type": "Point"`

---

## Available Categories

Based on API responses, available category IDs include:
- `wildfires` - Wildfires
- `severeStorms` - Severe Storms
- `volcanoes` - Volcanoes
- `seaLakeIce` - Sea and Lake Ice
- `earthquakes` - Earthquakes

---

## API Usage Notes

### Query Parameters:
- `status=open` - Returns only active/ongoing events
- `status=closed` - Returns only closed/ended events
- `limit=N` - Limits number of events returned
- `category=categoryId` - Filters by event category

### No API Key Required:
The NASA EONET API is publicly accessible without authentication.

---

## Summary

| Test | Status | Events Returned | Coordinates Present |
|------|--------|-----------------|---------------------|
| Open Events (limit=5) | PASS | 5 | YES |
| Wildfires (limit=3) | PASS | 3 | YES |
| Severe Storms (limit=3) | PASS | 2 | YES |

**All tests passed.** The NASA EONET API reliably returns geographic coordinates in GeoJSON format `[longitude, latitude]` for all natural event types.
