/**
 * Repository for generated actie rules and resolution state.
 */
const pool = require('./db');

/**
 * Get unresolved acties for a specified date.
 * @param {string} datum - ISO date string.
 * @returns {Promise<Array>} List of acties.
 */
async function getActies(datum) {
    const [rows] = await pool.execute(
        'SELECT a.id, b.naam AS bad_naam, a.beschrijving, a.actie_type, a.opgelost FROM acties a JOIN baden b ON a.bad_id = b.id WHERE a.datum = ? AND a.opgelost = FALSE ORDER BY a.created_at DESC',
        [datum]
    );
    return rows;
}

/**
 * Mark an actie as resolved.
 * @param {number} id - The actie primary key.
 */
async function resolve(id) {
    await pool.execute(
        'UPDATE acties SET opgelost = TRUE, opgelost_op = NOW() WHERE id = ?',
        [id]
    );
}

/**
 * Generate or remove filter-related acties based on druk differences.
 */
async function genereer(bad_id, datum, bad_naam, filter_druk_in, filter_druk_uit) {
    if (filter_druk_in === null || filter_druk_uit === null || bad_naam !== 'Diep') return;
    const verschil = filter_druk_in - filter_druk_uit;
    if (verschil > 0.4) {
        await pool.execute(
            'INSERT IGNORE INTO acties (bad_id, datum, beschrijving, actie_type) VALUES (?, ?, ?, ?)',
            [bad_id, datum, 'Filterdruk verschil groter dan 0.4 bar - Filter spoelen nodig', 'filter_spoelen']
        );
    } else {
        await pool.execute(
            'DELETE FROM acties WHERE bad_id = ? AND datum = ? AND actie_type = ? AND opgelost = FALSE',
            [bad_id, datum, 'filter_spoelen']
        );
    }
}

module.exports = { getActies, resolve, genereer };
