<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/TrendRepository.ts — read-only aggregaties voor
 * de trendanalyse (JSON; de semicolon-CSV-export gebeurt in de frontend).
 */
class TrendRepository implements ITrendRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function getMetingenTrend(string $van, string $tot): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT mg.datum, b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde,
                    mg.temperatuur, mg.flow, mg.filter_druk_in, mg.filter_druk_uit, mg.kathodische_bescherming
             FROM metingen_diep_ondiep mg JOIN baden b ON mg.bad_id = b.id
             WHERE mg.datum BETWEEN ? AND ?
             UNION ALL
             SELECT mp.datum, b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde,
                    NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit, NULL AS kathodische_bescherming
             FROM metingen_peuterbad mp JOIN baden b ON mp.bad_id = b.id
             WHERE mp.datum BETWEEN ? AND ?
             ORDER BY datum ASC, bad_naam ASC",
        );
        $stmt->execute([$van, $tot, $van, $tot]);

        return $stmt->fetchAll();
    }

    public function getVerbruikTrend(string $van, string $tot): array
    {
        $algemeen = $this->pdo->prepare(
            'SELECT datum, water_diep, water_ondiep, water_totaal,
                    elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur
             FROM verbruik_diep_ondiep WHERE datum BETWEEN ? AND ? ORDER BY datum ASC',
        );
        $algemeen->execute([$van, $tot]);

        $peuterbad = $this->pdo->prepare(
            "SELECT mp.datum, mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur
             FROM metingen_peuterbad mp JOIN baden b ON mp.bad_id = b.id
             WHERE b.naam = 'Peuterbad' AND mp.datum BETWEEN ? AND ? ORDER BY mp.datum ASC",
        );
        $peuterbad->execute([$van, $tot]);

        return [
            'algemeen' => $algemeen->fetchAll(),
            'peuterbad' => $peuterbad->fetchAll(),
        ];
    }
}
