<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/LimietenRepository.ts.
 * Geeft de limieten als map terug (parameter_naam → {min,max}) en bevat de
 * backwards-compatible aliassing voor hernoemde parameters.
 */
class LimietenRepository implements ILimietenRepository
{
    /** @var list<array{parameter_naam:string,min_waarde:float,max_waarde:float}> */
    private const DEFAULT_LIMIETEN = [
        ['parameter_naam' => 'ph_waarde', 'min_waarde' => 6.8, 'max_waarde' => 7.6],
        ['parameter_naam' => 'chloor_waarde', 'min_waarde' => 0.5, 'max_waarde' => 1.5],
        ['parameter_naam' => 'watertemperatuur', 'min_waarde' => 20.0, 'max_waarde' => 30.0],
        ['parameter_naam' => 'flow_diep', 'min_waarde' => 250.0, 'max_waarde' => 450.0],
        ['parameter_naam' => 'flow_ondiep', 'min_waarde' => 50.0, 'max_waarde' => 120.0],
        ['parameter_naam' => 'flow_peuterbad', 'min_waarde' => 3.0, 'max_waarde' => 10.0],
        ['parameter_naam' => 'filter_druk_in', 'min_waarde' => 0.2, 'max_waarde' => 1.5],
        ['parameter_naam' => 'filter_druk_uit', 'min_waarde' => 0.2, 'max_waarde' => 1.5],
        ['parameter_naam' => 'filter_druk_peuterbad', 'min_waarde' => 0.2, 'max_waarde' => 1.5],
        ['parameter_naam' => 'kathodische_bescherming', 'min_waarde' => 0.2, 'max_waarde' => 2.5],
        ['parameter_naam' => 'elektriciteit_nacht', 'min_waarde' => 0.0, 'max_waarde' => 500.0],
        ['parameter_naam' => 'elektriciteit_dag', 'min_waarde' => 0.0, 'max_waarde' => 500.0],
        ['parameter_naam' => 'gas', 'min_waarde' => 0.0, 'max_waarde' => 500.0],
        ['parameter_naam' => 'water_diep', 'min_waarde' => 0.0, 'max_waarde' => 99999.0],
        ['parameter_naam' => 'water_ondiep', 'min_waarde' => 0.0, 'max_waarde' => 99999.0],
        ['parameter_naam' => 'water_totaal', 'min_waarde' => 0.0, 'max_waarde' => 99999.0],
        ['parameter_naam' => 'water_peuterbad', 'min_waarde' => 0.0, 'max_waarde' => 99999.0],
        ['parameter_naam' => 'chloor_vrij', 'min_waarde' => 0.5, 'max_waarde' => 1.5],
        ['parameter_naam' => 'chloor_totaal', 'min_waarde' => 0.3, 'max_waarde' => 3.5],
        ['parameter_naam' => 'chloor_gebonden', 'min_waarde' => 0.3, 'max_waarde' => 3.5],
        ['parameter_naam' => 'actie_druk_verschil', 'min_waarde' => 0.0, 'max_waarde' => 0.4],
        ['parameter_naam' => 'actie_druk_peuterbad', 'min_waarde' => 0.0, 'max_waarde' => 1.0],
        ['parameter_naam' => 'actie_flow_diep', 'min_waarde' => 0.0, 'max_waarde' => 250.0],
        ['parameter_naam' => 'actie_flow_ondiep', 'min_waarde' => 0.0, 'max_waarde' => 75.0],
        ['parameter_naam' => 'actie_flow_peuterbad', 'min_waarde' => 0.0, 'max_waarde' => 4.0],
        ['parameter_naam' => 'actie_chloor_min', 'min_waarde' => 0.0, 'max_waarde' => 200.0],
        ['parameter_naam' => 'actie_zwavelzuur_min', 'min_waarde' => 0.0, 'max_waarde' => 50.0],
        ['parameter_naam' => 'actie_bezoekers_max', 'min_waarde' => 0.0, 'max_waarde' => 750.0],
        ['parameter_naam' => 'actie_spoelbeurt_max', 'min_waarde' => 0.0, 'max_waarde' => 1500.0],
        ['parameter_naam' => 'actie_spoelbeurt_dagen', 'min_waarde' => 0.0, 'max_waarde' => 7.0],
        ['parameter_naam' => 'actie_floculant_min', 'min_waarde' => 0.0, 'max_waarde' => 10.0],
        ['parameter_naam' => 'actie_gebonden_chloor_max', 'min_waarde' => 0.0, 'max_waarde' => 1.0],
        ['parameter_naam' => 'actie_chloor_peuterbad_min', 'min_waarde' => 0.0, 'max_waarde' => 10.0],
        ['parameter_naam' => 'actie_zwavelzuur_peuterbad_min', 'min_waarde' => 0.0, 'max_waarde' => 5.0],
        ['parameter_naam' => 'seizoen_begin', 'min_waarde' => 0.0, 'max_waarde' => 20260425.0],
        ['parameter_naam' => 'seizoen_eind', 'min_waarde' => 0.0, 'max_waarde' => 20260901.0],
    ];

    public function __construct(private PDO $pdo)
    {
    }

    public function getAll(): array
    {
        $rows = $this->pdo
            ->query('SELECT parameter_naam, min_waarde, max_waarde FROM limieten')
            ->fetchAll();

        $obj = [];
        foreach ($rows as $r) {
            $obj[$r['parameter_naam']] = [
                'min' => (float) $r['min_waarde'],
                'max' => (float) $r['max_waarde'],
            ];
        }

        // Backwards-compatible aliassen voor hernoemde parameters.
        if (!isset($obj['watertemperatuur']) && isset($obj['temperatuur'])) {
            $obj['watertemperatuur'] = $obj['temperatuur'];
        }
        if (isset($obj['flow'])) {
            $obj['flow_diep'] ??= $obj['flow'];
            $obj['flow_ondiep'] ??= $obj['flow'];
            $obj['flow_peuterbad'] ??= $obj['flow'];
        }
        if (isset($obj['filter_druk'])) {
            $obj['filter_druk_in'] ??= $obj['filter_druk'];
            $obj['filter_druk_uit'] ??= $obj['filter_druk'];
            $obj['filter_druk_peuterbad'] ??= $obj['filter_druk'];
        }
        unset($obj['temperatuur'], $obj['flow'], $obj['filter_druk']);

        return $obj;
    }

    public function getDefaults(): array
    {
        $obj = [];
        foreach (self::DEFAULT_LIMIETEN as $l) {
            $obj[$l['parameter_naam']] = ['min' => $l['min_waarde'], 'max' => $l['max_waarde']];
        }

        return $obj;
    }

    public function save(array $data): void
    {
        $this->pdo->prepare(
            'INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)',
        )->execute([$data['parameter_naam'], $data['min_waarde'], $data['max_waarde']]);
    }

    public function seedDefaults(): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT IGNORE INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?)',
        );
        foreach (self::DEFAULT_LIMIETEN as $l) {
            $stmt->execute([$l['parameter_naam'], $l['min_waarde'], $l['max_waarde']]);
        }
    }
}
