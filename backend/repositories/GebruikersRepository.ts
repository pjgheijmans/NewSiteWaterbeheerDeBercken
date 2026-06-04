import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Gebruiker, GebruikerRecord, GebruikerInput } from '../types';
import { IGebruikersRepository } from './IGebruikersRepository';
import { hashWachtwoord, verifieerWachtwoord, isGehasht } from '../wachtwoord';

const DEFAULT_GEBRUIKERS: Array<GebruikerInput & { inlognaam: string }> = [
    { voornaam: 'Admin', achternaam: '',          inlognaam: 'Admin',     wachtwoord: 'lpphw', taak: 'Administrator'  },
    { voornaam: 'Paul',  achternaam: 'Heijmans',  inlognaam: 'pheijmans', wachtwoord: 'Paul',  taak: 'waterbeheerder' },
];

export class GebruikersRepository implements IGebruikersRepository {
    constructor(private readonly pool: Pool) {}

    async findByLogin(inlognaam: string, wachtwoord: string): Promise<Gebruiker | null> {
        // Haal de gebruiker op inlognaam op (incl. opgeslagen wachtwoord voor verificatie),
        // verifieer in code zodat scrypt-hashes met willekeurige salt werken.
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, voornaam, achternaam, inlognaam, taak, wachtwoord FROM gebruikers WHERE inlognaam = ?',
            [inlognaam]
        );
        const rij = rows[0] as (GebruikerRecord & { wachtwoord: string }) | undefined;
        if (!rij || !verifieerWachtwoord(wachtwoord, rij.wachtwoord)) return null;

        // Upgrade legacy plaintext naar een hash bij een geslaagde login (best-effort).
        if (!isGehasht(rij.wachtwoord)) {
            try {
                await this.pool.execute<ResultSetHeader>(
                    'UPDATE gebruikers SET wachtwoord = ? WHERE id = ?',
                    [hashWachtwoord(wachtwoord), rij.id]
                );
            } catch { /* upgrade is best-effort; login slaagt sowieso */ }
        }

        const { wachtwoord: _verborgen, ...veilig } = rij;
        return veilig as Gebruiker;
    }

    async getAll(): Promise<GebruikerRecord[]> {
        // Wachtwoord (hash) bewust NIET teruggeven aan de client.
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, voornaam, achternaam, inlognaam, taak FROM gebruikers'
        );
        return rows as GebruikerRecord[];
    }

    async create(data: GebruikerInput): Promise<void> {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = data;
        await this.pool.execute<ResultSetHeader>(
            'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
            [voornaam, achternaam, inlognaam, hashWachtwoord(wachtwoord), taak]
        );
    }

    async update(id: string, data: GebruikerInput): Promise<void> {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = data;
        if (wachtwoord) {
            // Nieuw wachtwoord opgegeven → hashen en meeschrijven.
            await this.pool.execute<ResultSetHeader>(
                'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?',
                [voornaam, achternaam, inlognaam, hashWachtwoord(wachtwoord), taak, id]
            );
        } else {
            // Leeg wachtwoord → bestaande hash behouden.
            await this.pool.execute<ResultSetHeader>(
                'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, taak=? WHERE id=?',
                [voornaam, achternaam, inlognaam, taak, id]
            );
        }
    }

    async remove(id: string): Promise<void> {
        await this.pool.execute<ResultSetHeader>(
            'DELETE FROM gebruikers WHERE id = ?', [id]
        );
    }

    async seedDefaults(): Promise<void> {
        for (const g of DEFAULT_GEBRUIKERS) {
            await this.pool.execute<ResultSetHeader>(
                'INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
                [g.voornaam, g.achternaam, g.inlognaam, hashWachtwoord(g.wachtwoord), g.taak]
            );
        }
    }

    /**
     * Eenmalige migratie: hash alle nog niet-gehashte (legacy plaintext)
     * wachtwoorden. Wordt bij het opstarten aangeroepen na runInitSql.
     */
    async hashBestaandeWachtwoorden(): Promise<void> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, wachtwoord FROM gebruikers'
        );
        for (const r of rows as Array<{ id: number; wachtwoord: string }>) {
            if (!isGehasht(r.wachtwoord)) {
                await this.pool.execute<ResultSetHeader>(
                    'UPDATE gebruikers SET wachtwoord = ? WHERE id = ?',
                    [hashWachtwoord(r.wachtwoord), r.id]
                );
            }
        }
    }
}
