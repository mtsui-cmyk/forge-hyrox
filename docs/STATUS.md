# FORGE Development Status

Last updated: 2026-05-19

## Current Goal

Make FORGE a Web MVP+ AI HYROX coach: long-term periodized training, weekly planning, equipment-aware workouts, race prep, metrics, and production deployment on Vercel + Neon PostgreSQL.

For a full handoff archive, see `docs/ARCHIVE_2026-05-19.md`.

## Completed

- Added project domain language in `CONTEXT.md`.
- Recorded ADRs for:
  - LLM as coach advisor, not sole source of truth.
  - Equipment substitutions preserving training stimulus.
  - Database-first training state.
- Added `trainingPlan` normalization and seven-day plan validation.
- Made `/api/sync` normalize microcycles and persist RPE.
- Made generated microcycles, edited WODs, AI substitutions, daily logs, PRs, profile, and equipment settings sync through the database.
- Migrated Next 16 `middleware.ts` to `proxy.ts`.
- Added deterministic equipment requirement detection and local substitution suggestions.
- Added "Today's Gym" availability toggles to the workout page.
- Added DB restoration for direct `/workout/[date]` access.
- Added Coach Core guardrails for seven-day microcycle shape, rest day count, minimum running exposure, empty sessions, and unavailable equipment.
- Applied guardrails to `/api/generate-wod`; invalid LLM output now falls back to a validated local plan.
- Verified local substitution persistence through the database on the demo microcycle.
- Added a first-class run prescription module.
- Updated the pacing engine to load PRs and derive easy, race, threshold, and interval paces from target time plus 1km PR.
- Removed build-time Google Fonts dependency so production builds do not fail when font CDNs are unreachable.
- Dashboard now sends PR-aware run prescriptions into `/api/generate-wod`.
- `/api/generate-wod` now instructs the LLM to use exact easy/race/threshold/interval run prescription labels and paces.
- The fallback microcycle now writes run prescription labels and paces into running blocks.
- Added explicit authentication checks to `/api/generate-wod` and `/api/generate-swap`.
- Updated `proxy.ts` so API routes return their own JSON auth errors instead of login HTML redirects.
- Removed raw request-body logging from `/api/generate-wod`; logs now keep only safe request metadata.
- Added `npm run test:core` for Coach Core behavior tests covering run prescriptions, equipment substitutions, and microcycle guardrails.
- Added readiness summarization from recent workout logs, RPE, and pain/injury notes.
- Dashboard now shows a 14-day readiness card with volume guidance.
- `/api/generate-wod` now injects readiness state into the coach prompt and fallback plan logic.
- Tightened language consistency for English/Chinese modes across dashboard readiness, equipment settings, workout logging, local substitutions, and fallback generated plans.
- Updated i18n initialization so saved language is applied before the app renders, avoiding page-to-page language flicker.
- Added `coachNotes` to training days so the dashboard can explain why a session, pace, recovery day, or volume reduction was programmed.
- Added red-flag readiness detection for symptoms like chest tightness, dizziness, numbness, sharp pain, and swelling.
- Added persisted `planAdjustments` so the dashboard can explain when readiness, taper timing, missing equipment, or fallback planning changed the generated week.
- Added `/demo` mode with a local sample athlete, microcycle, PRs, logs, readiness state, and equipment limitations so GitHub visitors can evaluate the product without registration.
- Added initial Prisma migration and database scripts for generate, local migrate, deploy, and studio.
- Added API smoke tests that boot the production server, verify unauthenticated API JSON 401 responses, and verify demo-cookie access to protected pages.
- Added GitHub Actions CI for `npm run test:core`, `npm run test:api`, `npm run lint`, and `npm run build`.
- Upgraded the v1.1 planning surface with Train Hub, Coach, Race Prep, and Metrics pages.
- Added PostgreSQL Prisma models for long-term plans, training weeks, scheduled workouts, workout templates, race plans, readiness snapshots, and coach generation records.
- Added deterministic domain modules for workout library filtering, 4-8 week planning, race split planning, and metrics summaries.
- Added `/train` for current block planning, HYROX workout library filters, scheduling, and manual workout building.
- Added `/coach` for long-term plan, current-week plan, and single-workout generation.
- Added `/race` for editable race split planning and saved race plans.
- Added `/metrics` for weekly load, readiness trend, completion rate, streak, pain notes, and station weakness.
- Seeded demo mode with long-term plan, workout templates, race plan, and metrics data.
- Added `/api/coach` and expanded `/api/sync` to include long-term plans, templates, race plans, readiness snapshots, and coach generation records.
- Hardened `/api/generate-wod` with per-user cooldown, request timeout, one transient retry, safe metadata logging, and fallback generation records.

