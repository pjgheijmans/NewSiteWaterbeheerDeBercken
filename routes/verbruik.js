const express = require('express');
const router = express.Router();
const repo = require('../repositories/verbruik');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

router.get('/diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVerbruik(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/diep-ondiep/vorige', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVorigeVerbruik(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { await repo.saveVerbruik(req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/verwarmingssysteem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVerwarming(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/verwarmingssysteem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { await repo.saveVerwarming(req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
