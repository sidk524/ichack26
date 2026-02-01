#!/usr/bin/env python3
import asyncio
import os
from aiohttp import web

from news_client import register_news_routes
from phone_client import register_phone_routes
from sensor_client import register_sensor_routes
from data_client import register_data_routes
from dashboard_ws import register_dashboard_routes
from assignment_client import register_assignment_routes
from database.postgres import init_db
from mock_data import populate_mock_data
from status_inference import infer_all_statuses

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8080"))


@web.middleware
async def cors_middleware(request, handler):
    """Add CORS headers to all responses."""
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        response = web.Response()
    else:
        response = await handler(request)

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


async def root(request):
    return web.Response(text="hello world")


async def health(request):
    return web.Response(text="okay health")


async def status_checker_task():
    """Background task to periodically check and update statuses."""
    await asyncio.sleep(10)  # Wait for DB init
    while True:
        try:
            await infer_all_statuses()
        except Exception as e:
            print(f"Error in status checker: {e}")
        await asyncio.sleep(30)  # Run every 30 seconds


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
    # Start status checker background task
    asyncio.create_task(status_checker_task())


def create_app():
    app = web.Application(middlewares=[cors_middleware])

    app.on_startup.append(on_startup)
    register_phone_routes(app)
    register_news_routes(app)
    register_sensor_routes(app)
    register_data_routes(app)
    register_dashboard_routes(app)  # Real-time dashboard updates
    register_assignment_routes(app)  # Assignment tracking
    app.router.add_get("/", root)
    app.router.add_get("/health", health)

    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)
