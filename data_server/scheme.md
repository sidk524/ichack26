# Data Server API Schema

## Overview

This document describes all available GET endpoints for retrieving data from the disaster response system's SQLite database. The data server exposes real-time and historical data including user information, location tracking, emergency calls, news articles, and sensor readings.

**Base URL:** `http://localhost:8080` (development) or your deployed server URL

**Response Format:** All endpoints return JSON with an `ok` field indicating success/failure.

---

## User Data Endpoints

### Get All Users
**Endpoint:** `GET /api/users`

**Description:** Retrieves all users with their complete location history and emergency call transcripts.

**Usage:**
```bash
curl http://localhost:8080/api/users
```

**Response Format:**
```json
{
  "ok": true,
  "users": [
    {
      "user_id": "user_123",
      "role": "civilian",
      "status": "normal",
      "preferred_language": "en",
      "location_history": [
        {
          "lat": 51.5074,
          "lon": -0.1278,
          "timestamp": 1234567890.123,
          "accuracy": 10.5
        }
      ],
      "calls": [
        {
          "call_id": "call_abc123",
          "transcript": "Emergency at warehouse on 5th street",
          "start_time": 1234567890.123,
          "end_time": 1234567895.456,
          "tags": ["emergency", "fire", "warehouse"]
        }
      ]
    }
  ]
}
```

**Field Descriptions:**
- `user_id`: Unique identifier for the user
- `role`: Either "civilian" or "first_responder"
- `status`: Current user status
  - For civilians: "normal", "needs_help", "help_coming", "at_incident", "in_transport", "at_hospital"
  - For responders: "roaming", "docked", "en_route_to_civ", "on_scene", "en_route_to_hospital"
- `preferred_language`: User's preferred language ("en" for English, "tr" for Turkish)
- `location_history`: Array of GPS coordinates with timestamps
- `calls`: Array of emergency call transcripts
  - `tags`: Top 3 meaningful words extracted from transcript using NLP
- `timestamp`: Unix timestamp (seconds since epoch)
- `accuracy`: GPS accuracy in meters

---

### Get Specific User
**Endpoint:** `GET /api/users/{user_id}`

**Description:** Retrieves a specific user by ID with complete data.

**Usage:**
```bash
curl http://localhost:8080/api/users/user_123
```

**Response Format:**
```json
{
  "ok": true,
  "user": {
    "user_id": "user_123",
    "role": "civilian",
    "status": "normal",
    "preferred_language": "en",
    "location_history": [...],
    "calls": [...]
  }
}
```

**Error Response (404):**
```json
{
  "ok": false,
  "error": "User not found"
}
```

---

## Location Data Endpoints

### Get All Location Points
**Endpoint:** `GET /api/locations`

**Description:** Retrieves all GPS location points from all users in a flat array format.

**Usage:**
```bash
curl http://localhost:8080/api/locations
```

**Response Format:**
```json
{
  "ok": true,
  "locations": [
    {
      "user_id": "user_123",
      "lat": 51.5074,
      "lon": -0.1278,
      "timestamp": 1234567890.123,
      "accuracy": 10.5
    },
    {
      "user_id": "user_456",
      "lat": 51.5080,
      "lon": -0.1285,
      "timestamp": 1234567895.789,
      "accuracy": 8.2
    }
  ]
}
```

---

### Get User's Location History
**Endpoint:** `GET /api/locations/{user_id}`

**Description:** Retrieves all location points for a specific user.

**Usage:**
```bash
curl http://localhost:8080/api/locations/user_123
```

**Response Format:**
```json
{
  "ok": true,
  "locations": [
    {
      "lat": 51.5074,
      "lon": -0.1278,
      "timestamp": 1234567890.123,
      "accuracy": 10.5
    }
  ]
}
```

---

## Emergency Call Endpoints

### Get All Calls
**Endpoint:** `GET /api/calls`

**Description:** Retrieves all emergency call transcripts from all users.

**Usage:**
```bash
curl http://localhost:8080/api/calls
```

**Response Format:**
```json
{
  "ok": true,
  "calls": [
    {
      "call_id": "call_abc123",
      "user_id": "user_123",
      "transcript": "Emergency at warehouse on 5th street. Fire spreading quickly.",
      "start_time": 1234567890.123,
      "end_time": 1234567895.456,
      "tags": ["emergency", "fire", "warehouse"]
    }
  ]
}
```

