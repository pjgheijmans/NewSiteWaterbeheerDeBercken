/**
 * Repository for generated actie rules and resolution state.
 */
const pool = require('./db');

async function getActies(datum) {
    const [rows] = await pool.execute(
        `SELECT a.id, b.naam AS bad_naam, a.beschrijving, a.actie_type,
                a.opgelost, a.opgelost_op, a.opgelost_door
         FROM acties a JOIN baden b ON a.bad_id = b.id
         WHERE a.datum = ?
         ORDER BY a.opgelost ASC, b.naam, a.actie_type`,
        [datum]
    );
    return rows;
}

async function resolve(id, opgelost_door) {
    await pool.execute(
        'UPDATE acties SET opgelost = TRUE, opgelost_op = NOW(), opgelost_door = ? WHERE id = ?',
        [opgelost_door ?? null, id]
    );
}

async function unresolve(id) {
    await pool.execute(
        'UPDATE acties SET opgelost = FALSE, opgelost_op = NULL, opgelost_door = NULL WHERE id = ?',
        [id]
    );
}

/**
 * Load action thresholds from the limieten table (all actie_* entries).
 * Falls back to hardcoded defaults when a value is missing.
 */
async function laadDrempelwaarden() {
    const defaults = {
        actie_druk_verschil:  0.40,
        actie_druk_peuterbad: 1.00,
        actie_flow_diep:      250,
        actie_flow_ondiep:    75,
        actie_flow_peuterbad: 4,
        actie_chloor_min:     200,
        actie_zwavelzuur_min: 50,
        actie_bezoekers_max:  750,
        actie_spoelbeurt_max: 1500,
    };
    try {
        const [rows] = await pool.execute(
            "SELECT parameter_naam, max_waarde FROM limieten WHERE parameter_naam LIKE 'actie_%'"
        );
        rows.forEach(r => { defaults[r.parameter_naam] = parseFloat(r.max_waarde); });
    } catch (err) {
        console.warn('laadDrempelwaarden fallback:', err.message);
    }
    return defaults;
}

/**
 * Helper: insert action if condition is true, delete (unresolved) if false.
 */
async function stelIn(bad_id, datum, actie_type, beschrijving, actief) {
    if (actief) {
        await pool.execute(
            'INSERT IGNORE INTO acties (bad_id, datum, beschrijving, actie_type) VALUES (?, ?, ?, ?)',
            [bad_id, datum, beschrijving, actie_type]
        );
    } else {
        await pool.execute(
            'DELETE FROM acties WHERE bad_id = ? AND datum = ? AND actie_type = ? AND opgelost = FALSE',
            [bad_id, datum, actie_type]
        );
    }
}

/**
 * Generate or remove acties based on meetwaarden for one pool.
 */
async function genereer(bad_id, datum, bad_naam, body) {
    const d = await laadDrempelwaarden();

    const drukIn  = parseFloat(body.filter_druk_in  ?? body.filter_druk ?? NaN);
    const drukUit = parseFloat(body.filter_druk_uit ?? NaN);
    const flow    = parseFloat(body.flow ?? NaN);

    if (bad_naam === 'Diep' || bad_naam === 'Ondiep') {
        // Filter druk difference
        if (!isNaN(drukIn) && !isNaN(drukUit)) {
            await stelIn(bad_id, datum, 'filter_spoelen_druk',
                `Filterdruk verschil ${bad_naam} > ${d.actie_druk_verschil} bar — filter spoelen`,
                drukIn - drukUit > d.actie_druk_verschil);
        }
        // Flow
        const flowMin = bad_naam === 'Diep' ? d.actie_flow_diep : d.actie_flow_ondiep;
        if (!isNaN(flow)) {
            await stelIn(bad_id, datum, 'filter_spoelen_flow',
                `Flow ${bad_naam} onder ${flowMin} m³/h — filter spoelen`,
                flow < flowMin);
        }
    }

    if (bad_naam === 'Peuterbad') {
        // Filter druk absolute
        if (!isNaN(drukIn)) {
            await stelIn(bad_id, datum, 'filter_spoelen_druk',
                `Filterdruk Peuterbad > ${d.actie_druk_peuterbad} bar — filter spoelen`,
                drukIn > d.actie_druk_peuterbad);
        }
        // Flow
        if (!isNaN(flow)) {
            await stelIn(bad_id, datum, 'filter_spoelen_flow',
                `Flow Peuterbad onder ${d.actie_flow_peuterbad} m³/h — filter spoelen`,
                flow < d.actie_flow_peuterbad);
        }
    }
}

