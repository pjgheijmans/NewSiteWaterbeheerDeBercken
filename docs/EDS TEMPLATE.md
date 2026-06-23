# Element Design Specification (EDS)

**Document ID:** EDS-[ELEMENT-ID]-[VERSION]  
**Version:** 0.1  
**Status:** DRAFT  
**Date:** YYYY-MM-DD  
**Author:**  
**Approver:**  
**Parent EPS:** EPS-[ELEMENT-ID]-[VERSION]

---

## Revision History

| Version | Date       | Author | Description   |
| ------- | ---------- | ------ | ------------- |
| 0.1     | YYYY-MM-DD |        | Initial draft |

---

## 1. Introduction

### 1.1 Purpose

_Describe the purpose of this document — to record the design decisions made to satisfy the requirements in the parent EPS._

### 1.2 Scope

_Define what design aspects are covered here._

### 1.3 Definitions & Acronyms

| Term | Definition               |
| ---- | ------------------------ |
| SPA  | Single Page Application  |
| SSR  | Server Side Rendering    |
| ORM  | Object Relational Mapper |
|      |                          |

### 1.4 Reference Documents

| ID  | Title      | Version |
| --- | ---------- | ------- |
|     | Parent EPS |         |
|     |            |         |

---

## 2. Design Overview

### 2.1 Design Philosophy & Approach

_Summarise the key principles guiding this design (e.g. simplicity, maintainability, convention over configuration, AI-assisted development compatibility)._

-
-
-

### 2.2 Key Design Decisions Summary

| ID     | Decision | Section |
| ------ | -------- | ------- |
| DD-001 |          | §3      |
| DD-002 |          | §3      |

### 2.3 Architecture Overview

_High-level diagram or description of the overall system architecture._

```
┌─────────────────────────────────────────────────┐
│                   Browser Client                 │
│  [UI Layer]  →  [State]  →  [API Client]        │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS / REST
┌──────────────────────▼──────────────────────────┐
│                   API Server                     │
│  [Router]  →  [Controllers]  →  [Services]      │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
    [Database]              [External Services]
```

---

## 3. Design Decisions

### 3.1 Decision Log

| ID     | Decision | Rationale | Alternatives Considered | Trade-offs | Date |
| ------ | -------- | --------- | ----------------------- | ---------- | ---- |
| DD-001 |          |           |                         |            |      |
| DD-002 |          |           |                         |            |      |

### 3.2 Decision Narratives

#### DD-001: [Decision Title]

**Decision:** _What was decided._  
**Rationale:** _Why this was chosen._  
**Alternatives Considered:**

- Option A — _description, reason rejected_
- Option B — _description, reason rejected_

**Trade-offs:** _What is given up by making this choice._  
**Date:** YYYY-MM-DD

---

#### DD-002: [Decision Title]

**Decision:**  
**Rationale:**  
**Alternatives Considered:**  
**Trade-offs:**  
**Date:**

---

## 4. UI/UX Design

### 4.1 UI Architecture

| Item              | Choice                                          | Rationale |
| ----------------- | ----------------------------------------------- | --------- |
| Rendering model   | e.g. SPA / SSR / MPA                            |           |
| UI framework      | e.g. React / Vue / Vanilla                      |           |
| Component library | e.g. shadcn/ui / Tailwind / custom              |           |
| CSS approach      | e.g. Tailwind / CSS Modules / styled-components |           |

### 4.2 Design System & Component Library

_Describe the design tokens, reusable components, and visual language._

- Colour palette:
- Typography:
- Spacing scale:
- Component library:

### 4.3 Screen Designs

#### [Screen Name]

## **Route:** `/path`

**Purpose:**  
**Key Elements:**

- **Wireframe / Layout Description:**

```
┌─────────────────────────┐
│ Header / Nav            │
├─────────────────────────┤
│                         │
│  Main Content           │
│                         │
├─────────────────────────┤
│ Footer                  │
└─────────────────────────┘
```

### 4.4 Routing Approach

_Describe client-side routing strategy, route structure, protected routes, redirects._

| Route        | Component | Auth Required | Notes |
| ------------ | --------- | ------------- | ----- |
| `/`          |           | No            |       |
| `/dashboard` |           | Yes           |       |

### 4.5 State Management

_Describe how application state is managed — local component state, context, store, server state / caching._

| State Type  | Approach | Rationale |
| ----------- | -------- | --------- |
| Server data |          |           |
| UI state    |          |           |
| Form state  |          |           |
| Auth state  |          |           |

### 4.6 Responsive & Adaptive Strategy

_How the UI adapts to different viewports._

| Breakpoint | Width          | Layout Behaviour |
| ---------- | -------------- | ---------------- |
| Mobile     | < 768px        |                  |
| Tablet     | 768px – 1024px |                  |
| Desktop    | > 1024px       |                  |

---

## 5. Interface Design

### 5.1 API Design

| Item                | Choice                     | Notes |
| ------------------- | -------------------------- | ----- |
| Style               | REST / GraphQL / tRPC      |       |
| Base path           | `/api/v1`                  |       |
| Auth mechanism      | e.g. JWT / Session / OAuth |       |
| Versioning strategy |                            |       |
| Error format        |                            |       |

