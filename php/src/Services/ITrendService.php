<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/ITrendService.ts.
 */
interface ITrendService
{
    /** @return array<int,array<string,mixed>> */
    public function getMetingenTrend(string $van, string $tot): array;

    /** @return array{algemeen:array<int,array<string,mixed>>,peuterbad:array<int,array<string,mixed>>} */
    public function getVerbruikTrend(string $van, string $tot): array;
}
