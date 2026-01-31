#!/usr/bin/env python3
import os
from aiohttp import web

from news_client import register_news_routes
from phone_client import register_phone_routes

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8080"))


async def root(request):
    return web.Response(text="hello world")


async def health(request):
    return web.Response(text="okay health")


def create_app():
    app = web.Application()

    register_phone_routes(app)
    register_news_routes(app)
    app.router.add_get("/", root)
    app.router.add_get("/health", health)

    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)
