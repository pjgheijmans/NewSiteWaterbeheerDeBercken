<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\IActieTekstenService;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/ActieTekstenController.ts. Beheer-domein.
 *   GET  /api/actieteksten           (beheer, lezen)    → ActieTekst[]
 *   GET  /api/actieteksten/defaults  (beheer, lezen)    → ActieTekst[] (defaults)
 *   POST /api/actieteksten           (beheer, schrijven)→ { status: 'success' }
 */
class ActieTekstenController
{
    public function __construct(private IActieTekstenService $service)
    {
    }

    public function getAll(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getAll());
    }

    public function getDefaults(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getDefaults());
    }

    public function save(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = Validator::actieTekst((array) $request->getParsedBody());
        $this->service->save($data);

        return Json::write($response, ['status' => 'success']);
    }
}
