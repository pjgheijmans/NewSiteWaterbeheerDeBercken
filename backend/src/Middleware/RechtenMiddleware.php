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
 * Eist minstens $niveau in $domein — port van de `vereist()`-middlewarefabriek
 * (backend/middleware/auth.ts). Onvoldoende recht → 403 JSON { error: "Geen toegang" }.
 *
 * Veronderstelt dat AuthMiddleware ervóór draait (sessie aanwezig). In Slim
 * betekent dat: AuthMiddleware als LAATSTE op de route ->add()'en, zodat hij
 * buitenom draait en eerst 401 kan geven (zoals checkAuth vóór vereist in Node).
 */
class RechtenMiddleware implements MiddlewareInterface
{
    /** Niveaus oplopend in macht. */
    private const RANG = ['geen' => 0, 'lezen' => 1, 'schrijven' => 2];

    public function __construct(
        private string $domein,
        private string $niveau,
        private ResponseFactoryInterface $responseFactory,
    ) {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $gebruiker = $_SESSION['gebruiker'] ?? null;
        $huidig = $gebruiker['rechten'][$this->domein] ?? 'geen';

        if (self::RANG[$huidig] < self::RANG[$this->niveau]) {
            return Json::write($this->responseFactory->createResponse(), ['error' => 'Geen toegang'], 403);
        }

        return $handler->handle($request);
    }
}
