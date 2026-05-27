/**
 * Logboek routes for waterbeheerder users.
 */
const express = require('express');
const router = express.Router();
const repo = require('../repositories/logboek');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

/**
 * Return all logboek entries for the requested date.
 */
router.get('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getByDatum(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save (insert or update) a logboek entry. Returns the row id.
 */
router.post('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, tijdstip, tekst } = req.body;
        const g = req.session.gebruiker;
        const auteur = [g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam;
        const row = await repo.save(datum, tijdstip, tekst ?? '', auteur);
        res.json({ status: 'success', id: row?.id ?? null, auteur: row?.auteur ?? auteur });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Delete a logboek entry by id.
 */
router.delete('/:id', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        await repo.deleteById(req.params.id);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
