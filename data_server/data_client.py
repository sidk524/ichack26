#!/usr/bin/env python3
"""
Data retrieval API endpoints for the disaster response system.
Implements GET endpoints documented in scheme.md.
"""
import time
import uuid
from aiohttp import web
from database.postgres import (
    get_all_users_with_data,
    get_user_with_data,
    get_all_locations,
    get_locations_for_user,
    get_all_calls,
    get_calls_for_user,
    get_all_news,
    get_news_by_id,
    get_all_sensors,
    ensure_user_exists,
    append_location,
    append_call,
)
from database.db import LocationPoint, Call


def register_data_routes(app: web.Application):
    """Register all data retrieval routes."""
    # Users
    app.router.add_get("/api/users", get_users_handler)
    app.router.add_get("/api/users/{user_id}", get_user_handler)

    # Locations
    app.router.add_get("/api/locations", get_locations_handler)
    app.router.add_get("/api/locations/{user_id}", get_user_locations_handler)

    # Calls
    app.router.add_get("/api/calls", get_calls_handler)
    app.router.add_get("/api/calls/{user_id}", get_user_calls_handler)

    # News
    app.router.add_get("/api/news", get_news_handler)
    app.router.add_get("/api/news/{article_id}", get_news_article_handler)

    # Sensors
    app.router.add_get("/api/sensors", get_sensors_handler)

    # Complete data dump
    app.router.add_get("/api/data/all", get_all_data_handler)

    # Seed endpoint for demo data
    app.router.add_post("/api/seed", seed_demo_data_handler)


# === User Endpoints ===

async def get_users_handler(request: web.Request) -> web.Response:
    """GET /api/users - Retrieve all users with location history and calls."""
    try:
        users = await get_all_users_with_data()
        return web.json_response({"ok": True, "users": users})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_user_handler(request: web.Request) -> web.Response:
    """GET /api/users/{user_id} - Retrieve a specific user."""
    user_id = request.match_info["user_id"]
    try:
        user = await get_user_with_data(user_id)
        if user is None:
            return web.json_response({"ok": False, "error": "User not found"}, status=404)
        return web.json_response({"ok": True, "user": user})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Location Endpoints ===

async def get_locations_handler(request: web.Request) -> web.Response:
    """GET /api/locations - Retrieve all location points from all users."""
    try:
        locations = await get_all_locations()
        return web.json_response({"ok": True, "locations": locations})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_user_locations_handler(request: web.Request) -> web.Response:
    """GET /api/locations/{user_id} - Retrieve location history for a user."""
    user_id = request.match_info["user_id"]
    try:
        locations = await get_locations_for_user(user_id)
        return web.json_response({"ok": True, "locations": locations})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Call Endpoints ===

async def get_calls_handler(request: web.Request) -> web.Response:
    """GET /api/calls - Retrieve all emergency calls."""
    try:
        calls = await get_all_calls()
        return web.json_response({"ok": True, "calls": calls})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_user_calls_handler(request: web.Request) -> web.Response:
    """GET /api/calls/{user_id} - Retrieve calls for a specific user."""
    user_id = request.match_info["user_id"]
    try:
        calls = await get_calls_for_user(user_id)
        return web.json_response({"ok": True, "calls": calls})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === News Endpoints ===

async def get_news_handler(request: web.Request) -> web.Response:
    """GET /api/news - Retrieve all news articles."""
    try:
        news = await get_all_news()
        return web.json_response({"ok": True, "news": news})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def get_news_article_handler(request: web.Request) -> web.Response:
    """GET /api/news/{article_id} - Retrieve a specific news article."""
    article_id = request.match_info["article_id"]
    try:
        article = await get_news_by_id(article_id)
        if article is None:
            return web.json_response({"ok": False, "error": "Article not found"}, status=404)
        return web.json_response({"ok": True, "article": article})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Sensor Endpoints ===

