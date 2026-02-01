# DMZs, Humanitarian Corridors, and UN Safe Areas - Data Sources Research

## Executive Summary

This research documents available data sources for Demilitarized Zones (DMZs), Humanitarian Corridors, and UN Safe Areas/Protected Zones. **Key finding: There is NO single comprehensive, publicly available GeoJSON/Shapefile database specifically dedicated to DMZ boundaries or humanitarian corridors.** These zones are typically ad-hoc, conflict-specific, and often classified or not publicly shared due to security concerns.

However, several related datasets and approaches can be used to approximate or derive this information.

---

## 1. Demilitarized Zones (DMZs)

### 1.1 Korean DMZ

**Status:** Most well-documented DMZ globally, but no official GeoJSON dataset available.

**Key Coordinates:**
- Center point: 38.32N, 127.20E (approximate)
- Length: 250 km (160 miles)
- Width: ~4 km (2.5 miles)
- Military Demarcation Line (MDL) runs through center

**Available Resources:**
| Resource | Format | URL |
|----------|--------|-----|
| Wikipedia SVG Map | SVG | https://commons.wikimedia.org/wiki/File:Korea_DMZ.svg |
| Maps of DMZ Category | Various | https://commons.wikimedia.org/wiki/Category:Maps_of_the_Demilitarized_Zone_of_Korea |
| South Korea Admin Boundaries | GeoJSON/Shapefile | https://github.com/southkorea/southkorea-maps |
| CIA Map Reference | PDF/Image | International Boundary Study No. 22 (1963) |

**How to Access:**
- Download SVG from Wikimedia Commons and convert to GeoJSON using tools like QGIS
- South Korea boundaries can be combined with known DMZ offset (2km from MDL)

### 1.2 Cyprus UN Buffer Zone (Green Line)

**Status:** Best-documented UN-controlled buffer zone with OpenStreetMap data available.

**Key Facts:**
- Length: ~180 km
- Area: 346 sq km
- Width: 20 meters to 7 km

**Data Sources:**
| Source | Format | URL/Access |
|--------|--------|------------|
| OpenStreetMap Relation | GeoJSON | Relation ID: 3263909 - https://www.openstreetmap.org/relation/3263909 |
| UNFICYP Deployment Maps | PDF/Image | https://unficyp.unmissions.org/about-buffer-zone |
| Wikimedia Commons Maps | Various | https://commons.wikimedia.org/wiki/Category:Maps_of_the_UN_Buffer_Zone_in_Cyprus |
| GeoLocet Commercial Dataset | GeoJSON/Shapefile | https://geolocet.com/products/cyprus-admin-level-3-cyprus-turkish-republic-of-cyprus-un-buffer-zone |

**How to Extract from OpenStreetMap:**
```bash
# Using Overpass API to extract UN Buffer Zone
curl -X POST "https://overpass-api.de/api/interpreter" \
  -d "data=[out:json];relation(3263909);out geom;" \
  > cyprus_buffer_zone.json
```

### 1.3 Other Notable DMZs (Limited/No Public Data)

| DMZ | Location | Data Availability |
|-----|----------|-------------------|
| Vietnam DMZ (Historical) | 17th Parallel | Historical maps only, no GeoJSON |
| Northern Syria Buffer Zone | Turkey-Syria Border | Approximate only, frequently changing |
| Kashmir LOC | India-Pakistan | Disputed, no public geodata |

---

## 2. Humanitarian Corridors

### 2.1 Key Finding: No Standardized Database

Humanitarian corridors are **temporary, negotiated agreements** between conflict parties. They are:
- Not standardized geographically
- Often confidential for security reasons
- Time-limited and frequently changing

### 2.2 LogIE - WFP Logistics Cluster Platform

**Best Available Source for Operational Corridors**

**URL:** https://logie-manual.logcluster.org/en/update-and-edit-humanitarian-corridors

**Description:** The Logistics Cluster's LogIE platform allows humanitarian organizations to:
- Add humanitarian corridor routes (road, rail, sea, river, air)
- Draw corridor boundaries on maps
- Update and manage corridor information

**Access:** Requires humanitarian organization credentials

**Data Format:** Internal GIS system, exportable

### 2.3 ICRC Humanitarian Corridor Operations

**URL:** https://www.icrc.org/en/document/how-humanitarian-corridors-work

**Note:** ICRC facilitates safe passage operations but does NOT publish corridor boundaries publicly due to security concerns.

**Historical Examples with Approximate Data:**
- Ukraine (2022): Sumy, Mariupol evacuations - coordinates available from news reports
- Syria/Aleppo (2016): Eastern Aleppo evacuations
- Yemen: Port access corridors

