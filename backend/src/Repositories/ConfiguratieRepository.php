<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/ConfiguratieRepository.ts — de generieke
 * `configuratie`-tabel (sleutel/waarde).
 */
class ConfiguratieRepository implements IConfiguratieRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getAll(): array
    {
        return $this->pdo
            ->query('SELECT sleutel, waarde, omschrijving, type FROM configuratie ORDER BY sleutel')
            ->fetchAll();
    }

    public function upsert(string $sleutel, string $waarde): void
    {
        $this->pdo->prepare(
            'INSERT INTO configuratie (sleutel, waarde) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE waarde = VALUES(waarde)',
        )->execute([$sleutel, $waarde]);
    }
}
