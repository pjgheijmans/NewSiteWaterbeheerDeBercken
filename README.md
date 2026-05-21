# Digitale Dagstaat Zwembad

Node.js/Express backend met MySQL database voor het bijhouden van dagelijkse zwembadmetingen. De applicatie draait in Docker en gebruikt een single-page frontend (`public/index.html`).

---

## Projectstructuur

```
├── server.js                  # Entry point: middleware, routes koppelen, server starten
├── db.js                      # MySQL connectie pool (gedeeld door alle routes)
├── middleware/
│   └── auth.js                # checkAuth + rol-hulpfuncties (isWaterbeheerder, etc.)
├── routes/
│   ├── auth.js                # POST /api/login, /api/logout, GET /api/ingelogd
│   ├── gebruikers.js          # CRUD /api/gebruikers
│   ├── limieten.js            # GET/POST /api/limieten
│   ├── metingen.js            # GET/POST /api/metingen, /api/acties
│   ├── coordinatoren.js       # GET/POST /api/coordinatoren
│   ├── verbruik.js            # /api/verbruik/diep-ondiep, /api/verbruik/verwarmingssysteem
│   ├── trend.js               # GET /api/trend/metingen, /api/trend/verbruik
│   └── database.js            # /api/database/truncate, /export, /import
├── public/
│   └── index.html             # Frontend SPA (alle UI logica in één bestand)
├── data/                      # CSV bestanden voor import/export
├── init.sql                   # Database schema + standaard data (limieten, gebruikers)
├── docker-compose.yml         # MySQL + Node.js service definitie
├── Dockerfile                 # Container image voor de Node-app
└── package.json               # NPM afhankelijkheden
```

---

## Database schema

| Tabel                  | Inhoud                                                          |
|------------------------|-----------------------------------------------------------------|
| `baden`               | Baden: Diep, Ondiep, Peuterbad                                  |
| `metingen_grote_baden`| Meetwaarden Diep/Ondiep: pH, chloor, temp, flow, filterdruk    |
| `metingen_peuterbad`   | Meetwaarden peuterbad: pH, chloor, flow, filterdruk, water, chemicaliën |
| `metingen_coordinatoren` | Coördinator metingen: pH, chloor, temperatuur, helderheid    |
| `verbruik_diep_ondiep` | Verbruiksgegevens: water, elektriciteit, gas, chemicaliën, floculant |
| `verwarmings_systeem`  | Ketelstatus per dag: 4 ketels, druk ok, visuele inspectie       |
| `limieten`             | Min/max richtwaarden per parameter                              |
| `gebruikers`           | Inlogaccounts: waterbeheerder, coordinator, Administrator       |
| `acties`               | Automatisch gegenereerde acties/alarmen (bijv. filter spoelen)  |

> `verbruik_diep_ondiep` en `verwarmings_systeem` zijn een splitsing van de vroegere `metingen_algemeen` tabel.

De standaard limieten en testgebruikers worden ingesteld via `INSERT IGNORE` in `init.sql`. Er is geen afzonderlijke seed-functie in de server nodig.

---

## Authenticatie & sessies

De applicatie gebruikt **express-session** voor sessiebeheer.

```javascript
app.use(session({
    secret: 'zwembad_geheim_98765',   // ondertekent de sessie-cookie
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }  // 2 uur geldig
}));
```

**Hoe het werkt:**

1. Gebruiker logt in via `POST /api/login` → server slaat `req.session.gebruiker = { id, voornaam, taak }` op
2. Express-session maakt een ondertekende cookie aan en stuurt deze naar de browser
3. Bij elk volgend verzoek stuurt de browser de cookie mee
4. Express-session verifieert de handtekening met het `secret` en herstelt `req.session`
5. `checkAuth` in `middleware/auth.js` controleert of `req.session.gebruiker` aanwezig is — zo niet, retourneert het 401

**`secret`** — ondertekent de cookie cryptografisch (HMAC). Zonder het secret kan een aanvaller geen geldige cookie namaken.

**`maxAge`** — de browser verwijdert de cookie automatisch na 2 uur, waardoor de gebruiker automatisch wordt uitgelogd.

> In productie: gebruik een willekeurige lange string als secret via een omgevingsvariabele (`process.env.SESSION_SECRET`), nooit hardcoded.

**Rollen:**

| Rol              | Toegang                                                   |
|------------------|-----------------------------------------------------------|
| `waterbeheerder` | Alle functies                                             |
| `coordinator`    | Alleen coördinator metingen                               |
| `Administrator`  | Gebruikersbeheer, limieten, database beheer, trendanalyse |

---

## API-eindpunten

