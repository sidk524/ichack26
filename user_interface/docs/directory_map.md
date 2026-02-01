# Directory Structure Map - User Interface

## Overview
Complete breakdown of the `@user_interface` directory structure with explanations for each component, organized by functional area.

```
user_interface/                     # Root Next.js application directory
├── 📁 app/                        # Next.js App Router pages and API routes
│   ├── 🗂️ api/                    # Server-side API routes
│   │   └── elevenlabs/            # ElevenLabs AI conversation integration
│   │       └── agent/             # AI agent endpoint configuration
│   │           └── route.ts       # API route for ElevenLabs agent
│   ├── 🗂️ dashboard/             # Main responder dashboard pages
│   │   ├── 🗂️ civilians/         # People in danger management view
│   │   │   └── page.tsx          # Civilian tracking dashboard
│   │   ├── 🗂️ hospitals/         # Hospital capacity management view
│   │   │   └── page.tsx          # Hospital dashboard page
│   │   ├── data.json             # Static dashboard data (mock)
│   │   └── page.tsx              # Main responder dashboard page
│   ├── 🗂️ emergency/             # Emergency call interface
│   │   ├── layout.tsx            # Emergency-specific layout wrapper
│   │   └── page.tsx              # AI voice call interface
│   ├── 🗂️ test-ws/               # WebSocket testing interface
│   │   └── page.tsx              # WebSocket connection testing page
│   ├── favicon.ico               # Application favicon
│   ├── globals.css               # Global CSS styles and Tailwind base
│   ├── layout.tsx                # Root layout with fonts and metadata
│   └── page.tsx                  # Home page (component showcase)
├── 📁 components/                 # Reusable React components
│   ├── 🗂️ ai-elements/           # AI-related UI components
│   │   └── persona.tsx           # AI conversation visual representation
│   ├── 🗂️ ui/                    # shadcn/ui base component library (50+ components)
│   │   ├── accordion.tsx         # Collapsible content sections
│   │   ├── alert-dialog.tsx      # Modal alerts and confirmations
│   │   ├── alert.tsx             # Inline notification messages
│   │   ├── avatar.tsx            # User profile pictures
│   │   ├── badge.tsx             # Status and category labels
│   │   ├── breadcrumb.tsx        # Navigation breadcrumbs
│   │   ├── button.tsx            # Interactive button variants
│   │   ├── card.tsx              # Content container component
│   │   ├── chart.tsx             # Data visualization wrapper
│   │   ├── checkbox.tsx          # Form checkbox inputs
│   │   ├── dialog.tsx            # Modal dialog system
│   │   ├── drawer.tsx            # Slide-out panel component
│   │   ├── dropdown-menu.tsx     # Context menus and dropdowns
│   │   ├── field.tsx             # Form field wrapper and validation
│   │   ├── input.tsx             # Text input form controls
│   │   ├── label.tsx             # Form field labels
│   │   ├── select.tsx            # Dropdown selection component
│   │   ├── separator.tsx         # Visual content dividers
│   │   ├── sheet.tsx             # Side panel overlay component
│   │   ├── sidebar.tsx           # Navigation sidebar system
│   │   ├── skeleton.tsx          # Loading state placeholders
│   │   ├── table.tsx             # Data table components
│   │   ├── tabs.tsx              # Tabbed interface component
│   │   ├── textarea.tsx          # Multi-line text input
│   │   ├── tooltip.tsx           # Hover information displays
│   │   └── [...25+ more]         # Complete UI component library
│   ├── app-sidebar.tsx           # Main application navigation sidebar
│   ├── chart-area-interactive.tsx # Interactive chart component
│   ├── component-example.tsx     # Component showcase and examples
│   ├── data-table.tsx            # Reusable data table implementation
│   ├── disaster-map.tsx          # Mapbox + Three.js emergency map
│   ├── emergency-call.tsx        # AI voice call interface
│   ├── example.tsx               # Component demonstration wrapper
│   ├── hospital-capacity.tsx     # Hospital bed availability display
│   ├── hospital-dashboard.tsx    # Hospital management interface
│   ├── hospital-network.tsx      # Multi-hospital network view
│   ├── hospital-status.tsx       # Hospital operational status
│   ├── incident-feed.tsx         # Real-time emergency incident list
│   ├── incoming-patients.tsx     # Hospital patient arrival tracking
│   ├── nav-documents.tsx         # Document navigation component
│   ├── nav-main.tsx              # Primary navigation menu
│   ├── nav-secondary.tsx         # Secondary navigation options
│   ├── nav-user.tsx              # User profile navigation
│   ├── people-in-danger.tsx      # Civilian tracking component
│   ├── responder-cards.tsx       # Dashboard statistics cards
│   ├── section-cards.tsx         # Dashboard section containers
│   ├── site-header.tsx           # Application header component
│   └── supply-levels.tsx         # Hospital supply tracking
├── 📁 docs/                      # Documentation directory
│   ├── SERVER_CONNECTION.md      # Server WebSocket integration guide
│   ├── ui_architecture.md        # UI architecture analysis (generated)
│   ├── wireframes.md             # ASCII wireframe documentation (generated)
│   └── directory_map.md          # This directory structure map (generated)
├── 📁 hooks/                     # Custom React hooks for state management
│   ├── use-elevenlabs-conversation.ts # AI voice conversation management
│   ├── use-geolocation.ts        # GPS location tracking and streaming
│   ├── use-mobile.ts             # Mobile device detection utility
│   ├── use-mobile.tsx            # Mobile responsive hook component
│   └── use-server-websocket.ts   # Real-time server communication
├── 📁 public/                    # Static assets and media files
│   ├── 🗂️ 3d_models/            # Three.js 3D model assets
│   │   ├── low_poly_fire_truck.glb    # Fire truck 3D model
│   │   └── lowpoly_ambulance_-_low_poly_free.glb # Ambulance 3D model
│   ├── file.svg                  # File type icon
│   ├── globe.svg                 # Global/world icon
│   ├── next.svg                  # Next.js logo
│   ├── vercel.svg                # Vercel deployment logo
│   └── window.svg                # Window/interface icon
├── 📁 types/                     # TypeScript type definitions
│   └── api.ts                    # Shared API and data model types
├── 📁 ui/                        # Duplicate UI components (legacy?)
│   ├── avatar.tsx                # User avatar component
│   ├── badge.tsx                 # Status badge component
│   ├── breadcrumb.tsx            # Navigation breadcrumb
│   ├── button.tsx                # Button component variants
│   ├── card.tsx                  # Content card component
│   ├── chart.tsx                 # Chart wrapper component
│   ├── checkbox.tsx              # Form checkbox
│   ├── drawer.tsx                # Slide-out drawer
│   ├── dropdown-menu.tsx         # Dropdown menu
│   ├── input.tsx                 # Text input field
│   ├── label.tsx                 # Form label
│   ├── select.tsx                # Select dropdown
│   ├── separator.tsx             # Content separator
│   ├── sheet.tsx                 # Modal sheet
│   ├── sidebar.tsx               # Navigation sidebar
│   ├── skeleton.tsx              # Loading skeleton
│   ├── sonner.tsx                # Toast notification
│   ├── table.tsx                 # Data table
│   ├── tabs.tsx                  # Tab interface
│   ├── toggle-group.tsx          # Toggle button group
│   ├── toggle.tsx                # Toggle switch
│   └── tooltip.tsx               # Tooltip overlay
├── .gitignore                    # Git ignore rules
├── components.json               # shadcn/ui configuration
├── DATA_MODEL.md                 # Data model and workflow documentation
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration
├── package-lock.json             # Dependency lock file
├── package.json                  # Project dependencies and scripts
├── postcss.config.mjs            # PostCSS configuration
├── README.md                     # Project documentation
└── tsconfig.json                 # TypeScript configuration
```

