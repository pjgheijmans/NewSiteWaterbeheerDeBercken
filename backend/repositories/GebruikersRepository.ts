import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Gebruiker, GebruikerRecord, GebruikerInput, RolRechten, Rechtniveau, Domein } from '../types';
import { IGebruikersRepository, GebruikerNaam } from './IGebruikersRepository';
import { hashWachtwoord, verifieerWachtwoord, isGehasht } from '../wachtwoord';

/** Standaardgebruikers + de rol die ze bij een verse database krijgen. */
const DEFAULT_GEBRUIKERS: Array<{ voornaam: string; achternaam: string; inlognaam: string; wachtwoord: string; rolNaam: string }> = [
    { voornaam: 'Admin', achternaam: '',         inlognaam: 'Admin',     wachtwoord: 'lpphw', rolNaam: 'Beheer'      },
    { voornaam: 'Paul',  achternaam: 'Heijmans', inlognaam: 'pheijmans', wachtwoord: 'Paul',  rolNaam: 'Waterbeheer' },
];

/** Niveaus oplopend in macht; index = rang. */
const NIVEAU_ORDE: Rechtniveau[] = ['geen', 'lezen', 'schrijven'];
function hoogste(a: Rechtniveau, b: Rechtniveau): Rechtniveau {
    return NIVEAU_ORDE.indexOf(a) >= NIVEAU_ORDE.indexOf(b) ? a : b;
}

export class GebruikersRepository implements IGebruikersRepository {
    constructor(private readonly pool: Pool) {}

    async findByLogin(inlognaam: string, wachtwoord: string): Promise<Gebruiker | null> {
        // Haal de gebruiker op inlognaam op (incl. opgeslagen wachtwoord voor verificatie),
        // verifieer in code zodat scrypt-hashes met willekeurige salt werken.
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, voornaam, achternaam, inlognaam, taak, wachtwoord FROM gebruikers WHERE inlognaam = ?',
            [inlognaam]
        );
        const rij = rows[0] as { id: number; voornaam: string; achternaam: string; inlognaam: string; taak: string | null; wachtwoord: string } | undefined;
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

