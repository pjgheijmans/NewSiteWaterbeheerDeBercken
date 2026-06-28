<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Errors\AppError;
use Zwembad\Services\IDienstService;
use Zwembad\Support\Historie;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/DienstController.ts.
 *   GET  /api/dienst                 (alleen ingelogd) → { dienst_1, dienst_2 }
 *   GET  /api/dienst/waterbeheerders (alleen ingelogd) → string[]
 *   POST /api/dienst                 (waterbeheer, schrijven + historie) → { status }
 */
class DienstController
{
    public function __construct(private IDienstService $service)
    {
    }

    public function getDienst(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, (object) $this->service->getDienst($datum));
    }

    public function getWaterbeheerders(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getWaterbeheerders());
    }

    public function save(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::dienst((array) $request->getParsedBody());
        if (!Historie::magDatumBewerken($body['datum'], $_SESSION['gebruiker'] ?? null)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
        $this->service->saveDienst($body);

        return Json::write($response, ['status' => 'success']);
    }
}
