const pool = require('../db');

const EXPORT_QUERIES = {
    metingen:              `SELECT b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit FROM metingen_grote_baden m JOIN baden b ON m.bad_id = b.id ORDER BY datum DESC`,
    metingen_grote_baden: `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit FROM metingen_grote_baden m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
    metingen_peuterbad:    `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk_in, m.water, m.chemicalien_chloor, m.chemicalien_zwavelzuur FROM metingen_peuterbad m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
    metingen_coordinatoren:`SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC`,
    verbruik_diep_ondiep:  `SELECT datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur FROM verbruik_diep_ondiep ORDER BY datum DESC`,
    verwarmings_systeem:   `SELECT datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle FROM verwarmings_systeem ORDER BY datum DESC`,
    acties:                `SELECT a.id, b.naam AS bad_naam, a.datum, a.beschrijving, a.actie_type, a.opgelost, a.opgelost_op, a.created_at FROM acties a JOIN baden b ON a.bad_id = b.id ORDER BY a.datum DESC`,
};

async function exportRows(tabel) {
    const query = EXPORT_QUERIES[tabel] || `SELECT * FROM ${tabel}`;
    const [rows] = await pool.execute(query);
    return rows;
}

async function truncate(tabel) {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    await pool.execute(`TRUNCATE TABLE ${tabel}`);
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
}

async function getBadId(bad_naam) {
    const [rows] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [bad_naam]);
    return rows.length > 0 ? rows[0].id : null;
}

async function importRow(actualTabel, columns, values) {
    const cols = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const updates = columns.map(c => `${c} = VALUES(${c})`).join(', ');
    await pool.execute(
        `INSERT INTO ${actualTabel} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
        values
    );
}

async function setForeignKeyChecks(on) {
    await pool.execute(`SET FOREIGN_KEY_CHECKS = ${on ? 1 : 0}`);
}

module.exports = { exportRows, truncate, getBadId, importRow, setForeignKeyChecks };
