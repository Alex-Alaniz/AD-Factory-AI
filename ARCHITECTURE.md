# Bearified Ad Factory - System Architecture

## Overview

Bearified Ad Factory is an AI-powered UGC marketing content generator for Bearo (crypto fintech app). It generates 8-10 UGC-style video scripts every 3 hours using GPT-4, with dual video generation support.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BEARIFIED AD FACTORY                                  │
│                               (Replit Hosted - Node.js/React)                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        │                                   │                                   │
        ▼                                   ▼                                   ▼
┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│   FRONTEND        │             │     BACKEND       │             │   EXTERNAL        │
│   (React SPA)     │◄───────────►│   (Express API)   │◄───────────►│   SERVICES        │
└───────────────────┘             └───────────────────┘             └───────────────────┘
```

---

## Detailed Component Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND LAYER                                        │
│                                (client/src/ - React + TypeScript)                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│  │    Dashboard    │ │    Scripts      │ │    Tracking     │ │    Settings     │        │
│  │   (dashboard.   │ │   (scripts.     │ │   (tracking.    │ │   (settings.    │        │
│  │      tsx)       │ │      tsx)       │ │      tsx)       │ │      tsx)       │        │
│  ├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤        │
│  │ • Stats cards   │ │ • Script list   │ │ • Video status  │ │ • Email config  │        │
│  │ • Recent scripts│ │ • Filter/search │ │ • Progress bars │ │ • Auto-generate │        │
│  │ • Quick actions │ │ • Script cards  │ │ • Download links│ │ • Arcads config │        │
│  │ • Generation btn│ │ • Status badges │ │ • Batch tracking│ │ • Wav2Lip config│        │
│  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └────────┬────────┘        │
│           │                   │                   │                   │                  │
│           └───────────────────┴───────────────────┴───────────────────┘                  │
│                                         │                                                │
│                              ┌──────────┴──────────┐                                     │
│                              │  Shared Components   │                                     │
│                              ├─────────────────────┤                                     │
│                              │ • ScriptCard        │                                     │
│                              │ • StatsCard         │                                     │
│                              │ • Sidebar           │                                     │
│                              │ • shadcn/ui library │                                     │
│                              └─────────────────────┘                                     │
│                                         │                                                │
│                              ┌──────────┴──────────┐                                     │
│                              │  TanStack Query     │                                     │
│                              │  (Data Fetching)    │                                     │
│                              └─────────────────────┘                                     │
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │
                                    HTTP REST API
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND LAYER                                         │
│                               (server/ - Express + TypeScript)                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              API ROUTES (routes.ts)                               │   │
│  ├──────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                   │   │
│  │  SCRIPTS                          VIDEO GENERATION          SYSTEM               │   │
│  │  ────────                         ────────────────          ──────               │   │
│  │  GET  /api/scripts                POST /api/scripts/:id/    GET  /api/stats      │   │
│  │  GET  /api/scripts/recent              generate-video       GET  /api/settings   │   │
│  │  POST /api/scripts/generate       GET  /api/arcads/status   PUT  /api/settings   │   │
│  │  PATCH/api/scripts/:id/status     POST /api/wav2lip/        POST /api/test-email │   │
│  │  GET  /api/scripts/export              generate-video       POST /api/trigger-   │   │
│  │                                   GET  /api/wav2lip/status       daily-generation│   │
│  │                                                                                   │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                              │
│           ┌───────────────────────────────┼───────────────────────────────┐              │
│           │                               │                               │              │
│           ▼                               ▼                               ▼              │
│  ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐    │
│  │   storage.ts    │             │   openai.ts     │             │    cron.ts      │    │
│  ├─────────────────┤             ├─────────────────┤             ├─────────────────┤    │
│  │ • getAllScripts │             │ • generateScript│             │ • Schedule jobs │    │
│  │ • createScript  │             │   ForPlatform() │             │ • Every 3 hours │    │
│  │ • updateScript  │             │ • Rate limiting │             │ • Auto-generate │    │
│  │ • getSettings   │             │ • Retry logic   │             │   scripts       │    │
│  │ • exportToCSV   │             │ • GPT-4 prompts │             │ • Email notify  │    │
│  └────────┬────────┘             └────────┬────────┘             └─────────────────┘    │
│           │                               │                                              │
│           ▼                               │                                              │
│  ┌─────────────────┐                      │                                              │
│  │  /data/*.json   │                      │                                              │
│  │  (File Storage) │                      │                                              │
│  └─────────────────┘                      │                                              │
│                                           │                                              │
│           ┌───────────────────────────────┼───────────────────────────────┐              │
│           │                               │                               │              │
│           ▼                               ▼                               ▼              │
│  ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐    │
│  │   arcads.ts     │             │   wav2lip.ts    │             │   resend.ts     │    │
│  ├─────────────────┤             ├─────────────────┤             ├─────────────────┤    │
│  │ • createArcads  │             │ • OpenAI TTS    │             │ • sendSummary   │    │
│  │   Service()     │             │ • generateVideo │             │   Email()       │    │
│  │ • generateVideo │             │ • checkStatus   │             │ • sendTestEmail │    │
│  │ • checkStatus   │             │ • pollComplete  │             │                 │    │
│  │ • pollComplete  │             │                 │             │                 │    │
│  └────────┬────────┘             └────────┬────────┘             └────────┬────────┘    │
│           │                               │                               │              │
└───────────┼───────────────────────────────┼───────────────────────────────┼──────────────┘
            │                               │                               │
            ▼                               ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXTERNAL SERVICES                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐                │
│  │    OpenAI       │       │    Arcads.ai    │       │     Resend      │                │
│  │  (GPT-4 + TTS)  │       │ (Commercial AI  │       │  (Email API)    │                │
│  ├─────────────────┤       │    Avatars)     │       ├─────────────────┤                │
│  │ Script generation│       ├─────────────────┤       │ Summary emails  │                │
│  │ Text-to-Speech  │       │ AI video gen    │       │ Notifications   │                │
│  │ Replit managed  │       │ Requires API key│       │ Replit managed  │                │
│  └─────────────────┘       └─────────────────┘       └─────────────────┘                │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                      WAV2LIP (Self-Hosted - Your Windows PC)                      │   │
│  ├──────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                   │   │
│  │     Windows 10 + RTX 3090 GPU                                                     │   │
│  │     ───────────────────────────                                                   │   │
│  │                                                                                   │   │
│  │     ┌─────────────────┐                                                           │   │
│  │     │  Flask API      │◄────── http://YOUR_IP:5001/api                            │   │
│  │     │  (app.py)       │                                                           │   │
│  │     ├─────────────────┤        Endpoints:                                         │   │
│  │     │ POST /generate  │        • POST /api/generate (audio + image_url)           │   │
│  │     │ GET /status/:id │        • GET  /api/status/{job_id}                        │   │
│  │     │ GET /download/* │        • GET  /api/download/{filename}                    │   │
│  │     └────────┬────────┘        • GET  /api/health                                 │   │
│  │              │                                                                    │   │
│  │              ▼                                                                    │   │
│  │     ┌─────────────────┐                                                           │   │
│  │     │  Wav2Lip Model  │                                                           │   │
│  │     │  (GPU Inference)│                                                           │   │
│  │     ├─────────────────┤                                                           │   │
│  │     │ • wav2lip.pth   │                                                           │   │
│  │     │ • s3fd.pth      │                                                           │   │
│  │     │ • FFmpeg        │                                                           │   │
│  │     └─────────────────┘                                                           │   │
│  │                                                                                   │   │
│  │     GitHub: github.com/Alex-Alaniz/Wav2LipBearo                                   │   │
│  │                                                                                   │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Script Generation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ Frontend │     │ Backend  │     │  OpenAI  │     │ Storage  │
│          │     │          │     │          │     │  GPT-4   │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ Click Generate │                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ POST /api/     │                │                │
     │                │ scripts/generate                │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │                │ Generate for   │                │
     │                │                │ each platform  │                │
     │                │                │───────────────>│                │
     │                │                │                │                │
     │                │                │    Script JSON │                │
     │                │                │<───────────────│                │
     │                │                │                │                │
     │                │                │ Save scripts   │                │
     │                │                │───────────────────────────────>│
     │                │                │                │                │
     │                │ Scripts array  │                │                │
     │                │<───────────────│                │                │
     │                │                │                │                │
     │ Update UI      │                │                │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
```

