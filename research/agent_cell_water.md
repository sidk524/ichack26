# Cell Service and Water Outage APIs Research

**Research Date:** 2026-02-01

---

## Executive Summary

This document contains research findings on APIs for cell/mobile network outages and water utility outages, focusing on UK and Turkey. Most outage data is either behind commercial APIs (Downdetector Enterprise) or requires web scraping. Water utilities in the UK have better open data initiatives than telecom, while Turkey has limited public API access for both sectors.

---

## 1. Cell Service / Mobile Network Outage APIs

### 1.1 Downdetector (Ookla)

**Status:** Commercial API - Enterprise Only

**Description:** The leading crowd-sourced outage detection platform, monitoring 12,000+ services in 45 countries.

**API Access:**
- **Downdetector Explorer (Enterprise):** Commercial API with real-time outage data
- **Pricing:** Contact sales (enterprise pricing)
- **Features:** Real-time alerts, geographic heatmaps, historical data, API integration
- **Documentation:** https://downdetector.com/for-business/

**Unofficial API (Open Source):**
```javascript
// NPM Package: downdetector-api
const { downdetector } = require('downdetector-api');

// Example usage
const response = await downdetector('vodafone', 'co.uk');
// Returns: { reports: [...], baseline: [...] }
```
- **GitHub:** https://github.com/DavideViolante/downdetector-api
- **Warning:** May be blocked by Cloudflare protection
- **Sample Response:**
```json
{
  "reports": [
    { "date": "2021-02-21T20:16:06+00:00", "value": 17 },
    { "date": "2021-02-21T20:31:06+00:00", "value": 16 }
  ],
  "baseline": [
    { "date": "2021-02-21T20:16:06+00:00", "value": 1 }
  ]
}
```

### 1.2 Ookla Cell Maps API

**Status:** Commercial API with Rate-Limited Public Tier

**Base URL:** `https://api.cellmaps.com`

**Endpoints:**
```
GET /coverage/availability?lat={lat}&lng={lng}&key={api_key}&responseType=json
```

**Parameters:**
- `lat`: Latitude (decimal degrees, WGS 84)
- `lng`: Longitude (decimal degrees, WGS 84)
- `responseType`: json or xml

**Sample Response:**
```json
{
  "results": [{
    "layers": ["na_evdo", "na_hspa", "us_lte"],
    "lat": 35.12252,
    "lng": -89.91144
  }]
}
```

**Coverage Layers:**
- Global HSPA
- Global EVDO
- Global LTE
- Global WIMAX

**Access:** API key required (contact Ookla)
**Documentation:** https://www.ookla.com/cell-maps/cell-maps-api

### 1.3 OpenSignal API

**Status:** Commercial / Partner API

**Base URL:** `http://api.opensignal.com/v3/`

**Features:**
- Network stats by location
- Signal strength data
- Network type filtering (2G, 3G, 4G)

**Sample Request (Ruby wrapper):**
```ruby
mobile_signal_fetcher = MobileSignalFetcher.new(
  lat: 50.7136820,
  lng: -3.5443600,
  distance: 1,
  network_type: 3
)
network_stats = mobile_signal_fetcher.network_stats
```

**Access:** API key required (partner/enterprise)
**GitHub Wrapper:** https://github.com/ChuckJHardy/MobileSignalFetcher

### 1.4 Cisco ThousandEyes Internet Insights API

**Status:** Commercial API

**Base URL:** `https://api.thousandeyes.com/v7/`

**Endpoint:**
```
GET /internet-insights/outages/net/{outageId}
```

**Sample Response Fields:**
- `outageId`: Unique outage identifier
- `providerName`: Affected provider name (e.g., "Rackspace")
- `providerType`: Type (IAAS, ISP, etc.)
- `networkName`: Affected network
- `asn`: AS Number
- `startDate`: Outage start time (epoch)
- `endDate`: Outage end time (epoch)
- `duration`: Duration in seconds
- `affectedLocations`: List of affected locations

**Authentication:** Bearer token required
**Documentation:** https://developer.cisco.com/docs/thousandeyes/

### 1.5 BT Outage Analytics API

**Status:** Commercial API (BT Customers Only)

**Description:** Provides hourly outage data for BT's GeoMND network at UK level.

**Access:** Account manager approval required
**Portal:** https://developer.bt.com/products/outage-analytics

### 1.6 Catchpoint Internet Sonar

**Status:** Commercial with Free Limited Map

**Features:**
- AI-powered outage detection
- Global ISP, CDN, SaaS monitoring
- API access for enterprise

**Free Access:** Live outages map (limited, no API)
**Website:** https://www.catchpoint.com/outages

### 1.7 Metricell Network Status APIs

**Status:** Commercial (Telecom Operators)

**Description:** Coverage checker APIs for operators, reduces network-related calls by 40%.

**Website:** https://www.metricell.com/network-status-coverage-apis

---

## 2. UK Mobile Carrier Status Pages