## Functional Directory Analysis

### 🎯 **Core Application Structure**

#### `/app` - Next.js App Router
- **Purpose**: Page routing and API endpoints following App Router conventions
- **Key Files**:
  - `layout.tsx`: Root layout with font loading and global styles
  - `page.tsx`: Home page component showcase
  - `globals.css`: Tailwind CSS base styles and custom CSS variables

#### `/app/dashboard` - Responder Interface
- **Purpose**: Emergency responder command center
- **Key Components**:
  - Main dashboard with real-time incident map and feed
  - Hospital capacity management interface
  - Civilian tracking and communication dashboard

#### `/app/emergency` - Civilian Interface
- **Purpose**: AI-powered emergency call interface for people in danger
- **Key Features**:
  - Voice conversation with AI agent
  - Real-time GPS location streaming
  - Emergency instruction delivery

### 🧩 **Component Architecture**

#### `/components/ui` - Base UI Library
- **Purpose**: shadcn/ui component library providing design system foundation
- **Scope**: 50+ production-ready components with accessibility and theming
- **Usage**: Imported throughout application for consistent UI patterns

#### `/components` - Application Components
- **Purpose**: Business logic components built on UI foundation
- **Organization**:
  - **Map Components**: `disaster-map.tsx` (Mapbox + Three.js integration)
  - **Data Components**: `incident-feed.tsx`, `responder-cards.tsx`
  - **Interface Components**: `emergency-call.tsx`, `app-sidebar.tsx`
  - **Hospital Components**: `hospital-*.tsx` series for medical facility management