#### Key Endpoints

| Method | Path       | Description | Auth |
| ------ | ---------- | ----------- | ---- |
| GET    | `/api/v1/` |             |      |
| POST   | `/api/v1/` |             |      |

### 5.2 Authentication & Session Model

_Describe how users authenticate, how sessions are maintained, token storage, refresh strategy, logout._

### 5.3 Internal Interfaces

_How client and server modules communicate internally._

### 5.4 Data Structures & Formats

_Key request/response schemas, database models, shared types._

```typescript
// Example: User model
interface User {
    id: string;
    email: string;
    createdAt: Date;
}
```

---

## 6. Client-side Architecture

### 6.1 Framework & Build Toolchain

| Item            | Choice                        | Version | Rationale |
| --------------- | ----------------------------- | ------- | --------- |
| Framework       |                               |         |           |
| Build tool      | e.g. Vite / Next.js / Webpack |         |           |
| Package manager | e.g. npm / pnpm               |         |           |
| TypeScript      | Yes / No                      |         |           |

### 6.2 Module & Directory Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # Base design system components
│   └── features/     # Feature-specific components
├── pages/ (or app/)  # Route-level components
├── hooks/            # Custom React hooks
├── lib/              # Utilities, API client, helpers
├── store/            # State management
└── types/            # TypeScript type definitions
```

### 6.3 Data Fetching Strategy

_How the client fetches and caches server data (e.g. React Query, SWR, fetch, polling, websockets)._

---

## 7. Server-side Architecture

### 7.1 Runtime & Framework

| Item      | Choice                        | Version | Rationale |
| --------- | ----------------------------- | ------- | --------- |
| Runtime   | e.g. Node.js                  |         |           |
| Framework | e.g. Express / Fastify / Hono |         |           |
| Language  | e.g. TypeScript               |         |           |

### 7.2 Module & Directory Structure

```
server/
├── routes/           # Route definitions
├── controllers/      # Request handlers
├── services/         # Business logic
├── models/           # Data models / ORM schemas
├── middleware/       # Auth, logging, error handling
└── lib/              # Utilities, DB client, helpers
```

### 7.3 Database Design

| Item                | Choice                       | Rationale |
| ------------------- | ---------------------------- | --------- |
| Database            | e.g. PostgreSQL / SQLite     |           |
| ORM / Query builder | e.g. Drizzle / Prisma / Knex |           |
| Migration strategy  |                              |           |

#### Key Schema

```sql
-- Example
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 Middleware Stack

_List middleware applied to all or key routes (auth, logging, CORS, rate limiting, validation, error handling)._

### 7.5 Error Handling Strategy

_How errors are caught, logged, and returned to the client._

---

## 8. Deployment Architecture

### 8.1 Hosting & Infrastructure

| Item          | Choice                              | Notes |
| ------------- | ----------------------------------- | ----- |
| Hosting       | e.g. Local / VPS / Vercel / Railway |       |
| Container     | e.g. Docker / None                  |       |
| Reverse proxy | e.g. Nginx / Caddy                  |       |
| TLS/HTTPS     |                                     |       |
| Domain / DNS  |                                     |       |

### 8.2 Environment Configuration

_How environment-specific config is managed (env vars, secrets, config files)._

| Variable       | Purpose              | Example |
| -------------- | -------------------- | ------- |
| `DATABASE_URL` | DB connection string |         |
| `JWT_SECRET`   | Auth token signing   |         |

### 8.3 CI/CD Pipeline

_Build, test, and deploy process._

---

## 9. Development Context

### 9.1 AI-Assisted Development

_Notes on how Claude Code is used in this project and any conventions to follow._

- This project is developed with Claude Code assistance
- Claude Code should follow the conventions defined in this document
-

### 9.2 Coding Conventions

| Item             | Convention                |
| ---------------- | ------------------------- |
| File naming      | e.g. kebab-case           |
| Component naming | e.g. PascalCase           |
| Variable naming  | e.g. camelCase            |
| Commit messages  | e.g. Conventional Commits |
| Code formatting  | e.g. Prettier / ESLint    |

### 9.3 Testing Approach

| Test Type   | Tool | Coverage Target |
| ----------- | ---- | --------------- |
| Unit        |      |                 |
| Integration |      |                 |
| E2E         |      |                 |

### 9.4 Known Constraints

_Solo developer, home lab infrastructure, hardware limits, time constraints, etc._

-
- ***

## 10. Risk & Mitigation

| ID    | Risk | Likelihood | Impact | Mitigation | Residual Risk |
| ----- | ---- | ---------- | ------ | ---------- | ------------- |
| R-001 |      |            |        |            |               |

---

## 11. Requirements Traceability Matrix

| EPS Requirement ID | Requirement Summary | Design Section | Notes |
| ------------------ | ------------------- | -------------- | ----- |
| FR-001             |                     | §4 / §6        |       |
| UI-001             |                     | §4.3           |       |
| KPP-001            |                     | §6 / §7        |       |

---

_End of Document_
