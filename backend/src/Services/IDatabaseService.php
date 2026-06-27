<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IDatabaseService.ts.
 */
interface IDatabaseService
{
    /** Bouw een CSV-export voor een tabel; null als de tabel leeg is. */
    public function exporteerCsv(string $tabel): ?string;

    /** Parse en importeer CSV-tekst in een tabel (lost bad_naam → bad_id op waar nodig). */
    public function importeerCsv(string $tabel, string $ruweTekst): void;

    public function truncate(string $tabel): void;

    public function wisAlles(): void;

    public function initialiseer(): void;
}