### 2. Video Generation Flow (Wav2Lip)

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐
│  User    │  │ Frontend │  │ Backend  │  │  OpenAI  │  │ Wav2Lip (Local)  │
│          │  │          │  │ wav2lip  │  │   TTS    │  │ Windows + GPU    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘
     │             │             │             │                  │
     │ Click       │             │             │                  │
     │ "Wav2Lip"   │             │             │                  │
     │────────────>│             │             │                  │
     │             │             │             │                  │
     │             │ POST /api/  │             │                  │
     │             │ wav2lip/    │             │                  │
     │             │ generate    │             │                  │
     │             │────────────>│             │                  │
     │             │             │             │                  │
     │             │             │ Script text │                  │
     │             │             │ to speech   │                  │
     │             │             │────────────>│                  │
     │             │             │             │                  │
     │             │             │ Audio MP3   │                  │
     │             │             │<────────────│                  │
     │             │             │             │                  │
     │             │             │ POST /api/generate              │
     │             │             │ audio + image_url               │
     │             │             │────────────────────────────────>│
     │             │             │             │                  │
     │             │             │             │      ┌───────────┤
     │             │             │             │      │Download   │
     │             │             │             │      │avatar img │
     │             │             │             │      ├───────────┤
     │             │             │             │      │Image→Video│
     │             │             │             │      │(FFmpeg)   │
     │             │             │             │      ├───────────┤
     │             │             │             │      │Wav2Lip    │
     │             │             │             │      │inference  │
     │             │             │             │      │(GPU)      │
     │             │             │             │      └───────────┤
     │             │             │             │                  │
     │             │             │ job_id      │                  │
     │             │             │<────────────────────────────────│
     │             │             │             │                  │
     │             │ job_id +    │             │                  │
     │             │ "pending"   │             │                  │
     │             │<────────────│             │                  │
     │             │             │             │                  │
     │ Show        │             │             │                  │
     │ "Generating"│             │             │                  │
     │<────────────│             │             │                  │
     │             │             │             │                  │
     │             │  [Polling every 10s]      │                  │
     │             │ GET /api/status/{job_id}  │                  │
     │             │──────────────────────────────────────────────>│
     │             │             │             │                  │
     │             │ status: complete          │                  │
     │             │ video_url: ...            │                  │
     │             │<──────────────────────────────────────────────│
     │             │             │             │                  │
     │ Show video  │             │             │                  │
     │ link        │             │             │                  │
     │<────────────│             │             │                  │
