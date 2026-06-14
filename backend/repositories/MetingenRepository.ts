import { Pool, RowDataPacket } from 'mysql2/promise';
import { Meting, GrootBadMetingInput, PeuterbadMetingInput, OpslaanResultaat } from '../types';
import { IMetingenRepository } from './IMetingenRepository';
import { AppError } from '../errors';
import { optimistischOpslaan } from './optimistisch';

export class MetingenRepository implements IMetingenRepository {
    constructor(private readonly pool: Pool) {}

    async getMetingen(datum: string): Promise<Meting[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow,
                    mg.filter_druk_in, mg.filter_druk_uit, mg.kathodische_bescherming,
                    NULL AS water, NULL AS chemicalien_chloor, NULL AS chemicalien_zwavelzuur,
                    mg.versie, mg.auteur, DATE_FORMAT(mg.bijgewerkt_op, '%Y-%m-%dT%H:%i:%s') AS bijgewerkt_op
             FROM baden b
             LEFT JOIN metingen_diep_ondiep mg ON b.id = mg.bad_id AND mg.datum = ?
             WHERE b.naam <> 'Peuterbad'
             UNION ALL
             SELECT b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde,
                    NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit,
                    NULL AS kathodische_bescherming,
                    mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur,
                    mp.versie, mp.auteur, DATE_FORMAT(mp.bijgewerkt_op, '%Y-%m-%dT%H:%i:%s') AS bijgewerkt_op
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

    async savePeuterbadMeting(
        bad_id: number, data: PeuterbadMetingInput, auteur: string | null, verwachteVersie: number | null,
    ): Promise<OpslaanResultaat> {
        return optimistischOpslaan(this.pool, 'metingen_peuterbad',
            { bad_id, datum: data.datum },
            {
                ph_waarde:      data.ph_waarde ?? null,
                chloor_waarde:  data.chloor_waarde ?? null,
                flow:           data.flow ?? null,
                filter_druk_in: data.filter_druk ?? data.filter_druk_in ?? null,
                water:                  data.water ?? null,
                chemicalien_chloor:     data.chemicalien_chloor ?? null,
                chemicalien_zwavelzuur: data.chemicalien_zwavelzuur ?? null,
            },
            auteur, verwachteVersie);
    }

    async saveGrootBadMeting(
        bad_id: number, data: GrootBadMetingInput, auteur: string | null, verwachteVersie: number | null,
    ): Promise<OpslaanResultaat> {
        return optimistischOpslaan(this.pool, 'metingen_diep_ondiep',
            { bad_id, datum: data.datum },
            {
                ph_waarde:      data.ph_waarde ?? null,
                chloor_waarde:  data.chloor_waarde ?? null,
                temperatuur:    data.temperatuur ?? null,
                flow:           data.flow ?? null,
                filter_druk_in: data.filter_druk_in ?? null,
                filter_druk_uit: data.filter_druk_uit ?? null,
                kathodische_bescherming: data.kathodische_bescherming ?? null,
            },
            auteur, verwachteVersie);
    }
}
