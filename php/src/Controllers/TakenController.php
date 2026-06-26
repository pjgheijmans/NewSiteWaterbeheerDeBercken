<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\ITakenService;
use Zwembad\Support\Json;

/**
 * Port van backend/controllers/TakenController.ts. Read-only samengestelde
 * taken-/actielijst (waterbeheer, lezen).
 *   GET /api/taken → TaakItem[]
 */
class TakenController
{
    public function __construct(private ITakenService $service)
    {
    }

    public function getTaken(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? gmdate('Y-m-d'));

        return Json::write($response, $this->service->getTaken($datum));
    }
}
