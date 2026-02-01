# User Interface - Emergency Disaster Response System

## Purpose

The `user_interface/` directory contains a Next.js 16 web application providing real-time dashboards and communication interfaces for emergency disaster response. It serves three primary user types: first responders dispatching emergency units, hospital workers managing capacity, and civilians in danger requesting help via AI voice agents.

The application enables real-time coordination through:
- Interactive 3D maps with vehicle tracking and incident heatmaps
- Live incident monitoring and management dashboards
- Hospital capacity tracking and patient routing
- AI-powered voice call interface with emergency operator
- WebSocket-based real-time location and transcript streaming

This system is the frontend companion to the `data_server/` backend, which handles WebSocket connections, database operations, and data processing.

---

## Tech Stack

### Core Framework
- **Next.js 16.1.6**: React framework with App Router for server/client components
- **React 19.2.3**: UI library with latest concurrent features
- **TypeScript 5**: Type-safe development with strict mode

### UI & Styling
- **Tailwind CSS 4**: Utility-first CSS framework with custom design system
- **shadcn/ui**: 55+ accessible Radix UI-based components (radix-mira style)
- **Geist Font**: Sans (primary) and Mono (code) typefaces
- **OKLCH Color Space**: Modern color system for theme tokens
- **Container Queries**: Responsive layouts with `@container/main`

### Map & Visualization
- **Mapbox GL JS 3.18.1**: Interactive maps, heatmaps, custom layers
- **Three.js 0.182.0**: 3D vehicle models (firetrucks, ambulances) on maps
- **Recharts 2.15.4**: Charts and data visualization
- **TanStack Table 8.21.3**: Advanced tables with sorting/filtering

### AI & Real-Time Communication
- **ElevenLabs Client 0.13.1**: Conversational AI for emergency voice calls
- **WebSocket API**: Real-time location and transcript streaming to `data_server`
- **Geolocation API**: High-accuracy GPS tracking for field units

### Animation & Interactivity
- **Rive WebGL2 4.26.2**: State-driven AI persona animations
- **dnd-kit 6.3.1**: Drag-and-drop interactions
- **Framer Motion** (via tw-animate-css): Animation utilities

### Data Management
- **Zod 4.3.6**: Schema validation for API responses
- **date-fns 4.1.0**: Date manipulation and formatting

### Development Tools
- **ESLint 9**: Code linting with Next.js config
- **PostCSS**: CSS processing with Tailwind plugin

---

## Architecture

### App Router Structure

```
user_interface/
├── app/                      # Next.js App Router pages and API routes
│   ├── api/                  # Server-side API route handlers
│   │   └── elevenlabs/       # ElevenLabs AI agent integration
│   ├── dashboard/            # Protected dashboard pages
│   │   ├── page.tsx          # Main dispatcher dashboard
│   │   ├── civilians/        # Civilian tracking page
│   │   └── hospitals/        # Hospital capacity page
│   ├── emergency/            # Public emergency call interface
│   ├── test-ws/              # WebSocket testing utility
│   ├── layout.tsx            # Root layout with fonts and theme
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles and theme tokens
├── components/               # React components
│   ├── ui/                   # 55 shadcn/ui primitive components
│   ├── ai-elements/          # AI persona animations
│   └── *.tsx                 # Custom application components
├── hooks/                    # Custom React hooks
│   ├── use-elevenlabs-conversation.ts
│   ├── use-geolocation.ts
│   ├── use-server-websocket.ts
│   └── use-mobile.tsx
├── types/                    # TypeScript type definitions
│   └── api.ts                # API contracts and data models
├── public/                   # Static assets
│   ├── 3d_models/            # GLTF models for vehicles
│   └── *.svg                 # Icons and graphics
├── docs/                     # Documentation (if any)
├── ui/                       # Additional UI utilities (if any)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── next.config.ts            # Next.js configuration
├── components.json           # shadcn/ui configuration
├── postcss.config.mjs        # PostCSS configuration
└── eslint.config.mjs         # ESLint configuration
```

### Component Architecture

**Server Components (Default)**
- Dashboard pages (`/dashboard`, `/dashboard/civilians`, `/dashboard/hospitals`)
- Static pages with data fetching at build/request time
- SEO-friendly, reduced client bundle

**Client Components ("use client")**
- Interactive components requiring browser APIs
- `emergency-call.tsx`: Voice AI, geolocation, WebSocket
- `disaster-map.tsx`: Mapbox, Three.js rendering
- `incident-feed.tsx`: Real-time table interactions
- All components in `hooks/` directory

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Civilian       │────▶│  ElevenLabs API  │     │  Next.js UI     │
│  (Phone Call)   │     │  (Voice AI)      │     │  (Dashboard)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                 │
         │ GPS Location                                    │
         │ Transcript                                      │
         ▼                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              WebSocket Server (data_server/)                    │
