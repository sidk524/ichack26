# user_interface/app/

## Purpose
This directory contains the Next.js 15 App Router application for the disaster response system. It provides multiple interfaces for emergency management including dispatcher dashboards, civilian tracking, hospital coordination, and a public-facing emergency call interface.

## Directory Structure
```
app/
├── api/                      # API route handlers
│   └── elevenlabs/          # ElevenLabs AI voice agent integration
│       ├── agent/           # Agent creation endpoint
│       └── signed-url/      # Signed URL generation for voice conversations
├── dashboard/               # Emergency dispatcher dashboard pages
│   ├── civilians/          # Civilian tracking and emergency call monitoring
│   ├── hospitals/          # Hospital capacity and patient routing
│   ├── page.tsx            # Main dashboard (overview)
│   └── data.json           # Mock/example data
├── emergency/              # Public emergency call interface
│   ├── layout.tsx          # Emergency-specific layout (mobile-optimized)
│   └── page.tsx            # Emergency call page
├── test-ws/                # WebSocket testing page
├── layout.tsx              # Root application layout
├── page.tsx                # Landing/home page
└── globals.css             # Global styles and theme configuration
```

## Routing Structure

### Public Routes
- `/` - Landing page with component example
- `/emergency` - Emergency call interface for civilians to request help

### Dashboard Routes (Protected/Internal)
- `/dashboard` - Main dispatcher dashboard with map, incident feed, and responder stats
- `/dashboard/civilians` - Track active callers, trapped people, injuries
- `/dashboard/hospitals` - Hospital capacity, patient routing, resource allocation

### Development Routes
- `/test-ws` - WebSocket connection testing utility

## Key Pages

### Root Layout (`layout.tsx`)
- Configures global fonts: Geist Sans, Geist Mono, Inter
- Provides root HTML structure
- Applies global styles from `globals.css`

### Landing Page (`page.tsx`)
- Entry point for the application
- Renders `ComponentExample` component

### Dashboard Pages

#### Main Dashboard (`dashboard/page.tsx`)
- **Components**: `AppSidebar`, `SiteHeader`, `ResponderCards`, `DisasterMap`, `IncidentFeed`
- **Layout**: 2-column grid (map + incident feed) with responder stats cards
- **Features**: Real-time incident tracking, vehicle monitoring, 3D map visualization

#### Civilians Dashboard (`dashboard/civilians/page.tsx`)
- **Stats Cards**:
  - Active Callers (currently on emergency calls)
  - People Trapped (awaiting rescue)
  - Total People (including groups)
  - Injured (requiring medical attention)
- **Components**: `PeopleInDanger` table showing detailed civilian status
- **Purpose**: Monitor and coordinate rescue operations for civilians

#### Hospitals Dashboard (`dashboard/hospitals/page.tsx`)
- **Components**: `HospitalDashboard`
- **Purpose**: Track hospital capacity, patient routing, resource availability
- **Layout**: Uses same sidebar/header structure as other dashboard pages

### Emergency Call Interface

#### Emergency Layout (`emergency/layout.tsx`)
- **Metadata**: Custom title and description for emergency services
- **Viewport**: Mobile-optimized (prevents user scaling for stability)
- **Theme**: Adaptive color scheme (light/dark)
- **Class**: `min-h-[100dvh] touch-manipulation` for mobile reliability

#### Emergency Page (`emergency/page.tsx`)
- **Component**: `EmergencyCall`
- **Client-Side**: Marked with "use client" for interactive features
- **Purpose**: Voice-based emergency call interface using ElevenLabs AI

### Test Pages

#### WebSocket Test (`test-ws/page.tsx`)
- **Purpose**: Development utility for testing WebSocket connections
- **Endpoint**: `ws://localhost:8080/phone_location_in`
- **Features**:
  - Connect/disconnect controls
  - Send test location data (Imperial College London coordinates)
  - Real-time message logging
  - Connection status monitoring
- **Payload Format**:
  ```json
  {
    "user_id": "test_user_frontend",
    "lat": 51.4988,
    "lon": -0.1749,
    "timestamp": 1234567890,
    "accuracy": 10
  }
  ```

## API Routes

