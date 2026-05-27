/**
 * Repository for coordinator logboek entries.
 */
const pool = require('./db');

async function getByDatum(datum) {
    const [rows] = await pool.execute(
        'SELECT id, tijdstip, auteur, tekst FROM coordinatoren_logboek WHERE datum = ? ORDER BY tijdstip ASC',
        [datum]
    );
    return rows;
}

/**
 * Insert a new entry or update tekst when an entry with the same tijdstip exists.
 * auteur is only stored on first insert — not overwritten on duplicate.
 * Returns { id, auteur }.
 */
async function save(datum, tijdstip, tekst, auteur) {
    await pool.execute(
        `INSERT INTO coordinatoren_logboek (datum, tijdstip, auteur, tekst) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE tekst = VALUES(tekst)`,
        [datum, tijdstip, auteur ?? null, tekst]
    );
    const [rows] = await pool.execute(
        'SELECT id, auteur FROM coordinatoren_logboek WHERE datum = ? AND tijdstip = ?',
        [datum, tijdstip]
    );
    return rows[0] ?? null;
}

async function deleteById(id) {
    await pool.execute('DELETE FROM coordinatoren_logboek WHERE id = ?', [id]);
}

module.exports = { getByDatum, save, deleteById };
