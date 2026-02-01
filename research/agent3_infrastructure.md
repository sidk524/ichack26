# Infrastructure Outage Data Sources - Agent 3 Research

## Focus: Turkey and UK Power/Internet/Infrastructure Outages

---

## 1. UK Power Outage APIs (WORKING)

### 1.1 National Grid Electricity Distribution - Live Power Cuts
**Status: WORKING - FREE - NO AUTH REQUIRED**

The National Grid provides real-time power outage data for England and Wales through their Connected Data Portal.

**Base URL:** `https://connecteddata.nationalgrid.co.uk`

**Endpoints:**

#### Live Power Cuts CSV (Simple)
```
GET https://connecteddata.nationalgrid.co.uk/dataset/d6672e1e-c684-4cea-bb78-c7e5248b62a2/resource/292f788f-4339-455b-8cc0-153e14509d4d/download/power_outage_ext.csv
```

**Response Format:** CSV
**Update Frequency:** Near real-time (updates every few minutes)
**Coverage:** All National Grid regions in UK

**Fields:**
| Field | Description |
|-------|-------------|
| Upload Date | Timestamp of data upload |
| Region | Geographic region (South West, South Wales, West Midlands, East Midlands, etc.) |
| Incident ID | Unique identifier for the outage |
| Confirmed Off | Number of confirmed customers without power |
| Predicted Off | Number of predicted customers without power |
| Restored | Number of customers restored |
| Status | Current status (In Progress, Awaiting, etc.) |
| Planned | Whether outage was planned (true/false) |
| Category | Type of fault (LV UNDERGROUND, HV OVERHEAD, LV FUSE, etc.) |
| Resource Status | COMP, ONS, DISP, SENT, UNASSIGNED |
| Start Time | When the outage started |
| ETR | Estimated Time of Restoration |
| Voltage | Voltage level (LV, HV) |
| Location Latitude | Latitude coordinate |
| Location Longitude | Longitude coordinate |
| Postcodes | Affected UK postcodes |

**Example Response (CSV):**
```csv
"Upload Date","Region","Incident ID","Confirmed Off","Predicted Off","Restored","Status","Planned","Category","Resource Status","Start Time","ETR","Voltage","Location Latitude","Location Longitude","Postcodes"
"2026-01-31T23:40:00","South West","INCD-84238-l","1","0","49","In Progress","false","LV ISOLATION","COMP","2026-01-31T11:06:00","2026-02-01T02:00:00","LV","50.54661","-4.135199","PL19 9AJ"
```

#### Live Detailed Power Cuts CSV
```
GET https://connecteddata.nationalgrid.co.uk/dataset/d6672e1e-c684-4cea-bb78-c7e5248b62a2/resource/a1365982-4e05-463c-8304-8323a2ba0ccd/download/live_detailed_power_cuts.csv
```

**Additional Fields in Detailed Version:**
| Field | Description |
|-------|-------------|
| number_of_psr_customers | Priority Services Register customers affected |
| number_of_psr_critical_customers | Critical PSR customers affected |
| planned_outage_start_date | Start of planned outage |
| planned_outage_end_date | End of planned outage |
| planned_outage_reason | Reason for planned work |
| date_of_reported_fault | When fault was reported |
| last_updated | Last update timestamp |
| date_of_restoration | When power was restored |

---

### 1.2 UK Power Networks Open Data Portal
**Status: WORKING - FREE - NO AUTH REQUIRED**

UK Power Networks (covers London, South East, and East of England) provides a comprehensive API.

**Base URL:** `https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets`

**Live Faults Endpoint:**
```
GET https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?limit=100
```

**Response Format:** JSON
**Update Frequency:** Near real-time

**Example Response:**
```json
{
  "total_count": 80,
  "results": [
    {
      "incidentreference": "INCD-18220-I",
      "powercuttype": "Restored",
      "creationdatetime": "2026-01-30T23:35:17",
      "nocallsreported": 14,
      "nocustomeraffected": 0,
      "postcodesaffected": "HA5 4",
      "fullpostcodedata": "HA54HF;HA54AF;HA54HE",
      "incidentcategorycustomerfriendlydescription": "A fault occurred on an underground electricity cable affecting the local area.",
      "incidentcategory": "47",
      "incidenttypename": "Restored",
      "statusid": 5,
      "restoreddatetime": "2026-01-31T19:45:29.087",
      "receiveddate": "2026-01-30T23:34:00",
      "mainmessage": "We are currently experiencing problems...",
      "geopoint": {"lon": -0.37196, "lat": 51.61256},
      "estimatedrestorationdate": null,
      "operatingzone": "PINNER"
    }
  ]
}
```

**Key Fields:**
| Field | Description |
|-------|-------------|
| incidentreference | Unique incident ID |
| powercuttype | Type: Unplanned, Planned, Restored |
| creationdatetime | When incident was created |
| nocallsreported | Number of customer calls |
| nocustomeraffected | Customers affected |
| postcodesaffected | Summary of postcodes |
| fullpostcodedata | Full list of postcodes (semicolon-separated) |
| incidentcategorycustomerfriendlydescription | Human-readable cause |
| geopoint | JSON with lat/lon coordinates |
| estimatedrestorationdate | ETR |
| operatingzone | Distribution zone name |

