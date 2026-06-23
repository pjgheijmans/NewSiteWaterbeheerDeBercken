import { Pool, RowDataPacket } from 'mysql2/promise';
import {
    Actie,
    MetingInput,
    VerbruikInput,
    BadTotalen,
    Drempelwaarden,
    GebondenChloorResultaat,
} from '../types';
import { IActiesRepository } from './IActiesRepository';
import { IActieTekstenRepository } from './IActieTekstenRepository';
import { ActieTekstenRepository } from './ActieTekstenRepository';
import { RondetakenRepository } from './RondetakenRepository';

export class ActiesRepository implements IActiesRepository {
    constructor(
        private readonly pool: Pool,
        private readonly actieTekstenRepo: IActieTekstenRepository,
    ) {}

    /** Render een actie-sjabloon (uit de DB) met de gegeven plaatshouderwaarden. */
    private _tekst(
        sjablonen: Record<string, string>,
        sleutel: string,
        params: Record<string, string | number>,
    ): string {
        return ActieTekstenRepository.render(sjablonen[sleutel] ?? '', params);
    }

    async getActies(datum: string): Promise<Actie[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT a.id, b.naam AS bad_naam, a.beschrijving, a.actie_type,
                    a.opgelost, a.opgelost_op, a.opgelost_door
             FROM acties a JOIN baden b ON a.bad_id = b.id
             WHERE a.datum = ?
             ORDER BY a.opgelost ASC, b.naam, a.actie_type`,
            [datum],
        );
        return rows as Actie[];
    }

    async resolve(id: string, opgelost_door: string | null): Promise<void> {
        await this.pool.execute(
            'UPDATE acties SET opgelost = TRUE, opgelost_op = NOW(), opgelost_door = ? WHERE id = ?',
            [opgelost_door, id],
        );
    }

    async unresolve(id: string): Promise<void> {
        await this.pool.execute(
            'UPDATE acties SET opgelost = FALSE, opgelost_op = NULL, opgelost_door = NULL WHERE id = ?',
            [id],
        );
    }

    /** Resolve alle open filter_spoelen_*-acties voor een bad op een datum (rondetaak-koppeling). */
    async resolveFilterSpoelen(
        bad_naam: string,
        datum: string,
        door: string | null,
    ): Promise<void> {
        await this.pool.execute(
            `UPDATE acties a JOIN baden b ON a.bad_id = b.id
             SET a.opgelost = TRUE, a.opgelost_op = NOW(), a.opgelost_door = ?
             WHERE b.naam = ? AND a.datum = ? AND a.actie_type LIKE 'filter_spoelen%' AND a.opgelost = FALSE`,
            [door, bad_naam, datum],
        );
    }

    /** Heropen alle filter_spoelen_*-acties voor een bad op een datum (rondetaak-koppeling). */
    async unresolveFilterSpoelen(bad_naam: string, datum: string): Promise<void> {
        await this.pool.execute(
            `UPDATE acties a JOIN baden b ON a.bad_id = b.id
             SET a.opgelost = FALSE, a.opgelost_op = NULL, a.opgelost_door = NULL
             WHERE b.naam = ? AND a.datum = ? AND a.actie_type LIKE 'filter_spoelen%' AND a.opgelost = TRUE`,
            [bad_naam, datum],
        );
    }

    private async laadDrempelwaarden(): Promise<Drempelwaarden> {
        const defaults: Drempelwaarden = {
            actie_druk_verschil: 0.4,
            actie_druk_peuterbad: 1.0,
            actie_flow_diep: 250,
            actie_flow_ondiep: 75,
            actie_flow_peuterbad: 4,
            actie_chloor_min: 200,
            actie_zwavelzuur_min: 50,
            actie_bezoekers_max: 750,
            actie_spoelbeurt_max: 1500,
            actie_spoelbeurt_dagen: 7,
            actie_floculant_min: 10,
            actie_gebonden_chloor_max: 1,
            actie_chloor_peuterbad_min: 10,
            actie_zwavelzuur_peuterbad_min: 5,
        };
        try {
            const [rows] = await this.pool.execute<RowDataPacket[]>(
                "SELECT parameter_naam, max_waarde FROM limieten WHERE parameter_naam LIKE 'actie_%'",
            );
            (rows as Array<{ parameter_naam: keyof Drempelwaarden; max_waarde: string }>).forEach(
                (r) => {
                    defaults[r.parameter_naam] = parseFloat(r.max_waarde);
                },
            );
        } catch (err) {
            console.warn('laadDrempelwaarden fallback:', (err as Error).message);
        }
        return defaults;
    }

    private async stelIn(
        bad_id: number,
        datum: string,
        actie_type: string,
        beschrijving: string,
        actief: boolean,
    ): Promise<void> {
        if (actief) {
            await this.pool.execute(
                `INSERT INTO acties (bad_id, datum, beschrijving, actie_type) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE beschrijving = VALUES(beschrijving)`,
                [bad_id, datum, beschrijving, actie_type],
            );
        } else {
            await this.pool.execute(
                'DELETE FROM acties WHERE bad_id = ? AND datum = ? AND actie_type = ? AND opgelost = FALSE',
                [bad_id, datum, actie_type],
            );
        }
    }

    async genereer(
        bad_id: number,
        datum: string,
        bad_naam: string,
        body: MetingInput,
    ): Promise<void> {
        const d = await this.laadDrempelwaarden();
        const t = await this.actieTekstenRepo.getSjablonen();
        // Sensorwaarden komen uit JSON body; cast naar Record voor runtime parseFloat
        const b = body as unknown as Record<string, unknown>;
        const drukIn = parseFloat(String(b.filter_druk_in ?? b.filter_druk ?? NaN));
        const drukUit = parseFloat(String(b.filter_druk_uit ?? NaN));
        const flow = parseFloat(String(b.flow ?? NaN));

        if (bad_naam === 'Diep' || bad_naam === 'Ondiep') {
            if (!isNaN(drukIn) && !isNaN(drukUit)) {
                await this.stelIn(
                    bad_id,
                    datum,
                    'filter_spoelen_druk',
                    this._tekst(t, 'filter_spoelen_druk', {
                        bad: bad_naam,
                        drempel: d.actie_druk_verschil,
                    }),
                    drukIn - drukUit > d.actie_druk_verschil,
                );
            }
            const flowMin = bad_naam === 'Diep' ? d.actie_flow_diep : d.actie_flow_ondiep;
            if (!isNaN(flow)) {
                await this.stelIn(
                    bad_id,
                    datum,
                    'filter_spoelen_flow',
                    this._tekst(t, 'filter_spoelen_flow', { bad: bad_naam, drempel: flowMin }),
                    flow < flowMin,
                );
            }
        }

        if (bad_naam === 'Peuterbad') {
            if (!isNaN(drukIn)) {
                await this.stelIn(
                    bad_id,
                    datum,
                    'filter_spoelen_druk',
                    this._tekst(t, 'filter_spoelen_druk_peuter', {
                        drempel: d.actie_druk_peuterbad,
                    }),
                    drukIn > d.actie_druk_peuterbad,
                );
            }
            if (!isNaN(flow)) {
                await this.stelIn(
                    bad_id,
                    datum,
                    'filter_spoelen_flow',
                    this._tekst(t, 'filter_spoelen_flow_peuter', {
                        drempel: d.actie_flow_peuterbad,
                    }),
                    flow < d.actie_flow_peuterbad,
                );
            }

            const chloorPeuter = parseFloat(String(b.chemicalien_chloor ?? NaN));
            if (!isNaN(chloorPeuter)) {
                await this.stelIn(
                    bad_id,
                    datum,
                    'chloor_peuterbad_bijvullen',
                    this._tekst(t, 'chloor_peuterbad_bijvullen', {
                        waarde: chloorPeuter,
                        drempel: d.actie_chloor_peuterbad_min,
                    }),
                    chloorPeuter < d.actie_chloor_peuterbad_min,
                );
            }

            const zwavelzuurPeuter = parseFloat(String(b.chemicalien_zwavelzuur ?? NaN));
            if (!isNaN(zwavelzuurPeuter)) {
                await this.stelIn(
                    bad_id,
                    datum,
                    'zwavelzuur_peuterbad_bijvullen',
                    this._tekst(t, 'zwavelzuur_peuterbad_bijvullen', {
                        waarde: zwavelzuurPeuter,
                        drempel: d.actie_zwavelzuur_peuterbad_min,
                    }),
                    zwavelzuurPeuter < d.actie_zwavelzuur_peuterbad_min,
                );
            }
        }
    }

    async genereerVerbruik(datum: string, body: VerbruikInput): Promise<void> {
        const d = await this.laadDrempelwaarden();
        const [bads] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id FROM baden WHERE naam = ?',
            ['Diep'],
        );
        if (!bads.length) return;
        const bad_id = (bads[0] as { id: number }).id;
        const t = await this.actieTekstenRepo.getSjablonen();

        const chloor = parseFloat(String(body.chemicalien_chloor));
        if (!isNaN(chloor)) {
            await this.stelIn(
                bad_id,
                datum,
                'chloor_bestellen',
                this._tekst(t, 'chloor_bestellen', { drempel: d.actie_chloor_min }),
                chloor < d.actie_chloor_min,
            );
        }

        const zwavelzuur = parseFloat(String(body.chemicalien_zwavelzuur));
        if (!isNaN(zwavelzuur)) {
            await this.stelIn(
                bad_id,
                datum,
                'zwavelzuur_bestellen',
                this._tekst(t, 'zwavelzuur_bestellen', { drempel: d.actie_zwavelzuur_min }),
                zwavelzuur < d.actie_zwavelzuur_min,
            );
        }

        const floculant = parseFloat(String(body.floculant));
        if (!isNaN(floculant)) {
            await this.stelIn(
                bad_id,
                datum,
                'floculant_bijvullen',
                this._tekst(t, 'floculant_bijvullen', {
                    waarde: floculant,
                    drempel: d.actie_floculant_min,
                }),
                floculant < d.actie_floculant_min,
            );
        }
    }

    async genereerBezoekers(datum: string, bezoekers_vandaag: number | null): Promise<void> {
        const d = await this.laadDrempelwaarden();
        const aantal = parseFloat(String(bezoekers_vandaag));
        if (isNaN(aantal)) return;

        const [bads] = await this.pool.execute<RowDataPacket[]>(
            "SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')",
        );
        const t = await this.actieTekstenRepo.getSjablonen();
        for (const bad of bads as Array<{ id: number; naam: string }>) {
            await this.stelIn(
                bad.id,
                datum,
                'filter_spoelen_bezoekers',
                this._tekst(t, 'filter_spoelen_bezoekers', {
                    waarde: aantal,
                    drempel: d.actie_bezoekers_max,
                }),
                aantal > d.actie_bezoekers_max,
            );
        }
    }

    /**
     * Bezoekers én dagen sinds de laatste filterreiniging voor dit bad. Een
     * "reiniging" kan uit twee bronnen komen: een opgeloste
     * filter_spoelen_spoelbeurt-actie (Acties-tab) óf een afgevinkte
     * filter-rondetaak (diep_filter / ondiep_filter). De meest recente van de
     * twee, strikt vóór `datum`, bepaalt vanaf welke dag de dagtotalen tellen en
     * hoeveel dagen er sinds die reiniging zijn verstreken. `dagen` is `null`
     * als er nog geen reiniging bekend is (geen referentiepunt → geen actie).
     */
    private async berekenSpoelbeurt(
        bad_id: number,
        datum: string,
        rondetaakSleutel: string,
    ): Promise<{ totaal: number; dagen: number | null }> {
        const [ankerRows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT MAX(d) AS anker, DATEDIFF(?, MAX(d)) AS dagen FROM (
                 SELECT MAX(datum) AS d FROM acties
                   WHERE bad_id = ? AND actie_type = 'filter_spoelen_spoelbeurt'
                     AND opgelost = TRUE AND datum < ?
                 UNION ALL
                 SELECT MAX(datum) AS d FROM rondetaken_voltooid
                   WHERE taak_sleutel = ? AND datum < ?
             ) t`,
            [datum, bad_id, datum, rondetaakSleutel, datum],
        );
        const rij = ankerRows[0] as { anker: string | null; dagen: number | null } | undefined;
        const anker = rij?.anker ?? null;
        const dagen = rij?.dagen == null ? null : Number(rij.dagen);