        const { rechten, magHistorie, rolNamen } = await this._laadRechten(rij.id);
        return {
            id: rij.id,
            gebruikersnaam: rij.inlognaam,
            taak: rij.taak,
            voornaam: rij.voornaam,
            achternaam: rij.achternaam,
            inlognaam: rij.inlognaam,
            rechten,
            magHistorie,
            rolNamen,
        };
    }

    async getAll(): Promise<GebruikerRecord[]> {
        // Wachtwoord (hash) bewust NIET teruggeven aan de client.
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id, voornaam, achternaam, inlognaam FROM gebruikers'
        );
        const gebruikers = rows as GebruikerRecord[];

        // Rolkoppelingen in een aparte query ophalen en stitchen (geen N+1).
        const [koppels] = await this.pool.execute<RowDataPacket[]>(
            'SELECT gebruiker_id, rol_id FROM gebruiker_rollen'
        );
        const perGebruiker = new Map<number, number[]>();
        for (const k of koppels as Array<{ gebruiker_id: number; rol_id: number }>) {
            const lijst = perGebruiker.get(k.gebruiker_id) ?? [];
            lijst.push(k.rol_id);
            perGebruiker.set(k.gebruiker_id, lijst);
        }
        return gebruikers.map(g => ({ ...g, rol_ids: perGebruiker.get(g.id) ?? [] }));
    }

    async getMetRecht(domein: Domein, minNiveau: Rechtniveau): Promise<GebruikerNaam[]> {
        // Niveaus die tellen: alles vanaf `minNiveau` (bv. 'lezen' → lezen + schrijven).
        const toegestaan = NIVEAU_ORDE.slice(NIVEAU_ORDE.indexOf(minNiveau)).filter(n => n !== 'geen');
        if (toegestaan.length === 0) return [];
        const plaatshouders = toegestaan.map(() => '?').join(', ');
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT DISTINCT g.voornaam, g.achternaam, g.inlognaam
             FROM gebruikers g
             JOIN gebruiker_rollen gr ON gr.gebruiker_id = g.id
             JOIN rol_rechten rr ON rr.rol_id = gr.rol_id
             WHERE rr.domein = ? AND rr.niveau IN (${plaatshouders})`,
            [domein, ...toegestaan]
        );
        return rows as GebruikerNaam[];
    }

    async create(data: GebruikerInput): Promise<void> {
        const { voornaam, achternaam, inlognaam, wachtwoord, rol_ids } = data;
        await this._inTransactie(async (conn) => {
            const [res] = await conn.execute<ResultSetHeader>(
                'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord) VALUES (?, ?, ?, ?)',
                [voornaam, achternaam, inlognaam, hashWachtwoord(wachtwoord)]
            );
            await this._zetRollen(conn, res.insertId, rol_ids);
        });
    }

    async update(id: string, data: GebruikerInput): Promise<void> {
        const { voornaam, achternaam, inlognaam, wachtwoord, rol_ids } = data;
        await this._inTransactie(async (conn) => {
            if (wachtwoord) {
                // Nieuw wachtwoord opgegeven → hashen en meeschrijven.
                await conn.execute<ResultSetHeader>(
                    'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=? WHERE id=?',
                    [voornaam, achternaam, inlognaam, hashWachtwoord(wachtwoord), id]
                );
            } else {
                // Leeg wachtwoord → bestaande hash behouden.
                await conn.execute<ResultSetHeader>(
                    'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=? WHERE id=?',
                    [voornaam, achternaam, inlognaam, id]
                );
            }
            await this._zetRollen(conn, Number(id), rol_ids);
        });
    }

    async remove(id: string): Promise<void> {
        // gebruiker_rollen ruimt zichzelf op via ON DELETE CASCADE.
        await this.pool.execute<ResultSetHeader>(
            'DELETE FROM gebruikers WHERE id = ?', [id]
        );
    }

    async seedDefaults(): Promise<void> {
        for (const g of DEFAULT_GEBRUIKERS) {
            await this.pool.execute<ResultSetHeader>(
                'INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord) VALUES (?, ?, ?, ?)',
                [g.voornaam, g.achternaam, g.inlognaam, hashWachtwoord(g.wachtwoord)]
            );
            // Koppel (her)aan de standaardrol; idempotent via INSERT IGNORE.
            await this.pool.execute<ResultSetHeader>(
                `INSERT IGNORE INTO gebruiker_rollen (gebruiker_id, rol_id)
                 SELECT u.id, r.id FROM gebruikers u JOIN rollen r ON r.naam = ?
                 WHERE u.inlognaam = ?`,
                [g.rolNaam, g.inlognaam]
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

    /** Effectieve rechten van een gebruiker: hoogste niveau per domein over al zijn rollen. */
    private async _laadRechten(gebruikerId: number): Promise<{ rechten: RolRechten; magHistorie: boolean; rolNamen: string[] }> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            `SELECT r.naam, r.mag_historie_bewerken, rr.domein, rr.niveau
             FROM gebruiker_rollen gr
             JOIN rollen r ON r.id = gr.rol_id
             LEFT JOIN rol_rechten rr ON rr.rol_id = r.id
             WHERE gr.gebruiker_id = ?`,
            [gebruikerId]
        );
        const rechten: RolRechten = {};
        const rolNamenSet = new Set<string>();
        let magHistorie = false;
        for (const row of rows as Array<{ naam: string; mag_historie_bewerken: number; domein: Domein | null; niveau: Rechtniveau | null }>) {
            rolNamenSet.add(row.naam);
            if (row.mag_historie_bewerken) magHistorie = true;
            if (row.domein && row.niveau) {
                rechten[row.domein] = hoogste(rechten[row.domein] ?? 'geen', row.niveau);
            }
        }
        return { rechten, magHistorie, rolNamen: [...rolNamenSet] };
    }

    /** Vervang de rolkoppelingen van een gebruiker door precies `rol_ids`. */
    private async _zetRollen(conn: PoolConnection, gebruikerId: number, rol_ids: number[]): Promise<void> {
        await conn.execute('DELETE FROM gebruiker_rollen WHERE gebruiker_id = ?', [gebruikerId]);
        for (const rolId of rol_ids) {
            await conn.execute(
                'INSERT INTO gebruiker_rollen (gebruiker_id, rol_id) VALUES (?, ?)',
                [gebruikerId, rolId]
            );
        }
    }

    /** Voer `werk` uit binnen een transactie; rollt terug bij een fout. */
    private async _inTransactie<T>(werk: (conn: PoolConnection) => Promise<T>): Promise<T> {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const resultaat = await werk(conn);
            await conn.commit();
            return resultaat;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }
}
