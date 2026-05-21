const pool = require('../db');

async function getAll() {
    const [rows] = await pool.execute('SELECT parameter_naam, min_waarde, max_waarde FROM limieten');
    const obj = {};
    rows.forEach(r => {
        obj[r.parameter_naam] = { min: parseFloat(r.min_waarde), max: parseFloat(r.max_waarde) };
    });

    // Backwards-compatible aliases for renamed parameters
    if (!obj.watertemperatuur && obj.temperatuur) obj.watertemperatuur = obj.temperatuur;
    if (obj.flow) {
        if (!obj.flow_diep) obj.flow_diep = obj.flow;
        if (!obj.flow_ondiep) obj.flow_ondiep = obj.flow;
        if (!obj.flow_peuterbad) obj.flow_peuterbad = obj.flow;
    }
    if (obj.filter_druk) {
        if (!obj.filter_druk_in) obj.filter_druk_in = obj.filter_druk;
        if (!obj.filter_druk_uit) obj.filter_druk_uit = obj.filter_druk;
        if (!obj.filter_druk_peuterbad) obj.filter_druk_peuterbad = obj.filter_druk;
    }
    delete obj.temperatuur;
    delete obj.flow;
    delete obj.filter_druk;

    return obj;
}

async function save({ parameter_naam, min_waarde, max_waarde }) {
    await pool.execute(
        'INSERT INTO limieten (parameter_naam, min_waarde, max_waarde) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE min_waarde = VALUES(min_waarde), max_waarde = VALUES(max_waarde)',
        [parameter_naam, min_waarde, max_waarde]
    );
}

module.exports = { getAll, save };
