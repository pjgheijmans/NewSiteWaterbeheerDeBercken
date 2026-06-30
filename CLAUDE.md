# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack pool management web app ("Digitale Dagstaat Zwembad") — **PHP 8.0 backend (Slim 4 + PHP-DI)** in `backend/`, vanilla JS (ES6 classes) frontend, MySQL 8 database, all containerised with Docker. Code and comments are in Dutch.

> The backend was ported from TypeScript/Express to PHP so the app can run on shared Apache + MySQL hosting (PHP 8.0, `pdo_mysql`). The HTTP API and JSON shapes are unchanged, so `frontend/js/*.js` works against it as-is. The pre-port TypeScript backend is tagged `pre-php-migration` if you ever need it.

## Reference docs (`docs/`)

Living specification + architecture notes, kept in sync with the PHP backend:

- **`docs/EPS.md`** — Element Performance Specification (the requirements: functional + non-functional, grouped per role; Appendix A is the per-field input-value catalogue).
- **`docs/EDS.md`** — Element Design Specification (how the design meets the EPS: design decisions `DD-…`, interfaces, data model, deployment, test strategy, traceability).
- **`docs/TPS.md`** — Test Plan & Specification (test cases `TC-…` per requirement, referencing the automated suites, plus the manual/Demonstration procedures `MP-…`). Doesn't duplicate the test code — CI is the live evidence.
- **`docs/TAR.md`** — Test Analysis Report **template**: copy + fill per milestone (release/hand-over) to record a dated snapshot of TPS execution (suite counts + CI run, `MP-…` outcomes, anomalies, sign-off). Not a living doc — CI is the ongoing record.
- **`docs/architecture.md`** + **`docs/architecture/{backend,frontend,flows,database,testing}.md`** — architecture overview with Mermaid diagrams (request lifecycle, layering, ER diagram, sequence flows).

Update these when you change behaviour, the HTTP API, the schema or the stack (bump the version + revision-history row in EPS/EDS). The Mermaid blocks render on GitHub — keep them valid; in prose, avoid a mid-sentence `+`/`-` that can wrap to a line start (Prettier turns it into a list bullet).

## Dev commands

**Docker (preferred)** — the `web` service runs Apache + mod_php (built from `backend/`); the `db` service runs MySQL 8:

```
docker compose up -d              # start full stack (app on :8080, DB on :3306)
docker compose restart web        # apply config/Dockerfile changes (code is mounted, so most edits are live)
docker compose down               # stop
docker compose down -v && docker compose up -d   # full reset — wipes DB
docker logs -f zwembad_web        # stream app logs
docker exec -it zwembad_db mysql -u root -pgeheim_wachtwoord zwembad_status  # DB shell
```

On first start the `web` container runs `composer install` (if `vendor/` is missing) and `php bin/init-db.php` to provision the schema. On the slow OneDrive bind-mount that first `composer install` can exceed Composer's 300 s process-timeout while extracting; if it half-installs, finish it with `docker compose exec -e COMPOSER_PROCESS_TIMEOUT=0 web composer install`.

**Local (no Docker; requires a reachable MySQL with `init.sql` loaded):**

```
cd backend
composer install
DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD=geheim_wachtwoord DB_NAME=zwembad_status \
  php -S localhost:8080 -t public
```

Note: the PHP built-in server short-circuits requests for known extensions (`.js`/`.css`/…) and never hits Slim, so `/js/*.js` 404s there. That's a built-in-server limitation, not an app bug — on Apache `.htaccess` routes those to `FrontendController::serveAsset`. See `backend/README.md` for the workaround.

## Architecture

### Backend (PHP 8.0, `backend/`)

- **OO with DI**: every domain has a repository interface (`src/Repositories/I*.php`), a PDO implementation (`src/Repositories/*Repository.php`), a service interface + implementation (`src/Services/I*Service.php` + `*Service.php`), and a controller (`src/Controllers/*Controller.php`). Add new domains by following this pattern.
- **DI container**: PHP-DI bindings live in `config/dependencies.php`; routes are registered in `config/routes.php`; runtime settings (incl. DB env-vars) in `config/settings.php`. The app is bootstrapped from `public/index.php`.
- **PDO per request**: there is no connection pool — each request opens its own PDO connection (shared-hosting reality).
- **DB init**: `init.sql` is applied via `runInitSql()` (per-statement, with try/catch) — idempotent. Provision it with `php bin/init-db.php`, **not** `mysql < init.sql` (see gotcha). Schema changes go in `init.sql` only; there is no migrations tool.
- **Frontend delivery**: `FrontendController` assembles HTML partials from `frontend/partials/` into a single page at runtime and serves `/js`, `/css`, `/images` from the frontend folder — no build step. It is public (no auth).
- **Errors**: throw `new AppError($message, $httpStatus)` for known HTTP errors; `src/Errors/JsonErrorHandler.php` turns them into JSON responses with the right status.
- **Validation**: `src/Validation/Validator.php` (the equivalent of the old Zod schemas).
- **Support helpers** (`src/Support/`): `Optimistisch` (version-checked upsert → 409 conflict), `Historie` (history-edit permission check), `Wachtwoord` (bcrypt), `Frontend` (partial assembly/asset paths), `Auteur`, `Json`.
- **RBAC**: `src/Middleware/AuthMiddleware.php` (401 when not logged in) + `RechtenMiddleware($domein, 'lezen'|'schrijven')` (403 without the right) sit on the routes.

