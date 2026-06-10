import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Meting, GrootBadMetingInput, PeuterbadMetingInput } from '../types';
import { IMetingenRepository } from './IMetingenRepository';
import { AppError } from '../errors';

export class MetingenRepository implements IMetingenRepository {
    constructor(private readonly pool: Pool) {}

    async getMetingen(datum: string): Promise<Meting[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow,
                    mg.filter_druk_in, mg.filter_druk_uit, mg.kathodische_bescherming,
                    NULL AS water, NULL AS chemicalien_chloor, NULL AS chemicalien_zwavelzuur
             FROM baden b
             LEFT JOIN metingen_diep_ondiep mg ON b.id = mg.bad_id AND mg.datum = ?
             WHERE b.naam <> 'Peuterbad'
             UNION ALL
             SELECT b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde,
                    NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit,
                    NULL AS kathodische_bescherming,
                    mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur
             FROM baden b
             LEFT JOIN metingen_peuterbad mp ON b.id = mp.bad_id AND mp.datum = ?
             WHERE b.naam = 'Peuterbad'
             ORDER BY bad_naam`,
            [datum, datum]
        );
        return rows as Meting[];
    }

    async getBadId(bad_naam: string): Promise<number> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id FROM baden WHERE naam = ?',
            [bad_naam]
        );
        if (rows.length === 0) throw new AppError('Bad niet gevonden', 400);
        return (rows[0] as { id: number }).id;
    }

    async savePeuterbadMeting(bad_id: number, data: PeuterbadMetingInput): Promise<void> {
        const { datum, ph_waarde, chloor_waarde, flow, filter_druk_in, filter_druk,
                water, chemicalien_chloor, chemicalien_zwavelzuur } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO metingen_peuterbad
                (bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk_in, water, chemicalien_chloor, chemicalien_zwavelzuur)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde),
                flow = VALUES(flow), filter_druk_in = VALUES(filter_druk_in),
                water = VALUES(water), chemicalien_chloor = VALUES(chemicalien_chloor),
                chemicalien_zwavelzuur = VALUES(chemicalien_zwavelzuur)`,
            [bad_id, datum, ph_waarde ?? null, chloor_waarde ?? null, flow ?? null,
             filter_druk ?? filter_druk_in ?? null,
             water ?? null, chemicalien_chloor ?? null, chemicalien_zwavelzuur ?? null]
        );
    }

    async saveGrootBadMeting(bad_id: number, data: GrootBadMetingInput): Promise<void> {
        const { datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit, kathodische_bescherming } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO metingen_diep_ondiep
                (bad_id, datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit, kathodische_bescherming)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde),
                temperatuur = VALUES(temperatuur), flow = VALUES(flow),
                filter_druk_in = VALUES(filter_druk_in), filter_druk_uit = VALUES(filter_druk_uit),
                kathodische_bescherming = VALUES(kathodische_bescherming)`,
            [bad_id, datum, ph_waarde ?? null, chloor_waarde ?? null, temperatuur ?? null,
             flow ?? null, filter_druk_in ?? null, filter_druk_uit ?? null, kathodische_bescherming ?? null]
        );
    }
}
