# PHP-backend (Slim 4 + PHP-DI)

[![PHP tests](https://github.com/pjgheijmans/NewSiteWaterbeheerDeBercken/actions/workflows/php-tests.yml/badge.svg)](https://github.com/pjgheijmans/NewSiteWaterbeheerDeBercken/actions/workflows/php-tests.yml)

Port van de Node/Express-backend naar PHP, zodat de app op gedeelde Apache+MySQL-hosting
(PHP 8.0, `pdo_mysql`) kan draaien. De **frontend (`../frontend/`) en het databaseschema
(`../init.sql`) blijven ongewijzigd** — alleen de backend wordt herschreven. De HTTP-API en
de JSON-vorm zijn identiek aan de Node-versie, zodat `frontend/js/*.js` zonder aanpassing werkt.

**Status: de volledige Node-backend is gepoort.** Alle `/api/...`-endpoints + de
frontend-paginasamenstelling draaien in PHP, geverifieerd tegen de live database
(inclusief een login-rondgang met sessie en RBAC).

Domeinen:

- **auth** — `POST /api/login`, `POST /api/logout`, `GET /api/ingelogd`
- **gebruikers** — `GET/POST /api/gebruikers`, `PUT/DELETE /api/gebruikers/{id}` (beheer-domein)
- **rollen** — `GET/POST /api/rollen`, `PUT/DELETE /api/rollen/{id}` (beheer-domein)
- **limieten** — `GET /api/limieten`, `GET /api/limieten/defaults`, `POST /api/limieten` (beheer-domein)
- **actieteksten** — `GET /api/actieteksten`, `GET /api/actieteksten/defaults`, `POST /api/actieteksten` (beheer-domein)
- **metingen & acties** — `GET/POST /api/metingen`, `GET /api/acties`,
  `POST /api/acties/{id}/resolve|unresolve`, `GET /api/bezoekers`, `GET /api/gebonden-chloor`
  (waterbeheer-domein). Inclusief de actiegeneratie-engine (`ActiesRepository`), de
  optimistische versiecontrole (`Support\Optimistisch`) en de historie-recht-controle
  (`Support\Historie`). Trekt gedeeltelijke `RondetakenRepository`/`CoordinatorenRepository`
  mee (alleen wat de actiegeneratie nodig heeft); die domeinen worden later afgemaakt.

- **verbruik & verwarming** — `GET/POST /api/verbruik/diep-ondiep`, `GET /api/verbruik/diep-ondiep/vorige`,
  `GET/POST /api/verbruik/verwarmingssysteem` (waterbeheer-domein; verbruik triggert
  `ActiesRepository::genereerVerbruik`)
- **dienst** — `GET /api/dienst`, `GET /api/dienst/waterbeheerders` (elke ingelogde gebruiker),
  `POST /api/dienst` (waterbeheer, schrijven + historie)
- **coördinatoren** — metingen-blokken (`GET/POST/DELETE /api/coordinatoren`), checklist,
  daggegevens (`GET/POST /api/coordinatoren/checklist|daggegevens`) en het logboek
  (`GET/POST /api/coordinatoren/logboek`, `DELETE /api/coordinatoren/logboek/{id}`),
  coordinator-domein. `CoordinatorenRepository` is nu volledig (vervult ook
  `IDaggegevensProvider`); logboektekst is hard gecapt op 500 tekens.

- **rondetaken** — `GET /api/rondetaken`, `POST /api/rondetaken/{sleutel}/voltooi|heropen`
  (waterbeheer-domein; filter-rondetaken synchroniseren met de filter_spoelen_*-acties)
- **taken** — `GET /api/taken` (samengestelde Verplicht/Belangrijk/Overig-weergave uit
  rondetaken + acties, read-only)
- **logboek** — `GET/POST /api/logboek`, `DELETE /api/logboek/{id}` (waterbeheer-logboek;
  tekst hard gecapt op 500 tekens)
- **configuratie** — `GET /api/configuratie`, `PUT /api/configuratie/{sleutel}` (beheer-domein;
  validatie + 404 bij onbekende sleutel)
- **trend** — `GET /api/trend/metingen`, `GET /api/trend/verbruik` (waterbeheer, read-only;
  JSON — de semicolon-CSV-export zit in de frontend)
- **database** — `POST /api/database/truncate/{tabel}`, `GET /api/database/export/{tabel}`,
  `POST /api/database/import/{tabel}`, `POST /api/database/verwijder-alles`,
  `POST /api/database/initialiseer` (beheer-domein; tabelnaam-allowlists, semicolon-CSV,
  `runInitSql` zoekt `init.sql` in de project-root of in `backend/`)
- **frontend** — `GET /` stelt de pagina samen uit `../frontend/partials/*.html` (zelfde
  volgorde als Node) en serveert `/js`, `/css`, `/images` uit de frontend-map
  (`FrontendController`; publiek, geen auth)

De RBAC-keten staat op de routes: `AuthMiddleware` (401 als niet ingelogd) +
`RechtenMiddleware(domein, 'lezen'|'schrijven')` (403 zonder recht), het equivalent van
`checkAuth` + `vereist()` uit de Node-backend.

> **Sessie-time-out (idle/sliding):** `SessionMiddleware` handhaaft de instelbare
> `sessie_timeout_minuten`. Per `/api`-request wordt de laatste activiteit bijgehouden in de
> sessie; is die ouder dan de time-out, dan wordt de sessie gewist (de volgende `checkAuth`
> geeft 401 → de frontend toont "sessie verlopen"). Bij activiteit schuift de vervaltijd mee
> en rolt ook de client-cookie (`Max-Age`). De middleware krijgt de **container**
> geïnjecteerd (niet de service), zodat de config/PDO-keten alléén voor `/api` wordt
> opgebouwd — de publieke pagina en assets openen géén DB-verbinding. Laadt de config zacht
> (val terug op 5 min bij een DB-/configfout).

> **PHP-versie:** de code mijdt 8.1-only syntax (geen `readonly` promoted properties,
> geen string-keyed array-unpacking) zodat hij op de PHP 8.0-hosting draait.

## Architectuur (1-op-1 met de Node-backend)

| Node (TypeScript/Express)        | Hier (PHP)                                  |
| -------------------------------- | ------------------------------------------- |
| `app.ts` route-wiring            | `config/routes.php`                         |
| `maak*Router()`-factories        | `config/dependencies.php` (DI-bindingen)    |
| `controllers/*Controller.ts`     | `src/Controllers/*Controller.php`           |
| `services/*Service.ts` + `I*`    | `src/Services/*Service.php` + `I*`          |
| `repositories/*Repository.ts`    | `src/Repositories/*Repository.php` (PDO)    |
| `middleware/auth.ts` (checkAuth) | `src/Middleware/AuthMiddleware.php`         |
| `middleware/errorHandler.ts`     | `src/Errors/JsonErrorHandler.php`           |
| `validation/schemas.ts` (Zod)    | `src/Validation/Validator.php`              |
| `wachtwoord.ts` (scrypt)         | `src/Support/Wachtwoord.php` (bcrypt)       |
| `express-session` (MemoryStore)  | `src/Middleware/SessionMiddleware.php` (`$_SESSION`, alleen `/api`) |
| `FrontendController.ts` (partials)| `src/Controllers/FrontendController.php`   |

## Lokaal draaien (testen)

**Docker (aanbevolen):** vanuit de project-root draait de hele stack (Apache + mod_php op
PHP 8.0 + MySQL 8) met één commando. De web-container installeert `vendor/` als die
ontbreekt en provisioneert het schema bij start (zie `Dockerfile`).

```bash
docker compose up -d              # app op http://localhost:8080, DB op :3306
docker logs -f zwembad_web        # logs volgen
docker compose down               # stoppen (down -v wist ook de DB)
```

**Zonder Docker:** vereist PHP 8.0+ met `pdo_mysql`, Composer en een bereikbare MySQL met
het schema uit `../init.sql` ingeladen.

```bash
cd backend
composer install
# DB-gegevens via omgevingsvariabelen (of pas config/settings.php aan):
DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD=geheim_wachtwoord DB_NAME=zwembad_status \
  php -S localhost:8080 -t public
```

Test de API (de `/api`-paden routen prima via de built-in server):

```bash
curl -i -c cookies.txt -X POST localhost:8080/api/login \
  -H 'Content-Type: application/json' -d '{"username":"Admin","password":"lpphw"}'
curl -i -b cookies.txt localhost:8080/api/ingelogd
```

> **Statische assets op de PHP built-in server:** de built-in server kapt verzoeken met
> een bekende extensie (`.js`/`.css`/…) zelf af en roept de Slim-app er niet voor aan, dus
> `/js/*.js` geeft daar een 404. Dat is een beperking van de built-in server, **niet** van
> de app: op **Apache** stuurt `.htaccess` die verzoeken naar `index.php` →
> `FrontendController::serveAsset`, en dat werkt (geverifieerd door de app rechtstreeks te
> dispatchen). Wil je de volledige UI lokaal testen zonder Apache, kopieer dan de assets
> eenmalig de docroot in: `cp -r ../frontend/js ../frontend/css ../frontend/images public/`
> (de built-in server serveert ze dan rechtstreeks; op Apache laat je dit weg).

## Tests

PHPUnit 9.6 (laatste reeks die PHP 8.0 ondersteunt). De unit-suite draait zonder DB; de
integratie-suite heeft een MySQL nodig.

```bash
# In de draaiende container:
docker compose exec web composer test              # unit (geen DB)
docker compose exec web composer test:integration  # integratie (echte DB)

# Of lokaal vanuit backend/ (met DB-env-vars voor de integratietests):
cd backend && composer test
```

Dezelfde twee suites draaien in CI op PHP 8.0 (zie `.github/workflows/php-tests.yml` en de
badge bovenaan). De frontend-tests (jsdom) blijven in de project-root onder Node
(`npm test`).

## Deployen naar de gedeelde host

1. `composer install` **lokaal**, en upload de hele `backend/`-map **inclusief `vendor/`**
   (de host heeft geen Composer nodig). Let op: `composer.json` pint het platform op PHP
   8.0, zodat de dependencies 8.0-compatibel zijn.
2. Upload ook **`frontend/`** en **`init.sql`** (in de project-root naast `backend/`, óf binnen
   `backend/` — de app zoekt op beide plekken).
3. Provisioneer het schema **één keer** met `php bin/init-db.php` (zet eerst de DB-env-vars).
   Dit draait `init.sql` met per-statement try/catch en seedt de standaardaccounts.
   ⚠️ `mysql < init.sql` werkt NIET: `init.sql` bevat bewuste dubbele `ALTER TABLE … ADD
   COLUMN`-migraties waarop de mysql-client afbreekt (zie de gotcha in `../CLAUDE.md`).
4. Zet de DB-gegevens via env-vars óf vul ze rechtstreeks in `config/settings.php`.
5. **Docroot**: laat de webroot naar `backend/public/` wijzen. Kan dat niet, zet dan in de
   webroot een `.htaccess` die alles naar `public/index.php` stuurt en directe toegang
   tot `src/`, `config/`, `vendor/` (en bij voorkeur `frontend/partials/`) weigert.
6. Zet `'secure' => true` aan in `SessionMiddleware` (HTTPS).

## Wachtwoorden

`PASSWORD_DEFAULT` (bcrypt) — werkt op elke PHP-build; Argon2 is op gedeelde hosting niet
gegarandeerd. De seed-accounts in `init.sql` staan nog als platte tekst; ze worden bij de
eerste login automatisch gehasht. Die plaintext-tak in `Wachtwoord::verifieer()` mag weg
zodra alle accounts gehasht zijn.

## Een volgend domein porten (playbook)

Voor elk domein (bv. `metingen`):

1. **Repository**: `src/Repositories/IMetingenRepository.php` + `MetingenRepository.php`
   (PDO-queries 1-op-1 uit de Node-repository overnemen).
2. **Service**: `src/Services/IMetingenService.php` + `MetingenService.php` (businesslogica).
3. **Controller**: `src/Controllers/MetingenController.php`.
4. **Validatie**: voeg de schema-methode(s) toe aan `Validator.php`
   (let op de harde regels: logboek max. 500 tekens, decimaal `,`→`.`, enz.).
5. **Bindingen**: twee regels in `config/dependencies.php`.
6. **Routes**: registreer in `config/routes.php`, beschermd met `->add(AuthMiddleware::class)`.
7. **Verifieer** het scherm in de echte frontend én diff tegen de Node-respons.

Let op de niet-triviale regels uit `../CLAUDE.md`: actie-generatie na een meting,
cumulatieve bezoekerstelling van de coördinator, en CSV-export met `;`-scheidingsteken.
