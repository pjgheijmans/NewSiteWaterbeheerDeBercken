# Element Performance Specification (EPS)

**Document ID:** EPS-DDZ-0.7
**Element:** Digitale Dagstaat Zwembad — full web application
**Version:** 0.7
**Status:** DRAFT
**Date:** 2026-07-04
**Author:** P. Heijmans
**Approver:**

> **Scope note on element decomposition.** This EPS treats the application as a
> single element. Requirements are user- and system-facing and grouped by
> **functional block** (§3): the actors, then authentication, cross-cutting
> behaviour, and the capabilities of each user role. The frontend/backend split is
> a _design_ concern handled in the companion EDS (§6 Client-side / §7
> Server-side); splitting the EPS would duplicate requirements without adding
> clarity at this size.

---

## Revision History

| Version | Date       | Author      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | 2026-06-03 | P. Heijmans | Initial draft (flat requirement list)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 0.2     | 2026-06-03 | P. Heijmans | Requirements regrouped by actor / functional block; block-prefixed IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 0.3     | 2026-06-11 | P. Heijmans | Added duty registration (WB-009), editable action texts (ACT-006), cathodic-protection measurement (WB-001), coordinator author stamping (GEN-006); 3-category task view; toast/modal feedback                                                                                                                                                                                                                                                                                                                                                       |
| 0.4     | 2026-06-16 | P. Heijmans | Configurable sliding session time-out + generic configuration block (CFG-001, UI-014, AUTH-006/007); concurrent-edit conflict detection and author stamping on waterbeheer data (GEN-007, GEN-006 upgraded); passive "fields incomplete" indicators replacing the autosave warning (GEN-003/GEN-008); app version label (GEN-009)                                                                                                                                                                                                                    |
| 0.5     | 2026-06-23 | P. Heijmans | Added **Appendix A — Input Value Catalogue**: per-field definition, unit, decimal precision (fraction) and default valid range (min/max) for every input value across Waterbeheer, Coördinatoren, Limieten, Configuratie and Gebruikers, plus the free-text logboek entries (now hard-capped at 500 chars, client + server) and duty fields (A.13); §4.4 now points to it                                                                                                                                                                            |
| 0.6     | 2026-06-28 | P. Heijmans | **Backend ported from Node/Express/TypeScript to PHP 8.0 (Slim 4 + PHP-DI)** so the app runs on shared Apache + MySQL hosting (the host offers no Node). The HTTP API, JSON shapes, data model and frontend are unchanged — requirements are unaffected; only the implementation/deployment statements change. Password hashing is now bcrypt; sessions use native PHP `$_SESSION` (no `SESSION_SECRET`); CI added (PHPUnit backend + Jest/ESLint frontend). Updated §2.3, §5.1/5.3, §6.1, §7.2/7.3, §8.1, §9 R-002/R-003 and Appendix A accordingly |
| 0.7     | 2026-07-04 | P. Heijmans | Read-only presentation reworked (GEN-007/AUTH-003): fields in read-only mode are set truly `readonly`/`disabled` and rendered "boxed see-through" (border kept, page shows through); the standalone "Alleen-lezen" banner is removed and the persistent "Laatst gewijzigd door … om …" line is replaced by a popup shown on a 409 concurrent-edit conflict (§3.11). The derived combined-chlorine day-max (gebonden chloor) is now surfaced on the Waterbeheer Meetwaarden/Peuterbad pages **only when its `filter_spoelen_gebonden` action is active** for that bath, otherwise hidden (§3.11, §3.5). |

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and performance requirements for the
**Digitale Dagstaat Zwembad** ("Digital Daily Log — Swimming Pool"): a web
application with which the operating staff of a public swimming pool record,
monitor and analyse daily water-quality and facility data, and through which the
system raises and tracks corrective **actions** when measured values fall outside
configured limits.

It defines _what_ the application must do and how well it must do it. _How_ those
requirements are realised is recorded in the companion EDS-DDZ.

### 1.2 Scope

**In scope**

- Authenticated, role-based recording of daily measurements, consumption,
  heating-system checks and free-text log entries for the deep (Diep), shallow
  (Ondiep) and toddler (Peuterbad) pools.
- Coordinator measurement rounds (timed measurement blocks), daily checklist and
  daily data (air temperature, visitor counts).
- Automatic generation, grouping, display and resolution of corrective actions
  driven by configurable thresholds.
- Central management of limit/threshold values and the season window.
- Historical trend analysis (charts) and per-table CSV export/import and
  administrative data management.
- Recording who was on duty for water management each day (two persons; one
  logs in, the other is entered manually).
- Editable text templates for the generated corrective actions.
- User-account management.
- Administrator-managed general configuration (generic key/value settings), including a configurable idle session time-out.
- Detection of concurrent edits to the same daily record (two water managers), with author/last-edited attribution, instead of silent overwrites.

**Out of scope**

- Direct integration with pool sensors / PLC / SCADA (all data is entered
  manually or imported by CSV).
- Public/customer-facing access; the system is for internal staff only.
- Financial, payroll, ticketing or access-control functionality.
- Mobile native apps (the UI is browser-based).
- Automated regulatory reporting to authorities.

### 1.3 Definitions & Acronyms

| Term                    | Definition                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| API                     | Application Programming Interface                                                                |
| UI                      | User Interface                                                                                   |
| Dagstaat                | Daily log sheet — the day's complete record of pool data                                         |
| Waterbeheerder          | Water manager — staff role responsible for technical water management                            |
| Coördinator             | Coordinator — staff role performing periodic measurement rounds                                  |
| Administrator           | Privileged role with user- and database-management rights                                        |
| Diep / Ondiep           | Deep pool / Shallow pool (the two "large" baths)                                                 |
| Peuterbad               | Toddler pool                                                                                     |
| Meting                  | A measurement record                                                                             |
| Verbruik                | Consumption (water, electricity, gas, chemicals)                                                 |
| Actie                   | A corrective action / alarm generated from a threshold breach                                    |
| Spoelen / Spoelbeurt    | (Filter) backwash / backwash cycle                                                               |
| Gebonden chloor         | Combined chlorine = total chlorine − free chlorine                                               |
| Flocculant               | Flocculant dosing agent                                                                          |
| Kathodische bescherming | Cathodic protection — a Diep/Ondiep measured value (default limit 0.2–2.5)                       |
| Dienst                  | The water-management duty pair on a given day (two persons)                                      |
| Actie-tekst / sjabloon  | Editable text template for a generated action (with `{bad}`/`{drempel}`/`{waarde}` placeholders) |
| Limiet                  | A configured min/max or threshold value                                                          |
| Seizoen                 | Season — the operating window (begin/end date) of the pool                                       |
| Configuratie            | Generic key/value application setting (e.g. session time-out), Administrator-managed             |
| Sessie-time-out         | Idle (sliding) session lifetime; resets on activity, configurable (default 5 minutes)            |
| Versie (record)         | Per-record row version used for optimistic concurrency / conflict detection                      |
| App-versie              | The application version (from `package.json`) + git commit, shown in the header                  |

