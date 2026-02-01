# database/

Database layer for the ichack26 disaster response system. Provides async SQLite persistence for users, location tracking, call transcripts, news articles, and sensor readings.

## Purpose

Centralized data persistence layer that:
- Defines all data models as Python dataclasses
- Implements async SQLite database operations
- Provides a clean API for storing and retrieving user data, news articles, and sensor readings
- Supports concurrent access through async/await patterns
- Auto-initializes database schema on startup

## Key Files

### `db.py` - Data Models & File-based DB (Legacy)
Defines core data models as dataclasses and implements a simple JSON file-based database (legacy, not used in production):

**Data Models:**
- `User` - User record with role, location history, and call history
- `Call` - Phone call transcript with timing
- `LocationPoint` - GPS coordinate with timestamp and accuracy
- `NewsArticle` - News article with disaster flag and location
- `SensorReading` - IoT sensor data (temperature, humidity, accelerometer, gyroscope, microphone)

**Legacy DB Class:**
- `DB` - JSON file-based storage (stores users and news as individual JSON files)
- Not used in production; replaced by SQLite implementation

### `postgres.py` - SQLite Database Implementation (Primary)
**Note:** Named `postgres.py` for historical reasons but actually implements SQLite using `aiosqlite`.

**Primary database implementation with:**
- `PostgresDB` class - Main async database interface
- Global `db` instance - Singleton database connection
- Module-level async functions - Clean API exported to parent modules

**Key Methods:**
- `init_db()` - Creates all tables if they don't exist
- `wipe_db()` - Clears all data from tables (called on server start)
- `ensure_user_exists(user_id, role)` - Create user if not exists
- `save_user(user)` - Save complete user with history
- `get_user(user_id)` - Retrieve user with location/call history
- `append_location(user_id, location)` - Add GPS point to user's history
- `append_call(user_id, call)` - Add call transcript to user's history
- `list_users()` - Get all users as dicts
- `save_news(article)` - Store news article
- `list_news()` - Get all news articles ordered by received_at
- `save_sensor_reading(reading)` - Store sensor data
- `list_sensor_readings()` - Get all sensor readings

### `__init__.py` - Public API
Exports the core data models for use throughout the application:
```python
from .db import DB, User, Call, LocationPoint, NewsArticle
```

### `schema` - Schema Documentation
Markdown file documenting the database schema structure with field definitions and types.

### `firestore.py.backup` - Legacy Cloud Firestore Implementation
Backup of previous Google Cloud Firestore implementation. Not used in current system but preserved for reference.

## Database Schema

### Tables

**users**
```sql
user_id TEXT PRIMARY KEY
role TEXT NOT NULL CHECK(role IN ('civilian', 'first_responder'))
created_at REAL DEFAULT (julianday('now'))
```

