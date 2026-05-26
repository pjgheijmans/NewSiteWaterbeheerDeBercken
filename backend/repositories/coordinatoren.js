/**
 * Repository for coordinatoren metingen.
 */
const pool = require('./db');

/**
 * Load coordinatoren metingen for a date, grouped into time blocks.
 * @returns {Array} Array of blocks: [{tijdstip, metingen: [{bad_naam, ...}]}]
 */
async function getCoordinatoren(datum) {
    const [rows] = await pool.execute(
        `SELECT b.naam AS bad_naam, mc.tijdstip,
                mc.ph_waarde, mc.chloor_vrij, mc.chloor_totaal,
                mc.watertemperatuur, mc.helderheid, mc.bad_gebruikt
         FROM metingen_coordinatoren mc
         JOIN baden b ON b.id = mc.bad_id
         WHERE mc.datum = ?
         ORDER BY mc.tijdstip ASC, b.id ASC`,
        [datum]
    );

    const blokken = new Map();
    rows.forEach(row => {
        const tijdstip = row.tijdstip;
        if (!blokken.has(tijdstip)) blokken.set(tijdstip, { tijdstip, metingen: [] });
        blokken.get(tijdstip).metingen.push({
            bad_naam:         row.bad_naam,
            ph_waarde:        row.ph_waarde,
            chloor_vrij:      row.chloor_vrij,
            chloor_totaal:    row.chloor_totaal,
            watertemperatuur: row.watertemperatuur,
            helderheid:       row.helderheid,
            bad_gebruikt:     row.bad_gebruikt,
        });
    });
    return Array.from(blokken.values());
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
 * Insert or update a coordinatoren meting record including tijdstip.
 */
async function saveMeting(bad_id, { datum, tijdstip, ph_waarde, chloor_vrij, chloor_totaal, watertemperatuur, helderheid, bad_gebruikt }) {
    await pool.execute(
        `INSERT INTO metingen_coordinatoren
           (bad_id, datum, tijdstip, ph_waarde, chloor_vrij, chloor_totaal, watertemperatuur, helderheid, bad_gebruikt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           ph_waarde        = VALUES(ph_waarde),
           chloor_vrij      = VALUES(chloor_vrij),
           chloor_totaal    = VALUES(chloor_totaal),
           watertemperatuur = VALUES(watertemperatuur),
           helderheid       = VALUES(helderheid),
           bad_gebruikt     = VALUES(bad_gebruikt)`,
        [bad_id, datum, tijdstip || '00:00:00',
         ph_waarde, chloor_vrij, chloor_totaal,
         watertemperatuur, helderheid ?? null, bad_gebruikt ?? null]
    );
}

/**
 * Delete all pool rows for one time block on a given date.
 */
async function deleteBlok(datum, tijdstip) {
    await pool.execute(
        'DELETE FROM metingen_coordinatoren WHERE datum = ? AND tijdstip = ?',
        [datum, tijdstip]
    );
}

/**
 * Load checklist record for a date, returning defaults when none exists yet.
 */
async function getChecklist(datum) {
    const [rows] = await pool.execute(
        'SELECT proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, opmerkingen FROM coordinatoren_checklist WHERE datum = ?',
        [datum]
    );
    return rows[0] || { proef_waterspeel: 0, proef_spraypark: 0, proef_douches: 0, proef_glijbaan: 0, opmerkingen: '' };
}

/**
 * Insert or update the checklist record for a date.
 */
async function saveChecklist(datum, { proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, opmerkingen }) {
    await pool.execute(
        `INSERT INTO coordinatoren_checklist (datum, proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, opmerkingen)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           proef_waterspeel = VALUES(proef_waterspeel),
           proef_spraypark  = VALUES(proef_spraypark),
           proef_douches    = VALUES(proef_douches),
           proef_glijbaan   = VALUES(proef_glijbaan),
           opmerkingen      = VALUES(opmerkingen)`,
        [datum, proef_waterspeel ? 1 : 0, proef_spraypark ? 1 : 0,
                proef_douches ? 1 : 0, proef_glijbaan ? 1 : 0, opmerkingen || null]
    );
}

module.exports = { getCoordinatoren, getBadId, saveMeting, deleteBlok, getChecklist, saveChecklist };
