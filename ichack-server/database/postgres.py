#!/usr/bin/env python3
from typing import Optional, List
from pathlib import Path

import aiosqlite

from .db import User, Call, LocationPoint, NewsArticle, SensorReading

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

            await db.commit()

    async def wipe_db(self):
        """Clear all data from tables."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM sensor_readings")
            await db.execute("DELETE FROM news_articles")
            await db.execute("DELETE FROM calls")
            await db.execute("DELETE FROM location_points")
            await db.execute("DELETE FROM users")
            await db.commit()

    # --- Users ---

    async def ensure_user_exists(self, user_id: str, role: str = "civilian") -> None:
        """Create user if they don't exist."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT OR IGNORE INTO users (user_id, role) VALUES (?, ?)",
                (user_id, role)
            )
            await db.commit()

    async def save_user(self, user: User) -> None:
        """Save user and their associated data."""
        async with aiosqlite.connect(self.db_path) as db:
            # Save or update user
            await db.execute(
                "INSERT OR REPLACE INTO users (user_id, role) VALUES (?, ?)",
                (user.user_id, user.role)
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
                await db.execute(
                    "INSERT INTO calls (call_id, user_id, transcript, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                    (call.call_id, user.user_id, call.transcript, call.start_time, call.end_time)
                )

            await db.commit()

    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user with their location history and calls."""
        async with aiosqlite.connect(self.db_path) as db:
            # Get user
            async with db.execute("SELECT user_id, role FROM users WHERE user_id = ?", (user_id,)) as cursor:
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
                "SELECT call_id, transcript, start_time, end_time FROM calls WHERE user_id = ? ORDER BY start_time",
                (user_id,)
            ) as cursor:
                async for row in cursor:
                    calls.append(Call(
                        call_id=row[0], transcript=row[1], start_time=row[2], end_time=row[3]
                    ))

            return User(
                user_id=user_row[0],
                role=user_row[1],
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
            await db.execute(
                "INSERT INTO calls (call_id, user_id, transcript, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
                (call.call_id, user_id, call.transcript, call.start_time, call.end_time)
            )
            await db.commit()

    async def list_users(self) -> List[dict]:
        """List all users as raw dicts."""
        users = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT user_id, role FROM users") as cursor:
                async for row in cursor:
                    user = await self.get_user(row[0])
                    if user:
                        users.append({
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


# Global database instance
db = PostgresDB()

# Re-export functions with same signature as firestore module
async def init_db():
    """Initialize database and wipe existing data."""
    await db.init_db()
    await db.wipe_db()
    print("Database initialized and wiped clean")

async def ensure_user_exists(user_id: str, role: str = "civilian") -> None:
    await db.ensure_user_exists(user_id, role)

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