```

### 3. Automated Cron Job Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CRON SCHEDULE: Every 3 Hours                        │
│                              "0 */3 * * *"                                    │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │  cron.ts triggers     │
                          │  triggerDailyGen()    │
                          └───────────┬───────────┘
                                      │
                          ┌───────────▼───────────┐
                          │  Check settings:      │
                          │  autoGenerateEnabled? │
                          └───────────┬───────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
           ┌───────────────┐                   ┌───────────────┐
           │    FALSE      │                   │     TRUE      │
           │  (Skip gen)   │                   │  (Continue)   │
           └───────────────┘                   └───────┬───────┘
                                                       │
                                      ┌────────────────▼────────────────┐
                                      │  For each platform:             │
                                      │  • Twitter (3 scripts)          │
                                      │  • TikTok (3 scripts)           │
                                      │  • Instagram (2 scripts)        │
                                      └────────────────┬────────────────┘
                                                       │
                                      ┌────────────────▼────────────────┐
                                      │  OpenAI GPT-4 generates         │
                                      │  scripts with:                  │
                                      │  • Hook (attention grabber)     │
                                      │  • Body (main content)          │
                                      │  • CTA (call to action)         │
                                      │  • Metadata (duration, tone)    │
                                      └────────────────┬────────────────┘
                                                       │
                                      ┌────────────────▼────────────────┐
                                      │  Save to storage.ts             │
                                      │  /data/scripts.json             │
                                      └────────────────┬────────────────┘
                                                       │
                          ┌────────────────────────────┴────────────────┐
                          │                                             │
             ┌────────────▼────────────┐               ┌────────────────▼────────────┐
             │  autoGenerateVideos?    │               │  Send email notification    │
             └────────────┬────────────┘               │  via Resend API             │
                          │                            └─────────────────────────────┘
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
 ┌────────────────┐              ┌────────────────┐
 │     TRUE       │              │     FALSE      │
 │ Trigger video  │              │ (Skip videos)  │
 │ generation for │              └────────────────┘
 │ all scripts    │
 └────────────────┘
```

---

## Data Models

### Script Object

```typescript
interface Script {
  id: string;                    // Unique identifier (UUID)
  hook: string;                  // Attention-grabbing opening line
  body: string;                  // Main script content
  cta: string;                   // Call to action
  type: ScriptType;              // "product-demo" | "founder-story" | etc.
  platform: Platform;            // "twitter" | "tiktok" | "instagram"
  status: ScriptStatus;          // "pending" | "used" | "archived"
  metadata: {
    characterCount: number;
    estimatedDuration: number;   // seconds
    tone: Tone;                  // "excited" | "casual" | etc.
    wordCount: number;
  };
  createdAt: string;             // ISO timestamp
  generatedBatch: string;        // Batch grouping ID
  
  // Video generation
  videoStatus: VideoStatus;      // "none" | "pending" | "generating" | "complete" | "failed"
  videoUrl: string | null;
  videoJobId: string | null;
}
```

### Settings Object

```typescript
interface Settings {
  adminEmail: string;            // For notifications
  dailyScriptCount: number;      // Scripts per batch (default: 8)
  autoGenerateEnabled: boolean;  // Cron enabled
  productFeatures: string;       // Bearo features for prompts
  lastUpdated: string;
  
  // Arcads.ai
  arcadsAvatarId: string;
  autoGenerateVideos: boolean;
  
  // Wav2Lip
  wav2lipApiUrl: string;         // "http://192.168.1.100:5001/api"
  wav2lipAvatarImageUrl: string; // Avatar face image URL
  wav2lipEnabled: boolean;
  preferredVideoProvider: "arcads" | "wav2lip";
}
```

