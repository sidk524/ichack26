# UNHCR API Test Results

**Date:** 2026-02-01
**API Base URL:** `https://api.unhcr.org/population/v1/`

---

## Summary

**FINDING: The UNHCR Population Statistics API does NOT provide geographic coordinates (latitude/longitude).** The API focuses on aggregate population statistics at the country level only.

---

## Test 1: Turkey (TUR) Population Data

**Endpoint:** `https://api.unhcr.org/population/v1/population/?year=2024&coa=TUR&limit=5`

**Response:**
```json
{
    "page": 1,
    "items": [
        {
            "year": 2024,
            "coo_id": "-",
            "coo_name": "-",
            "coo": "-",
            "coo_iso": "-",
            "coa_id": 196,
            "coa_name": "Türkiye",
            "coa": "TUR",
            "coa_iso": "TUR",
            "refugees": 2940735,
            "asylum_seekers": 154083,
            "returned_refugees": 159439,
            "idps": "0",
            "returned_idps": "0",
            "stateless": 420,
            "ooc": "0",
            "oip": "-",
            "hst": "0"
        }
    ]
}
```

**Geographic Data Available:** NO - Only country codes (ISO 3166), no coordinates.

---

## Test 2: United Kingdom (GBR) Population Data

**Endpoint:** `https://api.unhcr.org/population/v1/population/?year=2024&coa=GBR&limit=5`

**Response:**
```json
{
    "page": 1,
    "items": [
        {
            "year": 2024,
            "coo_id": "-",
            "coo_name": "-",
            "coo": "-",
            "coo_iso": "-",
            "coa_id": 70,
            "coa_name": "United Kingdom of Great Britain and Northern Ireland",
            "coa": "GBR",
            "coa_iso": "GBR",
            "refugees": 515677,
            "asylum_seekers": 124783,
            "returned_refugees": 6000,
            "idps": "0",
            "returned_idps": "0",
            "stateless": 4672,
            "ooc": 389,
            "oip": "-",
            "hst": "0"
        }
    ]
}
```

**Geographic Data Available:** NO - Only country codes, no coordinates.

---

## Test 3: API Root/Locations Endpoint

**Endpoint:** `https://api.unhcr.org/population/v1/`

**Response:**
```json
{
    "message": "Welcome to the API, you can find the documentation here.",
    "path": "http://api.unhcr.org/"
}
```

**Locations Endpoint (`/locations/`):** Does NOT exist - returns error.

---

## Additional Endpoints Tested

### Countries Endpoint
**Endpoint:** `https://api.unhcr.org/population/v1/countries/`

**Fields Available:**
- `id`, `code`, `iso`, `iso2`
- `name`, `nameOrigin`, `nameLong`, `nameShort`, `nameFormal`
- `nationality`
- `majorArea`, `region`
- French translations

**Geographic Data:** NO coordinates (latitude/longitude) provided.

### Regions Endpoint
**Endpoint:** `https://api.unhcr.org/population/v1/regions/`

**Response:** 6 UNHCR operational regions:
- Asia and the Pacific
- Eastern and Southern Africa
- Europe
- Middle East and North Africa
- The Americas
- West and Central Africa

**Geographic Data:** NO coordinates provided.

### Demographics Endpoint
**Endpoint:** `https://api.unhcr.org/population/v1/demographics/?year=2024&coa=TUR&limit=5`

**Fields:** Age/gender breakdown (f_0_4, f_5_11, m_0_4, etc.)

**Geographic Data:** NO coordinates provided.

### Asylum Applications Endpoint
**Endpoint:** `https://api.unhcr.org/population/v1/asylum-applications/`

**Fields:** Applied counts, procedure types, decision levels

**Geographic Data:** NO coordinates provided.

### Solutions Endpoint
**Endpoint:** `https://api.unhcr.org/population/v1/solutions/`

**Fields:** Returned refugees, resettlement, naturalization

**Geographic Data:** NO coordinates provided.

### Nowcasting Endpoint
**Endpoint:** `https://api.unhcr.org/population/v1/nowcasting/`

**Fields:** Estimated current refugee and asylum seeker counts

**Geographic Data:** NO coordinates provided.

---

## Data Fields Actually Available

The UNHCR API provides the following data types:

### Population Statistics
| Field | Description |
|-------|-------------|
| `year` | Year of data |
| `coo` / `coo_iso` | Country of Origin (ISO code) |
| `coa` / `coa_iso` | Country of Asylum (ISO code) |
| `coo_name` / `coa_name` | Country names |
| `refugees` | Number of refugees |
| `asylum_seekers` | Number of asylum seekers |
| `returned_refugees` | Number of returned refugees |
| `idps` | Internally Displaced Persons |
| `returned_idps` | Returned IDPs |
| `stateless` | Stateless persons |
| `ooc` | Others of Concern |
| `oip` | Other people in need of international protection |
| `hst` | Host community |

### Country Metadata
- Country codes (ISO 3166-1 alpha-2 and alpha-3)
- Country names (various formats)
- Major area (continent)
- Region (sub-region)
- Nationality

---

## Conclusion

### What IS Available:
1. Aggregate population counts by country
2. Country of origin to country of asylum flows
3. Demographic breakdowns (age/gender)
4. Asylum application statistics
5. Solutions data (resettlement, returns, naturalization)
6. Country metadata (names, regions, ISO codes)

### What is NOT Available:
1. **No geographic coordinates (latitude/longitude)**
2. No sub-national location data (cities, provinces, camps)
3. No camp-level data
4. No point-based geographic data

### Implication for the Project
To display UNHCR data on a map, you will need to:
1. Use the country ISO codes from the API
2. Obtain country centroid coordinates from a separate geographic dataset (e.g., Natural Earth, country centroids GeoJSON)
3. Join the UNHCR data with geographic data using ISO country codes as the key

### Alternative Data Sources for Geographic Refugee Data
- HDX (Humanitarian Data Exchange) - may have camp-level data
- UNHCR Operational Data Portal (different from this API)
- IOM DTM (Displacement Tracking Matrix)
- ACLED for conflict-related displacement with coordinates
