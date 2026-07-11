<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/ActiesRepository.ts — de actiegeneratie-engine.
 * Vergelijkt gemeten waarden met de (instelbare) drempelwaarden en zet per
 * actie_type een actie aan (upsert) of uit (delete van open acties).
 */
class ActiesRepository implements IActiesRepository
{
    /** Ingebouwde drempelwaarden (worden overschreven door limieten 'actie_%'). */
    private const DREMPEL_DEFAULTS = [
        'actie_druk_verschil' => 0.4,
        'actie_druk_peuterbad' => 1.0,
        'actie_flow_diep' => 250.0,
        'actie_flow_ondiep' => 75.0,
        'actie_flow_peuterbad' => 4.0,
        'actie_chloor_min' => 200.0,
        'actie_zwavelzuur_min' => 50.0,
        'actie_bezoekers_max' => 750.0,
        'actie_spoelbeurt_max' => 1500.0,
        'actie_spoelbeurt_dagen' => 7.0,
        'actie_Flocculant_min' => 10.0,
        'actie_gebonden_chloor_max' => 1.0,
        'actie_chloor_peuterbad_min' => 10.0,
        'actie_zwavelzuur_peuterbad_min' => 5.0,
    ];

    public function __construct(
        private PDO $pdo,
        private IActieTekstenRepository $actieTekstenRepo,
    ) {
    }

    public function getActies(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.id, b.naam AS bad_naam, a.beschrijving, a.actie_type,
                    a.opgelost, a.opgelost_op, a.opgelost_door
             FROM acties a JOIN baden b ON a.bad_id = b.id
             WHERE a.datum = ?
             ORDER BY a.opgelost ASC, b.naam, a.actie_type',
        );
        $stmt->execute([$datum]);

