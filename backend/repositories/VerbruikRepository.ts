import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput } from '../types';
import { IVerbruikRepository } from './IVerbruikRepository';

export class VerbruikRepository implements IVerbruikRepository {
    constructor(private readonly pool: Pool) {}

    async getVerbruik(datum: string): Promise<VerbruikData> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [datum]
        );
        return (rows[0] as VerbruikData) ?? {};
    }

    async getVorigeVerbruik(datum: string): Promise<VerbruikData> {
        const d = new Date(datum);
        d.setDate(d.getDate() - 1);
        const vorigeDatum = d.toISOString().split('T')[0];
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [vorigeDatum]
        );
        return (rows[0] as VerbruikData) ?? {};
    }

    async saveVerbruik(data: VerbruikInput): Promise<void> {
        const { datum, floculant, water_diep, water_ondiep, water_totaal,
                elektriciteit_nacht, elektriciteit_dag, gas,
                chemicalien_chloor, chemicalien_zwavelzuur } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO verbruik_diep_ondiep
                (datum, floculant, water_diep, water_ondiep, water_totaal,
                 elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                floculant = VALUES(floculant), water_diep = VALUES(water_diep),
                water_ondiep = VALUES(water_ondiep), water_totaal = VALUES(water_totaal),
                elektriciteit_nacht = VALUES(elektriciteit_nacht), elektriciteit_dag = VALUES(elektriciteit_dag),
                gas = VALUES(gas), chemicalien_chloor = VALUES(chemicalien_chloor),
                chemicalien_zwavelzuur = VALUES(chemicalien_zwavelzuur)`,
            [datum, floculant ?? null, water_diep ?? null, water_ondiep ?? null, water_totaal ?? null,
             elektriciteit_nacht ?? null, elektriciteit_dag ?? null, gas ?? null,
             chemicalien_chloor ?? null, chemicalien_zwavelzuur ?? null]
        );
    }

    async getVerwarming(datum: string): Promise<VerwarmingData> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT * FROM verwarmings_systeem_diep_ondiep WHERE datum = ?', [datum]
        );
        return (rows[0] as VerwarmingData) ?? {};
    }

    async saveVerwarming(data: VerwarmingInput): Promise<void> {
        const { datum, verwarming_status_1, verwarming_status_2, verwarming_status_3,
                verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO verwarmings_systeem_diep_ondiep
                (datum, verwarming_status_1, verwarming_status_2, verwarming_status_3,
                 verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                verwarming_status_1 = VALUES(verwarming_status_1),
                verwarming_status_2 = VALUES(verwarming_status_2),
                verwarming_status_3 = VALUES(verwarming_status_3),
                verwarming_status_4 = VALUES(verwarming_status_4),
                verwarming_druk_ok = VALUES(verwarming_druk_ok),
                verwarming_visuele_controle = VALUES(verwarming_visuele_controle)`,
            [datum, verwarming_status_1 ?? null, verwarming_status_2 ?? null,
             verwarming_status_3 ?? null, verwarming_status_4 ?? null,
             verwarming_druk_ok ?? null, verwarming_visuele_controle ?? null]
        );
    }
}
