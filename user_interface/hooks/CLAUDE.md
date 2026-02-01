# Custom React Hooks - /user_interface/hooks/

## Purpose

This directory contains custom React hooks that provide core functionality for the emergency response application's user interface. These hooks handle:

- **Real-time communication** via WebSockets to backend services
- **Voice conversation** integration with ElevenLabs AI
- **GPS location tracking** for emergency responder positioning
- **Responsive design** utilities for mobile/desktop detection

These hooks are designed for client-side use (Next.js "use client" components) and manage complex stateful operations like network connections, browser APIs, and real-time data streams.

---

## Hooks Overview

### 1. useElevenLabsConversation

**File:** `/user_interface/hooks/use-elevenlabs-conversation.ts`

**Purpose:** Manages voice-based AI conversations using the ElevenLabs conversational AI SDK.

**Key Features:**
- Establishes signed WebSocket connection to ElevenLabs API
- Manages microphone permission and audio input
- Tracks conversation state (idle, connecting, connected, disconnected, error)
- Handles conversation mode switching (listening vs speaking)
- Records bidirectional message history (AI and user)
- Provides volume and mute controls
- Dynamically imports ElevenLabs SDK to reduce bundle size

**Usage Pattern:**
```typescript
const {
  startConversation,
  endConversation,
  status,
  mode,
  messages,
  isConnected,
  setMicMuted,
  setVolume
} = useElevenLabsConversation({
  onConnect: (conversationId) => console.log('Connected:', conversationId),
  onMessage: (msg) => console.log('New message:', msg),
  onModeChange: (mode) => console.log('Mode:', mode)
})
```

**API Integration:**
- Fetches signed URL from `/api/elevenlabs/signed-url`
- Uses `@elevenlabs/client` package (dynamically imported)
- Requires microphone permission via `navigator.mediaDevices.getUserMedia`

**State Management:**
- `status`: ConversationStatus ("idle" | "connecting" | "connected" | "disconnected" | "error")
- `mode`: ConversationMode ("listening" | "speaking")
- `messages`: Array of Message objects with role, content, timestamp
- `error`: Error object when connection fails

**Cleanup:** Automatically ends conversation session on component unmount

---

### 2. useGeolocation

**File:** `/user_interface/hooks/use-geolocation.ts`

**Purpose:** Provides high-accuracy GPS tracking using the browser's Geolocation API for emergency response scenarios.

**Key Features:**
- Continuous position watching with `watchPosition()` API
- High accuracy mode (GPS-based) enabled by default
- Permission state monitoring and management
- Location history buffer for batch server uploads
- Configurable throttling to reduce server load
- Comprehensive error handling with descriptive messages
- Single-shot position retrieval via `getCurrentPosition()`

**Usage Pattern:**
```typescript
const {
  position,
  error,
  permissionState,
  isWatching,
  startWatching,
  stopWatching,
  locationHistory,
  clearHistory
} = useGeolocation({
  enableHighAccuracy: true,
  throttleMs: 3000,
  maxHistoryLength: 100,
  onPositionUpdate: (pos) => sendToServer(pos),
  autoStart: false
})
```

**Configuration Options:**
- `enableHighAccuracy`: Use GPS instead of wifi/cell triangulation (default: true)
- `timeout`: Max time to wait for position (default: 10000ms)
- `maximumAge`: Max age of cached position (default: 0 = always fresh)
- `throttleMs`: Min time between updates (default: 3000ms)
- `maxHistoryLength`: Max positions in history buffer (default: 100)
- `autoStart`: Start watching on mount (default: false)

**Data Types:**
```typescript
interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number          // in meters
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null    // degrees from true north
  speed: number | null      // meters per second
  timestamp: number
}
```

**Permission States:** "granted" | "denied" | "prompt" | "unsupported"

**Error Codes:**
- `1`: Permission denied
- `2`: Position unavailable (GPS signal issue)
- `3`: Timeout

**Cleanup:** Automatically clears watch on component unmount

---

### 3. useServerWebSocket

**File:** `/user_interface/hooks/use-server-websocket.ts`

**Purpose:** Manages WebSocket connections to backend server for real-time location and transcript streaming.

**Key Features:**
- Dual WebSocket connections (location + transcript)
- Connection lifecycle management (connect/disconnect)
- Auto-reconnection logic via status monitoring
- Message sending with readyState validation
- Feature flag support via `WEBSOCKET_ENABLED`
- Session ID generation utility

