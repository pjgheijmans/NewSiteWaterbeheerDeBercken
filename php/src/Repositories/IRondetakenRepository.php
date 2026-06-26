<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IRondetakenRepository.ts.
 */
interface IRondetakenRepository
{
    /** @return array<int,array<string,mixed>> Catalogus samengevoegd met de dagvoltooiingen. */
    public function getRondetaken(string $datum): array;

    public function voltooi(string $sleutel, string $datum, ?string $door): void;

    public function heropen(string $sleutel, string $datum): void;
}
