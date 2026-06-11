# Digitale Dagstaat Zwembad

TypeScript/Express-backend met MySQL-database voor het bijhouden van dagelijkse
zwembadmetingen. De applicatie draait in Docker en serveert een vanilla-JS-frontend
(ES6-klassen) via HTML-partials.

De backend is gelaagd opgezet (routes → controllers → services → repositories) met
dependency injection, centrale foutafhandeling en Zod-validatie. Zie
[`docs/architecture.md`](docs/architecture.md) voor de volledige architectuur met
diagrammen.

---

## Projectstructuur

```
├── backend/                            # TypeScript
│   ├── server.ts                       # Entry point: pool, wacht op DB, runInitSql, routes, listen
│   ├── errors.ts                       # AppError(message, status)
│   ├── auteur.ts                       # bepaalAuteur(gebruiker) — gedeelde helper
│   ├── types/index.ts                  # Domeintypes + express-session augmentatie
│   ├── middleware/
│   │   ├── auth.ts                     # checkAuth + rol-hulpfuncties
│   │   ├── valideer.ts                 # valideerBody(schema) — Zod-validatie
│   │   └── errorHandler.ts             # Centrale foutafhandeling (4xx/5xx)
│   ├── validation/schemas.ts           # Zod-schema's per domein
│   ├── routes/<domein>.ts              # Factory: repositories → service → controller
│   ├── controllers/<X>Controller.ts    # HTTP: rolcontrole, request→service, response
│   ├── services/I<X>Service.ts + <X>Service.ts   # Bedrijfslogica
│   └── repositories/                   # Database-laag (interface + implementatie per domein)
│       ├── db.ts                       # Gedeelde mysql2-pool
│       └── <X>Repository.ts            # SQL per domein
├── frontend/                           # Vanilla JS (ES6-klassen, geen bundler)
│   ├── css/style.css
│   ├── js/                             # Eén klasse per bestand, geladen via <script>
│   │   ├── app.js                      # Application-container (DI) + window.* globals
│   │   ├── state.js                    # AppState — gedeelde toestand
│   │   ├── api.js · ui.js · nav.js · auth.js
│   │   ├── metingen.js · taken.js · verbruik.js · opslaan.js · logboek.js
│   │   ├── gebruikers.js · database.js · trend.js · limieten.js
│   │   └── actieteksten.js · dienst.js     # actie-teksten beheren · waterbeheer-dienst
│   └── partials/                       # HTML-fragmenten, samengevoegd door FrontendController
├── test/                               # Jest + ts-jest + Supertest
│   ├── helpers/                        # testApp.ts, mockPool.ts
│   └── unit/                           # errors, middleware, validation, controllers, services, repositories
├── docs/architecture.md + docs/architecture/   # Architectuurdocumentatie
├── init.sql                            # Database schema + standaard data
├── docker-compose.yml                  # MySQL + Node-service (met healthcheck)
├── Dockerfile                          # Container image (nodemon + ts-node)
├── tsconfig.json · tsconfig.test.json · jest.config.js · nodemon.json
└── package.json
```

---

## Database schema

