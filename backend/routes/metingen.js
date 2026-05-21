const express = require('express');
const router = express.Router();
const metingenRepo = require('../repositories/metingen');
const actiesRepo = require('../repositories/acties');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

router.get('/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await metingenRepo.getMetingen(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { bad_naam, filter_druk_in, filter_druk_uit } = req.body;
        const bad_id = await metingenRepo.getBadId(bad_naam);

        if (bad_naam === 'Peuterbad') {
            await metingenRepo.savePeuterbadMeting(bad_id, req.body);
        } else {
            await metingenRepo.saveGrootBadMeting(bad_id, req.body);
        }
        await actiesRepo.genereer(bad_id, req.body.datum, bad_naam, filter_druk_in, filter_druk_uit);
        res.json({ status: 'success' });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
    }
});

router.get('/acties', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum || new Date().toISOString().split('T')[0];
        res.json(await actiesRepo.getActies(datum));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/acties/:id/resolve', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { await actiesRepo.resolve(req.params.id); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