async def get_sensors_handler(request: web.Request) -> web.Response:
    """GET /api/sensors - Retrieve all sensor readings."""
    try:
        sensors = await get_all_sensors()
        return web.json_response({"ok": True, "sensors": sensors})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Complete Data Dump ===

async def get_all_data_handler(request: web.Request) -> web.Response:
    """GET /api/data/all - Retrieve complete database dump."""
    try:
        users = await get_all_users_with_data()
        news = await get_all_news()
        sensors = await get_all_sensors()

        return web.json_response({
            "ok": True,
            "data": {
                "users": users,
                "news": news,
                "sensors": sensors,
                "timestamp": time.time()
            }
        })
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Seed Demo Data ===

async def seed_demo_data_handler(request: web.Request) -> web.Response:
    """POST /api/seed - Seed database with demo users and calls for Turkey earthquake."""
    try:
        now = time.time()

        # Demo civilians in Turkey earthquake zone
        demo_civilians = [
            {
                "user_id": "civilian_turkey_001",
                "role": "civilian",
                "location": {"lat": 37.0662, "lon": 37.3833},  # Gaziantep
                "transcript": "Help! The building collapsed! I'm trapped under debris in Gaziantep. There are 3 of us here. We need help urgently!",
            },
            {
                "user_id": "civilian_turkey_002",
                "role": "civilian",
                "location": {"lat": 37.5847, "lon": 36.9371},  # Kahramanmaras
                "transcript": "Emergency! My mother is injured and can't move. The earthquake destroyed our apartment building. We're on the 3rd floor near Kahramanmaras center.",
            },
            {
                "user_id": "civilian_turkey_003",
                "role": "civilian",
                "location": {"lat": 36.4018, "lon": 36.3498},  # Hatay
                "transcript": "We're trapped in the collapsed hospital in Hatay! There are medical supplies but many people are seriously injured. Please send rescue teams!",
            },
            {
                "user_id": "civilian_turkey_004",
                "role": "civilian",
                "location": {"lat": 37.7648, "lon": 38.2786},  # Adiyaman
                "transcript": "Fire! There's a gas leak causing fire in the collapsed building in Adiyaman. 5 people are with me, some have burns.",
            },
        ]

        # Demo first responders
        demo_responders = [
            {
                "user_id": "responder_tr_001",
                "role": "first_responder",
                "location": {"lat": 37.0700, "lon": 37.3900},
            },
            {
                "user_id": "responder_tr_002",
                "role": "first_responder",
                "location": {"lat": 37.5900, "lon": 36.9400},
            },
            {
                "user_id": "responder_tr_003",
                "role": "first_responder",
                "location": {"lat": 36.4100, "lon": 36.3500},
            },
        ]

        # Create civilians with calls
        for civilian in demo_civilians:
            await ensure_user_exists(civilian["user_id"], civilian["role"])
            await append_location(
                civilian["user_id"],
                LocationPoint(
                    lat=civilian["location"]["lat"],
                    lon=civilian["location"]["lon"],
                    timestamp=now - 300,  # 5 minutes ago
                    accuracy=10.0
                )
            )
            await append_call(
                civilian["user_id"],
                Call(
                    call_id=uuid.uuid4().hex,
                    transcript=civilian["transcript"],
                    start_time=now - 600,  # 10 minutes ago
                    end_time=now - 300,    # Ended 5 minutes ago
                )
            )

        # Create first responders with locations
        for responder in demo_responders:
            await ensure_user_exists(responder["user_id"], responder["role"])
            await append_location(
                responder["user_id"],
                LocationPoint(
                    lat=responder["location"]["lat"],
                    lon=responder["location"]["lon"],
                    timestamp=now - 60,  # 1 minute ago
                    accuracy=5.0
                )
            )

        return web.json_response({
            "ok": True,
            "message": f"Seeded {len(demo_civilians)} civilians and {len(demo_responders)} first responders"
        })
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)