---

## File Structure

```
bearified-ad-factory/
├── client/
│   └── src/
│       ├── App.tsx                 # Main router + layout
│       ├── main.tsx                # Entry point
│       ├── index.css               # Global styles + Tailwind
│       ├── components/
│       │   ├── ui/                 # shadcn/ui components
│       │   ├── script-card.tsx     # Script display card
│       │   ├── stats-card.tsx      # Dashboard stat cards
│       │   └── app-sidebar.tsx     # Navigation sidebar
│       ├── pages/
│       │   ├── dashboard.tsx       # Main dashboard
│       │   ├── scripts.tsx         # Script library
│       │   ├── tracking.tsx        # Video tracking
│       │   ├── settings.tsx        # Configuration
│       │   └── not-found.tsx       # 404 page
│       ├── lib/
│       │   └── queryClient.ts      # TanStack Query config
│       └── hooks/
│           └── use-toast.ts        # Toast notifications
│
├── server/
│   ├── index.ts                    # Express server entry
│   ├── routes.ts                   # All API endpoints
│   ├── storage.ts                  # File-based JSON storage
│   ├── openai.ts                   # GPT-4 script generation
│   ├── arcads.ts                   # Arcads.ai video service
│   ├── wav2lip.ts                  # Wav2Lip video service + TTS
│   ├── resend.ts                   # Email notifications
│   ├── cron.ts                     # Scheduled generation
│   ├── vite.ts                     # Vite dev server
│   └── static.ts                   # Static file serving
│
├── shared/
│   └── schema.ts                   # TypeScript types + Zod schemas
│
├── data/
│   ├── scripts.json                # Script storage
│   ├── settings.json               # App settings
│   └── scripts/                    # Organized by date
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── replit.md                       # Project documentation
```

---

## Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (React) | ✅ Complete | All 4 pages working |
| Backend (Express) | ✅ Complete | All endpoints functional |
| OpenAI GPT-4 | ✅ Complete | Script generation working |
| File Storage | ✅ Complete | JSON-based persistence |
| Cron Scheduler | ✅ Complete | Every 3 hours |
| Resend Email | ✅ Complete | Replit managed |
| Arcads.ai | ⚠️ Needs API Key | Requires `ARCADS_API_KEY` secret |
| Wav2Lip | ⚠️ Pending Setup | Needs local server running |

---

## What's Needed for End-to-End

### 1. Arcads.ai Setup
```
Required: ARCADS_API_KEY environment secret
Contact: r@arcads.ai for API access
Settings: Configure avatarId in Settings page
```

### 2. Wav2Lip Local Setup
```
1. Clone github.com/Alex-Alaniz/Wav2LipBearo
2. Apply compatibility patch (see instructions above)
3. Download model checkpoints:
   - wav2lip.pth → checkpoints/
   - s3fd.pth → face_detection/detection/sfd/
4. Install FFmpeg on Windows
5. Run: python app.py --port 5001
6. Configure in Settings:
   - API URL: http://YOUR_IP:5001/api
   - Avatar Image URL: your avatar face image
   - Enable Wav2Lip: ON
```

### 3. Resend Email
```
Status: Auto-configured via Replit integration
Test: Settings → Send Test Email
```

---

## Network Requirements

```
                    INTERNET
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   Replit      │ │   OpenAI      │ │   Resend      │
│   (Ad Factory)│ │   API         │ │   (Email)     │
│   Port 5000   │ │               │ │               │
└───────┬───────┘ └───────────────┘ └───────────────┘
        │
        │ HTTP Requests
        │ (Wav2Lip only)
        │
        ▼
┌───────────────────────────────────┐
│     YOUR LOCAL NETWORK            │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  Windows PC (RTX 3090)      │  │
│  │  192.168.x.x:5001           │  │
│  │                             │  │
│  │  Wav2Lip Flask API          │  │
│  └─────────────────────────────┘  │
│                                   │
│  Firewall: Allow port 5001 in    │
│                                   │
└───────────────────────────────────┘

Note: For Replit → Local connection:
- Option A: Use ngrok tunnel
- Option B: Port forward on router
- Option C: Deploy Wav2Lip to cloud (Railway/Render with GPU)
```

---

## Quick Commands

```bash
# Start Ad Factory (Replit)
npm run dev

# Start Wav2Lip (Windows)
cd Wav2LipBearo
python app.py --port 5001

# Test Wav2Lip health
curl http://localhost:5001/api/health

# Generate scripts manually
curl -X POST http://localhost:5000/api/trigger-daily-generation
```