| Tabel                               | Inhoud                                                                        |
|-------------------------------------|-------------------------------------------------------------------------------|
| `baden`                             | Baden: Diep, Ondiep, Peuterbad                                                |
| `metingen_diep_ondiep`              | Meetwaarden Diep/Ondiep: pH, chloor, temperatuur, flow, filterdruk, kathodische bescherming, water |
| `metingen_peuterbad`                | Meetwaarden Peuterbad: pH, chloor, flow, filterdruk, water, chemicaliën       |
| `metingen_coordinatoren`            | Coördinator metingen: pH, chloor (vrij/totaal), temperatuur, helderheid — meerdere blokken per dag met tijdstip |
| `coordinatoren_checklist`           | Dagelijkse proefdraaien: waterspeel, spraypark, douches, glijbaan (+ auteur)  |
| `coordinatoren_daggegevens`         | Luchttemperatuur en bezoekersaantal per dag (+ auteur)                         |
| `coordinatoren_logboek`             | Vrij-tekst logboek coördinatoren (aparte tabel van waterbeheerder)            |
| `logboek`                           | Vrij-tekst logboek waterbeheerders                                            |
| `verbruik_diep_ondiep`              | Verbruik: water, elektriciteit, gas, chemicaliën, floculant                   |
| `verwarmings_systeem_diep_ondiep`   | Ketelstatus per dag: 4 ketels, druk ok, visuele inspectie                     |
| `limieten`                          | Min/max richtwaarden + actie-drempelwaarden per parameter                     |
| `gebruikers`                        | Inlogaccounts: waterbeheerder, coordinator, Administrator                     |
| `acties`                            | Automatisch gegenereerde acties/alarmen per bad en datum                      |
| `actie_teksten`                     | Aanpasbare tekst-sjablonen voor gegenereerde acties (met plaatshouders)       |
| `waterbeheer_dienst`                | Wie was er per dag op dienst bij waterbeheer (twee personen)                   |
| `rondetaken_voltooid`               | Afgevinkte dagelijkse rondetaken per dag (catalogus staat in code)            |

Standaard limieten en testgebruikers worden ingesteld via `INSERT IGNORE` in `init.sql`. Er is geen aparte seed-stap nodig.

---

## Authenticatie & sessies

De applicatie gebruikt **express-session** voor sessiebeheer. De secret wordt
bepaald door `bepaalSessionSecret()` (`backend/config.ts`): in productie
(`NODE_ENV=production`) is `SESSION_SECRET` **verplicht** en weigert de app te
starten als die ontbreekt; in dev/test geldt een gemarkeerde fallback.

```typescript
app.use(session({
    secret: bepaalSessionSecret(),          // verplicht in productie (fail fast)
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }  // 2 uur
}));
```

**Rollen:**

| Rol              | Toegang                                                                                     |
|------------------|---------------------------------------------------------------------------------------------|
| `waterbeheerder` | Dagstaat (meetwaarden, verbruik, bezoekers, logboek, taken), dienstregistratie, coördinator-metingen, trendanalyse, gebruikersbeheer, database beheer |
| `coordinator`    | Coördinator-metingen, checklijst, daggegevens, logboek                                      |
| `Administrator`  | Limieten, actie-teksten, gebruikersbeheer, database beheer                                  |

> **Limieten & trendanalyse (zie R-006):** trendanalyse is voorbehouden aan
> `waterbeheerder`. Limietwaarden worden voor veldvalidatie en seizoengrenzen door
> elke ingelogde rol *gelezen*, maar het beheerscherm en het *bewerken* van limieten
> is voorbehouden aan `Administrator`.

`checkAuth` (middleware) dwingt een geldige sessie af (401); de rolcontrole zit in
de controllers (403). Muterende endpoints valideren de body met Zod (400).

> In productie: gebruik een willekeurige lange string als secret via
> `process.env.SESSION_SECRET`.

---

## API-eindpunten