### 1.4 Reference Documents

| ID      | Title                                                                                          | Version |
| ------- | ---------------------------------------------------------------------------------------------- | ------- |
| EDS-DDZ | Element Design Specification — Digitale Dagstaat Zwembad                                       | 0.4     |
| —       | `docs/architecture.md` and `docs/architecture/*` (backend, frontend, flows, database, testing) | current |
| —       | `CLAUDE.md` — project conventions                                                              | current |

---

## 2. Element Overview

### 2.1 Element Description

The application replaces a paper/spreadsheet daily log. Each operating day has one
record ("dagstaat") that aggregates: water-quality measurements per bath,
consumption meter readings, heating-system checks, coordinator measurement rounds,
a daily checklist, visitor counts and free-text notes. As data is saved, the
system continuously evaluates it against configurable limits and raises corrective
**actions** (e.g. "backwash filter", "order chlorine", "drain toddler pool") that
staff can mark resolved. Historical data can be charted for trend analysis and
exported/imported as CSV.

### 2.2 Functional Summary

- Authenticate staff and gate functionality by role (Waterbeheerder, Coördinator,
  Administrator).
- Record and persist, per calendar day, all measurement / consumption / inspection
  / checklist / log data for Diep, Ondiep and Peuterbad.
- Auto-calculate derived values (consumption deltas vs. previous day, combined
  chlorine, cumulative visitors since last backwash).
- Generate, group, display and resolve corrective actions from configurable
  thresholds.
- Manage central limit and threshold values and the season window.
- Provide trend charts over a chosen date range.
- Provide administrative data management (per-table CSV export/import, clearing,
  full reset) and user-account management.
- Autosave edits with clear save-status feedback.

### 2.3 Context / System Interface Diagram

```
                ┌─────────────────────────────────────────────┐
  Pool staff →  │  Browser client (Dutch UI, vanilla JS)       │
  (Waterbeheer, │   tabs · forms · charts · action badges      │
   Coördinator, └───────────────────────┬─────────────────────┘
   Administrator)                        │ HTTP(S) · JSON · session cookie
                ┌───────────────────────▼─────────────────────┐
                │  Application server (PHP 8 · Slim 4 + PHP-DI) │
                │   auth · validation · controllers · services  │
                └───────────────────────┬─────────────────────┘
                                        │ SQL (PDO)
                                ┌────────▼────────┐
                                │   MySQL 8 DB     │
                                └─────────────────┘
   CSV files  ⇄  (manual export/import via Database Beheer)
   Chart.js   →  (client-side charting library)
```

---

## 3. Functional Requirements

Requirements are grouped by functional block. Each block has a short prefix:

| Prefix | Block                                 | Applies to                                          |
| ------ | ------------------------------------- | --------------------------------------------------- |
| AUTH   | Authentication & session              | All users                                           |
| GEN    | Common / cross-cutting data behaviour | All data-entry users                                |
| WB     | Water-management daily log            | Waterbeheerder (+ Administrator)                    |
| CO     | Coordinator rounds                    | Coördinator (+ Administrator)                       |
| ACT    | Corrective actions                    | Generated by the system; surfaced to Waterbeheerder |
| LIM    | Limits & thresholds                   | Administrator / per role policy                     |
| ADM    | Administration (users & database)     | Administrator                                       |
| CFG    | General configuration (settings)      | Administrator                                       |
| TRD    | Trend analysis                        | Per role policy                                     |

Priority uses MoSCoW (Must / Should / Could). "Impl." = met by the current build
(Yes / Partial / No).

### 3.0 Actors / User Roles

| Actor                | Description                                     | Primary responsibilities                                                                                    | Access (blocks)         |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------- |
| Unauthenticated user | Anyone reaching the app without a valid session | Log in                                                                                                      | AUTH (login only)       |
| **Waterbeheerder**   | Technical water manager                         | Daily water measurements, consumption, heating checks, log; handle corrective actions; view trends          | AUTH, GEN, WB, ACT, TRD |
| **Coördinator**      | Pool coordinator on shift                       | Timed measurement rounds, checklist, daily data (air temp, visitors), log                                   | AUTH, GEN, CO           |
| **Administrator**    | System administrator                            | User management, limit/threshold and action-text management, database management, and general configuration | AUTH, LIM, ADM, CFG     |

**Confirmed role policy (resolves R-006).** **Trendanalyse (TRD)** is restricted to
**Waterbeheerder only** (not Administrator, not Coördinator). **Limieten (LIM):**
_reading_ limit values requires authentication but is allowed for **any role**
(the dagstaat field-validation and season-bound navigation depend on it);
_managing/editing_ limits is **Administrator only**. Reflected in the access column
above, the LIM/TRD blocks, the screen table (§3.9) and the modes (§3.12).

### 3.1 Authentication & Session (AUTH)

| ID       | Requirement                                                                                                                                                                                                                 | Priority | Impl.                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| AUTH-001 | A user shall authenticate with a login name and password.                                                                                                                                                                   | Must     | Yes                                                                     |
| AUTH-002 | On successful login the system shall establish a server-side session and keep the user signed in across requests until logout/expiry.                                                                                       | Must     | Yes                                                                     |
| AUTH-003 | The system shall restrict navigation and operations according to the user's role (Waterbeheerder / Coördinator / Administrator).                                                                                            | Must     | Yes                                                                     |
| AUTH-004 | A user shall be able to log out, ending the session.                                                                                                                                                                        | Must     | Yes                                                                     |
| AUTH-005 | User credentials shall be stored securely (hashed, non-reversible).                                                                                                                                                         | Should   | Yes (bcrypt; legacy plaintext upgraded on login + at startup)           |
| AUTH-006 | The session shall expire after a period of **inactivity** (idle/sliding time-out: the timer resets on each request). The duration shall be **configurable** (CFG-001; default 5 minutes) and take effect without a restart. | Should   | Yes (`rolling` cookie; per-request max-age from the live configuration) |
| AUTH-007 | When a request is rejected because the session has expired, the UI shall return to the login screen with a **persistent explanation** ("session expired due to inactivity"), rather than failing silently.                  | Should   | Yes (global 401 handling → login screen message)                        |

### 3.2 Common / Cross-cutting (GEN)

Applies to all data-entry screens (Waterbeheer and Coördinatoren).

