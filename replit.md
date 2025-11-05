# Gulfood 2026 AI Event Assistant

## Overview
The Gulfood 2026 AI Event Assistant is a web application designed to enhance the experience for visitors, exhibitors, and event organizers at the Gulfood 2026 trade show. It offers AI-powered company analysis, intelligent exhibitor matching, meeting scheduling, and real-time event analytics. The platform is freely accessible without registration, aiming to maximize engagement by providing immediate access to its features, including an AI chatbot named "Faris." The application supports three user groups: Visitors, Exhibitors, and Event Organizers, with role-based access to specialized functionalities like the Analytics Dashboard.

## Recent Updates (November 2025)
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