**Field Descriptions:**
- `call_id`: Unique identifier for the call
- `user_id`: ID of the user who made the call
- `transcript`: Complete text transcript of the emergency call
- `start_time`: When the call started (Unix timestamp)
- `end_time`: When the call ended (Unix timestamp)
- `tags`: Top 3 meaningful words extracted from transcript using NLP (supports English and Turkish)

---

### Get User's Calls
**Endpoint:** `GET /api/calls/{user_id}`

**Description:** Retrieves all emergency calls for a specific user.

**Usage:**
```bash
curl http://localhost:8080/api/calls/user_123
```

**Response Format:**
```json
{
  "ok": true,
  "calls": [
    {
      "call_id": "call_abc123",
      "transcript": "Emergency at warehouse",
      "start_time": 1234567890.123,
      "end_time": 1234567895.456,
      "tags": ["emergency", "warehouse"]
    }
  ]
}
```

---

## News Article Endpoints

### Get All News Articles
**Endpoint:** `GET /api/news`

**Description:** Retrieves all news articles ordered by when they were received.

**Usage:**
```bash
curl http://localhost:8080/api/news
```

**Response Format:**
```json
{
  "ok": true,
  "news": [
    {
      "article_id": "a1b2c3d4",
      "link": "https://news.example.com/article",
      "title": "Fire reported at warehouse",
      "pub_date": "2024-01-15T10:30:00Z",
      "disaster": true,
      "location_name": "Industrial District",
      "received_at": 1234567890.123,
      "lat": 51.5074,
      "lon": -0.1278
    }
  ]
}
```

**Field Descriptions:**
- `article_id`: Unique identifier for the article
- `link`: URL to the original news article
- `title`: Article headline
- `pub_date`: When the article was originally published (ISO format)
- `disaster`: Boolean indicating if this is disaster-related news
- `location_name`: Human-readable location name
- `received_at`: When the server received this article (Unix timestamp)
- `lat`/`lon`: GPS coordinates (may be null)

---

### Get Specific News Article
**Endpoint:** `GET /api/news/{article_id}`

**Description:** Retrieves a specific news article by ID.

**Usage:**
```bash
curl http://localhost:8080/api/news/a1b2c3d4
```

**Response Format:**
```json
{
  "ok": true,
  "article": {
    "article_id": "a1b2c3d4",
    "link": "https://news.example.com/article",
    "title": "Fire reported at warehouse",
    "pub_date": "2024-01-15T10:30:00Z",
    "disaster": true,
    "location_name": "Industrial District",
    "received_at": 1234567890.123,
    "lat": 51.5074,
    "lon": -0.1278
  }
}
```

---

## Sensor Data Endpoints

### Get All Sensor Readings
**Endpoint:** `GET /api/sensors`

**Description:** Retrieves all IoT sensor readings ordered by when they were received.

**Usage:**
```bash
curl http://localhost:8080/api/sensors
```

**Response Format:**
```json
{
  "ok": true,
  "sensors": [
    {
      "reading_id": "r1s2t3u4",
      "status": 1,
      "temperature": 25.5,
      "humidity": 60.2,
      "accel": {
        "x": 0.1,
        "y": 0.2,
        "z": 9.8
      },
      "gyro": {
        "x": 0.0,
        "y": 0.1,
        "z": 0.0
      },
      "mic": {
        "amplitude": 0.5,
        "frequency": 440.0
      },
      "received_at": 1234567890.123
    }
  ]
}
```

**Field Descriptions:**
- `reading_id`: Unique identifier for the sensor reading
- `status`: Sensor status code (integer)
- `temperature`: Temperature in Celsius
- `humidity`: Humidity percentage
- `accel`: Accelerometer data (x, y, z axes in m/s²)
- `gyro`: Gyroscope data (x, y, z axes in rad/s)
- `mic`: Microphone data (amplitude and frequency)
- `received_at`: When the server received this reading (Unix timestamp)

---

## Hospital Data Endpoints

### Get All Hospitals
**Endpoint:** `GET /api/hospitals`

**Description:** Retrieves all hospitals with current capacity information including general beds, ICU, ER, and pediatric units.

