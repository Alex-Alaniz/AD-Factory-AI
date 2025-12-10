# Bearified Ad Factory

AI-powered UGC marketing content generator for fintech app launches. Built with Express.js, React, and OpenAI GPT-4.

## Features

- **AI Script Generation**: Generate 8-10 UGC-style video scripts daily using GPT-4
- **Script Types**: Product demo, founder story, skeptic-to-believer, feature highlight
- **Multi-Platform**: Optimized for Twitter, TikTok, and Instagram
- **Dashboard**: Track script status, view statistics, and manage content
- **Email Notifications**: Daily summary emails via Resend API
- **CSV Export**: Export script history for external use
- **Scheduling**: Automatic daily generation at 6 AM EST

## Tech Stack

- **Backend**: Express.js with TypeScript
- **Frontend**: React with Tailwind CSS
- **AI**: OpenAI GPT-4 (via Replit AI Integrations)
- **Email**: Resend API
- **Storage**: File-based JSON storage
- **Scheduling**: node-cron

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
├── server/                 # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # File-based storage
│   ├── openai.ts          # OpenAI integration
│   ├── resend.ts          # Email service
│   └── cron.ts            # Scheduled jobs
├── shared/                 # Shared types
│   └── schema.ts          # TypeScript schemas
└── data/                   # Generated data
    ├── scripts/           # Scripts organized by date
    ├── exports/           # CSV exports
    └── assets/            # Static assets
```

## Environment Variables

This app uses Replit's built-in integrations and does not require manual API key configuration:

- **OpenAI**: Automatically configured via Replit AI Integrations
- **Resend**: Configured via Replit Connectors

## API Endpoints

### Scripts
- `GET /api/scripts` - Get all scripts
- `GET /api/scripts/recent` - Get recent scripts
- `POST /api/scripts/generate` - Generate new scripts
- `PATCH /api/scripts/:id/status` - Update script status
- `GET /api/scripts/export` - Export to CSV

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Stats
- `GET /api/stats` - Get dashboard statistics

### Email
- `POST /api/test-email` - Send test email

## Script Generation Prompt

The AI generates scripts using this format:

```
Generate {count} unique UGC-style video scripts for Bearo, a crypto fintech app.
Features: instant payments, HONEY stablecoin currency, zero fees, $BEARCO memecoin integration.
Each script should be 15-30 seconds, authentic/casual tone, include a hook and clear CTA.
Vary between: excited user testimonial, product demo walkthrough, founder explaining vision, skeptic discovering benefits.
```

## Output Format

Each script includes:
- **Hook**: Attention-grabbing opening (5-15 words)
- **Body**: Main content (25-45 words)
- **CTA**: Clear call to action (5-15 words)
- **Metadata**: Character count, estimated duration, tone, word count

## Daily Schedule

- **6:00 AM EST**: Automatic script generation
- **Configurable**: 1-15 scripts per batch
- **Email Summary**: Sent after generation with top hooks and stats

## License

MIT
