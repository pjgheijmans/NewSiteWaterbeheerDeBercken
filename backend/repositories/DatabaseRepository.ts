import fs from 'fs';
import path from 'path';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { IDatabaseRepository } from './IDatabaseRepository';
import { ILimietenRepository } from './ILimietenRepository';
import { IGebruikersRepository } from './IGebruikersRepository';

const ALL_DATA_TABLES = [
    'logboek',
    'coordinatoren_logboek',
    'acties',
    'metingen_diep_ondiep',
    'metingen_coordinatoren',
    'coordinatoren_checklist',
    'coordinatoren_daggegevens',
    'metingen_peuterbad',
    'verbruik_diep_ondiep',
    'verwarmings_systeem_diep_ondiep',
    'waterbeheer_dienst',
    'limieten',
    'gebruiker_rollen',
    'gebruikers',
];

const EXPORT_QUERIES: Record<string, string> = {
    logboek: `SELECT id, datum, tijdstip, auteur, tekst FROM logboek ORDER BY datum DESC, tijdstip ASC`,
    coordinatoren_logboek: `SELECT id, datum, tijdstip, auteur, tekst FROM coordinatoren_logboek ORDER BY datum DESC, tijdstip ASC`,
    metingen_diep_ondiep: `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit, m.kathodische_bescherming FROM metingen_diep_ondiep m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
    metingen_peuterbad: `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk_in, m.water, m.chemicalien_chloor, m.chemicalien_zwavelzuur FROM metingen_peuterbad m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
    metingen_coordinatoren: `SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.tijdstip, mc.ph_waarde, mc.chloor_vrij, mc.chloor_totaal, mc.watertemperatuur, mc.helderheid, mc.bad_gebruikt FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC, mc.tijdstip ASC`,
    coordinatoren_checklist: `SELECT datum, proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, auteur FROM coordinatoren_checklist ORDER BY datum DESC`,
    coordinatoren_daggegevens: `SELECT datum, lucht_temperatuur, bezoekers_vandaag, bezoekers_totaal_spoelbeurt, auteur FROM coordinatoren_daggegevens ORDER BY datum DESC`,
    waterbeheer_dienst: `SELECT datum, dienst_1, dienst_2 FROM waterbeheer_dienst ORDER BY datum DESC`,
    verbruik_diep_ondiep: `SELECT datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur FROM verbruik_diep_ondiep ORDER BY datum DESC`,
    verwarmings_systeem_diep_ondiep: `SELECT datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle FROM verwarmings_systeem_diep_ondiep ORDER BY datum DESC`,
    acties: `SELECT a.id, b.naam AS bad_naam, a.datum, a.beschrijving, a.actie_type, a.opgelost, a.opgelost_op, a.created_at FROM acties a JOIN baden b ON a.bad_id = b.id ORDER BY a.datum DESC`,
};

export class DatabaseRepository implements IDatabaseRepository {
    constructor(
        private readonly pool: Pool,
        private readonly limietenRepo: ILimietenRepository,
        private readonly gebruikersRepo: IGebruikersRepository,
    ) {}

    async exportRows(tabel: string): Promise<Record<string, unknown>[]> {
        const query = EXPORT_QUERIES[tabel] ?? `SELECT * FROM ${tabel}`;
        const [rows] = await this.pool.execute<RowDataPacket[]>(query);
        return rows as Record<string, unknown>[];
    }

    async runInitSql(): Promise<void> {
        const sql = fs.readFileSync(path.join(process.cwd(), 'init.sql'), 'utf8');
        const statements = sql
            .split('\n')
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n')
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        for (const stmt of statements) {
            try {
                await this.pool.query(stmt);
            } catch (err) {
                console.warn('init.sql statement warning:', (err as Error).message.slice(0, 120));
            }
        }
    }

    async truncate(tabel: string): Promise<void> {
        await this.pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await this.pool.query(`TRUNCATE TABLE ${tabel}`);
        await this.pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    async truncateAll(): Promise<void> {
        await this.pool.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const tabel of ALL_DATA_TABLES) {
            try {
                await this.pool.query(`TRUNCATE TABLE ${tabel}`);
            } catch (err) {
                console.warn(
                    `truncateAll: skipping ${tabel}: ${(err as Error).message.slice(0, 80)}`,
                );
            }
        }
        await this.pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    async seedAllDefaults(): Promise<void> {
        await this.limietenRepo.seedDefaults();
        await this.gebruikersRepo.seedDefaults();
    }

    async getBadId(bad_naam: string): Promise<number | null> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT id FROM baden WHERE naam = ?',
            [bad_naam],
        );
        return rows.length > 0 ? (rows[0] as { id: number }).id : null;
    }

    async importRow(actualTabel: string, columns: string[], values: unknown[]): Promise<void> {
        const cols = columns.join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const updates = columns.map((c) => `${c} = VALUES(${c})`).join(', ');
        await this.pool.execute(
            `INSERT INTO ${actualTabel} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
            values as import('mysql2').ExecuteValues,
        );
    }

    async setForeignKeyChecks(on: boolean): Promise<void> {
        await this.pool.execute(`SET FOREIGN_KEY_CHECKS = ${on ? 1 : 0}`);
    }
}
