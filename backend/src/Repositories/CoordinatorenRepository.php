<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;
use Zwembad\Errors\AppError;

/**
 * Port van backend/repositories/CoordinatorenRepository.ts. Coördinator-metingen
 * (gegroepeerd in meetblokken per tijdstip), de dagelijkse checklist en de
 * daggegevens. Vervult tevens de IDaggegevensProvider-rol (via ICoordinatorenRepository).
 */
class CoordinatorenRepository implements ICoordinatorenRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getCoordinatoren(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT b.naam AS bad_naam, mc.tijdstip, mc.auteur,
                    mc.ph_waarde, mc.chloor_vrij, mc.chloor_totaal,
                    mc.watertemperatuur, mc.helderheid, mc.bad_gebruikt
             FROM metingen_coordinatoren mc
             JOIN baden b ON b.id = mc.bad_id
             WHERE mc.datum = ?
             ORDER BY mc.tijdstip ASC, b.id ASC',
        );
        $stmt->execute([$datum]);

        $blokken = [];
        foreach ($stmt->fetchAll() as $row) {
            $t = $row['tijdstip'];
            if (!isset($blokken[$t])) {
                $blokken[$t] = ['tijdstip' => $t, 'auteur' => $row['auteur'] ?? '', 'metingen' => []];
            }
            $blokken[$t]['metingen'][] = [
                'bad_naam' => $row['bad_naam'],
                'ph_waarde' => $row['ph_waarde'],
                'chloor_vrij' => $row['chloor_vrij'],
                'chloor_totaal' => $row['chloor_totaal'],
                'watertemperatuur' => $row['watertemperatuur'],
                'helderheid' => $row['helderheid'],
                'bad_gebruikt' => $row['bad_gebruikt'],
            ];
        }

        return array_values($blokken);
    }

    public function getBadId(string $badNaam): int
    {
        $stmt = $this->pdo->prepare('SELECT id FROM baden WHERE naam = ?');
        $stmt->execute([$badNaam]);
        $rij = $stmt->fetch();
        if ($rij === false) {
            throw new AppError('Bad niet gevonden', 400);
        }

        return (int) $rij['id'];
    }

    public function saveMeting(int $badId, array $data, ?string $auteur): void
    {
        $this->pdo->prepare(
            'INSERT INTO metingen_coordinatoren
               (bad_id, datum, tijdstip, auteur, ph_waarde, chloor_vrij, chloor_totaal, watertemperatuur, helderheid, bad_gebruikt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               ph_waarde        = VALUES(ph_waarde),
               chloor_vrij      = VALUES(chloor_vrij),
               chloor_totaal    = VALUES(chloor_totaal),
               watertemperatuur = VALUES(watertemperatuur),
               helderheid       = VALUES(helderheid),
               bad_gebruikt     = VALUES(bad_gebruikt)',
        )->execute([
            $badId,
            $data['datum'],
            ($data['tijdstip'] ?? '') ?: '00:00:00',
            $auteur,
            $data['ph_waarde'] ?? null,
            $data['chloor_vrij'] ?? null,
            $data['chloor_totaal'] ?? null,
            $data['watertemperatuur'] ?? null,
            $data['helderheid'] ?? null,
            $data['bad_gebruikt'] ?? null,
        ]);
    }

    public function deleteBlok(string $datum, string $tijdstip): void
    {
        $this->pdo
            ->prepare('DELETE FROM metingen_coordinatoren WHERE datum = ? AND tijdstip = ?')
            ->execute([$datum, $tijdstip]);
    }

    public function getChecklist(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, auteur
             FROM coordinatoren_checklist WHERE datum = ?',
        );
        $stmt->execute([$datum]);
        $rij = $stmt->fetch();

        return $rij !== false ? $rij : [
            'proef_waterspeel' => 0,
            'proef_spraypark' => 0,
            'proef_douches' => 0,
            'proef_glijbaan' => 0,
            'auteur' => null,
        ];
    }

    public function saveChecklist(string $datum, array $data, ?string $auteur): void
    {
        $this->pdo->prepare(
            'INSERT INTO coordinatoren_checklist (datum, proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, auteur)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               proef_waterspeel = VALUES(proef_waterspeel),
               proef_spraypark  = VALUES(proef_spraypark),
               proef_douches    = VALUES(proef_douches),
               proef_glijbaan   = VALUES(proef_glijbaan),
               auteur           = VALUES(auteur)',
        )->execute([
            $datum,
            !empty($data['proef_waterspeel']) ? 1 : 0,
            !empty($data['proef_spraypark']) ? 1 : 0,
            !empty($data['proef_douches']) ? 1 : 0,
            !empty($data['proef_glijbaan']) ? 1 : 0,
            $auteur,
        ]);
    }

    public function getDaggegevens(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT lucht_temperatuur, bezoekers_vandaag, auteur
             FROM coordinatoren_daggegevens WHERE datum = ?',
        );
        $stmt->execute([$datum]);
        $rij = $stmt->fetch();

        return $rij !== false ? $rij : [
            'lucht_temperatuur' => null,
            'bezoekers_vandaag' => null,
            'auteur' => null,
        ];
    }

    public function saveDaggegevens(string $datum, array $data, ?string $auteur): void
    {
        $this->pdo->prepare(
            'INSERT INTO coordinatoren_daggegevens (datum, lucht_temperatuur, bezoekers_vandaag, auteur)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               lucht_temperatuur = VALUES(lucht_temperatuur),
               bezoekers_vandaag = VALUES(bezoekers_vandaag),
               auteur            = VALUES(auteur)',
        )->execute([
            $datum,
            $data['lucht_temperatuur'] ?? null,
            $data['bezoekers_vandaag'] ?? null,
            $auteur,
        ]);
    }
}
