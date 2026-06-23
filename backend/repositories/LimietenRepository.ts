import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { LimietenMap, LimietInput } from '../types';
import { ILimietenRepository } from './ILimietenRepository';

const DEFAULT_LIMIETEN: LimietInput[] = [
    { parameter_naam: 'ph_waarde', min_waarde: 6.8, max_waarde: 7.6 },
    { parameter_naam: 'chloor_waarde', min_waarde: 0.5, max_waarde: 1.5 },
    { parameter_naam: 'watertemperatuur', min_waarde: 20.0, max_waarde: 30.0 },
    { parameter_naam: 'flow_diep', min_waarde: 250.0, max_waarde: 450.0 },
    { parameter_naam: 'flow_ondiep', min_waarde: 50.0, max_waarde: 120.0 },
    { parameter_naam: 'flow_peuterbad', min_waarde: 3.0, max_waarde: 10.0 },
    { parameter_naam: 'filter_druk_in', min_waarde: 0.2, max_waarde: 1.5 },
    { parameter_naam: 'filter_druk_uit', min_waarde: 0.2, max_waarde: 1.5 },
    { parameter_naam: 'filter_druk_peuterbad', min_waarde: 0.2, max_waarde: 1.5 },
    { parameter_naam: 'kathodische_bescherming', min_waarde: 0.2, max_waarde: 2.5 },
    { parameter_naam: 'elektriciteit_nacht', min_waarde: 0.0, max_waarde: 500.0 },
    { parameter_naam: 'elektriciteit_dag', min_waarde: 0.0, max_waarde: 500.0 },
    { parameter_naam: 'gas', min_waarde: 0.0, max_waarde: 500.0 },
    { parameter_naam: 'water_diep', min_waarde: 0.0, max_waarde: 99999.0 },
    { parameter_naam: 'water_ondiep', min_waarde: 0.0, max_waarde: 99999.0 },
    { parameter_naam: 'water_totaal', min_waarde: 0.0, max_waarde: 99999.0 },
    { parameter_naam: 'water_peuterbad', min_waarde: 0.0, max_waarde: 99999.0 },
    { parameter_naam: 'chloor_vrij', min_waarde: 0.5, max_waarde: 1.5 },
    { parameter_naam: 'chloor_totaal', min_waarde: 0.3, max_waarde: 3.5 },
    { parameter_naam: 'chloor_gebonden', min_waarde: 0.3, max_waarde: 3.5 },
    { parameter_naam: 'actie_druk_verschil', min_waarde: 0.0, max_waarde: 0.4 },
    { parameter_naam: 'actie_druk_peuterbad', min_waarde: 0.0, max_waarde: 1.0 },
    { parameter_naam: 'actie_flow_diep', min_waarde: 0.0, max_waarde: 250.0 },
    { parameter_naam: 'actie_flow_ondiep', min_waarde: 0.0, max_waarde: 75.0 },
    { parameter_naam: 'actie_flow_peuterbad', min_waarde: 0.0, max_waarde: 4.0 },
    { parameter_naam: 'actie_chloor_min', min_waarde: 0.0, max_waarde: 200.0 },
    { parameter_naam: 'actie_zwavelzuur_min', min_waarde: 0.0, max_waarde: 50.0 },
    { parameter_naam: 'actie_bezoekers_max', min_waarde: 0.0, max_waarde: 750.0 },
    { parameter_naam: 'actie_spoelbeurt_max', min_waarde: 0.0, max_waarde: 1500.0 },
    { parameter_naam: 'actie_spoelbeurt_dagen', min_waarde: 0.0, max_waarde: 7.0 },
    { parameter_naam: 'actie_floculant_min', min_waarde: 0.0, max_waarde: 10.0 },
    { parameter_naam: 'actie_gebonden_chloor_max', min_waarde: 0.0, max_waarde: 1.0 },
    { parameter_naam: 'actie_chloor_peuterbad_min', min_waarde: 0.0, max_waarde: 10.0 },
    { parameter_naam: 'actie_zwavelzuur_peuterbad_min', min_waarde: 0.0, max_waarde: 5.0 },
    { parameter_naam: 'seizoen_begin', min_waarde: 0.0, max_waarde: 20260425.0 },
    { parameter_naam: 'seizoen_eind', min_waarde: 0.0, max_waarde: 20260901.0 },
];

export class LimietenRepository implements ILimietenRepository {
    constructor(private readonly pool: Pool) {}

    async getAll(): Promise<LimietenMap> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT parameter_naam, min_waarde, max_waarde FROM limieten',
        );
        const obj: LimietenMap = {};
        (rows as Array<{ parameter_naam: string; min_waarde: string; max_waarde: string }>).forEach(
            (r) => {
                obj[r.parameter_naam] = {
                    min: parseFloat(r.min_waarde),
                    max: parseFloat(r.max_waarde),
                };
            },
        );

        // Backwards-compatible aliases voor hernoemde parameters
        if (!obj['watertemperatuur'] && obj['temperatuur'])
            obj['watertemperatuur'] = obj['temperatuur'];
        if (obj['flow']) {
            if (!obj['flow_diep']) obj['flow_diep'] = obj['flow'];
            if (!obj['flow_ondiep']) obj['flow_ondiep'] = obj['flow'];
            if (!obj['flow_peuterbad']) obj['flow_peuterbad'] = obj['flow'];
        }
        if (obj['filter_druk']) {
            if (!obj['filter_druk_in']) obj['filter_druk_in'] = obj['filter_druk'];
            if (!obj['filter_druk_uit']) obj['filter_druk_uit'] = obj['filter_druk'];
            if (!obj['filter_druk_peuterbad']) obj['filter_druk_peuterbad'] = obj['filter_druk'];
        }
        delete obj['temperatuur'];
        delete obj['flow'];
        delete obj['filter_druk'];

        return obj;
    }

    getDefaults(): LimietenMap {
        const obj: LimietenMap = {};
        DEFAULT_LIMIETEN.forEach((l) => {
            obj[l.parameter_naam] = { min: l.min_waarde, max: l.max_waarde };
        });
        return obj;
    }

    async seedDefaults(): Promise<void> {
        for (const l of DEFAULT_LIMIETEN) {
            await this.pool.execute<ResultSetHeader>(
                'INSERT IGNORE INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?)',
                [l.parameter_naam, l.min_waarde, l.max_waarde],
            );
        }
    }

    async save(data: LimietInput): Promise<void> {
        const { parameter_naam, min_waarde, max_waarde } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)`,
            [parameter_naam, min_waarde, max_waarde],
        );
    }
}
