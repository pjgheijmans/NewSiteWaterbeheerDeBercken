<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IMetingenRepository.ts.
 */
interface IMetingenRepository
{
    /** @return array<int,array<string,mixed>> Eén rij per bad (LEFT JOIN; null als nog niet gemeten). */
    public function getMetingen(string $datum): array;

    public function getBadId(string $badNaam): int;

    /**
     * @param array<string,mixed> $data
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function savePeuterbadMeting(int $badId, array $data, ?string $auteur, ?int $verwachteVersie): array;

    /**
     * @param array<string,mixed> $data
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function saveGrootBadMeting(int $badId, array $data, ?string $auteur, ?int $verwachteVersie): array;
}
