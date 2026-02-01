# ichack26 - Disaster Response System

## Project Overview

A real-time disaster management and emergency response system that processes emergency phone calls, news articles, and sensor data through AI to coordinate first responders, hospitals, and civilians during crisis situations.

**Core Capabilities:**
- Real-time emergency call processing with AI voice agents
- Automated news aggregation and disaster detection
- GPS tracking and dispatch coordination
- Hospital capacity management
- 3D visualization of response units and incidents
- Claude AI-powered danger entity extraction

## Architecture

### Microservices Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   news_server       │         │  Emergency Callers  │
│   (Go + Python)     │         │  (Mobile/Web)       │
│                     │         │                     │
│   • Fetch news      │         └──────────┬──────────┘
│   • Process data    │                    │
│   • Stream to API   │                    │ WebSocket
└─────────┬───────────┘                    │
          │ HTTP POST                      │
          ▼                                ▼
    ┌─────────────────────────────────────────────┐
    │         data_server (Python)                │
    │         • WebSocket handlers                │
    │         • REST API endpoints                │
    │         • SQLite database                   │
    │         • Claude AI processing              │
    └───────────────────┬─────────────────────────┘
                        │ REST API / WebSocket
                        ▼
    ┌─────────────────────────────────────────────┐
    │      user_interface (Next.js)               │
    │      • Responder Dashboard                  │
    │      • Hospital Dashboard                   │
    │      • Emergency Call Interface             │
    │      • Real-time updates                    │
    └─────────────────────────────────────────────┘
```

### System Data Flow

1. **Input Sources** → data_server
   - Emergency calls via WebSocket (location + transcripts)
   - News articles via HTTP POST from news_server
   - Sensor data via HTTP POST

2. **Processing** → data_server + Claude AI
   - Store in SQLite database
   - Extract danger entities with Claude
   - Generate real-time state updates

3. **Output** → user_interface
   - REST API for historical data
   - WebSocket for real-time updates
   - Dashboard visualizations

## Directory Structure

```
ichack26/
├── data_server/              # Python backend (see data_server/CLAUDE.md)
│   ├── database/            # SQLite layer (see database/CLAUDE.md)
│   ├── server.py            # Main aiohttp server
│   ├── phone_client.py      # WebSocket handlers
│   ├── news_client.py       # News REST endpoints
│   ├── sensor_client.py     # Sensor REST endpoints
│   └── generate_states.py   # Claude AI integration
│
├── news_server/             # News aggregation (see news_server/CLAUDE.md)
│   ├── turkey/             # Turkey earthquake data (see turkey/CLAUDE.md)
│   ├── main.go             # Go HTTP client
│   └── *.py                # Python news fetchers/processors
│
├── user_interface/          # Next.js frontend (see user_interface/CLAUDE.md)
│   ├── app/                # Next.js pages (see app/CLAUDE.md)
│   ├── components/         # React components (see components/CLAUDE.md)
│   ├── hooks/              # Custom hooks (see hooks/CLAUDE.md)
│   └── types/              # TypeScript types (see types/CLAUDE.md)
│
├── .env.example            # Environment variables template
├── README.md               # Detailed setup guide
└── pyproject.toml          # Python project config
```

## Quick Start

### Prerequisites
- Python 3.11+ (for data_server)
- Node.js 18+ (for user_interface)
- Go 1.21+ (for news_server)
- Docker (optional, for containerized deployment)

### Running the System

**1. Start data_server:**
```bash
cd data_server
pip install -r requirements.txt
python server.py
# Runs on http://localhost:8080
```

**2. Start user_interface:**
```bash
cd user_interface
npm install
npm run dev
# Runs on http://localhost:3000
```

**3. Start news_server (optional):**
```bash
cd news_server
go run main.go -file balanced_news_dataset.json
# Streams news to data_server
```

### Environment Variables

**data_server (.env):**
```bash
ANTHROPIC_API_KEY=your_key_here
WEBSOCKET_PORT=8080
```

**user_interface (.env.local):**
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
ELEVENLABS_API_KEY=your_elevenlabs_key
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

See `.env.example` for complete list.

## Key Features

### 1. Emergency Call Processing
- AI voice agent powered by ElevenLabs + GPT-4o
- Real-time GPS tracking during calls
- Live transcript streaming to backend
- Mobile-optimized emergency interface

### 2. First Responder Dashboard
- Real-time incident feed with filtering
- 3D vehicle tracking on Mapbox
- Unit dispatch and status management
- Advanced data tables with sorting/filtering

### 3. Hospital Coordination
- Network-wide capacity tracking
- Bed availability by category (ICU, ER, General, Pediatric)
- Incoming patient transport information
- Real-time status updates

### 4. News Intelligence
- Automated disaster news aggregation
- 70+ news categories monitored
- LLM-based location extraction
- Balanced dataset creation (disasters + regular news)

### 5. AI-Powered Analysis
- Claude AI danger entity extraction
- Real-time state generation
- Pattern recognition across data sources
- Turkey earthquake case study with multiple extraction methods

## Technology Stack

### Backend (data_server)
- **Runtime:** Python 3.11+
- **Framework:** aiohttp (async HTTP)
- **Database:** SQLite with aiosqlite
- **AI:** Claude API (Anthropic)
- **Deployment:** Docker + Google Cloud Run

### Frontend (user_interface)
- **Framework:** Next.js 16 + React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 (OKLCH colors)
- **UI Library:** shadcn/ui (Radix primitives)
- **Maps:** Mapbox GL JS + Three.js (3D models)
- **Voice AI:** ElevenLabs Conversational AI
- **Charts:** Recharts
- **Tables:** TanStack Table

### News Aggregation (news_server)
- **Server:** Go 1.21+
- **Data Processing:** Python 3.11+
- **NLP:** Transformers (BERT, T5-Flan)
- **Scraping:** BeautifulSoup, requests
- **Geocoding:** Nominatim, Geopy

## Deployment

### Production Architecture
- **data_server:** Docker container on Google Cloud Run (us-central1)
- **news_server:** Go binary (standalone or containerized)
- **user_interface:** Vercel or similar Next.js host

### Docker Deployment (data_server)
```bash
cd data_server
docker build -t disaster-data-server .
docker run -p 8080:8080 -e ANTHROPIC_API_KEY=xxx disaster-data-server
```

### CI/CD
- GitHub Actions workflow for Android APK builds (`.github/workflows/main.yml`)
- Google Cloud Build for data_server deployment (`data_server/cloudbuild.yaml`)

## Development Workflow

### Adding New Features
1. **Backend API:** Modify `data_server/` files, update database schema if needed
2. **Frontend UI:** Add components in `user_interface/components/`, update pages in `user_interface/app/`
3. **News Processing:** Add new categories or extractors in `news_server/`

### Common Tasks
- **View logs:** `docker logs <container_id>` (data_server)
- **Inspect database:** `sqlite3 data_server/data/disaster_calls.db`
- **Test WebSocket:** Visit `http://localhost:3000/test-ws`
- **Stream news:** `cd news_server && go run main.go -file <json_file>`

