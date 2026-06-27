<?php

declare(strict_types=1);

use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseFactoryInterface;
use Slim\Psr7\Factory\ResponseFactory;
use Zwembad\Repositories\ActieTekstenRepository;
use Zwembad\Repositories\ActiesRepository;
use Zwembad\Repositories\ConfiguratieRepository;
use Zwembad\Repositories\CoordinatorenLogboekRepository;
use Zwembad\Repositories\CoordinatorenRepository;
use Zwembad\Repositories\DatabaseRepository;
use Zwembad\Repositories\DienstRepository;
use Zwembad\Repositories\GebruikersRepository;
use Zwembad\Repositories\IActieTekstenRepository;
use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\IConfiguratieRepository;
use Zwembad\Repositories\IDatabaseRepository;
use Zwembad\Repositories\ITrendRepository;
use Zwembad\Repositories\TrendRepository;
use Zwembad\Repositories\ICoordinatorenLogboekRepository;
use Zwembad\Repositories\ICoordinatorenRepository;
use Zwembad\Repositories\IDaggegevensProvider;
use Zwembad\Repositories\IDienstRepository;
use Zwembad\Repositories\IGebruikersRepository;
use Zwembad\Repositories\ILimietenRepository;
use Zwembad\Repositories\ILogboekRepository;
use Zwembad\Repositories\IMetingenRepository;
use Zwembad\Repositories\IRollenRepository;
use Zwembad\Repositories\IVerbruikRepository;
use Zwembad\Repositories\LimietenRepository;
use Zwembad\Repositories\LogboekRepository;
use Zwembad\Repositories\IRondetakenRepository;
use Zwembad\Repositories\MetingenRepository;
use Zwembad\Repositories\RollenRepository;
use Zwembad\Repositories\RondetakenRepository;
use Zwembad\Repositories\VerbruikRepository;
use Zwembad\Services\ActieTekstenService;
use Zwembad\Services\AuthService;
use Zwembad\Services\ConfiguratieService;
use Zwembad\Services\CoordinatorenService;
use Zwembad\Services\DienstService;
use Zwembad\Services\GebruikersService;
use Zwembad\Services\IConfiguratieService;
use Zwembad\Services\ICoordinatorenService;
use Zwembad\Services\IDatabaseService;
use Zwembad\Services\ILogboekService;
use Zwembad\Services\ITrendService;
use Zwembad\Services\DatabaseService;
use Zwembad\Services\LogboekService;
use Zwembad\Services\TrendService;
use Zwembad\Services\IActieTekstenService;
use Zwembad\Services\IAuthService;
use Zwembad\Services\IDienstService;
use Zwembad\Services\IGebruikersService;
use Zwembad\Services\ILimietenService;
use Zwembad\Services\IMetingenService;
use Zwembad\Services\IRondetakenService;
use Zwembad\Services\ITakenService;
use Zwembad\Services\IVerbruikService;
use Zwembad\Services\LimietenService;
use Zwembad\Services\MetingenService;
use Zwembad\Services\RondetakenService;
use Zwembad\Services\TakenService;
use Zwembad\Services\VerbruikService;

/**
 * DI-bindingen — het PHP-equivalent van de maak*Router()-factories in de
 * Node-backend. PHP-DI autowiret concrete klassen vanzelf (via type-hints in de
 * constructor); hier binden we alleen de interfaces aan hun implementatie.
 *
 * Per gepoort domein voeg je twee regels toe (repository + service); controllers
 * worden automatisch geautowired.
 */
return [
    // Gedeelde PDO-verbinding (vervangt de mysql2-pool uit repositories/db.ts).
    // PHP draait per request, dus dit is één verbinding per request — geen pool nodig.
    PDO::class => function (ContainerInterface $c): PDO {
        $db = $c->get('settings')['db'];
        $dsn = "mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4";
        return new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    },

    // PSR-17 response factory — nodig om responses te bouwen in de middleware
    // (AuthMiddleware, RechtenMiddleware) en de JsonErrorHandler.
    ResponseFactoryInterface::class => DI\create(ResponseFactory::class),

    // ── Auth-domein ───────────────────────────────────────────────────────────
    IGebruikersRepository::class => DI\autowire(GebruikersRepository::class),
    IAuthService::class => DI\autowire(AuthService::class),

    // ── Gebruikers- & rollenbeheer (beheer-domein) ────────────────────────────
    IGebruikersService::class => DI\autowire(GebruikersService::class),
    IRollenRepository::class => DI\autowire(RollenRepository::class),

    // ── Limieten & actie-teksten (beheer-domein) ──────────────────────────────
    ILimietenRepository::class => DI\autowire(LimietenRepository::class),
    ILimietenService::class => DI\autowire(LimietenService::class),
    IActieTekstenRepository::class => DI\autowire(ActieTekstenRepository::class),
    IActieTekstenService::class => DI\autowire(ActieTekstenService::class),

    // ── Metingen & acties (waterbeheer-domein) ────────────────────────────────
    IMetingenRepository::class => DI\autowire(MetingenRepository::class),
    IActiesRepository::class => DI\autowire(ActiesRepository::class),
    // CoordinatorenRepository vervult zowel IDaggegevensProvider als de volledige
    // ICoordinatorenRepository; DI\get deelt één instance over beide interfaces.
    IDaggegevensProvider::class => DI\get(CoordinatorenRepository::class),
    IMetingenService::class => DI\autowire(MetingenService::class),

    // ── Verbruik & dienst (waterbeheer-domein) ────────────────────────────────
    IVerbruikRepository::class => DI\autowire(VerbruikRepository::class),
    IVerbruikService::class => DI\autowire(VerbruikService::class),
    IDienstRepository::class => DI\autowire(DienstRepository::class),
    IDienstService::class => DI\autowire(DienstService::class),

    // ── Coördinatoren (coordinator-domein) ────────────────────────────────────
    ICoordinatorenRepository::class => DI\get(CoordinatorenRepository::class),
    ICoordinatorenLogboekRepository::class => DI\autowire(CoordinatorenLogboekRepository::class),
    ICoordinatorenService::class => DI\autowire(CoordinatorenService::class),

    // ── Rondetaken & taken (waterbeheer-domein) ───────────────────────────────
    IRondetakenRepository::class => DI\autowire(RondetakenRepository::class),
    IRondetakenService::class => DI\autowire(RondetakenService::class),
    ITakenService::class => DI\autowire(TakenService::class),

    // ── Configuratie (beheer-domein) ──────────────────────────────────────────
    IConfiguratieRepository::class => DI\autowire(ConfiguratieRepository::class),
    IConfiguratieService::class => DI\autowire(ConfiguratieService::class),

    // ── Logboek (waterbeheer-domein) ──────────────────────────────────────────
    ILogboekRepository::class => DI\autowire(LogboekRepository::class),
    ILogboekService::class => DI\autowire(LogboekService::class),

    // ── Trend (waterbeheer-domein) ────────────────────────────────────────────
    ITrendRepository::class => DI\autowire(TrendRepository::class),
    ITrendService::class => DI\autowire(TrendService::class),

    // ── Databasebeheer (beheer-domein) ────────────────────────────────────────
    IDatabaseRepository::class => DI\autowire(DatabaseRepository::class),
    IDatabaseService::class => DI\autowire(DatabaseService::class),
];
