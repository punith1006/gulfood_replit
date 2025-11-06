# Gulfood 2026 AI Event Assistant

## Overview
The Gulfood 2026 AI Event Assistant is a web application designed to enhance the experience for visitors, exhibitors, and event organizers at the Gulfood 2026 trade show. It offers AI-powered company analysis, intelligent exhibitor matching, meeting scheduling, and real-time event analytics. The platform is freely accessible without registration, aiming to maximize engagement by providing immediate access to its features, including an AI chatbot named "Faris." The application supports three user groups: Visitors, Exhibitors, and Event Organizers, with role-based access to specialized functionalities like the Analytics Dashboard.

## Recent Updates (November 2025)
- **Chat PDF Export with IDM Compatibility (LATEST)**: Iframe-based download system for seamless download manager integration
  - **Server-Side Generation**: Chat transcripts generated server-side using PdfPrinter (same approach as Journey PDFs)
  - **Proper HTTP Headers**: PDFs served with correct Content-Type, Content-Disposition, and Content-Length headers
  - **Robust Validation**: Zod schema validation with role whitelisting, timestamp clamping, and sanitized error responses
  - **Safe Date Formatting**: Defensive guards against invalid dates and malformed input
  - **Emoji Removal**: Complete Unicode-aware emoji stripping using `/\p{Extended_Pictographic}/gu`
  - **No Antivirus Warnings**: Server-generated PDFs avoid false positives from browser-based generation
  - **UI Cleanup**: Removed redundant "Download Journey Report" button from Chat tab
  - **IDM Compatibility**: Iframe-based form submission prevents download manager interception issues
  - **Smart Timeout System**: 
    - 3-second progress notification ("Download In Progress") without interrupting transfer
    - 5-minute cleanup fallback prevents memory leaks while accommodating slow connections
    - Dual timeout design ensures no legitimate downloads are cancelled
  - **Accurate User Feedback**: Distinct messages for progress, success, server errors, and network failures
  - **SPA Preservation**: Form targets hidden iframe, so errors don't navigate away from application
  - **Resource Management**: Proper cleanup of iframes and timeouts after success/error or 5-minute fallback
- **Enhanced Journey Planning - Exhibitly-Quality Reports**: Premium journey reports with rich personalization
  - **Critical Fix**: User's own company now excluded from exhibitor recommendations using case-insensitive filtering
  - **10 Matched Exhibitors**: Expanded from 5 to 10 exhibitors with individual match scores (0-100%)
  - **Hyper-Personalized Reasons**: Each exhibitor includes a "Why this matters to you" explanation tailored to user's organization + role
  - **Event Highlights**: AI generates 4-5 relevant Gulfood 2026 zones/features/areas specifically for the user's profile
  - **Dynamic Category Filters**: Auto-generated from matched exhibitor sectors (e.g., "Dairy Products", "Beverages") with count badges
  - **Visual Enhancements**: Color-coded match scores (green for 80%+, yellow for 60-79%), prominent personalized reasons display
  - **Smart Filtering**: Interactive category badges allow filtering exhibitors by sector
- **AI-Powered Journey Evaluation**: Replaced embedding-based matching with direct AI evaluation
  - **Same Approach as Company Analyzer**: Uses identical scoring criteria for consistency across app
  - **Contextual Relevance Scoring**: AI directly evaluates user profile (organization + role + interests + intents) to generate 0-100 score
  - **Industry-Based Scoring**:
    - 80-100%: Direct food/beverage professionals from F&B companies
    - 50-79%: Food-related professionals (food tech, packaging, equipment, logistics)
    - 20-49%: Tangentially related (agricultural tech, retail, consulting)
    - 0-19%: Not related to food/beverage industry
  - **No More Mathematical Similarity**: Replaced cosine similarity with true semantic understanding of business context
  - **Sessions**: Session matching removed - shows "No data available" as requested
  - Returns meaningful scores that reflect actual industry alignment, not mathematical similarity
- **Journey Planning Feature**: AI-powered personalized event journey with semantic matching
  - Session-based lead detection: If lead info already captured in current session (via Chat tab), Journey form skips name/email fields
  - Conditional form display: Shows personalized welcome message "Great! Let's personalize your event experience, [Name]" when lead exists in session
  - Optional fields: Interest Categories and Intent of Attending are truly optional (no minimum selection required)
  - Known Issue: PDF export has circular reference error when saving to database (core Journey functionality unaffected)
