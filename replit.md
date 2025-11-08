# Gulfood 2026 AI Event Assistant

## Overview
The Gulfood 2026 AI Event Assistant is a web application designed to enrich the experience for visitors, exhibitors, and event organizers at the Gulfood 2026 trade show. It provides AI-powered company analysis, intelligent exhibitor matching, meeting scheduling, and real-time event analytics. The platform offers immediate, free access without registration to maximize engagement, featuring an AI chatbot named "Faris." It supports three user groups—Visitors, Exhibitors, and Event Organizers—with role-based access to specialized functionalities like the Analytics Dashboard. The project aims to improve event navigation, facilitate business connections, and provide valuable insights for all participants.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is a React 18 application with TypeScript, utilizing Wouter for routing and TanStack Query for state management. UI components are built with Radix UI and shadcn/ui, styled using Tailwind CSS, following a design system inspired by Gulfood.com and GITEX.com with responsive layouts and a custom color scheme. The AI Chatbot, "Faris," offers multilingual support (English, Arabic, Simplified Chinese, Hindi) and role-based assistance (Visitor, Exhibitor, Organizer), including features like visitor registration CTAs, social sharing, and lead capture. The system generates professional, branded PDF reports for analytics and visitor journeys. Key features include an AI response accuracy feedback system, a "Plan my Journey" feature with intelligent, distance-aware itinerary planning, and optimized performance through lazy loading and efficient API calls. Authentication and context management are handled via `AuthContext`, `RoleContext`, and `ChatbotContext`. Dedicated pages exist for `/organizer/login`, `/organizer/admin`, and `/exhibitor/verify`. The chatbot features a tabbed interface ("Chat" and "Right Now") displaying live announcements and upcoming sessions dynamically based on user role and target audience.

### Backend Architecture
The backend is built with Node.js and Express.js, using a PostgreSQL database (Neon serverless) managed with Drizzle ORM. It provides RESTful APIs for exhibitors, company analysis, meetings, chatbot interactions, leads, referrals, and analytics. It features advanced search capabilities (accent- and punctuation-insensitive), AI integration via OpenAI API for company analysis and chatbot functionality, and a venue navigation system integrating Google Routes API. The backend supports comprehensive referral tracking, lead management with status updates, and dynamic PDF report generation. Authentication is JWT-based, with `requireOrganizerAuth` middleware protecting administrative routes and bcryptjs for secure password hashing. New database tables manage organizers, announcements, sessions, and exhibitor access codes. Protected API routes handle organizer registration/login, and CRUD operations for announcements, sessions, and exhibitor access codes, while exhibitor code verification is publicly accessible.

**DEC Venue Integration** (November 2025): The system now accurately distinguishes between Dubai Exhibition Centre (DEC) and Dubai World Trade Centre (DWTC) venues. Features include: (1) Parser and ingestion scripts (`scripts/parse-dec-exhibitors.ts`, `scripts/ingest-dec-exhibitors.ts`) that extract venue, hall, and booth location data from gulfood.com exhibitor listings; (2) Fuzzy matching algorithm using exact name, normalized name, and name+country matching strategies to update existing exhibitor records while preserving data integrity; (3) Enhanced storage interface with venue filtering support via `/api/exhibitors?venue={venue_name}` endpoint (currently tracking 10 DEC exhibitors, 163 DWTC exhibitors); (4) Journey planning and itinerary responses now include `venue` and `hall` fields for all matched exhibitors, enabling accurate location-based recommendations and route planning.

**Intelligent Scoring System**: The AI-powered journey planning system (November 2025) uses sophisticated scoring algorithms with robust error handling. Key features include: (1) Brace-aware JSON extraction using character-by-character stack parsing to handle nested arrays/objects correctly; (2) Batch processing of exhibitor scoring (max 10 per batch) to prevent API token truncation; (3) Fail-fast error handling that surfaces truncation/validation failures instead of silent data loss; (4) Pre-filtering of exhibitors by interest categories (40 matching + 10 variety) before AI scoring to ensure sector alignment; (5) Strengthened AI prompts emphasizing interest category matching as the #1 priority with explicit scoring bands (70-95% for matches, 20-50% for non-matches); (6) finish_reason checking to detect and log truncated AI responses. These improvements ensure users receive realistic relevance scores (70-95%) instead of fallback values (50%), and exhibitor recommendations accurately match their selected interest categories.

### Development Infrastructure
The development workflow utilizes tsx for development and Vite (frontend) and esbuild (backend) for production builds. Drizzle Kit manages database migrations, and type safety is enforced using shared schema definitions with Drizzle Zod.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Managed database solution.
- **Drizzle ORM**: Type-safe SQL query builder for database interactions.

### AI Services
- **OpenAI API**: Utilized for AI chatbot functionalities and company analysis.

### UI Component Libraries
- **Radix UI**: Provides unstyled, accessible component primitives.
- **shadcn/ui**: Offers pre-styled components based on Radix UI.
- **Tailwind CSS**: Used for utility-first styling.
- **Lucide React**: Provides an icon set for the application.

### Additional Services
- **TanStack Query**: For server state synchronization and caching.
- **Wouter**: A lightweight client-side router.
- **React Hook Form**: Manages form state with Zod validation.
- **date-fns**: A utility library for date manipulation.
- **Google Maps API**: Specifically Google Routes API for venue navigation and real-time traffic data.
- **Resend**: For sending email confirmations and notifications.