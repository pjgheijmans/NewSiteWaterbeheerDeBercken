<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/ILogboekRepository.ts (waterbeheer-logboek).
 */
interface ILogboekRepository
{
    /** @return array<int,array{id:int,tijdstip:string,auteur:?string,tekst:string}> */
    public function getByDatum(string $datum): array;

    /** @return array{id:int,auteur:?string}|null */
    public function save(string $datum, string $tijdstip, string $tekst, ?string $auteur): ?array;

    /** Datum (YYYY-MM-DD) van een regel, of null als de regel niet bestaat. */
    public function getDatumById(string $id): ?string;

    public function deleteById(string $id): void;
}
