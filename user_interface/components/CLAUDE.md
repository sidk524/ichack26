# Components Directory

This directory contains all React components for the emergency disaster response system UI. Components are organized into three categories: shadcn/ui primitives, custom application components, and AI-powered elements.

## Directory Structure

```
components/
├── ui/                      # 55 shadcn/ui primitive components
├── ai-elements/             # AI-powered interactive components
│   └── persona.tsx          # Animated Rive-based AI persona (voice agent visual)
├── disaster-map.tsx         # Mapbox + Three.js disaster visualization
├── incident-feed.tsx        # Live incident tracking table
├── emergency-call.tsx       # Emergency call interface with AI voice
├── hospital-*.tsx           # Hospital management components
├── people-in-danger.tsx     # Civilian tracking component
├── responder-cards.tsx      # Dashboard statistics cards
├── data-table.tsx           # Advanced sortable/filterable table
├── app-sidebar.tsx          # Main application navigation
└── nav-*.tsx                # Navigation components
```

## Component Categories

### 1. UI Primitives (`ui/` subdirectory)

**Purpose**: Reusable, accessible UI components from shadcn/ui library
- 55 total components based on Radix UI primitives
- Styled with Tailwind CSS utility classes
- Fully accessible (ARIA-compliant)

**Key Components**:
- **Layout**: `card`, `separator`, `tabs`, `sidebar`, `sheet`, `drawer`
- **Forms**: `button`, `input`, `select`, `checkbox`, `radio-group`, `switch`, `slider`
- **Data Display**: `table`, `badge`, `avatar`, `progress`, `chart`
- **Overlays**: `dialog`, `alert-dialog`, `popover`, `tooltip`, `dropdown-menu`
- **Navigation**: `navigation-menu`, `breadcrumb`, `menubar`
- **Feedback**: `alert`, `spinner`, `toast` (sonner), `progress`

