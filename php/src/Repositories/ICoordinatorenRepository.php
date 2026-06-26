<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/ICoordinatorenRepository.ts.
 * Breidt IDaggegevensProvider uit (getDaggegevens hoort er ook bij).
 */
interface ICoordinatorenRepository extends IDaggegevensProvider
{
    /** @return array<int,array{tijdstip:string,auteur:string,metingen:array<int,array<string,mixed>>}> Meetblokken per tijdstip. */
    public function getCoordinatoren(string $datum): array;

    public function getBadId(string $badNaam): int;

    /** @param array<string,mixed> $data */
    public function saveMeting(int $badId, array $data, ?string $auteur): void;

    public function deleteBlok(string $datum, string $tijdstip): void;

    /** @return array<string,mixed> */
    public function getChecklist(string $datum): array;

    /** @param array<string,mixed> $data */
    public function saveChecklist(string $datum, array $data, ?string $auteur): void;

    /** @param array<string,mixed> $data */
    public function saveDaggegevens(string $datum, array $data, ?string $auteur): void;
}
