#!/usr/bin/env python3
import asyncio
import os
from aiohttp import web

from news_client import register_news_routes
from phone_client import register_phone_routes
from sensor_client import register_sensor_routes
from data_client import register_data_routes
from database.postgres import init_db
from mock_data import populate_mock_data

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8080"))


async def root(request):
    return web.Response(text="hello world")


async def health(request):
    return web.Response(text="okay health")


async def init_and_log_db():
    """Background task to init DB and populate mock data."""
    try:
        await init_db()
        print("Database initialized successfully")

        # Populate mock data automatically
        print("🎭 Populating database with mock data...")
        await populate_mock_data()
        print("✅ Mock data loaded successfully")

    except Exception as e:
        print(f"Error initializing database: {e}")


async def on_startup(app):
    # Run DB init in background so server can start listening immediately
    asyncio.create_task(init_and_log_db())


def create_app():
    app = web.Application()

    app.on_startup.append(on_startup)
    register_phone_routes(app)
    register_news_routes(app)
    register_sensor_routes(app)
    register_data_routes(app)
    app.router.add_get("/", root)
    app.router.add_get("/health", health)

    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)
