# Overpass API Test Results

**Test Date:** 2026-02-01
**API Endpoint:** https://overpass-api.de/api/interpreter
**Purpose:** Verify lat/lon coordinates are returned for POI queries

---

## Test 1: Hospitals in Turkey

**Query:**
```
[out:json][timeout:15];node["amenity"="hospital"](36,26,42,45);out body 5;
```

**Result:** SUCCESS - 5 hospitals returned with coordinates

| Name | Lat | Lon | OSM ID |
|------|-----|-----|--------|
| Baskent Universitesi Hastanesi | 39.9254075 | 32.8319519 | 62673820 |
| Ozel Cankaya Hastanesi | 39.9047963 | 32.8633166 | 75319365 |
| Ozel Biltas Bobrek Tasi Kirma Merkezi | 39.9093866 | 32.8598732 | 247208522 |
| Khansa Hospital | 36.3834541 | 43.1683962 | 256791649 |
| (Hospital in Bodrum area) | 37.0399394 | 27.4289622 | 279563546 |

**Verification:** Each element contains `lat` and `lon` fields

---

## Test 2: Fuel Stations in UK (London Area)

**Query:**
```
[out:json][timeout:15];node["amenity"="fuel"](51.4,-0.2,51.6,0.1);out body 5;
```

**Result:** SUCCESS - 5 fuel stations returned with coordinates

| Name | Lat | Lon | OSM ID |
|------|-----|-----|--------|
| GG On The Move (Applegreen) | 51.4197615 | -0.1277262 | 21390491 |
| Esso | 51.5455813 | -0.133287 | 25813306 |
| Finsbury Services (Texaco) | 51.5655221 | -0.1027062 | 26065849 |
| (Fuel station) | 51.5616225 | -0.1167294 | 27413769 |

**Verification:** Each element contains `lat` and `lon` fields

---

## Test 3: Emergency Shelters in Turkey

**Query:**
```
[out:json][timeout:15];node["emergency"="shelter"](36,26,42,45);out body 5;
```

**Result:** EMPTY - No elements returned

**Note:** The tag `emergency=shelter` is rarely used in OSM. Use `amenity=shelter` instead.

---

## Test 4: Amenity Shelters in Turkey (Alternative Query)

**Query:**
```
[out:json][timeout:15];node["amenity"="shelter"](36,26,42,45);out body 5;
```

**Result:** SUCCESS - 5 shelters returned with coordinates

| Type | Lat | Lon | OSM ID |
|------|-----|-----|--------|
| weather_shelter | 39.2542711 | 26.2731491 | 715773252 |
| (general shelter) | 41.8033948 | 43.1506721 | 781009271 |
| basic_hut | 36.834904 | 27.2072821 | 827616306 |
| public_transport | 37.0389326 | 27.4155818 | 944388289 |
| (general shelter) | 41.7311222 | 44.7358016 | 1158759150 |

**Verification:** Each element contains `lat` and `lon` fields

---

## Test 5: Schools in Turkey

**Query:**
```
[out:json][timeout:15];node["amenity"="school"](36,26,42,45);out body 5;
```

**Result:** SUCCESS - 5 schools returned with coordinates

| Name | Lat | Lon | OSM ID |
|------|-----|-----|--------|
| Doga College | 39.8835834 | 32.8060914 | 60166128 |
| Kara Harp Okulu | 39.9051194 | 32.8385226 | 94840988 |
| Surekli Egitim Merkezi | 39.8982909 | 32.7757311 | 282447167 |
| Cavusin Ilk Ogretim Okulu | 38.6744593 | 34.8379521 | 284912321 |
| Kahuna Sifa | 39.9283788 | 32.8269531 | 309887961 |

**Verification:** Each element contains `lat` and `lon` fields

---

## Summary

| Test | Query Type | Region | Status | Lat/Lon Present |
|------|------------|--------|--------|-----------------|
| 1 | hospital | Turkey | PASS | YES |
| 2 | fuel | UK (London) | PASS | YES |
| 3 | emergency=shelter | Turkey | EMPTY | N/A |
| 4 | amenity=shelter | Turkey | PASS | YES |
| 5 | school | Turkey | PASS | YES |

## Key Findings

1. **Coordinates Confirmed:** All successful queries return elements with `lat` and `lon` fields
2. **Tag Usage:** Use `amenity=shelter` instead of `emergency=shelter` for better results
3. **Response Format:** JSON response includes metadata (version, generator, timestamp, copyright) and an `elements` array
4. **Data Quality:** Results include rich metadata like names, brands, addresses, and additional tags

## Recommended Query Pattern

```bash
curl -s "https://overpass-api.de/api/interpreter" \
  -d 'data=[out:json][timeout:TIMEOUT];node["TAG_KEY"="TAG_VALUE"](SOUTH,WEST,NORTH,EAST);out body LIMIT;'
```

**Parameters:**
- `TIMEOUT`: Query timeout in seconds (15-60 recommended)
- `TAG_KEY/TAG_VALUE`: OSM tag to filter (e.g., amenity=hospital)
- `SOUTH,WEST,NORTH,EAST`: Bounding box coordinates
- `LIMIT`: Maximum number of results

## Useful Tags for Disaster Response

| Category | Tag |
|----------|-----|
| Hospitals | `amenity=hospital` |
| Clinics | `amenity=clinic` |
| Pharmacies | `amenity=pharmacy` |
| Schools | `amenity=school` |
| Shelters | `amenity=shelter` |
| Fuel Stations | `amenity=fuel` |
| Fire Stations | `amenity=fire_station` |
| Police Stations | `amenity=police` |
| Water Sources | `amenity=drinking_water` |
| Supermarkets | `shop=supermarket` |
