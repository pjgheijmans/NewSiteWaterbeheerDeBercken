<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IRollenRepository.ts.
 */
interface IRollenRepository
{
    /** @return array<int,array<string,mixed>> Rollen incl. complete rechtenmatrix. */
    public function getAll(): array;

    public function create(string $naam): void;

    /** @param array<string,mixed> $data naam, mag_historie_bewerken, rechten */
    public function update(string $id, array $data): void;

    public function remove(string $id): void;
}
