# Digitale Dagstaat Zwembad

Node.js/Express backend met MySQL database voor het bijhouden van dagelijkse zwembadmetingen. De applicatie draait in Docker en serveert een multi-file frontend via HTML partials.

---

## Projectstructuur

```
├── backend/
│   ├── server.js                       # Entry point: wacht op DB, voert init.sql uit, start server
│   ├── middleware/
│   │   └── auth.js                     # checkAuth + rol-hulpfuncties (isWaterbeheerder, etc.)
│   ├── repositories/                   # Database-laag (één bestand per domein)
│   │   ├── db.js                       # MySQL connectie pool (gedeeld)
│   │   ├── acties.js                   # Acties genereren, ophalen, oplossen, heropenen
│   │   ├── coordinatoren.js            # Coördinator metingen, checklist, daggegevens
│   │   ├── coordinatoren_logboek.js    # Coördinator logboek (aparte tabel)
│   │   ├── database.js                 # Truncate, CSV export/import, init.sql uitvoeren
│   │   ├── gebruikers.js               # CRUD gebruikersaccounts
│   │   ├── limieten.js                 # Richtwaarden + standaardwaarden
│   │   ├── logboek.js                  # Waterbeheerder logboek
│   │   ├── metingen.js                 # Meetwaarden Diep/Ondiep/Peuterbad
│   │   ├── trend.js                    # Aggregatie voor trendgrafieken
│   │   └── verbruik.js                 # Verbruik + verwarmingssysteem
│   └── routes/                         # Express routers (één bestand per domein)
│       ├── auth.js                     # /api/login, /api/logout, /api/ingelogd
│       ├── coordinatoren.js            # /api/coordinatoren/*
│       ├── database.js                 # /api/database/*
│       ├── frontend.js                 # HTML-partials samenvoegen en serveren
│       ├── gebruikers.js               # /api/gebruikers
│       ├── limieten.js                 # /api/limieten
│       ├── logboek.js                  # /api/logboek (waterbeheerder)
│       ├── metingen.js                 # /api/metingen, /api/acties, /api/bezoekers
│       ├── trend.js                    # /api/trend/*
│       └── verbruik.js                 # /api/verbruik/*
├── frontend/
│   ├── css/
│   │   └── style.css                   # Alle stijlen (inclusief responsive)
│   ├── js/                             # Modules, elk geladen via <script> in head.html
│   │   ├── api.js                      # apiCall() helper (fetch + foutafhandeling)
│   │   ├── app.js                      # Initialisatie, globale input-listener voor autosave
│   │   ├── auth.js                     # Login/logout UI + rolwisseling
│   │   ├── database.js                 # Database beheer UI
│   │   ├── gebruikers.js               # Gebruikersbeheer UI + autosave
│   │   ├── limieten.js                 # Limieten UI + autosave
│   │   ├── logboek.js                  # Logboek blokken (waterbeheer + coördinatoren)
│   │   ├── metingen.js                 # Meetwaarden, acties, bezoekers, tab-navigatie
│   │   ├── nav.js                      # Datumnavigatie
│   │   ├── opslaan.js                  # Centrale autosave-logica (debounce 1,2 s)
│   │   ├── state.js                    # Gedeelde toestand (datum, rol, actieve tabs)
│   │   ├── trend.js                    # Trendanalyse UI + Chart.js
│   │   ├── ui.js                       # Hulpfuncties (toonBericht, limiet-check, etc.)
│   │   └── verbruik.js                 # Verbruik + verwarmingssysteem UI
│   └── partials/                       # HTML-fragmenten samengesteld door frontend.js
│       ├── head.html                   # <head> + alle <script>-tags
│       ├── nav.html                    # Hoofd-navigatiebalk
│       ├── login.html                  # Loginscherm
│       ├── dagstaat.html               # Dagstaat-pagina (alle tabs)
│       ├── dashboard-open.html         # Dashboard openstaande acties
│       ├── database.html               # Database beheer pagina
│       ├── gebruikers.html             # Gebruikersbeheer pagina
│       ├── limieten.html               # Limieten pagina
│       ├── trendanalyse.html           # Trendanalyse pagina
│       └── footer.html                 # Sluit body/html af
├── data/                               # CSV-bestanden voor import/export
├── init.sql                            # Database schema + standaard data
├── docker-compose.yml                  # MySQL + Node.js service definitie (met healthcheck)
├── Dockerfile                          # Container image voor de Node-app
└── package.json                        # NPM afhankelijkheden
```

