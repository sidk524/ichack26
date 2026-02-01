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
    list_hospitals,
    list_danger_zones,
    save_hospital,
    save_danger_zone,
    ensure_user_exists,
    append_location,
    append_call,
)
from database.db import LocationPoint, Call, Hospital, DangerZone


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

    # Hospitals
    app.router.add_get("/api/hospitals", get_hospitals_handler)

    # Danger Zones
    app.router.add_get("/api/danger-zones", get_danger_zones_handler)

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


# === Hospital Endpoints ===

async def get_hospitals_handler(request: web.Request) -> web.Response:
    """GET /api/hospitals - Retrieve all hospitals with capacity info."""
    try:
        hospitals = await list_hospitals()
        return web.json_response({"ok": True, "hospitals": hospitals})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Danger Zone Endpoints ===

async def get_danger_zones_handler(request: web.Request) -> web.Response:
    """GET /api/danger-zones - Retrieve all active danger zones."""
    try:
        zones = await list_danger_zones()
        return web.json_response({"ok": True, "danger_zones": zones})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


# === Complete Data Dump ===

async def get_all_data_handler(request: web.Request) -> web.Response:
    """GET /api/data/all - Retrieve complete database dump."""
    try:
        users = await get_all_users_with_data()
        news = await get_all_news()
        sensors = await get_all_sensors()
        hospitals = await list_hospitals()
        danger_zones = await list_danger_zones()

        return web.json_response({
            "ok": True,
            "data": {
                "users": users,
                "news": news,
                "sensors": sensors,
                "hospitals": hospitals,
                "danger_zones": danger_zones,
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

        # Demo hospitals in Turkey
        demo_hospitals = [
            Hospital(
                hospital_id="hospital_gaziantep_001",
                name="Gaziantep University Hospital",
                lat=37.0662,
                lon=37.3833,
                total_beds=500,
                available_beds=45,
                icu_beds=50,
                available_icu=3,
                er_beds=80,
                available_er=12,
                pediatric_beds=60,
                available_pediatric=8,
                contact_phone="+90 342 360 1200",
                last_updated=now,
            ),
            Hospital(
                hospital_id="hospital_kahramanmaras_001",
                name="Kahramanmaras Necip Fazil Hospital",
                lat=37.5847,
                lon=36.9371,
                total_beds=350,
                available_beds=20,
                icu_beds=30,
                available_icu=0,
                er_beds=50,
                available_er=5,
                pediatric_beds=40,
                available_pediatric=3,
                contact_phone="+90 344 225 5000",
                last_updated=now,
            ),
            Hospital(
                hospital_id="hospital_hatay_001",
                name="Hatay State Hospital",
                lat=36.4018,
                lon=36.3498,
                total_beds=400,
                available_beds=0,  # Damaged
                icu_beds=40,
                available_icu=0,
                er_beds=60,
                available_er=0,
                pediatric_beds=50,
                available_pediatric=0,
                contact_phone="+90 326 214 5000",
                last_updated=now,
            ),
            Hospital(
                hospital_id="hospital_adana_001",
                name="Adana City Hospital",
                lat=37.0000,
                lon=35.3213,
                total_beds=1500,
                available_beds=200,
                icu_beds=150,
                available_icu=25,
                er_beds=200,
                available_er=40,
                pediatric_beds=120,
                available_pediatric=30,
                contact_phone="+90 322 455 0000",
                last_updated=now,
            ),
        ]

        for hospital in demo_hospitals:
            await save_hospital(hospital)

        # Demo danger zones for Turkey earthquake
        demo_danger_zones = [
            DangerZone(
                zone_id="zone_gaziantep_001",
                category="natural",
                disaster_type="earthquake",
                severity=5,
                lat=37.0662,
                lon=37.3833,
                radius=15000,
                is_active=True,
                detected_at=now - 7200,  # 2 hours ago
                expires_at=None,
                description="7.8 magnitude earthquake epicenter. Major structural damage, ongoing aftershocks.",
                recommended_action="evacuate",
            ),
            DangerZone(
                zone_id="zone_kahramanmaras_001",
                category="natural",
                disaster_type="earthquake",
                severity=5,
                lat=37.5847,
                lon=36.9371,
                radius=20000,
                is_active=True,
                detected_at=now - 7200,
                expires_at=None,
                description="Severe earthquake damage in Kahramanmaras province. Multiple building collapses reported.",
                recommended_action="evacuate",
            ),
            DangerZone(
                zone_id="zone_hatay_001",
                category="infrastructure",
                disaster_type="building_collapse",
                severity=5,
                lat=36.4018,
                lon=36.3498,
                radius=5000,
                is_active=True,
                detected_at=now - 6000,
                expires_at=None,
                description="Hospital and residential buildings collapsed. Active rescue operations.",
                recommended_action="avoid_area",
            ),
            DangerZone(
                zone_id="zone_adiyaman_fire_001",
                category="infrastructure",
                disaster_type="fire",
                severity=4,
                lat=37.7648,
                lon=38.2786,
                radius=2000,
                is_active=True,
                detected_at=now - 3600,
                expires_at=None,
                description="Gas leak causing fire in collapsed building. Risk of explosion.",
                recommended_action="evacuate",
            ),
            DangerZone(
                zone_id="zone_aftershock_001",
                category="natural",
                disaster_type="earthquake",
                severity=3,
                lat=37.2000,
                lon=37.0000,
                radius=50000,
                is_active=True,
                detected_at=now - 1800,
                expires_at=now + 86400,  # 24 hours
                description="Aftershock zone. Magnitude 4-5 aftershocks expected.",
                recommended_action="shelter_in_place",
            ),
        ]

        for zone in demo_danger_zones:
            await save_danger_zone(zone)

        return web.json_response({
            "ok": True,
            "message": f"Seeded {len(demo_civilians)} civilians, {len(demo_responders)} responders, {len(demo_hospitals)} hospitals, {len(demo_danger_zones)} danger zones"
        })
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)