| Methode      | Pad                                       | Beschrijving                                      |
|--------------|-------------------------------------------|---------------------------------------------------|
| POST         | `/api/login`                              | Inloggen                                          |
| POST         | `/api/logout`                             | Uitloggen                                         |
| GET          | `/api/ingelogd`                           | Sessiestatus opvragen                             |
| GET/POST     | `/api/gebruikers`                         | Gebruikerslijst / aanmaken                        |
| PUT          | `/api/gebruikers/:id`                     | Gebruiker bijwerken                               |
| DELETE       | `/api/gebruikers/:id`                     | Gebruiker verwijderen                             |
| GET/POST     | `/api/limieten`                           | Richtwaarden lezen / opslaan                      |
| GET          | `/api/limieten/defaults`                  | Standaard richtwaarden ophalen                    |
| GET/POST     | `/api/actieteksten`                       | Actie-tekst-sjablonen lezen / opslaan (POST: Administrator) |
| GET          | `/api/actieteksten/defaults`              | Standaard actie-teksten ophalen                   |
| GET/POST     | `/api/dienst`                             | Waterbeheer-dienst (wie op dienst) lezen / opslaan |
| GET          | `/api/dienst/waterbeheerders`             | Namenlijst waterbeheerders voor de keuzelijst     |
| GET/POST     | `/api/metingen`                           | Meetwaarden Diep/Ondiep/Peuterbad                 |
| GET          | `/api/acties`                             | Acties voor een datum ophalen                     |
| POST         | `/api/acties/:id/resolve`                 | Actie als opgelost markeren                       |
| POST         | `/api/acties/:id/unresolve`               | Actie heropenen (ongedaan maken)                  |
| GET          | `/api/rondetaken`                         | Rondetaken (met dagstatus) voor een datum ophalen |
| POST         | `/api/rondetaken/:sleutel/voltooi`        | Rondetaak afvinken                                |
| POST         | `/api/rondetaken/:sleutel/heropen`        | Rondetaak heropenen                               |
| GET          | `/api/taken`                              | Samengestelde taken-/actielijst per bad-pagina    |
| GET          | `/api/bezoekers`                          | Bezoekersaantal + cumulatief sinds spoelbeurt ophalen; triggert actiecheck |
| GET/POST     | `/api/coordinatoren`                      | Coördinator meetblokken                           |
| DELETE       | `/api/coordinatoren`                      | Coördinator meetblok verwijderen                  |
| GET/POST     | `/api/coordinatoren/checklist`            | Dagelijkse checklijst                             |
| GET/POST     | `/api/coordinatoren/daggegevens`          | Luchttemperatuur & bezoekers                      |
| GET/POST     | `/api/coordinatoren/logboek`              | Coördinator logboek                               |
| DELETE       | `/api/coordinatoren/logboek/:id`          | Coördinator logboek-item verwijderen              |
| GET/POST     | `/api/logboek`                            | Waterbeheerder logboek                            |
| DELETE       | `/api/logboek/:id`                        | Logboek-item verwijderen                          |
| GET/POST     | `/api/verbruik/diep-ondiep`               | Verbruiksgegevens lezen/opslaan                   |
| GET          | `/api/verbruik/diep-ondiep/vorige`        | Vorige meterstand ophalen                         |
| GET/POST     | `/api/verbruik/verwarmingssysteem`        | Ketelstatus lezen/opslaan                         |
| GET          | `/api/trend/metingen`                     | Trenddata meetwaarden (datumbereik)               |
| GET          | `/api/trend/verbruik`                     | Trenddata verbruik (datumbereik)                  |
| POST         | `/api/database/truncate/:tabelnaam`       | Tabel leegmaken                                   |
| POST         | `/api/database/verwijder-alles`           | Alle data wissen                                  |
| POST         | `/api/database/initialiseer`              | init.sql uitvoeren (schema + standaardwaarden)    |
| GET          | `/api/database/export/:tabelnaam`         | CSV exporteren                                    |
| POST         | `/api/database/import/:tabelnaam`         | CSV importeren                                    |

---

## Acties & taken

Acties (drempelalarmen) worden automatisch aangemaakt of verwijderd na het opslaan van meetwaarden, verbruiksdata of bezoekersaantallen. Ze worden samen met de **dagelijkse rondetaken** getoond in de **Taken**-subtab per bad-pagina (geen aparte Acties-tab). De `TakenService` stelt deze weergave server-side samen. Er zijn tien actie-regels:

