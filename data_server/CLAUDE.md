# data_server/

Real-time data ingestion backend for the ichack26 disaster response system. Receives phone transcripts and location data via WebSocket, news articles and sensor readings via REST, stores them in SQLite, and prepares data for Claude AI analysis.

## Purpose

The data_server is the central data collection hub that:
- Receives real-time emergency call transcripts and GPS locations from mobile clients
- Ingests news articles about disasters from external sources
- Collects IoT sensor readings (temperature, humidity, accelerometer, gyroscope, microphone)
- Persists all data in SQLite for analysis
- Provides API endpoints for downstream consumers
- Integrates with Claude AI for intelligent data processing

## Architecture & Design

### Core Components

**server.py** - Main Entry Point
- Creates aiohttp web application
- Registers routes from all client modules (phone, news, sensor)
- Initializes database on startup (background task)
- Provides health check endpoints
- Listens on configurable PORT (default: 8080)

**phone_client.py** - Mobile Device WebSocket Handlers
- `phone_transcript_ws()` - Handles call transcripts
  - Accepts WebSocket connections at `/phone_transcript_in`
  - Receives transcript chunks with `is_final` flag
  - Auto-closes connection when final transcript received
  - Saves to database: ensures user exists, creates Call record
  - Falls back to saving partial transcripts on unexpected disconnect
- `phone_location_ws()` - Handles GPS tracking
  - Accepts WebSocket connections at `/phone_location_in`
  - Stays open for continuous location updates
  - Saves LocationPoint records to database
  - Supports concurrent connections from same user

**news_client.py** - News & External Data REST Endpoints
- `news_information_in()` - POST endpoint at `/news_information_in`
  - Receives news articles with disaster flag
  - Extracts location data (name, lat/lon)
  - Generates unique article_id and saves to database
- `danger_entities_out()` - GET endpoint at `/danger_entities_out`
  - Returns processed danger entities (currently stub)
  - Intended for downstream consumption by UI

**sensor_client.py** - IoT Sensor Data REST Endpoint
- `sensor_data_in()` - POST endpoint at `/sensor_data_in`
  - Receives sensor readings (temperature, humidity, accel, gyro, mic)
  - Generates unique reading_id and saves to database
  - Supports nested JSON format for sensor arrays

**generate_states.py** - Claude AI Integration
- Initializes Anthropic Claude client (claude-sonnet-4-5)
- `generate_new_states()` - Creates snapshots of current database state
  - Returns dict with phone data, locations, and news
  - Intended for passing to Claude for analysis
- Currently contains sample Claude API call for reference

### Data Flow

```
Mobile App (WebSocket)              External Sources (REST)
     |                                      |
     |-- /phone_transcript_in              |-- /news_information_in
     |-- /phone_location_in                |-- /sensor_data_in
     |                                      |
     +------------+-------------------------+
                  |
                  v
         Client Modules (phone, news, sensor)
                  |
                  v
         Database Layer (database/postgres.py)
                  |
                  v
         SQLite File (data/ichack_server.db)
                  |
                  v
         Claude AI Processing (generate_states.py)
                  |
                  v
         API Responses & Danger Alerts
```

### Key Design Decisions

1. **Async-first architecture**: Uses aiohttp and async/await throughout for concurrent I/O
2. **WebSocket for real-time data**: Phone transcripts and locations use WebSocket for low-latency streaming
3. **REST for batch data**: News and sensor data use HTTP POST for simpler integration
4. **Modular route registration**: Each client module self-registers routes with the app
5. **Background DB initialization**: Database init runs in background so server starts immediately
6. **SQLite for persistence**: File-based database at `data/ichack_server.db` for simplicity
7. **Database wipe on startup**: Fresh state on each server restart (see database/CLAUDE.md)
8. **Partial transcript fallback**: Saves incomplete transcripts if WebSocket disconnects unexpectedly
9. **Auto user creation**: Users are created on-the-fly when first data arrives
10. **Debugging output**: Prints tables to stdout after each database operation

## Key Files & Responsibilities

### Main Server Files

| File | Lines | Purpose |
|------|-------|---------|
| `server.py` | 52 | App creation, route registration, startup hooks |
| `phone_client.py` | 121 | WebSocket handlers for transcripts and location |
| `news_client.py` | 80 | REST endpoints for news and danger entities |
| `sensor_client.py` | 64 | REST endpoint for sensor data |
| `generate_states.py` | 24 | Claude AI client and state generation |

