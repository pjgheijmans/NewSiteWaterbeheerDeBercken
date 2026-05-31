import express, { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, isAdminOrWaterbeheerder } from '../middleware/auth';
import { IDatabaseRepository } from '../repositories/IDatabaseRepository';

const TRUNC_TABLES  = ['logboek','coordinatoren_logboek','metingen_diep_ondiep','metingen_coordinatoren','coordinatoren_checklist','coordinatoren_daggegevens','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','acties','limieten','gebruikers'];
const EXPORT_TABLES = ['logboek','coordinatoren_logboek','metingen_diep_ondiep','metingen_peuterbad','metingen_coordinatoren','coordinatoren_checklist','coordinatoren_daggegevens','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','acties','limieten','gebruikers'];
const IMPORT_TABLES = ['logboek','metingen_diep_ondiep','metingen_coordinatoren','coordinatoren_checklist','coordinatoren_daggegevens','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','limieten','gebruikers'];
const NEED_BAD_ID   = ['metingen_diep_ondiep','metingen_coordinatoren','metingen_peuterbad'];

export class DatabaseController {
    readonly router: Router;

    constructor(private readonly repo: IDatabaseRepository) {
        this.router = Router();
        this.router.post('/truncate/:tabelnaam', checkAuth, this.truncate.bind(this));
        this.router.get('/export/:tabelnaam',    checkAuth, this.exportCsv.bind(this));
        this.router.post('/import/:tabelnaam',   checkAuth, express.text({ type: 'text/csv', limit: '10mb' }), this.importCsv.bind(this));
        this.router.post('/verwijder-alles',     checkAuth, this.verwijderAlles.bind(this));
        this.router.post('/initialiseer',        checkAuth, this.initialiseer.bind(this));
    }

    private vereistToegang(req: Request, res: Response): boolean {
        if (!isAdminOrWaterbeheerder(req.session.gebruiker!.taak)) {
            res.status(403).json({ error: 'Geen toegang' });
            return false;
        }
        return true;
    }

    private async truncate(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        const tabel = String(req.params['tabelnaam']);
        if (!TRUNC_TABLES.includes(tabel)) { res.status(400).json({ error: 'Ongeldige tabelnaam' }); return; }
        try {
            await this.repo.truncate(tabel);
            res.json({ status: 'success', message: `Tabel ${tabel} succesvol geleegd.` });
        } catch (err) { next(err); }
    }

    private async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        const tabel = String(req.params['tabelnaam']);
        if (!EXPORT_TABLES.includes(tabel)) { res.status(400).json({ error: 'Ongeldige tabelnaam' }); return; }
        try {
            const rows = await this.repo.exportRows(tabel);
            if (rows.length === 0) { res.status(404).json({ error: 'Tabel is leeg, niets te exporteren' }); return; }

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
        } catch (err) { next(err); }
    }

    private async importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        const tabel = String(req.params['tabelnaam']);
        if (!IMPORT_TABLES.includes(tabel)) { res.status(400).json({ error: 'Ongeldige tabelnaam' }); return; }

        const ruweTekst = req.body as string;
        if (!ruweTekst) { res.status(400).json({ error: 'Geen CSV data ontvangen' }); return; }

        const regels = ruweTekst.split(/\r?\n/).filter(l => l.trim() !== '');
        if (regels.length < 2) { res.status(400).json({ error: 'CSV-bestand bevat geen data' }); return; }

        const kolommen = regels[0].split(';');
        try {
            await this.repo.setForeignKeyChecks(false);
            for (const regel of regels.slice(1)) {
                const waarden = regel.split(';');
                if (waarden.length !== kolommen.length) continue;

                const rij: Record<string, string | null> = {};
                kolommen.forEach((k, i) => { rij[k] = waarden[i].trim() || null; });

                if (NEED_BAD_ID.includes(tabel)) {
                    const bad_id = await this.repo.getBadId(rij['bad_naam'] ?? '');
                    if (bad_id) rij['bad_id'] = String(bad_id);
                    delete rij['bad_naam'];
                }

                const cols = Object.keys(rij).filter(k => k !== 'id');
                await this.repo.importRow(tabel, cols, cols.map(k => rij[k]));
            }
            await this.repo.setForeignKeyChecks(true);
            res.json({ status: 'success', message: 'CSV succesvol geimporteerd' });
        } catch (err) {
            // FK checks opnieuw inschakelen vóór next(err) zodat de DB-state consistent blijft
            await this.repo.setForeignKeyChecks(true);
            next(err);
        }
    }

    private async verwijderAlles(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            await this.repo.truncateAll();
            req.session.destroy(() => {});
            res.json({ status: 'success', message: 'Alle data gewist.' });
        } catch (err) { next(err); }
    }

    private async initialiseer(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.vereistToegang(req, res)) return;
        try {
            await this.repo.runInitSql();
            await this.repo.truncateAll();
            await this.repo.seedAllDefaults();
            req.session.destroy(() => {});
            res.json({ status: 'success', message: 'Database geïnitialiseerd met standaardwaarden.' });
        } catch (err) { next(err); }
    }
}
