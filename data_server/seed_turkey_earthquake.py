#!/usr/bin/env python3
"""
Seed script to pre-populate the database with Turkey earthquake news data.
Run this after starting the data_server: python seed_turkey_earthquake.py
"""
import asyncio
import aiohttp
import json

# News articles about the Turkey-Syria earthquake (February 2023)
TURKEY_EARTHQUAKE_NEWS = [
    {
        "title": "Devastating magnitude 7.8 earthquake strikes southern Turkey near Syrian border",
        "link": "https://news.example.com/turkey-earthquake-main",
        "pubDate": "2023-02-06T04:17:00Z",
        "disaster": True,
        "location": {
            "name": "Gaziantep, Turkey",
            "lat": 37.0662,
            "long": 37.3833
        }
    },
    {
        "title": "Rescue teams search for survivors trapped under collapsed buildings in Kahramanmaras",
        "link": "https://news.example.com/turkey-rescue-kahramanmaras",
        "pubDate": "2023-02-06T08:30:00Z",
        "disaster": True,
        "location": {
            "name": "Kahramanmaras, Turkey",
            "lat": 37.5847,
            "long": 36.9371
        }
    },
    {
        "title": "Second major earthquake of magnitude 7.5 hits Turkey hours after initial quake",
        "link": "https://news.example.com/turkey-second-earthquake",
        "pubDate": "2023-02-06T13:24:00Z",
        "disaster": True,
        "location": {
            "name": "Elbistan, Turkey",
            "lat": 38.2069,
            "long": 37.1986
        }
    },
    {
        "title": "Death toll rises as thousands of buildings collapse across southeastern Turkey",
        "link": "https://news.example.com/turkey-death-toll",
        "pubDate": "2023-02-07T06:00:00Z",
        "disaster": True,
        "location": {
            "name": "Hatay, Turkey",
            "lat": 36.4018,
            "long": 36.3498
        }
    },
    {
        "title": "International rescue teams arrive in Turkey to assist earthquake relief efforts",
        "link": "https://news.example.com/turkey-international-aid",
        "pubDate": "2023-02-07T14:00:00Z",
        "disaster": True,
        "location": {
            "name": "Adana, Turkey",
            "lat": 37.0017,
            "long": 35.3213
        }
    },
    {
        "title": "Survivors pulled from rubble 36 hours after devastating Turkey earthquake",
        "link": "https://news.example.com/turkey-survivors-36hrs",
        "pubDate": "2023-02-07T18:00:00Z",
        "disaster": True,
        "location": {
            "name": "Diyarbakir, Turkey",
            "lat": 37.9144,
            "long": 40.2306
        }
    },
    {
        "title": "Massive relief operation underway as Turkey declares state of emergency in 10 provinces",
        "link": "https://news.example.com/turkey-emergency-declaration",
        "pubDate": "2023-02-08T09:00:00Z",
        "disaster": True,
        "location": {
            "name": "Malatya, Turkey",
            "lat": 38.3552,
            "long": 38.3095
        }
    },
    {
        "title": "Medical teams struggle with influx of injured earthquake victims at Turkish hospitals",
        "link": "https://news.example.com/turkey-hospitals-overwhelmed",
        "pubDate": "2023-02-08T12:00:00Z",
        "disaster": True,
        "location": {
            "name": "Osmaniye, Turkey",
            "lat": 37.0746,
            "long": 36.2478
        }
    },
    {
        "title": "Freezing temperatures hamper rescue efforts in earthquake-hit Turkey",
        "link": "https://news.example.com/turkey-cold-weather",
        "pubDate": "2023-02-09T08:00:00Z",
        "disaster": True,
        "location": {
            "name": "Adiyaman, Turkey",
            "lat": 37.7648,
            "long": 38.2786
        }
    },
    {
        "title": "Miracle rescue as family of five found alive after 100 hours under rubble",
        "link": "https://news.example.com/turkey-miracle-rescue",
        "pubDate": "2023-02-10T15:00:00Z",
        "disaster": True,
        "location": {
            "name": "Sanliurfa, Turkey",
            "lat": 37.1591,
            "long": 38.7969
        }
    },
    {
        "title": "Aftershocks continue to rock southeastern Turkey as rescue operations intensify",
        "link": "https://news.example.com/turkey-aftershocks",
        "pubDate": "2023-02-11T10:00:00Z",
        "disaster": True,
        "location": {
            "name": "Kilis, Turkey",
            "lat": 36.7184,
            "long": 37.1212
        }
    },
    {
        "title": "UN launches humanitarian appeal for Turkey-Syria earthquake victims",
        "link": "https://news.example.com/un-humanitarian-appeal",
        "pubDate": "2023-02-12T16:00:00Z",
        "disaster": True,
        "location": {
            "name": "Ankara, Turkey",
            "lat": 39.9334,
            "long": 32.8597
        }
    }
]

BASE_URL = "http://localhost:8080"


async def seed_news_data():
    """Send all news articles to the data_server."""
    async with aiohttp.ClientSession() as session:
        print(f"Seeding {len(TURKEY_EARTHQUAKE_NEWS)} Turkey earthquake news articles...")

        for i, article in enumerate(TURKEY_EARTHQUAKE_NEWS, 1):
            try:
                async with session.post(
                    f"{BASE_URL}/news_information_in",
                    json=article,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    result = await response.json()
                    if result.get("ok"):
                        print(f"  [{i}/{len(TURKEY_EARTHQUAKE_NEWS)}] Added: {article['title'][:60]}...")
                    else:
                        print(f"  [{i}/{len(TURKEY_EARTHQUAKE_NEWS)}] FAILED: {result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"  [{i}/{len(TURKEY_EARTHQUAKE_NEWS)}] ERROR: {e}")

        print("\nSeed data complete!")
        print(f"View news at: {BASE_URL}/api/news")


if __name__ == "__main__":
    asyncio.run(seed_news_data())
