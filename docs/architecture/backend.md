# Backend

TypeScript/Express, gelaagd en met dependency injection. Terug naar het
[overzicht](../architecture.md).

---

## 1. Request-lifecycle

```mermaid
graph LR
    R["Request /api/..."] --> CA["checkAuth"]
    CA -->|"geen sessie"| E401["401 Niet ingelogd"]
    CA -->|"ok"| VB["valideerBody(schema)\n(alleen POST/PUT met JSON)"]
    VB -->|"ongeldig"| EH
    VB -->|"ok, req.body geparst"| H["controller-handler"]
    H -->|"verkeerde rol"| E403["403 Geen toegang"]
    H -->|"ok"| SVC["service"]
    SVC --> REPO["repository"]
    REPO --> POOL[("mysql2 pool")]
    H -.->|"next(err)"| EH["errorHandler"]
    SVC -.->|"throw AppError"| EH
    REPO -.->|"throw AppError"| EH
    EH --> RESP["JSON { error } met status\n(AppError.status of 500)"]
```

De volgorde van middleware bij een muterende route is
`checkAuth → valideerBody(schema) → handler`. De rolcontrole gebeurt binnen de
handler (begin), waarna gedelegeerd wordt naar de service.

---

## 2. Lagen per domein

Elk domein heeft dezelfde keten. Voorbeeld met `metingen` als geheel:

```mermaid
graph TB
    F["routes/metingen.ts\nmaakMetingenRouter(pool)"]
    F --> Ctrl["controllers/MetingenController\n— rolcontrole, request→service, response"]
    Ctrl -->|"IMetingenService"| Svc["services/MetingenService\n— keuze peuter/grootbad,\nactiegeneratie, bezoekers-orkestratie"]
    Svc -->|"IMetingenRepository"| R1["repositories/MetingenRepository"]
    Svc -->|"IActiesRepository"| R2["repositories/ActiesRepository"]
    Svc -->|"IDaggegevensProvider"| R3["repositories/CoordinatorenRepository"]
    R1 & R2 & R3 -->|"pool"| DB[("MySQL")]
```

`IDaggegevensProvider` is een smalle interface (alleen `getDaggegevens`) die de
`CoordinatorenRepository` implementeert — Interface Segregation: `MetingenService`
ziet alleen wat het nodig heeft.

### Klassendiagram — metingen

De controller hangt af van een service-**interface**; de service van
repository-**interfaces**. Concrete klassen (`..|>`) worden pas in de
route-factory gekoppeld. Elk domein volgt ditzelfde patroon.

```mermaid
classDiagram
    class MetingenController {
        -service: IMetingenService
        +router: Router
    }

    class IMetingenService {
        <<interface>>
        +getMetingen(datum) Meting[]
        +saveMeting(body) void
        +getActies(datum) Actie[]
        +resolveActie(id, gebruiker) void
        +unresolveActie(id) void
        +getBezoekers(datum) BezoekersResultaat
    }
    class MetingenService {
        -metingenRepo: IMetingenRepository
        -actiesRepo: IActiesRepository
        -daggegevensProvider: IDaggegevensProvider
    }

    class IMetingenRepository {
        <<interface>>
        +getMetingen(datum) Meting[]
        +getBadId(naam) number
        +saveGrootBadMeting(badId, data) void
        +savePeuterbadMeting(badId, data) void
    }
    class IActiesRepository {
        <<interface>>
        +getActies(datum) Actie[]
        +resolve(id, door) void
        +unresolve(id) void
        +genereer(badId, datum, naam, body) void
        +genereerBezoekers(datum, aantal) void
        +genereerSpoelbeurt(datum) BadTotalen
    }
    class IDaggegevensProvider {
        <<interface>>
        +getDaggegevens(datum) Daggegevens
    }

    class MetingenRepository
    class ActiesRepository
    class CoordinatorenRepository

    MetingenController --> IMetingenService : gebruikt
    MetingenService ..|> IMetingenService
    MetingenService --> IMetingenRepository
    MetingenService --> IActiesRepository
    MetingenService --> IDaggegevensProvider
    MetingenRepository ..|> IMetingenRepository
    ActiesRepository ..|> IActiesRepository
    CoordinatorenRepository ..|> IDaggegevensProvider
```

### Foutklasse

```mermaid
classDiagram
    class Error
    class AppError {
        +status: number
        +constructor(message, status)
    }
    AppError --|> Error
```

`AppError(message, status)` wordt door services/repositories geworpen en door de
`errorHandler` vertaald naar de HTTP-statuscode; overige fouten worden 500.

---

## 3. Endpoints per domein

