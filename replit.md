# Bearified Ad Factory

## Overview

Bearified Ad Factory is an AI-powered UGC (User Generated Content) marketing content generator designed for fintech app launches. The application generates 8-10 UGC-style video scripts daily using GPT-4, with support for multiple script types (product demo, founder story, skeptic-to-believer, feature highlight) and platforms (Twitter, TikTok, Instagram).

Core capabilities include:
- AI script generation via OpenAI GPT-4
- Dashboard for tracking script status and statistics
- Scheduled daily generation at 6 AM EST
- Email notifications via Resend API
- CSV export functionality

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

### Data Storage
- **Primary Storage**: File-based JSON storage in `/data` directory
- **Database Config**: Drizzle ORM with PostgreSQL configured but not actively used for main data
- Scripts stored in `data/scripts.json` with individual files organized by date in `data/scripts/`
- Settings stored in `data/settings.json`

The application uses a hybrid approach where Drizzle/PostgreSQL is configured for potential future use, but current implementation relies on JSON file storage for simplicity.

### Scheduling System
- node-cron handles daily script generation at 6 AM EST (11 AM UTC)
- Configurable auto-generation toggle in settings
- Generates configurable number of scripts (default: 8) across all platforms

## External Dependencies

### AI Integration
- **OpenAI GPT-4**: Accessed via Replit AI Integrations service
- Uses environment variables `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`
- Implements rate limiting (2 concurrent requests) and retry logic with p-limit and p-retry

### Email Service
- **Resend API**: For daily summary email notifications
- Credentials fetched dynamically via Replit Connectors API
- Sends daily summaries with script counts and top hooks

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