const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.execute(
            'SELECT id, voornaam, achternaam, inlognaam, taak FROM gebruikers WHERE inlognaam = ? AND wachtwoord = ?',
            [username, password]
        );
        if (rows.length === 0) return res.status(401).json({ error: 'Onjuiste inlognaam of wachtwoord' });
        req.session.gebruiker = rows[0];
        res.json({ status: 'success', gebruiker: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: 'success' });
});

router.get('/ingelogd', (req, res) => {
    if (req.session && req.session.gebruiker) {
        res.json({ ingelogd: true, gebruiker: req.session.gebruiker });
    } else {
        res.json({ ingelogd: false });
    }
});

module.exports = router;