        const [totaalRows] = await this.pool.execute<RowDataPacket[]>(
            anker
                ? `SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
                   FROM coordinatoren_daggegevens WHERE datum > ? AND datum <= ?`
                : `SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
                   FROM coordinatoren_daggegevens WHERE datum <= ?`,
            anker ? [anker, datum] : [datum],
        );

        return {
            totaal: parseFloat(String((totaalRows[0] as { totaal: string }).totaal)) || 0,
            dagen,
        };
    }

    async genereerSpoelbeurt(datum: string): Promise<BadTotalen> {
        const d = await this.laadDrempelwaarden();
        const [bads] = await this.pool.execute<RowDataPacket[]>(
            "SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')",
        );
        // Koppeling met de Rondetaken-filtertaak per bad: een afgevinkte
        // rondetaak telt mee als reinigingsmoment (zie berekenSpoelbeurt).
        const t = await this.actieTekstenRepo.getSjablonen();
        const totalen: Record<string, number> = {};
        for (const bad of bads as Array<{ id: number; naam: string }>) {
            const sleutel = RondetakenRepository.filterSleutelVoorBad(bad.naam) ?? '';
            const { totaal, dagen } = await this.berekenSpoelbeurt(bad.id, datum, sleutel);
            totalen[bad.naam.toLowerCase()] = totaal;
            await this.stelIn(
                bad.id,
                datum,
                'filter_spoelen_spoelbeurt',
                this._tekst(t, 'filter_spoelen_spoelbeurt', {
                    bad: bad.naam,
                    waarde: totaal,
                    drempel: d.actie_spoelbeurt_max,
                }),
                totaal > d.actie_spoelbeurt_max,
            );
            // Spoel óók als de laatste reiniging te lang geleden is (drempel in dagen).
            await this.stelIn(
                bad.id,
                datum,
                'filter_spoelen_dagen',
                this._tekst(t, 'filter_spoelen_dagen', {
                    bad: bad.naam,
                    waarde: dagen ?? 0,
                    drempel: d.actie_spoelbeurt_dagen,
                }),
                dagen !== null && dagen > d.actie_spoelbeurt_dagen,
            );
        }
        return totalen as unknown as BadTotalen;
    }

    /**
     * Acties op basis van coordinator-metingen, geaggregeerd over de hele dag
     * (er zijn meerdere meetblokken per dag):
     *  - gebonden chloor (= chloor_totaal − chloor_vrij) boven de drempel → Filter spoelen, per bad
     *  - Peuterbad gebruikt op enig moment vandaag → Peuterbad water aftappen
     */
    async genereerCoordinatoren(datum: string): Promise<void> {
        const d = await this.laadDrempelwaarden();
        const [bads] = await this.pool.execute<RowDataPacket[]>(
            "SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep', 'Peuterbad')",
        );
        const t = await this.actieTekstenRepo.getSjablonen();
        for (const bad of bads as Array<{ id: number; naam: string }>) {
            const [rows] = await this.pool.execute<RowDataPacket[]>(
                `SELECT MAX(chloor_totaal - chloor_vrij) AS gebonden_max,
                        MAX(bad_gebruikt)                AS gebruikt
                 FROM metingen_coordinatoren WHERE bad_id = ? AND datum = ?`,
                [bad.id, datum],
            );
            const rij = rows[0] as { gebonden_max: string | null; gebruikt: number | null };

            const gebonden = parseFloat(String(rij?.gebonden_max ?? NaN));
            if (!isNaN(gebonden)) {
                await this.stelIn(
                    bad.id,
                    datum,
                    'filter_spoelen_gebonden',
                    this._tekst(t, 'filter_spoelen_gebonden', {
                        bad: bad.naam,
                        waarde: gebonden.toFixed(2),
                        drempel: d.actie_gebonden_chloor_max,
                    }),
                    gebonden > d.actie_gebonden_chloor_max,
                );
            }

            if (bad.naam === 'Peuterbad') {
                await this.stelIn(
                    bad.id,
                    datum,
                    'peuterbad_aftappen',
                    this._tekst(t, 'peuterbad_aftappen', {}),
                    Number(rij?.gebruikt) === 1,
                );
            }
        }
    }

    /**
     * Dagmaximum gebonden chloor (= MAX(chloor_totaal − chloor_vrij)) per bad,
     * berekend over alle coordinator-meetblokken van die dag. Dit is dezelfde
     * waarde waarop genereerCoordinatoren de filter_spoelen_gebonden-actie baseert,
     * zodat de waterbeheer-weergave en de actiemarkering bij elkaar passen.
     */
    async getGebondenChloorMax(datum: string): Promise<GebondenChloorResultaat> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT b.naam AS bad_naam, MAX(m.chloor_totaal - m.chloor_vrij) AS gebonden_max
             FROM baden b
             LEFT JOIN metingen_coordinatoren m ON m.bad_id = b.id AND m.datum = ?
             WHERE b.naam IN ('Diep', 'Ondiep', 'Peuterbad')
             GROUP BY b.id, b.naam`,
            [datum],
        );
        const resultaat: GebondenChloorResultaat = { diep: null, ondiep: null, peuterbad: null };
        for (const r of rows as Array<{ bad_naam: string; gebonden_max: string | null }>) {
            const v = parseFloat(String(r.gebonden_max ?? NaN));
            const val = isNaN(v) ? null : v;
            if (r.bad_naam === 'Diep') resultaat.diep = val;
            else if (r.bad_naam === 'Ondiep') resultaat.ondiep = val;
            else if (r.bad_naam === 'Peuterbad') resultaat.peuterbad = val;
        }
        return resultaat;
    }
}
