<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/ITakenService.ts.
 */
interface ITakenService
{
    /** @return array<int,array<string,mixed>> Samengestelde taken-/actielijst voor een dag. */
    public function getTaken(string $datum): array;
}
