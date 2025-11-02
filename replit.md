# Gulfood 2026 AI Event Assistant

## Overview

Gulfood 2026 AI Event Assistant is a web application designed to enhance the visitor and exhibitor experience at the Gulfood 2026 trade show in Dubai. The platform provides AI-powered company analysis, intelligent exhibitor matching, meeting scheduling, and real-time event analytics. Built as a full-stack TypeScript application, it serves as a comprehensive digital companion for one of the world's largest food and beverage exhibitions.

**Key Feature**: The application is **freely accessible without any registration or authentication**. Users can explore all features, interact with the AI assistant, schedule meetings, and browse exhibitors without signing up.

The application targets three primary user groups:
- **Visitors**: Individuals seeking personalized exhibitor recommendations and event planning
- **Exhibitors**: Companies looking to connect with potential partners and manage their presence
- **Event Organizers**: DWTC staff monitoring registration metrics and engagement analytics

## Access Model

### No Registration Required
The platform operates on an open-access model designed to maximize engagement:

**Pre-Event Access (No Registration):**
- **Visitors**: Can use AI bot to learn about the event, discover exhibitors, get recommendations, and explore features
- **Exhibitors**: Can view event information and connect with DWTC sales team without signup

**Post-Event Registration:**
- **Visitors**: After event registration, continue using AI features for meeting schedules, exhibit guidance, and event navigation
- **Exhibitors**: After exhibitor registration, access AI bot for event insights, competitor analysis, and market intelligence

**Organizer Dashboard:**
- Analytics dashboard currently open to all users
- May implement exclusive access controls in future for DWTC staff (contains sensitive analytical data)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with custom design tokens
- **Build Tool**: Vite

**Design System:**
The application follows a premium trade show aesthetic inspired by Gulfood.com and GITEX.com, implementing:
- Typography using Inter font family (weights 400-900)
- Consistent spacing primitives based on Tailwind units
- Component-based architecture with reusable UI elements
- Responsive layouts with mobile-first approach
- Custom color scheme with light/dark mode support through CSS variables

**Component Structure:**
- Page-level components (`/pages`): Home, NotFound
- Feature components (`/components`): Hero, Navigation, Footer, CompanyAnalyzer, ExhibitorDirectory, AnalyticsDashboard, AIChatbot, VenueNavigation
- UI primitives (`/components/ui`): 40+ shadcn/ui components for consistent interface patterns
- Shared utilities (`/lib`): Query client, utility functions

**Navigation:**
- Simplified navigation labels: "Visitors", "Exhibitors", "Analytics" (title case)
- No authentication buttons (no "Sign In" or "Register Now")
- All pages freely accessible to everyone

**Proactive AI Chatbot:**
- Auto-opens 2 seconds after first homepage visit
- Session-based tracking (won't auto-open on repeat visits)
- Comprehensive quick actions for: exhibitor discovery, travel planning, route mapping, meeting booking, venue navigation, hotel recommendations
- Encourages users to utilize AI for all event-related needs
- Floating button with visual pulse indicator when closed
- Helpful tooltip prompt before auto-opening

**State Management Approach:**
Server state is managed through React Query with custom query functions, implementing:
- Automatic refetching disabled by default (staleTime: Infinity)
- Centralized API request handling with error management
- Optimistic updates for mutations
- Session-based chat conversation persistence

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript (ESNext modules)
- **Framework**: Express.js
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **AI Integration**: OpenAI API for chat and analysis features

**API Design:**
RESTful endpoints organized by resource:
- `/api/exhibitors` - Exhibitor directory with search/filter
- `/api/exhibitors/:id` - Individual exhibitor details
- `/api/analyze-company` - AI-powered company analysis
- `/api/meetings` - Meeting request management
- `/api/chat` - AI chatbot conversations
- `/api/analytics` - Dashboard metrics

**Data Layer:**
Database schema uses PostgreSQL with the following core tables:
- `exhibitors`: Company profiles, booth locations, contact information
- `company_analyses`: AI-generated relevance scores and recommendations
- `meetings`: B2B meeting requests and scheduling
- `chat_conversations`: Persistent chat session storage

**AI Integration Strategy:**
OpenAI API integration for two primary use cases:
1. **Company Analysis**: Analyzes visitor company profiles against exhibitor database to generate relevance scores and personalized recommendations
2. **Chatbot Assistant**: Context-aware conversational interface for event information, exhibitor discovery, and navigation assistance

**Storage Layer:**
Implements a storage abstraction (`IStorage` interface) with PostgreSQL implementation for:
- Type-safe database operations
- Centralized query logic
- Support for complex filtering (search, sector-based)
- Aggregated analytics calculations

### Development Infrastructure

**Build Process:**
- Development: tsx for TypeScript execution with hot reload
- Production: Vite for frontend bundling, esbuild for backend bundling
- Database: Drizzle Kit for schema migrations (`db:push`)

**Module Resolution:**
Path aliases configured for clean imports:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*` (types, schemas shared between frontend/backend)
- `@assets/*` → `attached_assets/*`

**Type Safety:**
Shared schema definitions using Drizzle Zod for:
- Runtime validation
- TypeScript type inference
- API contract enforcement between frontend and backend

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Managed PostgreSQL database with WebSocket support for real-time connections
- **Drizzle ORM**: Type-safe SQL query builder and schema management
- Connection pooling via `@neondatabase/serverless`

### AI Services
- **OpenAI API**: Powers two core features:
  - Company relevance analysis
  - AI chatbot conversations
  - Requires `OPENAI_API_KEY` environment variable

### UI Component Libraries
- **Radix UI**: 25+ unstyled, accessible component primitives (dialogs, dropdowns, navigation, etc.)
- **shadcn/ui**: Pre-styled component implementations built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library (200+ icons used throughout)

### Additional Services
- **TanStack Query**: Server state synchronization and caching
- **Wouter**: Lightweight routing (1.3KB alternative to React Router)
- **React Hook Form**: Form state management with Zod validation
- **date-fns**: Date manipulation and formatting

### Development Tools
- **Vite Plugins**: Runtime error overlay, development banner, and Replit-specific integrations
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint/Prettier**: Code quality and formatting (implied by project structure)

### Assets
- Custom generated images stored in `attached_assets/generated_images/`:
  - Hero imagery (Gulfood exhibition hall)
  - Feature illustrations (AI analysis, event planning)
  - Sector-specific booth displays (Dairy, Beverages, Organic, Meat & Poultry, Gourmet)
  - Meeting scheduler banner
  - Venue navigation map
  - Analytics dashboard visualization

### Environment Requirements
- `DATABASE_URL`: PostgreSQL connection string (required)
- `OPENAI_API_KEY`: OpenAI API authentication (required)
- `NODE_ENV`: Environment flag (development/production)