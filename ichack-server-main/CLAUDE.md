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
docker run -p 8080:8000 ichack-server
```

## Architecture

**Core Components:**
- `server.py` - Main entry point, creates aiohttp app and registers routes from client modules
- `phone_client.py` - WebSocket handlers for phone data: `/phone_transcript_in` (transcripts, auto-closes on final) and `/phone_location_in` (locations, supports concurrent connections). Stores in `current_phone_data` and `current_phone_location` dicts keyed by client UUID
- `news_client.py` - REST endpoints for news (`/news_information_in`) and sensors (`/sensor_information_in`), stores in `current_news_data` list
- `generate_states.py` - AI state generation using Claude API (Sonnet 4.5), creates snapshots of current in-memory data

**Data Flow:**
```
Phone Transcript (WebSocket) ─→ current_phone_data[client_id]
Phone Location (WebSocket)   ─→ current_phone_location[client_id]
News (HTTP POST)             ─→ current_news_data[]
                                       ↓
                              Claude AI Analysis
                                       ↓
                              /danger_entities_out
```

**Key Design Decisions:**
- In-memory storage via global variables (no database persistence)
- Async-first with aiohttp for concurrent I/O
- Transcript WebSocket auto-closes after receiving final transcript (`is_final == True`); location WebSocket stays open for continuous updates
- Client modules self-register routes with the app instance

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
