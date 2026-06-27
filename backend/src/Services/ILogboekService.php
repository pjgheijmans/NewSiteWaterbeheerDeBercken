<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/ILogboekService.ts.
 */
interface ILogboekService
{
    /** @return array<int,array<string,mixed>> */
    public function getByDatum(string $datum): array;

    /**
     * @param array<string,mixed> $gebruiker
     * @return array{id:?int,auteur:string}
     */
    public function save(string $datum, string $tijdstip, string $tekst, array $gebruiker): array;

    /** @param array<string,mixed> $gebruiker */
    public function deleteById(string $id, array $gebruiker): void;
}
