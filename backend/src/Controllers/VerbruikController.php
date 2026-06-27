<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Errors\AppError;
use Zwembad\Services\IVerbruikService;
use Zwembad\Support\Auteur;
use Zwembad\Support\Historie;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/VerbruikController.ts. Waterbeheer-domein.
 *   GET  /api/verbruik/diep-ondiep            | /diep-ondiep/vorige
 *   POST /api/verbruik/diep-ondiep            (+ historie)
 *   GET  /api/verbruik/verwarmingssysteem
 *   POST /api/verbruik/verwarmingssysteem     (+ historie)
 */
class VerbruikController
{
    public function __construct(private IVerbruikService $service)
    {
    }

    public function getVerbruik(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, (object) $this->service->getVerbruik($datum));
    }

    public function getVorigeVerbruik(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, (object) $this->service->getVorigeVerbruik($datum));
    }

    public function postVerbruik(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::metDatum((array) $request->getParsedBody());
        $meta = $this->service->saveVerbruik($body, $this->auteurNaHistorieCheck($body['datum']));

        return Json::write($response, ['status' => 'success'] + $meta);
    }

    public function getVerwarming(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? '');

        return Json::write($response, (object) $this->service->getVerwarming($datum));
    }

    public function postVerwarming(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = Validator::metDatum((array) $request->getParsedBody());
        $meta = $this->service->saveVerwarming($body, $this->auteurNaHistorieCheck($body['datum']));

        return Json::write($response, ['status' => 'success'] + $meta);
    }

    /** Historie-recht controleren (vereistHistorieRecht) en de auteursnaam bepalen. */
    private function auteurNaHistorieCheck(string $datum): string
    {
        $gebruiker = $_SESSION['gebruiker'] ?? null;
        if (!Historie::magDatumBewerken($datum, $gebruiker)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }

        return Auteur::bepaal($gebruiker ?? []);
    }
}
