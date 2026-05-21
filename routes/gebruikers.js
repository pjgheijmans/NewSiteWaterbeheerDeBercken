const express = require('express');
const router = express.Router();
const repo = require('../repositories/gebruikers');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

const guard = (req, res) => !isAdminOrWaterbeheerder(req.session.gebruiker.taak)
    && res.status(403).json({ error: 'Geen toegang' });

router.get('/', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { res.json(await repo.getAll()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { await repo.create(req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { await repo.update(req.params.id, req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { await repo.remove(req.params.id); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