## Verification

- `npm run lint` passes.
- `npm run build` passes.
- Browser smoke checked:
  - `/`
  - `/pacing`
  - `/equipment`
  - `/dashboard`
- Deterministic substitution smoke checked with a sled-missing block.
- Browser QA checked `/workout/2026-05-01`:
  - Today's gym toggles show missing Sled and Wall Ball.
  - The unavailable block displays a warning.
  - Local substitution replaces the block.
  - Reload preserves the substituted block.
  - Database contains the substituted block.
- Browser QA checked `/pacing`:
  - Loads PR-aware run prescriptions.
  - Shows easy/race/threshold/interval paces.
  - No console errors.
- Browser smoke checked `/dashboard` after run prescription wiring.
- Unauthenticated API POST smoke checked:
  - `/api/generate-wod` returns `401 application/json`.
  - `/api/generate-swap` returns `401 application/json`.
  - `/api/sync` returns `401 application/json`.
- Browser smoke checked `/dashboard`, `/pacing`, `/equipment`, `/profile`, and `/workout/2026-05-01` after API auth hardening.
- `npm run test:core` passes with coverage for readiness red-flag detection.
- Browser smoke checked `/dashboard` readiness card rendering after the readiness loop was added.
- Browser smoke checked English mode on `/dashboard`, `/equipment`, and `/workout/2026-05-01`; interactive UI controls no longer leak Chinese copy in English mode.
- Browser smoke checked `/dashboard` coach notes rendering.
- Browser smoke checked `/dashboard` after plan-adjustment UI wiring; existing saved plans without adjustment metadata correctly hide the card.
- Browser smoke checked `/demo` redirects into `/dashboard` and renders demo Plan Adjustments, Coach Notes, and Readiness.
- `npm run test:api` passes after production build.
- `npm run db:generate` passes after PostgreSQL schema generation.
- `npm run test:core` passes with coverage for long-term plan validation, race split totals/manual edits, and library filtering.
- `npm run lint` passes after the v1.1-v1.4 expansion.
- `npm run build` passes with `/train`, `/coach`, `/race`, `/metrics`, and `/api/coach`.
- `npm run test:api` passes with unauthenticated JSON 401 coverage for `/api/coach`.

## Next Vertical Slices

1. **Deployment**
   - Create Neon PostgreSQL database.
   - Set Vercel env vars.
   - Run `npm run db:deploy` against production.
   - Smoke `/`, `/demo`, `/dashboard`, `/train`, `/race`, and `/api/sync`.

2. **Authenticated API integration**
   - Register/login/profile sync.
   - Create long-term plan.
   - Generate current week from long-term plan.
   - Save scheduled workout.
   - Complete workout log.
   - Save PR and RacePlan.

3. **Deeper persistence**
   - Move UI scheduling from local microcycle state into `ScheduledWorkout`.
   - Store readiness snapshots automatically whenever a plan is generated.
   - Connect `/coach` UI directly to `/api/coach` for authenticated production use.

4. **Visual QA**
   - Re-run browser smoke in an environment where localhost is not blocked by the browser extension.
   - Refresh README screenshots for `/train`, `/coach`, `/race`, and `/metrics`.
