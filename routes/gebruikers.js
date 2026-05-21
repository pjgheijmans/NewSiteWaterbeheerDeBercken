const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

router.get('/', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const [rows] = await pool.execute('SELECT id, voornaam, achternaam, inlognaam, wachtwoord, taak FROM gebruikers');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = req.body;
        await pool.execute(
            'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord, taak) VALUES (?, ?, ?, ?, ?)',
            [voornaam, achternaam, inlognaam, wachtwoord, taak]
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        const { voornaam, achternaam, inlognaam, wachtwoord, taak } = req.body;
        await pool.execute(
            'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=?, taak=? WHERE id=?',
            [voornaam, achternaam, inlognaam, wachtwoord, taak, req.params.id]
        );
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    try {
        await pool.execute('DELETE FROM gebruikers WHERE id = ?', [req.params.id]);
        res.json({ status: 'success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
