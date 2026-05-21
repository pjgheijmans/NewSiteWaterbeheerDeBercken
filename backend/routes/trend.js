/**
 * Analytics trend API routes for metingen and verbruik history.
 */
const express = require('express');
const router = express.Router();
const repo = require('../repositories/trend');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

/**
 * Return trend data for metingen between two dates.
 */
router.get('/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getMetingenTrend(req.query.van, req.query.tot)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Return trend data for verbruik values between two dates.
 */
router.get('/verbruik', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getVerbruikTrend(req.query.van, req.query.tot)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