/**
 * Generate or remove acties based on verbruik/chemicaliën stock levels.
 */
async function genereerVerbruik(datum, body) {
    const d = await laadDrempelwaarden();

    const [bads] = await pool.execute('SELECT id FROM baden WHERE naam = ?', ['Diep']);
    if (!bads.length) return;
    const bad_id = bads[0].id;

    const chloor = parseFloat(body.chemicalien_chloor);
    if (!isNaN(chloor)) {
        await stelIn(bad_id, datum, 'chloor_bestellen',
            `Chloorvoorraad onder ${d.actie_chloor_min} liter — chloor bestellen`,
            chloor < d.actie_chloor_min);
    }

    const zwavelzuur = parseFloat(body.chemicalien_zwavelzuur);
    if (!isNaN(zwavelzuur)) {
        await stelIn(bad_id, datum, 'zwavelzuur_bestellen',
            `Zwavelzuurvoorraad onder ${d.actie_zwavelzuur_min} liter — zwavelzuur bestellen`,
            zwavelzuur < d.actie_zwavelzuur_min);
    }
}

/**
 * Generate or remove filter-spoelen acties for Diep and Ondiep based on visitor count.
 */
async function genereerBezoekers(datum, bezoekers_vandaag) {
    const d = await laadDrempelwaarden();
    const aantal = parseFloat(bezoekers_vandaag);
    if (isNaN(aantal)) return;

    const [bads] = await pool.execute("SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')");
    for (const bad of bads) {
        await stelIn(bad.id, datum, 'filter_spoelen_bezoekers',
            `Aantal bezoekers > ${d.actie_bezoekers_max} — filter spoelen`,
            aantal > d.actie_bezoekers_max);
    }
}

/**
 * Sum bezoekers_vandaag from coordinatoren_daggegevens since the last resolved
 * filter_spoelen_spoelbeurt action for this pool (or from the beginning if never cleaned).
 *
 * Uses the action's datum (not opgelost_op) as the cutoff, and only considers
 * actions with datum strictly before the viewed date. This ensures that resolving
 * an action on the same day does not alter today's accumulated count — the total
 * only resets starting the next day.
 */
async function berekenSpoelbeurtTotaal(bad_id, datum) {
    const [lastClean] = await pool.execute(
        `SELECT datum AS datum_schoon
         FROM acties
         WHERE bad_id = ? AND actie_type = 'filter_spoelen_spoelbeurt' AND opgelost = TRUE
           AND datum < ?
         ORDER BY datum DESC LIMIT 1`,
        [bad_id, datum]
    );

    const [totaalRows] = await pool.execute(
        lastClean.length > 0
            ? `SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
               FROM coordinatoren_daggegevens WHERE datum > ? AND datum <= ?`
            : `SELECT COALESCE(SUM(bezoekers_vandaag), 0) AS totaal
               FROM coordinatoren_daggegevens WHERE datum <= ?`,
        lastClean.length > 0 ? [lastClean[0].datum_schoon, datum] : [datum]
    );

    return parseFloat(totaalRows[0].totaal) || 0;
}

/**
 * Generate or remove filter-spoelen acties for Diep and Ondiep based on the
 * automatically calculated cumulative visitor count since the last cleaning.
 * Returns { diep, ondiep } totals so callers can display them.
 */
async function genereerSpoelbeurt(datum) {
    const d = await laadDrempelwaarden();
    const [bads] = await pool.execute("SELECT id, naam FROM baden WHERE naam IN ('Diep', 'Ondiep')");
    const totalen = {};
    for (const bad of bads) {
        const totaal = await berekenSpoelbeurtTotaal(bad.id, datum);
        totalen[bad.naam.toLowerCase()] = totaal;
        await stelIn(bad.id, datum, 'filter_spoelen_spoelbeurt',
            `Aantal bezoekers sinds spoelbeurt ${bad.naam} > ${d.actie_spoelbeurt_max} — filter spoelen`,
            totaal > d.actie_spoelbeurt_max);
    }
    return totalen;
}

module.exports = { getActies, resolve, unresolve, genereer, genereerVerbruik, genereerBezoekers, genereerSpoelbeurt };
