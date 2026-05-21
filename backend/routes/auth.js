const express = require('express');
const router = express.Router();
const gebruikerRepo = require('../repositories/gebruikers');

/**
 * Authenticate a user with login credentials and store the user object in session.
 */
router.post('/login', async (req, res) => {
    try {
        const gebruiker = await gebruikerRepo.findByLogin(req.body.username, req.body.password);
        if (!gebruiker) return res.status(401).json({ error: 'Onjuiste inlognaam of wachtwoord' });
        req.session.gebruiker = gebruiker;
        res.json({ status: 'success', gebruiker });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

/**
 * Log the current user out by destroying the session.
 */
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: 'success' });
});

/**
 * Return the current authentication state and user object if logged in.
 */
router.get('/ingelogd', (req, res) => {
    if (req.session && req.session.gebruiker)
        res.json({ ingelogd: true, gebruiker: req.session.gebruiker });
    else
        res.json({ ingelogd: false });
});

module.exports = router;