**location_points**
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
user_id TEXT NOT NULL (FK -> users.user_id)
lat REAL NOT NULL
lon REAL NOT NULL
timestamp REAL NOT NULL
accuracy REAL NOT NULL
```

**calls**
```sql
call_id TEXT PRIMARY KEY
user_id TEXT NOT NULL (FK -> users.user_id)
transcript TEXT NOT NULL
start_time REAL NOT NULL
end_time REAL NOT NULL
```

**news_articles**
```sql
article_id TEXT PRIMARY KEY
link TEXT NOT NULL
title TEXT NOT NULL
pub_date TEXT NOT NULL
disaster INTEGER NOT NULL (boolean: 0/1)
location_name TEXT NOT NULL
received_at REAL NOT NULL
lat REAL (nullable)
lon REAL (nullable)
```

**sensor_readings**
```sql
reading_id TEXT PRIMARY KEY
status INTEGER NOT NULL
temperature REAL NOT NULL
humidity REAL NOT NULL
accel_x REAL NOT NULL
accel_y REAL NOT NULL
accel_z REAL NOT NULL
gyro_x REAL NOT NULL
gyro_y REAL NOT NULL
gyro_z REAL NOT NULL
mic_amplitude REAL NOT NULL
mic_frequency REAL NOT NULL
received_at REAL NOT NULL
```

### Relationships
- `location_points.user_id` -> `users.user_id` (CASCADE DELETE)
- `calls.user_id` -> `users.user_id` (CASCADE DELETE)

## Important Classes & Functions

### PostgresDB Class
Main database interface with async methods for all CRUD operations.

**Initialization:**
```python
db = PostgresDB(db_path="data/ichack_server.db")
await db.init_db()  # Creates tables
await db.wipe_db()  # Clears all data
```

**User Operations:**
```python
await ensure_user_exists("user_123", role="civilian")
user = await get_user("user_123")
await append_location("user_123", LocationPoint(...))
await append_call("user_123", Call(...))
users = await list_users()  # Returns list[dict]
```

**News Operations:**
```python
await save_news(NewsArticle(...))
article = await get_news("article_id")
articles = await list_news()  # Returns list[dict], ordered by received_at
```

**Sensor Operations:**
```python
await save_sensor_reading(SensorReading(...))
readings = await list_sensor_readings()  # Returns list[dict]
```

### Data Models (Dataclasses)

**User**
```python
user_id: str
role: Literal["civilian", "first_responder"]
location_history: List[LocationPoint] = []
calls: List[Call] = []
```

**LocationPoint**
```python
lat: float
lon: float
timestamp: float  # Unix timestamp
accuracy: float  # meters
```

**Call**
```python
call_id: str
transcript: str
start_time: float  # Unix timestamp
end_time: float    # Unix timestamp
```

**NewsArticle**
```python
article_id: str
link: str
title: str
pub_date: str
disaster: bool
location_name: str
received_at: float  # Unix timestamp
lat: Optional[float] = None
lon: Optional[float] = None
```

**SensorReading**
```python
reading_id: str
status: int
temperature: float
humidity: float
accel_x, accel_y, accel_z: float  # Accelerometer
gyro_x, gyro_y, gyro_z: float     # Gyroscope
mic_amplitude: float
mic_frequency: float
received_at: float  # Unix timestamp
```

## Dependencies & Tech Stack

**Core Dependencies:**
- `aiosqlite` - Async SQLite database driver
- `dataclasses` - Python data model definitions
- `typing` - Type hints for better code clarity

**Database:**
- SQLite 3 (via aiosqlite)
- File-based storage at `data/ichack_server.db`
- Async-first design for concurrent access

## Integration with Parent data_server

The database module is imported and used throughout the data_server:

**server.py:**
```python
from database.postgres import init_db
# Initializes and wipes database on startup
```

**phone_client.py:**
```python
from database.postgres import ensure_user_exists, append_location, append_call, list_users
from database.db import LocationPoint, Call
# Handles WebSocket connections for phone data
# Stores location updates and call transcripts
```

**news_client.py:**
```python
from database.postgres import save_news, list_news
from database.db import NewsArticle
# Handles POST requests for news articles
```

**sensor_client.py:**
```python
from database.postgres import save_sensor_reading, list_sensor_readings
from database.db import SensorReading
# Handles POST requests for sensor data
```

## Data Flow

```
WebSocket/HTTP Request
        |
        v
Client Module (phone_client, news_client, sensor_client)
        |
        v
Database Module (postgres.py)
        |
        v
SQLite File (data/ichack_server.db)
```

## Design Decisions

1. **SQLite over PostgreSQL**: Despite the filename, uses SQLite for simplicity and local file-based persistence
2. **Async-first**: All database operations are async to support concurrent WebSocket connections
3. **Dataclasses**: Uses Python dataclasses for type safety and clean serialization
4. **Wipe on startup**: Database is cleared when server starts (`init_db()` calls `wipe_db()`)
5. **Dictionary returns**: List operations return raw dicts instead of dataclass instances for easier JSON serialization
6. **Foreign key cascades**: Deleting a user automatically deletes their location history and calls
7. **Timestamp storage**: Uses float (Unix timestamps) for all time values
8. **Single global instance**: Module exports a single `db` instance for shared access

## Notes

- The database file is created at `data/ichack_server.db` relative to the data_server directory
- All timestamps are Unix epoch floats
- Boolean values in SQLite are stored as integers (0/1)
- The `role` field is constrained to 'civilian' or 'first_responder' at the database level
- Location history and calls are stored in separate tables with foreign keys, not as JSON arrays
- The legacy `DB` class in `db.py` is not used but remains for reference
- The backup Firestore implementation shows the migration history from Google Cloud Firestore to SQLite