| Actie-type                    | Triggerconditie                                                              |
|-------------------------------|------------------------------------------------------------------------------|
| `filter_spoelen_druk` Diep/Ondiep | Filterdruk verschil (in − uit) > drempelwaarde                           |
| `filter_spoelen_flow` Diep/Ondiep | Flow < minimumdrempelwaarde                                              |
| `filter_spoelen_druk` Peuterbad   | Filterdruk in > maximumdrempelwaarde                                     |
| `filter_spoelen_flow` Peuterbad   | Flow < minimumdrempelwaarde                                              |
| `filter_spoelen_bezoekers` Diep/Ondiep | Aantal bezoekers vandaag > drempelwaarde (geldt voor beide baden)   |
| `filter_spoelen_spoelbeurt` Diep  | Cumulatief bezoekers Diep > drempelwaarde sinds laatste spoelbeurt       |
| `filter_spoelen_spoelbeurt` Ondiep| Cumulatief bezoekers Ondiep > drempelwaarde sinds laatste spoelbeurt    |
| `chloor_bestellen`                | Chloorvoorraad < minimumdrempelwaarde                                    |
| `zwavelzuur_bestellen`            | Zwavelzuurvoorraad < minimumdrempelwaarde                                |
| `floculant_bijvullen`             | Floculant < minimumdrempelwaarde                                         |

**Instelbare drempelwaarden** (via Limieten-pagina, groep "Actie-drempelwaarden"):

| Parameter              | Standaard | Betekenis                                      |
|------------------------|-----------|------------------------------------------------|
| `actie_druk_verschil`  | 0,40 bar  | Max filterdruk verschil Diep/Ondiep            |
| `actie_druk_peuterbad` | 1,00 bar  | Max filterdruk Peuterbad                       |
| `actie_flow_diep`      | 250 m³/h  | Min flow Diep                                  |
| `actie_flow_ondiep`    | 75 m³/h   | Min flow Ondiep                                |
| `actie_flow_peuterbad` | 4 m³/h    | Min flow Peuterbad                             |
| `actie_chloor_min`     | 200 L     | Min chloorvoorraad                             |
| `actie_zwavelzuur_min` | 50 L      | Min zwavelzuurvoorraad                         |
| `actie_floculant_min`  | 10        | Min floculant                                  |
| `actie_bezoekers_max`  | 750       | Max aantal bezoekers per dag                   |
| `actie_spoelbeurt_max` | 1500      | Max cumulatief bezoekers sinds laatste spoelbeurt |

**Weergave in de UI (Taken-subtab):**
- ⚠-badge op de **bad-paginatab** (Diep/Ondiep, Peuterbad) en de **Taken-subtab** zodra er verplichte taken openstaan
- ⚠-indicatoren naast de betreffende invoervelden (op basis van open acties)
- In de Taken-subtab staan drie categorieën: **Verplicht vandaag** (getriggerde alarmen), **Belangrijk** (kritieke rondetaken zoals regelaars, spraypark-filters en de douches-test) en **Overige taken** (overige optionele rondetaken). Alleen openstaande Verplicht-taken geven de ⚠-badge
- De tekst van de gegenereerde acties is aanpasbaar via de **Actie-teksten**-pagina (Administrator); de sjablonen staan in `actie_teksten` met plaatshouders (`{bad}`, `{drempel}`, `{waarde}`)
- `filter_spoelen`-acties van een bad vallen samen op de filtertaak van dat bad (één rij met alle redenen); facility-brede chemicaliën-alarmen staan onder **Algemeen**

**Rondetaken** vormen de vaste dagelijkse checklist (regelaars, filters, haarfilters, douches, spraypark, …). De catalogus staat in code (`RondetakenRepository`); per dag worden alleen de afgevinkte taken bewaard, dus elke nieuwe dag begint leeg.

**Oplossen en heropenen:**
- Afvinken gebeurt via de checkbox in de Taken-subtab. Een **filtertaak** afvinken lost ook de bijbehorende `filter_spoelen`-acties van dat bad op; losse alarmen (bijv. chloor bestellen) los je direct op
- Opgelost/uitgevoerd door en tijdstip worden vastgelegd; uitvinken heropent
- De cumulatieve bezoekersteller voor spoelbeurt telt vanaf de **meest recente reiniging** — een opgeloste `filter_spoelen_spoelbeurt`-actie óf een afgevinkte filter-rondetaak

