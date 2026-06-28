<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Errors\AppError;
use Zwembad\Services\IMetingenService;
use Zwembad\Support\Auteur;
use Zwembad\Support\Historie;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/MetingenController.ts. Waterbeheer-domein;
 * auth-/rechtcontrole staat op de routes (config/routes.php). De historie-recht-
 * controle (vereistHistorieRecht) gebeurt hier ná validatie — net als de
 * middlewarevolgorde in de Node-backend.
 *   GET  /api/metingen | POST /api/metingen
 *   GET  /api/acties   | POST /api/acties/{id}/resolve | .../unresolve
 *   GET  /api/bezoekers | GET /api/gebonden-chloor
 */
class MetingenController
{
    public function __construct(private IMetingenService $service)
    {
    }

    public function getMetingen(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, $this->service->getMetingen($datum));
    }

    public function postMeting(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::meting((array) $request->getParsedBody());
        $gebruiker = $_SESSION['gebruiker'] ?? null;
        if (!Historie::magDatumBewerken($body['datum'], $gebruiker)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        $meta = $this->service->saveMeting($body, Auteur::bepaal($gebruiker ?? []));

        return Json::write($response, ['status' => 'success'] + $meta);
    }

    public function getActies(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        // Default = vandaag (UTC), gelijk aan new Date().toISOString().split('T')[0] in Node.
        $datum = (string) ($request->getQueryParams()['datum'] ?? gmdate('Y-m-d'));

        return Json::write($response, $this->service->getActies($datum));
    }

    public function resolveActie(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $this->service->resolveActie((string) $args['id'], $_SESSION['gebruiker'] ?? []);

        return Json::write($response, ['status' => 'success']);
    }

    public function unresolveActie(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $this->service->unresolveActie((string) $args['id']);

        return Json::write($response, ['status' => 'success']);
    }

    public function getBezoekers(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, (object) $this->service->getBezoekers($datum));
    }

    public function getGebondenChloor(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, (object) $this->service->getGebondenChloor($datum));
    }
}
