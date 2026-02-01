#!/usr/bin/env python3
import json
from typing import Optional, List
from pathlib import Path

import aiosqlite

from .db import User, Call, LocationPoint, NewsArticle, SensorReading, DangerZone, Hospital, ExtractedEntity

class PostgresDB:
    def __init__(self, db_path: str = "data/ichack_server.db"):
        """Initialize with SQLite file path instead of PostgreSQL connection."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)

    async def init_db(self):
        """Initialize database tables."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    role TEXT NOT NULL CHECK(role IN ('civilian', 'first_responder')),
                    status TEXT DEFAULT 'normal',
                    preferred_language TEXT DEFAULT 'en' CHECK(preferred_language IN ('en', 'tr')),
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS location_points (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    lat REAL NOT NULL,
                    lon REAL NOT NULL,
                    timestamp REAL NOT NULL,
                    accuracy REAL NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS calls (
                    call_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    transcript TEXT NOT NULL,
                    start_time REAL NOT NULL,
                    end_time REAL NOT NULL,
                    tags TEXT DEFAULT '',
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS news_articles (
                    article_id TEXT PRIMARY KEY,
                    link TEXT NOT NULL,
                    title TEXT NOT NULL,
                    pub_date TEXT NOT NULL,
                    disaster INTEGER NOT NULL,
                    location_name TEXT NOT NULL,
                    received_at REAL NOT NULL,
                    lat REAL,
                    lon REAL
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    reading_id TEXT PRIMARY KEY,
                    status INTEGER NOT NULL,
                    temperature REAL NOT NULL,
                    humidity REAL NOT NULL,
                    accel_x REAL NOT NULL,
                    accel_y REAL NOT NULL,
                    accel_z REAL NOT NULL,
                    gyro_x REAL NOT NULL,
                    gyro_y REAL NOT NULL,
                    gyro_z REAL NOT NULL,
                    mic_amplitude REAL NOT NULL,
                    mic_frequency REAL NOT NULL,
                    received_at REAL NOT NULL
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS danger_zones (
                    zone_id TEXT PRIMARY KEY,
                    category TEXT NOT NULL CHECK(category IN ('natural', 'people', 'infrastructure')),
                    disaster_type TEXT NOT NULL,
                    severity INTEGER NOT NULL CHECK(severity >= 1 AND severity <= 5),
                    lat REAL NOT NULL,
                    lon REAL NOT NULL,
                    radius REAL NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    detected_at REAL NOT NULL,
                    expires_at REAL,
                    description TEXT DEFAULT '',
                    recommended_action TEXT DEFAULT ''
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS hospitals (
                    hospital_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    lat REAL NOT NULL,
                    lon REAL NOT NULL,
                    total_beds INTEGER NOT NULL,
                    available_beds INTEGER NOT NULL,
                    icu_beds INTEGER NOT NULL,
                    available_icu INTEGER NOT NULL,
                    er_beds INTEGER NOT NULL,
                    available_er INTEGER NOT NULL,
                    pediatric_beds INTEGER NOT NULL,
                    available_pediatric INTEGER NOT NULL,
                    contact_phone TEXT DEFAULT '',
                    last_updated REAL DEFAULT 0
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS extracted_entities (
                    entity_id TEXT PRIMARY KEY,
                    source_type TEXT NOT NULL CHECK(source_type IN ('call', 'news', 'sensor')),
                    source_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL CHECK(entity_type IN ('person_status', 'movement', 'danger_zone', 'medical')),
                    urgency INTEGER NOT NULL CHECK(urgency >= 1 AND urgency <= 5),
                    status TEXT NOT NULL,
                    needs TEXT DEFAULT '',
                    location_mentioned TEXT DEFAULT '',
                    medical_keywords TEXT DEFAULT '',
                    extracted_at REAL NOT NULL
                )
            """)

            await db.commit()

    async def wipe_db(self):
        """Clear all data from tables."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM extracted_entities")
            await db.execute("DELETE FROM hospitals")
            await db.execute("DELETE FROM danger_zones")
            await db.execute("DELETE FROM sensor_readings")
            await db.execute("DELETE FROM news_articles")
            await db.execute("DELETE FROM calls")
            await db.execute("DELETE FROM location_points")
            await db.execute("DELETE FROM users")
            await db.commit()

    # --- Users ---

    async def ensure_user_exists(self, user_id: str, role: str = "civilian", status: str = "normal", preferred_language: str = "en") -> None:
        """Create user if they don't exist."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT OR IGNORE INTO users (user_id, role, status, preferred_language) VALUES (?, ?, ?, ?)",
                (user_id, role, status, preferred_language)
            )
            await db.commit()

    async def save_user(self, user: User) -> None:
        """Save user and their associated data."""
        async with aiosqlite.connect(self.db_path) as db:
            # Save or update user
            await db.execute(
                "INSERT OR REPLACE INTO users (user_id, role, status, preferred_language) VALUES (?, ?, ?, ?)",
                (user.user_id, user.role, user.status, user.preferred_language)
            )

            # Clear existing location history and calls
            await db.execute("DELETE FROM location_points WHERE user_id = ?", (user.user_id,))
            await db.execute("DELETE FROM calls WHERE user_id = ?", (user.user_id,))

            # Save location history
            for loc in user.location_history:
                await db.execute(
                    "INSERT INTO location_points (user_id, lat, lon, timestamp, accuracy) VALUES (?, ?, ?, ?, ?)",
                    (user.user_id, loc.lat, loc.lon, loc.timestamp, loc.accuracy)
                )

            # Save calls
            for call in user.calls:
                tags_str = ','.join(call.tags) if call.tags else ''
                await db.execute(
                    "INSERT INTO calls (call_id, user_id, transcript, start_time, end_time, tags) VALUES (?, ?, ?, ?, ?, ?)",
                    (call.call_id, user.user_id, call.transcript, call.start_time, call.end_time, tags_str)
                )

            await db.commit()

    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user with their location history and calls."""
        async with aiosqlite.connect(self.db_path) as db:
            # Get user
            async with db.execute("SELECT user_id, role, status, preferred_language FROM users WHERE user_id = ?", (user_id,)) as cursor:
                user_row = await cursor.fetchone()
                if not user_row:
                    return None

            # Get location history
            location_history = []
            async with db.execute(
                "SELECT lat, lon, timestamp, accuracy FROM location_points WHERE user_id = ? ORDER BY timestamp",
                (user_id,)
            ) as cursor:
                async for row in cursor:
                    location_history.append(LocationPoint(
                        lat=row[0], lon=row[1], timestamp=row[2], accuracy=row[3]
                    ))

            # Get calls
            calls = []
            async with db.execute(
                "SELECT call_id, transcript, start_time, end_time, tags FROM calls WHERE user_id = ? ORDER BY start_time",
                (user_id,)
            ) as cursor:
                async for row in cursor:
                    tags = row[4].split(',') if row[4] else []
                    calls.append(Call(
                        call_id=row[0], transcript=row[1], start_time=row[2], end_time=row[3], tags=tags
                    ))

            return User(
                user_id=user_row[0],
                role=user_row[1],
                status=user_row[2],
                preferred_language=user_row[3] if len(user_row) > 3 else 'en',
                location_history=location_history,
                calls=calls
            )

    async def append_location(self, user_id: str, location: LocationPoint) -> None:
        """Add a location point to user's history."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO location_points (user_id, lat, lon, timestamp, accuracy) VALUES (?, ?, ?, ?, ?)",
                (user_id, location.lat, location.lon, location.timestamp, location.accuracy)
            )
            await db.commit()

    async def append_call(self, user_id: str, call: Call) -> None:
        """Add a call to user's history."""
        async with aiosqlite.connect(self.db_path) as db:
            tags_str = ','.join(call.tags) if call.tags else ''
            await db.execute(
                "INSERT INTO calls (call_id, user_id, transcript, start_time, end_time, tags) VALUES (?, ?, ?, ?, ?, ?)",
                (call.call_id, user_id, call.transcript, call.start_time, call.end_time, tags_str)
            )
            await db.commit()

    async def list_users(self) -> List[dict]:
        """List all users as raw dicts."""
        users = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT user_id, role, status, preferred_language FROM users") as cursor:
                async for row in cursor:
                    user = await self.get_user(row[0])
                    if user:
                        users.append({
                            "user_id": user.user_id,
                            "role": user.role,
                            "status": user.status,
                            "preferred_language": user.preferred_language,
                            "location_history": [
                                {"lat": lp.lat, "lon": lp.lon, "timestamp": lp.timestamp, "accuracy": lp.accuracy}
                                for lp in user.location_history
                            ],
                            "calls": [
                                {"call_id": c.call_id, "transcript": c.transcript, "start_time": c.start_time,
                                 "end_time": c.end_time, "tags": c.tags}
                                for c in user.calls
                            ]
                        })
        return users

    # --- News ---

    async def save_news(self, article: NewsArticle) -> None:
        """Save news article."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO news_articles
                   (article_id, link, title, pub_date, disaster, location_name, received_at, lat, lon)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (article.article_id, article.link, article.title, article.pub_date,
                 1 if article.disaster else 0, article.location_name,
                 article.received_at, article.lat, article.lon)
            )
            await db.commit()

    async def get_news(self, article_id: str) -> Optional[NewsArticle]:
        """Get news article by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT article_id, link, title, pub_date, disaster, location_name, received_at, lat, lon
                   FROM news_articles WHERE article_id = ?""",
                (article_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                return NewsArticle(
                    article_id=row[0],
                    link=row[1],
                    title=row[2],
                    pub_date=row[3],
                    disaster=bool(row[4]),
                    location_name=row[5],
                    received_at=row[6],
                    lat=row[7],
                    lon=row[8]
                )

    async def list_news(self) -> List[dict]:
        """List all news articles as raw dicts."""
        articles = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT article_id, link, title, pub_date, disaster, location_name, received_at, lat, lon
                   FROM news_articles ORDER BY received_at"""
            ) as cursor:
                async for row in cursor:
                    articles.append({
                        "article_id": row[0],
                        "link": row[1],
                        "title": row[2],
                        "pub_date": row[3],
                        "disaster": bool(row[4]),
                        "location_name": row[5],
                        "received_at": row[6],
                        "lat": row[7],
                        "lon": row[8]
                    })
        return articles

    # --- Sensor Readings ---

    async def save_sensor_reading(self, reading: SensorReading) -> None:
        """Save sensor reading."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO sensor_readings
                   (reading_id, status, temperature, humidity, accel_x, accel_y, accel_z,
                    gyro_x, gyro_y, gyro_z, mic_amplitude, mic_frequency, received_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (reading.reading_id, reading.status, reading.temperature, reading.humidity,
                 reading.accel_x, reading.accel_y, reading.accel_z,
                 reading.gyro_x, reading.gyro_y, reading.gyro_z,
                 reading.mic_amplitude, reading.mic_frequency, reading.received_at)
            )
            await db.commit()

    async def list_sensor_readings(self) -> List[dict]:
        """List all sensor readings as raw dicts."""
        readings = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT reading_id, status, temperature, humidity, accel_x, accel_y, accel_z,
                          gyro_x, gyro_y, gyro_z, mic_amplitude, mic_frequency, received_at
                   FROM sensor_readings ORDER BY received_at"""
            ) as cursor:
                async for row in cursor:
                    readings.append({
                        "reading_id": row[0],
                        "status": row[1],
                        "temperature": row[2],
                        "humidity": row[3],
                        "accel": {"x": row[4], "y": row[5], "z": row[6]},
                        "gyro": {"x": row[7], "y": row[8], "z": row[9]},
                        "mic": {"amplitude": row[10], "frequency": row[11]},
                        "received_at": row[12]
                    })
        return readings

    # --- Danger Zones ---

    async def save_danger_zone(self, zone: DangerZone) -> None:
        """Save danger zone."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO danger_zones
                   (zone_id, category, disaster_type, severity, lat, lon, radius,
                    is_active, detected_at, expires_at, description, recommended_action)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (zone.zone_id, zone.category, zone.disaster_type, zone.severity,
                 zone.lat, zone.lon, zone.radius, 1 if zone.is_active else 0,
                 zone.detected_at, zone.expires_at, zone.description, zone.recommended_action)
            )
            await db.commit()

    async def list_danger_zones(self) -> List[dict]:
        """List all danger zones as raw dicts."""
        zones = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT zone_id, category, disaster_type, severity, lat, lon, radius,
                          is_active, detected_at, expires_at, description, recommended_action
                   FROM danger_zones ORDER BY detected_at DESC"""
            ) as cursor:
                async for row in cursor:
                    zones.append({
                        "zone_id": row[0],
                        "category": row[1],
                        "disaster_type": row[2],
                        "severity": row[3],
                        "lat": row[4],
                        "lon": row[5],
                        "radius": row[6],
                        "is_active": bool(row[7]),
                        "detected_at": row[8],
                        "expires_at": row[9],
                        "description": row[10],
                        "recommended_action": row[11]
                    })
        return zones

    # --- Hospitals ---

    async def save_hospital(self, hospital: Hospital) -> None:
        """Save hospital."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO hospitals
                   (hospital_id, name, lat, lon, total_beds, available_beds,
                    icu_beds, available_icu, er_beds, available_er,
                    pediatric_beds, available_pediatric, contact_phone, last_updated)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (hospital.hospital_id, hospital.name, hospital.lat, hospital.lon,
                 hospital.total_beds, hospital.available_beds,
                 hospital.icu_beds, hospital.available_icu,
                 hospital.er_beds, hospital.available_er,
                 hospital.pediatric_beds, hospital.available_pediatric,
                 hospital.contact_phone, hospital.last_updated)
            )
            await db.commit()

    async def list_hospitals(self) -> List[dict]:
        """List all hospitals as raw dicts."""
        hospitals = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT hospital_id, name, lat, lon, total_beds, available_beds,
                          icu_beds, available_icu, er_beds, available_er,
                          pediatric_beds, available_pediatric, contact_phone, last_updated
                   FROM hospitals ORDER BY name"""
            ) as cursor:
                async for row in cursor:
                    hospitals.append({
                        "hospital_id": row[0],
                        "name": row[1],
                        "lat": row[2],
                        "lon": row[3],
                        "total_beds": row[4],
                        "available_beds": row[5],
                        "icu_beds": row[6],
                        "available_icu": row[7],
                        "er_beds": row[8],
                        "available_er": row[9],
                        "pediatric_beds": row[10],
                        "available_pediatric": row[11],
                        "contact_phone": row[12],
                        "last_updated": row[13]
                    })
        return hospitals

    # --- Extracted Entities ---

    async def save_extracted_entity(self, entity: ExtractedEntity) -> None:
        """Save extracted entity."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO extracted_entities
                   (entity_id, source_type, source_id, entity_type, urgency, status,
                    needs, location_mentioned, medical_keywords, extracted_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (entity.entity_id, entity.source_type, entity.source_id, entity.entity_type,
                 entity.urgency, entity.status, ','.join(entity.needs),
                 entity.location_mentioned, ','.join(entity.medical_keywords), entity.extracted_at)
            )
            await db.commit()

    async def list_extracted_entities(self) -> List[dict]:
        """List all extracted entities as raw dicts."""
        entities = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                """SELECT entity_id, source_type, source_id, entity_type, urgency, status,
                          needs, location_mentioned, medical_keywords, extracted_at
                   FROM extracted_entities ORDER BY extracted_at DESC"""
            ) as cursor:
                async for row in cursor:
                    entities.append({
                        "entity_id": row[0],
                        "source_type": row[1],
                        "source_id": row[2],
                        "entity_type": row[3],
                        "urgency": row[4],
                        "status": row[5],
                        "needs": row[6].split(',') if row[6] else [],
                        "location_mentioned": row[7],
                        "medical_keywords": row[8].split(',') if row[8] else [],
                        "extracted_at": row[9]
                    })
        return entities


# Global database instance
db = PostgresDB()

# Re-export functions with same signature as firestore module
async def init_db():
    """Initialize database (no longer wipes on startup to preserve seeded data)."""
    await db.init_db()
    # Removed wipe_db() call to preserve data across restarts
    print("Database initialized (data preserved)")

async def ensure_user_exists(user_id: str, role: str = "civilian", status: str = "normal", preferred_language: str = "en") -> None:
    await db.ensure_user_exists(user_id, role, status, preferred_language)

async def save_user(user: User) -> None:
    await db.save_user(user)

async def get_user(user_id: str) -> Optional[User]:
    return await db.get_user(user_id)

async def append_location(user_id: str, location: LocationPoint) -> None:
    await db.append_location(user_id, location)

async def append_call(user_id: str, call: Call) -> None:
    await db.append_call(user_id, call)

async def list_users() -> List[dict]:
    return await db.list_users()

async def save_news(article: NewsArticle) -> None:
    await db.save_news(article)

async def get_news(article_id: str) -> Optional[NewsArticle]:
    return await db.get_news(article_id)

async def list_news() -> List[dict]:
    return await db.list_news()

async def save_sensor_reading(reading: SensorReading) -> None:
    await db.save_sensor_reading(reading)

async def list_sensor_readings() -> List[dict]:
    return await db.list_sensor_readings()

async def save_danger_zone(zone: DangerZone) -> None:
    await db.save_danger_zone(zone)

async def list_danger_zones() -> List[dict]:
    return await db.list_danger_zones()

async def save_hospital(hospital: Hospital) -> None:
    await db.save_hospital(hospital)

async def list_hospitals() -> List[dict]:
    return await db.list_hospitals()

async def save_extracted_entity(entity: ExtractedEntity) -> None:
    await db.save_extracted_entity(entity)

async def list_extracted_entities() -> List[dict]:
    return await db.list_extracted_entities()


# === Additional GET API functions for data_client.py ===

async def get_all_users_with_data() -> List[dict]:
    """Get all users with their location history and calls as dicts."""
    return await db.list_users()


async def get_user_with_data(user_id: str) -> Optional[dict]:
    """Get a specific user with location history and calls as dict."""
    user = await db.get_user(user_id)
    if user is None:
        return None
    return {
        "user_id": user.user_id,
        "role": user.role,
        "location_history": [
            {"lat": lp.lat, "lon": lp.lon, "timestamp": lp.timestamp, "accuracy": lp.accuracy}
            for lp in user.location_history
        ],
        "calls": [
            {"call_id": c.call_id, "transcript": c.transcript, "start_time": c.start_time, "end_time": c.end_time}
            for c in user.calls
        ]
    }


async def get_all_locations() -> List[dict]:
    """Get all location points from all users in a flat array."""
    locations = []
    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute(
            "SELECT user_id, lat, lon, timestamp, accuracy FROM location_points ORDER BY timestamp"
        ) as cursor:
            async for row in cursor:
                locations.append({
                    "user_id": row[0],
                    "lat": row[1],
                    "lon": row[2],
                    "timestamp": row[3],
                    "accuracy": row[4]
                })
    return locations


async def get_locations_for_user(user_id: str) -> List[dict]:
    """Get location history for a specific user."""
    locations = []
    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute(
            "SELECT lat, lon, timestamp, accuracy FROM location_points WHERE user_id = ? ORDER BY timestamp",
            (user_id,)
        ) as cursor:
            async for row in cursor:
                locations.append({
                    "lat": row[0],
                    "lon": row[1],
                    "timestamp": row[2],
                    "accuracy": row[3]
                })
    return locations


async def get_all_calls() -> List[dict]:
    """Get all emergency calls from all users."""
    calls = []
    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute(
            "SELECT call_id, user_id, transcript, start_time, end_time, tags FROM calls ORDER BY start_time"
        ) as cursor:
            async for row in cursor:
                # Handle both JSON array and comma-separated formats
                if row[5]:
                    try:
                        tags = json.loads(row[5]) if row[5].startswith('[') else row[5].split(',')
                    except:
                        tags = row[5].split(',') if ',' in row[5] else [row[5]]
                else:
                    tags = []
                calls.append({
                    "call_id": row[0],
                    "user_id": row[1],
                    "transcript": row[2],
                    "start_time": row[3],
                    "end_time": row[4],
                    "tags": tags
                })
    return calls


async def get_calls_for_user(user_id: str) -> List[dict]:
    """Get calls for a specific user."""
    calls = []
    async with aiosqlite.connect(db.db_path) as conn:
        async with conn.execute(
            "SELECT call_id, transcript, start_time, end_time, tags FROM calls WHERE user_id = ? ORDER BY start_time",
            (user_id,)
        ) as cursor:
            async for row in cursor:
                # Handle both JSON array and comma-separated formats
                if row[4]:
                    try:
                        tags = json.loads(row[4]) if row[4].startswith('[') else row[4].split(',')
                    except:
                        tags = row[4].split(',') if ',' in row[4] else [row[4]]
                else:
                    tags = []
                calls.append({
                    "call_id": row[0],
                    "transcript": row[1],
                    "start_time": row[2],
                    "end_time": row[3],
                    "tags": tags
                })
    return calls


async def get_all_news() -> List[dict]:
    """Get all news articles."""
    return await db.list_news()


async def get_news_by_id(article_id: str) -> Optional[dict]:
    """Get a specific news article as dict."""
    article = await db.get_news(article_id)
    if article is None:
        return None
    return {
        "article_id": article.article_id,
        "link": article.link,
        "title": article.title,
        "pub_date": article.pub_date,
        "disaster": article.disaster,
        "location_name": article.location_name,
        "received_at": article.received_at,
        "lat": article.lat,
        "lon": article.lon
    }


async def get_all_sensors() -> List[dict]:
    """Get all sensor readings."""
    return await db.list_sensor_readings()
