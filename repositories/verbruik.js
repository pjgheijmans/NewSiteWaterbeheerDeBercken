const pool = require('../db');

// ── Verbruik diep/ondiep ──────────────────────────────────────────────────

async function getVerbruik(datum) {
    const [rows] = await pool.execute(
        'SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [datum]
    );
    return rows[0] || {};
}

async function getVorigeVerbruik(datum) {
    const d = new Date(datum);
    d.setDate(d.getDate() - 1);
    const vorigeDatum = d.toISOString().split('T')[0];
    const [rows] = await pool.execute(
        'SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [vorigeDatum]
    );
    return rows[0] || {};
}

async function saveVerbruik({ datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur }) {
    await pool.execute(
        'INSERT INTO verbruik_diep_ondiep (datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE floculant = VALUES(floculant), water_diep = VALUES(water_diep), water_ondiep = VALUES(water_ondiep), water_totaal = VALUES(water_totaal), elektriciteit_nacht = VALUES(elektriciteit_nacht), elektriciteit_dag = VALUES(elektriciteit_dag), gas = VALUES(gas), chemicalien_chloor = VALUES(chemicalien_chloor), chemicalien_zwavelzuur = VALUES(chemicalien_zwavelzuur)',
        [datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur]
    );
}

// ── Verwarmingssysteem ────────────────────────────────────────────────────

async function getVerwarming(datum) {
    const [rows] = await pool.execute(
        'SELECT * FROM verwarmings_systeem WHERE datum = ?', [datum]
    );
    return rows[0] || {};
}

async function saveVerwarming({ datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle }) {
    await pool.execute(
        'INSERT INTO verwarmings_systeem (datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE verwarming_status_1 = VALUES(verwarming_status_1), verwarming_status_2 = VALUES(verwarming_status_2), verwarming_status_3 = VALUES(verwarming_status_3), verwarming_status_4 = VALUES(verwarming_status_4), verwarming_druk_ok = VALUES(verwarming_druk_ok), verwarming_visuele_controle = VALUES(verwarming_visuele_controle)',
        [datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle]
    );
}

module.exports = { getVerbruik, getVorigeVerbruik, saveVerbruik, getVerwarming, saveVerwarming };
