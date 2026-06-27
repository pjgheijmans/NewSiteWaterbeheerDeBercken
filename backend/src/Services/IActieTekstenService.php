<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IActieTekstenService.ts.
 */
interface IActieTekstenService
{
    /** @return list<array{actie_sleutel:string,sjabloon:string,omschrijving:?string}> */
    public function getAll(): array;

    /** @return list<array{actie_sleutel:string,sjabloon:string,omschrijving:?string}> */
    public function getDefaults(): array;

    /** @param array{actie_sleutel:string,sjabloon:string} $data */
    public function save(array $data): void;
}
