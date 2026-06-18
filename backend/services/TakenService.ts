import { IRondetakenRepository } from '../repositories/IRondetakenRepository';
import { IActiesRepository } from '../repositories/IActiesRepository';
import { ITakenService } from './ITakenService';
import { RondetakenRepository } from '../repositories/RondetakenRepository';
import { TaakItem, TaakPagina, TaakCategorie } from '../types';

/** Acties die niet aan één bad hangen maar facility-breed zijn → groep 'Algemeen'. */
const ALGEMEEN_TYPES = new Set(['chloor_bestellen', 'zwavelzuur_bestellen', 'floculant_bijvullen']);

/**
 * Stelt de unieke "Taken"-weergave samen uit twee bronnen:
 *  - de rondetaakcatalogus + dagvoltooiingen (vaste dagelijkse taken);
 *  - de (drempel)acties (alarmen die uitgevoerd MOETEN worden).
 *
 * De filter_spoelen_*-acties van een bad worden samengevouwen op de bijbehorende
 * filter-rondetaak (één rij, geen duplicatie). Overige acties worden losse
 * alarm-rijen. `categorie` deelt elk item in onder Verplicht/Belangrijk/Overig:
 *  - een getriggerd alarm → 'verplicht';
 *  - een kritieke rondetaak (regelaars/spraypark) → 'belangrijk';
 *  - een normale rondetaak → 'overig'.
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

        // 1) Rondetaken → items. Een filter-rondetaak neemt de filter_spoelen-
        //    acties van zijn bad over als alarm (samengevouwen tot één rij).
        for (const rt of rondetaken) {
            const badVanFilter = RondetakenRepository.badVoorFilterSleutel(rt.sleutel);
            // Álle filteralarmen van dit bad (ook reeds opgeloste). Een afgevinkt
            // alarm blijft zo een "verplichte" taak: hij blijft in de Verplicht-
            // sectie staan (afgestreept + reden) i.p.v. terug te zakken naar
            // Belangrijk/Overig — zo blijft zichtbaar dát en waaróm het moest.
            const filterAlarmen = badVanFilter
                ? acties.filter(a => a.bad_naam === badVanFilter
                                     && a.actie_type.startsWith('filter_spoelen'))
                : [];
            const openAlarmen = filterAlarmen.filter(a => !a.opgelost);
            const heeftAlarm  = filterAlarmen.length > 0;
            // Een (ooit) getriggerd alarm maakt de taak verplicht; anders bepaalt
            // de rondetaakprioriteit of het belangrijk (kritiek) of overig (normaal) is.
            const categorie: TaakCategorie =
                heeftAlarm ? 'verplicht' : (rt.prioriteit === 'kritiek' ? 'belangrijk' : 'overig');
            // Toon bij voorkeur de reden van nog openstaande alarmen; is alles
            // afgehandeld, dan die van de opgeloste alarmen.
            const redenBron = openAlarmen.length ? openAlarmen : filterAlarmen;
            items.push({
                sleutel:       rt.sleutel,
                pagina:        rt.pagina,
                gebied:        rt.gebied,
                label:         rt.label,
                prioriteit:    heeftAlarm ? 'alarm' : rt.prioriteit,
                voltooid:      rt.voltooid,
                voltooid_op:   rt.voltooid_op,
                voltooid_door: rt.voltooid_door,
                reden:         heeftAlarm ? redenBron.map(a => TakenService._reden(a.beschrijving)).join('; ') : null,
                categorie,
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
                categorie:     'verplicht',
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
