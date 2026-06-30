# Test Analysis Report (TAR) — TEMPLATE

**Document ID:** TAR-DDZ-&lt;n.n&gt;
**Element:** Digitale Dagstaat Zwembad — full web application
**Version:** &lt;n.n&gt;
**Status:** TEMPLATE _(set to DRAFT → RELEASED when filled for a milestone)_
**Date:** &lt;YYYY-MM-DD&gt;
**Author:** &lt;name&gt;
**Approver:** &lt;name&gt;
**Parent TPS:** TPS-DDZ-0.1
**Parent EPS / EDS:** EPS-DDZ-0.6 / EDS-DDZ-0.5

> A TAR records the **result of executing the TPS for one milestone** (e.g. a release
> or hand-over) — a dated snapshot. It is **not** a living document: the day-to-day
> evidence is CI (`php-tests.yml`, `frontend-tests.yml`). Copy this template, fill the
> `<…>` placeholders and the result tables, set the status, and commit it as
> `docs/TAR.md` (or `docs/tar/TAR-<milestone>.md` if keeping a history).
>
> **How to fill:** run the suites and the manual procedures from the TPS, paste the
> counts + the CI run URL into §3, record each `MP-n` outcome in §4, set the
> per-block status in §5, log any anomalies in §6, and write the verdict in §7.

---

## Revision History

| Version     | Date               | Author       | Description                         |
| ----------- | ------------------ | ------------ | ----------------------------------- |
| &lt;n.n&gt; | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;milestone / what was tested&gt; |

---

## 1. Item under test

| Field            | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Milestone        | &lt;e.g. go-live / acceptance v1.0&gt;                 |
| Git commit (SHA) | &lt;commit&gt;                                         |
| Branch / tag     | &lt;e.g. master / v1.0&gt;                             |
| CI run           | &lt;URL of the green Actions run for this commit&gt;   |
| Backend          | PHP 8.0 (Slim 4 + PHP-DI)                              |
| Environment      | &lt;dev container / staging / shared host&gt;; MySQL 8 |
| Tester(s)        | &lt;name(s)&gt;                                        |
| Test period      | &lt;start&gt; – &lt;end&gt;                            |

---

## 2. Execution summary

| Aspect                 | Result                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Automated suites (CI)  | &lt;PASS / FAIL&gt; — see §3                                           |
| Manual procedures (§4) | &lt;n&gt; of 9 executed; &lt;n&gt; pass / &lt;n&gt; fail               |
| Requirements verified  | &lt;n&gt; of &lt;total&gt; blocks fully verified — see §5              |
| Open anomalies         | &lt;n&gt; (&lt;n&gt; high / &lt;n&gt; medium / &lt;n&gt; low) — see §6 |
| **Overall conclusion** | **&lt;ACCEPTED / ACCEPTED WITH RESERVATIONS / REJECTED&gt;**           |

---

## 3. Automated test results

Paste the counts from the CI run (or a local run of `composer test`,
`composer test:integration`, `npm test`). Reference counts come from the TPS/EDS;
update them to the actual numbers for this milestone.

| Suite                         | Command                     | Tests       | Pass       | Fail       | Skipped    |
| ----------------------------- | --------------------------- | ----------- | ---------- | ---------- | ---------- |
| Backend unit (PHPUnit)        | `composer test`             | &lt;87&gt;  | &lt;..&gt; | &lt;..&gt; | &lt;..&gt; |
| Backend integration (PHPUnit) | `composer test:integration` | &lt;18&gt;  | &lt;..&gt; | &lt;..&gt; | &lt;..&gt; |
| Frontend (Jest + jsdom)       | `npm test`                  | &lt;102&gt; | &lt;..&gt; | &lt;..&gt; | &lt;..&gt; |
| **Total**                     |                             | &lt;..&gt;  | &lt;..&gt; | &lt;..&gt; | &lt;..&gt; |

- ESLint (`npm run lint`): &lt;0 errors / N warnings&gt;
- Any failing automated test → log it in §6 with the assertion/output.

---

## 4. Manual / demonstration results

One row per TPS procedure (`MP-1..MP-9`, see TPS §4). Result: PASS / FAIL / N/A.

| MP   | Procedure (TPS §4)                    | Date               | Tester       | Result     | Notes / evidence |
| ---- | ------------------------------------- | ------------------ | ------------ | ---------- | ---------------- |
| MP-1 | Daily water log happy path (W1) + 409 | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-2 | Coordinator round (W2)                | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-3 | Resolve an action (W3)                | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-4 | Adjust limits (W4)                    | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-5 | Deployment smoke test (shared host)   | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-6 | CSV export / import                   | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-7 | Role-based access matrix              | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-8 | Full database reset                   | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |
| MP-9 | Session idle time-out                 | &lt;YYYY-MM-DD&gt; | &lt;name&gt; | &lt;..&gt; |                  |

---

## 5. Requirements verification status

Per EPS block (test cases from TPS §3/§5). Status: Verified / Partial / Failed / Not tested.

| EPS block | Test case(s)                          | Status     | Notes |
| --------- | ------------------------------------- | ---------- | ----- |
| AUTH      | TC-AUTH-01..04, TC-RBAC-05, TC-ROL-01 | &lt;..&gt; |       |
| CFG       | TC-AUTH-04                            | &lt;..&gt; |       |
| GEN       | TC-GEN-01..05, TC-HIST-06             | &lt;..&gt; |       |
| WB        | TC-WB-01..05                          | &lt;..&gt; |       |
| CO        | TC-CO-01                              | &lt;..&gt; |       |
| ACT       | TC-ACT-01..04                         | &lt;..&gt; |       |
| LIM       | TC-LIM-01                             | &lt;..&gt; |       |
| ADM       | TC-ADM-01..03                         | &lt;..&gt; |       |
| TRD       | TC-TRD-01                             | &lt;..&gt; |       |
| KPP       | TC-KPP-01..04                         | &lt;..&gt; |       |

---

## 6. Anomalies & defects

Log every failure or deviation found during this run. Link to a tracker issue where
possible.

| ID    | Severity (High/Med/Low) | Requirement / TC | Description | Status (Open/Fixed/Waived) | Issue              |
| ----- | ----------------------- | ---------------- | ----------- | -------------------------- | ------------------ |
| A-001 | &lt;..&gt;              | &lt;..&gt;       | &lt;..&gt;  | &lt;..&gt;                 | &lt;#nr / link&gt; |

_(Add rows as needed; delete the example row if there are no anomalies.)_

---

## 7. Acceptance conclusion & sign-off

- **Verdict:** &lt;ACCEPTED / ACCEPTED WITH RESERVATIONS / REJECTED&gt;
- **Reservations / open items:** &lt;list, referencing A-… and any EPS risks (e.g. R-004 E2E not automated)&gt;
- **Deviations from the TPS:** &lt;none / describe&gt;

| Role     | Name         | Date               | Signature |
| -------- | ------------ | ------------------ | --------- |
| Tester   | &lt;name&gt; | &lt;YYYY-MM-DD&gt; |           |
| Approver | &lt;name&gt; | &lt;YYYY-MM-DD&gt; |           |

---

_End of Document (template)_