**Query Parameters:**
- `limit`: Number of records (max 100)
- `offset`: Pagination offset
- `where`: Filter expression (e.g., `powercuttype='Unplanned'`)

---

## 2. Internet Outage APIs

### 2.1 IODA (Internet Outage Detection and Analysis)
**Status: WORKING - FREE - NO AUTH REQUIRED**

IODA is run by Georgia Tech and provides internet connectivity monitoring at country, region, and ASN levels.

**Base URL:** `https://api.ioda.inetintel.cc.gatech.edu/v2`

**Get Signal Data for a Country:**
```
GET https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/{COUNTRY_CODE}?datasource={DATASOURCE}&from={UNIX_TIMESTAMP}&until={UNIX_TIMESTAMP}
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| COUNTRY_CODE | ISO 2-letter code (TR for Turkey, GB for UK) |
| datasource | bgp, ping-slash24, or merit-nt |
| from | Unix timestamp (seconds) |
| until | Unix timestamp (seconds) |

**Example - Turkey BGP Signal:**
```
GET https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/TR?datasource=bgp&from=1706745600&until=1706832000
```

**Example Response:**
```json
{
  "type": "signals",
  "metadata": {
    "requestTime": "2026-02-01T01:44:46+00:00",
    "responseTime": "2026-02-01T01:44:47+00:00"
  },
  "requestParameters": {
    "from": 1706745600,
    "until": 1706832000,
    "datasource": "bgp"
  },
  "data": [[{
    "entityType": "country",
    "entityCode": "TR",
    "entityName": "Turkey",
    "entityFqid": "geo.provider.EU.TR",
    "datasource": "bgp",
    "from": 1706745600,
    "until": 1706832000,
    "step": 300,
    "nativeStep": 300,
    "values": [62200, 62220, 62224, 62213, ...]
  }]]
}
```

**Example - UK BGP Signal:**
```
GET https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/GB?datasource=bgp&from=1706745600&until=1706832000
```

**Data Sources:**
| Datasource | Description |
|------------|-------------|
| bgp | Border Gateway Protocol visibility - number of /24 blocks visible |
| ping-slash24 | Active probing - responsive /24 blocks |
| merit-nt | Network telescope - unsolicited traffic |

**Understanding Values:**
- Values represent the number of /24 network blocks visible/responsive
- A sudden drop indicates a potential outage
- Stable values indicate normal connectivity
- Step of 300 = 5-minute intervals

---

## 3. Turkey Infrastructure Data Sources

### 3.1 EPIAS (Turkey Energy Exchange)
**Status: REQUIRES AUTHENTICATION (TGT Header)**

EPIAS provides Turkey electricity market data but requires registration.

**Base URL:** `https://seffaflik.epias.com.tr/electricity-service`

**Swagger Documentation:**
```
https://seffaflik.epias.com.tr/electricity-service/technical/tr/swagger.json
```

**Available Data (with authentication):**
- Consumer quantity/consumption data
- Demand forecast
- Generation data
- Market prices (Day-ahead, Intraday)
- Balancing power market data

**Authentication:**
Requires TGT (Ticket Granting Ticket) header obtained through EPIAS registration.

**Python Library Alternative:**
```python
# pip install eptr2
from eptr2 import EPTR2

eptr = EPTR2(username="YOUR_EMAIL", password="YOUR_PASSWORD")
res = eptr.call("mcp", start_date="2024-07-29", end_date="2024-07-29")
```

### 3.2 TEDAS Mobile App
Turkey's electricity distribution company (TEDAS) has a mobile app for reporting outages but no public API:
- App Name: Elektrik Ariza Ihbar
- Contact: bilgi@tedas.gov.tr
- Phone: +90 312 449 50 00

---

## 4. Enterprise/Commercial APIs (Require Subscription)

### 4.1 PowerOutage.us/PowerOutage.com
**Status: COMMERCIAL - ENTERPRISE PRICING**

Aggregates data from 800+ utilities across US, Canada, and UK.

**Coverage:**
- USA: 158,762,570 customers (94%)
- UK: 27,457,000 customers (89%)
- Canada: 17,076,161 customers (95%)

**Products:**
- Real-time API (10-minute refresh)
- Custom dashboards
- Historical data access
- GeoJSON shapes
- Email/SMS alerts

**Contact:** products@poweroutage.us

### 4.2 Gisual Power Outage Intelligence API
**Status: COMMERCIAL**

Power status validation API for telecom and enterprise use.

**Endpoint:**
```
POST /v10/intel
```

**Features:**
- Power status validation (validating power, power on, power off, power on - outage resolved)
- Address or lat/lon lookup
- Utility name and ETR included
- 5-minute polling recommended

### 4.3 Downdetector Explorer API
**Status: COMMERCIAL**

Crowdsourced outage data for internet, mobile, and services.

**Features:**
- Real-time problem reports
- Geographic heatmaps
- Historical data
- API integration

