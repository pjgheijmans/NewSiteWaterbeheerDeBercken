import express from 'express';
import path from 'path';
import session from 'express-session';
import pool from './repositories/db';
import { maakMetingenRouter } from './routes/metingen';
import { maakVerbruikRouter } from './routes/verbruik';
import { maakCoordinatorenRouter } from './routes/coordinatoren';

// Resterende routes zijn nog .js — worden stap voor stap omgezet naar TypeScript
/* eslint-disable @typescript-eslint/no-var-requires */
const { runInitSql }      = require('./repositories/database');
const authRoutes          = require('./routes/auth');
const gebruikersRoutes    = require('./routes/gebruikers');
const limietenRoutes      = require('./routes/limieten');
const trendRoutes         = require('./routes/trend');
const databaseRoutes      = require('./routes/database');
const logboekRoutes       = require('./routes/logboek');
const frontendRoutes      = require('./routes/frontend');
/* eslint-enable @typescript-eslint/no-var-requires */

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

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api',               authRoutes);
app.use('/api/gebruikers',    gebruikersRoutes);
app.use('/api/limieten',      limietenRoutes);
app.use('/api',               maakMetingenRouter(pool));
app.use('/api/coordinatoren', maakCoordinatorenRouter(pool));
app.use('/api/verbruik',      maakVerbruikRouter(pool));
app.use('/api/trend',         trendRoutes);
app.use('/api/database',      databaseRoutes);
app.use('/api/logboek',       logboekRoutes);

// Frontend: HTML-partials samenstellen (vóór static zodat / hier wordt afgehandeld)
app.use('/', frontendRoutes);

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
    await runInitSql();
    app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
})().catch((err: Error) => { console.error('Startfout:', err); process.exit(1); });
