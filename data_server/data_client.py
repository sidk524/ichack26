#!/usr/bin/env python3
"""
Data retrieval endpoints for the disaster response system.
Provides GET endpoints to access all stored data from the SQLite database.
"""
import json
from aiohttp import web

from database.postgres import (
    list_users, get_user, list_news, get_news,
    list_sensor_readings, db
)


async def get_all_users(request):
    """
    GET /api/users
    Returns all users with their complete location history and call transcripts.

    Expected output format:
    [
        {
            "user_id": "user_123",
            "role": "civilian" | "first_responder",
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
                    "end_time": 1234567895.456
                }
            ]
        }
    ]
    """
    try:
        users = await list_users()
        return web.json_response({"ok": True, "users": users})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_user_by_id(request):
    """
    GET /api/users/{user_id}
    Returns specific user with complete location history and call transcripts.

    Expected output format:
    {
        "ok": true,
        "user": {
            "user_id": "user_123",
            "role": "civilian",
            "location_history": [...],
            "calls": [...]
        }
    }

    Returns 404 if user not found.
    """
    user_id = request.match_info['user_id']
    try:
        user = await get_user(user_id)
        if not user:
            return web.json_response({"ok": False, "error": "User not found"}, status=404)

        user_dict = {
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
        return web.json_response({"ok": True, "user": user_dict})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_all_locations(request):
    """
    GET /api/locations
    Returns all location points from all users in flat array format.

    Expected output format:
    [
        {
            "user_id": "user_123",
            "lat": 51.5074,
            "lon": -0.1278,
            "timestamp": 1234567890.123,
            "accuracy": 10.5
        }
    ]
    """
    try:
        locations = []
        async with db.db_path.open() if hasattr(db.db_path, 'open') else None:
            # Use database connection to get all location points
            import aiosqlite
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

        return web.json_response({"ok": True, "locations": locations})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_locations_by_user(request):
    """
    GET /api/locations/{user_id}
    Returns all location points for specific user.

    Expected output format:
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
    """
    user_id = request.match_info['user_id']
    try:
        user = await get_user(user_id)
        if not user:
            return web.json_response({"ok": False, "error": "User not found"}, status=404)

        locations = [
            {"lat": lp.lat, "lon": lp.lon, "timestamp": lp.timestamp, "accuracy": lp.accuracy}
            for lp in user.location_history
        ]
        return web.json_response({"ok": True, "locations": locations})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_all_calls(request):
    """
    GET /api/calls
    Returns all emergency calls from all users in flat array format.

    Expected output format:
    [
        {
            "call_id": "call_abc123",
            "user_id": "user_123",
            "transcript": "Emergency at warehouse on 5th street",
            "start_time": 1234567890.123,
            "end_time": 1234567895.456
        }
    ]
    """
    try:
        calls = []
        import aiosqlite
        async with aiosqlite.connect(db.db_path) as conn:
            async with conn.execute(
                "SELECT call_id, user_id, transcript, start_time, end_time FROM calls ORDER BY start_time"
            ) as cursor:
                async for row in cursor:
                    calls.append({
                        "call_id": row[0],
                        "user_id": row[1],
                        "transcript": row[2],
                        "start_time": row[3],
                        "end_time": row[4]
                    })

        return web.json_response({"ok": True, "calls": calls})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_calls_by_user(request):
    """
    GET /api/calls/{user_id}
    Returns all calls for specific user.

    Expected output format:
    {
        "ok": true,
        "calls": [
            {
                "call_id": "call_abc123",
                "transcript": "Emergency at warehouse",
                "start_time": 1234567890.123,
                "end_time": 1234567895.456
            }
        ]
    }
    """
    user_id = request.match_info['user_id']
    try:
        user = await get_user(user_id)
        if not user:
            return web.json_response({"ok": False, "error": "User not found"}, status=404)

        calls = [
            {"call_id": c.call_id, "transcript": c.transcript, "start_time": c.start_time, "end_time": c.end_time}
            for c in user.calls
        ]
        return web.json_response({"ok": True, "calls": calls})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_all_news(request):
    """
    GET /api/news
    Returns all news articles ordered by received_at timestamp.

    Expected output format:
    [
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
    """
    try:
        news = await list_news()
        return web.json_response({"ok": True, "news": news})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_news_by_id(request):
    """
    GET /api/news/{article_id}
    Returns specific news article by ID.

    Expected output format:
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

    Returns 404 if article not found.
    """
    article_id = request.match_info['article_id']
    try:
        article = await get_news(article_id)
        if not article:
            return web.json_response({"ok": False, "error": "Article not found"}, status=404)

        article_dict = {
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
        return web.json_response({"ok": True, "article": article_dict})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_all_sensors(request):
    """
    GET /api/sensors
    Returns all sensor readings ordered by received_at timestamp.

    Expected output format:
    [
        {
            "reading_id": "r1s2t3u4",
            "status": 1,
            "temperature": 25.5,
            "humidity": 60.2,
            "accel": {"x": 0.1, "y": 0.2, "z": 9.8},
            "gyro": {"x": 0.0, "y": 0.1, "z": 0.0},
            "mic": {"amplitude": 0.5, "frequency": 440.0},
            "received_at": 1234567890.123
        }
    ]
    """
    try:
        sensors = await list_sensor_readings()
        return web.json_response({"ok": True, "sensors": sensors})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_all_data(request):
    """
    GET /api/data/all
    Returns complete database dump with all data types in single response.

    Expected output format:
    {
        "ok": true,
        "data": {
            "users": [...],      // All users with location_history and calls embedded
            "news": [...],       // All news articles
            "sensors": [...],    // All sensor readings
            "timestamp": 1234567890.123  // When this snapshot was taken
        }
    }
    """
    try:
        import time

        # Fetch all data concurrently would be ideal, but we'll do sequentially for simplicity
        users = await list_users()
        news = await list_news()
        sensors = await list_sensor_readings()

        all_data = {
            "users": users,
            "news": news,
            "sensors": sensors,
            "timestamp": time.time()
        }

        return web.json_response({"ok": True, "data": all_data})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


def register_data_routes(app):
    """Register all data retrieval routes."""
    # Users
    app.router.add_get("/api/users", get_all_users)
    app.router.add_get("/api/users/{user_id}", get_user_by_id)

    # Locations
    app.router.add_get("/api/locations", get_all_locations)
    app.router.add_get("/api/locations/{user_id}", get_locations_by_user)

    # Calls
    app.router.add_get("/api/calls", get_all_calls)
    app.router.add_get("/api/calls/{user_id}", get_calls_by_user)

    # News
    app.router.add_get("/api/news", get_all_news)
    app.router.add_get("/api/news/{article_id}", get_news_by_id)

    # Sensors
    app.router.add_get("/api/sensors", get_all_sensors)

    # Complete data dump
    app.router.add_get("/api/data/all", get_all_data)
