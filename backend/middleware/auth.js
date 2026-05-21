/**
 * Ensure the request belongs to an authenticated user.
 * Sends 401 JSON when no active session user is found.
 */
function checkAuth(req, res, next) {
    if (!req.session || !req.session.gebruiker) {
        return res.status(401).json({ error: 'Niet ingelogd' });
    }
    next();
}

/**
 * Check whether the specified role may access administrative or waterbeheer features.
 * @param {string} taak - User role string from the session.
 * @returns {boolean} True when role is waterbeheerder or Administrator.
 */
function isAdminOrWaterbeheerder(taak) {
    return taak === 'waterbeheerder' || taak === 'Administrator';
}

/**
 * Check whether the specified role is strictly waterbeheerder.
 * @param {string} taak - User role string from the session.
 * @returns {boolean} True when role is waterbeheerder.
 */
function isWaterbeheerder(taak) {
    return taak === 'waterbeheerder';
}

function isWaterbeheerderOrCoordinator(taak) {
    return taak === 'waterbeheerder' || taak === 'coordinator';
}

module.exports = { checkAuth, isAdminOrWaterbeheerder, isWaterbeheerder, isWaterbeheerderOrCoordinator };
