<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IGebruikersService.ts.
 */
interface IGebruikersService
{
    /** @return array<int,array<string,mixed>> */
    public function getAll(): array;

    /** @param array<string,mixed> $data */
    public function create(array $data): void;

    /** @param array<string,mixed> $data */
    public function update(string $id, array $data): void;

    public function remove(string $id): void;
}