### 2.4 HumCore Research Project

**URL:** https://humcore.org/wp-content/uploads/2024/07/Mapping-Humanitarian-Corridors-2024-1.pdf

**Description:** Academic research project mapping humanitarian corridors with GIS. Contains 3,064 anonymized records with geographic coordinates.

**Format:** GIS-readable database (not publicly downloadable)

---

## 3. UN Safe Areas / Protected Zones

### 3.1 Types of Protected Zones (IHL Framework)

| Zone Type | Legal Basis | Data Availability |
|-----------|-------------|-------------------|
| Hospital Zones | Geneva Convention | Case-by-case, no database |
| Neutralized Zones | Additional Protocol I | Negotiated ad-hoc |
| Demilitarized Zones | Additional Protocol I, Art. 60 | See DMZ section |
| UN Safe Areas | UNSC Resolutions (Chapter VII) | Mission-specific maps |

### 3.2 UN Peacekeeping Geospatial Data

#### Geo-PKO Dataset (Best Academic Source)

**URL:** https://www.uu.se/en/department/peace-and-conflict-research/research/research-data/geo-pko-dataset

**Description:** Geocoded UN Peacekeeping Operations dataset with deployment locations, troop sizes, and mission boundaries.

**Formats:** CSV, RDS, XLSX

**Coverage:** 1994-2024, all UN peacekeeping missions globally

**Key Fields:**
- Location coordinates (lat/long)
- Troop numbers and types
- Sector boundaries
- Mission areas

**Sample API/Download:**
```
Download: https://www.uu.se/4.7c6497f318e18d9b4ea63e.html
Formats: CSV, RDS, XLSX
```

#### RADPKO Dataset (Africa Focus)

**URL:** https://www.phunnicutt.com/peacekeeping-data.html

**Description:** Robust African Deployments of Peacekeeping Operations - subnational estimates of UN peacekeeping deployments in sub-Saharan Africa (1999-2019).

**Formats:** Compatible with PRIO grid cells, administrative units

#### UN Peacekeeping Official Data

**URL:** https://peacekeeping.un.org/en/data

**Description:** Official UN peacekeeping statistics and deployment data (PDF reports, not GeoJSON).

#### UN Maps Platform

**URL:** https://maps.un.org

**Description:** Official UN geospatial platform with authoritative boundaries, mission maps, and operational data.

**Access:** Some data public, detailed operational data requires UN credentials.

### 3.3 World Database on Protected Areas (WDPA)

**Note:** This covers ENVIRONMENTAL protected areas, not conflict-related safe zones, but relevant for cross-referencing.

**URL:** https://www.protectedplanet.net

**API Endpoint:** https://data-gis.unep-wcmc.org/server/rest/services/ProtectedSites/The_World_Database_of_Protected_Areas/MapServer

**Formats:** Shapefile, GeoJSON (by region/country)

**Coverage:** 308,000+ protected areas globally

---

## 4. Conflict Event Data (For Deriving Safe/Dangerous Zones)

### 4.1 ACLED (Armed Conflict Location & Event Data)

**URL:** https://acleddata.com

**API Documentation:** https://acleddata.com/conflict-data

**Description:** Near-real-time conflict event data with precise coordinates. Can be used to identify conflict-free zones or derive "safe" areas.

**Access:** Free registration required for API access

**API Example:**
```python
import requests

url = "https://api.acleddata.com/acled/read"
params = {
    "key": "YOUR_API_KEY",
    "email": "your@email.com",
    "iso": 760,  # Syria
    "event_date": "2024-01-01|2024-12-31",
    "event_date_where": "BETWEEN",
    "limit": 1000
}
response = requests.get(url, params=params)
data = response.json()
```

**Fields Include:**
- event_id, event_date
- latitude, longitude
- event_type, sub_event_type
- fatalities
- admin1, admin2, admin3

### 4.2 UCDP Georeferenced Event Dataset

**URL:** https://ucdp.uu.se/downloads/

**Description:** Academic conflict event data, compatible with Geo-PKO for peacekeeping analysis.

---

## 5. Administrative Boundaries & Base Maps

### 5.1 Common Operational Datasets (CODs)

**URL:** https://data.humdata.org (search for "COD-AB")

**Description:** UN-OCHA authoritative administrative boundaries for humanitarian operations.

**COD Portal:** https://knowledge.base.unocha.org/wiki/spaces/imtoolbox/pages/42045911/Common+Operational+Datasets+CODs

**Key COD Types:**
- COD-AB: Administrative Boundaries
- COD-PS: Population Statistics
- COD-EM: Edge-Matched Boundaries

