<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IActieTekstenRepository;

/**
 * Bedrijfslogica voor de tekst-sjablonen van acties — port van ActieTekstenService.ts.
 */
class ActieTekstenService implements IActieTekstenService
{
    public function __construct(private IActieTekstenRepository $repo)
    {
    }

    public function getAll(): array
    {
        return $this->repo->getAll();
    }

    public function getDefaults(): array
    {
        return $this->repo->getDefaults();
    }

    public function save(array $data): void
    {
        $this->repo->save($data);
    }
}
