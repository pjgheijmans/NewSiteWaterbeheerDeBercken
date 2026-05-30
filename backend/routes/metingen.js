/**
 * Routes for water quality metingen and generated acties.
 */
const express = require('express');
const router = express.Router();
const metingenRepo = require('../repositories/metingen');
const actiesRepo = require('../repositories/acties');
const coordRepo = require('../repositories/coordinatoren');
const { checkAuth, isWaterbeheerder } = require('../middleware/auth');

/**
 * Fetch current metingen for the specified datum.
 */
router.get('/metingen', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await metingenRepo.getMetingen(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save a meting and generate any related actie rules.
 */
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
        await actiesRepo.genereer(bad_id, req.body.datum, bad_naam, req.body);
        res.json({ status: 'success' });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
    }
});

/**
 * Fetch unresolved acties for a given datum.
 */
router.get('/acties', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum || new Date().toISOString().split('T')[0];
        res.json(await actiesRepo.getActies(datum));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Mark a specific actie as resolved.
 */
router.post('/acties/:id/resolve', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const g = req.session.gebruiker;
        const naam = [g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam;
        await actiesRepo.resolve(req.params.id, naam);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Return today's visitor count (from coordinator daggegevens) and trigger the bezoekers action check.
 */
router.get('/bezoekers', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const datum = req.query.datum;
        const dag = await coordRepo.getDaggegevens(datum);
        actiesRepo.genereerBezoekers(datum, dag.bezoekers_vandaag);
        const totalen = await actiesRepo.genereerSpoelbeurt(datum);
        res.json({
            bezoekers_vandaag:       dag.bezoekers_vandaag ?? null,
            bezoekers_totaal_diep:   totalen.diep          ?? null,
            bezoekers_totaal_ondiep: totalen.ondiep        ?? null,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Reopen a previously resolved actie (undo resolve).
 */
router.post('/acties/:id/unresolve', checkAuth, async (req, res) => {
    if (!isWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        await actiesRepo.unresolve(req.params.id);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