| Methode | Pad                                  | Beschrijving                         |
|---------|--------------------------------------|--------------------------------------|
| POST    | `/api/login`                         | Inloggen                             |
| POST    | `/api/logout`                        | Uitloggen                            |
| GET     | `/api/ingelogd`                      | Sessiestatus opvragen                |
| GET/POST| `/api/gebruikers`                    | Gebruikersbeheer                     |
| GET/POST| `/api/limieten`                      | Richtwaarden lezen/aanpassen         |
| GET/POST| `/api/metingen`                      | Meetwaarden Diep/Ondiep/Peuterbad    |
| GET/POST| `/api/coordinatoren`                 | Coördinator metingen                 |
| GET/POST| `/api/verbruik/diep-ondiep`          | Verbruiksgegevens lezen/opslaan      |
| GET/POST| `/api/verbruik/verwarmingssysteem`   | Ketelstatus lezen/opslaan            |
| GET     | `/api/trend/metingen`                | Trenddata meetwaarden (datumbereik)  |
| GET     | `/api/trend/verbruik`                | Trenddata verbruik (datumbereik)     |
| POST    | `/api/database/truncate/:tabel`      | Tabel leegmaken                      |
| GET     | `/api/database/export/:tabel`        | CSV exporteren                       |
| POST    | `/api/database/import/:tabel`        | CSV importeren                       |

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

---

## Docker beheercommando's

| Actie                                    | Commando                                 |
|------------------------------------------|------------------------------------------|
| Start de stack                           | `docker compose up -d`                   |
| Stop de stack                            | `docker compose down`                    |
| Herbouw + reset database (init.sql opnieuw) | `docker compose down -v && docker compose up -d` |
| Herstart na codewijziging                | `docker compose restart web`             |
| Herstart na schemawijziging              | `docker compose down -v && docker compose up -d` |
| Controleer tabellen in database          | `docker exec -it zwembad_db mysql -u root -pgeheim_wachtwoord zwembad_status -e "SHOW TABLES;"` |

> `docker compose down -v` verwijdert het `db_data` volume zodat `init.sql` volledig opnieuw wordt uitgevoerd.

---

## Handmatig starten (zonder Docker)

```bash
npm install
node server.js
```

Vereist een lokale MySQL-server met:

| Instelling | Waarde           |
|------------|------------------|
| host       | `localhost`      |
| user       | `root`           |
| password   | `geheim_wachtwoord` |
| database   | `zwembad_status` |

Of stel omgevingsvariabelen in:

```bash
DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... node server.js
```

---

## CSV import/export

Exportbestanden worden opgeslagen in de `data/` map. Het formaat gebruikt puntkomma (`;`) als scheidingsteken (Excel-compatibel voor Europa).

Beschikbare tabellen voor export/import via Database Beheer in de UI:

| Tabel                    | Export | Import | Leegmaken |
|--------------------------|--------|--------|-----------|
| Metingen (Waterbeheer)   | ✓      | ✓      | ✓         |
| Metingen Peuterbad       | ✓      | ✓      | ✓         |
| Metingen Coördinatoren   | ✓      | ✓      | ✓         |
| Verbruik (Diep/Ondiep)   | ✓      | ✓      | ✓         |
| Verwarmingssysteem       | ✓      | ✓      | ✓         |
| Acties                   | ✓      | —      | ✓         |
| Limieten                 | ✓      | ✓      | ✓         |
| Gebruikers               | ✓      | ✓      | ✓         |

---

## Trendanalyse

De trendanalyse is bereikbaar via het **Trendanalyse** menu. Kies een datumbereik en klik op "Toon grafiek". Beschikbare grafieken:

**Meetwaarden** — Diep/Ondiep en Peuterbad:
pH, chloor, temperatuur, flow, filterdruk in/uit

**Verbruik** — Diep/Ondiep:
water (diep, ondiep, totaal), elektriciteit (nacht/dag), gas, chemicaliën

**Verbruik** — Peuterbad:
water, chemicaliën (chloor, zwavelzuur)

Grafieken worden weergegeven via [Chart.js](https://www.chartjs.org/) (geladen via CDN).

---

## Opmerkingen

- De frontend is een single-page application in `public/index.html`. Alle UI-logica, stijlen en JavaScript zitten in dit ene bestand.
- `init.sql` is de enige bron van standaardwaarden voor limieten en testgebruikers. Er is geen aparte seed-stap nodig.
- Het schema is gesplitst in schone tabellen per domein. `metingen_algemeen` bestaat niet meer; de data zit nu in `verbruik_diep_ondiep` en `verwarmings_systeem`.
- De server is opgesplitst in losse route-bestanden per domein (`routes/`) en een gedeelde databaseverbinding (`db.js`).
