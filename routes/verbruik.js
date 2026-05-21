const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

router.get('/diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute('SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [req.query.datum]);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diep-ondiep/vorige', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const vorigeDatum = new Date(req.query.datum);
        vorigeDatum.setDate(vorigeDatum.getDate() - 1);
        const vorigeDatumStr = vorigeDatum.toISOString().split('T')[0];
        const [rows] = await pool.execute('SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [vorigeDatumStr]);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/diep-ondiep', checkAuth, async (req, res) => {
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

router.get('/verwarmingssysteem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute('SELECT * FROM verwarmings_systeem WHERE datum = ?', [req.query.datum]);
        res.json(rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/verwarmingssysteem', checkAuth, async (req, res) => {
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

module.exports = router;
