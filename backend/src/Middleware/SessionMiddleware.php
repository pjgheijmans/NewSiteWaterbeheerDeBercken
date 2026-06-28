<?php

declare(strict_types=1);

namespace Zwembad\Middleware;

use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Zwembad\Services\IConfiguratieService;

/**
 * Start de PHP-sessie en handhaaft de instelbare idle/sliding time-out —
 * vervangt express-session (rolling: true, maxAge = sessie_timeout).
 *
 * Alleen voor API-requests (/api/...): de frontend-pagina en de statische assets
 * hebben geen sessie nodig. Dat voorkomt cookie-ruis én PHP-sessielock-contentie
 * wanneer de browser de ~19 JS-bestanden parallel ophaalt.
 *
 * De ContainerInterface wordt geïnjecteerd (niet IConfiguratieService zelf) zodat
 * de configuratie/PDO-keten pas wordt opgebouwd bij een echt /api-verzoek — op de
 * publieke pagina-/asset-routes wordt zo géén DB-verbinding geopend.
 *
 * Native PHP-sessies zijn bestand-gebaseerd en blijven bestaan over herstarts heen
 * (anders dan de in-memory MemoryStore van Node). Zet 'secure' aan bij HTTPS.
 */
class SessionMiddleware implements MiddlewareInterface
{
    public function __construct(private ContainerInterface $container)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $pad = $request->getUri()->getPath();
        $isApi = $pad === '/api' || strncmp($pad, '/api/', 5) === 0;
        if (!$isApi) {
            return $handler->handle($request);
        }

        // Idle/sliding time-out uit de configuratie. Val zacht terug op 5 min als de
        // config (of de DB) niet beschikbaar is — dan crasht een sessieloos endpoint
        // als /api/ingelogd niet, net als bij Node's soft-fallback.
        $timeoutSec = 300;
        try {
            $config = $this->container->get(IConfiguratieService::class);
            $config->laadCache();
            $timeoutSec = max(60, (int) round($config->getSessieTimeoutMs() / 1000));
        } catch (\Throwable $e) {
            error_log('Sessie-time-out config laden mislukt, gebruik default: ' . $e->getMessage());
        }

        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_set_cookie_params([
                'lifetime' => $timeoutSec,
                'path' => '/',
                'httponly' => true,
                'samesite' => 'Lax',
                // 'secure' => true, // AANZETTEN in productie (HTTPS)
            ]);
            session_start();
        }

        $nu = time();
        $laatste = isset($_SESSION['_laatste_activiteit']) ? (int) $_SESSION['_laatste_activiteit'] : null;

        // Verlopen door inactiviteit? → sessie wissen zodat checkAuth 401 geeft
        // (de frontend toont dan "sessie verlopen", net als bij Node).
        if (!empty($_SESSION['gebruiker']) && $laatste !== null && ($nu - $laatste) > $timeoutSec) {
            $_SESSION = [];
            session_regenerate_id(true);
        }

        // Activiteit bijwerken (sliding) en de client-cookie mee laten rollen.
        $_SESSION['_laatste_activiteit'] = $nu;
        if (!empty($_SESSION['gebruiker'])) {
            $p = session_get_cookie_params();
            setcookie(session_name(), session_id(), [
                'expires' => $nu + $timeoutSec,
                'path' => $p['path'],
                'domain' => $p['domain'],
                'secure' => $p['secure'],
                'httponly' => $p['httponly'],
                'samesite' => $p['samesite'] !== '' ? $p['samesite'] : 'Lax',
            ]);
        }

        return $handler->handle($request);
    }
}
