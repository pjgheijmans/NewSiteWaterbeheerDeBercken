# Test Plan & Specification (TPS)

**Document ID:** TPS-DDZ-0.1
**Element:** Digitale Dagstaat Zwembad — full web application
**Version:** 0.1
**Status:** DRAFT
**Date:** 2026-06-29
**Author:** P. Heijmans
**Parent EPS:** EPS-DDZ-0.6
**Parent EDS:** EDS-DDZ-0.5

> This TPS specifies _how_ the requirements in the EPS are verified. It does **not**
> duplicate the automated tests — those are the executable specification and the live
> evidence (run in CI on every push). Instead it maps each requirement to its
> verification (an automated suite or a manual procedure §4) and spells out the
> **manual / demonstration** procedures that are not automated. Results of a given run
> are recorded separately in a TAR (Test Analysis Report), with CI as the ongoing
> record. Requirement IDs (AUTH-, GEN-, WB-, CO-, ACT-, LIM-, ADM-, TRD-, CFG-, KPP-)
> are defined in the EPS.

---

## Revision History

| Version | Date       | Author      | Description                                                                                          |
| ------- | ---------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| 0.1     | 2026-06-29 | P. Heijmans | Initial test specification (PHP backend); references PHPUnit + Jest suites and the manual procedures |

---

## 1. Introduction

### 1.1 Purpose

Define the test approach, the test cases per requirement and the manual procedures,
so that verification is repeatable and traceable to the EPS.

### 1.2 Scope

Covers functional verification of the API and UI behaviour, the data model, the
cross-cutting concerns (auth/RBAC, validation, optimistic concurrency, action
generation) and the key performance points (KPP). Out of scope: load/performance
testing beyond the KPP targets, security penetration testing, and accessibility
auditing (tracked as EPS risks).

### 1.3 Reference documents

| ID      | Title                                 | Version |
| ------- | ------------------------------------- | ------- |
| EPS-DDZ | Element Performance Specification     | 0.6     |
| EDS-DDZ | Element Design Specification          | 0.5     |
| —       | `backend/test/` — PHPUnit suites      | current |
| —       | `test/unit/frontend/` — Jest/jsdom    | current |
| —       | `.github/workflows/` — CI definitions | current |

### 1.4 Conventions

- **Verification methods** (per EPS §8): **T** Test (automated), **D** Demonstration,
  **I** Inspection, **A** Analysis.
- **Test-case IDs:** `TC-<area>-<n>`. A TC is either **automated** (cites the test
  file that realises it) or **manual** (cites a procedure `MP-n` in §4).
- A requirement is **verified** when its automated TCs pass in CI and any manual TCs
  are executed and recorded (in the TAR).

---

## 2. Test approach & environment

### 2.1 Test levels

| Level                  | Tool                | Where                       | DB            |
| ---------------------- | ------------------- | --------------------------- | ------------- |
| Backend unit           | PHPUnit 9.6         | `backend/test/Unit/`        | none (mocked) |
| Backend integration    | PHPUnit 9.6 + MySQL | `backend/test/Integration/` | real MySQL 8  |
| Frontend unit/DOM      | Jest + jsdom (Node) | `test/unit/frontend/`       | none          |
| Manual / demonstration | Browser + host      | §4 procedures               | dev/staging   |

Each automated layer mocks the layer below (controller↔IService, service↔IRepository);
repositories are exercised against a real MySQL in the integration suite. Frontend DOM
flows run under jsdom via a browser-ignored `module.exports` guard.

### 2.2 How to run

```
# Backend (in the running container, or locally from backend/)
docker compose exec web composer test              # unit
docker compose exec web composer test:integration  # integration (needs MySQL)

# Frontend (repo root, Node)
npm test
```

CI runs all of the above on every push/PR (`php-tests.yml`, `frontend-tests.yml`).

### 2.3 Test data & isolation

- Unit tests use in-memory mocks; no fixtures.
- Integration tests open their own transactions (no outer rollback) and clean up via
  the agreed markers: a far-future date (2099) and `itest_` / `ITest` prefixes
  (`IntegrationTestCase`).