### Vodafone UK
- **Status Checker:** https://www.vodafone.co.uk/network/status-checker
- **API:** No public API
- **Data:** Postcode-based status, planned maintenance, faults

### EE (BT)
- **Status Page:** https://ee.co.uk/help/network/network-status
- **API:** No public API

### O2
- **Status Page:** https://status.o2.co.uk
- **API:** No public API

### Three UK
- **Status Page:** https://www.three.co.uk/support/network-and-coverage
- **API:** No public API

### Ofcom Coverage Checker
- **Website:** https://www.ofcom.org.uk/phones-telecoms-and-internet/coverage
- **Description:** Aggregated coverage data from all UK operators
- **API:** No public API

---

## 3. Turkey Mobile Network Data

### 3.1 Turkey ISP Planning API (Unofficial)

**Status:** Open Source / Community API

**Base URL:** `https://planningoperationapi-wen7okua.b4a.run/`

**Endpoints:**
```
GET /turknet      - Turknet planned maintenance
GET /turktelekom  - Turk Telekom planned maintenance
GET /turkcell     - Turkcell planned maintenance (limited availability)
GET /gibir        - Gibir planned maintenance
GET /healthCheck  - API health status
```

**Source:** https://github.com/ramazansancar/planningListApi

**Note:** Turkcell endpoint not available 24/7 due to API restrictions

### 3.2 Turkish Carriers (No Public APIs)

**Turkcell:**
- Website: https://www.turkcell.com.tr
- No public outage API

**Vodafone Turkey:**
- Website: https://www.vodafone.com.tr
- No public outage API

**Turk Telekom:**
- Website: https://www.turktelekom.com.tr
- Maintenance data available via unofficial API above

---

## 4. Water Outage APIs

### 4.1 Thames Water API

**Status:** API Key Required (Free Registration)

**Portal:** https://data.thameswater.co.uk

**Registration:** https://data.thameswater.co.uk/s/login/SelfRegister

**Main API Endpoint:**
```
GET https://prod-tw-opendata-app.uk-e1.cloudhub.io/data/STE/v1/DischargeCurrentStatus
Headers:
  Content-Type: application/json
  client_id: YOUR_CLIENT_ID
  client_secret: YOUR_CLIENT_SECRET
```

**Sample Response (Storm Discharge Status):**
```json
{
  "meta": {
    "publisher": "Thames Water Utilities Limited",
    "licence": "https://data.thameswater.co.uk/s/terms-of-service",
    "version": "1.0.2"
  },
  "items": [{
    "LocationName": "Thame",
    "PermitNumber": "CTCR.1158",
    "LocationGridRef": "SP71150683",
    "X": 471150,
    "Y": 206830,
    "ReceivingWaterCourse": "Lashlake Stream",
    "AlertStatus": "Discharging",
    "StatusChange": "2023-01-13T18:15:00",
    "AlertPast48Hours": true,
    "MostRecentDischargeAlertStart": "2023-01-13T18:15:00",
    "MostRecentDischargeAlertStop": null
  }]
}
```

**Available Data:**
- Storm discharge current status
- Service incidents
- Problem reportage map
- Annual discharge reports

**Network Latest (Web Page):**
- URL: https://www.thameswater.co.uk/network-latest
- Shows current repairs, planned works, incidents

### 4.2 UK Water Sector Stream Platform

**Status:** Sector-Wide Open Data Initiative

**Website:** https://stream.water.data.gov.uk (when available)

**Description:** Industry-wide platform for sharing water data openly.

**Participating Companies:**
- Severn Trent Water
- Yorkshire Water
- Thames Water
- Anglian Water
- Southern Water
- And others

### 4.3 Yorkshire Water Open Data

**Status:** Available via Datamill North

**Portal:** https://datamillnorth.org (search for Yorkshire Water)

**Data Types:**
- Weekly water situation reports (Watsit)
- Acoustic monitoring data (planned)
- Open data releases

**Incidents Map:** https://www.yorkshirewater.com/your-water/view-report-problems/

### 4.4 Severn Trent Water

**Status:** Open Data Strategy Published

**Website:** https://www.stwater.co.uk/about-us/open-data-strategy/

**Data Available:**
- Environmental performance data
- Storm overflow EDM data
- Via Stream platform

### 4.5 United Utilities

**Status:** Web-Based Status Checker

**Check Area Tool:** https://www.unitedutilities.com/help-and-support/your-water-supply/

**Features:**
- "Up My Street" area checker
- SMS alerts for water outages (property owners)
- No public API

### 4.6 South East Water

**Open Data Portal:** https://www.opendata.southeastwater.co.uk/datasets/

**Data Types:**
- Annual Performance Report data
- Various operational datasets

---

## 5. Turkey Water Utilities

### 5.1 ISKI (Istanbul Water)

**Status:** Mobile App / No Public API

**Website:** https://iski.istanbul

**Mobile App Features:**
- Dam occupancy rate
- Failure/outage information
- Malfunction reporting
- Subscription operations

