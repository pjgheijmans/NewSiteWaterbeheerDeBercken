<?php

declare(strict_types=1);

namespace Zwembad\Middleware;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Zwembad\Support\Json;

/**
 * Eist een ingelogde gebruiker — port van checkAuth (backend/middleware/auth.ts).
 * Geen actieve sessie → 401 JSON { error: "Niet ingelogd" }.
 *
 * Hang dit per beschermde route(groep): $app->group(...)->add(AuthMiddleware::class).
 * De rol-/rechtcontroles (vereist(), vereistHistorieRecht()) volgen bij het porten
 * van de bijbehorende domeinen.
 */
class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(private ResponseFactoryInterface $responseFactory)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (empty($_SESSION['gebruiker'])) {
            return Json::write($this->responseFactory->createResponse(), ['error' => 'Niet ingelogd'], 401);
        }

        return $handler->handle($request);
    }
}
