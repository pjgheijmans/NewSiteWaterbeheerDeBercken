<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/ICoordinatorenService.ts.
 * De gebruiker-parameter is de sessie-gebruiker (array); de service bepaalt zelf
 * de auteursnaam via Support\Auteur.
 */
interface ICoordinatorenService
{
    /** @return array<int,array<string,mixed>> */
    public function getCoordinatoren(string $datum): array;

    /** @param array<string,mixed> $body @param array<string,mixed> $gebruiker */
    public function saveMeting(array $body, array $gebruiker): void;

    /** @return array<string,mixed> */
    public function getChecklist(string $datum): array;

    /** @param array<string,mixed> $body @param array<string,mixed> $gebruiker */
    public function saveChecklist(string $datum, array $body, array $gebruiker): void;

    /** @return array<string,mixed> */
    public function getDaggegevens(string $datum): array;

    /** @param array<string,mixed> $body @param array<string,mixed> $gebruiker */
    public function saveDaggegevens(string $datum, array $body, array $gebruiker): void;

    public function deleteBlok(string $datum, string $tijdstip): void;

    /** @return array<int,array<string,mixed>> */
    public function getLogboek(string $datum): array;

    /**
     * @param array<string,mixed> $gebruiker
     * @return array{id:?int,auteur:string}
     */
    public function saveLogboek(string $datum, string $tijdstip, string $tekst, array $gebruiker): array;

    /** @param array<string,mixed> $gebruiker */
    public function deleteLogboek(string $id, array $gebruiker): void;
}
