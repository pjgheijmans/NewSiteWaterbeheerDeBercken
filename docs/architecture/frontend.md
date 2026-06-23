# Frontend

Vanilla JavaScript met ES6-klassen, zonder bundler. Terug naar het
[overzicht](../architecture.md).

---

## 1. Application-container (dependency injection)

`app.js` maakt één `Application`-instantie aan die alle modules als singletons
bevat. Elke module krijgt `app` als enige constructor-argument en roept andere
modules aan via `this.app.<module>.<methode>()`. De scripts worden sequentieel
als `<script>`-tags geladen (geen `import`/bundler).

```mermaid
graph TB
    App["Application (app.js)\n— maakt alle modules\n— exposeert ~25 window.* globals"]

    App --> State["AppState\n(datum, rol, subtabs,\nactieveLimieten, timers)"]
    App --> Api["ApiClient\ncall() · parseNumberValue()"]
    App --> UI["UIManager\ntoonBericht · valideerVeld\nzetInputValue · setAutoSaveStatus"]
    App --> Auth["AuthModule\nstart · verwerkLogin/Logout\nwisselRol"]
    App --> Nav["NavModule\nveranderDatum · begrensSeizoenDatum"]
    App --> Met["MetingenModule\nlaadMetingen · bouwtabel\nveldindicatoren · coordinator-blokken"]
    App --> Taken["TakenModule\nlaadBadTaken · toggle\nVerplicht/Overige + ⚠-badges"]
    App --> Verb["VerbruikModule\nladen · opslaan · berekenen"]
    App --> Save["OpslaanModule\nscheduleAutoSave (1.2s debounce)\nverwerkCentraleOpslaan"]
    App --> Log["LogboekModule"]
    App --> Geb["GebruikersModule"]
    App --> DBm["DatabaseModule\nCSV import/export"]
    App --> Trend["TrendModule\nChart.js"]
    App --> Lim["LimietenModule"]
```

---

## 2. Opstarten en globale functies

```mermaid
graph LR
    Load["scripts geladen\n(state → api → ui → ... → app)"]
    Load --> New["new Application()"]
    New --> Init["app.state.initDatumInput()"]
    New --> Wire["app.opslaan.wireAutoSave()\n(input/change listener op sectie-dagstaat)"]
    New --> Start["app.auth.start()\n→ GET /api/ingelogd"]
    New --> Glob["window.* = (…) => app.module.methode(…)\nvoor HTML onclick-handlers"]
```

Alleen de functies die HTML `onclick`-handlers nodig hebben staan op `window`
(bv. `wisselRol`, `veranderDatum`, `voegNieuwBlokToe`, `toggleTaak`). Alle
overige communicatie loopt via de container, niet via globals.

### Klassendiagram

`Application` bezit (`*--`) alle modules als singletons; elke module krijgt
`app` in de constructor en roept andere modules aan via `this.app` (`-->`).

```mermaid
classDiagram
    class Application {
        +state: AppState
        +api: ApiClient
        +ui: UIManager
        +nav: NavModule
        +auth: AuthModule
        +metingen: MetingenModule
        +taken: TakenModule
        +verbruik: VerbruikModule
        +opslaan: OpslaanModule
        +logboek: LogboekModule
        +gebruikers: GebruikersModule
        +database: DatabaseModule
        +trend: TrendModule
        +limieten: LimietenModule
    }

    class AppState {
        +centraleDatum
        +huidigeRol
        +actieveLimieten
        +ingelogdeGebruiker
        +timers
    }
    class ApiClient {
        +call(url, options) Response
        +parseNumberValue(id) number
    }
    class UIManager {
        +toonBericht(tekst, type)
        +valideerVeld(el, param)
        +setAutoSaveStatus(status)
    }
    class AuthModule {
        +start()
        +verwerkLogin()
        +wisselRol(rol)
    }
    class MetingenModule {
        +laadMetingen()
        +laadActies(datum)
        +bouwTabelOp(data)
    }
    class TakenModule {
        +laadBadTaken(pagina, datum)
        +werkBadgeBij(datum)
        +toggle(sleutel, voltooid)
    }
    class OpslaanModule {
        +scheduleAutoSave()
        +verwerkCentraleOpslaan(autoSave)
    }

    Application *-- AppState
    Application *-- ApiClient
    Application *-- UIManager
    Application *-- AuthModule
    Application *-- MetingenModule
    Application *-- TakenModule
    Application *-- OpslaanModule
    Application *-- NavModule
    Application *-- VerbruikModule
    Application *-- LogboekModule
    Application *-- GebruikersModule
    Application *-- DatabaseModule
    Application *-- TrendModule
    Application *-- LimietenModule

    AuthModule --> Application : this.app
    MetingenModule --> Application : this.app
    TakenModule --> Application : this.app
    OpslaanModule --> Application : this.app
```