**Usage Pattern:**
```typescript
const {
  status,
  sendLocation,
  sendTranscript,
  connect,
  disconnect,
  isConnected
} = useServerWebSocket({
  userId: 'responder_123',
  onStatusChange: (status) => console.log('WS Status:', status),
  onError: (error) => console.error('WS Error:', error),
  onMessage: (data) => console.log('Message:', data)
})
```

**WebSocket Endpoints:**
- Location: `ws://localhost:8080/phone_location_in`
- Transcript: `ws://localhost:8080/phone_transcript_in`
- Base URL configurable via `NEXT_PUBLIC_WS_URL` env variable

**Message Formats:**

Location payload:
```typescript
{
  user_id: string
  lat: number
  lon: number
  timestamp: number
  accuracy?: number
}
```

Transcript payload:
```typescript
{
  user_id: string
  data: {
    transcript: {
      text: string
      is_final: boolean
    }
  }
}
```

**Status States:** "disconnected" | "connecting" | "connected" | "error"

**Helper Functions:**
- `generateSessionId()`: Creates unique session identifier

**Connection Management:**
- Maintains two separate WebSocket refs for location and transcript streams
- Closes existing connections before creating new ones
- Validates WebSocket readyState before sending messages

**Cleanup:** Closes both WebSocket connections on component unmount

---

### 4. useIsMobile (Duplicate Files)

**Files:**
- `/user_interface/hooks/use-mobile.ts`
- `/user_interface/hooks/use-mobile.tsx`

**Note:** These are identical implementations. Consider removing the duplicate.

**Purpose:** Detects mobile viewport size using media queries for responsive UI rendering.

**Key Features:**
- Uses `window.matchMedia()` for efficient breakpoint detection
- Listens for viewport resize events
- Returns boolean flag for mobile state
- SSR-safe (returns `undefined` initially, then boolean)

**Usage Pattern:**
```typescript
const isMobile = useIsMobile()

if (isMobile) {
  return <MobileLayout />
} else {
  return <DesktopLayout />
}
```

**Configuration:**
- Mobile breakpoint: `768px`
- Mobile defined as: `width < 768px`

**Implementation Details:**
- Initial state: `undefined` (for SSR compatibility)
- Sets up MediaQueryList listener on mount
- Removes listener on unmount
- Returns `!!isMobile` to convert undefined to false

---

## Dependencies

### External Packages

- `react`: Core hooks (useState, useEffect, useCallback, useRef)
- `@elevenlabs/client`: ElevenLabs conversational AI SDK (dynamically imported)

### Browser APIs

- **Geolocation API**: `navigator.geolocation.watchPosition()`, `getCurrentPosition()`
- **Permissions API**: `navigator.permissions.query({ name: 'geolocation' })`
- **MediaDevices API**: `navigator.mediaDevices.getUserMedia({ audio: true })`
- **WebSocket API**: Native WebSocket for real-time communication
- **MediaQuery API**: `window.matchMedia()` for responsive detection

### Internal Dependencies

- `@/types/api`: TypeScript types for `TranscriptPayload`

### Environment Variables

- `NEXT_PUBLIC_WS_URL`: WebSocket server base URL (default: `ws://localhost:8080`)

---

## Common Patterns

### 1. Callback Ref Pattern

All hooks use `useRef` to store callbacks and avoid stale closures:

```typescript
const optionsRef = useRef(options)
optionsRef.current = options

// Later in callbacks:
optionsRef.current.onError?.(error)
```

This ensures callbacks always reference the latest version without triggering re-renders.

### 2. Cleanup on Unmount

Every hook implements proper cleanup in useEffect:

```typescript
useEffect(() => {
  return () => {
    // Close connections, clear watches, etc.
  }
}, [])
```

### 3. Status State Management

Hooks exposing network connections track status with string literal types:

- `useElevenLabsConversation`: "idle" | "connecting" | "connected" | "disconnected" | "error"
- `useServerWebSocket`: "disconnected" | "connecting" | "connected" | "error"
- `useGeolocation`: Uses permission states and boolean flags

### 4. Event Callbacks

All hooks accept optional event callbacks:

```typescript
interface HookOptions {
  onConnect?: (data) => void
  onDisconnect?: () => void
  onError?: (error) => void
  onMessage?: (message) => void
}
```

