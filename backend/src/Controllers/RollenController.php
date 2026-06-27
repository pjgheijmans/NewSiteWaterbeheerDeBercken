<?php

declare(strict_types=1);

namespace Zwembad\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Zwembad\Repositories\IRollenRepository;
use Zwembad\Support\Json;
use Zwembad\Validation\Validator;

/**
 * Port van backend/controllers/RollenController.ts. Beheer van rollen en hun
 * rechtenmatrix — praat (net als in Node) rechtstreeks met de repository, zonder
 * aparte service. Auth-/rechtcontrole staat op de routes (config/routes.php).
 *   GET    /api/rollen       (beheer, lezen)    → Rol[]
 *   POST   /api/rollen       (beheer, schrijven)→ { status: 'success' }
 *   PUT    /api/rollen/{id}  (beheer, schrijven)→ { status: 'success' }
 *   DELETE /api/rollen/{id}  (beheer, schrijven)→ { status: 'success' }
 */
class RollenController
{
    public function __construct(private IRollenRepository $repo)
    {
    }

    public function getAll(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Json::write($response, $this->repo->getAll());
    }

    public function create(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = Validator::rolCreate((array) $request->getParsedBody());
        $this->repo->create($data['naam']);

        return Json::write($response, ['status' => 'success']);
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = Validator::rolUpdate((array) $request->getParsedBody());
        $this->repo->update((string) $args['id'], $data);

        return Json::write($response, ['status' => 'success']);
    }

    public function remove(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $this->repo->remove((string) $args['id']);

        return Json::write($response, ['status' => 'success']);
    }
}
