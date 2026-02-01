# UK Power Networks API Test Results

**Test Date:** 2026-02-01
**Status:** SUCCESS - API returns latitude/longitude coordinates

## API Endpoint

**Base URL:** `https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/`

**Live Faults Dataset:** `ukpn-live-faults`

## Test Commands Run

### 1. Fetch Live Faults Records
```bash
curl -s "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?limit=5" | python3 -m json.tool
```

### 2. List Available Datasets
```bash
curl -s "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/" | python3 -m json.tool
```

## Results

### Dataset Discovery
- Total datasets available: **133**
- Key dataset found: **`ukpn-live-faults`** - Live power cut/fault data with geo coordinates
- Note: The originally requested `ukpn-disruption-report` dataset does NOT exist

### Coordinate Verification: CONFIRMED

The `ukpn-live-faults` dataset contains a `geopoint` field with `lat` and `lon` values.

#### Sample Records with ACTUAL Coordinates

| Incident Reference | Power Cut Type | Location | Latitude | Longitude | Customers Affected | Operating Zone |
|-------------------|----------------|----------|----------|-----------|-------------------|----------------|
| INCD-18220-I | Restored | HA5 4 | **51.61256** | **-0.37196** | 0 | PINNER |
| INCD-432960-G | Restored | BR6 9 | **51.36638** | **0.0948** | 0 | West Kent Zone |
| INCD-581884-Z | Restored | SG19 1 | **52.13552** | **-0.30458** | 0 | BEDFORD |
| INCD-99331-V | Restored | TN38 8 | **50.87236** | **0.52444** | 0 | East Sussex Zone |
| INCD-434069-G | Unplanned | TN39 3 | **50.8397** | **0.44924** | 1 | East Sussex Zone |
| INCD-434127-G | Unplanned | KT21 2 | **51.31044** | **-0.31148** | 0 | Kingston Zone |
| INCD-99351-V | Unplanned | CT6 8 | **51.36699** | **1.09896** | 0 | East Kent Zone |
| INCD-434131-G | Unplanned | BN17 5/6 | **50.81147** | **-0.53211** | 34 | Brighton Zone |
| INCD-434132-G | Unplanned | TN18/TN19/TN32 | **51.00392** | **0.41837** | 0 | East Sussex Zone |
| INCD-400984-J | Unplanned | DA15 9/DA16 2 | **51.44283** | **0.10648** | 1 | SOUTH EAST |

### Field Structure for Geo Data

```json
"geopoint": {
    "lon": -0.37196,
    "lat": 51.61256
}
```

**Field Type:** `geo_point_2d`

### Important Notes

1. **Some records have `geopoint: null`** - Not all faults have coordinates immediately available
2. **Coordinates are aggregated from postcode data** - For privacy, individual customer locations are not exposed
3. **Data is near real-time** - Updated continuously from UK Power Networks' ADMS system
4. **Coverage Area:** Eastern, London, and South Eastern Power Networks (EPN, LPN, SPN)

### Bounding Box (Coverage Area)

```json
{
    "westbound": -0.6039200630038977,
    "eastbound": 1.7280999943614006,
    "southbound": 50.80895997583866,
    "northbound": 52.706809979863465
}
```

## Full Record Schema

| Field | Type | Description |
|-------|------|-------------|
| incidentreference | text | Unique incident ID |
| powercuttype | text | "Planned", "Unplanned", or "Restored" |
| creationdatetime | text | When incident was created |
| nocallsreported | int | Number of calls received |
| nocustomeraffected | int | Number of customers affected |
| postcodesaffected | text | Affected postcode sectors |
| fullpostcodedata | text | Complete postcodes (semicolon-separated) |
| incidentcategorycustomerfriendlydescription | text | Human-readable description |
| incidentcategory | text | Category code |
| incidenttypename | text | Type name |
| statusid | int | Status code |
| restoreddatetime | text | When power was restored |
| receiveddate | text | When fault was reported |
| mainmessage | text | Customer message |
| **geopoint** | **geo_point_2d** | **Latitude/Longitude coordinates** |
| estimatedrestorationdate | text | ETA for restoration |
| operatingzone | text | UK Power Networks zone |

## API Query Examples

### Get All Live Faults
```bash
curl -s "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?limit=100"
```

### Get Only Unplanned (Active) Faults
```bash
curl -s "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?where=powercuttype%3D%27Unplanned%27&limit=100"
```

### Get Only Faults with Coordinates
```bash
curl -s "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?where=geopoint%20is%20not%20null&limit=100"
```

### Get Faults in Specific Area (Bounding Box)
```bash
curl -s "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?where=within_distance(geopoint,%20geom'POINT(-0.1278%2051.5074)',%2050km)&limit=100"
```

## Current Stats (as of test time)

- **Total Records:** 79
- **Unplanned (Active) Faults:** 18
- **License:** CC BY 4.0

## Conclusion

**The UK Power Networks API SUCCESSFULLY provides latitude and longitude coordinates** via the `geopoint` field in the `ukpn-live-faults` dataset. This data can be used to map power outages in real-time across the UK Power Networks coverage area (Eastern England, London, and South East England).
