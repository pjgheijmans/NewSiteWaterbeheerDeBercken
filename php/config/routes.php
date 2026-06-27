<?php

declare(strict_types=1);

use Slim\App;
use Zwembad\Controllers\ActieTekstenController;
use Zwembad\Controllers\AuthController;
use Zwembad\Controllers\ConfiguratieController;
use Zwembad\Controllers\CoordinatorenController;
use Zwembad\Controllers\DienstController;
use Zwembad\Controllers\FrontendController;
use Zwembad\Controllers\GebruikersController;
use Zwembad\Controllers\LimietenController;
use Zwembad\Controllers\LogboekController;
use Zwembad\Controllers\MetingenController;
use Zwembad\Controllers\DatabaseController;
use Zwembad\Controllers\RollenController;
use Zwembad\Controllers\RondetakenController;
use Zwembad\Controllers\TakenController;
use Zwembad\Controllers\TrendController;
use Zwembad\Controllers\VerbruikController;
use Zwembad\Controllers\VersieController;
use Zwembad\Middleware\AuthMiddleware;
use Zwembad\Middleware\RechtenMiddleware;

/**
 * Route-registratie — het equivalent van app.ts in de Node-backend.
 *
 * De paden zijn IDENTIEK aan de Express-routes zodat de bestaande frontend
 * (frontend/js/*.js) zonder wijziging blijft werken.
 *
 * Middleware-volgorde in Slim is LIFO: de als LAATSTE ge->add()'e middleware
 * draait als eerste. Daarom staat AuthMiddleware (401) ná RechtenMiddleware
 * (403) in de keten, zodat hij — net als checkAuth vóór vereist() in Node —
 * als eerste draait.
 */