| ID      | Requirement                                                                                                                                                                                                                                                                                                                        | Priority | Impl.                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GEN-001 | The user shall select an active operating date; all data entry and display is scoped to that date.                                                                                                                                                                                                                                 | Must     | Yes                                                                                                                                                    |
| GEN-002 | Date navigation shall be constrained to within the configured season window (begin/end).                                                                                                                                                                                                                                           | Should   | Yes                                                                                                                                                    |
| GEN-003 | Edits shall autosave after a short debounce, with a visible save status (pending / saving / saved / error).                                                                                                                                                                                                                        | Must     | Yes                                                                                                                                                    |
| GEN-004 | Numeric entry shall be validated against the configured limits with inline visual feedback, and the locale decimal comma shall be normalised to a point.                                                                                                                                                                           | Should   | Yes                                                                                                                                                    |
| GEN-005 | Each day's data shall be persisted idempotently (insert-or-update keyed by date / block).                                                                                                                                                                                                                                          | Must     | Yes                                                                                                                                                    |
| GEN-006 | Saved measurements, log entries, resolved actions, coordinator daily data and the checklist shall record their author.                                                                                                                                                                                                             | Could    | Yes (coordinator blocks, log entries, daggegevens, checklist, resolved actions; and now the waterbeheer measurements/consumption records, via GEN-007) |
| GEN-007 | When two users edit the same daily record concurrently, the system shall **detect the conflict** (optimistic version check) instead of silently overwriting, and the UI shall reload the current values with an explanation. The data shall show **who last edited it and when**, and the view shall refresh on return to the tab. | Should   | Yes (waterbeheer meetwaarden/verbruik tables: row version + author + "last edited" + reload-on-focus)                                                  |
| GEN-008 | Where a data page is not fully filled in, the system shall mark this **passively** (a subdued indicator on the relevant subtab/page tab) rather than warning after every save.                                                                                                                                                     | Could    | Yes (passive "incomplete" dot on Meetwaarden/Verbruik subtabs and the page tab)                                                                        |
| GEN-009 | The application version shall be visible in the header (version + build) for support/troubleshooting.                                                                                                                                                                                                                              | Could    | Yes (version from `package.json` + git commit)                                                                                                         |

### 3.3 Water-management daily log (WB)

Actor: Waterbeheerder (and Administrator).

| ID     | Requirement                                                                                                                                                                       | Priority | Impl. |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| WB-001 | Record daily measurements for Diep and Ondiep: pH, chlorine, temperature, flow, filter pressure in/out, cathodic protection (kathodische bescherming).                            | Must     | Yes   |
| WB-002 | Record daily measurements for Peuterbad: pH, chlorine, filter pressure, flow.                                                                                                     | Must     | Yes   |
| WB-003 | Record daily consumption for Diep/Ondiep: water (deep/shallow/total), electricity (night/day), gas, flocculant, chemicals (chlorine/sulphuric acid).                              | Must     | Yes   |
| WB-004 | Record daily consumption for Peuterbad: water and chemicals (chlorine/sulphuric acid).                                                                                            | Must     | Yes   |
| WB-005 | Display the daily consumption (today − previous day) for each consumption meter, for Diep/Ondiep and Peuterbad.                                                                   | Should   | Yes   |
| WB-006 | Record heating-system status and inspection flags per day.                                                                                                                        | Should   | Yes   |
| WB-007 | Display visitor figures for the day, including cumulative visitors since the last backwash.                                                                                       | Should   | Yes   |
| WB-008 | Record, list and delete free-text, timestamped log entries for the Waterbeheer log per day.                                                                                       | Should   | Yes   |
| WB-009 | Record who was on duty for water management each day (two persons); the logged-in user is pre-filled, the second is chosen from the registered water managers or typed free-text. | Could    | Yes   |

### 3.4 Coordinator rounds (CO)

Actor: Coördinator (and Administrator).

| ID     | Requirement                                                                                                                                                                                                    | Priority | Impl. |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| CO-001 | Record coordinator measurement blocks per timeslot, per bath: pH, free/total chlorine (combined chlorine derived), water temperature, clarity (large baths) or "pool used" (Peuterbad); add and delete blocks. | Must     | Yes   |
| CO-002 | Record the daily checklist (test-run flags).                                                                                                                                                                   | Must     | Yes   |
| CO-003 | Record daily data: air temperature, visitors today, visitors since last backwash.                                                                                                                              | Must     | Yes   |
| CO-004 | Record, list and delete free-text, timestamped log entries for the Coördinator log per day.                                                                                                                    | Should   | Yes   |

### 3.5 Corrective actions (ACT)

Generated by the system from saved data; surfaced primarily to the Waterbeheerder.

| ID      | Requirement                                                                                                                                                                                                          | Priority | Impl. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| ACT-001 | Automatically generate corrective actions when saved data crosses a configured threshold (rules in §3.5.1).                                                                                                          | Must     | Yes   |
| ACT-002 | Group all "filter backwash" reasons for one bath into a single action that carries every reason and is resolved together.                                                                                            | Should   | Yes   |
| ACT-003 | Mark an action resolved and reopen it again, recording who resolved it and when.                                                                                                                                     | Must     | Yes   |
| ACT-004 | Indicate open/resolved actions visually on the related input fields and on the relevant tab/navigation badges.                                                                                                       | Should   | Yes   |
| ACT-005 | Regenerate the affected actions when the underlying data is saved or a coordinator block is deleted.                                                                                                                 | Must     | Yes   |
| ACT-006 | The text of generated actions shall be configurable via editable templates with placeholders (`{bad}`, `{drempel}`, `{waarde}`). **Editing is Administrator-only**; built-in defaults apply when no override exists. | Could    | Yes   |

#### 3.5.1 Action generation rules (detail of ACT-001)

| Action type                                                     | Trigger condition                                                                                                                           | Bath(s)                 | Result shown                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------- |
| `filter_spoelen_druk`                                           | Filter pressure difference (in−out) > threshold (Diep/Ondiep); pressure > threshold (Peuterbad)                                             | Diep, Ondiep, Peuterbad | Filter spoelen                  |
| `filter_spoelen_flow`                                           | Flow below per-bath minimum (Diep 250 / Ondiep 75 / Peuterbad 4 default)                                                                    | Diep, Ondiep, Peuterbad | Filter spoelen                  |
| `filter_spoelen_bezoekers`                                      | Visitors today above daily maximum                                                                                                          | Diep, Ondiep            | Filter spoelen                  |
| `filter_spoelen_spoelbeurt`                                     | Cumulative visitors since that bath's last resolved backwash above maximum (counter is independent per bath)                                | Diep, Ondiep            | Filter spoelen                  |
| `filter_spoelen_dagen`                                          | Days since that bath's last backwash above the maximum (default 7); no action while the bath has never been backwashed (no reference point) | Diep, Ondiep            | Filter spoelen                  |
| `filter_spoelen_gebonden`                                       | Combined chlorine (total − free) above maximum, aggregated over the day per bath                                                            | Diep, Ondiep, Peuterbad | Filter spoelen                  |
| `chloor_bestellen` / `zwavelzuur_bestellen`                     | Chemical stock below minimum                                                                                                                | (general)               | Order chlorine / sulphuric acid |
| `Flocculant_bijvullen`                                           | Flocculant below minimum                                                                                                                    | (general)               | Top up flocculant               |
| `chloor_peuterbad_bijvullen` / `zwavelzuur_peuterbad_bijvullen` | Peuterbad chemical below minimum                                                                                                            | Peuterbad               | Top up vessel                   |
| `peuterbad_leeglaten`                                            | Peuterbad marked "used" in any coordinator block that day                                                                                   | Peuterbad               | Drain toddler-pool water        |