- **JWT-based Authentication System**: Implemented secure authentication for organizers and exhibitors with token-based session management stored in localStorage
- **Chatbot Tabs**: Added "Chat" and "Right Now" tabs to the AI chatbot, with the "Right Now" tab displaying live announcements and upcoming sessions
- **Announcements System**: Organizers can create, edit, and delete announcements with priority levels (normal, high, urgent) and target audiences (All, Visitor, Exhibitor, Organizer)
- **Sessions Management**: Organizers can schedule, update, and manage sessions with date/time/location details and target audience settings
- **Exhibitor Access Codes**: Organizers can generate unique access codes for exhibitors sent via email with optional expiration dates
- **Organizer Admin Panel**: Comprehensive admin interface at `/organizer/admin` with tabs for managing announcements, sessions, and access codes
- **Protected Routes**: Backend API routes protected with JWT middleware ensuring only authenticated organizers can perform administrative actions
- **Authentication Pages**: Created `/organizer/login` for organizer authentication and `/exhibitor/verify` for exhibitor code verification

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18 with TypeScript, Wouter for routing, and TanStack Query for state management. UI components are built with Radix UI primitives and shadcn/ui, styled using Tailwind CSS. The design system is inspired by Gulfood.com and GITEX.com, featuring responsive layouts and a custom color scheme. The AI Chatbot, "Faris," provides multilingual (English, Arabic, Simplified Chinese, Hindi) and role-based (Visitor, Exhibitor, Organizer) assistance. Features include visitor registration calls-to-action, social sharing (LinkedIn, Facebook, Instagram), and lead capture integrated within the chatbot. Professional PDF reports with Gulfood 2026 branding are generated for analytics and visitor journeys. The chatbot's width is optimized for better UX, and it features a custom Middle Eastern cultural avatar. An AI response accuracy feedback system is implemented, and the "Plan my Journey" feature offers intelligent, distance-aware itinerary planning. Performance is optimized through lazy loading and efficient API calls.

**Authentication & Context Management**:
- `AuthContext`: Manages authentication state for both organizers (email/password) and exhibitors (access codes), storing JWT tokens in localStorage
- `RoleContext`: Manages user role selection (Visitor, Exhibitor, Organizer) for chatbot personalization
- `ChatbotContext`: Controls chatbot visibility and state across the application

**Key Pages**:
- `/organizer/login`: Dual-tab interface for organizer login and registration
- `/organizer/admin`: Protected admin panel with comprehensive CRUD operations for announcements, sessions, and access codes
- `/exhibitor/verify`: Special code verification page for exhibitor access

**Chatbot Enhancement**:
- Tabbed interface with "Chat" and "Right Now" tabs
- Real-time updates of announcements and sessions in "Right Now" tab
- Live filtering of active announcements and upcoming sessions
- Dynamic content based on user role and target audience

### Backend Architecture
The backend is built with Node.js and Express.js, utilizing a PostgreSQL database (Neon serverless) managed with Drizzle ORM. It provides RESTful APIs for exhibitors, company analysis, meetings, chatbot interactions, leads, referrals, and analytics. Key features include advanced search capabilities with accent- and punctuation-insensitive matching, and an AI integration strategy leveraging OpenAI API for company analysis and the chatbot. A venue navigation system integrates Google Routes API for real-time traffic and client-side calculations for Dubai Metro schedules. The backend supports comprehensive referral tracking with statistics for organizers, lead management with status updates, and dynamic PDF report generation.

**Authentication & Authorization**:
- JWT-based authentication using jsonwebtoken library with configurable expiration
- `requireOrganizerAuth` middleware protecting admin routes by validating JWT tokens from Authorization headers
- Password hashing with bcryptjs for secure organizer credentials
- Unique access code generation for exhibitors with usage tracking and expiration support

**New Database Tables**:
- `organizers`: Stores organizer accounts with hashed passwords and role information
- `announcements`: Event announcements with title, message, priority, target audience, and active status
- `sessions`: Scheduled sessions with date, time, location, description, and target audience
- `exhibitorAccessCodes`: Special access codes for exhibitor authentication with company name, email, usage tracking, and expiration dates

**Protected API Routes**:
- `POST /api/organizer/register`: Create new organizer account
- `POST /api/organizer/login`: Authenticate organizer and issue JWT
- `POST /api/announcements`: Create announcement (protected)
- `PATCH /api/announcements/:id`: Update announcement (protected)
- `DELETE /api/announcements/:id`: Delete announcement (protected)
- `POST /api/sessions`: Create session (protected)
- `PATCH /api/sessions/:id`: Update session (protected)
- `DELETE /api/sessions/:id`: Delete session (protected)
- `POST /api/exhibitor/access-codes`: Generate exhibitor access code (protected)
- `GET /api/exhibitor/access-codes`: List all access codes (protected)
- `POST /api/exhibitor/verify-code`: Verify exhibitor access code (public)

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