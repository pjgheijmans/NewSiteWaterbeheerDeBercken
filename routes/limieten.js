const express = require('express');
const router = express.Router();
const repo = require('../repositories/limieten');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try { res.json(await repo.getAll()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { await repo.save(req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
