<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IConfiguratieService.ts.
 */
interface IConfiguratieService
{
    /** Laadt de configuratie in de (per-request) cache; faalt zacht zonder DB. */
    public function laadCache(): void;

    /** @return array<int,array{sleutel:string,waarde:string,omschrijving:?string,type:string}> */
    public function getAll(): array;

    /** Sessie-time-out in milliseconden (uit de cache/defaults). */
    public function getSessieTimeoutMs(): int;

    /** Valideert en bewaart één instelling en ververst de cache. */
    public function update(string $sleutel, string $waarde): void;
}
