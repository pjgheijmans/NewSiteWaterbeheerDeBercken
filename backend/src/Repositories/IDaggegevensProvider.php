<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IDaggegevensProvider.ts — minimale interface voor
 * het ophalen van daggegevens (voldoende voor de MetingenService/bezoekers).
 */
interface IDaggegevensProvider
{
    /** @return array<string,mixed> lucht_temperatuur, bezoekers_vandaag, auteur */
    public function getDaggegevens(string $datum): array;
}
