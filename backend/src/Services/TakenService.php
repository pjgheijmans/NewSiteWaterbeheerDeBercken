<?php

declare(strict_types=1);

namespace Zwembad\Services;

use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\IRondetakenRepository;
use Zwembad\Repositories\RondetakenRepository;

/**
 * Port van backend/services/TakenService.ts. Stelt de unieke "Taken"-weergave
 * samen uit de rondetaakcatalogus + dagvoltooiingen en de (drempel)acties.
 * filter_spoelen_*-acties worden samengevouwen op de filter-rondetaak van hun bad.
 */
class TakenService implements ITakenService
{
    /** Acties die facility-breed zijn (niet aan één bad) → groep 'Algemeen'. */
    private const ALGEMEEN_TYPES = ['chloor_bestellen', 'zwavelzuur_bestellen', 'Flocculant_bijvullen'];

    /** Scheidingsteken oorzaak ↔ handeling in een actiebeschrijving (" — "). */
    private const SEP = ' — ';

    public function __construct(
        private IRondetakenRepository $rondetakenRepo,
        private IActiesRepository $actiesRepo,
    ) {
    }

    public function getTaken(string $datum): array
    {
        $rondetaken = $this->rondetakenRepo->getRondetaken($datum);
        $acties = $this->actiesRepo->getActies($datum);
        $items = [];

        // 1) Rondetaken → items; een filter-rondetaak neemt de filter_spoelen-acties
        //    van zijn bad over als alarm (samengevouwen tot één rij).
        foreach ($rondetaken as $rt) {
            $badVanFilter = RondetakenRepository::badVoorFilterSleutel($rt['sleutel']);
            $filterAlarmen = [];
            if ($badVanFilter !== null) {
                foreach ($acties as $a) {
                    if ($a['bad_naam'] === $badVanFilter && str_starts_with($a['actie_type'], 'filter_spoelen')) {
                        $filterAlarmen[] = $a;
                    }
                }
            }
            $openAlarmen = array_values(array_filter($filterAlarmen, static fn (array $a): bool => !$a['opgelost']));
            $heeftAlarm = $filterAlarmen !== [];
            $categorie = $heeftAlarm
                ? 'verplicht'
                : ($rt['prioriteit'] === 'kritiek' ? 'belangrijk' : 'overig');
            $redenBron = $openAlarmen !== [] ? $openAlarmen : $filterAlarmen;

            $items[] = [
                'sleutel' => $rt['sleutel'],
                'pagina' => $rt['pagina'],
                'gebied' => $rt['gebied'],
                'label' => $rt['label'],
                'prioriteit' => $heeftAlarm ? 'alarm' : $rt['prioriteit'],
                'voltooid' => $rt['voltooid'],
                'voltooid_op' => $rt['voltooid_op'],
                'voltooid_door' => $rt['voltooid_door'],
                'reden' => $heeftAlarm
                    ? implode('; ', array_map(static fn (array $a): string => self::reden($a['beschrijving']), $redenBron))
                    : null,
                'categorie' => $categorie,
                'bron' => ['type' => 'rondetaak', 'sleutel' => $rt['sleutel']],
            ];
        }

        // 2) Overige acties (géén filter_spoelen) → losse alarm-rijen.
        foreach ($acties as $a) {
            if (str_starts_with($a['actie_type'], 'filter_spoelen')) {
                continue;
            }
            $algemeen = in_array($a['actie_type'], self::ALGEMEEN_TYPES, true);
            $items[] = [
                'sleutel' => 'actie:' . $a['id'],
                'pagina' => $algemeen ? 'grote-baden' : self::paginaVoorBad($a['bad_naam']),
                'gebied' => $algemeen ? 'Algemeen' : $a['bad_naam'],
                'label' => self::handeling($a['beschrijving']),
                'prioriteit' => 'alarm',
                'voltooid' => (bool) $a['opgelost'],
                'voltooid_op' => !empty($a['opgelost_op']) ? (string) $a['opgelost_op'] : null,
                'voltooid_door' => $a['opgelost_door'] ?? null,
                'reden' => self::reden($a['beschrijving']),
                'categorie' => 'verplicht',
                'bron' => ['type' => 'actie', 'ids' => [(int) $a['id']]],
            ];
        }

        return $items;
    }

    private static function paginaVoorBad(string $badNaam): string
    {
        return $badNaam === 'Peuterbad' ? 'peuterbad' : 'grote-baden';
    }

    /** Oorzaak = deel vóór ' — '; valt terug op de hele beschrijving. */
    private static function reden(string $beschrijving): string
    {
        $i = strrpos($beschrijving, self::SEP);

        return $i === false ? $beschrijving : substr($beschrijving, 0, $i);
    }

    /** Handeling = deel ná ' — '; valt terug op de hele beschrijving. */
    private static function handeling(string $beschrijving): string
    {
        $i = strrpos($beschrijving, self::SEP);

        return $i === false ? $beschrijving : substr($beschrijving, $i + strlen(self::SEP));
    }
}
