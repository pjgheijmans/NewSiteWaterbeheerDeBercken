<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Errors\AppError;
use Zwembad\Services\IRondetakenService;
use Zwembad\Support\Historie;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/RondetakenController.ts. Waterbeheer-domein.
 *   GET  /api/rondetaken                  (lezen)    → Rondetaak[]
 *   POST /api/rondetaken/{sleutel}/voltooi (schrijven + historie)
 *   POST /api/rondetaken/{sleutel}/heropen (schrijven + historie)
 */
class RondetakenController
{
    public function __construct(private IRondetakenService $service)
    {
    }

    public function getRondetaken(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $datum = (string) ($request->getQueryParams()['datum'] ?? gmdate('Y-m-d'));

        return Json::write($response, $this->service->getRondetaken($datum));
    }

    public function voltooi(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $body = Validator::metDatum((array) $request->getParsedBody());
        $this->eisHistorie($body['datum']);
        $this->service->voltooi((string) $args['sleutel'], $body['datum'], $_SESSION['gebruiker'] ?? []);

        return Json::write($response, ['status' => 'success']);
    }

    public function heropen(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $body = Validator::metDatum((array) $request->getParsedBody());
        $this->eisHistorie($body['datum']);
        $this->service->heropen((string) $args['sleutel'], $body['datum']);

        return Json::write($response, ['status' => 'success']);
    }

    private function eisHistorie(string $datum): void
    {
        if (!Historie::magDatumBewerken($datum, $_SESSION['gebruiker'] ?? null)) {
            throw new AppError('Een datum in het verleden mag je niet bewerken', 403);
        }
    }
}