- Manual procedures run on a disposable dev/staging DB (or `docker compose down -v`
  to reset).

---

## 3. Test cases (per requirement)

> **T** = automated test (file cited); **D/I** = manual procedure (`MP-n`, §4).
> Pass criterion for automated TCs: green in CI.

| TC-ID      | Req(s)                | Method | Verification                                                                                                                                    |
| ---------- | --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-AUTH-01 | AUTH-001/002/004      | T      | `Unit/Controllers/AuthControllerTest`, `Unit/Services/AuthServiceTest`; login/logout/ingelogd + session                                         |
| TC-AUTH-02 | AUTH-003 (RBAC)       | T + D  | `RechtenMiddleware` via the controller tests (401/403); access matrix demo `MP-7`                                                               |
| TC-AUTH-03 | AUTH-005              | T      | `Unit/Support/WachtwoordTest` (bcrypt, verify, legacy upgrade); `Integration/GebruikersRepositoryTest` (hash on write)                          |
| TC-AUTH-04 | AUTH-006/007, CFG-001 | T + D  | `Unit/Controllers/ConfiguratieControllerTest` (validate 1–1440); `auth-sessie.dom.test`, `configuratie.dom.test`; idle demo `MP-9`              |
| TC-RBAC-05 | AUTH-003 (read-only)  | T      | `test/unit/frontend/leesmodus-knoppen.dom.test` — write-action buttons disabled without `schrijven`                                             |
| TC-GEN-01  | GEN-001/002/005       | T + D  | `Integration/MetingenRepositoryTest` (date-keyed upserts); season/date scoping demo in `MP-1`                                                   |
| TC-GEN-02  | GEN-003/004           | T      | frontend save-flow + validation: `grotebaden.dom.test`, `peuterbad.dom.test`, `verbruik.dom.test`, `Unit/Validation/ValidatorTest`              |
| TC-GEN-03  | GEN-006 (author)      | T      | `Unit/Support/AuteurTest`; attribution asserted in repo/integration tests                                                                       |
| TC-GEN-04  | GEN-007 (concurrency) | T + D  | `Integration/OptimistischTest` (all conflict branches); frontend 409 round-trip; load→save→stale-save demo `MP-1`                               |
| TC-GEN-05  | GEN-008/009           | T      | completeness dots + version label: `volledigheid.dom.test`, `badge-volledigheid-coexistentie.dom.test`, `Unit/Controllers/VersieControllerTest` |
| TC-HIST-06 | GEN-006 (historie)    | T      | `Unit/Support/HistorieTest` — past-date edit right                                                                                              |
| TC-WB-01   | WB-001..004, WB-006   | T + D  | `Unit/Controllers/{Metingen,Verbruik}ControllerTest`, `Integration/MetingenRepositoryTest`; save & reload demo `MP-1`                           |
| TC-WB-02   | WB-005 (deltas)       | T      | `test/unit/frontend/verbruik.dom.test` (today − previous)                                                                                       |
| TC-WB-03   | WB-007 (visitors)     | T + D  | `Unit/Controllers/MetingenControllerTest` (bezoekers); cumulative-since-backwash demo `MP-2`                                                    |
| TC-WB-04   | WB-008 (logboek)      | T      | `Unit/Controllers/LogboekControllerTest`; add/cap/delete (`leesmodus-knoppen.dom.test` for the add button)                                      |
| TC-WB-05   | WB-009 (duty)         | T + D  | `Unit/Controllers/DienstControllerTest`; chip pre-fill demo `MP-1`                                                                              |
| TC-CO-01   | CO-001..004           | T + D  | `Unit/Controllers/CoordinatorenControllerTest`, `coordinatorBlok.dom.test`; rounds/checklist/daggegevens demo `MP-2`                            |
| TC-ACT-01  | ACT-001/005           | T      | `Unit/Services/TakenServiceTest`, `Integration/ActiesRepositoryTest` — every action type, per-bath thresholds, regeneration                     |
| TC-ACT-02  | ACT-002 (grouping)    | T      | `test/unit/frontend/taken.test` — backwash reasons folded per bath                                                                              |
| TC-ACT-03  | ACT-003/004           | T + D  | `Unit/Controllers/{Taken,Rondetaken}ControllerTest`; resolve/reopen + field/badge markers demo `MP-3`                                           |
| TC-ACT-04  | ACT-006 (texts)       | T + D  | `Unit/Controllers/ActieTekstenControllerTest`, `actieteksten.test`; placeholder preview demo                                                    |
| TC-LIM-01  | LIM-001/002/003       | T + D  | `Unit/Controllers/LimietenControllerTest`, `Integration/LimietenRepositoryTest`, `limieten.test`; edit/restore demo `MP-4`                      |
| TC-ADM-01  | ADM-001               | T + D  | `Unit/Controllers/GebruikersControllerTest`, `Integration/GebruikersRepositoryTest`; CRUD demo                                                  |
| TC-ADM-02  | ADM-002/003 (CSV)     | D      | semicolon CSV export/import — `MP-6`                                                                                                            |
| TC-ADM-03  | ADM-004 (reset)       | D + I  | double-confirm + forced logout — `MP-8`; `Unit/Controllers/DatabaseControllerTest` for the guards                                               |
| TC-ROL-01  | AUTH-003 (rollen)     | T      | `Unit/Controllers/RollenControllerTest`, `Integration/RollenRepositoryTest` — role/rights management                                            |
| TC-TRD-01  | TRD-001               | T + D  | `Unit/Controllers/TrendControllerTest` (waterbeheerder-only 403s); chart demo over a range                                                      |
| TC-KPP-01  | KPP-001               | D / A  | autosave round-trip < 1.5 s — `MP-1` (observe status)                                                                                           |
| TC-KPP-02  | KPP-002               | T      | covered by TC-ACT-01 (action raised/cleared on threshold save)                                                                                  |
| TC-KPP-03  | KPP-003               | T      | covered by TC-WB-02 (delta correctness)                                                                                                         |
| TC-KPP-04  | KPP-004 (durability)  | T + D  | integration save+reload; `MP-1`/`MP-2` reload-after-relogin                                                                                     |

