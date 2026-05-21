const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isWaterbeheerderOrCoordinator } = require('../middleware/auth');

router.get('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute(
            'SELECT b.naam AS bad_naam, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM baden b LEFT JOIN metingen_coordinatoren mc ON b.id = mc.bad_id AND mc.datum = ?',
            [req.query.datum]
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, bad_naam, ph_waarde, chloor_waarde, watertemperatuur, helderheid } = req.body;
        const [badenRows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
        if (badenRows.length === 0) return res.status(400).json({ error: 'Bad niet gevonden' });
        const bad_id = badenRows[0].id;
        await pool.execute(
            'INSERT INTO metingen_coordinatoren (bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), watertemperatuur = VALUES(watertemperatuur), helderheid = VALUES(helderheid)',
            [bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid]
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
