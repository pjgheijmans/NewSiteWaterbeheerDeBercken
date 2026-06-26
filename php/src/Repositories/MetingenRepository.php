<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;
use Zwembad\Errors\AppError;
use Zwembad\Support\Optimistisch;

/**
 * Port van backend/repositories/MetingenRepository.ts. Kiest de juiste bad-tabel
 * en slaat op via de optimistische versiecontrole (Support\Optimistisch).
 */
class MetingenRepository implements IMetingenRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getMetingen(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow,
                    mg.filter_druk_in, mg.filter_druk_uit, mg.kathodische_bescherming,
                    NULL AS water, NULL AS chemicalien_chloor, NULL AS chemicalien_zwavelzuur,
                    mg.versie, mg.auteur, DATE_FORMAT(mg.bijgewerkt_op, '%Y-%m-%dT%H:%i:%s') AS bijgewerkt_op
             FROM baden b
             LEFT JOIN metingen_diep_ondiep mg ON b.id = mg.bad_id AND mg.datum = ?
             WHERE b.naam <> 'Peuterbad'
             UNION ALL
             SELECT b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde,
                    NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit,
                    NULL AS kathodische_bescherming,
                    mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur,
                    mp.versie, mp.auteur, DATE_FORMAT(mp.bijgewerkt_op, '%Y-%m-%dT%H:%i:%s') AS bijgewerkt_op
             FROM baden b
             LEFT JOIN metingen_peuterbad mp ON b.id = mp.bad_id AND mp.datum = ?
             WHERE b.naam = 'Peuterbad'
             ORDER BY bad_naam",
        );
        $stmt->execute([$datum, $datum]);

        return $stmt->fetchAll();
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

    public function savePeuterbadMeting(int $badId, array $data, ?string $auteur, ?int $verwachteVersie): array
    {
        return Optimistisch::opslaan(
            $this->pdo,
            'metingen_peuterbad',
            ['bad_id' => $badId, 'datum' => $data['datum']],
            [
                'ph_waarde' => $data['ph_waarde'] ?? null,
                'chloor_waarde' => $data['chloor_waarde'] ?? null,
                'flow' => $data['flow'] ?? null,
                'filter_druk_in' => $data['filter_druk'] ?? $data['filter_druk_in'] ?? null,
                'water' => $data['water'] ?? null,
                'chemicalien_chloor' => $data['chemicalien_chloor'] ?? null,
                'chemicalien_zwavelzuur' => $data['chemicalien_zwavelzuur'] ?? null,
            ],
            $auteur,
            $verwachteVersie,
        );
    }

    public function saveGrootBadMeting(int $badId, array $data, ?string $auteur, ?int $verwachteVersie): array
    {
        return Optimistisch::opslaan(
            $this->pdo,
            'metingen_diep_ondiep',
            ['bad_id' => $badId, 'datum' => $data['datum']],
            [
                'ph_waarde' => $data['ph_waarde'] ?? null,
                'chloor_waarde' => $data['chloor_waarde'] ?? null,
                'temperatuur' => $data['temperatuur'] ?? null,
                'flow' => $data['flow'] ?? null,
                'filter_druk_in' => $data['filter_druk_in'] ?? null,
                'filter_druk_uit' => $data['filter_druk_uit'] ?? null,
                'kathodische_bescherming' => $data['kathodische_bescherming'] ?? null,
            ],
            $auteur,
            $verwachteVersie,
        );
    }
}
