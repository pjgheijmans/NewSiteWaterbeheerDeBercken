<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/CoordinatorenLogboekRepository.ts.
 * Eén regel per (datum, tijdstip); auteur wordt alleen bij de eerste insert
 * vastgelegd (niet overschreven bij een duplicate-update van de tekst).
 */
class CoordinatorenLogboekRepository implements ICoordinatorenLogboekRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getByDatum(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, tijdstip, auteur, tekst FROM coordinatoren_logboek WHERE datum = ? ORDER BY tijdstip ASC',
        );
        $stmt->execute([$datum]);

        return array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'tijdstip' => $r['tijdstip'],
            'auteur' => $r['auteur'],
            'tekst' => $r['tekst'],
        ], $stmt->fetchAll());
    }

    public function save(string $datum, string $tijdstip, string $tekst, ?string $auteur): ?array
    {
        $this->pdo->prepare(
            'INSERT INTO coordinatoren_logboek (datum, tijdstip, auteur, tekst) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE tekst = VALUES(tekst)',
        )->execute([$datum, $tijdstip, $auteur, $tekst]);

        $stmt = $this->pdo->prepare(
            'SELECT id, auteur FROM coordinatoren_logboek WHERE datum = ? AND tijdstip = ?',
        );
        $stmt->execute([$datum, $tijdstip]);
        $row = $stmt->fetch();

        return $row !== false ? ['id' => (int) $row['id'], 'auteur' => $row['auteur']] : null;
    }

    public function getDatumById(string $id): ?string
    {
        $stmt = $this->pdo->prepare(
            "SELECT DATE_FORMAT(datum, '%Y-%m-%d') AS datum FROM coordinatoren_logboek WHERE id = ?",
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row !== false ? $row['datum'] : null;
    }

    public function deleteById(string $id): void
    {
        $this->pdo->prepare('DELETE FROM coordinatoren_logboek WHERE id = ?')->execute([$id]);
    }
}
