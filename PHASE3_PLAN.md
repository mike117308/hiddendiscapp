# Phase 3 Implementation Plan: Collaborative Movie Ratings Tracker

This plan assumes your **UI scaffold** and **shared backend skeleton** are already in place.

## Goals for Phase 3

1. Make collaboration reliable for 3 friends.
2. Add production-safe validation and conflict handling.
3. Add tests so refactors are safe.
4. Prepare deployment and operations basics.

---

## 1) Backend hardening (Day 1)

### 1.1 Data model (SQLite)

Create/confirm a `movies` table with the following schema:

- `id` (text/uuid, primary key)
- `title` (text, required)
- `year` (integer, nullable)
- `notes` (text, default empty)
- `score_mike` (real, nullable)
- `score_eve` (real, nullable)
- `score_sky` (real, nullable)
- `created_at` (datetime)
- `updated_at` (datetime)
- `version` (integer, default `1`) for optimistic concurrency control

### 1.2 API contract

Implement/confirm these endpoints:

- `GET /movies`
  - Query params:
    - `q` (search title/notes)
    - `sort` (`newest|oldest|avg_desc|spread_desc`)
    - `tag` (`all|certified-banger|controversial|mid`)
- `POST /movies`
- `PUT /movies/:id`
- `DELETE /movies/:id`

For `PUT`, require client to send `version`. If DB version differs, return `409 Conflict` with latest record.

### 1.3 Validation rules

Validate server-side for all writes:

- `title`: 1–120 chars
- `year`: `1888..2100` when provided
- scores: `0..10` when provided
- `notes`: max 2000 chars

Return normalized error JSON:

```json
{
  "error": "VALIDATION_ERROR",
  "fields": {
    "title": "Title is required"
  }
}
```

### 1.4 Derived metrics utility

Add one shared utility module to compute:

- `average` score
- `spread` (max-min)
- `agreement` percentage (e.g., map spread to 0–100)
- `tag` bucket:
  - low spread + high avg => `certified-banger`
  - high spread => `controversial`
  - otherwise `mid`

Use this utility in both API response shaping and tests.

---

## 2) Frontend reliability pass (Day 2)

### 2.1 API abstraction

Add `src/api.js` (or equivalent) with typed helpers:

- `fetchMovies(filters)`
- `createMovie(payload)`
- `updateMovie(id, payload)`
- `deleteMovie(id)`

Centralize fetch error parsing in one place.

### 2.2 State + conflict UX

In list/edit flow:

- Keep `version` on each movie in state.
- On `409 Conflict`, show a banner:
  - “Someone updated this movie first. Review latest values and retry.”
- Provide one-click “Reload latest”.

### 2.3 Form validation UX

Mirror backend rules client-side for instant feedback:

- Disable submit while invalid.
- Show inline field errors.
- Keep backend errors visible near form actions.

### 2.4 Loading and empty states

Add clear states:

- global initial loading skeleton
- “No movies found” empty state for filter/search misses
- in-button spinners for save/delete actions

---

## 3) Testing plan (Day 3)

### 3.1 Backend tests

Create `server/tests/movies.test.*` with cases:

- create movie success
- validation errors (`title`, `year`, score bounds)
- update success increments `version`
- stale version update returns `409`
- delete success and 404 behavior

### 3.2 Frontend smoke tests

Create lightweight tests (Vitest/Jest + testing-library):

- renders movie list from API mock
- submit valid movie => calls `createMovie`
- invalid form blocks submit
- conflict response shows conflict banner

### 3.3 Manual acceptance checklist

Before deploy, verify:

- Friend A adds movie; Friend B sees it after refresh.
- Friend A and B edit same movie; one gets conflict warning.
- Search/sort/filter combinations behave as expected.
- Mobile layout is usable at ~390px width.

---

## 4) Deployment readiness (Day 4)

### 4.1 Environment config

Document `.env` variables:

- `PORT`
- `DATABASE_URL`
- `APP_SHARED_PASSCODE` (optional)
- `CORS_ORIGIN`

### 4.2 Runtime checks

Add health endpoint:

- `GET /health` => `{ "ok": true }`

Add startup logs:

- DB connection status
- active port
- environment name

### 4.3 Backup/export

Implement one export endpoint:

- `GET /movies/export.json`

(Optional) scheduled DB backup if host supports cron.

---

## 5) Suggested file-by-file task map

Use this map regardless of framework naming; adapt paths as needed.

### Backend

- `server/src/db/schema.*`
  - add `version` column and constraints
- `server/src/routes/movies.*`
  - enforce validation and conflict checks
- `server/src/services/movieMetrics.*`
  - average/spread/tag/agreement logic
- `server/src/routes/health.*`
  - health endpoint
- `server/tests/movies.test.*`
  - API behavior + conflict coverage

### Frontend

- `src/api.*`
  - API client helpers + error normalization
- `src/components/MovieForm.*`
  - client validation and backend error display
- `src/components/MovieCard.*`
  - version-aware edit flow + conflict warning
- `src/pages/Home.*` (or `src/App.*`)
  - loading/empty states, filter wiring
- `src/styles.*`
  - mobile and conflict-banner styling polish

### Docs

- `README.md`
  - local run, shared usage, deploy steps
- `.env.example`
  - documented required variables

---

## 6) Definition of Done

Phase 3 is complete when:

- All CRUD routes enforce validation and return consistent errors.
- Concurrent edit conflict is handled gracefully in UI.
- Backend tests pass in CI/local.
- Frontend smoke tests pass.
- App is deployable with documented env vars.
- Export endpoint works and backup strategy is documented.

---

## 7) Stretch goals (optional)

After Phase 3, consider:

- real-time sync via polling or WebSocket
- per-friend avatars/colors and profile lock-in
- watchlist status and “rewatch” flag
- movie poster integration via TMDB API (cached server-side)
