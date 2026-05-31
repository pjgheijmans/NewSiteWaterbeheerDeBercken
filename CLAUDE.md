# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack pool management web app ("Digitale Dagstaat Zwembad") — Express.js backend, vanilla JS frontend, MySQL 8 database, all containerised with Docker. Code and comments are in Dutch.

## Dev commands

**Docker (preferred):**
```
docker compose up -d              # start full stack (app on :3000, debugger on :9229)
docker compose restart web        # apply backend changes without losing DB state
docker compose down               # stop
docker compose down -v && docker compose up -d   # full reset — wipes DB
docker logs -f zwembad_web        # stream logs
docker exec -it zwembad_db mysql -u root -pgeheim_wachtwoord zwembad_status  # DB shell
```

**Local (requires a running MySQL instance):**
```
npm install
node backend/server.js
```

No `npm` scripts are defined in `package.json`; invoke Node directly.

## Architecture

- **Repository pattern**: every domain (metingen, verbruik, acties, …) has a paired `repositories/<domain>.js` + `routes/<domain>.js`. Add new features by following this pairing.
- **DB init**: `init.sql` runs on every server start using `CREATE TABLE IF NOT EXISTS` + `INSERT IGNORE` — idempotent. Schema changes go in `init.sql` only; there is no migrations tool.
- **Frontend delivery**: `frontend.js` assembles HTML partials from `frontend/partials/` into a single page at runtime — no build step.
- **Shared pool**: all repositories share the single connection pool in `backend/db.js`.

## Code style

- Function and variable names are in Dutch (e.g. `laadMetingen()`, `opslaan()`).
- Use JSDoc comments on functions (`/** … */`).
- Async/await throughout; use try-catch with JSON error responses (`res.status(500).json({error: …})`).
- No formatter or linter is configured — maintain consistent style manually.
- Decimal input: the frontend normalises `,` → `.`; keep this normalisation in any new input handling.

## Non-obvious gotchas

- **Autosave**: a 1.2 s debounce fires after every keystroke across the whole page — don't add direct `change` listeners that bypass it.
- **CSV export**: semicolon-delimited (`;`) for EU Excel compatibility.
- **Session secret**: hardcoded default `zwembad_geheim_98765`; override with `SESSION_SECRET` env var in production.
- **Action generation**: fire-and-forget after a measurement save — no transactional guarantee between the save and the generated action.
- **Coordinator visitor count**: cumulative since the last resolved `filter_spoelen_spoelbeurt` action.

## Git workflow

Feature branches → PR → merge to `master`. Branch names should describe the feature or fix.

## Testing

No test suite exists yet. The goal is to add one. When writing new features, leave logic in testable functions and avoid tightly coupling business logic to Express handlers.