> Alleen een representatieve set methoden is getoond; `NavModule`,
> `VerbruikModule`, `LogboekModule`, `GebruikersModule`, `DatabaseModule`,
> `TrendModule` en `LimietenModule` volgen hetzelfde patroon (constructor met
> `app`, aanroepen via `this.app`).

---

## 3. Verantwoordelijkheden per module

| Module               | Verantwoordelijkheid                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppState`           | Eén bron van waarheid voor gedeelde toestand en timers                                                                                                                                                         |
| `ApiClient`          | `fetch`-wrapper met credentials; `parseNumberValue` (komma→punt)                                                                                                                                               |
| `UIManager`          | Statusberichten, veldvalidatie tegen limieten, auto-save-indicator                                                                                                                                             |
| `NavModule`          | Datumnavigatie met begrenzing op de seizoengrenzen                                                                                                                                                             |
| `AuthModule`         | Inloggen/uitloggen, dashboard activeren, rol wisselen                                                                                                                                                          |
| `MetingenModule`     | Metingen laden/tonen, ⚠/✓-veldindicatoren bij de meetwaarden, coördinator-blokken                                                                                                                              |
| `TakenModule`        | Taken-subtab per bad: "Verplicht vandaag" vs "Overige taken"; afvinken via rondetaken-/acties-endpoints; een afgevinkte verplichte taak blijft in Verplicht (afgestreept, mét reden); ⚠-badges op tabs/subtabs |
| `VerbruikModule`     | Verbruik/verwarming laden, opslaan, dagdelta berekenen                                                                                                                                                         |
| `OpslaanModule`      | Alle auto-save-orkestratie (centraal + per blok), 1.2 s debounce                                                                                                                                               |
| `LogboekModule`      | Logboekblokken voor waterbeheer en coördinatoren                                                                                                                                                               |
| `GebruikersModule`   | Gebruikersbeheer met auto-save per rij                                                                                                                                                                         |
| `DatabaseModule`     | CSV-import/-export, truncate, herinitialisatie                                                                                                                                                                 |
| `TrendModule`        | Chart.js-grafieken voor metingen en verbruik                                                                                                                                                                   |
| `LimietenModule`     | Limieten laden/renderen/opslaan (auto-save)                                                                                                                                                                    |
| `ActieTekstenModule` | Actie-tekstsjablonen laden/renderen/opslaan (auto-save) met live placeholder-preview (Administrator)                                                                                                           |
| `DienstModule`       | "Dienst vandaag"-chip: dienstpaar laden/opslaan; vult de ingelogde gebruiker voor                                                                                                                              |
| `ConfiguratieModule` | Configuratiescherm: generieke instellingen laden/renderen en per waarde auto-saven (`PUT /api/configuratie/:sleutel`); Administrator                                                                           |

> **Optimistische concurrency & sessie (toegevoegd):** `OpslaanModule`/`MetingenModule`/
> `VerbruikModule` houden per record een `versie` bij in `AppState.versies`, sturen die
> mee bij elke save en tellen door op het antwoord; een **409** roept
> `MetingenModule.behandelConflict()` aan (melding + herladen). `werkVolledigheidBij()`
> zet de passieve volledigheids-bolletjes en `toonLaatstGewijzigd()` de "laatst
> gewijzigd door …"-regel. `ApiClient` stuurt een 401 naar `AuthModule.sessieVerlopen()`
> (terug naar het loginscherm met uitleg). De kop toont een app-versielabel uit
> `/api/versie`.

---

## 4. Levering

De HTML wordt server-side samengesteld uit partials (`frontend/partials/`) door
`FrontendController` — geen buildstap. De JS-modules worden als losse
`<script>`-bestanden geserveerd vanuit `frontend/js/`.

> Let op: de frontend blijft bewust vanilla JS (geen TypeScript, geen bundler),
> zodat de applicatie ook achter een eenvoudige statische webserver of Apache
> reverse-proxy kan draaien zonder buildpijplijn.