This allows parent components to respond to events without tight coupling.

---

## Integration Points

### With Backend Services

1. **ElevenLabs API** (via `/api/elevenlabs/signed-url`)
   - Used by: `useElevenLabsConversation`
   - Purpose: Voice AI conversations

2. **WebSocket Server** (configurable via env)
   - Used by: `useServerWebSocket`
   - Endpoints: `/phone_location_in`, `/phone_transcript_in`
   - Purpose: Real-time location and transcript streaming

### With Browser APIs

1. **Geolocation API**
   - Used by: `useGeolocation`
   - Purpose: GPS tracking for emergency responders

2. **MediaDevices API**
   - Used by: `useElevenLabsConversation`
   - Purpose: Microphone access for voice conversations

3. **WebSocket API**
   - Used by: `useServerWebSocket`
   - Purpose: Bidirectional real-time communication

### With UI Components

These hooks are designed to be imported into React components within:
- `/user_interface/components/`
- `/user_interface/app/` pages

Typical usage in a component that needs location + voice:

```typescript
"use client"

import { useGeolocation } from '@/hooks/use-geolocation'
import { useElevenLabsConversation } from '@/hooks/use-elevenlabs-conversation'
import { useServerWebSocket } from '@/hooks/use-server-websocket'

export function EmergencyResponderPage() {
  const { position, startWatching } = useGeolocation()
  const { startConversation, messages } = useElevenLabsConversation()
  const { sendLocation, connect } = useServerWebSocket({ userId: 'user_123' })

  // Wire them together...
}
```

---

## Performance Considerations

### 1. Bundle Size Optimization

- **Dynamic Imports**: `useElevenLabsConversation` dynamically imports ElevenLabs SDK to reduce initial bundle
- **Code Splitting**: Hooks in separate files enable tree-shaking

### 2. Network Efficiency

- **Throttling**: `useGeolocation` throttles position updates (default 3s) to reduce server load
- **Batching**: Location history buffer enables batch uploads instead of per-update requests
- **Connection Management**: WebSocket hooks validate readyState before sending to avoid errors

### 3. Memory Management

- **History Limits**: `useGeolocation` caps history at 100 entries by default
- **Ref Usage**: Callbacks stored in refs prevent unnecessary re-renders
- **Cleanup**: All hooks properly clean up on unmount to prevent memory leaks

---

## Error Handling

### Geolocation Errors

```typescript
{
  code: 1,  // Permission denied
  message: "Location permission denied. Please enable location access in your browser settings."
}
```

### WebSocket Errors

- Connection failures update status to "error"
- Error callbacks fired with Error objects
- Console logging for debugging

### ElevenLabs Errors

- API failures caught and stored in error state
- Failed microphone permission prevents connection
- Signed URL fetch failures prevent session start

---

## Testing Considerations

### Mock Points

1. **Browser APIs**:
   - Mock `navigator.geolocation`
   - Mock `navigator.mediaDevices.getUserMedia`
   - Mock `navigator.permissions.query`
   - Mock `window.matchMedia`

2. **WebSocket**:
   - Mock WebSocket constructor
   - Test with `WEBSOCKET_ENABLED = false`

3. **Network Requests**:
   - Mock `/api/elevenlabs/signed-url` endpoint

### Test Scenarios

- Permission states (granted, denied, prompt)
- Connection lifecycle (connect -> disconnect -> reconnect)
- Error conditions (timeout, network failure, permission denial)
- Throttling behavior (location updates)
- Cleanup on unmount

---

## Future Improvements

1. **Deduplicate `use-mobile` files** (remove .ts or .tsx duplicate)
2. **Add retry logic** to WebSocket connections
3. **Add exponential backoff** for failed connections
4. **Persist location history** to localStorage for offline support
5. **Add TypeScript strict mode** compliance
6. **Add unit tests** for each hook
7. **Add Storybook stories** for hook behavior visualization

---

## Quick Reference

| Hook | Primary Use Case | Browser API | Network Dependency |
|------|-----------------|-------------|-------------------|
| `useElevenLabsConversation` | Voice AI chat | MediaDevices | ElevenLabs API |
| `useGeolocation` | GPS tracking | Geolocation | None |
| `useServerWebSocket` | Real-time data streaming | WebSocket | Backend WS server |
| `useIsMobile` | Responsive UI | MediaQuery | None |

---

**Last Updated:** 2026-02-01