**Android App:** https://play.google.com/store/apps/details?id=istanbul.iski.mobil

**Outage Page:** https://iski.istanbul/abone-hizmetleri/ariza-kesinti

**API Access:** Not publicly available (app uses internal APIs)

### 5.2 Other Turkish Water Utilities

**ASKI (Ankara):**
- Website: https://www.aski.gov.tr
- No public API

**IZSU (Izmir):**
- Website: https://www.izsu.gov.tr
- No public API

**BUSKI (Bursa):**
- Website: https://www.buski.gov.tr
- No public API

---

## 6. Third-Party Aggregators

### 6.1 Gisual (Power/Utility Outage API)

**Status:** Commercial API

**Description:** Real-time power outage data for telecom NOCs

**Features:**
- Power outage verification
- NOC integration
- ServiceNow, SolarWinds integration

**Website:** https://www.gisual.com

### 6.2 UpDownSignal

**Status:** Free Crowd-Sourced Platform

**Website:** https://updownsignal.com

**Features:**
- US-focused service tracking
- Real-time outage map
- Covers telecoms, utilities, finance

### 6.3 Outages.co.uk

**Status:** Free Crowd-Sourced (UK)

**Website:** https://outages.co.uk

**Features:**
- UK service outage reports
- User comments
- No API

---

## 7. Regulatory Sources

### 7.1 Ofcom (UK)

**Role:** UK communications regulator

**Reporting Requirements:**
- Major network outages must be reported to Ofcom
- Annual Connected Nations report with resilience data

**Relevant Links:**
- https://www.ofcom.org.uk
- Connected Nations report (annual)

### 7.2 BTK (Turkey)

**Role:** Turkish telecom regulator

**Website:** https://www.btk.gov.tr

**Public Data:** Limited public outage data

---

## 8. Summary & Recommendations

### Best Options for Cell Service Outages:

| Source | Access | Coverage | Real-time |
|--------|--------|----------|-----------|
| Downdetector Unofficial API | Free (unreliable) | Global | Yes |
| Downdetector Enterprise | Paid | Global | Yes |
| Cisco ThousandEyes | Paid | Global | Yes |
| Carrier Status Pages | Free (scraping) | UK/Turkey | Yes |
| Turkey ISP Planning API | Free | Turkey | Limited |

### Best Options for Water Outages:

| Source | Access | Coverage | Real-time |
|--------|--------|----------|-----------|
| Thames Water API | Free (key required) | London/SE England | Yes |
| Yorkshire Water Open Data | Free | Yorkshire | Periodic |
| Stream Platform | Free | UK (multi-company) | Varies |
| ISKI App (scraping) | N/A | Istanbul | Yes |

### Recommended Approach:

1. **UK Cell Service:**
   - Use Downdetector unofficial API with fallback
   - Scrape carrier status pages as backup
   - Consider enterprise API for reliability

2. **Turkey Cell Service:**
   - Use Turkey ISP Planning API for Turknet/Turk Telekom
   - Web scraping for Turkcell/Vodafone

3. **UK Water:**
   - Register for Thames Water API (free)
   - Monitor Stream platform for additional data
   - Scrape carrier status pages

4. **Turkey Water:**
   - Web scraping ISKI outage page
   - Mobile app traffic interception (advanced)

---

## 9. API Endpoints Quick Reference

```yaml
# Cell Service APIs
downdetector_unofficial:
  npm: "downdetector-api"
  example: "await downdetector('vodafone', 'co.uk')"

ookla_cellmaps:
  base: "https://api.cellmaps.com"
  endpoint: "/coverage/availability"
  auth: "API key required"

thousandeyes:
  base: "https://api.thousandeyes.com/v7"
  endpoint: "/internet-insights/outages/net/{outageId}"
  auth: "Bearer token"

turkey_isp:
  base: "https://planningoperationapi-wen7okua.b4a.run"
  endpoints:
    - "/turknet"
    - "/turktelekom"
    - "/turkcell"

# Water APIs
thames_water:
  base: "https://prod-tw-opendata-app.uk-e1.cloudhub.io"
  endpoint: "/data/STE/v1/DischargeCurrentStatus"
  auth: "client_id + client_secret headers"
  registration: "https://data.thameswater.co.uk/s/login/SelfRegister"

yorkshire_water:
  portal: "https://datamillnorth.org"
  type: "CSV/JSON downloads"

iski_istanbul:
  web_page: "https://iski.istanbul/abone-hizmetleri/ariza-kesinti"
  type: "Web scraping required"
```

---

## 10. Testing Results

### Tested Endpoints:

| Endpoint | Status | Notes |
|----------|--------|-------|
| Thames Water CKAN API | Requires Login | Redirects to auth |
| Thames Water Discharge API | Auth Required | Returns "Authentication denied" |
| Turkey ISP Planning API | Timeout | May be rate limited |
| Ookla Cell Maps | Unauthorized | API key required |
| ISKI Istanbul | HTML Response | Web scraping viable |

---

*Research compiled for ichack26 project*