All thresholds are configurable via LIM-001. Generation is fire-and-forget relative
to the triggering save (no transactional guarantee between save and action).

### 3.6 Limits & thresholds (LIM)

| ID      | Requirement                                                                                                                                  | Priority | Impl. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| LIM-001 | Manage the central limit values (min/max per parameter) and the action thresholds, and the season window. **Editing is Administrator-only.** | Must     | Yes   |
| LIM-002 | Restore the standard default limit/threshold values on request (Administrator).                                                              | Should   | Yes   |
| LIM-003 | Reading limit values requires authentication and is permitted for any role (needed by GEN-002/004).                                          | Must     | Yes   |

### 3.7 Administration (ADM)

Actor: Administrator.

| ID      | Requirement                                                                                                                                                          | Priority | Impl. |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| ADM-001 | Manage user accounts: create, list, update and delete (voornaam, achternaam, login name, password, role).                                                            | Must     | Yes   |
| ADM-002 | Export any data table to CSV (semicolon-delimited, EU-Excel compatible).                                                                                             | Should   | Yes   |
| ADM-003 | Import a CSV into a data table.                                                                                                                                      | Could    | Yes   |
| ADM-004 | Clear an individual table, and delete/recreate the full database with default seed data, behind explicit double confirmation (and forced logout after a full reset). | Should   | Yes   |

### 3.7b General configuration (CFG)

Actor: Administrator. Backed by a generic key/value configuration store so further
settings can be added without schema changes.

| ID      | Requirement                                                                                                                                                                                                                    | Priority | Impl. |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----- |
| CFG-001 | View and edit general application settings (generic key/value), including the session idle time-out (minutes). **Administrator-only.** Changes take effect without a restart and are validated (e.g. time-out 1–1440 minutes). | Should   | Yes   |
| CFG-002 | Settings shall autosave (consistent with the rest of the app); reading is permitted for any authenticated user, editing is Administrator-only.                                                                                 | Could    | Yes   |

### 3.8 Trend analysis (TRD)

| ID      | Requirement                                                                                                                                    | Priority | Impl. |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| TRD-001 | Display historical trend charts for measurements and consumption over a user-chosen date range, for both bath groups. **Waterbeheerder only.** | Should   | Yes   |

### 3.9 User Interface — Screens & Views

| ID      | Screen / View               | Block   | Roles                         |
| ------- | --------------------------- | ------- | ----------------------------- |
| UI-001  | Login                       | AUTH    | All (unauthenticated)         |
| UI-002  | Waterbeheer → Diep/Ondiep   | WB      | Waterbeheerder, Administrator |
| UI-003  | Waterbeheer → Peuterbad     | WB      | Waterbeheerder, Administrator |
| UI-004  | Waterbeheer → Logboek       | WB      | Waterbeheerder, Administrator |
| UI-005  | Waterbeheer → Acties        | ACT     | Waterbeheerder, Administrator |
| UI-006  | Coördinatoren → Metingen    | CO      | Coördinator, Administrator    |
| UI-007  | Coördinatoren → Checklist   | CO      | Coördinator, Administrator    |
| UI-008  | Coördinatoren → Daggegevens | CO      | Coördinator, Administrator    |
| UI-009  | Coördinatoren → Logboek     | CO      | Coördinator, Administrator    |
| UI-010  | Limieten                    | LIM     | Administrator                 |
| UI-010b | Actie-teksten               | ACT/LIM | Administrator                 |
| UI-011  | Gebruikers Beheer           | ADM     | Administrator                 |
| UI-012  | Database Beheer             | ADM     | Administrator                 |
| UI-013  | Trendanalyse                | TRD     | Waterbeheerder                |
| UI-014  | Configuratie                | CFG     | Administrator                 |

### 3.10 Key User Workflows

**W1 — Record the daily water log (Waterbeheerder).** Log in → Waterbeheer →
Diep/Ondiep → enter measurements (validated inline) → autosave confirms → Verbruik
subtab shows per-meter daily consumption → threshold breaches surface as actions →
repeat for Peuterbad. _(GEN-001/003/004, WB-001..008, ACT-001/004)_

**W2 — Coordinator round (Coördinator).** Log in → Coördinatoren → Metingen → add a
block for the current time → enter per-bath values (combined chlorine shown) →
saving evaluates combined-chlorine and "toddler pool used" rules → enter daily data
and checklist. _(CO-001..003, ACT-001/005)_

**W3 — Resolve an action (Waterbeheerder).** Waterbeheer → Acties → review open
actions grouped per bath with all reasons → perform work → tick to resolve (name +
time recorded); untick to reopen. _(ACT-002/003)_

**W4 — Adjust limits (Administrator).** Limieten → edit min/max, thresholds or
season dates → autosave; "restore defaults" repopulates. _(LIM-001/002)_

**W5 — Review trends.** Trendanalyse → choose from/to range and tab → charts render
per parameter for both bath groups. _(TRD-001)_

**W6 — Administer data (Administrator).** Database Beheer → export/import CSV per
table, clear a table, or reset the database (double confirmation). _(ADM-002..004)_

### 3.11 Navigation Model

- A top-level **role navigation bar** (Waterbeheer, Coördinatoren, Limieten,
  Actie-teksten, Gebruikers Beheer, Database Beheer, Configuratie, Trendanalyse);
  items shown/enabled per role.
- The header shows a small **app-version label** (version + git commit) next to the
  title (GEN-009).
- The logged-in user's name is shown top-right and opens a **menu** (Uitloggen);
  when several users share a first name it is disambiguated with the surname initial,
  or the full surname when that initial also collides.
- Within Waterbeheer and Coördinatoren, **tabs and subtabs** group the data areas.
- The Waterbeheer dagstaat shows a compact **"Dienst vandaag"** chip under the
  date selector (WB-009).
- A single **central date selector** sets the active day for all dagstaat data.
- The per-bath **Taken** subtab lists three groups — **Verplicht**, **Belangrijk**
  and **Overig** — and its bath page tab (Diep/Ondiep, Peuterbad) carries a
  **⚠ badge** only when open **Verplicht** tasks (triggered alarms) exist. A task
  that was triggered as **Verplicht** stays in that group after it is ticked off
  (shown struck-through, with the reason kept), so it remains clear that — and why —
  it was required; it no longer counts toward the open total or the ⚠ badge.