        return array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'bad_naam' => $r['bad_naam'],
            'beschrijving' => $r['beschrijving'],
            'actie_type' => $r['actie_type'],
            'opgelost' => (int) $r['opgelost'],
            'opgelost_op' => $r['opgelost_op'],
            'opgelost_door' => $r['opgelost_door'],
        ], $stmt->fetchAll());
    }

    public function resolve(string $id, ?string $opgelostDoor): void
    {
        $this->pdo->prepare(
            'UPDATE acties SET opgelost = TRUE, opgelost_op = NOW(), opgelost_door = ? WHERE id = ?',
        )->execute([$opgelostDoor, $id]);
    }

    public function unresolve(string $id): void
    {
        $this->pdo->prepare(
            'UPDATE acties SET opgelost = FALSE, opgelost_op = NULL, opgelost_door = NULL WHERE id = ?',
        )->execute([$id]);
    }

    public function resolveFilterSpoelen(string $badNaam, string $datum, ?string $door): void
    {
        $this->pdo->prepare(
            "UPDATE acties a JOIN baden b ON a.bad_id = b.id
             SET a.opgelost = TRUE, a.opgelost_op = NOW(), a.opgelost_door = ?
             WHERE b.naam = ? AND a.datum = ? AND a.actie_type LIKE 'filter_spoelen%' AND a.opgelost = FALSE",
        )->execute([$door, $badNaam, $datum]);
    }

    public function unresolveFilterSpoelen(string $badNaam, string $datum): void
    {
        $this->pdo->prepare(
            "UPDATE acties a JOIN baden b ON a.bad_id = b.id
             SET a.opgelost = FALSE, a.opgelost_op = NULL, a.opgelost_door = NULL
             WHERE b.naam = ? AND a.datum = ? AND a.actie_type LIKE 'filter_spoelen%' AND a.opgelost = TRUE",
        )->execute([$badNaam, $datum]);
    }

    public function genereer(int $badId, string $datum, string $badNaam, array $body): void
    {
        $d = $this->laadDrempelwaarden();
        $t = $this->actieTekstenRepo->getSjablonen();
        $drukIn = self::num($body['filter_druk_in'] ?? $body['filter_druk'] ?? null);
        $drukUit = self::num($body['filter_druk_uit'] ?? null);
        $flow = self::num($body['flow'] ?? null);

        if ($badNaam === 'Diep' || $badNaam === 'Ondiep') {
            if (!is_nan($drukIn) && !is_nan($drukUit)) {
                $this->stelIn(
                    $badId,
                    $datum,
                    'filter_spoelen_druk',
                    $this->tekst($t, 'filter_spoelen_druk', ['bad' => $badNaam, 'drempel' => $d['actie_druk_verschil']]),
                    ($drukIn - $drukUit) > $d['actie_druk_verschil'],
                );
            }
            $flowMin = $badNaam === 'Diep' ? $d['actie_flow_diep'] : $d['actie_flow_ondiep'];
            if (!is_nan($flow)) {
                $this->stelIn(
                    $badId,
                    $datum,
                    'filter_spoelen_flow',
                    $this->tekst($t, 'filter_spoelen_flow', ['bad' => $badNaam, 'drempel' => $flowMin]),
                    $flow < $flowMin,
                );
            }
        }

        if ($badNaam === 'Peuterbad') {
            if (!is_nan($drukIn)) {
                $this->stelIn(
                    $badId,
                    $datum,
                    'filter_spoelen_druk',
                    $this->tekst($t, 'filter_spoelen_druk_peuter', ['drempel' => $d['actie_druk_peuterbad']]),
                    $drukIn > $d['actie_druk_peuterbad'],
                );
            }
            if (!is_nan($flow)) {
                $this->stelIn(
                    $badId,
                    $datum,
                    'filter_spoelen_flow',
                    $this->tekst($t, 'filter_spoelen_flow_peuter', ['drempel' => $d['actie_flow_peuterbad']]),
                    $flow < $d['actie_flow_peuterbad'],
                );
            }

            $chloorPeuter = self::num($body['chemicalien_chloor'] ?? null);
            if (!is_nan($chloorPeuter)) {
                $this->stelIn(
                    $badId,
                    $datum,
                    'chloor_peuterbad_bijvullen',
                    $this->tekst($t, 'chloor_peuterbad_bijvullen', ['waarde' => $chloorPeuter, 'drempel' => $d['actie_chloor_peuterbad_min']]),
                    $chloorPeuter < $d['actie_chloor_peuterbad_min'],
                );
            }

            $zwavelzuurPeuter = self::num($body['chemicalien_zwavelzuur'] ?? null);
            if (!is_nan($zwavelzuurPeuter)) {
                $this->stelIn(
                    $badId,
                    $datum,
                    'zwavelzuur_peuterbad_bijvullen',
                    $this->tekst($t, 'zwavelzuur_peuterbad_bijvullen', ['waarde' => $zwavelzuurPeuter, 'drempel' => $d['actie_zwavelzuur_peuterbad_min']]),
                    $zwavelzuurPeuter < $d['actie_zwavelzuur_peuterbad_min'],
                );
            }
        }
    }

    public function genereerVerbruik(string $datum, array $body): void
    {
        $d = $this->laadDrempelwaarden();
        $bad = $this->pdo->query("SELECT id FROM baden WHERE naam = 'Diep'")->fetch();
        if ($bad === false) {
            return;
        }
        $badId = (int) $bad['id'];
        $t = $this->actieTekstenRepo->getSjablonen();

        $chloor = self::num($body['chemicalien_chloor'] ?? null);
        if (!is_nan($chloor)) {
            $this->stelIn($badId, $datum, 'chloor_bestellen',
                $this->tekst($t, 'chloor_bestellen', ['drempel' => $d['actie_chloor_min']]),
                $chloor < $d['actie_chloor_min']);
        }

        $zwavelzuur = self::num($body['chemicalien_zwavelzuur'] ?? null);
        if (!is_nan($zwavelzuur)) {
            $this->stelIn($badId, $datum, 'zwavelzuur_bestellen',
                $this->tekst($t, 'zwavelzuur_bestellen', ['drempel' => $d['actie_zwavelzuur_min']]),
                $zwavelzuur < $d['actie_zwavelzuur_min']);
        }

        $Flocculant = self::num($body['Flocculant'] ?? null);
        if (!is_nan($Flocculant)) {
            $this->stelIn($badId, $datum, 'Flocculant_bijvullen',
                $this->tekst($t, 'Flocculant_bijvullen', ['waarde' => $Flocculant, 'drempel' => $d['actie_Flocculant_min']]),
                $Flocculant < $d['actie_Flocculant_min']);
        }
    }

    public function genereerBezoekers(string $datum, mixed $bezoekersVandaag): void
    {
        $d = $this->laadDrempelwaarden();
        $aantal = self::num($bezoekersVandaag);
        if (is_nan($aantal)) {
            return;
        }
        $bads = $this->pdo->query("SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')")->fetchAll();
        $t = $this->actieTekstenRepo->getSjablonen();
        foreach ($bads as $bad) {
            $this->stelIn(
                (int) $bad['id'],
                $datum,
                'filter_spoelen_bezoekers',
                $this->tekst($t, 'filter_spoelen_bezoekers', ['waarde' => $aantal, 'drempel' => $d['actie_bezoekers_max']]),
                $aantal > $d['actie_bezoekers_max'],
            );
        }
    }

    public function genereerSpoelbeurt(string $datum): array
    {
        $d = $this->laadDrempelwaarden();
        $bads = $this->pdo->query("SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')")->fetchAll();
        $t = $this->actieTekstenRepo->getSjablonen();
        $totalen = [];
        foreach ($bads as $bad) {
            $sleutel = RondetakenRepository::filterSleutelVoorBad($bad['naam']) ?? '';
            ['totaal' => $totaal, 'dagen' => $dagen] = $this->berekenSpoelbeurt((int) $bad['id'], $datum, $sleutel);
            $totalen[strtolower($bad['naam'])] = $totaal;
            $this->stelIn(
                (int) $bad['id'],
                $datum,
                'filter_spoelen_spoelbeurt',
                $this->tekst($t, 'filter_spoelen_spoelbeurt', ['bad' => $bad['naam'], 'waarde' => $totaal, 'drempel' => $d['actie_spoelbeurt_max']]),
                $totaal > $d['actie_spoelbeurt_max'],
            );
            // Spoel óók als de laatste reiniging te lang geleden is (drempel in dagen).
            $this->stelIn(
                (int) $bad['id'],
                $datum,
                'filter_spoelen_dagen',
                $this->tekst($t, 'filter_spoelen_dagen', ['bad' => $bad['naam'], 'waarde' => $dagen ?? 0, 'drempel' => $d['actie_spoelbeurt_dagen']]),
                $dagen !== null && $dagen > $d['actie_spoelbeurt_dagen'],
            );
        }

        return $totalen;
    }

    public function genereerCoordinatoren(string $datum): void
    {
        $d = $this->laadDrempelwaarden();
        $bads = $this->pdo->query("SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep', 'Peuterbad')")->fetchAll();
        $t = $this->actieTekstenRepo->getSjablonen();
        foreach ($bads as $bad) {
            $stmt = $this->pdo->prepare(
                'SELECT MAX(chloor_totaal - chloor_vrij) AS gebonden_max, MAX(bad_gebruikt) AS gebruikt
                 FROM metingen_coordinatoren WHERE bad_id = ? AND datum = ?',
            );
            $stmt->execute([(int) $bad['id'], $datum]);
            $rij = $stmt->fetch() ?: [];

            $gebonden = self::num($rij['gebonden_max'] ?? null);
            if (!is_nan($gebonden)) {
                $this->stelIn(
                    (int) $bad['id'],
                    $datum,
                    'filter_spoelen_gebonden',
                    $this->tekst($t, 'filter_spoelen_gebonden', ['bad' => $bad['naam'], 'waarde' => number_format($gebonden, 2, '.', ''), 'drempel' => $d['actie_gebonden_chloor_max']]),
                    $gebonden > $d['actie_gebonden_chloor_max'],
                );
            }

            if ($bad['naam'] === 'Peuterbad') {
                $this->stelIn(
                    (int) $bad['id'],
                    $datum,
                    'peuterbad_leeglaten',
                    $this->tekst($t, 'peuterbad_leeglaten', []),
                    (int) ($rij['gebruikt'] ?? 0) === 1,
                );
            }
        }
    }

    public function getGebondenChloorMax(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT b.naam AS bad_naam, MAX(m.chloor_totaal - m.chloor_vrij) AS gebonden_max
             FROM baden b
             LEFT JOIN metingen_coordinatoren m ON m.bad_id = b.id AND m.datum = ?
             WHERE b.naam IN ('Diep', 'Ondiep', 'Peuterbad')
             GROUP BY b.id, b.naam",
        );
        $stmt->execute([$datum]);
        $resultaat = ['diep' => null, 'ondiep' => null, 'peuterbad' => null];
        foreach ($stmt->fetchAll() as $r) {
            $v = self::num($r['gebonden_max'] ?? null);
            $val = is_nan($v) ? null : $v;
            if ($r['bad_naam'] === 'Diep') {
                $resultaat['diep'] = $val;
            } elseif ($r['bad_naam'] === 'Ondiep') {
                $resultaat['ondiep'] = $val;
            } elseif ($r['bad_naam'] === 'Peuterbad') {
                $resultaat['peuterbad'] = $val;
            }
        }

        return $resultaat;
    }

    /**
     * Bezoekers én dagen sinds de laatste filterreiniging voor dit bad. Een
     * reiniging komt uit een opgeloste filter_spoelen_spoelbeurt-actie óf een
     * afgevinkte filter-rondetaak; de meest recente (strikt vóór $datum) telt.
     * @return array{totaal:float,dagen:?int}
     */
    private function berekenSpoelbeurt(int $badId, string $datum, string $rondetaakSleutel): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT MAX(d) AS anker, DATEDIFF(?, MAX(d)) AS dagen FROM (
                 SELECT MAX(datum) AS d FROM acties
                   WHERE bad_id = ? AND actie_type = 'filter_spoelen_spoelbeurt'
                     AND opgelost = TRUE AND datum < ?
                 UNION ALL
                 SELECT MAX(datum) AS d FROM rondetaken_voltooid
                   WHERE taak_sleutel = ? AND datum < ?
             ) t",
        );
        $stmt->execute([$datum, $badId, $datum, $rondetaakSleutel, $datum]);
        $rij = $stmt->fetch() ?: [];
        $anker = $rij['anker'] ?? null;
        $dagen = ($rij['dagen'] ?? null) === null ? null : (int) $rij['dagen'];

        if ($anker !== null) {
            $tot = $this->pdo->prepare(
                'SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
                 FROM coordinatoren_daggegevens WHERE datum > ? AND datum <= ?',
            );
            $tot->execute([$anker, $datum]);
        } else {
            $tot = $this->pdo->prepare(
                'SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
                 FROM coordinatoren_daggegevens WHERE datum <= ?',
            );
            $tot->execute([$datum]);
        }

        return ['totaal' => (float) ($tot->fetch()['totaal'] ?? 0), 'dagen' => $dagen];
    }

    /** Render een actie-sjabloon (uit de DB) met de gegeven plaatshouderwaarden. */
    private function tekst(array $sjablonen, string $sleutel, array $params): string
    {
        return ActieTekstenRepository::render($sjablonen[$sleutel] ?? '', $params);
    }

    /** Zet een actie aan (upsert) of uit (delete van de open actie). Port van stelIn(). */
    private function stelIn(int $badId, string $datum, string $actieType, string $beschrijving, bool $actief): void
    {
        if ($actief) {
            $this->pdo->prepare(
                'INSERT INTO acties (bad_id, datum, beschrijving, actie_type) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE beschrijving = VALUES(beschrijving)',
            )->execute([$badId, $datum, $beschrijving, $actieType]);
        } else {
            $this->pdo->prepare(
                'DELETE FROM acties WHERE bad_id = ? AND datum = ? AND actie_type = ? AND opgelost = FALSE',
            )->execute([$badId, $datum, $actieType]);
        }
    }

    /** @return array<string,float> Drempelwaarden, defaults overschreven door limieten 'actie_%'. */
    private function laadDrempelwaarden(): array
    {
        $d = self::DREMPEL_DEFAULTS;
        try {
            $rows = $this->pdo
                ->query("SELECT parameter_naam, max_waarde FROM limieten WHERE parameter_naam LIKE 'actie_%'")
                ->fetchAll();
            foreach ($rows as $r) {
                if (array_key_exists($r['parameter_naam'], $d)) {
                    $d[$r['parameter_naam']] = (float) $r['max_waarde'];
                }
            }
        } catch (\Throwable $e) {
            error_log('laadDrempelwaarden fallback: ' . $e->getMessage());
        }

        return $d;
    }

    /** parseFloat-equivalent: numeriek (incl. `,`-decimaal) → float, anders NAN. */
    private static function num(mixed $v): float
    {
        if (is_int($v) || is_float($v)) {
            return (float) $v;
        }
        if (is_string($v)) {
            $s = str_replace(',', '.', trim($v));
            if (is_numeric($s)) {
                return (float) $s;
            }
        }

        return NAN;
    }
}
