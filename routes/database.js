const express = require('express');
const router = express.Router();
const repo = require('../repositories/database');
const { checkAuth, isAdminOrWaterbeheerder } = require('../middleware/auth');

const TRUNC_TABLES  = ['metingen','metingen_coordinatoren','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','acties','limieten','gebruikers'];
const EXPORT_TABLES = ['metingen','metingen_diep_ondiep','metingen_peuterbad','metingen_coordinatoren','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','acties','limieten','gebruikers'];
const IMPORT_TABLES = ['metingen','metingen_coordinatoren','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','limieten','gebruikers'];
const NEED_BAD_ID   = ['metingen','metingen_coordinatoren','metingen_peuterbad'];

router.post('/truncate/:tabelnaam', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    const tabel = req.params.tabelnaam;
    if (!TRUNC_TABLES.includes(tabel))
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    try {
        await repo.truncate(tabel);
        res.json({ status: 'success', message: `Tabel ${tabel} succesvol geleegd.` });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.get('/export/:tabelnaam', checkAuth, async (req, res) => {
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    const tabel = req.params.tabelnaam;
    if (!EXPORT_TABLES.includes(tabel))
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });
    try {
        const rows = await repo.exportRows(tabel);
        if (rows.length === 0)
            return res.status(404).json({ error: 'Tabel is leeg, niets te exporteren' });

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
    if (!isAdminOrWaterbeheerder(req.session.gebruiker.taak))
        return res.status(403).json({ error: 'Geen toegang' });
    const tabel = req.params.tabelnaam;
    if (!IMPORT_TABLES.includes(tabel))
        return res.status(400).json({ error: 'Ongeldige tabelnaam' });

    const ruweTekst = req.body;
    if (!ruweTekst) return res.status(400).json({ error: 'Geen CSV data ontvangen' });

    const regels = ruweTekst.split(/\r?\n/).filter(l => l.trim() !== '');
    if (regels.length < 2) return res.status(400).json({ error: 'CSV-bestand bevat geen data' });

    const kolommen = regels[0].split(';');

    try {
        await repo.setForeignKeyChecks(false);

        for (const regel of regels.slice(1)) {
            const waarden = regel.split(';');
            if (waarden.length !== kolommen.length) continue;

            const rij = {};
            kolommen.forEach((k, i) => { rij[k] = waarden[i].trim() || null; });

            if (NEED_BAD_ID.includes(tabel)) {
                const bad_id = await repo.getBadId(rij['bad_naam']);
                if (bad_id) rij['bad_id'] = bad_id;
                delete rij['bad_naam'];
            }

            const cols = Object.keys(rij).filter(k => k !== 'id');
            const actualTabel = tabel === 'metingen' ? 'metingen_diep_ondiep' : tabel;
            await repo.importRow(actualTabel, cols, cols.map(k => rij[k]));
        }

        await repo.setForeignKeyChecks(true);
        res.json({ status: 'success', message: 'CSV succesvol geimporteerd' });
    } catch (err) {
        await repo.setForeignKeyChecks(true);
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