**Usage Pattern**:
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
```

### 2. Custom Application Components

**Purpose**: Domain-specific components for disaster response system

#### Map & Visualization

**`disaster-map.tsx`** (492 lines)
- **Dependencies**: Mapbox GL JS, Three.js, GLTFLoader
- **Features**:
  - Interactive disaster heatmap showing incident severity
  - 3D vehicle tracking (firetrucks, ambulances) with real-time animation
  - Uses Mapbox Directions API for realistic road-based routing
  - Custom Three.js layer for 3D GLTF models
  - Shows incident data with color-coded severity (1-5 scale)
- **Props**: `incidents[]`, `showVehicles`, `className`
- **Data Flow**: Displays IncidentData with coordinates, severity, peopleInDanger

#### Incident Management

**`incident-feed.tsx`** (561 lines)
- **Purpose**: Real-time incident tracking and management
- **API Integration**: Fetches from `api.incidents.list()`
- **Features**:
  - Tabbed view (All/Critical/New/Active incidents)
  - Sortable table with severity indicators
  - Drill-down drawers with incident details, charts, and edit forms
  - Status badges (new/dispatched/in_progress/resolved)
  - Type icons (fire/medical/rescue/flood/accident/other)
- **State Management**: Local React state with API polling

**`people-in-danger.tsx`**
- **Purpose**: Track civilians requiring assistance
- **Features**: List/table view of people by status
- **Statuses**: on_call, waiting, being_rescued, rescued, safe

#### Hospital Components

**`hospital-capacity.tsx`** (149 lines)
- **API Integration**: `api.hospitals.getCapacity(hospitalId)`
- **Purpose**: Display bed availability by category
- **Features**:
  - Progress bars with color-coded occupancy (green/yellow/orange/red)
  - Bed categories: ER, ICU, General, Pediatric, Burn, Surgical
  - Shows available, occupied, and incoming (pending) patients
- **Visual Feedback**: Icons for each bed type, percentage-based coloring

**`hospital-dashboard.tsx`**
- **Purpose**: Unified hospital status dashboard
- Combines capacity, incoming patients, and network status

**`hospital-network.tsx`**
- **Purpose**: Display network of connected hospitals
- Shows inter-hospital coordination

**`hospital-status.tsx`**
- **Purpose**: Individual hospital operational status
- Emergency capacity indicators

**`incoming-patients.tsx`**
- **Purpose**: Track patients en route to hospital
- ETA and severity information

#### Dashboard Components

**`responder-cards.tsx`** (196 lines)
- **API Integration**: `api.stats.get()`
- **Purpose**: Display 4 key dashboard metrics
- **Metrics**:
  1. Active Incidents (with trend %)
  2. People in Danger (total count + trend)
  3. Responders Deployed (coverage %)
  4. Resources Available (supply levels)
- **Features**: Trend indicators (up/down), gradient backgrounds, responsive grid

**`section-cards.tsx`**
- **Purpose**: Sectioned card views for dashboard organization

#### Advanced Data Components

**`data-table.tsx`** (800+ lines)
- **Dependencies**: TanStack Table, dnd-kit (drag-drop), Recharts
- **Features**:
  - Column sorting, filtering, hiding
  - Row selection with checkboxes
  - Drag-and-drop row reordering
  - Pagination controls
  - Column visibility toggle
  - Inline editing via drawers
  - Embedded charts for data visualization
- **Use Cases**: Complex data management interfaces

#### Charts

**`chart-area-interactive.tsx`** (10,634 bytes)
- **Purpose**: Interactive area charts for data trends
- **Library**: Recharts with custom theming

### 3. AI-Powered Components (`ai-elements/`)

**`ai-elements/persona.tsx`** (271 lines)
- **Purpose**: Animated AI voice agent visualization
- **Technology**: Rive WebGL2 animations
- **States**: `idle`, `listening`, `thinking`, `speaking`, `asleep`
- **Variants**: obsidian, mana, opal, halo, glint, command
- **Features**:
  - Dynamic color adaptation (light/dark theme)
  - State machine-driven animations
  - Real-time visual feedback for voice interactions
- **Integration**: Used in `emergency-call.tsx` for voice UI

**`emergency-call.tsx`** (506 lines)
- **Purpose**: Emergency voice call interface with AI operator
- **Dependencies**:
  - ElevenLabs Conversational AI (voice)
  - Geolocation API (real-time GPS tracking)
  - WebSocket (server communication)
  - Persona component (visual feedback)
- **Features**:
  - Voice conversation with AI emergency operator
  - Live GPS location sharing (3-second updates)
  - Real-time transcript streaming to server
  - Call status tracking (idle/connecting/connected/ended/error)
  - Mute/unmute controls
  - Session management with unique IDs
- **Data Flow**:
  - Sends location via WebSocket to `/phone_location_in`
  - Sends transcript via WebSocket to `/phone_transcript_in`
  - Displays live conversation with visual state indicators

### 4. Navigation Components

**`app-sidebar.tsx`** (97 lines)
- **Purpose**: Main application sidebar navigation
- **Routes**:
  - First Responders (`/dashboard`)
  - Hospitals (`/dashboard/hospitals`)
  - People in Danger (`/dashboard/civilians`)
- **Components**: Uses shadcn Sidebar with collapsible offcanvas mode

**`nav-main.tsx`**, **`nav-secondary.tsx`**, **`nav-user.tsx`**, **`nav-documents.tsx`**
- **Purpose**: Modular navigation sections
- **Pattern**: Composable nav items with icons and labels

**`site-header.tsx`**
- **Purpose**: Top-level site header component

## Key Dependencies

### External Libraries

1. **Mapbox GL JS** (`mapbox-gl`)
   - Used in: `disaster-map.tsx`
   - Purpose: Interactive maps, heatmaps, custom layers

2. **Three.js** (`three`)
   - Used in: `disaster-map.tsx`
   - Purpose: 3D vehicle models (GLTFLoader for .glb files)
   - Models: `low_poly_fire_truck.glb`, `lowpoly_ambulance_-_low_poly_free.glb`

3. **Rive** (`@rive-app/react-webgl2`)
   - Used in: `ai-elements/persona.tsx`
   - Purpose: Animated AI persona visuals

4. **TanStack Table** (`@tanstack/react-table`)
   - Used in: `data-table.tsx`, `incident-feed.tsx`
   - Purpose: Advanced table features (sorting, filtering, pagination)

5. **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`)
   - Used in: `data-table.tsx`
   - Purpose: Drag-and-drop row reordering

6. **Recharts** (`recharts`)
   - Used in: `incident-feed.tsx`, `chart-area-interactive.tsx`, `data-table.tsx`
   - Purpose: Data visualization (area charts, line charts)