│  ┌──────────────────────┐    ┌─────────────────────────┐       │
│  │ /phone_location_in   │    │ /phone_transcript_in    │       │
│  └──────────────────────┘    └─────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │    Database      │
                        │   (Supabase)     │
                        └──────────────────┘
                                  │
                                  ▼ (Real-time subscriptions)
                        ┌──────────────────┐
                        │  Dashboard UI    │
                        │  (Live Updates)  │
                        └──────────────────┘
```

### Styling System

**Theme Configuration**
- CSS Custom Properties in `app/globals.css`
- Light/Dark mode via `.dark` class
- OKLCH color space for modern, perceptually uniform colors
- Design tokens: `--background`, `--foreground`, `--primary`, `--secondary`, `--destructive`, etc.
- 5 chart color variants for data visualization
- Sidebar width: `calc(var(--spacing) * 72)`
- Header height: `calc(var(--spacing) * 12)`

**Component Styling**
- Utility-first with Tailwind CSS
- `cn()` utility for conditional classNames (from shadcn/ui)
- Responsive breakpoints: mobile-first with `md:` (768px) and `lg:` (1024px)
- Container queries for adaptive layouts

---

## Project Structure

### Subdirectories (See CLAUDE.md Files)

For detailed documentation on each subdirectory, refer to:

- **app/CLAUDE.md**: Pages, routing, API routes, layouts, and global styles
- **components/CLAUDE.md**: UI components, map visualization, AI elements, navigation
- **hooks/CLAUDE.md**: Custom React hooks for WebSocket, geolocation, voice AI
- **types/CLAUDE.md**: TypeScript type definitions and API contracts

### Key Directories

**app/** - Application pages and routing
- Main dashboard with map, incident feed, responder stats
- Specialized dashboards for civilians and hospitals
- Emergency call interface for public use
- API routes for ElevenLabs integration
- Global layout and theme configuration

**components/** - React component library
- 55 shadcn/ui primitives (buttons, cards, tables, dialogs, etc.)
- Custom components for disaster management
- AI-powered persona animations
- 3D map with vehicle tracking
- Real-time incident feed and hospital capacity displays

**hooks/** - Custom React hooks
- ElevenLabs voice conversation management
- High-accuracy GPS geolocation tracking
- WebSocket connections to backend server
- Mobile viewport detection

**types/** - TypeScript definitions
- API response types
- Data models (incidents, responders, hospitals)
- WebSocket payload formats
- Enum types for status, severity, categories

**public/** - Static assets
- 3D vehicle models (`.glb` files for Three.js)
- SVG icons and graphics
- Served at `/` URL path

---

## Key Features & Capabilities

### 1. Real-Time Incident Management

**Components**: `incident-feed.tsx`, `disaster-map.tsx`

- Live incident tracking with severity-based color coding (1-5 scale)
- Tabbed views: All, Critical, New, Active incidents
- Sortable table with drill-down drawers for details
- Status badges: new, dispatched, in_progress, resolved
- Type icons: fire, medical, rescue, flood, accident, other
- Interactive 3D heatmap showing incident locations
- API integration: Fetches from `api.incidents.list()`

### 2. 3D Vehicle Tracking

**Component**: `disaster-map.tsx`

- Real-time vehicle positions on Mapbox map
- 3D GLTF models (firetrucks, ambulances)
- Realistic road-based routing via Mapbox Directions API
- Custom Three.js layer for model rendering
- Vehicle types: Ambulance, Fire Truck, Police, Rescue, Hazmat, Medical
- Status tracking: Available, Responding, On Scene, Returning, Offline

### 3. AI Voice Emergency Calls

**Components**: `emergency-call.tsx`, `ai-elements/persona.tsx`

- Voice conversation with ElevenLabs AI emergency operator
- Calm, reassuring voice (Rachel voice model)
- Gathers critical info: location, emergency type, injuries, hazards
- Provides survival instructions: fire, earthquake, flood, medical
- Live GPS location sharing (3-second intervals)
- Real-time transcript streaming to server
- Animated AI persona with state-driven visuals (idle, listening, thinking, speaking)
- Call status: idle, connecting, connected, ended, error
- Mute/unmute controls, volume adjustment

### 4. Hospital Capacity Management

**Components**: `hospital-capacity.tsx`, `hospital-dashboard.tsx`, `incoming-patients.tsx`

- Bed availability by category: ER, ICU, General, Pediatric, Burn, Surgical
- Color-coded occupancy: green (low), yellow (medium), orange (high), red (critical)
- Shows available, occupied, and incoming (pending) patients
- Hospital network status: accepting, limited, diverting, closed
- Patient transport tracking with ETA and severity
- Resource allocation and coordination

### 5. Civilian Tracking

**Component**: `people-in-danger.tsx`

- Track individuals requiring assistance
- Status-based views: on_call, waiting, being_rescued, rescued, safe
- Dashboard stats: Active Callers, People Trapped, Total People, Injured
- Real-time updates from AI call transcripts

### 6. Dashboard Statistics

**Component**: `responder-cards.tsx`

- 4 key metrics with trend indicators:
  1. Active Incidents (count + % change)
  2. People in Danger (count + % change)
  3. Responders Deployed (count + coverage %)
  4. Resources Available (count + supply levels)
- Gradient backgrounds, responsive grid layout
- API integration: `api.stats.get()`

### 7. Advanced Data Tables

**Component**: `data-table.tsx`

- Column sorting, filtering, hiding
- Row selection with checkboxes
- Drag-and-drop row reordering
- Pagination controls
- Inline editing via drawers
- Embedded charts for data visualization
- Powered by TanStack Table and dnd-kit

---

## Dependencies & Integrations

### External Services

**ElevenLabs Conversational AI**
- Voice-based emergency operator
- GPT-4o LLM (temperature: 0.3, max_tokens: 150)
- Rachel voice model (voice_id: "21m00Tcm4TlvDq8ikWAM")
- High-quality speech recognition
- API endpoints: `/api/elevenlabs/agent`, `/api/elevenlabs/signed-url`
- Environment: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` (optional)

