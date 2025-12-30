# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bearified Ad Factory is an AI-powered UGC marketing content generator for fintech app launches. It generates video scripts every 3 hours using GPT-4, with optional automated video generation via Arcads.ai or self-hosted Wav2Lip.

## Commands

```bash
npm run dev           # Start dev server (port 5000, Vite HMR)
npm run build         # Production build (Vite + ESBuild → dist/)
npm run start         # Run production server
npm run check         # TypeScript type checking
npm run db:push       # Apply Drizzle database migrations
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
```

## Testing

The project uses **Vitest** for testing with **135 tests** covering both server and client:

**Server tests** (`server/__tests__/`):
- `storage.test.ts` - File storage operations (29 tests)
- `routes.test.ts` - API endpoint integration tests (24 tests)
- `openai.test.ts` - Script generation logic (14 tests)
- `arcads.test.ts` - Arcads video service (26 tests)
- `wav2lip.test.ts` - Wav2Lip video service (13 tests)
- `cron.test.ts` - Scheduled job execution (12 tests)

**Client tests** (`client/src/__tests__/`):
- `stats-card.test.tsx` - StatsCard component (8 tests)
- `not-found.test.tsx` - NotFound page (3 tests)
- `script-card.test.tsx` - ScriptCard component (15 tests)

Run `npm run test:coverage` to generate coverage report.

## Code Quality

**ESLint** is configured with TypeScript and React plugins. **Prettier** handles code formatting.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on PRs and pushes to main:
1. Type checking (`npm run check`)
2. Linting (`npm run lint`)
3. Tests with coverage
4. Production build

## Architecture

**Monorepo structure with three main parts:**

- `client/` - React SPA with Vite, TanStack Query, Tailwind, shadcn/ui
- `server/` - Express.js REST API with file-based JSON storage
- `shared/` - Shared TypeScript types and Zod schemas

**Backend modules:**
- `routes.ts` - All API endpoints with inline validation
- `storage.ts` - File-based persistence (`data/scripts.json`, `data/settings.json`)
- `openai.ts` - GPT-4 integration with rate limiting (p-retry)
- `cron.ts` - Scheduled generation every 3 hours via node-cron
- `arcads.ts` - Arcads.ai video generation
- `wav2lip.ts` - Self-hosted Wav2Lip video generation with TTS

**Frontend:**
- Pages: `dashboard.tsx`, `scripts.tsx`, `tracking.tsx`, `settings.tsx`
- Uses Wouter for routing, React Query for server state
- Path aliases: `@/` → client/src, `@shared/` → shared

**Data storage:** JSON files in `/data` directory. PostgreSQL/Drizzle is configured but not actively used.

## External Services

- **OpenAI GPT-4**: Via Replit AI Integrations (no manual key needed)
- **Resend**: Email notifications via Replit Connectors
- **Arcads.ai**: Video generation (requires `ARCADS_API_KEY` secret)
- **Wav2Lip**: Self-hosted video generation (optional)

## Design System

Linear-inspired productivity aesthetic with Inter font. See `design_guidelines.md` for detailed component specifications and spacing rules.
