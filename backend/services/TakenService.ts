import { IRondetakenRepository } from '../repositories/IRondetakenRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { ITakenService } from './ITakenService';
import { RondetakenRepository } from '../repositories/RondetakenRepository';
import { TaakItem, TaakPagina } from '../types';

/** Acties die niet aan één bad hangen maar facility-breed zijn → groep 'Algemeen'. */
const ALGEMEEN_TYPES = new Set(['chloor_bestellen', 'zwavelzuur_bestellen', 'floculant_bijvullen']);

/**
 * Stelt de unieke "Taken"-weergave samen uit twee bronnen:
 *  - de rondetaakcatalogus + dagvoltooiingen (vaste dagelijkse taken);
 *  - de (drempel)acties (alarmen die uitgevoerd MOETEN worden).
 *
 * De filter_spoelen_*-acties van een bad worden samengevouwen op de bijbehorende
 * filter-rondetaak (één rij, geen duplicatie). Overige acties worden losse
 * alarm-rijen. `must` markeert wat in het globale overzicht hoort.
 */
export class TakenService implements ITakenService {
    constructor(
        private readonly rondetakenRepo: IRondetakenRepository,
        private readonly actiesRepo: IActiesRepository,
    ) {}

    async getTaken(datum: string): Promise<TaakItem[]> {
        const [rondetaken, acties] = await Promise.all([
            this.rondetakenRepo.getRondetaken(datum),
            this.actiesRepo.getActies(datum),
        ]);

        const items: TaakItem[] = [];

        // 1) Rondetaken → items. Een filter-rondetaak neemt de open filter_spoelen-
        //    acties van zijn bad over als alarm (samengevouwen tot één rij).
        for (const rt of rondetaken) {
            const badVanFilter = RondetakenRepository.badVoorFilterSleutel(rt.sleutel);
            const filterAlarmen = badVanFilter
                ? acties.filter(a => !a.opgelost && a.bad_naam === badVanFilter
                                     && a.actie_type.startsWith('filter_spoelen'))
                : [];
            const heeftAlarm = filterAlarmen.length > 0;
            items.push({
                sleutel:       rt.sleutel,
                pagina:        rt.pagina,
                gebied:        rt.gebied,
                label:         rt.label,
                prioriteit:    heeftAlarm ? 'alarm' : rt.prioriteit,
                voltooid:      rt.voltooid,
                voltooid_op:   rt.voltooid_op,
                voltooid_door: rt.voltooid_door,
                reden:         heeftAlarm ? filterAlarmen.map(a => TakenService._reden(a.beschrijving)).join('; ') : null,
                must:          heeftAlarm || rt.prioriteit === 'kritiek',
                bron:          { type: 'rondetaak', sleutel: rt.sleutel },
            });
        }

        // 2) Overige acties (géén filter_spoelen) → losse alarm-rijen.
        for (const a of acties) {
            if (a.actie_type.startsWith('filter_spoelen')) continue; // al verwerkt via de filtertaak
            const algemeen = ALGEMEEN_TYPES.has(a.actie_type);
            items.push({
                sleutel:       `actie:${a.id}`,
                pagina:        algemeen ? 'grote-baden' : TakenService._paginaVoorBad(a.bad_naam),
                gebied:        algemeen ? 'Algemeen' : a.bad_naam,
                label:         TakenService._handeling(a.beschrijving),
                prioriteit:    'alarm',
                voltooid:      !!a.opgelost,
                voltooid_op:   a.opgelost_op ? String(a.opgelost_op) : null,
                voltooid_door: a.opgelost_door ?? null,
                reden:         TakenService._reden(a.beschrijving),
                must:          true,
                bron:          { type: 'actie', ids: [a.id] },
            });
        }

        return items;
    }

    private static _paginaVoorBad(bad_naam: string): TaakPagina {
        return bad_naam === 'Peuterbad' ? 'peuterbad' : 'grote-baden';
    }

    /** Oorzaak = deel vóór ' — '; valt terug op de hele beschrijving. */
    private static _reden(beschrijving: string): string {
        const i = beschrijving.lastIndexOf(' — ');
        return i === -1 ? beschrijving : beschrijving.slice(0, i);
    }

    /** Handeling = deel ná ' — '; valt terug op de hele beschrijving. */
    private static _handeling(beschrijving: string): string {
        const i = beschrijving.lastIndexOf(' — ');
        return i === -1 ? beschrijving : beschrijving.slice(i + 3);
    }
}