7. **Tabler Icons** (`@tabler/icons-react`)
   - Used in: All components
   - Purpose: Consistent icon set

8. **Sonner** (`sonner`)
   - Used via: `ui/sonner.tsx`
   - Purpose: Toast notifications

### Internal Dependencies

- **`@/lib/utils`**: `cn()` utility for conditional classNames
- **`@/lib/api`**: API client for backend communication
  - `api.incidents.list()`
  - `api.hospitals.getCapacity(hospitalId)`
  - `api.stats.get()`
- **`@/types/api`**: TypeScript types for API responses
  - `IncidentType`, `IncidentStatus`, `SeverityLevel`
  - `BedCategory`, `DashboardStats`
- **`@/hooks/use-mobile`**: Mobile viewport detection
- **`@/hooks/use-elevenlabs-conversation`**: ElevenLabs voice AI integration
- **`@/hooks/use-geolocation`**: GPS location tracking
- **`@/hooks/use-server-websocket`**: WebSocket connection management

## API Integration Pattern

All data-fetching components follow this pattern:

```tsx
const [data, setData] = useState<Type[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  api.resource.method()
    .then(setData)
    .catch((err) => {
      console.error("Failed to fetch:", err)
      setError("Error message")
    })
    .finally(() => setIsLoading(false))
}, [dependencies])

// Show loading state
if (isLoading) return <Spinner />

// Show error state
if (error) return <ErrorMessage />

// Render data
return <DataView data={data} />
```

## Styling Conventions

- **Utility-first**: Tailwind CSS classes
- **Theming**: CSS variables for colors (`--primary`, `--destructive`, etc.)
- **Dark mode**: Automatic via `dark:` prefix
- **Responsive**: `@container` queries, mobile-first breakpoints
- **Spacing**: Consistent gap/padding scales (`gap-2`, `p-4`, etc.)
- **Typography**: `text-sm`, `font-medium`, `leading-tight`

## Component Communication

1. **Props-based**: Parent → Child data flow
2. **API-based**: Components fetch their own data via `api.*` client
3. **WebSocket**: Real-time updates (emergency-call ↔ server)
4. **Toast notifications**: User feedback via `sonner`
5. **Drawers/Dialogs**: Modal interactions for detail views

## Environment Variables

- **`NEXT_PUBLIC_MAPBOX_TOKEN`**: Required for disaster-map.tsx
- **ElevenLabs API key**: Required for emergency-call.tsx (via env)

## File Naming Conventions

- **Lowercase kebab-case**: `disaster-map.tsx`, `incident-feed.tsx`
- **UI components**: `ui/button.tsx`, `ui/card.tsx`
- **AI components**: `ai-elements/persona.tsx`

## Testing Considerations

- **Mock data**: Components include default/fallback data for development
- **Loading states**: All API components handle loading gracefully
- **Error boundaries**: Error states with user-friendly messages
- **Responsive**: Mobile-first design tested across viewports

## Performance Notes

- **Code splitting**: "use client" directive for client-only components
- **Memoization**: `React.memo` used in persona.tsx for expensive animations
- **Lazy loading**: Heavy 3D models loaded on-demand (disaster-map)
- **Throttling**: Geolocation updates throttled to 3s intervals
- **Virtual scrolling**: Consider for large tables/lists

## Quick Reference: Component Purposes

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `disaster-map` | Visualize incidents + 3D vehicle tracking | Mapbox, Three.js, heatmaps |
| `incident-feed` | Track/manage emergency incidents | Tabs, filtering, detail drawers |
| `emergency-call` | AI voice call interface | ElevenLabs, GPS, WebSocket |
| `persona` | Animated AI visual | Rive animations, state-driven |
| `hospital-capacity` | Bed availability by category | Progress bars, color-coding |
| `responder-cards` | Dashboard KPI metrics | Stats with trends |
| `data-table` | Advanced data grids | Sorting, filtering, DnD |
| `app-sidebar` | Main navigation | Collapsible sidebar |
| `people-in-danger` | Civilian tracking | Status-based views |

## Related Documentation

- **UI Library**: See `components.json` for shadcn configuration
- **API Types**: See `user_interface/types/api.ts` for type definitions
- **Hooks**: See `user_interface/hooks/` for custom hooks
- **Pages**: See `user_interface/app/` for page-level usage