**Usage:**
```bash
curl http://localhost:8080/api/hospitals
```

**Response Format:**
```json
{
  "ok": true,
  "hospitals": [
    {
      "hospital_id": "h1a2b3c4",
      "name": "Acıbadem Maslak Hastanesi",
      "lat": 41.1086,
      "lon": 29.0219,
      "total_beds": 500,
      "available_beds": 120,
      "icu_beds": 50,
      "available_icu": 8,
      "er_beds": 75,
      "available_er": 15,
      "pediatric_beds": 100,
      "available_pediatric": 25,
      "contact_phone": "+90 212 304 4444",
      "last_updated": 1234567890.123
    }
  ]
}
```

**Field Descriptions:**
- `hospital_id`: Unique identifier for the hospital
- `name`: Hospital name
- `lat`/`lon`: GPS coordinates of the hospital
- `total_beds`: Total general bed capacity
- `available_beds`: Currently available general beds
- `icu_beds`: Total ICU capacity
- `available_icu`: Currently available ICU beds
- `er_beds`: Total emergency room capacity
- `available_er`: Currently available ER beds
- `pediatric_beds`: Total pediatric unit capacity
- `available_pediatric`: Currently available pediatric beds
- `contact_phone`: Hospital contact number
- `last_updated`: When capacity was last updated (Unix timestamp)

---

## Danger Zone Endpoints

### Get All Danger Zones
**Endpoint:** `GET /api/danger-zones`

**Description:** Retrieves all active danger zones including natural disasters, infrastructure failures, and civil incidents.

**Usage:**
```bash
curl http://localhost:8080/api/danger-zones
```

**Response Format:**
```json
{
  "ok": true,
  "danger_zones": [
    {
      "zone_id": "z1a2b3c4",
      "category": "natural",
      "disaster_type": "earthquake",
      "severity": 5,
      "lat": 37.0662,
      "lon": 37.3833,
      "radius": 5000,
      "is_active": true,
      "detected_at": 1234567890.123,
      "expires_at": 1234571490.123,
      "description": "7.8 magnitude earthquake in Gaziantep region, major structural damage",
      "recommended_action": "evacuate"
    }
  ]
}
```

**Field Descriptions:**
- `zone_id`: Unique identifier for the danger zone
- `category`: Type of danger ("natural", "people", "infrastructure")
- `disaster_type`: Specific disaster type (e.g., "earthquake", "fire", "flood", "building_collapse")
- `severity`: Severity level from 1 (minimal) to 5 (critical)
- `lat`/`lon`: Center coordinates of the danger zone
- `radius`: Affected radius in meters
- `is_active`: Whether the danger zone is currently active
- `detected_at`: When the danger was first detected (Unix timestamp)
- `expires_at`: When the danger is expected to expire (Unix timestamp, may be null)
- `description`: Detailed description of the danger
- `recommended_action`: Recommended action ("evacuate", "shelter_in_place", "avoid_area")

---

## AI-Extracted Entity Endpoints

### Get All Extracted Entities
**Endpoint:** `GET /api/entities`

**Description:** Retrieves all entities extracted by Claude AI from emergency calls, news articles, and sensor data.

**Usage:**
```bash
curl http://localhost:8080/api/entities
```

**Response Format:**
```json
{
  "ok": true,
  "entities": [
    {
      "entity_id": "e1a2b3c4",
      "source_type": "call",
      "source_id": "call_gaziantep_001",
      "entity_type": "person_status",
      "urgency": 5,
      "status": "needs_help",
      "needs": ["medical", "evacuation", "search_and_rescue"],
      "location_mentioned": "Şahinbey ilçesi, çökmüş bina",
      "medical_keywords": ["trapped", "building_collapse", "unconscious", "bleeding"],
      "extracted_at": 1234567890.123
    }
  ]
}
```

**Field Descriptions:**
- `entity_id`: Unique identifier for the extracted entity
- `source_type`: Source of the entity ("call", "news", "sensor")
- `source_id`: ID of the source record (call_id, article_id, or reading_id)
- `entity_type`: Type of entity ("person_status", "movement", "danger_zone", "medical")
- `urgency`: Urgency level from 1 (low) to 5 (critical)
- `status`: Current status (e.g., "needs_help", "help_coming", "monitoring", "active_incident")
- `needs`: Array of identified needs (e.g., ["medical", "evacuation", "ambulance"])
- `location_mentioned`: Location extracted from the source text
- `medical_keywords`: Medical terms identified in the source
- `extracted_at`: When the entity was extracted (Unix timestamp)

