const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

router.get('/metingen', checkAuth, async (req, res) => {
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

router.get('/verbruik', checkAuth, async (req, res) => {
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

module.exports = router;
