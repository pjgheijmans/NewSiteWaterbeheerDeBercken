const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT parameter_naam, min_waarde, max_waarde FROM limieten');
        const limietenObject = {};
        rows.forEach(r => {
            limietenObject[r.parameter_naam] = { min: parseFloat(r.min_waarde), max: parseFloat(r.max_waarde) };
        });

        if (!limietenObject.watertemperatuur && limietenObject.temperatuur)
            limietenObject.watertemperatuur = limietenObject.temperatuur;

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

router.post('/', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { parameter_naam, min_waarde, max_waarde } = req.body;
        await pool.execute(
            'INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)',
            [parameter_naam, min_waarde, max_waarde]
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
