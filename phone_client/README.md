# Emergency Call Phone Client

A robust browser-based emergency call client with:
- **High-fidelity AI voice responses** via ElevenLabs Conversational AI
- **Live GPS tracking** with full location data (lat, lng, altitude, heading, speed)
- **Real-time WebSocket communication** per SCHEMA.md protocol
- **Offline support** with message queuing
- **Mobile-first design** optimized for developing countries

## Features

### Voice AI (ElevenLabs)
- Real-time speech-to-text transcription
- High-quality AI voice responses (TTS)
- Natural conversation flow with interruption support
- Auto-reconnection with exponential backoff
- Volume control

### Live Geo Tracking
- High-accuracy GPS tracking with all location data:
  - Latitude/Longitude
  - Altitude
  - Accuracy (horizontal & vertical)
  - Heading (direction)
  - Speed
- Continuous location updates to server via WebSocket
- Visual map display (Leaflet)
- IP-based fallback when GPS unavailable
- Movement tracking with speed calculation

### Real-time Communication (WebSocket)
- Bidirectional WebSocket connection per SCHEMA.md
- Message types:
  - `call_start` - Initialize call with device info and initial location
  - `transcript_chunk` - Real-time transcripts with location
  - `agent_response` - AI agent responses for logging
  - `location_update` - Periodic location without speech
  - `call_end` - End call with duration and final location
  - `heartbeat` - Connection health monitoring
- Server responses:
  - `chunk_ack` - Transcript acknowledgment
  - `extracted_info` - LLM-extracted information
  - `summary_update` - Aggregated disaster summary
  - `heartbeat_ack` - Health check response
- HTTP fallback for downloads (`/summary`, `/caller/{id}`)

### Robustness
- Automatic reconnection on connection loss
- Offline message queuing (localStorage)
- Connection health monitoring with heartbeat
- Graceful error handling with retry logic

## Quick Start

