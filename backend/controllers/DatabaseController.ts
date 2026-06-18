import express, { Router, Request, Response, NextFunction } from 'express';
import { checkAuth, vereist } from '../middleware/auth';
import { IDatabaseService } from '../services/IDatabaseService';

const TRUNC_TABLES  = ['logboek','coordinatoren_logboek','metingen_diep_ondiep','metingen_coordinatoren','coordinatoren_checklist','coordinatoren_daggegevens','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','waterbeheer_dienst','acties','limieten','actie_teksten','gebruikers'];
const EXPORT_TABLES = ['logboek','coordinatoren_logboek','metingen_diep_ondiep','metingen_peuterbad','metingen_coordinatoren','coordinatoren_checklist','coordinatoren_daggegevens','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','waterbeheer_dienst','acties','limieten','actie_teksten','gebruikers'];
const IMPORT_TABLES = ['logboek','metingen_diep_ondiep','metingen_coordinatoren','coordinatoren_checklist','coordinatoren_daggegevens','metingen_peuterbad','verbruik_diep_ondiep','verwarmings_systeem_diep_ondiep','waterbeheer_dienst','limieten','actie_teksten','gebruikers'];

export class DatabaseController {
    readonly router: Router;

    constructor(private readonly service: IDatabaseService) {
        this.router = Router();
        this.router.post('/truncate/:tabelnaam', checkAuth, vereist('beheer', 'schrijven'), this.truncate.bind(this));
        this.router.get('/export/:tabelnaam',    checkAuth, vereist('beheer', 'lezen'),     this.exportCsv.bind(this));
        this.router.post('/import/:tabelnaam',   checkAuth, vereist('beheer', 'schrijven'), express.text({ type: 'text/csv', limit: '10mb' }), this.importCsv.bind(this));
        this.router.post('/verwijder-alles',     checkAuth, vereist('beheer', 'schrijven'), this.verwijderAlles.bind(this));
        this.router.post('/initialiseer',        checkAuth, vereist('beheer', 'schrijven'), this.initialiseer.bind(this));
    }

    private async truncate(req: Request, res: Response, next: NextFunction): Promise<void> {
        const tabel = String(req.params['tabelnaam']);
        if (!TRUNC_TABLES.includes(tabel)) { res.status(400).json({ error: 'Ongeldige tabelnaam' }); return; }
        try {
            await this.service.truncate(tabel);
            res.json({ status: 'success', message: `Tabel ${tabel} succesvol geleegd.` });
        } catch (err) { next(err); }
    }

    private async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        const tabel = String(req.params['tabelnaam']);
        if (!EXPORT_TABLES.includes(tabel)) { res.status(400).json({ error: 'Ongeldige tabelnaam' }); return; }
        try {
            const csv = await this.service.exporteerCsv(tabel);
            if (csv === null) { res.status(404).json({ error: 'Tabel is leeg, niets te exporteren' }); return; }
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=export_${tabel}_${new Date().toISOString().split('T')[0]}.csv`);
            res.status(200).send(csv);
        } catch (err) { next(err); }
    }

    private async importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        const tabel = String(req.params['tabelnaam']);
        if (!IMPORT_TABLES.includes(tabel)) { res.status(400).json({ error: 'Ongeldige tabelnaam' }); return; }
        try {
            await this.service.importeerCsv(tabel, req.body as string);
            res.json({ status: 'success', message: 'CSV succesvol geimporteerd' });
        } catch (err) { next(err); }
    }

    private async verwijderAlles(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.wisAlles();
            req.session.destroy(() => {});
            res.json({ status: 'success', message: 'Alle data gewist.' });
        } catch (err) { next(err); }
    }

    private async initialiseer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.service.initialiseer();
            req.session.destroy(() => {});
            res.json({ status: 'success', message: 'Database geïnitialiseerd met standaardwaarden.' });
        } catch (err) { next(err); }
    }
}
