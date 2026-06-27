<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Errors\AppError;
use Zwembad\Services\ILogboekService;
use Zwembad\Support\Historie;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/LogboekController.ts. Waterbeheer-domein.
 *   GET    /api/logboek       (lezen)    → LogboekEntry[]
 *   POST   /api/logboek       (schrijven + historie) → { status, id, auteur }
 *   DELETE /api/logboek/{id}  (schrijven; historie in de service)
 */
class LogboekController
{
    public function __construct(private ILogboekService $service)
    {
    }

    public function getByDatum(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, $this->service->getByDatum($datum));
    }

    public function save(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::logboek((array) $request->getParsedBody());
        $gebruiker = $_SESSION['gebruiker'] ?? null;
        if (!Historie::magDatumBewerken($body['datum'], $gebruiker)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        $r = $this->service->save($body['datum'], $body['tijdstip'], $body['tekst'], $gebruiker ?? []);

        return Json::write($response, ['status' => 'success', 'id' => $r['id'], 'auteur' => $r['auteur']]);
    }

    public function deleteById(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $this->service->deleteById((string) $args['id'], $_SESSION['gebruiker'] ?? []);

        return Json::write($response, ['status' => 'success']);
    }
}