### 4.4 ThousandEyes Internet Insights API
**Status: COMMERCIAL (Cisco)**

```
GET https://api.thousandeyes.com/v7/internet-insights/outages/net/{outageId}
```

**Features:**
- ISP, cloud, CDN outage detection
- Network path analysis
- Requires Bearer token authentication

---

## 5. Free Monitoring Tools (No API)

### 5.1 GeoBlackout
- URL: https://geoblackout.com/uk
- Coverage: UK power and internet outages
- Features: Real-time map, user reports
- API: Not available

### 5.2 UK Power Cut Checker
- URL: https://ade-power.co.uk/uk-power-cut-checker/
- Coverage: All UK regions
- Features: Links to all DNO outage maps
- API: Not available (links to regional providers)

---

## 6. Water Infrastructure

### 6.1 Thames Water Open Data API
**Status: REQUIRES API KEY**

**Endpoints:**
```
GET https://data.thameswater.co.uk/api/water-usage/{region}
GET https://data.thameswater.co.uk/api/water-quality/{location}
GET https://data.thameswater.co.uk/api/service-disruptions/{area}
GET https://data.thameswater.co.uk/api/pumping-stations/{region}
```

**Authentication:**
Contact Thames Water support for API key.

### 6.2 USGS Water Services (US Only)
**Status: FREE - NO AUTH**

```
GET https://waterdata.usgs.gov/nwis/iv?site=SITE_ID&format=json
```

---

## 7. Recommended Integration Strategy

### For UK Power Outages:
1. **Primary:** National Grid CSV feeds (free, real-time, no auth)
2. **Secondary:** UK Power Networks API (free, JSON, no auth)
3. **Coverage gaps:** Consider PowerOutage.com commercial API

### For Turkey:
1. **Internet connectivity:** IODA API (free, works for Turkey)
2. **Power data:** EPIAS requires registration - consider Python library `eptr2`
3. **Local outages:** No public API available

### For Internet Outages (Both Countries):
1. **Primary:** IODA API (free, comprehensive)
2. **Commercial:** Downdetector Explorer or ThousandEyes

---

## 8. Code Examples

### Python - UK National Grid Power Outages
```python
import requests
import pandas as pd

url = "https://connecteddata.nationalgrid.co.uk/dataset/d6672e1e-c684-4cea-bb78-c7e5248b62a2/resource/292f788f-4339-455b-8cc0-153e14509d4d/download/power_outage_ext.csv"

df = pd.read_csv(url)
print(f"Total active outages: {len(df)}")
print(f"Customers affected: {df['Confirmed Off'].sum()}")
```

### Python - UK Power Networks API
```python
import requests

url = "https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records"
params = {"limit": 100, "where": "powercuttype='Unplanned'"}

response = requests.get(url, params=params)
data = response.json()

for incident in data['results']:
    print(f"{incident['incidentreference']}: {incident['postcodesaffected']} - {incident['nocustomeraffected']} affected")
```

### Python - IODA Internet Outages
```python
import requests
import time

def get_internet_connectivity(country_code, hours_back=24):
    now = int(time.time())
    from_ts = now - (hours_back * 3600)

    url = f"https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country/{country_code}"
    params = {
        "datasource": "bgp",
        "from": from_ts,
        "until": now
    }

    response = requests.get(url, params=params)
    data = response.json()

    if data['data'] and data['data'][0]:
        signal = data['data'][0][0]
        values = signal['values']
        avg = sum(values) / len(values)
        min_val = min(values)

        print(f"Country: {signal['entityName']}")
        print(f"Average visibility: {avg:.0f} /24 blocks")
        print(f"Minimum visibility: {min_val} /24 blocks")
        print(f"Potential outage: {min_val < avg * 0.9}")

    return data

# Check Turkey
get_internet_connectivity("TR")

# Check UK
get_internet_connectivity("GB")
```

---

## 9. Summary Table

| Data Type | Region | API | Auth Required | Real-time | Free |
|-----------|--------|-----|---------------|-----------|------|
| Power Outages | UK (Eng/Wales) | National Grid CSV | No | Yes | Yes |
| Power Outages | UK (London/SE/E) | UK Power Networks | No | Yes | Yes |
| Internet | Turkey | IODA | No | Yes | Yes |
| Internet | UK | IODA | No | Yes | Yes |
| Power/Market | Turkey | EPIAS | Yes (TGT) | Yes | Yes* |
| Power | US/UK/CA | PowerOutage.us | Yes | Yes | No |
| Internet | Global | Downdetector | Yes | Yes | No |
| Power Status | US | Gisual | Yes | Yes | No |

*Free after registration

---

## 10. Data Refresh Rates

| Source | Update Frequency |
|--------|-----------------|
| National Grid CSV | 2-5 minutes |
| UK Power Networks API | Real-time |
| IODA Signals | 5 minutes (step=300) |
| EPIAS | Varies by endpoint |
| PowerOutage.us | 10 minutes |

---

*Research completed: 2026-02-01*
*Agent 3 - Infrastructure Outages Focus*
