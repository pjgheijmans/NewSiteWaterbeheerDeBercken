<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\ILimietenService;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/LimietenController.ts. Beheer-domein.
 *   GET  /api/limieten           (beheer, lezen)    → { param: {min,max}, ... }
 *   GET  /api/limieten/defaults  (beheer, lezen)    → idem (ingebouwde defaults)
 *   POST /api/limieten           (beheer, schrijven)→ { status: 'success' }
 *
 * (object)-cast: de limieten zijn een MAP, niet een lijst — zo blijft het JSON
 * een object (en wordt een lege map {} i.p.v. []).
 */
class LimietenController
{
    public function __construct(private ILimietenService $service)
    {
    }

    public function getAll(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, (object) $this->service->getAll());
    }

    public function getDefaults(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, (object) $this->service->getDefaults());
    }

    public function save(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = Validator::limiet((array) $request->getParsedBody());
        $this->service->save($data);

        return Json::write($response, ['status' => 'success']);
    }
}
