<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IRondetakenService.ts.
 */
interface IRondetakenService
{
    /** @return array<int,array<string,mixed>> */
    public function getRondetaken(string $datum): array;

    /** @param array<string,mixed> $gebruiker */
    public function voltooi(string $sleutel, string $datum, array $gebruiker): void;

    public function heropen(string $sleutel, string $datum): void;
}
