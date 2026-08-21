# WildPack Project Guide

**What:** Expo/React Native app for wildlife observation — capture, AI-identify, chat, build a lifelist.

**Tech Stack:** Expo 54, React Native 0.81, Supabase + SQLite, OpenAI API.

## Before Writing Code
- Read [`AGENTS.md`](AGENTS.md) for Expo version, dev server setup, and SSR/dev gotchas
- Port 8090 is required (checked in `.claude/launch.json`)
- Full dev server restart needed when adding new API routes (`+api.ts`)

## Key Patterns — Don't Break These

**Data Layer:** Supabase is source of truth; SQLite is local cache. Screens read SQLite only. Writes → local DB → outbox table → sync daemon. Never block UI on network.

**AI Backend:** OpenAI (`gpt-4o-mini`) temporarily stands in for iNaturalist. Swap point is server-side only (`app/api/identify+api.ts`, `app/api/ama+api.ts`). Client code sees no change if response shapes stay the same.

**Web SSR:** Project uses `"web": {"output": "server"}` for API routes. Module-level code touching `window` or browser globals crashes the dev server. Guard AsyncStorage with `typeof window === 'undefined'`. `expo-sqlite` is lazy-imported inside `connect()` using `require()` to avoid module-level loading errors in Node.

**Photo Capture:** Request `base64: true` directly from camera/picker, not file path afterward — `expo-file-system` File class is unreliable on real devices.

## Before Starting a Task

1. **Verify it works:** Always test in preview after changes (UI, API routes, data flow)
2. **Check the data layer:** If touching `sightings`, `profiles`, or sync — verify RLS and offline behavior
3. **Know which Expo version:** Reference v54 docs, not newer — APIs differ
4. **SSR in mind:** If adding network calls or module-level setup, guard browser globals

## When Something Breaks

- **Dev server won't start or crashes:** Probably a new `+api.ts` or module-level `window` access. Full restart, check `console for ReferenceError: window is not defined`.
- **Web preview is dead:** Check `.claude/launch.json` has `--port 8090` in `runtimeArgs`
- **Offline sync isn't working:** Verify `lib/sync.ts` can reach the outbox table and Supabase RLS allows the write

## Gotchas Specific to This Project

- **Species descriptions are immutable:** First description written sticks (no UPDATE policy). Bad AI data needs manual SQL.
- **Expo Go vs. native:** Expo Go's bundled modules lag `node_modules`. Newest-only JS APIs fail on the phone but work in web/native builds.
- **Profile names race condition:** `justCreated` flag prevents concurrent onboarding flows from colliding. Don't remove it.