### Database Files

See `database/CLAUDE.md` for comprehensive database documentation.

| File | Purpose |
|------|---------|
| `database/postgres.py` | SQLite implementation (named for historical reasons) |
| `database/db.py` | Data models (User, Call, LocationPoint, NewsArticle, SensorReading) |
| `database/__init__.py` | Public API exports |

### Deployment Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for production deployment |
| `cloudbuild.yaml` | Google Cloud Build configuration |
| `requirements.txt` | Python dependencies |

## API Endpoints

### Health & Status

- `GET /` - Root endpoint (returns "hello world")
- `GET /health` - Health check (returns "okay health")

### WebSocket Endpoints

**`WS /phone_transcript_in`** - Emergency Call Transcripts
- Accepts WebSocket connection
- Client sends JSON messages:
  ```json
  {
    "user_id": "user_123",
    "data": {
      "transcript": {
        "text": "There's a fire at the warehouse",
        "is_final": false
      }
    }
  }
  ```
- `is_final: true` triggers save and auto-closes connection
- `is_final: false` buffers partial transcripts
- Auto-saves buffered text on unexpected disconnect
- Database: Creates Call record with transcript, start_time, end_time

**`WS /phone_location_in`** - GPS Location Tracking
- Accepts WebSocket connection
- Stays open for continuous location updates
- Client sends JSON messages:
  ```json
  {
    "user_id": "user_123",
    "lat": 51.5074,
    "lon": -0.1278,
    "timestamp": 1234567890.123,
    "accuracy": 10.5
  }
  ```
- Database: Appends LocationPoint to user's history

### REST Endpoints

**`POST /news_information_in`** - News Article Ingestion
- Request body:
  ```json
  {
    "title": "Fire reported at warehouse",
    "link": "https://news.example.com/article",
    "pubDate": "2024-01-15T10:30:00Z",
    "disaster": true,
    "location": {
      "name": "Industrial District",
      "lat": 51.5074,
      "long": -0.1278
    }
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "article_id": "a1b2c3d4"
  }
  ```
- Database: Creates NewsArticle record

**`POST /sensor_data_in`** - IoT Sensor Readings
- Request body:
  ```json
  {
    "status": 1,
    "temperature": 25.5,
    "humidity": 60.2,
    "accel": {"x": 0.1, "y": 0.2, "z": 9.8},
    "gyro": {"x": 0.0, "y": 0.1, "z": 0.0},
    "mic": {"amplitude": 0.5, "frequency": 440.0}
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "reading_id": "r1s2t3u4"
  }
  ```
- Database: Creates SensorReading record

**`GET /danger_entities_out`** - Danger Entity Retrieval
- Currently returns stub: `{"ok": true, "danger_entities": []}`
- Intended for downstream UI consumption
- Future: Return processed danger alerts based on Claude analysis

## Claude AI Integration

The data_server integrates with Anthropic Claude for intelligent data processing:

### Current Implementation

**`generate_states.py`**
- Imports Anthropic client library
- Initializes client with API key from environment
- Sample API call to `claude-sonnet-4-5` model
- `generate_new_states()` function generates data snapshots

### Data Snapshot Format

```python
{
  "phone": {
    "user_123": {
      "role": "civilian",
      "location_history": [...],
      "calls": [...]
    }
  },
  "phone_location": {
    "user_123": [{"lat": 51.5074, "lon": -0.1278, ...}]
  },
  "news": [
    {
      "title": "Fire at warehouse",
      "disaster": true,
      "location_name": "Industrial District",
      ...
    }
  ]
}
```

### Integration Points

- Data collected from phone_client, news_client, sensor_client
- Stored in SQLite via database/postgres.py
- Retrieved and formatted by generate_states.py
- Passed to Claude API for analysis
- Results can be returned via /danger_entities_out endpoint

### Potential Claude Use Cases

1. Extract structured information from call transcripts
2. Identify disaster patterns across multiple news sources
3. Correlate sensor readings with emergency calls
4. Generate aggregate disaster summaries
5. Classify severity and urgency of incidents
6. Recommend first responder dispatch priorities

## Database Layer

The data_server uses a SQLite database for persistence. For comprehensive documentation, see:

**`database/CLAUDE.md`** - Detailed database documentation covering:
- Data models (User, Call, LocationPoint, NewsArticle, SensorReading)
- Database schema (5 tables with foreign key relationships)
- PostgresDB class API (async methods for all operations)
- Module-level functions (init_db, save_user, append_location, etc.)
- Design decisions and integration patterns

### Quick Reference

**Database File**: `data/ichack_server.db` (SQLite3)

**Key Tables**:
- `users` - User records with role (civilian/first_responder)
- `location_points` - GPS history linked to users
- `calls` - Call transcripts linked to users
- `news_articles` - News with disaster flag and location
- `sensor_readings` - IoT sensor data

**Common Operations**:
```python
from database.postgres import (
    init_db, ensure_user_exists,
    append_location, append_call,
    save_news, save_sensor_reading
)

await init_db()  # Initialize and wipe database
await ensure_user_exists("user_123", role="civilian")
await append_location("user_123", LocationPoint(...))
await append_call("user_123", Call(...))
await save_news(NewsArticle(...))
await save_sensor_reading(SensorReading(...))
```

**Important**: Database is wiped on server startup (`init_db()` calls `wipe_db()`).

## Deployment Configuration

### Docker

**`Dockerfile`** - Production container build:
- Base: `python:3.11-slim`
- Installs dependencies from requirements.txt
- Copies source files (server.py, *_client.py, database/)
- Creates `/app/data` directory for SQLite file
- Exposes port 8080
- Entry point: `python server.py`

Build and run:
```bash
docker build -t ichack-server .
docker run -p 8080:8080 -e PORT=8080 ichack-server
```

### Google Cloud Run

**`cloudbuild.yaml`** - CI/CD pipeline:
- Builds Docker image tagged with git SHA
- Pushes to Google Container Registry
- Deploys to Cloud Run in us-central1
- Service name: `ichack-server`
- Publicly accessible (--allow-unauthenticated)

Deployment:
```bash
gcloud builds submit --config cloudbuild.yaml
```

Service URL: Provided by Cloud Run (format: `https://ichack-server-<hash>-uc.a.run.app`)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `ANTHROPIC_API_KEY` | - | Claude API key (for generate_states.py) |

## Dependencies & Tech Stack

### Python Dependencies

**`requirements.txt`**:
- `aiohttp>=3.9.0` - Async HTTP server and WebSocket support
- `asyncpg>=0.29.0` - PostgreSQL driver (not used, legacy)
- `aiosqlite>=0.19.0` - Async SQLite driver (primary database)

Additional (not in requirements.txt but used):
- `anthropic` - Claude API client (imported by generate_states.py)

### Tech Stack

**Web Framework**: aiohttp
- Async/await based HTTP server
- Native WebSocket support
- Route-based request handlers
- Middleware and startup hooks

**Database**: SQLite (via aiosqlite)
- File-based persistence
- Async driver for concurrent access
- Relational schema with foreign keys
- ACID transactions

**AI/LLM**: Anthropic Claude
- Model: claude-sonnet-4-5
- SDK: anthropic Python client
- Use case: Data analysis and extraction

**Deployment**: Docker + Google Cloud Run
- Containerized deployment
- Serverless auto-scaling
- Public HTTPS endpoints
- CI/CD via Google Cloud Build

## System Integration

The data_server is part of a larger disaster response system with these components:

### Upstream Data Sources

**Mobile App** (not in this repo)
- Connects via WebSocket to `/phone_transcript_in` and `/phone_location_in`
- Sends real-time call transcripts and GPS coordinates
- User ID identifies caller

**News Server** (`/news_server` directory)
- Scrapes news sources for disaster articles
- POSTs to `/news_information_in` with disaster flag and location

**IoT Sensors** (external)
- Environmental sensors (temp, humidity)
- Motion sensors (accelerometer, gyroscope)
- Audio sensors (microphone amplitude/frequency)
- POSTs to `/sensor_data_in`

### Downstream Consumers

**User Interface** (`/user_interface` directory)
- Fetches danger entities from `/danger_entities_out`
- Displays real-time disaster information
- Maps user locations and news incidents

**Claude AI** (via generate_states.py)
- Analyzes collected data
- Generates insights and alerts
- Returns structured danger information

### Data Flow Across System

