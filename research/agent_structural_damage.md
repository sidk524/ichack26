# Structural Damage and Building Assessment APIs Research

## Overview
This document provides comprehensive research on APIs and data sources for structural damage assessment, building damage reports, and satellite-derived damage data with a focus on post-disaster scenarios.

---

## 1. Copernicus Emergency Management Service (EMS)

### Description
The Copernicus Emergency Management Service provides satellite-derived maps and geospatial information for emergency response. It offers damage grading products that classify building damage levels.

### Data Access

#### Direct Data Download
- **Portal**: https://mapping.emergency.copernicus.eu/
- **Activations List**: https://mapping.emergency.copernicus.eu/activations/
- **Turkey Earthquake 2023**: EMSR692

#### Data Formats Available
- **Vector Data**: GeoJSON, Shapefiles, GeoPackage
- **Raster Data**: Cloud Optimized GeoTIFF (COG), Vector Tiles

#### API Access (Unofficial - from documentation)
```
Base URL: https://mapping.emergency.copernicus.eu/
Activation Page: /activations/EMSR[ID]
```

#### Data Harvesting API
```json
{
  "activations_endpoint": "https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/emergency-response-data/",
  "fields": {
    "activationId": "Unique activation identifier (e.g., EMSR692)",
    "activationType": "Type of disaster (Earthquake, Flood, etc.)",
    "countries": "Countries affected",
    "stats": "Damage statistics (buildings, roads, population)",
    "productsPath": "ZIP download URL for all products",
    "aws_bucket": "S3 storage URL for map assets"
  }
}
```

#### Damage Categories
- **Destroyed**: 75-100% structure collapsed
- **Damaged**: 5-30% structure damaged
- **Possibly Damaged**: Visible debris
- **No Visible Damage**: Structure appears intact

### Sample Data Structure
```json
{
  "products[].stats": {
    "Built-up": {
      "Residential Buildings": {
        "unit": "",
        "total": 344,
        "affected": 1
      }
    }
  },
  "products[].layers[]": {
    "name": "layer path",
    "format": "cog or vt",
    "json": "GeoJSON path"
  }
}
```

### Authentication
- Public data access (no authentication for downloads)
- Activation requests require authorized user status

---

## 2. UNOSAT (UN Satellite Analysis)

### Description
UNITAR's Operational Satellite Applications Programme provides satellite imagery analysis for humanitarian emergencies.

### Access Methods

#### Products Portal
- **URL**: https://unosat.org/products/
- **Format**: Web interface with downloadable maps and GIS data

#### Activation Request
- **Email**: emergencymapping@unosat.org
- **Hotline**: +41 75 411 4998 (24/7)

#### GDACS-SMCS Integration
- **URL**: https://smcs-unosat.web.cern.ch/
- **Purpose**: Satellite Mapping Coordination System - shows which organizations are mapping which areas

### Data Formats
- PDF map products
- GeoJSON/Shapefile downloads
- WMS/WFS services
- Live webmaps

### Turkey/Syria Earthquake 2023 Products
- 30 Satellite Derived Impact/Damage Assessment products for Syria
- 25 Impact/Damage assessment maps
- 5 Preliminary situation reports
- 1 Damage assessment dashboard
- WMS/WFS services provided

### Sample WMS Request
```
Service URL: Contact UNOSAT for activation-specific WMS endpoints
Format: OGC WMS standard
```

---

## 3. HDX (Humanitarian Data Exchange) - Turkey Destroyed Buildings

### Description
OpenStreetMap-derived destroyed buildings data maintained by HOT (Humanitarian OpenStreetMap Team).

### API Access

#### CKAN API Endpoints
```bash
# Search for datasets
GET https://data.humdata.org/api/3/action/package_search?q=turkey+earthquake+destroyed+buildings

# Get specific dataset
GET https://data.humdata.org/api/3/action/package_show?id=hotosm_tur_destroyed_buildings

# Download resources
GET https://data.humdata.org/api/3/action/datastore_search?resource_id={RESOURCE_ID}
```

### Turkey Destroyed Buildings Dataset

#### Dataset Details
- **ID**: hotosm_tur_destroyed_buildings
- **Title**: HOTOSM Turkey Destroyed Buildings (OpenStreetMap Export)
- **URL**: https://data.humdata.org/dataset/hotosm_tur_destroyed_buildings
- **License**: Open Database License (ODC-ODbL)
- **Total Downloads**: 2,168+

#### OSM Query Filter
```
destroyed:building = 'yes' AND damage:date = '2023-02-06'
```