### 5.2 Humanitarian Data Exchange (HDX) API

**Base URL:** https://data.humdata.org/api/3/action/

**Example Searches:**
```bash
# Search for Syria admin boundaries
curl "https://data.humdata.org/api/3/action/package_search?q=syria+administrative+boundaries&rows=5"

# Get dataset details
curl "https://data.humdata.org/api/3/action/package_show?id=DATASET_ID"
```

### 5.3 geoBoundaries

**URL:** https://www.geoboundaries.org

**API:** https://www.geoboundaries.org/api.html

**Description:** Open-license administrative boundaries for every country.

**Formats:** Shapefile, GeoJSON, KML

---

## 6. Recommended Approach for Building DMZ/Corridor Layer

Given the lack of comprehensive datasets, here's how to build your own:

### Step 1: Start with Known DMZs
1. Extract Cyprus UN Buffer Zone from OpenStreetMap (Relation 3263909)
2. Create Korean DMZ polygon from known coordinates and 4km width
3. Add historical DMZs from Wikimedia Commons maps

### Step 2: Add Peacekeeping Mission Boundaries
1. Download Geo-PKO dataset
2. Create buffer zones around peacekeeping deployment locations
3. Merge with RADPKO data for Africa

### Step 3: Use ACLED for Conflict-Free Zone Detection
1. Query ACLED API for conflict events
2. Inverse to identify areas without recent conflict
3. Cross-reference with peacekeeping deployments

### Step 4: Monitor Humanitarian Corridors
1. Subscribe to OCHA situation reports via ReliefWeb API
2. Parse corridor announcements and geocode them
3. Track temporary corridors with expiration dates

---

## 7. API Quick Reference

| API | Purpose | Auth | Format |
|-----|---------|------|--------|
| HDX API | Humanitarian datasets | API Key (free) | JSON |
| ACLED API | Conflict events | Email + Key (free) | JSON |
| ReliefWeb API | Humanitarian reports | None | JSON |
| Overpass API | OpenStreetMap data | None | JSON/XML |
| geoBoundaries API | Admin boundaries | None | GeoJSON |
| Copernicus Sentinel Hub | Satellite imagery | OAuth | GeoTIFF |

---

## 8. Key Contacts & Organizations

| Organization | Focus | Website |
|--------------|-------|---------|
| UN OCHA | Humanitarian coordination | https://www.unocha.org |
| ICRC | Neutral humanitarian action | https://www.icrc.org |
| UN DPKO | Peacekeeping operations | https://peacekeeping.un.org |
| UNFICYP | Cyprus peacekeeping | https://unficyp.unmissions.org |
| Uppsala University DPCR | Conflict data research | https://www.uu.se/en/department/peace-and-conflict-research |
| ACLED | Conflict event tracking | https://acleddata.com |

---

## 9. Limitations & Gaps

1. **No Global DMZ Database:** DMZs are established through bilateral/multilateral agreements and boundaries are often classified.

2. **Humanitarian Corridors Are Temporary:** They exist only during active negotiations and are not archived systematically.

3. **UN Safe Areas Are Mission-Specific:** Each peacekeeping mission defines its own areas of operation without a centralized database.

4. **Security Concerns:** Exact boundaries of safe zones may not be published to prevent military exploitation.

5. **Data Currency:** Conflict zones change rapidly; any static dataset will be outdated.

---

## 10. Sample Data Downloads

### Cyprus UN Buffer Zone (from OpenStreetMap)
```bash
# Download via Overpass Turbo
# Go to: https://overpass-turbo.eu/
# Query:
[out:json];
relation(3263909);
out geom;
```

### Geo-PKO Dataset
- Direct download: https://www.uu.se/en/department/peace-and-conflict-research/research/research-data/geo-pko-dataset
- Formats: CSV, RDS, XLSX

### ACLED Data Export
- Tool: https://acleddata.com/data-export-tool/
- Requires free registration

### HDX Syria Admin Boundaries
- URL: https://data.humdata.org/dataset/syrian-arab-republic-other-0-0-0-0-0
- Format: GeoJSON, Shapefile

---

## Conclusion

While there is no single "DMZ and Humanitarian Corridor" GeoJSON database, practitioners can:

1. Use **OpenStreetMap** for the Cyprus UN Buffer Zone
2. Use **Geo-PKO** for peacekeeping deployment data
3. Use **ACLED** to identify conflict-free zones
4. Monitor **OCHA/ReliefWeb** for corridor announcements
5. Build custom layers combining these sources

For real-time humanitarian corridor tracking, the **LogIE platform** (WFP Logistics Cluster) is the most operational tool, but requires humanitarian organization access.
