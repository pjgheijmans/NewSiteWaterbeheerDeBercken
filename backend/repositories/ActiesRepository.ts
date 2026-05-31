import { Pool, RowDataPacket } from 'mysql2/promise';
import { Actie, MetingInput, VerbruikInput, BadTotalen, Drempelwaarden } from '../types';
import { IActiesRepository } from './IActiesRepository';

export class ActiesRepository implements IActiesRepository {
    constructor(private readonly pool: Pool) {}

    async getActies(datum: string): Promise<Actie[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT a.id, b.naam AS bad_naam, a.beschrijving, a.actie_type,
                    a.opgelost, a.opgelost_op, a.opgelost_door
             FROM acties a JOIN baden b ON a.bad_id = b.id
             WHERE a.datum = ?
             ORDER BY a.opgelost ASC, b.naam, a.actie_type`,
            [datum]
        );
        return rows as Actie[];
    }

    async resolve(id: string, opgelost_door: string | null): Promise<void> {
        await this.pool.execute(
            'UPDATE acties SET opgelost = TRUE, opgelost_op = NOW(), opgelost_door = ? WHERE id = ?',
            [opgelost_door, id]
        );
    }

    async unresolve(id: string): Promise<void> {
        await this.pool.execute(
            'UPDATE acties SET opgelost = FALSE, opgelost_op = NULL, opgelost_door = NULL WHERE id = ?',
            [id]
        );
    }

    private async laadDrempelwaarden(): Promise<Drempelwaarden> {
        const defaults: Drempelwaarden = {
            actie_druk_verschil:  0.40,
            actie_druk_peuterbad: 1.00,
            actie_flow_diep:      250,
            actie_flow_ondiep:    75,
            actie_flow_peuterbad: 4,
            actie_chloor_min:     200,
            actie_zwavelzuur_min: 50,
            actie_bezoekers_max:  750,
            actie_spoelbeurt_max: 1500,
            actie_floculant_min:  10,
        };
        try {
            const [rows] = await this.pool.execute<RowDataPacket[]>(
                "SELECT parameter_naam, max_waarde FROM limieten WHERE parameter_naam LIKE 'actie_%'"
            );
            (rows as Array<{ parameter_naam: keyof Drempelwaarden; max_waarde: string }>)
                .forEach(r => { defaults[r.parameter_naam] = parseFloat(r.max_waarde); });
        } catch (err) {
            console.warn('laadDrempelwaarden fallback:', (err as Error).message);
        }
        return defaults;
    }

    private async stelIn(
        bad_id: number, datum: string, actie_type: string, beschrijving: string, actief: boolean
    ): Promise<void> {
        if (actief) {
            await this.pool.execute(
                `INSERT INTO acties (bad_id, datum, beschrijving, actie_type) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE beschrijving = VALUES(beschrijving)`,
                [bad_id, datum, beschrijving, actie_type]
            );
        } else {
            await this.pool.execute(
                'DELETE FROM acties WHERE bad_id = ? AND datum = ? AND actie_type = ? AND opgelost = FALSE',
                [bad_id, datum, actie_type]
            );
        }
    }

    async genereer(bad_id: number, datum: string, bad_naam: string, body: MetingInput): Promise<void> {
        const d = await this.laadDrempelwaarden();
        // Sensorwaarden komen uit JSON body; cast naar Record voor runtime parseFloat
        const b = body as unknown as Record<string, unknown>;
        const drukIn  = parseFloat(String(b.filter_druk_in  ?? b.filter_druk ?? NaN));
        const drukUit = parseFloat(String(b.filter_druk_uit ?? NaN));
        const flow    = parseFloat(String(b.flow ?? NaN));

        if (bad_naam === 'Diep' || bad_naam === 'Ondiep') {
            if (!isNaN(drukIn) && !isNaN(drukUit)) {
                await this.stelIn(bad_id, datum, 'filter_spoelen_druk',
                    `Filterdruk verschil ${bad_naam} > ${d.actie_druk_verschil} bar — Filter spoelen`,
                    drukIn - drukUit > d.actie_druk_verschil);
            }
            const flowMin = bad_naam === 'Diep' ? d.actie_flow_diep : d.actie_flow_ondiep;
            if (!isNaN(flow)) {
                await this.stelIn(bad_id, datum, 'filter_spoelen_flow',
                    `Flow ${bad_naam} onder ${flowMin} m³/h — Filter spoelen`,
                    flow < flowMin);
            }
        }

        if (bad_naam === 'Peuterbad') {
            if (!isNaN(drukIn)) {
                await this.stelIn(bad_id, datum, 'filter_spoelen_druk',
                    `Filterdruk Peuterbad > ${d.actie_druk_peuterbad} bar — Filter spoelen`,
                    drukIn > d.actie_druk_peuterbad);
            }
            if (!isNaN(flow)) {
                await this.stelIn(bad_id, datum, 'filter_spoelen_flow',
                    `Flow Peuterbad onder ${d.actie_flow_peuterbad} m³/h — Filter spoelen`,
                    flow < d.actie_flow_peuterbad);
            }
        }
    }

    async genereerVerbruik(datum: string, body: VerbruikInput): Promise<void> {
        const d = await this.laadDrempelwaarden();
        const [bads] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id FROM baden WHERE naam = ?', ['Diep']
        );
        if (!bads.length) return;
        const bad_id = (bads[0] as { id: number }).id;

        const chloor = parseFloat(String(body.chemicalien_chloor));
        if (!isNaN(chloor)) {
            await this.stelIn(bad_id, datum, 'chloor_bestellen',
                `Chloorvoorraad onder ${d.actie_chloor_min} liter — Chloor bestellen`,
                chloor < d.actie_chloor_min);
        }

        const zwavelzuur = parseFloat(String(body.chemicalien_zwavelzuur));
        if (!isNaN(zwavelzuur)) {
            await this.stelIn(bad_id, datum, 'zwavelzuur_bestellen',
                `Zwavelzuurvoorraad onder ${d.actie_zwavelzuur_min} liter — Zwavelzuur bestellen`,
                zwavelzuur < d.actie_zwavelzuur_min);
        }

        const floculant = parseFloat(String(body.floculant));
        if (!isNaN(floculant)) {
            await this.stelIn(bad_id, datum, 'floculant_bijvullen',
                `Floculant ${floculant} < ${d.actie_floculant_min} — Vul floculant bij`,
                floculant < d.actie_floculant_min);
        }
    }

    async genereerBezoekers(datum: string, bezoekers_vandaag: number | null): Promise<void> {
        const d = await this.laadDrempelwaarden();
        const aantal = parseFloat(String(bezoekers_vandaag));
        if (isNaN(aantal)) return;

        const [bads] = await this.pool.execute<RowDataPacket[]>(
            "SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')"
        );
        for (const bad of bads as Array<{ id: number; naam: string }>) {
            await this.stelIn(bad.id, datum, 'filter_spoelen_bezoekers',
                `Aantal bezoekers ${aantal} > ${d.actie_bezoekers_max} — Filter spoelen`,
                aantal > d.actie_bezoekers_max);
        }
    }

    private async berekenSpoelbeurtTotaal(bad_id: number, datum: string): Promise<number> {
        const [lastClean] = await this.pool.execute<RowDataPacket[]>(
            `SELECT datum AS datum_schoon
             FROM acties
             WHERE bad_id = ? AND actie_type = 'filter_spoelen_spoelbeurt' AND opgelost = TRUE
               AND datum < ?
             ORDER BY datum DESC LIMIT 1`,
            [bad_id, datum]
        );

        const [totaalRows] = await this.pool.execute<RowDataPacket[]>(
            lastClean.length > 0
                ? `SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
                   FROM coordinatoren_daggegevens WHERE datum > ? AND datum <= ?`
                : `SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
                   FROM coordinatoren_daggegevens WHERE datum <= ?`,
            lastClean.length > 0
                ? [(lastClean[0] as { datum_schoon: string }).datum_schoon, datum]
                : [datum]
        );

        return parseFloat(String((totaalRows[0] as { totaal: string }).totaal)) || 0;
    }

    async genereerSpoelbeurt(datum: string): Promise<BadTotalen> {
        const d = await this.laadDrempelwaarden();
        const [bads] = await this.pool.execute<RowDataPacket[]>(
            "SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')"
        );
        const totalen: Record<string, number> = {};
        for (const bad of bads as Array<{ id: number; naam: string }>) {
            const totaal = await this.berekenSpoelbeurtTotaal(bad.id, datum);
            totalen[bad.naam.toLowerCase()] = totaal;
            await this.stelIn(bad.id, datum, 'filter_spoelen_spoelbeurt',
                `Aantal bezoekers sinds spoelbeurt ${bad.naam} ${totaal} > ${d.actie_spoelbeurt_max} — Filter spoelen`,
                totaal > d.actie_spoelbeurt_max);
        }
        return totalen as unknown as BadTotalen;
    }
}