- The Meetwaarden/Verbruik subtabs (and the page tab) carry a subdued **● dot** when
  fields on that page are still incomplete (GEN-008), and a small **⚠** on the subtab
  that contains a field with an open action. On a concurrent-edit conflict (GEN-007) a
  popup reports that someone else changed the data and names who last saved it (there is
  no longer a persistent _"Laatst gewijzigd door … om …"_ line, to save screen space).
- The **derived combined-chlorine day-max** ("Gebonden chloor (dagmax)", read-only,
  computed from coordinator data) is shown on the Meetwaarden/Peuterbad pages **only
  when a `filter_spoelen_gebonden` action exists** for that bath — so the ⚠/✓ marker has
  context; when no such action exists the values add nothing and are hidden. For the
  large baths Diep and Ondiep are shown together (a single block) as soon as either has
  such an action.
- **Read-only fields** (no write right, or a past date without history rights) keep the
  same box/border as editable fields but with a see-through fill; they are genuinely
  non-editable and empty ones show an em-dash. There is no separate "read-only" banner.

### 3.12 Modes of Operation

| Mode            | Description                        | Entry Condition              | Exit Condition       |
| --------------- | ---------------------------------- | ---------------------------- | -------------------- |
| Unauthenticated | Only the login screen is available | App opened, no valid session | Successful login     |
| Waterbeheer     | WB + ACT + TRD blocks              | Login as Waterbeheerder      | Logout / role switch |
| Coördinator     | CO blocks                          | Login as Coördinator         | Logout / role switch |
| Administrator   | LIM + ADM + CFG blocks             | Login as Administrator       | Logout               |

### 3.13 Functional Constraints

- One dagstaat record exists per calendar day; saving a field updates that day's
  record (idempotent upsert). For the waterbeheer meetwaarden/verbruik records the
  update is guarded by a row version (optimistic concurrency, GEN-007): a stale
  write is rejected rather than silently overwriting another user's change.
- Numeric entry uses the locale comma on input, normalised to a point before
  transmission.
- Action generation is best-effort (fire-and-forget), not transactionally bound to
  the triggering save.
- The cumulative "visitors since backwash" counter resets per bath at that bath's
  most recent resolved backwash action.
- All UI text and stored domain labels are in Dutch.

---

## 4. Performance Requirements

> Targets reflect a small, internal, single-site tool used by a handful of staff.
> Values marked _(assumption)_ are proposed pending stakeholder confirmation.

### 4.1 Key Performance Parameters (KPPs)

| ID      | Parameter                                                       | Target        | Threshold | Measurement Method |
| ------- | --------------------------------------------------------------- | ------------- | --------- | ------------------ |
| KPP-001 | Autosave round-trip after edit (debounce + save)                | < 1.5 s       | < 3 s     | Test/Demonstration |
| KPP-002 | Action correctly raised/cleared after a threshold-crossing save | 100% of saves | 100%      | Test               |
| KPP-003 | Consumption delta correctness (today − previous day)            | Exact         | Exact     | Test               |
| KPP-004 | Data durability (saved day reloads identically)                 | No loss       | No loss   | Test/Integration   |

### 4.2 UI Performance

| Metric                                | Target   | Threshold |
| ------------------------------------- | -------- | --------- |
| Initial page load (LCP), LAN          | < 2.5 s  | < 4 s     |
| Time to Interactive (TTI)             | < 3 s    | < 5 s     |
| API response time (p95), LAN          | < 300 ms | < 1 s     |
| Tab/subtab switch (client-side)       | < 200 ms | < 500 ms  |
| Trend chart render (≤ 1 season range) | < 1.5 s  | < 3 s     |

### 4.3 Throughput & Capacity

| Metric                            | Value _(assumption)_     |
| --------------------------------- | ------------------------ |
| Concurrent users (normal)         | 1–3                      |
| Concurrent users (peak)           | ≤ 5                      |
| Operating days retained (history) | Multiple seasons (years) |
| Max CSV import payload            | ≤ a few MB per table     |

### 4.4 Accuracy & Precision

- Numeric values are stored at the precision of the underlying schema (decimals for
  measurements, integers for meter/chemical counts); consumption deltas round to
  whole units.
- Combined chlorine = total − free, shown to 2 decimals.
- Threshold comparisons use the current configured limits at save time.
- The per-field **definition, unit, decimal precision (fraction) and default valid
  range (min/max)** of every input value are catalogued in **Appendix A**.

### 4.5 Availability & Reliability

| Metric                                 | Target _(assumption)_                          |
| -------------------------------------- | ---------------------------------------------- |
| Availability during pool opening hours | ≥ 99%                                          |
| Container auto-restart on failure      | Yes (Docker `restart: always`)                 |
| Recovery Point Objective (RPO)         | Last successful autosave (per field, ~seconds) |
| Recovery Time Objective (RTO)          | < 15 min (container restart / redeploy)        |

> Backups: point-in-time recovery currently depends on manual CSV export and the
> Docker volume. A defined database backup schedule is recommended (see R-001).

---

## 5. Interface Requirements

### 5.1 External Interfaces

| Interface            | Type                       | Description                                    |
| -------------------- | -------------------------- | ---------------------------------------------- |
| Staff browser        | Browser (HTTP/HTML/JS)     | Primary user interface served by the app       |
| Application REST API | REST / JSON                | Client ↔ server data exchange under one origin |
| MySQL                | Database (TCP)             | Persistent storage via PDO (per-request)       |
| Chart.js             | Client JS library          | Rendering of trend charts                      |
| CSV files            | File (semicolon-delimited) | Manual export/import of table data             |

### 5.2 Data Interfaces

| Interface  | Protocol / Format          | Direction | Description                                              |
| ---------- | -------------------------- | --------- | -------------------------------------------------------- |
| `/api/*`   | JSON over HTTP(S)          | In/Out    | All application data operations; session cookie for auth |
| CSV export | `text/csv` (`;` delimiter) | Out       | One file per table                                       |
| CSV import | `text/csv` (`;` delimiter) | In        | One file per table                                       |

### 5.3 Physical / Infrastructure Interfaces

- **Production:** runs on shared Apache + MySQL hosting with PHP 8.0 (`pdo_mysql`);
  the docroot points at `backend/public/` (Slim front controller via `.htaccess`).
- **Dev/test:** containerised with Docker Compose — web service (Apache + mod_php) on
  port 8080 and MySQL on 3306.
- Single-origin deployment (client and API same host); no public exposure assumed
  beyond the operator's network.

### 5.4 User Interface Standards

| Requirement          | Value                                                   |
| -------------------- | ------------------------------------------------------- |
| Language             | Dutch (UI and domain labels)                            |
| Primary use context  | On-site desktop/tablet during opening hours             |
| Browser support      | Current Chromium/Edge, Firefox (recent versions)        |
| Accessibility        | WCAG 2.1 AA — _target/Should; not yet verified_         |
| Responsive behaviour | Functional on desktop and tablet; mobile is best-effort |

