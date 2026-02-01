# GDACS Disasters API Test Results

**Test Date:** 2026-02-01
**Test Status:** PASSED

## Summary

The GDACS (Global Disaster Alert and Coordination System) API provides disaster event data with **latitude/longitude coordinates**.

### API Endpoints Tested

| Endpoint | Status | Notes |
|----------|--------|-------|
| `https://www.gdacs.org/gdacsapi/api/events/geteventlist/EQ` | 404 Not Found | API endpoint deprecated |
| `https://www.gdacs.org/gdacsapi/api/events/geteventlist/FL` | 404 Not Found | API endpoint deprecated |
| `https://www.gdacs.org/gdacsapi/api/events/geteventlist/TC` | 404 Not Found | API endpoint deprecated |
| `https://www.gdacs.org/xml/rss.xml` | **WORKING** | Main RSS feed with all events |

### Working Endpoint

The **recommended endpoint** is the GeoRSS XML feed:
```
https://www.gdacs.org/xml/rss.xml
```

This feed returns all disaster types and includes coordinate data in multiple formats.

---

## Coordinate Verification: CONFIRMED

Events include coordinates in **three formats**:

1. **geo:Point** - Separate lat/lon elements
   ```xml
   <geo:Point>
     <geo:lat>-21.019</geo:lat>
     <geo:long>-174.1337</geo:long>
   </geo:Point>
   ```

2. **georss:point** - Combined lat/lon string
   ```xml
   <georss:point>-21.019 -174.1337</georss:point>
   ```

3. **gdacs:bbox** - Bounding box (lonmin lonmax latmin latmax)
   ```xml
   <gdacs:bbox>-178.1337 -170.1337 -25.019 -17.019</gdacs:bbox>
   ```

---

## Actual Coordinate Examples by Event Type

### Earthquakes (EQ)

| Event | Country | Latitude | Longitude | Severity |
|-------|---------|----------|-----------|----------|
| EQ 1522330 | Tonga | **-21.019** | **-174.1337** | Magnitude 5.8M, Depth:12km |
| EQ 1521905 | South Sandwich Islands | **-57.8373** | **-25.4819** | Magnitude 6M, Depth:68.1km |
| EQ 1521719 | Philippines | **6.5738** | **123.6966** | Magnitude 5.6M, Depth:10km |

### Floods (FL)

| Event | Country | Latitude | Longitude |
|-------|---------|----------|-----------|
| FL 1103744 | Syria | **36.19924** | **37.1637253** |
| FL 1103745 | United Kingdom | **50.75** | **-3.75** |
| FL 1103742 | Australia | **-18.928443** | **145.0078023** |

### Tropical Cyclones (TC)

| Event | Country | Latitude | Longitude | Severity |
|-------|---------|----------|-----------|----------|
| TC FYTIA-26 (1001254) | Madagascar | **-17.99** | **47.4** | Moderate Tropical Storm (74 km/h) |
| TC EIGHTEEN-26 (1001253) | Open Ocean | **-26.9** | **171.9** | Tropical Storm (65 km/h) |

### Wildfires (WF)

| Event | Country | Latitude | Longitude | Area |
|-------|---------|----------|-----------|------|
| WF 1027292 | Senegal | **13.009389** | **-13.110463** | 7105 ha |
| WF 1027293 | Cote d'Ivoire | **7.983968** | **-7.239649** | 6945 ha |
| WF 1027274 | Sudan | **5.584792** | **33.073044** | 5267 ha |

### Volcanic Activity (VO)

| Event | Country | Latitude | Longitude |
|-------|---------|----------|-----------|
| Sheveluch (1000135) | Russia | **56.653** | **161.36** |

---

## Event Count in Current Feed

| Event Type | Count | Description |
|------------|-------|-------------|
| EQ | 4 | Earthquakes |
| FL | 12 | Floods |
| TC | 2 | Tropical Cyclones |
| WF | 150 | Wildfires |
| VO | 1 | Volcanic Activity |
| DR | 13 | Drought |
| **Total** | **182** | All events |

---

## Data Fields Available

Each event in the RSS feed includes:

- `title` - Event description
- `gdacs:eventid` - Unique event identifier
- `gdacs:eventtype` - Event type code (EQ, FL, TC, WF, VO, DR)
- `gdacs:alertlevel` - Alert level (Green, Orange, Red)
- `gdacs:country` - Affected country
- `gdacs:iso3` - ISO 3166-1 alpha-3 country code
- `geo:lat` / `geo:long` - Coordinates
- `georss:point` - Combined coordinates
- `gdacs:bbox` - Bounding box
- `gdacs:severity` - Event severity details
- `gdacs:population` - Affected population
- `gdacs:fromdate` / `gdacs:todate` - Event time range
- `link` - URL to detailed report

---

## Integration Recommendations

### Python Parsing Example

```python
import requests
import xml.etree.ElementTree as ET

# Fetch GDACS RSS feed
response = requests.get('https://www.gdacs.org/xml/rss.xml')
root = ET.fromstring(response.content)

# Define namespaces
ns = {
    'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#',
    'gdacs': 'http://www.gdacs.org',
    'georss': 'http://www.georss.org/georss'
}

# Extract events with coordinates
for item in root.findall('.//item'):
    event_type = item.find('gdacs:eventtype', ns).text
    lat = item.find('geo:Point/geo:lat', ns).text
    lon = item.find('geo:Point/geo:long', ns).text
    country = item.find('gdacs:country', ns).text
    print(f"{event_type}: {country} at ({lat}, {lon})")
```

---

## Conclusion

**GDACS RSS Feed provides reliable coordinate data for all disaster types.**

- Coordinates are available in both separate (geo:lat, geo:long) and combined (georss:point) formats
- All major disaster types tested (EQ, FL, TC) include valid latitude/longitude values
- The main RSS feed (`/xml/rss.xml`) is the recommended data source
- The REST API endpoints (`/gdacsapi/...`) appear to be deprecated or unavailable
