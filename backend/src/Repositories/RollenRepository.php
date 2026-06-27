<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/RollenRepository.ts.
 * De rechtenmatrix wordt altijd compleet teruggegeven (alle domeinen, default 'geen').
 */
class RollenRepository implements IRollenRepository
{
    /** De drie domeinen, in vaste volgorde voor de matrix. */
    private const DOMEINEN = ['beheer', 'waterbeheer', 'coordinator'];

    public function __construct(private PDO $pdo)
    {
    }

    public function getAll(): array
    {
        $rows = $this->pdo->query(
            'SELECT r.id, r.naam, r.mag_historie_bewerken, rr.domein, rr.niveau
             FROM rollen r
             LEFT JOIN rol_rechten rr ON rr.rol_id = r.id
             ORDER BY r.id',
        )->fetchAll();

        $perRol = [];
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            if (!isset($perRol[$id])) {
                // Begin met alle domeinen op 'geen' zodat de matrix altijd compleet is.
                $rechten = [];
                foreach (self::DOMEINEN as $d) {
                    $rechten[$d] = 'geen';
                }
                $perRol[$id] = [
                    'id' => $id,
                    'naam' => $row['naam'],
                    'mag_historie_bewerken' => (bool) $row['mag_historie_bewerken'],
                    'rechten' => $rechten,
                ];
            }
            if ($row['domein'] !== null && $row['niveau'] !== null) {
                $perRol[$id]['rechten'][$row['domein']] = $row['niveau'];
            }
        }

        return array_values($perRol);
    }

    public function create(string $naam): void
    {
        $this->pdo
            ->prepare('INSERT INTO rollen (naam, mag_historie_bewerken) VALUES (?, 0)')
            ->execute([$naam]);
    }

    public function update(string $id, array $data): void
    {
        $this->pdo
            ->prepare('UPDATE rollen SET naam = ?, mag_historie_bewerken = ? WHERE id = ?')
            ->execute([$data['naam'], $data['mag_historie_bewerken'] ? 1 : 0, $id]);

        $stmt = $this->pdo->prepare(
            'INSERT INTO rol_rechten (rol_id, domein, niveau) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE niveau = VALUES(niveau)',
        );
        foreach (self::DOMEINEN as $domein) {
            $stmt->execute([$id, $domein, $data['rechten'][$domein] ?? 'geen']);
        }
    }

    public function remove(string $id): void
    {
        // rol_rechten en gebruiker_rollen ruimen zichzelf op via ON DELETE CASCADE.
        $this->pdo->prepare('DELETE FROM rollen WHERE id = ?')->execute([$id]);
    }
}
