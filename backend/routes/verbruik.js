/**
 * Split verbruik API routes for diep/ondiep consumption and verwarming system state.
 */
const express = require('express');
const router = express.Router();
const repo = require('../repositories/verbruik');
const actiesRepo = require('../repositories/acties');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

/**
 * Return current day's diep/ondiep verbruik record.
 */
router.get('/diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVerbruik(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Return the previous day's diep/ondiep verbruik record.
 */
router.get('/diep-ondiep/vorige', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVorigeVerbruik(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save or update diep/ondiep verbruik data.
 */
router.post('/diep-ondiep', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        await repo.saveVerbruik(req.body);
        await actiesRepo.genereerVerbruik(req.body.datum, req.body);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Return current verwarming systeem data for the selected date.
 */
router.get('/verwarmingssysteem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVerwarming(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save or update verwarming systeem state data.
 */
router.post('/verwarmingssysteem', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { await repo.saveVerwarming(req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
