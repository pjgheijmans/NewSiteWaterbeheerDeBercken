/**
 * Coordinatoren metingen routes for authorized coordinator and waterbeheerder users.
 */
const express = require('express');
const router = express.Router();
const repo = require('../repositories/coordinatoren');
const logboekRepo = require('../repositories/coordinatoren_logboek');
const actiesRepo = require('../repositories/acties');
const { checkAuth, isWaterbeheerderOrCoordinator } = require('../middleware/auth');

/**
 * Return coordinatoren metingen for the requested date.
 */
router.get('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getCoordinatoren(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save a coordinatoren meting by bad_naam.
 */
router.post('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const bad_id = await repo.getBadId(req.body.bad_naam);
        const g = req.session.gebruiker;
        const auteur = [g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam;
        await repo.saveMeting(bad_id, req.body, auteur);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

/**
 * Return the checklist record for the requested date.
 */
router.get('/checklist', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getChecklist(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save the checklist record for a date.
 */
router.post('/checklist', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { await repo.saveChecklist(req.body.datum, req.body); res.json({ status: 'success' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Return the daggegevens record for the requested date.
 */
router.get('/daggegevens', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await repo.getDaggegevens(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Save the daggegevens record for a date.
 */
router.post('/daggegevens', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        await repo.saveDaggegevens(req.body.datum, req.body);
        actiesRepo.genereerBezoekers(req.body.datum, req.body.bezoekers_vandaag);                       // fire-and-forget
        actiesRepo.genereerSpoelbeurt(req.body.datum);                                                // fire-and-forget
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Delete all rows of one coordinator time block.
 * Expects query params: datum and tijdstip.
 */
router.delete('/', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    const { datum, tijdstip } = req.query;
    if (!datum || !tijdstip) return res.status(400).json({ error: 'datum en tijdstip zijn verplicht' });
    try {
        await repo.deleteBlok(datum, tijdstip);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Coordinator logboek ───────────────────────────────────────────────────

router.get('/logboek', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try { res.json(await logboekRepo.getByDatum(req.query.datum)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logboek', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { datum, tijdstip, tekst } = req.body;
        const g = req.session.gebruiker;
        const auteur = [g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam;
        const row = await logboekRepo.save(datum, tijdstip, tekst ?? '', auteur);
        res.json({ status: 'success', id: row?.id ?? null, auteur: row?.auteur ?? auteur });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/logboek/:id', checkAuth, async (req, res) => {
    if (!isWaterbeheerderOrCoordinator(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    try {
        await logboekRepo.deleteById(req.params.id);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