### Code Organization Patterns
- **data_server:** Async/await throughout, wipes DB on startup (dev mode)
- **user_interface:** Server components by default, client components marked explicitly
- **news_server:** Separate fetch (Python) and stream (Go) responsibilities

## Project Status

### Completed
✅ Real-time WebSocket communication (location + transcripts)
✅ AI voice emergency interface with ElevenLabs
✅ 3D vehicle tracking with Three.js models
✅ Hospital capacity management
✅ News aggregation pipeline (70+ categories)
✅ Claude AI danger entity extraction
✅ Turkey earthquake case study with multiple extraction methods
✅ SQLite database with full CRUD operations
✅ Docker + Google Cloud Run deployment

### Future Enhancements
- [ ] PostgreSQL migration for production scale
- [ ] Authentication and multi-tenancy
- [ ] Historical analytics and reporting
- [ ] Mobile app for first responders
- [ ] Machine learning for incident prediction
- [ ] Integration with official emergency services APIs
- [ ] Real-time sensor network integration
- [ ] Advanced Claude AI analysis (impact assessment, resource optimization)

## Related Documentation

- **data_server:** See `data_server/CLAUDE.md` for backend API details
  - **database:** See `data_server/database/CLAUDE.md` for schema and models
- **news_server:** See `news_server/CLAUDE.md` for news aggregation pipeline
  - **turkey:** See `news_server/turkey/CLAUDE.md` for earthquake case study
- **user_interface:** See `user_interface/CLAUDE.md` for frontend architecture
  - **app:** See `user_interface/app/CLAUDE.md` for page routing
  - **components:** See `user_interface/components/CLAUDE.md` for UI components
  - **hooks:** See `user_interface/hooks/CLAUDE.md` for custom React hooks
  - **types:** See `user_interface/types/CLAUDE.md` for TypeScript definitions
- **Setup Guide:** See `README.md` for detailed setup instructions
- **Data Model:** See `user_interface/DATA_MODEL.md` for mission and data structures

## Key Contacts & Resources

- **Anthropic API:** https://console.anthropic.com
- **ElevenLabs:** https://elevenlabs.io
- **Mapbox:** https://www.mapbox.com
- **shadcn/ui:** https://ui.shadcn.com

---

**Built for iChack 2026** - A comprehensive disaster response system leveraging AI, real-time communication, and intelligent data processing to save lives during emergencies.
