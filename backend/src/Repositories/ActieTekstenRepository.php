<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/ActieTekstenRepository.ts.
 * De ingebouwde DEFAULT_ACTIE_TEKSTEN zijn de bron van waarheid; de tabel
 * actie_teksten bevat alleen (door de beheerder) gewijzigde sjabloon-overrides.
 */
class ActieTekstenRepository implements IActieTekstenRepository
{
    /** @var list<array{actie_sleutel:string,sjabloon:string,omschrijving:string}> */
    private const DEFAULT_ACTIE_TEKSTEN = [
        ['actie_sleutel' => 'filter_spoelen_druk', 'sjabloon' => 'Filterdruk verschil {bad} > {drempel} bar — Filter spoelen', 'omschrijving' => 'Diep/Ondiep: drukverschil in-uit te hoog'],
        ['actie_sleutel' => 'filter_spoelen_druk_peuter', 'sjabloon' => 'Filterdruk Peuterbad > {drempel} bar — Filter spoelen', 'omschrijving' => 'Peuterbad: filterdruk te hoog'],
        ['actie_sleutel' => 'filter_spoelen_flow', 'sjabloon' => 'Flow {bad} onder {drempel} m³/h — Filter spoelen', 'omschrijving' => 'Diep/Ondiep: flow te laag'],
        ['actie_sleutel' => 'filter_spoelen_flow_peuter', 'sjabloon' => 'Flow Peuterbad onder {drempel} m³/h — Filter spoelen', 'omschrijving' => 'Peuterbad: flow te laag'],
        ['actie_sleutel' => 'chloor_peuterbad_bijvullen', 'sjabloon' => 'Chloorvoorraad Peuterbad {waarde} < {drempel} — Vat bijvullen', 'omschrijving' => 'Peuterbad: chloorvat bijna leeg'],
        ['actie_sleutel' => 'zwavelzuur_peuterbad_bijvullen', 'sjabloon' => 'Zwavelzuurvoorraad Peuterbad {waarde} < {drempel} — Vat bijvullen', 'omschrijving' => 'Peuterbad: zwavelzuurvat bijna leeg'],
        ['actie_sleutel' => 'chloor_bestellen', 'sjabloon' => 'Chloorvoorraad onder {drempel} liter — Chloor bestellen', 'omschrijving' => 'Verbruik: chloorvoorraad te laag'],
        ['actie_sleutel' => 'zwavelzuur_bestellen', 'sjabloon' => 'Zwavelzuurvoorraad onder {drempel} liter — Zwavelzuur bestellen', 'omschrijving' => 'Verbruik: zwavelzuurvoorraad te laag'],
        ['actie_sleutel' => 'Flocculant_bijvullen', 'sjabloon' => 'Flocculant {waarde} < {drempel} — Vul Flocculant bij', 'omschrijving' => 'Verbruik: Flocculant bijna op'],
        ['actie_sleutel' => 'filter_spoelen_bezoekers', 'sjabloon' => 'Aantal bezoekers op een dag {waarde} > {drempel} — Filter spoelen', 'omschrijving' => 'Dagbezoek boven de drempel'],
        ['actie_sleutel' => 'filter_spoelen_spoelbeurt', 'sjabloon' => 'Aantal bezoekers sinds spoelbeurt {bad} {waarde} > {drempel} — Filter spoelen', 'omschrijving' => 'Cumulatief bezoek sinds laatste spoelbeurt'],
        ['actie_sleutel' => 'filter_spoelen_dagen', 'sjabloon' => 'Laatste spoelbeurt {bad} {waarde} dagen geleden > {drempel} dagen — Filter spoelen', 'omschrijving' => 'Te lang geleden sinds laatste spoelbeurt'],
        ['actie_sleutel' => 'filter_spoelen_gebonden', 'sjabloon' => 'Gebonden chloor {bad} {waarde} > {drempel} mg/l — Filter spoelen', 'omschrijving' => 'Coördinator: gebonden chloor te hoog'],
        ['actie_sleutel' => 'peuterbad_leeglaten', 'sjabloon' => 'Peuterbad is vandaag gebruikt — Peuterbad water leeglaten', 'omschrijving' => 'Peuterbad na gebruik leeglaten'],
    ];

    public function __construct(private PDO $pdo)
    {
    }

    /**
     * Vul de plaatshouders ({bad}, {drempel}, {waarde}, …) in een sjabloon.
     * Onbekende plaatshouders worden weggelaten. Port van de statische render().
     * @param array<string,string|int|float> $params
     */
    public static function render(string $sjabloon, array $params): string
    {
        return preg_replace_callback(
            '/\{(\w+)\}/',
            static fn (array $m): string => array_key_exists($m[1], $params) ? (string) $params[$m[1]] : '',
            $sjabloon,
        );
    }

    /**
     * Sjablonen (sleutel → sjabloon): defaults met DB-overrides erover. Gebruikt
     * door de actiegeneratie (ActiesRepository). Port van getSjablonen().
     * @return array<string,string>
     */
    public function getSjablonen(): array
    {
        $overrides = $this->laadOverrides();
        $map = [];
        foreach (self::DEFAULT_ACTIE_TEKSTEN as $t) {
            $map[$t['actie_sleutel']] = $overrides[$t['actie_sleutel']] ?? $t['sjabloon'];
        }

        return $map;
    }

    public function getDefaults(): array
    {
        // Kopieën teruggeven (zoals de Node-versie met spread).
        return array_map(static fn (array $t): array => $t, self::DEFAULT_ACTIE_TEKSTEN);
    }

    public function getAll(): array
    {
        $overrides = $this->laadOverrides();

        return array_map(static fn (array $t): array => [
            'actie_sleutel' => $t['actie_sleutel'],
            'sjabloon' => $overrides[$t['actie_sleutel']] ?? $t['sjabloon'],
            'omschrijving' => $t['omschrijving'],
        ], self::DEFAULT_ACTIE_TEKSTEN);
    }

    public function save(array $data): void
    {
        $this->pdo->prepare(
            'INSERT INTO actie_teksten (actie_sleutel, sjabloon) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE sjabloon = VALUES(sjabloon)',
        )->execute([$data['actie_sleutel'], $data['sjabloon']]);
    }

    /**
     * Haal de in de DB opgeslagen sjabloon-overrides op (sleutel → sjabloon).
     * @return array<string,string>
     */
    private function laadOverrides(): array
    {
        $overrides = [];
        try {
            foreach ($this->pdo->query('SELECT actie_sleutel, sjabloon FROM actie_teksten')->fetchAll() as $r) {
                $overrides[$r['actie_sleutel']] = $r['sjabloon'];
            }
        } catch (\Throwable $e) {
            error_log('laadActieTeksten fallback: ' . $e->getMessage());
        }

        return $overrides;
    }
}
