<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\ILimietenRepository;

/**
 * Bedrijfslogica voor limieten/grenswaarden — port van LimietenService.ts.
 */
class LimietenService implements ILimietenService
{
    public function __construct(private ILimietenRepository $repo)
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
