import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { WaterbeheerDienst, WaterbeheerDienstInput } from '../types';
import { IDienstRepository } from './IDienstRepository';

/** Bewaart per dag wie er dienst had bij waterbeheer (twee personen). */
export class DienstRepository implements IDienstRepository {
    constructor(private readonly pool: Pool) {}

    async getDienst(datum: string): Promise<WaterbeheerDienst> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT dienst_1, dienst_2 FROM waterbeheer_dienst WHERE datum = ?',
            [datum]
        );
        return (rows[0] as WaterbeheerDienst) ?? { dienst_1: null, dienst_2: null };
    }

    async saveDienst(data: WaterbeheerDienstInput): Promise<void> {
        const { datum, dienst_1, dienst_2 } = data;
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO waterbeheer_dienst (datum, dienst_1, dienst_2)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE dienst_1 = VALUES(dienst_1), dienst_2 = VALUES(dienst_2)`,
            [datum, dienst_1 ?? null, dienst_2 ?? null]
        );
    }
}