return function (App $app): void {
    // ── Auth + versie (publiek, geen middleware) ──────────────────────────────
    $app->post('/api/login', [AuthController::class, 'login']);
    $app->post('/api/logout', [AuthController::class, 'logout']);
    $app->get('/api/ingelogd', [AuthController::class, 'ingelogd']);
    $app->get('/api/versie', [VersieController::class, 'get']);

    // Herbruikbare recht-middleware (beheer-domein).
    $rf = $app->getResponseFactory();
    $beheerLezen = new RechtenMiddleware('beheer', 'lezen', $rf);
    $beheerSchrijven = new RechtenMiddleware('beheer', 'schrijven', $rf);

    // ── Gebruikers (beheer-domein) ────────────────────────────────────────────
    $app->get('/api/gebruikers', [GebruikersController::class, 'getAll'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->post('/api/gebruikers', [GebruikersController::class, 'create'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->put('/api/gebruikers/{id}', [GebruikersController::class, 'update'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->delete('/api/gebruikers/{id}', [GebruikersController::class, 'remove'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);

    // ── Rollen (beheer-domein) ────────────────────────────────────────────────
    $app->get('/api/rollen', [RollenController::class, 'getAll'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->post('/api/rollen', [RollenController::class, 'create'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->put('/api/rollen/{id}', [RollenController::class, 'update'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->delete('/api/rollen/{id}', [RollenController::class, 'remove'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);

    // ── Limieten ──────────────────────────────────────────────────────────────
    // De actieve limieten zijn leesbaar voor élke ingelogde gebruiker: de dagstaat
    // (waterbeheer/coördinator) gebruikt ze voor de grenswaarde-markering. Beheren
    // (defaults ophalen + opslaan) blijft voorbehouden aan het beheer-domein.
    $app->get('/api/limieten', [LimietenController::class, 'getAll'])
        ->add(AuthMiddleware::class);
    $app->get('/api/limieten/defaults', [LimietenController::class, 'getDefaults'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->post('/api/limieten', [LimietenController::class, 'save'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);

    // ── Actie-teksten (beheer-domein) ─────────────────────────────────────────
    $app->get('/api/actieteksten', [ActieTekstenController::class, 'getAll'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->get('/api/actieteksten/defaults', [ActieTekstenController::class, 'getDefaults'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->post('/api/actieteksten', [ActieTekstenController::class, 'save'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);

    // Herbruikbare recht-middleware (waterbeheer-domein).
    $wbLezen = new RechtenMiddleware('waterbeheer', 'lezen', $rf);
    $wbSchrijven = new RechtenMiddleware('waterbeheer', 'schrijven', $rf);

    // ── Metingen & acties (waterbeheer-domein) ────────────────────────────────
    $app->get('/api/metingen', [MetingenController::class, 'getMetingen'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->post('/api/metingen', [MetingenController::class, 'postMeting'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/acties', [MetingenController::class, 'getActies'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->post('/api/acties/{id}/resolve', [MetingenController::class, 'resolveActie'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);
    $app->post('/api/acties/{id}/unresolve', [MetingenController::class, 'unresolveActie'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/bezoekers', [MetingenController::class, 'getBezoekers'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->get('/api/gebonden-chloor', [MetingenController::class, 'getGebondenChloor'])
        ->add($wbLezen)->add(AuthMiddleware::class);

    // ── Verbruik & verwarmingssysteem (waterbeheer-domein) ────────────────────
    $app->get('/api/verbruik/diep-ondiep', [VerbruikController::class, 'getVerbruik'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->get('/api/verbruik/diep-ondiep/vorige', [VerbruikController::class, 'getVorigeVerbruik'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->post('/api/verbruik/diep-ondiep', [VerbruikController::class, 'postVerbruik'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/verbruik/verwarmingssysteem', [VerbruikController::class, 'getVerwarming'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->post('/api/verbruik/verwarmingssysteem', [VerbruikController::class, 'postVerwarming'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);

    // ── Waterbeheer-dienst ────────────────────────────────────────────────────
    // GET's zijn voor elke ingelogde gebruiker (alleen AuthMiddleware), net als in Node.
    $app->get('/api/dienst', [DienstController::class, 'getDienst'])
        ->add(AuthMiddleware::class);
    $app->get('/api/dienst/waterbeheerders', [DienstController::class, 'getWaterbeheerders'])
        ->add(AuthMiddleware::class);
    $app->post('/api/dienst', [DienstController::class, 'save'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);

    // Herbruikbare recht-middleware (coordinator-domein).
    $coordLezen = new RechtenMiddleware('coordinator', 'lezen', $rf);
    $coordSchrijven = new RechtenMiddleware('coordinator', 'schrijven', $rf);

    // ── Coördinatoren (coordinator-domein) ────────────────────────────────────
    $app->get('/api/coordinatoren', [CoordinatorenController::class, 'getMetingen'])
        ->add($coordLezen)->add(AuthMiddleware::class);
    $app->post('/api/coordinatoren', [CoordinatorenController::class, 'postMeting'])
        ->add($coordSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/coordinatoren/checklist', [CoordinatorenController::class, 'getChecklist'])
        ->add($coordLezen)->add(AuthMiddleware::class);
    $app->post('/api/coordinatoren/checklist', [CoordinatorenController::class, 'postChecklist'])
        ->add($coordSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/coordinatoren/daggegevens', [CoordinatorenController::class, 'getDaggegevens'])
        ->add($coordLezen)->add(AuthMiddleware::class);
    $app->post('/api/coordinatoren/daggegevens', [CoordinatorenController::class, 'postDaggegevens'])
        ->add($coordSchrijven)->add(AuthMiddleware::class);
    $app->delete('/api/coordinatoren', [CoordinatorenController::class, 'deleteBlok'])
        ->add($coordSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/coordinatoren/logboek', [CoordinatorenController::class, 'getLogboek'])
        ->add($coordLezen)->add(AuthMiddleware::class);
    $app->post('/api/coordinatoren/logboek', [CoordinatorenController::class, 'postLogboek'])
        ->add($coordSchrijven)->add(AuthMiddleware::class);
    $app->delete('/api/coordinatoren/logboek/{id}', [CoordinatorenController::class, 'deleteLogboek'])
        ->add($coordSchrijven)->add(AuthMiddleware::class);

    // ── Rondetaken (waterbeheer-domein) ───────────────────────────────────────
    $app->get('/api/rondetaken', [RondetakenController::class, 'getRondetaken'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->post('/api/rondetaken/{sleutel}/voltooi', [RondetakenController::class, 'voltooi'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);
    $app->post('/api/rondetaken/{sleutel}/heropen', [RondetakenController::class, 'heropen'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);

    // ── Taken (samengestelde weergave, waterbeheer-domein) ────────────────────
    $app->get('/api/taken', [TakenController::class, 'getTaken'])
        ->add($wbLezen)->add(AuthMiddleware::class);

    // ── Logboek (waterbeheer-domein) ──────────────────────────────────────────
    $app->get('/api/logboek', [LogboekController::class, 'getByDatum'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->post('/api/logboek', [LogboekController::class, 'save'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);
    $app->delete('/api/logboek/{id}', [LogboekController::class, 'deleteById'])
        ->add($wbSchrijven)->add(AuthMiddleware::class);

    // ── Configuratie (beheer-domein) ──────────────────────────────────────────
    $app->get('/api/configuratie', [ConfiguratieController::class, 'getAll'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->put('/api/configuratie/{sleutel}', [ConfiguratieController::class, 'update'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);

    // ── Trend (waterbeheer-domein) ────────────────────────────────────────────
    $app->get('/api/trend/metingen', [TrendController::class, 'getMetingen'])
        ->add($wbLezen)->add(AuthMiddleware::class);
    $app->get('/api/trend/verbruik', [TrendController::class, 'getVerbruik'])
        ->add($wbLezen)->add(AuthMiddleware::class);

    // ── Databasebeheer (beheer-domein) ────────────────────────────────────────
    $app->post('/api/database/truncate/{tabelnaam}', [DatabaseController::class, 'truncate'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->get('/api/database/export/{tabelnaam}', [DatabaseController::class, 'exportCsv'])
        ->add($beheerLezen)->add(AuthMiddleware::class);
    $app->post('/api/database/import/{tabelnaam}', [DatabaseController::class, 'importCsv'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->post('/api/database/verwijder-alles', [DatabaseController::class, 'verwijderAlles'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);
    $app->post('/api/database/initialiseer', [DatabaseController::class, 'initialiseer'])
        ->add($beheerSchrijven)->add(AuthMiddleware::class);

    // ── Frontend (publiek; geen auth) ─────────────────────────────────────────
    // Pagina samengesteld uit de partials + statische assets uit de frontend-map.
    // De {type}-regex sluit /api/ uit, dus dit botst niet met de API-routes.
    $app->get('/', [FrontendController::class, 'servePage']);
    $app->get('/{type:js|css|images}/{file}', [FrontendController::class, 'serveAsset']);
};
