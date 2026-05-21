const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

router.get('/metingen', checkAuth, async (req, res) => {
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
             ORDER BY bad_naam`,
            [datum, datum]
        );
        res.json(rows);
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
    } catch (err) { console.error('Fout bij genereren acties:', err); }
}

router.post('/metingen', checkAuth, async (req, res) => {
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

router.get('/acties', checkAuth, async (req, res) => {
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

router.post('/acties/:id/resolve', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        await pool.execute('UPDATE acties SET opgelost = TRUE, opgelost_op = NOW() WHERE id = ?', [req.params.id]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
