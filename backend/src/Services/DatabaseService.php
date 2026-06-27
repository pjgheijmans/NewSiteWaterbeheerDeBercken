<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Errors\AppError;
use Zwembad\Repositories\IDatabaseRepository;

/**
 * Bedrijfslogica voor databasebeheer — port van DatabaseService.ts.
 * CSV is semicolon-gescheiden (EU-Excel) met \r\n-regeleindes.
 */
class DatabaseService implements IDatabaseService
{
    /** Tabellen waarvoor bad_naam tijdens import naar bad_id moet worden vertaald. */
    private const NEED_BAD_ID = ['metingen_diep_ondiep', 'metingen_coordinatoren', 'metingen_peuterbad'];

    public function __construct(private IDatabaseRepository $repo)
    {
    }

    public function exporteerCsv(string $tabel): ?string
    {
        $rows = $this->repo->exportRows($tabel);
        if ($rows === []) {
            return null;
        }

        $kolommen = array_keys($rows[0]);
        $csv = implode(';', $kolommen) . "\r\n";
        foreach ($rows as $rij) {
            $cellen = array_map(static function (string $k) use ($rij): string {
                $w = $rij[$k] ?? null;
                if ($w === null) {
                    return '';
                }
                $s = (string) $w;
                // DATETIME/TIMESTAMP "Y-m-d H:i:s" → alleen de datum (zoals Node's Date→ISO-split).
                if (preg_match('/^(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}$/', $s, $m) === 1) {
                    return $m[1];
                }

                return str_replace(';', ',', $s);
            }, $kolommen);
            $csv .= implode(';', $cellen) . "\r\n";
        }

        return $csv;
    }

    public function importeerCsv(string $tabel, string $ruweTekst): void
    {
        if ($ruweTekst === '') {
            throw new AppError('Geen CSV data ontvangen', 400);
        }
        $regels = array_values(array_filter(
            preg_split('/\r?\n/', $ruweTekst),
            static fn (string $l): bool => trim($l) !== '',
        ));
        if (count($regels) < 2) {
            throw new AppError('CSV-bestand bevat geen data', 400);
        }

        $kolommen = explode(';', $regels[0]);
        try {
            $this->repo->setForeignKeyChecks(false);
            foreach (array_slice($regels, 1) as $regel) {
                $waarden = explode(';', $regel);
                if (count($waarden) !== count($kolommen)) {
                    continue;
                }

                $rij = [];
                foreach ($kolommen as $i => $k) {
                    $rij[$k] = trim($waarden[$i]) !== '' ? trim($waarden[$i]) : null;
                }

                if (in_array($tabel, self::NEED_BAD_ID, true)) {
                    $badId = $this->repo->getBadId($rij['bad_naam'] ?? '');
                    if ($badId !== null) {
                        $rij['bad_id'] = (string) $badId;
                    }
                    unset($rij['bad_naam']);
                }

                $cols = array_values(array_filter(array_keys($rij), static fn (string $k): bool => $k !== 'id'));
                $this->repo->importRow($tabel, $cols, array_map(static fn (string $k) => $rij[$k], $cols));
            }
            $this->repo->setForeignKeyChecks(true);
        } catch (\Throwable $e) {
            // FK-checks weer aan vóór doorgooien, zodat de DB-staat consistent blijft.
            $this->repo->setForeignKeyChecks(true);
            throw $e;
        }
    }

    public function truncate(string $tabel): void
    {
        $this->repo->truncate($tabel);
    }

    public function wisAlles(): void
    {
        $this->repo->truncateAll();
    }

    public function initialiseer(): void
    {
        $this->repo->runInitSql();
        $this->repo->truncateAll();
        $this->repo->seedAllDefaults();
    }
}