| Router (factory) | Mount | Endpoints | Rol |
|---|---|---|---|
| `auth.ts` | `/api` | `POST /login`, `POST /logout`, `GET /ingelogd` | — / sessie |
| `metingen.ts` | `/api` | `GET/POST /metingen`, `GET /acties`, `POST /acties/:id/resolve`, `POST /acties/:id/unresolve`, `GET /bezoekers` | waterbeheerder |
| `coordinatoren.ts` | `/api/coordinatoren` | `GET/POST /`, `DELETE /`, `GET/POST /checklist`, `GET/POST /daggegevens`, `GET/POST /logboek`, `DELETE /logboek/:id` | waterbeheerder of coördinator |
| `verbruik.ts` | `/api/verbruik` | `GET/POST /diep-ondiep`, `GET /diep-ondiep/vorige`, `GET/POST /verwarmingssysteem` | waterbeheerder |
| `limieten.ts` | `/api/limieten` | `GET /`, `GET /defaults`, `POST /` | lezen: vrij · schrijven: admin/waterbeheerder |
| `logboek.ts` | `/api/logboek` | `GET /`, `POST /`, `DELETE /:id` | waterbeheerder |
| `gebruikers.ts` | `/api/gebruikers` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | admin/waterbeheerder |
| `database.ts` | `/api/database` | `POST /truncate/:tabel`, `POST /verwijder-alles`, `POST /initialiseer`, `GET /export/:tabel`, `POST /import/:tabel` | admin/waterbeheerder |
| `trend.ts` | `/api/trend` | `GET /metingen`, `GET /verbruik` | waterbeheerder |
| `frontend.ts` | `/` | `GET /` — HTML-partials samenvoegen | — |

---

## 4. Middleware en gedeelde bouwstenen

| Bestand | Verantwoordelijkheid |
|---|---|
| `middleware/auth.ts` | `checkAuth` (401 zonder sessie) + rol-helpers `isWaterbeheerder`, `isWaterbeheerderOrCoordinator`, `isAdminOrWaterbeheerder` |
| `middleware/valideer.ts` | `valideerBody(schema)` — valideert `req.body` met Zod, vervangt door geparste waarde, gooit `AppError(400)` |
| `middleware/errorHandler.ts` | centrale foutafhandeling: `AppError.status` of 500, logt alleen 5xx |
| `validation/schemas.ts` | Zod-schema's per domein (los voor metingen/verbruik/coordinatoren, strikt voor gebruiker/limiet/login) |
| `errors.ts` | `AppError(message, status)` |
| `auteur.ts` | `bepaalAuteur(gebruiker)` — naamafleiding voor logboek/acties |
| `types/index.ts` | domeintypes + `declare module 'express-session'` augmentatie voor `req.session.gebruiker` |

---

## 5. Dependency injection — samenstelling

De route-factory is het enige punt waar concrete klassen worden gekoppeld. Alle
lagen daarboven kennen alleen interfaces.

```typescript
// routes/metingen.ts
export function maakMetingenRouter(pool: Pool): Router {
    const metingenRepo = new MetingenRepository(pool);
    const actiesRepo   = new ActiesRepository(pool);
    const coordRepo    = new CoordinatorenRepository(pool);
    const service      = new MetingenService(metingenRepo, actiesRepo, coordRepo);
    const controller   = new MetingenController(service);
    return controller.router;
}
```

`server.ts` maakt de gedeelde `pool` en `DatabaseRepository` (voor `runInitSql`
bij het opstarten), mount alle routers en als laatste de `errorHandler`.

```mermaid
graph TB
    S["server.ts"] --> P[("mysql2 pool — db.ts")]
    S --> WDB["waitForDb() retry"]
    S --> INIT["DatabaseRepository.runInitSql()"]
    S --> RT["app.use(... maakXxxRouter(pool) ...)"]
    S --> EHm["app.use(errorHandler) — als laatste"]
    S --> L["app.listen(3000)"]
```

---

## 6. Niet-triviale logica

- **Actiegeneratie** is fire-and-forget na een meting/daggegevens-save — geen
  transactionele garantie tussen de save en de gegenereerde actie.
- **Spoelbeurt-totaal** is cumulatief sinds de laatst opgeloste
  `filter_spoelen_spoelbeurt`-actie (zie `ActiesRepository`).
- **CSV-export/-import** zit in `DatabaseService`: puntkomma-gescheiden voor
  EU-Excel; import vertaalt `bad_naam` → `bad_id` voor metingen-tabellen en
  schakelt foreign-key-checks tijdelijk uit.
- **`init.sql`** draait bij elke start (`CREATE TABLE IF NOT EXISTS` +
  `INSERT IGNORE`) — idempotent, geen migratietool.
