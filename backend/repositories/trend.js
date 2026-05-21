/**
 * Repository for trend data aggregation queries.
 */
const pool = require('./db');

/**
 * Get metingen trend data between two dates.
 */
async function getMetingenTrend(van, tot) {
    const [rows] = await pool.execute(
        `SELECT mg.datum, b.naam AS bad_naam, mg.ph_waarde, mg.chloor_waarde, mg.temperatuur, mg.flow, mg.filter_druk_in, mg.filter_druk_uit
             FROM metingen_grote_baden mg JOIN baden b ON mg.bad_id = b.id
             WHERE mg.datum BETWEEN ? AND ?
             UNION ALL
             SELECT mp.datum, b.naam AS bad_naam, mp.ph_waarde, mp.chloor_waarde, NULL AS temperatuur, mp.flow, mp.filter_druk_in, NULL AS filter_druk_uit
             FROM metingen_peuterbad mp JOIN baden b ON mp.bad_id = b.id
             WHERE mp.datum BETWEEN ? AND ?
             ORDER BY datum ASC, bad_naam ASC`,
        [van, tot, van, tot]
    );
    return rows;
}

/**
 * Get historical verbruik data between two dates.
 */
async function getVerbruikTrend(van, tot) {
    const [algemeenRows] = await pool.execute(
        `SELECT datum, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur
             FROM verbruik_diep_ondiep WHERE datum BETWEEN ? AND ? ORDER BY datum ASC`,
        [van, tot]
    );
    const [peuterbadRows] = await pool.execute(
        `SELECT mp.datum, mp.water, mp.chemicalien_chloor, mp.chemicalien_zwavelzuur FROM metingen_peuterbad mp
             JOIN baden b ON mp.bad_id = b.id
             WHERE b.naam = 'Peuterbad' AND mp.datum BETWEEN ? AND ? ORDER BY mp.datum ASC`,
        [van, tot]
    );
    return { algemeen: algemeenRows, peuterbad: peuterbadRows };
}

module.exports = { getMetingenTrend, getVerbruikTrend };