### Frontend (vanilla JS ES6 classes, `frontend/js/`)

- **Application container**: `app.js` creates one `Application` instance that holds all module singletons (`app.state`, `app.api`, `app.ui`, `app.metingen`, …).
- **Dependency injection**: each module class receives `app` as its constructor argument and calls other modules via `this.app.moduleName.methode()`.
- **Global functions**: only the ~25 functions needed by HTML `onclick` handlers are exposed on `window.*` (defined at the bottom of `app.js`). All other cross-module calls go through `this.app`.
- **No bundler**: scripts are loaded sequentially via `<script>` tags; no build step.
- **Autosave**: 1.2 s debounce in `OpslaanModule`. Do not add direct `change` listeners that bypass it.

## Code style

- Class, method, and variable names are in Dutch (e.g. `laadMetingen()`, `opslaan()`).
- **PHP 8.0 only**: the code avoids 8.1-only syntax (no `readonly` promoted properties, no string-keyed array unpacking) so it runs on the PHP 8.0 host. Do not introduce 8.1+ features.
- Backend: PSR-4 under `Zwembad\` (see `composer.json` autoload), constructor injection, typed properties/params.
- Frontend: private helpers use the `_` prefix; static lookup tables use `static get`; JSDoc on public methods; decimal input normalises `,` → `.` (keep this in any new input handling).
- Frontend has Prettier + ESLint configured (`npm run format`, `npm run lint`); the backend has no formatter — keep style consistent manually.

## Non-obvious gotchas

- **CSV export**: semicolon-delimited (`;`) for EU Excel compatibility.
- **Sessions**: native `$_SESSION` via `src/Middleware/SessionMiddleware.php`, started **only on `/api` paths** — the public page and assets open no DB connection. It enforces a sliding idle timeout (`sessie_timeout_minuten` from config); on expiry the session is cleared (next `AuthMiddleware` → 401 → frontend shows "sessie verlopen"). The middleware gets the **container** injected (not the service) so the config/PDO chain is built lazily, per `/api` request only. There is no `SESSION_SECRET` (that was a Node concern).
- **Passwords**: bcrypt (`PASSWORD_DEFAULT`) via `src/Support/Wachtwoord.php` — Argon2 isn't guaranteed on shared hosting. `Wachtwoord::verifieer()` upgrades legacy plaintext on login; the seed accounts in `init.sql` are plaintext until first login. That plaintext branch may be removed once all accounts are hashed.
- **Action generation**: fire-and-forget after a measurement save (`ActiesRepository`) — no transactional guarantee between the save and the generated action.
- **Coordinator visitor count**: cumulative since the last resolved `filter_spoelen_spoelbeurt` action.
- **Logboek length cap**: free-text logboek entries are hard-capped at **500 characters** on both layers — the textarea `maxlength` (`frontend/js/logboek.js`) and the server-side `Validator::LOGBOEK_MAX_TEKEN` (`src/Validation/Validator.php`, shared by the Waterbeheer and Coördinator logs; over-length input → 400). Keep the two in sync if you change the limit; the column itself stays `TEXT`.
- **init.sql + `bin/init-db.php`**: the per-column migrations use a plain `ALTER TABLE … ADD COLUMN`/`DROP COLUMN` (no `IF [NOT] EXISTS` — that's MariaDB syntax and a hard error on MySQL 8). The mysql client aborts on the resulting `Duplicate column`/`Can't DROP` errors, so **`mysql < init.sql` does not work** — always provision via `php bin/init-db.php`, whose `runInitSql()` wraps each statement in try/catch (warnings are non-fatal by design). Do **not** re-add `IF NOT EXISTS`.

## Git workflow

Feature branches → PR → merge to `master`. Branch names should describe the feature or fix.

## Testing

Two independent suites:

### Backend — PHPUnit 9.6 (`backend/`)

PHPUnit 9.6 is the last series supporting PHP 8.0. The unit suite needs no database; the integration suite needs MySQL.

```
docker compose exec web composer test              # unit (no DB) — 87 tests
docker compose exec web composer test:integration  # integration (real DB) — 18 tests
# or locally: cd backend && composer test   (set DB_* env-vars for the integration suite)
```

Structure (`backend/test/`):

```
test/
  Support/AppTestCase.php          # full-stack harness (boots the Slim app + container)
  Integration/IntegrationTestCase.php   # real-DB base; cleans up via future-date(2099)/itest_/ITest prefixes (repos open their own transactions — no outer wrapping)
  Unit/{Controllers,Services,Validation,Support}/   # 22 files
  Integration/*RepositoryTest.php, OptimistischTest.php   # 6 files
```

**Pattern for new controller tests**: mock the repository/service interface, inject it into the controller, dispatch a request through the Slim app (via `AppTestCase`), and assert on status + JSON body. No database needed.

### Frontend — Jest + jsdom (repo root, Node)

The frontend tests live at the repo root and run under Node (the only remaining use of the Node tooling). They exercise `frontend/js/*.js` via jsdom.

```
npm test               # frontend jsdom tests — 102 tests
npm run test:coverage  # with coverage (frontend/js only)
```

### CI

Two GitHub Actions workflows run on every push/PR (paths-filtered):

- **`.github/workflows/php-tests.yml`** — both PHP suites on PHP 8.0 (unit job: no DB; integration job: MySQL 8 service). The badge is in `backend/README.md`.
- **`.github/workflows/frontend-tests.yml`** — frontend under Node: `npm test` (Jest + jsdom) + `npm run lint` (ESLint).
