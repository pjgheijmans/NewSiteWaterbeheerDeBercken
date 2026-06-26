<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Services\IGebruikersService;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/GebruikersController.ts.
 * Beheer-domein; de auth-/rechtcontrole zit op de routes (zie config/routes.php):
 *   GET    /api/gebruikers       (beheer, lezen)    → GebruikerRecord[]
 *   POST   /api/gebruikers       (beheer, schrijven)→ { status: 'success' }
 *   PUT    /api/gebruikers/{id}  (beheer, schrijven)→ { status: 'success' }
 *   DELETE /api/gebruikers/{id}  (beheer, schrijven)→ { status: 'success' }
 */
class GebruikersController
{
    public function __construct(private IGebruikersService $service)
    {
    }

    public function getAll(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->service->getAll());
    }

    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = Validator::gebruiker((array) $request->getParsedBody(), true);
        $this->service->create($data);

        return Json::write($response, ['status' => 'success']);
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = Validator::gebruiker((array) $request->getParsedBody(), false);
        $this->service->update((string) $args['id'], $data);

        return Json::write($response, ['status' => 'success']);
    }

    public function remove(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $this->service->remove((string) $args['id']);

        return Json::write($response, ['status' => 'success']);
    }
}
