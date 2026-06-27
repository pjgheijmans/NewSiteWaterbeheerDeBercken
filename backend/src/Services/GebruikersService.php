<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IGebruikersRepository;

/**
 * Bedrijfslogica voor gebruikersbeheer (CRUD) — port van GebruikersService.ts.
 * Delegeert (voorlopig) rechtstreeks naar de repository, net als in de Node-backend.
 */
class GebruikersService implements IGebruikersService
{
    public function __construct(private IGebruikersRepository $repo)
    {
    }

    public function getAll(): array
    {
        return $this->repo->getAll();
    }

    public function create(array $data): void
    {
        $this->repo->create($data);
    }

    public function update(string $id, array $data): void
    {
        $this->repo->update($id, $data);
    }

    public function remove(string $id): void
    {
        $this->repo->remove($id);
    }
}
