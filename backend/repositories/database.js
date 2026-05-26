/**
 * Generic repository for database export/import/truncate utilities.
 */
const pool = require('./db');
const limietenRepo = require('./limieten');
const gebruikersRepo = require('./gebruikers');

const ALL_DATA_TABLES = [
    'acties',
    'metingen_diep_ondiep',
    'metingen_coordinatoren',
    'coordinatoren_checklist',
    'coordinatoren_daggegevens',
    'metingen_peuterbad',
    'verbruik_diep_ondiep',
    'verwarmings_systeem_grote_baden',
    'limieten',
    'gebruikers',
];

const EXPORT_QUERIES = {
    metingen_diep_ondiep:  `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit FROM metingen_diep_ondiep m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
    metingen_peuterbad:    `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk_in, m.water, m.chemicalien_chloor, m.chemicalien_zwavelzuur FROM metingen_peuterbad m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
    metingen_coordinatoren:`SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.tijdstip, mc.ph_waarde, mc.chloor_vrij, mc.chloor_totaal, mc.watertemperatuur, mc.helderheid, mc.bad_gebruikt FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC, mc.tijdstip ASC`,
    coordinatoren_checklist:  `SELECT datum, proef_waterspeel, proef_spraypark, proef_douches, proef_glijbaan, opmerkingen FROM coordinatoren_checklist ORDER BY datum DESC`,
    coordinatoren_daggegevens:`SELECT datum, lucht_temperatuur, bezoekers_vandaag, bezoekers_totaal_spoelbeurt FROM coordinatoren_daggegevens ORDER BY datum DESC`,
    verbruik_diep_ondiep:  `SELECT datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur FROM verbruik_diep_ondiep ORDER BY datum DESC`,
    verwarmings_systeem_grote_baden:`SELECT datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle FROM verwarmings_systeem_grote_baden ORDER BY datum DESC`,
    acties:                `SELECT a.id, b.naam AS bad_naam, a.datum, a.beschrijving, a.actie_type, a.opgelost, a.opgelost_op, a.created_at FROM acties a JOIN baden b ON a.bad_id = b.id ORDER BY a.datum DESC`,
};

/**
 * Export rows from the requested table.
 */
async function exportRows(tabel) {
    const query = EXPORT_QUERIES[tabel] || `SELECT * FROM ${tabel}`;
    const [rows] = await pool.execute(query);
    return rows;
}

/**
 * Truncate the specified table with foreign key checks disabled.
 */
async function truncate(tabel) {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute(`TRUNCATE TABLE ${tabel}`);
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Resolve a bad_id from its naam for CSV imports.
 */
async function getBadId(bad_naam) {
    const [rows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
    return rows.length > 0 ? rows[0].id : null;
}

/**
 * Import or update a row in a flexible table during CSV import.
 */
async function importRow(actualTabel, columns, values) {
    const cols = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const updates = columns.map(c => `${c} = VALUES(${c})`).join(', ');
    await pool.execute(
        `INSERT INTO ${actualTabel} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
        values
    );
}

/**
 * Enable or disable MySQL foreign key checks.
 */
async function setForeignKeyChecks(on) {
    await pool.execute(`SET FOREIGN_KEY_CHECKS = ${on ? 1 : 0}`);
}

/**
 * Truncate every data table, wiping all content including limieten and gebruikers.
 */
async function truncateAll() {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabel of ALL_DATA_TABLES) {
        await pool.execute(`TRUNCATE TABLE ${tabel}`);
    }
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Seed default limieten and gebruikers after a fresh truncate.
 */
async function seedAllDefaults() {
    await limietenRepo.seedDefaults();
    await gebruikersRepo.seedDefaults();
}

module.exports = { exportRows, truncate, truncateAll, seedAllDefaults, getBadId, importRow, setForeignKeyChecks };
