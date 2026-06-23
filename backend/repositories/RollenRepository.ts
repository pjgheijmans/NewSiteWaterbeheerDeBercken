import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Rol, RolRechten, Domein, Rechtniveau } from '../types';
import { IRollenRepository, RolInput } from './IRollenRepository';

/** De drie domeinen, in vaste volgorde voor de matrix. */
const DOMEINEN: Domein[] = ['beheer', 'waterbeheer', 'coordinator'];

export class RollenRepository implements IRollenRepository {
    constructor(private readonly pool: Pool) {}

    async getAll(): Promise<Rol[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT r.id, r.naam, r.mag_historie_bewerken, rr.domein, rr.niveau
             FROM rollen r
             LEFT JOIN rol_rechten rr ON rr.rol_id = r.id
             ORDER BY r.id`,
        );
        const perRol = new Map<number, Rol>();
        for (const row of rows as Array<{
            id: number;
            naam: string;
            mag_historie_bewerken: number;
            domein: Domein | null;
            niveau: Rechtniveau | null;
        }>) {
            let rol = perRol.get(row.id);
            if (!rol) {
                // Begin met alle domeinen op 'geen' zodat de matrix altijd compleet is.
                const rechten: RolRechten = {};
                for (const d of DOMEINEN) rechten[d] = 'geen';
                rol = {
                    id: row.id,
                    naam: row.naam,
                    mag_historie_bewerken: !!row.mag_historie_bewerken,
                    rechten,
                };
                perRol.set(row.id, rol);
            }
            if (row.domein && row.niveau) rol.rechten[row.domein] = row.niveau;
        }
        return [...perRol.values()];
    }

    async create(naam: string): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            'INSERT INTO rollen (naam, mag_historie_bewerken) VALUES (?, 0)',
            [naam],
        );
    }

    async update(id: string, data: RolInput): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            'UPDATE rollen SET naam = ?, mag_historie_bewerken = ? WHERE id = ?',
            [data.naam, data.mag_historie_bewerken ? 1 : 0, id],
        );
        for (const domein of DOMEINEN) {
            const niveau: Rechtniveau = data.rechten[domein] ?? 'geen';
            await this.pool.execute<ResultSetHeader>(
                `INSERT INTO rol_rechten (rol_id, domein, niveau) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE niveau = VALUES(niveau)`,
                [id, domein, niveau],
            );
        }
    }

    async remove(id: string): Promise<void> {
        // rol_rechten en gebruiker_rollen ruimen zichzelf op via ON DELETE CASCADE.
        await this.pool.execute<ResultSetHeader>('DELETE FROM rollen WHERE id = ?', [id]);
    }
}
