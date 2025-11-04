# Gulfood 2026 AI Event Assistant

## Overview
The Gulfood 2026 AI Event Assistant is a web application designed to enhance the experience for visitors, exhibitors, and event organizers at the Gulfood 2026 trade show. It offers AI-powered company analysis, intelligent exhibitor matching, meeting scheduling, and real-time event analytics. The platform is freely accessible without registration, aiming to maximize engagement by providing immediate access to its features, including an AI chatbot named "Faris." The application supports three user groups: Visitors, Exhibitors, and Event Organizers, with role-based access to specialized functionalities like the Analytics Dashboard.

## Recent Changes

### November 4, 2025 - Lead Capture System
- **Integrated Lead Capture in Faris Chatbot**: Implemented comprehensive lead capture system differentiated from competitor "Zeta's Suzan" chatbot:
  - **Automatic Trigger**: Dialog appears 3 seconds after user's 3rd message in conversation
  - **Gulfood Branding**: Orange/gold gradient styling (from-orange-600 to-amber-600) instead of competitor's purple
  - **Unique Messaging**: "Stay Connected with Gulfood 2026" title and "Connect with Us" button (vs. competitor's "Please leave your details in case we disconnect")
  - **Category Selection**: Visitor, Exhibitor, Organizer, Media, Other
  - **Validation**: Required fields (name, email, valid category) with proper Zod schema enforcement
  - **Session Tracking**: Associates leads with chat sessions for context
- **Leads Management Dashboard**: Added "Recent Leads" section to Analytics Dashboard for organizers:
  - Displays lead cards with name, email, category badge, status badge (new/contacted/qualified/converted)
  - Shows message preview and timestamp
  - Auto-refreshes every 15 seconds
  - Orange branding consistent with Gulfood theme
  - Total lead count displayed
- **Backend Infrastructure**:
  - Database table: leads (id, name, email, category, message, sessionId, status, assignedTo, notes, createdAt)
  - API endpoints: POST /api/leads (create), GET /api/leads (list with filters), PATCH /api/leads/:id (update status)
  - Storage layer with filter support by status and category
- **Bug Fixes**:
  - Fixed trigger logic to use updated message count instead of stale state
  - Enhanced validation to enforce required fields and category enum constraints

### November 3, 2025 - UI and PDF Improvements
- **Faris Chatbot Width Optimization**: Adjusted chatbot dimensions for better UX:
  - Reduced width from 600px/700px to 480px/520px (sm/md breakpoints)
  - Prevents chatbot from covering left-side navigation and content
  - Maintains full-width on mobile devices for optimal mobile experience
  - Fixed positioning at bottom-right with proper spacing (bottom-4, right-4)
- **Middle Eastern Cultural Bot Avatar**: Replaced sparkle icon with custom AI-generated avatar:
  - Middle Eastern-inspired design with traditional cultural elements
  - Modern AI aesthetic with warm desert colors (gold and turquoise accents)
  - Geometric Islamic art patterns reflecting Dubai/UAE cultural context
  - Displayed in both floating button and chatbot header for consistent branding
- **Professional PDF Report Branding**: Enhanced all PDF reports with structured layouts and Gulfood 2026 branding:
  - **Gradient Headers**: Color-coded headers for each report type:
    - Organizer Analytics: Blue gradient (#2563eb to #1d4ed8)
    - Visitor Journey: Green gradient (#16a34a to #15803d)
    - Journey Plan: Orange gradient (#f97316 to #ea580c)
  - **Structured Content**: Professional layouts with:
    - "GULFOOD 2026" title in large bold white text
    - Event dates and location subtitle
    - Clear section headers and organized content
    - Proper spacing and typography using Helvetica font
  - **Smart Report Selection**: Backend automatically chooses between journey plan PDF (for itineraries with tables/days) and regular journey PDF (for general conversations) based on message content analysis
- **AI Response Accuracy Tracking**: Implemented comprehensive feedback system for AI chatbot:
  - Thumbs up/down buttons on every AI response (except welcome message)
  - Feedback data stored in database for analytics and improvement
  - Real-time accuracy percentage displayed on Analytics Dashboard
  - Shows total feedback count and calculated accuracy rate
  - Fixed bug: Feedback state now properly resets when users change roles
- **PDF Report Generation**: Professional PDF reports for both organizers and visitors:
  - **Organizers**: Comprehensive analytics PDF with key metrics, sector engagement table, and event branding
  - **Visitors**: Journey report PDF with session details, conversation history, and formatted chat transcript
  - **Journey Plans**: Dedicated PDF for itineraries with parsed markdown tables and formatted schedules
  - Download buttons trigger instant PDF generation and download
  - PDFs stored in database as base64 for record-keeping
  - Proper Content-Type headers (application/pdf) for browser downloads
  - Reports accessible via `/api/reports/:id/download` endpoint
- **Analytics Dashboard Enhancements**:
  - Replaced "Meeting Requests" stat with "AI Response Accuracy" metric
  - Shows AI accuracy percentage with trend indicator
  - Displays subtitle showing feedback count basis
  - Added "Download Analytics Report" button for organizers
  - Real-time data refresh every 10 seconds

### Previous Updates (November 3, 2025)
- **Enhanced "Plan my Journey" Feature**: Renamed "Plan my event schedule" to "Plan my Journey" with intelligent distance-aware planning. Faris now creates optimized itineraries that:
  - Asks visitors how many days they plan to attend (1-5 days, Jan 26-30, 2026) and sector interests
  - Considers actual distance between venues (12 km / 7.5 miles)
  - Factors in travel time (20-30 mins by car/taxi) and includes 45-min buffer for venue changes
  - Minimizes back-and-forth travel by grouping exhibitors by venue location
  - Dedicates specific days to specific venues (e.g., Day 1-2: DWTC, Day 3: Expo City Dubai)
  - Creates day-by-day schedules with specific times, activities, venues, and sector-based exhibitor visits
  - Provides table-formatted itineraries with morning sessions, lunch breaks, afternoon sessions, and networking time
  - Optimizes routes based on user's selected sectors (Dairy, Meat, Beverages, etc.)
- **Fixed Analytics Data Consistency**: Sector Engagement now displays real-time data from the exhibitor database instead of hardcoded values. Counts and percentages are calculated dynamically, ensuring Total Registrations and Sector Engagement statistics are consistent. Changed label from "registrations" to "exhibitors" for clarity.
- **Contact Sales Feature**: Added dedicated "Contact Sales" button for exhibitors at the end of their journey in the chatbot. Features orange gradient styling, comprehensive form with company details, email validation, and auto-close dialog after successful submission. Sales inquiries are stored in database with pending status for follow-up.
- **Fixed URL validation bug**: Company Analyzer now accepts URLs with `https://` protocol. Previously rejected valid URLs because "https" contains 5 consecutive consonants which triggered gibberish filter.
- **Direct Organizer role access**: Added "Select Organizer Role" button on Analytics page for instant access without navigating through Faris chatbot.
- **Performance optimization**: Exhibitor Directory now uses lazy loading - only fetches data when users search or apply filters.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18 with TypeScript, Wouter for routing, and TanStack Query for state management. UI components are built with Radix UI primitives and shadcn/ui, styled using Tailwind CSS. The design system is inspired by Gulfood.com and GITEX.com, featuring responsive layouts and a custom color scheme. The AI Chatbot, "Faris," provides multilingual (English, Arabic, Simplified Chinese, Hindi) and role-based (Visitor, Exhibitor, Organizer) assistance. Performance is optimized through lazy loading and efficient API calls.

### Backend Architecture
The backend is built with Node.js and Express.js, utilizing a PostgreSQL database (Neon serverless) managed with Drizzle ORM. It provides RESTful APIs for exhibitors, company analysis, meetings, chatbot interactions, and analytics. Key features include advanced search capabilities with accent- and punctuation-insensitive matching, and an AI integration strategy leveraging OpenAI API for company analysis and the chatbot. A venue navigation system integrates Google Routes API for real-time traffic and client-side calculations for Dubai Metro schedules.

### Development Infrastructure
The development workflow uses tsx for development and Vite (frontend) and esbuild (backend) for production builds. Drizzle Kit handles database migrations. Type safety is enforced using shared schema definitions with Drizzle Zod.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Managed database.
- **Drizzle ORM**: Type-safe SQL query builder.

### AI Services
- **OpenAI API**: Used for company analysis and the AI chatbot.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives.
- **shadcn/ui**: Pre-styled components based on Radix UI.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### Additional Services
- **TanStack Query**: Server state synchronization and caching.
- **Wouter**: Lightweight client-side router.
- **React Hook Form**: Form state management with Zod validation.
- **date-fns**: Date manipulation utility.
- **Google Maps API**: Specifically Google Routes API for venue navigation and real-time traffic data.