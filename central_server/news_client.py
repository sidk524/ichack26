#!/usr/bin/env python3
import json
import time
import uuid
from aiohttp import web

from database.postgres import save_news, list_news
from database.db import NewsArticle


async def print_news_table():
    news = await list_news()
    print(f"\n=== NEWS ARTICLES TABLE ({len(news)} articles) ===")
    print(json.dumps(news, indent=2, default=str))
    print("=" * 40)


async def _read_json(request):
    try:
        return await request.json()
    except Exception:
        return None


async def sensor_information_in(request):
    data = await _read_json(request)
    return web.json_response({"ok": True, "received": data})


async def news_information_in(request):
    data = await _read_json(request)
    if not isinstance(data, dict):
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)

    # Extract fields from incoming format
    title = data.get("title", "")
    link = data.get("link", "")
    pub_date = data.get("pubDate", "")
    disaster = data.get("disaster", False)
    location = data.get("location", {})
    location_name = location.get("name", "") if isinstance(location, dict) else ""
    lat = location.get("lat") if isinstance(location, dict) else None
    lon = location.get("long") if isinstance(location, dict) else None  # Note: "long" in input

    # Create and save news article
    article = NewsArticle(
        article_id=uuid.uuid4().hex,
        link=link,
        title=title,
        pub_date=pub_date,
        disaster=disaster,
        location_name=location_name,
        lat=lat,
        lon=lon,
        received_at=time.time(),
    )

    try:
        await save_news(article)
        print(f"News saved: {title[:50]}..." if len(title) > 50 else f"News saved: {title}")
        await print_news_table()
    except Exception as e:
        print(f"Error saving news: {e}")
        return web.json_response({"ok": False, "error": str(e)}, status=500)

    return web.json_response({
        "ok": True,
        "article_id": article.article_id,
    })


async def danger_entities_out(request):
    return web.json_response({"ok": True, "danger_entities": []})


async def news_list_out(request):
    """Return all news articles from the database."""
    try:
        articles = await list_news()
        return web.json_response(articles)
    except Exception as e:
        print(f"Error fetching news list: {e}")
        return web.json_response({"ok": False, "error": str(e)}, status=500)


def register_news_routes(app):
    app.router.add_post("/sensor_information_in", sensor_information_in)
    app.router.add_post("/news_information_in", news_information_in)
    app.router.add_get("/danger_entities_out", danger_entities_out)
    app.router.add_get("/news_list", news_list_out)