**Mapbox GL JS**
- Interactive disaster heatmaps
- Custom layers for incident visualization
- Directions API for vehicle routing
- Environment: `NEXT_PUBLIC_MAPBOX_TOKEN` (required)

**WebSocket Server (data_server/)**
- Real-time location streaming: `ws://localhost:8080/phone_location_in`
- Real-time transcript streaming: `ws://localhost:8080/phone_transcript_in`
- Environment: `NEXT_PUBLIC_WS_URL` (default: `ws://localhost:8080`)

### Browser APIs

**Geolocation API**
- High-accuracy GPS tracking via `navigator.geolocation.watchPosition()`
- Permission management via `navigator.permissions.query()`
- Used for emergency responder positioning

**MediaDevices API**
- Microphone access via `navigator.mediaDevices.getUserMedia({ audio: true })`
- Required for voice conversations

**WebSocket API**
- Native WebSocket for bidirectional real-time communication
- Managed by `use-server-websocket.ts` hook

**MediaQuery API**
- Responsive design via `window.matchMedia('(max-width: 768px)')`
- Used for mobile detection

### Key NPM Packages

**UI & Styling**
- `@radix-ui/*`: Accessible UI primitives (15+ packages)
- `tailwindcss`: Utility-first CSS framework
- `next-themes`: Dark/light theme management
- `class-variance-authority`: Component variants
- `tailwind-merge`: Conditional className merging

**Data Visualization**
- `mapbox-gl`: Map rendering
- `three`: 3D graphics and models
- `recharts`: Charts and graphs
- `@tanstack/react-table`: Advanced tables

**AI & Animation**
- `@elevenlabs/client`: Voice AI integration
- `@rive-app/react-webgl2`: State-driven animations

**Interactivity**
- `@dnd-kit/*`: Drag-and-drop (4 packages)
- `react-resizable-panels`: Resizable layouts
- `embla-carousel-react`: Carousels

**Utilities**
- `zod`: Schema validation
- `date-fns`: Date manipulation
- `sonner`: Toast notifications
- `cmdk`: Command palette
- `lucide-react`: Icon library
- `@tabler/icons-react`: Additional icons

---

## Development & Build Process

### Scripts

```json
{
  "dev": "next dev",           // Start development server (localhost:3000)
  "build": "next build",       // Production build
  "start": "next start",       // Start production server
  "lint": "eslint"             // Run ESLint
}
```

### Development Workflow

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
   ELEVENLABS_API_KEY=your_elevenlabs_key
   NEXT_PUBLIC_WS_URL=ws://localhost:8080  # Optional, defaults to localhost:8080
   ```

3. **Start development server**
   ```bash
   npm run dev
   # Opens at http://localhost:3000
   ```

4. **Access dashboards**
   - Main dashboard: `http://localhost:3000/dashboard`
   - Civilians: `http://localhost:3000/dashboard/civilians`
   - Hospitals: `http://localhost:3000/dashboard/hospitals`
   - Emergency call: `http://localhost:3000/emergency`
   - WebSocket test: `http://localhost:3000/test-ws`

