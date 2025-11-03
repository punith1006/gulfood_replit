# Gulfood 2026 AI Event Assistant

## Overview
The Gulfood 2026 AI Event Assistant is a web application designed to enhance the experience for visitors, exhibitors, and event organizers at the Gulfood 2026 trade show. It offers AI-powered company analysis, intelligent exhibitor matching, meeting scheduling, and real-time event analytics. The platform is freely accessible without registration, aiming to maximize engagement by providing immediate access to its features, including an AI chatbot named "Faris." The application supports three user groups: Visitors, Exhibitors, and Event Organizers, with role-based access to specialized functionalities like the Analytics Dashboard.

## Recent Changes

### November 3, 2025
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