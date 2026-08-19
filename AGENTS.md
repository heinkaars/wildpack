# WildPack Development Guide

## Expo Setup
- **Version:** 54.0.37 — read docs at https://docs.expo.dev/versions/v54.0.0/
- **Dev server:** `npm start --port 8090` (port is required; passed in `.claude/launch.json`)
- **Full restart needed:** when adding new `+api.ts` files — hot reload doesn't pick them up

## Web SSR Traps
`app.json` has `"web": {"output": "server"}` for API routes. This pre-renders in Node and crashes the dev server if module-level code touches browser/native globals:

1. **AsyncStorage + window:** Use `typeof window === 'undefined'` to guard, not `Platform.OS`. AsyncStorage's web build reads `window.localStorage` and ReferenceError crashes the entire server.
2. **expo-sqlite in Node:** Lazy-import (`await import('expo-sqlite')` inside `connect()`) with type-only static import; it can't load at module parse time.

## Data Layer: Supabase + SQLite Sync
- **Single source of truth:** `sightings` table; `lifelist` is a Postgres view
- **Snappy pattern:** screens read local SQLite only (`lib/db.ts`); writes go local-first → `outbox` table → `lib/sync.ts` drains with retry
- **Never block the UI on network**
- Schema: `supabase/schema.sql` (idempotent, re-run to reapply)

## AI Backend: OpenAI → iNaturalist
Temporary: using `gpt-4o-mini` for wildlife ID and AMA, running server-side via Expo Router API routes:
- [`app/api/identify+api.ts`](app/api/identify+api.ts) — vision identification
- [`app/api/ama+api.ts`](app/api/ama+api.ts) — chat responses
- Swap point when iNaturalist API lands: server routes only. Clients (`lib/identify-service.ts`, `lib/ama-service.ts`) see no change if response shapes stay the same.
- Photo capture: request `base64: true` directly from camera/picker (not via file path afterward — `expo-file-system` File class unreliable on real devices)
- `OPENAI_API_KEY` in `.env` (gitignored); never ships in bundle
