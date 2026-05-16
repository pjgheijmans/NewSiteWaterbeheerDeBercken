const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');

const app = express();
app.use(express.json());

// Sessie-beheer configureren
app.use(session({
    secret: 'zwembad_geheim_98765',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 } // Sessie verloopt na 2 uur
}));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'geheim_wachtwoord',
    database: process.env.DB_NAME || 'zwembad_status',
    waitForConnections: true,
    connectionLimit: 10
}).promise();

// Middleware om te controleren of iemand is ingelogd
function checkAuth(req, res, next) {
    if (!req.session || !req.session.gebruiker) {
        return res.status(401).json({ error: 'Niet ingelogd' });
    }
    next();
}

// ==========================================
// API ENDPOINTS: DATABASE BEHEER (NIEUW)
// ==========================================
app.post('/api/database/truncate/:tabelnaam', checkAuth, async (req, res) => {
    // Alleen waterbeheerders mogen de database beheren
    if (req.session.gebruiker.taak !== 'waterbeheerder') {
        return res.status(403).json({ error: 'Geen toegang' });
    }

    const toegestaneTabellen = ['metingen', 'metingen_coordinatoren', 'limieten', 'gebruikers'];
    const tabel = req.params.tabelnaam;

    if (!toegestaneTabellen.includes(tabel)) {
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    }

    try {
        // Schakel foreign key checks tijdelijk uit om truncaten mogelijk te maken bij gekoppelde tabellen
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
        await pool.execute(`TRUNCATE TABLE ${tabel}`);
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

        res.json({ status: 'success', message: `Tabel ${tabel} succesvol geleegd.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// API ENDPOINTS: AUTHENTICATIE & GEBRUIKERS
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.execute('SELECT id, voornaam, achternaam, inlognaam, taak FROM gebruikers WHERE inlognaam = ? AND wachtwoord = ?', [username, password]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Onjuiste inlognaam of wachtwoord' });
        }
        
        req.session.gebruiker = rows[0];
        res.json({ status: 'success', gebruiker: rows[0] });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: 'success' });
});

app.get('/api/ingelogd', (req, res) => {
    if (req.session && req.session.gebruiker) {
        res.json({ ingelogd: true, gebruiker: req.session.gebruiker });
    } else { 
        res.json({ ingelogd: false }); 
    }
});

app.get('/api/gebruikers', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute('SELECT id, voornaam, achternaam, inlognaam, wachtwoord, taak FROM gebruikers');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gebruikers', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = req.body;
        await pool.execute('INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)', [voornaam, achternaam, inlognaam, wachtwoord, taak]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/gebruikers/:id', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = req.body;
        await pool.execute('UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?', [voornaam, achternaam, inlognaam, wachtwoord, taak, req.params.id]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gebruikers/:id', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') return res.status(403).json({ error: 'Geen toegang' });
    try {
        await pool.execute('DELETE FROM gebruikers WHERE id = ?', [req.params.id]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API ENDPOINTS: MEETWAARDEN & LIMIETEN
// ==========================================
app.get('/api/limieten', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT parameter_naam, min_waarde, max_waarde FROM limieten');
        const limietenObject = {};
        rows.forEach(r => { limietenObject[r.parameter_naam] = { min: parseFloat(r.min_waarde), max: parseFloat(r.max_waarde) }; });
        res.json(limietenObject);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/limieten', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { parameter_naam, min_waarde, max_waarde } = req.body;
        await pool.execute('INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)', [parameter_naam, min_waarde, max_waarde]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/metingen', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT b.naam AS bad_naam, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk FROM baden b LEFT JOIN metingen m ON b.id = m.bad_id AND m.datum = ?', [req.query.datum]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/metingen', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, bad_naam, ph_waarde, chloor_waarde, flow, filter_druk } = req.body;
        const [badenRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
        if (badenRows.length === 0) return res.status(400).json({ error: 'Bad niet gevonden' });
        const bad_id = badenRows[0].id;
        
        await pool.execute('INSERT INTO metingen (bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), flow = VALUES(flow), filter_druk = VALUES(filter_druk)', [bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/coordinatoren', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT b.naam AS bad_naam, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM baden b LEFT JOIN metingen_coordinatoren mc ON b.id = mc.bad_id AND mc.datum = ?', [req.query.datum]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/coordinatoren', checkAuth, async (req, res) => {
    try {
        const { datum, bad_naam, ph_waarde, chloor_waarde, watertemperatuur, helderheid } = req.body;
        const [badenRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
        if (badenRows.length === 0) return res.status(400).json({ error: 'Bad niet gevonden' });
        const bad_id = badenRows[0].id;
        
        await pool.execute('INSERT INTO metingen_coordinatoren (bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), watertemperatuur = VALUES(watertemperatuur), helderheid = VALUES(helderheid)', [bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API ENDPOINTS: CSV EXPORT (NIEUW)
// ==========================================
app.get('/api/database/export/:tabelnaam', checkAuth, async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') {
        return res.status(403).json({ error: 'Geen toegang' });
    }

    const toegestaneTabellen = ['metingen', 'metingen_coordinatoren', 'limieten', 'gebruikers'];
    const tabel = req.params.tabelnaam;

    if (!toegestaneTabellen.includes(tabel)) {
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    }

    try {
        // Haal alle data op uit de geselecteerde tabel
        let query = `SELECT * FROM ${tabel}`;
        
        // Voor de metingen-tabellen is het handiger om de badnaam direct mee te nemen ipv het bad_id
        if (tabel === 'metingen') {
            query = `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk FROM metingen m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`;
        } else if (tabel === 'metingen_coordinatoren') {
            query = `SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC`;
        }

        const [rows] = await pool.execute(query);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tabel is leeg, niets te exporteren' });
        }

        // Pak de kolomnamen uit het eerste resultaat voor de header-rij van de CSV
        const kolommen = Object.keys(rows[0]);
        let csvInhoud = kolommen.join(';') + '\r\n'; // Excel herkent een puntkomma (;) in Europa direct als scheidingsteken

        // Loop door alle database-rijen heen
        rows.forEach(rij => {
            const regel = kolommen.map(kolomName => {
                let waarde = rij[kolomName];
                if (waarde === null || waarde === undefined) return '';
                // Als de waarde een datum-object is, converteer naar YYYY-MM-DD
                if (waarde instanceof Date) {
                    return waarde.toISOString().split('T')[0];
                }
                // Vervang eventuele puntkomma's in tekstvelden om breuken in de CSV te voorkomen
                return String(waarde).replace(/;/g, ',');
            });
            csvInhoud += regel.join(';') + '\r\n';
        });

        // Stel de juiste headers in zodat de browser het bestand direct gaat downloaden
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=export_${tabel}_${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csvInhoud);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// API ENDPOINTS: CSV IMPORT (NIEUW)
// ==========================================
app.post('/api/database/import/:tabelnaam', checkAuth, express.text({ type: 'text/csv', limit: '10mb' }), async (req, res) => {
    if (req.session.gebruiker.taak !== 'waterbeheerder') {
        return res.status(403).json({ error: 'Geen toegang' });
    }

    const toegestaneTabellen = ['metingen', 'metingen_coordinatoren', 'limieten', 'gebruikers'];
    const tabel = req.params.tabelnaam;

    if (!toegestaneTabellen.includes(tabel)) {
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    }

    const ruweTekst = req.body;
    if (!ruweTekst) return res.status(400).json({ error: 'Geen CSV data ontvangen' });

    // Splits de tekst in losse regels en filter lege regels eruit
    const regels = ruweTekst.split(/\r?\n/).filter(line => line.trim() !== '');
    if (regels.length < 2) return res.status(400).json({ error: 'CSV-bestand bevat geen data' });

    // Pak de kolomnamen uit de allereerste regel (de header-rij)
    const kolommen = regels[0].split(';');
    const dataRegels = regels.slice(1);

    try {
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

        for (const regel of dataRegels) {
            const waarden = regel.split(';');
            if (waarden.length !== kolommen.length) continue; // Sla corrupte regels over

            // Maak een object van de kolom-waarde paren voor deze specifieke rij
            const rijObject = {};
            kolommen.forEach((kolom, index) => {
                let waarde = waarden[index].trim();
                rijObject[kolom] = waarde === '' ? null : waarde;
            });

            if (tabel === 'metingen' || tabel === 'metingen_coordinatoren') {
                // Converteer de bad_naam tekst uit de CSV terug naar het numerieke bad_id
                const [badRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [rijObject['bad_naam']]);
                if (badRows.length > 0) {
                    rijObject['bad_id'] = badRows[0].id;
                }
                delete rijObject['bad_naam']; // Verwijder de tijdelijke tekstkolom
            }

            // Bouw de dynamische SQL INSERT ... ON DUPLICATE KEY UPDATE query op
            const actieveKolommen = Object.keys(rijObject).filter(k => k !== 'id');
            const sqlKolommenText = actieveKolommen.join(', ');
            const sqlParametersText = actieveKolommen.map(() => '?').join(', ');
            const sqlUpdateText = actieveKolommen.map(k => `${k} = VALUES(${k})`).join(', ');

            const query = `INSERT INTO ${tabel} (${sqlKolommenText}) VALUES (${sqlParametersText}) ON DUPLICATE KEY UPDATE ${sqlUpdateText}`;
            const queryParameters = actieveKolommen.map(k => rijObject[k]);

            await pool.execute(query, queryParameters);
        }

        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
        res.json({ status: 'success', message: 'CSV succesvol geïmporteerd' });

    } catch (err) {
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
