import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Gebruiker, GebruikerRecord, GebruikerInput } from '../types';
import { IGebruikersRepository } from './IGebruikersRepository';

const DEFAULT_GEBRUIKERS: Array<GebruikerInput & { inlognaam: string }> = [
    { voornaam: 'Admin', achternaam: '',          inlognaam: 'Admin',     wachtwoord: 'lpphw', taak: 'Administrator'  },
    { voornaam: 'Paul',  achternaam: 'Heijmans',  inlognaam: 'pheijmans', wachtwoord: 'Paul',  taak: 'waterbeheerder' },
];

export class GebruikersRepository implements IGebruikersRepository {
    constructor(private readonly pool: Pool) {}

    async findByLogin(inlognaam: string, wachtwoord: string): Promise<Gebruiker | null> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, voornaam, achternaam, inlognaam, taak FROM gebruikers WHERE inlognaam = ? AND wachtwoord = ?',
            [inlognaam, wachtwoord]
        );
        return (rows[0] as Gebruiker) ?? null;
    }

    async getAll(): Promise<GebruikerRecord[]> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, voornaam, achternaam, inlognaam, wachtwoord, taak FROM gebruikers'
        );
        return rows as GebruikerRecord[];
    }

    async create(data: GebruikerInput): Promise<void> {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = data;
        await this.pool.execute<ResultSetHeader>(
            'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
            [voornaam, achternaam, inlognaam, wachtwoord, taak]
        );
    }

    async update(id: string, data: GebruikerInput): Promise<void> {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = data;
        await this.pool.execute<ResultSetHeader>(
            'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?',
            [voornaam, achternaam, inlognaam, wachtwoord, taak, id]
        );
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
                [g.voornaam, g.achternaam, g.inlognaam, g.wachtwoord, g.taak]
            );
        }
    }
}
