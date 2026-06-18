import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ActieTekst, ActieTekstInput } from '../types';
import { IActieTekstenRepository } from './IActieTekstenRepository';

/**
 * Standaard tekst-sjablonen voor gegenereerde acties. Dit is de bron van
 * waarheid: de DB-tabel actie_teksten bevat alleen (door de beheerder)
 * gewijzigde overrides. Plaatshouders tussen accolades worden bij het
 * genereren ingevuld — zie ActieTekstenRepository.render.
 */
const DEFAULT_ACTIE_TEKSTEN: ActieTekst[] = [
    { actie_sleutel: 'filter_spoelen_druk',          sjabloon: 'Filterdruk verschil {bad} > {drempel} bar — Filter spoelen',                 omschrijving: 'Diep/Ondiep: drukverschil in-uit te hoog' },
    { actie_sleutel: 'filter_spoelen_druk_peuter',   sjabloon: 'Filterdruk Peuterbad > {drempel} bar — Filter spoelen',                       omschrijving: 'Peuterbad: filterdruk te hoog' },
    { actie_sleutel: 'filter_spoelen_flow',          sjabloon: 'Flow {bad} onder {drempel} m³/h — Filter spoelen',                            omschrijving: 'Diep/Ondiep: flow te laag' },
    { actie_sleutel: 'filter_spoelen_flow_peuter',   sjabloon: 'Flow Peuterbad onder {drempel} m³/h — Filter spoelen',                        omschrijving: 'Peuterbad: flow te laag' },
    { actie_sleutel: 'chloor_peuterbad_bijvullen',   sjabloon: 'Chloorvoorraad Peuterbad {waarde} < {drempel} — Vat bijvullen',               omschrijving: 'Peuterbad: chloorvat bijna leeg' },
    { actie_sleutel: 'zwavelzuur_peuterbad_bijvullen', sjabloon: 'Zwavelzuurvoorraad Peuterbad {waarde} < {drempel} — Vat bijvullen',         omschrijving: 'Peuterbad: zwavelzuurvat bijna leeg' },
    { actie_sleutel: 'chloor_bestellen',             sjabloon: 'Chloorvoorraad onder {drempel} liter — Chloor bestellen',                     omschrijving: 'Verbruik: chloorvoorraad te laag' },
    { actie_sleutel: 'zwavelzuur_bestellen',         sjabloon: 'Zwavelzuurvoorraad onder {drempel} liter — Zwavelzuur bestellen',            omschrijving: 'Verbruik: zwavelzuurvoorraad te laag' },
    { actie_sleutel: 'floculant_bijvullen',          sjabloon: 'Floculant {waarde} < {drempel} — Vul floculant bij',                          omschrijving: 'Verbruik: floculant bijna op' },
    { actie_sleutel: 'filter_spoelen_bezoekers',     sjabloon: 'Aantal bezoekers {waarde} > {drempel} — Filter spoelen',                      omschrijving: 'Dagbezoek boven de drempel' },
    { actie_sleutel: 'filter_spoelen_spoelbeurt',    sjabloon: 'Aantal bezoekers sinds spoelbeurt {bad} {waarde} > {drempel} — Filter spoelen', omschrijving: 'Cumulatief bezoek sinds laatste spoelbeurt' },
    { actie_sleutel: 'filter_spoelen_dagen',         sjabloon: 'Laatste spoelbeurt {bad} {waarde} dagen geleden > {drempel} dagen — Filter spoelen', omschrijving: 'Te lang geleden sinds laatste spoelbeurt' },
    { actie_sleutel: 'filter_spoelen_gebonden',      sjabloon: 'Gebonden chloor {bad} {waarde} > {drempel} mg/l — Filter spoelen',            omschrijving: 'Coördinator: gebonden chloor te hoog' },
    { actie_sleutel: 'peuterbad_aftappen',           sjabloon: 'Peuterbad is vandaag gebruikt — Peuterbad water aftappen',                    omschrijving: 'Peuterbad na gebruik aftappen' },
];

export class ActieTekstenRepository implements IActieTekstenRepository {
    constructor(private readonly pool: Pool) {}

    /**
     * Vul de plaatshouders ({bad}, {drempel}, {waarde}, …) in een sjabloon.
     * Onbekende plaatshouders worden weggelaten zodat de tekst leesbaar blijft.
     */
    static render(sjabloon: string, params: Record<string, string | number>): string {
        return sjabloon.replace(/\{(\w+)\}/g, (_match, sleutel) =>
            sleutel in params ? String(params[sleutel]) : ''
        );
    }

    getDefaults(): ActieTekst[] {
        return DEFAULT_ACTIE_TEKSTEN.map(t => ({ ...t }));
    }

    async getAll(): Promise<ActieTekst[]> {
        const overrides = await this._laadOverrides();
        return DEFAULT_ACTIE_TEKSTEN.map(t => ({
            ...t,
            sjabloon: overrides[t.actie_sleutel] ?? t.sjabloon,
        }));
    }

    async getSjablonen(): Promise<Record<string, string>> {
        const overrides = await this._laadOverrides();
        const map: Record<string, string> = {};
        for (const t of DEFAULT_ACTIE_TEKSTEN) {
            map[t.actie_sleutel] = overrides[t.actie_sleutel] ?? t.sjabloon;
        }
        return map;
    }

    async seedDefaults(): Promise<void> {
        for (const t of DEFAULT_ACTIE_TEKSTEN) {
            await this.pool.execute<ResultSetHeader>(
                'INSERT IGNORE INTO actie_teksten (actie_sleutel, sjabloon, omschrijving) VALUES (?, ?, ?)',
                [t.actie_sleutel, t.sjabloon, t.omschrijving]
            );
        }
    }

    async save(data: ActieTekstInput): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO actie_teksten (actie_sleutel, sjabloon) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE sjabloon = VALUES(sjabloon)`,
            [data.actie_sleutel, data.sjabloon]
        );
    }

    /** Haal de in de DB opgeslagen sjabloon-overrides op (sleutel → sjabloon). */
    private async _laadOverrides(): Promise<Record<string, string>> {
        const overrides: Record<string, string> = {};
        try {
            const [rows] = await this.pool.execute<RowDataPacket[]>(
                'SELECT actie_sleutel, sjabloon FROM actie_teksten'
            );
            (rows as Array<{ actie_sleutel: string; sjabloon: string }>)
                .forEach(r => { overrides[r.actie_sleutel] = r.sjabloon; });
        } catch (err) {
            console.warn('laadActieTeksten fallback:', (err as Error).message);
        }
        return overrides;
    }
}
