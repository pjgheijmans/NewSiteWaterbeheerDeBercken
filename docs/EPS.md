# Element Performance Specification (EPS)

**Document ID:** EPS-DDZ-0.2
**Element:** Digitale Dagstaat Zwembad — full web application
**Version:** 0.2
**Status:** DRAFT
**Date:** 2026-06-03
**Author:** P. Heijmans
**Approver:**

> **Scope note on element decomposition.** This EPS treats the application as a
> single element. Requirements are user- and system-facing and grouped by
> **functional block** (§3): the actors, then authentication, cross-cutting
> behaviour, and the capabilities of each user role. The frontend/backend split is
> a *design* concern handled in the companion EDS (§6 Client-side / §7
> Server-side); splitting the EPS would duplicate requirements without adding
> clarity at this size.

-----

## Revision History

|Version|Date      |Author     |Description  |
|-------|----------|-----------|-------------|
|0.1    |2026-06-03|P. Heijmans|Initial draft (flat requirement list)|
|0.2    |2026-06-03|P. Heijmans|Requirements regrouped by actor / functional block; block-prefixed IDs|

-----

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and performance requirements for the
**Digitale Dagstaat Zwembad** ("Digital Daily Log — Swimming Pool"): a web
application with which the operating staff of a public swimming pool record,
monitor and analyse daily water-quality and facility data, and through which the
system raises and tracks corrective **actions** when measured values fall outside
configured limits.

It defines *what* the application must do and how well it must do it. *How* those
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
- User-account management.

**Out of scope**

- Direct integration with pool sensors / PLC / SCADA (all data is entered
  manually or imported by CSV).
- Public/customer-facing access; the system is for internal staff only.
- Financial, payroll, ticketing or access-control functionality.
- Mobile native apps (the UI is browser-based).
- Automated regulatory reporting to authorities.

### 1.3 Definitions & Acronyms

|Term|Definition|
|----|----------|
|API|Application Programming Interface|
|UI|User Interface|
|Dagstaat|Daily log sheet — the day's complete record of pool data|
|Waterbeheerder|Water manager — staff role responsible for technical water management|
|Coördinator|Coordinator — staff role performing periodic measurement rounds|
|Administrator|Privileged role with user- and database-management rights|
|Diep / Ondiep|Deep pool / Shallow pool (the two "large" baths)|
|Peuterbad|Toddler pool|
|Meting|A measurement record|
|Verbruik|Consumption (water, electricity, gas, chemicals)|
|Actie|A corrective action / alarm generated from a threshold breach|
|Spoelen / Spoelbeurt|(Filter) backwash / backwash cycle|
|Gebonden chloor|Combined chlorine = total chlorine − free chlorine|
|Floculant|Flocculant dosing agent|
|Limiet|A configured min/max or threshold value|
|Seizoen|Season — the operating window (begin/end date) of the pool|

### 1.4 Reference Documents

|ID|Title|Version|
|--|-----|-------|
|EDS-DDZ|Element Design Specification — Digitale Dagstaat Zwembad|(to follow)|
|—|`docs/architecture.md` and `docs/architecture/*` (backend, frontend, flows, database, testing)|current|
|—|`CLAUDE.md` — project conventions|current|

-----

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
                │  Application server (Express / TypeScript)    │
                │   auth · validation · controllers · services  │
                └───────────────────────┬─────────────────────┘
                                        │ SQL (mysql2)
                                ┌────────▼────────┐
                                │   MySQL 8 DB     │
                                └─────────────────┘
   CSV files  ⇄  (manual export/import via Database Beheer)
   Chart.js   →  (client-side charting library)
