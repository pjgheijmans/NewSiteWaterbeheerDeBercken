const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

const TRUNC_TABLES = ['metingen','metingen_coordinatoren','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem','acties','limieten','gebruikers'];
const EXPORT_TABLES = ['metingen','metingen_grote_baden','metingen_peuterbad','metingen_coordinatoren','verbruik_diep_ondiep','verwarmings_systeem','acties','limieten','gebruikers'];
const IMPORT_TABLES = ['metingen','metingen_coordinatoren','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem','limieten','gebruikers'];

router.post('/truncate/:tabelnaam', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    const tabel = req.params.tabelnaam;
    if (!TRUNC_TABLES.includes(tabel)) return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    try {
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
        await pool.execute(`TRUNCATE TABLE ${tabel}`);
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
        res.json({ status: 'success', message: `Tabel ${tabel} succesvol geleegd.` });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.get('/export/:tabelnaam', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    const tabel = req.params.tabelnaam;
    if (!EXPORT_TABLES.includes(tabel)) return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    try {
        const queryMap = {
            metingen: `SELECT b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit FROM metingen_grote_baden m JOIN baden b ON m.bad_id = b.id ORDER BY datum DESC`,
            metingen_grote_baden: `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.temperatuur, m.flow, m.filter_druk_in, m.filter_druk_uit FROM metingen_grote_baden m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
            metingen_peuterbad: `SELECT m.id, b.naam AS bad_naam, m.datum, m.ph_waarde, m.chloor_waarde, m.flow, m.filter_druk_in, m.water, m.chemicalien_chloor, m.chemicalien_zwavelzuur FROM metingen_peuterbad m JOIN baden b ON m.bad_id = b.id ORDER BY m.datum DESC`,
            metingen_coordinatoren: `SELECT mc.id, b.naam AS bad_naam, mc.datum, mc.ph_waarde, mc.chloor_waarde, mc.watertemperatuur, mc.helderheid FROM metingen_coordinatoren mc JOIN baden b ON mc.bad_id = b.id ORDER BY mc.datum DESC`,
            verbruik_diep_ondiep: `SELECT datum, floculant, water_diep, water_ondiep, water_totaal, elektriciteit_nacht, elektriciteit_dag, gas, chemicalien_chloor, chemicalien_zwavelzuur FROM verbruik_diep_ondiep ORDER BY datum DESC`,
            verwarmings_systeem: `SELECT datum, verwarming_status_1, verwarming_status_2, verwarming_status_3, verwarming_status_4, verwarming_druk_ok, verwarming_visuele_controle FROM verwarmings_systeem ORDER BY datum DESC`,
            acties: `SELECT a.id, b.naam AS bad_naam, a.datum, a.beschrijving, a.actie_type, a.opgelost, a.opgelost_op, a.created_at FROM acties a JOIN baden b ON a.bad_id = b.id ORDER BY a.datum DESC`,
        };
        const query = queryMap[tabel] || `SELECT * FROM ${tabel}`;
        const [rows] = await pool.execute(query);
        if (rows.length === 0) return res.status(404).json({ error: 'Tabel is leeg, niets te exporteren' });
        const kolommen = Object.keys(rows[0]);
        let csv = kolommen.join(';') + '\r\n';
        rows.forEach(rij => {
            csv += kolommen.map(k => {
                const w = rij[k];
                if (w === null || w === undefined) return '';
                if (w instanceof Date) return w.toISOString().split('T')[0];
                return String(w).replace(/;/g, ',');
            }).join(';') + '\r\n';
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=export_${tabel}_${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csv);
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/import/:tabelnaam', checkAuth, express.text({ type: 'text/csv', limit: '10mb' }), async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak)) return res.status(403).json({ error: 'Geen toegang' });
    const tabel = req.params.tabelnaam;
    if (!IMPORT_TABLES.includes(tabel)) return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    const ruweTekst = req.body;
    if (!ruweTekst) return res.status(400).json({ error: 'Geen CSV data ontvangen' });
    const regels = ruweTekst.split(/\r?\n/).filter(l => l.trim() !== '');
    if (regels.length < 2) return res.status(400).json({ error: 'CSV-bestand bevat geen data' });
    const kolommen = regels[0].split(';');
    try {
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
        for (const regel of regels.slice(1)) {
            const waarden = regel.split(';');
            if (waarden.length !== kolommen.length) continue;
            const rij = {};
            kolommen.forEach((k, i) => { rij[k] = waarden[i].trim() || null; });
            if (['metingen','metingen_coordinatoren','metingen_peuterbad'].includes(tabel)) {
                const [br] = await pool.execute('SELECT id FROM baden WHERE naam = ?', [rij['bad_naam']]);
                if (br.length > 0) rij['bad_id'] = br[0].id;
                delete rij['bad_naam'];
            }
            const cols = Object.keys(rij).filter(k => k !== 'id');
            const actualTabel = tabel === 'metingen' ? 'metingen_grote_baden' : tabel;
            await pool.execute(
                `INSERT INTO ${actualTabel} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${cols.map(k => `${k} = VALUES(${k})`).join(', ')}`,
                cols.map(k => rij[k])
            );
        }
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
        res.json({ status: 'success', message: 'CSV succesvol geimporteerd' });
    } catch (err) {
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.error(err); res.status(500).json({ error: err.message });
    }
});

module.exports = router;
