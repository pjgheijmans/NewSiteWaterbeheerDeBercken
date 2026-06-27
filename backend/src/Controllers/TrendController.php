<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\ITrendService;
use Zwembad\Support\Json;

/**
 * Port van backend/controllers/TrendController.ts. Read-only (waterbeheer, lezen).
 *   GET /api/trend/metingen?van=&tot= → TrendMetingRow[]
 *   GET /api/trend/verbruik?van=&tot= → { algemeen, peuterbad }
 */
class TrendController
{
    public function __construct(private ITrendService $service)
    {
    }

    public function getMetingen(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $q = $request->getQueryParams();

        return Json::write($response, $this->service->getMetingenTrend(
            (string) ($q['van'] ?? ''),
            (string) ($q['tot'] ?? ''),
        ));
    }

    public function getVerbruik(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $q = $request->getQueryParams();

        return Json::write($response, (object) $this->service->getVerbruikTrend(
            (string) ($q['van'] ?? ''),
            (string) ($q['tot'] ?? ''),
        ));
    }
}
