# Bearified Ad Factory

## Overview

Bearified Ad Factory is an AI-powered UGC (User Generated Content) marketing content generator designed for fintech app launches. The application generates 8-10 UGC-style video scripts every 3 hours using GPT-4, with support for multiple script types (product demo, founder story, skeptic-to-believer, feature highlight) and platforms (Twitter, TikTok, Instagram).

Core capabilities include:
- AI script generation via OpenAI GPT-4
- Dashboard for tracking script status and statistics
- Scheduled generation every 3 hours
- Email notifications via Resend API
- CSV export functionality
- **Arcads.ai integration** for automated AI video generation from scripts

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite with custom plugins for Replit integration
- **Design System**: Linear-inspired productivity aesthetic with Inter font family

The frontend follows a standard React SPA pattern with pages (dashboard, scripts, tracking, settings) and reusable components. Path aliases are configured (`@/` for client source, `@shared/` for shared types).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api/` prefix
- **Build**: ESBuild for production bundling with selective dependency bundling

Key backend modules:
- `routes.ts` - API endpoint definitions
- `storage.ts` - File-based JSON storage for scripts and settings
- `openai.ts` - GPT-4 integration with rate limiting and retry logic
- `resend.ts` - Email service integration
- `cron.ts` - Scheduled job management using node-cron
- `arcads.ts` - Arcads.ai API integration for video generation

### Data Storage
- **Primary Storage**: File-based JSON storage in `/data` directory
- **Database Config**: Drizzle ORM with PostgreSQL configured but not actively used for main data
- Scripts stored in `data/scripts.json` with individual files organized by date in `data/scripts/`
- Settings stored in `data/settings.json`

The application uses a hybrid approach where Drizzle/PostgreSQL is configured for potential future use, but current implementation relies on JSON file storage for simplicity.

### Scheduling System
- node-cron handles script generation every 3 hours (`0 */3 * * *`)
- Configurable auto-generation toggle in settings
- Generates configurable number of scripts (default: 8) across all platforms

### Video Generation (Arcads.ai)
- **API Integration**: Arcads.ai private API for AI UGC video generation
- **API Key**: Stored as environment secret `ARCADS_API_KEY` (not in settings file)
- **Avatar Configuration**: Configurable avatar ID in settings
- **Auto-Generation**: Optional toggle to automatically generate videos for new scripts
- **Video Status Tracking**: Scripts track video status (none, pending, generating, complete, failed)
- **Background Processing**: Video generation polls in background until complete
- **Endpoints**:
  - `POST /api/scripts/:id/generate-video` - Trigger video for specific script
  - `GET /api/arcads/status` - Check if API key is configured

## External Dependencies

### AI Integration
- **OpenAI GPT-4**: Accessed via Replit AI Integrations service
- Uses environment variables `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`
- Implements rate limiting (2 concurrent requests) and retry logic with p-limit and p-retry

### Video Generation
- **Arcads.ai API**: Private API for AI video generation
- Requires `ARCADS_API_KEY` environment secret
- Contact r@arcads.ai for API access
- Supports avatar selection, voice settings, and batch processing

### Email Service
- **Resend API**: For summary email notifications
- Credentials fetched dynamically via Replit Connectors API
- Sends summaries with script counts and top hooks

### Database
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable
- Uses Drizzle ORM with drizzle-kit for migrations
- Schema defined in `shared/schema.ts`

### Key NPM Dependencies
- `@tanstack/react-query` - Server state management
- `node-cron` - Task scheduling
- `drizzle-orm` / `drizzle-zod` - Database ORM and validation
- `resend` - Email sending
- `openai` - OpenAI API client
- Radix UI primitives - Accessible component foundations

## Recent Changes

- **2025-12-10**: Added Arcads.ai API integration for video generation
  - New `server/arcads.ts` service module
  - Video status tracking (none, pending, generating, complete, failed)
  - Settings page Arcads configuration section
  - Tracking page video status column with view/download links
  - Auto-generate videos option for new scripts
- **2025-12-10**: Changed cron schedule from daily 6 AM EST to every 3 hours