---

## Database schema

| Tabel                               | Inhoud                                                                        |
|-------------------------------------|-------------------------------------------------------------------------------|
| `baden`                             | Baden: Diep, Ondiep, Peuterbad                                                |
| `metingen_diep_ondiep`              | Meetwaarden Diep/Ondiep: pH, chloor, temperatuur, flow, filterdruk, water     |
| `metingen_peuterbad`                | Meetwaarden Peuterbad: pH, chloor, flow, filterdruk, water, chemicaliën       |
| `metingen_coordinatoren`            | Coördinator metingen: pH, chloor (vrij/totaal), temperatuur, helderheid — meerdere blokken per dag met tijdstip |
| `coordinatoren_checklist`           | Dagelijkse proefdraaien: waterspeel, spraypark, douches, glijbaan             |
| `coordinatoren_daggegevens`         | Luchttemperatuur en bezoekersaantal per dag                                   |
| `coordinatoren_logboek`             | Vrij-tekst logboek coördinatoren (aparte tabel van waterbeheerder)            |
| `logboek`                           | Vrij-tekst logboek waterbeheerders                                            |
| `verbruik_diep_ondiep`              | Verbruik: water, elektriciteit, gas, chemicaliën, floculant                   |
| `verwarmings_systeem_diep_ondiep`   | Ketelstatus per dag: 4 ketels, druk ok, visuele inspectie                     |
| `limieten`                          | Min/max richtwaarden + actie-drempelwaarden per parameter                     |
| `gebruikers`                        | Inlogaccounts: waterbeheerder, coordinator, Administrator                     |
| `acties`                            | Automatisch gegenereerde acties/alarmen per bad en datum                      |

Standaard limieten en testgebruikers worden ingesteld via `INSERT IGNORE` in `init.sql`. Er is geen aparte seed-stap nodig.

---

## Authenticatie & sessies

De applicatie gebruikt **express-session** voor sessiebeheer.

```javascript
app.use(session({
    secret: 'zwembad_geheim_98765',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }  // 2 uur
}));
```

**Rollen:**

| Rol              | Toegang                                                       |
|------------------|---------------------------------------------------------------|
| `waterbeheerder` | Dagstaat (meetwaarden, verbruik, bezoekers, logboek, acties)  |
| `coordinator`    | Coördinator metingen, checklijst, daggegevens, logboek        |
| `Administrator`  | Gebruikersbeheer, limieten, database beheer, trendanalyse     |

> In productie: gebruik een willekeurige lange string als secret via een omgevingsvariabele (`process.env.SESSION_SECRET`).

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
| GET/POST     | `/api/metingen`                           | Meetwaarden Diep/Ondiep/Peuterbad                 |
| GET          | `/api/acties`                             | Acties voor een datum ophalen                     |
| POST         | `/api/acties/:id/resolve`                 | Actie als opgelost markeren                       |
| POST         | `/api/acties/:id/unresolve`               | Actie heropenen (ongedaan maken)                  |
| GET          | `/api/bezoekers`                          | Bezoekersaantal + cumulatief sinds spoelbeurt ophalen; triggert actiecheck |
| GET/POST     | `/api/coordinatoren/metingen`             | Coördinator meetblokken                           |
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

## Acties-systeem

Acties worden automatisch aangemaakt of verwijderd na het opslaan van meetwaarden, verbruiksdata of bezoekersaantallen. Er zijn negen regels:

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
| `actie_bezoekers_max`  | 750       | Max aantal bezoekers per dag                   |
| `actie_spoelbeurt_max` | 1500      | Max cumulatief bezoekers sinds laatste spoelbeurt |

**Weergave in de UI:**
- Rood badge op de **Waterbeheer**-navigatieknop met aantal openstaande acties
- Rood badge op de **Acties**-tab en op relevante **subtabs** (Meetwaarden, Verbruik, Bezoekers)
- ⚠-indicatoren naast de betreffende invoervelden
- Acties met dezelfde handeling (bijv. meerdere redenen voor filter spoelen) worden gecombineerd in één tabelrij met alle redenen onder elkaar

