<?php

declare(strict_types=1);

namespace Zwembad\Tests\Support;

use DI\ContainerBuilder;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Slim\App;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Zwembad\Errors\JsonErrorHandler;

/**
 * Basis voor controller-tests: bouwt de ECHTE Slim-app (routes + middleware +
 * foutafhandeling), maar overschrijft de service/repository onder test met een mock.
 * Zo wordt per request de hele keten getest — routing, AuthMiddleware (401),
 * RechtenMiddleware (403), validatie (400) en de JSON-contractvorm — zonder DB.
 *
 * SessionMiddleware wordt bewust NIET gemount; we zetten $_SESSION rechtstreeks
 * (geen DB-config-read, geen sessielock in CLI).
 */
abstract class AppTestCase extends TestCase
{
    /** @var array<string,object> */
    private array $overrides = [];

    protected function setUp(): void
    {
        $_SESSION = [];
        $this->overrides = [];
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
    }

    /** Vervang een container-binding (bv. een I*Service) door een mock. */
    protected function override(string $id, object $mock): void
    {
        $this->overrides[$id] = $mock;
    }

    /**
     * Stuur een request door de app.
     * @param array{query?:array<string,mixed>,body?:mixed,gebruiker?:array<string,mixed>} $opts
     */
    protected function dispatch(string $method, string $path, array $opts = []): ResponseInterface
    {
        $_SESSION = [];
        if (isset($opts['gebruiker'])) {
            $_SESSION['gebruiker'] = $opts['gebruiker'];
        }
        $req = (new ServerRequestFactory())->createServerRequest($method, $path);
        if (isset($opts['query'])) {
            $req = $req->withQueryParams($opts['query']);
        }
        if (array_key_exists('body', $opts)) {
            $req = $req->withParsedBody($opts['body']);
        }

        return $this->maakApp()->handle($req);
    }

    /** @return array<string,mixed> */
    protected function json(ResponseInterface $res): array
    {
        return json_decode((string) $res->getBody(), true) ?? [];
    }

    /** Een gebruiker met de gegeven rechten (voor de RBAC-routes). */
    protected function gebruiker(array $rechten = [], bool $magHistorie = true): array
    {
        return [
            'id' => 1, 'gebruikersnaam' => 'tester', 'voornaam' => 'Test', 'achternaam' => 'User',
            'inlognaam' => 'tester', 'rechten' => $rechten, 'magHistorie' => $magHistorie, 'rolNamen' => [],
        ];
    }

    private function maakApp(): App
    {
        $builder = new ContainerBuilder();
        $builder->addDefinitions(self::definities());
        if ($this->overrides !== []) {
            $builder->addDefinitions($this->overrides);
        }
        AppFactory::setContainer($builder->build());

        $app = AppFactory::create();
        $app->addBodyParsingMiddleware();
        $app->addRoutingMiddleware();
        (self::routes())($app);
        $app->addErrorMiddleware(false, false, false)->setDefaultErrorHandler(JsonErrorHandler::class);

        return $app;
    }

    /**
     * Config-definities één keer inladen. `require` van een file met `return`
     * levert bij een TWEEDE require slechts `1` op (al-geïncludeerd) — daarom cachen.
     * @return array<string,mixed>
     */
    private static function definities(): array
    {
        static $defs = null;
        if ($defs === null) {
            $defs = array_merge(
                require dirname(__DIR__, 2) . '/config/settings.php',
                require dirname(__DIR__, 2) . '/config/dependencies.php',
            );
        }

        return $defs;
    }

    private static function routes(): callable
    {
        static $fn = null;
        if ($fn === null) {
            $fn = require dirname(__DIR__, 2) . '/config/routes.php';
        }

        return $fn;
    }
}
