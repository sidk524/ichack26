# Disaster Management Call Processing System

Real-time system for processing parallel emergency calls via WebSocket, extracting information with Claude LLM, and maintaining both per-caller records and an aggregate disaster summary.

## Features

- **Real-time WebSocket processing** - Handle multiple emergency calls simultaneously
- **LLM-powered extraction** - Use Claude to extract structured information from call transcripts
- **Aggregate summaries** - Automatically generate and update disaster summaries across all callers
- **Auto-reconnect client** - Robust client library with exponential backoff
- **Optimistic locking** - Safe concurrent updates to the disaster summary

## Tech Stack

- **Server**: Python FastAPI with async WebSocket support
- **Database**: MongoDB (Motor async driver)
- **LLM**: Anthropic Claude for information extraction
- **Client**: Python WebSocket client with auto-reconnect

## Quick Start

### Prerequisites

- Python 3.11+
- MongoDB 7.0+
- Anthropic API key

### 1. Clone and Setup

```bash
cd ichack26

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongo mongo:7.0

# Or use docker-compose
docker-compose up -d mongodb
```

### 4. Run the Server

```bash
uvicorn app.main:app --reload
```

### 5. Run the Example Client

```bash
# Single caller simulation
python -m client.example_usage

# Multiple callers in parallel
python -m client.example_usage multi
```

## Docker Deployment

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-key-here

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

## API Endpoints

### WebSocket

- `ws://localhost:8000/ws/call/{person_id}` - Emergency call WebSocket endpoint

### REST

- `GET /` - Root info
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with component status
- `GET /status` - Current system status
- `GET /summary` - Full disaster summary
- `GET /callers` - List all callers with extracted info
- `GET /caller/{person_id}` - Get specific caller's record

## WebSocket Protocol

### Client → Server Messages

```json
// Transcript chunk
{
  "type": "transcript_chunk",
  "payload": {
    "text": "There's a fire at...",
    "chunk_index": 0,
    "is_final": false
  }
}

// Heartbeat
{
  "type": "heartbeat",
  "payload": {}
}

// Call end
{
  "type": "call_end",
  "payload": {}
}
```

### Server → Client Messages

```json
// Connection acknowledged
{
  "type": "connection_ack",
  "payload": {
    "person_id": "caller-001",
    "status": "connected"
  }
}

// Chunk processed
{
  "type": "chunk_processed",
  "payload": {
    "chunk_index": 0,
    "extracted_info": {
      "location": "123 Industrial Drive",
      "disaster_type": "fire",
      "severity": "high",
      ...
    }
  }
}

// Summary update (broadcast)
{
  "type": "summary_update",
  "payload": {
    "summary": {
      "overall_severity": "critical",
      "total_callers": 5,
      "narrative_summary": "...",
      ...
    }
  }
}
```

## Client Library Usage

```python
import asyncio
from client.websocket_client import DisasterCallClient

async def main():
    client = DisasterCallClient(
        server_url="ws://localhost:8000",
        person_id="caller-001",
    )

    # Register callbacks
    client.on_chunk_processed(lambda idx, info: print(f"Processed: {info.severity}"))
    client.on_summary_update(lambda summary: print(f"Summary: {summary.overall_severity}"))

    async with client:
        await client.send_transcript_chunk("There's a fire at the warehouse!")
        await client.send_transcript_chunk("People are trapped!", is_final=True)
        await asyncio.sleep(5)  # Wait for processing

asyncio.run(main())
```

## Project Structure

```
ichack26/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings from env vars
│   ├── dependencies.py         # Dependency injection
│   ├── api/routes/
│   │   ├── websocket.py        # WebSocket endpoint
│   │   └── health.py           # Health check endpoints
│   ├── core/
│   │   ├── connection_manager.py  # Manages WebSocket connections
│   │   ├── call_processor.py      # Core processing logic
│   │   └── exceptions.py
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── db/
│   │   ├── mongodb.py          # MongoDB connection
│   │   └── repositories/
│   │       ├── person.py       # Person CRUD
│   │       └── summary.py      # Summary with optimistic locking
│   ├── services/llm/
│   │   ├── client.py           # Claude wrapper
│   │   └── prompts.py          # Extraction & summary prompts
│   └── utils/
│       └── logging.py          # Structured JSON logging
├── client/
│   ├── websocket_client.py     # Reusable client library
│   └── example_usage.py        # Demo script
├── tests/
├── .env.example
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | `disaster_calls` | Database name |
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Claude model to use |
| `CLAUDE_RATE_LIMIT_RPM` | `50` | Rate limit for LLM calls |
| `WS_HEARTBEAT_INTERVAL` | `30` | Heartbeat interval (seconds) |
| `WS_CONNECTION_TIMEOUT` | `60` | Connection timeout (seconds) |
| `CHUNK_BUFFER_SIZE` | `3` | Chunks to buffer before LLM call |
| `SUMMARY_UPDATE_INTERVAL` | `5` | Seconds between summary updates |

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html
```

## License

MIT