---

## Bezoekers-subtab (Diep/Ondiep)

De **Bezoekers**-subtab in de waterbeheer Diep/Ondiep sectie toont:

| Veld                              | Bron                                                         |
|-----------------------------------|--------------------------------------------------------------|
| Aantal bezoekers vandaag          | Coördinator daggegevens (`bezoekers_vandaag`)                |
| Bezoekers sinds spoelbeurt Diep   | Automatisch berekend: som dagelijks sinds laatste spoelbeurt |
| Bezoekers sinds spoelbeurt Ondiep | Automatisch berekend: som dagelijks sinds laatste spoelbeurt |

De cumulatieve tellers worden per bad bijgehouden vanaf de meest recente reiniging — een opgeloste `filter_spoelen_spoelbeurt`-actie óf een afgevinkte filter-rondetaak (`diep_filter`/`ondiep_filter`). Zodra de coördinator het bezoekersaantal opslaat of een waterbeheerder de Bezoekers-subtab bekijkt, worden de actieregels gecontroleerd.

---

## Autosave

Wijzigingen worden automatisch opgeslagen met een debounce van 1,2 seconden. Een statusregel toont de voortgang:

| Status                     | Kleur  |
|----------------------------|--------|
| Wijzigingen niet opgeslagen | grijs  |
| Bewaren…                   | oranje |
| ✓ Opgeslagen               | groen  |
| ✕ Fout bij opslaan         | rood   |

Autosave geldt voor: dagstaat meetwaarden, verbruik, verwarmingssysteem, coördinator metingen, checklijst, daggegevens, limieten, actie-teksten, waterbeheer-dienst, gebruikers en logboek.

Statusmeldingen verschijnen als zwevende **toast** rechtsonder (groen/rood/neutraal met icoon). Bevestigingen bij verwijder-/reset-acties gebruiken een **eigen modal** (in plaats van de browser-`confirm`/`alert`).

---

## Vereisten

- Docker + Docker Compose (aanbevolen)
- Node.js 20+ (alleen voor lokaal ontwikkelen/tests buiten Docker)

---

## Starten met Docker

```bash
docker compose up -d
```

- Webapplicatie: `http://localhost:3000`
- MySQL: `localhost:3306`