#### Available Formats
| Format | Download URL | Size |
|--------|--------------|------|
| GeoJSON | https://s3.us-east-1.amazonaws.com/exports-stage.hotosm.org/hotosm_tur_destroyed_buildings_polygons_geojson_geojson_uid_12c31136-ec56-4c83-bdd9-f37b1cd7fc08.zip | 169 KB |
| CSV | https://s3.us-east-1.amazonaws.com/exports-stage.hotosm.org/hotosm_tur_destroyed_buildings_polygons_csv_csv_uid_447d931d-bfba-4e57-9c17-c335e146c471.zip | 68 KB |
| GeoPackage | https://s3.us-east-1.amazonaws.com/exports-stage.hotosm.org/hotosm_tur_destroyed_buildings_polygons_gpkg_gpkg_uid_9ca77aea-a2d5-4c7b-8ff0-f9aff1df04eb.zip | 344 KB |

#### Data Attributes
- `osm_id`: OpenStreetMap feature ID
- `destroyed_building`: "yes"
- `damage_date`: "2023-02-06"
- `damage_event`: "#TurkiyeEQ2023"
- `damage_type`: "earthquake"
- `source`: "CopernicusEMS" or "cscrc"
- `addr_*`: Address components
- `name`: Building name
- Geometry: Polygon with coordinates

#### Bounding Box
```
BOX(35.280311 36.0259581, 38.3135565 38.2496046)
```

---

## 4. OpenStreetMap - Overpass API (Damaged Buildings)

### Description
Query OpenStreetMap for buildings tagged with damage information.

### API Endpoint
```
https://overpass-api.de/api/interpreter
```

### Damage-Related Tags
- `destroyed:building=yes` - Building is destroyed
- `damage:date=YYYY-MM-DD` - Date of damage
- `damage:event=*` - Event identifier
- `damage:type=earthquake|flood|fire|etc.`
- `earthquake:damage=yes` - Earthquake damage indicator

### Query Examples

#### All Destroyed Buildings in Turkey
```overpassql
[out:json][timeout:90];
area["name"="Turkiye"]->.a;
(
  node["destroyed:building"="yes"](area.a);
  way["destroyed:building"="yes"](area.a);
  relation["destroyed:building"="yes"](area.a);
);
out center;
```

#### Direct API Call
```bash
curl -X POST 'https://overpass-api.de/api/interpreter' \
  -d '[out:json][timeout:25];
      area["name"="Turkiye"]->.a;
      (node["destroyed:building"="yes"](area.a);
       way["destroyed:building"="yes"](area.a););
      out center 100;'
```

### Sample Response
```json
{
  "version": 0.6,
  "elements": [
    {
      "type": "way",
      "id": 102165117,
      "center": {"lat": 36.2015471, "lon": 36.1655274},
      "tags": {
        "amenity": "place_of_worship",
        "damage:date": "2023-02-06",
        "damage:event": "#TurkiyeEQ060223",
        "damage:type": "earthquake",
        "destroyed:building": "yes",
        "name": "Habib-i Neccar Camii",
        "source": "cscrc"
      }
    }
  ]
}
```

### GeoJSON Export via Overpass Turbo
```
URL: https://overpass-turbo.eu/s/1rhM
```

---

## 5. Maxar Open Data Program

### Description
High-resolution satellite imagery for disaster events, provided under CC-BY-NC-4.0 license.

### STAC Catalog Access

#### Catalog URL
```
https://maxar-opendata.s3.amazonaws.com/events/catalog.json
```

#### Turkey Earthquake Collection
```
https://maxar-opendata.s3.amazonaws.com/events/Kahramanmaras-turkey-earthquake-23/collection.json
```

### AWS S3 Access
```bash
# List bucket contents
aws s3 ls --no-sign-request s3://maxar-opendata/

# List Turkey earthquake data
aws s3 ls --no-sign-request s3://maxar-opendata/events/Kahramanmaras-turkey-earthquake-23/
```

### GeoJSON Footprints
```python
import leafmap
import geopandas as gpd

# Get all image footprints
url = 'https://github.com/opengeos/maxar-open-data/raw/master/datasets/Kahramanmaras-turkey-earthquake-23.geojson'
gdf = gpd.read_file(url)
```

### Collection Metadata
```json
{
  "type": "Collection",
  "id": "Kahramanmaras-turkey-earthquake-23",
  "title": "Turkey and Syria Earthquake 2023",
  "description": "Magnitude 7.8 earthquake struck Turkish province of Kahramanmaras on February 6, 2023",
  "license": "CC-BY-NC-4.0",
  "extent": {
    "spatial": {"bbox": [[35.302597, 35.875122, 40.310497, 38.47292570695286]]},
    "temporal": {"interval": [["2021-02-28", "2023-03-11"]]}
  }
}
```

### Leafmap Integration
```python
import leafmap

# Get pre-event images
pre_gdf = leafmap.maxar_search(
    collection="Kahramanmaras-turkey-earthquake-23",
    end_date="2023-02-06"
)

# Get post-event images
post_gdf = leafmap.maxar_search(
    collection="Kahramanmaras-turkey-earthquake-23",
    start_date="2023-02-06"
)
```

