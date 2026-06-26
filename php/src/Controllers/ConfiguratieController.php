<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\IConfiguratieService;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/ConfiguratieController.ts. Beheer-domein.
 *   GET /api/configuratie           (beheer, lezen)    → Configuratie[]
 *   PUT /api/configuratie/{sleutel} (beheer, schrijven)→ { status: 'success' }
 */
class ConfiguratieController
{
    public function __construct(private IConfiguratieService $service)
    {
    }

    public function getAll(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getAll());
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $body = Validator::configuratie((array) $request->getParsedBody());
        $this->service->update((string) $args['sleutel'], $body['waarde']);

        return Json::write($response, ['status' => 'success']);
    }
}