De `db`-service heeft een healthcheck. De `web`-container start pas als MySQL gereed is. Bij de eerste start (leeg volume) voert MySQL `init.sql` uit via `/docker-entrypoint-initdb.d/`. Bij elke start voert de Node-server ook zelf `init.sql` uit (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`) zodat het schema altijd compleet is. In de container draait de app via `nodemon` + `ts-node` (hot reload).

---

## Docker beheercommando's

| Actie                                         | Commando                                                                                                     |
|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| Start de stack                                | `docker compose up -d`                                                                                       |
| Stop de stack                                 | `docker compose down`                                                                                        |
| Herstart na codewijziging                     | `docker compose restart web`                                                                                 |
| Herbouw + reset database (init.sql opnieuw)   | `docker compose down -v && docker compose up -d`                                                             |
| Controleer tabellen in database               | `docker exec -it zwembad_db mysql -u root -pgeheim_wachtwoord zwembad_status -e "SHOW TABLES;"`             |
| Live logs bekijken                            | `docker logs -f zwembad_web`                                                                                 |

> `docker compose down -v` verwijdert het `db_data` volume zodat `init.sql` volledig opnieuw wordt uitgevoerd bij de volgende start.
>
> Alternatief: gebruik de knop **Maak nieuwe database aan** in de Database Beheer-pagina van de UI. Die voert `init.sql` uit zonder data-verlies (gebruikt `INSERT IGNORE` en `CREATE TABLE IF NOT EXISTS`).

---

## Lokaal ontwikkelen (zonder Docker)

Vereist een draaiende MySQL-server. NPM-scripts:

```bash
npm install
npm run dev      # nodemon + ts-node (hot reload)
npm run build    # tsc → dist/
npm start        # node dist/backend/server.js (na build)
```

MySQL-instellingen (of via omgevingsvariabelen `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`):

| Instelling | Waarde              |
|------------|---------------------|
| host       | `localhost`         |
| user       | `root`              |
| password   | `geheim_wachtwoord` |
| database   | `zwembad_status`    |

---

## Tests

Unit-tests met Jest + ts-jest + Supertest; geen database nodig (alle I/O gemockt).

```bash
npm run test           # alle tests
npm run test:unit      # unit-tests
npm run test:coverage  # met coverage-rapport
```

Elke laag wordt getest met een mock van de laag eronder: controllers mocken de
service, services mocken de repositories, repositories mocken de `mysql2`-pool.
Zie [`docs/architecture/testing.md`](docs/architecture/testing.md).

---

## CSV import/export

Het formaat gebruikt puntkomma (`;`) als scheidingsteken (Excel-compatibel voor Europa).

Beschikbare tabellen via Database Beheer in de UI:

| Tabel                        | Export | Import | Leegmaken |
|------------------------------|--------|--------|-----------|
| Metingen Diep/Ondiep         | ✓      | ✓      | ✓         |
| Metingen Peuterbad           | ✓      | ✓      | ✓         |
| Metingen Coördinatoren       | ✓      | ✓      | ✓         |
| Coördinator Checklijst       | ✓      | ✓      | ✓         |
| Coördinator Daggegevens      | ✓      | ✓      | ✓         |
| Coördinator Logboek          | ✓      | ✓      | ✓         |
| Logboek Waterbeheer          | ✓      | ✓      | ✓         |
| Verbruik Diep/Ondiep         | ✓      | ✓      | ✓         |
| Verwarmingssysteem           | ✓      | ✓      | ✓         |
| Acties                       | ✓      | —      | ✓         |
| Waterbeheer dienst           | ✓      | ✓      | ✓         |
| Limieten                     | ✓      | ✓      | ✓         |
| Actie-teksten                | ✓      | ✓      | ✓         |
| Gebruikers                   | ✓      | ✓      | ✓         |

---

## Trendanalyse

Bereikbaar via het **Trendanalyse**-menu (alleen waterbeheerder). Kies een datumbereik en klik op "Toon grafiek".

**Meetwaarden** — Diep/Ondiep:
pH, chloor, temperatuur, flow, filterdruk in/uit, kathodische bescherming

**Meetwaarden** — Peuterbad:
pH, chloor, flow, filterdruk in

**Verbruik** — Diep/Ondiep:
water (diep, ondiep, totaal), elektriciteit (nacht/dag), gas, chemicaliën

**Verbruik** — Peuterbad:
water, chemicaliën (chloor, zwavelzuur)

Grafieken worden weergegeven via [Chart.js](https://www.chartjs.org/) (geladen via CDN).

---

## Opmerkingen

- De frontend bestaat uit HTML-partials in `frontend/partials/` en losse JS-modules (ES6-klassen) in `frontend/js/`. Ze worden door de `FrontendController` (`backend/controllers/FrontendController.ts`) samengevoegd en als één pagina geserveerd.
- `init.sql` is de enige bron van standaardwaarden voor limieten en testgebruikers.
- Chloor gebonden wordt berekend (totaal − vrij) en niet opgeslagen in de database.
- Coördinator meetblokken ondersteunen meerdere metingen per dag, elk met een instelbaar tijdstip.
- De server wacht bij het opstarten op de database (max 15 pogingen met 2 s interval) en voert daarna `init.sql` uit zodat alle tabellen gegarandeerd aanwezig zijn.