5. **Build for production**
   ```bash
   npm run build
   npm run start
   ```

### Hot Module Replacement

Next.js Dev Server provides:
- Instant page updates on file changes
- Fast Refresh for React components
- Error overlay with stack traces
- CSS hot reload

### TypeScript Configuration

**tsconfig.json** settings:
- Target: ES2017
- JSX: react-jsx (automatic runtime)
- Module: esnext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Incremental compilation for faster builds

### Linting

**eslint.config.mjs** includes:
- Next.js core web vitals rules
- TypeScript-specific rules
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

---

## Configuration Files

### next.config.ts

Minimal configuration with default Next.js settings. Can be extended for:
- Image optimization domains
- Environment variable rewrites
- Custom headers/redirects
- Webpack customization

### components.json (shadcn/ui)

```json
{
  "style": "radix-mira",           // Design style variant
  "rsc": true,                     // React Server Components enabled
  "tsx": true,                     // TypeScript
  "tailwind": {
    "css": "app/globals.css",      // Global styles location
    "baseColor": "neutral",        // Theme base color
    "cssVariables": true,          // Use CSS custom properties
    "prefix": ""                   // No Tailwind prefix
  },
  "iconLibrary": "hugeicons",      // Default icon set
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### postcss.config.mjs

Simple configuration for Tailwind CSS processing:
```javascript
{
  plugins: {
    "@tailwindcss/postcss": {}
  }
}
```

### tsconfig.json

Key settings:
- Paths: `@/*` alias for clean imports
- JSX: react-jsx for automatic runtime
- Strict mode: Enabled for type safety
- Include: All TS/TSX files + Next.js types
- Exclude: node_modules

---

## Integration with data_server

### WebSocket Communication

The user interface establishes WebSocket connections to `data_server/` for real-time data streaming:

**Location Updates**
- Hook: `use-server-websocket.ts`
- Endpoint: `ws://localhost:8080/phone_location_in`
- Payload:
  ```json
  {
    "user_id": "caller_session_123",
    "lat": 51.4988,
    "lon": -0.1749,
    "timestamp": 1738368000,
    "accuracy": 10
  }
  ```
- Frequency: Every 3 seconds during active emergency calls
- Source: GPS geolocation from `use-geolocation.ts` hook

**Transcript Streaming**
- Hook: `use-server-websocket.ts`
- Endpoint: `ws://localhost:8080/phone_transcript_in`
- Payload:
  ```json
  {
    "user_id": "caller_session_123",
    "data": {
      "transcript": {
        "text": "There's a fire in the building!",
        "is_final": true
      }
    }
  }
  ```
- Source: ElevenLabs AI conversation transcripts
- Processing: Backend extracts incident details and updates database

### API Communication

While not extensively documented, the UI likely communicates with backend API endpoints for:
- Fetching incident lists (`api.incidents.list()`)
- Getting hospital capacity (`api.hospitals.getCapacity(hospitalId)`)
- Retrieving dashboard statistics (`api.stats.get()`)

**Note**: The exact API client implementation is not found in standard locations. This may be:
- Embedded directly in components
- Using fetch/axios without abstraction
- Pending implementation

### Data Flow Pattern

```
Emergency Call (UI)
  └─▶ ElevenLabs AI (voice conversation)
       ├─▶ GPS Location → WebSocket → data_server → Database
       └─▶ Transcript → WebSocket → data_server → Database
                                                       │
                                                       ▼
                                              Database Updates
                                                       │
                                                       ▼
                                            Real-time Subscriptions
                                                       │
                                                       ▼
                                              Dashboard UI Refresh
```

### Session Management

- Unique session IDs generated for each emergency call
- Format: `session_${timestamp}_${randomString}`
- Used to correlate location updates and transcripts
- Allows multiple concurrent calls without data mixing

---

## Environment Variables

### Required

**NEXT_PUBLIC_MAPBOX_TOKEN**
- Used by: `components/disaster-map.tsx`
- Purpose: Mapbox GL JS API authentication
- Get from: https://account.mapbox.com/

**ELEVENLABS_API_KEY**
- Used by: `app/api/elevenlabs/*` routes
- Purpose: Create and manage AI voice agents
- Get from: https://elevenlabs.io/

### Optional

**NEXT_PUBLIC_WS_URL**
- Default: `ws://localhost:8080`
- Used by: `hooks/use-server-websocket.ts`
- Purpose: Backend WebSocket server base URL
- Override for production deployment

**ELEVENLABS_AGENT_ID**
- Used by: `app/api/elevenlabs/signed-url/route.ts`
- Purpose: Reuse existing ElevenLabs agent instead of creating new one
- Auto-managed if not provided

### Environment File

Create `.env.local` in `user_interface/` directory:

```
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHgifQ.xxxxxxxx
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxx

# Optional
NEXT_PUBLIC_WS_URL=ws://your-server.com:8080
ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Related Documentation

### Subdirectory Documentation
- **app/CLAUDE.md**: Pages, API routes, layouts, and routing details
- **components/CLAUDE.md**: Component library, props, and usage patterns
- **hooks/CLAUDE.md**: Custom React hooks and browser API integrations
- **types/CLAUDE.md**: TypeScript type definitions and API contracts

### Data Model
- **DATA_MODEL.md**: High-level system architecture and data flow
- Describes: Core entities, user workflows, real-time data flow
- Users: Person in Danger, First Responder, Hospital Worker

### External Documentation
- Next.js: https://nextjs.org/docs
- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js/
- ElevenLabs: https://elevenlabs.io/docs
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs

---

## Development Notes

### Best Practices

1. **Server vs Client Components**
   - Default to server components for better performance
   - Use "use client" only when needed (browser APIs, interactivity)
   - Place "use client" as low as possible in component tree

2. **Type Safety**
   - Import types from `@/types/api`
   - Use strict TypeScript mode
   - Define props interfaces for all components

3. **Styling**
   - Use Tailwind utility classes
   - Leverage design tokens from `globals.css`
   - Use `cn()` utility for conditional classes
   - Follow mobile-first responsive design

4. **API Integration**
   - Handle loading and error states
   - Show user-friendly error messages
   - Use proper TypeScript types for responses
   - Implement proper cleanup in useEffect

5. **Performance**
   - Lazy load heavy 3D models
   - Throttle geolocation updates
   - Use React.memo for expensive renders
   - Code split with dynamic imports

### Common Patterns

**Data Fetching in Components**
```typescript
const [data, setData] = useState<Type[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  api.resource.method()
    .then(setData)
    .catch((err) => setError("Error message"))
    .finally(() => setIsLoading(false))
}, [])

if (isLoading) return <Spinner />
if (error) return <ErrorMessage />
return <DataView data={data} />
```

**WebSocket + Geolocation Integration**
```typescript
const { position, startWatching } = useGeolocation({ enableHighAccuracy: true })
const { sendLocation, connect } = useServerWebSocket({ userId: sessionId })

useEffect(() => {
  if (position) {
    sendLocation({
      user_id: sessionId,
      lat: position.latitude,
      lon: position.longitude,
      timestamp: position.timestamp,
      accuracy: position.accuracy
    })
  }
}, [position])
```

### File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `disaster-map.tsx`)
- **Hooks**: `use-kebab-case.ts` (e.g., `use-geolocation.ts`)
- **Types**: `kebab-case.ts` (e.g., `api.ts`)
- **Pages**: `page.tsx` (App Router convention)
- **Layouts**: `layout.tsx` (App Router convention)
- **API Routes**: `route.ts` (App Router convention)

### Testing Considerations

- **Mock Data**: Components include fallback data for development
- **Error Boundaries**: Error states handled gracefully
- **Loading States**: All async operations show loading UI
- **Responsive**: Mobile-first, tested across viewports
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

---

## Quick Reference

### Import Paths
```typescript
// Components
import { Button } from "@/components/ui/button"
import { DisasterMap } from "@/components/disaster-map"

// Hooks
import { useGeolocation } from "@/hooks/use-geolocation"

// Types
import type { Incident, DashboardStats } from "@/types/api"
```

### Key URLs
- Development: `http://localhost:3000`
- Main Dashboard: `/dashboard`
- Civilians: `/dashboard/civilians`
- Hospitals: `/dashboard/hospitals`
- Emergency Call: `/emergency`
- WebSocket Test: `/test-ws`

### WebSocket Endpoints (Backend)
- Location: `ws://localhost:8080/phone_location_in`
- Transcript: `ws://localhost:8080/phone_transcript_in`

### Critical Components
- `emergency-call.tsx`: Public emergency interface
- `disaster-map.tsx`: 3D map with vehicle tracking
- `incident-feed.tsx`: Real-time incident management
- `hospital-capacity.tsx`: Bed availability tracking
- `responder-cards.tsx`: Dashboard KPI metrics

---

**Last Updated**: 2026-02-01
