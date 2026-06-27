<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/DienstRepository.ts. Bewaart per dag wie er dienst
 * had bij waterbeheer (twee personen); upsert per datum.
 */
class DienstRepository implements IDienstRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getDienst(string $datum): array
    {
        $stmt = $this->pdo->prepare('SELECT dienst_1, dienst_2 FROM waterbeheer_dienst WHERE datum = ?');
        $stmt->execute([$datum]);
        $rij = $stmt->fetch();

        return $rij !== false ? $rij : ['dienst_1' => null, 'dienst_2' => null];
    }

    public function saveDienst(array $data): void
    {
        $this->pdo->prepare(
            'INSERT INTO waterbeheer_dienst (datum, dienst_1, dienst_2) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE dienst_1 = VALUES(dienst_1), dienst_2 = VALUES(dienst_2)',
        )->execute([$data['datum'], $data['dienst_1'] ?? null, $data['dienst_2'] ?? null]);
    }
}
