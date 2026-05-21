/**
 * Repository for coordinatoren metingen.
 */
const pool = require('./db');

/**
 * Load coordinatoren metingen for a date.
 */
async function getCoordinatoren(datum) {
    const [rows] = await pool.execute(
        'SELECT b.naam AS bad_naam, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM baden b LEFT JOIN metingen_coordinatoren mc ON b.id = mc.bad_id AND mc.datum = ?',
        [datum]
    );
    return rows;
}

/**
 * Resolve bad_id for coordinatoren metingen.
 */
async function getBadId(bad_naam) {
    const [rows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
    if (rows.length === 0) throw Object.assign(new Error('Bad niet gevonden'), { status: 400 });
    return rows[0].id;
}

/**
 * Insert or update a coordinatoren meting record.
 */
async function saveMeting(bad_id, { datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid }) {
    await pool.execute(
        'INSERT INTO metingen_coordinatoren (bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), watertemperatuur = VALUES(watertemperatuur), helderheid = VALUES(helderheid)',
        [bad_id, datum, ph_waarde, chloor_waarde, watertemperatuur, helderheid]
    );
}

module.exports = { getCoordinatoren, getBadId, saveMeting };
