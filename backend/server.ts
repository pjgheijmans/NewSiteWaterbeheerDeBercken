import pool from './repositories/db';
import { LimietenRepository }   from './repositories/LimietenRepository';
import { GebruikersRepository } from './repositories/GebruikersRepository';
import { DatabaseRepository }   from './repositories/DatabaseRepository';
import { maakApp } from './app';

/**
 * Opstarten: wacht op de database, voer init.sql uit en start de server.
 * De app-samenstelling zit in maakApp() (backend/app.ts).
 */
const PORT = parseInt(process.env.PORT || '3000', 10);

// DatabaseRepository voor runInitSql() bij het opstarten.
const gebruikersRepo = new GebruikersRepository(pool);
const databaseRepo = new DatabaseRepository(
    pool,
    new LimietenRepository(pool),
    gebruikersRepo,
);

async function waitForDb(maxAttempts = 15, intervalMs = 2000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await pool.query('SELECT 1');
            return;
        } catch {
            console.log(`Wachten op database (${i + 1}/${maxAttempts})...`);
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }
    throw new Error('Database niet bereikbaar na meerdere pogingen');
}

(async () => {
    await waitForDb();
    await databaseRepo.runInitSql();
    // R-002: hash eventuele legacy plaintext-wachtwoorden (incl. de seed-accounts).
    await gebruikersRepo.hashBestaandeWachtwoorden();
    const app = maakApp(pool);
    app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
})().catch((err: Error) => { console.error('Startfout:', err); process.exit(1); });
