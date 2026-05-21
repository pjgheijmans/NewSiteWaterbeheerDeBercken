const express = require('express');
const router = express.Router();
const repo = require('../repositories/gebruikers');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

/**
 * Helper to enforce admin or waterbeheerder permission for gebruikers management.
 */
const guard = (req, res) => !isAdminOrWaterbeheerder(req.session.gebruiker.taak)
    && res.status(403).json({ error: 'Geen toegang' });

/**
 * Return the full list of users for management screens.
 */
router.get('/', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { res.json(await repo.getAll()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Create a new gebruiker record.
 */
router.post('/', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { await repo.create(req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Update an existing gebruiker by id.
 */
router.put('/:id', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { await repo.update(req.params.id, req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Delete a gebruiker by id.
 */
router.delete('/:id', checkAuth, async (req, res) => {
    if (guard(req, res)) return;
    try { await repo.remove(req.params.id); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
