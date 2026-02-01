# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Python backend server that ingests real-time phone transcript data (via WebSocket) and news/sensor information (via REST), processes them using Claude AI, and generates danger entity alerts. Deployed on Google Cloud Run.

## Development Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run server locally (listens on PORT env var, defaults to 8080)
python server.py

# Build and run with Docker
docker build -t ichack-server .
docker run -p 8080:8080 -e PORT=8080 ichack-server
```

## Architecture

**Core Components:**
- `server.py` - Main entry point, creates aiohttp app and registers routes from client modules
- `phone_client.py` - WebSocket handlers for phone data: `/phone_transcript_in` (transcripts, auto-closes on final) and `/phone_location_in` (locations, supports concurrent connections). Stores data in SQLite database
- `news_client.py` - REST endpoints for news (`/news_information_in`) and sensors (`/sensor_information_in`), stores data in SQLite database
- `database/postgres.py` - SQLite database implementation with async operations (named postgres.py for compatibility but uses SQLite)
- `generate_states.py` - AI state generation using Claude API (claude-sonnet-4-5), creates snapshots of current database data

**Database Schema:**
```
users (user_id, role, created_at)
location_points (id, user_id, lat, lon, timestamp, accuracy)
calls (call_id, user_id, transcript, start_time, end_time)
news_articles (article_id, link, title, description, received_at, lat, lon)
```

**Data Flow:**
```
Phone Transcript (WebSocket) ─→ SQLite Database (users/calls tables)
Phone Location (WebSocket)   ─→ SQLite Database (users/location_points tables)
News (HTTP POST)             ─→ SQLite Database (news_articles table)
                                       ↓
                              Claude AI Analysis
                                       ↓
                              /danger_entities_out
```

**Key Design Decisions:**
- SQLite file-based database persistence at `data/ichack_server.db`
- Async-first with aiohttp for concurrent I/O
- Transcript WebSocket auto-closes after receiving final transcript (`is_final == True`); location WebSocket stays open for continuous updates
- Client modules self-register routes with the app instance
- Database auto-initializes and wipes on server start

## API Endpoints

- `GET /` - Health check ("hello world")
- `GET /health` - System health
- `WS /phone_transcript_in` - WebSocket for phone transcripts (auto-closes on final)
- `WS /phone_location_in` - WebSocket for phone locations (supports concurrent connections)
- `POST /news_information_in` - News article ingestion
- `POST /sensor_information_in` - Sensor data ingestion
- `GET /danger_entities_out` - Retrieve danger entities (stub)

## Deployment

Uses Google Cloud Build (`cloudbuild.yaml`) to build Docker image and deploy to Cloud Run in us-central1.