---

## 4. Manual / demonstration procedures

Each procedure lists **preconditions → steps → expected result**. Record the outcome
(pass/fail + notes) in the TAR.

### MP-1 — Daily water log happy path (EPS W1)

- **Pre:** logged in as Waterbeheerder; today's date selected.
- **Steps:** Waterbeheer → Diep/Ondiep → enter pH/chloor/temp/flow/filterdruk →
  observe inline validation and the autosave status reaching "opgeslagen" → open
  Verbruik and enter meters → open Peuterbad and repeat.
- **Expected:** values persist (reload the date → identical); per-meter daily
  consumption shows today − previous; out-of-limit values raise an action marker;
  autosave confirms within ~1.5 s (KPP-001). _(WB-001..006, GEN-001/003/004, ACT-001/004)_
- **Concurrency check (GEN-007):** open the same date in a second browser, save in
  one, then save the stale one → the stale save is rejected with a conflict message
  and reloads.

### MP-2 — Coordinator round (EPS W2)

- **Pre:** logged in as Coördinator; today's date.
- **Steps:** Coördinatoren → Metingen → "+ Nieuw blok toevoegen" → enter per-bath
  values (combined chlorine shown read-only) → check "Gebruikt" for Peuterbad →
  enter Daggegevens (air temp, visitors, visitors-since-backwash) → tick the checklist.
- **Expected:** block saves; combined-chlorine and "toddler pool used" rules evaluate
  (actions raised where applicable); deleting a block regenerates actions (ACT-005);
  data reloads identically. _(CO-001..004, ACT-001/005, WB-007)_

### MP-3 — Resolve an action (EPS W3)

- **Pre:** an open action exists (raise one via MP-1).
- **Steps:** Waterbeheer → Taken → review "Verplicht" grouped per bath with reasons →
  perform the work → tick to resolve → untick to reopen.
