import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Rondetaak, RondetaakDefinitie } from '../types';
import { IRondetakenRepository } from './IRondetakenRepository';

export class RondetakenRepository implements IRondetakenRepository {
    constructor(private readonly pool: Pool) {}

    /**
     * Vaste catalogus van dagelijkse rondetaken. Bewust in code i.p.v. de DB:
     * de installaties (regelaars, filters, douches) wijzigen zelden, en zo blijft
     * het toevoegen/verwijderen van een taak een bewuste codewijziging.
     * 'kritiek' = belangrijke dagtaak (regelaars/spraypark) → categorie 'Belangrijk';
     * 'normaal' = kan tijdens een ronde gebeuren → categorie 'Overig'.
     * (Alleen getriggerde acties/alarmen vallen onder 'Verplicht'; zie TakenService.)
     */
    static get CATALOGUS(): readonly RondetaakDefinitie[] {
        return [
            // Kritiek
            { sleutel: 'regelaar_diep',       gebied: 'Diep',      label: 'Regelaar diep gereinigd',      prioriteit: 'kritiek', pagina: 'grote-baden' },
            { sleutel: 'regelaar_ondiep',     gebied: 'Ondiep',    label: 'Regelaar ondiep gereinigd',    prioriteit: 'kritiek', pagina: 'grote-baden' },
            { sleutel: 'regelaar_peuterbad',  gebied: 'Peuterbad', label: 'Regelaar peuterbad gereinigd', prioriteit: 'kritiek', pagina: 'peuterbad' },
            { sleutel: 'filters_spraypark',   gebied: 'Spraypark', label: 'Filters spraypark gereinigd',  prioriteit: 'kritiek', pagina: 'peuterbad' },
            { sleutel: 'douches_test',        gebied: 'Douches',   label: 'Douches getest',               prioriteit: 'kritiek', pagina: 'grote-baden' },
            // Normaal
            { sleutel: 'diep_filter',                gebied: 'Diep',         label: 'Diep filter gereinigd',                 prioriteit: 'normaal', pagina: 'grote-baden' },
            { sleutel: 'diep_haarfilter',            gebied: 'Diep',         label: 'Diep haarfilter gereinigd',             prioriteit: 'normaal', pagina: 'grote-baden' },
            { sleutel: 'ondiep_filter',              gebied: 'Ondiep',       label: 'Ondiep filter gereinigd',               prioriteit: 'normaal', pagina: 'grote-baden' },
            { sleutel: 'ondiep_haarfilter',          gebied: 'Ondiep',       label: 'Ondiep haarfilter gereinigd',           prioriteit: 'normaal', pagina: 'grote-baden' },
            { sleutel: 'peuterbad_filter',           gebied: 'Peuterbad',    label: 'Peuterbad filter gereinigd',            prioriteit: 'normaal', pagina: 'peuterbad' },
            { sleutel: 'peuterbad_haarfilter',       gebied: 'Peuterbad',    label: 'Peuterbad haarfilter gereinigd',        prioriteit: 'normaal', pagina: 'peuterbad' },
            { sleutel: 'glijbaan_haarfilter',        gebied: 'Glijbaan',     label: 'Glijbaan haarfilter gereinigd',         prioriteit: 'normaal', pagina: 'grote-baden' },
            { sleutel: 'speeltoestel_ondiep_haarfilter', gebied: 'Speeltoestel', label: 'Speeltoestel ondiep haarfilter gereinigd', prioriteit: 'normaal', pagina: 'grote-baden' },
            { sleutel: 'douches_filter',             gebied: 'Douches',      label: 'Douches filter gereinigd',              prioriteit: 'normaal', pagina: 'grote-baden' },
        ];
    }

    /** Of een sleutel in de catalogus voorkomt (bewaakt schrijfacties tegen onbekende sleutels). */
    static isGeldigeSleutel(sleutel: string): boolean {
        return RondetakenRepository.CATALOGUS.some(t => t.sleutel === sleutel);
    }

    /**
     * Koppeling bad ↔ filter-rondetaak. De *_filter-rondetaken en de
     * filter_spoelen_*-acties stellen dezelfde fysieke handeling voor (filter
     * reinigen/spoelen) en worden tweerichtings gesynchroniseerd. De haarfilter-
     * en regelaar-taken vallen hier bewust buiten.
     */
    static get FILTER_SLEUTEL_PER_BAD(): Readonly<Record<string, string>> {
        return { Diep: 'diep_filter', Ondiep: 'ondiep_filter', Peuterbad: 'peuterbad_filter' };
    }

    /** Filter-rondetaaksleutel voor een bad-naam (of undefined als er geen koppeling is). */
    static filterSleutelVoorBad(naam: string): string | undefined {
        return RondetakenRepository.FILTER_SLEUTEL_PER_BAD[naam];
    }

    /** Bad-naam die bij een filter-rondetaaksleutel hoort (of undefined). */
    static badVoorFilterSleutel(sleutel: string): string | undefined {
        return Object.entries(RondetakenRepository.FILTER_SLEUTEL_PER_BAD)
            .find(([, s]) => s === sleutel)?.[0];
    }

    async getRondetaken(datum: string): Promise<Rondetaak[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT taak_sleutel, voltooid_op, voltooid_door FROM rondetaken_voltooid WHERE datum = ?',
            [datum]
        );
        const voltooid = new Map(
            (rows as Array<{ taak_sleutel: string; voltooid_op: string | null; voltooid_door: string | null }>)
                .map(r => [r.taak_sleutel, r])
        );
        return RondetakenRepository.CATALOGUS.map(def => {
            const v = voltooid.get(def.sleutel);
            return {
                ...def,
                voltooid:      !!v,
                voltooid_op:   v?.voltooid_op   ?? null,
                voltooid_door: v?.voltooid_door ?? null,
            };
        });
    }

    async voltooi(sleutel: string, datum: string, door: string | null): Promise<void> {
        if (!RondetakenRepository.isGeldigeSleutel(sleutel)) return;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO rondetaken_voltooid (taak_sleutel, datum, voltooid_op, voltooid_door)
             VALUES (?, ?, NOW(), ?)
             ON DUPLICATE KEY UPDATE voltooid_op = NOW(), voltooid_door = VALUES(voltooid_door)`,
            [sleutel, datum, door]
        );
    }

    async heropen(sleutel: string, datum: string): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            'DELETE FROM rondetaken_voltooid WHERE taak_sleutel = ? AND datum = ?',
            [sleutel, datum]
        );
    }
}
