import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Configuratie } from '../types';
import { IConfiguratieRepository } from './IConfiguratieRepository';

/** Toegang tot de generieke `configuratie`-tabel (sleutel/waarde). */
export class ConfiguratieRepository implements IConfiguratieRepository {
    constructor(private readonly pool: Pool) {}

    async getAll(): Promise<Configuratie[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT sleutel, waarde, omschrijving, type FROM configuratie ORDER BY sleutel',
        );
        return rows as Configuratie[];
    }

    async upsert(sleutel: string, waarde: string): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO configuratie (sleutel, waarde) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE waarde = VALUES(waarde)`,
            [sleutel, waarde],
        );
    }
}