- **Expected:** resolving records name + time and clears the field/badge markers; a
  filter-backwash tick clears all folded `filter_spoelen_*` actions; a resolved
  required item stays in "Verplicht" (struck-through, reason kept). _(ACT-002/003/004)_

### MP-4 — Adjust limits (EPS W4)

- **Pre:** logged in as Administrator.
- **Steps:** Limieten → edit a min/max, an action threshold and a season date →
  observe autosave → "Standaardwaarden" → confirm.
- **Expected:** edits persist and immediately affect validation/action thresholds;
  restore repopulates the defaults. _(LIM-001/002)_

### MP-5 — Deployment smoke test (shared host)

- **Pre:** `backend/` (incl. `vendor/`), `frontend/` and `init.sql` uploaded; docroot
  → `backend/public/`; DB env set; `php bin/init-db.php` run once.
- **Steps:** open the site → log in with a seed account → load a date → save a value →
  reload.
- **Expected:** page assembles (HTML + `/js` + `/css`), login works, save persists.
  Confirms the host runs PHP 8.0 with `pdo_mysql` and `.htaccess` routing.

### MP-6 — CSV export / import (ADM-002/003)

- **Steps:** Database Beheer → export a table → open in EU-Excel (`;`-delimited) →
  import the file back into the matching table.
- **Expected:** export opens with correct columns; import round-trips without data
  loss (metingen tables map `bad_naam` → `bad_id`).

### MP-7 — Role-based access matrix (AUTH-003)

- **Steps:** log in as each role (Waterbeheerder / Coördinator / Administrator) and
  confirm the visible nav and allowed/denied actions:

| Area                             | Waterbeheerder | Coördinator | Administrator |
| -------------------------------- | -------------- | ----------- | ------------- |
| Waterbeheer                      | ✓              | —           | ✓             |
| Coördinatoren                    | ✓ (read of CO) | ✓           | ✓             |
| Trendanalyse                     | ✓              | —           | — (403)       |
| Limieten (read)                  | ✓              | ✓           | ✓             |
| Limieten (edit)                  | — (403)        | — (403)     | ✓             |
| Gebruikers/Database/Configuratie | —              | —           | ✓             |

- **Expected:** hidden nav matches the API guards; a forbidden API call returns 403.

### MP-8 — Full database reset (ADM-004)

- **Steps:** Database Beheer → danger zone → delete-all / recreate-with-defaults →
  pass the double confirmation.
- **Expected:** action requires two confirmations; on full reset the user is logged
  out; the DB returns to the seeded defaults.

### MP-9 — Session idle time-out (AUTH-006/007)

- **Pre:** set `sessie_timeout_minuten` to a small value in Configuratie.
- **Steps:** stay idle past the time-out → trigger any `/api` action.
- **Expected:** the request is rejected and the UI returns to the login screen with a
  persistent "session expired due to inactivity" message; activity before the time-out
  slides the expiry forward.

---

## 5. Traceability summary (EPS → TC)

| EPS block | Requirements | Test case(s)                          |
| --------- | ------------ | ------------------------------------- |
| AUTH      | 001..007     | TC-AUTH-01..04, TC-RBAC-05, TC-ROL-01 |
| CFG       | 001/002      | TC-AUTH-04                            |
| GEN       | 001..009     | TC-GEN-01..05, TC-HIST-06             |
| WB        | 001..009     | TC-WB-01..05                          |
| CO        | 001..004     | TC-CO-01                              |
| ACT       | 001..006     | TC-ACT-01..04                         |
| LIM       | 001..003     | TC-LIM-01                             |
| ADM       | 001..004     | TC-ADM-01..03                         |
| TRD       | 001          | TC-TRD-01                             |
| KPP       | 001..004     | TC-KPP-01..04                         |

> Open verification gap (EPS R-004): the manual E2E procedures MP-1..MP-3 cover W1–W3
> but are **not yet automated** (no browser E2E). Automating them (e.g. Playwright in
> CI) would close R-004.

---

_End of Document_
