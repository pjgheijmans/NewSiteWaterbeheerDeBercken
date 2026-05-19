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

async function syncDefaultLimieten() {
    const defaultLimits = [
        ['ph_waarde', 6.80, 7.60],
        ['chloor_waarde', 0.50, 1.50],
        ['flow_diep', 50.00, 200.00],
        ['flow_ondiep', 50.00, 200.00],
        ['flow_peuterbad', 50.00, 200.00],
        ['filter_druk_in', 0.20, 1.50],
        ['filter_druk_uit', 0.20, 1.50],
        ['filter_druk_peuterbad', 0.20, 1.50],
        ['watertemperatuur', 20.00, 30.00],
        ['elektriciteit_nacht', 0.00, 500.00],
        ['elektriciteit_dag', 0.00, 500.00],
        ['gas', 0.00, 500.00]
    ];

    for (const [parameter_naam, min_waarde, max_waarde] of defaultLimits) {
        await pool.execute(
            'INSERT IGNORE INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?)',
            [parameter_naam, min_waarde, max_waarde]
        );
    }
}

// Middleware om te controleren of iemand is ingelogd
function checkAuth(req, res, next) {
    if (!req.session || !req.session.gebruiker) {
        return res.status(401).json({ error: 'Niet ingelogd' });
    }
    next();
}

function isAdminOrWaterbeheerder(taak) {
    return taak === 'waterbeheerder' || taak === 'Administrator';
}

function isWaterbeheerder(taak) {
    return taak === 'waterbeheerder';
}

function isWaterbeheerderOrCoordinator(taak) {
    return taak === 'waterbeheerder' || taak === 'coordinator';
}

