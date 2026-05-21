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

// Frontend: assemble HTML from partials (must come before static so / is handled here)
app.use('/', require('./routes/frontend'));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