```

-----

## 3. Functional Requirements

Requirements are grouped by functional block. Each block has a short prefix:

|Prefix|Block|Applies to|
|------|-----|----------|
|AUTH|Authentication & session|All users|
|GEN|Common / cross-cutting data behaviour|All data-entry users|
|WB|Water-management daily log|Waterbeheerder (+ Administrator)|
|CO|Coordinator rounds|Coördinator (+ Administrator)|
|ACT|Corrective actions|Generated by the system; surfaced to Waterbeheerder|
|LIM|Limits & thresholds|Administrator / per role policy|
|ADM|Administration (users & database)|Administrator|
|TRD|Trend analysis|Per role policy|

Priority uses MoSCoW (Must / Should / Could). "Impl." = met by the current build
(Yes / Partial / No).

### 3.0 Actors / User Roles

|Actor|Description|Primary responsibilities|Access (blocks)|
|-----|-----------|------------------------|---------------|
|Unauthenticated user|Anyone reaching the app without a valid session|Log in|AUTH (login only)|
|**Waterbeheerder**|Technical water manager|Daily water measurements, consumption, heating checks, log; handle corrective actions|AUTH, GEN, WB, ACT, TRD\*|
|**Coördinator**|Pool coordinator on shift|Timed measurement rounds, checklist, daily data (air temp, visitors), log|AUTH, GEN, CO, TRD\*|
|**Administrator**|System administrator|Everything above, plus user management, limit management and database management|All blocks|

\* Access of Waterbeheerder/Coördinator to **LIM** (limits) and **TRD** (trends) is
governed by role policy and is an **open item to confirm** (see §9, R-006). The
table reflects the intended policy.

### 3.1 Authentication & Session (AUTH)

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|AUTH-001|A user shall authenticate with a login name and password.|Must|Yes|
|AUTH-002|On successful login the system shall establish a server-side session and keep the user signed in across requests until logout/expiry.|Must|Yes|
|AUTH-003|The system shall restrict navigation and operations according to the user's role (Waterbeheerder / Coördinator / Administrator).|Must|Yes|
|AUTH-004|A user shall be able to log out, ending the session.|Must|Yes|
|AUTH-005|User credentials shall be stored securely (hashed, non-reversible).|Should|**No — see §7.2 / R-002**|

### 3.2 Common / Cross-cutting (GEN)

Applies to all data-entry screens (Waterbeheer and Coördinatoren).

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|GEN-001|The user shall select an active operating date; all data entry and display is scoped to that date.|Must|Yes|
|GEN-002|Date navigation shall be constrained to within the configured season window (begin/end).|Should|Yes|
|GEN-003|Edits shall autosave after a short debounce, with a visible save status (pending / saving / saved / warning / error).|Must|Yes|
|GEN-004|Numeric entry shall be validated against the configured limits with inline visual feedback, and the locale decimal comma shall be normalised to a point.|Should|Yes|
|GEN-005|Each day's data shall be persisted idempotently (insert-or-update keyed by date / block).|Must|Yes|
|GEN-006|Saved measurements, log entries and resolved actions shall record their author.|Could|Partial|

### 3.3 Water-management daily log (WB)

Actor: Waterbeheerder (and Administrator).

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|WB-001|Record daily measurements for Diep and Ondiep: pH, chlorine, temperature, flow, filter pressure in/out.|Must|Yes|
|WB-002|Record daily measurements for Peuterbad: pH, chlorine, filter pressure, flow.|Must|Yes|
|WB-003|Record daily consumption for Diep/Ondiep: water (deep/shallow/total), electricity (night/day), gas, flocculant, chemicals (chlorine/sulphuric acid).|Must|Yes|
|WB-004|Record daily consumption for Peuterbad: water and chemicals (chlorine/sulphuric acid).|Must|Yes|
|WB-005|Display the daily consumption (today − previous day) for each consumption meter, for Diep/Ondiep and Peuterbad.|Should|Yes|
|WB-006|Record heating-system status and inspection flags per day.|Should|Yes|
|WB-007|Display visitor figures for the day, including cumulative visitors since the last backwash.|Should|Yes|
|WB-008|Record, list and delete free-text, timestamped log entries for the Waterbeheer log per day.|Should|Yes|

### 3.4 Coordinator rounds (CO)

Actor: Coördinator (and Administrator).

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|CO-001|Record coordinator measurement blocks per timeslot, per bath: pH, free/total chlorine (combined chlorine derived), water temperature, clarity (large baths) or "pool used" (Peuterbad); add and delete blocks.|Must|Yes|
|CO-002|Record the daily checklist (test-run flags).|Must|Yes|
|CO-003|Record daily data: air temperature, visitors today, visitors since last backwash.|Must|Yes|
|CO-004|Record, list and delete free-text, timestamped log entries for the Coördinator log per day.|Should|Yes|

### 3.5 Corrective actions (ACT)

Generated by the system from saved data; surfaced primarily to the Waterbeheerder.

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|ACT-001|Automatically generate corrective actions when saved data crosses a configured threshold (rules in §3.5.1).|Must|Yes|
|ACT-002|Group all "filter backwash" reasons for one bath into a single action that carries every reason and is resolved together.|Should|Yes|
|ACT-003|Mark an action resolved and reopen it again, recording who resolved it and when.|Must|Yes|
|ACT-004|Indicate open/resolved actions visually on the related input fields and on the relevant tab/navigation badges.|Should|Yes|
|ACT-005|Regenerate the affected actions when the underlying data is saved or a coordinator block is deleted.|Must|Yes|

#### 3.5.1 Action generation rules (detail of ACT-001)

|Action type|Trigger condition|Bath(s)|Result shown|
|-----------|-----------------|-------|------------|
|`filter_spoelen_druk`|Filter pressure difference (in−out) > threshold (Diep/Ondiep); pressure > threshold (Peuterbad)|Diep, Ondiep, Peuterbad|Filter spoelen|
|`filter_spoelen_flow`|Flow below per-bath minimum (Diep 250 / Ondiep 75 / Peuterbad 4 default)|Diep, Ondiep, Peuterbad|Filter spoelen|
|`filter_spoelen_bezoekers`|Visitors today above daily maximum|Diep, Ondiep|Filter spoelen|
|`filter_spoelen_spoelbeurt`|Cumulative visitors since that bath's last resolved backwash above maximum (counter is independent per bath)|Diep, Ondiep|Filter spoelen|
|`filter_spoelen_gebonden`|Combined chlorine (total − free) above maximum, aggregated over the day per bath|Diep, Ondiep, Peuterbad|Filter spoelen|
|`chloor_bestellen` / `zwavelzuur_bestellen`|Chemical stock below minimum|(general)|Order chlorine / sulphuric acid|
|`floculant_bijvullen`|Flocculant below minimum|(general)|Top up flocculant|
|`chloor_peuterbad_bijvullen` / `zwavelzuur_peuterbad_bijvullen`|Peuterbad chemical below minimum|Peuterbad|Top up vessel|
|`peuterbad_aftappen`|Peuterbad marked "used" in any coordinator block that day|Peuterbad|Drain toddler-pool water|

All thresholds are configurable via LIM-001. Generation is fire-and-forget relative
to the triggering save (no transactional guarantee between save and action).

### 3.6 Limits & thresholds (LIM)

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|LIM-001|Manage the central limit values (min/max per parameter) and the action thresholds, and the season window.|Must|Yes|
|LIM-002|Restore the standard default limit/threshold values on request.|Should|Yes|

### 3.7 Administration (ADM)

Actor: Administrator.

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|ADM-001|Manage user accounts: create, list, update and delete (voornaam, achternaam, login name, password, role).|Must|Yes|
|ADM-002|Export any data table to CSV (semicolon-delimited, EU-Excel compatible).|Should|Yes|
|ADM-003|Import a CSV into a data table.|Could|Yes|
|ADM-004|Clear an individual table, and delete/recreate the full database with default seed data, behind explicit double confirmation (and forced logout after a full reset).|Should|Yes|

### 3.8 Trend analysis (TRD)

|ID|Requirement|Priority|Impl.|
|--|-----------|--------|-----|
|TRD-001|Display historical trend charts for measurements and consumption over a user-chosen date range, for both bath groups.|Should|Yes|

### 3.9 User Interface — Screens & Views

|ID|Screen / View|Block|Roles|
|--|-------------|-----|-----|
|UI-001|Login|AUTH|All (unauthenticated)|
|UI-002|Waterbeheer → Diep/Ondiep|WB|Waterbeheerder, Administrator|
|UI-003|Waterbeheer → Peuterbad|WB|Waterbeheerder, Administrator|
|UI-004|Waterbeheer → Logboek|WB|Waterbeheerder, Administrator|
|UI-005|Waterbeheer → Acties|ACT|Waterbeheerder, Administrator|
|UI-006|Coördinatoren → Metingen|CO|Coördinator, Administrator|
|UI-007|Coördinatoren → Checklist|CO|Coördinator, Administrator|
|UI-008|Coördinatoren → Daggegevens|CO|Coördinator, Administrator|
|UI-009|Coördinatoren → Logboek|CO|Coördinator, Administrator|
|UI-010|Limieten|LIM|Per role policy (R-006)|
|UI-011|Gebruikers Beheer|ADM|Administrator|
|UI-012|Database Beheer|ADM|Administrator|
|UI-013|Trendanalyse|TRD|Per role policy (R-006)|

### 3.10 Key User Workflows

**W1 — Record the daily water log (Waterbeheerder).** Log in → Waterbeheer →
Diep/Ondiep → enter measurements (validated inline) → autosave confirms → Verbruik
subtab shows per-meter daily consumption → threshold breaches surface as actions →
repeat for Peuterbad. *(GEN-001/003/004, WB-001..008, ACT-001/004)*

**W2 — Coordinator round (Coördinator).** Log in → Coördinatoren → Metingen → add a
block for the current time → enter per-bath values (combined chlorine shown) →
saving evaluates combined-chlorine and "toddler pool used" rules → enter daily data
and checklist. *(CO-001..003, ACT-001/005)*

**W3 — Resolve an action (Waterbeheerder).** Waterbeheer → Acties → review open
actions grouped per bath with all reasons → perform work → tick to resolve (name +
time recorded); untick to reopen. *(ACT-002/003)*

**W4 — Adjust limits (Administrator).** Limieten → edit min/max, thresholds or
season dates → autosave; "restore defaults" repopulates. *(LIM-001/002)*

**W5 — Review trends.** Trendanalyse → choose from/to range and tab → charts render
per parameter for both bath groups. *(TRD-001)*

**W6 — Administer data (Administrator).** Database Beheer → export/import CSV per
table, clear a table, or reset the database (double confirmation). *(ADM-002..004)*

### 3.11 Navigation Model

- A top-level **role navigation bar** (Waterbeheer, Coördinatoren, Limieten,
  Gebruikers Beheer, Database Beheer, Trendanalyse); items shown/enabled per role.
- Within Waterbeheer and Coördinatoren, **tabs and subtabs** group the data areas.
- A single **central date selector** sets the active day for all dagstaat data.
- The Acties tab and the Waterbeheer nav item carry **badges** for open-action
  counts.

### 3.12 Modes of Operation

|Mode|Description|Entry Condition|Exit Condition|
|----|-----------|---------------|--------------|
|Unauthenticated|Only the login screen is available|App opened, no valid session|Successful login|
|Waterbeheer|WB + ACT + TRD blocks|Login as Waterbeheerder (or Administrator)|Logout / role switch|
|Coördinator|CO + TRD blocks|Login as Coördinator (or Administrator)|Logout / role switch|
|Administrator|All blocks incl. ADM, LIM|Login as Administrator|Logout|

### 3.13 Functional Constraints

- One dagstaat record exists per calendar day; saving a field updates that day's
  record (idempotent upsert).
- Numeric entry uses the locale comma on input, normalised to a point before
  transmission.
- Action generation is best-effort (fire-and-forget), not transactionally bound to
  the triggering save.
- The cumulative "visitors since backwash" counter resets per bath at that bath's
  most recent resolved backwash action.
- All UI text and stored domain labels are in Dutch.

-----

## 4. Performance Requirements

> Targets reflect a small, internal, single-site tool used by a handful of staff.
> Values marked *(assumption)* are proposed pending stakeholder confirmation.

### 4.1 Key Performance Parameters (KPPs)

|ID|Parameter|Target|Threshold|Measurement Method|
|--|---------|------|---------|------------------|
|KPP-001|Autosave round-trip after edit (debounce + save)|< 1.5 s|< 3 s|Test/Demonstration|
|KPP-002|Action correctly raised/cleared after a threshold-crossing save|100% of saves|100%|Test|
|KPP-003|Consumption delta correctness (today − previous day)|Exact|Exact|Test|
|KPP-004|Data durability (saved day reloads identically)|No loss|No loss|Test/Integration|

### 4.2 UI Performance

|Metric|Target|Threshold|
|------|------|---------|
|Initial page load (LCP), LAN|< 2.5 s|< 4 s|
|Time to Interactive (TTI)|< 3 s|< 5 s|
|API response time (p95), LAN|< 300 ms|< 1 s|
|Tab/subtab switch (client-side)|< 200 ms|< 500 ms|
|Trend chart render (≤ 1 season range)|< 1.5 s|< 3 s|

### 4.3 Throughput & Capacity

|Metric|Value *(assumption)*|
|------|--------------------|
|Concurrent users (normal)|1–3|
|Concurrent users (peak)|≤ 5|
|Operating days retained (history)|Multiple seasons (years)|
|Max CSV import payload|≤ a few MB per table|

### 4.4 Accuracy & Precision

- Numeric values are stored at the precision of the underlying schema (decimals for
  measurements, integers for meter/chemical counts); consumption deltas round to
  whole units.
- Combined chlorine = total − free, shown to 2 decimals.
- Threshold comparisons use the current configured limits at save time.

### 4.5 Availability & Reliability

|Metric|Target *(assumption)*|
|------|---------------------|
|Availability during pool opening hours|≥ 99%|
|Container auto-restart on failure|Yes (Docker `restart: always`)|
|Recovery Point Objective (RPO)|Last successful autosave (per field, ~seconds)|
|Recovery Time Objective (RTO)|< 15 min (container restart / redeploy)|

> Backups: point-in-time recovery currently depends on manual CSV export and the
> Docker volume. A defined database backup schedule is recommended (see R-001).

-----

## 5. Interface Requirements

### 5.1 External Interfaces

|Interface|Type|Description|
|---------|----|-----------|
|Staff browser|Browser (HTTP/HTML/JS)|Primary user interface served by the app|
|Application REST API|REST / JSON|Client ↔ server data exchange under one origin|
|MySQL|Database (TCP)|Persistent storage via connection pool|
|Chart.js|Client JS library|Rendering of trend charts|
|CSV files|File (semicolon-delimited)|Manual export/import of table data|

### 5.2 Data Interfaces

|Interface|Protocol / Format|Direction|Description|
|---------|-----------------|---------|-----------|
|`/api/*`|JSON over HTTP(S)|In/Out|All application data operations; session cookie for auth|
|CSV export|`text/csv` (`;` delimiter)|Out|One file per table|
|CSV import|`text/csv` (`;` delimiter)|In|One file per table|

### 5.3 Physical / Infrastructure Interfaces

- Containerised with Docker Compose: web service on port 3000 (debugger 9229) and
  MySQL on 3306.
- Single-origin deployment (client and API same host); no public exposure assumed
  beyond the operator's network.

### 5.4 User Interface Standards

|Requirement|Value|
|-----------|-----|
|Language|Dutch (UI and domain labels)|
|Primary use context|On-site desktop/tablet during opening hours|
|Browser support|Current Chromium/Edge, Firefox (recent versions)|
|Accessibility|WCAG 2.1 AA — *target/Should; not yet verified*|
|Responsive behaviour|Functional on desktop and tablet; mobile is best-effort|

-----

## 6. Environmental Requirements

### 6.1 Deployment Environment

|Item|Value|
|----|-----|
|Hosting|Local / on-premises (operator network)|
|Operating System|Linux container host (Docker)|
|Runtime|Node.js (TypeScript via ts-node in dev; compiled to `dist/` in prod)|
|Database|MySQL 8|
|Container|Docker / Docker Compose|

### 6.2 Browser & Client Environment

- Modern evergreen browser with JavaScript enabled.
- Cookies enabled (session authentication).
- Network access to the application host on the LAN.

### 6.3 Network Requirements

- Designed for LAN/low-latency use; no offline mode (a live server connection is
  required to load and save).
- Bandwidth needs are modest (small JSON payloads; charts load a date-range
  dataset).

-----

## 7. Constraints & Standards

### 7.1 Applicable Standards

- WCAG 2.1 AA — accessibility *(target, not yet verified)*.
- OWASP Top 10 — security baseline for a web application.
- EU-Excel CSV convention — semicolon-delimited exports.

### 7.2 Regulatory / Compliance Requirements

- **Personal data:** limited to staff accounts (name, login, password, role).
  Visitor data is aggregate counts only — no customer PII.
- **GDPR:** staff-account data must be limited to what is necessary and accounts
  must be removable (supported via ADM-001).
- **Known security gaps to remediate** (tracked as risks, not yet met):
  - Passwords are stored in plain text (AUTH-005 not met; see R-002).
  - The session secret has a hardcoded default that must be overridden in
    production via `SESSION_SECRET` (see R-003).

### 7.3 Design Constraints

- Developed with Claude Code (AI-assisted development).
- Solo developer — complexity must remain manageable; conventions favour a small,
  readable codebase over heavy frameworks.
- Frontend is intentionally framework-free (vanilla ES6 classes, no bundler/build
  step); the backend is layered TypeScript with dependency injection.
- Schema changes are made in `init.sql` only (idempotent run on startup); there is
  no migrations tool.

-----

## 8. Verification & Acceptance

### 8.1 Verification Methods

Methods: Test (T) · Analysis (A) · Inspection (I) · Demonstration (D).

|Requirement(s)|Method|Notes|
|--------------|------|-----|
|AUTH-001..004|T|Auth middleware + integration tests|
|AUTH-005|I|Currently fails inspection — see R-002|
|GEN-001/002/005|T / D|Integration upsert tests; demonstrate date scoping & season bounds|
|GEN-003/004|T / D|jsdom save-flow tests; limit-validation behaviour|
|WB-001..004, WB-006/008|T / D|Repository + integration tests; demonstrate save & reload|
|WB-005|T|Pure-function and jsdom consumption-delta tests|
|WB-007, CO-001..004|T / D|Coordinator repo/integration tests; demonstrate blocks & daily data|
|ACT-001/005|T|Unit tests cover every action type, per-bath thresholds and the independent backwash counters|
|ACT-002|T|jsdom test covers per-bath grouping of backwash reasons|
|ACT-003/004|T / D|Resolve/reopen tests; demonstrate field markers & badges|
|LIM-001/002|T / D|Limit-repo tests + GROEPEN/LABELS consistency test|
|ADM-001..004|D / I|Demonstration; inspection of double-confirm guards|
|TRD-001|D|Demonstration over a sample range|
|KPP-001..004|T / A|Measured during representative use|
|End-to-end happy path (W1–W3)|D|Browser E2E smoke run — *pending (not yet executed)*|

### 8.2 Acceptance Criteria

- [ ] All Must-priority requirements (AUTH-001..004, GEN-001/003/005, WB-001..004,
      CO-001..003, ACT-001/003/005, LIM-001, ADM-001) verified.
- [ ] Action generation/resolution verified for every action type, including
      per-bath thresholds and independent backwash counters.
- [ ] Consumption deltas and combined-chlorine calculations verified correct.
- [ ] Saved data reloads identically across sessions (durability).
- [ ] UI performance targets met on the target LAN environment.
- [ ] All screens render and function on target desktop/tablet viewports.
- [ ] No critical or high OWASP vulnerabilities; AUTH-005 (password hashing) and the
      session-secret default (R-003) resolved before any non-isolated deployment.
- [ ] A defined database backup procedure is in place (R-001).

-----

## 9. Open Items / Risks (informative)

|ID|Item|Recommendation|
|--|----|--------------|
|R-001|No defined DB backup schedule (relies on Docker volume + manual CSV)|Define and automate periodic backups|
|R-002|Passwords stored in plain text (AUTH-005)|Hash passwords (e.g. bcrypt/argon2); migrate seed accounts|
|R-003|Hardcoded default session secret|Require `SESSION_SECRET` in production deployment|
|R-004|Browser E2E coverage absent|Add an automated end-to-end smoke test for W1–W3|
|R-005|Accessibility (WCAG AA) unverified|Audit and remediate if public-sector accessibility rules apply|
|R-006|Role access to Limieten (LIM) and Trendanalyse (TRD) not yet confirmed|Confirm which roles may view/edit limits and trends, then lock down|

-----

*End of Document*