1. **Configure ElevenLabs Agent**

   Edit `config.js`:
   ```javascript
   ELEVENLABS_AGENT_ID: 'your-agent-id-here',
   SERVER_URL: 'http://localhost:8000',
   ```

   Create an agent at [elevenlabs.io](https://elevenlabs.io):
   - Go to Conversational AI → Create Agent
   - Set first message: "This is emergency services. Please describe your emergency and location."
   - Copy the agent_id

2. **Start the mock server**
   ```bash
   cd phone_client
   python mock_server.py
   ```

3. **Serve the phone client**
   ```bash
   # In another terminal
   cd phone_client
   python -m http.server 3000
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
phone_client/
├── index.html              # Main page with full UI
├── config.js               # Configuration
├── mock_server.py          # WebSocket mock server (SCHEMA.md)
├── SCHEMA.md               # WebSocket message protocol
├── README.md               # This file
├── css/
│   └── styles.css          # Mobile-first, dark mode CSS
└── js/
    ├── app.js              # Main application orchestrator
    ├── elevenlabs.js       # Voice AI with audio playback
    ├── geomarker.js        # Live GPS tracking + map
    ├── location.js         # Backwards-compatible wrapper
    ├── server.js           # WebSocket client (SCHEMA.md)
    └── audio.js            # Microphone capture
```

## WebSocket Protocol (SCHEMA.md)

### Connection
```
wss://server.com/ws/call/{person_id}
```

### Client → Server Messages

**transcript_chunk** - Real-time transcript with full location:
```json
{
  "type": "transcript_chunk",
  "message_id": "msg_uuid_124",
  "timestamp": "2026-01-31T16:00:05.123Z",
  "data": {
    "person_id": "person_uuid_456",
    "chunk_index": 0,
    "transcript": {
      "text": "There's a fire at the warehouse",
      "is_final": true,
      "language": "en",
      "confidence": 0.95
    },
    "location": {
      "lat": 51.507351,
      "lng": -0.127758,
      "altitude": 25.5,
      "accuracy": 10.0,
      "altitude_accuracy": 5.0,
      "heading": 45.0,
      "speed": 1.2,
      "timestamp": "2026-01-31T16:00:05.000Z",
      "source": "gps"
    },
    "elevenlabs": {
      "conversation_id": "conv_abc123",
      "user_transcript": "There's a fire at the warehouse",
      "is_final": true
    }
  }
}
```

### Server → Client Messages

**extracted_info** - Real-time LLM analysis:
```json
{
  "type": "extracted_info",
  "data": {
    "extraction": {
      "location": "Warehouse on Main Street",
      "disaster_type": "fire",
      "severity": "high",
      "injuries_reported": 0,
      "people_trapped": 2,
      "hazards": ["fire", "smoke"],
      "resources_needed": ["fire_truck", "ambulance"]
    }
  }
}
```

See `SCHEMA.md` for full protocol documentation.

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------:|
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID | Required |
| `SERVER_URL` | Central server URL | `http://localhost:8000` |
| `LOCATION_UPDATE_INTERVAL` | GPS update interval (ms) | `5000` |
| `TRANSCRIPT_BATCH_DELAY` | Batch delay before sending (ms) | `500` |
| `AUDIO.SAMPLE_RATE` | Microphone sample rate | `16000` |
| `AUDIO.OUTPUT_SAMPLE_RATE` | Playback sample rate | `24000` |
| `RECONNECT.MAX_ATTEMPTS` | Max reconnection attempts | `5` |
| `PING_TIMEOUT` | Heartbeat interval (ms) | `10000` |

## Browser Requirements

- Modern browser with:
  - WebSocket API
  - Geolocation API
  - MediaDevices API (microphone)
  - Web Audio API (for playback)
- HTTPS required for microphone (localhost works for dev)

## Offline Support

When offline:
1. Messages are queued in localStorage
2. Connection indicator shows offline status
3. When back online, queue is processed automatically
4. WebSocket auto-reconnects with exponential backoff

## Accessibility

- Large touch targets for mobile
- High contrast mode support
- Reduced motion support
- Screen reader friendly
- Dark mode support

## Troubleshooting

### "Cannot connect to server"
- Ensure mock_server.py (or central server) is running on port 8000
- Check WebSocket connection in browser dev tools (Network → WS)

### "Location unavailable"
- Grant location permissions in browser
- Check HTTPS (required for geolocation on mobile)
- Falls back to IP-based location automatically

### "ElevenLabs Agent ID not configured"
- Edit `config.js` with your agent ID
- Create agent at elevenlabs.io if needed

### No audio playback
- Check volume slider is not at 0
- Ensure browser allows audio autoplay
- Try clicking the page first (user interaction required)

### WebSocket keeps disconnecting
- Check network stability
- Auto-reconnection will attempt up to 5 times
- If persistent, check server logs for errors

## Development

### Testing with Mock Server

The mock server (`mock_server.py`) implements the full SCHEMA.md protocol:
- WebSocket endpoint at `/ws/call/{person_id}`
- Chunk acknowledgments
- Mock LLM extraction (keyword-based)
- Summary aggregation and broadcast
- Heartbeat responses

```bash
# Terminal 1: Mock server
python mock_server.py

# Terminal 2: Phone client
python -m http.server 3000

# Terminal 3: Open browser
open http://localhost:3000
```

### Testing Location
Open page, verify GPS coordinates display and map updates.

### Testing Voice
Click start, speak, verify:
1. Your transcript appears
2. AI responds with voice
3. You can interrupt by speaking

### Testing WebSocket
Check mock server console for:
1. Connection established
2. Transcripts received with location
3. Chunk acknowledgments sent
4. Extracted info generated

### End-to-End Test
1. Start mock server
2. Serve phone client
3. Open in browser, grant permissions
4. Start call, speak emergency description
5. Verify:
   - Transcript appears in UI
   - Location shows on map
   - Server receives WebSocket messages
   - Extracted info updates in UI
   - Summary broadcasts to all clients