### POST `/api/elevenlabs/agent/route.ts`
- **Purpose**: Create ElevenLabs conversational AI agent
- **Environment**: Requires `ELEVENLABS_API_KEY`
- **Configuration**:
  - **Agent Name**: "Emergency Response Agent"
  - **LLM**: GPT-4o (temperature: 0.3, max_tokens: 150)
  - **Voice**: Rachel (voice_id: "21m00Tcm4TlvDq8ikWAM") - calm, clear voice
  - **ASR**: High-quality speech recognition via ElevenLabs
  - **Timeouts**:
    - Turn timeout: 10s
    - Silence end call: 60s
    - Max duration: 600s (10 minutes)
  - **Privacy**: Records voice, 30-day retention
- **Agent Prompt**: Instructs AI to:
  1. Stay calm and reassuring
  2. Gather critical info (location, emergency type, injuries, hazards)
  3. Provide survival instructions (fire, earthquake, flood, medical)
  4. Keep caller informed about response status
- **First Message**: "Emergency services. I'm here to help you. Can you tell me what's happening and where you are?"
- **Returns**: Agent configuration data including agent_id

### GET `/api/elevenlabs/signed-url/route.ts`
- **Purpose**: Get signed URL for initiating voice conversation with emergency agent
- **Environment**: Requires `ELEVENLABS_API_KEY`, optional `ELEVENLABS_AGENT_ID`
- **Flow**:
  1. Check for cached agent ID (from env or previous creation)
  2. If no agent exists, auto-create using same config as `/agent` endpoint
  3. Request signed URL from ElevenLabs
  4. Handle 404/400 errors by recreating agent and retrying
- **Auto-Recovery**: Automatically recreates agent if it's not found
- **Returns**: Signed URL data for WebSocket connection to voice agent

## Global Styles (`globals.css`)

### Imports
- Tailwind CSS base
- `tw-animate-css` for animations
- ShadCN component styles
- Mapbox GL styles for map rendering

### Theme System
- Uses CSS custom properties with OKLCH color space
- Light and dark mode support (`.dark` class)
- Comprehensive design tokens for:
  - Background/foreground colors
  - Card, popover, button variants
  - Semantic colors (primary, secondary, muted, accent, destructive)
  - Chart colors (5 variants)
  - Sidebar colors
  - Border radius values (sm to 4xl)
- Default border radius: 0.625rem (10px)

### Key CSS Variables
- Font families: `--font-sans` (Inter), `--font-mono` (Geist Mono)
- Sidebar width: `calc(var(--spacing) * 72)`
- Header height: `calc(var(--spacing) * 12)`

## Layout Organization

### Common Layout Pattern (Dashboards)
All dashboard pages share consistent structure:
```tsx
<SidebarProvider>
  <AppSidebar variant="inset" />
  <SidebarInset>
    <SiteHeader />
    <div className="flex flex-1 flex-col">
      {/* Page-specific content */}
    </div>
  </SidebarInset>
</SidebarProvider>
```

### Sidebar Configuration
- Custom width: `calc(var(--spacing) * 72)`
- Custom header height: `calc(var(--spacing) * 12)`
- Variant: "inset" (embedded within page layout)

### Responsive Design
- Container queries: `@container/main` for adaptive layouts
- Grid systems: Responsive columns (1-col mobile, 2-col desktop)
- Spacing: Consistent padding (4-6 spacing units)

## Data Files

### `dashboard/data.json`
- **Purpose**: Example/mock data (appears to be project documentation items)
- **Structure**: Array of 68 objects with id, header, type, status, target, limit, reviewer
- **Note**: This file seems to be placeholder/demo data not actively used by dashboard pages

## Integration Points

### Components Used
- `AppSidebar` - Navigation sidebar
- `SiteHeader` - Top header with controls
- `DisasterMap` - 3D map with vehicle tracking
- `IncidentFeed` - Real-time incident list
- `ResponderCards` - Emergency responder statistics
- `PeopleInDanger` - Civilian tracking table
- `HospitalDashboard` - Hospital capacity view
- `EmergencyCall` - Voice call interface
- `ComponentExample` - Landing page demo

### External Services
- **ElevenLabs API**: Voice AI for emergency call handling
- **WebSocket Server**: Real-time location/transcript data at `ws://localhost:8080`
- **Mapbox GL**: Map rendering and visualization
- **GPT-4o**: LLM for emergency dispatcher AI agent

## Development Notes

- All dashboard pages are server components (default in App Router)
- Emergency and test pages are client components ("use client")
- API routes use Next.js 15 route handlers (app/api directory)
- CSS uses modern features: container queries, OKLCH colors, custom properties
- Mobile-first approach with responsive breakpoints (md, lg)
- Accessibility considerations: proper semantic HTML, ARIA labels expected in components
