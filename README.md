# Zwembad Status

Dit project bevat een Node.js/Express-applicatie met een MySQL-database. De applicatie draait in Docker en gebruikt `public/index.html` als frontend.

## Inhoud

- `server.js` - Express backend en API
- `public/index.html` - frontend UI
- `init.sql` - database-initialisatie en schema
- `docker-compose.yml` - MySQL + webservice
- `Dockerfile` - container image voor de Node-app
- `package.json` - projectafhankelijkheden

## Vereisten

- Docker
- Docker Compose

## Starten met Docker

Start de diensten in de rootfolder:

```bash
cd "c:\Users\User\OneDrive\Documenten - Waterbeheer\Software\Digital Dagstaat\nieuwe_site_tryout"
docker compose up -d
```

- De webapplicatie draait op `http://localhost:3000`
- De MySQL-database draait op `localhost:3306`

## Database initialisatie

De MySQL-service in `docker-compose.yml` mount `./init.sql` op `/docker-entrypoint-initdb.d/init.sql`.

Let op: dit init-script wordt alleen automatisch uitgevoerd als de databasevolume nog leeg is.

## Docker update methodes

Gebruik deze commando’s om de database en services opnieuw op te bouwen of te controleren.

- Start de stack:

```bash
docker compose up -d
```

- Stop de stack:

```bash
docker compose down
```

- Herbouw de database en pas `init.sql` opnieuw toe:

```bash
docker compose down -v
docker compose up -d
```

- Herstart alleen de services na code- of schemawijzigingen:

```bash
docker compose restart db web
```

- Controleer de database vanuit de container:

```bash
docker exec -it zwembad_db mysql -u root -pgeheim_wachtwoord zwembad_status -e "SHOW TABLES;"
```

## Bestaande database bijwerken

Als je al een bestaande database hebt en deze mist de nieuwe velden, voer dan handmatig een `ALTER TABLE` uit:

```bash
docker exec -it zwembad_db mysql -u root -pgeheim_wachtwoord zwembad_status \
  -e "ALTER TABLE metingen \
  ADD COLUMN water VARCHAR(100) NULL, \
  ADD COLUMN chemicalien_chloor VARCHAR(100) NULL, \
  ADD COLUMN chemicalien_zwavelzuur VARCHAR(100) NULL;"
```

## Database verwijderen en opnieuw aanmaken

Als je een schone database wilt gebruiken, stop dan de compose-stack en verwijder de volumes:

```bash
docker compose down -v
docker compose up -d
```

> `docker compose down -v` verwijdert ook het `db_data` volume en zorgt ervoor dat `init.sql` opnieuw wordt toegepast.

## Handmatig starten zonder Docker

Als je lokaal wilt werken zonder Docker:

```bash
cd "c:\Users\User\OneDrive\Documenten - Waterbeheer\Software\Digital Dagstaat\nieuwe_site_tryout"
npm install
node server.js
```

Je hebt daarbij wel een MySQL-server nodig met dezelfde database-instellingen als in `docker-compose.yml`:

- host: `localhost`
- user: `root`
- password: `geheim_wachtwoord`
- database: `zwembad_status`

## Extra mappen

Er zijn ook twee varianten aanwezig in de workspace:

- `bu/`
- `bu2/`

Deze folders bevatten hun eigen `docker-compose.yml`, `Dockerfile`, `init.sql` en `server.js`.

## Opmerkingen

- De database-structuur wordt beheerd in `init.sql`.
- Nieuwe velden voor `peuterbad` worden toegevoegd aan de tabel `metingen`.
- Als je wijzigingen aan `init.sql` maakt, moet je de database opnieuw aanmaken om die wijzigingen automatisch te laten toepassen.
