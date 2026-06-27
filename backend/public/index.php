<?php

declare(strict_types=1);

use DI\ContainerBuilder;
use Slim\Factory\AppFactory;
use Zwembad\Errors\JsonErrorHandler;
use Zwembad\Middleware\SessionMiddleware;

require __DIR__ . '/../vendor/autoload.php';

// ── DI-container opbouwen ────────────────────────────────────────────────────
// settings.php = configuratie (DB-gegevens); dependencies.php = bindingen
// (interface → implementatie), net als de factory-functies in de Node-backend.
$builder = new ContainerBuilder();
$builder->addDefinitions(require __DIR__ . '/../config/settings.php');
$builder->addDefinitions(require __DIR__ . '/../config/dependencies.php');
$container = $builder->build();

AppFactory::setContainer($container);
$app = AppFactory::create();

// JSON-body parsen (vult getParsedBody() voor POST/PUT — vervangt express.json()).
$app->addBodyParsingMiddleware();

// Sessie starten voor elke request (vervangt express-session).
$app->add(SessionMiddleware::class);

$app->addRoutingMiddleware();

// Routes monteren.
(require __DIR__ . '/../config/routes.php')($app);

// ── Centrale foutafhandeling (na de routes) ───────────────────────────────────
// Vervangt backend/middleware/errorHandler.ts: AppError → eigen status, rest → 500,
// altijd als JSON { error: "..." }.
$errorMiddleware = $app->addErrorMiddleware(false, true, true);
$errorMiddleware->setDefaultErrorHandler(JsonErrorHandler::class);

$app->run();
