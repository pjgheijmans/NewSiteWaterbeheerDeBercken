const express = require('express');
const path = require('path');
const session = require('express-session');

/**
 * Configure and start the Express application.
 * The app exposes JSON APIs, session handling, backend routes and frontend asset delivery.
 */
const app = express();

app.use(express.json());
app.use(session({
    secret: 'zwembad_geheim_98765',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }
}));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api',          require('./routes/auth'));
app.use('/api/gebruikers',    require('./routes/gebruikers'));
app.use('/api/limieten',      require('./routes/limieten'));
app.use('/api',               require('./routes/metingen'));
app.use('/api/coordinatoren', require('./routes/coordinatoren'));
app.use('/api/verbruik',      require('./routes/verbruik'));
app.use('/api/trend',         require('./routes/trend'));
app.use('/api/database',      require('./routes/database'));
app.use('/api/logboek',       require('./routes/logboek'));

// Frontend: assemble HTML from partials (must come before static so / is handled here)
app.use('/', require('./routes/frontend'));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const pool = require('./repositories/db');
const { runInitSql } = require('./repositories/database');

async function waitForDb(maxAttempts = 15, intervalMs = 2000) {
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
})().catch(err => { console.error('Startfout:', err); process.exit(1); });
