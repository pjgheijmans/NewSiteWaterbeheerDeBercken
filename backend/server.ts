import express from 'express';
import path from 'path';
import session from 'express-session';

import pool from './repositories/db';
import { LimietenRepository }   from './repositories/LimietenRepository';
import { GebruikersRepository } from './repositories/GebruikersRepository';
import { DatabaseRepository }   from './repositories/DatabaseRepository';

import { maakAuthRouter }          from './routes/auth';
import { maakGebruikersRouter }    from './routes/gebruikers';
import { maakLimietenRouter }      from './routes/limieten';
import { maakMetingenRouter }      from './routes/metingen';
import { maakCoordinatorenRouter } from './routes/coordinatoren';
import { maakVerbruikRouter }      from './routes/verbruik';
import { maakTrendRouter }         from './routes/trend';
import { maakDatabaseRouter }      from './routes/database';
import { maakLogboekRouter }       from './routes/logboek';
import { maakFrontendRouter }      from './routes/frontend';

/**
 * Configureer en start de Express-applicatie.
 */
const app = express();

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'zwembad_geheim_98765',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }
}));

// DatabaseRepository wordt hier aangemaakt zodat runInitSql() bij het opstarten beschikbaar is.
const limietenRepo   = new LimietenRepository(pool);
const gebruikersRepo = new GebruikersRepository(pool);
const databaseRepo   = new DatabaseRepository(pool, limietenRepo, gebruikersRepo);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api',               maakAuthRouter(pool));
app.use('/api/gebruikers',    maakGebruikersRouter(pool));
app.use('/api/limieten',      maakLimietenRouter(pool));
app.use('/api',               maakMetingenRouter(pool));
app.use('/api/coordinatoren', maakCoordinatorenRouter(pool));
app.use('/api/verbruik',      maakVerbruikRouter(pool));
app.use('/api/trend',         maakTrendRouter(pool));
app.use('/api/database',      maakDatabaseRouter(databaseRepo));
app.use('/api/logboek',       maakLogboekRouter(pool));

// Frontend: HTML-partials samenstellen (vóór static zodat / hier wordt afgehandeld)
app.use('/', maakFrontendRouter());

// process.cwd() werkt zowel in dev (ts-node) als in prod (node dist/...)
app.use(express.static(path.join(process.cwd(), 'frontend')));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

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
    app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
})().catch((err: Error) => { console.error('Startfout:', err); process.exit(1); });
