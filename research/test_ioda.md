# IODA Internet Outages API - Test Results

**Test Date:** 2026-02-01
**API Base URL:** https://api.ioda.inetintel.cc.gatech.edu/v2/

## Summary

The IODA (Internet Outage Detection and Analysis) API provides comprehensive internet outage data at country, region, and ASN levels. **However, coordinates/boundaries are NOT directly available in the API responses** - location data is provided as named regions and country codes that would need to be geocoded separately.

---

## Test 1: Country-Level Signal Data (Turkey)

**Endpoint:** `/v2/signals/raw/country/TR?from=1706745600&until=1706832000`

**Result:** SUCCESS

**Response Structure:**
```json
{
  "entityType": "country",
  "entityCode": "TR",
  "entityName": "Turkey",
  "entityFqid": "geo.provider.EU.TR",
  "datasource": "gtr",
  "subtype": "WEB_SEARCH",
  "from": 1706745600,
  "until": 1706832000,
  "step": 1800,
  "nativeStep": 1800,
  "values": [955040520, 761764750, ...]
}
```

**Available Data Sources:**
- `gtr` - Google Transparency Report (raw)
- `gtr-sarima` - GTR with SARIMA anomaly detection
- `gtr-norm` - GTR normalized (0-1 scale)
- `merit-nt` - Merit Network Telescope
- `bgp` - BGP visibility
- `ping-slash24` - Active probing
- `ping-slash24-loss` - Packet loss rates
- `ping-slash24-latency` - Latency measurements
- `mozilla` - Mozilla telemetry

**Location Data:** Only country code (`TR`) and name (`Turkey`) - NO coordinates or boundaries.

---

## Test 2: Country-Level Signal Data (UK)

**Endpoint:** `/v2/signals/raw/country/GB?from=1706745600&until=1706832000`

**Result:** SUCCESS

Same structure as Turkey. Entity info:
- `entityCode`: "GB"
- `entityName`: "United Kingdom"
- `entityFqid`: "geo.provider.EU.GB"

---

## Test 3: Region-Level Data

**Endpoint:** `/v2/entities/query?entityType=region&relatedTo=country/TR`

**Result:** SUCCESS - 83 regions found for Turkey

**Sample Region Data:**
```json
{
  "code": "4107",
  "name": "Izmir",
  "type": "region",
  "subnames": [],
  "attrs": {
    "fqid": "geo.netacuity.EU.TR.4107",
    "country_code": "TR",
    "country_name": "Turkey",
    "ne_region_id": "2230"
  }
}
```

**Key Finding:** Regions have `ne_region_id` attribute which likely references Natural Earth region IDs - this could be used for geocoding but coordinates are NOT included in the API response.

**Region Signal Data Endpoint:** `/v2/signals/raw/region/{region_code}`
- Example: `/v2/signals/raw/region/4107` returns signal data for Izmir

---

## Test 4: Outage Events

**Endpoint:** `/v2/outages/events?from=1706745600&until=1706832000&entityType=country`

**Result:** SUCCESS

**Response Structure:**
```json
{
  "location": "country/CF",
  "start": 1706692200,
  "duration": 1209600,
  "method": "median",
  "datasource": "bgp",
  "status": 0,
  "score": 69517.24,
  "location_name": "Central African Republic",
  "overlaps_window": true
}
```

**Key Fields:**
- `location` - Entity identifier (e.g., "country/CF", "region/4155")
- `start` - Unix timestamp of outage start
- `duration` - Duration in seconds
- `score` - Severity score
- `datasource` - Detection source (bgp, ping-slash24, etc.)
- `location_name` - Human-readable name

---

## Test 5: Region Outage Events (Turkey)

**Endpoint:** `/v2/outages/events?from=1706745600&until=1706832000&entityType=region&relatedTo=country/TR`

**Result:** SUCCESS

Sample outages found:
1. Bitlis (region/4155) - BGP median, score: 51692
2. Denizli (region/4124) - ping-slash24, score: 1210
3. Denizli (region/4124) - BGP, score: 639

---

## Test 6: ASN Data

**Endpoint:** `/v2/entities/query?entityType=asn&relatedTo=country/TR&limit=5`

**Result:** SUCCESS

**Sample ASN Data:**
```json
{
  "code": "9074",
  "name": "AS9074 (KOCSISTEM)",
  "type": "asn",
  "attrs": {
    "fqid": "asn.9074",
    "ip_count": "3328",
    "name": "KOCSISTEM",
    "org": "KOC SISTEM BILGI VE ILETISIM HIZMETLERI ANONIM SIRKETI"
  }
}
```

---

## Test 7: Topographic Endpoint

**Endpoint:** `/v2/topo/country` and `/v2/topo/region`

**Result:** Data returned but appears to be compressed/binary (likely GeoJSON or TopoJSON compressed format)

---

## Coordinate/Location Data Availability

### What IS Available:
1. **Country codes** (ISO 2-letter codes: TR, GB, US, etc.)
2. **Country names** (Turkey, United Kingdom, etc.)
3. **Region names** (Izmir, Denizli, Bitlis, etc.)
4. **Region codes** (4107, 4124, etc.)
5. **Natural Earth region IDs** (`ne_region_id` attribute)
6. **ASN information** with organization names

### What is NOT Available:
1. **Geographic coordinates** (latitude/longitude)
2. **Bounding boxes**
3. **GeoJSON boundaries** (topo endpoint returns compressed data)
4. **Centroid points**

### Recommendation for Geocoding:
To display IODA data on a map, you need to:
1. Use the `ne_region_id` to match against Natural Earth shapefiles
2. Or use a geocoding service to convert region/country names to coordinates
3. Or maintain a local mapping of IODA region codes to coordinates

---

## API Rate Limits & Notes

- API is free and publicly accessible
- No authentication required
- Response times: ~1-2 seconds for signal data
- Data granularity: 30-minute intervals (step: 1800 seconds)
- Historical data available (tested timestamps from early 2024)
- Copyright: Georgia Tech Research Corporation

---

## Useful Endpoints Summary

| Endpoint | Description |
|----------|-------------|
| `/v2/signals/raw/{entityType}/{entityCode}` | Time-series signal data |
| `/v2/entities/query` | Entity metadata lookup |
| `/v2/outages/events` | Detected outage events |
| `/v2/outages/alerts` | Raw outage alerts |
| `/v2/outages/summary` | Aggregated outage summaries |
| `/v2/datasources/` | Available data sources |
| `/v2/topo/{entityType}` | Topographic data (compressed) |

---

## Example API Calls

```bash
# Get country signal data
curl "https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/TR?from=1706745600&until=1706832000"

# List regions in a country
curl "https://api.ioda.inetintel.cc.gatech.edu/v2/entities/query?entityType=region&relatedTo=country/TR"

# Get outage events
curl "https://api.ioda.inetintel.cc.gatech.edu/v2/outages/events?from=1706745600&until=1706832000&entityType=country"

# Get region signal data
curl "https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/region/4107?from=1706745600&until=1706832000"
```