// ==========================================
// API ENDPOINTS: DATABASE BEHEER (NIEUW)
// ==========================================
app.post('/api/database/truncate/:tabelnaam', checkAuth, async (req, res) => {
    // Alleen waterbeheerders en administrators mogen de database beheren
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) {
        return res.status(403).json({ error: 'Geen toegang' });
    }

    const toegestaneTabellen = ['metingen', 'metingen_coordinatoren', 'metingen_peuterbad', 'verbruik_diep_ondiep', 'verwarmings_systeem', 'acties', 'limieten', 'gebruikers'];
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
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute('SELECT id, voornaam, achternaam, inlognaam, wachtwoord, taak FROM gebruikers');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gebruikers', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = req.body;
        await pool.execute('INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)', [voornaam, achternaam, inlognaam, wachtwoord, taak]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/gebruikers/:id', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = req.body;
        await pool.execute('UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?', [voornaam, achternaam, inlognaam, wachtwoord, taak, req.params.id]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gebruikers/:id', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
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

        if (!limietenObject.watertemperatuur && limietenObject.temperatuur) {
            limietenObject.watertemperatuur = limietenObject.temperatuur;
        }
        if (limietenObject.flow) {
            if (!limietenObject.flow_diep) limietenObject.flow_diep = limietenObject.flow;
            if (!limietenObject.flow_ondiep) limietenObject.flow_ondiep = limietenObject.flow;
            if (!limietenObject.flow_peuterbad) limietenObject.flow_peuterbad = limietenObject.flow;
        }
        if (limietenObject.filter_druk) {
            if (!limietenObject.filter_druk_in) limietenObject.filter_druk_in = limietenObject.filter_druk;
            if (!limietenObject.filter_druk_uit) limietenObject.filter_druk_uit = limietenObject.filter_druk;
            if (!limietenObject.filter_druk_peuterbad) limietenObject.filter_druk_peuterbad = limietenObject.filter_druk;
        }
        delete limietenObject.temperatuur;
        delete limietenObject.flow;
        delete limietenObject.filter_druk;

        res.json(limietenObject);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/limieten', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { parameter_naam, min_waarde, max_waarde } = req.body;
        await pool.execute('INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)', [parameter_naam, min_waarde, max_waarde]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum;
        const [rows] = await pool.execute(
            `SELECT b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow, mg.filter_druk_in, mg.filter_druk_uit, NULL AS water, NULL AS chemicalien_chloor, NULL AS chemicalien_zwavelzuur
             FROM baden b
             LEFT JOIN metingen_grote_baden mg ON b.id = mg.bad_id AND mg.datum = ?
             WHERE b.naam <> 'Peuterbad'
             UNION ALL
             SELECT b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde, NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit, mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur
             FROM baden b
             LEFT JOIN metingen_peuterbad mp ON b.id = mp.bad_id AND mp.datum = ?
             WHERE b.naam = 'Peuterbad'
             ORDER BY bad_naam`, [datum, datum]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/verbruik-diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum;
        const [rows] = await pool.execute('SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [datum]);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/verwarmings-systeem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum;
        const [rows] = await pool.execute('SELECT * FROM verwarmings_systeem WHERE datum = ?', [datum]);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/verbruik-diep-ondiep-vorige', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum;
        const vorigeDatum = new Date(datum);
        vorigeDatum.setDate(vorigeDatum.getDate() - 1);
        const vorigeDatumStr = vorigeDatum.toISOString().split('T')[0];
        const [rows] = await pool.execute('SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [vorigeDatumStr]);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/verbruik-diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur } = req.body;
        await pool.execute(
            'INSERT INTO verbruik_diep_ondiep (datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE floculant = VALUES(floculant), water_diep = VALUES(water_diep), water_ondiep = VALUES(water_ondiep), water_totaal = VALUES(water_totaal), elektriciteit_nacht = VALUES(elektriciteit_nacht), elektriciteit_dag = VALUES(elektriciteit_dag), gas = VALUES(gas), chemicalien_chloor = VALUES(chemicalien_chloor), chemicalien_zwavelzuur = VALUES(chemicalien_zwavelzuur)',
            [datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur]
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/verwarmings-systeem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle } = req.body;
        await pool.execute(
            'INSERT INTO verwarmings_systeem (datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE verwarming_status_1 = VALUES(verwarming_status_1), verwarming_status_2 = VALUES(verwarming_status_2), verwarming_status_3 = VALUES(verwarming_status_3), verwarming_status_4 = VALUES(verwarming_status_4), verwarming_druk_ok = VALUES(verwarming_druk_ok), verwarming_visuele_controle = VALUES(verwarming_visuele_controle)',
            [datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle]
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, bad_naam, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit, filter_druk, water, chemicalien_chloor, chemicalien_zwavelzuur } = req.body;
        const [badenRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
        if (badenRows.length === 0) return res.status(400).json({ error: 'Bad niet gevonden' });
        const bad_id = badenRows[0].id;

        if (bad_naam === 'Peuterbad') {
            await pool.execute(
                'INSERT INTO metingen_peuterbad (bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk_in, water, chemicalien_chloor, chemicalien_zwavelzuur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), flow = VALUES(flow), filter_druk_in = VALUES(filter_druk_in), water = VALUES(water), chemicalien_chloor = VALUES(chemicalien_chloor), chemicalien_zwavelzuur = VALUES(chemicalien_zwavelzuur)',
                [bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk || filter_druk_in || null, water, chemicalien_chloor, chemicalien_zwavelzuur]
            );
        } else {
            await pool.execute(
                'INSERT INTO metingen_grote_baden (bad_id, datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), temperatuur = VALUES(temperatuur), flow = VALUES(flow), filter_druk_in = VALUES(filter_druk_in), filter_druk_uit = VALUES(filter_druk_uit)',
                [bad_id, datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit]
            );
        }
        await genereerActies(bad_id, datum, bad_naam, filter_druk_in, filter_druk_uit);

        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

async function genereerActies(bad_id, datum, bad_naam, filter_druk_in, filter_druk_uit) {
    try {
        if (filter_druk_in !== null && filter_druk_uit !== null && bad_naam === 'Diep') {
            const verschil = filter_druk_in - filter_druk_uit;
            if (verschil > 0.4) {
                await pool.execute(
                    'INSERT IGNORE INTO acties (bad_id, datum, beschrijving, actie_type) VALUES (?, ?, ?, ?)',
                    [bad_id, datum, 'Filterdruk verschil groter dan 0.4 bar - Filter spoelen nodig', 'filter_spoelen']
                );
            } else {
                await pool.execute(
                    'DELETE FROM acties WHERE bad_id = ? AND datum = ? AND actie_type = ? AND opgelost = FALSE',
                    [bad_id, datum, 'filter_spoelen']
                );
            }
        }
    } catch (err) {
        console.error('Fout bij genereren acties:', err);
    }
}

app.get('/api/acties', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum || new Date().toISOString().split('T')[0];
        const [rows] = await pool.execute(
            'SELECT a.id, b.naam AS bad_naam, a.beschrijving, a.actie_type, a.opgelost FROM acties a JOIN baden b ON a.bad_id = b.id WHERE a.datum = ? AND a.opgelost = FALSE ORDER BY a.created_at DESC',
            [datum]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/acties/:id/resolve', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        await pool.execute(
            'UPDATE acties SET opgelost = TRUE, opgelost_op = NOW() WHERE id = ?',
            [req.params.id]
        );        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/coordinatoren', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute('SELECT b.naam AS bad_naam, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM baden b LEFT JOIN metingen_coordinatoren mc ON b.id = mc.bad_id AND mc.datum = ?', [req.query.datum]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/coordinatoren', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
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
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) {
        return res.status(403).json({ error: 'Geen toegang' });
    }

    const toegestaneTabellen = ['metingen', 'metingen_grote_baden', 'metingen_peuterbad', 'metingen_coordinatoren', 'verbruik_diep_ondiep', 'verwarmings_systeem', 'acties', 'limieten', 'gebruikers'];
    const tabel = req.params.tabelnaam;

    if (!toegestaneTabellen.includes(tabel)) {
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    }

    try {
        // Haal alle data op uit de geselecteerde tabel
        let query = `SELECT * FROM ${tabel}`;
        
        // Voor de metingen-tabellen is het handiger om de badnaam direct mee te nemen ipv het bad_id
        if (tabel === 'metingen') {
            query = `SELECT b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit
                     FROM metingen_grote_baden m
                     JOIN baden b ON m.bad_id = b.id
                     ORDER BY datum DESC`;
        } else if (tabel === 'metingen_grote_baden') {
            query = `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit FROM metingen_grote_baden m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`;
        } else if (tabel === 'metingen_peuterbad') {
            query = `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk_in, m.water, m.chemicalien_chloor, m.chemicalien_zwavelzuur FROM metingen_peuterbad m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`;
        } else if (tabel === 'metingen_coordinatoren') {
            query = `SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC`;
        } else if (tabel === 'verbruik_diep_ondiep') {
            query = `SELECT datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur FROM verbruik_diep_ondiep ORDER BY datum DESC`;
        } else if (tabel === 'verwarmings_systeem') {
            query = `SELECT datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle FROM verwarmings_systeem ORDER BY datum DESC`;
        } else if (tabel === 'acties') {
            query = `SELECT a.id, b.naam AS bad_naam, a.datum, a.beschrijving, a.actie_type, a.opgelost, a.opgelost_op, a.created_at FROM acties a JOIN baden b ON a.bad_id = b.id ORDER BY a.datum DESC`;
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
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) {
        return res.status(403).json({ error: 'Geen toegang' });
    }

    const toegestaneTabellen = ['metingen', 'metingen_coordinatoren', 'metingen_peuterbad', 'verbruik_diep_ondiep', 'verwarmings_systeem', 'limieten', 'gebruikers'];
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

            if (tabel === 'metingen' || tabel === 'metingen_coordinatoren' || tabel === 'metingen_peuterbad') {
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

            const actualTabel = tabel === 'metingen' ? 'metingen_grote_baden' : tabel;
            const query = `INSERT INTO ${actualTabel} (${sqlKolommenText}) VALUES (${sqlParametersText}) ON DUPLICATE KEY UPDATE ${sqlUpdateText}`;
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

// ==========================================
// API ENDPOINTS: TRENDANALYSE
// ==========================================
app.get('/api/trend/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { van, tot } = req.query;
        const [rows] = await pool.execute(
            `SELECT mg.datum, b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow, mg.filter_druk_in, mg.filter_druk_uit
             FROM metingen_grote_baden mg JOIN baden b ON mg.bad_id = b.id
             WHERE mg.datum BETWEEN ? AND ?
             UNION ALL
             SELECT mp.datum, b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde, NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit
             FROM metingen_peuterbad mp JOIN baden b ON mp.bad_id = b.id
             WHERE mp.datum BETWEEN ? AND ?
             ORDER BY datum ASC, bad_naam ASC`,
            [van, tot, van, tot]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/trend/verbruik', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { van, tot } = req.query;
        const [algemeenRows] = await pool.execute(
            `SELECT datum, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur
             FROM verbruik_diep_ondiep WHERE datum BETWEEN ? AND ? ORDER BY datum ASC`,
            [van, tot]
        );
        const [peuterbadRows] = await pool.execute(
            `SELECT mp.datum, mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur FROM metingen_peuterbad mp
             JOIN baden b ON mp.bad_id = b.id
             WHERE b.naam = 'Peuterbad' AND mp.datum BETWEEN ? AND ? ORDER BY mp.datum ASC`,
            [van, tot]
        );
        res.json({ algemeen: algemeenRows, peuterbad: peuterbadRows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, 'public')));

syncDefaultLimieten().catch(err => console.error('Kon standaard limieten niet synchroniseren:', err.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