```
[Mobile Apps] --WS--> [data_server] --SQLite--> [Claude AI]
[News Server] --POST-> [data_server]              |
[IoT Sensors] --POST-> [data_server]              v
                                          [Danger Entities]
                                                  |
                                                  v
                                          [User Interface]
```

## Development Workflow

### Local Development

```bash
# Navigate to data_server directory
cd data_server

# Install dependencies
pip install -r requirements.txt
pip install anthropic  # For Claude integration

# Set environment variables
export PORT=8080
export ANTHROPIC_API_KEY=your_key_here

# Run server
python server.py

# Server starts on http://0.0.0.0:8080
# WebSocket: ws://localhost:8080/phone_transcript_in
# REST: http://localhost:8080/news_information_in
```

### Testing Endpoints

**Test WebSocket (transcript)**:
```python
import asyncio
import aiohttp
import json

async def test_transcript():
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect('ws://localhost:8080/phone_transcript_in') as ws:
            # Send partial transcript
            await ws.send_json({
                "user_id": "test_user",
                "data": {
                    "transcript": {
                        "text": "Emergency at warehouse",
                        "is_final": False
                    }
                }
            })
            # Send final transcript
            await ws.send_json({
                "user_id": "test_user",
                "data": {
                    "transcript": {
                        "text": "Fire at 123 Main St",
                        "is_final": True
                    }
                }
            })

asyncio.run(test_transcript())
```

**Test REST (news)**:
```bash
curl -X POST http://localhost:8080/news_information_in \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test disaster",
    "link": "https://example.com",
    "pubDate": "2024-01-15T10:00:00Z",
    "disaster": true,
    "location": {
      "name": "Test City",
      "lat": 51.5,
      "long": -0.1
    }
  }'
```

### Database Inspection

```bash
# Open SQLite database
sqlite3 data/ichack_server.db

# View tables
.tables

# Query users
SELECT * FROM users;

# Query calls with transcripts
SELECT u.user_id, u.role, c.transcript, c.start_time
FROM users u
JOIN calls c ON u.user_id = c.user_id;

# Query news articles
SELECT title, disaster, location_name, lat, lon
FROM news_articles
ORDER BY received_at DESC;
```

### Docker Development

```bash
# Build image
docker build -t ichack-server .

# Run with port mapping
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e ANTHROPIC_API_KEY=your_key \
  ichack-server

# Run with volume mount for data persistence
docker run -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  ichack-server
```

## Important Notes

1. **Database wipes on startup**: `init_db()` calls `wipe_db()` - all data is cleared when server restarts
2. **WebSocket behavior differs by endpoint**:
   - `/phone_transcript_in` auto-closes after `is_final: true`
   - `/phone_location_in` stays open for continuous updates
3. **User creation is automatic**: No need to pre-create users, they're created on first data
4. **Timestamps are Unix floats**: All time values stored as seconds since epoch
5. **File named postgres.py but uses SQLite**: Historical naming, actual implementation is SQLite
6. **No authentication**: All endpoints are public (suitable for hackathon/prototype)
7. **Debugging output**: Database state printed to stdout after each operation
8. **Anthropic SDK not in requirements.txt**: Must be installed separately for generate_states.py
9. **Data directory must exist**: Docker creates `/app/data`, local dev may need `mkdir data`
10. **Concurrent WebSocket connections**: Multiple users can connect simultaneously

## Future Enhancements

Potential improvements for production deployment:

1. **Persistent database**: Remove `wipe_db()` call, use migrations
2. **Authentication**: Add API keys or OAuth for endpoints
3. **Rate limiting**: Protect against abuse
4. **Error handling**: More robust error responses
5. **Logging**: Structured logging instead of print statements
6. **Health checks**: Detailed health endpoint with DB status
7. **Metrics**: Prometheus metrics for monitoring
8. **WebSocket heartbeat**: Detect and close stale connections
9. **Data validation**: Pydantic models for request validation
10. **PostgreSQL support**: Actually use asyncpg for production scale
11. **Claude integration**: Complete danger entity generation logic
12. **Backup/restore**: Regular database backups
13. **CORS configuration**: Proper CORS headers for web clients
14. **API versioning**: Version endpoints for compatibility

## Related Documentation

- `database/CLAUDE.md` - Comprehensive database layer documentation
- `../README.md` - Overall project overview
- `../user_interface/` - Frontend that consumes this API
- `../news_server/` - News scraping service that feeds this API