### ⚡ **State Management Layer**

#### `/hooks` - Custom React Hooks
- **Purpose**: Encapsulate complex state logic and external integrations
- **Key Hooks**:
  - `use-server-websocket.ts`: Dual WebSocket management (location + transcript)
  - `use-geolocation.ts`: High-accuracy GPS tracking with throttling
  - `use-elevenlabs-conversation.ts`: AI voice conversation lifecycle
  - `use-mobile.ts`: Responsive design utilities

### 📊 **Data & Types**

#### `/types` - TypeScript Definitions
- **Purpose**: Shared type definitions ensuring type safety across components
- **Key Types**:
  - `Incident`: Emergency incident data model
  - `ResponderUnit`: Emergency vehicle and personnel tracking
  - `Hospital`: Medical facility capacity and status
  - WebSocket payload interfaces for real-time communication

#### `DATA_MODEL.md` - Business Logic Documentation
- **Purpose**: Comprehensive data flow and business process documentation
- **Content**: User roles, workflow diagrams, real-time data synchronization patterns

### 🎨 **Assets & Configuration**

#### `/public` - Static Assets
- **3D Models**: Emergency vehicle models for map visualization
- **Icons**: SVG icons for UI elements
- **Purpose**: Client-side accessible assets for rich media experiences

#### Configuration Files
- `components.json`: shadcn/ui component library configuration
- `next.config.ts`: Next.js build and runtime configuration
- `tsconfig.json`: TypeScript compiler configuration with strict mode
- `eslint.config.mjs`: Code quality and style enforcement

## Component Dependency Tree

```
📱 Emergency Call Flow:
emergency/page.tsx
└── EmergencyCall
    ├── Persona (AI visual)
    ├── useElevenLabsConversation (AI voice)
    ├── useGeolocation (GPS tracking)
    └── useServerWebSocket (real-time data)

🎛️ Dashboard Flow:
dashboard/page.tsx
└── SidebarProvider
    ├── AppSidebar (navigation)
    └── SidebarInset
        ├── SiteHeader
        ├── ResponderCards (statistics)
        ├── DisasterMap (Mapbox + Three.js)
        └── IncidentFeed (real-time table)

🏥 Hospital Flow:
dashboard/hospitals/page.tsx
└── Hospital Dashboard
    ├── HospitalCapacity
    ├── IncomingPatients
    ├── SupplyLevels
    └── HospitalNetwork
```

## File Naming Conventions

### Component Files
- **kebab-case**: All component files use hyphenated naming (`disaster-map.tsx`)
- **Descriptive**: Names clearly indicate component purpose and scope
- **TypeScript**: All components use `.tsx` extension for JSX + TypeScript

### Directory Organization
- **Functional Grouping**: Directories organized by feature area (`dashboard/`, `emergency/`)
- **Asset Separation**: Static assets isolated in `/public`
- **Type Safety**: Type definitions centralized in `/types`

### Import Patterns
- **Absolute Imports**: All imports use `@/` prefix for clean import paths
- **Barrel Exports**: UI components exported from index files for clean imports
- **Type Imports**: Explicit type imports for better tree-shaking

## Development Workflow Integration

### Hot Reload Architecture
- **Next.js Fast Refresh**: Instant component updates during development
- **CSS Hot Reload**: Tailwind changes reflected immediately
- **TypeScript Watch**: Real-time type checking and error reporting

### Build Optimization
- **Component Tree Shaking**: Unused UI components excluded from bundle
- **Dynamic Imports**: Heavy components (Three.js) loaded on demand
- **Static Generation**: Pages pre-rendered where possible for performance

### Testing Strategy
- **Component Testing**: Individual component unit tests
- **Integration Testing**: Hook and API integration validation
- **Type Safety**: TypeScript provides compile-time error detection

This directory structure supports rapid development while maintaining enterprise-grade organization and scalability for emergency response requirements.