---

## 6. Environmental Requirements

### 6.1 Deployment Environment

| Item             | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Hosting          | Shared Apache + MySQL hosting (production); local/on-premises also supported   |
| Operating System | Host-provided (Linux); dev/test via a Linux Docker container                   |
| Runtime          | PHP 8.0 (Slim 4 + PHP-DI), served by Apache + mod_php; `pdo_mysql` required    |
| Database         | MySQL 8                                                                        |
| Container        | Docker / Docker Compose (dev/test only; production uses the host's PHP/Apache) |

### 6.2 Browser & Client Environment

- Modern evergreen browser with JavaScript enabled.
- Cookies enabled (session authentication).
- Network access to the application host on the LAN.

### 6.3 Network Requirements

- Designed for LAN/low-latency use; no offline mode (a live server connection is
  required to load and save).
- Bandwidth needs are modest (small JSON payloads; charts load a date-range
  dataset).

---

## 7. Constraints & Standards

### 7.1 Applicable Standards

- WCAG 2.1 AA — accessibility _(target, not yet verified)_.
- OWASP Top 10 — security baseline for a web application.
- EU-Excel CSV convention — semicolon-delimited exports.

### 7.2 Regulatory / Compliance Requirements

- **Personal data:** limited to staff accounts (name, login, password, role).
  Visitor data is aggregate counts only — no customer PII.
- **GDPR:** staff-account data must be limited to what is necessary and accounts
  must be removable (supported via ADM-001).
- **Security status:**
    - Passwords are hashed with bcrypt (`password_hash`, `PASSWORD_DEFAULT`)
      (AUTH-005 met; R-002 resolved 2026-06-04). Legacy plaintext values are upgraded
      to a hash on the next login and by a one-time startup migration.
    - Sessions use native PHP `$_SESSION` (the PHP runtime signs/secures the session
      cookie; there is no application-level `SESSION_SECRET` to manage). Session
      handling is scoped to `/api` paths so public pages open no DB connection.
      (R-003 resolved 2026-06-04; superseded by the PHP session model in 0.6.)

### 7.3 Design Constraints

- Developed with Claude Code (AI-assisted development).
- Solo developer — complexity must remain manageable; conventions favour a small,
  readable codebase over heavy frameworks.
- Frontend is intentionally framework-free (vanilla ES6 classes, no bundler/build
  step); the backend is layered PHP (Slim 4 + PHP-DI) with dependency injection, and
  must stay PHP 8.0-compatible (the shared host's version — no 8.1+ syntax).
- Schema changes are made in `init.sql` only (idempotent run on startup); there is
  no migrations tool.

---

## 8. Verification & Acceptance

### 8.1 Verification Methods

Methods: Test (T) · Analysis (A) · Inspection (I) · Demonstration (D).

| Requirement(s)                | Method | Notes                                                                                                                                                    |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-001..004                 | T      | Auth middleware + integration tests                                                                                                                      |
| AUTH-005                      | T      | Met — bcrypt hashing; unit (`WachtwoordTest`) + integration (`GebruikersRepository`, login) PHPUnit tests                                                |
| AUTH-006/007                  | T / D  | ConfiguratieService unit tests (timeout value/validation); session-expiry jsdom tests (401 → login message); cookie max-age demonstrated in Docker       |
| CFG-001/002                   | T / D  | ConfiguratieController/Service unit tests (role gate, validation, cache); autosave jsdom test                                                            |
| GEN-007                       | T / D  | `optimistisch` helper unit tests (all conflict branches); frontend version round-trip + 409 jsdom tests; load→save→stale-save demonstrated (200/200/409) |
| GEN-001/002/005               | T / D  | Integration upsert tests; demonstrate date scoping & season bounds                                                                                       |
| GEN-003/004                   | T / D  | jsdom save-flow tests; limit-validation behaviour                                                                                                        |
| WB-001..004, WB-006/008       | T / D  | Repository + integration tests; demonstrate save & reload                                                                                                |
| WB-005                        | T      | Pure-function and jsdom consumption-delta tests                                                                                                          |
| WB-007, CO-001..004           | T / D  | Coordinator repo/integration tests; demonstrate blocks & daily data                                                                                      |
| ACT-001/005                   | T      | Unit tests cover every action type, per-bath thresholds and the independent backwash counters                                                            |
| ACT-002                       | T      | jsdom test covers per-bath grouping of backwash reasons                                                                                                  |
| ACT-003/004                   | T / D  | Resolve/reopen tests; demonstrate field markers & badges                                                                                                 |
| LIM-001/002                   | T / D  | Limit-repo tests + GROEPEN/LABELS consistency test                                                                                                       |
| ADM-001..004                  | D / I  | Demonstration; inspection of double-confirm guards                                                                                                       |
| TRD-001                       | D      | Demonstration over a sample range                                                                                                                        |
| KPP-001..004                  | T / A  | Measured during representative use                                                                                                                       |
| End-to-end happy path (W1–W3) | D      | Browser E2E smoke run — _pending (not yet executed)_                                                                                                     |

### 8.2 Acceptance Criteria

- [ ] All Must-priority requirements (AUTH-001..004, GEN-001/003/005, WB-001..004,
      CO-001..003, ACT-001/003/005, LIM-001, ADM-001) verified.
- [ ] Action generation/resolution verified for every action type, including
      per-bath thresholds and independent backwash counters.
- [ ] Consumption deltas and combined-chlorine calculations verified correct.
- [ ] Saved data reloads identically across sessions (durability).
- [ ] UI performance targets met on the target LAN environment.
- [ ] All screens render and function on target desktop/tablet viewports.
- [x] Passwords hashed (AUTH-005 / R-002 resolved; bcrypt).
- [x] Session handling secured by the PHP runtime; no app-level secret to leak (R-003).
- [ ] No critical or high OWASP vulnerabilities remaining (ongoing review).
- [ ] A defined database backup procedure is in place (R-001).

---

## 9. Open Items / Risks (informative)

| ID    | Item                                                                                               | Recommendation                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| R-001 | No defined DB backup schedule (relies on Docker volume + manual CSV)                               | Define and automate periodic backups                                                                                                  |
| R-002 | ~~Passwords stored in plain text (AUTH-005)~~ **RESOLVED 2026-06-04**                              | Done: bcrypt hashing (`password_hash`) on create/update/seed; legacy plaintext upgraded on login + startup migration                  |
| R-003 | ~~Hardcoded default session secret~~ **RESOLVED 2026-06-04**                                       | Done: originally `SESSION_SECRET` (Node); since 0.6 the PHP runtime secures the native session cookie — no app-level secret to manage |
| R-004 | Browser E2E coverage absent                                                                        | Add an automated end-to-end smoke test for W1–W3                                                                                      |
| R-005 | Accessibility (WCAG AA) unverified                                                                 | Audit and remediate if public-sector accessibility rules apply                                                                        |
| R-006 | ~~Role access to Limieten (LIM) and Trendanalyse (TRD) not yet confirmed~~ **RESOLVED 2026-06-03** | Policy confirmed and enforced: TRD = Waterbeheerder only; LIM read = any authenticated role, LIM edit = Administrator only (see §3.0) |

---

## Appendix A — Input Value Catalogue (definitions, units, ranges & precision)

This appendix defines **every value a user can enter**: its meaning, unit, decimal
precision ("fraction") and default valid range (min/max). It consolidates what was
previously implicit in the schema and limit defaults.

**How to read the columns**

- **Decimals (fraction).** The number of decimal places the value is stored and
  entered with — the storage precision in the schema (the authoritative source).
  `0` = whole numbers only (integer); `2` = two decimal places, etc. `—` = not a
  numeric value (text, date or boolean checkbox).
- **Default range (min – max).** The seeded values of the configurable **limits**
  (`LIMIETEN.min_waarde`–`max_waarde`). These are **defaults**: an Administrator can
  change them on the Limieten screen (LIM-001), and "restore defaults" repopulates
  them (LIM-002). Ranges drive the inline validation feedback (GEN-004); they are
  advisory (a flag/colour), not a hard input rejection. For the **`actie_*`** rows
  the single configured value is the **threshold** that triggers an action (ACT-001).
- **Decimal comma** is normalised to a point on entry; an empty field is stored as
  _null_ (not `0`) (GEN-004).

### A.1 Waterbeheer — Meetwaarden Diep & Ondiep (per bath)

| Field (UI label)        | Definition                     | Unit | Decimals | Default min – max | Limit key / notes         |
| ----------------------- | ------------------------------ | ---- | -------- | ----------------- | ------------------------- |
| pH                      | Acidity of the pool water      | pH   | 2        | 6.80 – 7.60       | `ph_waarde`               |
| Chloor                  | Free chlorine level            | mg/l | 2        | 0.50 – 1.50       | `chloor_waarde`           |
| Temperatuur             | Water temperature              | °C   | 1        | 20.0 – 30.0       | `watertemperatuur`        |
| Flow (Diep)             | Circulation flow, deep pool    | m³/h | 0        | 250 – 450         | `flow_diep`               |
| Flow (Ondiep)           | Circulation flow, shallow pool | m³/h | 0        | 50 – 120          | `flow_ondiep`             |
| Filterdruk In           | Pressure before the filter     | bar  | 2        | 0.20 – 1.50       | `filter_druk_in`          |
| Filterdruk Uit          | Pressure after the filter      | bar  | 2        | 0.20 – 1.50       | `filter_druk_uit`         |
| Kathodische bescherming | Cathodic-protection voltage    | V    | 2        | 0.20 – 2.50       | `kathodische_bescherming` |

### A.2 Waterbeheer — Meetwaarden Peuterbad

| Field      | Definition                | Unit | Decimals | Default min – max | Limit key / notes        |
| ---------- | ------------------------- | ---- | -------- | ----------------- | ------------------------ |
| pH         | Acidity of the pool water | pH   | 2        | 6.80 – 7.60       | `ph_waarde` (shared)     |
| Chloor     | Free chlorine level       | mg/l | 2        | 0.50 – 1.50       | `chloor_waarde` (shared) |
| Flow       | Circulation flow          | m³/h | 0        | 3 – 10            | `flow_peuterbad`         |
| Filterdruk | Filter pressure           | bar  | 2        | 0.20 – 1.50       | `filter_druk_peuterbad`  |

### A.3 Waterbeheer — Verbruik Diep/Ondiep (daily meter / stock readings)

All values are whole numbers (meters and stock counts have no decimals). The daily
consumption shown per meter is derived (today − previous day, WB-005) and is not an
input.

| Field                  | Definition                      | Unit | Decimals | Default min – max | Notes                                 |
| ---------------------- | ------------------------------- | ---- | -------- | ----------------- | ------------------------------------- |
| Flocculant              | Flocculant stock/dosing         | —    | 0        | n/a               | threshold `actie_Flocculant_min` = 10  |
| Water Diep             | Water meter reading, deep       | m³   | 0        | 0 – 99999         | `water_diep` (cumulative meter)       |
| Water Ondiep           | Water meter reading, shallow    | m³   | 0        | 0 – 99999         | `water_ondiep`                        |
| Water Totaal           | Water meter reading, total      | m³   | 0        | 0 – 99999         | `water_totaal`                        |
| Elektriciteit Nacht    | Electricity meter, night tariff | kWh  | 0        | 0 – 500           | `elektriciteit_nacht`                 |
| Elektriciteit Dag      | Electricity meter, day tariff   | kWh  | 0        | 0 – 500           | `elektriciteit_dag`                   |
| Gas                    | Gas meter reading               | m³   | 0        | 0 – 500           | `gas`                                 |
| Chemicaliën Chloor     | Chlorine stock                  | L    | 0        | n/a               | threshold `actie_chloor_min` = 200    |
| Chemicaliën Zwavelzuur | Sulphuric-acid stock            | L    | 0        | n/a               | threshold `actie_zwavelzuur_min` = 50 |

### A.4 Waterbeheer — Verbruik Peuterbad

| Field                  | Definition                   | Unit | Decimals | Default min – max | Notes                                          |
| ---------------------- | ---------------------------- | ---- | -------- | ----------------- | ---------------------------------------------- |
| Water                  | Water meter reading, toddler | m³   | 0        | 0 – 99999         | `water_peuterbad`                              |
| Chemicaliën Chloor     | Chlorine vessel level        | —    | 0        | n/a               | threshold `actie_chloor_peuterbad_min` = 10    |
| Chemicaliën Zwavelzuur | Sulphuric-acid vessel level  | —    | 0        | n/a               | threshold `actie_zwavelzuur_peuterbad_min` = 5 |

### A.5 Waterbeheer — Verwarmingssysteem (checkboxes)

Each is a boolean on/off checkbox (no unit, no decimals, no range): `verwarming_status_1`,
`verwarming_status_2`, `verwarming_status_3`, `verwarming_status_4`,
`verwarming_druk_ok` (pressure OK), `verwarming_visuele_controle` (visual check done).

### A.6 Coördinatoren — Metingen (per timeslot, per bath)

| Field            | Definition                                     | Unit | Decimals | Default min – max | Notes                                             |
| ---------------- | ---------------------------------------------- | ---- | -------- | ----------------- | ------------------------------------------------- |
| pH               | Acidity of the pool water                      | pH   | 2        | 6.80 – 7.60       | `ph_waarde` (shared)                              |
| Chloor Vrij      | Free chlorine                                  | mg/l | 2        | 0.50 – 1.50       | `chloor_vrij`                                     |
| Chloor Totaal    | Total chlorine                                 | mg/l | 2        | 0.30 – 3.50       | `chloor_totaal`                                   |
| Chloor Gebonden  | Combined chlorine = total − free (**derived**) | mg/l | 2        | 0.30 – 3.50       | read-only; `chloor_gebonden`                      |
| Watertemperatuur | Water temperature                              | °C   | 1        | 20.0 – 30.0       | `watertemperatuur`                                |
| Helderheid       | Water clarity (large baths)                    | text | —        | n/a               | free text / label                                 |
| Bad gebruikt     | Toddler pool used today                        | bool | —        | n/a               | checkbox (Peuterbad); drives `peuterbad_leeglaten` |

### A.7 Coördinatoren — Daggegevens

| Field                      | Definition                              | Unit  | Decimals | Default min – max | Notes                                   |
| -------------------------- | --------------------------------------- | ----- | -------- | ----------------- | --------------------------------------- |
| Luchttemperatuur           | Air temperature                         | °C    | 1        | n/a               | no configured limit                     |
| Bezoekers vandaag          | Visitors today                          | count | 0        | n/a               | threshold `actie_bezoekers_max` = 750   |
| Bezoekers sinds spoelbeurt | Cumulative visitors since last backwash | count | 0        | n/a               | threshold `actie_spoelbeurt_max` = 1500 |

### A.8 Coördinatoren — Checklist (checkboxes)

Boolean test-run flags (no unit/decimals/range): `proef_waterspeel`, `proef_spraypark`,
`proef_douches`, `proef_glijbaan`.

### A.9 Limieten — Action thresholds (Administrator inputs)

Single configured value per row (the threshold; `max_waarde`). An action is generated
when the measured value crosses it (ACT-001 / §3.5.1). Stored with up to 2 decimals
(`DECIMAL(10,2)`).

| Field (UI label)                 | Definition                                    | Unit  | Decimals | Default (threshold) | Key                              |
| -------------------------------- | --------------------------------------------- | ----- | -------- | ------------------- | -------------------------------- |
| Filterdruk verschil max          | Max in−out pressure difference (Diep/Ondiep)  | bar   | 2        | 0.40                | `actie_druk_verschil`            |
| Filterdruk Peuterbad max         | Max filter pressure (Peuterbad)               | bar   | 2        | 1.00                | `actie_druk_peuterbad`           |
| Flow Diep min                    | Minimum flow, deep                            | m³/h  | 0        | 250                 | `actie_flow_diep`                |
| Flow Ondiep min                  | Minimum flow, shallow                         | m³/h  | 0        | 75                  | `actie_flow_ondiep`              |
| Flow Peuterbad min               | Minimum flow, toddler                         | m³/h  | 0        | 4                   | `actie_flow_peuterbad`           |
| Chloorvoorraad min               | Minimum chlorine stock before reorder         | L     | 0        | 200                 | `actie_chloor_min`               |
| Zwavelzuurvoorraad min           | Minimum sulphuric-acid stock                  | L     | 0        | 50                  | `actie_zwavelzuur_min`           |
| Bezoekers max (per dag)          | Max daily visitors before backwash            | count | 0        | 750                 | `actie_bezoekers_max`            |
| Bezoekers max (sinds spoelbeurt) | Max cumulative visitors since backwash        | count | 0        | 1500                | `actie_spoelbeurt_max`           |
| Dagen max (sinds spoelbeurt)     | Max days since last backwash                  | days  | 0        | 7                   | `actie_spoelbeurt_dagen`         |
| Flocculant min                    | Minimum flocculant before top-up              | —     | 0        | 10                  | `actie_Flocculant_min`            |
| Gebonden chloor max              | Max combined chlorine                         | mg/l  | 2        | 1.00                | `actie_gebonden_chloor_max`      |
| Chloor Peuterbad min (vat)       | Minimum chlorine vessel level (toddler)       | —     | 0        | 10                  | `actie_chloor_peuterbad_min`     |
| Zwavelzuur Peuterbad min (vat)   | Minimum sulphuric-acid vessel level (toddler) | —     | 0        | 5                   | `actie_zwavelzuur_peuterbad_min` |

### A.10 Limieten — Seizoen (season window)

| Field         | Definition        | Type | Default    | Notes                                         |
| ------------- | ----------------- | ---- | ---------- | --------------------------------------------- |
| Begin seizoen | Season start date | date | 2026-04-25 | stored as `YYYYMMDD` integer; bounds date nav |
| Eind seizoen  | Season end date   | date | 2026-09-01 | stored as `YYYYMMDD` integer                  |

### A.11 Configuratie (Administrator settings)

| Field           | Definition                    | Unit    | Decimals | Valid range | Notes                                          |
| --------------- | ----------------------------- | ------- | -------- | ----------- | ---------------------------------------------- |
| Sessie-time-out | Idle/sliding session lifetime | minutes | 0        | 1 – 1440    | `sessie_timeout_minuten`; validated in service |

### A.12 Gebruikers (account fields)

| Field      | Definition          | Type   | Max length | Notes                                   |
| ---------- | ------------------- | ------ | ---------- | --------------------------------------- |
| Voornaam   | First name          | text   | 50         |                                         |
| Achternaam | Surname             | text   | 50         |                                         |
| Inlognaam  | Login name (unique) | text   | 50         | must be unique                          |
| Wachtwoord | Password            | text   | —          | hashed at rest (bcrypt); never returned |
| Rollen     | Assigned role(s)    | select | —          | one or more roles                       |

### A.13 Free-text & duty inputs

Free-text logboek entries are **hard-capped at 500 characters**, enforced on both
layers: the textarea `maxlength` (with a live counter, `logboek.js`) and the
server-side validator (`Validator::LOGBOEK_MAX_TEKEN`, shared by the Waterbeheer and
Coördinator logs); over-length input is rejected with **400**. The column itself is `TEXT`
(65,535-byte ceiling), so the 500-character app cap is the binding limit. A logboek
row is keyed by `(datum, tijdstip)`, so there is a new entry per timestamp.

| Field                       | Definition                               | Type   | Max length           | Notes                                                    |
| --------------------------- | ---------------------------------------- | ------ | -------------------- | -------------------------------------------------------- |
| Logboek tekst (Waterbeheer) | Free-text day note, water management     | `TEXT` | 500 chars (hard cap) | client `maxlength` + server validator; one row/timestamp |
| Logboek tekst (Coördinator) | Free-text day note, coordinator          | `TEXT` | 500 chars (hard cap) | client `maxlength` + server validator; one row/timestamp |
| Dienst 1 / Dienst 2         | The two persons on water-management duty | text   | 100 chars            | `VARCHAR(100)`; one logs in, one typed/picked            |

---

_End of Document_
