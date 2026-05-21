function checkAuth(req, res, next) {
    if (!req.session || !req.session.gebruiker) {
        return res.status(401).json({ error: 'Niet ingelogd' });
    }
    next();
}

function isAdminOrWaterbeheerder(taak) {
    return taak === 'waterbeheerder' || taak === 'Administrator';
}

function isWaterbeheerder(taak) {
    return taak === 'waterbeheerder';
}

function isWaterbeheerderOrCoordinator(taak) {
    return taak === 'waterbeheerder' || taak === 'coordinator';
}

module.exports = { checkAuth, isAdminOrWaterbeheerder, isWaterbeheerder, isWaterbeheerderOrCoordinator };
