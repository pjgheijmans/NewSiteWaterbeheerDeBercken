<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;

/**
 * Port van backend/repositories/RondetakenRepository.ts. De takencatalogus staat
 * in code; alleen de afgevinkte taken per dag worden bewaard (rondetaken_voltooid).
 */
class RondetakenRepository implements IRondetakenRepository
{
    /**
     * Vaste catalogus van dagelijkse rondetaken (bewust in code i.p.v. de DB).
     * 'kritiek' = belangrijke dagtaak → categorie 'Belangrijk'; 'normaal' → 'Overig'.
     * @var list<array{sleutel:string,gebied:string,label:string,prioriteit:string,pagina:string}>
     */
    private const CATALOGUS = [
        ['sleutel' => 'regelaar_diep', 'gebied' => 'Diep', 'label' => 'Regelaar diep gereinigd', 'prioriteit' => 'kritiek', 'pagina' => 'grote-baden'],
        ['sleutel' => 'regelaar_ondiep', 'gebied' => 'Ondiep', 'label' => 'Regelaar ondiep gereinigd', 'prioriteit' => 'kritiek', 'pagina' => 'grote-baden'],
        ['sleutel' => 'regelaar_peuterbad', 'gebied' => 'Peuterbad', 'label' => 'Regelaar peuterbad gereinigd', 'prioriteit' => 'kritiek', 'pagina' => 'peuterbad'],
        ['sleutel' => 'filters_spraypark', 'gebied' => 'Spraypark', 'label' => 'Filters spraypark gereinigd', 'prioriteit' => 'kritiek', 'pagina' => 'peuterbad'],
        ['sleutel' => 'douches_test', 'gebied' => 'Douches', 'label' => 'Douches getest', 'prioriteit' => 'kritiek', 'pagina' => 'grote-baden'],
        ['sleutel' => 'diep_filter', 'gebied' => 'Diep', 'label' => 'Diep filter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
        ['sleutel' => 'diep_haarfilter', 'gebied' => 'Diep', 'label' => 'Diep haarfilter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
        ['sleutel' => 'ondiep_filter', 'gebied' => 'Ondiep', 'label' => 'Ondiep filter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
        ['sleutel' => 'ondiep_haarfilter', 'gebied' => 'Ondiep', 'label' => 'Ondiep haarfilter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
        ['sleutel' => 'peuterbad_filter', 'gebied' => 'Peuterbad', 'label' => 'Peuterbad filter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'peuterbad'],
        ['sleutel' => 'peuterbad_haarfilter', 'gebied' => 'Peuterbad', 'label' => 'Peuterbad haarfilter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'peuterbad'],
        ['sleutel' => 'glijbaan_haarfilter', 'gebied' => 'Glijbaan', 'label' => 'Glijbaan haarfilter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
        ['sleutel' => 'speeltoestel_ondiep_haarfilter', 'gebied' => 'Speeltoestel', 'label' => 'Speeltoestel ondiep haarfilter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
        ['sleutel' => 'douches_filter', 'gebied' => 'Douches', 'label' => 'Douches filter gereinigd', 'prioriteit' => 'normaal', 'pagina' => 'grote-baden'],
    ];

    /**
     * Koppeling bad ↔ filter-rondetaak. De *_filter-rondetaken en de
     * filter_spoelen_*-acties stellen dezelfde fysieke handeling voor.
     * @var array<string,string>
     */
    private const FILTER_SLEUTEL_PER_BAD = [
        'Diep' => 'diep_filter',
        'Ondiep' => 'ondiep_filter',
        'Peuterbad' => 'peuterbad_filter',
    ];

    public function __construct(private PDO $pdo)
    {
    }

    /** Of een sleutel in de catalogus voorkomt (bewaakt schrijfacties tegen onbekende sleutels). */
    public static function isGeldigeSleutel(string $sleutel): bool
    {
        foreach (self::CATALOGUS as $t) {
            if ($t['sleutel'] === $sleutel) {
                return true;
            }
        }

        return false;
    }

    /** Filter-rondetaaksleutel voor een bad-naam (of null als er geen koppeling is). */
    public static function filterSleutelVoorBad(string $naam): ?string
    {
        return self::FILTER_SLEUTEL_PER_BAD[$naam] ?? null;
    }

    /** Bad-naam die bij een filter-rondetaaksleutel hoort (of null). */
    public static function badVoorFilterSleutel(string $sleutel): ?string
    {
        $bad = array_search($sleutel, self::FILTER_SLEUTEL_PER_BAD, true);

        return $bad === false ? null : $bad;
    }

    public function getRondetaken(string $datum): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT taak_sleutel, voltooid_op, voltooid_door FROM rondetaken_voltooid WHERE datum = ?',
        );
        $stmt->execute([$datum]);
        $voltooid = [];
        foreach ($stmt->fetchAll() as $r) {
            $voltooid[$r['taak_sleutel']] = $r;
        }

        return array_map(static function (array $def) use ($voltooid): array {
            $v = $voltooid[$def['sleutel']] ?? null;

            return array_merge($def, [
                'voltooid' => $v !== null,
                'voltooid_op' => $v['voltooid_op'] ?? null,
                'voltooid_door' => $v['voltooid_door'] ?? null,
            ]);
        }, self::CATALOGUS);
    }

    public function voltooi(string $sleutel, string $datum, ?string $door): void
    {
        if (!self::isGeldigeSleutel($sleutel)) {
            return;
        }
        $this->pdo->prepare(
            'INSERT INTO rondetaken_voltooid (taak_sleutel, datum, voltooid_op, voltooid_door)
             VALUES (?, ?, NOW(), ?)
             ON DUPLICATE KEY UPDATE voltooid_op = NOW(), voltooid_door = VALUES(voltooid_door)',
        )->execute([$sleutel, $datum, $door]);
    }

    public function heropen(string $sleutel, string $datum): void
    {
        $this->pdo
            ->prepare('DELETE FROM rondetaken_voltooid WHERE taak_sleutel = ? AND datum = ?')
            ->execute([$sleutel, $datum]);
    }
}
