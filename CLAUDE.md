# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack pool management web app ("Digitale Dagstaat Zwembad") — TypeScript/Express.js backend, vanilla JS (ES6 classes) frontend, MySQL 8 database, all containerised with Docker. Code and comments are in Dutch.

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
npm run dev      # nodemon + ts-node (hot reload)
npm run build    # tsc → dist/
npm start        # node dist/backend/server.js
```

## Architecture

### Backend (TypeScript, `backend/`)

- **OO with DI**: every domain has an interface (`repositories/I*.ts`), a class implementation (`repositories/*Repository.ts`), a controller (`controllers/*Controller.ts`), and a factory function (`routes/*.ts`) that wires them together.
- **Dependency injection**: repositories receive the shared `Pool` via constructor; controllers receive repository interfaces. Add new domains by following this pattern.
- **DB init**: `init.sql` runs on every server start via `DatabaseRepository.runInitSql()` using `CREATE TABLE IF NOT EXISTS` + `INSERT IGNORE` — idempotent. Schema changes go in `init.sql` only; there is no migrations tool.
- **Frontend delivery**: `FrontendController` assembles HTML partials from `frontend/partials/` into a single page at runtime — no build step.
- **Shared pool**: all repositories share the single connection pool in `backend/repositories/db.ts`.
- **Session type**: `req.session.gebruiker` is typed via a `declare module 'express-session'` block at the bottom of `backend/types/index.ts` (must stay in a module file so ts-node picks it up).
- **AppError**: throw `new AppError(message, httpStatus)` for known HTTP errors; controllers propagate the status automatically.

### Frontend (vanilla JS ES6 classes, `frontend/js/`)

- **Application container**: `app.js` creates one `Application` instance that holds all module singletons (`app.state`, `app.api`, `app.ui`, `app.metingen`, …).
- **Dependency injection**: each module class receives `app` as its constructor argument and calls other modules via `this.app.moduleName.methode()`.
- **Global functions**: only the ~25 functions needed by HTML `onclick` handlers are exposed on `window.*` (defined at the bottom of `app.js`). All other cross-module calls go through `this.app`.
- **No bundler**: scripts are loaded sequentially via `<script>` tags; no TypeScript, no build step for the frontend.
- **Autosave**: 1.2 s debounce in `OpslaanModule`. Do not add direct `change` listeners that bypass it.

## Code style

- Class, method, and variable names are in Dutch (e.g. `laadMetingen()`, `opslaan()`).
- Private helpers use the `_` prefix convention; static lookup tables use `static get`.
- Use JSDoc on public methods (`/** … */`).
- Async/await throughout; controllers use `try-catch` with `this.stuurFout(res, err)`.
- Decimal input: the frontend normalises `,` → `.`; keep this in any new input handling.
- No formatter or linter is configured — maintain consistent style manually.

## Non-obvious gotchas

- **CSV export**: semicolon-delimited (`;`) for EU Excel compatibility.
- **Session secret**: hardcoded default `zwembad_geheim_98765`; override with `SESSION_SECRET` env var in production.
- **Action generation**: fire-and-forget after a measurement save — no transactional guarantee between the save and the generated action.
- **Coordinator visitor count**: cumulative since the last resolved `filter_spoelen_spoelbeurt` action.
- **init.sql warnings**: a few SQL statements in `init.sql` produce syntax warnings on startup — these are pre-existing and non-fatal.

## Git workflow

Feature branches → PR → merge to `master`. Branch names should describe the feature or fix.

## Testing

**Stack**: Jest + ts-jest + Supertest — `npm run test:unit` (no database required).

**Run:**
```
npm run test           # all tests
npm run test:unit      # unit tests only
npm run test:coverage  # with coverage report
```

**Structure:**
```
test/
  helpers/testApp.ts              # maakTestApp(), maakSessieMiddleware(), maakTestGebruiker()
  unit/
    errors.test.ts                # AppError
    middleware/auth.test.ts       # checkAuth + role helpers
    controllers/                  # one file per controller (114 tests total)
```

**Pattern for new controller tests**: create `jest.Mocked<IXxxRepository>` with `jest.fn()` for each method, pass it to the controller constructor, mount the router with `maakTestApp(controller.router, 'taak')`, then use Supertest to assert on status and body. No database needed — the interfaces are mocked.

**Config files**: `jest.config.js` (preset, roots, transform) + `tsconfig.test.json` (extends base tsconfig, adds `test/**/*` to include, sets `types: ["jest", "node"]`).
