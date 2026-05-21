const express = require('express');
const router = express.Router();
const repo = require('../repositories/coordinatoren');
const { checkAuth, isWaterbeheerderOrCoordinator } = require('../middleware/auth');

router.get('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getCoordinatoren(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const bad_id = await repo.getBadId(req.body.bad_naam);
        await repo.saveMeting(bad_id, req.body);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

module.exports = router;