---

## Complete Data Dump

### Get All Data
**Endpoint:** `GET /api/data/all`

**Description:** Retrieves all database data in a single response. Useful for dashboards that need complete system state.

**Usage:**
```bash
curl http://localhost:8080/api/data/all
```

**Response Format:**
```json
{
  "ok": true,
  "data": {
    "users": [
      {
        "user_id": "user_123",
        "role": "civilian",
        "status": "normal",
        "preferred_language": "en",
        "location_history": [...],
        "calls": [...]
      }
    ],
    "news": [
      {
        "article_id": "a1b2c3d4",
        "title": "Fire reported at warehouse",
        "disaster": true,
        ...
      }
    ],
    "sensors": [
      {
        "reading_id": "r1s2t3u4",
        "temperature": 25.5,
        "humidity": 60.2,
        ...
      }
    ],
    "hospitals": [
      {
        "hospital_id": "h1a2b3c4",
        "name": "Acıbadem Maslak Hastanesi",
        "total_beds": 500,
        "available_beds": 120,
        ...
      }
    ],
    "danger_zones": [
      {
        "zone_id": "z1a2b3c4",
        "category": "natural",
        "disaster_type": "earthquake",
        "severity": 5,
        ...
      }
    ],
    "entities": [
      {
        "entity_id": "e1a2b3c4",
        "source_type": "call",
        "entity_type": "person_status",
        "urgency": 5,
        ...
      }
    ],
    "timestamp": 1234567890.123
  }
}
```

**Field Descriptions:**
- `users`: Complete array of all users with embedded location and call data
- `news`: Complete array of all news articles
- `sensors`: Complete array of all sensor readings
- `hospitals`: Complete array of all hospitals with capacity data
- `danger_zones`: Complete array of all active danger zones
- `entities`: Complete array of all AI-extracted entities
- `timestamp`: When this snapshot was generated (Unix timestamp)

---

## Error Handling

All endpoints follow consistent error handling patterns:

### 404 Not Found
```json
{
  "ok": false,
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "ok": false,
  "error": "Database connection failed"
}
```

---

## Usage Examples

### JavaScript/Fetch API
```javascript
// Get all users
const response = await fetch('/api/users');
const data = await response.json();
if (data.ok) {
  console.log('Users:', data.users);
}

// Get specific user
const userResponse = await fetch('/api/users/user_123');
const userData = await userResponse.json();
if (userData.ok) {
  console.log('User:', userData.user);
}
```

### Python/requests
```python
import requests

# Get all news articles
response = requests.get('http://localhost:8080/api/news')
if response.json()['ok']:
    articles = response.json()['news']
    print(f"Found {len(articles)} articles")

# Get complete data dump
all_data = requests.get('http://localhost:8080/api/data/all').json()
if all_data['ok']:
    print(f"Users: {len(all_data['data']['users'])}")
    print(f"News: {len(all_data['data']['news'])}")
    print(f"Sensors: {len(all_data['data']['sensors'])}")
```

### cURL Examples
```bash
# Get all location points
curl -X GET http://localhost:8080/api/locations

# Get calls for specific user
curl -X GET http://localhost:8080/api/calls/user_123

# Get complete data dump with pretty formatting
curl -X GET http://localhost:8080/api/data/all | jq .
```

---

## Notes

- All timestamps are Unix timestamps (seconds since epoch) as floating-point numbers
- GPS coordinates use standard WGS84 format (latitude, longitude)
- The database is wiped clean on server restart (development mode)
- All endpoints return data in chronological order where applicable
- Boolean fields are returned as `true`/`false` in JSON
- `null` values may appear for optional fields like GPS coordinates in news articles

---

## Related Documentation

- **Server Setup:** See `data_server/CLAUDE.md` for server architecture details
- **Database Schema:** See `data_server/database/CLAUDE.md` for data model documentation
- **WebSocket API:** See existing WebSocket endpoints for real-time data ingestion
- **Overall System:** See main `CLAUDE.md` for complete system architecture