**Acties oplossen en heropenen:**
- Waterbeheerder markeert actie als uitgevoerd via een checkbox in de Acties-tab
- Opgelost door en tijdstip worden vastgelegd
- Een opgeloste actie kan worden heropend door de checkbox uit te vinken
- De cumulatieve bezoekersteller voor spoelbeurt reset automatisch vanaf de dag na het oplossen

---

## Bezoekers-subtab (Diep/Ondiep)

De **Bezoekers**-subtab in de waterbeheer Diep/Ondiep sectie toont:

| Veld                              | Bron                                                         |
|-----------------------------------|--------------------------------------------------------------|
| Aantal bezoekers vandaag          | Coördinator daggegevens (`bezoekers_vandaag`)                |
| Bezoekers sinds spoelbeurt Diep   | Automatisch berekend: som dagelijks sinds laatste spoelbeurt |
| Bezoekers sinds spoelbeurt Ondiep | Automatisch berekend: som dagelijks sinds laatste spoelbeurt |

De cumulatieve tellers worden per bad bijgehouden op basis van de opgeloste `filter_spoelen_spoelbeurt`-acties. Zodra de coördinator het bezoekersaantal opslaat of een waterbeheerder de Bezoekers-subtab bekijkt, worden de actieregels gecontroleerd.

---

## Autosave

Wijzigingen worden automatisch opgeslagen met een debounce van 1,2 seconden. Een statusregel toont de voortgang:

| Status                     | Kleur  |
|----------------------------|--------|
| Wijzigingen niet opgeslagen | grijs  |
| Bewaren…                   | oranje |
| ✓ Opgeslagen               | groen  |
| ✕ Fout bij opslaan         | rood   |

Autosave geldt voor: dagstaat meetwaarden, verbruik, verwarmingssysteem, coördinator metingen, checklijst, daggegevens, limieten, gebruikers en logboek.

---

## Vereisten

- Docker
- Docker Compose

---

## Starten met Docker

```bash
docker compose up -d
```

- Webapplicatie: `http://localhost:3000`
- MySQL: `localhost:3306`

De `db`-service heeft een healthcheck. De `web`-container start pas als MySQL gereed is. Bij de eerste start (leeg volume) voert MySQL `init.sql` uit via `/docker-entrypoint-initdb.d/`. Bij elke start voert de Node-server ook zelf `init.sql` uit (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`) zodat het schema altijd compleet is.

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

## Handmatig starten (zonder Docker)

```bash
npm install
node backend/server.js
```

Vereist een lokale MySQL-server met:

| Instelling | Waarde              |
|------------|---------------------|
| host       | `localhost`         |
| user       | `root`              |
| password   | `geheim_wachtwoord` |
| database   | `zwembad_status`    |

Of stel omgevingsvariabelen in:

```bash
DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... node backend/server.js
```

---

## CSV import/export

Exportbestanden worden opgeslagen in de `data/` map. Het formaat gebruikt puntkomma (`;`) als scheidingsteken (Excel-compatibel voor Europa).

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
| Limieten                     | ✓      | ✓      | ✓         |
| Gebruikers                   | ✓      | ✓      | ✓         |

---

## Trendanalyse

Bereikbaar via het **Trendanalyse**-menu (alleen Administrator). Kies een datumbereik en klik op "Toon grafiek".

**Meetwaarden** — Diep/Ondiep en Peuterbad:
pH, chloor, temperatuur, flow, filterdruk in/uit

**Verbruik** — Diep/Ondiep:
water (diep, ondiep, totaal), elektriciteit (nacht/dag), gas, chemicaliën

**Verbruik** — Peuterbad:
water, chemicaliën (chloor, zwavelzuur)

Grafieken worden weergegeven via [Chart.js](https://www.chartjs.org/) (geladen via CDN).

---

## Opmerkingen

- De frontend bestaat uit HTML-partials in `frontend/partials/` en losse JS-modules in `frontend/js/`. Ze worden door `backend/routes/frontend.js` samengevoegd en als één pagina geserveerd.
- `init.sql` is de enige bron van standaardwaarden voor limieten en testgebruikers.
- Chloor gebonden wordt berekend (totaal − vrij) en niet opgeslagen in de database.
- Coördinator meetblokken ondersteunen meerdere metingen per dag, elk met een instelbaar tijdstip.
- De server wacht bij het opstarten op de database (max 15 pogingen met 2 s interval) en voert daarna `init.sql` uit zodat alle tabellen gegarandeerd aanwezig zijn.
