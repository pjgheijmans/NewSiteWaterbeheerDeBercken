const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'geheim_wachtwoord',
    database: process.env.DB_NAME || 'zwembad_status',
    waitForConnections: true,
    connectionLimit: 10
}).promise();

// ==========================================
// API ENDPOINTS: LIMIETEN
// ==========================================
app.get('/api/limieten', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT parameter_naam, min_waarde, max_waarde FROM limieten');
        const limietenObject = {};
        rows.forEach(r => {
            limietenObject[r.parameter_naam] = { min: parseFloat(r.min_waarde), max: parseFloat(r.max_waarde) };
        });
        res.json(limietenObject);
    } catch (err) {
        console.error("Fout in GET /api/limieten:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/limieten', async (req, res) => {
    try {
        const { parameter_naam, min_waarde, max_waarde } = req.body;
        const query = `
            INSERT INTO limieten (parameter_naam, min_waarde, max_waarde)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)
        `;
        await pool.execute(query, [parameter_naam, min_waarde, max_waarde]);
        res.json({ status: 'success' });
    } catch (err) {
        console.error("Fout in POST /api/limieten:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// API ENDPOINTS: WATERBEHEER (Metingen)
// ==========================================
app.get('/api/metingen', async (req, res) => {
    try {
        const datum = req.query.datum || new Date().toISOString().split('T')[0];
        const query = `
            SELECT b.naam AS bad_naam, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk 
            FROM baden b 
            LEFT JOIN metingen m ON b.id = m.bad_id AND m.datum = ?
        `;
        const [rows] = await pool.execute(query, [datum]);
        res.json(rows);
    } catch (err) { 
        console.error("Fout in GET /api/metingen:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/metingen', async (req, res) => {
    try {
        const { datum, bad_naam, ph_waarde, chloor_waarde, flow, filter_druk } = req.body;
        
        const [badenRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
        if (badenRows.length === 0) return res.status(400).json({ error: 'Bad niet gevonden' });
        const bad_id = badenRows[0].id; // Gecorrigeerd naar het eerste element uit de lijst

        const query = `
            INSERT INTO metingen (bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), 
                flow = VALUES(flow), filter_druk = VALUES(filter_druk)
        `;
        await pool.execute(query, [bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk]);
        res.json({ status: 'success' });
    } catch (err) { 
        console.error("Fout in POST /api/metingen:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

// ==========================================
// API ENDPOINTS: COORDINATOREN
// ==========================================
app.get('/api/coordinatoren', async (req, res) => {
    try {
        const datum = req.query.datum || new Date().toISOString().split('T')[0];
        const query = `
            SELECT b.naam AS bad_naam, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid 
            FROM baden b 
            LEFT JOIN metingen_coordinatoren mc ON b.id = mc.bad_id AND mc.datum = ?
        `;
        const [rows] = await pool.execute(query, [datum]);
        res.json(rows);
    } catch (err) { 
        console.error("Fout in GET /api/coordinatoren:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/coordinatoren', async (req, res) => {
    try {
        const { datum, bad_naam, ph_waarde, chloor_waarde, watertemperatuur, helderheid } = req.body;
        
        const [badenRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
        if (badenRows.length === 0) return res.status(400).json({ error: 'Bad niet gevonden' });
        const bad_id = badenRows[0].id; // Gecorrigeerd naar het eerste element uit de lijst

        const query = `
            INSERT INTO metingen_coordinatoren (bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), 
                watertemperatuur = VALUES(watertemperatuur), helderheid = VALUES(helderheid)
        `;
        await pool.execute(query, [bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid]);
        res.json({ status: 'success' });
    } catch (err) { 
        console.error("Fout in POST /api/coordinatoren:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server gestart op http://localhost:${PORT}`));
