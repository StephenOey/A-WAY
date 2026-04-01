# A-WAY

A-WAY is a design proxy tool that helps designers communicate design decisions asynchronously across time zones. Designers annotate Figma frames via a plugin; teammates query those annotations through a Slack bot.

## Repository Structure

```
A-WAY/
├── shared/      TypeScript types shared across all packages
├── plugin/      Figma plugin (React + TypeScript, webpack)
├── api/         Backend API (Vercel edge functions, Supabase)
├── bot/         Slack bot (Slack Bolt)
└── supabase/    Database migrations
```

## Prerequisites

- Node.js 18+
- npm 8+ (workspaces support)
- A [Supabase](https://supabase.com) project
- A Slack app with a Bot Token and Signing Secret
- [Vercel CLI](https://vercel.com/docs/cli) — `npm i -g vercel`
- Figma Desktop (for loading the plugin in development)

## Setup

### 1. Clone and install

```bash
git clone <repo-url> a-way && cd a-way
cp .env.example .env   # fill in all values
npm install
```

### 2. Database

Apply the migration via the Supabase CLI or the SQL editor in the Supabase dashboard:

```bash
# Option A — Supabase CLI
supabase db push

# Option B — paste the file contents into the SQL editor
# supabase/migrations/001_annotations.sql
```

### 3. Build shared types (must run first)

```bash
npm run build:shared
```

### 4. Figma plugin

Set `NEXT_PUBLIC_API_URL` in your `.env`, then:

```bash
npm run build:plugin
```

In **Figma Desktop** → Plugins → Development → **Import plugin from manifest** → select `plugin/manifest.json`.

Replace the placeholder `id` in `plugin/manifest.json` with the numeric plugin ID from the Figma developer dashboard before publishing.

### 5. API

```bash
cd api
vercel dev
```

The API runs locally on `http://localhost:3000` by default. Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/annotations` | Save a new annotation |
| `GET` | `/annotations?query=` | Search annotations (stubbed) |
| `DELETE` | `/annotations/:id` | Remove an annotation |

### 6. Slack bot

```bash
npm run dev:bot
```

Expose the local port to the internet (e.g. with [ngrok](https://ngrok.com)) and configure the Request URL in your Slack app's Event Subscriptions to `https://<your-tunnel>/slack/events`.

Subscribe to the following bot events: `app_mention`, `message.im`.

## Environment Variables

See `.env.example` for all required keys:

| Variable | Used by | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | api | Supabase project URL |
| `SUPABASE_ANON_KEY` | api | Supabase anon/public key |
| `SLACK_BOT_TOKEN` | bot | Slack bot OAuth token (`xoxb-…`) |
| `SLACK_SIGNING_SECRET` | bot | Slack app signing secret |
| `OPENAI_API_KEY` | api (future) | Reserved for semantic search |
| `NEXT_PUBLIC_API_URL` | plugin, bot | Deployed API base URL |
| `PORT` | bot | Port for the Slack bot HTTP server |

## Notes

- `expires_at` on annotations is computed automatically by Postgres (30 days from `created_at`). Do not set it from application code.
- Row-level security is enabled on the `annotations` table. Requests using the anon key are scoped to the authenticated user.
- Semantic/vector search via OpenAI is stubbed — `GET /annotations?query=` currently performs a case-insensitive `LIKE` filter. Replace with embedding-based retrieval when ready.
