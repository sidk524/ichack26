# HDX Destroyed Buildings & Refugee Camps API Test Results

**Test Date:** 2026-02-01
**Status:** ALL TESTS PASSED - Coordinates Verified

---

## Test 1: HDX Search API - Turkey Destroyed Buildings

**Endpoint:** `https://data.humdata.org/api/3/action/package_search?q=turkey+destroyed+buildings&rows=3`

**Result:** SUCCESS (227 datasets found)

### Key Dataset Found:
- **Title:** HOTOSM Turkey Destroyed Buildings (OpenStreetMap Export)
- **ID:** `41765491-7345-421f-91d8-a023412e46b5`
- **Name:** `hotosm_tur_destroyed_buildings`
- **Source:** OpenStreetMap contributors via Humanitarian OpenStreetMap Team (HOT)
- **License:** Open Database License (ODC-ODbL)
- **Last Modified:** 2023-05-22

### Bounding Box (from geo-preview):
```
BOX(35.280311 36.0259581, 38.3135565 38.2496046)
```
- **Min Lon:** 35.280311
- **Max Lon:** 38.3135565
- **Min Lat:** 36.0259581
- **Max Lat:** 38.2496046

### Available Resources:
| Format | Size | Download URL |
|--------|------|--------------|
| GeoJSON | 169,550 bytes | https://s3.us-east-1.amazonaws.com/exports-stage.hotosm.org/hotosm_tur_destroyed_buildings_polygons_geojson_geojson_uid_12c31136-ec56-4c83-bdd9-f37b1cd7fc08.zip |

### Data Context:
- Related to Turkey-Syria Earthquake 2023 (Feb 6, 2023)
- Derived from Copernicus EMS and Istanbul Technical University aerial imagery
- Query: `destroyed:building = 'yes' AND damage:date = '2023-02-06'`

---

## Test 2: Overpass API - Refugee Sites

**Endpoint:** `https://overpass-api.de/api/interpreter`
**Query:** `node["amenity"="refugee_site"](0,-30,40,60);out body 10;`

**Result:** SUCCESS - Coordinates Verified

### Sample Refugee Sites with Actual Coordinates:

| Name | Latitude | Longitude | Location |
|------|----------|-----------|----------|
| Kakuma Refugee Camps | **3.7472506** | **34.8289126** | Kenya |
| Tel al-Sultan Refugee Camp | **31.3090108** | **34.2431681** | Palestine |
| Deir Ammar RC | **31.9654396** | **35.0991363** | Palestine |
| Qalandiya Refugee Camp | **31.8692068** | **35.2277003** | Palestine |
| Smara Refugee Camp | **27.4924695** | **-7.828097** | Western Sahara |
| Dirkou | **18.9907655** | **12.8916249** | Niger |

### Coordinate Verification:
```json
{
    "type": "node",
    "id": 44999572,
    "lat": 3.7472506,
    "lon": 34.8289126,
    "tags": {
        "amenity": "refugee_site",
        "name": "Kakuma Refugee Camps"
    }
}
```

---

## Test 3: Overpass API - Destroyed Buildings (Turkey Region)

**Endpoint:** `https://overpass-api.de/api/interpreter`
**Query:** `node["destroyed:building"="yes"](36,26,42,45);out body 5;`
**Bounding Box:** Lat 36-42, Lon 26-45 (Turkey/Syria earthquake zone)

**Result:** SUCCESS - Coordinates Verified

### Destroyed Buildings with Actual Coordinates:

| OSM ID | Name/Event | Latitude | Longitude | Source |
|--------|------------|----------|-----------|--------|
| 5691301543 | Kulturkent Sitesi | **37.5840213** | **36.8975394** | - |
| 10646682154 | Earthquake 2023-02-06 | **37.0698376** | **37.3903394** | CopernicusEMS |
| 10669040551 | Earthquake 2023-02-06 | **36.500741** | **36.388143** | CopernicusEMS |

### Raw Data Sample:
```json
{
    "type": "node",
    "id": 10646682154,
    "lat": 37.0698376,
    "lon": 37.3903394,
    "tags": {
        "damage:date": "2023-02-06",
        "damage:event": "#TurkiyeEQ060223",
        "damage:type": "earthquake",
        "destroyed:building": "yes",
        "earthquake:damage": "yes",
        "source": "CopernicusEMS"
    }
}
```

---

## Summary

| Test | API | Status | Has Lat/Lon |
|------|-----|--------|-------------|
| HDX Search | data.humdata.org | PASS | Yes (bounding box) |
| Refugee Sites | Overpass | PASS | Yes (per node) |
| Destroyed Buildings | Overpass | PASS | Yes (per node) |

### Key Findings:

1. **HDX API** returns metadata with bounding boxes. Actual coordinate data is in downloadable GeoJSON/Shapefile resources.

2. **Overpass API** returns direct lat/lon coordinates for each OSM node:
   - Refugee sites: `lat` and `lon` fields present in every element
   - Destroyed buildings: `lat` and `lon` fields present in every element

3. **Data Quality:**
   - Destroyed buildings tagged with `damage:date`, `damage:event`, `source`
   - Refugee sites include multilingual names and operator info (e.g., UNRWA)

4. **Coordinate Format:**
   - Latitude: Decimal degrees (e.g., 37.0698376)
   - Longitude: Decimal degrees (e.g., 37.3903394)
   - Projection: WGS84 (EPSG:4326)

---

## API Query Examples for Integration

### Overpass - Get destroyed buildings with coordinates:
```
[out:json][timeout:25];
node["destroyed:building"="yes"](36,26,42,45);
out body;
```

### HDX - Search datasets:
```
https://data.humdata.org/api/3/action/package_search?q=destroyed+buildings&rows=10
```

### HDX - Get specific dataset:
```
https://data.humdata.org/api/3/action/package_show?id=hotosm_tur_destroyed_buildings
```