---

## 6. QuickQuakeBuildings Dataset (Research)

### Description
Academic dataset for earthquake-damaged building detection from SAR and optical imagery.

### Access
- **GitHub**: https://github.com/ya0-sun/PostEQ-SARopt-BuildingDamage
- **Paper**: arxiv.org/abs/2312.06587

### Dataset Details
- 4,029 buildings from Islahiye, Turkey
- 169 damaged, 3,860 intact
- Both SAR and optical image patches
- Building footprint masks

### Data Structure
```
/data
  /SAR_patches/
  /optical_patches/
  /footprint_masks/
  labels.csv
```

---

## 7. Additional Turkey Earthquake Data Sources

### NASA Disaster Mapping
- **URL**: https://maps.disasters.nasa.gov/arcgis/apps/MinimalGallery/index.html?appid=cb116456d682456abc38b90d96a72713

### JPL ARIA Share (SAR Data)
- **URL**: https://aria-share.jpl.nasa.gov/20230206_Turkey_EQ/
- **Data**: ALOS-2 and Sentinel-1 interferometry

### Turkey Government Atlas
- **URL**: https://atlas.harita.gov.tr/
- **3D Post-Disaster Data**: https://basic.atlas.gov.tr/

### GitHub Data Compilation
- **URL**: https://github.com/kalkan/Turkey-Earthquake-2023-GeoData
- **Contents**: Satellite data, spatial data, analysis results

---

## 8. Planet Open Data

### Description
Planet Labs provides open data for select disaster events.

### Access
- Requires registration for most data
- Open Data Program for specific events
- STAC API available

### Integration with HDX
Planet data often shared through HDX during major disasters.

---

## 9. World Bank GRADE Reports

### Description
Global Rapid Post-Disaster Damage Estimation reports.

### Turkey Report
Uses OSM and satellite damage data for infrastructure modeling.

---

## 10. Integration Recommendations

### For Building Damage with Coordinates

#### Primary Sources (Most Accessible)
1. **HDX Turkey Destroyed Buildings** - Direct GeoJSON download
2. **Overpass API** - Real-time OSM query for damaged buildings
3. **Maxar Open Data** - Pre/post imagery with STAC API

#### Code Example: Fetch All Turkey Damaged Buildings
```python
import requests
import geopandas as gpd

# Option 1: HDX GeoJSON
hdx_url = "https://s3.us-east-1.amazonaws.com/exports-stage.hotosm.org/hotosm_tur_destroyed_buildings_polygons_geojson_geojson_uid_12c31136-ec56-4c83-bdd9-f37b1cd7fc08.zip"

# Option 2: Overpass API
overpass_query = """
[out:json][timeout:90];
area["name"="Turkiye"]->.a;
(way["destroyed:building"="yes"](area.a););
out geom;
"""
response = requests.post(
    "https://overpass-api.de/api/interpreter",
    data=overpass_query
)
data = response.json()
```

### Combined Data Pipeline
```python
# 1. Get HDX damaged buildings (polygons with metadata)
hdx_gdf = gpd.read_file(hdx_url)

# 2. Get Maxar image footprints
maxar_url = 'https://github.com/opengeos/maxar-open-data/raw/master/datasets/Kahramanmaras-turkey-earthquake-23.geojson'
maxar_gdf = gpd.read_file(maxar_url)

# 3. Spatial join to find imagery covering damaged areas
joined = gpd.sjoin(hdx_gdf, maxar_gdf, how='inner', predicate='intersects')
```

---

## Summary Table

| Source | Data Type | Format | Auth Required | Update Frequency |
|--------|-----------|--------|---------------|------------------|
| Copernicus EMS | Damage grading | GeoJSON, SHP, COG | No (download) | Per activation |
| UNOSAT | Damage assessment | PDF, GeoJSON, WMS | Request based | Per activation |
| HDX (HOT) | Destroyed buildings | GeoJSON, CSV, GPKG | No | Daily (during response) |
| Overpass API | OSM damaged tags | JSON, XML | No | Minutes |
| Maxar Open Data | Satellite imagery | GeoTIFF, STAC | No | Per event |
| QuickQuakeBuildings | ML training data | PNG, CSV | No | Static |

---

## Tested Endpoints

### Working Endpoints
1. **HDX API**: `https://data.humdata.org/api/3/action/package_search?q=turkey+earthquake`
2. **Overpass API**: `https://overpass-api.de/api/interpreter` (POST with query)
3. **Maxar STAC**: `https://maxar-opendata.s3.amazonaws.com/events/catalog.json`

### Response Verified
- HDX returns 29 datasets for Turkey earthquake queries
- Overpass returns damaged building nodes/ways with coordinates
- Maxar STAC catalog lists 55+ disaster events including Turkey earthquake
