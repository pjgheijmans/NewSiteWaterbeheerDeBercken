import mysql, { Pool } from 'mysql2/promise';
import { Express } from 'express';
import request from 'supertest';
import { DatabaseRepository } from '../../../backend/repositories/DatabaseRepository';
import { LimietenRepository } from '../../../backend/repositories/LimietenRepository';
import { GebruikersRepository } from '../../../backend/repositories/GebruikersRepository';

/** Naam van de geïsoleerde testdatabase (raakt dev-data niet). */
const TEST_DB = process.env.TEST_DB_NAME || 'zwembad_status_test';

const cfg = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'geheim_wachtwoord',
};

/** Datatabellen die tussen tests geleegd worden (referentiedata blijft staan). */
const DATA_TABELLEN = [
    'logboek', 'coordinatoren_logboek', 'acties',
    'metingen_diep_ondiep', 'metingen_coordinatoren',
    'coordinatoren_checklist', 'coordinatoren_daggegevens',
    'metingen_peuterbad', 'verbruik_diep_ondiep', 'verwarmings_systeem_diep_ondiep',
];

/** Maak (indien nodig) de testdatabase aan en geef een pool ernaartoe terug. */
export async function maakTestPool(): Promise<Pool> {
    const root = await mysql.createConnection(cfg);
    await root.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\``);
    await root.end();
    return mysql.createPool({ ...cfg, database: TEST_DB, waitForConnections: true, connectionLimit: 5 });
}

/** Voer init.sql uit tegen de testdatabase en zaai standaard limieten + gebruikers. */
export async function initTestSchema(pool: Pool): Promise<void> {
    const limietenRepo   = new LimietenRepository(pool);
    const gebruikersRepo = new GebruikersRepository(pool);
    const dbRepo         = new DatabaseRepository(pool, limietenRepo, gebruikersRepo);
    await dbRepo.runInitSql();
    await dbRepo.seedAllDefaults();
}

/** Leeg de datatabellen voor isolatie tussen tests; laat baden/gebruikers/limieten staan. */
export async function truncateData(pool: Pool): Promise<void> {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabel of DATA_TABELLEN) {
        try { await pool.query(`TRUNCATE TABLE \`${tabel}\``); } catch { /* tabel bestaat mogelijk nog niet */ }
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

/** Standaard testgebruikers uit seedDefaults. */
export const TEST_USERS = {
    waterbeheerder: { username: 'pheijmans', password: 'Paul' },
    administrator:  { username: 'Admin',     password: 'lpphw' },
};

/** Log in en geef een Supertest-agent terug die de sessie-cookie meedraagt. */
export async function ingelogdeAgent(
    app: Express,
    rol: keyof typeof TEST_USERS = 'waterbeheerder',
): Promise<ReturnType<typeof request.agent>> {
    const agent = request.agent(app);
    const res = await agent.post('/api/login').send(TEST_USERS[rol]);
    if (res.status !== 200) throw new Error(`Inloggen als ${rol} mislukt: ${res.status} ${JSON.stringify(res.body)}`);
    return agent;
}
