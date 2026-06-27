<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IConfiguratieRepository.ts.
 */
interface IConfiguratieRepository
{
    /** @return array<int,array{sleutel:string,waarde:string,omschrijving:?string,type:string}> */
    public function getAll(): array;

    public function upsert(string $sleutel, string $waarde): void;
}
