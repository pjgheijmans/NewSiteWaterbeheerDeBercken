# Architectuur — Digitale Dagstaat Zwembad

Overzicht en index van de architectuurdocumentatie. De detailhoofdstukken staan
in [`docs/architecture/`](architecture/).

| Deel | Inhoud |
|------|--------|
| [Backend](architecture/backend.md)   | Gelaagde opbouw, request-lifecycle, middleware, endpoints, dependency injection |
| [Frontend](architecture/frontend.md) | ES6-class modules en de `Application`-container |
| [Flows](architecture/flows.md)       | Sequencediagrammen: opstarten, acties, autosave |
| [Database](architecture/database.md) | ER-diagram en tabellen |
| [Testing](architecture/testing.md)   | Teststrategie per laag |

---

## Systeemoverzicht

Full-stack applicatie voor het bijhouden van de dagelijkse waterkwaliteit van een
zwembad. TypeScript/Express-backend, vanilla-JS-frontend (ES6-klassen), MySQL 8,
gecontaineriseerd met Docker. Code en commentaar zijn in het Nederlands.

```mermaid
graph TB
    subgraph Docker["Docker Stack"]
        subgraph Web["Container: zwembad_web (Node 20 + ts-node)"]
            Express["Express\nserver.ts\n• wacht op DB (retry)\n• runInitSql()\n• luistert op :3000"]
        end
        subgraph DB["Container: zwembad_db (MySQL 8)"]
            MySQL[("MySQL\nzwembad_status")]
        end
        Web -->|"mysql2 pool"| DB
    end

    Browser["Browser\n(Waterbeheerder / Coördinator / Administrator)"]
    Browser -->|"GET / — HTML + JS + CSS"| Web
    Browser -->|"GET/POST /api/*"| Web
```

---

## Gelaagde architectuur

Elk domein (metingen, verbruik, coordinatoren, …) volgt dezelfde lagen. Een
controller hangt alleen van een **service-interface** af; een service alleen van
**repository-interfaces**. Afhankelijkheden wijzen naar binnen (Dependency
Inversion); concrete klassen worden in de route-factory samengesteld.

```mermaid
graph LR
    Req["HTTP-request"] --> MW

    subgraph MW["Middleware"]
        Auth["checkAuth\n(401 indien geen sessie)"]
        Val["valideerBody(schema)\n(400 bij ongeldige body)"]
    end

    MW --> Ctrl

    subgraph Ctrl["Controller (HTTP)"]
        C["rolcontrole (403)\nrequest → service\nresponse-opmaak\nnext(err)"]
    end

    Ctrl -->|"IXxxService"| Svc

    subgraph Svc["Service (bedrijfslogica)"]
        S["orkestratie\nbeslissingen\nactiegeneratie"]
    end

    Svc -->|"IXxxRepository"| Repo

    subgraph Repo["Repository (SQL)"]
        R["mysql2-queries"]
    end

    Repo -->|"pool"| DB[("MySQL")]

    Ctrl -.->|"AppError / throw"| EH["errorHandler\n(centrale 4xx/5xx-respons)"]
    Svc  -.->|"AppError"| EH
    Repo -.->|"AppError"| EH
```

**Kernprincipes**

- **SRP** — controller doet HTTP, service doet logica, repository doet SQL.
- **DIP** — hogere lagen hangen van interfaces af, niet van implementaties.
- **Centrale foutafhandeling** — handlers roepen `next(err)`; `errorHandler`
  bepaalt de statuscode (uit `AppError`, anders 500) en de JSON-respons.
- **Validatie aan de rand** — `valideerBody` (Zod) valideert `req.body` vóór de
  controller; de service ontvangt gevalideerde data.

---

## Mappenstructuur (backend)

```
backend/
  server.ts                 # opstarten: pool, runInitSql, routes, listen
  errors.ts                 # AppError(message, status)
  auteur.ts                 # bepaalAuteur(gebruiker) — gedeelde helper
  types/index.ts            # domeintypes + express-session augmentatie
  middleware/
    auth.ts                 # checkAuth + rol-helpers
    valideer.ts             # valideerBody(schema)
    errorHandler.ts         # centrale foutafhandeling
  validation/schemas.ts     # Zod-schema's per domein
  routes/<domein>.ts        # factory: repos → service → controller
  controllers/<X>Controller.ts
  services/I<X>Service.ts + <X>Service.ts
  repositories/I<X>Repository.ts + <X>Repository.ts + db.ts
```

Zie [Backend](architecture/backend.md) voor de details.

---

## Rollen en toegang

```mermaid
graph LR
    subgraph Rollen
        WB["Waterbeheerder"]
        CO["Coördinator"]
        AD["Administrator"]
    end

    subgraph WB_Tab["Dagstaat — Waterbeheer"]
        WB1["Diep/Ondiep\n• Meetwaarden\n• Verbruik\n• Verwarmingssysteem\n• Bezoekers"]
        WB2["Peuterbad\n• Meetwaarden\n• Verbruik"]
        WB3["Logboek"]
        WB4["Acties"]
    end

    subgraph CO_Tab["Dagstaat — Coördinatoren"]
        CO1["Metingen\n(meerdere blokken/dag)"]
        CO2["Checklijst"]
        CO3["Temperatuur & Bezoekers"]
        CO4["Logboek"]
    end

    subgraph AD_Tab["Beheerschermen"]
        AD1["Limieten\n(richtwaarden + actiedrempels\n+ seizoendatums)"]
        AD2["Gebruikersbeheer"]
        AD3["Database Beheer\n(export/import/truncate)"]
        AD4["Trendanalyse\n(Chart.js)"]
    end

    WB --> WB1 & WB2 & WB3 & WB4
    CO --> CO1 & CO2 & CO3 & CO4
    AD --> AD1 & AD2 & AD3 & AD4
```

De rolcontrole zit in de controllers (`isWaterbeheerder`,
`isWaterbeheerderOrCoordinator`, `isAdminOrWaterbeheerder` uit
`middleware/auth.ts`); `checkAuth` dwingt eerst een geldige sessie af.
