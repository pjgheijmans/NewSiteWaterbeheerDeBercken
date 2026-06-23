import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { LogboekEntry, LogboekSaveResult } from '../types';
import { ICoordinatorenLogboekRepository } from './ICoordinatorenLogboekRepository';

export class CoordinatorenLogboekRepository implements ICoordinatorenLogboekRepository {
    constructor(private readonly pool: Pool) {}

    async getByDatum(datum: string): Promise<LogboekEntry[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, tijdstip, auteur, tekst FROM coordinatoren_logboek WHERE datum = ? ORDER BY tijdstip ASC',
            [datum],
        );
        return rows as LogboekEntry[];
    }

    /**
     * Voeg een nieuwe regel in of update tekst bij een bestaand tijdstip.
     * auteur wordt alleen bij de eerste insert opgeslagen, niet overschreven bij duplicate.
     */
    async save(
        datum: string,
        tijdstip: string,
        tekst: string,
        auteur: string | null,
    ): Promise<LogboekSaveResult | null> {
        await this.pool.execute<ResultSetHeader>(
            `INSERT INTO coordinatoren_logboek (datum, tijdstip, auteur, tekst) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE tekst = VALUES(tekst)`,
            [datum, tijdstip, auteur, tekst],
        );
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, auteur FROM coordinatoren_logboek WHERE datum = ? AND tijdstip = ?',
            [datum, tijdstip],
        );
        return (rows[0] as LogboekSaveResult) ?? null;
    }

    async getDatumById(id: string): Promise<string | null> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            "SELECT DATE_FORMAT(datum, '%Y-%m-%d') AS datum FROM coordinatoren_logboek WHERE id = ?",
            [id],
        );
        return (rows[0] as { datum: string } | undefined)?.datum ?? null;
    }

    async deleteById(id: string): Promise<void> {
        await this.pool.execute<ResultSetHeader>('DELETE FROM coordinatoren_logboek WHERE id = ?', [
            id,
        ]);
    }
}
