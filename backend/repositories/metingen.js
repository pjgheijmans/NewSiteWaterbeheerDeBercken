/**
 * Repository for pool water metingen persistence.
 */
const pool = require('./db');

/**
 * Load all metingen rows for grootbaden and peuterbad for a given date.
 * @param {string} datum - ISO date string.
 * @returns {Promise<Array>} List of metingen rows.
 */
async function getMetingen(datum) {
    const [rows] = await pool.execute(
        `SELECT b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow, mg.filter_druk_in, mg.filter_druk_uit, NULL AS water, NULL AS chemicalien_chloor, NULL AS chemicalien_zwavelzuur
             FROM baden b
             LEFT JOIN metingen_diep_ondiep mg ON b.id = mg.bad_id AND mg.datum = ?
             WHERE b.naam <> 'Peuterbad'
             UNION ALL
             SELECT b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde, NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit, mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur
             FROM baden b
             LEFT JOIN metingen_peuterbad mp ON b.id = mp.bad_id AND mp.datum = ?
             WHERE b.naam = 'Peuterbad'
             ORDER BY bad_naam`,
        [datum, datum]
    );
    return rows;
}

/**
 * Resolve the numeric bad_id for a bad name.
 * Throws a 400 error when the pool is not found.
 */
async function getBadId(bad_naam) {
    const [rows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
    if (rows.length === 0) throw Object.assign(new Error('Bad niet gevonden'), { status: 400 });
    return rows[0].id;
}

/**
 * Insert or update a peuterbad meting record.
 */
async function savePeuterbadMeting(bad_id, { datum, ph_waarde, chloor_waarde, flow, filter_druk_in, filter_druk, water, chemicalien_chloor, chemicalien_zwavelzuur }) {
    await pool.execute(
        'INSERT INTO metingen_peuterbad (bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk_in, water, chemicalien_chloor, chemicalien_zwavelzuur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), flow = VALUES(flow), filter_druk_in = VALUES(filter_druk_in), water = VALUES(water), chemicalien_chloor = VALUES(chemicalien_chloor), chemicalien_zwavelzuur = VALUES(chemicalien_zwavelzuur)',
        [bad_id, datum, ph_waarde, chloor_waarde, flow, filter_druk || filter_druk_in || null, water, chemicalien_chloor, chemicalien_zwavelzuur]
    );
}

/**
 * Insert or update a groot bad meting record.
 */
async function saveGrootBadMeting(bad_id, { datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit }) {
    await pool.execute(
        'INSERT INTO metingen_diep_ondiep (bad_id, datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ph_waarde = VALUES(ph_waarde), chloor_waarde = VALUES(chloor_waarde), temperatuur = VALUES(temperatuur), flow = VALUES(flow), filter_druk_in = VALUES(filter_druk_in), filter_druk_uit = VALUES(filter_druk_uit)',
        [bad_id, datum, ph_waarde, chloor_waarde, temperatuur, flow, filter_druk_in, filter_druk_uit]
    );
}

module.exports = { getMetingen, getBadId, savePeuterbadMeting, saveGrootBadMeting };
